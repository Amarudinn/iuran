'use strict';

/**
 * Custom polished Calendar Popover Card for selecting any collection date freely.
 */
(function initCalendarPicker(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { formatters } = app;

  const MONTHS_FULL = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const WEEKDAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  /**
   * Initialize custom calendar popover attached to a root element.
   * @param {{
   *   rootId: string,
   *   getSelectedDate: () => string,
   *   getPaymentDates: () => string[],
   *   onSelectDate: (isoOrAll: string) => void
   * }} config
   */
  function create(config) {
    const root = document.getElementById(config.rootId);
    if (!root) return { render: () => {}, close: () => {} };

    const trigger = root.querySelector('[data-cal-trigger]');
    const menu = root.querySelector('[data-cal-menu]');
    const monthLabel = root.querySelector('[data-cal-month]');
    const grid = root.querySelector('[data-cal-grid]');
    const prevBtn = root.querySelector('[data-cal-prev]');
    const nextBtn = root.querySelector('[data-cal-next]');
    const todayBtn = root.querySelector('[data-cal-today]');
    const allBtn = root.querySelector('[data-cal-all]');

    const todayIso = formatters.getTodayIsoDate();
    const [initY, initM] = todayIso.split('-').map(Number);
    let viewYear = initY;
    let viewMonth = initM - 1; // 0-indexed

    function toIso(y, m, d) {
      return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    function syncMonthToSelected() {
      const sel = config.getSelectedDate();
      const target = sel && sel !== 'all' ? sel : formatters.getTodayIsoDate();
      const parts = target.split('-').map(Number);
      if (parts.length === 3 && !parts.some(Number.isNaN)) {
        viewYear = parts[0];
        viewMonth = parts[1] - 1;
      }
    }

    function renderGrid() {
      if (!monthLabel || !grid) return;
      monthLabel.textContent = `${MONTHS_FULL[viewMonth]} ${viewYear}`;

      const selected = config.getSelectedDate();
      const currentToday = formatters.getTodayIsoDate();
      const activeDates = new Set(config.getPaymentDates());

      const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      const headerHtml = WEEKDAYS_SHORT.map(
        (d) => `<span class="cal-weekday">${d}</span>`
      ).join('');

      const blanks = Array.from({ length: firstDayOfWeek }, () => '<span class="cal-empty"></span>').join('');

      const dayButtons = [];
      for (let day = 1; day <= daysInMonth; day += 1) {
        const iso = toIso(viewYear, viewMonth, day);
        const classes = ['cal-day'];
        if (iso === selected) classes.push('is-selected');
        if (iso === currentToday) classes.push('is-today');
        if (activeDates.has(iso)) classes.push('has-payment');
        dayButtons.push(
          `<button type="button" class="${classes.join(' ')}" data-cal-day="${iso}" aria-label="${formatters.escapeHtml(formatters.formatFullDayDate(iso))}">${day}</button>`
        );
      }

      grid.innerHTML = headerHtml + blanks + dayButtons.join('');
    }

    function close() {
      root.classList.remove('is-open');
      menu?.classList.add('is-hidden');
      trigger?.setAttribute('aria-expanded', 'false');
    }

    function open() {
      syncMonthToSelected();
      renderGrid();
      root.classList.add('is-open');
      menu?.classList.remove('is-hidden');
      trigger?.setAttribute('aria-expanded', 'true');
    }

    trigger?.addEventListener('click', () => {
      if (root.classList.contains('is-open')) close();
      else open();
    });

    prevBtn?.addEventListener('click', () => {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      renderGrid();
    });

    nextBtn?.addEventListener('click', () => {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      renderGrid();
    });

    todayBtn?.addEventListener('click', () => {
      config.onSelectDate(formatters.getTodayIsoDate());
      close();
    });

    allBtn?.addEventListener('click', () => {
      config.onSelectDate('all');
      close();
    });

    grid?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cal-day]');
      const iso = btn?.getAttribute('data-cal-day');
      if (!iso) return;
      config.onSelectDate(iso);
      close();
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    return {
      render: () => {
        if (root.classList.contains('is-open')) renderGrid();
      },
      close,
    };
  }

  app.calendarPicker = { create };
})(window);
