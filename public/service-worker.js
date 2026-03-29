let appVersion = new URL(self.location.href).searchParams.get('appVersion') || 'v0.0.0';

const broadcastToClients = async (message) => {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  clients.forEach((client) => {
    client.postMessage(message);
  });
};

const broadcastStatus = async () => {
  await broadcastToClients({
    type: 'SERVICE_WORKER_STATUS',
    payload: {
      version: appVersion,
      isActive: true,
    },
  });
};

const clearRuntimeCaches = async () => {
  const cacheKeys = await caches.keys();
  await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
};

const notifyClientsToRefresh = async () => {
  await broadcastToClients({
    type: 'SERVICE_WORKER_REFRESH_REQUIRED',
    payload: {
      version: appVersion,
    },
  });
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await clearRuntimeCaches();
    await self.clients.claim();
    await broadcastStatus();
    await notifyClientsToRefresh();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_APP_VERSION') {
    const nextVersion = event.data.payload?.version;

    if (typeof nextVersion === 'string' && nextVersion.trim()) {
      appVersion = nextVersion.trim();
    }

    event.waitUntil(broadcastStatus());
    return;
  }

  if (event.data?.type !== 'SHOW_REMINDER_NOTIFICATION') {
    return;
  }

  const { title, body, icon, tag, url } = event.data.payload ?? {};

  event.waitUntil((async () => {
    try {
      await self.registration.showNotification(title ?? 'Pendler Alarm', {
        body,
        icon,
        badge: icon,
        tag,
        data: {
          url: url ?? '/',
          version: appVersion,
        },
      });

      await broadcastToClients({
        type: 'DEBUG_NOTIFICATION_RESULT',
        payload: {
          ok: true,
          tag: tag ?? null,
        },
      });
    } catch (error) {
      await broadcastToClients({
        type: 'DEBUG_NOTIFICATION_RESULT',
        payload: {
          ok: false,
          tag: tag ?? null,
          error: error instanceof Error ? error.message : 'Unknown notification error',
        },
      });
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? '/'));
});
