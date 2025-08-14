// Service Worker for Driver Support App
const CACHE_NAME = 'driver-support-v1.0.0';
const STATIC_CACHE_NAME = 'driver-support-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'driver-support-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/js/app.js',
    '/js/data-manager.js',
    '/js/time-tracker.js',
    '/js/location-service.js',
    '/js/alerts.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('✅ Static files cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName.startsWith('driver-support-')) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests
    if (STATIC_FILES.includes(url.pathname) || url.pathname === '/') {
        // Static files - cache first strategy
        event.respondWith(cacheFirstStrategy(request));
    } else if (url.pathname.startsWith('/api/') || url.pathname.includes('weather')) {
        // API requests - network first strategy
        event.respondWith(networkFirstStrategy(request));
    } else if (url.pathname.startsWith('/icons/') || 
               url.pathname.startsWith('/screenshots/') ||
               request.destination === 'image') {
        // Images - cache first strategy
        event.respondWith(cacheFirstStrategy(request));
    } else {
        // Other requests - network first with cache fallback
        event.respondWith(networkFirstStrategy(request));
    }
});

// Cache first strategy (for static files and images)
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // Cache the response for future use
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('❌ Cache first strategy failed:', error);
        
        // Return offline page or placeholder if available
        if (request.destination === 'document') {
            const offlineResponse = await caches.match('/index.html');
            return offlineResponse || new Response('App offline', { status: 503 });
        }
        
        // Return placeholder image for images
        if (request.destination === 'image') {
            return new Response('', { status: 204 });
        }
        
        throw error;
    }
}

// Network first strategy (for API calls and dynamic content)
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('⚠️ Network request failed, trying cache:', request.url);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return appropriate offline response
        if (request.url.includes('weather')) {
            return new Response(JSON.stringify({
                temperature: '--',
                description: 'Offline',
                location: 'Unknown'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        throw error;
    }
}

// Background sync for data synchronization
self.addEventListener('sync', event => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-driver-data') {
        event.waitUntil(syncDriverData());
    } else if (event.tag === 'sync-location-data') {
        event.waitUntil(syncLocationData());
    }
});

// Sync driver data when connection is restored
async function syncDriverData() {
    try {
        console.log('📤 Syncing driver data...');
        
        // Get data from IndexedDB or localStorage
        const data = await getStoredData();
        
        if (data && data.needsSync) {
            // Send data to server (placeholder)
            // await fetch('/api/sync', {
            //     method: 'POST',
            //     body: JSON.stringify(data),
            //     headers: { 'Content-Type': 'application/json' }
            // });
            
            console.log('✅ Driver data synced successfully');
            
            // Mark data as synced
            await markDataAsSynced();
        }
    } catch (error) {
        console.error('❌ Failed to sync driver data:', error);
    }
}

// Sync location data
async function syncLocationData() {
    try {
        console.log('📍 Syncing location data...');
        
        // Placeholder for location data sync
        // In a real app, this would sync GPS tracks to server
        
        console.log('✅ Location data synced successfully');
    } catch (error) {
        console.error('❌ Failed to sync location data:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    console.log('🔔 Push notification received');
    
    const options = {
        body: 'You have a new notification from Driver Support',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Open App',
                icon: '/icons/icon-192x192.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };
    
    if (event.data) {
        const data = event.data.json();
        options.body = data.message || options.body;
        options.data = { ...options.data, ...data };
    }
    
    event.waitUntil(
        self.registration.showNotification('Driver Support', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('🔔 Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then(clientList => {
                    // If app is already open, focus it
                    for (const client of clientList) {
                        if (client.url === '/' && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Otherwise, open new window
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    }
});

// Handle message from main thread
self.addEventListener('message', event => {
    console.log('💌 Message received from main thread:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data && event.data.type === 'SYNC_DATA') {
        // Trigger background sync
        self.registration.sync.register('sync-driver-data');
    } else if (event.data && event.data.type === 'CACHE_UPDATE') {
        // Update cache
        updateCache();
    }
});

// Update cache
async function updateCache() {
    try {
        console.log('🔄 Updating cache...');
        
        const cache = await caches.open(STATIC_CACHE_NAME);
        await cache.addAll(STATIC_FILES);
        
        console.log('✅ Cache updated successfully');
    } catch (error) {
        console.error('❌ Failed to update cache:', error);
    }
}

// Utility functions for data management
async function getStoredData() {
    // Placeholder for getting data from IndexedDB
    // In a real app, this would retrieve unsynchronized data
    return null;
}

async function markDataAsSynced() {
    // Placeholder for marking data as synchronized
    // In a real app, this would update the sync status in IndexedDB
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    console.log('⏰ Periodic sync triggered:', event.tag);
    
    if (event.tag === 'daily-sync') {
        event.waitUntil(performDailySync());
    }
});

async function performDailySync() {
    try {
        console.log('📅 Performing daily sync...');
        
        // Sync daily reports, fuel data, etc.
        await syncDriverData();
        await syncLocationData();
        
        // Clean up old data
        await cleanupOldData();
        
        console.log('✅ Daily sync completed');
    } catch (error) {
        console.error('❌ Daily sync failed:', error);
    }
}

async function cleanupOldData() {
    try {
        // Clean up old cache entries
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name.startsWith('driver-support-') && 
            name !== STATIC_CACHE_NAME && 
            name !== DYNAMIC_CACHE_NAME
        );
        
        await Promise.all(oldCaches.map(cacheName => caches.delete(cacheName)));
        
        console.log('🧹 Old cache data cleaned up');
    } catch (error) {
        console.error('❌ Failed to clean up old data:', error);
    }
}

// Handle fetch errors gracefully
self.addEventListener('error', event => {
    console.error('❌ Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('❌ Service Worker unhandled rejection:', event.reason);
});

console.log('🚛 Driver Support Service Worker loaded');