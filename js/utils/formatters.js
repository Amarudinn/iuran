'use strict';

/**
 * Formatting, parsing, date helpers, and XSS-safe sanitization.
 */
(function initFormatters(global) {
  const app = (global.IuranApp = global.IuranApp || {});

  const idrNumberFormat = new Intl.NumberFormat('id-ID');
  const shortDateTimeFormat = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const monthYearFormat = new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
  });

  function formatRupiah(amount) {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
    return `Rp ${idrNumberFormat.format(safeAmount)}`;
  }

  function formatNumberDots(rawValue) {
    const digits = String(rawValue).replace(/\D/g, '');
    if (!digits) return '';
    return idrNumberFormat.format(Number(digits));
  }

  function parseRupiahInput(rawValue) {
    const digits = String(rawValue || '').replace(/\D/g, '');
    if (!digits) return 0;
    const parsed = Number.parseInt(digits, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatShortDateTime(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '-';
    return shortDateTimeFormat.format(date).replace('.', ':');
  }

  /**
   * Format ISO date ("2026-11-11") into flexible collection day label ("Hari 11 • Nov 2026").
   * @param {string} isoDate YYYY-MM-DD
   * @returns {string}
   */
  function formatCollectionDayLabel(isoDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
    if (!match) return String(isoDate || '-');
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const dateObj = new Date(year, month, day);
    return `Hari ${day} • ${monthYearFormat.format(dateObj)}`;
  }

  /**
   * Return current local date formatted as YYYY-MM-DD.
   * @returns {string}
   */
  function getTodayIsoDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function generateId(prefix) {
    const rand = Math.random().toString(36).slice(2, 7);
    return `${prefix}-${Date.now().toString(36)}-${rand}`;
  }

  app.formatters = {
    formatRupiah,
    formatNumberDots,
    parseRupiahInput,
    escapeHtml,
    formatShortDateTime,
    formatCollectionDayLabel,
    getTodayIsoDate,
    generateId,
  };
})(window);
