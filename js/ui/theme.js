'use strict';

/**
 * Light / Dark mode theme controller with silky-smooth synchronized transitions.
 */
(function initTheme(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const STORAGE_KEY = 'zero_five_theme';
  let transitionTimer = null;

  function readSavedTheme() {
    try {
      const saved = global.localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (_err) {
      // Ignore storage access errors in restricted contexts
    }
    return 'light';
  }

  function saveTheme(theme) {
    try {
      global.localStorage.setItem(STORAGE_KEY, theme);
    } catch (_err) {
      // Ignore storage write errors
    }
  }

  function applyTheme(theme, animate) {
    const isDark = theme === 'dark';
    const root = document.documentElement;

    if (animate) {
      root.classList.add('theme-transitioning');
      if (transitionTimer) global.clearTimeout(transitionTimer);
      transitionTimer = global.setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 390);
    }

    root.setAttribute('data-theme', theme);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#090b10' : '#4f46e5');
    }

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      if (animate) {
        btn.classList.add('is-spinning');
        global.setTimeout(() => btn.classList.remove('is-spinning'), 300);
      }
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isDark ? 'ph ph-sun' : 'ph ph-moon';
      }
      btn.setAttribute('aria-pressed', String(isDark));
      btn.setAttribute('title', isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
      btn.setAttribute('aria-label', isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
    });
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next, true);
  }

  function init() {
    applyTheme(readSavedTheme(), false);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggle);
    });
  }

  app.theme = { init, toggle };
})(window);
