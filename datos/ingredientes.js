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
  { id:"lubina",             n:"Lubina fresca (entera o en lomos)",  cat:"Pescadería", u:"g", sal:0.25, k:100, p:19, g:2.5, h:0, compra:"pieza" },
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
  { id:"requeson",         n:"Requesón fresco (o ricotta)",          cat:"Lácteos y huevos", u:"g",  sal:0.12, k:98, p:11, g:4.3, h:3.4 },
  { id:"queso_burgos_sinsal", n:"Queso fresco tipo Burgos 0% sal añadida", cat:"Lácteos y huevos", u:"g", sal:0.10, k:130, p:12, g:8, h:3 },
  { id:"mozzarella_fresca",n:"Mozzarella fresca de bola",            cat:"Lácteos y huevos", u:"g",  sal:0.35, k:250, p:18, g:19, h:2 },
  { id:"huevo",            n:"Huevos",                               cat:"Lácteos y huevos", u:"ud", pesoUd:55, sal:0.35, k:143, p:13, g:9.5, h:0.7 },

  /* ---------- PANADERÍA ---------- */
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
  { id:"eneldo",     n:"Eneldo seco",                  cat:"Especias y aromáticos", u:"g", sal:0.05, k:305, p:20, g:4, h:55, basico:true }
];
