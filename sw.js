/* Wilds Vleis order app - service worker.

   Two jobs:

   1. Let the app OPEN with no signal. The page itself is kept in a cache,
      so the app still starts in a cold shed with one bar. (Orders already
      captured are queued in the page, see the offline queue in index.html.)

   2. Never serve stale code. Every load tries the network FIRST and only
      falls back to the cache when the network fails. That is the opposite
      of a normal cache and it is deliberate - it means a fix reaches the
      phone the next time it has signal, instead of being stuck behind an
      old cached copy.
*/

var CACHE = 'wilds-vleis-v1';
var SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
           .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
                              .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                    // never cache saves
  if (req.url.indexOf('supabase.co') !== -1) return;   // never cache live data

  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
  );
});
