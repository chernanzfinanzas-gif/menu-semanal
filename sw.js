/* sw.js — caché para que la app abra sin conexión */
var CACHE = "menu-semanal-v5";
var FICHEROS = [
  "./", "./index.html", "./css/estilos.css?v=5",
  "./js/util.js?v=5", "./js/almacen.js?v=5", "./js/github.js?v=5", "./js/app.js?v=5",
  "./datos/ingredientes.js?v=5", "./datos/recetas.js?v=5", "./datos/plantillas.js?v=5", "./datos/actividades.js?v=5",
  "./manifest.webmanifest", "./iconos/icono.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHEROS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  if (url.indexOf("api.github.com") >= 0 || e.request.method !== "GET") return;   // la sincronización siempre en directo
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});
