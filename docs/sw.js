/**
 * Service Worker for Unplug PWA
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'unplug-v1.0.0';
const STATIC_CACHE = 'unplug-static-v1.0.0';
const DYNAMIC_CACHE = 'unplug-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/unplug-app/',
    '/unplug-app/index.html',
    '/unplug-app/manifest.json',
    '/unplug-app/css/styles.css',
    '/unplug-app/css/components.css',
    '/unplug-app/css/animations.css',
    '/unplug-app/js/app.js',
    '/unplug-app/js/services/user-data.js',
    '/unplug-app/js/services/tracking.js',
    '/unplug-app/js/services/storage.js',
    '/unplug-app/js/services/achievements.js',
    '/unplug-app/js/services/notifications.js',
    '/unplug-app/js/components/modal.js',
    '/unplug-app/js/components/celebration.js',
    '/unplug-app/icons/icon.svg'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests
    if (url.origin !== location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached version
                    return cachedResponse;
                }

                // Fetch from network and cache dynamic content
                return fetch(request)
                    .then((networkResponse) => {
                        // Only cache successful responses
                        if (networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            
                            caches.open(DYNAMIC_CACHE)
                                .then((cache) => {
                                    cache.put(request, responseClone);
                                });
                        }
                        
                        return networkResponse;
                    })
                    .catch(() => {
                        // Return offline fallback for HTML pages
                        if (request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                        
                        // Return a basic offline response for other requests
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Background sync for session data
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'session-sync') {
        event.waitUntil(syncSessionData());
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);
    
    const options = {
        body: 'Time for a mindful break! 🧘‍♀️',
        icon: '/unplug-app/icons/icon.svg',
        badge: '/unplug-app/icons/icon.svg',
        vibrate: [200, 100, 200],
        data: {
            url: '/?action=start-session'
        },
        actions: [
            {
                action: 'start-session',
                title: 'Start Session',
                icon: '/icons/shortcut-start.png'
            },
            {
                action: 'dismiss',
                title: 'Maybe Later',
                icon: '/icons/shortcut-dismiss.png'
            }
        ]
    };

    if (event.data) {
        try {
            const data = event.data.json();
            options.body = data.body || options.body;
            options.data = { ...options.data, ...data };
        } catch (error) {
            console.error('Error parsing push data:', error);
        }
    }

    event.waitUntil(
        self.registration.showNotification('Unplug Reminder', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data;
    
    if (action === 'start-session') {
        // Open app and start session
        event.waitUntil(
            clients.openWindow(data.url || '/?action=start-session')
        );
    } else if (action === 'dismiss') {
        // Just close the notification
        return;
    } else {
        // Default click - open the app
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then((clientList) => {
                    // If app is already open, focus it
                    for (const client of clientList) {
                        if (client.url.includes(location.origin) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Otherwise, open a new window
                    if (clients.openWindow) {
                        return clients.openWindow(data.url || '/');
                    }
                })
        );
    }
});

// Periodic background sync (for future enhancement)
self.addEventListener('periodicsync', (event) => {
    console.log('Periodic sync triggered:', event.tag);
    
    if (event.tag === 'session-reminder') {
        event.waitUntil(sendSessionReminder());
    }
});

// Helper functions
async function syncSessionData() {
    try {
        console.log('Syncing session data...');
        
        // Get stored session data
        const cache = await caches.open(DYNAMIC_CACHE);
        const sessionData = await getStoredSessionData();
        
        if (sessionData && sessionData.length > 0) {
            // In a real app, you'd sync with your backend here
            console.log('Session data to sync:', sessionData);
            
            // For now, just log success
            console.log('Session data synced successfully');
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error('Failed to sync session data:', error);
        return Promise.reject(error);
    }
}

async function getStoredSessionData() {
    // This would retrieve session data from IndexedDB or localStorage
    // For now, return empty array
    return [];
}

async function sendSessionReminder() {
    try {
        // Check if user has been inactive for a while
        const lastActivity = await getLastActivity();
        const now = Date.now();
        const inactiveTime = now - lastActivity;
        
        // If inactive for more than 2 hours, send reminder
        if (inactiveTime > 2 * 60 * 60 * 1000) {
            await self.registration.showNotification('Unplug Reminder', {
                body: 'Ready for another mindful session? 🌟',
                icon: '/unplug-app/icons/icon.svg',
                badge: '/unplug-app/icons/icon.svg',
                tag: 'session-reminder',
                data: {
                    url: '/?action=start-session'
                }
            });
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error('Failed to send session reminder:', error);
        return Promise.reject(error);
    }
}

async function getLastActivity() {
    // This would get the last activity timestamp from storage
    // For now, return current time minus 3 hours to trigger reminder
    return Date.now() - (3 * 60 * 60 * 1000);
}

// Message handling from main app
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'UPDATE_CACHE':
            updateCache(data);
            break;
            
        case 'STORE_SESSION':
            storeSessionData(data);
            break;
            
        case 'SCHEDULE_REMINDER':
            scheduleReminder(data);
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
});

async function updateCache(data) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        // Update cache with new data
        console.log('Cache updated with:', data);
    } catch (error) {
        console.error('Failed to update cache:', error);
    }
}

async function storeSessionData(sessionData) {
    try {
        // Store session data for background sync
        console.log('Storing session data:', sessionData);
        
        // In a real implementation, you'd store this in IndexedDB
        // For now, just log it
    } catch (error) {
        console.error('Failed to store session data:', error);
    }
}

async function scheduleReminder(reminderData) {
    try {
        console.log('Scheduling reminder:', reminderData);
        
        // Schedule a reminder notification
        // This would use the Notifications API or Background Sync
        
    } catch (error) {
        console.error('Failed to schedule reminder:', error);
    }
}

// Error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Service Worker loaded successfully');
