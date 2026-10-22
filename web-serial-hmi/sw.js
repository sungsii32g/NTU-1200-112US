// ========================================================
// MEAN WELL NTU-1200-112US Web HMI - Service Worker
// Cache-First / Stale-While-Revalidate 離線快取引擎
// ========================================================

const CACHE_NAME = 'ntu1200-pwa-v1.0.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.ico'
];

// 安裝階段：預先快取核心前端資產
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 正在預快取核心資產...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 啟用階段：清除過期版本的快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith('ntu1200-pwa-')) {
            console.log('[SW] 清理過期快取:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 擷取請求攔截 (Fetch)：
// - 本地靜態資源：Stale-While-Revalidate（優先回傳快取秒開，背景連網更新）
// - 外部字型 (Google Fonts)：Cache-First
// - 離線且導航失敗時：降級回 index.html
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 僅處理 GET 請求，忽略其他請求與非 HTTP(S) 協定 (如 chrome-extension)
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }

  const url = new URL(req.url);

  // 外部 Google Fonts: Cache-First
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.status === 200) {
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch (e) {
          return cached;
        }
      })
    );
    return;
  }

  // 同源靜態資源：Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(req);

      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // 網路離線時，若為導航請求 (navigate)，回傳 index.html 快取
          if (req.mode === 'navigate') {
            return cache.match('./index.html') || cache.match('./');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
