'use strict';

/**
 * Pure derived selectors for flexible collection days, resident statuses, and stats.
 */
(function initSelectors(global) {
  const app = (global.IuranApp = global.IuranApp || {});

  /**
   * Extract unique sorted collection dates (YYYY-MM-DD) from recorded payments.
   * @param {{ payments: Array }} state
   * @returns {string[]}
   */
  function getCollectionDays(state) {
    const unique = new Set();
    for (const p of state.payments) {
      if (p.paidDate) unique.add(p.paidDate);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Aggregate payments per active resident for either "all" dates or a specific paidDate.
   * Status priority:
   * 1. "lunas"  -> explicitly labeled Lunas by Pengurus
   * 2. "paid"   -> totalAmount > 0 ("Sudah Bayar")
   * 3. "unpaid" -> totalAmount === 0 ("Belum Bayar")
   * @param {{ residents: Array, payments: Array }} state
   * @param {string} selectedDate 'all' or YYYY-MM-DD
   */
  function getResidentSummaries(state, selectedDate) {
    const totalsByResident = new Map();
    const countsByResident = new Map();

    for (const payment of state.payments) {
      if (selectedDate !== 'all' && payment.paidDate !== selectedDate) continue;
      totalsByResident.set(
        payment.residentId,
        (totalsByResident.get(payment.residentId) || 0) + payment.amount
      );
      countsByResident.set(
        payment.residentId,
        (countsByResident.get(payment.residentId) || 0) + 1
      );
    }

    return state.residents
      .filter((r) => r.isActive)
      .map((resident) => {
        const totalAmount = totalsByResident.get(resident.id) || 0;
        const paymentCount = countsByResident.get(resident.id) || 0;
        const status = resident.isLunas ? 'lunas' : totalAmount > 0 ? 'paid' : 'unpaid';
        return {
          residentId: resident.id,
          name: resident.name,
          isLunas: Boolean(resident.isLunas),
          totalAmount,
          paymentCount,
          status,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }

  /**
   * Compute KPI stats for the active scope ('all' or specific date).
   * @param {{ residents: Array, payments: Array }} state
   * @param {string} selectedDate
   */
  function getStats(state, selectedDate) {
    const summaries = getResidentSummaries(state, selectedDate);
    const totalResidents = summaries.length;
    let totalIncome = 0;
    let lunasCount = 0;
    let paidOnlyCount = 0;
    let unpaidCount = 0;
    let paymentTransactions = 0;

    for (const item of summaries) {
      totalIncome += item.totalAmount;
      paymentTransactions += item.paymentCount;
      if (item.status === 'lunas') lunasCount += 1;
      else if (item.status === 'paid') paidOnlyCount += 1;
      else unpaidCount += 1;
    }

    return {
      totalIncome,
      settledCount: lunasCount + paidOnlyCount,
      lunasCount,
      paidOnlyCount,
      unpaidCount,
      totalResidents,
      paymentTransactions,
    };
  }

  /**
   * Filter public resident rows by search query and status pill.
   * @param {object} state
   */
  function getFilteredPublicRows(state) {
    const summaries = getResidentSummaries(state, state.selectedDate);
    const query = state.searchQuery.trim().toLowerCase();

    return summaries.filter((row) => {
      if (state.statusFilter !== 'all' && row.status !== state.statusFilter) return false;
      if (query && !row.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  /**
   * Return individual payment entries for the active scope, newest first.
   * @param {{ residents: Array, payments: Array }} state
   * @param {string} selectedDate
   */
  function getPaymentHistory(state, selectedDate) {
    const residentMap = new Map(state.residents.map((r) => [r.id, r.name]));
    return state.payments
      .filter((p) => selectedDate === 'all' || p.paidDate === selectedDate)
      .map((p) => ({
        ...p,
        residentName: residentMap.get(p.residentId) || 'Warga Tidak Dikenal',
      }))
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }

  app.selectors = {
    getCollectionDays,
    getResidentSummaries,
    getStats,
    getFilteredPublicRows,
    getPaymentHistory,
  };
})(window);
