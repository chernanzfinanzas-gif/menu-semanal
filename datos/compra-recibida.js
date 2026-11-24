/* Compra recibida, lista para cargar de un golpe en la lista de la compra.
   La genero yo con el ticket delante; el la carga con un boton y pulsa «Ha llegado».
   `p` son ENVASES, que es lo que cuenta `confirmarCompra`: multiplica por `envase`.
   Desde el 10-oct-2026 cada línea lleva además `e`: los EUROS de esa línea tal
   como vienen en el ticket (todos los envases juntos). Con eso la app archiva el
   ticket y guarda el precio de cada producto. Opcionales arriba: `tienda`
   (si no, Mercadona) y `extra` (envío, bolsas: lo que no es producto). */
window.COMPRA_RECIBIDA = {
  ref: "mercadona-264001",
  fecha: "2026-11-24",
  n: "Pedido Mercadona del 24-nov-2026",
  tienda: "Mercadona",
  extra: 8.20,          /* coste de preparación. Productos 119,78 € · total 127,98 € */
  lineas: [
    { i:"yogur_griego_hacendado", p:1, e:1.45 },        /* Yogur griego natural Hacendado */
    { i:"leche_proteinas", p:2, e:2.70 },               /* Leche desnatada +Proteínas & calcio, 2 */
    { i:"zumo_granini", p:2, e:5.40 },                  /* Zumo pura naranja Hacendado, 2 */
    { i:"yogur_activia", p:3, e:11.97 },                /* Activia bífidus 0%, 3 packs de 8 */
    { i:"leche_desnatada", p:1, e:6.12 },               /* Leche desnatada calcio Hacendado, pack de 6 */
    { i:"cerveza", p:1, e:8.40 },                       /* Cerveza especial Mahou */
    { i:"cerveza_sin_rubia", p:1, e:6.00 },             /* Cerveza 0,0% sin alcohol rubia Mahou */
    { i:"pimenton", p:1, e:1.85 },                      /* Pimentón dulce de la Vera Hacendado */
    { i:"patata", p:1, e:4.65 },                        /* Patatas */
    { i:"almendras", p:2, e:5.80 },                     /* Almendra tostada 0% sal pelada, 2 */
    { i:"mango_deshidratado", p:6, e:8.70 },            /* Mango deshidratado Hacendado, 6 */
    { i:"nueces", p:1, e:2.40 },                        /* Nuez natural Hacendado pelada */
    { i:"cacahuetes_sinsal", p:1, e:1.05 },             /* Cacahuete tostado 0% sal pelado */
    { i:"tortitas_arroz_yogur", p:2, e:3.80 },          /* Tortitas de arroz con chocolate blanco, 2 */
    { i:"tortitas_maiz", p:2, e:2.20 },                 /* Tortitas de maíz Hacendado, 2 */
    { i:"pan_ortiz", p:1, e:1.70 },                     /* Pan tostado classic Hacendado */
    { i:"fanta_lim_zero", p:2, e:1.70 },                /* Fanta limón zero, 2 latas */
    { i:"fanta_nar_zero", p:2, e:1.70 },                /* Fanta naranja zero, 2 latas */
    { i:"copos_avena", p:1, e:1.30 },                   /* Copos de avena Brüggen */
    { i:"miel", p:1, e:3.20 },                          /* Miel de flores Hacendado */
    { i:"avellanas", p:1, e:3.85 },                     /* Avellana tostada 0% sal */
    { i:"flan_proteinas", p:2, e:4.00 },                /* Flan de huevo +Proteínas, 2 packs */
    { i:"queso_cottage", p:2, e:2.70 },                 /* Queso fresco cottage semidesnatado, 2 */
    { i:"gorgonzola", p:1, e:2.40 },                    /* Queso gorgonzola de vaca */
    { i:"albahaca", p:1, e:1.55 },                      /* Albahaca */
    { i:"limon", p:1, e:0.55 },                         /* Limón, 1 pieza, 0,218 kg */
    { i:"pera", p:1, e:0.43 },                          /* Pera Conferencia, 1 pieza, 0,172 kg */
    { i:"platano", p:4, e:2.46 },                       /* Plátano de Canarias, 4 piezas, 0,770 kg */
    { i:"tomate_cherry", p:1, e:2.20 },                 /* Tomates cherry */
    { i:"tomate", p:8, e:3.94 },                        /* Tomate ensalada, 8 piezas, 1,574 kg */
    { i:"salsa_trufa", p:1, e:3.10 },                   /* Salsa de trufa Hacendado */
    { i:"mandarina", p:10, e:2.33 },                    /* Mandarina, 10 piezas, 1,086 kg */
    { i:"pan_panecillo_sinsal", p:12, e:5.04 },         /* Panecillo sin sal añadida, 12 */
    { i:"queso_batido_0", p:1, e:1.10 },                /* Queso fresco batido desnatado 0% MG */
    { i:"setas", p:1, e:2.04 }                          /* Setas */
  ]
};
