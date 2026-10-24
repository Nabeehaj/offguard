// OffGuard service worker: makes the app installable and shows push alerts,
// even while the driver is in Google Maps or another app.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Minimal network-first fetch handler (required for installability).
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'OffGuard', body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'OffGuard wildlife alert', {
      body: data.body || 'Wildlife reported ahead. Slow down.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'offguard',
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 600],
      data: { url: data.url || '/drive' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/drive';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => new URL(w.url).pathname === url);
      return open ? open.focus() : self.clients.openWindow(url);
    })
  );
});
