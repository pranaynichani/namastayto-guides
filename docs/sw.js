/* NamastayTO guide service worker — caches the guide for full offline use.
   No analytics, no external requests: it only ever caches this site's own files. */
var VERSION = "nsto-v7";
var CORE = [
  "css/style.css",
  "js/guide.js",
  "js/places-data.js",
  "assets/fonts/fraunces-latin.woff2",
  "assets/fonts/fraunces-italic-latin.woff2",
  "assets/fonts/dmsans-latin.woff2",
  "assets/img/brand/logo.png",
  "assets/img/brand/icon-192.png",
  "manifest.webmanifest"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(VERSION).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== location.origin) return; /* never touch external requests */

  if(req.mode === "navigate"){
    /* pages: try network for freshness, fall back to cache when offline */
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(VERSION).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){ return hit || caches.match(url.pathname); });
      })
    );
    return;
  }

  /* assets: cache first, then network (and cache what we fetch) */
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res.ok){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
