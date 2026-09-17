/* Recetario — Asistente de Alimentación (dieta baja en sodio)
   raciones: 1 salvo que se indique
   ing: cantidades en la unidad base del ingrediente (g / ml / ud)
   La sal por ración la calcula la app sumando los ingredientes.
*/
window.DATOS_RECETAS = [

/* ============================ DESAYUNOS ============================ */
{
  id:"des_tostada_tomate", n:"Tostada de pan sin sal con tomate y AOVE",
  tipo:["desayuno"], grupo:"desayuno", raciones:1, min:5, tools:["sin-cocinar"],
  ing:[{i:"pan_sin_sal",c:1},{i:"tomate",c:0.5},{i:"aove",c:8},{i:"cafe_desca",c:8},{i:"leche",c:100}],
  pasos:[
    "Tuesta la rebanada de pan sin sal (sale directa del congelador al tostador).",
    "Ralla medio tomate maduro y escúrrelo un poco.",
    "Extiende el tomate sobre el pan y riega con un hilo de aceite de oliva virgen extra.",
    "Acompaña con el café descafeinado con leche."
  ],
  nota:"Variante: en lugar de tomate, requesón con una pizca de orégano."
},
{
  id:"des_porridge_manzana", n:"Porridge de manzana y canela",
  tipo:["desayuno"], grupo:"desayuno", raciones:1, min:5, tools:["microondas"],
  ing:[{i:"copos_avena",c:30},{i:"leche",c:170},{i:"manzana_reineta",c:0.5},{i:"canela",c:1},{i:"nueces",c:10},{i:"cafe_desca",c:8}],
  pasos:[
    "Corta media manzana en dados pequeños (o rállala).",
    "En un bol, mezcla los copos de avena, la leche, la manzana y una pizca generosa de canela.",
    "Microondas 1,5–2 minutos a potencia media-alta.",
    "Remueve y deja reposar 1 minuto: espesará solo.",
    "Añade las nueces troceadas por encima."
  ]
},
{
  id:"des_porridge_cacao", n:"Porridge templado de plátano y cacao puro",
  tipo:["desayuno"], grupo:"desayuno", raciones:1, min:5, tools:["microondas"],
  ing:[{i:"copos_avena",c:30},{i:"leche",c:170},{i:"platano",c:0.5},{i:"cacao_puro",c:5},{i:"canela",c:0.5},{i:"cafe_desca",c:8}],
  pasos:[
    "Machaca medio plátano maduro con un tenedor en el propio bol hasta hacerlo puré.",
    "Añade la avena, el cacao puro y la leche. Remueve EN FRÍO hasta que el cacao se disuelva.",
    "Microondas 1,5–2 minutos a potencia media-alta.",
    "Remueve bien y deja reposar 1 minuto. Si queda espeso, un chorrito de leche fría.",
    "Termina con unas rodajas del resto del plátano por encima."
  ],
  nota:"El plátano bien maduro (con motas) neutraliza el amargor del cacao sin añadir azúcar."
},
{
  id:"des_porridge_rojos", n:"Porridge de frutos rojos y ralladura de limón",
  tipo:["desayuno"], grupo:"desayuno", raciones:1, min:5, tools:["microondas"],
  ing:[{i:"copos_avena",c:30},{i:"leche",c:170},{i:"arandanos",c:60},{i:"limon",c:0.2},{i:"cafe_desca",c:8}],
  pasos:[
    "Cocina la avena con la leche y una pizca de ralladura de limón (solo la parte amarilla) 1,5–2 min al microondas.",
    "Remueve y deja reposar 1 minuto.",
    "Echa los frutos rojos por encima en caliente: soltarán su jugo y su color."
  ]
},
{
  id:"des_overnight", n:"Porridge frío sin cocinar (overnight oats)",
  tipo:["desayuno"], grupo:"desayuno", raciones:1, min:3, tools:["sin-cocinar"],
  ing:[{i:"copos_avena",c:30},{i:"leche",c:150},{i:"chia",c:5},{i:"miel",c:7},{i:"mango",c:0.25},{i:"nueces",c:10},{i:"cafe_desca",c:8}],
  pasos:[
    "LA NOCHE ANTES: en un tarro de cristal con tapa, mezcla la avena, la leche, la chía y la miel.",
    "Remueve bien para que no quede avena seca en el fondo. Tapa y a la nevera (mínimo 6 horas).",
    "POR LA MAÑANA: remueve, añade la fruta troceada y las nueces picadas. Se come del propio tarro."
  ],
  nota:"Deja dos o tres tarros hechos de una vez y tienes la semana resuelta."
},
{
  id:"des_tortitas_avena", n:"Tortitas rápidas de avena y huevo",
  tipo:["desayuno"], grupo:"desayuno", raciones:1, min:8, tools:["sarten"],
  ing:[{i:"huevo",c:1},{i:"copos_avena",c:35},{i:"leche",c:50},{i:"platano",c:0.5},{i:"canela",c:1},{i:"aove",c:5},{i:"cafe_desca",c:8}],
  pasos:[
    "Bate el huevo con la avena, la leche y la canela hasta tener una masa espesa.",
    "Sartén antiadherente caliente con unas gotas de aceite: vierte la masa en 2–3 tortitas.",
    "Dora 1 minuto por cada lado.",
    "Sirve con rodajas de plátano (o requesón si las prefieres saladas)."
  ]
},
{
  id:"des_huevos_revueltos", n:"Huevos revueltos con hierbas",
  tipo:["desayuno","cena"], grupo:"huevos", raciones:1, min:6, tools:["sarten"],
  ing:[{i:"huevo",c:2},{i:"aove",c:8},{i:"oregano",c:0.5},{i:"pimienta",c:0.3},{i:"tomate",c:0.5},{i:"cafe_desca",c:8}],
  pasos:[
    "Bate los huevos con orégano y pimienta negra recién molida.",
    "Sartén a fuego BAJO con un poco de aceite: cuaja removiendo despacio para que queden cremosos.",
    "Acompaña con una rodaja gruesa de tomate con un hilo de aceite."
  ]
},
{
  id:"des_batido", n:"Batido saciante de fruta, leche y avena",
  tipo:["desayuno"], grupo:"desayuno", raciones:1, min:2, tools:["sin-cocinar"],
  ing:[{i:"leche",c:200},{i:"platano",c:0.5},{i:"copos_avena",c:20},{i:"nueces",c:10},{i:"cafe_desca",c:8}],
  pasos:["Tritura todo en la batidora 30 segundos y listo."],
  nota:"Para las mañanas con prisa."
},

/* ==================== ALMUERZO Y MERIENDA ==================== */
{
  id:"snack_fruta_nueces", n:"Fruta fresca con nueces",
  tipo:["almuerzo","merienda"], grupo:"fruta", raciones:1, min:1, tools:["sin-cocinar"],
  ing:[{i:"fruta_temporada",c:1},{i:"nueces",c:10}],
  pasos:["Una pieza de fruta de temporada y un puñado de nueces crudas sin sal."]
},
{
  id:"snack_pan_requeson", n:"Pan sin sal con requesón e infusión",
  tipo:["merienda"], grupo:"desayuno", raciones:1, min:3, tools:["sin-cocinar"],
  ing:[{i:"pan_sin_sal",c:1},{i:"requeson",c:40},{i:"aove",c:5}],
  pasos:["Tuesta el pan sin sal, unta el requesón y añade un hilo de aceite.","Acompaña con manzanilla o rooibos."]
},
{
  id:"postre_yogur_avena", n:"Yogur griego con copos de avena",
  tipo:["postre"], grupo:"postre", raciones:1, min:1, tools:["sin-cocinar"],
  ing:[{i:"yogur_griego",c:1},{i:"copos_avena",c:10}],
  pasos:["Un yogur griego natural sin azúcar con una cucharada sopera de copos de avena.","El griego lleva el triple de proteína que el natural y las mismas calorías."],
  nota:"Postre fijo de comida y cena."
},

/* ======================== LEGUMBRES ======================== */
{
  id:"lentejas_estofadas", n:"Lentejas estofadas con sofrito aromático",
  tipo:["comida"], grupo:"legumbre", raciones:2, min:45, tools:["cazuela"],
  ing:[{i:"lentejas",c:180},{i:"cebolla_dulce",c:1},{i:"puerro",c:0.5},{i:"zanahoria",c:1},{i:"ajo",c:2},{i:"tomate",c:1},{i:"pimenton",c:3},{i:"laurel",c:1},{i:"comino",c:1},{i:"aove",c:20}],
  pasos:[
    "Sofríe MUY despacio cebolla, puerro, zanahoria y ajo picados hasta que estén dorados (10–12 min). Aquí está todo el sabor.",
    "Añade el tomate rallado y deja reducir 3 minutos.",
    "Fuera del fuego, incorpora el pimentón de la Vera y remueve rápido para que no se queme.",
    "Añade las lentejas, el laurel, una pizca de comino y agua hasta cubrir dos dedos.",
    "Cuece 30–35 minutos a fuego suave. Sin sal: el sofrito y el pimentón la sustituyen."
  ],
  nota:"Salen 2 raciones: congela una o repítela a media semana."
},
{
  id:"crema_lentejas", n:"Crema suave de lentejas con calabacín y zanahoria",
  tipo:["comida","cena"], grupo:"legumbre", raciones:2, min:30, tools:["cazuela"],
  ing:[{i:"lentejas",c:140},{i:"zanahoria",c:1},{i:"calabacin",c:0.5},{i:"cebolla_dulce",c:0.5},{i:"ajo",c:1},{i:"aove",c:15},{i:"comino",c:1},{i:"pimienta",c:0.5}],
  pasos:[
    "Pocha la cebolla y el ajo en la cazuela con el aceite.",
    "Añade la lenteja, la zanahoria y el calabacín en trozos y agua hasta cubrir.",
    "Cuece 25 minutos y tritura hasta que quede una crema fina.",
    "Termina con pimienta negra y un hilo de aceite en crudo."
  ]
},
{
  id:"guisantes_pollo", n:"Guisantes salteados con cebolla pochada y pollo",
  tipo:["comida"], grupo:"legumbre", raciones:1, min:20, tools:["sarten","microondas"],
  ing:[{i:"guisantes",c:200},{i:"cebolla_dulce",c:1},{i:"pollo_pechuga",c:150},{i:"ajo",c:1},{i:"aove",c:10},{i:"pimienta",c:0.5}],
  pasos:[
    "Cebolla en juliana al estuche de silicona 3 min al microondas; pásala a la sartén y dórala 3 min.",
    "Añade el pollo en taquitos y séllalo a fuego fuerte.",
    "Incorpora los guisantes (si son congelados, directamente) y saltea 5–6 minutos.",
    "Pimienta negra al final."
  ]
},

/* ======================== CARNE ROJA ======================== */
{
  id:"entrecot_patatas", n:"Entrecot de ternera a la plancha con patatas en airfryer",
  tipo:["comida"], grupo:"carne-roja", raciones:1, min:20, tools:["sarten","airfryer","microondas"],
  ing:[{i:"ternera_entrecot",c:200},{i:"patata",c:1},{i:"aove",c:10},{i:"pimienta",c:0.5},{i:"ajo_polvo",c:1},{i:"romero",c:0.5},{i:"brotes_verdes",c:50},{i:"tomate",c:1}],
  pasos:[
    "Patata en bastones al estuche de silicona con 1 cucharada de agua: 3 min al microondas.",
    "Pásala al cesto de la airfryer con aceite, pimentón y ajo en polvo: 8–10 min a 200 °C.",
    "Saca el entrecot de la nevera 20 min antes. Sartén MUY caliente, unas gotas de aceite.",
    "Marca 2–3 min por cada lado según grosor. Pimienta y romero al sacarlo, nunca antes.",
    "Deja reposar 2 minutos antes de cortar y sirve con ensalada de brotes y tomate."
  ]
},
{
  id:"hamburguesa_completa", n:"Hamburguesa baja en sal con cebolla caramelizada y queso fundido",
  tipo:["comida","cena"], grupo:"carne-roja", raciones:1, min:15, tools:["sarten","airfryer","microondas"],
  ing:[{i:"hamburguesa_bajasal",c:1},{i:"cebolla_dulce",c:1},{i:"mozzarella_fresca",c:40},{i:"patata",c:1},{i:"aove",c:10},{i:"vinagre",c:5},{i:"pimienta",c:0.5},{i:"ajo_polvo",c:1},{i:"pimenton",c:1}],
  pasos:[
    "CEBOLLA EXPRÉS: juliana fina al estuche de silicona con unas gotas de aceite y 1 cucharadita de agua → 3 min al microondas a máxima potencia.",
    "Pásala a una sartén pequeña con un hilo de aceite: en 3 minutos coge color marrón intenso. Unas gotas de vinagre balsámico al final para desglasar.",
    "PATATAS: en bastones, 2 min al estuche con una cucharada de agua; luego airfryer a 200 °C 8–10 min con aceite, pimentón y ajo en polvo.",
    "CARNE: sartén muy caliente, 2 minutos por lado (o en la airfryer los últimos 6 min a 190 °C).",
    "Al dar la vuelta, coloca encima la cebolla caliente y sobre ella la mozzarella.",
    "Tapa la sartén 60 segundos con el fuego apagado: el queso funde sobre la cebolla."
  ],
  nota:"La cebolla comercial en tarro NO: lleva conservantes con sodio. El queso en lonchas tampoco (0,5–0,8 g de sal por loncha)."
},

/* ======================= CARNE BLANCA ======================= */
{
  id:"pollo_pina", n:"Pechuga de pollo a la plancha con piña fresca dorada",
  tipo:["comida"], grupo:"carne-blanca", raciones:1, min:15, tools:["sarten"],
  ing:[{i:"pollo_pechuga",c:220},{i:"pina_fresca",c:0.15},{i:"aove",c:10},{i:"pimienta",c:0.5},{i:"brotes_verdes",c:50}],
  pasos:[
    "Abre la pechuga en filetes no muy gruesos y sécala bien con papel.",
    "Sartén muy caliente con unas gotas de aceite: 2–3 min por lado. Pimienta al sacarla.",
    "En la MISMA sartén, dora las rodajas de piña fresca 1 minuto por cara: caramelizan y recogen los jugos del pollo.",
    "Sirve el pollo con la piña encima y ensalada verde al lado."
  ],
  nota:"La acidez y el dulzor de la piña hacen innecesaria la sal."
},
{
  id:"solomillo_manzana_setas", n:"Medallones de solomillo con puré de manzana asada y setas",
  tipo:["comida"], grupo:"carne-blanca", raciones:1, min:20, tools:["sarten","microondas"],
  ing:[{i:"cerdo_solomillo",c:220},{i:"manzana_reineta",c:1},{i:"setas",c:100},{i:"ajo",c:1},{i:"aove",c:10},{i:"pimienta",c:0.5},{i:"tomillo",c:0.5},{i:"canela",c:0.5}],
  pasos:[
    "PURÉ: manzana pelada en dados al bol tapado con 1 cucharada de agua y una pizca de canela → 4–5 min al microondas. Aplasta con tenedor.",
    "SETAS: sartén con aceite y ajo laminado; setas troceadas a fuego VIVO para que doren y no suelten agua. Tomillo y pimienta al sacarlas.",
    "SOLOMILLO: corta 3 medallones gruesos (2–3 cm). Sartén muy caliente, 2–3 min por lado: dorados fuera, jugosos dentro.",
    "Monta: base de puré templado, los medallones encima y las setas al lado."
  ]
},
{
  id:"solomillo_cebolla_pure", n:"Solomillo de cerdo con cebolla caramelizada y puré de patata",
  tipo:["comida"], grupo:"carne-blanca", raciones:1, min:25, tools:["sarten","microondas"],
  ing:[{i:"cerdo_solomillo",c:220},{i:"cebolla_dulce",c:1},{i:"patata",c:1},{i:"leche",c:50},{i:"aove",c:10},{i:"pimienta",c:0.5},{i:"vinagre",c:5}],
  pasos:[
    "Patata en trozos al estuche de silicona con 2 cucharadas de agua: 6–7 min al microondas. Aplasta con la leche y un chorro de aceite.",
    "Cebolla en juliana: 3 min al estuche y 3 min en sartén hasta caramelizar. Gotas de vinagre al final.",
    "Sella los medallones de solomillo 2–3 min por lado en sartén muy caliente.",
    "Sirve sobre el puré con la cebolla por encima."
  ]
},
{
  id:"lomo_manzana", n:"Lomo de cerdo con salsa exprés de manzana y cebolla",
  tipo:["comida"], grupo:"carne-blanca", raciones:1, min:12, tools:["lekue","sarten","microondas"],
  ing:[{i:"cerdo_lomo",c:200},{i:"manzana_reineta",c:1},{i:"cebolla_dulce",c:0.5},{i:"aove",c:10},{i:"pimienta",c:0.5},{i:"tomillo",c:0.5},{i:"vino_blanco",c:30}],
  pasos:[
    "Manzana en láminas y cebolla en juliana al estuche Lékué con el vino blanco (o 3 cucharadas de agua), pimienta y unas gotas de aceite.",
    "Cierra y cocina 5 minutos a 800 W: saldrán deshechas y dulces.",
    "Tritura 30 segundos con la batidora hasta crema untuosa (o aplasta con tenedor si la quieres rústica). Reserva caliente.",
    "Sartén a fuego fuerte: sella los filetes SOLO 1 minuto por cada lado para que no se sequen.",
    "Vierte la crema caliente sobre la sartén, apaga el fuego y deja 30–40 segundos. Tomillo por encima."
  ],
  nota:"Nunca lomo adobado comercial: supera 1,5 g de sal por cada 100 g."
},

/* ======================= PESCADO BLANCO ======================= */
{
  id:"bacalao_panadera", n:"Bacalao al natural con patatas panaderas en Lékué",
  tipo:["comida","cena"], grupo:"pescado-blanco", raciones:1, min:9, tools:["lekue","microondas"],
  ing:[{i:"bacalao_natural",c:1.5},{i:"patata",c:1},{i:"cebolla_dulce",c:0.5},{i:"aove",c:10},{i:"ajo_polvo",c:1},{i:"pimienta",c:0.5},{i:"perejil",c:2},{i:"limon",c:0.25}],
  pasos:[
    "Patata en rodajas MUY finas (2 mm) y cebolla en juliana al fondo del estuche, alternadas.",
    "Añade 2 cucharadas de agua (o vino blanco), el aceite, ajo en polvo y pimienta. Cierra.",
    "4 minutos y medio a 800 W: las patatas salen tiernas.",
    "Abre con cuidado del vapor. Seca bien el lomo de bacalao y ponlo encima, con la piel hacia abajo.",
    "Pincela con aceite, pimienta y perejil. Cierra y 3 minutos exactos a 800 W.",
    "Reposa 1 minuto con el estuche cerrado dentro del microondas apagado. Unas gotas de limón al servir."
  ],
  nota:"Bacalao AL NATURAL sin salar (0,16 g de sal/100 g). Nunca el desalado."
},
{
  id:"bacalao_tomate", n:"Bacalao al natural con tomate casero y cebolla",
  tipo:["cena"], grupo:"pescado-blanco", raciones:1, min:20, tools:["sarten"],
  ing:[{i:"bacalao_natural",c:1.5},{i:"tomate",c:2},{i:"cebolla_dulce",c:0.5},{i:"ajo",c:1},{i:"aove",c:10},{i:"oregano",c:0.5},{i:"pimienta",c:0.5}],
  pasos:[
    "Pocha la cebolla y el ajo despacio hasta que estén dorados.",
    "Añade el tomate rallado sin piel y deja reducir 10 minutos a fuego lento con orégano: sin sal, el tomate concentra su propio dulzor.",
    "Coloca el lomo de bacalao sobre la salsa, tapa y cocina 5–6 minutos a fuego suave.",
    "No remuevas: mueve la sartén para que ligue."
  ]
},
{
  id:"merluza_vapor", n:"Merluza al vapor en Lékué con calabacín y berenjena",
  tipo:["cena"], grupo:"pescado-blanco", raciones:1, min:12, tools:["lekue","airfryer","microondas"],
  ing:[{i:"merluza_lomo",c:220},{i:"calabacin",c:0.5},{i:"berenjena",c:0.5},{i:"aove",c:10},{i:"limon",c:0.25},{i:"pimienta",c:0.5},{i:"oregano",c:0.5},{i:"eneldo",c:0.5}],
  pasos:[
    "Verduras en rodajas de 1 cm al cesto de la airfryer con aceite y orégano: 14 min a 180 °C, removiendo a mitad.",
    "Merluza al estuche con unas gotas de aceite, zumo de limón, pimienta y eneldo.",
    "2,5–3 minutos a 800 W. Queda jugosísima; ni un minuto más."
  ]
},
{
  id:"lubina_espalda", n:"Lubina a la espalda con ajos dorados",
  tipo:["cena"], grupo:"pescado-blanco", raciones:1, min:20, tools:["horno","sarten"],
  ing:[{i:"lubina",c:250},{i:"ajo",c:3},{i:"aove",c:10},{i:"vinagre",c:5},{i:"perejil",c:2},{i:"tomate",c:1},{i:"cebolla_dulce",c:0.25}],
  pasos:[
    "Lubina abierta en libro al horno a 200 °C durante 10–12 minutos (o airfryer 180 °C, 12 min).",
    "Mientras, dora los ajos laminados en aceite a fuego suave hasta que estén rubios.",
    "Fuera del fuego añade unas gotas de vinagre y el perejil picado.",
    "Riega el pescado con el refrito y sirve con ensalada de tomate y cebolla dulce."
  ]
},
{
  id:"lubina_horno_verduras", n:"Lubina con tomate, berenjena y calabacín en airfryer",
  rev:2,
  tipo:["cena"], grupo:"pescado-blanco", raciones:1, min:28, tools:["airfryer"],
  ing:[{i:"lubina",c:220},{i:"berenjena",c:0.5},{i:"calabacin",c:0.5},{i:"tomate",c:1},
       {i:"ajo",c:2},{i:"aove",c:8},{i:"tomillo",c:0.5},{i:"pimienta",c:0.5},
       {i:"limon",c:0.25},{i:"perejil",c:2}],
  pasos:[
    "Saca la lubina de la nevera 10 minutos antes de empezar. El pescado muy frío se hace por fuera antes de que el centro llegue, y sale seco por el borde y crudo por dentro.",
    "Sécala bien con papel de cocina por las dos caras, sobre todo la piel. Esto no es un detalle: el pescado húmedo se cuece al vapor en vez de dorarse, y se pega a la cesta.",
    "Berenjena y calabacín en medias lunas de 1,5 cm, sin pelar. El tomate en cuatro gajos gruesos.",
    "Aliña la verdura EN UN BOL, nunca en la cesta: 5 ml de aceite, el tomillo y la pimienta, y remueve con las manos hasta que brille todo. Regar el aceite por encima de la cesta deja unos trozos empapados y otros secos.",
    "Unta los lomos con los 3 ml de aceite que quedan y reparte el ajo en láminas finas por encima.",
    {min:0, t:"La berenjena sola — 190 °C, 6 minutos",
     d:"Va primero porque es la que más tarda: es densa y necesita ese adelanto para quedar cremosa por dentro en vez de correosa. Esta freidora no necesita precalentar."},
    {min:6, t:"Añade el calabacín y sacude — 190 °C, 6 minutos",
     d:"Sacude la cesta agarrándola por el asa, sin cuchara: así lo de abajo sube y se dora por igual. El calabacín entra después porque lleva más agua y se desharía."},
    {min:12, t:"Aparta la verdura a los lados, baja a 180 °C y mete lubina y tomate — 8 minutos",
     d:"Los lomos con LA PIEL ABAJO en el centro, sin que se toquen entre ellos. El tomate en los bordes: suelta mucha agua y pegado al pescado lo cocería al vapor. Bajas a 180 porque 190 reseca la lubina."},
    {min:20, t:"Fuera, todo a la vez",
     d:"No le des la vuelta al pescado en ningún momento. Esta freidora calienta por arriba y por abajo a la vez, así que se hace por los dos lados solo; darle la vuelta parte el lomo."},
    "Ya en el plato: ralla un poco de piel de limón, exprime un chorrito y espolvorea el perejil picado."
  ],
  trucos:[
    "Cómo saber que está: la carne pasa de transparente a blanca opaca y se abre en lascas al apretar con el tenedor. Si dudas, sácala — sigue haciéndose un minuto fuera del calor, y de lubina pasada no se vuelve.",
    "El limón, al final y en el plato. Echado antes, el ácido «cuece» la superficie del pescado y lo reseca.",
    "Todo en una sola capa. La freidora cocina moviendo aire caliente: si amontonas, lo de abajo se cuece al vapor. En tu cesta de 27×27 cm hay sitio de sobra para esta cantidad.",
    "Sin sal, tampoco en la verdura. Aquí el sabor lo ponen el ajo, el tomillo, la pimienta y el limón del final. Además la sal sacaría el agua de la berenjena y el calabacín y los dejaría blandos.",
    "No hace falta desamargar la berenjena: las variedades de ahora no amargan, y el truco clásico era precisamente con sal.",
    "Si los lomos son de distinto grosor, mete el gordo en el minuto 12 y el fino en el 14."
  ],
  nota:"Tiempos medidos para la Moulinex Easy Fry XL Surface: cesta de 27×27 cm y resistencia arriba y abajo. En una freidora de cesta honda y estrecha no cabe en una capa: haz la verdura primero, tápala con papel de aluminio y luego el pescado."
},
{
  id:"calamar_plancha", n:"Calamar fresco a la plancha con ajo y perejil",
  tipo:["cena"], grupo:"pescado-blanco", raciones:1, min:12, tools:["sarten","airfryer"],
  ing:[{i:"calamar_fresco",c:280},{i:"ajo",c:2},{i:"perejil",c:3},{i:"limon",c:0.5},{i:"aove",c:10},{i:"calabacin",c:0.5},{i:"pimienta",c:0.5}],
  pasos:[
    "Seca muy bien el calamar limpio: si tiene agua, cuece en vez de dorarse.",
    "Plancha o sartén al máximo, 2 minutos por cada lado. Ni un minuto más o se endurece.",
    "Picada de ajo y perejil crudos con aceite y unas gotas de limón por encima al sacarlo.",
    "Calabacín en rodajas a la plancha de acompañamiento."
  ]
},

/* ======================== PESCADO AZUL ======================== */
{
  id:"salmon_patatas", n:"Salmón a la plancha con patatas en airfryer",
  tipo:["comida"], grupo:"pescado-azul", raciones:1, min:18, tools:["sarten","airfryer","microondas"],
  ing:[{i:"salmon_lomo",c:210},{i:"patata",c:1},{i:"aove",c:10},{i:"limon",c:0.25},{i:"eneldo",c:0.5},{i:"pimienta",c:0.5},{i:"ajo_polvo",c:1},{i:"pimenton",c:1}],
  pasos:[
    "Patata en bastones: 3 min al estuche con una cucharada de agua, luego airfryer 200 °C 8 min con aceite, pimentón y ajo en polvo.",
    "Salmón con la piel hacia abajo en sartén caliente: 4 minutos sin tocarlo, 1 minuto por el otro lado.",
    "Eneldo, pimienta y unas gotas de limón al servir."
  ]
},
{
  id:"salmon_verduras_horno", n:"Salmón con berenjena y tomate asados al tomillo",
  tipo:["cena"], grupo:"pescado-azul", raciones:1, min:20, tools:["airfryer","lekue"],
  ing:[{i:"salmon_lomo",c:190},{i:"berenjena",c:0.5},{i:"tomate",c:1},{i:"aove",c:10},{i:"tomillo",c:1},{i:"pimienta",c:0.5},{i:"calabacin",c:0.3}],
  pasos:[
    "Berenjena, tomate y calabacín en rodajas con aceite y tomillo: airfryer 180 °C, 14–16 min.",
    "Salmón al estuche Lékué con calabacín fino debajo: 2–2,5 min a 800 W (o 5 min en la airfryer a 180 °C).",
    "Monta el salmón sobre las verduras asadas."
  ]
},
{
  id:"atun_sellado", n:"Atún fresco sellado con patatas gajo en airfryer",
  tipo:["comida"], grupo:"pescado-azul", raciones:1, min:18, tools:["sarten","airfryer","microondas"],
  ing:[{i:"atun_fresco",c:220},{i:"patata",c:1},{i:"limon",c:0.5},{i:"aove",c:10},{i:"pimienta",c:0.5},{i:"ajo_polvo",c:1},{i:"jengibre",c:1},{i:"aceite_sesamo",c:3}],
  pasos:[
    "MARINADO (15 min antes): el lomo de atún con zumo de limón, un poco de jengibre rallado y unas gotas de aceite de sésamo.",
    "Patatas en gajos: 3 min al estuche, luego airfryer 200 °C 9 min con aceite y ajo en polvo.",
    "Sartén al MÁXIMO: sella el atún 1 minuto por cada cara. El centro debe quedar rosado, si se pasa queda seco y estopajoso.",
    "Corta en láminas gruesas y pimienta por encima."
  ],
  nota:"El atún se seca en segundos: sellado fuerte y corto es la única forma de que quede jugoso."
},

/* ========================== HUEVOS ========================== */
{
  id:"tortilla_espinacas", n:"Tortilla francesa con espinacas al ajo",
  tipo:["cena"], grupo:"huevos", raciones:1, min:12, tools:["sarten"],
  ing:[{i:"huevo",c:2},{i:"espinacas",c:120},{i:"ajo",c:1},{i:"aove",c:10},{i:"tomate",c:1},{i:"oregano",c:0.5},{i:"pimienta",c:0.5}],
  pasos:[
    "Saltea las espinacas con el ajo laminado a fuego vivo 3 minutos hasta que pierdan el agua.",
    "Bate los huevos con pimienta, añade las espinacas y cuaja la tortilla vuelta y vuelta.",
    "Acompaña con tomate en rodajas con orégano y aceite."
  ]
},
{
  id:"tortilla_calabacin", n:"Tortilla francesa con calabacín pochado",
  tipo:["cena"], grupo:"huevos", raciones:1, min:12, tools:["sarten","microondas"],
  ing:[{i:"huevo",c:2},{i:"calabacin",c:0.5},{i:"cebolla_dulce",c:0.25},{i:"aove",c:10},{i:"pimienta",c:0.5}],
  pasos:[
    "Calabacín rallado (escurrido) y cebolla al estuche 3 min al microondas, o pochados en sartén 6 min.",
    "Bate los huevos con pimienta, mezcla el calabacín y cuaja a fuego medio."
  ]
},
{
  id:"revuelto_guisantes", n:"Revuelto de huevos con guisantes y cebolla pochada",
  tipo:["cena"], grupo:"huevos", raciones:1, min:15, tools:["sarten","microondas"],
  ing:[{i:"huevo",c:2},{i:"guisantes",c:120},{i:"cebolla_dulce",c:0.5},{i:"aove",c:10},{i:"pimienta",c:0.5}],
  pasos:[
    "Cebolla al estuche 3 min y luego a la sartén hasta dorar.",
    "Añade los guisantes y saltea 5 minutos.",
    "Echa los huevos batidos y remueve a fuego bajo hasta que cuajen cremosos."
  ]
},
{
  id:"revuelto_calabacin", n:"Revuelto suave de calabacín con pan sin sal",
  tipo:["cena"], grupo:"huevos", raciones:1, min:12, tools:["sarten"],
  ing:[{i:"huevo",c:2},{i:"calabacin",c:0.5},{i:"aove",c:10},{i:"pan_sin_sal",c:1},{i:"pimienta",c:0.5}],
  pasos:[
    "Calabacín en dados pequeños pochado en sartén 6 minutos.",
    "Añade los huevos y remueve a fuego bajo hasta que queden cremosos.",
    "Sirve con una rebanada de pan sin sal tostada con aceite."
  ]
},
{
  id:"crema_calabacin_huevo", n:"Crema de calabacín y cebolla con huevo cocido",
  tipo:["cena"], grupo:"verdura", raciones:2, min:20, tools:["cazuela","microondas"],
  ing:[{i:"calabacin",c:2},{i:"cebolla_dulce",c:1},{i:"patata",c:0.5},{i:"huevo",c:2},{i:"aove",c:20},{i:"pimienta",c:0.5}],
  pasos:[
    "Pocha la cebolla, añade el calabacín y la patata en trozos y agua justo hasta cubrir.",
    "Cuece 15 minutos y tritura. Cuanta menos agua, más sabor concentrado.",
    "Sirve con huevo cocido picado por encima y un hilo de aceite en crudo."
  ]
},

/* ======================== PASTA Y ARROZ ======================== */
{
  id:"pasta_bolonesa", n:"Pasta con carne picada y tomate casero",
  tipo:["comida"], grupo:"pasta-arroz", raciones:2, min:35, tools:["sarten","microondas"],
  ing:[{i:"pasta",c:160},{i:"ternera_picada",c:300},{i:"tomate",c:4},{i:"cebolla_dulce",c:1},{i:"ajo",c:2},{i:"aove",c:20},{i:"oregano",c:1},{i:"albahaca",c:5},{i:"pimienta",c:0.5},{i:"zanahoria",c:1}],
  pasos:[
    "Sofríe cebolla, ajo y zanahoria rallada MUY despacio, 12 minutos: es lo que sustituye a la sal.",
    "Sube el fuego y sella la carne picada removiendo hasta que pierda el color rosado.",
    "Añade el tomate natural rallado, orégano y pimienta. Reduce 15 minutos a fuego lento.",
    "Cuece la pasta en el cocedor de microondas (10–12 min a 800 W) o en cazuela SIN sal en el agua.",
    "Mezcla y termina con albahaca fresca rota a mano."
  ]
},
{
  id:"pasta_pesto_pollo", n:"Pasta al pesto casero de nueces con pollo",
  tipo:["comida"], grupo:"pasta-arroz", raciones:1, min:20, tools:["sarten","microondas"],
  ing:[{i:"pasta",c:80},{i:"albahaca",c:25},{i:"nueces",c:20},{i:"ajo",c:1},{i:"aove",c:18},{i:"pollo_pechuga",c:150},{i:"pimienta",c:0.5},{i:"limon",c:0.2}],
  pasos:[
    "PESTO: tritura albahaca, nueces, el ajo sin germen, el aceite y unas gotas de limón. Sin queso: las nueces dan la untuosidad.",
    "Cuece la pasta (cocedor de microondas, 10–12 min) y reserva un poco del agua de cocción.",
    "Dora el pollo en dados en la sartén.",
    "Mezcla la pasta con el pesto EN FRÍO fuera del fuego (si lo calientas, amarga) y una cucharada del agua de cocción para ligar. Añade el pollo."
  ]
},
{
  id:"arroz_calamar", n:"Arroz meloso con calamar fresco y fondo oscuro de cebolla",
  tipo:["comida"], grupo:"pasta-arroz", raciones:1, min:20, tools:["cazuela"],
  ing:[{i:"arroz_redondo",c:70},{i:"calamar_fresco",c:200},{i:"cebolla_dulce",c:0.5},{i:"ajo",c:1},{i:"tomate",c:0.5},{i:"pimenton",c:2},{i:"aove",c:10},{i:"laurel",c:1},{i:"pimienta",c:0.3}],
  pasos:[
    "FONDO OSCURO (5–6 min): cebolla picada en la cazuela con el aceite a fuego medio-alto hasta color marrón avellana. Si se agarra, una cucharada de agua para desglasar. Ajo en el último minuto.",
    "Añade el calamar troceado y saltea fuerte 2 minutos hasta que cambie de color.",
    "Retira del fuego un segundo, añade el pimentón y el tomate rallado, remueve e integra 1 minuto a fuego medio (el pimentón se quema en nada).",
    "Echa el arroz y remuévelo con el sofrito 1 minuto para que se impregne (nacarar).",
    "Añade 250 ml de agua caliente y el laurel: 8 min a fuego medio + 5 min suave, removiendo para que suelte almidón.",
    "Reposa 2 minutos tapado con un paño."
  ],
  nota:"El color marrón de la cebolla es TODO el sabor del plato. Sin ese paso, el arroz sabe a agua."
},
{
  id:"arroz_oriental", n:"Arroz salteado con pollo, calabacín y jengibre",
  tipo:["comida"], grupo:"pasta-arroz", raciones:1, min:20, tools:["sarten","microondas"],
  ing:[{i:"arroz_redondo",c:80},{i:"pollo_pechuga",c:150},{i:"calabacin",c:0.5},{i:"cebolla_dulce",c:0.5},{i:"huevo",c:1},{i:"aceite_sesamo",c:5},{i:"jengibre",c:3},{i:"ajo",c:1},{i:"aove",c:10}],
  pasos:[
    "Cuece el arroz en el cocedor de microondas (12 min a 800 W) y déjalo enfriar un poco: frío saltea mejor.",
    "Cuaja una tortilla francesa fina y córtala en tiras.",
    "Sartén al máximo: pollo en dados, cebolla y calabacín. Saltea sin parar 5 minutos.",
    "Añade el arroz, el jengibre rallado y el ajo. Saltea 3 minutos más.",
    "Fuera del fuego, las tiras de tortilla y unas gotas de aceite de sésamo. SIN salsa de soja: tiene muchísima sal."
  ]
},

/* ======================== ENSALADAS Y VERDURAS ======================== */
{
  id:"ensalada_mango", n:"Ensalada de brotes, mango, nueces y requesón",
  tipo:["cena"], grupo:"ensalada", raciones:1, min:10, tools:["sin-cocinar"],
  ing:[{i:"brotes_verdes",c:80},{i:"mango",c:0.5},{i:"nueces",c:15},{i:"requeson",c:60},{i:"aove",c:12},{i:"vinagre",c:10},{i:"miel",c:7},{i:"mostaza_bajasal",c:3}],
  pasos:[
    "VINAGRETA: emulsiona el aceite con el vinagre de manzana (o limón), la miel y una punta de mostaza baja en sal.",
    "Monta los brotes, el mango en dados, el requesón en cucharadas y las nueces.",
    "Aliña justo antes de comer."
  ],
  nota:"La mostaza de Dijon corriente lleva 3–5 g de sal por 100 g: usa la baja en sal o semillas molidas con vinagre."
},
{
  id:"ensalada_espinacas_mango", n:"Ensalada de espinacas tiernas con mango y queso fresco",
  tipo:["cena"], grupo:"ensalada", raciones:1, min:8, tools:["sin-cocinar"],
  ing:[{i:"espinacas",c:80},{i:"mango",c:0.5},{i:"queso_burgos_sinsal",c:60},{i:"nueces",c:15},{i:"aove",c:12},{i:"vinagre",c:10}],
  pasos:[
    "Espinacas tiernas lavadas de base.",
    "Mango en dados, queso fresco sin sal en tacos del mismo tamaño y nueces.",
    "Aliña con aceite y unas gotas de vinagre balsámico."
  ]
},
{
  id:"parrillada_airfryer", n:"Parrillada de verduras en airfryer",
  tipo:["guarnicion","cena"], grupo:"verdura", raciones:2, min:18, tools:["airfryer"],
  ing:[{i:"calabacin",c:1},{i:"berenjena",c:1},{i:"tomate",c:2},{i:"cebolla_dulce",c:1},{i:"aove",c:12},{i:"oregano",c:1},{i:"ajo_polvo",c:1},{i:"pimienta",c:0.5}],
  pasos:[
    "Calabacín y berenjena en rodajas de 1 cm, cebolla en gajos, tomate en mitades.",
    "Mézclalo todo en un bol con el aceite y las especias, con las manos, para que se impregne por igual.",
    "Airfryer precalentada a 180 °C: 14–16 minutos removiendo el cesto a mitad."
  ]
},
{
  id:"patatas_airfryer", n:"Patatas crujientes en airfryer (truco microondas)",
  tipo:["guarnicion"], grupo:"verdura", raciones:1, min:12, tools:["airfryer","microondas"],
  ing:[{i:"patata",c:1},{i:"aove",c:6},{i:"pimenton",c:1},{i:"ajo_polvo",c:1},{i:"pimienta",c:0.3}],
  pasos:[
    "Patata en bastones o gajos al estuche de vapor con 1 cucharada de agua: 3 min al microondas.",
    "Pásalas al bol, pincela con aceite y añade pimentón, ajo en polvo y pimienta.",
    "Airfryer 200 °C, 7–8 minutos. Tiernas por dentro y crujientes por fuera en la mitad de tiempo."
  ]
},
{
  id:"tomates_airfryer", n:"Tomates asados en airfryer con ajo y hierbas",
  tipo:["guarnicion"], grupo:"verdura", raciones:1, min:12, tools:["airfryer"],
  ing:[{i:"tomate",c:2},{i:"aove",c:6},{i:"ajo_polvo",c:1},{i:"oregano",c:1},{i:"pimienta",c:0.3}],
  pasos:[
    "Tomates por la mitad, con unos cortes en cruz sobre la pulpa.",
    "Pincela con aceite y espolvorea ajo, orégano y pimienta.",
    "Airfryer 190 °C, 10–12 minutos hasta que la piel se arrugue y la pulpa caramelice."
  ]
},
{
  id:"setas_lekue", n:"Setas al vapor con ajo y perejil (Lékué)",
  tipo:["guarnicion"], grupo:"verdura", raciones:1, min:5, tools:["lekue","microondas"],
  ing:[{i:"setas",c:150},{i:"ajo",c:1},{i:"perejil",c:3},{i:"aove",c:8},{i:"pimienta",c:0.3}],
  pasos:["Setas laminadas al estuche con aceite, ajo picado y perejil.","3 minutos a 800 W. Salen en su propio jugo."]
}
];
