/* Service Worker — משפחת מרטון PWA
   מטמון "app shell" לפתיחה מהירה ולעבודה אופליין.
   נתוני הגיליון (script.google.com) לעולם לא נשמרים במטמון — תמיד מהרשת, כדי להישאר עדכניים.
   קוד האתר עצמו (index.html) — קודם מהרשת (עדכונים מגיעים מיד), מטמון רק כגיבוי אופליין. */
const CACHE = 'marton-app-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // נתוני הגיליון — תמיד מהרשת (אף פעם לא מטמון)
  if (url.hostname.indexOf('google.com') !== -1) return;

  // רק משאבים מאותו מקור (האתר עצמו)
  if (url.origin !== location.origin) return;

  // דף ה-HTML עצמו (ניווט) — קודם מהרשת, כדי שעדכוני קוד יגיעו מיד בכל טעינה;
  // המטמון משמש רק כגיבוי כשאין רשת (אופליין), לא כמקור ברירת מחדל
  const isNavigation = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isNavigation) {
    event.respondWith(
      fetch(req, {cache: 'no-store'}).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // שאר נכסי המעטפת (אייקונים, manifest) — משתנים לעיתים רחוקות, קודם מטמון למהירות
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
