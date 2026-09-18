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
        dias: [0, 1, 2, 3, 4, 5, 6], diasFijos: [1, 3, 6], ultimo: true,
        ayuda: "Al despertar, tras orinar, antes de beber o comer, desnudo. Nunca después de entrenar. " +
               "Los días fijos son lunes, miércoles y sábado, pero si te pesas otro día, queda anotado igual." },
      { id: "cintura", nombre: "Cintura",    unidad: "cm",   paso: 0.5, min: 50, max: 180,
        dias: [1], ayuda: "De pie, en ayunas, al final de una espiración normal, a la altura del ombligo. La cinta apoyada, sin apretar. Mide dos veces y quédate con la que se repita." },
      { id: "cuello",  nombre: "Cuello",     unidad: "cm",   paso: 0.5, min: 25, max: 60,
        dias: [1], ayuda: "Justo debajo de la nuez, con la cinta un poco inclinada hacia abajo por delante. Con cuello y cintura sale el porcentaje de grasa por cinta, que no se mueve con la hidratación." },
      { id: "sistolica",  nombre: "Tensión alta", unidad: "mmHg", paso: 1, min: 60, max: 260,
        diariaHasta: "2026-09-28", diasDespues: [1, 4], guia: "tension",
        ayuda: "La alta es la SISTÓLICA, el número grande del tensiómetro. Los corticoides la suben." },
      { id: "diastolica", nombre: "Tensión baja", unidad: "mmHg", paso: 1, min: 30, max: 160,
        diariaHasta: "2026-09-28", diasDespues: [1, 4], guia: "tension",
        ayuda: "La baja es la DIASTÓLICA, el segundo número." },
      { id: "pulso",   nombre: "Pulso",      unidad: "ppm",  paso: 1, min: 30, max: 200,
        diariaHasta: "2026-09-28", diasDespues: [1, 4], guia: "tension",
        ayuda: "El que marca el tensiómetro en esa misma medida. Sirve de contraste con el pulso en reposo del reloj." },
      { id: "tobillo", nombre: "Tobillo",    unidad: "cm",   paso: 0.5, min: 15, max: 45,
        diariaHasta: "2026-09-28", diasDespues: [1],
        ayuda: "Mide retención de líquidos, no grasa. Justo por encima de los huesos del tobillo, siempre la MISMA pierna y por la mañana. Con el corticoide, a diario." },
      { id: "brazo",   nombre: "Brazo",      unidad: "cm",   paso: 0.5, min: 15, max: 70,
        diaDelMes: 1, informativo: true, ayuda: "Mensual y solo informativo: se mueve 2-3 mm en meses y la cinta tiene ±5 mm de error." },
      { id: "muslo",   nombre: "Muslo",      unidad: "cm",   paso: 0.5, min: 30, max: 90,
        diaDelMes: 1, informativo: true,
        ayuda: "Mensual. Es donde vive el músculo del ciclista: si el peso baja y el muslo aguanta, vas bien; si bajan los dos, estás perdiendo músculo." }
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

    /* ---------- grasa estimada con la cinta ----------
       Fórmula de la Marina de EE. UU. en centímetros, para hombre:
         %grasa = 495 / (1,0324 − 0,19077·log10(cintura − cuello) + 0,15456·log10(altura)) − 450
       Error de un 3-4 % frente a un DEXA, pero ESTABLE: no depende de la hidratación,
       que es justo lo que estropea la impedancia de la báscula. */
    grasaCinta: { metodo: "navy", altura_cm: 182, sexo: "h",
      aviso: "Estimación por cinta, con 3-4 % de error. Vale para la tendencia, no como cifra exacta." },

    /* ---------- el semáforo ----------
       Autoriza o modifica la sesión, y cuando la rebaja ofrece la alternativa.
       Se calibra a mediados de octubre, con tres semanas limpias sin corticoide. */
    semaforo: {
      activo: false,
      desde: "2026-10-15",
      pendiente: "Sin calibrar. Se decide sobre fatiga frente a forma, las dos últimas noches y el tamaño de la sesión — no sobre la VFC.",
      estados: {
        verde:  { nombre: "Normal",   dice: "Adelante con lo de hoy" },
        ambar:  { nombre: "Suave",    dice: "Hoy no toca apretar",
                  ofrece: ["La misma sesión al 60 % del tiempo y sin intensidad", "Cambiar la bici por una caminata"] },
        rojo:   { nombre: "Descansa", dice: "Hoy no",
                  ofrece: ["Paseo de 20-30 minutos", "Descanso completo"],
                  nota: "Lo que no se hace no se recupera." },
        azul:   { nombre: "Sube",     dice: "Llevas días por debajo de tu forma",
                  ofrece: ["Un 10-15 % más de tiempo"] }
      },
      regla_consulta: "Un aviso de nivel Consulta baja el semáforo a ámbar y lo dice con esas palabras. Es la única conexión entre avisos y entrenamiento."
    },

    /* ---------- catálogo cerrado de avisos ----------
       Niveles: nota | atencion | consulta. Máximo dos a la vez, ordenados
       consulta → atencion → nota. Los umbrales viven AQUÍ, no en el código. */
    avisos: [
      { id: "M1", nivel: "atencion", titulo: "Cintura por encima de 102 cm", umbral: 102,
        texto: "Umbral de riesgo cardiometabólico muy aumentado para hombre (94 cm es el de riesgo aumentado). Es de lo que más mejora con el plan." },
      { id: "M2", nivel: "nota", titulo: "Cintura ÷ altura por encima de 0,50", umbral: 0.5,
        texto: "Por encima del umbral de riesgo bajo." },
      { id: "M3", nivel: "atencion", titulo: "Estás bajando demasiado rápido", umbral: 0.6,
        texto: "Más de 0,6 kg por semana dos semanas seguidas. En 2025, a 0,9 kg/semana, el 43 % de lo perdido no era grasa. Sube la proteína y no recortes la fuerza." },
      { id: "M4", nivel: "atencion", titulo: "El peso está volviendo", umbral: 2, semanas: 3,
        texto: "Dos kilos sobre tu mínimo de las últimas ocho semanas, sostenidos tres semanas. Es la forma que tuvo el desplome de 2025-2026." },
      { id: "M5", nivel: "nota", titulo: "Retención de líquidos", umbral: 0.7, dias: 3,
        texto: "El tobillo lleva tres días por encima de tu media. Con el corticoide es lo esperable; si no baja al terminar la pauta, es dato para la revisión." },
      { id: "M6", nivel: "consulta", titulo: "Tensión media alta", umbral_sis: 140, umbral_dia: 90, tomas: 5,
        texto: "No es un diagnóstico y los corticoides la suben por sí solos, pero es el dato que conviene llevar a la consulta." },
      { id: "M7", nivel: "consulta", titulo: "Una toma de tensión muy alta", umbral_sis: 180, umbral_dia: 110,
        texto: "Repite la toma tras cinco minutos sentado y en reposo. Si se confirma, se consulta sin esperar a la cita." },
      { id: "M8", nivel: "atencion", titulo: "El muslo está perdiendo", umbral: -1,
        texto: "Un centímetro o más con el peso bajando: parte de lo que pierdes es músculo. Revisa proteína y las dos sesiones de fuerza." },
      { id: "M9", nivel: "atencion", titulo: "Carga por debajo del objetivo", umbral: 0.7, semanas: 2,
        texto: "Dos semanas por debajo del 70 %. No se sube: se repite la misma semana de la rampa.", requiere: "salud.json" },
      { id: "M10", nivel: "atencion", titulo: "Hueco de cuatro días", umbral: 4,
        texto: "Se vuelve a la semana anterior de la rampa.", requiere: "salud.json" },
      { id: "M11", nivel: "nota", titulo: "Pulso en reposo alto", umbral: 5, dias: 3,
        texto: "Cinco pulsaciones sobre tu base tres días seguidos: fatiga, poco sueño o algo incubándose.",
        requiere: "salud.json", silenciado_hasta: "2026-09-28" }
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
