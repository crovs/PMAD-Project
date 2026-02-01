/**
 * ============================================================================
 * SERVICE WORKER - THE HEART OF PWA OFFLINE FUNCTIONALITY
 * ============================================================================
 * 
 * What is a Service Worker?
 * - A JavaScript file that runs in the background (separate from the webpage)
 * - Acts as a proxy between the app and the network
 * - Intercepts network requests and can serve cached responses
 * - Enables offline functionality
 * 
 * Why do we need it?
 * - Makes the app work offline (PMAD requirement!)
 * - Speeds up loading by caching files
 * - Required for PWA installability
 * 
 * Service Worker Lifecycle:
 * 1. INSTALL → Download and cache files
 * 2. ACTIVATE → Clean up old caches
 * 3. FETCH → Intercept network requests and serve from cache or network
 */

// ============================================================================
// CACHE NAMES - Version control for cached files
// ============================================================================

const CACHE_NAME = 'geosnap-v1';           // Main cache name
const STATIC_CACHE = 'geosnap-static-v1';  // For HTML, CSS, JS files
const DYNAMIC_CACHE = 'geosnap-dynamic-v1'; // For API responses and dynamic content

// ============================================================================
// STATIC ASSETS - Files to cache immediately for offline use
// ============================================================================

const STATIC_ASSETS = [
    '/',                            // Home page
    '/index.html',                  // Main HTML file
    '/css/main.css',               // Main styles
    '/css/views.css',              // View-specific styles
    '/js/app.js',                  // Main app logic
    '/js/storage.js',              // IndexedDB operations
    '/js/geolocation.js',          // GPS functionality
    '/js/camera.js',               // Camera API
    '/js/map.js',                  // Map integration
    '/js/ui.js',                   // UI utilities
    '/manifest.json',              // PWA manifest
    '/assets/icons/icon-192x192.png',  // App icon (small)
    '/assets/icons/icon-512x512.png'   // App icon (large)
];

// ============================================================================
// INSTALL EVENT - Runs when Service Worker is first installed
// ============================================================================

self.addEventListener('install', (event) => {
    console.log('[Service Worker] 📦 Installing...');

    // waitUntil() tells the browser not to terminate the Service Worker
    // until the promise inside completes
    event.waitUntil(
        // Open (or create) the static cache
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[Service Worker] 💾 Caching static assets');
                // Download and store all static files
                // This happens in the background when user first visits the site
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] ✅ Installation complete');
                // skipWaiting() makes the new Service Worker activate immediately
                // Instead of waiting for all tabs to close
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] ❌ Installation failed:', error);
            })
    );
});

// ============================================================================
// ACTIVATE EVENT - Runs when Service Worker becomes active
// ============================================================================

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] 🔄 Activating...');

    event.waitUntil(
        // Get all cache names
        caches.keys()
            .then((cacheNames) => {
                // Delete old caches (version cleanup)
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // If cache name doesn't match current version, delete it
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('[Service Worker] 🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] ✅ Activation complete');
                // claim() makes this Service Worker control all open tabs immediately
                return self.clients.claim();
            })
    );
});

// ============================================================================
// FETCH EVENT - Intercepts all network requests
// ============================================================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // ========== FILTERS ==========

    // Only handle GET requests (not POST, PUT, DELETE, etc.)
    if (request.method !== 'GET') {
        return;
    }

    // Only handle HTTP(S) requests, skip chrome-extension:// etc.
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // ========== CACHING STRATEGIES ==========
    // Different types of content need different strategies

    if (STATIC_ASSETS.includes(url.pathname)) {
        // STRATEGY: Cache First for our app files
        // Why? These files rarely change, serving from cache is fastest
        event.respondWith(cacheFirst(request));
    }
    else if (url.hostname === 'unpkg.com' || url.hostname.includes('tile.openstreetmap.org')) {
        // STRATEGY: Cache First for external libraries and map tiles
        // Why? Leaflet.js and map tiles don't change, save bandwidth
        event.respondWith(cacheFirst(request));
    }
    else if (url.hostname === 'nominatim.openstreetmap.org') {
        // STRATEGY: Network First for geocoding API
        // Why? We want fresh location data, but cache as backup for offline
        event.respondWith(networkFirst(request));
    }
    else {
        // STRATEGY: Network First for everything else
        // Why? Default to fresh content, use cache only if offline
        event.respondWith(networkFirst(request));
    }
});

