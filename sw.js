/**
 * Service Worker
 * Handles caching strategies for offline functionality
 */

const CACHE_NAME = 'geosnap-v1';
const STATIC_CACHE = 'geosnap-static-v1';
const DYNAMIC_CACHE = 'geosnap-dynamic-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/main.css',
    '/css/views.css',
    '/js/app.js',
    '/js/storage.js',
    '/js/geolocation.js',
    '/js/camera.js',
    '/js/map.js',
    '/manifest.json',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png'
];

/**
 * Install Event
 * Cache static assets when service worker is installed
 */
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Installation complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

/**
 * Activate Event
 * Clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activation complete');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch Event
 * Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Different strategies for different request types
    if (STATIC_ASSETS.includes(url.pathname)) {
        // Cache First for static assets
        event.respondWith(cacheFirst(request));
    } else if (url.hostname === 'unpkg.com' || url.hostname.includes('tile.openstreetmap.org')) {
        // Cache First for external libraries and map tiles
        event.respondWith(cacheFirst(request));
    } else if (url.hostname === 'nominatim.openstreetmap.org') {
        // Network First for geocoding API (but cache as fallback)
        event.respondWith(networkFirst(request));
    } else {
        // Network First for everything else
        event.respondWith(networkFirst(request));
    }
});

/**
 * Cache First Strategy
 * Try cache first, fall back to network
 */
async function cacheFirst(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Not in cache, fetch from network
        const networkResponse = await fetch(request);

        // Cache the response for future use
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Cache First failed:', error);

        // If both cache and network fail, return offline page or fallback
        return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

/**
 * Network First Strategy
 * Try network first, fall back to cache
 */
async function networkFirst(request) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);

        try {
            // Try network first
            const networkResponse = await fetch(request);

            // Cache successful responses
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }

            return networkResponse;
        } catch (networkError) {
            // Network failed, try cache
            console.log('[Service Worker] Network failed, trying cache:', request.url);
            const cachedResponse = await cache.match(request);

            if (cachedResponse) {
                return cachedResponse;
            }

            throw networkError;
        }
    } catch (error) {
        console.error('[Service Worker] Network First failed:', error);

        return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

/**
 * Background Sync (for future enhancement)
 * Could be used to sync photos when connection is restored
 */
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);

    if (event.tag === 'sync-photos') {
        event.waitUntil(syncPhotos());
    }
});

async function syncPhotos() {
    // Placeholder for future sync functionality
    console.log('[Service Worker] Syncing photos...');
}

/**
 * Push Notifications (for future enhancement)
 */
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push notification received');

    const options = {
        body: event.data ? event.data.text() : 'New update available',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-192x192.png'
    };

    event.waitUntil(
        self.registration.showNotification('GeoSnap', options)
    );
});
