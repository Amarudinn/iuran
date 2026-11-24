'use strict';

/**
 * Centralized reactive application state with async Supabase sync, Realtime updates,
 * and persistent verified Admin PIN in localStorage.
 */
(function initStore(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const repo = app.repository;
  const sel = app.selectors;

  const PIN_STORAGE_KEY = 'zero_five_admin_pin';

  const state = {
    residents: [],
    payments: [],
    selectedDate: 'all', // 'all' (Semuanya - default) | 'YYYY-MM-DD'
    activeView: 'public', // 'public' | 'admin'
    isAdminAuthenticated: false,
    isLoading: true,
    loadError: null,
    dbMode: repo.getMode(), // 'supabase' | 'demo'
    searchQuery: '',
    statusFilter: 'all', // 'all' | 'paid' | 'lunas' | 'unpaid'
    adminTab: 'history', // 'history' | 'unpaid' | 'lunas'
  };

  let sessionPin = '';
  let realtimeTimer = null;

  /** @type {Set<() => void>} */
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn());
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getState() {
    return state;
  }

  function readSavedPin() {
    try {
      return String(global.localStorage.getItem(PIN_STORAGE_KEY) || '').trim();
    } catch (_err) {
      return '';
    }
  }

  function savePinToStorage(pin) {
    try {
      global.localStorage.setItem(PIN_STORAGE_KEY, pin);
    } catch (_err) {
      // Ignore storage write errors
    }
  }

  function clearSavedPin() {
    try {
      global.localStorage.removeItem(PIN_STORAGE_KEY);
    } catch (_err) {
      // Ignore storage delete errors
    }
  }

  async function restoreSavedAdminSession() {
    const savedPin = readSavedPin();
    if (!savedPin) return;

    const res = await repo.verifyAdminPin(savedPin);
    if (!res.error && res.data === true) {
      sessionPin = savedPin;
      state.isAdminAuthenticated = true;
      notify();
    } else if (!res.error && res.data === false) {
      // PIN was changed on server; remove stale cached PIN
      clearSavedPin();
    }
  }

  async function refreshFromRemote() {
    const res = await repo.fetchInitialData();
    if (res.error) {
      state.loadError = res.error;
      notify();
      return res;
    }
    state.residents = res.data.residents;
    state.payments = res.data.payments;
    state.loadError = null;
    notify();
    return res;
  }

  async function init() {
    state.dbMode = repo.getMode();
    state.isLoading = true;
    notify();

    const [res] = await Promise.all([refreshFromRemote(), restoreSavedAdminSession()]);
    state.isLoading = false;
    notify();

    repo.subscribeRealtime(() => {
      if (realtimeTimer) global.clearTimeout(realtimeTimer);
      realtimeTimer = global.setTimeout(() => {
        refreshFromRemote();
      }, 250);
    });

    return res;
  }

  function setSelectedDate(dateOrAll) {
    const next = dateOrAll || 'all';
    if (state.selectedDate === next) return;
    state.selectedDate = next;
    notify();
  }

  function setSearchQuery(query) {
    state.searchQuery = query;
    notify();
  }

  function setStatusFilter(filter) {
    if (!['all', 'paid', 'lunas', 'unpaid'].includes(filter)) return;
    state.statusFilter = filter;
    notify();
  }

  function setAdminTab(tab) {
    if (!['history', 'unpaid', 'lunas'].includes(tab)) return;
    state.adminTab = tab;
    notify();
  }

  async function authenticateAdmin(pin) {
    const cleanPin = String(pin || '').trim();
    const res = await repo.verifyAdminPin(cleanPin);
    if (res.error) return { ok: false, error: res.error };
    if (res.data) {
      sessionPin = cleanPin;
      savePinToStorage(cleanPin);
      state.isAdminAuthenticated = true;
      state.activeView = 'admin';
      notify();
      return { ok: true, error: null };
    }
    return { ok: false, error: 'PIN pengurus tidak sesuai.' };
  }

  function openView(view) {
    if (view === 'admin' && !state.isAdminAuthenticated) return false;
    state.activeView = view;
    notify();
    return true;
  }

  function lockAdminSession() {
    sessionPin = '';
    clearSavedPin();
    state.isAdminAuthenticated = false;
    state.activeView = 'public';
    notify();
  }

  async function recordPayment(payload) {
    if (!state.isAdminAuthenticated) {
      return { data: null, error: 'Sesi pengurus belum aktif.' };
    }
    const res = await repo.insertPayment(sessionPin, payload);
    if (res.data) {
      state.payments.push(res.data.payment);
      if (payload.markLunas) {
        const resident = state.residents.find((r) => r.id === payload.residentId);
        if (resident) resident.isLunas = true;
      }
      notify();
    }
    return res;
  }

  async function editPayment(paymentId, newAmount) {
    if (!state.isAdminAuthenticated) {
      return { data: null, error: 'Sesi pengurus belum aktif.' };
    }
    const res = await repo.updatePaymentAmount(sessionPin, paymentId, newAmount);
    if (res.data) {
      const target = state.payments.find((p) => p.id === paymentId);
      if (target) target.amount = res.data.amount;
      notify();
    }
    return res;
  }

  async function removePayment(paymentId) {
    if (!state.isAdminAuthenticated) {
      return { data: null, error: 'Sesi pengurus belum aktif.' };
    }
    const res = await repo.deletePayment(sessionPin, paymentId);
    if (res.data) {
      state.payments = state.payments.filter((p) => p.id !== paymentId);
      notify();
    }
    return res;
  }

  async function toggleResidentLunas(residentId) {
    if (!state.isAdminAuthenticated) {
      return { data: null, error: 'Hanya pengurus yang dapat mengubah status Lunas.' };
    }
    const target = state.residents.find((r) => r.id === residentId);
    if (!target) return { data: null, error: 'Data warga tidak ditemukan.' };

    const res = await repo.setResidentLunas(sessionPin, residentId, !target.isLunas);
    if (res.data) {
      target.isLunas = res.data.isLunas;
      notify();
    }
    return res;
  }

  async function addResident(name) {
    if (!state.isAdminAuthenticated) {
      return { data: null, error: 'Sesi pengurus belum aktif.' };
    }
    const res = await repo.insertResident(sessionPin, name);
    if (res.data) {
      state.residents.push(res.data);
      notify();
    }
    return res;
  }

  app.store = {
    subscribe,
    getState,
    init,
    refreshFromRemote,
    getCollectionDays: () => sel.getCollectionDays(state),
    getResidentSummaries: (dateOrAll = state.selectedDate) => sel.getResidentSummaries(state, dateOrAll),
    getStats: (dateOrAll = state.selectedDate) => sel.getStats(state, dateOrAll),
    getFilteredPublicRows: () => sel.getFilteredPublicRows(state),
    getPaymentHistory: (dateOrAll = state.selectedDate) => sel.getPaymentHistory(state, dateOrAll),
    setSelectedDate,
    setSearchQuery,
    setStatusFilter,
    setAdminTab,
    authenticateAdmin,
    openView,
    lockAdminSession,
    recordPayment,
    editPayment,
    removePayment,
    toggleResidentLunas,
    addResident,
  };
})(window);
