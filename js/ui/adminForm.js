'use strict';

/**
 * Async Collector Admin Payment Form:
 * - Custom searchable Resident dropdown
 * - Polished Phosphor Lunas checkbox
 * - Automatic disabled Today Date field ("Selasa 24 Nov 2026")
 */
(function initAdminForm(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { store, formatters, toast, customDropdown } = app;

  let residentDropdownCtrl = null;
  let cachedSummaries = [];
  let residentFilterQuery = '';

  function renderResidentList() {
    const listEl = document.getElementById('admin-resident-list');
    const hiddenInput = document.getElementById('payment-resident-select');
    if (!listEl || !hiddenInput) return;

    const selectedId = hiddenInput.value;
    const query = residentFilterQuery.trim().toLowerCase();
    const filtered = query
      ? cachedSummaries.filter((s) => s.name.toLowerCase().includes(query))
      : cachedSummaries;

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="cselect-empty">Nama warga tidak ditemukan.</div>';
      return;
    }

    listEl.innerHTML = filtered
      .map((s) => {
        const isSelected = s.residentId === selectedId;
        const meta =
          s.status === 'lunas'
            ? '<span class="badge badge-lunas">Lunas</span>'
            : s.totalAmount > 0
              ? `<span class="tabular-nums">${formatters.formatRupiah(s.totalAmount)}</span>`
              : '<span>Belum</span>';
        const check = isSelected ? '<i class="ph-fill ph-check-circle" aria-hidden="true"></i>' : '';
        return `
          <button type="button" class="cselect-option${isSelected ? ' is-selected' : ''}" role="option" aria-selected="${isSelected}" data-resident-option="${formatters.escapeHtml(s.residentId)}">
            <span>${formatters.escapeHtml(s.name)}</span>
            <span class="cselect-option-meta">${meta}${check}</span>
          </button>`;
      })
      .join('');
  }

  function updateResidentTriggerLabel() {
    const hiddenInput = document.getElementById('payment-resident-select');
    const valueEl = document.getElementById('admin-resident-value');
    if (!hiddenInput || !valueEl) return;

    const current = cachedSummaries.find((s) => s.residentId === hiddenInput.value);
    if (current) {
      valueEl.textContent = current.name;
      valueEl.classList.remove('is-placeholder');
    } else {
      valueEl.textContent = 'Pilih Nama Warga...';
      valueEl.classList.add('is-placeholder');
    }
  }

  function renderResidentDropdown(summaries) {
    cachedSummaries = summaries;
    updateResidentTriggerLabel();
    renderResidentList();
  }

  function syncAutoDateDisplay() {
    const todayIso = formatters.getTodayIsoDate();
    const hiddenDate = document.getElementById('payment-date-input');
    const displayDate = document.getElementById('payment-date-display');
    if (hiddenDate) hiddenDate.value = todayIso;
    if (displayDate) {
      displayDate.value = formatters.formatFullDayDate(todayIso);
    }
  }

  function selectResident(residentId) {
    const hiddenInput = document.getElementById('payment-resident-select');
    if (!hiddenInput) return;
    hiddenInput.value = residentId;
    updateResidentTriggerLabel();
    renderResidentList();
  }

  function preselectResident(residentId) {
    selectResident(residentId);
    document.getElementById('payment-amount-input')?.focus();
    document
      .getElementById('payment-form-card')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function bindEvents() {
    const searchInput = document.getElementById('admin-resident-search');
    const amountInput = document.getElementById('payment-amount-input');
    const residentHidden = document.getElementById('payment-resident-select');
    const dateHidden = document.getElementById('payment-date-input');
    const markLunasInput = document.getElementById('payment-mark-lunas');
    const formError = document.getElementById('payment-form-error');
    const submitBtn = document.getElementById('payment-submit-btn');

    syncAutoDateDisplay();

    residentDropdownCtrl = customDropdown.attach('admin-resident-dropdown', {
      onOpen: () => {
        residentFilterQuery = '';
        if (searchInput) {
          searchInput.value = '';
          window.setTimeout(() => searchInput.focus(), 40);
        }
        renderResidentList();
      },
    });

    searchInput?.addEventListener('input', (e) => {
      residentFilterQuery = e.target.value;
      renderResidentList();
    });

    document.getElementById('admin-resident-list')?.addEventListener('click', (e) => {
      const opt = e.target.closest('[data-resident-option]');
      const residentId = opt?.getAttribute('data-resident-option');
      if (!residentId) return;
      selectResident(residentId);
      formError?.classList.add('is-hidden');
      residentDropdownCtrl?.close();
    });

    amountInput?.addEventListener('input', () => {
      amountInput.value = formatters.formatNumberDots(amountInput.value);
      formError?.classList.add('is-hidden');
    });

    document.querySelectorAll('.chip-amount').forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-amount') || '';
        if (!amountInput) return;
        amountInput.value = formatters.formatNumberDots(val);
        formError?.classList.add('is-hidden');
        amountInput.focus();
      });
    });

    document.getElementById('payment-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!residentHidden || !amountInput || !dateHidden || !formError || !submitBtn) return;

      syncAutoDateDisplay();
      const residentId = residentHidden.value;
      const amount = formatters.parseRupiahInput(amountInput.value);
      const paidDate = dateHidden.value;
      const markLunas = Boolean(markLunasInput?.checked);

      submitBtn.disabled = true;
      try {
        const res = await store.recordPayment({ paidDate, residentId, amount, markLunas });
        if (res.error) {
          formError.textContent = res.error;
          formError.classList.remove('is-hidden');
          return;
        }

        const resident = store.getState().residents.find((r) => r.id === residentId);
        formError.classList.add('is-hidden');
        selectResident('');
        amountInput.value = '';
        if (markLunasInput) markLunasInput.checked = false;

        const lunasSuffix = markLunas ? ' & ditandai Lunas' : '';
        toast.showToast(
          `Setoran ${formatters.formatRupiah(amount)} (${resident ? resident.name : 'Warga'}) dicatat${lunasSuffix}.`
        );
      } finally {
        submitBtn.disabled = false;
      }
    });

    const newResidentBox = document.getElementById('new-resident-box');
    const newResidentInput = document.getElementById('new-resident-name');
    const saveNewBtn = document.getElementById('save-new-resident-btn');

    document.getElementById('toggle-new-resident-btn')?.addEventListener('click', () => {
      if (!newResidentBox) return;
      const hidden = newResidentBox.classList.toggle('is-hidden');
      if (!hidden && newResidentInput) newResidentInput.focus();
    });

    saveNewBtn?.addEventListener('click', async () => {
      if (!newResidentInput) return;
      saveNewBtn.disabled = true;
      try {
        const res = await store.addResident(newResidentInput.value);
        if (res.error) {
          toast.showToast(res.error, 'error');
          return;
        }
        newResidentInput.value = '';
        newResidentBox?.classList.add('is-hidden');
        selectResident(res.data.id);
        toast.showToast(`Warga baru "${res.data.name}" ditambahkan.`);
        amountInput?.focus();
      } finally {
        saveNewBtn.disabled = false;
      }
    });
  }

  app.adminForm = {
    renderResidentDropdown,
    syncAutoDateDisplay,
    preselectResident,
    bindEvents,
  };
})(window);
