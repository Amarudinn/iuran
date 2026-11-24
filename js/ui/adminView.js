'use strict';

/**
 * Async Collector Admin Dashboard renderer.
 * Always displays cumulative data ("all" / Semuanya) with Backup modal trigger.
 */
(function initAdminView(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { store, formatters, toast, modals, sheets, adminForm } = app;

  function renderAdminSummary(stats) {
    const inc = document.getElementById('admin-metric-income');
    const settled = document.getElementById('admin-metric-paid');
    const lunas = document.getElementById('admin-metric-lunas');
    if (inc) inc.textContent = formatters.formatRupiah(stats.totalIncome);
    if (settled) settled.textContent = `${stats.settledCount} / ${stats.totalResidents}`;
    if (lunas) lunas.textContent = `${stats.lunasCount} Warga`;
  }

  function renderHistoryTable(history) {
    const tbody = document.getElementById('admin-history-body');
    if (!tbody) return;

    if (history.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="3">
          <div class="empty-state">
            <i class="ph ph-receipt" aria-hidden="true"></i>
            <p>Belum ada catatan setoran.</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = history
      .map(
        (item) => `
        <tr>
          <td>
            <span class="resident-name">${formatters.escapeHtml(item.residentName)}</span>
            <span class="time-meta">${formatters.escapeHtml(formatters.formatFullDayDate(item.paidDate))}</span>
          </td>
          <td class="col-right tabular-nums amount-paid">${formatters.formatRupiah(item.amount)}</td>
          <td class="col-right">
            <div class="row-actions">
              <button type="button" class="btn btn-secondary btn-icon" data-edit-payment="${formatters.escapeHtml(item.id)}" title="Koreksi nominal" aria-label="Koreksi nominal ${formatters.escapeHtml(item.residentName)}">
                <i class="ph ph-pencil-simple" aria-hidden="true"></i>
              </button>
              <button type="button" class="btn btn-danger-ghost btn-icon" data-delete-payment="${formatters.escapeHtml(item.id)}" title="Hapus setoran" aria-label="Hapus setoran ${formatters.escapeHtml(item.residentName)}">
                <i class="ph ph-trash" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>`
      )
      .join('');
  }

  function renderUnpaidTable(summaries) {
    const tbody = document.getElementById('admin-unpaid-body');
    if (!tbody) return;

    const unpaid = summaries.filter((s) => s.status === 'unpaid');
    if (unpaid.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="2">
          <div class="empty-state">
            <i class="ph-fill ph-check-circle" aria-hidden="true"></i>
            <p>Semua warga sudah menyetor.</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = unpaid
      .map(
        (item) => `
        <tr>
          <td><span class="resident-name">${formatters.escapeHtml(item.name)}</span></td>
          <td class="col-right">
            <button type="button" class="btn btn-secondary btn-sm" data-quick-select="${formatters.escapeHtml(item.residentId)}">
              <i class="ph ph-plus-circle" aria-hidden="true"></i>Catat
            </button>
          </td>
        </tr>`
      )
      .join('');
  }

  function renderLunasManagerTable(summaries) {
    const tbody = document.getElementById('admin-lunas-body');
    if (!tbody) return;

    tbody.innerHTML = summaries
      .map((item) => {
        const btnClass = item.isLunas ? 'btn btn-sm btn-lunas-active' : 'btn btn-secondary btn-sm';
        const btnLabel = item.isLunas
          ? '<i class="ph-fill ph-seal-check" aria-hidden="true"></i>Lunas'
          : '<i class="ph ph-seal-check" aria-hidden="true"></i>Tandai Lunas';
        return `
          <tr>
            <td>
              <span class="resident-name">${formatters.escapeHtml(item.name)}</span>
              <span class="time-meta tabular-nums">${formatters.formatRupiah(item.totalAmount)}</span>
            </td>
            <td class="col-right">
              <button type="button" class="${btnClass}" data-toggle-lunas="${formatters.escapeHtml(item.residentId)}">
                ${btnLabel}
              </button>
            </td>
          </tr>`;
      })
      .join('');
  }

  function render() {
    const state = store.getState();
    const summaries = store.getResidentSummaries('all');
    const stats = store.getStats('all');
    const history = store.getPaymentHistory('all');

    adminForm.renderResidentDropdown(summaries);
    adminForm.syncAutoDateDisplay();
    renderAdminSummary(stats);
    renderHistoryTable(history);
    renderUnpaidTable(summaries);
    renderLunasManagerTable(summaries);

    const histCount = document.getElementById('tab-history-count');
    const unpaidCount = document.getElementById('tab-unpaid-count');
    const lunasCount = document.getElementById('tab-lunas-count');
    if (histCount) histCount.textContent = String(history.length);
    if (unpaidCount) unpaidCount.textContent = String(stats.unpaidCount);
    if (lunasCount) lunasCount.textContent = String(stats.lunasCount);

    document.querySelectorAll('[data-admin-tab]').forEach((tabBtn) => {
      tabBtn.classList.toggle('is-active', tabBtn.getAttribute('data-admin-tab') === state.adminTab);
    });
    document.getElementById('admin-history-panel')?.classList.toggle('is-hidden', state.adminTab !== 'history');
    document.getElementById('admin-unpaid-panel')?.classList.toggle('is-hidden', state.adminTab !== 'unpaid');
    document.getElementById('admin-lunas-panel')?.classList.toggle('is-hidden', state.adminTab !== 'lunas');
  }

  function bindEvents() {
    adminForm.bindEvents();

    document.getElementById('open-backup-btn')?.addEventListener('click', () => {
      sheets.openBackupModal();
    });

    document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-admin-tab');
        if (tab) store.setAdminTab(tab);
      });
    });

    document.getElementById('admin-history-body')?.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-edit-payment]');
      if (editBtn) {
        const id = editBtn.getAttribute('data-edit-payment');
        const record = store.getPaymentHistory('all').find((p) => p.id === id);
        if (record) modals.openEditModal(record);
        return;
      }

      const delBtn = e.target.closest('[data-delete-payment]');
      if (!delBtn || delBtn.disabled) return;
      const id = delBtn.getAttribute('data-delete-payment');
      const record = store.getPaymentHistory('all').find((p) => p.id === id);
      if (!record) return;
      if (!window.confirm(`Hapus setoran ${formatters.formatRupiah(record.amount)} atas nama ${record.residentName}?`)) {
        return;
      }

      delBtn.disabled = true;
      try {
        const res = await store.removePayment(id);
        if (res.error) toast.showToast(res.error, 'error');
        else toast.showToast(`Setoran atas nama ${record.residentName} dihapus.`);
      } finally {
        delBtn.disabled = false;
      }
    });

    document.getElementById('admin-unpaid-body')?.addEventListener('click', (e) => {
      const pickBtn = e.target.closest('[data-quick-select]');
      const residentId = pickBtn?.getAttribute('data-quick-select');
      if (residentId) adminForm.preselectResident(residentId);
    });

    document.getElementById('admin-lunas-body')?.addEventListener('click', async (e) => {
      const toggleBtn = e.target.closest('[data-toggle-lunas]');
      if (!toggleBtn || toggleBtn.disabled) return;
      const residentId = toggleBtn.getAttribute('data-toggle-lunas');
      if (!residentId) return;

      toggleBtn.disabled = true;
      try {
        const res = await store.toggleResidentLunas(residentId);
        if (res.error) {
          toast.showToast(res.error, 'error');
          return;
        }
        const statusText = res.data.isLunas ? 'ditandai Lunas' : 'dibatalkan status Lunas-nya';
        toast.showToast(`${res.data.name} ${statusText}.`);
      } finally {
        toggleBtn.disabled = false;
      }
    });
  }

  app.adminView = { render, bindEvents };
})(window);
