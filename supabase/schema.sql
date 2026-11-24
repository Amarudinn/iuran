-- ============================================================================
-- ZERO FIVE — Production Supabase PostgreSQL Schema & Security (RLS + RPC)
-- Jalankan seluruh script ini di Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Tabel Warga (Privasi terjaga: hanya nama & status lunas)
create table if not exists public.residents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  is_active boolean not null default true,
  is_lunas boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists residents_name_lower_unique
  on public.residents (lower(name))
  where is_active = true;

-- 2. Tabel Setoran Pemasukan (Bebas nominal & bebas tanggal penarikan)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  paid_date date not null default current_date,
  amount bigint not null check (amount > 0 and amount <= 100000000),
  paid_at timestamptz not null default now()
);

create index if not exists payments_paid_date_idx on public.payments (paid_date desc);
create index if not exists payments_resident_id_idx on public.payments (resident_id);

-- 3. Tabel Pengaturan PIN Pengurus (Terenkripsi bcrypt, tidak dapat dibaca publik)
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Default PIN pengurus: 1234 (Ganti angka '1234' di bawah sebelum produksi!)
insert into public.app_settings (key, value)
values ('admin_pin_hash', crypt('1234', gen_salt('bf')))
on conflict (key) do nothing;

-- 4. Aktifkan Row Level Security (RLS)
alter table public.residents enable row level security;
alter table public.payments enable row level security;
alter table public.app_settings enable row level security;

-- Publik hanya boleh MEMBACA data warga aktif & pemasukan (zero write langsung)
drop policy if exists "Public can read active residents" on public.residents;
create policy "Public can read active residents"
  on public.residents for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Public can read payments" on public.payments;
create policy "Public can read payments"
  on public.payments for select
  to anon, authenticated
  using (true);

-- app_settings tidak memiliki policy SELECT/INSERT/UPDATE untuk anon (tertutup penuh)

-- 5. Helper Internal Verifikasi PIN Pengurus
create or replace function public._check_admin_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  select value into v_hash
  from public.app_settings
  where key = 'admin_pin_hash';

  if v_hash is null or p_pin is null then
    return false;
  end if;

  return crypt(trim(p_pin), v_hash) = v_hash;
end;
$$;

-- 6. RPC Publik: Verifikasi PIN saat masuk Mode Pengurus
create or replace function public.verify_admin_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select public._check_admin_pin(p_pin);
$$;

-- 7. RPC Pengurus: Tambah Warga Baru
create or replace function public.admin_insert_resident(p_pin text, p_name text)
returns public.residents
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean text;
  v_row public.residents;
begin
  if not public._check_admin_pin(p_pin) then
    raise exception 'Akses ditolak: PIN pengurus tidak valid.';
  end if;

  v_clean := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  if char_length(v_clean) < 2 or char_length(v_clean) > 60 then
    raise exception 'Nama warga harus 2 sampai 60 karakter.';
  end if;

  if exists (select 1 from public.residents where is_active = true and lower(name) = lower(v_clean)) then
    raise exception 'Nama warga tersebut sudah terdaftar.';
  end if;

  insert into public.residents (name, is_active, is_lunas)
  values (v_clean, true, false)
  returning * into v_row;

  return v_row;
end;
$$;

-- 8. RPC Pengurus: Catat Setoran Baru (+ opsional tandai Lunas)
create or replace function public.admin_insert_payment(
  p_pin text,
  p_resident_id uuid,
  p_paid_date date,
  p_amount bigint,
  p_mark_lunas boolean default false
)
returns public.payments
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.payments;
begin
  if not public._check_admin_pin(p_pin) then
    raise exception 'Akses ditolak: PIN pengurus tidak valid.';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    raise exception 'Nominal setoran harus lebih besar dari Rp 0.';
  end if;

  if not exists (select 1 from public.residents where id = p_resident_id and is_active = true) then
    raise exception 'Data warga tidak ditemukan.';
  end if;

  insert into public.payments (resident_id, paid_date, amount)
  values (p_resident_id, coalesce(p_paid_date, current_date), p_amount)
  returning * into v_row;

  if coalesce(p_mark_lunas, false) then
    update public.residents set is_lunas = true where id = p_resident_id;
  end if;

  return v_row;
end;
$$;

-- 9. RPC Pengurus: Koreksi Nominal Setoran
create or replace function public.admin_update_payment(
  p_pin text,
  p_payment_id uuid,
  p_amount bigint
)
returns public.payments
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.payments;
begin
  if not public._check_admin_pin(p_pin) then
    raise exception 'Akses ditolak: PIN pengurus tidak valid.';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    raise exception 'Nominal koreksi harus lebih besar dari Rp 0.';
  end if;

  update public.payments
  set amount = p_amount
  where id = p_payment_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Data setoran tidak ditemukan.';
  end if;

  return v_row;
end;
$$;

-- 10. RPC Pengurus: Hapus Setoran
create or replace function public.admin_delete_payment(
  p_pin text,
  p_payment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deleted uuid;
begin
  if not public._check_admin_pin(p_pin) then
    raise exception 'Akses ditolak: PIN pengurus tidak valid.';
  end if;

  delete from public.payments
  where id = p_payment_id
  returning id into v_deleted;

  if v_deleted is null then
    raise exception 'Data setoran tidak ditemukan.';
  end if;

  return v_deleted;
end;
$$;

-- 11. RPC Pengurus: Toggle Status Lunas Warga
create or replace function public.admin_set_resident_lunas(
  p_pin text,
  p_resident_id uuid,
  p_is_lunas boolean
)
returns public.residents
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.residents;
begin
  if not public._check_admin_pin(p_pin) then
    raise exception 'Akses ditolak: PIN pengurus tidak valid.';
  end if;

  update public.residents
  set is_lunas = coalesce(p_is_lunas, false)
  where id = p_resident_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Data warga tidak ditemukan.';
  end if;

  return v_row;
end;
$$;

-- 12. Hak Eksekusi RPC untuk klien publik (terproteksi verifikasi PIN di dalam fungsi)
grant execute on function public.verify_admin_pin(text) to anon, authenticated;
grant execute on function public.admin_insert_resident(text, text) to anon, authenticated;
grant execute on function public.admin_insert_payment(text, uuid, date, bigint, boolean) to anon, authenticated;
grant execute on function public.admin_update_payment(text, uuid, bigint) to anon, authenticated;
grant execute on function public.admin_delete_payment(text, uuid) to anon, authenticated;
grant execute on function public.admin_set_resident_lunas(text, uuid, boolean) to anon, authenticated;

-- 13. Aktifkan Supabase Realtime agar warga menerima update otomatis tanpa refresh
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'residents'
  ) then
    alter publication supabase_realtime add table public.residents;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;
