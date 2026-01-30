// GhostLink Service Worker for PWA functionality
const CACHE_NAME = 'ghostlink-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json'
];

// External CDN assets to cache opportunistically
const CDN_ASSETS = [
    'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Cache local assets only (these are guaranteed to succeed)
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.log('Cache installation failed:', err);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached response if found
                if (response) {
                    return response;
                }
                // Otherwise fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses or non-GET requests
                        if (!response || !response.ok || event.request.method !== 'GET') {
                            return response;
                        }
                        // Cache the response
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                        return response;
                    })
                    .catch((err) => {
                        // Network failed, return a simple offline response for HTML requests
                        if (event.request.headers.get('accept')?.includes('text/html')) {
                            return new Response('<html><body><h1>GhostLink Offline</h1><p>Please check your internet connection.</p></body></html>', {
                                headers: { 'Content-Type': 'text/html' }
                            });
                        }
                        throw err;
                    });
            })
    );
});
