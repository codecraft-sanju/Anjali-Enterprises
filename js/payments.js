'use strict';
      /* ---------- Actions ---------- */
      const findBill = (id) => BILLS.find((b) => b.id === id);
      function editBill(id) {
        const b = findBill(id);
        if (!b) {
          notify('Invoice not found.', true);
          return;
        }
        resetInvoice();
        state.editingId = b.id;
        $('editorTitle').textContent = `Editing ${b.billNo}`;
        $('editorSubtitle').textContent =
          'Changes keep the original invoice number';
        $('invoiceHeading').textContent = `Edit bill ${b.billNo}`;
        $('editingTag').classList.remove('hidden');
        $('customerName').value = b.name === 'Walk-in' ? '' : b.name;
        $('customerPhone').value = b.phone;
        setDiscType(b.discountType);
        $('discountValue').value = b.discountValue;
        $('globalGst').value = b.globalGstPct || '0';
        $('amountReceived').value = b.received;
        $('invoiceNotes').value = b.notes;
        $('itemRows').replaceChildren();
        b.items.forEach((i) => addRow(i.name, i.qty, i.price, i.gst));
        recalculate();
        showView('invoice');
      }
      async function deleteBill(id) {
        const b = findBill(id);
        if (!b) return;
        if (
          !confirm(
            `Permanently delete invoice ${b.billNo}?\n\nThis cannot be undone unless you have a backup.`,
          )
        )
          return;
        try {
          await DB.del(id);
        } catch (e) {
          notify('Could not delete the invoice.', true);
          return;
        }
        BILLS = BILLS.filter((x) => x.id !== id);
        if (state.editingId === id) resetInvoice();
        announceChange();
        refreshAll();
        notify(`Deleted invoice ${b.billNo}.`);
      }
      function openPaymentDialog(id) {
        const b = findBill(id);
        if (!b || b.pending <= 0) {
          notify('No pending balance for this invoice.', true);
          return;
        }
        state.paymentId = b.id;
        state.payPhone = null;
        showPayDialog(`${b.name} · ${b.billNo}`, b.pending);
      }
      function openCustomerPayment(phone) {
        const c = customerSummaries().find((x) => x.phone === phone);
        if (!c || c.pending <= 0) {
          notify('No outstanding balance for this customer.', true);
          return;
        }
        state.paymentId = null;
        state.payPhone = phone;
        showPayDialog(
          `${c.name} · ${c.phone}`,
          c.pending,
          'Applied to the oldest unpaid bills first. ',
        );
      }
      function showPayDialog(title, pending, note = '') {
        $('dialogCustomer').textContent = title;
        $('dialogPending').textContent = `${note}Remaining: ${money(pending)}`;
        $('collectAmount').value = pending.toFixed(2);
        $('collectAmount').max = pending.toFixed(2);
        $('collectMethod').value = 'Cash';
        $('paymentDialog').showModal();
        $('collectAmount').focus();
      }
      function applyPayment(b, amount, method) {
        b.received = round2(b.received + amount);
        b.pending = round2(Math.max(0, b.total - b.received));
        b.updatedAt = new Date().toISOString();
        b.payments.push({ amount, method, at: b.updatedAt });
      }
      async function recordPayment(ev) {
        ev.preventDefault();
        const value = $('collectAmount').value,
          amount = round2(Number(value)),
          method = $('collectMethod').value;
        let targets;
        if (state.payPhone) {
          targets = BILLS.filter(
            (b) => b.phone === state.payPhone && b.pending > 0,
          ).sort((a, b) =>
            String(a.createdAt).localeCompare(String(b.createdAt)),
          );
        } else {
          const b = findBill(state.paymentId);
          targets = b ? [b] : [];
        }
        const due = round2(targets.reduce((s, b) => s + b.pending, 0));
        if (!targets.length) {
          $('paymentDialog').close();
          notify('Nothing to collect.', true);
          return;
        }
        if (!value || !Number.isFinite(amount) || amount <= 0 || amount > due) {
          notify(`Enter an amount up to ${money(due)}.`, true);
          return;
        }
        let left = amount;
        const changed = [];
        for (const b of targets) {
          if (left <= 0) break;
          const take = round2(Math.min(left, b.pending));
          applyPayment(b, take, method);
          left = round2(left - take);
          changed.push(b);
        }
        try {
          await DB.put(changed);
        } catch (e) {
          notify('Could not save the payment.', true);
          await loadBills();
          refreshAll();
          return;
        }
        const editing =
          state.editingId && changed.some((b) => b.id === state.editingId)
            ? state.editingId
            : null;
        $('paymentDialog').close();
        announceChange();
        refreshAll();
        notify(`${money(amount)} payment recorded.`);
        if (editing) editBill(editing);
      }
      function remindCustomer(phone) {
        const c = customerSummaries().find((x) => x.phone === phone);
        if (!c || c.pending <= 0) {
          notify('No outstanding balance.', true);
          return;
        }
        openWhatsApp(
          phone,
          `Namaste ${c.name},\nAnjali Enterprises ki taraf se reminder: aapka total ${money(c.pending)} baaki hai (${c.count} bill${c.count === 1 ? '' : 's'}).\nKripya jaldi payment kar dein. Dhanyavaad!\n9022596284`,
        );
      }

      const PRINT_CSS =
        '@page{size:A4;margin:13mm}*{box-sizing:border-box}body{margin:0;font:11px/1.5 Arial,sans-serif;color:#111827}.top{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #334155;padding-bottom:16px}.co{font-size:24px;font-weight:900;margin-bottom:5px}.det{font-size:11px;line-height:1.55;color:#475569}.ttl{text-align:right}.ttl strong{font-size:19px;display:block}.ttl span{display:block;margin-top:5px;color:#475569}.client{display:flex;justify-content:space-between;gap:20px;padding:20px 0}.st{font-weight:900;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:1px;margin-bottom:5px}.client strong{font-size:13px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:10px 8px;border-bottom:1px solid #cbd5e1}td{padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}tr{break-inside:avoid}.r{text-align:right!important}.tot{width:280px;max-width:100%;margin:20px 0 0 auto}.pr{display:flex;justify-content:space-between;padding:6px 0;gap:15px}.grand{font-size:15px;font-weight:900;border-top:2px solid #94a3b8;border-bottom:1px solid #cbd5e1;padding:10px 0;margin-top:8px}.notes{padding:20px 0;max-width:500px;white-space:pre-wrap;overflow-wrap:anywhere}.foot{border-top:1px solid #cbd5e1;padding-top:15px;margin-top:44px;text-align:center;font-size:10px;color:#64748b}';
      function printBill(b) {
        const rows = b.items
          .map(
            (i, n) =>
              `<tr><td>${n + 1}</td><td>${escapeHtml(i.name)}</td><td class="r">${escapeHtml(i.qty)}</td><td class="r">${money(i.price)}</td><td class="r">${escapeHtml(i.gst)}%</td><td class="r">${money(i.total)}</td></tr>`,
          )
          .join('');
        const body = `<div class="top"><div><div class="co">ANJALI ENTERPRISES</div><div class="det">Electrical Supply Store · Prop. Mahendra Choudhary<br>Shop No. 6, Achole Ashok Nagar, Opp. Dwarka Hotel<br>Nallasopara (E), Maharashtra – 401209<br>Mobile: 9022596284</div></div><div class="ttl"><strong>SALES INVOICE</strong><span>${escapeHtml(b.billNo || 'DRAFT')}</span><span>Date: ${escapeHtml(formatDate(b.date || dateLocal()))}</span></div></div><div class="client"><div><div class="st">Billed to</div><strong>${escapeHtml(b.name)}</strong><div>${escapeHtml(b.phone || 'Walk-in')}</div></div><div style="text-align:right"><div class="st">Payment status</div><strong>${b.pending > 0 ? 'PENDING / PARTIALLY PAID' : 'PAID'}</strong></div></div><table><thead><tr><th>#</th><th>Item description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Item GST</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="tot"><div class="pr"><span>Subtotal</span><strong>${money(b.subTotal)}</strong></div>${b.discountAmt > 0 ? `<div class="pr"><span>${escapeHtml(discLabel(b))}</span><strong>−${money(b.discountAmt)}</strong></div>` : ''}${b.globalGstPct > 0 ? `<div class="pr"><span>Bill GST (${b.globalGstPct}%)</span><strong>Included Below</strong></div>` : ''}${b.gstAmt > 0 ? `<div class="pr"><span>Total GST</span><strong>+${money(b.gstAmt)}</strong></div>` : ''}<div class="pr grand"><span>Grand total</span><span>${money(b.total)}</span></div><div class="pr"><span>Amount received</span><strong>${money(b.received)}</strong></div><div class="pr"><strong>Balance due</strong><strong>${money(b.pending)}</strong></div></div>${b.notes ? `<div class="notes"><div class="st">Notes</div>${escapeHtml(b.notes)}</div>` : ''}<div class="foot">Thank you for your business · Anjali Enterprises · 9022596284</div>`;
        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText =
          'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
        frame.onload = () =>
          setTimeout(() => {
            try {
              frame.contentWindow.focus();
              frame.contentWindow.print();
            } catch (e) {
              notify('Could not open the print dialog.', true);
            }
            setTimeout(() => frame.remove(), 60000);
          }, 200);
        frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(b.billNo || 'Invoice')}</title><style>${PRINT_CSS}</style></head><body>${body}<\/body><\/html>`;
        document.body.appendChild(frame);
      }
      function printDraft() {
        const d = collectDraft();
        if (d.error) {
          notify(d.error, true);
          return;
        }
        const old = state.editingId ? findBill(state.editingId) : null;
        printBill({
          ...d,
          billNo: old?.billNo || 'DRAFT',
          date: old?.date || dateLocal(),
        });
      }
