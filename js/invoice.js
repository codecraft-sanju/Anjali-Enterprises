'use strict';
      /* ---------- Views ---------- */
      const VIEWS = ['dashboard', 'invoice', 'history', 'customers'];
      function showView(view) {
        if (!VIEWS.includes(view)) return;
        state.view = view;
        document
          .querySelectorAll('.screen')
          .forEach((el) =>
            el.classList.toggle('active', el.id === 'screen-' + view),
          );
        document.querySelectorAll('[data-view]').forEach((el) => {
          const active = el.dataset.view === view;
          el.classList.toggle('active', active);
          if (
            el.classList.contains('tab') ||
            el.classList.contains('bottom-btn')
          )
            el.setAttribute('aria-current', active ? 'page' : 'false');
        });
        if (view === 'dashboard') renderDashboard();
        if (view === 'history') renderHistory();
        if (view === 'customers') renderCustomers();
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      /* Custom GST Input instead of fixed dropdown */
      function addRow(name = '', qty = 1, price = '', gst = 0) {
        const row = document.createElement('div');
        row.className = 'line-item';
        row.innerHTML = `<div class="field field-name"><label>Item name</label><input class="item-name" type="text" list="itemSuggestions" maxlength="120" placeholder="e.g. Copper wire 2.5mm" autocomplete="off"></div><div class="field"><label>Quantity</label><input class="item-qty" type="number" min="0.001" step="any" inputmode="decimal"></div><div class="field"><label>Unit price (₹)</label><input class="item-price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"></div><div class="field"><label>Item GST (%)</label><input class="item-gst" type="number" min="0" max="100" step="0.01" value="${gst}"></div><div class="line-total">₹0.00</div><button type="button" class="icon-btn danger remove-item" data-action="remove-row" title="Remove item" aria-label="Remove item">${icon('x')}</button>`;
        row.querySelector('.item-name').value = name;
        row.querySelector('.item-qty').value = qty;
        row.querySelector('.item-price').value = price;
        $('itemRows').appendChild(row);
        recalculate();
        return row;
      }

      function setDiscType(t) {
        state.discType = t === 'amt' ? 'amt' : 'pct';
        document
          .querySelectorAll('[data-action="disc-type"]')
          .forEach((b) =>
            b.classList.toggle('active', b.dataset.type === state.discType),
          );
        $('discountLabel').textContent =
          state.discType === 'pct' ? 'Discount (%)' : 'Discount (₹)';
        $('discountValue').max = state.discType === 'pct' ? '100' : '';
      }
      function recalculate() {
        const items = [];
        document.querySelectorAll('.line-item').forEach((row) => {
          const qty = clamp(
              finite(row.querySelector('.item-qty').value),
              0,
              1e6,
            ),
            price = clamp(
              finite(row.querySelector('.item-price').value),
              0,
              1e7,
            ),
            gst = clamp(finite(row.querySelector('.item-gst').value), 0, 100);
          row.querySelector('.line-total').textContent = money(
            round2(qty * price),
          );
          items.push({ qty, price, gst });
        });

        const globalGst = clamp(finite($('globalGst').value), 0, 100);
        const sums = compute(
          items,
          state.discType,
          Math.max(0, finite($('discountValue').value)),
          globalGst,
        );
        state.totals = sums;

        const paid = Math.max(0, finite($('amountReceived').value));
        $('subtotalDisplay').textContent = money(sums.subTotal);
        $('receiptSubtotalDisplay').textContent = money(sums.subTotal);
        $('discountDisplay').textContent = '−' + money(sums.discountAmt);
        $('gstDisplay').textContent = '+' + money(sums.gstAmt);
        $('grandDisplay').textContent = money(sums.total);
        $('pendingDisplay').textContent = money(
          Math.max(0, round2(sums.total - paid)),
        );
        const count = items.length;
        $('itemCount').textContent = `${count} item${count !== 1 ? 's' : ''}`;
      }
      function resetInvoice() {
        state.editingId = null;
        $('editorTitle').textContent = 'Invoice details';
        $('editorSubtitle').textContent = 'New sales invoice · ready to create';
        $('invoiceHeading').textContent = 'Create a new bill';
        $('editingTag').classList.add('hidden');
        ['customerName', 'customerPhone', 'invoiceNotes'].forEach(
          (id) => ($(id).value = ''),
        );
        ['discountValue', 'globalGst', 'amountReceived'].forEach(
          (id) => ($(id).value = '0'),
        );
        setDiscType('pct');
        $('itemRows').replaceChildren();
        addRow();
        setWizardStep(0, true);
      }

      function collectDraft() {
        const items = [];
        for (const row of document.querySelectorAll('.line-item')) {
          const name = row.querySelector('.item-name').value.trim(),
            q = row.querySelector('.item-qty').value.trim(),
            p = row.querySelector('.item-price').value.trim(),
            gst = Number(row.querySelector('.item-gst').value);
          if (!name && !p) continue;
          if (!name) return { error: 'Every priced item needs a name.' };
          if (
            q === '' ||
            !Number.isFinite(Number(q)) ||
            Number(q) <= 0 ||
            Number(q) > 1e6
          )
            return {
              error: `Enter a valid quantity for “${name.slice(0, 25)}”.`,
            };
          if (
            p === '' ||
            !Number.isFinite(Number(p)) ||
            Number(p) < 0 ||
            Number(p) > 1e7
          )
            return { error: `Enter a valid price for “${name.slice(0, 25)}”.` };
          if (!Number.isFinite(gst) || gst < 0 || gst > 100)
            return { error: `Invalid GST rate for “${name.slice(0, 25)}”.` };
          items.push({
            name,
            qty: Number(q),
            price: round2(Number(p)),
            gst,
            total: round2(Number(q) * round2(Number(p))),
          });
        }
        if (!items.length)
          return { error: 'Add at least one item with a name and price.' };
        const phone = cleanPhone($('customerPhone').value);
        if (phone && !validPhone(phone))
          return { error: 'Enter a valid 10-digit Indian mobile number.' };
        const dvRaw = $('discountValue').value.trim(),
          dv = Number(dvRaw),
          type = state.discType,
          r = Number($('amountReceived').value);
        const globalGst = Number($('globalGst').value) || 0;
        if (globalGst < 0 || globalGst > 100)
          return { error: 'Bill GST must be between 0 and 100.' };

        const sub = compute(items, 'pct', 0, 0).subTotal;
        if (dvRaw === '' || !Number.isFinite(dv) || dv < 0)
          return { error: 'Enter a valid discount.' };
        if (type === 'pct' && dv > 100)
          return { error: 'Discount cannot exceed 100%.' };
        if (type === 'amt' && dv > sub)
          return {
            error: `Discount cannot exceed the subtotal (${money(sub)}).`,
          };

        const totals = compute(items, type, dv, globalGst);
        if (!Number.isFinite(totals.total) || totals.total > 1e12)
          return { error: 'Invoice amount is too large.' };
        if (
          $('amountReceived').value.trim() === '' ||
          !Number.isFinite(r) ||
          r < 0 ||
          r > totals.total + 0.00001
        )
          return {
            error: 'Received amount must be between ₹0 and the grand total.',
          };
        const received = round2(Math.min(r, totals.total));
        return {
          name: $('customerName').value.trim() || 'Walk-in',
          phone,
          items,
          discountType: type,
          discountValue: dv,
          globalGstPct: globalGst,
          ...totals,
          received,
          pending: Math.max(0, round2(totals.total - received)),
          notes: $('invoiceNotes').value.trim(),
        };
      }
      async function saveBill(send = false) {
        if (state.saving) return;
        if (state.dbError) {
          notify('Storage is unavailable in this browser mode.', true);
          return;
        }
        const draft = collectDraft();
        if (draft.error) {
          notify(draft.error, true);
          return;
        }
        if (send && !validPhone(draft.phone)) {
          notify('Enter a valid WhatsApp number before sharing.', true);
          return;
        }
        const index =
          state.editingId === null
            ? -1
            : BILLS.findIndex((b) => b.id === state.editingId);
        if (state.editingId !== null && index < 0) {
          notify('This invoice is no longer available.', true);
          return;
        }
        // Opening a tab during the click avoids popup-blockers after the IndexedDB await.
        const outgoing = send ? window.open('about:blank', '_blank') : null;
        state.saving = true;
        document
          .querySelectorAll('#saveSection button')
          .forEach((b) => (b.disabled = true));
        let saved,
          counter = null;
        if (index >= 0) {
          const old = BILLS[index],
            diff = round2(draft.received - old.received),
            payments = old.payments.slice();
          if (diff !== 0)
            payments.push({
              amount: diff,
              method: 'Balance adjusted during edit',
              at: new Date().toISOString(),
            });
          saved = {
            ...old,
            ...draft,
            updatedAt: new Date().toISOString(),
            payments,
          };
        } else {
          const next = nextBillNumber(BILLS),
            at = new Date().toISOString();
          counter = next.counter;
          saved = {
            ...draft,
            id: uid(),
            billNo: next.number,
            date: dateLocal(),
            createdAt: at,
            updatedAt: at,
            payments:
              draft.received > 0
                ? [{ amount: draft.received, method: 'At billing', at }]
                : [],
          };
        }
        try {
          await DB.put(saved);
        } catch (e) {
          console.error(e);
          try {
            outgoing?.close();
          } catch (_) {}
          notify(
            'Could not save the invoice. Storage may be full or blocked.',
            true,
          );
          state.saving = false;
          document
            .querySelectorAll('#saveSection button')
            .forEach((b) => (b.disabled = false));
          return;
        }
        if (index >= 0) BILLS[index] = saved;
        else BILLS.unshift(saved);
        try {
          if (counter !== null)
            localStorage.setItem(COUNTER_KEY, String(counter));
        } catch (e) {}
        if (send) {
          const url = whatsappUrl(saved.phone, buildWhatsAppMessage(saved));
          if (outgoing) {
            try {
              outgoing.location.replace(url);
            } catch (e) {
              notify(
                'Could not navigate WhatsApp tab. Please share from Bill History.',
                true,
              );
            }
          } else {
            notify('Popup blocked. Open WhatsApp from Bill History.', true);
          }
        }
        announceChange();
        refreshAll();
        resetInvoice();
        showView('history');
        notify(
          `Invoice ${saved.billNo} ${index >= 0 ? 'updated' : 'saved'} successfully.`,
        );
        state.saving = false;
        document
          .querySelectorAll('#saveSection button')
          .forEach((b) => (b.disabled = false));
      }
      function whatsappUrl(phone, msg) {
        return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
      }
      function openWhatsApp(phone, msg) {
        window.open(whatsappUrl(phone, msg), '_blank', 'noopener,noreferrer');
      }
      // The same formatter powers the final-step preview and every actual WhatsApp invoice.
      function buildWhatsAppMessage(b) {
        const dash = '──────────────────';
        let msg = `*ANJALI ENTERPRISES*\nElectrical Supply Store\nShop No. 6, Achole Ashok Nagar, Opp. Dwarka Hotel\nNallasopara (E), Maharashtra - 401209\nMob: 9022596284\n${dash}\n*SALES INVOICE ${b.billNo || 'DRAFT'}*\nCustomer: ${b.name}\n${b.phone ? `Mobile: +91 ${b.phone}\n` : ''}Date: ${formatDate(b.date)}\n${dash}\n`;
        b.items.forEach(
          (i, n) =>
            (msg += `${n + 1}. ${i.name}\n   ${i.qty} x ${money(i.price)} = *${money(i.total)}*${i.gst > 0 ? ` (GST ${i.gst}%)` : ''}\n`),
        );
        msg += `${dash}\nSubtotal: ${money(b.subTotal)}\n`;
        if (b.discountAmt > 0)
          msg += `${discLabel(b)}: -${money(b.discountAmt)}\n`;
        if (b.globalGstPct > 0)
          msg += `Additional bill GST rate: ${b.globalGstPct}%\n`;
        if (b.gstAmt > 0) msg += `Total GST: +${money(b.gstAmt)}\n`;
        msg += `*Grand total: ${money(b.total)}*\nPaid: ${money(b.received)}\n*Pending: ${money(b.pending)}*\n`;
        if (b.notes?.trim())
          msg += `${dash}\n*Bill notes:*\n${b.notes.trim()}\n`;
        msg += `${dash}\nThank you for shopping with us!`;
        return msg;
      }
      function sendWhatsApp(b) {
        if (!validPhone(b.phone)) {
          notify('This bill has no valid WhatsApp number.', true);
          return;
        }
        openWhatsApp(b.phone, buildWhatsAppMessage(b));
      }
