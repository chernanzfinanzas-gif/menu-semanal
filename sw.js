/* sw.js — caché para que la app abra sin conexión */
var CACHE = "menu-semanal-v257";
var FICHEROS = [
  "./", "./index.html", "./css/estilos.css?v=257",
  "./js/util.js?v=257", "./js/almacen.js?v=257", "./js/github.js?v=257", "./js/app.js?v=257",
  "./datos/ingredientes.js?v=257", "./datos/recetas.js?v=257", "./datos/nuevos.js?v=257", "./datos/hogar.js?v=257", "./datos/plantillas.js?v=257", "./datos/actividades.js?v=257", "./datos/plan.js?v=257", "./datos/mi-cocina.json", "./datos/mis-gustos.json", "./js/entrenamiento.js?v=257", "./js/actividad-khb.js?v=257", "./css/actividad-khb.css?v=257",
  "./iconos/khb/1-arbol-pulso.webp", "./iconos/khb/2-frutas-tenedor.webp", "./iconos/khb/3-pesas-corredor.webp", "./iconos/khb/4-agua.webp", "./iconos/khb/5-sueno.webp", "./iconos/khb/6-zapatillas.webp", "./iconos/khb/7-yoga.webp", "./iconos/khb/8-recetario.webp", "./iconos/khb/9-podio.webp", "./iconos/khb/10-bici.webp", "./iconos/khb/11-montana.webp", "./media/cartel-h.webp", "./media/cartel-v.webp", "./manifest.webmanifest", "./iconos/icono.svg", "./iconos/animo/en-su-sitio.webp?v=257", "./iconos/animo/en-su-sitio-comic.webp?v=257", "./iconos/animo/pasado.webp?v=257", "./iconos/animo/pasado-comic.webp?v=257", "./iconos/animo/corto.webp?v=257", "./iconos/animo/corto-comic.webp?v=257", "./iconos/animo/fuerza.webp?v=257", "./iconos/animo/fuerza-comic.webp?v=257", "./iconos/animo/descanso.webp?v=257", "./iconos/animo/descanso-comic.webp?v=257", "./iconos/animo/en-marcha.webp?v=257", "./iconos/animo/en-marcha-comic.webp?v=257", "./iconos/animo/sem-espera.webp?v=257", "./iconos/animo/sem-azul.webp?v=257", "./iconos/animo/sem-verde.webp?v=257", "./iconos/animo/sem-ambar.webp?v=257", "./iconos/animo/sem-rojo.webp?v=257"
];

/* INSTALACION FICHERO A FICHERO  ·  23-sep-2026
   ANTES: `c.addAll(FICHEROS)`. addAll es todo o nada: si UNO solo de los 33
   ficheros falla —se renombro y nadie toco esta lista, la red se corto a
   mitad, el servidor devolvio un 404— la promesa entera se rechaza, la
   instalacion del service worker falla y el navegador se queda SIN CACHE. O
   sea, que por un icono perdido la app dejaba de abrir sin conexion, y sin
   decir una palabra.
   AHORA: se pide uno a uno y el que falle se anota y se salta. Con 32 de 33
   la app sigue abriendo sin conexion, que es infinitamente mejor que con 0.
   Los que fallen quedan en la consola con el prefijo [sw] y, si hay alguno,
   se avisa a las pestanas abiertas por si algun dia queremos ensenarlo. */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      var fallos = [];
      return Promise.all(FICHEROS.map(function (f) {
        return c.add(f)["catch"](function (err) {
          fallos.push(f);
          console.warn("[sw] no se pudo guardar en cache:", f, err && err.message);
        });
      })).then(function () {
        if (fallos.length) {
          console.warn("[sw] cache incompleta: " + fallos.length + " de " +
                       FICHEROS.length + " ficheros no entraron. La app sigue " +
                       "funcionando sin conexion con el resto.");
          self.clients.matchAll({ includeUncontrolled: true }).then(function (cl) {
            cl.forEach(function (x) {
              x.postMessage({ tipo: "cache-incompleta", fallos: fallos, total: FICHEROS.length });
            });
          });
        } else {
          console.log("[sw] cache completa: " + FICHEROS.length + " ficheros.");
        }
      });
    }).then(function () { return self.skipWaiting(); })
  );
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
