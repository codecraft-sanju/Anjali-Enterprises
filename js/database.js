'use strict';
      /* ---------- IndexedDB ---------- */
      const DB = {
        db: null,
        open() {
          return new Promise((res, rej) => {
            if (!window.indexedDB)
              return rej(new Error('IndexedDB unavailable'));
            const r = indexedDB.open('anjaliBilling', 1);
            r.onupgradeneeded = () =>
              r.result.createObjectStore('bills', { keyPath: 'id' });
            r.onsuccess = () => {
              this.db = r.result;
              res();
            };
            r.onerror = () => rej(r.error);
          });
        },
        tx(mode, fn) {
          return new Promise((res, rej) => {
            const t = this.db.transaction('bills', mode),
              out = fn(t.objectStore('bills'));
            t.oncomplete = () => res(out && out.result);
            t.onerror = t.onabort = () => rej(t.error);
          });
        },
        all() {
          return this.tx('readonly', (s) => s.getAll());
        },
        put(list) {
          return this.tx('readwrite', (s) => {
            [].concat(list).forEach((b) => s.put(b));
          });
        },
        del(id) {
          return this.tx('readwrite', (s) => s.delete(id));
        },
        replace(list) {
          return this.tx('readwrite', (s) => {
            s.clear();
            list.forEach((b) => s.put(b));
          });
        },
      };
