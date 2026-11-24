'use strict';

/**
 * Structured in-memory dummy dataset designed to mirror future Supabase tables:
 * - residents (id, name, is_active, is_lunas, created_at) -> Privacy-first: name only
 * - payments (id, paid_date, resident_id, amount, paid_at) -> Free collection dates (e.g., Hari 11, 21, 29)
 */
(function initMockData(global) {
  const app = (global.IuranApp = global.IuranApp || {});

  // TODO: ganti dengan Supabase Auth untuk autentikasi pengurus produksi
  const DEMO_ADMIN_PIN = '1234';

  // TODO: ganti dengan query Supabase -> supabase.from('residents').select('id, name, is_active, is_lunas, created_at')
  const RESIDENT_NAMES = [
    'Adi Nugroho',
    'Agus Setiawan',
    'Ahmad Fauzi',
    'Bambang Wijaya',
    'Budi Santoso',
    'Cahyo Utomo',
    'Dedi Kurniawan',
    'Dewi Lestari',
    'Eko Prasetyo',
    'Fajar Hidayat',
    'Gunawan Wibowo',
    'Hendra Saputra',
    'Indra Permana',
    'Joko Susilo',
    'Kartika Sari',
    'Lukman Hakim',
    'Mulyadi Rahman',
    'Nadia Putri',
    'Prabowo Kusuma',
    'Rahmat Hidayat',
    'Rina Marlina',
    'Slamet Riyadi',
    'Surya Pratama',
    'Wahyu Ramadhan',
    'Yusuf Maulana',
  ];

  // Contoh warga yang sudah diberi label "Lunas" oleh pengurus
  const INITIAL_LUNAS_INDEXES = new Set([0, 4, 7, 11, 20]);

  const SEED_RESIDENTS = RESIDENT_NAMES.map((name, idx) => ({
    id: `res-${String(idx + 1).padStart(2, '0')}`,
    name,
    isActive: true,
    isLunas: INITIAL_LUNAS_INDEXES.has(idx),
    createdAt: '2026-10-15T08:00:00+07:00',
  }));

  const AMOUNT_POOL = [10000, 15000, 20000, 25000, 30000, 50000, 20000, 15000, 25000, 40000];

  /**
   * Build deterministic seed payments for a flexible collection date.
   * @param {string} paidDate YYYY-MM-DD
   * @param {number[]} paidIndexes Zero-based resident indexes who paid on this day
   * @param {number} seedShift Offset into AMOUNT_POOL
   */
  function buildDayPayments(paidDate, paidIndexes, seedShift) {
    return paidIndexes.map((idx) => {
      const resident = SEED_RESIDENTS[idx];
      const amount = AMOUNT_POOL[(idx + seedShift) % AMOUNT_POOL.length];
      const hour = String(8 + (idx % 10)).padStart(2, '0');
      const minute = String((idx * 7) % 60).padStart(2, '0');
      return {
        id: `pay-${paidDate}-${resident.id}`,
        paidDate,
        residentId: resident.id,
        amount,
        paidAt: `${paidDate}T${hour}:${minute}:00+07:00`,
      };
    });
  }

  // TODO: ganti dengan query Supabase -> supabase.from('payments').select('*').order('paid_at', { ascending: false })
  // Hari penarikan bebas sesuai jadwal petugas (contoh: Hari 11, Hari 21, Hari 29)
  const SEED_PAYMENTS = [
    ...buildDayPayments('2026-11-11', [0, 1, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 17, 19, 20, 21, 22], 0),
    ...buildDayPayments('2026-11-21', [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 18, 20, 22, 24], 3),
    ...buildDayPayments('2026-11-29', [0, 1, 4, 6, 7, 8, 11, 15, 19, 20, 21], 5),
  ];
  // Catatan: index 13 (Joko Susilo) & index 23 (Wahyu Ramadhan) belum bayar di semua hari sebagai contoh status Belum Bayar

  function createInitialDataset() {
    return {
      residents: SEED_RESIDENTS.map((r) => ({ ...r })),
      payments: SEED_PAYMENTS.map((p) => ({ ...p })),
    };
  }

  app.mockData = {
    DEMO_ADMIN_PIN,
    createInitialDataset,
  };
})(window);
