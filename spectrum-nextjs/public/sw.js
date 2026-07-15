/* Spectrum Connect service worker — Web Push + notification clicks. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }

  const title = data.title || 'Spectrum Connect';
  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/spectrum-logo.svg',
    badge: '/assets/spectrum-logo.svg',
    tag: data.tag || 'spectrum',
    renotify: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab if one is already open, else open a new one.
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) { try { client.navigate(target); } catch (_) {} }
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
