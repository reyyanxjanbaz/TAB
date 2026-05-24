const CACHE_NAME = 'tab-v1';
const STATIC_ASSETS = ['/', '/manifest.json'];

// Install: cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

// Push notifications
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch { payload = { title: 'TAB', body: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(payload.title || 'TAB', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data || {},
      tag: 'tab-notification',
      renotify: true,
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click: open / focus the app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  const url = data.sessionId ? `/sessions/${data.sessionId}` : '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const existing = wins.find(w => w.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
