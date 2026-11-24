'use strict';

/**
 * Unified async repository layer.
 * Uses live Supabase PostgreSQL when configured in js/config/supabaseConfig.js,
 * and falls back safely to local in-memory demo data only while credentials are empty.
 */
(function initRepository(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { DEMO_ADMIN_PIN, createInitialDataset } = app.mockData;
  const { generateId } = app.formatters;
  const sb = app.supabaseAdapter;

  const MAX_PAYMENT_AMOUNT = 100000000;
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  let demoDb = null;

  function getDemoDb() {
    if (!demoDb) demoDb = createInitialDataset();
    return demoDb;
  }

  function isLiveSupabase() {
    return Boolean(sb && sb.isAvailable());
  }

  function getMode() {
    return isLiveSupabase() ? 'supabase' : 'demo';
  }

  async function fetchInitialData() {
    if (isLiveSupabase()) {
      try {
        return await sb.fetchAll();
      } catch (err) {
        return { data: null, error: `Koneksi Supabase gagal: ${err.message || 'Periksa jaringan.'}` };
      }
    }
    const db = getDemoDb();
    return {
      data: {
        residents: db.residents.map((r) => ({ ...r })),
        payments: db.payments.map((p) => ({ ...p })),
      },
      error: null,
    };
  }

  async function verifyAdminPin(pin) {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) return { data: false, error: 'Masukkan PIN pengurus.' };

    if (isLiveSupabase()) {
      try {
        return await sb.verifyAdminPin(cleanPin);
      } catch (err) {
        return { data: false, error: `Gagal verifikasi PIN: ${err.message || 'Coba lagi.'}` };
      }
    }
    return { data: cleanPin === DEMO_ADMIN_PIN, error: null };
  }

  async function insertPayment(pin, payload) {
    const { paidDate, residentId, amount, markLunas } = payload;

    if (!ISO_DATE_RE.test(String(paidDate || ''))) {
      return { data: null, error: 'Tanggal penarikan tidak valid.' };
    }
    if (!residentId) {
      return { data: null, error: 'Silakan pilih nama warga terlebih dahulu.' };
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return { data: null, error: 'Nominal setoran harus lebih besar dari Rp 0.' };
    }
    if (amount > MAX_PAYMENT_AMOUNT) {
      return { data: null, error: 'Nominal terlalu besar. Periksa kembali angka yang dimasukkan.' };
    }

    if (isLiveSupabase()) {
      try {
        return await sb.insertPayment(pin, payload);
      } catch (err) {
        return { data: null, error: `Gagal menyimpan setoran: ${err.message || 'Periksa koneksi.'}` };
      }
    }

    const db = getDemoDb();
    const resident = db.residents.find((r) => r.id === residentId);
    if (!resident) return { data: null, error: 'Data warga tidak ditemukan.' };

    const newRecord = {
      id: generateId('pay'),
      paidDate,
      residentId,
      amount,
      paidAt: new Date().toISOString(),
    };
    db.payments.push(newRecord);
    if (markLunas) resident.isLunas = true;
    return { data: { payment: { ...newRecord }, residentLunas: resident.isLunas }, error: null };
  }

  async function updatePaymentAmount(pin, paymentId, newAmount) {
    if (!Number.isSafeInteger(newAmount) || newAmount <= 0) {
      return { data: null, error: 'Nominal koreksi harus lebih besar dari Rp 0.' };
    }
    if (newAmount > MAX_PAYMENT_AMOUNT) {
      return { data: null, error: 'Nominal terlalu besar. Periksa kembali angka yang dimasukkan.' };
    }

    if (isLiveSupabase()) {
      try {
        return await sb.updatePaymentAmount(pin, paymentId, newAmount);
      } catch (err) {
        return { data: null, error: `Gagal mengoreksi setoran: ${err.message || 'Periksa koneksi.'}` };
      }
    }

    const db = getDemoDb();
    const record = db.payments.find((p) => p.id === paymentId);
    if (!record) return { data: null, error: 'Data setoran tidak ditemukan.' };
    record.amount = newAmount;
    return { data: { ...record }, error: null };
  }

  async function deletePayment(pin, paymentId) {
    if (isLiveSupabase()) {
      try {
        return await sb.deletePayment(pin, paymentId);
      } catch (err) {
        return { data: null, error: `Gagal menghapus setoran: ${err.message || 'Periksa koneksi.'}` };
      }
    }

    const db = getDemoDb();
    const idx = db.payments.findIndex((p) => p.id === paymentId);
    if (idx === -1) return { data: null, error: 'Data setoran tidak ditemukan.' };
    db.payments.splice(idx, 1);
    return { data: { id: paymentId }, error: null };
  }

  async function setResidentLunas(pin, residentId, isLunas) {
    if (isLiveSupabase()) {
      try {
        return await sb.setResidentLunas(pin, residentId, isLunas);
      } catch (err) {
        return { data: null, error: `Gagal mengubah status Lunas: ${err.message || 'Periksa koneksi.'}` };
      }
    }

    const db = getDemoDb();
    const resident = db.residents.find((r) => r.id === residentId);
    if (!resident) return { data: null, error: 'Data warga tidak ditemukan.' };
    resident.isLunas = Boolean(isLunas);
    return { data: { ...resident }, error: null };
  }

  async function insertResident(pin, rawName) {
    const cleanName = String(rawName || '').trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2) return { data: null, error: 'Nama warga minimal 2 karakter.' };
    if (cleanName.length > 60) return { data: null, error: 'Nama warga maksimal 60 karakter.' };

    if (isLiveSupabase()) {
      try {
        return await sb.insertResident(pin, cleanName);
      } catch (err) {
        return { data: null, error: `Gagal menambah warga: ${err.message || 'Periksa koneksi.'}` };
      }
    }

    const db = getDemoDb();
    const duplicate = db.residents.some((r) => r.name.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) return { data: null, error: 'Nama warga tersebut sudah terdaftar.' };

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

  function subscribeRealtime(onRemoteChange) {
    if (isLiveSupabase()) {
      sb.subscribeRealtime(onRemoteChange);
    }
  }

  app.repository = {
    getMode,
    fetchInitialData,
    verifyAdminPin,
    insertPayment,
    updatePaymentAmount,
    deletePayment,
    setResidentLunas,
    insertResident,
    subscribeRealtime,
  };
})(window);
