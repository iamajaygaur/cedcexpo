/* CEDC Expo — minimal service worker
 * Caches static brand/icons only.
 * NEVER caches /admin, /judge, /api, /login, or evaluation payloads.
 */

const CACHE = "cedc-static-v1";
const ALLOW_PREFIXES = ["/icons/", "/brand/", "/manifest.webmanifest"];

function isAuthPath(pathname) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/judge") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/icons/apple-touch-icon.png",
        "/brand/cedc-mark.png",
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isAuthPath(url.pathname)) return; // network only — no respondWith cache

  const allowed = ALLOW_PREFIXES.some((p) => url.pathname.startsWith(p));
  if (!allowed) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            void caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
