      'use strict';
      const COUNTER_KEY = 'wholesaleBillCounter',
        LEGACY_KEY = 'wholesaleBills',
        MIGRATED_KEY = 'anjaliIdbMigrated';
      const RANGES = {
        today: 'Today',
        ['7d']: 'Last 7 days',
        month: 'This month',
        last: 'Last month',
        all: 'All time',
      };
      const $ = (id) => document.getElementById(id);
      const state = {
        view: 'dashboard',
        editingId: null,
        totals: { subTotal: 0, discountAmt: 0, gstAmt: 0, total: 0 },
        filter: 'all',
        paymentId: null,
        payPhone: null,
        toastTimer: null,
        discType: 'pct',
        dashRange: 'month',
        histRange: 'all',
        dbError: false,
        step: 0,
        saving: false,
      };
      let BILLS = [];
      const channel =
        'BroadcastChannel' in window
          ? new BroadcastChannel('anjali-bills')
          : null;
