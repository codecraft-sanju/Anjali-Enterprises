'use strict';
      /* ---------- Rendering ---------- */
      function renderDashboard() {
        const bills = readBills(),
          inR = bills.filter((b) => inRange(b, state.dashRange)),
          label = RANGES[state.dashRange];
        const total = round2(inR.reduce((s, b) => s + b.total, 0)),
          gst = round2(inR.reduce((s, b) => s + b.gstAmt, 0)),
          pending = round2(bills.reduce((s, b) => s + b.pending, 0));
        const cards = [
          [
            `Billed · ${label}`,
            money(total),
            'trending',
            '',
            'Total of invoices in range',
          ],
          [
            `GST · ${label}`,
            money(gst),
            'wallet',
            'green',
            'Collected on invoices in range',
          ],
          [
            'Outstanding',
            money(pending),
            'pending',
            'red',
            'All customers, all time',
          ],
          [
            `Invoices · ${label}`,
            String(inR.length),
            'receipt',
            '',
            'Saved in this range',
          ],
        ];
        $('statsGrid').innerHTML = cards
          .map(
            ([l, v, ico, color, note]) =>
              `<div class="card stat"><div class="stat-head"><span>${escapeHtml(l)}</span><span class="stat-icon ${color}">${icon(ico)}</span></div><strong class="stat-value">${escapeHtml(v)}</strong><span class="stat-note">${note}</span></div>`,
          )
          .join('');
        const recent = bills.slice().sort(byNewest).slice(0, 5);
        $('recentInvoices').innerHTML = recent.length
          ? recent
              .map(
                (b) =>
                  `<button class="recent-item" data-action="edit" data-id="${escapeHtml(b.id)}"><span class="avatar">${escapeHtml((b.name || 'W').charAt(0).toUpperCase())}</span><span class="recent-info"><strong>${escapeHtml(b.name)}</strong><small>${escapeHtml(b.billNo)} · ${escapeHtml(formatDate(b.date))}</small></span><span class="recent-right"><strong>${money(b.total)}</strong><br><span class="badge ${b.pending > 0 ? 'pending' : 'paid'}">${b.pending > 0 ? 'Due ' + money(b.pending) : 'Paid'}</span></span></button>`,
              )
              .join('')
          : `<div class="empty"><div class="empty-icon">${icon('receipt')}</div><b>No invoices yet</b>Your first saved invoice will appear here.</div>`;
      }
      const SHORT = {
        collect: 'Payment',
        edit: 'Edit',
        resend: 'WhatsApp',
        'print-saved': 'Print',
        delete: 'Delete',
        'cust-pay': 'Payment',
        'cust-remind': 'Remind',
        'cust-bills': 'Bills',
      };
      function actionButton(action, id, ico, label, danger = false) {
        return `<button class="icon-btn ${danger ? 'danger' : ''}" data-action="${action}" data-id="${escapeHtml(id)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon(ico)}<span class="action-text">${SHORT[action] || label}</span></button>`;
      }
      function historyActions(b) {
        return `<div class="row-actions">${b.pending > 0 ? actionButton('collect', b.id, 'credit', 'Record payment') : ''}${actionButton('edit', b.id, 'edit', 'Edit bill')}${b.phone ? actionButton('resend', b.id, 'whatsapp', 'Open WhatsApp') : ''}${actionButton('print-saved', b.id, 'printer', 'Print invoice')}${actionButton('delete', b.id, 'trash', 'Delete bill', true)}</div>`;
      }
      function renderHistory() {
        const bills = readBills().slice().sort(byNewest),
          q = $('historySearch').value.trim().toLowerCase();
        const filtered = bills.filter(
          (b) =>
            inRange(b, state.histRange) &&
            (state.filter === 'all' ||
              (state.filter === 'pending' ? b.pending > 0 : b.pending <= 0)) &&
            (!q ||
              [b.name, b.phone, b.billNo, b.date].some((v) =>
                String(v || '')
                  .toLowerCase()
                  .includes(q),
              )),
        );
        $('historyCount').textContent =
          `${bills.length} invoice${bills.length === 1 ? '' : 's'}`;
        $('filterCount').textContent =
          `Showing ${filtered.length} of ${bills.length}`;
        $('historyBody').innerHTML = filtered.length
          ? filtered
              .map(
                (b) =>
                  `<tr><td class="bill-no">${escapeHtml(b.billNo)}</td><td><div class="client-name">${escapeHtml(b.name)}</div><div class="client-phone">${escapeHtml(b.phone || 'Walk-in customer')}</div></td><td class="muted">${escapeHtml(formatDate(b.date))}</td><td><strong>${money(b.total)}</strong></td><td><strong style="color:${b.pending > 0 ? '#c63f57' : '#087d61'}">${money(b.pending)}</strong></td><td><span class="badge ${b.pending > 0 ? 'pending' : 'paid'}">${b.pending > 0 ? 'Pending' : 'Paid'}</span></td><td>${historyActions(b)}</td></tr>`,
              )
              .join('')
          : `<tr><td colspan="7"><div class="empty"><b>No invoices found</b>Try a different search, filter or date range.</div></td></tr>`;
        $('mobileBillList').innerHTML = filtered.length
          ? filtered
              .map(
                (b) =>
                  `<article class="mobile-bill"><div class="bill-top"><span class="bill-no">${escapeHtml(b.billNo)}</span><span class="badge ${b.pending > 0 ? 'pending' : 'paid'}">${b.pending > 0 ? 'Pending' : 'Paid'}</span></div><div class="bill-mid"><div><b>${escapeHtml(b.name)}</b><div class="muted tiny">${escapeHtml(formatDate(b.date))}${b.phone ? ' · ' + escapeHtml(b.phone) : ''}</div></div><strong>${money(b.total)}</strong></div><p class="muted tiny" style="margin-bottom:12px">Balance due: <strong>${money(b.pending)}</strong></p>${historyActions(b)}</article>`,
              )
              .join('')
          : `<div class="empty"><b>No invoices found</b>Try a different search, filter or date range.</div>`;
      }
      function customerSummaries() {
        const map = new Map();
        for (const b of BILLS.slice().sort(byNewest)) {
          if (!b.phone) continue;
          const c = map.get(b.phone) || {
            phone: b.phone,
            name: b.name,
            count: 0,
            total: 0,
            received: 0,
            pending: 0,
          };
          c.count++;
          c.total = round2(c.total + b.total);
          c.received = round2(c.received + b.received);
          c.pending = round2(c.pending + b.pending);
          map.set(b.phone, c);
        }
        return [...map.values()].sort(
          (a, b) => b.pending - a.pending || a.name.localeCompare(b.name),
        );
      }
      function renderCustomers() {
        const all = customerSummaries(),
          q = $('customerSearch').value.trim().toLowerCase(),
          list = all.filter(
            (c) =>
              !q || c.name.toLowerCase().includes(q) || c.phone.includes(q),
          );
        $('customerCount').textContent =
          `${all.length} customer${all.length === 1 ? '' : 's'}`;
        $('ledgerTotal').textContent = money(
          round2(all.reduce((s, c) => s + c.pending, 0)),
        );
        $('customerList').innerHTML = list.length
          ? list
              .map(
                (c) =>
                  `<div class="card cust"><span class="avatar">${escapeHtml(c.name.charAt(0).toUpperCase())}</span><div class="recent-info"><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.phone)} · ${c.count} bill${c.count === 1 ? '' : 's'}</small></div><div class="cust-nums"><div><small>Billed</small><strong>${money(c.total)}</strong></div><div><small>Paid</small><strong style="color:var(--mint)">${money(c.received)}</strong></div><div><small>Outstanding</small><strong style="color:${c.pending > 0 ? 'var(--rose)' : 'var(--mint)'}">${money(c.pending)}</strong></div></div><div class="row-actions">${c.pending > 0 ? actionButton('cust-pay', c.phone, 'credit', 'Receive payment') + actionButton('cust-remind', c.phone, 'whatsapp', 'Send reminder') : ''}${actionButton('cust-bills', c.phone, 'receipt', 'View bills')}</div></div>`,
              )
              .join('')
          : `<div class="card"><div class="empty"><b>No customers yet</b>Save a bill with a mobile number to start a khata.</div></div>`;
      }
      function refreshSuggestions() {
        const seen = new Map();
        for (const b of BILLS.slice().sort(byNewest))
          for (const i of b.items) {
            const k = i.name.toLowerCase();
            if (!seen.has(k) && seen.size < 300) seen.set(k, i);
          }
        const list = $('itemSuggestions');
        list.replaceChildren();
        for (const i of seen.values()) {
          const o = document.createElement('option');
          o.value = i.name;
          o.label = `${money(i.price)} · GST ${i.gst}%`;
          list.appendChild(o);
        }
      }
      function refreshAll() {
        renderDashboard();
        renderHistory();
        renderCustomers();
        refreshSuggestions();
      }
      function autofillFromHistory(row) {
        const name = row.querySelector('.item-name').value.trim().toLowerCase();
        if (!name) return;
        for (const b of BILLS.slice().sort(byNewest)) {
          const hit = b.items.find((i) => i.name.toLowerCase() === name);
          if (hit) {
            const price = row.querySelector('.item-price'),
              gst = row.querySelector('.item-gst');
            if (!price.value || Number(price.value) === 0)
              price.value = hit.price;
            gst.value = String(hit.gst);
            recalculate();
            row.querySelector('.item-qty').focus();
            return;
          }
        }
      }
