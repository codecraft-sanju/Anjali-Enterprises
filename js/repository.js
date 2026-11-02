'use strict';
      /* ---------- Data layer ---------- */
      const readBills = () => BILLS;
      async function loadBills() {
        BILLS = (await DB.all())
          .map(normalizeBill)
          .filter(Boolean)
          .sort(byNewest);
        let migrated = false;
        try {
          migrated = localStorage.getItem(MIGRATED_KEY) === '1';
        } catch (e) {}
        if (!BILLS.length && !migrated) {
          // one-time move from the old localStorage store
          try {
            const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
            if (Array.isArray(legacy) && legacy.length) {
              const list = legacy
                .map(normalizeBill)
                .filter(Boolean)
                .sort(byNewest);
              await DB.replace(list);
              BILLS = list;
              notify(`${list.length} invoices moved to the new database.`);
            }
            localStorage.setItem(MIGRATED_KEY, '1');
          } catch (e) {
            console.error('Migration failed', e);
          }
        }
      }
      function announceChange() {
        try {
          channel?.postMessage('changed');
        } catch (e) {}
      }
      function nextBillNumber(bills) {
        const highest = bills.reduce((n, b) => {
          const m = String(b.billNo || '').match(/(\d+)$/);
          return Math.max(n, m ? Number(m[1]) : 0);
        }, 0);
        let old = 0;
        try {
          old = Number(localStorage.getItem(COUNTER_KEY)) || 0;
        } catch (e) {}
        const next = Math.max(old, highest) + 1;
        return {
          number: `AE-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`,
          counter: next,
        };
      }
