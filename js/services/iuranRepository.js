'use strict';

/**
 * Data repository abstraction layer using Supabase-compatible { data, error } responses.
 */
(function initRepository(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { DEMO_ADMIN_PIN, createInitialDataset } = app.mockData;
  const { generateId } = app.formatters;

  const MAX_PAYMENT_AMOUNT = 100000000;
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  const db = createInitialDataset();

  function fetchInitialData() {
    // TODO: ganti dengan query Supabase:
    // const [residentsRes, paymentsRes] = await Promise.all([
    //   supabase.from('residents').select('id, name, is_active, is_lunas, created_at').eq('is_active', true).order('name'),
    //   supabase.from('payments').select('*').order('paid_at', { ascending: false })
    // ]);
    return {
      data: {
        residents: db.residents.map((r) => ({ ...r })),
        payments: db.payments.map((p) => ({ ...p })),
      },
      error: null,
    };
  }

  /**
   * Record a new payment on any collection date chosen by the collector.
   * @param {{ paidDate: string, residentId: string, amount: number, markLunas?: boolean }} payload
   */
  function insertPayment(payload) {
    const { paidDate, residentId, amount, markLunas } = payload;

    if (!ISO_DATE_RE.test(String(paidDate || ''))) {
      return { data: null, error: 'Tanggal penarikan tidak valid.' };
    }
    const resident = db.residents.find((r) => r.id === residentId);
    if (!resident) {
      return { data: null, error: 'Silakan pilih nama warga terlebih dahulu.' };
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return { data: null, error: 'Nominal setoran harus lebih besar dari Rp 0.' };
    }
    if (amount > MAX_PAYMENT_AMOUNT) {
      return { data: null, error: 'Nominal terlalu besar. Periksa kembali angka yang dimasukkan.' };
    }

    // TODO: ganti dengan query Supabase:
    // const { data, error } = await supabase.from('payments').insert({ paid_date: paidDate, resident_id: residentId, amount }).select().single();
    const newRecord = {
      id: generateId('pay'),
      paidDate,
      residentId,
      amount,
      paidAt: new Date().toISOString(),
    };
    db.payments.push(newRecord);

    if (markLunas) {
      resident.isLunas = true;
    }
    return { data: { payment: { ...newRecord }, residentLunas: resident.isLunas }, error: null };
  }

  function updatePaymentAmount(paymentId, newAmount) {
    if (!Number.isSafeInteger(newAmount) || newAmount <= 0) {
      return { data: null, error: 'Nominal koreksi harus lebih besar dari Rp 0.' };
    }
    if (newAmount > MAX_PAYMENT_AMOUNT) {
      return { data: null, error: 'Nominal terlalu besar. Periksa kembali angka yang dimasukkan.' };
    }
    const record = db.payments.find((p) => p.id === paymentId);
    if (!record) return { data: null, error: 'Data setoran tidak ditemukan.' };

    // TODO: ganti dengan query Supabase:
    // await supabase.from('payments').update({ amount: newAmount }).eq('id', paymentId);
    record.amount = newAmount;
    return { data: { ...record }, error: null };
  }

  function deletePayment(paymentId) {
    const idx = db.payments.findIndex((p) => p.id === paymentId);
    if (idx === -1) return { data: null, error: 'Data setoran tidak ditemukan.' };

    // TODO: ganti dengan query Supabase:
    // await supabase.from('payments').delete().eq('id', paymentId);
    db.payments.splice(idx, 1);
    return { data: { id: paymentId }, error: null };
  }

  /**
   * Admin-only action: set or revoke "Lunas" label for a resident.
   * @param {string} residentId
   * @param {boolean} isLunas
   */
  function setResidentLunas(residentId, isLunas) {
    const resident = db.residents.find((r) => r.id === residentId);
    if (!resident) return { data: null, error: 'Data warga tidak ditemukan.' };

    // TODO: ganti dengan query Supabase:
    // await supabase.from('residents').update({ is_lunas: Boolean(isLunas) }).eq('id', residentId);
    resident.isLunas = Boolean(isLunas);
    return { data: { ...resident }, error: null };
  }

  function insertResident(rawName) {
    const cleanName = String(rawName || '').trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2) return { data: null, error: 'Nama warga minimal 2 karakter.' };
    if (cleanName.length > 60) return { data: null, error: 'Nama warga maksimal 60 karakter.' };

    const duplicate = db.residents.some((r) => r.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) return { data: null, error: 'Nama warga tersebut sudah terdaftar.' };

    // TODO: ganti dengan query Supabase:
    // await supabase.from('residents').insert({ name: cleanName, is_active: true, is_lunas: false }).select().single();
    const newResident = {
      id: generateId('res'),
      name: cleanName,
      isActive: true,
      isLunas: false,
      createdAt: new Date().toISOString(),
    };
    db.residents.push(newResident);
    return { data: { ...newResident }, error: null };
  }

  function verifyAdminPin(pin) {
    // TODO: ganti dengan autentikasi Supabase Auth
    return String(pin || '').trim() === DEMO_ADMIN_PIN;
  }

  app.repository = {
    fetchInitialData,
    insertPayment,
    updatePaymentAmount,
    deletePayment,
    setResidentLunas,
    insertResident,
    verifyAdminPin,
  };
})(window);
