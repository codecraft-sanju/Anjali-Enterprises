# Anjali Enterprises Billing — Modular Web App

This is a refactor of the supplied source code: the bill calculations, records, IDs, buttons, preview, WhatsApp message, wizard, accessibility attributes, and original CSS declarations have been retained.

## Running locally

Use a local web server because HTML fragments are loaded through `fetch` (opening `index.html` directly as a `file://` page does not work).

```bash
cd Anjali-Enterprises-Billing-Modular
python -m http.server 5500
```

Open http://localhost:5500/ . Or use VS Code **Live Server**. For production, upload the **entire folder tree** to an HTTPS website. No npm/build step is needed.

## Structure

- `index.html` — small entry point; contains layout slots.
- `partials/*.html` — Overview, Create Bill, History, Customers, header, footer, mobile navigation, dialog.
- `partials/invoice/*.html` — all four invoice steps.
- `styles.css` — CSS entry point, imports the original rules in their exact cascade order.
- `css/` — base, layout, dashboard, forms, history, feedback, responsive, theme, wizard, payment, preview.
- `js/bootstrap.js` — mounts all HTML templates first, then loads the feature scripts in order.
- `js/state.js`, `js/database.js`, `js/utils.js`, `js/billing.js`, `js/repository.js`, `js/ranges.js`, `js/invoice.js`, `js/render.js`, `js/payments.js`, `js/backup.js`, `js/wizard.js`, `js/events.js` — original JS separated at existing feature boundaries. These are **ordered classic scripts sharing original global lexical scope**, rather than independent ES modules, to avoid breaking existing cross-file function references.
- `manifest.json`, `sw.js` — PWA install / precache of every component, script and stylesheet. The SW cache version is updated.
- `icon-192.png`, `icon-512.png` — replacement AE branding icons (no original images were attached). Replace with your existing icons if preferred.

## Important

Your invoice database is stored in **IndexedDB** (`anjaliBilling`) and does not belong to any of the code files. Keep the **same site origin / domain / port** as the previous version if you want the same saved invoices to appear automatically. If you change origin, export a JSON backup from the original app, then restore it in the new one. For safety, export a backup before deployment.

The service-worker upgrade behavior is: this service worker precaches all files on install, uses network-first requests, and falls back to cached files offline. The prior `ae-billing-v2` cache is removed after v3 successfully installs.

To upgrade styles or fragments later, increment the `CACHE_NAME` in `sw.js`, and update `styles.css?v=2.0` consistently in `index.html` and `sw.js` if you change its query string.
