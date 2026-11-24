'use strict';

/**
 * Centralized reactive application state and mutations.
 * Default collection filter is "all" (Semuanya).
 */
(function initStore(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const repo = app.repository;
  const sel = app.selectors;

  const initial = repo.fetchInitialData().data;

  const state = {
    residents: initial.residents,
    payments: initial.payments,
    selectedDate: 'all', // 'all' (Semuanya - default) | 'YYYY-MM-DD'
    activeView: 'public', // 'public' | 'admin'
    isAdminAuthenticated: false,
    searchQuery: '',
    statusFilter: 'all', // 'all' | 'paid' | 'lunas' | 'unpaid'
    adminTab: 'history', // 'history' | 'unpaid' | 'lunas'
  };

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

  function authenticateAdmin(pin) {
    const ok = repo.verifyAdminPin(pin);
    if (ok) {
      state.isAdminAuthenticated = true;
      state.activeView = 'admin';
      notify();
    }
    return ok;
  }

  function openView(view) {
    if (view === 'admin' && !state.isAdminAuthenticated) return false;
    state.activeView = view;
    notify();
    return true;
  }

  function lockAdminSession() {
    state.isAdminAuthenticated = false;
    state.activeView = 'public';
    notify();
  }

  function recordPayment(payload) {
    const res = repo.insertPayment(payload);
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

  function editPayment(paymentId, newAmount) {
    const res = repo.updatePaymentAmount(paymentId, newAmount);
    if (res.data) {
      const target = state.payments.find((p) => p.id === paymentId);
      if (target) target.amount = res.data.amount;
      notify();
    }
    return res;
  }

  function removePayment(paymentId) {
    const res = repo.deletePayment(paymentId);
    if (res.data) {
      state.payments = state.payments.filter((p) => p.id !== paymentId);
      const remainingDays = sel.getCollectionDays(state);
      if (state.selectedDate !== 'all' && !remainingDays.includes(state.selectedDate)) {
        state.selectedDate = 'all';
      }
      notify();
    }
    return res;
  }

  function toggleResidentLunas(residentId) {
    if (!state.isAdminAuthenticated) {
      return { data: null, error: 'Hanya pengurus yang dapat mengubah status Lunas.' };
    }
    const target = state.residents.find((r) => r.id === residentId);
    if (!target) return { data: null, error: 'Data warga tidak ditemukan.' };
    const res = repo.setResidentLunas(residentId, !target.isLunas);
    if (res.data) {
      target.isLunas = res.data.isLunas;
      notify();
    }
    return res;
  }

  function addResident(name) {
    const res = repo.insertResident(name);
    if (res.data) {
      state.residents.push(res.data);
      notify();
    }
    return res;
  }

  app.store = {
    subscribe,
    getState,
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
