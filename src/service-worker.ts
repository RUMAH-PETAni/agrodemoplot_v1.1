/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;

const ASSETS = [
  ...build, // Compiled JS/CSS files
  ...files  // Files in static/ directory
];

self.addEventListener('install', (event: any) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event: any) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event: any) => {
  if (event.request.method !== 'GET') return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

    // Serve build assets from cache immediately
    if (ASSETS.includes(url.pathname)) {
      const cachedResponse = await cache.match(url.pathname);
      if (cachedResponse) return cachedResponse;
    }

    // Network first for other requests
    try {
      const response = await fetch(event.request);
      
      // Cache Map Tile imagery & external static fonts locally to speed up maps
      if (response.status === 200 && (
        url.host.includes('tile.openstreetmap.org') || 
        url.host.includes('arcgisonline.com') ||
        url.host.includes('googleapis.com') || 
        url.host.includes('gstatic.com')
      )) {
        cache.put(event.request, response.clone());
      }
      
      return response;
    } catch (err) {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;
      throw err;
    }
  }

  event.respondWith(respond());
});
