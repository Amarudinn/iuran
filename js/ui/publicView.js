'use strict';

/**
 * Public Resident View renderer and event handlers.
 * Uses custom polished Day Dropdown + default "Semuanya" filter.
 */
(function initPublicView(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { store, formatters, customDropdown } = app;

  let dayDropdownCtrl = null;

  function renderDayControls(days, selectedDate) {
    const valueEl = document.getElementById('public-day-value');
    const listEl = document.getElementById('public-day-list');
    const allBtn = document.getElementById('public-all-days-btn');

    const isAll = selectedDate === 'all';
    if (valueEl) {
      valueEl.textContent = isAll ? 'Pilih Hari...' : formatters.formatCollectionDayLabel(selectedDate);
      valueEl.classList.toggle('is-placeholder', isAll);
    }

    if (listEl) {
      if (days.length === 0) {
        listEl.innerHTML = '<div class="cselect-empty">Belum ada hari penarikan.</div>';
      } else {
        listEl.innerHTML = days
          .map((isoDate) => {
            const isSelected = isoDate === selectedDate;
            const checkIcon = isSelected
              ? '<i class="ph-fill ph-check-circle" aria-hidden="true"></i>'
              : '';
            return `
              <button type="button" class="cselect-option${isSelected ? ' is-selected' : ''}" role="option" aria-selected="${isSelected}" data-day-value="${formatters.escapeHtml(isoDate)}">
                <span>${formatters.escapeHtml(formatters.formatCollectionDayLabel(isoDate))}</span>
                <span class="cselect-option-meta">${checkIcon}</span>
              </button>`;
          })
          .join('');
      }
    }

    if (allBtn) {
      allBtn.classList.toggle('is-active', isAll);
      allBtn.setAttribute('aria-pressed', String(isAll));
    }
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
          : `Total ${formatters.formatCollectionDayLabel(selectedDate)}`;
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

  function renderTable(rows) {
    const tbody = document.getElementById('public-table-body');
    if (!tbody) return;

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
          <tr>
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
    const days = store.getCollectionDays();
    const stats = store.getStats();
    const rows = store.getFilteredPublicRows();

    renderDayControls(days, state.selectedDate);
    renderMetrics(stats, state.selectedDate);
    renderFilterPills(stats, state.statusFilter);
    renderTable(rows);

    const clearBtn = document.getElementById('public-search-clear');
    if (clearBtn) {
      clearBtn.classList.toggle('is-hidden', state.searchQuery.length === 0);
    }
  }

  function bindEvents() {
    dayDropdownCtrl = customDropdown.attach('public-day-dropdown');

    document.getElementById('public-day-list')?.addEventListener('click', (e) => {
      const opt = e.target.closest('[data-day-value]');
      const val = opt?.getAttribute('data-day-value');
      if (!val) return;
      store.setSelectedDate(val);
      dayDropdownCtrl?.close();
    });

    document.getElementById('public-all-days-btn')?.addEventListener('click', () => {
      store.setSelectedDate('all');
      dayDropdownCtrl?.close();
    });

    const searchInput = document.getElementById('public-search-input');
    const clearBtn = document.getElementById('public-search-clear');

    searchInput?.addEventListener('input', (e) => {
      store.setSearchQuery(e.target.value);
    });

    clearBtn?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      store.setSearchQuery('');
    });

    document.querySelectorAll('[data-status-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-status-filter');
        if (filter) store.setStatusFilter(filter);
      });
    });
  }

  app.publicView = { render, bindEvents };
})(window);
