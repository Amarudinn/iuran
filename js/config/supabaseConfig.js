'use strict';

/**
 * Konfigurasi Koneksi Supabase (Membaca dari window.__ZERO_FIVE_ENV__ hasil scripts/build-env.js).
 * File ini aman di-push ke GitHub karena tidak mengandung URL maupun key hardcoded.
 */
(function initSupabaseConfig(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const env = global.__ZERO_FIVE_ENV__ || {};

  const SUPABASE_URL = String(env.SUPABASE_URL || '').trim();
  const SUPABASE_PUBLISHABLE_KEY = String(env.SUPABASE_PUBLISHABLE_KEY || '').trim();

  function isConfigured() {
    if (SUPABASE_PUBLISHABLE_KEY.startsWith('sb_secret_')) return false;
    return SUPABASE_URL.startsWith('https://') && SUPABASE_PUBLISHABLE_KEY.length > 20;
  }

  app.config = {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    isSupabaseConfigured: isConfigured,
  };
})(window);
