/* HOGAR — limpieza, menaje de cocina, aseo y mascota.

   Nada de esto tiene calorías ni entra en una receta: es un catálogo aparte del
   de ingredientes, a propósito. Meterlo con la comida obligaría a que cada
   cálculo del menú tuviera que saltarse estas líneas.

   n      = EL PRODUCTO. Aquí vienen nombres genéricos para arrancar; la línea se
            convierte en TU producto el día que le pongas marca y formato
            —«Champú Head & Shoulders Classic 400 ml»— y entonces se le quita
            `pendiente`. Lo que viaja a Amazon es este nombre, así que sin marca
            no es comprable.
   cat    = Limpieza | Menaje | Aseo | Mascota. Qué es.
   cajon  = amazon | super | suscripcion. DÓNDE SE COMPRA.
            «suscripcion» no sale nunca en la lista: llega solo. Si se acaba
            antes de tiempo, un click lo manda a la compra de Amazon esa vez.

   Que algo falte NO se dice aquí: eso es del día, lo marcas tú y vive en tu
   estado, no en el catálogo.
*/
window.DATOS_HOGAR = [

  /* ---------- LIMPIEZA ---------- */
  { id:"detergente_de_lavadora", n:"Ariel Todo En 1 PODS Original, formato ahorro 140 cápsulas", rev:2, cat:"Limpieza", cajon:"amazon" },
  { id:"suavizante", n:"Flor Azul Suavizante Concentrado", rev:2, cat:"Limpieza", cajon:"amazon" },
  { id:"quitamanchas", n:"Quitamanchas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"pastillas_de_lavavajillas", n:"Finish Powerball Power All in 1, 80 pastillas", rev:2, cat:"Limpieza", cajon:"amazon" },
  { id:"abrillantador_de_lavavajillas", n:"Somat Abrillantador Secado Extra", rev:2, cat:"Limpieza", cajon:"amazon" },
  { id:"sal_de_lavavajillas", n:"Sal de lavavajillas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true, nota:"Solo si no usas pastillas todo en uno" },
  { id:"lavavajillas_a_mano", n:"Finish All in 1 Max Power Gel, pack ahorro", rev:2, cat:"Limpieza", cajon:"amazon" },
  { id:"limpia_tuberias", n:"WC Net Limpia Tuberías con carbón activo", rev:1, cat:"Limpieza", cajon:"amazon", nota:"Para los malos olores del desagüe" },
  { id:"cesta_wc", n:"Bref Power Activ Cesta WC (duo pack)", rev:1, cat:"Limpieza", cajon:"amazon", nota:"Los compras en Natura Pine y en Limón" },
  { id:"limpiador_multiusos", n:"Skip Ultimate Limpieza Profunda, detergente líquido", rev:2, cat:"Limpieza", cajon:"amazon" },
  { id:"limpiacristales", n:"Limpiacristales", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"limpiador_de_bano_y_antical", n:"Don Limpio Detergente Líquido de Baño, 1,5 L", rev:2, cat:"Limpieza", cajon:"amazon" },
  { id:"lejia", n:"Lejía", rev:1, cat:"Limpieza", cajon:"super", pendiente:true, nota:"Pesa y es barata: de las cosas que no compensa traer de Amazon" },
  { id:"friegasuelos", n:"Friegasuelos", rev:1, cat:"Limpieza", cajon:"super", pendiente:true, nota:"Lo mismo: garrafa pesada y barata" },
  { id:"bolsas_de_basura_grandes", n:"Bolsas de basura grandes", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"bolsas_de_basura_pequenas", n:"Bolsas de basura pequeñas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"bayetas", n:"Bayetas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"estropajos", n:"Estropajos", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"guantes_de_fregar", n:"Guantes de fregar", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"ambientador", n:"Sanicentro Gel WC Desinfectante Frescor", rev:2, cat:"Limpieza", cajon:"amazon" },
  /* ---------- MENAJE DE COCINA ---------- */
  { id:"papel_de_aluminio", n:"by Amazon Papel de aluminio, 30 m × 30 cm", rev:2, cat:"Menaje", cajon:"amazon" },
  { id:"cinta_adhesiva", n:"Scotch Cinta Adhesiva Transparente, 8 rollos", rev:1, cat:"Menaje", cajon:"amazon" },
  { id:"film_transparente", n:"Film transparente", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"papel_de_horno", n:"Papel de horno", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"papel_para_freidora_de_aire", n:"Papel para freidora de aire", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true, nota:"Los redondos con agujeros, del tamaño de tu cesta" },
  { id:"papel_de_cocina", n:"Scottex Megarollo Papel de cocina, 3 rollos", rev:2, cat:"Menaje", cajon:"amazon" },
  { id:"bolsas_de_congelacion", n:"Bolsas de congelación", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"bolsas_de_cierre_zip", n:"Bolsas de cierre zip", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"servilletas_de_papel", n:"Servilletas de papel", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  /* ---------- ASEO ---------- */
  { id:"gel_de_ducha", n:"Deliplus Gel de Ba\u00f1o \u00c1mbar y Vetiver, botella 750 ml (Mercadona)", rev:2, cat:"Aseo", cajon:"super" },
  { id:"champu", n:"Champú", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"acondicionador", n:"Acondicionador", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"desodorante", n:"Dove Men +Care Clean Comfort aerosol 72 h", rev:2, cat:"Aseo", cajon:"amazon", nota:"También compras el Rexona Men Advanced Protection 72 h" },
  { id:"dentifrico", n:"Fluocaril Bi-Fluoré 250 mg pasta dentífrica menta", rev:2, cat:"Aseo", cajon:"amazon" },
  { id:"cepillo_de_dientes", n:"Cepillo de dientes", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true, nota:"Si es eléctrico, aquí van los recambios" },
  { id:"cepillos_interdentales_o_seda_", n:"Cepillos interdentales o seda dental", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"enjuague_bucal", n:"Fluocaril Colutorio Bi-Fluoré Menta, 2 × 500 ml", rev:2, cat:"Aseo", cajon:"amazon" },
  { id:"cuchillas_de_afeitar", n:"Cuchillas de afeitar", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"espuma_o_gel_de_afeitar", n:"Espuma o gel de afeitar", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"crema_hidratante_corporal", n:"Bepanthol Pomada Protectora, 30 g", rev:2, cat:"Aseo", cajon:"amazon", nota:"Para rozaduras y grietas" },
  { id:"salvaslip", n:"Evax Salvaslip Maxi Protegeslip, 40 unidades", rev:1, cat:"Aseo", cajon:"amazon" },
  { id:"tampones", n:"Tampax Pearl Regular con aplicador, 24 unidades", rev:1, cat:"Aseo", cajon:"amazon" },
  { id:"cera_pelo", n:"Got2b Cera fijadora Beach Matt", rev:1, cat:"Aseo", cajon:"amazon" },
  { id:"limpieza_ortodoncia", n:"Corega Ortodoncias y Férulas, 36 tabletas limpiadoras", rev:1, cat:"Aseo", cajon:"amazon" },
  { id:"papel_higienico", n:"Scottex Megarollo Papel Higiénico Seco, 16 rollos", rev:3, cat:"Aseo", cajon:"amazon", nota:"El de 16 rollos equivale a 32 normales" },
  { id:"panuelos_de_papel", n:"Pañuelos de papel", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"bastoncillos", n:"Bastoncillos", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"jabon_de_manos", n:"Jabón de manos", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"protector_solar", n:"Protector solar", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true, nota:"De temporada: para las rutas" },
  /* ---------- MASCOTA ---------- */
  { id:"pienso_del_gato", n:"Pienso del gato", rev:3, cat:"Mascota", cajon:"amazon", oculta:true, nota:"Retirado: el gato solo come lata" },
  { id:"arena_del_gato", n:"Vitakraft Magic Clean Classic, arena no aglomerante, 4,2 kg", rev:2, cat:"Mascota", cajon:"suscripcion", nota:"Suscripción de Amazon: 4 bolsas cada 6 semanas" },
  { id:"comida_humeda_del_gato", n:"Purina Gourmet Gold Mousse, caja 96 × 85 g", rev:2, cat:"Mascota", cajon:"suscripcion", nota:"Suscripción de Amazon: 1 caja cada 6 semanas" },
  { id:"snacks_del_gato", n:"Snacks del gato", rev:2, cat:"Mascota", cajon:"amazon", oculta:true, nota:"Retirado: no los toma" },
  { id:"bolsas_para_recoger_la_arena", n:"Biokat's bolsas XXL de polietileno para la bandeja", rev:2, cat:"Mascota", cajon:"suscripcion", nota:"Suscripción de Amazon: 1 paquete cada 6 semanas" },
  { id:"antiparasitario", n:"Antiparasitario", rev:2, cat:"Mascota", cajon:"amazon", oculta:true, nota:"Retirado: no lo usa" }
];
