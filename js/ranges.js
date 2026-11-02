'use strict';
      /* ---------- Date ranges ---------- */
      function billDate(b) {
        const m = String(b.date || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
        const d = new Date(b.createdAt);
        return Number.isNaN(d.getTime()) ? new Date(0) : d;
      }
      function inRange(b, r) {
        if (r === 'all') return true;
        const d = billDate(b),
          n = new Date(),
          y = n.getFullYear(),
          m = n.getMonth(),
          sod = new Date(y, m, n.getDate());
        if (r === 'today') return d >= sod;
        if (r === '7d') return d >= new Date(sod.getTime() - 6 * 864e5);
        if (r === 'month') return d >= new Date(y, m, 1);
        if (r === 'last')
          return d >= new Date(y, m - 1, 1) && d < new Date(y, m, 1);
        return true;
      }
      function fillRanges() {
        document.querySelectorAll('.range-select').forEach((sel) => {
          sel.innerHTML = Object.entries(RANGES)
            .map(([k, v]) => `<option value="${k}">${v}</option>`)
            .join('');
          sel.value =
            sel.dataset.range === 'dash' ? state.dashRange : state.histRange;
        });
      }
