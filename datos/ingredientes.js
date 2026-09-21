/* Catálogo de ingredientes — Asistente de Alimentación (dieta baja en sodio)
   sal   = gramos de sal por 100 g / 100 ml de producto
   pesoUd = gramos que pesa 1 unidad (solo cuando u === "ud")
   basico = despensa fija: no entra en la compra semanal salvo que lo marques
*/
window.DATOS_INGREDIENTES = [

  /* ---------- CARNICERÍA ---------- */
  { id:"ternera_entrecot",   n:"Entrecot de ternera",            cat:"Carnicería", u:"g",  sal:0.15, k:220, p:20, g:15, h:0, compra:"pieza" },
  { id:"ternera_picada",     n:"Carne picada magra de ternera",  cat:"Carnicería", u:"g",  sal:0.15, k:180, p:20, g:11, h:0, compra:"bandeja" },
  { id:"hamburguesa_bajasal",n:"Hamburguesa de vacuno baja en sal (≤0,25 g/100 g)", cat:"Carnicería", u:"ud", pesoUd:150, sal:0.25, k:200, p:19, g:14, h:1, compra:"unidades" },
  { id:"pollo_pechuga",      n:"Pechuga de pollo fresca",        cat:"Carnicería", u:"g",  sal:0.15, k:110, p:23, g:1.5, h:0, compra:"bandeja" },
  { id:"cerdo_solomillo",    n:"Solomillo de cerdo fresco",      cat:"Carnicería", u:"g",  sal:0.15, k:120, p:21, g:4, h:0, compra:"pieza" },
  { id:"cerdo_lomo",         n:"Lomo de cerdo fresco en filetes (sin adobar)", cat:"Carnicería", u:"g", sal:0.15, k:145, p:22, g:6, h:0, compra:"bandeja" },

  /* ---------- PESCADERÍA Y CONGELADOS ---------- */
  { id:"bacalao_natural",    n:"Lomo de bacalao al natural SIN SALAR (congelado)", cat:"Pescadería", u:"ud", pesoUd:130, sal:0.16, k:80, p:18, g:0.7, h:0, compra:"paquete", nota:"Nunca desalado ni en salazón" },
  { id:"merluza_lomo",       n:"Lomo de merluza fresca o congelada", cat:"Pescadería", u:"g", sal:0.25, k:72, p:17, g:0.8, h:0, compra:"lomos" },
  { id:"lubina",             n:"Lomos de lubina congelados sin aditivos", rev:2, cat:"Pescadería", u:"g", sal:0.20, k:154, p:21, g:7.5, h:0, compra:"paquete", nota:"La Sirena Premium, paquete de 180 g. Ingrediente único: lubina. Rechaza los que lleven polifosfatos (E-451/E-452), salmuera o sal añadida" },
  { id:"calamar_fresco",     n:"Calamar fresco limpio",              cat:"Pescadería", u:"g", sal:0.25, k:80, p:16, g:1.3, h:1.5, compra:"pieza" },
  { id:"salmon_lomo",        n:"Lomo de salmón fresco o congelado",  cat:"Pescadería", u:"g", sal:0.15, k:200, p:20, g:13, h:0, compra:"lomos" },
  { id:"atun_fresco",        n:"Atún fresco (lomo)",                 cat:"Pescadería", u:"g", sal:0.15, k:145, p:23, g:5, h:0, compra:"pieza" },

  /* ---------- FRUTAS Y VERDURAS ---------- */
  { id:"cebolla_dulce",  n:"Cebolla dulce",            cat:"Frutas y verduras", u:"ud", pesoUd:150, sal:0.01, k:40, p:1.1, g:0.1, h:9 },
  { id:"ajo",            n:"Ajo",                      cat:"Frutas y verduras", u:"ud", pesoUd:5,   sal:0.04, k:140, p:6, g:0.5, h:30, basico:true },
  { id:"patata",         n:"Patata",                   cat:"Frutas y verduras", u:"ud", pesoUd:180, sal:0.02, k:77, p:2, g:0.1, h:17 },
  { id:"calabacin",      n:"Calabacín",                cat:"Frutas y verduras", u:"ud", pesoUd:250, sal:0.02, k:17, p:1.2, g:0.3, h:3 },
  { id:"berenjena",      n:"Berenjena",                cat:"Frutas y verduras", u:"ud", pesoUd:250, sal:0.01, k:25, p:1, g:0.2, h:6 },
  { id:"tomate",         n:"Tomate maduro",            cat:"Frutas y verduras", u:"ud", pesoUd:150, sal:0.01, k:18, p:0.9, g:0.2, h:3.9 },
  { id:"zanahoria",      n:"Zanahoria",                cat:"Frutas y verduras", u:"ud", pesoUd:80,  sal:0.17, k:41, p:0.9, g:0.2, h:10 },
  { id:"puerro",         n:"Puerro",                   cat:"Frutas y verduras", u:"ud", pesoUd:150, sal:0.05, k:61, p:1.5, g:0.3, h:14 },
  { id:"espinacas",      n:"Espinacas frescas",        cat:"Frutas y verduras", u:"g",  sal:0.20, k:23, p:2.9, g:0.4, h:3.6 },
  { id:"brotes_verdes",  n:"Brotes verdes (bolsa ensalada)", cat:"Frutas y verduras", u:"g", sal:0.05, k:20, p:2, g:0.3, h:2 },
  { id:"setas",          n:"Setas o champiñones frescos", cat:"Frutas y verduras", u:"g", sal:0.01, k:22, p:3.1, g:0.3, h:3.3 },
  { id:"guisantes",      n:"Guisantes tiernos (congelados)", cat:"Congelados", u:"g", sal:0.01, k:81, p:5.4, g:0.4, h:14 },
  { id:"pina_fresca",    n:"Piña fresca",              cat:"Frutas y verduras", u:"ud", pesoUd:1200, sal:0.00, k:50, p:0.5, g:0.1, h:13 },
  { id:"manzana_reineta",n:"Manzana reineta o golden", cat:"Frutas y verduras", u:"ud", pesoUd:180, sal:0.00, k:52, p:0.3, g:0.2, h:14 },
  { id:"platano",        n:"Plátano",                  cat:"Frutas y verduras", u:"ud", pesoUd:120, sal:0.00, k:89, p:1.1, g:0.3, h:23 },
  { id:"mango",          n:"Mango",                    cat:"Frutas y verduras", u:"ud", pesoUd:350, sal:0.00, k:60, p:0.8, g:0.4, h:15 },
  { id:"limon",          n:"Limón",                    cat:"Frutas y verduras", u:"ud", pesoUd:110, sal:0.00, k:29, p:1.1, g:0.3, h:9 },
  { id:"fruta_temporada",n:"Fruta de temporada (pera, kiwi, naranja…)", cat:"Frutas y verduras", u:"ud", pesoUd:150, sal:0.00, k:55, p:0.7, g:0.2, h:13 },
  { id:"arandanos",      n:"Arándanos o frambuesas",   cat:"Frutas y verduras", u:"g", sal:0.00, k:57, p:0.7, g:0.3, h:14 },
  { id:"albahaca",       n:"Albahaca fresca",          cat:"Frutas y verduras", u:"g", sal:0.02, k:23, p:3.2, g:0.6, h:2.6 },
  { id:"perejil",        n:"Perejil fresco",           cat:"Frutas y verduras", u:"g", sal:0.14, k:36, p:3, g:0.8, h:6, basico:true },

  /* ---------- LÁCTEOS Y HUEVOS ---------- */
  { id:"leche",            n:"Leche",                                cat:"Lácteos y huevos", u:"ml", sal:0.10, k:46, p:3.2, g:1.6, h:4.8 },
  { id:"yogur_natural",    n:"Yogur natural sin azúcar",             cat:"Lácteos y huevos", u:"ud", pesoUd:125, sal:0.13, k:61, p:3.5, g:3.3, h:4.7 },
  { id:"yogur_griego",    n:"Yogur griego natural sin azúcar",       cat:"Lácteos y huevos", u:"ud", pesoUd:125, sal:0.09, k:59, p:10, g:0.4, h:3.6 },
  { id:"yogur_desnatado", n:"Yogur natural desnatado bio",  rev:2,   cat:"Lácteos y huevos", u:"ud", pesoUd:125, sal:0.13, k:42, p:4.3, g:0.2, h:5.7,
    nota:"Alternativa al griego: 42 kcal menos por tarrina pero 7 g menos de proteína. El recetario usa el griego" },
  { id:"requeson",         n:"Requesón fresco (o ricotta)",          cat:"Lácteos y huevos", u:"g",  sal:0.12, k:98, p:11, g:4.3, h:3.4 },
  { id:"queso_burgos_sinsal", n:"Queso fresco tipo Burgos 0% sal añadida", cat:"Lácteos y huevos", u:"g", sal:0.10, k:130, p:12, g:8, h:3 },
  { id:"mozzarella_fresca",n:"Mozzarella fresca de bola",            cat:"Lácteos y huevos", u:"g",  sal:0.35, k:250, p:18, g:19, h:2 },
  { id:"huevo",            n:"Huevos",                               cat:"Lácteos y huevos", u:"ud", pesoUd:55, sal:0.35, k:143, p:13, g:9.5, h:0.7 },

  /* ---------- PANADERÍA ---------- */
  { id:"pan_ortiz",        n:"Pan tostado Ortiz estilo tradicional (rebanada 10,8 g)", rev:1, cat:"Panadería", u:"ud", pesoUd:10.8, sal:1.40, k:399, p:11, g:6.8, h:70, compra:"paquete", nota:"1,4 g de sal por 100 g: es de lo más salado que entra en la dieta. Mira el apartado del pan en la receta" },
  { id:"pan_tostado_sinsal", n:"Pan tostado INTEGRAL SIN SAL (rebanada 10,8 g)", rev:1, cat:"Panadería", u:"ud", pesoUd:10.8, sal:0.03, k:373, p:14, g:4.8, h:64, compra:"paquete", nota:"Recondo integral sin sal ni azúcar añadidos, en Carrefour (270 g, unos 2,55 €). 0,03 g de sal por 100 g: 47 veces menos que el Ortiz" },
  { id:"pan_ortiz_bajosal", n:"Pan tostado 100% integral BAJO EN SAL (rebanada 10,8 g)", rev:1, cat:"Panadería", u:"ud", pesoUd:10.8, sal:0.20, k:388, p:17.7, g:11, h:47, compra:"paquete", nota:"Hacendado, 0,2 g de sal/100 g. Más proteína que el Recondo, pero siete veces más sal" },
  { id:"leche_desnatada",  n:"Leche desnatada", rev:1, cat:"Lácteos y huevos", u:"ml", sal:0.13, k:35, p:3.4, g:0.3, h:4.9, basico:true },
  { id:"pan_sin_sal",      n:"Pan artesanal SIN SAL (barra o rebanadas congeladas)", cat:"Panadería", u:"ud", pesoUd:40, sal:0.05, k:265, p:8.5, g:1.5, h:52, nota:"Encargar en panadería; congelar en rebanadas" },

  /* ---------- DESPENSA ---------- */
  { id:"arroz_redondo",  n:"Arroz redondo o bomba",        cat:"Despensa", u:"g",  sal:0.01, k:360, p:7, g:0.6, h:79, basico:true },
  { id:"pasta",          n:"Pasta (macarrones, hélices, espaguetis)", cat:"Despensa", u:"g", sal:0.01, k:355, p:12, g:1.5, h:72, basico:true },
  { id:"lentejas",       n:"Lentejas pardinas",            cat:"Despensa", u:"g",  sal:0.02, k:340, p:24, g:1.1, h:60, basico:true },
  { id:"copos_avena",    n:"Copos de avena integrales",    cat:"Despensa", u:"g",  sal:0.02, k:380, p:13, g:7, h:60, basico:true },
  { id:"nueces",         n:"Nueces crudas sin sal",        cat:"Despensa", u:"g",  sal:0.01, k:654, p:15, g:65, h:14 },
  { id:"aove",           n:"Aceite de oliva virgen extra", cat:"Despensa", u:"ml", sal:0.00, k:900, p:0, g:100, h:0, basico:true },
  { id:"vinagre",        n:"Vinagre de manzana o balsámico",cat:"Despensa", u:"ml", sal:0.02, k:20, p:0, g:0, h:0.5, basico:true },
  { id:"miel",           n:"Miel pura",                    cat:"Despensa", u:"g",  sal:0.00, k:304, p:0.3, g:0, h:82, basico:true },
  { id:"cacao_puro",     n:"Cacao puro 100% desgrasado",   cat:"Despensa", u:"g",  sal:0.05, k:230, p:20, g:11, h:15, basico:true },
  { id:"chia",           n:"Semillas de chía",             cat:"Despensa", u:"g",  sal:0.04, k:486, p:17, g:31, h:42, basico:true },
  { id:"vino_blanco",    n:"Vino blanco para cocinar",     cat:"Despensa", u:"ml", sal:0.02, k:80, p:0, g:0, h:2.5, basico:true },
  { id:"aceite_sesamo",  n:"Aceite de sésamo",             cat:"Despensa", u:"ml", sal:0.00, k:900, p:0, g:100, h:0, basico:true },
  { id:"mostaza_bajasal",n:"Mostaza a la antigua baja en sal (o semillas de mostaza)", cat:"Despensa", u:"g", sal:1.00, k:66, p:4, g:4, h:5, basico:true },
  { id:"cafe_desca",     n:"Café descafeinado",            cat:"Despensa", u:"g",  sal:0.00, k:0, p:0, g:0, h:0, basico:true },

  /* ---------- MOCHILA: lo que va a la ruta ---------- */
  { id:"datiles",        n:"Dátiles sin hueso",            rev:1, cat:"Despensa", u:"g", sal:0.00, k:277, p:1.8, g:0.2, h:66, nota:"Los Medjool van mejor para amasar; los secos de bolsa valen y son más baratos" },
  { id:"orejones",       n:"Orejones de albaricoque",      rev:1, cat:"Despensa", u:"g", sal:0.03, k:241, p:3.4, g:0.5, h:53 },
  { id:"pasas",          n:"Pasas sultanas",               rev:1, cat:"Despensa", u:"g", sal:0.03, k:299, p:3.1, g:0.5, h:71 },
  { id:"almendras",      n:"Almendras crudas sin sal",     rev:1, cat:"Despensa", u:"g", sal:0.01, k:579, p:21, g:50, h:9 },
  { id:"crema_cacahuete",n:"Crema de cacahuete 100% sin sal ni azúcar", rev:1, cat:"Despensa", u:"g", sal:0.02, k:588, p:25, g:50, h:16,
    nota:"Mira la etiqueta: la corriente lleva de 0,5 a 1,2 g de sal por 100 g. La buena solo pone «cacahuete 100%»" },
  { id:"sal",            n:"Sal fina",                     rev:1, cat:"Despensa", u:"g", sal:100, k:0, p:0, g:0, h:0, basico:true,
    nota:"En todo el recetario solo aparece aquí: en la bebida de reposición de los días de ruta" },

  /* ---------- ESPECIAS Y AROMÁTICOS (sodio despreciable) ---------- */
  { id:"pimenton",   n:"Pimentón de la Vera (dulce o ahumado)", cat:"Especias y aromáticos", u:"g", sal:0.10, k:280, p:14, g:13, h:34, basico:true },
  { id:"pimienta",   n:"Pimienta negra en molinillo",  cat:"Especias y aromáticos", u:"g", sal:0.02, k:250, p:10, g:3, h:64, basico:true },
  { id:"oregano",    n:"Orégano seco",                 cat:"Especias y aromáticos", u:"g", sal:0.03, k:265, p:9, g:4, h:69, basico:true },
  { id:"tomillo",    n:"Tomillo seco",                 cat:"Especias y aromáticos", u:"g", sal:0.014, k:276, p:9, g:7, h:64,basico:true },
  { id:"romero",     n:"Romero seco",                  cat:"Especias y aromáticos", u:"g", sal:0.013, k:331, p:5, g:15, h:64,basico:true },
  { id:"laurel",     n:"Laurel",                       cat:"Especias y aromáticos", u:"g", sal:0.06, k:313, p:8, g:8, h:75, basico:true },
  { id:"canela",     n:"Canela en polvo",              cat:"Especias y aromáticos", u:"g", sal:0.02, k:247, p:4, g:1.2, h:81, basico:true },
  { id:"comino",     n:"Comino molido",                cat:"Especias y aromáticos", u:"g", sal:0.04, k:375, p:18, g:22, h:44, basico:true },
  { id:"ajo_polvo",  n:"Ajo en polvo",                 cat:"Especias y aromáticos", u:"g", sal:0.06, k:331, p:17, g:0.7, h:73, basico:true },
  { id:"jengibre",   n:"Jengibre fresco o molido",     cat:"Especias y aromáticos", u:"g", sal:0.03, k:80, p:1.8, g:0.8, h:18, basico:true },
  { id:"eneldo",     n:"Eneldo seco",                  cat:"Especias y aromáticos", u:"g", sal:0.05, k:305, p:20, g:4, h:55, basico:true },

  /* ---------- CAPRICHOS ----------
     Los caprichos son platos de verdad y cuentan como todo lo demás: kcal y sal
     reales de etiqueta. Aquí no hay juicio, hay cuentas. Sección propia para que
     en la lista de la compra salgan juntos y al final. */
  { id:"donut_panrico",   n:"Donut Panrico glacé (unidad 52 g)",              cat:"Caprichos", u:"ud", pesoUd:52,  sal:1.00, k:332, p:5.5, g:17,   h:38,  compra:"paquete", nota:"0,52 g de sal por donut: dos donuts llevan más sal que el pan Ortiz de todo un día" },
  { id:"croissant",       n:"Croissant de bollería (ración 36 g)",            cat:"Caprichos", u:"ud", pesoUd:36,  sal:0.61, k:447, p:7.2, g:27,   h:43,  compra:"paquete", nota:"36 g es la ración que declara la etiqueta. Un croissant de panadería pesa el doble: si es de los grandes, pon 2" },
  { id:"palmera_choco",   n:"Palmera de chocolate (unidad 80 g)",             cat:"Caprichos", u:"ud", pesoUd:80,  sal:0.70, k:541, p:6,   g:37,   h:46,  compra:"unidades", nota:"Dato orientativo: las palmeras de pastelería van de 80 a 115 g y de 0,6 a 1,6 g de sal por 100 g" },
  { id:"magdalena",       n:"Magdalena redonda (unidad 29 g)",                cat:"Caprichos", u:"ud", pesoUd:29,  sal:0.17, k:433, p:4.4, g:22,   h:51,  compra:"paquete" },
  { id:"chocolate_leche", n:"Chocolate con leche en tableta",                 cat:"Caprichos", u:"g",              sal:0.28, k:539, p:6.5, g:31,   h:57,  compra:"tableta", nota:"La porción oficial son 4 piezas = 16,7 g" },
  { id:"chocolate_negro", n:"Chocolate negro 70% cacao",                      cat:"Caprichos", u:"g",              sal:0.10, k:531, p:11,  g:36,   h:34,  compra:"tableta", nota:"La mitad de azúcar que el de leche y casi tres veces menos sal" },
  { id:"helado_vainilla", n:"Helado de vainilla (tarrina)",                   cat:"Caprichos", u:"g",              sal:0.11, k:195, p:2.1, g:7.5,  h:29,  compra:"tarrina", nota:"La ración de etiqueta son 50 g, que es más o menos una bola" },
  { id:"helado_choco",    n:"Helado de chocolate (tarrina)",                  cat:"Caprichos", u:"g",              sal:0.09, k:202, p:3.3, g:8.3,  h:27,  compra:"tarrina" },
  { id:"flan_huevo",      n:"Flan de huevo (unidad 110 g)",                   cat:"Caprichos", u:"ud", pesoUd:110, sal:0.20, k:153, p:4.9, g:4.1,  h:24,  compra:"pack" },
  { id:"natillas",        n:"Natillas de vainilla (unidad 120 g)",            cat:"Caprichos", u:"ud", pesoUd:120, sal:0.13, k:109, p:3.1, g:2.9,  h:17.7, compra:"pack", nota:"El capricho más barato en calorías de la lista: 131 kcal" },
  { id:"tarta_queso",     n:"Tarta de queso",                                 cat:"Caprichos", u:"g",              sal:0.40, k:227, p:8.3, g:12,   h:21.3, compra:"tarrina" },
  { id:"patatas_bolsa",   n:"Patatas fritas de bolsa, al punto de sal",       cat:"Caprichos", u:"g",              sal:0.85, k:521, p:6.1, g:31,   h:53,  compra:"bolsa", nota:"Un puñado son 30 g: 0,25 g de sal. Menos que cinco aceitunas, aunque no lo parezca" },
  { id:"doritos",         n:"Nachos de maíz tipo Doritos",                    cat:"Caprichos", u:"g",              sal:0.97, k:497, p:6.6, g:25.8, h:56.9, compra:"bolsa" },
  { id:"cacahuetes_sal",  n:"Cacahuetes fritos con sal",                      cat:"Caprichos", u:"g",              sal:0.82, k:600, p:23,  g:48.1, h:14,  compra:"bolsa" },
  { id:"aceitunas_rell",  n:"Aceitunas verdes rellenas de anchoa (unidad 4 g)", cat:"Caprichos", u:"ud", pesoUd:4, sal:2.60, k:156, p:1.5, g:15.5, h:0.1, compra:"lata", nota:"2,6 g de sal por 100 g. Cinco aceitunas son 0,5 g: la mitad de tu aviso ámbar en cinco bocados" },
  { id:"queso_curado",    n:"Queso curado de oveja (manchego)",               cat:"Caprichos", u:"g",              sal:2.10, k:455, p:27,  g:38,   h:1.3, compra:"cuña", nota:"Una loncha de 45 g son 0,95 g de sal: como el pan Ortiz de todo el día" },
  { id:"jamon_iberico",   n:"Jamón ibérico de bellota, loncheado",            cat:"Caprichos", u:"g",              sal:5.10, k:433, p:32.2, g:33.8, h:0.1, compra:"sobre", nota:"LO MÁS SALADO DE TODO EL CATÁLOGO: 5,1 g de sal por 100 g. 30 g ya son 1,5 g de sal" },
  { id:"bk_whopper",      n:"Whopper de Burger King (unidad 289 g)",          cat:"Caprichos", u:"ud", pesoUd:289, sal:0.90, k:222, p:10.5, g:12.5, h:16.9, compra:"restaurante", nota:"Dato oficial de Burger King España. Uno solo son 643 kcal y 2,6 g de sal: casi dos tercios de tu día de sal" },
  { id:"bk_aros_cebolla", n:"Aros de cebolla de Burger King (unidad 11,8 g)", cat:"Caprichos", u:"ud", pesoUd:11.8, sal:0.51, k:241, p:3.9, g:11.6, h:30.3, compra:"restaurante", nota:"Dato oficial de Burger King España. Cinco aros son 0,3 g de sal: lo menos salado de la carta" },

  /* ---------- McDonald's ----------
     OJO: estas tres cifras salen de la web de McDonald's de ESTADOS UNIDOS, que es la
     única que publica la tabla. La española tiene el apartado vacío. Las recetas y los
     pesos cambian de un país a otro, así que trátalas como una aproximación buena, no
     como la etiqueta española. Y como McDonald's no publica el peso de la ración, aquí
     «1 unidad» ES LA RACIÓN ENTERA: los valores de la columna son los de esa ración. */
  { id:"mcd_wrap_cbo",    n:"McWrap CBO de McDonald's (unidad 243 g)",          cat:"Caprichos", u:"ud", pesoUd:243, sal:1.11, k:262, p:10.7, g:14, h:23.5, compra:"restaurante", nota:"Dato de McDonald's FRANCIA: España no publica el del CBO y el Snack Wrap americano es otro producto, mucho más pequeño. Dos fichas francesas independientes coinciden en 2,7-3,0 g de sal por wrap" },
  { id:"mcd_patatas_med", n:"Patatas fritas medianas de McDonald's (una ración)", cat:"Caprichos", u:"ud", pesoUd:100, sal:0.66, k:320, p:5,  g:15, h:43, compra:"restaurante", nota:"Dato de McDonald's EE. UU.: 260 mg de sodio = 0,66 g de sal. Bastante menos saladas de lo que parecen" },
  { id:"mcd_quarter",     n:"Cuarto de Libra con queso de McDonald's (una ración)", cat:"Caprichos", u:"ud", pesoUd:100, sal:2.60, k:547, p:33, g:29, h:38, compra:"restaurante", nota:"Dato OFICIAL de McDonald's España, de su propia ficha. La unidad es la ración entera" },
  { id:"mcd_cono_helado", n:"Cono de helado de McDonald's (una ración)",     cat:"Caprichos", u:"ud", pesoUd:100, sal:0.10, k:157, p:3.8, g:3.3, h:28, compra:"restaurante", nota:"Dato OFICIAL de McDonald's España, de su propia ficha. La unidad es la ración entera" },
  { id:"mcd_mcflurry_kitkat", n:"McFlurry KitKat de McDonald's (una ración)", cat:"Caprichos", u:"ud", pesoUd:100, sal:0.40, k:419, p:7, g:11, h:72, compra:"restaurante", nota:"Dato OFICIAL de McDonald's España. 54 g de azúcar en un vaso: el producto con más azúcar de todo el catálogo" },
  { id:"mcd_topfries_bacon", n:"Top Fries Bacon & Cheese de McDonald's, individuales (una ración)", cat:"Caprichos", u:"ud", pesoUd:100, sal:1.50, k:423, p:12, g:22, h:42, compra:"restaurante", nota:"Dato OFICIAL de McDonald's España. 1,5 g de sal: más del doble que unas patatas normales" },
  { id:"mcd_cheeseburger", n:"Cheeseburger de McDonald's (unidad 120 g)",     cat:"Caprichos", u:"ud", pesoUd:120, sal:1.33, k:255, p:13.3, g:10.8, h:25, compra:"restaurante", nota:"Dato OFICIAL de McDonald's España. El peso sale de cruzar sus dos columnas: 306 kcal la ración entre 254 kcal por 100 g = 120 g" },
  { id:"bk_alita",        n:"Alita de pollo de Burger King (unidad 39 g)",      cat:"Caprichos", u:"ud", pesoUd:39, sal:2.00, k:203, p:21.2, g:12.8, h:1.2, compra:"restaurante", nota:"Dato OFICIAL de Burger King España, por UNA alita: 79 kcal y 0,78 g de sal. Pon las que te comas con el contador" },
  { id:"cocacola_zero",   n:"Coca-Cola Zero",                                   cat:"Caprichos", u:"ml",             sal:0.02, k:0,   p:0,  g:0,  h:0,  compra:"pack", nota:"Cero calorías y prácticamente cero sal: el único capricho que no cuenta en ninguna de las dos cuentas" },

  /* ---------- lo que hace falta para el batido ---------- */
  { id:"evowhey",         n:"Proteína EvoWhey 2.0 de HSN (dosis 30 g)",       cat:"Despensa",  u:"g",              sal:0.79, k:350, p:78,  g:3.3,  h:6,   compra:"bote", nota:"Se compra en hsnstore, no en el súper. Una dosis de 30 g son 23 g de proteína y 105 kcal" },
  { id:"leche_entera",    n:"Leche entera",                                   cat:"Lácteos y huevos", u:"ml",      sal:0.12, k:64,  p:3.3, g:3.6,  h:4.6, compra:"brick" }
,

  /* ---------- frutos secos y fruta añadidos el 22-sep ---------- */
  { id:"pistachos_sal",   n:"Pistachos tostados con sal (grano, sin cáscara)", cat:"Despensa", u:"g", sal:0.79, k:617, p:25,   g:51,   h:10,   compra:"bolsa", nota:"Hacendado. El valor es del GRANO pelado: 100 g con cáscara son unos 53 g de grano. La sal varía muchísimo de marca a marca (de 0,7 a 3,2 g/100 g): mira la bolsa" },
  { id:"pistachos_sinsal",n:"Pistachos tostados SIN sal (grano, sin cáscara)", cat:"Despensa", u:"g", sal:0.00, k:616, p:21.6, g:52.5, h:11,   compra:"bolsa", nota:"Hacendado 0% sal. Mismas calorías que los salados y cero sal: para ti es el cambio más barato que hay" },
  { id:"mango_deshidratado", n:"Mango deshidratado",                          cat:"Despensa", u:"g", sal:0.23, k:317, p:2.5,  g:1.2,  h:70,   compra:"bolsa", nota:"Hacendado, sin azúcar añadido. 62 g de azúcar por 100 g: es fruta concentrada, no un snack ligero" },
  { id:"melocoton",       n:"Melocotón",                                      cat:"Frutas y verduras", u:"ud", pesoUd:150, sal:0.00, k:39, p:0.91, g:0.25, h:9.5, compra:"unidades" },
  { id:"albaricoque",     n:"Albaricoque",                                    cat:"Frutas y verduras", u:"ud", pesoUd:35,  sal:0.00, k:48, p:1.4,  g:0.39, h:11.1, compra:"unidades" },
  { id:"zumo_granini",    n:"Néctar de naranja Granini (brick 200 ml)",       cat:"Despensa", u:"ml", sal:0.00, k:41, p:0.5, g:0.1, h:9.4, compra:"pack", nota:"Es NÉCTAR, no zumo exprimido: de concentrado, 50% fruta y con azúcar añadido. El brick de 200 ml son 82 kcal y 18,4 g de azúcar. El fabricante no publica proteína ni grasa" },

  /* ---------- BEBIDAS ---------- */
  { id:"cerveza",         n:"Cerveza rubia (lager, 5,5% vol)",                cat:"Caprichos", u:"ml", sal:0.00, k:47, p:0,    g:0,   h:3.5, compra:"pack", nota:"Estrella Galicia Especial. La sal es cero: el precio de la cerveza son las calorías del alcohol, no el sodio. Un tercio son 155 kcal" },
  { id:"cerveza_sin",     n:"Cerveza SIN alcohol (0,0)",                      cat:"Caprichos", u:"ml", sal:0.00, k:21, p:0,    g:0,   h:4.7, compra:"pack", nota:"Estrella Galicia 0,0. Menos de la mitad de calorías que la normal y cero sal" },
  { id:"fanta_nar_zero",  n:"Fanta Naranja Zero",                             cat:"Caprichos", u:"ml", sal:0.02, k:3,  p:0,    g:0,   h:0.6, compra:"pack" },
  { id:"fanta_lim_zero",  n:"Fanta Limón Zero",                               cat:"Caprichos", u:"ml", sal:0.06, k:2,  p:0,    g:0,   h:0,   compra:"pack", nota:"Tres veces más sal que la Coca-Cola Zero: una lata son 0,20 g. Poco, pero no son intercambiables" },

  /* ---------- PAPA JOHN'S (entrantes, dato oficial de España) ----------
     Su tabla oficial da los valores por 100 g pero NO publica el peso de las
     raciones, así que las raciones de las recetas son estimadas y están dichas. */
  { id:"pj_pan_ajo",      n:"Pan de ajo con mozzarella de Papa John's",       cat:"Caprichos", u:"g", sal:0.47, k:232, p:8.9,  g:7.8,  h:34.4, compra:"restaurante", nota:"Dato oficial de Papa John's España. El entrante MENOS salado de su carta, casi cuatro veces menos que los palitos de mozzarella" },
  { id:"pj_aros_cebolla", n:"Aros de cebolla de Papa John's",                 cat:"Caprichos", u:"g", sal:0.78, k:243, p:3.9,  g:12,   h:29,   compra:"restaurante" },
  { id:"pj_patatas",      n:"Papas (patatas) de Papa John's",                 cat:"Caprichos", u:"g", sal:1.20, k:142, p:2,    g:5.5,  h:20,   compra:"restaurante", nota:"1,2 g de sal por 100 g: de los más salados de su carta pese a parecer lo más inocente" },
  { id:"pj_alitas",       n:"Alitas de pollo de Papa John's",                 cat:"Caprichos", u:"g", sal:1.37, k:210, p:22.9, g:12.6, h:0.8,  compra:"restaurante" },
  { id:"pj_pechuguitas",  n:"Pechuguitas de pollo de Papa John's",            cat:"Caprichos", u:"g", sal:1.39, k:206, p:16.9, g:7.4,  h:17.2, compra:"restaurante" },
  { id:"pj_mozza_sticks", n:"Palitos de mozzarella de Papa John's",           cat:"Caprichos", u:"g", sal:1.80, k:282, p:12,   g:13,   h:28,   compra:"restaurante", nota:"1,8 g de sal por 100 g: el entrante más salado de su carta" },
  { id:"pj_chococookie",  n:"ChocoCookie de Papa John's",                     cat:"Caprichos", u:"g", sal:0.84, k:451, p:6.8,  g:21.3, h:57.9, compra:"restaurante" },

  /* ---------- TAPAS DE BAR ----------
     ATENCIÓN: estos cinco NO tienen etiqueta, porque los hace cada bar. Los valores
     salen de calcular la receta típica con tablas de composición (USDA) y etiquetas
     españolas de los productos que se usan, más la sal que se añade al cocinar.
     Son ORIENTATIVOS y la sal es la parte más incierta: entre un bar y otro puede
     haber el doble. El rango real va en la receta de cada uno. */
  { id:"tapa_oreja",      n:"Oreja de cerdo a la plancha (de bar)",           cat:"Caprichos", u:"g", sal:1.42, k:210, p:16,   g:16,   h:0.2,  compra:"bar", nota:"Estimado, no de etiqueta. Rango de sal en la ración entera: 1,8 a 4,3 g. La oreja de bar suele venir ya adobada, con más sal de partida" },
  { id:"tapa_bravas",     n:"Patatas bravas (de bar)",                        cat:"Caprichos", u:"g", sal:1.02, k:192, p:2.2,  g:12.6, h:18.6, compra:"bar", nota:"Estimado, no de etiqueta. Casi toda la sal está en la SALSA: las comerciales van de 1,1 a 4,9 g/100 g. Rango de la ración: 1,5 a 6 g de sal" },
  { id:"tapa_calamares",  n:"Calamares a la romana (de bar)",                 cat:"Caprichos", u:"g", sal:1.34, k:281, p:6.2,  g:21,   h:17.3, compra:"bar", nota:"Estimado, no de etiqueta. Aquí la sal NO la pone el cocinero: el 82% viene en el rebozado industrial. Rango de la ración: 2,8 a 4,3 g" },
  { id:"tapa_croqueta",   n:"Croqueta de jamón de bar (unidad 33 g)",         cat:"Caprichos", u:"ud", pesoUd:33, sal:1.02, k:264, p:7.2, g:19.8, h:15.3, compra:"bar", nota:"Estimado. Por croqueta: 87 kcal y 0,34 g de sal. Cuadra con lo que midió AESAN en croquetas en España (1,3 g/100 g)" },
  { id:"tapa_sepia",      n:"Sepia a la plancha (de bar)",                    cat:"Caprichos", u:"g", sal:2.28, k:160, p:21.4, g:7.2,  h:1.1,  compra:"bar", nota:"Estimado. LA SEPIA YA TRAE 0,93 g de sal por 100 g ANTES de salarla: es el único de estos platos salado de origen. Rango de la ración: 3,3 a 5,8 g" }
,

  /* ---------- PIZZA DE RESTAURANTE (aproximación) ----------
     Domino's España NO publica su tabla nutricional (su web la bloquea). Estas cifras
     son de la tabla OFICIAL de Domino's PORTUGAL, que es el mercado ibérico y el menú
     más parecido. Entre países el mismo producto varía bastante (la Pepperoni tiene
     1,4 g de sal por 100 g en Portugal y 0,9 en Austria), así que esto es una
     aproximación razonable, no el dato español. Todas son medianas, masa original,
     de 8 porciones. */
  { id:"pizza_pepperoni",  n:"Pizza mediana de pepperoni (restaurante, 465 g)",  cat:"Caprichos", u:"g", sal:1.30, k:233, p:10.9, g:9.8,  h:24.4, compra:"restaurante", nota:"Domino's Portugal, mediana de 465 g y 8 porciones. Media pizza son 542 kcal y 3 g de sal" },
  { id:"pizza_bbq_pollo",  n:"Pizza mediana barbacoa con pollo (restaurante, 525 g)", cat:"Caprichos", u:"g", sal:1.00, k:197, p:9.4, g:5.2, h:26.7, compra:"restaurante", nota:"Domino's Portugal, mediana de 525 g. La menos salada y la menos calórica de las tres" },
  { id:"pizza_carbonara",  n:"Pizza mediana carbonara (restaurante, 525 g)",     cat:"Caprichos", u:"g", sal:0.90, k:228, p:10.2, g:10.9, h:21.3, compra:"restaurante", nota:"Domino's Portugal, mediana de 525 g" }
,

  /* ---------- PIZZAS DR. OETKER (congeladas, etiqueta española) ----------
     Peso, macros y sal salen de oetker.es. Las kcal que su web no publica van
     calculadas con la fórmula reglamentaria a partir de sus propios macros. */
  { id:"do_ristorante_quattro_formaggi", n:"Pizza Ristorante Quattro Formaggi (Dr. Oetker, 340 g)", cat:"Caprichos", u:"g", sal:1, k:257, p:11, g:13, h:24, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 437 kcal y 1.7 g de sal" },
  { id:"do_ristorante_barbacoa", n:"Pizza Ristorante Barbacoa (Dr. Oetker, 340 g)", cat:"Caprichos", u:"g", sal:1.3, k:236, p:9.5, g:9.6, h:28, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 401 kcal y 2.21 g de sal" },
  { id:"do_ristorante_pepperoni_salame", n:"Pizza Ristorante Pepperoni-Salame (Dr. Oetker, 320 g)", cat:"Caprichos", u:"g", sal:1.3, k:262, p:10, g:13, h:26, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 419 kcal y 2.08 g de sal" },
  { id:"do_ristorante_prosciutto", n:"Pizza Ristorante Prosciutto (Dr. Oetker, 340 g)", cat:"Caprichos", u:"g", sal:1.2, k:230, p:9.9, g:10, h:24, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 391 kcal y 2.04 g de sal" },
  { id:"do_ristorante_hawaii", n:"Pizza Ristorante Hawaii (Dr. Oetker, 355 g)", cat:"Caprichos", u:"g", sal:1, k:218, p:8.5, g:8.5, h:26, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 387 kcal y 1.77 g de sal" },
  { id:"do_ristorante_mozzarella", n:"Pizza Ristorante Mozzarella (Dr. Oetker, 355 g)", cat:"Caprichos", u:"g", sal:1, k:243, p:10, g:12, h:23, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 431 kcal y 1.77 g de sal" },
  { id:"do_ristorante_vegetale", n:"Pizza Ristorante Vegetale (Dr. Oetker, 385 g)", cat:"Caprichos", u:"g", sal:0.97, k:186, p:6.7, g:7.9, h:22, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 358 kcal y 1.87 g de sal" },
  { id:"do_ristorante_pollo", n:"Pizza Ristorante Pollo (Dr. Oetker, 355 g)", cat:"Caprichos", u:"g", sal:1, k:208, p:8.8, g:8.2, h:24, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 369 kcal y 1.77 g de sal" },
  { id:"do_ristorante_tonno", n:"Pizza Ristorante Tonno (Dr. Oetker, 355 g)", cat:"Caprichos", u:"g", sal:0.94, k:232, p:10, g:10, h:23, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 412 kcal y 1.67 g de sal" },
  { id:"do_ristorante_speciale", n:"Pizza Ristorante Speciale (Dr. Oetker, 345 g)", cat:"Caprichos", u:"g", sal:1.3, k:235, p:10, g:11, h:24, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 405 kcal y 2.24 g de sal" },
  { id:"do_ristorante_funghi", n:"Pizza Ristorante Funghi (Dr. Oetker, 365 g)", cat:"Caprichos", u:"g", sal:0.96, k:222, p:7.9, g:11, h:22, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 405 kcal y 1.75 g de sal" },
  { id:"do_ristorante_diavola", n:"Pizza Ristorante Diavola (Dr. Oetker, 350 g)", cat:"Caprichos", u:"g", sal:1.3, k:236, p:8.9, g:12, h:24, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 413 kcal y 2.27 g de sal" },
  { id:"do_ristorante_spinaci", n:"Pizza Ristorante Spinaci (Dr. Oetker, 390 g)", cat:"Caprichos", u:"g", sal:0.98, k:221, p:7.1, g:11, h:21, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 431 kcal y 1.91 g de sal" },
  { id:"do_ristorante_rucola", n:"Pizza Ristorante Rucola (Dr. Oetker, 325 g)", cat:"Caprichos", u:"g", sal:0.89, k:211, p:8.5, g:8.6, h:25, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 343 kcal y 1.45 g de sal" },
  { id:"do_ristorante_bolognese", n:"Pizza Ristorante Bolognese (Dr. Oetker, 375 g)", cat:"Caprichos", u:"g", sal:1, k:206, p:8.2, g:9, h:23, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 386 kcal y 1.88 g de sal" },
  { id:"do_ristorante_carbonara", n:"Pizza Ristorante Carbonara (Dr. Oetker, 340 g)", cat:"Caprichos", u:"g", sal:1.3, k:242, p:9.4, g:12, h:24, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 411 kcal y 2.21 g de sal" },
  { id:"do_ristorante_salame_mozzarella_pesto", n:"Pizza Ristorante Salame Mozzarella Pesto (Dr. Oetker, 360 g)", cat:"Caprichos", u:"g", sal:1.2, k:245, p:9, g:14, h:23, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 441 kcal y 2.16 g de sal" },
  { id:"do_ristorante_al_salame_vegano", n:"Pizza Ristorante al Salame Vegano (Dr. Oetker, 295 g)", cat:"Caprichos", u:"g", sal:1.1, k:241, p:4.6, g:11, h:31, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 355 kcal y 1.62 g de sal" },
  { id:"do_ristorante_salame_sin_gluten", n:"Pizza Ristorante Salame sin gluten (Dr. Oetker, 315 g)", cat:"Caprichos", u:"g", sal:1.4, k:243, p:10, g:11, h:26, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 383 kcal y 2.21 g de sal" },
  { id:"do_ristorante_mozzarella_sin_gluten", n:"Pizza Ristorante Mozzarella sin gluten (Dr. Oetker, 370 g)", cat:"Caprichos", u:"g", sal:0.93, k:222, p:10, g:10, h:23, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 411 kcal y 1.72 g de sal" },
  { id:"do_ristorante_prosciutto_sin_gluten", n:"Pizza Ristorante Prosciutto sin gluten (Dr. Oetker, 345 g)", cat:"Caprichos", u:"g", sal:1.3, k:221, p:11, g:9, h:24, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 381 kcal y 2.24 g de sal" },
  { id:"do_casa_di_mama_4_formaggi", n:"Pizza Casa di Mama 4 Formaggi (Dr. Oetker, 410 g)", cat:"Caprichos", u:"g", sal:1.2, k:211, p:9.5, g:7.2, h:27, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 433 kcal y 2.46 g de sal" },
  { id:"do_casa_di_mama_bbq_pulled_pork", n:"Pizza Casa di Mama BBQ Pulled Pork (Dr. Oetker, 405 g)", cat:"Caprichos", u:"g", sal:1.2, k:196, p:9.1, g:4.1, h:29, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 397 kcal y 2.43 g de sal" },
  { id:"do_casa_di_mama_speciale", n:"Pizza Casa di Mama Speciale (Dr. Oetker, 415 g)", cat:"Caprichos", u:"g", sal:1.3, k:202, p:9.1, g:6.4, h:27, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 419 kcal y 2.7 g de sal" },
  { id:"do_casa_di_mama_tonno", n:"Pizza Casa di Mama Tonno (Dr. Oetker, 435 g)", cat:"Caprichos", u:"g", sal:1.1, k:186, p:9.3, g:5, h:26, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 405 kcal y 2.39 g de sal" },
  { id:"do_casa_di_mama_bolognese", n:"Pizza Casa di Mama Bolognese (Dr. Oetker, 420 g)", cat:"Caprichos", u:"g", sal:1.2, k:184, p:8.1, g:4.8, h:27, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 386 kcal y 2.52 g de sal" },
  { id:"do_casa_di_mama_prosciutto_funghi", n:"Pizza Casa di Mama Prosciutto-Funghi (Dr. Oetker, 405 g)", cat:"Caprichos", u:"g", sal:1.2, k:185, p:8.5, g:4.3, h:27, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 375 kcal y 2.43 g de sal" },
  { id:"do_tradizionale_quattro_formaggi", n:"Pizza Tradizionale Quattro Formaggi (Dr. Oetker, 380 g)", cat:"Caprichos", u:"g", sal:1, k:244, p:9.8, g:9.2, h:30, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Media pizza: 464 kcal y 1.9 g de sal" },
  { id:"do_tradizionale_diavola_calabrese", n:"Pizza Tradizionale Diavola Calabrese (Dr. Oetker, 360 g)", cat:"Caprichos", u:"g", sal:1.3, k:230, p:8.9, g:7.8, h:31, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 414 kcal y 2.34 g de sal" },
  { id:"do_tradizionale_speciale", n:"Pizza Tradizionale Speciale (Dr. Oetker, 400 g)", cat:"Caprichos", u:"g", sal:1.2, k:222, p:9.7, g:7.9, h:28, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 444 kcal y 2.4 g de sal" },
  { id:"do_tradizionale_pancetta_delicata", n:"Pizza Tradizionale Pancetta Delicata (Dr. Oetker, 390 g)", cat:"Caprichos", u:"g", sal:1.1, k:238, p:9.5, g:9.3, h:29, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 464 kcal y 2.15 g de sal" },
  { id:"do_tradizionale_mozzarella_e_pesto", n:"Pizza Tradizionale Mozzarella e Pesto (Dr. Oetker, 385 g)", cat:"Caprichos", u:"g", sal:0.94, k:236, p:8.6, g:9.1, h:30, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 454 kcal y 1.81 g de sal" },
  { id:"do_tradizionale_spinaci_e_ricotta", n:"Pizza Tradizionale Spinaci e Ricotta (Dr. Oetker, 415 g)", cat:"Caprichos", u:"g", sal:0.97, k:204, p:7.8, g:6.8, h:28, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 423 kcal y 2.01 g de sal" },
  { id:"do_la_mia_grande_4_formaggi", n:"Pizza La Mia Grande 4 Formaggi (Dr. Oetker, 400 g)", cat:"Caprichos", u:"g", sal:1.3, k:243, p:11, g:11, h:25, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 486 kcal y 2.6 g de sal" },
  { id:"do_la_mia_grande_prosciutto_e_formagg", n:"Pizza La Mia Grande Prosciutto e Formaggi (Dr. Oetker, 400 g)", cat:"Caprichos", u:"g", sal:1.3, k:219, p:11, g:8.3, h:25, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 438 kcal y 2.6 g de sal" },
  { id:"do_la_mia_grande_tonno_e_cipolle", n:"Pizza La Mia Grande Tonno e Cipolle (Dr. Oetker, 415 g)", cat:"Caprichos", u:"g", sal:1.2, k:212, p:12, g:7.5, h:24, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 440 kcal y 2.49 g de sal" },
  { id:"do_la_mia_grande_rucola", n:"Pizza La Mia Grande Rucola (Dr. Oetker, 410 g)", cat:"Caprichos", u:"g", sal:1.1, k:204, p:10, g:7.1, h:25, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Las kcal no las publica la web: están calculadas con la fórmula oficial a partir de sus propios macros. Media pizza: 418 kcal y 2.26 g de sal" },
  { id:"do_rustica_cheese_deluxe", n:"Pizza Rustica Cheese Deluxe (Dr. Oetker, 277.5 g)", cat:"Caprichos", u:"g", sal:0.97, k:261, p:12, g:11, h:28, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Rustica viene en pack de 2: 277.5 g es UNA pizza. Media pizza: 362 kcal y 1.35 g de sal" },
  { id:"do_rustica_royale", n:"Pizza Rustica Royale (Dr. Oetker, 287.5 g)", cat:"Caprichos", u:"g", sal:1, k:217, p:12, g:6.7, h:26, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Rustica viene en pack de 2: 287.5 g es UNA pizza. Media pizza: 312 kcal y 1.44 g de sal" },
  { id:"do_rustica_ham_cheese", n:"Pizza Rustica Ham & Cheese (Dr. Oetker, 272.5 g)", cat:"Caprichos", u:"g", sal:1.1, k:265, p:12, g:11, h:29, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Rustica viene en pack de 2: 272.5 g es UNA pizza. Media pizza: 361 kcal y 1.5 g de sal" },
  { id:"do_rustica_double_pepperoni_cheddar_y", n:"Pizza Rustica Double Pepperoni Cheddar y Mozzarella (Dr. Oetker, 282.5 g)", cat:"Caprichos", u:"g", sal:1.3, k:273, p:11, g:12, h:28, compra:"congelador", nota:"Etiqueta española de Dr. Oetker. Rustica viene en pack de 2: 282.5 g es UNA pizza. Media pizza: 386 kcal y 1.84 g de sal" }
];
