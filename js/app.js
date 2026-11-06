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
    filtros: { texto: "", toma: "", grupo: "", tool: "", vista: "" },
    filtrosIng: { texto: "", cat: "", clase: "" },
    fila: "recetas",        /* qué se lista en el Recetario: recetas o ingredientes */
    filaDesp: "localizacion", /* qué pestaña de la Despensa se abre */
    estanteTengo: null,     /* ¿Lo tengo?: el estante abierto, uno cada vez */
    pase: { vista: "indice", estante: null, i: 0 },
    busquedaHogar: "",
    sitioAbierto: "",       /* qué sitio de la casa está abierto al contar */
    estanteAbierto: "",     /* Localización: qué estante está desplegado, uno cada vez */
    locCambios: 0,          /* cuántos estantes has cambiado sin recolocar la lista */
    buscaOrden: "",         /* el buscador de la pantalla de Orden de compra */
    buscaSitio: {},         /* { sitio: texto } — el buscador de dentro de cada sitio */
    buscaQuiero: "",        /* el buscador de «lo quiero esta vez», en la Compra */
    paseHogar: { vista: "indice", ap: null, i: 0 },   /* el pase de Hogar, igual que el de ¿Lo tengo? */
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
    /* En sábado y domingo «lo que queda de esta semana» es uno o dos días, y
       la compra grande es la de la semana que viene (Carlos, 4-oct-2026: «¿y
       Mercadona no debería venir relleno?», un domingo). */
    cuandoCompra: ([0, 6].indexOf(new Date().getDay()) >= 0 ? "todo" : "resto"),   /* 30-oct-2026: el fin de semana, todo lo planificado */
    tRuta: null,            // espera antes de repintar al teclear las horas de una ruta
    /* Días pasados que ha desbloqueado a mano para corregir algo. Vive solo en
       memoria: al recargar vuelven a estar cerrados, que es lo que se quiere. */
    desbloqueados: {}
  };

  /* Un día pasado está cerrado salvo que lo haya abierto él. Cerrado significa
     que no se PLANIFICA: marcar lo que comiste sigue estando disponible siempre,
     porque eso es registro y suele apuntarse después. */
  function cerrado(fecha) {
    if (UI.desbloqueados[fecha]) return false;
    /* pasado por el calendario, o cerrado a mano con el botón (1-oct-2026) */
    return Almacen.esPasado(fecha) || Almacen.diaCerrado(fecha);
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
    "desayuno": "Desayuno", "fruta": "Fruta", "postre": "Postre", "casero": "Hecho en casa",
    /* RESTAURANTE SE QUEDÓ FUERA DE ESTE MAPA (encontrado el 23-oct-2026, aviso
       de Carlos: «no me deja elegir la opción restaurante» al crear una receta).
       El resto de la app ya trataba «restaurante» como un grupo de pleno derecho
       —el selector del día lo saca arriba con `deGrupo("restaurante")`, y
       `ARRIBA` en `abrirSelector` ya lo tenía anotado— pero el DESPLEGABLE del
       editor de receta se construye leyendo las claves de este objeto, así que
       la opción nunca estaba. Las fichas de ingrediente («Restaurante y bar»,
       con ración y nutrientes por 100 g) no tenían este problema: esa sección
       del súper ya estaba en la lista desde siempre. Lo que faltaba era poder
       EMPAQUETAR esa ficha en una receta de un solo ingrediente para que
       aparezca como un botón en «Restaurante», tal y como ya pasa con la
       tarta de queso o las alitas de Burger King. */
    "restaurante": "Restaurante",
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
  /* ---- EL APARATO DE CADA PASO (v359, 3-oct-2026) ----
     Carlos: «los temporizadores podrían llevar dónde se está haciendo: airfryer,
     micro, sartén… ayuda leer el tiempo y el sitio». No se guarda en la receta: se
     DEDUCE del texto del paso al pintar la ficha, así las 92 recetas lo llevan sin
     migrar nada, las nuevas también, y el editor (que reescribe los pasos como
     texto) no puede perderlo. Probado contra todo el recetario: 199 de 293 pasos
     con minuto llevan aparato; los demás son «fuera», «reposar», «emplata»… y se
     quedan sin etiqueta a propósito. Si alguna sale mal, el paso admite «ap» a mano
     (en el editor: «12 @sarten · lo que hay que hacer»). */
  var NOMBRE_AP = { airfryer: "Airfryer", micro: "Micro", sarten: "Sartén", horno: "Horno", cazuela: "Cazuela" };
  var AP_REGLAS = [
    ["airfryer", /freidora|cesta|airfryer|air ?fryer/gi],
    ["micro", /microondas|cuecepasta|l[eé]ku[eé]|arrocera|vaporera|\b\d{3,4} ?W\b/gi],
    ["sarten", /sart[eé]n/gi],
    ["horno", /\bhorno\b/gi],
    ["cazuela", /cazuela|\bolla\b|\bcazo\b/gi]
  ];
  var AP_DE_TOOL = { "airfryer": "airfryer", "lekue-vapor": "micro", "lekue-arroz": "micro", "lekue-pasta": "micro",
                     "lekue": "micro", "microondas": "micro", "sarten": "sarten", "horno": "horno", "cazuela": "cazuela" };
  var AP_FUERA = /fuera|escurr|agua fr[ií]a|hielo|en un bol|aplasta|\bpela|repos[ao]|\btritura|enfri|esperar|emplata|al plato|sirve|\bsaca\b|s[aá]ca(lo|la|los|las)\b/i;
  var AP_TIEMPO = /\d+\s*(minutos?|min\b|segundos?|seg\b)|minuto y medio|medio minuto/i;
  /* El ÚLTIMO aparato que nombra el texto: «el sofrito de la freidora a la sartén»
     se hace en la sartén, que es adonde va. */
  function apUltimo(s) {
    var mejor = null, pos = -1;
    AP_REGLAS.forEach(function (x) {
      var re = new RegExp(x[1].source, "gi"), m;
      while ((m = re.exec(s || ""))) { if (m.index > pos) { pos = m.index; mejor = x[0]; } }
    });
    return mejor;
  }
  function apTodos(s) {
    return AP_REGLAS.filter(function (x) { return new RegExp(x[1].source, "i").test(s || ""); })
                    .map(function (x) { return x[0]; });
  }
  function aparatoPaso(p, r, previo) {
    if (p.ap) return NOMBRE_AP[p.ap] ? p.ap : null;
    var t = p.t || "", ap = [];
    (r.tools || []).forEach(function (x) { var a = AP_DE_TOOL[x]; if (a && ap.indexOf(a) < 0) ap.push(a); });
    var a = apUltimo(t);
    if (a) return a;
    if (/sacude/i.test(t) && ap.indexOf("airfryer") >= 0) return "airfryer";
    if (/\d\s*°\s*C/i.test(t)) return ap.indexOf("airfryer") >= 0 ? "airfryer" : (ap.indexOf("horno") >= 0 ? "horno" : null);
    if (/fuego/i.test(t)) { if (ap.indexOf("sarten") >= 0) return "sarten"; if (ap.indexOf("cazuela") >= 0) return "cazuela"; }
    if (AP_FUERA.test(t)) return null;
    var sigue = /vuelta|\bmete|\ba[ñn]ade|\becha\b|remueve/i.test(t);
    if (!AP_TIEMPO.test(t) && !sigue) return null;
    if (ap.length === 1) return ap[0];
    var enD = apTodos(p.d).filter(function (x) { return ap.indexOf(x) >= 0; });
    if (enD.length === 1) return enD[0];
    return previo || null;
  }
  /* El almacén lo necesita para cuadrar los relojes de plato + guarnición (v369). */
  if (window.Almacen) Almacen.apDePaso = aparatoPaso;

  /* ---- TOMATE «PARA RALLAR» (v362, 3-oct-2026) ----
     Carlos: las recetas piden tomates de ensalada y él los ralla (rallador de caja,
     cara gruesa); la semana que vaya justo compra tomate rallado en tarrina, y la
     receta tiene que decirle cuánto. La línea del ingrediente lleva uso:"rallar" y la
     ficha calcula sola la equivalencia, así una receta nueva no necesita texto aparte
     y el tomate en gajos de la misma receta va en otra línea sin la marca.
     RINDE_RALLADO: lo que queda de un tomate al rallarlo (sin piel ni el último
     trozo). 0,8 es una ESTIMACIÓN: cuando Carlos pese el primero, se cambia aquí. */
  var RINDE_RALLADO = 0.8;
  function tarrinasTexto(q) {
    q = Math.round(q * 4) / 4;
    if (q < 0.25) return "menos de ¼ de tarrina";
    var ent = Math.floor(q), fr = { 0: "", 0.25: "¼", 0.5: "½", 0.75: "¾" }[q - ent];
    if (!ent) return fr + " de tarrina";
    return ent + (fr ? " y " + fr : "") + (ent === 1 && !fr ? " tarrina" : " tarrinas");
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
  function cerrarModal() { $("#modal").classList.remove("abierta"); $("#modal-caja").classList.remove("modal-compacto"); }

  /* ---- LO HECHO EN CASA: CÓMO SE PREPARA Y SE GUARDA (v384) ----
     Carlos, 4-oct-2026: «debería aparecer una ventana emergente que explique
     cómo se prepara y se guarda ese ingrediente». Sale al pulsar «Lo he
     preparado» (con el botón de confirmar abajo) y desde el enlace de la caja
     (sólo para leer). Todo sale de la ficha: la receta del lote y
     `casero.guardar`; sirve igual para lo próximo que hagas en casa. */
  function abrirCasero(id, confirmar) {
    var g = Almacen.ingrediente(id);
    if (!g || !g.casero) return;
    var r = Almacen.receta(g.casero.receta);
    var rinde = g.casero.rinde || 1;
    var ff = Almacen.FORMATOS[Almacen.formatoDe(g)] || { n: ["", ""] };
    var uds = rinde + " " + (rinde === 1 ? ff.n[0] : ff.n[1]);
    var h = '<header><h2>C\u00f3mo se prepara</h2><button class="cerrar" data-cerrar>\u00d7</button></header>' +
      '<p class="casero-mod-nom">' + esc(g.n.split(" (")[0]) + " \u00b7 salen unos " + esc(uds) + "</p>";
    if (r) {
      h += "<h4>Lleva</h4><ul class=\"casero-mod-lista\">" + (r.ing || []).map(function (l) {
        var i = Almacen.ingrediente(l.i);
        if (!i) return "";
        return "<li>" + esc(Util.cantidadReceta(l.c, i.u, i.pesoUd)) + " de " + esc(i.n.split(" (")[0].toLowerCase()) + "</li>";
      }).join("") + "</ul>";
      h += "<h4>Pasos</h4><ol class=\"casero-mod-lista\">" + (r.pasos || []).map(function (p) {
        if (typeof p === "string") return "<li>" + esc(p) + "</li>";
        return "<li>" + esc(p.t || "") + (p.d ? "<small>" + esc(p.d) + "</small>" : "") + "</li>";
      }).join("") + "</ol>";
    }
    var guardar = g.casero.guardar || [];
    if (guardar.length) {
      h += "<h4>C\u00f3mo se guarda</h4><ul class=\"casero-mod-lista\">" +
        guardar.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
    }
    h += '<div class="fila">' + (confirmar
      ? '<button class="btn" data-cerrar>Ahora no</button>' +
        '<button class="btn principal" data-caseroya="' + esc(id) + '">Hecho: +' + esc(uds) + "</button>"
      : '<button class="btn" data-cerrar>Cerrar</button>') + "</div>";
    abrirModal(h);
    var caja = $("#modal-caja"); if (caja) caja.scrollTop = 0;
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-caseroya]");
    if (!b) return;
    var rp = Almacen.prepararCasero(b.getAttribute("data-caseroya"));
    cerrarModal();
    if (rp) Util.toast("+" + rp.rinde + " \u00b7 ahora hay " + String(rp.nuevo).replace(".", ",") +
      (rp.gastados.length ? " \u00b7 descontado: " + rp.gastados.map(function (n) { return n.split(" (")[0]; }).join(", ") : ""));
    if ($("#rejilla-tengo")) pintarLoTengo();
  });

  /* ---- LAS ESTRELLAS (v370) ---- */
  function filaEstrellas(id, n, ctx) {
    var h = '<div class="estrellas" role="group" aria-label="Nota de 1 a 5">';
    for (var i = 1; i <= 5; i++) {
      h += '<button class="estrella' + (i <= n ? ' on' : '') + '" data-estrella="' +
           esc(id) + '|' + i + '|' + ctx + '" aria-label="' + i + ' estrellas">\u2605</button>';
    }
    return h + '</div>';
  }
  function textoEstrellas(n) { return n ? new Array(n + 1).join("\u2605") : ""; }
  function preguntarEstrellas(r) {
    abrirModal('<header><h2>\u00bfQu\u00e9 tal estaba?</h2><button class="cerrar" data-cerrar>\u00d7</button></header>' +
      '<p class="pregunta-estrellas">' + esc(r.n) + '</p>' +
      filaEstrellas(r.id, 0, "pregunta") +
      '<p class="nota-peque">Las de 4 y 5 salen en \u00abFavoritas\u00bb al elegir plato, y el men\u00fa ' +
      'autom\u00e1tico las propone algo m\u00e1s. Las de 1 y 2 deja de proponerlas.</p>' +
      '<div class="fila"><button class="btn" data-cerrar>Ahora no</button></div>');
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-estrella]");
    if (!b) return;
    var p = b.getAttribute("data-estrella").split("|");
    var id = p[0], n = +p[1], ctx = p[2];
    /* Tocar la misma estrella que ya tenía la quita: así se deshace un toque. */
    if (ctx === "ficha" && Almacen.estrellas(id) === n) n = 0;
    Almacen.valorar(id, n);
    if (ctx === "pregunta") {
      cerrarModal();
      Util.toast(n >= 4 ? textoEstrellas(n) + " \u00b7 a Favoritas" : textoEstrellas(n) + " \u00b7 apuntado");
    } else {
      var fila = b.parentNode;
      if (fila) fila.outerHTML = filaEstrellas(id, n, "ficha");
    }
  });

  /* ==================== VISTA: MENÚ ====================
     Planificador por normas y Día a día. Montado el 5-nov-2026 desde el
     prototipo de `_pruebas`, que se probó contra el motor de verdad.

     Va dentro de su propio cierre a propósito: comparte 150 nombres con el
     resto de `app.js` (d, f, i, nombre, guardar, dia, quitar…) y así ninguno
     se pisa. Hacia fuera solo salen las ocho funciones que la app llama. */
  var MENU = (function () {
    'use strict';

/* ---------- de donde salen los datos ----------
   En el prototipo venian de ficheros sueltos; aqui, del propio Almacen. */
var A = Almacen;
var MOTOR = true;
/* `ING` era un mapa suelto; aqui es una vista sobre los ingredientes de la app. */
var ING = {};
function refrescarIngredientes() {
  ING = {};
  var l = (A.estado.ingredientes || window.DATOS_INGREDIENTES || []);
  (l.length ? l : []).forEach(function (i) { if (i && i.id) ING[i.id] = i; });
}
var RECETAS = [], POR_ID = {};
function refrescarRecetario() {
  refrescarIngredientes();
  RECETAS.length = 0;
  /* en el sitio, no reasignando: `POR_ID` se exporta por referencia y quien la
     tuviera cogida se quedaba con el indice vacio. */
  Object.keys(POR_ID).forEach(function (k) { delete POR_ID[k]; });
  /* `RECETAS` es lo que se puede PROPONER: sin ocultas. `POR_ID` las indexa
     TODAS, ocultas incluidas: un plato de un dia pasado se sigue viendo aunque
     la receta ya no este a la venta, que es la regla de su app. */
  (A.estado.recetas || []).forEach(function (r) {
    POR_ID[r.id] = r;
    if (!r.oculta) RECETAS.push(r);
  });
}
var CONFIG = {};

function esGuar(r) { return !!r && (r.tipo || []).some(function (t) { return t === 'guarnicion' || t === 'guarnición'; }); }
function valeCC(r) { return vivaFicha(r) && (r.tipo || []).some(function (t) { return t === 'comida' || t === 'cena'; }); }

/* Una tosta de verdad empieza por «Tostas» o «Dos tostas»: así no entran
   «Pan tostado · 3 rebanadas» ni «Pan de mesa», que son acompañamientos. */
function esTosta(r) { return /^(dos\s+)?tostas?\b/i.test(r.corto || r.n); }
/* EL PAPEL DE CADA FICHA EN LA MESA, con SU regla (la de su selector viejo,
   3-oct-2026): se deduce de las categorias de los ingredientes, no de listas
   escritas a mano. Todo bebida -> bebida; postre o fruta fresca -> postre; todo
   panaderia -> pan; tipo guarnicion -> guarnicion; lo demas, principal. */
function catsDe(r) {
  var c = {};
  (r.ing || []).forEach(function (l) {
    var g = null; try { g = A.ingrediente(l.i); } catch (e) {}
    if (g) c[g.cat || '?'] = 1;
  });
  return Object.keys(c);
}
function todoDe(r, re) {
  var c = catsDe(r);
  return c.length > 0 && c.every(function (x) { return re.test(x); });
}
/* La fruta fresca es postre: una sola cosa, de frutas y verduras, sin cocinar. */
function esFrutaFresca(r) {
  return (r.ing || []).length === 1 &&
         (r.grupo === 'suelto' || r.grupo === 'fruta') &&
         (r.tools || []).indexOf('sin-cocinar') >= 0 &&
         todoDe(r, /^frutas y verduras$/i);
}
function papelDe(r) {
  if (!r) return 'principal';
  if (todoDe(r, /^bebidas?$/i)) return 'bebida';
  if ((r.tipo || []).indexOf('postre') >= 0 || r.grupo === 'postre') return 'postre';
  if (esFrutaFresca(r)) return 'postre';
  if (todoDe(r, /^panader[ií]a$/i)) return 'pan';
  if ((r.tipo || []).indexOf('guarnicion') >= 0) return 'guarnicion';
  return 'principal';
}
function esBebida(r) { return vivaFicha(r) && papelDe(r) === 'bebida'; }

/* Una ficha retirada, oculta o borrada no se propone ni sale en el catálogo.
   Su app lo filtra en `almacen.js` («r.borrada || r.grupo === "retirado"»); aquí
   faltaba, y una ensalada y unos huevos retirados sí cuadraban con las normas. */
function vivaFicha(r) { return !!r && !r.borrada && !r.oculta && r.grupo !== 'retirado'; }
/* Los grupos que nunca son un plato principal de comida o cena. */
function esPlato(r) {
  if (!vivaFicha(r)) return false;
  if (esGuar(r)) return false;
  if (r.grupo === 'restaurante' || r.grupo === 'postre' || r.grupo === 'fruta' || r.grupo === 'desayuno') return false;
  if (r.grupo === 'suelto' && !esTosta(r)) return false;
  return true;
}
var TIPOS = {
  pescado:  function (r) { return esPlato(r) && (r.grupo === 'pescado-blanco' || r.grupo === 'pescado-azul') && !esTosta(r); },
  carne:    function (r) { return esPlato(r) && (r.grupo === 'carne-blanca' || r.grupo === 'carne-roja') && !esTosta(r); },
  arroz:    function (r) { return esPlato(r) && r.grupo === 'pasta-arroz' && /arroz|risotto/i.test(r.n); },
  pasta:    function (r) { return esPlato(r) && r.grupo === 'pasta-arroz' && !/arroz|risotto/i.test(r.n); },
  tosta:    function (r) { return esPlato(r) && esTosta(r); },
  verdura:  function (r) { return esPlato(r) && r.grupo === 'verdura'; },
  ensalada: function (r) { return esPlato(r) && r.grupo === 'ensalada'; },
  huevos:   function (r) { return esPlato(r) && r.grupo === 'huevos'; },
  legumbre: function (r) { return esPlato(r) && r.grupo === 'legumbre'; }
};
var ETIQ = { pescado:'PESCADO', carne:'CARNE', arroz:'ARROZ', pasta:'PASTA', tosta:'TOSTA',
             verdura:'VERDURA', ensalada:'ENSALADA', huevos:'HUEVOS', legumbre:'LEGUMBRE' };
/* Siete comidas y siete cenas, una de ellas fuera. Un grupo se repite en cada fila
   porque hay más huecos que grupos: Carlos eligió el 5-nov que en la comida repita
   CARNE (antes repetía pescado, y con el de la cena salían tres pescados a la
   semana) y que en la cena siga repitiendo ENSALADA. */
/* El séptimo hueco de la cena era 'fuera' y no proponía nada: Carlos veía
   «pocas cenas para rellenar» (5-nov). Comer fuera se marca en Día a día el día
   que toca, no gasta un hueco de planificación. Pasa a carne: tenía 14 fichas
   marcadas para cenar y ni un solo hueco. */
var NORMAS = {
  comida: ['pescado','carne','arroz','pasta','tosta','verdura','carne'],
  cena:   ['ensalada','ensalada','tosta','huevos','verdura','pescado','carne']
};

/* ====================== DESPENSA ====================== */
function cortoIng(n) {
  n = String(n || '').split('(')[0].trim();
  var p = n.split(/\s+/);
  if (p.length > 4) p = p.slice(0, 4);
  return p.join(' ').toLowerCase();
}
/* LO QUE YA ESTA PEDIDO (Carlos, 6-nov): «ficha propuesta pechuga de pollo a la
   plancha como que hay todo cuando se va a comer manana. como va a quedar algo
   para la semana del 16?». El semaforo miraba el stock a pelo, sin descontar lo
   que ya tienen reservado los dias que vienen. Aqui se descuenta: de hoy en
   adelante, todo plato colocado y aun no comido aparta sus ingredientes.
   A un plato ya colocado no se le cuenta lo suyo propio, o se denunciaria a si
   mismo por falta de lo que el mismo gasta. */
var COMP = null, MIO = null;
function apartado() {
  if (COMP) return;
  COMP = {}; MIO = {};
  var dd = dias();
  Object.keys(dd).forEach(function (f) {
    if (f < HOY) return;                       /* lo pasado ya salio de la despensa */
    var d = dd[f]; if (!d) return;
    TOMAS.forEach(function (tm) {
      if (esFueraT(f, tm)) return;
      var np = pax(f, tm) || 2;
      (d[tm] || []).forEach(function (id) {
        if (estaComido(f, tm, id)) return;     /* comido: ya descontado */
        var r = POR_ID[id]; if (!r) return;
        var rac = r.raciones || 1;
        if (!MIO[id]) MIO[id] = {};
        (r.ing || []).forEach(function (x) {
          var q = (x.c || 0) / rac * np;
          COMP[x.i] = (COMP[x.i] || 0) + q;
          MIO[id][x.i] = (MIO[id][x.i] || 0) + q;
        });
      });
    });
  });
}
function faltanDe(r, comensales) {
  comensales = comensales || 2;
  apartado();
  var mio = (r && MIO[r.id]) || {};
  var out = [], rac = r.raciones || 1;
  (r.ing || []).forEach(function (x) {
    var i = null; try { i = A.ingrediente(x.i); } catch (e) {}
    if (!i || i.basico) return;
    var pide = (x.c || 0) / rac * comensales;
    var hay = ((A.estado.stock || {})[x.i] || {}).c || 0;
    hay = hay - ((COMP[x.i] || 0) - (mio[x.i] || 0));
    if (hay < pide * 0.6) out.push(i.n || x.i);
  });
  return out;
}
var CACHE = {};
function estadoDe(id) {
  if (CACHE[id]) return CACHE[id];
  var r = POR_ID[id]; if (!r) return { falta: [], cl: 'casa', txt: '' };
  var f = faltanDe(r);
  var cl = f.length === 0 ? 'casa' : (f.length <= 2 ? 'falta' : 'comprar');
  var txt = f.length === 0 ? '' : (f.length === 1 ? 'falta ' + cortoIng(f[0]) : f.length + ' por comprar');
  CACHE[id] = { falta: f, cl: cl, txt: txt };
  return CACHE[id];
}
function rangoStock(id) { var c = estadoDe(id).cl; return c === 'casa' ? 0 : (c === 'falta' ? 1 : 2); }
function cmpStock(a, b) {
  var d = rangoStock(a) - rangoStock(b); if (d) return d;
  d = estadoDe(a).falta.length - estadoDe(b).falta.length; if (d) return d;
  return (POR_ID[a].min || 0) - (POR_ID[b].min || 0);
}
function nombre(id) { var r = POR_ID[id]; return r ? (r.corto || r.n) : id; }

/* ====================== FECHAS ====================== */
function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function masDias(f, n) { var d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
function lunesDe(d) { var x = new Date(d.getTime()); var g = (x.getDay() + 6) % 7; x.setDate(x.getDate() - g); return iso(x); }
var DIAS = ['L','M','X','J','V','S','D'];
var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function diaNum(f) { return Number(f.slice(8, 10)); }
function mesDe(f) { return MESES[Number(f.slice(5, 7)) - 1]; }
var HOY = iso(new Date());

/* ====================== ESTADO ====================== */
var CLAVE = 'menu-pantalla-v1';
var E = null;

/* EL DIA DEL PROTOTIPO ES EL DIA DE SU APP (5-nov). Antes habia dos formas de
   guardar lo mismo —`E.dias[f][toma].lista` aqui, `plan[f][toma]` alli— y
   `sincronizar` copiaba de una a otra. Ahora solo hay una: `A.estado.plan`.
   Los campos que su motor ya usa con ese nombre —tipo, ruta, capricho, quien,
   cerrado, guardadoVaciar— dejan de estar duplicados. */
function vacio(fecha) {
  if (MOTOR && A.diaVacio) return A.diaVacio();
  var d = { tipo: 'casa', capricho: [] };
  TOMAS.forEach(function (tm) { d[tm] = []; });
  return d;
}
/* El cajón de una toma, creándolo si el día viene de una versión que solo
   guardaba comida y cena (Carlos, 5-nov: quiere añadir cosas al almuerzo y a
   la merienda, y comer fuera también tiene que admitir platos). */
function cajon(f, tm) {
  var d = dia(f);
  if (!d[tm]) d[tm] = [];
  return d[tm];
}
function dia(f) {
  if (MOTOR) return A.asegurarDia(f);
  if (!E.dias[f]) E.dias[f] = vacio(f);
  return E.dias[f];
}
function dias() { return MOTOR ? (A.estado.plan || {}) : (E.dias || {}); }
function esFueraT(f, tm) {
  if (MOTOR) { try { return !!A.esFuera(f, tm); } catch (e) { return false; } }
  var d = dias()[f]; return !!(d && d.fuera && d.fuera.indexOf(tm) >= 0);
}
function ponerFueraT(f, tm, si) {
  if (MOTOR) { try { A.ponerFuera(f, tm, !!si); } catch (e) {} return; }
  var d = dia(f); if (!d.fuera) d.fuera = [];
  var i = d.fuera.indexOf(tm);
  if (si && i < 0) d.fuera.push(tm);
  if (!si && i >= 0) d.fuera.splice(i, 1);
}
function vaciadaT(f, tm) { var d = dia(f); return !!(d.sinFijos && d.sinFijos[tm]); }
function marcarVaciadaT(f, tm, si) {
  var d = dia(f);
  if (si) { if (!d.sinFijos) d.sinFijos = {}; d.sinFijos[tm] = 1; return; }
  if (d.sinFijos) { delete d.sinFijos[tm]; if (!Object.keys(d.sinFijos).length) delete d.sinFijos; }
}
function paxDe(f, tm) { var d = dias()[f]; return (d && d.comensales && d.comensales[tm]) || null; }
function setPax(f, tm, n) { var d = dia(f); if (!d.comensales) d.comensales = {}; d.comensales[tm] = n; }
function semanas() {
  var a = E.lunes;
  return [
    { k: 'A', t: 'Semana en curso',              f: a,                nota: 'comiéndose · se reordena', compacta: true },
    { k: 'B', t: 'Semana planificada y comprada', f: masDias(a, 7),  nota: 'la compra ya está hecha',   compacta: true },
    { k: 'C', t: 'Semana a planificar',           f: masDias(a, 14), nota: 'baja una opción de cada grupo a su día', compacta: false }
  ];
}
function fechasDe(l) { var o = []; for (var i = 0; i < 7; i++) o.push(masDias(l, i)); return o; }

function usadas() {
  var s = {};
  var dd = dias();
  Object.keys(dd).forEach(function (f) {
    ['comida','cena'].forEach(function (t) {
      (dd[f][t] || []).forEach(function (id) { if (!esFijoId(id)) s[id] = true; });
    });
  });
  return s;
}
function proponer() {
  var ya = usadas(), g = [];
  PL().origen = {};
  ['comida','cena'].forEach(function (fila) {
    NORMAS[fila].forEach(function (tipo, idx) {
      if (tipo === 'fuera') return;
      var x = grupoNuevo(fila, tipo, ya);
      if (x) { x.id = fila + '-' + idx; g.push(x); }
    });
  });
  return g;
}
function guarniciones() {
  return RECETAS.filter(function (r) { return vivaFicha(r) && esGuar(r); }).map(function (r) { return r.id; }).sort(cmpStock);
}

function nuevo() {
  E = { lunes: lunesDe(new Date()), dias: {}, fijos: fijosNuevos(), solo: soloNuevo(), abierto: abiertoNuevo() };
  if (A && A.estado) A.estado.planificador = { grupos: [], bandejas: {}, origen: {} };
  if (MOTOR) E.fijosDeConfig = true;
  PL().grupos = proponer();     /* lo mejor de la despensa se reserva para lo que vas a planificar */
  return E;
}
/* Las dos primeras semanas se rellenan con un menú de muestra coherente,
   para poder ver las tres semanas de un vistazo. */


/* El estado del motor, en el cajon del prototipo. Es lo que en tu app guarda
   `A.guardar` en el cajon de verdad. */

/* El estado del planificador vive DENTRO del estado del motor, que es lo unico
   que viaja en tu copia de seguridad y a tu movil. Antes estaba suelto en el
   navegador y no viajaba a ningun sitio. */
function PL() {
  if (!A || !A.estado) return { grupos: [], bandejas: {}, origen: {} };
  if (!A.estado.planificador) A.estado.planificador = { grupos: [], bandejas: {}, origen: {} };
  var p = A.estado.planificador;
  if (!p.grupos) p.grupos = [];
  if (!p.bandejas) p.bandejas = {};
  if (!p.origen) p.origen = {};
  return p;
}
/* Al guardar, el plan del prototipo baja al estado del motor ANTES de escribir.
   Asi `A.estado.plan` es la verdad en todo momento y no solo cuando alguien pide
   numeros. Es el paso previo a quitar `E.dias` del todo. */
/* Lo que es DATO lo guarda la app con su `Almacen.guardar`; lo que es pantalla
   —que paneles tienes abiertos, que dia miras— se queda en este navegador. */
function guardar() {
  CACHE = {}; COMP = null; MIO = null;   /* cambia el plan, cambia lo apartado */
  try { localStorage.setItem(CLAVE, JSON.stringify(pantalla())); } catch (e) {}
  try { sincronizar(fechasProto()); } catch (e) {}
  A.guardar('menu');
}
function pantalla() {
  return { lunes: E.lunes, abierto: E.abierto, abiertoP: E.abiertoP,
           diaVisto: E.diaVisto, vista: E.vista };
}
function cargar() {
  try {
    var x = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    /* `pantalla()` nunca guarda `dias`, asi que exigirlo aqui hacia que no se
       recuperase NADA de la pantalla: ni la semana abierta ni el dia que
       estabas mirando (Carlos, 6-nov). */
    if (x && x.lunes) return x;
  } catch (e) {}
  return null;
}

/* ====================== COLOCAR Y QUITAR ====================== */
/* ---- bandejas: una por semana ---- */
function lunesSemana(f) { return lunesDe(new Date(f + 'T12:00:00')); }
function cualSemana(f) {
  var l = lunesSemana(f);
  if (l === E.lunes) return 'A';
  if (l === masDias(E.lunes, 7)) return 'B';
  if (l === masDias(E.lunes, 14)) return 'C';
  return null;
}
function bandeja(lunes) { if (!PL().bandejas[lunes]) PL().bandejas[lunes] = []; return PL().bandejas[lunes]; }
function aBandeja(fecha, id) {
  var b = bandeja(lunesSemana(fecha));
  if (b.indexOf(id) < 0) b.push(id);
}
function sacarDeBandejas(id) {
  Object.keys(PL().bandejas).forEach(function (k) {
    PL().bandejas[k] = PL().bandejas[k].filter(function (x) { return x !== id; });
  });
}
function tirar(id) { sacarDeBandejas(id); guardar(); }
/* Un plato que sale de un día: en la semana que planificas vuelve su grupo al
   panel; en las otras dos la comida ya está en casa, así que cae en la bandeja
   de ESA semana para recolocarla esos mismos días. */
function sacar(id, fecha, toma) {
  var r = POR_ID[id]; if (!r) return;
  if (esFijoId(id)) return;        /* un fijo no vuelve al panel de propuestas */
  if (cualSemana(fecha) === 'C' && !esGuar(r)) devolver(id, toma);
  else aBandeja(fecha, id);
}
function grupoDe(id) {
  for (var i = 0; i < PL().grupos.length; i++) if (PL().grupos[i].op.indexOf(id) >= 0) return PL().grupos[i];
  return null;
}
function quitarGrupoDe(id) {
  var g = grupoDe(id);
  if (!g) return;
  /* De qué hueco de la norma salía este plato. Sin esto, al quitarlo del día
     había que adivinarlo por la receta, y salía mal por los dos lados: una
     ensalada de una CENA volvía como grupo de COMIDA, y el tipo era el primero
     que cuadrara, no el del hueco. (Carlos, 5-nov: «duplica ensalada y arroz»,
     «no hay carne», «no respeta bien las categorías».) */
  if (!PL().origen) PL().origen = {};
  PL().origen[id] = { fila: g.fila, tipo: g.tipo };
  PL().grupos = PL().grupos.filter(function (x) { return x !== g; });
}
function gruposDe(fila) {
  return PL().grupos.filter(function (g) { return g.fila === fila; });
}
/* Los tipos que la norma pide en esa fila y ahora mismo no tienen grupo. */
function huecosLibres(fila) {
  var pide = (NORMAS[fila] || []).filter(function (x) { return x !== 'fuera'; }).slice();
  gruposDe(fila).forEach(function (g) {
    var i = pide.indexOf(g.tipo);
    if (i >= 0) pide.splice(i, 1);
  });
  return pide;
}
/* LAS RANURAS SON DE LOS PLATOS, NO DE LOS FIJOS. Desde que el dia es el del
   plan, el pan y el agua viven en el mismo array que el principal. La ranura 0
   es el primer plato que NO es fijo, y la 1 el segundo. Si no, colocar un plato
   echaba al pan y el pan volvia al panel de propuestas como si fuera una
   ficha de la norma. */
function propios(f, tm) {
  return (dias()[f] && dias()[f][tm] || []).filter(function (id) { return !esFijoId(id); });
}
function ponerPropios(f, tm, lista) {
  var d = cajon(f, tm);
  var fijos = d.filter(function (id) { return esFijoId(id); });
  d.length = 0;
  lista.forEach(function (x) { if (x) d.push(x); });
  fijos.forEach(function (x) { d.push(x); });
}
function colocar(id, fecha, toma, ranura) {
  ponerFueraT(fecha, toma, false);
  marcarVaciadaT(fecha, toma, false);
  var l = propios(fecha, toma);
  var r = (ranura === 1) ? 1 : 0;
  if (l[r] === id) return;
  if (l[r]) sacar(l[r], fecha, toma);
  l = propios(fecha, toma);
  l[r] = id;
  ponerPropios(fecha, toma, l);
  sacarDeBandejas(id);
  quitarGrupoDe(id);
  guardar();
}
/* Un plato que sale de un día: si venía de un grupo de la norma, el grupo vuelve. */
function devolver(id, toma) {
  var r = POR_ID[id]; if (!r) return;
  if (esGuar(r)) return;
  if (grupoDe(id)) return;
  var o = (PL().origen || {})[id];
  /* La fila es la del día del que sale, no la que se adivine de la receta. */
  var fila = (toma === 'comida' || toma === 'cena') ? toma : (o ? o.fila : 'comida');
  if (gruposDe(fila).length >= NORMAS[fila].filter(function (x) { return x !== 'fuera'; }).length) return;
  var libres = huecosLibres(fila);
  var tipo = null;
  if (o && o.fila === fila && libres.indexOf(o.tipo) >= 0) tipo = o.tipo;        /* su hueco */
  if (!tipo) libres.forEach(function (x) { if (!tipo && TIPOS[x] && TIPOS[x](r)) tipo = x; });
  if (!tipo) tipo = libres[0];                                                   /* el que quede */
  if (!tipo) return;
  if (PL().origen) delete PL().origen[id];
  var ya = usadas(); delete ya[id];
  var cands = RECETAS.filter(function (x) {
    return valeCC(x) && TIPOS[tipo](x) && !ya[x.id] && x.id !== id;
  }).map(function (x) { return x.id; }).sort(cmpStock);
  /* El plato vuelve a su grupo solo si de verdad es de ese tipo; si no, el hueco
     se rellena con tres del tipo que pide la norma. */
  var op = (TIPOS[tipo] && TIPOS[tipo](r)) ? [id].concat(cands.slice(0, 2)) : cands.slice(0, 3);
  if (!op.length) return;
  PL().grupos.push({ id: fila + '-v-' + tipo + '-' + id, fila: fila, tipo: tipo, op: op });
}
function quitar(fecha, toma, ranura) {
  var l = propios(fecha, toma);
  var id = l[ranura];
  if (!id) return;
  l.splice(ranura, 1);
  ponerPropios(fecha, toma, l);
  sacar(id, fecha, toma);
  guardar();
}
function marcarFuera(fecha, toma) {
  if (esFueraT(fecha, toma)) { ponerFueraT(fecha, toma, false); guardar(); return; }
  cajon(fecha, toma).slice().forEach(function (id) { sacar(id, fecha, toma); });
  var d = cajon(fecha, toma); d.length = 0;
  ponerFueraT(fecha, toma, true);
  guardar();
}

/* ---- Fijos de cada día: un selector por papel ----
   Carlos, 4-nov: «que el fijo sea pan, bebida y postre, y el que esté en ese cuadro
   selector sea el que se pone por defecto desde la fecha que se elija».
   El desayuno, el almuerzo y la merienda son una pieza entera; la comida y la cena
   tienen tres papeles. */
var PAPELES = {
  desayuno: ['desayuno'],
  almuerzo: ['almuerzo'],
  comida:   ['pan', 'bebida', 'postre'],
  merienda: ['merienda'],
  cena:     ['pan', 'bebida', 'postre']
};
var ETIQ_PAPEL = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', merienda: 'Merienda',
                   pan: 'Pan', bebida: 'Bebida', postre: 'Postre' };
var TOMAS = ['desayuno', 'almuerzo', 'comida', 'merienda', 'cena'];
/* Los fijos salen de TU configuracion (`config.fijos`), no de una lista escrita
   a mano aqui. Medido el 5-nov: los 12 del prototipo ya estaban los 12 en tu
   config, y la persona la deduce el motor de la propia ficha (`esDeOtro`), asi
   que no hay nada que migrar. Lo unico que config no sabe es el PAPEL —pan,
   bebida, postre—, que solo lo necesita la pantalla para cambiar el pan sin
   tocar la bebida: se deduce del grupo de la receta y se guarda en la entrada.
   Si no hay motor, se cae a la lista de siempre. */
var PAPEL_DE_GRUPO = { pan: 'pan', bebida: 'bebida', postre: 'postre', fruta: 'postre' };
function papelDeFijo(f, toma) {
  if (f && f.papel) return f.papel;
  if (PAPELES[toma] && PAPELES[toma].length === 1) return PAPELES[toma][0];
  var r = POR_ID[f && f.r];
  var p = r && PAPEL_DE_GRUPO[r.grupo];
  if (p) return p;
  if (r && /^beb_/.test(r.id)) return 'bebida';
  if (r && /^pan_/.test(r.id)) return 'pan';
  if (r && /^postre_/.test(r.id)) return 'postre';
  return PAPELES[toma] ? PAPELES[toma][0] : 'pan';
}
function fijosDeConfig() {
  if (!MOTOR) return null;
  var cfg = (A.estado.config && A.estado.config.fijos) || [];
  if (!cfg.length) return null;
  var out = {};
  TOMAS.forEach(function (tm) { out[tm] = { yo: {}, ella: {} }; });
  cfg.forEach(function (f) {
    if (!f || !f.r) return;
    var r = POR_ID[f.r];
    if (!r) return;
    /* Las ventanas de fecha mandan: tiene dos cafes que se SUCEDEN
       (`des_leche_cafe_proteinas` hasta el 1-nov, `des_cafe_leche_carlos` desde
       el 2), no dos fijos a la vez. Sin esto, el segundo pisaba al primero por
       orden de lista en vez de por fecha. */
    if (f.desde && HOY < f.desde) return;
    if (f.hasta && HOY > f.hasta) return;
    var deOtro = false;
    try { deOtro = !!A.esDeOtro(f.r); } catch (e) {}
    var dueno = null;
    try { dueno = A.duenoDe(f.r); } catch (e) {}
    (f.tomas || []).forEach(function (tm) {
      if (!out[tm]) return;
      var pa = papelDeFijo(f, tm);
      if (!f.papel) f.papel = pa;       /* se queda apuntado: el motor lo ignora */
      var e2 = { t: 'r', id: f.r, desde: f.desde || null, hasta: f.hasta || null };
      /* sin dueno es de los dos: sale en las dos columnas, como en su app */
      if (deOtro) out[tm].ella[pa] = e2;
      else if (dueno) out[tm].yo[pa] = e2;
      else { out[tm].yo[pa] = e2; out[tm].ella[pa] = e2; }
    });
  });
  return out;
}
function fijosNuevos() {
  var d = fijosDeConfig();
  if (d) return d;
  return {
    desayuno: { yo: { desayuno: { t: 'r', id: 'des_cafe_leche_carlos', desde: null } },
                ella: { desayuno: { t: 'r', id: 'des_cafe_leche_susana', desde: null } } },
    almuerzo: { yo: {}, ella: {} },
    comida: {
      yo:   { pan: { t: 'r', id: 'pan_panecillo_mesa', desde: null },
              bebida: { t: 'r', id: 'beb_agua_gas_limon_750', desde: null },
              postre: { t: 'r', id: 'postre_yogur_avena', desde: null } },
      ella: { pan: { t: 'r', id: 'pan_ortiz_mesa', desde: null },
              bebida: { t: 'i', id: 'cerveza_sin_tostada', desde: null },
              postre: { t: 'r', id: 'postre_yogur_avena', desde: null } }
    },
    merienda: { yo: {}, ella: {} },
    cena: {
      yo:   { pan: { t: 'r', id: 'pan_panecillo_mesa', desde: null },
              bebida: { t: 'r', id: 'beb_agua_gas_limon_750', desde: null },
              postre: { t: 'r', id: 'postre_yogur_avena', desde: null } },
      ella: { pan: { t: 'r', id: 'pan_ortiz_mesa', desde: null },
              postre: { t: 'r', id: 'postre_yogur_avena', desde: null } }
    }
  };
}
function nombreVivo(id) {
  if (POR_ID[id]) return nombre(id);
  if (MOTOR) { try { var r = A.receta(id); if (r) return r.corto || r.n; } catch (e) {} }
  return id;
}
function nombreDe(f) {
  if (!f) return null;
  if (f.t === 'i') { var i = ING[f.id]; return i ? i.n : f.id; }
  return nombre(f.id);
}
function fechaCorta(f) {
  if (!f) return '';
  return Number(f.slice(8, 10)) + ' ' + MESES[Number(f.slice(5, 7)) - 1].slice(0, 3);
}
function verFijo(toma, quien, papel) { return (E.fijos[toma] && E.fijos[toma][quien]) ? E.fijos[toma][quien][papel] : null; }
/* Cambiar un fijo escribe en TU `config.fijos`, no en una copia del prototipo.
   Sin esto la tabla leia de tu configuracion pero guardaba en otro sitio, y al
   montarlo en la app los cambios no habrian persistido.
   Una entrada de config puede servir a varias tomas (el pan es de comida y de
   cena) y a los dos (el yogur). Al tocar UNA celda se parte lo que haga falta:
   la entrada deja de cubrir esa toma y se crea otra para ella. */
function quitarDeConfig(id, toma) {
  var cfg = (A.estado.config.fijos || []);
  for (var i = cfg.length - 1; i >= 0; i--) {
    var x = cfg[i];
    if (!x || x.r !== id) continue;
    var t = (x.tomas || []).filter(function (tm) { return tm !== toma; });
    if (t.length) x.tomas = t; else cfg.splice(i, 1);
  }
}
function ponerFijo(toma, quien, papel, f) {
  /* Mismo caso que en el fijo de un dia: la tabla ofrece ingredientes sueltos y
     un ingrediente pelado no se planifica. Se convierte en ficha al elegirlo
     —reutilizando la que ya hubiera con esa cantidad—, que es la regla de su
     app: la receta es lo que se planifica, el ingrediente lo que se compra. */
  f = fichaDeFijo(f, toma);
  if (!MOTOR) {
    if (!E.fijos[toma]) E.fijos[toma] = { yo: {}, ella: {} };
    if (!E.fijos[toma][quien]) E.fijos[toma][quien] = {};
    if (f) E.fijos[toma][quien][papel] = f; else delete E.fijos[toma][quien][papel];
    guardar();
    return;
  }
  if (!A.estado.config.fijos) A.estado.config.fijos = [];
  var antes = verFijo(toma, quien, papel);
  /* el que habia en esa celda deja de cubrir esta toma */
  if (antes && antes.t === 'r') {
    var compartido = false;
    try { compartido = !A.duenoDe(antes.id); } catch (e) {}
    /* si era de los dos y solo se cambia una columna, sigue valiendo para la otra */
    if (!compartido || !verFijo(toma, quien === 'yo' ? 'ella' : 'yo', papel) ||
        verFijo(toma, quien === 'yo' ? 'ella' : 'yo', papel).id !== antes.id || !f) {
      quitarDeConfig(antes.id, toma);
    }
  }
  if (f && f.t === 'r') {
    var cfg = A.estado.config.fijos;
    var ya = null;
    cfg.forEach(function (x) { if (x && x.r === f.id && (x.papel || papel) === papel) ya = x; });
    if (ya) { if ((ya.tomas || []).indexOf(toma) < 0) ya.tomas.push(toma); if (f.desde) ya.desde = f.desde; }
    else cfg.push({ r: f.id, tomas: [toma], papel: papel, desde: f.desde || undefined });
  }
  E.fijos = fijosDeConfig() || E.fijos;
  guardar();
}
/* Los candidatos de cada papel, para que el selector no enseñe el recetario entero. */
function candidatos(toma, papel, busca) {
  var q = (busca || '').trim().toLowerCase(), out = [];
  function cuadra(txt) { return !q || txt.toLowerCase().indexOf(q) >= 0; }
  RECETAS.forEach(function (r) {
    var n = r.corto || r.n, vale = false;
    if (papel === 'pan') vale = /^(pan |pan$|panecillo|biscote)/i.test(n);
    else if (papel === 'postre') vale = (r.grupo === 'postre' || r.grupo === 'fruta');
    else if (papel === 'bebida') vale = /^(agua|caf[eé]|descafeinado|infusi|zumo|batido|leche|cerveza|refresco)/i.test(n);
    else vale = (r.tipo || []).indexOf(papel) >= 0;
    if (vale && cuadra(n + ' ' + r.n)) out.push({ t: 'r', id: r.id, n: n, m: (r.grupo || '') + (r.min ? ' · ' + r.min + ' min' : '') });
  });
  Object.keys(ING).forEach(function (k) {
    var i = ING[k], n = i.n, vale = false;
    if (papel === 'pan') vale = /^(pan |pan$|panecillo|biscote|mini tostas)/i.test(n);
    else if (papel === 'bebida') vale = /^(agua\b|cerveza|refresco|zumo|caf[eé]|infusi|limonada|bebida|concentrado soda)/i.test(n);
    else if (papel === 'postre') vale = /^(yogur|flan|queso batido|requesón|cuajada|natillas)/i.test(n);
    if (vale && cuadra(n)) out.push({ t: 'i', id: k, n: n, m: (i.cat || 'ingrediente') + ' · suelto' });
  });
  if (q && !out.length) {
    RECETAS.forEach(function (r) { if (cuadra((r.corto || r.n) + ' ' + r.n)) out.push({ t: 'r', id: r.id, n: r.corto || r.n, m: r.grupo || '' }); });
    Object.keys(ING).forEach(function (k) { if (cuadra(ING[k].n)) out.push({ t: 'i', id: k, n: ING[k].n, m: (ING[k].cat || '') + ' · suelto' }); });
  }
  out.sort(function (a, b) { return a.n.localeCompare(b.n); });
  return out.slice(0, 60);
}
/* ---- Vista de día: qué sale de verdad ese día ----
   El fijo de la tabla vale desde su fecha; un cambio hecho en el día manda solo
   sobre ese día y no toca la tabla. */
function fijoDelDia(fecha, toma, quien, papel) {
  var d = dias()[fecha];
  var k = toma + '|' + papel;
  if (d && d.fijos && d.fijos[quien] && d.fijos[quien].hasOwnProperty(k)) return d.fijos[quien][k];
  var f = verFijo(toma, quien, papel);
  if (!f) return null;
  if (f.desde && fecha < f.desde) return null;
  return f;
}
/* UN INGREDIENTE PUESTO COMO FIJO DEL DIA TIENE QUE SER FICHA (Carlos, 5-nov:
   «en lugar del pan que tocaba he tomado otro, pan tostado bajo en sal, me deja
   elegirlo pero no lo anota»). El selector ofrece fichas Y ingredientes sueltos,
   y un ingrediente pelado no entra en el plan: ni cuenta calorias, ni sale de la
   despensa, ni va a la compra. Su app ya sabe convertirlo —`crearSuelto` le hace
   ficha, o reutiliza la que ya hubiera con esa misma cantidad—, asi que se
   convierte aqui y lo que se guarda es la ficha. */
function fichaDeFijo(f, toma) {
  if (!f || f.t !== 'i' || !MOTOR) return f;
  try {
    var g = A.ingrediente(f.id);
    if (!g) return f;
    var cant = (g.racion != null ? g.racion : 1);
    var id = A.crearSuelto(f.id, cant, [toma]);
    if (!id) return f;
    refrescarRecetario();
    /* para que valga de fijo en esta toma, la ficha tiene que admitirla */
    var r = POR_ID[id];
    if (r && (r.tipo || []).indexOf(toma) < 0) { r.tipo = (r.tipo || []).concat([toma]); }
    return { t: 'r', id: id, desde: f.desde || null };
  } catch (e) { return f; }
}
function cambiarFijoDia(fecha, toma, quien, papel, f) {
  f = fichaDeFijo(f, toma);
  var d = dia(fecha);
  if (!d.fijos) d.fijos = { yo: {}, ella: {} };
  if (!d.fijos[quien]) d.fijos[quien] = {};
  d.fijos[quien][toma + '|' + papel] = f;   /* null = ese día no sale. Atado a su toma */
  guardar();
}
function soltarFijoDia(fecha, toma, quien, papel) {
  var d = dias()[fecha];
  if (d && d.fijos && d.fijos[quien]) { delete d.fijos[quien][toma + '|' + papel]; guardar(); }
}
function tocadoHoy(fecha, toma, quien, papel) {
  var d = dias()[fecha];
  return !!(d && d.fijos && d.fijos[quien] && d.fijos[quien].hasOwnProperty(toma + '|' + papel));
}
function cuantosPlatos(fecha) {
  var d = dias()[fecha]; if (!d) return 0;
  var n = 0;
  ['comida', 'cena'].forEach(function (t) {
    if (esFueraT(fecha, t)) return;
    (d[t] || []).forEach(function (id) { if (!esFijoId(id)) n++; });
  });
  return n;
}
/* ---- Días que come solo ----
   Carlos, 4-nov: «algunos días como solo, como los miércoles». Se marca la pauta una
   vez por día de la semana y vale para todas; en un día suelto se puede cambiar.
   0 = lunes. */
/* Los paneles arrancan cerrados menos el de propuestas y la semana que se planifica. */
function abiertoNuevo() { return { fijos: false, tabla: false, A: false, B: false, C: true }; }
function soloNuevo() { return { comida: [false,false,false,false,false,false,false],
                                cena:   [false,false,false,false,false,false,false] }; }
var CFG = {};
function diaSemana(f) { return (new Date(f + 'T12:00:00').getDay() + 6) % 7; }
function pax(fecha, toma) {
  var px = paxDe(fecha, toma);
  if (px) return px;
  /* el almuerzo y la merienda son suyos solos: así los tiene en tomasEspeciales */
  if (toma === 'almuerzo' || toma === 'merienda') return 1;
  if (toma !== 'comida' && toma !== 'cena') return (CFG.personas || 2);
  return (E.solo && E.solo[toma] && E.solo[toma][diaSemana(fecha)]) ? 1 : (CFG.personas || 2);
}
function ponerPax(fecha, toma, n) {
  var d = dia(fecha)[toma];
  if (n === null) { if (d.comensales) { delete d.comensales[toma]; if (!Object.keys(d.comensales).length) delete d.comensales; } }
  else setPax(fecha, toma, Math.max(1, Math.min(12, n)));
  guardar();
}
/* ---- QUIÉN SE LO COME, por día, toma y plato ----
   Igual que en su app (v378): "dos" se compra por los comensales y cuenta;
   "carlos" para uno y cuenta; "susana" para uno y NO cuenta ni calorías ni sal.
   Sin marca, sale de quién lo tiene puesto como fijo, y si no, de los dos. */
function quienPorDefecto(f, tm, id) {
  var mio = false, suyo = false;
  PAPELES[tm].forEach(function (pa) {
    var a = fijoDelDia(f, tm, 'yo', pa), b = fijoDelDia(f, tm, 'ella', pa);
    if (a && a.t === 'r' && a.id === id) mio = true;
    if (b && b.t === 'r' && b.id === id) suyo = true;
  });
  if (mio && suyo) return 'dos';
  if (suyo) return 'susana';
  if (mio) return 'carlos';
  var r = POR_ID[id];
  if (r && r.dueno === 'ella') return 'susana';
  if (r && r.dueno === 'yo') return 'carlos';
  return 'dos';
}
function quienDe(f, tm, id) {
  var d = dias()[f];
  var q = d && d.quien && d.quien[tm] && d.quien[tm][id];
  return q || quienPorDefecto(f, tm, id);
}
function ponerQuien(f, tm, id, q) {
  var d = dia(f);
  if (!d.quien) d.quien = {};
  if (!d.quien[tm]) d.quien[tm] = {};
  if (q === quienPorDefecto(f, tm, id)) {
    delete d.quien[tm][id];
    if (!Object.keys(d.quien[tm]).length) delete d.quien[tm];
    if (!Object.keys(d.quien).length) delete d.quien;
  } else d.quien[tm][id] = q;
  guardar();
}
var QUIEN = ['dos', 'carlos', 'susana'];
var ETIQ_QUIEN = { dos: 'Los dos', carlos: 'Solo Carlos', susana: 'Solo Susana' };

/* La lista de platos de una toma, tal y como va al motor: primero lo elegido,
   después los fijos, como ordena su app. */
/* Su app: los fijos «no se ponen en las tomas que se comen fuera (no las cocina
   él) ni en las de mochila de un día de ruta (el pan tostado en una mochila acaba
   hecho migas)». */
function fijosAqui(f, tm) {
  var d = dias()[f];
  if (vaciadaT(f, tm)) return false;
  if (esFueraT(f, tm)) return false;
  if (deMochila(f, tm)) return false;
  return true;
}
function platosDe(f, tm) {
  var d = dias()[f] || vacio(f), out = [], visto = {};
  {
    /* Un mismo bloque puesto dos veces es UNA fila con ×2, como en su app: si se
       deduplicaba sin contar, el día sumaba dos y enseñaba uno. */
    ((d && d[tm]) || []).forEach(function (id) {
      if (visto[id]) { out[visto[id] - 1].veces++; return; }
      out.push({ id: id, fijo: false, veces: 1, quien: quienDe(f, tm, id) });
      visto[id] = out.length;
    });
  }
  /* LA FICHA DEL DIA ENSENA LO QUE EL DIA TIENE (Carlos, 6-nov). Esta lista
     anadia los fijos SACANDOLOS DE LA TABLA, sin mirar el dia ni lo que el
     habia quitado. En la comida del 4 de noviembre aparecian el pan tostado de
     Susana, el agua con gas y el yogur: justo los tres que el habia quitado a
     mano. Comida que no comio, pintada en su ficha.
     · Un dia pasado se lee: solo lo que tiene.
     · En hoy y los que vienen, un fijo de la tabla se ofrece unicamente si esa
       toma tiene principal y el no lo ha quitado. */
  if (f >= HOY && propios(f, tm).length && fijosAqui(f, tm)) PAPELES[tm].forEach(function (pa) {
    ['yo', 'ella'].forEach(function (q) {
      var fj = fijoDelDia(f, tm, q, pa);
      if (!fj) return;
      if (MOTOR) { try { if (A.estaQuitado(f, tm, fj.id)) return; } catch (e) {} }
      if (fj.t !== 'r') { out.push({ id: fj.id, fijo: true, papel: pa, suelto: true, quien: q === 'yo' ? 'carlos' : 'susana' }); return; }
      if (visto[fj.id]) return; 
      out.push({ id: fj.id, fijo: true, veces: 1, papel: pa, quien: quienDe(f, tm, fj.id) });
      visto[fj.id] = out.length;
    });
  });
  return out;
}
/* Añadir algo al final de una toma, sin ranuras: es como se montan el almuerzo
   y la merienda a base de bloques, y lo que se apunta de una comida fuera. */
function anadirA(f, tm, id) {
  var d = cajon(f, tm);
  marcarVaciadaT(f, tm, false);
  d.push(id);
  sacarDeBandejas(id);
  quitarGrupoDe(id);
  guardar();
  return id;
}
/* Los fijos que hoy se han quitado a mano. Hasta ahora desaparecían sin dejar
   rastro y no había forma de devolverlos: Carlos, 5-nov, «el desayuno de Susana no
   aparece en el menú del día». No era que faltase, es que se había quitado y no se
   veía — y al cerrar el día solo se descontó uno de los dos cafés. */
function quitadosDe(f, tm) {
  var out = [];
  if (!fijosAqui(f, tm)) return out;
  PAPELES[tm].forEach(function (pa) {
    ['yo', 'ella'].forEach(function (q) {
      if (!tocadoHoy(f, tm, q, pa)) return;
      if (fijoDelDia(f, tm, q, pa)) return;          /* cambiado por otro, no quitado */
      var base = verFijo(tm, q, pa);
      out.push({ quien: q, papel: pa,
                 nombre: base ? nombreDe(base) : ETIQ_PAPEL[pa].toLowerCase() });
    });
  });
  return out;
}
/* La ✕ de un plato: si es elegido se saca de la lista; si es fijo, hoy no sale. */
function quitarPlato(f, tm, id) {
  /* Primero los fijos: quitar un fijo es «hoy no», no sacarlo de una ranura.
     Si se mira la ranura antes, un fijo no aparece en `propios` y el bucle de
     abajo no terminaba nunca. */
  if (!esFijoId(id)) {
    var l = propios(f, tm);
    if (l.indexOf(id) >= 0) {
      while (l.indexOf(id) >= 0) { quitar(f, tm, l.indexOf(id)); l = propios(f, tm); }
      return;
    }
  }
  PAPELES[tm].forEach(function (pa) {
    ['yo', 'ella'].forEach(function (q) {
      var fj = fijoDelDia(f, tm, q, pa);
      if (fj && fj.id === id) cambiarFijoDia(f, tm, q, pa, null);
    });
  });
  guardar();
}
/* ---- BLOQUES DE 100 Y PIEZAS, para el almuerzo y la merienda ----
   Carlos en su app: «que ofrezca los ingredientes en cantidades que tengan 100
   calorías (margen de 90 a 120)… y voy eligiendo yo hasta alcanzar lo que toque».
   No se reconocen por el nombre: se reconocen porque VALEN eso. Lo que se sale de
   la banda y es de una sola cosa es una PIEZA, que no se parte. */
function esBebidaFicha(r) {
  var n = r.corto || r.n || '';
  return /^(agua|caf[eé]|descafeinado|infusi|zumo|batido|leche|cerveza|refresco|limonada|bebida)/i.test(n);
}
function kcalFicha(r) {
  if (!MOTOR) return 0;
  try { return Math.round((A.nutrReceta(r) || {}).k || 0); } catch (e) { return 0; }
}
function bloquesDe(tm, busca) {
  if (!MOTOR) return { bloques: [], piezas: [], bebidas: [], otras: [] };
  var q = (busca || '').trim().toLowerCase();
  var out = { bloques: [], piezas: [], bebidas: [], otras: [] };
  (A.estado.recetas || []).forEach(function (r) {
    if (!vivaFicha(r)) return;
    if ((r.tipo || []).indexOf(tm) < 0) return;
    if (q && ((r.corto || '') + ' ' + r.n).toLowerCase().indexOf(q) < 0) return;
    var k = kcalFicha(r);
    var it = { id: r.id, n: r.corto || r.n, k: k, llevable: !!r.llevable };
    if (esBebidaFicha(r)) { out.bebidas.push(it); return; }
    var unaCosa = (r.grupo === 'suelto' && (r.ing || []).length === 1);
    if (unaCosa && k >= 88 && k <= 122) out.bloques.push(it);
    else if (unaCosa && (k > 122 || (k >= 25 && k < 88))) out.piezas.push(it);
    else out.otras.push(it);
  });
  ['bloques','piezas','bebidas','otras'].forEach(function (s) {
    out[s].sort(function (a, b) { return a.n.localeCompare(b.n); });
  });
  return out;
}
/* Las fichas de restaurante, para valorar lo que comes fuera. */
function fichasRestaurante(busca) {
  if (!MOTOR) return [];
  var q = (busca || '').trim().toLowerCase(), out = [];
  (A.estado.recetas || []).forEach(function (r) {
    if (!vivaFicha(r) || r.grupo !== 'restaurante') return;
    if (q && ((r.corto || '') + ' ' + r.n).toLowerCase().indexOf(q) < 0) return;
    out.push({ id: r.id, n: r.corto || r.n, k: kcalFicha(r) });
  });
  return out.sort(function (a, b) { return a.n.localeCompare(b.n); });
}
function estimacionFuera(tm) {
  if (!MOTOR) return null;
  try { return A.estimacionFuera(tm) || null; } catch (e) { return null; }
}
/* ---- CAPRICHOS ----
   Su recetario dice desde el 23-sep: «ya no existe el grupo capricho: que algo sea
   un capricho depende del día en que te lo comas». Y Carlos, el 5-nov: «debería ser
   una pizza congelada, el helado… cosas que están en stock pero que no entran en el
   menú normal». Las dos cosas a la vez: se ofrece primero lo que tiene en casa de
   picar, se puede apuntar a mano lo de la calle, y el recetario entero sigue ahí. */
var CATS_CAPRICHO = ['Dulces', 'Aperitivos y frutos secos', 'Congelados',
                     'Restaurante y bar', 'Panadería'];
function caprichosDe(f) {
  var d = dias()[f];
  return (d && d.capricho) ? d.capricho.slice() : [];
}
function anadirCapricho(f, id) {
  if (!id) return null;
  var d = dia(f);
  if (!d.capricho) d.capricho = [];
  d.capricho.push(id);
  guardar();
  return id;
}
function quitarCapricho(f, idx) {
  var d = dia(f);
  if (!d.capricho) return;
  d.capricho.splice(idx, 1);
  if (!d.capricho.length) delete d.capricho;
  guardar();
}
/* De la despensa: lo que tiene en casa y es de picar. Se crea como «suelto», que es
   lo que hace su app con una manzana del almuerzo: cuenta calorías Y sale de la
   despensa, que es justo lo que pide una pizza que ya tienes en el congelador. */
function caprichosDespensa(busca) {
  if (!MOTOR) return [];
  var q = (busca || '').trim().toLowerCase(), out = [];
  var st = A.estado.stock || {};
  Object.keys(st).forEach(function (k) {
    if (!st[k] || !(st[k].c > 0)) return;
    var i = A.ingrediente(k);
    if (!i || CATS_CAPRICHO.indexOf(i.cat) < 0) return;
    if (q && i.n.toLowerCase().indexOf(q) < 0) return;
    out.push({ id: k, n: i.n, cat: i.cat, u: i.u || 'ud', k100: i.k || 0,
               hay: Math.round(st[k].c * 100) / 100 });
  });
  out.sort(function (a, b) { return a.cat === b.cat ? a.n.localeCompare(b.n) : a.cat.localeCompare(b.cat); });
  return out;
}
function caprichoDeDespensa(f, idIng, cant) {
  if (!MOTOR) return null;
  try {
    var id = A.crearSuelto(idIng, Number(cant) || 1, ['capricho']);
    return id ? anadirCapricho(f, id) : null;
  } catch (e) { return null; }
}
function caprichoAMano(f, nombre, kcal) {
  if (!MOTOR) return null;
  try {
    var id = A.crearCapricho(nombre, kcal);
    return id ? anadirCapricho(f, id) : null;
  } catch (e) { return null; }
}
/* Caprichos que ya se apuntó otras veces: salen del recetario para no repetir. */
function caprichosVistos(busca) {
  if (!MOTOR) return [];
  var q = (busca || '').trim().toLowerCase(), out = [], visto = {};
  (A.estado.recetas || []).forEach(function (r) {
    if (!r || (r.grupo !== 'capricho' && !/^(cap|solo)_/.test(r.id))) return;
    if (visto[r.id]) return; visto[r.id] = 1;
    if (q && (r.n || '').toLowerCase().indexOf(q) < 0) return;
    var n = 0; try { n = (A.nutrEn(HOY, r.id) || {}).k || 0; } catch (e) {}
    out.push({ id: r.id, n: r.n, k: Math.round(n) });
  });
  out.sort(function (a, b) { return a.n.localeCompare(b.n); });
  return out;
}
function pautaSolo(toma, idx) {
  if (!E.solo) E.solo = soloNuevo();
  E.solo[toma][idx] = !E.solo[toma][idx];
  guardar();
}
/* ---- Comido y cuánto, como en la app ----
   comido[toma] = [ids] · real[toma][id] = {c, u} con u = 'rac' para una receta y
   la unidad del ingrediente (g, ml, ud) para los sueltos. */
/* La cantidad base. Para una receta es UNA RACION y punto: deducirla del
   ingrediente miente en cuanto la ficha es un concentrado —sus refrescos de
   SodaStream son 33 ml de sirope para una botella de 750, y diria «33 ml»—.
   Para un ingrediente solo sale su racion con su unidad: 30 g, 1 ud. */
function racionDe(f) {
  if (f.t === 'i') { var i = ING[f.id]; return { c: (i && i.racion) || 1, u: (i && i.u) || 'ud' }; }
  return { c: 1, u: 'rac' };
}
function unidadTexto(c, u) {
  var n = Math.round(c * 100) / 100;
  var txt = String(n).replace('.', ',');
  if (u === 'rac') return txt + (n === 1 ? ' ración' : ' raciones');
  return txt + ' ' + u;
}
function realDe(fecha, toma, f) {
  var d = dias()[fecha];
  var r = d && d.real && d.real[toma] && d.real[toma][f.id];
  return r ? { c: r.c, u: r.u } : racionDe(f);
}
/* ¿hay una cantidad apuntada a mano, o sale la de la ficha? */
function hayReal(fecha, toma, f) {
  var d = dias()[fecha];
  return !!(d && d.real && d.real[toma] && d.real[toma][f.id]);
}
function ponerReal(fecha, toma, f, c, u) {
  var d = dia(fecha);
  if (!d.real) d.real = {};
  if (!d.real[toma]) d.real[toma] = {};
  var base = racionDe(f);
  if (c <= 0) delete d.real[toma][f.id];
  else d.real[toma][f.id] = { c: Math.round(c * 100) / 100, u: u || base.u };
  guardar();
}
/* Las unidades en las que se puede apuntar cada cosa. El pan va contado por
   unidades de 85 g, pero él lo pesa: por eso hace falta poder cambiar a gramos. */
function unidades(f) {
  if (f.t === 'i') {
    var i = ING[f.id] || {};
    var u = [i.u || 'ud'];
    if (i.u === 'ud' && i.pesoUd) u.push('g');
    return u;
  }
  return ['rac', 'g'];
}
function paso(f, u) {
  if (u === 'g' || u === 'ml') {
    var i = f.t === 'i' ? ING[f.id] : null;
    if (i && i.pesoUd) return Math.round(i.pesoUd / 2);
    if (i && i.racion) return Math.max(5, Math.round(i.racion / 2));
    return 10;
  }
  var b = racionDe(f);
  return (b.c || 1) / 2;
}
function estaComido(fecha, toma, id) {
  var d = dias()[fecha];
  return !!(d && d.comido && d.comido[toma] && d.comido[toma].indexOf(id) >= 0);
}
function marcarComido(fecha, toma, id) {
  var d = dia(fecha);
  if (!d.comido) d.comido = {};
  if (!d.comido[toma]) d.comido[toma] = [];
  var i = d.comido[toma].indexOf(id);
  if (i >= 0) d.comido[toma].splice(i, 1); else d.comido[toma].push(id);
  guardar();
}
/* ---- Puente con el motor de la app ----
   En vez de rehacer las cuentas de calorías, sal y objetivo, el prototipo carga
   `js/almacen.js` de la app y le pasa el plan que tiene montado. Así los números
   son LOS MISMOS, no una cuenta paralela. */
var A = window.Almacen || null;
function arrancarMotor() {
  refrescarRecetario();
  if (!A.estado.plan) A.estado.plan = {};
  if (!A.estado.comido) A.estado.comido = {};
  if (!A.estado.real) A.estado.real = {};
  if (!A.estado.actividad) A.estado.actividad = {};
  if (!A.estado.planificador) A.estado.planificador = { grupos: [], bandejas: {}, origen: {} };
  return true;
}
/* Vuelca al motor lo que el prototipo tiene planificado para esas fechas. */
/* Un dia esta TOCADO si el ha hecho algo en el: quitar o cambiar un fijo de ese
   dia, vaciarlo, cerrarlo, o poner cualquier plato que no sea un fijo. */
function diaTocado(f, d) {
  if (!d) return false;
  if (d.cerrado || d.sinFijos || d.quitados || d.guardadoVaciar) return true;
  if (d.fijos && (Object.keys(d.fijos.yo || {}).length || Object.keys(d.fijos.ella || {}).length)) return true;
  var hay = false;
  TOMAS.forEach(function (tm) {
    (d[tm] || []).forEach(function (id) { if (!esFijoId(id)) hay = true; });
  });
  return hay;
}
function limpiarFijos(f, d) {
  if (!MOTOR) return;
  var cfg = (A.estado.config && A.estado.config.fijos) || [];
  var ficha = null;
  try { ficha = A.fichaTipoDia(f); } catch (e) { ficha = { mochila: [] }; }
  /* QUE FIJOS TOCAN HOY EN CADA TOMA, con las reglas de su motor. */
  function tocan(tm) {
    var ok = {};
    if (esFueraT(f, tm) || vaciadaT(f, tm)) return ok;
    if ((ficha.mochila || []).indexOf(tm) >= 0) return ok;
    cfg.forEach(function (x) {
      if (!x || !x.r || (x.tomas || []).indexOf(tm) < 0) return;
      if (x.desde && f < x.desde) return;
      if (x.hasta && f > x.hasta) return;
      try { if (A.estaQuitado(f, tm, x.r)) return; } catch (e) {}
      try { if (A.esDeOtro(x.r) && A.comensales(f, tm) < 2) return; } catch (e) {}
      ok[x.r] = 1;
    });
    return ok;
  }
  /* Y FUERA LOS QUE YA NO TOCAN. Se mira al reves que antes —lo que hay en el
     dia contra lo que deberia haber—, porque si cambias el pan en la tabla, la
     entrada vieja deja de declarar esa toma y recorriendo la config no se la
     encontraba nunca: el pan de antes se quedaba puesto para siempre. */
  TOMAS.forEach(function (tm) {
    var l = d[tm]; if (!l || !l.length) return;
    var ok = tocan(tm);
    for (var i = l.length - 1; i >= 0; i--) {
      if (esFijoId(l[i]) && !ok[l[i]]) l.splice(i, 1);
    }
  });
}
function sincronizar(fechas) {
  if (!MOTOR) return;
  fechas.forEach(function (f) {
    /* UN DIA PASADO SE LEE, NO SE ESCRIBE (Carlos, 6-nov). Esta funcion
       reescribia tambien el pasado: rehacia `quitados` quitando los fijos y
       fijaba comensales en almuerzo y merienda. Resultado medido contra su
       estado real: los fijos que el habia quitado a mano el 31-oct, el 1, el 2
       y el 4 de noviembre desaparecieron del registro, y en el 28, 29 y 30 de
       octubre quedaron a uno. Eran decisiones suyas de semanas. */
    if (f < HOY) return;
    var d = A.asegurarDia(f);
    if (!d.tipo || !tiposDia()[d.tipo]) d.tipo = 'casa';
    if (d.tipo !== 'ruta') delete d.ruta;
    TOMAS.forEach(function (tm) {
      var n = pax(f, tm);
      if (tm === 'almuerzo' || tm === 'merienda') n = 1;
      if (n === 2) { if (d.comensales) { delete d.comensales[tm]; if (!Object.keys(d.comensales).length) delete d.comensales; } }
      else { if (!d.comensales) d.comensales = {}; d.comensales[tm] = n; }
    });
    TOMAS.forEach(function (tm) {
      /* se REHACE en cada pasada, no se acumula: al devolver un fijo con «volver
         a ponerlo», el apunte viejo se quedaba en `quitados` y el motor no lo
         reponia nunca. */
      if (d.quitados && d.quitados[tm]) {
        var dejar = d.quitados[tm].filter(function (id) { return !esFijoId(id); });
        if (dejar.length) d.quitados[tm] = dejar; else delete d.quitados[tm];
        if (!Object.keys(d.quitados).length) delete d.quitados;
      }
      if (!fijosAqui(f, tm)) return;
      PAPELES[tm].forEach(function (pa) {
        ['yo', 'ella'].forEach(function (q) {
          if (!tocadoHoy(f, tm, q, pa)) return;
          var base = verFijo(tm, q, pa);
          if (base && base.t === 'r') {
            if (!d.quitados) d.quitados = {};
            if (!d.quitados[tm]) d.quitados[tm] = [];
            if (d.quitados[tm].indexOf(base.id) < 0) d.quitados[tm].push(base.id);
            var k2 = (d[tm] || []).indexOf(base.id);
            if (k2 >= 0) d[tm].splice(k2, 1);
          }
          var hoy2 = fijoDelDia(f, tm, q, pa);
          if (hoy2 && hoy2.t === 'r' && (!base || hoy2.id !== base.id)) {
            if (!d[tm]) d[tm] = [];
            if (d[tm].indexOf(hoy2.id) < 0) d[tm].push(hoy2.id);
          }
        });
      });
    });
    /* LOS FIJOS, SOLO EN LOS DIAS QUE NO HAS TOCADO (Carlos, 5-nov).
       Son dos cosas que tienen que convivir:
       · «una vez planificado se puede editar, pero no hay que rellenarlo
         automaticamente con los fijos de nuevo» — un dia que el ha tocado no se
         rehace: quitar el pan de un martes no se deshace al volver a entrar;
       · y si cambia el pan en LA TABLA, ese cambio tiene que llegar a los dias
         que todavia no ha tocado, o la tabla no sirve de nada.
       Asi que no hay marca de «sembrado»: se mira si el dia esta tocado, y eso
       se sabe por lo que el mismo ha dejado escrito en el. */
    /* EL FIJO APARECE SOLO DONDE HAY PRINCIPAL (Carlos, 6-nov: «quiero pasar los
       fijos determinados en el cuadro que disenamos a todos los dias, han de
       aparecer en el dia solo cuando tiene principales definidos»). La tabla de
       fijos rige para los 21 dias; lo que decide si se ven es que esa toma tenga
       comida. Una cena sin plato no lleva pan ni yogur: esta vacia.
       Los pone el motor de Carlos, que ya respeta lo vaciado, lo quitado a mano,
       los dias de mochila y el plato de Susana cuando come uno solo. */
    try { A.ponerFijos(f); } catch (e) {}
    limpiarFijos(f, d);
    TOMAS.forEach(function (tm) {
      if (propios(f, tm).length) return;
      var l = d[tm]; if (!l || !l.length) return;
      for (var i = l.length - 1; i >= 0; i--) if (esFijoId(l[i])) l.splice(i, 1);
    });
    if (!A.estado.actividad) A.estado.actividad = {};
    if (d.actividad && d.actividad.length) A.estado.actividad[f] = d.actividad;
    else delete A.estado.actividad[f];
    /* Solo se espeja lo que el prototipo guarda en el propio dia. Si el dia
       viene de su copia y no lo ha tocado el prototipo, se deja como estaba: si
       no, se borraba lo comido de dias pasados y todo aparecia como pendiente. */
    if (!A.estado.comido) A.estado.comido = {};
    if (!A.estado.real) A.estado.real = {};
    if (d.comido) A.estado.comido[f] = d.comido;
    if (d.real) A.estado.real[f] = d.real;
  });
}
function numerosDia(f) {
  if (!MOTOR) return null;
  sincronizar([f]);
  try {
    var obj = A.objetivoDelDia(f);
    return { objetivo: obj,
             plan: A.nutrDia(f, false),
             comido: A.nutrDia(f, true),
             sal: A.salDia(f),
             nota: A.notaDia(f),
             semaforo: A.semaforoKcal(A.nutrDia(f, false).k, obj) };
  } catch (e) { return null; }
}
function numerosSemana(lunes) {
  if (!MOTOR) return null;
  var fechas = fechasDe(lunes);
  sincronizar(fechas);
  var t = { objetivo: 0, plan: 0, comido: 0, sal: 0, prot: 0, hid: 0, gra: 0, dias: 0, pasa: 0 };
  fechas.forEach(function (f) {
    try {
      var o = A.objetivoDelDia(f) || 0, np = A.nutrDia(f, false), s = A.salDia(f);
      t.objetivo += o; t.plan += np.k || 0; t.prot += np.p || 0;
      t.hid += np.h || 0; t.gra += np.g || 0;
      t.comido += (A.nutrDia(f, true) || {}).k || 0;
      t.sal += s || 0; t.dias++;
      if (hayTopeSal(f) && s > (A.estado.config.limiteSal || 4.75)) t.pasa++;
    } catch (e) {}
  });
  return t;
}
/* ---- Ejercicio del día y cierre, con las funciones de la app ---- */
/* La cadena del objetivo, tal y como la escribe la app:
   «Gastas ≈ X (base + entreno) − déficit = comer Y». */
function cadenaObjetivo(f) {
  if (!MOTOR) return null;
  sincronizar([f]);
  try {
    if (!A.tmb || !A.tmb()) return null;
    var e = ejercicioDia(f);
    return { gasto: Math.round(A.gastoDelDia(f)),
             base: Math.round(A.gastoBase()),
             entreno: e ? e.suben : 0,
             deficit: Math.round(A.deficitDiario()),
             objetivo: A.objetivoDelDia(f),
             suelo: A.objetivoEnSuelo ? A.objetivoEnSuelo(f) : false };
  } catch (err) { return null; }
}
/* El entreno del día con las etiquetas de la app: del plan, reloj,
   sustituida por lo real, no se hizo. */
function entrenoDelDia(f) {
  if (!MOTOR) return [];
  sincronizar([f]);
  try { return A.entrenoDelDia(f) || []; } catch (e) { return []; }
}
function confirmarActividad(f, idx, si) {
  if (!MOTOR) return;
  sincronizar([f]);
  try { A.confirmarActividad(f, idx, si ? 1 : 0); } catch (e) {}
  var d = dia(f);
  if (A.estado.actividad && A.estado.actividad[f]) d.actividad = JSON.parse(JSON.stringify(A.estado.actividad[f]));
  var pl = A.estado.plan[f];
  if (pl && pl.tipo && tiposDia()[pl.tipo]) d.tipo = pl.tipo;
  if (pl && pl.ruta) d.ruta = { a: pl.ruta.a, h: pl.ruta.h };
  guardar();
}
function comensales(f, toma) {
  var px0 = paxDe(f, toma); if (px0) return px0;
  if (toma === 'almuerzo' || toma === 'merienda') return 1;
  return pax(f, toma);
}
function kcalToma(f, toma) {
  if (!MOTOR) return 0;
  sincronizar([f]);
  try { var n = A.nutrToma(f, toma); return Math.round((n && n.k) || 0); } catch (e) { return 0; }
}
/* La sal de una toma: la suma de la sal de sus platos, con la misma función de
   la app (salReceta), que ya respeta los pesos corregidos a mano. */
function salToma(f, toma) {
  if (!MOTOR) return 0;
  sincronizar([f]);
  try {
    var pl = A.estado.plan[f]; if (!pl || !pl[toma]) return 0;
    if (A.esFuera && A.esFuera(f, toma)) return 0;
    var t = 0;
    pl[toma].forEach(function (id) {
      var r = A.receta ? A.receta(id) : null;
      if (!r) { (A.estado.recetas || []).some(function (x) { if (x.id === id) { r = x; return true; } }); }
      if (r) t += A.salReceta(r) || 0;
    });
    return Math.round(t * 100) / 100;
  } catch (e) { return 0; }
}
function ejercicioDia(f) {
  if (!MOTOR) return null;
  sincronizar([f]);
  var lista = (A.estado.actividad && A.estado.actividad[f]) || [];
  var cat = {}; (window.DATOS_ACTIVIDADES || []).forEach(function (a) { cat[a.id] = a; });
  var kp = {};
  try { kp = A.kcalPorProcedencia(f) || {}; } catch (e) {}
  var cfg = A.estado.config || {};
  var dev = typeof cfg.devolucionEjercicio === 'number' ? cfg.devolucionEjercicio : 0.7;
  var pre = typeof cfg.previsionEjercicio === 'number' ? cfg.previsionEjercicio : 0.5;
  var suben = 0, partes = [];
  if (kp.real) { suben += kp.real; partes.push(Math.round(kp.real) + ' medidas por el reloj'); }
  if (kp.previsto) { suben += kp.previsto * pre; partes.push(Math.round(kp.previsto * pre) + ' del plan, todavía por hacer'); }
  if (kp.apuntado) { suben += kp.apuntado * dev; partes.push(Math.round(kp.apuntado * dev) + ' de lo que añadiste (el ' + Math.round(dev * 100) + ' %)'); }
  var total = 0;
  try { total = Math.round(A.kcalActividad(f) || 0); } catch (e) {}
  return { lista: lista.map(function (x, i) { return { i: i, a: x.a, n: (cat[x.a] || {}).n || x.a, min: x.min, ref: x.ref }; }),
           total: total, suben: Math.round(suben), partes: partes, caducado: Math.round(kp.caducado || 0) };
}
function catalogoActividades() {
  return (window.DATOS_ACTIVIDADES || []).map(function (a) { return { id: a.id, n: a.n, min: a.min, met: a.met }; });
}
/* ---- EN CASA / OUTDOOR ----
   Igual que en su app: el tipo vive en el día, y un día de ruta no tiene tope de sal
   («sudando se pierden unos 2,1 g por litro»). La salida se guarda en `d.ruta` y
   además registra una actividad con ref «ruta», que es lo que sube el objetivo.
   Volver a «en casa» deshace las dos cosas: el 25-sep le pasó que quitó el día de
   ruta y el senderismo se quedó sumando cuatro horas a un domingo de sofá. */
function tiposDia() { return (MOTOR && A.TIPOS_DIA) ? A.TIPOS_DIA : { casa: { n: 'En casa' }, ruta: { n: 'Outdoor' } }; }
function deportesRuta() {
  if (!MOTOR || !A.DEPORTES_RUTA) return [];
  return A.DEPORTES_RUTA.map(function (x) {
    var a = A.actividad(x.id);
    return a ? { id: x.id, n: a.n, h: x.h } : null;
  }).filter(Boolean);
}
function tipoDia(f) {
  var d = dias()[f];
  var tp = d && d.tipo;
  return tiposDia()[tp] ? tp : 'casa';
}
function ponerTipoDia(f, tipo) {
  if (!tiposDia()[tipo]) return null;
  var d = dia(f), quitada = null;
  if (tipo !== 'ruta' && d.ruta) {
    quitada = d.ruta;
    delete d.ruta;
    if (d.actividad) {
      d.actividad = d.actividad.filter(function (x) { return x.ref !== 'ruta'; });
      if (!d.actividad.length) delete d.actividad;
    }
  }
  d.tipo = tipo;
  guardar();
  return quitada;
}
function planearRuta(f, idDeporte, horas) {
  if (!MOTOR) return null;
  var act = A.actividad(idDeporte);
  if (!act || !(horas > 0)) return null;
  var d = dia(f);
  d.tipo = 'ruta';
  d.ruta = { a: idDeporte, h: Number(horas) };
  if (!d.actividad) d.actividad = [];
  d.actividad = d.actividad.filter(function (x) { return x.ref !== 'ruta'; });
  var min = Math.round(horas * 60);
  d.actividad.push({ a: idDeporte, min: min, ref: 'ruta' });
  guardar();
  var kcal = 0;
  try { kcal = Math.round(A.kcalDeEntrada({ a: idDeporte, min: min })); } catch (e) {}
  return { min: min, kcal: kcal };
}
function quitarRuta(f) {
  var d = dia(f);
  if (!d.ruta) return null;
  var era = d.ruta;
  delete d.ruta;
  if (d.actividad) {
    d.actividad = d.actividad.filter(function (x) { return x.ref !== 'ruta'; });
    if (!d.actividad.length) delete d.actividad;
  }
  guardar();
  return era;
}
function fichaRuta(f) {
  var d = dias()[f];
  if (!d || !d.ruta || !MOTOR) return null;
  var act = A.actividad(d.ruta.a);
  if (!act) return null;
  var min = Math.round(d.ruta.h * 60), kcal = 0;
  try { kcal = Math.round(A.kcalDeEntrada({ a: d.ruta.a, min: min })); } catch (e) {}
  return { a: d.ruta.a, n: act.n, h: d.ruta.h, min: min, kcal: kcal };
}
/* ---------- los tres huecos que su app tiene y el prototipo no (5-nov) ----------
   Ninguno es calculo nuevo: almacen.js ya los sabe hacer, el prototipo no los
   llamaba. Aqui solo esta el cableado. */

/* «Comprado y sin comer»: platos de dias ya pasados que se compraron y nunca se
   marcaron. Mientras esten en la lista no se vuelven a pedir en la compra. */
function pendientes() {
  if (!MOTOR) return [];
  try {
    sincronizar(fechasDe(masDias(E.lunes, -7)).concat(fechasDe(E.lunes)));
    return (A.pendientesDespensa() || []).map(function (p) {
      return { f: p.f, toma: p.toma, id: p.id, n: p.n };
    });
  } catch (e) { return []; }
}
function reprogramarPendiente(f, toma, id) {
  if (!MOTOR) return null;
  try { var d = A.reprogramarPendiente(f, toma, id); traerDeVuelta(); guardar(); return d; }
  catch (e) { return null; }
}
function pendienteComido(f, toma, id) {
  if (!MOTOR) return;
  try { A.marcarComido(f, toma, id, true); guardar(); } catch (e) {}
}
function pendienteFuera(f, toma, id) {
  if (!MOTOR) return;
  try { A.marcarComprado(f, toma, id, false); guardar(); } catch (e) {}
}
function vaciarPendientes() {
  var l = pendientes();
  l.forEach(function (p) { pendienteFuera(p.f, p.toma, p.id); });
  return l.length;
}
/* Lo que el motor haya movido al reprogramar vuelve al estado del prototipo. */
function traerDeVuelta() {
  if (!MOTOR) return;
  Object.keys(A.estado.plan || {}).forEach(function (f) {
    var d = A.estado.plan[f]; if (!d) return;
    ['comida', 'cena', 'desayuno', 'almuerzo', 'merienda'].forEach(function (tm) {
      var l = (d[tm] || []).slice();
      if (!l.length) return;
      var c = cajon(f, tm);
      l.forEach(function (id) { if (c.indexOf(id) < 0) c.push(id); });
    });
  });
}

/* La guarnicion que no cabe entera: cuantas kcal quedan para ella, y la racion
   recortada que si cabe. */
function huecoGuar(f, toma) {
  if (!MOTOR) return null;
  var c = cajon(f, toma);
  var pid = null;
  (c || []).forEach(function (id) { if (!pid && !esGuar(POR_ID[id])) pid = id; });
  if (!pid) return null;
  try { return A.huecoGuarnicion(f, toma, pid) || null; } catch (e) { return null; }
}
function ajusteGuar(hueco, id) {
  if (!MOTOR || hueco == null) return null;
  var g = POR_ID[id]; if (!g) return null;
  try { return A.ajusteGuarnicion(hueco, g) || null; } catch (e) { return null; }
}

/* El aviso de que cambiar un plato ya comido ha movido la despensa. */
function reajuste() {
  if (!MOTOR) return '';
  var c = A.ultimoReajuste;
  A.ultimoReajuste = null;
  if (!c || !c.length) return '';
  function fmt(x) {
    var v = Math.abs(x.delta);
    return String(Math.round(v * 100) / 100).replace('.', ',') + ' ' + x.n;
  }
  var dev = c.filter(function (x) { return x.delta < 0; }).map(fmt);
  var qui = c.filter(function (x) { return x.delta > 0; }).map(fmt);
  var t = [];
  if (dev.length) t.push('Vuelve a la despensa: ' + dev.join(', '));
  if (qui.length) t.push('Sale de la despensa: ' + qui.join(', '));
  return t.join(' \u00b7 ');
}

/* La ficha de la receta, con las cantidades de ESE dia: los que comen ese plato
   ese dia, no una racion suelta. Carlos (5-nov): «desde cada plato se debe
   acceder a la receta o hay que poner un boton Cocinar». En su app son la misma
   cosa: Cocinar abre esta ficha y te deja en la elaboracion. */
function fichaReceta(id, fecha, toma) {
  var r = POR_ID[id]; if (!r) return null;
  var base = r.raciones || 1, comen = 0, factor = 1;
  if (MOTOR && fecha && toma) {
    try {
      sincronizar([fecha]);
      comen = A.comensales(fecha, toma) || 0;
      if (comen) comen = A.comensalesDePlato(r, comen, fecha, toma) || comen;
      if (comen && !r.tanda) factor = comen / base;
    } catch (e) { comen = 0; factor = 1; }
  }
  var n = { k: 0, p: 0, g: 0, h: 0 }, sal = 0;
  try { n = A.nutrReceta(r) || n; sal = A.salReceta(r) || 0; } catch (e) {}
  var ing = (r.ing || []).map(function (l) {
    var gi = null;
    try { gi = A.ingrediente(l.i); } catch (e) {}
    var linea = factor !== 1 ? { i: l.i, c: l.c * factor, uso: l.uso } : l;
    var gr = 0;
    try { gr = A.gramosDeLinea(linea) || 0; } catch (e) {}
    var cant = '';
    try { cant = Util.cantidadReceta(linea.c, gi ? gi.u : 'g', gi ? gi.pesoUd : 0); } catch (e) { cant = String(linea.c); }
    return { n: gi ? gi.n : l.i, cant: cant, kcal: gi ? Math.round(gr / 100 * (gi.k || 0)) : 0,
             rallar: l.uso === 'rallar' };
  });
  return {
    id: id, n: r.n, min: r.min || 0, tools: r.tools || [], raciones: base,
    comen: comen, tanda: !!r.tanda, escalada: factor !== 1,
    kcal: Math.round(n.k), sal: sal, ing: ing,
    pasos: r.pasos || [], trucos: r.trucos || [], nota: r.nota || ''
  };
}

/* Vaciar el dia entero, con Deshacer mientras siga vacio. Su app lo tiene desde
   el 23-sep; aqui faltaba (solo habia Vaciar semana). Al vaciar se marca cada
   toma como vaciada, para que los fijos NO vuelvan solos: si has vaciado el dia
   es porque no quieres nada, tampoco el pan. */
function cuantosDelDia(f) {
  var d = dias()[f]; if (!d) return 0;
  var n = 0;
  TOMAS.forEach(function (tm) { n += (d[tm] || []).length; });
  n += (d.capricho || []).length;
  return n;
}
function vaciarDia(f) {
  var d = dia(f);
  var g = { capricho: (d.capricho || []).slice() }, n = 0;
  TOMAS.forEach(function (tm) { g[tm] = cajon(f, tm).slice(); });
  Object.keys(g).forEach(function (k) { n += g[k].length; });
  if (!n) return 0;
  d.guardadoVaciar = g;
  TOMAS.forEach(function (tm) {
    /* uno a uno, como si los quitara a mano: asi los grupos de la norma vuelven
       al panel y la semana se puede volver a planificar */
    cajon(f, tm).slice().forEach(function (id) { sacar(id, f, tm); });
    d[tm] = [];
    ponerFueraT(f, tm, false);
    marcarVaciadaT(f, tm, true);
  });
  d.capricho = [];
  guardar();
  return n;
}
function sePuedeDeshacer(f) {
  var d = dias()[f];
  return !!(d && d.guardadoVaciar && !cuantosDelDia(f));
}
function deshacerVaciar(f) {
  var d = dias()[f], g = d && d.guardadoVaciar;
  if (!g) return 0;
  var n = 0;
  TOMAS.forEach(function (tm) {
    var l = (g[tm] || []).slice();
    d[tm] = l;
    ponerFueraT(f, tm, false);
    marcarVaciadaT(f, tm, false);
    n += l.length;
    l.forEach(function (id) { quitarGrupoDe(id); });
  });
  d.capricho = (g.capricho || []).slice();
  n += d.capricho.length;
  delete d.guardadoVaciar;
  guardar();
  return n;
}

/* Borrar del recetario un «ingrediente solo» mal metido. Solo si no esta usado
   en ningun dia del plan ni es un fijo: borrar algo que ya comiste dejaria el
   dia cojo. Es la regla de su app (`recetaEnUso`). */
function sueltoBorrable(id) {
  var r = POR_ID[id];
  if (!r || r.grupo !== 'suelto') return false;
  if (esTosta(r)) return false;
  if (!MOTOR) return false;
  try { return !A.recetaEnUso(id); } catch (e) { return false; }
}
function borrarSuelto(id) {
  if (!sueltoBorrable(id)) return false;
  try {
    A.estado.recetas = A.estado.recetas.filter(function (r) { return r.id !== id; });
    /* en el sitio, no reasignando: `RECETAS` se exporta por referencia y quien la
       tenga cogida se quedaria con la lista vieja */
    for (var i = RECETAS.length - 1; i >= 0; i--) if (RECETAS[i].id === id) RECETAS.splice(i, 1);
    delete POR_ID[id];
    guardar();
    return true;
  } catch (e) { return false; }
}

function topeSal() {
  try { return (A.estado.config.limiteSal || 4.75); } catch (e) { return 4.75; }
}
function hayTopeSal(f) {
  if (!MOTOR) return true;
  try { return !!A.fichaTipoDia(f).topeSal; } catch (e) { return true; }
}
function deMochila(f, toma) {
  if (!MOTOR) return false;
  try { return (A.fichaTipoDia(f).mochila || []).indexOf(toma) >= 0; } catch (e) { return false; }
}
function ponerActividad(fecha, a, min) {
  var d = dia(fecha);
  if (!d.actividad) d.actividad = [];
  d.actividad.push({ a: a, min: Number(min) || 0, ref: 'apuntado' });
  guardar();
}
function quitarActividad(fecha, i) {
  var d = dia(fecha);
  if (d.actividad) { d.actividad.splice(i, 1); if (!d.actividad.length) delete d.actividad; guardar(); }
}
function entrenoEstandar(fecha) {
  var c = (MOTOR && A.estado.config.entrenoEstandar) || [];
  var d = dia(fecha);
  d.actividad = c.map(function (x) { return { a: x.a, min: x.min, ref: 'estandar' }; });
  guardar();
}
function sinMarcar(fecha) {
  if (!MOTOR) return 0;
  sincronizar([fecha]);
  try { return A.sinMarcar(fecha) || 0; } catch (e) { return 0; }
}
/* Cierra el día con la propia función de la app: marca lo que falta, descuenta
   de la despensa y deja los números fijos. */
function cerrarDia(fecha) {
  if (!MOTOR) return null;
  sincronizar([fecha]);
  var pend = 0, hechos = 0;
  try { pend = A.sinMarcar(fecha) || 0; hechos = A.cerrarDia(fecha) || 0; } catch (e) { return null; }
  var d = dia(fecha);
  d.comido = JSON.parse(JSON.stringify((A.estado.comido && A.estado.comido[fecha]) || {}));
  d.cerrado = true;
  guardar();
  return { pend: pend, hechos: hechos };
}
/* ---- lecturas que vienen enteras de su app ---- */
function cuotaToma(f, tm) {
  if (!MOTOR) return 0;
  sincronizar([f]);
  try { var q = A.cuotaTomas(f); return Math.round(q[tm] || 0); } catch (e) { return 0; }
}
function objetivosMacros(f) {
  if (!MOTOR) return null;
  sincronizar([f]);
  try { return A.objetivosMacros(f); } catch (e) { return null; }
}
function nutrPlato(f, tm, id) {
  if (!MOTOR) return null;
  try {
    var n = A.nutrEn(f, id);
    if (!n) return null;
    var fac = A.factorPlato ? A.factorPlato(f, tm, id, 1) : 1;
    var r = POR_ID[id], sal = 0;
    try { sal = A.salReceta(r) * fac; } catch (e) { sal = 0; }
    return { k: (n.k || 0) * fac, p: (n.p || 0) * fac, g: (n.g || 0) * fac,
             h: (n.h || 0) * fac, sal: sal };
  } catch (e) { return null; }
}
/* La media de la semana y su valoración, con las mismas reglas de su app. */
function mediaSemana(lunes) {
  if (!MOTOR) return null;
  var fechas = fechasDe(lunes);
  sincronizar(fechas);
  try {
    var res = A.resumenSemana(lunes);
    if (!res || !res.dias) return null;
    var o = { k: 0, p: 0, g: 0, h: 0, sal: 0 }, n = 0;
    fechas.forEach(function (f) {
      var d = A.estado.plan[f]; if (!d) return;
      var algo = false;
      TOMAS.forEach(function (x) { if ((d[x] || []).length) algo = true; });
      if (!algo) return;
      var m = A.objetivosMacros(f);
      o.k += m.k; o.p += m.p; o.g += m.g; o.h += m.h; o.sal = m.sal; n++;
    });
    if (!n) return null;
    o.k /= n; o.p /= n; o.g /= n; o.h /= n;
    var ck = A.semaforoKcal(res.k, o.k);
    var cp = res.p >= o.p ? 'verde' : (res.p >= o.p * 0.85 ? 'ambar' : 'rojo');
    var pg = res.k ? res.g * 9 / res.k * 100 : 0;
    var pgo = o.k ? o.g * 9 / o.k * 100 : 30, dg = pg - pgo;
    var cg = Math.abs(dg) <= 5 ? 'verde' : (Math.abs(dg) <= 10 ? 'ambar' : 'rojo');
    var rh = o.h ? res.h / o.h : 1;
    var ch = Math.abs(rh - 1) <= 0.15 ? 'verde' : (Math.abs(rh - 1) <= 0.30 ? 'ambar' : 'rojo');
    var cs = A.semaforo(res.sal); if (cs === 'libre') cs = 'verde';
    return { dias: res.dias, k: res.k, p: res.p, g: res.g, h: res.h, sal: res.sal,
      obj: o, pg: pg, pgo: pgo,
      piezas: [
        { n: 'Calorías', v: milP(res.k) + ' kcal de ' + milP(o.k) + ' kcal', c: ck,
          d: ck === 'verde' ? 'en su sitio' : (ck === 'rojo' ? 'por encima' : 'muy por debajo') },
        { n: 'Proteína', v: Math.round(res.p) + ' de ' + Math.round(o.p) + ' g', c: cp,
          d: cp === 'verde' ? 'cumple' : 'corta' },
        { n: 'Grasa', v: Math.round(pg) + ' % de ' + Math.round(pgo) + ' %', c: cg,
          d: cg === 'verde' ? 'en su sitio' : (dg > 0 ? 'por encima' : 'por debajo') },
        { n: 'Hidratos', v: Math.round(res.h) + ' de ' + Math.round(o.h) + ' g', c: ch,
          d: ch === 'verde' ? 'en su sitio' : (rh > 1 ? 'por encima' : 'por debajo') },
        { n: 'Sal', v: coma(res.sal) + ' g (aviso en ' + coma(o.sal) + ' g)', c: cs,
          d: cs === 'rojo' ? 'por encima del tope' : (cs === 'ambar' ? 'por encima del aviso' : 'bien') }
      ] };
  } catch (e) { return null; }
}
function milP(n) { var k = Math.round(n || 0); return String(k).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function coma(n) { return String(Math.round((n || 0) * 100) / 100).replace('.', ','); }
function estaCerrado(fecha) { var d = dias()[fecha]; return !!(d && d.cerrado); }
function abrirDia(fecha) {
  var d = dia(fecha);
  delete d.cerrado;
  /* LA MARCA DE CORREGIDO A MANO, como en su app. No es un adorno: si un día
     pasado no cuadra con lo que recuerdas, saber que lo tocaste —y cuándo— es
     la diferencia entre un dato y una sospecha. */
  if (fecha < HOY) d.corregido = HOY;
  guardar();
}
function corregidoEl(fecha) { var d = dias()[fecha]; return (d && d.corregido) || null; }
/* REPARAR LOS GRUPOS GUARDADOS AL ABRIR (5-nov-2026).
   El fallo de `devolver` dejaba grupos de más y de tipos que la norma no pide
   —Carlos vio «quedan 9 de 7», con ensalada y huevos entre las comidas—. Arreglar
   la función no arregla lo que ya estaba guardado en el navegador, así que al
   abrir se pasa el cepillo: se recorren los grupos en su orden y se queda solo
   con los que la norma todavía admite. Nunca añade: una fila con menos grupos de
   los que pide la norma es normal, significa que esos huecos ya están colocados. */
/* Cuantos huecos de la norma ya has colocado tu mismo en la semana a
   planificar. Las guarniciones no gastan hueco: la norma habla de principales. */
/* Un fijo no es un plato de la norma: el pan de la comida no ocupa el hueco del
   pescado. Desde que el plan trae los fijos materializados hay que descontarlos. */
function esFijoId(id) {
  if (!MOTOR) return false;
  return ((A.estado.config && A.estado.config.fijos) || []).some(function (f) { return f && f.r === id; });
}
function colocadosEn(fila) {
  var n = 0;
  fechasDe(masDias(E.lunes, 14)).forEach(function (f) {
    var d = dias()[f];
    if (!d || !d[fila]) return;
    (d[fila] || []).forEach(function (id) {
      var r = POR_ID[id];
      if (r && !esGuar(r) && !esFijoId(id)) n++;
    });
  });
  return n;
}
function topeFila(fila) {
  return (NORMAS[fila] || []).filter(function (x) { return x !== 'fuera'; }).length;
}
/* Un grupo nuevo para un hueco: las tres mejores fichas de la despensa que
   cuadren con el tipo y no esten ya usadas ni propuestas. */
function grupoNuevo(fila, tipo, ya) {
  if (!TIPOS[tipo]) return null;
  var cands = RECETAS.filter(function (r) {
    return valeCC(r) && TIPOS[tipo](r) && !ya[r.id];
  }).map(function (r) { return r.id; });
  cands.sort(cmpStock);
  var tres = cands.slice(0, 3);
  if (!tres.length) return null;
  tres.forEach(function (id) { ya[id] = true; });
  return { id: fila + '-r-' + tipo + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000), fila: fila, tipo: tipo, op: tres };
}
/* El cepillo de arranque. Antes solo quitaba los grupos que no cuadraban con
   la norma, y por eso Carlos veia «quedan 4 de 7» con la semana vacia: los
   huecos que se perdieron no volvian solos. Ahora tambien los repuebla, de modo
   que al abrir siempre hay tantos grupos como huecos te queden por colocar. */
function sanearGrupos() {
  if (!E) return 0;
  if (!PL().grupos) PL().grupos = [];
  var fuera = 0, out = [], cupo = {};
  ['comida', 'cena'].forEach(function (fila) {
    cupo[fila] = (NORMAS[fila] || []).filter(function (x) { return x !== 'fuera'; }).slice();
  });
  PL().grupos.forEach(function (g) {
    var c = cupo[g.fila];
    if (!c || !g.op || !g.op.length) { fuera++; return; }
    var i = c.indexOf(g.tipo);
    if (i < 0) { fuera++; return; }
    c.splice(i, 1);
    out.push(g);
  });
  PL().grupos = out;
  var puestos = 0;
  var ya = usadas();
  PL().grupos.forEach(function (g) { g.op.forEach(function (id) { ya[id] = true; }); });
  ['comida', 'cena'].forEach(function (fila) {
    var faltan = topeFila(fila) - colocadosEn(fila) - gruposDe(fila).length;
    var libres = huecosLibres(fila);
    for (var i = 0; i < libres.length && faltan > 0; i++) {
      var g = grupoNuevo(fila, libres[i], ya);
      if (!g) continue;
      PL().grupos.push(g);
      puestos++;
      faltan--;
    }
  });
  if (fuera || puestos) guardar();
  return fuera + puestos;
}
function arrancar() {
  arrancarMotor();
  var x = cargar();
  if (x) {
    E = x;
    delete E.grupos; delete E.bandejas; delete E.origen;   /* ahora viven en el estado */
    if (!E.fijos) E.fijos = fijosNuevos();
    /* una sola vez: la tabla de fijos pasa a salir de tu config, no de la lista
       escrita a mano. Lo que cambies despues en el prototipo se respeta. */
    if (MOTOR && !E.fijosDeConfig) {
      var dc = fijosDeConfig();
      if (dc) { E.fijos = dc; E.fijosDeConfig = true; }
    }
    if (!E.solo) E.solo = soloNuevo();
    if (!E.abierto) E.abierto = abiertoNuevo();
    if (MOTOR && !PL().grupos.length && !Object.keys(PL().bandejas).length) PL().grupos = proponer();
  } else { nuevo(); }
  sanearGrupos();
  return E;
}
/* ====================== HERRAMIENTAS DE SEMANA ======================
   Las cinco de la pestaña Menú vieja que faltaban. Carlos, 5-nov: «el de vaciar
   semana iría en Planificar».
   Una diferencia obligada con su app: allí los botones actúan sobre LA semana
   que estás viendo, porque solo se ve una. Aquí se ven tres a la vez, así que
   los que tocan una semana viven en la cabecera de SU semana, y arriba quedan
   solo los dos que miran el plan entero. */

/* Lo medido no se borra nunca: una actividad del reloj es lo que hiciste de
   verdad. Las que puso el planificador (apuntado, estandar, ruta) sí. */
function esMedida(a) { return !!a && (a.ref === 'reloj' || a.ref === 'medida'); }

function vaciarSemana(lunes) {
  var b = { tomas: 0, pasados: 0, medidas: 0, sueltos: 0 };
  fechasDe(lunes).forEach(function (f) {
    var d = dias()[f];
    if (f < HOY) { if (d && cuantosPlatos(f)) b.pasados++; return; }
    if (!d) return;
    ['comida', 'cena'].forEach(function (tm) {
      if (!d[tm]) return;
      if ((d[tm] || []).length || esFueraT(f, tm)) b.tomas++;
      /* se sacan uno a uno, como si los quitara a mano: así los grupos de la
         norma vuelven al panel y la semana se puede volver a planificar. */
      (d[tm] || []).slice().forEach(function (id) { sacar(id, f, tm); });
      d[tm] = [];
      ponerFueraT(f, tm, false);
      marcarVaciadaT(f, tm, false);
    });
    if (d.actividad) {
      var quedan = d.actividad.filter(esMedida);
      b.medidas += quedan.length;
      if (quedan.length) d.actividad = quedan; else delete d.actividad;
    }
    delete d.tipo; delete d.ruta; delete d.quien; delete d.comensales;
  });
  /* lo que `sacar` haya mandado a la bandeja de esta semana se va con ella */
  b.sueltos = bandeja(lunes).length;
  PL().bandejas[lunes] = [];
  guardar();
  return b;
}

function plantillas() { if (!E.plantillas) E.plantillas = []; return E.plantillas; }
function platosDePlantilla(p) {
  var n = 0;
  (p.dias || []).forEach(function (d) { n += (d.comida || []).length + (d.cena || []).length; });
  return n;
}
function guardarPlantilla(lunes, nombre, idSustituir) {
  var dias = fechasDe(lunes).map(function (f) {
    var d = dias()[f] || vacio(f);
    return { comida: (d.comida || []).slice(),
             cena: (d.cena || []).slice(),
             fueraC: esFueraT(f, 'comida'), fueraN: esFueraT(f, 'cena') };
  });
  var lis = plantillas();
  if (idSustituir) {
    var v = lis.filter(function (x) { return x.id === idSustituir; })[0];
    if (v) { v.dias = dias; v.cuando = HOY; guardar(); return v; }
  }
  var p = { id: 'pl' + Date.now(), nombre: nombre || 'Plantilla', dias: dias, cuando: HOY };
  lis.push(p); guardar(); return p;
}
/* SOLO RELLENA HUECOS, y de hoy en adelante. Lo que ya está puesto no se pisa:
   es la regla de su app, y la que evita que una plantilla borre una semana
   buena por un botón mal pulsado. */
function aplicarPlantilla(lunes, id) {
  var p = plantillas().filter(function (x) { return x.id === id; })[0];
  var r = { tomas: 0, pasados: 0, perdidas: 0 };
  if (!p) return r;
  fechasDe(lunes).forEach(function (f, i) {
    var src = p.dias[i] || {};
    if (f < HOY) { if ((src.comida || []).length || (src.cena || []).length) r.pasados++; return; }
    var d = dia(f);
    [['comida', 'fueraC'], ['cena', 'fueraN']].forEach(function (x) {
      var tm = x[0];
      if ((d[tm] || []).length || esFueraT(f, tm)) return;
      if (src[x[1]]) { ponerFueraT(f, tm, true); r.tomas++; return; }
      var ids = (src[tm] || []).filter(function (q) { return vivaFicha(POR_ID[q]); });
      r.perdidas += ((src[tm] || []).length - ids.length);
      if (!ids.length) return;
      ids.forEach(function (q, k) { colocar(q, f, tm, k); });
      r.tomas++;
    });
  });
  guardar();
  return r;
}
function borrarPlantilla(id) {
  E.plantillas = plantillas().filter(function (x) { return x.id !== id; }); guardar();
}
function renombrarPlantilla(id, n) {
  var p = plantillas().filter(function (x) { return x.id === id; })[0];
  if (p) { p.nombre = n; guardar(); }
}

/* De hoy en adelante, los principales de comida y cena que no están marcados
   como comidos. Las guarniciones no cuentan, igual que en su app. */
function platosPendientes(dias) {
  var out = [];
  for (var i = 0; i < (dias || 21); i++) {
    (function (f) {
      var d = dias()[f];
      if (!d) return;
      ['comida', 'cena'].forEach(function (tm) {
        if (!d[tm] || esFueraT(f, tm)) return;
        (d[tm] || []).forEach(function (id) {
          var r = POR_ID[id];
          if (!r || esGuar(r)) return;
          if (estaComido(f, tm, id)) return;
          out.push({ f: f, toma: tm, n: nombreVivo(id) });
        });
      });
    })(masDias(HOY, i));
  }
  return out;
}

/* Las tres semanas que maneja el prototipo. Sincronizar TODO el plan tocaria
   tambien los dias pasados que vienen de su copia, y eso no es cosa nuestra. */
function fechasProto() {
  var o = [];
  semanas().forEach(function (s) { o = o.concat(fechasDe(s.f)); });
  return o;
}
function sincronizarTodo() { if (MOTOR) sincronizar(fechasProto()); }
/* No es una cuenta nueva: es `Almacen.loQuePuedesGastar`, la misma del selector
   de platos —stock menos TODO lo que el plan tiene prometido de hoy en
   adelante—, suelta para poder mirarla sin abrir un día. Primero se vuelca el
   plan entero al motor, o contaría contra un plan a medias. */
function recetasDisponibles() {
  if (!MOTOR) return null;
  try {
    sincronizarTodo();
    var t = A.loQuePuedesGastar('cena') || {};
    var orden = function (l) {
      return (l || []).slice().sort(function (a, b) { return (b.fresco || 0) - (a.fresco || 0); });
    };
    return { enteras: orden(t.enteras), casi: orden(t.casi) };
  } catch (e) { return null; }
}
function salDeReceta(id) {
  if (!MOTOR) return null;
  try { var r = A.receta(id); return r ? A.salReceta(r) : null; } catch (e) { return null; }
}

var API = { grupos: function () { return PL().grupos; }, topeSal: topeSal, topeFila: topeFila, NORMAS: NORMAS,
  pendientes: pendientes, reprogramarPendiente: reprogramarPendiente,
  pendienteComido: pendienteComido, pendienteFuera: pendienteFuera,
  vaciarPendientes: vaciarPendientes, huecoGuar: huecoGuar, ajusteGuar: ajusteGuar,
  reajuste: reajuste, fichaReceta: fichaReceta, esFueraT: esFueraT, dias: dias,
  esBebida: esBebida, papelDe: papelDe, vivaFicha: vivaFicha, esTosta: esTosta, propios: propios, ponerPropios: ponerPropios, sacarDeBandejas: sacarDeBandejas,
  vaciarDia: vaciarDia, deshacerVaciar: deshacerVaciar, sePuedeDeshacer: sePuedeDeshacer,
  cuantosDelDia: cuantosDelDia, sueltoBorrable: sueltoBorrable, borrarSuelto: borrarSuelto, E: function () { return E; }, nuevo: nuevo, cargar: cargar, arrancar: arrancar, colocar: colocar,
                 quitar: quitar, estadoDe: estadoDe, proponer: proponer, guarniciones: guarniciones,
                 semanas: semanas, fechasDe: fechasDe, nombre: nombre, dia: dia, guardar: guardar,
                 marcarFuera: marcarFuera, bandeja: bandeja, aBandeja: aBandeja,
                 TOMAS: TOMAS, PAPELES: PAPELES, ETIQ_PAPEL: ETIQ_PAPEL, nombreDe: nombreDe, ponerFijo: ponerFijo,
                 verFijo: verFijo, candidatos: candidatos, fechaCorta: fechaCorta, ING: ING,
                 fijoDelDia: fijoDelDia, cambiarFijoDia: cambiarFijoDia, soltarFijoDia: soltarFijoDia,
                 tocadoHoy: tocadoHoy, cuantosPlatos: cuantosPlatos, masDias: masDias, MESES: MESES,
                 tipoDia: tipoDia, ponerTipoDia: ponerTipoDia, tiposDia: tiposDia,
                 deportesRuta: deportesRuta, planearRuta: planearRuta, quitarRuta: quitarRuta,
                 fichaRuta: fichaRuta, hayTopeSal: hayTopeSal, deMochila: deMochila,
                 caprichosDe: caprichosDe, anadirCapricho: anadirCapricho, quitarCapricho: quitarCapricho,
                 caprichosDespensa: caprichosDespensa, caprichoDeDespensa: caprichoDeDespensa,
                 caprichoAMano: caprichoAMano, caprichosVistos: caprichosVistos, nombreVivo: nombreVivo,
                 hayReal: hayReal, quienDe: quienDe, ponerQuien: ponerQuien, QUIEN: QUIEN, ETIQ_QUIEN: ETIQ_QUIEN,
                 sanearGrupos: sanearGrupos,
                 platosDe: platosDe, quitadosDe: quitadosDe, anadirA: anadirA,
                 bloquesDe: bloquesDe, fichasRestaurante: fichasRestaurante,
                 estimacionFuera: estimacionFuera, kcalFicha: kcalFicha, quitarPlato: quitarPlato, cuotaToma: cuotaToma,
                 objetivosMacros: objetivosMacros, nutrPlato: nutrPlato, mediaSemana: mediaSemana,
                 lunesDeISO: function (f) { return lunesDe(new Date(f + 'T12:00:00')); },
                 pax: pax, ponerPax: ponerPax, pautaSolo: pautaSolo, diaSemana: diaSemana, abiertoNuevo: abiertoNuevo,
                 racionDe: racionDe, unidadTexto: unidadTexto, realDe: realDe, ponerReal: ponerReal,
                 numerosDia: numerosDia, numerosSemana: numerosSemana, hayMotor: function () { return MOTOR; },
                 ejercicioDia: ejercicioDia, catalogoActividades: catalogoActividades, ponerActividad: ponerActividad,
                 cadenaObjetivo: cadenaObjetivo, entrenoDelDia: entrenoDelDia, confirmarActividad: confirmarActividad,
                 comensales: comensales, kcalToma: kcalToma, salToma: salToma,
                 quitarActividad: quitarActividad, entrenoEstandar: entrenoEstandar, sinMarcar: sinMarcar,
                 cerrarDia: cerrarDia, estaCerrado: estaCerrado, abrirDia: abrirDia,
                 estaComido: estaComido, marcarComido: marcarComido, unidades: unidades, paso: paso, cualSemana: cualSemana, tirar: tirar, POR_ID: POR_ID, RECETAS: RECETAS, esGuar: esGuar,
                 valeCC: valeCC, TIPOS: TIPOS, ETIQ: ETIQ, HOY: HOY, DIAS: DIAS, diaNum: diaNum,
                 mesDe: mesDe,
                 corregidoEl: corregidoEl, vaciarSemana: vaciarSemana, plantillas: plantillas, platosDePlantilla: platosDePlantilla,
                 guardarPlantilla: guardarPlantilla, aplicarPlantilla: aplicarPlantilla,
                 borrarPlantilla: borrarPlantilla, renombrarPlantilla: renombrarPlantilla,
                 platosPendientes: platosPendientes, recetasDisponibles: recetasDisponibles,
                 salDeReceta: salDeReceta, sincronizarTodo: sincronizarTodo };


var P = API;
var $ = function (s) { return document.querySelector(s); };
function el(t, c, h) { var x = document.createElement(t); if (c) x.className = c; if (h != null) x.innerHTML = h; return x; }
/* Los nombres de receta se meten dentro de HTML en varios sitios; sin escapar,
   un «&» o un «<» en un nombre rompería la ficha. Lo mismo que hace su app. */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
var GRIP = '<svg class="gr" width="9" height="12" viewBox="0 0 12 16" aria-hidden="true"><g fill="#b9c4bf">' +
  '<circle cx="3" cy="4" r="1.3"/><circle cx="9" cy="4" r="1.3"/><circle cx="3" cy="8" r="1.3"/>' +
  '<circle cx="9" cy="8" r="1.3"/><circle cx="3" cy="12" r="1.3"/><circle cx="9" cy="12" r="1.3"/></g></svg>';
var EQUIS = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var PUERTA = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>';
var MAS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var CAMBIO = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h12M13 4l3 3-3 3M20 17H8M11 14l-3 3 3 3"/></svg>';

var LAPIZ = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
var VOLVER = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
var LUPA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#46564f" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>';
var CASA = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/></svg>';
var BOTA = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v8.5c0 1 .4 2 1.2 2.7L12 17.5c.8.7 1.9 1.1 3 1.1h5V21H4v-4"/><path d="M7 7h3"/><path d="M4 17h16"/></svg>';
var CHEV = '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
var sel = null;       /* ficha seleccionada por clic */
var arr = null;       /* arrastre en curso */

/* ---------- panel de fichas ---------- */
function pintarPanel() {
  var E = P.E(), p = $('#panel');
  p.innerHTML = '';
  var cab = el('div', 'cabsec');
  var s = P.semanas()[2], f = P.fechasDe(s.f);
  cab.innerHTML = '<h2>Fichas propuestas</h2><span class="sub">semana del ' + P.diaNum(f[0]) + ' al ' +
    P.diaNum(f[6]) + ' de ' + P.mesDe(f[6]) + ' · tres opciones por hueco: bajas una y el grupo entero desaparece</span>';
  var der = el('div', 'der');
  der.innerHTML = '<span class="leyenda"><span class="pt casa"></span> está todo en casa</span>' +
    '<span class="leyenda"><span class="pt falta"></span> falta poco (1 o 2)</span>' +
    '<span class="leyenda"><span class="pt comprar"></span> hay que comprar (3 o más)</span>';
  var b = el('button', 'btnv', 'Proponer otra vez');
  b.onclick = function () { P.E().grupos = P.proponer(); P.guardar(); pintar(); };
  der.appendChild(b); cab.appendChild(der); p.appendChild(cab);

  p.appendChild(filaGrupos('PRINCIPALES COMIDAS', 'comida'));
  p.appendChild(filaGuarniciones());
  p.appendChild(filaGrupos('PRINCIPALES CENAS', 'cena'));
}
/* Cada fila del panel se pliega por su cuenta, para que quepa debajo la semana
   que se está planificando (Carlos, 5-nov). El estado se guarda. */
function abiertoPanel(k) {
  var E = P.E();
  if (!E.abiertoP) E.abiertoP = { comida: true, guar: true, cena: true };
  if (typeof E.abiertoP[k] !== 'boolean') E.abiertoP[k] = true;
  return E.abiertoP[k];
}
function plegarFila(k) {
  var E = P.E();
  abiertoPanel(k);
  E.abiertoP[k] = !E.abiertoP[k];
  P.guardar(); pintar();
}
function etiquetaFila(f, k, etiqueta, resumen) {
  var ab = abiertoPanel(k);
  var et = el('div', 'et' + (ab ? '' : ' cerrada'));
  et.innerHTML = '<b>' + etiqueta + '</b><span>' + resumen + '</span>';
  var b = el('button', 'plegarf' + (ab ? '' : ' cerrado'));
  b.innerHTML = CHEV;
  b.title = ab ? 'Plegar esta fila' : 'Desplegar esta fila';
  b.setAttribute('aria-label', (ab ? 'Plegar ' : 'Desplegar ') + etiqueta);
  b.setAttribute('aria-expanded', ab ? 'true' : 'false');
  b.onclick = function (ev) { ev.stopPropagation(); plegarFila(k); };
  et.appendChild(b);
  et.style.cursor = 'pointer';
  et.onclick = function () { plegarFila(k); };
  f.appendChild(et);
  return ab;
}
function filaGrupos(etiqueta, fila) {
  var E = P.E();
  var gs = P.grupos().filter(function (g) { return g.fila === fila; });
  var total = NORMASLEN(fila);
  var f = el('div', 'fila');
  var ab = etiquetaFila(f, fila, etiqueta, 'quedan ' + gs.length + ' de ' + total);
  if (!ab) return f;
  var c = el('div', 'cont');
  if (!gs.length) c.appendChild(el('div', 'vacio', 'Todos los huecos de la norma están colocados.'));
  gs.forEach(function (g) { c.appendChild(cajaGrupo(g)); });
  f.appendChild(c);
  return f;
}
/* Sale de la norma, no de un número escrito a mano: si cambia la norma, cambia
   el contador. */
function NORMASLEN(fila) { return P.topeFila(fila); }
function cajaGrupo(g) {
  var d = el('div', 'grupo');
  d.appendChild(el('div', 'gt', P.ETIQ[g.tipo] || g.tipo.toUpperCase()));
  g.op.forEach(function (id) {
    var e = P.estadoDe(id);
    var o = el('div', 'op');
    o.innerHTML = GRIP + '<div style="flex:1;min-width:0"><div class="n">' + P.nombre(id) + '</div>' +
      (e.txt ? '<div class="f ' + e.cl + '" title="' + e.txt + '">' + e.txt + '</div>' : '') +
      '</div><span class="pt ' + e.cl + '" style="margin-top:4px"></span>';
    o.dataset.receta = id;
    agarrar(o, id);
    d.appendChild(o);
  });
  return d;
}
function filaGuarniciones() {
  var f = el('div', 'fila');
  var gs0 = P.guarniciones();
  var ab = etiquetaFila(f, 'guar', 'GUARNICIONES', gs0.length + ' sueltas, sin hueco fijo');
  if (!ab) return f;
  var c = el('div', 'cont');
  var gs = gs0;
  gs.slice(0, 6).forEach(function (id) {
    var e = P.estadoDe(id);
    var o = el('div', 'suelta');
    o.innerHTML = GRIP + '<div style="flex:1;min-width:0"><div class="n">' + P.nombre(id) + '</div>' +
      (e.txt ? '<div class="f ' + e.cl + '" title="' + e.txt + '">' + e.txt + '</div>' : '') +
      '</div><span class="pt ' + e.cl + '" style="margin-top:4px"></span>';
    agarrar(o, id);
    c.appendChild(o);
  });
  var v = el('button', 'verm', 'Ver las ' + gs.length);
  v.onclick = function () { abrirCatalogo(null, null, 0, 'guarnicion'); };
  c.appendChild(v);
  f.appendChild(c);
  return f;
}

/* bloque de ejercicio del día */
function tarjetaEjercicio(f) {
  var e = P.ejercicioDia(f);
  var lista = P.entrenoDelDia(f);
  var c = el('div', 'toma ejer');
  var cab = el('div', 'cabt');
  cab.innerHTML = '<b>ENTRENO DEL DÍA</b>';
  var der = el('div', 'der');
  if (!lista.length) {
    var be = el('button', 'btng', 'Estándar');
    be.title = 'Poner el entreno estándar';
    be.onclick = function () { P.entrenoEstandar(f); pintarDia(); };
    der.appendChild(be);
  }
  var ba = el('button', 'btng', '+');
  ba.setAttribute('aria-label', 'Apuntar actividad');
  ba.onclick = function () { abrirActividad(f); };
  der.appendChild(ba);
  cab.appendChild(der);
  c.appendChild(cab);

  if (!lista.length) {
    c.appendChild(el('div', 'peque', 'Sin entreno previsto'));
  } else {
    lista.forEach(function (a) {
      var fuera = a.tapada || a.caducada;
      var l = el('div', 'act2' + (fuera ? ' no-cuenta' : ''));
      var et = '';
      if (a.clase === 'real') et += '<span class="eti">reloj</span>';
      if (!a.x && a.clase === 'previsto' && !a.tapada && !a.caducada) et += '<span class="eti">del plan</span>';
      if (a.x && a.x.ref === 'estandar' && !a.x.confirmada && !a.tapada && !a.caducada) et += '<span class="eti">del plan</span>';
      if (a.tapada) et += '<span class="eti">sustituida por lo real</span>';
      if (a.caducada) et += '<span class="eti">no se hizo</span>';
      if (a.x && a.x.confirmada) et += '<span class="eti ok">hecha, confirmada por ti</span>';
      l.innerHTML = '<div class="arr"><span class="nom">' + a.n + '</span>' + et + '</div>' +
        '<div class="abj"><b>' + a.min + '</b> min · ' + Math.round(a.kcal) + ' kcal</div>';
      var acc = el('div', 'acc');
      if (a.x && (a.x.ref === 'estandar' || a.x.ref === 'ruta') && !a.tapada && f <= P.HOY) {
        var bh = el('button', 'btng' + (a.x.confirmada ? '' : ' uno'), a.x.confirmada ? 'Deshacer' : 'La hice');
        bh.onclick = function () { P.confirmarActividad(f, a.idx, !a.x.confirmada); pintarDia(); };
        acc.appendChild(bh);
      }
      if (a.x) {
        var x = el('button', 'mini', EQUIS);
        x.setAttribute('aria-label', 'Quitar ' + a.n);
        x.onclick = function () { P.quitarActividad(f, a.idx); pintarDia(); };
        acc.appendChild(x);
      }
      l.appendChild(acc);
      c.appendChild(l);
    });
  }
  if (e) {
    var pie = el('div', 'ejer-pie');
    pie.innerHTML = 'Al objetivo suben <b>' + e.suben + ' kcal</b>' +
      (e.partes.length ? ': ' + e.partes.join(' · ') : '') +
      (e.caducado ? '<br><span class="peque">' + e.caducado + ' kcal que el plan preveía y no llegaron a hacerse: ese día no cuentan.</span>' : '');
    c.appendChild(pie);
  }
  return c;
}
function tarjetaCaprichos(f) {
  var c = el('div', 'toma');
  var cerrado = P.estaCerrado(f);
  var lista = P.caprichosDe(f);
  var cab = el('div', 'cabt');
  var kc = 0;
  lista.forEach(function (id) { var n = P.nutrPlato(f, 'capricho', id); if (n) kc += n.k; });
  cab.innerHTML = '<b>CAPRICHOS</b>' + (kc ? '<span class="ktoma">' + mil(kc) + ' kcal</span>' : '') +
    '<span class="peque">fuera del plan: el helado, la caña, la pizza del congelador</span>';
  if (!cerrado) {
    var der = el('div', 'der');
    var b = el('button', 'btng', MAS);
    b.setAttribute('aria-label', 'Apuntar un capricho'); b.title = 'Apuntar un capricho';
    b.onclick = function () { abrirCaprichos(f); };
    der.appendChild(b);
    cab.appendChild(der);
  }
  c.appendChild(cab);
  if (!lista.length) {
    c.appendChild(el('div', 'ss-nada', '<span>Nada fuera de plan</span>'));
    return c;
  }
  lista.forEach(function (id, idx) {
    var nu = P.nutrPlato(f, 'capricho', id);
    var pl = el('div', 'plato');
    pl.appendChild(el('span', 'tic hueco'));
    var izq = el('div', 'pl-izq');
    izq.appendChild(el('div', 'n', P.nombreVivo(id)));
    if (nu && (nu.p || nu.g || nu.h)) {
      izq.appendChild(el('div', 'pl-pie', '<span class="nutri">P ' + Math.round(nu.p) +
        ' · G ' + Math.round(nu.g) + ' · H ' + Math.round(nu.h) + ' g</span>'));
    }
    pl.appendChild(izq);
    pl.appendChild(el('span', 'pl-kcal', nu ? mil(nu.k) + ' kcal' : ''));
    if (!cerrado) {
      var x = el('button', 'mini', EQUIS);
      x.setAttribute('aria-label', 'Quitar el capricho');
      x.onclick = function () { P.quitarCapricho(f, idx); pintarDia(); };
      pl.appendChild(x);
    }
    c.appendChild(pl);
  });
  return c;
}

/* El selector de caprichos: primero lo que tiene en casa de picar, luego lo que
   ya se apuntó otras veces, y al final escribirlo a mano. */
var cap = null;
function abrirCaprichos(f) { cap = { f: f, busca: '', modo: 'despensa' }; pintarCaprichos(); }
function pintarCaprichos() {
  var capa = $('#capa');
  if (!cap) { capa.innerHTML = ''; capa.className = ''; return; }
  capa.className = 'capa'; capa.innerHTML = '';
  var m = el('div', 'modal');
  m.appendChild(el('div', 'modcab', '<div style="flex:1"><div class="t">Apuntar un capricho</div>' +
    '<div class="s">Lo que te has comido fuera del plan el ' + P.diaNum(cap.f) + ' de ' + P.mesDe(cap.f) +
    '. Suma calorías; de la despensa sale solo lo que ya tenías en casa.</div></div>'));

  var fl = el('div', 'modfil');
  var bus = el('div', 'busca', LUPA);
  var inp = el('input'); inp.type = 'text'; inp.placeholder = 'helado, pizza, cerveza…'; inp.value = cap.busca;
  inp.oninput = function () { cap.busca = inp.value; listaCaprichos(); };
  bus.appendChild(inp); fl.appendChild(bus);
  var ch = el('div', 'chips');
  [['despensa', 'De tu despensa'], ['vistos', 'Ya apuntados antes'], ['mano', 'Escribirlo a mano']].forEach(function (x) {
    var b = el('button', 'chip' + (cap.modo === x[0] ? ' on' : ''), x[1]);
    b.onclick = function () { cap.modo = x[0]; pintarCaprichos(); };
    ch.appendChild(b);
  });
  fl.appendChild(ch);
  m.appendChild(fl);

  var lista = el('div', 'modlista'); lista.id = 'caplista'; m.appendChild(lista);
  m.appendChild(el('div', 'modpie', '<span>Un capricho no se planifica ni entra en la compra. ' +
    'Lo que coges de la despensa sí sale de ella.</span>'));
  var cerrar = el('button', 'mini', EQUIS);
  cerrar.style.cssText = 'width:34px;height:34px;border-radius:9px;position:absolute;right:26px;top:26px';
  cerrar.setAttribute('aria-label', 'Cerrar');
  cerrar.onclick = function () { cap = null; pintarCaprichos(); };
  m.style.position = 'relative'; m.appendChild(cerrar);
  capa.appendChild(m);
  capa.onclick = function (ev) { if (ev.target === capa) { cap = null; pintarCaprichos(); } };
  listaCaprichos();
  setTimeout(function () { if (cap && cap.modo !== 'mano') inp.focus(); }, 20);
}
function listaCaprichos() {
  var cont = document.getElementById('caplista'); if (!cont) return;
  cont.innerHTML = '';

  if (cap.modo === 'mano') {
    var caja = el('div', 'cap-mano');
    caja.innerHTML = '<p>Para lo que no tienes en casa: el helado de la heladería, la caña del bar, ' +
      'el postre de un restaurante. Se queda guardado, así que la próxima vez ya sale en la lista.</p>';
    var fila = el('div', 'cm-fila');
    var n = el('input'); n.type = 'text'; n.placeholder = 'qué te comiste'; n.className = 'cm-n';
    var k = el('input'); k.type = 'text'; k.placeholder = 'kcal'; k.className = 'cm-k';
    var ok = el('button', 'btnv', 'Apuntarlo');
    ok.onclick = function () {
      var kk = parseInt(String(k.value).replace(',', '.'), 10);
      if (!n.value.trim() || !(kk > 0)) { aviso2('Hace falta el nombre y las calorías.'); return; }
      var id = P.caprichoAMano(cap.f, n.value.trim(), kk);
      cap = null; pintarCaprichos(); pintarDia();
      aviso2(id ? 'Apuntado · ' + kk + ' kcal' : 'No he podido apuntarlo');
    };
    fila.appendChild(n); fila.appendChild(k); fila.appendChild(ok);
    caja.appendChild(fila);
    cont.appendChild(caja);
    setTimeout(function () { n.focus(); }, 20);
    return;
  }

  if (cap.modo === 'vistos') {
    var vs = P.caprichosVistos(cap.busca);
    if (!vs.length) { cont.appendChild(el('div', 'vacio', 'Todavía no has apuntado ningún capricho a mano.')); return; }
    vs.forEach(function (it) {
      var fi = el('div', 'rec');
      fi.innerHTML = '<div style="flex:1;min-width:0"><div class="n">' + it.n + '</div>' +
        '<div class="m">' + (it.k ? it.k + ' kcal' : 'sin calorías apuntadas') + '</div></div>';
      var b = el('button', 'btng', 'Apuntar');
      b.onclick = function () { P.anadirCapricho(cap.f, it.id); cap = null; pintarCaprichos(); pintarDia(); };
      fi.appendChild(b); cont.appendChild(fi);
    });
    return;
  }

  var ds = P.caprichosDespensa(cap.busca);
  if (!ds.length) { cont.appendChild(el('div', 'vacio', 'Nada de picar en la despensa con ese nombre.')); return; }
  var catAct = null;
  ds.forEach(function (it) {
    if (it.cat !== catAct) {
      catAct = it.cat;
      var g = el('div', 'gtit'); g.innerHTML = '<span>' + it.cat.toUpperCase() + '</span><i></i>';
      cont.appendChild(g);
    }
    var fi = el('div', 'rec');
    fi.innerHTML = '<div style="flex:1;min-width:0"><div class="n">' + it.n + '</div>' +
      '<div class="m">tienes ' + String(it.hay).replace('.', ',') + ' ' + it.u +
      (it.k100 ? ' · ' + it.k100 + ' kcal/100' + (it.u === 'ud' ? ' g' : ' ' + it.u) : '') + '</div></div>';
    var q = el('input'); q.type = 'text'; q.value = '1'; q.className = 'cm-q';
    q.setAttribute('aria-label', 'Cuánto, en ' + it.u);
    var u = el('span', 'cm-u', it.u);
    var b = el('button', 'btng', 'Apuntar');
    b.onclick = function () {
      var v = parseFloat(String(q.value).replace(',', '.'));
      if (!(v > 0)) { aviso2('Pon cuánto te has comido.'); return; }
      var id = P.caprichoDeDespensa(cap.f, it.id, v);
      cap = null; pintarCaprichos(); pintarDia();
      aviso2(id ? 'Apuntado y descontado de la despensa' : 'No he podido apuntarlo');
    };
    fi.appendChild(q); fi.appendChild(u); fi.appendChild(b);
    cont.appendChild(fi);
  });
}

var act = null;
function abrirActividad(f) { act = { fecha: f, busca: '' }; pintarActividad(); }
function pintarActividad() {
  var capa = $('#capa');
  if (!act) { capa.innerHTML = ''; capa.className = ''; return; }
  capa.className = 'capa'; capa.innerHTML = '';
  var m = el('div', 'modal'); m.style.maxWidth = '620px';
  m.appendChild(el('div', 'modcab', '<div style="flex:1"><div class="t">Apuntar actividad</div>' +
    '<div class="s">el ' + P.diaNum(act.fecha) + ' de ' + P.mesDe(act.fecha) + '</div></div>'));
  var lista = el('div', 'modlista');
  P.catalogoActividades().forEach(function (a) {
    var r = el('div', 'rec');
    r.innerHTML = '<div style="flex:1;min-width:0"><div class="n">' + a.n + '</div><div class="m">por defecto ' + a.min + ' min</div></div>';
    var inp = el('input'); inp.type = 'number'; inp.value = a.min; inp.min = '1';
    inp.style.cssText = 'width:72px;border:1px solid var(--borde);border-radius:9px;padding:7px 8px;font-size:13px';
    inp.setAttribute('aria-label', 'Minutos de ' + a.n);
    r.appendChild(inp);
    r.appendChild(el('span', '', 'min'));
    var b = el('button', 'btng', 'Apuntar');
    b.onclick = function () { P.ponerActividad(act.fecha, a.id, inp.value); act = null; pintarActividad(); pintarDia(); };
    r.appendChild(b);
    lista.appendChild(r);
  });
  m.appendChild(lista);
  var cerrar = el('button', 'mini', EQUIS);
  cerrar.style.cssText = 'width:34px;height:34px;border-radius:9px;position:absolute;right:26px;top:26px';
  cerrar.setAttribute('aria-label', 'Cerrar');
  cerrar.onclick = function () { act = null; pintarActividad(); };
  m.style.position = 'relative';
  m.appendChild(cerrar);
  capa.appendChild(m);
  capa.onclick = function (ev) { if (ev.target === capa) { act = null; pintarActividad(); } };
}

/* resumen de calorías, macros y sal, con los cálculos de la propia app */
function mil(n) { var k = Math.round(n || 0); return String(k).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function kcal(n) { return mil(n) + ' kcal'; }
function resumenDia(f) {
  var n = P.numerosDia(f);
  var c = el('div', 'resu');
  if (!n) { c.appendChild(el('div', 'tarjeta', 'No he podido cargar los cálculos de la app.')); return c; }

  var cfg = {};
  var margenPc = cfg.margenKcal || 10;
  var obj = n.objetivo || 0, hay = n.plan.k || 0, com = n.comido.k || 0;
  var pasado = (f < P.HOY) || P.estaCerrado(f);
  var dif = Math.round(obj - hay);
  var margen = obj * margenPc / 100;
  var cl = dif > margen ? 'falta' : (-dif > margen ? 'sobra' : 'cuadra');
  var difC = Math.round(obj - com);
  var clC = com ? (difC > margen ? 'falta' : (-difC > margen ? 'sobra' : 'cuadra')) : 'nada';

  var g = el('div', 'panel2');

  /* 1A · lo que gastas */
  var cad = P.cadenaObjetivo(f);
  var a = el('div', 'p2');
  /* La formula tiene que cuadrar con el numero que hay encima (Carlos, 5-nov).
     Lo que GASTAS es base + entreno; el deficit no se resta aqui, se resta para
     llegar a lo que te toca COMER, y por eso su formula va en el cuadro de al
     lado. Antes esta linea decia «− 550 de deficit» y el numero de arriba no lo
     restaba: 2.214 + 714 = 2.928, no 2.378. */
  a.innerHTML = '<span class="rot">LO QUE GASTAS</span>' +
    (cad ? '<span class="big">' + mil(cad.gasto) + '<small>kcal</small></span>' +
           '<span class="sub">' + mil(cad.base) + ' de base' +
           (cad.entreno ? ' + <b>' + mil(cad.entreno) + '</b> de entreno' : '') + '</span>'
         : '<span class="big">—</span><span class="sub">falta tu perfil</span>');
  g.appendChild(a);

  /* 1B · a comer contra lo planificado */
  var bq = el('div', 'p2 ' + cl);
  bq.innerHTML = '<span class="rot">A COMER / PLANIFICADO</span>' +
    '<span class="big">' + mil(obj) + '<small>/ ' + mil(hay) + ' kcal</small></span>' +
    (cad ? '<span class="sub">' + mil(cad.gasto) + ' − ' + mil(cad.deficit) +
           ' de déficit</span>' : '') +
    '<span class="sub est">' + (cl === 'cuadra' ? 'el día cuadra'
      : cl === 'falta' ? 'faltan ' + mil(Math.abs(dif)) + ' kcal por poner'
      : 'sobran ' + mil(Math.abs(dif)) + ' kcal') + '</span>';
  g.appendChild(bq);

  /* 2A · lo comido, con el resultado respecto al plan */
  var cc = el('div', 'p2 ' + clC);
  cc.innerHTML = '<span class="rot">' + (pasado ? 'YA COMIDO' : 'COMIDO HASTA AHORA') + '</span>' +
    '<span class="big">' + mil(com) + '<small>kcal</small></span>' +
    /* El dia abierto todavia se puede comer: lo que hay es lo que FALTA. Solo
       cuando esta cerrado tiene sentido decir que te quedaste corto. */
    '<span class="sub est">' + (!com ? 'sin marcar todavía'
      : clC === 'cuadra' ? 'cuadra con el objetivo'
      : clC === 'falta' ? (pasado ? 'te quedaste ' + mil(Math.abs(difC)) + ' kcal corto'
                                  : 'faltan ' + mil(Math.abs(difC)) + ' kcal hoy')
      : (pasado ? 'te pasaste ' + mil(Math.abs(difC)) + ' kcal'
                : 'te has pasado ' + mil(Math.abs(difC)) + ' kcal')) + '</span>';
  g.appendChild(cc);

  /* 2B · nutrientes y sal, con % y semáforo */
  var om = P.objetivosMacros(f) || { p: 144, g: 55, h: 147, sal: 3.5 };
  var base = pasado && com ? n.comido : n.plan;
  var m = el('div', 'p2 macros');
  /* Medidores, no píldoras: aquí el trabajo del dato es «cuánto llevo de mi
     objetivo», y eso se lee en una barra, no en un número suelto. El color es
     el semáforo de su app (verde/ámbar/rojo), no la paleta de macros, porque
     lo que dice es un estado. */
  function mac(let_, nom, hay2, meta, lado, sal) {
    var v = sal ? Math.round((hay2 || 0) * 100) / 100 : Math.round(hay2 || 0);
    var txt = sal ? String(v).replace('.', ',') : String(v);
    if (!meta) {
      return '<div class="mmed"><div class="et"><b>' + let_ + '</b> ' + nom +
        '<i class="bien">' + txt + '</i></div></div>';
    }
    var pc = Math.round(v / meta * 100), k = 'bien';
    if (sal) k = pc > 100 ? 'pasa' : 'bien';
    else if (pc < 90) k = 'corto';
    else if (pc > 110 && lado === 'ambos') k = 'pasa';
    var cl = k === 'bien' ? '' : (k === 'corto' ? ' ojo' : ' mal');
    return '<div class="mmed" title="' + nom + ': ' + txt + ' de ' + String(meta).replace('.', ',') +
      ' g · ' + pc + ' %">' +
      '<div class="et"><b>' + let_ + '</b>' + txt + '<small>/' + String(meta).replace('.', ',') +
      ' g</small><i class="' + k + '">' + pc + ' %</i></div>' +
      '<div class="kmeter' + cl + '"><i style="width:' + Math.min(100, pc) + '%"></i></div></div>';
  }
  m.innerHTML = '<span class="rot">' + (pasado && com ? 'LO COMIDO' : 'LO PUESTO') + ', CONTRA EL OBJETIVO DEL DÍA</span>' +
    '<div class="mgrid">' +
      mac('P', 'Proteína', base.p, om.p, 'corto') +
      mac('G', 'Grasas', base.g, om.g, 'ambos') +
      mac('H', 'Hidratos', base.h, om.h, 'ambos') +
      (P.hayTopeSal(f)
        ? mac('Sal', 'Sal', n.sal, om.sal, 'ambos', true)
        : '<div class="mmed libre"><div class="et"><b>Sal</b>' + coma(n.sal) +
          ' g<i>sin tope hoy</i></div></div>') +
    '</div>' +
    (cad && cad.entreno ? '<div class="ment">+' + mil(cad.entreno) + ' kcal del entreno</div>' : '');
  g.appendChild(m);

  /* la barra, cruzando las dos columnas */
  var pcCom = obj ? Math.min(100, com / obj * 100) : 0;
  var pcPlan = obj ? Math.min(100 - pcCom, Math.max(0, (hay - com) / obj * 100)) : 0;
  var ba = el('div', 'barra2' + (cl === 'sobra' ? ' sobra' : ''));
  var i1 = el('i', 'comido'); i1.style.width = pcCom.toFixed(1) + '%';
  var i2 = el('i', 'plan'); i2.style.width = pcPlan.toFixed(1) + '%';
  ba.appendChild(i1); ba.appendChild(i2);
  ba.title = 'Comido ' + mil(com) + ' · planificado ' + mil(hay) + ' · objetivo ' + mil(obj) + ' kcal';
  g.appendChild(ba);
  c.appendChild(g);

  if (cad && cad.suelo) c.appendChild(el('div', 'cadena aviso', 'Con ese déficit hoy te tocarían menos de 1.200 kcal: el objetivo se ha quedado en el suelo.'));
  /* la nota se publica al dar el día por cerrado, como en su app */
  if (n.nota && (P.estaCerrado(f) || (f < P.HOY && com > 0))) {
    var nd = el('div', 'nota-dia ' + n.nota.clase);
    nd.innerHTML = '<span class="s">' + n.nota.signo + '</span><span class="p">' + n.nota.nota + '</span>' +
      '<span class="pq"><b>NOTA DEL DÍA</b>' +
      (n.nota.motivos && n.nota.motivos.length ? n.nota.motivos.join(' · ') : 'el día cuadró') + '</span>';
    c.appendChild(nd);
  }
  return c;
}

/* La media de la semana en curso, con la valoración de su app. */
function bloqueSemana(f) {
  var lun = P.lunesDeISO(f);
  var m = P.mediaSemana(lun);
  var fe = P.fechasDe(lun);
  var c = el('div', 'semana-media');
  var cab = el('div', 'sm-cab');
  var enCurso = (P.HOY >= fe[0] && P.HOY <= fe[6]);
  cab.innerHTML = '<span class="sm-rot">MEDIA DE LA SEMANA</span>' +
    '<span class="sm-f">del ' + P.diaNum(fe[0]) + ' de ' + P.mesDe(fe[0]) + ' al ' +
    P.diaNum(fe[6]) + ' de ' + P.mesDe(fe[6]) + '</span>' +
    (enCurso ? '<span class="sm-chip">en curso</span>' : '') +
    (m ? '<span class="sm-d">' + m.dias + (m.dias === 1 ? ' día' : ' días') + ' con algo puesto</span>' : '');
  c.appendChild(cab);
  if (!m) {
    c.appendChild(el('div', 'vacio', 'Esta semana no tiene nada planificado todavía.'));
    return c;
  }
  var g = el('div', 'sm-cifras');
  g.innerHTML = '<span class="sm-big">' + mil(m.k) + '<small>kcal al día</small></span>';
  var v = el('div', 'vv');
  m.piezas.forEach(function (x) {
    v.innerHTML += '<span class="pz c-' + x.c + '"><b>' + x.n + '</b> <span class="n">' + x.v +
      '</span><i>' + x.d + '</i></span>';
  });
  g.appendChild(v);
  c.appendChild(g);
  return c;
}
function coma(n) { return String(Math.round((n || 0) * 100) / 100).replace('.', ','); }

/* Panel de las tres semanas. Carlos (5-nov): la rejilla de números parecía una
   hoja de cálculo — «muy triste y simple», quiere algo de app comercial. Una
   tarjeta por semana con la cifra que importa, el reparto de macros y la sal.
   La tabla sigue existiendo debajo, plegada: es lo que permite comparar. */
var MACROS = [
  { k: 'p', cl: 'mp', lg: 'lp', n: 'Proteína', kcal: 4 },
  { k: 'h', cl: 'mh', lg: 'lh', n: 'Hidratos', kcal: 4 },
  { k: 'g', cl: 'mg', lg: 'lg', n: 'Grasas',   kcal: 9 }
];
var CHIP = { A: ['curso', 'En curso'], B: ['compra', 'Comprada'], C: ['plan', 'A planificar'] };

function tarjetaSemana(s) {
  var n = P.numerosSemana(s.f);
  var c = el('div', 'ksem' + (s.k === 'C' ? ' foco' : ''));
  var cab = el('div', 'kcab');
  var nom = el('div', 'knom');
  nom.innerHTML = s.t + '<small>' + s.nota + '</small>';
  cab.appendChild(nom);
  var ch = CHIP[s.k] || CHIP.C;
  cab.appendChild(el('span', 'kchip ' + ch[0], ch[1]));
  c.appendChild(cab);
  if (!n || !n.dias) { c.appendChild(el('div', 'ksin', 'Sin datos todavía.')); return c; }

  var d = n.dias;
  var obj = n.objetivo / d, plan = n.plan / d, com = n.comido / d;
  var dif = plan - obj, fuera = Math.abs(dif) > obj * 0.1;

  /* 1 · lo planificado contra el objetivo */
  var b1 = el('div');
  b1.appendChild(el('span', 'krot', 'Planificado al día'));
  var st = el('div', 'kstat');
  st.innerHTML = '<span class="kv">' + mil(plan) + '</span><span class="ku">kcal/día</span>';
  st.appendChild(el('span', 'kdelta ' + (fuera ? 'ojo' : 'ok'),
    (dif >= 0 ? '+' : '−') + mil(Math.abs(dif)) + ' vs objetivo'));
  b1.appendChild(st);
  var wr = el('div', 'kmwrap');
  var me = el('div', 'kmeter' + (fuera ? ' ojo' : ''));
  var fi = el('i'); fi.style.width = Math.min(130, obj ? plan / obj * 100 : 0).toFixed(1) + '%';
  me.appendChild(fi); wr.appendChild(me);
  var mk = el('div', 'kmarca'); mk.style.left = Math.min(99.7, 100 / 1.3) + '%';
  mk.title = 'Objetivo: ' + kcal(obj) + ' al día';
  wr.appendChild(mk);
  wr.title = 'Planificado ' + kcal(plan) + ' · objetivo ' + kcal(obj) + ' al día';
  b1.appendChild(wr);
  b1.appendChild(el('div', 'kpista objetivo', 'Objetivo ' + kcal(obj) + ' al día'));
  c.appendChild(b1);

  /* 2 · el reparto de macros, en una barra segmentada */
  var b2 = el('div');
  b2.appendChild(el('span', 'krot', 'Reparto de macros'));
  var tot = MACROS.reduce(function (a, m) { return a + (n[m.k === 'p' ? 'prot' : m.k === 'h' ? 'hid' : 'gra'] / d) * m.kcal; }, 0);
  var ba = el('div', 'kmac');
  ba.setAttribute('role', 'img');
  var voz = [];
  MACROS.forEach(function (m) {
    var g = n[m.k === 'p' ? 'prot' : m.k === 'h' ? 'hid' : 'gra'] / d;
    var pc = tot ? g * m.kcal / tot * 100 : 0;
    if (pc <= 0) return;
    var e = el('span', m.cl);
    e.style.flex = '0 0 ' + pc.toFixed(2) + '%';
    if (pc >= 15) e.textContent = Math.round(g) + ' g';
    e.title = m.n + ': ' + Math.round(g) + ' g al día · ' + Math.round(pc) + ' % de las kcal';
    e.tabIndex = 0;
    ba.appendChild(e);
    voz.push(m.n + ' ' + Math.round(g) + ' gramos, ' + Math.round(pc) + ' por ciento');
  });
  ba.setAttribute('aria-label', 'Reparto de macros al día: ' + voz.join('; '));
  b2.appendChild(ba);
  var lg = el('div', 'kleg');
  MACROS.forEach(function (m) {
    var e = el('span');
    e.innerHTML = '<i class="' + m.lg + '"></i>' + m.n;
    lg.appendChild(e);
  });
  b2.appendChild(lg);
  c.appendChild(b2);

  /* 3 · sal y comido */
  var tope = P.topeSal(), sal = n.sal / d;
  var pie = el('div', 'kpie');
  var cl = sal > tope ? 'mal' : (sal > tope * 0.85 ? 'ojo' : '');
  var iz = el('div');
  iz.innerHTML = '<span class="krot">Sal</span><b>' + coma(sal) + ' g</b> al día';
  var ws = el('div', 'kmwrap'); ws.style.marginTop = '7px'; ws.style.width = '110px';
  var ms = el('div', 'kmeter' + (cl ? ' ' + cl : ''));
  var fs = el('i'); fs.style.width = Math.min(100, sal / tope * 100).toFixed(1) + '%';
  ms.appendChild(fs); ws.appendChild(ms);
  ws.title = 'Sal ' + coma(sal) + ' g al día · tope ' + coma(tope) + ' g';
  iz.appendChild(ws);
  iz.appendChild(el('div', 'kpista', n.pasa ? n.pasa + (n.pasa === 1 ? ' día' : ' días') + ' del tope'
    : 'ningún día del tope'));
  pie.appendChild(iz);
  var de = el('div', 'dcho');
  de.innerHTML = '<span class="krot">Comido</span><b>' + (com ? mil(com) : '—') + '</b>' +
    (com ? ' kcal/día' : '') + '<div class="kpista">' + (com ? 'de lo que llevas marcado' : 'aún sin marcar') + '</div>';
  pie.appendChild(de);
  c.appendChild(pie);
  return c;
}

function resumenSemanal() {
  var c = el('div', 'tarjeta semanal');
  var E = P.E();
  if (!E.abierto) E.abierto = P.abiertoNuevo();
  var ver = !!E.abierto.tabla;
  var cab = el('div', 'cabsec');
  cab.innerHTML = '<h2>Resumen de las tres semanas</h2>' +
    '<span class="sub">medias por día, con los cálculos de tu app</span>';
  var pl = el('button', 'plegar' + (ver ? '' : ' cerrado'));
  pl.innerHTML = (ver ? 'Ocultar la tabla ' : 'Ver la tabla ') + CHEV;
  pl.onclick = function (ev) { ev.stopPropagation(); E.abierto.tabla = !ver; P.guardar(); pintar(); };
  cab.appendChild(pl);
  c.appendChild(cab);

  var pan = el('div', 'panelsem');
  P.semanas().forEach(function (s) { pan.appendChild(tarjetaSemana(s)); });
  c.appendChild(pan);

  if (ver) {
    var tb = el('div', 'tablasem');
    tb.appendChild(el('div', 'th', ''));
    [['Objetivo', 'kcal/día'], ['Planificado', 'kcal/día'], ['Comido', 'kcal/día'],
     ['Proteína', 'g/día'], ['Hidratos', 'g/día'], ['Grasas', 'g/día'],
     ['Sal', 'g/día'], ['Sal de más', 'días del tope']].forEach(function (h) {
      var e = el('div', 'th');
      e.innerHTML = h[0] + '<small>' + h[1] + '</small>';
      tb.appendChild(e);
    });
    P.semanas().forEach(function (s) {
      var n = P.numerosSemana(s.f);
      var rt = el('div', 'rt');
      rt.innerHTML = s.t + '<small>' + s.nota + '</small>';
      tb.appendChild(rt);
      if (!n || !n.dias) { for (var i = 0; i < 8; i++) tb.appendChild(el('div', 'rv', '—')); return; }
      var d = n.dias;
      tb.appendChild(el('div', 'rv', kcal(n.objetivo / d)));
      var dif = (n.plan - n.objetivo) / d;
      tb.appendChild(el('div', 'rv' + (Math.abs(dif) > (n.objetivo / d) * 0.1 ? ' ojo' : ' ok'), kcal(n.plan / d)));
      tb.appendChild(el('div', 'rv', kcal(n.comido / d)));
      tb.appendChild(el('div', 'rv', Math.round(n.prot / d) + ' g'));
      tb.appendChild(el('div', 'rv', Math.round(n.hid / d) + ' g'));
      tb.appendChild(el('div', 'rv', Math.round(n.gra / d) + ' g'));
      tb.appendChild(el('div', 'rv', coma(n.sal / d) + ' g'));
      tb.appendChild(el('div', 'rv' + (n.pasa ? ' ojo' : ' ok'), n.pasa ? n.pasa + ' de ' + d : 'ninguno'));
    });
    c.appendChild(tb);
    var pie = el('div', 'piesem');
    pie.innerHTML = '<b>Sal de más</b>: días en que la sal del día pasa de tu tope (' +
      coma(P.topeSal()) + ' g). Los días de salida no cuentan: ese día no hay tope.';
    c.appendChild(pie);
  }
  return c;
}

/* ---------- fijos de cada día ---------- */
function pintarFijos() {
  var c = $('#fijos'); c.innerHTML = '';
  var E = P.E();
  var cab = el('div', 'cabsec');
  cab.innerHTML = '<h2>Fijos de cada día</h2><span class="sub">lo que se pone por defecto sin tener que elegirlo. Lo de Susana no cuenta en tus calorías.</span>';
  if (!E.abierto) E.abierto = P.abiertoNuevo();
  var ab = E.abierto.fijos;
  var pl = el('button', 'plegar' + (ab ? '' : ' cerrado'));
  pl.innerHTML = (ab ? 'Ocultar ' : 'Ver la tabla ') + CHEV;
  pl.onclick = function (ev) { ev.stopPropagation(); E.abierto.fijos = !ab; P.guardar(); pintar(); };
  cab.appendChild(pl);
  cab.style.cursor = 'pointer';
  cab.onclick = function () { E.abierto.fijos = !ab; P.guardar(); pintar(); };
  c.appendChild(cab);
  if (!ab) {
    var n = 0;
    P.TOMAS.forEach(function (tm) { P.PAPELES[tm].forEach(function (pa) {
      if (P.verFijo(tm, 'yo', pa)) n++; if (P.verFijo(tm, 'ella', pa)) n++; }); });
    c.appendChild(el('div', 'vacio', n + ' fijos puestos entre las cinco tomas.'));
    return;
  }
  var g = el('div', 'fij');
  g.appendChild(el('div', 'cab', ''));
  g.appendChild(el('div', 'cab', 'CARLOS'));
  g.appendChild(el('div', 'cab', 'SUSANA'));
  P.TOMAS.forEach(function (tm) {
    var extra = (tm === 'almuerzo' || tm === 'merienda') ? '<small>solo si entrenas</small>' : '';
    g.appendChild(el('div', 'et', tm.charAt(0).toUpperCase() + tm.slice(1) + extra));
    ['yo', 'ella'].forEach(function (q) {
      var caja = el('div', 'caja' + (q === 'ella' ? ' ella' : ''));
      P.PAPELES[tm].forEach(function (pa) {
        var f = P.verFijo(tm, q, pa);
        var linea = el('div', 'sel-linea');
        if (P.PAPELES[tm].length > 1) linea.appendChild(el('span', 'pap', P.ETIQ_PAPEL[pa]));
        var b = el('button', 'selector' + (f ? '' : ' sin'));
        b.innerHTML = '<span class="nom">' + (f ? P.nombreDe(f) : 'sin ' + P.ETIQ_PAPEL[pa].toLowerCase()) + '</span>' +
          (f && f.desde ? '<em class="vig">desde ' + P.fechaCorta(f.desde) + '</em>' : '') +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
        b.onclick = function () { abrirFijo(tm, q, pa); };
        linea.appendChild(b);
        caja.appendChild(linea);
      });
      g.appendChild(caja);
    });
  });
  c.appendChild(g);
  c.appendChild(el('div', 'vacio', 'Lo que pongas aquí sale solo en todos los días desde la fecha que elijas. En el día suelto se puede cambiar sin tocar esta tabla.'));
  c.appendChild(bloqueSolo());
}
var DIAS7 = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
function bloqueSolo() {
  var E = P.E();
  var b = el('div', 'solos');
  b.innerHTML = '<div class="tit">DÍAS QUE COMES SOLO <span>lo marcado se planifica para una persona</span></div>';
  var g = el('div', 'solos-g');
  g.appendChild(el('div', ''));
  DIAS7.forEach(function (d) { g.appendChild(el('div', 'dl', d)); });
  ['comida', 'cena'].forEach(function (tm) {
    g.appendChild(el('div', 'tl', tm.charAt(0).toUpperCase() + tm.slice(1)));
    DIAS7.forEach(function (d, i) {
      var on = E.solo && E.solo[tm] && E.solo[tm][i];
      var btn = el('button', 'sb' + (on ? ' on' : ''), on ? '1' : '2');
      btn.setAttribute('aria-label', (on ? 'Dejar de comer solo' : 'Comer solo') + ' los ' + d + ' en la ' + tm);
      btn.onclick = function () { P.pautaSolo(tm, i); pintar(); };
      g.appendChild(btn);
    });
  });
  b.appendChild(g);
  return b;
}

var fij = null;
function abrirFijo(toma, quien, papel) {
  fij = { toma: toma, quien: quien, papel: papel, busca: '', desde: P.HOY };
  pintarFijo();
}
function pintarFijo() {
  var capa = $('#capa');
  if (!fij) { capa.innerHTML = ''; capa.className = ''; return; }
  capa.className = 'capa'; capa.innerHTML = '';
  var m = el('div', 'modal');
  var quienTxt = fij.quien === 'yo' ? 'Carlos' : 'Susana';
  var actual = P.verFijo(fij.toma, fij.quien, fij.papel);
  var cab = el('div', 'modcab', '<div style="flex:1"><div class="t">' + P.ETIQ_PAPEL[fij.papel] +
    ' de la ' + fij.toma + ' · ' + quienTxt + '</div><div class="s">ahora: ' +
    (actual ? P.nombreDe(actual) : 'sin poner') + '</div></div>');
  var cerrar = el('button', 'mini', EQUIS);
  cerrar.style.cssText = 'width:34px;height:34px;border-radius:9px';
  cerrar.setAttribute('aria-label', 'Cerrar');
  cerrar.onclick = function () { fij = null; pintarFijo(); };
  cab.appendChild(cerrar); m.appendChild(cab);

  var fl = el('div', 'modfil');
  var bus = el('div', 'busca', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#46564f" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>');
  var inp = el('input'); inp.type = 'text'; inp.placeholder = 'busca por nombre…'; inp.value = fij.busca;
  inp.oninput = function () { fij.busca = inp.value; listaFijo(); };
  bus.appendChild(inp);
  var row = el('div', ''); row.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap';
  row.appendChild(bus);
  row.appendChild(el('span', '', 'Por defecto desde el'));
  var fd = el('input'); fd.type = 'date'; fd.value = fij.desde; fd.id = 'fij-desde';
  fd.style.cssText = 'border:1px solid var(--borde);border-radius:9px;padding:9px 10px;font-size:13px';
  fd.onchange = function () { fij.desde = fd.value; };
  row.appendChild(fd);
  fl.appendChild(row);
  if (actual) {
    var q = el('button', 'btng', 'Dejar esta ' + P.ETIQ_PAPEL[fij.papel].toLowerCase() + ' sin poner');
    q.style.cssText += ';align-self:flex-start';
    q.onclick = function () { P.ponerFijo(fij.toma, fij.quien, fij.papel, null); fij = null; pintarFijo(); pintar(); };
    fl.appendChild(q);
  }
  m.appendChild(fl);
  var lista = el('div', 'modlista'); lista.id = 'fijlista'; m.appendChild(lista);
  m.appendChild(el('div', 'modpie', '<span>Salen los platos y los ingredientes sueltos que encajan en este papel. Si no aparece, búscalo por su nombre.</span>'));
  capa.appendChild(m);
  capa.onclick = function (ev) { if (ev.target === capa) { fij = null; pintarFijo(); } };
  listaFijo();
}
function listaFijo() {
  var cont = document.getElementById('fijlista'); if (!cont) return;
  cont.innerHTML = '';
  var actual = P.verFijo(fij.toma, fij.quien, fij.papel);
  var items = P.candidatos(fij.toma, fij.papel, fij.busca);
  items.forEach(function (it) {
    var puesto = actual && actual.t === it.t && actual.id === it.id;
    var f = el('div', 'rec' + (puesto ? ' puesto' : ''));
    f.innerHTML = '<div style="flex:1;min-width:0"><div class="n">' + it.n + '</div><div class="m">' +
      it.m + (it.t === 'i' ? '' : '') + '</div></div>';
    var b = el('button', puesto ? 'btnv' : 'btng', puesto ? 'Puesto' : 'Poner');
    b.onclick = function () {
      var d = document.getElementById('fij-desde');
      P.ponerFijo(fij.toma, fij.quien, fij.papel, { t: it.t, id: it.id, desde: (d && d.value !== P.HOY) ? d.value : null });
      fij = null; pintarFijo(); pintar();
    };
    f.appendChild(b);
    cont.appendChild(f);
  });
  if (!items.length) cont.appendChild(el('div', 'vacio', 'Nada cuadra con eso.'));
}

/* ---------- semanas ---------- */
function pintarSemanas() {
  var arriba = $('#semanas-arriba'), abajo = $('#semanas-abajo');
  arriba.innerHTML = ''; abajo.innerHTML = '';
  P.semanas().forEach(function (s) {
    var cont = (s.k === 'C') ? abajo : arriba;
    var sec = el('div', 'sem' + (s.k === 'C' ? ' foco' : ''));
    var fechas = P.fechasDe(s.f);
    var E2 = P.E();
    if (!E2.abierto) E2.abierto = P.abiertoNuevo();
    var ab = E2.abierto[s.k];
    var puestos = 0, huecos = 0;
    fechas.forEach(function (fe) {
      ['comida', 'cena'].forEach(function (tmm) {
        if (P.esFueraT(fe, tmm)) return;
        var dd = P.dia(fe)[tmm] || [];
        if (dd.length) puestos += dd.length; else huecos++;
      });
    });
    var enBandeja = P.bandeja(s.f).length;
    var cab = el('div', 'semcab' + (ab ? '' : ' cerrada'));
    cab.innerHTML = CHEV + '<h2>' + s.t + '</h2><span class="f">' + P.diaNum(fechas[0]) + ' – ' +
      P.diaNum(fechas[6]) + ' de ' + P.mesDe(fechas[6]) + '</span>' +
      '<span class="kchip ' + (CHIP[s.k] || CHIP.C)[0] + '">' + (CHIP[s.k] || CHIP.C)[1] + '</span>' +
      (E2.muestra && E2.muestra[s.k] ? '<span class="muestra">menú de muestra</span>' : '') +
      (ab ? '<span class="nota">' + s.nota + '</span>'
          : '<span class="resumen">' + puestos + (puestos === 1 ? ' plato' : ' platos') +
            (huecos ? ' · ' + huecos + (huecos === 1 ? ' hueco' : ' huecos') : '') +
            (enBandeja ? ' · ' + enBandeja + ' sin colocar' : '') + '</span>');
    cab.onclick = function () { E2.abierto[s.k] = !ab; P.guardar(); pintar(); };
    sec.appendChild(cab);
    if (!ab) { cont.appendChild(sec); return; }
    var cue = el('div', 'semcuerpo');
    sec.appendChild(cue);
    var hb = el('div', 'semherr');
    [['Vaciar semana', function () { vaciarSemanaUI(s); }],
     ['Copiar plantilla', function () { abrirHerr('copiar', s.f); }],
     ['Guardar como plantilla', function () { abrirHerr('guardar', s.f); }]].forEach(function (x) {
      var bt = el('button', 'btn', x[0]); bt.onclick = x[1]; hb.appendChild(bt);
    });
    cue.appendChild(hb);
    var b = P.bandeja(s.f);
    {
      var bd = el('div', 'bandeja' + (b.length ? '' : ' vacia'));
      bd.dataset.bandeja = s.f;
      bd.appendChild(el('span', 'bt', 'Sin colocar' + (b.length ? ' · ' + b.length : '')));
      b.forEach(function (id) {
        var e = P.estadoDe(id);
        var fi = el('div', 'bficha');
        fi.innerHTML = GRIP + '<span class="n">' + P.nombre(id) + '</span><span class="pt ' + e.cl + '"></span>';
        agarrar(fi, id, { bandeja: s.f });
        var x = el('button', 'mini', EQUIS);
        x.style.cssText = 'width:18px;height:18px;flex:0 0 18px;border:0';
        x.setAttribute('aria-label', 'Quitar del todo');
        x.onclick = function (ev) { ev.stopPropagation(); P.tirar(id); pintar(); };
        fi.appendChild(x);
        bd.appendChild(fi);
      });
      if (!b.length) bd.appendChild(el('span', 'pista2', 'arrastra aquí lo que quieras sacar de esta semana'));
      else bd.appendChild(el('span', 'pista', 'arrástralas al día que quieras, o a la bandeja de otra semana'));
      cue.appendChild(bd);
    }
    var rej = el('div', 'rej');
    rej.appendChild(el('div', 'dcab vacia', ''));
    fechas.forEach(function (f) {
      var hoy = (f === P.HOY);
      var ruta = P.tipoDia(f) === 'ruta';
      var d = el('div', 'dcab' + (hoy ? ' hoy' : '') + (ruta ? ' ruta' : ''));
      d.appendChild(el('span', 'dn', P.DIAS[(new Date(f + 'T12:00:00').getDay() + 6) % 7] + ' ' +
        P.diaNum(f) + (hoy ? ' · hoy' : '')));
      if (!s.compacta || f >= P.HOY) {
        /* Dos botones, no uno que cambia de icono: Carlos, 5-nov, «pon dos botones
           para día en casa o día de salida outdoor, no se ve bien el icono de la
           casa». Y con dibujo propio, que el emoji a este tamaño no se lee. */
        var fr = ruta ? P.fichaRuta(f) : null;
        var par = el('div', 'btipos');
        var bc = el('button', 'btipo' + (ruta ? '' : ' on'));
        bc.innerHTML = CASA;
        bc.title = ruta ? 'Pasarlo a día en casa' : 'Día en casa';
        bc.setAttribute('aria-label', 'Día en casa, ' + P.diaNum(f));
        bc.setAttribute('aria-pressed', ruta ? 'false' : 'true');
        bc.onclick = function (ev) {
          ev.stopPropagation();
          if (!ruta) return;
          var q = P.ponerTipoDia(f, 'casa');
          pintar();
          if (q) aviso2('Día en casa: se ha quitado también la salida');
        };
        var bo = el('button', 'btipo bota' + (ruta ? ' on' : ''));
        bo.innerHTML = BOTA;
        bo.title = ruta
          ? 'Día de salida' + (fr ? ': ' + fr.n.toLowerCase() + ', ' + String(fr.h).replace('.', ',') + ' h · +' + fr.kcal + ' kcal' : ' · sin salida puesta') + '. Tócalo para cambiarla.'
          : 'Ponerlo como día de salida';
        bo.setAttribute('aria-label', 'Día de salida outdoor, ' + P.diaNum(f));
        bo.setAttribute('aria-pressed', ruta ? 'true' : 'false');
        bo.onclick = function (ev) {
          ev.stopPropagation();
          if (!ruta) P.ponerTipoDia(f, 'ruta');
          pintar();
          setTimeout(function () {
            var nb = [...document.querySelectorAll('.dcab.ruta .btipo.bota')]
              .filter(function (x) { return x.getAttribute('aria-label').indexOf(', ' + P.diaNum(f)) > 0; })[0];
            if (nb) abrirTipoDia(f, nb);
          }, 50);
        };
        par.appendChild(bc); par.appendChild(bo);
        d.appendChild(par);
        if (ruta && fr) d.appendChild(el('span', 'dkcal', '+' + mil(fr.kcal)));
      }
      rej.appendChild(d);
    });
    ['comida', 'cena'].forEach(function (toma) {
      rej.appendChild(el('div', 'tomarot', toma.toUpperCase()));
      fechas.forEach(function (f) { rej.appendChild(celda(f, toma, s)); });
    });
    cue.appendChild(rej);
    cont.appendChild(sec);
  });
}
/* En casa / Outdoor desde el planificador, que es donde se decide la semana:
   Carlos, 5-nov: «outdoor lo debería marcar en el planificador, ya que las comidas
   son diferentes, la demanda calórica es mayor y es comida fácil de transportar».
   Aquí van las dos cosas: el tipo y la salida, que es la que sube el objetivo. */
function abrirTipoDia(f, anclaje) {
  cerrarTipoDia();
  var pop = el('div', 'tdpop'); pop.id = 'tdpop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Tipo de día');
  var tp = P.tipoDia(f), tipos = P.tiposDia();
  pop.appendChild(el('div', 'tdt', P.DIAS[(new Date(f + 'T12:00:00').getDay() + 6) % 7] + ' ' +
    P.diaNum(f) + ' de ' + P.mesDe(f)));
  var pest = el('div', 'tpest');
  Object.keys(tipos).forEach(function (k) {
    var b = el('button', 'tp' + (k === tp ? ' on' : ''));
    b.innerHTML = (tipos[k].icono || '') + ' <span>' + tipos[k].n + '</span>';
    b.onclick = function (ev) {
      ev.stopPropagation();
      var q = P.ponerTipoDia(f, k);
      cerrarTipoDia(); pintar();
      if (q) aviso2('Día en casa: se ha quitado también la salida');
      if (k === 'ruta') setTimeout(function () {
        var nb = document.querySelector('.dcab.ruta .btipo.bota');
        if (nb) abrirTipoDia(f, nb);
      }, 60);
    };
    pest.appendChild(b);
  });
  pop.appendChild(pest);

  if (tp === 'ruta') {
    var fr = P.fichaRuta(f);
    var caja = el('div', 'tdruta');
    var sel = el('select'); sel.setAttribute('aria-label', 'Qué salida');
    var o0 = el('option', '', '— elige la salida —'); o0.value = ''; sel.appendChild(o0);
    P.deportesRuta().forEach(function (x) {
      var o = el('option', '', x.n); o.value = x.id;
      if (fr && fr.a === x.id) o.selected = true;
      sel.appendChild(o);
    });
    var hrs = el('input'); hrs.type = 'number'; hrs.min = '0.5'; hrs.max = '14'; hrs.step = '0.5';
    hrs.placeholder = 'horas'; hrs.value = fr ? fr.h : '';
    hrs.setAttribute('aria-label', 'Cuántas horas');
    function aplicar() {
      if (!sel.value) { P.quitarRuta(f); cerrarTipoDia(); pintar(); aviso2('Salida quitada'); return; }
      var h = parseFloat(String(hrs.value).replace(',', '.'));
      if (!(h > 0)) {
        var pd = P.deportesRuta().filter(function (x) { return x.id === sel.value; })[0];
        h = (pd && pd.h) || 3;
      }
      var r = P.planearRuta(f, sel.value, h);
      cerrarTipoDia(); pintar();
      if (r) aviso2('Salida de ' + String(h).replace('.', ',') + ' h: unas ' + r.kcal + ' kcal de más');
    }
    sel.onchange = aplicar; hrs.onchange = aplicar;
    caja.appendChild(sel); caja.appendChild(hrs);
    pop.appendChild(caja);
    pop.appendChild(el('div', 'tdn', fr
      ? '<b>+' + mil(fr.kcal) + ' kcal</b> al objetivo del día. Almuerzo, comida y merienda van de mochila, ' +
        'y ese día <b>no hay tope de sal</b>.'
      : 'Elige la salida: es lo que sube la demanda calórica del día.'));
  }

  var r = anclaje.getBoundingClientRect();
  pop.style.left = Math.round(Math.min(r.left + window.scrollX, window.innerWidth - 300)) + 'px';
  pop.style.top = Math.round(r.bottom + window.scrollY + 6) + 'px';
  document.body.appendChild(pop);
  var fuera = function (ev) { if (!pop.contains(ev.target)) cerrarTipoDia(); };
  pop._fuera = fuera;
  setTimeout(function () { document.addEventListener('mousedown', fuera); }, 0);
  pop._esc = function (ev) { if (ev.key === 'Escape') cerrarTipoDia(); };
  document.addEventListener('keydown', pop._esc);
}
function cerrarTipoDia() {
  var p = document.getElementById('tdpop');
  if (!p) return;
  if (p._fuera) document.removeEventListener('mousedown', p._fuera);
  if (p._esc) document.removeEventListener('keydown', p._esc);
  p.remove();
}

/* Comensales de una toma, en pequeño, para las celdas del planificador. */
function paxMini(fecha, toma) {
  var n = P.pax(fecha, toma);
  var g = el('div', 'paxm' + (n === 1 ? ' uno' : '') + (n > 2 ? ' varios' : ''));
  g.title = 'Cuántos comen: ' + n + '. Cambia la compra y lo que sale de la despensa, no tus calorías.';
  var m = el('button', 'pb', '−'); m.setAttribute('aria-label', 'Un comensal menos');
  m.onclick = function (ev) { ev.stopPropagation(); P.ponerPax(fecha, toma, n - 1); pintar(); };
  var v = el('span', 'pn', String(n));
  var p = el('button', 'pb', '+'); p.setAttribute('aria-label', 'Un comensal más');
  p.onclick = function (ev) { ev.stopPropagation(); P.ponerPax(fecha, toma, n + 1); pintar(); };
  g.appendChild(m); g.appendChild(v); g.appendChild(p);
  return g;
}
function celda(fecha, toma, s) {
  /* EN LA REJILLA, SOLO LOS PLATOS (Carlos, 5-nov: «el plan de la semana que
     viene son yogur con avena y panecillos»). Desde que los fijos se guardan
     dentro del dia, la celda los pintaba como si fueran la comida y tapaban el
     plato de verdad. El pan y el yogur se ven en Dia a dia y cuentan en la
     compra; aqui lo que se planifica son los principales. */
  var d = P.propios(fecha, toma);
  var hoy = (fecha === P.HOY);
  var pasado = (fecha < P.HOY);
  /* UNA TOMA DE HOY YA COMIDA SE CIERRA (Carlos, 5-nov: «los platos de hoy que
     ya estan comidos deberian aparecer como los dias pasados en clarito... y no
     modificables»). Lo comido no se cambia: se ve y se deja en paz. */
  var yaComido = !pasado && d.length && P.estaComido(fecha, toma, d[0]);
  var cerrada = (pasado || yaComido) && s.compacta;
  var c = el('div', 'cel');
  c.dataset.fecha = fecha; c.dataset.toma = toma;
  if (hoy && !cerrada) c.classList.add('hoy');
  if (cerrada) c.classList.add('pasado');

  if (P.esFueraT(fecha, toma)) {
    c.classList.add('fuera');
    c.innerHTML = '<div class="celcab"><span class="tt" style="color:var(--azul)">' + toma.toUpperCase() + ' · FUERA</span></div>' +
      '<div style="font-size:11px;margin-top:3px;color:var(--azul)">Comemos fuera de casa</div>';
    var u = el('button', '', 'deshacer');
    u.style.cssText = 'margin-top:5px;min-height:22px;border:0;background:none;color:var(--azul);font-size:10px;font-weight:700;padding:0;text-decoration:underline';
    u.onclick = function () { P.marcarFuera(fecha, toma); pintar(); };
    c.appendChild(u);
    return c;
  }
  if (!d.length) {
    c.classList.add('vacia');
    var caja = el('div', 'vacia-botones');
    var b = el('button', 'btnplus', MAS);
    b.setAttribute('aria-label', 'Elegir principal para la ' + toma + ' del ' + P.diaNum(fecha));
    b.onclick = function () { abrirCatalogo(fecha, toma, 0, null); };
    caja.appendChild(b);
    caja.appendChild(paxMini(fecha, toma));
    var fv = el('button', 'btnfuera', PUERTA);
    fv.setAttribute('aria-label', 'Marcar que ese d\u00eda comemos fuera');
    fv.title = 'Comemos fuera';
    fv.onclick = function (ev) { ev.stopPropagation(); P.marcarFuera(fecha, toma); pintar(); };
    caja.appendChild(fv);
    c.appendChild(caja);
    return c;
  }
  if (cerrada) c.classList.add('cerrada');   /* ni se arrastra ni admite nada */
  var e0 = P.estadoDe(d[0]);
  var cab = el('div', 'celcab');
  var np = P.pax(fecha, toma);
  cab.innerHTML = GRIP + '<span class="tt">' + toma.toUpperCase() + (cerrada ? ' · comido' : '') +
    '</span><span class="pt ' + e0.cl + '"></span>';
  if (!cerrada) cab.appendChild(paxMini(fecha, toma));
  if (!cerrada) {
    var x = el('button', 'mini', EQUIS);
    x.setAttribute('aria-label', 'Quitar el plato y devolver sus opciones al panel');
    x.onclick = function (ev) { ev.stopPropagation(); P.quitar(fecha, toma, 0); pintar(); };
    cab.appendChild(x);
    var fu = el('button', 'mini', PUERTA);
    fu.setAttribute('aria-label', 'Marcar que comemos fuera');
    fu.onclick = function (ev) { ev.stopPropagation(); P.marcarFuera(fecha, toma); pintar(); };
    cab.appendChild(fu);
  }
  c.appendChild(cab);
  var r1 = el('div', 'r1', P.nombre(d[0]));
  if (!cerrada) agarrar(r1, d[0], { fecha: fecha, toma: toma, ranura: 0 });
  c.appendChild(r1);

  if (d[1]) {
    var r2 = el('div', 'r2');
    var guar = P.esGuar(P.POR_ID[d[1]]);
    r2.innerHTML = '<span class="n" style="' + (guar ? '' : 'font-size:11px;color:var(--tinta)') + '">' +
      (guar ? '+ ' : '') + P.nombre(d[1]) + '</span>';
    if (!cerrada) {
      var cb = el('button', 'mini', CAMBIO);
      cb.style.cssText = 'width:16px;height:16px;flex:0 0 16px;border:0;color:var(--verde)';
      cb.setAttribute('aria-label', 'Cambiar lo añadido');
      cb.onclick = function () { abrirCatalogo(fecha, toma, 1, null); };
      r2.appendChild(cb);
      var x2 = el('button', 'mini', EQUIS);
      x2.style.cssText = 'width:16px;height:16px;flex:0 0 16px;border:0';
      x2.setAttribute('aria-label', 'Quitar lo añadido');
      x2.onclick = function () { P.quitar(fecha, toma, 1); pintar(); };
      r2.appendChild(x2);
    }
    c.appendChild(r2);
  } else if (!s.compacta) {
    var m = el('button', 'mas', '+ añadir');
    m.onclick = function () { abrirCatalogo(fecha, toma, 1, null); };
    c.appendChild(m);
  }
  return c;
}

/* ---------- arrastrar y soltar ---------- */
function agarrar(nodo, receta, origen) {
  nodo.addEventListener('mousedown', function (ev) {
    if (ev.button !== 0) return;
    /* Carlos, 5-nov: «doy a la x roja y no se quita». El boton vive dentro de
       la ficha que se arrastra, asi que su mousedown abria un arrastre y el
       repintado se llevaba por delante el click. Los botones van aparte. */
    var t = ev.target;
    while (t && t !== nodo) { if (t.tagName === 'BUTTON') return; t = t.parentElement; }
    ev.preventDefault();
    arr = { receta: receta, origen: origen || null, x0: ev.clientX, y0: ev.clientY, movido: false, nodo: nodo, fantasma: null };
  });
}
document.addEventListener('mousemove', function (ev) {
  if (!arr) return;
  if (!arr.movido && Math.abs(ev.clientX - arr.x0) + Math.abs(ev.clientY - arr.y0) < 5) return;
  if (!arr.movido) {
    arr.movido = true;
    arr.fantasma = el('div', 'fantasma', P.nombre(arr.receta));
    document.body.appendChild(arr.fantasma);
    document.body.style.userSelect = 'none';
  }
  arr.fantasma.style.left = (ev.clientX + 12) + 'px';
  arr.fantasma.style.top = (ev.clientY + 12) + 'px';
  arr.x = ev.clientX; arr.y = ev.clientY;
  marcarDiana(ev.clientX, ev.clientY);
  autoScroll(ev.clientY);
});
/* Con tres semanas la página no cabe: al acercar la ficha al borde, la ventana baja o sube sola. */
var tic = null;
function autoScroll(y) {
  var h = window.innerHeight, zona = 110, v = 0;
  if (y > h - zona) v = Math.min(26, (y - (h - zona)) / 3);
  else if (y < zona) v = -Math.min(26, (zona - y) / 3);
  if (!v) { if (tic) { clearInterval(tic); tic = null; } return; }
  if (tic) return;
  tic = setInterval(function () {
    if (!arr) { clearInterval(tic); tic = null; return; }
    var yy = arr.y, hh = window.innerHeight, vv = 0;
    if (yy > hh - 110) vv = Math.min(26, (yy - (hh - 110)) / 3);
    else if (yy < 110) vv = -Math.min(26, (110 - yy) / 3);
    if (!vv) { clearInterval(tic); tic = null; return; }
    window.scrollBy(0, vv);
    marcarDiana(arr.x, arr.y);
  }, 16);
}
document.addEventListener('mouseup', function (ev) {
  if (!arr) return;
  var a = arr; arr = null;
  if (tic) { clearInterval(tic); tic = null; }
  document.body.style.userSelect = '';
  if (a.fantasma) a.fantasma.remove();
  limpiarDianas();
  if (!a.movido) { seleccionar(a); return; }
  var cel = celdaEn(ev.clientX, ev.clientY);
  if (!cel) return;
  soltar(a, cel);
});
function celdaEn(x, y) {
  var n = document.elementFromPoint(x, y);
  while (n && !(n.classList && (n.classList.contains('cel') || n.classList.contains('bandeja')))) n = n.parentElement;
  /* UNA TOMA CERRADA NO ADMITE NADA (Carlos, 5-nov: «y no modificables»). Si no,
     se podia soltar un plato encima de una cena ya comida y cambiarla. */
  if (n && n.classList.contains('cel') && n.classList.contains('cerrada')) return null;
  return n;
}
function marcarDiana(x, y) {
  limpiarDianas();
  var c = celdaEn(x, y);
  if (c) c.classList.add('diana');
}
function limpiarDianas() {
  Array.prototype.forEach.call(document.querySelectorAll('.cel.diana, .bandeja.diana'), function (c) { c.classList.remove('diana'); });
}
function soltar(a, cel) {
  /* Soltar en una bandeja: el plato sale del día y se queda ahí, a la espera. */
  if (cel.classList.contains('bandeja')) {
    if (a.origen && a.origen.fecha) {
      /* la ranura cuenta platos, no fijos */
      var l0 = P.propios(a.origen.fecha, a.origen.toma);
      l0.splice(a.origen.ranura, 1);
      P.ponerPropios(a.origen.fecha, a.origen.toma, l0);
    }
    /* Un plato sin colocar esta en UNA bandeja, nunca en dos (Carlos, 5-nov:
       «si lo muevo a otro sin colocar, el primero se borre... ahora salen dos»). */
    P.sacarDeBandejas(a.receta);
    P.aBandeja(cel.dataset.bandeja, a.receta);
    P.guardar(); pintar();
    return;
  }
  var fecha = cel.dataset.fecha, toma = cel.dataset.toma;
  if (a.origen && a.origen.fecha) P.quitar(a.origen.fecha, a.origen.toma, a.origen.ranura);
  var d = P.propios(fecha, toma);
  var esG = P.esGuar(P.POR_ID[a.receta]);
  var ranura = (d.length && esG) ? 1 : 0;
  P.colocar(a.receta, fecha, toma, ranura);
  pintar();
}
var tAviso = null;
function aviso2(t2) { aviso(t2); }
/* Si el cambio ha movido la despensa, decirlo: es dinero y es compra. Su app lo
   hace desde el 8-oct con `ultimoReajuste`; el prototipo no lo miraba. */
function avisaReajuste() {
  var t = P.reajuste();
  if (t) aviso(t);
  return !!t;
}
function aviso(txt) {
  var n = document.getElementById('aviso-flotante');
  if (!n) { n = el('div'); n.id = 'aviso-flotante'; n.className = 'flota'; document.body.appendChild(n); }
  n.textContent = txt; n.style.display = 'block';
  if (tAviso) clearTimeout(tAviso);
  tAviso = setTimeout(function () { n.style.display = 'none'; }, 5000);
}
function seleccionar(a) {
  if (sel && sel.receta === a.receta) { sel = null; pintar(); return; }
  sel = a; pintar();
  Array.prototype.forEach.call(document.querySelectorAll('[data-receta="' + a.receta + '"]'), function (n) { n.classList.add('sel'); });
}
document.addEventListener('click', function (ev) {
  if (!sel) return;
  /* Un clic en un boton es ese boton y nada mas (Carlos, 6-nov: «aparecia en
     sin colocar y quise borrarla con la x» — y acabo en la cena del miercoles).
     El clic en la x dejaba el plato «cogido» y el siguiente clic en una celda
     lo soltaba alli. */
  var t = ev.target;
  while (t) { if (t.tagName === 'BUTTON') return; t = t.parentElement; }
  var n = ev.target;
  while (n && !(n.classList && (n.classList.contains('cel') || n.classList.contains('bandeja')))) n = n.parentElement;
  if (!n) return;
  var a = sel; sel = null;
  soltar(a, n);
});

/* ---------- la ficha de la receta ----------
   Carlos (5-nov): «desde cada plato se debe acceder a la receta o hay que poner
   un boton Cocinar». En su app las dos cosas abren LO MISMO: Cocinar es esta
   ficha abierta por la elaboracion. Aqui igual. */
var fch = null;
function abrirFichaReceta(id, fecha, toma, aCocinar) {
  fch = { id: id, f: fecha, tm: toma, coc: !!aCocinar };
  pintarFicha();
}
function cerrarFicha() { fch = null; pintarFicha(); }
function pintarFicha() {
  var capa = $('#capa');
  if (!fch) { capa.innerHTML = ''; capa.className = ''; return; }
  var d = P.fichaReceta(fch.id, fch.f, fch.tm);
  if (!d) { fch = null; capa.innerHTML = ''; capa.className = ''; return; }
  capa.className = 'capa'; capa.innerHTML = '';
  var m = el('div', 'modal ficha');

  var cab = el('div', 'modcab');
  cab.innerHTML = '<div style="flex:1"><div class="t">' + esc(d.n) + '</div>' +
    '<div class="s">' + (d.min ? d.min + ' min · ' : '') +
    (d.escalada ? 'cantidades para ' + d.comen + (d.comen === 1 ? ' comensal' : ' comensales')
                : d.raciones + (d.raciones === 1 ? ' ración' : ' raciones')) +
    (d.tanda ? ' · receta de tanda: se cocina entera y se reparte' : '') + '</div></div>';
  var x = el('button', 'mini', EQUIS);
  x.style.cssText = 'width:34px;height:34px;border-radius:9px';
  x.setAttribute('aria-label', 'Cerrar la ficha');
  x.onclick = cerrarFicha;
  cab.appendChild(x); m.appendChild(cab);

  var eti = el('div', 'fetiq');
  eti.innerHTML = '<span class="fe">' + mil(d.kcal) + ' kcal<small>por ración</small></span>' +
    '<span class="fe">' + coma(d.sal) + ' g<small>de sal por ración</small></span>' +
    (d.tools && d.tools.length ? '<span class="fe cosas">' + d.tools.map(esc).join(' · ') + '</span>' : '');
  m.appendChild(eti);

  var cue = el('div', 'fcuerpo'); cue.id = 'fcuerpo';

  var hi = el('div', 'fsec');
  hi.appendChild(el('h3', '', 'Ingredientes' + (d.escalada ? ' · para ' + d.comen : '')));
  var ul = el('div', 'fing');
  d.ing.forEach(function (l) {
    var li = el('div', 'fl');
    li.innerHTML = '<span>' + esc(l.n) + (l.rallar ? ' <em>· para rallar</em>' : '') + '</span>' +
      '<span class="c">' + esc(l.cant) + (l.kcal ? ' <em>· ' + l.kcal + ' kcal</em>' : '') + '</span>';
    ul.appendChild(li);
  });
  if (!d.ing.length) ul.appendChild(el('div', 'vacio', 'Esta ficha no tiene ingredientes apuntados.'));
  hi.appendChild(ul); cue.appendChild(hi);

  var he = el('div', 'fsec'); he.id = 'felab';
  he.appendChild(el('h3', '', 'Elaboración'));
  if (d.pasos && d.pasos.length) {
    var ol = el('ol', 'fpasos');
    d.pasos.forEach(function (p) { ol.appendChild(el('li', '', esc(typeof p === 'string' ? p : (p.t || p.n || '')))); });
    he.appendChild(ol);
  } else he.appendChild(el('div', 'vacio', 'Esta ficha no tiene pasos apuntados.'));
  cue.appendChild(he);

  if (d.trucos && d.trucos.length) {
    var ht = el('div', 'fsec');
    ht.appendChild(el('h3', '', 'Trucos'));
    var ut = el('ul', 'ftrucos');
    d.trucos.forEach(function (t) { ut.appendChild(el('li', '', esc(typeof t === 'string' ? t : (t.t || '')))); });
    ht.appendChild(ut); cue.appendChild(ht);
  }
  if (d.nota) {
    var hn = el('div', 'fsec');
    hn.appendChild(el('h3', '', 'Nota'));
    hn.appendChild(el('div', 'fnota', esc(d.nota)));
    cue.appendChild(hn);
  }
  m.appendChild(cue);
  capa.appendChild(m);
  capa.onclick = function (ev) { if (ev.target === capa) cerrarFicha(); };
  if (fch.coc) setTimeout(function () {
    var e2 = document.getElementById('felab');
    if (e2) e2.scrollIntoView({ block: 'start' });
  }, 30);
}

/* ---------- catálogo ---------- */
var cat = null;
function abrirCatalogo(fecha, toma, ranura, forzarTipo) {
  var tipoNorma = null;
  if (fecha && ranura === 0) {
    var i = (new Date(fecha + 'T12:00:00').getDay() + 6) % 7;
    /* De la norma, no de una copia a mano: la de aqui se habia quedado vieja
       (proponia pescado donde la norma dice carne). */
    tipoNorma = (P.NORMAS[toma] || [])[i] || null;
    if (tipoNorma === 'fuera') tipoNorma = null;
  }
  cat = { fecha: fecha, toma: toma, ranura: ranura, filtro: forzarTipo || tipoNorma || 'todas', busca: '' };
  pintarCatalogo();
}
function listaCatalogo() {
  var f = cat.filtro, q = cat.busca.trim().toLowerCase();
  var l = P.RECETAS.filter(function (r) {
    if (f === 'guarnicion') return P.esGuar(r);
    if (f === 'bebida' || f === 'pan' || f === 'postre') return P.vivaFicha(r) && P.papelDe(r) === f;
    if (f === 'desayuno' || f === 'restaurante') return P.vivaFicha(r) && r.grupo === f;
    if (f === 'suelto') return P.vivaFicha(r) && r.grupo === 'suelto' &&
      ['bebida','postre','pan'].indexOf(P.papelDe(r)) < 0 && !P.esTosta(r);
    if (f === 'todas') return P.valeCC(r) || P.esGuar(r);
    return P.valeCC(r) && P.TIPOS[f] && P.TIPOS[f](r);
  });
  if (q) l = l.filter(function (r) { return ((r.corto || '') + ' ' + r.n).toLowerCase().indexOf(q) >= 0; });
  return l.map(function (r) { return r.id; }).sort(function (a, b) {
    var d = (P.estadoDe(a).cl === 'casa' ? 0 : P.estadoDe(a).cl === 'falta' ? 1 : 2) -
            (P.estadoDe(b).cl === 'casa' ? 0 : P.estadoDe(b).cl === 'falta' ? 1 : 2);
    if (d) return d;
    return P.nombre(a).localeCompare(P.nombre(b));
  });
}
function cuenta(f) {
  return P.RECETAS.filter(function (r) {
    if (f === 'guarnicion') return P.esGuar(r);
    if (f === 'bebida' || f === 'pan' || f === 'postre') return P.vivaFicha(r) && P.papelDe(r) === f;
    if (f === 'desayuno' || f === 'restaurante') return P.vivaFicha(r) && r.grupo === f;
    if (f === 'suelto') return P.vivaFicha(r) && r.grupo === 'suelto' &&
      ['bebida','postre','pan'].indexOf(P.papelDe(r)) < 0 && !P.esTosta(r);
    if (f === 'todas') return P.valeCC(r) || P.esGuar(r);
    return P.valeCC(r) && P.TIPOS[f] && P.TIPOS[f](r);
  }).length;
}
function pintarCatalogo() {
  var capa = $('#capa');
  if (!cat) { capa.innerHTML = ''; capa.className = ''; return; }
  capa.className = 'capa';
  capa.innerHTML = '';
  var m = el('div', 'modal');
  var destino = cat.fecha ? ('Añadir a la ' + cat.toma + ' del ' + P.diaNum(cat.fecha) + ' de ' + P.mesDe(cat.fecha)) : 'Catálogo de guarniciones';
  var sub = cat.ranura === 1 ? 'Segunda ranura: otro principal o una guarnición' : 'Primera ranura, el principal';
  var cab = el('div', 'modcab', '<div style="flex:1"><div class="t">' + destino + '</div><div class="s">' + sub + '</div></div>');
  var cerrar = el('button', 'mini', EQUIS);
  cerrar.style.cssText = 'width:34px;height:34px;border-radius:9px';
  cerrar.setAttribute('aria-label', 'Cerrar el catálogo');
  cerrar.onclick = function () { cat = null; pintarCatalogo(); };
  cab.appendChild(cerrar); m.appendChild(cab);

  var fil = el('div', 'modfil');
  var b = el('div', 'busca', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f6159" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>');
  var inp = el('input'); inp.type = 'text'; inp.placeholder = 'bacalao, setas, 20 minutos…'; inp.value = cat.busca;
  inp.oninput = function () { cat.busca = inp.value; pintarLista(); };
  b.appendChild(inp);
  var filaB = el('div', '', ''); filaB.style.cssText = 'display:flex;gap:8px'; filaB.appendChild(b);
  fil.appendChild(filaB);
  var chips = el('div', 'chips');
  /* «Antes se podia elegir entre todos los grupos, ordenados de mas
     convenientes a menos para la toma» (Carlos, 5-nov). Primero el tipo que
     pide la norma para ese hueco, despues el resto de tipos, y luego el orden
     de la mesa que el mismo fijo el 3-oct: guarnicion, pan, postre, bebida, y
     al final los cajones de otro momento y los ingredientes solos. */
  var tipos = ['pescado','carne','arroz','pasta','tosta','verdura','ensalada','huevos','legumbre'];
  if (cat.filtro && tipos.indexOf(cat.filtro) > 0) {
    tipos = [cat.filtro].concat(tipos.filter(function (x) { return x !== cat.filtro; }));
  }
  var orden = ['todas'].concat(tipos,
    ['guarnicion','pan','postre','bebida','desayuno','restaurante','suelto']);
  orden.forEach(function (f) {
    var NOM = { todas: 'Todas', guarnicion: 'Guarniciones', pan: 'Panes',
                postre: 'Postres', bebida: 'Bebidas', desayuno: 'Desayuno',
                restaurante: 'Restaurante', suelto: 'Ingredientes solos' };
    var nom = NOM[f] || P.ETIQ[f] || f;
    var c = el('button', 'chip' + (cat.filtro === f ? ' on' : ''), nom.charAt(0) + nom.slice(1).toLowerCase() + ' ' + cuenta(f));
    c.onclick = function () { cat.filtro = f; pintarCatalogo(); };
    chips.appendChild(c);
  });
  fil.appendChild(chips); m.appendChild(fil);

  var lista = el('div', 'modlista'); lista.id = 'modlista'; m.appendChild(lista);
  m.appendChild(el('div', 'modpie', '<span>' + cuenta('todas') + ' recetas valen para una comida o una cena, guarniciones incluidas.</span>'));
  capa.appendChild(m);
  capa.onclick = function (ev) { if (ev.target === capa) { cat = null; pintarCatalogo(); } };
  pintarLista();
}
function pintarLista() {
  var cont = document.getElementById('modlista'); if (!cont) return;
  cont.innerHTML = '';
  var ids = listaCatalogo();
  /* La guarnicion, contra lo que te queda de la toma. Su app lo calcula con
     `huecoGuarnicion` y `ajusteGuarnicion`; aqui se ENSENA. Aplicar la racion
     recortada necesita el conjunto (principal + guarnicion fundidos en una
     ficha), que el prototipo todavia no monta. */
  var hg = null;
  if (cat.fecha && cat.filtro === 'guarnicion') hg = P.huecoGuar(cat.fecha, cat.toma);
  if (hg) {
    var av = el('div', 'avhueco' + (hg.hueco > 40 ? '' : ' corto'));
    av.innerHTML = hg.hueco > 40
      ? 'Con el principal de esta toma te quedan <b>' + mil(hg.hueco) + ' kcal</b> para la guarnición' +
        (hg.fijos ? ' (ya cuenta ' + mil(hg.fijos) + ' de lo fijo)' : '') + '.'
      : 'Con el principal de esta toma ya llegas a lo que toca' +
        (hg.hueco < 0 ? ' y te pasas ' + mil(-hg.hueco) + ' kcal' : '') +
        ': mejor sin guarnición, o una verdura.';
    cont.appendChild(av);
  }
  var grupos = [['casa','LO TIENES TODO EN CASA','var(--verde)'], ['falta','TE FALTA POCO','var(--ambar)'], ['comprar','HAY QUE COMPRAR','var(--azul)']];
  grupos.forEach(function (g) {
    var sub = ids.filter(function (id) { return P.estadoDe(id).cl === g[0]; });
    if (!sub.length) return;
    cont.appendChild(el('div', 'gtit', '<span style="color:' + g[2] + '">' + g[1] + ' · ' + sub.length + '</span><i></i>'));
    sub.slice(0, 40).forEach(function (id) {
      var r = P.POR_ID[id], e = P.estadoDe(id);
      var f = el('div', 'rec');
      var aj = hg ? P.ajusteGuar(hg.hueco, id) : null;
      var nota = '';
      if (aj && aj.noCabe) nota = '<b class="gpasa">entera te pasas ' + mil(aj.noCabe) + ' kcal</b> · ';
      else if (aj) nota = '<b class="gaj">cabe al ' + Math.round(aj.f * 100) + ' % (' + mil(aj.kcal) + ' kcal' +
        (aj.principal ? ', ' + esc(aj.nombre) + ' ' + aj.principal + ' g' : '') + ')</b> · ';
      f.innerHTML = '<div style="flex:1;min-width:0"><div class="n">' + P.nombre(id) + '</div>' +
        '<div class="m">' + nota + (e.txt ? '<b class="' + e.cl + '">' + e.txt + '</b> · ' : '') +
        (r.grupo || '') + (r.min ? ' · ' + r.min + ' min' : '') + '</div></div>';
      var b = el('button', e.cl === 'casa' ? 'btnv' : 'btng', 'Añadir');
      b.onclick = function () {
        if (cat.fecha) { P.colocar(id, cat.fecha, cat.toma, cat.ranura); }
        cat = null; pintarCatalogo(); pintar();
      };
      f.appendChild(b);
      /* La × solo en lo que NO está usado en ningún día ni es fijo: borrar algo
         que ya comiste dejaría el día cojo (su app). */
      if (P.sueltoBorrable(id)) {
        var bb = el('button', 'tirar', EQUIS);
        bb.title = 'Borrar «' + P.nombre(id) + '» del recetario';
        bb.setAttribute('aria-label', 'Borrar del recetario');
        bb.onclick = function (ev) {
          ev.stopPropagation();
          if (!confirm('¿Borrar «' + P.nombre(id) + '» del recetario?')) return;
          if (P.borrarSuelto(id)) { pintarCatalogo(); pintar(); aviso('Borrado'); }
          else aviso('No se ha podido borrar: está usado en algún día');
        };
        f.appendChild(bb);
      }
      cont.appendChild(f);
    });
  });
  if (!ids.length) cont.appendChild(el('div', 'vacio', 'Ninguna receta cuadra con eso.'));
}

/* ---------- vista de día: un día por pantalla ---------- */
/* control: ✓ comido + cuánto se comió */
function marcaComido(f, tm, id) {
  var on = P.estaComido(f, tm, id);
  var b = el('button', 'tic' + (on ? ' on' : ''));
  b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  b.setAttribute('aria-label', on ? 'Marcar como no comido' : 'Marcar como comido');
  b.title = on ? 'comido' : 'marcar comido';
  b.onclick = function () { P.marcarComido(f, tm, id); pintarDia(); avisaReajuste(); };
  return b;
}
var editando = null;
function controlCantidad(f, tm, item, compacto) {
  var r = P.realDe(f, tm, item);
  var c = el('div', 'cant' + (compacto ? ' compacto' : ''));
  var clave = tm + '|' + item.id;
  if (editando === clave) {
    var inp = el('input'); inp.type = 'text'; inp.value = String(r.c).replace('.', ',');
    inp.className = 'cinput';
    inp.setAttribute('aria-label', 'Cuánto comiste');
    var em = el('button', 'cb', '−'); em.setAttribute('aria-label', 'Menos cantidad');
    em.onclick = function () {
      var v = parseFloat(inp.value.replace(',', '.')); if (isNaN(v)) v = r.c;
      v = Math.max(0, Math.round((v - P.paso(item, r.u)) * 100) / 100);
      inp.value = String(v).replace('.', ','); inp.focus();
    };
    var ep = el('button', 'cb', '+'); ep.setAttribute('aria-label', 'Más cantidad');
    ep.onclick = function () {
      var v = parseFloat(inp.value.replace(',', '.')); if (isNaN(v)) v = r.c;
      v = Math.round((v + P.paso(item, r.u)) * 100) / 100;
      inp.value = String(v).replace('.', ','); inp.focus();
    };
    c.appendChild(em); c.appendChild(inp); c.appendChild(ep);
    var us = P.unidades(item);
    us.forEach(function (u) {
      var bu = el('button', 'cu' + (u === r.u ? ' on' : ''), u === 'rac' ? 'rac.' : u);
      bu.onclick = function () {
        var v = parseFloat(inp.value.replace(',', '.'));
        if (isNaN(v)) v = r.c;
        P.ponerReal(f, tm, item, v, u); editando = null; pintarDia();
      };
      c.appendChild(bu);
    });
    var ok = el('button', 'cok', 'Guardar');
    ok.onclick = function () {
      var v = parseFloat(inp.value.replace(',', '.'));
      if (!isNaN(v)) P.ponerReal(f, tm, item, v, r.u);
      editando = null; pintarDia();
    };
    c.appendChild(ok);
    setTimeout(function () { inp.focus(); inp.select(); }, 10);
    inp.onkeydown = function (ev) { if (ev.key === 'Enter') ok.click(); if (ev.key === 'Escape') { editando = null; pintarDia(); } };
    return c;
  }
  var val = el('button', 'cv', P.unidadTexto(r.c, r.u));
  val.setAttribute('aria-label', 'Cambiar la cantidad comida');
  val.onclick = function () { editando = clave; pintarDia(); };
  if (compacto) { c.appendChild(val); return c; }
  var men = el('button', 'cb', '−');
  men.setAttribute('aria-label', 'Menos cantidad');
  men.onclick = function () { P.ponerReal(f, tm, item, r.c - P.paso(item, r.u), r.u); pintarDia(); };
  var mas = el('button', 'cb', '+');
  mas.setAttribute('aria-label', 'Más cantidad');
  mas.onclick = function () { P.ponerReal(f, tm, item, r.c + P.paso(item, r.u), r.u); pintarDia(); };
  c.appendChild(men); c.appendChild(val); c.appendChild(mas);
  return c;
}


var DOW = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];
var DOWL = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
function dow(f) { return (new Date(f + 'T12:00:00').getDay() + 6) % 7; }

/* ---- calendario desplegable para buscar día ---- */
var CAL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';
var calMes = null;
function abrirCalendario(f, anclaje) {
  calMes = f.slice(0, 7);
  pintarCalendario(f, anclaje);
}
function pintarCalendario(f, anclaje) {
  cerrarCalendario();
  var pop = el('div', 'calpop');
  pop.id = 'calpop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Elegir día');
  var anio = Number(calMes.slice(0, 4)), mes = Number(calMes.slice(5, 7));

  var cab = el('div', 'cal-cab');
  var ant = el('button', 'cal-nav', '‹'); ant.setAttribute('aria-label', 'Mes anterior');
  ant.onclick = function (ev) { ev.stopPropagation();
    var m = mes - 1, a = anio; if (m < 1) { m = 12; a--; }
    calMes = a + '-' + String(m).padStart(2, '0'); pintarCalendario(f, anclaje); };
  var sig = el('button', 'cal-nav', '›'); sig.setAttribute('aria-label', 'Mes siguiente');
  sig.onclick = function (ev) { ev.stopPropagation();
    var m = mes + 1, a = anio; if (m > 12) { m = 1; a++; }
    calMes = a + '-' + String(m).padStart(2, '0'); pintarCalendario(f, anclaje); };
  cab.appendChild(ant);
  cab.appendChild(el('span', 'cal-tit', P.MESES[mes - 1] + ' de ' + anio));
  cab.appendChild(sig);
  pop.appendChild(cab);

  var rej = el('div', 'cal-rej');
  ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(function (d) { rej.appendChild(el('span', 'cal-dow', d)); });
  var primero = new Date(anio, mes - 1, 1);
  var hueco = (primero.getDay() + 6) % 7;
  for (var i = 0; i < hueco; i++) rej.appendChild(el('span', 'cal-vacio'));
  var dias = new Date(anio, mes, 0).getDate();
  for (var d = 1; d <= dias; d++) {
    (function (dd) {
      var fe = anio + '-' + String(mes).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
      var n = P.cuantosPlatos(fe);
      var b = el('button', 'cal-d' + (fe === f ? ' sel' : '') + (fe === P.HOY ? ' hoy' : '') +
        (n ? '' : ' sinnada'));
      b.innerHTML = '<span class="dn">' + dd + '</span>' + (n ? '<span class="pts">' + (n > 3 ? '•••' : Array(n + 1).join('•')) + '</span>' : '<span class="pts"></span>');
      b.title = n ? n + (n === 1 ? ' plato' : ' platos') : 'sin nada puesto';
      b.onclick = function (ev) { ev.stopPropagation();
        P.E().diaVisto = fe; P.guardar(); cerrarCalendario(); pintarDia(); };
      rej.appendChild(b);
    })(d);
  }
  pop.appendChild(rej);

  var r = anclaje.getBoundingClientRect();
  pop.style.left = Math.round(r.left + window.scrollX) + 'px';
  pop.style.top = Math.round(r.bottom + window.scrollY + 6) + 'px';
  document.body.appendChild(pop);
  var fuera = function (ev) { if (!pop.contains(ev.target)) cerrarCalendario(); };
  pop._fuera = fuera;
  setTimeout(function () { document.addEventListener('mousedown', fuera); }, 0);
  pop._esc = function (ev) { if (ev.key === 'Escape') cerrarCalendario(); };
  document.addEventListener('keydown', pop._esc);
}
function cerrarCalendario() {
  var p = document.getElementById('calpop');
  if (!p) return;
  if (p._fuera) document.removeEventListener('mousedown', p._fuera);
  if (p._esc) document.removeEventListener('keydown', p._esc);
  p.remove();
}

/* «Comprado y sin comer»: platos de dias ya pasados que se compraron y nunca se
   marcaron. Mientras esten en esta lista no se vuelven a pedir en la compra, asi
   que o se reprograman, o se dan por comidos, o se dice que ya no queda. */
var verTodoPend = false;
function bloquePendientes() {
  var l = P.pendientes();
  if (!l.length) return null;
  var c = el('div', 'tarjeta pend');
  var cab = el('div', 'cabsec');
  cab.innerHTML = '<h2>Comprado y sin comer</h2><span class="sub">' +
    plural(l.length, 'plato', 'platos') + ' de días que ya pasaron. Mientras estén aquí ' +
    'no se vuelven a pedir en la compra.</span>';
  c.appendChild(cab);
  var TOPE = 8;
  var ver = verTodoPend ? l.length : Math.min(TOPE, l.length);
  var caja = el('div', 'pendl');
  l.slice(0, ver).forEach(function (p) {
    var fi = el('div', 'pendf');
    fi.innerHTML = '<div class="n">' + esc(p.n) + '<small>' + DOWL[dow(p.f)] + ' ' +
      P.diaNum(p.f) + ' de ' + P.mesDe(p.f) + ' · ' + p.toma + '</small></div>';
    var der = el('div', 'der');
    var b1 = el('button', 'btn', 'Reprogramar');
    b1.title = 'Lo lleva al primer día futuro con esa toma libre';
    b1.onclick = function () {
      var d = P.reprogramarPendiente(p.f, p.toma, p.id);
      pintar(); pintarDia();
      aviso(!d ? 'No hay sitio en las próximas tres semanas'
              : d.junto ? 'Puesto el ' + P.diaNum(d.f) + ' de ' + P.mesDe(d.f) + ', junto a lo que ya había'
                        : 'Movido al ' + P.diaNum(d.f) + ' de ' + P.mesDe(d.f));
    };
    var b2 = el('button', 'btn', 'Me lo comí');
    b2.title = 'Sí me lo comí: cuenta en las calorías de aquel día';
    b2.onclick = function () {
      P.pendienteComido(p.f, p.toma, p.id); pintar(); pintarDia();
      aviso('Apuntado como comido el ' + P.diaNum(p.f) + ' de ' + P.mesDe(p.f));
    };
    var b3 = el('button', 'btn', 'Ya no está');
    b3.title = 'Ya no queda: se gastó, se tiró o se comió otra cosa';
    b3.onclick = function () { P.pendienteFuera(p.f, p.toma, p.id); pintar(); pintarDia(); aviso('Fuera de la lista'); };
    der.appendChild(b1); der.appendChild(b2); der.appendChild(b3);
    fi.appendChild(der);
    caja.appendChild(fi);
  });
  c.appendChild(caja);
  var pie = el('div', 'pendpie');
  if (l.length > TOPE) {
    var bv = el('button', 'btn', verTodoPend ? 'Ver solo los primeros ' + TOPE : 'Ver los ' + l.length);
    bv.onclick = function () { verTodoPend = !verTodoPend; pintarDia(); };
    pie.appendChild(bv);
  }
  var bx = el('button', 'btn', 'Vaciar la lista: ya no queda nada de esto');
  bx.onclick = function () {
    if (!confirm('Se quitan de la lista los ' + l.length + ' platos, como si ya no quedara nada de ellos ' +
      'en casa. Sus ingredientes vuelven a pedirse en la compra cuando esos platos se planifiquen otra vez. ' +
      '¿Seguimos?')) return;
    var n = P.vaciarPendientes(); verTodoPend = false; pintar(); pintarDia();
    aviso('Lista vaciada: ' + plural(n, 'plato', 'platos'));
  };
  pie.appendChild(bx);
  c.appendChild(pie);
  return c;
}

function pintarDia() {
  var E = P.E(), v = $('#vista-dia');
  if (!E.diaVisto) E.diaVisto = P.HOY;
  var f = E.diaVisto;
  v.innerHTML = '';

  /* la media de la semana en curso, arriba del todo */
  var bs = bloqueSemana(f);
  if (bs) v.appendChild(bs);

  var bp = bloquePendientes();
  if (bp) v.appendChild(bp);

  /* buscar día: calendario desplegable */
  var bus = el('div', 'buscad');
  bus.appendChild(el('span', 'lab', 'Buscar día'));
  var bcal = el('button', 'btncal');
  bcal.innerHTML = CAL + '<span>' + DOWL[dow(f)] + ' ' + P.diaNum(f) + ' de ' + P.mesDe(f) +
    ' de ' + f.slice(0, 4) + '</span>' + CHEV;
  bcal.setAttribute('aria-haspopup', 'dialog');
  bcal.onclick = function (ev) { ev.stopPropagation(); abrirCalendario(f, bcal); };
  bus.appendChild(bcal);
  var bhoy = el('button', 'btng', 'Hoy');
  bhoy.onclick = function () { E.diaVisto = P.HOY; P.guardar(); pintarDia(); };
  bus.appendChild(bhoy);
  v.appendChild(bus);

  /* anterior / siguiente y tira de nueve días */
  var nav = el('div', 'navdia');
  var ant = el('button', 'btng', '‹ Anterior');
  ant.onclick = function () { E.diaVisto = P.masDias(f, -1); P.guardar(); pintarDia(); };
  var sig = el('button', 'btng', 'Siguiente ›');
  sig.onclick = function () { E.diaVisto = P.masDias(f, 1); P.guardar(); pintarDia(); };
  var ini = P.masDias(f, -4), fin = P.masDias(f, 4);
  nav.appendChild(ant);
  nav.appendChild(el('span', 'rango', P.diaNum(ini) + ' ' + P.mesDe(ini).slice(0, 3) + ' – ' + P.diaNum(fin) + ' ' + P.mesDe(fin).slice(0, 3)));
  nav.appendChild(sig);
  v.appendChild(nav);

  var tira = el('div', 'tira');
  for (var k = -4; k <= 4; k++) {
    (function (dd) {
      var fe = P.masDias(f, dd);
      var c = el('button', 'tdia' + (dd === 0 ? ' sel' : ''));
      c.innerHTML = '<span class="dow">' + DOW[dow(fe)] + '</span><span class="num">' + P.diaNum(fe) + '</span>' +
        '<span class="cnt">' + P.cuantosPlatos(fe) + '</span>';
      c.onclick = function () { E.diaVisto = fe; P.guardar(); pintarDia(); };
      tira.appendChild(c);
    })(k);
  }
  v.appendChild(tira);

  var vw = el('button', 'verweek', 'Ver la semana entera en el planificador');
  vw.onclick = function () { irA('plan'); };
  v.appendChild(vw);

  /* título */
  var tit = el('div', 'titdia');
  tit.innerHTML = '<h2>' + DOWL[dow(f)] + ' ' + P.diaNum(f) + ' de ' + P.mesDe(f) + '</h2>' +
    (f === P.HOY ? '<span class="hoy">HOY</span>' : '') +
    (P.estaCerrado(f) ? '<span class="cerrado">día cerrado</span>' : '');
  var dcd = el('div', 'der-tit');
  if (P.estaCerrado(f)) {
    /* «Editar» y no «Reabrir»: es la palabra que usa su app, y dice mejor lo
       que va a pasar — el día sigue siendo el que fue, se corrige. */
    var ab = el('button', 'btng', 'Editar');
    ab.title = 'Volver a tocar este día. Queda el sello de corregido a mano.';
    ab.onclick = function () { P.abrirDia(f); pintarDia(); };
    dcd.appendChild(ab);
  } else {
    /* Vaciar el día entero, con Deshacer mientras siga vacío. En cuanto vuelves
       a poner algo, el botón pasa a ser Vaciar otra vez: así nunca hay un
       Deshacer al acecho que te borre lo recién puesto (su app, 23-sep). */
    if (P.sePuedeDeshacer(f)) {
      var dh = el('button', 'btng', 'Deshacer');
      dh.title = 'Devuelve lo que acabas de vaciar';
      dh.onclick = function () {
        var n2 = P.deshacerVaciar(f);
        pintar(); pintarDia();
        aviso2(n2 ? 'Devuelto tal y como estaba · ' + plural(n2, 'plato', 'platos') : 'No había nada que devolver');
      };
      dcd.appendChild(dh);
    } else if (P.cuantosDelDia(f)) {
      var vd = el('button', 'btng', 'Vaciar');
      vd.title = 'Deja el día entero vacío';
      vd.onclick = function () {
        var n2 = P.cuantosDelDia(f);
        if (!confirm('Vaciar el día deja fuera ' + plural(n2, 'plato', 'platos') +
          ', caprichos incluidos, y los fijos no vuelven solos.\n\nTienes Deshacer al lado mientras el día siga vacío.\n\n¿Seguimos?')) return;
        var q = P.vaciarDia(f);
        pintar(); pintarDia();
        aviso2('Día vaciado: ' + plural(q, 'plato', 'platos') + '. Tienes Deshacer arriba.');
      };
      dcd.appendChild(vd);
    }
    var cd = el('button', 'btnv', 'Cerrar el día');
    cd.onclick = function () {
      var pend = P.sinMarcar(f);
      var aviso = pend
        ? 'Cerrar el día:\n\n· se marcan como comidos los ' + pend + (pend === 1 ? ' plato que queda' : ' platos que quedan') +
          '\n· se descuentan de la despensa\n· los números quedan fijos\n\n¿Seguimos?'
        : 'Todo está ya marcado. ¿Dejamos el día fijo?';
      if (!confirm(aviso)) return;
      var r = P.cerrarDia(f);
      pintarDia();
      aviso2(r && r.hechos ? 'Día cerrado · ' + r.hechos + (r.hechos === 1 ? ' plato marcado' : ' platos marcados') : 'Día cerrado');
    };
    dcd.appendChild(cd);
  }
  tit.appendChild(dcd);
  v.appendChild(tit);
  var np = notaDiaPasado(f);
  if (np) v.appendChild(np);
  v.appendChild(bloqueTipoDia(f));

  v.appendChild(resumenDia(f));
  P.TOMAS.forEach(function (tm) { v.appendChild(tarjetaToma(f, tm)); });
  v.appendChild(tarjetaCaprichos(f));
  v.appendChild(tarjetaEjercicio(f));
}

/* EL AVISO DE DÍA PASADO  ·  5-nov-2026
   Replicado de su app. Son DOS estados distintos y conviene no confundirlos:
   el día ya cerrado —congelado, no se toca— y el día pasado que estás
   corrigiendo, que sí acepta cambios y hay que volver a cerrar. */
function notaDiaPasado(f) {
  var cerrado = P.estaCerrado(f), pasado = (f < P.HOY);
  if (!cerrado && !pasado) return null;
  var corr = P.corregidoEl(f);
  var sello = corr ? ' · <b>Corregido a mano</b> el ' + corr.slice(8, 10) + '/' + corr.slice(5, 7) : '';
  var c = el('div', 'notapasado' + (cerrado ? '' : ' editando'));
  c.innerHTML = cerrado
    ? 'Día <b>congelado</b>: lo marcado y las cantidades son las que quedaron al cerrarlo, y ya ' +
      'salieron de la despensa. Para cambiar algo, dale a <b>Editar</b>.' + sello
    : 'Estás <b>corrigiendo un día pasado</b>. Lo que añadas se guarda con los valores de hoy; lo ' +
      'que quites desaparece del día. Dale a <b>Cerrar el día</b> cuando termines.' + sello;
  return c;
}

/* En casa / Outdoor, y la salida planificada de un día de ruta. */
/* En Día a día el tipo de día solo SE INFORMA: se cambia en el planificador
   (Carlos, 5-nov). Aquí se ve qué es el día y qué salida tiene. */
function bloqueTipoDia(f) {
  var tp = P.tipoDia(f), tipos = P.tiposDia();
  var c = el('div', 'tipodia');
  var et = el('span', 'tdinfo' + (tp === 'ruta' ? ' ruta' : ''));
  et.innerHTML = (tipos[tp].icono || '') + ' <b>' + tipos[tp].n + '</b>';
  c.appendChild(et);
  if (tp !== 'ruta') {
    c.appendChild(el('span', 'tdcomo', 'se cambia en el planificador'));
    return c;
  }
  var fr = P.fichaRuta(f);
  c.appendChild(el('span', 'sintope', 'sin tope de sal'));
  c.appendChild(el('span', 'tdcomo', 'se cambia en el planificador'));
  c.appendChild(el('div', 'rnota', fr
    ? '<b>' + fr.n + '</b>, ' + String(fr.h).replace('.', ',') + ' h · <b>+' + mil(fr.kcal) + ' kcal</b> al objetivo. ' +
      'Desayuno y cena en casa; almuerzo, comida y merienda, de mochila. <b>Sin tope de sal</b>: sudando se ' +
      'pierden unos 2,1 g por litro, más de lo que cabe en el tope de un día entero.'
    : 'Día de salida <b>sin salida puesta</b>: ponla en el planificador para que suba la demanda calórica. ' +
      'Almuerzo, comida y merienda van de mochila.'));
  return c;
}


function tarjetaToma(f, tm) {
  var c = el('div', 'toma');
  var d = P.dia(f)[tm] || [];
  var esPrincipal = (tm === 'comida' || tm === 'cena');
  var cerrado = P.estaCerrado(f);
  var platos = P.platosDe(f, tm);
  var cuota = P.cuotaToma(f, tm), kt = P.kcalToma(f, tm), st = P.salToma(f, tm);

  /* ---- cabecera: nombre, cuota / puesto, sal, comensales, fuera, añadir ---- */
  var cab = el('div', 'cabt');
  cab.innerHTML = '<b>' + tm.toUpperCase() + '</b>' +
    (cuota || kt ? '<span class="ktoma"><b>' + mil(cuota) + '</b> / ' + mil(kt) + ' kcal</span>' : '') +
    (st ? '<span class="stoma">' + String(st).replace('.', ',') + ' g de sal</span>' : '') +
    (P.deMochila(f, tm) ? '<span class="mochila" title="Día de salida: esta toma va en la mochila">de mochila</span>' : '') +
    ((tm === 'almuerzo' || tm === 'merienda') ? '<span class="peque">solo si entrenas</span>' : '');
  var der = el('div', 'der');
  if (!cerrado) {
    var np = P.pax(f, tm);
    var pxg = el('div', 'paxg' + (np === 1 ? ' uno' : '') + (np > 2 ? ' varios' : ''));
    pxg.title = 'Cuántos se sientan a la mesa. Cambia lo que sale de la despensa y lo que hay ' +
      'que comprar, no tus calorías.';
    var pm = el('button', 'pb', '−'); pm.setAttribute('aria-label', 'Un comensal menos');
    pm.onclick = function () { P.ponerPax(f, tm, np - 1); pintarDia(); };
    var pn = el('span', 'pn', String(np));
    var pp = el('button', 'pb', '+'); pp.setAttribute('aria-label', 'Un comensal más');
    pp.onclick = function () { P.ponerPax(f, tm, np + 1); pintarDia(); };
    pxg.appendChild(pm); pxg.appendChild(pn); pxg.appendChild(pp);
    der.appendChild(pxg);
    if (esPrincipal) {
      var bf = el('button', 'btng' + (d.fuera ? ' uno' : ''), 'Fuera');
      bf.onclick = function () { P.marcarFuera(f, tm); pintarDia(); };
      der.appendChild(bf);
    }
    {
      var ba = el('button', 'btng', MAS);
      ba.setAttribute('aria-label', P.esFueraT(f, tm) ? 'Apuntar lo que comes fuera' : 'Añadir algo a la ' + tm);
      ba.title = P.esFueraT(f, tm) ? 'Apuntar lo que has comido fuera' : 'Añadir';
      ba.onclick = function () {
        if (P.esFueraT(f, tm)) abrirPicoteo(f, tm, 'fuera');
        else if (tm === 'almuerzo' || tm === 'merienda') abrirPicoteo(f, tm, 'bloques');
        else if (esPrincipal) abrirCatalogo(f, tm, P.propios(f, tm).length ? 1 : 0, null);
        else abrirFijoDia(f, tm, 'yo', P.PAPELES[tm][0]);
      };
      der.appendChild(ba);
    }
  } else {
    der.appendChild(el('span', 'paxg quieto', '<span class="pn">' + P.pax(f, tm) + '</span>'));
  }
  cab.appendChild(der);
  c.appendChild(cab);

  if (P.esFueraT(f, tm)) {
    var est = P.estimacionFuera(tm);
    var av = el('div', 'fuera-nota');
    av.innerHTML = '<b>Comemos fuera de casa.</b> ' + (platos.length
      ? 'Se cuenta lo que apuntes aquí.'
      : 'Sin apuntar nada se cuenta la estimación de Ajustes' +
        (est ? ': <b>' + mil(est.k) + ' kcal</b> y ' + coma(est.sal) + ' g de sal' : '') +
        '. Apunta los platos con el + para afinarlo.');
    c.appendChild(av);
    platos.forEach(function (it) { c.appendChild(filaPlato(f, tm, it, cerrado)); });
    c.appendChild(lineaQuitados(f, tm, cerrado));
    return c;
  }
  if (!platos.length) {
    var vac = el('div', 'ss-nada');
    vac.appendChild(el('span', '', 'Nada puesto'));
    if (!cerrado) {
      var add = el('button', 'cam', 'poner algo');
      add.onclick = function () {
        if (tm === 'almuerzo' || tm === 'merienda') abrirPicoteo(f, tm, 'bloques');
        else if (esPrincipal) abrirCatalogo(f, tm, 0, null);
        else abrirFijoDia(f, tm, 'yo', P.PAPELES[tm][0]);
      };
      vac.appendChild(add);
    }
    c.appendChild(vac);
    return c;
  }

  platos.forEach(function (it) {
    c.appendChild(filaPlato(f, tm, it, cerrado));
  });
  c.appendChild(lineaQuitados(f, tm, cerrado));
  return c;
}

/* Lo que hoy se ha quitado de los fijos, para que se vea y se pueda devolver. */
function lineaQuitados(f, tm, cerrado) {
  var q = P.quitadosDe(f, tm);
  if (!q.length) return document.createComment('');
  var c = el('div', 'quitados');
  c.appendChild(el('span', 'qt', 'HOY NO'));
  q.forEach(function (x) {
    var p = el('span', 'qp');
    p.innerHTML = x.nombre + ' <i>(' + (x.quien === 'yo' ? 'tuyo' : 'de Susana') + ')</i>';
    if (!cerrado) {
      var b = el('button', 'qv', 'volver a ponerlo');
      b.onclick = function () { P.soltarFijoDia(f, tm, x.quien, x.papel); pintarDia(); };
      p.appendChild(b);
    }
    c.appendChild(p);
  });
  if (cerrado) c.appendChild(el('span', 'qc', 'el día está cerrado: no se descontó de la despensa'));
  return c;
}

/* Selector de bloques de 100 y piezas (almuerzo y merienda) y de fichas de
   restaurante (una toma marcada como fuera). */
var pic = null;
function abrirPicoteo(f, tm, modo) { pic = { f: f, tm: tm, modo: modo, busca: '', seccion: modo === 'fuera' ? 'rest' : 'bloques' }; pintarPicoteo(); }
function pintarPicoteo() {
  var capa = $('#capa');
  if (!pic) { capa.innerHTML = ''; capa.className = ''; return; }
  capa.className = 'capa'; capa.innerHTML = '';
  var m = el('div', 'modal');
  var falta = P.cuotaToma(pic.f, pic.tm) - P.kcalToma(pic.f, pic.tm);
  m.appendChild(el('div', 'modcab', '<div style="flex:1"><div class="t">' +
    (pic.modo === 'fuera' ? 'Apuntar lo que comes fuera' : 'Añadir a ' + (pic.tm === 'almuerzo' ? 'el almuerzo' : 'la merienda')) +
    '</div><div class="s">' + (pic.modo === 'fuera'
      ? 'Elige del catálogo de restaurante o de tus propias fichas: lo que apuntes manda sobre la estimación.'
      : 'Te ' + (falta >= 0 ? 'faltan <b>' + mil(falta) + ' kcal</b>' : 'sobran <b>' + mil(-falta) + ' kcal</b>') +
        ' para la cuota de esta toma. Ve sumando bloques y para cuando quieras.') +
    '</div></div>'));

  var fl = el('div', 'modfil');
  var bus = el('div', 'busca', LUPA);
  var inp = el('input'); inp.type = 'text'; inp.value = pic.busca;
  inp.placeholder = pic.modo === 'fuera' ? 'menú, hamburguesa, pizza…' : 'plátano, yogur, almendra…';
  inp.oninput = function () { pic.busca = inp.value; listaPicoteo(); };
  bus.appendChild(inp); fl.appendChild(bus);
  var secs = pic.modo === 'fuera'
    ? [['rest', 'De restaurante'], ['todo', 'Todas tus fichas']]
    : [['bloques', 'Bloques de 100'], ['piezas', 'Piezas enteras'], ['bebidas', 'Bebidas'], ['otras', 'Lo demás']];
  var ch = el('div', 'chips');
  secs.forEach(function (x) {
    var b = el('button', 'chip' + (pic.seccion === x[0] ? ' on' : ''), x[1]);
    b.onclick = function () { pic.seccion = x[0]; pintarPicoteo(); };
    ch.appendChild(b);
  });
  fl.appendChild(ch); m.appendChild(fl);
  var lista = el('div', 'modlista'); lista.id = 'piclista'; m.appendChild(lista);
  m.appendChild(el('div', 'modpie', '<span id="picpie"></span>'));
  var cerrar = el('button', 'mini', EQUIS);
  cerrar.style.cssText = 'width:34px;height:34px;border-radius:9px;position:absolute;right:26px;top:26px';
  cerrar.setAttribute('aria-label', 'Cerrar');
  cerrar.onclick = function () { pic = null; pintarPicoteo(); };
  m.style.position = 'relative'; m.appendChild(cerrar);
  capa.appendChild(m);
  capa.onclick = function (ev) { if (ev.target === capa) { pic = null; pintarPicoteo(); } };
  listaPicoteo();
  setTimeout(function () { inp.focus(); }, 20);
}
function listaPicoteo() {
  var cont = document.getElementById('piclista'); if (!cont) return;
  cont.innerHTML = '';
  var items;
  if (pic.modo === 'fuera') {
    items = pic.seccion === 'rest' ? P.fichasRestaurante(pic.busca)
      : P.RECETAS.filter(function (r) { return P.valeCC(r); })
          .filter(function (r) { var q = pic.busca.trim().toLowerCase();
            return !q || ((r.corto || '') + ' ' + r.n).toLowerCase().indexOf(q) >= 0; })
          .map(function (r) { return { id: r.id, n: r.corto || r.n, k: P.kcalFicha(r) }; })
          .sort(function (a, b) { return a.n.localeCompare(b.n); });
  } else {
    items = P.bloquesDe(pic.tm, pic.busca)[pic.seccion] || [];
  }
  var pie = document.getElementById('picpie');
  if (pie) pie.textContent = items.length + (items.length === 1 ? ' ficha' : ' fichas');
  if (!items.length) {
    cont.appendChild(el('div', 'vacio', pic.modo === 'fuera' && pic.seccion === 'rest'
      ? 'Solo tienes una ficha de restaurante en el recetario. Prueba con «Todas tus fichas», o crea las de los sitios a los que vas.'
      : 'Nada con ese nombre en esta sección.'));
    return;
  }
  items.slice(0, 120).forEach(function (it) {
    var fi = el('div', 'rec');
    fi.innerHTML = '<div style="flex:1;min-width:0"><div class="n">' + it.n + '</div>' +
      '<div class="m">' + (it.k ? mil(it.k) + ' kcal' : 'sin calorías en la ficha') + '</div></div>';
    var b = el('button', 'btng', 'Añadir');
    b.onclick = function () {
      P.anadirA(pic.f, pic.tm, it.id);
      var sigue = P.cuotaToma(pic.f, pic.tm) - P.kcalToma(pic.f, pic.tm);
      pintarDia();
      if (pic.modo === 'bloques') { pintarPicoteo(); aviso2('Añadido · ' + (sigue > 0 ? 'te faltan ' + mil(sigue) + ' kcal' : 'cuota cubierta')); }
      else { pic = null; pintarPicoteo(); aviso2('Apuntado'); }
    };
    fi.appendChild(b);
    cont.appendChild(fi);
  });
}

/* Una fila de plato, como la de su app: ✓, nombre y nutrientes, calorías,
   quién se lo come y la ✕. */
function filaPlato(f, tm, it, cerrado) {
  var comido = !it.suelto && P.estaComido(f, tm, it.id);
  var pl = el('div', 'plato' + (comido ? ' comido' : '') + (it.quien === 'susana' ? ' ajeno' : ''));

  if (it.suelto || cerrado && false) pl.appendChild(el('span', 'tic hueco'));
  else pl.appendChild(marcaComido(f, tm, it.id));

  var izq = el('div', 'pl-izq');
  var e = it.suelto ? null : P.estadoDe(it.id);
  var nn = el('div', 'n');
  nn.innerHTML = (e ? '<span class="pt ' + e.cl + '"></span>' : '') +
    (it.suelto ? P.nombreDe({ t: 'i', id: it.id })
               : '<button class="nomr" title="Ver la receta con las cantidades de este día">' +
                 P.nombreDe({ t: 'r', id: it.id }) + '</button>') +
    (it.veces > 1 ? '<span class="veces">×' + it.veces + '</span>' : '') +
    (it.fijo ? '<span class="esfijo" title="Sale solo todos los días. Se cambia en la tabla de fijos del planificador.">fijo</span>' : '');
  if (!it.suelto) {
    var bn = nn.querySelector('.nomr');
    /* SU ficha, no la mia (Carlos, 5-nov): «las recetas has cambiado la
       presentacion que antes era casi perfecta, ordenada por tiempos y los
       utensilios de cocina usados». La de la app trae eso y mucho mas —pesar un
       ingrediente, el lapiz de las cantidades, estrellas, coste—; aqui se abria
       una version recortada que hice para el prototipo, donde la de verdad no
       existia. */
    if (bn) bn.onclick = function (ev) { ev.stopPropagation(); abrirFicha(it.id, f, tm); };
  }
  izq.appendChild(nn);

  var pie = el('div', 'pl-pie');
  var nu = it.suelto ? null : P.nutrPlato(f, tm, it.id);
  if (nu) {
    pie.innerHTML = '<span class="nutri">P ' + Math.round(nu.p) + ' · G ' + Math.round(nu.g) +
      ' · H ' + Math.round(nu.h) + ' g · ' + coma(nu.sal) + ' g de sal</span>';
  }
  if (it.suelto) {
    var sf = el('span', 'sinficha', 'sin ficha');
    sf.title = 'Está puesto como ingrediente suelto, no como ficha de receta. No entra en el ' +
      'plan, ni en la compra, ni sale de la despensa.';
    pie.appendChild(sf);
  } else if (e && e.txt) {
    var ff = el('span', 'f ' + e.cl, e.txt); ff.title = e.txt;
    pie.appendChild(ff);
  }
  if (!it.suelto) {
    var bc = el('button', 'cocinar', '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M4 14h16"/><path d="M5 14a7 7 0 0 1 14 0"/><path d="M3 18h18"/><path d="M9 7V4"/>' +
      '<path d="M12 7V3"/><path d="M15 7V4"/></svg> Cocinar');
    bc.title = 'Abrir la receta por la elaboración';
    bc.onclick = function (ev) { ev.stopPropagation(); abrirFicha(it.id, f, tm); };
    pie.appendChild(bc);
    pie.appendChild(preguntaComido(f, tm, { t: 'r', id: it.id }));
  }
  izq.appendChild(pie);
  pl.appendChild(izq);

  /* calorías */
  var kc = el('span', 'pl-kcal' + (it.quien === 'susana' ? ' ajena' : ''));
  if (nu) {
    kc.textContent = it.quien === 'susana' ? 'no cuenta' : mil(nu.k) + ' kcal';
    if (it.quien === 'susana') kc.title = mil(nu.k) + ' kcal que no te cuentan';
  } else kc.textContent = '';
  pl.appendChild(kc);

  /* quién se lo come */
  if (cerrado) {
    if (it.quien !== 'dos') pl.appendChild(el('span', 'pl-quien fijo q-' + it.quien, P.ETIQ_QUIEN[it.quien]));
  } else if (it.suelto) {
    pl.appendChild(el('span', 'pl-quien fijo q-' + it.quien, P.ETIQ_QUIEN[it.quien]));
  } else {
    var s = el('select', 'pl-quien q-' + it.quien);
    s.setAttribute('aria-label', 'Quién se lo come');
    s.title = 'Los dos: se compra y se descuenta por comensales y te cuenta. ' +
      'Solo Carlos: para uno y te cuenta. Solo Susana: para uno y no te cuenta.';
    P.QUIEN.forEach(function (k) {
      var o = el('option', '', P.ETIQ_QUIEN[k]); o.value = k;
      if (k === it.quien) o.selected = true;
      s.appendChild(o);
    });
    s.onchange = function () { P.ponerQuien(f, tm, it.id, s.value); pintarDia(); avisaReajuste(); };
    pl.appendChild(s);
  }

  if (!cerrado) {
    var x = el('button', 'mini', EQUIS);
    x.setAttribute('aria-label', 'Quitar ' + P.nombre(it.id));
    x.title = it.fijo ? 'Hoy no' : (it.veces > 1 ? 'Quitar los ' + it.veces : 'Quitar');
    x.onclick = function () { P.quitarPlato(f, tm, it.id); pintarDia(); avisaReajuste(); };
    pl.appendChild(x);
  }
  return pl;
}

/* «¿Cuánto comiste?», como lo preguntaba la pantalla vieja: un botón que abre
   el campo donde se escribe la cantidad de verdad. Sin + ni −. */
function preguntaComido(f, tm, item) {
  var r = P.realDe(f, tm, item);
  var clave = tm + '|' + item.id;
  var c = el('span', 'cant');
  if (editando === clave) {
    var inp = el('input'); inp.type = 'text'; inp.className = 'cinput';
    inp.value = String(r.c).replace('.', ',');
    inp.setAttribute('aria-label', 'Cuánto comiste');
    c.appendChild(inp);
    var us = P.unidades(item);
    us.forEach(function (u) {
      var bu = el('button', 'cu' + (u === r.u ? ' on' : ''), u === 'rac' ? 'rac.' : u);
      bu.onclick = function () {
        var v = parseFloat(inp.value.replace(',', '.')); if (isNaN(v)) v = r.c;
        P.ponerReal(f, tm, item, v, u); editando = null; pintarDia();
      };
      c.appendChild(bu);
    });
    var ok = el('button', 'cok', 'Guardar');
    ok.onclick = function () {
      var v = parseFloat(inp.value.replace(',', '.'));
      if (!isNaN(v)) P.ponerReal(f, tm, item, v, r.u);
      editando = null; pintarDia();
    };
    c.appendChild(ok);
    setTimeout(function () { inp.focus(); inp.select(); }, 10);
    inp.onkeydown = function (ev) { if (ev.key === 'Enter') ok.click(); if (ev.key === 'Escape') { editando = null; pintarDia(); } };
    return c;
  }
  /* LA CANTIDAD, PUESTA DESDE EL PRINCIPIO (Carlos, 5-nov): «al poner comido me
     pones los gramos o raciones base de ese alimento… si no hay modificado se
     anota eso. Pero esta la opcion de modificar esa cantidad». Antes el boton
     decia «cuanto comiste?» y no ensenaba nada hasta tocarlo, asi que no se veia
     lo que se estaba dando por comido. Ahora la racion base sale siempre, en
     gris; si la cambias, se marca. */
  var tocado = P.hayReal && P.hayReal(f, tm, item);
  var txt = P.unidadTexto(r.c, r.u);
  var b = el('button', 'cpreg' + (tocado ? ' si' : ' base'), txt);
  b.title = tocado ? 'Comiste ' + txt + ' — tócalo para cambiarlo'
                   : 'Es lo que se anota si no lo cambias. Tócalo para poner otra cantidad.';
  b.onclick = function () { editando = clave; pintarDia(); };
  c.appendChild(b);
  return c;
}

/* cambiar un fijo SOLO para este día */
var fdia = null;
function abrirFijoDia(fecha, toma, quien, papel) {
  fdia = { fecha: fecha, toma: toma, quien: quien, papel: papel, busca: '' };
  pintarFijoDia();
}
function pintarFijoDia() {
  var capa = $('#capa');
  if (!fdia) { capa.innerHTML = ''; capa.className = ''; return; }
  capa.className = 'capa'; capa.innerHTML = '';
  var m = el('div', 'modal');
  var quienTxt = fdia.quien === 'yo' ? 'Carlos' : 'Susana';
  var act = P.fijoDelDia(fdia.fecha, fdia.toma, fdia.quien, fdia.papel);
  m.appendChild(el('div', 'modcab', '<div style="flex:1"><div class="t">' + P.ETIQ_PAPEL[fdia.papel] + ' de ' + quienTxt +
    ', solo el ' + P.diaNum(fdia.fecha) + ' de ' + P.mesDe(fdia.fecha) +
    '</div><div class="s">no toca la tabla de fijos: vale solo para este día</div></div>'));
  var fl = el('div', 'modfil');
  var bus = el('div', 'busca', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#46564f" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>');
  var inp = el('input'); inp.type = 'text'; inp.placeholder = 'busca por nombre…'; inp.value = fdia.busca;
  inp.oninput = function () { fdia.busca = inp.value; listaFijoDia(); };
  bus.appendChild(inp);
  var row = el('div', ''); row.style.cssText = 'display:flex;gap:8px'; row.appendChild(bus); fl.appendChild(row);
  var hoyno = el('button', 'btng', 'Hoy no quiero ' + P.ETIQ_PAPEL[fdia.papel].toLowerCase());
  hoyno.style.cssText += ';align-self:flex-start';
  hoyno.onclick = function () { P.cambiarFijoDia(fdia.fecha, fdia.toma, fdia.quien, fdia.papel, null); fdia = null; pintarFijoDia(); pintarDia(); };
  fl.appendChild(hoyno);
  m.appendChild(fl);
  var lista = el('div', 'modlista'); lista.id = 'fdialista'; m.appendChild(lista);
  m.appendChild(el('div', 'modpie', '<span>Lo de siempre es: ' + (act ? P.nombreDe(act) : 'nada') + '.</span>'));
  var cerrar = el('button', 'mini', EQUIS);
  cerrar.style.cssText = 'width:34px;height:34px;border-radius:9px;position:absolute;right:26px;top:26px';
  cerrar.setAttribute('aria-label', 'Cerrar');
  cerrar.onclick = function () { fdia = null; pintarFijoDia(); };
  m.style.position = 'relative';
  m.appendChild(cerrar);
  capa.appendChild(m);
  capa.onclick = function (ev) { if (ev.target === capa) { fdia = null; pintarFijoDia(); } };
  listaFijoDia();
}
function listaFijoDia() {
  var cont = document.getElementById('fdialista'); if (!cont) return;
  cont.innerHTML = '';
  P.candidatos(fdia.toma, fdia.papel, fdia.busca).forEach(function (it) {
    var f = el('div', 'rec');
    f.innerHTML = '<div style="flex:1;min-width:0"><div class="n">' + it.n + '</div><div class="m">' + it.m + '</div></div>';
    var b = el('button', 'btng', 'Solo hoy');
    b.onclick = function () {
      P.cambiarFijoDia(fdia.fecha, fdia.toma, fdia.quien, fdia.papel, { t: it.t, id: it.id });
      fdia = null; pintarFijoDia(); pintarDia();
    };
    f.appendChild(b);
    cont.appendChild(f);
  });
}

function irA(v) {
  var E = P.E(); E.vista = v; P.guardar();
  document.getElementById('vista-plan').style.display = (v === 'plan') ? '' : 'none';
  document.getElementById('vista-dia').style.display = (v === 'dia') ? '' : 'none';
  document.getElementById('t-plan').className = (v === 'plan') ? 'on' : '';
  document.getElementById('t-dia').className = (v === 'dia') ? 'on' : '';
  if (v === 'dia') pintarDia(); else pintar();
  window.scrollTo(0, 0);
}

/* ---------- arranque ---------- */
/* El panel de sugerencias vive ENTRE la semana ya comprada y la que se
   planifica: alimenta a la de abajo, así que va pegado a ella. Por eso las
   semanas se pintan en dos contenedores, uno a cada lado del panel. */
/* ---------- herramientas de semana: vaciar y plantillas ----------
   Carlos, 5-nov: «en cada bloque semanal se puede poner el botón "guardar como
   plantilla", puede aparecer "copiar plantilla" para poner una de las guardadas».
   Por eso son dos botones distintos y no un menú: cada uno dice lo que hace. */
function etiquetaSemana(lunes) {
  var fs = P.fechasDe(lunes);
  return 'del ' + P.diaNum(fs[0]) + ' de ' + P.mesDe(fs[0]) + ' al ' + P.diaNum(fs[6]) + ' de ' + P.mesDe(fs[6]);
}
function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }

function vaciarSemanaUI(s) {
  if (!confirm('¿Vaciar la semana ' + etiquetaSemana(s.f) + ', de hoy en adelante?\n\n' +
      'Se borra lo planificado: los platos, el tipo de cada día, las salidas de ruta, el entreno previsto, ' +
      'las marcas de comer fuera y lo que haya sin colocar.\n\n' +
      'NO se toca: los días que ya han pasado, lo que hayas marcado como comido, ni lo que midió el reloj.')) return;
  var b = P.vaciarSemana(s.f);
  pintar();
  var resto = [];
  if (b.pasados) resto.push(plural(b.pasados, 'día ya pasado', 'días ya pasados'));
  if (b.medidas) resto.push(plural(b.medidas, 'actividad del reloj', 'actividades del reloj'));
  aviso('Semana vaciada: ' + plural(b.tomas, 'toma', 'tomas') +
        (b.sueltos ? ' y ' + plural(b.sueltos, 'plato sin colocar', 'platos sin colocar') : '') +
        (resto.length ? '. Se respetan ' + resto.join(' y ') : ''));
}

var herr = null;
function abrirHerr(modo, lunes) { herr = { modo: modo, lunes: lunes || null }; pintarHerr(); }
function cerrarHerr() { herr = null; pintarHerr(); }

function filaPlantilla(p, lunes, modo) {
  var fl = el('div', 'plfila');
  fl.appendChild(el('span', 'n', '<b>' + esc(p.nombre || p.id) + '</b><small>' +
    P.platosDePlantilla(p) + ' platos · guardada el ' + P.fechaCorta(p.cuando || P.HOY) + '</small>'));
  if (modo === 'copiar') {
    var bc = el('button', 'btn', 'Copiar aquí');
    bc.onclick = function () {
      if (!confirm('¿Copiar «' + (p.nombre || p.id) + '» en la semana ' + etiquetaSemana(lunes) + '?\n\n' +
                   'Solo rellena los huecos de hoy en adelante. No pisa nada de lo que ya tengas puesto.')) return;
      var r = P.aplicarPlantilla(lunes, p.id);
      cerrarHerr(); pintar();
      aviso(r.tomas ? 'Copiada «' + (p.nombre || p.id) + '» en ' + plural(r.tomas, 'toma', 'tomas') +
                      (r.pasados ? '; ' + plural(r.pasados, 'día pasado se respeta', 'días pasados se respetan') : '') +
                      (r.perdidas ? '; ' + plural(r.perdidas, 'ficha ya no existe', 'fichas ya no existen') : '')
                    : 'No había huecos que rellenar de hoy en adelante');
    };
    fl.appendChild(bc);
  } else {
    var bs = el('button', 'btn', 'Sustituir');
    bs.onclick = function () {
      if (!confirm('¿Sustituir «' + (p.nombre || p.id) + '» por esta semana? Se queda con su nombre.')) return;
      P.guardarPlantilla(lunes, null, p.id);
      cerrarHerr(); aviso('«' + (p.nombre || p.id) + '» sustituida');
    };
    fl.appendChild(bs);
  }
  var br = el('button', 'btn peq', 'Renombrar');
  br.onclick = function () {
    var n = prompt('Nuevo nombre:', p.nombre || '');
    if (!n || !n.trim()) return;
    P.renombrarPlantilla(p.id, n.trim()); pintarHerr(); aviso('Renombrada');
  };
  var bb = el('button', 'btn peq', 'Borrar');
  bb.onclick = function () {
    if (!confirm('¿Borrar la plantilla «' + (p.nombre || p.id) + '»? No se puede deshacer.')) return;
    P.borrarPlantilla(p.id); pintarHerr(); aviso('Plantilla borrada');
  };
  fl.appendChild(br); fl.appendChild(bb);
  return fl;
}

function pintarHerr() {
  var capa = $('#capa');
  if (!herr) { capa.innerHTML = ''; capa.className = ''; return; }
  capa.className = 'capa'; capa.innerHTML = '';
  var m = el('div', 'modal');
  var tit = { copiar: 'Copiar una plantilla', guardar: 'Guardar como plantilla',
              pendientes: 'Platos pendientes de comer', disponibles: 'Recetas disponibles' }[herr.modo];
  var sub = {
    copiar: 'En la semana ' + (herr.lunes ? etiquetaSemana(herr.lunes) : '') +
            '. Rellena solo los huecos de hoy en adelante; lo que ya está puesto no se toca.',
    guardar: 'Se guarda lo que tengas puesto en la semana ' + (herr.lunes ? etiquetaSemana(herr.lunes) : '') +
             ', para repetirlo otra semana.',
    pendientes: 'Principales de comida y cena que aún no has marcado como comidos, de hoy en adelante.',
    disponibles: 'Con lo que te sobra del stock —lo que no está ya comprometido en ningún día planificado—. ' +
                 'Primero las que gastan algo de la nevera, para no dejarlo para lo último.'
  }[herr.modo];
  m.appendChild(el('div', 'modcab conx', '<div style="flex:1"><div class="t">' + tit +
    '</div><div class="s">' + sub + '</div></div>'));
  var lista = el('div', 'modlista');
  var pie = '';

  if (herr.modo === 'copiar' || herr.modo === 'guardar') {
    var pls = P.plantillas();
    if (herr.modo === 'guardar') {
      var caja = el('div', 'nueva-pla');
      var inp = el('input'); inp.type = 'text'; inp.placeholder = 'Nombre de la plantilla…';
      var bg = el('button', 'btn', 'Guardar');
      bg.onclick = function () {
        var n = inp.value.trim();
        if (!n) { aviso('Ponle un nombre'); inp.focus(); return; }
        var p = P.guardarPlantilla(herr.lunes, n);
        cerrarHerr();
        aviso('Plantilla «' + n + '» guardada con ' + plural(P.platosDePlantilla(p), 'plato', 'platos'));
      };
      inp.onkeydown = function (ev) { if (ev.key === 'Enter') bg.onclick(); };
      caja.appendChild(inp); caja.appendChild(bg);
      lista.appendChild(caja);
      if (pls.length) {
        lista.appendChild(el('div', 'gtit', '<span>O SUSTITUIR UNA QUE YA TIENES</span><i></i>'));
        pls.forEach(function (p) { lista.appendChild(filaPlantilla(p, herr.lunes, 'guardar')); });
      }
      setTimeout(function () { inp.focus(); }, 20);
    } else if (!pls.length) {
      lista.appendChild(el('div', 'vacio', 'Todavía no has guardado ninguna plantilla. ' +
        'Monta una semana como te guste y dale a «Guardar como plantilla».'));
    } else {
      pls.forEach(function (p) { lista.appendChild(filaPlantilla(p, herr.lunes, 'copiar')); });
    }
    pie = plural(pls.length, 'plantilla guardada', 'plantillas guardadas');

  } else if (herr.modo === 'pendientes') {
    var ps = P.platosPendientes(21), porDia = {}, orden = [];
    ps.forEach(function (x) {
      if (!porDia[x.f]) { porDia[x.f] = { comida: [], cena: [] }; orden.push(x.f); }
      porDia[x.f][x.toma].push(x.n);
    });
    if (!orden.length) lista.appendChild(el('div', 'vacio', 'Nada pendiente.'));
    orden.forEach(function (fe) {
      var d = porDia[fe];
      /* cada toma en su línea y sin recortar: con dos platos largos en comida,
         la cena desaparecía sin avisar (le pasó en su app el 22-oct). */
      var c = el('div', 'pendia');
      c.innerHTML = '<b>' + esc(P.fechaCorta(fe)) + '</b>' +
        '<div class="l">Comida: ' + (d.comida.length ? esc(d.comida.join(', ')) : '—') + '</div>' +
        '<div class="l">Cena: ' + (d.cena.length ? esc(d.cena.join(', ')) : '—') + '</div>';
      lista.appendChild(c);
    });
    pie = plural(ps.length, 'plato', 'platos');

  } else {
    var t2 = P.recetasDisponibles();
    if (!t2) {
      lista.appendChild(el('div', 'vacio', 'Esta cuenta la hace el motor de tu app y aquí no ha cargado.'));
    } else {
      var fila = function (r, nota) {
        var c = el('div', 'rec');
        c.innerHTML = '<span style="flex:1"><span class="n">' + esc(r.n) +
          (r.fresco > 0.5 ? ' <b style="color:var(--verde);font-size:11px">NEVERA</b>' : '') +
          '</span><span class="m">' + esc(nota) + '</span></span>';
        return c;
      };
      var cola = function (r) {
        var s = P.salDeReceta(r.id);
        return (s == null ? '' : coma(s) + ' g de sal · ') + ((r.min || '?') + ' min');
      };
      if (t2.enteras.length) {
        lista.appendChild(el('div', 'gtit', '<span>LAS TIENES ENTERAS</span><i></i>'));
        t2.enteras.forEach(function (r) { lista.appendChild(fila(r, 'todo en casa · ' + cola(r))); });
      }
      if (t2.casi.length) {
        lista.appendChild(el('div', 'gtit', '<span>TE FALTA SOLO LO SECUNDARIO</span><i></i>'));
        t2.casi.forEach(function (r) { lista.appendChild(fila(r, 'falta ' + (r.faltan || []).join(', ') + ' · ' + cola(r))); });
      }
      if (!t2.enteras.length && !t2.casi.length) {
        lista.appendChild(el('div', 'vacio', 'Con lo que te sobra ahora no sale ninguna receta entera ni casi entera.'));
      }
      pie = plural(t2.enteras.length + t2.casi.length, 'receta', 'recetas');
    }
  }

  m.appendChild(lista);
  m.appendChild(el('div', 'modpie', '<span>' + pie + '</span>'));
  var cerrar = el('button', 'mini', EQUIS);
  cerrar.style.cssText = 'width:34px;height:34px;border-radius:9px;position:absolute;right:26px;top:26px';
  cerrar.setAttribute('aria-label', 'Cerrar');
  cerrar.onclick = cerrarHerr;
  m.style.position = 'relative'; m.appendChild(cerrar);
  capa.appendChild(m);
  capa.onclick = function (ev) { if (ev.target === capa) cerrarHerr(); };
}

/* los dos que miran el plan entero, no una semana */
function pintarHerramientas() {
  var c = $('#herr-plan'); if (!c) return;
  c.innerHTML = '';
  c.appendChild(el('span', 'ht', 'De todo el plan:'));
  var b1 = el('button', 'btn', 'Platos pendientes');
  b1.onclick = function () { abrirHerr('pendientes'); };
  var b2 = el('button', 'btn', 'Recetas disponibles');
  b2.onclick = function () { abrirHerr('disponibles'); };
  if (!P.hayMotor()) { b2.disabled = true; b2.title = 'Necesita el motor de tu app'; }
  c.appendChild(b1); c.appendChild(b2);
}

function pintar() {
  var cs = document.getElementById('semanal');
  if (cs) { cs.innerHTML = ''; if (P.hayMotor()) cs.appendChild(resumenSemanal()); }
  pintarHerramientas(); pintarFijos(); pintarPanel(); pintarSemanas();
}
/* ---------- arranque de la vista ----------
   La app pinta el Menu llamando a `pintarMenu`. La primera vez se engancha
   el conmutador de las dos sub-pestanas y se levanta el estado del motor. */
var arrancado = false;
function arrancarMenu() {
  if (arrancado) return;
  arrancado = true;
  P.arrancar();
  var bp = document.getElementById('t-plan'), bd = document.getElementById('t-dia');
  if (bp) bp.onclick = function () { irA('plan'); };
  if (bd) bd.onclick = function () { irA('dia'); };
  irA(P.E().vista === 'dia' ? 'dia' : 'plan');
}
function pintarTodo() {
  arrancarMenu();
  pintar();
  if (P.E().vista === 'dia') pintarDia();
}

    return {
      pintar: pintarTodo,
      pintarDia: pintarDia,
      abrirSelector: function (f, tm) { abrirCatalogo(f, tm, 0, null); },
      abrirSelectorActividad: function (f) { abrirTipoDia(f, null); },
      abrirSelectorCapricho: function (f) { abrirCaprichos(f); },
      avisoReajuste: avisaReajuste,
      vaciarDia: function (f) { P.vaciarDia(f); pintarTodo(); },
      deshacerVaciado: function (f) { P.deshacerVaciar(f); pintarTodo(); },
      tocarYGuardarToma: function (f, tm, quitado) {
        if (quitado) { try { Almacen.quitarFijo(f, tm, quitado); } catch (e) {} }
        P.guardar(); pintarTodo();
      }
    };
  })();

  function pintarMenu() { MENU.pintar(); }
  function avisoReajuste() { return MENU.avisoReajuste(); }
  function tocarYGuardarToma(f, tm, quitado) { MENU.tocarYGuardarToma(f, tm, quitado); }
  function abrirSelector(f, tm) { MENU.abrirSelector(f, tm); }
  function abrirSelectorActividad(f) { MENU.abrirSelectorActividad(f); }
  function abrirSelectorCapricho(f) { MENU.abrirSelectorCapricho(f); }
  function vaciarDia(f) { MENU.vaciarDia(f); }
  function deshacerVaciado(f) { MENU.deshacerVaciado(f); }

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
      /* baja · 10-oct-2026: el Id del TCX va en UTC; cortarlo a 10 letras
         apuntaba al día anterior lo empezado entre las 00:00 y las 02:00 */
      var idTxt = idEl ? (idEl.textContent || "").trim() : "";
      var idD = idTxt ? new Date(idTxt) : null;
      var fechaISO = idD && !isNaN(idD.getTime()) ? Util.aISO(idD) : idTxt.slice(0, 10);
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
  /* QUE LÍNEA SE ESTÁ AJUSTANDO A MANO EN LA FICHA ABIERTA (7-oct-2026).
     Carlos: «poder modificar la cantidad del ingrediente principal de
     guarnición para ajustar calorías. Si sube la del plato principal se pueden
     bajar las de guarnición». Decidió lápiz en TODAS las filas y no sólo en
     una: así no hay que acertar qué es «el principal» de cada guarnición, que
     no es obvio —en su plato de hoy la patata ponía 151 kcal y el aceite 148—.
     Se guarda donde el peso de la carne, que ya es un mapa de ingredientes. */
  var ajusteIng = null;

  /* COSTE DE UNA RACIÓN (10-oct-2026), con el precio más reciente de cada
     ingrediente: el de su último ticket o el de su ficha. Si falta el precio de
     alguno, se dice cuántos y la cifra lleva «≥»: se queda corta, no inventa. */
  function etiquetaCoste(r) {
    var c = Almacen.costeReceta(r);
    if (!c || !c.con) return "";
    var corto = c.con < c.n;
    return '<span class="etiqueta" title="' + esc(corto ? "Sin precio: " + c.faltan.join(", ") : "Con el último precio de cada ingrediente") + '">' +
           (corto ? "\u2265 " : "") + Util.euros(c.e) + ' / ración' +
           (corto ? ' \u00b7 ' + (c.n - c.con) + ' sin precio' : '') + '</span>';
  }

  function abrirFicha(id, fecha, toma) {
    var r = Almacen.receta(id);
    if (!r) return;
    /* EL PESO REAL DE LA CARNE (7-oct-2026). Si este plato de ESTE día lleva un
       ingrediente de peso variable y ya lo pesaste, manda tu peso y no el del
       catálogo: las calorías de arriba, las de cada línea y la foto del día.
       Abierta desde el recetario, sin día ni toma, no hay nada que corregir. */
    var pesos    = (fecha && toma) ? Almacen.pesosDe(fecha, id) : null;
    var lineasVar = (fecha && toma) ? Almacen.lineasVariables(r) : [];
    var salRacion = Almacen.salReceta(r, pesos);
    var n = Almacen.nutrReceta(r, pesos);

    var personas = (fecha && toma) ? Almacen.comensales(fecha, toma) : 0;
    /* Las cantidades, para los que de verdad comen ESE plato: uno si tiene dueño,
       si hoy no te cuenta o si Susana no lo toma (v375). */
    if (personas) personas = Almacen.comensalesDePlato(r, personas, fecha, toma) || personas;
    var base = r.raciones || 1;
    /* Las recetas de TANDA se cocinan enteras y se reparten en porciones: escalarlas
       por comensales no tiene sentido. */
    var factor = (personas && !r.tanda) ? personas / base : 1;
    /* media ración puesta una sola vez: la ficha enseña la mitad (v494) */
    var mediaFicha = !!(fecha && toma && !r.tanda && Almacen.esMedia(fecha, toma, id) &&
                        Almacen.racionesPuestas(fecha, toma, id, 1) === 0.5 &&
                        ((Almacen.estado.plan[fecha] || {})[toma] || []).filter(function (x) { return x === id; }).length === 1);
    if (mediaFicha) factor = factor * 0.5;
    var escalada = factor !== 1;

    var html = '<header><h2>' + esc(r.n) + '</h2><button class="cerrar" data-cerrar>×</button></header>';
    html += '<div class="etiquetas">' +
            '<span class="etiqueta verde">' + Util.kcal(n.k) + ' / ración</span>' +
            '<span class="etiqueta verde">' + Util.sal(salRacion) + ' de sal / ración</span>' +
            etiquetaCoste(r) +
            '<span class="etiqueta' + (escalada ? ' raro' : '') + '">' +
              (mediaFicha ? 'media ración' + (personas > 1 ? ' para ' + personas : '') : escalada ? 'cantidades para ' + personas : base + ' ración(es)') + '</span>' +
            '<span class="etiqueta">' + (r.min || "?") + ' min</span>' +
            (r.grupo ? '<span class="etiqueta">' + esc(NOMBRE_GRUPO[r.grupo] || r.grupo) + '</span>' : '') +
            etiquetasTool(r.tools) +
            '</div>';
    /* LA BANDA DE PESAR. Sale sólo en los platos de un día con carne o pescado
       fresco: once fichas. Arriba del todo porque pesar es lo primero que se
       hace al ponerse. Es una oportunidad, no un paso: si no la tocas, el plato
       cuenta por el catálogo como siempre. */
    lineasVar.forEach(function (l) {
      var gi = Almacen.ingrediente(l.i);
      if (!gi) return;
      var deCat = Math.round(Almacen.gramosDeLinea(l) / (r.raciones || 1));
      var yaEs  = (pesos && typeof pesos[l.i] === 'number') ? pesos[l.i] : null;
      html += '<div class="peso-var' + (yaEs !== null ? ' pesada' : '') + '">' +
        '<p>' + (yaEs !== null
            ? 'Pesaste <b>' + yaEs + ' g</b> de ' + esc(gi.n.split(' (')[0].toLowerCase()) +
              '. El catálogo cuenta ' + deCat + ' g.'
            : 'Lleva <b>' + esc(gi.n.split(' (')[0].toLowerCase()) + '</b>, que es de peso ' +
              'variable. El catálogo cuenta ' + deCat + ' g por ración.') + '</p>' +
        '<div class="peso-var-fila">' +
          '<input type="number" id="peso-real" data-ing="' + esc(l.i) + '" ' +
            'inputmode="numeric" min="1" max="3000" step="5" ' +
            'value="' + (yaEs !== null ? yaEs : deCat) + '"><span>g por ración</span>' +
          '<button class="btn" data-pesar="' + esc(fecha) + '|' + esc(toma) + '|' + esc(r.id) + '|' + esc(l.i) + '">' + (yaEs !== null ? 'Otro peso' : 'Pesarlo') + '</button>' +
          (yaEs !== null ? '<button class="btn" data-pesarquita="' + esc(fecha) + '|' + esc(toma) + '|' + esc(r.id) + '|' + esc(l.i) + '">Reiniciar</button>' : '') +
        '</div></div>';
    });
    /* ¿ESTA RECETA ES TUYA O TE LA HE PROPUESTO YO? (6-oct-2026). Carlos: «en
       algunas estaré de acuerdo con tu sugerencia y en otras no». Se responde
       aquí, con el plato delante, y no en una sesión de repasar 159 de golpe.
       Volver a pulsar lo que ya está puesto lo quita. */
    (function () {
      var v = Almacen.vistaReceta(r.id);
      var camb = Almacen.cambioDesdeVista(r.id);
      html += '<div class="repaso-receta">' +
        (v ? '' : '<span class="nota-peque">Esta no la has mirado todavía.</span>') +
        /* HA CAMBIADO DESDE TU «ME VALE» (8-oct-2026): no se quita la marca, se avisa */
        (camb ? '<span class="nota-peque aviso-cambio">La diste por buena el ' + esc(Util.etiquetaFecha(camb.f)) +
          ', pero ha cambiado desde entonces. <button type="button" class="btn mini" data-reconfirmar="' +
          esc(r.id) + '">Sigue valiendo</button></span>' : '') +
        '<div class="repaso-botones">' +
          '<button type="button" class="btn mini' + (v === "ok" ? " activo" : "") +
            '" data-vista="' + esc(r.id) + '|ok">Me vale</button>' +
          '<button type="button" class="btn mini' + (v === "pte" ? " activo" : "") +
            '" data-vista="' + esc(r.id) + '|pte">Pendiente</button>' +
          '<button type="button" class="btn mini' + (v === "no" ? " activo" : "") +
            '" data-vista="' + esc(r.id) + '|no">No me vale</button>' +
        "</div></div>";
      /* QUÉ LE CHIRRÍA, APUNTADO EN EL MOMENTO. Sólo aparece si está pendiente:
         en los otros dos estados no hay nada que recordar. */
      if (v === "pte") {
        html += '<div class="repaso-nota"><label>Qué hay que mirar</label>' +
          '<input type="text" data-notapte="' + esc(r.id) + '" value="' +
          esc(Almacen.notaReceta(r.id)) + '" placeholder="el chorizo son 50 g, no 10" maxlength="160"></div>';
      }
    })();
    /* Su nota, si ya la tiene: tocar otra estrella la cambia, la misma la quita. */
    if (Almacen.estrellas(r.id)) html += filaEstrellas(r.id, Almacen.estrellas(r.id), "ficha");

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
      /* Si pesaste esta línea, sus gramos y sus kcal son los tuyos. Lo que se
         guarda es POR RACIÓN, así que aquí se multiplica por los que comen. */
      var pReal = (pesos && typeof pesos[l.i] === "number") ? pesos[l.i] : null;
      var gTot = (pReal !== null) ? pReal * (escalada ? personas : base)
                                  : Almacen.gramosDeLinea(linea);
      var gr = gTot / 100;
      var kc = ing ? Math.round(gr * (ing.k || 0)) : 0;
      var rallar = l.uso === "rallar";
      var ctxAj = esc(fecha || '') + '|' + esc(toma || '') + '|' + esc(r.id) + '|' + esc(l.i);
      var editando = !!(ajusteIng && ajusteIng.r === r.id && ajusteIng.i === l.i && fecha && toma);
      var porRacion = (pReal !== null) ? pReal : Math.round(Almacen.gramosDeLinea(l) / (r.raciones || 1));
      var celda;
      if (editando) {
        celda = '<input type="number" id="ajuste-caja" inputmode="numeric" min="1" max="5000" ' +
                  'step="5" value="' + porRacion + '"><em class="nota-peque">g/raci\u00f3n</em>' +
                '<button class="lapiz ok" data-ajustarok="' + ctxAj + '" title="Guardar">\u2713</button>' +
                (pReal !== null ? '<button class="lapiz" data-ajustarquita="' + ctxAj + '" title="Volver a la receta">\u21ba</button>' : '') +
                '<button class="lapiz" data-ajustarno="' + ctxAj + '" title="Dejarlo">\u2715</button>';
      } else {
        celda = (pReal !== null ? '<b>' + Math.round(gTot) + ' g</b>'
                                : Util.cantidadReceta(linea.c, ing ? ing.u : "g", ing ? ing.pesoUd : 0)) +
                (kc ? ' <em class="nota-peque">\u00b7 ' + kc + ' kcal</em>' : '') +
                ((fecha && toma) ? '<button class="lapiz" data-ajustar="' + ctxAj + '" title="Ajustar la cantidad">\u270e</button>' : '');
      }
      var clasesLi = (pReal !== null ? "linea-pesada " : "") + (editando ? "linea-ajuste" : "");
      html += '<li' + (clasesLi.trim() ? ' class="' + clasesLi.trim() + '"' : '') + '><span>' +
              esc(ing ? ing.n : l.i) +
              (pReal !== null ? ' <em class="nota-peque">\u00b7 ajustado</em>' : '') +
              (rallar ? ' <em class="nota-peque">\u00b7 para rallar</em>' : '') + '</span><span>' +
              celda + '</span></li>';
      var tarr = rallar ? Almacen.ingrediente("tomate_rallado") : null;
      if (tarr) {
        var gFresco = Almacen.gramosDeLinea(linea), gRall = gFresco * RINDE_RALLADO;
        var comen = escalada ? personas : base;
        var dSal = (gRall * (tarr.sal || 0) - gFresco * ((ing && ing.sal) || 0)) / 100 / comen;
        html += '<li class="equiv-rallado">Si vas justo de tiempo: ' + (Math.round(gRall / 10) * 10) +
                ' g de ' + esc(tarr.n) + ' — ' + tarrinasTexto(gRall / (tarr.envase || 290)) +
                ' · ' + (dSal >= 0 ? '+' : '') + Util.sal(dSal) + ' de sal por ración</li>';
      }
    });
    html += '</ul>';

    /* Los pasos pueden ser texto llano o llevar minuto del reloj: {min, t, d}.
       Los que llevan minuto se pintan como un guion, para poder seguirlo cocinando. */
    html += '<h3>Elaboración</h3>';
    /* EL AVISO DEL TIEMPO AL PESAR LA CARNE (8-oct-2026). Lo dejó dibujado el
       boceto del 7-oct: un AVISO, no un minutaje nuevo —calcular tiempos de asado
       por peso no se hace a la ligera—. Sale en el primer paso con reloj que
       nombra ese ingrediente y dice «N minutos», y sólo si la pieza pesada se
       aparta un 10 % o más de lo que cuenta la receta. */
    var avisoTiempo = {};
    (lineasVar || []).forEach(function (l) {
      if (!pesos || typeof pesos[l.i] !== "number") return;
      var deCatT = Almacen.gramosDeLinea(l) / (r.raciones || 1), realT = pesos[l.i];
      if (!(deCatT > 0) || Math.abs(realT / deCatT - 1) < 0.10) return;
      var gi = Almacen.ingrediente(l.i);
      var sinTilde = function (s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); };
      var claves = sinTilde((gi && gi.n) || "").replace(/\(.*$/, "").split(/[^a-z]+/)
        .concat(l.i.split("_")).filter(function (w) { return w.length > 3 && ["cerdo","ternera","pieza","fresco","fresca","premium","hacendado","pack","bandeja","paquete","certificado","noruego","vacuno"].indexOf(w) < 0; });
      /* «9 minutos», «UN MINUTO por cada cara», «dos minutos» */
      var NUM = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
      var minutosDe = function (t) {
        var cara = /minutos?\s+por\s+(cada\s+)?cara/.test(t) ? " por cara" : "";
        var m = t.match(/(\d+(?:,\d+)?)\s*minutos?/);
        if (m) return m[1] + "|" + cara;
        m = t.match(/\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+minutos?/);
        return m ? String(NUM[m[1]]) + "|" + cara : null;
      };
      var P = r.pasos || [], hallado = null;
      for (var k = 0; k < P.length; k++) {
        var pk = P[k];
        if (!pk || typeof pk !== "object" || typeof pk.min !== "number") continue;
        var tk = sinTilde(pk.t);
        if (!claves.some(function (w) { return tk.indexOf(w) >= 0; })) continue;
        /* el ingrediente se nombra aquí; los minutos pueden ir en este paso o en
           el siguiente del MISMO minuto («mete el salmón» · «180 °C, 9 minutos más») */
        var donde = -1, mins = minutosDe(tk) || minutosDe(sinTilde(pk.d));
        if (mins) donde = k;
        else for (var q = k + 1; q < P.length; q++) {
          var pq = P[q];
          if (!pq || typeof pq !== "object" || pq.min !== pk.min) break;
          mins = minutosDe(sinTilde(pq.t));
          if (mins) { donde = q; break; }
        }
        if (donde < 0) continue;
        hallado = { donde: donde, mins: mins };
        break;
      }
      /* sin nombrarlo: «A la freidora — 200 °C, 8 minutos» (brochetas), «Lomos a la freidora…» (lubina):
         el primer paso de cocción con minutos es el de la pieza */
      if (!hallado) for (var f2 = 0; f2 < P.length; f2++) {
        var pf = P[f2];
        if (!pf || typeof pf !== "object" || typeof pf.min !== "number") continue;
        var tf = sinTilde(pf.t), mf = minutosDe(tf);
        if (mf && /freidora|sarten|horno|plancha|parrilla/.test(tf)) hallado = { donde: f2, mins: mf };
        break;
      }
      if (hallado) {
        var donde = hallado.donde, partes = hallado.mins.split("|"), mins = partes[0];
        var uMin = (mins === "1" ? " minuto" : " minutos") + partes[1];
        var porRac = (r.raciones || 1) > 1 ? " por ración" : "";
        avisoTiempo[donde] = "\u26a0 Pesado: " + Math.round(realT) + " g" + porRac + ", y la receta cuenta " + Math.round(deCatT) +
          (realT < deCatT ? ". Vigílalo antes de " + (mins === "1" ? "ese minuto" : "los " + mins + uMin.replace(/^ minutos/, " minutos")) + "."
                          : ". Puede necesitar más de " + mins + uMin + ": compruébalo antes de sacarlo.");
      }
    });
    var enGuion = false, apPrevio = null;
    (r.pasos || []).forEach(function (p, iPaso) {
      var conReloj = p && typeof p === "object" && typeof p.min === "number";
      if (conReloj && !enGuion) { html += '<ol class="guion">'; enGuion = true; }
      if (!conReloj && enGuion) { html += '</ol>'; enGuion = false; }
      if (conReloj) {
        var apa = aparatoPaso(p, r, apPrevio);
        if (apa) apPrevio = apa;
        html += '<li><div class="col-reloj"><span class="reloj">' + p.min + "'" + '</span>' +
                (apa ? '<span class="ap-paso ap-' + apa + '">' + NOMBRE_AP[apa] + '</span>' : '') +
                /* En un plato + guarnición, de cuál de las dos viene el paso (v369). */
                (p.de ? '<span class="de-paso">' + esc(p.de) + '</span>' : '') +
                '</div><div>' +
                '<b>' + esc(p.t || "") + '</b>' +
                (p.d ? '<span class="nota-peque">' + esc(p.d) + '</span>' : '') +
                (avisoTiempo[iPaso] ? '<span class="nota-peque aviso-tiempo">' + esc(avisoTiempo[iPaso]) + '</span>' : '') +
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

    if (r.nota) html += '<div class="aviso' + (r.sinCuadrar ? ' pendiente-cuadre' : '') + '">' + esc(r.nota) + '</div>';

    /* Un plato + guarnición no se edita: se rehace solo de sus dos recetas.
       Lo que haya que cambiar, se cambia en ellas. */
    if (r.conj) {
      html += '<p class="nota-peque" style="margin-top:14px">Este plato son dos recetas juntas. ' +
              'Para cambiar algo, edita «' + esc((Almacen.receta(r.conj.p) || {}).n || "") + '» o «' +
              esc((Almacen.receta(r.conj.g) || {}).n || "") + '»: el conjunto se pone al día solo.</p>';
      abrirModal(html);
      return;
    }

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
      return (ing ? ing.id : l.i) + " | " + l.c + (l.uso ? " | " + l.uso : "");
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

    html += '<label class="campo"><span>Ingredientes — una línea por ingrediente: <em>identificador | cantidad</em> (el tomate que se ralla: <em>tomate | 1.5 | rallar</em>)</span>' +
            '<textarea id="ed-ing" class="salida" style="min-height:150px">' + esc(lineas) + '</textarea></label>';
    html += '<label class="campo"><span>Añadir ingrediente del catálogo</span><select id="ed-ayuda"><option value="">— elige para insertar la línea —</option>' + opcionesIng + '</select></label>';
    var textoPasos = (r.pasos || []).map(function (p) {
      if (typeof p === "string") return p;
      if (!p) return "";
      return (typeof p.min === "number" ? p.min + (p.ap ? " @" + p.ap : "") + " · " : "") + (p.t || "") + (p.d ? " :: " + p.d : "");
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
        var lin = { i: idIng, c: cant };
        if ((p[2] || "").trim() === "rallar") lin.uso = "rallar";   // «tomate | 1.5 | rallar»
        ing.push(lin);
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
          var m = s.match(/^(\d{1,3})\s*(?:@([a-z]+)\s*)?[·.|-]\s*(.+)$/);      // «12 · haz esto :: porque» (y «12 @sarten · …»)
          if (!m) return s;
          var resto = m[3].split("::");
          var paso = { min: parseInt(m[1], 10), t: resto[0].trim() };
          if (m[2] && NOMBRE_AP[m[2]]) paso.ap = m[2];
          if (resto.length > 1) paso.d = resto.slice(1).join("::").trim();
          return paso;
        }).filter(Boolean),
        trucos: $("#ed-trucos").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
        editado: true,          /* a partir de ahora es tuya: no la piso al actualizar */
        /* LA HORA, QUE ES LO QUE DECIDE AL SINCRONIZAR  ·  6-oct-2026.
           Carlos: «he editado la cantidad de leche en batido de proteínas
           Evowhey… la ha cambiado, pero al volver a entrar vuelven a aparecer
           las cifras antiguas».

           La fusión con el repositorio tiene una regla buena —«cada ficha, la
           del último que la tocó»— pero sólo se aplica si la ficha trae hora, y
           NADA de lo que editabas a mano la traía: la ponían los arreglos y
           nadie más. Sin hora, tu cambio caía en el desempate campo a campo, que
           es frágil y no siempre te daba la razón. Con hora, tu edición manda
           por ser la última, que es lo que tiene que pasar. */
        tocado: new Date().toISOString(),
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
          Almacen.ZONAS.filter(function (z) { return !z.soloHogar; }).map(function (z) {
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
      res.tocado = new Date().toISOString();   /* y la hora, que es la que manda al sincronizar (6-oct-2026) */

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
      /* SIN VER: las que no has mirado todavía (6-oct-2026). Ver `vistaReceta`
         en almacen.js: el recetario mezclaba tus platos con mis propuestas. */
      if (f.vista === "sinver" && Almacen.vistaReceta(r.id)) return false;
      if (f.vista === "pte" && Almacen.vistaReceta(r.id) !== "pte") return false;
      if (f.vista === "ok" && Almacen.vistaReceta(r.id) !== "ok") return false;
      if (f.vista === "cambiada" && !Almacen.cambioDesdeVista(r.id)) return false;
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

    /* EL CONTADOR LLEVA EL REPASO AL LADO. No hay pantalla nueva: se repasa
       desde el recetario de siempre, filtrando, que es donde ya mira. */
    var sinVer = Almacen.recetasSinVer().length;
    var ptes = Almacen.recetasPendientes().length;
    var cambiadas = Almacen.recetasCambiadas().length;
    var revisadas = (Almacen.estado.recetas || []).filter(function (x) {
      return x && !x.oculta && x.grupo !== "suelto" && Almacen.vistaReceta(x.id) === "ok";
    }).length;
    $("#contador-recetas").innerHTML = lista.length + " recetas" +
      (sinVer
        ? ' <button type="button" class="btn mini' + (f.vista === "sinver" ? " activo" : "") +
          '" data-repaso="sinver">' + sinVer + " sin ver</button>"
        : "") +
      (cambiadas
        ? ' <button type="button" class="btn mini aviso' + (f.vista === "cambiada" ? " activo" : "") +
          '" data-repaso="cambiada">' + cambiadas + (cambiadas === 1 ? " cambiada" : " cambiadas") + "</button>"
        : "") +
      (ptes
        ? ' <button type="button" class="btn mini aviso' + (f.vista === "pte" ? " activo" : "") +
          '" data-repaso="pte">' + ptes + (ptes === 1 ? " pendiente" : " pendientes") + "</button>"
        : "") +
      /* LAS YA REVISADAS TAMBIEN SE MIRAN (Carlos, 6-oct-2026): «quiero ver las
         recetas revisadas y sin revisar». No sirve solo la cola de lo que falta;
         hace falta poder volver sobre lo que ya diste por bueno. */
      (revisadas
        ? ' <button type="button" class="btn mini' + (f.vista === "ok" ? " activo" : "") +
          '" data-repaso="ok">' + revisadas + " revisadas</button>"
        : "") +
      (f.vista
        ? ' <button type="button" class="btn mini" data-repaso="">ver todas</button>'
        : "");
    $("#rejilla-recetas").innerHTML = lista.map(function (r) {
      var sal = Almacen.salReceta(r);
      var n = Almacen.nutrReceta(r);
      return '<div class="receta" data-ficha="' + esc(r.id) + '">' +
             '<h3>' + esc(r.n) + '</h3>' +
             '<div class="nota-peque">' + Util.kcal(n.k) + ' · ' + Math.round(n.p) + ' g prot. · ' +
             Util.sal(sal) + ' sal · ' + (r.min || "?") + ' min</div>' +
             '<div class="etiquetas">' +
               (function () {
                 var vv = Almacen.vistaReceta(r.id);
                 if (vv === "no") return '<span class="etiqueta raro">no te vale</span>';
                 if (vv === "pte") return '<span class="etiqueta pte">pte. revisión</span>';
                 if (vv === "ok" && Almacen.cambioDesdeVista(r.id)) return '<span class="etiqueta pte">ha cambiado</span>';
                 return vv ? '' : '<span class="etiqueta sinver">sin ver</span>';
               })() +
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
  /* QUÉ LE FALTA A UNA FICHA (Carlos, 2-oct-2026): «al ver en la pestaña los
     ingredientes deberían aparecer los pendientes de clasificar y una ventana en
     la que rellenar los datos que falten». La ventana ya existe —es la ficha del
     ingrediente, que pide estante, marca, envase, tienda y ración—; lo que no
     había era manera de SABER a cuáles les falta algo sin abrirlas una a una.
     Un ingrediente que entra por una receta de la IA llega con los valores
     nutricionales y nada más: ni estante, ni marca, ni tienda, ni precio.
     `envase` vacío NO cuenta como hueco: la propia ficha dice que vacío
     significa que se compra al peso. Y lo de restaurante y bar no se guarda en
     casa, así que no se le pide nada. */
  function huecosDe(g) {
    if (!g || g.oculta || g.cat === "Restaurante y bar") return [];
    var h = [];
    if (!Almacen.sitioDe(g)) h.push("estante");
    if (!g.producto) h.push("marca");
    /* Lo que has decidido NO comprar nunca más no tiene que pedirte tienda ni
       precio: la ficha sigue viva porque te queda en casa o porque hubo recetas
       que la usaban, pero al carro no vuelve. (2-oct-2026, con el tomate
       deshidratado: 125 g en la despensa, cero recetas y `pedir:"nunca"`.) */
    if (g.pedir !== "nunca") {
      if (!g.tienda) h.push("tienda");
      /* `precioVariable`: hay fichas a las que el precio NO se les puede pedir
         porque detrás hay varias cosas distintas. La fruta de temporada es el
         caso: albaricoque en junio, caqui en noviembre. (Carlos, 2-oct-2026:
         «no va a tener precio al ser varias cosas, no lo relleno».) */
      if (!g.precioVariable && !((g.precios || []).length)) h.push("precio");
    }
    /* `sinAporte`: fichas que de verdad no aportan nada y el cero es el dato
       bueno — el café, el edulcorante, una infusión. Sin esto, la lista de
       incompletos te perseguiría para siempre con un número que ya es correcto. */
    if (!g.sinAporte && !(g.k > 0) && !(g.p > 0) && !(g.h > 0) && !(g.g > 0) && !(g.sal > 0)) h.push("valores");
    return h;
  }

  /* UNA X PARA VACIAR LA BÚSQUEDA (Carlos, 2-oct-2026): «en las casillas donde se
     escriba algo para buscar una receta o un ingrediente, poner una x para limpiar
     el formulario». No se toca el HTML casilla por casilla: se envuelven aquí.
     DOS CORRECCIONES DEL MISMO DÍA, las dos suyas:
       · «en este no sale» — la escondía mientras la casilla estaba vacía, que es
         lo que hace medio mundo, pero entonces no la ves hasta que escribes y
         parece que no está. Ahora está SIEMPRE.
       · «aquí tampoco» — la casilla de filtrar del selector de platos se crea al
         vuelo cada vez que se abre, así que no estaba cuando se repartieron las
         equis. Por eso esto es una función y no una lista fija: se la llama
         también al pintar un modal.
     El botón no llama a ninguna función de pintar: borra el texto y lanza el mismo
     evento `input` que lanzarías tú escribiendo, así que lo recoge el oyente que ya
     existe y la lista se refresca sola. */
  function ponerLaX(cont) {
    if (!cont || !cont.querySelectorAll) return;
    var cajas = cont.querySelectorAll('input[type="text"][id^="buscar"], input[type="text"][id="filtro-selector"]');
    Array.prototype.forEach.call(cajas, function (inp) {
      if (inp.parentNode && inp.parentNode.classList.contains("con-x")) return;
      var caja = document.createElement("span");
      caja.className = "con-x";
      inp.parentNode.insertBefore(caja, inp);
      caja.appendChild(inp);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "limpia-x";
      b.textContent = "×";
      b.title = "Vaciar la búsqueda";
      b.setAttribute("aria-label", "Vaciar la búsqueda");
      caja.appendChild(b);
      b.addEventListener("click", function () {
        if (!inp.value) { if (!esMovil()) inp.focus(); return; }
        inp.value = "";
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        if (!esMovil()) inp.focus();
      });
    });
  }

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
      if (f.clase === "pendientes" && !huecosDe(x).length) return false;
      if (f.texto) {
        if (!Almacen.coincideTexto(x.n, f.texto) && !Almacen.coincideTexto(x.nota, f.texto)) return false;
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

    /* El aviso va en la cabecera y SE PUEDE TOCAR: enterarte de que hay seis
       fichas cojas no sirve de nada si luego tienes que ir a buscarlas. */
    var incompletos = (Almacen.estado.ingredientes || []).filter(function (x) {
      return !x.oculta && huecosDe(x).length;
    }).length;
    $("#contador-ingredientes").innerHTML =
      esc(lista.length + " ingredientes" +
          (f.cat || f.texto || f.clase ? " (de " + (Almacen.estado.ingredientes || []).length + ")" : "")) +
      (incompletos && f.clase !== "pendientes"
        ? ' \u00b7 <button type="button" class="btn mini" data-verincompletos="1" ' +
          'style="color:var(--ambar)"><b>' + incompletos + '</b> sin completar</button>'
        : "");

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
               (huecosDe(x).length
                 ? '<span class="etiqueta falta">Falta: ' + esc(huecosDe(x).join(", ")) + '</span>'
                 : '') +
             '</div></div>';
    }).join("") || '<div class="vacio">No hay ingredientes con esos filtros.</div>';

    /* OCULTOS QUE COINCIDEN CON LA B\u00daSQUEDA (26-oct-2026). Carlos: el queso
       cottage que usa de verdad \u2014en una receta, en la compra, en la
       despensa\u2014 no aparec\u00eda ni busc\u00e1ndolo entero. Su ficha qued\u00f3 marcada
       `oculta` sin que \u00e9l lo pidiera, y lo oculto se descarta a prop\u00f3sito de
       esta lista para no ofrecer duplicados retirados. Sin una puerta de
       vuelta, la \u00fanica manera de arreglarlo era yo tocando su guardado a
       mano. As\u00ed que, SOLO cuando hay texto de b\u00fasqueda, se muestra aparte
       \u2014apagado, y avisando de que es rar\u00edsimo que haga falta\u2014 lo oculto que
       coincide, con un bot\u00f3n para devolverlo. */
    var ocultosBox = $("#ingredientes-ocultos");
    if (ocultosBox) {
      if (!f.texto) {
        ocultosBox.innerHTML = "";
      } else {
        var ocultos = (Almacen.estado.ingredientes || []).filter(function (x) {
          return x.oculta && Almacen.coincideTexto(x.n, f.texto);
        });
        ocultosBox.innerHTML = !ocultos.length ? "" :
          '<p class="nota-peque" style="margin-top:14px">Ocultos que coinciden \u2014 normalmente es un duplicado retirado a prop\u00f3sito; si uno de estos es el que de verdad usas, recup\u00e9ralo:</p>' +
          ocultos.map(function (x) {
            return '<div class="fila-suelto" style="opacity:.65">' +
              '<span>' + esc(x.n) + '</span>' +
              '<button type="button" class="btn mini" data-recuperaring="' + esc(x.id) + '">Recuperar</button>' +
              '</div>';
          }).join("");
      }
    }
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
    veces = Almacen.racionesPuestas(fecha, toma, rid, veces);
    var previsto = prev * veces;
    var nUna = Almacen.nutrReceta(rec);
    var salUna = Almacen.salReceta(rec);

    /* EN QUÉ SE CUENTA, DICHO COMO ÉL LO DICE (v373, 3-oct-2026). Carlos mandó
       la captura del agua con gas: «Previsto: 1 raciones», «Lo que comiste» y
       un plátano en el pie. Una receta que se mide en raciones pero cuyo nombre
       dice botella, lata o vaso se cuenta en ESO —`medida.nombre` si la receta lo
       trae, si no lo dice el nombre—, en singular o plural según la cifra; y lo
       que se bebe pregunta «bebiste». */
    var unidadRac = (rec.medida && rec.medida.nombre) ||
                    ((/\bbotellas?\b/i.exec(rec.n) || /\blatas?\b/i.exec(rec.n) || /\bvasos?\b/i.exec(rec.n) ||
                      /\btazas?\b/i.exec(rec.n) || [""])[0].toLowerCase().replace(/s$/, "")) || "raci\u00f3n";
    var esBebida = /^beb_/.test(rec.id) || /^(botella|lata|vaso|taza)$/.test(unidadRac);
    var nombreU = function (n) {
      if (u !== "rac") return u;
      if (Math.abs(n - 1) < 1e-9) return unidadRac;
      return unidadRac === "raci\u00f3n" ? "raciones" : unidadRac + "s";
    };
    var cifra = function (n) { return String(Math.round(n * 100) / 100).replace(".", ","); };
    var verbo = esBebida ? "bebiste" : "comiste";
    var etiqueta = u === "rac" ? (unidadRac === "raci\u00f3n" ? "raciones" : unidadRac + "s") : u;
    var html = '<header><h2>\u00bfCu\u00e1nto ' + verbo + '?</h2><button class="cerrar" data-cerrar>\u00d7</button></header>';
    html += '<p class="nota-peque"><strong>' + esc(rec.n) + '</strong><br>' +
            'Previsto: ' + esc(cifra(previsto)) + ' ' + esc(nombreU(previsto)) +
            (veces > 1 && u !== "rac" ? ' (' + veces + ' raciones)' : '') + ' \u00b7 ' +
            Util.kcal(nUna.k * veces) + ' \u00b7 ' + Util.sal(salUna * veces) + ' de sal</p>';
    html += '<label class="campo"><span>Lo que ' + verbo + ' de verdad (' + esc(etiqueta) + ')</span>' +
            '<input type="number" id="cr-cant" min="0" step="' + (u === "rac" ? "0.25" : "1") + '" value="' +
            esc(String(real ? real.c : Math.round(previsto * 100) / 100)) + '"></label>';
    html += '<div id="cr-cuenta" class="nota-peque"></div>';
    html += '<div class="fila"><button class="btn principal" id="cr-guardar">Guardar</button>' +
            (real ? '<button class="btn" id="cr-quitar">Volver a lo previsto</button>' : '') +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    html += '<p class="nota-peque">Esto solo cambia las calor\u00edas y la sal de este d\u00eda. ' +
            'No toca la receta, ni los otros d\u00edas, ni la lista de la compra.</p>';
    abrirModal(html);

    function pintarCuenta() {
      var c = parseFloat(String($("#cr-cant").value).replace(",", "."));
      var caja = $("#cr-cuenta");
      if (!(c >= 0)) { caja.textContent = ""; return; }
      var f = u === "rac" ? c : (prev > 0 ? c / prev : 1);
      var dk = nUna.k * f - nUna.k * veces;
      var ds = salUna * f - salUna * veces;
      if (Math.abs(dk) < 1 && Math.abs(ds) < 0.01) {
        caja.innerHTML = 'Igual que lo previsto: <strong>' + Util.kcal(nUna.k * f) + '</strong> y ' +
          Util.sal(salUna * f) + ' de sal.';
        return;
      }
      caja.innerHTML = 'Quedar\u00eda en <strong>' + Util.kcal(nUna.k * f) + '</strong> y ' +
        Util.sal(salUna * f) + ' de sal: ' +
        /* el signo va aparte: Util.sal no sabe pintar negativos */
        (Math.abs(dk) >= 1 ? (dk > 0 ? '+' : '\u2212') + Math.abs(Math.round(dk)) + ' kcal' : '') +
        (Math.abs(dk) >= 1 && Math.abs(ds) >= 0.01 ? ' y ' : '') +
        (Math.abs(ds) >= 0.01 ? (ds > 0 ? '+' : '\u2212') + Util.sal(Math.abs(ds)) + ' de sal' : '') +
        ' respecto a lo previsto.';
    }
    $("#cr-cant").addEventListener("input", pintarCuenta);
    pintarCuenta();

    $("#cr-guardar").addEventListener("click", function () {
      var c = parseFloat(String($("#cr-cant").value).replace(",", "."));
      if (!(c >= 0)) { Util.toast("Pon una cantidad"); return; }
      Almacen.ponerCantidadReal(fecha, toma, rid, c);
      cerrarModal(); pintarMenu();
      if (!avisoReajuste()) Util.toast("Apuntado: " + cifra(c) + " " + nombreU(c));
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
          if (g) { g.producto = v; g.editado = true; g.tocado = new Date().toISOString(); }
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
    var validas = ["localizacion", "tengo", "pedir", "orden", "hogar", "comida"];
    UI.filaDesp = validas.indexOf(cual) >= 0 ? cual : "localizacion";
    var bl = { comida: $("#bloque-desp-comida"), hogar: $("#bloque-desp-hogar"),
               localizacion: $("#bloque-desp-localizacion"), tengo: $("#bloque-desp-tengo"),
               pedir: $("#bloque-desp-pedir"), orden: $("#bloque-desp-orden") };
    Object.keys(bl).forEach(function (k) { if (bl[k]) bl[k].hidden = UI.filaDesp !== k; });
    $$("#selector-despensa [data-desp]").forEach(function (b) {
      b.classList.toggle("principal", b.getAttribute("data-desp") === UI.filaDesp);
    });
    if (UI.filaDesp === "pedir") pintarPedir();
    else if (UI.filaDesp === "orden") pintarOrdenCompra();
    else if (UI.filaDesp === "hogar") pintarHogar();
    else if (UI.filaDesp === "localizacion") pintarLocalizacion();
    else if (UI.filaDesp === "tengo") pintarLoTengo();
    else pintarDespensa();
  }

  /* ==================== LA AYUDA AL PASAR EL RATÓN ====================
     Carlos, 25-sep-2026: «cuando dejas el ratón un rato sobre un botón sale un
     banner explicativo de lo que se hace en ese botón».

     No hace falta escribir nada nuevo: la app ya lleva CINCUENTA textos de
     ayuda puestos en los `title` de los botones. Lo que pasa es que el `title`
     lo pinta el navegador a su manera —tarda dos segundos, sale en gris
     diminuto, y en el móvil no sale nunca—, así que estaban escritos y no se
     leían.

     Esto los reaprovecha enteros: al posar el ratón medio segundo, el texto
     sale como un bocadillo de la app, encima del botón, legible. Y se quita el
     `title` mientras tanto para que el navegador no enseñe el suyo a la vez —
     al salir se devuelve, que es lo que hace que siga funcionando con el
     teclado y con los lectores de pantalla.

     En el móvil no hay ratón, así que no se activa: allí los botones ya son
     grandes y el texto de la pantalla explica lo que hace falta. */
  var ayudaCaja = null, ayudaReloj = null, ayudaEl = null;

  function ponerAyuda(el, txt) {
    if (!ayudaCaja) {
      ayudaCaja = document.createElement("div");
      ayudaCaja.className = "ayuda-globo";
      ayudaCaja.setAttribute("role", "tooltip");
      document.body.appendChild(ayudaCaja);
    }
    ayudaCaja.textContent = txt;
    ayudaCaja.style.visibility = "hidden";
    ayudaCaja.classList.add("visible");
    var r = el.getBoundingClientRect();
    var a = ayudaCaja.getBoundingClientRect();
    var x = r.left + r.width / 2 - a.width / 2;
    /* que no se salga por los lados */
    x = Math.max(8, Math.min(x, window.innerWidth - a.width - 8));
    var y = r.top - a.height - 8;
    var abajo = y < 8;
    if (abajo) y = r.bottom + 8;
    ayudaCaja.classList.toggle("abajo", abajo);
    ayudaCaja.style.left = Math.round(x) + "px";
    ayudaCaja.style.top = Math.round(y) + "px";
    ayudaCaja.style.visibility = "";
  }

  function quitarAyuda() {
    clearTimeout(ayudaReloj);
    if (ayudaCaja) ayudaCaja.classList.remove("visible");
    if (ayudaEl && ayudaEl.getAttribute("data-ayuda")) {
      ayudaEl.setAttribute("title", ayudaEl.getAttribute("data-ayuda"));
      ayudaEl.removeAttribute("data-ayuda");
    }
    ayudaEl = null;
  }

  function arrancarAyuda() {
    if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) return;
    document.addEventListener("mouseover", function (e) {
      var el = e.target.closest ? e.target.closest("[title]") : null;
      if (!el || el === ayudaEl) return;
      quitarAyuda();
      var txt = (el.getAttribute("title") || "").trim();
      if (txt.length < 3) return;             // un número suelto no es ayuda
      ayudaEl = el;
      el.setAttribute("data-ayuda", txt);
      el.removeAttribute("title");            // que no salga también el del navegador
      ayudaReloj = setTimeout(function () {
        if (ayudaEl === el && document.body.contains(el)) ponerAyuda(el, txt);
      }, 550);
    });
    document.addEventListener("mouseout", function (e) {
      if (!ayudaEl) return;
      var a = e.relatedTarget;
      if (a && ayudaEl.contains && ayudaEl.contains(a)) return;   // sigues dentro
      quitarAyuda();
    });
    /* al hacer clic, al soltar el foco o al mover la pantalla, fuera */
    document.addEventListener("click", quitarAyuda, true);
    window.addEventListener("scroll", quitarAyuda, true);
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
  /* ==================== ARRASTRAR (SOLO CON RATON) ====================
     Carlos, 29-sep-2026: «puedes poner ese comportamiento en la app web y
     anularlo en el móvil» y luego «las flechas sirven pero son lentas».

     Las flechas se quedan: en el móvil son lo único que hay, porque el arrastre
     de HTML no existe en una pantalla táctil, y poner `draggable` en el móvil
     además estorba al desplazar con el dedo. Así que esto se enciende sólo si
     el aparato tiene puntero fino, o sea ratón.

     Funciona moviendo la fila DE VERDAD mientras arrastras, no pintando una
     raya de destino: ves el hueco abrirse donde va a caer. Al soltar, el orden
     bueno ya está en la pantalla y sólo hay que guardarlo.

     Dos reglas: no se salta de grupo (un producto no cambia de estante ni de
     tienda arrastrando, para eso está el selector), y no se arrastra con el
     buscador puesto, porque entonces la pantalla no tiene todas las fichas y
     guardar lo que se ve borraría del orden las que están escondidas. */
  var HAY_RATON = !!(window.matchMedia && window.matchMedia("(pointer: fine)").matches);

  /* ARRASTRAR Y QUE SE GUARDE SIEMPRE (1-oct-2026).
     Carlos: «al arrastrar a veces no sale sin guardar», y «no ha salido en
     todos los casos».

     El fallo: la fila se recoloca en cuanto pasas por encima de otra —eso es
     el `dragover`, y es lo que ves—, pero el guardado colgaba del `drop`. Y el
     navegador SOLO dispara `drop` si el `dragover` pidió permiso con
     `preventDefault`, cosa que aquí solo pasaba estando justo encima de otra
     fila del mismo grupo. Si soltabas en un hueco, en el margen, sobre la
     propia fila que llevabas o fuera del grupo, no había `drop`: la fila se
     quedaba movida en pantalla y el orden NO se guardaba. De ahí el «a veces».

     El arreglo: se apunta si la fila llegó a moverse, y se guarda tanto en el
     `drop` como en el `dragend` —que ese sí lo dispara el navegador SIEMPRE,
     sueltes donde sueltes, incluso si cancelas con Escape—. La marca se apaga
     al guardar, así que nunca se guarda dos veces. */
  function montarArrastre(cont, selFila, selGrupo, alSoltar) {
    if (!HAY_RATON || !cont || cont.getAttribute("data-arrastre")) return;
    cont.setAttribute("data-arrastre", "1");
    var cogida = null, grupo = null, movida = false;

    /* Guarda lo que se ve, si es que algo llegó a moverse. */
    function guardarSiMovio() {
      if (!grupo || !movida) return;
      var gr = grupo;
      var ids = Array.prototype.map.call(gr.querySelectorAll(selFila), function (f) {
        return f.getAttribute("data-locfila") || f.getAttribute("data-compfila");
      }).filter(function (x) { return !!x; });
      movida = false;
      if (ids.length) alSoltar(gr, ids);
    }

    function soltar() {
      if (cogida) cogida.classList.remove("cogida");
      cogida = null; grupo = null; movida = false;
    }

    cont.addEventListener("dragstart", function (e) {
      var ag = e.target.closest ? e.target.closest(".agarre") : null;
      if (!ag) return;
      var fila = ag.closest(selFila);
      var gr = fila && fila.closest(selGrupo);
      if (!fila || !gr || gr.getAttribute("data-filtrado")) { e.preventDefault(); return; }
      cogida = fila; grupo = gr;
      fila.classList.add("cogida");
      try {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", fila.getAttribute("data-locfila") ||
                                             fila.getAttribute("data-compfila") || "x");
        if (e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(fila, 12, 12);
      } catch (x) {}
    });

    cont.addEventListener("dragover", function (e) {
      if (!cogida) return;
      var fila = e.target.closest ? e.target.closest(selFila) : null;
      if (!fila || fila === cogida || fila.closest(selGrupo) !== grupo) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = "move"; } catch (x) {}
      var r = fila.getBoundingClientRect();
      var arriba = (e.clientY - r.top) < r.height / 2;
      var antes = cogida.previousSibling;
      fila.parentNode.insertBefore(cogida, arriba ? fila : fila.nextSibling);
      if (cogida.previousSibling !== antes) movida = true;
    });

    cont.addEventListener("drop", function (e) {
      if (!cogida) return;
      e.preventDefault();
      guardarSiMovio();
      soltar();
    });

    /* `dragend` lo dispara el navegador SIEMPRE al acabar el arrastre, haya
       habido `drop` o no. Es la red que faltaba. */
    cont.addEventListener("dragend", function () {
      guardarSiMovio();
      soltar();
    });
  }

  /* ==================== EL ORDEN DE LA COMPRA ====================
     Carlos, 29-sep-2026: «lo que quiero es que haya una lista de compra con
     todos los productos separados por supermercado y estante, y es ahí donde lo
     ordeno de forma general para que luego en esa lista ya salgan ordenados
     según la lista de Mercadona. Cuando hacemos algún cambio, se hace en esta
     lista global».

     Y tenía razón contra lo que yo había hecho primero: ordenar desde la compra
     de la semana sólo ordena LO DE ESA SEMANA, así que la semana siguiente, con
     otros productos, el orden se deshace. Aquí están todos los que se compran en
     tienda, siempre, y el orden que salga de aquí es el que usa la lista.

     Sólo tiendas de súper: Amazon no tiene lista de pasillo que igualar. */
  function pintarOrdenCompra() {
    var cont = $("#rejilla-orden");
    if (!cont) return;
    var q = sinTildes((UI.buscaOrden || "").trim().toLowerCase());

    var deTienda = {};
    (Almacen.estado.ingredientes || []).forEach(function (g) {
      if (g.oculta || g.cat === "Restaurante y bar") return;
      /* Lo hecho en casa no se compra: lo que se compra son sus ingredientes,
         que ya salen con su tienda (Carlos, 4-oct-2026). */
      if (Almacen.esCasero && Almacen.esCasero(g.id)) return;
      var cj = Almacen.cajonDe(g);
      if (cj !== "super" && cj !== "amazon") return;   /* suscripción y «aparte» no tienen lista */
      var t = cj === "amazon" ? "Amazon" : (Almacen.tiendaDe(g) || "Sin tienda asignada");
      var zk = Almacen.zonaDeIngrediente(g.id) || "sinzona";
      var por = (deTienda[t] = deTienda[t] || {});
      (por[zk] = por[zk] || []).push({ id: g.id, n: g.n, producto: g.producto || "" });
    });

    var ordenZonas = Almacen.ZONAS.map(function (z) { return z.k; }).concat(["sinzona"]);
    var html = "", algo = false;

    Object.keys(deTienda).sort().forEach(function (tienda) {
      var bloques = "";
      ordenZonas.forEach(function (zk) {
        var lista = deTienda[tienda][zk];
        if (!lista || !lista.length) return;
        var zn = "Sin zona";
        Almacen.ZONAS.forEach(function (z) { if (z.k === zk) zn = z.n; });
        var clave = Almacen.claveCompra(tienda, zk);
        /* Se ordena SIEMPRE con la lista entera: así lo que se guarda al mover
           lleva a todos, estén o no filtrados por el buscador. */
        lista = Almacen.ordenarComoEnCompra(clave, lista);
        var vistos = q
          ? lista.filter(function (x) { return sinTildes(x.n.toLowerCase()).indexOf(q) >= 0; })
          : lista;
        if (!vistos.length) return;
        algo = true;
        bloques += '<div class="zona-compra" data-clavecompra="' + esc(clave) + '"' +
                   (q ? ' data-filtrado="1"' : '') + '>' +
          '<h4 class="estante">' + esc(zn) + '<span>' + lista.length + '</span></h4>';
        vistos.forEach(function (x) {
          bloques += '<div class="fila-compra" data-compfila="' + esc(x.id) + '">' +
            '<div class="loc-mover">' +
              (HAY_RATON && !q ? '<span class="agarre" draggable="true" title="Arrastrar para colocar" aria-hidden="true">\u283F</span>' : '') +
              '<button type="button" class="btn mini" data-ordsube="' + esc(x.id) + '" aria-label="Subir"' +
                (q ? " disabled" : "") + '>↑</button>' +
              '<button type="button" class="btn mini" data-ordbaja="' + esc(x.id) + '" aria-label="Bajar"' +
                (q ? " disabled" : "") + '>↓</button>' +
            '</div>' +
            '<div class="linea"><div class="datos"><div class="nombre">' + esc(x.n) + '</div>' +
            '<div class="detalle">' + esc(x.producto || "") + '</div></div></div>' +
          '</div>';
        });
        bloques += '</div>';
      });
      if (!bloques) return;
      html += '<h2 class="cajon-compra">' + esc(tienda) + '</h2>' + bloques;
    });

    if (!algo) {
      html = '<div class="vacio">' + (q
        ? "Nada con ese nombre entre lo que compras en tienda."
        : "Todavía no hay productos con tienda asignada.") + "</div>";
    } else if (q) {
      html = '<div class="aviso">Buscando no se puede reordenar: borra la búsqueda para mover.</div>' + html;
    }
    cont.innerHTML = html;
  }

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

        /* CAMBIAR EL CONTENEDOR, NO SÓLO PONERLO  ·  1-oct-2026.
           Antes esto salía SOLO en el grupo de los que no tenían ninguno, así que
           un contenedor mal puesto no había manera de arreglarlo desde la app.
           Carlos lo vio con la limonada: estaba como «unidades sueltas», y eso
           hace que la despensa cuente de ración en ración —250 ml— en vez de por
           botellas, así que una botella de 1,5 L salía como «6 unidades».
           Ahora el cambio está en todos los grupos. Se excluye el contenedor que
           el grupo ya tiene, que sería un botón que no hace nada. */
        html += '<div class="lote-pedir formato"><span class="nota-peque">' +
          (gr.k ? "Cambiarles el contenedor:" : "Ponerles contenedor:") + "</span>" +
          Object.keys(Almacen.FORMATOS).filter(function (k) { return k !== gr.k; }).map(function (k) {
            var ff = Almacen.FORMATOS[k];
            return '<button type="button" class="btn mini" data-loteformato="' + esc(k) + "|" + esc(ids) +
              '">' + esc(ff.n[1]) + "</button>";
          }).join("") + "</div>";
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
    /* un estante de Hogar no tiene cifras: tiene un sí o un no */
    if (x.hogar) {
      return '<div class="linea linea-tengo' + (x.falta ? " anotada" : "") +
        '" data-tengofila="' + esc(x.id) + '">' +
        '<div class="datos"><div class="nombre">' + esc(x.n) + "</div>" +
        '<div class="detalle">' + (x.falta
          ? "a la compra \u00b7 " + x.cantidad + (x.cantidad === 1 ? " unidad" : " unidades")
          : "no marcado") + "</div></div>" +
        '<button type="button" class="btn mini' + (x.falta ? " principal" : "") +
          '" data-hogarsi="' + esc(x.id) + '">' + (x.falta ? "\u2713" : "Me falta") + "</button>" +
        (x.falta ? '<button type="button" class="btn mini" data-hogarno="' + esc(x.id) +
          '">Quitar</button>' : "") +
        "</div>";
    }
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
    /* EL TÍTULO DICE LO QUE HAY, NO SI SE PULSÓ UN BOTÓN. Carlos había dado la
       vuelta entera a la casa sin pulsar «Empezar una ronda» —que no hace falta
       para nada— y esto le decía «Sin ronda empezada» con 209 fichas contadas.
       Ahora: cuándo empezó la vuelta, cuántos estantes llevas, y si está
       terminada, la fecha del último. */
    /* DOS HECHOS, NO UNA FECHA INVENTADA. El primer intento titulaba «Ronda
       iniciada el…» con el sello más antiguo, y eso miente en cuanto un estante
       se queda meses sin repasar: las especias sin mirar desde mayo ponían
       «ronda iniciada el 28 de mayo», cuando la vuelta fue ayer.
       Lo que hace falta saber es otra cosa, y son dos números:
         cuándo fue la ÚLTIMA vuelta  — si la foto es reciente
         cuál es el dato MÁS VIEJO    — qué estante la está estropeando
       El segundo sólo se enseña cuando pasa de dos días, para no dar la lata
       cuando está todo al día. */
    var falta = r.total - r.hechos;
    var comoFecha = function (d, iso) {
      return d === 0 ? "hoy" : (d === 1 ? "ayer" : "el " + Util.etiquetaFecha(iso));
    };
    var ultima = r.ultimo ? comoFecha(r.diasUltimo, r.ultimo) : "";
    var aviso = (r.masViejo && r.masViejo.dias > 2)
      ? ' \u00b7 <b class="viejo">el dato m\u00e1s viejo es ' + esc(r.masViejo.n) +
        ", de " + Util.hace(r.masViejo.dias) + "</b>"
      : "";
    var tit, sub;
    if (!r.ronda) {
      tit = "Sin repasar nunca";
      sub = "Da una vuelta a la casa y apunta lo que hay: de eso sale todo lo dem\u00e1s.";
    } else if (!falta) {
      tit = "Casa repasada";
      sub = "\u00daltima vuelta " + ultima + " \u00b7 los " + r.total + " estantes" +
            (r.saltados ? ", " + r.saltados + (r.saltados === 1 ? " dado" : " dados") + " por visto" : "") +
            aviso;
    } else {
      tit = "Ronda a medias";
      sub = "<b>" + r.hechos + " de " + r.total + "</b> estantes \u00b7 te faltan " + falta +
            " \u00b7 \u00faltima vuelta " + ultima +
            (r.saltados ? " \u00b7 " + r.saltados + (r.saltados === 1 ? " dado" : " dados") + " por visto" : "") +
            aviso;
    }
    var h = '<div class="ronda-cab">' +
      '<div class="ronda-tit">' + tit + '</div><div class="ronda-sub">' + sub + "</div>" +
      '<button type="button" class="btn" id="ronda-empezar">' +
        (r.ronda ? "Empezar otra ronda" : "Empezar una ronda") + "</button>" +
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
    /* «cómo se mide» es de los estantes de comida: en Hogar no hay envases que
       contar, hay cosas que marcar. Y sin este guardián, una ficha sin formato
       reventaba la portada entera — que es lo que pasó al estrenar Hogar. */
    var regs = {};
    p.fichas.forEach(function (f) { if (f.formato) regs[f.formato] = (regs[f.formato] || 0) + 1; });
    var comoSeMide = Object.keys(regs).sort(function (a, b) { return regs[b] - regs[a]; })
      .slice(0, 4).map(function (k) {
        var ff = Almacen.FORMATOS[k];
        return ff ? (regs[k] + " " + (regs[k] === 1 ? ff.n[0] : ff.n[1])) : "";
      }).filter(function (t) { return t; });
    /* HOGAR, COMO LISTA (4-oct-2026). Carlos: «la ficha de limpieza, aseo…
       debería ser una lista con dos botones, Hay marcado y Me falta». Aquí no
       hay nada que contar, así que pasar las fichas de una en una sobraba: el
       apartado entero en una pantalla y se marca lo que falte. */
    if (p.esHogar) {
      var hl = "";
      p.fichas.forEach(function (f) { var xh = Almacen.hogarDe(f.id); if (xh) hl += filaHogar(xh); });
      cont.innerHTML =
        '<div class="pase-portada hogar-lista">' +
          '<div class="zona">' + esc(p.zona) + "</div>" +
          "<h2>" + esc(p.estante) + "</h2>" +
          '<div class="cuenta">' + (p.marcados
            ? "<b>" + p.marcados + "</b> " + (p.marcados === 1 ? "cosa a la compra" : "cosas a la compra")
            : "Todo marcado como «Hay»") + "</div>" +
          '<div class="cuando">' + (p.dias === null ? "Sin repasar nunca"
            : (p.dias === 0 ? "Repasado hoy" : "Repasado hace " + p.dias + " d")) + "</div>" +
        "</div>" +
        '<div class="hogar-filas">' + hl + "</div>" +
        '<div class="pase-portada hogar-pie">' +
          '<button type="button" class="btn grande" data-hogarlistahecho="' + esc(p.estanteK) + '">Hecho: ' +
            esc(p.estante) + " repasado</button>" +
          '<div class="otras"><button type="button" class="btn mini" data-pasesalir="1">Volver</button></div>' +
        "</div>";
      return;
    }
    if (p.esHogar) {
      comoSeMide = [p.marcados
        ? p.marcados + (p.marcados === 1 ? " cosa a la compra" : " cosas a la compra")
        : "nada marcado"];
    }
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

    /* ---- LA FICHA DE HOGAR ---- 
       Mismo pase, otra pregunta. En la comida es «cuánto hay»; aquí es «me
       falta o no», y lo que contestes va derecho a la lista. Por eso al marcar
       se dice en la propia ficha —Carlos, 25-sep-2026— antes de saltar a la
       siguiente: «lo compras la próxima vez». */
    if (x.hogar) {
      cont.innerHTML =
        '<div class="ficha-pase">' +
          '<div class="ficha-cab">' +
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
            (x.pendiente
              ? '<div class="producto" style="color:var(--ambar)">Ponle tu marca y formato</div>'
              : (x.producto ? '<div class="producto">' + esc(x.producto) + "</div>" : "")) +
            '<div class="pide flojo">' + esc(x.cajonN) +
              (x.suplente ? " \u00b7 si no hay: " + esc(x.suplente) : "") + "</div>" +
            '<div class="hogar-botones">' +
              '<button type="button" class="btn hog-b' + (x.falta ? "" : " principal") +
                '" data-hogarno="' + esc(x.id) + '">No me falta</button>' +
              '<button type="button" class="btn hog-b' + (x.falta ? " principal" : "") +
                '" data-hogarsi="' + esc(x.id) + '">Me falta</button>' +
            "</div>" +
            (x.falta
              ? '<div class="quiero-fila activo"><span>Cu\u00e1ntos</span><div class="paso">' +
                '<button type="button" class="btn mini" data-hogarcant="' + esc(x.id) + '|-1">\u2212</button>' +
                '<span class="cuenta-lista">' + x.cantidad + "</span>" +
                '<button type="button" class="btn mini" data-hogarcant="' + esc(x.id) + '|1">+</button>' +
                "</div>" +
                '<small>\u00a1Lo compras la pr\u00f3xima vez!</small></div>'
              : "") +
          "</div>" +
          '<div class="ficha-pie">' +
            '<button type="button" class="btn mini" data-hogareditar="' + esc(x.id) + '">Editar la ficha</button>' +
          "</div>" +
        "</div>";
      return;
    }

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
    /* cuántas has pedido, no sólo si has pedido */
    var quiero = ((Almacen.estado.quiero || {})[x.id] || {}).p || 0;
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
      /* LO QUE SUPONE, EN GRANDE (30-oct-2026). Carlos: «1 bolsa - 5 platos,
         esto está bien pero no veía lo de los platos, sale muy pequeño abajo».
         Justo debajo de la cifra va lo que eso es AHORA —«= 9 raciones · 540
         g»— y debajo la regla del envase. Los platos se cuentan por PIEZA, no
         por envase: la carne picada se cuenta en paquetes de 250 g aunque la
         bandeja traiga dos. */
      (function () {
        if (!(x.pieza > 1) || x.piezaUd) return "";
        var porPieza = x.racion > 0 ? x.pieza / x.racion
                     : (x.envase > 0 ? x.porEnvase * x.pieza / x.envase : x.porEnvase);
        var total = n * x.pieza;
        var rac = porPieza > 0 ? n * porPieza : 0;
        var numE = function (v) { return String(Math.round(v * 10) / 10).replace(".", ","); };
        var linea = "= " + (rac > 0 ? numE(rac) + (Math.round(rac * 10) / 10 === 1 ? " raci\u00f3n" : " raciones") + " \u00b7 " : "") +
                    Util.cantidadReceta(total, x.u, x.pesoUd);
        return '<div class="equiv-grande" style="font-size:1.15em;font-weight:600;margin:.4em 0 .2em">' + esc(linea) + "</div>" +
          '<div class="quees">cada ' + esc(x.piezaUno) + " son " +
          esc(Util.cantidadReceta(x.pieza, x.u, x.pesoUd)) +
          (porPieza >= 0.5 && porPieza <= 60
            ? ", " + numE(porPieza) + (Math.round(porPieza * 10) / 10 === 1 ? " raci\u00f3n" : " raciones") : "") + "</div>";
      })() +
      /* LO HECHO EN CASA (v382). Carlos: «si no hay, cuando haga el stock aparezca
         un botón de Renovar ingredientes». Sale cuando queda menos de lo que pide
         una receta; «Lo he preparado» sale siempre, para el día que haces el lote. */
      (function () {
        if (!Almacen.esCasero(x.id)) return "";
        var gC = Almacen.ingrediente(x.id), rL = Almacen.receta(gC.casero.receta);
        var rinde = gC.casero.rinde || gC.envase || 1;
        var poco = Almacen.caseroPoco(x.id);
        var ffC = Almacen.FORMATOS[Almacen.formatoDe(gC)] || { n: ["", ""] };
        var lleva = rL ? (rL.ing || []).filter(function (l) {
          var i = Almacen.ingrediente(l.i); return i && !i.basico;
        }).map(function (l) {
          var i = Almacen.ingrediente(l.i);
          return Util.cantidadReceta(l.c, i.u, i.pesoUd) + " de " + i.n.split(" (")[0].toLowerCase();
        }).join(" y ") : "";
        return '<div class="casero-caja' + (poco ? " poco" : "") + '">' +
          '<div class="casero-tit">Hecho en casa' + (poco ? " \u00b7 <b>queda poco</b>" : "") + "</div>" +
          (poco ? '<button type="button" class="btn principal" data-renovar="' + esc(x.id) + '">Renovar ingredientes</button>' +
                  (lleva ? "<small>Pide " + esc(lleva) + " para la pr\u00f3xima compra.</small>" : "") : "") +
          '<button type="button" class="btn" data-preparado="' + esc(x.id) + '">Lo he preparado (+' + rinde + " " +
            esc(rinde === 1 ? ffC.n[0] : ffC.n[1]) + ")</button>" +
          (rL ? '<small><a href="#" data-comocasero="' + esc(x.id) + '">C\u00f3mo se prepara y se guarda</a></small>' : "") +
          "</div>";
      })() +
      '<button type="button" class="btn grande" data-pasesig="' + esc(x.id) + "|" + n +
        '">Apuntar y seguir</button>' +
      /* «LO QUIERO ESTA VEZ», DESDE LA FICHA, Y CON CANTIDAD (25-sep-2026).
         Nació como interruptor —un toque, una unidad— y Carlos pidió la
         cantidad aquí mismo: «para los pedidos de lo que quiero esta vez se
         debería poder elegir mientras se hace el stock, una fila Lo quiero esta
         vez y elegir la cantidad. Eso lo pasaría a la lista directamente».

         Tiene razón y es el mismo gesto que el de arriba: estás mirando el
         estante con el producto en la mano, sabes que quedan dos cervezas y que
         quieres un pack. Decirlo aquí evita el viaje a la Compra, y evita que
         se te olvide, que es peor.

         La fila es igual que la de contar, para que no haya que aprender nada:
         − cifra +. En cero desaparece de la lista. */
      (Almacen.esCasero(x.id) ? "" : '<div class="quiero-fila' + (quiero ? " activo" : "") + '">' +
        "<span>Lo quiero esta vez</span>" +
        '<div class="paso">' +
          '<button type="button" class="btn mini" data-quieropaso="' + esc(x.id) +
            '|-1"' + (quiero ? "" : " disabled") + ">\u2212</button>" +
          '<span class="cuenta-lista">' + cifra(quiero) + "</span>" +
          '<button type="button" class="btn mini" data-quieropaso="' + esc(x.id) +
            '|1">+</button>' +
        "</div>" +
        (quiero ? '<small>' + cifra(quiero) + " " +
          esc(quiero === 1 ? x.piezaUno : x.piezaVarias) + " a la pr\u00f3xima compra</small>" : "") +
      "</div>");

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
          /* CUÁNTO LLEVA CADA RECETA, POR RACIÓN (5-oct-2026). Carlos: «una cosa
             que debería salir en los ingredientes es las recetas donde aparecen y
             lo que se usa por ración de esa receta. No el aceite, ni la sal, ni
             otras cosas que estén en casi todas». Así se ve de un vistazo si una
             receta se sale de la ración de la ficha, que es lo que descuadraba el
             «cada ración son 200 g, para 7 platos». En los básicos —aceite,
             pimienta, ajo, especias: salen en casi todas— se deja sólo la cuenta,
             porque cien líneas de «2 g por ración» no dicen nada. */
          (x.platos.length
            ? '<details class="usos"><summary>Sale en ' + x.platos.length +
              (x.platos.length === 1 ? " plato" : " platos") + "</summary>" +
              (x.basico
                ? '<div class="uso flojo">Es un b\u00e1sico: entra en casi todas las recetas y en cantidades peque\u00f1as.</div>'
                : x.platos.map(function (pl) {
                    var cola = pl.planificado ? ' <b>\u00b7 planificado</b>'
                      : (pl.comido ? ' <span class="comido">\u00b7 comido el ' +
                         esc(Util.etiquetaFecha(pl.comido)) + "</span>" : "");
                    var cant = pl.porRacion > 0
                      ? '<span class="uso-cant">' +
                        esc(Util.cantidadReceta(pl.porRacion, x.u, x.pesoUd)) +
                        " por raci\u00f3n</span>" : "";
                    return '<div class="uso' + (pl.planificado ? " planificado" : "") +
                      (pl.comido ? " yacomido" : "") + '">' + esc(pl.n) + cola + cant + "</div>";
                  }).join("")) + "</details>"
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
        /* el resumen de un estante de Hogar cuenta otra cosa: lo que se va a
           la lista, no cuánto queda en el armario */
        (p.esHogar
          ? '<div class="cuenta"><b>' + p.marcados + "</b> " +
            (p.marcados === 1 ? "cosa" : "cosas") + " a la pr\u00f3xima compra</div>"
          : '<div class="cuenta"><b>' + p.conAlgo + "</b> con algo · <b>" +
            (p.marcadas - p.conAlgo) + "</b> sin nada · <b>" +
            (p.total - p.marcadas) + "</b> sin mirar</div>") +
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
  /* EL STOCK EN LA PANTALLA DE LOCALIZACIÓN (Carlos, 2-oct-2026): «en cada
     estante sale el producto, puede salir el stock que queda de cada referencia
     como información». Es información, no un campo: aquí no se cuenta, se
     coloca; contar es «¿Lo tengo?». Tres estados y nada más:
       ficha sin contar   -> «sin contar»  (ni mientes ni avisas)
       contada en cero    -> «no queda»    (eso sí es un dato)
       con existencias    -> «quedan X» y, si hay platos que ya lo reservan,
                             «libre Y», que es lo que de verdad puedes gastar. */
  function textoStockLoc(g) {
    if (!Almacen.fichaStock(g.id)) return ' · <span class="st-casi">sin contar</span>';
    var hay = Almacen.stockDe(g.id);
    if (hay <= 0) return ' · <b class="st-falta">no queda</b>';
    var cant = function (c) { return esc(Util.cantidadReceta(c, g.u, g.pesoUd)); };
    var libre = Almacen.libre(g.id);
    return ' · <b class="st-hay">quedan ' + cant(hay) + '</b>' +
      (libre < hay ? ' · libre ' + cant(libre) : "");
  }

  function lineaLoc(g, estanteActual) {
    var av = (locAvisos || {})[g.id];
    /* Las flechas de ordenar: sólo dentro de un estante. En Pendiente no hay
       orden que valga porque esas fichas todavía no están en ningún sitio. */
    var flechas = estanteActual
      ? '<div class="loc-mover">' +
          (HAY_RATON ? '<span class="agarre" draggable="true" title="Arrastrar para colocar" aria-hidden="true">\u283F</span>' : '') +
          '<button type="button" class="btn mini" data-locsube="' + esc(g.id) + '" aria-label="Subir ' + esc(g.n) + '">\u2191</button>' +
          '<button type="button" class="btn mini" data-locbaja="' + esc(g.id) + '" aria-label="Bajar ' + esc(g.n) + '">\u2193</button>' +
        '</div>'
      : "";
    return '<div class="linea linea-loc" data-locfila="' + esc(g.id) + '">' +
      flechas +
      '<div class="datos"><div class="nombre">' + esc(g.n) + '</div>' +
      '<div class="detalle">' + esc(g.cat) + textoStockLoc(g) +
        (av ? ' · <b style="color:var(--ambar)">lo usa ' + esc(av.platos.slice(0, 2).join(", ")) +
              (av.platos.length > 2 ? " y " + (av.platos.length - 2) + " más" : "") + '</b>' : "") +
      '</div></div>' +
      '<select class="loc-sel" data-loc="' + esc(g.id) + '" aria-label="Dónde se guarda ' + esc(g.n) + '">' +
        '<option value=""' + (estanteActual ? "" : " selected") + '>— sin colocar —</option>' +
        Almacen.ZONAS.filter(function (z) { return !z.soloHogar; }).map(function (z) {
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
    Almacen.ZONAS.filter(function (z) { return !z.soloHogar; }).forEach(function (z) {
      var n = casa.filter(function (g) {
        var k = Almacen.sitioDe(g);
        return z.estantes.some(function (e) { return e.k === k; });
      }).length;
      var d = document.querySelector('#rejilla-loc [data-zona="' + z.k + '"] .cuantas');
      if (d) d.textContent = n || "—";
    });
  }

  /* EL BOTÓN DE CONFIRMAR CAMBIOS (Carlos, 29-sep-2026): «se destaca si hay
     algún cambio y se apaga cuando se ordenen o al principio si no hay cambios».
     Cambiar el estante de una fila NO recoloca la lista —eso te haría perder por
     dónde ibas— así que los cambios se acumulan y este botón los recoloca todos
     de una vez. Apagado significa: no hay nada pendiente. */
  function pintarBotonLoc() {
    var b = $("#loc-reordenar");
    if (!b) return;
    var n = UI.locCambios || 0;
    b.disabled = !n;
    b.classList.toggle("avisa", !!n);
    b.classList.remove("ok-github");   /* el «Guardado en GitHub» es de la vez anterior */
    b.textContent = n ? "Confirmar cambios (" + n + ")" : "Confirmar cambios";
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
    Almacen.ZONAS.filter(function (z) { return !z.soloHogar; }).forEach(function (z) {
      var deZona = z.estantes.map(function (e) {
        /* en el orden de la nevera, no en el alfabético */
        return { e: e, ing: Almacen.ordenarComoEnCasa(e.k,
          filtra(casa.filter(function (g) { return Almacen.sitioDe(g) === e.k; }))) };
      });
      var total = deZona.reduce(function (a, x) { return a + x.ing.length; }, 0);
      if (q && !total) return;
      var abierta = q ? true : UI.zonaAbierta === z.k;
      html += '<details class="grupo-selec zona-loc"' + (abierta ? " open" : "") +
        ' data-zona="' + esc(z.k) + '"><summary><span class="tit">' + esc(z.n) + "</span>" +
        '<span class="cuantas">' + (total || "—") + "</span></summary>";
      /* UN DESPLEGABLE POR ESTANTE (Carlos, 29-sep-2026): «los estantes de cada
         localización deberían ser desplegables… ahora están abiertos y dificulta
         navegar». Cerrados por defecto y sólo uno abierto a la vez; buscando se
         abren todos, que es cuando quieres verlo todo de golpe. */
      deZona.forEach(function (x) {
        var abiertoE = q ? true : (UI.estanteAbierto === x.e.k);
        html += '<details class="grupo-selec estante-loc"' + (abiertoE ? " open" : "") +
          (q ? ' data-filtrado="1"' : '') +
          ' data-estanteloc="' + esc(x.e.k) + '"><summary><span class="tit">' + esc(x.e.n) +
          '</span><span class="cuantas">' + (x.ing.length || "—") + "</span></summary>";
        x.ing.forEach(function (g) { html += lineaLoc(g, x.e.k); });
        html += "</details>";
      });
      html += "</details>";
    });
    cont.innerHTML = html;
    pintarBotonLoc();
  }

  /* ==================== HOGAR, COMO UN PASE ====================
     Carlos, 25-sep-2026: «hogar debe tener el formato de ¿Lo tengo?».

     Y es el mismo trabajo: recorrer la casa mirando cosas y decidiendo. Lo que
     cambia es que aquí no hay cantidades que contar —llevar el inventario de
     las bayetas no paga— sino una sola pregunta: ¿me falta o no?

     Los cuatro apartados hacen de estantes: Limpieza, Menaje, Aseo y Mascota.
     Mismo índice, misma ficha a pantalla completa, mismos botones de avanzar y
     retroceder, y la misma salida de «por visto» para el apartado que hoy no
     vas a abrir. Quien ya sabe usar ¿Lo tengo? no aprende nada nuevo. */
  function pintarPaseHogar() {
    var cont = $("#rejilla-hogar");
    if (!cont) return false;
    if (UI.paseHogar.vista === "indice") return false;   // lo pinta la lista de siempre

    var lista = fichasApartado(UI.paseHogar.ap);
    if (!lista.length) { UI.paseHogar = { vista: "indice", ap: null, i: 0 }; return false; }
    var ap = null;
    Almacen.APARTADOS.forEach(function (a) { if (a.k === UI.paseHogar.ap) ap = a; });

    if (UI.paseHogar.i >= lista.length) {
      var marc = lista.filter(function (x) { return Almacen.faltaHogar(x.id); }).length;
      cont.innerHTML = '<div class="ficha-pase"><div class="ficha-cuerpo">' +
        "<h2>" + esc(ap ? ap.n : "") + ", repasado</h2>" +
        '<div class="pide">' + (marc ? marc + (marc === 1 ? " cosa" : " cosas") + " a la compra"
                                     : "No te falta nada de aqu\u00ed") + "</div>" +
        '<button type="button" class="btn grande" data-hogarindice="1">Volver a los apartados</button>' +
        "</div></div>";
      return true;
    }

    var x = lista[UI.paseHogar.i];
    var falta = Almacen.faltaHogar(x.id);
    var c = Almacen.cantidadHogar(x.id);
    var cajon = x.cajon || "amazon";
    var det = esc(Almacen.nombreCajon(cajon));
    if (cajon === "suscripcion") det += " \u00b7 llega sola";
    if (x.suplente) det += " \u00b7 si no hay: " + esc(x.suplente);
    var pct = Math.round(UI.paseHogar.i / lista.length * 100);

    cont.innerHTML =
      '<div class="ficha-pase">' +
        '<div class="ficha-cab">' +
          '<button type="button" class="btn nav" data-hogaratras="1"' +
            (UI.paseHogar.i ? "" : " disabled") + ' aria-label="Anterior">&#8249;</button>' +
          '<div class="donde">' + esc(ap ? ap.n : "") + "<span>" + (UI.paseHogar.i + 1) +
            " de " + lista.length + "</span></div>" +
          '<button type="button" class="btn nav" data-hogardelante="1"' +
            (UI.paseHogar.i + 1 < lista.length ? "" : " disabled") + ' aria-label="Siguiente">&#8250;</button>' +
          '<button type="button" class="btn mini" data-hogarindice="1">Salir</button>' +
        "</div>" +
        '<div class="barra"><span style="width:' + pct + '%"></span></div>' +
        '<div class="ficha-cuerpo">' +
          "<h2>" + esc(x.n) + "</h2>" +
          (x.pendiente
            ? '<div class="producto" style="color:var(--ambar)">Ponle tu marca y formato</div>'
            : (x.generico ? '<div class="producto">' + esc(x.generico) + "</div>" : "")) +
          '<div class="pide flojo">' + det + "</div>" +
          '<div class="hogar-botones">' +
            /* `grande` ya es el botón principal de la app, así que poniéndolo
               en los dos salían los dos en verde y no se veía cuál está
               elegido. Aquí el verde lo lleva sólo la respuesta que está
               puesta, igual que los atajos de contar. */
            '<button type="button" class="btn hog-b' + (falta ? "" : " principal") +
              '" data-hogarno="' + esc(x.id) + '">No me falta</button>' +
            '<button type="button" class="btn hog-b' + (falta ? " principal" : "") +
              '" data-hogarsi="' + esc(x.id) + '">Me falta</button>' +
          "</div>" +
          (falta
            ? '<div class="quiero-fila activo"><span>Cu\u00e1ntos</span><div class="paso">' +
              '<button type="button" class="btn mini" data-hogarcant="' + esc(x.id) + '|-1">\u2212</button>' +
              '<span class="cuenta-lista">' + c + "</span>" +
              '<button type="button" class="btn mini" data-hogarcant="' + esc(x.id) + '|1">+</button>' +
              "</div></div>"
            : "") +
        "</div>" +
        '<div class="ficha-pie">' +
          '<button type="button" class="btn mini" data-hogareditar="' + esc(x.id) + '">Editar la ficha</button>' +
        "</div>" +
      "</div>";
    return true;
  }

  /* Las fichas de un apartado, en el orden en que se pasan. */
  function fichasApartado(k) {
    var estF = estanteDeApartado(k);
    var l = (Almacen.estado.hogarLista || []).filter(function (x) {
      return !x.oculta && x.cat === k;
    });
    return estF ? Almacen.ordenarComoEnCasa(estF, l) : l.sort(function (a, b) { return a.n.localeCompare(b.n); });
  }

  function avanzarHogar() {
    var lista = fichasApartado(UI.paseHogar.ap);
    UI.paseHogar.i = Math.min(UI.paseHogar.i + 1, lista.length);
    pintarHogar();
    var c = $("#rejilla-hogar");
    if (c) try {
      var y = c.getBoundingClientRect().top + (window.pageYOffset || 0) - 58;
      window.scrollTo({ top: y > 0 ? y : 0 });
    } catch (e) {}
  }

  /* Una fila de Hogar con sus dos botones, Hay / Me falta. La usan la lista de
     Despensa → Hogar y la entrada de cada apartado en «¿Lo tengo?», para que
     las dos sean la misma cosa (Carlos, 4-oct-2026). */
  /* El estante de Hogar que corresponde a un apartado («Limpieza» → hog_limpieza). */
  function estanteDeApartado(cat) {
    var k = null;
    Almacen.ZONAS.forEach(function (z) { z.estantes.forEach(function (e) { if (e.hogar === cat) k = e.k; }); });
    return k;
  }

  function filaHogar(x, mover) {
    var falta = Almacen.faltaHogar(x.id);
    var cajon = x.cajon || "amazon";
    var det = esc(Almacen.nombreCajon(cajon));
    if (cajon === "suscripcion") det += ' \u00b7 llega sola';
    if (x.suplente) det += ' \u00b7 si no hay: ' + esc(x.suplente);
    if (x.pendiente) det = '<span style="color:var(--ambar)">Ponle tu marca y formato</span> \u00b7 ' + det;
    else if (x.generico) det = esc(x.generico) + ' \u00b7 ' + det;
    /* HAY / ME FALTA (4-oct-2026). Carlos: «debería ser una lista con dos
       botones, Hay marcado y Me falta que selecciono para ir a la lista de
       la compra. Cuando se confirma la compra se pasa de Me falta a Hay».
       Lo segundo ya lo hacía `confirmarHogar` (quita la marca); lo que
       cambia es la fila: dos botones grandes en vez de una casilla. */
    /* ORDENAR COMO ESTÁ EN CASA (4-oct-2026). Carlos: «en Hogar quiero igual
       que con los ingredientes: ordenar los productos de acuerdo a cómo los
       encuentro en casa, con flechas y un botón para arrastrarlo». Mismo
       agarre y mismas flechas que en Localización. */
    var flechas = mover
      ? '<div class="loc-mover">' +
          (HAY_RATON ? '<span class="agarre" draggable="true" title="Arrastrar para colocar" aria-hidden="true">\u283F</span>' : '') +
          '<button type="button" class="btn mini" data-hogsube="' + esc(x.id) + '" aria-label="Subir ' + esc(x.n) + '">\u2191</button>' +
          '<button type="button" class="btn mini" data-hogbaja="' + esc(x.id) + '" aria-label="Bajar ' + esc(x.n) + '">\u2193</button>' +
        '</div>'
      : "";
    return '<div class="linea linea-hogar hl' + (falta ? " falta" : "") + '" data-locfila="' + esc(x.id) + '">' +
              flechas +
              '<div class="datos"><div class="nombre">' + esc(x.n) + '</div>' +
              '<div class="detalle">' + det + '</div></div>' +
              '<div class="hl-botones">' +
                '<button type="button" class="btn hl-b' + (falta ? "" : " principal") +
                  '" data-hlhay="' + esc(x.id) + '">Hay</button>' +
                '<button type="button" class="btn hl-b' + (falta ? " on-falta" : "") +
                  '" data-hlfalta="' + esc(x.id) + '">Me falta</button>' +
              '</div>' +
              (falta ? '<div class="hl-cant"><span>Cu\u00e1ntos</span>' +
                '<button type="button" class="btn mini" data-hogarcant="' + esc(x.id) + '|-1">\u2212</button>' +
                '<span class="cuenta-lista">' + Almacen.cantidadHogar(x.id) + '</span>' +
                '<button type="button" class="btn mini" data-hogarcant="' + esc(x.id) + '|1">+</button></div>' : '') +
              '<button class="btn mini solo-edicion" data-hogareditar="' + esc(x.id) + '">Editar</button>' +
            '</div>';
  }

  function pintarHogar() {
    var cont = $("#rejilla-hogar");
    if (!cont) return;
    /* con el pase abierto se esconden el buscador y el filtro: una pantalla a
       la vez, igual que en ¿Lo tengo? */
    var q = sinTildes((UI.busquedaHogar || "").trim().toLowerCase());
    var todo = (Almacen.estado.hogarLista || []).filter(function (x) {
      if (x.oculta) return false;
      if (UI.cajonHogar && (x.cajon || "amazon") !== UI.cajonHogar) return false;
      if (q && sinTildes((x.n + " " + (x.generico || "")).toLowerCase()).indexOf(q) < 0) return false;
      return true;
    });
    var html = "", faltan = 0;
    /* Los apartados que tenías abiertos siguen abiertos al marcar: si no, al
       quitar la última marca se te cerraba el grupo debajo del dedo. */
    var abiertos = {};
    Array.prototype.forEach.call(cont.querySelectorAll("details[data-hap][open]"), function (d) {
      abiertos[d.getAttribute("data-hap")] = true;
    });
    /* EL ÍNDICE, COMO EL DE ¿LO TENGO? (25-sep-2026). Sin buscar, cuatro filas
       —una por apartado— y entras a pasarlas de una en una. Buscando, la lista
       de siempre con sus casillas, que es lo que hace falta cuando ya sabes qué
       vienes a marcar. */
    Almacen.APARTADOS.forEach(function (ap) {
      var lista = todo.filter(function (x) { return x.cat === ap.k; });
      if (!lista.length) return;
      var estH = estanteDeApartado(ap.k);
      lista = estH ? Almacen.ordenarComoEnCasa(estH, lista)
                   : lista.sort(function (a, b) { return a.n.localeCompare(b.n); });
      /* Ordenar sólo con la lista entera a la vista: con el buscador o el
         filtro de cajón puesto, mover o arrastrar dejaría fuera las escondidas. */
      var puedeMover = !!estH && !q && !UI.cajonHogar;
      var marcados = lista.filter(function (x) { return Almacen.faltaHogar(x.id); }).length;
      faltan += marcados;
      html += '<details class="grupo-selec" data-hap="' + esc(ap.k) + '"' +
                (estH ? ' data-hogest="' + esc(estH) + '"' : '') +
                (puedeMover ? '' : ' data-filtrado="1"') +
                (marcados || q || abiertos[ap.k] ? " open" : "") + '>' +
                '<summary><span class="tit">' + esc(ap.n) + '</span>' +
                '<span class="cuantas">' + (marcados ? marcados + " / " + lista.length : lista.length) + '</span></summary>';
      lista.forEach(function (x) { html += filaHogar(x, puedeMover); });
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

    /* Los básicos también cuentan: una tienda con sólo básicos se quedaba sin lista. */
    if (!totalLineas && !totalHogar && !datos.basicos.length) {
      $("#compra-resumen").textContent = "Nada que comprar: o no hay men\u00fa planificado en esas fechas, " +
        "o lo que hace falta ya est\u00e1 en la despensa.";
      $("#platos-compra").innerHTML = "";
    }
    var nadaQueComprar = !totalLineas && !totalHogar && !datos.basicos.length;
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
      totalLineas + " de comida" + (totalHogar ? " \u00b7 " + totalHogar + " de casa" : "") +
      (pedidos ? " \u00b7 " + pedidos + " ya cogidos" : "") +
      ". Al salir de cada tienda, o al llegar el pedido, pulsa su \u00abComprado\u00bb.";
    if (nadaQueComprar) $("#compra-resumen").textContent = "Nada que comprar: o no hay men\u00fa planificado en esas fechas, " +
      "o lo que hace falta ya est\u00e1 en la despensa.";
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

    /* UNA LISTA POR TIENDA (v414, 4-oct-2026). Carlos: «hay tantas listas de
       compra como tienda donde comprar. Se marca comprado en la lista de la
       tienda y todo se pone como comprado. Yo deselecciono lo que no haya
       llegado, que pasa a una lista pendiente». Hasta la v413 era una sola
       página —Amazon arriba, el súper partido por tiendas— con un «Ha llegado»
       general. Ahora cada tienda es su lista, con su botón «Comprado».
       Dentro de cada una manda el orden de sus listas de Mercadona, igual que
       antes: zona y orden de compra; lo de casa, por apartado. */
    var tiendas = {};
    function tnd(nom) { return (tiendas[nom] = tiendas[nom] || { comida: [], casa: [], basicos: [] }); }
    function tiendaDeLinea(l) { return l.cajon === "amazon" ? "Amazon" : (l.tienda || "Sin tienda asignada"); }
    datos.secciones.forEach(function (sec) {
      sec.lineas.forEach(function (l) { tnd(tiendaDeLinea(l)).comida.push(l); });
    });
    datos.basicos.forEach(function (l) { tnd(tiendaDeLinea(l)).basicos.push(l); });
    (hogar.amazon || []).forEach(function (x) { tnd("Amazon").casa.push(x); });
    (hogar.super || []).forEach(function (x) { tnd(x.tienda || "Sin tienda asignada").casa.push(x); });
    /* TODAS LAS TIENDAS, AUNQUE TENGAN 0 (v416, Carlos: «pon todas las listas
       aunque pongan 0 productos»). Las casillas quedan siempre en el mismo
       sitio y se sabe de un vistazo que en DIA no hace falta nada. */
    Almacen.tiendasConocidas().forEach(function (t) { tnd(t); });
    tiendasCompra = tiendas;
    sembrarPedido11oct(tiendas);                                   // v529, una vez
    if (nuevosACerrados(tiendas)) {                                // pedido cerrado: lo nuevo, a Pendiente
      moviendoAPendiente = true;
      try { pintarCompra(); } finally { moviendoAPendiente = false; }
      return;
    }

    var primeras = ["Mercadona", "Mercadona Tienda", "Amazon"];
    var nombres = Object.keys(tiendas).sort(function (a, b) {
      if (a === "Sin tienda asignada") return 1;
      if (b === "Sin tienda asignada") return -1;
      var ia = primeras.indexOf(a), ib = primeras.indexOf(b);
      if (ia < 0) ia = 99;
      if (ib < 0) ib = 99;
      return ia !== ib ? ia - ib : a.localeCompare(b);
    });

    /* UNA CASILLA POR TIENDA (v415, 4-oct-2026). Carlos, al ver la v414:
       «prefiero una casilla por tienda (con los productos que tiene) y que al
       seleccionarla se despliegue la lista en ventana emergente, simplificada y
       compacta, para facilitar la compra. Así, si la lista de Mercadona es muy
       grande, lo demás no saldrá muy abajo». La lista larga, con sus detalles,
       ya no se pinta aquí: va a la ventana de cada tienda. */
    var html = '<div class="tiendas-rejilla">' + tilePendiente();
    nombres.forEach(function (nom) {
      var g = tiendas[nom];
      var todas = g.comida.concat(g.basicos);
      var total = todas.length + g.casa.length;
      var cogidos = todas.filter(function (l) { return l.marcado; }).length +
                    g.casa.filter(function (x) { return Almacen.estaPedido(x.id); }).length;
      /* LO QUE VAS A GASTAR EN ESA TIENDA (10-oct-2026): lo de comida, con el
         último precio de cada producto. Lo de casa no lleva precio todavía. */
      var gasto = 0, sinP = 0;
      todas.forEach(function (l) {
        var pu = Almacen.precioUnidad(l.id);
        if (pu && l.cantidad > 0) gasto += pu.e * l.cantidad; else sinP++;
      });
      var esManual = nom === "Mercadona Tienda";
      html += '<button type="button" class="tile-tienda' + (cogidos && !esOnline(nom) ? " con-cogidos" : "") + (total || esManual ? "" : " tile-vacia") +
              (esOnline(nom) && (nuevosDe(nom, g).length || quitadosDe(nom, g).length) ? " con-nuevos" : "") +
              '" data-abrirtienda="' + esc(nom) + '">' +
              '<span class="tile-nom">' + esc(nom) + '</span>' +
              (esManual ? '<span class="tile-pie">a\u00f1ade con el +</span>' : ('<span class="tile-num">' + total + '</span>' +
              '<span class="tile-pie">' + (total === 1 ? "producto" : "productos") +
                (esOnline(nom) ? " \u00b7 a domicilio" : (cogidos ? " \u00b7 " + cogidos + " cogidos" : "")) + '</span>')) +
              (gasto > 0 ? '<span class="tile-pie">\u2248 ' + Util.euros(gasto) + (sinP ? " \u00b7 " + sinP + " sin precio" : "") + '</span>' : '') +
              (esOnline(nom) && pedidoDe(nom) ? (function () {
                 var nn = nuevosDe(nom, g).length, nq = quitadosDe(nom, g).length;
                 var q = nq ? '<span class="tile-quitados">' + nq + (nq === 1 ? " QUITADO" : " QUITADOS") + ' desde el pedido</span>' : '';
                 if (pedidoDe(nom).cerrado) {
                   /* Aviso si se olvida pulsar «Pedido recibido» (22-oct-2026): sin esto,
                      el candado se queda puesto en silencio y todo lo nuevo se va a
                      Pendiente sin que nadie lo note. Ámbar al día siguiente, rojo a los 3. */
                   var dC = Math.floor((Date.now() - new Date(pedidoDe(nom).cerrado).getTime()) / 86400000);
                   var col = dC >= 3 ? "var(--rojo)" : dC >= 1 ? "var(--ambar)" : "";
                   return '<span class="tile-pie"' + (col ? ' style="color:' + col + ';font-weight:600"' : '') + '>🔒 pedido cerrado' +
                          (dC >= 1 ? ' · hace ' + dC + (dC === 1 ? ' día' : ' días') : '') +
                          (dC >= 1 ? ' — ¿ha llegado?' : '') + '</span>' + q;
                 }
                 return (nn ? '<span class="tile-nuevos">' + nn + (nn === 1 ? " NUEVO" : " NUEVOS") + ' desde el pedido</span>'
                            : (nq ? '' : '<span class="tile-pie">✓ pedido hecho</span>')) + q;
               })() : '') +
              '</button>';
    });
    html += '</div>';
    /* LO GASTADO DE VERDAD ESTE MES, con los tickets archivados (10-oct-2026) */
    var mesHoy = Util.hoyISO().slice(0, 7), gm = Almacen.gastoMes(mesHoy);
    if (gm.tickets) html += '<p class="nota-peque" style="margin-top:8px">Gastado este mes, seg\u00fan tus tickets: <b>' +
      Util.euros(gm.e) + '</b> \u00b7 ' + gm.tickets + (gm.tickets === 1 ? ' ticket' : ' tickets') + '</p>';
    $("#lista-compra").innerHTML = html;
    $("#compra-ocultar").textContent = UI.ocultarComprados ? "Ver todo" : "Ocultar lo cogido";
    refrescarBotonRecibida();
  }

  /* «COMPRADO» EN UNA TIENDA (v414). Un solo botón para los dos casos:
       · en la tienda física has ido marcando lo que coges → salen tus marcas,
         y lo que dejaste sin marcar es lo que no había;
       · en la compra online no marcas nada → sale TODO marcado como llegado
         y desmarcas lo que no haya venido.
     Lo marcado entra en la despensa; lo desmarcado pasa a Pendiente, con el
     día que el menú lo necesita. El suplente, si lo tiene, se sigue ofreciendo. */
  /* LA LISTA DE UNA TIENDA, COMPACTA (v415). Casilla, nombre y cantidad, y
     nada más: es la que se lleva en la mano por los pasillos. El orden es el
     de siempre —zona y orden de sus listas de Mercadona; lo de casa por
     apartado—. Marcar aquí es «lo he cogido»; «Comprado», al pie, cierra la
     tienda por el camino de la v414. */
  /* TIENDA A DOMICILIO O TIENDA FÍSICA (v416). Carlos, 4-oct-2026: «en la
     lista de Mercadona pon las instrucciones: cuando llegue la compra marca
     comprado y desmarca los productos que no han llegado… en el resto de
     supermercados la lista para rellenar en el supermercado». Mercadona y
     Amazon llegan a casa: su lista es para LEER al hacer el pedido, sin
     casillas, y «Comprado» lo trae todo marcado. En las demás se marca en la
     tienda según se coge. */
  var TIENDAS_ONLINE = ["Mercadona", "Amazon"];
  function esOnline(nom) { return TIENDAS_ONLINE.indexOf(nom) >= 0; }

  /* LO NUEVO DESDE EL PEDIDO (v529, 11-oct-2026). Carlos, al ver la lima y el
     salmón ahumado que aparecieron tras apuntar como cenada en casa la cena del
     sábado: «lo que hay que hacer es marcar los nuevos productos para añadirlos
     yo a la compra de Mercadona si es posible o desmarcarlos para que pasen a
     pendientes si ya no puedo actualizar la compra. Lo importante es que se vea
     bien y claro que son nuevos añadidos a la lista».
     Y a las 10:16, el flujo que quiere: «una vez que hago menú y me das lista
     oficial, un botón de pedido hecho marca el límite. Me añades dos productos,
     los añado y otra vez pedido hecho y marcas nuevo límite. Un botón de pedido
     cerrado mueve esos productos directamente a pendientes, y ha llegado como
     pedido recibido». Así que: «Pedido hecho» (las veces que haga falta),
     «Pedido cerrado» (lo nuevo, y lo que aparezca después, a Pendiente) y
     «Pedido recibido» (lo de siempre al llegar).
     Primera versión (descartada por la de arriba):
     En las tiendas a domicilio, «He hecho el pedido» guarda la foto de la lista
     (`estado.compraPedido[tienda] = { en, ids: { id: cantidad } }`). Desde ahí,
     lo que aparece o pide más cantidad sale como NUEVO hasta que él decide:
     «Lo he añadido al pedido» (entra en la foto) o «A Pendiente» (el mismo
     camino que lo que no llega). «Ha llegado la compra» borra la foto. */
  function pedidoDe(nom) {
    var p = (Almacen.estado.compraPedido || {})[nom];
    return p && p.ids ? p : null;
  }
  function cantDeLinea(x) {
    if (x.envases > 0) return x.envases;                  // comida: envases que se piden
    if (x.cantidad != null) return x.cantidad;
    return x.c || 1;                                     // casa
  }
  function lineasDeTienda(g) {
    var out = [];
    g.comida.concat(g.basicos).forEach(function (l) { out.push({ l: l, casa: false }); });
    g.casa.forEach(function (x) { out.push({ l: x, casa: true }); });
    return out;
  }
  /* EL TICKET DE ESA TIENDA, SI HAY UNO RECIENTE SIN RECIBIR (13-oct-2026).
     Cuando está cargado, el ticket manda: lo que trae ya está comprado (no es
     NUEVO ni va a Pendiente aunque el pedido esté cerrado) y al recibir sale
     marcado sólo lo que viene en él. */
  function ticketDeTienda(nom) {
    var ts = Almacen.estado.tickets || {}, mejor = null, desde = Util.sumarDias(Util.hoyISO(), -4);
    Object.keys(ts).forEach(function (ref) {
      var t = ts[ref];
      if (!t || t.recibido || (t.donde || "Mercadona") !== nom || String(t.f) < desde) return;
      if (!mejor || String(t.f) > String(mejor.t.f)) mejor = { ref: ref, t: t };
    });
    if (!mejor) return null;
    var ids = {};
    (mejor.t.lineas || []).forEach(function (l) { ids[l.i] = l.p || 1; });
    return { ref: mejor.ref, t: mejor.t, ids: ids };
  }
  function nuevosDe(nom, g) {
    var p = pedidoDe(nom);
    if (!p || !g) return [];
    var tk = ticketDeTienda(nom);
    return lineasDeTienda(g).filter(function (o) {
      if (tk && tk.ids[o.l.id] != null) return false;            // lo trae el ticket: ya está comprado
      var a = p.ids[o.l.id];
      o.antes = a == null ? null : a;
      return a == null || cantDeLinea(o.l) > a + 0.001;
    });
  }
  /* LO QUITADO DESDE EL PEDIDO (11-oct-2026). Carlos: «me han dado calabacines
     en el pueblo y cherry que me iban a traer en Mercadona y parece que han
     desaparecido de la lista… igual que con lo nuevo, lo borrado debería
     desaparecer anunciándolo para que lo quite del pedido de mercadona si estoy
     a tiempo». Es la otra mitad de NUEVO: lo que estaba en la foto del pedido y
     ya no está en la lista, o está con menos envases. */
  function quitadosDe(nom, g) {
    var p = pedidoDe(nom);
    if (!p || !g) return [];
    var ahora = {};
    lineasDeTienda(g).forEach(function (o) { ahora[o.l.id] = { q: cantDeLinea(o.l), casa: o.casa }; });
    var out = [], tk = ticketDeTienda(nom);
    Object.keys(p.ids).forEach(function (id) {
      if (tk && tk.ids[id] != null) return;          // lo trae el ticket: su cantidad es la buena (13-oct-2026)
      var antes = p.ids[id], hoy = ahora[id] ? ahora[id].q : 0;
      if (!(hoy < antes - 0.001)) return;
      var ing = Almacen.ingrediente(id), hog = !ing && Almacen.hogarDe ? Almacen.hogarDe(id) : null;
      var nombre = ing ? (ing.producto || ing.n) : hog ? hog.n : id;
      var fmt = function (q) {
        if (!ing) return "\u00d7" + q;
        if (ing.u === "ud" && ing.envase > 0) return Math.round(q * ing.envase * 100) / 100 + " ud";
        if (ing.envase > 0) return (q === 1 ? "" : q + " \u00d7 ") + Util.formatearCantidad(ing.envase, ing.u);
        return Util.formatearCantidad(q, ing.u);
      };
      out.push({ id: id, nombre: nombre, antes: antes, hoy: hoy, sobra: Math.round((antes - hoy) * 100) / 100,
                 casa: !ing, txtAntes: fmt(antes), txtHoy: hoy > 0 ? fmt(hoy) : "" });
    });
    return out;
  }
  function fotoPedido(nom, g, quitar) {
    var ids = {};
    lineasDeTienda(g).forEach(function (o) { if (!(quitar && quitar[o.l.id])) ids[o.l.id] = cantDeLinea(o.l); });
    return ids;
  }
  function apuntarPedido(nom, g) {
    if (!Almacen.estado.compraPedido) Almacen.estado.compraPedido = {};
    Almacen.estado.compraPedido[nom] = { en: new Date().toISOString(), ids: fotoPedido(nom, g) };
    Almacen.guardar("compra");
  }
  /* «Pedido cerrado»: ya no se puede tocar el pedido. Lo nuevo se va a Pendiente,
     ahora y lo que aparezca hasta «Pedido recibido». */
  function cerrarPedido(nom, g) {
    var p = pedidoDe(nom);
    if (!p) return 0;
    var nv = nuevosDe(nom, g);
    nv.forEach(function (o) { nuevoAPendiente(nom, o.l.id); });
    p.cerrado = new Date().toISOString();
    Almacen.guardar("compra");
    return nv.length;
  }
  /* «Reiniciar pedido» (22-oct-2026). Carlos: el pedido de Mercadona se quedó
     cerrado 10 días sin pulsar nunca «Pedido recibido», y mientras tanto todo
     lo nuevo del menú se iba solo a Pendiente como «no vino en Mercadona» sin
     haber pasado nada. «Pedido recibido» no sirve para desatascarlo: mete en
     la despensa lo que esté marcado en ese momento, como si de verdad hubiera
     llegado. Este botón solo quita el candado — borra el pedido guardado de
     esa tienda, sin tocar despensa ni Pendiente. Lo que ya cayó a Pendiente
     mientras estuvo atascado se queda ahí: hay que repasarlo a mano. */
  function reiniciarPedido(nom) {
    if (!Almacen.estado.compraPedido || !Almacen.estado.compraPedido[nom]) return;
    delete Almacen.estado.compraPedido[nom];
    Almacen.guardar("compra");
  }
  /* con el pedido cerrado, lo que aparezca va solo a Pendiente (al pintar la compra) */
  var moviendoAPendiente = false;
  function nuevosACerrados(tiendas) {
    if (moviendoAPendiente) return 0;
    var n = 0;
    TIENDAS_ONLINE.forEach(function (nom) {
      var p = pedidoDe(nom), g = tiendas && tiendas[nom];
      if (!p || !p.cerrado || !g) return;
      nuevosDe(nom, g).forEach(function (o) { nuevoAPendiente(nom, o.l.id); n++; });
    });
    return n;
  }
  /* El pedido de Mercadona de la semana del 11-oct se hizo antes de que hubiera
     botón: su foto es la lista del 10-oct a las 23:28, que era la de hoy sin la
     lima y el salmón ahumado (comprobado con su estado de esa hora). Una vez. */
  function sembrarPedido11oct(tiendas) {
    var cfg = Almacen.estado.config || (Almacen.estado.config = {});
    if (cfg.semillaPedido11oct || Util.hoyISO() > "2026-10-13") return;
    cfg.semillaPedido11oct = true;
    var g = tiendas && tiendas.Mercadona;
    if (g && !pedidoDe("Mercadona")) {
      if (!Almacen.estado.compraPedido) Almacen.estado.compraPedido = {};
      Almacen.estado.compraPedido.Mercadona = { en: "2026-10-10T21:28:00.000Z", sembrado: true,
        ids: fotoPedido("Mercadona", g, { lima: 1, salmon_ahumado: 1 }) };
    }
    Almacen.guardar("compra");
  }
  /* «del sáb 10, 12:30»; el sembrado no tiene hora real: «de esta semana» */
  function delPedido(p) { return p && p.sembrado ? "de esta semana" : "del " + cuandoPedido(p); }
  function cuandoPedido(p) {
    if (!p || !p.en) return "";
    var d = new Date(p.en), dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    return dias[d.getDay()] + " " + d.getDate() + ", " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function nuevoAPendiente(nom, id) {
    var g = tiendasCompra && tiendasCompra[nom];
    if (!g) return;
    lineasDeTienda(g).forEach(function (o) {
      if (o.l.id !== id) return;
      if (o.casa) { var f = {}; f[id] = { t: nom }; Almacen.confirmarHogar([id], f); return; }
      /* el camino de «no ha llegado»: marcado como pedido y llegan 0 */
      Almacen.estado.compraMarcada[id] = true;
      var fl = {}; fl[id] = 0;
      Almacen.confirmarCompra([o.l], fl, {});
    });
  }
  function bloqueQuitados(nom, g) {
    var p = pedidoDe(nom), qt = quitadosDe(nom, g);
    if (!p || !qt.length) return "";
    var h = '<div class="compra-quitados"><div class="cn-cab"><span class="cq-etq">QUITADO</span> ' +
      '<b>' + qt.length + (qt.length === 1 ? " producto ya no hace falta" : " productos ya no hacen falta") + '</b> desde tu pedido ' + esc(delPedido(p)) + '</div>' +
      '<p class="cq-ayuda">' + (p.cerrado
        ? 'El pedido ya est\u00e1 cerrado, as\u00ed que llegar\u00e1n igualmente: al pulsar <b>\u00abPedido recibido\u00bb</b> salen marcados y entran en la despensa.'
        : 'Si a\u00fan puedes, <b>qu\u00edtalos del pedido de ' + esc(nom) + '</b> y pulsa <b>\u00abPedido hecho\u00bb</b> otra vez. Si ya no puedes y llegan, al pulsar \u00abPedido recibido\u00bb los marcas y entran en la despensa.') + '</p>';
    qt.forEach(function (x) {
      h += '<div class="cn-fila"><div class="cn-dato"><span class="cn-n cq-n">' + esc(x.nombre) + '</span> ' +
        '<span class="cn-q">' + esc(x.hoy > 0 ? "sobran " + x.sobra : x.txtAntes) + '</span>' +
        '<div class="cn-por">' + esc(x.hoy > 0 ? "en el pedido iban " + x.txtAntes + " y ahora basta con " + x.txtHoy
                                               : "en el pedido, pero ya no lo pide nada (lo tienes en casa o ya no est\u00e1 en el men\u00fa)") +
        '</div></div></div>';
    });
    return h + '</div>';
  }
  function bloqueNuevos(nom, g) {
    var p = pedidoDe(nom), nv = nuevosDe(nom, g);
    if (!p) return "";
    if (p.cerrado) return '<p class="pedido-hecho">🔒 Pedido ' + esc(delPedido(p)) + ' cerrado: lo que aparezca a partir de ahora va directo a Pendiente.</p>' + bloqueQuitados(nom, g);
    if (!nv.length) return (quitadosDe(nom, g).length ? '' : '<p class="pedido-hecho">✓ Pedido ' + esc(delPedido(p)) + ' hecho. Nada nuevo desde entonces.</p>') + bloqueQuitados(nom, g);
    var h = '<div class="compra-nuevos" id="lt-nuevos"><div class="cn-cab"><span class="cn-etq">NUEVO</span> ' +
      '<b>' + nv.length + (nv.length === 1 ? " producto añadido" : " productos añadidos") + ' desde tu pedido</b> ' + esc(delPedido(p)) + '</div>' +
      '<p class="cn-ayuda">Salen porque algo cambió después de hacer el pedido. Si aún puedes, añádelos al pedido de ' + esc(nom) +
      ' y pulsa <b>«Pedido hecho»</b> otra vez (límite nuevo). Si ya no puedes, <b>«Pedido cerrado»</b> los manda a Pendiente.</p>';
    nv.forEach(function (o) {
      var l = o.l, nombre = o.casa ? l.n : (l.producto || l.nombre);
      var cant = o.casa ? (l.c > 1 ? "×" + l.c : "") : cantCorta(l);
      var porque = o.casa ? "" : (l.recetas && l.recetas.length ? "lo pide: " + l.recetas.join(", ") : l.porMinimo ? "bajó del mínimo en casa" : "");
      if (o.antes != null) porque = "en el pedido iban " + o.antes + " y ahora hacen falta " + cantDeLinea(l) + (porque ? " · " + porque : "");
      h += '<div class="cn-fila"><div class="cn-dato"><span class="cn-n">' + esc(nombre) + '</span> <span class="cn-q">' + esc(cant) + '</span>' +
        (porque ? '<div class="cn-por">' + esc(porque) + '</div>' : "") + '</div></div>';
    });
    return h + "</div>" + bloqueQuitados(nom, g);
  }
  var listaSoloLectura = false;
  var nuevosAbiertos = {};          // ids NUEVOS de la tienda abierta (v529)
  /* «NO LO TIENEN» EN LA TIENDA ONLINE (23-oct-2026). Carlos, con el mango
     deshidratado agotado en Mercadona mientras aún tenía el pedido abierto:
     «no me deja marcarlo como ausente para pasarlo a pendiente ya». La lista
     de Mercadona/Amazon era de solo lectura —se marca todo junto al pulsar
     «Pedido recibido»—, y eso obligaba a esperar a que llegara el resto para
     poder enviar ESTE producto a Pendiente. El botón ✕ de cada línea lo manda
     a Pendiente al momento, por el mismo camino que usa «Pedido cerrado» para
     lo que ya no se puede tocar (`nuevoAPendiente`), sin esperar a nada más. */
  /* CAMBIAR CUÁNTOS PIDES (30-oct-2026). La usan la lista larga y la ventana
     de cada tienda, que es donde Carlos hace el pedido de Mercadona. `spec` es
     «id|envases|recorte». Devuelve true si cambió algo. */
  function cambiarCantidadCompra(spec) {
    var pc = String(spec).split("|");
    var idC = pc[0], ahoraC = Number(pc[1]) || 0, menuC = ahoraC + (Number(pc[2]) || 0);
    var vC = prompt("\u00bfCu\u00e1ntos pides? El men\u00fa pide " + menuC +
                    ".\nLo que no pidas pasa a Pendiente cuando confirmes que ha llegado el pedido.", ahoraC);
    if (vC === null) return false;
    vC = parseInt(String(vC).replace(",", "."), 10);
    if (isNaN(vC) || vC < 0) { Util.toast("Pon un n\u00famero"); return false; }
    if (!Almacen.estado.topeCompra) Almacen.estado.topeCompra = {};
    if (vC >= menuC) delete Almacen.estado.topeCompra[idC];
    else Almacen.estado.topeCompra[idC] = { n: vC, t: new Date().toISOString() };
    Almacen.guardar("compra");
    Util.toast(vC >= menuC ? "Vuelve a lo que pide el men\u00fa" :
               "Pides " + vC + " \u00b7 " + (menuC - vC) + " a Pendiente al recibir el pedido");
    return true;
  }
  /* La cifra de la fila: un botón con ✎ en lo que pide el menú por envases. */
  function cantFila(cant, l) {
    if (!l || !(l.envase > 0) || l.porCapricho || l.porMinimo) return '<span class="fc-q">' + esc(cant) + '</span>';
    return '<button type="button" class="fc-q btn mini" data-cantcompra="' + esc(l.id) + '|' + l.envases + '|' + (l.recorte || 0) +
      '" title="Cambiar cu\u00e1ntos pides">' + esc(cant) + ' \u270e' +
      (l.recorte > 0 ? '<br><small>de ' + cifra(l.envases + l.recorte) + ' \u00b7 ' + cifra(l.recorte) + ' a Pendiente</small>' : '') +
      '</button>';
  }
  function filaCompacta(id, nombre, cant, cogido, l) {
    if (listaSoloLectura) {
      return '<div class="fila-compacta fila-lectura' + (nuevosAbiertos[id] ? " fila-nueva" : "") + '">' +
        (nuevosAbiertos[id] ? '<span class="cn-etq">NUEVO</span> ' : "") + '<span class="fc-n">' + esc(nombre) + '</span>' +
        cantFila(cant, l) +
        '<button type="button" class="btn-ausente" data-ausente="' + esc(id) + '" title="No lo tienen: pasar a Pendiente ahora">✕</button>' +
        '</div>';
    }
    return '<label class="fila-compacta' + (cogido ? " hecha" : "") + '" data-filacoger="' + esc(id) + '">' +
      '<input type="checkbox" data-coger="' + esc(id) + '"' + (cogido ? " checked" : "") + '>' +
      '<span class="fc-n">' + esc(nombre) + '</span>' +
      cantFila(cant, l) + '</label>';
  }
  /* La cantidad, corta: en el móvil la de la lista larga («4 × 1 ud (95 g) ·
     4 ud (380 g) en total») aplastaba el nombre a una línea. Aquí basta con
     lo que se coge del estante: «4 ud», «2 × 500 g», «280 ml». */
  function cantCorta(l) {
    if (l.envases > 0 && l.envase > 0) {
      if (l.unidad === "ud") return Math.round(l.envases * l.envase * 100) / 100 + " ud";
      var uno = Util.formatearCantidad(l.envase, l.unidad);
      return l.envases > 1 ? l.envases + " \u00d7 " + uno : uno;
    }
    return l.texto || "";
  }
  function pieListaTienda(nom) {
    var g = tiendasCompra && tiendasCompra[nom];
    if (!g) return "";
    var todas = g.comida.concat(g.basicos);
    var n = todas.length + g.casa.length;
    var k = todas.filter(function (l) { return Almacen.estaPedido(l.id); }).length +
            g.casa.filter(function (x) { return Almacen.estaPedido(x.id); }).length;
    return k + " de " + n + " cogidos";
  }
  function abrirListaTienda(nom) {
    var g = tiendasCompra && tiendasCompra[nom];
    if (!g) return;
    listaSoloLectura = esOnline(nom);
    var vacia = !(g.comida.length + g.casa.length + g.basicos.length);
    var h = '<header><h2>' + esc(nom) + '</h2><button class="cerrar" data-cerrar>\u00d7</button></header>';
    if (!vacia) h += '<p class="instrucciones-compra">' + (listaSoloLectura
      ? 'Haz el pedido con esta lista y pulsa <b>\u00abPedido hecho\u00bb</b>. Si luego aparece algo NUEVO, a\u00f1\u00e1delo y otra vez \u00abPedido hecho\u00bb; si ya no se puede tocar, \u00abPedido cerrado\u00bb lo manda a Pendiente. <b>Cuando llegue, \u00abPedido recibido\u00bb</b>: saldr\u00e1 todo marcado, desmarcas lo que no haya venido y pulsas \u00abPasar a la despensa\u00bb.'
      : 'Marca cada cosa seg\u00fan la coges. <b>Al salir de la tienda, pulsa \u00abHe salido de la tienda\u00bb</b>: repasas lo marcado y pulsas \u00abPasar a la despensa\u00bb.') + '</p>';
    nuevosAbiertos = {};
    if (esOnline(nom) && !vacia) {
      nuevosDe(nom, g).forEach(function (o) { nuevosAbiertos[o.l.id] = true; });
      h += bloqueNuevos(nom, g);
    }
    /* «+ AÑADIR ALGO QUE NO ESTABA EN LA LISTA» (23-oct-2026). Carlos,
       comprando en DIA: «he comprado sepia y setas con boletus que no
       estaban en la lista… un + me permitiría añadirlos escribiendo sepia
       y aparecer la opción». Primera versión (descartada): entraba directo
       al stock. Carlos: «quiero que lo pase a la lista de la compra, y
       luego cuando yo ponga que he salido de la tienda ya añada todo al
       stock». Así que entra en la lista de ESTA tienda, ya marcado como
       cogido, y espera a «He salido de la tienda»/«Pedido recibido» como
       cualquier otra línea. */
    h += '<div class="buscar-extra"><input type="text" id="lt-buscar-nombre" placeholder="+ Añadir algo que no estaba en la lista…" autocomplete="off">' +
         '<div id="lt-sugerencias" class="sugerencias-extra" style="display:none; flex-wrap:wrap; gap:6px; margin-top:6px"></div></div>';
    h += '<div class="lista-compacta" data-listatienda="' + esc(nom) + '">';
    if (vacia) h += '<div class="vacio">' + (nom === "Mercadona Tienda"
      ? "Aqu\u00ed no hay lista: usa el \u00ab+\u00bb de arriba para anotar lo que compres en persona."
      : "Nada que comprar aqu\u00ed para estas fechas.") + '</div>';
    var porZona = {};
    g.comida.forEach(function (l) {
      var zk = Almacen.zonaDeIngrediente(l.id) || "sinzona";
      (porZona[zk] = porZona[zk] || []).push(l);
    });
    Almacen.ZONAS.map(function (z) { return z.k; }).concat(["sinzona"]).forEach(function (zk) {
      var lineas = porZona[zk];
      if (!lineas || !lineas.length) return;
      var zn = "Sin zona";
      Almacen.ZONAS.forEach(function (z) { if (z.k === zk) zn = z.n; });
      lineas = Almacen.ordenarComoEnCompra(Almacen.claveCompra(nom, zk), lineas);
      h += '<h4 class="fc-zona">' + esc(zn) + '</h4>';
      lineas.forEach(function (l) { h += filaCompacta(l.id, l.producto || l.nombre, cantCorta(l), Almacen.estaPedido(l.id), l); });
    });
    if (g.casa.length) {
      var porAp = {};
      g.casa.forEach(function (x) { (porAp[x.cat] = porAp[x.cat] || []).push(x); });
      var aps = Almacen.APARTADOS.map(function (a) { return a.k; });
      Object.keys(porAp).forEach(function (c) { if (aps.indexOf(c) < 0) aps.push(c); });
      aps.forEach(function (c) {
        var lc = porAp[c];
        if (!lc || !lc.length) return;
        var estK = null, apN = c;
        Almacen.ZONAS.forEach(function (z) { z.estantes.forEach(function (e) { if (e.hogar === c) estK = e.k; }); });
        Almacen.APARTADOS.forEach(function (a) { if (a.k === c) apN = a.n; });
        if (estK) lc = Almacen.ordenarComoEnCompra(Almacen.claveCompra(nom, estK), lc);
        h += '<h4 class="fc-zona">' + esc(apN) + '</h4>';
        lc.forEach(function (x) { h += filaCompacta(x.id, x.n, x.c > 1 ? "×" + x.c : "", Almacen.estaPedido(x.id)); });
      });
    }
    if (g.basicos.length) {
      h += '<h4 class="fc-zona">Revisa la despensa (básicos)</h4>';
      g.basicos.forEach(function (l) { h += filaCompacta(l.id, l.producto || l.nombre, cantCorta(l), Almacen.estaPedido(l.id)); });
    }
    h += '</div><div class="pie-compacto"><span class="nota-peque" id="lt-cuenta">' +
         (listaSoloLectura || vacia ? "" : pieListaTienda(nom)) + '</span>' +
         (vacia ? '<button class="btn" data-cerrar>Cerrar</button>'
                : esOnline(nom)
                  ? '<span class="botones-pedido">' +
                    (!(pedidoDe(nom) && pedidoDe(nom).cerrado)
                      ? '<button class="btn' + (pedidoDe(nom) && (nuevosDe(nom, g).length || quitadosDe(nom, g).length) ? " btn-nuevo" : "") + '" id="lt-pedido">Pedido hecho</button>' +
                        (pedidoDe(nom) ? '<button class="btn" id="lt-cerrado">Pedido cerrado</button>' : "")
                      : '<button class="btn" id="lt-reiniciar">Reiniciar pedido</button>') +
                    '<button class="btn principal" id="lt-comprado">Pedido recibido</button></span>'
                  : '<button class="btn principal" id="lt-comprado">He salido de la tienda</button>') + '</div>';
    abrirModal(h);
    $("#modal-caja").classList.add("modal-compacto");
    var buscarExtraInput = $("#lt-buscar-nombre"), sugExtra = $("#lt-sugerencias");
    if (buscarExtraInput) {
      buscarExtraInput.addEventListener("input", function () {
        var q = buscarExtraInput.value;
        if (!q || Almacen._pelado(q).length < 2) { sugExtra.style.display = "none"; sugExtra.innerHTML = ""; return; }
        var cand = (Almacen.estado.ingredientes || []).filter(function (ing) {
          return !ing.oculta && Almacen.coincideTexto(ing.n, q);
        }).slice(0, 8);
        if (!cand.length) { sugExtra.style.display = "none"; sugExtra.innerHTML = ""; return; }
        sugExtra.innerHTML = cand.map(function (ing) {
          return '<button type="button" class="btn mini" data-extra-add="' + esc(ing.id) + '">' + esc(ing.n) + '</button>';
        }).join("");
        sugExtra.style.display = "flex";
      });
      sugExtra.addEventListener("click", function (e) {
        var b = e.target.closest("[data-extra-add]");
        if (!b) return;
        var id = b.getAttribute("data-extra-add");
        var ing = Almacen.ingrediente(id);
        if (!ing) return;
        var def = ing.envase > 0 ? ing.envase : (ing.racion > 0 ? ing.racion : 100);
        var txt = prompt("¿Cuántos " + ing.u + " de «" + ing.n + "» has comprado?", def);
        if (txt == null) return;
        var cant = parseFloat(String(txt).replace(",", "."));
        if (!(cant > 0)) { Util.toast("No se ha añadido: la cantidad no es válida."); return; }
        var tam = Almacen.tamanoPieza(ing) || 1;
        Almacen.quererEstaVez(id, true, cant / tam, nom);
        Almacen.ponerPedido(id, true);
        pintarCompra();
        Util.toast("Añadido a la lista de " + nom + ": " + cant + " " + ing.u + " de " + ing.n + ". Entrará en el stock al confirmar esta tienda.");
        abrirListaTienda(nom);
      });
    }
    $(".lista-compacta").onchange = function (e) {
      var c = e.target.closest ? e.target.closest("[data-coger]") : null;
      if (!c) return;
      var id = c.getAttribute("data-coger");
      Almacen.ponerPedido(id, c.checked);
      var fila = c.closest(".fila-compacta");
      if (fila) fila.classList.toggle("hecha", c.checked);
      pintarCompra();                                  /* la casilla de fondo cuenta lo cogido */
      var ct = $("#lt-cuenta");
      if (ct) ct.textContent = pieListaTienda(nom);
    };
    $(".lista-compacta").addEventListener("click", function (e) {
      var bq = e.target.closest ? e.target.closest("[data-cantcompra]") : null;
      if (bq) {
        e.preventDefault();                 /* dentro de la fila: que no marque la casilla */
        if (cambiarCantidadCompra(bq.getAttribute("data-cantcompra"))) {
          pintarCompra();
          abrirListaTienda(nom);
        }
        return;
      }
      var b = e.target.closest ? e.target.closest("[data-ausente]") : null;
      if (!b) return;
      var id = b.getAttribute("data-ausente");
      if (!confirm("¿No lo tienen en " + nom + "? Se manda a Pendiente ahora, sin esperar a «Pedido recibido».")) return;
      nuevoAPendiente(nom, id);
      pintarCompra(); pintarDespensa();
      Util.toast("A Pendiente: lo buscas en otra tienda.");
      abrirListaTienda(nom);
    });
    if (vacia) return;
    var bp = $("#lt-pedido");
    if (bp) bp.addEventListener("click", function () {
      var otra = !!pedidoDe(nom);
      apuntarPedido(nom, g);
      pintarCompra();
      Util.toast(nom + (otra ? ": límite nuevo. " : ": pedido hecho. ") + "Lo que aparezca a partir de ahora saldrá como NUEVO.");
      abrirListaTienda(nom);
    });
    var bc = $("#lt-cerrado");
    if (bc) bc.addEventListener("click", function () {
      var n = cerrarPedido(nom, g);
      pintarCompra(); pintarDespensa();
      Util.toast(nom + ": pedido cerrado" + (n ? " · " + n + " a Pendiente" : "") + ". Lo nuevo irá directo a Pendiente.");
      abrirListaTienda(nom);
    });
    var br = $("#lt-reiniciar");
    if (br) br.addEventListener("click", function () {
      if (!confirm("¿Reiniciar el pedido de " + nom + "? Se quita el candado de «pedido cerrado». No toca la despensa ni lo que ya esté en Pendiente.")) return;
      reiniciarPedido(nom);
      pintarCompra();
      Util.toast(nom + ": pedido reiniciado. Puedes volver a pulsar «Pedido hecho» cuando hagas el siguiente.");
      abrirListaTienda(nom);
    });
    $("#lt-comprado").addEventListener("click", function () {
      $("#modal-caja").classList.remove("modal-compacto");
      abrirCompradoTienda(nom);
    });
  }

  var tiendasCompra = null;
  function abrirCompradoTienda(nom) {
    var g = tiendasCompra && tiendasCompra[nom];
    if (!g) return;
    var lineas = g.comida.concat(g.basicos), casa = g.casa;
    if (!lineas.length && !casa.length) return;
    var algo = !esOnline(nom) && (lineas.some(function (l) { return l.marcado; }) ||
               casa.some(function (x) { return Almacen.estaPedido(x.id); }));
    /* CONFIRMAR CON NOMBRE (v417). Carlos: «¿en Mercadona dónde marco lo que
       no llega? No veo confirmar». El botón decía «Confirmar» y no se veía qué
       hacía; ahora dice lo que hace y debajo cuenta, mientras desmarcas, cuánto
       entra en la despensa y cuánto se va a Pendiente. Hasta pulsarlo, el
       stock no se toca. */
    var html = '<header><h2>' + esc(nom) + ': ' + (esOnline(nom) ? 'pedido recibido' : 'lo comprado') + '</h2>' +
               '<button class="cerrar" data-cerrar>\u00d7</button></header>';
    html += '<p class="instrucciones-compra">' + (algo
      ? 'Salen marcadas las que cogiste. <b>Desmarca lo que no te hayas llevado</b> y pulsa \u00abPasar a la despensa\u00bb.'
      : '<b>Desmarca lo que no haya llegado</b> y pulsa \u00abPasar a la despensa\u00bb. Lo desmarcado pasa a Pendiente.') + '</p>';
    var fila = function (id, nombre, detalle, cuantos, marcada, esHogar) {
      /* SIN SUPLENTE AQUÍ (Carlos, 4-oct-2026): «si no lo he comprado en
         Mercadona, que en pendiente salga en Mercadona y cuando lo compre en
         otro sitio lo tacho». Lo que no llega va SIEMPRE a Pendiente; el
         suplente se enseña allí como pista, no se pide solo. */
      var sup = null;
      return '<div class="linea-falta" data-falta-de="' + esc(id) + '">' +
        '<label class="linea">' +
        '<input type="checkbox" data-llego="' + esc(id) + '"' + (marcada ? " checked" : "") + '>' +
        '<div class="datos"><div class="nombre">' + esc(nombre) + '</div>' +
        '<div class="detalle">' + esc(detalle) + '</div></div></label>' +
        (esHogar || cuantos <= 1 ? '' :
          '<div class="llegaron-of" data-llegaron-de="' + esc(id) + '"' + (marcada ? ' style="display:none"' : '') + '>' +
          'llegaron <input type="number" class="stock-cant" data-llegaron="' + esc(id) + '" min="0" max="' + cuantos +
          '" step="1" value="0" style="width:62px; text-align:right"> de ' + cuantos + '</div>') +
        (sup ? '<label class="suplente-of" data-suplente-de="' + esc(id) + '"' + (marcada ? ' style="display:none"' : '') + '>' +
                 '<input type="checkbox" data-pedir-suplente="' + esc(id) + '" checked> ' +
                 (sup.tipo === "mismo"
                   ? 'En vez de a Pendiente, pídelo en <b>' + esc(sup.donde) + '</b>'
                   : 'En vez de a Pendiente, <b>' + esc(sup.n) + '</b> en ' + esc(sup.donde)) +
               '</label>' : '') +
        '</div>';
    };
    /* con ticket, marcado sólo lo que viene en él (13-oct-2026) */
    var tkR = esOnline(nom) ? ticketDeTienda(nom) : null;
    var vieneT = function (id) { return !tkR || tkR.ids[id] != null; };
    if (tkR) html += '<p class="pedido-hecho">🧾 Con el ticket ' + esc(tkR.t.n || tkR.ref) + ': sale marcado lo que viene en \u00e9l; lo dem\u00e1s, desmarcado (va a Pendiente). Revisa y pulsa \u00abPasar a la despensa\u00bb.</p>';
    html += '<div id="ct-cuerpo" class="lista-compacta">';
    lineas.forEach(function (l) {
      html += fila(l.id, l.producto || l.nombre, (l.texto || "") + (vieneT(l.id) ? "" : " \u00b7 no viene en el ticket"),
                   l.envases || 1, algo ? !!l.marcado : vieneT(l.id), false);
    });
    if (casa.length) {
      html += '<p class="aviso-grupo">Casa</p>';
      casa.forEach(function (x) {
        html += fila(x.id, x.n, (x.c > 1 ? "×" + x.c : "") + (vieneT(x.id) ? "" : " \u00b7 no viene en el ticket"),
                     x.c, algo ? Almacen.estaPedido(x.id) : vieneT(x.id), true);
      });
    }
    /* lo QUITADO después del pedido: si llegó igualmente, a la despensa (11-oct-2026).
       Con el pedido cerrado sale marcado (no se pudo quitar); si no, sin marcar. */
    var qtR = esOnline(nom) ? quitadosDe(nom, g).filter(function (x) { return !x.casa; }) : [];
    if (qtR.length) {
      var cerr = !!(pedidoDe(nom) && pedidoDe(nom).cerrado);
      html += '<p class="aviso-grupo">Quitado despu\u00e9s del pedido: <b>marca lo que haya llegado igualmente</b></p>';
      qtR.forEach(function (x) {
        var marcarQ = tkR ? false : cerr;               // con ticket: si no viene en él, no llegó
        html += '<label class="linea"><input type="checkbox" data-quitado-llego="' + esc(x.id) + '" data-sobra="' + x.sobra + '"' + (marcarQ ? " checked" : "") + '>' +
          '<div class="datos"><div class="nombre">' + esc(x.nombre) + '</div><div class="detalle">' +
          esc(x.hoy > 0 ? "sobraban " + x.sobra + " de " + x.txtAntes : x.txtAntes) + '</div></div></label>';
      });
    }
    html += '</div><div class="pie-compacto"><span class="nota-peque" id="ct-cuenta"></span>' +
            '<span><button class="btn" data-cerrar>Cancelar</button> ' +
            '<button class="btn principal" id="ct-ok">Pasar a la despensa</button></span></div>';
    abrirModal(html);
    $("#modal-caja").classList.add("modal-compacto");
    var cuentaCT = function () {
      var cs = document.querySelectorAll("#ct-cuerpo [data-llego]"), si = 0;
      for (var i = 0; i < cs.length; i++) if (cs[i].checked) si++;
      var el = $("#ct-cuenta");
      if (el) el.innerHTML = "<b>" + si + "</b> a la despensa \u00b7 <b>" + (cs.length - si) + "</b> a Pendiente";
    };
    cuentaCT();

    $("#ct-cuerpo").onchange = function (e) {
      var c = e.target.closest ? e.target.closest("[data-llego]") : null;
      if (!c) return;
      cuentaCT();
      var id = c.getAttribute("data-llego");
      ["data-suplente-de", "data-llegaron-de"].forEach(function (a) {
        var el = document.querySelector('[' + a + '="' + id + '"]');
        if (el) el.style.display = c.checked ? "none" : "";
      });
    };

    $("#ct-ok").addEventListener("click", function () {
      var faltas = {}, faltasHogar = {}, alSuplente = {};
      var llego = function (id) {
        var c = document.querySelector('#ct-cuerpo [data-llego="' + id + '"]');
        return c ? c.checked : true;
      };
      lineas.forEach(function (l) {
        /* Todo lo de esta tienda pasa por `confirmarCompra`, que sólo atiende
           a lo marcado como pedido: aquí, todo. */
        Almacen.estado.compraMarcada[l.id] = true;
        if (llego(l.id)) return;
        var n = document.querySelector('[data-llegaron="' + l.id + '"]');
        faltas[l.id] = n ? Math.min(l.envases || 1, parseInt(n.value, 10) || 0) : 0;
      });
      casa.forEach(function (x) { if (!llego(x.id)) faltasHogar[x.id] = { t: nom }; });
      /* lo quitado que llegó igualmente entra en la despensa (11-oct-2026) */
      var entraronQ = 0;
      document.querySelectorAll("#ct-cuerpo [data-quitado-llego]").forEach(function (c) {
        if (c.checked && Almacen.entrarEnDespensa(c.getAttribute("data-quitado-llego"), parseFloat(c.getAttribute("data-sobra")) || 1)) entraronQ++;
      });
      if (tkR && Almacen.estado.tickets && Almacen.estado.tickets[tkR.ref]) Almacen.estado.tickets[tkR.ref].recibido = Util.hoyISO();
      if (esOnline(nom) && Almacen.estado.compraPedido) delete Almacen.estado.compraPedido[nom];   // v529: pedido cerrado
      var res = Almacen.confirmarCompra(lineas, faltas, alSuplente);
      Almacen.confirmarHogar(casa.map(function (x) { return x.id; }), faltasHogar);
      var aPend = res.recados + Object.keys(faltasHogar).length;
      cerrarModal(); pintarCompra(); pintarDespensa();
      Util.toast(nom + ": entraron " + (res.entraron + entraronQ) + " en la despensa" +
                 (entraronQ ? " (" + entraronQ + " de lo quitado)" : "") +
                 (aPend ? " · " + aPend + " a Pendiente" : "") +
                 (res.suplentes ? " · " + res.suplentes + " al suplente" : ""));
    });
  }

  /* CARGAR UNA COMPRA YA RECIBIDA  ·  1-oct-2026
     Carlos, el dia que llego el pedido de Mercadona: «una lista de compra de
     mercadona con los productos de este ticket para que lo confirme y pasen al
     stock». Y una hora antes, cerrando la idea de parsear tickets dentro de la
     app: «no meter recibos a mano que van a traer cosas de estas».
     Asi que el reparto queda: EL TICKET LO LEO YO y dejo el resultado en
     `datos/compra-recibida.js`; el pulsa un boton, la lista aparece ya tachada
     como pedida, y con «Ha llegado» entra todo en la despensa por el camino de
     siempre —`confirmarCompra`—, sin inventar un segundo camino al stock.
     Lo que no case con una ficha no se mete a la fuerza: se dice y se queda
     fuera. UNA SOLA VEZ POR COMPRA: la `ref` se apunta y el boton desaparece,
     que si no, dos clics meten la compra dos veces y nadie se entera.
     10-oct-2026 (A5/A6 de la auditoría v519): mismo camino, con los envases
     bien contados y sin doble cuenta. Ver `Almacen.cargarTicketEnLista`. */
  function compraRecibidaPendiente() {
    var c = window.COMPRA_RECIBIDA;
    if (!c || !c.lineas || !c.lineas.length) return null;
    var ya = (Almacen.estado.config && Almacen.estado.config.comprasCargadas) || {};
    return ya[c.ref] ? null : c;
  }
  function refrescarBotonRecibida() {
    var b = $("#compra-recibida");
    if (!b) return;
    var c = compraRecibidaPendiente();
    b.hidden = !c;
    if (c) b.textContent = "Cargar " + (c.n || "compra recibida");
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
            "y al dar a \u00abComprado\u00bb se olvida: la semana que viene no vuelve solo.</div></div>" +
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

  /* PENDIENTE (v414, antes «Pendiente de buscar en otro sitio»). Lo que no
     llegó o no había. Carlos, 4-oct-2026: «se necesita pera para la receta del
     jueves, no la hemos podido comprar en Mercadona y queda pendiente. En la
     lista de pendientes pondrá pera, se necesita para el jueves». Por eso cada
     línea dice el día y el plato, y lo más urgente va arriba. «Comprado» la
     mete en la despensa; hasta la v413 «Ya lo tengo» sólo la borraba. */
  function paraCuando(f) {
    var hoy = Util.hoyISO();
    if (f === hoy) return "para hoy";
    if (f === Util.sumarDias(hoy, 1)) return "para mañana";
    var d = Util.desdeISO(f);
    var nom = Util.DIAS[(d.getDay() + 6) % 7].toLowerCase();
    return Util.diasEntre(hoy, f) <= 6 ? "para el " + nom : "para el " + nom + " " + Util.etiquetaFecha(f);
  }
  /* PENDIENTE ES OTRA CASILLA (v415): con muchas cosas pendientes, la tarjeta
     larga empujaba las tiendas hacia abajo, que es justo lo que Carlos no quería.
     Ahora sale en la rejilla de tiendas, en ámbar, y se abre en su ventana. */
  function pintarRecados() {
    var cont = $("#lista-recados");
    if (cont) cont.innerHTML = "";
  }
  function tilePendiente() {
    /* SIEMPRE A LA VISTA (v416, Carlos: «pon una lista siempre de pendiente»). */
    var lista = Almacen.recadosPendientes();
    var urge = Util.sumarDias(Util.hoyISO(), 1);
    var u = lista.filter(function (x) { return x.cuando && x.cuando.f <= urge; }).length;
    return '<button type="button" class="tile-tienda tile-pendiente" data-abrirpendiente="1">' +
      '<span class="tile-nom">Pendiente</span><span class="tile-num">' + lista.length + '</span>' +
      '<span class="tile-pie">' + (!lista.length ? "nada pendiente" : u ? u + " para hoy o ma\u00f1ana" : "sin prisa") + '</span></button>';
  }
  function filaPendiente(x) {
    var urge = Util.sumarDias(Util.hoyISO(), 1);
    var cuando = x.cuando
      ? '<b' + (x.cuando.f <= urge ? ' style="color:var(--ambar)"' : '') + '>' + esc(paraCuando(x.cuando.f)) + '</b>'
      : (x.tipo === "hogar" ? "de casa" : "para reponer");
    var sup = x.tipo === "comida" ? Almacen.elSuplenteDe(x.id) : null;
    /* CUÁNTO HAS COMPRADO DE VERDAD (23-oct-2026). Carlos compró el
       suplente del mango deshidratado en DIA, en una bolsa de otro tamaño,
       y «Comprado» metía los 60 g que calculaba Pendiente en vez de los
       270 g reales. El número ya sale editable, con lo calculado puesto
       de salida; si no lo tocas, se comporta igual que siempre. */
    var ing = x.tipo === "comida" ? Almacen.ingrediente(x.id) : null;
    var cantInput = (ing && x.q > 0)
      ? ' <input type="number" class="stock-cant" data-pendcant="' + esc(x.id) + '" min="0" step="any" value="' +
        (Math.round(x.q * 100) / 100) + '" style="width:62px; text-align:right" title="Cuánto has comprado de verdad"> ' + esc(ing.u)
      : '';
    return '<div class="fila-compacta fila-pend" data-filapend="' + esc(x.id) + '">' +
      '<input type="checkbox" data-pendcomprado="' + esc(x.id) + '" title="Comprado: entra en la despensa">' +
      '<span class="fc-n">' + esc(x.n) + (x.c > 1 ? ' <b>×' + x.c + '</b>' : '') +
        '<span class="fc-d">' + cuando + (x.t ? ' · no lo hubo en ' + esc(x.t) : '') +
        (sup ? ' · otra opción: ' + esc(sup.tipo === "mismo" ? "en " + sup.donde : sup.n + " en " + sup.donde) : '') +
        '</span></span>' + cantInput +
      '<button type="button" class="btn mini" data-recado="' + esc(x.id) + '" title="Ya no hace falta: se quita sin entrar en la despensa">Quitar</button></div>';
  }
  function abrirPendiente() {
    var lista = Almacen.recadosPendientes();
    var h = '<header><h2>Pendiente</h2><button class="cerrar" data-cerrar>×</button></header>' +
      '<p class="instrucciones-compra">Aqu\u00ed llega lo que no se compr\u00f3 en las otras listas. <b>C\u00f3mpralo donde sea y m\u00e1rcalo</b>: entra en la despensa.</p>' +
      /* UNA PUERTA DE ATRÁS PARA LO QUE SE ESCAPÓ (26-oct-2026). Carlos: algo
         no llegó, no lo vio al revisar y confirmó el pedido con la casilla
         puesta, así que nunca se generó el recado. Aquí se añade a mano,
         sin pasar por ninguna tienda: Pendiente ya es «cómpralo donde sea». */
      '<div class="buscar-extra"><input type="text" id="lp-buscar-nombre" placeholder="+ A\u00f1adir algo a Pendiente\u2026" autocomplete="off">' +
      '<div id="lp-sugerencias" class="sugerencias-extra" style="display:none; flex-wrap:wrap; gap:6px; margin-top:6px"></div></div>' +
      '<div class="lista-compacta" id="lp-lista">' +
      (lista.length ? lista.map(filaPendiente).join("") : '<div class="vacio">Nada pendiente.</div>') +
      '</div><div class="pie-compacto"><span class="nota-peque" id="lp-cuenta">' + lista.length + ' pendientes</span>' +
      (lista.length ? '<button class="btn" id="lp-vaciar">Empezar de cero</button>' : '') +
      '<button class="btn" data-cerrar>Cerrar</button></div>';
    abrirModal(h);
    $("#modal-caja").classList.add("modal-compacto");
    var buscarPendInput = $("#lp-buscar-nombre"), sugPend = $("#lp-sugerencias");
    if (buscarPendInput) {
      buscarPendInput.addEventListener("input", function () {
        var q = buscarPendInput.value;
        if (!q || Almacen._pelado(q).length < 2) { sugPend.style.display = "none"; sugPend.innerHTML = ""; return; }
        var yaPend = Almacen.recadosPendientes().map(function (x) { return x.id; });
        var cand = (Almacen.estado.ingredientes || []).filter(function (ing) {
          return !ing.oculta && yaPend.indexOf(ing.id) < 0 && Almacen.coincideTexto(ing.n, q);
        }).slice(0, 8);
        if (!cand.length) { sugPend.style.display = "none"; sugPend.innerHTML = ""; return; }
        sugPend.innerHTML = cand.map(function (ing) {
          return '<button type="button" class="btn mini" data-pend-add="' + esc(ing.id) + '">' + esc(ing.n) + '</button>';
        }).join("");
        sugPend.style.display = "flex";
      });
      sugPend.addEventListener("click", function (e) {
        var b = e.target.closest("[data-pend-add]");
        if (!b) return;
        var id = b.getAttribute("data-pend-add");
        var ing = Almacen.ingrediente(id);
        if (!ing) return;
        var def = ing.envase > 0 ? ing.envase : (ing.racion > 0 ? ing.racion : 100);
        var txt = prompt("\u00bfCu\u00e1ntos " + ing.u + " de \u00ab" + ing.n + "\u00bb quieres apuntar en Pendiente?", def);
        if (txt == null) return;
        var cant = parseFloat(String(txt).replace(",", "."));
        if (!(cant > 0)) { Util.toast("No se ha a\u00f1adido: la cantidad no es v\u00e1lida."); return; }
        Almacen.anadirPendienteManual(id, cant);
        pintarCompra();
        Util.toast("A\u00f1adido a Pendiente: " + cant + " " + ing.u + " de " + ing.n + ".");
        abrirPendiente();
      });
    }
    var bv = $("#lp-vaciar");
    if (bv) bv.addEventListener("click", function () {
      if (!confirm("¿Empezar de cero ahora? Se vacía TODO Pendiente (" + lista.length + " líneas) y se quita el candado de las tiendas a domicilio que estén cerradas. No entra ni sale nada de la despensa: la lista de la compra vuelve a salir solo de lo que pide el menú menos lo que ya tengas en stock.")) return;
      TIENDAS_ONLINE.forEach(function (nom) { reiniciarPedido(nom); });
      Almacen.vaciarPendiente();
      pintarCompra(); pintarDespensa();
      Util.toast("Pendiente vaciado y pedidos reiniciados. La lista sale de menú menos stock.");
      abrirPendiente();
    });
    $("#lp-lista").onclick = function (e) {
      var pc = e.target.closest("[data-pendcomprado]");
      var qt = e.target.closest("[data-recado]");
      var id = pc ? pc.getAttribute("data-pendcomprado") : qt ? qt.getAttribute("data-recado") : null;
      if (!id) return;
      if (qt) {
        if (!confirm("¿Quitarlo de Pendiente sin comprarlo? No entra en la despensa, y si el menú lo pide volverá a la lista de su tienda.")) return;
        Almacen.quitarRecado(id);
      } else {
        var inpCant = document.querySelector('[data-pendcant="' + id + '"]');
        var cantReal = inpCant ? parseFloat(inpCant.value.replace(",", ".")) : null;
        Almacen.comprarPendiente(id, (cantReal != null && cantReal >= 0) ? cantReal : null);
        Util.toast("Comprado: entra en la despensa" + (inpCant ? " (" + (Math.round((cantReal || 0) * 100) / 100) + ")" : ""));
      }
      var f = document.querySelector('[data-filapend="' + id + '"]');
      if (f) f.remove();
      var ct = $("#lp-cuenta");
      if (ct) ct.textContent = Almacen.recadosPendientes().length + " pendientes";
      pintarCompra(); pintarDespensa();
    };
  }

  /* ---------- PLATOS PENDIENTES DE COMER (22-oct-2026) ----------
     Carlos: una lista fácil de leer, en Menú, de los platos PRINCIPALES de
     comida y cena que todavía no se han comido. Mismo criterio de «papel»
     que ya usa el selector de platos (bebida/postre/pan/guarnición/principal,
     deducido de los datos), repetido aquí suelto porque allí vive dentro de
     otra función y sólo hace falta «principal». */
  function catsDePlato(r) {
    var c = {};
    (r.ing || []).forEach(function (l) {
      var g = Almacen.ingrediente(l.i);
      if (g) c[g.cat || "?"] = 1;
    });
    return Object.keys(c);
  }
  function todoDePlato(r, re) {
    var c = catsDePlato(r);
    return c.length > 0 && c.every(function (x) { return re.test(x); });
  }
  function esFrutaFrescaPlato(r) {
    return (r.ing || []).length === 1 &&
           (r.grupo === "suelto" || r.grupo === "fruta") &&
           (r.tools || []).indexOf("sin-cocinar") >= 0 &&
           todoDePlato(r, /^frutas y verduras$/i);
  }
  function papelDePlato(r) {
    if (todoDePlato(r, /^bebidas?$/i)) return "bebida";
    if ((r.tipo || []).indexOf("postre") >= 0 || r.grupo === "postre") return "postre";
    if (esFrutaFrescaPlato(r)) return "postre";
    if (todoDePlato(r, /^panader[ií]a$/i)) return "pan";
    if ((r.tipo || []).indexOf("guarnicion") >= 0) return "guarnicion";
    return "principal";
  }
  function platosPendientesComerYCenar(dias) {
    var hoy = Util.hoyISO(), out = [];
    for (var i = 0; i < (dias || 21); i++) {
      var fecha = Util.sumarDias(hoy, i);
      var dia = Almacen.estado.plan[fecha];
      if (!dia) continue;
      ["comida", "cena"].forEach(function (toma) {
        if (Almacen.esFuera(fecha, toma)) return;
        if (!Almacen.tomaActiva(fecha, toma)) return;
        (dia[toma] || []).forEach(function (rid) {
          var rec = Almacen.receta(rid);
          if (!rec || papelDePlato(rec) !== "principal") return;
          if (Almacen.estaComido(fecha, toma, rid)) return;
          out.push({ fecha: fecha, toma: toma, nombre: rec.n });
        });
      });
    }
    return out;
  }
  /* «RECETAS DISPONIBLES» (23-oct-2026). Carlos: «conocer el stock sin
     asignar... un botón que ayude a elaborar el menú de los primeros días
     de la semana que viene... una lista de platos de los que se tenga todo
     o solo falte un ingrediente secundario». Y después, viendo que esa
     cuenta ya existe para «Añadir a cena»: «ya está en la selección de
     platos, pero una ventana emergente ayudaría a elegir más fácilmente».
     Así que no es una cuenta nueva: es `Almacen.loQuePuedesGastar`, la
     misma que ya usa ese selector —el stock menos TODO lo que el plan
     entero tiene prometido, de hoy en adelante, no solo esta semana—,
     suelta en su propio botón para poder mirarla sin tener que abrir un
     día. Para completar el plato con lo que falte, se elige como siempre
     desde «Añadir» a un día. */
  function colaRecetaDisp(id) {
    var rec = Almacen.receta(id);
    return rec ? Util.sal(Almacen.salReceta(rec)) + " de sal · " + (rec.min || "?") + " min" : "";
  }
  /* GASTAR LA NEVERA ANTES, DENTRO DE CADA GRUPO (23-oct-2026). Carlos: «es
     para ir gastando lo que se tiene en la nevera». `loQuePuedesGastar` ya
     mide cuánto de lo perecedero —nevera y frutero— se lleva cada receta
     (`fresco`); aquí solo se usa para ordenar: primero la que más gasta de
     eso, para no dejarlo para lo último. */
  function ordenFresco(lista) {
    return lista.slice().sort(function (a, b) { return (b.fresco || 0) - (a.fresco || 0); });
  }
  function abrirRecetasDisponibles() {
    var tengo = Almacen.loQuePuedesGastar("cena");
    var enteras = ordenFresco(tengo.enteras || []), casi = ordenFresco(tengo.casi || []);
    var fila = function (r, nota) {
      return '<div class="fila-compacta" style="cursor:default; align-items:flex-start">' +
             '<span style="flex:1 1 auto"><b style="font-size:.88rem">' + esc(r.n) +
             (r.fresco > 0.5 ? ' <span class="cn-etq" style="background:#2b7a4b">NEVERA</span>' : "") + '</b>' +
             '<div class="nota-peque" style="margin-top:2px">' + esc(nota) + '</div></span></div>';
    };
    var h = '<header><h2>Recetas disponibles</h2><button class="cerrar" data-cerrar>×</button></header>' +
      '<p class="instrucciones-compra">Con lo que te sobra del stock —lo que no está ya comprometido en ningún día planificado, incluido lo que tengas pedido en Mercadona o Amazon aunque no haya llegado—, estas son las recetas que te salen. Primero las que gastan algo de la nevera, para no dejarlo para lo último. Para hacerlas, elígelas como siempre desde «Añadir» a un día.</p>' +
      '<div class="lista-compacta">';
    if (enteras.length) {
      h += '<h4 class="fc-zona">Las tienes enteras</h4>';
      h += enteras.map(function (r) { return fila(r, "todo en casa · " + colaRecetaDisp(r.id)); }).join("");
    }
    if (casi.length) {
      h += '<h4 class="fc-zona">Te falta solo lo secundario</h4>';
      h += casi.map(function (r) {
        return fila(r, "falta " + esc(r.faltan.join(", ")) + " · " + colaRecetaDisp(r.id));
      }).join("");
    }
    if (!enteras.length && !casi.length) h += '<div class="vacio">Con lo que te sobra ahora no sale ninguna receta entera ni casi entera.</div>';
    h += '</div><div class="pie-compacto"><span class="nota-peque">' +
         (enteras.length + casi.length) + ' receta' + (enteras.length + casi.length === 1 ? "" : "s") + '</span>' +
         '<button class="btn" data-cerrar>Cerrar</button></div>';
    abrirModal(h);
    $("#modal-caja").classList.add("modal-compacto");
  }
  function abrirPlatosPendientes() {
    var lista = platosPendientesComerYCenar(21);
    var porDia = {}, orden = [];
    lista.forEach(function (p) {
      if (!porDia[p.fecha]) { porDia[p.fecha] = { comida: [], cena: [] }; orden.push(p.fecha); }
      porDia[p.fecha][p.toma].push(p.nombre);
    });
    var h = '<header><h2>Platos pendientes de comer</h2><button class="cerrar" data-cerrar>×</button></header>' +
      '<p class="instrucciones-compra">Platos principales de comida y cena que aún no has marcado como comidos, de hoy en adelante.</p>' +
      '<div class="lista-compacta">' +
      (orden.length ? orden.map(function (f) {
        var d = porDia[f];
        /* NADA DE «fc-n»/«fc-d» aquí (22-oct-2026): esas clases recortan a 2
           líneas y, con dos platos largos en Comida, se comían la Cena entera
           sin avisar — Carlos lo vio en el miércoles 28. Cada toma en su
           propia línea, sin recorte, para que quepa lo que haga falta. */
        return '<div class="fila-compacta" style="cursor:default; align-items:flex-start">' +
               '<span style="flex:1 1 auto"><b style="font-size:.88rem">' + esc(etiquetaDiaLargo(f)) + '</b>' +
               '<div class="nota-peque" style="margin-top:2px">Comida: ' + (d.comida.length ? esc(d.comida.join(", ")) : "—") + '</div>' +
               '<div class="nota-peque">Cena: ' + (d.cena.length ? esc(d.cena.join(", ")) : "—") + '</div>' +
               '</span></div>';
      }).join("") : '<div class="vacio">Nada pendiente.</div>') +
      '</div><div class="pie-compacto"><span class="nota-peque">' + lista.length + ' plato' + (lista.length === 1 ? "" : "s") + '</span>' +
      '<button class="btn" data-cerrar>Cerrar</button></div>';
    abrirModal(h);
    $("#modal-caja").classList.add("modal-compacto");
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
    if (l.recorte > 0) porque += ' \u00b7 <b>pides ' + cifra(l.envases) + " de " + cifra(l.envases + l.recorte) +
                                 ": " + cifra(l.recorte) + " a Pendiente al recibir el pedido</b>";
    /* La cifra se puede tocar en lo que pide el menú y va por envases (30-oct-2026). */
    var editable = l.envase > 0 && !l.porCapricho && !l.porMinimo && !basico;
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
      (editable
        ? '<button class="cant btn mini" data-cantcompra="' + esc(l.id) + '|' + l.envases + '|' + (l.recorte || 0) +
          '" title="Cambiar cu\u00e1ntos pides">' + esc(l.texto) + ' \u270e</button>'
        : '<span class="cant">' + esc(l.texto) + '</span>') +
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
             : l.dias === null ? "nunca contado" : "contado " + Util.hace(l.dias) + "") + "</span>";
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
            : s.dias === 0 ? "repasado hoy" : "repasado " + Util.hace(s.dias) + "") +
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

  /* EL STOCK SE ESCRIBE EN ENVASES (30-oct-2026). Carlos tenía bolsa y media
     de langostino y escribió 1,5 en una casilla que guardaba GRAMOS: para la
     app tenía 1,5 g y el arroz salía con «falta». Lo que ve en el congelador
     son bolsas, no gramos ni raciones. Así que, en todo lo que se compra en
     envase (bolsa, paquete, tarro, caja…), la casilla va en envases y al lado
     sale lo que suponen —«= 9 raciones · 540 g»— para ver de un vistazo si
     algo no cuadra. Por dentro se sigue guardando igual que antes, en la
     unidad de la ficha, así que recetas, compra y despensa no cambian.
     Lo suelto (panecillos, fruta, huevos) sigue en unidades. */
  function enEnvases(x) {
    return !!(x && x.u !== "ud" && tamEnvase(x) > 0 && x.formato &&
              x.formato !== "suelto" && x.formato !== "racion");
  }
  /* El mismo tamaño que usa «¿Lo tengo?»: la carne picada se cuenta en
     paquetes de 250 g aunque la bandeja traiga dos. */
  function tamEnvase(x) { return x.pieza > 0 ? x.pieza : (x.envase || 0); }
  function nombreEnvase(x, n) {
    if (x.piezaUno) return n === 1 ? x.piezaUno : (x.piezaVarias || x.piezaUno);
    var f = String(x.formato || "envase");
    if (n === 1) return f;
    return /[aeiouk]$/.test(f) ? f + "s" : f + "es";
  }
  function numES(v, dec) {
    var m = Math.pow(10, dec);
    return String(Math.round(v * m) / m).replace(".", ",");
  }
  function equivStock(x) {
    if (!enEnvases(x)) return "";
    var c = x.c || 0, partes = [];
    if (x.racion > 0) {
      var r = c / x.racion;
      partes.push(numES(r, 1) + (Math.round(r * 10) / 10 === 1 ? " raci\u00f3n" : " raciones"));
    }
    partes.push(Util.cantidadReceta(c, x.u, x.pesoUd));
    return "= " + partes.join(" \u00b7 ");
  }
  function lineaStockHTML(x) {
    var env = enEnvases(x);
    var valor = env ? Math.round((x.c || 0) / tamEnvase(x) * 100) / 100 : (x.c || 0);
    var uni = env ? nombreEnvase(x, valor) : (x.u === "ud" ? (x.c === 1 ? "unidad" : "uds") : x.u);
    var pasos = env || x.u === "ud";
    return '<div class="linea linea-stock' + (x.c > 0 ? "" : " hecha") + '" data-fila="' + esc(x.id) + '">' +
      '<div class="datos"><div class="nombre">' + esc(x.n) + '</div>' +
      '<div class="detalle">' + detalleStock(x) + '</div>' +
      (env ? '<div class="nota-peque equiv-stock">' + esc(equivStock(x)) + '</div>' : '') + '</div>' +
      (pasos ? '<button class="btn mini paso-stock" data-menos-stock="' + esc(x.id) + '">\u2212</button>' : '') +
      '<input type="number" class="stock-cant" data-stock="' + esc(x.id) + '" inputmode="decimal" ' +
        (env ? 'data-envase="' + tamEnvase(x) + '" ' : '') +
        'min="0" step="' + (env ? "any" : (x.u === "ud" ? "1" : "10")) + '" value="' + valor + '">' +
      (pasos ? '<button class="btn mini paso-stock" data-mas-stock="' + esc(x.id) + '">+</button>' : '') +
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
        ? (dias === 0 ? "contado hoy" : dias === 1 ? "contado ayer" : "contado " + Util.hace(dias) + "")
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
    var envR = enEnvases(x);
    if (campo && document.activeElement !== campo)
      campo.value = envR ? Math.round((x.c || 0) / tamEnvase(x) * 100) / 100 : (x.c || 0);
    var eq = fila.querySelector(".equiv-stock");
    if (eq) eq.textContent = equivStock(x);
    var un = fila.querySelector(".uni-stock");
    if (un && envR) un.textContent = nombreEnvase(x, Math.round((x.c || 0) / tamEnvase(x) * 100) / 100);
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
    /* Los botones de la cabecera vieja del Menu (semana anterior/siguiente,
       Hoy, Completar, plantillas, pendientes) se fueron con su DOM: el Menu
       nuevo trae los suyos dentro de cada bloque. */

    /* El botón «Importar de Garmin» se quitó el 21-sep-2026. Servía para meter
       a mano el .tcx o el .csv de UNA actividad exportada de Garmin Connect y
       sacarle las calorías; desde que las actividades llegan solas de intervals
       todos los días no hacía falta, y se confundía con la exportación grande
       de cada dos meses, que no pasa por aquí sino por `maestro2.py`.
       El código que lee esos ficheros —leerTCX, leerCSV, importarGarmin— se ha
       dejado donde estaba, sin nadie que lo llame: si algún día hace falta
       volver a meter una actividad suelta, basta con devolver el botón. */



    var anchoAnterior = esMovil();
    window.addEventListener("resize", function () {
      var ahora = esMovil();
      if (ahora !== anchoAnterior) { anchoAnterior = ahora; if (UI.vista === "menu") pintarMenu(); }
    });
    /* RELLENAR UNA SEMANA SE CONFIRMA, CON SUS FECHAS (v371, 3-oct-2026).
       Carlos encontró la semana del 5 al 11 de octubre llena sin haberla
       pedido: los siete días con el mismo sello, de una sola operación y con
       los platos de «Completar», pero sin rastro de cuándo ni desde dónde. Lo
       más probable es un botón pulsado viendo otra semana. Su regla: «no quiero
       que se llene ninguna semana sola si no soy yo quien pulse el botón».
       Así que los tres botones que rellenan una semana entera dicen cuál van a
       tocar y esperan el sí. */
    function confirmarSemana(accion) {
      var hoyLunes = Util.lunesDe(Util.hoyISO());
      var dif = Math.round((Util.desdeISO(UI.lunes) - Util.desdeISO(hoyLunes)) / (7 * 864e5));
      var cual = dif === 0 ? "ESTA semana" : dif === 1 ? "la semana QUE VIENE" : dif === -1 ? "la semana PASADA" :
                 dif > 1 ? "dentro de " + dif + " semanas" : "hace " + (-dif) + " semanas";
      return confirm(accion + " " + cual + ":\n" + Util.etiquetaRango(UI.lunes) + "\n\n\u00bfSeguro?");
    }

    $$("[data-plantilla]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirmarSemana("Vas a aplicar la Semana " + b.getAttribute("data-plantilla") + " a")) return;
        var res = Almacen.aplicarPlantilla(b.getAttribute("data-plantilla"), UI.lunes);
        pintarMenu();
        var sal = (res && res.saltadas) || [];
        Util.toast("Semana " + b.getAttribute("data-plantilla") + " aplicada" +
                   (sal.length ? " \u00b7 " + sal.length + " plato" + (sal.length > 1 ? "s" : "") +
                    " retirado" + (sal.length > 1 ? "s" : "") + " sin poner (" +
                    sal.map(function (x) { return Util.etiquetaFecha(x.f); }).join(", ") + "): elige otro" : ""));
      });
    });


    /* «COPIAR PLANTILLA» CON LISTA (10-oct-2026): se elige cuál, y desde aquí
       mismo se renombran y se borran. Copia sólo en los huecos, como siempre. */
    function abrirPlantillas() {
      var lista = Almacen.estado.plantillas || [];
      var h = '<header><h2>Copiar plantilla</h2><button class="cerrar" data-cerrar>×</button></header>' +
        '<p class="nota-peque">Se copia en los huecos de la semana que estás viendo (' + esc(Util.etiquetaRango(UI.lunes)) +
        '). Lo que ya tengas puesto y los días pasados no se tocan.</p>';
      if (!lista.length) h += '<p class="nota-peque">No tienes ninguna plantilla. Rellena una semana y pulsa «Guardar como plantilla».</p>';
      lista.forEach(function (p) {
        h += '<div class="fila entre" style="padding:8px 0;border-bottom:1px solid var(--borde,#e3e7ee);gap:6px;flex-wrap:wrap">' +
          '<span><b>' + esc(p.nombre || p.id) + '</b> <small>' + Almacen.platosDePlantilla(p) + ' platos</small></span>' +
          '<span class="fila" style="gap:4px">' +
          '<button class="btn mini principal" data-pla-copiar="' + esc(p.id) + '">Copiar</button>' +
          '<button class="btn mini" data-pla-nombre="' + esc(p.id) + '">Renombrar</button>' +
          '<button class="btn mini" data-pla-borrar="' + esc(p.id) + '">Borrar</button></span></div>';
      });
      abrirModal(h);
    }
    function abrirGuardarPlantilla() {
      var lista = Almacen.estado.plantillas || [];
      var h = '<header><h2>Guardar como plantilla</h2><button class="cerrar" data-cerrar>×</button></header>' +
        '<p class="nota-peque">Se guarda la semana que estás viendo (' + esc(Util.etiquetaRango(UI.lunes)) + ').</p>' +
        '<label class="campo"><span>Nombre de la plantilla nueva</span><input type="text" id="pla-nombre-nueva" placeholder="Ej.: Semana de rodillo"></label>' +
        '<button class="btn principal" data-pla-nueva="1">Guardar como nueva</button>';
      if (lista.length) {
        h += '<p class="nota-peque" style="margin-top:14px"><b>O sustituir una que ya tienes</b> (se queda con su nombre):</p>';
        lista.forEach(function (p) {
          h += '<div class="fila entre" style="padding:6px 0;border-bottom:1px solid var(--borde,#e3e7ee)">' +
            '<span>' + esc(p.nombre || p.id) + ' <small>' + Almacen.platosDePlantilla(p) + ' platos</small></span>' +
            '<button class="btn mini" data-pla-sustituir="' + esc(p.id) + '">Sustituir</button></div>';
        });
      }
      abrirModal(h);
    }
    $("#modal").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-pla-copiar],[data-pla-nombre],[data-pla-borrar],[data-pla-nueva],[data-pla-sustituir]") : null;
      if (!b) return;
      var buscar = function (id) { return (Almacen.estado.plantillas || []).filter(function (x) { return x.id === id; })[0]; };
      var id;
      if ((id = b.getAttribute("data-pla-copiar"))) {
        var p = buscar(id);
        if (!p || !confirmarSemana("Vas a copiar «" + (p.nombre || id) + "» en")) return;
        var r = Almacen.rellenarSemana(UI.lunes, id);
        cerrarModal(); pintarMenu();
        Util.toast(r.tomas ? "Copiada «" + (p.nombre || id) + "» en " + r.tomas + " toma" + (r.tomas === 1 ? "" : "s") + " (los días pasados se respetan)"
                           : "No había huecos que rellenar de hoy en adelante");
        return;
      }
      if ((id = b.getAttribute("data-pla-nombre"))) {
        var p2 = buscar(id); if (!p2) return;
        var nom = prompt("Nuevo nombre:", p2.nombre || "");
        if (!nom || !nom.trim()) return;
        Almacen.renombrarPlantilla(id, nom.trim()); abrirPlantillas(); Util.toast("Renombrada");
        return;
      }
      if ((id = b.getAttribute("data-pla-borrar"))) {
        var p3 = buscar(id); if (!p3) return;
        if (!confirm("¿Borrar la plantilla «" + (p3.nombre || id) + "»? No se puede deshacer.")) return;
        Almacen.borrarPlantilla(id); abrirPlantillas(); Util.toast("Plantilla borrada");
        return;
      }
      if (b.hasAttribute("data-pla-nueva")) {
        var inp = $("#pla-nombre-nueva"), n = inp ? inp.value.trim() : "";
        if (!n) { Util.toast("Ponle un nombre"); if (inp) inp.focus(); return; }
        Almacen.guardarPlantilla(UI.lunes, n); cerrarModal(); Util.toast("Plantilla «" + n + "» guardada");
        return;
      }
      if ((id = b.getAttribute("data-pla-sustituir"))) {
        var p4 = buscar(id); if (!p4) return;
        if (!confirm("¿Sustituir «" + (p4.nombre || id) + "» por esta semana?")) return;
        Almacen.guardarPlantilla(UI.lunes, null, id); cerrarModal(); Util.toast("«" + (p4.nombre || id) + "» sustituida");
      }
    });

    /* El deporte y las horas de una ruta son un select y un número: van por «change»,
       no por «click». Al cambiar cualquiera de los dos se rehace la actividad del día,
       que es lo que sube el objetivo de calorías. */


    

    /* el selector de quién se lo come (v378) */


    /* Los oyentes del Menu viejo (#rejilla-dias, #selector-dias,
       #pendientes-despensa) se fueron con su DOM el 5-nov-2026: el Menu nuevo
       engancha los suyos al pintar. */


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
    $("#contador-recetas").addEventListener("click", function (e) {
      var b = e.target.closest("[data-repaso]");
      if (!b) return;
      UI.filtros.vista = b.getAttribute("data-repaso");
      pintarRecetas();
    });
    /* los dos botones viven dentro del modal de la ficha */
    document.addEventListener("click", function (e) {
      /* SOLO LOS DE LA FICHA (8-oct-2026). Las pestañas de arriba también llevan
         `data-vista` («recetas», «menu»…) y cada cambio de pestaña acababa aquí:
         salía «Vuelve a estar sin ver» y se guardaba una marca con el nombre de
         la pestaña. Pasaba desde el 6-oct. */
      var b = e.target.closest(".repaso-botones [data-vista]");
      if (!b) return;
      var p = b.getAttribute("data-vista").split("|");
      var v = Almacen.marcarReceta(p[0], p[1]);
      Util.toast(v === "ok" ? "Marcada como tuya"
        : (v === "pte" ? "Pendiente de revisar"
        : (v === "no" ? "Marcada como que no te vale" : "Vuelve a estar sin ver")));
      abrirFicha(p[0]);
      pintarRecetas();
    });
    /* «Sigue valiendo»: la receta cambió y la vuelves a dar por buena (8-oct-2026) */
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-reconfirmar]");
      if (!b) return;
      var idRC = b.getAttribute("data-reconfirmar");
      Almacen.reconfirmarReceta(idRC);
      Util.toast("Sigue valiendo");
      abrirFicha(idRC);
      pintarRecetas();
    });
    /* lo que hay que mirar, escrito a mano en la ficha */
    document.addEventListener("change", function (e) {
      var i = e.target.closest("[data-notapte]");
      if (!i) return;
      Almacen.apuntarReceta(i.getAttribute("data-notapte"), i.value);
      pintarRecetas();
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
    /* EL BOTÓN DE «SIN COMPLETAR» VIVE EN LA CABECERA, NO EN LA REJILLA.
       Nació escuchando en `#rejilla-ingredientes` y por eso no hacía nada: el
       contador está FUERA de la rejilla, así que el clic no llegaba nunca a ese
       oyente. (Carlos, 2-oct-2026: «salen los 9 sin completar pero el botón no
       funciona».) Cada sitio con su oyente. */
    $("#contador-ingredientes").addEventListener("click", function (e) {
      if (!e.target.closest("[data-verincompletos]")) return;
      UI.filtrosIng.clase = "pendientes";
      var selC = $("#filtro-ing-clase");
      if (selC) selC.value = "pendientes";
      pintarIngredientes();
    });
    ponerLaX(document);

    $("#rejilla-ingredientes").addEventListener("click", function (e) {
      var c = e.target.closest("[data-ingrediente]");
      if (c) abrirIngrediente(c.getAttribute("data-ingrediente"));
    });
    var ocultosBox2 = $("#ingredientes-ocultos");
    if (ocultosBox2) ocultosBox2.addEventListener("click", function (e) {
      var b = e.target.closest("[data-recuperaring]");
      if (!b) return;
      var id = b.getAttribute("data-recuperaring");
      var g = Almacen.ingrediente(id);
      Almacen.recuperarIngrediente(id);
      Util.toast((g ? g.n : "La ficha") + ": recuperada, ya sale en Ingredientes.");
      pintarIngredientes();
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
      /* PESAR LA CARNE (7-oct-2026, corregido esa misma tarde). Esto estaba
         con un addEventListener directo sobre el botón después de pintar el
         modal, y al probarlo no hacía nada: «doy a pesarlo y no cambia nada».
         Todo lo demás de este modal va por delegación, y por algo será. Aquí
         también. El contexto —día, toma, plato e ingrediente— viaja en el
         propio botón, así que no depende de que sobreviva ninguna variable. */
      var pz = e.target.closest("[data-pesar]");
      if (pz) {
        var pp = pz.getAttribute("data-pesar").split("|");
        var cj = $("#peso-real");
        var gr = parseInt(cj ? cj.value : "", 10);
        if (!(gr > 0)) { Util.toast("Pon los gramos que ha pesado"); return; }
        Almacen.ponerPesoReal(pp[0], pp[2], pp[3], gr);
        Util.toast("Pesado: " + gr + " g por raci\u00f3n");
        /* Y REPINTAR EL MENÚ DE DETRÁS (7-oct-2026). Carlos: «si cierro la
           receta en el menú siguen saliendo las calorías antiguas». Se
           guardaba bien, pero cerrar el modal no vuelve a pintar el día. */
        if (typeof pintarMenu === "function") pintarMenu();
        abrirFicha(pp[2], pp[0], pp[1]);
        return;
      }
      /* EL LÁPIZ DE CUALQUIER LÍNEA. Primer toque abre la casilla, el ✓ la
         guarda, el ↺ la devuelve a la receta y el ✕ la deja como estaba. */
      var aj = e.target.closest("[data-ajustar]");
      if (aj) {
        var pa = aj.getAttribute("data-ajustar").split("|");
        ajusteIng = { r: pa[2], i: pa[3] };
        abrirFicha(pa[2], pa[0], pa[1]);
        return;
      }
      var ao = e.target.closest("[data-ajustarok]");
      if (ao) {
        var pb = ao.getAttribute("data-ajustarok").split("|");
        var cb = $("#ajuste-caja");
        var gb = parseInt(cb ? cb.value : "", 10);
        if (!(gb > 0)) { Util.toast("Pon los gramos por raci\u00f3n"); return; }
        Almacen.ponerPesoReal(pb[0], pb[2], pb[3], gb);
        ajusteIng = null;
        if (typeof pintarMenu === "function") pintarMenu();
        abrirFicha(pb[2], pb[0], pb[1]);
        return;
      }
      var aq = e.target.closest("[data-ajustarquita]");
      if (aq) {
        var pc = aq.getAttribute("data-ajustarquita").split("|");
        Almacen.ponerPesoReal(pc[0], pc[2], pc[3], 0);
        ajusteIng = null;
        if (typeof pintarMenu === "function") pintarMenu();
        abrirFicha(pc[2], pc[0], pc[1]);
        return;
      }
      var an = e.target.closest("[data-ajustarno]");
      if (an) {
        var pd = an.getAttribute("data-ajustarno").split("|");
        ajusteIng = null;
        abrirFicha(pd[2], pd[0], pd[1]);
        return;
      }
      var pq = e.target.closest("[data-pesarquita]");
      if (pq) {
        var qq = pq.getAttribute("data-pesarquita").split("|");
        Almacen.ponerPesoReal(qq[0], qq[2], qq[3], 0);
        Util.toast("Vuelve a contar por el cat\u00e1logo");
        if (typeof pintarMenu === "function") pintarMenu();
        abrirFicha(qq[2], qq[0], qq[1]);
        return;
      }
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
      /* EL SUPLENTE (Carlos, 30-sep-2026): «pido cottage y no hay o lo anulan, al
         ponerlo como no entregado sugiere el sustituto de amazon». La casilla
         del suplente sale ESCONDIDA y aparece sólo al marcar que no ha llegado:
         hasta que algo falta, no hay nada que decidir. */
      var pinta = function (id, nombre, cuantos, esHogar) {
        var sup = esHogar ? null : Almacen.elSuplenteDe(id);
        return '<div class="linea-falta" data-falta-de="' + esc(id) + '">' +
          '<div class="linea">' +
          '<input type="checkbox" data-falto="' + esc(id) + '" title="No ha llegado">' +
          '<div class="datos"><div class="nombre">' + esc(nombre) + '</div>' +
          '<div class="detalle">' + (cuantos > 1 ? "pediste " + cuantos : "") + '</div></div>' +
          (esHogar || cuantos <= 1 ? '' :
            '<input type="number" class="stock-cant" data-llegaron="' + esc(id) + '" min="0" max="' + cuantos +
            '" step="1" value="0" style="width:62px; text-align:right" title="Cu\u00e1ntos llegaron">') +
          '</div>' +
          (sup ? '<label class="suplente-of" data-suplente-de="' + esc(id) + '" style="display:none">' +
                   '<input type="checkbox" data-pedir-suplente="' + esc(id) + '" checked> ' +
                   (sup.tipo === "mismo"
                     ? 'P\u00eddelo en <b>' + esc(sup.donde) + '</b>'
                     : 'En su lugar, <b>' + esc(sup.n) + '</b> en ' + esc(sup.donde)) +
                 '</label>' : '') +
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

      /* Marcar que algo no ha llegado enciende su oferta de suplente. */
      $("#modal").addEventListener("change", function (e) {
        var c = e.target.closest ? e.target.closest("[data-falto]") : null;
        if (!c) return;
        var of = document.querySelector('[data-suplente-de="' + c.getAttribute("data-falto") + '"]');
        if (of) of.style.display = c.checked ? "" : "none";
      });

      $("#cf-ok").addEventListener("click", function () {
        var faltas = {}, faltasHogar = {}, alSuplente = {};
        $$("#modal [data-falto]").forEach(function (c) {
          if (!c.checked) return;
          var id = c.getAttribute("data-falto");
          var n = document.querySelector('[data-llegaron="' + id + '"]');
          faltas[id] = n ? (parseInt(n.value, 10) || 0) : 0;
          faltasHogar[id] = true;
          var sp = document.querySelector('[data-pedir-suplente="' + id + '"]');
          if (sp && sp.checked) alSuplente[id] = true;
        });
        var res = Almacen.confirmarCompra(lineas, faltas, alSuplente);
        Almacen.confirmarHogar(casa.map(function (x) { return x.id; }), faltasHogar);
        cerrarModal(); pintarCompra(); pintarDespensa();
        Util.toast("Entraron " + res.entraron + " en la despensa" +
                   (res.recados ? " \u00b7 " + res.recados + " a recados" : "") +
                   (res.suplentes ? " \u00b7 " + res.suplentes + " al suplente" : ""));
      });
    });
    $("#compra-recalcular").addEventListener("click", pintarCompra);
    $("#compra-recibida").addEventListener("click", function () {
      var c = compraRecibidaPendiente();
      if (!c) return;
      /* A5 + A6 · 10-oct-2026: el mismo camino de siempre —a la lista, ya
         marcado, y «Comprado» para desmarcar lo que no llegó—, con los envases
         bien contados y sin sumarse a lo que pedía el menú. Ver
         `Almacen.cargarTicketEnLista`. */
      var res = Almacen.cargarTicketEnLista(c.lineas, { ref: c.ref, fecha: c.fecha, n: c.n,
                                                        tienda: c.tienda || "Mercadona", extra: c.extra });
      if (!Almacen.estado.config.comprasCargadas) Almacen.estado.config.comprasCargadas = {};
      Almacen.estado.config.comprasCargadas[c.ref] = Util.hoyISO();
      Almacen.guardar("config");
      pintarCompra();
      Util.toast(res.puestas + " productos del ticket en la lista. Ahora abre " + (c.tienda || "Mercadona") + " y pulsa \u00abPedido recibido\u00bb" +
                 (res.sinFicha.length ? " \u00b7 " + res.sinFicha.length + " sin ficha, fuera" : ""));
    });
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
      var tc = e.target.closest("[data-tiendacomprada]");
      if (tc) { abrirCompradoTienda(tc.getAttribute("data-tiendacomprada")); return; }
      if (e.target.closest("[data-abrirpendiente]")) { abrirPendiente(); return; }
      var at = e.target.closest("[data-abrirtienda]");
      if (at) { abrirListaTienda(at.getAttribute("data-abrirtienda")); return; }
      var ccm = e.target.closest("[data-cantcompra]");
      if (ccm) {
        if (cambiarCantidadCompra(ccm.getAttribute("data-cantcompra"))) pintarCompra();
        return;
      }
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
      var pc = e.target.closest("[data-pendcomprado]");
      if (pc) {
        Almacen.comprarPendiente(pc.getAttribute("data-pendcomprado"));
        pintarCompra(); pintarDespensa();
        Util.toast("Comprado: entra en la despensa");
        return;
      }
      var rec = e.target.closest("[data-recado]");
      if (rec) {
        if (!confirm("\u00bfQuitarlo de Pendiente sin comprarlo? No entra en la despensa, y si el men\u00fa lo pide volver\u00e1 a la lista de su tienda.")) return;
        Almacen.quitarRecado(rec.getAttribute("data-recado")); pintarCompra();
      }
    });
    $("#compra-marcas").addEventListener("click", function () {
      abrirMarcas(faltanMarcas(), function () { pintarCompra(); pintarHogar(); });
    });
    $("#compra-copiar").addEventListener("click", function () {
      var texto = textoCompra(true);
      if (navigator.clipboard) navigator.clipboard.writeText(texto).then(function () { Util.toast("Lista copiada"); });
      else Util.toast("No se ha podido copiar en este aparato");
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
      UI.locCambios = (UI.locCambios || 0) + 1;
      pintarBotonLoc();
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
    var bo = $("#buscar-orden");
    if (bo) bo.addEventListener("input", function (e) {
      UI.buscaOrden = e.target.value; pintarOrdenCompra();
    });
    var ro = $("#rejilla-orden");
    if (ro) ro.addEventListener("click", function (e) {
      var mv = e.target.closest("[data-ordsube]") || e.target.closest("[data-ordbaja]");
      if (!mv) return;
      var caja = mv.closest("[data-clavecompra]");
      if (!caja || caja.getAttribute("data-filtrado")) return;
      var id = mv.getAttribute("data-ordsube") || mv.getAttribute("data-ordbaja");
      var ids = Array.prototype.map.call(caja.querySelectorAll("[data-compfila]"), function (f) {
        return f.getAttribute("data-compfila");
      });
      Almacen.moverEnCompra(caja.getAttribute("data-clavecompra"), ids, id,
                            mv.hasAttribute("data-ordsube") ? -1 : 1);
      pintarOrdenCompra();
    });

    /* Y lo mismo arrastrando, para el que esté en el ordenador. */
    if (ro) montarArrastre(ro, "[data-compfila]", "[data-clavecompra]", function (gr, ids) {
      Almacen.fijarOrdenCompra(gr.getAttribute("data-clavecompra"), ids);
      pintarOrdenCompra();
    });

    montarArrastre($("#rejilla-loc"), "[data-locfila]", "[data-estanteloc]", function (gr, ids) {
      var k = gr.getAttribute("data-estanteloc");
      Almacen.fijarOrdenCasa(k, ids);
      UI.estanteAbierto = k;          /* que no se cierre al repintar */
      pintarLocalizacion();
    });

    /* Las flechas del orden de la compra. Se guarda EXACTAMENTE lo que se ve en
       pantalla, leído del DOM, para que no dependa de lo guardado antes. */
    $("#rejilla-loc").addEventListener("click", function (e) {
      /* Subir o bajar dentro del estante. Va lo primero: estos botones viven
         dentro del desplegable y si no se atiende aquí el clic sigue su camino. */
      var mv = e.target.closest("[data-locsube]") || e.target.closest("[data-locbaja]");
      if (mv) {
        var idMv = mv.getAttribute("data-locsube") || mv.getAttribute("data-locbaja");
        var dEstMv = mv.closest("[data-estanteloc]");
        if (dEstMv) {
          var kMv = dEstMv.getAttribute("data-estanteloc");
          Almacen.moverEnCasa(kMv, idMv, mv.hasAttribute("data-locsube") ? -1 : 1);
          UI.estanteAbierto = kMv;      /* que no se cierre al repintar */
          pintarLocalizacion();
        }
        return;
      }
      var sum = e.target.closest("summary");
      if (!sum) return;
      /* La cabecera de un ESTANTE no debe plegar su zona: se atiende antes y se
         sale. Y al abrir uno, los hermanos se cierran, que es lo que pidió
         Carlos: «sólo abro el que quiero ver». */
      var dEst = sum.closest("[data-estanteloc]");
      if (dEst) {
        var kEst = dEst.getAttribute("data-estanteloc");
        var abriendo = !dEst.open;   /* el clic va antes del toggle del navegador */
        UI.estanteAbierto = abriendo ? kEst : "";
        if (abriendo && dEst.parentNode) {
          var hermanos = dEst.parentNode.querySelectorAll("details[data-estanteloc]");
          Array.prototype.forEach.call(hermanos, function (o) { if (o !== dEst) o.open = false; });
        }
        return;
      }
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
        var caprichos = Object.keys(Almacen.estado.quiero || {}).length;
        var hogarM = Object.keys(Almacen.estado.hogar || {}).length;
        if (!cuantos && !caprichos && !hogarM) { Util.toast("No hay nada apuntado"); return; }
        if (!confirm("Se borra lo apuntado en " + cuantos +
            (cuantos === 1 ? " producto" : " productos") +
            ", y los estantes quedan sin repasar." +
            (caprichos ? "\n\nTambi\u00e9n se borran " + caprichos +
              (caprichos === 1 ? " cosa" : " cosas") + " de \u00ablo quiero esta vez\u00bb." : "") +
            (hogarM ? "\n\nY " + hogarM + (hogarM === 1 ? " cosa marcada" : " cosas marcadas") +
              " de Hogar." : "") +
            "\n\nRecuperarlo es volver a dar la vuelta a la casa. \u00bfSeguro?")) return;
        Almacen.borrarStock();
        UI.pase = { vista: "indice", estante: null, i: 0 };
        UI.estanteTengo = null;
        pintarLoTengo(); pintarCompra(); pintarHogar();
        Util.toast("Borrado: " + cuantos + " productos sin apuntar" +
          (caprichos + hogarM ? " y " + (caprichos + hogarM) + " de la lista" : "")); return;
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
      /* ---- Hogar en lista: Hay / Me falta (4-oct-2026) ---- */
      var thh = e.target.closest("[data-hlhay]");
      if (thh) { Almacen.marcarFaltaHogar(thh.getAttribute("data-hlhay"), false); pintarLoTengo(); pintarCompra(); return; }
      var thf = e.target.closest("[data-hlfalta]");
      if (thf) {
        var idTF = thf.getAttribute("data-hlfalta");
        if (!Almacen.faltaHogar(idTF)) Almacen.marcarFaltaHogar(idTF, true, 1);
        pintarLoTengo(); pintarCompra(); return;
      }
      var thd = e.target.closest("[data-hogarlistahecho]");
      if (thd) {
        Almacen.marcarMirado(thd.getAttribute("data-hogarlistahecho"));
        UI.pase.vista = "fin"; pintarLoTengo(); arribaTengo(); return;
      }
      /* ---- las respuestas de un estante de Hogar, dentro del pase ---- */
      var phs = e.target.closest("[data-hogarsi]");
      if (phs) {
        var idhs = phs.getAttribute("data-hogarsi");
        Almacen.marcarFaltaHogar(idhs, true, Almacen.cantidadHogar(idhs) || 1);
        avanzarFicha(); return;
      }
      var phn = e.target.closest("[data-hogarno]");
      if (phn) {
        Almacen.marcarFaltaHogar(phn.getAttribute("data-hogarno"), false);
        avanzarFicha(); return;
      }
      var phc = e.target.closest("[data-hogarcant]");
      if (phc) {
        var pph = phc.getAttribute("data-hogarcant").split("|");
        var nph = (Almacen.cantidadHogar(pph[0]) || 1) + Number(pph[1]);
        if (nph < 1) nph = 1;
        Almacen.marcarFaltaHogar(pph[0], true, nph);
        pintarLoTengo(); return;
      }
      var phe = e.target.closest("[data-hogareditar]");
      if (phe) { abrirHogar(phe.getAttribute("data-hogareditar")); return; }

      /* lo hecho en casa (v382) */
      var bren = e.target.closest("[data-renovar]");
      if (bren) {
        var pues = Almacen.renovarCasero(bren.getAttribute("data-renovar"));
        Util.toast(pues.length ? "A la próxima compra: " + pues.join(", ") : "No había nada que pedir");
        pintarLoTengo(); return;
      }
      /* «Lo he preparado» ya no suma a ciegas: abre la ventana de cómo se hace
         y cómo se guarda, y se confirma desde allí (Carlos, 4-oct-2026). */
      var bprep = e.target.closest("[data-preparado]");
      if (bprep) { abrirCasero(bprep.getAttribute("data-preparado"), true); return; }
      var bcc = e.target.closest("[data-comocasero]");
      if (bcc) { e.preventDefault(); abrirCasero(bcc.getAttribute("data-comocasero"), false); return; }

      var bqp = e.target.closest("[data-quieropaso]");
      if (bqp) {
        var pq2 = bqp.getAttribute("data-quieropaso").split("|");
        var act2 = ((Almacen.estado.quiero || {})[pq2[0]] || {}).p || 0;
        var n3 = act2 + Number(pq2[1]);
        if (n3 < 1) Almacen.quererEstaVez(pq2[0], false);
        else Almacen.quererEstaVez(pq2[0], true, n3);
        pintarLoTengo(); return;
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
      UI.locCambios = 0;
      pintarLocalizacion();
      var c = $("#rejilla-loc");
      if (c) try { c.scrollIntoView({ block: "start" }); } catch (e3) {}
      /* CONFIRMAR = GUARDAR EN GITHUB (4-oct-2026, v395). Carlos: «la clave es
         que aparezca lo de guardado en GitHub después de confirmar el cambio».
         Cada cambio ya se guardaba solo a los pocos segundos; ahora el botón lo
         sube en el momento y dice cómo ha ido. */
      if (!global.Sync || !Sync.guardarYa) return;
      bre.textContent = "Guardando en GitHub\u2026";
      Sync.guardarYa().then(function (r) {
        var b2 = $("#loc-reordenar");
        if (!b2) return;
        if (r === "local") { b2.textContent = "Guardado solo en este aparato"; return; }
        b2.textContent = r ? "Guardado en GitHub \u2713" : "No se ha podido guardar en GitHub";
        b2.classList.toggle("ok-github", !!r);
        Util.toast(r ? "Cambios guardados en GitHub" : "No se ha podido guardar en GitHub: mira el aviso de arriba");
      });
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
    /* ---- ordenar Hogar como está en casa (4-oct-2026) ---- */
    function pintarBotonHogar() {
      var b = $("#hogar-confirmar");
      if (!b) return;
      var n = UI.hogCambios || 0;
      b.disabled = !n;
      b.classList.toggle("avisa", !!n);
      b.classList.remove("ok-github");
      b.textContent = n ? "Confirmar cambios (" + n + ")" : "Confirmar cambios";
    }
    montarArrastre($("#rejilla-hogar"), "[data-locfila]", "[data-hogest]", function (gr, ids) {
      Almacen.fijarOrdenCasa(gr.getAttribute("data-hogest"), ids);
      UI.hogCambios = (UI.hogCambios || 0) + 1;
      pintarHogar(); pintarBotonHogar();
    });
    var bHc = $("#hogar-confirmar");
    if (bHc) bHc.addEventListener("click", function () {
      UI.hogCambios = 0;
      pintarBotonHogar();
      if (!global.Sync || !Sync.guardarYa) return;
      bHc.textContent = "Guardando en GitHub\u2026";
      Sync.guardarYa().then(function (r) {
        if (r === "local") { bHc.textContent = "Guardado solo en este aparato"; return; }
        bHc.textContent = r ? "Guardado en GitHub \u2713" : "No se ha podido guardar en GitHub";
        bHc.classList.toggle("ok-github", !!r);
        Util.toast(r ? "Orden de Hogar guardado en GitHub" : "No se ha podido guardar en GitHub: mira el aviso de arriba");
      });
    });
    $("#rejilla-hogar").addEventListener("click", function (e) {
      var hm = e.target.closest("[data-hogsube]") || e.target.closest("[data-hogbaja]");
      if (hm) {
        var gH = hm.closest("[data-hogest]");
        if (!gH) return;
        var kH = gH.getAttribute("data-hogest");
        var idH = hm.getAttribute("data-hogsube") || hm.getAttribute("data-hogbaja");
        var idsH = Almacen.hogarDeEstante(kH).map(function (x) { return x.id; });
        var iH = idsH.indexOf(idH), jH = iH + (hm.hasAttribute("data-hogsube") ? -1 : 1);
        if (iH < 0 || jH < 0 || jH >= idsH.length) return;
        idsH[iH] = idsH[jH]; idsH[jH] = idH;
        Almacen.fijarOrdenCasa(kH, idsH);
        UI.hogCambios = (UI.hogCambios || 0) + 1;
        pintarHogar(); pintarBotonHogar();
        return;
      }
      /* ---- el pase de Hogar ---- */
      var hap = e.target.closest("[data-hogarap]");
      if (hap) {
        UI.paseHogar = { vista: "ficha", ap: hap.getAttribute("data-hogarap"), i: 0 };
        pintarHogar(); return;
      }
      if (e.target.closest("[data-hogarindice]")) {
        UI.paseHogar = { vista: "indice", ap: null, i: 0 };
        pintarHogar(); return;
      }
      if (e.target.closest("[data-hogaratras]")) {
        UI.paseHogar.i = Math.max(0, UI.paseHogar.i - 1); pintarHogar(); return;
      }
      if (e.target.closest("[data-hogardelante]")) {
        UI.paseHogar.i = UI.paseHogar.i + 1; pintarHogar(); return;
      }
      var hsi = e.target.closest("[data-hogarsi]");
      if (hsi) {
        var idS = hsi.getAttribute("data-hogarsi");
        Almacen.marcarFaltaHogar(idS, true, Almacen.cantidadHogar(idS) || 1);
        avanzarHogar(); pintarCompra(); return;
      }
      var hno = e.target.closest("[data-hogarno]");
      if (hno) {
        Almacen.marcarFaltaHogar(hno.getAttribute("data-hogarno"), false);
        avanzarHogar(); pintarCompra(); return;
      }
      var hc = e.target.closest("[data-hogarcant]");
      if (hc) {
        var ph = hc.getAttribute("data-hogarcant").split("|");
        var nh = (Almacen.cantidadHogar(ph[0]) || 1) + Number(ph[1]);
        if (nh < 1) nh = 1;
        Almacen.marcarFaltaHogar(ph[0], true, nh);
        pintarHogar(); pintarCompra(); return;
      }
      var hlh = e.target.closest("[data-hlhay]");
      if (hlh) { Almacen.marcarFaltaHogar(hlh.getAttribute("data-hlhay"), false); pintarHogar(); pintarCompra(); return; }
      var hlf = e.target.closest("[data-hlfalta]");
      if (hlf) {
        var idF = hlf.getAttribute("data-hlfalta");
        if (!Almacen.faltaHogar(idF)) Almacen.marcarFaltaHogar(idF, true, 1);
        pintarHogar(); pintarCompra(); return;
      }
      var hed = e.target.closest("[data-hogareditar]");
      if (hed) { abrirHogar(hed.getAttribute("data-hogareditar")); return; }

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
      var v = parseFloat(String(st.value).replace(",", "."));
      var envS = parseFloat(st.getAttribute("data-envase"));
      if (envS > 0 && !isNaN(v)) v = Math.round(v * envS * 100) / 100;   // envases → unidad de la ficha
      Almacen.ponerStock(id, v);
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
        var campo = document.querySelector('[data-stock="' + idp + '"]');
        var envP = campo ? parseFloat(campo.getAttribute("data-envase")) : 0;
        /* En envases, cada toque es MEDIO envase: la bolsa abierta es lo normal. */
        var salto = envP > 0 ? envP / 2 : 1;
        var suma = paso.hasAttribute("data-mas-stock") ? salto : -salto;
        var nueva = Almacen.stockDe(idp) + suma;
        if (nueva < 0) nueva = 0;
        Almacen.ponerStock(idp, nueva);
        if (campo) campo.value = envP > 0 ? Math.round(nueva / envP * 100) / 100 : nueva;
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
        Almacen._sellarStock();
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
      Almacen.quitarPeso(f);
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

    /* LAS COPIAS DIARIAS (10-oct-2026): ver y recuperar. Ver `Sync.copiaDiaria`. */
    function abrirCopias() {
      if (!Sync.configurado()) { Util.toast("Primero conecta con GitHub"); return; }
      abrirModal('<header><h2>Copias diarias</h2><button class="cerrar" data-cerrar>\u00d7</button></header>' +
                 '<p class="nota-peque" id="copias-estado">Mirando el repositorio\u2026</p><div id="copias-lista"></div>');
      Sync.listarCopias().then(function (l) {
        var est = $("#copias-estado"), caja = $("#copias-lista");
        if (!est || !caja) return;
        if (!l.length) { est.textContent = "Todav\u00eda no hay ninguna copia: se hace sola la primera vez que se guarda cada d\u00eda."; return; }
        est.textContent = l.length + (l.length === 1 ? " copia" : " copias") + ". La m\u00e1s nueva arriba.";
        caja.innerHTML = l.map(function (x) {
          return '<div class="fila entre" style="padding:6px 0;border-bottom:1px solid var(--borde,#e3e7ee)">' +
                 '<span><b>' + esc(Util.etiquetaFecha(x.f)) + '</b> <small>' + x.f.slice(0, 4) + ' \u00b7 ' +
                 Math.round((x.bytes || 0) / 1024) + ' KB</small></span>' +
                 '<button class="btn mini" data-copia-recuperar="' + esc(x.ruta) + '" data-copia-dia="' + esc(x.f) + '">Recuperar</button></div>';
        }).join("");
      }).catch(function (e) {
        var est = $("#copias-estado"); if (est) est.textContent = "No se han podido leer: " + ((e && e.message) || e);
      });
    }
    var bCop = $("#copias-ver");
    if (bCop) bCop.addEventListener("click", abrirCopias);
    $("#modal").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-copia-recuperar]") : null;
      if (!b) return;
      var dia = b.getAttribute("data-copia-dia");
      if (!confirm("Vas a recuperar la copia del " + Util.etiquetaFecha(dia) + ".\n\n" +
                   "Todo lo que hayas apuntado DESPU\u00c9S se pierde, en este aparato y en los dem\u00e1s.\n\n\u00bfSeguro?")) return;
      b.disabled = true; b.textContent = "Recuperando\u2026";
      Sync.recuperarCopia(b.getAttribute("data-copia-recuperar")).then(function (ok) {
        cerrarModal(); mostrar(UI.vista);
        Util.toast(ok ? "Recuperada la copia del " + Util.etiquetaFecha(dia) : "Recuperada aqu\u00ed, pero no se pudo subir: pulsa \u00abSubir ahora\u00bb");
      }).catch(function (e) {
        b.disabled = false; b.textContent = "Recuperar";
        Util.toast("No se pudo recuperar: " + ((e && e.message) || e));
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
    arrancarAyuda();

    /* YA NO SE RELLENA LA SEMANA A AL ARRANCAR (4-oct-2026).
       Antes, un aparato estrenado (plan vacío) se ponía la Semana A en la semana
       en curso. Al conectarlo a GitHub, ese día de hoy recién «tocado» ganaba al
       bueno por ser más nuevo: así la tablet le cambió a Carlos el domingo 4 (la
       pasta boloñesa que había comido) por el entrecot de la Semana A, dos veces
       (17:05 y 17:48). Además va contra su regla del 3-oct: «no quiero que se
       llene ninguna semana sola si no soy yo quien pulse el botón». Un aparato
       nuevo arranca vacío y se llena con lo que traiga GitHub. */

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
