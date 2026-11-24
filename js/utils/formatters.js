'use strict';

/**
 * Formatting, parsing, Indonesian date helpers, and XSS-safe sanitization.
 */
(function initFormatters(global) {
  const app = (global.IuranApp = global.IuranApp || {});

  const idrNumberFormat = new Intl.NumberFormat('id-ID');
  const WEEKDAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

  /**
   * Format ISO date ("2026-11-24") into clean Indonesian weekday date ("Selasa 24 Nov 2026").
   * @param {string} isoDate YYYY-MM-DD
   * @returns {string}
   */
  function formatFullDayDate(isoDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
    if (!match) return String(isoDate || '-');
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const dateObj = new Date(year, monthIndex, day);
    if (Number.isNaN(dateObj.getTime())) return String(isoDate);
    const weekday = WEEKDAYS_ID[dateObj.getDay()];
    const month = MONTHS_ID[dateObj.getMonth()];
    return `${weekday} ${day} ${month} ${year}`;
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
    formatFullDayDate,
    getTodayIsoDate,
    generateId,
  };
})(window);
