(function () {
  "use strict";
  const INSTALLED_KEY = "joesStudioPwaInstalled";
  const DISMISSED_KEY = "joesStudioPwaPromptDismissedAt";
  const DISMISS_DAYS = 14;
  let deferredPrompt = null;
  let card = null;
  let promptShown = false;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true;
  }
  function installed() {
    try { return localStorage.getItem(INSTALLED_KEY) === "1" || isStandalone(); }
    catch (_) { return isStandalone(); }
  }
  function canPromptAgain() {
    if (installed()) return false;
    try {
      const dismissed = Number(localStorage.getItem(DISMISSED_KEY) || 0);
      return !dismissed || Date.now() - dismissed > DISMISS_DAYS * 86400000;
    } catch (_) { return true; }
  }
  function markInstalled() {
    try { localStorage.setItem(INSTALLED_KEY, "1"); localStorage.removeItem(DISMISSED_KEY); } catch (_) {}
    if (card) card.remove();
    card = null;
    promptShown = false;
  }
  function closeCard(dismiss) {
    if (!card) return;
    if (dismiss) {
      try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch (_) {}
    }
    card.remove();
    card = null;
  }
  function createCard() {
    if (card || installed() || !canPromptAgain() || !document.body) return;
    card = document.createElement("section");
    card.id = "joes-pwa-install-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-labelledby", "joes-pwa-install-title");
    card.setAttribute("aria-describedby", "joes-pwa-install-description");
    card.innerHTML =
      '<style>' +
      '#joes-pwa-install-card{position:fixed;z-index:2147483000;right:18px;bottom:18px;width:min(370px,calc(100vw - 28px));box-sizing:border-box;padding:19px;border:1px solid #e5e7eb;border-radius:20px;background:#fff;color:#111827;box-shadow:0 18px 60px rgba(15,23,42,.24);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
      '#joes-pwa-install-card *{box-sizing:border-box}#joes-pwa-install-card .jpwa-head{display:flex;gap:12px;align-items:center;margin-bottom:10px}' +
      '#joes-pwa-install-card .jpwa-icon{width:46px;height:46px;flex:none;border-radius:12px}#joes-pwa-install-card h2{margin:0;font-size:17px;font-weight:750;letter-spacing:-.02em}' +
      '#joes-pwa-install-card p{margin:6px 0 15px;color:#4b5563;font-size:13px}#joes-pwa-install-card .jpwa-actions{display:flex;gap:9px}' +
      '#joes-pwa-install-card button{min-height:42px;border:0;border-radius:11px;padding:10px 13px;font:650 13px system-ui;cursor:pointer}' +
      '#joes-pwa-install-card .jpwa-install{flex:1;background:#111827;color:#fff}#joes-pwa-install-card .jpwa-later{background:#f3f4f6;color:#374151}' +
      '#joes-pwa-install-card .jpwa-close{position:absolute;right:10px;top:8px;background:transparent;color:#6b7280;padding:4px 8px;min-height:30px}' +
      '@media(max-width:480px){#joes-pwa-install-card{right:10px;bottom:10px;width:calc(100vw - 20px);padding:16px}}' +
      '@media(prefers-reduced-motion:no-preference){#joes-pwa-install-card{animation:jpwa-in .22s ease-out}@keyframes jpwa-in{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}}' +
      '</style>' +
      '<button class="jpwa-close" type="button" aria-label="Close install prompt">✕</button>' +
      '<div class="jpwa-head"><img class="jpwa-icon" src="./favicon.svg" alt=""><div><h2 id="joes-pwa-install-title">Install Joes Studio</h2><span style="color:#6b7280;font-size:12px">Your workspace, one tap away</span></div></div>' +
      '<p id="joes-pwa-install-description">Add Joes Studio to your phone or computer for a convenient app-like experience. Your existing website account still works.</p>' +
      '<div class="jpwa-actions"><button class="jpwa-install" type="button">Install app</button><button class="jpwa-later" type="button">Not now</button></div>';
    document.body.appendChild(card);
    card.querySelector(".jpwa-close").addEventListener("click", () => closeCard(true));
    card.querySelector(".jpwa-later").addEventListener("click", () => closeCard(true));
    card.querySelector(".jpwa-install").addEventListener("click", installApp);
    promptShown = true;
  }
  async function installApp() {
    if (installed()) { markInstalled(); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") closeCard(false);
      } catch (_) {}
      deferredPrompt = null;
      return;
    }
    if (!card) return;
    const description = card.querySelector("#joes-pwa-install-description");
    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAppleMobile) {
      description.textContent = 'In Safari, tap Share, then choose “Add to Home Screen”.';
    } else if (isAndroid) {
      description.textContent = 'Open this page in Chrome, tap the browser menu (⋮), then choose “Install app” or “Add to Home screen”.';
    } else {
      description.textContent = 'Use your browser menu and choose “Install Joes Studio” or “Install page as app” if available.';
    }
    card.querySelector(".jpwa-install").textContent = "Got it";
    card.querySelector(".jpwa-install").onclick = () => closeCard(true);
  }
  window.addEventListener("beforeinstallprompt", event => {
    if (installed()) return;
    event.preventDefault();
    deferredPrompt = event;
    if (!promptShown && canPromptAgain()) createCard();
  });
  window.addEventListener("appinstalled", markInstalled);
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}), { once: true });
  }
  function bootPrompt() {
    if (installed() || !canPromptAgain()) return;
    if (!promptShown) createCard();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(bootPrompt, 4500), { once: true });
  else setTimeout(bootPrompt, 4500);
  window.matchMedia("(display-mode: standalone)").addEventListener?.("change", event => { if (event.matches) markInstalled(); });
})();
