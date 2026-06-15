// SYY Service Hub — Service Worker
// กลยุทธ์: network-first (ข้อมูลต้องสดเสมอ) + fallback cache เมื่อ offline
const CACHE = 'syy-hub-v1';
const SHELL = [
  'dashboard.html',
  'tracker.html',
  'icon-192.png',
  'icon-512.png',
  'manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // ไม่ cache การส่งข้อมูล (POST ไป GAS)
  const url = new URL(req.url);

  // ข้อมูลสด (Google Sheets API, GAS, LINE) — เครือข่ายเท่านั้น ไม่ cache
  if (/googleapis\.com|script\.google\.com|api\.line\.me|line-scdn\.net/.test(url.hostname)) {
    return; // ปล่อยให้ browser จัดการตามปกติ
  }

  // ไฟล์หน้าเว็บ/ไอคอน — network-first, ถ้าออฟไลน์ค่อยใช้ cache
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('dashboard.html')))
  );
});
