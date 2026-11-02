'use strict';
      /* Indian mobile: digits only, strip leading 0s and a 91 country code, exactly 10 digits max */
      function cleanPhone(v) {
        let d = String(v || '')
          .replace(/\D/g, '')
          .replace(/^0+/, '');
        if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
        return d;
      }
      const validPhone = (p) => /^[6-9]\d{9}$/.test(p);

      /* ---------- Billing maths ---------- */
      /* Supports both item-wise GST and a global Bill GST. */
      function compute(items, type, value, globalGstPct) {
        const lines = items.map((i) => round2(i.qty * i.price)),
          subTotal = round2(lines.reduce((a, b) => a + b, 0));
        const discountAmt =
          type === 'amt'
            ? round2(Math.min(Math.max(value, 0), subTotal))
            : round2((subTotal * clamp(value, 0, 100)) / 100);
        const keep = subTotal > 0 ? 1 - discountAmt / subTotal : 1;
        const itemGstAmt = round2(
          items.reduce(
            (s, i, k) => s + (lines[k] * keep * clamp(i.gst, 0, 100)) / 100,
            0,
          ),
        );
        const billGstAmt = round2(
          ((subTotal - discountAmt) * clamp(globalGstPct, 0, 100)) / 100,
        );
        const gstAmt = round2(itemGstAmt + billGstAmt);
        return {
          subTotal,
          discountAmt,
          gstAmt,
          total: round2(subTotal - discountAmt + gstAmt),
        };
      }
      function discLabel(b) {
        return b.discountType === 'amt'
          ? 'Discount'
          : `Discount (${b.discountValue}%)`;
      }

      function normalizeBill(b) {
        if (
          !b ||
          typeof b !== 'object' ||
          !Array.isArray(b.items) ||
          b.id == null ||
          b.billNo == null
        )
          return null;
        const globalGst = clamp(finite(b.globalGstPct || b.gstPct), 0, 100);
        const items = b.items
          .slice(0, 500)
          .map((i) => ({
            name: String(i?.name ?? '')
              .trim()
              .slice(0, 120),
            qty: finite(i?.qty),
            price: finite(i?.price),
            gst: clamp(finite(i.gst), 0, 100),
          }))
          .filter(
            (i) =>
              i.name &&
              i.qty > 0 &&
              i.qty <= 1e6 &&
              i.price >= 0 &&
              i.price <= 1e7,
          );
        if (!items.length) return null;
        const discountType = b.discountType === 'amt' ? 'amt' : 'pct';
        const discountValue = Math.max(
          0,
          finite(b.discountValue != null ? b.discountValue : b.discountPct),
        );
        const sums = compute(items, discountType, discountValue, globalGst);
        if (!Number.isFinite(sums.total) || sums.total > 1e12) return null;
        const received = clamp(finite(b.received), 0, sums.total);
        return {
          id: String(b.id).slice(0, 80),
          billNo: String(b.billNo).slice(0, 40),
          name: String(b.name || 'Walk-in').slice(0, 80),
          phone: cleanPhone(b.phone),
          date: String(b.date || dateLocal()).slice(0, 32),
          createdAt: String(b.createdAt || ''),
          updatedAt: String(b.updatedAt || ''),
          notes: String(b.notes || '').slice(0, 500),
          items: items.map((i) => ({ ...i, total: round2(i.qty * i.price) })),
          discountType,
          discountValue,
          globalGstPct: globalGst,
          ...sums,
          received,
          pending: round2(Math.max(0, sums.total - received)),
          payments: Array.isArray(b.payments)
            ? b.payments
                .slice(0, 1000)
                .filter(
                  (p) =>
                    p &&
                    Number.isFinite(Number(p.amount)) &&
                    Number(p.amount) !== 0,
                )
                .map((p) => ({
                  amount: finite(p.amount),
                  method: String(p.method || 'Unspecified').slice(0, 30),
                  at: String(p.at || '').slice(0, 40),
                }))
            : received > 0
              ? [
                  {
                    amount: received,
                    method: 'Opening payment',
                    at: String(b.createdAt || ''),
                  },
                ]
              : [],
        };
      }
