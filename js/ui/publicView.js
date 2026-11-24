'use strict';

/**
 * Public Resident View renderer and event handlers.
 * Uses custom polished Calendar Popover Card + default "Semuanya" filter and clickable rows.
 */
(function initPublicView(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { store, formatters, sheets, calendarPicker } = app;

  let calCtrl = null;

  function renderDateControls(selectedDate) {
    const displayEl = document.getElementById('public-date-display');
    const allBtn = document.getElementById('public-all-days-btn');

    const isAll = selectedDate === 'all';
    if (displayEl) {
      displayEl.textContent = isAll ? 'Pilih Tanggal...' : formatters.formatFullDayDate(selectedDate);
      displayEl.classList.toggle('is-placeholder', isAll);
    }
    if (allBtn) {
      allBtn.classList.toggle('is-active', isAll);
      allBtn.setAttribute('aria-pressed', String(isAll));
    }
    calCtrl?.render();
  }

  function renderMetrics(stats, selectedDate) {
    const incomeEl = document.getElementById('metric-total-income');
    const footEl = document.getElementById('metric-tx-count');
    const paidEl = document.getElementById('metric-paid-count');
    const unpaidNoteEl = document.getElementById('metric-unpaid-note');
    const lunasBadgeEl = document.getElementById('metric-lunas-badge');

    if (incomeEl) incomeEl.textContent = formatters.formatRupiah(stats.totalIncome);
    if (footEl) {
      footEl.textContent =
        selectedDate === 'all'
          ? 'Total keseluruhan'
          : formatters.formatFullDayDate(selectedDate);
    }
    if (paidEl) {
      paidEl.innerHTML = `${stats.settledCount}<span style="font-size: 0.875rem; font-weight: 500; color: var(--text-muted);"> / ${stats.totalResidents}</span>`;
    }
    if (unpaidNoteEl) {
      unpaidNoteEl.textContent =
        stats.unpaidCount === 0
          ? 'Semua warga sudah setor'
          : `${stats.unpaidCount} belum bayar`;
    }
    if (lunasBadgeEl) {
      lunasBadgeEl.innerHTML = `<i class="ph-fill ph-seal-check" aria-hidden="true"></i>${stats.lunasCount} Lunas`;
    }
  }

  function renderFilterPills(stats, activeFilter) {
    const countAll = document.getElementById('count-all');
    const countPaid = document.getElementById('count-paid');
    const countLunas = document.getElementById('count-lunas');
    const countUnpaid = document.getElementById('count-unpaid');

    if (countAll) countAll.textContent = String(stats.totalResidents);
    if (countPaid) countPaid.textContent = String(stats.paidOnlyCount);
    if (countLunas) countLunas.textContent = String(stats.lunasCount);
    if (countUnpaid) countUnpaid.textContent = String(stats.unpaidCount);

    document.querySelectorAll('[data-status-filter]').forEach((btn) => {
      const isMatch = btn.getAttribute('data-status-filter') === activeFilter;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-pressed', String(isMatch));
    });
  }

  function buildStatusBadge(status) {
    if (status === 'lunas') {
      return '<span class="badge badge-lunas"><i class="ph-fill ph-seal-check" aria-hidden="true"></i>Lunas</span>';
    }
    if (status === 'paid') {
      return '<span class="badge badge-paid"><i class="ph-fill ph-check-circle" aria-hidden="true"></i>Sudah Bayar</span>';
    }
    return '<span class="badge badge-unpaid"><i class="ph ph-clock" aria-hidden="true"></i>Belum Bayar</span>';
  }

  function renderTable(rows, state) {
    const tbody = document.getElementById('public-table-body');
    if (!tbody) return;

    if (state.isLoading) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3">
            <div class="empty-state">
              <i class="ph ph-spinner" aria-hidden="true"></i>
              <p>Memuat data...</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    if (state.loadError) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3">
            <div class="empty-state">
              <i class="ph ph-wifi-slash" aria-hidden="true"></i>
              <p>${formatters.escapeHtml(state.loadError)}</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3">
            <div class="empty-state">
              <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
              <p>Tidak ada nama warga yang sesuai dengan pencarian atau filter ini.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const amountClass = row.totalAmount > 0 ? 'amount-paid' : 'amount-zero';
        const installmentHint =
          row.paymentCount > 1
            ? `<span class="installment-note">${row.paymentCount}x setor</span>`
            : '';

        return `
          <tr class="is-clickable-row" data-resident-detail="${formatters.escapeHtml(row.residentId)}" tabindex="0" role="button" aria-label="Lihat riwayat setoran ${formatters.escapeHtml(row.name)}">
            <td><span class="resident-name">${formatters.escapeHtml(row.name)}</span></td>
            <td class="col-right tabular-nums">
              <span class="${amountClass}">${formatters.formatRupiah(row.totalAmount)}</span>
              ${installmentHint}
            </td>
            <td class="col-right">${buildStatusBadge(row.status)}</td>
          </tr>`;
      })
      .join('');
  }

  function render() {
    const state = store.getState();
    const stats = store.getStats();
    const rows = store.getFilteredPublicRows();

    renderDateControls(state.selectedDate);
    renderMetrics(stats, state.selectedDate);
    renderFilterPills(stats, state.statusFilter);
    renderTable(rows, state);
  }

  function bindEvents() {
    calCtrl = calendarPicker.create({
      rootId: 'public-date-picker',
      getSelectedDate: () => store.getState().selectedDate,
      getPaymentDates: () => store.getCollectionDays(),
      onSelectDate: (isoOrAll) => store.setSelectedDate(isoOrAll),
    });

    document.getElementById('public-all-days-btn')?.addEventListener('click', () => {
      store.setSelectedDate('all');
      calCtrl?.close();
    });

    document.getElementById('public-search-input')?.addEventListener('input', (e) => {
      store.setSearchQuery(e.target.value);
    });

    document.querySelectorAll('[data-status-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-status-filter');
        if (filter) store.setStatusFilter(filter);
      });
    });

    const tbody = document.getElementById('public-table-body');
    tbody?.addEventListener('click', (e) => {
      const row = e.target.closest('[data-resident-detail]');
      const residentId = row?.getAttribute('data-resident-detail');
      if (residentId) sheets.openResidentDetail(residentId);
    });

    tbody?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('[data-resident-detail]');
      const residentId = row?.getAttribute('data-resident-detail');
      if (residentId) {
        e.preventDefault();
        sheets.openResidentDetail(residentId);
      }
    });
  }

  app.publicView = { render, bindEvents };
})(window);
