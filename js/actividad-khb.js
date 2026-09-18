/* ============================================================================
   ActividadKHB — archivo navegable de actividades para la pata «Actividad».
   18 de septiembre de 2026.

   QUÉ HACE
   Año → mes → actividades en orden, con sus datos, y ficha desplegable con
   mini mapa. Las viejas y las nuevas salen de sitios distintos y aquí se
   presentan igual.

   NO DEPENDE DE NADA. No usa U, A, Salud ni pintar(). Recibe los datos, se
   dibuja dentro del elemento que le des y se gestiona sus propios clics. Se
   puede probar en una página suelta antes de enchufarlo.

   CÓMO SE USA
     var arch = ActividadKHB.crear({
       historico: <historico-actividad.json>,   // 2013 → 14-oct-2021
       actividades: <salud.json>.actividades
                    .concat(<salud-historico.json>.actividades || []),
       rutas: <mapas-ign/rutas/index.json>.rutas,   // opcional: nombres y celdas
       traerGeo: function (celda) {                 // opcional: devuelve promesa
         return fetch(BASE_MAPAS + 'rutas/geo-' + celda + '.json')
                  .then(function (r) { return r.json(); });
       }
     });
     arch.montar(document.getElementById('donde'));
     arch.destruir();   // al cambiar de pestaña

   DE DÓNDE SALE CADA COSA
   · Hasta el 14-oct-2021: del puente `historico-actividad.json`. Congelado.
   · Desde el 15-oct-2021: de salud.json. Aquí se van añadiendo las nuevas
     solas, sin tocar nada.

   EL MINI MAPA, POR ORDEN
   1. Geometría de la colección de rutas (`ruta` + `celda`) → el trazo bueno.
   2. Polilínea de Strava, si la actividad trae `poli` (la deja el workflow
      cuando se pida `strava_id`; hay decodificador abajo).
   3. Si no hay ninguna → icono del deporte. No se deja un hueco vacío.
   ========================================================================== */

