// service-worker.js — app shell cached and versioned; navigation network-first so
// a stale shell never outlives a deploy. Bump CACHE_VERSION on any shipped file.
const CACHE_VERSION = "rc-v5";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./icon.svg",
  "./data.js",
  "./data-house-roomtypes.js",
  "./data-mythic.js",
  "./src/core.js",
  "./src/ui.js",
  "./src/rules.js",
  "./src/derived.js",
  "./src/settings.js",
  "./src/store.js",
  "./src/roller.js",
  "./src/mythic.js",
  "./src/wizard.js",
  "./src/sheet.js",
  "./src/lifecycle.js",
  "./src/screens.js",
  "./src/tutorial.js",
  "./src/router.js",
  "./src/main.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(SHELL)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Navigations: network first, cache as the basement fallback.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Everything else: cache first, revalidate in the background.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
