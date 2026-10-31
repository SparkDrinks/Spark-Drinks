/* Offline copy of the app so it still opens when the hall has no signal.
   Pages: fresh from the network when possible, saved copy when not.
   Libraries and fonts: saved copy first, refreshed in the background.
   Live data (Firebase) is never touched here. */
const CACHE = "hostmode-v2";
const LIBS = /^https:\/\/(www\.gstatic\.com\/firebasejs|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["games.html", "index.html", "drinks.html"]).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (same && (req.mode === "navigate" || /\.html$/.test(url.pathname) || url.pathname.endsWith("/"))) {
    e.respondWith(
      fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(url.pathname, c)); } return r; })
        .catch(() => caches.match(url.pathname).then(r => r || caches.match("games.html")))
    );
    return;
  }
  if (LIBS.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
