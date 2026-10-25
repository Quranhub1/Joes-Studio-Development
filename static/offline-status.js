(function () {
  "use strict";
  var banner = null;
  var hideTimer = null;

  function ensureBanner() {
    if (banner || !document.body) return banner;
    banner = document.createElement("div");
    banner.id = "joes-studio-connection-status";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.style.cssText = "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147482000;max-width:calc(100vw - 24px);padding:10px 15px;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.2);font:600 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;display:none";
    document.body.appendChild(banner);
    return banner;
  }

  function show(message, offline) {
    var node = ensureBanner();
    if (!node) return;
    if (hideTimer) window.clearTimeout(hideTimer);
    node.textContent = message;
    node.style.background = offline ? "#7f1d1d" : "#14532d";
    node.style.color = "#fff";
    node.style.display = "block";
    if (!offline) hideTimer = window.setTimeout(function () { node.style.display = "none"; }, 3500);
  }

  function update() {
    if (!navigator.onLine) {
      show("You are offline. Cached tools and files may still work; account, billing and sync need internet.", true);
    } else if (banner && banner.style.display !== "none") {
      show("Connection restored. Reconnect to sync your work and refresh account access.", false);
    }
  }

  window.addEventListener("offline", update);
  window.addEventListener("online", update);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", update, { once: true });
  } else {
    update();
  }
})();
