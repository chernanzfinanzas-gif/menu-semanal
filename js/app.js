/* app.js — interfaz de la aplicación */
(function (global) {
  "use strict";

  var $ = Util.$, $$ = Util.$$, esc = Util.esc;

  var UI = {
    vista: "menu",
    lunes: Util.lunesDe(Util.hoyISO()),
    filtros: { texto: "", toma: "", grupo: "", tool: "" },
    busquedaDespensa: "",
    diaActivo: null,        // índice 0-6; en móvil se muestra un solo día
    ocultarComprados: false
  };

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
    "desayuno": "Desayuno", "fruta": "Fruta", "postre": "Postre"
  };
  var ABREV = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
  var NOMBRE_TOOL = {
    "lekue": "Lékué", "airfryer": "Airfryer", "microondas": "Microondas", "sarten": "Sartén",
    "horno": "Horno", "cazuela": "Cazuela", "sin-cocinar": "Sin cocinar"
  };


  /* ==================== PORTADA ==================== */
  /* El vídeo de entrada. Tres opciones, porque «siempre» puede acabar cansando
     y así se baja sin tener que tocar nada: siempre / una vez al día / nunca.
     La preferencia es de este aparato, igual que el modo consulta. */
  var CLAVE_INTRO = "asistente-alimentacion-intro";        // último día que se enseñó
  var CLAVE_INTRO_OFF = "asistente-alimentacion-intro-off";      // el ajuste viejo
  var CLAVE_INTRO_CUANDO = "asistente-alimentacion-intro-cuando";
  var CLAVE_INTRO_SON = "asistente-alimentacion-intro-sonido";   // si quiere oírlo

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

      /* El sonido. El vídeo ARRANCA SIEMPRE MUDO porque ningún navegador deja
         empezar con sonido sin que toques antes la pantalla: si lo intentáramos,
         no arrancaría. El botón lo activa de un toque y me acuerdo de la
         elección, pero aun así la próxima vez empiezo mudo e intento subirlo
         después; si el navegador se queja, se queda mudo y no pasa nada. */
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
          try { localStorage.setItem(CLAVE_INTRO_SON, v.muted ? "no" : "si"); } catch (e) {}
          pintarSonido();
        });
      }
      pintarSonido();

      var prometido = v.play();
      if (prometido && prometido.catch) prometido.catch(function () { cerrarPortada(); });

      var queria = false;
      try { queria = localStorage.getItem(CLAVE_INTRO_SON) === "si"; } catch (e) {}
      if (queria) {
        setTimeout(function () {
          if (!v.parentNode) return;
          var iba = !v.paused;                 /* ¿estaba corriendo antes de tocarlo? */
          try { v.muted = false; pintarSonido(); } catch (e) { return; }
          setTimeout(function () {
            /* Solo doy marcha atrás si el vídeo IBA y subirle el sonido lo ha
               parado. Si todavía no había arrancado, no es cosa del sonido y
               callarlo aquí sería quitárselo por nada. */
            if (v.parentNode && iba && v.paused) {
              v.muted = true; pintarSonido();
              try { v.play(); } catch (e) {}
            }
          }, 260);
        }, 120);
      }

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
      var punto = !hay ? "vacio" : Almacen.semaforo(Almacen.salDia(f));
      sel += '<button data-dia="' + d + '"' + (d === UI.diaActivo ? ' class="activo"' : '') + '>' +
             ABREV[d] +
             '<span class="num">' + Util.desdeISO(f).getDate() + '</span>' +
             '<span class="punto ' + punto + '"></span></button>';
    }
    $("#selector-dias").innerHTML = sel;

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
      var color = Almacen.semaforo(sal);
      var tieneAlgo = false;
      if (dia) Util.TOMAS.forEach(function (t) { if ((dia[t.k] || []).length) tieneAlgo = true; });

      var nutr = Almacen.nutrDia(fecha);
      var nutrCom = Almacen.nutrDia(fecha, true);
      var hayComido = Almacen.hayComidoAlgo(fecha);
      var kcalAct = Math.round(Almacen.kcalActividad(fecha));
      var objetivo = Almacen.objetivoDelDia(fecha);
      var colorK = Almacen.semaforoKcal(nutr.k, objetivo);

      html += '<div class="dia' + (fecha === hoy ? " hoy" : "") + '">';
      html += '<header><span class="nombre">' + Util.DIAS[i] + '</span>' +
              '<span class="fecha">' + Util.etiquetaFecha(fecha) + '</span>' +
              (tieneAlgo ? '<span class="chip-sal ' + colorK + '">' + Util.kcal(nutr.k) + '</span>' +
                           '<span class="chip-sal ' + color + '">' + Util.sal(sal) + ' sal</span>' : '') +
              '</header>';

      if (tieneAlgo) {
        var pct = objetivo ? Math.min(100, Math.round((hayComido ? nutrCom.k : nutr.k) / objetivo * 100)) : 0;
        html += '<div class="resumen-dia">' +
                  (objetivo ? '<div class="barra"><span class="relleno ' + colorK + '" style="width:' + pct + '%"></span></div>' : '') +
                  '<div class="macros">' +
                    '<span><b>P</b> ' + Math.round(nutr.p) + ' g</span>' +
                    '<span><b>G</b> ' + Math.round(nutr.g) + ' g</span>' +
                    '<span><b>H</b> ' + Math.round(nutr.h) + ' g</span>' +
                    (kcalAct ? '<span class="quemado">+' + kcalAct + ' por actividad</span>' : '') +
                    (hayComido
                      ? '<span class="comido-hasta">Llevas ' + Util.kcal(nutrCom.k) + '</span>'
                      : (objetivo ? '<span class="comido-hasta">Objetivo ' + Util.kcal(objetivo) + '</span>' : '')) +
                  '</div>' +
                '</div>';
      }

      Util.TOMAS.forEach(function (t) {
        var platos = (dia && dia[t.k]) || [];
        html += '<div class="toma">';
        html += '<div class="titulo-toma"><span>' + t.n + '</span>' +
                '<button class="anadir" data-anadir="' + fecha + '|' + t.k + '">+</button></div>';
        if (!platos.length) {
          html += '<div class="nota-peque">—</div>';
        } else {
          platos.forEach(function (rid, idx) {
            var r = Almacen.receta(rid);
            var nombre = r ? r.n : "(receta borrada)";
            var n = r ? Almacen.nutrReceta(r) : { k: 0 };
            var s = r ? Util.sal(Almacen.salReceta(r)) : "";
            var com = Almacen.estaComido(fecha, t.k, rid);
            html += '<div class="plato' + (com ? " comido" : "") + '">' +
                      '<button class="marcar' + (com ? " si" : "") + '" title="Marcar como comido" ' +
                        'data-comido="' + fecha + '|' + t.k + '|' + esc(rid) + '">✓</button>' +
                      '<span class="nom" data-ficha="' + esc(rid) + '">' + esc(nombre) + '</span>' +
                      '<span class="sal">' + Util.kcal(n.k) + ' · ' + s + '</span>' +
                      '<button class="quitar" data-quitar="' + fecha + '|' + t.k + '|' + idx + '">×</button>' +
                    '</div>';
          });
        }
        html += '</div>';
      });

      /* actividad del día */
      var actos = Almacen.estado.actividad[fecha] || [];
      html += '<div class="toma actividad-dia">';
      html += '<div class="titulo-toma"><span>Actividad</span>' +
              '<button class="anadir" data-actividad="' + fecha + '">+</button></div>';
      if (!actos.length) {
        html += '<div class="nota-peque">—</div>';
      } else {
        actos.forEach(function (x, idx) {
          var kc = Math.round(Almacen.kcalDeEntrada(x));
          html += '<div class="plato">' +
                    '<span class="nom">' + esc(Almacen.nombreDeEntrada(x)) +
                      (x.fuente === "garmin" ? ' <span class="etiqueta">reloj</span>' : '') + '</span>' +
                    '<span class="sal">' + x.min + ' min · ' + kc + ' kcal</span>' +
                    '<button class="quitar" data-quitaract="' + fecha + '|' + idx + '">×</button>' +
                  '</div>';
        });
      }
      html += '</div>';
      html += '</div>';
    }
    cont.innerHTML = html;
  }

  /* selector de receta para una toma */
  function abrirSelector(fecha, toma) {
    var recetas = Almacen.estado.recetas.filter(function (r) {
      return (r.tipo || []).indexOf(toma) >= 0;
    });
    if (!recetas.length) recetas = Almacen.estado.recetas.slice();
    recetas.sort(function (a, b) { return a.n.localeCompare(b.n); });

    var html = '<header><h2>Añadir a ' + toma + '</h2><button class="cerrar" data-cerrar>×</button></header>';
    html += '<input type="text" id="filtro-selector" placeholder="Filtrar…">';
    html += '<div class="lista-selec" id="lista-selector">';
    recetas.forEach(function (r) {
      html += '<button data-elegir="' + esc(r.id) + '" data-nombre="' + esc(r.n.toLowerCase()) + '">' +
              esc(r.n) + '<small>' + (NOMBRE_GRUPO[r.grupo] || r.grupo || "") + ' · ' +
              Util.sal(Almacen.salReceta(r)) + ' de sal · ' + (r.min || "?") + ' min</small></button>';
    });
    html += '</div>';
    abrirModal(html);

    $("#filtro-selector").addEventListener("input", function (e) {
      var q = e.target.value.toLowerCase();
      $$("#lista-selector button").forEach(function (b) {
        b.style.display = b.getAttribute("data-nombre").indexOf(q) >= 0 ? "" : "none";
      });
    });
    $("#lista-selector").addEventListener("click", function (e) {
      var b = e.target.closest("[data-elegir]");
      if (!b) return;
      var dia = Almacen.asegurarDia(fecha);
      dia[toma].push(b.getAttribute("data-elegir"));
      Almacen.guardar("plato");
      cerrarModal();
      pintarMenu();
    });
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
  function abrirFicha(id) {
    var r = Almacen.receta(id);
    if (!r) return;
    var salRacion = Almacen.salReceta(r);
    var n = Almacen.nutrReceta(r);

    var html = '<header><h2>' + esc(r.n) + '</h2><button class="cerrar" data-cerrar>×</button></header>';
    html += '<div class="etiquetas">' +
            '<span class="etiqueta verde">' + Util.kcal(n.k) + ' / ración</span>' +
            '<span class="etiqueta verde">' + Util.sal(salRacion) + ' de sal / ración</span>' +
            '<span class="etiqueta">' + (r.raciones || 1) + ' ración(es)</span>' +
            '<span class="etiqueta">' + (r.min || "?") + ' min</span>' +
            (r.grupo ? '<span class="etiqueta">' + esc(NOMBRE_GRUPO[r.grupo] || r.grupo) + '</span>' : '') +
            (r.tools || []).map(function (t) { return '<span class="etiqueta">' + esc(NOMBRE_TOOL[t] || t) + '</span>'; }).join("") +
            '</div>';

    html += '<div class="nutri-ficha">' +
            '<div><b>' + Math.round(n.p) + ' g</b><span>proteína</span></div>' +
            '<div><b>' + Math.round(n.g) + ' g</b><span>grasa</span></div>' +
            '<div><b>' + Math.round(n.h) + ' g</b><span>hidratos</span></div>' +
            '<div><b>' + Util.kcal(n.k).replace(" kcal", "") + '</b><span>kcal</span></div>' +
            '</div>';

    html += '<h3 style="margin-top:16px">Ingredientes</h3><ul class="ingredientes">';
    (r.ing || []).forEach(function (l) {
      var ing = Almacen.ingrediente(l.i);
      var gr = Almacen.gramosDeLinea(l) / 100;
      var kc = ing ? Math.round(gr * (ing.k || 0)) : 0;
      html += '<li><span>' + esc(ing ? ing.n : l.i) + '</span><span>' +
              Util.cantidadReceta(l.c, ing ? ing.u : "g", ing ? ing.pesoUd : 0) +
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
            ["desayuno", "almuerzo", "comida", "merienda", "cena", "guarnicion", "postre"].map(function (t) {
              return '<label style="font-size:.85rem"><input type="checkbox" class="ed-tipo" value="' + t + '"' +
                     ((r.tipo || []).indexOf(t) >= 0 ? " checked" : "") + '> ' + t + '</label>';
            }).join(" ") + '</div></label>';
    html += '<label class="campo"><span>Herramientas</span><div class="fila">' +
            Object.keys(NOMBRE_TOOL).map(function (t) {
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

  /* ==================== EDITOR DE INGREDIENTE ==================== */
  function abrirIngrediente(id) {
    var nuevo = !id;
    var g = nuevo
      ? { id: "", n: "", cat: "Frutas y verduras", u: "g", sal: 0, k: 0, p: 0, g: 0, h: 0 }
      : JSON.parse(JSON.stringify(Almacen.ingrediente(id)));
    if (!g) return;

    var cats = ["Frutas y verduras", "Carnicería", "Pescadería", "Congelados",
                "Lácteos y huevos", "Panadería", "Despensa", "Especias y aromáticos"];

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
    html += '<label style="font-size:.85rem; display:block; margin-bottom:12px">' +
            '<input type="checkbox" id="ig-basico"' + (g.basico ? " checked" : "") + '> ' +
            'Es un básico de despensa (va aparte en la lista de la compra)</label>';
    html += '<div class="fila"><button class="btn principal" id="ig-guardar">Guardar</button>' +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    abrirModal(html);

    $("#ig-guardar").addEventListener("click", function () {
      var nombre = $("#ig-n").value.trim();
      if (!nombre) { Util.toast("Ponle nombre al ingrediente"); return; }
      var num = function (sel) { var v = parseFloat($(sel).value.replace(",", ".")); return isNaN(v) ? 0 : v; };
      var res = {
        id: g.id || ("ing_" + Date.now().toString(36)),
        n: nombre, cat: $("#ig-cat").value, u: $("#ig-u").value,
        sal: num("#ig-sal"), k: num("#ig-k"), p: num("#ig-p"), g: num("#ig-g"), h: num("#ig-h")
      };
      var peso = parseFloat($("#ig-peso").value);
      if (res.u === "ud" && peso > 0) res.pesoUd = peso;
      if ($("#ig-basico").checked) res.basico = true;
      if (g.nota) res.nota = g.nota;
      if (g.compra) res.compra = g.compra;

      var idx = -1;
      Almacen.estado.ingredientes.forEach(function (x, i) { if (x.id === res.id) idx = i; });
      if (idx >= 0) Almacen.estado.ingredientes[idx] = res;
      else Almacen.estado.ingredientes.push(res);
      Almacen.guardar("ingrediente");
      cerrarModal();
      pintarDespensa(); pintarMenu();
      Util.toast("Ingrediente guardado");
    });
  }

  /* ==================== VISTA: RECETAS ==================== */
  function pintarRecetas() {
    var f = UI.filtros;
    var lista = Almacen.estado.recetas.filter(function (r) {
      if (f.toma && (r.tipo || []).indexOf(f.toma) < 0) return false;
      if (f.grupo && r.grupo !== f.grupo) return false;
      if (f.tool && (r.tools || []).indexOf(f.tool) < 0) return false;
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
               (r.tools || []).map(function (t) { return '<span class="etiqueta">' + esc(NOMBRE_TOOL[t] || t) + '</span>'; }).join("") +
             '</div></div>';
    }).join("") || '<div class="vacio">No hay recetas con esos filtros.</div>';
  }

  /* ==================== VISTA: COMPRA ==================== */
  var compraActual = null;

  function pintarCompra() {
    var datos = Almacen.generarCompra(UI.lunes, 7);
    compraActual = datos;
    var pers = Almacen.estado.config.personas || 1;
    $("#compra-rango").textContent = esMovil()
      ? "Semana " + Util.etiquetaRangoCorto(UI.lunes)
      : "Semana del " + Util.etiquetaRango(UI.lunes);
    $("#compra-personas").textContent = pers === 1 ? "1 persona" : pers + " personas";

    var totalLineas = 0, pendientes = 0;
    datos.secciones.forEach(function (s) {
      s.lineas.forEach(function (l) { totalLineas++; if (!l.enCasa && !l.marcado) pendientes++; });
    });

    if (!totalLineas) {
      $("#compra-resumen").textContent = "Esta semana no tiene menú todavía. Aplica la Semana A o B en la pestaña Menú.";
      $("#lista-compra").innerHTML = "";
      return;
    }
    $("#compra-resumen").textContent = "Quedan " + pendientes + " productos por comprar de " + totalLineas + ".";

    var visible = function (l) { return UI.ocultarComprados ? (!l.marcado && !l.enCasa) : true; };
    var html = "";
    datos.secciones.forEach(function (s) {
      var lineas = s.lineas.filter(visible);
      if (!lineas.length) return;
      html += '<div class="seccion-compra"><h3>' + esc(s.nombre) + '</h3>';
      lineas.forEach(function (l) { html += lineaCompraHTML(l); });
      html += '</div>';
    });
    var basicos = datos.basicos.filter(visible);
    if (basicos.length) {
      html += '<div class="seccion-compra"><h3>Revisa la despensa (básicos)</h3>';
      basicos.forEach(function (l) { html += lineaCompraHTML(l, true); });
      html += '</div>';
    }
    if (!html) html = '<div class="vacio">Todo comprado. Buen trabajo.</div>';
    $("#lista-compra").innerHTML = html;
    $("#compra-ocultar").textContent = UI.ocultarComprados ? "Ver todo" : "Ocultar comprados";
  }

  function lineaCompraHTML(l, basico) {
    var clases = "linea" + (l.marcado ? " hecha" : "") + (l.enCasa ? " en-casa" : "");
    return '<div class="' + clases + '">' +
      '<input type="checkbox" data-marcar="' + esc(l.id) + '"' + (l.marcado ? " checked" : "") + ' title="Marcar como comprado">' +
      '<div class="datos"><div class="nombre">' + esc(l.nombre) + (l.enCasa ? ' <span class="etiqueta">ya en casa</span>' : '') + '</div>' +
      '<div class="detalle">' + esc(l.recetas.slice(0, 3).join(" · ")) + (l.recetas.length > 3 ? " …" : "") +
      (l.nota ? ' — ' + esc(l.nota) : '') + '</div></div>' +
      '<span class="cant">' + esc(l.texto) + '</span>' +
      '<button class="btn mini" data-encasa="' + esc(l.id) + '">' + (l.enCasa ? "Comprar" : "Lo tengo") + '</button>' +
      '</div>';
  }

  function textoCompra(soloPendientes) {
    if (!compraActual) return "";
    var out = "LISTA DE LA COMPRA — semana del " + Util.etiquetaRango(UI.lunes) +
              " (" + (Almacen.estado.config.personas || 1) + " personas)\n\n";
    compraActual.secciones.forEach(function (s) {
      var lineas = s.lineas.filter(function (l) { return soloPendientes ? (!l.enCasa && !l.marcado) : true; });
      if (!lineas.length) return;
      out += s.nombre.toUpperCase() + "\n";
      lineas.forEach(function (l) { out += "  - " + l.nombre + ": " + l.texto + "\n"; });
      out += "\n";
    });
    var bas = compraActual.basicos.filter(function (l) { return soloPendientes ? (!l.enCasa && !l.marcado) : true; });
    if (bas.length) {
      out += "REVISAR DESPENSA\n";
      bas.forEach(function (l) { out += "  - " + l.nombre + ": " + l.texto + "\n"; });
    }
    return out;
  }

  /* ==================== VISTA: DESPENSA ==================== */
  function pintarDespensa() {
    var q = UI.busquedaDespensa.toLowerCase();
    var lista = Almacen.estado.ingredientes.filter(function (i) {
      return !q || i.n.toLowerCase().indexOf(q) >= 0;
    });
    lista.sort(function (a, b) {
      if (a.cat !== b.cat) return a.cat.localeCompare(b.cat);
      return a.n.localeCompare(b.n);
    });
    var html = "", catActual = "";
    lista.forEach(function (i) {
      if (i.cat !== catActual) {
        if (catActual) html += '</div>';
        html += '<h3 style="grid-column:1/-1; margin:10px 0 2px; font-size:.8rem; color:var(--gris); text-transform:uppercase">' + esc(i.cat) + '</h3><div style="display:contents">';
        catActual = i.cat;
      }
      var tengo = !!Almacen.estado.despensa[i.id];
      html += '<div class="linea' + (tengo ? " en-casa" : "") + '">' +
              '<input type="checkbox" data-despensa="' + esc(i.id) + '"' + (tengo ? " checked" : "") + '>' +
              '<div class="datos"><div class="nombre">' + esc(i.n) + '</div>' +
              '<div class="detalle">' + Math.round(i.k || 0) + ' kcal · ' + (i.p || 0) + ' g prot. · ' +
              Util.sal(i.sal) + ' sal — por 100 ' + (i.u === "ml" ? "ml" : "g") + '</div></div>' +
              '<button class="btn mini solo-edicion" data-editaring="' + esc(i.id) + '">Valores</button></div>';
    });
    if (catActual) html += '</div>';
    $("#rejilla-despensa").innerHTML = html || '<div class="vacio">Sin resultados.</div>';
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
    $("#gh-usuario").value = c.github.usuario || "";
    $("#gh-repo").value = c.github.repo || "";
    $("#gh-rama").value = c.github.rama || "main";
    $("#gh-token").value = c.github.token || "";
  }

  /* ==================== NAVEGACIÓN ==================== */
  function mostrar(vista) {
    UI.vista = vista;
    $$(".vista").forEach(function (v) { v.classList.toggle("activa", v.id === "vista-" + vista); });
    $$("#pestanas button").forEach(function (b) { b.classList.toggle("activa", b.getAttribute("data-vista") === vista); });
    if (vista === "menu") pintarMenu();
    if (vista === "recetas") pintarRecetas();
    if (vista === "compra") pintarCompra();
    if (vista === "despensa") pintarDespensa();
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

    $("#importar-garmin").addEventListener("click", function () { $("#fichero-garmin").click(); });
    $("#fichero-garmin").addEventListener("change", function (e) {
      if (e.target.files && e.target.files.length) importarGarmin(e.target.files);
      e.target.value = "";
    });

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
      if (confirm("¿Vaciar el menú de esta semana?")) { Almacen.vaciarSemana(UI.lunes); pintarMenu(); }
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

    $("#rejilla-dias").addEventListener("click", function (e) {
      var add = e.target.closest("[data-anadir]");
      if (add) { var p = add.getAttribute("data-anadir").split("|"); abrirSelector(p[0], p[1]); return; }
      var act = e.target.closest("[data-actividad]");
      if (act) { abrirSelectorActividad(act.getAttribute("data-actividad")); return; }
      var qact = e.target.closest("[data-quitaract]");
      if (qact) {
        var q2 = qact.getAttribute("data-quitaract").split("|");
        Almacen.quitarActividad(q2[0], +q2[1]);
        pintarMenu();
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
        if (dia && dia[q[1]]) { dia[q[1]].splice(+q[2], 1); Almacen.guardar("plato"); pintarMenu(); }
        return;
      }
      var ficha = e.target.closest("[data-ficha]");
      if (ficha) abrirFicha(ficha.getAttribute("data-ficha"));
    });

    /* --- recetas --- */
    $("#buscar-receta").addEventListener("input", function (e) { UI.filtros.texto = e.target.value; pintarRecetas(); });
    $("#filtro-toma").addEventListener("change", function (e) { UI.filtros.toma = e.target.value; pintarRecetas(); });
    $("#filtro-grupo").addEventListener("change", function (e) { UI.filtros.grupo = e.target.value; pintarRecetas(); });
    $("#filtro-tool").addEventListener("change", function (e) { UI.filtros.tool = e.target.value; pintarRecetas(); });
    $("#nueva-receta").addEventListener("click", function () { abrirEditor(null); });
    $("#rejilla-recetas").addEventListener("click", function (e) {
      var c = e.target.closest("[data-ficha]");
      if (c) abrirFicha(c.getAttribute("data-ficha"));
    });

    /* --- modal --- */
    $("#modal").addEventListener("click", function (e) {
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
    $("#compra-recalcular").addEventListener("click", pintarCompra);
    $("#compra-ocultar").addEventListener("click", function () { UI.ocultarComprados = !UI.ocultarComprados; pintarCompra(); });
    $("#lista-compra").addEventListener("click", function (e) {
      var enc = e.target.closest("[data-encasa]");
      if (enc) {
        var id = enc.getAttribute("data-encasa");
        if (Almacen.estado.despensa[id]) delete Almacen.estado.despensa[id];
        else Almacen.estado.despensa[id] = true;
        Almacen.guardar("despensa"); pintarCompra();
      }
    });
    $("#lista-compra").addEventListener("change", function (e) {
      var m = e.target.closest("[data-marcar]");
      if (m) {
        var id = m.getAttribute("data-marcar");
        if (m.checked) Almacen.estado.compraMarcada[id] = true; else delete Almacen.estado.compraMarcada[id];
        Almacen.guardar("compra"); pintarCompra();
      }
    });
    $("#compra-copiar").addEventListener("click", function () {
      var texto = textoCompra(true);
      if (navigator.clipboard) navigator.clipboard.writeText(texto).then(function () { Util.toast("Lista copiada"); });
      else Util.toast("Copia manualmente desde «Preparar compra»");
    });
    $("#compra-para-claude").addEventListener("click", function () {
      var texto = "Claude, haz esta compra en Amazon por mí.\n\n" + textoCompra(true);
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
    $("#buscar-despensa").addEventListener("input", function (e) { UI.busquedaDespensa = e.target.value; pintarDespensa(); });
    $("#despensa-vaciar").addEventListener("click", function () {
      if (!confirm("¿Desmarcar todo lo que tienes en casa?")) return;
      Almacen.estado.despensa = {}; Almacen.guardar("despensa"); pintarDespensa();
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
      c.avisoSal = parseFloat($("#cfg-aviso").value) || 1.5;
      c.limiteSal = parseFloat($("#cfg-limite").value) || 2.0;
      c.objetivoKcal = parseInt($("#cfg-kcal").value, 10) || 2000;
      c.objetivoProt = parseInt($("#cfg-prot").value, 10) || 90;
      c.margenKcal = parseInt($("#cfg-margen").value, 10);
      if (isNaN(c.margenKcal)) c.margenKcal = 10;
      Almacen.guardar("config");
      Util.toast("Ajustes guardados");
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
