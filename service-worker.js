// service-worker.js — app shell cached and versioned, and served NETWORK-FIRST
// for every request: with a connection you always get the current code, and
// the cache is there for the basement where the game is actually played.
// (An earlier cache-first version handed a reload stale modules while it
// revalidated behind — the "museum of last month's rules" failure, audit A-32.)
// Bump CACHE_VERSION on any shipped file; that is what raises the update toast.
const CACHE_VERSION = "rc-v6";
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
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req.mode === "navigate" ? "./index.html" : req)
        .then(hit => hit || (req.mode === "navigate" ? caches.match("./") : undefined))
        .then(hit => hit || new Response("Offline and not cached.", { status: 503, headers: { "content-type": "text/plain" } }))
    )
  );
});
