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
  /* el icono de «ver histórico», que abre la gráfica emergente */
  var ICONO_GRAF = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 17l5-6 4 4 7-8"/></svg>';

  var MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var DIA_CORTO = ["D", "L", "M", "X", "J", "V", "S"];
  var MIN_SESION = 20;      // minutos a partir de los cuales el reloj marca el día como hecho
  var bloque = "portada";   // "portada" | "plan"
  var diaSel = null;        // día abierto en la tarjeta; null = hoy
  var lunesVista = null;    // lunes de la semana que se enseña abajo; null = la de hoy

  var BLOQUES = [
    { id: "plan", nombre: "El Plan", img: "iconos/khb/3-pesas-corredor.webp",
      pie: "Lo que toca hoy, con sus casillas, y la semana entera a la vista.", listo: true },
    { id: "actividad", nombre: "Actividad", img: "iconos/khb/6-zapatillas.webp",
      pie: "Qué he hecho: el archivo entero, año por año y mes por mes, con su mini mapa.", listo: true },
    { id: "evolucion", nombre: "Evolución", img: "iconos/khb/1-arbol-pulso.webp",
      pie: "Cómo voy: peso y cintura, VFC, pulso en reposo, sueño y vatios por kilo.", listo: true },
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
      ".ent-avisos.pulsable{cursor:pointer;text-align:left;transition:border-color .15s,box-shadow .15s}",
      ".ent-avisos.pulsable:hover,.ent-avisos.pulsable:focus-visible{border-color:var(--azul-borde);",
      "  box-shadow:0 1px 6px rgba(47,92,138,.10);outline:none}",
      ".av-mas{font-size:.72rem;color:var(--azul);font-weight:700;margin-top:2px}",
      ".av-grupo{font-size:.74rem;letter-spacing:.07em;text-transform:uppercase;color:var(--gris);",
      "  font-weight:700;margin:14px 0 6px}",
      ".av-grupo.callados{margin-top:20px}",
      ".av-callados{list-style:none;padding:0;margin:6px 0 0;display:flex;flex-direction:column;gap:4px}",
      ".av-callados li{font-size:.8rem;color:var(--gris)}",
      ".av-callados b{color:var(--tinta);margin-right:5px}",
      /* el pase que ya se aplicó, arriba de El Plan */
      ".pase-aplicado{background:var(--blanco);border:1px solid var(--borde);border-left:3px solid var(--azul);",
      "  border-radius:var(--radio);padding:11px 13px;margin-bottom:12px;cursor:pointer;",
      "  display:flex;flex-direction:column;gap:3px}",
      ".pase-aplicado:hover,.pase-aplicado:focus-visible{box-shadow:0 1px 6px rgba(47,92,138,.10);outline:none}",
      ".pase-aplicado .et{font-size:.68rem;letter-spacing:.09em;text-transform:uppercase;",
      "  color:var(--gris);font-weight:700}",
      ".pase-aplicado b{font-size:.88rem;color:var(--tinta);line-height:1.35}",
      ".pase-aplicado small{font-size:.76rem;color:var(--gris);line-height:1.35}",
      ".pase-aplicado.ok{border-left-color:var(--verde,#2f6b47)}",
      ".pase-aplicado.ojo{border-left-color:var(--ambar);background:var(--ambar-fondo)}",
      ".pase-aplicado.parar{border-left-color:var(--rojo);background:var(--rojo-fondo)}",
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
      ".ent-subt{margin:16px 0 8px;font-size:1rem;color:var(--azul-hondo);",
      "  display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}",
      ".ent-subt.suave{color:var(--gris);font-weight:600;font-size:.92rem;margin-top:18px}",
      ".ent-subt .ent-cuenta{font-size:.72rem;font-weight:600;color:var(--gris);",
      "  border:1px solid var(--borde);border-radius:999px;padding:2px 9px}",
      /* las obligatorias del día se ven de un vistazo, aunque estén vacías */
      ".ent-medidas.obligatorias .ent-medida input{border-color:var(--azul-borde);background:#fbfdff}",
      ".ent-medidas.obligatorias .ent-medida.puesta input{background:var(--azul-claro)}",
      /* importar el csv del tensiómetro */
      ".ent-tension{margin-top:14px;padding:11px 13px;border:1px dashed var(--azul-borde);",
      "  border-radius:12px;background:#fbfdff}",
      ".ent-mini-file{display:inline-block;cursor:pointer}",
      ".ent-mini-file input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}",
      ".ent-mini-file span{display:inline-block;border:1px solid var(--azul-borde);background:var(--azul-claro);",
      "  color:var(--azul-hondo);border-radius:999px;padding:7px 14px;font-size:.84rem;font-weight:600}",
      ".ent-mini-file:hover span{border-color:var(--azul)}",
      ".ent-tension small{display:block;margin-top:7px;font-size:.76rem;color:var(--gris)}",
      /* el parte de la noche */
      ".ent-parte h2{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}",
      ".ent-parte h2 .ent-cuenta{font-size:.68rem;font-weight:600;color:var(--gris);",
      "  border:1px solid var(--borde);border-radius:999px;padding:2px 9px}",
      ".ent-obs{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}",
      ".ent-dia-obs{padding:9px 0;border-bottom:1px solid var(--borde)}",
      ".ent-dia-obs:last-child{border-bottom:0}",
      ".ent-dia-obs b{display:inline-block;min-width:52px;font-size:.82rem;color:var(--azul-hondo);",
      "  text-transform:capitalize}",
      ".ent-dia-obs .ms{font-size:.82rem;color:var(--azul)}",
      ".ent-dia-obs small{display:block;margin:3px 0 0 52px;font-size:.82rem;color:var(--gris);line-height:1.4}",
      ".ent-obs-dice{margin:8px 0 0;font-size:.8rem;line-height:1.45;color:var(--gris);",
      "  border-left:3px solid var(--azul-borde);padding-left:9px}",
      ".ent-obs + .ent-obs-dice{margin-top:10px}",
      ".ent-nota{margin-top:10px}",
      ".ent-preg{margin-top:12px}",
      ".ent-preg .n{display:block;font-size:.78rem;color:var(--gris);margin-bottom:5px}",
      ".ent-preg .ops{display:flex;flex-wrap:wrap;gap:6px}",
      ".ent-ficha{border:1px solid var(--borde);background:#fff;color:var(--tinta);border-radius:999px;",
      "  padding:8px 14px;font:inherit;font-size:.86rem;cursor:pointer}",
      ".ent-ficha:hover{border-color:var(--azul)}",
      ".ent-ficha.puesta{background:var(--azul);border-color:var(--azul);color:#fff;font-weight:600}",
      ".ent-preg .pista{display:block;margin-top:6px;font-size:.76rem;color:var(--gris);line-height:1.4}",
      ".ent-nota{width:100%;border:1px solid var(--borde);border-radius:10px;padding:9px 10px;font:inherit;",
      "  font-size:.9rem;resize:vertical}",
      ".ent-nota:focus{outline:2px solid var(--azul);outline-offset:1px;border-color:var(--azul)}",
      ".ent-mini{border:1px solid var(--azul-borde);background:var(--azul-claro);color:var(--azul-hondo);",
      "  border-radius:999px;padding:3px 10px;font:inherit;font-size:.76rem;font-weight:600;cursor:pointer}",
      /* el pase de la semana */
      ".pase{border-top:3px solid var(--azul)}",
      ".pase-etq{font-size:.7rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;",
      "  color:var(--azul);border:1px solid var(--azul-borde);background:var(--azul-claro);",
      "  border-radius:999px;padding:3px 10px}",
      ".pase-ver{margin:10px 0 4px;padding:13px 15px;border-radius:12px;background:var(--azul-claro);",
      "  border:1px solid var(--azul-borde)}",
      ".pase-ver b{display:block;font-size:1.15rem;color:var(--azul-hondo)}",
      ".pase-ver small{display:block;margin-top:4px;font-size:.85rem;line-height:1.45;color:var(--tinta)}",
      ".pase-ver .prov{display:block;margin-top:6px;font-style:normal;font-size:.74rem;color:var(--gris)}",
      ".pase-subir .pase-ver{background:#eef5f0;border-color:#c3ddcd}",
      ".pase-subir .pase-ver b{color:#2f6b47}",
      ".pase-bajar .pase-ver,.pase-parar .pase-ver{background:var(--ambar-fondo);border-color:#eccf9a}",
      ".pase-bajar .pase-ver b,.pase-parar .pase-ver b{color:#8a5a12}",
      ".pase-barra{position:relative;height:10px;border-radius:999px;background:var(--borde);",
      "  overflow:hidden;margin:6px 0 10px}",
      ".pase-barra i{display:block;height:100%;border-radius:999px;background:var(--azul)}",
      ".pase-barra i.ok{background:#2f6b47}",
      ".pase-barra i.medio{background:var(--ambar)}",
      ".pase-barra i.bajo{background:#b3402f}",
      ".pase-barra .obj{position:absolute;top:-2px;bottom:-2px;left:76.9%;width:2px;background:var(--azul-hondo);opacity:.55}",
      ".pase-fallo{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;padding:8px 0;",
      "  border-bottom:1px solid var(--borde)}",
      ".pase-fallo:last-of-type{border-bottom:0}",
      ".pase-fallo b{min-width:52px;font-size:.82rem;color:var(--azul-hondo);text-transform:capitalize}",
      ".pase-fallo span{font-size:.84rem;color:var(--gris)}",
      ".pase-fallo.salud span{color:#b3402f}",
      ".pase-fallo.agenda span{color:var(--ambar)}",
      ".pase-fallo small{flex:1 1 100%;margin-left:52px;font-size:.8rem;color:var(--gris)}",
      ".pase-prox{margin:4px 0 0;font-size:.9rem;line-height:1.5;padding:11px 13px;border-radius:11px;",
      "  background:var(--azul-claro);border:1px solid var(--azul-borde);color:var(--azul-hondo)}",
      /* evolución: las series largas */
      ".evo-rangos{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}",
      ".evo-r{border:1px solid var(--borde);background:#fff;color:var(--gris);border-radius:999px;",
      "  padding:6px 13px;font:inherit;font-size:.78rem;font-weight:600;cursor:pointer}",
      ".evo-r.activo{background:var(--azul);border-color:var(--azul);color:#fff}",
      ".evo-t{border-top:3px solid var(--azul)}",
      ".evo-cab{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}",
      ".evo-cab h2{flex:1 1 auto;margin:0}",
      ".evo-v{font-size:1.25rem;font-weight:700;color:var(--azul-hondo)}",
      ".evo-u{font-size:.72rem;color:var(--gris)}",
      ".evo-pie{margin:2px 0 10px}",
      ".evo-svg{display:block;width:100%;max-width:520px;height:auto;overflow:visible}",
      ".evo-sub{margin:16px 0 6px;font-size:.86rem;font-weight:700;color:var(--azul-hondo)}",
      ".evo-ley{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px;font-size:.72rem;color:var(--gris)}",
      ".evo-ley span{display:inline-flex;align-items:center;gap:5px}",
      ".evo-ley i{width:12px;height:3px;border-radius:2px;display:inline-block}",
      ".evo-nota{margin:10px 0 0;font-size:.82rem;line-height:1.45;color:var(--tinta)}",
      ".evo-vacio{border:1px dashed var(--azul-borde);background:var(--azul-claro);border-radius:11px;",
      "  padding:16px 14px;text-align:center}",
      ".evo-vacio b{display:block;font-size:.88rem;color:var(--azul-hondo)}",
      ".evo-vacio small{display:block;margin-top:5px;font-size:.78rem;color:var(--gris)}",
      ".ent-refresco{float:right;border:1px solid var(--azul-borde);background:var(--azul-claro);",
      "  color:var(--azul-hondo);border-radius:999px;padding:4px 11px;font:inherit;font-size:.72rem;",
      "  font-weight:600;cursor:pointer}",
      ".ent-refresco:hover{border-color:var(--azul)}",
      /* guías de sesión */
      ".ent-soltar{border:0;background:none;padding:0 0 0 4px;font:inherit;font-size:.78rem;",
      "  color:var(--azul);text-decoration:underline;cursor:pointer}",
      ".ent-soltar:hover{color:var(--azul-hondo)}",
      ".ent-comose{margin-left:8px;border:1px solid var(--azul-borde);background:var(--azul-claro);",
      "  color:var(--azul-hondo);border-radius:999px;padding:2px 9px;font:inherit;font-size:.68rem;",
      "  font-weight:700;letter-spacing:.02em;cursor:pointer;vertical-align:1px}",
      ".ent-comose:hover{border-color:var(--azul)}",
      ".ses-reglas{margin-top:10px;padding:11px 13px;border-radius:11px;background:var(--azul-claro);",
      "  border:1px solid var(--azul-borde)}",
      ".ses-reglas b{display:block;font-size:.85rem;color:var(--azul-hondo);margin-bottom:4px}",
      ".ses-reglas ul{margin:0;padding-left:18px;font-size:.86rem;line-height:1.5}",
      ".ses-bloque{margin-top:14px}",
      ".ses-bloque h3{display:flex;align-items:baseline;gap:8px;margin:0 0 5px;font-size:.95rem;",
      "  color:var(--azul-hondo)}",
      ".ses-bloque h3 .min{font-size:.7rem;font-weight:600;color:var(--gris);border:1px solid var(--borde);",
      "  border-radius:999px;padding:1px 8px}",
      ".ses-bloque ol{margin:0;padding-left:20px;font-size:.88rem;line-height:1.5}",
      ".ses-bloque li{margin-bottom:4px}",
      /* tendencia: chispa y punto de color */
      ".chispa{display:inline-flex;align-items:center;line-height:0}",
      ".chispa.vacia{width:74px;height:20px;border-bottom:1px dashed var(--borde)}",
      ".tend-punto{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;",
      "  flex:none;vertical-align:1px}",
      "button.ent-fila{display:flex;align-items:center;gap:8px}",
      "button.ent-fila .ch{flex:none;display:none}",
      "@media(min-width:420px){button.ent-fila .ch{display:inline-flex}}",
      ".ent-estim.con-tend{border-left:3px solid var(--azul-borde)}",
      ".ent-estim.t-bien{border-left-color:#2f6b47}",
      ".ent-estim.t-mal{border-left-color:#b3402f}",
      ".ent-estim.t-plano{border-left-color:#8aa0b5}",
      ".ent-estim.t-nada{border-left-color:#c7cfcb}",
      ".ent-estim.t-exceso{border-left-color:#5b3a7e}",
      ".ent-estim.t-exceso .est-tend{color:#5b3a7e}",
      /* Mi estado: el mismo rectángulo, con el valor grande y la barra */
      ".est-tarj{display:block;width:100%;text-align:left;font:inherit}",
      "button.est-tarj{cursor:pointer;-webkit-appearance:none}",
      "button.est-tarj:hover,button.est-tarj:focus-visible{background:#e2ebf4;outline:none}",
      ".est-tarj .est-cab{align-items:flex-start;gap:9px}",
      ".est-tarj .est-txt{flex:1 1 auto;min-width:0}",
      ".est-tarj .est-txt b{display:block;line-height:1.25}",
      ".est-tarj .est-txt small{display:block;margin-top:3px;color:var(--gris);",
      "  font-size:.78rem;line-height:1.3}",
      ".est-tarj .chispa{margin-top:3px}",
      ".est-tarj .est-val{flex:none;font-size:1.2rem;font-weight:700;line-height:1.15;",
      "  color:var(--azul-hondo);font-variant-numeric:tabular-nums}",
      ".est-barra{margin-top:9px;height:6px;border-radius:999px;background:#dfe7ee;",
      "  position:relative;overflow:visible}",
      ".est-barra i{position:absolute;top:0;bottom:0;left:0;border-radius:999px}",
      ".est-barra .marca{position:absolute;top:-3px;bottom:-3px;width:2px;",
      "  background:var(--azul-hondo);opacity:.55;border-radius:1px}",
      ".est-pie{display:flex;justify-content:space-between;gap:8px;margin-top:4px;",
      "  font-size:.68rem;color:var(--gris)}",
      ".est-pie span:nth-child(2){flex:1 1 auto;text-align:center}",
      "@media(max-width:400px){.est-tarj .est-val{font-size:1.05rem}}",
      ".est-cab{display:flex;align-items:center;gap:10px;justify-content:space-between}",
      ".est-cab b{flex:1 1 auto;min-width:0}",
      ".est-tend{display:block;margin-top:6px;font-style:normal;font-size:.72rem;font-weight:700;",
      "  letter-spacing:.03em;text-transform:uppercase;color:var(--gris)}",
      ".ent-estim.t-bien .est-tend{color:#2f6b47}",
      ".ent-estim.t-mal .est-tend{color:#b3402f}",
      /* la ventanita de las gráficas */
      ".graf-caja{position:relative}",
      ".graf-tip{position:absolute;display:none;pointer-events:none;background:var(--azul-hondo);",
      "  color:#fff;border-radius:8px;padding:5px 9px;font-size:.74rem;line-height:1.25;white-space:nowrap;",
      "  box-shadow:0 2px 8px rgba(19,50,83,.25);z-index:3}",
      ".graf-tip b{display:block;font-size:.84rem}",
      ".graf-tip span{opacity:.75}",
      ".graf-guia{position:absolute;display:none;top:0;bottom:16px;width:1px;background:var(--azul);",
      "  opacity:.35;pointer-events:none;z-index:2}",
      ".graf-pie{margin:6px 0 0;font-size:.76rem;line-height:1.45;color:var(--gris)}",
      /* el histórico emergente */
      ".ent-ver{margin-left:4px;border:0;background:none;color:var(--azul);cursor:pointer;padding:0 2px;",
      "  line-height:0;vertical-align:-1px;opacity:.75}",
      ".ent-ver:hover{opacity:1}",
      "button.ent-fila{width:100%;text-align:left;background:none;font:inherit;cursor:pointer}",
      "button.ent-fila:hover{background:var(--azul-claro)}",
      "button.ent-fila .n{display:flex;align-items:center;gap:4px;color:var(--azul-hondo)}",
      ".hist-graf{margin:10px 0 6px}",
      ".hist-filas{border-top:1px solid var(--borde);padding-top:4px}",
      ".hist-n{font-size:.72rem;color:var(--gris);padding:8px 0 0}",
      ".hist-pie{margin:12px 0 0;font-size:.85rem;line-height:1.45;color:var(--gris)}",
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
      /* verde cumplido · rojo sin cumplir · ámbar lo que cae fuera del plan ·
         azul lo vigente y lo pendiente */
      ".ent-dia.ok{background:#eef5f0;border-color:#bcd6c6}",
      ".ent-dia.fallo{background:var(--rojo-fondo);border-color:#e3b4ab}",
      ".ent-dia.fuera{background:var(--ambar-fondo);border-color:#eccf9a}",
      ".ent-dia.pend{background:var(--azul-claro);border-color:var(--azul-borde)}",
      ".ent-dia.hoy{border-color:var(--azul);background:var(--azul-claro);box-shadow:inset 0 -3px 0 var(--azul)}",
      ".ent-dia.sel{border-color:var(--azul);border-width:2px;background:var(--azul-claro)}",
      ".ent-dia .d{font-weight:700;font-size:.8rem;color:var(--azul-hondo)}",
      ".ent-dia .f{font-size:.66rem;color:var(--gris)}",
      ".ent-dia .q{font-size:.64rem;color:var(--gris);line-height:1.25;overflow-wrap:anywhere}",
      ".ent-dia .p{width:9px;height:9px;border-radius:50%;background:var(--borde);margin-top:auto;flex:none}",
      ".ent-dia.ok .p{background:#2f6b47}",
      ".ent-dia.fallo .p{background:#b3402f}",
      ".ent-dia.fuera .p{background:#e0c48c}",
      ".ent-dia.pend .p{background:var(--azul-borde)}",
      ".ent-dia.hoy.ok .p{background:#2f6b47}",       /* hoy sigue azul, pero el punto ya dice que está hecho */
      ".ent-dia.fuera .q,.ent-dia.fuera .f{color:#8a7448}",
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
      /* La pauta tiene fecha de fin en el puente (14 a 28 de septiembre): el día
         que termina dejan de sombrearse las filas y desaparece la nota. */
      var t = P.tratamientos || [];
      if (t.length) {
        for (var j = 0; j < t.length; j++) {
          if (t[j].desde && iso >= t[j].desde && (!t[j].hasta || iso <= t[j].hasta)) return true;
        }
        return false;
      }
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

  /* marca: true = hecha · "no" = NO hecha · nada = lo que diga el reloj.
     El «no» se guarda CON LA HORA en que se puso —{v:"no", t:<ms>}— porque un
     «no» de las nueve de la mañana no puede desmentir una caminata de las seis
     de la tarde. Los «no» antiguos, que son la cadena "no" sin hora, siguen
     valiendo y siguen mandando siempre. */
  function marcaDe(iso, id) { var d = ent().checks[iso]; return d ? d[id] : undefined; }
  function valorMarca(m) { return (m && typeof m === "object") ? m.v : m; }
  function horaMarca(m) { return (m && typeof m === "object" && m.t) ? m.t : null; }
  function marcado(iso, id) { return valorMarca(marcaDe(iso, id)) === true; }

  function marcar(iso, id, valor) {
    var c = ent().checks;
    if (!c[iso]) c[iso] = {};
    if (valor === true) c[iso][id] = true;
    else if (valor === "no") c[iso][id] = { v: "no", t: Date.now() };
    else delete c[iso][id];
    if (c[iso] && !Object.keys(c[iso]).length) delete c[iso];
    A.guardar("entreno");
  }

  /* ---------- observaciones del día ----------
     Los motivos que explican por qué un día se sale de la raya. Viven en el
     estado de la app, así que viajan en la sincronización de siempre: no hace
     falta teclear nada en intervals, que es justo lo que no se hacía. */
  function obsDe(iso) {
    var o = ent().obs;
    return (o && o[iso]) || null;
  }

  function motivosDe(iso) {
    var d = obsDe(iso);
    return (d && d.m) || [];
  }

  function tieneObs(iso, v) { return motivosDe(iso).indexOf(v) >= 0; }

  function alternarObs(iso, v) {
    var e = ent();
    if (!e.obs) e.obs = {};
    if (!e.obs[iso]) e.obs[iso] = { m: [] };
    var d = e.obs[iso], i = d.m.indexOf(v);
    if (i >= 0) d.m.splice(i, 1); else d.m.push(v);
    d.hora = new Date().toTimeString().slice(0, 5);
    if (!d.m.length && !d.nota) delete e.obs[iso];
    A.guardar("entreno");
  }

  function anotarNotaObs(iso, texto) {
    var e = ent();
    if (!e.obs) e.obs = {};
    if (!e.obs[iso]) e.obs[iso] = { m: [] };
    var d = e.obs[iso];
    if (texto) d.nota = texto; else delete d.nota;
    d.hora = new Date().toTimeString().slice(0, 5);
    if (!d.m.length && !d.nota) delete e.obs[iso];
    A.guardar("entreno");
  }

  /* el motivo, tal como está definido en el puente */
  function motivo(v) {
    var l = (P.observaciones && P.observaciones.motivos) || [];
    for (var i = 0; i < l.length; i++) if (l[i].v === v) return l[i];
    return null;
  }

  /* días seguidos, hacia atrás, con algún motivo de ese efecto */
  function rachaObs(iso, efectos) {
    var n = 0;
    for (var i = 0; i < 21; i++) {
      var f = U.sumarDias(iso, -i), hay = false;
      motivosDe(f).forEach(function (v) {
        var m = motivo(v);
        if (m && efectos.indexOf(m.efecto) >= 0) hay = true;
      });
      if (hay) n++; else break;
    }
    return n;
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

  /* ==================== TENSIÓN: TOMAS ====================
     Dos fuentes que se suman: lo que tecleas en la tarjeta del día y lo que
     llega del CSV del tensiómetro. Una toma es una toma, venga de donde venga;
     lo único que no se admite es contar dos veces la misma. */

  function tomasImportadas() {
    var e = ent();
    if (!e.tension) e.tension = [];
    return e.tension;
  }

  function claveToma(t) {
    return t.f + "|" + (t.h || "") + "|" + t.sis + "/" + t.dia;
  }

  /* Todas las tomas entre dos fechas, ordenadas. Las tecleadas a mano cuentan
     como una toma del día, sin hora. */
  function tomasTension(desde, hasta) {
    var out = [], vistas = {};
    /* las que ya venían en salud.json, del export que sembramos en su día */
    var sd = Salud.datos;
    if (sd && sd.tension) {
      sd.tension.forEach(function (x) {
        var f = String(x.fecha || "").slice(0, 10);
        if (!f || f < desde || f > hasta) return;
        var t = { f: f, h: String(x.fecha || "").slice(11, 16), sis: Math.round(x.sis),
                  dia: Math.round(x.dia), pul: x.pulso ? Math.round(x.pulso) : null,
                  arr: !!x.arritmia, origen: x.origen || "omron" };
        if (!(t.sis > 0) || !(t.dia > 0)) return;
        var k = claveToma(t);
        if (vistas[k]) return;
        vistas[k] = 1;
        vistas["d" + t.f + "|" + t.sis + "/" + t.dia] = 1;
        out.push(t);
      });
    }
    tomasImportadas().forEach(function (t) {
      if (t.f < desde || t.f > hasta) return;
      var k = claveToma(t);
      if (vistas[k]) return;
      vistas[k] = 1;
      vistas["d" + t.f + "|" + t.sis + "/" + t.dia] = 1;
      out.push(t);
    });
    var m = ent().medidas;
    for (var f in m) {
      if (f < desde || f > hasta) continue;
      var s = parseFloat(m[f].sistolica), d = parseFloat(m[f].diastolica), p = parseFloat(m[f].pulso);
      if (!(s > 0) || !(d > 0)) continue;
      var t2 = { f: f, h: "", sis: Math.round(s), dia: Math.round(d), pul: p > 0 ? Math.round(p) : null, origen: "mano" };
      var k2 = claveToma(t2), kDia = t2.f + "|" + t2.sis + "/" + t2.dia;
      /* si esa misma cifra ya vino del aparato ese día —aunque con su hora—,
         es la misma toma tecleada a mano: no se cuenta dos veces */
      if (vistas[k2] || vistas["d" + kDia]) continue;
      vistas[k2] = 1;
      out.push(t2);
    }
    return out.sort(function (a, b) {
      return (a.f + (a.h || "")) < (b.f + (b.h || "")) ? -1 : 1;
    });
  }

  function mediaTension(desde, hasta) {
    var t = tomasTension(desde, hasta);
    if (!t.length) return null;
    var s = 0, d = 0, p = 0, np = 0;
    t.forEach(function (x) {
      s += x.sis; d += x.dia;
      if (x.pul) { p += x.pul; np++; }
    });
    return { sis: s / t.length, dia: d / t.length, pul: np ? p / np : null, n: t.length,
             alta: (s / t.length) >= 140 || (d / t.length) >= 90 };
  }

  /* ---------- el CSV del tensiómetro ----------
     Los exports de Omron cambian de columnas según la versión y el idioma, así
     que no se asume un formato: se busca cada dato por el nombre de su columna
     y, si no hay cabecera reconocible, por la forma de los números. */

  function partirLinea(linea, sep) {
    var out = [], act = "", dentro = false;
    for (var i = 0; i < linea.length; i++) {
      var c = linea.charAt(i);
      if (c === '"') { dentro = !dentro; continue; }
      if (c === sep && !dentro) { out.push(act); act = ""; continue; }
      act += c;
    }
    out.push(act);
    return out.map(function (x) { return x.replace(/^\s+|\s+$/g, ""); });
  }

  function normaliza(s) {
    return String(s).toLowerCase()
      .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
      .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/\s+/g, " ");
  }

  /* Meses escritos, que es como los manda el tensiómetro: "18 sep. 2026".
     Se admiten tres o cuatro letras y el nombre entero, en español e inglés. */
  var MESES_TXT = {
    ene: 1, enero: 1, jan: 1, january: 1,
    feb: 2, febrero: 2, february: 2,
    mar: 3, marzo: 3, march: 3,
    abr: 4, abril: 4, apr: 4, april: 4,
    may: 5, mayo: 5,
    jun: 6, junio: 6, june: 6,
    jul: 7, julio: 7, july: 7,
    ago: 8, agosto: 8, aug: 8, august: 8,
    sep: 9, sept: 9, septiembre: 9, september: 9,
    oct: 10, octubre: 10, october: 10,
    nov: 11, noviembre: 11, november: 11,
    dic: 12, diciembre: 12, dec: 12, december: 12
  };

  /* "18/09/2026", "2026-09-18", "18.09.2026", "18 sep. 2026" → "2026-09-18" */
  function fechaDeTexto(txt) {
    var t = String(txt).replace(/^\s+|\s+$/g, "");
    var m = t.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
    if (m) return m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
    m = t.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
    if (m) return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);

    var n = normaliza(t).replace(/\./g, " ").replace(/,/g, " ");
    /* día mes año: «18 sep 2026» */
    m = n.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
    if (m && MESES_TXT[m[2]]) {
      return m[3] + "-" + ("0" + MESES_TXT[m[2]]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
    }
    /* mes día año: «sep 18 2026» */
    m = n.match(/([a-z]+)\s+(\d{1,2})\s+(\d{4})/);
    if (m && MESES_TXT[m[1]]) {
      return m[3] + "-" + ("0" + MESES_TXT[m[1]]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
    }
    return null;
  }

  function horaDeTexto(txt) {
    var m = String(txt).match(/(\d{1,2}):(\d{2})/);
    if (!m) return "";
    var h = parseInt(m[1], 10);
    if (/p\.?\s?m/i.test(txt) && h < 12) h += 12;
    if (/a\.?\s?m/i.test(txt) && h === 12) h = 0;
    return ("0" + h).slice(-2) + ":" + m[2];
  }

  function leerCsvTension(texto) {
    var lineas = String(texto).replace(/\r/g, "").split("\n").filter(function (l) { return l.replace(/[\s,;]/g, "").length; });
    if (!lineas.length) return { tomas: [], error: "El fichero está vacío." };

    /* separador: el que más aparece en la primera línea */
    var sep = ",", mejor = 0;
    [",", ";", "\t"].forEach(function (s) {
      var n = lineas[0].split(s).length;
      if (n > mejor) { mejor = n; sep = s; }
    });
    if (mejor < 2) return { tomas: [], error: "No parece un CSV: no encuentro columnas." };

    /* cabecera: se busca en las cinco primeras líneas */
    var cab = -1, col = {};
    for (var i = 0; i < Math.min(5, lineas.length) && cab < 0; i++) {
      var campos = partirLinea(lineas[i], sep).map(normaliza), c = {};
      campos.forEach(function (n, j) {
        if (c.sis === undefined && /sist|systol|sys|alta|superior/.test(n)) c.sis = j;
        else if (c.dia === undefined && /diast|dia\b|baja|inferior/.test(n)) c.dia = j;
        else if (c.pul === undefined && /puls|heart|hr\b|lpm|bpm|frecuencia/.test(n)) c.pul = j;
        if (c.fec === undefined && /fecha|date|dia y hora|measurement/.test(n)) c.fec = j;
        if (c.hor === undefined && /hora|time/.test(n) && !/fecha|date/.test(n)) c.hor = j;
        if (c.arr === undefined && /irregul|arritm|ihb/.test(n)) c.arr = j;
      });
      if (c.sis !== undefined && c.dia !== undefined) { cab = i; col = c; }
    }

    var tomas = [], malas = 0;
    for (var k = (cab >= 0 ? cab + 1 : 0); k < lineas.length; k++) {
      var f = partirLinea(lineas[k], sep);
      var fecha = null, hora = "", sis = null, dia = null, pul = null, arr = false;

      if (cab >= 0) {
        fecha = fechaDeTexto(f[col.fec !== undefined ? col.fec : 0]);
        hora = horaDeTexto(f[col.hor !== undefined ? col.hor : (col.fec !== undefined ? col.fec : 0)]);
        sis = parseFloat(String(f[col.sis]).replace(",", "."));
        dia = parseFloat(String(f[col.dia]).replace(",", "."));
        if (col.pul !== undefined) pul = parseFloat(String(f[col.pul]).replace(",", "."));
        if (col.arr !== undefined) arr = /1|si|sí|yes|true|x/i.test(f[col.arr] || "");
      } else {
        /* sin cabecera: fecha en algún campo y los dos primeros números con
           pinta de tensión (60-260 y 30-160) */
        for (var j = 0; j < f.length && !fecha; j++) fecha = fechaDeTexto(f[j]);
        for (var j2 = 0; j2 < f.length && !hora; j2++) hora = horaDeTexto(f[j2]);
        var nums = [];
        f.forEach(function (x) {
          var n = parseFloat(String(x).replace(",", "."));
          if (!isNaN(n) && n >= 25 && n <= 260 && !/[-\/:]/.test(String(x))) nums.push(n);
        });
        if (nums.length >= 2) { sis = nums[0]; dia = nums[1]; if (nums.length > 2) pul = nums[2]; }
      }

      if (!fecha || !(sis >= 60 && sis <= 260) || !(dia >= 30 && dia <= 160) || dia >= sis) { malas++; continue; }
      tomas.push({ f: fecha, h: hora, sis: Math.round(sis), dia: Math.round(dia),
                   pul: (pul >= 30 && pul <= 220) ? Math.round(pul) : null,
                   arr: !!arr, origen: "omron" });
    }
    return { tomas: tomas, malas: malas, conCabecera: cab >= 0 };
  }

  /* mete las tomas nuevas en el almacén; devuelve el recuento */
  function importarTomas(tomas) {
    var lista = tomasImportadas(), hay = {}, nuevas = 0;
    lista.forEach(function (t) { hay[claveToma(t)] = 1; });
    tomas.forEach(function (t) {
      var k = claveToma(t);
      if (hay[k]) return;
      hay[k] = 1;
      lista.push(t);
      nuevas++;
    });
    lista.sort(function (a, b) { return (a.f + (a.h || "")) < (b.f + (b.h || "")) ? -1 : 1; });
    if (nuevas) A.guardar("entreno");
    return { nuevas: nuevas, repetidas: tomas.length - nuevas, total: lista.length };
  }

  /* ==================== EL PLAN: CÁLCULO ==================== */

  function diasEntre(a, b) { return Math.round((U.desdeISO(b) - U.desdeISO(a)) / 86400000); }

  /* ==================== LA RAMPA ES UNA COLA, NO UN CALENDARIO ====================
     El calendario dice QUÉ SEMANA es; el pase dice POR QUÉ PELDAÑO vas. Si una
     semana se queda corta, el lunes siguiente no sube: repite. Así la rampa
     avanza cuando avanzas tú, y nadie tiene que llevar la cuenta de memoria. */

  /* el hueco del calendario en el que cae un día, y qué peldaño le tocaría
     si todo hubiese ido bien */
  function tramoNatural(iso) {
    for (var i = 0; i < P.rampa.length; i++) {
      var r = P.rampa[i];
      if (iso >= r.desde && iso <= r.hasta) {
        if (r.n < 13) return { i: i, desde: r.desde, hasta: r.hasta };
        var k = Math.floor(diasEntre(r.desde, U.lunesDe(iso)) / 7);     // crucero: una semana por hueco
        return { i: i + k, desde: U.lunesDe(iso), hasta: U.sumarDias(U.lunesDe(iso), 6) };
      }
    }
    return null;
  }

  /* el contenido de un peldaño; pasado el 13 se genera el crucero */
  function peldano(idx) {
    if (idx < 0) idx = 0;
    if (idx < P.rampa.length - 1) {
      var r = P.rampa[idx];
      return { n: r.n, carga: r.carga, talla: r.talla, nota: r.nota, criterio: r.criterio };
    }
    var base = P.rampa[P.rampa.length - 1], k = idx - (P.rampa.length - 1);
    var descarga = (k % 4) === 3;                                       // tres semanas y la cuarta de descarga
    return { n: base.n + k, carga: descarga ? Math.round(base.carga * 0.65) : base.carga,
             talla: descarga ? "B" : "A", nota: descarga ? "Descarga" : base.nota };
  }

  function registroPase() { var e = ent(); if (!e.pase) e.pase = {}; return e.pase; }

  /* cuántos peldaños te has quedado atrás por los pases ya aplicados */
  function desfaseHasta(desde) {
    var reg = registroPase(), suma = 0;
    for (var k in reg) if (k < desde) suma += (reg[k].d || 0);
    return suma;
  }

  function semanaDe(iso) {
    var t = tramoNatural(iso);
    if (!t) return null;
    var des = desfaseHasta(t.desde), p = peldano(t.i + des);
    return { n: p.n, desde: t.desde, hasta: t.hasta, carga: p.carga, talla: p.talla,
             /* la nota describía esa semana en el calendario original; si vas
                retrasado ya no es verdad, así que no se arrastra */
             nota: des === 0 ? p.nota : "", criterio: p.criterio,
             natural: peldano(t.i).n, desfase: des, idx: t.i + des };
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
        var ms = null;
        if (a.fecha && String(a.fecha).length > 10) {
          var d0 = new Date(String(a.fecha).replace(" ", "T"));
          if (!isNaN(d0.getTime())) ms = d0.getTime();
        }
        return {
          min: Math.round(a.min_mov || a.min || 0),
          nombre: a.nombre || a.tipo || "Actividad",
          ms: ms,
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

  /* Hay sesiones que el reloj no registra nunca —la movilidad de cuello, por
     ejemplo—: para ésas la casilla es la única fuente y no tiene sentido
     esperar a un dato que no va a llegar. */
  function sinReloj(sesion) {
    var l = P.familiasSinReloj || [];
    return l.indexOf(familia(sesion.t)) >= 0;
  }

  /* ¿Hay una actividad medida que encaje con ESTA sesión? */
  function relojPara(iso, sesion) {
    if (sinReloj(sesion)) return null;
    var fam = familia(sesion.t), reg = registradas(iso), umbral = Math.max(MIN_SESION, Math.round((sesion.min || 45) * 0.6));
    if (sesion.grande) umbral = MIN_SESION;
    for (var i = 0; i < reg.length; i++) {
      if ((reg[i].fam === fam || (sesion.grande && (reg[i].fam === "caminar" || reg[i].fam === "bici"))) &&
          reg[i].min >= umbral) return reg[i];
    }
    return null;
  }

  /* ¿Hay una actividad que desmienta un «no»? Solo cuenta la que EMPEZÓ
     después de que pusieras el «no»: si desmarcas una sesión que el reloj ya
     había registrado, sigues diciendo «esa actividad no era la sesión», y eso
     manda. */
  function desmienteAlNo(iso, sesion, m) {
    var t = horaMarca(m);
    if (!t) return null;                     // «no» viejo, sin hora: manda siempre
    var r = relojPara(iso, sesion);
    return (r && r.ms && r.ms > t) ? r : null;
  }

  function sesionHecha(iso, sesion, i) {
    var m = marcaDe(iso, "s" + i), v = valorMarca(m);
    if (v === true) return true;
    if (sinReloj(sesion)) return false;        // sin reloj que valga, manda la casilla
    if (v === "no") return !!desmienteAlNo(iso, sesion, m);
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
      if (t.desde && iso < t.desde) return;        // todavía no toca acordarse
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
        k: "peso",
        t: "Peso: media de 7 días " + num(a.m) + " kg",
        d: b && b.n >= 2
          ? signo(a.m - b.m) + " kg respecto a la semana anterior (" + num(b.m) + "). El objetivo del plan es entre −0,3 y −0,5 kg por semana."
          : "Con " + a.n + " pesadas. Hacen falta dos semanas para poder comparar."
      });
    } else if (a) {
      out.push({ k: "peso", t: "Peso: " + num(a.m) + " kg", d: "Una sola pesada esta semana. El dato del día oscila más de un kilo por agua y tránsito: lo que cuenta es la media." });
    }

    /* la grasa por cinta tiene su tarjeta arriba, con su serie y su tendencia:
       repetir aquí el mismo número no añadía nada. Lo que sí añade —el contraste
       con la báscula— está en la lectura siguiente. */
    var g = grasaPorCinta(dia);

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
      if (tieneObs(gb.f, "seco")) {
        det += " Ojo: ese día marcaste deshidratado, y la impedancia con poca agua sube el " +
          "porcentaje de grasa sin que hayas engordado. Ese dato vale menos que el de la cinta.";
      }
      if (atraso > 21) det += " Es la última que mandó la báscula: desde entonces no ha bajado ninguna.";
      /* el número de la báscula ya está en Mi estado con su tendencia: aquí
         solo va lo que esa tarjeta no puede decir, que es el contraste entre
         los dos métodos */
      out.push({ k: "grasa",
        t: g ? "Báscula y cinta: " + num(Math.abs(g.pct - gb.v)) + " puntos de diferencia"
             : "La báscula y la cinta todavía no se pueden contrastar",
        d: det });
    }

    /* lo que dicen las observaciones del día */
    var mots = motivosDe(dia);
    if (mots.length) {
      /* manda el efecto más serio de los marcados: parar > limitar > vigilar > agenda */
      var ORDEN = ["parar", "limitar", "vigilar", "agenda"], nombres = [], hay = {};
      mots.forEach(function (v) {
        var m = motivo(v);
        if (!m) return;
        nombres.push(m.n.toLowerCase());
        hay[m.efecto] = true;
      });
      var manda = null;
      for (var iO = 0; iO < ORDEN.length; iO++) if (hay[ORDEN[iO]]) { manda = ORDEN[iO]; break; }
      if (manda) {
        /* la racha cuenta también lo más serio: una limitante después de una
           invalidante son dos días seguidos con la misma pierna rota */
        var cuenta = manda === "agenda" ? ["agenda"] : ORDEN.slice(0, ORDEN.indexOf(manda) + 1);
        if (manda === "vigilar" || manda === "limitar") cuenta = ["parar", "limitar", "vigilar"];
        var racha = rachaObs(dia, cuenta);
        var txt = P.observaciones.textos[manda];
        if (manda === "vigilar" && racha >= 2) {
          txt = "Van " + racha + " días seguidos con esto. Dos ya son motivo para bajar la intensidad " +
            "de la semana en vez de seguir como si nada.";
        }
        if (manda === "limitar" && racha >= 3) {
          txt += " Y van " + racha + " días seguidos: si a la semana no ha remitido, deja de ser " +
            "cosa del plan y pasa a ser cosa de la consulta.";
        }
        var notaHoy = (obsDe(dia) || {}).nota;
        out.push({
          t: "Hoy: " + nombres.join(", ") + (racha > 1 ? " · " + racha + " días seguidos" : ""),
          d: (notaHoy ? "«" + notaHoy + "». " : "") + txt
        });
      }
    }

    /* cintura / altura */
    var rc = cinturaAltura(dia);
    if (rc) {
      out.push({
        k: "cintura",
        t: "Cintura ÷ altura: " + rc.ratio.toFixed(2).replace(".", ","),
        d: "El umbral de riesgo bajo está en 0,50, que para tus " + rc.altura + " cm son " + rc.objetivo +
          " cm de cintura. Ahora vas por " + num(rc.cintura) + " cm: " +
          (rc.ratio < 0.5 ? "dentro." : "te faltan " + num(rc.faltan) + " cm.")
      });
    }

    /* el tobillo y la tensión viven arriba, en «Lo que estoy midiendo», cada uno
       con su serie. Lo que decían aquí —el tobillo contra su media— se dice
       ahora en su propia tarjeta, donde está el número. */

    /* Muslo y brazo también tienen su tarjeta con su serie, y el aviso M8 ya
       salta si el muslo pierde un centímetro con el peso bajando. Una tercera
       versión del mismo número sobraba. */

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

    /* M6 y M7 — tensión, con TODAS las tomas: tecleadas y las del aparato */
    var tomas14 = tomasTension(U.sumarDias(dia, -13), dia);
    d = def("M7");
    if (d) {
      var ayer = U.sumarDias(dia, -1);
      var picos = tomas14.filter(function (x) {
        return x.f >= ayer && (x.sis >= d.umbral_sis || x.dia >= d.umbral_dia);
      });
      if (picos.length) {
        var pk = picos[picos.length - 1];
        out.push({ d: d, dato: "toma de " + pk.sis + "/" + pk.dia + (pk.h ? " (" + pk.h + ")" : "") });
      }
    }
    d = def("M6");
    if (d && tomas14.length >= d.tomas) {
      var ult = tomas14.slice(-d.tomas);
      var ms = 0, md = 0;
      ult.forEach(function (x) { ms += x.sis; md += x.dia; });
      ms /= ult.length; md /= ult.length;
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

    /* ---------- M9 — la carga se está quedando corta ----------
       El pase del domingo ya juzga la semana cerrada, así que repetir aquí lo
       mismo sobraría. Este aviso mira ADELANTE: la semana pasada quedó por
       debajo del 70 % y ésta lleva el mismo camino a estas alturas. Sirve
       mientras aún se puede hacer algo, que es lo que el pase no puede dar. */
    d = def("M9");
    if (d) {
      var semAct = semanaDe(dia), semAnt = semAct ? semanaAnteriorDe(semAct) : null;
      if (semAct && semAnt && semAct.criterio !== "asistencia" && semAnt.criterio !== "asistencia" &&
          semAct.carga && semAnt.carga) {
        var cAnt = cargaSemana(semAnt.desde, semAnt.hasta);
        var pctAnt2 = (cAnt === null) ? null : cAnt / semAnt.carga;
        if (pctAnt2 !== null && pctAnt2 < d.umbral) {
          var rep = repartoSemana(semAct, dia), objHoy = semAct.carga * rep.parte;
          var cAct = cargaSemana(semAct.desde, dia);
          /* con menos de dos días corridos no hay nada que anticipar */
          if (cAct !== null && objHoy > 0 && rep.parte >= 0.25 && (cAct / objHoy) < d.umbral) {
            out.push({ d: d, dato: "la semana pasada quedó en el " + Math.round(pctAnt2 * 100) +
              " % y ésta va por el " + Math.round((cAct / objHoy) * 100) + " % de lo que tocaría" });
          }
        }
      }
    }

    /* ---------- M10 — hueco de cuatro días ----------
       Días seguidos sin NADA registrado, contando hacia atrás desde ayer: hoy
       no cuenta, que todavía da tiempo a salir. */
    d = def("M10");
    if (d && Salud.datos) {
      /* Si hoy ya has salido, el hueco se ha terminado: decirte que llevas
         nueve días parado el día que vuelves es lo contrario de lo que tiene
         que hacer este aviso. */
      var huecos = 0, fH = U.sumarDias(dia, -1), tope = 30;
      if (!registradas(dia).length) {
        for (var iH = 0; iH < tope; iH++) {
          if (registradas(fH).length) break;
          huecos++;
          fH = U.sumarDias(fH, -1);
        }
      }
      if (huecos >= d.umbral) {
        /* si se llega al tope, el hueco es más largo de lo que se ha contado:
           decir «30 días» cuando son cinco meses sería mentir por defecto */
        out.push({ d: d, dato: huecos >= tope
          ? "más de " + tope + " días sin actividad registrada"
          : huecos + " días seguidos sin actividad registrada, desde el " +
            U.etiquetaFecha(U.sumarDias(dia, -huecos)) });
      }
    }

    /* ---------- M11 — pulso en reposo alto ----------
       Callado mientras dure el corticoide: el fármaco sube el pulso por sí
       solo y el aviso sonaría todos los días sin decir nada nuevo. */
    d = def("M11");
    if (d && !Salud.conFarmaco(dia)) {
      var baseF = Salud.base("base_fcr");
      if (baseF) {
        var seguidos = 0, fF = dia, ultF = null;
        for (var iF = 0; iF < d.dias; iF++) {
          var dd = Salud.dia(fF);
          if (!dd || typeof dd.fcr !== "number") break;
          if (dd.fcr < baseF + d.umbral) break;
          if (ultF === null) ultF = dd.fcr;
          seguidos++;
          fF = U.sumarDias(fF, -1);
        }
        if (seguidos >= d.dias) {
          out.push({ d: d, dato: ultF + " lpm hoy, " + d.dias + " días seguidos por encima de " +
            Math.round(baseF + d.umbral) + " (tu base es " + num(baseF) + ")" });
        }
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

  /* Los avisos, de más grave a menos: en la franja solo caben dos, así que los
     dos que se ven han de ser los que más importan. */
  var ORDEN_NIVEL = { consulta: 0, atencion: 1, nota: 2 };

  function avisosOrdenados(dia) {
    return avisos(dia).slice().sort(function (a, b) {
      var na = ORDEN_NIVEL[a.d.nivel], nb = ORDEN_NIVEL[b.d.nivel];
      if (na === undefined) na = 9;
      if (nb === undefined) nb = 9;
      if (na !== nb) return na - nb;
      return a.d.id < b.d.id ? -1 : 1;
    });
  }

  function etqNivel(n) {
    return n === "consulta" ? "Consulta" : (n === "atencion" ? "Atención" : "Nota");
  }

  function htmlAviso(a, sinNivel) {
    return '<div class="ent-aviso ' + a.d.nivel + '">' +
      (sinNivel ? "" : '<span class="niv">' + etqNivel(a.d.nivel) + "</span>") +
      "<b>" + a.d.id + " · " + U.esc(a.d.titulo) + "</b>" +
      "<small>" + U.esc(a.dato) + ". " + U.esc(a.d.texto) + "</small></div>";
  }

  /* la ventana con todos: los que están hoy y, debajo, los que vigila la app
     sin que salten, para que se vea que el silencio es silencio y no olvido */
  function abrirAvisos() {
    var caja = document.getElementById("modal-caja"), modal = document.getElementById("modal");
    if (!caja || !modal) return;
    var hoy = U.hoyISO(), lista = avisosOrdenados(hoy);
    var activos = {};
    lista.forEach(function (a) { activos[a.d.id] = 1; });

    var h = "<header><h2>Avisos</h2>" +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">×</button></header>';

    if (!lista.length) {
      h += '<div class="evo-vacio"><b>Nada que atender hoy</b>' +
        "<small>Ninguna de tus medidas ha cruzado su umbral.</small></div>";
    } else {
      var porNivel = { consulta: [], atencion: [], nota: [] };
      lista.forEach(function (a) { (porNivel[a.d.nivel] || porNivel.nota).push(a); });
      ["consulta", "atencion", "nota"].forEach(function (n) {
        if (!porNivel[n].length) return;
        h += '<h3 class="av-grupo">' + etqNivel(n) + " · " + porNivel[n].length + "</h3>";
        porNivel[n].forEach(function (a) { h += htmlAviso(a, true); });
      });
    }

    /* los que no han saltado */
    var callados = (P.avisos || []).filter(function (d) { return !activos[d.id]; });
    if (callados.length) {
      h += '<h3 class="av-grupo callados">En silencio · ' + callados.length + "</h3>" +
        '<p class="hist-pie">Estos se vigilan solos y hoy no tienen nada que decir.</p><ul class="av-callados">';
      callados.forEach(function (d) {
        h += "<li><b>" + d.id + "</b> " + U.esc(d.titulo) + "</li>";
      });
      h += "</ul>";
    }

    h += '<button class="btn principal" type="button" data-cerrar-guia="1" style="width:100%;margin-top:14px">Cerrar</button>';
    caja.innerHTML = h;
    modal.classList.add("abierta");
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

  /* ==================== EVOLUCIÓN ====================
     Las series largas. Regla que manda: no se dibuja lo que no existe. Si faltan
     datos se dice qué falta y cuándo habrá, nunca se pinta una línea inventada. */

  var rangoEvo = "6m";
  var RANGOS = [{ id: "3m", n: "3 meses", d: 92 }, { id: "6m", n: "6 meses", d: 183 },
                { id: "1a", n: "1 año", d: 365 }, { id: "todo", n: "Todo", d: 0 }];

  /* El histórico vive en otro fichero del mismo repositorio y son 230 KB:
     solo se pide cuando hace falta, es decir, al elegir «Todo». */
  var Historico = {
    CLAVE: "khb-salud-hist-v1",
    RUTA: "datos/salud-historico.json",
    datos: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (j && j.datos) { this.datos = j.datos; this.estado = "ok"; return true; }
      } catch (e) {}
      return false;
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.datos || this.estado === "cargando") { if (alTerminar) alTerminar(); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.RUTA + "?ref=" + encodeURIComponent(c.rama || "main");
      fetch(url, { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          self.datos = JSON.parse(Salud.deB64(j.content));
          self.estado = "ok";
          try { localStorage.setItem(self.CLAVE, JSON.stringify({ datos: self.datos })); } catch (e) {}
          if (alTerminar) alTerminar();
        })
        .catch(function () { self.estado = "error"; if (alTerminar) alTerminar(); });
    }
  };

  /* ==================== ARCHIVO DE ACTIVIDADES ====================
     La pata «Actividad» la dibuja el módulo ActividadKHB (js/actividad-khb.js),
     que no depende de nada de este fichero: recibe los datos, se pinta en el
     hueco que le damos y se gestiona sus propios clics. Aquí solo se le traen
     los ficheros y se le monta.

       · historico-actividad.json — de 2013 al 14-oct-2021. Repo privado, 72 KB.
         NO CAMBIA NUNCA: esos años ya están cerrados. Caché para siempre.
       · salud.json + salud-historico.json — del 15-oct-2021 en adelante. Ya los
         cargan Salud e Historico; aquí solo se juntan sus actividades.
       · rutas/index.json de la app de mapas — público, sin token. Da el nombre
         de la ruta y su celda de geometría, que es lo que dibuja el mini mapa.

     La frontera del 15 de octubre de 2021 la aplica el módulo por dentro: no
     hay que fusionar ni quitar repetidas. */

  var BASE_MAPAS = "https://chernanzfinanzas-gif.github.io/mapas-ign/";

  var Archivo = {
    CLAVE: "khb-archivo-actividad-v1",
    RUTA: "datos/historico-actividad.json",
    datos: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (j && j.datos) { this.datos = j.datos; this.estado = "ok"; return true; }
      } catch (e) {}
      return false;
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.datos || this.estado === "cargando") { if (alTerminar) alTerminar(); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.RUTA + "?ref=" + encodeURIComponent(c.rama || "main");
      fetch(url, { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          self.datos = JSON.parse(Salud.deB64(j.content));
          self.estado = "ok";
          try { localStorage.setItem(self.CLAVE, JSON.stringify({ datos: self.datos })); } catch (e) {}
          if (alTerminar) alTerminar();
        })
        .catch(function () { self.estado = "error"; if (alTerminar) alTerminar(); });
    }
  };

  /* El índice de rutas es público y se actualiza solo cuando Carlos archiva
     rutas con su .bat. Se refresca cada día; si falla, se sigue con la copia. */
  var Rutas = {
    CLAVE: "khb-rutas-indice-v1",
    FRESCO_H: 24,
    datos: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || !j.datos) return false;
        this.datos = j.datos; this.traidoEl = j.traidoEl; this.estado = "ok";
        return !!(j.traidoEl && (Date.now() - j.traidoEl) < this.FRESCO_H * 3600000);
      } catch (e) { return false; }
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando") { if (alTerminar) alTerminar(); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }   // fresco: no se pide
      this.estado = "cargando";
      fetch(BASE_MAPAS + "rutas/index.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          self.datos = j.rutas || [];
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            localStorage.setItem(self.CLAVE,
              JSON.stringify({ traidoEl: self.traidoEl, datos: self.datos }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        .catch(function () {
          self.estado = self.datos ? "ok" : "error";     // con copia vieja se sigue
          if (alTerminar) alTerminar();
        });
    }
  };

  var archivoUI = null;        // la instancia del módulo, con su año y mes abiertos
  var geoCache = {};           // celda → geometría, para no pedirla dos veces

  function actividadesJuntas() {
    var a = (Salud.datos && Salud.datos.actividades) || [];
    var b = (Historico.datos && Historico.datos.actividades) || [];
    return a.concat(b);
  }

  function htmlActividad() {
    var falta = !Archivo.datos && Archivo.estado !== "ok";
    var aviso = "";
    if (Archivo.estado === "sin-config") {
      aviso = "Falta la configuración de GitHub: sin ella no puedo traer el archivo de 2013 a 2021.";
    } else if (Archivo.estado === "error") {
      aviso = "No he podido traer <b>datos/historico-actividad.json</b>. Se reintenta al volver a entrar.";
    } else if (falta) {
      aviso = "Trayendo el archivo…";
    }
    /* Sin esto no se sale del bloque: es la única puerta de vuelta, porque la
       app no tiene barra de navegación. Va arriba y abajo, como en El Plan,
       que el archivo de un año es largo y no se puede obligar a subir. */
    /* El de arriba lo pinta el módulo, en la misma fila que el selector de
       medida: ocupa una línea en vez de dos. Se lo pasamos como HTML en
       `botonVolver` y lo recoge el mismo manejador de `[data-volver]`. */
    return '<div class="tarjeta"><h2>Actividad</h2>' +
      '<p class="nota-peque">Todo lo que has hecho, año por año y mes por mes. ' +
      'Hasta octubre de 2021 sale del archivo; desde entonces, de intervals, ' +
      'y las nuevas se van añadiendo solas.</p>' +
      (aviso ? '<p class="nota-peque">' + aviso + "</p>" : "") +
      '<div id="ent-archivo"></div></div>' +
      '<button type="button" class="ent-atras abajo" data-volver="1">' +
      FLECHA + "Volver a Entrenamiento</button>";
  }

  /* Se llama después de cada pintado. El módulo conserva su año y su mes
     abiertos porque la instancia se reaprovecha: solo cambia dónde se dibuja. */
  function montarArchivo() {
    var hueco = document.getElementById("ent-archivo");
    if (!hueco) return;
    if (!window.ActividadKHB) {
      hueco.innerHTML = '<p class="nota-peque">No se ha cargado <b>js/actividad-khb.js</b>.</p>';
      return;
    }
    if (!Salud.datos && !Archivo.datos) return;      // nada que enseñar todavía

    if (!archivoUI) {
      archivoUI = ActividadKHB.crear({
        botonVolver: '<button type="button" class="ent-atras" data-volver="1">' +
          FLECHA + "Volver a Entrenamiento</button>",
        historico: Archivo.datos,
        actividades: actividadesJuntas(),
        rutas: (Rutas.datos || []),
        traerGeo: function (celda) {
          if (geoCache[celda]) return Promise.resolve(geoCache[celda]);
          return fetch(BASE_MAPAS + "rutas/geo-" + celda + ".json")
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (g) { geoCache[celda] = g || {}; return geoCache[celda]; })
            .catch(function () { return {}; });
        }
      });
    }
    archivoUI.montar(hueco);
  }

  /* Los tres ficheros del archivo, pedidos una sola vez al entrar en la pata.
     Cada uno repinta cuando llega, así que la pantalla se va completando en
     vez de quedarse en blanco esperando al más lento. */
  function prepararArchivo() {
    var repinta = function () { if (bloque === "actividad") { archivoUI = null; pintar(true); } };
    Archivo.cargar(repinta);
    Rutas.cargar(repinta);
    if (!Historico.datos) Historico.cargar(repinta);
  }

  function ventanaEvo() {
    var hasta = U.hoyISO(), r = null;
    for (var i = 0; i < RANGOS.length; i++) if (RANGOS[i].id === rangoEvo) r = RANGOS[i];
    return { desde: (r && r.d) ? U.sumarDias(hasta, -r.d) : "2019-01-01", hasta: hasta };
  }

  /* serie de un campo de salud.json; el histórico se suma si está cargado */
  function serieSalud(campo, v) {
    var vistos = {}, out = [];
    [Historico.datos, Salud.datos].forEach(function (src) {
      if (!src || !src.dias) return;
      for (var f in src.dias) {
        if (f < v.desde || f > v.hasta) continue;
        var val = src.dias[f][campo];
        if (val === undefined || val === null || val === "") continue;
        vistos[f] = val;                         // lo reciente manda sobre lo histórico
      }
    });
    for (var f2 in vistos) out.push({ f: f2, v: vistos[f2] });
    return out.sort(function (a, b) { return a.f < b.f ? -1 : 1; });
  }

  /* serie de lo que anotas tú: pesos y medidas de cinta */
  function serieApp(id, v) {
    var out = [];
    if (id === "peso") {
      (A.estado.pesos || []).forEach(function (p) {
        if (p.f >= v.desde && p.f <= v.hasta) out.push({ f: p.f, v: p.kg });
      });
    } else {
      var m = ent().medidas;
      for (var f in m) {
        if (f < v.desde || f > v.hasta) continue;
        var val = m[f][id];
        if (val === undefined || val === "" || val === null) continue;
        var n = parseFloat(val);
        if (!isNaN(n)) out.push({ f: f, v: n });
      }
    }
    return out.sort(function (a, b) { return a.f < b.f ? -1 : 1; });
  }

  /* pesos de las dos fuentes en una sola serie: intervals y lo anotado a mano */
  /* Las tres de la báscula que hay que teclear: lo anotado en la app manda
     sobre lo que quedó en el histórico. */
  function serieMixta(campo, v) {
    var vistos = {}, out = [], i;
    serieSalud(campo, v).forEach(function (p) { vistos[p.f] = p.v; });
    serieApp(campo, v).forEach(function (p) { vistos[p.f] = p.v; });
    for (i in vistos) out.push({ f: i, v: vistos[i] });
    return out.sort(function (a, b) { return a.f < b.f ? -1 : 1; });
  }

  function seriePeso(v) {
    var vistos = {};
    serieApp("peso", v).forEach(function (p) { vistos[p.f] = p.v; });
    serieSalud("peso", v).forEach(function (p) { vistos[p.f] = p.v; });
    var out = [];
    for (var f in vistos) out.push({ f: f, v: vistos[f] });
    return out.sort(function (a, b) { return a.f < b.f ? -1 : 1; });
  }

  /* media de los últimos n días, no de los últimos n puntos */
  function mediaMovilDias(serie, n) {
    var out = [];
    for (var i = 0; i < serie.length; i++) {
      var s = 0, c = 0;
      for (var j = i; j >= 0; j--) {
        if (diasEntre(serie[j].f, serie[i].f) >= n) break;
        s += serie[j].v; c++;
      }
      out.push({ f: serie[i].f, v: s / c });
    }
    return out;
  }

  /* la grasa por cinta, recalculada en cada día con cintura o cuello nuevos */
  function serieGrasaCinta(v) {
    var fechas = {}, out = [];
    serieApp("cintura", v).forEach(function (p) { fechas[p.f] = 1; });
    serieApp("cuello", v).forEach(function (p) { fechas[p.f] = 1; });
    Object.keys(fechas).sort().forEach(function (f) {
      var g = grasaPorCinta(f);
      if (g && g.fecha === f) out.push({ f: f, v: g.pct });
    });
    return out;
  }

  /* Vatios por kilo: la MEJOR sesión de cada mes, no todas.
     La nube de todas las sesiones no dice nada —un rodaje suave y unas series
     caen en el mismo sitio—; el techo del mes sí: sube si mejora la forma o
     baja el peso, y es lo que el test de FTP confirmará. */
  function serieWkgMensual(v) {
    var mejor = {};
    [Historico.datos, Salud.datos].forEach(function (src) {
      if (!src || !src.actividades) return;
      src.actividades.forEach(function (a) {
        var f = String(a.fecha || "").slice(0, 10);
        if (f < v.desde || f > v.hasta) return;
        if (typeof a.w_kg !== "number" || !a.w_kg) return;
        var mins = a.min_mov || a.min_total || 0;
        if (mins && mins < 20) return;                     // sesiones muy cortas, fuera
        var mes = f.slice(0, 7);
        if (!mejor[mes] || a.w_kg > mejor[mes].v) mejor[mes] = { f: f, v: a.w_kg };
      });
    });
    var out = [];
    Object.keys(mejor).sort().forEach(function (m) { out.push(mejor[m]); });
    return out;
  }

  /* carga real de cada semana frente al objetivo de la rampa */
  /* La rampa entera, no solo el tramo elegido: es el plan, y se mira completo.
     Las semanas que aún no han empezado salen solo como objetivo. */
  function seriesCargaSemanal() {
    var reales = [], objetivos = [], hoy = U.hoyISO();
    P.rampa.forEach(function (r) {
      objetivos.push({ f: r.desde, v: r.carga, n: r.n });
      if (r.desde > hoy) return;
      var c = cargaSemana(r.desde, r.hasta < hoy ? r.hasta : hoy);
      if (c !== null) reales.push({ f: r.desde, v: c, n: r.n });
    });
    /* la última semana de la rampa está abierta («crucero»): para dibujar se
       cuenta como una semana más, o el eje se iría hasta el verano que viene */
    var ult = P.rampa[P.rampa.length - 1];
    return { reales: reales, objetivos: objetivos,
             desde: P.rampa[0].desde, hasta: U.sumarDias(ult.desde, 7) };
  }

  /* ---------- el dibujo ----------
     SVG a mano, sin librerías: una rejilla, las bandas, las líneas y el último
     punto marcado. El viewBox escala solo al ancho del móvil. */
  function grafica(o) {
    /* el margen derecho guarda sitio para los números de la escala: si no,
       el punto del último dato se les monta encima */
    var W = 320, H = o.alto || 108, L = 2, R = (o.escala === false ? 2 : 17), T = 10, B = 14;
    var series = (o.series || []).filter(function (s) { return s.pts && s.pts.length; });
    if (!series.length) return "";

    /* La escala se hace con los percentiles 2 y 98, no con el mínimo y el máximo:
       una noche suelta de 18,9 h aplastaba el resto de la gráfica contra el suelo. */
    var todos = [];
    series.forEach(function (s) { s.pts.forEach(function (p) { todos.push(p.v); }); });
    todos.sort(function (a, b) { return a - b; });
    function pct(q) { return todos[Math.min(todos.length - 1, Math.max(0, Math.round((todos.length - 1) * q)))]; }
    var min = pct(0.02), max = pct(0.98);
    var recortados = (min > todos[0] || max < todos[todos.length - 1]);
    if (o.min !== undefined && o.min < min) min = o.min;
    if (o.max !== undefined && o.max > max) max = o.max;
    if (max - min < 0.5) { max += 0.5; min -= 0.5; }
    var minD = min, maxD = max;                    // los extremos rotulados
    var pad = (max - min) * 0.12; min -= pad; max += pad;

    /* El eje empieza donde empiezan los datos: si no, se ven medias gráficas vacías */
    var priF = null, ultF = null;
    series.forEach(function (s) {
      var a = s.pts[0].f, b = s.pts[s.pts.length - 1].f;
      if (!priF || a < priF) priF = a;
      if (!ultF || b > ultF) ultF = b;
    });
    if (priF && priF > o.desde) o.desde = priF;
    if (o.ajustarFin !== false && ultF && ultF < o.hasta && diasEntre(ultF, o.hasta) > 30) o.hasta = ultF;

    var t0 = U.desdeISO(o.desde).getTime(), t1 = U.desdeISO(o.hasta).getTime();
    if (t1 <= t0) t1 = t0 + 86400000;
    var diasEje = Math.round((t1 - t0) / 86400000);
    function rotuloFecha(f) {
      var d = U.desdeISO(f);
      return diasEje > 300 ? (MES_CORTO[d.getMonth()] + " " + d.getFullYear()) : U.etiquetaFecha(f);
    }
    function X(f) {
      var x = L + (W - L - R) * ((U.desdeISO(f).getTime() - t0) / (t1 - t0));
      return x < L ? L : (x > W - R ? W - R : x);
    }
    function Y(v) {
      var y = T + (H - T - B) * (1 - (v - min) / (max - min));
      return y < T ? T : (y > H - B ? H - B : y);   // lo que se sale de escala se recorta al borde
    }
    function xy(p) { return X(p.f).toFixed(1) + "," + Y(p.v).toFixed(1); }

    /* la serie que se lee al pasar el dedo: la marcada, o la línea más poblada */
    var princ = null, sec = null;
    /* Si el gráfico es una pareja —alta y baja, báscula y cinta— las dos se leen
       juntas: enseñar solo una mitad de la tensión no dice nada. */
    if (o.par && series.length > 1 && series[0].pts && series[0].pts.length &&
        series[1].pts && series[1].pts.length) { princ = series[0]; sec = series[1]; }
    if (!princ) series.forEach(function (x) { if (x.tip) princ = x; });
    if (!princ) series.forEach(function (x) { if (!x.barras && (!princ || x.pts.length > princ.pts.length)) princ = x; });
    if (!princ) princ = series[0];

    function serial(ps) { return ps.map(function (x) { return x.f + ":" + x.v; }).join(","); }

    var s = '<svg class="evo-svg" viewBox="0 0 ' + W + " " + H + '"' +
      ' data-esc="' + [t0, t1, min, max, W, H, L, R, T, B].join("|") + '"' +
      ' data-uni="' + U.esc(o.unidadTip || o.arriba || "") + '"' +
      (sec ? ' data-pts2="' + serial(sec.pts) + '"' +
             ' data-lab1="' + U.esc((o.par && o.par[0]) || "") + '"' +
             ' data-lab2="' + U.esc((o.par && o.par[1]) || "") + '"' : "") +
      ' data-pts="' + serial(princ.pts) + '"' +
      ' role="img" aria-label="' + U.esc(o.alt || "") + '">';

    (o.bandas || []).forEach(function (b) {
      var x0 = Math.max(L, X(b.desde)), x1 = Math.min(W - R, X(b.hasta));
      if (x1 <= x0) return;
      s += '<rect x="' + x0.toFixed(1) + '" y="' + T + '" width="' + (x1 - x0).toFixed(1) +
        '" height="' + (H - T - B) + '" fill="' + (b.color || "#eef1f0") + '"/>';
      /* la etiqueta de la banda va arriba: abajo chocaba con las fechas */
      if (b.etq && (x1 - x0) > 26) s += '<text x="' + ((x0 + x1) / 2).toFixed(1) + '" y="' + (T + 7) +
        '" text-anchor="middle" font-size="8" fill="#667a70">' + U.esc(b.etq) + "</text>";
    });

    (o.lineasH || []).forEach(function (l) {
      var y = Y(l.v).toFixed(1);
      s += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y +
        '" stroke="' + (l.color || "#cfd8d4") + '" stroke-width="1" stroke-dasharray="3 3"/>';
      /* a la izquierda: a la derecha están los números de la escala */
      if (l.etq) s += '<text x="' + (L + 2) + '" y="' + (Y(l.v) - 2).toFixed(1) +
        '" font-size="8" fill="#667a70">' + U.esc(l.etq) + "</text>";
    });

    series.forEach(function (se) {
      if (se.barras) {
        var an = Math.max(3, (W - L - R) / Math.max(8, se.pts.length * 2.2));
        se.pts.forEach(function (p) {
          var y = Y(p.v), y0 = Y(Math.max(min, 0));
          s += '<rect x="' + (X(p.f) - an / 2).toFixed(1) + '" y="' + Math.min(y, y0).toFixed(1) +
            '" width="' + an.toFixed(1) + '" height="' + Math.max(1, Math.abs(y0 - y)).toFixed(1) +
            '" fill="' + se.color + '" opacity="' + (se.opacidad || 1) + '"/>';
        });
        return;
      }
      if (se.pts.length > 1 && !se.soloPuntos) {
        /* los huecos no se unen con una recta: cinco meses sin pesarse no son una
           bajada lenta. El tramo sin datos va en guiones y con su propio punto. */
        var hueco = se.hueco || 21, tramos = [], cur = [];
        se.pts.forEach(function (p, i) {
          if (i && diasEntre(se.pts[i - 1].f, p.f) > hueco) { tramos.push(cur); cur = []; }
          cur.push(p);
        });
        tramos.push(cur);
        tramos.forEach(function (tr, i) {
          if (i) {
            var a = tramos[i - 1][tramos[i - 1].length - 1], b2 = tr[0];
            s += '<line x1="' + X(a.f).toFixed(1) + '" y1="' + Y(a.v).toFixed(1) +
              '" x2="' + X(b2.f).toFixed(1) + '" y2="' + Y(b2.v).toFixed(1) +
              '" stroke="' + se.color + '" stroke-width="1.2" stroke-dasharray="4 4" opacity=".5"/>';
          }
          if (tr.length > 1) {
            s += '<polyline points="' + tr.map(xy).join(" ") + '" fill="none" stroke="' + se.color +
              '" stroke-width="' + (se.ancho || 2) + '" stroke-linejoin="round" stroke-linecap="round"' +
              (se.guiones ? ' stroke-dasharray="5 4"' : "") + "/>";
          } else {
            s += '<circle cx="' + X(tr[0].f).toFixed(1) + '" cy="' + Y(tr[0].v).toFixed(1) +
              '" r="' + (se.radio || 1.9) + '" fill="' + se.color + '"/>';
          }
        });
        if (tramos.length > 1) se.tuvoHuecos = true;
      }
      if (se.soloPuntos || se.pts.length === 1) {
        se.pts.forEach(function (p) {
          s += '<circle cx="' + X(p.f).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) +
            '" r="' + (se.radio || 1.9) + '" fill="' + se.color + '"/>';
        });
      }
      if (se.marcarUltimo !== false) {
        var u = se.pts[se.pts.length - 1];
        s += '<circle cx="' + X(u.f).toFixed(1) + '" cy="' + Y(u.v).toFixed(1) +
          '" r="2.4" fill="' + se.color + '" stroke="#fff" stroke-width="1"/>';
      }
    });

    /* los extremos, rotulados: una gráfica sin escala no dice nada */
    if (o.escala !== false) {
      s += '<text x="' + (W - 1) + '" y="' + (Y(maxD) + 1).toFixed(1) +
        '" text-anchor="end" font-size="7.5" fill="#9aa8a2">' + U.esc(num(maxD)) +
        (recortados ? "+" : "") + "</text>";
      s += '<text x="' + (W - 1) + '" y="' + (Y(minD) - 1).toFixed(1) +
        '" text-anchor="end" font-size="7.5" fill="#9aa8a2">' + U.esc(num(minD)) + "</text>";
    }
    s += '<text x="' + L + '" y="7" font-size="8" fill="#667a70">' + U.esc(o.arriba || "") + "</text>";
    s += '<text x="' + L + '" y="' + (H - 3) + '" font-size="8" fill="#667a70">' +
      rotuloFecha(o.desde) + "</text>";
    s += '<text x="' + (W - 1) + '" y="' + (H - 3) + '" text-anchor="end" font-size="8" fill="#667a70">' +
      (o.hasta === U.hoyISO() ? "hoy" : rotuloFecha(o.hasta)) + "</text>";
    return '<div class="graf-caja">' + s + '</svg>' +
      '<div class="graf-guia"></div><div class="graf-tip"></div></div>' +
      (o.explica ? '<p class="graf-pie">' + U.esc(o.explica) + "</p>" : "");
  }

  /* leyenda de una gráfica */
  function leyenda(items) {
    var h = '<div class="evo-ley">';
    items.forEach(function (i) {
      h += '<span><i style="background:' + i.color + (i.guiones ? ";opacity:.55" : "") + '"></i>' +
        U.esc(i.n) + "</span>";
    });
    return h + "</div>";
  }

  function tarjetaEvo(titulo, valor, unidad, pie, cuerpo, nota) {
    var h = '<div class="tarjeta evo-t"><div class="evo-cab"><h2>' + U.esc(titulo) + "</h2>" +
      (valor === null || valor === undefined ? "" :
        '<b class="evo-v">' + U.esc(String(valor)) + "</b>" +
        (unidad ? '<span class="evo-u">' + U.esc(unidad) + "</span>" : "")) + "</div>";
    if (pie) h += '<p class="nota-peque evo-pie">' + pie + "</p>";
    h += cuerpo;
    if (nota) h += '<p class="evo-nota">' + nota + "</p>";
    return h + "</div>";
  }

  function sinDatos(texto, cuando) {
    return '<div class="evo-vacio"><b>' + U.esc(texto) + "</b>" +
      (cuando ? "<small>" + U.esc(cuando) + "</small>" : "") + "</div>";
  }

  /* banda sombreada de la pauta de corticoide, para no interpretar ese tramo */
  function bandasFarmaco(v) {
    var out = [];
    (P.tratamientos || []).forEach(function (t) {
      if (!t.desde || !t.hasta) return;
      if (t.hasta < v.desde || t.desde > v.hasta) return;
      out.push({ desde: t.desde > v.desde ? t.desde : v.desde,
                 hasta: t.hasta < v.hasta ? t.hasta : v.hasta,
                 color: "#f3f5f4", etq: "corticoide" });
    });
    return out;
  }

  /* ==================== EL PASE DE LA SEMANA ====================
     La decisión del domingo, calculada por la app. Mira cinco cosas —carga,
     cumplimiento, peso, recuperación y observaciones— y sale con un veredicto:
     subir, repetir, bajar o semana en blanco. Nada de esto se estima: lo que
     falta se dice que falta. */

  /* la anterior es la del CALENDARIO: con la rampa en cola, dos semanas
     seguidas pueden compartir peldaño, y la regla de «dos flojas seguidas»
     habla de semanas vividas, no de números de rampa */
  function semanaAnteriorDe(sem) {
    return semanaDe(U.sumarDias(sem.desde, -1));
  }

  /* el peldaño de arriba y el de abajo, que es de lo que habla el pase */
  function semanaSiguienteDe(sem) { return peldano((sem.idx === undefined ? 0 : sem.idx) + 1); }
  function semanaAbajoDe(sem) { return peldano(Math.max(0, (sem.idx === undefined ? 0 : sem.idx) - 1)); }

  /* cumplimiento: días con sesión hecha sobre días con sesión prevista */
  function cumplimientoSemana(sem, hasta) {
    var talla = tallaDe(sem), previstos = 0, hechos = 0, fallos = [], hoy = U.hoyISO();
    for (var f = sem.desde; f <= sem.hasta && f <= hasta; f = U.sumarDias(f, 1)) {
      var ses = sesionesDe(f, sem, talla);
      if (!ses.length) continue;                       // día de descanso
      var hecho = diaCumplido(f, sem, talla);
      /* el día de hoy no se juzga hasta que termina: a media tarde todavía se
         puede salir a caminar, y contarlo como fallo es sencillamente falso */
      if (f === hoy && !hecho) continue;
      previstos++;
      if (hecho) hechos++;
      else fallos.push({ f: f, m: motivosDe(f), nota: (obsDe(f) || {}).nota });
    }
    return { previstos: previstos, hechos: hechos, fallos: fallos };
  }

  /* los motivos de la semana, agrupados por efecto */
  function saludSemana(sem, hasta) {
    var r = { parar: 0, limitar: 0, vigilar: 0, agenda: 0, dias: {} };
    for (var f = sem.desde; f <= sem.hasta && f <= hasta; f = U.sumarDias(f, 1)) {
      motivosDe(f).forEach(function (v) {
        var m = motivo(v);
        if (!m || !(m.efecto in r)) return;
        r[m.efecto]++;
        r.dias[f] = 1;
      });
    }
    return r;
  }

  /* media de un campo de salud.json en el tramo de la semana */
  function mediaSalud(campo, desde, hasta) {
    var s = 0, n = 0, d = Salud.datos;
    if (!d || !d.dias) return null;
    for (var f = desde; f <= hasta; f = U.sumarDias(f, 1)) {
      var v = d.dias[f] && d.dias[f][campo];
      if (typeof v === "number") { s += v; n++; }
    }
    return n ? { m: s / n, n: n } : null;
  }

  /* EL VEREDICTO. El orden importa: la salud manda sobre la carga. */
  function veredictoSemana(sem, hasta, cerrada) {
    var U0 = P.pase.umbrales;
    var cump = cumplimientoSemana(sem, hasta);
    var sal = saludSemana(sem, hasta);
    var carga = cargaSemana(sem.desde, hasta < sem.hasta ? hasta : sem.hasta);
    var porAsistencia = (sem.criterio === "asistencia");
    var pct = porAsistencia
      ? (cump.previstos ? cump.hechos / cump.previstos : null)
      : (carga === null || !sem.carga ? null : carga / sem.carga);

    /* la semana anterior, para la regla de las dos seguidas */
    var ant = semanaAnteriorDe(sem), pctAnt = null;
    if (ant) {
      var cAnt = cargaSemana(ant.desde, ant.hasta);
      if (ant.criterio === "asistencia") {
        var cuAnt = cumplimientoSemana(ant, ant.hasta);
        pctAnt = cuAnt.previstos ? cuAnt.hechos / cuAnt.previstos : null;
      } else if (cAnt !== null && ant.carga) {
        pctAnt = cAnt / ant.carga;
      }
    }

    var v, porque;
    if (!cerrada && !cump.previstos) {
      v = "pronto";
      porque = "La semana acaba de empezar.";
    } else if (sal.parar >= 2) {
      v = "parar";
      porque = "Dos días o más de lesión o enfermedad.";
    } else if (pct === null) {
      v = "repetir";
      porque = "Sin datos de carga suficientes para decidir otra cosa.";
    } else if (pctAnt !== null && pct < U0.repetir && pctAnt < U0.repetir) {
      v = "bajar";
      porque = "Dos semanas seguidas por debajo del 70 % del objetivo.";
    } else if (pct >= (porAsistencia ? U0.asistencia : U0.subir)) {
      v = "subir";
      porque = porAsistencia
        ? "Has movido " + cump.hechos + " de " + cump.previstos + " días previstos."
        : "Carga al " + Math.round(pct * 100) + " % del objetivo.";
    } else {
      v = "repetir";
      porque = (porAsistencia ? "Días movidos: " + cump.hechos + " de " + cump.previstos + "."
        : "Carga al " + Math.round(pct * 100) + " % del objetivo.") +
        (sal.limitar ? " Y hubo " + sal.limitar + " día" + (sal.limitar > 1 ? "s" : "") + " con lesión limitante." : "");
    }
    return { v: v, porque: porque, pct: pct, pctAnt: pctAnt, carga: carga,
             cump: cump, sal: sal, porAsistencia: porAsistencia, cerrada: cerrada };
  }

  /* ---------- el lunes, solo ----------
     En cuanto una semana termina, su veredicto se calcula, se guarda y mueve
     la cola. No hay botón que tocar: si el pase dice repetir, se repite. Se
     recorren todos los huecos cerrados, así que da igual cuántos domingos
     lleves sin abrir la app. */
  function aplicarPases() {
    if (!P.pase) return 0;
    var reg = registroPase(), hoy = U.hoyISO(), nuevos = 0, guarda = 0;
    var t = tramoNatural(P.rampa[0].desde);
    while (t && guarda++ < 500) {
      /* Se recalcula durante tres días y luego se congela: los datos del reloj
         y del CSV llegan con retraso, y un veredicto dictado el lunes a las
         ocho con la mitad de la semana sin sincronizar sería falso. Pasada la
         ventana, lo dictado queda dictado aunque aparezcan datos nuevos. */
      var fresco = !reg[t.desde] || (hoy <= U.sumarDias(t.hasta, 3));
      if (t.hasta < hoy && fresco) {
        var p = peldano(t.i + desfaseHasta(t.desde));
        var sem = { n: p.n, desde: t.desde, hasta: t.hasta, carga: p.carga,
                    talla: p.talla, criterio: p.criterio, idx: t.i + desfaseHasta(t.desde) };
        var r = veredictoSemana(sem, t.hasta, true);
        var des0 = desfaseHasta(t.desde);
        var d = (P.pase.desfases || {})[r.v];
        if (d === undefined) d = 0;
        var desSig = des0 + d;
        if ((t.i + 1) + desSig < 0) desSig = -(t.i + 1);   // el suelo es el primer peldaño
        var antes = reg[t.desde];
        var nuevo = { v: r.v, porque: r.porque, n: sem.n, carga: sem.carga,
                      d: desSig - des0, aplicado: (antes && antes.aplicado) || hoy };
        if (!antes || antes.v !== nuevo.v || antes.d !== nuevo.d || antes.porque !== nuevo.porque) {
          reg[t.desde] = nuevo;
          nuevos++;
        }
      }
      if (t.hasta >= hoy) break;
      var sig = tramoNatural(U.sumarDias(t.hasta, 1));
      if (!sig || sig.desde === t.desde) break;
      t = sig;
    }
    if (nuevos) A.guardar("entreno");
    return nuevos;
  }

  /* el pase que dio forma a la semana en curso */
  function paseVigente(sem) {
    if (!sem) return null;
    var reg = registroPase(), ant = null;
    for (var k in reg) if (k < sem.desde && (!ant || k > ant)) ant = k;
    return ant ? { desde: ant, r: reg[ant] } : null;
  }

  function htmlPaseAplicado(sem) {
    var pv = paseVigente(sem);
    if (!pv) return "";
    var txt = (P.pase.avisoAplicado || {})[pv.r.v];
    if (!txt) return "";
    var clase = pv.r.v === "subir" ? "ok" : (pv.r.v === "parar" ? "parar" : "ojo");
    return '<div class="pase-aplicado ' + clase + '" role="button" tabindex="0" data-bloque="evolucion">' +
      '<span class="et">El pase del lunes · ' + U.esc(P.pase.veredictos[pv.r.v].n) + "</span>" +
      "<b>" + U.esc(txt) + "</b>" +
      "<small>Semana " + pv.r.n + ": " + U.esc(pv.r.porque) +
      " Se aplicó solo el " + U.etiquetaFecha(pv.r.aplicado) + ".</small></div>";
  }

  function barraPase(pct) {
    var p = Math.max(0, Math.min(1.3, pct || 0));
    var clase = pct >= 0.95 ? "ok" : (pct >= 0.7 ? "medio" : "bajo");
    return '<div class="pase-barra"><i class="' + clase + '" style="width:' +
      Math.round((p / 1.3) * 100) + '%"></i><span class="obj"></span></div>';
  }

  function filaPase(n, v, c) {
    return '<div class="ent-fila"><span class="n">' + U.esc(n) + "</span>" +
      '<span class="v">' + (v === null || v === undefined ? "—" : v) + "</span>" +
      '<span class="c">' + U.esc(c || "") + "</span></div>";
  }

  function htmlPase() {
    var cfg = P.pase;
    if (!cfg) return "";
    var hoy = U.hoyISO(), sem = semanaDe(hoy);
    if (!sem) return "";
    var cerrada = hoy >= sem.hasta;
    var hasta = cerrada ? sem.hasta : hoy;
    var r = veredictoSemana(sem, hasta, cerrada);
    var ver = cfg.veredictos[r.v];
    var pl = P.plantillas[tallaDe(sem)];

    var h = '<div class="tarjeta pase pase-' + r.v + '">' +
      '<div class="evo-cab"><h2>' + U.esc(cfg.titulo) + "</h2>" +
      '<span class="pase-etq">Semana ' + sem.n + " · " + U.esc(pl.nombre) + "</span></div>" +
      '<p class="nota-peque evo-pie">' + U.etiquetaFecha(sem.desde) + " – " + U.etiquetaFecha(sem.hasta) +
      (cerrada ? " · semana cerrada" : " · en curso, faltan " + diasEntre(hoy, sem.hasta) + " días") + "</p>";

    /* el veredicto, arriba y en grande */
    h += '<div class="pase-ver"><b>' + U.esc(ver.n) + "</b><small>" + U.esc(r.porque) + " " +
      U.esc(ver.t) + "</small>" +
      (cerrada ? "" : '<em class="prov">Provisional: la semana no ha terminado.</em>') + "</div>";

    /* 1. carga */
    if (!r.cerrada && !r.cump.previstos) {
      h += '<h3 class="evo-sub">Días movidos</h3><p class="nota-peque">Todavía ninguno que juzgar: ' +
        "la sesión de hoy no cuenta hasta que termine el día.</p>";
    } else if (r.porAsistencia) {
      h += '<h3 class="evo-sub">Días movidos</h3>' +
        barraPase(r.pct === null ? 0 : r.pct) +
        filaPase("Días con sesión hecha", r.cump.hechos + " de " + r.cump.previstos,
          r.pct === null ? "" : Math.round(r.pct * 100) + " %") +
        filaPase("Carga registrada", r.carga === null ? null : r.carga,
          "esta semana no se juzga por carga: es la de arranque, a pie");
    } else {
      h += '<h3 class="evo-sub">Carga</h3>' + barraPase(r.pct === null ? 0 : r.pct) +
        filaPase("Carga de la semana", r.carga === null ? null : r.carga, "objetivo " + sem.carga) +
        filaPase("Cumplimiento", r.pct === null ? null : Math.round(r.pct * 100) + " %",
          r.pctAnt === null ? "" : "la anterior, " + Math.round(r.pctAnt * 100) + " %") +
        filaPase("Días con sesión hecha", r.cump.hechos + " de " + r.cump.previstos, "");
    }

    /* 2. lo que falló, y por qué */
    if (r.cump.fallos.length) {
      h += '<h3 class="evo-sub">Lo que falló</h3>';
      r.cump.fallos.forEach(function (x) {
        var nombres = x.m.map(function (v) { var m = motivo(v); return m ? m.n : v; });
        var clase = "otro";
        x.m.forEach(function (v) {
          var m = motivo(v);
          if (!m) return;
          if (m.efecto === "parar" || m.efecto === "limitar") clase = "salud";
          else if (m.efecto === "agenda" && clase !== "salud") clase = "agenda";
        });
        h += '<div class="pase-fallo ' + clase + '"><b>' +
          DIA_CORTO[U.desdeISO(x.f).getDay()] + " " + U.desdeISO(x.f).getDate() + "</b>" +
          '<span>' + (nombres.length ? U.esc(nombres.join(" · ")) : "sin motivo anotado") + "</span>" +
          (x.nota ? "<small>«" + U.esc(x.nota) + "»</small>" : "") + "</div>";
      });
      h += '<p class="nota-peque" style="margin-top:8px">' +
        (r.sal.agenda && !r.sal.parar && !r.sal.limitar
          ? "Todo lo que falló fue por agenda, no por el cuerpo: eso no cambia la rampa, cambia el calendario."
          : (r.sal.parar || r.sal.limitar
            ? "Lo que falló fue por salud. Eso sí manda sobre la rampa: no se compensa, se recupera."
            : "Sin motivo anotado. Si vuelve a pasar, marca la observación del día: es lo que distingue «no pude» de «no quise».")) + "</p>";
    }

    /* 3. peso */
    var a7 = mediaPesos(hasta, 7), b7 = mediaPesos(U.sumarDias(sem.desde, -1), 7);
    h += '<h3 class="evo-sub">Peso</h3>';
    if (a7 && a7.n >= 2) {
      var dif = b7 && b7.n >= 2 ? a7.m - b7.m : null;
      var obj = cfg.pesoObjetivo;
      h += filaPase("Media de 7 días", num(a7.m) + " kg", a7.n + (a7.n === 1 ? " pesada" : " pesadas")) +
        filaPase("Contra los 7 anteriores", dif === null ? null : signo(dif) + " kg",
          dif === null ? "hacen falta dos semanas" :
            (dif <= obj[0] ? "más rápido que el objetivo"
              : dif <= obj[1] ? "en el ritmo del plan"
                : dif <= 0 ? "más lento que el objetivo" : "hacia arriba"));
    } else {
      h += '<p class="nota-peque">Con ' + (a7 ? a7.n : 0) + " pesadas no se puede hacer media. Con dos ya sale.</p>";
    }

    /* 4. recuperación */
    var vf = mediaSalud("vfc", sem.desde, hasta), fc = mediaSalud("fcr", sem.desde, hasta);
    var su = mediaSalud("sueno_min", sem.desde, hasta);
    var par = (Salud.datos && Salud.datos.meta && Salud.datos.meta.parametros) || {};
    var farm = Salud.conFarmaco(hasta);
    h += '<h3 class="evo-sub">Recuperación</h3>';
    h += filaPase("VFC media", vf ? num(vf.m) + " ms" : null,
      farm ? "con corticoide: sin lectura" : (par.base_vfc ? "tu base " + num(par.base_vfc) : ""), farm);
    h += filaPase("FC en reposo media", fc ? Math.round(fc.m) + " lpm" : null,
      farm ? "con corticoide: sin lectura" : (par.base_fcr ? "tu base " + num(par.base_fcr) : ""), farm);
    h += filaPase("Sueño medio", su ? hhmm(Math.round(su.m)) : null, "tu media 6h24");

    /* 5. la semana que viene */
    var sig = semanaSiguienteDe(sem);
    h += '<h3 class="evo-sub">La semana que viene</h3>';
    if (!sig) {
      h += '<p class="nota-peque">Última semana de la rampa escrita. Toca decidir la siguiente a mano.</p>';
    } else if (r.v === "pronto") {
      h += '<p class="nota-peque">Se decide el domingo, con la semana cerrada. Hasta entonces esto es solo un espejo de cómo va.</p>';
    } else if (r.v === "subir") {
      h += '<p class="pase-prox">Semana ' + sig.n + " · <b>" + U.esc(P.plantillas[sig.talla].nombre) +
        "</b> · carga objetivo <b>" + sig.carga + "</b>" + (sig.nota ? " · " + U.esc(sig.nota) : "") + "</p>";
    } else if (r.v === "repetir") {
      h += '<p class="pase-prox">Se repite la <b>semana ' + sem.n + "</b>: misma talla y misma carga objetivo (<b>" +
        sem.carga + "</b>). La rampa se retrasa una semana y no pasa nada.</p>";
    } else if (r.v === "bajar") {
      var prev = semanaAbajoDe(sem);
      h += '<p class="pase-prox">Se baja a la carga de la <b>semana ' + prev.n + "</b> (<b>" +
        prev.carga + "</b>) con talla <b>" + U.esc(P.plantillas[prev.talla].nombre) + "</b>.</p>";
    } else {
      h += '<p class="pase-prox">Semana en blanco: <b>' + U.esc(P.plantillas.S.nombre) +
        "</b> si te ves, y si no, descanso. Se retoma donde se dejó.</p>";
    }

    h += '<p class="nota-peque" style="margin-top:12px">' + U.esc(cfg.nota) + "</p></div>";
    return h;
  }

  function htmlEvolucion() {
    var FLECHA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M15 5l-7 7 7 7"/></svg>';
    var volver = '<button type="button" class="ent-atras" data-volver="1">' + FLECHA + "Volver a Entrenamiento</button>";
    var h = volver;

    h += htmlPase();

    h += '<h3 class="evo-sub" style="margin-top:20px">Las series</h3>';
    h += '<div class="evo-rangos">';
    RANGOS.forEach(function (r) {
      h += '<button type="button" class="evo-r' + (r.id === rangoEvo ? " activo" : "") +
        '" data-rango="' + r.id + '">' + U.esc(r.n) + "</button>";
    });
    h += "</div>";

    if (!Salud.datos) {
      return h + '<div class="tarjeta"><h2>Evolución</h2><p class="nota-peque">' +
        (Salud.estado === "sin-config"
          ? "Hace falta la sincronización con GitHub: Ajustes → Sincronizar."
          : "Todavía no tengo <b>datos/salud.json</b>. Se reintenta al volver a entrar.") + "</p></div>";
    }
    if (rangoEvo === "todo" && !Historico.datos) {
      h += '<p class="nota-peque" style="margin:0 0 10px">' +
        (Historico.estado === "cargando" ? "Trayendo el histórico…"
          : Historico.estado === "error" ? "No he podido traer el histórico; se enseña lo reciente."
          : "Trayendo el histórico…") + "</p>";
    }

    var v = ventanaEvo(), bandas = bandasFarmaco(v);
    var AZUL = "#2f5c8a", VERDE = "#2f6b47", AMBAR = "#c98a1b", ROJO = "#b3402f", GRIS = "#8aa0b5";

    /* ---------- 1. peso, masa magra y grasa ---------- */
    var pes = seriePeso(v), med7 = mediaMovilDias(pes, 7), magra = serieSalud("magra", v);
    var gBas = serieSalud("grasa", v), gCin = serieGrasaCinta(v);
    var cuerpo1, nota1 = "";
    if (pes.length) {
      cuerpo1 = grafica({
        desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 112,
        arriba: "kg", alt: "Peso y masa magra", unidadTip: "kg",
        explica: "Cada punto, una pesada. La línea gruesa es la media de 7 días y la fina el dato del día; " +
          "en verde, la masa magra los días que la báscula la manda.",
        series: [{ pts: pes, color: GRIS, ancho: 0.8, marcarUltimo: false },
                 { pts: med7, color: AZUL, ancho: 1.6 },
                 { pts: magra, color: VERDE, ancho: 1.3 }]
      }) + leyenda([{ n: "peso", color: GRIS }, { n: "media de 7 días", color: AZUL },
                    { n: "masa magra", color: VERDE }]);
      if (gBas.length || gCin.length) {
        cuerpo1 += '<h3 class="evo-sub">Grasa: las dos fuentes</h3>' + grafica({
          desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 92, arriba: "%", unidadTip: "%",
          alt: "Grasa por báscula y por cinta", par: ["báscula", "cinta"],
          explica: "Dos formas de medir lo mismo: azul la impedancia de la báscula, roja la fórmula de la cinta. " +
            "Lo que importa es si van juntas.",
          series: [{ pts: gBas, color: AZUL, ancho: 1.4, soloPuntos: gBas.length < 3 },
                   { pts: gCin, color: ROJO, ancho: 1.4, soloPuntos: gCin.length < 3 }]
        }) + leyenda([{ n: "báscula (impedancia)", color: AZUL }, { n: "cinta", color: ROJO }]);
        if (gBas.length && gCin.length) {
          var dif = gCin[gCin.length - 1].v - gBas[gBas.length - 1].v;
          nota1 = "Las dos últimas se separan <b>" + num(Math.abs(dif)) + " puntos</b>. " +
            "Mientras vayan juntas, las dos valen; si se abren, la de la cinta es la que no depende del agua.";
        }
      }
      var prim = pes[0], ult = pes[pes.length - 1], mayorHueco = 0;
      for (var iH = 1; iH < pes.length; iH++) {
        var dH = diasEntre(pes[iH - 1].f, pes[iH].f);
        if (dH > mayorHueco) mayorHueco = dH;
      }
      if (pes.length > 3 && !nota1) {
        nota1 = "Desde " + U.etiquetaFecha(prim.f) + ": <b>" + signo(ult.v - prim.v) + " kg</b>.";
      }
      if (mayorHueco > 21) {
        nota1 += (nota1 ? " " : "") + "Los tramos de guiones son huecos sin pesarte —el mayor, de " +
          mayorHueco + " días—, no bajadas ni subidas lentas.";
      }
    } else {
      cuerpo1 = sinDatos("Sin pesadas en este tramo", "Aquí no se dibuja nada inventado.");
    }
    var ultPeso = pes.length ? pes[pes.length - 1].v : null;
    h += tarjetaEvo("Peso y composición", ultPeso === null ? null : num(ultPeso), "kg",
      "El peso del día oscila más de un kilo por agua y tránsito: la línea gruesa es la media de 7 días, que es la que cuenta.",
      cuerpo1, nota1);

    /* ---------- 2. VFC, FC en reposo y sueño ---------- */
    var vfc = serieSalud("vfc", v), vfc7 = serieSalud("vfc7", v), fcr = serieSalud("fcr", v);
    var sue = serieSalud("sueno_min", v).map(function (p) { return { f: p.f, v: p.v / 60 }; });
    var cuerpo2, nota2 = "";
    if (vfc.length || fcr.length) {
      var par = (Salud.datos.meta && Salud.datos.meta.parametros) || {};
      /* VFC y pulso en reposo, en gráficas separadas: comparten rango de números
         pero no significan lo mismo, y juntos se aplastaban en una cinta.
         En tramos largos la VFC de cada noche se calla: son cientos de picos. */
      var tramoLargo = diasEntre(v.desde, v.hasta) > 200;
      cuerpo2 = grafica({
        desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 104, arriba: "VFC · ms", unidadTip: "ms",
        alt: "Variabilidad de la frecuencia cardíaca",
        explica: "La variabilidad del latido mientras duermes: cuanto más alta, más recuperado. " +
          "La línea de puntos es tu base de primavera.",
        lineasH: par.base_vfc ? [{ v: par.base_vfc, color: "#cfdcea", etq: "tu base" }] : [],
        series: (tramoLargo ? [] : [{ pts: vfc, color: "#c3d3e2", ancho: 0.7, marcarUltimo: false }])
          .concat([{ pts: vfc7, color: AZUL, ancho: 1.5 }])
      }) + leyenda([{ n: "media de 7 días", color: AZUL }].concat(
        tramoLargo ? [] : [{ n: "cada noche", color: "#c3d3e2" }]));
      if (fcr.length) {
        cuerpo2 += '<h3 class="evo-sub">Pulso en reposo</h3>' + grafica({
          desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 88, arriba: "lpm", unidadTip: "lpm",
          alt: "Frecuencia cardíaca en reposo",
          explica: "Las pulsaciones más bajas de la noche. Aquí bajar es mejorar, al revés que arriba.",
          lineasH: par.base_fcr ? [{ v: par.base_fcr, color: "#eccf9a", etq: "tu base" }] : [],
          series: [{ pts: tramoLargo ? mediaMovilDias(fcr, 7) : fcr, color: AMBAR, ancho: 1.2 }]
        });
      }
      if (sue.length) {
        cuerpo2 += '<h3 class="evo-sub">Sueño</h3>' + grafica({
          desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 88, arriba: "horas", min: 0, unidadTip: "h",
          alt: "Horas de sueño por noche",
          explica: "Horas dormidas cada noche, con la referencia de 7 h. Las dos últimas son las que pesan en el día de hoy.",
          lineasH: [{ v: 7, color: "#cfdcea", etq: "7 h" }],
          series: [{ pts: tramoLargo ? mediaMovilDias(sue, 7) : sue, color: "#7fa8cd",
                     barras: !tramoLargo, ancho: 1.2, opacidad: 0.85 }]
        }) + '<p class="nota-peque" style="margin:4px 0 0">' +
          (tramoLargo ? "En tramos largos, la media móvil de siete noches." : "Una barra por noche.") + "</p>";
      }
      if (bandas.length) {
        nota2 = "El tramo sombreado es el del corticoide: <b>ahí no se interpreta nada</b>, " +
          "porque el fármaco baja la VFC y sube el pulso por sí solo.";
      }
    } else {
      cuerpo2 = sinDatos("Sin datos de recuperación en este tramo");
    }
    h += tarjetaEvo("Recuperación", vfc7.length ? num(vfc7[vfc7.length - 1].v) : null, "ms",
      "La VFC dice lo que ya pasó; el sueño y la carga dicen lo que va a pasar.", cuerpo2, nota2);

    /* ---------- 3. forma, fatiga y carga contra la rampa ---------- */
    var ctl = serieSalud("ctl", v), atl = serieSalud("atl", v);
    var cs = seriesCargaSemanal();
    var cuerpo3, nota3 = "";
    if (ctl.length) {
      cuerpo3 = grafica({
        desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 112, arriba: "puntos", min: 0, unidadTip: "puntos",
        alt: "Forma y fatiga",
        explica: "Azul la forma, que es la carga acumulada de seis semanas; roja la fatiga, la de una. " +
          "Cuando la roja se queda arriba mucho tiempo, viene el parón.",
        series: [{ pts: ctl, color: AZUL, ancho: 1.5 },
                 { pts: atl, color: ROJO, ancho: diasEntre(v.desde, v.hasta) > 200 ? 0.7 : 1.1 }]
      }) + leyenda([{ n: "forma (CTL)", color: AZUL }, { n: "fatiga (ATL)", color: ROJO }]);
      if (cs.objetivos.length) {
        cuerpo3 += '<h3 class="evo-sub">Carga de cada semana contra el objetivo</h3>' + grafica({
          desde: cs.desde, hasta: cs.hasta, alto: 92, arriba: "carga semanal · la rampa entera", min: 0,
          alt: "Carga semanal real frente al objetivo del plan",
          explica: "Una barra clara por semana con lo que pide la rampa hasta diciembre, y encima en verde lo que llevas hecho.",
          series: [{ pts: cs.objetivos, color: "#cfdcea", barras: true, marcarUltimo: false },
                   { pts: cs.reales, color: VERDE, barras: true, marcarUltimo: false }]
        }) + leyenda([{ n: "objetivo de la rampa", color: "#cfdcea" }, { n: "lo hecho", color: VERDE }]);
      }
      var u3 = ctl[ctl.length - 1], p3 = ctl[0];
      nota3 = "Verde es lo que el plan propone, no lo que ha pasado: <b>nunca se mezclan en la misma línea</b>." +
        (ctl.length > 3 ? " La forma va de " + num(p3.v) + " a " + num(u3.v) + " en este tramo." : "");
    } else {
      cuerpo3 = sinDatos("Sin carga registrada en este tramo");
    }
    h += tarjetaEvo("Forma y fatiga", ctl.length ? num(ctl[ctl.length - 1].v) : null, "puntos",
      "La forma sube despacio y se cae rápido: por eso la rampa manda sobre las ganas.", cuerpo3, nota3);

    /* ---------- 4. cintura, cintura÷altura y vatios por kilo ---------- */
    var cin = serieApp("cintura", v), wkg = serieWkgMensual(v);
    var altura = (A.estado.perfil && A.estado.perfil.altura) || (P.grasaCinta && P.grasaCinta.altura_cm) || 182;
    var cuerpo4 = "", nota4 = "";
    if (cin.length >= 2) {
      cuerpo4 += grafica({
        desde: v.desde, hasta: v.hasta, alto: 100, arriba: "cm", alt: "Cintura", unidadTip: "cm",
        explica: "Tu cintura medida con cinta, con dos rayas: la de tu objetivo —media altura— y la de 102 cm, " +
          "que es el umbral de riesgo alto.",
        lineasH: [{ v: altura * 0.5, color: "#cfdcea", etq: "0,50 de tu altura" },
                  { v: 102, color: "#eccf9a", etq: "102 cm" }],
        series: [{ pts: cin, color: AZUL, ancho: 1.6, soloPuntos: cin.length < 3 }]
      });
    } else {
      cuerpo4 += sinDatos(
        cin.length === 1 ? "Solo hay una medida de cintura: " + num(cin[0].v) + " cm"
                         : "Todavía no hay medidas de cintura",
        "La gráfica aparece con la tercera. Se mide los lunes.");
    }
    if (wkg.length) {
      var uw = wkg[wkg.length - 1], pw = wkg[0];
      cuerpo4 += '<h3 class="evo-sub">Tu mejor sesión de cada mes</h3>' + grafica({
        desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 92, arriba: "W/kg", hueco: 70, unidadTip: "W/kg",
        alt: "Vatios por kilo de la mejor sesión de cada mes",
        explica: "Un punto por mes con los vatios por kilo de tu sesión más fuerte. Sube si mejora la forma o si baja el peso.",
        series: [{ pts: wkg, color: VERDE, ancho: 1.4, radio: 1.8 }]
      }) + '<p class="nota-peque" style="margin:4px 0 0">Un punto por mes: los vatios por kilo de la ' +
        "sesión más fuerte. Sube si mejora la forma o si baja el peso — por eso es la medida que junta " +
        "las dos mitades del plan." +
        (wkg.length > 2 ? " Ahora vas por <b>" + num(uw.v) + " W/kg</b>; tu mejor mes del tramo, " +
          num(Math.max.apply(null, wkg.map(function (x) { return x.v; }))) + "." : "") + "</p>";
    }
    var rc = cinturaAltura(U.hoyISO());
    if (rc) {
      nota4 = "Cintura ÷ altura: <b>" + rc.ratio.toFixed(2).replace(".", ",") + "</b>. El umbral de riesgo bajo " +
        "está en 0,50, que para tus " + rc.altura + " cm son " + rc.objetivo + " cm.";
    }
    h += tarjetaEvo("Cintura y rendimiento", cin.length ? num(cin[cin.length - 1].v) : null, "cm",
      "La cintura es la medida que más se mueve con el plan, y la que más dice del riesgo.", cuerpo4, nota4);

    h += volver;
    return h;
  }

  /* ==================== HISTÓRICO EMERGENTE ====================
     Cada fila —una medida o una línea de Mi estado— puede abrir su propia
     historia: la serie entera, la línea del objetivo y cuánto falta. Un número
     suelto no dice si vas bien; la curva y el objetivo, sí. */

  function alturaCm() {
    return (A.estado.perfil && A.estado.perfil.altura) || (P.grasaCinta && P.grasaCinta.altura_cm) || 182;
  }

  function pesoObjetivo() {
    var p = A.estado.perfil || {};
    return p.pesoObjetivo || p.objetivo || (P.atleta && P.atleta.peso_objetivo_kg) || null;
  }

  function baseSalud(k) {
    var par = (Salud.datos && Salud.datos.meta && Salud.datos.meta.parametros) || {};
    return par[k] || null;
  }

  /* El catálogo de lo que se puede abrir. «serie» devuelve [{f,v}] y «objetivo»
     la línea de referencia, que puede ser un techo (tensión) o una meta (peso). */
  function defHistoria(clave) {
    var v = { desde: "2019-01-01", hasta: U.hoyISO() };
    var D = {
      peso: { n: "Peso", u: "kg", dias: 90, serie: function () { return seriePeso(v); },
              media: 7, objetivo: pesoObjetivo(), etqObj: "tu objetivo",
              pie: "La línea gruesa es la media de 7 días, que es la que cuenta: el dato del día oscila más de un kilo por agua y tránsito." },
      cintura: { n: "Cintura", u: "cm", dias: 120, serie: function () { return serieApp("cintura", v); },
                 objetivo: Math.round(alturaCm() * 0.5), etqObj: "0,50 de tu altura",
                 techo: 102, etqTecho: "102 cm · riesgo alto",
                 pie: "El umbral de riesgo bajo es media altura. Es la medida que más se mueve con el plan." },
      cuello: { n: "Cuello", u: "cm", dias: 120, serie: function () { return serieApp("cuello", v); },
                pie: "Solo sirve para el cálculo de grasa por cinta: no es un objetivo en sí." },
      tobillo: { n: "Tobillo", u: "cm", dias: 30, serie: function () { return serieApp("tobillo", v); },
                 pie: "Mide líquido, no grasa. Lo que cuenta es el cambio respecto a tus días normales." },
      brazo: { n: "Brazo", u: "cm", dias: 180, serie: function () { return serieApp("brazo", v); }, pie: "Informativo: se mueve muy poco." },
      muslo: { n: "Muslo", u: "cm", dias: 180, serie: function () { return serieApp("muslo", v); },
               pie: "Donde vive el músculo del ciclista. Si el peso baja y el muslo aguanta, vas bien." },
      grasaCinta: { n: "Grasa por cinta", u: "%", dias: 120,
                    serie: function () { return serieGrasaCinta(v); },
                    pie: "Sale de cintura, cuello y altura. No depende del agua del cuerpo, así que para la tendencia es más fiable que la báscula." },
      grasa: { n: "Grasa corporal", u: "%", dias: 120, serie: function () { return serieSalud("grasa", v); },
               serie2: function () { return serieGrasaCinta(v); }, etq2: "por cinta",
               par: ["báscula", "cinta"],
               pie: "Azul la báscula, roja la cinta. Mientras vayan juntas, las dos valen." },
      musculo: { n: "Músculo", u: "kg", dias: 120, serie: function () { return serieMixta("musculo", v); },
                 pie: "La báscula lo mide y intervals no lo baja, así que solo entra si lo tecleas tú mirando la app de Garmin." },
      agua: { n: "Agua corporal", u: "%", dias: 120, serie: function () { return serieMixta("agua", v); },
              pie: "Sube al perder grasa y sube al retener líquido: con el corticoide pueden estar pasando las dos. Se mira junto al tobillo y al peso, nunca sola." },
      hueso: { n: "Masa ósea", u: "kg", dias: 365, serie: function () { return serieMixta("hueso", v); },
               pie: "En un adulto es casi una constante. Sirve de control de la báscula: si baila, la medición de ese día no vale." },
      magra: { n: "Masa magra", u: "kg", dias: 120, serie: function () { return serieSalud("magra", v); },
               pie: "El indicador principal del plan: lo que se quiere es que baje el peso y ésta aguante." },
      vfc: { n: "VFC", u: "ms", dias: 30, serie: function () { return serieSalud("vfc7", v); },
             objetivo: baseSalud("base_vfc"), etqObj: "tu base",
             pie: "Media de 7 noches. Dice lo que ya pasó, no lo que va a pasar." },
      fcr: { n: "FC en reposo", u: "lpm", dias: 30, serie: function () { return serieSalud("fcr", v); },
             objetivo: baseSalud("base_fcr"), etqObj: "tu base", invertido: true,
             pie: "Cuanto más baja, mejor. Cinco pulsaciones por encima de tu base tres días seguidos es señal." },
      sueno: { n: "Sueño", u: "h", dias: 14, serie: function () {
                 return serieSalud("sueno_min", v).map(function (p) { return { f: p.f, v: p.v / 60 }; });
               }, objetivo: 7, etqObj: "7 h",
               pie: "Lo que predice el día siguiente son las dos últimas noches, no la media del mes." },
      pt_sueno: { n: "Puntuación de sueño", u: "de 100", dias: 14, serie: function () { return serieSalud("pt_sueno", v); },
                  objetivo: 70, etqObj: "70", pie: "La nota que pone Garmin a la noche." },
      ctl: { n: "Forma (CTL)", u: "puntos", dias: 42, serie: function () { return serieSalud("ctl", v); },
             pie: "Sube despacio y se cae rápido. Mayo de 2026 estaba en 79." },
      carga: { n: "Carga semanal", u: "", serie: function () {
                 var cs = seriesCargaSemanal();
                 return cs.reales;
               }, serie2: function () { return seriesCargaSemanal().objetivos; }, etq2: "objetivo de la rampa",
               barras: true, pie: "Lo hecho contra lo que pedía la rampa, semana a semana." },
      tension: { n: "Tensión", u: "mmHg", dias: 30, serie: function () {
                   return tomasTension(v.desde, v.hasta).map(function (t) { return { f: t.f, v: t.sis }; });
                 }, serie2: function () {
                   return tomasTension(v.desde, v.hasta).map(function (t) { return { f: t.f, v: t.dia }; });
                 }, etq2: "diastólica", par: ["alta", "baja"], techo: 140, etqTecho: "140",
                 pie: "Azul la alta, roja la baja. Lo que se mira es la media de varios días, nunca una toma." },
      pulso: { n: "Pulso del tensiómetro", u: "ppm", dias: 30, serie: function () {
                 return tomasTension(v.desde, v.hasta).filter(function (t) { return t.pul; })
                   .map(function (t) { return { f: t.f, v: t.pul }; });
               }, pie: "Contraste independiente del pulso en reposo del reloj." }
    };
    D.sistolica = D.tension; D.diastolica = D.tension;
    return D[clave] || null;
  }

  var rangoHist = "1a";                 // tramo elegido en las ventanas emergentes
  var histAbierta = null;               // qué serie se está mirando ahora mismo

  function abrirHistoria(clave, rango) {
    var d = defHistoria(clave), caja = document.getElementById("modal-caja"), modal = document.getElementById("modal");
    if (!d || !caja || !modal) return;
    if (rango) rangoHist = rango;
    histAbierta = clave;
    var s1 = d.serie() || [], s2 = d.serie2 ? (d.serie2() || []) : [];
    /* el tramo recorta las dos series, igual que el selector de Evolución */
    var corte = null;
    for (var iR = 0; iR < RANGOS.length; iR++) if (RANGOS[iR].id === rangoHist && RANGOS[iR].d) {
      corte = U.sumarDias(U.hoyISO(), -RANGOS[iR].d);
    }
    if (corte) {
      s1 = s1.filter(function (x) { return x.f >= corte; });
      s2 = s2.filter(function (x) { return x.f >= corte; });
    }

    var h = '<header><h2>' + U.esc(d.n) + '</h2>' +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">×</button></header>';

    h += '<div class="evo-rangos">';
    RANGOS.forEach(function (r) {
      h += '<button type="button" class="evo-r' + (r.id === rangoHist ? " activo" : "") +
        '" data-histrango="' + r.id + '">' + U.esc(r.n) + "</button>";
    });
    h += "</div>";

    if (!s1.length && !s2.length) {
      h += '<div class="evo-vacio"><b>Sin datos de ' + U.esc(d.n.toLowerCase()) +
        (corte ? " en este tramo" : " todavía") + "</b>" +
        "<small>" + (corte ? "Prueba con un tramo más largo." : "Cuando haya dos medidas, aquí sale la curva.") +
        "</small></div>";
    } else {
      var AZUL = "#2f5c8a", ROJO = "#b3402f", GRIS = "#8aa0b5", VERDE = "#2f6b47";
      var lineas = [];
      if (d.objetivo) lineas.push({ v: d.objetivo, color: "#cfdcea", etq: d.etqObj || "objetivo" });
      if (d.techo) lineas.push({ v: d.techo, color: "#eccf9a", etq: d.etqTecho || "límite" });

      var series = [];
      if (d.media && s1.length > 3) {
        series.push({ pts: s1, color: GRIS, ancho: 0.8, marcarUltimo: false });
        series.push({ pts: mediaMovilDias(s1, d.media), color: AZUL, ancho: 1.6 });
      } else {
        series.push({ pts: s1, color: AZUL, ancho: 1.6, barras: !!d.barras,
                      soloPuntos: !d.barras && s1.length < 3 });
      }
      if (s2.length) series.push({ pts: s2, color: d.barras ? "#cfdcea" : ROJO, ancho: 1.3,
                                   barras: !!d.barras, marcarUltimo: !d.barras });

      var todo = s1.concat(s2);
      var desde = todo.length ? todo.map(function (x) { return x.f; }).sort()[0] : U.hoyISO();
      h += '<div class="hist-graf">' + grafica({
        desde: desde, hasta: U.hoyISO(), alto: 120, arriba: d.u, lineasH: lineas,
        bandas: bandasFarmaco({ desde: desde, hasta: U.hoyISO() }),
        alt: d.n, series: series, unidadTip: d.u, par: d.par,
        explica: "Tu serie de " + d.n + " en el tramo elegido" +
          (d.objetivo ? ", con la línea del objetivo" : "") +
          (d.techo ? " y la del límite" : "") +
          ". Pasa el dedo por encima para ver cada valor con su fecha."
      }) + "</div>";

      /* el resumen: dónde estás, hacia dónde vas y cuánto falta */
      var ult = s1[s1.length - 1] || s2[s2.length - 1];
      h += '<div class="hist-filas">';
      h += fila("Último", num(ult.v) + (d.u ? " " + d.u : ""), U.etiquetaFecha(ult.f));
      var yaDicho = {};
      [30, 90].forEach(function (dd) {
        var corte = U.sumarDias(U.hoyISO(), -dd), antes = null;
        s1.forEach(function (x) { if (x.f <= corte) antes = x; });
        if (antes) {
          var dif = ult.v - antes.v;
          /* si el dato más cercano a esa fecha es de mucho antes, se dice cuál
             es de verdad: «hace 30 días» con una medida de abril sería mentir */
          var lejos = diasEntre(antes.f, corte) > 10;
          if (!yaDicho[antes.f]) {                       // no repetir la misma medida dos veces
            yaDicho[antes.f] = 1;
            h += fila(lejos ? "Anterior, del " + U.etiquetaFecha(antes.f) : "Hace " + dd + " días",
              num(antes.v), signo(dif) + (d.u ? " " + d.u : ""));
          }
        }
      });
      if (d.objetivo) {
        var falta = d.invertido ? ult.v - d.objetivo : d.objetivo - ult.v;
        h += fila(d.etqObj ? d.etqObj.charAt(0).toUpperCase() + d.etqObj.slice(1) : "Objetivo",
          num(d.objetivo) + (d.u ? " " + d.u : ""),
          Math.abs(falta) < 0.05 ? "estás en el objetivo"
            : (falta > 0 ? "te faltan " + num(Math.abs(falta)) : "por encima en " + num(Math.abs(falta))));
      }
      if (d.techo) h += fila(d.etqTecho || "Límite", num(d.techo) + (d.u ? " " + d.u : ""),
        ult.v >= d.techo ? "por encima" : "por debajo");
      h += '<div class="hist-n">' + (s1.length + s2.length) + " medidas guardadas</div></div>";
    }

    if (d.pie) h += '<p class="hist-pie">' + U.esc(d.pie) + "</p>";
    h += '<button class="btn principal" type="button" data-cerrar-guia="1" style="width:100%;margin-top:14px">Cerrar</button>';
    caja.innerHTML = h;
    modal.classList.add("abierta");
  }

  /* ---------- guías de sesión ----------
     Las sesiones que piden pauta llevan su «cómo se hace» al lado del nombre. */
  function guiaDeSesion(texto) {
    var l = P.guiasSesion || [], t = String(texto || "").toLowerCase();
    for (var i = 0; i < l.length; i++) {
      if (l[i].patron && t.indexOf(l[i].patron) >= 0) return l[i];
    }
    return null;
  }

  function abrirGuiaSesion(id) {
    var l = P.guiasSesion || [], g = null;
    for (var i = 0; i < l.length; i++) if (l[i].id === id) g = l[i];
    var caja = document.getElementById("modal-caja"), modal = document.getElementById("modal");
    if (!g || !caja || !modal) return;

    var h = '<header><h2>' + U.esc(g.titulo) + '</h2>' +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">×</button></header>';
    if (g.entrada) h += '<p class="nota-peque evo-pie">' + U.esc(g.entrada) + "</p>";

    if (g.reglas && g.reglas.length) {
      h += '<div class="ses-reglas"><b>Antes de empezar</b><ul>';
      g.reglas.forEach(function (r) { h += "<li>" + r + "</li>"; });
      h += "</ul></div>";
    }

    (g.bloques || []).forEach(function (b) {
      h += '<div class="ses-bloque"><h3>' + U.esc(b.n) +
        (b.min ? '<span class="min">' + b.min + " min</span>" : "") + "</h3><ol>";
      b.pasos.forEach(function (p2) { h += "<li>" + p2 + "</li>"; });
      h += "</ol></div>";
    });

    if (g.fallos) h += '<div class="ent-fallos"><b>Lo que más falla:</b> ' + U.esc(g.fallos) + "</div>";
    h += '<button class="btn principal" type="button" data-cerrar-guia="1" style="width:100%;margin-top:14px">Entendido</button>';
    caja.innerHTML = h;
    modal.classList.add("abierta");
  }

  /* ==================== TENDENCIA Y CHISPA ====================
     Cada métrica sabe hacia dónde es «mejor», así que de su serie sale una
     tendencia con color: verde si va hacia donde debe, rojo si va al revés,
     azul si está plana. Gris cuando no hay datos para decirlo o cuando el
     corticoide manda callar. El dibujito es la misma serie en pequeño. */

  var COL_TEND = { bien: "#2f6b47", mal: "#b3402f", plano: "#8aa0b5", nada: "#c7cfcb",
                   exceso: "#5b3a7e" };          // morado: pasarse también es pasarse
  var MINIMO_TEND = 4;                            // medidas mínimas para pintar color

  /* hacia dónde es mejor que vaya cada una */
  var MEJOR = {
    peso: "baja", cintura: "baja", cuello: null, tobillo: null, brazo: null, muslo: null,
    grasa: "baja", grasaCinta: "baja", magra: "sube", musculo: "sube", vfc: "sube", fcr: "baja", sueno: "sube",
    pt_sueno: "sube", ctl: "sube", carga: "sube", tension: "baja", pulso: null
  };

  function serieDe(clave, dias) {
    var d = defHistoria(clave);
    if (!d) return [];
    var s = d.serie() || [];
    if (dias) {
      var corte = U.sumarDias(U.hoyISO(), -dias);
      s = s.filter(function (x) { return x.f >= corte; });
    }
    return s;
  }

  /* la tendencia: media del tercio final contra la del tercio inicial */
  function tendencia(clave, dias) {
    var d0 = defHistoria(clave);
    var v = dias || (d0 && d0.dias) || 90;
    var s = serieDe(clave, v);
    /* NO se cae a la serie entera cuando faltan datos. Hacerlo pintaba el peso
       de verde —«bajando»— porque miraba de agosto de 2025 a abril de 2026,
       mientras hoy sube. El color tiene que hablar del mismo tramo que el
       número que tiene al lado, o miente. */
    /* Con menos de cuatro medidas no se pinta color. Dos puntos separados
       cinco meses dibujan la historia que uno quiera, y un rojo que miente una
       vez deja de mirarse para siempre. */
    if (s.length < MINIMO_TEND) {
      var faltan = MINIMO_TEND - s.length;
      var cuanto = v >= 365 ? "el último año" : (v >= 60 ? "los últimos " + Math.round(v / 30) + " meses"
        : "los últimos " + v + " días");
      return { estado: "nada", color: COL_TEND.nada, serie: s, ventanaDias: v,
               texto: !s.length ? "sin medidas en " + cuanto
                 : "falta" + (faltan === 1 ? " 1 medida" : "n " + faltan + " medidas") + " en " + cuanto };
    }
    /* los tercios van de dos en dos como mínimo: con un solo punto por tercio,
       una pesada alta un día cualquiera daría la vuelta a la tendencia */
    var n = Math.max(2, Math.round(s.length / 3));
    if (n * 2 > s.length) n = Math.floor(s.length / 2);
    var pri = 0, ult = 0, i;
    for (i = 0; i < n; i++) pri += s[i].v;
    for (i = s.length - n; i < s.length; i++) ult += s[i].v;
    pri /= n; ult /= n;
    return calificar(clave, ult - pri, pri, s, false);
  }

  /* De cuánto tiempo habla la tendencia: se dice el tramo real que se ha
     mirado, no una ventana fija que muchas veces no es la que hay. */
  function ventanaTexto(serie) {
    if (!serie || serie.length < 2) return "";
    var d = Math.round((U.desdeISO(serie[serie.length - 1].f).getTime() -
                        U.desdeISO(serie[0].f).getTime()) / 86400000);
    if (d <= 1) return "el mismo día";
    if (d < 14) return "últimos " + d + " días";
    if (d < 70) return "últimas " + Math.round(d / 7) + " semanas";
    if (d < 400) return "últimos " + Math.round(d / 30) + " meses";
    return "último " + (d < 730 ? "año" : Math.round(d / 365) + " años");
  }

  function calificar(clave, dif, base, serie, flojo) {
    var mejor = MEJOR[clave], umbral = Math.abs(base) * 0.015;   // 1,5 %: menos es ruido
    var r = { serie: serie, dif: dif, flojo: flojo, ventana: ventanaTexto(serie), n: serie.length };
    if (Math.abs(dif) <= umbral || !mejor) {
      r.estado = mejor ? "plano" : "neutro";
      r.color = COL_TEND.plano;
      r.texto = mejor ? "estable" : (dif > 0 ? "sube" : (dif < 0 ? "baja" : "estable"));
      return r;
    }
    var bien = (mejor === "sube" && dif > 0) || (mejor === "baja" && dif < 0);
    r.estado = bien ? "bien" : "mal";
    r.color = bien ? COL_TEND.bien : COL_TEND.mal;
    r.texto = (dif > 0 ? "subiendo" : "bajando") + (flojo ? "" : "");
    return r;
  }

  /* El corticoide manda callar en VFC y pulso en reposo */
  /* El corticoide ya no borra la lectura: si va mal, sale en rojo y se explica
     que el fármaco puede ser el motivo. Esconder tres semanas de caída para no
     asustar es peor que enseñarlas con su porqué. */
  function tendenciaVisible(clave, dia) {
    var t = tendencia(clave);
    if ((clave === "vfc" || clave === "fcr") && Salud.conFarmaco(dia || U.hoyISO())) {
      t = { estado: t.estado, color: t.color, texto: t.texto, serie: t.serie,
            ventana: t.ventana, n: t.n, farmaco: true };
    }
    return t;
  }

  /* ---------- repartir el objetivo de la semana por días ----------
     El objetivo semanal se prorratea: si la semana son 280, el lunes se
     compara con lo que toca el lunes y no con 280. Pero NO a séptimos: el
     reparto va por los minutos previstos de cada día, porque hay días de
     descanso y porque el día grande es él solo casi un tercio de la semana.
     Y el día grande no se da por debido hasta que el fin de semana termina:
     el sábado por la mañana todavía te queda por delante, y cobrártelo antes
     pintaría de rojo a quien va perfecto. */
  function minutosDia(iso, sem, talla) {
    var ses = sesionesDe(iso, sem, talla), m = 0, grande = false;
    ses.forEach(function (x) {
      if (x.grande) { grande = true; m += (P.diaGrande && P.diaGrande.minutos) || 180; }
      else m += x.min || 0;
    });
    return { min: m, grande: grande };
  }

  function repartoSemana(sem, dia) {
    var talla = tallaDe(sem), total = 0, hecho = 0, grandeVisto = false, f;
    for (f = sem.desde; f <= sem.hasta; f = U.sumarDias(f, 1)) {
      var d = minutosDia(f, sem, talla);
      if (d.grande) {
        if (grandeVisto) continue;              // el día grande es UNO, aunque salga en los dos huecos
        grandeVisto = true;
        total += d.min;
        if (dia >= sem.hasta) hecho += d.min;   // solo se debe cuando la semana acaba
      } else {
        total += d.min;
        if (f <= dia) hecho += d.min;
      }
    }
    if (!total) return { parte: 1, cuando: "esta semana" };
    return { parte: Math.min(1, hecho / total),
             cuando: dia >= sem.hasta ? "en la semana entera" : "a estas alturas de la semana" };
  }

  /* La carga no tiene dirección buena: lo bueno es acercarse al objetivo. */
  function tendenciaCarga(sem, dia) {
    var cfg = (P.pase && P.pase.colorCarga) || { exceso: 1.15, bien: 0.95, flojo: 0.70 };
    var cs = cargaSemana(U.lunesDe(dia), dia);
    if (!sem || !sem.carga || cs === null) {
      return { estado: "nada", color: COL_TEND.nada, texto: "sin datos de carga", serie: [] };
    }
    if (sem.criterio === "asistencia") {
      return { estado: "nada", color: COL_TEND.nada, serie: [],
               texto: "esta semana se juzga por días movidos, no por carga" };
    }
    var r = repartoSemana(sem, dia);
    var objetivo = sem.carga * r.parte;
    var pct = objetivo > 0 ? cs / objetivo : null;
    if (pct === null) return { estado: "nada", color: COL_TEND.nada, texto: "sin objetivo", serie: [] };
    var pc = Math.round(pct * 100) + " % de los " + Math.round(objetivo) +
      " que tocarían " + r.cuando;
    if (pct >= cfg.exceso) return { estado: "exceso", color: COL_TEND.exceso, texto: "pasándote · " + pc, serie: [], pct: pct };
    if (pct >= cfg.bien)   return { estado: "bien",   color: COL_TEND.bien,   texto: "en objetivo · " + pc, serie: [], pct: pct };
    if (pct >= cfg.flojo)  return { estado: "plano",  color: COL_TEND.plano,  texto: "algo corto · " + pc, serie: [], pct: pct };
    return { estado: "mal", color: COL_TEND.mal, texto: "no llegas · " + pc, serie: [], pct: pct };
  }

  /* el dibujito: la misma serie, en 74×20, sin ejes ni adornos */
  function chispa(clave, dia) {
    var t = tendenciaVisible(clave, dia), s = t.serie || [];
    if (s.length < 2) return '<span class="chispa vacia" title="' + U.esc(t.texto) + '"></span>';
    var W = 74, H = 20, P = 2;
    var min = Infinity, max = -Infinity;
    s.forEach(function (p) { if (p.v < min) min = p.v; if (p.v > max) max = p.v; });
    if (max - min < 1e-9) { max += 0.5; min -= 0.5; }
    var t0 = U.desdeISO(s[0].f).getTime(), t1 = U.desdeISO(s[s.length - 1].f).getTime();
    if (t1 <= t0) t1 = t0 + 86400000;
    var pts = s.map(function (p) {
      var x = P + (W - 2 * P) * ((U.desdeISO(p.f).getTime() - t0) / (t1 - t0));
      var y = P + (H - 2 * P) * (1 - (p.v - min) / (max - min));
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var u = s[s.length - 1];
    var ux = P + (W - 2 * P), uy = P + (H - 2 * P) * (1 - (u.v - min) / (max - min));
    return '<span class="chispa" title="' + U.esc(t.texto) + '">' +
      '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + t.color +
      '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + ux.toFixed(1) + '" cy="' + uy.toFixed(1) + '" r="2" fill="' + t.color + '"/>' +
      "</svg></span>";
  }

  /* ---------- la barra de referencia ----------
     Un número solo no contesta «¿esto es mucho o poco?». La barra lo sitúa
     entre tu peor y tu mejor de la serie, con una marca en tu base o en tu
     objetivo, que es contra lo que de verdad se compara. */
  function barraRef(clave, valor, t) {
    if (valor === null || valor === undefined || isNaN(valor)) return "";
    var d = defHistoria(clave);
    var s = (t && t.serie && t.serie.length) ? t.serie : serieDe(clave, (d && d.dias) || 90);
    if (s.length < 2) return "";          // con un punto la barra iría de 43,5 a 43,5
    var min = Infinity, max = -Infinity;
    s.forEach(function (x) { if (x.v < min) min = x.v; if (x.v > max) max = x.v; });
    if (valor < min) min = valor;
    if (valor > max) max = valor;

    var marca = null, etqM = "";
    if (d && d.objetivo) { marca = d.objetivo; etqM = d.etqObj || "objetivo"; }
    else if (d && d.techo) { marca = d.techo; etqM = d.etqTecho || "límite"; }
    if (marca !== null) {                       // la marca tiene que caber dentro
      if (marca < min) min = marca;
      if (marca > max) max = marca;
    }
    var margen = (max - min) * 0.08 || 1;
    min -= margen; max += margen;
    if (max - min < 1e-9) return "";

    /* La barra se llena SIEMPRE hacia lo bueno. Si no, llena significaría
       «mucha VFC» (bien) en una fila y «mucho pulso» (mal) en la de al lado,
       y una barra que cambia de sentido cada tres centímetros no se lee. */
    var invertida = MEJOR[clave] === "baja";
    function pos(v) {
      var f = (v - min) / (max - min);
      if (invertida) f = 1 - f;
      return Math.max(0, Math.min(100, f * 100));
    }
    var u = d && d.u ? " " + d.u : "";
    var izq = invertida ? max - margen : min + margen;      // izquierda: lo peor
    var der = invertida ? min + margen : max - margen;      // derecha: lo mejor
    return '<div class="est-barra"><i style="width:' + pos(valor).toFixed(0) + '%;background:' +
        (t ? t.color : COL_TEND.plano) + '"></i>' +
        (marca === null ? "" : '<span class="marca" style="left:' + pos(marca).toFixed(0) + '%"></span>') +
      "</div>" +
      '<div class="est-pie"><span>' + U.esc(num(izq)) + "</span>" +
      (marca === null ? "<span></span>"
        /* si la etiqueta ya trae el número —«7 h», «140»— no se repite */
        : "<span>" + U.esc(/\d/.test(etqM) ? etqM : etqM + " " + num(marca)) + "</span>") +
      "<span>" + U.esc(num(der)) + u + "</span></div>";
  }

  /* ---------- la tarjeta de Mi estado ----------
     Mismo rectángulo que «Lo que dicen tus medidas»: barra de color a la
     izquierda, título, el valor grande a la derecha, la barra de referencia y
     la tendencia al pie. */
  function tarjeta(nombre, valor, contra, clave, t, crudo) {
    var tt = t || (clave ? tendenciaVisible(clave, U.hoyISO()) : null);
    var est = tt ? tt.estado : "nada";
    var abre = clave && defHistoria(clave);
    var etiqueta = "";
    if (tt && tt.texto) {
      etiqueta = tt.texto +
        (tt.ventana && tt.estado !== "nada" ? " · " + tt.ventana : "") +
        (tt.n && tt.estado !== "nada" ? " · " + tt.n + (tt.n === 1 ? " medida" : " medidas") : "") +
        (tt.farmaco ? " · puede ser el corticoide" : "");
    }
    return "<" + (abre ? 'button type="button" data-historia="' + clave + '"' : "div") +
      ' class="ent-estim con-tend est-tarj t-' + est + (abre ? " pulsable" : "") + '">' +
      '<div class="est-cab"><span class="est-txt"><b>' + U.esc(nombre) + "</b>" +
        (contra ? "<small>" + U.esc(contra) + "</small>" : "") + "</span>" +
        (clave ? chispa(clave) : "") +
        '<span class="est-val">' + (valor === null || valor === undefined ? "—" : valor) + "</span></div>" +
      (clave && crudo !== null && crudo !== undefined ? barraRef(clave, crudo, tt) : "") +
      (etiqueta ? '<em class="est-tend">' + U.esc(etiqueta) + "</em>" : "") +
      "</" + (abre ? "button" : "div") + ">";
  }

  function puntoTend(clave, dia) {
    var t = tendenciaVisible(clave, dia);
    return '<i class="tend-punto" style="background:' + t.color + '" title="' + U.esc(t.texto) + '"></i>';
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

  function pintar(mantener) {
    var cont = document.getElementById("vista-entreno");
    if (!cont || !A.estado) return;
    aplicarPases();                         // lo primero: la cola al día antes de dibujar nada
    vestir(cont.classList.contains("activa"));
    cont.innerHTML = (bloque === "plan") ? htmlPlan()
      : (bloque === "evolucion") ? htmlEvolucion()
      : (bloque === "actividad") ? htmlActividad() : htmlPortada();
    if (bloque === "actividad") montarArchivo();
    if (!mantener) window.scrollTo(0, 0);
  }

  /* Repintar cuesta la pantalla entera: el scroll sube y el foco desaparece.
     Tecleando agua, músculo y hueso seguidos, cada valor te echaba de la
     pantalla. Así que antes de repintar se apunta dónde estabas y después se
     devuelve. Lo que se guarda es DÓNDE ESTÁ EL FOCO AHORA, no qué casilla
     cambió: al tabular, el cambio lo dispara la casilla que dejas y el foco ya
     está en la siguiente — devolverlo a la que dejaste sería ir hacia atrás. */
  function pintarConservando() {
    /* Se repinta en el siguiente tick, no ahora. Al tabular, el «change» salta
       ANTES de que el navegador haya movido el foco a la casilla siguiente: si
       repintamos aquí, el foco viaja a un nodo que ya no existe y se pierde.
       Esperando un tick, el foco ya está donde el usuario lo quiere y solo hay
       que devolverlo a la casilla equivalente del árbol nuevo. */
    setTimeout(function () {
      var y = window.scrollY || window.pageYOffset || 0;
      var a = document.activeElement, clave = null, ini = null, fin = null;
      if (a && a.getAttribute) {
        /* vale cualquier ancla estable, no solo una casilla de medida */
        ["data-medida", "data-check", "data-historia"].forEach(function (at) {
          if (!clave && a.getAttribute(at)) clave = "[" + at + '="' + a.getAttribute(at) + '"]';
        });
        try { ini = a.selectionStart; fin = a.selectionEnd; } catch (e) { ini = null; }
      }
      pintar(true);
      window.scrollTo(0, y);
      if (clave) {
        var n = document.querySelector(clave);
        if (n) {
          try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); }
          /* los input[type=number] no dejan tocar la selección en algunos
             navegadores: si protesta, basta con tener el foco */
          try { if (ini !== null) n.setSelectionRange(ini, fin); } catch (e) {}
          window.scrollTo(0, y);
        }
      }
    }, 0);
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
    var todosAv = avisosOrdenados(hoy), av = todosAv.slice(0, 2), sem0 = (P.semaforo || {});
    var hayConsulta = todosAv.some(function (a) { return a.d.nivel === "consulta"; });
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
    h += '<div class="ent-avisos' + (todosAv.length ? " pulsable" : "") + '"' +
      (todosAv.length ? ' role="button" tabindex="0" data-avisos="1"' : "") + ">" +
      '<span class="et">Avisos · ' + todosAv.length + "</span>";
    if (!todosAv.length) {
      h += '<small class="ok">Nada que atender hoy.</small>';
    } else {
      av.forEach(function (a) { h += htmlAviso(a); });
      /* el contador decía dos porque solo caben dos: el resto vive en la ventana */
      h += '<span class="av-mas">' +
        (todosAv.length > av.length
          ? "y " + (todosAv.length - av.length) +
            (todosAv.length - av.length === 1 ? " aviso más" : " avisos más") + " · tócalo para verlos todos"
          : "Tócalo para verlo con su explicación") + "</span>";
    }
    h += "</div></div>";

    /* cabecera */
    h += '<div class="tarjeta ent-cab">' +
      '<img src="' + img + '" alt="" onerror="this.style.display=\'none\'">' +
      '<div class="centro"><span class="ent-etq">Semana ' + sem.n + " · " + U.esc(pl.nombre) + "</span>" +
      "<h2>El Plan</h2>" +
      '<p class="nota-peque">' + U.etiquetaFecha(sem.desde) + " – " + U.etiquetaFecha(sem.hasta) +
        " · carga objetivo <b>" + sem.carga + "</b>" + (sem.nota ? " · " + U.esc(sem.nota) : "") + "</p></div>" +
      '<div class="ent-racha"><b>' + racha() + "</b><span>días seguidos</span></div>" +
      '<div class="ent-talla"><span class="nota-peque">Esta semana va como</span><select id="ent-talla">' +
      ["R", "A", "B", "S"].map(function (k) {
        return '<option value="' + k + '"' + (k === talla ? " selected" : "") + ">" +
          U.esc(P.plantillas[k].nombre) + "</option>";
      }).join("") +
      '</select><small class="pie">' + U.esc(pl.pie) + "</small></div></div>";

    /* qué decidió el pase del lunes, y por qué esta semana es la que es */
    h += htmlPaseAplicado(sem);

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
      var id = "s" + i, m = marcaDe(dia, id), v = valorMarca(m), reloj = relojPara(dia, s);
      var aMano = sinReloj(s);
      var tarde = (!aMano && v === "no") ? desmienteAlNo(dia, s, m) : null;
      var porElReloj = (!aMano && v !== true && (v !== "no" || tarde) && !!reloj);
      var ayuda;
      if (aMano) {
        ayuda = (v === true ? "Marcada. " : "") + (P.textoSinReloj || "El reloj no mide esto: la marcas tú.");
      } else if (tarde) {
        /* la habías dado por no hecha y luego saliste: manda el dato */
        ayuda = "La habías marcado como no hecha, pero después el reloj midió " + tarde.min +
          " min de «" + tarde.nombre + "». Cuenta como hecha.";
      } else if (porElReloj) {
        ayuda = "El reloj midió " + reloj.min + " min de «" + reloj.nombre + "». Si no la hiciste, desmárcala y se queda desmarcada.";
      } else if (v === "no") {
        ayuda = "La has marcado como no hecha.";
      } else if (v === true) {
        ayuda = "La has marcado a mano.";
      } else {
        ayuda = s.grande ? P.diaGrande.aviso : P.textos.auto;
      }
      filas.push({
        id: id, nombre: s.t + (s.min ? " · " + s.min + " min" : ""),
        hecho: sesionHecha(dia, s, i), ayuda: ayuda,
        sello: porElReloj ? "reloj" : "",
        /* sin este enlace no hay forma de volver a «sin marca», que es el único
           estado en el que decide el reloj: marcar guarda true, desmarcar
           guarda «no», y no había tercera posición */
        /* en las que el reloj no mide, «que decida el reloj» sería dejarla sin
           decidir para siempre: no se ofrece */
        borrable: (!aMano && (v === true || v === "no")) ? id : null,
        guia: guiaDeSesion(s.t)
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
            (f.guia ? '<button type="button" class="ent-comose" data-sesion-guia="' + f.guia.id +
              '">cómo se hace</button>' : "") +
          "</b>" + (f.ayuda ? "<small>" + U.esc(f.ayuda) +
            (f.borrable ? ' <button type="button" class="ent-soltar" data-soltar="' + f.borrable +
              '">que decida el reloj</button>' : "") + "</small>" : "") + "</span></label></li>";
      });
      h += "</ul>";
    }

    /* Las medidas van en dos grupos: las que el método pide HOY, que son las
       obligatorias, y el resto, que están ahí por si te apetece medir.
       La fecha del día abierto es la que se guarda. */
    var tocanHoy = [], lasDemas = [];
    P.medidas.forEach(function (m) { (tocaMedida(m, dia) ? tocanHoy : lasDemas).push(m); });

    function pintaMedida(m) {
      var v = valorDe(dia, m.id);
      var puesta = (v !== null && v !== undefined && v !== "");
      var ult = puesta ? null : ultimoValor(m.id, dia);
      var toca = tocaMedida(m, dia);
      return '<label class="ent-medida' + (puesta ? " puesta" : "") + (toca ? " toca" : "") + '">' +
        "<span>" + U.esc(m.nombre) + " (" + m.unidad + ")" +
          (defHistoria(m.id) ? '<button type="button" class="ent-ver" tabindex="-1" data-historia="' + m.id +
            '" title="Ver histórico" aria-label="Ver histórico de ' + U.esc(m.nombre) + '">' + ICONO_GRAF + "</button>" : "") +
        "</span>" +
        (m.texto
          ? '<input type="text" inputmode="numeric" placeholder="128/82" data-medida="' + m.id + '" value="' + U.esc(puesta ? v : "") + '">'
          : '<input type="number" step="' + m.paso + '" min="' + m.min + '" max="' + m.max + '"' +
            (ult ? ' placeholder="' + ult.v + '"' : "") +
            ' data-medida="' + m.id + '" value="' + (puesta ? v : "") + '">') +
        '<small>' + (puesta ? "anotado hoy"
          : (ult ? "último " + num(ult.v) + " · " + U.etiquetaFecha(ult.f) : "sin medir todavía")) + "</small>" +
        "</label>";
    }

    if (P.medidas.length) {
      /* la ayuda, antes de las casillas: se lee antes de medir, no después */
      h += '<button type="button" class="ent-ayuda" data-guia="*">' +
        '<span class="i">?</span>' +
        '<span class="t"><b>Ayuda: cómo se mide cada cosa</b>' +
        "<small>Cintura, cuello, tensión, tobillo, peso… y cómo funciona esta pantalla</small></span>" +
        '<span class="v">›</span></button>';
      if (tocanHoy.length) {
        var faltan = 0;
        tocanHoy.forEach(function (m) {
          var v = valorDe(dia, m.id);
          if (v === null || v === undefined || v === "") faltan++;
        });
        h += '<h3 class="ent-subt">Hoy toca medir' +
          '<span class="ent-cuenta">' + (faltan === 0 ? "todas anotadas" : faltan + " sin anotar") + "</span></h3>";
        h += '<div class="ent-medidas obligatorias">';
        tocanHoy.forEach(function (m) { h += pintaMedida(m); });
        h += "</div>";
      }
      if (lasDemas.length) {
        h += '<h3 class="ent-subt suave">Las demás<span class="ent-cuenta">solo si te apetece</span></h3>';
        h += '<div class="ent-medidas">';
        lasDemas.forEach(function (m) { h += pintaMedida(m); });
        h += "</div>";
      }
      h += htmlObs(dia);
      h += htmlImportarTension(dia);
    }
    h += "</div>";

    h += htmlMisMedidas(dia);

    /* lo que sale de todo eso: primero la lectura del día, luego el estado */
    var lec = lecturas(dia);
    if (lec.length) {
      h += '<div class="tarjeta"><h2>Lo que dicen tus medidas</h2>';
      lec.forEach(function (l) {
        var t = l.k ? tendenciaVisible(l.k, dia) : null;
        h += '<div class="ent-estim' + (t ? " con-tend t-" + t.estado : "") + '">' +
          (l.k ? '<div class="est-cab"><b>' + U.esc(l.t) + "</b>" + chispa(l.k, dia) + "</div>"
               : "<b>" + U.esc(l.t) + "</b>") +
          "<small>" + U.esc(l.d) + "</small>" +
          (t && t.estado !== "nada" && t.estado !== "neutro"
            ? '<em class="est-tend">' + U.esc(t.texto) +
              (t.ventana ? " · " + U.esc(t.ventana) : "") +
              (t.n ? " · " + t.n + (t.n === 1 ? " medida" : " medidas") : "") + "</em>" : "") +
          "</div>";
      });
      h += "</div>";
    }

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
      /* Cuatro estados, y el color dice de qué habla cada uno:
         ámbar claro = fuera del plan, no hay nada que juzgar (los días
         anteriores al 18 de septiembre); verde = día terminado y cumplido;
         rojo = día terminado sin cumplir; azul = lo vigente y lo que viene.
         Hoy se queda azul aunque ya esté hecho: todavía está corriendo. */
      var cumplido = semF && diaCumplido(f, semF, tallaDe(semF));
      var estadoDia = !semF ? "fuera"
        : (f > hoy ? "pend" : (f === hoy ? "pend" : (cumplido ? "ok" : "fallo")));
      var ok = (estadoDia === "ok") || (f === hoy && cumplido);
      h += '<div class="ent-dia ' + estadoDia + (f === hoy ? " hoy" : "") + (f === dia ? " sel" : "") + (ok ? " ok" : "") +
        '" data-dia="' + f + '" role="button" tabindex="0">' +
        '<span class="d">' + DIA_CORTO[fd.getDay()] + '</span><span class="f">' + fd.getDate() + "</span>" +
        '<span class="q">' + (!semF ? "—" : (ss.length
          ? U.esc(ss.map(function (s) { return s.t.split(":")[0].split(",")[0]; }).join(" · "))
          : "descanso")) + "</span><span class=\"p\"></span></div>";
    }
    h += "</div>";
    h += '<p class="nota-peque" style="margin-top:10px">' + U.esc(P.suelo) +
      " El fin de semana, un solo día grande: " + U.esc(textoDiaGrande(sem).toLowerCase()) + ". El otro, descanso.</p></div>";

    /* El diario: lo marcado y lo escrito cada día de la semana. Es lo que
       contesta «¿qué lesión era?» cuando se mira esto dentro de tres meses. */
    var diario = "";
    for (var iD = 0; iD < 7; iD++) {
      var fD = U.sumarDias(lunes, iD), oD = obsDe(fD);
      if (!oD || (!(oD.m || []).length && !oD.nota)) continue;
      var fichas = (oD.m || []).map(function (v) {
        var m = motivo(v);
        return m ? m.n : v;
      });
      diario += '<div class="ent-dia-obs"><b>' + U.esc(DIA_CORTO[U.desdeISO(fD).getDay()]) + " " +
        U.desdeISO(fD).getDate() + "</b>" +
        (fichas.length ? '<span class="ms">' + U.esc(fichas.join(" · ")) + "</span>" : "") +
        (oD.nota ? '<small>«' + U.esc(oD.nota) + "»</small>" : "") + "</div>";
    }
    if (diario) {
      h += '<div class="tarjeta"><h2>Lo que ha pasado esta semana</h2>' +
        '<p class="nota-peque evo-pie">Lo que marcaste y lo que escribiste, día a día. De aquí sale el pase del domingo.</p>' +
        diario + "</div>";
    }

    h += '<button type="button" class="ent-atras abajo" data-volver="1">' + FLECHA + "Volver a Entrenamiento</button>";

    return h;
  }

  /* ==================== MI ESTADO ==================== */

  function hhmm(min) {
    if (!min && min !== 0) return null;
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    return h + "h" + (m < 10 ? "0" : "") + m;
  }

  function fila(nombre, valor, contra, apagada, historia) {
    if (historia && defHistoria(historia)) {
      return '<button type="button" class="ent-fila con-historia' + (apagada ? " apagada" : "") +
        '" data-historia="' + historia + '">' +
        '<span class="n">' + puntoTend(historia) + U.esc(nombre) + ICONO_GRAF + "</span>" +
        '<span class="ch">' + chispa(historia) + "</span>" +
        '<span class="v">' + (valor === null || valor === undefined ? "—" : valor) + "</span>" +
        '<span class="c">' + U.esc(contra || "") + "</span></button>";
    }
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

  /* Observaciones: una fila de fichas debajo de las medidas. Multi-selección,
     un toque cada una, y una nota corta si hace falta detalle. */
  function htmlObs(dia) {
    var cfg = P.observaciones;
    if (!cfg) return "";
    var d = obsDe(dia) || { m: [] }, puestos = d.m || [];

    var h = '<h3 class="ent-subt">' + U.esc(cfg.titulo) +
      '<span class="ent-cuenta">' + (puestos.length ? puestos.length + " marcada" + (puestos.length > 1 ? "s" : "") +
        (d.hora ? " · " + U.esc(d.hora) : "") : "día normal") + "</span></h3>";
    h += '<div class="ent-obs">';
    cfg.motivos.forEach(function (m) {
      h += '<button type="button" class="ent-ficha' + (puestos.indexOf(m.v) >= 0 ? " puesta" : "") +
        '" data-obs="' + m.v + '">' + U.esc(m.n) + "</button>";
    });
    h += "</div>";

    /* la explicación solo aparece cuando algo está marcado: si no, estorba */
    var dichos = {};
    puestos.forEach(function (v) {
      var m = motivo(v);
      if (!m) return;
      if (m.ayuda && !dichos["a" + v]) { dichos["a" + v] = 1; h2(m.ayuda); }
      if (m.efecto && cfg.textos[m.efecto] && !dichos[m.efecto]) {
        dichos[m.efecto] = 1;
        h2(cfg.textos[m.efecto]);
      }
    });
    function h2(txt) { h += '<p class="ent-obs-dice">' + U.esc(txt) + "</p>"; }

    h += '<textarea class="ent-nota" data-obs-nota="1" rows="2" placeholder="' +
      U.esc(cfg.nota.ph) + '">' + U.esc(d.nota || "") + "</textarea>";
    return h;
  }

  /* Importar el CSV del tensiómetro desde el propio aparato o el móvil: el
     fichero no sale de aquí, se lee en la app y las tomas se guardan con el
     resto del estado. */
  function htmlImportarTension(dia) {
    var tot = tomasImportadas().length;
    var sem = tomasTension(U.sumarDias(dia, -6), dia).length;
    return '<div class="ent-tension">' +
      '<label class="ent-mini-file"><input type="file" accept=".csv,text/csv,text/plain" data-csv-tension="1">' +
      "<span>Importar CSV del tensiómetro</span></label>" +
      '<small>' + (tot ? tot + " tomas guardadas · " + sem + " esta semana"
        : "Aún no has importado ninguna. Exporta desde la app del tensiómetro y suelta el fichero aquí.") + "</small></div>";
  }

  /* ==================== LO QUE ESTOY MIDIENDO ====================
     Las medidas que se teclean, con el mismo formato que Mi estado: valor,
     dibujito, barra contra la referencia y tendencia con su color. Mientras no
     haya cuatro medidas el semáforo está apagado y dice cuántas faltan — que es
     precisamente el estado en el que están casi todas ahora mismo. */

  var MIS_MEDIDAS = [
    { k: "cintura", n: "Cintura", u: " cm" },
    { k: "cuello",  n: "Cuello",  u: " cm" },
    { k: "tobillo", n: "Tobillo", u: " cm" },
    { k: "muslo",   n: "Muslo",   u: " cm" },
    { k: "brazo",   n: "Brazo",   u: " cm" }
  ];

  function htmlMisMedidas(dia) {
    var h = '<div class="tarjeta"><h2>Lo que estoy midiendo</h2>' +
      '<p class="nota-peque">Lo que has anotado tú, con su tendencia. ' +
      "El color aparece a partir de la cuarta medida.</p>";

    MIS_MEDIDAS.forEach(function (m) {
      var u = ultimaMedida(dia, m.k), pie = u ? "del " + U.etiquetaFecha(u.f) : "sin anotar todavía";
      /* el tobillo se lee contra su propia media: es lo que distingue líquido
         de grasa, y antes se decía en una lectura aparte */
      if (m.k === "tobillo" && u) {
        var tb = serieMedida("tobillo", dia, 21), prev = tb.slice(0, -1), mp = media(prev);
        if (mp !== null) {
          var dt = u.v - mp;
          pie += " · " + (Math.abs(dt) < 0.05 ? "igual que tu media de " + prev.length + " días"
            : signo(dt) + " cm sobre tu media de " + prev.length + " días") +
            (dt >= 0.7 ? " — eso es líquido, no grasa" : "");
        }
      }
      h += tarjeta(m.n, u ? num(u.v) + m.u : null, pie, m.k, null, u ? u.v : null);
    });

    /* la tensión va con sus dos cifras, así que se cuenta aparte */
    var mt = mediaTension(U.sumarDias(dia, -6), dia);
    h += tarjeta("Tensión", mt ? Math.round(mt.sis) + "/" + Math.round(mt.dia) : null,
      mt ? "media de " + mt.n + (mt.n === 1 ? " toma" : " tomas") + " en 7 días · el color lo manda la alta" +
           (mt.alta ? " · en o por encima de 140/90: dato para la revisión" : "")
         : "sin tomas anotadas", "tension", null, mt ? mt.sis : null);
    if (mt && mt.pul) {
      h += tarjeta("Pulso del tensiómetro", Math.round(mt.pul) + " ppm",
        "contraste independiente del pulso del reloj", "pulso", null, mt.pul);
    }

    /* las tres de la báscula que intervals no baja y tecleas tú */
    [{ k: "musculo", n: "Músculo", u: " kg",
       vacio: "lo mide tu báscula pero no llega a intervals: anótalo cuando te acuerdes" },
     { k: "agua", n: "Agua corporal", u: " %",
       vacio: "de la misma pantalla de Garmin · sin color a propósito: sube por grasa y por retención" },
     { k: "hueso", n: "Masa ósea", u: " kg",
       vacio: "de la misma pantalla de Garmin · sirve de control de la báscula" }
    ].forEach(function (m) {
      var u = ultimaMedida(dia, m.k) || ultimoDeSalud(m.k, dia);
      h += tarjeta(m.n, u ? num(u.v) + m.u : null,
        u ? "del " + U.etiquetaFecha(u.f) + " · lo anotas tú desde la app de Garmin" : m.vacio,
        m.k, null, u ? u.v : null);
    });

    /* la grasa por cinta sale de cintura y cuello, así que vive aquí */
    var gc = grasaPorCinta(dia);
    h += tarjeta("Grasa estimada por cinta", gc ? num(gc.pct) + " %" : null,
      gc ? "de la cintura y el cuello del " + U.etiquetaFecha(gc.fecha) + " · no depende del agua"
         : "hacen falta cintura y cuello", "grasaCinta", null, gc ? gc.pct : null);
    return h + "</div>";
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

    h += tarjeta("VFC de anoche", d.vfc ? d.vfc + " ms" : null,
      baseVfc ? "tu base: " + num(baseVfc) + " ms" : "", "vfc", null, d.vfc || null);
    h += tarjeta("FC en reposo", d.fcr ? d.fcr + " lpm" : null,
      baseFcr ? "tu base: " + num(baseFcr) + " lpm" : "", "fcr", null, d.fcr || null);

    var n1 = Salud.dia(fechaDato) || {}, n2 = Salud.dia(U.sumarDias(fechaDato, -1)) || {};
    var s1 = hhmm(n1.sueno_min), s2 = hhmm(n2.sueno_min);
    h += tarjeta("Sueño, dos últimas noches", (s1 || "—") + (s2 ? " · " + s2 : ""),
      "tu media: 6h24", "sueno", null, n1.sueno_min ? n1.sueno_min / 60 : null);

    /* Body Battery no baja de Garmin a intervals —no está entre los campos que
       la integración descarga—, así que solo sale los días que lo tienen del
       histórico. En su lugar, la puntuación de sueño, que sí llega. */
    h += tarjeta("Puntuación de sueño", (d.pt_sueno || d.pt_sueno === 0) ? d.pt_sueno : null,
      "de 100, de Garmin", "pt_sueno", null,
      (d.pt_sueno || d.pt_sueno === 0) ? d.pt_sueno : null);

    var bal = (typeof d.ctl === "number" && typeof d.atl === "number") ? d.ctl - d.atl : null;
    h += tarjeta("Forma y fatiga", (typeof d.ctl === "number") ? num(d.ctl) + " / " + num(d.atl) : null,
      bal === null ? "" : "Balance " + signo(bal) + " · el color lo manda la forma (CTL)",
      "ctl", null, (typeof d.ctl === "number") ? d.ctl : null);

    var cs = cargaSemana(U.lunesDe(dia), dia);
    h += tarjeta("Carga de la semana", cs === null ? null : cs,
      sem ? "objetivo de la semana: " + sem.carga : "", "carga", tendenciaCarga(sem, dia), null);

    var p = ultimoPeso(dia);
    h += tarjeta("Peso", p ? num(p.kg) + " kg" : null, p ? "del " + U.etiquetaFecha(p.f) : "",
      "peso", null, p ? p.kg : null);

    /* la báscula manda grasa y magra solo los días que te pesas con ella:
       se enseña la última que llegó, con su fecha, para que se vea si está vieja */
    var gBas = ultimoDeSalud("grasa", fechaDato);
    h += tarjeta("Grasa (báscula)", gBas ? num(gBas.v) + " %" : null,
      gBas ? "del " + U.etiquetaFecha(gBas.f) + " · por impedancia" : "aún no ha bajado ninguna de intervals",
      "grasa", null, gBas ? gBas.v : null);
    var mBas = ultimoDeSalud("magra", fechaDato);
    if (mBas) h += tarjeta("Masa magra (báscula)", num(mBas.v) + " kg",
      "del " + U.etiquetaFecha(mBas.f), "magra", null, mBas.v);
    /* grasa por cinta y tensión las tecleas tú: viven en «Lo que estoy
       midiendo» y no se repiten aquí. Un dato en dos sitios sobra en uno. */

    if (farmaco) {
      h += '<p class="nota-peque" style="margin-top:12px">Estás dentro de la pauta de corticoide. ' +
        "El fármaco baja la VFC y sube el pulso en reposo por sí solo, así que si esas dos salen en " +
        "rojo, lo más probable es que sea él y no tu entrenamiento. Se ven igual porque esconderlas " +
        "sería esconder tres semanas de datos: a partir del 29 se leen sin asterisco.</p>";
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
      var hr = t.closest ? t.closest("[data-histrango]") : null;
      if (hr) { e.preventDefault(); abrirHistoria(histAbierta, hr.getAttribute("data-histrango")); return; }
      var sg = t.closest ? t.closest("[data-sesion-guia]") : null;
      if (sg) { e.preventDefault(); abrirGuiaSesion(sg.getAttribute("data-sesion-guia")); return; }
      var hb = t.closest ? t.closest("[data-historia]") : null;
      if (hb) { e.preventDefault(); abrirHistoria(hb.getAttribute("data-historia")); return; }
      /* «que decida el reloj»: borra la marca manual y devuelve la sesión al
         estado neutro. Va dentro de un <label>, así que hay que frenar el
         clic o de paso marcaría la casilla. */
      var sb = t.closest ? t.closest("[data-soltar]") : null;
      if (sb) {
        e.preventDefault();
        e.stopPropagation();
        marcar((diaSel && semanaDe(diaSel)) ? diaSel : U.hoyISO(), sb.getAttribute("data-soltar"), null);
        U.toast("Vuelve a decidirlo el reloj");
        pintarConservando();
        return;
      }
      var ab = t.closest ? t.closest("[data-avisos]") : null;
      if (ab) { e.preventDefault(); abrirAvisos(); return; }
      var gb = t.closest ? t.closest("[data-guia]") : null;
      if (gb) { e.preventDefault(); abrirGuia(gb.getAttribute("data-guia")); return; }
      var rg = t.closest ? t.closest("[data-rango]") : null;
      if (rg) {
        rangoEvo = rg.getAttribute("data-rango");
        if (rangoEvo === "todo" && !Historico.datos) Historico.cargar(function () { pintar(); });
        pintar();
        return;
      }
      var ob = t.closest ? t.closest("[data-obs]") : null;
      if (ob) {
        e.preventDefault();
        alternarObs((diaSel && semanaDe(diaSel)) ? diaSel : U.hoyISO(), ob.getAttribute("data-obs"));
        pintar();
        return;
      }
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
      if (b) {
        bloque = b.getAttribute("data-bloque");
        if (bloque === "actividad") prepararArchivo();   // pide sus ficheros al entrar
        pintar();
      }
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
        pintarConservando();
        return;
      }
      if (t.getAttribute("data-medida")) {
        anotarMedida(dia, t.getAttribute("data-medida"), String(t.value).trim());
        U.toast(dia === U.hoyISO() ? "Anotado" : "Anotado en el " + U.etiquetaFecha(dia));
        pintarConservando();
        return;
      }
      if (t.getAttribute("data-csv-tension")) {
        var fich = t.files && t.files[0];
        if (!fich) return;
        var lector = new FileReader();
        lector.onload = function () {
          var r = leerCsvTension(lector.result);
          if (!r.tomas.length) {
            U.toast(r.error || "No he encontrado ninguna toma en ese fichero");
            return;
          }
          var res = importarTomas(r.tomas);
          U.toast(res.nuevas
            ? res.nuevas + (res.nuevas === 1 ? " toma nueva" : " tomas nuevas") +
              (res.repetidas ? " · " + res.repetidas + " ya estaban" : "")
            : "Nada nuevo: las " + r.tomas.length + " tomas ya estaban");
          pintar();
        };
        lector.onerror = function () { U.toast("No he podido leer el fichero"); };
        lector.readAsText(fich, "utf-8");
        return;
      }
      if (t.getAttribute("data-obs-nota")) {
        anotarNotaObs(dia, String(t.value).trim());
        U.toast("Anotado");
        return;                       // sin repintar: se perdería el cursor del texto
      }
      if (t.id === "ent-talla") {
        var sem = semanaDe(U.hoyISO());
        if (sem) { ent().talla[sem.desde] = t.value; A.guardar("entreno"); pintar(); }
      }
    });

    /* cerrar la ventana de la guía: con la × , con «Entendido» o pinchando fuera */
    var modal = document.getElementById("modal");
    if (modal) modal.addEventListener("click", function (e) {
      /* el selector de tramo vive DENTRO de la ventana, así que se atiende aquí:
         el manejador de la pestaña no llega hasta el modal */
      var hr = e.target.closest ? e.target.closest("[data-histrango]") : null;
      if (hr) { e.preventDefault(); abrirHistoria(histAbierta, hr.getAttribute("data-histrango")); return; }
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

  /* ==================== LA VENTANITA DE LAS GRÁFICAS ====================
     Al pasar el dedo o el ratón por una gráfica sale el valor y la fecha del
     punto más cercano, con una guía vertical. Se engancha una sola vez y vale
     para todas: las de Evolución, las del pase y las emergentes. */

  var tipPuesto = false;

  function ponerTip() {
    if (tipPuesto) return;
    tipPuesto = true;

    function mover(e) {
      var caja = e.target.closest ? e.target.closest(".graf-caja") : null;
      if (!caja) { quitar(); return; }
      var svg = caja.querySelector(".evo-svg"), tip = caja.querySelector(".graf-tip"),
          guia = caja.querySelector(".graf-guia");
      if (!svg || !tip) return;
      var esc = (svg.getAttribute("data-esc") || "").split("|");
      var pts = (svg.getAttribute("data-pts") || "").split(",").filter(function (x) { return x; });
      var pts2 = (svg.getAttribute("data-pts2") || "").split(",").filter(function (x) { return x; });
      var lab1 = svg.getAttribute("data-lab1") || "", lab2 = svg.getAttribute("data-lab2") || "";
      if (esc.length < 10 || !pts.length) return;

      var t0 = +esc[0], t1 = +esc[1], min = +esc[2], max = +esc[3], W = +esc[4],
          H = +esc[5], L = +esc[6], R = +esc[7], T = +esc[8], B = +esc[9];
      var r = svg.getBoundingClientRect();
      if (!r.width) return;
      var px = (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0));
      var xVb = (px - r.left) * (W / r.width);                 // píxeles → unidades del viewBox
      var frac = (xVb - L) / (W - L - R);
      var t = t0 + frac * (t1 - t0);

      /* el punto más cercano en el tiempo */
      var mejor = null, mejorD = Infinity, iMejor = -1;
      pts.forEach(function (par, i) {
        var c = par.split(":");
        var ms = U.desdeISO(c[0]).getTime(), d = Math.abs(ms - t);
        if (d < mejorD) { mejorD = d; iMejor = i; mejor = { f: c[0], v: parseFloat(c[1]), ms: ms }; }
      });
      if (!mejor) return;

      var xPt = L + (W - L - R) * ((mejor.ms - t0) / (t1 - t0));
      var yPt = T + (H - T - B) * (1 - (mejor.v - min) / (max - min));
      var esc2 = r.width / W;                                   // unidades → píxeles
      var uni = svg.getAttribute("data-uni") || "";

      /* el compañero del mismo día, si lo hay: la baja junto a la alta */
      var v2 = null;
      if (pts2.length) {
        /* con varias tomas el mismo día, la pareja es la de la misma posición */
        if (pts2.length === pts.length && iMejor >= 0 &&
            pts2[iMejor].split(":")[0] === mejor.f) {
          v2 = parseFloat(pts2[iMejor].split(":")[1]);
        } else {
          pts2.forEach(function (par2) {
            var c2 = par2.split(":");
            if (c2[0] === mejor.f) v2 = parseFloat(c2[1]);
          });
        }
      }
      function numTip(x) { return Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : num(x); }
      var texto = v2 !== null
        ? (lab1 ? U.esc(lab1) + " " : "") + U.esc(numTip(mejor.v)) + " · " +
          (lab2 ? U.esc(lab2) + " " : "") + U.esc(numTip(v2)) + (uni ? " " + U.esc(uni) : "")
        : U.esc(numTip(mejor.v)) + (uni ? " " + U.esc(uni) : "");
      tip.innerHTML = "<b>" + texto + "</b>" +
        "<span>" + U.esc(U.etiquetaFecha(mejor.f)) + "</span>";
      tip.style.display = "block";
      var ancho = tip.offsetWidth || 90;
      var x = xPt * esc2 - ancho / 2;
      if (x < 0) x = 0;
      if (x + ancho > r.width) x = r.width - ancho;
      tip.style.left = x + "px";
      tip.style.top = Math.max(0, yPt * esc2 - tip.offsetHeight - 8) + "px";
      if (guia) {
        guia.style.display = "block";
        guia.style.left = (xPt * esc2) + "px";
      }
    }

    function quitar() {
      var t = document.querySelectorAll(".graf-tip, .graf-guia");
      for (var i = 0; i < t.length; i++) t[i].style.display = "none";
    }

    document.addEventListener("mousemove", mover, { passive: true });
    document.addEventListener("touchmove", mover, { passive: true });
    document.addEventListener("touchend", quitar, { passive: true });
    /* nada de mouseleave en captura: salta al pasar por cada hijo de la propia
       gráfica y apagaba la ventanita al instante. Con salirse de la caja basta. */
  }

  /* ==================== ARRANQUE ==================== */

  function arrancar() {
    if (!U || !A || !P) return;
    if (!A.estado) { setTimeout(arrancar, 80); return; }      // esperamos a que app.js inicie el almacén
    inyectarEstilos();
    inyectarHtml();
    conectar();
    ponerTip();
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
