/* =====================================================================
   Service Worker - منظومة الحضور والإنجاز
   استراتيجية: Cache First للملفات الثابتة، Network First لبيانات Firestore
   (Firestore يدير التخزين المؤقت الخاص به عبر SDK، لذلك هنا نهتم فقط
   بتسريع تحميل الواجهة والعمل بدون اتصال لآخر نسخة محمّلة).
   ===================================================================== */
const CACHE_NAME = 'attendance-app-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './offline.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // لا نتدخل في طلبات Firebase/Firestore/Google APIs - تُترك للـ SDK ولاتصال الشبكة مباشرة
  if (url.hostname.includes('googleapis') || url.hostname.includes('firebase') || url.hostname.includes('gstatic')) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && url.origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached || caches.match('./offline.html'));
      return cached || network;
    })
  );
});

// استقبال إشعارات Firebase Cloud Messaging في الخلفية
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch (e) { payload = { notification: { title: 'إشعار جديد', body: event.data.text() } }; }
  const n = payload.notification || {};
  event.waitUntil(
    self.registration.showNotification(n.title || 'منظومة الحضور والإنجاز', {
      body: n.body || '',
      icon: './icon.svg',
      badge: './icon.svg',
      dir: 'rtl',
      lang: 'ar'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      if (clientsArr.length > 0) return clientsArr[0].focus();
      return self.clients.openWindow('./index.html');
    })
  );
});
