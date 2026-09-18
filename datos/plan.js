/* datos/plan.js — El Plan: rampa, plantilla de semana y tareas con check.
   Espejo del puente informes-salud/plan-entrenamiento.json (v3, 18-sep-2026).
   Si cambia el puente, se regenera este fichero: la app no calcula el plan, lo lee. */
(function (global) {
  "use strict";

  global.DATOS_PLAN = {

    version: 3,
    generado: "2026-09-18",
    titulo: "Vuelta a la forma",

    /* ---------- la rampa: cada semana, su carga y su talla ---------- */
    rampa: [
      { n: 1,  desde: "2026-09-18", hasta: "2026-09-27", carga: 90,  talla: "R", nota: "Con prednisona. Fuerza a media carga" },
      { n: 2,  desde: "2026-09-28", hasta: "2026-10-04", carga: 110, talla: "R", nota: "Fin del corticoide. Revisión el 28" },
      { n: 3,  desde: "2026-10-05", hasta: "2026-10-11", carga: 140, talla: "A", nota: "Primera semana de verdad" },
      { n: 4,  desde: "2026-10-12", hasta: "2026-10-18", carga: 95,  talla: "B", nota: "Descarga. El domingo, test de 20 minutos" },
      { n: 5,  desde: "2026-10-19", hasta: "2026-10-25", carga: 160, talla: "A", nota: "" },
      { n: 6,  desde: "2026-10-26", hasta: "2026-11-01", carga: 180, talla: "A", nota: "" },
      { n: 7,  desde: "2026-11-02", hasta: "2026-11-08", carga: 200, talla: "A", nota: "" },
      { n: 8,  desde: "2026-11-09", hasta: "2026-11-15", carga: 130, talla: "B", nota: "Descarga" },
      { n: 9,  desde: "2026-11-16", hasta: "2026-11-22", carga: 225, talla: "A", nota: "" },
      { n: 10, desde: "2026-11-23", hasta: "2026-11-29", carga: 250, talla: "A", nota: "Segundo test el jueves 26" },
      { n: 11, desde: "2026-11-30", hasta: "2026-12-06", carga: 275, talla: "A", nota: "Entra un día de intensidad" },
      { n: 12, desde: "2026-12-07", hasta: "2026-12-13", carga: 180, talla: "B", nota: "Descarga" },
      { n: 13, desde: "2026-12-14", hasta: "2027-06-30", carga: 300, talla: "A", nota: "Crucero: tres semanas y la cuarta de descarga" }
    ],

    /* ---------- las tallas de semana ----------
       Los días van con el número de getDay(): 1 lunes … 6 sábado, 0 domingo. */
    plantillas: {
      R: {
        nombre: "Reactivación",
        pie: "Movimiento diario con el corticoide encima. Ritmo de poder hablar, siempre.",
        dias: {
          1: [{ t: "Fuerza A, media carga", min: 30 }, { t: "Caminar", min: 30 }],
          2: [{ t: "Bici muy suave, por debajo de 125 ppm", min: 40 }],
          3: [{ t: "Caminar", min: 55 }],
          4: [{ t: "Fuerza B, media carga", min: 30 }, { t: "Caminar", min: 30 }],
          5: [{ t: "Bici suave", min: 45 }],
          6: [{ t: "Caminar", min: 65 }],
          0: [{ t: "Descanso, o paseo corto", min: 30 }]
        }
      },
      A: {
        nombre: "Semana A",
        pie: "La normal. De lunes a viernes en casa y en el barrio; un solo día grande el fin de semana.",
        dias: {
          1: [{ t: "Fuerza A", min: 45 }, { t: "Caminar", min: 45 }],
          2: [{ t: "Bici Z2, 125-140 ppm", min: 75 }],
          3: [{ t: "Caminar a buen paso", min: 60 }, { t: "Movilidad de cuello y mandíbula", min: 15 }],
          4: [{ t: "Fuerza B", min: 45 }, { t: "Bici suave", min: 40 }],
          5: [{ t: "Bici Z2 larga", min: 90 }],
          6: [{ t: "DIA_GRANDE", min: 0 }],
          0: [{ t: "DIA_GRANDE", min: 0 }]
        }
      },
      B: {
        nombre: "Semana B, descarga",
        pie: "Un 35 % menos y sin intensidad. La descarga no es opcional: es lo que faltaba en 2025.",
        dias: {
          1: [{ t: "Fuerza A, sin subir peso", min: 35 }, { t: "Caminar", min: 30 }],
          2: [{ t: "Bici Z2 corta", min: 50 }],
          3: [{ t: "Caminar", min: 45 }],
          4: [{ t: "Fuerza B, sin subir peso", min: 35 }],
          5: [{ t: "Bici suave", min: 45 }],
          6: [{ t: "Salida suave", min: 90 }],
          0: [{ t: "Descanso", min: 0 }]
        }
      },
      S: {
        nombre: "Semana S, supervivencia",
        pie: "El suelo: tres sesiones de 40 minutos. No se negocia hacia abajo y no se compensa después.",
        dias: {
          1: [{ t: "Fuerza", min: 40 }],
          2: [],
          3: [{ t: "Bici Z2", min: 40 }],
          4: [],
          5: [{ t: "Caminar", min: 40 }],
          6: [],
          0: []
        }
      }
    },

    /* Semana 1 entera a pie: da tiempo a montar la habitación del rodillo.
       La fuerza se queda —es en casa y es lo que frena la pérdida de músculo
       con el corticoide—. La bici entra en la semana 2, el martes 29.
       Estas líneas mandan sobre la plantilla de la semana. */
    excepciones: {
      "2026-09-18": [{ t: "Caminar llano, a ritmo de poder hablar", min: 45 }],
      "2026-09-19": [{ t: "Caminar", min: 50 }, { t: "Movilidad de cuello y mandíbula", min: 10 }],
      "2026-09-20": [{ t: "Caminar suave", min: 60 }],
      "2026-09-21": [{ t: "Fuerza A, media carga", min: 30 }, { t: "Caminar", min: 30 }],
      "2026-09-22": [{ t: "Caminar a buen paso", min: 50 }],
      "2026-09-23": [{ t: "Caminar", min: 55 }, { t: "Movilidad de cuello y mandíbula", min: 10 }],
      "2026-09-24": [{ t: "Fuerza B, media carga", min: 30 }, { t: "Caminar", min: 30 }],
      "2026-09-25": [{ t: "Caminar a buen paso", min: 55 }],
      "2026-09-26": [{ t: "Caminar", min: 65 }],
      "2026-09-27": [{ t: "Descanso, o paseo corto", min: 30 }]
    },

    /* El día grande alterna: semana impar, montaña; semana par, bici. */
    diaGrande: {
      montana: [
        { hasta: 4,  texto: "Montaña: 8-10 km y 250-350 m" },
        { hasta: 8,  texto: "Montaña: 12-14 km y 450-600 m" },
        { hasta: 16, texto: "Montaña: 15-18 km y 700-800 m" },
        { hasta: 24, texto: "Montaña: 18-22 km y 900-1.100 m" },
        { hasta: 99, texto: "Montaña: 20-25 km y 1.000-1.200 m" }
      ],
      bici: [
        { hasta: 4,  texto: "Bici: 30-40 km llanos, acompañado" },
        { hasta: 8,  texto: "Bici: 45-55 km con algún repecho" },
        { hasta: 16, texto: "Bici: 60-70 km rodadores" },
        { hasta: 24, texto: "Bici: 70-85 km con puerto suave" },
        { hasta: 99, texto: "Bici: 80-100 km con desnivel" }
      ],
      aviso: "Se sale con Balance positivo. En montaña, bastones y acompañado; en bici, nunca solo.",
      imagenes: { montana: "iconos/khb/11-montana.webp", bici: "iconos/khb/10-bici.webp" }
    },

    /* ---------- lo que se teclea ---------- */
    medidas: [
      { id: "peso",    nombre: "Peso",       unidad: "kg",   paso: 0.1, min: 35, max: 250,
        dias: [1, 3, 6], ayuda: "Al despertar, tras orinar, antes de beber o comer, desnudo. Nunca después de entrenar." },
      { id: "cintura", nombre: "Cintura",    unidad: "cm",   paso: 0.5, min: 50, max: 180,
        dias: [1], ayuda: "De pie, en ayunas, al final de una espiración normal, a la altura del ombligo. Sin apretar." },
      { id: "tension", nombre: "Tensión",    unidad: "mmHg", texto: true,
        diariaHasta: "2026-09-28", diasDespues: [1, 4], ayuda: "Escríbela como 128/82. Los corticoides la suben." },
      { id: "pulso",   nombre: "Pulso",      unidad: "ppm",  paso: 1, min: 30, max: 200,
        diariaHasta: "2026-09-28", diasDespues: [1, 4],
        ayuda: "El que marca el tensiómetro en esa misma medida. Sirve de contraste con el pulso en reposo del reloj." },
      { id: "brazo",   nombre: "Brazo",      unidad: "cm",   paso: 0.5, min: 15, max: 70,
        diaDelMes: 1, informativo: true, ayuda: "Solo informativo: se mueve 2-3 mm en meses y la cinta tiene ±5 mm de error." }
    ],

    /* ---------- tratamiento y tareas sueltas ---------- */
    tratamientos: [
      { id: "prednisona", nombre: "Prednisona de la mañana", desde: "2026-09-14", hasta: "2026-09-28",
        ayuda: "Por la mañana; la segunda dosis a mediodía, nunca de noche. No interrumpir de golpe." }
    ],

    tareas: [
      { id: "ftp155", nombre: "Poner la FTP en 155 W en Zwift, Strava e intervals", limite: "2026-09-21",
        ayuda: "Con 200 W declarados, toda la carga del plan sale un 35-40 % baja." },
      { id: "cinta", nombre: "Tener a mano una cinta métrica de sastre", limite: "2026-09-21", ayuda: "" },
      { id: "revision", nombre: "Revisión en el IOM, con las cuatro preguntas", limite: "2026-09-28",
        ayuda: "Sal y ejercicio · limitación vestibular · trabajo de fuerza · doble inmunosupresión." },
      { id: "test1", nombre: "Test de 20 minutos en Zwift", limite: "2026-10-12",
        ayuda: "Sale la FTP real y con ella las zonas definitivas." }
    ],

    /* ---------- reglas que la pantalla enseña ---------- */
    suelo: "El día cuenta como cumplido si se hizo la sesión que tocaba.",
    textos: {
      sinSesion: "Hoy no toca nada. El descanso es parte del plan.",
      auto: "Se marca sola cuando la sesión llega del reloj.",
      fueraDePlan: "Fuera del plan: empieza el 18 de septiembre de 2026."
    }
  };

})(window);
