'use strict';
      /* ---------- Guided invoice wizard ---------- */
      const STEP_COPY = [
        [
          'Who are we billing?',
          'Start with the customer details. Walk-in customers are welcome.',
          'Continue to items',
        ],
        [
          'Add products & quantities',
          'Every product gets its own line and an optional GST rate.',
          'Continue to payment',
        ],
        [
          'Review payment & GST',
          'Set the discount, total tax and initial amount received.',
          'Preview invoice',
        ],
        [
          'Preview before sharing',
          'The final invoice and WhatsApp text are ready to inspect.',
          '',
        ],
      ];
      function setWizardStep(next, silent = false) {
        const old = state.step;
        state.step = clamp(next, 0, 3);
        const root = document.querySelector('.wizard-shell');
        root.dataset.currentStep = String(state.step);
        $('wizardStage').classList.toggle('backwards', state.step < old);
        document.querySelectorAll('.wizard-page').forEach((page, i) => {
          const active = i === state.step;
          page.classList.toggle('active', active);
          page.hidden = !active;
          page.setAttribute('aria-hidden', String(!active));
          if (active && !silent) {
            page.style.animation = 'none';
            void page.offsetWidth;
            page.style.animation = '';
          }
        });
        document.querySelectorAll('.wizard-step').forEach((btn, i) => {
          btn.classList.toggle('active', i === state.step);
          btn.classList.toggle('done', i < state.step);
          if (i === state.step) btn.setAttribute('aria-current', 'step');
          else btn.removeAttribute('aria-current');
        });
        $('stepCounter').textContent = String(state.step + 1).padStart(2, '0');
        $('wizardHeading').textContent = STEP_COPY[state.step][0];
        $('wizardDescription').textContent = STEP_COPY[state.step][1];
        $('wizardBack').disabled = state.step === 0;
        $('wizardNext').classList.toggle('hidden', state.step === 3);
        $('saveSection').classList.toggle('hidden', state.step !== 3);
        $('wizardNext').innerHTML =
          `${STEP_COPY[state.step][2]} ${icon('arrow-right')}`;
        $('wizardFooterTip').textContent =
          `Step ${state.step + 1} of 4 · All fields are kept as you move between steps`;
        if (state.step === 3) renderInvoicePreview();
        if (!silent) {
          window.scrollTo({
            top:
              document.getElementById('screen-invoice').getBoundingClientRect()
                .top +
              window.scrollY -
              88,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
              .matches
              ? 'instant'
              : 'smooth',
          });
        }
      }
      function checkWizardStep(step) {
        if (step === 0) {
          const phone = cleanPhone($('customerPhone').value);
          if (phone && !validPhone(phone)) {
            notify(
              'Enter a valid 10-digit Indian mobile number or leave blank.',
              true,
            );
            $('customerPhone').focus();
            return false;
          }
          return true;
        }
        if (step === 1) {
          let count = 0;
          for (const row of document.querySelectorAll('.line-item')) {
            const name = row.querySelector('.item-name').value.trim(),
              rawQty = row.querySelector('.item-qty').value.trim(),
              rawPrice = row.querySelector('.item-price').value.trim(),
              rawGst = row.querySelector('.item-gst').value.trim();
            if (!name && !rawPrice) continue;
            if (
              !name ||
              !rawQty ||
              !rawPrice ||
              !rawGst ||
              Number(rawQty) <= 0 ||
              Number(rawQty) > 1e6 ||
              Number(rawPrice) < 0 ||
              Number(rawPrice) > 1e7 ||
              Number(rawGst) < 0 ||
              Number(rawGst) > 100 ||
              ![rawQty, rawPrice, rawGst].every((v) =>
                Number.isFinite(Number(v)),
              )
            ) {
              notify(
                'Please complete each product: name, quantity, price and valid GST.',
                true,
              );
              row
                .querySelector(
                  !name
                    ? '.item-name'
                    : !rawQty
                      ? '.item-qty'
                      : !rawPrice
                        ? '.item-price'
                        : '.item-gst',
                )
                .focus();
              return false;
            }
            count++;
          }
          if (!count) {
            notify('Add at least one product before continuing.', true);
            document.querySelector('.item-name')?.focus();
            return false;
          }
          return true;
        }
        if (step === 2) {
          const d = collectDraft();
          if (d.error) {
            notify(d.error, true);
            return false;
          }
          return true;
        }
        return true;
      }
      function navigateWizard(target) {
        target = clamp(target, 0, 3);
        if (target === state.step) return;
        if (target > state.step) {
          for (let i = state.step; i < target; i++) {
            if (!checkWizardStep(i)) {
              if (i !== state.step) setWizardStep(i);
              return;
            }
          }
        }
        setWizardStep(target);
      }
      function previewBill() {
        const draft = collectDraft();
        if (draft.error) return null;
        const old = state.editingId ? findBill(state.editingId) : null;
        return {
          ...draft,
          billNo: old?.billNo || nextBillNumber(BILLS).number,
          date: old?.date || dateLocal(),
        };
      }
      function renderInvoicePreview() {
        const b = previewBill();
        if (!b) {
          notify('Fix the invoice fields before previewing.', true);
          return;
        }
        $('previewBillNo').textContent = b.billNo;
        $('previewDate').textContent = formatDate(b.date);
        $('previewCustomer').textContent = b.name;
        $('previewPhone').textContent = b.phone
          ? '+91 ' + b.phone
          : 'No mobile number';
        $('previewItems').innerHTML = b.items
          .map(
            (i) =>
              `<div class="preview-item"><div><strong>${escapeHtml(i.name)}</strong><small>${escapeHtml(i.qty)} × ${money(i.price)}${i.gst > 0 ? ' · GST ' + escapeHtml(i.gst) + '%' : ''}</small></div><span>${money(i.total)}</span></div>`,
          )
          .join('');
        const totals = [
          ['Subtotal', money(b.subTotal), ''],
          ...(b.discountAmt > 0
            ? [[discLabel(b), '−' + money(b.discountAmt), '']]
            : []),
          ...(b.gstAmt > 0 ? [['Total GST', '+' + money(b.gstAmt), '']] : []),
          ['Grand total', money(b.total), 'grand'],
          ['Amount received', money(b.received), ''],
          ['Balance pending', money(b.pending), 'due'],
        ];
        $('previewFigures').innerHTML = totals
          .map(
            ([label, value, cls]) =>
              `<div class="preview-figure ${cls}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
          )
          .join('');
        $('previewNotesWrap').classList.toggle('hidden', !b.notes);
        $('previewNotes').textContent = b.notes || '';
        $('whatsappPreviewText').textContent = buildWhatsAppMessage(b);
        const shareButton = document.querySelector(
          '#saveSection [data-action=\"save-send\"]',
        );
        shareButton.disabled = !validPhone(b.phone);
        shareButton.title = shareButton.disabled
          ? 'Add a valid mobile number in Customer Details to share via WhatsApp.'
          : 'Open the prepared message in WhatsApp';
        $('previewNumberNote').textContent = !validPhone(b.phone)
          ? 'To share via WhatsApp, go back to Customer Details and enter a valid mobile number. You can still save or print this invoice.'
          : state.editingId
            ? 'WhatsApp opens a prepared message after saving. Nothing is sent automatically.'
            : 'The invoice number is provisional until saved. WhatsApp opens a prefilled message; you choose when to send it.';
      }
      async function copyPreviewMessage() {
        const b = previewBill();
        if (!b) return;
        try {
          await navigator.clipboard.writeText(buildWhatsAppMessage(b));
          notify('WhatsApp message copied.');
        } catch (e) {
          const el = $('whatsappPreviewText');
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          notify('Select and copy the highlighted message.');
        }
      }
