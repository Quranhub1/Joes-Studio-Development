"use strict";
const CACHE_PREFIX = "joes-studio-shell-";
const CACHE_NAME = CACHE_PREFIX + "v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./static/tailwindcss.js",
  "./static/SourceHanSerifCN-Bold.ttf",
  "./static/reload-popup.js",
  "./static/pwa-install.js",
  "./static/offline-status.js",
  "./static/monetization-config.js",
  "./static/monetization.js",
  "./static/student-batch.js",
  "./static/student-ai-upscaler.js",
  "./static/student-photo-enhancer.js",
  "./static/fabric.min.js",
  "./static/jspdf.umd.min.js",
  "./static/svg2pdf.umd.min.js",
  "./static/hotkeys-js.min.js",
  "./static/toastify-js.js",
  "./static/coloris.min.js",
  "./static/xlsx.full.min.js",
  "./static/jszip.min.js",
  "./static/idb-keyval.umd.js",
  "./static/bwip-js.min.js",
  "./static/icons.min.css",
  "./static/coloris.min.css",
  "./static/toastify.min.css"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function assetCacheKey(url) {
  // HTML references versioned assets with query strings. Normalize to the path so
  // unversioned app-shell entries also satisfy those requests offline.
  return url.origin + url.pathname;
}

function isCacheableAsset(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (url.pathname.indexOf("/api/") !== -1) return false;
  if (url.pathname.endsWith(".html") || url.pathname.endsWith("/")) return false;
  return /\.(?:js|mjs|css|svg|png|jpe?g|webp|gif|bmp|woff2?|ttf|otf|ico|webmanifest)$/i.test(url.pathname);
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.indexOf("/api/") !== -1) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  if (isCacheableAsset(request, url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        const key = assetCacheKey(url);
        return cache.match(key).then(cached => {
          const networkUpdate = fetch(request).then(response => {
            if (response && response.ok && response.type === "basic" && !response.headers.get("Cache-Control")?.includes("no-store")) {
              cache.put(key, response.clone()).catch(() => {});
            }
            return response;
          }).catch(error => {
            if (cached) return cached;
            throw error;
          });
          return cached || networkUpdate;
        });
      })
    );
    return;
  }

  if (url.pathname.endsWith(".webmanifest") || url.pathname.endsWith(".svg")) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).catch(() => {});
        return response;
      }))
    );
  }
});
