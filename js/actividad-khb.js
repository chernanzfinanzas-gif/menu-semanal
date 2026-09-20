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
  /* Con qué se mide la altura de la barra del año. Cada una cuenta algo
     distinto y ninguna sobra: las sesiones dicen cuántas veces saliste, las
     horas cuánto tiempo, los kilómetros y el desnivel cuánto terreno, y la
     carga cuánto costó. El reparto por deporte va dentro en todas. */
  var METRICAS = [
    { id: "n",   nom: "Sesiones",    campo: null,        dec: 0, suf: "" },
    { id: "min", nom: "Horas",       campo: "min",       dec: 0, suf: "\u00a0h", div: 60 },
    { id: "km",  nom: "Kilómetros",  campo: "km",        dec: 0, suf: "" },
    { id: "d",   nom: "Desnivel",    campo: "desnivel",  dec: 0, suf: "\u00a0m" },
    { id: "c",   nom: "Carga",       campo: "carga",     dec: 0, suf: "" }
  ];

  /* el orden manda en la barra apilada y en la leyenda */
  var ORDEN_DEP = ["sen", "pas", "bici", "and", "rod", "fue", "cor", "otr"];

  /* LAS FAMILIAS. Ocho colores en una barra de 54 px no se distinguen: cuatro
     de ellos acababan midiendo un píxel. Se agrupan en cuatro, que es lo que
     de verdad cuenta la historia — el monte de los primeros años, la bici que
     entra en 2021, lo que se anda y lo que se hace en casa.
     El rodillo tiene familia propia desde que se sabe cuáles son: el tipo de
     intervals miente hasta 2024, pero el nombre y los números no. Importa que
     se vea separado justamente porque SÍ se suma: los metros de Watopia
     cuestan vatios y calorías, así que cuentan como esfuerzo — pero en 2025
     son 78.311 contra 16.181 de calle y monte, y si van en el mismo color no
     hay forma de saber cuál de los dos estás mirando. */
  var FAMILIA = {
    sen: "monte", pas: "pie", and: "pie", cor: "pie",
    bici: "bici", rod: "rodillo", fue: "sala", otr: "sala"
  };
  var ORDEN_FAM = ["monte", "bici", "rodillo", "pie", "sala"];
  var NOMBRE_FAM = {
    monte: "Monte", bici: "Bici en la calle", rodillo: "Rodillo",
    pie: "A pie", sala: "Sala"
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
  /* El perfil de altura viene con el mismo truco que la polilínea —la
     diferencia con el punto anterior, en letras— pero con UN número por punto
     en vez de dos. Son los mismos puntos del trazo y repartidos por distancia
     recorrida, así que el punto k del perfil está en el kilómetro k/N del
     total: por eso no hace falta guardar ninguna distancia. */
  function decodificarPerfil(txt) {
    if (!txt) return [];
    var alts = [], i = 0, a = 0;
    while (i < txt.length) {
      var b, sh = 0, res = 0;
      do { b = txt.charCodeAt(i++) - 63; res |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20);
      a += (res & 1) ? ~(res >> 1) : (res >> 1);
      alts.push(a);
    }
    return alts;
  }

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

  /* El lugar, para saber por dónde fue sin abrir el mapa. Los nombres de la
     colección lo llevan tras el último punto —«Camino del Salto del Moro.
     Cazorla»— y los que pone Garmin lo llevan delante: «Béost Caminar». */
  function lugarDe(nombre) {
    var n = String(nombre || "").trim();
    if (!n) return null;
    /* Lo que baja de intervals se llama «Senderismo en Colmenar Viejo»: la
       primera palabra en mayúscula es el deporte, no el sitio. Si el nombre
       empieza por un deporte, el sitio va detrás del «en». */
    var m = /^(?:senderismo|ciclismo|carrera|caminata|marcha|paseo|ruta|excursi[óo]n|footing|trail)\b[^]*?\ben\s+(.+)$/i.exec(n);
    if (m && m[1]) {
      var tr0 = m[1].trim().replace(/\.$/, "");
      if (tr0.length > 1 && !/^(?:casa|el rodillo|bici est[áa]tica)$/i.test(tr0)) return tr0;
    }
    if (n.indexOf(".") > 0) {
      var tr = n.split(".").pop().trim();
      if (tr.length > 1) return tr;
    }
    /* «Béost Caminar», «Cercedilla Senderismo»: los que nombra el reloj con el
       sitio delante y el deporte detrás. Sólo ese patrón exacto — coger la
       primera palabra en mayúscula sin más daba «Vuelta», «La» y «Caminata»,
       que no son sitios. Si no se sabe el pueblo, se queda la provincia sola,
       que es verdad y no estorba. */
    var m2 = /^([A-ZÁÉÍÓÚÑ][^\s]+(?:\s+d[eol]l?\s+[^\s]+)?)\s+(?:caminar|senderismo|ciclismo|correr|carrera|paseo|marcha)$/i.exec(n);
    if (m2 && m2[1]) return m2[1];
    return null;
  }

  /* El rótulo del mapa: «Cazorla · Jaén», «Luchon · Francia», o sólo uno de los
     dos si el otro no se sabe. Nunca se repite («Madrid · Madrid»). */
  function rotuloLugar(pueblo, zona) {
    if (pueblo && zona) {
      var a = pueblo.toLowerCase(), b = zona.toLowerCase();
      if (a === b || a.indexOf(b) === 0 || b.indexOf(a) === 0) return pueblo;
      return pueblo + " \u00b7 " + zona;
    }
    return pueblo || zona || null;
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
    /* «Otros» era una i dentro de un círculo, que no dice nada. Un cronómetro
       sí: hubo una sesión y se midió, aunque no sepamos de qué fue. */
    otr:  'M50 30 a28 28 0 1 0 0.1 0 M50 44 L50 58 L61 58 M42 14 L58 14 M50 14 L50 24'
  };
  ICONO.pas = ICONO.and;      // un paseo largo también se hace andando
  ICONO.sal = ICONO.fue;
  /* LO DE DENTRO NO LLEVA MAPA, aunque traiga traza.
     Regla de Carlos: traza y mapa para senderismo, cualquier forma de caminar
     y la bici de fuera; icono para el rodillo y Zwift, para la sala y para lo
     que no tenga recorrido. El «aunque traiga traza» no es un detalle: hay un
     GPX de Zwift en la colección que acabó publicado como una ruta en las
     islas Salomón. Dibujarlo sería mentir sobre dónde estuvo. */
  /* ---------- dónde fue: provincia en España, país fuera ----------
     La toponimia del mapa a veces no llega, y el nombre de la actividad muchas
     veces tampoco dice más que «Senderismo en Cercedilla». Así que la zona se
     saca de las coordenadas, por el punto de referencia más cercano.
     Los puntos son las capitales de provincia, DENSIFICADAS donde Carlos anda
     mucho, más puntos extranjeros repartidos a lo largo de las fronteras: un
     centroide de país pierde siempre contra una capital española a 50 km, y el
     Pirineo francés acabaría saliendo como Huesca.
     Comprobado contra las 703 rutas de la colección: reparte como la geografía
     que ya conocíamos, y el único disparate —16.888 km de su referencia— es el
     GPX de Zwift colado que está publicado en las islas Salomón. */
  var ZONAS = (function () {
    return "*Álava|42.85|-2.67,Albacete|38.99|-1.86,Alicante|38.35|-0.48,Almería|36.84|-2.46,Asturias|43.36|-5.85,Ávila|40.66|-4.70,Badajoz|38.88|-6.97,Baleares|39.57|2.65,Barcelona|41.39|2.17,Burgos|42.34|-3.70,Cáceres|39.47|-6.37,Cádiz|36.53|-6.29,Cantabria|43.46|-3.80,Castellón|39.99|-0.04,Ciudad Real|38.99|-3.93,Córdoba|37.89|-4.78,A Coruña|43.36|-8.41,Cuenca|40.07|-2.14,Girona|41.98|2.82,Granada|37.18|-3.60,Guadalajara|40.63|-3.16,Gipuzkoa|43.32|-1.98,Huelva|37.26|-6.95,Huesca|42.14|-0.41,Jaén|37.77|-3.79,León|42.60|-5.57,Lleida|41.62|0.62,Lugo|43.01|-7.56,Madrid|40.42|-3.70,Málaga|36.72|-4.42,Murcia|37.99|-1.13,Navarra|42.81|-1.64,Ourense|42.34|-7.86,Palencia|42.01|-4.53,Las Palmas|28.12|-15.43,Pontevedra|42.43|-8.64,La Rioja|42.46|-2.45,Salamanca|40.97|-5.66,Tenerife|28.47|-16.25,Segovia|40.95|-4.12,Sevilla|37.39|-5.98,Soria|41.76|-2.47,Tarragona|41.12|1.25,Teruel|40.34|-1.11,Toledo|39.86|-4.02,Valencia|39.47|-0.38,Valladolid|41.65|-4.73,Bizkaia|43.26|-2.93,Zamora|41.50|-5.75,Zaragoza|41.65|-0.89,Madrid|40.78|-3.88,Madrid|40.55|-3.60,Segovia|40.90|-4.02,Ávila|40.65|-4.92,Segovia|41.10|-3.95,Guadalajara|41.05|-3.15,Huesca|42.65|0.15,Huesca|42.55|0.50,Asturias|43.15|-5.00,León|42.95|-6.40,Cantabria|43.15|-4.55,Jaén|37.92|-2.95,*Francia|42.79|0.59,*Francia|43.10|-0.75,*Francia|42.50|2.00,*Francia|43.60|1.44,*Francia|45.19|5.72,*Francia|48.86|2.35,*Andorra|42.51|1.52,*Portugal|41.15|-8.61,*Portugal|38.72|-9.14,*Portugal|41.55|-8.43,*Portugal|37.02|-7.93,*Portugal|40.28|-7.50,*Italia|46.07|11.12,*Italia|46.54|11.99,*Italia|45.44|9.19,*Italia|41.90|12.50,*Italia|45.07|7.69,*Suiza|46.00|7.75,*Suiza|46.52|8.05,*Suiza|46.95|7.45,*Austria|47.26|11.39,*Austria|48.21|16.37,*Eslovenia|46.06|14.51,*Eslovenia|46.38|13.84,*Eslovaquia|49.17|20.20,*Eslovaquia|48.15|17.11,*Argentina|-50.34|-72.27,*Argentina|-34.60|-58.38,*Argentina|-41.13|-71.31,*Chile|-50.99|-73.00,*Chile|-33.45|-70.67,*Marruecos|31.63|-7.99,*Alemania|48.14|11.58,*Reino Unido|51.51|-0.13".split(",").map(function (t) {
      var p = t.split("|"), n = p[0], fuera = n.charAt(0) === "*";
      return { n: fuera ? n.slice(1) : n, fuera: fuera,
               la: parseFloat(p[1]), lo: parseFloat(p[2]) };
    });
  })();

  function zonaDe(la, lo) {
    if (la == null || lo == null) return null;
    var mej = null, d0 = Infinity, k = Math.cos(la * Math.PI / 180);
    for (var i = 0; i < ZONAS.length; i++) {
      var z = ZONAS[i];
      var a = (z.la - la), b = (z.lo - lo) * k;
      var d = a * a + b * b;
      if (d < d0) { d0 = d; mej = z; }
    }
    return mej ? mej.n : null;
  }

  /* La celda del archivo («+81_-008») es la posición redondeada a medio grado:
     vale de sobra para saber la provincia cuando no hay trazo que mirar. */
  function celdaACoord(c) {
    var m = /^([+-]?\d+)_([+-]?\d+)$/.exec(String(c || ""));
    if (!m) return null;
    return [parseInt(m[1], 10) / 2, parseInt(m[2], 10) / 2];
  }

  var DENTRO = { rod: true, fue: true };
  function esDeDentro(dep) { return !!DENTRO[dep]; }
  function llevaMapa(x) {
    if (esDeDentro(x.dep)) return false;
    return !!(x.ruta || x.poli);
  }

  function iconoSVG(dep) {
    var d = ICONO[dep] || ICONO.otr;
    return '<svg class="akhb-icono" viewBox="0 0 100 100" role="img" ' +
      'aria-label="' + esc(NOMBRE_DEP[dep] || "Actividad") + '">' +
      '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="5" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ---------- normalizar las dos fuentes a un modelo único ---------- */
  function deHistorico(hist, fechasSen) {
    var fuera = [];
    /* EL PUENTE NUEVO llega como una LISTA de actividades con los mismos
       campos que las de después del corte —y, lo que importa, CON SU ID—, así
       que se normaliza con el mismo código y no con éste. El formato viejo
       {anios:{mes:[…]}} se sigue entendiendo por si la app se abre antes de
       que el fichero nuevo esté publicado. */
    if (hist && hist.length && typeof hist.length === "number") {
      return deSalud(hist, fechasSen, true);
    }
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

  function esSala(nombre) {
    var n = String(nombre || "").toLowerCase();
    return n.indexOf("en sala") >= 0 || n.indexOf("zwift") >= 0 ||
           n.indexOf("rodillo") >= 0 || n.indexOf("indoor") >= 0 ||
           /^zrl\b/.test(n);
  }

  /* `archivo` a true cuando lo que entra es el puente de 2013 a octubre de
     2021. Es el MISMO modelo de datos, así que se aplican las mismas reglas
     —el rodillo por el nombre, el coche por la velocidad—; sólo cambian dos
     cosas: no hay corte que respetar, y la ruta ya viene emparejada del
     maestro, que sabe más que el emparejador por día de aquí. */
  function deSalud(acts, fechasSen, archivo) {
    var fuera = [], vistos = {};
    (acts || []).forEach(function (a) {
      var f = String(a.fecha || "").slice(0, 10);
      if (!f) return;
      if (!archivo && f < CORTE) return;           // antes del corte manda el puente
      /* Las actividades llegan de dos sitios —el salud.json de la ventana y el
         histórico— y los tramos se solapan. Sin esto, una sesión que esté en
         los dos se cuenta dos veces. */
      if (a.id) { if (vistos[a.id]) return; vistos[a.id] = true; }
      /* El puente trae el deporte ya decidido, y hace falta: de las 1.042
         salidas de antes del corte sólo 522 tienen `tipo` —las que grabó el
         reloj—; las de antes de 2019 salen del Excel y no lo tienen. Sin esto
         la mitad del archivo saldría como «otras». */
      var dep = a.dep || TIPO[a.tipo] || "otr";
      /* Walk es a la vez paseo y monte: lo decide la colección de rutas */
      if (dep === "and" && fechasSen && fechasSen[f]) dep = "sen";
      /* EL RODILLO LO DICE EL NOMBRE, NO EL TIPO. intervals tipó los Zwift de
         2021-2023 como `Ride` y solo desde 2024 como `VirtualRide`, así que por
         el tipo se colaban 422 sesiones de rodillo entre las de carretera. Pero
         el nombre no miente: «Ciclismo en sala» es el nombre que pone Strava a
         una salida con el rodillo, y «Zwift …» o «ZRL …» son de Zwift.
         Medido en las 1.498 sesiones de bici desde el corte: 1.060 de dentro y
         438 de carretera, y el corte por años cuadra clavado con el cambio de
         tipo de intervals (en 2024 ya no queda ni un `Ride` de sala). */
      if (dep === "bici" && esSala(a.nombre)) dep = "rod";
      /* Y las que el nombre tampoco delata, porque se llaman «W060 Outdoor 240
         TSS200» y cosas así. Se conocen por los números, y no se parecen en
         nada a una salida de calle. Medianas medidas desde el corte:
             con ruta archivada (calle segura)  18,0 km/h · 9,8 m/km · 92 W
             éstas                              33,2 km/h · 0,0 m/km · 194 W
             rodillo declarado                  31,2 km/h · 0,0 m/km · 163 W
         Son gemelas del rodillo y no se parecen a la calle. Se exige desnivel
         CERO —no bajo: cero— más de 15 km y más de 25 km/h, para no marcar por
         error una salida llana de verdad. */
      var vel = (a.min_mov > 0) ? (a.km || 0) / (a.min_mov / 60) : 0;
      if (dep === "bici" && a.desnivel === 0 && (a.km || 0) >= 15 && vel >= 25) dep = "rod";
      /* Y a 30 km/h de media no se va por la calle: su mediana de salida con
         ruta archivada es 18 km/h. Caza 8 más que el desnivel cero no pilla,
         como «W069 Tempo 3@ Team», 125 km en 182 minutos. */
      if (dep === "bici" && vel >= 30) dep = "rod";
      /* Y un paseo a 83 km/h es un coche. Ése se llama «Alovera Coche» y es el
         único de las 2.465: el reloj se quedó grabando. No es una salida, así
         que no entra en las de a pie ni pide mapa. */
      if ((dep === "and" || dep === "sen" || dep === "pas") && vel > 20) dep = "otr";
      fuera.push({
        fecha: f, dep: dep, nombre: a.nombre || null,
        hora: String(a.fecha || "").slice(11, 16) || null,
        km: a.km != null ? a.km : null,
        desnivel: a.desnivel != null ? a.desnivel : null,
        min: a.min_mov != null ? Math.round(a.min_mov) : null,
        carga: a.esfuerzo != null ? a.esfuerzo : null,
        pot: a.pot_norm != null ? a.pot_norm : null,
        wkg: a.w_kg != null ? a.w_kg : null,
        pulso: a.pulso_med != null ? a.pulso_med : null,
        kcal: a.kcal_netas != null ? a.kcal_netas : null,
        /* LO QUE YA ESTABA GUARDADO Y LA FICHA NO ENSEÑABA. De 2021 a 2025:
           velocidad y ritmo en el 89% de las salidas, cadencia en el 87%,
           alturas en el 85%, efecto aeróbico en el 84%, pendiente máxima en el
           78%. Estaba todo en el fichero y la ficha pintaba ocho campos. */
        minTotal: a.min_total != null ? Math.round(a.min_total) : null,
        desnivelNeg: a.desnivel_neg != null ? a.desnivel_neg : null,
        altMin: a.alt_min != null ? a.alt_min : null,
        altMax: a.alt_max != null ? a.alt_max : null,
        pendMax: a.pend_max != null ? a.pend_max : null,
        pendMedia: a.pend_media != null ? a.pend_media : null,
        vel: a.vel_kmh != null ? a.vel_kmh : null,
        ritmo: a.ritmo != null ? a.ritmo : null,
        pulsoMax: a.pulso_max != null ? a.pulso_max : null,
        cadencia: a.cadencia != null ? a.cadencia : null,
        zancada: a.zancada != null ? a.zancada : null,
        pasos: a.pasos != null ? a.pasos : null,
        kcalReloj: a.kcal_reloj != null ? a.kcal_reloj : null,
        /* kcal ESTIMADAS, campo aparte a propósito: de 2013 a 2018 el GPSMAP no
           medía más que posición. Nunca se mezclan con las del reloj. */
        kcalEst: a.kcal_est != null ? a.kcal_est : null,
        temp: a.temp != null ? a.temp : null,
        efAe: a.ef_aerobico != null ? a.ef_aerobico : null,
        trimp: a.trimp != null ? a.trimp : null,
        ruta: archivo ? (a.ruta || null) : null,
        celda: archivo ? (a.celda || null) : null,
        poli: a.poli || null,
        stravaId: a.strava_id || null,
        id: a.id, fuente: archivo ? "archivo" : "salud"
      });
    });
    return fuera;
  }

  /* ============ LA SILUETA ============
     Contorno propio, dibujado con puntos de anatomía y suavizado con curvas:
     hombro, cintura, cadera, gemelo y pie. Es el MISMO contorno para las dos
     vistas —una persona no cambia de forma al darse la vuelta—, lo que cambia
     son los músculos que se pintan encima.
     El truco está en el RECORTE: los músculos son formas sencillas (rectángulos
     redondeados y óvalos) y el contorno del cuerpo los recorta, así cada zona
     acaba con la forma exacta del brazo, del muslo o del costado sin tener que
     dibujarla a mano una a una. viewBox 0 0 120 300. */
  var CUERPO = {
    contorno: "M60.0,6.0 C58.7,6.3 54.2,6.3 52.0,8.0 C49.8,9.7 48.0,13.0 47.0,16.0 C46.0,19.0 45.8,23.0 46.0,26.0 C46.2,29.0 47.0,31.7 48.0,34.0 C49.0,36.3 51.0,38.2 52.0,40.0 C53.0,41.8 53.7,42.8 54.0,45.0 C54.3,47.2 55.0,51.0 54.0,53.0 C53.0,55.0 50.5,55.7 48.0,57.0 C45.5,58.3 41.8,59.5 39.0,61.0 C36.2,62.5 33.3,63.8 31.0,66.0 C28.7,68.2 26.3,71.0 25.0,74.0 C23.7,77.0 23.7,80.2 23.0,84.0 C22.3,87.8 21.5,92.7 21.0,97.0 C20.5,101.3 20.3,105.5 20.0,110.0 C19.7,114.5 19.3,119.2 19.0,124.0 C18.7,128.8 18.0,134.5 18.0,139.0 C18.0,143.5 19.2,147.5 19.0,151.0 C18.8,154.5 17.2,156.5 17.0,160.0 C16.8,163.5 17.0,169.2 18.0,172.0 C19.0,174.8 21.5,177.3 23.0,177.0 C24.5,176.7 26.0,172.8 27.0,170.0 C28.0,167.2 28.5,163.2 29.0,160.0 C29.5,156.8 29.7,154.5 30.0,151.0 C30.3,147.5 30.7,143.3 31.0,139.0 C31.3,134.7 31.7,129.7 32.0,125.0 C32.3,120.3 32.5,115.7 33.0,111.0 C33.5,106.3 34.3,101.2 35.0,97.0 C35.7,92.8 36.2,89.2 37.0,86.0 C37.8,82.8 39.0,77.3 40.0,78.0 C41.0,78.7 42.2,86.0 43.0,90.0 C43.8,94.0 44.5,98.0 45.0,102.0 C45.5,106.0 45.8,110.5 46.0,114.0 C46.2,117.5 46.3,119.8 46.0,123.0 C45.7,126.2 44.5,129.7 44.0,133.0 C43.5,136.3 43.3,139.0 43.0,143.0 C42.7,147.0 42.3,151.3 42.0,157.0 C41.7,162.7 41.0,170.3 41.0,177.0 C41.0,183.7 41.5,191.7 42.0,197.0 C42.5,202.3 43.5,205.7 44.0,209.0 C44.5,212.3 45.3,213.0 45.0,217.0 C44.7,221.0 42.2,227.3 42.0,233.0 C41.8,238.7 43.3,245.7 44.0,251.0 C44.7,256.3 45.5,261.0 46.0,265.0 C46.5,269.0 47.3,271.7 47.0,275.0 C46.7,278.3 44.5,282.0 44.0,285.0 C43.5,288.0 42.2,291.5 44.0,293.0 C45.8,294.5 52.7,295.2 55.0,294.0 C57.3,292.8 58.0,289.2 58.0,286.0 C58.0,282.8 55.5,278.5 55.0,275.0 C54.5,271.5 55.2,269.7 55.0,265.0 C54.8,260.3 54.0,253.7 54.0,247.0 C54.0,240.3 54.7,231.0 55.0,225.0 C55.3,219.0 55.7,216.7 56.0,211.0 C56.3,205.3 56.7,198.0 57.0,191.0 C57.3,184.0 57.7,175.3 58.0,169.0 C58.3,162.7 58.7,156.2 59.0,153.0 C59.3,149.8 59.8,150.5 60.0,150.0 C60.2,149.5 59.8,149.5 60.0,150.0 C60.2,150.5 60.7,149.8 61.0,153.0 C61.3,156.2 61.7,162.7 62.0,169.0 C62.3,175.3 62.7,184.0 63.0,191.0 C63.3,198.0 63.7,205.3 64.0,211.0 C64.3,216.7 64.7,219.0 65.0,225.0 C65.3,231.0 66.0,240.3 66.0,247.0 C66.0,253.7 65.2,260.3 65.0,265.0 C64.8,269.7 65.5,271.5 65.0,275.0 C64.5,278.5 62.0,282.8 62.0,286.0 C62.0,289.2 62.7,292.8 65.0,294.0 C67.3,295.2 74.2,294.5 76.0,293.0 C77.8,291.5 76.5,288.0 76.0,285.0 C75.5,282.0 73.3,278.3 73.0,275.0 C72.7,271.7 73.5,269.0 74.0,265.0 C74.5,261.0 75.3,256.3 76.0,251.0 C76.7,245.7 78.2,238.7 78.0,233.0 C77.8,227.3 75.3,221.0 75.0,217.0 C74.7,213.0 75.5,212.3 76.0,209.0 C76.5,205.7 77.5,202.3 78.0,197.0 C78.5,191.7 79.0,183.7 79.0,177.0 C79.0,170.3 78.3,162.7 78.0,157.0 C77.7,151.3 77.3,147.0 77.0,143.0 C76.7,139.0 76.5,136.3 76.0,133.0 C75.5,129.7 74.3,126.2 74.0,123.0 C73.7,119.8 73.8,117.5 74.0,114.0 C74.2,110.5 74.5,106.0 75.0,102.0 C75.5,98.0 76.2,94.0 77.0,90.0 C77.8,86.0 79.0,78.7 80.0,78.0 C81.0,77.3 82.2,82.8 83.0,86.0 C83.8,89.2 84.3,92.8 85.0,97.0 C85.7,101.2 86.5,106.3 87.0,111.0 C87.5,115.7 87.7,120.3 88.0,125.0 C88.3,129.7 88.7,134.7 89.0,139.0 C89.3,143.3 89.7,147.5 90.0,151.0 C90.3,154.5 90.5,156.8 91.0,160.0 C91.5,163.2 92.0,167.2 93.0,170.0 C94.0,172.8 95.5,176.7 97.0,177.0 C98.5,177.3 101.0,174.8 102.0,172.0 C103.0,169.2 103.2,163.5 103.0,160.0 C102.8,156.5 101.2,154.5 101.0,151.0 C100.8,147.5 102.0,143.5 102.0,139.0 C102.0,134.5 101.3,128.8 101.0,124.0 C100.7,119.2 100.3,114.5 100.0,110.0 C99.7,105.5 99.5,101.3 99.0,97.0 C98.5,92.7 97.7,87.8 97.0,84.0 C96.3,80.2 96.3,77.0 95.0,74.0 C93.7,71.0 91.3,68.2 89.0,66.0 C86.7,63.8 83.8,62.5 81.0,61.0 C78.2,59.5 74.5,58.3 72.0,57.0 C69.5,55.7 67.0,55.0 66.0,53.0 C65.0,51.0 65.7,47.2 66.0,45.0 C66.3,42.8 67.0,41.8 68.0,40.0 C69.0,38.2 71.0,36.3 72.0,34.0 C73.0,31.7 73.8,29.0 74.0,26.0 C74.2,23.0 74.0,19.0 73.0,16.0 C72.0,13.0 70.2,9.7 68.0,8.0 C65.8,6.3 61.3,6.3 60.0,6.0 C58.7,5.7 61.3,5.7 60.0,6.0 Z",
    frente: [
      ["trapecio", "M45.0,54.0 h30.0 a6.0,6.0 0 0 1 6.0,6.0 v0.0 a6.0,6.0 0 0 1 -6.0,6.0 h-30.0 a6.0,6.0 0 0 1 -6.0,-6.0 v0.0 a6.0,6.0 0 0 1 6.0,-6.0 Z"],
      ["hombro", "M15.0,74.0 a14.0,13.0 0 1 0 28.0,0 a14.0,13.0 0 1 0 -28.0,0 Z M77.0,74.0 a14.0,13.0 0 1 0 28.0,0 a14.0,13.0 0 1 0 -28.0,0 Z"],
      ["pecho", "M51.0,64.0 h18.0 a13.0,13.0 0 0 1 13.0,13.0 v12.0 a13.0,13.0 0 0 1 -13.0,13.0 h-18.0 a13.0,13.0 0 0 1 -13.0,-13.0 v-12.0 a13.0,13.0 0 0 1 13.0,-13.0 Z"],
      ["abdomen", "M57.0,102.0 h6.0 a9.0,9.0 0 0 1 9.0,9.0 v20.0 a9.0,9.0 0 0 1 -9.0,9.0 h-6.0 a9.0,9.0 0 0 1 -9.0,-9.0 v-20.0 a9.0,9.0 0 0 1 9.0,-9.0 Z"],
      ["oblicuo", "M42.0,98.0 h1.0 a6.0,6.0 0 0 1 6.0,6.0 v32.0 a6.0,6.0 0 0 1 -6.0,6.0 h-1.0 a6.0,6.0 0 0 1 -6.0,-6.0 v-32.0 a6.0,6.0 0 0 1 6.0,-6.0 Z M77.0,98.0 h1.0 a6.0,6.0 0 0 1 6.0,6.0 v32.0 a6.0,6.0 0 0 1 -6.0,6.0 h-1.0 a6.0,6.0 0 0 1 -6.0,-6.0 v-32.0 a6.0,6.0 0 0 1 6.0,-6.0 Z"],
      ["biceps", "M26.0,84.0 h2.0 a11.0,11.0 0 0 1 11.0,11.0 v8.0 a11.0,11.0 0 0 1 -11.0,11.0 h-2.0 a11.0,11.0 0 0 1 -11.0,-11.0 v-8.0 a11.0,11.0 0 0 1 11.0,-11.0 Z M92.0,84.0 h2.0 a11.0,11.0 0 0 1 11.0,11.0 v8.0 a11.0,11.0 0 0 1 -11.0,11.0 h-2.0 a11.0,11.0 0 0 1 -11.0,-11.0 v-8.0 a11.0,11.0 0 0 1 11.0,-11.0 Z"],
      ["antebrazo", "M23.0,116.0 h2.0 a11.0,11.0 0 0 1 11.0,11.0 v18.0 a11.0,11.0 0 0 1 -11.0,11.0 h-2.0 a11.0,11.0 0 0 1 -11.0,-11.0 v-18.0 a11.0,11.0 0 0 1 11.0,-11.0 Z M95.0,116.0 h2.0 a11.0,11.0 0 0 1 11.0,11.0 v18.0 a11.0,11.0 0 0 1 -11.0,11.0 h-2.0 a11.0,11.0 0 0 1 -11.0,-11.0 v-18.0 a11.0,11.0 0 0 1 11.0,-11.0 Z"],
      ["cuadriceps", "M47.0,150.0 h1.0 a10.0,10.0 0 0 1 10.0,10.0 v32.0 a10.0,10.0 0 0 1 -10.0,10.0 h-1.0 a10.0,10.0 0 0 1 -10.0,-10.0 v-32.0 a10.0,10.0 0 0 1 10.0,-10.0 Z M72.0,150.0 h1.0 a10.0,10.0 0 0 1 10.0,10.0 v32.0 a10.0,10.0 0 0 1 -10.0,10.0 h-1.0 a10.0,10.0 0 0 1 -10.0,-10.0 v-32.0 a10.0,10.0 0 0 1 10.0,-10.0 Z"],
      ["gemelo", "M46.0,218.0 h0.0 a9.0,9.0 0 0 1 9.0,9.0 v28.0 a9.0,9.0 0 0 1 -9.0,9.0 h0.0 a9.0,9.0 0 0 1 -9.0,-9.0 v-28.0 a9.0,9.0 0 0 1 9.0,-9.0 Z M74.0,218.0 h0.0 a9.0,9.0 0 0 1 9.0,9.0 v28.0 a9.0,9.0 0 0 1 -9.0,9.0 h0.0 a9.0,9.0 0 0 1 -9.0,-9.0 v-28.0 a9.0,9.0 0 0 1 9.0,-9.0 Z"],
    ],
    espalda: [
      ["trapecio", "M52.0,54.0 h16.0 a13.0,13.0 0 0 1 13.0,13.0 v10.0 a13.0,13.0 0 0 1 -13.0,13.0 h-16.0 a13.0,13.0 0 0 1 -13.0,-13.0 v-10.0 a13.0,13.0 0 0 1 13.0,-13.0 Z"],
      ["hombro", "M15.0,74.0 a14.0,13.0 0 1 0 28.0,0 a14.0,13.0 0 1 0 -28.0,0 Z M77.0,74.0 a14.0,13.0 0 1 0 28.0,0 a14.0,13.0 0 1 0 -28.0,0 Z"],
      ["dorsal", "M48.0,88.0 h24.0 a13.0,13.0 0 0 1 13.0,13.0 v6.0 a13.0,13.0 0 0 1 -13.0,13.0 h-24.0 a13.0,13.0 0 0 1 -13.0,-13.0 v-6.0 a13.0,13.0 0 0 1 13.0,-13.0 Z"],
      ["lumbar", "M50.0,118.0 h20.0 a8.0,8.0 0 0 1 8.0,8.0 v0.0 a8.0,8.0 0 0 1 -8.0,8.0 h-20.0 a8.0,8.0 0 0 1 -8.0,-8.0 v0.0 a8.0,8.0 0 0 1 8.0,-8.0 Z"],
      ["gluteo", "M51.0,132.0 h18.0 a12.0,12.0 0 0 1 12.0,12.0 v2.0 a12.0,12.0 0 0 1 -12.0,12.0 h-18.0 a12.0,12.0 0 0 1 -12.0,-12.0 v-2.0 a12.0,12.0 0 0 1 12.0,-12.0 Z"],
      ["triceps", "M26.0,84.0 h2.0 a11.0,11.0 0 0 1 11.0,11.0 v8.0 a11.0,11.0 0 0 1 -11.0,11.0 h-2.0 a11.0,11.0 0 0 1 -11.0,-11.0 v-8.0 a11.0,11.0 0 0 1 11.0,-11.0 Z M92.0,84.0 h2.0 a11.0,11.0 0 0 1 11.0,11.0 v8.0 a11.0,11.0 0 0 1 -11.0,11.0 h-2.0 a11.0,11.0 0 0 1 -11.0,-11.0 v-8.0 a11.0,11.0 0 0 1 11.0,-11.0 Z"],
      ["antebrazo", "M23.0,116.0 h2.0 a11.0,11.0 0 0 1 11.0,11.0 v18.0 a11.0,11.0 0 0 1 -11.0,11.0 h-2.0 a11.0,11.0 0 0 1 -11.0,-11.0 v-18.0 a11.0,11.0 0 0 1 11.0,-11.0 Z M95.0,116.0 h2.0 a11.0,11.0 0 0 1 11.0,11.0 v18.0 a11.0,11.0 0 0 1 -11.0,11.0 h-2.0 a11.0,11.0 0 0 1 -11.0,-11.0 v-18.0 a11.0,11.0 0 0 1 11.0,-11.0 Z"],
      ["isquios", "M47.0,158.0 h1.0 a10.0,10.0 0 0 1 10.0,10.0 v28.0 a10.0,10.0 0 0 1 -10.0,10.0 h-1.0 a10.0,10.0 0 0 1 -10.0,-10.0 v-28.0 a10.0,10.0 0 0 1 10.0,-10.0 Z M72.0,158.0 h1.0 a10.0,10.0 0 0 1 10.0,10.0 v28.0 a10.0,10.0 0 0 1 -10.0,10.0 h-1.0 a10.0,10.0 0 0 1 -10.0,-10.0 v-28.0 a10.0,10.0 0 0 1 10.0,-10.0 Z"],
      ["gemelo", "M46.0,218.0 h0.0 a9.0,9.0 0 0 1 9.0,9.0 v28.0 a9.0,9.0 0 0 1 -9.0,9.0 h0.0 a9.0,9.0 0 0 1 -9.0,-9.0 v-28.0 a9.0,9.0 0 0 1 9.0,-9.0 Z M74.0,218.0 h0.0 a9.0,9.0 0 0 1 9.0,9.0 v28.0 a9.0,9.0 0 0 1 -9.0,9.0 h0.0 a9.0,9.0 0 0 1 -9.0,-9.0 v-28.0 a9.0,9.0 0 0 1 9.0,-9.0 Z"],
    ],
  };

  /* ============ DEL EJERCICIO AL MÚSCULO ============
     No es una lista de 104 nombres: es una lista de REGLAS por palabras, en el
     orden en que se prueban. Así un ejercicio nuevo que aparezca mañana —Garmin
     añade nombres cada temporada— cae solo en su sitio sin tocar nada.
     Cada regla reparte el trabajo entre músculos: un press de banca no es sólo
     pecho, lleva tríceps y hombro delante. Los números suman 1. */
  var MUSCULOS = [
    // [ qué palabras, {zona: parte del trabajo} ]
    [["curl de muñeca","estiramiento de antebrazos"], {antebrazo:1}],
    [["curl"],                      {biceps:.75, antebrazo:.25}],
    [["dominadas","jalón","jalon"], {dorsal:.55, biceps:.25, trapecio:.2}],
    [["remo"],                      {dorsal:.5, trapecio:.25, biceps:.25}],
    [["pullover"],                  {dorsal:.6, pecho:.4}],
    [["aperturas invertidas","tirones frontales"], {hombro:.5, trapecio:.5}],
    [["aperturas","cruce de poleas","estiramiento pectoral"], {pecho:.85, hombro:.15}],
    [["press de banca","press inclinado","press declinado","press de pecho",
      "press invertido","flexiones"],{pecho:.6, triceps:.25, hombro:.15}],
    [["fondos"],                    {pecho:.45, triceps:.45, hombro:.1}],
    [["press de hombros","press arnold"], {hombro:.7, triceps:.3}],
    [["elevación lateral","elevacion lateral","elevación frontal","elevacion frontal",
      "elevación con disco","elevacion con disco"], {hombro:1}],
    [["encogimiento"],              {trapecio:1}],
    [["tríceps","triceps","patada de tríceps","patada de triceps"], {triceps:1}],
    [["abdominales","crunch","plancha","elevación de piernas","elevacion de piernas"],
                                    {abdomen:.8, oblicuo:.2}],
    [["flexión lateral","flexion lateral"], {oblicuo:1}],
    [["extensión lumbar","extension lumbar"], {lumbar:.7, gluteo:.3}],
    [["peso muerto"],               {lumbar:.35, gluteo:.3, isquios:.25, trapecio:.1}],
    [["curl femoral"],              {isquios:1}],
    [["extensión de piernas","extension de piernas"], {cuadriceps:1}],
    [["sentadilla","prensa de piernas","zancadas","tijeras"],
                                    {cuadriceps:.55, gluteo:.3, isquios:.15}],
    [["gemelo","estiramiento de gemelos"], {gemelo:1}],
    [["abducción de cadera","abduccion de cadera","balanceo de cadera",
      "movilidad de cadera"],       {gluteo:1}]
  ];
  /* Lo que no encaja en ninguna regla —«Calentamiento», «sin identificar»— no se
     pinta. Mejor un muñeco que dice menos que uno que se inventa el músculo. */
  function zonasDe(nombre) {
    var n = String(nombre || "").toLowerCase();
    for (var i = 0; i < MUSCULOS.length; i++) {
      var claves = MUSCULOS[i][0];
      for (var j = 0; j < claves.length; j++) if (n.indexOf(claves[j]) >= 0) return MUSCULOS[i][1];
    }
    return null;
  }

  /* Nombre en castellano de cada zona, para la leyenda */
  var ZONA_ES = {
    pecho: "Pecho", hombro: "Hombros", biceps: "B\u00edceps", triceps: "Tr\u00edceps",
    antebrazo: "Antebrazos", trapecio: "Trapecio", dorsal: "Dorsal", lumbar: "Lumbar",
    abdomen: "Abdomen", oblicuo: "Oblicuos", gluteo: "Gl\u00fateos", cuadriceps: "Cu\u00e1driceps",
    isquios: "Isquiotibiales", gemelo: "Gemelos"
  };

  /* Del gris al rojo. La curva no es recta a propósito: una zona trabajada a un
     tercio del máximo tiene que VERSE roja, no quedarse en gris. */
  function colorZona(t) {
    var a = [228, 232, 237], b = [193, 28, 38], p = 0.2 + 0.8 * Math.pow(t, 0.65), i, s = [];
    for (i = 0; i < 3; i++) s.push(Math.round(a[i] + (b[i] - a[i]) * p));
    return "rgb(" + s.join(",") + ")";
  }

  var _nCuerpo = 0;

  /* La mancuerna de adorno: dice «esto es fuerza» de un vistazo. Se dibuja aquí
     en vez de reaprovechar el icono de la app porque ése es una imagen y no se
     puede teñir; ésta lleva el color de la familia «Fuerza y sala». */
  var PESA =
    '<svg viewBox="0 0 64 28" aria-hidden="true">' +
      '<rect x="2" y="7" width="7" height="14" rx="2.5"></rect>' +
      '<rect x="10" y="3" width="8" height="22" rx="3"></rect>' +
      '<rect x="18" y="11" width="28" height="6" rx="3"></rect>' +
      '<rect x="46" y="3" width="8" height="22" rx="3"></rect>' +
      '<rect x="55" y="7" width="7" height="14" rx="2.5"></rect>' +
    "</svg>";

  /* LOS MUÑECOS. El color dice en qué se gastó el esfuerzo ESE día: la zona más
     trabajada va al rojo entero y las demás en proporción a los kilos movidos.
     No se compara con el histórico a propósito —así ninguna ficha sale en
     blanco—, y los kilos se reparten entre los músculos de cada ejercicio, que
     un press de banca no es sólo pecho: lleva tríceps y hombro delante. */
  function zonasSesion(series) {
    var zonas = {}, k, i, z, max = 0, hay = 0;
    for (i = 0; i < (series || []).length; i++) {
      z = zonasDe(series[i].que);
      if (!z) continue;
      for (k in z) zonas[k] = (zonas[k] || 0) + (series[i].kg_total || 0) * z[k];
    }
    for (k in zonas) { hay = 1; if (zonas[k] > max) max = zonas[k]; }
    return hay && max ? { zonas: zonas, max: max } : null;
  }

  /* LAS DOS FIGURAS. Van donde antes estaba el icono de la mancuerna: en una
     sesión de pesas ese hueco sólo decía «esto es fuerza», y ahora dice en qué
     músculos se gastó. La mancuerna se queda de marca de agua, en pequeño. */
  function htmlFiguras(series) {
    var r = zonasSesion(series);
    if (!r) return "";
    function figura(vista, titulo) {
      var id = "akhb-c" + (++_nCuerpo), musc = "", t, p, i;
      for (i = 0; i < CUERPO[vista].length; i++) {
        p = CUERPO[vista][i];
        t = (r.zonas[p[0]] || 0) / r.max;
        if (t > 0) musc += '<path d="' + p[1] + '" fill="' + colorZona(t) + '"></path>';
      }
      return '<figure class="akhb-c-fig"><svg viewBox="0 0 120 300" aria-hidden="true">' +
        '<defs><clipPath id="' + id + '"><path d="' + CUERPO.contorno + '"></path></clipPath></defs>' +
        '<path class="akhb-c-piel" d="' + CUERPO.contorno + '"></path>' +
        '<g clip-path="url(#' + id + ')">' + musc + "</g>" +
        '<path class="akhb-c-linea" d="' + CUERPO.contorno + '"></path></svg>' +
        "<figcaption>" + titulo + "</figcaption></figure>";
    }
    return '<div class="akhb-cuerpos">' +
      '<span class="akhb-c-pesa" aria-hidden="true">' + PESA + "</span>" +
      figura("frente", "Frente") + figura("espalda", "Espalda") + "</div>";
  }

  /* La leyenda, en fila y por encima de la tabla de series */
  function htmlLeyenda(series) {
    var r = zonasSesion(series), orden = [], k;
    if (!r) return "";
    for (k in r.zonas) orden.push([k, r.zonas[k]]);
    orden.sort(function (a, b) { return b[1] - a[1]; });
    return '<ul class="akhb-c-ley">' + orden.map(function (o) {
      return '<li><i style="background:' + colorZona(o[1] / r.max) + '"></i>' +
        (ZONA_ES[o[0]] || o[0]) + " <b>" + num(Math.round(o[1])) + " kg</b></li>";
    }).join("") + "</ul>";
  }

  function htmlCuerpo(series) {
    var zonas = {}, k, i, z, max = 0, hay = 0;
    for (i = 0; i < series.length; i++) {
      z = zonasDe(series[i].que);
      if (!z) continue;
      for (k in z) zonas[k] = (zonas[k] || 0) + (series[i].kg_total || 0) * z[k];
    }
    for (k in zonas) { hay = 1; if (zonas[k] > max) max = zonas[k]; }
    if (!hay || !max) return "";

    function figura(vista, titulo) {
      var id = "akhb-c" + (++_nCuerpo), musc = "", t, p;
      for (i = 0; i < CUERPO[vista].length; i++) {
        p = CUERPO[vista][i];
        t = (zonas[p[0]] || 0) / max;
        if (t > 0) musc += '<path d="' + p[1] + '" fill="' + colorZona(t) + '"></path>';
      }
      return '<figure class="akhb-c-fig"><svg viewBox="0 0 120 300" aria-hidden="true">' +
        '<defs><clipPath id="' + id + '"><path d="' + CUERPO.contorno + '"></path></clipPath></defs>' +
        '<path class="akhb-c-piel" d="' + CUERPO.contorno + '"></path>' +
        '<g clip-path="url(#' + id + ')">' + musc + "</g>" +
        '<path class="akhb-c-linea" d="' + CUERPO.contorno + '"></path></svg>' +
        "<figcaption>" + titulo + "</figcaption></figure>";
    }

    var orden = [];
    for (k in zonas) orden.push([k, zonas[k]]);
    orden.sort(function (a, b) { return b[1] - a[1]; });
    var leyenda = orden.slice(0, 8).map(function (o) {
      return '<li><i style="background:' + colorZona(o[1] / max) + '"></i>' +
        (ZONA_ES[o[0]] || o[0]) + " <b>" + num(Math.round(o[1])) + " kg</b></li>";
    }).join("");

    return '<div class="akhb-cuerpo">' + figura("frente", "Frente") + figura("espalda", "Espalda") +
      '<ul class="akhb-c-ley">' + leyenda + "</ul></div>";
  }

  /* ---------- el objeto ---------- */
  function crear(opciones) {
    var o = opciones || {};
    var rutas = o.rutas || [];
    var traerGeo = typeof o.traerGeo === "function" ? o.traerGeo : null;
    /* Puente con la app de mapas: si se le pasa, recibe el recuadro del dibujo
       {s,o,n,e,px} y devuelve la URL de una imagen (IGN, OSM, lo que sea) para
       pintar detrás del trazo. Sin ella, el trazo va sobre fondo liso. */
    /* La capa de fondo del mini mapa. La pone la app, no el módulo: así el
       servidor que se usa y su atribución se deciden en un solo sitio.
       { url:"…/{z}/{x}/{y}.png", maxZ:17, atrib:"…" }. Sin ella, el trazo va
       sobre fondo liso, que es exactamente lo que se ve también cuando no hay
       cobertura: las teselas no cargan y el recorrido se sigue viendo. */
    var capaMapa = (o.capaMapa && o.capaMapa.url) ? o.capaMapa : null;
    /* Los iconos de la app, los de la marca KHB, en vez de los dibujos del
       módulo: { sen:"iconos/khb/11-montana.webp", … }. Si una imagen no carga
       —sin red, o el fichero no está en el repo— cae sola al SVG de dentro,
       que no depende de nada. */
    var iconos = o.iconos || null;
    /* EL PUENTE CON STRAVA. Un fichero aparte, { "<id de intervals>": { p:
       "<polilínea>", n: "<nombre>", d: <desnivel> } }, para las salidas que no
       tienen ruta archivada en la colección. Va suelto y se pide solo al entrar
       en la pata, nunca dentro de salud.json, que se carga entero al abrir.
       Manda menos que la colección: si algún día archivas el GPX de una de
       éstas, la ruta buena gana y esto se cae solo sin limpiar nada. */
    /* El fichero es {meta, trazos, sin}: la actividad está DENTRO de `trazos`,
       no en la raíz. Se aceptan las dos formas porque antes se buscaba en la
       raíz y no encontraba nunca nada: ni un trazo ni un perfil. */
    var trazos = (o.trazos && o.trazos.trazos) ? o.trazos.trazos : (o.trazos || null);
    /* Las series de cada sesión de pesas, por id de actividad. Es lo único que
       intervals no guarda: sale del fichero original del reloj, y lo rellena el
       paso del FIT del workflow. Si no está, la ficha sale como antes. */
    var fuerza = (o.fuerza && o.fuerza.sesiones) ? o.fuerza.sesiones : (o.fuerza || null);
    var botonVolver = typeof o.botonVolver === "string" ? o.botonVolver : "";

    /* índice de rutas por fecha, para clasificar y para el mapa de las nuevas */
    var rutaPorFecha = {}, fechasSen = {};
    rutas.forEach(function (r) {
      var f = String(r.f || "");
      if (f.length !== 8) return;
      var iso = f.slice(0, 4) + "-" + f.slice(4, 6) + "-" + f.slice(6);
      (rutaPorFecha[iso] = rutaPorFecha[iso] || []).push(r);
      if (r.a === "sen") fechasSen[iso] = true;
    });

    var todas = deHistorico(o.historico, fechasSen).concat(deSalud(o.actividades, fechasSen));

    /* ---------- casar cada salida con su ruta archivada ----------
       Se hace POR DÍA y una a una, no actividad por actividad.
       El 29 de enero de 2026 hizo dos: Calp (5,59 km) y Altea (5,06 km), y
       tenía las dos archivadas: Calp 6,49 y Altea 5,30. Buscando por separado
       la más parecida en kilómetros, las DOS se quedaban con Altea —5,59 está
       más cerca de 5,30 que de 6,49— y la del Peñón de Ifach no salía en
       ningún sitio. Pasaba en 7 días y se perdían 8 rutas.
       Ahora manda el nombre cuando coincide el sitio, los kilómetros deciden
       el resto, y una ruta ya usada no se puede volver a usar ese día. */

    var VACIAS = {
      senderismo:1, caminar:1, ciclismo:1, carrera:1, correr:1, paseo:1, marcha:1,
      ruta:1, en:1, de:1, del:1, la:1, el:1, los:1, las:1, por:1, a:1, y:1,
      morning:1, afternoon:1, evening:1, lunch:1, night:1, walk:1, ride:1, hike:1, run:1
    };
    function palabras(t) {
      var out = {};
      String(t || "").toLowerCase()
        .replace(/[^a-záéíóúüñ0-9\s]/g, " ")
        .split(/\s+/).forEach(function (p) {
          if (p.length > 2 && !VACIAS[p]) out[p] = true;
        });
      return out;
    }
    function mismoSitio(a, b) {
      var A = palabras(a), B = palabras(b);
      for (var k in A) if (B[k]) return true;
      return false;
    }

    var porDia = {};
    todas.forEach(function (x) {
      /* Antes se exigía además `fuente === "salud"`, porque el puente viejo
         traía la ruta puesta y no había nada que emparejar. El puente nuevo
         también la trae, pero no siempre: lo que venga sin ruta entra aquí
         venga del año que venga. */
      if (x.ruta) return;
      (porDia[x.fecha] = porDia[x.fecha] || []).push(x);
    });

    Object.keys(porDia).forEach(function (f) {
      var aa = porDia[f], cand = rutaPorFecha[f];
      if (!cand || !cand.length) return;

      /* todas las parejas posibles, con su coste. El nombre pesa más que los
         kilómetros: si los dos dicen «Calp», es ésa y no hay más que hablar. */
      var pares = [];
      aa.forEach(function (x, i) {
        cand.forEach(function (r, j) {
          var d = (x.km && r.km != null) ? Math.abs(r.km - x.km) : 0;
          if (x.km && r.km != null && d > 3 && !mismoSitio(x.nombre, r.n)) return;
          pares.push({ i: i, j: j, coste: d - (mismoSitio(x.nombre, r.n) ? 10 : 0) });
        });
      });
      pares.sort(function (p, q) { return p.coste - q.coste; });

      var actUsada = {}, rutaUsada = {};
      pares.forEach(function (p) {
        if (actUsada[p.i] || rutaUsada[p.j]) return;
        actUsada[p.i] = rutaUsada[p.j] = true;
        var x = aa[p.i], r = cand[p.j];
        x.ruta = r.id; x.celda = r.c;
        if (!x.nombre) x.nombre = r.n;
      });
    });

    /* Lo que trae el fichero original del reloj. El DIBUJO sólo donde no
       llega la colección, que dibuja mejor; el PERFIL DE ALTURA siempre, que
       la colección guarda por dónde fue pero no a qué altura. */
    if (trazos) {
      todas.forEach(function (x) {
        /* Ya no se mira de dónde viene, sino si tiene id: desde que el puente
           del archivo lo trae, los años viejos también tienen traza y perfil.
           Los suyos salen de la exportación de Garmin, no de intervals. */
        if (!x.id) return;
        var t = trazos[x.id];
        if (!t) return;
        if (t.h && !x.perfil) x.perfil = t.h;
        if (x.ruta || x.poli) return;
        x.poli = t.p || null;
        /* El nombre de Strava suele ser mejor que el de intervals: «MTB por el
           Cerro de Almodóvar» contra «Madrid Ciclismo en ruta». */
        if (t.n) x.nombre = t.n;
        if (t.d != null && (x.desnivel == null || x.desnivel === 0)) x.desnivel = t.d;
      });
    }

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
      metrica: "n",        // con qué se mide la altura de las barras del año
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

    function metricaActual() {
      for (var i = 0; i < METRICAS.length; i++) if (METRICAS[i].id === estado.metrica) return METRICAS[i];
      return METRICAS[0];
    }

    /* Cuánto hubo ese año de cada deporte, en la métrica elegida. */
    function repartoAnio(y, m) {
      var meses = porAnio[y] || {}, r = {}, n = 0;
      Object.keys(meses).forEach(function (k) {
        meses[k].forEach(function (x) {
          var v = m.campo ? x[m.campo] : 1;
          if (v == null) return;                    // lo que no se sabe no suma
          if (m.div) v = v / m.div;
          var g = FAMILIA[x.dep] || "sala";
          r[g] = (r[g] || 0) + v; n += v;
        });
      });
      return { r: r, n: n };
    }

    /* Aviso honesto: hay métricas que el archivo viejo no guarda. */
    function huecoDe(m) {
      if (m.id === "min") {
        return "Hasta 2021 solo de las salidas: el archivo no guarda la duración " +
               "del rodillo, la fuerza ni las caminatas.";
      }
      if (m.id === "d") {
        return "El del rodillo cuenta —subir en Watopia cuesta igual— pero va " +
               "en su color, que desde 2023 es casi todo. Hasta 2021, solo el " +
               "de las salidas que están en el archivo.";
      }
      if (m.id === "km") {
        return "Un kilómetro de bici no es un kilómetro de monte: por eso los " +
               "años de senderismo salen cortos aquí. Para compararlos, horas o carga.";
      }
      if (m.id === "c") return "La carga solo existe desde octubre de 2021: antes no había pulsómetro en el registro.";
      return "";
    }

    function htmlAnios() {
      var m = metricaActual(), max = 0, cache = {};
      anios.forEach(function (y) { cache[y] = repartoAnio(y, m); max = Math.max(max, cache[y].n); });
      if (!max) max = 1;

      /* El volver y las medidas en la misma fila: ocupan una línea en vez de
         dos, y el volver queda arriba del todo, que es donde se busca. El HTML
         del botón lo pone la app (opción `botonVolver`); el módulo no sabe ni
         tiene que saber a dónde vuelve. */
      var selector = '<div class="akhb-cabrow">' +
        (botonVolver || "<span></span>") +
        '<div class="akhb-metricas" role="group" aria-label="Medida">' +
        METRICAS.map(function (x) {
          return '<button type="button" data-met="' + x.id + '" aria-pressed="' +
            (x.id === m.id) + '"' + (x.id === m.id ? ' class="sel"' : "") + ">" +
            x.nom + "</button>";
        }).join("") + "</div></div>";

      var tira = anios.map(function (y) {
        var d = cache[y], sel = y === estado.anio;
        /* la altura dice cuánto hubo ese año; los trozos, de qué. El mínimo
           es para que un año flojo se siga pudiendo pulsar y ver de qué fue. */
        var alto = d.n ? Math.max(7, Math.round(d.n / max * 100)) : 0;
        var trozos = ORDEN_FAM.filter(function (g) { return d.r[g]; }).map(function (g) {
          return '<i style="height:' + (d.r[g] / d.n * alto).toFixed(2) +
                 '%;background:var(--akhb-fam-' + g + ')" title="' +
                 esc(NOMBRE_FAM[g]) + ": " + num(d.r[g], 0) + '"></i>';
        }).join("");
        return '<button type="button" role="tab" class="akhb-anio' + (sel ? " sel" : "") +
          '" aria-selected="' + sel + '" data-anio="' + y + '">' +
          '<span class="akhb-anio-n">' + y + "</span>" +
          '<span class="akhb-barra">' + trozos + "</span>" +
          '<span class="akhb-anio-c">' + (d.n ? num(d.n, m.dec) + m.suf : "·") + "</span></button>";
      }).join("");

      var hay = {};
      anios.forEach(function (y) { for (var g in cache[y].r) hay[g] = true; });
      var leyenda = ORDEN_FAM.filter(function (g) { return hay[g]; }).map(function (g) {
        return '<span><i style="background:var(--akhb-fam-' + g + ')"></i>' +
               esc(NOMBRE_FAM[g]) + "</span>";
      }).join("");

      var aviso = huecoDe(m);
      return selector +
        '<div class="akhb-anios" role="tablist" aria-label="Años">' + tira + "</div>" +
        '<div class="akhb-leyenda">' + leyenda + "</div>" +
        (aviso ? '<p class="akhb-aviso">' + aviso + "</p>" : "");
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
          '<span class="akhb-tira" style="background:var(--akhb-fam-' +
            (FAMILIA[x.dep] || "sala") + ')"></span>' +
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

    /* En filas, un campo vacío es una raya que ocupa una línea entera. Así que
       lo que no se sabe no se pinta: la ficha dice lo que hay, no lo que falta. */
    function dato(et, v, suf) {
      if (v == null || v === "") return "";
      return '<tr><th scope="row">' + et + "</th><td>" + v + (suf || "") + "</td></tr>";
    }

    /* ---------- ritmo y velocidad ----------
       Casi siempre vienen del fichero, pero en 821 salidas del archivo no: son
       años en los que sólo se apuntó la distancia y el tiempo. Se calculan aquí
       —es una división— y NO se guardan en ningún sitio: un dato que sale de
       otros dos no tiene por qué ocupar bytes en el móvil ni viajar al teléfono.
       A pie se lee en minutos por kilómetro; en bici, en kilómetros por hora. */
    var A_PIE = { sen: 1, and: 1, pas: 1, cor: 1 };

    function ritmoDe(x) {
      if (x.ritmo != null) return x.ritmo;
      if (!x.km || !x.min) return null;
      return x.min / x.km;
    }
    function velDe(x) {
      if (x.vel != null) return x.vel;
      if (!x.km || !x.min) return null;
      return x.km / (x.min / 60);
    }
    /* 9,72 minutos por kilómetro se lee «9:43», no «9,72» */
    function mmss(min) {
      var s = Math.round(min * 60), m = Math.floor(s / 60);
      return m + ":" + dosD(s - m * 60);
    }

    function htmlFicha(x, clave) {
      var aPie = !!A_PIE[x.dep], rit = ritmoDe(x), vel = velDe(x);
      var parado = (x.minTotal != null && x.min != null && x.minTotal - x.min >= 2)
        ? x.minTotal - x.min : null;
      var campos =
        dato("Duración", x.min, " min") +
        (parado != null ? dato("Parado", parado, " min") : "") +
        dato("Distancia", x.km != null ? num(x.km, 2) : null, " km") +
        /* el ritmo es de a pie y la velocidad de rueda: poner los dos en las dos
           es lo que hace que una ficha se lea peor, no mejor */
        (aPie && rit != null ? dato("Ritmo", mmss(rit), " min/km") : "") +
        (!aPie && vel != null && x.km ? dato("Velocidad media", num(vel, 1), " km/h") : "") +
        dato("Desnivel", x.desnivel != null ? num(x.desnivel) : null, " m") +
        (x.desnivelNeg != null ? dato("Bajada", num(x.desnivelNeg), " m") : "") +
        (x.altMin != null && x.altMax != null
          ? dato("Altura", num(x.altMin) + " – " + num(x.altMax), " m") : "") +
        (x.pendMax != null ? dato("Pendiente máxima", num(x.pendMax, 1), " %") : "") +
        (x.pendMedia != null ? dato("Pendiente media", num(x.pendMedia, 1), " %") : "") +
        (x.carga != null ? dato("Carga", x.carga) : "") +
        /* lo de abajo solo si existe: una caminata no tiene vatios y poner
           «Potencia —» es ruido, no información */
        (x.pulso != null ? dato("Pulso medio", x.pulso, " ppm") : "") +
        (x.pulsoMax != null ? dato("Pulso máximo", x.pulsoMax, " ppm") : "") +
        (x.pot   != null ? dato("Potencia", x.pot, " W") : "") +
        (x.wkg   != null ? dato("Vatios/kg", num(x.wkg, 2)) : "") +
        (x.cadencia != null
          ? dato("Cadencia", num(x.cadencia), aPie ? " zancadas/min" : " rpm") : "") +
        (x.zancada != null ? dato("Zancada", num(x.zancada, 2), " m") : "") +
        (x.pasos != null ? dato("Pasos", num(x.pasos)) : "") +
        (x.kcal  != null ? dato("Kcal netas", num(x.kcal)) : "") +
        (x.kcal == null && x.kcalReloj != null ? dato("Kcal del reloj", num(x.kcalReloj)) : "") +
        (x.kcal == null && x.kcalReloj == null && x.kcalEst != null
          ? dato("Kcal estimadas", "≈ " + num(x.kcalEst)) : "") +
        (x.efAe != null ? dato("Efecto aeróbico", num(x.efAe, 1)) : "") +
        (x.temp != null ? dato("Temperatura", num(x.temp, 1), " °C") : "") +
        (x.hora ? dato("Hora de inicio", x.hora) : "");
      /* La zona sale de la celda, que es lo que se sabe antes de pedir el
         trazo; cuando el trazo llega, se recalcula con el centro de verdad. */
      var cc = celdaACoord(x.celda);
      var lugar = rotuloLugar(lugarDe(x.nombre), cc ? zonaDe(cc[0], cc[1]) : null);
      /* ---------- las pesas ----------
         Lo que hizo de verdad, ejercicio a ejercicio. Los kilos son el MÁXIMO
         de la serie y el volumen es kilos por repetición sumado, que es como
         lo cuenta Garmin. «Sin identificar» no es un hueco: es que el reloj no
         supo qué ejercicio era —lleva tres códigos por serie y no coinciden—,
         y el nombre bueno llega con la siguiente exportación de Garmin. */
      var series = (fuerza && x.id) ? fuerza[x.id] : null;
      var figuras = (series && series.length) ? htmlFiguras(series) : "";
      var tablaFuerza = "";
      if (series && series.length) {
        var tot = { series: 0, reps: 0, kg: 0, min: 0 };
        var filas = series.map(function (e) {
          tot.series += e.series || 0; tot.reps += e.reps || 0;
          tot.kg += e.kg_total || 0;   tot.min += e.min || 0;
          return "<tr><th>" + esc(e.que || "sin identificar") + "</th>" +
            "<td>" + (e.series != null ? e.series : "—") + "</td>" +
            "<td>" + (e.reps != null ? e.reps : "—") + "</td>" +
            "<td>" + (e.kg_max != null ? num(e.kg_max, 1) + " kg" : "—") + "</td>" +
            "<td>" + (e.kg_total != null ? num(e.kg_total) + " kg" : "—") + "</td>" +
            "<td>" + (e.min != null ? num(e.min, 1) : "—") + "</td></tr>";
        }).join("");
        tablaFuerza =
          '<div class="akhb-fuerza">' +
            htmlLeyenda(series) +
            "<h5>" + series.length + (series.length === 1 ? " ejercicio" : " ejercicios") +
              " \u00b7 " + tot.series + " series \u00b7 " + tot.reps + " repeticiones" +
              (tot.kg ? " \u00b7 " + num(tot.kg) + " kg movidos" : "") + "</h5>" +
            '<table class="akhb-tf"><thead><tr>' +
              "<th>Ejercicio</th><th>Series</th><th>Reps</th><th>Max</th><th>Volumen</th><th>Min</th>" +
            "</tr></thead><tbody>" + filas + "</tbody></table>" +
          "</div>";
      }
      return '<div class="akhb-ficha' + (tablaFuerza ? " akhb-con-fuerza" : "") + '">' +
        '<figure class="akhb-mapa" data-mapa="' + clave + '">' +
          '<div class="akhb-lienzo">' +
            (llevaMapa(x) ? '<div class="akhb-cargando">Trayendo el trazo…</div>'
                          : (figuras || iconoHTML(x.dep))) +
            (lugar ? '<span class="akhb-lugar" data-pueblo="' +
                       esc(lugarDe(x.nombre) || "") + '">' + esc(lugar) + "</span>" : "") +
          "</div>" +
          /* el perfil se rellena al pintar; si no hay alturas, ni aparece */
          (x.perfil ? '<div class="akhb-perfil" data-perfil="1"></div>' : "") +
          "<figcaption>" +
            (esDeDentro(x.dep) ? NOMBRE_DEP[x.dep] + " \u2014 en casa, sin recorrido"
             : x.ruta ? esc(x.nombre || "")
             : x.poli ? esc(x.nombre || "Trazo de Strava")
             /* Salió a la calle y no tenemos la línea. Decirlo así y no «sin
                recorrido»: recorrido hubo, lo que falta es el dibujo. */
             : NOMBRE_DEP[x.dep] + " \u2014 pendiente de trazo") +
          "</figcaption>" +
        "</figure>" +
        '<table class="akhb-kv"><tbody>' + campos + "</tbody></table>" +
        tablaFuerza +
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
      centraAnio();
      pintarMapas();
    }

    /* En el móvil caben seis años de catorce: si no se hace esto, al entrar se
       ve 2013 y el año en curso queda escondido a la derecha. Se mueve solo la
       tira, no la página. */
    function centraAnio() {
      var tira = estado.el.querySelector(".akhb-anios");
      if (!tira) return;
      var chip = tira.querySelector(".akhb-anio.sel");
      if (!chip) return;
      var sobra = tira.scrollWidth - tira.clientWidth;
      if (sobra <= 0) return;
      var x = chip.offsetLeft - (tira.clientWidth - chip.offsetWidth) / 2;
      tira.scrollLeft = Math.max(0, Math.min(sobra, x));
    }

    /* ---------- mini mapa ---------- */
    /* Web Mercator. Se proyecta así, y no con un coseno a ojo, porque es la
       proyección de las teselas del IGN y de OSM: si algún día se pinta un mapa
       detrás, el trazo cae donde tiene que caer sin tocar nada. */
    function mX(lon) { return lon * Math.PI / 180; }
    function mY(lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
    function mLat(y) { return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI; }

    /* ---------- el mini mapa ----------
       Proyección de las teselas («slippy map», Web Mercator): de grados a
       píxeles del mundo en un zoom dado. Es la cuenta que hace Leaflet, pero
       escrita a mano: son veinte líneas y evita cargar 140 KB de librería para
       un dibujo de 380 px que no se puede ni arrastrar. Para lo interactivo
       está la app de mapas. */
    var LIENZO = 380, MARGEN = 16, TESELA = 256;

    function mundoX(lon, z) { return (lon + 180) / 360 * TESELA * Math.pow(2, z); }
    function mundoY(lat, z) {
      var r = lat * Math.PI / 180;
      return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * TESELA * Math.pow(2, z);
    }

    /* El zoom mayor en el que la ruta entera cabe en el cuadro. Mayor zoom =
       más detalle, así que se busca de arriba abajo y se para en el primero
       que entra. */
    function zoomQueCabe(b, maxZ) {
      for (var z = maxZ; z >= 1; z--) {
        var dx = Math.abs(mundoX(b[3], z) - mundoX(b[1], z));
        var dy = Math.abs(mundoY(b[0], z) - mundoY(b[2], z));
        if (Math.max(dx, dy) <= LIENZO - 2 * MARGEN) return z;
      }
      return 1;
    }

    function dibujaTrazo(fig, pts) {
      if (!pts || pts.length < 2) { pintaIcono(fig, { dep: "otr" }); return; }

      var lats = [], lons = [];
      pts.forEach(function (p) { lats.push(p[0]); lons.push(p[1]); });
      var b = [Math.min.apply(null, lats), Math.min.apply(null, lons),
               Math.max.apply(null, lats), Math.max.apply(null, lons)];

      var maxZ = capaMapa ? (capaMapa.maxZ || 17) : 19;
      var z = zoomQueCabe(b, maxZ);
      var cx = (mundoX(b[1], z) + mundoX(b[3], z)) / 2;
      var cy = (mundoY(b[0], z) + mundoY(b[2], z)) / 2;
      var izq = cx - LIENZO / 2, arr = cy - LIENZO / 2;

      /* Las teselas van DENTRO del SVG, no en divs: así escalan con el viewBox
         igual que el trazo. Puestas en píxeles se quedaban fuera del recorte en
         cuanto el cuadro no medía exactamente 380. */
      var fondo = "";
      if (capaMapa) {
        var n = Math.pow(2, z);
        var t0x = Math.floor(izq / TESELA), t1x = Math.floor((izq + LIENZO) / TESELA);
        var t0y = Math.floor(arr / TESELA), t1y = Math.floor((arr + LIENZO) / TESELA);
        for (var tx = t0x; tx <= t1x; tx++) {
          for (var ty = t0y; ty <= t1y; ty++) {
            if (ty < 0 || ty >= n) continue;
            var u = capaMapa.url
              .replace("{z}", z)
              .replace("{x}", ((tx % n) + n) % n)
              .replace("{y}", ty);
            fondo += '<image href="' + esc(u) + '" x="' + (tx * TESELA - izq).toFixed(1) +
              '" y="' + (ty * TESELA - arr).toFixed(1) + '" width="' + TESELA +
              '" height="' + TESELA + '"/>';
          }
        }
      }

      function px(p) { return [mundoX(p[1], z) - izq, mundoY(p[0], z) - arr]; }
      var d = pts.map(function (p, i) {
        var q = px(p);
        return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1);
      }).join(" ");
      var a = px(pts[0]), f = px(pts[pts.length - 1]);

      /* Escala: sin ella el dibujo no dice si son dos kilómetros o veinte.
         Con el zoom real la cuenta ya no es aproximada. */
      var la0 = (b[0] + b[2]) / 2;
      var mPorPx = 156543.03392 * Math.cos(la0 * Math.PI / 180) / Math.pow(2, z);
      var pasos = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000], paso = pasos[0];
      for (var q2 = 0; q2 < pasos.length; q2++) {
        if (pasos[q2] / mPorPx <= LIENZO * 0.32) paso = pasos[q2];
      }
      var largo = paso / mPorPx, Y = LIENZO - 14, X = MARGEN;
      var esc_ = isFinite(largo) && largo > 12
        ? '<g class="akhb-escala">' +
            '<rect x="' + (X - 5) + '" y="' + (Y - 11) + '" width="' + (largo + 52).toFixed(1) +
              '" height="21" rx="4"/>' +
            '<line x1="' + X + '" y1="' + Y + '" x2="' + (X + largo).toFixed(1) + '" y2="' + Y + '"/>' +
            '<line x1="' + X + '" y1="' + (Y - 5) + '" x2="' + X + '" y2="' + (Y + 5) + '"/>' +
            '<line x1="' + (X + largo).toFixed(1) + '" y1="' + (Y - 5) + '" x2="' +
              (X + largo).toFixed(1) + '" y2="' + (Y + 5) + '"/>' +
            '<text x="' + (X + largo + 7).toFixed(1) + '" y="' + (Y + 4) + '">' +
              (paso < 1000 ? paso + " m" : (paso / 1000) + " km") + "</text></g>"
        : "";

      var lienzo = fig.querySelector(".akhb-lienzo") || fig;
      var chapa = lienzo.querySelector(".akhb-lugar");
      lienzo.innerHTML =
        '<svg class="akhb-trazo" viewBox="0 0 ' + LIENZO + " " + LIENZO + '" role="img" ' +
          'aria-label="Recorrido de la actividad">' + fondo +
          /* El trazo va dos veces: blanco grueso debajo y color encima. El color
             es MORADO y no el azul de la app a propósito: comprobado sobre los
             colores de OpenStreetMap, el rojo y el naranja son las carreteras,
             el verde los parques, el azul el agua y el marrón las curvas de
             nivel. El morado es el único tono que no se confunde con ninguno;
             el granate chocaba con las vías y el violeta con el río. */
          '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="9" ' +
            'stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>' +
          '<path d="' + d + '" fill="none" stroke="var(--akhb-trazo, currentColor)" ' +
            'stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>' +
          '<circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) +
            '" r="6" class="akhb-ini"/>' +
          '<circle cx="' + f[0].toFixed(1) + '" cy="' + f[1].toFixed(1) +
            '" r="6" class="akhb-fin"/>' + esc_ +
        "</svg>";
      /* La chapa se queda: la toponimia de la tesela no siempre llega a este
         zoom, y decir la provincia o el país ahorra abrir el mapa. Ahora que
         hay trazo, la zona se recalcula con el centro real en vez de con la
         celda redondeada. */
      /* Con el trazo ya se sabe dónde fue de verdad. Si la chapa no existía
         —porque ni el nombre ni la celda decían nada, que es lo normal en las
         que vienen de Strava— se crea ahora. */
      var z = zonaDe((b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
      var r2 = rotuloLugar(chapa ? (chapa.getAttribute("data-pueblo") || null) : null, z);
      if (r2) {
        if (!chapa) {
          chapa = document.createElement("span");
          chapa.className = "akhb-lugar";
        }
        chapa.textContent = r2;
        lienzo.appendChild(chapa);
      } else if (chapa) {
        lienzo.appendChild(chapa);
      }

      /* La atribución es obligatoria y tiene que verse. Va con el nombre de la
         ruta, debajo del mapa, y solo cuando hay mapa que atribuir. */
      if (capaMapa && capaMapa.atrib) {
        var pie = fig.querySelector("figcaption");
        if (pie && !pie.querySelector(".akhb-atrib")) {
          var sp = document.createElement("span");
          sp.className = "akhb-atrib";
          sp.innerHTML = capaMapa.atrib;
          pie.appendChild(sp);
        }
      }
    }

    /* ---------- el perfil de altura ----------
       Debajo del mapa, como en la ficha de cualquier ruta. Es lo que dice si
       los 400 metros de desnivel fueron una subida larga o doce repechos, y es
       lo único que el mapa no cuenta.

       Va contra los KILÓMETROS, que es como se lee un perfil, y eso sale
       gratis: los puntos vienen repartidos por distancia recorrida, así que el
       punto k está en el kilómetro k/N del total. */
    var P_ANCHO = 380, P_ALTO = 92;

    function dibujaPerfil(fig, alts, km) {
      var caja = fig ? fig.querySelector("[data-perfil]") : null;
      if (!caja) return;
      if (!alts || alts.length < 3) { caja.parentNode.removeChild(caja); return; }

      var min = Math.min.apply(null, alts), max = Math.max.apply(null, alts);
      if (!isFinite(min) || !isFinite(max)) { caja.parentNode.removeChild(caja); return; }

      var IZQ = 36, DER = 6, ARR = 9, ABA = 15;      /* sitio para las cifras */
      var w = P_ANCHO - IZQ - DER, h = P_ALTO - ARR - ABA;
      /* Suelo de 30 m en la escala vertical: sin él, un paseo llano por Madrid
         sale dibujado como los Pirineos. Lo que se ve tiene que ser el relieve
         que hubo, no el que cabe en el cuadro. */
      var rango = Math.max(max - min, 30);
      var base = (min + max) / 2 - rango / 2;
      function X(i) { return IZQ + w * i / (alts.length - 1); }
      function Y(a) { return ARR + h - h * (a - base) / rango; }

      var linea = "", i;
      for (i = 0; i < alts.length; i++) {
        linea += (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(alts[i]).toFixed(1) + " ";
      }
      var suelo = (ARR + h).toFixed(1);
      var area = "M" + X(0).toFixed(1) + " " + suelo + " L" + linea.substring(1) +
                 "L" + X(alts.length - 1).toFixed(1) + " " + suelo + " Z";

      /* Las marcas de kilómetro: las justas para orientarse, y redondas. */
      var marcas = "";
      if (km > 0) {
        var pasos = [1, 2, 5, 10, 20, 50], paso = pasos[0];
        for (i = 0; i < pasos.length; i++) { if (km / pasos[i] >= 3) paso = pasos[i]; }
        for (var d = paso; d < km; d += paso) {
          var xx = IZQ + w * d / km;
          marcas += '<line class="akhb-p-marca" x1="' + xx.toFixed(1) + '" y1="' + ARR +
                    '" x2="' + xx.toFixed(1) + '" y2="' + suelo + '"/>';
          /* la cifra sólo si no se pisa con el total, que va en la esquina */
          if (IZQ + w - xx > 44) {
            marcas += '<text class="akhb-p-km" x="' + xx.toFixed(1) + '" y="' + (P_ALTO - 4) +
                      '" text-anchor="middle">' + d + "</text>";
          }
        }
        marcas += '<text class="akhb-p-km" x="' + (IZQ + w).toFixed(1) + '" y="' +
                  (P_ALTO - 4) + '" text-anchor="end">' +
                  num(km, km < 100 ? 1 : 0) + " km</text>";
      }

      caja.innerHTML =
        '<svg class="akhb-p-svg" viewBox="0 0 ' + P_ANCHO + " " + P_ALTO + '" role="img" ' +
          'aria-label="Perfil de altura: de ' + Math.round(min) + " a " + Math.round(max) +
          ' metros">' +
          '<path class="akhb-p-area" d="' + area + '"/>' +
          '<path class="akhb-p-linea" d="' + linea.trim() + '"/>' +
          marcas +
          '<text class="akhb-p-alt" x="2" y="' +
            Math.min(Math.max(Y(max) + 3.5, ARR + 7), ARR + h) + '">' + Math.round(max) + "</text>" +
          '<text class="akhb-p-alt" x="2" y="' +
            Math.min(Y(min) + 3.5, ARR + h) + '">' + Math.round(min) + "</text>" +
          '<text class="akhb-p-alt akhb-p-ud" x="2" y="' + (P_ALTO - 4) + '">m</text>' +
        "</svg>";
    }

    function pintarMapas() {
      if (!estado.el) return;
      var fig = estado.el.querySelector("[data-mapa]");
      if (!fig) return;
      var clave = fig.getAttribute("data-mapa");
      var x = buscaPorClave(clave);
      if (!x) return;
      /* El perfil no depende del dibujo: lo hay aunque la ruta la ponga la
         colección, y no lo hay en el rodillo aunque Zwift invente cuestas. */
      if (x.perfil && llevaMapa(x)) dibujaPerfil(fig, decodificarPerfil(x.perfil), x.km);

      if (!llevaMapa(x)) { pintaIcono(fig, x); return; }

      /* 1 · polilínea de Strava, si el workflow ya la trae */
      if (x.poli) { dibujaTrazo(fig, decodificarPolilinea(x.poli)); return; }

      /* 2 · geometría de la colección de rutas */
      if (x.ruta && x.celda && traerGeo) {
        var pinta = function (geo) {
          var segs = geo && geo[x.ruta];
          if (!segs) { pintaIcono(fig, x); return; }   // la leyenda se respeta
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

    /* Si la actividad TENIA ruta y el trazo no ha llegado, no se dice «sin
       recorrido», que seria mentira: se dice que no se ha podido traer. */
    /* La imagen de la app encima del dibujo del módulo. Los dos se pintan
       siempre: si la imagen no carga —sin red, o el fichero no está en el
       repo— se quita sola y queda el SVG debajo, que no depende de nada.
       Se hace así y no reemplazando el nodo porque el icono se pinta con
       innerHTML, y el fallo puede saltar antes de que la imagen esté colgada
       del documento: ahí `outerHTML` revienta y `remove()` no. */
    function iconoHTML(dep) {
      var u = iconos && (iconos[dep] || iconos.otr);
      if (!u) return iconoSVG(dep);
      return '<span class="akhb-marca-caja">' +
        '<img class="akhb-marca" src="' + esc(u) + '" alt="' +
        esc(NOMBRE_DEP[dep] || "Actividad") + '" onerror="this.remove()">' +
        iconoSVG(dep) + "</span>";
    }

    function pintaIcono(fig, x) {
      var lienzo = fig.querySelector(".akhb-lienzo") || fig;
      /* En una sesión de pesas el hueco lo ocupan los muñecos, no el icono.
         Esto se llama al terminar de pintar y antes borraba lo que ya había. */
      if (lienzo.querySelector(".akhb-cuerpos")) return;
      var chapa = lienzo.querySelector(".akhb-lugar");
      lienzo.innerHTML = iconoHTML(x.dep);
      if (chapa) lienzo.appendChild(chapa);
      var cap = fig.querySelector("figcaption");
      if (cap && (x.ruta || x.poli)) {
        cap.textContent = (x.nombre ? x.nombre + " \u2014 " : "") + "no he podido traer el trazo";
      }
    }

    function buscaPorClave(clave) {
      var y = clave.slice(0, 4), mm = clave.slice(4, 6);
      var i = parseInt(clave.split("-")[1], 10);
      var lista = (porAnio[y] || {})[mm] || [];
      return lista[i] || null;
    }

    /* ---------- clics ---------- */
    function alPulsar(e) {
      var t = e.target.closest ? e.target.closest("[data-anio],[data-mes],[data-abre],[data-met]") : null;
      if (!t || !estado.el.contains(t)) return;
      if (t.hasAttribute("data-met")) {
        estado.metrica = t.getAttribute("data-met"); pintar(); return;
      }
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
