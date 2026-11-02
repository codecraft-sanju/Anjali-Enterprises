'use strict';
      /* ---------- Export / backup ---------- */
      function downloadFile(name, body, type) {
        const url = URL.createObjectURL(new Blob([body], { type })),
          a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      function stamp() {
        return new Date().toISOString().slice(0, 10);
      }
      function backup() {
        downloadFile(
          `anjali-enterprises-backup-${stamp()}.json`,
          JSON.stringify(
            {
              app: 'Anjali Enterprises Billing',
              schemaVersion: 3,
              exportedAt: new Date().toISOString(),
              bills: BILLS,
            },
            null,
            2,
          ),
          'application/json',
        );
        notify('JSON backup downloaded. Keep it somewhere safe.');
      }
      function csv() {
        const bills = BILLS.filter((b) => inRange(b, state.histRange)).sort(
          byNewest,
        );
        if (!bills.length) {
          notify('No invoices in the selected range.', true);
          return;
        }
        const cell = (v) => {
          let s = String(v ?? '');
          if (/^[\s\u0000-\u001f]*[=+\-@]/.test(s)) s = "'" + s;
          return '"' + s.replace(/"/g, '""') + '"';
        };
        const rows = [
          [
            'Bill No',
            'Date',
            'Customer',
            'Phone',
            'Subtotal',
            'Discount',
            'Global GST %',
            'Total GST Amt',
            'Total',
            'Received',
            'Pending',
            'Notes',
          ],
        ];
        bills.forEach((b) =>
          rows.push([
            b.billNo,
            b.date,
            b.name,
            b.phone,
            b.subTotal,
            b.discountAmt,
            b.globalGstPct || 0,
            b.gstAmt,
            b.total,
            b.received,
            b.pending,
            b.notes,
          ]),
        );
        downloadFile(
          `anjali-bills-${state.histRange}-${stamp()}.csv`,
          '\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\r\n'),
          'text/csv;charset=utf-8',
        );
        notify(
          `Exported ${bills.length} invoices (${RANGES[state.histRange]}).`,
        );
      }
      function restore(file) {
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
          notify('Backup exceeds the 20 MB limit.', true);
          return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const parsed = JSON.parse(reader.result),
              raw = Array.isArray(parsed) ? parsed : parsed?.bills;
            if (!Array.isArray(raw) || raw.length > 50000)
              throw Error('Invalid structure');
            const bills = raw.map(normalizeBill);
            if (
              bills.some((b) => !b) ||
              new Set(bills.map((b) => b.id)).size !== bills.length ||
              new Set(bills.map((b) => b.billNo)).size !== bills.length
            )
              throw Error('Invalid or duplicate invoices');
            if (
              !confirm(
                `Restore ${bills.length} invoices?\n\nThis REPLACES all existing bills. Export a backup first if needed.`,
              )
            )
              return;
            await DB.replace(bills);
            BILLS = bills.sort(byNewest);
            resetInvoice();
            announceChange();
            refreshAll();
            notify(`Restored ${bills.length} invoices.`);
          } catch (e) {
            console.error(e);
            notify('Invalid backup. No current records were changed.', true);
          }
        };
        reader.onerror = () => notify('Could not read backup file.', true);
        reader.readAsText(file);
      }
