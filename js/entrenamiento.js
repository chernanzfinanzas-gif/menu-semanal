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

  /* Casos: los dos filtros de la rejilla. null = «todos». Se quedan puestos
     mientras dure la sesión, que es lo que uno espera al volver atrás. */
  var casoFam = null, casoCausa = null;

  /* La flecha de «volver». Estaba declarada dentro de htmlEvolucion y de
     htmlPlan, así que fuera de esas dos funciones no existía: usarla desde
     Actividad lanzaba ReferenceError y el bloque no llegaba a pintarse. Aquí
     arriba la ven todos. */
  var FLECHA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M15 5l-7 7 7 7"/></svg>';

  var BLOQUES = [
    { id: "plan", nombre: "El Plan", img: "iconos/khb/3-pesas-corredor.webp",
      pie: "Lo que toca hoy, con sus casillas, y la semana entera a la vista.", listo: true },
    /* SEGUNDO, al lado de El Plan. Lo pidió Carlos al verlo montado: el plan y
       su rampa se miran juntos, y Actividad —que es el archivo de lo hecho— baja
       a la segunda fila. Con dos columnas quedan tres filas de dos. */
    { id: "rampa", nombre: "Rampa de Entreno", img: "iconos/khb/12-zwift.webp",
      pie: "A dónde va el plan y por qué: la rampa, la curva prevista y los puntos clave.", listo: true },
    { id: "evolucion", nombre: "Evolución", img: "iconos/khb/1-arbol-pulso.webp",
      pie: "Cómo voy: peso y cintura, VFC, pulso en reposo, sueño y vatios por kilo.", listo: true },
    { id: "actividad", nombre: "Actividad", img: "iconos/khb/6-zapatillas.webp",
      pie: "Qué he hecho: el archivo entero, año por año y mes por mes, con su mini mapa.", listo: true },
    { id: "casos", nombre: "Casos", img: "iconos/khb/9-podio.webp",
      pie: "Qué pasó aquella vez: los episodios medidos, uno a uno.", listo: true },
    { id: "material", nombre: "Material y movimientos", img: "iconos/khb/7-yoga.webp",
      pie: "Lo que hay en casa y qué se puede hacer con ello, músculo a músculo.", listo: true }
  ];

  /* ==================== ESTILOS ==================== */

  function inyectarEstilos() {
    if (document.getElementById("estilos-entreno")) return;
    var s = document.createElement("style");
    s.id = "estilos-entreno";
    s.textContent = [
      ":root{--azul:#2f5c8a;--azul-hondo:#133253;--azul-claro:#eaf0f6;--azul-borde:#cfdcea}",
      /* ---- material y movimientos ---- */
      ".mat-linea{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;" +
        "padding:9px 0;border-bottom:1px solid var(--azul-borde)}",
      ".mat-linea:last-of-type{border-bottom:0}",
      ".mat-txt{flex:1;min-width:0}",
      ".mat-da{font-size:12px;color:#6b7c8d;margin-top:2px}",
      ".mat-bot{display:flex;gap:6px;flex-shrink:0}",
      ".mat-form{background:var(--azul-claro);border:1px solid var(--azul-borde);" +
        "border-radius:10px;padding:12px;margin:8px 0}",
      ".mat-caps{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:4px}",
      ".mat-cap{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:400}",
      ".mov-tit{margin:16px 0 6px;color:var(--azul-hondo);font-size:14px;" +
        "text-transform:uppercase;letter-spacing:.04em}",
      ".mov-linea{padding:8px 0;border-bottom:1px solid var(--azul-borde)}",
      ".mov-linea:last-child{border-bottom:0}",
      ".mov-no{opacity:.5}",
      ".mov-musc{font-size:12px;color:#6b7c8d;margin-top:2px}",
      ".mov-ojo{color:#b06a16}",
      ".mov-falta{font-size:12px;color:#b03030;margin-top:2px}",
      /* Las rutinas: filas anchas, que lo que importa es el nombre y cuándo. */
      ".mv-fila{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;" +
        "padding:12px 0;border-bottom:1px solid var(--azul-borde);background:none;border:0;" +
        "border-bottom:1px solid var(--azul-borde);text-align:left;cursor:pointer;" +
        "font:inherit;color:inherit}",
      ".mv-fila:last-child{border-bottom:0}",
      ".mv-fila-n{font-size:1.02rem;color:var(--azul-hondo);font-weight:700}",
      ".mv-fila-d{font-size:12px;color:var(--gris)}",
      ".mv-hoy{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#2e7d5b}",
      /* Los shorts son verticales: 9/16, y con tope para que quepa en pantalla. */
      ".vid-caja{position:relative;width:100%;max-width:340px;aspect-ratio:9/16;max-height:66vh;" +
        "margin:10px auto;border-radius:12px;overflow:hidden;background:#000}",
      ".vid-caja iframe{position:absolute;inset:0;width:100%;height:100%;border:0}",
      "@media (prefers-color-scheme:dark){.mat-da,.mov-musc{color:#9fb0c1}}",
      /* la pestaña: azul siempre, más fuerte cuando está abierta */
      '#pestanas [data-vista="entreno"]{color:#7d9cbb}',
      '#pestanas [data-vista="entreno"].activa{color:var(--azul);border-bottom-color:var(--azul)}',
      '#pestanas [data-vista="entreno"] .corta{display:none}',
      /* el aviso de rutas esperando, encima del archivo de actividad */
      ".ent-rn{margin:10px 0 14px}",
      ".ent-rn-ok{font-size:.85rem;color:var(--tenue,#7d8a99);margin:6px 0 12px}",
      ".ent-rn-hay{border:1px solid rgba(45,120,190,.35);border-left:4px solid var(--azul,#2d78be);" +
        "border-radius:8px;padding:10px 12px;background:rgba(45,120,190,.06)}",
      ".ent-rn-hay p{margin:0 0 6px}",
      ".ent-rn-hay ul{margin:6px 0 0;padding-left:18px;font-size:.9rem}",
      ".ent-rn-hay li{margin:2px 0}",
      ".ent-rn-hay .nota-peque{margin:8px 0 0}",
      /* ---- hasta dónde llega cada medida ---- */
      ".evo-frescura{margin:18px 0 0;border:1px solid var(--azul-borde);border-radius:10px;" +
        "padding:10px 14px;background:#fff}",
      ".evo-frescura.toca{border-color:rgba(179,64,47,.45);border-left:4px solid #b3402f}",
      ".evo-frescura summary{cursor:pointer;font-weight:600;color:var(--azul);font-size:.92rem}",
      ".evo-frescura p{font-size:.88rem;line-height:1.5;margin:10px 0}",
      ".evo-chip{background:#b3402f;color:#fff;border-radius:999px;padding:1px 8px;" +
        "font-size:.72rem;font-weight:600;margin-left:6px;white-space:nowrap}",
      ".evo-tabla-frescura{width:100%;border-collapse:collapse;font-size:.85rem;margin:8px 0}",
      ".evo-tabla-frescura th{text-align:left;font-weight:600;color:var(--tenue,#7d8a99);" +
        "font-size:.78rem;padding:4px 8px 4px 0;border-bottom:1px solid var(--azul-borde)}",
      ".evo-tabla-frescura td{padding:5px 8px 5px 0;border-bottom:1px solid var(--azul-claro)}",
      ".evo-tabla-frescura td:nth-child(3){color:var(--tenue,#7d8a99);font-size:.8rem}",
      ".evo-tabla-frescura td:last-child{color:var(--tenue,#7d8a99);font-size:.8rem}",
      ".evo-tabla-frescura tr.evo-toca td{color:#b3402f}",
      "p.nota-peque.evo-toca{color:#b3402f}",
      /* ---- la pestaña Casos ---- */
      ".casos-filtros{margin:4px 0 14px}",
      ".casos-fila{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}",
      ".casos-eti{font-size:.82rem;color:var(--tenue,#7d8a99);margin-right:2px}",
      ".ent-chip{border:1px solid var(--azul-borde);background:#fff;color:var(--azul-hondo);" +
        "border-radius:999px;padding:5px 11px;font-size:.86rem;cursor:pointer;line-height:1.2}",
      ".ent-chip .n{opacity:.55;font-size:.78rem;margin-left:3px}",
      ".ent-chip.si{background:var(--azul);border-color:var(--azul);color:#fff}",
      ".ent-chip.si .n{opacity:.8}",
      ".casos-rejilla{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}",
      ".caso{border:1px solid var(--azul-borde);border-radius:10px;padding:13px 14px;background:#fff;" +
        "display:flex;flex-direction:column}",
      /* los dos de referencia llevan el filo azul: son los que hay que abrir primero */
      ".caso.destacado{border-left:4px solid var(--azul)}",
      ".caso.pendiente{background:var(--azul-claro);border-style:dashed}",
      ".caso-alto{display:flex;justify-content:space-between;gap:8px;font-size:.76rem;" +
        "text-transform:uppercase;letter-spacing:.04em;color:var(--tenue,#7d8a99)}",
      ".caso-fam{font-weight:600;color:var(--azul)}",
      ".caso h3{margin:6px 0 0;font-size:1.05rem;line-height:1.25}",
      ".caso-sub{margin:1px 0 0;font-size:.9rem;color:var(--tenue,#7d8a99)}",
      ".caso-trata{margin:9px 0 0;font-size:.92rem;line-height:1.45}",
      ".caso-coste{display:flex;flex-wrap:wrap;gap:4px 14px;margin:10px 0 0;padding:8px 10px;" +
        "background:var(--azul-claro);border-radius:7px;font-size:.86rem}",
      ".caso-coste b{color:var(--azul-hondo)}",
      ".caso-causas{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 0}",
      ".caso-causa{border:1px solid var(--azul-borde);background:transparent;color:var(--tenue,#7d8a99);" +
        "border-radius:999px;padding:2px 9px;font-size:.78rem;cursor:pointer}",
      ".caso-causa.si{background:var(--azul);border-color:var(--azul);color:#fff}",
      ".caso-pie{display:flex;align-items:center;gap:10px;margin:13px 0 0;padding-top:11px;" +
        "border-top:1px solid var(--azul-borde);margin-top:auto}",
      ".caso-abrir{background:var(--azul);color:#fff;border:0;border-radius:7px;padding:7px 14px;" +
        "font-size:.9rem;cursor:pointer}",
      ".caso-abrir[disabled]{opacity:.6;cursor:default}",
      ".caso-pags,.caso-espera{font-size:.82rem;color:var(--tenue,#7d8a99)}",
      ".casos-como{margin:18px 0 0;border:1px solid var(--azul-borde);border-radius:10px;" +
        "padding:10px 14px;background:#fff}",
      ".casos-como summary{cursor:pointer;font-weight:600;color:var(--azul);font-size:.92rem}",
      ".casos-como ol,.casos-como ul{margin:10px 0;padding-left:20px;font-size:.9rem;line-height:1.5}",
      ".casos-como li{margin:3px 0}",
      ".casos-como pre{background:var(--azul-claro);border-radius:7px;padding:10px 12px;" +
        "overflow-x:auto;font-size:.8rem;line-height:1.45;margin:6px 0}",
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
      /* 190 px Y NO 138  ·  24-sep-2026. El mock del 23 de septiembre lo dejó
         escrito: «la ranura de 138 px se queda corta; con el porqué dentro
         necesita unos 190, o el texto se parte raro en el móvil». Las dos cifras
         del porqué —fatiga contra forma y las dos últimas noches— sí se montaron
         en su día; la ranura se quedó sin ensanchar y el aviso se perdió de vista
         hasta que Carlos se acordó de él. */
      ".ent-sem{flex:0 0 190px;background:var(--blanco);border:1px solid var(--borde);",
      "  border-left:4px solid var(--gris);border-radius:var(--radio);padding:11px 13px;",
      "  display:flex;flex-direction:column;gap:2px}",
      ".ent-sem b{font-size:1.05rem;color:var(--tinta)}",
      ".ent-sem.apagado b{color:var(--gris)}",
      ".ent-sem.ambar{border-left-color:var(--ambar);background:var(--ambar-fondo)}",
      ".ent-sem.ambar b{color:var(--ambar)}",
      /* los otros tres estados, para cuando el semáforo se calibre (15-oct) */
      ".ent-sem.verde{border-left-color:var(--verde);background:var(--verde-claro)}",
      ".ent-sem.verde b{color:var(--verde)}",
      ".ent-sem.rojo{border-left-color:var(--rojo);background:var(--rojo-fondo)}",
      ".ent-sem.rojo b{color:var(--rojo)}",
      ".ent-sem.azulsem{border-left-color:var(--azul);background:var(--azul-claro)}",
      ".ent-sem.azulsem b{color:var(--azul)}",
      /* encendido, la ranura de 138 px se queda corta: con el porqué dentro el
         texto se parte mal. A 190 respira, y en móvil pasa a ancho completo. */
      ".ent-sem.encendido{flex:0 0 190px}",
      "@media(max-width:520px){.ent-franja .ent-sem.encendido{flex:none}}",
      /* el porqué: dos cifras, rótulo arriba y número debajo. En línea se pisaban.
         El rótulo lleva alto de dos líneas para que los números queden alineados
         («Fatiga vs forma» ocupa dos y «Dos noches» una). */
      ".sem-razon{display:flex;gap:12px;margin-top:8px;padding-top:8px;",
      "  border-top:1px solid rgba(31,42,36,.10)}",
      ".sem-razon>div{flex:1;min-width:0}",
      ".sem-razon .q{display:block;font-size:.6rem;letter-spacing:.04em;text-transform:uppercase;",
      "  color:var(--gris);font-weight:700;line-height:1.25;margin-bottom:4px;min-height:2.5em}",
      ".sem-razon .n{display:block;font-size:1.02rem;font-weight:700;color:var(--tinta);line-height:1}",
      /* las alternativas, botones y no texto: si hay que apuntarlo a mano, no se
         apunta. Tocando uno, la sesión del día queda cambiada. */
      ".sem-ofrece{background:var(--blanco);border:1px solid var(--borde);",
      "  border-radius:var(--radio);padding:11px 13px;margin-bottom:12px}",
      ".sem-ofrece .et2{font-size:.68rem;letter-spacing:.09em;text-transform:uppercase;",
      "  color:var(--gris);font-weight:700;display:block;margin-bottom:6px}",
      ".sem-ofrece button{display:block;width:100%;text-align:left;font:inherit;font-size:.85rem;",
      "  background:var(--blanco);border:1px solid var(--borde);border-radius:9px;",
      "  padding:8px 11px;margin-bottom:5px;color:var(--tinta);cursor:pointer}",
      ".sem-ofrece button:hover,.sem-ofrece button:focus-visible{border-color:var(--azul-borde);",
      "  box-shadow:0 1px 6px rgba(47,92,138,.10);outline:none}",
      ".sem-ofrece button.puesta{border-color:var(--verde-borde);background:var(--verde-claro)}",
      ".sem-ofrece button b{font-weight:700}",
      ".sem-ofrece button small{display:block;color:var(--gris);font-size:.76rem;margin-top:1px}",
      ".sem-ofrece .nota{font-size:.76rem;color:var(--gris);margin:4px 0 0;line-height:1.35}",
      ".sem-ofrece .deshacer{font-size:.75rem;color:var(--azul);font-weight:700;",
      "  background:none;border:0;padding:4px 0;width:auto;margin:2px 0 0;cursor:pointer}",
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
      /* TRES POR FILA EN EL MÓVIL  ·  24-sep-2026 (Carlos: «haría las métricas más
         estrechas, sobra mucho en todas; lo ideal es que en móvil entren tres por
         fila»). Eran dos, y con nombres de una palabra el hueco se desperdiciaba.
         Caben tres si la casilla adelgaza: rótulo más pequeño, menos relleno en el
         campo y el hueco entre columnas a 6 px. El campo se queda en 40 px de
         alto, que sigue siendo un objetivo cómodo para el dedo. */
      ".ent-medidas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:14px}",
      "@media(min-width:620px){.ent-medidas{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}}",
      "@media(min-width:980px){.ent-medidas{grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}}",
      /* en columna: el rótulo crece hasta igualar al vecino más alto, así las
         cajas de la fila quedan alineadas aunque el texto ocupe dos líneas */
      ".ent-medida{display:flex;flex-direction:column;min-width:0;max-width:280px;width:100%}",
      ".ent-medida input{width:100%;padding:8px 6px;border:1px solid var(--borde);border-radius:9px;" +
        "font:inherit;font-size:.95rem;text-align:center}",
      ".ent-medida input:focus{outline:2px solid var(--azul);outline-offset:1px;border-color:var(--azul)}",
      ".ent-medida.puesta input{border-color:var(--azul);background:var(--azul-claro)}",
      ".ent-medida span{display:flex;flex:1 0 auto;align-items:flex-start;gap:3px;",
      "  font-size:.68rem;color:var(--gris);margin-bottom:3px;line-height:1.2;overflow-wrap:anywhere}",
      ".ent-medida .hoy{flex:none;font-style:normal;font-size:.62rem;font-weight:700;letter-spacing:.06em;",
      "  text-transform:uppercase;color:var(--azul);border:1px solid var(--azul-borde);",
      "  background:var(--azul-claro);border-radius:999px;padding:0 6px;line-height:1.5}",
      ".ent-medida.toca input{border-color:var(--azul)}",
      ".ent-medida small{display:block;margin-top:3px;font-size:.62rem;color:var(--gris);line-height:1.25}",
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
      /* la rejilla del pase: tres columnas en escritorio, una en el movil */
      ".pase-rejilla{display:grid;gap:12px 24px;grid-template-columns:1fr;margin-top:14px}",
      "@media(min-width:820px){.pase-rejilla{grid-template-columns:1fr 1fr 1fr}}",
      ".pase-bloque{min-width:0}",
      ".pase-bloque .evo-sub{margin:0 0 6px}",
      ".pase-dato{background:var(--azul-claro);border:1px solid var(--azul-borde);",
      "  border-radius:10px;padding:8px 11px;margin-bottom:7px}",
      ".pase-dato span{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;",
      "  color:var(--azul);font-weight:700}",
      ".pase-dato b{display:block;font-size:1.05rem;color:var(--azul-hondo);line-height:1.3;",
      "  font-variant-numeric:tabular-nums}",
      ".pase-dato small{display:block;font-size:.72rem;color:var(--gris);line-height:1.35}",
      /* el dato que no se puede leer —con corticoide— apagado y con el borde
         de guiones: el numero esta, pero no significa lo que parece */
      ".pase-dato.flojo{background:var(--gris-claro);border-color:#d3dbd7;border-style:dashed}",
      ".pase-dato.flojo span,.pase-dato.flojo b{color:var(--gris)}",
      ".pase-prox{margin:4px 0 0;font-size:.9rem;line-height:1.5;padding:11px 13px;border-radius:11px;",
      "  background:var(--azul-claro);border:1px solid var(--azul-borde);color:var(--azul-hondo)}",
      /* evolución: las series largas */
      /* ---- Rampa de Entreno (23-sep-2026) ---- */
      ".ramp-datos{display:flex;gap:9px;flex-wrap:wrap}",
      ".ramp-dato{flex:1 1 118px;background:var(--azul-claro);border:1px solid var(--azul-borde);",
      "  border-radius:10px;padding:8px 11px}",
      ".ramp-dato span{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;",
      "  font-weight:700;color:var(--gris)}",
      ".ramp-dato b{display:block;font-size:1.28rem;line-height:1.2;color:var(--azul-hondo);",
      "  font-variant-numeric:tabular-nums}",
      ".ramp-dato.v b{color:var(--verde)}",
      ".ramp-svg{display:block;width:100%;height:auto;overflow:visible;max-width:100%}",
      ".ramp-sub{margin:13px 0 3px;font-size:.82rem;font-weight:700;color:var(--azul-hondo)}",
      ".ramp-sub small{font-weight:400;color:var(--gris)}",
      ".ramp-aviso{margin-top:10px;background:var(--ambar-fondo);border:1px solid #efd9a8;",
      "  border-radius:10px;padding:9px 12px;font-size:.82rem;line-height:1.5}",
      ".ramp-aviso b{color:#8a6110}",
      ".ramp-aviso.mal{background:var(--rojo-fondo);border-color:#e8c3bd}",
      ".ramp-aviso.mal b{color:var(--rojo)}",
      /* la tabla puede desbordar en movil: se desliza sola en vez de apretarse */
      ".ramp-tabla{overflow-x:auto;-webkit-overflow-scrolling:touch}",
      ".ramp-tabla table{width:100%;border-collapse:collapse;font-size:.84rem;min-width:380px}",
      ".ramp-tabla th{text-align:left;font-size:.66rem;text-transform:uppercase;letter-spacing:.04em;",
      "  color:var(--gris);font-weight:700;padding:0 8px 5px 0;border-bottom:1px solid var(--borde);white-space:nowrap}",
      ".ramp-tabla td{padding:5px 8px 5px 0;border-bottom:1px solid #f1f4f6;white-space:nowrap}",
      ".ramp-tabla td.d,.ramp-tabla th.d{text-align:right;font-variant-numeric:tabular-nums}",
      ".ramp-tabla td.b{font-weight:700;color:var(--azul-hondo)}",
      ".ramp-tabla td.g{color:var(--gris)}",
      ".ramp-tabla td.t{color:var(--gris);font-size:.78rem}",
      ".ramp-tabla tr.desc{background:var(--verde-claro)}",
      ".ramp-tabla tr.desc td.b{color:var(--verde)}",
      ".ramp-tabla tr.ahora td{box-shadow:inset 0 -2px 0 var(--azul)}",
      ".ramp-tabla tr.sep td{text-align:center;color:var(--gris);font-size:.73rem;font-style:italic;",
      "  padding:7px 0;background:#fafbfc}",
      ".ramp-regla{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid #f1f4f6}",
      ".ramp-regla:last-child{border-bottom:0}",
      ".ramp-regla>b{flex:none;width:22px;height:22px;border-radius:50%;background:var(--azul);",
      "  color:#fff;display:flex;align-items:center;justify-content:center;font-size:.76rem}",
      ".ramp-regla p{margin:0;font-size:.86rem;line-height:1.5}",
      ".ramp-regla p em{font-style:normal;color:var(--azul-hondo);font-weight:600}",
      ".ramp-pases{display:grid;grid-template-columns:1fr;gap:8px}",
      "@media(min-width:640px){.ramp-pases{grid-template-columns:1fr 1fr}}",
      ".ramp-pase{border:1px solid var(--borde);border-left:4px solid var(--borde);border-radius:9px;",
      "  padding:8px 11px;font-size:.83rem}",
      ".ramp-pase b{color:var(--azul-hondo)}",
      ".ramp-pase .f{color:var(--gris);font-size:.74rem;margin-left:6px}",
      ".ramp-pase .v{display:inline-block;margin-left:7px;font-weight:700;font-size:.76rem}",
      ".ramp-pase small{display:block;color:var(--gris);margin-top:3px;line-height:1.4}",
      ".ramp-pase em{display:inline-block;margin-top:4px;font-style:normal;font-size:.72rem;",
      "  font-weight:700;color:var(--gris)}",
      ".ramp-pase.subir{border-left-color:var(--verde)} .ramp-pase.subir .v{color:var(--verde)}",
      ".ramp-pase.repetir{border-left-color:var(--ambar)} .ramp-pase.repetir .v{color:var(--ambar)}",
      ".ramp-pase.bajar,.ramp-pase.parar{border-left-color:var(--rojo)}",
      ".ramp-pase.bajar .v,.ramp-pase.parar .v{color:var(--rojo)}",
      ".ramp-chat{display:inline-block;text-decoration:none;text-align:center}",
      ".evo-rangos{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}",
      /* el interruptor de las noches: mismo botón, pero suelto bajo la leyenda */
      ".evo-rangos.noches{margin:6px 0 2px}",
      /* el panel de la noche: una fila por medida, con el rótulo a la izquierda
         y todas las gráficas empezando en la misma x para que la columna valga */
      ".panel-noche{margin:0 0 4px}",
      ".fila-noche{display:grid;grid-template-columns:82px 1fr;align-items:center;gap:8px;margin:0 0 2px}",
      ".fila-noche>b{font-size:.72rem;font-weight:600;color:#3d554a;text-align:right;line-height:1.15}",
      ".fila-noche>b small{display:block;font-weight:400;color:#8a9a92;font-size:.66rem}",
      ".fila-noche .graf-caja{margin:0}",
      ".fila-noche .graf-pie{display:none}",
      ".sin-noche{font-size:.7rem;color:#a4b0aa;font-style:italic;margin:6px 0;line-height:1.35}",
      ".fechas-noche{display:flex;justify-content:space-between;font-size:.72rem;color:#667a70;margin:0}",
      ".noches-vfc{font-size:.78rem}",
      ".evo-r{border:1px solid var(--borde);background:#fff;color:var(--gris);border-radius:999px;",
      "  padding:6px 13px;font:inherit;font-size:.78rem;font-weight:600;cursor:pointer}",
      ".evo-r.activo{background:var(--azul);border-color:var(--azul);color:#fff}",
      ".evo-t{border-top:3px solid var(--azul)}",
      ".evo-cab{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}",
      ".evo-cab h2{flex:1 1 auto;margin:0}",
      ".evo-v{font-size:1.25rem;font-weight:700;color:var(--azul-hondo)}",
      ".evo-u{font-size:.72rem;color:var(--gris)}",
      ".evo-pie{margin:2px 0 10px}",
      /* sin tope de ancho: la grafica ocupa la caja entera y el lienzo se
         calcula para esa medida, asi que la letra sale igual en todas */
      ".evo-svg{display:block;width:100%;height:auto;overflow:visible}",
      /* el mando de periodo de cada tarjeta: va en la misma linea que su
         titulo y en formato corto, para no robar altura */
      ".rangos-graf{display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin:0 0 9px}",
      ".rangos-graf .evo-r{padding:3px 9px;font-size:.7rem}",
      ".evo-f{border:1px solid var(--borde);background:#fff;color:var(--azul-hondo);",
      "  border-radius:999px;width:24px;height:24px;padding:0;display:inline-flex;",
      "  align-items:center;justify-content:center;font:inherit;font-size:.9rem;",
      "  font-weight:700;line-height:1;cursor:pointer}",
      ".evo-f:disabled{opacity:.28;cursor:default}",
      ".evo-f:not(:disabled):hover{border-color:var(--azul);color:var(--azul)}",
      ".evo-tramo{margin:0 0 8px;font-size:.76rem;color:var(--gris)}",
      ".evo-tramo b{color:var(--azul-hondo)}",
      ".evo-hoy{border:0;background:none;padding:0 0 0 4px;font:inherit;font-size:.76rem;",
      "  color:var(--azul);text-decoration:underline;cursor:pointer}",
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
      /* la rutina dentro de la emergente: sin tarjeta, que la emergente ya lo es */
      ".mod-bloque{margin-bottom:12px}",
      /* la ficha de la salida, bajo el tablero */
      ".salida-ficha{display:flex;gap:12px;align-items:center;margin-top:10px;padding:10px 12px;" +
        "border:1px solid var(--azul-borde);border-radius:12px;background:var(--azul-claro)}",
      ".salida-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}",
      ".salida-txt .et{font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:#6b7c8d}",
      ".salida-txt b{font-size:.98rem}",
      ".salida-ficha .btn{flex:0 0 auto}",
      ".salida-ficha.pasada{border-color:var(--ambar);background:var(--ambar-fondo)}",
      ".salida-pasa{font-size:.78rem;color:#8a5a12;font-weight:600}",
      /* la emergente */
      ".sal-modos{display:grid;grid-template-columns:1fr;gap:6px;margin:10px 0}",
      "@media (min-width:520px){.sal-modos{grid-template-columns:1fr 1fr}}",
      ".sal-modo{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;" +
        "padding:9px 11px;border:1px solid var(--azul-borde);border-radius:10px;background:var(--blanco);" +
        "font:inherit;color:inherit;cursor:pointer}",
      ".sal-modo span{font-size:.78rem;color:#6b7c8d}",
      ".sal-modo.elegido{border-color:var(--azul);background:var(--azul-claro);box-shadow:inset 0 0 0 1px var(--azul)}",
      ".sal-et{margin:12px 0 4px;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:#6b7c8d}",
      ".sal-horas{display:flex;flex-wrap:wrap;gap:6px}",
      ".sal-hora{padding:7px 12px;border:1px solid var(--azul-borde);border-radius:999px;background:var(--blanco);" +
        "font:inherit;color:inherit;cursor:pointer}",
      ".sal-hora.elegido{border-color:var(--azul);background:var(--azul);color:#fff}",
      /* días no hábiles, ámbar y avisos de reparto */
      ".ent-dia.nohabil{background:repeating-linear-gradient(135deg,#f4f6f8,#f4f6f8 6px,#eceff3 6px,#eceff3 12px);" +
        "border-color:#d7dde4;color:#8b97a4}",
      ".ent-dia.nohabil .q{font-style:italic}",
      ".ent-dia.ambar{background:var(--ambar-fondo);border-color:var(--ambar)}",
      ".resc{display:flex;flex-direction:column;gap:3px;margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid}",
      ".resc .et{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;font-weight:700}",
      ".resc.ambar{background:var(--ambar-fondo);border-color:var(--ambar)}",
      ".resc.ambar .et{color:#8a5a12}",
      ".resc.rojo{background:var(--rojo-fondo);border-color:var(--rojo)}",
      ".resc.rojo .et{color:var(--rojo)}",
      ".resc .btn{align-self:flex-start;margin-top:6px}",
      ".av-reparto{margin-top:10px;display:flex;flex-direction:column;gap:6px}",
      ".av-linea{padding:8px 11px;border-radius:10px;background:var(--azul-claro);" +
        "border:1px solid var(--azul-borde);font-size:.82rem}",
      ".av-linea b{display:block;color:var(--azul-hondo)}",
      ".av-linea span{color:#6b7c8d}",
      ".dia-bl.quitado{text-decoration:line-through;opacity:.55}",
      ".ent-dia{position:relative}",
      /* EL PIE SIEMPRE ABAJO DEL TODO, el punto pegado a la izquierda y la carga a
         la derecha. Antes iba justo debajo del último bloque, así que en una fila
         con días de distinto número de bloques los puntos quedaban a alturas
         distintas y no se podían comparar de un vistazo. (Carlos, 24-sep-2026.) */
      ".ent-dia .pie{display:flex;align-items:flex-end;justify-content:space-between;" +
        "width:100%;gap:4px;margin-top:auto;padding-top:6px}",
      ".ent-dia .dc{display:flex;flex-direction:column;align-items:flex-end;line-height:1;gap:1px}",
      ".ent-dia .dc b{font-size:.72rem;font-weight:800;color:var(--azul-hondo)}",
      ".ent-dia .dc i{font-size:.52rem;font-style:normal;font-weight:700;letter-spacing:.06em;" +
        "text-transform:uppercase;color:var(--gris)}",
      ".ent-dia.ok .dc b{color:var(--verde)}",
      ".sem-carga{display:block;font-size:.68rem;font-weight:700;color:var(--gris);" +
        "text-transform:uppercase;letter-spacing:.05em;margin-top:2px}",
      /* LA × DE NO DISP, más grande y más roja  ·  24-sep-2026 (Carlos).
         Apagada, rojo claro y a media tinta: se ve que está pero no compite con
         los bloques. Puesta, rojo oscuro, a tamaño completo y en negrita: ese día
         hay que verlo desde el otro lado de la habitación. */
      ".ent-dia .cab{display:flex;align-items:flex-start;justify-content:space-between;" +
        "width:100%;gap:4px}",
      ".ent-dia .fecha{display:flex;flex-direction:column;align-items:flex-start;line-height:1.1}",
      ".dia-nd{display:flex;flex-direction:column;align-items:flex-end;" +
        "line-height:1;gap:0;padding:0;border:0;background:transparent;cursor:pointer}",
      ".dia-nd b{font-size:17px;color:#e07a6e;font-weight:800}",
      ".dia-nd span{font-size:8px;letter-spacing:.03em;color:#e07a6e;text-transform:uppercase;font-weight:800}",
      ".dia-nd:hover b,.dia-nd:hover span{color:#c0392b}",
      ".dia-nd.puesto b{font-size:20px;color:#a5271a;font-weight:900}",
      ".dia-nd.puesto span{font-size:9px;color:#a5271a;font-weight:900;letter-spacing:.04em}",
      ".nohab-caja{margin:10px 0;padding:10px 12px;border:1px dashed var(--azul-borde);border-radius:12px}",
      ".nohab-caja summary{cursor:pointer;font-size:.86rem;color:var(--azul-hondo);font-weight:600}",
      ".nohab-caja.puesto{display:block;border-style:solid;background:#f4f6f8}",
      ".nohab-caja.puesto b{display:block}",
      ".nohab-caja .nota-peque{display:block;margin:4px 0 0}",
      ".nohab-bot{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
      ".sal-cuenta{margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--azul-claro);font-size:.95rem}",
      ".mod-bloque:last-of-type{margin-bottom:0}",
      ".aviso.en-modal{margin-top:12px}",
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
      ".ent-ver{margin-left:2px;border:0;background:none;color:var(--azul);cursor:pointer;padding:0 1px;",
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
      /* LA LETRA Y EL NÚMERO, MÁS GRANDES Y LOS DOS EN NEGRITA (23-sep-2026,
         Carlos). El número iba en gris y dos tallas por debajo de la letra,
         y es justo el dato que se busca al mirar la tira. */
      ".ent-dia .d{font-weight:700;font-size:.95rem;color:var(--azul-hondo);line-height:1.1}",
      ".ent-dia .f{font-size:.86rem;font-weight:700;color:var(--azul-hondo);line-height:1.1}",
      ".ent-dia .q{font-size:.64rem;color:var(--gris);line-height:1.25;overflow-wrap:anywhere}",
      /* ---- EL TABLERO DE BLOQUES (24-sep-2026) ----
         La casilla del dia deja de enumerar las sesiones en texto y pasa a
         llevar los bloques, que se pueden coger y soltar en otro dia. */
      ".ent-dia .q.bloques{width:100%;font-size:inherit}",
      ".dia-bl{display:block;width:100%;margin-top:3px;padding:3px 4px;font:inherit;",
      "  font-size:.66rem;font-weight:650;line-height:1.2;text-align:center;cursor:pointer;",
      "  border:1px solid var(--azul-borde);background:var(--azul-claro);color:var(--azul-hondo);",
      "  border-radius:7px}",
      ".dia-bl:first-child{margin-top:1px}",
      ".dia-bl:hover{border-color:var(--azul)}",
      ".dia-bl.largo{background:var(--verde-claro);border-color:var(--verde-borde);color:var(--verde)}",
      ".dia-bl.fuerza{background:#f3eefb;border-color:#ddcdf3;color:#5a2b8f}",
      ".dia-bl.elegido{outline:2px solid var(--azul);outline-offset:1px}",
      ".dia-bl.llevando{opacity:.4}",
      ".dia-bl{-webkit-user-drag:element}",
      ".ent-dia.encima{border-color:var(--azul);border-width:2px;background:var(--azul-claro);",
      "  box-shadow:0 0 0 3px rgba(47,92,138,.14)}",
      ".bl-bandeja.encima{border-color:var(--azul);border-style:solid;background:var(--azul-claro)}",
      ".bl-bandeja{border:1px dashed var(--azul-borde);background:#fafcfe;border-radius:11px;",
      "  padding:9px 11px;margin:10px 0}",
      ".bl-bandeja .et{display:block;font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;",
      "  color:var(--gris);font-weight:700;margin-bottom:6px}",
      ".bl-chips{display:flex;gap:6px;flex-wrap:wrap}",
      ".bl-chips .dia-bl{display:inline-block;width:auto;margin-top:0;font-size:.72rem;padding:4px 10px}",
      ".bl-moviendo{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0;",
      "  padding:9px 12px;border-radius:10px;background:var(--azul-claro);",
      "  border:1px solid var(--azul-borde);font-size:.84rem;color:var(--azul-hondo)}",
      ".bl-quitar,.bl-cancela{border:1px solid var(--azul-borde);background:var(--blanco);",
      "  border-radius:999px;padding:3px 11px;font:inherit;font-size:.74rem;font-weight:600;",
      "  color:var(--azul-hondo);cursor:pointer}",
      ".bl-quitar:hover,.bl-cancela:hover{border-color:var(--azul)}",
      /* EL PUNTO, CON ARO BLANCO Y UN VERDE MÁS VIVO (23-sep-2026, Carlos:
         «no distingo el verde oscuro de un azul oscuro»). Y no era su vista:
         el verde de antes, #2f6b47, contra el azul del día de hoy, #2f5c8a,
         da un contraste de 1,10 — o sea, la misma luminosidad y sólo el tono
         para separarlos. Por debajo de 3 no los distingue nadie con poca luz.
         #34a853 sube esa separación a 2,28 sin perder contra los fondos.
         El aro blanco hace más que el cambio de color: despega el punto de
         cualquier fondo, sea del color que sea. */
      ".ent-dia .p{width:11px;height:11px;border-radius:50%;background:var(--borde);" +
        "margin-top:auto;flex:none;box-shadow:0 0 0 1.5px #fff}",
      ".ent-dia.ok .p{background:#34a853}",
      ".ent-dia.fallo .p{background:#d0492f}",
      ".ent-dia.fuera .p{background:#e0a93c}",
      ".ent-dia.pend .p{background:var(--azul-borde)}",
      ".ent-dia.hoy.ok .p{background:#34a853}",       /* hoy sigue azul, pero el punto ya dice que está hecho */
      ".ent-dia.fuera .q,.ent-dia.fuera .f{color:#8a7448}",
      ".ent-talla{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}",
      ".ent-talla select{padding:7px 9px;border:1px solid var(--borde);border-radius:10px;font:inherit}",
      "@media(max-width:520px){.ent-semana{grid-template-columns:repeat(4,1fr)}.ent-cab img{width:52px;height:52px}}",
      ".ent-semlinea{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;" +
        "font-size:.82rem;color:var(--gris);margin:-4px 0 10px;padding:6px 10px;background:var(--azul-claro);" +
        "border:1px solid var(--azul-borde);border-radius:10px}",
      ".ent-semlinea .info{flex:1 1 260px;min-width:0;line-height:1.35}",
      ".ent-semlinea .info b{color:var(--azul-hondo)}",
      ".ent-semlinea .ctrl{display:flex;gap:6px 12px;align-items:center;flex-wrap:wrap;flex:0 1 auto;max-width:100%}",
      ".ent-semlinea label{display:flex;align-items:center;gap:6px;white-space:nowrap;margin:0}",
      ".ent-semlinea select{width:auto;max-width:100%;padding:3px 6px;border:1px solid var(--borde);border-radius:8px;font:inherit;font-size:.8rem;margin:0}",
      ".ent-semlinea .racha-mini b{color:var(--azul-hondo)}",
      "@media(max-width:520px){.ent-franja .ent-avisos{flex:none}}"
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
      /* LA PRIMERA DE LA BARRA, decisión de Carlos del 21-sep-2026: el orden es
         Entrenamiento · Recetas · Menú · Despensa · Compra · Ajustes, de lo que
         se mira a diario a lo que se toca de vez en cuando. Antes se metía
         delante de «Ajustes», que la dejaba la penúltima. */
      nav.insertBefore(b, nav.firstElementChild || null);
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
    /* Las dos horas eran el último sitio donde se esperaba por esperar: se
       publicaban datos nuevos y este fichero —el que más se mueve, el que trae
       lo de hoy— seguía enseñando la copia vieja. Ahora manda la HUELLA, como
       en los otros cinco: si el fichero publicado es el mismo, no se pide
       aunque hayan pasado días; si ha cambiado, se pide aunque acabe de
       traerse. Las dos horas sólo se usan si no se pudo preguntar. */
    FRESCO_MIN: 120,          // sólo cuando no hay huella (sin conexión)
    datos: null,
    sha: null,
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
        if (j && j.datos) {
          this.datos = j.datos; this.traidoEl = j.traidoEl; this.sha = j.sha || null;
          this.estado = "ok"; return true;
        }
      } catch (e) {}
      return false;
    },

    aCache: function () {
      try {
        localStorage.setItem(this.CLAVE, JSON.stringify(
          { traidoEl: this.traidoEl, sha: this.sha, datos: this.datos }));
      } catch (e) { /* si no cabe, se vive sin caché */ }
    },

    caducado: function () {
      var viva = Firmas.de(this.RUTA);
      if (viva) return this.sha !== viva;          // la huella manda sobre el reloj
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
      /* antes de decidir si hace falta pedirlo, se pregunta qué hay publicado */
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(forzar, alTerminar); }); return; }
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
          self.sha = j.sha || Firmas.de(self.RUTA);
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
    if (!e.entreno.ajuste) e.entreno.ajuste = {};
    if (!e.entreno.largo) e.entreno.largo = {};   // la salida declarada, por semana
    if (!e.entreno.noHabil) e.entreno.noHabil = {};   // días que no se pueden entrenar
    if (!e.entreno.quitados) e.entreno.quitados = {}; // bloques retirados con motivo
    return e.entreno;
  }

  /* ---------- EL AJUSTE DEL DÍA ----------
     Cuando el semáforo rebaja y se acepta la alternativa, la sesión de hoy queda
     cambiada. Se guarda como { i, t, min, descanso }: `i` es LA POSICIÓN de la
     sesión sustituida, y eso no es un detalle — las marcas de hecho se guardan
     como "s0", "s1"… por posición, así que si el ajuste cambiara el número de
     sesiones o su orden, la casilla marcada pasaría a leer otra sesión. Sustituye
     una por otra, en su sitio, y no toca las demás. */
  function ajusteDe(iso) { return ent().ajuste[iso] || null; }

  function ponerAjuste(iso, aj) {
    if (aj) ent().ajuste[iso] = aj; else delete ent().ajuste[iso];
    A.guardar("entreno");
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
    /* EL CRUCERO, pasada la semana 13.
       ANTES: repetía la carga de la 13 para siempre. O sea que la rampa se paraba
       en 400 y ahí se quedaba hasta el fin de los tiempos, con una descarga cada
       cuarta semana. Nadie lo había mirado porque hasta hoy la 13 caía en
       diciembre y quedaba lejos.
       AHORA: sigue subiendo `crucero.paso` puntos por semana de construcción
       hasta `crucero.techo`, y la cuarta semana baja sobre la ÚLTIMA DE
       CONSTRUCCIÓN, no sobre la anterior —si no, dos descargas seguidas se
       comerían la una a la otra y la rampa se desinflaría sola.
       Los números y el porqué están en datos/plan.js, junto a `crucero`. */
    var base = P.rampa[P.rampa.length - 1], k = idx - (P.rampa.length - 1);
    var cru = P.crucero || {};
    var paso = cru.paso || 0;
    var techo = cru.techo || base.carga;
    var fDesc = cru.descarga || 0.65;
    var carga = base.carga, ultima = base.carga, descarga = false;
    for (var j = 1; j <= k; j++) {
      descarga = (j % 4) === 3;                                         // tres de construcción y la cuarta baja
      if (descarga) {
        carga = Math.round(ultima * fDesc);
      } else {
        carga = Math.min(ultima + paso, techo);
        ultima = carga;
      }
    }
    if (k === 0) { carga = base.carga; descarga = false; }
    return { n: base.n + k, carga: carga,
             talla: descarga ? (cru.tallaDescarga || "B") : "A",
             nota: descarga ? "Descarga" : base.nota };
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

  /* LA SALIDA LARGA NO SE PROGRAMA. Carlos, 23-sep-2026: «la actividad larga
     tampoco va a seguir un plan fijo… pueden ser 4 seguidas de montaña,
     alternancia, solo bici. Depende de los planes que aparezcan. Igual un día
     sale un fin de semana en montaña y se hacen dos rutas».
     Así que aquí no se dice qué hacer: se dice lo que hay, y el domingo el pase
     mira lo que costó y ajusta la semana siguiente. Antes esto alternaba monte y
     bici por si el número de semana era par — que además ni alternaba, porque las
     descargas son todas pares y se saltan. Fuera. */
  function textoDiaGrande(sem) {
    var o = (P.salidaLarga && P.salidaLarga.texto) || "Salida larga, la que surja";
    var r = P.salidaLarga && P.salidaLarga.orientacion;
    if (r) for (var i = 0; i < r.length; i++) if (sem.n <= r[i].hasta) return o + " · " + r[i].texto;
    return o;
  }

  /* RECUPERADA el 23-sep-2026. La publicación de las 9:41 de esa mañana borró esta
     función dejando los SIETE sitios que la llaman, y la app dejó de arrancar: como
     `htmlPortada` la usa, petaba al montar la portada y no había ni vídeo ni botón
     «Entrar». Restaurada literal desde la copia de las 8:04 que guarda el buzón; el
     diff de funciones confirma que fue lo ÚNICO que se perdió en esa publicación. */
  /* ==================== EL BOLSILLO DE LA SEMANA Y SU REPARTO ====================
     El plan dice QUÉ BLOQUES tiene la semana y cuánto pesa cada uno; los días
     los pone Carlos. Los tamaños salen del objetivo de esa semana, que es la
     regla 3 de la rampa —«las sesiones se escalan desde el objetivo»— y llevaba
     desde el 23 de septiembre escrita y sin hacer.
     (Carlos, 24-sep-2026.) */
  /* ==================== LA SALIDA LARGA, DECLARADA ====================
     El plan propone un modo y unas horas; Carlos los cambia si sabe a dónde va.
     Con eso se calcula lo que paga el bloque, y los cinco rodillos se dimensionan
     con lo que queda. Es la regla que él pidió: «el bloque de montaña o outdoor se
     puede poner como estimación y en función de eso repartir los otros cinco».
     (24-sep-2026.) */
  function cfgLargo() { return (P.bolsillo && P.bolsillo.largo) || {}; }

  function modoLargo(id) {
    var ms = cfgLargo().modos || [], i;
    for (i = 0; i < ms.length; i++) if (ms[i].id === id) return ms[i];
    for (i = 0; i < ms.length; i++) if (ms[i].id === cfgLargo().pordefecto) return ms[i];
    return ms[0] || null;
  }

  function topeLargo(m) {
    var c = cfgLargo();
    return (m && m.topeHoras) || c.topeHoras || 6;
  }

  /* lo que paga una salida: horas por el ritmo MEDIDO de ese terreno */
  function puntosLargo(m, horas) {
    if (!m || !(horas > 0) || !(m.ph > 0)) return 0;
    return Math.round(horas * m.ph);
  }

  /* LAS HORAS QUE LA APP PROPONE: las que hacen falta para pagar su trozo del
     presupuesto de bici en ese terreno, redondeadas a media hora, con su tope y
     con un suelo de una hora —una salida larga de media hora no es una salida.
     En montaña el tope muerde casi siempre, y ahí está la gracia: la salida paga
     lo que paga y lo que falte se lo comen los rodillos. Es lo que Carlos eligió
     con las dos opciones delante y los números a la vista. */
  function horasPropuestas(m, ptsBici) {
    var tope = topeLargo(m);
    if (!m || !(m.ph > 0)) return Math.min(2, tope);
    var h = Math.round((ptsBici * (cfgLargo().cuota || 0.30) / m.ph) * 2) / 2;
    if (!(h >= 1)) h = 1;
    return Math.min(h, tope);
  }

  /* las horas que se pueden elegir para un modo: de 1 h a su tope, de media en
     media. La montaña tiene el mismo tope que lo demás; el rodillo, tres horas. */
  function horasPosibles(m) {
    var out = [], tope = topeLargo(m), h;
    for (h = 1; h <= tope + 0.001; h += 0.5) out.push(Math.round(h * 2) / 2);
    return out;
  }

  /* lo declarado para una semana, o la propuesta si no hay nada declarado */
  function largoDe(sem) {
    var g = (ent().largo || {})[sem.desde];
    var m = modoLargo(g && g.modo);
    if (!m) return null;
    var ptsBici = (sem.carga || 0) * ((P.bolsillo.cuota && P.bolsillo.cuota.bici) || 0.85);
    var horas = (g && g.horas > 0) ? Math.min(g.horas, topeLargo(m)) : horasPropuestas(m, ptsBici);
    return { modo: m, horas: horas, pts: puntosLargo(m, horas), suyo: !!(g && g.modo) };
  }

  function ponerLargo(sem, modo, horas) {
    var e = ent();
    if (!modo) delete e.largo[sem.desde];
    else e.largo[sem.desde] = { modo: modo, horas: horas || 0 };
    cacheBolsillo = {};
    A.guardar("entreno");
  }

  var cacheBolsillo = {};
  /* el bloque que se está moviendo: { desde, bid }. Dos toques —el bloque y
     luego el día— en vez de arrastrar, que en el móvil es un suplicio. */
  var bloqueSel = null;

  /* El nombre corto que cabe en la casilla de un día.
     Los bloques de una semana ESCRITA A MANO conservan su propio texto —hasta
     la primera coma—, que es como se leía la tira antes: «Fuerza A»,
     «Caminar a buen paso», «Descanso». Los que genera la rampa sí se abrevian,
     porque son siempre los mismos cuatro. */
  function cortoBloque(s) {
    if (s.dia) {
      var t = String(s.t || "").split(",")[0];
      return t + (s.min ? " " + s.min + "'" : "");
    }
    var n = s.largo ? "Larga"
      : (s.fam === "bici" ? "Bici"
      : (s.fam === "caminar" ? "Andar"
      : (s.fam === "fuerza"
          ? ("Fza " + String(s.t).replace(/^fuerza\s*/i, "").split(/[,\s]/)[0]).replace(/\s+$/, "")
          : s.t.split(" ")[0])));
    /* A PARTIR DE DOS HORAS, EN HORAS. La salida larga salía como «360'» y eso
       no lo lee nadie de un vistazo en una casilla del tablero. */
    if (s.min >= 120) return n + " " + horasTxt(Math.round(s.min / 30) / 2);
    return n + (s.min ? " " + s.min + "'" : "");
  }

  function bolsilloDe(sem) {
    var B = P.bolsillo;
    if (!B || !sem || !sem.desde) return null;
    var gL = (ent().largo || {})[sem.desde];
    var clave = sem.desde + "|" + sem.carga + "|" + tallaDe(sem) +
                "|" + (gL ? gL.modo + ":" + gL.horas : "-") +
                "|" + firmaNoHabil(sem);
    if (cacheBolsillo[clave]) return cacheBolsillo[clave];

    var rit = P.ritmos || {}, out = [], num = 0;

    /* LAS SEMANAS ESCRITAS A MANO TAMBIÉN SON BLOQUES  ·  24-sep-2026
       Los diez días del 18 al 27 de septiembre están escritos uno a uno en
       `excepciones`: el corticoide, sin bici, a pie. Si el bolsillo los pisara
       con lo que manda la rampa, la semana dejaría de ser la que el plan dice.
       Pero tampoco tiene sentido que sean lo único de la app que no se puede
       mover. Así que el bolsillo de esas semanas se hace CON ESAS MISMAS
       LÍNEAS: dicen exactamente lo mismo, y cada una se queda de partida en su
       día, pero ya se pueden arrastrar como las demás. */
    var conMano = [], fx = sem.desde;
    while (fx <= sem.hasta) {
      if ((P.excepciones || {})[fx]) conMano.push(fx);
      fx = U.sumarDias(fx, 1);
    }
    if (conMano.length) {
      conMano.forEach(function (d) {
        (P.excepciones[d] || []).forEach(function (x) {
          out.push({ id: "b" + num, t: x.t, min: x.min, fam: familia(x.t), dia: d });
          num++;
        });
      });
      cacheBolsillo[clave] = out;
      return out;
    }
    var vBici = (rit.bici && rit.bici.v) || 45, vCam = (rit.caminar && rit.caminar.v) || 25;

    function mete(fam, texto, n, min, extra) {
      for (var i = 0; i < n; i++) {
        var b = { id: "b" + num, t: texto, min: min, fam: fam };
        num++;
        if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) b[k] = extra[k];
        out.push(b);
      }
    }
    /* cuántos bloques y de cuánto, para gastar `pts` sin pasar del máximo por
       bloque ni bajar del mínimo. Si no llega ni para uno del mínimo, cero. */
    /* CUÁNTOS BLOQUES Y DE CUÁNTO. Se prefieren MUCHOS bloques medianos a
       pocos largos: la semana que pidió Carlos son cinco rodillos, no uno de
       dos horas y media. Así que se hacen tantos como quepan a la duración
       mínima, con el tope de `cfg.n`, y los minutos se reparten entre ellos.
       En las semanas bajas salen menos bloques, y van apareciendo según sube
       el objetivo hasta llegar a los cinco. */
    /* CUÁNTOS DÍAS HAY PARA REPARTIR. Con días no hábiles marcados, mantener los
       cinco rodillos sería meter dos en el mismo día una y otra vez. Se hacen
       menos bloques y más largos, que es lo coherente con repartir toda la carga
       en menos días. (24-sep-2026.) */
    var nHab = Math.max(1, diasHabilesDe(sem).length);

    function trocear(pts, ph, cfg, tope) {
      if (!(pts > 0) || !ph) return { n: 0, min: 0 };
      var minT = pts / ph * 60;
      /* LO QUE SOBRA NO SE TIRA. Antes, si el resto no llegaba al bloque mínimo
         se perdía entero: Carlos probó la semana del 28 con dos horas de puerto,
         sobraban 35 minutos de rodillo y la app le quitaba TODA la bici de
         diario. Ahora, si pasa del `suelo`, se hace un bloque corto. */
      if (minT < cfg.min) {
        if (cfg.suelo && minT >= cfg.suelo) return { n: 1, min: Math.round(minT / 5) * 5 };
        return { n: 0, min: 0 };
      }
      var maxN = Math.min(cfg.n, tope || cfg.n);
      var n = Math.max(1, Math.min(maxN, Math.floor(minT / cfg.min)));
      var m = Math.round(minT / n / 5) * 5;
      if (m > cfg.max) m = cfg.max;
      if (m < cfg.min) m = cfg.min;
      return { n: n, min: m };
    }

    var carga = sem.carga || 0;
    var ptsBici = carga * ((B.cuota && B.cuota.bici) || 0.85);
    var ptsCam = carga - ptsBici;

    /* EL LARGO SE SIRVE PRIMERO Y CON SU PRECIO MEDIDO. Ya NO está fuera de la
       carga —Carlos, 24-sep-2026: «si un sábado me machaco con la bici es carga,
       quiera o no»— y ya NO se paga a ritmo de bici: se declara el modo y las
       horas, y la fórmula medida dice lo que vale. Los rodillos se dimensionan
       con lo que quede, que es lo que él pidió.
       El caso duro y elegido a sabiendas: seis horas de montaña pagan ~137 de los
       595 puntos de bici de la semana 27, así que quedan 458 para los rodillos y
       la semana se va a más de veinte horas. Se le puso delante con los números
       y eligió repartirlo todo. */
    var L = largoDe(sem);
    var ptsLargo = 0;
    /* SI NO HAY SALIDA NI RODILLO LARGO no se mete bloque: el presupuesto entero
       se reparte entre los rodillos de diario. */
    if (L && L.modo.fam) {
      ptsLargo = L.pts;
      var minLargo = Math.max(15, Math.round(L.horas * 60 / 5) * 5);
      /* `pts` es su precio propio, que costeSesion respeta. Conserva la familia
         «bici» para el color y el reparto, y la marca `largo` para que al buscarle
         actividad medida le valga igual una ruta de monte que un rodillo. */
      mete("bici", L.modo.fam === "rodillo" ? "Rodillo largo" : B.textos.largo,
           1, minLargo, { largo: true, pts: ptsLargo, modo: L.modo.id });
    }

    /* el largo, si lo hay, ya ocupa un día: a los rodillos les quedan nHab-1 */
    var topeRod = Math.max(1, nHab - (ptsLargo > 0 ? 1 : 0));
    var rod = trocear(Math.max(0, ptsBici - ptsLargo), vBici, B.rodillo, topeRod);
    mete("bici", B.textos.rodillo, rod.n, rod.min);
    var cam = trocear(ptsCam, vCam, B.caminata, nHab);
    mete("caminar", B.textos.caminata, cam.n, cam.min);
    /* la fuerza NO se recorta por días: comparte día con el rodillo sin problema,
       que es lo que hacen las plantillas de siempre. */
    (B.fuerza.nombres || []).slice(0, B.fuerza.n).forEach(function (nom) {
      mete("fuerza", nom, 1, B.fuerza.min);
    });

    cacheBolsillo[clave] = out;
    return out;
  }

  function diasDe(sem) {
    var out = [], f = sem.desde;
    while (f <= sem.hasta) { out.push(f); f = U.sumarDias(f, 1); }
    return out;
  }

  /* ==================== LOS DÍAS NO HÁBILES  ·  24-sep-2026 ====================
     Carlos: «si no hay salida y no puedo moverla de día que reparta esa carga en
     los cinco días disponibles. Y esta frase trae una mejora: marcar días como no
     hábiles por la razón que sea». Y luego: «o cuentan como descanso o se pueden
     clasificar así».

     Así que un día no hábil ES DESCANSO: no se le pone nada y no cuenta como
     incumplido. La carga de la semana NO baja —decisión suya, la misma que tomó
     con la salida larga—: se reparte entre los días que queden, aunque salgan
     sesiones largas. Si marca el sábado y el domingo, los cinco de diario cargan
     con todo.

     MOTIVOS: son etiquetas, no reglas. Ninguno cambia el cálculo; están para que
     dentro de un mes se sepa por qué aquella semana fue rara. */
  var MOTIVOS_NOHABIL = [
    { id: "viaje",   n: "Viaje" },
    { id: "social",  n: "Compromiso" },
    { id: "trabajo", n: "Trabajo" },
    { id: "medico",  n: "Médico" },
    { id: "otro",    n: "Otra cosa" }
  ];

  function noHabilDe(iso) { return ent().noHabil[iso] || null; }

  function ponerNoHabil(iso, motivo) {
    var e = ent();
    if (motivo) e.noHabil[iso] = { m: motivo, t: Date.now() };
    else delete e.noHabil[iso];
    cacheBolsillo = {};
    /* AL MARCARLO, LOS BLOQUES DE ESE DÍA SE RECOLOCAN SOLOS. Es lo que eligió
       Carlos: la app los reparte en los días hábiles que queden y él retoca lo que
       no le cuadre. Se guarda el reparto entero para que el movimiento sea real y
       no una recolocación que se rehace distinta en cada pintada. */
    var sem = semanaDe(iso);
    if (motivo && sem) {
      var b = bolsilloDe(sem) || [], mapa = repartoDe(sem) || {}, movidos = 0;
      b.forEach(function (x) {
        if (mapa[x.id] !== iso) return;
        var d = mejorDiaPara(sem, mapa, x);
        mapa[x.id] = d;
        if (d) movidos++;
      });
      repartoGuardado()[sem.desde] = mapa;
      if (movidos && U.toast) U.toast(movidos === 1 ? "1 bloque movido" : movidos + " bloques movidos");
    }
    A.guardar("entreno");
  }

  function diasHabilesDe(sem) {
    return diasDe(sem).filter(function (f) { return !noHabilDe(f); });
  }

  /* los días no hábiles de una semana, para la clave de caché del bolsillo */
  function firmaNoHabil(sem) {
    var o = [];
    diasDe(sem).forEach(function (f) { var n = noHabilDe(f); if (n) o.push(f + ":" + n.m); });
    return o.join(",");
  }

  /* ==================== QUITAR UN BLOQUE CON MOTIVO ====================
     Carlos, 23-sep-2026: «lo de quitar un bloque con motivo está bien para saber
     y registrar qué pasó después, pero a nivel de cumplimiento sería un
     incumplimiento igual». Eso es exactamente lo que hace: guarda el porqué y
     cuenta como no hecho. No es una forma de salvar la semana. */
  var MOTIVOS_BLOQUE = [
    { id: "tiempo",    n: "El tiempo" },
    { id: "cansancio", n: "Cansado" },
    { id: "molestia",  n: "Molestia" },
    { id: "agenda",    n: "No me dio la vida" },
    { id: "otro",      n: "Otra cosa" }
  ];

  function quitadosDe(sem) {
    var q = ent().quitados[sem.desde];
    if (!q) { q = {}; ent().quitados[sem.desde] = q; }
    return q;
  }

  function quitadoDe(sem, bid) { return quitadosDe(sem)[bid] || null; }

  function ponerQuitado(sem, bid, motivo) {
    var q = quitadosDe(sem);
    if (motivo) q[bid] = { m: motivo, t: Date.now() };
    else delete q[bid];
    A.guardar("entreno");
  }

  /* El reparto de partida: lo gordo separado y el último día de la semana
     libre. Si no toca nada, la semana funciona igual que antes. */
  function repartoPropuesto(sem, b) {
    /* SOLO EN DÍAS HÁBILES. Un día marcado como no hábil es descanso y no recibe
       nada; su carga se la reparten los que quedan. (24-sep-2026.) */
    var dias = diasHabilesDe(sem);
    if (!dias.length) dias = diasDe(sem);            // semana entera bloqueada: no se pierde nada
    var n = dias.length, mapa = {};
    var huecos = Math.max(1, n - 1);                 // el último día se deja libre
    var ordRod = [0, 3, 1, 4, 2, 5], ordCam = [2, 5, 1, 4, 0, 3], ordFue = [0, 3, 1];
    var iR = 0, iC = 0, iF = 0, huerfanos = [];
    b.forEach(function (x) {
      /* si el bloque viene de una línea escrita a mano, arranca en SU día */
      if (x.dia && !noHabilDe(x.dia)) { mapa[x.id] = x.dia; return; }
      /* SI SU DÍA SE HA MARCADO COMO NO DISPONIBLE no entra en el reparto por
         orden —que va por índices y en una semana larga puede caer en un día ya
         pasado—: se aparta y al final se le busca el hueco que menos carga lleve
         de hoy en adelante. */
      if (x.dia) { huerfanos.push(x); return; }
      if (x.largo) { mapa[x.id] = dias[Math.max(0, n - 2)]; return; }
      if (x.fam === "caminar") { mapa[x.id] = dias[ordCam[iC++ % ordCam.length] % huecos]; return; }
      if (x.fam === "fuerza") { mapa[x.id] = dias[ordFue[iF++ % ordFue.length] % huecos]; return; }
      mapa[x.id] = dias[ordRod[iR++ % ordRod.length] % huecos];
    });
    huerfanos.forEach(function (x) { mapa[x.id] = mejorDiaPara(sem, mapa, x); });
    return mapa;
  }

  /* LA SALIDA DE LA SEMANA, A LA VISTA Y EDITABLE.
     Antes aquí salía una orientación fija por número de semana —«monte de 15-18
     km, o bici de 60-70»— que no dependía de nada y no servía para calcular.
     Ahora se declara y de ahí salen los cinco rodillos. */
  function fichaSalida(lunes) {
    var sem = semanaDe(lunes) || semanaDe(U.sumarDias(lunes, 3));
    if (!sem) return "";
    var L = largoDe(sem);
    if (!L) return "";
    var B = P.bolsillo || {}, bl = bolsilloDe(sem) || [];
    /* LAS SEMANAS ESCRITAS A MANO NO LLEVAN FICHA (los diez días del corticóide
       van día a día en `excepciones`): enseñar ahí una salida que no mueve nada
       del tablero sería mentir. Se reconocen porque sus bloques traen `dia`.
       OJO, y por esto se arregló: antes el corte era «no hay bloque largo», y con
       el modo «sin salida: reparto en la semana» tampoco lo hay — la ficha
       desaparecía y se quedaba sin manera de volver atrás. */
    var aMano = false;
    bl.forEach(function (x) { if (x.dia) aMano = true; });
    if (aMano || !bl.length) return "";
    var nRod = 0, minRod = 0;
    bl.forEach(function (x) {
      if (x.fam === "bici" && !x.largo) { nRod++; minRod = x.min; }
    });
    var esRod = L.modo.fam === "rodillo";
    var esNada = !L.modo.fam;
    var ptsBici = Math.round((sem.carga || 0) * ((B.cuota && B.cuota.bici) || 0.85));
    return '<div class="salida-ficha' + (L.pts > ptsBici ? " pasada" : "") + '">' +
      '<div class="salida-txt"><span class="et">' +
        (esRod || esNada ? "Esta semana, sin salida" : "La salida de esta semana") + "</span>" +
        "<b>" + U.esc(L.modo.n) + (esNada ? "" : " · " + horasTxt(L.horas)) + "</b>" +
        '<span class="nota-peque">' +
          (esNada ? "Los <b>" + ptsBici + " puntos</b> de bici van enteros a los días de diario. "
                  : "Paga <b>" + L.pts + "</b> de los " + ptsBici + " de bici" +
                    (L.suyo ? "" : " · propuesta de la app") + ". ") +
          (nRod ? (nRod === 1 ? "Queda 1 rodillo de " : "Quedan " + nRod + " rodillos de ") +
                  minRod + " min."
                : "No quedan puntos para rodillo.") + "</span>" +
        /* SI LA SALIDA SE PASA DEL PRESUPUESTO SE DICE, y no se compensa quitando
           nada: es carga de verdad y ya está hecha. Pasa sobre todo en las
           semanas de descarga, donde el presupuesto de bici es pequeño y una
           jornada de montaña se lo lleva entero. Callarlo sería dejarle creer que
           la semana cuadra cuando va un 50 % por encima. */
        (L.pts > ptsBici
          ? '<span class="salida-pasa">Se pasa en ' + (L.pts - ptsBici) +
            " puntos del presupuesto de bici de esta semana.</span>" : "") +
      "</div>" +
      '<button type="button" class="btn" data-salida="' + sem.desde + '">Cambiar</button></div>';
  }

  /* La emergente no lleva la semana en cada botón: la guarda el botón que la
     abrió. Se lee de ahí para no repetir el dato en veinte sitios. */
  var salidaSem = null;
  function semanaActivaSalida() { return salidaSem; }

  /* lo que queda por rescatar de los días ya pasados de esta tira */
  function panelAmbar(lunes) {
    var out = "", vistos = {};
    for (var i = 0; i < 7; i++) {
      var f = U.sumarDias(lunes, i), sem = semanaDe(f);
      if (!sem) continue;
      var r = estadoRescate(sem, f);
      if (!r) continue;
      var k = f; if (vistos[k]) continue; vistos[k] = 1;
      var nombres = r.pend.map(function (x) { return cortoBloque(x); }).join(", ");
      if (r.estado === "ambar") {
        out += '<div class="resc ambar"><span class="et">Sin hacer, todavía a tiempo</span>' +
          "<b>" + U.esc(nombres) + "</b>" +
          '<span class="nota-peque">Era del ' + U.esc(U.etiquetaFecha(f)) +
          ". Queda sitio el <b>" + U.esc(U.etiquetaFecha(r.dia)) + "</b>.</span>" +
          '<button type="button" class="btn" data-resc="' + f + ">" + r.dia +
          '">Pasarlo al ' + U.esc(U.etiquetaFecha(r.dia)) + "</button></div>";
      } else {
        out += '<div class="resc rojo"><span class="et">No se hizo y ya no hay dónde</span>' +
          "<b>" + U.esc(nombres) + "</b>" +
          '<span class="nota-peque">Era del ' + U.esc(U.etiquetaFecha(f)) +
          ". No quedan días hábiles en esta semana: cuenta como incumplido.</span></div>";
      }
    }
    return out;
  }

  function panelAvisos(lunes) {
    var sem = semanaDe(lunes) || semanaDe(U.sumarDias(lunes, 3));
    if (!sem) return "";
    var av = avisosReparto(sem);
    if (!av.length) return "";
    var h = '<div class="av-reparto">';
    av.forEach(function (a) {
      h += '<div class="av-linea"><b>' + U.esc(a.t) + "</b><span>" + U.esc(a.d) + "</span></div>";
    });
    return h + "</div>";
  }

  /* la ventana para quitar un bloque con motivo */
  function abrirQuitar(clave) {
    var caja = document.getElementById("modal-caja"), modal = document.getElementById("modal");
    if (!caja || !modal) return;
    var pr = clave.split(":"), sem = semanaDe(pr[0]);
    if (!sem) return;
    var b = bolsilloDe(sem) || [], bl = null;
    b.forEach(function (x) { if (x.id === pr[1]) bl = x; });
    if (!bl) return;
    var q = quitadoDe(sem, pr[1]);
    var h = '<header><h2>No lo voy a hacer</h2>' +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">\u00d7</button></header>' +
      '<div class="sal-cuenta"><b>' + U.esc(bl.t) + (bl.min ? " \u00b7 " + bl.min + " min" : "") + "</b></div>" +
      '<p class="nota-peque">Se registra el motivo para saber qu\u00e9 pas\u00f3, pero <b>cuenta como incumplido igual</b>. Palabras tuyas del 23 de septiembre.</p>' +
      '<p class="sal-et">Por qu\u00e9</p><div class="sal-horas">';
    MOTIVOS_BLOQUE.forEach(function (m) {
      h += '<button type="button" class="sal-hora' + (q && q.m === m.id ? " elegido" : "") +
        '" data-quitar-m="' + pr[0] + ":" + pr[1] + ":" + m.id + '">' + U.esc(m.n) + "</button>";
    });
    h += "</div>";
    if (q) h += '<button type="button" class="deshacer" data-quitar-m="' + pr[0] + ":" + pr[1] +
                ':">Recuperarlo, s\u00ed lo voy a hacer</button>';
    caja.innerHTML = h;
    modal.classList.add("abierta");
  }

  function nombreNoHabil(id) {
    var r = "No hábil";
    MOTIVOS_NOHABIL.forEach(function (m) { if (m.id === id) r = m.n; });
    return r;
  }

  function horasTxt(h) {
    var e = Math.floor(h), m = Math.round((h - e) * 60);
    return e + (m ? "h" + (m < 10 ? "0" : "") + m : " h");
  }

  /* la emergente para declararla: terreno arriba, horas debajo, y lo que cuesta
     cada cosa a la vista. Nada de teclear metros de desnivel. */
  function abrirSalida(iso) {
    var caja = document.getElementById("modal-caja"), modal = document.getElementById("modal");
    var sem = semanaDe(iso) || semanaDe(U.sumarDias(iso, 3));
    if (!caja || !modal || !sem) return;
    salidaSem = sem;
    caja.innerHTML = '<header><h2>La salida de la semana</h2>' +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">×</button></header>' +
      '<div id="salida-cuerpo">' + cuerpoSalida(sem) + "</div>";
    modal.classList.add("abierta");
  }

  function cuerpoSalida(sem) {
    var L = largoDe(sem), C = cfgLargo();
    var ptsBici = (sem.carga || 0) * (((P.bolsillo.cuota) || {}).bici || 0.85);
    var h = '<p class="nota-peque">El objetivo de esta semana son <b>' + (sem.carga || 0) +
      " puntos</b>, " + Math.round(ptsBici) + " de ellos de bici. Lo que no pague la salida " +
      "se reparte entre los rodillos de diario.</p>";
    h += '<div class="sal-modos">';
    (C.modos || []).forEach(function (m) {
      var mio = L && L.modo.id === m.id;
      h += '<button type="button" class="sal-modo' + (mio ? " elegido" : "") +
        '" data-sal-modo="' + m.id + '"><b>' + U.esc(m.n) + "</b>" +
        '<span>' + m.ph.toString().replace(".", ",") + " p/h · " + U.esc(m.mh) + "</span></button>";
    });
    h += "</div>";
    if (L && !L.modo.fam) {
      h += '<div class="sal-cuenta">Sin bloque largo. Los <b>' +
        Math.round(ptsBici) + " puntos</b> de bici se reparten entre los rodillos de diario.</div>";
      h += '<button type="button" class="deshacer" data-sal-modo="">Volver a la propuesta de la app</button>';
    } else if (L) {
      h += '<p class="sal-et">Horas</p><div class="sal-horas">';
      horasPosibles(L.modo).forEach(function (x) {
        h += '<button type="button" class="sal-hora' + (Math.abs(x - L.horas) < 0.01 ? " elegido" : "") +
          '" data-sal-hora="' + x + '">' + horasTxt(x) + "</button>";
      });
      h += "</div>";
      h += '<div class="sal-cuenta"><b>' + L.pts + " puntos</b> · " +
        U.esc(L.modo.n.toLowerCase()) + ", " + horasTxt(L.horas) + "</div>";
      h += '<p class="nota-peque">Ritmo medido sobre <b>' + L.modo.muestra +
        " salidas suyas</b> de 2,5 h o más." +
        (L.modo.muestra < 20 ? " Muestra corta: el número se afinará con las próximas." : "") + "</p>";
      h += '<button type="button" class="deshacer" data-sal-modo="">Volver a la propuesta de la app</button>';
    }
    return h;
  }

  /* ==================== EL ÁMBAR  ·  24-sep-2026 ====================
     Carlos puso la norma: «se pone rojo si el bloque que estaba previsto no he
     podido pasarlo a otro día. Imagina que surge algo el sábado y no puedo pasarlo
     al domingo… pues se queda en rojo».
     O sea que ROJO es el final del camino, no la primera señal. Mientras queden
     días hábiles por delante en esa semana, el bloque todavía se puede salvar: eso
     es el ÁMBAR, y viene con el día al que la app propone moverlo.
     Un bloque QUITADO con motivo no es ámbar: es rojo desde ya. Quitarlo es una
     decisión tomada. */
  function diasLibresTras(sem, iso) {
    var hoy = U.hoyISO();
    return diasHabilesDe(sem).filter(function (f) { return f > iso && f >= hoy; });
  }

  /* qué le pasa a un día ya pasado que no se cumplió: ámbar si aún hay dónde
     meterlo, rojo si ya no. Devuelve null si no hay nada que decir. */
  function estadoRescate(sem, iso) {
    if (noHabilDe(iso)) return null;
    var b = bolsilloDe(sem), rep = b && b.length ? repartoDe(sem) : null;
    if (!rep) return null;
    var hoy = U.hoyISO();
    if (iso >= hoy) return null;                       // hoy y el futuro no se juzgan
    var talla = tallaDe(sem), ses = sesionesDe(iso, sem, talla), pend = [];
    ses.forEach(function (x, i) {
      if (!x.bid || !cuentaParaElDia(x)) return;
      if (quitadoDe(sem, x.bid)) return;               // quitado con motivo: rojo, no ámbar
      if (!sesionHecha(iso, x, i)) pend.push(x);
    });
    if (!pend.length) return null;
    var libres = diasLibresTras(sem, iso);
    if (!libres.length) return { estado: "rojo", pend: pend };
    /* el día propuesto es el hábil que menos carga lleve de los que quedan */
    var mapa = rep, carga = {};
    libres.forEach(function (f) { carga[f] = 0; });
    b.forEach(function (x) { var d = mapa[x.id]; if (d && carga[d] !== undefined) carga[d] += (x.min || 0); });
    var mejor = libres[0];
    libres.forEach(function (f) { if (carga[f] < carga[mejor]) mejor = f; });
    return { estado: "ambar", pend: pend, dia: mejor };
  }

  /* ==================== LOS AVISOS DE REPARTO  ·  24-sep-2026 ====================
     Los tres que eligió Carlos. AVISAN, NO IMPIDEN: el reparto es suyo y la app
     solo señala lo que a la vista no se ve. */
  /* ¿este bloque es descanso? Ni la movilidad ni una línea que diga «descanso»
     cuentan como día trabajado. */
  function esDescanso(x) {
    if (familia(x && x.t) === "movilidad") return true;
    return /descans/i.test(String((x && x.t) || ""));
  }

  /* ==================== LA CARGA A LA VISTA  ·  24-sep-2026 ====================
     Carlos: «en La Semana pon la carga total junto a La semana (Carga X). Y en el
     bloque de cada día… dos columnas, una con el círculo tal y como está y en otra
     la carga de ese día».
     Es el número que de verdad decide el plan y hasta hoy no se veía en el tablero:
     había que ir al pase para saber cuánto pesaba lo que estabas repartiendo. */
  function cargaDeDia(iso) {
    var sem = semanaDe(iso);
    if (!sem) return null;
    var b = bolsilloDe(sem), rep = b && b.length ? repartoDe(sem) : null;
    if (!rep) return null;
    var t = 0, hay = false;
    b.forEach(function (x) {
      if (rep[x.id] !== iso) return;
      hay = true;
      t += costeSesion(x);
    });
    /* un día SIN bloques no enseña carga: el «0» al lado de «descanso» solo hace
       ruido. Un día CON bloques sí la enseña aunque salga 0, porque eso significa
       que todo lo que lleva es fuerza, que no tiene precio. */
    return hay ? Math.round(t) : null;
  }

  /* lo que suman los bloques COLOCADOS de la semana. Lo que esté en la bandeja no
     cuenta: todavía no tiene día y por tanto no está repartido. */
  function cargaDeSemana(sem) {
    var b = bolsilloDe(sem), rep = b && b.length ? repartoDe(sem) : null;
    if (!rep) return null;
    var t = 0;
    b.forEach(function (x) { if (rep[x.id]) t += costeSesion(x); });
    return Math.round(t);
  }

  function avisosReparto(sem) {
    var b = bolsilloDe(sem), rep = b && b.length ? repartoDe(sem) : null;
    if (!rep) return [];
    var dias = diasDe(sem), out = [], min = {}, total = 0, fuerza = {}, curra = {};
    dias.forEach(function (f) { min[f] = 0; });
    b.forEach(function (x) {
      var d = rep[x.id];
      if (!d || min[d] === undefined) return;
      min[d] += (x.min || 0);
      total += (x.min || 0);
      if (x.fam === "fuerza") fuerza[d] = true;
      /* UN DÍA DE DESCANSO SIGUE SIENDO DESCANSO aunque el plan le ponga minutos.
         Las semanas escritas a mano traen líneas como «Descanso, o paseo corto,
         30 min», y con esos 30 minutos el aviso decía que la semana no tenía
         ningún día de descanso teniendo uno delante, con la palabra escrita.
         Lo vio Carlos el 24-sep y tenía toda la razón. */
      if (!esDescanso(x)) curra[d] = true;
    });
    /* 1) un día que se lleva más del 40 % de la semana */
    if (total > 0) {
      dias.forEach(function (f) {
        if (min[f] / total > 0.40) {
          out.push({ t: "Un solo día se lleva el " + Math.round(min[f] / total * 100) +
                        " % de la semana", d: "El " + U.etiquetaFecha(f) + " tiene " +
                        Math.round(min[f] / 60 * 10) / 10 + " h de las " +
                        Math.round(total / 60 * 10) / 10 + " de la semana. Reparte si puedes." });
        }
      });
    }
    /* 2) una semana sin ningún día de descanso */
    var sinNada = dias.filter(function (f) { return !curra[f] && !noHabilDe(f); });
    if (!sinNada.length && total > 0) {
      out.push({ t: "Esta semana no tiene ningún día de descanso",
                 d: "Los siete días llevan algo. El descanso es lo único que no tenías en 2025, y por eso las semanas 4, 8 y 12 bajan de verdad." });
    }
    /* 3) dos días seguidos de fuerza */
    for (var i = 0; i < dias.length - 1; i++) {
      if (fuerza[dias[i]] && fuerza[dias[i + 1]]) {
        out.push({ t: "Dos días seguidos de fuerza",
                   d: U.etiquetaFecha(dias[i]) + " y " + U.etiquetaFecha(dias[i + 1]) +
                      ". El músculo necesita 48 h para recuperarse; deja un día entre medias." });
        break;
      }
    }
    return out;
  }

  function repartoGuardado() { var e = ent(); if (!e.reparto) e.reparto = {}; return e.reparto; }

  /* dónde está cada bloque de esta semana. Null = sin colocar, en la bandeja. */
  function repartoDe(sem) {
    var b = bolsilloDe(sem);
    if (!b || !b.length) return null;
    var g = repartoGuardado()[sem.desde];
    if (!g) return repartoPropuesto(sem, b);
    var mapa = {};
    b.forEach(function (x) { mapa[x.id] = (g[x.id] === undefined) ? null : g[x.id]; });
    /* RED DE SEGURIDAD: si algo quedó guardado en un día que ahora es no hábil,
       se recoloca al vuelo. `ponerNoHabil` ya los mueve y lo guarda, pero esto
       cubre el caso de que el estado llegue descuadrado de otro aparato. */
    b.forEach(function (x) {
      if (mapa[x.id] && noHabilDe(mapa[x.id])) mapa[x.id] = mejorDiaPara(sem, mapa, x);
    });
    return mapa;
  }

  /* EL DÍA HÁBIL QUE MENOS CARGA LLEVA, para recolocar un bloque que se ha quedado
     sin sitio. Se mide en minutos, no en número de bloques: tres fuerzas de 45 no
     pesan lo que un rodillo de dos horas. Empata a favor del día más temprano.
     Carlos eligió que la app recoloque sola y él retoque. (24-sep-2026.) */
  function mejorDiaPara(sem, mapa, bloque) {
    var libres = diasHabilesDe(sem);
    /* NUNCA AL PASADO. Sin esto, en una semana larga como la 1 (18 al 27) un
       bloque recolocado podía aterrizar en el día 20, que ya pasó y ni siquiera
       sale en la tira: el bloque se esfumaba de la pantalla. Lo vio Carlos el
       24-sep al marcar un viernes como no disponible. */
    var hoy = U.hoyISO();
    var futuros = libres.filter(function (f) { return f >= hoy; });
    if (futuros.length) libres = futuros;
    if (!libres.length) return null;
    var carga = {}, b = bolsilloDe(sem) || [];
    libres.forEach(function (f) { carga[f] = 0; });
    b.forEach(function (x) {
      if (x.id === bloque.id) return;
      var d = mapa[x.id];
      if (d && carga[d] !== undefined) carga[d] += (x.min || 0);
    });
    var mejor = libres[0];
    libres.forEach(function (f) { if (carga[f] < carga[mejor]) mejor = f; });
    return mejor;
  }

  /* los bloques que no están en ningún día, de las semanas que toca esta tira.
     La tira son siete días y pueden caer en dos semanas de la rampa. */
  function sinColocar(lunes) {
    var vistos = {}, out = [];
    for (var i = 0; i < 7; i++) {
      var f = U.sumarDias(lunes, i), sem = semanaDe(f);
      if (!sem || vistos[sem.desde]) continue;
      vistos[sem.desde] = true;
      var b = bolsilloDe(sem), r = repartoDe(sem);
      if (!b || !r) continue;
      b.forEach(function (x) { if (!r[x.id]) out.push({ sem: sem, b: x }); });
    }
    return out;
  }

  function moverBloque(sem, bid, iso) {
    var r = repartoGuardado();
    if (!r[sem.desde]) r[sem.desde] = repartoDe(sem) || {};
    /* la marca viaja con el bloque: las casillas se guardan por día y posición,
       así que mover sin llevarse la marca la dejaría en el día viejo */
    var antes = r[sem.desde][bid] || null;
    /* el índice VIEJO hay que sacarlo antes de mover y el NUEVO después: si se
       sacan los dos a la vez, el viejo ya no existe y la marca se pierde */
    var vIdx = antes ? indiceDe(sem, bid, antes) : -1;
    r[sem.desde][bid] = iso;
    if (antes && antes !== iso) {
      var nIdx = iso ? indiceDe(sem, bid, iso) : -1;
      var c = ent().checks;
      if (vIdx >= 0 && c[antes] && c[antes]["s" + vIdx] !== undefined) {
        var val = c[antes]["s" + vIdx];
        delete c[antes]["s" + vIdx];
        if (!Object.keys(c[antes]).length) delete c[antes];
        if (iso && nIdx >= 0) { if (!c[iso]) c[iso] = {}; c[iso]["s" + nIdx] = val; }
      }
    }
    A.guardar("entreno");
  }

  /* la posición que ocupa un bloque dentro de su día, que es como se guardan
     las casillas ("s0", "s1"…) */
  function indiceDe(sem, bid, iso) {
    if (!iso) return -1;
    var b = bolsilloDe(sem), r = repartoGuardado()[sem.desde] || repartoDe(sem) || {}, k = 0;
    for (var i = 0; i < b.length; i++) {
      if (r[b[i].id] !== iso) continue;
      if (b[i].id === bid) return k;
      k++;
    }
    return -1;
  }

  function sesionesDe(iso, sem, talla, sinAjuste) {
    var lista;
    var exc = (P.excepciones || {})[iso];
    /* El reparto manda siempre que exista, incluso en las semanas escritas a
       mano: en ésas el bolsillo se construye con las propias líneas escritas
       (ver `bolsilloDe`), así que dicen lo mismo y además se pueden mover. */
    var rep = sem ? repartoDe(sem) : null;
    if (rep) {
      var bl = bolsilloDe(sem);
      lista = [];
      bl.forEach(function (x) {
        if (rep[x.id] === iso) lista.push({ t: x.t, min: x.min, fam: x.fam, largo: x.largo,
                                            pts: x.pts, modo: x.modo,
                                            dia: x.dia, bid: x.id });
      });
    } else if (exc) {
      lista = exc.map(function (s) { return { t: s.t, min: s.min }; });
    } else {
      var pl = P.plantillas[talla];
      if (!pl) return [];
      lista = (pl.dias[U.desdeISO(iso).getDay()] || []).map(function (s) {
        if (s.t === "DIA_GRANDE") return { t: textoDiaGrande(sem), min: 0, grande: true };
        return { t: s.t, min: s.min };
      });
    }
    /* si el semáforo rebajó el día y se aceptó, manda lo aceptado */
    var aj = sinAjuste ? null : ajusteDe(iso);
    if (aj && lista[aj.i]) {
      lista[aj.i] = { t: aj.t, min: aj.min, ajustada: true, descanso: !!aj.descanso };
    }
    return lista;
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
    var fam = sesion.fam || familia(sesion.t);
    var reg = registradas(iso), umbral = Math.max(MIN_SESION, Math.round((sesion.min || 45) * 0.6));
    /* el bloque largo no tiene familia: vale bici, vale ruta, vale monte */
    var libre = sesion.grande || sesion.largo || !fam;
    if (libre) umbral = MIN_SESION;
    for (var i = 0; i < reg.length; i++) {
      if ((reg[i].fam === fam || (libre && (reg[i].fam === "caminar" || reg[i].fam === "bici"))) &&
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

  /* QUÉ SESIONES PUEDEN DAR UN DÍA POR CUMPLIDO.
     La movilidad no. El 23-sep-2026 Carlos vio el miércoles en verde con la
     caminata sin hacer: ese día trae «Caminar 55'» y «Movilidad de cuello y
     mandíbula 10'», marcó la segunda, y el bucle de abajo se conformaba con la
     primera sesión hecha que encontrara. Diez minutos de estiramientos daban el
     día por bueno.
     Y contradecía la regla que el propio plan escribe: «un día cuenta como
     cumplido si se hizo la sesión que tocaba, o la de la talla S» — la que
     tocaba, no el complemento. Las de la talla S son fuerza, bici y caminata:
     ésas son las que cuentan, más correr y remo si aparecieran.
     La movilidad se sigue viendo y se sigue marcando: lo único que no puede es
     decidir el día. */
  function cuentaParaElDia(sesion) {
    return familia(sesion && sesion.t) !== "movilidad";
  }

  /* Un descanso que ha mandado el semáforo ES cumplir: el día que la app te dice
     «hoy no» y le haces caso, has hecho lo que tocaba. Lo contrario enseña a
     desobedecer al semáforo para no romper la racha, que es justo lo que no
     puede pasar. */
  function descansoAceptado(iso) {
    var aj = ajusteDe(iso);
    return !!(aj && aj.descanso);
  }

  /* ---------- EL SEMÁFORO ----------
     Devuelve { id, nombre, dice, ofrece, nota, razones } o null.
     Null mientras no esté calibrado, y entonces la ficha sigue diciendo
     «Sin calibrar»: es lo correcto, porque los umbrales se fijan el 15-oct con
     tres semanas sin corticoide y sacarlos antes sería calibrarlo sobre un
     cuerpo que no es el suyo del resto del año. */
  function razonesSemaforo(iso) {
    var ayer = U.sumarDias(iso, -1), antes = U.sumarDias(iso, -2);
    var ctl = valorDia("ctl", ayer), atl = valorDia("atl", ayer);
    var n1 = valorDia("sueno_min", iso), n2 = valorDia("sueno_min", ayer);
    var noches = [];
    if (n1 != null) noches.push(n1);
    if (n2 != null) noches.push(n2);
    /* EL MISMO SIGNO QUE EL RESTO DE LA APP: forma menos fatiga. Positivo =
       descansado. La tarjeta «Forma y fatiga» de Mi Estado ya lo calcula así y
       el plan dice «se sale con Balance positivo», así que ponerlo al revés aquí
       —como lo tuve un rato— dejaba el mismo número significando lo contrario en
       dos sitios de la misma pantalla. */
    return {
      balance: (ctl == null || atl == null) ? null : Math.round(ctl - atl),
      noches: noches.length ? (noches.reduce(function (a, b) { return a + b; }, 0) /
                               noches.length / 60) : null,
      _antes: antes
    };
  }

  /* el porqué, en dos cifras. Si falta un dato se pinta «—» y no se inventa. */
  function htmlRazones(r) {
    var defs = (P.semaforo && P.semaforo.razones) || [];
    if (!defs.length) return "";
    var h = '<div class="sem-razon">';
    defs.forEach(function (d) {
      var v = r[d.id], txt;
      if (v == null) txt = "—";
      else if (d.id === "noches") txt = v.toFixed(1).replace(".", ",") + " h";
      else txt = (v > 0 ? "+" : "") + v;   // el signo se ve: +8 y −8 no son lo mismo
      h += '<div title="' + U.esc(d.ayuda || "") + '">' +
           '<span class="q">' + U.esc(d.et) + "</span>" +
           '<span class="n">' + U.esc(txt) + "</span></div>";
    });
    return h + "</div>";
  }

  /* LA SESIÓN QUE EL SEMÁFORO REBAJA: la primera que cuenta para el día. La
     movilidad no se toca —no es lo que cansa— y así el índice que se guarda
     apunta siempre a la sesión de verdad. */
  /* SIN el ajuste puesto, siempre: si se tomara la sesión ya rebajada como base,
     al repintar se calcularía «el 60 % del 60 %» y el botón dejaría de reconocer
     su propia alternativa como la que está puesta. */
  function sesionPrincipal(iso, sem, talla) {
    var ses = sesionesDe(iso, sem, talla, true);
    for (var i = 0; i < ses.length; i++) if (cuentaParaElDia(ses[i])) return { i: i, s: ses[i] };
    return null;
  }

  function textoAlternativa(base, o) {
    if (o.descanso) return { t: "Descanso, lo manda el semáforo", min: 0, descanso: true };
    if (o.cambia) return { t: o.cambia, min: o.min || Math.round((base.min || 0) * (o.factor || 1)) };
    var m = Math.round((base.min || 0) * (o.factor || 1));
    return { t: base.t + (o.detalle ? " · " + o.detalle : ""), min: m };
  }

  function htmlOfrece(iso, sem, est) {
    var pr = sesionPrincipal(iso, sem, tallaDe(sem));
    if (!pr) return "";
    var aj = ajusteDe(iso);
    var h = '<div class="sem-ofrece"><span class="et2">' +
      (est.id === "azul" ? "Si te apetece" : "En vez de " + U.esc(pr.s.t.toLowerCase())) + "</span>";
    (est.ofrece || []).forEach(function (o, k) {
      /* Una alternativa puede no venir a cuento: «cambiar la bici por una
         caminata» en un día de caminar sobra. Se dice en los datos con `soloSi`
         y no se adivina aquí — probé a descartarlas comparando familias y me
         llevé por delante el «paseo de 20-30 minutos» de los días rojos, que sí
         es una rebaja buena aunque también sea caminar. */
      if (o.soloSi && familia(pr.s.t) !== o.soloSi) return;
      var alt = textoAlternativa(pr.s, o);
      var puesta = !!(aj && aj.t === alt.t);
      h += '<button type="button" class="' + (puesta ? "puesta" : "") +
        '" data-sem-alt="' + iso + "|" + pr.i + "|" + k + '">' +
        "<b>" + U.esc(o.t) + "</b>" +
        (alt.min ? "<small>" + alt.min + " min" + (puesta ? " · puesto" : "") + "</small>"
                 : (puesta ? "<small>puesto</small>" : "")) +
        "</button>";
    });
    if (est.nota) h += '<p class="nota">' + U.esc(est.nota) + "</p>";
    if (aj) h += '<button type="button" class="deshacer" data-sem-deshacer="' + iso +
                 '">Deshacer y volver a la sesión de siempre</button>';
    return h + "</div>";
  }

  function estadoSemaforo(iso) {
    var cfg = P.semaforo || {};
    if (!cfg.activo || !cfg.umbrales) return null;      // sin calibrar: no opina
    var r = razonesSemaforo(iso);
    if (r.balance == null) return null;                 // sin datos no se inventa
    /* Los umbrales se leen de PEOR A MEJOR y se para en el primero que cabe.
       Como el balance es forma menos fatiga, lo malo es lo NEGATIVO: el primero
       de la lista es el rojo, con el `hasta` más bajo, y el último lleva
       `hasta: null` y recoge todo lo que quede por arriba. Quien los rellene en
       la calibración que respete ese orden. */
    var id = null, u = cfg.umbrales;
    for (var i = 0; i < u.length; i++) {
      if (u[i].hasta == null || r.balance <= u[i].hasta) { id = u[i].estado; break; }
    }
    if (!id) return null;
    /* el sueño solo puede EMPEORARLO, nunca mejorarlo: dos noches cortas no
       autorizan nada, y dos buenas no compensan venir cargado de fatiga. */
    if (r.noches != null && cfg.sueno_corto && r.noches < cfg.sueno_corto) {
      if (id === "verde") id = "ambar"; else if (id === "ambar") id = "rojo";
    }
    var e = (cfg.estados || {})[id];
    if (!e) return null;
    return { id: id, nombre: e.nombre, dice: e.dice, ofrece: e.ofrece || [],
             nota: e.nota || "", razones: r };
  }

  function diaCumplido(iso, sem, talla) {
    if (noHabilDe(iso)) return true;               // día no hábil: ES descanso (Carlos, 24-sep)
    if (descansoAceptado(iso)) return true;        // el semáforo mandó parar y se paró
    var ses = sesionesDe(iso, sem, talla);
    if (!ses.length) return true;                 // descanso: el día cuenta
    /* Se mira el índice ORIGINAL, no el de la lista filtrada: las marcas se
       guardan como "s0", "s1"… por posición en el día, y renumerarlas leería
       la casilla equivocada. */
    var hayDeLasQueCuentan = false;
    for (var i = 0; i < ses.length; i++) {
      if (!cuentaParaElDia(ses[i])) continue;
      hayDeLasQueCuentan = true;
      if (sesionHecha(iso, ses[i], i)) return true;
    }
    /* Un día que solo tuviera movilidad no puede quedar imposible de cumplir:
       ahí vale cualquiera de las que haya. Hoy no existe ningún día así, pero
       el día que alguien lo escriba, esto no se rompe. */
    if (!hayDeLasQueCuentan) {
      for (var j = 0; j < ses.length; j++) if (sesionHecha(iso, ses[j], j)) return true;
    }
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

  /* EL VALOR DE UNA MEDIDA EN UN DÍA CONCRETO, o en los tres días de alrededor.
     Hace falta para leer el gemelo contra el tobillo: las dos se anotan el mismo
     día pero no siempre «el mismo día» es literal. Sin margen, la lectura se
     quedaría muda por un día de diferencia. (24-sep-2026.) */
  function valorMedidaEn(id, iso, margen) {
    var m = ent().medidas, d = (margen === undefined) ? 3 : margen, i;
    for (i = 0; i <= d; i++) {
      var caras = i === 0 ? [iso] : [U.sumarDias(iso, -i), U.sumarDias(iso, i)];
      for (var k = 0; k < caras.length; k++) {
        var fila = m[caras[k]];
        if (fila && fila[id] !== undefined && fila[id] !== "") {
          var v = parseFloat(fila[id]);
          if (!isNaN(v)) return v;
        }
      }
    }
    return null;
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
    gemelo: {
      titulo: "Cómo medir el gemelo",
      dibujo: "",
      pasos: [
        "De pie, peso repartido en las dos piernas y el músculo <b>relajado</b>. De puntillas no: así mides otro músculo.",
        "Por la <b>parte más ancha</b> de la pantorrilla. Búscala con la cinta y apunta a cuántos centímetros del suelo está.",
        "Marca ese punto con boli la primera vez: 2 cm arriba o abajo cambian más el número que un mes de bici.",
        "Cinta horizontal y apoyada, sin apretar.",
        "Siempre la MISMA pierna, la del tobillo, y por la mañana.",
        "Mide el <b>tobillo el mismo día</b>: sin él, este número no dice si has ganado músculo o estás reteniendo."
      ],
      fallos: "Medir con el músculo en tensión, cambiar de altura cada mes, o leerlo solo. " +
        "El gemelo se hincha con la retención de líquidos igual que el tobillo: sube el gemelo y el tobillo quieto, es entrenamiento; suben los dos, es líquido."
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
    /* Sin esto el vídeo se queda sonando detrás de la ventana cerrada: quitar
       la clase lo esconde, pero el iframe sigue vivo. */
    var caja = document.getElementById("modal-caja");
    if (caja && caja.querySelector && caja.querySelector("iframe")) caja.innerHTML = "";
  }

  /* ==================== EVOLUCIÓN ====================
     Las series largas. Regla que manda: no se dibuja lo que no existe. Si faltan
     datos se dice qué falta y cuándo habrá, nunca se pinta una línea inventada. */

  var rangoEvo = "6m";
  /* «1 mes» se añadió el 22-sep-2026 con la VFC de franja: es la vista de
     cuatro semanas del reloj, que es la que Carlos tiene en el ojo, y la única
     en la que la línea de cada noche se lee de verdad. */
  var RANGOS = [{ id: "1m", n: "1 mes", c: "1m", d: 31 },
                { id: "3m", n: "3 meses", c: "3m", d: 92 }, { id: "6m", n: "6 meses", c: "6m", d: 183 },
                { id: "1a", n: "1 año", c: "1a", d: 365 }, { id: "todo", n: "Todo", c: "Todo", d: 0 }];
  /* Los tramos de las ventanas emergentes: los mismos menos «Todo» (ver
     abrirHistoria). salud.json trae 400 días, así que «1 año» siempre cabe
     sin tener que traer el histórico. */
  var RANGOS_HIST = RANGOS.filter(function (r) { return r.d > 0; });

  /* ==================== ¿QUÉ HA CAMBIADO? ====================
     Los ficheros de datos son gordos —el de actividades, 702 KB— y casi nunca
     cambian, así que el móvil se guardaba una copia y no volvía a pedirla en 24
     horas. El problema es lo que pasa cuando SÍ cambian: se publica un fichero
     nuevo y el teléfono sigue enseñando el viejo hasta el día siguiente. Ha
     pasado tres veces, y cada vez hubo que cambiar el nombre de la caja a mano.

     Ahora se pregunta primero. GitHub dice, en UNA petición de unos pocos KB,
     la lista de la carpeta `datos/` con la huella de cada fichero. Se comparan
     las huellas con las de las copias guardadas y sólo se baja lo que sea
     distinto. Se publica, se abre la app, se ve — sin caducidad y sin tocar
     nada. Si la pregunta falla (sin conexión), se vuelve a la regla de las 24
     horas, que es lo que había. */
  var Firmas = {
    CARPETA: "datos",
    huellas: null,
    estado: "nada",
    esperando: [],

    listo: function () { return this.estado === "ok" || this.estado === "error"; },

    avisa: function () {
      var ll = this.esperando, i;
      this.esperando = [];
      for (i = 0; i < ll.length; i++) { try { ll[i](); } catch (e) {} }
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.listo()) { if (alTerminar) alTerminar(); return; }
      if (alTerminar) this.esperando.push(alTerminar);
      if (this.estado === "pidiendo") return;
      if (!Salud.configurado()) { this.estado = "error"; this.avisa(); return; }
      this.estado = "pidiendo";
      var c = Salud.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.CARPETA + "?ref=" + encodeURIComponent(c.rama || "main");
      fetch(url, { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (lista) {
          var m = {}, i;
          for (i = 0; i < (lista || []).length; i++) {
            if (lista[i] && lista[i].path && lista[i].sha) m[lista[i].path] = lista[i].sha;
          }
          self.huellas = m; self.estado = "ok"; self.avisa();
        })
        .catch(function () { self.estado = "error"; self.avisa(); });
    },

    de: function (ruta) { return this.huellas ? (this.huellas[ruta] || null) : null; },

    /* ¿sirve la copia guardada? Sí, si su huella es la que hay publicada. Si no
       se pudo preguntar, la regla vieja: vale mientras no pasen las horas. */
    vale: function (guardada, ruta, traidoEl, horas) {
      var viva = this.de(ruta);
      if (viva) return guardada === viva;
      return !!(traidoEl && (Date.now() - traidoEl) < (horas || 24) * 3600000);
    },

    /* los trazos son dos ficheros: basta con que cambie uno para volver a pedir */
    dosValen: function (g1, g2, r1, r2, traidoEl, horas) {
      var v1 = this.de(r1), v2 = this.de(r2);
      if (v1 || v2) return (!v1 || g1 === v1) && (!v2 || g2 === v2);
      return !!(traidoEl && (Date.now() - traidoEl) < (horas || 24) * 3600000);
    }
  };

  /* El histórico vive en otro fichero del mismo repositorio y son 230 KB:
     solo se pide cuando hace falta, es decir, al elegir «Todo». */
  var Historico = {
    /* Caduca a las 24 horas, como el índice de rutas: la copia guardada se usa
       para pintar al instante y, si es de ayer, se pide otra vez por detrás.
       Antes se guardaba para siempre y cada corrección del fichero obligaba a
       subir el número de la clave, tocar index.html y tocar sw.js, y a
       acordarse de hacerlo. Se olvidó una vez, y 2022, 2023 y 2024 no salían.
       v4: el fichero pasó a venir por columnas y ahora empieza en diciembre de
       2019 en vez de abril de 2021. */
    CLAVE: "khb-salud-hist-v4",
    RUTA: "datos/salud-historico.json",
    FRESCO_H: 24,
    datos: null,
    traidoEl: null,
    estado: "nada",

    /* Se guarda el fichero tal como vino —por columnas— y se arma al leerlo:
       ocupa menos de la mitad en el móvil, que es de lo que se trataba. */
    arma: function (crudo) {
      return { meta: crudo.meta || {}, dias: diasDeColumnas(crudo),
               actividades: crudo.actividades || [], tension: crudo.tension || [] };
    },

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || (!j.crudo && !j.datos)) return false;
        this.datos = j.crudo ? this.arma(j.crudo) : j.datos;
        this.traidoEl = j.traidoEl; this.estado = "ok";
        return Firmas.vale(j.sha, this.RUTA, j.traidoEl, this.FRESCO_H);
      } catch (e) { return false; }
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando") { if (alTerminar) alTerminar(); return; }
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(alTerminar); }); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }   // fresco: no se pide
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.RUTA + "?ref=" + encodeURIComponent(c.rama || "main");
      fetch(url, { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          var crudo = JSON.parse(Salud.deB64(j.content));
          self.datos = self.arma(crudo);
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            localStorage.setItem(self.CLAVE,
              JSON.stringify({ sha: Firmas.de(self.RUTA), traidoEl: self.traidoEl, crudo: crudo }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        .catch(function () {
          self.estado = self.datos ? "ok" : "error";     // con la copia vieja se sigue
          if (alTerminar) alTerminar();
        });
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
    /* v3 y no v1: el puente se ha rehecho desde el maestro —969 salidas en vez
       de 877, con su id, su deporte y 27 campos— y viene por columnas. Con la
       misma clave, el móvil seguiría usando la copia vieja de ocho campos, que
       es justo la que no deja emparejar los trazos. */
    CLAVE: "khb-archivo-actividad-v3",
    RUTA: "datos/historico-actividad.json",
    /* ANTES ESTO SE GUARDABA PARA SIEMPRE. Valía cuando el fichero era el
       inventario del Excel y esos años estaban cerrados. Ya no: sale del
       maestro y cambia cada vez que se arregla algo del archivo. Sin caducidad,
       lo que se corrija aquí no se vería nunca en el teléfono. */
    FRESCO_H: 24,
    traidoEl: null,
    datos: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || !j.datos) return false;
        this.datos = j.datos; this.traidoEl = j.traidoEl; this.estado = "ok";
        return Firmas.vale(j.sha, this.RUTA, j.traidoEl, this.FRESCO_H);
      } catch (e) { return false; }
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando") { if (alTerminar) alTerminar(); return; }
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(alTerminar); }); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.RUTA + "?ref=" + encodeURIComponent(c.rama || "main");
      fetch(url, { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          var crudo = JSON.parse(Salud.deB64(j.content));
          /* El puente nuevo viene por columnas y se arma aquí, igual que el
             resto: al módulo se le pasa una LISTA de actividades. Si lo que
             llega es el fichero viejo {anios:…}, se pasa tal cual y el módulo
             lo entiende igual. */
          self.datos = crudo && crudo.cols ? actsDeColumnas(crudo) : crudo;
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            localStorage.setItem(self.CLAVE,
              JSON.stringify({ sha: Firmas.de(self.RUTA), datos: self.datos, traidoEl: self.traidoEl }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        .catch(function () { self.estado = "error"; if (alTerminar) alTerminar(); });
    }
  };

  /* Los ficheros de datos vienen POR COLUMNAS: una lista por medida en vez de
     un objeto por día. El nombre de cada dato se repetía 2.481 veces —una por
     día— y así desaparece: las 46 medidas caben en menos de la mitad de lo que
     ocupaban 11 del otro modo.
     Se vuelven a armar aquí, nada más leerlos, para que ni las gráficas ni la
     ficha se enteren del cambio. En el móvil se guarda la forma corta, que es
     de lo que se trataba. */
  function filasDeColumnas(cols, n) {
    var out = [], k, i, col;
    for (i = 0; i < n; i++) out.push({});
    for (k in cols) {
      col = cols[k];
      if (!col) continue;
      for (i = 0; i < n && i < col.length; i++) {
        if (col[i] !== null && col[i] !== undefined) out[i][k] = col[i];
      }
    }
    return out;
  }

  /* {f:[fechas], cols:{...}} → {"2019-12-03": {...}, …} */
  function diasDeColumnas(j) {
    if (!j || !j.cols || !j.f) return (j && j.dias) || {};   // formato viejo
    var filas = filasDeColumnas(j.cols, j.f.length), d = {}, i;
    for (i = 0; i < j.f.length; i++) d[j.f[i]] = filas[i];
    return d;
  }

  /* {cols:{...}} → [ {...}, … ] */
  function actsDeColumnas(j) {
    if (!j) return [];
    if (j.actividades && j.actividades.length) return j.actividades;   // formato viejo
    if (!j.cols) return [];
    var n = 0, k;
    for (k in j.cols) { if (j.cols[k] && j.cols[k].length > n) n = j.cols[k].length; }
    return filasDeColumnas(j.cols, n);
  }

  /* Las actividades de 2021 a 2025 con todos sus campos.
     Vivían dentro de salud-historico.json, pero al darles los datos de la
     ficha (potencia, zonas de pulso, alturas, el tiempo que hacía) pasaron a
     ser el 84% de aquel fichero, y la app se lo traía entero sólo para pintar
     el peso. Ahora van aparte y sólo se piden al entrar en Actividad.
     Si no está publicado todavía, no pasa nada: se queda en «no-hay» y las
     actividades salen de donde salían antes. */
  var ActHistorico = {
    CLAVE: "khb-act-hist-v1",
    RUTA: "datos/actividades-historico.json",
    FRESCO_H: 24,
    datos: null,
    traidoEl: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || (!j.crudo && !j.datos)) return false;
        this.datos = j.crudo ? actsDeColumnas(j.crudo) : j.datos;
        this.traidoEl = j.traidoEl; this.estado = "ok";
        return Firmas.vale(j.sha, this.RUTA, j.traidoEl, this.FRESCO_H);
      } catch (e) { return false; }
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando" || this.estado === "no-hay") {
        if (alTerminar) alTerminar(); return;
      }
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(alTerminar); }); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.RUTA + "?ref=" + encodeURIComponent(c.rama || "main");
      fetch(url, { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) {
          if (r.status === 404) { self.estado = "no-hay"; throw "404"; }   // aún no publicado
          if (!r.ok) throw 0;
          return r.json();
        })
        .then(function (j) {
          var d = JSON.parse(Salud.deB64(j.content));
          self.datos = actsDeColumnas(d);
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            /* se guarda el fichero tal cual vino, por columnas: es la mitad de
               grande que la lista ya armada, y el móvil no va sobrado */
            localStorage.setItem(self.CLAVE,
              JSON.stringify({ sha: Firmas.de(self.RUTA), traidoEl: self.traidoEl, crudo: d }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        .catch(function () {
          if (self.estado !== "no-hay") self.estado = self.datos ? "ok" : "error";
          if (alTerminar) alTerminar();
        });
    }
  };

  /* Los trazos rescatados de Strava, para las salidas que no tienen ruta
     archivada en la colección. Fichero aparte y opcional: si no está, no pasa
     nada — esas fichas salen con su icono y la leyenda «pendiente de trazo».
     No va dentro de salud.json a propósito, que ése se carga entero al abrir
     la app y esto sólo hace falta al entrar en Actividad. */
  var Trazos = {
    /* v4: la misma caja de 24 horas, otra vez. El fichero del archivo creció
       de 163 a 238 KB al añadirle los perfiles de altura de 2013 a 2021, pero
       el teléfono ya tenía guardada la copia de antes y no la volvió a pedir:
       el mapa salía —lo pone la colección— y el perfil no, porque esas salidas
       ni siquiera estaban en la copia vieja. Cambiar el nombre de la caja es
       lo único que obliga a traerlo de nuevo. */
    CLAVE: "khb-trazos-strava-v4",
    RUTA: "datos/trazos.json",
    /* Los años que no están en intervals —de 2013 a octubre de 2021— tienen su
       propio fichero: 434 trazas con su perfil de altura, sacadas del FIT
       original de la exportación de Garmin. No cambia nunca, porque el
       workflow no puede tocarlo: esas salidas no existen en intervals. */
    RUTA_ARCHIVO: "datos/trazos-historico.json",
    /* Antes esto se guardaba y no se volvía a pedir NUNCA: valía cuando el
       fichero estaba hecho y quieto. Ahora el workflow le añade trazos y
       perfiles de altura cada día, así que la copia del móvil caduca como las
       demás. Sin esto, lo que se rellene no se vería en el teléfono. */
    FRESCO_H: 24,
    datos: null,
    traidoEl: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || !j.datos) return false;
        this.datos = j.datos; this.traidoEl = j.traidoEl; this.estado = "ok";
        return Firmas.dosValen(j.sha, j.shaA, this.RUTA, this.RUTA_ARCHIVO, j.traidoEl, this.FRESCO_H);
      } catch (e) { return false; }
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando" || this.estado === "no-hay") {
        if (alTerminar) alTerminar(); return;
      }
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(alTerminar); }); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }   // fresco: no se pide
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      /* Los dos ficheros se piden a la vez y se juntan en uno solo: al módulo
         le da igual de dónde salió cada traza. Si falta uno, se sigue con el
         otro — el del archivo puede no estar publicado todavía. */
      function trae(ruta) {
        var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
          encodeURIComponent(c.repo) + "/contents/" + ruta + "?ref=" + encodeURIComponent(c.rama || "main");
        return fetch(url, { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
          .then(function (r) { if (!r.ok) throw 0; return r.json(); })
          .then(function (j) { return JSON.parse(Salud.deB64(j.content)); })
          .catch(function () { return null; });
      }
      Promise.all([trae(this.RUTA), trae(this.RUTA_ARCHIVO)])
        .then(function (dd) {
          var junto = null, k, i, d;
          for (i = 0; i < dd.length; i++) {
            d = dd[i];
            if (!d) continue;
            d = d.trazos || d;
            junto = junto || {};
            for (k in d) junto[k] = d[k];
          }
          if (!junto) { self.estado = "no-hay"; if (alTerminar) alTerminar(); return; }
          self.datos = { trazos: junto };
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            localStorage.setItem(self.CLAVE,
              JSON.stringify({ sha: Firmas.de(self.RUTA), shaA: Firmas.de(self.RUTA_ARCHIVO), datos: self.datos, traidoEl: self.traidoEl }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        /* Que no exista ninguno de los dos: se marca y no se vuelve a pedir. */
        .catch(function () { self.estado = "no-hay"; if (alTerminar) alTerminar(); });
    }
  };

  /* Las series de cada sesión de pesas. Es lo único que intervals no guarda:
     sale del fichero original del reloj y lo rellena el paso del FIT. Fichero
     aparte y opcional, como los trazos: sólo hace falta al entrar en Actividad,
     y si no está, la ficha sale como antes. */
  /* LA CURVA DE POTENCIA. Cuatro números por actividad —el mejor esfuerzo
     sostenido de 5 s, 1 min, 5 min y 20 min— que escribe el workflow leyendo
     el fichero original. Fichero aparte y opcional, como los trazos y las
     pesas: sólo hace falta en Actividad, y si no está, todo sale como antes. */
  var Curva = {
    CLAVE: "khb-curva-v1",
    RUTA: "datos/curva.json",
    FRESCO_H: 24,
    datos: null,
    traidoEl: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || !j.datos) return false;
        this.datos = j.datos; this.traidoEl = j.traidoEl; this.estado = "ok";
        return Firmas.vale(j.sha, this.RUTA, j.traidoEl, this.FRESCO_H);
      } catch (e) { return false; }
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando" || this.estado === "no-hay") {
        if (alTerminar) alTerminar(); return;
      }
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(alTerminar); }); return; }
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
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            localStorage.setItem(self.CLAVE,
              JSON.stringify({ sha: Firmas.de(self.RUTA), datos: self.datos, traidoEl: self.traidoEl }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        /* El workflow la va llenando a lo largo de varias pasadas: que no esté
           todavía es lo normal el primer día. */
        .catch(function () { self.estado = "no-hay"; if (alTerminar) alTerminar(); });
    }
  };

  var Fuerza = {
    /* v2 y no v1 a propósito: la app ya se guardó el fichero que escribió el
       FIT, con los nombres adivinados y fecha de hoy, así que con la misma
       clave no lo volvería a pedir hasta pasadas 24 h. Cambiar el nombre de la
       caja obliga a traer el bueno la primera vez que se abre. */
    CLAVE: "khb-fuerza-v2",
    RUTA: "datos/fuerza.json",
    FRESCO_H: 24,
    datos: null,
    /* la misma vuelta al repositorio trae dos cosas: los nombres y la lista de
       qué sesiones de rodillo fueron Zwift, para el icono de la ficha */
    zwift: null,
    traidoEl: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || !j.datos) return false;
        this.datos = j.datos; this.zwift = j.zwift || null;
        this.traidoEl = j.traidoEl; this.estado = "ok";
        return Firmas.vale(j.sha, this.RUTA, j.traidoEl, this.FRESCO_H);
      } catch (e) { return false; }
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando" || this.estado === "no-hay") {
        if (alTerminar) alTerminar(); return;
      }
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(alTerminar); }); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }   // fresco: no se pide
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.RUTA + "?ref=" + encodeURIComponent(c.rama || "main");
      fetch(url, { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          self.datos = JSON.parse(Salud.deB64(j.content));
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            localStorage.setItem(self.CLAVE,
              JSON.stringify({ sha: Firmas.de(self.RUTA), datos: self.datos, traidoEl: self.traidoEl }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        /* Que no exista todavía es normal: se marca y no se vuelve a pedir. */
        .catch(function () { self.estado = "no-hay"; if (alTerminar) alTerminar(); });
    }
  };

  /* ==================== EL NOMBRE BUENO ====================
     Intervals es el PUENTE por donde entra lo que graba el reloj; el nombre lo
     ponemos nosotros. El reloj llama «Benasque Navegar» a lo que es el Forau
     d'Aigualluts, y eso no se arregla en intervals: se arregla aquí, en la
     propia ficha, y se guarda en `datos/nombres.json`.
     Ese fichero manda sobre el nombre del reloj en los tres sitios donde hace
     falta: esta app, el workflow (que lo aplica en cada pasada, así intervals
     no lo vuelve a pisar) y el maestro, que cubre los años de antes de 2021.
     De ahí saldrá también para App Mapas, el Excel y el catálogo de Mis Rutas:
     un nombre, un solo sitio. */
  /* ==================== CASOS ====================

     La cuarta pata. Aquí NO se calcula nada: los informes están escritos en
     PDF y esto es el mueble donde viven. Dos ficheros, los dos en el
     repositorio PRIVADO y por el mismo motivo —hablan de su covid, su gripe A
     y su oído, y eso no entra en un repositorio público—:

       `datos/casos.json`  el catálogo: una ficha por documento.
       `documentos/*.pdf`  los folios, que se bajan con su clave al pulsar.

     Los PDF no se guardan en la caché del navegador a propósito: son 4 MB y
     se abren de uno en uno. Lo que sí se guarda es el que ya se abrió en esta
     sesión, para que volver a él sea instantáneo. */
  var Casos = {
    CLAVE: "khb-casos-v1",
    RUTA: "datos/casos.json",
    CARPETA: "documentos/",
    FRESCO_H: 24,
    datos: null,
    traidoEl: null,
    estado: "nada",
    abiertos: {},          // fichero -> URL de blob, sólo mientras dure la pestaña

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || !j.datos) return false;
        this.datos = j.datos; this.traidoEl = j.traidoEl; this.estado = "ok";
        return Firmas.vale(j.sha, this.RUTA, j.traidoEl, this.FRESCO_H);
      } catch (e) { return false; }
    },

    url: function (ruta) {
      var c = Salud.cfg();
      return "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + ruta;
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando") { if (alTerminar) alTerminar(); return; }
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(alTerminar); }); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      fetch(this.url(this.RUTA) + "?ref=" + encodeURIComponent(c.rama || "main"),
            { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          self.datos = JSON.parse(Salud.deB64(j.content));
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            localStorage.setItem(self.CLAVE, JSON.stringify(
              { sha: Firmas.de(self.RUTA), traidoEl: self.traidoEl, datos: self.datos }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        /* Que todavía no esté subido es lo normal el primer día: se dice, y
           no se vuelve a pedir hasta que se recargue la pestaña. */
        .catch(function () { self.estado = "no-hay"; if (alTerminar) alTerminar(); });
    },

    lista: function () {
      return (this.datos && this.datos.documentos) || [];
    },

    /* ABRIR UN FOLIO.

       La pestaña del navegador se abre AQUÍ, en el mismo instante del clic, y
       todavía vacía: si se esperase a tener el PDF, el navegador tomaría la
       apertura por espontánea y la bloquearía. Mientras llega, esa pestaña
       enseña una línea. Si aun así viene bloqueada, el folio se descarga, que
       es la otra forma de tenerlo. */
    abrir: function (fichero, listo) {
      var self = this, c = Salud.cfg();
      listo = listo || function () {};
      if (!Salud.configurado()) { listo(false, "falta la configuración"); return; }

      var ventana = null;
      try {
        ventana = window.open("", "_blank");
        if (ventana && ventana.document) {
          ventana.document.write('<!doctype html><meta charset="utf-8">' +
            "<title>" + String(fichero).replace(/[<>]/g, "") + "</title>" +
            '<body style="font:16px system-ui;padding:24px;color:#33414f">Trayendo el folio…');
          ventana.document.close();
        }
      } catch (e) { ventana = null; }

      function enseña(u) {
        if (ventana) { try { ventana.location.href = u; listo(true); return; } catch (e) {} }
        var a = document.createElement("a");
        a.href = u; a.download = fichero;
        document.body.appendChild(a); a.click(); a.remove();
        listo(true, "descargado");
      }

      if (this.abiertos[fichero]) { enseña(this.abiertos[fichero]); return; }

      /* `application/vnd.github.raw` devuelve el fichero tal cual. El otro
         formato lo trae en base64 y se planta en 1 MB — el informe maestro
         pesa 1,7 MB y no cabría. */
      fetch(this.url(this.CARPETA + encodeURIComponent(fichero)) +
              "?ref=" + encodeURIComponent(c.rama || "main"),
            { headers: { "Authorization": "Bearer " + c.token,
                         "Accept": "application/vnd.github.raw" } })
        .then(function (r) {
          if (r.status === 404) throw new Error("ese folio todavía no está subido al repositorio");
          if (!r.ok) throw new Error("GitHub dice que no (" + r.status + ")");
          return r.blob();
        })
        .then(function (b) {
          var u = URL.createObjectURL(new Blob([b], { type: "application/pdf" }));
          self.abiertos[fichero] = u;
          enseña(u);
        })
        .catch(function (e) {
          if (ventana) { try { ventana.close(); } catch (x) {} }
          listo(false, (e && e.message) || "no he podido traerlo");
        });
    }
  };

  var Nombres = {
    CLAVE: "khb-nombres-v1",
    RUTA: "datos/nombres.json",
    FRESCO_H: 24,
    datos: null,
    traidoEl: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || !j.datos) return false;
        this.datos = j.datos; this.traidoEl = j.traidoEl; this.estado = "ok";
        return Firmas.vale(j.sha, this.RUTA, j.traidoEl, this.FRESCO_H);
      } catch (e) { return false; }
    },

    url: function () {
      var c = Salud.cfg();
      return "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.RUTA;
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando") { if (alTerminar) alTerminar(); return; }
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(alTerminar); }); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      fetch(this.url() + "?ref=" + encodeURIComponent(c.rama || "main"),
            { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          var d = JSON.parse(Salud.deB64(j.content));
          self.datos = d.nombres || d || {};
          self.zwift = (d && d.zwift && d.zwift.length) ? d.zwift : null;
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            localStorage.setItem(self.CLAVE, JSON.stringify(
              { sha: Firmas.de(self.RUTA), traidoEl: self.traidoEl,
                datos: self.datos, zwift: self.zwift }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        /* que no exista todavía es normal: se trabaja sin él y se crea al
           guardar el primero */
        .catch(function () {
          if (!self.datos) self.datos = {};
          self.estado = "ok"; if (alTerminar) alTerminar();
        });
    },

    /* pone el nombre bueno donde lo haya, sobre la lista que se le pase */
    aplicar: function (lista) {
      var d = this.datos, i, n;
      if (!d || !lista) return lista;
      for (i = 0; i < lista.length; i++) {
        n = d[String(lista[i] && lista[i].id)];
        if (n) lista[i].nombre = n;
      }
      return lista;
    },

    /* GUARDAR. Se vuelve a pedir el fichero justo antes de escribir para llevar
       su `sha`: GitHub no deja escribir sobre una versión que ya no existe.
       Y si aun así choca —porque el workflow o tú mismo lo tocasteis en ese
       segundo—, NO se le echa el muerto a Carlos: se vuelve a leer y se
       reintenta solo, hasta tres veces. El nombre que escribió no se pierde. */
    guardar: function (id, nombre, listo, intento) {
      var self = this, c = Salud.cfg();
      listo = listo || function () {};
      intento = intento || 1;
      if (!Salud.configurado()) { listo(false, "falta la configuración"); return; }
      var cab = { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" };
      /* sin caché: una respuesta guardada traería un `sha` viejo y el choque
         estaría garantizado */
      fetch(this.url() + "?ref=" + encodeURIComponent(c.rama || "main") + "&t=" + Date.now(),
            { headers: cab, cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          var doc = { nombres: {} }, sha = j && j.sha;
          if (j && j.content) {
            try { doc = JSON.parse(Salud.deB64(j.content)) || {}; } catch (e) { doc = {}; }
          }
          if (!doc.nombres) doc.nombres = {};
          doc.nombres[String(id)] = nombre;
          doc.meta = doc.meta || {};
          doc.meta.generado = new Date().toISOString().slice(0, 10);
          var txt = JSON.stringify(doc, null, 1);
          var by = new TextEncoder().encode(txt), bin = "", i;
          for (i = 0; i < by.length; i++) bin += String.fromCharCode(by[i]);
          var cuerpo = { message: "Nombre: " + nombre, content: btoa(bin),
                         branch: c.rama || "main" };
          if (sha) cuerpo.sha = sha;
          return fetch(self.url(), { method: "PUT", headers: cab, body: JSON.stringify(cuerpo) })
            .then(function (r) {
              if (r.ok) {
                self.datos = self.datos || {};
                self.datos[String(id)] = nombre;
                self.traidoEl = Date.now();
                try {
                  localStorage.setItem(self.CLAVE, JSON.stringify(
                    { sha: null, traidoEl: self.traidoEl,
                      datos: self.datos, zwift: self.zwift }));
                } catch (e) {}
                listo(true);
                return;
              }
              /* 409 y 422 son «tu copia es vieja»: se reintenta con la nueva */
              if ((r.status === 409 || r.status === 422) && intento < 3) {
                setTimeout(function () { self.guardar(id, nombre, listo, intento + 1); }, 400);
                return;
              }
              throw new Error(r.status === 403 ? "la clave no puede escribir en el repositorio"
                                               : "GitHub dice que no (" + r.status + ")");
            });
        })
        .catch(function (e) { listo(false, (e && e.message) || "no he podido guardarlo"); });
    }
  };

  /* EL BOTÓN DE BORRAR.

     Escribe en dos sitios del repositorio privado, y cada uno hace una cosa:

       `datos/borradas.json` — la decisión permanente. Una actividad apuntada
         ahí no vuelve a entrar en KHB en Forma aunque intervals la siga
         teniendo. Sólo se escribe al borrar la ACTIVIDAD entera.
       `datos/quitar.json` — el encargo para el ordenador: qué ruta hay que
         sacar de Mis Rutas, del Excel y del mapa. Lo cumple «Rutas al día» y
         después se retira solo de la lista.

     La ruta viene ya resuelta desde la ficha, donde la viste antes de
     confirmar. Aquí no se adivina nada. */
  var Borrado = {

    url: function (ruta) {
      var c = Salud.cfg();
      return "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + ruta;
    },

    /* lee, cambia y escribe un fichero del repositorio, con reintento si
       alguien lo tocó en ese segundo */
    tocar: function (ruta, cambia, mensaje, listo, intento, compacto) {
      var self = this, c = Salud.cfg();
      intento = intento || 1;
      if (!Salud.configurado()) { listo(false, "falta la configuración"); return; }
      var cab = { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" };
      fetch(this.url(ruta) + "?ref=" + encodeURIComponent(c.rama || "main") + "&t=" + Date.now(),
            { headers: cab, cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          var doc = {}, sha = j && j.sha;
          if (j && j.content) {
            try { doc = JSON.parse(Salud.deB64(j.content)) || {}; } catch (e) { doc = {}; }
          }
          doc = cambia(doc);
          /* salud.json y el histórico se guardan COMPACTOS: con sangrado de 1
             el histórico pasa de 568 KB a más del doble, y es un fichero que el
             móvil se baja entero. Los ficheros pequeños siguen legibles. */
          var txt = compacto ? JSON.stringify(doc) : JSON.stringify(doc, null, 1);
          var by = new TextEncoder().encode(txt), bin = "", i;
          for (i = 0; i < by.length; i++) bin += String.fromCharCode(by[i]);
          var cuerpo = { message: mensaje, content: btoa(bin), branch: c.rama || "main" };
          if (sha) cuerpo.sha = sha;
          return fetch(self.url(ruta), { method: "PUT", headers: cab, body: JSON.stringify(cuerpo) })
            .then(function (r) {
              if (r.ok) { listo(true); return; }
              if ((r.status === 409 || r.status === 422) && intento < 3) {
                setTimeout(function () {
                  self.tocar(ruta, cambia, mensaje, listo, intento + 1, compacto);
                }, 400);
                return;
              }
              throw new Error(r.status === 403 ? "la clave no puede escribir en el repositorio"
                                               : "GitHub dice que no (" + r.status + ")");
            });
        })
        .catch(function (e) { listo(false, (e && e.message) || "no he podido guardarlo"); });
    },

    /* modo: "actividad" (se va del todo) o "ruta" (sólo el recorrido).
       `ruta` es el identificador de la ruta cuando la ficha ha podido verla
       en el índice del mapa; para las caminatas no sale ahí, y entonces van
       `datos` —fecha y kilómetros— y la busca el ordenador en el catálogo
       entero, que es la lista buena. */
    pedir: function (id, modo, ruta, datos, listo) {
      var self = this;
      listo = listo || function () {};
      var hoy = new Date().toISOString().slice(0, 19) + "Z";

      var apunta = function () {
        self.tocar("datos/quitar.json", function (doc) {
          doc.v = 1;
          doc.pedidos = doc.pedidos || [];
          var i, y = false;
          for (i = 0; i < doc.pedidos.length; i++) {
            if (String(doc.pedidos[i].id) === String(id)) {
              doc.pedidos[i].modo = modo; doc.pedidos[i].ruta = ruta || null;
              doc.pedidos[i].fecha = (datos && datos.fecha) || null;
              doc.pedidos[i].km = (datos && datos.km) || 0;
              doc.pedidos[i].nombre = (datos && datos.nombre) || null;
              doc.pedidos[i].pedido = hoy; y = true;
            }
          }
          if (!y) doc.pedidos.push({ id: String(id), modo: modo, ruta: ruta || null,
                                     fecha: (datos && datos.fecha) || null,
                                     km: (datos && datos.km) || 0,
                                     nombre: (datos && datos.nombre) || null,
                                     pedido: hoy });
          doc.meta = doc.meta || {};
          doc.meta.generado = hoy;
          return doc;
        }, "Quitar: " + id + " (" + modo + ")", listo);
      };

      /* si se va la actividad entera, primero la decisión permanente: si
         fallara lo segundo, al menos no vuelve a entrar */
      if (modo === "actividad") {
        this.tocar("datos/borradas.json", function (doc) {
          doc.ids = doc.ids || [];
          doc.claves = doc.claves || [];
          if (doc.ids.indexOf(String(id)) < 0) doc.ids.push(String(id));
          doc.meta = doc.meta || {};
          doc.meta.generado = hoy.slice(0, 10);
          return doc;
        }, "Borrada: " + id, function (bien, fallo) {
          if (!bien) { listo(false, fallo); return; }
          apunta();
        });
        return;
      }
      apunta();
    }
  };

  /* LAS RUTAS QUE ESPERAN A SER ARCHIVADAS.

     El workflow deja en `rutas-nuevas/` el GPX completo de cada salida que
     cumple el criterio y todavía no está en la colección, y apunta aquí la
     lista. Esto es lo que convierte el aviso en algo fiable: la app no
     adivina nada, lee lo que hay preparado.

     Se enseña SIEMPRE, aunque no haya ninguna esperando, con la fecha de la
     última comprobación. Un aviso que sólo aparece cuando hay trabajo no
     distingue «no hay nada» de «esto lleva tres semanas parado y no me he
     enterado», que es justo lo que no puede pasar. */
  var RutasNuevas = {
    CLAVE: "khb-rutas-nuevas-v1",
    RUTA: "datos/rutas-nuevas.json",
    FRESCO_H: 6,
    datos: null,
    traidoEl: null,
    estado: "nada",

    deCache: function () {
      try {
        var j = JSON.parse(localStorage.getItem(this.CLAVE));
        if (!j || !j.datos) return false;
        this.datos = j.datos; this.traidoEl = j.traidoEl; this.estado = "ok";
        return Firmas.vale(j.sha, this.RUTA, j.traidoEl, this.FRESCO_H);
      } catch (e) { return false; }
    },

    url: function () {
      var c = Salud.cfg();
      return "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
        encodeURIComponent(c.repo) + "/contents/" + this.RUTA;
    },

    cargar: function (alTerminar) {
      var self = this;
      if (this.estado === "cargando") { if (alTerminar) alTerminar(); return; }
      if (!Firmas.listo()) { Firmas.cargar(function () { self.cargar(alTerminar); }); return; }
      if (this.deCache()) { if (alTerminar) alTerminar(); return; }
      if (!Salud.configurado()) { this.estado = "sin-config"; if (alTerminar) alTerminar(); return; }
      this.estado = "cargando";
      var c = Salud.cfg();
      fetch(this.url() + "?ref=" + encodeURIComponent(c.rama || "main"),
            { headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          self.datos = JSON.parse(Salud.deB64(j.content)) || {};
          self.estado = "ok"; self.traidoEl = Date.now();
          try {
            localStorage.setItem(self.CLAVE, JSON.stringify(
              { sha: Firmas.de(self.RUTA), traidoEl: self.traidoEl, datos: self.datos }));
          } catch (e) {}
          if (alTerminar) alTerminar();
        })
        /* que no exista todavía es normal: quiere decir que el paso nuevo del
           workflow aún no ha corrido, no que algo vaya mal */
        .catch(function () { self.estado = "no-hay"; if (alTerminar) alTerminar(); });
    },

    lista: function () { return (this.datos && this.datos.rutas) || []; },

    /* cuántas horas hace de la última pasada del workflow */
    horas: function () {
      var g = this.datos && this.datos.meta && this.datos.meta.generado;
      if (!g) return null;
      var t = Date.parse(g.length <= 10 ? (g + "T12:00:00") : g);
      if (!t) return null;
      return (Date.now() - t) / 3600000;
    },

    cuando: function () {
      var h = this.horas();
      if (h === null) return "";
      if (h < 1.5) return "hace un rato";
      if (h < 24) return "hace " + Math.round(h) + " horas";
      var d = Math.round(h / 24);
      return d === 1 ? "ayer" : "hace " + d + " días";
    },

    /* El aviso, en una tarjeta propia encima del archivo. */
    html: function () {
      if (this.estado === "cargando" || this.estado === "nada") return "";
      if (this.estado === "no-hay") return "";
      var l = this.lista(), h = this.horas(), i, r, filas = [];
      var viejo = (h !== null && h > 36);
      if (!l.length) {
        return '<p class="ent-rn ent-rn-ok">Rutas al día: nada pendiente' +
          (h === null ? "" : ' \u00b7 comprobado ' + this.cuando()) +
          (viejo ? ' \u2014 <b>y eso es mucho tiempo: mira si el workflow sigue pasando</b>' : '') +
          "</p>";
      }
      for (i = 0; i < l.length && i < 6; i++) {
        r = l[i];
        filas.push('<li><b>' + U.esc(r.nom || "Ruta") + "</b> \u00b7 " +
          (r.f ? (r.f.slice(6, 8) + "/" + r.f.slice(4, 6) + "/" + r.f.slice(0, 4)) : "") +
          " \u00b7 " + (r.km || 0).toFixed(2) + " km</li>");
      }
      if (l.length > 6) filas.push("<li>\u2026 y " + (l.length - 6) + " m\u00e1s</li>");
      return '<div class="ent-rn ent-rn-hay">' +
        "<p><b>" + l.length + (l.length === 1 ? " ruta nueva" : " rutas nuevas") +
        "</b> con su GPX listo, esperando. Pasa <b>Rutas al d\u00eda</b> en el ordenador y " +
        "entran solas en Mis Rutas, en el Excel y en el mapa.</p>" +
        "<ul>" + filas.join("") + "</ul>" +
        (h === null ? "" : '<p class="nota-peque">Comprobado ' + this.cuando() + ".</p>") +
        "</div>";
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

  /* Las actividades vienen de tres sitios y pueden solaparse: la ventana
     reciente de salud.json, el fichero propio de 2021-2025 y —mientras dure el
     cambio— lo que aún quede dentro de salud-historico.json. Manda la primera
     que aparezca, que es la más reciente. */
  function actividadesJuntas() {
    var vistos = {}, out = [];
    [(Salud.datos && Salud.datos.actividades) || [],
     ActHistorico.datos || [],
     (Historico.datos && Historico.datos.actividades) || []].forEach(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var id = lista[i] && lista[i].id;
        if (id == null) { out.push(lista[i]); continue; }
        if (vistos[id]) continue;
        vistos[id] = 1; out.push(lista[i]);
      }
    });
    return out;
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
      RutasNuevas.html() +
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
        /* El mapa de adorno del mini mapa. HIKE (OpenHikingMap) porque es
           mundial —117 de las 703 rutas están fuera de España y el IGN se
           acaba en la frontera— y porque a este tamaño es el que cuenta algo:
           curvas de nivel y los nombres de los cerros. OSM estándar no sirve:
           su servidor devuelve 403 a las apps que no están en su lista.
           La atribución es obligatoria y va debajo del mapa. */
        capaMapa: {
          url: "https://tile.openmaps.fr/openhikingmap/{z}/{x}/{y}.png",
          maxZ: 17,
          atrib: '\u00a9 <a href="https://www.openstreetmap.org/copyright" ' +
                 'target="_blank" rel="noopener">OpenStreetMap</a> contributors \u00b7 ' +
                 'teselas de <a href="https://openmaps.fr/" target="_blank" ' +
                 'rel="noopener">openmaps.fr</a>'
        },
        /* Los iconos de la marca, los mismos que la portada de Entrenamiento.
           10-bici y 11-montana están en el repo pero no en la copia local de
           iconos/khb, así que ojo si algún día se sincroniza a la inversa. */
        iconos: {
          sen:  "iconos/khb/11-montana.webp",
          bici: "iconos/khb/10-bici.webp",
          /* el rodillo NO lleva la bici de calle: `null` pide el dibujo del
             módulo, que es la misma bici subida a su pie de apoyo */
          rod:  null,
          /* y si esa sesión de rodillo fue Zwift, su propio emblema. Quién lo
             fue no se adivina: viene en la lista `zwift` de nombres.json */
          zwift: "iconos/khb/12-zwift.webp",
          fue:  "iconos/khb/3-pesas-corredor.webp",
          and:  "iconos/khb/6-zapatillas.webp",
          pas:  "iconos/khb/6-zapatillas.webp",
          cor:  "iconos/khb/6-zapatillas.webp",
          otr:  "iconos/khb/9-podio.webp"
        },
        botonVolver: '<button type="button" class="ent-atras" data-volver="1">' +
          FLECHA + "Volver a Entrenamiento</button>",
        historico: Nombres.aplicar(Archivo.datos),
        trazos: Trazos.datos,
        zwift: Nombres.zwift,
        /* el nombre se cambia en la ficha y se guarda en datos/nombres.json */
        alRenombrar: function (id, nombre, listo) { Nombres.guardar(id, nombre, listo); },
        /* el botón de borrar de la ficha; la ruta llega ya resuelta desde allí */
        alBorrar: function (id, modo, ruta, datos, listo) {
          Borrado.pedir(id, modo, ruta, datos, listo);
        },
        fuerza: Fuerza.datos,
        curva: Curva.datos,
        /* LOS DÍAS, para las medidas que no salen de las actividades (los
           pasos, y mañana las calorías). Dos fuentes: la ventana reciente
           manda, el histórico rellena lo de atrás.

           El histórico NO se carga al entrar en la pata: son cientos de KB
           para una medida que a lo mejor nadie pulsa. Se pide sólo cuando el
           módulo lo necesita, y mientras llega lo dice en pantalla. */
        dias: (Salud.datos && Salud.datos.dias) || null,
        diasHist: (Historico.datos && Historico.datos.dias) || null,
        traerDias: function (listo) {
          Historico.cargar(function () {
            listo((Historico.datos && Historico.datos.dias) || {});
          });
        },
        actividades: Nombres.aplicar(actividadesJuntas()),
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
    RutasNuevas.cargar(repinta);
    Trazos.cargar(repinta);
    Nombres.cargar(repinta);
    Fuerza.cargar(repinta);
    Curva.cargar(repinta);
    ActHistorico.cargar(repinta);
    if (!Historico.datos) Historico.cargar(repinta);
  }

  function ventanaEvo() {
    var hasta = U.hoyISO(), r = null;
    for (var i = 0; i < RANGOS.length; i++) if (RANGOS[i].id === rangoEvo) r = RANGOS[i];
    return { desde: (r && r.d) ? U.sumarDias(hasta, -r.d) : EVO_PRIMER_DIA, hasta: hasta };
  }

  /* ==================== EL PERIODO, UNO POR TARJETA ====================
     Antes había UN selector arriba del todo y mandaba sobre las dieciséis
     gráficas: para mirar la forma a un año y la cintura a tres meses había que
     subir, cambiar, bajar, mirar y volver a subir. Ahora cada tarjeta guarda
     dos cosas —qué tramo enseña y CUÁNTOS tramos atrás está mirando— y las
     flechas corren esa ventana entera hacia atrás o hacia delante sin tocar
     las demás. Un año y la flecha izquierda es el año anterior completo.
     (Carlos, 24-sep-2026.) */
  var EVO_PRIMER_DIA = "2019-01-01";
  var vistaEvo = {};

  function vistaDe(id) {
    if (!vistaEvo[id]) vistaEvo[id] = { r: rangoEvo, des: 0 };
    return vistaEvo[id];
  }
  function rangoDe(id) {
    var vi = vistaDe(id);
    for (var i = 0; i < RANGOS.length; i++) if (RANGOS[i].id === vi.r) return RANGOS[i];
    return RANGOS[2];
  }
  /* cuántos saltos atrás caben antes de salirse de los datos: no se deja
     llegar a una ventana entera en blanco */
  function desTope(id) {
    var r = rangoDe(id);
    if (!r.d) return 0;
    return Math.max(0, Math.floor(diasEntre(EVO_PRIMER_DIA, U.hoyISO()) / r.d) - 1);
  }
  function ventanaDe(id) {
    var vi = vistaDe(id), r = rangoDe(id), hoy = U.hoyISO();
    if (!r.d) return { desde: EVO_PRIMER_DIA, hasta: hoy };
    var hasta = vi.des ? U.sumarDias(hoy, -r.d * vi.des) : hoy;
    return { desde: U.sumarDias(hasta, -r.d), hasta: hasta };
  }
  /* el histórico hace falta en cuanto alguien pide «Todo» o se va hacia atrás:
     salud.json sólo trae los últimos 400 días */
  function pideHistorico() {
    if (rangoEvo === "todo") return true;
    for (var k in vistaEvo) {
      if (!vistaEvo.hasOwnProperty(k)) continue;
      if (vistaEvo[k].des > 0 || vistaEvo[k].r === "todo") return true;
    }
    return false;
  }
  /* el mando de una tarjeta: flecha, tramos en corto, flecha */
  function mandoEvo(id) {
    var vi = vistaDe(id), r = rangoDe(id), tope = desTope(id);
    var h = '<div class="rangos-graf">';
    h += '<button type="button" class="evo-f" data-desp="' + id + ':1"' +
      (r.d && vi.des < tope ? "" : " disabled") +
      ' title="Tramo anterior" aria-label="Tramo anterior">\u2039</button>';
    RANGOS.forEach(function (x) {
      h += '<button type="button" class="evo-r' + (x.id === vi.r ? " activo" : "") +
        '" data-rango="' + id + ":" + x.id + '">' + U.esc(x.c || x.n) + "</button>";
    });
    h += '<button type="button" class="evo-f" data-desp="' + id + ':-1"' +
      (vi.des > 0 ? "" : " disabled") +
      ' title="Tramo siguiente" aria-label="Tramo siguiente">\u203a</button>';
    return h + "</div>";
  }
  /* CON EL AÑO, y no es un adorno: `U.etiquetaFecha` da «24 septiembre» sin
     año, así que un tramo de un año entero salía como «del 24 septiembre al
     24 septiembre» y no decía nada. (Carlos, 24-sep-2026, en su captura.) */
  function fechaConAno(iso) {
    return U.etiquetaFecha(iso) + " de " + U.desdeISO(iso).getFullYear();
  }
  /* sólo cuando se ha movido hacia atrás: dónde está y cómo volver */
  function tramoEvo(id) {
    var vi = vistaDe(id);
    if (!vi.des) return "";
    var v = ventanaDe(id);
    return '<p class="evo-tramo">Mirando del <b>' + U.esc(fechaConAno(v.desde)) +
      "</b> al <b>" + U.esc(fechaConAno(v.hasta)) + "</b>" +
      ' <button type="button" class="evo-hoy" data-desp="' + id + ':hoy">volver a hoy</button></p>';
  }

  /* serie de un campo de salud.json; el histórico se suma si está cargado */
  /* ==================== quién manda en cada campo ====================
     La regla general es que lo reciente pisa a lo histórico: `salud.json` trae
     lo de hoy y el histórico lo de atrás, y donde se solapan gana el reciente.

     PARA EL PULSO EN REPOSO ES AL REVÉS, y está medido. Comparando mes a mes
     las dos series en los 1.962 días que comparten:

       · de abr-2021 a oct-2022  las dos coinciden (±1 lpm)
       · de NOV-2022 a DIC-2023  intervals marca entre 4 y 10 lpm MÁS
       · de ene-2024 en adelante vuelven a coincidir (±0,5 lpm)

     Un bloque de catorce meses con principio y final no es ruido: es que
     durante esa temporada el número venía de otro sitio —Carlos recuerda una
     app de VFC que tomaba el pulso con la cámara del móvil—. Y encaja: la serie
     de VFC empieza en sep-2022, dos meses antes de que se abra la diferencia, y
     tiene un agujero en ene-feb 2024 (65 % y 69 % de cobertura) justo cuando se
     cierra, que es la pinta de un relevo.

     El árbitro de cuál es la buena ya se usó el 20-sep: el pulso mínimo, que
     viene crudo del reloj. Garmin cuadra todos los años; intervals se va seis
     latidos en 2023. Así que en `fcr` MANDA EL HISTÓRICO (Garmin) donde lo
     haya, e intervals sólo rellena de la exportación en adelante.

     Sólo `fcr`. `pt_sueno` y `sueno_min` también discrepaban, pero ahí no hay
     árbitro que diga cuál acierta, así que se quedan como estaban. */
  var MANDA_GARMIN = { fcr: 1 };

  /* ==================== la VFC de la app no cuenta ====================
     La serie de VFC empieza el 6-sep-2022, y hasta principios de 2024 no la
     medía el reloj: la tomaba una app con la cámara del móvil. No es la misma
     medida y no se pueden pegar una detrás de otra.

     No hace falta creerse la memoria de nadie, porque se ve en el dato. El
     salto típico de una noche a la siguiente, mes a mes:

       sep-2022 → ene-2024 ····· entre 8 y 29,5 ms
       feb-2024 → hoy ·········· entre 2 y 8, casi siempre 4-6

     Una lectura con la cámara cada mañana rebota veinte milisegundos; la media
     de toda la noche del reloj se mueve cinco. Son dos aparatos, no dos rachas.
     Y la frontera cuadra con la otra costura: el pulso en reposo de intervals
     iba 4-10 lpm por encima del de Garmin de nov-2022 a dic-2023, y vuelve a su
     sitio en enero de 2024.

     La fecha exacta del relevo se ve mirando los días, no los meses, y el mes
     engañaba: el corte está el 12 DE FEBRERO DE 2024.

       31-ene  82  (−24)   ┐
        1-feb 142  (+60)   │ todavía la app
        2-feb 117  (−25)   ┘
        3 al 11 de febrero: NUEVE DÍAS SIN UN SOLO DATO ← el relevo
       12-feb  74  (−43)   ┐
       13-feb  71   (−3)   │ ya el reloj: saltos de 1 a 8
       14-feb  63   (−8)   ┘  y ni un hueco más

     Poner el corte en el 1 de febrero, como se hizo primero, dejaba colarse dos
     lecturas de cámara de 142 y 117 ms justo al principio de la serie buena —y
     ahí, siendo las primeras, habrían mandado en la escala del dibujo.

     Así que la VFC anterior al 12-feb-2024 NO SE PINTA. Está en el fichero, pero
     la app no la enseña ni la promedia: un número que no significa lo mismo,
     puesto en la misma línea, es peor que no tener número.

     La media de 7 días arrastra una semana, así que esa empieza una semana más
     tarde: si no, las siete primeras vendrían con la app dentro. */
  var VFC_DESDE   = "2024-02-12";
  var DESDE_CUANDO = { vfc: VFC_DESDE, vfc7: "2024-02-19" };

  function serieSalud(campo, v) {
    var vistos = {}, out = [];
    var fuentes = MANDA_GARMIN[campo] ? [Salud.datos, Historico.datos]
                                      : [Historico.datos, Salud.datos];
    var corte = DESDE_CUANDO[campo] || null;
    fuentes.forEach(function (src) {
      if (!src || !src.dias) return;
      for (var f in src.dias) {
        if (f < v.desde || f > v.hasta) continue;
        if (corte && f < corte) continue;        // lo de la app, fuera
        var val = src.dias[f][campo];
        if (val === undefined || val === null || val === "") continue;
        vistos[f] = val;                         // gana la última fuente de la lista
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
    /* LA RAMPA ENTERA, NO SÓLO LAS SEMANAS ESCRITAS A MANO.
       Antes se recorría `P.rampa`, que llega a la semana 13 y se acaba el 21 de
       diciembre: el gráfico se paraba ahí aunque la rampa siga. Desde el 23 de
       septiembre `peldano()` calcula el crucero semana a semana —28 puntos por
       semana de construcción, descarga cada cuarta, techo 700— así que la rampa
       existe hasta julio de 2027 y el dibujo no la enseñaba.
       Ahora se recorren las RAMPA_SEMANAS que se proyectan, exactamente igual
       que hace `calendarioRampa()`. Y el día que se escriban más semanas a mano
       en plan.js, el gráfico las coge solo: `peldano()` da preferencia a lo
       escrito y sólo calcula a partir de donde se acaba.
       (Carlos, 24-sep-2026: «puede abarcar hasta junio este gráfico y luego se
       actualizará cuando añadamos más semanas?».) */
    var reales = [], objetivos = [], hoy = U.hoyISO();
    var f = P.rampa[0].desde, hasta;
    for (var i = 0; i < RAMPA_SEMANAS; i++) {
      var p = peldano(i);
      /* la semana 1 son diez días, no siete: arrancó un viernes */
      var dias = (i === 0) ? (diasEntre(P.rampa[0].desde, P.rampa[0].hasta) + 1) : 7;
      hasta = U.sumarDias(f, dias - 1);
      objetivos.push({ f: f, v: p.carga, n: p.n });
      if (f <= hoy) {
        var c = cargaSemana(f, hasta < hoy ? hasta : hoy);
        if (c !== null) reales.push({ f: f, v: c, n: p.n });
      }
      f = U.sumarDias(hasta, 1);
    }
    return { reales: reales, objetivos: objetivos,
             desde: P.rampa[0].desde, hasta: f };
  }

  /* ---------- el dibujo ----------
     SVG a mano, sin librerías: una rejilla, las bandas, las líneas y el último
     punto marcado. El viewBox escala solo al ancho del móvil. */
  /* ======================= LA VFC COMO LA ENSEÑA EL RELOJ =======================
     Pedido por Carlos el 22-sep-2026: «la VFC se podría representar así, con
     media y bandas; estoy acostumbrado a este formato».

     Son tres cosas encima del mismo dibujo:
       · la FRANJA gris — lo que es normal EN ÉL, no en la población;
       · un PUNTO por día con la media de 7 noches, coloreado según caiga dentro
         o fuera de la franja;
       · la LÍNEA DE GUIONES con la VFC de cada noche, que es el dato crudo del
         que sale todo lo demás.

     La franja no viene dada por ninguna fuente: se calcula aquí. Es el rango
     central —del percentil 25 al 75— de las últimas VFC_VENTANA noches. Con
     120 días sale lo mismo que enseña el reloj: comprobado contra su pantalla
     del 14-sep-2026, que decía media de 7 días 48 ms y referencia 50-62 ms;
     aquí salen 48,3 ms y 50-60. Con 60 o 90 días la franja queda un par de
     milisegundos más estrecha.

     El umbral del rojo también está medido contra esa misma pantalla: el reloj
     puso rojo el 16, 17 y 18 de septiembre —donde la media caía al 93 % y al
     92 % del suelo de la franja— y naranja el 13, 14 y 15, que se quedaban en
     el 95-97 %. El corte en 0,94 los separa a todos. */
  var VFC_VENTANA = 120;        // noches que miran atrás para decidir qué es normal en él
  var VFC_MINIMO = 40;          // por debajo de tantas noches no se pinta franja: mentiría
  var VFC_ROJO = 0.94;          // del suelo de la franja para abajo, ya no es «desequilibrada»
  var VFC_VERDE = "#4a9e5c", VFC_NARANJA = "#e08a2e", VFC_ROJO_C = "#c0392b";

  /* EL INTERRUPTOR DE LAS NOCHES (22-sep-2026, Carlos: «me falta la línea de
     medias nocturnas»). Y tenía razón, aunque estuviera escrita: se dibujaba
     sola sólo hasta los 100 días, y las dos gráficas ABREN más arriba —
     Evolución en 6 meses y la emergente en 1 año—, así que en la pantalla que
     se ve al entrar no salía nunca.
     Arreglarlo subiendo el límite habría sido peor: a un año son trescientas
     rayas y tapan la franja, que es lo que hay que mirar. Así que se hace como
     en el reloj: un botón que la enseña y la esconde, y que recuerda lo que
     elegiste. `null` significa «decide tú», que es lo de antes. */
  var VFC_NOCHES = null;          // null = automático · true = siempre · false = nunca

  function tocanNoches(dias) {
    if (VFC_NOCHES !== null) return VFC_NOCHES;
    return dias <= 100;
  }

  function botonNoches(dias) {
    var puesto = tocanNoches(dias);
    return '<button type="button" class="evo-r noches-vfc' + (puesto ? " activo" : "") +
      '" data-noches="1">' + (puesto ? "Ocultar" : "Ver") + " las medias nocturnas</button>";
  }

  function percentilOrd(v, p) {
    if (!v.length) return null;
    var idx = (v.length - 1) * p / 100, a = Math.floor(idx), b = Math.min(a + 1, v.length - 1);
    return v[a] + (v[b] - v[a]) * (idx - a);
  }

  /* Devuelve, por cada día del tramo pedido, la franja y la media de 7 noches
     ya clasificada. `diario` tiene que venir CON COLA: los VFC_VENTANA días
     anteriores al tramo, o los primeros meses saldrían sin franja. */
  /* La misma cuenta vale para cualquier medida que se lea «dentro o fuera de
     lo normal en mí»: la VFC y, desde el 22-sep-2026, la nota de sueño. Lo
     único que cambia es de dónde sale la media de 7 días —la VFC tiene la suya
     ya calculada en `vfc7` y la nota no— y hacia dónde es peor: en las dos
     bajar es peor, así que por ahora no hace falta más. */
  function vfcConFranja(diario, desde, hasta, campoMedia7) {
    var porFecha = {}, fechas = [];
    diario.forEach(function (p) {
      if (typeof p.v === "number" && p.v > 0) { porFecha[p.f] = p.v; fechas.push(p.f); }
    });
    if (!fechas.length) return null;

    var sup = [], inf = [], puntos = [], f = desde;
    var tope = hasta < fechas[fechas.length - 1] ? hasta : fechas[fechas.length - 1];
    var guardas = 0;
    while (f <= tope && guardas++ < 4000) {
      /* media de 7 noches: la de intervals cuando existe, y si no la de aquí.
         Se prefiere la suya para que dos sitios de la app no digan dos números
         distintos del mismo día. */
      var m7 = campoMedia7 === null ? null : valorDia(campoMedia7 || "vfc7", f);
      if (!(typeof m7 === "number" && m7 > 0)) {
        var v7 = [], i;
        for (i = 0; i < 7; i++) {
          var k = U.sumarDias(f, -i);
          if (porFecha[k] !== undefined) v7.push(porFecha[k]);
        }
        m7 = v7.length >= 4 ? v7.reduce(function (a, b) { return a + b; }, 0) / v7.length : null;
      }

      var ventana = [];
      for (var j = 1; j <= VFC_VENTANA; j++) {
        var k2 = U.sumarDias(f, -j);
        if (porFecha[k2] !== undefined) ventana.push(porFecha[k2]);
      }
      if (ventana.length >= VFC_MINIMO) {
        ventana.sort(function (a, b) { return a - b; });
        var lo = percentilOrd(ventana, 25), hi = percentilOrd(ventana, 75);
        inf.push({ f: f, v: lo });
        sup.push({ f: f, v: hi });
        if (m7 !== null) {
          var estado = m7 >= lo ? "verde" : (m7 >= lo * VFC_ROJO ? "naranja" : "rojo");
          puntos.push({ f: f, v: m7, e: estado });
        }
      } else if (m7 !== null) {
        puntos.push({ f: f, v: m7, e: "gris" });
      }
      f = U.sumarDias(f, 1);
    }
    if (!puntos.length) return null;
    return { sup: sup, inf: inf, puntos: puntos };
  }

  /* cuántos píxeles de ancho tiene de verdad el hueco donde va la gráfica:
     `main` topa en 1100 y se come 14 de padding por lado, y la tarjeta otros
     14; la caja de una emergente topa en 640 y se come 18 por lado. */
  function anchoCaja(tipo) {
    var w = (typeof window !== "undefined" && window.innerWidth) || 560;
    if (tipo === "modal") return Math.min(w, 640) - 36;
    return Math.min(w, 1100) - 56;
  }

  function grafica(o) {
    /* el margen derecho guarda sitio para los números de la escala: si no,
       el punto del último dato se les monta encima */
    /* EL LIENZO SE HACE A LA MEDIDA DE LA CAJA, y ésta es la razón.
       El SVG se estira hasta el ancho que le deje el CSS, y al estirarse
       arrastra TODO lo que lleva dentro, letra incluida. Mientras todas las
       gráficas midieron 520 px eso daba igual, porque todas se estiraban lo
       mismo; en cuanto una se llevó 760, su letra salió un 46 % más gorda que
       la del resto de la página. (Carlos, 24-sep-2026.)
       Así que el lienzo no es fijo: se calcula para que la proporción
       píxel/unidad sea siempre 1,625, el ancho que dé la caja. Una gráfica de
       toda la tarjeta y otra dentro de una emergente salen con la misma letra,
       y la letra es la misma que tenían las de 520 px de antes.
       Por debajo de 520 px de caja —el móvil— se deja el lienzo de siempre:
       ahí la letra ya se agrandaba con el estirón y está bien así. */
    var disp = o.ancho || anchoCaja(o.caja);
    var W = disp > 520 ? Math.round(disp / 1.625) : 320;
    var H = o.alto || 108;
    var L = 2, R = (o.escala === false ? 2 : 17), T = 10, B = 14;
    var series = (o.series || []).filter(function (s) { return s.pts && s.pts.length; });
    if (!series.length) return "";

    /* La escala se hace con los percentiles 2 y 98, no con el mínimo y el máximo:
       una noche suelta de 18,9 h aplastaba el resto de la gráfica contra el suelo. */
    var todos = [];
    series.forEach(function (s) { s.pts.forEach(function (p) { todos.push(p.v); }); });
    /* La franja cuenta para la escala: si no, la banda de referencia se salía
       por arriba y se veía cortada justo donde hay que mirar. */
    if (o.franja) {
      (o.franja.sup || []).forEach(function (p) { todos.push(p.v); });
      (o.franja.inf || []).forEach(function (p) { todos.push(p.v); });
    }
    todos.sort(function (a, b) { return a - b; });
    function pct(q) { return todos[Math.min(todos.length - 1, Math.max(0, Math.round((todos.length - 1) * q)))]; }
    var min = pct(0.02), max = pct(0.98);
    if (o.min !== undefined && o.min < min) min = o.min;
    if (o.max !== undefined && o.max > max) max = o.max;
    /* EL «+» DEL TOPE, DESPUÉS DE APLICAR `min` Y `max` Y SÓLO MIRANDO ARRIBA.
       Se calculaba antes, y además contaba también el recorte de abajo: en la
       carga semanal, con `min:0` puesto, no se recortaba nada y el eje ponía
       «700+» igual, diciendo que había barras más altas fuera del dibujo.
       No las había. El «+» sólo adorna el rótulo de arriba, así que sólo puede
       significar una cosa: que por arriba queda algo fuera. */
    var recortados = max < todos[todos.length - 1];
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
    /* Con la rampa entera el tramo va de septiembre de 2026 a julio de 2027:
       290 días, por debajo de los 300 que encendían el formato largo, así que
       el eje ponía «18 septiembre … 5 julio» sin decir de qué año era cada uno.
       Cambiar de año civil basta para que haga falta decirlo. */
    var cruzaAno = new Date(t0).getFullYear() !== new Date(t1).getFullYear();
    function rotuloFecha(f) {
      var d = U.desdeISO(f);
      if (diasEje > 300) return MES_CORTO[d.getMonth()] + " " + d.getFullYear();
      if (cruzaAno) return U.etiquetaFecha(f) + " " + d.getFullYear();
      return U.etiquetaFecha(f);
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

    /* `o.clase` deja agrandar UNA gráfica sin tocar las dieciséis: el ancho vive
       en el CSS de `.evo-svg`, que es común a todas. (Carlos, 24-sep-2026.) */
    var s = '<svg class="evo-svg" viewBox="0 0 ' + W + " " + H + '"' +
      ' data-esc="' + [t0, t1, min, max, W, H, L, R, T, B].join("|") + '"' +
      /* el globo dice el año cuando el tramo pasa de los diez meses: con la
         rampa llegando a julio de 2027, «5 octubre» a secas no dice cuál */
      ' data-ano="' + (diasEje > 300 || cruzaAno ? 1 : 0) + '"' +
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

    /* LA FRANJA DE REFERENCIA — el «valor normal en ti» pintado como zona y no
       como una raya. Es como lo enseña el reloj y como Carlos está acostumbrado
       a leerlo: no importa el número, importa si el punto cae dentro o fuera.
       Va la primera, debajo de todo, para que las líneas se vean encima. */
    if (o.franja && (o.franja.sup || []).length > 1) {
      var sup = o.franja.sup, inf = o.franja.inf || [];
      var arriba = sup.map(function (p) { return X(p.f).toFixed(1) + "," + Y(p.v).toFixed(1); });
      var abajo = inf.slice().reverse().map(function (p) { return X(p.f).toFixed(1) + "," + Y(p.v).toFixed(1); });
      s += '<polygon points="' + arriba.concat(abajo).join(" ") + '" fill="' +
           (o.franja.color || "#dfe4e2") + '" opacity="' + (o.franja.opacidad || 0.75) + '"/>';
    }

    (o.lineasH || []).forEach(function (l) {
      var y = Y(l.v).toFixed(1);
      s += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y +
        '" stroke="' + (l.color || "#cfd8d4") + '" stroke-width="1" stroke-dasharray="3 3"/>';
      /* a la izquierda: a la derecha están los números de la escala */
      if (l.etq) s += '<text x="' + (L + 2) + '" y="' + (Y(l.v) - 2).toFixed(1) +
        '" font-size="8" fill="#667a70">' + U.esc(l.etq) + "</text>";
    });

    /* ANCHO DE LAS BARRAS: UNO PARA TODAS LAS SERIES DEL MISMO DIBUJO.
       Antes cada serie calculaba el suyo con SUS puntos, así que en la carga
       semanal la serie del objetivo (catorce semanas) salía estrecha y la de
       lo hecho (una semana) cuatro veces más gorda: parecían dos cosas
       distintas cuando son la misma medida. El ancho se saca del hueco entre
       barras de la serie más poblada y lo usan todas. */
    var anBar = 0;
    (function () {
      var ref = null;
      series.forEach(function (x) { if (x.barras && (!ref || x.pts.length > ref.pts.length)) ref = x; });
      if (!ref) return;
      var sep = (W - L - R) / Math.max(8, ref.pts.length), i, huecos = [];
      for (i = 1; i < ref.pts.length; i++) huecos.push(X(ref.pts[i].f) - X(ref.pts[i - 1].f));
      if (huecos.length) {
        huecos.sort(function (a, b) { return a - b; });
        sep = huecos[Math.floor(huecos.length / 2)];          // la mediana, no la media
      }
      anBar = Math.max(3, Math.min(sep * 0.62, 26));
    })();

    series.forEach(function (se) {
      if (se.barras) {
        var an = anBar || Math.max(3, (W - L - R) / Math.max(8, se.pts.length * 2.2));
        se.pts.forEach(function (p) {
          var y = Y(p.v), y0 = Y(Math.max(min, 0));
          s += '<rect x="' + (X(p.f) - an / 2).toFixed(1) + '" y="' + Math.min(y, y0).toFixed(1) +
            '" width="' + an.toFixed(1) + '" height="' + Math.max(1, Math.abs(y0 - y)).toFixed(1) +
            '" fill="' + se.color + '" opacity="' + (se.opacidad || 1) + '"/>';
          /* Si detrás vienen más barras —lo hecho encima del objetivo— el techo
             de ésta se marca con una raya, o una semana que pase del objetivo
             lo taparía entero y se perdería justo la comparación. */
          if (se.techo) s += '<line x1="' + (X(p.f) - an / 2).toFixed(1) + '" y1="' + y.toFixed(1) +
            '" x2="' + (X(p.f) + an / 2).toFixed(1) + '" y2="' + y.toFixed(1) +
            '" stroke="' + se.techo + '" stroke-width="1.2" stroke-linecap="round"/>';
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
        /* `colorPunto`: la línea puede ir clarita y el punto del último dato
           fuerte. Hace falta desde que debajo de la gráfica hay una línea
           cruda y una media móvil encima: el número de «Último» que sale en la
           tabla es el del dato de verdad, no el de la media, así que el punto
           tiene que estar en la línea cruda — y en ella se vería lavado.
           (24-sep-2026.) */
        s += '<circle cx="' + X(u.f).toFixed(1) + '" cy="' + Y(u.v).toFixed(1) +
          '" r="2.4" fill="' + (se.colorPunto || se.color) + '" stroke="#fff" stroke-width="1"/>';
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
    /* `fechas:false` para las filas apiladas del panel de la noche: repetir
       «23 marzo … hoy» cinco veces era ruido, y el eje es el mismo en todas. */
    if (o.fechas !== false) {
      s += '<text x="' + L + '" y="' + (H - 3) + '" font-size="8" fill="#667a70">' +
        rotuloFecha(o.desde) + "</text>";
      s += '<text x="' + (W - 1) + '" y="' + (H - 3) + '" text-anchor="end" font-size="8" fill="#667a70">' +
        (o.hasta === U.hoyISO() ? "hoy" : rotuloFecha(o.hasta)) + "</text>";
    }
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
  /* SE CUENTAN BLOQUES, NO DÍAS  ·  24-sep-2026
     Hasta hoy esto contaba días: un día con rodillo y fuerza en el que solo se
     hacía la fuerza salía CUMPLIDO entero, y una semana de cinco rodillos repartida
     en tres días valía lo mismo que otra en seis. Desde que el plan va por bloques
     —el bolsillo— la unidad honrada es el bloque.
     Las semanas antiguas, las escritas a mano y las que no tienen bolsillo siguen
     contándose por días: ahí no hay bloques que contar y cambiarlo reescribiría el
     pasado. */
  function cumplimientoSemana(sem, hasta) {
    var b = bolsilloDe(sem), rep = b && b.length ? repartoDe(sem) : null;
    if (rep) return cumplimientoPorBloques(sem, hasta, b, rep);
    return cumplimientoPorDias(sem, hasta);
  }

  function cumplimientoPorBloques(sem, hasta, b, rep) {
    var talla = tallaDe(sem), previstos = 0, hechos = 0, fallos = {}, hoy = U.hoyISO();
    var porDia = {};
    b.forEach(function (x) {
      var d = rep[x.id];
      if (!d) return;                                  // en la bandeja: todavía sin colocar
      (porDia[d] = porDia[d] || []).push(x);
    });
    Object.keys(porDia).forEach(function (f) {
      if (f > hasta || f > sem.hasta || f < sem.desde) return;
      if (noHabilDe(f)) return;                        // día no hábil: es descanso, no se juzga
      if (descansoAceptado(f)) return;                 // el semáforo mandó parar
      var ses = sesionesDe(f, sem, talla);
      porDia[f].forEach(function (x) {
        if (!cuentaParaElDia(x)) return;
        var q = quitadoDe(sem, x.id);
        /* HOY NO SE JUZGA todavía: a media tarde queda tarde para hacerlo. Pero un
           bloque QUITADO con motivo sí cuenta ya, porque quitarlo es una decisión
           tomada, no una duda. Y cuenta como NO hecho: palabras suyas. */
        var i = -1;
        for (var k = 0; k < ses.length; k++) if (ses[k].bid === x.id) { i = k; break; }
        var hecho = (i >= 0) && sesionHecha(f, ses[i], i);
        if (f === hoy && !hecho && !q) return;
        previstos++;
        if (hecho && !q) hechos++;
        else fallos[f] = { f: f, m: motivosDe(f), nota: (obsDe(f) || {}).nota };
      });
    });
    var lista = Object.keys(fallos).sort().map(function (f) { return fallos[f]; });
    return { previstos: previstos, hechos: hechos, fallos: lista, porBloques: true };
  }

  function cumplimientoPorDias(sem, hasta) {
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
    /* `lesion` se cuenta aparte de `parar` aunque sea uno de los que paran:
       una pauta médica explica la enfermedad de esos días, pero no cura una
       rodilla. Sin este contador no se puede distinguir una cosa de la otra. */
    var r = { parar: 0, limitar: 0, vigilar: 0, agenda: 0, lesion: 0, dias: {} };
    for (var f = sem.desde; f <= sem.hasta && f <= hasta; f = U.sumarDias(f, 1)) {
      motivosDe(f).forEach(function (v) {
        var m = motivo(v);
        if (!m || !(m.efecto in r)) return;
        r[m.efecto]++;
        if (v === "lesion") r.lesion++;
        r.dias[f] = 1;
      });
    }
    return r;
  }

  /* media de un campo de salud.json en el tramo de la semana */
  /* El valor de un campo en UN día, con la regla de arriba. Se usa desde las
     tarjetas del día y desde las medias, para que la ficha no diga un número y
     la gráfica otro en la misma fecha. */
  function valorDia(campo, iso) {
    if (DESDE_CUANDO[campo] && iso < DESDE_CUANDO[campo]) return null;
    var pri = MANDA_GARMIN[campo] ? Historico.datos : Salud.datos;
    var seg = MANDA_GARMIN[campo] ? Salud.datos : Historico.datos;
    var v = pri && pri.dias && pri.dias[iso] ? pri.dias[iso][campo] : null;
    if (v === undefined || v === null || v === "") {
      v = seg && seg.dias && seg.dias[iso] ? seg.dias[iso][campo] : null;
    }
    return (v === undefined || v === "") ? null : v;
  }

  /* EL ÚLTIMO DATO QUE HAYA, NO EL DE HOY A SECAS  ·  24-sep-2026
     `salud.json` lo escribe el workflow por la noche, así que por la mañana el
     día de hoy todavía no existe y «Dónde estás hoy» salía con tres rayas —y
     la curva prevista arrancaba en un 10 inventado, que es peor: toda la
     proyección salía de un sitio donde no estás—. Ahora se retrocede hasta
     encontrar el último día con dato y se dice de cuándo es. */
  function ultimoDato(campo, tope) {
    var f = U.hoyISO(), max = tope || 10;
    for (var i = 0; i <= max; i++) {
      var v = valorDia(campo, f);
      if (v !== null && v !== undefined && v !== "") return { v: v, f: f, atras: i };
      f = U.sumarDias(f, -1);
    }
    return null;
  }

  function mediaSalud(campo, desde, hasta) {
    var s = 0, n = 0;
    if (!Salud.datos || !Salud.datos.dias) return null;
    for (var f = desde; f <= hasta; f = U.sumarDias(f, 1)) {
      var v = valorDia(campo, f);
      if (typeof v === "number") { s += v; n++; }
    }
    return n ? { m: s / n, n: n } : null;
  }

  /* ¿ESTA SEMANA CAE DENTRO DE UNA PAUTA MÉDICA YA PREVISTA?

     La regla normal —dos días de enfermedad y la semana va en blanco— existe
     para lo que llega sin avisar. Pero cuando hay un tratamiento en el plan,
     con sus fechas y sus sesiones rebajadas a mano, la carga de esos días YA
     está bajada a propósito: contar además la enfermedad es castigar dos veces
     lo mismo, y encima mueve la rampa un peldaño atrás.

     Pasó de verdad el 20-sep-2026: tres días marcados durante la pauta de
     prednisona, con las sesiones de esa semana ya puestas como «caminar suave»
     y «fuerza a media carga». El pase dictó semana en blanco.

     No se perdona la LESIÓN, que no la cura ningún calendario: sólo se
     perdona cuando lo marcado entra dentro de las fechas del tratamiento. */
  function tratamientoDe(sem, hasta) {
    var fin = (hasta && hasta < sem.hasta) ? hasta : sem.hasta;
    var t = P.tratamientos || [], i;
    for (i = 0; i < t.length; i++) {
      if (!t[i].desde) continue;
      /* basta con que se solapen: una pauta que empieza el jueves ya explica
         los días malos de ese jueves y ese viernes */
      if (t[i].desde <= fin && (!t[i].hasta || t[i].hasta >= sem.desde)) return t[i];
    }
    return null;
  }

  function enTratamiento(sem, hasta) { return !!tratamientoDe(sem, hasta); }

  function nombreTratamiento(sem, hasta) {
    var t = tratamientoDe(sem, hasta);
    return t ? (t.nombre || "un tratamiento") : "un tratamiento";
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
    } else if (sal.parar >= 2 && !(sal.lesion === 0 && enTratamiento(sem, hasta))) {
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
        ? "Has hecho " + cump.hechos + " de " + cump.previstos + " " +
          (cump.porBloques ? "bloques previstos." : "días previstos.")
        : "Carga al " + Math.round(pct * 100) + " % del objetivo.";
    } else {
      v = "repetir";
      porque = (porAsistencia
        ? (cump.porBloques ? "Bloques hechos: " : "Días movidos: ") +
          cump.hechos + " de " + cump.previstos + "."
        : "Carga al " + Math.round(pct * 100) + " % del objetivo.") +
        (sal.limitar ? " Y hubo " + sal.limitar + " día" + (sal.limitar > 1 ? "s" : "") + " con lesión limitante." : "");
    }
    /* Si la semana cae dentro de una pauta médica ya prevista, se dice: si no,
       el veredicto parecería que no ha visto los días marcados. */
    if (sal.parar >= 2 && sal.lesion === 0 && enTratamiento(sem, hasta)) {
      porque += " Hubo " + sal.parar + " días marcados, pero la semana está dentro de " +
        nombreTratamiento(sem, hasta) + ": el plan ya venía rebajado y no se cuenta dos veces.";
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

  /* UN DATO DEL PASE, EN FICHA. El cuarto argumento apaga la ficha, y ese
     argumento ya se le pasaba a la fila de antes —para los dias con
     corticoide— pero aquella solo aceptaba tres y lo tiraba: la VFC y el
     pulso de esos dias se veian como lecturas buenas. Aqui si se usa.
     La fila vieja (`filaPase`) se va: no le quedaba ni una llamada. */
  function datoPase(n, v, c, apagado) {
    return '<div class="pase-dato' + (apagado ? " flojo" : "") + '"><span>' + U.esc(n) + "</span>" +
      "<b>" + (v === null || v === undefined ? "\u2014" : v) + "</b>" +
      (c ? "<small>" + U.esc(c) + "</small>" : "") + "</div>";
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

    /* ---------- LOS TRES BLOQUES DE NÚMEROS, EN REJILLA ----------
       En escritorio iban uno debajo de otro: el pase medía 799 px de alto y
       dejaba cuatrocientos píxeles vacíos a los lados. En tres columnas baja a
       580 y cabe de una vez, con el veredicto y la semana que viene a la vista
       al mismo tiempo. En el móvil no cambia nada —la rejilla sólo se parte en
       tres a partir de 820 px de ancho—, y el texto corrido («Lo que falló»,
       «La semana que viene») sigue a todo el ancho, que es donde se lee.
       Cada dato va en ficha, con el rótulo arriba y la nota debajo: en una
       columna estrecha la nota larga cabe entera, y puesta en fila de tres
       trozos se partía en tres líneas. (Carlos, 24-sep-2026: «opción B».) */
    var bDias, bPeso, bRecu;

    /* 1. carga */
    if (!r.cerrada && !r.cump.previstos) {
      bDias = '<h3 class="evo-sub">Cumplimiento</h3><p class="nota-peque">Todavía nada que juzgar: ' +
        "lo de hoy no cuenta hasta que termine el día.</p>";
    } else if (r.porAsistencia) {
      /* DESDE EL 24-SEP-2026 SE CUENTAN BLOQUES, NO DÍAS, en las semanas que tienen
         bolsillo. El rótulo lo dice para que el número no se lea mal: un día con
         rodillo y fuerza son DOS bloques, y antes contaba como uno solo. */
      bDias = '<h3 class="evo-sub">' + (r.cump.porBloques ? "Cumplimiento" : "Días movidos") + "</h3>" +
        barraPase(r.pct === null ? 0 : r.pct) +
        datoPase(r.cump.porBloques ? "Bloques hechos" : "Días con sesión hecha",
          r.cump.hechos + " de " + r.cump.previstos +
          (r.pct === null ? "" : " \u00b7 " + Math.round(r.pct * 100) + " %"), "") +
        datoPase("Carga registrada", r.carga === null ? null : r.carga,
          "esta semana no se juzga por carga: es la de arranque, a pie");
    } else {
      bDias = '<h3 class="evo-sub">Carga</h3>' + barraPase(r.pct === null ? 0 : r.pct) +
        datoPase("Carga de la semana", r.carga === null ? null : r.carga, "objetivo " + sem.carga) +
        datoPase("Cumplimiento", r.pct === null ? null : Math.round(r.pct * 100) + " %",
          r.pctAnt === null ? "" : "la anterior, " + Math.round(r.pctAnt * 100) + " %") +
        datoPase("Días con sesión hecha", r.cump.hechos + " de " + r.cump.previstos, "");
    }

    /* 2. peso */
    var a7 = mediaPesos(hasta, 7), b7 = mediaPesos(U.sumarDias(sem.desde, -1), 7);
    bPeso = '<h3 class="evo-sub">Peso</h3>';
    if (a7 && a7.n >= 2) {
      var dif = b7 && b7.n >= 2 ? a7.m - b7.m : null;
      var obj = cfg.pesoObjetivo;
      bPeso += datoPase("Media de 7 días", num(a7.m) + " kg", a7.n + (a7.n === 1 ? " pesada" : " pesadas")) +
        datoPase("Contra los 7 anteriores", dif === null ? null : signo(dif) + " kg",
          dif === null ? "hacen falta dos semanas" :
            (dif <= obj[0] ? "más rápido que el objetivo"
              : dif <= obj[1] ? "en el ritmo del plan"
                : dif <= 0 ? "más lento que el objetivo" : "hacia arriba"));
    } else {
      bPeso += '<p class="nota-peque">Con ' + (a7 ? a7.n : 0) + " pesadas no se puede hacer media. Con dos ya sale.</p>";
    }

    /* 3. recuperación */
    var vf = mediaSalud("vfc", sem.desde, hasta), fc = mediaSalud("fcr", sem.desde, hasta);
    var su = mediaSalud("sueno_min", sem.desde, hasta);
    var par = (Salud.datos && Salud.datos.meta && Salud.datos.meta.parametros) || {};
    var farm = Salud.conFarmaco(hasta);
    bRecu = '<h3 class="evo-sub">Recuperación</h3>' +
      datoPase("VFC media", vf ? num(vf.m) + " ms" : null,
        farm ? "con corticoide: sin lectura" : (par.base_vfc ? "tu base " + num(par.base_vfc) : ""), farm) +
      datoPase("FC en reposo media", fc ? Math.round(fc.m) + " lpm" : null,
        farm ? "con corticoide: sin lectura" : (par.base_fcr ? "tu base " + num(par.base_fcr) : ""), farm) +
      datoPase("Sueño medio", su ? hhmm(Math.round(su.m)) : null, "tu media 6h24");

    h += '<div class="pase-rejilla"><div class="pase-bloque">' + bDias +
      '</div><div class="pase-bloque">' + bPeso +
      '</div><div class="pase-bloque">' + bRecu + "</div></div>";

    /* 4. lo que falló, y por qué — a todo el ancho, debajo de la rejilla */
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

  /* ==================== HASTA DÓNDE LLEGA CADA MEDIDA ====================

     Dos fuentes con dos ritmos distintos, y hasta hoy no se veía cuál era
     cuál. La mayoría de las series llegan solas cada día por intervals. Pero
     el PULSO MÍNIMO del día sólo viene con la exportación de Garmin, que se
     pide a mano: entre exportación y exportación esa línea se queda quieta, y
     quien mire la gráfica sin saberlo pensará que no ha pasado nada.

     Y hay una razón más para pedirla cada dos meses, que no es sólo rellenar
     huecos: la exportación es la fuente BUENA del pulso en reposo. Intervals
     se desvió seis latidos durante todo 2023 sin avisar, y sólo se vio al
     comparar las dos. */
  var CADA_DIAS_GARMIN = 60;
  var ENLACE_GARMIN = "https://www.garmin.com/account/datamanagement/";

  var MEDIDAS_FUENTE = [
    { c: "peso",       n: "Peso",                de: "bascula" },
    { c: "grasa",      n: "Grasa",               de: "bascula" },
    { c: "magra",      n: "Masa magra",          de: "bascula" },
    { c: "vfc",        n: "VFC",                 de: "intervals" },
    { c: "fcr",        n: "Pulso en reposo",     de: "intervals" },
    { c: "pulso_min",  n: "Pulso mínimo del día", de: "garmin" },
    { c: "sueno_min",  n: "Sueño",               de: "intervals" },
    /* Los dos que se estrenan hoy. Sólo llegan con la exportación, así que si no
       salen en esta tabla nadie se entera de que se están quedando viejos. */
    { c: "body_battery_min", n: "Body Battery",   de: "garmin" },
    { c: "estres",     n: "Estrés",              de: "garmin" },
    { c: "pasos",      n: "Pasos",               de: "intervals" },
    { c: "ctl",        n: "Forma y fatiga",      de: "intervals" },
    { c: "vo2max",     n: "VO2 máx",             de: "intervals" },
    /* No es un campo de los días: son las sesiones de sala con sus ejercicios,
       y llegan por el mismo camino que el pulso mínimo. Se mira aparte. */
    { c: "__fuerza",   n: "Kilos en la sala",    de: "garmin" }
  ];

  /* El último día con valor de un campo, mirando las dos fuentes. */
  function ultimoConDato(campo) {
    var ult = null;
    /* los kilos no viven en los días sino en las sesiones de fuerza */
    if (campo === "__fuerza") {
      var ses = (Fuerza.datos && Fuerza.datos.sesiones) || null;
      if (!ses) return null;
      var acts = actividadesJuntas(), i, f;
      for (i = 0; i < acts.length; i++) {
        if (!acts[i] || !acts[i].id || !ses[acts[i].id]) continue;
        f = String(acts[i].fecha || "").slice(0, 10);
        if (f && (!ult || f > ult)) ult = f;
      }
      return ult;
    }
    [Historico.datos, Salud.datos].forEach(function (src) {
      if (!src || !src.dias) return;
      for (var f in src.dias) {
        if (!src.dias.hasOwnProperty(f)) continue;
        var val = src.dias[f][campo];
        if (val == null || val === "") continue;
        if (!ult || f > ult) ult = f;
      }
    });
    return ult;
  }

  /* Los kilos son el caso raro de la tabla: que la última sesión sea de hace
     cuatro meses NO quiere decir que falten datos — quiere decir que hace
     cuatro meses que no pisa la sala. Lo que sí sería un hueco es que la
     última sesión de sala del archivo no tenga sus ejercicios. Eso es lo que
     se mira, y no el calendario. */
  function fuerzaAlDia() {
    var ses = (Fuerza.datos && Fuerza.datos.sesiones) || null;
    if (!ses) return true;
    var acts = actividadesJuntas(), ultima = null, i, a, f;
    for (i = 0; i < acts.length; i++) {
      a = acts[i];
      if (!a || a.dep !== "fue" || !a.id) continue;
      f = String(a.fecha || "").slice(0, 10);
      if (f && (!ultima || f > ultima.f)) ultima = { f: f, id: a.id };
    }
    if (!ultima) return true;
    return !!ses[ultima.id];
  }

  function diasDesde(f) {
    if (!f) return null;
    return diasEntre(f, U.hoyISO());
  }

  /* El aviso que va debajo de una gráfica que depende de la exportación. */
  function avisoFrescura(campo) {
    var ult = ultimoConDato(campo), d = diasDesde(ult);
    if (!ult) return "";
    var tarde = d != null && d > CADA_DIAS_GARMIN;
    return '<p class="nota-peque' + (tarde ? " evo-toca" : "") + '" style="margin:4px 0 0">' +
      "Este dato no llega por intervals: sólo viene con la exportación de Garmin. " +
      "La línea acaba el <b>" + U.esc(U.etiquetaFecha(ult)) + "</b>" +
      (d != null ? " (hace " + d + " día" + (d === 1 ? "" : "s") + ")" : "") + "." +
      (tarde ? ' <b>Toca pedirla otra vez.</b> <a href="' + ENLACE_GARMIN +
               '" target="_blank" rel="noopener">Exportar mis datos de Garmin</a>' : "") +
      "</p>";
  }

  /* El panel de abajo: todas las medidas, hasta dónde llegan y de dónde vienen. */
  /* NO HAY BOTÓN DE IMPORTAR DESDE LA APP, y es a propósito.
     El 21-sep se montó uno que leía un `garmin-dias.json` y lo fundía aquí. Se
     quitó el mismo día: `maestro2.py` ya hace esa importación, la hace mejor
     —los metros subidos y los minutos de intensidad salían mal en la versión
     rápida— y usa otros nombres de columna (`vo2max_bici`, `body_battery_min`,
     `spo2`). Dos importadores con dos vocabularios habrían dejado el histórico
     con columnas duplicadas y nadie sabría cuál mirar.
     La exportación de Garmin se procesa fuera, con `maestro2.py`. */

  /* ==================== las siete que sobran ====================
     En alguna fusión antigua se colaron SIETE registros de origen Garmin en un
     archivo de 2.082. Los siete repiten salidas que ya estaban ese mismo día, y
     los siete traen las calorías infladas: mediana de 3.033 kcal/h contra las
     562 de los registros de intervals. El peor, el del 25-jul-2023: 17.598 kcal
     en 510 minutos son 2.070 kcal/h, que no las quema nadie.

     Que son duplicados se comprueba sumando: ese día los dos registros buenos
     dan 139,87 km, 1.865 m y 514 min; el que sobra dice 140,52 km, 1.800 m y
     510 min. Es el día entero grabado otra vez.

     Esto NO es un detector general de calorías imposibles. Se probó y también
     señalaba una sesión corta y legítima. Es una lista de siete, comprobada una
     por una, y el bloque DESAPARECE SOLO cuando ya no queda ninguna: si un día
     abres esto y no ves nada, es que está hecho. */
  var SOBRAN = [
    { id: "g8428499209",  f: "2022-03-09", n: "Zwift - Midweek Spring Racing",    kcal: 3448 },
    { id: "g8478193643",  f: "2022-03-18", n: "Zwift - Tour of Watopia Stage 3",  kcal: 4722 },
    { id: "g8807598979",  f: "2022-05-12", n: "Madrid Incidencia detectada",      kcal: 838 },
    { id: "g13832121515", f: "2022-05-24", n: "Ciclismo en sala",                 kcal: 3352 },
    { id: "g13832121612", f: "2022-05-24", n: "Ciclismo en sala",                 kcal: 3775 },
    { id: "g11642521142", f: "2023-07-25", n: "La Pedriza por caminos de Tierra", kcal: 17598 },
    { id: "g18650706166", f: "2025-03-27", n: "Ciclismo en sala",                 kcal: 117 }
  ];

  /* EL ARCHIVO VIEJO NO ESTÁ CARGADO EN EVOLUCIÓN, y las siete viven ahí.
     `actividades-historico.json` y `salud-historico.json` se piden sólo al
     abrir la pestaña Actividad o al elegir el rango «Todo»: son cientos de KB y
     no se bajan por si acaso. Así que este panel los pide él, una vez, y se
     repinta cuando llegan. Sin esto el bloque no aparecía nunca —y tampoco las
     filas de las medidas que sólo trae la exportación de Garmin, que era el
     mismo agujero. */
  var pedidoArchivo = false;
  function pedirArchivoViejo() {
    if (pedidoArchivo) return;
    if (ActHistorico.datos && Historico.datos) return;
    pedidoArchivo = true;
    /* CONSERVANDO EL SITIO (23-sep-2026, Carlos: «entro en el plan, voy
       bajando buscando un punto y la pantalla vuelve al principio»).
       No era el guardado en GitHub: eran estas dos descargas. Son ficheros
       gordos y, cuando llegan, repintan la vista entera; con el árbol nuevo el
       navegador manda el scroll arriba. En el ordenador llegan antes de que dé
       tiempo a bajar, y en el móvil llegan justo mientras busca.
       `pintarConservando` ya existía para esto —se usa al anotar una medida— y
       guarda la posición de la ventana y la de cualquier contenedor con
       scroll. */
    var repinta = function () { pintarConservando(); };
    if (!ActHistorico.datos) ActHistorico.cargar(repinta);
    if (!Historico.datos) Historico.cargar(repinta);
  }

  /* BORRAR NO ES INMEDIATO, Y EL BOTÓN TIENE QUE SABERLO.
     El botón de borrar de cualquier ficha no quita la actividad: la apunta en
     `borradas.json` y en `quitar.json`, y quien la saca de verdad del archivo
     es «Rutas al día» cuando pasa. Por eso el 21-sep, tras pulsar «Quitar las
     7», las siete seguían ahí al volver a abrir: el trabajo estaba hecho y este
     bloque no se había enterado.

     Así que las pedidas se apuntan en este aparato y dejan de contar. Cuando
     pase «Rutas al día» desaparecen del archivo y esto se apaga solo. */
  var PEDIDAS = "khb-sobran-pedidas-v1";

  function yaPedidas() {
    try { return JSON.parse(localStorage.getItem(PEDIDAS)) || []; }
    catch (e) { return []; }
  }

  function apuntarPedida(id) {
    var l = yaPedidas();
    if (l.indexOf(String(id)) < 0) l.push(String(id));
    try { localStorage.setItem(PEDIDAS, JSON.stringify(l)); } catch (e) {}
  }

  /* Las que siguen vivas en el archivo Y no se han pedido ya. */
  function sobranVivas() {
    var hay = {}, vivas = [], pedidas = yaPedidas();
    actividadesJuntas().forEach(function (a) { if (a && a.id != null) hay[String(a.id)] = a; });
    SOBRAN.forEach(function (s) {
      if (hay[s.id] && pedidas.indexOf(s.id) < 0) vivas.push({ s: s, a: hay[s.id] });
    });
    return vivas;
  }

  /* Pedidas pero todavía en el archivo: hay que decirlo, o parece que no pasó nada. */
  function sobranEsperando() {
    var hay = {}, n = 0, pedidas = yaPedidas();
    actividadesJuntas().forEach(function (a) { if (a && a.id != null) hay[String(a.id)] = 1; });
    SOBRAN.forEach(function (s) { if (hay[s.id] && pedidas.indexOf(s.id) >= 0) n++; });
    return n;
  }

  var Limpieza = {
    yendo: false,

    html: function () {
      var v = sobranVivas();
      if (!v.length) {
        var esperando = sobranEsperando();
        if (!esperando) return "";
        return '<div class="limpieza">' +
          "<p><b>" + esperando + (esperando === 1 ? " actividad repetida apuntada"
                                                  : " actividades repetidas apuntadas")
          + " para quitar.</b> Salen del archivo cuando pase <b>Rutas al día</b>; " +
          "hasta entonces se siguen viendo.</p></div>";
      }
      var kcal = 0, km = 0;
      v.forEach(function (x) { kcal += x.s.kcal; km += (x.a.km || 0); });
      var lis = v.map(function (x) {
        return "<li>" + U.esc(U.etiquetaFecha(x.s.f)) + " · " + U.esc(x.s.n) +
          " — <b>" + num0(x.s.kcal) + " kcal</b></li>";
      }).join("");
      return '<div class="limpieza">' +
        "<p><b>" + v.length + (v.length === 1 ? " actividad repetida" : " actividades repetidas") +
        "</b> se colaron en una fusión antigua. Cada una repite salidas que ya están " +
        "ese mismo día, y traen las calorías infladas: entre todas suman <b>" +
        num0(kcal) + " kcal</b> y <b>" + num0(Math.round(km)) + " km</b> que no existieron.</p>" +
        "<ul>" + lis + "</ul>" +
        '<button type="button" class="ent-boton" data-limpiar="1">Quitar ' +
        (v.length === 1 ? "la repetida" : "las " + v.length) + "</button>" +
        '<div id="limpieza-dice"></div>' +
      "</div>";
    },

    decir: function (txt, mal) {
      var n = document.getElementById("limpieza-dice");
      if (n) n.innerHTML = '<p class="nota-peque' + (mal ? " evo-toca" : "") +
        '" style="margin:8px 0 0">' + txt + "</p>";
    },

    /* De una en una y en fila: cada borrado toca dos ficheros del repositorio y
       lanzarlos a la vez sería pelearse consigo mismo por el mismo `sha`. */
    lanzar: function () {
      var self = this, v = sobranVivas(), i = 0;
      if (this.yendo || !v.length) return;
      if (!Salud.configurado()) { this.decir("Falta la configuración de GitHub.", true); return; }
      this.yendo = true;
      (function siguiente() {
        if (i >= v.length) {
          self.yendo = false;
          self.decir("Hecho: " + v.length + " apuntadas. Salen del archivo al pasar " +
                     "<b>Rutas al día</b>.");
          try { localStorage.removeItem(Salud.CLAVE); } catch (e) {}
          Salud.datos = null; Salud.sha = null;
          Salud.cargar(true, function () { pintarConservando(); });   // el tercer repintado que saltaba
          return;
        }
        var x = v[i];
        self.decir("Quitando " + (i + 1) + " de " + v.length + ": " + U.esc(x.s.n) + "…");
        Borrado.pedir(x.s.id, "actividad", null,
          { fecha: x.s.f, km: x.a.km || 0, nombre: x.s.n },
          function (bien, porque) {
            if (!bien) {
              self.yendo = false;
              self.decir("Se paró en la " + (i + 1) + ": " + U.esc(porque || "no sé por qué") +
                         ". Las anteriores sí entraron.", true);
              return;
            }
            apuntarPedida(x.s.id);
            i++;
            setTimeout(siguiente, 250);       // aire entre commits
          });
      })();
    }
  };

  function num0(v) {
    return Number(v || 0).toLocaleString("es-ES", { maximumFractionDigits: 0 });
  }

  function estiloLimpieza() {
    if (document.getElementById("ent-css-limpieza")) return;
    var e = document.createElement("style");
    e.id = "ent-css-limpieza";
    /* SIN `prefers-color-scheme`. La app se queda CLARA aunque el sistema esté
       en oscuro, así que una regla de modo oscuro aquí pinta el recuadro negro
       sobre una página blanca y el texto se pierde. Pasó el 21-sep con este
       bloque, y ya había pasado antes con las tarjetas del resumen. Colores
       fijos, los mismos que usa el resto. */
    e.textContent =
      ".limpieza{margin:14px 0 2px;padding:14px;border-radius:14px;" +
        "background:#f4f7fa;border:1px solid #dbe4ee;color:#22303c}" +
      ".limpieza p{margin:0 0 8px;font-size:13.5px;line-height:1.45;color:#22303c}" +
      ".limpieza ul{margin:0 0 12px;padding-left:18px;font-size:12.5px;line-height:1.6;" +
        "color:#5b6b7c}" +
      ".limpieza .ent-boton{border:0;border-radius:999px;padding:10px 18px;" +
        "background:#16324f;color:#fff;font:inherit;font-weight:700;" +
        "font-size:14px;cursor:pointer}" +
      ".limpieza .ent-boton:active{transform:translateY(1px)}";
    document.head.appendChild(e);
  }

  function htmlFrescura() {
    if (!Salud.datos) return "";
    estiloLimpieza();
    pedirArchivoViejo();
    var DE = {
      intervals: "llega sola cada día",
      bascula:   "cuando te pesas",
      garmin:    "sólo con la exportación de Garmin"
    };
    var ultGarmin = null, filas = "";
    MEDIDAS_FUENTE.forEach(function (m) {
      var u = ultimoConDato(m.c);
      if (!u) return;
      var d = diasDesde(u);
      if (m.de === "garmin" && m.c !== "__fuerza" && (!ultGarmin || u > ultGarmin)) ultGarmin = u;
      var esFuerza = (m.c === "__fuerza");
      var viejo = esFuerza ? !fuerzaAlDia()
                : (m.de === "garmin" && d != null && d > CADA_DIAS_GARMIN) ||
                  (m.de !== "garmin" && d != null && d > 10);
      var cuando = esFuerza
        ? (viejo ? "faltan sesiones" : "tu última sesión")
        : (d === 0 ? "hoy" : d === 1 ? "ayer" : "hace " + d + " días");
      filas += "<tr" + (viejo ? ' class="evo-toca"' : "") + "><td>" + U.esc(m.n) + "</td>" +
        "<td>" + U.esc(U.etiquetaFecha(u)) + "</td>" +
        "<td>" + U.esc(cuando) + "</td>" +
        "<td>" + U.esc(DE[m.de]) + "</td></tr>";
    });
    if (!filas) return "";

    var dg = diasDesde(ultGarmin);
    var toca = dg != null && dg > CADA_DIAS_GARMIN;
    var cab = ultGarmin
      ? ("<p>La última exportación de Garmin llega hasta el <b>" +
         U.esc(U.etiquetaFecha(ultGarmin)) + "</b>, hace " + dg + " días. " +
         (toca ? "<b>Toca pedir una nueva.</b>"
               : "La siguiente, a partir de los " + CADA_DIAS_GARMIN + " días.") + "</p>")
      : "";

    return '<details class="evo-frescura' + (toca ? " toca" : "") + '">' +
      "<summary>Hasta dónde llega cada medida" +
      (toca ? ' <span class="evo-chip">toca pedir Garmin</span>' : "") + "</summary>" +
      cab +
      '<table class="evo-tabla-frescura"><thead><tr><th>Medida</th><th>Último dato</th>' +
      "<th></th><th>De dónde viene</th></tr></thead><tbody>" + filas + "</tbody></table>" +
      "<p>Pedir la exportación cada dos meses no es sólo para rellenar huecos: " +
      "es la fuente <b>buena</b> del pulso en reposo. Intervals se desvió seis latidos " +
      "durante todo 2023 sin avisar, y sólo se vio al comparar las dos.</p>" +
      '<p><a href="' + ENLACE_GARMIN + '" target="_blank" rel="noopener">' +
      "Exportar mis datos de Garmin</a> — se pide ahí y llega por correo.</p>" +
      "<p>La exportación se procesa en el ordenador con <i>maestro2.py</i>, que " +
      "rehace el histórico entero y corrige lo que intervals haya desviado.</p>" +
      Limpieza.html() +
      "</details>";
  }

  function htmlEvolucion() {
    var FLECHA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M15 5l-7 7 7 7"/></svg>';
    var volver = '<button type="button" class="ent-atras" data-volver="1">' + FLECHA + "Volver a Entrenamiento</button>";
    var h = volver;

    h += htmlPase();

    h += '<h3 class="evo-sub" style="margin-top:20px">Las series</h3>';
    /* El selector de arriba ya no manda sobre nada: cada tarjeta lleva el suyo
       al lado de su título. Dos mandos para lo mismo confunden. */
    h += '<p class="nota-peque" style="margin:0 0 10px">Cada tarjeta lleva su propio periodo, ' +
      "y las flechas corren esa ventana entera hacia atrás o hacia delante.</p>";

    if (!Salud.datos) {
      return h + '<div class="tarjeta"><h2>Evolución</h2><p class="nota-peque">' +
        (Salud.estado === "sin-config"
          ? "Hace falta la sincronización con GitHub: Ajustes → Sincronizar."
          : "Todavía no tengo <b>datos/salud.json</b>. Se reintenta al volver a entrar.") + "</p></div>";
    }
    if (pideHistorico() && !Historico.datos) {
      h += '<p class="nota-peque" style="margin:0 0 10px">' +
        (Historico.estado === "cargando" ? "Trayendo el histórico…"
          : Historico.estado === "error" ? "No he podido traer el histórico; se enseña lo reciente."
          : "Trayendo el histórico…") + "</p>";
    }

    var v, bandas;
    var AZUL = "#2f5c8a", VERDE = "#2f6b47", AMBAR = "#c98a1b", ROJO = "#b3402f", GRIS = "#8aa0b5";

    /* ---------- 1. peso, masa magra y grasa ---------- */
    v = ventanaDe("peso"); bandas = bandasFarmaco(v);
    var pes = seriePeso(v), med7 = mediaMovilDias(pes, 7), magra = serieSalud("magra", v);
    var gBas = serieMixta("grasa", v), gCin = serieGrasaCinta(v);   // báscula + lo tecleado a mano
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
      mandoEvo("peso") + tramoEvo("peso") + cuerpo1, nota1);

    /* ---------- 2. VFC, FC en reposo y sueño ---------- */
    v = ventanaDe("recu"); bandas = bandasFarmaco(v);
    var vfc = serieSalud("vfc", v), vfc7 = serieSalud("vfc7", v), fcr = serieSalud("fcr", v);
    var sue = serieSalud("sueno_min", v).map(function (p) { return { f: p.f, v: p.v / 60 }; });
    var cuerpo2, nota2 = "";
    if (vfc.length || fcr.length) {
      var par = (Salud.datos.meta && Salud.datos.meta.parametros) || {};
      /* VFC y pulso en reposo, en gráficas separadas: comparten rango de números
         pero no significan lo mismo, y juntos se aplastaban en una cinta.
         En tramos largos la VFC de cada noche se calla: son cientos de picos. */
      var tramoLargo = diasEntre(v.desde, v.hasta) > 200;

      /* CON FRANJA Y PUNTOS DE COLOR, COMO EL RELOJ. La cola de VFC_VENTANA
         días de más no se dibuja: hace falta para que el primer día del tramo
         ya tenga franja en vez de empezar en blanco. */
      var vfcCola = serieSalud("vfc", { desde: U.sumarDias(v.desde, -(VFC_VENTANA + 30)), hasta: v.hasta });
      var fr = vfcConFranja(vfcCola, v.desde, v.hasta);

      if (fr) {
        function deColor(e) {
          return fr.puntos.filter(function (p) { return p.e === e; });
        }
        var COLOR = { verde: VFC_VERDE, naranja: VFC_NARANJA, rojo: VFC_ROJO_C, gris: "#9aa8a2" };
        var ser = [];
        /* La línea de cada noche, en guiones: es el dato crudo y va detrás.
           Se calla pasados los 70 días, que es más o menos hasta donde se
           distinguen los picos: a seis meses son doscientas rayas y tapan la
           franja, que es lo que hay que mirar. El reloj la enseña sólo en la
           vista de cuatro semanas, por lo mismo. */
        var diasV = diasEntre(v.desde, v.hasta);
        var cabenNoches = tocanNoches(diasV);
        /* En tramos largos se afina y se aclara: con trescientas noches la
           raya gorda es una mancha, pero fina todavía deja ver la forma. */
        if (cabenNoches) ser.push({ pts: vfc, color: "#8d9a94",
                                    ancho: diasV > 200 ? 0.5 : 1,
                                    guiones: true, marcarUltimo: false });
        ["gris", "verde", "naranja", "rojo"].forEach(function (e) {
          var pts = deColor(e);
          if (pts.length) ser.push({ pts: pts, color: COLOR[e], soloPuntos: true,
                                     radio: tramoLargo ? 1.1 : 2.2, marcarUltimo: false });
        });
        var ult = fr.puntos[fr.puntos.length - 1];
        var ultInf = fr.inf.length ? fr.inf[fr.inf.length - 1].v : null;
        var ultSup = fr.sup.length ? fr.sup[fr.sup.length - 1].v : null;

        cuerpo2 = grafica({
          desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 118, arriba: "VFC · ms", unidadTip: "ms",
          alt: "Variabilidad de la frecuencia cardíaca con su franja de referencia",
          explica: "La variabilidad del latido mientras duermes: cuanto más alta, más recuperado. " +
            "La franja gris es lo normal EN TI —el rango central de tus últimas " + VFC_VENTANA +
            " noches—, no lo normal en la población. Cada punto es la media de 7 noches: " +
            "verde dentro de la franja, naranja por debajo y rojo cuando se aleja. " +
            "Lo que se mira es si el punto entra o sale, no el número.",
          franja: { sup: fr.sup, inf: fr.inf, color: "#dfe4e2", opacidad: 0.85 },
          series: ser
        }) + leyenda([
          { n: "equilibrada", color: VFC_VERDE },
          { n: "desequilibrada", color: VFC_NARANJA },
          { n: "baja", color: VFC_ROJO_C },
          { n: "lo normal en ti", color: "#dfe4e2" }
        ].concat(cabenNoches ? [{ n: "cada noche", color: "#8d9a94", guiones: true }] : [])) +
          '<div class="evo-rangos noches">' + botonNoches(diasV) + "</div>";

        if (ult && ultInf !== null) {
          cuerpo2 += '<p class="nota-peque" style="margin:4px 0 0">Ahora mismo: <b>' +
            num(ult.v) + " ms</b> de media de 7 noches, con lo normal en ti entre <b>" +
            Math.round(ultInf) + "</b> y <b>" + Math.round(ultSup) + " ms</b>.</p>";
        }
      } else {
        cuerpo2 = grafica({
          desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 104, arriba: "VFC · ms", unidadTip: "ms",
          alt: "Variabilidad de la frecuencia cardíaca",
          explica: "La variabilidad del latido mientras duermes: cuanto más alta, más recuperado. " +
            "Todavía no hay noches suficientes para dibujar tu franja de referencia.",
          lineasH: par.base_vfc ? [{ v: par.base_vfc, color: "#cfdcea", etq: "tu base" }] : [],
          series: (tramoLargo ? [] : [{ pts: vfc, color: "#c3d3e2", ancho: 0.7, marcarUltimo: false }])
            .concat([{ pts: vfc7, color: AZUL, ancho: 1.5 }])
        }) + leyenda([{ n: "media de 7 días", color: AZUL }].concat(
          tramoLargo ? [] : [{ n: "cada noche", color: "#c3d3e2" }]));
      }
      /* PULSO EN REPOSO Y PULSO MÍNIMO DEL DÍA, EN LA MISMA GRÁFICA.
         Antes iban en dos gráficas apiladas y así había que medir a ojo, entre
         dos dibujos con escalas distintas, lo único que importa del par: cuánto
         se separan. Juntos es el hueco entre las dos líneas y se ve solo.
         Comparten unidad (lpm), así que compartir escala no engaña.

         MEDIDO sobre los 1.962 días en que existen las dos (21-sep-2026):
         el pulso en reposo que manda intervals cambia de valor el 86 % de los
         días y el mínimo el 84 %, los dos con un salto típico de 2 lpm; el
         mínimo va 4-5 latidos por debajo. El campo de reposo que trae la
         exportación de Garmin es otra cosa: sólo cambia el 38 % de los días,
         con salto típico CERO. Es una línea base lenta y por eso no se pinta
         aquí: no avisa de nada.

         Una corrección, porque antes estaba escrito al revés: en la gripe A de
         marzo de 2023 el que se disparó fue el de intervals (54 → 72), no el
         mínimo, que subió un día a 55 y volvió a 46. Y ojo con ese año: en
         2023 intervals anduvo seis latidos por encima de Garmin de enero a
         diciembre (52,1 contra 45,7), que es justo la desviación conocida.

         El mínimo no llega por intervals: sólo viene con la exportación de
         Garmin, así que su línea se acaba donde acabó la última. Eso se dice
         debajo, no se disimula. */
      var pmin = serieSalud("pulso_min", v);
      if (fcr.length || pmin.length) {
        var serPulso = [];
        if (fcr.length) serPulso.push({ pts: tramoLargo ? mediaMovilDias(fcr, 7) : fcr,
                                        color: AMBAR, ancho: 1.2 });
        if (pmin.length) serPulso.push({ pts: tramoLargo ? mediaMovilDias(pmin, 7) : pmin,
                                         color: "#7b2fbf", ancho: 1.2 });
        cuerpo2 += '<h3 class="evo-sub">Pulso en reposo y pulso mínimo</h3>' + grafica({
          desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 96, arriba: "lpm", unidadTip: "lpm",
          alt: "Pulso en reposo y pulso mínimo del día",
          explica: "Ámbar, el pulso en reposo de cada noche; morado, el latido más bajo de todo el día, " +
            "que suele ir cuatro o cinco latidos por debajo. Aquí bajar es mejorar, al revés que arriba. " +
            "Lo que dice algo no es cada línea por su lado sino la distancia entre las dos: cuando se " +
            "abren o se juntan, ahí ha pasado algo.",
          lineasH: par.base_fcr ? [{ v: par.base_fcr, color: "#eccf9a", etq: "tu base" }] : [],
          series: serPulso
        }) + leyenda([{ n: "en reposo", color: AMBAR }].concat(
          pmin.length ? [{ n: "mínimo del día", color: "#7b2fbf" }] : []));
        if (pmin.length) cuerpo2 += avisoFrescura("pulso_min");
        else cuerpo2 += '<p class="nota-peque" style="margin:4px 0 0">' +
          "El <b>pulso mínimo del día</b> todavía no tiene ni un dato: no llega por intervals, " +
          'sólo con la exportación de Garmin. <a href="' + ENLACE_GARMIN +
          '" target="_blank" rel="noopener">Exportar mis datos de Garmin</a> y la segunda línea aparece sola.</p>';
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
      /* ========== LAS TRES TARJETAS DEL SUEÑO (22-sep-2026) ==========
         Vienen de una pregunta suya: «¿qué fase fijamos como la buena?». La
         respuesta de manual es el sueño profundo. Medido sobre sus 1.300
         noches desde 2023, en él NO se sostiene:

           parte de la noche   con su VFC   con su pulso mínimo
           profundo               +0,03          −0,04
           REM                    +0,05          −0,22
           dormido en total       +0,06          −0,20
           nota de Garmin         +0,25          −0,41

         El profundo sale en cero, y no por falta de recorrido: su media de 30
         noches va de 37 a 72 minutos. Sencillamente, cuando sube no pasa nada.
         Así que no se fija ninguna fase como «la buena»: se enseñan las dos que
         importan y se deja que él vea cuál se mueve.

         (Hay una casilla que correlaciona mucho más, el estrés nocturno, −0,44
         con la VFC. Se descarta a propósito: Garmin lo calcula A PARTIR de la
         VFC, así que pintarla sería dibujar la VFC contra sí misma.)

         OJO CON LA FUENTE: las fases NO llegan con la sincronización de cada
         noche —comprobado en salud.json, que sólo trae el total dormido, la
         nota, la respiración y el Body Battery—. Vienen con la exportación de
         Garmin que se pide cada dos meses, así que estas tarjetas se acaban
         donde acabó la última descarga. Eso se dice, no se disimula. */
      var prof = serieSalud("sueno_profundo", v), rem = serieSalud("sueno_rem", v);
      var totS = serieSalud("sueno_min", v);
      if (prof.length > 10 && rem.length > 10) {
        /* En PORCENTAJE de la noche y no en minutos: si una noche duermes
           cinco horas y otra ocho, los minutos de cada fase suben solos sin
           que la noche sea mejor. El porcentaje dice cómo repartiste lo que
           dormiste, que es lo que se quiere mirar. */
        var porTot = {};
        totS.forEach(function (p) { if (p.v > 0) porTot[p.f] = p.v; });
        function enPorciento(serie) {
          var out = [];
          serie.forEach(function (p) {
            if (porTot[p.f]) out.push({ f: p.f, v: 100 * p.v / porTot[p.f] });
          });
          return out;
        }
        var pPro = enPorciento(prof), pRem = enPorciento(rem);
        var mPro = mediaMovilDias(pPro, 30), mRem = mediaMovilDias(pRem, 30);
        /* La línea de cada noche sólo cuando se distingue: a seis meses son
           ciento ochenta picos y tapan la media, que es lo que hay que leer. */
        var finos = diasEntre(v.desde, v.hasta) <= 120;
        cuerpo2 += '<h3 class="evo-sub">En qué se te va la noche</h3>' + grafica({
          desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 100, arriba: "% de la noche",
          unidadTip: "%", alt: "Reparto de las fases del sueño",
          explica: "Cuánto de cada noche es sueño profundo y cuánto REM, en porcentaje y no en " +
            "minutos: así una noche larga y una corta se comparan igual. La línea fina es cada " +
            "noche; la gruesa, la media de 30.",
          series: (finos ? [{ pts: pPro, color: "#b9cbdd", ancho: 0.5, marcarUltimo: false },
                            { pts: pRem, color: "#e2c89a", ancho: 0.5, marcarUltimo: false }] : [])
            .concat([{ pts: mPro, color: AZUL, ancho: 2 },
                     { pts: mRem, color: "#b3762f", ancho: 2 }])
        }) + leyenda([{ n: "profundo", color: AZUL }, { n: "REM", color: "#b3762f" }]);
        if (mPro.length && mRem.length) {
          cuerpo2 += '<p class="nota-peque" style="margin:4px 0 0">Ahora mismo: <b>' +
            num(mPro[mPro.length - 1].v) + " %</b> de profundo y <b>" +
            num(mRem[mRem.length - 1].v) + " %</b> de REM, en media de 30 noches. " +
            "Tu media desde 2023 es 13,3 % y 14,4 %." +
            "</p>";
        }
        cuerpo2 += avisoFrescura("sueno_profundo");
      }

      /* LA NOTA DE LA NOCHE, leída como la VFC. Es la que mejor acompaña a su
         recuperación —0,41 contra el pulso mínimo, diez veces más que
         cualquier fase suelta—, y hasta hoy no se pintaba en ninguna parte. */
      var notaS = serieSalud("pt_sueno", v);
      /* El listón va en las noches del TRAMO, no en las de la franja: la franja
         se saca de la cola de 150 días que se pide aparte, así que en «1 mes»
         —treinta noches— también sale. Antes pedía 40 y la tarjeta desaparecía
         justo en el tramo que más se mira. */
      if (notaS.length > 5) {
        var colaN = serieSalud("pt_sueno", { desde: U.sumarDias(v.desde, -(VFC_VENTANA + 30)), hasta: v.hasta });
        var frN = vfcConFranja(colaN, v.desde, v.hasta, null);
        if (frN) {
          var COLN = { verde: VFC_VERDE, naranja: VFC_NARANJA, rojo: VFC_ROJO_C, gris: "#9aa8a2" };
          var serN = [];
          ["gris", "verde", "naranja", "rojo"].forEach(function (e) {
            var pts = frN.puntos.filter(function (x) { return x.e === e; });
            if (pts.length) serN.push({ pts: pts, color: COLN[e], soloPuntos: true,
                                        radio: diasEntre(v.desde, v.hasta) > 200 ? 1.1 : 2.2,
                                        marcarUltimo: false });
          });
          cuerpo2 += '<h3 class="evo-sub">La nota de la noche</h3>' + grafica({
            desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 100, arriba: "de 100",
            unidadTip: "", alt: "Puntuación de sueño con su franja de referencia",
            explica: "La nota que Garmin pone a cada noche, leída igual que la VFC: media de 7 " +
              "noches y franja con lo normal en ti. De todo lo que mide el reloj mientras duermes, " +
              "es lo que mejor acompaña a tu recuperación.",
            franja: { sup: frN.sup, inf: frN.inf, color: "#dfe4e2", opacidad: 0.85 },
            series: serN
          }) + leyenda([
            { n: "dentro", color: VFC_VERDE },
            { n: "por debajo", color: VFC_NARANJA },
            { n: "baja", color: VFC_ROJO_C },
            { n: "lo normal en ti", color: "#dfe4e2" }
          ]);
        }
      }

      /* LA NOCHE, DÍA A DÍA (idea suya, 22-sep-2026): todas las medidas de la
         noche una debajo de otra y con el MISMO eje de fechas.
         No se mezclan en una sola gráfica a propósito: una nota sobre 100, un
         porcentaje de oxígeno, respiraciones por minuto y un número de veces
         no comparten escala, y juntarlas obligaría a inventar una. Apiladas y
         alineadas se lee lo que él quería: la COLUMNA, o sea qué hizo cada
         medida la misma noche. */
      var LAS_DE_LA_NOCHE = [
        { c: "pt_sueno",     n: "Nota de sueño", u: "de 100",       col: AZUL },
        { c: "body_battery", n: "Body Battery",  u: "al despertar", col: "#3f8f6b" },
        { c: "respiracion",  n: "Respiración",   u: "resp./min",    col: "#7b5ea7" },
        { c: "sueno_veces",  n: "Despertares",   u: "veces",        col: AMBAR, barras: true },
        { c: "spo2_noche",   n: "Saturación",    u: "% de O₂", col: ROJO,
          vacio: "sin datos todavía — la pulsioximetría nocturna se activó el 17 de septiembre; " +
                 "aparecerá con la próxima exportación de Garmin" }
      ];
      var filasNoche = "", hayAlguna = false;
      LAS_DE_LA_NOCHE.forEach(function (m) {
        var pts = serieSalud(m.c, v);
        filasNoche += '<div class="fila-noche"><b>' + U.esc(m.n) + "<small>" + U.esc(m.u) + "</small></b>";
        if (!pts.length) {
          filasNoche += '<p class="sin-noche">' + U.esc(m.vacio || "sin datos en este tramo") + "</p></div>";
          return;
        }
        hayAlguna = true;
        filasNoche += grafica({
          desde: v.desde, hasta: v.hasta, alto: 40, arriba: "", unidadTip: m.u,
          alt: m.n, ajustarFin: false, fechas: false,
          series: [{ pts: pts, color: m.col, ancho: 1.1, barras: !!m.barras,
                     opacidad: 0.85, marcarUltimo: !m.barras }]
        }) + "</div>";
      });
      if (hayAlguna) {
        cuerpo2 += '<h3 class="evo-sub">La noche, día a día</h3>' +
          '<p class="graf-pie" style="margin:0 0 6px">Todas las medidas de la noche con el mismo ' +
          'eje de fechas. No se mezclan en una sola línea a propósito: son unidades distintas y ' +
          'juntarlas sería inventar. Lo que se lee aquí es la columna — qué hizo cada medida la ' +
          'misma noche.</p><div class="panel-noche">' + filasNoche +
          '<div class="fila-noche"><b></b><p class="fechas-noche"><span>' +
          U.esc(U.etiquetaFecha(v.desde)) + "</span><span>" +
          (v.hasta === U.hoyISO() ? "hoy" : U.esc(U.etiquetaFecha(v.hasta))) +
          "</span></p></div></div>";
      }

      if (bandas.length) {
        nota2 = "El tramo sombreado es el del corticoide: <b>ahí no se interpreta nada</b>, " +
          "porque el fármaco baja la VFC y sube el pulso por sí solo.";
      }
      /* Por qué la VFC empieza en 2024 y no en 2022, dicho donde se ve. */
      if (v.desde < VFC_DESDE) {
        nota2 += (nota2 ? " " : "") +
          "La VFC arranca el <b>12 de febrero de 2024</b>, que es cuando empezó a medirla el reloj. " +
          "Lo de antes lo tomaba una app con la cámara del móvil —saltaba veinte milisegundos " +
          "de una noche a otra, contra los cinco de ahora— y no es la misma medida, así que " +
          "no se pinta.";
      }
    } else {
      cuerpo2 = sinDatos("Sin datos de recuperación en este tramo");
    }
    h += tarjetaEvo("Recuperación", vfc7.length ? num(vfc7[vfc7.length - 1].v) : null, "ms",
      "La VFC dice lo que ya pasó; el sueño y la carga dicen lo que va a pasar.",
      mandoEvo("recu") + tramoEvo("recu") + cuerpo2, nota2);

    /* ---------- 2b. batería y estrés ----------
       Dos series que llevaban 2.476 días bajadas y sin pintar. Van juntas
       porque son la misma pregunta por los dos lados: cuánto te queda en el
       depósito y cuánto te lo están vaciando.

       LA BATERÍA SE PINTA POR EL MÍNIMO, NO POR EL MÁXIMO. El máximo dice a
       qué hora te levantaste; el mínimo dice si el día te vació. Y aquí el
       mínimo tiene un suelo: Garmin no baja de 5, así que un 5 no es «casi
       vacío», es «vacío y no sabemos cuánto más». Por eso hay una raya en el 5
       y se cuenta cuántos días la tocan: esa cuenta dice más que la media.

       EL ESTRÉS trae dos números por día: el de todo el día y el de mientras
       duermes. El de la noche es el que vale, porque el del día se ensucia con
       el entreno —pedalear sube el estrés de Garmin sin que pase nada malo—.
       Medido: en el covid de junio de 2024 el del día saltó de 37 a 62 el 17,
       antes de que nada más se moviera.

       No llegan por intervals: sólo con la exportación de Garmin. Se dice
       debajo. */
    v = ventanaDe("bat"); bandas = bandasFarmaco(v);
    var bbMax = serieSalud("body_battery", v), bbMin = serieSalud("body_battery_min", v);
    var bbCar = serieSalud("bb_carga", v), bbGas = serieSalud("bb_gasto", v);
    var est = serieSalud("estres", v), estN = serieSalud("sueno_estres", v);
    if (bbMin.length || est.length || vistaDe("bat").des > 0) {
      var cuerpoB = "", notaB = "";
      var largoB = diasEntre(v.desde, v.hasta) > 200;
      if (bbMin.length) {
        cuerpoB += grafica({
          desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 96, arriba: "batería",
          min: 0, unidadTip: "",
          alt: "Body Battery, lo más alto y lo más bajo de cada día",
          /* Sin raya en el 5: la propia línea morada está ahí pegada casi todos
             los días y las dos juntas no se distinguían. Lo del suelo se dice
             con palabras en la nota, que además lo cuenta. */
          explica: "Verde, con cuánta batería llegaste a lo más alto del día; morado, a cuánto " +
            "bajaste. La morada se pega al fondo porque Garmin no baja de 5: ahí ya no mide.",
          series: [{ pts: largoB ? mediaMovilDias(bbMax, 7) : bbMax, color: VERDE, ancho: 1.2 },
                   { pts: largoB ? mediaMovilDias(bbMin, 7) : bbMin, color: "#7b2fbf", ancho: 1.2 }]
        }) + leyenda([{ n: "lo más alto del día", color: VERDE },
                      { n: "lo más bajo", color: "#7b2fbf" }]);
        /* La cuenta de días en el suelo: es lo que de verdad se lee aquí. */
        var suelo = 0;
        bbMin.forEach(function (p) { if (p.v <= 5) suelo++; });
        var pc = bbMin.length ? Math.round(100 * suelo / bbMin.length) : 0;
        notaB = "En este tramo la batería llegó al suelo <b>" + suelo + " de " + bbMin.length +
          " días</b> (" + pc + " %).";
        if (bbCar.length && bbGas.length) {
          var mc = bbCar.reduce(function (t, p) { return t + p.v; }, 0) / bbCar.length;
          var mg = bbGas.reduce(function (t, p) { return t + p.v; }, 0) / bbGas.length;
          notaB += " Cargas <b>" + num(mc, 0) + "</b> durmiendo y gastas <b>" + num(mg, 0) +
            "</b> despierto, de media" +
            (Math.abs(mc - mg) < 3 ? ": empatas, pero empatas saliendo del suelo."
             : mc > mg ? ": repones más de lo que gastas." : ": gastas más de lo que repones.");
        }
      }
      if (est.length || estN.length) {
        cuerpoB += '<h3 class="evo-sub">Estrés</h3>' + grafica({
          /* Sin 0-100 forzado: el estrés se mueve entre 23 y 66 y con la escala
             entera se quedaba aplastado contra el suelo, que es lo que le pasaba
             al sueño antes. La escala la pone el dato. */
          desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 88, arriba: "estrés",
          unidadTip: "",
          alt: "Estrés medio del día y de la noche",
          explica: "El de la noche es el que vale: el del día sube con el entreno sin que pase " +
            "nada malo. En el covid de junio de 2024 el del día saltó de 37 a 62 antes de que " +
            "se moviera ninguna otra cosa.",
          series: (est.length ? [{ pts: largoB ? mediaMovilDias(est, 7) : est,
                                   color: "#c3d3e2", ancho: 1 }] : [])
            .concat(estN.length ? [{ pts: largoB ? mediaMovilDias(estN, 7) : estN,
                                     color: ROJO, ancho: 1.3 }] : [])
        }) + leyenda((est.length ? [{ n: "todo el día", color: "#c3d3e2" }] : [])
          .concat(estN.length ? [{ n: "durmiendo", color: ROJO }] : []));
      }
      cuerpoB += avisoFrescura(bbMin.length ? "body_battery_min" : "estres");
      if (!bbMin.length && !est.length) cuerpoB = sinDatos("Sin batería ni estrés en este tramo") + cuerpoB;
      var ultBB = bbMin.length ? bbMin[bbMin.length - 1].v : null;
      h += tarjetaEvo("Batería y estrés", ultBB === null ? null : num(ultBB, 0), "de 100",
        "Cuánto te queda en el depósito y cuánto te lo están vaciando.",
        mandoEvo("bat") + tramoEvo("bat") + cuerpoB, notaB);
    }

    /* ---------- 3. forma, fatiga y carga contra la rampa ---------- */
    v = ventanaDe("forma"); bandas = bandasFarmaco(v);
    var ctl = serieSalud("ctl", v), atl = serieSalud("atl", v);
    var cs = seriesCargaSemanal();
    var cuerpo3, nota3 = "";
    if (ctl.length) {
      cuerpo3 = grafica({
        desde: v.desde, hasta: v.hasta, bandas: bandas, alto: 219, arriba: "puntos", min: 0,
        unidadTip: "puntos",
        alt: "Forma y fatiga",
        explica: "Azul la forma, que es la carga acumulada de seis semanas; roja la fatiga, la de una. " +
          "Cuando la roja se queda arriba mucho tiempo, viene el parón.",
        series: [{ pts: ctl, color: AZUL, ancho: 1.5 },
                 { pts: atl, color: ROJO, ancho: diasEntre(v.desde, v.hasta) > 200 ? 0.7 : 1.1 }]
      }) + leyenda([{ n: "forma (CTL)", color: AZUL }, { n: "fatiga (ATL)", color: ROJO }]);
      if (cs.objetivos.length) {
        cuerpo3 += '<h3 class="evo-sub">Carga de cada semana contra el objetivo</h3>' + grafica({
          desde: cs.desde, hasta: cs.hasta, alto: 190, arriba: "carga semanal \u00b7 la rampa entera",
          min: 0,
          alt: "Carga semanal real frente al objetivo del plan",
          explica: "Una barra clara por semana con lo que pide la rampa —las trece escritas y el crucero " +
            "que viene detrás, hasta el techo de 700—, y encima en verde lo que llevas hecho.",
          /* EL GLOBO SALE EN TODAS LAS BARRAS, no solo en la verde (Carlos,
             23-sep-2026: «solo sale banner en la columna rellena, debería salir
             en todas, con la carga prevista, y si hay carga hecha esa semana por
             dónde va»). Se consigue con el modo PAREJA que ya existía para la
             tensión alta y baja: la serie que se lee es la del OBJETIVO —que
             tiene un punto por cada semana hasta diciembre— y lo hecho viaja de
             acompañante. Las semanas sin hacer enseñan solo lo que piden. */
          par: ["pide la rampa", "llevas hecho"],
          series: [{ pts: cs.objetivos, color: "#cfdcea", barras: true, marcarUltimo: false,
                     techo: "#8fa8bf", tip: true },
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
      "La forma sube despacio y se cae rápido: por eso la rampa manda sobre las ganas.",
      mandoEvo("forma") + tramoEvo("forma") + cuerpo3, nota3);

    /* ---------- 4. cintura, cintura÷altura y vatios por kilo ---------- */
    v = ventanaDe("cintura"); bandas = bandasFarmaco(v);
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
    if (!cuerpo4) cuerpo4 = sinDatos("Sin cintura ni vatios en este tramo");
    h += tarjetaEvo("Cintura y rendimiento", cin.length ? num(cin[cin.length - 1].v) : null, "cm",
      "La cintura es la medida que más se mueve con el plan, y la que más dice del riesgo.",
      mandoEvo("cintura") + tramoEvo("cintura") + cuerpo4, nota4);

    h += htmlFrescura();
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
              /* `mediaDesde: 0`: el peso se suaviza TAMBIÉN en el tramo de un
                 mes. Las demás empiezan a los tres meses porque con treinta
                 puntos no hay emborronamiento que quitar, pero aquí el dato
                 del día baila más de un kilo y sin la media no se lee ni en
                 una semana. */
              media: 7, mediaDesde: 0, objetivo: pesoObjetivo(), etqObj: "tu objetivo",
              pie: function (suave) {
                return suave
                  ? "La línea gruesa es la media de 7 días, que es la que cuenta: el dato del día oscila más de un kilo por agua y tránsito."
                  : "En este tramo hay pocas pesadas y se dibujan tal cual. El dato de un día suelto oscila más de un kilo por agua y tránsito: para leer el peso hacen falta varias seguidas.";
              } },
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
      /* EL GEMELO va con el tobillo dibujado encima, y no es un adorno: los dos
         suben con la retención de líquidos. Separados, un gemelo que crece
         parece músculo; juntos se ve si lo es. (24-sep-2026.) */
      gemelo: { n: "Gemelo", u: "cm", dias: 180, serie: function () { return serieApp("gemelo", v); },
                serie2: function () { return serieApp("tobillo", v); }, etq2: "tobillo",
                par: ["gemelo", "tobillo"],
                pie: "Cosa de ciclista, pero se lee con el tobillo al lado: si sube el gemelo y el tobillo está quieto, es entrenamiento; si suben los dos, es líquido." },
      grasaCinta: { n: "Grasa por cinta", u: "%", dias: 120,
                    serie: function () { return serieGrasaCinta(v); },
                    pie: "Sale de cintura, cuello y altura. No depende del agua del cuerpo, así que para la tendencia es más fiable que la báscula." },
      /* `serieMixta` y no `serieSalud`: desde el 23-sep-2026 la grasa también se
         puede teclear, y con `serieSalud` lo anotado a mano no habría salido
         nunca en la gráfica. Es la misma función que usan músculo, agua y ósea:
         lo escrito por él pisa lo de intervals en ese día. */
      grasa: { n: "Grasa corporal", u: "%", dias: 120, serie: function () { return serieMixta("grasa", v); },
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
      /* LA MISMA LECTURA QUE EN EVOLUCIÓN (22-sep-2026, Carlos: «los cambios de
         la gráfica de Evolución, ¿pueden llevarse a la emergente de El Plan?»).
         Dos dibujos de la misma medida que se leen distinto es peor que no
         tener el segundo: se mira el de El Plan, se ve una línea dentro de lo
         normal, y en Evolución la misma semana está en naranja. Así que la
         emergente usa la franja, los puntos de color y la línea de cada noche,
         exactamente igual. `serie` sigue siendo la media de 7 noches porque de
         ella salen el «último», el «hace 30 días» y el resto del resumen. */
      vfc: { n: "VFC", u: "ms", dias: 30,
             /* La media de 7 noches sale de `vfcConFranja`, que es la misma
                cuenta que usa Evolución: la de intervals cuando existe y la
                calculada cuando no. Antes se pedía `vfc7` a secas y, en los
                días en que ese campo no llega, la ventana decía «sin datos»
                teniendo las noches delante. */
             serie: function () {
               var n = serieSalud("vfc", { desde: U.sumarDias(v.desde, -(VFC_VENTANA + 30)), hasta: v.hasta });
               var fr = vfcConFranja(n, v.desde, v.hasta);
               if (fr) return fr.puntos.map(function (p) { return { f: p.f, v: p.v }; });
               return serieSalud("vfc7", v);
             },
             conFranja: true, noches: function (w) { return serieSalud("vfc", w); },
             objetivo: baseSalud("base_vfc"), etqObj: "tu base",
             pie: "La franja gris es lo normal EN TI, el rango central de tus últimas " + VFC_VENTANA +
                  " noches. Cada punto es la media de 7 noches: verde dentro de la franja, naranja " +
                  "por debajo y rojo cuando se aleja. La línea de guiones es la VFC de cada noche, " +
                  "que es el dato del que sale todo lo demás. Dice lo que ya pasó, no lo que va a pasar." },
      /* CON EL PULSO MÍNIMO DEL DÍA DEBAJO (22-sep-2026, Carlos: «quiero ver si
         hay alteraciones»). Las dos en la misma ventana y no en dos, porque lo
         que avisa no es ninguna de las dos por su lado: es CUÁNTO SE SEPARAN.
         Medido sobre los 1.962 días en que existen las dos, el mínimo va 4-5
         latidos por debajo; cuando esa distancia se cierra, el cuerpo está
         trabajando de noche.
         El mínimo sólo llega con la exportación de Garmin, que se baja cada dos
         meses, así que su línea se acaba donde acabó la última descarga. Eso se
         dice en el pie, no se disimula. */
      fcr: { n: "FC en reposo", u: "lpm", dias: 30, serie: function () { return serieSalud("fcr", v); },
             serie2: function () { return serieSalud("pulso_min", v); },
             etq2: "mínimo del día", par: ["en reposo", "mínimo del día"],
             objetivo: baseSalud("base_fcr"), etqObj: "tu base", invertido: true, media: 7,
             pie: function (suave) { return "Azul el pulso en reposo, roja el latido más bajo de todo el día. " +
                  (suave ? "De cada color hay dos líneas: la clarita es lo que marcó ese día y la gruesa " +
                           "su media de 7 días. Mira la gruesa para saber por dónde vas y la clara para los " +
                           "picos, que es donde está el aviso. " : "") +
                  "Cuanto más bajas, mejor: cinco por encima de tu base tres días seguidos es señal. " +
                  "La roja suele ir cuatro o cinco latidos por debajo de la azul: " +
                  "lo que dice algo es la distancia entre las dos. Sólo llega con la exportación de Garmin, " +
                  "así que se corta en la última que bajaste."; } },
      sueno: { n: "Sueño", u: "h", dias: 14, serie: function () {
                 return serieSalud("sueno_min", v).map(function (p) { return { f: p.f, v: p.v / 60 }; });
               }, objetivo: 7, etqObj: "7 h", media: 7,
               pie: function (suave) {
                 return suave
                   ? "Lo que predice el día siguiente son las dos últimas noches, y ésas están en la " +
                     "línea clara. La gruesa es la media de 7 noches y dice otra cosa: si estás " +
                     "durmiendo bien esta temporada."
                   : "Lo que predice el día siguiente son las dos últimas noches, no la media del mes.";
               } },
      pt_sueno: { n: "Puntuación de sueño", u: "de 100", dias: 14, serie: function () { return serieSalud("pt_sueno", v); },
                  objetivo: 70, etqObj: "70", media: 7,
                  pie: function (suave) {
                    return "La nota que pone Garmin a la noche. Es la más saltarina de todas: de una " +
                      "noche a la siguiente cambia 17 puntos de media" +
                      (suave ? ", así que la que hay que mirar es la línea gruesa, la media de 7 noches."
                             : ", así que una noche suelta no dice gran cosa.");
                  } },
      /* CON LA FATIGA DEBAJO (22-sep-2026, Carlos: «la gráfica de carga ctl y
         fatiga no trae la fatiga, sólo el ctl»). Y era verdad: la tarjeta de Mi
         Estado se llama «Forma y fatiga» y da los dos números, pero la ventana
         que se abría al pulsarla sólo pedía la forma. Las dos van juntas
         porque lo que se lee no es ninguna de las dos por separado: es el
         HUECO entre ellas, que es el balance. */
      ctl: { n: "Forma y fatiga", u: "puntos", dias: 42,
             serie: function () { return serieSalud("ctl", v); },
             serie2: function () { return serieSalud("atl", v); },
             etq2: "fatiga", par: ["forma", "fatiga"],
             pie: "Azul la forma (CTL), roja la fatiga (ATL). La forma sube despacio y se cae " +
                  "rápido; la fatiga hace lo contrario. Lo que importa es la distancia entre las " +
                  "dos: con la roja por encima de la azul estás cargado, y con la roja muy por " +
                  "debajo has perdido forma descansando. Mayo de 2026 tenías la forma en 79." },
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
    if (!RANGOS_HIST.some(function (r) { return r.id === rangoHist; })) rangoHist = "1a";
    histAbierta = clave;
    var s1 = d.serie() || [], s2 = d.serie2 ? (d.serie2() || []) : [];
    /* el tramo recorta las dos series, igual que el selector de Evolución */
    var corte = null, diasTramo = 0;
    for (var iR = 0; iR < RANGOS.length; iR++) if (RANGOS[iR].id === rangoHist && RANGOS[iR].d) {
      corte = U.sumarDias(U.hoyISO(), -RANGOS[iR].d);
      diasTramo = RANGOS[iR].d;
    }
    if (corte) {
      s1 = s1.filter(function (x) { return x.f >= corte; });
      s2 = s2.filter(function (x) { return x.f >= corte; });
    }

    var h = '<header><h2>' + U.esc(d.n) + '</h2>' +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">×</button></header>';

    h += '<div class="evo-rangos">';
    /* Aquí NO se ofrece «Todo». Esta ventana es la lectura reciente de una
       medida, y el histórico vive en un fichero aparte que sólo pide la
       gráfica grande de Evolución: con «Todo» puesto, el eje arrancaba donde
       empieza salud.json (agosto de 2025) y parecía que faltaban años de
       datos que sí están. Para la serie entera, Evolución → Todo. */
    RANGOS_HIST.forEach(function (r) {
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
      /* los mismos dos colores, lavados: son para la línea de cada día cuando
         lleva una media móvil encima. Grises no, porque con dos series —alta y
         baja, reposo y mínimo— habría dos líneas grises iguales y no se sabría
         cuál es cuál. Cada cruda conserva su color, sólo que apagado. */
      var AZUL_CLARO = "#bacde1", ROJO_CLARO = "#e6c3bb";
      var lineas = [], suaviza = false;
      if (d.objetivo) lineas.push({ v: d.objetivo, color: "#cfdcea", etq: d.etqObj || "objetivo" });
      if (d.techo) lineas.push({ v: d.techo, color: "#eccf9a", etq: d.etqTecho || "límite" });

      var series = [];
      /* Con barras el ORDEN importa: las dos tienen ya el mismo ancho, así que
         la que se dibuja después tapa a la otra. Primero el objetivo (claro, con
         su techo marcado) y encima lo hecho, que es lo que se quiere leer. */
      if (d.barras) {
        if (s2.length) series.push({ pts: s2, color: "#cfdcea", barras: true,
                                     marcarUltimo: false, techo: "#8fa8bf" });
        series.push({ pts: s1, color: AZUL, barras: true, marcarUltimo: false, tip: true });
      } else {
        /* ===== LAS DOS LÍNEAS, NO UNA (24-sep-2026) =====
           Carlos: «algunas gráficas se ven un poco embarulladas, no sé si es
           mejor usar una media móvil para suavizar el trazado».

           Lo era, y está medido sobre su serie real de FC en reposo del último
           año: va de 42 a 58 lpm —16 lpm de recorrido de verdad— y para
           contarlo el trazo sube y baja 885. Cincuenta y cinco veces más tinta
           que distancia. El salto medio de un día al siguiente es de 2,4 lpm y
           la desviación de toda la serie, 2,9: casi todo lo que se ve es ruido.
           Con la media móvil de 7 días el recorrido cae a 137.

           Pero la media VA ENCIMA DE LA CRUDA, no en su lugar. El aviso que da
           esta medida —lo dice el pie de la propia gráfica— es «cinco por
           encima de tu base tres días seguidos». Una media de 7 deja ese pico
           en dos latidos de bulto: alisar del todo borraría justo lo que hay
           que ver. Fina y clarita la de cada día, gruesa la media.

           Y sólo donde los datos lo piden. Medido en los últimos 90 días, el
           salto diario contra la dispersión de la serie:
             fcr 2,44 / 2,52 = 0,97   sueño 1,42 h / 1,17 h = 1,21
             pt_sueño 17,0 / 14,4 = 1,19        ← ruido del tamaño de la señal
             ctl 0,52 / 11,6 = 0,04   atl 0,95 / 5,13 = 0,19
             tensión: 6 días con toma en todo el año
           Forma y fatiga ya salen suaves de fábrica y la tensión tiene seis
           puntos: promediarlas no quitaría ruido, sólo añadiría retraso.

           El orden importa dos veces. Las crudas primero para que las medias
           queden dibujadas encima, y además porque el globo del dedo lee
           `series[0]` y `series[1]` (ver `o.par`): así enseña los dos valores
           medidos de ese día, que es lo que se le está preguntando. */
        var minT = (d.mediaDesde === undefined ? 35 : d.mediaDesde);
        suaviza = !!(d.media && s1.length > 3 && diasTramo > minT);
        if (suaviza) {
          /* la cruda se afina cuando hay más puntos que píxeles: con 365 días en
             una caja de móvil, a 0,8 de grosor el zigzag vuelve a ser una mancha
             y tapa la media. Es el mismo criterio que usan las noches de VFC. */
          var gCrudo = diasTramo > 200 ? 0.6 : 0.85;
          series.push({ pts: s1, color: AZUL_CLARO, colorPunto: AZUL, ancho: gCrudo });
          if (s2.length) series.push({ pts: s2, color: ROJO_CLARO, colorPunto: ROJO, ancho: gCrudo });
          series.push({ pts: mediaMovilDias(s1, d.media), color: AZUL, ancho: 1.8, marcarUltimo: false });
          if (s2.length) series.push({ pts: mediaMovilDias(s2, d.media), color: ROJO, ancho: 1.5, marcarUltimo: false });
        } else {
          series.push({ pts: s1, color: AZUL, ancho: 1.6, soloPuntos: s1.length < 3 });
          if (s2.length) series.push({ pts: s2, color: ROJO, ancho: 1.3, marcarUltimo: true });
        }
      }

      var todo = s1.concat(s2);
      var desde = todo.length ? todo.map(function (x) { return x.f; }).sort()[0] : U.hoyISO();

      /* LA VFC SE PINTA COMO EN EVOLUCIÓN: franja, puntos de color y noches.
         La cola de días de más es para que el primer día del tramo ya tenga
         franja; si no, la emergente empezaría siempre en blanco, que es justo
         donde se mira primero. */
      var opFranja = null, leyFranja = "";
      if (d.conFranja && d.noches) {
        var noches = d.noches({ desde: U.sumarDias(desde, -(VFC_VENTANA + 30)), hasta: U.hoyISO() });
        var frH = vfcConFranja(noches, desde, U.hoyISO());
        if (frH) {
          var COLORH = { verde: VFC_VERDE, naranja: VFC_NARANJA, rojo: VFC_ROJO_C, gris: "#9aa8a2" };
          var nochesTramo = noches.filter(function (x) { return x.f >= desde; });
          var diasH = diasEntre(desde, U.hoyISO());
          var cabenH = tocanNoches(diasH);
          series = [];
          if (cabenH) series.push({ pts: nochesTramo, color: "#8d9a94",
                                    ancho: diasH > 200 ? 0.5 : 1,
                                    guiones: true, marcarUltimo: false });
          ["gris", "verde", "naranja", "rojo"].forEach(function (e) {
            var pts = frH.puntos.filter(function (x) { return x.e === e; });
            if (pts.length) series.push({ pts: pts, color: COLORH[e], soloPuntos: true,
                                          radio: cabenH ? 2.4 : 1.4, marcarUltimo: false });
          });
          opFranja = { sup: frH.sup, inf: frH.inf, color: "#dfe4e2", opacidad: 0.85 };
          lineas = [];              // con franja, la raya de la base sobra y ensucia
          leyFranja = leyenda([
            { n: "equilibrada", color: VFC_VERDE },
            { n: "desequilibrada", color: VFC_NARANJA },
            { n: "baja", color: VFC_ROJO_C },
            { n: "lo normal en ti", color: "#dfe4e2" }
          ].concat(cabenH ? [{ n: "cada noche", color: "#8d9a94", guiones: true }] : [])) +
            '<div class="evo-rangos noches">' + botonNoches(diasH) + "</div>";
        }
      }

      h += '<div class="hist-graf">' + grafica({
        desde: desde, hasta: U.hoyISO(), alto: 120, arriba: d.u, lineasH: lineas, caja: "modal",
        bandas: bandasFarmaco({ desde: desde, hasta: U.hoyISO() }),
        franja: opFranja,
        alt: d.n, series: series, unidadTip: d.u, par: d.par,
        explica: opFranja
          ? "Cada punto es la media de 7 noches; la franja, lo normal en ti. " +
            "Pasa el dedo por encima para ver cada valor con su fecha."
          : "Tu serie de " + d.n + " en el tramo elegido" +
            (d.objetivo ? ", con la línea del objetivo" : "") +
            (d.techo ? " y la del límite" : "") +
            (suaviza ? ". La línea clara es el dato de cada día y la gruesa su media de " +
                       d.media + " días, que es la que marca la tendencia" : "") +
            ". Pasa el dedo por encima para ver cada valor con su fecha."
      }) + leyFranja + "</div>";

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

    /* El pie puede ser una función: hay medidas cuyo texto habla de «la línea
       gruesa» y esa línea no siempre está. El peso, sin ir más lejos, se
       suaviza desde el primer tramo, pero con tres pesadas en un mes no hay
       media que dibujar y el pie se quedaba señalando una línea que no existe.
       Un pie que describe lo que no se ve es un pie que se deja de leer. */
    var pieTx = typeof d.pie === "function" ? d.pie(suaviza) : d.pie;
    if (pieTx) h += '<p class="hist-pie">' + U.esc(pieTx) + "</p>";
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
    peso: "baja", cintura: "baja", cuello: null, tobillo: null, brazo: null, muslo: null, gemelo: null,
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
               texto: "esta semana se juzga por bloques hechos, no por carga" };
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
      : (bloque === "rampa") ? htmlRampa()
      : (bloque === "casos") ? htmlCasos()
      : (bloque === "material") ? htmlMaterial()
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
      /* No siempre scrollea la ventana: según el ancho, quien se mueve es un
         contenedor de encima. Guardamos la posición de TODOS los que pueden
         hacerlo —sobreviven al repintado, porque sólo se sustituye el interior
         de la vista— y luego se devuelven todos. Antes sólo se guardaba la
         ventana, y donde no era la ventana la página saltaba arriba. */
      var pilas = [], nodo = document.getElementById("vista-entreno");
      while (nodo) {
        if (nodo.scrollTop) pilas.push({ el: nodo, top: nodo.scrollTop });
        nodo = nodo.parentNode && nodo.parentNode.nodeType === 1 ? nodo.parentNode : null;
      }
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
      pilas.forEach(function (p) { try { p.el.scrollTop = p.top; } catch (e) {} });
      if (clave) {
        var n = document.querySelector(clave);
        if (n) {
          try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); }
          /* los input[type=number] no dejan tocar la selección en algunos
             navegadores: si protesta, basta con tener el foco */
          try { if (ini !== null) n.setSelectionRange(ini, fin); } catch (e) {}
          window.scrollTo(0, y);
          pilas.forEach(function (p) { try { p.el.scrollTop = p.top; } catch (e) {} });
          /* Último recurso: si con todo eso la casilla se ha quedado fuera de
             la pantalla, se la trae sin mover el resto. */
          var r = n.getBoundingClientRect && n.getBoundingClientRect();
          if (r && (r.top < 0 || r.bottom > (window.innerHeight || 0))) {
            try { n.scrollIntoView({ block: "center" }); } catch (e) {}
          }
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

  /* ======================= RAMPA DE ENTRENO =======================
     Una página donde mirar lo relevante del plan (Carlos, 23-sep-2026):
     dónde estás, a dónde va la rampa, cómo se espera que vaya la curva, por qué
     se eligió esta pendiente y qué hay que hacer en cada fecha.

     Todo se CALCULA de `datos/plan.js` y de salud.json. Nada está escrito a
     mano: si mañana cambia la rampa, esta página cambia sola. Era el problema
     de tener el porqué en comentarios dentro de los ficheros — ahí no lo ve
     nadie, y se queda viejo sin que se note. */

  var RAMPA_SEMANAS = 41;         // hasta julio de 2027, que es lo que se proyecta

  /* Lo que cuesta una sesión, con los ritmos MEDIDOS del plan. */
  function costeSesion(s) {
    /* EL BLOQUE LARGO TRAE SU PRECIO PUESTO. Se paga con la fórmula medida
       (horas + desnivel), no con un ritmo por familia: seis horas a pie por el
       llano y seis en bici por un puerto no cuestan lo mismo ni de lejos.
       (24-sep-2026.) */
    if (s.pts > 0) return s.pts;
    /* el bloque trae su familia puesta; el texto solo se mira cuando no la hay */
    var r = (P.ritmos || {})[s.fam || familia(s.t)];
    if (!r || !(s.min > 0)) return 0;
    return (s.min / 60) * (r.v || 0);
  }

  /* El calendario entero de la rampa: cada semana con su carga, su talla, lo que
     cuesta su plantilla y el factor por el que habría que escalar las sesiones. */
  function calendarioRampa() {
    var out = [], f = P.rampa[0].desde;
    for (var i = 0; i < RAMPA_SEMANAS; i++) {
      var p = peldano(i);
      var dias = (i === 0) ? (diasEntre(P.rampa[0].desde, P.rampa[0].hasta) + 1) : 7;
      var hasta = U.sumarDias(f, dias - 1);
      /* lo que cuesta su plantilla esos días, para saber cuánto hay que escalar */
      var coste = 0, minutos = 0, dia;
      for (var d = 0; d < dias; d++) {
        dia = U.sumarDias(f, d);
        sesionesDe(dia, { n: p.n, desde: f, hasta: hasta }, p.talla).forEach(function (x) {
          coste += costeSesion(x);
          if (costeSesion(x) > 0) minutos += x.min || 0;
        });
      }
      out.push({ n: p.n, desde: f, hasta: hasta, dias: dias, carga: p.carga,
                 talla: p.talla, nota: p.nota, coste: coste, minutos: minutos,
                 factor: coste > 0 ? p.carga / coste : 1,
                 /* 25-sep-2026: ANCLADO AL PRINCIPIO. La nota de las semanas de
                    crucero es «Crucero: tres semanas y la cuarta de descarga», y
                    sin el ^ TODAS salían marcadas como descarga. */
                 descarga: /^\s*descarga/i.test(p.nota || "") });
      f = U.sumarDias(hasta, 1);
    }
    return out;
  }

  /* La curva: CTL a 42 días y ATL a 7, igual que intervals. Se arranca del
     último dato REAL que haya, no de cero: si no, la proyección empieza en un
     sitio donde no estás. */
  function curvaPrevista(cal) {
    var hoy = U.hoyISO();
    var uC = ultimoDato("ctl"), uA = ultimoDato("atl");
    var ctl = uC ? uC.v : null, atl = uA ? uA.v : null;
    if (ctl === null || ctl === undefined) ctl = 10;
    if (atl === null || atl === undefined) atl = ctl;
    var ser = [];
    /* MODELO APROXIMADO DE REPARTO (Carlos, 25-sep-2026). La simulación NO sigue
       las sesiones día a día: la salida larga se declara cada semana y, sin
       declarar, la propuesta metía el 30 % en un solo día y dibujaba picos que
       no son el plan. Aquí la carga de la semana se reparte 14 % de lunes a
       viernes, 30 % el sábado y nada el domingo. Es la curva, no el plan. */
    var REPARTO = [0, 0.14, 0.14, 0.14, 0.14, 0.14, 0.30];   // getDay(): 0 domingo
    function diaSem(iso) { return new Date(iso + "T12:00:00").getDay(); }
    cal.forEach(function (sem) {
      var suma = 0, d;
      for (d = 0; d < sem.dias; d++) suma += REPARTO[diaSem(U.sumarDias(sem.desde, d))];
      var real7 = 0;
      for (d = 0; d < sem.dias; d++) {
        var iso = U.sumarDias(sem.desde, d);
        var carga = suma > 0 ? sem.carga * REPARTO[diaSem(iso)] / suma : sem.carga / sem.dias;
        /* los días ya vividos llevan lo que de verdad midió el reloj */
        if (iso <= hoy) {
          var real = cargaSemana(iso, iso);
          if (real !== null) carga = real;
        }
        real7 += carga;
        ctl += (carga - ctl) / 42;
        atl += (carga - atl) / 7;
        ser.push({ f: iso, c: carga, ctl: ctl, atl: atl, fo: ctl - atl,
                   sn: sem.n, obj: sem.carga, desc: sem.descarga });
      }
      /* la carga de la semana tal como sale en la curva (real + prevista) */
      ser.forEach(function (x) { if (x.sn === sem.n) x.semC = real7; });
    });
    return ser;
  }

  /* El dibujo de la curva. Dos paneles: carga+CTL+ATL arriba, balance abajo con
     sus bandas, que es donde se ve si el plan te mete en sobreentrenamiento. */
  /* El recuadro al pasar el ratón o el dedo por la curva: la semana, su
     carga, la forma y la fatiga de ese día. */
  var curvaSer = null, curvaGeo = null;
  function datoCurva(ev) {
    var svg = ev.target.closest ? ev.target.closest("svg[data-curva]") : null;
    if (!svg || !curvaSer || !curvaGeo) return false;
    var r = svg.getBoundingClientRect(), g = curvaGeo;
    var sx = (ev.clientX - r.left) / r.width * g.W;
    var i = Math.round((sx - g.x0) / g.ancho * (g.n - 1));
    i = Math.max(0, Math.min(g.n - 1, i));
    var x = curvaSer[i], cx = g.x0 + i * g.ancho / (g.n - 1);
    var cur = document.getElementById("curva-cursor"), caja = document.getElementById("curva-dato");
    if (cur) { cur.setAttribute("x1", cx); cur.setAttribute("x2", cx); cur.style.display = ""; }
    if (caja) {
      var hoy = U.hoyISO();
      caja.innerHTML = "<b>" + fechaCorta(x.f) + "</b> · semana " + x.sn + (x.desc ? " (descarga)" : "") +
        (x.f <= hoy ? " · <i>medido</i>" : " · <i>previsto</i>") + "<br>" +
        "Carga de la semana: <b>" + num(x.semC, 0) + "</b>" +
        (Math.abs(x.semC - x.obj) > 0.5 ? " <small>(objetivo " + num(x.obj, 0) + ")</small>" : "") + "<br>" +
        '<span style="color:#2f95cc">Forma</span> <b>' + num(x.ctl, 0) + "</b> · " +
        '<span style="color:#5b3fa8">Fatiga</span> <b>' + num(x.atl, 0) + "</b> · " +
        "Balance <b>" + (x.fo >= 0 ? "+" : "") + num(x.fo, 0) + "</b>";
      caja.style.display = "";
      var px = (cx / g.W) * r.width, w = caja.offsetWidth;
      caja.style.left = Math.max(0, Math.min(r.width - w, px + (px > r.width / 2 ? -w - 10 : 10))) + "px";
    }
    return true;
  }
  function quitarDatoCurva() {
    var cur = document.getElementById("curva-cursor"), caja = document.getElementById("curva-dato");
    if (cur) cur.style.display = "none";
    if (caja) caja.style.display = "none";
  }

  function svgCurva(ser) {
    if (!ser.length) return "";
    var W = 1000, H = 190, HF = 96, n = ser.length;
    /* 25-sep-2026: DOS ESCALAS. Con una sola, las barras de carga del día
       (cientos de puntos) aplastaban forma y fatiga contra el suelo. Ahora las
       líneas usan su propia escala (izquierda) y las barras la suya (derecha). */
    var mx = 1, mxB = 1;
    ser.forEach(function (x) { mx = Math.max(mx, x.ctl, x.atl); mxB = Math.max(mxB, x.c); });
    mx = Math.ceil(mx * 1.1 / 10) * 10;
    mxB = Math.ceil(mxB / 50) * 50;
    function X(i) { return 36 + i * (W - 76) / (n - 1); }
    function Y(v) { return H - (v / mx) * (H - 10); }
    function YB(v) { return H - (v / mxB) * (H - 10); }
    var ejes = "";
    [0, 0.5, 1].forEach(function (k) {
      var y = (H - k * (H - 10)).toFixed(0);
      ejes += '<line x1="36" y1="' + y + '" x2="' + (W - 40) + '" y2="' + y + '" stroke="#eef2f5"/>' +
        '<text x="30" y="' + (+y + 3) + '" font-size="9" fill="#4fb3e8" text-anchor="end">' + Math.round(mx * k) + "</text>" +
        '<text x="' + (W - 34) + '" y="' + (+y + 3) + '" font-size="9" fill="#9aa8c4">' + Math.round(mxB * k) + "</text>";
    });
    var barras = "", ctl = "", atl = "", forma = "", meses = "";
    var fmin = -40, fmax = 25;
    function Yf(v) { return 6 + (fmax - v) / (fmax - fmin) * (HF - 16); }
    ser.forEach(function (x, i) {
      if (x.c > 0) barras += '<rect x="' + (X(i) - 1.1).toFixed(1) + '" y="' + YB(x.c).toFixed(1) +
        '" width="2.2" height="' + (H - YB(x.c)).toFixed(1) + '" fill="#b9c6e2" opacity=".55"/>';
      ctl += X(i).toFixed(1) + "," + Y(x.ctl).toFixed(1) + " ";
      atl += X(i).toFixed(1) + "," + Y(x.atl).toFixed(1) + " ";
      forma += X(i).toFixed(1) + "," + Yf(Math.max(fmin, Math.min(fmax, x.fo))).toFixed(1) + " ";
      if (x.f.slice(8) === "01") {
        meses += '<line x1="' + X(i).toFixed(0) + '" y1="0" x2="' + X(i).toFixed(0) + '" y2="' + H +
          '" stroke="#e3e9ef" stroke-dasharray="2 4"/><text x="' + (X(i) + 3).toFixed(0) +
          '" y="' + (H + 13) + '" font-size="9" fill="#8a97a3">' + MES_C[+x.f.slice(5, 7) - 1] + "</text>";
      }
    });
    var area = "36," + H + " " + ctl + X(n - 1).toFixed(1) + "," + H;
    curvaSer = ser; curvaGeo = { W: W, n: n, x0: 36, ancho: W - 76 };
    var min = ser.reduce(function (a, x) { return Math.min(a, x.fo); }, 0);
    var rojos = ser.filter(function (x) { return x.fo < -30; }).length;
    return '<div class="curva-caja" style="position:relative">' +
      '<svg class="ramp-svg" data-curva="1" style="touch-action:pan-y;cursor:crosshair" viewBox="0 0 ' + W + " " + (H + 18) + '" preserveAspectRatio="xMidYMid meet">' +
      ejes + '<line x1="36" y1="' + H + '" x2="' + (W - 40) + '" y2="' + H + '" stroke="#d6dde4"/>' +
      meses +
      '<polygon points="' + area + '" fill="#dcecf7" opacity=".6"/>' + barras +
      '<polyline points="' + atl + '" fill="none" stroke="#5b3fa8" stroke-width="1" opacity=".8"/>' +
      '<polyline points="' + ctl + '" fill="none" stroke="#4fb3e8" stroke-width="2.3"/>' +
      '<line id="curva-cursor" x1="0" y1="0" x2="0" y2="' + H + '" stroke="#1f3b57" stroke-width="1" ' +
        'stroke-dasharray="3 3" style="display:none"/>' +
      "</svg>" +
      '<div id="curva-dato" style="display:none;position:absolute;top:4px;pointer-events:none;' +
        'background:#fff;border:1px solid #d6dde4;border-radius:8px;padding:6px 9px;font-size:12px;' +
        'line-height:1.45;box-shadow:0 2px 8px rgba(0,0,0,.08);white-space:nowrap"></div></div>' +
      leyenda([{ n: "forma (CTL)", color: "#4fb3e8" }, { n: "fatiga (ATL)", color: "#5b3fa8" },
               { n: "carga del día (escala de la derecha)", color: "#b9c6e2" }]) +
      '<p class="ramp-sub">Balance <small>— la banda roja es sobreentrenamiento</small></p>' +
      '<svg class="ramp-svg" viewBox="0 0 ' + W + " " + HF + '" preserveAspectRatio="xMidYMid meet">' +
      '<rect x="36" y="' + Yf(25).toFixed(0) + '" width="' + (W - 44) + '" height="' + (Yf(5) - Yf(25)).toFixed(0) + '" fill="#fdf6e6"/>' +
      '<rect x="36" y="' + Yf(5).toFixed(0) + '" width="' + (W - 44) + '" height="' + (Yf(-10) - Yf(5)).toFixed(0) + '" fill="#eaf2fb"/>' +
      '<rect x="36" y="' + Yf(-10).toFixed(0) + '" width="' + (W - 44) + '" height="' + (Yf(-30) - Yf(-10)).toFixed(0) + '" fill="#eaf6ec"/>' +
      '<rect x="36" y="' + Yf(-30).toFixed(0) + '" width="' + (W - 44) + '" height="' + (Yf(-40) - Yf(-30)).toFixed(0) + '" fill="#fbeceb"/>' +
      '<text x="30" y="' + (Yf(5) + 3).toFixed(0) + '" font-size="9" fill="#93a3b0" text-anchor="end">+5</text>' +
      '<text x="30" y="' + (Yf(-30) + 3).toFixed(0) + '" font-size="9" fill="#93a3b0" text-anchor="end">−30</text>' +
      '<polyline points="' + forma + '" fill="none" stroke="#3f7ea8" stroke-width="1.4"/>' +
      "</svg>" +
      '<div class="ramp-aviso' + (rojos ? " mal" : "") + '">' +
        (rojos
          ? "Ojo: el plan te mete <b>" + rojos + (rojos === 1 ? " día" : " días") + "</b> en zona de sobreentrenamiento."
          : "Lo más bajo que llega el balance es <b>" + num(min, 0) + "</b>, y el rojo empieza en −30: " +
            "<b>cero días en zona de sobreentrenamiento</b> en los " + ser.length + " de la proyección. " +
            "Y no es entrenando menos, es repartiendo la carga dentro de la semana y bajando de verdad cada cuarta.") +
      "</div>";
  }

  function htmlRampa() {
    if (!P || !P.rampa) return sinDatos("No hay plan cargado");
    var volver = '<button type="button" class="ent-atras" data-volver="1">' + FLECHA + "Volver a Entrenamiento</button>";
    var h = volver;
    var hoy = U.hoyISO(), cal = calendarioRampa();
    var sem = null, i;
    for (i = 0; i < cal.length; i++) if (hoy >= cal[i].desde && hoy <= cal[i].hasta) sem = cal[i];

    /* ---- dónde estás hoy ---- */
    var uCtl = ultimoDato("ctl"), uAtl = ultimoDato("atl");
    var ctl = uCtl ? uCtl.v : null, atl = uAtl ? uAtl.v : null;
    /* si el dato no es de hoy se dice de cuándo es: un número sin fecha que
       lleva tres días quieto engaña más que unas rayas */
    var deCuando = "";
    if (uCtl && uCtl.atras > 0) {
      deCuando = " · medido el " + fechaCorta(uCtl.f) +
        (uCtl.atras === 1 ? " (ayer)" : " (hace " + uCtl.atras + " días)");
    }
    h += '<div class="tarjeta evo-t"><div class="evo-cab"><h2>Dónde estás hoy</h2></div>' +
      '<p class="nota-peque evo-pie">' +
        (sem ? "Semana " + sem.n + " de la rampa · del " + fechaCorta(sem.desde) + " al " +
               fechaCorta(sem.hasta) + " · talla " + sem.talla +
               (sem.descarga ? " · DESCARGA" : "")
             : "Hoy no caes dentro de la rampa.") + U.esc(deCuando) + "</p>" +
      '<div class="ramp-datos">' +
        ramoDato("Forma (CTL)", ctl === null ? "—" : num(ctl, 0), "") +
        ramoDato("Fatiga (ATL)", atl === null ? "—" : num(atl, 0), "") +
        ramoDato("Balance", (ctl === null || atl === null) ? "—" :
                 (ctl - atl >= 0 ? "+" : "") + num(ctl - atl, 0),
                 (ctl !== null && atl !== null && ctl - atl >= 0) ? "v" : "") +
        (sem ? ramoDato("Objetivo semana", num(sem.carga, 0), "") : "") +
      "</div></div>";

    /* ---- la curva ---- */
    h += '<div class="tarjeta evo-t"><div class="evo-cab"><h2>Cómo va a ir la curva</h2></div>' +
      '<p class="nota-peque evo-pie">Proyección día a día hasta el final de la rampa. ' +
      'Los días ya vividos llevan lo que midió el reloj; los que vienen, lo que pide el plan. ' +
      'CTL a 42 días y ATL a 7, como intervals.</p>' +
      svgCurva(curvaPrevista(cal)) + "</div>";

    /* ---- la rampa ---- */
    h += '<div class="tarjeta evo-t"><div class="evo-cab"><h2>La rampa</h2></div>' +
      '<p class="nota-peque evo-pie">Las semanas en verde son descargas. No son opcionales: son lo que ' +
      'faltaba en 2025, y por eso llegó noviembre.</p><div class="ramp-tabla"><table>' +
      "<tr><th>Sem</th><th>Desde</th><th>Talla</th><th class=\"d\">Objetivo</th>" +
      "<th class=\"d\">Sesiones</th><th class=\"d\">Horas</th></tr>";
    cal.forEach(function (x, k) {
      if (k > 16 && !x.descarga && k % 4 !== 0 && k !== cal.length - 1) return;
      if (k === 17) h += '<tr class="sep"><td colspan="6">· · · sigue subiendo hasta el techo · · ·</td></tr>';
      h += '<tr class="' + (x.descarga ? "desc" : "") + (hoy >= x.desde && hoy <= x.hasta ? " ahora" : "") + '">' +
        '<td class="d">' + x.n + "</td><td>" + fechaCorta(x.desde) + '</td><td class="t">' + x.talla + "</td>" +
        '<td class="d b">' + num(x.carga, 0) + "</td>" +
        '<td class="d t">' + (Math.abs(x.factor - 1) < 0.06 ? "tal cual"
            : (x.factor < 1 ? "−" : "+") + Math.round(Math.abs(x.factor - 1) * 100) + "%") + "</td>" +
        '<td class="d g">' + num(x.minutos * x.factor / 60, 1) + " h</td></tr>";
    });
    h += "</table></div></div>";

    /* ---- cómo está construida ---- */
    var rc = (P.ritmos || {}).caminar || {}, rb = (P.ritmos || {}).bici || {};
    h += '<div class="tarjeta evo-t"><div class="evo-cab"><h2>Cómo está construida</h2></div>' +
      '<p class="nota-peque evo-pie">Tres reglas, y las tres salen de medir, no de suponer.</p>' +
      regla(1, "Se parte de lo que <em>cuestan de verdad</em> las sesiones, medido contra tu reloj: " +
               "caminar te sale a <em>" + num(rc.v || 0, 0) + " puntos por hora</em> y la bici a " +
               num(rb.v || 0, 0) + ". Los ritmos se vuelven a medir cada pocas semanas.") +
      regla(2, "Las semanas de construcción <em>suben</em>, y cada cuarta <em>baja de verdad</em>, " +
               "sobre la última de construcción y no sobre el acumulado — si no, dos descargas " +
               "seguidas se comen la una a la otra y la rampa se desinfla sola.") +
      regla(3, "Las sesiones <em>se escalan desde el objetivo</em>: la talla dice la forma —qué " +
               "haces cada día y en qué proporción— y los minutos salen de la carga de esa " +
               "semana. Es la columna «Sesiones» de la tabla de arriba.") +
      "</div>";

    /* ---- las revisiones del domingo ---- */
    h += '<div class="tarjeta evo-t"><div class="evo-cab"><h2>Revisiones del domingo</h2></div>' +
      '<p class="nota-peque evo-pie">El pase se dicta solo al cerrar cada semana y queda aquí. ' +
      'Se recalcula durante tres días por si el reloj llega tarde, y después se congela.</p>';
    var reg = registroPase(), claves = Object.keys(reg).sort().reverse();
    if (!claves.length) {
      h += '<p class="nota-peque">Todavía no se ha cerrado ninguna semana.</p>';
    } else {
      h += '<div class="ramp-pases">';
      claves.slice(0, 12).forEach(function (k) {
        var r = reg[k];
        h += '<div class="ramp-pase ' + U.esc(r.v || "") + '">' +
          "<b>Semana " + (r.n || "?") + "</b>" +
          '<span class="f">' + fechaCorta(k) + "</span>" +
          '<span class="v">' + U.esc(((P.pase && P.pase.veredictos && P.pase.veredictos[r.v]) || {}).n || r.v || "") + "</span>" +
          (r.porque ? '<small>' + U.esc(r.porque) + "</small>" : "") +
          (r.d ? '<em>' + (r.d > 0 ? "+" : "") + r.d + " peldaño" + (Math.abs(r.d) > 1 ? "s" : "") + "</em>" : "") +
          "</div>";
      });
      h += "</div>";
    }
    h += "</div>";

    /* ---- hablar del plan ---- */
    h += '<div class="tarjeta evo-t"><div class="evo-cab"><h2>Hablar del plan</h2></div>' +
      '<p class="nota-peque evo-pie">Abre el proyecto para discutir la rampa, cambiar la pendiente o ' +
      'revisar lo que sea con los datos delante.</p>' +
      '<a class="btn principal ramp-chat" href="' + PROYECTO_URL + '" target="_blank" rel="noopener">' +
      'Abrir el proyecto y hablar del plan</a></div>';

    return h;
  }

  var PROYECTO_URL = "https://claude.ai/project/01a0ae2e-e01a-7148-a7cb-8a976a092827";

  function ramoDato(rot, valor, clase) {
    return '<div class="ramp-dato ' + (clase || "") + '"><span>' + U.esc(rot) + "</span><b>" +
      U.esc(String(valor)) + "</b></div>";
  }
  function regla(n, txt) {
    return '<div class="ramp-regla"><b>' + n + "</b><p>" + txt + "</p></div>";
  }
  function fechaCorta(iso) {
    if (!iso) return "";
    return (+iso.slice(8)) + " " + MES_C[+iso.slice(5, 7) - 1];
  }

  /* ---------- la pestaña Casos ---------- */

  var MES_C = ["ene", "feb", "mar", "abr", "may", "jun",
               "jul", "ago", "sep", "oct", "nov", "dic"];

  /* «2023-02-20» + «2023-03-20» -> «feb – mar 2023». El año se dice una vez
     cuando es el mismo, que es como se escribe a mano. */
  function periodoCaso(desde, hasta) {
    function trozo(f) {
      if (!f) return null;
      var a = f.slice(0, 4), m = parseInt(f.slice(5, 7), 10);
      return { a: a, m: (m >= 1 && m <= 12) ? MES_C[m - 1] : null };
    }
    var d = trozo(desde), h = trozo(hasta);
    if (!d) return "";
    if (!h) return "desde " + (d.m ? d.m + " " : "") + d.a;
    if (d.a === h.a) {
      if (d.m === h.m) return (d.m ? d.m + " " : "") + d.a;
      return (d.m || "") + " – " + (h.m || "") + " " + d.a;
    }
    return (d.m ? d.m + " " : "") + d.a + " – " + (h.m ? h.m + " " : "") + h.a;
  }

  /* 106.5 -> «106,5». Un decimal, y sin el «,0» cuando no hace falta. */
  function coma(v) {
    if (v == null || v === "") return "";
    var n = Math.round(Number(v) * 10) / 10;
    return String(n).replace(".", ",");
  }

  function nombreFamilia(id) {
    var f = (Casos.datos && Casos.datos.familias) || [], i;
    for (i = 0; i < f.length; i++) if (f[i].id === id) return f[i].n;
    return id || "";
  }

  function nombreCausa(id) {
    var c = (Casos.datos && Casos.datos.causas) || [], i;
    for (i = 0; i < c.length; i++) if (c[i].id === id) return c[i].n;
    return id || "";
  }

  /* Los documentos que pasan los dos filtros. Los dos se suman: familia
     «Episodios» + causa «Calor» son los episodios con calor, no la unión. */
  function casosFiltrados() {
    return Casos.lista().filter(function (x) {
      if (casoFam && x.familia !== casoFam) return false;
      if (casoCausa && (x.causas || []).indexOf(casoCausa) < 0) return false;
      return true;
    });
  }

  function chipsCasos() {
    var fams = (Casos.datos && Casos.datos.familias) || [];
    var todas = Casos.lista();
    /* sólo se ofrecen las causas que alguien lleva puestas: una etiqueta que
       no filtra nada es una etiqueta que estorba */
    var usadas = {}, i, j, c;
    for (i = 0; i < todas.length; i++) {
      c = todas[i].causas || [];
      for (j = 0; j < c.length; j++) usadas[c[j]] = 1;
    }
    var causas = ((Casos.datos && Casos.datos.causas) || []).filter(function (x) {
      return usadas[x.id];
    });

    function chip(attr, valor, texto, activo, cuantos) {
      return '<button type="button" class="ent-chip' + (activo ? " si" : "") + '" ' +
        attr + '="' + U.esc(valor == null ? "" : valor) + '">' + U.esc(texto) +
        (cuantos == null ? "" : ' <span class="n">' + cuantos + "</span>") + "</button>";
    }

    var h = '<div class="casos-filtros">';
    h += '<div class="casos-fila">' + chip("data-caso-fam", "", "Todos", !casoFam, todas.length);
    fams.forEach(function (f) {
      var n = todas.filter(function (x) { return x.familia === f.id; }).length;
      if (!n) return;
      h += chip("data-caso-fam", f.id, f.n, casoFam === f.id, n);
    });
    h += "</div>";

    if (causas.length) {
      h += '<div class="casos-fila casos-causas">' +
        '<span class="casos-eti">Por causa:</span>' +
        chip("data-caso-causa", "", "Todas", !casoCausa, null);
      causas.forEach(function (x) {
        h += chip("data-caso-causa", x.id, x.n, casoCausa === x.id, null);
      });
      h += "</div>";
    }
    return h + "</div>";
  }

  function fichaCaso(x) {
    var pendiente = !x.fichero;
    var h = '<article class="caso' + (x.destacado ? " destacado" : "") +
      (pendiente ? " pendiente" : "") + '">' +
      '<div class="caso-alto">' +
        '<span class="caso-fam">' + U.esc(nombreFamilia(x.familia)) + "</span>" +
        '<span class="caso-fecha">' + U.esc(periodoCaso(x.desde, x.hasta)) + "</span>" +
      "</div>" +
      "<h3>" + U.esc(x.titulo || "") + "</h3>" +
      (x.subtitulo ? '<p class="caso-sub">' + U.esc(x.subtitulo) + "</p>" : "") +
      '<p class="caso-trata">' + U.esc(x.de_que_trata || "") + "</p>";

    /* El coste es lo que hace que un caso se recuerde: qué forma había, hasta
       dónde cayó y cuánto costó volver. */
    var c = x.coste;
    if (c) {
      h += '<div class="caso-coste">' +
        (c.forma_antes != null && c.suelo != null
          ? "<span><b>" + coma(c.forma_antes) + "</b> → <b>" +
            coma(c.suelo) + "</b> de forma</span>" : "") +
        (c.dias_en_volver != null
          ? "<span><b>" + c.dias_en_volver + "</b> días en volver</span>" : "") +
        "</div>";
    }

    if ((x.causas || []).length) {
      h += '<div class="caso-causas">';
      x.causas.forEach(function (id) {
        h += '<button type="button" class="caso-causa' + (casoCausa === id ? " si" : "") +
          '" data-caso-causa="' + U.esc(id) + '">' + U.esc(nombreCausa(id)) + "</button>";
      });
      h += "</div>";
    }

    h += '<div class="caso-pie">';
    if (pendiente) {
      h += '<span class="caso-espera">' + U.esc(x.pendiente || "Todavía no existe") + "</span>";
    } else {
      h += '<button type="button" class="caso-abrir" data-caso-pdf="' + U.esc(x.fichero) +
        '">Abrir el folio</button>' +
        (x.paginas ? '<span class="caso-pags">' + x.paginas +
                     (x.paginas === 1 ? " pág." : " págs.") + "</span>" : "");
    }
    return h + "</div></article>";
  }


  /* ==================== MATERIAL Y MOVIMIENTOS ====================

     Dos listas que se hablan: el material dice QUÉ PERMITE y cada movimiento
     dice QUÉ NECESITA. De ahí sale lo único que hace útil un inventario dentro
     de una app —si no, es una lista que se mira una vez—: la pantalla marca qué
     se puede hacer hoy y qué no, y el día que entre un banco se encienden solos
     la búlgara, el empuje de cadera y el press inclinado.

     El material SE EDITA y vive en el estado de la app, así que viaja con la
     sincronización. Los movimientos NO se editan: son vocabulario, y su gracia
     es justamente que no cambie.

     Los nombres de los movimientos son los del catálogo de Garmin, y los
     músculos NO se declaran aquí: se le preguntan a `ActividadKHB.zonasDe`, que
     es la misma función que pinta los muñecos con lo que llega del reloj. Si un
     movimiento sale sin músculos, es que tampoco se va a clasificar solo. */

  var CAPACIDAD = {
    mancuerna: "Mancuernas",
    rusa:      "Pesa rusa",
    tubo:      "Tubos con asas",
    anclaje:   "Anclaje de puerta",
    anilla:    "Bandas de anilla",
    plana:     "Bandas planas",
    tobillera: "Tobilleras",
    apoyo:     "Apoyo firme a 40 cm",
    alto:      "Anclaje alto",
    barra:     "Barra de dominadas",
    esterilla: "Esterilla"
  };
  var ORDEN_CAP = ["mancuerna", "rusa", "tubo", "anclaje", "anilla", "plana",
                   "tobillera", "apoyo", "alto", "barra", "esterilla"];

  /* El inventario levantado con Carlos el 21-sep-2026. Se siembra UNA vez; a
     partir de ahí manda lo que él tenga guardado, porque lo puede editar. */
  var MATERIAL_BASE = [
    { id: "manc",  n: "Mancuernas",         d: "2×10 · 2×7,5 · 2×3 · 2×2 kg", da: ["mancuerna"] },
    { id: "rusa6", n: "Pesa rusa de 6 kg",  d: "", da: ["rusa"] },
    { id: "rusa4", n: "Pesa rusa de 4 kg",  d: "", da: ["rusa"] },
    { id: "tubos", n: "Tubos con asas",     d: "4,5 · 9 · 13,5 · 18 · 23 kg, acoplables hasta 68", da: ["tubo"] },
    { id: "ancl",  n: "Anclaje de puerta",  d: "del juego de tubos", da: ["anclaje"] },
    { id: "tobi",  n: "Tobilleras",         d: "del juego de tubos", da: ["tobillera"] },
    { id: "anill", n: "Bandas de anilla",   d: "amarilla · roja 7-16 · negra 11-29 · morada 16-39 · verde 23-57 kg", da: ["anilla"] },
    { id: "plana", n: "Bandas planas",      d: "5 · 7 · 9 · 11 kg", da: ["plana"] },
    { id: "silla", n: "Silla ergonómica de rodillas", d: "bloqueada en la habitación de entrenar — press y empuje de cadera", da: ["apoyo"] },
    { id: "sofa",  n: "Sofá",               d: "el otro apoyo a la altura buena", da: ["apoyo"] },
    { id: "este",  n: "Esterilla",          d: "", da: ["esterilla"] },
    { id: "anil", n: "Anclajes de la terraza", d: "anclajes de escalada en el muro — el punto alto del que colgar", da: ["alto"] },
    /* ---- llegado el 21 y el 24 de septiembre ---- */
    { id: "anillas", n: "Anillas", d: "cuelgan de los anclajes de la terraza — tirón vertical y fondos", da: ["anillas"] },
    { id: "bjalon",  n: "Barra de jalón", d: "85 cm con mosquetón — se engancha a los tubos", da: ["jalon"] },
    { id: "circ",    n: "Bandas de tela circulares", d: "para cadera y glúteo medio — no se enrollan como las planas", da: ["circular"] }
  ];

  /* `pide` es una lista de GRUPOS: dentro de un grupo vale cualquiera, y hay que
     cumplir todos los grupos. Vacío = solo hace falta el suelo. */
  var MOVIMIENTOS = [
    /* ---- empuje ---- */
    { n: "Press de banca",        pide: [["mancuerna"], ["apoyo"]], nota: "Espalda apoyada, cadera en el suelo" },
    { n: "Flexiones",             pide: [], nota: "Las manos altas lo hacen más fácil" },
    { n: "Press de hombros",      pide: [["mancuerna", "tubo"]], nota: "De pie o sentado" },
    { n: "Elevación lateral",     pide: [["mancuerna", "plana"]], nota: "Con poco peso sobra" },
    { n: "Fondos",                pide: [["apoyo"]], nota: "Manos atrás en el borde" },
    { n: "Fondos en anillas",     pide: [["anillas"]], bl: "empuje", nota: "Duros de verdad: empezar con los pies en el suelo" },
    { n: "Flexiones en anillas",  pide: [["anillas"]], bl: "empuje", nota: "Las anillas se mueven: el centro trabaja el doble" },
    { n: "Extensión de tríceps",  pide: [["mancuerna", "tubo"]], nota: "" },

    /* ---- tirón ---- */
    { n: "Remo",                  pide: [["tubo"], ["anclaje"]], nota: "El que más kilos te deja mover" },
    { n: "Remo a una mano",       pide: [["mancuerna"], ["apoyo"]], nota: "Rodilla y mano en el apoyo" },
    { n: "Jalón",                 pide: [["tubo"], ["alto", "anclaje"]], nota: "Mejor desde los anclajes que desde la puerta; con la barra de jalón, agarre ancho" },
    { n: "Dominadas",             pide: [["barra", "anillas"]], nota: "En las anillas también valen, y perdonan más el hombro. Con banda de anilla para asistir" },
    { n: "Remo invertido",        pide: [["anillas"]], bl: "tiron", nota: "Cuanto más horizontal el cuerpo, más pesa. Se gradúa andando con los pies" },
    { n: "Aperturas invertidas",  pide: [["tubo", "plana"]], bl: "tiron", nota: "El face pull: hombro y trapecio" },
    { n: "Curl de bíceps",        pide: [["mancuerna", "tubo"]], nota: "" },
    { n: "Encogimiento de hombros", pide: [["mancuerna"]], nota: "" },

    /* ---- pierna ---- */
    { n: "Sentadilla goblet",     pide: [["mancuerna", "rusa"]], nota: "El peso al pecho" },
    /* Carlos, 25-sep-2026: la mochila cargada pasa de los 10 kg por mano sin
       comprar hierro, y deja las manos libres. Se pesa en la báscula. */
    { n: "Sentadilla con mochila", pide: [], bl: "pierna",
      nota: "Mochila cargada y pesada en la báscula: pasa del techo de 10 kg sin comprar peso" },
    { n: "Sentadilla con banda",  pide: [["anilla"]], nota: "Pisada: poco abajo, mucho arriba" },
    { n: "Sentadilla búlgara",    pide: [["apoyo"]], nota: "El pie de atrás solo se apoya" },
    { n: "Zancadas",              pide: [], nota: "Con mancuernas si sobra" },
    { n: "Peso muerto rumano",    pide: [["mancuerna", "rusa", "anilla"]], nota: "Bisagra de cadera, espalda recta" },
    { n: "Peso muerto a una pierna", pide: [["mancuerna", "rusa"]], nota: "Duplica la carga sin añadir peso" },
    { n: "Empuje de cadera",      pide: [["apoyo"]], nota: "Espalda en el sofá, peso en la cadera" },
    { n: "Abducción de cadera",   pide: [["plana", "anilla", "circular"]], nota: "Glúteo medio: la rodilla en las bajadas" },
    { n: "Paso lateral con banda", pide: [["circular"]], bl: "pierna", nota: "La banda encima de la rodilla; pasos cortos sin juntar los pies" },
    { n: "Elevación de gemelos",  pide: [["mancuerna", "rusa"]], nota: "" },

    /* ---- centro ---- */
    { n: "Plancha",               pide: [], nota: "" },
    { n: "Elevación de piernas",  pide: [], nota: "" },
    { n: "Flexión lateral",       pide: [["mancuerna", "rusa"]], nota: "" },
    { n: "Pallof",                pide: [["tubo"], ["anclaje"]], bl: "centro",
      nota: "Antirrotación: el tubo tira de lado y tú no te dejas girar" },
    { n: "Extensión lumbar",      pide: [], nota: "" }
  ];

  var NOMBRE_BLOQUE = { empuje: "Empujar", tiron: "Tirar", pierna: "Pierna", centro: "Centro" };
  var ORDEN_BLOQUE = ["empuje", "tiron", "pierna", "centro"];

  /* Qué se está mirando dentro de Material y movimientos: null es la portada
     con los bloques, y lo demás es una subpantalla. El material dejó de verse
     al abrir porque es lo que menos se consulta: se mira una vez al mes. */
  var matVista = null;   /* null | "material" | "movimientos" | "rutinas" | "A" | "B" */

  /* El grupo de cada cosa se DEDUCE de lo que permite, no se guarda. Así la
     lista que ya tiene guardada se agrupa sola, sin migrar nada. */
  var GRUPOS_MAT = [
    { n: "Peso libre",              da: ["mancuerna", "rusa", "lastre"] },
    { n: "Gomas",                   da: ["tubo", "anilla", "plana", "goma"] },
    { n: "D\u00f3nde apoyarse y anclar", da: ["apoyo", "esterilla", "alto", "anclaje", "tobillera"] }
  ];
  function grupoDe(m) {
    var da = m.da || [];
    for (var i = 0; i < GRUPOS_MAT.length; i++) {
      for (var j = 0; j < da.length; j++) if (GRUPOS_MAT[i].da.indexOf(da[j]) >= 0) return GRUPOS_MAT[i].n;
    }
    return "Otros";
  }

  /* estado de edición del material: null, "nuevo", o el id que se está tocando */
  var matEditando = null;

  function mat() {
    var e = ent();
    /* LA TRAMPA DEL ESTADO GUARDADO, otra vez: sembrar solo «si no existe» no
       alcanza a quien ya tiene un estado creado. Por eso va con marca de versión. */
    if (!e.v_material) {
      if (!e.material || !e.material.length) {
        e.material = MATERIAL_BASE.map(function (x) {
          return { id: x.id, n: x.n, d: x.d, da: x.da.slice() };
        });
      }
      e.v_material = 1;
      A.guardar("entreno");
    }
    /* LO QUE VA LLEGANDO SE AÑADE SIN PISAR LO SUYO  ·  24-sep-2026
       La lista es editable, así que una siembra que la reescribiera entera se
       llevaría por delante lo que él haya cambiado. Se añaden SOLO los que
       falten por id, y se deja intacto todo lo demás. */
    if (e.v_material < 2 && e.material) {
      var hay = {};
      e.material.forEach(function (x) { hay[x.id] = x; });
      MATERIAL_BASE.forEach(function (x) {
        if (!hay[x.id]) e.material.push({ id: x.id, n: x.n, d: x.d, da: x.da.slice() });
      });
      /* el texto de los anclajes decía «falta una barra o unas anillas que
         colgar»; ya no falta. Solo se cambia si él no lo había tocado. */
      if (hay.anil && /falta una barra/.test(hay.anil.d || "")) {
        hay.anil.n = "Anclajes de la terraza";
        hay.anil.d = "anclajes de escalada en el muro — el punto alto del que colgar";
      }
      e.v_material = 2;
      A.guardar("entreno");
    }
    if (!e.material) e.material = [];
    return e.material;
  }

  function tengo() {
    var s = {};
    mat().forEach(function (m) { (m.da || []).forEach(function (c) { s[c] = true; }); });
    return s;
  }

  /* ¿se puede hacer este movimiento con lo que hay? y si no, qué falta */
  function faltaPara(mov, s) {
    var falta = [];
    (mov.pide || []).forEach(function (grupo) {
      for (var i = 0; i < grupo.length; i++) if (s[grupo[i]]) return;
      falta.push(grupo.map(function (c) { return CAPACIDAD[c] || c; }).join(" o "));
    });
    return falta;
  }

  /* Los músculos los pone el módulo de actividad, no esta tabla. */
  function musculosDe(nombre) {
    var akhb = global.ActividadKHB;
    if (!akhb || !akhb.zonasDe) return null;
    return akhb.zonasDe(nombre);
  }
  /* `mv.bl` gana cuando está puesto. Existe por el face pull: reparte mitad
     hombro y mitad trapecio, o sea mitad empuje y mitad tirón, y el empate lo
     resolvía el orden de las claves. Es un movimiento de tirar y se dice aquí,
     sin tocar el mapa de músculos, que es de otra cosa. */
  function bloqueDe(mv) {
    if (mv && mv.bl) return mv.bl;
    var nombre = (mv && mv.n) || mv;
    var z = musculosDe(nombre), akhb = global.ActividadKHB;
    if (!z || !akhb || !akhb.BLOQUE_MUSC) return null;
    var suma = {}, mejor = null, alto = 0;
    Object.keys(z).forEach(function (k) {
      var b = akhb.BLOQUE_MUSC[k];
      if (!b) return;
      suma[b] = (suma[b] || 0) + z[k];
      if (suma[b] > alto) { alto = suma[b]; mejor = b; }
    });
    return mejor;
  }
  function textoMusculos(nombre) {
    var z = musculosDe(nombre), akhb = global.ActividadKHB;
    if (!z) return "";
    var es = (akhb && akhb.ZONA_ES) || {};
    return Object.keys(z).sort(function (a, b) { return z[b] - z[a]; })
      .map(function (k) { return (es[k] || k) + " " + Math.round(z[k] * 100) + "%"; })
      .join(" · ");
  }

  function htmlFichaMat(m, s) {
    if (matEditando === m.id) return formMat(m);
    var da = (m.da || []).map(function (c) { return CAPACIDAD[c] || c; }).join(" · ");
    return '<div class="mat-linea">' +
      '<div class="mat-txt"><b>' + U.esc(m.n) + "</b>" +
        (m.d ? '<span class="nota-peque"> — ' + U.esc(m.d) + "</span>" : "") +
        (da ? '<div class="mat-da">Permite: ' + U.esc(da) + "</div>" : "") +
      "</div>" +
      '<div class="mat-bot">' +
        '<button type="button" class="btn mini" data-mat-edita="' + U.esc(m.id) + '">Editar</button>' +
        '<button type="button" class="btn mini" data-mat-borra="' + U.esc(m.id) + '">Quitar</button>' +
      "</div></div>";
  }

  function formMat(m) {
    var da = (m && m.da) || [];
    var cajas = ORDEN_CAP.map(function (c) {
      return '<label class="mat-cap"><input type="checkbox" data-mat-cap="' + c + '"' +
        (da.indexOf(c) >= 0 ? " checked" : "") + "> " + CAPACIDAD[c] + "</label>";
    }).join("");
    return '<div class="mat-form">' +
      '<label class="campo"><span>Qué es</span>' +
        '<input type="text" id="mat-n" value="' + U.esc((m && m.n) || "") + '" placeholder="Banco regulable"></label>' +
      '<label class="campo"><span>Detalle</span>' +
        '<input type="text" id="mat-d" value="' + U.esc((m && m.d) || "") + '" placeholder="hasta 200 kg, inclinable"></label>' +
      '<div class="campo"><span>Qué permite</span><div class="mat-caps">' + cajas + "</div></div>" +
      '<div class="fila">' +
        '<button type="button" class="btn principal" data-mat-guarda="1">Guardar</button>' +
        '<button type="button" class="btn" data-mat-cancela="1">Cancelar</button>' +
      "</div></div>";
  }


  /* ---- LAS TRES SESIONES (la C desde el 25-sep-2026) ----
     No llevan su propia lista de ejercicios: NOMBRAN movimientos del catálogo
     de arriba. Así heredan solas de qué material dependen y si hoy se pueden
     hacer, y el día que entren las anillas la sesión B cambia sin tocar nada.

     El reparto: cada día lleva pierna, empuje y tirón —cuerpo entero— y entre
     los dos días se cubren el horizontal y el vertical de cada patrón. */
  var SESIONES = [
    { id: "A", n: "Fuerza A", dia: 1, diaTxt: "lunes", min: 25, mov: [
      { n: "Sentadilla goblet",   s: 2, r: "12",          kg: 10, nota: "Bajar en 3 segundos" },
      { n: "Press de banca",      s: 2, r: "12",          kg: 15, nota: "Sentado en el suelo, espalda contra la silla",
        garmin: "Press de banca inclinada con mancuernas" },
      { n: "Remo",                s: 2, r: "12",          goma: 9,
        nota: "Tubo en el anclaje de la puerta",
        garmin: "Remo con goma el\u00e1stica" },
      { n: "Plancha",             s: 2, r: "30 seg",      nota: "Cadera a la altura de los hombros" },
      { n: "Aperturas invertidas",s: 2, r: "15 por lado", goma: 4.5,
        nota: "Goma en el anclaje, de pie",
        garmin: "Apertura inversa con polea a un solo brazo y de pie" }
    ]},
    { id: "B", n: "Fuerza B", dia: 4, diaTxt: "jueves", min: 25, mov: [
      { n: "Peso muerto rumano",  s: 2, r: "12",          kg: 15,
        nota: "Bisagra de cadera: el culo atr\u00e1s, la espalda recta y la mancuerna rozando la pierna" },
      { n: "Press de hombros",    s: 2, r: "12",          kg: 15, nota: "Sin bloquear el aire",
        garmin: "Press de hombros con mancuernas" },
      { n: "Jal\u00f3n",              s: 2, r: "12",          goma: 9,
        nota: "Anclaje alto de la puerta",
        garmin: "Jal\u00f3n lateral con goma el\u00e1stica" },
      { n: "Plancha",             s: 2, r: "30 seg",      nota: "Cadera a la altura de los hombros" },
      { n: "Aperturas invertidas",s: 2, r: "15 por lado", goma: 4.5,
        nota: "Goma en el anclaje, de pie",
        garmin: "Apertura inversa con polea a un solo brazo y de pie" }
    ]},
    /* FUERZA C (diseñada el 24-sep, montada el 25-sep-2026). Lo que A y B no
       tocan: pierna a una pierna, cadera, gemelo y centro en ROTACIÓN (A y B
       solo tienen plancha, que es antiextensión). Norma de Carlos: 30 minutos
       como máximo. Ninguno invita a bloquear el aire (regla del oído).
       Sin día fijo: va donde la ponga el tablero de la semana. */
    { id: "C", n: "Fuerza C", dia: null, diaTxt: "sin día fijo", min: 25, mov: [
      { n: "Zancadas",            s: 2, r: "10 por pierna", kg: 15,
        nota: "Estáticas: los pies no se mueven, se baja y se sube. Una mancuerna de 7,5 en cada mano",
        garmin: "Sentadilla dividida con mancuernas" },
      { n: "Empuje de cadera",    s: 2, r: "12",          kg: 10,
        nota: "Espalda contra la silla bloqueada hacia atrás; la mancuerna entra y sale apoyada en los muslos",
        garmin: "Levantamiento de barra sobre cadera, en banca" },
      { n: "Elevación de gemelos",s: 2, r: "15",          kg: 15,
        nota: "De pie, subir en 1 segundo y bajar en 3. Una mancuerna de 7,5 en cada mano",
        garmin: "Elevación de gemelos de pie con mancuernas" },
      { n: "Pallof",              s: 2, r: "10 por lado", goma: 9,
        nota: "Tubo azul en el anclaje, a la altura del pecho. Puerta cerrada con llave; se tira de lado",
        /* Garmin no tiene Pallof: se apunta con el más cercano por músculo (oblicuos) */
        garmin: "Abdominales oblicuos con goma elástica (no hay Pallof en el reloj)" },
      { n: "Curl de bíceps",      s: 2, r: "12",          kg: 15, nota: "Una de 7,5 en cada mano, sin balancear",
        garmin: "Curl de bíceps alterno con mancuerna" }
    ]}
  ];

  /* Los enlaces a v\u00eddeo van aqu\u00ed, por nombre de movimiento. Vac\u00edo de momento:
     se van a\u00f1adiendo cuando encuentre uno que le valga, y entonces aparece el
     enlace en su l\u00ednea. Uno por movimiento, no uno por sesi\u00f3n. */
  var VIDEOS = {
    "Sentadilla goblet":     "https://www.youtube.com/shorts/2KbVt1Gl0VM",
    "Press de banca":        "https://www.youtube.com/shorts/LDEHmb9DpO8",
    "Remo":                  "https://www.youtube.com/shorts/X86z-3EC6iA",
    "Plancha":               "https://www.youtube.com/shorts/ysX1CpHKGCo",
    "Aperturas invertidas":  "https://www.youtube.com/shorts/5Yu8DTe4BAQ",
    "Peso muerto rumano":    "https://www.youtube.com/shorts/wfH61Y88fuo",
    "Press de hombros":      "https://www.youtube.com/shorts/mHnQ_tfbSYE",
    "Jal\u00f3n":                "https://www.youtube.com/shorts/riFu4s62nr4",
    /* 25-sep-2026, lo eligió Carlos: split squat (sentadilla dividida) */
    "Zancadas":              "https://www.youtube.com/shorts/qW2ps30p9m4",
    "Curl de bíceps":        "https://www.youtube.com/shorts/RLKsBPEBCzA",
    "Pallof":                "https://www.youtube.com/shorts/wu3OWepazLw",
    "Empuje de cadera":      "https://www.youtube.com/shorts/Udt20OGphzU",
    "Elevación de gemelos":  "https://www.youtube.com/shorts/OsQkieeI-5I"
  };

  /* Cuando el ejercicio se queda corto, por d\u00f3nde sigue. No es una sesi\u00f3n
     nueva: es el mismo hueco con m\u00e1s palanca. */
  var SIGUIENTE = {
    "Sentadilla goblet":   "Sentadilla con mochila cargada; despu\u00e9s b\u00falgara, o con banda pisada",
    "Zancadas":            "Mochila cargada en vez de mancuernas, o sentadilla b\u00falgara (en el reloj: \u00abSentadilla dividida con mancuernas y pie trasero elevado\u00bb)",
    "Empuje de cadera":    "Banda de anilla sobre la cadera, sujeta al suelo con las mancuernas; o a una pierna",
    "Elevaci\u00f3n de gemelos": "A una pierna, con la misma mancuerna",
    "Curl de b\u00edceps":      "Goma plana pisada y enganchada a la mancuerna",
    "Pallof":              "Tubo verde, o separarse un paso m\u00e1s del anclaje",
    "Peso muerto rumano":  "Peso muerto a una pierna",
    "Jal\u00f3n":              "Dominadas asistidas, cuando haya de d\u00f3nde colgarse",
    "Press de banca":      "M\u00e1s peso; y si falta, un cuarto ejercicio",
    "Press de hombros":    "M\u00e1s peso",
    "Remo":                "Tubo m\u00e1s duro, o dos acoplados"
  };

  var NIVELES = [
    { n: "Corta",  q: "2 series, mitad de carga",
      c: "Semana S, día malo, y mientras dure el corticoide" },
    { n: "Normal", q: "3 series de 8-12, con 2-3 repeticiones en la recámara",
      c: "Semana A" },
    { n: "Larga",  q: "3-4 series y un cuarto ejercicio",
      c: "Desde la fase 1, sin corticoide" }
  ];

  /* Del texto del plan («Fuerza A + caminar») a la rutina. Mira el nombre
     completo para no confundir «Fuerza A» con «Fuerza B». */
  /* El vídeo se abre DENTRO de la app, en la ventana de siempre. Mandarlo a
     YouTube funcionaba, pero al cerrarlo te quedabas allí y había que volver a
     mano — y en mitad de un descanso de 75 segundos eso es la fricción que
     hace que dejes de mirarlos. */
  function idDeYoutube(url) {
    var m = String(url || "").match(/(?:shorts\/|embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  }

  /* 25-sep-2026: el «cómo se hace» de la rutina EMERGENTE no hacía nada. La
     ventana cuelga de #modal, fuera de la pestaña, y el clic de [data-video]
     sólo lo atendía la pestaña. Ahora lo atiende también el manejador de la
     ventana, y el vídeo lleva «Volver a la rutina» si vino de ella. */
  var rutinaAbierta = null;

  function abrirVideo(nombre, volverA) {
    var caja = document.getElementById("modal-caja"), modal = document.getElementById("modal");
    var url = VIDEOS[nombre];
    if (!caja || !modal || !url) return;
    var id = idDeYoutube(url);

    var h = "<header><h2>" + U.esc(nombre) + "</h2>" +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">\u00d7</button></header>';
    if (id) {
      h += '<div class="vid-caja"><iframe src="https://www.youtube-nocookie.com/embed/' + id +
        '?rel=0&amp;playsinline=1" title="" frameborder="0" loading="lazy" ' +
        'allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" ' +
        "allowfullscreen></iframe></div>";
    }
    h += '<p class="nota-peque">Si no se ve aqu\u00ed es que su autor no permite incrustarlo: ' +
      '<a href="' + U.esc(url) + '" target="_blank" rel="noopener">\u00e1brelo en YouTube</a>.</p>' +
      (volverA ? '<button class="btn" type="button" data-volver-rutina="' + U.esc(volverA) + '" ' +
        'style="width:100%;margin-top:14px">\u2190 Volver a la rutina</button>' : "") +
      '<button class="btn principal" type="button" data-cerrar-guia="1" ' +
      'style="width:100%;margin-top:14px">Cerrar</button>';

    caja.innerHTML = h;
    modal.classList.add("abierta");
  }

  function rutinaDeTexto(t) {
    var x = String(t || "").toLowerCase();
    for (var i = 0; i < SESIONES.length; i++) {
      if (x.indexOf(SESIONES[i].n.toLowerCase()) >= 0) return SESIONES[i].id;
    }
    return null;
  }

  function movPorNombre(n) {
    for (var i = 0; i < MOVIMIENTOS.length; i++) if (MOVIMIENTOS[i].n === n) return MOVIMIENTOS[i];
    return null;
  }

  function htmlMaterial() {
    var s = tengo();
    if (matVista === "material")    return pantMaterial(s);
    if (matVista === "movimientos") return pantMovimientos(s);
    if (matVista === "rutinas")     return pantRutinas(s);
    if (matVista === "A" || matVista === "B") return pantRutina(matVista, s);
    return pantPortadaMat(s);
  }

  /* Cabecera común de las subpantallas: la flecha vuelve a los bloques, no al
     plan, que es lo que uno espera cuando ha entrado dos niveles. */
  function cabSub(titulo, bajada) {
    return '<button type="button" class="ent-atras" data-mv-atras="1">' +
      FLECHA + "Material y movimientos</button>" +
      '<div class="tarjeta"><h2>' + U.esc(titulo) + "</h2>" +
      (bajada ? '<p class="nota-peque">' + bajada + "</p>" : "") + "</div>";
  }
  function pieSub() {
    return '<button type="button" class="ent-atras abajo" data-mv-atras="1">' +
      FLECHA + "Material y movimientos</button>";
  }

  /* ---------- la portada: tres bloques y nada más ---------- */
  function pantPortadaMat(s) {
    var lista = mat();
    var hechos = 0;
    MOVIMIENTOS.forEach(function (mv) { if (!faltaPara(mv, s).length) hechos++; });
    var hoy = new Date().getDay();
    var toca = null;
    SESIONES.forEach(function (x) { if (x.dia === hoy) toca = x; });

    var h = '<button type="button" class="ent-atras" data-volver="1">' +
      FLECHA + "Volver a Entrenamiento</button>" +
      '<div class="tarjeta"><h2>Material y movimientos</h2>' +
      '<p class="nota-peque">Lo que hay en casa, lo que se puede hacer con ello, ' +
      'y las rutinas que salen de ahí.</p></div>';

    h += '<div class="ent-bloques">' +
      bloqueMV("rutinas", "Rutinas", "iconos/khb/3-pesas-corredor.webp",
               (toca ? "Hoy toca " + toca.n + ". " : "") +
               "Fuerza A y Fuerza B: qu\u00e9 ejercicios, con qu\u00e9 peso y c\u00f3mo se hacen.") +
      bloqueMV("movimientos", "Movimientos", "iconos/khb/7-yoga.webp",
               hechos + " de " + MOVIMIENTOS.length + " a mano. Lo que puedes hacer con lo que tienes, " +
               "m\u00fasculo a m\u00fasculo.") +
      bloqueMV("material", "Material", "iconos/khb/6-zapatillas.webp",
               lista.length + " cosas. Lo que hay en casa y qu\u00e9 permite hacer cada una.") +
      "</div>";

    h += '<button type="button" class="ent-atras abajo" data-volver="1">' +
      FLECHA + "Volver a Entrenamiento</button>";
    return h;
  }

  function bloqueMV(id, titulo, img, pie) {
    return '<button type="button" class="ent-bloque" data-mv="' + id + '">' +
      '<img src="' + img + '" alt="" onerror="this.style.display=\'none\'">' +
      '<span class="txt"><span class="n">' + U.esc(titulo) + "</span>" +
      "<small>" + U.esc(pie) + "</small></span></button>";
  }

  /* ---------- material, por grupos ---------- */
  function pantMaterial(s) {
    var lista = mat();
    var h = cabSub("Material",
      "Lo que hay en casa. Cada cosa dice qué permite hacer, y de ahí sale " +
      "sola la lista de movimientos que tienes a mano.");

    var porGrupo = {}, orden = [];
    lista.forEach(function (m) {
      var g = grupoDe(m);
      if (!porGrupo[g]) { porGrupo[g] = []; orden.push(g); }
      porGrupo[g].push(m);
    });

    if (!lista.length) h += '<div class="tarjeta"><p class="nota-peque">La lista está vacía.</p></div>';
    orden.forEach(function (g) {
      h += '<div class="tarjeta"><h3>' + U.esc(g) + "</h3>";
      porGrupo[g].forEach(function (m) { h += htmlFichaMat(m, s); });
      h += "</div>";
    });

    h += '<div class="tarjeta">';
    if (matEditando === "nuevo") h += formMat(null);
    else h += '<div class="fila">' +
      '<button type="button" class="btn" data-mat-nuevo="1">Añadir material</button></div>';
    h += "</div>" + pieSub();
    return h;
  }

  /* ---------- el catálogo de movimientos ---------- */
  function pantMovimientos(s) {
    var hechos = 0;
    MOVIMIENTOS.forEach(function (mv) { if (!faltaPara(mv, s).length) hechos++; });
    var h = cabSub("Movimientos",
      "Con lo que tienes puedes hacer <b>" + hechos + " de " + MOVIMIENTOS.length +
      "</b>. Los que faltan dicen qué les falta.");

    var porBloque = {};
    MOVIMIENTOS.forEach(function (mv) {
      var b = bloqueDe(mv) || "otro";
      if (!porBloque[b]) porBloque[b] = [];
      porBloque[b].push(mv);
    });

    ORDEN_BLOQUE.concat(["otro"]).forEach(function (b) {
      var g = porBloque[b];
      if (!g || !g.length) return;
      h += '<div class="tarjeta"><h3>' + (NOMBRE_BLOQUE[b] || "Sin clasificar") + "</h3>";
      g.forEach(function (mv) {
        var falta = faltaPara(mv, s);
        var musc = textoMusculos(mv.n);
        h += '<div class="mov-linea' + (falta.length ? " mov-no" : "") + '">' +
          '<div class="mov-n"><b>' + U.esc(mv.n) + "</b>" +
            (mv.nota ? '<span class="nota-peque"> — ' + U.esc(mv.nota) + "</span>" : "") + "</div>" +
          (musc ? '<div class="mov-musc">' + U.esc(musc) + "</div>"
                : '<div class="mov-musc mov-ojo">Sin músculos asignados: el reloj tampoco lo sabrá clasificar</div>') +
          (falta.length ? '<div class="mov-falta">Falta: ' + U.esc(falta.join(" + ")) + "</div>" : "") +
          "</div>";
      });
      h += "</div>";
    });
    return h + pieSub();
  }

  /* ---------- la lista de rutinas: nombre y cuándo, nada más ---------- */
  function pantRutinas(s) {
    var hoy = new Date().getDay();
    var h = cabSub("Rutinas",
      "Esta es <b>la rutina decidida</b>. Se cambia aquí primero — porque cambia por " +
      "cosas de aquí: que un peso se quede corto, que acabe el corticoide, que llegue " +
      "material nuevo, que empiece otra fase — y <b>después se copia a Garmin Connect</b>, " +
      "que es lo que ejecuta el reloj. Si un día no coinciden, no hay duda de cuál vale: " +
      "es que falta pasar a Connect un cambio ya decidido.");

    h += '<div class="tarjeta">';
    SESIONES.forEach(function (ses) {
      var faltan = 0;
      ses.mov.forEach(function (m) {
        var mv = movPorNombre(m.n);
        if (mv && faltaPara(mv, s).length) faltan++;
      });
      h += '<button type="button" class="mv-fila" data-mv="' + ses.id + '">' +
        '<span class="mv-fila-n"><b>' + U.esc(ses.n) + "</b>" +
          (hoy === ses.dia ? ' <b class="mv-hoy">hoy</b>' : "") + "</span>" +
        '<span class="mv-fila-d">' + U.esc(ses.diaTxt) + " · " + ses.mov.length +
          " ejercicios · unos " + ses.min + " min" +
          (faltan ? " · " + faltan + " sin material" : "") + "</span></button>";
    });
    h += "</div>";

    h += '<div class="tarjeta"><h3>Qué tamaño de sesión</h3>';
    NIVELES.forEach(function (nv) {
      h += '<div class="mov-linea"><div class="mov-n"><b>' + nv.n + "</b>" +
        '<span class="nota-peque"> — ' + U.esc(nv.q) + "</span></div>" +
        '<div class="mov-musc">' + U.esc(nv.c) + "</div></div>";
    });
    h += "</div>";
    return h + pieSub();
  }

  /* ---------- la ficha de una rutina ---------- */
  function pantRutina(id, s) {
    var cuerpo = cuerpoRutina(id, s, false);
    if (cuerpo === null) return pantRutinas(s);
    return '<button type="button" class="ent-atras" data-mv="rutinas">' +
      FLECHA + "Rutinas</button>" + cuerpo +
      '<button type="button" class="ent-atras abajo" data-mv="rutinas">' +
      FLECHA + "Rutinas</button>";
  }

  /* EL CUERPO DE UNA RUTINA, APARTE  ·  24-sep-2026
     Se usa en dos sitios: la pantalla de Rutinas dentro de Material, y la
     emergente que se abre desde El Plan. Carlos: «ver la rutina va a la
     página de rutinas y solo puedo volver a Rutinas, no a El Plan de donde
     venía». Tenía razón: entrar desde el plan te dejaba tirado en otra
     sección. Desde el plan ahora es una emergente que se cierra con la × y
     te deja donde estabas. */
  function cuerpoRutina(id, s, enModal) {
    var ses = null;
    SESIONES.forEach(function (x) { if (x.id === id) ses = x; });
    if (!ses) return null;

    var hoy = new Date().getDay();
    var caja = enModal ? "mod-bloque" : "tarjeta";
    /* en la emergente el nombre ya va en la cabecera: no se repite aquí */
    var h = '<div class="' + caja + '">' +
      (enModal ? "" : "<h2>" + U.esc(ses.n) +
        (hoy === ses.dia ? ' <b class="mv-hoy">hoy</b>' : "") + "</h2>") +
      '<p class="nota-peque"' + (enModal ? ' style="margin:0"' : "") + ">" +
      U.esc(ses.diaTxt) + " · " + ses.mov.length +
      " ejercicios · unos " + ses.min + " min · descanso de 1:15 entre series</p></div>";

    h += '<div class="' + caja + '">';
    ses.mov.forEach(function (m) {
      var mv = movPorNombre(m.n);
      var falta = mv ? faltaPara(mv, s) : [];
      var dosis = m.s + " × " + m.r;
      if (m.kg)   dosis += " · <b>" + m.kg + " kg</b>";
      if (m.goma) dosis += " · <b>goma de " + String(m.goma).replace(".", ",") + " kg</b>";

      h += '<div class="mov-linea' + (falta.length ? " mov-no" : "") + '">' +
        '<div class="mov-n"><b>' + U.esc(m.n) + "</b>" +
          (VIDEOS[m.n] ? ' <button type="button" class="ent-comose" data-video="' +
                         U.esc(m.n) + '">cómo se hace</button>' : "") + "</div>" +
        '<div class="mov-musc">' + dosis + "</div>" +
        (m.nota ? '<div class="mov-musc">' + U.esc(m.nota) + "</div>" : "") +
        (m.garmin ? '<div class="nota-peque">En el reloj: «' + U.esc(m.garmin) + "»</div>" : "") +
        (SIGUIENTE[m.n] ? '<div class="mov-musc">Cuando se quede corto: ' +
                           U.esc(SIGUIENTE[m.n]) + "</div>" : "") +
        (falta.length ? '<div class="mov-falta">Falta: ' + U.esc(falta.join(" + ")) + "</div>" : "") +
        "</div>";
    });
    h += "</div>";

    h += '<div class="aviso' + (enModal ? " en-modal" : "") + '"><b>Las tres de siempre:</b> ' +
      'espirar en el esfuerzo y <b>nunca bloquear el aire</b>; ' +
      'ni una repetición al fallo en los tres primeros meses; ' +
      'y parar al primer síntoma de oído. ' +
      '<span class="nota-peque">Se sube peso cuando salen 12 repeticiones limpias en las ' +
      'tres series. La casilla de hecho <b>se marca sola</b> cuando intervals trae la ' +
      'sesión que grabaste en el reloj.</span></div>';
    return h;
  }

  /* la rutina del día, en emergente, sin salir de El Plan */
  function abrirRutina(id) {
    var caja = document.getElementById("modal-caja"), modal = document.getElementById("modal");
    if (!caja || !modal) return;
    var ses = null;
    SESIONES.forEach(function (x) { if (x.id === id) ses = x; });
    var cuerpo = cuerpoRutina(id, tengo(), true);
    if (!ses || cuerpo === null) return;
    rutinaAbierta = id;
    caja.innerHTML = "<header><h2>" + U.esc(ses.n) + "</h2>" +
      '<button class="cerrar" type="button" data-cerrar-guia="1" aria-label="Cerrar">×</button></header>' +
      cuerpo +
      '<button class="btn principal" type="button" data-cerrar-guia="1" ' +
      'style="width:100%;margin-top:14px">Cerrar</button>';
    modal.classList.add("abierta");
  }

  /* ---- edición del material ---- */
  function guardarMat() {
    var caja = document.querySelector(".mat-form");
    if (!caja) return;
    var n = String((caja.querySelector("#mat-n") || {}).value || "").trim();
    if (!n) { U.toast("Ponle un nombre"); return; }
    var d = String((caja.querySelector("#mat-d") || {}).value || "").trim();
    var da = [], cajas = caja.querySelectorAll("[data-mat-cap]");
    for (var k = 0; k < cajas.length; k++) {
      if (cajas[k].checked) da.push(cajas[k].getAttribute("data-mat-cap"));
    }
    var lista = mat();
    if (matEditando === "nuevo") {
      lista.push({ id: "m" + Date.now().toString(36), n: n, d: d, da: da });
    } else {
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === matEditando) { lista[i].n = n; lista[i].d = d; lista[i].da = da; break; }
      }
    }
    matEditando = null;
    A.guardar("entreno");
    pintar();
    U.toast("Guardado");
  }

  function borrarMat(id) {
    var lista = mat();
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id) {
        if (!confirm("¿Quitar «" + lista[i].n + "» del material?")) return;
        lista.splice(i, 1);
        A.guardar("entreno");
        pintar();
        U.toast("Quitado");
        return;
      }
    }
  }

  function htmlCasos() {
    var volver = '<button type="button" class="ent-atras" data-volver="1">' +
      FLECHA + "Volver a Entrenamiento</button>";
    var cab = '<div class="tarjeta"><h2>Casos</h2>' +
      '<p class="nota-peque">Los episodios medidos, uno a uno, y los informes de conjunto. ' +
      "Los folios viven en el repositorio privado y se bajan al pulsar.</p></div>";

    if (Casos.estado === "sin-config") {
      return volver + cab + '<div class="tarjeta"><p>Falta la configuración de GitHub: ' +
        "sin ella no puedo traer ni el catálogo ni los folios.</p></div>";
    }
    if (Casos.estado === "no-hay") {
      return volver + cab + '<div class="tarjeta"><p>No encuentro <b>datos/casos.json</b> ' +
        "en el repositorio de datos. Es lo primero que hay que subir.</p></div>";
    }
    if (!Casos.datos) {
      return volver + cab + '<div class="tarjeta"><p class="nota-peque">Trayendo el catálogo…</p></div>';
    }

    var lista = casosFiltrados();
    var h = volver + cab + chipsCasos();
    if (!lista.length) {
      h += '<div class="tarjeta"><p>Ningún folio con esos dos filtros a la vez.</p></div>';
    } else {
      h += '<div class="casos-rejilla">';
      lista.forEach(function (x) { h += fichaCaso(x); });
      h += "</div>";
    }
    return h + comoAnadir();
  }

  /* Las instrucciones, plegadas y al final. Van AQUI y no en una nota aparte
     porque es donde se necesitan: cuando estás mirando la rejilla y echas uno
     en falta. Plegadas, para que no estorben los otros 364 días del año. */
  function comoAnadir() {
    var fams = ((Casos.datos && Casos.datos.familias) || [])
      .map(function (f) { return f.id; }).join(" · ");
    var causas = ((Casos.datos && Casos.datos.causas) || [])
      .map(function (c) { return c.id; }).join(" · ");

    var ejemplo = [
      "{",
      '  "id": "corticoides",',
      '  "titulo": "Corticoides",',
      '  "subtitulo": "Qué cambió durante la pauta",',
      '  "familia": "episodio",',
      '  "causas": ["infeccion"],',
      '  "desde": "2026-09-01",',
      '  "hasta": "2026-10-15",',
      '  "paginas": 5,',
      '  "fichero": "Caso corticoides septiembre 2026.pdf",',
      '  "de_que_trata": "Dos frases diciendo qué se ve aquí dentro.",',
      '  "coste": { "forma_antes": 48.2, "suelo": 9.4, "dias_en_volver": 120 }',
      "}"
    ].join("\n");

    return '<details class="casos-como">' +
      "<summary>Cómo añadir un folio nuevo</summary>" +
      "<ol>" +
        "<li>Guarda el PDF en <b>Menú Semanal\\informes-salud\\</b>.</li>" +
        "<li>Súbelo al repositorio <b>privado</b>, dentro de <b>documentos/</b>. " +
           "Nunca al público: estos folios hablan de tu salud.</li>" +
        "<li>Abre <b>datos/casos.json</b> en GitHub, dale al lápiz y añade su ficha " +
           "al final de la lista <b>documentos</b>, separada por una coma.</li>" +
        "<li>Recarga la app. La pestaña se entera sola de que el catálogo cambió.</li>" +
      "</ol>" +
      "<p class=\"nota-peque\">La ficha, con los campos que hay:</p>" +
      "<pre>" + U.esc(ejemplo) + "</pre>" +
      "<ul>" +
        "<li><b>fichero</b> — el nombre exacto del PDF, con sus espacios y sus " +
           "tildes. Si no casa letra por letra, el botón dirá que no lo encuentra.</li>" +
        "<li><b>familia</b> — una de: " + U.esc(fams) + "</li>" +
        "<li><b>causas</b> — las que sean, de: " + U.esc(causas) + ". " +
           "Los episodios casi nunca son de una sola cosa.</li>" +
        "<li><b>coste</b> — sólo en los episodios, y sólo si está medido. Sin él, " +
           "la ficha sale igual pero sin el recuadro azul.</li>" +
        "<li><b>destacado: true</b> — le pone el filo azul. Para los de referencia.</li>" +
        "<li><b>pendiente</b> — si el folio aún no existe: pon el texto de la espera " +
           "y deja <b>fichero</b> en <b>null</b>. Sale marcado, sin botón.</li>" +
      "</ul>" +
      '<p class="nota-peque">O dímelo y lo hago yo: escribo el folio, lo dejo ' +
      "preparado para subir y añado su ficha.</p>" +
      "</details>";
  }

  function prepararCasos() {
    Casos.cargar(function () { if (bloque === "casos") pintar(true); });
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
    /* La salida ya no se programa, así que la imagen no puede anunciar monte o
       bici: se queda la de montaña como ilustración del fin de semana. */
    var img = P.diaGrande.imagenes.montana;
    var h = volver;

    /* franja: dos ranuras, el semáforo y los avisos */
    var todosAv = avisosOrdenados(hoy), av = todosAv.slice(0, 2), sem0 = (P.semaforo || {});
    var hayConsulta = todosAv.some(function (a) { return a.d.nivel === "consulta"; });
    h += '<div class="ent-franja">';
    /* EL SEMÁFORO. Mientras no esté calibrado sigue diciendo «Sin calibrar», que
       es lo honesto; en cuanto haya umbrales se enciende solo. Un aviso de nivel
       Consulta lo baja a ámbar aunque los números digan verde — es la única
       conexión entre los avisos y el entrenamiento, y manda hacia abajo. */
    var estSem = estadoSemaforo(hoy);
    if (estSem && hayConsulta && (estSem.id === "verde" || estSem.id === "azul")) {
      var eAmb = (sem0.estados || {}).ambar || {};
      estSem = { id: "ambar", nombre: eAmb.nombre || "Suave",
                 dice: "Hoy suave: hay un aviso de consulta sin resolver.",
                 ofrece: eAmb.ofrece || [], nota: eAmb.nota || "", razones: estSem.razones };
    }
    var claseSem = estSem
      ? " encendido " + (estSem.id === "azul" ? "azulsem" : estSem.id)
      : ((hayConsulta ? " ambar" : " apagado"));
    h += '<div class="ent-sem' + claseSem + '">' +
      '<span class="et">Semáforo</span>' +
      "<b>" + (estSem ? U.esc(estSem.nombre)
                      : (hayConsulta ? "Suave" : "Sin calibrar")) + "</b>" +
      "<small>" + (estSem ? U.esc(estSem.dice)
        : (hayConsulta
          ? "Hoy suave: hay un aviso de consulta sin resolver."
          : "Se activa el " + U.etiquetaFecha(sem0.desde || "2026-10-15") + ", con tres semanas sin corticoide.")) +
      "</small>";
    if (estSem) h += htmlRazones(estSem.razones);
    h += "</div>";
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
    if (estSem && estSem.ofrece && estSem.ofrece.length) h += htmlOfrece(hoy, sem, estSem);

    /* 25-sep-2026: la tarjeta grande de cabecera («Semana 1 · El Plan», fechas,
       días seguidos y el selector) se fue. Carlos: «me parece todo muy grande…
       y no sé si poder moverlo para ver las siguientes semanas». Su información
       vive ahora en UNA línea dentro de «La semana», y sigue a las flechas. */

    /* qué decidió el pase del lunes, y por qué esta semana es la que es */
    h += htmlPaseAplicado(sem);

    /* La tira de la semana va ARRIBA: es el selector de día, y elegir el día
       es lo primero que se hace al entrar. Tenerla al final obligaba a bajar
       toda la pantalla para mirar otro día y volver a subir. */
    var lunes = lunesVista || U.lunesDe(hoy);
    h += '<div class="tarjeta"><div class="ent-navsem">' +
      '<button type="button" class="btn icono" data-semana="-1" title="Semana anterior">‹</button>' +
      "<h2>" + (lunes === U.lunesDe(hoy) ? "La semana" : U.etiquetaRangoCorto(lunes)) +
        (function () {
          var sx = semanaDe(lunes) || semanaDe(U.sumarDias(lunes, 3));
          var c = sx ? cargaDeSemana(sx) : null;
          if (c === null) return "";
          return '<small class="sem-carga">Carga ' + c +
            (sx.carga ? " de " + sx.carga : "") + "</small>";
        })() + "</h2>" +
      '<button type="button" class="btn icono" data-semana="1" title="Semana siguiente">›</button>' +
      "</div>" +
      (function () {
        var sx = semanaDe(lunes) || semanaDe(U.sumarDias(lunes, 3));
        if (!sx) return "";
        var tx = tallaDe(sx), px = P.plantillas[tx] || {};
        var pasada = sx.hasta < hoy, actual = hoy >= sx.desde && hoy <= sx.hasta;
        return '<div class="ent-semlinea">' +
          '<div class="info"><b>Semana ' + sx.n + " · " + U.esc(String(px.nombre || tx).replace(/^Semana\s+/, "")) + "</b> · " +
            U.etiquetaFecha(sx.desde) + " – " + U.etiquetaFecha(sx.hasta) +
            (sx.nota ? '<span class="nota"> · ' + U.esc(sx.nota) + "</span>" : "") + "</div>" +
          '<div class="ctrl">' +
            (actual ? '<span class="racha-mini"><b>' + racha() + "</b> días seguidos</span>" : "") +
            '<label>va como <select id="ent-talla" data-sem-desde="' + sx.desde + '"' +
              (pasada ? " disabled" : "") + ' title="' + U.esc(px.pie || "") + '">' +
            ["R", "A", "B", "S"].map(function (k) {
              return '<option value="' + k + '"' + (k === tx ? " selected" : "") + ">" +
                U.esc(P.plantillas[k].nombre) + "</option>";
            }).join("") + "</select></label></div></div>";
      })() +
      "";
    /* ---------- LA BANDEJA Y EL TABLERO (24-sep-2026) ----------
       La tira de los siete días pasa a ser el tablero donde se reparten los
       bloques. Arriba, lo que queda por colocar. Se mueve con dos toques: el
       bloque y después el día. */
    /* EL DÍA ABIERTO SE CALCULA AQUÍ, ANTES DE PINTAR LA TIRA. Estaba más
       abajo, así que cuando la tira preguntaba `f === dia` la variable valía
       undefined y la casilla del día elegido NUNCA se marcaba. Fallo viejo,
       visto al probar el tablero. (24-sep-2026.) */
    var dia = (diaSel && semanaDe(diaSel)) ? diaSel : hoy;

    var sueltos = sinColocar(lunes);
    if (bloqueSel) {
      var semMov = semanaDe(bloqueSel.desde), bMov = null;
      if (semMov) (bolsilloDe(semMov) || []).forEach(function (x) { if (x.id === bloqueSel.bid) bMov = x; });
      if (bMov) {
        h += '<div class="bl-moviendo">Moviendo <b>' + U.esc(bMov.t) +
          (bMov.min ? ", " + bMov.min + " min" : "") + "</b>. Toca el día donde lo pones" +
          '<button type="button" class="bl-quitar" data-blq-a="bandeja">dejarlo sin colocar</button>' +
          '<button type="button" class="bl-quitar" data-quitar="' + bloqueSel.desde + ":" + bloqueSel.bid +
            '">no lo voy a hacer…</button>' +
          '<button type="button" class="bl-cancela" data-blq-a="nada">cancelar</button></div>';
      }
    }
    if (sueltos.length) {
      h += '<div class="bl-bandeja"><span class="et">Sin colocar</span><div class="bl-chips">';
      sueltos.forEach(function (x) {
        h += '<button type="button" class="dia-bl' + (x.b.largo ? " largo" : "") +
          (x.b.fam === "fuerza" ? " fuerza" : "") +
          (bloqueSel && bloqueSel.bid === x.b.id ? " elegido" : "") +
          '" draggable="true" data-blq="' + x.sem.desde + ":" + x.b.id + '">' +
          U.esc(x.b.t) + (x.b.min ? " · " + x.b.min + " min" : "") + "</button>";
      });
      h += "</div></div>";
    }
    h += '<div class="ent-semana">';
    for (var i = 0; i < 7; i++) {
      var f = U.sumarDias(lunes, i), fd = U.desdeISO(f), semF = semanaDe(f);
      var ss = semF ? sesionesDe(f, semF, tallaDe(semF)) : [];
      /* Cuatro estados, y el color dice de qué habla cada uno:
         ámbar claro = fuera del plan, no hay nada que juzgar (los días
         anteriores al 18 de septiembre); verde = día terminado y cumplido;
         rojo = día terminado sin cumplir; azul = lo vigente y lo que viene.
         Hoy se queda azul aunque ya esté hecho: todavía está corriendo. */
      var cumplido = semF && diaCumplido(f, semF, tallaDe(semF));
      /* ÁMBAR: el día pasó sin cumplirse pero todavía quedan días hábiles donde
         meter lo que falta. Rojo solo cuando ya no hay dónde. (Carlos, 24-sep.) */
      var resc = (semF && f < hoy && !cumplido) ? estadoRescate(semF, f) : null;
      var noHab = noHabilDe(f);
      var estadoDia = !semF ? "fuera"
        : (noHab ? "nohabil"
        : (f > hoy ? "pend" : (f === hoy ? "pend"
        : (cumplido ? "ok" : (resc && resc.estado === "ambar" ? "ambar" : "fallo")))));
      var ok = (estadoDia === "ok") || (f === hoy && cumplido);
      h += '<div class="ent-dia ' + estadoDia + (f === hoy ? " hoy" : "") + (f === dia ? " sel" : "") + (ok ? " ok" : "") +
        '" data-dia="' + f + '" role="button" tabindex="0">' +
        /* LA CABECERA, EN DOS COLUMNAS como el pie: fecha a la izquierda y NO DISP
           a la derecha. Antes la × iba en posición absoluta sobre la esquina y en
           el móvil se comía la fecha. (Carlos, 24-sep-2026: «en el móvil se ven
           juntos».) */
        '<span class="cab"><span class="fecha">' +
        '<span class="d">' + DIA_CORTO[fd.getDay()] + '</span><span class="f">' + fd.getDate() + "</span></span>" +
        /* NO DISP, EN LA TIRA  ·  24-sep-2026. Estaba en la ficha del día y Carlos
           lo dijo claro: «debería salir en La Semana… más fácil de encontrar que
           donde está». Un toque marca, otro desmarca. El motivo se afina luego en
           la ficha del día, que no hace falta elegirlo para marcarlo. */
        (semF ? '<button type="button" class="dia-nd' + (noHab ? " puesto" : "") +
          '" data-nd="' + f + '" title="' + (noHab ? "Volver a d\u00eda h\u00e1bil" : "Marcar como no disponible") +
          '"><b>\u00d7</b><span>no disp</span></button>' : "") +
        "</span>" +
        '<span class="q' + (ss.length && ss[0].bid ? " bloques" : "") + '">' +
        (noHab ? U.esc(nombreNoHabil(noHab.m))
        : (!semF ? "—" : (!ss.length ? "descanso"
          : (ss[0].bid
            ? ss.map(function (s) {
                /* un bloque QUITADO con motivo se ve tachado: sigue ahí, cuenta como
                   no hecho, y se nota de un vistazo que no fue un olvido */
                var quit = semF && s.bid ? quitadoDe(semF, s.bid) : null;
                return '<button type="button" class="dia-bl' + (s.largo ? " largo" : "") +
                  (quit ? " quitado" : "") +
                  (s.fam === "fuerza" ? " fuerza" : "") +
                  (bloqueSel && bloqueSel.bid === s.bid && bloqueSel.desde === semF.desde ? " elegido" : "") +
                  '" draggable="true" data-blq="' + semF.desde + ":" + s.bid + '">' +
                  U.esc(cortoBloque(s)) + "</button>";
              }).join("")
            : U.esc(ss.map(function (s) { return s.t.split(":")[0].split(",")[0]; }).join(" · ")))))) +
        '</span><span class="pie"><span class="p"></span>' +
        (function () {
          if (!semF || noHab) return "";
          var c = cargaDeDia(f);
          /* con su rótulo: un número suelto al lado del punto no dice qué es.
             (Carlos, 24-sep-2026.) */
          return c === null ? "" : '<span class="dc"><b>' + c + "</b><i>carga</i></span>";
        })() + "</span></div>";
    }
    h += "</div>";
    h += '<p class="nota-peque" style="margin-top:10px">' + U.esc(P.suelo) + "</p>";
    h += fichaSalida(lunes);
    h += panelAmbar(lunes);
    h += panelAvisos(lunes);
    h += "</div>";

    /* el día abierto: hoy, o el que se haya pulsado en la tira de la semana.
       Se calculó arriba, antes de la tira, para que la casilla salga marcada. */
    var semDia = semanaDe(dia) || sem, tallaDia = tallaDe(semDia);
    var d = U.desdeISO(dia), esHoy = (dia === hoy);
    var titulo = esHoy
      ? "Hoy, " + DIA_LARGO[d.getDay()] + " " + U.etiquetaFecha(dia)
      : DIA_LARGO[d.getDay()].charAt(0).toUpperCase() + DIA_LARGO[d.getDay()].slice(1) + " " + U.etiquetaFecha(dia);

    h += '<div class="tarjeta"><h2>' + titulo + "</h2>";
    if (!esHoy) h += '<button type="button" class="ent-volver" data-dia="' + hoy + '">‹ volver a hoy</button>';

    /* MARCAR EL DÍA COMO NO HÁBIL. Va aquí, en la ficha del día abierto, y no en la
       casilla de la tira: en el móvil la casilla ya tiene un toque para abrir el
       día y otro para soltar un bloque, y un tercero sería un campo de minas. */
    var nh = noHabilDe(dia);
    if (nh) {
      /* Marcado ya está (con la × de la tira): aquí solo se afina EL PORQUÉ, que es
         lo único que hace falta pensar. Los motivos son etiquetas y no cambian
         ningún cálculo. */
      h += '<div class="nohab-caja puesto"><b>Día no disponible</b>' +
        '<span class="nota-peque">Cuenta como descanso, no como incumplido. Su carga ya está repartida en los días que quedan.</span>' +
        '<div class="nohab-bot">';
      MOTIVOS_NOHABIL.forEach(function (m) {
        h += '<button type="button" class="sal-hora' + (nh.m === m.id ? " elegido" : "") +
          '" data-nohabil="' + dia + ":" + m.id + '">' + U.esc(m.n) + "</button>";
      });
      h += '<button type="button" class="sal-hora" data-nohabil="' + dia + ':">Vuelve a estar disponible</button>';
      h += "</div></div>";
    }

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
        guia: guiaDeSesion(s.t),
        /* Si la sesión del plan es una de las dos de fuerza, la fila lleva
           enlace a su ficha: qué ejercicios, con qué peso y el vídeo. Es el
           salto que faltaba entre «hoy toca Fuerza A» y saber qué hacer. */
        rutina: rutinaDeTexto(s.t)
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
            (f.rutina ? '<button type="button" class="ent-comose" data-ver-rutina="' + f.rutina +
              '">ver la rutina</button>' : "") +
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
    { k: "gemelo",  n: "Gemelo",  u: " cm" },
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
      /* EL GEMELO SE LEE CONTRA EL TOBILLO. Los dos suben con el líquido, así que
         el gemelo a solas no distingue músculo de retención. Aquí se compara el
         cambio de uno con el del otro desde la medida anterior de gemelo. */
      if (m.k === "gemelo" && u) {
        var gs = serieMedida("gemelo", dia, 400);
        if (gs.length >= 2) {
          var dg = gs[gs.length - 1].v - gs[gs.length - 2].v;
          var tobA = valorMedidaEn("tobillo", gs[gs.length - 2].f);
          var tobB = valorMedidaEn("tobillo", gs[gs.length - 1].f);
          var lect = "";
          if (tobA !== null && tobB !== null) {
            var dtb = tobB - tobA;
            if (dg >= 0.3 && Math.abs(dtb) < 0.3) lect = " — y el tobillo quieto: eso es entrenamiento";
            else if (dg >= 0.3 && dtb >= 0.3) lect = " — pero el tobillo sube igual: es líquido, no músculo";
            else if (dg <= -0.3 && Math.abs(dtb) < 0.3) lect = " — con el tobillo quieto: mira el peso, puede ser pérdida de músculo";
          } else {
            lect = " — sin tobillo ese día no se puede saber si es músculo o líquido";
          }
          pie += " · " + (Math.abs(dg) < 0.05 ? "igual que la anterior" : signo(dg) + " cm desde la anterior") + lect;
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

    /* Las dos grasas van juntas y en este orden, porque solo sirven una al
       lado de la otra: la cinta no depende del agua del cuerpo y la báscula
       sí, así que lo que se mira no es cada número, es si se separan. */
    var gc = grasaPorCinta(dia);
    var gb = ultimoDeSalud("grasa", dia);
    h += tarjeta("Grasa por cinta", gc ? num(gc.pct) + " %" : null,
      gc ? "de la cintura y el cuello del " + U.etiquetaFecha(gc.fecha) + " · no depende del agua"
         : "hacen falta cintura y cuello", "grasaCinta", null, gc ? gc.pct : null);
    h += tarjeta("Grasa por báscula", gb ? num(gb.v) + " %" : null,
      gb
        ? "del " + U.etiquetaFecha(gb.f) + " · por impedancia, se mueve con el agua" +
          (gc ? " · " + (Math.abs(gc.pct - gb.v) < 1
            ? "a menos de un punto de la cinta: las dos valen"
            : num(Math.abs(gc.pct - gb.v)) + " puntos de diferencia con la cinta") : "")
        : "aún no ha bajado ninguna de intervals",
      "grasa", null, gb ? gb.v : null);
    var mg = ultimoDeSalud("magra", dia);
    if (mg) h += tarjeta("Masa magra", num(mg.v) + " kg",
      "del " + U.etiquetaFecha(mg.f) + " · de la báscula · lo que el plan quiere que aguante",
      "magra", null, mg.v);
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

    var vfcDia = valorDia("vfc", fechaDato);
    h += tarjeta("VFC de anoche", vfcDia ? vfcDia + " ms" : null,
      baseVfc ? "tu base: " + num(baseVfc) + " ms" : "", "vfc", null, vfcDia || null);
    /* Por `valorDia` y no por `d.fcr`: en los días que cubre la exportación
       manda el de Garmin, y si la tarjeta leyera el otro diría un número
       distinto del que pinta la gráfica en esa misma fecha. */
    var fcrDia = valorDia("fcr", fechaDato);
    h += tarjeta("FC en reposo", fcrDia ? fcrDia + " lpm" : null,
      baseFcr ? "tu base: " + num(baseFcr) + " lpm" : "", "fcr", null, fcrDia || null);

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

    /* La grasa de la báscula y la masa magra se han ido arriba, al lado de la
       grasa por cinta: solo dicen algo comparadas entre sí. Y la tensión la
       tecleas tú, así que vive con lo que mides. Un dato en dos sitios sobra
       en uno. */

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

    /* la curva: recuadro con ratón o dedo */
    cont.addEventListener("pointermove", function (e) { if (!datoCurva(e)) quitarDatoCurva(); });
    cont.addEventListener("pointerdown", function (e) { if (!datoCurva(e)) quitarDatoCurva(); });
    /* con el dedo, al levantarlo el navegador dispara «leave»: el recuadro se
       queda puesto hasta que toques fuera de la curva */
    cont.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") quitarDatoCurva(); });

    cont.addEventListener("click", function (e) {
      var t = e.target;
      var volver = t.closest ? t.closest("[data-volver]") : null;
      if (volver) { bloque = "portada"; diaSel = null; matEditando = null; matVista = null; pintar(); return; }

      /* --- material y movimientos: entrar en un bloque y volver a la portada --- */
      var mvIr = t.closest ? t.closest("[data-mv]") : null;
      if (mvIr) { matVista = mvIr.getAttribute("data-mv"); matEditando = null; pintar(); return; }
      var mvAt = t.closest ? t.closest("[data-mv-atras]") : null;
      if (mvAt) { matVista = null; matEditando = null; pintar(); return; }

      var verV = t.closest ? t.closest("[data-video]") : null;
      if (verV) { abrirVideo(verV.getAttribute("data-video")); return; }

      /* --- el semáforo rebaja y se acepta la alternativa --- */
      var alt = t.closest ? t.closest("[data-sem-alt]") : null;
      if (alt) {
        var pa = alt.getAttribute("data-sem-alt").split("|");
        var isoA = pa[0], iA = parseInt(pa[1], 10), kA = parseInt(pa[2], 10);
        var semA = semanaDe(isoA);
        var est = estadoSemaforo(isoA);
        var pr = semA && sesionPrincipal(isoA, semA, tallaDe(semA));
        if (est && pr && est.ofrece[kA]) {
          var nueva = textoAlternativa(pr.s, est.ofrece[kA]);
          var yaA = ajusteDe(isoA);
          /* volver a tocar la que ya está puesta la quita: es el mismo botón */
          if (yaA && yaA.t === nueva.t) ponerAjuste(isoA, null);
          else ponerAjuste(isoA, { i: iA, t: nueva.t, min: nueva.min, descanso: !!nueva.descanso });
          pintarConservando();
        }
        return;
      }
      var desh = t.closest ? t.closest("[data-sem-deshacer]") : null;
      if (desh) { ponerAjuste(desh.getAttribute("data-sem-deshacer"), null); pintarConservando(); return; }

      /* quitar de una vez las repetidas que se colaron en una fusión antigua */
      var lim = t.closest ? t.closest("[data-limpiar]") : null;
      if (lim) { e.preventDefault(); Limpieza.lanzar(); return; }


      /* la × de la tira: marca o desmarca el día sin abrirlo ni soltar bloques */
      var ndB = t.closest ? t.closest("[data-nd]") : null;
      if (ndB) {
        e.preventDefault();
        e.stopPropagation();
        var fnd = ndB.getAttribute("data-nd");
        ponerNoHabil(fnd, noHabilDe(fnd) ? null : "otro");
        pintarConservando();
        return;
      }

      /* marcar o desmarcar un día como no hábil */
      var nhB = t.closest ? t.closest("[data-nohabil]") : null;
      if (nhB) {
        e.preventDefault();
        var pr = nhB.getAttribute("data-nohabil").split(":");
        ponerNoHabil(pr[0], pr[1] || null);
        pintarConservando();
        return;
      }

      /* rescatar un bloque ámbar: pasarlo al día que propone la app */
      var rsc = t.closest ? t.closest("[data-resc]") : null;
      if (rsc) {
        e.preventDefault();
        var pr2 = rsc.getAttribute("data-resc").split(">");
        var semR = semanaDe(pr2[0]);
        if (semR) {
          var bR = bolsilloDe(semR) || [], mapa = repartoDe(semR) || {}, n = 0;
          var sesR = sesionesDe(pr2[0], semR, tallaDe(semR));
          sesR.forEach(function (x, i) {
            if (!x.bid || !cuentaParaElDia(x)) return;
            if (quitadoDe(semR, x.bid)) return;
            if (sesionHecha(pr2[0], x, i)) return;
            mapa[x.bid] = pr2[1]; n++;
          });
          repartoGuardado()[semR.desde] = mapa;
          A.guardar("entreno");
          if (n && U.toast) U.toast(n === 1 ? "1 bloque movido" : n + " bloques movidos");
        }
        pintarConservando();
        return;
      }

      /* quitar un bloque con motivo: se registra el porqué y cuenta como no hecho */
      var qB = t.closest ? t.closest("[data-quitar]") : null;
      if (qB) {
        e.preventDefault();
        abrirQuitar(qB.getAttribute("data-quitar"));
        return;
      }

      /* la salida de la semana: abrir, elegir terreno, elegir horas */
      var salB = t.closest ? t.closest("[data-salida]") : null;
      if (salB) { e.preventDefault(); abrirSalida(salB.getAttribute("data-salida")); return; }

      /* Desde el plan la rutina se abre EN EMERGENTE y no se cambia de
         sección: así la × devuelve a El Plan, que es de donde se venía. */
      var verR = t.closest ? t.closest("[data-ver-rutina]") : null;
      if (verR) {
        e.preventDefault();
        abrirRutina(verR.getAttribute("data-ver-rutina"));
        return;
      }

      /* --- material: editar, añadir, quitar --- */
      var mNue = t.closest ? t.closest("[data-mat-nuevo]") : null;
      if (mNue) { matEditando = "nuevo"; pintar(); return; }
      var mEdi = t.closest ? t.closest("[data-mat-edita]") : null;
      if (mEdi) { matEditando = mEdi.getAttribute("data-mat-edita"); pintar(); return; }
      var mCan = t.closest ? t.closest("[data-mat-cancela]") : null;
      if (mCan) { matEditando = null; pintar(); return; }
      var mGua = t.closest ? t.closest("[data-mat-guarda]") : null;
      if (mGua) { guardarMat(); return; }
      var mBor = t.closest ? t.closest("[data-mat-borra]") : null;
      if (mBor) { borrarMat(mBor.getAttribute("data-mat-borra")); return; }
      var hr = t.closest ? t.closest("[data-histrango]") : null;
      if (hr) { e.preventDefault(); abrirHistoria(histAbierta, hr.getAttribute("data-histrango")); return; }
      /* El interruptor de las noches vale para las dos gráficas: si está
         abierta la emergente se repinta ella, y si no, la de Evolución. */
      var nb = t.closest ? t.closest("[data-noches]") : null;
      if (nb) {
        e.preventDefault();
        VFC_NOCHES = !nb.classList.contains("activo");
        if (histAbierta) abrirHistoria(histAbierta, rangoHist); else pintar();
        return;
      }
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
        /* «tarjeta:tramo». Se repinta CONSERVANDO el scroll: cambiar el periodo
           de la última gráfica no puede devolverte arriba del todo. */
        var pr = rg.getAttribute("data-rango").split(":");
        if (pr.length > 1) { var vr = vistaDe(pr[0]); vr.r = pr[1]; vr.des = 0; }
        else rangoEvo = pr[0];
        if (pideHistorico() && !Historico.datos) Historico.cargar(function () { pintarConservando(); });
        pintarConservando();
        return;
      }
      var dp = t.closest ? t.closest("[data-desp]") : null;
      if (dp) {
        /* «tarjeta:1» atrás un tramo entero, «tarjeta:-1» adelante, «tarjeta:hoy» a cero */
        var pd = dp.getAttribute("data-desp").split(":"), vd = vistaDe(pd[0]);
        if (pd[1] === "hoy") vd.des = 0;
        else vd.des = Math.max(0, Math.min(desTope(pd[0]), vd.des + parseInt(pd[1], 10)));
        if (vd.des > 0 && !Historico.datos) Historico.cargar(function () { pintarConservando(); });
        pintarConservando();
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
      /* Un bloque de la semana: se elige para moverlo, o se suelta si ya
         estaba elegido. EL ATRIBUTO ES `data-blq` Y NO `data-bloque` PORQUE
         ESE YA ESTABA COGIDO: es el de los botones de las secciones de
         Entrenamiento —«plan», «rampa», «evolucion»—, y este manejador va
         delante de aquél. Con el mismo nombre se tragaba todos los clics y no
         abría ninguna sección. (24-sep-2026.) */
      var bb = t.closest ? t.closest("[data-blq]") : null;
      if (bb) {
        e.preventDefault(); e.stopPropagation();
        var pb = bb.getAttribute("data-blq").split(":");
        bloqueSel = (bloqueSel && bloqueSel.bid === pb[1] && bloqueSel.desde === pb[0])
          ? null : { desde: pb[0], bid: pb[1] };
        pintarConservando();
        return;
      }
      var ba = t.closest ? t.closest("[data-blq-a]") : null;
      if (ba) {
        e.preventDefault(); e.stopPropagation();
        var dest = ba.getAttribute("data-blq-a");
        if (dest === "bandeja" && bloqueSel) {
          var smv = semanaDe(bloqueSel.desde);
          if (smv) moverBloque(smv, bloqueSel.bid, null);
        }
        bloqueSel = null;
        pintarConservando();
        return;
      }
      var dd = t.closest ? t.closest("[data-dia]") : null;
      if (dd) {
        var f = dd.getAttribute("data-dia");
        /* con un bloque en la mano, tocar un día lo coloca ahí en vez de abrirlo */
        if (bloqueSel) {
          var sMov = semanaDe(bloqueSel.desde), sDest = semanaDe(f);
          if (sMov && sDest && sDest.desde === sMov.desde) {
            moverBloque(sMov, bloqueSel.bid, f);
            bloqueSel = null;
            pintarConservando();
            return;
          }
          U.toast("Ese día es de otra semana");
          bloqueSel = null;
          pintarConservando();
          return;
        }
        diaSel = (f === U.hoyISO()) ? null : f;
        pintar();
        return;
      }
      /* Casos: los dos filtros y el botón de abrir el folio */
      var cf = t.closest ? t.closest("[data-caso-fam]") : null;
      if (cf) { casoFam = cf.getAttribute("data-caso-fam") || null; pintar(true); return; }
      var cc = t.closest ? t.closest("[data-caso-causa]") : null;
      if (cc) {
        var vc = cc.getAttribute("data-caso-causa") || null;
        /* pulsar la causa que ya está puesta la quita: es lo que espera
           cualquiera al volver a tocarla */
        casoCausa = (vc && vc === casoCausa) ? null : vc;
        pintar(true);
        return;
      }
      var cp = t.closest ? t.closest("[data-caso-pdf]") : null;
      if (cp) {
        var fichero = cp.getAttribute("data-caso-pdf");
        var antes = cp.textContent;
        cp.disabled = true; cp.textContent = "Trayendo\u2026";
        Casos.abrir(fichero, function (ok, aviso) {
          cp.disabled = false; cp.textContent = antes;
          if (!ok) U.toast("No he podido abrirlo: " + (aviso || ""));
          else if (aviso === "descargado") U.toast("Descargado: el navegador no me dejó abrir la pestaña");
        });
        return;
      }
      var b = t.closest ? t.closest("[data-bloque]") : null;
      if (b) {
        bloque = b.getAttribute("data-bloque");
        if (bloque === "actividad") prepararArchivo();   // pide sus ficheros al entrar
        if (bloque === "casos") prepararCasos();
        pintar();
        return;
      }
      /* TOCAR FUERA SUELTA EL BLOQUE QUE LLEVABAS EN LA MANO. Si lo tocaste
         sin querer, no hace falta buscar el «cancelar»: vale con tocar en
         cualquier hueco. Va al final de todo y sólo repinta si de verdad
         había algo cogido. (Carlos, 24-sep-2026.) */
      if (bloqueSel) { bloqueSel = null; pintarConservando(); }
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
        /* la semana que se enseña (sigue a las flechas), no siempre la de hoy */
        var desdeT = t.getAttribute("data-sem-desde");
        var sem = desdeT ? semanaDe(desdeT) : semanaDe(U.hoyISO());
        if (sem) { ent().talla[sem.desde] = t.value; A.guardar("entreno"); pintarConservando(); }
      }
    });

    /* cerrar la ventana de la guía: con la × , con «Entendido» o pinchando fuera */
    var modal = document.getElementById("modal");
    if (modal) modal.addEventListener("click", function (e) {
      /* el selector de tramo vive DENTRO de la ventana, así que se atiende aquí:
         el manejador de la pestaña no llega hasta el modal */
      var hr = e.target.closest ? e.target.closest("[data-histrango]") : null;
      if (hr) { e.preventDefault(); abrirHistoria(histAbierta, hr.getAttribute("data-histrango")); return; }
      var nb2 = e.target.closest ? e.target.closest("[data-noches]") : null;
      if (nb2) {
        e.preventDefault();
        VFC_NOCHES = !nb2.classList.contains("activo");
        if (histAbierta) abrirHistoria(histAbierta, rangoHist);
        return;
      }
      /* el motivo por el que se quita un bloque: también en la ventana */
      var qm = e.target.closest ? e.target.closest("[data-quitar-m]") : null;
      if (qm) {
        e.preventDefault();
        var pr = qm.getAttribute("data-quitar-m").split(":");
        var semQ = semanaDe(pr[0]);
        if (semQ) {
          ponerQuitado(semQ, pr[1], pr[2] || null);
          bloqueSel = null;
          if (U.toast) U.toast(pr[2] ? "Bloque quitado" : "Bloque recuperado");
        }
        cerrarGuia();
        pintarConservando();
        return;
      }

      /* LA SALIDA DE LA SEMANA SE ELIGE AQUÍ, no en el manejador de la pestaña.
         Es el mismo motivo de la nota de arriba: la ventana cuelga de `#modal`,
         fuera del contenedor de Entrenamiento, así que aquel `click` no la ve.
         Se aprendió probando: los botones de terreno no hacían nada. */
      var salM = e.target.closest ? e.target.closest("[data-sal-modo]") : null;
      var salH = e.target.closest ? e.target.closest("[data-sal-hora]") : null;
      if (salM || salH) {
        e.preventDefault();
        var semS = semanaActivaSalida();
        if (semS) {
          if (salM) {
            /* sin id = «volver a la propuesta»: se borra lo declarado y la app
               vuelve a proponer terreno y horas. */
            ponerLargo(semS, salM.getAttribute("data-sal-modo") || null, 0);
          } else {
            var Lact = largoDe(semS);
            ponerLargo(semS, Lact ? Lact.modo.id : null,
                       parseFloat(salH.getAttribute("data-sal-hora")));
          }
          var cu = document.getElementById("salida-cuerpo");
          if (cu) cu.innerHTML = cuerpoSalida(semS);
          pintarConservando();
        }
        return;
      }
      /* el «cómo se hace» de la rutina emergente: vive en la ventana */
      var vidM = e.target.closest ? e.target.closest("[data-video]") : null;
      if (vidM) { e.preventDefault(); abrirVideo(vidM.getAttribute("data-video"), rutinaAbierta); return; }
      var volR = e.target.closest ? e.target.closest("[data-volver-rutina]") : null;
      if (volR) { e.preventDefault(); abrirRutina(volR.getAttribute("data-volver-rutina")); return; }
      if (e.target === modal || (e.target.closest && e.target.closest("[data-cerrar-guia]"))) cerrarGuia();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarGuia(); });

    var nav = document.getElementById("pestanas");
    if (nav) nav.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-vista]") : null;
      if (!b) return;
      var mia = b.getAttribute("data-vista") === "entreno";
      vestir(mia);
      if (mia) {
        /* SIEMPRE SE ENTRA POR LA PORTADA (21-sep-2026, Carlos). Antes la
           pestaña guardaba el último bloque abierto, así que volver a
           Entrenamiento te dejaba en medio de Evolución o de Material, sin el
           índice a la vista. Entrar siempre por el mismo sitio vale más que
           ahorrarse un clic: la portada es el mapa de la pestaña. */
        bloque = "portada";
        diaSel = null; matEditando = null; matVista = null;
        pintar();
      }
    });

    /* ÉSTE ES EL QUE ÉL SOSPECHABA, Y ACERTABA A MEDIAS: salta con cualquier
       guardado del almacén, y también cuando la sincronización con GitHub trae
       lo del otro aparato y lo funde. Repintaba desde arriba. */
    if (A.suscribir) A.suscribir(function (motivo) {
      if (motivo === "entreno") return;                       // ya repintamos nosotros
      var v = document.getElementById("vista-entreno");
      if (v && v.classList.contains("activa")) pintarConservando();
    });
  }

  /* ==================== LA VENTANITA DE LAS GRÁFICAS ====================
     Al pasar el dedo o el ratón por una gráfica sale el valor y la fecha del
     punto más cercano, con una guía vertical. Se engancha una sola vez y vale
     para todas: las de Evolución, las del pase y las emergentes. */

  var tipPuesto = false;

  /* ==================== ARRASTRAR BLOQUES ====================
     Los dos toques —bloque y luego día— son lo que funciona en el móvil. Pero
     en el ordenador lo natural es arrastrar, y así estaba en el boceto que
     Carlos aprobó: probó a arrastrar, no pasó nada, y con razón dijo que no
     coincidía. Las dos formas conviven: el arrastre para el ratón, los dos
     toques para el dedo. (24-sep-2026.) */
  var arrastrePuesto = false, llevando = null;

  function ponerArrastre() {
    if (arrastrePuesto) return;
    arrastrePuesto = true;

    function bloqueDe(e) {
      var t = e.target;
      return (t && t.closest) ? t.closest("[data-blq]") : null;
    }
    function destinoDe(e) {
      var t = e.target;
      if (!t || !t.closest) return null;
      return t.closest("[data-dia]") || t.closest(".bl-bandeja");
    }
    document.addEventListener("dragstart", function (e) {
      var b = bloqueDe(e);
      if (!b) return;
      var pb = b.getAttribute("data-blq").split(":");
      llevando = { desde: pb[0], bid: pb[1] };
      bloqueSel = null;                       // arrastrando no hace falta el aviso
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", b.getAttribute("data-blq")); } catch (x) {}
      }
      b.classList.add("llevando");
    });
    document.addEventListener("dragend", function () {
      llevando = null;
      var v = document.querySelectorAll(".dia-bl.llevando, .ent-dia.encima, .bl-bandeja.encima");
      for (var i = 0; i < v.length; i++) v[i].classList.remove("llevando", "encima");
    });
    document.addEventListener("dragover", function (e) {
      if (!llevando) return;
      var d = destinoDe(e);
      if (!d) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      d.classList.add("encima");
    });
    document.addEventListener("dragleave", function (e) {
      var d = destinoDe(e);
      if (d) d.classList.remove("encima");
    });
    document.addEventListener("drop", function (e) {
      if (!llevando) return;
      var d = destinoDe(e);
      if (!d) return;
      e.preventDefault();
      d.classList.remove("encima");
      var sMov = semanaDe(llevando.desde);
      if (!sMov) { llevando = null; return; }
      if (d.classList.contains("bl-bandeja")) {
        moverBloque(sMov, llevando.bid, null);
      } else {
        var iso = d.getAttribute("data-dia"), sDest = semanaDe(iso);
        if (!sDest || sDest.desde !== sMov.desde) {
          U.toast("Ese día es de otra semana");
          llevando = null; pintarConservando(); return;
        }
        moverBloque(sMov, llevando.bid, iso);
      }
      llevando = null;
      pintarConservando();
    });
  }

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
      var conAno = svg.getAttribute("data-ano") === "1";
      tip.innerHTML = "<b>" + texto + "</b>" +
        "<span>" + U.esc(U.etiquetaFecha(mejor.f) +
          (conAno ? " de " + U.desdeISO(mejor.f).getFullYear() : "")) + "</span>";
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

  /* Al abrir la app se aterriza en El Plan, no en el menú. Es lo primero que
     se hace por la mañana: pesarse, anotar las medidas y ver qué toca. Antes
     había que cambiar de pestaña cada día para llegar.

     Se espera a que el vídeo de bienvenida se quite solo: mientras está, la
     portada tapa todo y cambiar de pestaña detrás no serviría de nada. */
  function abrirEnElPlan() {
    var vueltas = 0;
    (function esperar() {
      if (document.getElementById("portada") && vueltas++ < 900) {
        return setTimeout(esperar, 100);                      // hasta un minuto y medio
      }
      var btn = document.querySelector('#pestanas [data-vista="entreno"]');
      if (!btn) return;                                       // sin pestaña no hay nada que hacer
      bloque = "plan";
      diaSel = null;
      btn.click();                                            // reusa el cambio de vista de siempre
    })();
  }

  function arrancar() {
    if (!U || !A || !P) return;
    if (!A.estado) { setTimeout(arrancar, 80); return; }      // esperamos a que app.js inicie el almacén
    inyectarEstilos();
    inyectarHtml();
    conectar();
    ponerTip();
    ponerArrastre();
    if (Salud.deCache()) Salud.sembrarPesos();                // lo de la última vez, para pintar ya
    pintar();
    abrirEnElPlan();
    Salud.cargar(false, function () {                         // y en segundo plano, lo de hoy
      var n = Salud.sembrarPesos();
      if (n) U.toast(n === 1 ? "1 peso traído de intervals" : n + " pesos traídos de intervals");
      var v = document.getElementById("vista-entreno");
      /* Y éste es el que más veces le habrá saltado: al arrancar se pinta con
         la copia guardada y uno o dos segundos después llega salud.json. */
      if (v && v.classList.contains("activa")) pintarConservando();
    });
  }

  /* ==================== EL PUENTE CON LA COMIDA ====================

     La otra mitad de la app —el menú— necesita saber dos cosas que sólo viven
     aquí: qué te toca hacer hoy según el plan, y qué hiciste de verdad según
     intervals. Con lo primero puede subir el objetivo de calorías por la
     mañana; con lo segundo, corregirlo por la tarde.

     Se publica como un objeto en la ventana y no metiendo el plan en el
     almacén, porque el cálculo de qué sesión toca cada día no es una tabla:
     depende de la semana, del desfase que llevas y de la talla que eligieras,
     y eso es de aquí. Duplicarlo en el otro fichero era garantizar que un día
     dijeran cosas distintas.

     LAS KILOCALORÍAS NO SALEN DE UNA TABLA DE MET: salen de SUS PROPIAS
     SALIDAS del último año. Y la diferencia no es pequeña — medido el
     20-sep-2026, su rodillo pasó de 9,6 kcal/min de mediana histórica a 5,6 en
     el último año: la misma hora que antes le costaba 574 kcal ahora le cuesta
     333, porque mueve menos vatios. Una tabla fija le habría regalado un 70%
     en cada sesión, justo en el deporte donde más entrena. */

  /* De qué familia es cada deporte, para juntar sus kilocalorías por minuto.
     El senderismo va aparte de caminar a propósito: 6,9 contra 4,9. */
  var FAM_KCAL = {
    and: "caminar", pas: "caminar", cor: "correr", sen: "sender",
    bici: "bici", rod: "bici", fue: "fuerza"
  };
  /* Lo medido el 20-sep-2026 sobre sus salidas, por si algún día no hubiera
     bastantes para calcularlo en caliente. No es una tabla de manual: son sus
     propias medianas. */
  var KCAL_MIN_BASE = { caminar: 4.9, sender: 6.9, bici: 5.6, fuerza: 5.2,
                        correr: 4.7, movilidad: 0, otra: 4.0 };
  var cacheTasas = null;

  /* Mediana de kcal por minuto de cada familia, con SUS salidas del último año.
     Sólo cuentan las que midió el reloj y pasan del cuarto de hora: una sesión
     de diez minutos no mide nada, y una estimación no puede calibrar a otra. */
  function tasasKcalMin() {
    if (cacheTasas) return cacheTasas;
    var por = {}, lista = actividadesJuntas(), desde = U.sumarDias(U.hoyISO(), -365);
    lista.forEach(function (a) {
      var f = FAM_KCAL[a.dep];
      if (!f) return;
      var k = a.kcal_netas, m = a.min_mov;
      if (!k || !m || m < 15) return;
      if (String(a.fecha || "").slice(0, 10) < desde) return;
      (por[f] = por[f] || []).push(k / m);
    });
    var out = {}, f2;
    for (f2 in KCAL_MIN_BASE) out[f2] = KCAL_MIN_BASE[f2];
    for (f2 in por) {
      var v = por[f2];
      if (v.length < 5) continue;                 // con cuatro salidas no se calibra
      v.sort(function (a, b) { return a - b; });
      var i = Math.floor(v.length / 2);
      out[f2] = v.length % 2 ? v[i] : (v[i - 1] + v[i]) / 2;
      out[f2 + "_n"] = v.length;
    }
    cacheTasas = out;
    return out;
  }

  /* La familia de una sesión del plan, por su texto. `familia()` mete el
     senderismo dentro de caminar —allí le vale—, pero aquí no: cuesta un 40%
     más y son 100 kcal de diferencia en una hora. */
  function famDeTexto(txt) {
    /* Con los acentos quitados, como hace `familia()`. Sin esto «Elíptica» no
       casaba con `eliptic` y se iba al saco de «otra» — un fallo que sólo
       aparece con los nombres que escribe él, no con los que pone Garmin. */
    var t = String(txt || "").toLowerCase()
      .replace(/[áà]/g, "a").replace(/[éè]/g, "e").replace(/[íì]/g, "i")
      .replace(/[óò]/g, "o").replace(/[úù]/g, "u");
    /* «montañ» Y «montan»: la eñe no se toca al normalizar, así que una sola de
       las dos dejaría fuera la mitad de los nombres. */
    if (/sender|montañ|montan|cumbre|pico/.test(t)) return "sender";
    /* TODO LO DE GIMNASIO ES LA MISMA FAMILIA, y no por lo que trabaja sino por
       el hueco que ocupa: si el plan pedía una sesión de sala y fuiste a la
       sala, da igual que acabaras haciendo remo, pilates o elíptica — esa
       sesión ya está hecha y su previsión sobra. Separarlas dejaría la
       previsión de fuerza esperando para siempre y sumaría las dos cosas.
       Va antes que `familia()` porque allí el remo tiene cajón propio, que le
       sirve para marcar la casilla del plan pero no para esto. */
    if (/remo|row|pilates|eliptic|elliptic|gimnas|maquin|circuito|funcional/.test(t)) return "fuerza";
    var f = familia(txt);
    if (f === "caminar") return "caminar";
    if (f === "bici") return "bici";
    if (f === "fuerza") return "fuerza";
    if (f === "correr") return "correr";
    if (f === "movilidad") return "movilidad";
    /* Lo que no se reconoce cae aquí, y cae junto: una previsión sin clasificar
       la taparía cualquier salida sin clasificar. De sus 360 actividades
       recientes sólo caía una, y era un «Rowing» que ahora va a sala. */
    return "otra";
  }

  global.KHBEntreno = {
    /* LA RUTINA QUE TOCABA, para la ficha de una sesión de fuerza.
       Los nombres de los ejercicios sólo llegan con la exportación de Garmin
       —cada dos meses—, así que entre medias la ficha enseña tres filas que
       dicen «sin identificar» y nada más. Con esto puede enseñar al lado lo que
       el plan mandaba hacer, marcado como previsto, hasta que llegue lo real.

       Se busca por el nombre de la actividad: «Fuerza A corta» lleva dentro
       «Fuerza A». Si no cuadra ninguna, se devuelve null y la ficha no inventa
       nada: no se adivina por el día de la semana, porque una sesión movida de
       día daría la rutina equivocada con toda la seguridad del mundo. */
    rutinaPrevista: function (nombre) {
      var t = String(nombre || "").toLowerCase();
      for (var i = 0; i < SESIONES.length; i++) {
        if (t.indexOf(SESIONES[i].n.toLowerCase()) >= 0) {
          var s = SESIONES[i];
          return { n: s.n, min: s.min, mov: s.mov.map(function (m) {
            return { n: m.n, s: m.s, r: m.r, kg: m.kg || null, goma: m.goma || null,
                     nota: m.nota || "" };
          }) };
        }
      }
      return null;
    },

    /* Qué toca hoy según el plan, con lo que costaría. Los días fuera del plan
       devuelven lista vacía, no ceros. */
    previsto: function (iso) {
      if (!P || !P.rampa) return [];
      var sem = semanaDe(iso);
      if (!sem) return [];
      var tasas = tasasKcalMin();
      return sesionesDe(iso, sem, tallaDe(sem)).map(function (s) {
        var f = famDeTexto(s.t);
        var min = s.min || 0;
        return { t: s.t, min: min, fam: f, grande: !!s.grande,
                 kcal: Math.round(min * (tasas[f] || 0)) };
      }).filter(function (s) { return s.min > 0; });
    },

    /* Qué hiciste de verdad, según intervals. Las kilocalorías son las NETAS
       —lo que costó moverse por encima de estar vivo— porque el objetivo del
       día ya cuenta el metabolismo basal de esas horas. */
    real: function (iso) {
      if (!Salud.datos) return [];
      return Salud.actividades(iso).map(function (a) {
        /* La familia sale del nombre y del tipo, que es lo único que trae
           salud.json: el deporte lo decide la app al pintar, no el fichero.
           Hace falta para emparejar cada salida con la sesión que la esperaba. */
        return { id: a.id, nombre: a.nombre || a.tipo || "Actividad",
                 min: Math.round(a.min_mov || 0),
                 kcal: (a.kcal_netas != null) ? Math.round(a.kcal_netas) : null,
                 fam: famDeTexto((a.nombre || "") + " " + (a.tipo || "")),
                 dep: a.dep || null };
      });
    },

    /* Para poder enseñar de dónde sale el número, que si no parece magia. */
    tasas: tasasKcalMin
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();

})(window);
