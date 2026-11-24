'use strict';

/**
 * PWA Service Worker registrar & Install Prompt Banner.
 * Shows at most ONCE per 24 hours (1 hari) when opened; if dismissed or ignored,
 * waits a full 24 hours before showing again. Never shows if already installed.
 */
(function initPwaInstall(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { toast } = app;

  const STORAGE_KEY = 'zero_five_pwa_prompt_ts';
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  let deferredPrompt = null;
  let hasShownThisSession = false;

  function isStandalone() {
    const mediaStandalone =
      typeof global.matchMedia === 'function' &&
      global.matchMedia('(display-mode: standalone)').matches;
    return Boolean(mediaStandalone || global.navigator.standalone === true);
  }

  function isIosSafari() {
    const ua = String(global.navigator.userAgent || '');
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    return isIos && isSafari;
  }

  function getLastPromptTimestamp() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch (_err) {
      return 0;
    }
  }

  function markPromptTimestamp(nowMs = Date.now()) {
    try {
      global.localStorage.setItem(STORAGE_KEY, String(nowMs));
    } catch (_err) {
      // Ignore restricted storage errors
    }
  }

  function canShowToday(nowMs = Date.now()) {
    if (isStandalone() || hasShownThisSession) return false;
    const lastTs = getLastPromptTimestamp();
    if (lastTs === 0) return true;
    return nowMs - lastTs >= ONE_DAY_MS;
  }

  function hideBanner() {
    document.getElementById('pwa-install-banner')?.classList.add('is-hidden');
  }

  function showBanner(mode) {
    if (!canShowToday()) return;

    const banner = document.getElementById('pwa-install-banner');
    const descEl = document.getElementById('pwa-install-desc');
    const actionBtn = document.getElementById('pwa-install-action');
    if (!banner || !descEl || !actionBtn) return;

    if (mode === 'ios') {
      descEl.textContent =
        'Ketuk ikon Bagikan lalu pilih "Tambah ke Layar Utama" untuk memasang aplikasi.';
      actionBtn.textContent = 'Mengerti';
      actionBtn.setAttribute('data-pwa-mode', 'ios');
    } else {
      descEl.textContent = 'Pasang di layar utama HP agar lebih cepat dibuka kapan saja.';
      actionBtn.innerHTML =
        '<i class="ph-bold ph-download-simple" aria-hidden="true"></i><span>Install</span>';
      actionBtn.setAttribute('data-pwa-mode', 'prompt');
    }

    hasShownThisSession = true;
    // Record immediately on display so ignoring/reloading waits 24 hours
    markPromptTimestamp();
    banner.classList.remove('is-hidden');
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in global.navigator)) return;
    const protocol = global.location && global.location.protocol;
    if (protocol !== 'https:' && global.location.hostname !== 'localhost' && global.location.hostname !== '127.0.0.1') {
      return;
    }
    global.navigator.serviceWorker.register('./sw.js').catch(() => {
      // Non-fatal if SW registration is unavailable
    });
  }

  function init() {
    registerServiceWorker();
    if (isStandalone()) return;

    const dismissBtn = document.getElementById('pwa-install-dismiss');
    const closeBtn = document.getElementById('pwa-install-close');
    const actionBtn = document.getElementById('pwa-install-action');

    const handleDismiss = () => {
      markPromptTimestamp();
      hideBanner();
    };

    dismissBtn?.addEventListener('click', handleDismiss);
    closeBtn?.addEventListener('click', handleDismiss);

    actionBtn?.addEventListener('click', async () => {
      const mode = actionBtn.getAttribute('data-pwa-mode');
      if (mode === 'ios' || !deferredPrompt) {
        handleDismiss();
        return;
      }

      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      hideBanner();
      markPromptTimestamp();

      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          toast.showToast('ZERO FIVE sedang dipasang di ponsel Anda.');
        }
      } catch (_err) {
        // Ignore cancelled prompt errors
      }
    });

    global.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (canShowToday()) {
        global.setTimeout(() => showBanner('prompt'), 800);
      }
    });

    global.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      hideBanner();
      toast.showToast('ZERO FIVE berhasil dipasang di ponsel.');
    });

    // iOS Safari fallback (does not fire beforeinstallprompt)
    if (isIosSafari() && canShowToday()) {
      global.setTimeout(() => showBanner('ios'), 1200);
    }
  }

  app.pwaInstall = {
    init,
    canShowToday,
    ONE_DAY_MS,
    STORAGE_KEY,
  };
})(window);