(function (global) {
  "use strict";

  var MES = ["enero","febrero","marzo","abril","mayo","junio",
             "julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var MES_CORTO = ["ene","feb","mar","abr","may","jun",
                   "jul","ago","sep","oct","nov","dic"];
  var CORTE = "2021-10-15";          // desde aquí manda salud.json

  /* tipos de intervals → los mismos códigos que usa el puente */
  var TIPO = {
    VirtualRide: "rod", Ride: "bici", MountainBikeRide: "bici", EBikeRide: "bici",
    Walk: "and", Hike: "sen", Run: "cor", WeightTraining: "fue",
    Yoga: "fue", Workout: "fue", Rowing: "otr", WaterSport: "otr"
  };
  var NOMBRE_DEP = {
    sen: "Senderismo", pas: "Paseo largo", bici: "Bici exterior",
    and: "Caminar", rod: "Rodillo", fue: "Fuerza y sala",
    cor: "Carrera", otr: "Otros"
  };

  /* ---------- utilidades mínimas ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function num(v, dec) {
    if (v == null || v === "") return null;
    return Number(v).toLocaleString("es-ES", {
      minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0
    });
  }
  function dosD(n) { return (n < 10 ? "0" : "") + n; }

  /* Polilínea codificada de Strava → [[lat,lon],…]. Algoritmo de Google. */
  function decodificarPolilinea(txt) {
    if (!txt) return [];
    var pts = [], i = 0, lat = 0, lon = 0;
    while (i < txt.length) {
      var b, sh = 0, res = 0;
      do { b = txt.charCodeAt(i++) - 63; res |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
      lat += (res & 1) ? ~(res >> 1) : (res >> 1);
      sh = 0; res = 0;
      do { b = txt.charCodeAt(i++) - 63; res |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
      lon += (res & 1) ? ~(res >> 1) : (res >> 1);
      pts.push([lat / 1e5, lon / 1e5]);
    }
    return pts;
  }

  /* ---------- iconos por deporte, cuando no hay trazo ---------- */
  /* SVG dentro del propio módulo: no dependen de ningún fichero del repo. */
  var ICONO = {
    sen:  'M4 78 L26 40 L38 56 L56 24 L84 78 Z M56 24 L62 34 L52 38 Z',
    bici: 'M22 68 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M70 68 m-14 0 ' +
          'a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M22 68 L40 36 L58 36 L70 68 M40 36 L52 68',
    and:  'M30 16 a7 7 0 1 0 0.1 0 M34 28 L28 48 L38 58 L34 84 M28 48 L16 60 ' +
          'M38 34 L54 42 L64 34',
    rod:  'M18 74 L82 74 M30 74 L38 40 L62 40 L70 74 M38 40 L34 26 L50 26 M62 40 L50 26',
    fue:  'M12 40 L12 60 M22 32 L22 68 M22 50 L78 50 M78 32 L78 68 M88 40 L88 60',
    cor:  'M56 14 a7 7 0 1 0 0.1 0 M52 28 L40 44 L52 56 L44 82 M40 44 L20 50 ' +
          'M52 56 L72 62 L80 84',
    otr:  'M50 20 a30 30 0 1 0 0.1 0 M50 34 L50 52 L64 60'
  };
  function iconoSVG(dep) {
    var d = ICONO[dep] || ICONO.otr;
    return '<svg class="akhb-icono" viewBox="0 0 100 100" role="img" ' +
      'aria-label="' + esc(NOMBRE_DEP[dep] || "Actividad") + '">' +
      '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="5" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ---------- normalizar las dos fuentes a un modelo único ---------- */
  function deHistorico(hist) {
    var fuera = [];
    if (!hist || !hist.anios) return fuera;
    Object.keys(hist.anios).forEach(function (anio) {
      var meses = hist.anios[anio] || {};
      Object.keys(meses).forEach(function (mm) {
        (meses[mm] || []).forEach(function (f) {
          /* [dia, deporte, nombre, km, desnivel, horas, ruta, celda] */
          fuera.push({
            fecha: anio + "-" + mm + "-" + dosD(f[0]),
            dep: f[1], nombre: f[2] || null,
            km: f[3], desnivel: f[4],
            min: f[5] != null ? Math.round(f[5] * 60) : null,
            carga: null, pot: null, wkg: null, pulso: null,
            ruta: f[6] || null, celda: f[7] || null,
            poli: null, fuente: "archivo"
          });
        });
      });
    });
    return fuera;
  }

  function deSalud(acts, fechasSen) {
    var fuera = [];
    (acts || []).forEach(function (a) {
      var f = String(a.fecha || "").slice(0, 10);
      if (!f || f < CORTE) return;                 // antes del corte manda el puente
      var dep = TIPO[a.tipo] || "otr";
      /* Walk es a la vez paseo y monte: lo decide la colección de rutas */
      if (dep === "and" && fechasSen && fechasSen[f]) dep = "sen";
      fuera.push({
        fecha: f, dep: dep, nombre: a.nombre || null,
        km: a.km != null ? a.km : null,
        desnivel: a.desnivel != null ? a.desnivel : null,
        min: a.min_mov != null ? Math.round(a.min_mov) : null,
        carga: a.esfuerzo != null ? a.esfuerzo : null,
        pot: a.pot_norm != null ? a.pot_norm : null,
        wkg: a.w_kg != null ? a.w_kg : null,
        pulso: a.pulso_med != null ? a.pulso_med : null,
        kcal: a.kcal_netas != null ? a.kcal_netas : null,
        ruta: null, celda: null,
        poli: a.poli || null,
        stravaId: a.strava_id || null,
        id: a.id, fuente: "salud"
      });
    });
    return fuera;
  }

  /* ---------- el objeto ---------- */
  function crear(opciones) {
    var o = opciones || {};
    var rutas = o.rutas || [];
    var traerGeo = typeof o.traerGeo === "function" ? o.traerGeo : null;

    /* índice de rutas por fecha, para clasificar y para el mapa de las nuevas */
    var rutaPorFecha = {}, fechasSen = {};
    rutas.forEach(function (r) {
      var f = String(r.f || "");
      if (f.length !== 8) return;
      var iso = f.slice(0, 4) + "-" + f.slice(4, 6) + "-" + f.slice(6);
      (rutaPorFecha[iso] = rutaPorFecha[iso] || []).push(r);
      if (r.a === "sen") fechasSen[iso] = true;
    });

    var todas = deHistorico(o.historico).concat(deSalud(o.actividades, fechasSen));

    /* a las nuevas, engancharles su ruta si ese día hay una y los km cuadran */
    todas.forEach(function (x) {
      if (x.ruta || x.fuente !== "salud") return;
      var cand = rutaPorFecha[x.fecha];
      if (!cand || !cand.length) return;
      var mejor = cand[0];
      if (x.km) {
        mejor = cand.reduce(function (a, b) {
          return Math.abs((b.km || 0) - x.km) < Math.abs((a.km || 0) - x.km) ? b : a;
        });
        if (Math.abs((mejor.km || 0) - x.km) > 3) return;   // no se parecen: no es ésa
      }
      x.ruta = mejor.id; x.celda = mejor.c;
      if (!x.nombre) x.nombre = mejor.n;
    });

    todas.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });

    /* índice año → mes → actividades */
    var porAnio = {};
    todas.forEach(function (x) {
      var y = x.fecha.slice(0, 4), m = x.fecha.slice(5, 7);
      (porAnio[y] = porAnio[y] || {});
      (porAnio[y][m] = porAnio[y][m] || []).push(x);
    });
    var anios = Object.keys(porAnio).sort();

    var estado = {
      anio: anios.length ? anios[anios.length - 1] : null,
      mes: null,           // null = el año entero
      abierta: null,       // clave de la ficha desplegada
      el: null
    };
    var cacheGeo = {};     // celda → geometría ya traída

    /* ---------- dibujo ---------- */
    function cuentaAnio(y) {
      var n = 0, m = porAnio[y] || {};
      Object.keys(m).forEach(function (k) { n += m[k].length; });
      return n;
    }

    function htmlAnios() {
      var max = 1;
      anios.forEach(function (y) { max = Math.max(max, cuentaAnio(y)); });
      return '<div class="akhb-anios" role="tablist" aria-label="Años">' +
        anios.map(function (y) {
          var n = cuentaAnio(y), sel = y === estado.anio;
          return '<button type="button" role="tab" class="akhb-anio' + (sel ? " sel" : "") +
            '" aria-selected="' + sel + '" data-anio="' + y + '">' +
            '<span class="akhb-anio-n">' + y + "</span>" +
            '<span class="akhb-barra"><i style="height:' +
              Math.max(6, Math.round(n / max * 100)) + '%"></i></span>' +
            '<span class="akhb-anio-c">' + n + "</span></button>";
        }).join("") + "</div>";
    }

    function htmlMeses() {
      var m = porAnio[estado.anio] || {};
      var celdas = [];
      for (var i = 0; i < 12; i++) {
        var k = dosD(i + 1), lista = m[k] || [], hay = lista.length > 0;
        var sel = estado.mes === k;
        celdas.push('<button type="button" class="akhb-mes' + (sel ? " sel" : "") +
          (hay ? "" : " vacio") + '"' + (hay ? "" : " disabled") +
          ' data-mes="' + k + '" aria-pressed="' + !!sel + '">' +
          MES_CORTO[i] + (hay ? '<b>' + lista.length + "</b>" : "<b>·</b>") + "</button>");
      }
      return '<div class="akhb-meses">' +
        '<button type="button" class="akhb-mes akhb-todo' + (estado.mes ? "" : " sel") +
        '" data-mes="">Todo el año<b>' + cuentaAnio(estado.anio) + "</b></button>" +
        celdas.join("") + "</div>";
    }

    function datosDe(x) {
      var d = [];
      if (x.km) d.push(num(x.km, 2) + " km");
      if (x.desnivel) d.push(num(x.desnivel) + " m");
      if (x.min) d.push(x.min + " min");
      if (x.carga != null) d.push("carga " + x.carga);
      return d.join(" · ");
    }

    function htmlFila(x, clave) {
      var d = new Date(x.fecha + "T12:00:00");
      var abierta = estado.abierta === clave;
      return '<li class="akhb-item">' +
        '<button type="button" class="akhb-fila" data-abre="' + clave + '" ' +
          'aria-expanded="' + abierta + '">' +
          '<span class="akhb-dia"><b>' + d.getDate() + "</b>" +
            "<i>" + MES_CORTO[d.getMonth()] + "</i></span>" +
          '<span class="akhb-txt">' +
            '<span class="akhb-nom">' + esc(x.nombre || NOMBRE_DEP[x.dep] || "Actividad") + "</span>" +
            '<span class="akhb-sub">' + esc(NOMBRE_DEP[x.dep] || "") +
              (datosDe(x) ? " · " + datosDe(x) : "") + "</span>" +
          "</span>" +
          '<span class="akhb-chev" aria-hidden="true"></span>' +
        "</button>" +
        (abierta ? htmlFicha(x, clave) : "") +
        "</li>";
    }

    function dato(et, v, suf) {
      return '<div><dt>' + et + "</dt><dd>" +
        (v == null ? '<span class="akhb-pte">—</span>' : v + (suf || "")) + "</dd></div>";
    }

    function htmlFicha(x, clave) {
      var campos =
        dato("Duración", x.min, " min") +
        dato("Distancia", x.km != null ? num(x.km, 2) : null, " km") +
        dato("Desnivel", x.desnivel != null ? num(x.desnivel) : null, " m") +
        dato("Carga", x.carga) +
        /* lo de abajo solo si existe: una caminata no tiene vatios y poner
           «Potencia —» es ruido, no información */
        (x.pulso != null ? dato("Pulso medio", x.pulso, " ppm") : "") +
        (x.pot   != null ? dato("Potencia", x.pot, " W") : "") +
        (x.wkg   != null ? dato("Vatios/kg", num(x.wkg, 2)) : "") +
        (x.kcal  != null ? dato("Kcal netas", num(x.kcal)) : "");
      return '<div class="akhb-ficha">' +
        '<figure class="akhb-mapa" data-mapa="' + clave + '">' +
          (x.ruta || x.poli ? '<div class="akhb-cargando">Trayendo el trazo…</div>'
                            : iconoSVG(x.dep)) +
          "<figcaption>" +
            (x.ruta ? esc(x.nombre || "") : x.poli ? "Trazo de Strava"
                    : NOMBRE_DEP[x.dep] + " — sin recorrido") +
          "</figcaption>" +
        "</figure>" +
        '<dl class="akhb-kv">' + campos + "</dl>" +
      "</div>";
    }

    function htmlLista() {
      var m = porAnio[estado.anio] || {};
      var meses = estado.mes ? [estado.mes] : Object.keys(m).sort();
      if (!meses.length) {
        return '<p class="akhb-nada">No hay actividades registradas en ' + estado.anio + ".</p>";
      }
      var h = "";
      meses.forEach(function (mm) {
        var lista = m[mm] || [];
        if (!lista.length) return;
        h += '<h4 class="akhb-titmes">' + MES[parseInt(mm, 10) - 1] +
             ' <span>' + lista.length + (lista.length === 1 ? " actividad" : " actividades") +
             "</span></h4><ul class=\"akhb-lista\">";
        lista.forEach(function (x, i) { h += htmlFila(x, estado.anio + mm + "-" + i); });
        h += "</ul>";
      });
      if (!h) {
        return '<p class="akhb-nada">' + MES[parseInt(estado.mes, 10) - 1] +
               " de " + estado.anio + " no tiene ninguna actividad.</p>";
      }
      return h;
    }

    function fuenteDelAnio() {
      var y = estado.anio;
      if (y < "2021") return "Del archivo, hasta octubre de 2021.";
      if (y > "2021") return "De intervals, se actualiza solo.";
      return "Hasta el 14 de octubre, del archivo; desde el 15, de intervals.";
    }

    function pintar() {
      if (!estado.el) return;
      estado.el.innerHTML =
        '<div class="akhb">' +
          htmlAnios() +
          '<div class="akhb-cab"><h3>' + estado.anio + "</h3>" +
            '<span class="akhb-fuente">' + fuenteDelAnio() + "</span></div>" +
          htmlMeses() +
          '<div class="akhb-cuerpo">' + htmlLista() + "</div>" +
        "</div>";
      pintarMapas();
    }

    /* ---------- mini mapa ---------- */
    function dibujaTrazo(fig, pts) {
      if (!pts || pts.length < 2) { fig.innerHTML = iconoSVG("otr") + fig.innerHTML; return; }
      var lats = [], lons = [];
      pts.forEach(function (p) { lats.push(p[0]); lons.push(p[1]); });
      var la0 = (Math.min.apply(null, lats) + Math.max.apply(null, lats)) / 2;
      var k = Math.cos(la0 * Math.PI / 180);
      var xs = lons.map(function (v) { return v * k; }), ys = lats.map(function (v) { return -v; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var w = (x1 - x0) || 1e-6, h = (y1 - y0) || 1e-6, S = Math.max(w, h), P = 9, B = 128;
      var ox = P + (S - w) / S * (B - 2 * P) / 2, oy = P + (S - h) / S * (B - 2 * P) / 2;
      var d = pts.map(function (p, i) {
        var X = ox + ((p[1] * k - x0) / S) * (B - 2 * P);
        var Y = oy + ((-p[0] - y0) / S) * (B - 2 * P);
        return (i ? "L" : "M") + X.toFixed(1) + " " + Y.toFixed(1);
      }).join(" ");
      var pos = function (p) {
        return [ox + ((p[1] * k - x0) / S) * (B - 2 * P),
                oy + ((-p[0] - y0) / S) * (B - 2 * P)];
      };
      var a = pos(pts[0]), b = pos(pts[pts.length - 1]);
      var cap = fig.querySelector("figcaption");
      fig.innerHTML =
        '<svg class="akhb-trazo" viewBox="0 0 ' + B + " " + B + '" role="img" ' +
          'aria-label="Recorrido de la actividad">' +
          '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.4" ' +
            'stroke-linejoin="round" stroke-linecap="round"/>' +
          '<circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) +
            '" r="3.4" class="akhb-ini"/>' +
          '<circle cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) +
            '" r="3.4" class="akhb-fin"/>' +
        "</svg>";
      if (cap) fig.appendChild(cap);
    }

    function pintarMapas() {
      if (!estado.el) return;
      var fig = estado.el.querySelector("[data-mapa]");
      if (!fig) return;
      var clave = fig.getAttribute("data-mapa");
      var x = buscaPorClave(clave);
      if (!x) return;

      /* 1 · polilínea de Strava, si el workflow ya la trae */
      if (x.poli) { dibujaTrazo(fig, decodificarPolilinea(x.poli)); return; }

      /* 2 · geometría de la colección de rutas */
      if (x.ruta && x.celda && traerGeo) {
        var pinta = function (geo) {
          var segs = geo && geo[x.ruta];
          if (!segs) { fig.innerHTML = iconoSVG(x.dep) + (fig.querySelector("figcaption") ? "" : ""); pintaIcono(fig, x); return; }
          var pts = [];
          segs.forEach(function (s) { s.forEach(function (p) { pts.push(p); }); });
          dibujaTrazo(fig, pts);
        };
        if (cacheGeo[x.celda]) { pinta(cacheGeo[x.celda]); return; }
        traerGeo(x.celda).then(function (geo) {
          cacheGeo[x.celda] = geo || {};
          if (estado.abierta === clave) pinta(cacheGeo[x.celda]);
        })["catch"](function () { pintaIcono(fig, x); });
        return;
      }
      /* 3 · ni trazo ni geometría */
      pintaIcono(fig, x);
    }

    function pintaIcono(fig, x) {
      var cap = fig.querySelector("figcaption");
      fig.innerHTML = iconoSVG(x.dep);
      if (cap) fig.appendChild(cap);
      else fig.insertAdjacentHTML("beforeend",
        "<figcaption>" + NOMBRE_DEP[x.dep] + " — sin recorrido</figcaption>");
    }

    function buscaPorClave(clave) {
      var y = clave.slice(0, 4), mm = clave.slice(4, 6);
      var i = parseInt(clave.split("-")[1], 10);
      var lista = (porAnio[y] || {})[mm] || [];
      return lista[i] || null;
    }

    /* ---------- clics ---------- */
    function alPulsar(e) {
      var t = e.target.closest ? e.target.closest("[data-anio],[data-mes],[data-abre]") : null;
      if (!t || !estado.el.contains(t)) return;
      if (t.hasAttribute("data-anio")) {
        estado.anio = t.getAttribute("data-anio");
        estado.mes = null; estado.abierta = null; pintar(); return;
      }
      if (t.hasAttribute("data-mes")) {
        estado.mes = t.getAttribute("data-mes") || null;
        estado.abierta = null; pintar(); return;
      }
      if (t.hasAttribute("data-abre")) {
        var c = t.getAttribute("data-abre");
        estado.abierta = (estado.abierta === c) ? null : c;
        pintar();
        if (estado.abierta) {
          var f = estado.el.querySelector('[data-abre="' + c + '"]');
          if (f && f.scrollIntoView) f.scrollIntoView({ block: "nearest" });
        }
      }
    }

    return {
      montar: function (el) {
        estado.el = el;
        el.addEventListener("click", alPulsar);
        pintar();
        return this;
      },
      destruir: function () {
        if (estado.el) estado.el.removeEventListener("click", alPulsar);
        estado.el = null;
      },
      irA: function (anio, mes) {
        if (porAnio[anio]) { estado.anio = anio; estado.mes = mes || null; estado.abierta = null; pintar(); }
      },
      resumen: function () {
        return { actividades: todas.length, anios: anios.slice(),
                 conMapa: todas.filter(function (x) { return !!(x.ruta || x.poli); }).length };
      },
      _todas: todas
    };
  }

  global.ActividadKHB = {
    crear: crear,
    decodificarPolilinea: decodificarPolilinea,
    CORTE: CORTE,
    NOMBRE_DEP: NOMBRE_DEP
  };
})(this);
