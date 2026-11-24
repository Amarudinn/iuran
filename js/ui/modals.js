'use strict';

/**
 * Async Modal controllers for Admin PIN Gate and Payment Amount Correction.
 */
(function initModals(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { store, formatters, toast } = app;

  let editingPaymentId = null;

  function openPinModal() {
    const modal = document.getElementById('pin-modal');
    const input = document.getElementById('pin-input');
    const errorEl = document.getElementById('pin-error');
    const hintEl = document.getElementById('pin-hint-box');
    if (!modal || !input || !errorEl) return;

    const isLive = store.getState().dbMode === 'supabase';
    hintEl?.classList.toggle('is-hidden', isLive);

    input.value = '';
    errorEl.classList.add('is-hidden');
    modal.classList.remove('is-hidden');
    window.setTimeout(() => input.focus(), 50);
  }

  function closePinModal() {
    document.getElementById('pin-modal')?.classList.add('is-hidden');
  }

  function openEditModal(payment) {
    const modal = document.getElementById('edit-modal');
    const nameEl = document.getElementById('edit-resident-name');
    const amountInput = document.getElementById('edit-amount-input');
    const errorEl = document.getElementById('edit-error');
    if (!modal || !nameEl || !amountInput || !errorEl) return;

    editingPaymentId = payment.id;
    nameEl.textContent = payment.residentName;
    amountInput.value = formatters.formatNumberDots(payment.amount);
    errorEl.classList.add('is-hidden');
    modal.classList.remove('is-hidden');
    window.setTimeout(() => amountInput.focus(), 50);
  }

  function closeEditModal() {
    editingPaymentId = null;
    document.getElementById('edit-modal')?.classList.add('is-hidden');
  }

  function bindModalEvents() {
    const pinModal = document.getElementById('pin-modal');
    const pinForm = document.getElementById('pin-form');
    const pinInput = document.getElementById('pin-input');
    const pinError = document.getElementById('pin-error');
    const pinSubmit = document.getElementById('pin-submit-btn');

    document.getElementById('pin-close-btn')?.addEventListener('click', closePinModal);
    document.getElementById('pin-cancel-btn')?.addEventListener('click', closePinModal);
    pinModal?.addEventListener('click', (e) => {
      if (e.target === pinModal) closePinModal();
    });

    pinForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pinInput || !pinError || !pinSubmit) return;

      pinSubmit.disabled = true;
      pinSubmit.textContent = 'Memeriksa...';
      try {
        const res = await store.authenticateAdmin(pinInput.value);
        if (!res.ok) {
          pinError.textContent = res.error || 'PIN pengurus tidak sesuai.';
          pinError.classList.remove('is-hidden');
          pinInput.select();
          return;
        }
        closePinModal();
        toast.showToast('Berhasil masuk ke Mode Pengurus.');
      } finally {
        pinSubmit.disabled = false;
        pinSubmit.textContent = 'Masuk';
      }
    });

    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editInput = document.getElementById('edit-amount-input');
    const editError = document.getElementById('edit-error');
    const editSubmit = document.getElementById('edit-submit-btn');

    document.getElementById('edit-close-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('edit-cancel-btn')?.addEventListener('click', closeEditModal);
    editModal?.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });

    editInput?.addEventListener('input', () => {
      editInput.value = formatters.formatNumberDots(editInput.value);
    });

    editForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!editingPaymentId || !editInput || !editError || !editSubmit) return;

      const parsed = formatters.parseRupiahInput(editInput.value);
      editSubmit.disabled = true;
      editSubmit.textContent = 'Menyimpan...';
      try {
        const res = await store.editPayment(editingPaymentId, parsed);
        if (res.error) {
          editError.textContent = res.error;
          editError.classList.remove('is-hidden');
          return;
        }
        closeEditModal();
        toast.showToast(`Nominal diperbarui menjadi ${formatters.formatRupiah(parsed)}.`);
      } finally {
        editSubmit.disabled = false;
        editSubmit.textContent = 'Simpan';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePinModal();
        closeEditModal();
      }
    });
  }

  app.modals = {
    openPinModal,
    closePinModal,
    openEditModal,
    closeEditModal,
    bindModalEvents,
  };
})(window);
