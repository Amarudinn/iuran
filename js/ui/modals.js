'use strict';

/**
 * Modal controllers for Admin PIN Gate and Payment Correction.
 */
(function initModals(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { store, formatters, toast } = app;

  let editingPaymentId = null;

  function openPinModal() {
    const modal = document.getElementById('pin-modal');
    const input = document.getElementById('pin-input');
    const errorEl = document.getElementById('pin-error');
    if (!modal || !input || !errorEl) return;

    input.value = '';
    errorEl.classList.add('is-hidden');
    modal.classList.remove('is-hidden');
    window.setTimeout(() => input.focus(), 50);
  }

  function closePinModal() {
    const modal = document.getElementById('pin-modal');
    if (modal) modal.classList.add('is-hidden');
  }

  /**
   * Open payment amount correction modal for a specific payment record.
   * @param {{ id: string, residentName: string, amount: number }} payment
   */
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
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.add('is-hidden');
  }

  function bindModalEvents() {
    const pinModal = document.getElementById('pin-modal');
    const pinForm = document.getElementById('pin-form');
    const pinInput = document.getElementById('pin-input');
    const pinError = document.getElementById('pin-error');

    document.getElementById('pin-close-btn')?.addEventListener('click', closePinModal);
    document.getElementById('pin-cancel-btn')?.addEventListener('click', closePinModal);
    pinModal?.addEventListener('click', (e) => {
      if (e.target === pinModal) closePinModal();
    });

    pinForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!pinInput || !pinError) return;
      const success = store.authenticateAdmin(pinInput.value);
      if (!success) {
        pinError.classList.remove('is-hidden');
        pinInput.select();
        return;
      }
      closePinModal();
      toast.showToast('Berhasil masuk ke Dashboard Pengurus.');
    });

    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editInput = document.getElementById('edit-amount-input');
    const editError = document.getElementById('edit-error');

    document.getElementById('edit-close-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('edit-cancel-btn')?.addEventListener('click', closeEditModal);
    editModal?.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });

    editInput?.addEventListener('input', () => {
      editInput.value = formatters.formatNumberDots(editInput.value);
    });

    editForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!editingPaymentId || !editInput || !editError) return;
      const parsed = formatters.parseRupiahInput(editInput.value);
      const res = store.editPayment(editingPaymentId, parsed);
      if (res.error) {
        editError.textContent = res.error;
        editError.classList.remove('is-hidden');
        return;
      }
      closeEditModal();
      toast.showToast(`Nominal setoran diperbarui menjadi ${formatters.formatRupiah(parsed)}.`);
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
