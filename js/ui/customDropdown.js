'use strict';

/**
 * Reusable accessible custom dropdown popover controller.
 */
(function initCustomDropdown(global) {
  const app = (global.IuranApp = global.IuranApp || {});

  /** @type {Set<HTMLElement>} */
  const registered = new Set();
  let globalBound = false;

  function closeOne(root) {
    root.classList.remove('is-open');
    const menu = root.querySelector('.cselect-menu');
    const trigger = root.querySelector('.cselect-trigger');
    menu?.classList.add('is-hidden');
    trigger?.setAttribute('aria-expanded', 'false');
  }

  function closeAll(exceptRoot) {
    registered.forEach((root) => {
      if (root !== exceptRoot) closeOne(root);
    });
  }

  function bindGlobalListeners() {
    if (globalBound) return;
    globalBound = true;

    document.addEventListener('click', (e) => {
      registered.forEach((root) => {
        if (!root.contains(e.target)) closeOne(root);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll(null);
    });
  }

  /**
   * Bind open/close behavior to a `.cselect` element.
   * @param {string} rootId
   * @param {{ onOpen?: () => void }} [options]
   */
  function attach(rootId, options = {}) {
    const root = document.getElementById(rootId);
    if (!root) return null;

    bindGlobalListeners();
    registered.add(root);

    const trigger = root.querySelector('.cselect-trigger');
    const menu = root.querySelector('.cselect-menu');

    trigger?.addEventListener('click', () => {
      if (trigger.disabled) return;
      const willOpen = !root.classList.contains('is-open');
      closeAll(root);
      if (willOpen) {
        root.classList.add('is-open');
        menu?.classList.remove('is-hidden');
        trigger.setAttribute('aria-expanded', 'true');
        if (typeof options.onOpen === 'function') options.onOpen();
      } else {
        closeOne(root);
      }
    });

    return {
      close: () => closeOne(root),
    };
  }

  app.customDropdown = { attach, closeAll };
})(window);
