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
  /* MET del Compendium of Physical Activities: 17080 «hiking, cross country» = 6,0
     y 17010 «backpacking» = 7,0. El 7,5 que había antes no estaba en ninguna tabla. */
  { id:"senderismo",        n:"Senderismo de montaña",              met:6.0, min:240 },
  { id:"senderismo_fuerte", n:"Senderismo con desnivel o mochila",  met:7.0, min:240 },
  { id:"bici_carretera",    n:"Bici de carretera",                  met:8.0, min:180 },
  { id:"bici_btt",          n:"Bici de montaña (BTT)",              met:8.5, min:180 },
  { id:"bici_paseo",        n:"Bici de paseo, ritmo tranquilo",     met:5.0, min:120 }
];
