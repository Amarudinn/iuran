'use strict';

/**
 * Application bootstrapper, theme init, PWA init, async Supabase hydration, and view switcher.
 */
(function initMain(global) {
  const app = (global.IuranApp = global.IuranApp || {});

  function renderApp() {
    const { store, publicView, adminView } = app;
    const state = store.getState();

    const publicSection = document.getElementById('public-view');
    const adminSection = document.getElementById('admin-view');
    const adminBtnIcon = document.querySelector('#open-admin-btn i');

    const isAdmin = state.activeView === 'admin' && state.isAdminAuthenticated;
    publicSection?.classList.toggle('is-hidden', isAdmin);
    adminSection?.classList.toggle('is-hidden', !isAdmin);

    if (adminBtnIcon) {
      adminBtnIcon.className = state.isAdminAuthenticated ? 'ph ph-lock-open' : 'ph ph-lock-key';
    }

    publicView.render();
    if (isAdmin) {
      adminView.render();
    }
  }

  function bindNavigation() {
    const { store, modals, toast } = app;

    document.getElementById('open-admin-btn')?.addEventListener('click', () => {
      if (store.getState().isAdminAuthenticated) {
        store.openView('admin');
      } else {
        modals.openPinModal();
      }
    });

    document.getElementById('back-to-public-btn')?.addEventListener('click', () => {
      store.openView('public');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('lock-admin-btn')?.addEventListener('click', () => {
      store.lockAdminSession();
      toast.showToast('Sesi pengurus dikunci.');
    });
  }

  async function bootstrap() {
    const { store, theme, pwaInstall, publicView, adminView, modals, sheets, backdateSheet, toast } = app;

    theme.init();
    pwaInstall.init();
    publicView.bindEvents();
    adminView.bindEvents();
    modals.bindModalEvents();
    sheets.bindSheetEvents();
    backdateSheet.bindEvents();
    bindNavigation();

    store.subscribe(renderApp);
    renderApp();

    const res = await store.init();
    if (res && res.error) {
      toast.showToast(res.error, 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bootstrap();
    });
  } else {
    bootstrap();
  }
})(window);
