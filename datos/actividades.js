/* Catálogo de actividad física
   met = equivalente metabólico. Gasto ≈ met × 3,5 × peso(kg) / 200 × minutos
   (ecuación del ACSM; es una estimación, no una medida) */
window.DATOS_ACTIVIDADES = [
  { id:"caminar_tranquilo", n:"Caminar tranquilo",            met:3.0, min:45 },
  { id:"caminar_ligero",    n:"Caminar a buen paso",          met:4.3, min:45 },
  { id:"caminar_cuesta",    n:"Caminar con cuestas",          met:6.0, min:45 },
  { id:"bici_suave",        n:"Bici indoor suave",            met:5.5, min:30 },
  { id:"bici_moderada",     n:"Bici indoor moderada",         met:7.0, min:40 },
  { id:"bici_fuerte",       n:"Bici indoor fuerte o series",  met:9.5, min:30 },
  { id:"musculacion",       n:"Musculación en casa",          met:5.0, min:40 },
  { id:"musculacion_suave", n:"Musculación suave o gomas",    met:3.5, min:30 },
  { id:"estiramientos",     n:"Estiramientos o movilidad",    met:2.5, min:20 },
  { id:"tareas_casa",       n:"Tareas de casa activas",       met:3.3, min:60 },
  { id:"jardin",            n:"Jardín o huerto",              met:4.0, min:60 },
  { id:"natacion",          n:"Natación suave",               met:5.8, min:40 },
  { id:"otra",              n:"Otra actividad",               met:4.0, min:30 },

  /* ---------- SALIDAS LARGAS: las de los días de ruta ----------
     Las de arriba son sesiones de casa, de media hora. Estas son jornadas, y
     por eso vienen con las horas por defecto en horas de verdad. Los MET son
     los del Compendio de Ainsworth para actividad al aire libre con desnivel. */
  /* LOS DOS DE SENDERISMO VAN CALIBRADOS CON SU RELOJ, no con la tabla.
     El Compendium of Physical Activities da 6,0 para «hiking, cross country» y
     7,0 para «backpacking», y eso es lo que había. El 21-sep-2026 Carlos dijo
     que 2.500 kcal en cinco horas le parecían muchas, y tenía razón: se midió
     contra sus 60 jornadas de tres horas o más con calorías medidas por el
     reloj, y sale bastante por debajo de la tabla.

         salidas suyas de 3 h o más        n    kcal/h   MET que implica
         paseo largo, menos de 400 m+     21      374          3,7
         monte, de 400 a 800 m+           29      450          4,5
         monte duro, más de 800 m+        10      557          5,6

     Así que «Senderismo de montaña» toma 4,5 —la mediana de sus días de monte—
     y «con desnivel o mochila» toma 5,6, la de los días duros. La tabla de
     Ainsworth describe a una persona genérica; estos números describen a
     Carlos, que es de quien va el objetivo de calorías.

     Si algún día cambia mucho de peso o de forma, esto se vuelve a medir: son
     una mediana de lo suyo, no una constante física. */
  { id:"senderismo",        n:"Senderismo de montaña",              met:4.5, min:240 },
  { id:"senderismo_fuerte", n:"Senderismo con desnivel o mochila",  met:5.6, min:240 },
  { id:"bici_carretera",    n:"Bici de carretera",                  met:8.0, min:180 },
  { id:"bici_btt",          n:"Bici de montaña (BTT)",              met:8.5, min:180 },
  { id:"bici_paseo",        n:"Bici de paseo, ritmo tranquilo",     met:5.0, min:120 }
];
