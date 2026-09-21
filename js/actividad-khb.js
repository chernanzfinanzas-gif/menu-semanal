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
  var DIA_SEM = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
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
  /* LAS MEDIDAS. `fuente` dice DE DÓNDE sale el número, que no es lo mismo que
     cómo se dibuja: «act» lo suma de las actividades, «dia» de los días del
     registro. Todo lo que dibuja —la tira, las casillas, la lista— pregunta por
     la fuente y no sabe nada más. Las que vendrán después (potencia, ritmo,
     velocidad ascensional) no se suman sino que se quedan con el mejor del
     tramo: ésas traerán una fuente propia y no un `if` metido aquí dentro. */
  var METRICAS = [
    { id: "n",   nom: "Sesiones",    fuente: "act", campo: null,        dec: 0, suf: "" },
    { id: "min", nom: "Horas",       fuente: "act", campo: "min",       dec: 0, suf: "\u00a0h", div: 60 },
    { id: "km",  nom: "Kilómetros",  fuente: "act", campo: "km",        dec: 0, suf: "" },
    { id: "d",   nom: "Desnivel",    fuente: "act", campo: "desnivel",  dec: 0, suf: "\u00a0m" },
    { id: "c",   nom: "Carga",       fuente: "act", campo: "carga",     dec: 0, suf: "" },
    /* `aparte` es la segunda línea de la tarjeta del año: el mismo número
       dicho en la unidad en la que uno piensa. Un millón de pasos no significa
       nada; 3.689 km, sí. */
    { id: "p",   nom: "Pasos",       fuente: "dia", dec: 0, suf: "",
      aparte: function (n) { return numKm(n * ZANCADA_M / 1000) + " km"; } },
    /* Los kilos movidos en la sala. No salen de la actividad sino de
       `fuerza.json`, que guarda los ejercicios de cada sesión: es la tercera
       procedencia, después de las actividades y los días. Es la serie que más
       ha crecido de todas —de 61.386 kg en 2022 a más de un millón y medio en
       2025— y no aparecía en ninguna pantalla. */
    { id: "kg",  nom: "Kilos",       fuente: "fuerza", dec: 0, suf: "\u00a0kg" },
    /* LAS CALORÍAS DEL EJERCICIO, no las del día: lo que costó moverse, que es
       la mitad que se puede comparar con lo que se come.

       `campo2` es la estimación, y existe porque de 2013 a 2018 el GPSMAP sólo
       medía posición: sin ella esos seis años saldrían vacíos. Se suman las dos
       para que el año exista, pero NO se disimula — la tarjeta dice cuánto de
       ese año es estimado, y en esos seis lo es todo. */
    { id: "kcal", nom: "Calorías",    fuente: "act", campo: "kcal", campo2: "kcalEst",
      dec: 0, suf: "",
      aparte: function (n, d) {
        if (!d || !d.est) return "";
        var pct = d.est / n;
        if (pct >= 0.5) return "estimadas";
        if (pct >= 0.02) return Math.round(pct * 100) + " % estimado";
        return "";
      } },

    /* ---- LAS QUE NO SE SUMAN ----

       Un año no tiene «potencia total»: tiene la potencia típica de ese año y
       la mejor que se alcanzó. Así que aquí la barra del mes DEJA DE SER UN
       TROZO de la del año, y eso se dice en pantalla en vez de dibujar una
       mentira bonita.

       Dos consecuencias más, que no son obvias:

       · La barra tampoco se puede partir por familias: una mediana no se
         apila. Se pinta de un color y la leyenda pasa a ser un filtro de
         verdad —qué entra en el cálculo—, no un reparto.

       · La barra NO empieza en cero. La velocidad a pie va de 4,2 a 5,0 km/h
         en seis años: desde cero, los seis serían idénticos y la medida no
         diría nada. Se dice debajo, que una escala recortada sin avisar es la
         forma más vieja de mentir con un gráfico.

       `minMin` es el suelo de duración: una sesión de diez minutos no mide
       desempeño, mide que ese día no había tiempo. */
    { id: "vel",  nom: "Velocidad",   fuente: "act", campo: "vel", acumula: false,
      dec: 1, suf: "\u00a0km/h", minMin: { pie: 15, monte: 15, bici: 30, rodillo: 30, sala: 0 } },
    { id: "pot",  nom: "Potencia",    fuente: "act", campo: "pot", acumula: false,
      dec: 0, suf: "\u00a0W", minMin: { bici: 20, rodillo: 20, pie: 0, monte: 0, sala: 0 } },
    { id: "ftp",  nom: "FTP",         fuente: "act", campo: "ftp", acumula: false,
      dec: 0, suf: "\u00a0W", minMin: null },
    /* LA CURVA. No es un número sino cuatro, así que la medida trae su propio
       selector de ventana: el mejor esfuerzo de 5 s, 1 min, 5 min o 20 min.
       Cada ventana contesta otra cosa —el sprint, el ataque, la subida, el
       umbral— y mezclarlas en una sola barra no diría nada. */
    { id: "cp",   nom: "Curva",       fuente: "curva", acumula: false,
      dec: 0, suf: "\u00a0W" }
  ];

  var VENTANAS = [
    { id: "5",    n: "5 s",    q: "el sprint" },
    { id: "60",   n: "1 min",  q: "el ataque" },
    { id: "300",  n: "5 min",  q: "la subida" },
    { id: "1200", n: "20 min", q: "el umbral" }
  ];

  /* Los catorce músculos son demasiados para una barra de 88 px: se agrupan en
     los cuatro bloques de siempre. El reparto por ejercicio ya existe para los
     muñecos de la ficha (28 reglas), así que aquí no se inventa nada: se
     reutiliza y se suma. */
  var BLOQUE_MUSC = {
    pecho: "empuje", hombro: "empuje", triceps: "empuje",
    dorsal: "tiron", trapecio: "tiron", biceps: "tiron", antebrazo: "tiron",
    cuadriceps: "pierna", isquios: "pierna", gluteo: "pierna", gemelo: "pierna",
    abdomen: "centro", oblicuo: "centro", lumbar: "centro"
  };
  var GRUPO_FUERZA = ["empuje", "tiron", "pierna", "centro", "sinident"];

  /* SU zancada, no la de un manual: mediana de 1.143 salidas suyas que la
     traen guardada, y sale igual a pie (0,79) que en monte (0,79). Con ella
     los pasos se leen en kilómetros, que es como piensa uno las distancias.
     NO se usa `km_dia` de Garmin para esto: desde 2022 mete la bici dentro y
     la zancada implícita saldría de 6 metros. */
  var ZANCADA_M = 0.79;

  /* los km de un año se dicen redondos; los de un día, con un decimal, que
     si no un paseo de 3,7 km saldría como «4» */
  function numKm(v) {
    return v >= 100 ? num(v, 0) : num(v, 1);
  }

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
    pie: "A pie", sala: "Sala",
    /* los pasos no se reparten en familias —un martes no tiene familia—, se
       reparten en dos: lo que quedó registrado como salida y el resto del día */
    ensal: "En salidas", resto: "El resto del día",
    empuje: "Empuje", tiron: "Tirón", pierna: "Pierna", centro: "Centro",
    sinident: "Sin identificar"
  };
  var GRUPO_PASOS = ["ensal", "resto"];
  var COLOR_G = { ensal: "#2f5c8a", resto: "#c7d6e5",
    empuje: "#c98a1b", tiron: "#2a78d6", pierna: "#1baf7a", centro: "#b5446e",
    sinident: "#c3ccd6" };
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
    /* La misma bici que `bici`, pero SUBIDA AL RODILLO: la rueda de atrás
       sobre su pie de apoyo y la de delante sobre un alza. Antes era un
       trapecio abstracto que no se entendía, y encima no se veía nunca porque
       la app le pintaba encima el icono de la bici de calle: una sesión de
       Watopia salía con la misma estampa que una salida a la sierra. */
    rod:  'M28 62 m-13 0 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 ' +
          'M74 62 m-13 0 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 ' +
          'M28 62 L44 34 L60 34 L74 62 M44 34 L54 62 ' +
          'M14 86 L88 86 M28 75 L20 86 M28 75 L36 86 M74 75 L74 86',
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

  /* La celda («+80_-008») es la ESQUINA de un cuadro de medio grado, no un
     punto. Se leía como si fuera la posición, y medio grado de desfase en un
     borde provincial te cambia de provincia: 293 de las 732 rutas salían mal
     —95 en Toledo siendo Madrid, 33 en Huesca siendo Francia—. Devolviendo el
     CENTRO del cuadro bajan a 118; el resto lo arregla usar la caja. */
  function celdaACoord(c) {
    var m = /^([+-]?\d+)_([+-]?\d+)$/.exec(String(c || ""));
    if (!m) return null;
    return [parseInt(m[1], 10) / 2 + 0.25, parseInt(m[2], 10) / 2 + 0.25];
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
        ftp: a.ftp_est != null ? a.ftp_est : null,
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
    /* «Jalón a la cara» es un face pull, no un jalón de espalda: tira con los
       codos altos hacia la cara y se lo llevan hombro y trapecio. Va antes que
       el jalón de verdad, que si no lo captura por la palabra «jalón». */
    [["jalón a la cara","jalon a la cara","jalones a la cara",
      "jalón facial","jalon facial"],   {hombro:.5, trapecio:.5}],
    [["dominadas","jalón","jalon"],     {dorsal:.55, biceps:.25, trapecio:.2}],
    /* El remo vertical NO es un remo de espalda: es un tirón al mentón, y se lo
       llevan trapecio y hombro. Va antes que «remo» o lo captura el de abajo. */
    [["remo vertical","remo al mentón","remo al menton"], {trapecio:.5, hombro:.5}],
    [["remo"],                      {dorsal:.5, trapecio:.25, biceps:.25}],
    [["pullover"],                  {dorsal:.6, pecho:.4}],
    /* Garmin escribe «Apertura» en singular y «Aperturas» en plural para el
       mismo gesto, así que la clave va en singular: como se busca por trozo de
       texto, el singular caza los dos. Y las INVERSAS van antes que las de
       pecho, porque «apertura inversa» contiene «apertura». */
    [["apertura inversa","apertura trasera","apertura invertida","aperturas invertidas",
      "tirones frontales","tirón facial","tiron facial","face pull"],
                                    {hombro:.5, trapecio:.5}],
    [["apertura","cruce de poleas","estiramiento pectoral"], {pecho:.85, hombro:.15}],
    /* Al inclinarte, parte del trabajo del pecho se va al hombro. Estaba metido
       en el saco del press plano, que le daba el reparto del banco horizontal. */
    [["press inclinado","press de banca inclinada","press en banca inclinada"],
                                    {pecho:.45, hombro:.35, triceps:.2}],
    /* Tumbado en el suelo el codo topa antes, el recorrido se corta y entra más
       tríceps. Antes no existía y salía sin músculos. */
    [["press en suelo","press en el suelo"], {pecho:.5, triceps:.35, hombro:.15}],
    [["press de banca","press declinado","press de pecho",
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
      "movilidad de cadera"],       {gluteo:1}],
    /* No estaba, y entra en el catálogo de movimientos de casa: apoyando la
       espalda en el sofá es el mejor ejercicio de glúteo que se puede hacer
       sin material. Varias grafías porque no sé con cuál lo llamará Garmin. */
    [["empuje de cadera","puente de gluteo","puente de glúteo","hip thrust"],
                                    {gluteo:.6, isquios:.25, lumbar:.15}]
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
    /* Cuáles de las sesiones de rodillo fueron Zwift, en forma de bolsa
       { "<id>": 1 } para poder preguntar sin recorrer nada. Llega desde
       `datos/nombres.json`; si no llega, se adivina por el nombre. */
    var zwift = null;
    (function () {
      var l = o.zwift, i;
      if (!l || !l.length) return;
      zwift = {};
      for (i = 0; i < l.length; i++) zwift[String(l[i])] = 1;
    }());
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
    var curva = (o.curva && o.curva.curvas) ? o.curva.curvas : (o.curva || null);
    var botonVolver = typeof o.botonVolver === "string" ? o.botonVolver : "";
    /* EL NOMBRE SE CAMBIA AQUÍ. El reloj llama «Benasque Navegar» a lo que es
       el Forau d'Aigualluts. Si la app le pasa esta función, la ficha enseña un
       lápiz y el nombre que se escriba se guarda donde manda sobre el del
       reloj —y de ahí sale para App Mapas, el Excel y Mis Rutas—. */
    var alRenombrar = typeof o.alRenombrar === "function" ? o.alRenombrar : null;
    /* BORRAR. Dos cosas distintas y por eso dos botones:
         «Borrar la actividad» — se va del registro entero, y arrastra el GPX,
           la fila del Excel y el trazo del mapa. No vuelve a entrar aunque
           intervals la siga teniendo.
         «Quitar el recorrido» — se va sólo el track: el GPX, el catálogo y el
           mapa. La actividad SIGUE aquí con sus kilómetros y su pulso. Para
           cuando el track salió mal pero el entrenamiento cuenta.
       La ficha enseña ANTES de confirmar qué ruta concreta se va a quitar: el
       emparejamiento por fecha solo ya nos engañó una vez. */
    var alBorrar = typeof o.alBorrar === "function" ? o.alBorrar : null;

    /* índice de rutas por fecha, para clasificar y para el mapa de las nuevas */
    var rutaPorFecha = {}, fechasSen = {}, rutaPorId = {};
    rutas.forEach(function (r) {
      if (r.id) rutaPorId[r.id] = r;
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
        /* SI HAY RUTA ARCHIVADA, MANDA LA RUTA. El 8-ago-2026 el reloj se
           quedó con «Rowing» puesto de la actividad anterior, intervals lo
           guardó así y el paseo a la Poza de Sócrates salía entre las «Otras»
           en vez de con las de senderismo. El catálogo sabe lo que es: lo
           curó Carlos al archivar la ruta. */
        if (x.dep === "otr" && (r.a === "sen" || r.a === "bici")) x.dep = r.a;
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
        /* LA REGLA DE LA SALA. Los kilómetros y el desnivel de dentro SE QUEDAN:
           subir un 8 % en Zwift significa que el rodillo aprieta de verdad y que
           los vatios son de verdad, y borrarlos dejaría el chip de kilómetros
           con el 9 % de lo que pedalea. Lo que no significa nada es la ALTURA
           ABSOLUTA: Watopia numera sus alturas a su gusto y hay sesiones de 7 a
           1.047 m con bajada cero. Ahí no se pierde información al quitarla,
           porque no la había. */
        if (esDeDentro(x.dep)) { x.altMin = null; x.altMax = null; }
        /* Un resumen de altura puede venir corrupto: una salida por Madrid
           traía alt_min = -500 con el perfil sano entre 649 y 686. Se toca
           SÓLO cuando el resumen se contradice a sí mismo —su rango de altura
           es mayor que todo lo que subió y bajó junto—, que es una imposibilidad
           física y no una discrepancia cualquiera.
           No vale disparar con «el perfil dice otra cosa»: el perfil va
           simplificado a 90 puntos y en montaña se queda corto, y con ese
           criterio se estropeaban cuatro caminatas buenas. */
        if (x.altMin != null && x.altMax != null) {
          var sube = Math.abs(x.desnivel || 0) + Math.abs(x.desnivelNeg || 0);
          if ((x.altMax - x.altMin) > sube + 50) {
            var alts = x.perfil ? decodificarPerfil(x.perfil) : [];
            if (alts.length) {
              x.altMin = Math.min.apply(null, alts);
              x.altMax = Math.max.apply(null, alts);
            } else { x.altMin = null; x.altMax = null; }
            /* la pendiente máxima salía de la misma muestra mala */
            x.pendMax = null;
          }
        }
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
      /* EL FILTRO. `null` es «todas encendidas», y arranca así SIEMPRE: si
         recordara la selección, un día abrirías la app y no entenderías por
         qué te faltan años. No se guarda en ningún sitio a propósito. */
      fam: null,
      /* en las medidas que no se suman: «lo típico» (la mediana del tramo) o
         «lo mejor» (el techo). Son dos preguntas distintas y la pantalla tiene
         que decir cuál se está contestando. */
      modo: "tipico",
      vent: "300",         // la ventana de la curva: 5 min, que es la de la subida
      dia: null,           // el día desplegado en la lista de Pasos
      pidiendoDias: false,
      el: null
    };
    var cacheGeo = {};     // celda → geometría ya traída

    /* clave de ficha → la actividad que se pintó con ella.
       POR QUÉ EXISTE ESTO: cada lista inventa su propia clave —«202401-3» en
       sesiones, «2024-m3» en las medidas de máximo, «2024-c3» en la curva,
       «202401-f3» en fuerza, «d2024-01-06-0» en las de días— y había un único
       lector que solo entendía la primera. Con FTP elegido, el mapa se quedaba
       en «Trayendo el trazo…» para siempre porque la actividad no se encontraba
       y se salía sin pintar nada. Se llena al construir la lista, así que
       funciona con cualquier formato de clave, presente o futuro. */
    var fichasPintadas = {};

    /* ---------- los días, para las medidas que no salen de las actividades ----------

       Dos fuentes y una regla: manda la ventana reciente donde exista, el
       histórico para lo de atrás. El histórico se pide con pereza —son cientos
       de KB— y sólo cuando alguien pulsa una medida que lo necesita. */
    var dias = {};              // fecha -> pasos del día
    var diasPorMes = {};        // "2025" -> { "03": [fechas] }
    var pasosSal = {};          // fecha -> pasos dados dentro de una salida
    var hayDias = false;

    function meteDias(d, manda) {
      if (!d) return;
      for (var f in d) {
        if (!d.hasOwnProperty(f)) continue;
        var v = d[f] && d[f].pasos;
        if (typeof v !== "number" || !v) continue;
        if (!manda && dias[f] != null) continue;
        dias[f] = v;
      }
    }

    function indexaDias() {
      diasPorMes = {};
      for (var f in dias) {
        if (!dias.hasOwnProperty(f)) continue;
        var y = f.slice(0, 4), mm = f.slice(5, 7);
        (diasPorMes[y] = diasPorMes[y] || {});
        (diasPorMes[y][mm] = diasPorMes[y][mm] || []).push(f);
      }
      for (var yy in diasPorMes) {
        for (var k in diasPorMes[yy]) diasPorMes[yy][k].sort();
      }
      hayDias = false;
      for (var z in dias) { hayDias = true; break; }
    }

    /* Los pasos que SÍ quedaron dentro de una salida registrada. Sólo cuentan
       las de a pie y de monte: los del rodillo no son pasos. */
    (function () {
      todas.forEach(function (x) {
        var g = FAMILIA[x.dep] || "sala";
        if (g !== "pie" && g !== "monte") return;
        if (!x.pasos) return;
        pasosSal[x.fecha] = (pasosSal[x.fecha] || 0) + x.pasos;
      });
    }());

    meteDias(o.diasHist, false);
    meteDias(o.dias, true);
    indexaDias();

    /* Un año puede tener días registrados y ninguna actividad —diciembre de
       2019 es el caso—, y sin esto se caería de la tira y sus pasos no se
       verían en ninguna parte. La tira sale de las dos cosas. */
    function sumaAniosDeDias() {
      var cambia = false, y;
      for (y in diasPorMes) {
        if (anios.indexOf(y) < 0) { anios.push(y); cambia = true; }
      }
      if (cambia) anios.sort();
      if (!estado.anio && anios.length) estado.anio = anios[anios.length - 1];
    }
    sumaAniosDeDias();

    /* ¿esta medida se puede ofrecer con lo que hay cargado? */
    function medidaPosible(m) {
      if (m.fuente === "curva") return !!curva;
      if (m.fuente === "fuerza") return !!fuerza;
      if (m.fuente !== "dia") return true;
      return hayDias || !!o.traerDias;
    }

    function pedirDias() {
      if (estado.pidiendoDias || !o.traerDias || o.diasHist) return;
      estado.pidiendoDias = true;
      o.traerDias(function (d) {
        estado.pidiendoDias = false;
        if (d) { o.diasHist = d; meteDias(d, false); indexaDias(); sumaAniosDeDias(); }
        else { o.diasHist = {}; }
        pintar();
      });
    }

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

    /* ---------- el filtro ----------

       Un clic sobre una familia apagada la ENCIENDE SOLA: es lo que se quiere
       el 90 % de las veces («enséñame solo el monte»). A partir de ahí se
       suman y se quitan. Quitar la última vuelve a encenderlas todas, que es
       la única salida que no deja la pantalla en blanco. */
    function gruposDe(m) {
      if (m.fuente === "dia") return GRUPO_PASOS;
      if (m.fuente === "fuerza") return GRUPO_FUERZA;
      return ORDEN_FAM;
    }

    function activo(g) { return !estado.fam || !!estado.fam[g]; }

    function alternarFam(g) {
      if (!estado.fam) { estado.fam = {}; estado.fam[g] = 1; return; }
      if (estado.fam[g]) {
        delete estado.fam[g];
        var quedan = 0, k;
        for (k in estado.fam) if (estado.fam[k]) quedan++;
        if (!quedan) estado.fam = null;
        return;
      }
      estado.fam[g] = 1;
    }

    function colorG(g) {
      return COLOR_G[g] ? "var(--akhb-fam-" + g + ", " + COLOR_G[g] + ")"
                        : "var(--akhb-fam-" + g + ")";
    }

    /* ---------- de dónde sale el número ----------

       `reparto(y, mm, m)`: lo que hubo en ese año (o en ese mes, si `mm` viene)
       repartido por grupos, con el filtro ya aplicado. Es lo único que la tira
       de años y las casillas de los meses necesitan saber, y por eso las dos
       llaman aquí en vez de sumar cada una por su cuenta. */
    function reparto(y, mm, m) {
      if (m.fuente === "dia") return repartoDias(y, mm);
      if (m.fuente === "fuerza") return repartoFuerza(y, mm);
      if (m.fuente === "curva") return repartoCurva(y, mm);
      if (m.acumula === false) return repartoMejor(y, mm, m);
      return repartoActs(y, mm, m);
    }

    /* ¿esta salida vale para medir desempeño? */
    function cuentaPara(m, x) {
      if (!m.minMin) return true;
      var g = FAMILIA[x.dep] || "sala";
      var tope = m.minMin[g];
      if (tope == null) return true;
      return (x.min || 0) >= tope;
    }

    function mediana(v) {
      if (!v.length) return null;
      var a = v.slice().sort(function (p, q) { return p - q; });
      var i = Math.floor(a.length / 2);
      return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2;
    }

    /* Ni suma ni reparto: la mediana o el techo del tramo. `r` se queda vacío a
       propósito —no hay nada que apilar— y `n` lleva el número que se enseña. */
    function repartoMejor(y, mm, m) {
      var meses = porAnio[y] || {}, v = [];
      (mm ? [mm] : Object.keys(meses)).forEach(function (k) {
        (meses[k] || []).forEach(function (x) {
          if (!activo(FAMILIA[x.dep] || "sala")) return;
          if (!cuentaPara(m, x)) return;
          var val = x[m.campo];
          if (val == null) return;
          v.push(val);
        });
      });
      if (!v.length) return { r: {}, n: 0, cuantas: 0 };
      var n = (estado.modo === "mejor") ? Math.max.apply(null, v) : mediana(v);
      return { r: {}, n: n, cuantas: v.length, valores: v };
    }

    /* Lo mismo que `repartoMejor` pero leyendo la curva, que vive en su propio
       fichero y no dentro de la actividad. */
    function repartoCurva(y, mm) {
      var meses = porAnio[y] || {}, v = [];
      if (!curva) return { r: {}, n: 0, cuantas: 0 };
      (mm ? [mm] : Object.keys(meses)).forEach(function (k) {
        (meses[k] || []).forEach(function (x) {
          if (!activo(FAMILIA[x.dep] || "sala")) return;
          var c = x.id ? curva[x.id] : null;
          if (!c) return;
          var val = c[estado.vent];
          if (val == null) return;
          v.push(val);
        });
      });
      if (!v.length) return { r: {}, n: 0, cuantas: 0 };
      var n = (estado.modo === "mejor") ? Math.max.apply(null, v) : mediana(v);
      return { r: {}, n: n, cuantas: v.length, valores: v };
    }

    function conCurva(y, mm) {
      var meses = porAnio[y] || {}, out = [];
      if (!curva) return out;
      (mm ? [mm] : Object.keys(meses).sort()).forEach(function (k) {
        (meses[k] || []).forEach(function (x) {
          if (!activo(FAMILIA[x.dep] || "sala")) return;
          var c = x.id ? curva[x.id] : null;
          if (!c || c[estado.vent] == null) return;
          out.push(x);
        });
      });
      out.sort(function (a, b) {
        return curva[b.id][estado.vent] - curva[a.id][estado.vent];
      });
      return out;
    }

    /* Las salidas que entran en una medida de desempeño, de mejor a peor: la
       lista de abajo contesta «¿cuáles fueron?», que es lo que uno mira
       después de ver el techo del año. */
    function mejoresDe(y, mm, m) {
      var meses = porAnio[y] || {}, out = [];
      (mm ? [mm] : Object.keys(meses).sort()).forEach(function (k) {
        (meses[k] || []).forEach(function (x) {
          if (!activo(FAMILIA[x.dep] || "sala")) return;
          if (!cuentaPara(m, x)) return;
          if (x[m.campo] == null) return;
          out.push(x);
        });
      });
      out.sort(function (a, b) { return b[m.campo] - a[m.campo]; });
      return out;
    }

    /* Los kilos de un tramo, repartidos por bloque muscular. Cada ejercicio
       reparte sus kilos entre sus músculos con las mismas proporciones que
       pintan los muñecos: un press de banca son 60 % de pecho, 25 % de tríceps
       y 15 % de hombro, así que sus kilos se reparten igual. Lo que no encaja
       en ninguna regla —«Calentamiento», «sin identificar»— va a su propio
       montón y NO se reparte a ojo. */
    function repartoFuerza(y, mm) {
      var r = {}, n = 0;
      if (!fuerza) return { r: r, n: n };
      actsDeTodas(y, mm).forEach(function (x) {
        var ej = x.id ? fuerza[x.id] : null;
        if (!ej || !ej.length) return;
        ej.forEach(function (e) {
          var kg = e && e.kg_total;
          if (!kg) return;
          var z = zonasDe(e.que), puesto = 0, g;
          if (z) {
            for (var k in z) {
              if (!z.hasOwnProperty(k)) continue;
              g = BLOQUE_MUSC[k] || "sinident";
              if (!activo(g)) { puesto += kg * z[k]; continue; }
              r[g] = (r[g] || 0) + kg * z[k];
              n += kg * z[k];
              puesto += kg * z[k];
            }
            /* si una regla no sumara 1, el resto no se pierde */
            if (kg - puesto > 0.5 && activo("sinident")) {
              r.sinident = (r.sinident || 0) + (kg - puesto); n += kg - puesto;
            }
          } else if (activo("sinident")) {
            r.sinident = (r.sinident || 0) + kg; n += kg;
          }
        });
      });
      return { r: r, n: n };
    }

    /* Como `actsDe` pero sin filtrar por familia: en los kilos el filtro va por
       músculo, no por deporte, y aquí sólo hacen falta las sesiones de sala. */
    function actsDeTodas(y, mm) {
      var meses = porAnio[y] || {}, out = [];
      (mm ? [mm] : Object.keys(meses).sort()).forEach(function (k) {
        (meses[k] || []).forEach(function (x) { out.push(x); });
      });
      return out;
    }

    /* Las sesiones de sala con kilos, para la lista de abajo. */
    function sesionesConKilos(y, mm) {
      if (!fuerza) return [];
      return actsDeTodas(y, mm).filter(function (x) {
        var ej = x.id ? fuerza[x.id] : null;
        if (!ej || !ej.length) return false;
        for (var i = 0; i < ej.length; i++) if (ej[i] && ej[i].kg_total) return true;
        return false;
      });
    }

    function repartoActs(y, mm, m) {
      var meses = porAnio[y] || {}, r = {}, n = 0, est = 0;
      var claves = mm ? [mm] : Object.keys(meses);
      claves.forEach(function (k) {
        (meses[k] || []).forEach(function (x) {
          var g = FAMILIA[x.dep] || "sala";
          if (!activo(g)) return;
          var v = m.campo ? x[m.campo] : 1, estimado = false;
          /* el campo de reserva: sólo entra donde el bueno no existe, nunca
             encima de una medida de verdad */
          if (v == null && m.campo2) { v = x[m.campo2]; estimado = true; }
          if (v == null) return;                    // lo que no se sabe no suma
          if (m.div) v = v / m.div;
          r[g] = (r[g] || 0) + v; n += v;
          if (estimado) est += v;
        });
      });
      return { r: r, n: n, est: est };
    }

    function repartoDias(y, mm) {
      var porMes = diasPorMes[y] || {}, r = {}, n = 0;
      var claves = mm ? [mm] : Object.keys(porMes);
      claves.forEach(function (k) {
        (porMes[k] || []).forEach(function (f) {
          var tot = dias[f] || 0;
          if (!tot) return;
          /* el tope: si el reloj apuntó más pasos en la salida que en el día
             entero —pasa en los días partidos—, manda el día */
          var en = Math.min(pasosSal[f] || 0, tot);
          if (activo("ensal")) { r.ensal = (r.ensal || 0) + en; n += en; }
          if (activo("resto")) { r.resto = (r.resto || 0) + (tot - en); n += tot - en; }
        });
      });
      return { r: r, n: n };
    }

    /* Las actividades de un tramo que pasan el filtro. Es lo que decide si una
       casilla de mes se puede pulsar y lo que se pinta abajo. */
    function actsDe(y, mm) {
      var meses = porAnio[y] || {}, out = [];
      (mm ? [mm] : Object.keys(meses).sort()).forEach(function (k) {
        (meses[k] || []).forEach(function (x) {
          if (activo(FAMILIA[x.dep] || "sala")) out.push(x);
        });
      });
      return out;
    }

    function kmDePasos(p) { return (p || 0) * ZANCADA_M / 1000; }

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
      if (m.fuente === "curva") {
        var vv = null, iv;
        for (iv = 0; iv < VENTANAS.length; iv++) if (VENTANAS[iv].id === estado.vent) vv = VENTANAS[iv];
        return "El mejor esfuerzo que aguantaste " + (vv ? vv.n : "") + " seguidos — " +
               (vv ? vv.q : "") + ". Sale del fichero original de cada salida y " +
               "las ventanas con pausas no cuentan, así que dos sprints con un " +
               "semáforo en medio no se suman. Sube semanas antes que el FTP y no " +
               "depende de cuánto tiempo hubo esa semana: por eso es la que dice si " +
               "estás recuperando. El año es " +
               (estado.modo === "mejor" ? "el mejor" : "la mediana") +
               " de sus salidas, no un total.";
      }
      if (m.acumula === false) {
        var q = (estado.modo === "mejor") ? "el mejor valor" : "la mediana";
        return "Ésta no se suma: el año es " + q + " de sus salidas, no el total, " +
               "así que la barra de un mes NO es un trozo de la del año. " +
               "Y la barra no empieza en cero —con un rango estrecho, desde cero " +
               "todos los años saldrían iguales—: compara unos con otros, no con la nada. " +
               (m.minMin ? "Sólo cuentan las salidas largas: por debajo de un cuarto de hora " +
                           "no se mide desempeño, se mide que no había tiempo." : "");
      }
      if (m.id === "kcal") {
        return "Lo que costó moverse, no lo que gastaste en el día. De 2013 a 2018 " +
               "el GPSMAP sólo medía posición, así que esos años son una estimación " +
               "calibrada con 2.094 salidas tuyas medidas —caminar acierta al 8 %, " +
               "senderismo y rodillo son un orden de magnitud—. Se suman para que el " +
               "año exista, y la tarjeta dice cuánto de cada uno es estimado.";
      }
      if (m.id === "kg") {
        return "Los kilos salen de los ejercicios de cada sesión, y ésos llegan " +
               "con la exportación de Garmin, no solos: la serie acaba donde acabó " +
               "la última. El reparto por músculo es el mismo que pintan los muñecos " +
               "de la ficha — un press de banca son 60 % de pecho, 25 % de tríceps y " +
               "15 % de hombro—, y lo que no encaja en ninguna regla no se reparte a ojo.";
      }
      if (m.id === "p") {
        return "Los pasos empiezan en diciembre de 2019: antes no había reloj que " +
               "los contara, así que los años anteriores salen vacíos y está bien que " +
               "así sea. La parte clara es lo que andas fuera de una salida registrada, " +
               "que desde 2022 es cerca del 70 % del total.";
      }
      return "";
    }

    /* ---------- EL RESUMEN, SOBRE LAS BARRAS ----------
       Cuatro cifras de toda la serie, y SIGUE AL FILTRO DE FAMILIAS. Ésa es la
       decisión que lo hace honesto: «hay un récord en casa y otro en la calle».
       Pulsas Bici de calle y el récord son los 212 km de Arganda–Aranjuez;
       pulsas Rodillo y es el de Zwift. No compiten entre sí, porque no son lo
       mismo: 87 de cada 100 kilómetros suyos son de rodillo, y sin partir, el
       chip de kilómetros sólo habla de Watopia.

       Cuando están todas encendidas —que es como arranca siempre— el total vale,
       pero el récord volvería a ser el de dentro. Por eso el récord DICE DE
       QUIÉN ES: así ni el arranque engaña. */
    /* El estilo del bloque viaja DENTRO del módulo y no en la hoja de la app:
       es lo único que estrena esta versión, y así se publica un fichero en vez
       de dos y no hay manera de que una hoja desfasada lo deje sin pintar. */
    function estiloResumen() {
      if (document.getElementById("akhb-css-resumen")) return;
      var e = document.createElement("style");
      e.id = "akhb-css-resumen";
      e.textContent = [
        /* Tarjetas blancas con sombra, como las de Economía Doméstica: la
           cifra manda y el rótulo se lee. Nada de bordes finos y cifras
           pequeñas, que era lo que no se veía. */
        ".akhb-resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));" +
          "gap:14px;margin:0 0 16px}",
        ".akhb-res-c{display:flex;flex-direction:column;gap:5px;padding:16px 18px;text-align:left;" +
          "border:0;border-radius:16px;background:var(--fondo-tarjeta,#fff);font:inherit;" +
          "color:inherit;box-shadow:0 1px 3px rgba(18,38,63,.08),0 6px 18px rgba(18,38,63,.06)}",
        ".akhb-res-c.pulsa{cursor:pointer;transition:transform .12s,box-shadow .12s}",
        ".akhb-res-c.pulsa:hover{transform:translateY(-2px);" +
          "box-shadow:0 2px 6px rgba(18,38,63,.10),0 12px 26px rgba(18,38,63,.10)}",
        ".akhb-res-c.pulsa:active{transform:translateY(1px)}",
        ".akhb-res-r{font-size:12px;font-weight:700;text-transform:uppercase;" +
          "letter-spacing:.06em;color:var(--gris,#5b6b7c)}",
        ".akhb-res-v{font-size:2.3rem;font-weight:800;line-height:1.05;letter-spacing:-.02em;" +
          "color:var(--azul-hondo,#16324f)}",
        ".akhb-res-u{font-size:.42em;font-weight:700;letter-spacing:0;opacity:.7;" +
          "margin-left:1px}",
        ".akhb-res-p{font-size:12.5px;color:var(--gris,#6b7c8d);line-height:1.35;" +
          "overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}",
        ".akhb-res-pt{display:inline-block;width:8px;height:8px;border-radius:50%;" +
          "margin-right:6px;vertical-align:baseline}",
        /* La destacada: rellena de color, como la verde de Economía Doméstica.
           El relleno se oscurece un 18 % sobre el color de la familia para que
           el blanco encima tenga contraste sea cual sea el tono de partida. */
        ".akhb-res-c.fuerte .akhb-res-r,.akhb-res-c.fuerte .akhb-res-v," +
          ".akhb-res-c.fuerte .akhb-res-p{color:#fff}",
        ".akhb-res-c.fuerte .akhb-res-r{opacity:.9}",
        ".akhb-res-c.fuerte .akhb-res-p{opacity:.85}",
        ".akhb-res-c.fuerte .akhb-res-pt{background:#fff!important;opacity:.9}",
        "@media (prefers-color-scheme:dark){" +
          ".akhb-res-c{background:#1d2732;box-shadow:0 1px 3px rgba(0,0,0,.4)}" +
          ".akhb-res-v{color:#e8eef5}.akhb-res-r,.akhb-res-p{color:#9fb0c1}}"
      ].join("\n");
      document.head.appendChild(e);
    }

    function htmlResumen() {
      estiloResumen();
      var m = metricaActual();
      if (m.fuente === "curva") return "";        // la curva ya tiene su bloque

      var porY = {}, tot = 0, conDato = [];
      anios.forEach(function (y) {
        var d = reparto(y, null, m);
        porY[y] = d.n || 0;
        if (porY[y] > 0) { tot += porY[y]; conDato.push(y); }
      });
      if (!conDato.length) return "";

      var mejorA = conDato[0], peorA = conDato[0];
      conDato.forEach(function (y) {
        if (porY[y] > porY[mejorA]) mejorA = y;
        if (porY[y] < porY[peorA]) peorA = y;
      });

      /* El récord: la salida concreta con el número más alto, entre las que
         pasan el filtro Y el suelo de duración de esa medida. */
      var rec = null, cuentan = 0;
      if (m.fuente === "act" && m.campo) {
        anios.forEach(function (y) {
          actsDe(y).forEach(function (x) {
            if (!cuentaPara(m, x)) return;
            var v = x[m.campo];
            if (v == null && m.campo2) v = x[m.campo2];
            if (v == null) return;
            cuentan++;
            if (m.div) v = v / m.div;
            if (!rec || v > rec.v) rec = { v: v, x: x };
          });
        });
      }

      /* El color va en una MARCA —la barra de la izquierda y el punto del pie—,
         nunca en la cifra: el número se lee mejor en tinta y el color se
         reserva para decir de quién es. Y dice algo:

         · con UNA familia encendida, las cuatro casillas visten su color, así
           que de un vistazo sabes qué estás mirando;
         · con varias, las casillas van neutras y sólo el récord lleva color:
           el de la familia a la que pertenece. */
      var solaFam = (function () {
        if (!estado.fam) return null;
        var v = Object.keys(estado.fam).filter(function (g) { return estado.fam[g]; });
        return v.length === 1 ? v[0] : null;
      }());

      function casilla(rot, val, pie, anio, fam, fuerte) {
        var g = fam || solaFam;
        var col = g ? colorG(g) : null;
        /* Sólo UNA tarjeta va rellena —la del récord, que es la que dice algo
           con su color— y las demás quedan blancas. Es el reparto de los
           paneles de Economía Doméstica: tres sobrias y una que canta. */
        var est = fuerte && col
          ? "background:color-mix(in srgb, " + col + " 82%, #16324f)"
          : (col ? "background:color-mix(in srgb, " + col + " 9%, var(--fondo-tarjeta,#fff))" : "");
        return '<' + (anio ? 'button type="button" data-anio="' + anio + '"' : "div") +
          ' class="akhb-res-c' + (anio ? " pulsa" : "") + (fuerte && col ? " fuerte" : "") +
          '"' + (est ? ' style="' + est + '"' : "") + ">" +
          '<span class="akhb-res-r">' + esc(rot) + "</span>" +
          '<b class="akhb-res-v">' + val + "</b>" +
          (pie ? '<span class="akhb-res-p">' +
                 (fam ? '<i class="akhb-res-pt" style="background:' + col + '"></i>' : "") +
                 esc(pie) + "</span>" : "") +
          "</" + (anio ? "button" : "div") + ">";
      }

      var h = '<div class="akhb-resumen">';
      if (m.acumula === false) {
        h += casilla("Lo normal", numMet(medianaAnios(conDato, porY), m), "la mediana");
        h += casilla("De cuánto a cuánto",
                     numMet(porY[peorA], m) + " – " + numMet(porY[mejorA], m),
                     "del peor año al mejor");
      } else {
        h += casilla("Total", numMet(tot, m), "");
        h += casilla("Media al año", numMet(tot / conDato.length, m),
                     conDato.length + (conDato.length === 1 ? " año" : " años"));
      }

      if (rec) {
        var fam = NOMBRE_FAM[FAMILIA[rec.x.dep] || "sala"] || "";
        /* La familia PRIMERO y la fecha después: el nombre de una salida de
           Zwift ocupa dos líneas enteras y, yendo delante, se comía justo lo
           que el pie tiene que decir. Se vio en la captura de prueba. */
        h += casilla("Récord", numMet(rec.v, m),
                     (fam ? fam + " · " : "") + fechaCorta(rec.x.fecha) +
                     (rec.x.nombre ? " · " + rec.x.nombre : ""),
                     String(rec.x.fecha || "").slice(0, 4),
                     FAMILIA[rec.x.dep] || "sala", true);
      } else {
        h += casilla("Récord", "—", "no se mide por salida");
      }

      if (m.acumula === false) {
        h += casilla("Cuántas cuentan", String(cuentan), "pasan el mínimo");
      } else {
        h += casilla("Mejor año", numMet(porY[mejorA], m), String(mejorA), String(mejorA));
      }
      return h + "</div>";
    }

    /* La mediana de los años con dato, para las que no se suman. */
    function medianaAnios(conDato, porY) {
      return mediana(conDato.map(function (y) { return porY[y]; }));
    }

    /* El número con su unidad. En las tarjetas el rótulo dice «Total», no
       «Kilómetros», así que sin unidad el 210 se queda pelado y no se sabe de
       qué habla. Las que ya traen sufijo lo reusan; a las que no, se les pone
       aquí. Va en una marca aparte, más pequeña, para no restarle fuerza a la
       cifra —que es lo que se lee de lejos. */
    var UNIDAD_RES = { km: "km", kcal: "kcal", n: "sesiones", p: "pasos",
                       c: "de carga", vel: "km/h", pot: "W", ftp: "W" };
    function numMet(v, m) {
      if (v == null || !isFinite(v)) return "—";
      var u = (m.suf || "").replace(/\u00a0/g, "").trim() || UNIDAD_RES[m.id] || "";
      return num(v, m.dec || 0) +
        (u ? ' <span class="akhb-res-u">' + esc(u) + "</span>" : "");
    }

    function fechaCorta(f) {
      var t = String(f || "").slice(0, 10).split("-");
      return t.length === 3 ? t[2] + "-" + t[1] + "-" + t[0] : String(f || "");
    }

    function htmlAnios() {
      var m = metricaActual(), max = 0, cache = {};
      anios.forEach(function (y) { cache[y] = reparto(y, null, m); max = Math.max(max, cache[y].n); });
      if (!max) max = 1;
      /* En las que no se suman la barra no arranca en cero: el suelo es el peor
         año menos un margen. Con la velocidad a pie —de 4,2 a 5,0 en seis
         años— desde cero las seis barras serían la misma. */
      var suelo = 0;
      if (m.acumula === false) {
        var vals = anios.map(function (y) { return cache[y].n; })
                        .filter(function (v) { return v > 0; });
        if (vals.length > 1) {
          var lo = Math.min.apply(null, vals);
          suelo = lo - (max - lo) * 0.25;
          if (suelo < 0) suelo = 0;
        }
      }

      /* El volver y las medidas en la misma fila: ocupan una línea en vez de
         dos, y el volver queda arriba del todo, que es donde se busca. El HTML
         del botón lo pone la app (opción `botonVolver`); el módulo no sabe ni
         tiene que saber a dónde vuelve. */
      var selector = '<div class="akhb-cabrow">' +
        (botonVolver || "<span></span>") +
        '<div class="akhb-metricas" role="group" aria-label="Medida">' +
        METRICAS.filter(medidaPosible).map(function (x) {
          return '<button type="button" data-met="' + x.id + '" aria-pressed="' +
            (x.id === m.id) + '"' + (x.id === m.id ? ' class="sel"' : "") + ">" +
            x.nom + "</button>";
        }).join("") + "</div></div>" +
        /* Sólo aparece donde significa algo. Con Kilómetros no hay «lo mejor»:
           el año es la suma y punto. */
        (m.acumula === false
          ? '<div class="akhb-modo" role="group" aria-label="Qué se enseña">' +
            ["tipico", "mejor"].map(function (k) {
              return '<button type="button" data-modo="' + k + '" aria-pressed="' +
                (estado.modo === k) + '"' + (estado.modo === k ? ' class="sel"' : "") + ">" +
                (k === "tipico" ? "lo típico" : "lo mejor") + "</button>";
            }).join("") + "</div>"
          : "") +
        (m.fuente === "curva"
          ? '<div class="akhb-modo akhb-vent" role="group" aria-label="Ventana">' +
            VENTANAS.map(function (v2) {
              return '<button type="button" data-vent="' + v2.id + '" aria-pressed="' +
                (estado.vent === v2.id) + '"' + (estado.vent === v2.id ? ' class="sel"' : "") +
                ' title="' + esc(v2.q) + '">' + esc(v2.n) + "</button>";
            }).join("") + "</div>"
          : "");

      var tira = anios.map(function (y) {
        var d = cache[y], sel = y === estado.anio;
        /* la altura dice cuánto hubo ese año; los trozos, de qué. El mínimo
           es para que un año flojo se siga pudiendo pulsar y ver de qué fue. */
        var alto = d.n
          ? Math.max(7, Math.round((d.n - suelo) / ((max - suelo) || 1) * 100))
          : 0;
        if (alto > 100) alto = 100;
        /* una mediana no se apila: un solo trozo, del color de la familia si
           sólo queda una encendida, y neutro si hay varias mezcladas */
        if (m.acumula === false) {
          var solo = null, enc = 0, gi;
          for (gi = 0; gi < ORDEN_FAM.length; gi++) {
            if (activo(ORDEN_FAM[gi])) { enc++; solo = ORDEN_FAM[gi]; }
          }
          var col = (enc === 1) ? colorG(solo) : "var(--akhb-azul, #2f5c8a)";
          var trozoUno = d.n
            ? '<i style="height:' + alto + '%;background:' + col + '" title="' +
              esc(m.nom) + ": " + num(d.n, m.dec) + '"></i>'
            : "";
          return '<button type="button" role="tab" class="akhb-anio' + (sel ? " sel" : "") +
            '" aria-selected="' + sel + '" data-anio="' + y + '">' +
            '<span class="akhb-anio-n">' + y + "</span>" +
            '<span class="akhb-barra">' + trozoUno + "</span>" +
            '<span class="akhb-anio-c">' + (d.n ? num(d.n, m.dec) + m.suf : "·") +
            (d.cuantas ? "<small>" + d.cuantas + (d.cuantas === 1 ? " salida" : " salidas") +
             "</small>" : "") + "</span></button>";
        }
        var trozos = gruposDe(m).filter(function (g) { return d.r[g]; }).map(function (g) {
          return '<i style="height:' + (d.r[g] / d.n * alto).toFixed(2) +
                 '%;background:' + colorG(g) + '" title="' +
                 esc(NOMBRE_FAM[g]) + ": " + num(d.r[g], 0) + '"></i>';
        }).join("");
        return '<button type="button" role="tab" class="akhb-anio' + (sel ? " sel" : "") +
          '" aria-selected="' + sel + '" data-anio="' + y + '">' +
          '<span class="akhb-anio-n">' + y + "</span>" +
          '<span class="akhb-barra">' + trozos + "</span>" +
          '<span class="akhb-anio-c">' + (d.n ? num(d.n, m.dec) + m.suf : "·") +
          (d.n && m.aparte && m.aparte(d.n, d)
            ? "<small>(" + esc(m.aparte(d.n, d)) + ")</small>" : "") +
          "</span></button>";
      }).join("");

      /* LA LEYENDA YA NO ES UN ADORNO: es el filtro. Se listan los grupos que
         la medida sabe repartir, no los que quedan encendidos — si sólo
         saliera lo encendido, apagar algo lo haría desaparecer y no habría
         forma de volver a encenderlo. */
      var leyenda = gruposDe(m).map(function (g) {
        var si = activo(g);
        return '<button type="button" class="akhb-leg' + (si ? " si" : "") +
          '" data-fam="' + g + '" aria-pressed="' + si + '">' +
          '<i style="background:' + colorG(g) + '"></i>' +
          esc(NOMBRE_FAM[g]) + "</button>";
      }).join("");
      var filtrando = !!estado.fam;

      var aviso = huecoDe(m);
      var trayendo = (m.fuente === "dia" && estado.pidiendoDias);
      return selector +
        '<div class="akhb-anios" role="tablist" aria-label="Años">' + tira + "</div>" +
        '<div class="akhb-leyenda akhb-filtro">' + leyenda +
          (filtrando ? '<button type="button" class="akhb-leg-todas" data-fam="">' +
                       "Todas</button>" : "") + "</div>" +
        (trayendo ? '<p class="akhb-aviso">Trayendo los pasos de los años de atrás…</p>' : "") +
        (aviso ? '<p class="akhb-aviso">' + aviso + "</p>" : "");
    }

    /* Las casillas de los meses enseñan EL VALOR DE LA MEDIDA ELEGIDA, no el
       número de actividades. Antes ponían siempre actividades, así que con
       Kilómetros elegido la tira de arriba hablaba de kilómetros y las casillas
       de debajo de otra cosa, sin decirlo. */
    function htmlMeses() {
      var m = metricaActual(), celdas = [];
      for (var i = 0; i < 12; i++) {
        var k = dosD(i + 1);
        var d = reparto(estado.anio, k, m);
        var hay = (m.fuente === "dia") ? d.n > 0
                : (m.fuente === "fuerza") ? sesionesConKilos(estado.anio, k).length > 0
                : (m.fuente === "curva") ? d.n > 0
                : (m.acumula === false) ? d.n > 0
                : actsDe(estado.anio, k).length > 0;
        var sel = estado.mes === k;
        celdas.push('<button type="button" class="akhb-mes' + (sel ? " sel" : "") +
          (hay ? "" : " vacio") + '"' + (hay ? "" : " disabled") +
          ' data-mes="' + k + '" aria-pressed="' + !!sel + '">' +
          MES_CORTO[i] + "<b>" + (hay && d.n ? num(d.n, m.dec) + m.suf : "·") +
          (hay && d.n && m.aparte && m.aparte(d.n, d)
            ? "<small>" + esc(m.aparte(d.n, d)) + "</small>" : "") +
          "</b></button>");
      }
      var todo = reparto(estado.anio, null, m);
      return '<div class="akhb-meses">' +
        '<button type="button" class="akhb-mes akhb-todo' + (estado.mes ? "" : " sel") +
        '" data-mes="">Todo el año<b>' +
        (todo.n ? num(todo.n, m.dec) + m.suf : "·") +
        (todo.n && m.aparte && m.aparte(todo.n, todo)
          ? "<small>" + esc(m.aparte(todo.n, todo)) + "</small>" : "") +
        "</b></button>" +
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
      fichasPintadas[clave] = x;          // ver `fichasPintadas` arriba
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
        (x.hora ? dato("Hora de inicio", x.hora) : "") +
        /* la curva de esa salida, si el workflow ya la leyó: cuatro cifras que
           dicen de qué fue el día —sprint, ataque, subida o tempo largo— y que
           ningún otro campo cuenta */
        (function () {
          var c = (curva && x.id) ? curva[x.id] : null;
          if (!c) return "";
          return VENTANAS.map(function (v2) {
            return c[v2.id] == null ? ""
              : dato("Mejor " + v2.n, num(c[v2.id]), " W");
          }).join("");
        }());
      /* La zona sale de la celda, que es lo que se sabe antes de pedir el
         trazo; cuando el trazo llega, se recalcula con el centro de verdad. */
      /* La caja de la ruta manda sobre la celda: son coordenadas de verdad,
         con cinco decimales, en vez de un cuadro de medio grado. */
      var rr = x.ruta ? rutaPorId[x.ruta] : null;
      var cc = (rr && rr.b && rr.b.length === 4)
        ? [(rr.b[0] + rr.b[2]) / 2, (rr.b[1] + rr.b[3]) / 2]
        : celdaACoord(x.celda);
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
      var editor = (alRenombrar && x.id)
        ? '<div class="akhb-nombre" data-nom="' + clave + '">' +
            '<span class="akhb-nom-txt">' + esc(x.nombre || "(sin nombre)") + "</span>" +
            '<button type="button" class="akhb-nom-lapiz" data-renombra="' + clave +
              '" title="Cambiar el nombre" aria-label="Cambiar el nombre">\u270e</button>' +
            botonBorrar(x, clave) +
          "</div>"
        : "";
      return '<div class="akhb-ficha' + (tablaFuerza ? " akhb-con-fuerza" : "") + '">' +
        editor +
        htmlBorrar(x, clave) +
        '<figure class="akhb-mapa" data-mapa="' + clave + '">' +
          '<div class="akhb-lienzo">' +
            (llevaMapa(x) ? '<div class="akhb-cargando">Trayendo el trazo…</div>'
                          : (figuras || iconoHTML(x))) +
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

    /* ---------- la ruta que le toca a una actividad ----------
       Por fecha Y por kilómetros. El 20-sep-2026, emparejando sólo por fecha,
       «Camino de Santiago - Castrojeriz» renombró la ruta de Villarino de los
       Aires: una era de 24,70 km y la otra de 2,13. */
    /* El margen es ANCHO —una cuarta parte— y no es descuido. El GPX archivado
       suma punto a punto y el reloj filtra el temblor: «Bious Artigues a
       Cabaña de la Hosse» mide 11,07 km en la colección y 10,36 en la ficha,
       un 7 % de diferencia, y son la misma salida. Con el 5 % que había antes
       no se encontraba a sí misma.
       Aquí se puede ser ancho porque la ficha te enseña el nombre de la ruta
       antes de que confirmes: el que decide eres tú, no la regla. Donde hay
       que ser estrecho es en el renombrado automático del workflow, que actúa
       sin nadie delante, y allí sigue en el 10 %. */
    function rutaDeActividad(x) {
      var dia = String(x && x.fecha || "").slice(0, 10);
      var cand = rutaPorFecha[dia] || [];
      if (!cand.length) return null;
      var km = x.km || 0, i, r, mejor = null, dif;
      for (i = 0; i < cand.length; i++) {
        r = cand[i];
        if (!r.km || !km) continue;
        dif = Math.abs(r.km - km) / km;
        if (dif <= 0.25 && (!mejor || dif < mejor.dif)) mejor = { r: r, dif: dif };
      }
      if (mejor) return mejor.r;
      /* sin kilómetros con los que comparar, vale si ese día hay una sola */
      return cand.length === 1 ? cand[0] : null;
    }

    /* El botón va PEGADO AL LÁPIZ, que es donde se busca: lo que se hace con
       una actividad —cambiarle el nombre, quitarla— se hace en el mismo sitio.
       Y no abre las opciones de golpe: primero pregunta si de verdad quieres
       borrar, y sólo entonces enseña qué se lleva cada una. */
    function botonBorrar(x, clave) {
      if (!alBorrar || !x.id) return "";
      return '<button type="button" class="akhb-nom-borrar" data-borra="' + clave +
        '" title="Borrar esta actividad" aria-label="Borrar esta actividad">Borrar</button>';
    }

    /* el hueco donde salen la pregunta y luego las opciones, justo debajo */
    function htmlBorrar(x, clave) {
      if (!alBorrar || !x.id) return "";
      return '<div class="akhb-borrar" data-bor="' + clave + '"></div>';
    }

    function htmlLista() {
      /* Se vacía en cada repintado: dos medidas distintas usan el mismo formato
         de clave («2024-m3» lo dan FTP, velocidad y potencia), así que dejar las
         de antes serviría la actividad equivocada. */
      fichasPintadas = {};
      /* Con una medida de días, abajo van DÍAS. No es un capricho: si eliges
         Pasos y abajo siguen saliendo actividades, la pantalla entera está
         hablando de una cosa menos la mitad de abajo. */
      if (metricaActual().fuente === "dia") return htmlDias();
      if (metricaActual().fuente === "fuerza") return htmlFuerza();
      if (metricaActual().fuente === "curva") return htmlCurva();
      if (metricaActual().acumula === false) return htmlMejores();

      var m = porAnio[estado.anio] || {};
      var meses = estado.mes ? [estado.mes] : Object.keys(m).sort();
      if (!meses.length) {
        return '<p class="akhb-nada">No hay actividades registradas en ' + estado.anio + ".</p>";
      }
      var h = "";
      meses.forEach(function (mm) {
        var lista = actsDe(estado.anio, mm);
        if (!lista.length) return;
        h += '<h4 class="akhb-titmes">' + MES[parseInt(mm, 10) - 1] +
             ' <span>' + lista.length + (lista.length === 1 ? " actividad" : " actividades") +
             "</span></h4><ul class=\"akhb-lista\">";
        lista.forEach(function (x, i) { h += htmlFila(x, estado.anio + mm + "-" + i); });
        h += "</ul>";
      });
      if (!h) {
        return '<p class="akhb-nada">' +
               (estado.mes ? MES[parseInt(estado.mes, 10) - 1] + " de " + estado.anio
                           : estado.anio) +
               (estado.fam ? " no tiene nada de lo que has dejado encendido."
                           : " no tiene ninguna actividad.") + "</p>";
      }
      return h;
    }

    /* ---------- la lista de la curva ----------
       Las salidas ordenadas por la ventana elegida, y en cada línea las cuatro
       cifras: se ve de un vistazo si aquel día fue un sprint o un tempo largo. */
    function htmlCurva() {
      var lista = conCurva(estado.anio, estado.mes);
      if (!lista.length) {
        return '<p class="akhb-nada">Ninguna salida de ' +
               (estado.mes ? MES[parseInt(estado.mes, 10) - 1] + " de " + estado.anio
                           : estado.anio) +
               " tiene curva todavía. El workflow las va leyendo del fichero original " +
               "a lo largo de varias pasadas.</p>";
      }
      var d = repartoCurva(estado.anio, estado.mes);
      var h = '<h4 class="akhb-titmes">' +
        (estado.mes ? MES[parseInt(estado.mes, 10) - 1] : "El año entero") +
        " <span>" + (estado.modo === "mejor" ? "mejor " : "mediana ") + num(d.n, 0) +
        "\u00a0W · " + lista.length + (lista.length === 1 ? " salida" : " salidas") +
        "</span></h4><ul class=\"akhb-lista\">";
      lista.forEach(function (x, i) {
        h += htmlFila(x, estado.anio + "-c" + i);
      });
      return h + "</ul>";
    }

    /* ---------- la lista de una medida de desempeño ----------
       De mejor a peor, que es lo que se pregunta después de ver el techo: no
       «qué hice» sino «cuáles fueron». */
    function htmlMejores() {
      var m = metricaActual();
      var lista = mejoresDe(estado.anio, estado.mes, m);
      if (!lista.length) {
        return '<p class="akhb-nada">Ninguna salida de ' +
               (estado.mes ? MES[parseInt(estado.mes, 10) - 1] + " de " + estado.anio
                           : estado.anio) +
               " mide " + esc(m.nom.toLowerCase()) + " con lo que hay encendido.</p>";
      }
      var d = reparto(estado.anio, estado.mes, m);
      var h = '<h4 class="akhb-titmes">' +
        (estado.mes ? MES[parseInt(estado.mes, 10) - 1] : "El año entero") +
        " <span>" + (estado.modo === "mejor" ? "mejor " : "mediana ") +
        num(d.n, m.dec) + m.suf + " · " + lista.length +
        (lista.length === 1 ? " salida" : " salidas") + "</span></h4>" +
        '<ul class="akhb-lista">';
      lista.forEach(function (x, i) { h += htmlFila(x, estado.anio + "-m" + i); });
      return h + "</ul>";
    }

    /* ---------- la lista cuando la medida son los kilos ----------
       Las sesiones de sala del tramo, con sus kilos. Al abrir una salen sus
       ejercicios y sus muñecos, que es lo que ya hace la ficha: aquí no se
       duplica nada. */
    function htmlFuerza() {
      var meses = estado.mes ? [estado.mes]
                : Object.keys(porAnio[estado.anio] || {}).sort();
      var h = "";
      meses.forEach(function (mm) {
        var lista = sesionesConKilos(estado.anio, mm);
        if (!lista.length) return;
        var d = repartoFuerza(estado.anio, mm);
        h += '<h4 class="akhb-titmes">' + MES[parseInt(mm, 10) - 1] +
             " <span>" + num(d.n, 0) + " kg · " + lista.length +
             (lista.length === 1 ? " sesión" : " sesiones") + "</span></h4>" +
             '<ul class="akhb-lista">';
        lista.forEach(function (x, i) { h += htmlFila(x, estado.anio + mm + "-f" + i); });
        h += "</ul>";
      });
      if (!h) {
        return '<p class="akhb-nada">No hay sesiones de sala con kilos en ' +
               (estado.mes ? MES[parseInt(estado.mes, 10) - 1] + " de " + estado.anio
                           : estado.anio) +
               ". Los kilos por ejercicio llegan con la exportación de Garmin.</p>";
      }
      return h;
    }

    /* ---------- la lista cuando la medida son los días ---------- */
    function htmlDias() {
      var porMes = diasPorMes[estado.anio] || {};
      var meses = estado.mes ? [estado.mes] : Object.keys(porMes).sort();
      var h = "";
      meses.forEach(function (mm) {
        var fechas = (porMes[mm] || []).filter(function (f) {
          var en = Math.min(pasosSal[f] || 0, dias[f] || 0);
          /* con «el resto del día» apagado sólo tienen sentido los días que
             tuvieron salida; con «en salidas» apagado, todos los demás */
          if (!activo("resto") && !en) return false;
          if (!activo("ensal") && en >= (dias[f] || 0)) return false;
          return true;
        });
        if (!fechas.length) return;
        var tot = repartoDias(estado.anio, mm).n;
        h += '<h4 class="akhb-titmes">' + MES[parseInt(mm, 10) - 1] +
             " <span>" + num(tot, 0) + " pasos · " + num(kmDePasos(tot), 0) +
             " km</span></h4><ul class=\"akhb-dias\">";
        fechas.forEach(function (f) { h += filaDia(f); });
        h += "</ul>";
      });
      if (!h) {
        return '<p class="akhb-nada">No hay pasos registrados en ' +
               (estado.mes ? MES[parseInt(estado.mes, 10) - 1] + " de " + estado.anio
                           : estado.anio) +
               ". El reloj empezó a contarlos en diciembre de 2019.</p>";
      }
      return h;
    }

    function filaDia(f) {
      var todo = dias[f] || 0, en = Math.min(pasosSal[f] || 0, todo);
      /* Si has apagado una de las dos mitades, la fila enseña la que queda
         encendida. Enseñar el día entero mientras la barra de arriba cuenta
         sólo una parte es la forma más rápida de que dos números de la misma
         pantalla no cuadren. */
      var tot = (activo("ensal") ? en : 0) + (activo("resto") ? todo - en : 0);
      var d = new Date(f + "T12:00:00");
      var abierto = estado.dia === f;
      var sal = todas.filter(function (x) { return x.fecha === f; });
      var h = '<li class="akhb-dia' + (abierto ? " abierto" : "") + '">' +
        '<button type="button" class="akhb-dia-cab" data-dia="' + f +
          '" aria-expanded="' + abierto + '">' +
          '<span class="akhb-dia-f"><b>' + d.getDate() + "</b> " +
            esc(DIA_SEM[d.getDay()]) + "</span>" +
          '<span class="akhb-dia-n">' + num(tot, 0) + " pasos</span>" +
          '<span class="akhb-dia-km">' + num(kmDePasos(tot), 1) + " km</span>" +
          /* la barrita dice de un vistazo cuánto de ese día quedó registrado */
          '<span class="akhb-dia-barra" title="' + num(en, 0) + ' en salidas"><i style="width:' +
            (todo ? (en / todo * 100).toFixed(1) : 0) + '%;background:' + colorG("ensal") +
            '"></i></span>' +
          '<span class="akhb-dia-sal">' +
            (sal.length ? sal.length + (sal.length === 1 ? " salida" : " salidas") : "—") +
          "</span>" +
        "</button>";
      if (abierto) {
        h += sal.length
          ? '<ul class="akhb-lista">' +
            sal.map(function (x, i) { return htmlFila(x, "d" + f + "-" + i); }).join("") + "</ul>"
          : '<p class="akhb-nada">Ese día no hay ninguna actividad registrada: ' +
            "esos pasos son de andar por ahí.</p>";
      }
      return h + "</li>";
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
          htmlResumen() +
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

    function dibujaTrazo(fig, pts, act) {
      /* Sin puntos no hay dibujo, y el hueco NO se puede quedar con el «Trayendo
         el trazo…» puesto: se cae al icono. Con la actividad de verdad, para que
         el pie diga qué pasó y no un genérico. */
      if (!pts || pts.length < 2) { pintaIcono(fig, act || { dep: "otr" }); return; }

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
      /* Los puntos en píxeles se guardan, y con ellos la distancia acumulada:
         es lo que permite que el perfil de abajo mueva un punto por el trazo.
         En píxeles y no en metros porque a este tamaño la proyección no
         deforma lo bastante para notarse, y así es una resta. */
      var enPx = pts.map(px), acum = [0], largoTot = 0, iPx;
      for (iPx = 1; iPx < enPx.length; iPx++) {
        var dx = enPx[iPx][0] - enPx[iPx - 1][0], dy = enPx[iPx][1] - enPx[iPx - 1][1];
        largoTot += Math.sqrt(dx * dx + dy * dy);
        acum.push(largoTot);
      }
      var d = enPx.map(function (q, i) {
        return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1);
      }).join(" ");
      var a = enPx[0], f = enPx[enPx.length - 1];

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
          /* el punto que sigue al dedo por el perfil; escondido hasta que se usa */
          '<circle class="akhb-punto" cx="0" cy="0" r="6.5" style="display:none"/>' +
        "</svg>";
      /* Para el perfil: dónde está cada punto y cuánto se llevaba andado. */
      fig.__traza = { pts: enPx, acum: acum, total: largoTot };
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
          /* lo que sigue al dedo: la guía vertical, la bolita y la etiqueta */
          '<g class="akhb-p-lupa" style="display:none">' +
            '<line class="akhb-p-guia" y1="' + ARR + '" y2="' + suelo + '"/>' +
            '<circle class="akhb-p-bola" r="4"/>' +
            '<text class="akhb-p-eti" y="' + (ARR + 7) + '"></text>' +
          "</g>" +
          /* transparente y por encima de todo: es quien caza el ratón */
          '<rect class="akhb-p-caza" x="' + IZQ + '" y="' + ARR + '" width="' + w +
            '" height="' + h + '" fill="transparent"/>' +
        "</svg>";

      enchufaLupa(caja, fig, { alts: alts, km: km, IZQ: IZQ, ARR: ARR, w: w, h: h,
                               X: X, Y: Y, suelo: suelo });
    }

    /* ---------- EL PERFIL Y EL TRAZO, ATADOS ----------

       Recorrer el perfil con el ratón y ver dónde estabas en el mapa. Sale
       casi gratis porque las dos cosas están medidas con la misma vara: los
       puntos del perfil vienen repartidos por distancia recorrida, así que el
       punto que está al 40 % del perfil es el que está al 40 % del camino. No
       hace falta emparejar nada, sólo buscar en la distancia acumulada del
       trazo —que `dibujaTrazo` deja guardada— la posición de esa fracción.

       El trazo puede llegar DESPUÉS que el perfil, porque la geometría de la
       colección se pide por red. Por eso no se guarda una referencia: se mira
       `fig.__traza` en el momento de mover el dedo, y si aún no está, el perfil
       funciona igual y sólo falta el punto en el mapa.

       Con el dedo funciona igual que con el ratón, y se corta el desplazamiento
       de la página mientras se arrastra encima — si no, en el móvil mover el
       dedo por el perfil pasa la pantalla. */
    function enchufaLupa(caja, fig, g) {
      var svg = caja.querySelector(".akhb-p-svg");
      var caza = caja.querySelector(".akhb-p-caza");
      var lupa = caja.querySelector(".akhb-p-lupa");
      if (!svg || !caza || !lupa) return;
      var guia = lupa.querySelector(".akhb-p-guia");
      var bola = lupa.querySelector(".akhb-p-bola");
      var eti = lupa.querySelector(".akhb-p-eti");

      /* dónde está el trazo cuando se lleva recorrida la fracción t */
      function enElTrazo(t) {
        var tr = fig.__traza;
        if (!tr || !tr.pts || tr.pts.length < 2 || !tr.total) return null;
        var meta = t * tr.total, lo = 0, hi = tr.acum.length - 1, mid;
        while (lo < hi) {
          mid = (lo + hi) >> 1;
          if (tr.acum[mid] < meta) lo = mid + 1; else hi = mid;
        }
        if (lo === 0) return tr.pts[0];
        var d0 = tr.acum[lo - 1], d1 = tr.acum[lo];
        var f = (d1 > d0) ? (meta - d0) / (d1 - d0) : 0;
        var p0 = tr.pts[lo - 1], p1 = tr.pts[lo];
        return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
      }

      function mueve(clientX) {
        var caja2 = svg.getBoundingClientRect();
        if (!caja2.width) return;
        var xv = (clientX - caja2.left) / caja2.width * P_ANCHO;
        var t = (xv - g.IZQ) / g.w;
        if (t < 0) t = 0; else if (t > 1) t = 1;

        var i = Math.round(t * (g.alts.length - 1));
        var alt = g.alts[i];
        var px2 = g.X(i), py = g.Y(alt);
        guia.setAttribute("x1", px2.toFixed(1));
        guia.setAttribute("x2", px2.toFixed(1));
        bola.setAttribute("cx", px2.toFixed(1));
        bola.setAttribute("cy", py.toFixed(1));

        /* la etiqueta se echa al otro lado cuando se sale por la derecha */
        var texto = Math.round(alt) + " m";
        if (g.km > 0) texto += "  ·  " + num(t * g.km, g.km < 100 ? 1 : 0) + " km";
        eti.textContent = texto;
        var derecha = px2 > g.IZQ + g.w * 0.6;
        eti.setAttribute("x", (px2 + (derecha ? -6 : 6)).toFixed(1));
        eti.setAttribute("text-anchor", derecha ? "end" : "start");
        lupa.style.display = "";

        var q = enElTrazo(t);
        var punto = fig.querySelector(".akhb-punto");
        if (punto && q) {
          punto.setAttribute("cx", q[0].toFixed(1));
          punto.setAttribute("cy", q[1].toFixed(1));
          punto.style.display = "";
        }
      }

      function quita() {
        lupa.style.display = "none";
        var punto = fig.querySelector(".akhb-punto");
        if (punto) punto.style.display = "none";
      }

      caza.addEventListener("mousemove", function (e) { mueve(e.clientX); });
      caza.addEventListener("mouseleave", quita);
      caza.addEventListener("touchstart", function (e) {
        if (e.touches && e.touches[0]) { mueve(e.touches[0].clientX); e.preventDefault(); }
      }, { passive: false });
      caza.addEventListener("touchmove", function (e) {
        if (e.touches && e.touches[0]) { mueve(e.touches[0].clientX); e.preventDefault(); }
      }, { passive: false });
      caza.addEventListener("touchend", quita);
      caza.addEventListener("touchcancel", quita);
    }

    function pintarMapas() {
      if (!estado.el) return;
      var fig = estado.el.querySelector("[data-mapa]");
      if (!fig) return;
      var clave = fig.getAttribute("data-mapa");
      var x = buscaPorClave(clave);
      /* Si no se encuentra, el hueco NO se queda con el cartel de «Trayendo el
         trazo…» puesto, que es lo que pasaba: se pone el icono y se acabó. */
      if (!x) { pintaIcono(fig, { dep: "otr" }); return; }
      /* El perfil no depende del dibujo: lo hay aunque la ruta la ponga la
         colección, y no lo hay en el rodillo aunque Zwift invente cuestas. */
      if (x.perfil && llevaMapa(x)) dibujaPerfil(fig, decodificarPerfil(x.perfil), x.km);

      if (!llevaMapa(x)) { pintaIcono(fig, x); return; }

      /* 1 · polilínea de Strava, si el workflow ya la trae */
      if (x.poli) { dibujaTrazo(fig, decodificarPolilinea(x.poli), x); return; }

      /* 2 · geometría de la colección de rutas */
      if (x.ruta && x.celda && traerGeo) {
        var pinta = function (geo) {
          var segs = geo && geo[x.ruta];
          if (!segs) { pintaIcono(fig, x); return; }   // la leyenda se respeta
          var pts = [];
          segs.forEach(function (s) { s.forEach(function (p) { pts.push(p); }); });
          dibujaTrazo(fig, pts, x);
        };
        if (cacheGeo[x.celda]) { pinta(cacheGeo[x.celda]); return; }

        /* CON RELOJ, y no es adorno: si la descarga de la celda se queda colgada
           —red mala, fichero grande, el repo sin responder— la promesa no falla
           nunca, y sin esto el hueco se queda con «Trayendo el trazo…» puesto
           para siempre. Pasó el 21-sep-2026. A los 12 segundos se dice lo que
           hay y se pinta el icono. */
        var resuelto = false;
        var reloj = setTimeout(function () {
          if (resuelto) return;
          resuelto = true;
          if (estado.abierta === clave) pintaIcono(fig, x);
        }, 12000);

        traerGeo(x.celda).then(function (geo) {
          cacheGeo[x.celda] = geo || {};
          if (resuelto) return;                 // ya se pintó el icono al agotarse
          resuelto = true; clearTimeout(reloj);
          if (estado.abierta === clave) pinta(cacheGeo[x.celda]);
        })["catch"](function () {
          if (resuelto) return;
          resuelto = true; clearTimeout(reloj);
          pintaIcono(fig, x);
        });
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
    /* ¿ESTA SESION DE RODILLO FUE ZWIFT?

       No todas lo son: de las 1.380 hay 83 que son rodillo a secas, y en ésas
       la Z naranja sería mentira. Quién es quién no se adivina aquí: viene
       hecho de casa, en la lista `zwift` de `datos/nombres.json`, que se sacó
       cruzando con Strava —el único sitio donde Zwift deja su firma, porque
       por el camino de Garmin se pierde—.

       Si esa lista no llegó (fichero viejo, sin configurar), se mira el
       nombre y el tipo. Acierta en la gran mayoría, pero falla justo en las
       que Carlos renombró a mano, así que es el plan B, no el plan A. */
    function esZwift(x) {
      if (!x || x.dep !== "rod") return false;
      if (zwift) return !!zwift[String(x.id)];
      var t = x.tipo || "";
      return /^\s*zwift\b/i.test(x.nombre || "") ||
             t === "VirtualRide" || t === "virtual_ride";
    }

    function iconoHTML(x) {
      /* Poner `rod: null` en la lista de iconos de la app NO es un olvido: es
         la forma de decir «para éste, el dibujo de dentro». Antes cualquier
         deporte sin imagen caía en la de «otros», el podio, y no había manera
         de pedir el SVG. */
      var dep = (x && typeof x === "object") ? (x.dep || "otr") : (x || "otr");
      var clave = dep;
      if (esZwift(x) && iconos &&
          Object.prototype.hasOwnProperty.call(iconos, "zwift") && iconos.zwift) {
        clave = "zwift";
      }
      var u = iconos && (Object.prototype.hasOwnProperty.call(iconos, clave)
                         ? iconos[clave] : iconos.otr);
      if (!u) return iconoSVG(dep);
      return '<span class="akhb-marca-caja">' +
        '<img class="akhb-marca" src="' + esc(u) + '" alt="' +
        esc(clave === "zwift" ? "Zwift" : (NOMBRE_DEP[dep] || "Actividad")) +
        '" onerror="this.remove()">' +
        iconoSVG(dep) + "</span>";
    }

    function pintaIcono(fig, x) {
      var lienzo = fig.querySelector(".akhb-lienzo") || fig;
      /* En una sesión de pesas el hueco lo ocupan los muñecos, no el icono.
         Esto se llama al terminar de pintar y antes borraba lo que ya había. */
      if (lienzo.querySelector(".akhb-cuerpos")) return;
      var chapa = lienzo.querySelector(".akhb-lugar");
      lienzo.innerHTML = iconoHTML(x);
      if (chapa) lienzo.appendChild(chapa);
      var cap = fig.querySelector("figcaption");
      if (cap && (x.ruta || x.poli)) {
        cap.textContent = (x.nombre ? x.nombre + " \u2014 " : "") + "no he podido traer el trazo";
      }
    }

    function buscaPorClave(clave) {
      /* Lo que se pintó manda: vale para cualquier formato de clave. */
      if (fichasPintadas[clave]) return fichasPintadas[clave];
      /* Plan B, el de siempre, por si alguien pregunta por una ficha que no
         está en pantalla: solo entiende el formato de la lista de sesiones. */
      var y = clave.slice(0, 4), mm = clave.slice(4, 6);
      var i = parseInt(clave.split("-")[1], 10);
      if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(mm) || isNaN(i)) return null;
      var lista = (porAnio[y] || {})[mm] || [];
      return lista[i] || null;
    }

    /* ---------- cambiar el nombre ----------
       Se edita en el sitio, sin ventanas ni pantallas nuevas: el texto se
       convierte en una caja, se escribe y se guarda. Mientras se guarda, el
       botón dice «guardando…»; si falla, lo dice y NO se pierde lo escrito. */
    function renombrar(bot) {
      var clave = bot.getAttribute("data-renombra") || bot.getAttribute("data-guarda") ||
                  bot.getAttribute("data-cancela");
      var caja = estado.el.querySelector('[data-nom="' + clave + '"]');
      var x = buscaPorClave(clave);
      if (!caja || !x) return;

      if (bot.hasAttribute("data-cancela")) { pintaNombre(caja, clave, x); return; }

      if (bot.hasAttribute("data-renombra")) {
        caja.innerHTML = '<input class="akhb-nom-caja" type="text" maxlength="80" value="' +
            esc(x.nombre || "") + '">' +
          '<button type="button" class="akhb-nom-ok" data-guarda="' + clave + '">Guardar</button>' +
          '<button type="button" class="akhb-nom-no" data-cancela="' + clave + '">Cancelar</button>';
        var c = caja.querySelector("input");
        if (c) { c.focus(); c.select(); }
        return;
      }

      var campo = caja.querySelector("input");
      var nuevo = campo ? campo.value.trim() : "";
      if (!nuevo || nuevo === x.nombre) { pintaNombre(caja, clave, x); return; }
      bot.disabled = true; bot.textContent = "guardando\u2026";
      alRenombrar(x.id, nuevo, function (bien, fallo) {
        if (!bien) {
          bot.disabled = false; bot.textContent = "Guardar";
          var av = caja.querySelector(".akhb-nom-mal");
          if (!av) {
            av = document.createElement("span");
            av.className = "akhb-nom-mal";
            caja.appendChild(av);
          }
          av.textContent = fallo || "no he podido guardarlo";
          return;
        }
        x.nombre = nuevo;
        pintaNombre(caja, clave, x);
        /* el nombre sale también en la fila de arriba y en el pie del mapa */
        var fila = estado.el.querySelector('[data-abre="' + clave + '"] .akhb-nom');
        if (fila) fila.textContent = nuevo;
        var cap = estado.el.querySelector('[data-mapa="' + clave + '"] figcaption');
        if (cap && cap.textContent.indexOf("\u2014") < 0) cap.textContent = nuevo;
      });
    }

    function pintaNombre(caja, clave, x) {
      caja.innerHTML = '<span class="akhb-nom-txt">' + esc(x.nombre || "(sin nombre)") + "</span>" +
        '<button type="button" class="akhb-nom-lapiz" data-renombra="' + clave +
          '" title="Cambiar el nombre" aria-label="Cambiar el nombre">\u270e</button>' +
        botonBorrar(x, clave);
    }

    /* ---------- borrar ----------
       Nada se borra de un clic: el primero abre las opciones y enseña qué se
       lleva por delante cada una, con el nombre de la ruta y sus kilómetros.
       El segundo es el que manda. */
    function borrar(bot) {
      var clave = bot.getAttribute("data-borra") || bot.getAttribute("data-borra-ver") ||
                  bot.getAttribute("data-borra-si") || bot.getAttribute("data-borra-no");
      var caja = estado.el.querySelector('[data-bor="' + clave + '"]');
      var x = buscaPorClave(clave);
      if (!caja || !x) return;

      if (bot.hasAttribute("data-borra-no")) { caja.innerHTML = ""; return; }

      if (bot.hasAttribute("data-borra")) {
        caja.innerHTML =
          '<div class="akhb-bor-caja akhb-bor-pregunta">' +
            "<p><b>\u00bfBorrar esta actividad?</b></p>" +
            '<div class="akhb-bor-bots">' +
              '<button type="button" class="akhb-bor-act" data-borra-ver="' + clave +
                '">S\u00ed, ver qu\u00e9 se borra</button>' +
              '<button type="button" class="akhb-bor-no" data-borra-no="' + clave +
                '">No</button>' +
            "</div>" +
          "</div>";
        return;
      }

      if (bot.hasAttribute("data-borra-ver")) {
        var r = rutaDeActividad(x);
        /* El \u00edndice que ve la app es el de App Mapas, y ah\u00ed s\u00f3lo hay
           senderismo y bici: una caminata archivada NO sale. Por eso, cuando
           aqu\u00ed no se ve ninguna, no se afirma que no exista \u2014se dice que lo
           mirar\u00e1 el ordenador, que s\u00ed tiene el cat\u00e1logo entero\u2014. */
        var arrastre = r
          ? "Se lleva tambi\u00e9n la ruta <b>" + esc(r.n || r.id) + "</b> (" +
            (r.km || 0).toFixed(2) + " km): el GPX pasa a <b>_borradas</b>, sale del cat\u00e1logo " +
            "y del mapa, y su fila del Excel se marca sin borrarse."
          : "Desde aqu\u00ed no veo ninguna ruta suya en el mapa, pero las caminatas no " +
            "salen en ese \u00edndice. Si hay un GPX archivado de ese d\u00eda con estos " +
            "kilómetros, <b>Rutas al d\u00eda</b> lo encontrar\u00e1 en el cat\u00e1logo y lo " +
            "quitar\u00e1 tambi\u00e9n. Si no lo hay, no se toca nada.";
        caja.innerHTML =
          '<div class="akhb-bor-caja">' +
            "<p>" + arrastre + "</p>" +
            '<div class="akhb-bor-bots">' +
              '<button type="button" class="akhb-bor-act" data-borra-si="' + clave +
                '" data-modo="actividad">Borrar la actividad</button>' +
              '<button type="button" class="akhb-bor-ruta" data-borra-si="' + clave +
                '" data-modo="ruta">Quitar s\u00f3lo el recorrido</button>' +
              '<button type="button" class="akhb-bor-no" data-borra-no="' + clave +
                '">Cancelar</button>' +
            "</div>" +
            '<p class="akhb-bor-pie">Dejar\u00e1 de salir aqu\u00ed en la pr\u00f3xima pasada del ' +
            "workflow. Lo del ordenador \u2014GPX, Excel y mapa\u2014 lo hace <b>Rutas al " +
            "d\u00eda</b>.</p>" +
          "</div>";
        return;
      }

      var modo = bot.getAttribute("data-modo") || "ruta";
      var r2 = rutaDeActividad(x);
      bot.disabled = true; bot.textContent = "guardando\u2026";
      alBorrar(x.id, modo, r2 ? r2.id : null,
               { fecha: String(x.fecha || "").slice(0, 10), km: x.km || 0,
                 nombre: x.nombre || "" },
               function (bien, fallo) {
        if (!bien) {
          bot.disabled = false;
          bot.textContent = modo === "actividad" ? "Borrar la actividad" : "Quitar s\u00f3lo el recorrido";
          var av = caja.querySelector(".akhb-bor-mal");
          if (!av) {
            av = document.createElement("p");
            av.className = "akhb-bor-mal";
            caja.appendChild(av);
          }
          av.textContent = fallo || "no he podido guardarlo";
          return;
        }
        caja.innerHTML = '<p class="akhb-bor-ok">' +
          (modo === "actividad" ? "Apuntada para borrar." : "Recorrido apuntado para quitar.") +
          " Lo dem\u00e1s se har\u00e1 al pasar <b>Rutas al d\u00eda</b>.</p>";
      });
    }


    /* ---------- clics ---------- */
    function alPulsar(e) {
      var b = e.target.closest
        ? e.target.closest("[data-borra],[data-borra-ver],[data-borra-si],[data-borra-no]") : null;
      if (b && estado.el.contains(b)) { e.stopPropagation(); borrar(b); return; }
      var r = e.target.closest ? e.target.closest("[data-renombra],[data-guarda],[data-cancela]") : null;
      if (r && estado.el.contains(r)) { e.stopPropagation(); renombrar(r); return; }
      var t = e.target.closest
        ? e.target.closest("[data-anio],[data-mes],[data-abre],[data-met],[data-fam],[data-dia],[data-modo],[data-vent]") : null;
      if (!t || !estado.el.contains(t)) return;
      if (t.hasAttribute("data-met")) {
        var nueva = t.getAttribute("data-met");
        if (nueva !== estado.metrica) {
          var antes = metricaActual();
          estado.metrica = nueva;
          /* El filtro SOLO se reinicia si cambian los grupos. De Kilómetros a
             Desnivel se conserva —es la misma pregunta con otra vara—, pero de
             ahí a Pasos no: allí no hay monte ni rodillo, y heredar un «solo
             monte» dejaría la pantalla vacía sin explicar por qué. */
          if (metricaActual().fuente !== antes.fuente) estado.fam = null;
          estado.dia = null;
        }
        if (metricaActual().fuente === "dia") pedirDias();
        pintar();
        return;
      }
      if (t.hasAttribute("data-vent")) {
        estado.vent = t.getAttribute("data-vent");
        estado.abierta = null;
        pintar(); return;
      }
      if (t.hasAttribute("data-modo")) {
        estado.modo = t.getAttribute("data-modo");
        estado.abierta = null;
        pintar(); return;
      }
      if (t.hasAttribute("data-fam")) {
        var g = t.getAttribute("data-fam");
        if (!g) estado.fam = null; else alternarFam(g);
        estado.abierta = null; estado.dia = null;
        pintar(); return;
      }
      if (t.hasAttribute("data-dia")) {
        var f = t.getAttribute("data-dia");
        estado.dia = (estado.dia === f) ? null : f;
        pintar();
        if (estado.dia) {
          var nf = estado.el.querySelector('[data-dia="' + f + '"]');
          if (nf && nf.scrollIntoView) nf.scrollIntoView({ block: "nearest" });
        }
        return;
      }
      if (t.hasAttribute("data-anio")) {
        estado.anio = t.getAttribute("data-anio");
        estado.mes = null; estado.abierta = null; estado.dia = null; pintar(); return;
      }
      if (t.hasAttribute("data-mes")) {
        estado.mes = t.getAttribute("data-mes") || null;
        estado.abierta = null; estado.dia = null; pintar(); return;
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
    NOMBRE_DEP: NOMBRE_DEP,
    /* El vocabulario de músculos se SACA FUERA a propósito: el catálogo de
       movimientos de la pestaña Entrenamiento pregunta por aquí en vez de
       llevar su propia tabla. Así no hay dos verdades — y si un movimiento
       aparece sin músculos en el catálogo, eso mismo avisa de que el reloj
       tampoco lo va a saber clasificar cuando llegue del FIT. */
    zonasDe: zonasDe,
    ZONA_ES: ZONA_ES,
    BLOQUE_MUSC: BLOQUE_MUSC
  };
})(this);
