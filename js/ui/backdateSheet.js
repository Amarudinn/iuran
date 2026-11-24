'use strict';

/**
 * Admin Bottom Sheet for importing historical / notebook payments ("Data Lama").
 * Supports both Single Entry (Satuan) and Multi-Line Notebook Import (Massal).
 */
(function initBackdateSheet(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { store, formatters, backdateParser, customDropdown, calendarPicker, toast } = app;

  let activeTab = 'single'; // 'single' | 'bulk'
  let singleDate = '';
  let bulkDate = '';
  let residentFilter = '';
  let residentDropdownCtrl = null;
  let singleCalCtrl = null;
  let bulkCalCtrl = null;

  function renderTabs() {
    document.querySelectorAll('[data-bd-tab]').forEach((btn) => {
      const isActive = btn.getAttribute('data-bd-tab') === activeTab;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    document.getElementById('bd-single-panel')?.classList.toggle('is-hidden', activeTab !== 'single');
    document.getElementById('bd-bulk-panel')?.classList.toggle('is-hidden', activeTab !== 'bulk');
  }

  function renderDateDisplays() {
    const singleEl = document.getElementById('bd-date-display');
    const bulkEl = document.getElementById('bd-bulk-date-display');
    if (singleEl) singleEl.textContent = formatters.formatFullDayDate(singleDate);
    if (bulkEl) bulkEl.textContent = formatters.formatFullDayDate(bulkDate);
  }

  function renderResidentList() {
    const listEl = document.getElementById('bd-resident-list');
    const hiddenEl = document.getElementById('bd-resident-select');
    if (!listEl || !hiddenEl) return;

    const selectedId = hiddenEl.value;
    const summaries = store.getResidentSummaries('all');
    const q = residentFilter.trim();
    const qLower = q.toLowerCase();
    const filtered = qLower
      ? summaries.filter((s) => s.name.toLowerCase().includes(qLower))
      : summaries;

    const exactExists = summaries.some((s) => s.name.toLowerCase() === qLower);
    const itemsHtml = filtered
      .map((s) => {
        const isSel = s.residentId === selectedId;
        const check = isSel ? '<i class="ph-fill ph-check-circle" aria-hidden="true"></i>' : '';
        return `
          <button type="button" class="cselect-option${isSel ? ' is-selected' : ''}" data-bd-resident="${formatters.escapeHtml(s.residentId)}">
            <span>${formatters.escapeHtml(s.name)}</span>
            <span class="cselect-option-meta">${check}</span>
          </button>`;
      })
      .join('');

    const createOption =
      q.length >= 2 && !exactExists
        ? `<button type="button" class="cselect-option bd-create-opt" data-bd-create-name="${formatters.escapeHtml(q)}">
            <span><i class="ph-bold ph-user-plus" aria-hidden="true"></i> Tambah &amp; pilih "${formatters.escapeHtml(q)}"</span>
          </button>`
        : '';

    listEl.innerHTML =
      itemsHtml + createOption || '<div class="cselect-empty">Ketik nama warga...</div>';
  }

  function selectSingleResident(residentId, nameLabel) {
    const hiddenEl = document.getElementById('bd-resident-select');
    const valueEl = document.getElementById('bd-resident-value');
    if (!hiddenEl || !valueEl) return;
    hiddenEl.value = residentId;
    if (residentId && nameLabel) {
      valueEl.textContent = nameLabel;
      valueEl.classList.remove('is-placeholder');
    } else {
      valueEl.textContent = 'Pilih atau ketik nama warga...';
      valueEl.classList.add('is-placeholder');
    }
  }

  function renderBulkPreview() {
    const textarea = document.getElementById('bd-bulk-textarea');
    const previewEl = document.getElementById('bd-bulk-preview');
    const submitBtn = document.getElementById('bd-bulk-submit');
    if (!textarea || !previewEl || !submitBtn) return;

    const parsed = backdateParser.parseLines(textarea.value, bulkDate);
    if (parsed.length === 0) {
      previewEl.innerHTML = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Simpan Semua';
      return;
    }

    const existingMap = new Map(
      store.getState().residents.map((r) => [r.name.toLowerCase(), r])
    );
    const validCount = parsed.filter((p) => !p.error).length;

    previewEl.innerHTML = parsed
      .map((item) => {
        if (item.error) {
          return `
            <div class="bd-preview-row is-error">
              <span>${formatters.escapeHtml(item.raw)}</span>
              <span class="bd-preview-err">${formatters.escapeHtml(item.error)}</span>
            </div>`;
        }
        const isNew = !existingMap.has(item.name.toLowerCase());
        const newTag = isNew ? '<span class="badge badge-admin">Baru</span>' : '';
        return `
          <div class="bd-preview-row">
            <div>
              <strong>${formatters.escapeHtml(item.name)}</strong> ${newTag}
              <span class="time-meta">${formatters.escapeHtml(formatters.formatFullDayDate(item.paidDate))}</span>
            </div>
            <strong class="tabular-nums">${formatters.formatRupiah(item.amount)}</strong>
          </div>`;
      })
      .join('');

    submitBtn.disabled = validCount === 0;
    submitBtn.textContent = `Simpan Semua (${validCount} data)`;
  }

  function open() {
    const modal = document.getElementById('backdate-modal');
    if (!modal) return;
    const today = formatters.getTodayIsoDate();
    if (!singleDate) singleDate = today;
    if (!bulkDate) bulkDate = today;

    renderTabs();
    renderDateDisplays();
    renderResidentList();
    renderBulkPreview();
    document.getElementById('bd-single-error')?.classList.add('is-hidden');
    modal.classList.remove('is-hidden');
  }

  function close() {
    document.getElementById('backdate-modal')?.classList.add('is-hidden');
    residentDropdownCtrl?.close();
    singleCalCtrl?.close();
    bulkCalCtrl?.close();
  }

  function bindEvents() {
    const modal = document.getElementById('backdate-modal');
    const searchInput = document.getElementById('bd-resident-search');
    const amountInput = document.getElementById('bd-amount-input');
    const singleErr = document.getElementById('bd-single-error');
    const singleSubmit = document.getElementById('bd-single-submit');

    document.getElementById('bd-close-btn')?.addEventListener('click', close);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    document.querySelectorAll('[data-bd-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-bd-tab');
        if (next === 'single' || next === 'bulk') {
          activeTab = next;
          renderTabs();
        }
      });
    });

    residentDropdownCtrl = customDropdown.attach('bd-resident-dropdown', {
      onOpen: () => {
        residentFilter = '';
        if (searchInput) {
          searchInput.value = '';
          window.setTimeout(() => searchInput.focus(), 40);
        }
        renderResidentList();
      },
    });

    searchInput?.addEventListener('input', (e) => {
      residentFilter = e.target.value;
      renderResidentList();
    });

    document.getElementById('bd-resident-list')?.addEventListener('click', async (e) => {
      const existingBtn = e.target.closest('[data-bd-resident]');
      if (existingBtn) {
        const id = existingBtn.getAttribute('data-bd-resident');
        const found = store.getState().residents.find((r) => r.id === id);
        if (found) selectSingleResident(found.id, found.name);
        singleErr?.classList.add('is-hidden');
        residentDropdownCtrl?.close();
        return;
      }

      const createBtn = e.target.closest('[data-bd-create-name]');
      const newName = createBtn?.getAttribute('data-bd-create-name');
      if (!newName) return;
      createBtn.disabled = true;
      const res = await store.addResident(newName);
      if (res.error) {
        toast.showToast(res.error, 'error');
        return;
      }
      selectSingleResident(res.data.id, res.data.name);
      residentDropdownCtrl?.close();
      toast.showToast(`Warga baru "${res.data.name}" ditambahkan.`);
    });

    singleCalCtrl = calendarPicker.create({
      rootId: 'bd-date-picker',
      getSelectedDate: () => singleDate || formatters.getTodayIsoDate(),
      getPaymentDates: () => store.getCollectionDays(),
      onSelectDate: (iso) => {
        singleDate = iso === 'all' ? formatters.getTodayIsoDate() : iso;
        renderDateDisplays();
      },
    });

    bulkCalCtrl = calendarPicker.create({
      rootId: 'bd-bulk-date-picker',
      getSelectedDate: () => bulkDate || formatters.getTodayIsoDate(),
      getPaymentDates: () => store.getCollectionDays(),
      onSelectDate: (iso) => {
        bulkDate = iso === 'all' ? formatters.getTodayIsoDate() : iso;
        renderDateDisplays();
        renderBulkPreview();
      },
    });

    amountInput?.addEventListener('input', () => {
      amountInput.value = formatters.formatNumberDots(amountInput.value);
      singleErr?.classList.add('is-hidden');
    });

    document.querySelectorAll('[data-bd-amount]').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (!amountInput) return;
        amountInput.value = formatters.formatNumberDots(chip.getAttribute('data-bd-amount') || '');
        singleErr?.classList.add('is-hidden');
        amountInput.focus();
      });
    });

    document.getElementById('bd-single-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const residentId = document.getElementById('bd-resident-select')?.value || '';
      const amount = formatters.parseRupiahInput(amountInput?.value || '');
      const markLunas = Boolean(document.getElementById('bd-mark-lunas')?.checked);
      if (!singleSubmit || !singleErr) return;

      singleSubmit.disabled = true;
      singleSubmit.textContent = 'Menyimpan...';
      try {
        const res = await store.recordPayment({
          paidDate: singleDate,
          residentId,
          amount,
          markLunas,
        });
        if (res.error) {
          singleErr.textContent = res.error;
          singleErr.classList.remove('is-hidden');
          return;
        }
        const resident = store.getState().residents.find((r) => r.id === residentId);
        singleErr.classList.add('is-hidden');
        selectSingleResident('', '');
        if (amountInput) amountInput.value = '';
        const chk = document.getElementById('bd-mark-lunas');
        if (chk) chk.checked = false;
        toast.showToast(
          `${resident ? resident.name : 'Warga'} ${formatters.formatRupiah(amount)} (${formatters.formatFullDayDate(singleDate)}) tersimpan.`
        );
      } finally {
        singleSubmit.disabled = false;
        singleSubmit.textContent = 'Simpan Catatan';
      }
    });

    const bulkTextarea = document.getElementById('bd-bulk-textarea');
    const bulkSubmit = document.getElementById('bd-bulk-submit');

    bulkTextarea?.addEventListener('input', renderBulkPreview);

    bulkSubmit?.addEventListener('click', async () => {
      if (!bulkTextarea) return;
      const validRows = backdateParser
        .parseLines(bulkTextarea.value, bulkDate)
        .filter((r) => !r.error);
      if (validRows.length === 0) return;

      bulkSubmit.disabled = true;
      let savedCount = 0;
      let failCount = 0;

      try {
        for (let i = 0; i < validRows.length; i += 1) {
          const row = validRows[i];
          bulkSubmit.textContent = `Menyimpan ${i + 1}/${validRows.length}...`;

          let resident = store
            .getState()
            .residents.find((r) => r.name.toLowerCase() === row.name.toLowerCase());

          if (!resident) {
            const added = await store.addResident(row.name);
            if (added.error || !added.data) {
              failCount += 1;
              continue;
            }
            resident = added.data;
          }

          const pay = await store.recordPayment({
            paidDate: row.paidDate,
            residentId: resident.id,
            amount: row.amount,
            markLunas: false,
          });
          if (pay.error) failCount += 1;
          else savedCount += 1;
        }

        if (savedCount > 0) {
          bulkTextarea.value = '';
          renderBulkPreview();
          const note = failCount > 0 ? ` (${failCount} gagal)` : '';
          toast.showToast(`${savedCount} catatan buku berhasil disimpan ke Supabase${note}.`);
          if (failCount === 0) close();
        } else {
          toast.showToast('Gagal menyimpan catatan. Periksa koneksi Anda.', 'error');
        }
      } finally {
        bulkSubmit.disabled = false;
        renderBulkPreview();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  app.backdateSheet = { open, close, bindEvents };
})(window);
