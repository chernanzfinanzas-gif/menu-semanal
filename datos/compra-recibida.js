/* Compra recibida, lista para cargar de un golpe en la lista de la compra.
   La genero yo con el ticket delante; el la carga con un boton y pulsa «Ha llegado».
   `p` son ENVASES, que es lo que cuenta `confirmarCompra`: multiplica por `envase`.
   Desde el 10-oct-2026 cada línea lleva además `e`: los EUROS de esa línea tal
   como vienen en el ticket (todos los envases juntos). Con eso la app archiva el
   ticket y guarda el precio de cada producto. Opcionales arriba: `tienda`
   (si no, Mercadona) y `extra` (envío, bolsas: lo que no es producto). */
window.COMPRA_RECIBIDA = {
  ref: "mercadona-221425",
  fecha: "2026-10-13",
  n: "Pedido Mercadona del 13-oct-2026",
  tienda: "Mercadona",
  extra: 8.20,          /* coste de preparación. Productos 63,92 € · total 72,12 € */
  lineas: [
    { i:"albahaca", p:1, e:1.55 },                      /* Albahaca */
    { i:"perejil", p:1, e:0.95 },                       /* Perejil troceado lavado */
    { i:"pasta", p:1, e:1.15 },                      /* Macarrón Hacendado 1 kg */
    { i:"toallitas_refrescantes", p:1, e:1.00 },        /* Toallitas refrescantes Deliplus monodosis (casa) */
    { i:"servilletas_de_papel", p:1, e:2.15 },          /* Servilleta papel Bosque Verde (casa) */
    { i:"papel_de_cocina", p:1, e:2.30 },               /* Papel hogar Compacto Bosque Verde (casa) */
    { i:"limpiamaquinas_lavavajillas", p:1, e:1.55 },   /* Limpiamáquinas lavavajillas Bosque Verde (casa) */
    { i:"patata", p:1, e:4.65 },                        /* Patatas */
    { i:"fanta_lim_zero", p:2, e:1.38 },                /* Fanta limón zero, 2 latas */
    { i:"fanta_nar_zero", p:2, e:1.38 },                /* Fanta naranja zero, 2 latas */
    { i:"pan_ortiz", p:1, e:1.70 },                     /* Pan tostado classic Hacendado */
    { i:"cerveza", p:1, e:8.40 },                       /* Cerveza especial Mahou (pedido: 3, llegó 1) */
    { i:"leche_proteinas", p:1, e:1.35 },               /* Leche desnatada +Proteínas */
    { i:"pan_panecillo_sinsal", p:6, e:2.52 },          /* Panecillo sin sal añadida, 6 */
    { i:"huevo", p:1, e:1.95 },                         /* Huevos camperas */
    { i:"pesto_genovese", p:1, e:1.95 },                /* Salsa pesto Hacendado */
    { i:"yogur_activia", p:3, e:11.97 },                 /* Activia, 3 packs de 8 (pedido: 2) */
    { i:"jamon_cocido_mano", p:1, e:3.35 },             /* Jamón cocido extra cortado a mano Noel (el pedido llevaba lacón Noel) */
    { i:"queso_cottage", p:1, e:1.35 },                 /* Cottage Hacendado */
    { i:"berenjena", p:2, e:1.97 },                     /* Berenjena, 2 piezas, 0,896 kg */
    { i:"ensalada_gourmet", p:1, e:1.20 },              /* Brotes tiernos */
    { i:"limon", p:2, e:0.71 },                         /* Limón, 2 piezas, 0,272 kg */
    { i:"tomate", p:3, e:1.43 },                        /* Tomate ensalada, 3 piezas, 0,570 kg */
    { i:"zumo_granini", p:1, e:2.80 },                  /* Zumo pura naranja Hacendado */
    { i:"lima", p:1, e:0.29 },                          /* Lima, 0,066 kg */
    { i:"cerdo_secreto", p:1, e:2.92 },                 /* Filetes secreto de cerdo */
  ]
};
