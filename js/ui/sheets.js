'use strict';

/**
 * Bottom Sheet controllers for Resident Payment Detail Card & Admin Backup Card.
 */
(function initSheets(global) {
  const app = (global.IuranApp = global.IuranApp || {});
  const { store, formatters, backupExporter, toast } = app;

  let backupScope = 'all'; // 'all' | 'today'

  function buildStatusBadge(status) {
    if (status === 'lunas') {
      return '<span class="badge badge-lunas"><i class="ph-fill ph-seal-check" aria-hidden="true"></i>Lunas</span>';
    }
    if (status === 'paid') {
      return '<span class="badge badge-paid"><i class="ph-fill ph-check-circle" aria-hidden="true"></i>Sudah Bayar</span>';
    }
    return '<span class="badge badge-unpaid"><i class="ph ph-clock" aria-hidden="true"></i>Belum Bayar</span>';
  }

  /**
   * Open card displaying all dates and amounts paid by a specific resident.
   * @param {string} residentId
   */
  function openResidentDetail(residentId) {
    const modal = document.getElementById('resident-detail-modal');
    const nameEl = document.getElementById('detail-resident-name');
    const badgeEl = document.getElementById('detail-resident-badge');
    const totalEl = document.getElementById('detail-resident-total');
    const listEl = document.getElementById('detail-payment-list');
    if (!modal || !nameEl || !badgeEl || !totalEl || !listEl) return;

    const summary = store
      .getResidentSummaries('all')
      .find((s) => s.residentId === residentId);
    if (!summary) return;

    const payments = store
      .getPaymentHistory('all')
      .filter((p) => p.residentId === residentId);

    nameEl.textContent = summary.name;
    badgeEl.innerHTML = buildStatusBadge(summary.status);
    totalEl.textContent = formatters.formatRupiah(summary.totalAmount);

    if (payments.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding: 22px 12px;">
          <i class="ph ph-receipt" aria-hidden="true"></i>
          <p>Belum ada riwayat setoran.</p>
        </div>`;
    } else {
      listEl.innerHTML = payments
        .map(
          (p) => `
          <div class="detail-payment-item">
            <span class="detail-payment-date">
              <i class="ph-bold ph-calendar-blank" aria-hidden="true"></i>
              ${formatters.escapeHtml(formatters.formatFullDayDate(p.paidDate))}
            </span>
            <strong class="tabular-nums">${formatters.formatRupiah(p.amount)}</strong>
          </div>`
        )
        .join('');
    }

    modal.classList.remove('is-hidden');
  }

  function closeResidentDetail() {
    document.getElementById('resident-detail-modal')?.classList.add('is-hidden');
  }

  function renderBackupPreview() {
    const snapshot = backupExporter.buildSnapshot(backupScope);
    const previewEl = document.getElementById('backup-scope-preview');
    if (previewEl) {
      previewEl.textContent = `${snapshot.rows.length} catatan | ${formatters.formatRupiah(snapshot.totalIncome)}`;
    }
    document.querySelectorAll('[data-backup-scope]').forEach((btn) => {
      const active = btn.getAttribute('data-backup-scope') === backupScope;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function openBackupModal() {
    const modal = document.getElementById('backup-modal');
    if (!modal) return;
    backupScope = 'all';
    renderBackupPreview();
    modal.classList.remove('is-hidden');
  }

  function closeBackupModal() {
    document.getElementById('backup-modal')?.classList.add('is-hidden');
  }

  function bindSheetEvents() {
    const detailModal = document.getElementById('resident-detail-modal');
    document.getElementById('detail-close-btn')?.addEventListener('click', closeResidentDetail);
    detailModal?.addEventListener('click', (e) => {
      if (e.target === detailModal) closeResidentDetail();
    });

    const backupModal = document.getElementById('backup-modal');
    document.getElementById('backup-close-btn')?.addEventListener('click', closeBackupModal);
    backupModal?.addEventListener('click', (e) => {
      if (e.target === backupModal) closeBackupModal();
    });

    document.querySelectorAll('[data-backup-scope]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-backup-scope');
        if (next === 'all' || next === 'today') {
          backupScope = next;
          renderBackupPreview();
        }
      });
    });

    document.querySelectorAll('[data-backup-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fmt = btn.getAttribute('data-backup-format');
        if (!fmt) return;
        const result = backupExporter.downloadBackup(backupScope, fmt);
        closeBackupModal();
        toast.showToast(`Backup berhasil disimpan (${result.filename}).`);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeResidentDetail();
        closeBackupModal();
      }
    });
  }

  app.sheets = {
    openResidentDetail,
    closeResidentDetail,
    openBackupModal,
    closeBackupModal,
    bindSheetEvents,
  };
})(window);
