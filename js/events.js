'use strict';
      /* ---------- Events ---------- */
      function handleAction(action, id, button) {
        switch (action) {
          case 'new':
            resetInvoice();
            showView('invoice');
            $('customerName').focus({ preventScroll: true });
            break;
          case 'step-next':
            navigateWizard(state.step + 1);
            break;
          case 'step-back':
            navigateWizard(state.step - 1);
            break;
          case 'copy-message':
            copyPreviewMessage();
            break;
          case 'add-row':
            addRow().querySelector('.item-name').focus();
            break;
          case 'remove-row':
            if ($('itemRows').querySelectorAll('.line-item').length === 1) {
              notify('At least one item row is required.', true);
              break;
            }
            button.closest('.line-item').remove();
            recalculate();
            break;
          case 'disc-type':
            setDiscType(button.dataset.type);
            recalculate();
            break;
          case 'full-paid':
            recalculate();
            $('amountReceived').value = state.totals.total.toFixed(2);
            recalculate();
            break;
          case 'save':
            saveBill(false);
            break;
          case 'save-send':
            saveBill(true);
            break;
          case 'print-draft':
            printDraft();
            break;
          case 'print-saved': {
            const b = findBill(id);
            if (b) printBill(b);
            break;
          }
          case 'edit':
            editBill(id);
            break;
          case 'delete':
            deleteBill(id);
            break;
          case 'collect':
            openPaymentDialog(id);
            break;
          case 'resend': {
            const b = findBill(id);
            if (b) sendWhatsApp(b);
            break;
          }
          case 'cust-pay':
            openCustomerPayment(id);
            break;
          case 'cust-remind':
            remindCustomer(id);
            break;
          case 'cust-bills':
            $('historySearch').value = id;
            state.filter = 'all';
            document
              .querySelectorAll('[data-filter]')
              .forEach((b) =>
                b.classList.toggle('active', b.dataset.filter === 'all'),
              );
            state.histRange = 'all';
            fillRanges();
            showView('history');
            break;
          case 'export-csv':
            csv();
            break;
          case 'backup':
            backup();
            break;
          case 'restore':
            $('restoreFile').click();
            break;
          case 'close-dialog':
            $('paymentDialog').close();
            break;
        }
      }
      document.addEventListener('click', (ev) => {
        const el = ev.target.closest(
          '[data-action],[data-view],[data-filter],[data-jump-step]',
        );
        if (!el) return;
        if (el.dataset.action)
          handleAction(el.dataset.action, el.dataset.id, el);
        else if (el.dataset.jumpStep !== undefined)
          navigateWizard(Number(el.dataset.jumpStep));
        else if (el.dataset.view) showView(el.dataset.view);
        else if (el.dataset.filter) {
          state.filter = el.dataset.filter;
          document
            .querySelectorAll('[data-filter]')
            .forEach((b) =>
              b.classList.toggle('active', b.dataset.filter === state.filter),
            );
          renderHistory();
        }
      });
      /* Negative numbers: block the keys and normalise pasted/typed values */
      document.addEventListener('keydown', (ev) => {
        if (
          ev.target.type === 'number' &&
          ['-', '+', 'e', 'E'].includes(ev.key)
        )
          ev.preventDefault();
      });
      document.addEventListener('input', (ev) => {
        const el = ev.target;
        if (el.type === 'number' && el.value !== '' && Number(el.value) < 0)
          el.value = String(Math.abs(Number(el.value)));
        if (el.id === 'customerPhone') el.value = cleanPhone(el.value);
        if (
          el.closest('.line-item') ||
          ['discountValue', 'amountReceived', 'globalGst'].includes(el.id)
        )
          recalculate();
        if (el.id === 'historySearch') renderHistory();
        if (el.id === 'customerSearch') renderCustomers();
      });
      document.addEventListener('change', (ev) => {
        const el = ev.target;
        if (el.classList.contains('item-name'))
          autofillFromHistory(el.closest('.line-item'));
        if (el.classList.contains('item-gst')) recalculate();
        if (el.classList.contains('range-select')) {
          if (el.dataset.range === 'dash') state.dashRange = el.value;
          else state.histRange = el.value;
          fillRanges();
          renderDashboard();
          renderHistory();
        }
      });
      $('paymentForm').addEventListener('submit', recordPayment);
      $('restoreFile').addEventListener('change', (ev) => {
        restore(ev.target.files[0]);
        ev.target.value = '';
      });
      $('paymentDialog').addEventListener('close', () => {
        state.paymentId = null;
        state.payPhone = null;
      });
      if (channel)
        channel.onmessage = async () => {
          try {
            await loadBills();
            refreshAll();
            notify('Records updated in another tab.');
          } catch (e) {
            console.error(e);
          }
        };

      async function init() {
        hydrateIcons();
        fillRanges();
        $('footerYear').textContent = new Date().getFullYear();
        document
          .querySelectorAll('.today-label')
          .forEach(
            (el) =>
              (el.textContent = new Date().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })),
          );
        resetInvoice();
        try {
          await DB.open();
          await loadBills();
          navigator.storage?.persist?.();
        } catch (e) {
          console.error(e);
          state.dbError = true;
          notify(
            'Storage unavailable (private mode?). Bills cannot be saved.',
            true,
          );
        }
        refreshAll();
        showView('dashboard');
      }
      init();
