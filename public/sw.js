const CACHE_NAME = 'transcriu-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/library',
  '/settings',
  '/manifest.json',
  '/logo.png',
  '/logo2.png',
  '/logo3.png'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If network fails, try to serve a fallback page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            throw new Error('Network failed and no cache available');
          });
      })
  );
});

// Background sync for offline uploads (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-upload') {
    console.log('Service Worker: Background sync triggered for uploads');
    event.waitUntil(processOfflineUploads());
  }
});

// Process offline uploads when connection is restored
async function processOfflineUploads() {
  try {
    // Get pending uploads from IndexedDB or localStorage
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        await retryUpload(upload);
        await removePendingUpload(upload.id);
      } catch (error) {
        console.error('Failed to retry upload:', error);
      }
    }
  } catch (error) {
    console.error('Error processing offline uploads:', error);
  }
}

// Helper functions for offline upload management
async function getPendingUploads() {
  // This would typically use IndexedDB
  // For now, return empty array as placeholder
  return [];
}

async function retryUpload(upload) {
  // Retry the upload to the server
  const formData = new FormData();
  formData.append('audio', upload.file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Upload retry failed');
  }
  
  return response.json();
}

async function removePendingUpload(uploadId) {
  // Remove from IndexedDB or localStorage
  console.log('Removing pending upload:', uploadId);
}

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/dashboard')
  );
});