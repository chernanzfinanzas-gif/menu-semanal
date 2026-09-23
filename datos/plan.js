/* datos/plan.js — El Plan: rampa, plantilla de semana y tareas con check.
   Espejo del puente informes-salud/plan-entrenamiento.json (v3, 18-sep-2026).
   Si cambia el puente, se regenera este fichero: la app no calcula el plan, lo lee. */
(function (global) {
  "use strict";

  global.DATOS_PLAN = {

    version: 4,
    generado: "2026-09-19",
    titulo: "Vuelta a la forma",

    /* Pulsaciones máximas: 171 MEDIDAS en la crit de Zwift del 21-feb-2025
       (media 155, 96 % de la reserva anaeróbica gastada). Las fórmulas de edad
       dan 168-170 y se quedan cortas, como casi siempre. Se trabaja con 175
       hasta que aparezca una mayor en un esfuerzo real. */
    fc: {
      maxima: 175,
      medida: { valor: 171, fecha: "2025-02-21", donde: "Zwift Crit Racing Club" },
      reposo: 47,
      z2_ppm: [120, 135],
      nota: "Z2 calculado por reserva (Karvonen) con 175 de máxima y 47 de reposo: 55-70 % es 118-137 ppm. Mientras dure el corticoide el pulso va alto por el fármaco: manda el poder hablar."
    },

    /* ---------- la rampa: cada semana, su carga y su talla ----------
       LA CARGA DE AQUÍ ES SOLO ENTRENAMIENTO: rodillo y caminatas. El día grande
       del fin de semana NO entra, por decisión de Carlos (23-sep-2026): «entreno
       para ir a la montaña y salir con la bici tranquilo el fin de semana», así
       que la salida es el objetivo, no el presupuesto. Meterla dentro obligaba a
       elegir entre un domingo bueno y un número verde — y además descuadraba la
       semana un 50 % según tocara monte (14,2 puntos/hora) o carretera (48,6).
       Por eso estos números son más bajos que los de antes: 240 en crucero en vez
       de 300. No es menos entreno, es otra unidad. Sumando la salida rondan los
       315, que en equilibrio dan una forma (CTL) de unos 45 — por encima de los
       43 de la versión anterior.
       Lo que la salida SÍ hace es condicionar la semana siguiente: ver
       `diaGrande.umbrales`. */
    rampa: [
      /* 130 y no 90: el bloque dura DIEZ días, no siete, y los 90 estaban escritos
         para una semana. Medido en los datos de Carlos, caminar le cuesta 14,2
         puntos por hora (mediana de 24 días de una sola actividad); los 470
         minutos de caminata que programan las excepciones salen a 111, y al
         ritmo que lleva estos días —19 puntos/hora— a 149. 130 cae en medio.
         Con los 90 el pase del domingo le habría marcado rojo por exceso
         haciendo exactamente lo que la app le mandó. Acordado el 23-sep-2026. */
      { n: 1,  desde: "2026-09-18", hasta: "2026-09-27", carga: 130, talla: "R", criterio: "asistencia",
        nota: "Con prednisona. Fuerza a media carga. Diez días, no siete" },
      { n: 2,  desde: "2026-09-28", hasta: "2026-10-04", carga: 95, talla: "R", nota: "Fin del corticoide. Revisión el 28" },
      { n: 3,  desde: "2026-10-05", hasta: "2026-10-11", carga: 105, talla: "A", nota: "Primera semana de verdad" },
      { n: 4,  desde: "2026-10-12", hasta: "2026-10-18", carga: 70,  talla: "B", nota: "Descarga. El domingo, test de 20 minutos" },
      { n: 5,  desde: "2026-10-19", hasta: "2026-10-25", carga: 120, talla: "A", nota: "" },
      { n: 6,  desde: "2026-10-26", hasta: "2026-11-01", carga: 135, talla: "A", nota: "" },
      { n: 7,  desde: "2026-11-02", hasta: "2026-11-08", carga: 150, talla: "A", nota: "" },
      { n: 8,  desde: "2026-11-09", hasta: "2026-11-15", carga: 100, talla: "B", nota: "Descarga" },
      { n: 9,  desde: "2026-11-16", hasta: "2026-11-22", carga: 170, talla: "A", nota: "" },
      { n: 10, desde: "2026-11-23", hasta: "2026-11-29", carga: 190, talla: "A", nota: "Segundo test el jueves 26" },
      { n: 11, desde: "2026-11-30", hasta: "2026-12-06", carga: 215, talla: "A", nota: "Entra un día de intensidad" },
      { n: 12, desde: "2026-12-07", hasta: "2026-12-13", carga: 140, talla: "B", nota: "Descarga" },
      { n: 13, desde: "2026-12-14", hasta: "2027-06-30", carga: 240, talla: "A", nota: "Crucero: tres semanas y la cuarta de descarga" }
    ],

    /* ---------- las tallas de semana ----------
       Los días van con el número de getDay(): 1 lunes … 6 sábado, 0 domingo. */
    plantillas: {
      R: {
        nombre: "Reactivación",
        pie: "Movimiento diario con el corticoide encima. Ritmo de poder hablar, siempre.",
        dias: {
          1: [{ t: "Fuerza A, media carga", min: 30 }, { t: "Caminar", min: 30 }],
          2: [{ t: "Bici muy suave, por debajo de 120 ppm", min: 40 }],
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
          2: [{ t: "Bici Z2, 120-135 ppm", min: 75 }],
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

    /* LA SALIDA LARGA DEL FIN DE SEMANA NO SE PROGRAMA.
       Carlos, 23-sep-2026: «la actividad larga tampoco va a seguir un plan fijo…
       pueden ser 4 seguidas de montaña, alternancia, solo bici. Depende de los
       planes que aparezcan. Igual un día sale un fin de semana en montaña y se
       hacen dos rutas. Lo único es controlar si superamos los umbrales
       permisibles y adaptar el domingo el plan a lo que se ha hecho».
       Aquí NO hay calendario: hay una orientación de lo que es razonable en cada
       fase, y unos umbrales que deciden qué pasa la semana siguiente. */
    salidaLarga: {
      texto: "Salida larga, la que surja",
      programada: false,
      fueraDeCarga: true,
      /* Orientación, NO instrucción: lo que el cuerpo aguanta bien en cada tramo
         de la rampa. Si un fin de semana sale otra cosa, sale otra cosa. */
      orientacion: [
        { hasta: 4,  texto: "ahora mismo: monte de 8-10 km, o bici llana de 30-40" },
        { hasta: 8,  texto: "monte de 12-14 km, o bici de 45-55" },
        { hasta: 16, texto: "monte de 15-18 km, o bici de 60-70" },
        { hasta: 24, texto: "monte de 18-22 km, o bici de 70-85" },
        { hasta: 99, texto: "monte de 20-25 km, o bici de 80-100" }
      ],
      /* LOS UMBRALES SE MIRAN SOBRE EL FIN DE SEMANA ENTERO, no sobre un día:
         un finde de monte con dos rutas cuenta como una sola cosa. */
      sobre: "fin de semana completo",
      umbrales: [
        { hasta: 100,  fue: "tranquilo",
          reaccion: "nada", texto: "Fin de semana tranquilo. La semana que viene sigue la rampa." },
        { hasta: 150,  fue: "se notó",
          reaccion: "no_sube", texto: "Se notó. La semana que viene repite el objetivo de esta, no sube." },
        { hasta: 99999, fue: "se fue de madre",
          reaccion: "baja_25", texto: "Eso se fue de madre. La semana que viene baja un 25 % y sin intensidad." }
      ],
      /* DE DÓNDE SALEN ESOS CORTES, Y HASTA DÓNDE VALEN.
         De 117 salidas largas suyas (2 h o más), midiendo la VFC de las dos
         noches siguientes contra la media de los siete días anteriores:
             menos de 100 puntos .... +2,6 %   (65 salidas)
             100 a 150 .............. -0,4 %   (37 salidas)
             más de 150 ............. -2,0 %   (15 salidas)
         La media se mueve limpiamente. La PROBABILIDAD de un bajón NO: una caída
         de más del 5 % sale en el 26-27 % de las salidas en las tres franjas por
         igual. Por eso dispara la carga, que se mide sin ruido, y no la VFC.
         El pulso en reposo no sirve para esto: no se mueve (±0,3 ppm).

         PROVISIONALES, y conviene saber por qué: esos cortes están medidos POR
         DÍA, y aquí se aplican al FIN DE SEMANA ENTERO. No se pudo medir sobre
         findes porque en los 400 días de registro casi no hay: la mediana de sus
         fines de semana es 23 puntos y el máximo 127, o sea que el tramo rojo no
         se habría disparado ni una vez. Su entrenamiento de 2025-2026 fue rodillo
         entre semana, no salidas. En cuanto haya diez fines de semana con salida
         de verdad, estos números se vuelven a sacar de sus propios datos. */
      recalibrar: { cuando: "10 fines de semana con salida registrada", desde: "2026-09-28" },
      /* La VFC CONFIRMA, no dispara: media de 4 noches contra la de 14. Si la
         carga dice verde pero el cuerpo lleva cuatro días diciendo que no, se
         aplica el tramo siguiente. Dos señales independientes y manda la fiable. */
      confirmacionVfc: { noches: 4, contra: 14, caida: 0.06 },
      referencias: [
        "Montaña 9 km / 300 m ....... unos 43 puntos",
        "Bici 35 km tranquila ....... unos 82",
        "Bici 65 km a ritmo ......... unos 153",
        "30 km y 1.137 m (jun-2025) . tramo rojo"
      ]
    },

    /* Lo que queda de `diaGrande` es solo lo que la app pinta: la imagen del fin
       de semana, el aviso de seguridad y los minutos que se le suponen cuando no
       hay nada registrado. Las listas de montaña y bici se quedan como referencia
       histórica, pero YA NO PRESCRIBEN NADA: ver `salidaLarga`. */
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
      /* Cuánto pesa el día grande dentro de la semana, en minutos. Hace falta
         para repartir el objetivo de carga por días: el día grande es él solo
         casi un tercio de la semana, y sin esto el sábado por la mañana
         parecería que vas cortísimo cuando vas perfecto. */
      minutos: 180,
      aviso: "Se sale con Balance positivo. En montaña, bastones y acompañado; en bici, nunca solo.",
      imagenes: { montana: "iconos/khb/11-montana.webp", bici: "iconos/khb/10-bici.webp" }
    },

    /* ---------- lo que se teclea ---------- */
    medidas: [
      { id: "peso",    nombre: "Peso",       unidad: "kg",   paso: 0.1, min: 35, max: 250,
        dias: [0, 1, 2, 3, 4, 5, 6], diasFijos: [1, 3, 6], ultimo: true,
        ayuda: "Al despertar, tras orinar, antes de beber o comer, desnudo. Nunca después de entrenar. " +
               "Los días fijos son lunes, miércoles y sábado, pero si te pesas otro día, queda anotado igual. " +
               "Lo que escribas aquí es para verlo mientras llega: cuando el dato baje de intervals, manda el suyo." },
      { id: "cintura", nombre: "Cintura",    unidad: "cm",   paso: 0.5, min: 50, max: 180,
        dias: [1], ayuda: "De pie, en ayunas, al final de una espiración normal, a la altura del ombligo. La cinta apoyada, sin apretar. Mide dos veces y quédate con la que se repita." },
      { id: "cuello",  nombre: "Cuello",     unidad: "cm",   paso: 0.5, min: 25, max: 60,
        dias: [1], ayuda: "Justo debajo de la nuez, con la cinta un poco inclinada hacia abajo por delante. Con cuello y cintura sale el porcentaje de grasa por cinta, que no se mueve con la hidratación." },
      /* Las de arriba salen el día que tocan; cualquier otra se anota con
         «Anotar otra medida», porque la fecha manda sobre el día de la semana. */
      { id: "sistolica",  nombre: "T. alta", unidad: "mmHg", paso: 1, min: 60, max: 260,
        diariaHasta: "2026-09-28", diasDespues: [1, 4], guia: "tension",
        ayuda: "La alta es la SISTÓLICA, el número grande del tensiómetro. Los corticoides la suben." },
      { id: "diastolica", nombre: "T. baja", unidad: "mmHg", paso: 1, min: 30, max: 160,
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
        ayuda: "Mensual. Es donde vive el músculo del ciclista: si el peso baja y el muslo aguanta, vas bien; si bajan los dos, estás perdiendo músculo." },
      /* La báscula mide músculo, agua y masa ósea, pero intervals no los baja:
         de los 19 campos que devuelve no está ninguno de los tres. Así que el
         músculo se teclea a mano, mirando la app de Garmin el día que te pesas.
         Sin día fijo y sin cuenta de pendientes: si se anota, suma; si no, no
         pasa nada. */
      { id: "musculo", nombre: "Músculo", unidad: "kg", paso: 0.1, min: 15, max: 80,
        aMano: true, informativo: true,
        ayuda: "Lo mide tu báscula pero no llega a intervals, así que este es el único sitio donde puede entrar. " +
               "Míralo en la app de Garmin el día que te peses y anótalo aquí cuando te acuerdes. " +
               "Con dos o tres al mes basta para ver si lo que pierdes es grasa o músculo." },
      { id: "agua", nombre: "Agua", unidad: "%", paso: 0.1, min: 25, max: 75,
        aMano: true, informativo: true,
        ayuda: "De la misma pantalla de Garmin que el músculo. Ojo con leerlo como un objetivo: sube cuando pierdes grasa, " +
               "pero también cuando retienes líquido, y con el corticoide te pueden estar pasando las dos cosas a la vez. " +
               "Por eso aquí no se pinta de color: es contexto para explicar el peso, no una meta." },
      /* LA GRASA, TAMBIÉN A MANO (23-sep-2026, Carlos: «tengo la opción de
         poner todas a mano menos grasa corporal, añádela»). Comprobado: se
         podían teclear doce medidas y ésta no estaba.
         Sigue bajando sola de intervals; esto es para el día que la báscula dé
         un número que no llegue, o para corregir el que llegó. Lo que escriba
         él manda sobre lo de intervals, como ya pasa con músculo, agua y ósea. */
      { id: "grasa", nombre: "Grasa corporal", unidad: "%", paso: 0.1, min: 5, max: 60,
        aMano: true, informativo: true,
        ayuda: "De la misma pantalla de Garmin que el músculo, el día que te peses. " +
               "Normalmente baja sola de intervals y no hace falta tocarla: esto es para el día " +
               "que no llegue o para corregirla. Y ojo el día que la masa ósea baile, porque " +
               "entonces el porcentaje de grasa de esa pesada tampoco vale." },
      { id: "hueso", nombre: "Masa ósea", unidad: "kg", paso: 0.1, min: 1, max: 8,
        aMano: true, informativo: true,
        ayuda: "Apenas se mueve en un adulto, así que vale de control de la propia báscula: si cambia mucho de un mes a otro, " +
               "lo que falla es la medición —pies mal colocados, humedad, hora distinta—, no tu esqueleto. " +
               "Y si ese día la ósea baila, el porcentaje de grasa de ese día tampoco vale." }
    ],

    /* ---------- el pase de la semana ----------
       La decisión del domingo, con sus umbrales a la vista. Se decide sobre la
       CARGA, no sobre las ganas; y las semanas con «criterio: asistencia» se
       juzgan por días movidos, porque su objetivo de carga no es exigible. */
    pase: {
      titulo: "El pase de la semana",
      umbrales: { subir: 0.95, repetir: 0.70, asistencia: 0.85 },
      veredictos: {
        pronto:  { n: "Todavía no", t: "No hay días suficientes para juzgar nada. Lo que se ve debajo es cómo va la semana, no una decisión." },
        subir:   { n: "Subir", t: "Semana cumplida. La que viene va según la rampa, sin adornos." },
        repetir: { n: "Repetir", t: "Por debajo del objetivo: se repite la misma carga en vez de subir. Subir sobre una semana incompleta es exactamente como se rompió 2025." },
        bajar:   { n: "Bajar", t: "Dos semanas seguidas por debajo del 70 %, o la salud manda: se baja un peldaño y se vuelve a construir desde ahí." },
        parar:   { n: "Semana en blanco", t: "Con lesión o enfermedad no se negocia la carga: se recupera y se retoma donde se dejó, sin intentar compensar." }
      },
      /* Cuánto avanza la rampa con cada veredicto, en peldaños. El lunes se
         aplica solo: si el pase dice repetir, se repite. 0 = sigue la rampa;
         -1 = se queda donde estaba; -2 = retrocede un peldaño. */
      desfases: { subir: 0, repetir: -1, bajar: -2, parar: -1, pronto: 0 },
      avisoAplicado: {
        subir:   "Semana cumplida. Esta sube según la rampa.",
        repetir: "La semana anterior se quedó corta, así que ésta repite la misma carga en vez de subir.",
        bajar:   "Dos semanas seguidas por debajo del 70 %: se ha bajado un peldaño y se vuelve a construir desde ahí.",
        parar:   "La semana anterior fue en blanco por salud. Se retoma donde estaba, sin compensar lo perdido."
      },
      /* El color de la fila «Carga de la semana». No es una dirección: es
         acercarse al objetivo. Pasarse mucho tampoco es bueno —así se rompió
         2025—, por eso el exceso tiene color propio y no verde. Se compara
         contra el objetivo PRORRATEADO por los días transcurridos: el martes
         llevas dos séptimos, y eso no es ir mal. */
      colorCarga: { exceso: 1.15, bien: 0.95, flojo: 0.70 },
      pesoObjetivo: [-0.5, -0.3],
      nota: "El pase mira cinco cosas y ninguna más: carga, cumplimiento, peso, recuperación y lo que dijeron tus observaciones."
    },

    /* ---------- lo que el reloj no puede medir ----------
       Familias de sesión que no generan actividad registrada: por mucho que
       esperes, nunca se van a marcar solas. Para éstas la casilla es la única
       fuente, así que no se ofrece «que decida el reloj» —sería dejarlas sin
       decidir para siempre— y la ayuda lo dice. */
    familiasSinReloj: ["movilidad"],
    textoSinReloj: "El reloj no mide esto: la marcas tú cuando la hagas.",

    /* ---------- guías de sesión ----------
       Sesiones que no se explican solas y piden pauta. Se enganchan por texto:
       si el nombre de la sesión contiene «patron», sale el botón de la guía. */
    guiasSesion: [
      {
        id: "cuello",
        patron: "movilidad",
        titulo: "Movilidad de cuello y mandíbula",
        minutos: 15,
        entrada: "Quince minutos, sentado y sin prisa. Todo despacio: aquí el rango no se gana forzando, " +
                 "se gana repitiendo. Validada por tu fisio el 18 de septiembre.",
        reglas: [
          "Hasta notar <b>tensión, nunca dolor</b>. El dolor no abre rango, lo cierra.",
          "Nada de círculos completos de cabeza ni de dejarla caer hacia atrás.",
          "Respirando por la nariz, sin apneas.",
          "<b>Si aparece mareo o inestabilidad, se para</b>, te sientas y lo marcas en las observaciones del día."
        ],
        bloques: [
          { n: "1. Respirar y colocarse", min: 2, pasos: [
            "Sentado, espalda apoyada, pies en el suelo.",
            "Seis respiraciones lentas por la nariz, soltando el aire el doble de largo.",
            "Barbilla ligeramente metida y coronilla larga, como si tiraran de ti hacia arriba." ] },
          { n: "2. Retracción cervical", min: 2, pasos: [
            "Sin mover la cabeza arriba o abajo, lleva la barbilla atrás —doble papada a propósito—.",
            "Mantén 3 segundos y suelta. <b>10 repeticiones.</b>",
            "Es el ejercicio que más corrige la cabeza adelantada de estar sentado." ] },
          { n: "3. Rotaciones", min: 3, pasos: [
            "Gira despacio hacia un lado hasta notar tensión. Mantén 3-5 segundos y vuelve.",
            "<b>8 a cada lado</b>, alternando.",
            "La mirada acompaña al giro; no adelantes la barbilla." ] },
          { n: "4. Inclinación lateral", min: 3, pasos: [
            "Oreja hacia el hombro, sin subir el hombro.",
            "La mano del mismo lado, apoyada en la cabeza, solo pesa: no tira.",
            "<b>20-30 segundos por lado, dos veces cada uno.</b>" ] },
          { n: "5. Elevador de la escápula", min: 2, pasos: [
            "Gira la cabeza 45° y mira hacia la axila contraria.",
            "Mano en la nuca, peso suave. <b>20-30 segundos por lado.</b>",
            "Es el músculo que se carga con el ordenador y con el manillar." ] },
          { n: "6. Mandíbula", min: 3, pasos: [
            "Punta de la lengua en el paladar, justo detrás de los dientes de arriba: abre y cierra " +
            "despacio sin despegarla. <b>10 repeticiones.</b>",
            "Masajea con dos dedos, en círculos, los maseteros —el músculo que se marca al apretar— " +
            "y las sienes. <b>60-90 segundos.</b>",
            "Termina con la boca entreabierta y la lengua suelta, 20 segundos. Ésa es la posición de " +
            "descanso: los dientes no se tocan." ] }
        ],
        fallos: "Ir deprisa y forzar el final del rango. Esto no es estirar a tope una vez por semana: " +
                "es poco y a menudo. Si un día solo te da para el bloque 2 y el 6, hazlos y marca la sesión."
      }
    ],

    /* ---------- observaciones del día ----------
       Van pegadas a las medidas, y se rellenan en un toque. No son un diario:
       son las RAZONES que explican por qué un día se sale de la raya, que es lo
       que falta cuando dentro de tres meses miras un bache y no sabes qué pasó.
       «efecto» dice qué hace cada una en el resto del sistema. */
    observaciones: {
      titulo: "¿Algo que haya afectado hoy?",
      pie: "Toca lo que aplique. Sin nada marcado se entiende que fue un día normal.",
      motivos: [
        { v: "lesion",    n: "Lesión: no entreno", efecto: "parar",
          ayuda: "Invalidante: hoy no hay sesión, ni rebajada." },
        { v: "lesionlim", n: "Lesión: limita",      efecto: "limitar",
          ayuda: "Limitante: se entrena, pero sin apretar y sin día grande." },
        { v: "enfermo",   n: "Enfermedad",    efecto: "parar" },
        { v: "dolor",     n: "Molestia",      efecto: "vigilar" },
        { v: "fatiga",    n: "Fatiga",        efecto: "vigilar" },
        { v: "malanoche", n: "Mala noche",    efecto: "vigilar" },
        { v: "animo",     n: "Ánimo bajo",    efecto: "vigilar" },
        { v: "trabajo",   n: "Trabajo",       efecto: "agenda" },
        { v: "compromiso",n: "Compromiso",    efecto: "agenda" },
        { v: "viaje",     n: "Viaje",         efecto: "agenda" },
        { v: "calor",     n: "Calor o frío",  efecto: "contexto" },
        { v: "seco",      n: "Deshidratado",  efecto: "medida",
          ayuda: "Marca la grasa de la báscula de hoy como poco fiable: con poca agua sale alta." },
        { v: "comida",    n: "Comí distinto", efecto: "contexto" }
      ],
      nota: { n: "Detalle, si hace falta", ph: "qué rodilla, qué viaje, qué pasó…" },
      textos: {
        parar: "Esto manda sobre el plan: hoy no se entrena, o se camina y ya está. Si sigue dos días, es dato para la consulta, no para la rampa.",
        limitar: "Se entrena, pero sin apretar: hoy nada de intensidad ni día grande. La sesión sale al 60 % del tiempo, o se cambia por caminar.",
        vigilar: "Anotado. Un día suelto no dice nada; dos seguidos bajan la intensidad de la semana.",
        agenda: "No es fisiología, es vida: sirve para el pase del domingo, para no confundir «no pude» con «no pude más»."
      }
    },

    /* ---------- tratamiento y tareas sueltas ---------- */
    tratamientos: [
      { id: "prednisona", nombre: "Prednisona de la mañana", desde: "2026-09-14", hasta: "2026-09-28",
        ayuda: "Por la mañana; la segunda dosis a mediodía, nunca de noche. No interrumpir de golpe." }
    ],

    tareas: [
      { id: "ftp155", nombre: "Poner la FTP en 155 W en Zwift, Strava e intervals", limite: "2026-09-21",
        ayuda: "Con 200 W declarados, toda la carga del plan sale un 35-40 % baja." },
      { id: "cinta", nombre: "Tener a mano una cinta métrica de sastre", limite: "2026-09-21", ayuda: "" },
      /* «desde» es cuándo EMPIEZA a avisar, no cuándo se hace. Una tarea que
         asoma tres semanas antes deja de leerse mucho antes de vencer. */
      { id: "test1", nombre: "Test de 20 minutos en Zwift", desde: "2026-10-05", limite: "2026-10-12",
        ayuda: "Sale la FTP real y con ella las zonas definitivas. Hasta que lo hagas, toda la carga " +
               "del plan se calcula sobre la FTP declarada, que es una estimación." }
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
                  ofrece: [
                    { t: "La misma sesión al 60 %", detalle: "sin intensidad", factor: 0.6 },
                    { t: "Cambiar la bici por una caminata", cambia: "Caminar a buen paso", factor: 0.7, soloSi: "bici" }
                  ] },
        rojo:   { nombre: "Descansa", dice: "Hoy no",
                  ofrece: [
                    { t: "Paseo de 20-30 minutos", cambia: "Paseo suave", min: 25 },
                    { t: "Descanso completo", descanso: true }
                  ],
                  nota: "Lo que no se hace no se recupera." },
        azul:   { nombre: "Sube",     dice: "Llevas días por debajo de tu forma",
                  ofrece: [
                    { t: "Un 10-15 % más de tiempo", factor: 1.12 }
                  ] }
      },

      /* EL PORQUÉ, EN DOS CIFRAS. Un semáforo que dice «Descansa» sin decir por
         qué se desobedece a la tercera vez. Son las dos que el propio plan nombra
         —«fatiga frente a forma, las dos últimas noches»— y NO la VFC: el 23-sep
         se midió en 117 salidas suyas que la VFC de después no distingue un paseo
         de una paliza (una caída de más del 5 % sale en el 26-27 % de las salidas
         en las tres franjas por igual). Sirve para confirmar con ventana larga,
         no para decidir un día. */
      razones: [
        { id: "balance", et: "Balance", ayuda: "Forma menos fatiga, igual que en Mi Estado. Positivo: vienes descansado. Negativo: llevas más carga encima de la que tu forma sostiene." },
        { id: "noches",  et: "Dos noches",      ayuda: "Media de sueño de las dos últimas noches.", unidad: "h" }
      ],

      /* LOS UMBRALES NO ESTÁN, Y ESO ES A PROPÓSITO.
         Aquí irían los cortes que deciden verde, ámbar, rojo y azul. Se fijan el
         15-oct-2026, con tres semanas seguidas sin corticoide: antes de eso los
         datos están contaminados —el corticoide sube la tensión, quita el sueño y
         tiene la VFC en el mínimo del año— y unos cortes sacados de ahí valdrían
         para un cuerpo que no es el suyo del resto del año.
         Mientras `umbrales` sea null, `estadoSemaforo` devuelve null y la ficha
         sigue diciendo «Sin calibrar». Todo lo demás —los colores, las dos cifras,
         los botones— ya está montado y se enciende solo el día que esto se rellene. */
      /* De peor a mejor, y se para en el primero que cabe. El balance es forma
         menos fatiga, así que lo malo es lo negativo: el rojo va primero con el
         `hasta` más bajo, y el último lleva `hasta: null` para recoger el resto.
         Forma tendrá: [{hasta:-15,estado:"rojo"},{hasta:-5,estado:"ambar"},
                        {hasta:10,estado:"verde"},{hasta:null,estado:"azul"}] */
      umbrales: null,
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
        texto: "Vas camino de la segunda semana seguida por debajo del 70 %, y todavía quedan días para evitarlo. " +
               "Si se cierra así, el pase del domingo repetirá la semana en vez de subir.", requiere: "salud.json" },
      { id: "M10", nivel: "atencion", titulo: "Hueco de cuatro días", umbral: 4,
        texto: "Volver con la sesión que tocaba es lo que rompió 2025. Se retoma por la semana S —la de " +
               "supervivencia: tres sesiones de 40 minutos, sin salida— y desde ahí se sube.", requiere: "salud.json" },
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
