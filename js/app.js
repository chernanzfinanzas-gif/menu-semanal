/* app.js — interfaz de la aplicación */
(function (global) {
  "use strict";

  var $ = Util.$, $$ = Util.$$, esc = Util.esc;

  /* NORMA CONTRA LINEAS HUERFANAS (23-sep-2026, la pidio Carlos al ver que la
     «g» de «Copos de avena integrales · 20 g» se quedaba sola en un renglon).
     Pega el numero a su unidad con un espacio DURO, asi que no se pueden
     separar nunca, ni en un navegador que no entienda `text-wrap:pretty`.
     Se aplica DESPUES de escapar, sobre texto ya seguro. */
  function sinViudas(txt) {
    return String(txt).replace(/(\d)\s+(g|kg|ml|cl|l|ud|uds|mg)(?![a-z\u00e1-\u00fa])/gi, "$1\u00a0$2");
  }

  var UI = {
    vista: "menu",
    lunes: Util.lunesDe(Util.hoyISO()),
    filtros: { texto: "", toma: "", grupo: "", tool: "" },
    filtrosIng: { texto: "", cat: "", clase: "" },
    fila: "recetas",        /* qué se lista en el Recetario: recetas o ingredientes */
    filaDesp: "localizacion", /* qué pestaña de la Despensa se abre */
    estanteTengo: null,     /* ¿Lo tengo?: el estante abierto, uno cada vez */
    pase: { vista: "indice", estante: null, i: 0 },
    busquedaHogar: "",
    sitioAbierto: "",       /* qué sitio de la casa está abierto al contar */
    buscaSitio: {},         /* { sitio: texto } — el buscador de dentro de cada sitio */
    buscaQuiero: "",        /* el buscador de «lo quiero esta vez», en la Compra */
    buscaPedir: "",         /* el gestor de cómo se pide: buscador y filtro */
    filtroPedir: "",
    grupoPedir: {},         /* qué grupos de contenedor están abiertos */
    cajonHogar: "",
    busquedaDespensa: "",
    verTodoPend: false,     // caja de «comprado y sin comer»: enseñar los 8 primeros o todos
    diaActivo: null,        // índice 0-6; en móvil se muestra un solo día
    ocultarComprados: false,
    verPlatosCompra: null,   // bloque de platos de Compra: null = aún no ha elegido él
    /* Rango de la lista de la compra. Independiente de la semana que se esté viendo
       en Menú, que es lo que confundía. */
    cuandoCompra: "resto",
    tRuta: null,            // espera antes de repintar al teclear las horas de una ruta
    /* Días pasados que ha desbloqueado a mano para corregir algo. Vive solo en
       memoria: al recargar vuelven a estar cerrados, que es lo que se quiere. */
    desbloqueados: {}
  };

  /* Un día pasado está cerrado salvo que lo haya abierto él. Cerrado significa
     que no se PLANIFICA: marcar lo que comiste sigue estando disponible siempre,
     porque eso es registro y suele apuntarse después. */
  function cerrado(fecha) {
    return Almacen.esPasado(fecha) && !UI.desbloqueados[fecha];
  }

  function esMovil() { return window.matchMedia("(max-width:767px)").matches; }

  /* Modo consulta: preferencia DE ESTE APARATO, no se sincroniza.
     Vive en su propia clave para que no viaje al repositorio con el resto. */
  var CLAVE_MODO = "asistente-alimentacion-modo";
  function soloConsulta() {
    try { return localStorage.getItem(CLAVE_MODO) === "consulta"; } catch (e) { return false; }
  }
  function ponerModo(consulta) {
    try { localStorage.setItem(CLAVE_MODO, consulta ? "consulta" : "completo"); } catch (e) {}
    aplicarModo();
  }
  function aplicarModo() {
    document.body.classList.toggle("modo-consulta", soloConsulta());
  }

  /* día que conviene mostrar al abrir: hoy si cae en la semana, si no el lunes */
  function diaPorDefecto() {
    var hoy = Util.hoyISO();
    for (var i = 0; i < 7; i++) if (Util.sumarDias(UI.lunes, i) === hoy) return i;
    return 0;
  }

  var NOMBRE_GRUPO = {
    "carne-roja": "Carne roja", "carne-blanca": "Carne blanca", "pescado-blanco": "Pescado blanco",
    "pescado-azul": "Pescado azul", "huevos": "Huevos", "legumbre": "Legumbre",
    "pasta-arroz": "Pasta y arroz", "verdura": "Verdura", "ensalada": "Ensalada",
    "desayuno": "Desayuno", "fruta": "Fruta", "postre": "Postre",
    /* Los caprichos nacen en la pestaña Menú, al apuntar algo fuera de plan.
       Están aquí para que se puedan buscar y filtrar como cualquier otra
       receta: la mayoría se toman fuera de casa —un helado, una hamburguesa—
       pero alguno cae en casa, y en los dos casos interesa tenerlos a mano
       para no volver a escribir las calorías cada vez. */
    "capricho": "Capricho",
    /* Los ingredientes solos —una manzana, 30 g de pistachos— son platos de
       pleno derecho: se planifican, cuentan macros y se compran. Lo que no son
       es una receta, y por eso van en su propio grupo en vez de repartidos por
       Fruta y Despensa, donde se perderían entre los platos de verdad. */
    "suelto": "Ingredientes solos"
  };
  var ABREV = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
  /* Los aparatos, en el ORDEN DE PREFERENCIA de Carlos (17-sep-2026):
     primero la freidora de aire, después los Lékué de microondas, y al final
     sartén, cazuela y horno. El número manda en cómo se ordenan las etiquetas
     y el desplegable del buscador, para que lo preferido salte a la vista.
     «lekue» a secas es el rótulo viejo: recetas que usan un Lékué sin concretar
     cuál. Sirve de lista de pendientes hasta que se detallen. */
  var NOMBRE_TOOL = {
    "airfryer": "Airfryer", "lekue-vapor": "Lékué vaporera",
    "lekue-arroz": "Lékué arrocera", "lekue-pasta": "Lékué cuecepasta",
    "lekue": "Lékué (sin concretar)", "microondas": "Microondas",
    "sarten": "Sartén", "cazuela": "Cazuela", "horno": "Horno",
    "sin-cocinar": "Sin cocinar"
  };
  var ORDEN_TOOL = {
    "airfryer": 1, "lekue-vapor": 2, "lekue-arroz": 2, "lekue-pasta": 2,
    "lekue": 3, "microondas": 4, "sarten": 5, "cazuela": 6, "horno": 6,
    "sin-cocinar": 0
  };
  /* «lekue» a secas entra también: son recetas que YA usan un Lékué, solo falta
     concretar cuál. Dejarlas fuera del filtro escondería recetas que sí le valen. */
  var TOOLS_PREFERIDAS = { "airfryer": 1, "lekue-vapor": 1, "lekue-arroz": 1, "lekue-pasta": 1, "lekue": 1 };

  function toolsOrdenadas(tools) {
    return (tools || []).slice().sort(function (a, b) {
      return (ORDEN_TOOL[a] || 9) - (ORDEN_TOOL[b] || 9);
    });
  }
  function etiquetasTool(tools) {
    return toolsOrdenadas(tools).map(function (t) {
      return '<span class="etiqueta' + (TOOLS_PREFERIDAS[t] ? ' preferida' : '') + '">' +
             esc(NOMBRE_TOOL[t] || t) + '</span>';
    }).join("");
  }


  /* ==================== PORTADA ==================== */
  /* El vídeo de entrada. Tres opciones, porque «siempre» puede acabar cansando
     y así se baja sin tener que tocar nada: siempre / una vez al día / nunca.
     La preferencia es de este aparato, igual que el modo consulta. */
  var CLAVE_INTRO = "asistente-alimentacion-intro";        // último día que se enseñó
  var CLAVE_INTRO_OFF = "asistente-alimentacion-intro-off";      // el ajuste viejo
  var CLAVE_INTRO_CUANDO = "asistente-alimentacion-intro-cuando";

  function cuandoIntro() {
    var v = null;
    try { v = localStorage.getItem(CLAVE_INTRO_CUANDO); } catch (e) {}
    if (v === "siempre" || v === "dia" || v === "nunca") return v;
    /* Sin elección todavía: respeto lo que dijera el interruptor de antes. */
    try { if (localStorage.getItem(CLAVE_INTRO_OFF) === "si") return "nunca"; } catch (e) {}
    return "siempre";
  }
  function ponerCuandoIntro(v) {
    try {
      localStorage.setItem(CLAVE_INTRO_CUANDO, v);
      localStorage.removeItem(CLAVE_INTRO_OFF);      // el ajuste viejo ya no manda
      if (v === "siempre") localStorage.removeItem(CLAVE_INTRO);
    } catch (e) {}
  }

  try { localStorage.removeItem("asistente-alimentacion-intro-sonido"); } catch (e) {}

  function cerrarPortada() {
    var p = $("#portada");
    if (!p) return;
    var v = $("#video-intro");
    if (v) { try { v.pause(); } catch (e) {} }
    p.classList.add("saliendo");
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 520);
  }

  function arrancarPortada() {
    var p = $("#portada");
    if (!p) return;
    var cuando = cuandoIntro(), hoy = Util.hoyISO(), visto = null;
    try { visto = localStorage.getItem(CLAVE_INTRO); } catch (e) {}

    if (cuando === "nunca" || (cuando === "dia" && visto === hoy)) {
      if (p.parentNode) p.parentNode.removeChild(p);
      return;
    }
    try { localStorage.setItem(CLAVE_INTRO, hoy); } catch (e) {}

    var v = $("#video-intro");
    $("#saltar-intro").addEventListener("click", cerrarPortada);
    p.addEventListener("click", function (e) { if (e.target === p) cerrarPortada(); });
    if (v) {
      /* Dos montajes del mismo vídeo: el apaisado para la pantalla del ordenador
         y el vertical para el móvil. Decide la forma de la ventana, no el aparato,
         así el móvil en horizontal también sale bien. */
      var deAlto = window.innerHeight > window.innerWidth;
      v.className = deAlto ? "vertical" : "";
      v.setAttribute("poster", deAlto ? "media/cartel-v.webp" : "media/cartel-h.webp");
      v.setAttribute("src", deAlto ? "media/intro-v.mp4" : "media/intro-h.mp4");
      v.addEventListener("ended", cerrarPortada);
      v.addEventListener("error", cerrarPortada);

      /* El sonido: MUDO SIEMPRE al abrir, en todas las aperturas, sin excepción
         y sin recordar nada. Solo suena si tocas el botón, y solo esa vez.
         Es lo que pidió Carlos el 17-sep, y además evita la pelea con el
         navegador, que corta el vídeo si le subes el sonido sin que lo toquen. */
      v.muted = true;
      var bot = $("#sonido-intro");
      function pintarSonido() {
        if (!bot) return;
        var puesto = !v.muted;
        bot.setAttribute("aria-pressed", puesto ? "true" : "false");
        bot.setAttribute("title", puesto ? "Quitar el sonido" : "Activar el sonido");
      }
      if (bot) {
        bot.addEventListener("click", function (ev) {
          ev.stopPropagation();                  /* que no cuente como cerrar */
          v.muted = !v.muted;
          pintarSonido();
        });
      }
      pintarSonido();

      var prometido = v.play();
      if (prometido && prometido.catch) prometido.catch(function () { cerrarPortada(); });

      setTimeout(cerrarPortada, deAlto ? 23000 : 13000);   // por si se queda colgado
    } else {
      cerrarPortada();
    }
  }

  /* ==================== MODAL ==================== */
  function abrirModal(html) {
    $("#modal-caja").innerHTML = html;
    $("#modal").classList.add("abierta");
  }
  function cerrarModal() { $("#modal").classList.remove("abierta"); }

  /* ==================== VISTA: MENÚ ==================== */
  function pintarMenu() {
    var movil = esMovil();
    $("#rango-semana").textContent = movil ? Util.etiquetaRangoCorto(UI.lunes) : Util.etiquetaRango(UI.lunes);
    var cont = $("#rejilla-dias"), html = "", hoy = Util.hoyISO();
    if (UI.diaActivo === null || UI.diaActivo < 0 || UI.diaActivo > 6) UI.diaActivo = diaPorDefecto();

    /* barra de días (solo se ve en móvil) */
    var sel = "";
    for (var d = 0; d < 7; d++) {
      var f = Util.sumarDias(UI.lunes, d);
      var dia0 = Almacen.estado.plan[f];
      var hay = false;
      if (dia0) Util.TOMAS.forEach(function (t) { if ((dia0[t.k] || []).length) hay = true; });
      var punto = !hay ? "vacio" : Almacen.semaforo(Almacen.salDia(f), f);
      var tipo0 = Almacen.tipoDia(f);
      sel += '<button data-dia="' + d + '"' + (d === UI.diaActivo ? ' class="activo"' : '') + '>' +
             ABREV[d] +
             (tipo0 !== "casa" ? '<span class="marca-tipo">' + Almacen.TIPOS_DIA[tipo0].icono + '</span>' : '') +
             '<span class="num">' + Util.desdeISO(f).getDate() + '</span>' +
             '<span class="punto ' + punto + '"></span></button>';
    }
    $("#selector-dias").innerHTML = sel;

    /* Lo comprado que no se comió y cuyo día ya pasó.
       OJO CON EL NOMBRE: esto NO es la pestaña Despensa. Allí hay una lista de
       ingredientes que tienes en casa (`estado.despensa`), y vaciarla no toca nada de
       aquí. Esta caja se calcula sola: plato marcado como comprado, en un día que ya
       pasó, sin marcar como comido. Por eso «vaciar la despensa» no la limpiaba.
       Y hacen falta TRES salidas, no una: volver al menú, darlo por comido o darlo
       por gastado. Con una sola —y encima rota— el plato se quedaba aquí encallado. */
    var pend = Almacen.pendientesDespensa();
    var cajaP = $("#pendientes-despensa");
    if (cajaP) {
      if (!pend.length) { cajaP.style.display = "none"; cajaP.innerHTML = ""; }
      else {
        var TOPE_PEND = 8;
        var verP = UI.verTodoPend ? pend.length : Math.min(TOPE_PEND, pend.length);
        var h = '<b>Comprado y sin comer</b> — ' + pend.length + ' plato' +
                (pend.length === 1 ? "" : "s") + ' de días que ya pasaron. ' +
                'Mientras estén aquí no se vuelven a pedir en la compra:' +
                '<div class="lista-pend">';
        pend.slice(0, verP).forEach(function (p) {
          var clave = p.f + '|' + p.toma + '|' + esc(p.id);
          h += '<span class="pend">' + esc(p.n) +
               ' <small>' + Util.etiquetaFecha(p.f) + ' · ' + p.toma + '</small>' +
               '<button class="btn mini" data-reprogramar="' + clave +
               '" title="Lo lleva al primer día futuro con esa toma libre">Reprogramar</button>' +
               '<button class="btn mini" data-pend-comido="' + clave +
               '" title="Sí me lo comí: cuenta en las calorías de aquel día">Me lo comí</button>' +
               '<button class="btn mini" data-pend-fuera="' + clave +
               '" title="Ya no queda: se gastó, se tiró o se comió otra cosa">Ya no está</button>' +
               '</span>';
        });
        h += '</div>';
        if (pend.length > TOPE_PEND) {
          h += '<div class="nota-peque"><button class="btn mini" data-pend-ver="1">' +
               (UI.verTodoPend ? 'Ver solo los primeros ' + TOPE_PEND : 'Ver los ' + pend.length) +
               '</button></div>';
        }
        h += '<div class="nota-peque"><button class="btn mini" data-pend-vaciar="1">' +
             'Vaciar la lista: ya no queda nada de esto</button></div>';
        cajaP.innerHTML = h;
        cajaP.style.display = "";
      }
    }

    /* media de la semana */
    var res = Almacen.resumenSemana(UI.lunes);
    var caja = $("#resumen-semana");
    if (res) {
      caja.style.display = "";
      caja.innerHTML = "<b>Media de la semana</b> (" + res.dias + " día" + (res.dias === 1 ? "" : "s") + "): " +
        Util.kcal(res.k) + " · " + Math.round(res.p) + " g de proteína · " +
        Math.round(res.g) + " g de grasa · " + Math.round(res.h) + " g de hidratos · " +
        Util.sal(res.sal) + " de sal al día.";
    } else {
      caja.style.display = "none";
    }

    for (var i = 0; i < 7; i++) {
      if (movil && i !== UI.diaActivo) continue;
      var fecha = Util.sumarDias(UI.lunes, i);
      var dia = Almacen.estado.plan[fecha];
      var sal = Almacen.salDia(fecha);
      var color = Almacen.semaforo(sal, fecha);
      var tipo = Almacen.tipoDia(fecha);
      var fichaT = Almacen.TIPOS_DIA[tipo];
      var tieneAlgo = false;
      if (dia) Util.TOMAS.forEach(function (t) { if ((dia[t.k] || []).length) tieneAlgo = true; });

      var nutr = Almacen.nutrDia(fecha);
      var nutrCom = Almacen.nutrDia(fecha, true);
      var hayComido = Almacen.hayComidoAlgo(fecha);
      var kcalAct = Math.round(Almacen.kcalActividad(fecha));
      var devEj = Almacen.estado.config.devolucionEjercicio;
      /* Lo que de verdad SUBE al objetivo, ya con la corrección de cada
         procedencia: lo medido entero, lo estimado al 70%, lo previsto a la
         mitad. Es el número que tiene que cuadrar con el objetivo de al lado. */
      var subeEntreno = (function () {
        var k = Almacen.kcalPorProcedencia(fecha);
        var pre = typeof Almacen.estado.config.previsionEjercicio === "number"
          ? Almacen.estado.config.previsionEjercicio : 0.50;
        return Math.round(k.real + k.apuntado * devEj + k.previsto * pre);
      }());
      if (typeof devEj !== "number") devEj = 0.70;
      var objetivo = Almacen.objetivoDelDia(fecha);
      var colorK = Almacen.semaforoKcal(nutr.k, objetivo);

      var cerr = cerrado(fecha);
      var hayQueVaciar = !!(dia && (Util.TOMAS.some(function (t) { return (dia[t.k] || []).length; }) ||
                                    (dia.capricho || []).length));
      var sePuedeDeshacer = !!(dia && dia.guardadoVaciar);
      html += '<div class="dia' + (fecha === hoy ? " hoy" : "") + (cerr ? " cerrado" : "") +
              (Almacen.esPasado(fecha) && !cerr ? " reabierto" : "") + '">';
      html += '<header><span class="nombre">' + Util.DIAS[i] + '</span>' +
              '<span class="fecha">' + Util.etiquetaFecha(fecha) + '</span>' +
              /* LAS CALORÍAS Y LA SAL ARRIBA; LO QUE FALTA O SOBRA, SIEMPRE ABAJO.
                 Con los tres chips en la misma fila, el salto de línea caía en
                 un sitio distinto según lo largo que fuera cada número, y no
                 había dos días que se leyeran igual. El separador fuerza el
                 corte siempre en el mismo punto. */
              (tieneAlgo ? '<span class="chip-sal ' + colorK + '">' + Util.kcal(nutr.k) + '</span>' +
                           '<span class="chip-sal ' + color + '">' + Util.sal(sal) + ' sal' +
                           (color === "libre" ? ' \u00b7 sin tope' : '') + '</span>' +
                           '<span class="salto-chips"></span>' +
                           chipDiferencia(objetivo, nutr.k, tieneAlgo) : '') +
              (Almacen.esPasado(fecha)
                ? '<button class="btn mini abrir-dia solo-edicion" data-abrir="' + fecha + '">' +
                  (cerr ? 'Editar' : 'Cerrar') + '</button>'
                : '') +
              '</header>';

      /* LA MARCA DE CORREGIDO A MANO. No es un adorno: si un día pasado no
         cuadra con lo que recuerdas, saber que lo tocaste —y cuándo— es la
         diferencia entre un dato y una sospecha. */
      var corr = Almacen.corregidoEl(fecha);
      var selloCorr = corr
        ? ' · <b>Corregido a mano</b> el ' + corr.slice(8, 10) + '/' + corr.slice(5, 7)
        : '';
      if (cerr) {
        html += '<div class="nota-tipo ya-pasado">Día pasado y <b>congelado</b>: los nombres y los ' +
                'números son los que tenían los platos ESE día, así que cambiar una receta ya no ' +
                'reescribe esta ficha. <b>Puedes seguir marcando ✓</b> lo que comiste; para corregir ' +
                'algo más, dale a «Editar».' + selloCorr + '</div>';
      } else if (Almacen.esPasado(fecha)) {
        html += '<div class="nota-tipo ya-pasado">Corrigiendo un día pasado. Lo que añadas se guarda ' +
                'con los valores de hoy y queda fijo; lo que quites desaparece del día. Dale a ' +
                '«Cerrar» al terminar.' + selloCorr + '</div>';
      }

      /* tipo de día: se elige ANTES de rellenar, porque manda sobre todo lo demás */
      if (!cerr) {
        html += '<div class="tipo-dia solo-edicion">';
        Object.keys(Almacen.TIPOS_DIA).forEach(function (k) {
          var t = Almacen.TIPOS_DIA[k];
          html += '<button class="pest-tipo' + (k === tipo ? " activo" : "") + '" ' +
                  'data-tipodia="' + fecha + '|' + k + '" title="' + esc(t.n) + '">' +
                  t.icono + ' <span>' + esc(t.n) + '</span></button>';
        });
        html += '<button class="btn principal mini rellenar-dia" data-completar="' + fecha + '" ' +
                'title="Elige platos para cuadrar con las calorías del día">Completar</button>';
        /* VACIAR EL DÍA DE UN GOLPE (23-sep-2026, Carlos: «quiero un botón que vacíe
           el día», «junto a completar», «reduce el tamaño para que entren los dos»).
           Hasta hoy había que quitar plato a plato.
           El «Deshacer» sólo aparece MIENTRAS el día siga vacío: en cuanto vuelve a
           poner algo, el botón pasa a ser «Vaciar» otra vez. Así nunca hay un
           Deshacer al acecho que le borre lo recién puesto. */
        html += hayQueVaciar
          ? '<button class="btn mini vaciar-dia" data-vaciardia="' + fecha + '" ' +
            'title="Deja el día entero vacío">Vaciar</button>'
          : sePuedeDeshacer
            ? '<button class="btn principal mini vaciar-dia" data-desvaciar="' + fecha + '" ' +
              'title="Devuelve lo que acabas de vaciar">Deshacer</button>'
            : '';
        /* El botón «Plantilla» de cada día se quitó el 21-sep-2026: Carlos no hace
           plantillas de un solo día, así que copiar la plantilla día a día no le
           servía para nada y robaba sitio en una cabecera que ya lleva cuatro
           chips. La semana entera se sigue rellenando desde «Copiar plantilla»,
           arriba. El manejador de `data-rellenar` se queda por si vuelve. */
        html += '</div>';
      }

      if (tipo === "ruta" && !cerr) {
        /* Qué salida y cuántas horas: es lo que sube el objetivo de calorías del día. */
        var fr = Almacen.fichaRuta(fecha);
        html += '<div class="plan-ruta">';
        html += '<label><span>Salida</span><select data-rutaact="' + fecha + '">' +
                '<option value="">— elige —</option>';
        Almacen.DEPORTES_RUTA.forEach(function (x) {
          var a = Almacen.actividad(x.id);
          if (!a) return;
          html += '<option value="' + esc(x.id) + '"' + (fr && fr.a === x.id ? ' selected' : '') + '>' +
                  esc(a.n) + '</option>';
        });
        html += '</select></label>';
        html += '<label><span>Horas</span><input type="number" min="0.5" max="14" step="0.5" ' +
                'data-rutahoras="' + fecha + '" value="' + (fr ? fr.h : '') + '" placeholder="4"></label>';
        html += fr
          ? '<span class="quemado-ruta">≈ <b>' + fr.kcal + ' kcal</b> de más</span>'
          : '<span class="quemado-ruta">Sin salida planificada</span>';
        html += '</div>';
        html += '<div class="nota-tipo">Desayuno y cena en casa; almuerzo, comida y merienda, de mochila. ' +
                '<b>Sin tope de sal</b>: sudando se pierden unos 2,1 g de sal por litro, más de lo que cabe ' +
                'en el tope de un día entero.</div>';
      }

      /* De dónde sale el objetivo del día. Es la cadena entera en una línea, y sin ella
         el número parece salido de la nada. */
      if (Almacen.tmb()) {
        var gastoD = Math.round(Almacen.gastoDelDia(fecha));
        var defD = Math.round(Almacen.deficitDiario());
        html += '<div class="nota-tipo cadena">Gastas ≈ <b>' + Util.kcal(gastoD) + '</b> ' +
                '(' + Util.kcal(Math.round(Almacen.gastoBase())) + ' de base' +
                (subeEntreno ? ' + ' + Math.round(subeEntreno) + ' de entreno' : '') + ')' +
                ' − <b>' + defD + '</b> de déficit = comer <b>' + Util.kcal(objetivo) + '</b></div>';
        if (Almacen.objetivoEnSuelo(fecha)) {
          html += '<div class="nota-tipo aviso-objetivo">Con el déficit que tienes puesto, hoy te ' +
                  'tocarían menos de 1.200 kcal, y por ahí no se baja. El objetivo se ha quedado en ' +
                  'el suelo. <b>Muévete más o baja el ritmo de pérdida</b>: pasar hambre de esa manera ' +
                  'no adelanta nada.</div>';
        }
      } else {
        html += '<div class="nota-tipo aviso-objetivo">Para calcular lo que tienes que comer hacen ' +
                'falta tu <b>edad, altura y peso</b> en Ajustes → Tu perfil. Mientras tanto uso el ' +
                'objetivo fijo de ' + Util.kcal(Almacen.estado.config.objetivoKcal) + '.</div>';
      }

      if (tieneAlgo) {
        var obj = Almacen.objetivosMacros(fecha);
        var pct = objetivo ? Math.min(100, Math.round((hayComido ? nutrCom.k : nutr.k) / objetivo * 100)) : 0;
        html += '<div class="resumen-dia">' +
                  (objetivo ? '<div class="barra"><span class="relleno ' + colorK + '" style="width:' + pct + '%"></span></div>' : '') +
                  '<div class="macros">' +
                    '<span class="rotulo">Lo puesto, contra el objetivo del d\u00eda</span>' +
                    macro("P", nutr.p, obj.p, "corto") +
                    macro("G", nutr.g, obj.g, "ambos") +
                    macro("H", nutr.h, obj.h, "ambos") +
                    macroSal(sal, obj.sal) +
                    /* Lo que SUBE al objetivo, no lo que quemas: si pusiera el bruto
                       no cuadraría con el objetivo de al lado y parecería un error. */
                    (subeEntreno ? '<span class="quemado" title="Lo medido entra entero; ' +
                               'lo estimado al ' + Math.round(devEj * 100) + '% y lo previsto a la mitad">+' +
                               Math.round(subeEntreno) + ' del entreno</span>' : '') +
                  '</div>' +
                  filaCierre(fecha, objetivo, nutr.k, nutrCom.k, cerr || Almacen.esPasado(fecha)) +
                '</div>';
      }

      var personasBase = Almacen.estado.config.personas || 1;
      Util.TOMAS.forEach(function (t) {
        var platos = (dia && dia[t.k]) || [];
        var fueraT = Almacen.esFuera(fecha, t.k);
        var comen = Almacen.comensales(fecha, t.k);
        var activa = Almacen.tomaActiva(fecha, t.k);
        html += '<div class="toma' + (fueraT ? " es-fuera" : "") + (activa ? "" : " inactiva") + '">';
        /* Dos controles por toma: cuántos comen y si se come fuera. Van aquí y no en
           la cabecera del día porque las dos cosas cambian toma a toma. */
        /* LAS CALORÍAS DE LA TOMA, al lado de su nombre (Carlos, 23-sep-2026).
           Salen de `Almacen.nutrToma`, que es la misma función que suma el total
           del día: así las cinco tomas cuadran con la cabecera y no hay dos
           cuentas distintas conviviendo.
           Se enseña lo COMIDO cuando coincide con lo puesto, y «comido / puesto»
           cuando falta algo por marcar. Una toma vacía no enseña nada: un «0
           kcal» en cada renglón es ruido, no información. */
        var kToma = Almacen.nutrToma(fecha, t.k, false).k;
        var kCom = Almacen.nutrToma(fecha, t.k, true).k;
        var etqK = "";
        if (kToma >= 1) {
          etqK = (Math.round(kCom) >= Math.round(kToma))
            ? '<b class="kcal-toma hecha">' + Util.kcal(kToma) + '</b>'
            /* «652 / 860 kcal» y no «652 kcal / 860 kcal»: con la palabra dos
               veces el rótulo se partía en dos renglones en el móvil. */
            : '<b class="kcal-toma">' +
                (kCom >= 1 ? '<i>' + Util.kcal(kCom).replace(' kcal', '') + '</i> / ' : '') +
                Util.kcal(kToma) + '</b>';
        }
        html += '<div class="titulo-toma"><span>' + t.n + etqK + '</span>' +
                (cerr ? (comen !== personasBase ? '<span class="chip-toma comensales raro">👤 ' + comen + '</span>' : '')
                      : '<span class="grupo-comensales' + (comen !== personasBase ? " raro" : "") + '">' +
                        '<button class="paso" data-comensales="' + fecha + '|' + t.k + '|-1" ' +
                          'title="Uno menos"' + (comen <= 1 ? ' disabled' : '') + '>−</button>' +
                        '<span class="cuantos" title="Comen ' + comen + '">👤 ' + comen + '</span>' +
                        '<button class="paso" data-comensales="' + fecha + '|' + t.k + '|1" ' +
                          'title="Uno más"' + (comen >= 8 ? ' disabled' : '') + '>+</button>' +
                        '</span>' +
                        /* CON SU PALABRA AL LADO. Era un emoji al 45 % de opacidad y
                           Carlos no lo veía: un botón que hay que adivinar no es un
                           botón. Ahora dice «Fuera» y se lee apagado o encendido. */
                        '<button class="chip-toma fuera' + (fueraT ? " si" : "") + '" ' +
                        'data-fuera="' + fecha + '|' + t.k + '" ' +
                        'title="' + (fueraT ? "Se come fuera de casa: toca para volver a casa"
                                            : "Marcar como comida fuera de casa") +
                        '">\ud83c\udf7d\ufe0f <span>Fuera</span></button>') +
                /* EL «+» SIGUE AHÍ AUNQUE LA TOMA SEA DE FUERA. Antes desaparecía, y
                   con él la única manera de apuntar qué habías comido en el
                   McDonald's: sólo quedaba la estimación genérica. */
                (cerr || !activa ? '' : '<button class="anadir" data-anadir="' + fecha + '|' + t.k + '">+</button>') +
                '</div>';
        if (fueraT && !platos.length) {
          /* Sin nada apuntado, la estimación por toma es lo mejor que hay. En
             cuanto apuntes el plato, manda el plato: ver `nutrDia`. */
          var est = Almacen.estimacionFuera(t.k) || { k: 0, sal: 0 };
          html += '<div class="plato estimado">' +
                    '<span class="nom">Fuera de casa <span class="etiqueta">estimado</span></span>' +
                    '<span class="sal">' + Util.kcal(est.k) + ' \u00b7 ' + Util.sal(est.sal) + '</span>' +
                  '</div>';
          html += '<div class="nota-peque">Si sabes lo que comiste, ap\u00fantalo con el + ' +
                  'y contar\u00e1 eso en vez de la estimaci\u00f3n. No entra en la compra.</div>';
        } else if (!platos.length) {
          /* Una toma puede estar vacía por decisión, no por descuido: el almuerzo y la
             merienda solo se hacen los días de entreno. Decirlo evita que parezca un
             hueco sin rellenar. */
          html += '<div class="nota-peque">' +
                  (!activa ? "Solo los días que entrenas" : "—") + '</div>';
        } else {
          /* Un mismo plato repetido en la toma es CANTIDAD, no dos platos distintos:
             dos donuts, dos bolas de helado. Se agrupa por receta y se pinta con un
             contador «− ×2 +»; las kcal y la sal se multiplican, porque si te comes
             dos, son dos. El plan sigue siendo una lista de ids repetidos, así que no
             hay nada que migrar y lo ya guardado funciona igual. */
          var grupos = [], dondeVa = {};
          platos.forEach(function (rid, idx) {
            if (dondeVa[rid] === undefined) { dondeVa[rid] = grupos.length; grupos.push({ rid: rid, idxs: [] }); }
            grupos[dondeVa[rid]].idxs.push(idx);
          });
          grupos.forEach(function (gr) {
            var rid = gr.rid;
            var veces = gr.idxs.length;
            var idx = gr.idxs[gr.idxs.length - 1];   // el último: el que quita el «−»
            var r = Almacen.receta(rid);
            /* EL PASADO SE LEE DE LA FOTO, NO DE LA RECETA. Un día ya comido
               guarda el nombre y los números que el plato tenía ESE día, así que
               cambiar la receta hoy no reescribe lo que cenaste el martes. Si no
               hay foto —un día futuro, el plan— se lee la receta de siempre.
               Y un plato borrado del recetario sigue teniendo nombre si le dio
               tiempo a hacerse la foto. */
            var foto = Almacen.fotoPlato(fecha, rid);
            var nombre = Almacen.nombreEn(fecha, rid) || "(receta borrada)";
            var n = (foto || r) ? Almacen.nutrEn(fecha, rid) : { k: 0 };
            var s = "";
            var com = Almacen.estaComido(fecha, t.k, rid);
            var cpr = Almacen.estaComprado(fecha, t.k, rid);
            /* LO QUE COMISTE DE VERDAD. Sin corrección el factor son las veces
               que esté puesto; con corrección, lo que diga ella, que ya es el
               total de esa toma. */
            var real = Almacen.cantidadReal(fecha, t.k, rid);
            var fac = Almacen.factorPlato(fecha, t.k, rid, veces);
            /* LA FILA, EN DOS LINEAS (23-sep-2026, disenada con Carlos sobre un mock).
               Arriba: las dos casillas, el nombre con todo el ancho que sobra, las
               calorias y la x. Abajo: las unidades JUSTO DEBAJO de las casillas, y lo
               que comiste de verdad justo debajo de las calorias. Cada cosa cae en la
               vertical de la suya.
               La sal por plato SE FUE: ocupaba unos 70 px por fila, casi siempre ponia
               «0 g», y la que importa —la del dia— sigue arriba en la cabecera.
               Clase propia `dos-lineas` y no `.plato` a secas, porque esa clase la
               comparten el capricho y el entreno y cambiarla los rompe. */
            var hayCant = !cerr || veces > 1;
            var hayReal = !cerr && com;
            html += '<div class="plato dos-lineas' + (com ? " comido" : "") + (cpr && !com ? " comprado" : "") + '">' +
                      '<div class="pl-arriba">' +
                      '<span class="pl-checks">' +
                      /* Dos casillas, porque son dos cosas distintas: el carro dice que
                         los ingredientes ya estan en casa; el visto, que te lo comiste. */
                      /* En una toma de fuera no hay carro: eso no se compra, se paga
                         alli. Dejarlo invitaba a marcarlo y no significaba nada. */
                      (fueraT ? '' :
                      '<button class="marcar carro' + (cpr ? " si" : "") + '" ' +
                        'title="' + (cpr ? "Comprado: no se vuelve a pedir" : "Marcar como comprado") + '" ' +
                        'data-comprado="' + fecha + '|' + t.k + '|' + esc(rid) + '">\ud83d\uded2</button>') +
                      '<button class="marcar' + (com ? " si" : "") + '" title="Marcar como comido" ' +
                        'data-comido="' + fecha + '|' + t.k + '|' + esc(rid) + '">\u2713</button>' +
                      '</span>' +
                      /* El dia y la toma viajan con el plato para que la ficha pueda
                         ensenar las cantidades de los que comen ESE dia, y no las de
                         una racion suelta. */
                      (r ? '<span class="nom" data-ficha="' + esc(rid) + '" ' +
                        'data-ficha-dia="' + fecha + '|' + t.k + '">' + sinViudas(esc(nombre)) + '</span>'
                         : '<span class="nom" title="Esta receta ya no est\u00e1 en el recetario; ' +
                           'el nombre y los n\u00fameros son los que ten\u00eda ese d\u00eda">' +
                           sinViudas(esc(nombre)) + '</span>') +
                      '<span class="pl-kcal">' + Util.kcal(n.k * fac) + '</span>' +
                      (cerr ? '' : '<button class="quitar" data-quitartodo="' + fecha + '|' + t.k + '|' + esc(rid) + '" ' +
                        'title="' + (veces > 1 ? "Quitar los " + veces : "Quitar") + '">\u00d7</button>') +
                      '</div>' +
                      /* Segunda linea. Solo se pinta si tiene algo que decir: un plato
                         sin marcar y con una sola racion no la necesita. */
                      ((hayCant || hayReal) ?
                      '<div class="pl-abajo">' +
                        '<span class="grupo-cantidad pl-cant' + (veces > 1 ? " varias" : "") + '">' +
                          (cerr ? (veces > 1 ? '<span class="cuantos">\u00d7' + veces + '</span>' : '') :
                            (veces > 1
                              ? '<button class="paso" data-menos="' + fecha + '|' + t.k + '|' + idx + '" title="Uno menos">\u2212</button>' +
                                '<span class="cuantos" title="' + veces + ' raciones">\u00d7' + veces + '</span>'
                              : '') +
                            '<button class="paso" data-mas="' + fecha + '|' + t.k + '|' + esc(rid) + '" ' +
                              'title="Otro m\u00e1s"' + (veces >= 12 ? ' disabled' : '') + '>+</button>') +
                        '</span>' +
                        /* La cantidad real sale cuando el plato esta comido: antes de
                           comertelo no hay nada que corregir. Si ya hay correccion se ve
                           el dato; si no, se pide con palabras y no con un icono suelto. */
                        (hayReal ?
                        '<span class="pl-comido"><span class="pl-marca">Comido</span>' +
                          '<button class="marcar peso' + (real ? " si" : "") + '" ' +
                            'title="' + (real ? "Comiste " + esc(Util.numero ? Util.numero(real.c) : real.c) + " " + esc(real.u === "rac" ? "raciones" : real.u) + " \u2014 tocar para cambiarlo" : "\u00bfCu\u00e1nto comiste de verdad?") + '" ' +
                            'data-real="' + fecha + '|' + t.k + '|' + esc(rid) + '">' +
                            (real ? esc(String(real.c) + (real.u === "rac" ? " r" : "\u00a0" + real.u)) : "\u00bfcu\u00e1nto? \u2696") +
                          '</button>' +
                        '</span>' : '') +
                      '</div>' : '') +
                    '</div>';
          });
        }
        html += '</div>';
      });

      /* CAPRICHOS: lo que te comiste sin que estuviera previsto.
         Va detrás de las cenas y no entre las tomas, porque no es una toma: no se
         planifica, no tiene comensales, no se come fuera y no entra en la compra.
         Y no lleva casilla de ✓: un capricho se apunta después de comerlo, así
         que apuntarlo YA ES marcarlo. */
      var caps = (dia && dia.capricho) || [];
      html += '<div class="toma caprichos' + (caps.length ? " con-algo" : "") + '">';
      html += '<div class="titulo-toma"><span>Caprichos</span>' +
              (cerr ? '' : '<button class="anadir" data-capricho="' + fecha + '">+</button>') +
              '</div>';
      if (!caps.length) {
        html += '<div class="nota-peque">Nada fuera de plan' + (cerr ? '' : ' \u00b7 el helado, la ca\u00f1a, el postre de un restaurante') + '</div>';
      } else {
        /* Aquí el contador es todavía más natural que en las tomas: los caprichos
           van de dos en dos más que de uno en uno. Dos donuts, dos cañas. */
        var gcaps = [], dondeCap = {};
        caps.forEach(function (rid, idx) {
          if (dondeCap[rid] === undefined) { dondeCap[rid] = gcaps.length; gcaps.push({ rid: rid, idxs: [] }); }
          gcaps[dondeCap[rid]].idxs.push(idx);
        });
        gcaps.forEach(function (gc) {
          var rid = gc.rid;
          var veces = gc.idxs.length;
          var idx = gc.idxs[gc.idxs.length - 1];
          var r = Almacen.receta(rid);
          var fotoC = Almacen.fotoPlato(fecha, rid);
          var n = (fotoC || r) ? Almacen.nutrEn(fecha, rid) : { k: 0 };
          html += '<div class="plato capricho">' +
                    '<span class="nom">' + esc(Almacen.nombreEn(fecha, rid) || "(borrado)") + '</span>' +
                    (cerr ? (veces > 1 ? '<span class="cuantos">×' + veces + '</span>' : '') :
                      '<span class="grupo-cantidad' + (veces > 1 ? " varias" : "") + '">' +
                        (veces > 1
                          ? '<button class="paso" data-menoscap="' + fecha + '|' + idx + '" title="Uno menos">−</button>' +
                            '<span class="cuantos" title="' + veces + '">×' + veces + '</span>'
                          : '') +
                        '<button class="paso" data-mascap="' + fecha + '|' + esc(rid) + '" ' +
                          'title="Otro más"' + (veces >= 12 ? ' disabled' : '') + '>+</button>' +
                      '</span>') +
                    '<span class="sal">' + Util.kcal(n.k * veces) + '</span>' +
                    (cerr ? '' : '<button class="quitar" data-quitacaptodo="' + fecha + '|' + esc(rid) + '" ' +
                      'title="' + (veces > 1 ? "Quitar los " + veces : "Quitar") + '">\u00d7</button>') +
                  '</div>';
        });
      }
      html += '</div>';

      /* Entreno del día. Los minutos se editan aquí mismo: la previsión sirve de
         punto de partida y cada día se ajusta a lo que vaya a hacer de verdad. */
      /* Tres procedencias: lo que apuntaste, lo que dice el plan y lo que midió
         el reloj. `entrenoDelDia` las junta y marca cuál es cuál. */
      var actos = Almacen.entrenoDelDia(fecha);
      var kProc = Almacen.kcalPorProcedencia(fecha);
      html += '<div class="toma actividad-dia">';
      /* EL BOTÓN «ESTÁNDAR» NO SALE SI EL PLAN YA MANDA ALGO ESE DÍA.
         (Carlos, 24-sep-2026.) El entreno estándar es para un día suelto que no
         tiene nada, no para ponerlo ENCIMA de la sesión que la rampa ya te
         manda. Poniéndolo encima quedaban dos previsiones del mismo día
         viniendo de dos sitios distintos, y las dos sumando calorías: eso es
         lo que se vio el día 23, con «Caminar» del plan y «Bici indoor» y
         «Musculación» del botón en la misma ficha.
         Se reconoce la previsión del plan en que NO está guardada —se calcula
         al pintar—, así que no trae `x`. */
      var yaHayPlan = actos.some(function (e) { return !e.x && e.clase === "previsto"; });
      html += '<div class="titulo-toma"><span>Entreno del día</span>' +
              (!cerr && tipo !== "ruta" && !yaHayPlan
                ? '<button class="btn mini" data-estandar="' + fecha + '" ' +
                  'title="Poner el entreno estándar de Ajustes">Estándar</button>' : '') +
              (cerr ? '' : '<button class="anadir" data-actividad="' + fecha + '">+</button>') +
              '</div>';
      if (!actos.length) {
        html += '<div class="nota-peque">' + (cerr ? "No apuntaste nada" : "Sin entreno previsto") + '</div>';
      } else {
        var totalAct = 0;
        actos.forEach(function (e, idx) {
          var x = e.x || {};
          var kc = e.kcal;
          var pisada = e.pisada;
          if (!pisada) totalAct += kc;
          /* Lo que viene del plan o de intervals NO está guardado: se calcula al
             pintar. Por eso no lleva ni casilla de minutos ni aspa — tocarlo
             sería apuntarlo, y entonces dejaría de seguir al plan. */
          var virtual = !e.x;
          var fuera = pisada || e.tapada || e.caducada;
          if (fuera) totalAct -= kc;          // ya sumado arriba; aquí se retira
          /* EN DOS FILAS (21-sep-2026). Arriba, de qué sesión se trata y de dónde
             sale el dato —del plan o del reloj—; abajo, los minutos y las
             calorías. En una sola línea el nombre de la sesión y su origen se
             comían el sitio y los números quedaban apretados contra el borde. */
          html += '<div class="plato act dos-filas' + (fuera ? " no-cuenta" : "") +
                    (e.clase === "previsto" ? " es-previsto" : "") +
                    (e.clase === "real" ? " es-real" : "") + '">' +
                    '<div class="act-arriba">' +
                      '<span class="nom">' + esc(e.n) + '</span>' +
                      (e.clase === "real" ? '<span class="etiqueta">reloj</span>' : '') +
                      (e.clase === "previsto" && !e.tapada && !e.caducada && x.ref !== "estandar"
                        ? '<span class="etiqueta">del plan</span>' : '') +
                      (e.tapada ? '<span class="etiqueta">sustituida por lo real</span>' : '') +
                      (e.caducada ? '<span class="etiqueta">no se hizo</span>' : '') +
                      (x.ref === "estandar" ? '<span class="etiqueta">previsto</span>' : '') +
                      (x.ref === "ruta" ? '<span class="etiqueta">salida planificada</span>' : '') +
                      (pisada ? '<span class="etiqueta">ya no cuenta</span>' : '') +
                    '</div>' +
                    '<div class="act-abajo">' +
                      (cerr || virtual
                        ? '<span class="min-fijo">' + e.min + '</span>'
                        : '<input type="number" class="min-act" min="0" max="900" step="5" ' +
                          'value="' + e.min + '" data-minact="' + fecha + '|' + idx + '" ' +
                          (x.fuente === "garmin" ? 'title="Medido por el reloj"' : '') + '>') +
                      '<span class="sal">min \u00b7 ' + kc + ' kcal</span>' +
                      (cerr || virtual ? '' : '<button class="quitar" data-quitaract="' + fecha + '|' + idx + '">\u00d7</button>') +
                    '</div>' +
                  '</div>';
        });
        /* La cuenta, desglosada: cada procedencia entra con su corrección y
           decirlo evita que el total parezca una resta arbitraria. */
        var dev = Almacen.estado.config.devolucionEjercicio;
        var pre = typeof Almacen.estado.config.previsionEjercicio === "number"
          ? Almacen.estado.config.previsionEjercicio : 0.50;
        var partes = [], suben = 0;
        if (kProc.real) { partes.push('<b>' + Math.round(kProc.real) + '</b> medidas por el reloj'); suben += kProc.real; }
        if (kProc.previsto) { partes.push('<b>' + Math.round(kProc.previsto * pre) + '</b> del plan, todavía por hacer'); suben += kProc.previsto * pre; }
        if (kProc.apuntado) { partes.push('<b>' + Math.round(kProc.apuntado * dev) + '</b> de lo que añadiste (el ' + Math.round(dev * 100) + '% de ' + Math.round(kProc.apuntado) + ': va por tablas y estiman de más)'); suben += kProc.apuntado * dev; }
        html += '<div class="resumen-act">Al objetivo suben <b>' + Math.round(suben) + ' kcal</b>' +
                (partes.length ? ': ' + partes.join(' · ') : '') +
                (kProc.tapado ? '<br><span class="nota-peque">' + Math.round(kProc.tapado) +
                  ' kcal previstas las sustituye lo que midió el reloj, no se suman aparte.</span>' : '') +
                (kProc.caducado ? '<br><span class="nota-peque">' + Math.round(kProc.caducado) +
                  ' kcal que el plan preveía y no llegaron a hacerse: ese día no cuentan.</span>' : '') +
                '</div>';
      }
      html += '</div>';
      html += '</div>';
    }
    cont.innerHTML = html;
  }

  /* Selector de receta para una toma. NO esconde nada: primero las que están
     pensadas para esa toma y debajo TODAS las demás, porque una cena como la
     lubina vale perfectamente para comer. El reparto por tomas es una sugerencia,
     no una regla. */
  function abrirSelector(fecha, toma) {
    var todas = Almacen.visibles()
      .sort(function (a, b) { return a.n.localeCompare(b.n); });
    /* En un día de ruta lo que manda no es la toma, es si cabe en la mochila. */
    var ruta = Almacen.fichaTipoDia(fecha).soloLlevables;
    var propias, resto, rotuloA, rotuloB;
    if (ruta) {
      propias = todas.filter(function (r) { return r.llevable; });
      resto   = todas.filter(function (r) { return !r.llevable; });
      rotuloA = "Para la mochila — se comen frías y aguantan el día";
      rotuloB = "El resto — hay que cocinarlas, no valen para la ruta";
    } else {
      propias = todas.filter(function (r) { return (r.tipo || []).indexOf(toma) >= 0; });
      resto   = todas.filter(function (r) { return (r.tipo || []).indexOf(toma) < 0; });
      rotuloA = "Pensadas para " + toma;
      rotuloB = "El resto del recetario \u2014 s\u00edrvete, las tomas son una sugerencia";
    }
    /* LOS CAPRICHOS, EN SU PROPIO APARTADO. Aquí dentro sí cuentan para la
       compra, y esa es justo la diferencia que hay que dejar clara: el mismo
       jamón ibérico es capricho si lo apuntas en el bloque de Caprichos —te lo
       tomaste y ya está— y es cena si lo pones en la cena, porque entonces hay
       que comprarlo. Salvo que la toma sea de fuera, claro: ahí se paga allí. */
    var caprichos = todas.filter(function (r) { return r.grupo === "capricho"; });
    function niCapNiSuelto(r) { return r.grupo !== "capricho" && r.grupo !== "suelto"; }
    propias = propias.filter(niCapNiSuelto);
    resto   = resto.filter(niCapNiSuelto);

    function boton(r) {
      var t = toolsOrdenadas(r.tools)[0];
      return '<button data-elegir="' + esc(r.id) + '" data-nombre="' + esc(r.n.toLowerCase()) + '">' +
             esc(r.n) + '<small>' + (NOMBRE_GRUPO[r.grupo] || r.grupo || "") + ' · ' +
             Util.sal(Almacen.salReceta(r)) + ' de sal · ' + (r.min || "?") + ' min' +
             (t ? ' · ' + esc(NOMBRE_TOOL[t] || t) : '') + '</small></button>';
    }

    /* POR CATEGORÍAS PLEGADAS (22-sep-2026, Carlos): «que presente sólo las
       categorías, y al abrir una, los platos ordenados alfabéticamente».

       Antes era una lista corrida de setenta recetas con dos rótulos por medio.
       Buscar el pescado de la cena era bajar y bajar. Ahora se ve el índice de
       un vistazo y se abre lo que interese.

       La primera va abierta, y es la que toca: en el desayuno, los desayunos;
       en un día de ruta, lo de la mochila; y en una comida o una cena, las que
       están pensadas para esa toma, que no son un grupo de alimentos sino un
       atajo. Debajo, TODOS los grupos, porque una cena vale para comer y al
       revés: el reparto por tomas es una sugerencia, no una regla. */
    function ordenar(lista) {
      return lista.slice().sort(function (a, b) { return a.n.localeCompare(b.n); });
    }

    function seccion(titulo, lista, abierta, aviso) {
      if (!lista.length) return "";
      return '<details class="grupo-selec"' + (abierta ? " open" : "") + '>' +
               '<summary><span class="tit">' + esc(titulo) + '</span>' +
               '<span class="cuantas">' + lista.length + '</span></summary>' +
               (aviso ? '<p class="aviso-grupo">' + esc(aviso) + '</p>' : '') +
               ordenar(lista).map(boton).join("") +
             '</details>';
    }

    /* ---------- YA LO TIENES EN CASA ----------
       Lo primero de todo, porque es lo que hay que gastar antes de comprar más.
       Arriba las recetas que se llevan lo fresco —lo de la nevera y el frutero,
       que es lo que se estropea— y debajo los productos que se comen tal cual.
       Todo esto sale de lo LIBRE, no del stock: lo que ya está prometido a otro
       plato no se puede prometer dos veces. */
    var tengo = Almacen.loQuePuedesGastar(toma);
    var bloqueCasa = "";
    /* TRES ESCALONES, Y EL PRIMERO ES «LO PUEDO HACER HOY» (25-sep-2026).
       Carlos, recién terminada la ronda de stock: «si puedo hacer un arroz
       entero y unos macarrones debería ser lo primero entre lo que elegir».
       Antes sólo había un escalón —lo que gasta algo perecedero— y era otra
       pregunta: ésa mira a lo que se estropea, y ésta a lo que puedes cenar sin
       ir al súper. Van las dos, y primero la suya, porque es la que convierte
       una tarde recorriendo la casa en un menú. */
    var colaReceta = function (id) {
      var rec = Almacen.receta(id);
      return rec ? Util.sal(Almacen.salReceta(rec)) + " de sal \u00b7 " + (rec.min || "?") + " min" : "";
    };
    var botonReceta = function (r, pie) {
      return '<button data-elegir="' + esc(r.id) + '" data-nombre="' + esc(r.n.toLowerCase()) + '">' +
             esc(r.n) + "<small>" + pie + "</small></button>";
    };
    var nEnCasa = tengo.productos.length + tengo.recetas.length +
                  (tengo.enteras || []).length + (tengo.casi || []).length;
    if (nEnCasa) {
      bloqueCasa = '<details class="grupo-selec" data-fijo="1" open>' +
        '<summary><span class="tit">Ya lo tienes en casa</span>' +
        '<span class="cuantas">' + nEnCasa + '</span></summary>';

      if ((tengo.enteras || []).length) {
        bloqueCasa += '<p class="aviso-grupo"><b>Lo puedes hacer entero</b>, sin comprar nada.</p>';
        bloqueCasa += tengo.enteras.map(function (r) {
          return botonReceta(r, "todo en casa \u00b7 " + colaReceta(r.id));
        }).join("");
      }
      if ((tengo.casi || []).length) {
        bloqueCasa += '<p class="aviso-grupo">Te falta poco: tienes lo principal.</p>';
        bloqueCasa += tengo.casi.map(function (r) {
          return botonReceta(r, "falta " + esc(r.faltan.slice(0, 2).join(", ")) +
            (r.faltan.length > 2 ? " y " + (r.faltan.length - 2) + " m\u00e1s" : "") +
            " \u00b7 " + colaReceta(r.id));
        }).join("");
      }
      if (tengo.recetas.length) {
        bloqueCasa += '<p class="aviso-grupo">Gasta lo que antes se estropea.</p>';
      }
      bloqueCasa += tengo.recetas.map(function (r) {
        /* el precio va delante: lo que falta antes de lo que gasta */
        var fal = (r.faltan || []).length
          ? "falta " + esc(r.faltan.slice(0, 2).join(", ")) +
            (r.faltan.length > 2 ? " y " + (r.faltan.length - 2) + " m\u00e1s" : "") + " \u00b7 "
          : "";
        return botonReceta(r, fal + "gasta " + esc(r.cuales.slice(0, 2).join(", ")) +
          " \u00b7 " + colaReceta(r.id));
      }).join("");
      if (tengo.productos.length) {
        bloqueCasa += '<p class="aviso-grupo">Para comer tal cual.</p>';
      }
      bloqueCasa += tengo.productos.map(function (x) {
        var g = Almacen.ingrediente(x.id);
        var n = g ? Almacen.nutrReceta({ ing: [{ i: x.id, c: x.racion }] }) : { k: 0 };
        return '<button data-casa="' + esc(x.id) + '|' + x.racion + '" data-nombre="' + esc(x.n.toLowerCase()) + '">' +
               esc(x.n) + ' \u00b7 ' + esc(Util.cantidadReceta(x.racion, x.u, x.pesoUd)) +
               '<small>' + esc(Almacen.nombreSitio(x.sitio)) + ' \u00b7 te quedan ' +
               esc(Util.cantidadReceta(x.libre, x.u, x.pesoUd)) + ' \u00b7 ' + Util.kcal(n.k) + '</small></button>';
      }).join("");
      bloqueCasa += '</details>';
    }

    var html = '<header><h2>Añadir a ' + toma + '</h2><button class="cerrar" data-cerrar>×</button></header>';
    html += '<input type="text" id="filtro-selector" placeholder="Filtrar entre todas…">';
    html += '<div class="lista-selec por-grupos" id="lista-selector">';

    /* la preferente del bloque; se compone ahora y se coloca más abajo, porque
       en un almuerzo o una merienda lo primero no son las recetas. */
    var bloquePreferente = seccion(ruta ? "Para la mochila" : ("Pensadas para " + toma), propias, true,
                    ruta ? "Se comen fr\u00edas y aguantan el d\u00eda" : null);

    /* UN INGREDIENTE SOLO (22-sep-2026, Carlos): «los pistachos, los cacahuetes,
       la manzana… ahora aparecen en caprichos y deberían estar en meriendas y
       almuerzos como ingredientes que se pueden comer solos».
       Tenía razón y el fallo era de diseño: lo único que se podía apuntar sin
       receta era un capricho, y un capricho NO entra en la lista de la compra.
       Una manzana del almuerzo sí hay que comprarla. Así que aquí se elige el
       ingrediente y la cantidad, se planifica como cualquier plato y se compra.
       Va abierta cuando el bloque es de almuerzo o merienda, que es donde se
       come algo suelto; en una cena, cerrada. */
    var sueltos = todas.filter(function (r) { return r.grupo === "suelto"; });
    var esPicoteo = toma === "almuerzo" || toma === "merienda";
    var catalogo = (Almacen.estado.ingredientes || []).filter(function (g) { return !g.oculta; });
    /* ABIERTO Y EL PRIMERO EN ALMUERZO Y MERIENDA (Carlos, 22-sep-2026: «si
       quiero añadir nuez sola al almuerzo no me aparece como opción»).
       Sí aparecía, pero plegado y con un contador que decía «2» —los dos
       sueltos que ya había usado—, así que parecía que solo había dos cosas.
       Ahora el contador dice cuántos ingredientes hay de verdad, que es lo que
       se puede elegir, y en un picoteo se abre solo. */
    var bloqueSueltos = '<details class="grupo-selec" data-fijo="1"' +
              (esPicoteo ? " open" : "") + '>' +
            '<summary><span class="tit">Un ingrediente solo</span>' +
            '<span class="cuantas">' + catalogo.length + '</span></summary>' +
            '<p class="aviso-grupo">Cualquiera del cat\u00e1logo: un pl\u00e1tano, 20 g de nueces, ' +
            'un yogur. Escribe para buscarlo, pon la cantidad y A\u00f1adir. Cuenta las ' +
            'calorías y va a la lista de la compra.</p>' +
            '<div class="nuevo-suelto">' +
              '<input type="text" id="suelto-buscar" placeholder="Buscar ingrediente\u2026" ' +
                'style="flex:1 1 100%; margin-bottom:6px">' +
              '<select id="suelto-ing">' +
              Almacen.estado.ingredientes.filter(function (g) { return !g.oculta; })
                .sort(function (a, b) { return a.n.localeCompare(b.n); })
                .map(function (g) {
                  return '<option value="' + esc(g.id) + '" data-u="' + esc(g.u) + '"' +
                         ' data-peso="' + (g.pesoUd || 0) + '">' + esc(g.n) + '</option>';
                }).join("") +
              '</select>' +
              '<input type="number" id="suelto-cant" step="0.25" min="0" value="1">' +
              '<span id="suelto-uni">ud</span>' +
              '<button class="btn principal mini" id="suelto-add">Añadir</button>' +
            '</div>' +
            (sueltos.length ? '<p class="aviso-grupo">Los que ya has usado antes:</p>' : '') +
            ordenar(sueltos).map(boton).join("") +
            '</details>';

    /* El orden: en un almuerzo o una merienda, primero el ingrediente solo;
       en una comida o una cena, primero las recetas. */
    html += bloqueCasa + (esPicoteo ? (bloqueSueltos + bloquePreferente)
                                    : (bloquePreferente + bloqueSueltos));

    /* y después el recetario entero, por grupos de alimento */
    var porGrupo = {};
    todas.forEach(function (r) {
      if (r.grupo === "capricho" || r.grupo === "suelto") return;
      (porGrupo[r.grupo || "otros"] = porGrupo[r.grupo || "otros"] || []).push(r);
    });
    Object.keys(NOMBRE_GRUPO).forEach(function (g) {
      if (g === "capricho" || g === "suelto") return;
      html += seccion(NOMBRE_GRUPO[g], porGrupo[g] || [], false, null);
      delete porGrupo[g];
    });
    Object.keys(porGrupo).sort().forEach(function (g) {
      html += seccion(g, porGrupo[g], false, null);
    });

    html += seccion("Caprichos", caprichos, false,
      Almacen.esFuera(fecha, toma)
        ? "Esta toma es de fuera, así que no entra en la compra."
        : "Puesto en una toma SÍ entra en la lista de la compra.");

    html += '</div>';
    abrirModal(html);

    /* Al filtrar se abren solas las categorías que tengan algo y se cierran las
       que no: si no, habría que ir abriéndolas una a una para ver si el filtro
       ha encontrado algo dentro, que es justo lo contrario de filtrar. */
    $("#filtro-selector").addEventListener("input", function (e) {
      var q = e.target.value.toLowerCase().trim();
      $$("#lista-selector .grupo-selec").forEach(function (det) {
        if (det.getAttribute("data-fijo")) return;   // la de crear uno solo no se filtra
        var vistos = 0;
        $$("button[data-nombre]", det).forEach(function (b) {
          var cabe = !q || b.getAttribute("data-nombre").indexOf(q) >= 0;
          b.style.display = cabe ? "" : "none";
          if (cabe) vistos++;
        });
        det.style.display = vistos ? "" : "none";
        if (q) det.open = true;
        det.querySelector(".cuantas").textContent = vistos;
      });
      if (!q) {
        /* al vaciar el filtro se vuelve al estado de partida: sólo la primera */
        $$("#lista-selector .grupo-selec").forEach(function (det, i) {
          if (!det.getAttribute("data-fijo")) det.open = i === 0;
        });
        $$("#lista-selector .grupo-selec").forEach(function (det) {
          det.querySelector(".cuantas").textContent =
            $$("button[data-nombre]", det).length;
        });
      }
    });
    /* La casilla de cantidad cambia de sentido según el ingrediente: 1 ud de
       manzana, 30 g de pistachos. Que lo diga la casilla evita el error de
       poner 30 manzanas, que es exactamente el que se cometería. */
    function ajustarSuelto() {
      var sel = $("#suelto-ing");
      var op = sel.options[sel.selectedIndex];
      var u = op.getAttribute("data-u");
      var peso = parseFloat(op.getAttribute("data-peso")) || 0;
      $("#suelto-uni").textContent = u === "ud" ? (peso ? "ud (" + peso + " g)" : "ud") : u;
      var c = $("#suelto-cant");
      c.step = u === "ud" ? "0.25" : "5";
      c.value = u === "ud" ? 1 : 30;
    }
    $("#suelto-ing").addEventListener("change", ajustarSuelto);

    /* Ciento ochenta y dos opciones en un desplegable de móvil son muchas.
       Se escriben tres letras y se queda lo que las lleve; al quedar uno solo,
       se selecciona él, que es lo que uno espera. */
    $("#suelto-buscar").addEventListener("input", function (e) {
      var q = sinTildes(e.target.value.trim().toLowerCase());
      var sel = $("#suelto-ing"), visibles = [];
      Array.prototype.forEach.call(sel.options, function (o) {
        var vale = !q || sinTildes(o.textContent.toLowerCase()).indexOf(q) >= 0;
        o.hidden = !vale;
        if (vale) visibles.push(o);
      });
      if (visibles.length && (sel.selectedIndex < 0 || sel.options[sel.selectedIndex].hidden)) {
        sel.value = visibles[0].value;
        ajustarSuelto();
      }
    });
    ajustarSuelto();

    function meter(idReceta) {
      var dia = Almacen.asegurarDia(fecha);
      var estabaVacia = !(dia[toma] || []).length;
      dia[toma].push(idReceta);
      /* si lo vuelves a poner tú, ya no está quitado */
      Almacen.olvidarQuitado(fecha, toma, idReceta);
      if (estabaVacia) Almacen.ponerFijos(fecha);
      Almacen.tocarDia(fecha);
      Almacen.guardar("plato");
      cerrarModal();
      pintarMenu();
    }

    $("#suelto-add").addEventListener("click", function () {
      var id = Almacen.crearSuelto($("#suelto-ing").value,
                                   parseFloat($("#suelto-cant").value), [toma]);
      if (!id) { Util.toast("Pon una cantidad"); return; }
      meter(id);
    });

    $("#lista-selector").addEventListener("click", function (e) {
      /* Un producto de la despensa entra como \u00abingrediente solo\u00bb con la cantidad
         que quede libre, hasta su raci\u00f3n. */
      var casa = e.target.closest("[data-casa]");
      if (casa) {
        var par = casa.getAttribute("data-casa").split("|");
        var idc = Almacen.crearSuelto(par[0], parseFloat(par[1]), [toma]);
        if (idc) meter(idc);
        return;
      }
      var b = e.target.closest("[data-elegir]");
      if (!b) return;
      /* Si la toma estaba VACÍA, es que está montando esa comida desde cero, así que
         el yogur y el pan entran con el plato. Si ya había algo, no se tocan: puede
         que los haya quitado él a propósito y resucitarlos sería pelearse con él.
         (Eso lo hace `meter`, que comparten los dos caminos.) */
      meter(b.getAttribute("data-elegir"));
    });
  }

  /* EL SELECTOR DE CAPRICHOS.
     Dos caminos en la misma ventana, y ése es el punto: arriba, escribir uno
     nuevo con su nombre y sus calorías; abajo, los que ya has apuntado alguna
     vez, que el recetario ha ido guardando solo. La primera vez que te tomas un
     helado lo escribes; la segunda ya está en la lista. */
  /* ORDENAR LOS CAPRICHOS (22-sep-2026, Carlos): «los caprichos que has puesto
     de esos productos, sácalos de ahí y ponlos como ingredientes sueltos en
     meriendas y almuerzos».

     Tenía razón: unos pistachos o una manzana no son un capricho. El capricho
     es lo que te comes fuera del plan y por eso NO se compra; esto se
     planifica y hay que comprarlo. El fallo fue de diseño, no suyo: hasta hoy
     el único sitio donde se podía apuntar algo sin receta era Caprichos.

     Y se arregla en UNA pantalla, no uno a uno: la app propone a qué
     ingrediente se parece cada nombre y con qué cantidad, él corrige lo que
     esté mal y le da una vez a aplicar. Lo que no encuentre ingrediente se
     queda como capricho y no molesta. */
  function abrirOrdenarCaprichos(volverA) {
    var caps = Almacen.visibles()
      .filter(function (r) { return r.grupo === "capricho"; })
      .sort(function (a, b) { return a.n.localeCompare(b.n); });

    var html = '<header><h2>Ordenar los caprichos</h2>' +
               '<button class="cerrar" data-cerrar>×</button></header>';
    if (!caps.length) {
      html += '<p class="nota-modal">No tienes ninguno apuntado.</p>';
      abrirModal(html);
      return;
    }
    html += '<p class="nota-modal">Lo que de verdad sea un ingrediente —unos ' +
            'pistachos, una manzana— pasa a almuerzos y meriendas, cuenta ' +
            'proteína y macros, y entra en la lista de la compra. Lo que sea ' +
            'un capricho de verdad déjalo como está.</p>';

    var opciones = Almacen.estado.ingredientes.slice()
      .sort(function (a, b) { return a.n.localeCompare(b.n); });

    html += '<div class="ordenar-caps">';
    caps.forEach(function (r) {
      var sug = Almacen.pareceIngrediente(r.n);
      var g = sug ? Almacen.ingrediente(sug) : null;
      var kcal = Almacen.nutrReceta(r).k;
      /* La cantidad que se propone sale de las calorías que él escribió en su
         día: si apuntó «Pistachos 180 kcal» y el pistacho tiene 560 por 100 g,
         eran 32 g. Es mejor punto de partida que un 30 fijo, y él lo ve. */
      var cant = 1;
      if (g) {
        if (g.u === "ud") cant = 1;
        else if (kcal > 0 && g.k > 0) cant = Math.max(5, Math.round(kcal / g.k * 100 / 5) * 5);
        else cant = 30;
      }
      html += '<div class="fila-cap" data-id="' + esc(r.id) + '">' +
                '<div class="quien"><b>' + esc(r.n) + '</b>' +
                  '<small>' + Util.kcal(kcal) + '</small></div>' +
                '<select class="cap-ing">' +
                  '<option value="">Sigue siendo un capricho</option>' +
                  '<option value="__nuevo">\u2795 No est\u00e1 en mi despensa: crearlo\u2026</option>' +
                  opciones.map(function (x) {
                    return '<option value="' + esc(x.id) + '" data-u="' + esc(x.u) + '"' +
                           ' data-peso="' + (x.pesoUd || 0) + '"' +
                           (x.id === sug ? " selected" : "") + '>' + esc(x.n) + '</option>';
                  }).join("") +
                '</select>' +
                '<input type="number" class="cap-cant" min="0" step="1" value="' + cant + '">' +
                '<span class="cap-uni">' + (g ? (g.u === "ud" ? "ud" : g.u) : "") + '</span>' +
              '</div>';
    });
    html += '</div>';
    html += '<div class="fila"><button class="btn principal" id="cap-aplicar">' +
            'Pasar los marcados a ingredientes</button>' +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    abrirModal(html);

    $$(".fila-cap .cap-ing").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var fila = sel.closest(".fila-cap");
        if (sel.value === "__nuevo") {
          /* Se sale a crear el ingrediente y se vuelve aquí con él ya elegido.
             Lo que estuviera marcado en las demás filas se vuelve a proponer
             solo, que es de donde salía. */
          var nom = fila.querySelector(".quien b").textContent;
          abrirIngrediente(null, nom, function () { abrirOrdenarCaprichos(volverA); });
          return;
        }
        var op = sel.options[sel.selectedIndex];
        var u = op.getAttribute("data-u") || "";
        var peso = parseFloat(op.getAttribute("data-peso")) || 0;
        fila.querySelector(".cap-uni").textContent =
          !sel.value ? "" : (u === "ud" ? (peso ? "ud (" + peso + " g)" : "ud") : u);
        var c = fila.querySelector(".cap-cant");
        if (sel.value) c.value = u === "ud" ? 1 : 30;
      });
    });

    $("#cap-aplicar").addEventListener("click", function () {
      var hechos = 0;
      $$(".fila-cap").forEach(function (fila) {
        var idIng = fila.querySelector(".cap-ing").value;
        if (!idIng || idIng === "__nuevo") return;
        var cant = parseFloat(fila.querySelector(".cap-cant").value);
        if (Almacen.pasarASuelto(fila.getAttribute("data-id"), idIng, cant)) hechos++;
      });
      cerrarModal();
      pintarMenu(); pintarRecetas(); pintarCompra();
      Util.toast(hechos
        ? hechos + (hechos === 1 ? " ha pasado" : " han pasado") + " a ingredientes solos"
        : "No has marcado ninguno");
      if (volverA) abrirSelectorCapricho(volverA);
    });
  }

  function abrirSelectorCapricho(fecha) {
    function pinta() {
      var previos = Almacen.visibles()
        .filter(function (r) { return r.grupo === "capricho"; })
        .sort(function (a, b) { return a.n.localeCompare(b.n); });
      var otras = Almacen.visibles()
        .filter(function (r) { return r.grupo !== "capricho"; })
        .sort(function (a, b) { return a.n.localeCompare(b.n); });

      var html = '<header><h2>A\u00f1adir un capricho</h2>' +
                 '<button class="cerrar" data-cerrar>\u00d7</button></header>';
      html += '<p class="nota-modal">Lo que te comiste sin que estuviera en el plan. ' +
              'Se apunta como comido: no hace falta marcarlo despu\u00e9s.</p>';
      if (previos.length) {
        html += '<p class="nota-modal reordenar">\u00bfAlguno de \u00e9stos no es un capricho, ' +
                'sino algo que planificas y compras? ' +
                '<button class="enlace" id="cap-ordenar">Ordenarlos</button></p>';
      }
      html += '<div class="nuevo-capricho">' +
                '<input type="text" id="cap-nombre" placeholder="Helado de la playa" maxlength="46">' +
                '<input type="number" id="cap-kcal" placeholder="kcal" min="1" max="3000" step="10">' +
                '<button class="btn principal mini" id="cap-crear">A\u00f1adir</button>' +
              '</div>';
      /* LOS PRODUCTOS, QUE ES LO QUE SE APUNTA AQUÍ (23-sep-2026, Carlos:
         «voy a meter un capricho y no encuentro las pizzas… solo me presenta el
         recetario, no los ingredientes»).
         Tenía razón y era un fallo de verdad. El 22-sep los caprichos dejaron de
         ser recetas y pasaron a ser ingredientes, pero este selector se quedó
         ofreciendo sólo recetas: desde entonces no había forma de apuntar una
         pizza, un Whopper o un helado. Se le pone el mismo buscador que tienen
         las tomas, con una mejora: la cantidad viene ya puesta con la ración de
         la ficha, así que una pizza entra como media pizza sin teclear nada. */
      html += '<p class="nota-modal">Un producto: la pizza, el helado, lo del bar. ' +
              'Escribe para buscarlo; la cantidad viene puesta con tu ración.</p>';
      html += '<div class="nuevo-suelto" style="margin-bottom:10px">' +
                '<input type="text" id="capsu-buscar" placeholder="Buscar producto\u2026" ' +
                  'style="flex:1 1 100%; margin-bottom:6px">' +
                '<select id="capsu-ing">' +
                Almacen.estado.ingredientes.filter(function (g) { return !g.oculta; })
                  .sort(function (a, b) { return a.n.localeCompare(b.n); })
                  .map(function (g) {
                    return '<option value="' + esc(g.id) + '" data-u="' + esc(g.u) + '"' +
                           ' data-peso="' + (g.pesoUd || 0) + '" data-racion="' + (g.racion || 0) + '"' +
                           ' data-txt="' + esc(g.racionTexto || "") + '">' + esc(g.n) + '</option>';
                  }).join("") +
                '</select>' +
                '<input type="number" id="capsu-cant" step="0.25" min="0" value="1">' +
                '<span id="capsu-uni">ud</span>' +
                '<button class="btn principal mini" id="capsu-add">A\u00f1adir</button>' +
              '</div>';
      html += '<input type="text" id="filtro-selector" placeholder="Filtrar\u2026">';
      html += '<div class="lista-selec" id="lista-caprichos">';
      function boton(r) {
        var n = Almacen.nutrReceta(r);
        return '<button data-cap="' + esc(r.id) + '" data-nombre="' + esc(r.n.toLowerCase()) + '">' +
               esc(r.n) + '<small>' + Util.kcal(n.k) + '</small></button>';
      }
      if (previos.length) {
        html += '<p class="separador-selec" data-nombre="">Caprichos que ya has apuntado</p>';
        previos.forEach(function (r) { html += boton(r); });
      }
      html += '<p class="separador-selec" data-nombre="">Del recetario</p>';
      otras.forEach(function (r) { html += boton(r); });
      html += '</div>';
      abrirModal(html);

      $("#filtro-selector").addEventListener("input", function (e) {
        var q = e.target.value.toLowerCase();
        $$("#lista-caprichos button").forEach(function (b) {
          b.style.display = b.getAttribute("data-nombre").indexOf(q) >= 0 ? "" : "none";
        });
      });

      function meter(rid) {
        if (!rid) return;
        var dia = Almacen.asegurarDia(fecha);
        dia.capricho.push(rid);
        Almacen.tocarDia(fecha);
        Almacen.guardar("capricho");
        cerrarModal();
        pintarMenu();
      }

      var bo = $("#cap-ordenar");
      if (bo) bo.addEventListener("click", function () { abrirOrdenarCaprichos(fecha); });

      $("#cap-crear").addEventListener("click", function () {
        var nom = $("#cap-nombre").value, k = $("#cap-kcal").value;
        if (!String(nom).trim() || !(Number(k) > 0)) {
          Util.toast("Hace falta un nombre y las calor\u00edas");
          return;
        }
        var id = Almacen.crearCapricho(nom, k);
        if (!id) { Util.toast("No he podido crearlo"); return; }
        meter(id);
        Util.toast("Apuntado y guardado en el recetario");
      });

      /* La casilla de cantidad se pone sola con la ración de la ficha: media
         pizza son 170 g y no hay que saberlo de memoria. */
      function ajustarCapsu() {
        var sel = $("#capsu-ing"), op = sel.options[sel.selectedIndex];
        if (!op) return;
        var u = op.getAttribute("data-u"),
            peso = parseFloat(op.getAttribute("data-peso")) || 0,
            rac  = parseFloat(op.getAttribute("data-racion")) || 0,
            txt  = op.getAttribute("data-txt") || "";
        $("#capsu-uni").textContent = (u === "ud" ? (peso ? "ud (" + peso + " g)" : "ud") : u) +
                                      (txt ? " \u00b7 " + txt : "");
        var c = $("#capsu-cant");
        c.step  = u === "ud" ? "0.25" : "5";
        c.value = rac || (u === "ud" ? 1 : 30);
      }
      $("#capsu-ing").addEventListener("change", ajustarCapsu);
      ajustarCapsu();

      $("#capsu-buscar").addEventListener("input", function (e) {
        var q = sinTildes(e.target.value.trim().toLowerCase());
        var sel = $("#capsu-ing"), visibles = [];
        Array.prototype.forEach.call(sel.options, function (o) {
          var vale = !q || sinTildes(o.textContent.toLowerCase()).indexOf(q) >= 0;
          o.hidden = !vale;
          if (vale) visibles.push(o);
        });
        if (visibles.length && (sel.selectedIndex < 0 || sel.options[sel.selectedIndex].hidden)) {
          sel.value = visibles[0].value;
          ajustarCapsu();
        }
      });

      $("#capsu-add").addEventListener("click", function () {
        var cant = parseFloat(String($("#capsu-cant").value).replace(",", "."));
        var id = Almacen.crearSuelto($("#capsu-ing").value, cant);
        if (!id) { Util.toast("Pon una cantidad"); return; }
        meter(id);
      });

      $("#lista-caprichos").addEventListener("click", function (e) {
        var b = e.target.closest("[data-cap]");
        if (b) meter(b.getAttribute("data-cap"));
      });
    }
    pinta();
  }

  /* VACIAR UN DÍA ENTERO, Y PODER VOLVER ATRÁS.
     Lo vaciado se guarda en `dia.guardadoVaciar` hasta que el día vuelva a tener
     algo. No se borra nada del recetario: sólo se sueltan los platos del día. */
  function vaciarDia(fecha) {
    var dia = Almacen.asegurarDia(fecha);
    var guardado = { capricho: (dia.capricho || []).slice() }, cuantos = 0;
    Util.TOMAS.forEach(function (t) { guardado[t.k] = (dia[t.k] || []).slice(); });
    Object.keys(guardado).forEach(function (k) { cuantos += guardado[k].length; });
    if (!cuantos) { Util.toast("Este día ya está vacío"); return; }
    dia.guardadoVaciar = guardado;
    Util.TOMAS.forEach(function (t) { dia[t.k] = []; });
    dia.capricho = [];
    Util.TOMAS.forEach(function (t) { Almacen.marcarVaciada(fecha, t.k, true); });
    Almacen.tocarDia(fecha);
    Almacen.guardar("vaciar");
    pintarMenu();
    Util.toast("Día vaciado: " + cuantos + (cuantos === 1 ? " plato" : " platos") +
               ". Tienes Deshacer al lado de Completar.");
  }

  /* TODOS LOS CAMINOS QUE VACÍAN UNA TOMA PASAN POR AQUÍ (23-sep-2026).
     El primer intento sólo marcó uno de los tres botones que quitan platos, y
     Carlos lo volvió a sufrir: la ✕ de cada plato es `data-quitartodo`, no
     `data-quitar`, y el «−» del contador es un tercero. Si la toma se queda
     vacía por cualquiera de ellos, queda anotado y los fijos no vuelven solos. */
  /* `quitado` es la receta que se acaba de sacar, cuando se sabe cuál. Si es uno
     de los fijos, queda anotado que HOY no lo quieres — que no es lo mismo que
     haber vaciado la toma, y era justo lo que faltaba. */
  function tocarYGuardarToma(fecha, toma, quitado) {
    var d = Almacen.estado.plan[fecha];
    if (quitado) Almacen.quitarFijo(fecha, toma, quitado);
    if (d && !(d[toma] || []).length) Almacen.marcarVaciada(fecha, toma, true);
    Almacen.tocarDia(fecha);
    Almacen.guardar("plato");
    pintarMenu();
  }

  function deshacerVaciado(fecha) {
    var dia = Almacen.asegurarDia(fecha), g = dia.guardadoVaciar;
    if (!g) return;
    Util.TOMAS.forEach(function (t) { dia[t.k] = (g[t.k] || []).slice(); });
    dia.capricho = (g.capricho || []).slice();
    Almacen.olvidarVaciadas(fecha);      /* deshacer devuelve el día tal cual estaba */
    delete dia.guardadoVaciar;
    Almacen.tocarDia(fecha);
    Almacen.guardar("vaciar");
    pintarMenu();
    Util.toast("Devuelto tal y como estaba");
  }

  /* selector de actividad */
  function abrirSelectorActividad(fecha) {
    var peso = Almacen.estado.perfil.peso;
    var html = '<header><h2>Actividad del día</h2><button class="cerrar" data-cerrar>×</button></header>';
    if (!peso) {
      html += '<div class="aviso">Para estimar lo que quemas necesito tu peso. Rellénalo en ' +
              '<b>Ajustes → Tu perfil</b>.</div>';
    }
    html += '<div class="lista-selec" id="lista-actividad">';
    Almacen.estado.actividades.forEach(function (a) {
      var kc = peso ? Math.round(a.met * 3.5 * peso / 200 * a.min) : 0;
      html += '<button data-act="' + esc(a.id) + '" data-min="' + a.min + '">' + esc(a.n) +
              '<small>' + a.min + ' min' + (kc ? ' · unas ' + kc + ' kcal' : '') + '</small></button>';
    });
    html += '</div>';
    html += '<label class="campo" style="margin-top:12px"><span>Minutos (ajústalo antes de elegir)</span>' +
            '<input type="number" id="act-min" min="5" max="300" step="5" placeholder="los de cada actividad"></label>';
    abrirModal(html);

    $("#lista-actividad").addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var min = parseInt($("#act-min").value, 10) || parseInt(b.getAttribute("data-min"), 10);
      Almacen.anadirActividad(fecha, b.getAttribute("data-act"), min);
      cerrarModal();
      pintarMenu();
    });
  }

  /* LA TERCERA FILA: LO QUE HAY QUE COMER CONTRA LO QUE HAY.
     Cambia según el día sea pasado o esté por venir, porque la pregunta no es la
     misma. En un día que ya pasó lo que importa es qué comiste de verdad —lo
     marcado con el ✓ más los caprichos—; en uno que está por venir, lo que hay
     puesto en el menú. Mismo sitio, misma forma, dos preguntas distintas.

     Y la nota de marcar antes de dormir va sólo donde hace falta: en los días ya
     pasados que aún no tienen nada marcado. En los demás sería ruido. */
  function filaCierre(fecha, objetivo, planificado, comido, esPasado) {
    if (!objetivo) return "";
    var hay = esPasado ? comido : planificado;
    var etiqueta = esPasado ? "Ya comido" : "Planificado";
    var dif = Math.round(objetivo - hay);
    var margen = objetivo * (Almacen.estado.config.margenKcal || 10) / 100;
    var cl = dif > margen ? "falta" : (-dif > margen ? "sobra" : "cuadra");
    var aviso = (esPasado && !comido)
      ? '<span class="aviso-marcar">Marcar lo comido al final de la jornada, antes de dormir</span>'
      : "";
    /* LA NOTA CIERRA EL DÍA, y sólo cuando hay día que cerrar: en uno que aún no
       ha pasado no hay nada que puntuar, y en uno pasado sin nada marcado la nota
       sería un cero injusto — ahí lo que toca es el recordatorio de arriba. */
    var nota = "";
    if (esPasado && comido) {
      var n = Almacen.notaDia(fecha);
      if (n) {
        nota = '<div class="nota-dia ' + n.clase + '">' +
                 '<span class="marcador">' + n.signo + '</span>' +
                 '<span class="puntos">' + n.nota + '</span>' +
                 '<span class="porque">' +
                   (n.motivos.length ? esc(n.motivos.join(" \u00b7 ")) : "el d\u00eda cuadr\u00f3") +
                 '</span>' +
               '</div>';
      }
    }
    return '<div class="cierre-dia ' + cl + '">' +
             '<span class="rotulo-cierre">A comer / ' + etiqueta + '</span>' +
             '<span class="cifras"><b>' + Util.kcal(objetivo) + '</b> / <b>' +
               Util.kcal(hay) + '</b></span>' +
             aviso + nota +
           '</div>';
  }

  /* UN MACRO CON SU PORCENTAJE DEL OBJETIVO.
     `aviso` dice por qué lado preocupa cada uno, que no es el mismo para los
     tres: de proteína preocupa quedarse CORTO y pasarse no es problema; de
     grasa e hidratos preocupan los dos lados, porque son el relleno de las
     calorías. Sin esa distinción la proteína saldría en rojo justo los días
     buenos. */
  function macro(letra, hay, meta, aviso) {
    var g = Math.round(hay || 0);
    if (!meta) return '<span><b>' + letra + '</b> ' + g + ' g</span>';
    var p = Math.round(g / meta * 100);
    var cl = "bien";
    if (p < 90) cl = "corto";
    else if (p > 110 && aviso === "ambos") cl = "pasa";
    /* SE ENSEÑA EL OBJETIVO AL LADO, no sólo el porcentaje. Carlos, 21-sep-2026:
       «no entiendo ese cuadro». Un «150 %» suelto no dice de qué, y encima
       invitaba a leerlo como una nota cuando es una proporción. «135/144 g»
       se entiende sin explicación. */
    return '<span><b>' + letra + '</b> ' + g + '<span class="meta">/' + meta +
           ' g</span> <i class="' + cl + '">' + p + '%</i></span>';
  }

  /* La sal es al revés que todo lo demás: aquí el 100 % no es la meta, es el
     techo. Por debajo está bien y cuanto más abajo, mejor. */
  function macroSal(hay, meta) {
    if (!meta) return "";
    var p = Math.round((hay || 0) / meta * 100);
    return '<span><b>Sal</b> ' + Util.sal(hay).replace(" g", "") +
           '<span class="meta">/' + String(meta).replace(".", ",") + ' g</span> ' +
           '<i class="' + (p > 100 ? "pasa" : "bien") + '">' + p + '%</i></span>';
  }

  /* LO QUE FALTA O LO QUE SOBRA, EN LA CABECERA DEL DÍA.
     Pedido de Carlos el 21-sep-2026: «la diferencia entre las calorías que tengo
     que comer y las que tengo programadas; si me faltan que esté en morado y si
     me sobran que esté en rojo».

     Compara el objetivo con lo PROGRAMADO, no con lo comido: es un aviso para
     terminar de montar el día, no una nota de lo que hiciste — eso va al cierre.

     Dentro del margen de holgura no dice ni una cosa ni la otra: dice que cuadra.
     Sin ese margen cualquier día saldría en morado por doce calorías, y un aviso
     que salta siempre deja de ser un aviso. */
  function chipDiferencia(objetivo, programado, tieneAlgo) {
    if (!tieneAlgo || !objetivo) return "";
    var dif = Math.round(objetivo - programado);
    var margen = objetivo * (Almacen.estado.config.margenKcal || 10) / 100;
    if (dif > margen)  return '<span class="chip-sal falta">faltan ' + Util.kcal(dif) + '</span>';
    if (-dif > margen) return '<span class="chip-sal sobra">sobran ' + Util.kcal(-dif) + '</span>';
    return '<span class="chip-sal verde">cuadra</span>';
  }

  /* ==================== IMPORTAR DE GARMIN ==================== */
  /* Acepta los ficheros que Garmin Connect deja exportar de cada actividad:
     .tcx (trae calorías medidas), .gpx (sin calorías) y el .csv del historial. */

  var DEPORTES = {
    "running": "Carrera", "run": "Carrera", "walking": "Caminar", "walk": "Caminar",
    "hiking": "Senderismo", "biking": "Bici", "cycling": "Bici", "indoor_cycling": "Bici indoor",
    "virtual_ride": "Bici indoor", "strength_training": "Musculación", "training": "Entrenamiento",
    "fitness_equipment": "Máquinas", "cardio": "Cardio", "swimming": "Natación",
    "elliptical": "Elíptica", "rowing": "Remo", "yoga": "Yoga", "other": "Actividad"
  };

  function nombreDeporte(s) {
    if (!s) return "Actividad";
    var k = String(s).toLowerCase().replace(/\s+/g, "_");
    if (DEPORTES[k]) return DEPORTES[k];
    return String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase();
  }

  /* id de actividad de nuestro catálogo que más se parece, para cuando no haya calorías */
  function actividadParecida(nombre) {
    var n = (nombre || "").toLowerCase();
    if (n.indexOf("bici") >= 0 || n.indexOf("cicl") >= 0 || n.indexOf("cycl") >= 0) return "bici_moderada";
    if (n.indexOf("camin") >= 0 || n.indexOf("walk") >= 0 || n.indexOf("sender") >= 0) return "caminar_ligero";
    if (n.indexOf("fuerza") >= 0 || n.indexOf("muscul") >= 0 || n.indexOf("strength") >= 0) return "musculacion";
    if (n.indexOf("nata") >= 0 || n.indexOf("swim") >= 0) return "natacion";
    return "otra";
  }

  function leerTCX(texto, nombreFichero) {
    var doc = new DOMParser().parseFromString(texto, "application/xml");
    if (doc.querySelector("parsererror")) return [];
    var salida = [];
    var actividades = doc.getElementsByTagName("Activity");
    for (var i = 0; i < actividades.length; i++) {
      var act = actividades[i];
      var idEl = act.getElementsByTagName("Id")[0];
      var fechaISO = idEl ? (idEl.textContent || "").slice(0, 10) : "";
      var seg = 0, kcal = 0;
      var laps = act.getElementsByTagName("Lap");
      for (var j = 0; j < laps.length; j++) {
        var t = laps[j].getElementsByTagName("TotalTimeSeconds")[0];
        var c = laps[j].getElementsByTagName("Calories")[0];
        if (t) seg += parseFloat(t.textContent) || 0;
        if (c) kcal += parseFloat(c.textContent) || 0;
      }
      if (!fechaISO) continue;
      salida.push({
        fecha: fechaISO,
        n: nombreDeporte(act.getAttribute("Sport")),
        min: Math.round(seg / 60),
        kcal: Math.round(kcal),
        ref: nombreFichero + "|" + fechaISO + "|" + Math.round(seg)
      });
    }
    return salida;
  }

  /* CSV del historial de Garmin Connect (cabeceras en español o inglés) */
  function leerCSV(texto, nombreFichero) {
    var lineas = texto.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lineas.length < 2) return [];
    var parte = function (l) {
      var out = [], cur = "", dentro = false;
      for (var i = 0; i < l.length; i++) {
        var ch = l[i];
        if (ch === '"') { dentro = !dentro; continue; }
        if (ch === "," && !dentro) { out.push(cur); cur = ""; continue; }
        cur += ch;
      }
      out.push(cur);
      return out.map(function (x) { return x.trim(); });
    };
    var cab = parte(lineas[0]).map(function (c) { return c.toLowerCase(); });
    var busca = function (nombres) {
      for (var i = 0; i < cab.length; i++)
        for (var j = 0; j < nombres.length; j++)
          if (cab[i].indexOf(nombres[j]) >= 0) return i;
      return -1;
    };
    var iFecha = busca(["fecha", "date"]);
    var iTipo = busca(["tipo de actividad", "activity type", "tipo"]);
    var iTiempo = busca(["tiempo", "time", "duración", "duration"]);
    var iKcal = busca(["calorías", "calorias", "calories"]);
    if (iFecha < 0) return [];

    var salida = [];
    for (var k = 1; k < lineas.length; k++) {
      var f = parte(lineas[k]);
      var crudo = f[iFecha] || "";
      var fecha = "";
      var m = crudo.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) fecha = m[0];
      else {
        m = crudo.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);   // dd/mm/aaaa
        if (m) fecha = m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
      }
      if (!fecha) continue;

      var min = 0;
      var t = (f[iTiempo] || "").replace(",", ".");
      var hms = t.match(/(\d+):(\d+):(\d+)/);
      if (hms) min = Math.round(+hms[1] * 60 + +hms[2] + (+hms[3]) / 60);
      else { var ms = t.match(/^(\d+):(\d+)$/); if (ms) min = Math.round(+ms[1] + (+ms[2]) / 60); }

      var kcal = parseFloat((f[iKcal] || "0").replace(/\./g, "").replace(",", ".")) || 0;
      salida.push({
        fecha: fecha, n: nombreDeporte(f[iTipo]), min: min, kcal: Math.round(kcal),
        ref: nombreFichero + "|" + fecha + "|" + min + "|" + Math.round(kcal)
      });
    }
    return salida;
  }

  function importarGarmin(ficheros) {
    var pendientes = ficheros.length, encontradas = [], fallos = [];
    if (!pendientes) return;

    Array.prototype.forEach.call(ficheros, function (f) {
      var lector = new FileReader();
      lector.onload = function () {
        var texto = String(lector.result);
        var bajo = f.name.toLowerCase();
        var res = [];
        try {
          if (bajo.endsWith(".tcx") || texto.indexOf("<TrainingCenterDatabase") >= 0) res = leerTCX(texto, f.name);
          else if (bajo.endsWith(".csv")) res = leerCSV(texto, f.name);
          else if (bajo.endsWith(".gpx")) fallos.push(f.name + ": los GPX no traen calorías, exporta el TCX");
          else if (bajo.endsWith(".fit")) fallos.push(f.name + ": el formato FIT no se puede leer aquí, exporta el TCX");
          else fallos.push(f.name + ": no reconozco este formato");
        } catch (e) { fallos.push(f.name + ": no he podido leerlo"); }
        if (res.length) encontradas = encontradas.concat(res);
        else if (bajo.endsWith(".tcx") || bajo.endsWith(".csv")) fallos.push(f.name + ": no he encontrado actividades dentro");
        if (--pendientes === 0) revisarImportacion(encontradas, fallos);
      };
      lector.onerror = function () {
        fallos.push(f.name + ": no he podido abrirlo");
        if (--pendientes === 0) revisarImportacion(encontradas, fallos);
      };
      lector.readAsText(f);
    });
  }

  var importPendiente = [];

  function revisarImportacion(lista, fallos) {
    lista.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    importPendiente = lista;

    var html = '<header><h2>Actividades de Garmin</h2><button class="cerrar" data-cerrar>×</button></header>';
    if (fallos.length) {
      html += '<div class="aviso" style="background:var(--ambar-fondo); border-color:#eedcb8">' +
              fallos.map(esc).join("<br>") + '</div>';
    }
    if (!lista.length) {
      html += '<div class="vacio">No he sacado ninguna actividad de esos ficheros.</div>';
      abrirModal(html);
      return;
    }
    html += '<p class="nota-peque">Marca las que quieras añadir. Las calorías son las que midió tu reloj.</p>';
    html += '<ul class="ingredientes" id="lista-import">';
    lista.forEach(function (x, i) {
      var repetida = Almacen.yaImportada(x.fecha, x.ref);
      html += '<li><label style="display:flex; gap:8px; align-items:center; width:100%; cursor:pointer">' +
              '<input type="checkbox" data-imp="' + i + '"' + (repetida ? "" : " checked") + '>' +
              '<span style="flex:1">' + esc(x.n) + '<br><span class="nota-peque">' +
              Util.etiquetaFecha(x.fecha) + ' · ' + x.min + ' min' +
              (x.kcal ? ' · <b>' + x.kcal + ' kcal</b>' : ' · sin calorías: se estimarán') +
              (repetida ? ' · <b>ya estaba importada</b>' : '') +
              '</span></span></label></li>';
    });
    html += '</ul>';
    html += '<div class="fila"><button class="btn principal" id="imp-anadir">Añadir las marcadas</button>' +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    abrirModal(html);

    $("#imp-anadir").addEventListener("click", function () {
      var n = 0;
      $$("#lista-import [data-imp]").forEach(function (chk) {
        if (!chk.checked) return;
        var x = importPendiente[+chk.getAttribute("data-imp")];
        Almacen.anadirActividad(x.fecha, actividadParecida(x.n), x.min,
          { kcal: x.kcal, n: x.n, fuente: "garmin", ref: x.ref });
        n++;
      });
      cerrarModal();
      pintarMenu();
      Util.toast(n === 1 ? "1 actividad añadida" : n + " actividades añadidas");
    });
  }

  /* ==================== FICHA DE RECETA ==================== */
  /* Si se abre desde un plato del menú llegan `fecha` y `toma`, y entonces las
     cantidades se enseñan PARA LOS QUE COMEN ESE DÍA. Antes salían siempre las de la
     receta base —normalmente una ración— y cocinando con esas cifras sales corto.
     El factor es el mismo que usa la lista de la compra: comensales / raciones.
     Las kcal y la sal siguen siendo POR RACIÓN, que es lo que te comes tú. */
  function abrirFicha(id, fecha, toma) {
    var r = Almacen.receta(id);
    if (!r) return;
    var salRacion = Almacen.salReceta(r);
    var n = Almacen.nutrReceta(r);

    var personas = (fecha && toma) ? Almacen.comensales(fecha, toma) : 0;
    var base = r.raciones || 1;
    /* Las recetas de TANDA se cocinan enteras y se reparten en porciones: escalarlas
       por comensales no tiene sentido. */
    var factor = (personas && !r.tanda) ? personas / base : 1;
    var escalada = factor !== 1;

    var html = '<header><h2>' + esc(r.n) + '</h2><button class="cerrar" data-cerrar>×</button></header>';
    html += '<div class="etiquetas">' +
            '<span class="etiqueta verde">' + Util.kcal(n.k) + ' / ración</span>' +
            '<span class="etiqueta verde">' + Util.sal(salRacion) + ' de sal / ración</span>' +
            '<span class="etiqueta' + (escalada ? ' raro' : '') + '">' +
              (escalada ? 'cantidades para ' + personas : base + ' ración(es)') + '</span>' +
            '<span class="etiqueta">' + (r.min || "?") + ' min</span>' +
            (r.grupo ? '<span class="etiqueta">' + esc(NOMBRE_GRUPO[r.grupo] || r.grupo) + '</span>' : '') +
            etiquetasTool(r.tools) +
            '</div>';

    html += '<div class="nutri-ficha">' +
            '<div><b>' + Math.round(n.p) + ' g</b><span>proteína</span></div>' +
            '<div><b>' + Math.round(n.g) + ' g</b><span>grasa</span></div>' +
            '<div><b>' + Math.round(n.h) + ' g</b><span>hidratos</span></div>' +
            '<div><b>' + Util.kcal(n.k).replace(" kcal", "") + '</b><span>kcal</span></div>' +
            '</div>';

    html += '<h3 style="margin-top:16px">Ingredientes</h3>';
    if (escalada) {
      html += '<div class="nota-peque">Cantidades para ' + personas + ' comensal' +
              (personas === 1 ? '' : 'es') + ' — ' + Util.etiquetaFecha(fecha) + ' · ' + toma +
              '. La receta base es de ' + base + ' ración' + (base === 1 ? '' : 'es') + '.</div>';
    } else if (personas && r.tanda) {
      html += '<div class="nota-peque">Receta de tanda: las cantidades son las de la tanda ' +
              'entera, no las de una comida.</div>';
    }
    html += '<ul class="ingredientes">';
    (r.ing || []).forEach(function (l) {
      var ing = Almacen.ingrediente(l.i);
      var linea = escalada ? { i: l.i, c: l.c * factor } : l;
      var gr = Almacen.gramosDeLinea(linea) / 100;
      var kc = ing ? Math.round(gr * (ing.k || 0)) : 0;
      html += '<li><span>' + esc(ing ? ing.n : l.i) + '</span><span>' +
              Util.cantidadReceta(linea.c, ing ? ing.u : "g", ing ? ing.pesoUd : 0) +
              (kc ? ' <em class="nota-peque">· ' + kc + ' kcal</em>' : '') + '</span></li>';
    });
    html += '</ul>';

    /* Los pasos pueden ser texto llano o llevar minuto del reloj: {min, t, d}.
       Los que llevan minuto se pintan como un guion, para poder seguirlo cocinando. */
    html += '<h3>Elaboración</h3>';
    var enGuion = false;
    (r.pasos || []).forEach(function (p) {
      var conReloj = p && typeof p === "object" && typeof p.min === "number";
      if (conReloj && !enGuion) { html += '<ol class="guion">'; enGuion = true; }
      if (!conReloj && enGuion) { html += '</ol>'; enGuion = false; }
      if (conReloj) {
        html += '<li><span class="reloj">' + p.min + "'" + '</span><div>' +
                '<b>' + esc(p.t || "") + '</b>' +
                (p.d ? '<span class="nota-peque">' + esc(p.d) + '</span>' : '') +
                '</div></li>';
      } else {
        html += '<p class="paso-suelto">' + esc(typeof p === "string" ? p : (p && p.t) || "") + '</p>';
      }
    });
    if (enGuion) html += '</ol>';

    if ((r.trucos || []).length) {
      html += '<h3>Para que salga bien</h3><ul class="trucos">';
      (r.trucos || []).forEach(function (t) { html += '<li>' + esc(t) + '</li>'; });
      html += '</ul>';
    }

    if (r.nota) html += '<div class="aviso">' + esc(r.nota) + '</div>';

    html += '<div class="fila solo-edicion" style="margin-top:14px">' +
            '<button class="btn principal" data-editar="' + esc(r.id) + '">Editar</button>' +
            '<button class="btn" data-duplicar="' + esc(r.id) + '">Duplicar</button>' +
            '<button class="btn" data-borrar="' + esc(r.id) + '">Borrar</button>' +
            '</div>';
    abrirModal(html);
  }

  /* ==================== EDITOR DE RECETA ==================== */
  function abrirEditor(id) {
    var r = id ? JSON.parse(JSON.stringify(Almacen.receta(id))) : {
      id: "", n: "", tipo: ["comida"], grupo: "carne-blanca", raciones: 1, min: 15, tools: [], ing: [], pasos: [], nota: ""
    };
    var lineas = (r.ing || []).map(function (l) {
      var ing = Almacen.ingrediente(l.i);
      return (ing ? ing.id : l.i) + " | " + l.c;
    }).join("\n");

    var opcionesIng = Almacen.estado.ingredientes.map(function (i) {
      return '<option value="' + esc(i.id) + '">' + esc(i.n) + ' (' + i.u + ')</option>';
    }).join("");

    var html = '<header><h2>' + (id ? "Editar receta" : "Nueva receta") + '</h2><button class="cerrar" data-cerrar>×</button></header>';
    html += '<label class="campo"><span>Nombre</span><input type="text" id="ed-n" value="' + esc(r.n) + '"></label>';
    html += '<div class="fila">' +
            '<label class="campo" style="flex:1"><span>Raciones</span><input type="number" id="ed-rac" min="1" max="8" value="' + (r.raciones || 1) + '"></label>' +
            '<label class="campo" style="flex:1"><span>Minutos</span><input type="number" id="ed-min" min="1" max="240" value="' + (r.min || 15) + '"></label>' +
            '</div>';
    html += '<label class="campo"><span>Grupo</span><select id="ed-grupo">' +
            Object.keys(NOMBRE_GRUPO).map(function (g) {
              return '<option value="' + g + '"' + (r.grupo === g ? " selected" : "") + '>' + NOMBRE_GRUPO[g] + '</option>';
            }).join("") + '</select></label>';
    html += '<label class="campo"><span>Tomas (marca las que valgan)</span><div class="fila">' +
            ["desayuno", "almuerzo", "comida", "merienda", "cena", "guarnicion", "postre", "capricho"].map(function (t) {
              return '<label style="font-size:.85rem"><input type="checkbox" class="ed-tipo" value="' + t + '"' +
                     ((r.tipo || []).indexOf(t) >= 0 ? " checked" : "") + '> ' + t + '</label>';
            }).join(" ") + '</div></label>';
    html += '<label class="campo"><span>Herramientas</span><div class="fila">' +
            Object.keys(NOMBRE_TOOL).sort(function (a, b) {
              return (ORDEN_TOOL[a] || 9) - (ORDEN_TOOL[b] || 9);
            }).map(function (t) {
              return '<label style="font-size:.85rem"><input type="checkbox" class="ed-tool" value="' + t + '"' +
                     ((r.tools || []).indexOf(t) >= 0 ? " checked" : "") + '> ' + NOMBRE_TOOL[t] + '</label>';
            }).join(" ") + '</div></label>';

    html += '<label class="campo"><span>Ingredientes — una línea por ingrediente: <em>identificador | cantidad</em></span>' +
            '<textarea id="ed-ing" class="salida" style="min-height:150px">' + esc(lineas) + '</textarea></label>';
    html += '<label class="campo"><span>Añadir ingrediente del catálogo</span><select id="ed-ayuda"><option value="">— elige para insertar la línea —</option>' + opcionesIng + '</select></label>';
    var textoPasos = (r.pasos || []).map(function (p) {
      if (typeof p === "string") return p;
      if (!p) return "";
      return (typeof p.min === "number" ? p.min + " · " : "") + (p.t || "") + (p.d ? " :: " + p.d : "");
    }).join("\n");
    html += '<label class="campo"><span>Pasos (uno por línea). Para un paso con minuto del reloj: ' +
            '<em>12 · lo que hay que hacer :: por qué</em></span>' +
            '<textarea id="ed-pasos" style="min-height:160px">' + esc(textoPasos) + '</textarea></label>';
    html += '<label class="campo"><span>Para que salga bien (un truco por línea)</span>' +
            '<textarea id="ed-trucos" style="min-height:90px">' + esc((r.trucos || []).join("\n")) + '</textarea></label>';
    html += '<label class="campo"><span>Nota</span><input type="text" id="ed-nota" value="' + esc(r.nota || "") + '"></label>';
    html += '<div class="fila"><button class="btn principal" id="ed-guardar">Guardar receta</button>' +
            '<button class="btn" data-cerrar>Cancelar</button></div>';

    abrirModal(html);

    $("#ed-ayuda").addEventListener("change", function (e) {
      if (!e.target.value) return;
      var ta = $("#ed-ing");
      ta.value = (ta.value ? ta.value.replace(/\s*$/, "") + "\n" : "") + e.target.value + " | 100";
      e.target.value = "";
      ta.focus();
    });

    $("#ed-guardar").addEventListener("click", function () {
      var nombre = $("#ed-n").value.trim();
      if (!nombre) { Util.toast("Ponle nombre a la receta"); return; }
      var ing = [];
      $("#ed-ing").value.split("\n").forEach(function (l) {
        l = l.trim(); if (!l) return;
        var p = l.split("|");
        var idIng = (p[0] || "").trim();
        var cant = parseFloat((p[1] || "").replace(",", "."));
        if (!idIng || isNaN(cant)) return;
        ing.push({ i: idIng, c: cant });
      });
      var nueva = {
        id: r.id || ("propia_" + Date.now().toString(36)),
        n: nombre,
        tipo: $$(".ed-tipo").filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
        grupo: $("#ed-grupo").value,
        raciones: parseInt($("#ed-rac").value, 10) || 1,
        min: parseInt($("#ed-min").value, 10) || 15,
        tools: $$(".ed-tool").filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
        ing: ing,
        pasos: $("#ed-pasos").value.split("\n").map(function (s) {
          s = s.trim();
          if (!s) return null;
          var m = s.match(/^(\d{1,3})\s*[·.|-]\s*(.+)$/);      // «12 · haz esto :: porque»
          if (!m) return s;
          var resto = m[2].split("::");
          var paso = { min: parseInt(m[1], 10), t: resto[0].trim() };
          if (resto.length > 1) paso.d = resto.slice(1).join("::").trim();
          return paso;
        }).filter(Boolean),
        trucos: $("#ed-trucos").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
        editado: true,          /* a partir de ahora es tuya: no la piso al actualizar */
        nota: $("#ed-nota").value.trim()
      };
      if (!nueva.tipo.length) nueva.tipo = ["comida"];

      var idx = -1;
      Almacen.estado.recetas.forEach(function (x, i) { if (x.id === nueva.id) idx = i; });
      if (idx >= 0) Almacen.estado.recetas[idx] = nueva; else Almacen.estado.recetas.push(nueva);
      Almacen.guardar("receta");
      cerrarModal();
      pintarRecetas(); pintarMenu();
      Util.toast("Receta guardada");
    });
  }


  /* ══════════════ TRAER UNA RECETA DE UNA IA ══════════════
     Carlos, 22-sep-2026. El editor de recetas pide veinte campos y eso convierte
     añadir un plato en un rato de trabajo. La idea suya es otra: que la app
     redacte el ENCARGO —con su catálogo de ingredientes, sus aparatos y su dieta
     dentro—, él lo pegue en Claude o en Gemini, y vuelva con la respuesta a un
     recuadro. La app la lee y rellena la receta en el formato de la casa.

     Lo que hace que esto funcione no es el prompt: es que el encargo lleve
     DENTRO la lista de identificadores de sus ingredientes. Sin eso la IA
     devuelve «aceite de oliva» y aquí no hay forma de saber cuál de los suyos
     es. Con eso devuelve `aove` y la receta calcula calorías y sal sola.

     Y para lo que no tenga, la IA puede proponer un ingrediente nuevo con sus
     valores por 100 g: se crea en la despensa al guardar, y a partir de ahí ya
     es suyo. */

  /* ==================== EL PERFIL DE COCINA, FUERA DEL CÓDIGO ====================
     `datos/mi-cocina.json` y `datos/mis-gustos.json` no están aquí dentro a
     propósito. El día que esto se le dé a otra persona se cambian esos dos
     ficheros y no se toca una línea de código; si vivieran en el encargo,
     separarlos entonces costaría diez veces más que nacerlos separados.

     Se piden una sola vez, la primera vez que se abre el encargo, y si no
     llegan el encargo se monta igual con lo mínimo — un fallo de red no puede
     dejarle sin poder pedir una receta. */

  var PERFIL = { cocina: null, gustos: null, pedido: null, falta: false };

  function cargarPerfil() {
    if (PERFIL.pedido) return PERFIL.pedido;
    function traer(f) {
      return fetch(f).then(function (r) { return r.ok ? r.json() : null; })
                     .catch(function () { return null; });
    }
    PERFIL.pedido = Promise.all([traer("datos/mi-cocina.json"),
                                 traer("datos/mis-gustos.json")])
      .then(function (x) {
        PERFIL.cocina = x[0]; PERFIL.gustos = x[1];
        PERFIL.falta = !x[0] || !x[1];
        return PERFIL;
      });
    return PERFIL.pedido;
  }

  /* Las fichas de los aparatos se escriben solas desde el JSON: si mañana añade
     un campo al fichero, sale en el encargo sin tocar esto. Lo único que hay
     aquí es cómo se lee cada campo en castellano. */
  var ETIQ_FICHA = {
    capacidad_l: ["capacidad", " l"], cesta: ["cesta", ""],
    potencia_w: ["potencia", " W"], temperatura_max_c: ["temperatura máxima", " °C"],
    resistencia: ["resistencia", ""], rejilla_interior: ["rejilla interior", ""],
    precalienta: ["se precalienta", ""], microondas_w: ["microondas", " W"],
    dora: ["dora", ""]
  };

  function leerFicha(f) {
    var out = [];
    Object.keys(f || {}).forEach(function (k) {
      var e = ETIQ_FICHA[k] || [k.replace(/_/g, " "), ""];
      var v = f[k];
      if (v === true) v = "sí";
      else if (v === false) v = "NO";
      else v = String(v) + e[1];
      out.push(e[0] + " " + v);
    });
    return out.join(", ");
  }

  function bloqueCocina() {
    var c = PERFIL.cocina, t = [];
    if (!c) {
      return ["MI COCINA",
              "  Freidora de aire, Lékué de microondas (vaporera, arrocera, cuecepasta),",
              "  sartén, cazuela y horno. Usa la freidora y los Lékué siempre que se pueda.",
              "  La freidora NO se precalienta y NO tiene rejilla."];
    }
    t.push("MI COCINA — estos son los aparatos que tengo, no hay más, y van en este orden.");
    (c.aparatos || []).slice().sort(function (a, b) {
      return (a.preferencia || 9) - (b.preferencia || 9);
    }).forEach(function (a) {
      t.push("");
      t.push("  " + (a.preferencia || "·") + ". " + a.nombre + " — " + a.tipo);
      var f = leerFicha(a.ficha);
      if (f) t.push("     " + f);
      if (a.como_transmite_el_calor) t.push("     " + a.como_transmite_el_calor);
      if (a.para_que_es_buena) t.push("     Para qué es buena: " + a.para_que_es_buena);
      Object.keys(a.tablas || {}).forEach(function (k) {
        t.push("     " + k.toUpperCase() + ": " + a.tablas[k]);
      });
      (a.prohibiciones || []).forEach(function (p) {
        t.push("     PROHIBIDO: " + p);
      });
    });
    var cr = c.criterio_de_reparto || {};
    var reglas = Object.keys(cr).filter(function (k) { return /^regla/.test(k); });
    if (reglas.length) {
      t.push("");
      t.push("  CÓMO SE REPARTE UN PLATO ENTRE LOS APARATOS");
      reglas.forEach(function (k) { t.push("     · " + cr[k]); });
    }
    if ((cr.se_quedan_en_sarten_a_proposito || []).length) {
      t.push("     · Esto se queda en sartén a propósito, no lo pases a la freidora: " +
             cr.se_quedan_en_sarten_a_proposito.join(", ") + ".");
    }
    if (cr.nota_calamar) t.push("     · " + cr.nota_calamar);

    var cb = c.cabida_de_la_cesta;
    if (cb) {
      t.push("");
      t.push("  CUÁNTO CABE EN LA CESTA DE LA FREIDORA — dilo con números en la receta.");
      if (cb.superficie_util_en_una_capa_cm2) {
        t.push("     Superficie útil en una sola capa: " +
               cb.superficie_util_en_una_capa_cm2 + " cm². " + (cb._nota_superficie || ""));
      }
      (cb.huella_por_100_g || []).forEach(function (h) {
        t.push("     · " + h.alimento + ": " + h.cm2 + " cm² por cada 100 g — caben " +
               h.caben_g + " g.");
      });
      if (cb.lo_que_llena_la_cesta) t.push("     " + cb.lo_que_llena_la_cesta);
      if (cb.capa_unica) t.push("     Capa única: " + cb.capa_unica);
      (cb.cuando_no_quepa || []).forEach(function (x) { t.push("     Si no cabe: " + x); });
      if (cb.limite) {
        t.push("     " + String(cb.limite).replace(/\s*Lo comprueba [^.]*\.?/, "").trim());
      }
    }
    return t;
  }

  function bloqueGustos(topeSal) {
    var g = PERFIL.gustos, t = [];
    if (!g) {
      return ["LO QUE COMO",
              "  Dieta BAJA EN SAL: nunca se añade sal, ni una pizca ni al gusto.",
              "  Tope del día entero: " + String(topeSal).replace(".", ",") + " g de sal."];
    }
    var s = g.sal || {};
    t.push("LA SAL — es la regla que manda por encima de todas.");
    if (s._la_regla_que_manda) t.push("  " + s._la_regla_que_manda);
    t.push("  Tope del día entero: " + String(topeSal).replace(".", ",") + " g de sal" +
           (s.aviso_ambar_g ? " (a partir de " + String(s.aviso_ambar_g).replace(".", ",") +
            " g ya voy justo)" : "") + ". Una cena no debería pasar de 1 g.");
    if (s.filosofia) t.push("  " + s.filosofia);
    t.push("  Nada de caldos de pastilla, conservas saladas, embutido salado ni quesos curados");
    t.push("  salvo que el plato que te he pedido sea precisamente eso.");

    t.push("");
    t.push("LO QUE COMO");
    Object.keys(g.si || {}).forEach(function (k) {
      if (k.charAt(0) === "_") return;
      t.push("  · " + k.replace(/_/g, " ") + ": " + (g.si[k] || []).join(", "));
    });
    var no = g.no || {};
    if ((no.lista || []).length) {
      t.push("");
      t.push("LO QUE NO COMO — " + (no._regla || "no entran en ninguna receta."));
      t.push("  " + no.lista.join(", ") + ".");
    }
    if ((no.flojo || []).length) t.push("  Flojo: " + no.flojo.join(", ") + ".");

    var fj = g.fijos_diarios;
    if (fj) {
      t.push("");
      t.push("LO QUE YA COMO TODOS LOS DÍAS — " + (fj._que_son || ""));
      Object.keys(fj).forEach(function (k) {
        if (k.charAt(0) === "_") return;
        t.push("  · " + fj[k]);
      });
    }

    if ((g.como_quiere_las_instrucciones || []).length) {
      t.push("");
      t.push("CÓMO QUIERO QUE ESTÉN ESCRITAS LAS INSTRUCCIONES");
      g.como_quiere_las_instrucciones.forEach(function (x) { t.push("  · " + x); });
    }
    return t;
  }

  function catalogoParaPrompt() {
    return Almacen.estado.ingredientes.slice()
      .sort(function (a, b) { return (a.cat || "").localeCompare(b.cat || "") || a.n.localeCompare(b.n); })
      /* El peso de la pieza va DENTRO del catálogo a propósito: lo que más
         falla es que la IA ponga «400» de berenjena pensando en gramos cuando
         la berenjena se cuenta por unidades. Si ve «1 ud ≈ 250 g» al lado, lo
         convierte sola. */
      .map(function (i) {
        return "  " + i.id + " = " + i.n + " (" + i.u +
               (i.u === "ud" && i.pesoUd ? ", 1 ud ≈ " + i.pesoUd + " g" : "") + ")";
      })
      .join("\n");
  }

  /* UNA RECETA SUYA, EN EL FORMATO DEL ENCARGO, COMO EJEMPLO.
     Es lo que más hace por que lo que vuelva se parezca a lo que ya hay:
     describir el formato con palabras deja mucho al aire —cuánto detalle lleva
     un paso, si los trucos son una frase o un párrafo—, y una receta real lo
     resuelve de un vistazo. Se coge del recetario en vivo, así que el ejemplo
     envejece con él. */
  function ejemploParaPrompt() {
    var principales = { "carne-roja":1, "carne-blanca":1, "pescado-blanco":1,
                        "pescado-azul":1, "legumbre":1, "pasta-arroz":1, "huevos":1 };
    var buenas = Almacen.visibles().filter(function (r) {
      return (r.ing || []).length >= 4 && (r.pasos || []).length >= 3 &&
             (r.trucos || []).length >= 1 && principales[r.grupo] &&
             (r.raciones || 1) >= 2 && (r.tools || []).length;
    });
    if (!buenas.length) return null;
    /* El que MÁS pasos con porqué tenga: es el que mejor enseña lo que se pide.
       Un desayuno de tres líneas cumpliría el filtro y no enseñaría nada. */
    buenas.sort(function (a, b) {
      function ricos(r) {
        return (r.pasos || []).filter(function (p) { return p && p.d; }).length;
      }
      return ricos(b) - ricos(a) || (b.pasos || []).length - (a.pasos || []).length;
    });
    var r = buenas[0];
    return JSON.stringify({
      n: r.n, grupo: r.grupo, tipo: r.tipo || [], raciones: r.raciones || 2,
      min: r.min || 20, tools: r.tools || [],
      ing: (r.ing || []).map(function (l) { return { i: l.i, c: l.c }; }),
      pasos: (r.pasos || []).map(function (p) {
        if (typeof p === "string") return p;
        return (typeof p.min === "number" ? p.min + " · " : "") + (p.t || "") +
               (p.d ? " :: " + p.d : "");
      }),
      trucos: r.trucos || [], nota: r.nota || ""
    }, null, 1);
  }

  function encargoReceta(plato, detalle, paraGemini) {
    var nom = String(plato || "").trim() || "(escribe aquí el plato que quieres)";
    var det = String(detalle || "").trim();
    var grupos = Object.keys(NOMBRE_GRUPO).filter(function (g) { return g !== "capricho"; }).join(", ");
    var tools = Object.keys(NOMBRE_TOOL).join(", ");
    var c = Almacen.estado.config;
    /* Las calorías que se le cuentan a la IA son las de un DÍA TIPO, sacadas del
       perfil, no el objetivo fijo de fábrica ni el de hoy: el de hoy sube con lo
       que entrenes y haría que la misma receta se pidiera distinta cada día. */
    var sug = Almacen.objetivoSugerido ? Almacen.objetivoSugerido() : null;
    var kDia = (sug && sug.kcal) || c.objetivoKcal || 1800;
    var pDia = c.objetivoProt || (sug && sug.prot) || 144;
    var t = [];
    t.push("Necesito una receta en un formato muy concreto para mi app de menús.");
    t.push("");
    t.push("EL PLATO: " + nom);
    if (det) {
      t.push("");
      t.push("LO QUE QUIERO QUE LLEVE, en mis palabras:");
      t.push("  " + det.split("\n").join("\n  "));
    }
    /* Las raciones las manda `mis-gustos.json`, no el código: el recetario está
       escrito a 1 ración y la compra multiplica aparte por los que sean. */
    var racDef = (PERFIL.gustos && PERFIL.gustos.raciones_por_defecto) || 2;
    var topeSal = parseFloat(c.avisoSal) ||
                  (PERFIL.gustos && PERFIL.gustos.sal && PERFIL.gustos.sal.tope_diario_sal_g) || 4;
    t.push("");
    t.push("QUIÉN VA A COMERLO");
    t.push("  · En déficit de calorías y haciendo fuerza: unas " +
           kDia + " kcal al día y " + pDia +
           " g de proteína. Una comida o cena ronda las 600-700 kcal por ración");
    t.push("    y cuanta más proteína lleve, mejor.");
    t.push("  · Escribe la receta para " + racDef + " " +
           (racDef === 1 ? "ración" : "raciones") +
           " salvo que el plato pida otra cosa (una tortilla, un guiso).");
    if (PERFIL.gustos && PERFIL.gustos._nota_raciones) {
      t.push("    " + PERFIL.gustos._nota_raciones);
    }
    t.push("");
    bloqueGustos(topeSal).forEach(function (l) { t.push(l); });
    t.push("");
    bloqueCocina().forEach(function (l) { t.push(l); });
    t.push("");
    t.push("SI LO QUE PIDO NO ENCAJA CON ESA DIETA, DÍMELO, PERO HÁZMELO IGUAL.");
    t.push("  Quiero la receta que he pedido, no otra. Lo que sí puedes hacer es ajustar");
    t.push("  las CANTIDADES de lo que más sal o grasa aporte para que el plato siga");
    t.push("  siendo ese plato y se acerque a mis números —por ejemplo, menos chorizo y");
    t.push("  más verdura—, y proponerme una alternativa más sana de algún ingrediente");
    t.push("  suelto. Lo que NO quiero es que me cambies el plato por otro distinto.");
    t.push("  El aviso va DESPUÉS del JSON, en texto normal, no dentro.");
    t.push("");
    t.push("RESPONDE CON UN JSON con esta forma exacta:");
    t.push("");
    t.push("{");
    t.push('  "n": "Nombre del plato",');
    t.push('  "grupo": "uno de: ' + grupos + '",');
    t.push('  "tipo": ["en qué tomas vale: desayuno, almuerzo, comida, merienda, cena, guarnicion, postre"],');
    t.push('  "raciones": ' + racDef + ',');
    t.push('  "min": 25,');
    t.push('  "tools": ["de esta lista: ' + tools + '"],');
    t.push('  "cesta": ["ids de lo que va a la cesta de la freidora A LA VEZ"],');
    t.push('  "capaUnica": true,');
    t.push('  "ing": [');
    t.push('    { "i": "identificador_de_mi_lista", "c": 200 },');
    t.push('    { "nuevo": { "n": "Nombre del ingrediente nuevo", "u": "g", "cat": "Despensa",');
    t.push('                 "k": 120, "p": 3, "g": 2, "h": 20, "sal": 0.05 }, "c": 50 }');
    t.push("  ],");
    t.push('  "pasos": ["12 · Lo que hay que hacer :: por qué se hace así", "Otro paso sin minuto"],');
    t.push('  "trucos": ["Un consejo por línea"],');
    t.push('  "nota": "Una línea, o cadena vacía"');
    t.push("}");
    t.push("");
    t.push("`cesta` y `capaUnica` SÓLO si la receta usa la freidora: qué va dentro a la vez,");
    t.push("y si tiene que ir en una sola capa sin tocarse. Si no hay freidora, déjalos fuera.");
    t.push("");
    t.push("REGLAS DE LOS INGREDIENTES, que es lo que suele fallar:");
    t.push("  · `c` es la cantidad PARA TODA LA RECETA, en la unidad del ingrediente");
    t.push("    (g, ml o ud), no por ración y sin unidades dentro del número.");
    t.push("  · OJO CON LAS UNIDADES: lo que en mi lista va en `ud` se cuenta por piezas.");
    t.push("    Media berenjena es 0.5, no 125. Al lado de cada uno te pongo lo que pesa");
    t.push("    una pieza para que puedas hacer la cuenta.");
    t.push("  · Usa SIEMPRE un identificador de mi lista si el ingrediente está.");
    t.push("  · Sólo si de verdad no está, usa la forma `nuevo` con sus valores POR 100 g");
    t.push("    o por 100 ml: k = calorías, p = proteína, g = grasa, h = hidratos,");
    t.push("    sal = gramos de SAL (no de sodio). Si va por unidad, añade \"pesoUd\".");
    t.push("  · No inventes identificadores que no estén en mi lista.");
    t.push("  · Los valores del ingrediente nuevo, en CRUDO y de tablas de composición");
    t.push("    de alimentos. Si dudas, di de dónde los sacas en el aviso de después.");
    t.push("");
    t.push("CÓMO ESCRIBIR LOS PASOS");
    t.push("  El número del principio es el minuto del reloj de cocina contando desde que");
    t.push("  empiezas, y lo que va detrás de `::` es el PORQUÉ del paso — lo que se");
    t.push("  aprende cocinándolo, no lo obvio. Los dos son opcionales, pero los pasos con");
    t.push("  minuto son los que dejan cocinar dos cosas a la vez.");
    var ej = ejemploParaPrompt();
    if (ej) {
      t.push("");
      t.push("UNA RECETA MÍA, para que veas el tono y el nivel de detalle que busco.");
      t.push("Fíjate en el formato y en cómo están escritos los pasos, no en el número de");
      t.push("raciones: ésa lleva las que pedía el plato.");
      t.push(ej);
    }
    t.push("");
    t.push("MI CATÁLOGO DE INGREDIENTES (identificador = nombre (unidad)):");
    t.push(catalogoParaPrompt());
    t.push("");
    if (paraGemini) {
      t.push("IMPORTANTE: empieza la respuesta directamente con el JSON, sin texto antes,");
      t.push("sin explicaciones y sin marcadores de código. Si tienes algo que advertirme,");
      t.push("escríbelo DESPUÉS de la llave final.");
    } else {
      t.push("Dame el JSON en un bloque de código json, sin comentarios dentro, y los");
      t.push("avisos que tengas debajo del bloque.");
    }
    return t.join("\n");
  }

  /* Lee lo que haya pegado. Acepta el JSON pelado, dentro de un bloque de código
     o con cháchara alrededor: se busca la primera llave y la última, que es lo
     que sobrevive a que una IA se ponga a explicar. */
  function leerRespuestaIA(txt) {
    var s = String(txt || "").trim();
    if (!s) return { error: "No has pegado nada." };
    var a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a < 0 || b <= a) return { error: "Ahí dentro no veo ningún JSON." };
    var doc;
    try {
      doc = JSON.parse(s.slice(a, b + 1));
    } catch (e) {
      return { error: "El JSON está mal formado (" + String(e.message).slice(0, 60) + ")." };
    }
    if (!doc || !doc.n) return { error: "Al JSON le falta el nombre del plato." };

    var ing = [], nuevos = [], avisos = [];
    (doc.ing || []).forEach(function (l) {
      var c = parseFloat(l && l.c);
      if (!(c > 0)) { avisos.push("una línea sin cantidad, la salto"); return; }
      if (l.i) {
        if (Almacen.ingrediente(l.i)) { ing.push({ i: l.i, c: c }); }
        else { avisos.push("«" + l.i + "» no está en tu despensa y no trae datos: lo salto"); }
        return;
      }
      if (l.nuevo && l.nuevo.n) {
        nuevos.push({ d: l.nuevo, c: c });
        return;
      }
      avisos.push("una línea que no dice qué ingrediente es");
    });

    return {
      receta: {
        n: String(doc.n).trim().slice(0, 80),
        grupo: NOMBRE_GRUPO[doc.grupo] ? doc.grupo : "comida",
        tipo: (Array.isArray(doc.tipo) && doc.tipo.length ? doc.tipo : ["comida"])
              .filter(function (t) {
                return ["desayuno","almuerzo","comida","merienda","cena","guarnicion","postre","capricho"].indexOf(t) >= 0;
              }),
        raciones: Math.max(1, Math.min(8, parseInt(doc.raciones, 10) || 2)),
        min: Math.max(1, Math.min(240, parseInt(doc.min, 10) || 20)),
        tools: (doc.tools || []).filter(function (t) { return NOMBRE_TOOL[t]; }),
        pasos: (doc.pasos || []).map(function (x) { return String(x); }).filter(Boolean),
        trucos: (doc.trucos || []).map(function (x) { return String(x); }).filter(Boolean),
        nota: String(doc.nota || "").slice(0, 200),
        /* Sólo tienen sentido si la receta pasa por la freidora. */
        cesta: Array.isArray(doc.cesta) ? doc.cesta.map(String) : [],
        capaUnica: doc.capaUnica !== false
      },
      ing: ing, nuevos: nuevos, avisos: avisos
    };
  }

  /* ¿CABE EN LA CESTA? — la comprobación que antes estaba en un script suelto.
     Vive aquí porque el sitio donde tiene que saltar es ANTES de guardar, y
     aquí es donde se guarda. Las medidas salen de `mi-cocina.json`, no de
     este código: si mañana mide la huella de otro alimento, lo añade al
     fichero y esto lo usa sin tocar nada.

     Lo que se mide es la huella de lo que va a la cesta A LA VEZ, que es lo
     que dice el campo `cesta`. Lo que no esté medido no se inventa: se cuenta
     aparte y se dice cuántos son, porque un «cabe» calculado sobre la mitad de
     los ingredientes es peor que no decir nada. */
  function sinTildes(t) {
    return String(t || "").toLowerCase()
      .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
      .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u");
  }

  function revisarCabida(cesta, ing, capaUnica) {
    var cb = PERFIL.cocina && PERFIL.cocina.cabida_de_la_cesta;
    if (!cb || !cesta || !cesta.length) return null;
    var util = cb.superficie_util_en_una_capa_cm2 || 630;
    var tope = 92;
    var m = String(cb.limite || "").match(/(\d{1,3})\s*%/);
    if (m) tope = parseInt(m[1], 10);

    /* De «Cebolla en juliana» nos quedamos con «cebolla»; de «Pescado o pollo»,
       con las dos palabras. Es lo que permite casar el alimento medido con el
       nombre del ingrediente de su despensa, que nunca es idéntico. */
    var tabla = (cb.huella_por_100_g || []).map(function (h) {
      var base = sinTildes(h.alimento).split(" en ")[0];
      return { claves: base.split(" o ").map(function (x) { return x.trim(); }),
               cm2: h.cm2, alimento: h.alimento };
    });

    var cm2 = 0, medidos = [], sinMedir = [];
    cesta.forEach(function (id) {
      var g = Almacen.ingrediente(id);
      var linea = null;
      ing.forEach(function (l) { if (l.i === id) linea = l; });
      if (!g || !linea) return;
      /* Media despensa se cuenta por unidades —una berenjena, dos patatas—, así
         que hay que pasarlo a gramos con el peso de la pieza antes de medir
         nada. Sin esto «400» de berenjena se leía como 400 berenjenas. */
      var gr;
      if (g.u === "g") gr = linea.c;
      else if (g.u === "ud" && g.pesoUd) gr = linea.c * g.pesoUd;
      else return;                                   // los ml no ocupan cesta
      var nom = sinTildes(g.n);
      var h = null;
      tabla.forEach(function (t) {
        if (h) return;
        t.claves.forEach(function (k) { if (!h && k && nom.indexOf(k) >= 0) h = t; });
      });
      /* «Pescado o pollo» es una clase, no un alimento: «Lomos de lubina
         congelados» no lleva la palabra pescado dentro. Lo resuelve el pasillo
         del súper, que sí lo sabe. */
      if (!h && /Pescader|Carnicer|Congelados/.test(g.cat || "")) {
        tabla.forEach(function (t) {
          if (h) return;
          if (t.claves.indexOf("pescado") >= 0 || t.claves.indexOf("pollo") >= 0) h = t;
        });
      }
      if (!h) { sinMedir.push(g.n); return; }
      cm2 += (gr / 100) * h.cm2;
      medidos.push(g.n);
    });

    if (!medidos.length) return null;
    /* Si no hace falta capa única, el fondo admite el doble: se sacude. */
    var sitio = util * (capaUnica === false ? 2 : 1);
    var pc = Math.round((cm2 / sitio) * 100);
    return { pc: pc, tope: tope, pasa: pc <= tope, sinMedir: sinMedir,
             capaUnica: capaUnica !== false };
  }

  /* EL BORRADOR DEL ENCARGO (22-sep-2026, Carlos): «he entrado, copiado dos de
     las líneas, y al volver se había ido todo; lo he tenido que copiar y pegar
     otra vez».

     Y es que pedir la receta obliga a SALIR de la app: copias el encargo, te
     vas a la IA, vuelves y pegas. Esa ida y vuelta es el flujo normal, no una
     excepción, así que la ventana no puede empezar en blanco cada vez.

     Se guarda en su propia llave, aparte del resto: se escribe a cada tecla y
     no tiene por qué despertar la sincronización con GitHub cada vez. Y todo
     va envuelto en try porque en el móvil, con el almacenamiento lleno o en
     una pestaña privada, esto revienta — y quedarse sin poder pedir una receta
     por no poder guardar un borrador sería absurdo. */
  var LLAVE_BORRADOR = "asistente-ia-borrador";
  var LLAVE_BORRADOR_ING = "asistente-ia-borrador-ingrediente";

  /* El mismo salvavidas que tienen las recetas, para los ingredientes. Pegar la
     respuesta de una IA y perderla por cerrar la ventana sin querer es de las
     cosas que más rabia dan, y no cuesta nada evitarlo. */
  function leerBorradorIng() {
    try {
      var t = localStorage.getItem(LLAVE_BORRADOR_ING);
      return t ? JSON.parse(t) : null;
    } catch (e) { return null; }
  }
  function guardarBorradorIng(b) {
    try { localStorage.setItem(LLAVE_BORRADOR_ING, JSON.stringify(b)); } catch (e) {}
  }
  function borrarBorradorIng() {
    try { localStorage.removeItem(LLAVE_BORRADOR_ING); } catch (e) {}
  }

  function leerBorrador() {
    try {
      var t = localStorage.getItem(LLAVE_BORRADOR);
      return t ? JSON.parse(t) : null;
    } catch (e) { return null; }
  }
  function guardarBorrador(b) {
    try { localStorage.setItem(LLAVE_BORRADOR, JSON.stringify(b)); } catch (e) {}
  }
  function borrarBorrador() {
    try { localStorage.removeItem(LLAVE_BORRADOR); } catch (e) {}
  }

  function abrirRecetaIA() {
    /* Se piden ya los dos ficheros del perfil, para que estén cuando pulse
       copiar. Si tardan, el botón espera; si no llegan, avisa y sigue. */
    cargarPerfil().then(function () {
      var av = $("#ia-falta");
      if (av) av.style.display = PERFIL.falta ? "" : "none";
    });
    var bor = leerBorrador() || { plato: "", detalle: "", resp: "" };

    var html = '<header><h2>Traer una receta de una IA</h2>' +
               '<button class="cerrar" data-cerrar>×</button></header>';
    html += '<p class="nota-modal">El encargo ya lleva dentro tu catálogo de ingredientes, ' +
            'tu cocina con las medidas de la cesta, lo que comes y lo que no, y la regla de ' +
            'la sal. Cópialo, pégalo en Claude o en Gemini, y trae aquí su respuesta.</p>';
    html += '<div class="aviso" id="ia-falta" style="display:none">No he podido leer ' +
            'tu cocina ni tus gustos (datos/mi-cocina.json y datos/mis-gustos.json). ' +
            'El encargo sale igual, pero más corto: repásalo antes de mandarlo.</div>';
    html += '<label class="campo"><span>¿Qué plato quieres?</span>' +
            '<input type="text" id="ia-plato" value="' + esc(bor.plato || "") + '" ' +
            'placeholder="Pasta con cebolla caramelizada y chorizo"></label>';
    html += '<label class="campo"><span>¿Qué quieres que lleve? (opcional, en tus palabras)</span>' +
            '<textarea id="ia-detalle" style="min-height:70px" ' +
            'placeholder="Chorizo en tacos, queso gratinado por encima y salsa de tomate en vez de boloñesa de bote, para que sea más sano">' +
            esc(bor.detalle || "") + '</textarea></label>';
    html += '<div class="fila" style="margin-bottom:12px">' +
              '<button class="btn principal mini" id="ia-claude">Copiar el encargo para Claude</button>' +
              '<button class="btn mini" id="ia-gemini">Copiar el encargo para Gemini</button>' +
              '<button class="btn mini" id="ia-ver">Ver el encargo</button>' +
            '</div>';
    html += '<label class="campo"><span>Pega aquí la respuesta</span>' +
            '<textarea id="ia-resp" class="salida" style="min-height:170px" ' +
            'placeholder="El JSON que te devuelva, tal cual">' + esc(bor.resp || "") + '</textarea></label>';
    /* DOS BOTONES DE LIMPIAR Y NO UNO, porque son dos cosas distintas
       (Carlos, 22-sep-2026): pedir OTRA VERSIÓN del mismo plato —menos chorizo,
       menos queso— es lo normal, y ahí el plato y el detalle se quedan; sólo
       hay que vaciar el recuadro de pegar. Empezar de cero es para otro plato. */
    html += '<div class="fila"><button class="btn principal" id="ia-leer">Leer la respuesta</button>' +
            '<button class="btn" id="ia-vaciar" title="Deja el recuadro libre para pegar otra versión">Vaciar el recuadro</button>' +
            ((bor.plato || bor.detalle || bor.resp)
              ? '<button class="btn" id="ia-limpiar">Empezar de cero</button>' : '') +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    html += '<div id="ia-previo"></div>';
    abrirModal(html);

    /* Se guarda lo escrito a cada tecla. Sin esperas ni botón de guardar: el
       momento en el que se pierde es justo cuando se sale de la app, y ahí ya
       no hay ocasión de preguntar nada. */
    function apuntar() {
      guardarBorrador({
        plato: $("#ia-plato").value,
        detalle: $("#ia-detalle").value,
        resp: $("#ia-resp").value
      });
    }
    ["#ia-plato", "#ia-detalle", "#ia-resp"].forEach(function (sel) {
      $(sel).addEventListener("input", apuntar);
    });

    function copiar(txt, quien) {
      /* ANTES ESTE APAÑO ESCRIBÍA EN EL RECUADRO DE LA RESPUESTA Y LO VACIABA
         después, así que copiar el encargo te borraba lo que hubieras pegado.
         Ahora usa un recuadro suyo, invisible, que se tira al acabar. */
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = txt;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        Util.toast("Encargo para " + quien + " copiado");
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () {
          Util.toast("Encargo para " + quien + " copiado");
        }, fallback);
      } else fallback();
    }

    /* Nada de montar el encargo antes de tener el perfil: sin él saldría el texto
       corto de emergencia y él no notaría la diferencia hasta leer la receta. */
    function conPerfil(fn) {
      return function () { cargarPerfil().then(fn); };
    }
    $("#ia-claude").addEventListener("click", conPerfil(function () {
      copiar(encargoReceta($("#ia-plato").value, $("#ia-detalle").value, false), "Claude");
    }));
    $("#ia-gemini").addEventListener("click", conPerfil(function () {
      copiar(encargoReceta($("#ia-plato").value, $("#ia-detalle").value, true), "Gemini");
    }));
    $("#ia-ver").addEventListener("click", conPerfil(function () {
      var pre = $("#ia-previo");
      pre.innerHTML = '<label class="campo"><span>El encargo, por si lo quieres retocar</span>' +
        '<textarea class="salida" style="min-height:220px">' +
        esc(encargoReceta($("#ia-plato").value, $("#ia-detalle").value, false)) + '</textarea></label>';
    }));

    $("#ia-vaciar").addEventListener("click", function () {
      var ta = $("#ia-resp");
      ta.value = "";
      $("#ia-previo").innerHTML = "";
      apuntar();
      ta.focus();
    });

    var bl = $("#ia-limpiar");
    if (bl) bl.addEventListener("click", function () {
      borrarBorrador();
      cerrarModal();
      abrirRecetaIA();
    });

    $("#ia-leer").addEventListener("click", function () {
      var r = leerRespuestaIA($("#ia-resp").value);
      var pre = $("#ia-previo");
      /* LO QUE SALE, SALE DEBAJO DEL TODO, y el recuadro de pegar la respuesta
         es alto: al pulsar «Leer la respuesta» el resultado aparecía fuera de
         la pantalla y parecía que el botón no hacía nada (Carlos, 22-sep-2026:
         «pulso y no pasa nada»). Así que después de pintarlo, se va a verlo. */
      function asomarse() {
        try { pre.scrollIntoView({ behavior: "smooth", block: "end" }); } catch (e) {
          pre.scrollIntoView(false);
        }
      }
      if (r.error) {
        pre.innerHTML = '<div class="aviso">' + esc(r.error) + '</div>';
        asomarse();
        return;
      }

      /* La cuenta de calorías y sal se hace ANTES de guardar, con los
         ingredientes ya casados, para que él vea si la receta que le han dado
         encaja en su día o se le va de las manos. */
      var falsa = { raciones: r.receta.raciones, ing: r.ing.slice() };
      var kNuevos = 0, salNuevos = 0;
      r.nuevos.forEach(function (x) {
        var g = x.c / 100;
        kNuevos += g * (parseFloat(x.d.k) || 0);
        salNuevos += g * (parseFloat(x.d.sal) || 0);
      });
      var n = Almacen.nutrReceta(falsa);
      var kcal = Math.round(n.k + kNuevos / r.receta.raciones);
      var sal = Almacen.salReceta(falsa) + salNuevos / r.receta.raciones;

      /* UNA RECETA DE 25.000 kcal NO ES UNA RECETA: es una cantidad mal puesta,
         casi siempre un ingrediente que va por unidades al que le han puesto
         los gramos. Vale más decirlo aquí que descubrirlo en el menú. */
      var disparate = kcal > 1400 || sal > 4;

      var h = '<div class="previo-ia">';
      h += '<h3>' + esc(r.receta.n) + '</h3>';
      h += '<p class="nota-peque">' + esc(NOMBRE_GRUPO[r.receta.grupo]) + ' · ' +
           r.receta.raciones + ' raciones · ' + r.receta.min + ' min · ' +
           esc(r.receta.tipo.join(", ")) + '</p>';
      h += '<p><b>' + Util.kcal(kcal) + '</b> y <b>' + Util.sal(sal) + ' de sal</b> por ración</p>';
      if (disparate) {
        h += '<div class="aviso">Eso no cuadra para una ración. Casi siempre es un ' +
             'ingrediente que va por UNIDADES al que le han puesto los gramos ' +
             '(«400» de berenjena son 400 berenjenas, no 400 g). Revisa las ' +
             'cantidades antes de guardarla.</div>';
      }
      h += '<p class="nota-peque">' + r.ing.length + ' ingredientes de tu despensa' +
           (r.nuevos.length ? ' · <b>' + r.nuevos.length + ' nuevos</b> que se crearán: ' +
             esc(r.nuevos.map(function (x) { return x.d.n; }).join(", ")) : '') + '</p>';
      if (r.avisos.length) {
        h += '<div class="aviso">' + r.avisos.map(esc).join("<br>") + '</div>';
      }

      /* LA CESTA, ANTES DE GUARDAR. Es el error que ya pasó de verdad una vez:
         una lubina apilada sobre el tomate, el aire sin pasar, lo de abajo
         crudo. Más vale saberlo ahora que a mitad de cena. */
      var cab = revisarCabida(r.receta.cesta, r.ing, r.receta.capaUnica);
      if (cab) {
        h += '<div class="' + (cab.pasa ? "nota-peque" : "aviso") + '">' +
             'En la cesta de la freidora ocupa el <b>' + cab.pc + ' %</b>' +
             (cab.capaUnica ? " en capa única" : " a dos alturas, removiendo") +
             (cab.pasa ? " (el tope son " + cab.tope + " %)."
                       : ". <b>Se pasa del " + cab.tope + " %</b>: hazlo en dos tandas o baja la verdura.") +
             (cab.sinMedir.length
               ? ' No tengo la huella medida de: ' + esc(cab.sinMedir.join(", ")) + '.'
               : '') +
             '</div>';
      }
      h += '<p class="nota-peque">' + r.receta.pasos.length + ' pasos · ' +
           r.receta.trucos.length + ' trucos</p>';
      h += '<button class="btn principal" id="ia-guardar">Guardar la receta</button>';
      h += '</div>';
      pre.innerHTML = h;
      asomarse();

      $("#ia-guardar").addEventListener("click", function () {
        /* Primero los ingredientes nuevos: si fallaran, la receta quedaría
           apuntando a algo que no existe. */
        var ing = r.ing.slice();
        r.nuevos.forEach(function (x) {
          var id = Almacen.crearIngredienteIA
            ? Almacen.crearIngredienteIA(x.d)
            : null;
          if (id) ing.push({ i: id, c: x.c });
        });
        var base = "ia_" + r.receta.n.toLowerCase()
          .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
          .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n")
          .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 34);
        var id = base, k = 2;
        while (Almacen.receta(id)) { id = base + "_" + k; k++; }
        var nueva = {
          id: id, n: r.receta.n, tipo: r.receta.tipo, grupo: r.receta.grupo,
          raciones: r.receta.raciones, min: r.receta.min, tools: r.receta.tools,
          ing: ing,
          pasos: r.receta.pasos.map(function (t) {
            var m = String(t).match(/^(\d{1,3})\s*[·.|-]\s*(.+)$/);
            if (!m) return t;
            var resto = m[2].split("::");
            var paso = { min: parseInt(m[1], 10), t: resto[0].trim() };
            if (resto.length > 1) paso.d = resto.slice(1).join("::").trim();
            return paso;
          }),
          trucos: r.receta.trucos,
          nota: r.receta.nota,
          editado: true,
          de: "ia"
        };
        if (r.receta.cesta.length) {
          nueva.cesta = r.receta.cesta.filter(function (id) { return Almacen.ingrediente(id); });
          nueva.capaUnica = r.receta.capaUnica;
        }
        Almacen.estado.recetas.push(nueva);
        Almacen.guardar("receta");
        /* La receta ya está dentro: el borrador ha cumplido y se tira, para que
           la próxima vez la ventana abra limpia. */
        borrarBorrador();
        cerrarModal();
        pintarRecetas(); pintarMenu();
        Util.toast("Receta guardada: " + nueva.n);
      });
    });
  }

  /* ==================== EDITOR DE INGREDIENTE ==================== */
  /* `nombrePrevio` y `alGuardar` los usa la pantalla de ordenar caprichos: si
     unos pistachos no están en la despensa, se crean desde allí sin perder el
     hilo y se vuelve a la lista con el ingrediente ya hecho. */
  /* LAS SECCIONES DEL SÚPER, en el orden en que se recorre.
     Es el único sitio donde vive esa lista: la compra se ordena por ella y el
     alta de ingredientes la ofrece tal cual. «Restaurante y bar» no es una
     sección de verdad: es la marca de lo que NO se compra en ningún sitio. */
  var SECCIONES = ["Frutas y verduras", "Carnicería", "Pescadería", "Charcutería y quesos",
                   "Lácteos y huevos", "Panadería", "Congelados", "Despensa",
                   "Aperitivos y frutos secos", "Dulces", "Bebidas", "Especias y aromáticos",
                   "Restaurante y bar"];

  function abrirIngrediente(id, nombrePrevio, alGuardar) {
    var nuevo = !id;
    var g = nuevo
      ? { id: "", n: String(nombrePrevio || ""), cat: "Frutas y verduras", u: "g",
          sal: 0, k: 0, p: 0, g: 0, h: 0 }
      : JSON.parse(JSON.stringify(Almacen.ingrediente(id)));
    if (!g) return;

    var cats = SECCIONES.slice();
    if (g.cat && cats.indexOf(g.cat) < 0) cats.unshift(g.cat);

    var html = '<header><h2>' + (nuevo ? "Nuevo ingrediente" : esc(g.n)) + '</h2>' +
               '<button class="cerrar" data-cerrar>×</button></header>';
    html += '<p class="nota-peque">Los valores son por cada 100 g (o 100 ml). Si el producto que compras ' +
            'trae otros en la etiqueta, cámbialos aquí y se recalcula todo.</p>';
    html += '<label class="campo"><span>Nombre</span><input type="text" id="ig-n" value="' + esc(g.n) + '"></label>';
    html += '<div class="fila">' +
      '<label class="campo" style="flex:1 1 180px"><span>Sección del súper</span><select id="ig-cat">' +
        cats.map(function (c) { return '<option' + (g.cat === c ? " selected" : "") + '>' + c + '</option>'; }).join("") +
      '</select></label>' +
      '<label class="campo" style="flex:0 1 110px"><span>Se mide en</span><select id="ig-u">' +
        ['g', 'ml', 'ud'].map(function (u) { return '<option' + (g.u === u ? " selected" : "") + '>' + u + '</option>'; }).join("") +
      '</select></label>' +
      '<label class="campo" style="flex:0 1 130px"><span>Peso de 1 unidad (g)</span>' +
        '<input type="number" id="ig-peso" min="1" step="1" value="' + (g.pesoUd || "") + '"></label>' +
      '</div>';
    html += '<div class="fila">' +
      ['sal|Sal (g)|0.01', 'k|Calorías (kcal)|1', 'p|Proteína (g)|0.1', 'g|Grasa (g)|0.1', 'h|Hidratos (g)|0.1']
        .map(function (c) {
          var p = c.split("|");
          return '<label class="campo" style="flex:1 1 90px"><span>' + p[1] + '</span>' +
                 '<input type="number" id="ig-' + p[0] + '" min="0" step="' + p[2] + '" value="' +
                 (g[p[0]] != null ? g[p[0]] : 0) + '"></label>';
        }).join("") + '</div>';
    html += '<label class="campo"><span>Tu producto: marca y formato</span>' +
            '<input type="text" id="ig-producto" value="' + esc(g.producto || "") + '" ' +
            'placeholder="marca + formato, p. ej. \u00absopa de sobre Gallina Blanca, caja de 6\u00bb">' +
            '<span class="nota-peque" style="font-weight:400">Es lo que se copia a Amazon. Sin marca, ' +
            'la l\u00ednea no es comprable ah\u00ed \u2014 en el s\u00faper da igual, t\u00fa ya sabes cu\u00e1l coger.</span></label>';
    html += '<label class="campo"><span>Si no hay, este otro (opcional)</span>' +
            '<input type="text" id="ig-suplente" value="' + esc(g.suplente || "") + '" ' +
            'placeholder="otra marca del mismo producto">' +
            '<span class="nota-peque" style="font-weight:400">Tu segunda opci\u00f3n. Sale escrita debajo ' +
            'en la lista y en el pedido, para no tener que buscarla cuando falte la primera.</span></label>';
    html += '<div class="fila">' +
      '<label class="campo" style="flex:1 1 150px"><span>Envase (' + esc(g.u || "g") + ' por unidad de venta)</span>' +
        '<input type="number" id="ig-envase" min="0" step="1" value="' + (g.envase != null ? g.envase : "") + '">' +
        '<span class="nota-peque" style="font-weight:400">Lo que entra en casa al comprar uno. Vac\u00edo = se compra al peso.</span></label>' +
      '<label class="campo" style="flex:1 1 130px"><span>D\u00f3nde se compra</span><select id="ig-cajon">' +
        '<option value="">Como toque (' + esc(Almacen.nombreCajon(Almacen.cajonDe(g.id || g))) + ')</option>' +
        Almacen.CAJONES.map(function (c) {
          return '<option value="' + esc(c.k) + '"' + (g.cajon === c.k ? " selected" : "") + '>' + esc(c.n) + '</option>';
        }).join("") + '</select></label></div>';
    /* ---------- EL MÍNIMO EN CASA ----------
       Para lo que ningún plato pide: bebidas, leche, zumo. Se cuenta en piezas
       —latas, briks, botellas—, que es como se mira la nevera. (Carlos,
       25-sep-2026: «cervezas Mahou 7 ud, el pack es de 12 o 24, sólo compro
       cuando queden menos de 7».) */
    html += '<div class="fila">' +
      '<label class="campo" style="flex:1 1 150px"><span>Mínimo en casa</span>' +
        '<input type="number" id="ig-minimo" min="0" step="1" value="' +
          (g.minimo > 0 ? g.minimo : "") + '" placeholder="sin mínimo">' +
        '<span class="nota-peque" style="font-weight:400">Cuántas piezas quieres tener ' +
          'siempre. Si bajas de ahí, entra en la compra aunque ningún plato lo pida.</span></label>' +
      '<label class="campo" style="flex:1 1 150px"><span>Se compra de</span>' +
        '<input type="number" id="ig-lote" min="0" step="1" value="' +
          (g.lote > 0 ? g.lote : "") + '" placeholder="1">' +
        '<span class="nota-peque" style="font-weight:400">Piezas por lote: un pack de 12 ' +
          'latas, 6 briks de leche. Se pide el lote entero.</span></label></div>';
    html += '<div class="fila">' +
      '<label class="campo" style="flex:1 1 150px"><span>Raci\u00f3n habitual (' + esc(g.u || "g") + ')</span>' +
        '<input type="number" id="ig-racion" min="0" step="0.5" value="' + (g.racion != null ? g.racion : "") + '">' +
        '<span class="nota-peque" style="font-weight:400">' +
          /* DECIRLO CON PALABRAS (23-sep-2026, Carlos): «no veo que la raci\u00f3n a
             consumir sea media pizza, veo datos de 100 gramos». El n\u00famero estaba
             bien —170 de una pizza de 340— pero obligaba a dividir de cabeza.
             Si la ficha trae `racionTexto`, se ense\u00f1a eso; si no, el texto de siempre. */
          (g.racionTexto
            ? '<b>= ' + esc(g.racionTexto) + '</b>. Lo que sueles tomar de una vez.'
            : 'Lo que sueles tomar de una vez: un pl\u00e1tano, 30 g de pistachos. ' +
              'Se usa al apuntarlo en una toma.') +
        '</span></label>' +
      '<label class="campo" style="flex:2 1 260px"><span>Nota</span>' +
        '<input type="text" id="ig-nota" value="' + esc(g.nota || "") + '" placeholder="Marca, formato, d\u00f3nde lo compras\u2026"></label>' +
      '</div>';
    /* DÓNDE SE GUARDA, Y ES OBLIGATORIO. Carlos, 24-sep-2026: «es importante que
       los ingredientes nuevos tengan su estante… no debe haber ingredientes sin
       localización». Sin estante, la app no sabe dónde buscarlo al repasar la
       despensa y no puede decirte si lo tienes: la ficha queda coja y el fallo
       no se ve hasta que estás delante de la nevera. Se pide aquí, que es el
       único momento en que alguien está pensando en ese producto.
       Lo de restaurante y bar no se guarda en casa: ahí no se pregunta. */
    if (g.cat !== "Restaurante y bar") {
      html += '<label class="campo" style="margin-bottom:12px">' +
        '<span>Dónde se guarda en casa</span>' +
        '<select id="ig-sitio">' +
          '<option value="">— elige el estante —</option>' +
          Almacen.ZONAS.map(function (z) {
            return '<optgroup label="' + esc(z.n) + '">' +
              z.estantes.map(function (e) {
                return '<option value="' + esc(e.k) + '"' +
                  (e.k === g.sitio ? " selected" : "") + '>' + esc(e.n) + '</option>';
              }).join("") + '</optgroup>';
          }).join("") +
        '</select>' +
        '<span class="nota-peque" style="font-weight:400">Hace falta para que la despensa ' +
        'sepa dónde buscarlo. ' +
        'Si no lo pones, el ingrediente sale en Despensa → Localización → Pendiente.</span></label>';
    }
    html += '<label style="font-size:.85rem; display:block; margin-bottom:12px">' +
            '<input type="checkbox" id="ig-basico"' + (g.basico ? " checked" : "") + '> ' +
            'Es un básico de despensa (va aparte en la lista de la compra)</label>';
    html += '<div class="fila"><button class="btn principal" id="ig-guardar">Guardar</button>' +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    abrirModal(html);

    $("#ig-guardar").addEventListener("click", function () {
      var nombre = $("#ig-n").value.trim();
      if (!nombre) { Util.toast("Ponle nombre al ingrediente"); return; }
      /* El estante se exige salvo en lo de restaurante y bar, que no se guarda
         en ninguna parte. Es la regla que pidió Carlos: nada sin localización. */
      var selSitio = $("#ig-sitio");
      var catElegida = $("#ig-cat").value;
      if (selSitio && catElegida !== "Restaurante y bar" && !selSitio.value) {
        Util.toast("Dinos dónde se guarda en casa");
        try { selSitio.focus(); selSitio.scrollIntoView({ block: "center" }); } catch (e2) {}
        return;
      }
      var num = function (sel) { var v = parseFloat($(sel).value.replace(",", ".")); return isNaN(v) ? 0 : v; };
      /* SE PARTE DE LA FICHA, NO DE CERO. (25-sep-2026.) Esto construía un
         objeto nuevo con ocho campos y lo demás se perdía al guardar: el
         formato, los trucos, la revisión, el mínimo… Se veía que alguien ya lo
         había notado, porque `compra` y `nota` estaban rescatados a mano uno a
         uno; el siguiente campo que añadiéramos volvía a caerse. Copiando la
         ficha entera y pisando sólo lo del formulario, eso no vuelve a pasar. */
      var res = JSON.parse(JSON.stringify(g || {}));
      res.id = g.id || ("ing_" + Date.now().toString(36));
      res.n = nombre; res.cat = $("#ig-cat").value; res.u = $("#ig-u").value;
      res.sal = num("#ig-sal"); res.k = num("#ig-k");
      res.p = num("#ig-p"); res.g = num("#ig-g"); res.h = num("#ig-h");
      /* los que el formulario manda: si los dejas en blanco, se quitan */
      ["pesoUd", "basico", "racion", "producto", "suplente", "envase", "cajon", "minimo", "lote"]
        .forEach(function (k2) { delete res[k2]; });
      var peso = parseFloat($("#ig-peso").value);
      if (res.u === "ud" && peso > 0) res.pesoUd = peso;
      if ($("#ig-basico").checked) res.basico = true;
      if (selSitio && selSitio.value) res.sitio = selSitio.value;
      var racion = parseFloat(String($("#ig-racion").value).replace(",", "."));
      if (racion > 0) res.racion = racion;
      var prod = $("#ig-producto").value.trim();
      if (prod) res.producto = prod;
      var sup = $("#ig-suplente").value.trim();
      if (sup) res.suplente = sup;
      var env = parseFloat(String($("#ig-envase").value).replace(",", "."));
      if (env > 0) res.envase = env;
      var caj = $("#ig-cajon").value;
      if (caj) res.cajon = caj;
      var nota = $("#ig-nota").value.trim();
      if (nota) res.nota = nota; else if (g.nota) res.nota = g.nota;
      var mn = parseFloat(String(($("#ig-minimo") || {}).value || "").replace(",", "."));
      if (mn > 0) res.minimo = mn;
      var lt = parseFloat(String(($("#ig-lote") || {}).value || "").replace(",", "."));
      if (lt > 0) res.lote = lt;
      res.editado = true;          /* a partir de ahora manda el tuyo: no lo piso */

      var idx = -1;
      Almacen.estado.ingredientes.forEach(function (x, i) { if (x.id === res.id) idx = i; });
      if (idx >= 0) Almacen.estado.ingredientes[idx] = res;
      else Almacen.estado.ingredientes.push(res);
      Almacen.guardar("ingrediente");
      cerrarModal();
      pintarDespensa(); pintarMenu(); pintarRecetas();
      Util.toast("Ingrediente guardado");
      if (alGuardar) alGuardar(res.id);
    });
  }

  /* ==================== VISTA: RECETAS ==================== */
  function pintarRecetas() {
    var f = UI.filtros;
    var lista = Almacen.estado.recetas.filter(function (r) {
      if (r.oculta) return false;                       // retirada: no se ofrece
      /* Los «ingredientes solos» no son recetas y no pintan nada en el recetario:
         cada cantidad distinta crea uno —nueces 20 g, nueces 30 g— y en unos meses
         serían cien fichas tapando las recetas de verdad. Siguen existiendo y
         siguen saliendo en el selector del menú, que es donde sirven; aquí lo
         que se mira es el ingrediente, en la fila de abajo. */
      if (r.grupo === "suelto") return false;
      if (f.toma && (r.tipo || []).indexOf(f.toma) < 0) return false;
      if (f.grupo && r.grupo !== f.grupo) return false;
      if (f.tool === "__preferidas") {
        if (!toolsOrdenadas(r.tools).some(function (t) { return TOOLS_PREFERIDAS[t]; })) return false;
      } else if (f.tool === "__mochila") {
        if (!r.llevable) return false;
      } else if (f.tool && (r.tools || []).indexOf(f.tool) < 0) return false;
      if (f.texto) {
        var q = f.texto.toLowerCase();
        var enNombre = r.n.toLowerCase().indexOf(q) >= 0;
        var enIng = (r.ing || []).some(function (l) {
          var ing = Almacen.ingrediente(l.i);
          return ing && ing.n.toLowerCase().indexOf(q) >= 0;
        });
        if (!enNombre && !enIng) return false;
      }
      return true;
    });
    lista.sort(function (a, b) { return a.n.localeCompare(b.n); });

    $("#contador-recetas").textContent = lista.length + " recetas";
    $("#rejilla-recetas").innerHTML = lista.map(function (r) {
      var sal = Almacen.salReceta(r);
      var n = Almacen.nutrReceta(r);
      return '<div class="receta" data-ficha="' + esc(r.id) + '">' +
             '<h3>' + esc(r.n) + '</h3>' +
             '<div class="nota-peque">' + Util.kcal(n.k) + ' · ' + Math.round(n.p) + ' g prot. · ' +
             Util.sal(sal) + ' sal · ' + (r.min || "?") + ' min</div>' +
             '<div class="etiquetas">' +
               (r.grupo ? '<span class="etiqueta verde">' + esc(NOMBRE_GRUPO[r.grupo] || r.grupo) + '</span>' : '') +
               etiquetasTool(r.tools) +
             '</div></div>';
    }).join("") || '<div class="vacio">No hay recetas con esos filtros.</div>';
    pintarIngredientes();
  }

  /* ---------- LA FILA DE INGREDIENTES, debajo de la de recetas ----------
     Una receta es una suma de ingredientes, así que el ingrediente es la pieza
     de abajo del todo y merece su propio buscador. Además es donde se ven de un
     vistazo las dos cifras que importan en esta casa: las calorías y la sal por
     cada 100 g. */
  function pintarIngredientes() {
    var rej = $("#rejilla-ingredientes");
    if (!rej) return;
    var f = UI.filtrosIng;
    var mios = {};
    if (f.clase === "mios") Almacen.novedades().ingredientes.forEach(function (x) { mios[x.id] = true; });
    var lista = (Almacen.estado.ingredientes || []).filter(function (x) {
      if (x.oculta) return false;              /* retirado: duplicados y cosas as\u00ed */
      if (f.cat && x.cat !== f.cat) return false;
      if (f.clase === "mios" && !mios[x.id]) return false;
      if (f.clase === "basicos" && !x.basico) return false;
      if (f.clase === "racion" && x.racion == null) return false;
      if (f.clase === "fuera" && x.cat !== "Restaurante y bar") return false;
      if (f.texto) {
        var q = sinTildes(f.texto.toLowerCase());
        if (sinTildes((x.n || "").toLowerCase()).indexOf(q) < 0 &&
            sinTildes((x.nota || "").toLowerCase()).indexOf(q) < 0) return false;
      }
      return true;
    });
    lista.sort(function (a, b) { return (a.n || "").localeCompare(b.n || ""); });

    var sel = $("#filtro-seccion");
    if (sel && !sel.dataset.listo) {
      var hay = {};
      (Almacen.estado.ingredientes || []).forEach(function (x) { if (x.cat) hay[x.cat] = true; });
      var orden = SECCIONES.filter(function (c) { return hay[c]; })
        .concat(Object.keys(hay).filter(function (c) { return SECCIONES.indexOf(c) < 0; }));
      sel.innerHTML = '<option value="">Todas las secciones</option>' +
        orden.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");
      sel.dataset.listo = "1";
    }

    $("#contador-ingredientes").textContent =
      lista.length + " ingredientes" + (f.cat || f.texto || f.clase ? " (de " + (Almacen.estado.ingredientes || []).length + ")" : "");

    rej.innerHTML = lista.map(function (x) {
      var u = x.u === "ud" ? "unidad" : ("100 " + (x.u || "g"));
      var racion = x.racion != null
        ? Util.cantidadReceta(x.racion, x.u, x.pesoUd)
        : "";
      var base = x.u === "ud" ? (x.pesoUd || 100) / 100 : 1;
      return '<div class="receta" data-ingrediente="' + esc(x.id) + '">' +
             '<h3>' + esc(x.n) + '</h3>' +
             '<div class="nota-peque">' + Util.kcal((x.k || 0) * base) + ' \u00b7 ' +
               Util.sal((x.sal || 0) * base) + ' sal \u00b7 por ' + esc(u) + '</div>' +
             '<div class="etiquetas">' +
               (x.cat ? '<span class="etiqueta verde">' + esc(x.cat) + '</span>' : '') +
               (racion ? '<span class="etiqueta">Raci\u00f3n: ' + esc(racion) + '</span>' : '') +
               (x.basico ? '<span class="etiqueta">B\u00e1sico</span>' : '') +
               (x.de === "ia" ? '<span class="etiqueta">De una IA</span>' : '') +
             '</div></div>';
    }).join("") || '<div class="vacio">No hay ingredientes con esos filtros.</div>';
  }

  /* QUÉ FILA SE ESTÁ MIRANDO: recetas o ingredientes.
     Las dos listas no caben una debajo de otra: con 75 recetas delante, la fila
     de ingredientes quedaba enterrada y no se encontraba. Se enseña una cada
     vez, y se entra siempre por recetas. */
  function ponerFila(cual) {
    UI.fila = (cual === "ingredientes") ? "ingredientes" : "recetas";
    var br = $("#bloque-recetas"), bi = $("#bloque-ingredientes");
    if (br) br.hidden = UI.fila !== "recetas";
    if (bi) bi.hidden = UI.fila !== "ingredientes";
    $$("#selector-fila [data-fila]").forEach(function (b) {
      b.classList.toggle("principal", b.getAttribute("data-fila") === UI.fila);
    });
    pintarRecetas();
    var foco = $(UI.fila === "recetas" ? "#buscar-receta" : "#buscar-ingrediente");
    if (foco && !esMovil()) foco.focus();
  }

  /* ---------- EL ENCARGO PARA LA IA ----------
     Mismo camino que el de las recetas: se copia un texto, se pega en Claude o
     en Gemini, y su respuesta se pega aquí. Lo importante del encargo es que
     PIDE LA SAL, que es el dato que las tablas nutricionales suelen esconder
     detrás del sodio, y que exige decir de dónde sale cada cifra. */
  function encargoIngrediente(nombre) {
    return "Eres mi ayudante de cocina. Necesito la ficha de un alimento para una dieta BAJA EN SAL.\n\n" +
      "ALIMENTO: " + (nombre || "(escribe aqu\u00ed el producto, con marca y formato si lo sabes)") + "\n\n" +
      "Dame SOLO un bloque JSON, sin texto alrededor, con esta forma exacta:\n\n" +
      '{\n' +
      '  "n": "nombre claro, con marca y formato si lo tiene",\n' +
      '  "cat": "una de: ' + SECCIONES.join(" | ") + '",\n' +
      '  "u": "g | ml | ud",\n' +
      '  "pesoUd": 0,\n' +
      '  "racion": 0,\n' +
      '  "k": 0, "p": 0, "g": 0, "h": 0, "sal": 0,\n' +
      '  "nota": "de d\u00f3nde sale el dato y qu\u00e9 conviene saber al comprarlo"\n' +
      '}\n\n' +
      "REGLAS, importantes:\n" +
      "1. k, p, g, h y sal son SIEMPRE por 100 g o 100 ml del producto, aunque se mida en unidades.\n" +
      "2. sal en GRAMOS DE SAL, no en sodio. Si la etiqueta da sodio en mg, multiplica por 0,00254.\n" +
      "3. Si se mide en unidades (u:\"ud\"), pon en pesoUd lo que pesa UNA, en gramos.\n" +
      "4. racion = lo que se toma de una vez, en la unidad de arriba (un pl\u00e1tano: 1; pistachos: 30).\n" +
      "5. \"Restaurante y bar\" es para lo que se paga hecho y NUNCA se compra en una tienda:\n" +
      "   hamburguesas de cadena, tapas, pizza de pedido. Lo del congelador NO va ah\u00ed.\n" +
      "6. Prioriza la etiqueta espa\u00f1ola real del producto. Si no la encuentras, dilo en la nota\n" +
      "   y usa una tabla de composici\u00f3n, diciendo cu\u00e1l. No te inventes cifras.\n" +
      "7. Si no sabes un valor, pon 0 y expl\u00edcalo en la nota. Prefiero un hueco a un n\u00famero falso.\n\n" +
      "Puedes darme varios alimentos de una vez: entonces devuelve {\"ingredientes\": [ ... ]}.";
  }

  function abrirIngredienteIA(nombrePrevio) {
    var bor = leerBorradorIng() || { nombre: "", resp: "" };
    if (nombrePrevio) bor.nombre = nombrePrevio;
    var html = '<header><h2>Ingrediente con una IA</h2><button class="cerrar" data-cerrar>\u00d7</button></header>';
    html += '<p class="nota-peque">Escribe el producto, copia el encargo, p\u00e9galo en Claude o en Gemini, ' +
            'y trae aqu\u00ed su respuesta. Lo que llegue se puede corregir despu\u00e9s como cualquier ingrediente.</p>';
    html += '<label class="campo"><span>Producto</span><input type="text" id="ii-nombre" value="' +
            esc(bor.nombre || "") + '" placeholder="Yogur griego Hacendado 0%, tarrina 125 g"></label>';
    html += '<div class="fila"><button class="btn" id="ii-copiar">Copiar el encargo</button>' +
            '<button class="btn" id="ii-ver">Ver el encargo</button></div>';
    html += '<textarea id="ii-encargo" rows="6" style="display:none; width:100%; margin:10px 0"></textarea>';
    html += '<label class="campo" style="margin-top:12px"><span>Pega aqu\u00ed su respuesta</span>' +
            '<textarea id="ii-respuesta" rows="8" placeholder="Aqu\u00ed va el JSON que te devuelva">' +
            esc(bor.resp || "") + '</textarea></label>';
    html += '<div class="fila"><button class="btn principal" id="ii-anadir">A\u00f1adir al cat\u00e1logo</button>' +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    abrirModal(html);

    /* Se apunta a cada tecla. El momento en el que esto se pierde es justo
       cuando cierras la ventana, y ahí ya no hay ocasión de preguntar nada. */
    function apuntarIng() {
      guardarBorradorIng({ nombre: $("#ii-nombre").value, resp: $("#ii-respuesta").value });
    }
    ["#ii-nombre", "#ii-respuesta"].forEach(function (sel) {
      $(sel).addEventListener("input", apuntarIng);
    });
    if (bor.resp) Util.toast("Recuperado lo que ten\u00edas escrito");

    function texto() { return encargoIngrediente($("#ii-nombre").value.trim()); }
    $("#ii-copiar").addEventListener("click", function () {
      var t = texto();
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () {
        Util.toast("Encargo copiado: p\u00e9galo en Claude o en Gemini");
      }); else { $("#ii-encargo").style.display = "block"; $("#ii-encargo").value = t; $("#ii-encargo").select(); }
    });
    $("#ii-ver").addEventListener("click", function () {
      var c = $("#ii-encargo");
      c.style.display = c.style.display === "none" ? "block" : "none";
      c.value = texto();
    });

    $("#ii-anadir").addEventListener("click", function () {
      var txt = $("#ii-respuesta").value;
      var i = txt.indexOf("{"), f = txt.lastIndexOf("}");
      if (i < 0 || f <= i) { Util.toast("No encuentro el JSON en esa respuesta"); return; }
      var d;
      try { d = JSON.parse(txt.slice(i, f + 1)); }
      catch (e) { Util.toast("Ese JSON tiene alg\u00fan error y no se puede leer"); return; }
      var lista = Array.isArray(d) ? d : (Array.isArray(d.ingredientes) ? d.ingredientes : [d]);
      var puestos = [], repetidos = [];
      lista.forEach(function (x) {
        if (!x || !x.n) return;
        var ya = null;
        (Almacen.estado.ingredientes || []).forEach(function (y) {
          if (!ya && sinTildes((y.n || "").toLowerCase()) === sinTildes(String(x.n).toLowerCase())) ya = y;
        });
        if (ya) { repetidos.push(x.n); return; }
        var id = Almacen.crearIngredienteIA(x);
        if (!id) return;
        var g = Almacen.ingrediente(id);
        var racion = parseFloat(x.racion);
        if (g && racion > 0) g.racion = racion;
        if (g && x.nota) g.nota = String(x.nota).slice(0, 400);
        puestos.push(id);
      });
      if (!puestos.length) {
        Util.toast(repetidos.length ? "Ya ten\u00edas: " + repetidos.join(", ") : "No he sacado ning\u00fan ingrediente de ah\u00ed");
        return;
      }
      Almacen.guardar("ingrediente");
      borrarBorradorIng();          /* ya está dentro: el borrador ha cumplido */
      cerrarModal();
      UI.filtrosIng.texto = ""; UI.filtrosIng.cat = ""; UI.filtrosIng.clase = "";
      pintarRecetas(); pintarDespensa();
      Util.toast(puestos.length + (puestos.length === 1 ? " ingrediente a\u00f1adido" : " ingredientes a\u00f1adidos") +
                 (repetidos.length ? " (" + repetidos.length + " ya los ten\u00edas)" : ""));
      /* Se abre el primero para que lo repases: son valores que no has mirado t\u00fa. */
      if (puestos.length === 1) abrirIngrediente(puestos[0]);
    });
  }

  /* ---------- CUÁNTO COMISTE DE VERDAD ----------
     Al planificar va la ración estándar, que es lo razonable: nadie sabe el
     lunes lo que va a pesar el plátano del jueves. Pero al comértelo sí lo
     sabes, y la diferencia no es pequeña: un plátano de 104 g en vez de 120 y
     20 g de nueces en vez de 30 son 79 kcal en un solo almuerzo.

     Lo que se apunta aquí vive en el DÍA. No toca la receta, ni el plan, ni la
     lista de la compra: compraste un plátano entero, te comieras 104 g o 120. */
  function abrirCantidadReal(fecha, toma, rid) {
    var rec = Almacen.receta(rid);
    if (!rec) return;
    var u = Almacen.unidadReal(rec);
    var prev = Almacen.cantidadPrevista(rec);
    var real = Almacen.cantidadReal(fecha, toma, rid);
    var veces = ((Almacen.estado.plan[fecha] || {})[toma] || []).filter(function (x) { return x === rid; }).length || 1;
    var previsto = prev * veces;
    var nUna = Almacen.nutrReceta(rec);
    var salUna = Almacen.salReceta(rec);

    var etiqueta = u === "rac" ? "raciones" : u;
    var html = '<header><h2>\u00bfCu\u00e1nto comiste?</h2><button class="cerrar" data-cerrar>\u00d7</button></header>';
    html += '<p class="nota-peque"><strong>' + esc(rec.n) + '</strong><br>' +
            'Previsto: ' + esc(String(Math.round(previsto * 100) / 100)) + ' ' + esc(etiqueta) +
            (veces > 1 ? ' (' + veces + ' raciones)' : '') + ' \u00b7 ' +
            Util.kcal(nUna.k * veces) + ' \u00b7 ' + Util.sal(salUna * veces) + ' de sal</p>';
    html += '<label class="campo"><span>Lo que comiste de verdad (' + esc(etiqueta) + ')</span>' +
            '<input type="number" id="cr-cant" min="0" step="' + (u === "rac" ? "0.25" : "1") + '" value="' +
            esc(String(real ? real.c : Math.round(previsto * 100) / 100)) + '"></label>';
    html += '<div id="cr-cuenta" class="nota-peque"></div>';
    html += '<div class="fila"><button class="btn principal" id="cr-guardar">Guardar</button>' +
            (real ? '<button class="btn" id="cr-quitar">Volver a lo previsto</button>' : '') +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    html += '<p class="nota-peque">Esto solo cambia las calor\u00edas y la sal de este d\u00eda. ' +
            'Ni la receta, ni los otros d\u00edas, ni la lista de la compra: el pl\u00e1tano lo ' +
            'compraste entero.</p>';
    abrirModal(html);

    function pintarCuenta() {
      var c = parseFloat(String($("#cr-cant").value).replace(",", "."));
      var caja = $("#cr-cuenta");
      if (!(c >= 0)) { caja.textContent = ""; return; }
      var f = u === "rac" ? c : (prev > 0 ? c / prev : 1);
      var dk = nUna.k * f - nUna.k * veces;
      var ds = salUna * f - salUna * veces;
      caja.innerHTML = 'Quedar\u00eda en <strong>' + Util.kcal(nUna.k * f) + '</strong> y ' +
        Util.sal(salUna * f) + ' de sal' +
        (Math.abs(dk) >= 1 ? ' \u2014 ' + (dk > 0 ? '+' : '') + Math.round(dk) + ' kcal' : '') +
        (Math.abs(ds) >= 0.01 ? ' y ' + (ds > 0 ? '+' : '') + Util.sal(ds) : '') +
        ' respecto a lo previsto.';
    }
    $("#cr-cant").addEventListener("input", pintarCuenta);
    pintarCuenta();

    $("#cr-guardar").addEventListener("click", function () {
      var c = parseFloat(String($("#cr-cant").value).replace(",", "."));
      if (!(c >= 0)) { Util.toast("Pon una cantidad"); return; }
      Almacen.ponerCantidadReal(fecha, toma, rid, c);
      cerrarModal(); pintarMenu();
      Util.toast("Apuntado: " + c + " " + etiqueta);
    });
    if ($("#cr-quitar")) $("#cr-quitar").addEventListener("click", function () {
      Almacen.ponerCantidadReal(fecha, toma, rid, null);
      cerrarModal(); pintarMenu();
      Util.toast("Vuelve a contar lo previsto");
    });
  }

  /* ---------- PONER MARCAS EN TANDA ----------
     Una línea sin marca no es comprable en Amazon, y son decenas. Ir una a una
     desde la lista es el trabajo por elemento que hace que un sistema se
     abandone, así que se piden todas de una vez: la app junta las que faltan y
     tú solo escribes lo que compras. Lo que dejes en blanco se queda como está.

     Se ofrecen SOLO las de Amazon: en el súper ya sabes cuál coger y ponerles
     marca no sirve de nada. */
  function faltanMarcas() {
    var fuera = [];
    (compraActual ? compraActual.secciones : []).forEach(function (sec) {
      sec.lineas.forEach(function (l) {
        if (l.cajon === "amazon" && !l.producto) {
          fuera.push({ tipo: "ing", id: l.id, n: l.nombre, pista: l.envase
            ? "envase de " + Util.cantidadReceta(l.envase, l.unidad, l.pesoUd) : "" });
        }
      });
    });
    (compraActual ? compraActual.basicos : []).forEach(function (l) {
      if (l.cajon === "amazon" && !l.producto) {
        fuera.push({ tipo: "ing", id: l.id, n: l.nombre, pista: l.envase
          ? "envase de " + Util.cantidadReceta(l.envase, l.unidad, l.pesoUd) : "" });
      }
    });
    var hg = Almacen.compraHogar();
    hg.amazon.forEach(function (x) {
      if (x.pendiente) fuera.push({ tipo: "hogar", id: x.id, n: x.n, pista: x.cat });
    });
    return fuera;
  }

  function abrirMarcas(lista, alCerrar) {
    if (!lista.length) { Util.toast("No falta ninguna marca en esta compra"); return; }
    var html = '<header><h2>Poner marcas</h2><button class="cerrar" data-cerrar>\u00d7</button></header>';
    html += '<p class="nota-peque">Escribe el producto que compras t\u00fa, con marca y formato. ' +
            'Es lo que se copia a Amazon. <b>Lo que dejes en blanco se queda como est\u00e1</b>, ' +
            'as\u00ed que puedes hacerlo en varias veces.</p>';
    lista.forEach(function (x) {
      html += '<label class="campo"><span>' + esc(x.n) + (x.pista ? ' \u00b7 ' + esc(x.pista) : '') + '</span>' +
              '<input type="text" data-marca="' + esc(x.tipo) + '|' + esc(x.id) + '" ' +
              'placeholder="marca y formato"></label>';
    });
    html += '<div class="fila" style="position:sticky; bottom:0; background:var(--blanco); padding-top:10px">' +
            '<button class="btn principal" id="mk-guardar">Guardar</button>' +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    abrirModal(html);

    $("#mk-guardar").addEventListener("click", function () {
      var n = 0;
      $$("#modal [data-marca]").forEach(function (c) {
        var v = c.value.trim();
        if (!v) return;
        var par = c.getAttribute("data-marca").split("|");
        if (par[0] === "hogar") Almacen.guardarHogar(par[1], { n: v });
        else {
          var g = Almacen.ingrediente(par[1]);
          if (g) { g.producto = v; g.editado = true; }
        }
        n++;
      });
      if (n) Almacen.guardar("ingrediente");
      cerrarModal();
      if (alCerrar) alCerrar();
      Util.toast(n ? (n === 1 ? "1 marca puesta" : n + " marcas puestas") : "Nada que guardar");
    });
  }

  /* ==================== HOGAR ====================
     Limpieza, menaje, aseo y mascota. Sin cantidades ni cuentas: se marca lo que
     falta y entra en la lista de la compra. Cada línea ES el producto, con marca
     y formato, porque es ese nombre el que viaja a Amazon. Las que vienen de
     fábrica traen un nombre genérico y salen avisando de que les falta la marca. */
  function ponerFilaDespensa(cual) {
    /* El orden es el de Carlos: primero se coloca (Localización), luego se
       anota lo que hay (¿Lo tengo?) y aparte va lo de la casa (Hogar).
       «Comida» era la pantalla vieja de contar: la sustituye ¿Lo tengo?, que
       hace lo mismo recorriendo el mueble en vez de sólo lo ya apuntado. Se
       deja el bloque por si alguna ruta antigua lo pide. */
    var validas = ["localizacion", "tengo", "pedir", "hogar", "comida"];
    UI.filaDesp = validas.indexOf(cual) >= 0 ? cual : "localizacion";
    var bl = { comida: $("#bloque-desp-comida"), hogar: $("#bloque-desp-hogar"),
               localizacion: $("#bloque-desp-localizacion"), tengo: $("#bloque-desp-tengo"),
               pedir: $("#bloque-desp-pedir") };
    Object.keys(bl).forEach(function (k) { if (bl[k]) bl[k].hidden = UI.filaDesp !== k; });
    $$("#selector-despensa [data-desp]").forEach(function (b) {
      b.classList.toggle("principal", b.getAttribute("data-desp") === UI.filaDesp);
    });
    if (UI.filaDesp === "pedir") pintarPedir();
    else if (UI.filaDesp === "hogar") pintarHogar();
    else if (UI.filaDesp === "localizacion") pintarLocalizacion();
    else if (UI.filaDesp === "tengo") pintarLoTengo();
    else pintarDespensa();
  }

  /* ==================== CÓMO SE PIDE CADA COSA ====================
     El gestor. Nace el 25-sep-2026 de una frase suya —«vamos a crear el gestor,
     el contenedor y el método; luego repasamos los ingredientes a cada grupo y
     forma de pedir que le corresponda»— y de un número: de las 235 fichas
     visibles, 71 (el 30 %) no las pide ninguna receta y no tienen mínimo, o sea
     que NUNCA entran solas en una lista. Todo eso se compraba de memoria.

     AGRUPADO POR CONTENEDOR, que es el eje que eligió él. No es estético: es lo
     único que permite decidir por lotes —«todas las latas de bebida, no debe
     faltar»— y es la regla de diseño que más le importa, porque sus proyectos
     se le mueren cuando el sistema exige una decisión por elemento. Por eso la
     forma se aplica DESDE LA CABECERA del grupo a todo lo que se ve, y la fila
     de cada ficha está para la excepción, no para el trabajo.

     Y por eso el contenedor va primero en el orden: las 68 fichas sin formato
     salen arriba, porque sin contenedor no hay ni piezas ni lote ni mínimo. */
  function pintarPedir() {
    var cont = $("#rejilla-pedir");
    if (!cont) return;
    var g = Almacen.gestorPedir(UI.buscaPedir || "");
    var fil = UI.filtroPedir || "";
    var MOD = Almacen.MODOS_PEDIR;

    /* El marcador de arriba: cuántas van por cada forma, sobre el total. Es la
       barra de progreso del repaso — cuando «sin decidir» llegue a cero, está. */
    var sinDecidir = 0;
    g.grupos.forEach(function (gr) {
      gr.fichas.forEach(function (f) { if (!f.puesto) sinDecidir++; });
    });
    var tot = g.cuenta.menu + g.cuenta.minimo + g.cuenta.capricho + g.cuenta.nunca;
    var cab = '<div class="tarjeta pedir-marcador"><div class="pedir-cuentas">' +
      MOD.map(function (m) {
        return '<div class="pedir-cuenta ' + m.k + '"><b>' + g.cuenta[m.k] + "</b><span>" +
          esc(m.n) + "</span></div>";
      }).join("") +
      "</div>" +
      '<div class="nota-peque">' + tot + " fichas. " +
      (sinDecidir
        ? "<b>" + sinDecidir + " sin decidir todavía</b>: van por lo que la app deduce."
        : "Todas decididas por ti.") + "</div></div>";

    if (!g.grupos.length) { cont.innerHTML = cab + '<div class="vacio">Nada con ese nombre.</div>'; return; }

    var html = cab;
    g.grupos.forEach(function (gr) {
      var fichas = gr.fichas.filter(function (f) {
        if (!fil) return true;
        if (fil === "sinponer") return !f.puesto;
        return f.modo === fil;
      });
      if (!fichas.length) return;
      var abierto = !!UI.grupoPedir[gr.k || "_"];
      var ids = fichas.map(function (f) { return f.id; }).join(",");

      html += '<div class="grupo-pedir' + (gr.k ? "" : " sin-formato") + '">' +
        '<button type="button" class="grupo-cab" data-grupopedir="' + esc(gr.k || "_") + '">' +
          '<div class="datos"><div class="nombre">' + esc(gr.n) +
            (gr.k ? "" : ' <span class="etiqueta">falta ponerlo</span>') + "</div>" +
            '<div class="detalle">' + fichas.length +
              (fichas.length === 1 ? " ficha" : " fichas") + " · " +
              MOD.filter(function (m) { return gr.modos[m.k]; }).map(function (m) {
                return gr.modos[m.k] + " " + m.n.toLowerCase();
              }).join(" · ") + "</div></div>" +
          '<div class="ir">' + (abierto ? "&#9662;" : "&rsaquo;") + "</div></button>";

      if (abierto) {
        /* LA CABECERA DE LOTE. Aquí es donde se hace el trabajo de verdad: una
           pulsada pone la forma a las que se estén viendo. La fila de abajo es
           para la excepción. */
        html += '<div class="lote-pedir"><span class="nota-peque">Poner las ' +
          fichas.length + " a:</span>" +
          MOD.map(function (m) {
            return '<button type="button" class="btn mini lote-' + m.k +
              '" data-lotepedir="' + esc(m.k) + "|" + esc(ids) + '">' + esc(m.n) + "</button>";
          }).join("") +
          (gr.k ? "" : "") + "</div>";

        fichas.forEach(function (f) {
          html += '<div class="linea linea-pedir' + (f.puesto ? " puesta" : "") + '">' +
            '<div class="datos"><div class="nombre">' + esc(f.n) + "</div>" +
            '<div class="detalle">' + esc(f.cat || "") +
              (f.platos ? " · en " + f.platos + (f.platos === 1 ? " receta" : " recetas")
                        : ' · <b>en ninguna receta</b>') +
              (f.modo === "minimo"
                ? " · mínimo " + cifra(f.minimo) + ", lote " + cifra(f.lote)
                : "") +
              (f.puesto ? "" : " · deducido") + "</div></div>" +
            '<div class="modos">' +
              MOD.map(function (m) {
                return '<button type="button" class="btn mini modo-' + m.k +
                  (f.modo === m.k ? " activo" : "") + '" data-modopedir="' + esc(f.id) + "|" + m.k +
                  '" title="' + esc(m.c) + '">' + esc(m.n) + "</button>";
              }).join("") +
            "</div>" +
            (f.modo === "minimo"
              ? '<div class="minlote"><label>Mínimo<input type="number" min="0" step="0.5" ' +
                'data-minpedir="' + esc(f.id) + '" value="' + f.minimo + '"></label>' +
                '<label>Lote<input type="number" min="1" step="1" ' +
                'data-lotenum="' + esc(f.id) + '" value="' + (f.lote || 1) + '"></label>' +
                '<span class="nota-peque">' +
                  (f.pieza > 1 ? "cada una son " + esc(Util.cantidadReceta(f.pieza, f.u, f.pesoUd)) : "") +
                "</span></div>"
              : "") +
            "</div>";
        });

        if (!gr.k) {
          /* Las que no tienen contenedor: aquí mismo se les pone, en lote. */
          html += '<div class="lote-pedir formato"><span class="nota-peque">Ponerles contenedor:</span>' +
            Object.keys(Almacen.FORMATOS).map(function (k) {
              var ff = Almacen.FORMATOS[k];
              return '<button type="button" class="btn mini" data-loteformato="' + esc(k) + "|" + esc(ids) +
                '">' + esc(ff.n[1]) + "</button>";
            }).join("") + "</div>";
        }
      }
      html += "</div>";
    });
    cont.innerHTML = html;
  }

  /* ==================== ¿LO TENGO? ====================
     El recorrido de la casa, de la nevera a la alacena, para anotar lo que hay
     ANTES de planificar. Tres respuestas, las mismas que la pasada de antes de
     comprar, y por el mismo motivo: «hay» y «no queda» resuelven casi todo, y
     «queda algo» está para lo único que una marca no puede decir —la media
     pizza, los 200 g que quedan en la bolsa de avena.

     NO SE REPINTA AL CONTESTAR. Con doscientas líneas, rehacer la lista cierra
     el estante que estás mirando y te devuelve arriba. (Carlos, 24-sep-2026,
     sobre la pantalla de Localización: «podemos hacer que donde escribo se
     quede, y que cierre y haga scroll yo».) Vale igual aquí. */
  function btnTengo(id, r, activo, txt) {
    return '<button type="button" class="btn mini pas-b' + (activo ? " activo" : "") +
      '" data-tengo="' + esc(id) + ':' + r + '">' + txt + "</button>";
  }

  /* TRES NIVELES, NINGUNA CIFRA. Carlos, 24-sep-2026: «yo creo que sólo iré
     marcando lo que haya algo… veo el producto y lo anoto con más o menos la
     cantidad: poco / suficiente / mucho».
     Es la respuesta buena a su propia pega sobre llevar stock —«siempre acaba
     con regularizaciones y errores»—: un número exacto que nadie va a mantener
     miente; tres niveles que se ven de un vistazo, no. Y lo que NO está marcado
     es lo que no hay, así que la pasada consiste en ir marcando, no en
     contestar doscientas preguntas. */
  /* La lista habla el mismo idioma que el pase (25-sep-2026): fracciones del
     envase, que es lo que ves al abrirlo. La lista sirve para retocar una cosa
     suelta sin pasar el estante entero; el pase es para la pasada de verdad. */
  var NIVELES = [
    { k: "cuarto", n: "Cuarto" },
    { k: "mitad",  n: "Mitad" },
    { k: "lleno",  n: "Lleno" }
  ];

  function detalleTengo(x, donde) {
    var d;
    if (x.pte === "corto") d = '<span style="color:var(--ambar)">se gastó más de lo apuntado</span>';
    else if (!x.anotado && !x.nivel) d = "sin marcar";
    else if (!(x.piezas > 0)) d = "no hay";
    else {
      /* LO QUE HAY, NO UN NIVEL. La lista decía «queda contado» y ofrecía
         cuarto/mitad/lleno aunque ya hubieras contado dos botellas: ni enseñaba
         tu cifra ni había forma de que cuadrara con ella. (Carlos, 25-sep-2026:
         «como ya he contado debería poner lo que hay».) */
      /* media botella es «botella», no «botellas» */
      d = cifra(x.piezas) + " " + (x.piezas <= 1 ? x.piezaUno : x.piezaVarias);
      if (x.pieza > 1 && !x.piezaUd)
        d += " · " + esc(Util.cantidadReceta(x.piezas * x.pieza, x.u, x.pesoUd));
      if (x.comprometido > 0) d += " · el menú pide " +
        esc(Util.cantidadReceta(x.comprometido, x.u, x.pesoUd));
      if (x.dias !== null) d += " · " + (x.dias === 0 ? "hoy" : "hace " + x.dias + " d");
    }
    if (donde) d += ' <span class="donde">· ' + esc(donde) + "</span>";
    return d;
  }

  /* La línea de la lista lleva el mismo control que la ficha —menos, cifra,
     más—, para poder retocar una cosa suelta sin entrar en el pase. */
  /* UNA LÍNEA POR COSA, QUE PAREZCA UNA LISTA. Cada fila era una tarjeta con
     los botones en un renglón aparte y ocupaba lo mismo que una ficha del
     pase; con dieciséis en la puerta, eso es scroll para nada. (Carlos,
     25-sep-2026: «debería ocupar menos… que parezca una lista».)
     Ahora: nombre y estado a la izquierda, y a la derecha el mismo − cifra +.
     Todo en un renglón. */
  function lineaTengo(x, donde) {
    var paso = x.piezaUd ? 1 : 0.5;
    return '<div class="linea linea-tengo' + (x.piezas > 0 ? " anotada" : "") +
      '" data-tengofila="' + esc(x.id) + '">' +
      '<div class="datos"><div class="nombre">' + esc(x.n) + "</div>" +
      '<div class="detalle">' + detalleTengo(x, donde) + "</div></div>" +
      '<div class="paso">' +
        '<button type="button" class="btn mini" data-cuentapaso="' + esc(x.id) + "|" + (-paso) + '">−</button>' +
        '<span class="cuenta-lista">' + cifra(x.piezas || 0) + "</span>" +
        '<button type="button" class="btn mini" data-cuentapaso="' + esc(x.id) + "|" + paso + '">+</button>' +
      "</div></div>";
  }

  function repasoTxt(e) {
    return e.dias === null ? "sin repasar"
      : (e.dias === 0 ? "repasado hoy" : "repasado hace " + e.dias + " d");
  }

  function indiceTengo() {
    var r = Almacen.estadoRonda();
    var h = '<div class="ronda-cab">' +
      (r.ronda === Util.hoyISO()
        ? '<div class="ronda-tit">Ronda de hoy</div><div class="ronda-sub">' +
          r.hechos + " de " + r.total + " estantes" +
          (r.saltados ? " · " + r.saltados + (r.saltados === 1 ? " dado" : " dados") + " por visto" : "") +
          "</div>"
        : '<div class="ronda-tit">Sin ronda empezada</div><div class="ronda-sub">' +
          "Lo apuntado sigue valiendo; empezar una ronda sólo pone los estantes a cero.</div>") +
      '<button type="button" class="btn" id="ronda-empezar">' +
        (r.ronda === Util.hoyISO() ? "Empezar otra ronda" : "Empezar una ronda") + "</button>" +
      '<div class="ronda-pie"><button type="button" class="btn mini borrar" id="ronda-borrar">' +
        "Borrar todo lo apuntado</button></div></div>";

    var zona = "";
    r.estantes.forEach(function (e) {
      if (e.zona !== zona) { zona = e.zona; h += '<h4 class="estante zona-tit">' + esc(zona) + "</h4>"; }
      var estado = e.hecho
        ? (e.saltado ? "dado por visto hoy" : "repasado hoy")
        : (e.dias === null ? "sin repasar nunca" : "hace " + e.dias + " d");
      h += '<div class="linea fila-estante' + (e.hecho ? " hecha" : "") + '">' +
        '<button type="button" class="ir-estante" data-irestante="' + esc(e.k) + '">' +
          '<div class="datos"><div class="nombre">' + esc(e.n) + "</div>" +
          '<div class="detalle">' + esc(estado) + "</div></div>" +
          '<div class="cuantas">' + e.fichas + "</div>" +
          '<div class="ir">' + (e.hecho ? "&#10003;" : "&rsaquo;") + "</div></button>" +
        (e.hecho ? "" : '<button type="button" class="btn mini visto" data-porvisto="' + esc(e.k) +
          '" title="No lo voy a abrir: sigue como estaba">Por visto</button>') +
        "</div>";
    });
    return h;
  }

  /* La confirmación del estante: su tamaño, cuándo se repasó, y las tres
     salidas. Es el «confirmas» que pedía Carlos, y es donde vive la elección
     entre pasar ficha a ficha y ver la lista de golpe. */
  function pintarConfirmaEstante() {
    var cont = $("#rejilla-tengo");
    var p = Almacen.pase(UI.pase.estante);
    if (!p) { UI.pase.vista = "indice"; return pintarLoTengo(); }
    var regs = {};
    p.fichas.forEach(function (f) { regs[f.formato] = (regs[f.formato] || 0) + 1; });
    var comoSeMide = Object.keys(regs).sort(function (a, b) { return regs[b] - regs[a]; })
      .slice(0, 4).map(function (k) {
        var ff = Almacen.FORMATOS[k];
        return regs[k] + " " + (regs[k] === 1 ? ff.n[0] : ff.n[1]);
      });
    cont.innerHTML =
      '<div class="pase-portada">' +
        '<div class="zona">' + esc(p.zona) + "</div>" +
        "<h2>" + esc(p.estante) + "</h2>" +
        '<div class="cuenta"><b>' + p.total + "</b> " + (p.total === 1 ? "ficha" : "fichas") +
          (comoSeMide.length ? " · " + esc(comoSeMide.join(" · ")) : "") + "</div>" +
        '<div class="cuando">' + (p.dias === null ? "Sin repasar nunca"
          : (p.dias === 0 ? "Repasado hoy" : "Repasado hace " + p.dias + " d")) + "</div>" +
        '<button type="button" class="btn grande" data-paseempezar="1">Empezar</button>' +
        '<div class="otras">' +
          '<button type="button" class="btn mini" data-paselista="1">Ver la lista</button>' +
          '<button type="button" class="btn mini" data-porvisto="' + esc(p.estanteK) + '">Darlo por visto</button>' +
          '<button type="button" class="btn mini" data-pasesalir="1">Volver</button>' +
        "</div></div>";
  }

  /* ---------- LA FICHA ----------
     Una cosa, en el centro, y los botones grandes abajo donde llega el pulgar.
     Lo que lleva y por qué:
       el producto concreto  -> para reconocerlo en el estante
       lo que el menú pide   -> es lo que hace que marcarlo sirva de algo
       qué significa el nivel-> «suficiente = un bote ≈ 13 platos» (Carlos, 25-sep)
       los platos que lo usan-> y son además lo que BLOQUEA el borrado
     Lo que NO lleva: kcal, sal y precio. No cambian la respuesta y hay que
     leer ciento treinta pantallas. */
  function pintarFicha() {
    var cont = $("#rejilla-tengo");
    var p = Almacen.pase(UI.pase.estante);
    if (!p || !p.fichas.length) { UI.pase.vista = "indice"; return pintarLoTengo(); }
    if (UI.pase.i >= p.fichas.length) { UI.pase.vista = "fin"; return pintarFinEstante(); }
    var x = p.fichas[UI.pase.i];
    var pct = Math.round(UI.pase.i / p.fichas.length * 100);

    var contexto = x.comprometido > 0
      ? '<div class="pide">El menú ya pide <b>' +
        esc(Util.cantidadReceta(x.comprometido, x.u, x.pesoUd)) + "</b></div>"
      : (x.platos.length
          ? '<div class="pide flojo">Sale en ' + x.platos.length +
            (x.platos.length === 1 ? " plato" : " platos") + ", ninguno planificado</div>"
          : '<div class="pide flojo">No entra en ninguna receta</div>');

    /* UNA SOLA MANERA DE CONTESTAR: cuántos envases hay. «Medio bote» son 0,5
       botes y «dos latas» son 2 latas — es la misma pregunta. Lo que cambia con
       el formato son los atajos, porque en un tarro quieres cuartos y en las
       latas quieres docenas. (Carlos, 25-sep.) */
    var n = x.piezas || 0;
    var paso = x.piezaUd ? 1 : 0.5;
    var quiero = Almacen.quiereEstaVez(x.id);
    var botones = '<div class="cuenta-fila">' +
      '<button type="button" class="btn redondo" data-cuentapaso="' + esc(x.id) + "|" + (-paso) + '">−</button>' +
      '<div class="cifra"><b>' + cifra(n) + "</b><span>" +
        esc(n <= 1 ? x.piezaUno : x.piezaVarias) + "</span></div>" +
      '<button type="button" class="btn redondo" data-cuentapaso="' + esc(x.id) + "|" + paso + '">+</button>' +
      "</div>" +
      '<div class="atajos">' + x.atajos.map(function (v) {
        return '<button type="button" class="btn mini' + (n === v ? " activo" : "") +
          '" data-cuenta="' + esc(x.id) + "|" + v + '">' + cifra(v) + "</button>";
      }).join("") + "</div>" +
      (x.pieza > 1 && !x.piezaUd
        ? '<div class="quees">cada ' + esc(x.piezaUno) + " son " +
          esc(Util.cantidadReceta(x.pieza, x.u, x.pesoUd)) +
          (x.porEnvase >= 2 && x.porEnvase <= 60
            ? ", para " + Math.round(x.porEnvase) + " platos" : "") + "</div>"
        : "") +
      '<button type="button" class="btn grande" data-pasesig="' + esc(x.id) + "|" + n +
        '">Apuntar y seguir</button>' +
      /* «LO QUIERO ESTA VEZ», DESDE LA FICHA. Estás mirando el estante, ves que
         quedan dos cervezas y decides que esta semana quieres más: el momento de
         decirlo es éste, no dentro de tres pantallas. Es un interruptor, no un
         mínimo: entra en la próxima lista y al confirmar la compra se olvida. */
      '<button type="button" class="btn mini quierolo' + (quiero ? " activo" : "") +
        '" data-quiero="' + esc(x.id) + '">' +
        (quiero ? "\u2713 lo quieres esta vez" : "Lo quiero esta vez") + "</button>";

    cont.innerHTML =
      '<div class="ficha-pase">' +
        '<div class="ficha-cab">' +
          /* Atrás Y ADELANTE. Sólo había atrás, y apenas se veía. Carlos,
             25-sep-2026: «debería permitir avanzar y atrasar para comprobar
             cosas». Pasar de largo no contesta nada ni sella el estante: sólo
             mueve la ficha, para poder mirar sin tocar. */
          '<button type="button" class="btn nav" data-paseatras="1"' +
            (UI.pase.i ? "" : " disabled") + ' aria-label="Anterior">&#8249;</button>' +
          '<div class="donde">' + esc(p.estante) + "<span>" + (UI.pase.i + 1) +
            " de " + p.fichas.length + "</span></div>" +
          '<button type="button" class="btn nav" data-pasedelante="1"' +
            (UI.pase.i + 1 < p.fichas.length ? "" : " disabled") + ' aria-label="Siguiente">&#8250;</button>' +
          '<button type="button" class="btn mini" data-pasesalir="1">Salir</button>' +
        "</div>" +
        '<div class="barra"><span style="width:' + pct + '%"></span></div>' +
        '<div class="ficha-cuerpo">' +
          "<h2>" + esc(x.n) + "</h2>" +
          (x.producto ? '<div class="producto">' + esc(x.producto) + "</div>" : "") +
          contexto +
          botones +
          (x.marcada ? '<div class="ultima">' + (x.dias === 0 ? "Apuntado hoy"
            : "Apuntado hace " + x.dias + " d") + "</div>" : "") +
        "</div>" +
        '<div class="ficha-pie">' +
          (x.platos.length
            ? '<details class="usos"><summary>Sale en ' + x.platos.length +
              (x.platos.length === 1 ? " plato" : " platos") + "</summary>" +
              x.platos.map(function (pl) {
                var cola = pl.planificado ? ' <b>· planificado</b>'
                  : (pl.comido ? ' <span class="comido">· comido el ' +
                     esc(Util.etiquetaFecha(pl.comido)) + "</span>" : "");
                return '<div class="uso' + (pl.planificado ? " planificado" : "") +
                  (pl.comido ? " yacomido" : "") + '">' + esc(pl.n) + cola + "</div>";
              }).join("") + "</details>"
            : "") +
          (x.borrable
            ? '<button type="button" class="btn mini borrar" data-paseborrar="' + esc(x.id) +
              '">Ya no lo compro</button>'
            : '<div class="nota-peque bloqueado">Para quitarlo de tu casa hay que cambiar antes ' +
              (x.platos.length === 1 ? "el plato que lo usa" : "los " + x.platos.length + " platos que lo usan") +
              "</div>") +
        "</div>" +
      "</div>";
  }

  /* Medio brik se escribe «½» y un cuarto «¼», no «0.5» y «0.3». */
  var QUEBRADOS = { 0.25: "\u00bc", 0.5: "\u00bd", 0.75: "\u00be",
                    1.25: "1\u00bc", 1.5: "1\u00bd", 1.75: "1\u00be",
                    2.5: "2\u00bd", 3.5: "3\u00bd" };
  function cifra(v) {
    if (QUEBRADOS[v]) return QUEBRADOS[v];
    var n = Math.round(v * 100) / 100;
    return String(n).replace(".", ",");
  }

  function pintarFinEstante() {
    var cont = $("#rejilla-tengo");
    var p = Almacen.pase(UI.pase.estante);
    if (!p) { UI.pase.vista = "indice"; return pintarLoTengo(); }
    var sig = Almacen.estanteSiguiente(UI.pase.estante);
    var sigN = "";
    if (sig) Almacen.ZONAS.forEach(function (z) {
      z.estantes.forEach(function (e) { if (e.k === sig) sigN = e.n; }); });
    cont.innerHTML =
      '<div class="pase-portada fin">' +
        '<div class="tic">&#10003;</div>' +
        "<h2>" + esc(p.estante) + " repasado</h2>" +
        '<div class="cuenta"><b>' + p.conAlgo + "</b> con algo · <b>" +
          (p.marcadas - p.conAlgo) + "</b> sin nada · <b>" +
          (p.total - p.marcadas) + "</b> sin mirar</div>" +
        (sig ? '<button type="button" class="btn grande" data-irestante="' + esc(sig) +
               '">Seguir con ' + esc(sigN) + "</button>" : "") +
        '<div class="otras"><button type="button" class="btn mini" data-pasesalir="1">Volver a los estantes</button></div>' +
      "</div>";
  }

  /* Avanzar es la operación del pase: se marca y se pasa. Si era la última del
     estante, el estante queda sellado y sale el resumen. */
  function avanzarFicha() {
    var p = Almacen.pase(UI.pase.estante);
    if (!p) { UI.pase.vista = "indice"; return pintarLoTengo(); }
    UI.pase.i++;
    if (UI.pase.i >= p.fichas.length) {
      Almacen.marcarMirado(UI.pase.estante);
      UI.pase.vista = "fin";
    }
    pintarLoTengo();
  }

  function barraTengo(zonas, est, zon) {
    var op = "";
    zonas.forEach(function (z) {
      var con = z.estantes.filter(function (e) { return e.ing.length; });
      if (!con.length) return;
      op += '<optgroup label="' + esc(z.n) + '">';
      con.forEach(function (e) {
        op += '<option value="' + esc(e.k) + '"' + (e.k === est.k ? " selected" : "") +
          ">" + esc(e.n) + " (" + e.anotados + "/" + e.ing.length + ")</option>";
      });
      op += "</optgroup>";
    });
    return '<div class="tengo-barra">' +
      '<button type="button" class="btn mini" data-tengovolver="1">&lsaquo; Estantes</button>' +
      '<select class="loc-sel" id="salto-estante" aria-label="Ir a otro estante">' + op + "</select>" +
      "</div>" +
      '<h4 class="estante zona-tit">' + esc(zon.n) + " · " + esc(est.n) +
      '<span data-repaso="1">' + repasoTxt(est) + "</span></h4>";
  }

  /* ==================== EL PASE FICHA A FICHA ====================
     Carlos, 25-sep-2026, idea nocturna: «¿Lo tengo? es un pase de fichas que
     pasa de una a otra al marcar el producto. Un botón de iniciar, primera
     ventana Nevera, confirmar, siguiente ventana Estante superior, confirmas,
     ingrediente 1… y así hasta pasar por todo».

     Cuatro pantallas, y el estado cabe en tres datos: qué vista, qué estante y
     por qué ficha vas.
       indice   la ronda: los doce estantes y cómo va cada uno
       estante  la confirmación: «Puerta, 11 fichas» + empezar / lista / por visto
       ficha    una sola cosa, sus botones, y al marcar salta a la siguiente
       fin      el resumen del estante y el salto al siguiente

     POR QUÉ UN ESTANTE Y NO LA CASA ENTERA (decisión suya): la nevera son 61
     fichas y su puerta 11. Un túnel largo es como se le han muerto otros
     proyectos, y además, si lo dejas en la ficha 60, las que quedan cuentan
     como «no hay» y la compra las pide todas creyendo tú que hiciste la pasada.
     Sellando estante a estante, lo que no terminas se ve sin terminar. */
  /* ==================== EL PASE FICHA A FICHA ====================
     Carlos, 25-sep-2026, idea nocturna: «¿Lo tengo? es un pase de fichas que
     pasa de una a otra al marcar el producto. Un botón de iniciar, primera
     ventana Nevera, confirmar, siguiente ventana Estante superior, confirmas,
     ingrediente 1… y así hasta pasar por todo».

     Cuatro pantallas, y el estado cabe en tres datos: qué vista, qué estante y
     por qué ficha vas.
       indice   la ronda: los doce estantes y cómo va cada uno
       estante  la confirmación: «Puerta, 11 fichas» + empezar / lista / por visto
       ficha    una sola cosa, sus botones, y al marcar salta a la siguiente
       fin      el resumen del estante y el salto al siguiente

     POR QUÉ UN ESTANTE Y NO LA CASA ENTERA (decisión suya): la nevera son 61
     fichas y su puerta 11. Un túnel largo es como se le han muerto otros
     proyectos, y además, si lo dejas en la ficha 60, las que quedan cuentan
     como «no hay» y la compra las pide todas creyendo tú que hiciste la pasada.
     Sellando estante a estante, lo que no terminas se ve sin terminar. */
  function pintarLoTengo() {
    var cont = $("#rejilla-tengo");
    if (!cont) return;
    var bloque = $("#bloque-desp-tengo");
    if (bloque) bloque.classList.toggle("en-pase", UI.pase.vista !== "indice");
    if (UI.pase.vista === "ficha")   return pintarFicha();
    if (UI.pase.vista === "estante") return pintarConfirmaEstante();
    if (UI.pase.vista === "fin")     return pintarFinEstante();
    var q = sinTildes((UI.buscaTengo || "").trim().toLowerCase());
    var zonas = Almacen.recorrido();

    /* buscar manda sobre el estante: se busca en toda la casa y cada resultado
       dice dónde vive */
    if (q) {
      var html = "", n = 0;
      zonas.forEach(function (z) {
        z.estantes.forEach(function (e) {
          e.ing.forEach(function (i) {
            if (sinTildes(i.n.toLowerCase()).indexOf(q) < 0) return;
            n++; html += lineaTengo(i, z.n + " · " + e.n);
          });
        });
      });
      cont.innerHTML = n
        ? '<div class="nota-peque" style="margin:0 13px 8px">' + n +
          (n === 1 ? " ingrediente" : " ingredientes") + " con ese nombre</div>" + html
        : '<div class="vacio">Nada con ese nombre.</div>';
      return;
    }

    var est = null, zon = null;
    zonas.forEach(function (z) {
      z.estantes.forEach(function (e) { if (e.k === UI.estanteTengo) { est = e; zon = z; } });
    });

    var hay = zonas.some(function (z) { return z.total > 0; });
    if (!hay) {
      cont.innerHTML = '<div class="vacio">No hay nada colocado todavía. ' +
        "Coloca los ingredientes en Localización y aparecerán aquí.</div>";
      return;
    }
    if (!est || !est.ing.length) { UI.estanteTengo = null; cont.innerHTML = indiceTengo(zonas); return; }
    cont.innerHTML = barraTengo(zonas, est, zon) +
      est.ing.map(function (i) { return lineaTengo(i); }).join("");
  }

  /* Cambiar de estante o volver al índice sin quedarse a media pantalla. */
  function irEstanteTengo(k) {
    UI.estanteTengo = k || null;
    if ($("#buscar-tengo") && UI.buscaTengo) { UI.buscaTengo = ""; $("#buscar-tengo").value = ""; }
    pintarLoTengo();
    /* `scrollIntoView` deja el contenedor a cero y la cabecera pegada se lo
       come: al entrar en un estante la primera línea quedaba debajo del verde.
       Se descuenta la altura de la cabecera más un respiro. */
    var c = $("#rejilla-tengo");
    if (!c) return;
    try {
      var y = c.getBoundingClientRect().top + (window.pageYOffset || 0) - 58;
      window.scrollTo({ top: y > 0 ? y : 0 });
    } catch (e) {}
  }

  /* Los contadores al vuelo, sin rehacer la lista. */
  /* La cuenta del estante vive en el propio desplegable —«Puerta (3/11)»—, que
     está pegado arriba: así se ve cómo va la pasada sin dejar de marcar y sin
     un segundo contador que diga lo mismo. */
  function contadoresTengo() {
    var est = null;
    Almacen.recorrido().forEach(function (z) {
      z.estantes.forEach(function (e) { if (e.k === UI.estanteTengo) est = e; });
    });
    if (!est) return;
    var op = document.querySelector('#salto-estante option[value="' + est.k + '"]');
    if (op) op.textContent = est.n + " (" + est.anotados + "/" + est.ing.length + ")";
    var r = document.querySelector('#rejilla-tengo [data-repaso]');
    if (r) r.textContent = repasoTxt(est);
  }

  /* Refresca SOLO esa línea: el detalle y qué botón queda encendido. */
  /* Refresca SOLO esa línea: el detalle y qué nivel queda encendido. */
  function refrescarLineaTengo(id) {
    var fila = document.querySelector('[data-tengofila="' + id + '"]');
    if (!fila) return;
    var x = null;
    Almacen.recorrido().forEach(function (z) {
      z.estantes.forEach(function (e) {
        e.ing.forEach(function (i2) { if (i2.id === id) x = i2; });
      });
    });
    if (!x) return;
    var det = fila.querySelector(".detalle");
    if (det) det.innerHTML = detalleTengo(x);
    fila.classList.toggle("anotada", x.piezas > 0);
    var c = fila.querySelector(".cuenta-lista");
    if (c) c.textContent = cifra(x.piezas || 0);
    contadoresTengo();
  }

  /* ==================== LOCALIZACIÓN ====================
     El recorrido de su cocina: tres zonas y quince estantes, dictados por él el
     24-sep-2026 después de colocar las 209 fichas una a una. Aquí es donde se
     coloca lo que llega nuevo y donde se corrige lo que esté donde no es.

     PENDIENTE VA ARRIBA Y NO SE PUEDE PLEGAR. Es el único bloque que pide algo:
     mientras haya algo ahí, hay ingredientes que la app no sabe dónde buscar, y
     eso se nota en la pasada de la despensa y en la lista de la compra. */
  function lineaLoc(g, estanteActual) {
    var av = (locAvisos || {})[g.id];
    return '<div class="linea linea-loc" data-locfila="' + esc(g.id) + '">' +
      '<div class="datos"><div class="nombre">' + esc(g.n) + '</div>' +
      '<div class="detalle">' + esc(g.cat) +
        (av ? ' · <b style="color:var(--ambar)">lo usa ' + esc(av.platos.slice(0, 2).join(", ")) +
              (av.platos.length > 2 ? " y " + (av.platos.length - 2) + " más" : "") + '</b>' : "") +
      '</div></div>' +
      '<select class="loc-sel" data-loc="' + esc(g.id) + '" aria-label="Dónde se guarda ' + esc(g.n) + '">' +
        '<option value=""' + (estanteActual ? "" : " selected") + '>— sin colocar —</option>' +
        Almacen.ZONAS.map(function (z) {
          return '<optgroup label="' + esc(z.n) + '">' +
            z.estantes.map(function (e) {
              return '<option value="' + esc(e.k) + '"' +
                (e.k === estanteActual ? " selected" : "") + '>' + esc(e.n) + '</option>';
            }).join("") + '</optgroup>';
        }).join("") +
      '</select></div>';
  }

  var locAvisos = null;

  /* Los números, al vuelo y sin rehacer la lista: cuántos quedan sin colocar y
     cuántos hay en cada zona. Lo que ya está en pantalla no se toca. */
  function contadoresLoc() {
    var pend = Almacen.sinColocar().length;
    var cab = document.querySelector("#rejilla-loc .pendiente .cuantas");
    if (cab) { cab.textContent = pend || "—"; cab.classList.toggle("avisa", !!pend); }
    var txt = document.querySelector("#rejilla-loc .pendiente .aviso-grupo");
    if (txt && pend) {
      var av = Object.keys(Almacen.avisoSinSitio()).length;
      txt.innerHTML = pend + " sin sitio" +
        (av ? ' · <b style="color:var(--ambar)">' + av + " ya están en platos planificados</b>" : "");
    } else if (txt) {
      txt.textContent = "Todo colocado. Lo que des de alta a partir de ahora aparecerá aquí.";
    }
    var casa = (Almacen.estado.ingredientes || []).filter(function (g) {
      return !g.oculta && g.cat !== "Restaurante y bar";
    });
    Almacen.ZONAS.forEach(function (z) {
      var n = casa.filter(function (g) {
        var k = Almacen.sitioDe(g);
        return z.estantes.some(function (e) { return e.k === k; });
      }).length;
      var d = document.querySelector('#rejilla-loc [data-zona="' + z.k + '"] .cuantas');
      if (d) d.textContent = n || "—";
    });
  }

  function pintarLocalizacion() {
    var cont = $("#rejilla-loc");
    if (!cont) return;
    var q = sinTildes((UI.buscaLoc || "").trim().toLowerCase());
    var casa = (Almacen.estado.ingredientes || []).filter(function (g) {
      return !g.oculta && g.cat !== "Restaurante y bar";
    });
    var filtra = function (l) {
      return q ? l.filter(function (g) { return sinTildes(g.n.toLowerCase()).indexOf(q) >= 0; }) : l;
    };
    locAvisos = Almacen.avisoSinSitio();

    var pend = filtra(Almacen.sinColocar());
    var enAvisos = Object.keys(locAvisos).length;
    var html = "";

    /* --- lo que no tiene sitio --- */
    html += '<section class="grupo-selec zona-loc pendiente"' + (pend.length ? " open" : "") + '>' +
      '<div class="cab-zona"><span class="tit">Pendiente</span>' +
      '<span class="cuantas' + (pend.length ? " avisa" : "") + '">' + (pend.length || "—") + "</span></div>";
    if (!pend.length) {
      html += '<p class="aviso-grupo">Todo colocado. Lo que des de alta a partir de ahora aparecerá aquí.</p>';
    } else {
      html += '<p class="aviso-grupo">' + pend.length + ' sin sitio' +
        (enAvisos ? ' · <b style="color:var(--ambar)">' + enAvisos +
          " ya están en platos planificados</b>" : "") + '</p>';
      pend.forEach(function (g) { html += lineaLoc(g, ""); });
    }
    html += "</section>";

    /* --- las tres zonas, en su orden --- */
    Almacen.ZONAS.forEach(function (z) {
      var deZona = z.estantes.map(function (e) {
        return { e: e, ing: filtra(casa.filter(function (g) { return Almacen.sitioDe(g) === e.k; })) };
      });
      var total = deZona.reduce(function (a, x) { return a + x.ing.length; }, 0);
      if (q && !total) return;
      var abierta = q ? true : UI.zonaAbierta === z.k;
      html += '<details class="grupo-selec zona-loc"' + (abierta ? " open" : "") +
        ' data-zona="' + esc(z.k) + '"><summary><span class="tit">' + esc(z.n) + "</span>" +
        '<span class="cuantas">' + (total || "—") + "</span></summary>";
      deZona.forEach(function (x) {
        html += '<h4 class="estante">' + esc(x.e.n) +
          '<span>' + (x.ing.length || "vacío") + "</span></h4>";
        x.ing.forEach(function (g) { html += lineaLoc(g, x.e.k); });
      });
      html += "</details>";
    });
    cont.innerHTML = html;
  }

  function pintarHogar() {
    var cont = $("#rejilla-hogar");
    if (!cont) return;
    var q = sinTildes((UI.busquedaHogar || "").trim().toLowerCase());
    var todo = (Almacen.estado.hogarLista || []).filter(function (x) {
      if (x.oculta) return false;
      if (UI.cajonHogar && (x.cajon || "amazon") !== UI.cajonHogar) return false;
      if (q && sinTildes((x.n + " " + (x.generico || "")).toLowerCase()).indexOf(q) < 0) return false;
      return true;
    });
    var html = "", faltan = 0;
    Almacen.APARTADOS.forEach(function (ap) {
      var lista = todo.filter(function (x) { return x.cat === ap.k; });
      if (!lista.length) return;
      lista.sort(function (a, b) { return a.n.localeCompare(b.n); });
      var marcados = lista.filter(function (x) { return Almacen.faltaHogar(x.id); }).length;
      faltan += marcados;
      html += '<details class="grupo-selec"' + (marcados || q ? " open" : "") + '>' +
                '<summary><span class="tit">' + esc(ap.n) + '</span>' +
                '<span class="cuantas">' + (marcados ? marcados + " / " + lista.length : lista.length) + '</span></summary>';
      lista.forEach(function (x) {
        var falta = Almacen.faltaHogar(x.id);
        var cajon = x.cajon || "amazon";
        var det = esc(Almacen.nombreCajon(cajon));
        if (cajon === "suscripcion") det += ' \u00b7 llega sola';
        if (x.suplente) det += ' \u00b7 si no hay: ' + esc(x.suplente);
        if (x.pendiente) det = '<span style="color:var(--ambar)">Ponle tu marca y formato</span> \u00b7 ' + det;
        else if (x.generico) det = esc(x.generico) + ' \u00b7 ' + det;
        html += '<div class="linea linea-hogar' + (falta ? " en-casa" : "") + '">' +
                  '<input type="checkbox" data-falta="' + esc(x.id) + '"' + (falta ? " checked" : "") +
                    ' title="Me falta: a la lista de la compra">' +
                  '<div class="datos"><div class="nombre">' + esc(x.n) + '</div>' +
                  '<div class="detalle">' + det + '</div></div>' +
                  (falta ? '<input type="number" class="stock-cant" data-hcant="' + esc(x.id) + '" min="1" step="1" ' +
                           'value="' + Almacen.cantidadHogar(x.id) + '" style="width:62px; text-align:right" title="Cu\u00e1ntos">' : '') +
                  '<button class="btn mini solo-edicion" data-edithogar="' + esc(x.id) + '">Editar</button>' +
                '</div>';
      });
      html += '</details>';
    });
    cont.innerHTML = html || '<div class="vacio">Nada con esos filtros.</div>';
    var av = $("#hogar-resumen");
    if (av) av.textContent = faltan ? (faltan === 1 ? "1 cosa marcada para la compra" : faltan + " cosas marcadas para la compra") : "";
  }

  /* La ficha de un producto de Hogar. Es donde una línea genérica se convierte
     en la tuya: le pones marca y formato y deja de estar pendiente. */
  function abrirHogar(id) {
    var nuevo = !id;
    var x = nuevo ? { id: "", n: "", cat: "Limpieza", cajon: "amazon", suplente: "" }
                  : Almacen.hogarDe(id);
    if (!x) return;
    var html = '<header><h2>' + (nuevo ? "Producto nuevo" : "Producto") + '</h2>' +
               '<button class="cerrar" data-cerrar>\u00d7</button></header>';
    if (!nuevo && x.pendiente) {
      html += '<p class="nota-peque" style="color:var(--ambar)">Esta l\u00ednea viene de la plantilla y a\u00fan es ' +
              'gen\u00e9rica. P\u00f3nle la marca y el formato que compras t\u00fa: es ese nombre el que se copia a Amazon.</p>';
    }
    html += '<label class="campo"><span>Producto, con marca y formato</span>' +
            '<input type="text" id="hg-n" value="' + esc(x.n) + '" placeholder="Champ\u00fa Head &amp; Shoulders Classic 400 ml"></label>';
    html += '<label class="campo"><span>Si no hay, este otro (opcional)</span>' +
            '<input type="text" id="hg-sup" value="' + esc(x.suplente || "") + '" placeholder="Champ\u00fa Pantene 400 ml"></label>';
    html += '<div class="fila">' +
      '<label class="campo" style="flex:1 1 150px"><span>Apartado</span><select id="hg-cat">' +
        Almacen.APARTADOS.map(function (a2) {
          return '<option value="' + esc(a2.k) + '"' + (x.cat === a2.k ? " selected" : "") + '>' + esc(a2.n) + '</option>';
        }).join("") + '</select></label>' +
      '<label class="campo" style="flex:1 1 150px"><span>D\u00f3nde se compra</span><select id="hg-cajon">' +
        Almacen.CAJONES.map(function (c) {
          return '<option value="' + esc(c.k) + '"' + ((x.cajon || "amazon") === c.k ? " selected" : "") + '>' + esc(c.n) + '</option>';
        }).join("") + '</select></label></div>';
    html += '<p class="nota-peque"><b>Suscripci\u00f3n</b> no sale nunca en la lista: llega sola. Si se acaba antes ' +
            'de tiempo, m\u00e1rcalo como que falta y esa vez sale por Amazon.</p>';
    html += '<div class="fila"><button class="btn principal" id="hg-guardar">Guardar</button>' +
            (nuevo ? '' : '<button class="btn" id="hg-borrar">Quitar de la lista</button>') +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    abrirModal(html);

    $("#hg-guardar").addEventListener("click", function () {
      var n = $("#hg-n").value.trim();
      if (!n) { Util.toast("Ponle nombre al producto"); return; }
      if (nuevo) {
        var id2 = Almacen.crearHogar(n, $("#hg-cat").value, $("#hg-cajon").value);
        if (id2) Almacen.guardarHogar(id2, { suplente: $("#hg-sup").value.trim() });
      } else {
        Almacen.guardarHogar(x.id, { n: n, suplente: $("#hg-sup").value.trim(),
                                     cat: $("#hg-cat").value, cajon: $("#hg-cajon").value });
      }
      cerrarModal(); pintarHogar(); pintarCompra();
      Util.toast("Guardado");
    });
    var bb = $("#hg-borrar");
    if (bb) bb.addEventListener("click", function () {
      if (!confirm("\u00bfQuitar \u00ab" + x.n + "\u00bb de la lista?")) return;
      Almacen.borrarHogar(x.id);
      cerrarModal(); pintarHogar(); pintarCompra();
    });
  }

  /* ==================== VISTA: COMPRA ==================== */
  var compraActual = null;

  function pintarCompra() {
    /* La compra tiene SU PROPIO rango, no el de la pestaña Menú. */
    var r = Almacen.rangoCompra(UI.cuandoCompra);
    var datos = Almacen.generarCompra(r.desde, r.dias, { saltarComido: true });
    compraActual = datos;
    var pers = Almacen.estado.config.personas || 1;
    $("#compra-cuando").value = UI.cuandoCompra;
    $("#compra-rango").textContent = Util.etiquetaFecha(r.desde) + " \u2013 " + Util.etiquetaFecha(r.hasta) +
                                     " \u00b7 " + r.dias + (r.dias === 1 ? " d\u00eda" : " d\u00edas");
    $("#compra-personas").textContent = pers === 1 ? "1 persona" : pers + " personas";

    pintarRecados();
    pintarQuiero();

    var hogar = Almacen.compraHogar();
    var visible = function (l) { return UI.ocultarComprados ? !l.marcado : true; };

    /* --- reparto por cajón: Amazon y Súper --- */
    var caj = { amazon: [], super: [] };
    datos.secciones.forEach(function (sec) {
      var por = { amazon: [], super: [] };
      sec.lineas.forEach(function (l) { por[l.cajon === "amazon" ? "amazon" : "super"].push(l); });
      ["amazon", "super"].forEach(function (k) {
        var ls = por[k].filter(visible);
        if (ls.length) caj[k].push({ nombre: sec.nombre, lineas: ls });
      });
    });
    var basAmazon = datos.basicos.filter(function (l) { return l.cajon === "amazon"; }).filter(visible);
    var basSuper  = datos.basicos.filter(function (l) { return l.cajon !== "amazon"; }).filter(visible);
    if (basAmazon.length) caj.amazon.push({ nombre: "Revisa la despensa (b\u00e1sicos)", lineas: basAmazon, basico: true });
    if (basSuper.length)  caj.super.push({ nombre: "Revisa la despensa (b\u00e1sicos)", lineas: basSuper, basico: true });

    var totalLineas = 0, pedidos = 0;
    datos.secciones.forEach(function (sec) {
      sec.lineas.forEach(function (l) { totalLineas++; if (l.marcado) pedidos++; });
    });
    var totalHogar = hogar.amazon.length + hogar.super.length;

    if (!totalLineas && !totalHogar) {
      $("#compra-resumen").textContent = "Nada que comprar: o no hay men\u00fa planificado en esas fechas, " +
        "o lo que hace falta ya est\u00e1 en la despensa.";
      $("#lista-compra").innerHTML = "";
      $("#platos-compra").innerHTML = "";
      return;
    }
    var sinMarca = 0;
    datos.secciones.forEach(function (sec) {
      sec.lineas.forEach(function (l) { if (l.cajon === "amazon" && !l.producto) sinMarca++; });
    });
    datos.basicos.forEach(function (l) { if (l.cajon === "amazon" && !l.producto) sinMarca++; });
    hogar.amazon.forEach(function (x) { if (x.pendiente) sinMarca++; });
    var bm = $("#compra-marcas");
    if (bm) {
      bm.hidden = !sinMarca;
      bm.textContent = "Poner marcas (" + sinMarca + ")";
    }
    $("#compra-resumen").textContent =
      (totalLineas - pedidos) + " por pedir de " + totalLineas +
      (pedidos ? " \u00b7 " + pedidos + " ya pedidos" : "") +
      (totalHogar ? " \u00b7 " + totalHogar + " de casa" : "");
    /* EL BLOQUE DE \u00abLOS PLATOS DE ESTE RANGO\u00bb SE RETIRA (22-sep-2026).
       Carlos lo par\u00f3 el 17 porque no le convenc\u00eda c\u00f3mo informaba \u2014dec\u00eda \u00ab0 de 64
       comprados\u00bb y a la vez \u00ab33 platos con todos los ingredientes\u00bb\u2014 y la auditor\u00eda
       encontr\u00f3 el porqu\u00e9: era una de las TRES contabilidades que med\u00edan lo mismo sin
       hablarse. Ahora hay una sola, la despensa, y esto sobra. La maquinaria se
       queda por debajo, sin pantalla, por si alg\u00fan d\u00eda se quiere recuperar. */
    var pc = $("#platos-compra");
    if (pc) pc.innerHTML = "";

    function lineaHogarHTML(x) {
        var ped = Almacen.estaPedido(x.id);
        return '<div class="linea' + (ped ? " hecha" : "") + '">' +
             '<input type="checkbox" data-marcar="' + esc(x.id) + '"' + (ped ? " checked" : "") +
               ' title="Pedido">' +
             '<div class="datos"><div class="nombre">' + esc(x.n) +
               (x.pendiente ? ' <span class="etiqueta">sin marca</span>' : '') +
               (x.suscripcion ? ' <span class="etiqueta">suscripci\u00f3n</span>' : '') + '</div>' +
             '<div class="detalle">' + esc(x.cat) +
               (x.suplente ? ' \u00b7 si no hay: ' + esc(x.suplente) : '') + '</div></div>' +
             '<span class="cant">\u00d7' + x.c + '</span></div>';
    }

    function bloqueHogar(lista) {
      if (!lista.length) return "";
      var h = '<div class="seccion-compra"><h3>Casa</h3>';
      lista.forEach(function (x) { h += lineaHogarHTML(x); });
      return h + '</div>';
    }

    var html = "";
    [["amazon", "Amazon"], ["super", "S\u00faper"]].forEach(function (par) {
      var k = par[0];
      var secs = caj[k], hg = hogar[k] || [];
      if (!secs.length && !hg.length) return;
      html += '<h2 class="cajon-compra">' + esc(par[1]) + '</h2>';
      /* EL SÚPER SE AGRUPA POR TIENDA, NO POR SECCIÓN (23-sep-2026). Porque no es
         un súper: son cuatro sitios distintos —Mercadona, Primaprix, Ahorramás y
         DIA— y lo que hace falta al salir de casa es saber qué coger en cada uno.
         Ordenarlo por sección de supermercado, con seis artículos repartidos entre
         cuatro tiendas, no servía para nada. */
      if (k === "super") {
        var porTienda = {};
        function cajon(t) { return (porTienda[t] = porTienda[t] || { comida: [], casa: [] }); }
        secs.forEach(function (sec) {
          sec.lineas.forEach(function (l) { cajon(l.tienda || "Sin tienda asignada").comida.push(l); });
        });
        hg.forEach(function (x) { cajon(x.tienda || "Sin tienda asignada").casa.push(x); });
        Object.keys(porTienda).sort().forEach(function (nom) {
          var g = porTienda[nom];
          if (g.comida.length) {
            html += '<div class="seccion-compra"><h3>' + esc(nom) + '</h3>';
            g.comida.forEach(function (l) { html += lineaCompraHTML(l, false); });
            html += '</div>';
          }
          if (g.casa.length) {
            html += '<div class="seccion-compra"><h3>' + esc(nom) +
                    (g.comida.length ? ' \u00b7 casa' : '') + '</h3>';
            g.casa.forEach(function (x) { html += lineaHogarHTML(x); });
            html += '</div>';
          }
        });
        return;
      }
      secs.forEach(function (sec) {
        html += '<div class="seccion-compra"><h3>' + esc(sec.nombre) + '</h3>';
        sec.lineas.forEach(function (l) { html += lineaCompraHTML(l, sec.basico); });
        html += '</div>';
      });
      html += bloqueHogar(hg);
    });

    if (!html) html = '<div class="vacio">Todo pedido. Cuando llegue, dale a \u00abHa llegado\u00bb.</div>';
    $("#lista-compra").innerHTML = html;
    $("#compra-ocultar").textContent = UI.ocultarComprados ? "Ver todo" : "Ocultar pedidos";
  }

  /* ============ «LO QUE QUIERO ESTA VEZ» ============
     La tercera manera de que algo entre en la lista, y la que faltaba.

     Carlos, 25-sep-2026, al ver adónde llevaba ponerle un mínimo a cada bebida:
     «espera que voy a comprar de más… la idea es mejorar mi alimentación y no voy
     a tener refrescos azucarados, no deberían tener un stock mínimo; debería
     añadirse una categoría para añadir a la lista de la compra algo por
     capricho». Y luego: «los productos temporales que no compro en lo general…
     quiero una bolsa de doritos por ejemplo».

     Tiene razón en lo de fondo, y es la diferencia entre las dos cosas:
       un MÍNIMO es una orden permanente — la app se compromete a que en tu casa
         siempre haya siete cervezas, y cada semana las repone sin preguntar.
       un CAPRICHO es de una vez — un toque, entra en esta lista, y al confirmar
         la compra se borra. La semana que viene no vuelve solo.
     Por eso los doritos NO llevan mínimo: si esta semana los quieres, los pides
     a propósito, y ese pequeño gesto es justo la fricción que no había. */
  function pintarQuiero() {
    var cont = $("#bloque-quiero");
    if (!cont) return;
    var lista = Almacen.loQueQuieres();
    var q = sinTildes((UI.buscaQuiero || "").trim().toLowerCase());

    var res = "";
    if (q) {
      var hits = (Almacen.estado.ingredientes || []).filter(function (g) {
        return !g.oculta && sinTildes(g.n.toLowerCase()).indexOf(q) >= 0 &&
               !Almacen.quiereEstaVez(g.id);
      }).slice(0, 8);
      res = hits.length
        ? hits.map(function (g) {
            return '<button type="button" class="btn mini" data-quiero="' + esc(g.id) +
              '">+ ' + esc(g.n.length > 42 ? g.n.slice(0, 40) + "\u2026" : g.n) + "</button>";
          }).join("")
        : '<span class="nota-peque">Nada con ese nombre.</span>';
    }

    cont.innerHTML =
      '<div class="tarjeta quiero-bloque">' +
        '<div class="fila entre">' +
          "<div><strong>Lo que quiero esta vez</strong>" +
            '<div class="nota-peque">Lo que no compras de normal y hoy s\u00ed. Entra en esta lista ' +
            "y al dar a \u00abHa llegado\u00bb se olvida: la semana que viene no vuelve solo.</div></div>" +
        "</div>" +
        '<div class="fila" style="margin-top:6px">' +
          '<input type="text" id="buscar-quiero" placeholder="Buscar para a\u00f1adir\u2026" ' +
            'value="' + esc(UI.buscaQuiero || "") + '" style="flex:1; min-width:170px">' +
        "</div>" +
        (res ? '<div class="quiero-hits">' + res + "</div>" : "") +
        (lista.length
          ? lista.map(function (x) {
              return '<div class="linea linea-quiero">' +
                '<div class="datos"><div class="nombre">' + esc(x.n) + "</div>" +
                '<div class="detalle">' + cifra(x.piezas) + " " + esc(x.comoSeLlama) +
                  (x.pieza > 1 ? " \u00b7 " + esc(Util.cantidadReceta(x.pieza * x.piezas, x.u, x.pesoUd)) : "") +
                  "</div></div>" +
                '<div class="paso">' +
                  '<button type="button" class="btn mini" data-quieropaso="' + esc(x.id) +
                    '|-1">\u2212</button>' +
                  '<span class="cuenta-lista">' + cifra(x.piezas) + "</span>" +
                  '<button type="button" class="btn mini" data-quieropaso="' + esc(x.id) +
                    '|1">+</button>' +
                "</div>" +
                '<button type="button" class="btn mini borrar" data-quieroquita="' + esc(x.id) +
                  '">Quitar</button>' +
                "</div>";
            }).join("")
          : '<div class="nota-peque" style="margin-top:6px">Nada pedido por capricho.</div>') +
      "</div>";
  }

  /* LA LISTA DE RECADOS: lo que se pidió y no llegó, o no había. Se queda aquí
     hasta que se resuelva; no vuelve sola a la lista grande. */
  function pintarRecados() {
    var cont = $("#lista-recados");
    if (!cont) return;
    var lista = Almacen.recadosPendientes();
    if (!lista.length) { cont.innerHTML = ""; return; }
    var h = '<div class="seccion-compra" style="border-color:var(--ambar)">' +
            '<h3 style="color:var(--ambar)">Pendiente de buscar en otro sitio (' + lista.length + ')</h3>';
    lista.forEach(function (x) {
      h += '<div class="linea"><div class="datos"><div class="nombre">' + esc(x.n) + '</div>' +
           '<div class="detalle">' + (x.c > 1 ? x.c + " \u00b7 " : "") + 'desde el ' + esc(Util.etiquetaFecha(x.f)) + '</div></div>' +
           '<button class="btn mini" data-recado="' + esc(x.id) + '">Ya lo tengo</button></div>';
    });
    cont.innerHTML = h + '</div>';
  }

  /* ---------- los PLATOS de la compra ----------
     La lista de abajo son ingredientes, que es lo que se mete en el carro. Pero al
     volver del súper lo que uno sabe no es «tengo 180 g de lomo», es «la comida del
     viernes ya la tengo». Marcar aquí un plato saca SUS ingredientes de la lista de
     abajo, así que se decide por plato y no producto a producto. */
  function etiquetaDiaLargo(iso) {
    var d = Util.desdeISO(iso);
    return Util.DIAS[(d.getDay() + 6) % 7] + " " + Util.etiquetaFecha(iso);
  }

  function pintarPlatosCompra(r) {
    var cont = $("#platos-compra");
    if (!cont) return;
    var platos = Almacen.platosCompra(r.desde, r.dias);
    if (!platos.length) { cont.innerHTML = ""; return; }

    var comprados = 0;
    var porDia = {}, orden = [];
    platos.forEach(function (p) {
      if (p.comprado) comprados++;
      if (!porDia[p.fecha]) { porDia[p.fecha] = []; orden.push(p.fecha); }
      porDia[p.fecha].push(p);
    });

    /* Con la semana entera son 35 platos y el bloque taparía la lista de la compra.
       Abierto por defecto solo si caben de un vistazo; en cuanto él lo abre o lo cierra,
       manda su decisión. */
    var abierto = UI.verPlatosCompra === null ? platos.length <= 12 : UI.verPlatosCompra;
    var html = '<details class="platos-compra"' + (abierto ? " open" : "") + '>' +
      '<summary><b>Los platos de este rango</b> — ' + comprados + ' de ' + platos.length +
      ' ya comprados<span class="nota-peque"> · marca un plato y sus ingredientes salen de la lista</span></summary>' +
      '<div class="cuerpo-platos">';

    orden.forEach(function (f) {
      var delDia = porDia[f];
      var visibles = delDia.filter(function (p) { return UI.ocultarComprados ? !p.comprado : true; });
      if (!visibles.length) return;
      var faltan = delDia.filter(function (p) { return !p.comprado; }).length;
      html += '<div class="dia-platos">' +
              '<div class="cab-dia-platos"><span>' + esc(etiquetaDiaLargo(f)) + '</span>' +
              (faltan
                ? '<button class="btn mini" data-diacomprado="' + f + '">Todo el día (' + faltan + ')</button>'
                : '<span class="etiqueta verde">día completo</span>') +
              '</div>';
      visibles.forEach(function (p) {
        html += '<div class="linea' + (p.comprado ? " hecha" : "") + '">' +
          '<input type="checkbox" data-platocompra="' + f + '|' + p.toma + '|' + esc(p.id) + '"' +
          (p.comprado ? " checked" : "") + ' title="Marcar el plato como comprado">' +
          '<div class="datos"><div class="nombre">' + esc(p.nombre) + '</div>' +
          '<div class="detalle">' + esc(p.tomaNombre) + (p.comido ? " \u00b7 ya comido" : "") + '</div></div>' +
          '</div>';
      });
      html += '</div>';
    });
    html += '</div></details>';
    cont.innerHTML = html;
  }

  function lineaCompraHTML(l, basico) {
    /* Arriba lo que se compra —el producto y cuántos envases— y debajo, en gris,
       la razón: lo que pide el menú y lo que ya tienes. La lista se lee como un
       pedido, que es lo que tiene que ser para poder pasarla a Amazon. */
    var nombre = l.producto || l.nombre;
    var clases = "linea" + (l.marcado ? " hecha" : "");
    /* POR QUÉ ESTÁ ESTA LÍNEA AQUÍ. Hay tres motivos distintos y hasta ahora
       sólo se contaba uno: las líneas del mínimo salían con «el menú pide» y
       nada detrás, porque el menú no pide nada de eso. Cada motivo dice lo suyo:
         el menú   lo que gastan los platos, menos lo que tienes
         mínimo    no puede faltar en casa, y cuánto falta para cubrirlo
         capricho  lo has pedido tú para esta compra y sólo para ésta */
    var etiq = "", porque;
    if (l.porCapricho) {
      etiq = ' <span class="etiqueta capricho">lo quieres esta vez</span>';
      porque = "lo has pedido t\u00fa para esta compra";
      if (l.pediste && l.piezas && l.pediste !== l.piezas) {
        porque += " \u00b7 ped\u00edas " + cifra(l.pediste) + ", el envase trae " + cifra(l.piezas);
      }
      if (l.hay > 0) porque += " \u00b7 ya tienes " + esc(Util.cantidadReceta(l.hay, l.unidad, l.pesoUd));
    } else if (l.porMinimo) {
      etiq = ' <span class="etiqueta">no debe faltar</span>';
      porque = "m\u00ednimo en casa " + cifra(l.minimo) + " " + esc(l.piezaNombre) +
               " \u00b7 tienes " + cifra(l.tienesPiezas);
      if (l.lote > 1) porque += " \u00b7 se compra de " + cifra(l.lote) + " en " + cifra(l.lote);
    } else {
      porque = "el men\u00fa pide " + esc(l.pidePlan);
      if (l.hay > 0) porque += " \u00b7 tienes " + esc(Util.cantidadReceta(l.hay, l.unidad, l.pesoUd));
      if (l.recetas && l.recetas.length) {
        porque += " \u00b7 " + esc(l.recetas.slice(0, 2).join(", ")) + (l.recetas.length > 2 ? "\u2026" : "");
      }
    }
    if (l.suplente) porque += " \u00b7 si no hay: " + esc(l.suplente);
    return '<div class="' + clases + '">' +
      '<input type="checkbox" data-marcar="' + esc(l.id) + '"' + (l.marcado ? " checked" : "") + ' title="Pedido">' +
      '<div class="datos"><div class="nombre">' + esc(nombre) + etiq +
        /* El aviso de que falta la marca solo tiene sentido en Amazon: en el s\u00faper
           ya sabes cu\u00e1l coger. Y es un bot\u00f3n, porque el sitio donde se pone la marca
           es justo este, cuando la tienes delante. */
        (l.producto || l.cajon !== "amazon" ? '' :
          ' <button class="etiqueta" data-marcaring="' + esc(l.id) + '" ' +
          'title="Ponle tu marca y formato">ponle marca</button>') + '</div>' +
      '<div class="detalle">' + porque + (l.nota ? ' \u2014 ' + esc(l.nota) : '') + '</div></div>' +
      '<span class="cant">' + esc(l.texto) + '</span>' +
      '<button class="btn mini" data-encasa="' + esc(l.id) + '" title="Ya lo tienes: no lo pidas">Lo tengo</button>' +
      '</div>';
  }

  /* EL TEXTO QUE SE PASA A AMAZON. Tiene que ser COMPRABLE, no informativo:
     por eso manda el producto con marca y formato, y no el nombre del ingrediente.
     Separado por cajones, porque lo del súper no se pide por internet, y con lo
     de casa dentro de su cajón. Las líneas que aún no tienen marca salen avisadas:
     más vale que se vea el hueco que mandar un pedido a medias. */
  function textoCompra(soloPendientes) {
    if (!compraActual) return "";
    var rr = Almacen.rangoCompra(UI.cuandoCompra);
    var pendiente = function (l) { return soloPendientes ? !l.marcado : true; };

    var caj = { amazon: [], super: [] };
    compraActual.secciones.forEach(function (sec) {
      sec.lineas.filter(pendiente).forEach(function (l) {
        caj[l.cajon === "amazon" ? "amazon" : "super"].push({ sec: sec.nombre, l: l });
      });
    });
    compraActual.basicos.filter(pendiente).forEach(function (l) {
      caj[l.cajon === "amazon" ? "amazon" : "super"].push({ sec: "B\u00e1sicos de despensa", l: l });
    });
    var hogar = Almacen.compraHogar();

    var out = "LISTA DE LA COMPRA \u2014 del " + Util.etiquetaFecha(rr.desde) + " al " +
              Util.etiquetaFecha(rr.hasta) + " de " + Util.desdeISO(rr.hasta).getFullYear() +
              " (" + rr.dias + (rr.dias === 1 ? " d\u00eda" : " d\u00edas") +
              ", " + (Almacen.estado.config.personas || 1) + " personas)\n";

    var sinMarca = 0;
    [["amazon", "AMAZON"], ["super", "S\u00daPER"]].forEach(function (par) {
      var k = par[0], lista = caj[k], hg = (hogar[k] || []);
      if (!lista.length && !hg.length) return;
      out += "\n===== " + par[1] + " =====\n";
      var sec = "";
      /* En el Súper el encabezado es la TIENDA, no la sección: la lista se lee
         yendo de tienda en tienda, no recorriendo pasillos de un supermercado. */
      if (k === "super") lista = lista.slice().sort(function (a, b) {
        return String(a.l.tienda || "zzz").localeCompare(String(b.l.tienda || "zzz"));
      });
      lista.forEach(function (x) {
        var cab = k === "super" ? (x.l.tienda || "Sin tienda asignada") : x.sec;
        if (cab !== sec) { sec = cab; out += "\n" + sec.toUpperCase() + "\n"; }
        var nombre = x.l.producto || x.l.nombre;
        if (!x.l.producto && k === "amazon") { nombre += "  [FALTA LA MARCA]"; sinMarca++; }
        out += "  - " + nombre + ": " + x.l.texto +
               (x.l.suplente ? "   (si no hay: " + x.l.suplente + ")" : "") + "\n";
      });
      if (hg.length) {
        out += "\nCASA\n";
        hg.forEach(function (x) {
          var n = x.n + (x.pendiente && k === "amazon" ? "  [FALTA LA MARCA]" : "");
          if (x.pendiente && k === "amazon") sinMarca++;
          out += "  - " + n + (x.c > 1 ? " \u00d7" + x.c : "") +
                 (x.suplente ? "   (si no hay: " + x.suplente + ")" : "") + "\n";
        });
      }
    });

    var rec = Almacen.recadosPendientes();
    if (rec.length) {
      out += "\n===== PENDIENTE DE OTRAS VECES =====\n";
      rec.forEach(function (x) { out += "  - " + x.n + (x.c > 1 ? " \u00d7" + x.c : "") + "\n"; });
    }
    if (sinMarca) {
      out += "\n(" + sinMarca + (sinMarca === 1 ? " l\u00ednea no tiene marca todav\u00eda" : " l\u00edneas no tienen marca todav\u00eda") +
             ": ah\u00ed hace falta elegir producto.)\n";
    }
    return out;
  }

  /* ==================== VISTA: DESPENSA ==================== */
  /* ==================== LA DESPENSA ====================
     Por SITIOS DE LA CASA, no por secciones del súper. La sección es la ruta
     del supermercado y sirve para la lista de la compra; para repasar hace falta
     esto otro, porque tú no abres «Lácteos y huevos», abres la nevera.

     Y solo se enseña LO QUE HAY. Una nevera tiene ocho cosas, no las veintinueve
     que podría tener; para añadir algo que aparezca, el buscador de arriba.
     Una revisión corta es una revisión que se repite. */
  /* ==================== LA DESPENSA ====================
     Pensada para CONTARLA CON EL MÓVIL EN LA MANO, delante del armario abierto.
     De ahí las decisiones de esta pantalla, que no son estéticas:

       · UN SITIO ABIERTO CADA VEZ. Cinco sitios abiertos son un kilómetro de
         página; contando, solo miras uno.
       · EL BUSCADOR, DENTRO DE CADA SITIO Y ACOTADO A ÉL. Estás delante del
         armario: no te puede ofrecer el pescado de la nevera. Y no hay que subir
         a lo alto de la página para añadir algo que acabas de ver.
       · LAS UNIDADES, CON − Y +. Seis yogures se cuentan con el dedo, no
         tecleando; los gramos sí se teclean.
       · AL CAMBIAR UNA CIFRA NO SE REHACE LA LISTA, solo esa línea. Rehacerla
         te devolvía al principio y perdías dónde ibas.
       · TODO MÁS GRANDE en el móvil: se toca de pie y con una mano. */
  function detalleStock(x) {
    /* Dos motivos distintos para pedir la cifra, y decirlos igual confunde:
       uno es \u00ablo tienes y no sabemos cu\u00e1nto\u00bb, el otro \u00abhas gastado m\u00e1s de lo
       que hab\u00eda apuntado\u00bb. El segundo nace al marcar un plato comido con la
       cuenta corta (24-sep-2026). */
    if (x.pte === "corto") {
      return '<span style="color:var(--ambar)">Se gast\u00f3 m\u00e1s de lo que hab\u00eda apuntado: ' +
             'la cuenta iba alta. Cu\u00e9ntalo y pon la cifra</span>';
    }
    if (x.pte) return '<span style="color:var(--ambar)">Sabemos que lo tienes, pero no cu\u00e1nto: pon la cifra</span>';
    var d;
    if (x.comprometido > 0) {
      d = 'comprometido ' + esc(Util.cantidadReceta(x.comprometido, x.u, x.pesoUd)) +
          ' \u00b7 <b>libre ' + esc(Util.cantidadReceta(x.libre, x.u, x.pesoUd)) + '</b>';
    } else {
      d = x.c > 0 ? 'todo libre' : 'no queda';
    }
    if (x.envase) d += ' \u00b7 envase de ' + esc(Util.cantidadReceta(x.envase, x.u, x.pesoUd));
    return d;
  }

  /* ==================== LA PASADA PREVIA ====================
     Se abre antes de comprar y pregunta, sitio por sitio, por lo que el menú
     de esa semana va a gastar. Cada línea viene YA marcada con lo que la app
     cree; sólo hay que corregir lo que esté mal.

     Por qué es una emergente y no una pestaña: esto se hace de pie, delante de
     la nevera, con el móvil en una mano. Una pantalla a la vez, sin nada
     alrededor, y el sitio que estás mirando abierto y los demás cerrados. */
  var pasadaAbierta = null;          // qué sitio está desplegado

  /* «Hay» lleva pegada la cifra que hace falta: decir que hay es decir que hay
     AL MENOS eso, y el stock se sube hasta ahí si estaba por debajo. Va en el
     botón y no se recalcula al pulsar, para que lo que se guarda sea
     exactamente lo que estabas viendo cuando contestaste. */
  function botonPas(id, r, activo, txt, nec) {
    return '<button type="button" class="btn mini pas-b' + (activo ? " activo" : "") +
           '" data-pas="' + esc(id) + ':' + r + '"' +
           (nec ? ' data-nec="' + nec + '"' : "") + ">" + txt + "</button>";
  }

  function lineaPasadaHTML(l) {
    var cant = function (c) { return esc(Util.cantidadReceta(c, l.u, l.pesoUd)); };
    var pie;
    if (l.estado === "parte") {
      pie = '<span style="color:var(--ambar)">queda ' + cant(l.hay) + ' y hacen falta ' + cant(l.pide) + '</span>';
    } else if (l.dudoso) {
      pie = '<span style="color:var(--ambar)">' +
            (l.pte === "corto" ? "se gastó más de lo apuntado"
             : l.pte ? "no sabemos cuánto hay"
             : l.dias === null ? "nunca contado" : "contado hace " + l.dias + " días") + "</span>";
    } else if (l.avisa) {
      pie = '<span style="color:var(--ambar)">por debajo del mínimo (' + cant(l.minimo) + ')</span>';
    } else {
      pie = "hacen falta " + cant(l.pide) +
            (l.apartado > 0 ? " · y " + cant(l.apartado) + " ya están pedidos por otros días" : "");
    }
    return '<div class="linea linea-pas" data-pasfila="' + esc(l.id) + '">' +
      '<div class="datos"><div class="nombre">' + esc(l.n) + "</div>" +
      '<div class="detalle">' + pie + "</div></div>" +
      '<div class="pas-btns">' +
        /* «Hay bastante · No queda · Queda algo», y no «Hay · No hay · Queda».
           Carlos, 24-sep-2026: «¿la diferencia entre Hay y Quedan?». Con los
           rótulos cortos los tres parecían lo mismo. Nombrando la CANTIDAD
           —bastante, nada, algo— la diferencia se lee sin explicarla, que es
           lo que tiene que pasar cuando lo contestas de pie y con prisa. */
        botonPas(l.id, "hay", l.estado === "hay" && !l.dudoso, "Hay bastante", l.necesita) +
        botonPas(l.id, "no", l.estado === "no", "No queda") +
        botonPas(l.id, "parte", l.estado === "parte", "Queda algo…") +
      "</div>" +
      /* La cifra, con su rótulo y en su propia fila. En el móvil los tres
         botones ya llenan el ancho, así que el campo cae abajo sí o sí: si cae
         suelto y sin nombre parece un número huérfano —el mismo problema que
         tenía la carga del día en el tablero de entreno—, así que se le pone
         delante «quedan» y la unidad detrás. */
      (l.estado === "parte"
        ? '<div class="pas-fila-cifra"><span>quedan</span>' +
          '<input type="number" class="stock-cant pas-cifra" data-pascifra="' + esc(l.id) +
          '" inputmode="decimal" value="' + (Math.round(l.hay * 100) / 100) + '">' +
          "<span>" + esc(l.u === "ud" ? "uds" : l.u) + "</span></div>"
        : "") +
      "</div>";
  }

  function htmlPasada() {
    var r = Almacen.rangoCompra(UI.cuandoCompra);
    var p = Almacen.pasadaPrevia(r.desde, r.dias);
    var h = '<header><h2>Antes de comprar</h2>' +
      '<button class="cerrar" type="button" data-cerrar="1" aria-label="Cerrar">×</button></header>';
    if (!p.total) {
      return h + '<div class="vacio">No hay nada planificado en esas fechas, así que no hay nada que repasar.</div>' +
             '<button class="btn principal ancho" data-cerrar="1">Cerrar</button>';
    }
    h += '<p class="nota-peque">El menú de estos días gasta <b>' + p.total +
         "</b> cosas. Ve sitio por sitio y corrige lo que no cuadre: lo demás ya está " +
         "marcado con lo que creo que tienes.</p>";
    if (pasadaAbierta === null && p.sitios.length) pasadaAbierta = p.sitios[0].k;
    p.sitios.forEach(function (s) {
      var pend = s.lineas.filter(function (l) { return l.dudoso || l.estado !== "hay"; }).length;
      h += '<details class="grupo-selec sitio-pas"' + (s.k === pasadaAbierta ? " open" : "") +
           ' data-pasitio="' + esc(s.k) + '">' +
           "<summary><span class=\"tit\">" + esc(s.n) + "</span>" +
           '<span class="cuantas">' + s.total + "</span></summary>";
      h += '<p class="aviso-grupo">' +
           (s.dias === null ? "sin contar todavía"
            : s.dias === 0 ? "repasado hoy" : "repasado hace " + s.dias + " días") +
           (pend ? " · <b>" + pend + " por mirar</b>" : " · todo en orden") + "</p>";
      s.lineas.forEach(function (l) { h += lineaPasadaHTML(l); });
      if (s.basicos.length) {
        h += '<details class="grupo-selec basicos-pas"><summary><span class="tit">' +
             "Básicos</span><span class=\"cuantas\">" + s.basicos.length + "</span></summary>" +
             '<p class="aviso-grupo">Los de siempre, y de estos casi nunca falta ninguno. ' +
             "El que baje de su mínimo sale solo ahí arriba.</p>";
        s.basicos.forEach(function (l) { h += lineaPasadaHTML(l); });
        h += "</details>";
      }
      h += "</details>";
    });
    h += '<button class="btn principal ancho" data-cerrar="1">Listo, a la compra</button>';
    return h;
  }

  function abrirPasada() { pasadaAbierta = null; abrirModal(htmlPasada()); }

  /* Repinta SOLO esa línea: rehacer la emergente entera mientras contestas te
     cierra el sitio abierto y te manda arriba. Mismo motivo que en la despensa. */
  function refrescarLineaPasada(id) {
    var fila = document.querySelector('[data-pasfila="' + id + '"]');
    if (!fila) return;
    var r = Almacen.rangoCompra(UI.cuandoCompra);
    var p = Almacen.pasadaPrevia(r.desde, r.dias), nueva = null;
    p.sitios.forEach(function (s) {
      s.lineas.concat(s.basicos).forEach(function (l) { if (l.id === id) nueva = l; });
    });
    if (!nueva) return;
    var tmp = document.createElement("div");
    tmp.innerHTML = lineaPasadaHTML(nueva);
    fila.replaceWith(tmp.firstChild);
  }

  function lineaStockHTML(x) {
    var uni = x.u === "ud" ? (x.c === 1 ? "unidad" : "uds") : x.u;
    return '<div class="linea linea-stock' + (x.c > 0 ? "" : " hecha") + '" data-fila="' + esc(x.id) + '">' +
      '<div class="datos"><div class="nombre">' + esc(x.n) + '</div>' +
      '<div class="detalle">' + detalleStock(x) + '</div></div>' +
      (x.u === "ud" ? '<button class="btn mini paso-stock" data-menos-stock="' + esc(x.id) + '">\u2212</button>' : '') +
      '<input type="number" class="stock-cant" data-stock="' + esc(x.id) + '" inputmode="decimal" ' +
        'min="0" step="' + (x.u === "ud" ? "1" : "10") + '" value="' + (x.c || 0) + '">' +
      (x.u === "ud" ? '<button class="btn mini paso-stock" data-mas-stock="' + esc(x.id) + '">+</button>' : '') +
      '<span class="uni-stock nota-peque">' + esc(uni) + '</span>' +
      '<button class="btn mini" data-cero="' + esc(x.id) + '" title="Se ha acabado o estaba caducado">0</button>' +
      '</div>';
  }

  function pintarDespensa() {
    var cont = $("#rejilla-despensa");
    if (!cont) return;
    var q = sinTildes((UI.busquedaDespensa || "").trim().toLowerCase());
    var hoy = Util.hoyISO(), html = "", algo = false;

    Almacen.SITIOS.forEach(function (sitio) {
      var lista = Almacen.loQueHayEn(sitio.k);
      if (q) lista = lista.filter(function (x) { return sinTildes(x.n.toLowerCase()).indexOf(q) >= 0; });
      var abierto = q ? true : (UI.sitioAbierto === sitio.k);
      if (lista.length) algo = true;
      if (q && !lista.length) return;

      var f = (Almacen.estado.stockSitios || {})[sitio.k];
      var dias = f ? Util.diasEntre(f, hoy) : null;
      var cuando = f
        ? (dias === 0 ? "contado hoy" : dias === 1 ? "contado ayer" : "contado hace " + dias + " d\u00edas")
        : "sin contar todav\u00eda";
      var viejo = (dias === null || dias > 7);

      html += '<details class="grupo-selec sitio-desp"' + (abierto ? " open" : "") +
                ' data-sitio="' + esc(sitio.k) + '">' +
                '<summary><span class="tit">' + esc(sitio.n) + '</span>' +
                '<span class="cuantas">' + (lista.length || "\u2014") + '</span></summary>' +
                '<p class="aviso-grupo"' + (viejo ? ' style="color:var(--ambar)"' : '') + '>' +
                  esc(cuando) + ' \u00b7 <button class="btn mini" data-contado="' + esc(sitio.k) + '">Repasado</button></p>';

      lista.forEach(function (x) { html += lineaStockHTML(x); });

      /* el buscador de este sitio, acotado a lo que se guarda aquí */
      var qs = sinTildes((UI.buscaSitio[sitio.k] || "").trim().toLowerCase());
      html += '<div class="anadir-sitio">' +
              '<input type="text" data-buscasitio="' + esc(sitio.k) + '" value="' + esc(UI.buscaSitio[sitio.k] || "") +
              '" placeholder="A\u00f1adir algo de ' + esc(sitio.n.toLowerCase()) + '\u2026">';
      if (qs) {
        var fuera = (Almacen.estado.ingredientes || []).filter(function (g) {
          if (g.oculta) return false;
          if (Almacen.sitioDe(g) !== sitio.k) return false;
          if (Almacen.fichaStock(g.id)) return false;
          return sinTildes(g.n.toLowerCase()).indexOf(qs) >= 0;
        }).slice(0, 8);
        if (fuera.length) {
          fuera.forEach(function (g) {
            html += '<button class="btn mini sug-sitio" data-poner="' + esc(g.id) + '">' + esc(g.n) + '</button>';
          });
        } else {
          html += '<span class="nota-peque">Nada con ese nombre aqu\u00ed. Si es algo nuevo, dalo de alta en Recetario \u2192 Ingredientes.</span>';
        }
      }
      html += '</div></details>';
    });

    if (!algo && !q) {
      html += '<div class="vacio">La despensa est\u00e1 vac\u00eda. Abre un sitio y busca dentro lo que tengas: ' +
              'es la foto de la que sale todo lo dem\u00e1s.</div>';
    } else if (q && !html) {
      html += '<div class="vacio">Nada con ese nombre.</div>';
    }
    cont.innerHTML = html;
  }

  /* Refresca SOLO una línea. Rehacer la lista entera mientras cuentas te manda
     al principio de la página, y con cincuenta líneas eso es insoportable. */
  function refrescarLineaStock(id) {
    var fila = document.querySelector('[data-fila="' + id + '"]');
    if (!fila) return;
    var sitio = Almacen.sitioDe(id);
    var x = null;
    Almacen.loQueHayEn(sitio).forEach(function (y) { if (y.id === id) x = y; });
    if (!x) { pintarDespensa(); return; }
    var det = fila.querySelector(".detalle");
    if (det) det.innerHTML = detalleStock(x);
    var campo = fila.querySelector("[data-stock]");
    if (campo && document.activeElement !== campo) campo.value = x.c || 0;
    fila.classList.toggle("hecha", !(x.c > 0));
  }

  /* ==================== VISTA: AJUSTES ==================== */
  function pintarPerfil() {
    var p = Almacen.estado.perfil;
    $("#pf-sexo").value = p.sexo || "h";
    $("#pf-edad").value = p.edad || "";
    $("#pf-altura").value = p.altura || "";
    $("#pf-peso").value = p.peso || "";
    $("#pf-objetivo").value = p.pesoObjetivo || "";
    $("#pf-base").value = String(p.actividadBase || 1.2);
    $("#pf-ritmo").value = String(p.ritmo != null ? p.ritmo : 0.5);

    var s = Almacen.objetivoSugerido();
    var caja = $("#pf-resultado");
    if (!s) {
      caja.innerHTML = "Rellena edad, altura y peso y te digo tu gasto y tu objetivo.";
    } else {
      caja.innerHTML =
        "<b>Metabolismo basal:</b> " + Util.kcal(s.tmb) + " · <b>gasto diario estimado:</b> " + Util.kcal(s.gasto) +
        "<br><b>Objetivo propuesto:</b> " + Util.kcal(s.kcal) +
        (s.deficit ? " (déficit de " + s.deficit + " kcal al día)" : " (mantenimiento)") +
        " y <b>" + s.prot + " g de proteína</b>." +
        (s.semanas ? "<br>A ese ritmo, unas <b>" + s.semanas + " semanas</b> para llegar a tu peso objetivo." : "") +
        (s.limitado ? "<br><b>Ojo:</b> ese ritmo bajaría de un mínimo razonable, así que el objetivo se ha " +
                      "quedado en el suelo. Baja el ritmo o súbelo con más actividad." : "") +
        "<br><span class='nota-peque'>Los días que registres ejercicio, el objetivo de ese día sube en lo que hayas quemado.</span>";
    }

    /* histórico de peso */
    var lista = Almacen.estado.pesos.slice().reverse();
    var cont = $("#peso-historico");
    if (!lista.length) {
      cont.innerHTML = '<div class="vacio">Sin pesajes anotados todavía.</div>';
    } else {
      var primero = Almacen.estado.pesos[0], ultimo = Almacen.estado.pesos[Almacen.estado.pesos.length - 1];
      var dif = ultimo.kg - primero.kg;
      var html = '<div class="nota-peque" style="margin-bottom:8px">' + lista.length + ' pesaje(s) · ' +
                 (dif === 0 ? "sin cambio" : (dif < 0 ? "<b>" + dif.toFixed(1).replace(".", ",") + " kg</b> desde el primero"
                                                      : "+" + dif.toFixed(1).replace(".", ",") + " kg desde el primero")) + '</div>';
      html += grafiquilla(Almacen.estado.pesos);
      html += '<ul class="ingredientes">';
      lista.slice(0, 10).forEach(function (x) {
        html += '<li><span>' + Util.etiquetaFecha(x.f) + '</span><span>' +
                String(x.kg).replace(".", ",") + ' kg ' +
                '<button class="quitar" data-quitapeso="' + x.f + '">×</button></span></li>';
      });
      html += '</ul>';
      cont.innerHTML = html;
    }
    $("#peso-fecha").value = Util.hoyISO();
  }

  /* gráfico sencillo de la evolución del peso */
  function grafiquilla(pesos) {
    if (pesos.length < 2) return "";
    var W = 320, H = 70, m = 6;
    var kgs = pesos.map(function (x) { return x.kg; });
    var min = Math.min.apply(null, kgs), max = Math.max.apply(null, kgs);
    if (max - min < 1) { max = min + 1; }
    var pts = pesos.map(function (x, i) {
      var px = m + i * (W - 2 * m) / (pesos.length - 1);
      var py = H - m - (x.kg - min) / (max - min) * (H - 2 * m);
      return px.toFixed(1) + "," + py.toFixed(1);
    }).join(" ");
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="grafico-peso" preserveAspectRatio="none">' +
           '<polyline points="' + pts + '" fill="none" stroke="#2f6b47" stroke-width="2" ' +
           'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
           '<div class="nota-peque" style="display:flex; justify-content:space-between">' +
           '<span>' + Util.etiquetaFecha(pesos[0].f) + '</span>' +
           '<span>' + min.toFixed(1).replace(".", ",") + ' – ' + max.toFixed(1).replace(".", ",") + ' kg</span>' +
           '<span>' + Util.etiquetaFecha(pesos[pesos.length - 1].f) + '</span></div>';
  }

  function pintarAjustes() {
    $("#cfg-consulta").checked = soloConsulta();
    $("#cfg-intro").value = cuandoIntro();
    if (soloConsulta()) return;          // en consulta, lo demás ni se rellena
    pintarPerfil();
    var c = Almacen.estado.config;
    $("#cfg-personas").value = c.personas;
    $("#cfg-aviso").value = c.avisoSal;
    $("#cfg-limite").value = c.limiteSal;
    $("#cfg-kcal").value = c.objetivoKcal;
    $("#cfg-prot").value = c.objetivoProt;
    $("#cfg-margen").value = c.margenKcal;
    $("#cfg-devolucion").value = Math.round((c.devolucionEjercicio != null ? c.devolucionEjercicio : 0.7) * 100);
    if ($("#cfg-prevision")) {
      $("#cfg-prevision").value = Math.round((c.previsionEjercicio != null ? c.previsionEjercicio : 1) * 100);
    }
    pintarEntrenoEstandar();
    pintarFueraEstimado();
    if (!c.catalogo) c.catalogo = {};
    if ($("#cat-usuario")) {
      $("#cat-usuario").value = c.catalogo.usuario || c.github.usuario || "";
      $("#cat-repo").value = c.catalogo.repo || "";
      $("#cat-rama").value = c.catalogo.rama || "main";
      $("#cat-token").value = c.catalogo.token || "";
    }
    $("#gh-usuario").value = c.github.usuario || "";
    $("#gh-repo").value = c.github.repo || "";
    $("#gh-rama").value = c.github.rama || "main";
    $("#gh-token").value = c.github.token || "";
    pintarPausaSync();
  }

  /* El botón de pausa y el cartel que lo acompaña. */
  function pintarPausaSync() {
    var b = $("#gh-pausa"), av = $("#gh-aviso-pausa");
    if (!b) return;
    var p = !!(Almacen.estado.config.github || {}).pausada;
    b.textContent = p ? "Reanudar sincronización" : "Pausar sincronización";
    b.classList.toggle("principal", p);
    if (av) av.hidden = !p;
  }

  /* Lo que se estima al comer fuera: una línea por toma, kcal y sal editables. */
  function pintarFueraEstimado() {
    var caja = $("#lista-fuera");
    if (!caja) return;
    var f = Almacen.estado.config.fueraEstimado || {};
    var html = '<div class="fila-fuera cabecera"><span></span><span>kcal</span><span>g de sal</span></div>';
    Util.TOMAS.forEach(function (t) {
      var e = f[t.k] || { k: 0, sal: 0 };
      html += '<div class="fila-fuera">' +
                '<span>' + esc(t.n) + '</span>' +
                '<input type="number" min="0" max="3000" step="10" value="' + (e.k || 0) +
                  '" data-fuerak="' + t.k + '">' +
                '<input type="number" min="0" max="15" step="0.1" value="' + (e.sal || 0) +
                  '" data-fuerasal="' + t.k + '">' +
              '</div>';
    });
    caja.innerHTML = html;
  }

  /* El entreno estándar, en Ajustes: una línea por deporte con sus minutos editables. */
  function pintarEntrenoEstandar() {
    var caja = $("#lista-entreno");
    if (!caja) return;
    var f = Almacen.fichaEntrenoEstandar();
    if (!f.lista.length) {
      caja.innerHTML = '<p class="nota-peque">Sin entreno estándar. Añade abajo los deportes de un día normal.</p>';
    } else {
      var hayPeso = !!(Almacen.estado.perfil || {}).peso;
      var html = "";
      f.lista.forEach(function (x, i) {
        html += '<div class="plato act">' +
                  '<span class="nom">' + esc(x.n) + '</span>' +
                  '<input type="number" class="min-act" min="5" max="600" step="5" value="' + x.min +
                    '" data-estmin="' + i + '">' +
                  '<span class="sal">min' + (hayPeso ? ' · ' + x.kcal + ' kcal' : '') + '</span>' +
                  '<button class="quitar" data-estquitar="' + i + '">×</button>' +
                '</div>';
      });
      caja.innerHTML = html;
    }
    var sel = $("#entreno-nuevo");
    if (sel && !sel.options.length) {
      var o = "";
      Almacen.estado.actividades.forEach(function (a) {
        o += '<option value="' + esc(a.id) + '">' + esc(a.n) + '</option>';
      });
      sel.innerHTML = o;
    }
    var dev = Almacen.estado.config.devolucionEjercicio;
    var tot = $("#entreno-total");
    if (!tot) return;
    /* Sin peso no hay estimación posible: la fórmula del MET es kcal por kilo. Antes
       de esto salía «0 kcal» en todas las líneas sin decir por qué. */
    if (!(Almacen.estado.perfil || {}).peso) {
      tot.innerHTML = '<span class="falta-peso">Para estimar las calorías hace falta tu <b>peso</b>. ' +
                      'Rellénalo arriba, en <b>Tu perfil</b>, y estos números aparecen solos.</span>';
      return;
    }
    tot.innerHTML = f.lista.length
      ? "En total <b>" + Util.horas(f.min / 60) + " al día</b>, unas <b>" + f.kcal +
        " kcal</b> quemadas. Al objetivo de cada día le suman <b>" + Math.round(f.kcal * dev) +
        " kcal</b> (el " + Math.round(dev * 100) + "%)."
      : "";
  }

  /* ==================== NAVEGACIÓN ==================== */
  function mostrar(vista) {
    UI.vista = vista;
    $$(".vista").forEach(function (v) { v.classList.toggle("activa", v.id === "vista-" + vista); });
    $$("#pestanas button").forEach(function (b) { b.classList.toggle("activa", b.getAttribute("data-vista") === vista); });
    if (vista === "menu") pintarMenu();
    if (vista === "recetas") pintarRecetas();
    if (vista === "compra") pintarCompra();
    /* LA DESPENSA ENTRA POR SU PESTAÑA, NO POR LA PANTALLA VIEJA. Al abrir la
       app se veía marcada «Localización» y debajo salía la pantalla antigua de
       contar cantidades; sólo al ir a ¿Lo tengo? y volver aparecía la buena.
       Era que el HTML dejaba visible el bloque viejo y nadie llamaba a
       `ponerFilaDespensa` hasta que tocabas una pestaña. (Carlos, 25-sep-2026,
       en la primera prueba en el móvil.) */
    if (vista === "despensa") ponerFilaDespensa(UI.filaDesp);
    if (vista === "ajustes") pintarAjustes();
    window.scrollTo(0, 0);
  }

  /* ==================== EVENTOS ==================== */
  function conectarEventos() {

    $("#pestanas").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-vista]");
      if (b) mostrar(b.getAttribute("data-vista"));
    });

    /* --- menú --- */
    $("#semana-anterior").addEventListener("click", function () { UI.lunes = Util.sumarDias(UI.lunes, -7); UI.diaActivo = diaPorDefecto(); pintarMenu(); });
    $("#semana-siguiente").addEventListener("click", function () { UI.lunes = Util.sumarDias(UI.lunes, 7); UI.diaActivo = diaPorDefecto(); pintarMenu(); });
    $("#ir-hoy").addEventListener("click", function () { UI.lunes = Util.lunesDe(Util.hoyISO()); UI.diaActivo = diaPorDefecto(); pintarMenu(); });

    /* El botón «Importar de Garmin» se quitó el 21-sep-2026. Servía para meter
       a mano el .tcx o el .csv de UNA actividad exportada de Garmin Connect y
       sacarle las calorías; desde que las actividades llegan solas de intervals
       todos los días no hacía falta, y se confundía con la exportación grande
       de cada dos meses, que no pasa por aquí sino por `maestro2.py`.
       El código que lee esos ficheros —leerTCX, leerCSV, importarGarmin— se ha
       dejado donde estaba, sin nadie que lo llame: si algún día hace falta
       volver a meter una actividad suelta, basta con devolver el botón. */

    $("#selector-dias").addEventListener("click", function (e) {
      var b = e.target.closest("[data-dia]");
      if (!b) return;
      UI.diaActivo = parseInt(b.getAttribute("data-dia"), 10);
      pintarMenu();
    });

    var anchoAnterior = esMovil();
    window.addEventListener("resize", function () {
      var ahora = esMovil();
      if (ahora !== anchoAnterior) { anchoAnterior = ahora; if (UI.vista === "menu") pintarMenu(); }
    });
    $("#vaciar-semana").addEventListener("click", function () {
      if (!confirm("¿Vaciar la semana de hoy en adelante?\n\nSe borra TODO lo planificado: el menú, " +
                   "el tipo de cada día, las salidas de ruta, el entreno previsto y las marcas de " +
                   "comer fuera.\n\nNO se toca: los días que ya han pasado, ni lo que midió el reloj. " +
                   "Eso es lo que hiciste de verdad.")) return;
      var b = Almacen.vaciarSemana(UI.lunes);
      pintarMenu();
      var resto = [];
      if (b.pasados) resto.push(b.pasados + " día" + (b.pasados === 1 ? "" : "s") + " ya pasado" + (b.pasados === 1 ? "" : "s"));
      if (b.medidas) resto.push(b.medidas + " actividad" + (b.medidas === 1 ? "" : "es") + " del reloj");
      Util.toast(resto.length ? "Semana vaciada; se respetan " + resto.join(" y ") : "Semana vaciada");
    });
    $$("[data-plantilla]").forEach(function (b) {
      b.addEventListener("click", function () {
        Almacen.aplicarPlantilla(b.getAttribute("data-plantilla"), UI.lunes);
        pintarMenu();
        Util.toast("Semana " + b.getAttribute("data-plantilla") + " aplicada");
      });
    });
    $("#guardar-como-plantilla").addEventListener("click", function () {
      var nombre = prompt("Nombre de la plantilla:", "Mi semana");
      if (!nombre) return;
      var dias = [];
      for (var i = 0; i < 7; i++) {
        var d = Almacen.estado.plan[Util.sumarDias(UI.lunes, i)] || Almacen.diaVacio();
        dias.push({
          d: Util.DIAS[i], desayuno: (d.desayuno || []).slice(), almuerzo: (d.almuerzo || []).slice(),
          comida: (d.comida || []).slice(), merienda: (d.merienda || []).slice(), cena: (d.cena || []).slice()
        });
      }
      Almacen.estado.plantillas.push({ id: "p" + Date.now().toString(36), nombre: nombre, dias: dias });
      Almacen.guardar("plantilla");
      Util.toast("Plantilla guardada");
    });

    $("#completar-semana").addEventListener("click", function () {
      var r = Almacen.completarSemana(UI.lunes);
      pintarMenu();
      if (!r.puestos) { Util.toast("No había huecos que completar"); return; }
      /* Qué tal ha quedado cada día respecto a su objetivo: es el dato que importa. */
      var desvios = [];
      for (var i = 0; i < 7; i++) {
        var f = Util.sumarDias(UI.lunes, i);
        if (Almacen.esPasado(f) || !Almacen.estado.plan[f]) continue;
        var o = Almacen.objetivoDelDia(f);
        if (o) desvios.push(Math.abs(Math.round(Almacen.nutrDia(f).k) - o));
      }
      var medio = desvios.length ? Math.round(desvios.reduce(function (a, b) { return a + b; }, 0) / desvios.length) : 0;
      Util.toast("Puestos " + r.puestos + " platos en " + r.dias + " día" + (r.dias === 1 ? "" : "s") +
                 " · se queda a " + medio + " kcal del objetivo de media");
    });

    $("#rellenar-semana").addEventListener("click", function () {
      var r = Almacen.rellenarSemana(UI.lunes, "A");
      pintarMenu();
      var partes = [];
      if (r.tomas) partes.push(r.tomas + " toma" + (r.tomas === 1 ? "" : "s"));
      if (r.dias) partes.push("entreno en " + r.dias + " día" + (r.dias === 1 ? "" : "s"));
      Util.toast(partes.length
        ? "Rellenado: " + partes.join(" y ") + " (los días pasados se respetan)"
        : "No había huecos que rellenar de hoy en adelante");
    });

    /* El deporte y las horas de una ruta son un select y un número: van por «change»,
       no por «click». Al cambiar cualquiera de los dos se rehace la actividad del día,
       que es lo que sube el objetivo de calorías. */
    $("#rejilla-dias").addEventListener("change", function (e) {
      /* minutos de una actividad ya puesta */
      var mm = e.target.closest("[data-minact]");
      if (mm) {
        var pm = mm.getAttribute("data-minact").split("|");
        Almacen.ajustarActividad(pm[0], +pm[1], parseFloat(mm.value));
        clearTimeout(UI.tRuta);
        UI.tRuta = setTimeout(function () { if (UI.vista === "menu") pintarMenu(); }, 600);
        return;
      }
      var sel = e.target.closest("[data-rutaact]"), num = e.target.closest("[data-rutahoras]");
      if (!sel && !num) return;
      var fecha = (sel || num).getAttribute(sel ? "data-rutaact" : "data-rutahoras");
      var caja = e.target.closest(".plan-ruta");
      var idDep = (caja.querySelector("[data-rutaact]") || {}).value || "";
      var horas = parseFloat((caja.querySelector("[data-rutahoras]") || {}).value);
      if (!idDep) return;                       // sin deporte no hay nada que calcular
      if (!(horas > 0)) {                       // deporte elegido y horas en blanco: propón las suyas
        var porDefecto = null;
        Almacen.DEPORTES_RUTA.forEach(function (x) { if (x.id === idDep) porDefecto = x.h; });
        horas = porDefecto || 3;
      }
      var r = Almacen.planearRuta(fecha, idDep, horas);
      if (!r) return;
      /* Repintar la rejilla entera mientras el número tiene el foco rompe el DOM bajo
         los pies del navegador (falla el innerHTML). Se actualiza lo que cambia y se
         deja el repintado para cuando suelte el campo. */
      var eti = caja.querySelector(".quemado-ruta");
      if (eti) eti.innerHTML = "≈ <b>" + r.kcal + " kcal</b> de más";
      var hh = caja.querySelector("[data-rutahoras]");
      if (hh && !hh.value) hh.value = horas;
      clearTimeout(UI.tRuta);
      UI.tRuta = setTimeout(function () { if (UI.vista === "menu") pintarMenu(); }, 700);
      Util.toast("Salida de " + Util.horas(horas) + ": unas " + r.kcal + " kcal de más");
    });

    /* La caja de «comprado y sin comer» está FUERA de #rejilla-dias, y el delegado de
       abajo solo escucha dentro de la rejilla. Por eso el botón Reprogramar no hacía
       nada: el clic no llegaba a ningún sitio. Aquí tiene su propio oyente. */
    var cajaPend = $("#pendientes-despensa");
    if (cajaPend) cajaPend.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-reprogramar],button[data-pend-comido]," +
                               "button[data-pend-fuera],button[data-pend-ver],button[data-pend-vaciar]");
      if (!b) return;

      if (b.hasAttribute("data-pend-ver")) { UI.verTodoPend = !UI.verTodoPend; pintarMenu(); return; }

      if (b.hasAttribute("data-pend-vaciar")) {
        var lista = Almacen.pendientesDespensa();
        if (!lista.length) return;
        if (!confirm("Se quitan de la lista los " + lista.length + " platos, como si ya no quedara " +
                     "nada de ellos en casa. Sus ingredientes vuelven a pedirse en la compra cuando " +
                     "esos platos se planifiquen otra vez. ¿Seguimos?")) return;
        lista.forEach(function (p) { Almacen.marcarComprado(p.f, p.toma, p.id, false); });
        UI.verTodoPend = false;
        pintarMenu();
        Util.toast("Lista vaciada: " + lista.length + " platos");
        return;
      }

      var clave = b.getAttribute("data-reprogramar") || b.getAttribute("data-pend-comido") ||
                  b.getAttribute("data-pend-fuera");
      var pr = clave.split("|");

      if (b.hasAttribute("data-reprogramar")) {
        var destino = Almacen.reprogramarPendiente(pr[0], pr[1], pr[2]);
        pintarMenu();
        Util.toast(!destino ? "No hay sitio en las próximas tres semanas"
                   : destino.junto ? "Puesto el " + Util.etiquetaFecha(destino.f) +
                                     ", junto a lo que ya había"
                                   : "Movido al " + Util.etiquetaFecha(destino.f));
        return;
      }
      if (b.hasAttribute("data-pend-comido")) {
        Almacen.marcarComido(pr[0], pr[1], pr[2], true);
        pintarMenu();
        Util.toast("Apuntado como comido el " + Util.etiquetaFecha(pr[0]));
        return;
      }
      Almacen.marcarComprado(pr[0], pr[1], pr[2], false);
      pintarMenu();
      Util.toast("Fuera de la lista");
    });

    $("#rejilla-dias").addEventListener("click", function (e) {
      var tip = e.target.closest("[data-tipodia]");
      if (tip) {
        var pt = tip.getAttribute("data-tipodia").split("|");
        Almacen.ponerTipoDia(pt[0], pt[1]);
        pintarMenu();
        return;
      }
      var cp = e.target.closest("[data-completar]");
      if (cp) {
        var fc = cp.getAttribute("data-completar");
        var rc = Almacen.completarDia(fc);
        pintarMenu();
        if (!rc || rc.motivo === "sin-objetivo") Util.toast("Rellena tu perfil para tener objetivo de calorías");
        else if (!rc.puestos) Util.toast("Ese día ya está completo");
        else Util.toast("Puestos " + rc.puestos + " platos · " + Util.kcal(rc.kcal) +
                        " de " + Util.kcal(rc.objetivo) + " (" + (rc.desvio >= 0 ? "+" : "") + rc.desvio + ")");
        return;
      }
      var rel = e.target.closest("[data-rellenar]");
      if (rel) {
        var f2 = rel.getAttribute("data-rellenar");
        var n2 = Almacen.rellenarDia(f2, "A");
        if (n2) Almacen.guardar("rellenar");
        pintarMenu();
        Util.toast(n2 ? "Rellenadas " + n2 + " toma" + (n2 === 1 ? "" : "s") : "Ese día ya está completo");
        return;
      }
      var add = e.target.closest("[data-anadir]");
      if (add) { var p = add.getAttribute("data-anadir").split("|"); abrirSelector(p[0], p[1]); return; }
      var cap = e.target.closest("[data-capricho]");
      if (cap) { abrirSelectorCapricho(cap.getAttribute("data-capricho")); return; }

      var vac = e.target.closest("[data-vaciardia]");
      if (vac) { vaciarDia(vac.getAttribute("data-vaciardia")); return; }
      var des = e.target.closest("[data-desvaciar]");
      if (des) { deshacerVaciado(des.getAttribute("data-desvaciar")); return; }
      /* Contador de cantidad. En las tomas y en los caprichos funciona igual:
         «+» mete otra ración del mismo plato, «−» quita la última, «×» las quita
         todas. Todo sobre las mismas listas de ids que ya había. */
      var mas = e.target.closest("[data-mas]");
      if (mas) {
        var pm = mas.getAttribute("data-mas").split("|");
        var dm = Almacen.estado.plan[pm[0]];
        if (dm && dm[pm[1]]) { dm[pm[1]].push(pm[2]); Almacen.tocarDia(pm[0]); Almacen.guardar("plato"); pintarMenu(); }
        return;
      }
      var menos = e.target.closest("[data-menos]");
      if (menos) {
        var pn = menos.getAttribute("data-menos").split("|");
        var dn = Almacen.estado.plan[pn[0]];
        if (dn && dn[pn[1]]) {
          var fueraN = dn[pn[1]][parseInt(pn[2], 10)];
          dn[pn[1]].splice(parseInt(pn[2], 10), 1);
          tocarYGuardarToma(pn[0], pn[1], fueraN);
        }
        return;
      }
      var quitarT = e.target.closest("[data-quitartodo]");
      if (quitarT) {
        var qt = quitarT.getAttribute("data-quitartodo").split("|");
        var dt = Almacen.estado.plan[qt[0]];
        if (dt && dt[qt[1]]) {
          dt[qt[1]] = dt[qt[1]].filter(function (x) { return x !== qt[2]; });
          tocarYGuardarToma(qt[0], qt[1], qt[2]);
        }
        return;
      }
      var masCap = e.target.closest("[data-mascap]");
      if (masCap) {
        var pmc = masCap.getAttribute("data-mascap").split("|");
        var dmc = Almacen.asegurarDia(pmc[0]);
        dmc.capricho.push(pmc[1]);
        Almacen.tocarDia(pmc[0]);
        Almacen.guardar("capricho"); pintarMenu();
        return;
      }
      var menosCap = e.target.closest("[data-menoscap]");
      if (menosCap) {
        var pnc = menosCap.getAttribute("data-menoscap").split("|");
        var dnc = Almacen.asegurarDia(pnc[0]);
        dnc.capricho.splice(parseInt(pnc[1], 10), 1);
        Almacen.tocarDia(pnc[0]);
        Almacen.guardar("capricho"); pintarMenu();
        return;
      }
      var quitaCapT = e.target.closest("[data-quitacaptodo]");
      if (quitaCapT) {
        var qct = quitaCapT.getAttribute("data-quitacaptodo").split("|");
        var dct = Almacen.asegurarDia(qct[0]);
        dct.capricho = dct.capricho.filter(function (x) { return x !== qct[1]; });
        Almacen.tocarDia(qct[0]);
        Almacen.guardar("capricho"); pintarMenu();
        return;
      }
      var qcap = e.target.closest("[data-quitacap]");
      if (qcap) {
        var pc = qcap.getAttribute("data-quitacap").split("|");
        var dc = Almacen.asegurarDia(pc[0]);
        dc.capricho.splice(parseInt(pc[1], 10), 1);
        Almacen.tocarDia(pc[0]);
        Almacen.guardar("capricho");
        pintarMenu();
        return;
      }
      var ab = e.target.closest("[data-abrir]");
      if (ab) {
        var fa = ab.getAttribute("data-abrir");
        if (UI.desbloqueados[fa]) delete UI.desbloqueados[fa];
        else UI.desbloqueados[fa] = true;
        pintarMenu();
        return;
      }
      var cm = e.target.closest("[data-comensales]");
      if (cm) {
        var pc = cm.getAttribute("data-comensales").split("|");
        var ahora = Almacen.comensales(pc[0], pc[1]);
        var nuevo = Math.max(1, Math.min(8, ahora + parseInt(pc[2], 10)));
        if (nuevo !== ahora) { Almacen.ponerComensales(pc[0], pc[1], nuevo); pintarMenu(); }
        return;
      }
      var fu = e.target.closest("[data-fuera]");
      if (fu) {
        var pf = fu.getAttribute("data-fuera").split("|");
        Almacen.ponerFuera(pf[0], pf[1], !Almacen.esFuera(pf[0], pf[1]));
        pintarMenu();
        return;
      }
      var est = e.target.closest("[data-estandar]");
      if (est) {
        var fe = est.getAttribute("data-estandar");
        /* la misma norma que arriba, también aquí: si el plan ya manda algo ese
           día, el estándar no entra ni aunque se llegue al botón por otra vía */
        if (Almacen.entrenoDelDia(fe).some(function (z) { return !z.x && z.clase === "previsto"; })) {
          Util.toast("Ese día ya tiene la sesión que manda el plan");
          return;
        }
        var n3 = Almacen.aplicarEntrenoEstandar(fe, true);
        pintarMenu();
        Util.toast(n3 ? "Entreno estándar puesto" : "Ese día ya tiene el entreno medido por el reloj");
        return;
      }
      var act = e.target.closest("[data-actividad]");
      if (act) { abrirSelectorActividad(act.getAttribute("data-actividad")); return; }
      var qact = e.target.closest("[data-quitaract]");
      if (qact) {
        var q2 = qact.getAttribute("data-quitaract").split("|");
        Almacen.quitarActividad(q2[0], +q2[1]);
        pintarMenu();
        return;
      }
      var cpr = e.target.closest("[data-comprado]");
      if (cpr) {
        var pp = cpr.getAttribute("data-comprado").split("|");
        Almacen.marcarComprado(pp[0], pp[1], pp[2], !Almacen.estaComprado(pp[0], pp[1], pp[2]));
        pintarMenu();
        return;
      }
      /* (el botón Reprogramar ya no se escucha aquí: vive en su propia caja, más arriba) */
      var rl = e.target.closest("[data-real]");
      if (rl) {
        var rr = rl.getAttribute("data-real").split("|");
        abrirCantidadReal(rr[0], rr[1], rr[2]);
        return;
      }
      var com = e.target.closest("[data-comido]");
      if (com) {
        var c = com.getAttribute("data-comido").split("|");
        Almacen.marcarComido(c[0], c[1], c[2], !Almacen.estaComido(c[0], c[1], c[2]));
        pintarMenu();
        return;
      }
      var quitar = e.target.closest("[data-quitar]");
      if (quitar) {
        var q = quitar.getAttribute("data-quitar").split("|");
        var dia = Almacen.estado.plan[q[0]];
        if (dia && dia[q[1]]) {
          var fueraQ = dia[q[1]][+q[2]];
          dia[q[1]].splice(+q[2], 1);
          tocarYGuardarToma(q[0], q[1], fueraQ);
        }
        return;
      }
      var ficha = e.target.closest("[data-ficha]");
      if (ficha) {
        var ctx = (ficha.getAttribute("data-ficha-dia") || "").split("|");
        abrirFicha(ficha.getAttribute("data-ficha"), ctx[0] || null, ctx[1] || null);
      }
    });

    /* --- recetas --- */
    $("#buscar-receta").addEventListener("input", function (e) { UI.filtros.texto = e.target.value; pintarRecetas(); });
    $("#filtro-toma").addEventListener("change", function (e) { UI.filtros.toma = e.target.value; pintarRecetas(); });
    $("#filtro-grupo").addEventListener("change", function (e) { UI.filtros.grupo = e.target.value; pintarRecetas(); });
    $("#filtro-tool").addEventListener("change", function (e) { UI.filtros.tool = e.target.value; pintarRecetas(); });
    $("#nueva-receta").addEventListener("click", function () { abrirEditor(null); });
    $("#receta-ia").addEventListener("click", abrirRecetaIA);
    $("#rejilla-recetas").addEventListener("click", function (e) {
      var c = e.target.closest("[data-ficha]");
      if (c) abrirFicha(c.getAttribute("data-ficha"));
    });

    /* --- la fila de ingredientes, debajo de la de recetas --- */
    $("#selector-fila").addEventListener("click", function (e) {
      var b = e.target.closest("[data-fila]");
      if (b) ponerFila(b.getAttribute("data-fila"));
    });
    $("#filtro-ing-clase").addEventListener("change", function (e) {
      UI.filtrosIng.clase = e.target.value; pintarIngredientes();
    });
    $("#buscar-ingrediente").addEventListener("input", function (e) {
      UI.filtrosIng.texto = e.target.value; pintarIngredientes();
    });
    $("#filtro-seccion").addEventListener("change", function (e) {
      UI.filtrosIng.cat = e.target.value; pintarIngredientes();
    });
    $("#nuevo-ingrediente").addEventListener("click", function () {
      abrirIngrediente(null, UI.filtrosIng.texto || "");
    });
    $("#ingrediente-ia").addEventListener("click", function () {
      abrirIngredienteIA(UI.filtrosIng.texto || "");
    });
    $("#rejilla-ingredientes").addEventListener("click", function (e) {
      var c = e.target.closest("[data-ingrediente]");
      if (c) abrirIngrediente(c.getAttribute("data-ingrediente"));
    });

    /* --- modal --- */
    $("#modal").addEventListener("click", function (e) {
      /* LA PASADA, ANTES DEL CIERRE. Su botón de abajo lleva `data-cerrar`, así
         que si el cierre fuera primero no se llegaría nunca a lo de aquí. Y el
         `details` de cada sitio se recuerda para que repintar una línea no te
         cierre el armario que estabas mirando. */
      var pb = e.target.closest("[data-pas]");
      if (pb) {
        var par = pb.getAttribute("data-pas").split(":");
        var nec = parseFloat(pb.getAttribute("data-nec") || "0");
        Almacen.responderPasada(par[0], par[1], par[1] === "hay" ? nec : 0);
        refrescarLineaPasada(par[0]);
        if (typeof pintarCompra === "function") pintarCompra();
        return;
      }
      var pd = e.target.closest("[data-pasitio]");
      if (pd) pasadaAbierta = pd.getAttribute("data-pasitio");
      if (e.target.id === "modal" || e.target.closest("[data-cerrar]")) { cerrarModal(); return; }
      var ed = e.target.closest("[data-editar]");
      if (ed) { abrirEditor(ed.getAttribute("data-editar")); return; }
      var du = e.target.closest("[data-duplicar]");
      if (du) {
        var orig = Almacen.receta(du.getAttribute("data-duplicar"));
        var copia = JSON.parse(JSON.stringify(orig));
        copia.id = "propia_" + Date.now().toString(36);
        copia.n = orig.n + " (copia)";
        Almacen.estado.recetas.push(copia);
        Almacen.guardar("receta");
        cerrarModal(); pintarRecetas();
        Util.toast("Receta duplicada");
        return;
      }
      var bo = e.target.closest("[data-borrar]");
      if (bo) {
        var id = bo.getAttribute("data-borrar");
        if (!confirm("¿Borrar esta receta del recetario?")) return;
        Almacen.estado.recetas = Almacen.estado.recetas.filter(function (r) { return r.id !== id; });
        Almacen.guardar("receta");
        cerrarModal(); pintarRecetas(); pintarMenu();
        Util.toast("Receta borrada");
      }
    });

    /* --- compra --- */
    $("#compra-cuando").addEventListener("change", function (e) {
      UI.cuandoCompra = e.target.value;
      pintarCompra();
    });
    /* HA LLEGADO LA COMPRA.
       Lo normal es que todo lo pedido haya llegado, así que no se repasa nada:
       se confirma y ya. Solo se marcan las EXCEPCIONES, y al marcar una puedes
       decir cuántos llegaron, que con Amazon partiendo los envíos pasa. Lo que
       no llegue se va a la lista de recados. */
    $("#compra-confirmar").addEventListener("click", function () {
      var lineas = [];
      (compraActual ? compraActual.secciones : []).forEach(function (sec) {
        sec.lineas.forEach(function (l) { if (l.marcado) lineas.push(l); });
      });
      (compraActual ? compraActual.basicos : []).forEach(function (l) { if (l.marcado) lineas.push(l); });
      var hg = Almacen.compraHogar();
      var casa = hg.amazon.concat(hg.super).filter(function (x) { return Almacen.estaPedido(x.id); });

      if (!lineas.length && !casa.length) {
        Util.toast("No hay nada pedido: tacha primero lo que hayas encargado");
        return;
      }

      var html = '<header><h2>Ha llegado la compra</h2><button class="cerrar" data-cerrar>\u00d7</button></header>';
      html += '<p class="nota-peque">Todo lo pedido entra en casa. <b>Marca solo lo que no haya venido.</b></p>';
      var pinta = function (id, nombre, cuantos, esHogar) {
        return '<div class="linea">' +
          '<input type="checkbox" data-falto="' + esc(id) + '" title="No ha llegado">' +
          '<div class="datos"><div class="nombre">' + esc(nombre) + '</div>' +
          '<div class="detalle">' + (cuantos > 1 ? "pediste " + cuantos : "") + '</div></div>' +
          (esHogar || cuantos <= 1 ? '' :
            '<input type="number" class="stock-cant" data-llegaron="' + esc(id) + '" min="0" max="' + cuantos +
            '" step="1" value="0" style="width:62px; text-align:right" title="Cu\u00e1ntos llegaron">') +
          '</div>';
      };
      if (lineas.length) {
        html += '<p class="aviso-grupo">Comida</p>';
        lineas.forEach(function (l) { html += pinta(l.id, l.producto || l.nombre, l.envases || 1, false); });
      }
      if (casa.length) {
        html += '<p class="aviso-grupo">Casa</p>';
        casa.forEach(function (x) { html += pinta(x.id, x.n, x.c, true); });
      }
      html += '<div class="fila" style="margin-top:14px">' +
              '<button class="btn principal" id="cf-ok">Ha llegado todo lo dem\u00e1s</button>' +
              '<button class="btn" data-cerrar>Cancelar</button></div>';
      abrirModal(html);

      $("#cf-ok").addEventListener("click", function () {
        var faltas = {}, faltasHogar = {};
        $$("#modal [data-falto]").forEach(function (c) {
          if (!c.checked) return;
          var id = c.getAttribute("data-falto");
          var n = document.querySelector('[data-llegaron="' + id + '"]');
          faltas[id] = n ? (parseInt(n.value, 10) || 0) : 0;
          faltasHogar[id] = true;
        });
        var res = Almacen.confirmarCompra(lineas, faltas);
        Almacen.confirmarHogar(casa.map(function (x) { return x.id; }), faltasHogar);
        cerrarModal(); pintarCompra(); pintarDespensa();
        Util.toast("Entraron " + res.entraron + " en la despensa" +
                   (res.recados ? " \u00b7 " + res.recados + " a recados" : ""));
      });
    });
    $("#compra-recalcular").addEventListener("click", pintarCompra);
    var bp = $("#compra-pasada");
    if (bp) bp.addEventListener("click", abrirPasada);
    $("#compra-ocultar").addEventListener("click", function () { UI.ocultarComprados = !UI.ocultarComprados; pintarCompra(); });
    /* Los platos de la compra: marcar uno, o el día entero de un golpe. */
    $("#platos-compra").addEventListener("click", function (e) {
      var d = e.target.closest("[data-diacomprado]");
      if (d) {
        var n = Almacen.marcarRangoComprado(d.getAttribute("data-diacomprado"), 1, true);
        Util.toast(n ? "Marcados " + n + " platos" : "Ya estaba todo marcado");
        pintarCompra();
        return;
      }
      /* Recordar si el bloque queda abierto o cerrado, para no tener que desplegarlo
         cada vez que se recalcula la lista. */
      var det = e.target.closest("details.platos-compra");
      if (det && e.target.closest("summary")) UI.verPlatosCompra = !det.open;
    });
    $("#platos-compra").addEventListener("change", function (e) {
      var m = e.target.closest("[data-platocompra]");
      if (!m) return;
      var pp = m.getAttribute("data-platocompra").split("|");
      Almacen.marcarComprado(pp[0], pp[1], pp[2], m.checked);
      pintarCompra();
    });
    $("#lista-compra").addEventListener("click", function (e) {
      var enc = e.target.closest("[data-encasa]");
      if (enc) {
        /* «Lo tengo» no es una casilla aparte: es decirle a la despensa que ya hay
           lo que hace falta. Así hay UNA contabilidad y no tres. */
        var id = enc.getAttribute("data-encasa");
        var l = null;
        (compraActual ? compraActual.secciones : []).forEach(function (sec) {
          sec.lineas.forEach(function (x) { if (x.id === id) l = x; });
        });
        (compraActual ? compraActual.basicos : []).forEach(function (x) { if (x.id === id) l = x; });
        if (l) {
          Almacen.ponerStock(id, Math.max(Almacen.stockDe(id), l.pide));
          pintarCompra();
          Util.toast("Apuntado en la despensa: ya no se pide");
        }
        return;
      }
      var rec = e.target.closest("[data-recado]");
      if (rec) { Almacen.quitarRecado(rec.getAttribute("data-recado")); pintarCompra(); return; }
      var mk = e.target.closest("[data-marcaring]");
      if (mk) {
        abrirIngrediente(mk.getAttribute("data-marcaring"), "", function () { pintarCompra(); });
        return;
      }
    });
    $("#lista-compra").addEventListener("change", function (e) {
      var m = e.target.closest("[data-marcar]");
      if (m) {
        /* Tachar es PEDIR, no recibir. Lo que entra en casa entra al confirmar
           la llegada. Vale igual para la comida y para lo de casa. */
        Almacen.ponerPedido(m.getAttribute("data-marcar"), m.checked);
        setTimeout(pintarCompra, 0);
      }
    });
    $("#bloque-quiero").addEventListener("click", function (e) {
      var a = e.target.closest("[data-quiero]");
      if (a) {
        Almacen.quererEstaVez(a.getAttribute("data-quiero"), true, 1);
        UI.buscaQuiero = "";
        pintarCompra(); return;
      }
      var pq = e.target.closest("[data-quieropaso]");
      if (pq) {
        var pr = pq.getAttribute("data-quieropaso").split("|");
        var act = ((Almacen.estado.quiero || {})[pr[0]] || {}).p || 1;
        var n = act + Number(pr[1]);
        if (n < 1) Almacen.quererEstaVez(pr[0], false);
        else Almacen.quererEstaVez(pr[0], true, n);
        pintarCompra(); return;
      }
      var qq = e.target.closest("[data-quieroquita]");
      if (qq) {
        Almacen.quererEstaVez(qq.getAttribute("data-quieroquita"), false);
        pintarCompra(); return;
      }
    });
    $("#bloque-quiero").addEventListener("input", function (e) {
      if (e.target.id !== "buscar-quiero") return;
      UI.buscaQuiero = e.target.value;
      pintarQuiero();
      /* el repintado se lleva el foco y con \u00e9l lo que estabas escribiendo */
      var c = $("#buscar-quiero");
      if (c) { c.focus(); c.setSelectionRange(c.value.length, c.value.length); }
    });
    $("#lista-recados").addEventListener("click", function (e) {
      var rec = e.target.closest("[data-recado]");
      if (rec) { Almacen.quitarRecado(rec.getAttribute("data-recado")); pintarCompra(); }
    });
    $("#compra-marcas").addEventListener("click", function () {
      abrirMarcas(faltanMarcas(), function () { pintarCompra(); pintarHogar(); });
    });
    $("#compra-copiar").addEventListener("click", function () {
      var texto = textoCompra(true);
      if (navigator.clipboard) navigator.clipboard.writeText(texto).then(function () { Util.toast("Lista copiada"); });
      else Util.toast("Copia manualmente desde «Preparar compra»");
    });
    $("#compra-para-claude").addEventListener("click", function () {
      var texto = "Claude, haz por m\u00ed la parte de AMAZON de esta compra. Lo del S\u00daPER " +
                  "no lo pidas: eso lo compro yo.\n\n" + textoCompra(true);
      abrirModal('<header><h2>Compra para pasarme</h2><button class="cerrar" data-cerrar>×</button></header>' +
        '<p class="nota-peque">Copia este texto y pégamelo en el chat: abro Amazon en tu navegador y voy añadiendo los productos al carrito.</p>' +
        '<textarea class="salida" id="texto-claude">' + esc(texto) + '</textarea>' +
        '<div class="fila" style="margin-top:10px"><button class="btn principal" id="copiar-claude">Copiar</button></div>');
      $("#copiar-claude").addEventListener("click", function () {
        var ta = $("#texto-claude"); ta.select();
        if (navigator.clipboard) navigator.clipboard.writeText(ta.value);
        else document.execCommand("copy");
        Util.toast("Copiado");
      });
    });

    /* --- despensa --- */
    $("#selector-despensa").addEventListener("click", function (e) {
      var b = e.target.closest("[data-desp]");
      if (b) ponerFilaDespensa(b.getAttribute("data-desp"));
    });
    $("#buscar-loc").addEventListener("input", function (e) {
      UI.buscaLoc = e.target.value; pintarLocalizacion();
    });
    /* AL ELEGIR ESTANTE NO SE REPINTA NADA. Carlos, 24-sep-2026: «cuando
       modifico algo en alacena se guarda y se cierra y se va arriba; podemos
       hacer que donde escribo se quede, y que cierre y haga scroll yo».
       Tenía razón dos veces. Rehacer la lista entera cerraba el `details` de la
       zona y te devolvía al principio, y con doscientas líneas eso significa
       buscar otra vez por dónde ibas. Ahora la fila se queda donde está, dice a
       dónde se ha ido, y los contadores se ajustan a mano. Cuando quieras verlo
       recolocado está el botón «Reordenar». */
    $("#rejilla-loc").addEventListener("change", function (e) {
      var sel = e.target.closest("[data-loc]");
      if (!sel) return;
      var id = sel.getAttribute("data-loc"), v = sel.value;
      if (v) Almacen.ponerSitio(id, v);
      else { var g0 = Almacen.ingrediente(id); if (g0) { delete g0.sitio; Almacen.guardar("ingrediente"); } }
      var fila = document.querySelector('[data-locfila="' + id + '"]');
      if (fila) {
        fila.classList.toggle("movida", !!v);
        var det = fila.querySelector(".detalle");
        var g = Almacen.ingrediente(id);
        if (det) det.innerHTML = esc(g ? g.cat : "") +
          (v ? ' · <b style="color:var(--verde)">en ' + esc(Almacen.nombreSitio(v)) + '</b>'
             : ' · <b style="color:var(--ambar)">sin colocar</b>');
      }
      contadoresLoc();
    });
    /* El pliegue SÓLO desde la cabecera de la zona. Estaba escuchando cualquier
       clic dentro del `details`, así que abrir el desplegable cerraba la zona:
       el clic del `select` también casaba con `closest("[data-zona]")`. */
    $("#rejilla-loc").addEventListener("click", function (e) {
      var sum = e.target.closest("summary");
      if (!sum) return;
      var d = sum.closest("[data-zona]");
      if (d) UI.zonaAbierta = UI.zonaAbierta === d.getAttribute("data-zona")
        ? null : d.getAttribute("data-zona");
    });
    $("#buscar-tengo").addEventListener("input", function (e) {
      UI.buscaTengo = e.target.value; pintarLoTengo();
    });
    $("#rejilla-tengo").addEventListener("click", function (e) {
      var b = e.target.closest("[data-tengo]");
      if (b) {
        var par = b.getAttribute("data-tengo").split(":");
        /* tocar el nivel que ya estaba puesto lo quita: es como se dice «esto
           ya no está», sin necesidad de un botón de «no queda» en cada línea */
        var quita = b.classList.contains("activo");
        Almacen.responderRecorrido(par[0], quita ? null : par[1]);
        refrescarLineaTengo(par[0]);
        return;
      }
      /* --- la ronda --- */
      if (e.target.closest("#ronda-borrar")) {
        var cuantos = Object.keys(Almacen.estado.stock || {}).length;
        if (!cuantos) { Util.toast("No hay nada apuntado"); return; }
        if (!confirm("Se borra lo apuntado en " + cuantos +
            (cuantos === 1 ? " producto" : " productos") +
            ", y los trece estantes quedan sin repasar.\n\nRecuperarlo es volver a dar la vuelta a la casa. ¿Seguro?")) return;
        Almacen.borrarStock();
        UI.pase = { vista: "indice", estante: null, i: 0 };
        UI.estanteTengo = null;
        pintarLoTengo(); Util.toast("Borrado: " + cuantos + " productos sin apuntar"); return;
      }
      if (e.target.closest("#ronda-empezar")) {
        Almacen.iniciarRonda();
        UI.pase = { vista: "indice", estante: null, i: 0 };
        UI.estanteTengo = null;
        pintarLoTengo(); Util.toast("Ronda empezada: los estantes vuelven a «sin repasar»"); return;
      }
      var pv = e.target.closest("[data-porvisto]");
      if (pv) {
        var kv = pv.getAttribute("data-porvisto");
        Almacen.darPorVisto(kv);
        UI.pase = { vista: "indice", estante: null, i: 0 };
        pintarLoTengo(); Util.toast("Dado por visto: sigue como estaba"); return;
      }
      var ir = e.target.closest("[data-irestante]");
      if (ir) {
        UI.pase = { vista: "estante", estante: ir.getAttribute("data-irestante"), i: 0 };
        UI.estanteTengo = null;
        pintarLoTengo(); arribaTengo(); return;
      }
      if (e.target.closest("[data-paseempezar]")) {
        UI.pase.vista = "ficha"; UI.pase.i = 0; pintarLoTengo(); arribaTengo(); return;
      }
      if (e.target.closest("[data-paselista]")) {
        var kl = UI.pase.estante;
        UI.pase = { vista: "indice", estante: null, i: 0 };
        irEstanteTengo(kl); return;
      }
      if (e.target.closest("[data-pasesalir]")) {
        UI.pase = { vista: "indice", estante: null, i: 0 };
        UI.estanteTengo = null; pintarLoTengo(); arribaTengo(); return;
      }
      if (e.target.closest("[data-paseatras]")) {
        if (UI.pase.i > 0) UI.pase.i--;
        UI.pase.vista = "ficha"; pintarLoTengo(); return;
      }
      if (e.target.closest("[data-pasedelante]")) {
        var pd = Almacen.pase(UI.pase.estante);
        if (pd && UI.pase.i + 1 < pd.fichas.length) UI.pase.i++;
        UI.pase.vista = "ficha"; pintarLoTengo(); return;
      }
      var bs = e.target.closest("[data-pasesig]");
      if (bs) {
        /* apuntar cero también es una respuesta: dice que has mirado la huevera
           y estaba vacía, que no es lo mismo que no haberla abierto */
        var ps = bs.getAttribute("data-pasesig").split("|");
        if (ps.length === 2) Almacen.contarStock(ps[0], Number(ps[1]));
        avanzarFicha(); return;
      }

      /* --- contestar una ficha: se marca y se pasa a la siguiente --- */
      var bf = e.target.closest("[data-ficha]");
      if (bf) {
        var pf = bf.getAttribute("data-ficha").split(":");
        Almacen.responderRecorrido(pf[0], bf.classList.contains("activo") ? null : pf[1]);
        avanzarFicha(); return;
      }
      var bc = e.target.closest("[data-cuenta]");
      if (bc) {
        var pc = bc.getAttribute("data-cuenta").split("|");
        Almacen.contarStock(pc[0], Number(pc[1]));
        if (UI.pase.vista === "ficha") { avanzarFicha(); return; }
        refrescarLineaTengo(pc[0]); return;
      }
      var bp = e.target.closest("[data-cuentapaso]");
      if (bp) {
        /* EN ENVASES, NO EN GRAMOS. `stockDe` devuelve la cantidad —440 ml de
           concentrado—, pero `contarStock` cuenta ENVASES, así que el + le
           sumaba medio mililitro a una botella y la cifra no se movía. En los
           huevos no se notaba porque una pieza es una unidad y los dos números
           coinciden. (Carlos, 25-sep-2026: «el + y el − de agua con gas no
           funciona».) */
        var pp = bp.getAttribute("data-cuentapaso").split("|");
        var act = Almacen.piezasDe(pp[0]);
        var paso2 = Number(pp[1]);
        var n2 = Math.round((act + paso2) * 100) / 100;
        Almacen.contarStock(pp[0], n2 > 0 ? n2 : 0);
        /* en la lista se refresca sólo esa línea: repintar cierra el estante y
           te devuelve arriba, que es lo que él pidió que no pasara nunca */
        if (UI.pase.vista === "ficha") pintarLoTengo();
        else refrescarLineaTengo(pp[0]);
        return;
      }
      var bq = e.target.closest("[data-quiero]");
      if (bq) {
        var idq = bq.getAttribute("data-quiero");
        var yaq = Almacen.quiereEstaVez(idq);
        Almacen.quererEstaVez(idq, !yaq, 1);
        Util.toast(yaq ? "Quitado de la lista" : "A\u00f1adido a la pr\u00f3xima compra");
        pintarLoTengo(); return;
      }
      var bb = e.target.closest("[data-paseborrar]");
      if (bb) {
        var res = Almacen.borrarIngrediente(bb.getAttribute("data-paseborrar"));
        if (!res.ok) { Util.toast("No se puede: lo usan " + (res.platos || []).length + " platos"); return; }
        pintarLoTengo(); Util.toast("Quitado de tu casa. Se recupera desde Catálogo"); return;
      }
      if (e.target.closest("[data-tengovolver]")) { irEstanteTengo(null); return; }
    });

    /* Sube al principio del bloque: cada pantalla del pase empieza arriba. */
    function arribaTengo() {
      var c = $("#rejilla-tengo");
      if (!c) return;
      try {
        var y = c.getBoundingClientRect().top + (window.pageYOffset || 0) - 58;
        window.scrollTo({ top: y > 0 ? y : 0 });
      } catch (e2) {}
    }
    $("#rejilla-tengo").addEventListener("change", function (e) {
      if (e.target.id === "salto-estante") irEstanteTengo(e.target.value);
    });
    var bret = $("#tengo-reordenar");
    if (bret) bret.addEventListener("click", function () { pintarLoTengo(); });
    var bre = $("#loc-reordenar");
    if (bre) bre.addEventListener("click", function () {
      pintarLocalizacion();
      var c = $("#rejilla-loc");
      if (c) try { c.scrollIntoView({ block: "start" }); } catch (e3) {}
    });
    /* ---------- el gestor de cómo se pide ---------- */
    $("#buscar-pedir").addEventListener("input", function (e) {
      UI.buscaPedir = e.target.value;
      /* al buscar se abren los grupos: si no, ves cabeceras y no el resultado */
      if (UI.buscaPedir.trim()) {
        Almacen.gestorPedir(UI.buscaPedir).grupos.forEach(function (gr) {
          UI.grupoPedir[gr.k || "_"] = true;
        });
      }
      pintarPedir();
      var c = $("#buscar-pedir");
      if (c) { c.focus(); c.setSelectionRange(c.value.length, c.value.length); }
    });
    $("#filtro-pedir").addEventListener("change", function (e) {
      UI.filtroPedir = e.target.value;
      if (UI.filtroPedir) {
        Almacen.gestorPedir(UI.buscaPedir).grupos.forEach(function (gr) {
          UI.grupoPedir[gr.k || "_"] = true;
        });
      }
      pintarPedir();
    });
    $("#rejilla-pedir").addEventListener("click", function (e) {
      var gc = e.target.closest("[data-grupopedir]");
      if (gc) {
        var k = gc.getAttribute("data-grupopedir");
        UI.grupoPedir[k] = !UI.grupoPedir[k];
        pintarPedir(); return;
      }
      var lp = e.target.closest("[data-lotepedir]");
      if (lp) {
        var pl = lp.getAttribute("data-lotepedir").split("|");
        var idsl = pl[1] ? pl[1].split(",") : [];
        /* AVISAR ANTES DE «NUNCA» si hay platos que lo usan: poner «nunca» a algo
           que una receta necesita deja el plato sin poder comprarse, y eso no se
           hace por descuido. */
        if (pl[0] === "nunca") {
          var conPlatos = idsl.filter(function (id) { return Almacen.cuantasRecetas(id) > 0; });
          if (conPlatos.length && !window.confirm(
              conPlatos.length + (conPlatos.length === 1 ? " de \u00e9stas sale en alguna receta"
                                                        : " de \u00e9stas salen en alguna receta") +
              ". Con \u00abnunca\u00bb no entrar\u00e1n en la lista aunque el men\u00fa las pida. \u00bfSeguro?")) return;
        }
        var nl = Almacen.modoPedirLote(idsl, pl[0]);
        Util.toast(nl + (nl === 1 ? " ficha puesta en " : " fichas puestas en ") +
          Almacen.nombreModo(pl[0]).toLowerCase());
        pintarPedir(); return;
      }
      var lf = e.target.closest("[data-loteformato]");
      if (lf) {
        var pf = lf.getAttribute("data-loteformato").split("|");
        var nf = Almacen.ponerFormatoLote(pf[1] ? pf[1].split(",") : [], pf[0]);
        Util.toast(nf + (nf === 1 ? " ficha con contenedor" : " fichas con contenedor"));
        pintarPedir(); return;
      }
      var mp = e.target.closest("[data-modopedir]");
      if (mp) {
        var pm = mp.getAttribute("data-modopedir").split("|");
        if (pm[1] === "nunca" && Almacen.cuantasRecetas(pm[0]) > 0 && !window.confirm(
            "Sale en " + Almacen.cuantasRecetas(pm[0]) + " receta(s). Con \u00abnunca\u00bb no entrar\u00e1 " +
            "en la lista aunque el men\u00fa la pida. \u00bfSeguro?")) return;
        Almacen.ponerModoPedir(pm[0], pm[1]);
        pintarPedir(); return;
      }
    });
    $("#rejilla-pedir").addEventListener("change", function (e) {
      var mn = e.target.closest("[data-minpedir]");
      var lo = e.target.closest("[data-lotenum]");
      if (!mn && !lo) return;
      var id = (mn || lo).getAttribute(mn ? "data-minpedir" : "data-lotenum");
      var fila = (mn || lo).closest(".linea-pedir");
      var im = fila.querySelector("[data-minpedir]"), il = fila.querySelector("[data-lotenum]");
      Almacen.ponerMinimoLote(id, Number(im ? im.value : 0), Number(il ? il.value : 1));
      pintarPedir();
    });
    $("#buscar-hogar").addEventListener("input", function (e) { UI.busquedaHogar = e.target.value; pintarHogar(); });
    $("#filtro-hogar-cajon").addEventListener("change", function (e) { UI.cajonHogar = e.target.value; pintarHogar(); });
    $("#hogar-nuevo").addEventListener("click", function () { abrirHogar(null); });
    $("#rejilla-hogar").addEventListener("change", function (e) {
      var f = e.target.closest("[data-falta]");
      if (f) {
        Almacen.marcarFaltaHogar(f.getAttribute("data-falta"), f.checked, 1);
        setTimeout(function () { pintarHogar(); pintarCompra(); }, 0);
        return;
      }
      var c = e.target.closest("[data-hcant]");
      if (c) {
        var n = parseInt(c.value, 10);
        Almacen.marcarFaltaHogar(c.getAttribute("data-hcant"), true, n > 0 ? n : 1);
        setTimeout(function () { pintarHogar(); pintarCompra(); }, 0);
      }
    });
    $("#rejilla-hogar").addEventListener("click", function (e) {
      var ed = e.target.closest("[data-edithogar]");
      if (ed) abrirHogar(ed.getAttribute("data-edithogar"));
    });
    $("#buscar-despensa").addEventListener("input", function (e) { UI.busquedaDespensa = e.target.value; pintarDespensa(); });
    $("#rejilla-despensa").addEventListener("input", function (e) {
      var bs = e.target.closest("[data-buscasitio]");
      if (bs) {
        var k = bs.getAttribute("data-buscasitio");
        UI.buscaSitio[k] = bs.value;
        UI.sitioAbierto = k;
        var pos = bs.selectionStart;
        pintarDespensa();
        var nuevo = document.querySelector('[data-buscasitio="' + k + '"]');
        if (nuevo) { nuevo.focus(); try { nuevo.setSelectionRange(pos, pos); } catch (err) {} }
      }
    });
    $("#rejilla-despensa").addEventListener("change", function (e) {
      var st = e.target.closest("[data-stock]");
      if (!st) return;
      var id = st.getAttribute("data-stock");
      Almacen.ponerStock(id, parseFloat(String(st.value).replace(",", ".")));
      setTimeout(function () { refrescarLineaStock(id); }, 0);
    });
    /* La cifra del «queda esto» de la pasada. La emergente tiene su propio
       oyente de `change`: el de la rejilla de la despensa no llega hasta aquí. */
    $("#modal").addEventListener("change", function (e) {
      var pc = e.target.closest("[data-pascifra]");
      if (!pc) return;
      var id = pc.getAttribute("data-pascifra");
      Almacen.responderPasada(id, "parte", parseFloat(String(pc.value).replace(",", ".")));
      if (typeof pintarCompra === "function") pintarCompra();
    });
    $("#rejilla-despensa").addEventListener("toggle", function (e) {
      var d = e.target.closest("details[data-sitio]");
      if (!d) return;
      if (d.open) UI.sitioAbierto = d.getAttribute("data-sitio");
      else if (UI.sitioAbierto === d.getAttribute("data-sitio")) UI.sitioAbierto = "";
    }, true);
    $("#rejilla-despensa").addEventListener("click", function (e) {
      var paso = e.target.closest("[data-mas-stock]") || e.target.closest("[data-menos-stock]");
      if (paso) {
        var idp = paso.getAttribute("data-mas-stock") || paso.getAttribute("data-menos-stock");
        var suma = paso.hasAttribute("data-mas-stock") ? 1 : -1;
        var nueva = Almacen.stockDe(idp) + suma;
        if (nueva < 0) nueva = 0;
        Almacen.ponerStock(idp, nueva);
        var campo = document.querySelector('[data-stock="' + idp + '"]');
        if (campo) campo.value = nueva;
        refrescarLineaStock(idp);
        return;
      }
      var cero = e.target.closest("[data-cero]");
      if (cero) {
        var idc = cero.getAttribute("data-cero");
        Almacen.ponerStock(idc, 0);
        var c2 = document.querySelector('[data-stock="' + idc + '"]');
        if (c2) c2.value = 0;
        refrescarLineaStock(idc); return;
      }
      var poner = e.target.closest("[data-poner]");
      if (poner) {
        var id = poner.getAttribute("data-poner");
        /* Entra como \u00absabemos que lo tienes, pero no cu\u00e1nto\u00bb. Si entrara con un
           cero confirmado desaparecer\u00eda de la lista en el acto, porque un cero ya
           contado no se ense\u00f1a: cero es \u00abse ha acabado\u00bb, no \u00abacabo de a\u00f1adirlo\u00bb. */
        if (!Almacen.estado.stock) Almacen.estado.stock = {};
        Almacen.estado.stock[id] = { c: 0, f: null, pte: true };
        Almacen.guardar("stock");
        var sitio2 = Almacen.sitioDe(id);
        UI.busquedaDespensa = "";
        UI.buscaSitio[sitio2] = "";
        UI.sitioAbierto = sitio2;
        var buscador = $("#buscar-despensa");
        if (buscador) buscador.value = "";
        pintarDespensa();
        /* Se abre el campo reci\u00e9n creado para escribir la cantidad sin buscarlo. */
        var campo = document.querySelector('[data-stock="' + id + '"]');
        if (campo) { campo.focus(); campo.select(); }
        return;
      }
      var rep = e.target.closest("[data-contado]");
      if (rep) {
        var k = rep.getAttribute("data-contado");
        if (!Almacen.estado.stockSitios) Almacen.estado.stockSitios = {};
        Almacen.estado.stockSitios[k] = Util.hoyISO();
        /* Repasar un sitio confirma lo que hay: lo que estaba \u00absin saber cu\u00e1nto\u00bb
           deja de estarlo, porque acabas de mirarlo. */
        (Almacen.estado.ingredientes || []).forEach(function (g) {
          var f = Almacen.fichaStock(g.id);
          if (f && f.pte && Almacen.sitioDe(g) === k) { delete f.pte; f.f = Util.hoyISO(); }
        });
        Almacen.guardar("stock");
        pintarDespensa();
        Util.toast(Almacen.nombreSitio(k) + ": al d\u00eda");
        return;
      }
    });
    $("#despensa-vaciar").addEventListener("click", function () {
      if (!confirm("¿Desmarcar todo lo que tienes en casa?")) return;
      if (!confirm("\u00bfPoner a cero TODA la despensa? Se borran las cantidades de todos los sitios.")) return;
      Almacen.estado.stock = {}; Almacen.estado.stockSitios = {};
      Almacen.estado.despensa = {};
      Almacen.guardar("stock"); pintarDespensa();
    });
    $("#rejilla-despensa").addEventListener("click", function (e) {
      var ed = e.target.closest("[data-editaring]");
      if (ed) abrirIngrediente(ed.getAttribute("data-editaring"));
    });
    $("#nuevo-ingrediente").addEventListener("click", function () { abrirIngrediente(null); });
    $("#rejilla-despensa").addEventListener("change", function (e) {
      var d = e.target.closest("[data-despensa]");
      if (!d) return;
      var id = d.getAttribute("data-despensa");
      if (d.checked) Almacen.estado.despensa[id] = true; else delete Almacen.estado.despensa[id];
      Almacen.guardar("despensa"); pintarDespensa();
    });

    /* --- perfil --- */
    function leerPerfil() {
      var p = Almacen.estado.perfil;
      var num = function (sel) { var v = parseFloat($(sel).value.replace(",", ".")); return isNaN(v) ? null : v; };
      p.sexo = $("#pf-sexo").value;
      p.edad = num("#pf-edad");
      p.altura = num("#pf-altura");
      p.peso = num("#pf-peso");
      p.pesoObjetivo = num("#pf-objetivo");
      p.actividadBase = parseFloat($("#pf-base").value) || 1.2;
      p.ritmo = parseFloat($("#pf-ritmo").value) || 0;
    }
    ["#pf-sexo", "#pf-edad", "#pf-altura", "#pf-peso", "#pf-objetivo", "#pf-base", "#pf-ritmo"].forEach(function (sel) {
      $(sel).addEventListener("change", function () { leerPerfil(); pintarPerfil(); });
    });
    $("#pf-guardar").addEventListener("click", function () {
      leerPerfil();
      var p = Almacen.estado.perfil;
      if (p.peso && !Almacen.estado.pesos.length) Almacen.anotarPeso(Util.hoyISO(), p.peso);
      Almacen.guardar("perfil");
      pintarPerfil();
      Util.toast("Perfil guardado");
    });
    $("#pf-aplicar").addEventListener("click", function () {
      leerPerfil();
      var s = Almacen.objetivoSugerido();
      if (!s) { Util.toast("Faltan datos del perfil"); return; }
      Almacen.estado.config.objetivoKcal = s.kcal;
      Almacen.estado.config.objetivoProt = s.prot;
      Almacen.guardar("perfil");
      pintarAjustes(); pintarMenu();
      Util.toast("Objetivo: " + Util.kcal(s.kcal) + " y " + s.prot + " g de proteína");
    });

    $("#peso-anotar").addEventListener("click", function () {
      var f = $("#peso-fecha").value || Util.hoyISO();
      var kg = parseFloat($("#peso-kg").value.replace(",", "."));
      if (isNaN(kg) || kg < 30) { Util.toast("Escribe los kilos"); return; }
      Almacen.anotarPeso(f, kg);
      $("#peso-kg").value = "";
      pintarPerfil();
      Util.toast("Peso anotado");
    });
    $("#peso-historico").addEventListener("click", function (e) {
      var b = e.target.closest("[data-quitapeso]");
      if (!b) return;
      var f = b.getAttribute("data-quitapeso");
      Almacen.estado.pesos = Almacen.estado.pesos.filter(function (x) { return x.f !== f; });
      if (Almacen.estado.pesos.length)
        Almacen.estado.perfil.peso = Almacen.estado.pesos[Almacen.estado.pesos.length - 1].kg;
      Almacen.guardar("peso");
      pintarPerfil();
    });

    /* --- ajustes --- */
    $("#guardar-cocina").addEventListener("click", function () {
      var c = Almacen.estado.config;
      c.personas = parseInt($("#cfg-personas").value, 10) || 1;
      c.avisoSal = parseFloat($("#cfg-aviso").value) || 2.0;
      c.limiteSal = parseFloat($("#cfg-limite").value) || 4.0;
      c.objetivoKcal = parseInt($("#cfg-kcal").value, 10) || 2000;
      c.objetivoProt = parseInt($("#cfg-prot").value, 10) || 90;
      c.margenKcal = parseInt($("#cfg-margen").value, 10);
      if (isNaN(c.margenKcal)) c.margenKcal = 10;
      var pct = parseFloat($("#cfg-devolucion").value);
      if (!isNaN(pct)) c.devolucionEjercicio = Math.min(1, Math.max(0, pct / 100));
      if ($("#cfg-prevision")) {
        var pct2 = parseFloat($("#cfg-prevision").value);
        if (!isNaN(pct2)) c.previsionEjercicio = Math.min(1, Math.max(0, pct2 / 100));
      }
      Almacen.guardar("config");
      pintarEntrenoEstandar();
      Util.toast("Ajustes guardados");
    });

    /* --- estimación de comer fuera --- */
    $("#lista-fuera").addEventListener("change", function (e) {
      var k = e.target.closest("[data-fuerak]"), s = e.target.closest("[data-fuerasal]");
      if (!k && !s) return;
      var toma = (k || s).getAttribute(k ? "data-fuerak" : "data-fuerasal");
      var f = Almacen.estado.config.fueraEstimado;
      if (!f[toma]) f[toma] = { k: 0, sal: 0, p: 0, g: 0, h: 0 };
      if (k) {
        var nk = parseFloat(k.value) || 0;
        /* Los macros se reparten solos con un perfil corriente de comida de bar
           (20% proteína, 38% grasa, 42% hidratos). Pedírselos uno a uno para un
           número que ya es inventado no tiene sentido. */
        f[toma].k = nk;
        f[toma].p = Math.round(nk * 0.20 / 4);
        f[toma].g = Math.round(nk * 0.38 / 9);
        f[toma].h = Math.round(nk * 0.42 / 4);
      }
      if (s) f[toma].sal = parseFloat(s.value) || 0;
      Almacen.guardar("config");
      Util.toast("Estimación actualizada");
    });

    /* --- entreno estándar --- */
    $("#lista-entreno").addEventListener("change", function (e) {
      var m = e.target.closest("[data-estmin]");
      if (!m) return;
      var i = +m.getAttribute("data-estmin"), v = parseInt(m.value, 10);
      var lista = Almacen.estado.config.entrenoEstandar;
      if (!lista[i]) return;
      if (!(v > 0)) lista.splice(i, 1); else lista[i].min = v;
      Almacen.guardar("config");
      pintarEntrenoEstandar();
    });
    $("#lista-entreno").addEventListener("click", function (e) {
      var q = e.target.closest("[data-estquitar]");
      if (!q) return;
      Almacen.estado.config.entrenoEstandar.splice(+q.getAttribute("data-estquitar"), 1);
      Almacen.guardar("config");
      pintarEntrenoEstandar();
    });
    $("#entreno-anadir").addEventListener("click", function () {
      var id = $("#entreno-nuevo").value;
      var min = parseInt($("#entreno-min").value, 10);
      if (!id) return;
      if (!(min > 0)) {                       // sin minutos, los que trae la actividad
        var a = Almacen.actividad(id);
        min = a ? a.min : 30;
      }
      Almacen.estado.config.entrenoEstandar.push({ a: id, min: min });
      Almacen.guardar("config");
      $("#entreno-min").value = "";
      pintarEntrenoEstandar();
      Util.toast("Añadido al entreno estándar");
    });
    $("#gh-guardar").addEventListener("click", function () {
      var g = Almacen.estado.config.github;
      g.usuario = $("#gh-usuario").value.trim();
      g.repo = $("#gh-repo").value.trim();
      g.rama = $("#gh-rama").value.trim() || "main";
      g.token = $("#gh-token").value.trim();
      Almacen.guardar("config");
      Sync.cargar().then(function () { Sync.guardar(); });
      Util.toast("Conectando con GitHub…");
    });
    $("#cfg-intro").addEventListener("change", function () {
      ponerCuandoIntro(this.value);
      Util.toast(this.value === "siempre" ? "El vídeo saldrá cada vez que abras la app"
               : this.value === "dia"     ? "El vídeo saldrá una vez al día"
               :                            "El vídeo no se volverá a enseñar");
    });

    $("#cfg-consulta").addEventListener("change", function () {
      ponerModo(this.checked);
      mostrar(UI.vista);
      Util.toast(this.checked
        ? "Este aparato queda en modo consulta"
        : "Este aparato vuelve a poder editarlo todo");
    });

    $("#gh-pausa").addEventListener("click", function () {
      var g = Almacen.estado.config.github;
      g.pausada = !g.pausada;
      Almacen.guardar("config");
      pintarPausaSync();
      if (g.pausada) {
        Sync.indicar("Sincronización en pausa", "");
        Util.toast("En pausa: este aparato no sube ni baja nada. La clave sigue guardada.");
      } else {
        Util.toast("Sincronización reanudada");
        Sync.cargar();
      }
    });

    $("#gh-ver").addEventListener("click", function () {
      var campo = $("#gh-token");
      var oculta = campo.type === "password";
      campo.type = oculta ? "text" : "password";
      this.textContent = oculta ? "Ocultar" : "Ver";
    });
    $("#gh-copiar").addEventListener("click", function () {
      var campo = $("#gh-token");
      var valor = campo.value;
      if (!valor) { Util.toast("No hay ninguna clave guardada aquí"); return; }
      var tipo = campo.type;
      campo.type = "text";
      campo.select();
      campo.setSelectionRange(0, valor.length);
      var hecho = false;
      try { hecho = document.execCommand("copy"); } catch (e) {}
      if (!hecho && navigator.clipboard) {
        navigator.clipboard.writeText(valor).then(function () { Util.toast("Clave copiada"); },
          function () { Util.toast("No he podido copiarla: está a la vista para que la copies a mano"); });
      } else {
        Util.toast(hecho ? "Clave copiada" : "No he podido copiarla: está a la vista para que la copies a mano");
      }
      if (hecho) campo.type = tipo;
    });
    /* --- el catálogo público: repositorio y clave aparte --- */
    if ($("#cat-guardar")) {
      $("#cat-guardar").addEventListener("click", function () {
        var c = Almacen.estado.config;
        if (!c.catalogo) c.catalogo = {};
        c.catalogo.usuario = $("#cat-usuario").value.trim();
        c.catalogo.repo = $("#cat-repo").value.trim();
        c.catalogo.rama = $("#cat-rama").value.trim() || "main";
        c.catalogo.token = $("#cat-token").value.trim();
        Almacen.guardar("config");
        if (global.Catalogo) Catalogo.subir(true);
        else Util.toast("Guardado");
      });
      $("#cat-ver").addEventListener("click", function () {
        var campo = $("#cat-token");
        campo.type = campo.type === "password" ? "text" : "password";
      });
      $("#cat-probar").addEventListener("click", function () { if (global.Catalogo) Catalogo.probar(); });
      $("#cat-subir").addEventListener("click", function () { if (global.Catalogo) Catalogo.subir(true); });
    }
    $("#gh-probar").addEventListener("click", function () { Sync.probar(); });
    $("#gh-subir").addEventListener("click", function () { Sync.guardar(); });
    $("#gh-bajar").addEventListener("click", function () {
      Sync.cargar().then(function (cambio) {
        if (!cambio) Util.toast("No había nada más nuevo en el repositorio");
        mostrar(UI.vista);
      });
    });

    $("#exportar").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(Almacen.estado, null, 1)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "menu-copia-" + Util.hoyISO() + ".json";
      a.click();
    });
    $("#importar-btn").addEventListener("click", function () { $("#importar").click(); });
    $("#importar").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f) return;
      var lector = new FileReader();
      lector.onload = function () {
        try {
          var d = JSON.parse(lector.result);
          if (!d.v) throw new Error("formato");
          Almacen.reemplazar(d);
          mostrar(UI.vista);
          Util.toast("Copia restaurada");
        } catch (err) { Util.toast("Ese fichero no es una copia válida"); }
      };
      lector.readAsText(f);
    });
    /* La versión sale del propio `?v=` con el que index.html pide los ficheros:
       así no hay un número escrito a mano que se quede viejo. Es LO QUE EL
       NAVEGADOR TIENE CARGADO, que es justo lo que hay que saber. */
    (function () {
      var el = $("#version-app");
      if (!el) return;
      var v = "";
      var marcas = document.querySelectorAll('script[src*="?v="], link[href*="?v="]');
      for (var i = 0; i < marcas.length; i++) {
        var u = marcas[i].src || marcas[i].href || "";
        var m = u.match(/[?&]v=([0-9]+)/);
        if (m) { v = m[1]; break; }
      }
      el.textContent = v ? "v" + v : "sin marca de versi\u00f3n";
    })();
    var br2 = $("#version-recargar");
    if (br2) br2.addEventListener("click", function () {
      var hecho = function () { location.reload(true); };
      if (window.caches && caches.keys) {
        caches.keys().then(function (ks) {
          return Promise.all(ks.map(function (k) { return caches["delete"](k); }));
        })["catch"](function () {})["then"](hecho, hecho);
      } else hecho();
    });
    $("#recargar-recetas").addEventListener("click", function () {
      if (!confirm("Se reponen las recetas e ingredientes originales. Tus menús y tu despensa no se tocan. ¿Seguimos?")) return;
      Almacen.estado.ingredientes = JSON.parse(JSON.stringify(global.DATOS_INGREDIENTES));
      var propias = Almacen.estado.recetas.filter(function (r) { return r.id.indexOf("propia_") === 0; });
      Almacen.estado.recetas = JSON.parse(JSON.stringify(global.DATOS_RECETAS)).concat(propias);
      Almacen.estado.plantillas = JSON.parse(JSON.stringify(global.DATOS_PLANTILLAS));
      Almacen.guardar("recarga");
      mostrar(UI.vista);
      Util.toast("Recetario original repuesto");
    });
  }

  /* ==================== ARRANQUE ==================== */
  function arrancar() {
    Almacen.iniciar();
    aplicarModo();
    conectarEventos();

    // primera vez: deja la semana en curso preparada con la Semana A
    var hayPlan = Object.keys(Almacen.estado.plan).length > 0;
    if (!hayPlan) Almacen.aplicarPlantilla("A", UI.lunes);

    mostrar("menu");
    arrancarPortada();

    if (Sync.configurado()) {
      Sync.cargar().then(function () { mostrar(UI.vista); });
    } else {
      Sync.indicar("Solo en este dispositivo", "");
    }

    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  document.addEventListener("DOMContentLoaded", arrancar);
})(window);
