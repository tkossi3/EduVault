/* Cache exclusivement l’interface publique, jamais les API ni les documents. */
const CACHE_NAME = "eduvault-shell-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/pages/parcours.html", "/pages/document-view.html", "/pages/upload.html", "/pages/profile.html", "/pages/notifications.html", "/styles/variables.css", "/styles/main.css", "/styles/pages.css", "/styles/animations.css", "/styles/components.css", "/scripts/config.js", "/scripts/theme.js", "/scripts/auth.js", "/scripts/cursor.js", "/scripts/notifications.js", "/scripts/app.js", "/scripts/catalog.js", "/scripts/upload.js", "/scripts/profile.js", "/scripts/notifications-page.js", "/scripts/pdf-viewer.js", "/scripts/service-worker.js", "/assets/eduvault.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(request).then((response) => {
    if (response.ok && (request.mode === "navigate" || APP_SHELL.includes(url.pathname))) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(async () => (await caches.match(request)) || caches.match("/index.html")));
});