// ============================================================================
// CACHE FIRST STRATEGY
// ============================================================================
/**
 * Try to serve from cache first, only fetch from network if not in cache
 * Best for: Static files that rarely change (HTML, CSS, JS, images)
 * 
 * Flow:
 * 1. Check if request is in cache → Yes? Return it immediately (FAST!)
 * 2. Not in cache? → Fetch from network
 * 3. Got response from network? → Save it to cache for next time
 * 4. Return the network response
 */
async function cacheFirst(request) {
    try {
        // Open the static cache
        const cache = await caches.open(STATIC_CACHE);

        // Look for this request in the cache
        const cachedResponse = await cache.match(request);

        // If found in cache, return it immediately (lightning fast!)
        if (cachedResponse) {
            console.log('[SW] ⚡ Serving from cache:', request.url);
            return cachedResponse;
        }

        console.log('[SW] 🌐 Not in cache, fetching:', request.url);

        // Not in cache, fetch from network
        const networkResponse = await fetch(request);

        // If successful, save to cache for future use
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
            console.log('[SW] 💾 Cached for next time:', request.url);
        }

        return networkResponse;

    } catch (error) {
        console.error('[SW] ❌ Cache First failed:', error);

        // Both cache AND network failed (rare, but possible)
        // Return a helpful error message
        return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

// ============================================================================
// NETWORK FIRST STRATEGY
// ============================================================================
/**
 * Try network first, fall back to cache if offline
 * Best for: Dynamic content and APIs that change frequently
 * 
 * Flow:
 * 1. Try to fetch from network → Success? Cache it and return
 * 2. Network failed (offline)? → Check cache
 * 3. Found in cache? → Return cached version
 * 4. Not in cache either? → Return error
 */
async function networkFirst(request) {
    try {
        // Open the dynamic cache (for API responses, etc.)
        const cache = await caches.open(DYNAMIC_CACHE);

        try {
            console.log('[SW] 🌐 Trying network first:', request.url);

            // Try to fetch from network
            const networkResponse = await fetch(request);

            // Success! Cache this response for offline use
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
                console.log('[SW] 💾 Cached network response');
            }

            return networkResponse;

        } catch (networkError) {
            // Network request failed (probably offline)
            console.log('[SW] 📵 Network failed, trying cache:', request.url);

            // Try to find cached version
            const cachedResponse = await cache.match(request);

            if (cachedResponse) {
                console.log('[SW] 💾 Serving from cache (offline)');
                return cachedResponse;
            }

            // Neither network nor cache worked
            throw networkError;
        }

    } catch (error) {
        console.error('[SW] ❌ Network First failed:', error);

        return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

// ============================================================================
// BACKGROUND SYNC (Future Enhancement - Not implemented yet)
// ============================================================================
/**
 * Background Sync allows the app to defer actions until the user has connectivity
 * Example use case: If user takes a photo while offline, sync it to cloud when online
 * This is a placeholder for future functionality
 */
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);

    if (event.tag === 'sync-photos') {
        event.waitUntil(syncPhotos());
    }
});

async function syncPhotos() {
    // TODO: Implement cloud sync when user reconnects
    console.log('[Service Worker] Would sync photos here...');
}

// ============================================================================
// PUSH NOTIFICATIONS (Future Enhancement - Not implemented yet)
// ============================================================================
/**
 * Push notifications allow the app to receive messages from a server
 * Example use case: Notify user of new memories shared by friends
 * This is a placeholder for future functionality
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

// ============================================================================
// FOR PRESENTATION - KEY POINTS TO REMEMBER
// ============================================================================
/**
 * 1. Service Worker enables offline functionality (PMAD requirement!)
 * 2. We use TWO caching strategies:
 *    - Cache First: For static files (fast loading)
 *    - Network First: For API calls (fresh data when online)
 * 3. Service Worker lifecycle: Install → Activate → Fetch
 * 4. Everything is cached on first visit, works offline on second visit!
 * 5. This is what makes it a Progressive Web App (PWA)
 */
