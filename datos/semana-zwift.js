/* datos/semana-zwift.js - LO QUE HAY EN ZWIFT ESTA SEMANA.
   Lo escribe zwift/generar_zwift.py cada vez que se montan los KHB.
   Si `desde` es el de la semana en curso, El Plan usa ESTAS sesiones
   en vez de calcularlas con la formula del bolsillo: asi los bloques
   que ves y los ficheros que pedaleas son los mismos.
   Cada sesion lleva su PERFIL: una lista de tramos [segundos, % de
   FTP al empezar, % al acabar], para dibujarla como la dibuja Zwift.
   Desde el 16-nov-2026 la carga va con el FTP del test (182), no con
   el 155 declarado: el metro del dia es el FTP del dia. */
(function (global) {
  "use strict";
  global.SEMANA_ZWIFT = {
    "semana": 10,
    "nombre": "Rampa a 268",
    "desde": "2026-11-23",
    "hasta": "2026-11-29",
    "generado": "2026-11-22",
    "total": 260,
    "sesiones": [
      {
        "id": "rod-1",
        "t": "Rodillo 1 de 4",
        "min": 50,
        "pts": 34,
        "fam": "bici",
        "largo": false,
        "hueco": 1,
        "ftp": 182,
        "perfil": [
          [
            600,
            45,
            62
          ],
          [
            540,
            69,
            69
          ],
          [
            60,
            69,
            69
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            69,
            69
          ],
          [
            60,
            69,
            69
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            69,
            69
          ],
          [
            60,
            69,
            69
          ],
          [
            60,
            47,
            47
          ],
          [
            120,
            69,
            69
          ],
          [
            300,
            55,
            40
          ]
        ],
        "w": 126,
        "pct": 69,
        "persigue": "Base aeróbica: que el corazón haga menos esfuerzo por cada vatio.",
        "pulso": "el pulso manda hasta 135",
        "nota": "EL MAS FLOJO DE LA SEMANA, a proposito: vienes del 109 % con el reposo en 50 y dos noches malas. 125 W, el centro de tu Z2. Y LISO, sin rampa, por la analitica. SI AMANECES CON EL REPOSO EN 49 O MAS, O LA VFC POR DEBAJO DE 55: bajas a 114 W con el boton - y me lo dices."
      },
      {
        "id": "rod-2",
        "t": "Rodillo 2 de 4",
        "min": 60,
        "pts": 49,
        "fam": "bici",
        "largo": false,
        "hueco": 2,
        "ftp": 182,
        "perfil": [
          [
            600,
            45,
            62
          ],
          [
            540,
            75,
            75
          ],
          [
            60,
            75,
            75
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            75,
            75
          ],
          [
            60,
            75,
            75
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            75,
            75
          ],
          [
            60,
            75,
            75
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            75,
            75
          ],
          [
            60,
            75,
            75
          ],
          [
            60,
            47,
            47
          ],
          [
            60,
            75,
            75
          ],
          [
            300,
            55,
            40
          ]
        ],
        "w": 136,
        "pct": 75,
        "persigue": "Base aeróbica: que el corazón haga menos esfuerzo por cada vatio.",
        "pulso": "el pulso manda hasta 137",
        "nota": "EL BLOQUE GRANDE DE Z2 DE LA SEMANA: 60 minutos a 136 W, el techo de tu Z2. Liso, sin rampa, por la analitica. Su deriva se compara con el 4,0 % del 22-nov a estos mismos vatios: si pasa del 6 %, bajas con el boton - y me lo dices."
      },
      {
        "id": "rod-3",
        "t": "Rodillo 3 de 4",
        "min": 55,
        "pts": 41,
        "fam": "bici",
        "largo": false,
        "hueco": 3,
        "ftp": 182,
        "perfil": [
          [
            600,
            45,
            62
          ],
          [
            540,
            72,
            72
          ],
          [
            60,
            72,
            72
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            72,
            72
          ],
          [
            60,
            72,
            72
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            72,
            72
          ],
          [
            60,
            72,
            72
          ],
          [
            60,
            47,
            47
          ],
          [
            420,
            72,
            72
          ],
          [
            300,
            55,
            40
          ]
        ],
        "w": 131,
        "pct": 72,
        "persigue": "Base aeróbica: que el corazón haga menos esfuerzo por cada vatio.",
        "pulso": "el pulso manda hasta 135",
        "nota": "131 W y liso. Mas corto que el de ayer a proposito: manana van las series y pasado el largo. Es la antesala, no un dia de trabajo."
      },
      {
        "id": "rod-4",
        "t": "Techo 5x2 a 210",
        "min": 48,
        "pts": 54,
        "fam": "bici",
        "largo": false,
        "hueco": 4,
        "ftp": 182,
        "perfil": [
          [
            420,
            45,
            65
          ],
          [
            120,
            50,
            50
          ],
          [
            600,
            78,
            78
          ],
          [
            180,
            50,
            50
          ],
          [
            120,
            115,
            115
          ],
          [
            180,
            50,
            50
          ],
          [
            120,
            115,
            115
          ],
          [
            180,
            50,
            50
          ],
          [
            120,
            115,
            115
          ],
          [
            180,
            50,
            50
          ],
          [
            120,
            115,
            115
          ],
          [
            180,
            50,
            50
          ],
          [
            120,
            115,
            115
          ],
          [
            240,
            52,
            40
          ]
        ],
        "w": 209,
        "pct": 115,
        "persigue": "Tocar el techo de oxígeno: cinco series de 2 minutos a 200 W.",
        "pulso": "en las series manda el vatio; el pulso ira a 155-165 y ahi tiene que estar",
        "nota": "SEGUNDA SESION DE SERIES, y sube de 200 a 210 W. Tu decision del 17-nov: las de 200 fueron exigentes pero las sacaste faciles y el pulso se quedo en 145-152, en lo bajo del rango. Se sube el vatio y no el numero de series: una cosa nueva por semana. HAZLA DESPUES DE LA ANALITICA, no antes. El objetivo sigue siendo que la QUINTA salga a los mismos vatios que la primera; si en la cuarta no puedes, baja a 200 y acabalas."
      },
      {
        "id": "largo",
        "t": "Rodillo largo",
        "min": 118,
        "pts": 82,
        "fam": "bici",
        "largo": true,
        "hueco": 5,
        "ftp": 182,
        "perfil": [
          [
            600,
            45,
            62
          ],
          [
            540,
            67,
            67
          ],
          [
            60,
            67,
            67
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            67,
            67
          ],
          [
            60,
            67,
            67
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            67,
            67
          ],
          [
            60,
            67,
            67
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            67,
            67
          ],
          [
            60,
            67,
            67
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            67,
            67
          ],
          [
            60,
            67,
            67
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            67,
            67
          ],
          [
            60,
            67,
            67
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            67,
            67
          ],
          [
            60,
            67,
            67
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            67,
            67
          ],
          [
            60,
            67,
            67
          ],
          [
            60,
            47,
            47
          ],
          [
            540,
            67,
            67
          ],
          [
            60,
            67,
            67
          ],
          [
            60,
            47,
            47
          ],
          [
            240,
            67,
            67
          ],
          [
            300,
            55,
            40
          ]
        ],
        "w": 122,
        "pct": 67,
        "persigue": "Base aeróbica: que el corazón haga menos esfuerzo por cada vatio.",
        "pulso": "por debajo de 135 ppm",
        "nota": "EL QUE FALTO LA SEMANA PASADA, y cinco minutos mas largo. 121 W durante 110 minutos. Su deriva es la medida limpia de la semana y viene con el miercoles liso por delante a proposito. Bebe cada 15 minutos. Si el jueves las series salieron caras, este se puede acortar a 90 minutos sin romper nada: es el unico de la semana con ese margen."
      }
    ]
  };
})(window);
