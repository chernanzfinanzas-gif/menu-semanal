/* entrenamiento.js — pestaña «Entrenamiento» y su primer bloque, «El Plan».
   Se monta sola: crea su pestaña, su vista y sus estilos, para no tocar más que
   una línea de index.html. Lee datos/plan.js y guarda en el estado normal de la
   app (Almacen), así viaja con la sincronización de GitHub.

   Dos niveles:
     Entrenamiento → índice de bloques (botones con logo)
     El Plan       → la semana con sus casillas, con «‹ Entrenamiento» para volver
   18-sep-2026. */
(function (global) {
  "use strict";

  var U = global.Util, A = global.Almacen, P = global.DATOS_PLAN;
  var DIA_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var DIA_CORTO = ["D", "L", "M", "X", "J", "V", "S"];
  var MIN_SESION = 20;      // minutos a partir de los cuales el reloj marca el día como hecho
  var bloque = "portada";   // "portada" | "plan"

  var BLOQUES = [
    { id: "plan", nombre: "El Plan", img: "iconos/khb/3-pesas-corredor.webp",
      pie: "Lo que toca hoy, con sus casillas, y la semana entera a la vista.", listo: true },
    { id: "actividad", nombre: "Actividad", img: "iconos/khb/6-zapatillas.webp",
      pie: "Qué he hecho: carga de la semana frente al objetivo, horas y kilómetros.", listo: false },
    { id: "evolucion", nombre: "Evolución", img: "iconos/khb/1-arbol-pulso.webp",
      pie: "Cómo voy: peso y cintura, VFC, pulso en reposo, sueño y vatios por kilo.", listo: false },
    { id: "casos", nombre: "Casos", img: "iconos/khb/9-podio.webp",
      pie: "Qué pasó aquella vez: los episodios medidos, uno a uno.", listo: false }
  ];

  /* ==================== ESTILOS ==================== */

  function inyectarEstilos() {
    if (document.getElementById("estilos-entreno")) return;
    var s = document.createElement("style");
    s.id = "estilos-entreno";
    s.textContent = [
      ":root{--azul:#2f5c8a;--azul-hondo:#133253;--azul-claro:#eaf0f6;--azul-borde:#cfdcea}",
      /* la pestaña: azul siempre, más fuerte cuando está abierta */
      '#pestanas [data-vista="entreno"]{color:#7d9cbb}',
      '#pestanas [data-vista="entreno"].activa{color:var(--azul);border-bottom-color:var(--azul)}',
      '#pestanas [data-vista="entreno"] .corta{display:none}',
      "@media(max-width:767px){",
      '  #pestanas [data-vista="entreno"].activa{border-top-color:var(--azul)}',
      '  #pestanas [data-vista="entreno"] .larga{display:none}',
      '  #pestanas [data-vista="entreno"] .corta{display:inline}',
      "}",
      /* mientras estás dentro, la sección entera se viste de azul */
      "body.en-entreno header.barra{background:var(--azul-hondo)}",
      "body.en-entreno nav.pestanas button.activa{color:var(--azul);border-bottom-color:var(--azul)}",
      "@media(max-width:767px){body.en-entreno nav.pestanas button.activa{border-top-color:var(--azul)}}",
      "#vista-entreno .tarjeta{border-top:3px solid var(--azul)}",
      "#vista-entreno h2{color:var(--azul-hondo)}",
      /* índice de bloques */
      ".ent-bloques{display:grid;grid-template-columns:1fr;gap:10px}",
      "@media(min-width:620px){.ent-bloques{grid-template-columns:1fr 1fr}}",
      ".ent-bloque{display:flex;gap:15px;align-items:center;text-align:left;width:100%;font:inherit;color:inherit;",
      "  cursor:pointer;padding:16px;border-radius:14px;border:1px solid var(--azul-borde);",
      "  background:linear-gradient(180deg,#fff 0%,#eef3f8 100%);",
      "  box-shadow:inset 0 1px 0 #fff, 0 6px 0 -2px #d7e2ee, 0 12px 20px rgba(19,50,83,.15);",
      "  transform:translateY(0);transition:transform .12s ease, box-shadow .12s ease}",
      ".ent-bloque:hover{transform:translateY(-2px);",
      "  box-shadow:inset 0 1px 0 #fff, 0 8px 0 -2px #d7e2ee, 0 16px 26px rgba(19,50,83,.2)}",
      ".ent-bloque:active{transform:translateY(4px);",
      "  box-shadow:inset 0 1px 0 #fff, 0 2px 0 -1px #d7e2ee, 0 4px 9px rgba(19,50,83,.18)}",
      ".ent-bloque:focus-visible{outline:2px solid var(--azul);outline-offset:3px}",
      ".ent-bloque img{width:60px;height:60px;flex:none;border-radius:12px;background:#fff;",
      "  box-shadow:0 1px 3px rgba(19,50,83,.18)}",
      ".ent-bloque .n{font-size:1.12rem;font-weight:700;color:var(--azul-hondo);display:block;",
      "  text-shadow:0 1px 0 rgba(255,255,255,.9)}",
      ".ent-bloque small{color:var(--gris);display:block;margin-top:3px;line-height:1.35}",
      ".ent-bloque.pendiente{cursor:default;opacity:.55;border-color:var(--borde);",
      "  background:var(--gris-claro);box-shadow:inset 0 1px 0 #fff, 0 2px 0 -1px var(--borde);transform:none}",
      "@media(prefers-reduced-motion:reduce){.ent-bloque{transition:none}.ent-bloque:hover{transform:none}}",
      ".ent-pronto{font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;color:var(--gris);",
      "  border:1px solid var(--borde);border-radius:999px;padding:1px 7px;margin-left:6px;vertical-align:1px}",
      /* volver */
      ".ent-volver{background:none;border:0;color:var(--azul);font:inherit;font-weight:600;",
      "  padding:4px 0;margin-bottom:8px;cursor:pointer}",
      /* cabecera del plan */
      ".ent-cab{display:flex;gap:14px;align-items:center;flex-wrap:wrap}",
      ".ent-cab img{width:64px;height:64px;flex:none;border-radius:10px;background:#fff}",
      ".ent-cab .centro{flex:1 1 180px;min-width:0}",
      ".ent-cab h2{margin:2px 0 4px}",
      ".ent-etq{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--azul);font-weight:700}",
      ".ent-racha{flex:none;text-align:center;background:var(--azul-claro);border:1px solid var(--azul-borde);",
      "  border-radius:var(--radio);padding:10px 16px;min-width:92px}",
      ".ent-racha b{display:block;font-size:1.7rem;line-height:1;color:var(--azul-hondo)}",
      ".ent-racha span{font-size:.72rem;color:var(--gris)}",
      /* casillas */
      ".ent-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}",
      ".ent-item{display:flex;gap:12px;align-items:flex-start;padding:11px 4px;border-bottom:1px solid var(--borde);cursor:pointer}",
      ".ent-lista li:last-child .ent-item{border-bottom:0}",
      ".ent-item input{width:24px;height:24px;flex:none;margin-top:1px;accent-color:var(--azul)}",
      ".ent-item .txt{min-width:0}",
      ".ent-item b{font-weight:600;display:block}",
      ".ent-item small{color:var(--gris);display:block;margin-top:2px;line-height:1.35}",
      ".ent-item.hecho b{text-decoration:line-through;color:var(--gris)}",
      ".ent-sello{display:inline-block;font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;",
      "  color:var(--azul);border:1px solid var(--azul-borde);background:var(--azul-claro);",
      "  border-radius:999px;padding:1px 7px;margin-left:6px;vertical-align:1px}",
      ".ent-sello.tarea{color:var(--ambar);border-color:#eccf9a;background:var(--ambar-fondo)}",
      /* medidas */
      ".ent-medidas{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}",
      ".ent-medida{flex:1 1 120px;min-width:110px}",
      ".ent-medida span{display:block;font-size:.76rem;color:var(--gris);margin-bottom:3px}",
      ".ent-medida input{width:100%;padding:9px 10px;border:1px solid var(--borde);border-radius:10px;font:inherit}",
      ".ent-medida input:focus{outline:2px solid var(--azul);outline-offset:1px;border-color:var(--azul)}",
      ".ent-medida.puesta input{border-color:var(--azul);background:var(--azul-claro)}",
      /* semana */
      ".ent-semana{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}",
      ".ent-dia{background:var(--gris-claro);border:1px solid var(--borde);border-radius:10px;padding:7px 4px;",
      "  text-align:center;min-height:86px;display:flex;flex-direction:column;gap:3px;align-items:center}",
      ".ent-dia.hoy{border-color:var(--azul);background:var(--azul-claro);box-shadow:inset 0 -3px 0 var(--azul)}",
      ".ent-dia .d{font-weight:700;font-size:.8rem;color:var(--azul-hondo)}",
      ".ent-dia .f{font-size:.66rem;color:var(--gris)}",
      ".ent-dia .q{font-size:.64rem;color:var(--gris);line-height:1.25;overflow-wrap:anywhere}",
      ".ent-dia .p{width:9px;height:9px;border-radius:50%;background:var(--borde);margin-top:auto;flex:none}",
      ".ent-dia.ok .p{background:var(--azul)}",
      ".ent-talla{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}",
      ".ent-talla select{padding:7px 9px;border:1px solid var(--borde);border-radius:10px;font:inherit}",
      "@media(max-width:520px){.ent-semana{grid-template-columns:repeat(4,1fr)}.ent-cab img{width:52px;height:52px}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  /* ==================== ESTRUCTURA ==================== */

  var ICONO = '<svg class="ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/></svg>';

  function inyectarHtml() {
    var nav = document.getElementById("pestanas");
    if (nav && !nav.querySelector('[data-vista="entreno"]')) {
      var b = document.createElement("button");
      b.setAttribute("data-vista", "entreno");
      b.innerHTML = ICONO + '<span class="larga">Entrenamiento</span><span class="corta">Entreno</span>';
      nav.insertBefore(b, nav.querySelector('[data-vista="ajustes"]') || null);
    }
    if (!document.getElementById("vista-entreno")) {
      var sec = document.createElement("section");
      sec.className = "vista";
      sec.id = "vista-entreno";
      (document.querySelector("main") || document.body).appendChild(sec);
    }
  }

  /* ==================== ESTADO ==================== */

  function ent() {
    var e = A.estado;
    if (!e.entreno) e.entreno = { v: 1, checks: {}, medidas: {}, talla: {} };
    if (!e.entreno.checks) e.entreno.checks = {};
    if (!e.entreno.medidas) e.entreno.medidas = {};
    if (!e.entreno.talla) e.entreno.talla = {};
    return e.entreno;
  }

  function marcado(iso, id) { var d = ent().checks[iso]; return !!(d && d[id]); }

  function marcar(iso, id, valor) {
    var c = ent().checks;
    if (!c[iso]) c[iso] = {};
    if (valor) c[iso][id] = true; else delete c[iso][id];
    if (!Object.keys(c[iso]).length) delete c[iso];
    A.guardar("entreno");
  }

  function medida(iso, id) { var d = ent().medidas[iso]; return d ? d[id] : null; }

  function anotarMedida(iso, id, valor) {
    if (id === "peso") {
      if (valor === "" || valor == null) return;
      A.anotarPeso(iso, parseFloat(valor));
      return;
    }
    var m = ent().medidas;
    if (!m[iso]) m[iso] = {};
    if (valor === "" || valor == null) delete m[iso][id]; else m[iso][id] = valor;
    if (m[iso] && !Object.keys(m[iso]).length) delete m[iso];
    A.guardar("entreno");
  }

  function pesoDe(iso) {
    var l = A.estado.pesos || [];
    for (var i = 0; i < l.length; i++) if (l[i].f === iso) return l[i].kg;
    return null;
  }

  /* ==================== EL PLAN: CÁLCULO ==================== */

  function diasEntre(a, b) { return Math.round((U.desdeISO(b) - U.desdeISO(a)) / 86400000); }

  function semanaDe(iso) {
    for (var i = 0; i < P.rampa.length; i++) {
      var r = P.rampa[i];
      if (iso >= r.desde && iso <= r.hasta) {
        if (r.n < 13) return r;
        var sem = Math.floor(diasEntre(r.desde, U.lunesDe(iso)) / 7);   // crucero: 3 semanas y la 4ª de descarga
        var descarga = (sem % 4) === 3;
        return {
          n: 13 + sem, desde: U.lunesDe(iso), hasta: U.sumarDias(U.lunesDe(iso), 6),
          carga: descarga ? Math.round(r.carga * 0.65) : r.carga,
          talla: descarga ? "B" : "A", nota: descarga ? "Descarga" : r.nota
        };
      }
    }
    return null;
  }

  function tallaDe(sem) { return ent().talla[sem.desde] || sem.talla; }

  function textoDiaGrande(sem) {
    var lista = (sem.n % 2) ? P.diaGrande.montana : P.diaGrande.bici;
    for (var i = 0; i < lista.length; i++) if (sem.n <= lista[i].hasta) return lista[i].texto;
    return lista[lista.length - 1].texto;
  }

  function sesionesDe(iso, sem, talla) {
    var pl = P.plantillas[talla];
    if (!pl) return [];
    return (pl.dias[U.desdeISO(iso).getDay()] || []).map(function (s) {
      if (s.t === "DIA_GRANDE") return { t: textoDiaGrande(sem), min: 0, grande: true };
      return { t: s.t, min: s.min };
    });
  }

  function hechoPorElReloj(iso) {
    var lista = (A.estado.actividad || {})[iso];
    if (!lista || !lista.length) return false;
    var min = 0;
    lista.forEach(function (a) { min += (a.min || 0); });
    return min >= MIN_SESION;
  }

  function diaCumplido(iso, sem, talla) {
    var ses = sesionesDe(iso, sem, talla);
    if (!ses.length) return true;                 // descanso: el día cuenta
    if (hechoPorElReloj(iso)) return true;
    for (var i = 0; i < ses.length; i++) if (marcado(iso, "s" + i)) return true;
    return false;
  }

  function racha() {
    var n = 0, iso = U.hoyISO();
    for (var i = 0; i < 400; i++) {
      var sem = semanaDe(iso);
      if (!sem) break;
      if (diaCumplido(iso, sem, tallaDe(sem))) n++;
      else if (i > 0) break;                      // hoy sin cumplir aún no rompe la racha
      iso = U.sumarDias(iso, -1);
    }
    return n;
  }

  function tocaMedida(m, iso) {
    var d = U.desdeISO(iso);
    if (m.diaDelMes) return d.getDate() === m.diaDelMes;
    if (m.diariaHasta) return iso <= m.diariaHasta || (m.diasDespues || []).indexOf(d.getDay()) >= 0;
    return (m.dias || []).indexOf(d.getDay()) >= 0;
  }

  function marcadaAlgunDia(id) {
    var c = ent().checks;
    for (var f in c) if (c[f][id]) return true;
    return false;
  }

  function tareasDelDia(iso) {
    var fuera = [];
    (P.tratamientos || []).forEach(function (t) {
      if (iso >= t.desde && iso <= t.hasta) fuera.push({ id: "tr_" + t.id, nombre: t.nombre, ayuda: t.ayuda, sello: "pauta" });
    });
    (P.tareas || []).forEach(function (t) {
      if (marcadaAlgunDia("tk_" + t.id)) return;
      var vencida = iso > t.limite;
      fuera.push({
        id: "tk_" + t.id, nombre: t.nombre, sello: "tarea", claseSello: "tarea",
        ayuda: (vencida ? "Se pasó del " : "Antes del ") + U.etiquetaFecha(t.limite) + ". " + (t.ayuda || "")
      });
    });
    return fuera;
  }

  /* ==================== PINTAR ==================== */

  /* la barra de arriba y la pestaña activa se tiñen de azul mientras estás dentro */
  function vestir(dentro) {
    document.body.classList.toggle("en-entreno", !!dentro);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      if (dentro) {
        if (!meta.getAttribute("data-antes")) meta.setAttribute("data-antes", meta.getAttribute("content") || "");
        meta.setAttribute("content", "#133253");
      } else if (meta.getAttribute("data-antes")) {
        meta.setAttribute("content", meta.getAttribute("data-antes"));
      }
    }
  }

  function pintar() {
    var cont = document.getElementById("vista-entreno");
    if (!cont || !A.estado) return;
    vestir(cont.classList.contains("activa"));
    cont.innerHTML = (bloque === "plan") ? htmlPlan() : htmlPortada();
    window.scrollTo(0, 0);
  }

  function htmlPortada() {
    var hoy = U.hoyISO(), sem = semanaDe(hoy), resumen;
    if (sem) {
      var talla = tallaDe(sem), ses = sesionesDe(hoy, sem, talla);
      resumen = ses.length
        ? "Hoy toca: " + ses.map(function (s) { return s.t + (s.min ? " " + s.min + "'" : ""); }).join(" · ")
        : P.textos.sinSesion;
      resumen = "Semana " + sem.n + " · " + resumen;
    } else {
      resumen = P.textos.fueraDePlan;
    }

    var h = '<div class="tarjeta">' +
      "<h2>Entrenamiento</h2>" +
      '<p class="nota-peque">' + U.esc(resumen) + "</p></div>" +
      '<div class="ent-bloques">';

    BLOQUES.forEach(function (b) {
      h += '<button type="button" class="ent-bloque' + (b.listo ? "" : " pendiente") + '"' +
        (b.listo ? ' data-bloque="' + b.id + '"' : " disabled") + ">" +
        '<img src="' + b.img + '" alt="" onerror="this.style.display=\'none\'">' +
        '<span class="txt"><span class="n">' + U.esc(b.nombre) +
          (b.listo ? "" : '<span class="ent-pronto">en preparación</span>') + "</span>" +
        "<small>" + U.esc(b.pie) + "</small></span></button>";
    });

    return h + "</div>";
  }

  function htmlPlan() {
    var hoy = U.hoyISO(), sem = semanaDe(hoy);
    var volver = '<button type="button" class="ent-volver" data-volver="1">‹ Entrenamiento</button>';

    if (!sem) {
      return volver + '<div class="tarjeta"><h2>El Plan</h2><p class="nota-peque">' +
        U.esc(P.textos.fueraDePlan) + "</p></div>";
    }

    var talla = tallaDe(sem), pl = P.plantillas[talla];
    var img = (sem.n % 2) ? P.diaGrande.imagenes.montana : P.diaGrande.imagenes.bici;
    var h = volver;

    /* cabecera */
    h += '<div class="tarjeta ent-cab">' +
      '<img src="' + img + '" alt="" onerror="this.style.display=\'none\'">' +
      '<div class="centro"><span class="ent-etq">Semana ' + sem.n + " · " + U.esc(pl.nombre) + "</span>" +
      "<h2>El Plan</h2>" +
      '<p class="nota-peque">' + U.etiquetaFecha(sem.desde) + " – " + U.etiquetaFecha(sem.hasta) +
        " · carga objetivo <b>" + sem.carga + "</b>" + (sem.nota ? " · " + U.esc(sem.nota) : "") + "</p></div>" +
      '<div class="ent-racha"><b>' + racha() + "</b><span>días seguidos</span></div></div>";

    /* hoy */
    var d = U.desdeISO(hoy);
    h += '<div class="tarjeta"><h2>Hoy, ' + DIA_LARGO[d.getDay()] + " " + U.etiquetaFecha(hoy) + "</h2>";

    var ses = sesionesDe(hoy, sem, talla), auto = hechoPorElReloj(hoy), filas = [];
    ses.forEach(function (s, i) {
      var id = "s" + i, manual = marcado(hoy, id);
      filas.push({
        id: id, nombre: s.t + (s.min ? " · " + s.min + " min" : ""), hecho: manual || auto,
        ayuda: s.grande ? P.diaGrande.aviso : (auto && !manual ? "Marcada con la sesión que llegó del reloj." : P.textos.auto),
        sello: auto ? "reloj" : ""
      });
    });
    tareasDelDia(hoy).forEach(function (t) {
      filas.push({ id: t.id, nombre: t.nombre, ayuda: t.ayuda, hecho: marcado(hoy, t.id),
        sello: t.sello, claseSello: t.claseSello });
    });

    if (!filas.length) {
      h += '<p class="nota-peque">' + U.esc(P.textos.sinSesion) + "</p>";
    } else {
      h += '<ul class="ent-lista">';
      filas.forEach(function (f) {
        h += '<li><label class="ent-item' + (f.hecho ? " hecho" : "") + '">' +
          '<input type="checkbox" data-check="' + f.id + '"' + (f.hecho ? " checked" : "") + ">" +
          '<span class="txt"><b>' + U.esc(f.nombre) +
            (f.sello ? '<span class="ent-sello ' + (f.claseSello || "") + '">' + U.esc(f.sello) + "</span>" : "") +
          "</b>" + (f.ayuda ? "<small>" + U.esc(f.ayuda) + "</small>" : "") + "</span></label></li>";
      });
      h += "</ul>";
    }

    /* medidas del día */
    var medHoy = P.medidas.filter(function (m) { return tocaMedida(m, hoy); });
    if (medHoy.length) {
      h += '<div class="ent-medidas">';
      medHoy.forEach(function (m) {
        var v = (m.id === "peso") ? pesoDe(hoy) : medida(hoy, m.id);
        var puesta = (v !== null && v !== undefined && v !== "");
        h += '<label class="ent-medida' + (puesta ? " puesta" : "") + '" title="' + U.esc(m.ayuda) + '">' +
          "<span>" + U.esc(m.nombre) + " (" + m.unidad + ")</span>" +
          (m.texto
            ? '<input type="text" inputmode="numeric" placeholder="128/82" data-medida="' + m.id + '" value="' + U.esc(puesta ? v : "") + '">'
            : '<input type="number" step="' + m.paso + '" min="' + m.min + '" max="' + m.max +
              '" data-medida="' + m.id + '" value="' + (puesta ? v : "") + '">') + "</label>";
      });
      h += "</div>";
      medHoy.forEach(function (m) {
        h += '<p class="nota-peque" style="margin-top:8px"><b>' + U.esc(m.nombre) + ":</b> " + U.esc(m.ayuda) + "</p>";
      });
    }

    /* talla de la semana */
    h += '<div class="ent-talla"><span class="nota-peque">Esta semana va como</span><select id="ent-talla">';
    ["R", "A", "B", "S"].forEach(function (k) {
      h += '<option value="' + k + '"' + (k === talla ? " selected" : "") + ">" + U.esc(P.plantillas[k].nombre) + "</option>";
    });
    h += "</select></div>";
    h += '<p class="nota-peque" style="margin-top:6px">' + U.esc(pl.pie) + "</p></div>";

    /* la semana */
    h += '<div class="tarjeta"><h2>La semana</h2><div class="ent-semana">';
    var lunes = U.lunesDe(hoy);
    for (var i = 0; i < 7; i++) {
      var f = U.sumarDias(lunes, i), fd = U.desdeISO(f), semF = semanaDe(f);
      var ss = semF ? sesionesDe(f, semF, tallaDe(semF)) : [];
      var ok = semF && f <= hoy && ss.length && diaCumplido(f, semF, tallaDe(semF));
      h += '<div class="ent-dia' + (f === hoy ? " hoy" : "") + (ok ? " ok" : "") + '">' +
        '<span class="d">' + DIA_CORTO[fd.getDay()] + '</span><span class="f">' + fd.getDate() + "</span>" +
        '<span class="q">' + (!semF ? "—" : (ss.length
          ? U.esc(ss.map(function (s) { return s.t.split(":")[0].split(",")[0]; }).join(" · "))
          : "descanso")) + "</span><span class=\"p\"></span></div>";
    }
    h += "</div>";
    h += '<p class="nota-peque" style="margin-top:10px">' + U.esc(P.suelo) +
      " El fin de semana, un solo día grande: " + U.esc(textoDiaGrande(sem).toLowerCase()) + ". El otro, descanso.</p></div>";

    return h;
  }

  /* ==================== EVENTOS ==================== */

  function conectar() {
    var cont = document.getElementById("vista-entreno");

    cont.addEventListener("click", function (e) {
      var t = e.target;
      var volver = t.closest ? t.closest("[data-volver]") : null;
      if (volver) { bloque = "portada"; pintar(); return; }
      var b = t.closest ? t.closest("[data-bloque]") : null;
      if (b) { bloque = b.getAttribute("data-bloque"); pintar(); }
    });

    cont.addEventListener("change", function (e) {
      var hoy = U.hoyISO(), t = e.target;
      if (t.getAttribute("data-check")) { marcar(hoy, t.getAttribute("data-check"), t.checked); pintar(); return; }
      if (t.getAttribute("data-medida")) {
        anotarMedida(hoy, t.getAttribute("data-medida"), String(t.value).trim());
        U.toast("Anotado");
        pintar();
        return;
      }
      if (t.id === "ent-talla") {
        var sem = semanaDe(hoy);
        if (sem) { ent().talla[sem.desde] = t.value; A.guardar("entreno"); pintar(); }
      }
    });

    var nav = document.getElementById("pestanas");
    if (nav) nav.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-vista]") : null;
      if (!b) return;
      var mia = b.getAttribute("data-vista") === "entreno";
      vestir(mia);
      if (mia) pintar();
    });

    if (A.suscribir) A.suscribir(function (motivo) {
      if (motivo === "entreno") return;                       // ya repintamos nosotros
      var v = document.getElementById("vista-entreno");
      if (v && v.classList.contains("activa")) pintar();
    });
  }

  /* ==================== ARRANQUE ==================== */

  function arrancar() {
    if (!U || !A || !P) return;
    if (!A.estado) { setTimeout(arrancar, 80); return; }      // esperamos a que app.js inicie el almacén
    inyectarEstilos();
    inyectarHtml();
    conectar();
    pintar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();

})(window);
