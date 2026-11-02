/* Anjali Enterprises Billing - zero-build, ordered classic-script loader.
   Features keep the original shared lexical scope. Files load serially to
   preserve behavior; app initialization runs only after every HTML part exists. */
'use strict';
const AE_SCRIPTS = ["./js/state.js", "./js/database.js", "./js/utils.js", "./js/billing.js", "./js/repository.js", "./js/ranges.js", "./js/invoice.js", "./js/render.js", "./js/payments.js", "./js/backup.js", "./js/wizard.js", "./js/events.js"];

async function mountHtmlParts() {
  // Recursive templates support split wizard pages inside the invoice shell.
  for (let pass = 0; pass < 8; pass++) {
    const placeholders = [...document.querySelectorAll('template[data-part]')];
    if (!placeholders.length) return;
    await Promise.all(placeholders.map(async (placeholder) => {
      const response = await fetch(placeholder.dataset.part);
      if (!response.ok) throw new Error(`Cannot load ${placeholder.dataset.part} (${response.status})`);
      const content = document.createElement('template');
      content.innerHTML = await response.text();
      placeholder.replaceWith(content.content);
    }));
  }
  throw new Error('Too many nested component levels.');
}

function includeScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Cannot load ${src}`));
    document.body.append(script);
  });
}

async function startApp() {
  try {
    await mountHtmlParts();
    // Download feature scripts together, but execute them in insertion order (async=false).
    await Promise.all(AE_SCRIPTS.map(includeScript));
    // Never depend on the window.load event, which may have fired already.
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('./sw.js').catch(console.warn);
    }
  } catch (error) {
    console.error('Billing application failed to start:', error);
    const message = document.createElement('div');
    message.setAttribute('role', 'alert');
    message.style.cssText = 'max-width:680px;margin:10vh auto;padding:24px;border-radius:16px;background:white;box-shadow:0 6px 30px #33415520;color:#b91c1c;font:16px/1.6 system-ui';
    message.textContent = 'Could not start the billing app. Open it through an HTTP server (for example http://localhost:5500), and verify that all project files were uploaded. Details: ' + error.message;
    document.body.prepend(message);
  }
}
startApp();
