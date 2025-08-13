const CACHE_NAME = ‘truck-driver-v1.2’;
const urlsToCache = [
‘./’,
‘./index.html’,
‘./manifest.json’,
‘data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='%23fbbf24'%3E%3Crect x='8' y='20' width='48' height='24' rx='4' fill='%23374151'/%3E%3Crect x='12' y='16' width='40' height='8' rx='2' fill='%23fbbf24'/%3E%3Ccircle cx='18' cy='50' r='6' fill='%23374151'/%3E%3Ccircle cx='46' cy='50' r='6' fill='%23374151'/%3E%3Ccircle cx='18' cy='50' r='3' fill='%23fbbf24'/%3E%3Ccircle cx='46' cy='50' r='3' fill='%23fbbf24'/%3E%3Cpath d='M24 24h16v8H24z' fill='%2393c5fd'/%3E%3C/svg%3E’
];

// Install event
self.addEventListener(‘install’, event => {
console.log(’[SW] Installing…’);
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => {
console.log(’[SW] Caching app shell’);
return cache.addAll(urlsToCache);
})
.then(() => {
console.log(’[SW] Installation complete’);
return self.skipWaiting();
})
);
});

// Activate event
self.addEventListener(‘activate’, event => {
console.log(’[SW] Activating…’);
event.waitUntil(
caches.keys().then(cacheNames => {
return Promise.all(
cacheNames.map(cacheName => {
if (cacheName !== CACHE_NAME) {
console.log(’[SW] Deleting old cache:’, cacheName);
return caches.delete(cacheName);
}
})
);
}).then(() => {
console.log(’[SW] Activation complete’);
return self.clients.claim();
})
);
});

// Fetch event
self.addEventListener(‘fetch’, event => {
// Skip cross-origin requests and non-GET requests
if (!event.request.url.startsWith(self.location.origin) || event.request.method !== ‘GET’) {
return;
}

event.respondWith(
caches.match(event.request)
.then(response => {
// Return cached version if available
if (response) {
console.log(’[SW] Serving from cache:’, event.request.url);
return response;
}

```
    // Otherwise fetch from network
    console.log('[SW] Fetching from network:', event.request.url);
    return fetch(event.request).then(response => {
      // Don't cache if not a valid response
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }

      // Clone the response
      const responseToCache = response.clone();

      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(event.request, responseToCache);
        });

      return response;
    });
  }).catch(() => {
    // Return offline page for navigation requests
    if (event.request.mode === 'navigate') {
      return caches.match('./');
    }
  })
```

);
});

// Background sync for saving data when back online
self.addEventListener(‘sync’, event => {
if (event.tag === ‘background-sync’) {
console.log(’[SW] Background sync triggered’);
event.waitUntil(doBackgroundSync());
}
});

async function doBackgroundSync() {
// This would sync pending data when connection is restored
console.log(’[SW] Performing background sync’);
}

// Push notification handling
self.addEventListener(‘push’, event => {
console.log(’[SW] Push received’);

const options = {
body: event.data ? event.data.text() : ‘Reminder from Truck Driver App’,
icon: ‘data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='%23fbbf24'%3E%3Crect x='8' y='20' width='48' height='24' rx='4' fill='%23374151'/%3E%3Crect x='12' y='16' width='40' height='8' rx='2' fill='%23fbbf24'/%3E%3Ccircle cx='18' cy='50' r='6' fill='%23374151'/%3E%3Ccircle cx='46' cy='50' r='6' fill='%23374151'/%3E%3Ccircle cx='18' cy='50' r='3' fill='%23fbbf24'/%3E%3Ccircle cx='46' cy='50' r='3' fill='%23fbbf24'/%3E%3Cpath d='M24 24h16v8H24z' fill='%2393c5fd'/%3E%3C/svg%3E’,
badge: ‘data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='%23fbbf24'%3E%3Ccircle cx='32' cy='32' r='30' fill='%23ef4444'/%3E%3Ctext x='32' y='38' text-anchor='middle' fill='white' font-size='20' font-weight='bold'%3E!%3C/text%3E%3C/svg%3E’,
vibrate: [200, 100, 200],
requireInteraction: true,
actions: [
{
action: ‘open’,
title: ‘Deschide aplicația’
},
{
action: ‘dismiss’,
title: ‘Închide’
}
]
};

event.waitUntil(
self.registration.showNotification(‘Truck Driver App’, options)
);
});

// Notification click handling
self.addEventListener(‘notificationclick’, event => {
console.log(’[SW] Notification clicked’);
event.notification.close();

if (event.action === ‘open’) {
event.waitUntil(
clients.openWindow(’/’)
);
}
});

// Message handling for communication with main app
self.addEventListener(‘message’, event => {
console.log(’[SW] Message received:’, event.data);

if (event.data && event.data.type === ‘SKIP_WAITING’) {
self.skipWaiting();
}

if (event.data && event.data.type === ‘GET_VERSION’) {
event.ports[0].postMessage({version: CACHE_NAME});
}
});

// Periodic background sync (if supported)
self.addEventListener(‘periodicsync’, event => {
if (event.tag === ‘weekly-report’) {
console.log(’[SW] Periodic sync triggered’);
event.waitUntil(generateWeeklyReport());
}
});

async function generateWeeklyReport() {
// Generate weekly report in background
console.log(’[SW] Generating weekly report’);

// This could send a notification with weekly stats
const options = {
body: ‘Raportul săptămânal este disponibil!’,
icon: ‘data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='%233b82f6'%3E%3Crect x='8' y='8' width='48' height='48' rx='4' fill='white'/%3E%3Cpath d='M16 20h32M16 28h24M16 36h28M16 44h20' stroke='%233b82f6' stroke-width='2'/%3E%3C/svg%3E’,
tag: ‘weekly-report’,
requireInteraction: false
};

self.registration.showNotification(‘Raport Săptămânal’, options);
}
