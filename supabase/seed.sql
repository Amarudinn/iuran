-- ============================================================================
-- ZERO FIVE — Optional Seed Data untuk Pengujian Awal di Supabase
-- Jalankan SETELAH supabase/schema.sql (lewati jika ingin mulai dari data kosong)
-- ============================================================================

insert into public.residents (name, is_lunas) values
  ('Adi Nugroho', true),
  ('Agus Setiawan', false),
  ('Ahmad Fauzi', false),
  ('Bambang Wijaya', false),
  ('Budi Santoso', true),
  ('Cahyo Utomo', false),
  ('Dedi Kurniawan', false),
  ('Dewi Lestari', true),
  ('Eko Prasetyo', false),
  ('Fajar Hidayat', false),
  ('Gunawan Wibowo', false),
  ('Hendra Saputra', true),
  ('Indra Permana', false),
  ('Joko Susilo', false),
  ('Kartika Sari', false),
  ('Lukman Hakim', false),
  ('Mulyadi Rahman', false),
  ('Nadia Putri', false),
  ('Prabowo Kusuma', false),
  ('Rahmat Hidayat', false),
  ('Rina Marlina', true),
  ('Slamet Riyadi', false),
  ('Surya Pratama', false),
  ('Wahyu Ramadhan', false),
  ('Yusuf Maulana', false)
on conflict do nothing;

-- Contoh setoran awal pada beberapa tanggal
insert into public.payments (resident_id, paid_date, amount)
select id, '2026-11-11'::date, 25000
from public.residents
where name in ('Adi Nugroho', 'Budi Santoso', 'Dewi Lestari', 'Hendra Saputra', 'Rina Marlina', 'Agus Setiawan', 'Eko Prasetyo');

insert into public.payments (resident_id, paid_date, amount)
select id, '2026-11-21'::date, 20000
from public.residents
where name in ('Adi Nugroho', 'Budi Santoso', 'Cahyo Utomo', 'Dewi Lestari', 'Fajar Hidayat', 'Rahmat Hidayat');
