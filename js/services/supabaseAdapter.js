'use strict';

/**
 * Live Supabase PostgreSQL + Realtime adapter.
 * Uses RLS read-only SELECTs for public residents and PIN-verified RPCs for Admin writes.
 */
(function initSupabaseAdapter(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const config = app.config;

  let client = null;
  let realtimeChannel = null;

  function getClient() {
    if (client) return client;
    if (!config.isSupabaseConfigured()) return null;
    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      return null;
    }
    client = global.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY);
    return client;
  }

  function mapResident(row) {
    return {
      id: row.id,
      name: row.name,
      isActive: Boolean(row.is_active),
      isLunas: Boolean(row.is_lunas),
      createdAt: row.created_at,
    };
  }

  function mapPayment(row) {
    return {
      id: row.id,
      paidDate: row.paid_date,
      residentId: row.resident_id,
      amount: Number(row.amount) || 0,
      paidAt: row.paid_at,
    };
  }

  async function fetchAll() {
    const sb = getClient();
    if (!sb) return { data: null, error: 'Klien Supabase belum terkonfigurasi.' };

    const [resResidents, resPayments] = await Promise.all([
      sb
        .from('residents')
        .select('id, name, is_active, is_lunas, created_at')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      sb
        .from('payments')
        .select('id, resident_id, paid_date, amount, paid_at')
        .order('paid_at', { ascending: false }),
    ]);

    if (resResidents.error) {
      return { data: null, error: `Gagal memuat warga: ${resResidents.error.message}` };
    }
    if (resPayments.error) {
      return { data: null, error: `Gagal memuat setoran: ${resPayments.error.message}` };
    }

    return {
      data: {
        residents: (resResidents.data || []).map(mapResident),
        payments: (resPayments.data || []).map(mapPayment),
      },
      error: null,
    };
  }

  async function verifyAdminPin(pin) {
    const sb = getClient();
    if (!sb) return { data: false, error: 'Klien Supabase belum terkonfigurasi.' };

    const { data, error } = await sb.rpc('verify_admin_pin', { p_pin: String(pin || '').trim() });
    if (error) return { data: false, error: error.message };
    return { data: Boolean(data), error: null };
  }

  async function insertResident(pin, name) {
    const sb = getClient();
    if (!sb) return { data: null, error: 'Klien Supabase belum terkonfigurasi.' };

    const { data, error } = await sb.rpc('admin_insert_resident', {
      p_pin: pin,
      p_name: name,
    });
    if (error) return { data: null, error: error.message };
    return { data: mapResident(data), error: null };
  }

  async function insertPayment(pin, payload) {
    const sb = getClient();
    if (!sb) return { data: null, error: 'Klien Supabase belum terkonfigurasi.' };

    const { data, error } = await sb.rpc('admin_insert_payment', {
      p_pin: pin,
      p_resident_id: payload.residentId,
      p_paid_date: payload.paidDate,
      p_amount: payload.amount,
      p_mark_lunas: Boolean(payload.markLunas),
    });
    if (error) return { data: null, error: error.message };
    return {
      data: { payment: mapPayment(data), residentLunas: Boolean(payload.markLunas) },
      error: null,
    };
  }

  async function updatePaymentAmount(pin, paymentId, newAmount) {
    const sb = getClient();
    if (!sb) return { data: null, error: 'Klien Supabase belum terkonfigurasi.' };

    const { data, error } = await sb.rpc('admin_update_payment', {
      p_pin: pin,
      p_payment_id: paymentId,
      p_amount: newAmount,
    });
    if (error) return { data: null, error: error.message };
    return { data: mapPayment(data), error: null };
  }

  async function deletePayment(pin, paymentId) {
    const sb = getClient();
    if (!sb) return { data: null, error: 'Klien Supabase belum terkonfigurasi.' };

    const { data, error } = await sb.rpc('admin_delete_payment', {
      p_pin: pin,
      p_payment_id: paymentId,
    });
    if (error) return { data: null, error: error.message };
    return { data: { id: data }, error: null };
  }

  async function setResidentLunas(pin, residentId, isLunas) {
    const sb = getClient();
    if (!sb) return { data: null, error: 'Klien Supabase belum terkonfigurasi.' };

    const { data, error } = await sb.rpc('admin_set_resident_lunas', {
      p_pin: pin,
      p_resident_id: residentId,
      p_is_lunas: Boolean(isLunas),
    });
    if (error) return { data: null, error: error.message };
    return { data: mapResident(data), error: null };
  }

  /**
   * Subscribe to live PostgreSQL changes on residents & payments tables.
   * @param {() => void} onRemoteChange
   */
  function subscribeRealtime(onRemoteChange) {
    const sb = getClient();
    if (!sb || realtimeChannel) return;

    realtimeChannel = sb
      .channel('zerofive-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onRemoteChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'residents' }, onRemoteChange)
      .subscribe();
  }

  app.supabaseAdapter = {
    isAvailable: () => Boolean(getClient()),
    fetchAll,
    verifyAdminPin,
    insertResident,
    insertPayment,
    updatePaymentAmount,
    deletePayment,
    setResidentLunas,
    subscribeRealtime,
  };
})(window);
