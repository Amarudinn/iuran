'use strict';

/**
 * Natural Indonesian notebook line parser for backdated payment imports.
 * Supports formats such as:
 * - "Amar RP 10rb Senin 23 Nov 2026"
 * - "Budi Santoso Rp 25.000 21 Nov 2026"
 * - "Dewi Lestari 15k 23/11/2026"
 * - "Rahmat 20000" (uses fallbackDate)
 */
(function initBackdateParser(global) {
  const app = (global.IuranApp = global.IuranApp || {});

  const MONTH_MAP = {
    jan: 1, januari: 1,
    feb: 2, februari: 2, peb: 2,
    mar: 3, maret: 3,
    apr: 4, april: 4,
    mei: 5, may: 5,
    jun: 6, juni: 6,
    jul: 7, juli: 7,
    agu: 8, ags: 8, agustus: 8, aug: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oktober: 10, oct: 10,
    nov: 11, november: 11, nop: 11,
    des: 12, desember: 12, dec: 12,
  };

  function toIsoDate(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const check = new Date(y, m - 1, d);
    if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) {
      return null;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  /**
   * Extract date token from text and return { isoDate, remainingText }.
   * @param {string} text
   * @param {string} fallbackDate
   */
  function extractDate(text, fallbackDate) {
    // 1. ISO: 2026-11-23
    let match = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(text);
    if (match) {
      const iso = toIsoDate(match[1], match[2], match[3]);
      if (iso) return { isoDate: iso, remainingText: text.replace(match[0], ' ') };
    }

    // 2. Numeric Indonesian: 23/11/2026 or 23-11-2026
    match = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/.exec(text);
    if (match) {
      const iso = toIsoDate(match[3], match[2], match[1]);
      if (iso) return { isoDate: iso, remainingText: text.replace(match[0], ' ') };
    }

    // 3. Indonesian text date: [Senin,] 23 Nov 2026
    const monthNames = Object.keys(MONTH_MAP).join('|');
    const textDateRe = new RegExp(
      `(?:\\b(?:minggu|senin|selasa|rabu|kamis|jumat|jum'at|sabtu),?\\s+)?\\b(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})\\b`,
      'i'
    );
    match = textDateRe.exec(text);
    if (match) {
      const monthNum = MONTH_MAP[match[2].toLowerCase()];
      const iso = toIsoDate(match[3], monthNum, match[1]);
      if (iso) return { isoDate: iso, remainingText: text.replace(match[0], ' ') };
    }

    return { isoDate: fallbackDate, remainingText: text };
  }

  /**
   * Extract nominal amount token (Rp 10rb, 25k, Rp 25.000, 15000) from text.
   * @param {string} text
   */
  function extractAmount(text) {
    // Shorthand thousands: Rp 10rb, 10.5rb, 25k, 15 ribu
    let match = /(?:rp\.?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(rb|ribu|k)\b/i.exec(text);
    if (match) {
      const num = Number(match[1].replace(',', '.'));
      const amount = Math.round(num * 1000);
      if (amount > 0) return { amount, remainingText: text.replace(match[0], ' ') };
    }

    // Explicit Rupiah or plain integer >= 100
    match = /(?:rp\.?\s*)(\d{1,3}(?:[.,]\d{3})+|\d{3,9})\b/i.exec(text);
    if (!match) {
      match = /\b(\d{1,3}(?:\.\d{3})+|\d{3,9})\b/.exec(text);
    }
    if (match) {
      const digits = match[1].replace(/[.,]/g, '');
      const amount = Number.parseInt(digits, 10);
      if (Number.isSafeInteger(amount) && amount > 0) {
        return { amount, remainingText: text.replace(match[0], ' ') };
      }
    }

    return { amount: 0, remainingText: text };
  }

  /**
   * Parse multi-line notebook entries into structured payment rows.
   * @param {string} rawText
   * @param {string} fallbackDate YYYY-MM-DD
   */
  function parseLines(rawText, fallbackDate) {
    const rawLines = String(rawText || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return rawLines.map((line) => {
      const afterDate = extractDate(line, fallbackDate);
      const afterAmount = extractAmount(afterDate.remainingText);
      const cleanName = afterAmount.remainingText
        .replace(/[-|,;:•]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let error = null;
      if (cleanName.length < 2) error = 'Nama warga tidak terbaca';
      else if (afterAmount.amount <= 0) error = 'Nominal tidak valid';
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(afterDate.isoDate || ''))) {
        error = 'Tanggal tidak valid';
      }

      return {
        raw: line,
        name: cleanName,
        amount: afterAmount.amount,
        paidDate: afterDate.isoDate,
        error,
      };
    });
  }

  app.backdateParser = { parseLines };
})(window);
