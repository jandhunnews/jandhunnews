const CACHE_NAME = 'jan-dhun-news-v3';
const APP_SHELL = ['./', './index.html', './styles.css', './branding.css', './pages.css', './script.js', './public-news.js', './pages.js', './manifest.webmanifest', './logo.svg', './cms.html', './cms.css', './cms.js', './category.html', './article.html', './search.html', './about.html', './contact.html', './advertise.html', './join.html', './epaper.html', './privacy.html', './terms.html'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match('./index.html'))));
});
