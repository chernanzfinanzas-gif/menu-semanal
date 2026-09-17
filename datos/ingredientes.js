/* Catálogo de ingredientes — Asistente de Alimentación (dieta baja en sodio)
   sal   = gramos de sal por 100 g / 100 ml de producto
   pesoUd = gramos que pesa 1 unidad (solo cuando u === "ud")
   basico = despensa fija: no entra en la compra semanal salvo que lo marques
*/
window.DATOS_INGREDIENTES = [

  /* ---------- CARNICERÍA ---------- */
  { id:"ternera_entrecot",   n:"Entrecot de ternera",            cat:"Carnicería", u:"g",  sal:0.15, compra:"pieza" },
  { id:"ternera_picada",     n:"Carne picada magra de ternera",  cat:"Carnicería", u:"g",  sal:0.15, compra:"bandeja" },
  { id:"hamburguesa_bajasal",n:"Hamburguesa de vacuno baja en sal (≤0,25 g/100 g)", cat:"Carnicería", u:"ud", pesoUd:150, sal:0.25, compra:"unidades" },
  { id:"pollo_pechuga",      n:"Pechuga de pollo fresca",        cat:"Carnicería", u:"g",  sal:0.15, compra:"bandeja" },
  { id:"cerdo_solomillo",    n:"Solomillo de cerdo fresco",      cat:"Carnicería", u:"g",  sal:0.15, compra:"pieza" },
  { id:"cerdo_lomo",         n:"Lomo de cerdo fresco en filetes (sin adobar)", cat:"Carnicería", u:"g", sal:0.15, compra:"bandeja" },

  /* ---------- PESCADERÍA Y CONGELADOS ---------- */
  { id:"bacalao_natural",    n:"Lomo de bacalao al natural SIN SALAR (congelado)", cat:"Pescadería", u:"ud", pesoUd:130, sal:0.16, compra:"paquete", nota:"Nunca desalado ni en salazón" },
  { id:"merluza_lomo",       n:"Lomo de merluza fresca o congelada", cat:"Pescadería", u:"g", sal:0.25, compra:"lomos" },
  { id:"lubina",             n:"Lubina fresca (entera o en lomos)",  cat:"Pescadería", u:"g", sal:0.25, compra:"pieza" },
  { id:"calamar_fresco",     n:"Calamar fresco limpio",              cat:"Pescadería", u:"g", sal:0.25, compra:"pieza" },
  { id:"salmon_lomo",        n:"Lomo de salmón fresco o congelado",  cat:"Pescadería", u:"g", sal:0.15, compra:"lomos" },
  { id:"atun_fresco",        n:"Atún fresco (lomo)",                 cat:"Pescadería", u:"g", sal:0.15, compra:"pieza" },

  /* ---------- FRUTAS Y VERDURAS ---------- */
  { id:"cebolla_dulce",  n:"Cebolla dulce",            cat:"Frutas y verduras", u:"ud", pesoUd:150, sal:0.01 },
  { id:"ajo",            n:"Ajo",                      cat:"Frutas y verduras", u:"ud", pesoUd:5,   sal:0.04, basico:true },
  { id:"patata",         n:"Patata",                   cat:"Frutas y verduras", u:"ud", pesoUd:180, sal:0.02 },
  { id:"calabacin",      n:"Calabacín",                cat:"Frutas y verduras", u:"ud", pesoUd:250, sal:0.02 },
  { id:"berenjena",      n:"Berenjena",                cat:"Frutas y verduras", u:"ud", pesoUd:250, sal:0.01 },
  { id:"tomate",         n:"Tomate maduro",            cat:"Frutas y verduras", u:"ud", pesoUd:150, sal:0.01 },
  { id:"zanahoria",      n:"Zanahoria",                cat:"Frutas y verduras", u:"ud", pesoUd:80,  sal:0.17 },
  { id:"puerro",         n:"Puerro",                   cat:"Frutas y verduras", u:"ud", pesoUd:150, sal:0.05 },
  { id:"espinacas",      n:"Espinacas frescas",        cat:"Frutas y verduras", u:"g",  sal:0.20 },
  { id:"brotes_verdes",  n:"Brotes verdes (bolsa ensalada)", cat:"Frutas y verduras", u:"g", sal:0.05 },
  { id:"setas",          n:"Setas o champiñones frescos", cat:"Frutas y verduras", u:"g", sal:0.01 },
  { id:"guisantes",      n:"Guisantes tiernos (congelados)", cat:"Congelados", u:"g", sal:0.01 },
  { id:"pina_fresca",    n:"Piña fresca",              cat:"Frutas y verduras", u:"ud", pesoUd:1200, sal:0.00 },
  { id:"manzana_reineta",n:"Manzana reineta o golden", cat:"Frutas y verduras", u:"ud", pesoUd:180, sal:0.00 },
  { id:"platano",        n:"Plátano",                  cat:"Frutas y verduras", u:"ud", pesoUd:120, sal:0.00 },
  { id:"mango",          n:"Mango",                    cat:"Frutas y verduras", u:"ud", pesoUd:350, sal:0.00 },
  { id:"limon",          n:"Limón",                    cat:"Frutas y verduras", u:"ud", pesoUd:110, sal:0.00 },
  { id:"fruta_temporada",n:"Fruta de temporada (pera, kiwi, naranja…)", cat:"Frutas y verduras", u:"ud", pesoUd:150, sal:0.00 },
  { id:"arandanos",      n:"Arándanos o frambuesas",   cat:"Frutas y verduras", u:"g", sal:0.00 },
  { id:"albahaca",       n:"Albahaca fresca",          cat:"Frutas y verduras", u:"g", sal:0.02 },
  { id:"perejil",        n:"Perejil fresco",           cat:"Frutas y verduras", u:"g", sal:0.14, basico:true },

  /* ---------- LÁCTEOS Y HUEVOS ---------- */
  { id:"leche",            n:"Leche",                                cat:"Lácteos y huevos", u:"ml", sal:0.10 },
  { id:"yogur_natural",    n:"Yogur natural sin azúcar",             cat:"Lácteos y huevos", u:"ud", pesoUd:125, sal:0.13 },
  { id:"requeson",         n:"Requesón fresco (o ricotta)",          cat:"Lácteos y huevos", u:"g",  sal:0.12 },
  { id:"queso_burgos_sinsal", n:"Queso fresco tipo Burgos 0% sal añadida", cat:"Lácteos y huevos", u:"g", sal:0.10 },
  { id:"mozzarella_fresca",n:"Mozzarella fresca de bola",            cat:"Lácteos y huevos", u:"g",  sal:0.35 },
  { id:"huevo",            n:"Huevos",                               cat:"Lácteos y huevos", u:"ud", pesoUd:55, sal:0.35 },

  /* ---------- PANADERÍA ---------- */
  { id:"pan_sin_sal",      n:"Pan artesanal SIN SAL (barra o rebanadas congeladas)", cat:"Panadería", u:"ud", pesoUd:40, sal:0.05, nota:"Encargar en panadería; congelar en rebanadas" },

  /* ---------- DESPENSA ---------- */
  { id:"arroz_redondo",  n:"Arroz redondo o bomba",        cat:"Despensa", u:"g",  sal:0.01, basico:true },
  { id:"pasta",          n:"Pasta (macarrones, hélices, espaguetis)", cat:"Despensa", u:"g", sal:0.01, basico:true },
  { id:"lentejas",       n:"Lentejas pardinas",            cat:"Despensa", u:"g",  sal:0.02, basico:true },
  { id:"copos_avena",    n:"Copos de avena integrales",    cat:"Despensa", u:"g",  sal:0.02, basico:true },
  { id:"nueces",         n:"Nueces crudas sin sal",        cat:"Despensa", u:"g",  sal:0.01 },
  { id:"aove",           n:"Aceite de oliva virgen extra", cat:"Despensa", u:"ml", sal:0.00, basico:true },
  { id:"vinagre",        n:"Vinagre de manzana o balsámico",cat:"Despensa", u:"ml", sal:0.02, basico:true },
  { id:"miel",           n:"Miel pura",                    cat:"Despensa", u:"g",  sal:0.00, basico:true },
  { id:"cacao_puro",     n:"Cacao puro 100% desgrasado",   cat:"Despensa", u:"g",  sal:0.05, basico:true },
  { id:"chia",           n:"Semillas de chía",             cat:"Despensa", u:"g",  sal:0.04, basico:true },
  { id:"vino_blanco",    n:"Vino blanco para cocinar",     cat:"Despensa", u:"ml", sal:0.02, basico:true },
  { id:"aceite_sesamo",  n:"Aceite de sésamo",             cat:"Despensa", u:"ml", sal:0.00, basico:true },
  { id:"mostaza_bajasal",n:"Mostaza a la antigua baja en sal (o semillas de mostaza)", cat:"Despensa", u:"g", sal:1.00, basico:true },
  { id:"cafe_desca",     n:"Café descafeinado",            cat:"Despensa", u:"g",  sal:0.00, basico:true },

  /* ---------- ESPECIAS Y AROMÁTICOS (sodio despreciable) ---------- */
  { id:"pimenton",   n:"Pimentón de la Vera (dulce o ahumado)", cat:"Especias y aromáticos", u:"g", sal:0.10, basico:true },
  { id:"pimienta",   n:"Pimienta negra en molinillo",  cat:"Especias y aromáticos", u:"g", sal:0.02, basico:true },
  { id:"oregano",    n:"Orégano seco",                 cat:"Especias y aromáticos", u:"g", sal:0.03, basico:true },
  { id:"tomillo",    n:"Tomillo seco",                 cat:"Especias y aromáticos", u:"g", sal:0.014,basico:true },
  { id:"romero",     n:"Romero seco",                  cat:"Especias y aromáticos", u:"g", sal:0.013,basico:true },
  { id:"laurel",     n:"Laurel",                       cat:"Especias y aromáticos", u:"g", sal:0.06, basico:true },
  { id:"canela",     n:"Canela en polvo",              cat:"Especias y aromáticos", u:"g", sal:0.02, basico:true },
  { id:"comino",     n:"Comino molido",                cat:"Especias y aromáticos", u:"g", sal:0.04, basico:true },
  { id:"ajo_polvo",  n:"Ajo en polvo",                 cat:"Especias y aromáticos", u:"g", sal:0.06, basico:true },
  { id:"jengibre",   n:"Jengibre fresco o molido",     cat:"Especias y aromáticos", u:"g", sal:0.03, basico:true },
  { id:"eneldo",     n:"Eneldo seco",                  cat:"Especias y aromáticos", u:"g", sal:0.05, basico:true }
];
