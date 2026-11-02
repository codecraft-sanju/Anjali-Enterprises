'use strict';
      /* ---------- Icons & helpers ---------- */
      const PATHS = {
        dashboard:
          '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        receipt:
          '<path d="M4 3h16v18l-4-2-4 2-4-2-4 2z"/><path d="M8 8h8M8 12h8M8 16h4"/>',
        history:
          '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
        users:
          '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        calendar:
          '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
        wallet:
          '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h14M15 15h6"/>',
        trending: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
        pending: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
        download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
        database:
          '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 2 18 2 18 0V5M3 12c0 2 18 2 18 0"/>',
        upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
        printer:
          '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/>',
        save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8"/>',
        whatsapp:
          '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1 1 21 11.5z"/>',
        edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        trash:
          '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
        x: '<path d="M18 6 6 18M6 6l12 12"/>',
        'arrow-right': '<path d="M5 12h14m-6-6 6 6-6 6"/>',
        'arrow-left': '<path d="M19 12H5m6-6-6 6 6 6"/>',
        copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
        credit:
          '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
      };
      function icon(name) {
        return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.receipt}</svg>`;
      }
      function hydrateIcons(root = document) {
        root
          .querySelectorAll('[data-icon]')
          .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
      }
      function escapeHtml(v) {
        return String(v ?? '').replace(
          /[&<>"']/g,
          (c) =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;',
            })[c],
        );
      }
      function round2(n) {
        return Math.round((n + Number.EPSILON) * 100) / 100;
      }
      function finite(n) {
        return Number.isFinite(Number(n)) ? Number(n) : 0;
      }
      function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
      }
      function money(n) {
        return (
          '₹' +
          finite(n).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      }
      function dateLocal(d = new Date()) {
        return d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
      function formatDate(d) {
        if (!d) return '—';
        const s = String(d);
        return /^\d{4}-\d{2}-\d{2}$/.test(s)
          ? s.split('-').reverse().join('/')
          : s.slice(0, 32);
      }
      function notify(msg, error = false) {
        const el = $('toast');
        el.textContent = msg;
        el.classList.toggle('error', error);
        el.classList.remove('hidden');
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => el.classList.add('hidden'), 3600);
      }
      function uid() {
        return (
          globalThis.crypto?.randomUUID?.() ||
          `bill-${Date.now()}-${Math.random().toString(36).slice(2)}`
        );
      }
      function byNewest(a, b) {
        return String(b.createdAt || '').localeCompare(
          String(a.createdAt || ''),
        );
      }
