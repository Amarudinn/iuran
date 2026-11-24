'use strict';

/**
 * Application bootstrapper, theme init, and view switcher (Public <-> Collector Admin).
 */
(function initMain(global) {
  const app = (global.IuranApp = global.IuranApp || {});

  function renderApp() {
    const { store, publicView, adminView } = app;
    const state = store.getState();

    const publicSection = document.getElementById('public-view');
    const adminSection = document.getElementById('admin-view');

    const isAdmin = state.activeView === 'admin' && state.isAdminAuthenticated;
    publicSection?.classList.toggle('is-hidden', isAdmin);
    adminSection?.classList.toggle('is-hidden', !isAdmin);

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

  function bootstrap() {
    const { store, theme, publicView, adminView, modals } = app;

    theme.init();
    publicView.bindEvents();
    adminView.bindEvents();
    modals.bindModalEvents();
    bindNavigation();

    store.subscribe(renderApp);
    renderApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})(window);
