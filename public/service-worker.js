self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SHOW_REMINDER_NOTIFICATION') {
    return;
  }

  const { title, body, icon, tag, url } = event.data.payload ?? {};

  event.waitUntil(
    self.registration.showNotification(title ?? 'Pendler Alarm', {
      body,
      icon,
      badge: icon,
      tag,
      data: {
        url: url ?? '/',
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? '/'));
});
