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
  var diaSel = null;        // día abierto en la tarjeta; null = hoy
  var lunesVista = null;    // lunes de la semana que se enseña abajo; null = la de hoy

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
      /* volver a Entrenamiento: botón grande */
      ".ent-atras{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;",
      "  margin:0 0 14px;padding:15px 16px;border:0;border-radius:14px;cursor:pointer;",
      "  font:inherit;font-size:1.02rem;font-weight:700;color:#fff;letter-spacing:.01em;",
      "  background:linear-gradient(180deg,#39699a 0%,var(--azul-hondo) 100%);",
      "  box-shadow:inset 0 1px 0 rgba(255,255,255,.28), 0 5px 0 -1px #0d2540, 0 12px 20px rgba(19,50,83,.28);",
      "  transition:transform .12s ease, box-shadow .12s ease}",
      ".ent-atras:hover{transform:translateY(-1px);",
      "  box-shadow:inset 0 1px 0 rgba(255,255,255,.28), 0 6px 0 -1px #0d2540, 0 14px 24px rgba(19,50,83,.32)}",
      ".ent-atras:active{transform:translateY(4px);",
      "  box-shadow:inset 0 1px 0 rgba(255,255,255,.2), 0 1px 0 -1px #0d2540, 0 3px 7px rgba(19,50,83,.3)}",
      ".ent-atras:focus-visible{outline:3px solid #7d9cbb;outline-offset:2px}",
      ".ent-atras svg{flex:none}",
      ".ent-atras.abajo{margin:4px 0 8px}",
      "@media(prefers-reduced-motion:reduce){.ent-atras{transition:none}.ent-atras:hover{transform:none}}",
      /* volver al día de hoy: enlace discreto */
      ".ent-volver{background:none;border:0;color:var(--azul);font:inherit;font-weight:600;",
      "  padding:4px 0;margin-bottom:8px;cursor:pointer}",
      /* la franja: semáforo y avisos, en ranuras distintas */
      ".ent-franja{display:flex;gap:8px;align-items:stretch;margin-bottom:12px}",
      /* más específico a propósito: esta media query va antes que la regla base de .ent-sem */
      "@media(max-width:520px){.ent-franja{flex-direction:column}.ent-franja .ent-sem{flex:none}}",
      ".ent-sem{flex:0 0 138px;background:var(--blanco);border:1px solid var(--borde);",
      "  border-left:4px solid var(--gris);border-radius:var(--radio);padding:11px 13px;",
      "  display:flex;flex-direction:column;gap:2px}",
      ".ent-sem b{font-size:1.05rem;color:var(--tinta)}",
      ".ent-sem.apagado b{color:var(--gris)}",
      ".ent-sem.ambar{border-left-color:var(--ambar);background:var(--ambar-fondo)}",
      ".ent-sem.ambar b{color:var(--ambar)}",
      ".ent-avisos{flex:1 1 200px;background:var(--blanco);border:1px solid var(--borde);",
      "  border-radius:var(--radio);padding:11px 13px;display:flex;flex-direction:column;gap:6px}",
      ".ent-franja .et{font-size:.68rem;letter-spacing:.09em;text-transform:uppercase;",
      "  color:var(--gris);font-weight:700}",
      ".ent-franja small{font-size:.78rem;color:var(--gris);line-height:1.35;display:block}",
      ".ent-franja small.ok{color:var(--gris)}",
      ".ent-aviso b{display:block;font-size:.85rem;color:var(--tinta);margin-top:2px}",
      ".ent-aviso .niv{display:inline-block;font-size:.64rem;font-weight:700;letter-spacing:.06em;",
      "  text-transform:uppercase;border-radius:999px;padding:1px 7px;",
      "  color:var(--azul);border:1px solid var(--azul-borde);background:var(--azul-claro)}",
      ".ent-aviso.atencion .niv{color:var(--ambar);border-color:#eccf9a;background:var(--ambar-fondo)}",
      ".ent-aviso.consulta .niv{color:var(--rojo);border-color:#e3b4ab;background:var(--rojo-fondo)}",
      ".ent-aviso + .ent-aviso{border-top:1px solid var(--borde);padding-top:6px}",
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
      /* rejilla: columnas fijas por ancho, para que las medidas queden repartidas
         en filas parejas y no ocho arriba y una sola abajo */
      ".ent-medidas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}",
      "@media(min-width:620px){.ent-medidas{grid-template-columns:repeat(3,minmax(0,1fr))}}",
      "@media(min-width:980px){.ent-medidas{grid-template-columns:repeat(5,minmax(0,1fr))}}",
      /* en columna: el rótulo crece hasta igualar al vecino más alto, así las
         cajas de la fila quedan alineadas aunque el texto ocupe dos líneas */
      ".ent-medida{display:flex;flex-direction:column;min-width:0;max-width:280px;width:100%}",
      ".ent-medida input{width:100%;padding:9px 10px;border:1px solid var(--borde);border-radius:10px;font:inherit}",
      ".ent-medida input:focus{outline:2px solid var(--azul);outline-offset:1px;border-color:var(--azul)}",
      ".ent-medida.puesta input{border-color:var(--azul);background:var(--azul-claro)}",
      ".ent-medida span{display:flex;flex:1 0 auto;align-items:flex-start;gap:6px;",
      "  font-size:.76rem;color:var(--gris);margin-bottom:3px;line-height:1.25}",
      ".ent-medida .hoy{flex:none;font-style:normal;font-size:.62rem;font-weight:700;letter-spacing:.06em;",
      "  text-transform:uppercase;color:var(--azul);border:1px solid var(--azul-borde);",
      "  background:var(--azul-claro);border-radius:999px;padding:0 6px;line-height:1.5}",
      ".ent-medida.toca input{border-color:var(--azul)}",
      ".ent-medida small{display:block;margin-top:3px;font-size:.7rem;color:var(--gris)}",
      /* botones de guía y su ventana */
      ".ent-mas{margin-top:10px;background:none;border:1px dashed var(--azul-borde);color:var(--azul);",
      "  border-radius:10px;padding:8px 12px;font:inherit;font-size:.83rem;font-weight:600;cursor:pointer;width:100%}",
      ".ent-mas:hover{border-style:solid}",
      /* un solo banner de ayuda: se abre si hace falta y no estorba si no */
      ".ent-ayuda{display:flex;align-items:center;gap:10px;width:100%;margin-top:14px;text-align:left;",
      "  border:1px solid var(--azul-borde);background:var(--azul-claro);color:var(--azul-hondo);",
      "  border-radius:12px;padding:11px 13px;font:inherit;cursor:pointer}",
      ".ent-ayuda:hover{border-color:var(--azul)}",
      ".ent-ayuda .i{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;",
      "  width:26px;height:26px;border-radius:50%;background:var(--azul);color:#fff;font-weight:700}",
      ".ent-ayuda .t{flex:1 1 auto;min-width:0}",
      ".ent-ayuda .t b{display:block;font-size:.92rem}",
      ".ent-ayuda .t small{display:block;color:var(--gris);font-size:.76rem;margin-top:1px}",
      ".ent-ayuda .v{flex:0 0 auto;color:var(--azul);font-size:1.15rem;line-height:1}",
      /* acordeón dentro de la ventana de ayuda */
      ".gu-i{border:1px solid var(--borde);border-radius:10px;margin-top:8px;overflow:hidden}",
      ".gu-i[open]{border-color:var(--azul-borde)}",
      ".gu-i > summary{list-style:none;cursor:pointer;padding:11px 13px;font-weight:600;font-size:.92rem;",
      "  color:var(--azul-hondo);display:flex;align-items:center;gap:8px}",
      ".gu-i > summary::-webkit-details-marker{display:none}",
      ".gu-i > summary::after{content:'+';margin-left:auto;color:var(--azul);font-weight:700}",
      ".gu-i[open] > summary{background:var(--azul-claro)}",
      ".gu-i[open] > summary::after{content:'\\2212'}",
      ".gu-c{padding:2px 13px 13px}",
      ".gu-c .pasos{margin:0;padding-left:20px;font-size:.9rem;line-height:1.45}",
      ".gu-c .pasos li{margin-bottom:5px}",
      ".ent-dibujo{display:flex;justify-content:center;padding:10px 0 4px;color:var(--azul)}",
      ".ent-fallos{margin-top:10px;padding:11px 13px;border-radius:10px;background:var(--ambar-fondo);",
      "  border:1px solid #eccf9a;font-size:.88rem;line-height:1.4}",
      ".ent-estim{margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--azul-claro);",
      "  border:1px solid var(--azul-borde);color:var(--azul-hondo);font-size:.95rem}",
      ".ent-estim small{display:block;margin-top:4px;color:var(--gris);font-size:.8rem;line-height:1.35}",
      ".ent-estim + .ent-estim{margin-top:8px}",
      ".ent-subt{margin:16px 0 8px;font-size:1rem;color:var(--azul-hondo)}",
      ".ent-refresco{float:right;border:1px solid var(--azul-borde);background:var(--azul-claro);",
      "  color:var(--azul-hondo);border-radius:999px;padding:4px 11px;font:inherit;font-size:.72rem;",
      "  font-weight:600;cursor:pointer}",
      ".ent-refresco:hover{border-color:var(--azul)}",
      /* filas de Mi estado */
      ".ent-fila{display:flex;align-items:baseline;gap:10px;padding:8px 0;border-bottom:1px solid var(--borde)}",
      ".ent-fila:last-of-type{border-bottom:0}",
      ".ent-fila .n{flex:1 1 auto;font-size:.86rem;min-width:0}",
      ".ent-fila .v{flex:none;font-size:.95rem;font-weight:700;color:var(--azul-hondo);font-variant-numeric:tabular-nums}",
      ".ent-fila .c{flex:none;width:118px;text-align:right;font-size:.7rem;color:var(--gris)}",
      ".ent-fila.apagada{background:var(--gris-claro)}",
      ".ent-fila.apagada .n,.ent-fila.apagada .v{color:var(--gris)}",
      "@media(max-width:420px){.ent-fila .c{width:96px}}",
      /* semana */
      ".ent-navsem{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}",
      ".ent-navsem h2{margin:0;flex:1;text-align:center}",
      ".ent-navsem .btn{flex:none}",
      ".ent-semana{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}",
      ".ent-dia{background:var(--gris-claro);border:1px solid var(--borde);border-radius:10px;padding:7px 4px;",
      "  text-align:center;min-height:86px;display:flex;flex-direction:column;gap:3px;align-items:center;cursor:pointer}",
      ".ent-dia:hover{border-color:var(--azul-borde)}",
      ".ent-dia:focus-visible{outline:2px solid var(--azul);outline-offset:2px}",
      ".ent-dia.hoy{border-color:var(--azul);background:var(--azul-claro);box-shadow:inset 0 -3px 0 var(--azul)}",
      ".ent-dia.sel{border-color:var(--azul);border-width:2px;background:var(--azul-claro)}",
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

  /* ==================== salud.json ====================
     Vive en el mismo repositorio privado y con la misma clave que ya usa la app
     para sincronizarse. No se guarda dentro del estado —son 128 KB y viajarían
     en cada sincronización—: se queda en su propia caché de este aparato. */

  var Salud = {
    CLAVE: "khb-salud-cache-v1",
    RUTA: "datos/salud.json",
    FRESCO_MIN: 120,          // minutos antes de volver a pedirlo
    datos: null,
    traidoEl: null,
    estado: "nada",           // nada · cargando · ok · error · sin-config

    cfg: function () { return (A.estado.config && A.estado.config.github) || {}; },
    configurado: function () { var c = this.cfg(); return !!(c.usuario && c.repo && c.token); },

    deB64: function (base) {
      var bin = atob(String(base).replace(/\s/g, "")), by = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) by[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(by);
    },

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (j && j.datos) { this.datos = j.datos; this.traidoEl = j.traidoEl; this.estado = "ok"; return true; }
      } catch (e) {}
      return false;
    },

    aCache: function () {
      try { localStorage.setItem(this.CLAVE, JSON.stringify({ traidoEl: this.traidoEl, datos: this.datos })); }
      catch (e) { /* si no cabe, se vive sin caché */ }
    },

    caducado: function () {
      if (!this.traidoEl) return true;
      return (Date.now() - new Date(this.traidoEl).getTime()) > this.FRESCO_MIN * 60000;
    },

    cargar: function (forzar, alTerminar) {
      var self = this;
      if (!this.configurado()) {
        if (!this.datos) this.estado = "sin-config";          // con caché seguimos pintando lo que hay
        if (alTerminar) alTerminar(false);
        return;
      }
      if (this.estado === "cargando") return;
      if (!forzar && this.datos && !this.caducado()) { if (alTerminar) alTerminar(false); return; }
      this.estado = "cargando";
      var c = this.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.RUTA + "?ref=" + encodeURIComponent(c.rama || "main");
      fetch(url, { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) {
          if (r.status === 404) { self.estado = "error"; self.motivo = "No hay datos/salud.json en el repositorio"; throw 0; }
          if (!r.ok) { self.estado = "error"; self.motivo = "GitHub respondió " + r.status; throw 0; }
          return r.json();
        })
        .then(function (j) {
          self.datos = JSON.parse(self.deB64(j.content));
          self.traidoEl = new Date().toISOString();
          self.estado = "ok";
          self.aCache();
          if (alTerminar) alTerminar(true);
        })
        .catch(function () {
          if (self.estado !== "error") { self.estado = self.datos ? "ok" : "error"; self.motivo = "Sin conexión"; }
          if (alTerminar) alTerminar(false);
        });
    },

    dia: function (iso) {
      var d = this.datos;
      return (d && d.dias && d.dias[iso]) || null;
    },

    /* Actividades medidas de ese día. Fuente única: intervals. */
    actividades: function (iso) {
      var d = this.datos, fuera = [];
      if (!d || !d.actividades) return fuera;
      d.actividades.forEach(function (a) {
        if (String(a.fecha || "").slice(0, 10) === iso) fuera.push(a);
      });
      return fuera;
    },

    base: function (campo) {
      var p = this.datos && this.datos.meta && this.datos.meta.parametros;
      return p ? p[campo] : null;
    },

    /* Tramo con fármaco: los hitos marcan el inicio y dura la pauta + 14 días */
    conFarmaco: function (iso) {
      var d = this.datos;
      if (!d || !d.hitos) return false;
      for (var i = 0; i < d.hitos.length; i++) {
        var h = d.hitos[i];
        if (h.tipo === "tratamiento_inicio" && iso >= h.fecha && iso <= U.sumarDias(h.fecha, 28)) return true;
      }
      return false;
    },

    /* Siembra: trae a la app los pesos de la báscula.
       Criterio de Carlos (19-sep-2026): EL DATO ES EL DE INTERVALS. Si lo tecleado
       a mano difiere de lo que midió la báscula, gana intervals y se corrige solo;
       lo tecleado sirve para verlo antes de que llegue, no para discutirle. */
    sembrarPesos: function () {
      var d = this.datos, n = 0;
      if (!d || !d.dias) return 0;
      var hay = {};
      (A.estado.pesos || []).forEach(function (p) { hay[p.f] = p.kg; });
      Object.keys(d.dias).sort().forEach(function (f) {
        var v = d.dias[f] && d.dias[f].peso;
        if (!v) return;
        if (hay[f] === undefined || Math.abs(hay[f] - v) > 0.05) { A.anotarPeso(f, v); n++; }
      });
      return n;
    }
  };

  /* ==================== ESTADO ==================== */

  function ent() {
    var e = A.estado;
    if (!e.entreno) e.entreno = { v: 1, checks: {}, medidas: {}, talla: {} };
    if (!e.entreno.checks) e.entreno.checks = {};
    if (!e.entreno.medidas) e.entreno.medidas = {};
    if (!e.entreno.talla) e.entreno.talla = {};
    return e.entreno;
  }

  /* marca: true = hecha · "no" = NO hecha, aunque el reloj diga otra cosa · nada = lo que diga el reloj */
  function marcaDe(iso, id) { var d = ent().checks[iso]; return d ? d[id] : undefined; }
  function marcado(iso, id) { return marcaDe(iso, id) === true; }

  function marcar(iso, id, valor) {
    var c = ent().checks;
    if (!c[iso]) c[iso] = {};
    if (valor === true) c[iso][id] = true;
    else if (valor === "no") c[iso][id] = "no";
    else delete c[iso][id];
    if (c[iso] && !Object.keys(c[iso]).length) delete c[iso];
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

  /* Valor de cualquier medida ese día: el peso vive en el histórico de la app */
  function valorDe(iso, id) { return id === "peso" ? pesoDe(iso) : medida(iso, id); }

  /* Último valor de esa medida hasta esa fecha, sea peso o cinta */
  function ultimoValor(id, iso) {
    if (id === "peso") { var p = ultimoPeso(iso); return p ? { v: p.kg, f: p.f } : null; }
    return ultimaMedida(iso, id);
  }

  /* El último peso anotado hasta esa fecha (la lista viene ordenada) */
  function ultimoPeso(iso) {
    var l = A.estado.pesos || [], ult = null;
    for (var i = 0; i < l.length; i++) if (l[i].f <= iso) ult = l[i];
    return ult;
  }

  /* La última medida de ese tipo hasta esa fecha */
  function ultimaMedida(iso, id) {
    var m = ent().medidas, mejor = null;
    for (var f in m) if (f <= iso && m[f][id] !== undefined && m[f][id] !== "") {
      if (!mejor || f > mejor.f) mejor = { f: f, v: parseFloat(m[f][id]) };
    }
    return mejor;
  }

  /* El último dato de la báscula que ha bajado de intervals hasta esa fecha.
     Llegan salteados: la báscula solo manda el día que te pesas con ella. */
  function ultimoDeSalud(campo, iso) {
    var d = Salud.datos, mejor = null;
    if (!d || !d.dias) return null;
    for (var f in d.dias) {
      if (f > iso) continue;
      var v = d.dias[f][campo];
      if (v === undefined || v === null || v === "") continue;
      if (!mejor || f > mejor.f) mejor = { f: f, v: v };
    }
    return mejor;
  }

  /* Grasa estimada con la cinta (fórmula de la Marina de EE. UU., en cm) */
  function grasaPorCinta(iso) {
    var cfg = P.grasaCinta;
    if (!cfg) return null;
    var cin = ultimaMedida(iso, "cintura"), cue = ultimaMedida(iso, "cuello");
    if (!cin || !cue) return null;
    var altura = (A.estado.perfil && A.estado.perfil.altura) || cfg.altura_cm;
    var dif = cin.v - cue.v;
    if (!(dif > 0) || !(altura > 0)) return null;
    var pct = 495 / (1.0324 - 0.19077 * (Math.log(dif) / Math.LN10) + 0.15456 * (Math.log(altura) / Math.LN10)) - 450;
    if (!isFinite(pct) || pct <= 0 || pct >= 70) return null;
    var peso = ultimoPeso(iso);
    return {
      pct: Math.round(pct * 10) / 10,
      cintura: cin.v, cuello: cue.v, fecha: (cin.f > cue.f ? cin.f : cue.f),
      magra: peso ? Math.round(peso.kg * (1 - pct / 100) * 10) / 10 : null,
      peso: peso ? peso.kg : null
    };
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
    var exc = (P.excepciones || {})[iso];
    if (exc) return exc.map(function (s) { return { t: s.t, min: s.min }; });
    var pl = P.plantillas[talla];
    if (!pl) return [];
    return (pl.dias[U.desdeISO(iso).getDay()] || []).map(function (s) {
      if (s.t === "DIA_GRANDE") return { t: textoDiaGrande(sem), min: 0, grande: true };
      return { t: s.t, min: s.min };
    });
  }

  /* A qué se parece un texto: así la sesión de caminar solo la marca una caminata. */
  function familia(txt) {
    var t = String(txt || "").toLowerCase()
      .replace(/[áà]/g, "a").replace(/[éè]/g, "e").replace(/[íì]/g, "i")
      .replace(/[óò]/g, "o").replace(/[úù]/g, "u");
    if (/camin|sender|pasear|paseo|hike|walk/.test(t)) return "caminar";
    if (/bici|rodillo|zwift|ciclis|ride/.test(t)) return "bici";
    if (/fuerza|muscula|pesas|gimnas|weight/.test(t)) return "fuerza";
    if (/movilidad|estira|yoga/.test(t)) return "movilidad";
    if (/correr|carrera|run|trotar/.test(t)) return "correr";
    if (/remo|row/.test(t)) return "remo";
    return "otra";
  }

  /* Solo lo que MIDIÓ el reloj. Fuente única: intervals (salud.json) cuando está
     disponible; el fichero de Garmin importado a mano queda de respaldo. Lo que
     se apunta en el Menú para calcular el gasto NO cuenta como sesión hecha. */
  function registradas(iso) {
    if (Salud.datos) {
      return Salud.actividades(iso).map(function (a) {
        return {
          min: Math.round(a.min_mov || a.min || 0),
          nombre: a.nombre || a.tipo || "Actividad",
          fam: familia((a.nombre || "") + " " + (a.tipo || ""))
        };
      });
    }
    var lista = (A.estado.actividad || {})[iso] || [], fuera = [];
    lista.forEach(function (a) {
      var ex = a.extra || a;
      if (!ex || ex.fuente !== "garmin") return;
      var cat = null;
      (A.estado.actividades || []).forEach(function (c) { if (c.id === a.a) cat = c; });
      fuera.push({
        min: a.min || 0,
        nombre: ex.n || (cat ? cat.n : "Actividad"),
        fam: familia((ex.n || "") + " " + (cat ? cat.n : "") + " " + (a.a || ""))
      });
    });
    return fuera;
  }

  /* ¿Hay una actividad medida que encaje con ESTA sesión? */
  function relojPara(iso, sesion) {
    var fam = familia(sesion.t), reg = registradas(iso), umbral = Math.max(MIN_SESION, Math.round((sesion.min || 45) * 0.6));
    if (sesion.grande) umbral = MIN_SESION;
    for (var i = 0; i < reg.length; i++) {
      if ((reg[i].fam === fam || (sesion.grande && (reg[i].fam === "caminar" || reg[i].fam === "bici"))) &&
          reg[i].min >= umbral) return reg[i];
    }
    return null;
  }

  function sesionHecha(iso, sesion, i) {
    var m = marcaDe(iso, "s" + i);
    if (m === true) return true;
    if (m === "no") return false;
    return !!relojPara(iso, sesion);
  }

  function diaCumplido(iso, sem, talla) {
    var ses = sesionesDe(iso, sem, talla);
    if (!ses.length) return true;                 // descanso: el día cuenta
    for (var i = 0; i < ses.length; i++) if (sesionHecha(iso, ses[i], i)) return true;
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

  /* ---------- series y lecturas ---------- */

  function serieMedida(id, hasta, dias) {
    var m = ent().medidas, desde = U.sumarDias(hasta, -(dias - 1)), fuera = [];
    for (var f in m) {
      if (f >= desde && f <= hasta && m[f][id] !== undefined && m[f][id] !== "") {
        var v = parseFloat(m[f][id]);
        if (!isNaN(v)) fuera.push({ f: f, v: v });
      }
    }
    fuera.sort(function (a, b) { return a.f < b.f ? -1 : 1; });
    return fuera;
  }

  function media(lista) {
    if (!lista.length) return null;
    var s = 0;
    lista.forEach(function (x) { s += x.v; });
    return s / lista.length;
  }

  function mediaPesos(hasta, dias) {
    var desde = U.sumarDias(hasta, -(dias - 1)), l = (A.estado.pesos || []).filter(function (x) {
      return x.f >= desde && x.f <= hasta;
    });
    if (!l.length) return null;
    var s = 0;
    l.forEach(function (x) { s += x.kg; });
    return { m: s / l.length, n: l.length };
  }

  function num(x, dec) { return x.toFixed(dec === undefined ? 1 : dec).replace(".", ","); }
  function signo(x, dec) { return (x > 0 ? "+" : "") + num(x, dec); }

  /* Cada medida produce una lectura; sin datos suficientes, no se inventa nada. */
  function lecturas(dia) {
    var out = [];

    /* peso: media de la semana contra la anterior */
    var a = mediaPesos(dia, 7), b = mediaPesos(U.sumarDias(dia, -7), 7);
    if (a && a.n >= 2) {
      out.push({
        t: "Peso: media de 7 días " + num(a.m) + " kg",
        d: b && b.n >= 2
          ? signo(a.m - b.m) + " kg respecto a la semana anterior (" + num(b.m) + "). El objetivo del plan es entre −0,3 y −0,5 kg por semana."
          : "Con " + a.n + " pesadas. Hacen falta dos semanas para poder comparar."
      });
    } else if (a) {
      out.push({ t: "Peso: " + num(a.m) + " kg", d: "Una sola pesada esta semana. El dato del día oscila más de un kilo por agua y tránsito: lo que cuenta es la media." });
    }

    /* grasa por cinta */
    var g = grasaPorCinta(dia);
    if (g) {
      out.push({
        t: "Grasa estimada con la cinta: " + num(g.pct) + " %" + (g.magra ? " · masa magra " + num(g.magra) + " kg" : ""),
        d: "Cintura " + num(g.cintura) + " cm y cuello " + num(g.cuello) + " cm, del " + U.etiquetaFecha(g.fecha) + ". " + P.grasaCinta.aviso
      });
    }

    /* grasa de la báscula: lo que baja de intervals, medido por impedancia */
    var gb = ultimoDeSalud("grasa", dia);
    if (gb) {
      var mb = ultimoDeSalud("magra", dia), mus = ultimoDeSalud("musculo", dia);
      var atraso = diasEntre(gb.f, dia);
      var det = "Del " + U.etiquetaFecha(gb.f) +
        (mb && mb.f === gb.f ? " · masa magra " + num(mb.v) + " kg" : "") +
        (mus && mus.f === gb.f ? " · músculo " + num(mus.v) + " kg" : "") + ". ";
      if (g) {
        var difG = g.pct - gb.v;
        det += "La cinta te da " + num(g.pct) + " % y la báscula " + num(gb.v) + " %: " +
          (Math.abs(difG) < 1
            ? "prácticamente lo mismo, que es la mejor señal de que ambas están bien tomadas."
            : num(Math.abs(difG)) + " puntos de diferencia. ") +
          "Son dos métodos distintos y ninguno es la verdad: la báscula se mueve con el agua del cuerpo " +
          "—si te pesas deshidratado, sube—, y la cinta no. Lo que vale es que cada una siga su propia línea.";
      } else {
        det += "La báscula la calcula por impedancia, así que se mueve con el agua del cuerpo. " +
          "Cuando anotes cintura y cuello tendrás el contraste con un método que no depende de eso.";
      }
      if (atraso > 21) det += " Es la última que mandó la báscula: desde entonces no ha bajado ninguna.";
      out.push({ t: "Grasa de la báscula: " + num(gb.v) + " %", d: det });
    }

    /* cintura / altura */
    var rc = cinturaAltura(dia);
    if (rc) {
      out.push({
        t: "Cintura ÷ altura: " + rc.ratio.toFixed(2).replace(".", ","),
        d: "El umbral de riesgo bajo está en 0,50, que para tus " + rc.altura + " cm son " + rc.objetivo +
          " cm de cintura. Ahora vas por " + num(rc.cintura) + " cm: " +
          (rc.ratio < 0.5 ? "dentro." : "te faltan " + num(rc.faltan) + " cm.")
      });
    }

    /* tobillo: retención */
    var tob = serieMedida("tobillo", dia, 21);
    if (tob.length) {
      var hoyT = tob[tob.length - 1], previos = tob.slice(0, -1), mp = media(previos);
      var difT = mp === null ? null : hoyT.v - mp;
      out.push({
        t: "Tobillo: " + num(hoyT.v) + " cm" +
          (difT === null ? "" : (Math.abs(difT) < 0.05 ? " · igual que tu media" : " · " + signo(difT) + " cm sobre tu media")),
        d: mp === null
          ? "Primera medida. A partir de la tercera se puede comparar."
          : (hoyT.v - mp >= 0.7
            ? "Por encima de tus días normales: eso es líquido, no grasa — con el corticoide es lo esperable. Si no baja al terminar la pauta, es dato para la revisión."
            : "Dentro de tu rango habitual (media de " + previos.length + " días: " + num(mp) + " cm).")
      });
    }

    /* tensión y pulso */
    var sis = serieMedida("sistolica", dia, 7), dia2 = serieMedida("diastolica", dia, 7), pul = serieMedida("pulso", dia, 7);
    if (sis.length && dia2.length) {
      var ms = media(sis), md = media(dia2), mpu = pul.length ? media(pul) : null;
      var alta = ms >= 140 || md >= 90;
      out.push({
        t: "Tensión: media de " + sis.length + (sis.length === 1 ? " toma " : " tomas ") + Math.round(ms) + "/" + Math.round(md) +
          (mpu !== null ? " · pulso " + Math.round(mpu) : ""),
        d: alta
          ? "La media de estos días queda en o por encima de 140/90. No es un diagnóstico y los corticoides la suben por sí solos, pero es exactamente el dato que conviene llevar a la revisión del 28."
          : "Dentro de lo esperable. Una toma suelta no dice nada; lo que se mira es la media de varios días."
      });
    }

    /* brazo y muslo: cambio mensual */
    [["muslo", "Muslo"], ["brazo", "Brazo"]].forEach(function (par) {
      var s = serieMedida(par[0], dia, 400);
      if (!s.length) return;
      var u = s[s.length - 1], ant = s.length > 1 ? s[s.length - 2] : null;
      var dif = ant ? u.v - ant.v : null, det;
      if (!ant) det = "Primera medida; sirve de referencia para los meses siguientes.";
      else if (dif <= -1) det = "Desde el " + U.etiquetaFecha(ant.f) + ". Ha bajado más de un centímetro: si el peso también bajó, parte de lo perdido era músculo. Revisa proteína y las dos sesiones de fuerza.";
      else if (dif >= 1) det = "Desde el " + U.etiquetaFecha(ant.f) + ". Ha subido: con el peso estable, buena señal.";
      else det = "Desde el " + U.etiquetaFecha(ant.f) + ". Estable dentro del error de la cinta (±5 mm). Si el peso baja y esto aguanta, lo que pierdes es grasa.";
      out.push({ t: par[1] + ": " + num(u.v) + " cm" + (ant ? " · " + signo(dif) + " cm" : ""), d: det });
    });

    return out;
  }

  /* ==================== AVISOS ====================
     Catálogo cerrado en datos/plan.js. Aquí solo se evalúan las condiciones;
     los umbrales no se escriben en este fichero. Los avisos que necesitan
     salud.json quedan fuera hasta que la app lo lea. */

  function def(id) {
    var l = P.avisos || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }

  function avisos(dia) {
    var out = [], d;

    /* M1 y M2 — cintura */
    var cin = ultimaMedida(dia, "cintura"), rc = cinturaAltura(dia);
    d = def("M1");
    if (d && cin && cin.v >= d.umbral) out.push({ d: d, dato: num(cin.v) + " cm, del " + U.etiquetaFecha(cin.f) });
    d = def("M2");
    if (d && rc && rc.ratio >= d.umbral) out.push({ d: d, dato: rc.ratio.toFixed(2).replace(".", ",") + " · tu objetivo son " + rc.objetivo + " cm de cintura" });

    /* M3 y M4 — peso */
    var s0 = mediaPesos(dia, 7), s1 = mediaPesos(U.sumarDias(dia, -7), 7), s2 = mediaPesos(U.sumarDias(dia, -14), 7);
    d = def("M3");
    if (d && s0 && s1 && s2 && s0.n >= 2 && s1.n >= 2 && s2.n >= 2 &&
        (s1.m - s0.m) > d.umbral && (s2.m - s1.m) > d.umbral) {
      out.push({ d: d, dato: num(s1.m - s0.m) + " y " + num(s2.m - s1.m) + " kg en las dos últimas semanas" });
    }
    d = def("M4");
    if (d && s0 && s0.n >= 2) {
      var mins = [], k;
      for (k = 0; k < 8; k++) {
        var w = mediaPesos(U.sumarDias(dia, -7 * k), 7);
        if (w && w.n >= 1) mins.push(w.m);
      }
      var minimo = mins.length ? Math.min.apply(null, mins) : null;
      var tres = [s0, s1, s2].every(function (x) { return x && x.n >= 1 && minimo !== null && x.m >= minimo + d.umbral; });
      if (tres) out.push({ d: d, dato: num(s0.m) + " kg frente a tu mínimo de " + num(minimo) });
    }

    /* M5 — tobillo */
    d = def("M5");
    if (d) {
      var t = serieMedida("tobillo", dia, 21);
      if (t.length >= 4) {
        var base = media(t.slice(0, -d.dias));
        var ultimos = t.slice(-d.dias);
        if (base !== null && ultimos.length === d.dias &&
            ultimos.every(function (x) { return x.v - base >= d.umbral; })) {
          out.push({ d: d, dato: signo(ultimos[ultimos.length - 1].v - base) + " cm sobre tu media de " + num(base) });
        }
      }
    }

    /* M6 y M7 — tensión */
    var sis = serieMedida("sistolica", dia, 14), dias = serieMedida("diastolica", dia, 14);
    d = def("M7");
    if (d) {
      var recientes = sis.filter(function (x) { return x.f >= U.sumarDias(dia, -1); })
        .concat(dias.filter(function (x) { return x.f >= U.sumarDias(dia, -1); }));
      var pico = sis.some(function (x) { return x.f >= U.sumarDias(dia, -1) && x.v >= d.umbral_sis; }) ||
                 dias.some(function (x) { return x.f >= U.sumarDias(dia, -1) && x.v >= d.umbral_dia; });
      if (pico && recientes.length) out.push({ d: d, dato: "toma de " + Math.round(sis[sis.length - 1].v) + "/" + Math.round(dias[dias.length - 1].v) });
    }
    d = def("M6");
    if (d && sis.length >= d.tomas && dias.length >= d.tomas) {
      var ms = media(sis.slice(-d.tomas)), md = media(dias.slice(-d.tomas));
      if (ms >= d.umbral_sis || md >= d.umbral_dia) {
        out.push({ d: d, dato: "media de " + d.tomas + " tomas: " + Math.round(ms) + "/" + Math.round(md) });
      }
    }

    /* M8 — muslo */
    d = def("M8");
    if (d) {
      var mu = serieMedida("muslo", dia, 400);
      if (mu.length >= 2 && s0 && s1 && s0.n >= 1 && s1.n >= 1) {
        var difMu = mu[mu.length - 1].v - mu[mu.length - 2].v;
        if (difMu <= d.umbral && s0.m < s1.m) out.push({ d: d, dato: num(difMu) + " cm desde la medida anterior" });
      }
    }

    var orden = { consulta: 0, atencion: 1, nota: 2 };
    out.sort(function (a, b) { return orden[a.d.nivel] - orden[b.d.nivel]; });
    return out;
  }

  /* Cintura partida por altura: umbral de riesgo bajo en 0,50 */
  function cinturaAltura(iso) {
    var cin = ultimaMedida(iso, "cintura");
    var altura = (A.estado.perfil && A.estado.perfil.altura) || (P.grasaCinta && P.grasaCinta.altura_cm);
    if (!cin || !altura) return null;
    return {
      ratio: cin.v / altura, cintura: cin.v, altura: altura,
      objetivo: Math.round(altura * 0.5),
      faltan: Math.round((cin.v - altura * 0.5) * 10) / 10
    };
  }

  /* ==================== GUÍAS DE MEDIDA ==================== */

  var DIBUJO_CINTURA =
    '<svg viewBox="0 0 150 150" width="140" height="140" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    /* hombros, tronco con cintura y cadera */
    '<path d="M50 18h50l16 10c4 2 6 7 5 12l-6 26c-1 6-2 9-2 14l1 12c0 4 1 8 2 12l3 12H46l3-12c1-4 2-8 2-12l1-12c0-5-1-8-2-14l-6-26c-1-5 1-10 5-12z"/>' +
    /* la cinta, horizontal, a la altura del ombligo */
    '<line x1="18" y1="82" x2="132" y2="82" stroke-dasharray="5 4"/>' +
    '<path d="M25 77l-7 5 7 5M125 77l7 5-7 5"/>' +
    '<circle cx="75" cy="82" r="3.5" fill="currentColor" stroke="none"/>' +
    '<text x="75" y="128" text-anchor="middle" font-size="10" fill="currentColor" stroke="none">a la altura del ombligo,</text>' +
    '<text x="75" y="141" text-anchor="middle" font-size="10" fill="currentColor" stroke="none">y horizontal por detrás</text>' +
    "</svg>";

  var DIBUJO_CUELLO =
    '<svg viewBox="0 0 150 150" width="140" height="140" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<ellipse cx="75" cy="30" rx="17" ry="20"/>' +
    '<path d="M64 49v18M86 49v18"/>' +
    '<path d="M22 108c3-18 16-32 42-41M128 108c-3-18-16-32-42-41"/>' +
    '<line x1="56" y1="70" x2="94" y2="61" stroke-dasharray="5 4"/>' +
    '<circle cx="75" cy="58" r="3" fill="currentColor" stroke="none"/>' +
    '<path d="M100 58l10-6" /><text x="112" y="54" font-size="9" fill="currentColor" stroke="none">nuez</text>' +
    '<text x="75" y="128" text-anchor="middle" font-size="10" fill="currentColor" stroke="none">justo por debajo de la nuez,</text>' +
    '<text x="75" y="141" text-anchor="middle" font-size="10" fill="currentColor" stroke="none">algo más baja por delante</text>' +
    "</svg>";

  var GUIAS = {
    cintura: {
      titulo: "Cómo medir la cintura",
      dibujo: DIBUJO_CINTURA,
      pasos: [
        "De pie, descalzo, en ayunas y después de ir al baño.",
        "La cinta sobre la piel, no sobre la ropa.",
        "A la altura del ombligo, y <b>horizontal</b>: compruébalo en el espejo, que por detrás no se caiga.",
        "Brazos caídos y hombros relajados.",
        "Mide <b>al final de una espiración normal</b>, sin vaciar el pecho a propósito.",
        "La cinta apoyada, sin hundir la piel.",
        "Mide dos veces; si se diferencian más de medio centímetro, una tercera y te quedas con la que se repita."
      ],
      fallos: "Meter tripa, apretar la cinta, medir después de comer o llevarla torcida. Cualquiera de las cuatro te cambia el número más que un mes de dieta."
    },
    cuello: {
      titulo: "Cómo medir el cuello",
      dibujo: DIBUJO_CUELLO,
      pasos: [
        "De pie, mirada al frente y hombros relajados.",
        "La cinta <b>justo por debajo de la nuez</b>.",
        "Ligeramente inclinada: un poco más baja por delante que por detrás.",
        "Apoyada, sin apretar — no debe marcar la piel.",
        "No tragues ni hables mientras mides.",
        "Dos veces, igual que la cintura."
      ],
      fallos: "Apretar para que salga un número menor. Aquí un centímetro de menos en el cuello te sube casi un punto el porcentaje de grasa."
    },
    tension: {
      titulo: "Cómo tomar la tensión",
      boton: "Tensión",
      dibujo: "",
      pasos: [
        "Sentado y <b>quieto cinco minutos</b> antes de medir. Sin hablar durante la toma.",
        "Espalda apoyada, pies en el suelo sin cruzar las piernas.",
        "El brazo apoyado en la mesa, con el manguito <b>a la altura del corazón</b>.",
        "El manguito sobre la piel, dos dedos por encima del codo.",
        "Ni café ni tabaco ni ejercicio en la media hora anterior; con la vejiga vacía.",
        "Haz <b>dos tomas separadas un minuto</b> y anota la segunda. Siempre el mismo brazo y la misma hora."
      ],
      fallos: "Medir con prisa, recién llegado o con el brazo colgando: sube la cifra sin que pase nada. " +
        "El pulso que anotas es el de esa misma toma. Y una toma suelta no significa nada: lo que se mira es la media de varios días."
    },
    tobillo: {
      titulo: "Cómo medir el tobillo",
      dibujo: "",
      pasos: [
        "Sentado, con el pie apoyado en el suelo y la pierna relajada.",
        "La cinta <b>justo por encima de los dos huesos</b> que sobresalen en el tobillo.",
        "Siempre <b>la misma pierna</b> y en el mismo punto: marca de referencia mental, por ejemplo el hueso de dentro.",
        "Por la mañana, antes de andar mucho: el líquido baja a lo largo del día.",
        "Apoyada, sin apretar."
      ],
      fallos: "Esto no mide grasa: mide líquido. Sirve para ver si retienes —con el corticoide es lo esperable— y lo que cuenta es el cambio respecto a tus días normales. " +
        "Si un tobillo se hincha mucho más que el otro, o duele o está caliente, eso no es dato para el plan: es para el médico."
    },
    muslo: {
      titulo: "Cómo medir el muslo",
      dibujo: "",
      pasos: [
        "De pie, peso repartido en las dos piernas, músculo relajado.",
        "En el <b>punto medio</b> entre el pliegue de la ingle y el borde superior de la rodilla.",
        "Mide una vez ese punto con la cinta y apunta a cuántos centímetros de la rodilla está: así repites siempre el mismo sitio.",
        "Cinta horizontal y apoyada, sin apretar.",
        "Siempre la misma pierna."
      ],
      fallos: "Apretar, o medir en un sitio distinto cada mes. Un centímetro de diferencia en la altura del muslo cambia el número más que tres meses de entrenamiento."
    },
    brazo: {
      titulo: "Cómo medir el brazo",
      dibujo: "",
      pasos: [
        "Brazo <b>relajado y colgando</b>, no en tensión.",
        "En el punto medio entre el hombro y el codo.",
        "Cinta horizontal, apoyada, sin apretar.",
        "Siempre el mismo brazo."
      ],
      fallos: "Medirlo en tensión. Y no le des importancia al número: se mueve 2-3 mm en meses y la cinta tiene ±5 mm de error. Es informativo."
    },
    peso: {
      titulo: "Cómo pesarse",
      dibujo: "",
      pasos: [
        "Al despertar, después de orinar y <b>antes</b> de beber o comer nada.",
        "Desnudo y con los pies secos, sobre suelo duro — nunca sobre alfombra.",
        "La misma báscula y el mismo sitio siempre.",
        "<b>Nunca después de entrenar</b>: el sudor te quita un kilo y medio que no has perdido, y la báscula te calcula de más la grasa."
      ],
      fallos: "El dato del día no significa nada: oscila más de un kilo por agua y tránsito. Lo que cuenta es la media de la semana."
    }
  };

  /* cómo va la pantalla: es ayuda también, así que vive en el mismo sitio */
  var GUIA_PANTALLA = {
    titulo: "Cómo funciona El Plan",
    pasos: [
      "Arriba tienes <b>la sesión del día</b> con sus casillas: márcala cuando la hagas.",
      "Si el reloj registra una actividad del mismo tipo y al menos el <b>60 % de los minutos previstos</b>, la sesión se marca sola. Si la desmarcas a mano, <b>manda tu marca</b>, no el reloj.",
      "Las <b>casillas de medidas</b> están siempre, todas. Las que toca medir hoy salen las primeras con la etiqueta <b>HOY</b>; las demás las rellenas solo si te apetece.",
      "Cada casilla trae de fondo <b>tu último dato</b> y debajo la fecha en que lo tomaste. Lo que escribas se guarda con la fecha del día que tengas abierto.",
      "El <b>peso</b> lo manda intervals: si allí hay dato del día, el que se guarda es ese aunque hayas escrito otro."
    ],
    fallos: "Un dato suelto no significa casi nada. Lo que se mira en el pase del domingo es la media de la semana y la dirección, no el número de un día."
  };

  function bloqueGuia(g) {
    var h = "";
    if (g.dibujo) h += '<div class="ent-dibujo">' + g.dibujo + "</div>";
    h += '<ol class="pasos">';
    g.pasos.forEach(function (p) { h += "<li>" + p + "</li>"; });
    h += "</ol>";
    h += '<div class="ent-fallos"><b>Lo que más falla:</b> ' + U.esc(g.fallos) + "</div>";
    return h;
  }

  /* toda la ayuda en una ventana: un desplegable por medida, cerrados de inicio */
  function abrirAyuda() {
    var caja = document.getElementById("modal-caja"), modal = document.getElementById("modal");
    if (!caja || !modal) return;
    var h = '<header><h2>Ayuda</h2>' +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">×</button></header>' +
      '<p class="nota-peque" style="margin:0 0 4px">Toca lo que quieras leer. Se abre solo lo que abras tú.</p>';

    h += '<details class="gu-i"><summary>' + U.esc(GUIA_PANTALLA.titulo) + "</summary>" +
      '<div class="gu-c">' + bloqueGuia(GUIA_PANTALLA) + "</div></details>";

    var vistas = {};
    (P.medidas || []).forEach(function (m) {
      var k = m.guia || m.id, g = GUIAS[k];
      if (!g || vistas[k]) return;
      vistas[k] = 1;
      h += '<details class="gu-i"><summary>' + U.esc(g.titulo) + "</summary>" +
        '<div class="gu-c">' + bloqueGuia(g) + "</div></details>";
    });

    /* diagnóstico: qué campos manda intervals de verdad. Lo escribe el workflow
       en salud.json, así no hay que abrir el registro de la acción para verlo. */
    var cb = (Salud.datos && Salud.datos.meta && Salud.datos.meta.campos_bienestar) || null;
    if (cb && cb.length) {
      h += '<details class="gu-i"><summary>Qué manda intervals (' + cb.length + " campos)</summary>" +
        '<div class="gu-c"><p class="nota-peque" style="margin:0 0 8px">Campos de bienestar que llegan ' +
        "con algún valor, tal como los devuelve intervals. Si el agua o la masa ósea de la báscula no " +
        "aparecen en esta lista, es que no llegan: el fallo estaría antes, entre Garmin e intervals.</p>" +
        '<p style="margin:0;font-size:.85rem;line-height:1.5;word-break:break-word">' +
        U.esc(cb.join(" · ")) + "</p></div></details>";
    }

    h += '<button class="btn principal" type="button" data-cerrar-guia="1" style="width:100%;margin-top:14px">Cerrar</button>';
    caja.innerHTML = h;
    modal.classList.add("abierta");
  }

  function abrirGuia(id) {
    if (id === "*") return abrirAyuda();
    var g = GUIAS[id], caja = document.getElementById("modal-caja"), modal = document.getElementById("modal");
    if (!g || !caja || !modal) return;
    var h = '<header><h2>' + U.esc(g.titulo) + '</h2>' +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">×</button></header>' +
      bloqueGuia(g);
    h += '<button class="btn principal" type="button" data-cerrar-guia="1" style="width:100%;margin-top:14px">Entendido</button>';
    caja.innerHTML = h;
    modal.classList.add("abierta");
  }

  function cerrarGuia() {
    var modal = document.getElementById("modal");
    if (modal) modal.classList.remove("abierta");
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
    var FLECHA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M15 5l-7 7 7 7"/></svg>';
    var volver = '<button type="button" class="ent-atras" data-volver="1">' + FLECHA + "Volver a Entrenamiento</button>";

    if (!sem) {
      return volver + '<div class="tarjeta"><h2>El Plan</h2><p class="nota-peque">' +
        U.esc(P.textos.fueraDePlan) + "</p></div>";
    }

    var talla = tallaDe(sem), pl = P.plantillas[talla];
    var img = (sem.n % 2) ? P.diaGrande.imagenes.montana : P.diaGrande.imagenes.bici;
    var h = volver;

    /* franja: dos ranuras, el semáforo y los avisos */
    var av = avisos(hoy).slice(0, 2), sem0 = (P.semaforo || {});
    var hayConsulta = av.some(function (a) { return a.d.nivel === "consulta"; });
    h += '<div class="ent-franja">';
    h += '<div class="ent-sem' + (sem0.activo ? "" : " apagado") + (hayConsulta ? " ambar" : "") + '">' +
      '<span class="et">Semáforo</span>' +
      "<b>" + (sem0.activo ? "—" : (hayConsulta ? "Suave" : "Sin calibrar")) + "</b>" +
      "<small>" + (sem0.activo
        ? ""
        : (hayConsulta
          ? "Hoy suave: hay un aviso de consulta sin resolver."
          : "Se activa el " + U.etiquetaFecha(sem0.desde || "2026-10-15") + ", con tres semanas sin corticoide.")) +
      "</small></div>";
    h += '<div class="ent-avisos"><span class="et">Avisos · ' + av.length + "</span>";
    if (!av.length) {
      h += '<small class="ok">Nada que atender hoy.</small>';
    } else {
      av.forEach(function (a) {
        h += '<div class="ent-aviso ' + a.d.nivel + '">' +
          '<span class="niv">' + (a.d.nivel === "consulta" ? "Consulta" : a.d.nivel === "atencion" ? "Atención" : "Nota") + "</span>" +
          "<b>" + a.d.id + " · " + U.esc(a.d.titulo) + "</b>" +
          "<small>" + U.esc(a.dato) + ". " + U.esc(a.d.texto) + "</small></div>";
      });
    }
    h += "</div></div>";

    /* cabecera */
    h += '<div class="tarjeta ent-cab">' +
      '<img src="' + img + '" alt="" onerror="this.style.display=\'none\'">' +
      '<div class="centro"><span class="ent-etq">Semana ' + sem.n + " · " + U.esc(pl.nombre) + "</span>" +
      "<h2>El Plan</h2>" +
      '<p class="nota-peque">' + U.etiquetaFecha(sem.desde) + " – " + U.etiquetaFecha(sem.hasta) +
        " · carga objetivo <b>" + sem.carga + "</b>" + (sem.nota ? " · " + U.esc(sem.nota) : "") + "</p></div>" +
      '<div class="ent-racha"><b>' + racha() + "</b><span>días seguidos</span></div></div>";

    /* el día abierto: hoy, o el que se haya pulsado en la tira de la semana */
    var dia = (diaSel && semanaDe(diaSel)) ? diaSel : hoy;
    var semDia = semanaDe(dia) || sem, tallaDia = tallaDe(semDia);
    var d = U.desdeISO(dia), esHoy = (dia === hoy);
    var titulo = esHoy
      ? "Hoy, " + DIA_LARGO[d.getDay()] + " " + U.etiquetaFecha(dia)
      : DIA_LARGO[d.getDay()].charAt(0).toUpperCase() + DIA_LARGO[d.getDay()].slice(1) + " " + U.etiquetaFecha(dia);

    h += '<div class="tarjeta"><h2>' + titulo + "</h2>";
    if (!esHoy) h += '<button type="button" class="ent-volver" data-dia="' + hoy + '">‹ volver a hoy</button>';

    var ses = sesionesDe(dia, semDia, tallaDia), filas = [];
    ses.forEach(function (s, i) {
      var id = "s" + i, m = marcaDe(dia, id), reloj = relojPara(dia, s);
      var porElReloj = (m !== true && m !== "no" && !!reloj);
      var ayuda = porElReloj
        ? "El reloj midió " + reloj.min + " min de «" + reloj.nombre + "». Si no la hiciste, desmárcala y se queda desmarcada."
        : (m === "no" ? "La has marcado como no hecha." : (s.grande ? P.diaGrande.aviso : P.textos.auto));
      filas.push({
        id: id, nombre: s.t + (s.min ? " · " + s.min + " min" : ""),
        hecho: sesionHecha(dia, s, i), ayuda: ayuda, sello: porElReloj ? "reloj" : ""
      });
    });
    tareasDelDia(dia).forEach(function (t) {
      filas.push({ id: t.id, nombre: t.nombre, ayuda: t.ayuda, hecho: marcado(dia, t.id),
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

    /* TODAS las medidas, siempre, cada una con su último dato.
       Las que toca medir hoy van primero y marcadas; las demás están ahí por si
       te apetece medir. La fecha del día abierto es la que se guarda. */
    var medHoy = P.medidas.slice().sort(function (a, b) {
      return (tocaMedida(b, dia) ? 1 : 0) - (tocaMedida(a, dia) ? 1 : 0);
    });
    if (medHoy.length) {
      h += '<div class="ent-medidas">';
      medHoy.forEach(function (m) {
        var v = valorDe(dia, m.id);
        var puesta = (v !== null && v !== undefined && v !== "");
        var ult = puesta ? null : ultimoValor(m.id, dia);
        var toca = tocaMedida(m, dia);
        h += '<label class="ent-medida' + (puesta ? " puesta" : "") + (toca ? " toca" : "") + '">' +
          "<span>" + U.esc(m.nombre) + " (" + m.unidad + ")" +
            (toca ? '<em class="hoy">hoy</em>' : "") + "</span>" +
          (m.texto
            ? '<input type="text" inputmode="numeric" placeholder="128/82" data-medida="' + m.id + '" value="' + U.esc(puesta ? v : "") + '">'
            : '<input type="number" step="' + m.paso + '" min="' + m.min + '" max="' + m.max + '"' +
              (ult ? ' placeholder="' + ult.v + '"' : "") +
              ' data-medida="' + m.id + '" value="' + (puesta ? v : "") + '">') +
          '<small>' + (puesta ? "anotado hoy"
            : (ult ? "último " + num(ult.v) + " · " + U.etiquetaFecha(ult.f) : "sin medir todavía")) + "</small>" +
          "</label>";
      });
      h += "</div>";
      var lec = lecturas(dia);
      if (lec.length) {
        h += '<h3 class="ent-subt">Lo que dicen tus medidas</h3>';
        lec.forEach(function (l) {
          h += '<div class="ent-estim"><b>' + U.esc(l.t) + "</b><small>" + U.esc(l.d) + "</small></div>";
        });
      }
      /* una sola puerta a toda la ayuda: dentro está cada medida por separado */
      h += '<button type="button" class="ent-ayuda" data-guia="*">' +
        '<span class="i">?</span>' +
        '<span class="t"><b>Ayuda: cómo se mide cada cosa</b>' +
        "<small>Cintura, cuello, tensión, tobillo, peso… y cómo funciona esta pantalla</small></span>" +
        '<span class="v">›</span></button>';
    }

    /* talla de la semana */
    h += '<div class="ent-talla"><span class="nota-peque">Esta semana va como</span><select id="ent-talla">';
    ["R", "A", "B", "S"].forEach(function (k) {
      h += '<option value="' + k + '"' + (k === talla ? " selected" : "") + ">" + U.esc(P.plantillas[k].nombre) + "</option>";
    });
    h += "</select></div>";
    h += '<p class="nota-peque" style="margin-top:6px">' + U.esc(pl.pie) + "</p></div>";

    /* mi estado */
    h += htmlMiEstado(dia, semDia);

    /* la semana */
    var lunes = lunesVista || U.lunesDe(hoy);
    h += '<div class="tarjeta"><div class="ent-navsem">' +
      '<button type="button" class="btn icono" data-semana="-1" title="Semana anterior">‹</button>' +
      "<h2>" + (lunes === U.lunesDe(hoy) ? "La semana" : U.etiquetaRangoCorto(lunes)) + "</h2>" +
      '<button type="button" class="btn icono" data-semana="1" title="Semana siguiente">›</button>' +
      "</div>" +
      '<div class="ent-semana">';
    for (var i = 0; i < 7; i++) {
      var f = U.sumarDias(lunes, i), fd = U.desdeISO(f), semF = semanaDe(f);
      var ss = semF ? sesionesDe(f, semF, tallaDe(semF)) : [];
      var ok = semF && f <= hoy && ss.length && diaCumplido(f, semF, tallaDe(semF));
      h += '<div class="ent-dia' + (f === hoy ? " hoy" : "") + (f === dia ? " sel" : "") + (ok ? " ok" : "") +
        '" data-dia="' + f + '" role="button" tabindex="0">' +
        '<span class="d">' + DIA_CORTO[fd.getDay()] + '</span><span class="f">' + fd.getDate() + "</span>" +
        '<span class="q">' + (!semF ? "—" : (ss.length
          ? U.esc(ss.map(function (s) { return s.t.split(":")[0].split(",")[0]; }).join(" · "))
          : "descanso")) + "</span><span class=\"p\"></span></div>";
    }
    h += "</div>";
    h += '<p class="nota-peque" style="margin-top:10px">' + U.esc(P.suelo) +
      " El fin de semana, un solo día grande: " + U.esc(textoDiaGrande(sem).toLowerCase()) + ". El otro, descanso.</p></div>";

    h += '<button type="button" class="ent-atras abajo" data-volver="1">' + FLECHA + "Volver a Entrenamiento</button>";

    return h;
  }

  /* ==================== MI ESTADO ==================== */

  function hhmm(min) {
    if (!min && min !== 0) return null;
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    return h + "h" + (m < 10 ? "0" : "") + m;
  }

  function fila(nombre, valor, contra, apagada) {
    return '<div class="ent-fila' + (apagada ? " apagada" : "") + '">' +
      '<span class="n">' + U.esc(nombre) + "</span>" +
      '<span class="v">' + (valor === null || valor === undefined ? "—" : valor) + "</span>" +
      '<span class="c">' + U.esc(contra || "") + "</span></div>";
  }

  /* carga de la semana derivada de la serie atl */
  function cargaSemana(lunes, hasta) {
    var d = Salud.datos;
    if (!d || !d.dias) return null;
    var total = 0, hubo = false, f = lunes;
    while (f <= hasta) {
      var ayer = d.dias[U.sumarDias(f, -1)], hoyD = d.dias[f];
      if (hoyD && ayer && typeof hoyD.atl === "number" && typeof ayer.atl === "number") {
        total += ayer.atl + 7 * (hoyD.atl - ayer.atl);
        hubo = true;
      }
      f = U.sumarDias(f, 1);
    }
    return hubo ? Math.max(0, Math.round(total)) : null;
  }

  function htmlMiEstado(dia, sem) {
    /* el botón trae salud.json otra vez sin esperar a que caduque la copia local:
       hace falta justo después de disparar la recolección, para ver lo que ha bajado */
    var h = '<div class="tarjeta"><h2>Mi estado' +
      '<button type="button" class="ent-refresco" data-recargar="1" title="Volver a traer los datos">' +
      (Salud.estado === "cargando" ? "trayendo…" : "actualizar") + "</button></h2>";

    if (!Salud.datos) {
      var por = Salud.estado === "sin-config"
        ? "Para verlo aquí hace falta la sincronización con GitHub: Ajustes → Sincronizar. Es la misma clave que ya usas para los menús."
        : (Salud.estado === "cargando" ? "Trayendo tus datos de intervals…"
          : "No he podido traer <b>datos/salud.json</b>" + (Salud.motivo ? " (" + U.esc(Salud.motivo) + ")" : "") +
            ". Se reintenta solo al volver a entrar.");
      return h + '<p class="nota-peque">' + por + "</p></div>";
    }

    var d = Salud.dia(dia) || Salud.dia(U.sumarDias(dia, -1)) || {};
    var fechaDato = Salud.dia(dia) ? dia : U.sumarDias(dia, -1);
    var farmaco = Salud.conFarmaco(dia);
    var baseVfc = Salud.base("base_vfc"), baseFcr = Salud.base("base_fcr");

    h += '<p class="nota-peque">Automático, de intervals · datos al ' + U.etiquetaFecha(fechaDato) + "</p>";

    h += fila("VFC de anoche", d.vfc ? d.vfc + " ms" : null,
      farmaco ? "con corticoide: sin lectura" : (baseVfc ? "tu base: " + num(baseVfc) : ""), farmaco);
    h += fila("FC en reposo", d.fcr ? d.fcr + " lpm" : null,
      farmaco ? "con corticoide: sin lectura" : (baseFcr ? "tu base: " + num(baseFcr) : ""), farmaco);

    var n1 = Salud.dia(fechaDato) || {}, n2 = Salud.dia(U.sumarDias(fechaDato, -1)) || {};
    var s1 = hhmm(n1.sueno_min), s2 = hhmm(n2.sueno_min);
    h += fila("Sueño, dos últimas noches", (s1 || "—") + (s2 ? " · " + s2 : ""), "tu media: 6h24");

    h += fila("Body Battery al despertar", (d.body_battery || d.body_battery === 0) ? d.body_battery : null, "");

    var bal = (typeof d.ctl === "number" && typeof d.atl === "number") ? d.ctl - d.atl : null;
    h += fila("Forma y fatiga", (typeof d.ctl === "number") ? num(d.ctl) + " / " + num(d.atl) : null,
      bal === null ? "" : "Balance " + signo(bal));

    var cs = cargaSemana(U.lunesDe(dia), dia);
    h += fila("Carga de la semana", cs === null ? null : cs,
      sem ? "objetivo " + sem.carga : "");

    var p = ultimoPeso(dia);
    h += fila("Peso", p ? num(p.kg) + " kg" : null, p ? "del " + U.etiquetaFecha(p.f) : "");

    /* la báscula manda grasa y magra solo los días que te pesas con ella:
       se enseña la última que llegó, con su fecha, para que se vea si está vieja */
    var gBas = ultimoDeSalud("grasa", fechaDato);
    h += fila("Grasa (báscula)", gBas ? num(gBas.v) + " %" : null,
      gBas ? "del " + U.etiquetaFecha(gBas.f) + " · por impedancia" : "aún no ha bajado ninguna de intervals");
    var mBas = ultimoDeSalud("magra", fechaDato);
    if (mBas) h += fila("Masa magra (báscula)", num(mBas.v) + " kg", "del " + U.etiquetaFecha(mBas.f));
    var muBas = ultimoDeSalud("musculo", fechaDato);
    if (muBas) h += fila("Músculo (báscula)", num(muBas.v) + " kg", "del " + U.etiquetaFecha(muBas.f));
    var gCin = grasaPorCinta(dia);
    if (gCin) h += fila("Grasa (cinta)", num(gCin.pct) + " %",
      "del " + U.etiquetaFecha(gCin.fecha) + " · no depende del agua");

    var sis = serieMedida("sistolica", dia, 7), dias2 = serieMedida("diastolica", dia, 7);
    h += fila("Tensión, media de la semana",
      (sis.length && dias2.length) ? Math.round(media(sis)) + "/" + Math.round(media(dias2)) : null,
      sis.length ? sis.length + (sis.length === 1 ? " toma" : " tomas") : "la anotas tú");

    if (farmaco) {
      h += '<p class="nota-peque" style="margin-top:10px">Las filas en gris están dentro de la pauta de ' +
        "corticoide: el fármaco baja la VFC y sube el pulso por sí solo, así que ahí no se interpreta nada.</p>";
    }
    return h + "</div>";
  }

  /* ==================== EVENTOS ==================== */

  function conectar() {
    var cont = document.getElementById("vista-entreno");

    cont.addEventListener("click", function (e) {
      var t = e.target;
      var volver = t.closest ? t.closest("[data-volver]") : null;
      if (volver) { bloque = "portada"; diaSel = null; pintar(); return; }
      var gb = t.closest ? t.closest("[data-guia]") : null;
      if (gb) { e.preventDefault(); abrirGuia(gb.getAttribute("data-guia")); return; }
      var rc = t.closest ? t.closest("[data-recargar]") : null;
      if (rc) {
        e.preventDefault();
        Salud.cargar(true, function () {
          var n = Salud.sembrarPesos();
          if (n) U.toast(n === 1 ? "1 peso traído de intervals" : n + " pesos traídos de intervals");
          pintar();
        });
        pintar();   // para que el botón diga «trayendo…» mientras tanto
        return;
      }
      var ns = t.closest ? t.closest("[data-semana]") : null;
      if (ns) {
        var base = lunesVista || U.lunesDe(U.hoyISO());
        var nuevo = U.sumarDias(base, 7 * parseInt(ns.getAttribute("data-semana"), 10));
        lunesVista = (nuevo === U.lunesDe(U.hoyISO())) ? null : nuevo;
        pintar();
        return;
      }
      var dd = t.closest ? t.closest("[data-dia]") : null;
      if (dd) {
        var f = dd.getAttribute("data-dia");
        diaSel = (f === U.hoyISO()) ? null : f;
        pintar();
        return;
      }
      var b = t.closest ? t.closest("[data-bloque]") : null;
      if (b) { bloque = b.getAttribute("data-bloque"); pintar(); }
    });

    cont.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var dd = e.target.closest ? e.target.closest("[data-dia]") : null;
      if (dd) { e.preventDefault(); dd.click(); }
    });

    cont.addEventListener("change", function (e) {
      var dia = (diaSel && semanaDe(diaSel)) ? diaSel : U.hoyISO(), t = e.target;
      var id = t.getAttribute("data-check");
      if (id) {
        /* al desmarcar una sesión que venía del reloj, se guarda un «no» explícito:
           tu marca manda siempre sobre lo que diga el reloj */
        if (t.checked) marcar(dia, id, true);
        else marcar(dia, id, id.charAt(0) === "s" ? "no" : false);
        pintar();
        return;
      }
      if (t.getAttribute("data-medida")) {
        anotarMedida(dia, t.getAttribute("data-medida"), String(t.value).trim());
        U.toast(dia === U.hoyISO() ? "Anotado" : "Anotado en el " + U.etiquetaFecha(dia));
        pintar();
        return;
      }
      if (t.id === "ent-talla") {
        var sem = semanaDe(U.hoyISO());
        if (sem) { ent().talla[sem.desde] = t.value; A.guardar("entreno"); pintar(); }
      }
    });

    /* cerrar la ventana de la guía: con la × , con «Entendido» o pinchando fuera */
    var modal = document.getElementById("modal");
    if (modal) modal.addEventListener("click", function (e) {
      if (e.target === modal || (e.target.closest && e.target.closest("[data-cerrar-guia]"))) cerrarGuia();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarGuia(); });

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
    if (Salud.deCache()) Salud.sembrarPesos();                // lo de la última vez, para pintar ya
    pintar();
    Salud.cargar(false, function () {                         // y en segundo plano, lo de hoy
      var n = Salud.sembrarPesos();
      if (n) U.toast(n === 1 ? "1 peso traído de intervals" : n + " pesos traídos de intervals");
      var v = document.getElementById("vista-entreno");
      if (v && v.classList.contains("activa")) pintar();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();

})(window);
