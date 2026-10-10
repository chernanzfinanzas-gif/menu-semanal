/* sw.js — caché para que la app abra sin conexión */
/* M13 · 10-oct-2026: UNA sola versión para todo. La lista llevaba ?v=426 cuando
   la app cargaba la 519: lo guardado no casaba con lo que pide index.html y sin
   cobertura no servía. Al subir de versión sólo se toca la línea de V. */
var V = "521";
var CACHE = "menu-semanal-v" + V;
var FICHEROS = [
  "./", "./index.html", "./css/estilos.css?v=" + V,
  "./js/util.js?v=" + V, "./js/almacen.js?v=" + V, "./js/github.js?v=" + V, "./js/app.js?v=" + V,
  "./datos/ingredientes.js?v=" + V, "./datos/recetas.js?v=" + V, "./datos/nuevos.js?v=" + V, "./datos/hogar.js?v=" + V, "./datos/plantillas.js?v=" + V, "./datos/actividades.js?v=" + V, "./datos/plan.js?v=" + V, "./datos/compra-recibida.js?v=" + V, "./datos/mi-cocina.json", "./datos/mis-gustos.json", "./js/entrenamiento.js?v=" + V, "./js/actividad-khb.js?v=" + V, "./css/actividad-khb.css?v=" + V, "./js/avances-khb.js?v=" + V, "./css/avances-khb.css?v=" + V,
  "./iconos/khb/1-arbol-pulso.webp", "./iconos/khb/2-frutas-tenedor.webp", "./iconos/khb/3-pesas-corredor.webp", "./iconos/khb/4-agua.webp", "./iconos/khb/5-sueno.webp", "./iconos/khb/6-zapatillas.webp", "./iconos/khb/7-yoga.webp", "./iconos/khb/8-recetario.webp", "./iconos/khb/9-podio.webp", "./iconos/khb/10-bici.webp", "./iconos/khb/11-montana.webp", "./media/cartel-h.webp", "./media/cartel-v.webp", "./manifest.webmanifest", "./iconos/icono.svg", "./iconos/animo/en-su-sitio.webp?v=" + V, "./iconos/animo/en-su-sitio-comic.webp?v=" + V, "./iconos/animo/pasado.webp?v=" + V, "./iconos/animo/pasado-comic.webp?v=" + V, "./iconos/animo/corto.webp?v=" + V, "./iconos/animo/corto-comic.webp?v=" + V, "./iconos/animo/fuerza.webp?v=" + V, "./iconos/animo/fuerza-comic.webp?v=" + V, "./iconos/animo/descanso.webp?v=" + V, "./iconos/animo/descanso-comic.webp?v=" + V, "./iconos/animo/en-marcha.webp?v=" + V, "./iconos/animo/en-marcha-comic.webp?v=" + V, "./iconos/animo/sem-espera.webp?v=" + V, "./iconos/animo/sem-azul.webp?v=" + V, "./iconos/animo/sem-verde.webp?v=" + V, "./iconos/animo/sem-ambar.webp?v=" + V, "./iconos/animo/sem-rojo.webp?v=" + V
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

/* M13 · 10-oct-2026 — LA RED, CON TIEMPO LÍMITE.
   · Con mala cobertura la petición se quedaba colgada sin fin: ahora, si en 4 s
     no ha contestado, se sirve lo guardado (y la respuesta de la red, si llega,
     sigue actualizando la caché).
   · Sólo se guardan respuestas buenas: antes se guardaban también los errores
     (un 404 o un 500 machacaba la copia buena).
   · Si lo guardado lleva otra ?v=, vale igual: mejor la app de ayer que una
     pantalla en blanco. */
self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  if (url.indexOf("api.github.com") >= 0 || e.request.method !== "GET") return;   // la sincronización siempre en directo
  function guardado() {
    return caches.match(e.request).then(function (r) {
      return r || caches.match(e.request, { ignoreSearch: true });
    }).then(function (r) {
      if (r) return r;
      if (e.request.mode === "navigate") return caches.match("./index.html", { ignoreSearch: true });
      return r;
    });
  }
  var red = fetch(e.request).then(function (r) {
    if (r && r.ok && (r.type === "basic" || r.type === "cors")) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
    }
    return r;
  });
  e.respondWith(new Promise(function (resolver) {
    var hecho = false;
    function dar(r) { if (!hecho && r) { hecho = true; resolver(r); } }
    var reloj = setTimeout(function () { guardado().then(dar); }, 4000);
    red.then(function (r) {
      clearTimeout(reloj);
      if (r.ok) return dar(r);
      return guardado().then(function (g) { dar(g || r); });
    }).catch(function () {
      clearTimeout(reloj);
      guardado().then(function (g) { dar(g || Response.error()); });
    });
  }));
});
