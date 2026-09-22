/* sw.js — caché para que la app abra sin conexión */
var CACHE = "menu-semanal-v124";
var FICHEROS = [
  "./", "./index.html", "./css/estilos.css?v=124",
  "./js/util.js?v=124", "./js/almacen.js?v=124", "./js/github.js?v=124", "./js/app.js?v=124",
  "./datos/ingredientes.js?v=124", "./datos/recetas.js?v=124", "./datos/nuevos.js?v=124", "./datos/hogar.js?v=124", "./datos/plantillas.js?v=124", "./datos/actividades.js?v=124", "./datos/plan.js?v=124", "./datos/mi-cocina.json", "./datos/mis-gustos.json", "./js/entrenamiento.js?v=124", "./js/actividad-khb.js?v=124", "./css/actividad-khb.css?v=124",
  "./iconos/khb/1-arbol-pulso.webp", "./iconos/khb/2-frutas-tenedor.webp", "./iconos/khb/3-pesas-corredor.webp", "./iconos/khb/4-agua.webp", "./iconos/khb/5-sueno.webp", "./iconos/khb/6-zapatillas.webp", "./iconos/khb/7-yoga.webp", "./iconos/khb/8-recetario.webp", "./iconos/khb/9-podio.webp", "./iconos/khb/10-bici.webp", "./iconos/khb/11-montana.webp", "./media/cartel-h.webp", "./media/cartel-v.webp", "./manifest.webmanifest", "./iconos/icono.svg"
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
