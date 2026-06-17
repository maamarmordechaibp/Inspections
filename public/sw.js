const CACHE_NAME = 'dousefire-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/inspections',
  '/schedule',
  '/assets',
  '/customers',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip Supabase API calls — they need real network
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline — try cache
        return caches.match(event.request).then((cached) => {
          return cached || new Response(
            JSON.stringify({ offline: true, message: 'You are offline. Cached data is shown.' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
  );
});

// Listen for sync events (background sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inspections') {
    event.waitUntil(syncInspections());
  }
  if (event.tag === 'sync-deficiencies') {
    event.waitUntil(syncDeficiencies());
  }
});

async function syncInspections() {
  // This would sync queued inspection data when back online
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE', queue: 'inspections' });
  });
}

async function syncDeficiencies() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE', queue: 'deficiencies' });
  });
}