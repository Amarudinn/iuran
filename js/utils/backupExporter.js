'use strict';

/**
 * Backup & export generator supporting Excel (.csv with UTF-8 BOM), Markdown (.md), and Text (.txt).
 */
(function initBackupExporter(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { store, formatters } = app;

  function statusLabel(status) {
    if (status === 'lunas') return 'Lunas';
    if (status === 'paid') return 'Sudah Bayar';
    return 'Belum Bayar';
  }

  /**
   * Collect structured snapshot for either "all" (Semua) or "today" (Hari Ini).
   * @param {'all' | 'today'} scope
   */
  function buildSnapshot(scope) {
    const todayIso = formatters.getTodayIsoDate();
    const dateFilter = scope === 'today' ? todayIso : 'all';
    const scopeTitle =
      scope === 'today'
        ? `Hari Ini (${formatters.formatFullDayDate(todayIso)})`
        : 'Semua Data';

    const history = store.getPaymentHistory(dateFilter);
    const summaries = store.getResidentSummaries(dateFilter);
    const statusById = new Map(summaries.map((s) => [s.residentId, statusLabel(s.status)]));
    const totalIncome = history.reduce((sum, item) => sum + item.amount, 0);

    const rows = history.map((item, idx) => ({
      no: idx + 1,
      name: item.residentName,
      date: formatters.formatFullDayDate(item.paidDate),
      amount: item.amount,
      amountFormatted: formatters.formatRupiah(item.amount),
      status: statusById.get(item.residentId) || 'Sudah Bayar',
    }));

    return { scope, scopeTitle, todayIso, totalIncome, rows };
  }

  function escapeCsvCell(value) {
    const str = String(value ?? '');
    if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  function toExcelCsv(snapshot) {
    const lines = [
      ['ZERO FIVE - Backup Pemasukan', snapshot.scopeTitle].map(escapeCsvCell).join(','),
      ['Total Pemasukan', snapshot.totalIncome].map(escapeCsvCell).join(','),
      '',
      ['No', 'Nama Warga', 'Hari / Tanggal', 'Nominal (Rp)', 'Status'].join(','),
      ...snapshot.rows.map((r) =>
        [r.no, r.name, r.date, r.amount, r.status].map(escapeCsvCell).join(',')
      ),
    ];
    return `\uFEFF${lines.join('\r\n')}`;
  }

  function toMarkdown(snapshot) {
    const lines = [
      '# ZERO FIVE — Backup Pemasukan Iuran',
      '',
      `- **Cakupan:** ${snapshot.scopeTitle}`,
      `- **Total Pemasukan:** ${formatters.formatRupiah(snapshot.totalIncome)}`,
      `- **Jumlah Catatan:** ${snapshot.rows.length}`,
      '',
      '| No | Nama Warga | Hari / Tanggal | Nominal | Status |',
      '|---:|---|---|---:|---|',
    ];
    if (snapshot.rows.length === 0) {
      lines.push('| - | Belum ada setoran | - | Rp 0 | - |');
    } else {
      snapshot.rows.forEach((r) => {
        lines.push(`| ${r.no} | ${r.name} | ${r.date} | ${r.amountFormatted} | ${r.status} |`);
      });
    }
    return lines.join('\n');
  }

  function toPlainText(snapshot) {
    const lines = [
      'ZERO FIVE — BACKUP PEMASUKAN IURAN',
      `Cakupan : ${snapshot.scopeTitle}`,
      `Total   : ${formatters.formatRupiah(snapshot.totalIncome)}`,
      `Catatan : ${snapshot.rows.length} transaksi`,
      '----------------------------------------',
    ];
    if (snapshot.rows.length === 0) {
      lines.push('Belum ada data setoran pada cakupan ini.');
    } else {
      snapshot.rows.forEach((r) => {
        lines.push(`${r.no}. ${r.name} | ${r.date} | ${r.amountFormatted} (${r.status})`);
      });
    }
    return lines.join('\n');
  }

  /**
   * Generate and download backup file in selected format.
   * @param {'all' | 'today'} scope
   * @param {'excel' | 'md' | 'txt'} format
   */
  function downloadBackup(scope, format) {
    const snapshot = buildSnapshot(scope);
    const slug = scope === 'today' ? 'hari-ini' : 'semua';

    let content = '';
    let mime = 'text/plain;charset=utf-8';
    let ext = 'txt';

    if (format === 'excel') {
      content = toExcelCsv(snapshot);
      mime = 'text/csv;charset=utf-8';
      ext = 'csv';
    } else if (format === 'md') {
      content = toMarkdown(snapshot);
      mime = 'text/markdown;charset=utf-8';
      ext = 'md';
    } else {
      content = toPlainText(snapshot);
    }

    const filename = `zerofive-backup-${slug}-${snapshot.todayIso}.${ext}`;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    global.setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { filename, count: snapshot.rows.length };
  }

  app.backupExporter = {
    buildSnapshot,
    toExcelCsv,
    toMarkdown,
    toPlainText,
    downloadBackup,
  };
})(window);
