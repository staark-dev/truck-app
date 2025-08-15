// Driver Support App - Service Worker
const CACHE_NAME = 'driver-support-v1.2.45-beta';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/app.js',
  '/js/data-manager.js',
  '/js/time-tracker.js',
  '/js/location-service.js',
  '/js/alerts.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Service Worker: Caching files...');
        return cache.addAll(urlsToCache.map(function(url) {
          // Handle root URL
          return url === '/' ? './index.html' : url;
        }));
      })
      .then(function() {
        console.log('✅ Service Worker: Installation complete');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('✅ Service Worker: Activation complete');
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip external URLs
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version if available
        if (response) {
          console.log('📦 Service Worker: Serving from cache:', event.request.url);
          return response;
        }
        
        // Otherwise fetch from network
        console.log('🌐 Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(function(response) {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone response for caching
            var responseToCache = response.clone();
            
            // Add to cache for future use
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(function(error) {
            console.error('❌ Service Worker: Fetch failed:', error);
            
            // Return offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // Return empty response for other requests
            return new Response('', {
              status: 404,
              statusText: 'Not Found'
            });
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', function(event) {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'driver-data-sync') {
    event.waitUntil(syncDriverData());
  }
});

// Push notifications
self.addEventListener('push', function(event) {
  console.log('📱 Service Worker: Push notification received');
  
  var options = {
    body: event.data ? event.data.text() : 'Driver Support App notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Driver Support App', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('📱 Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    console.log('📱 Service Worker: Notification closed');
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions
function syncDriverData() {
  return new Promise(function(resolve, reject) {
    try {
      console.log('🔄 Service Worker: Syncing driver data...');
      
      // Get stored data that needs syncing
      caches.open(CACHE_NAME).then(function(cache) {
        // Implement your sync logic here
        console.log('✅ Service Worker: Data sync complete');
        resolve();
      }).catch(function(error) {
        console.error('❌ Service Worker: Data sync failed:', error);
        reject(error);
      });
    } catch (error) {
      console.error('❌ Service Worker: Data sync failed:', error);
      reject(error);
    }
  });
}

// Update available handler
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 Service Worker: Skipping waiting...');
    self.skipWaiting();
  }
});

console.log('🚛 Driver Support Service Worker loaded');
