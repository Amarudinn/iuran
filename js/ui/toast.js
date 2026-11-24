'use strict';

/**
 * Lightweight toast notification component.
 */
(function initToast(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { escapeHtml } = app.formatters;

  /**
   * Display a brief feedback toast at the bottom of the viewport.
   * @param {string} message
   * @param {'success' | 'error'} [type='success']
   */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icon = type === 'error' ? 'ph-warning-circle' : 'ph-check-circle';
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<i class="ph-fill ${icon}" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 180ms ease';
      window.setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  app.toast = { showToast };
})(window);
