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
  { id:"detergente_de_lavadora", n:"Ariel Todo En 1 PODS Original, formato ahorro 140 cápsulas", rev:4, cat:"Limpieza", cajon:"amazon", pendiente:false },
  { id:"suavizante", n:"Flor Suavizante Concentrado aroma Nenuco, hipoalergénico, 78 dosis, 1,4 L", rev:5, cat:"Limpieza", cajon:"amazon", nota:"CONFIRMADO por Carlos el 23-sep-2026: Amazon marca que lo compró en marzo de 2025. 4,88 € (3,48 €/l), 4,3 estrellas. Antes estaba apuntado como «Flor Azul», que es otra variedad.", pendiente:false },
  { id:"quitamanchas", n:"Vanish Oxi Action Quitamanchas", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"pastillas_de_lavavajillas", n:"Finish Powerball Power All in 1, 80 pastillas", rev:4, cat:"Limpieza", cajon:"amazon", pendiente:false },
  { id:"abrillantador_de_lavavajillas", n:"Somat Abrillantador Secado Extra", rev:4, cat:"Limpieza", cajon:"amazon", pendiente:false },
  { id:"sal_de_lavavajillas", n:"Somat Sal Especial Lavavajillas", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", nota:"Solo si no usas pastillas todo en uno", pendiente:false },
  { id:"lavavajillas_a_mano", n:"Mical Lavavajillas Concentrado Aloe Vera, 500 ml", rev:5, cat:"Limpieza", cajon:"amazon", nota:"Etiqueta de AmazonFresh, 23-sep-2026. 0,92 € (1,84 €/l), 4,0 estrellas. Marca blanca. ARREGLADO: esta ficha tenía puesto el Finish All in 1 Max Power Gel, que es de MÁQUINA, así que no había lavavajillas a mano en el catálogo.", pendiente:false },
  { id:"limpia_tuberias", n:"WC Net Limpia Tuberías con carbón activo", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Para los malos olores del desagüe", pendiente:false },
  { id:"cesta_wc", n:"Bref Power Activ Cesta WC (duo pack)", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Los compras en Natura Pine y en Limón", pendiente:false },
  { id:"limpiador_multiusos", n:"Skip Ultimate Limpieza Profunda, detergente líquido", rev:5, cat:"Limpieza", cajon:"amazon", oculta:true, nota:"RETIRADA el 23-sep-2026. Carlos confirma que el detergente de ropa es el Ariel en cápsulas: el Skip líquido no lo compra. Y el hueco de multiusos lo cubre el Don Limpio Friegasuelos, cuya botella pone MULTIUSOS.", pendiente:false },
  { id:"limpiacristales", n:"Cristasol Limpiacristales", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"limpiador_de_bano_y_antical", n:"Don Limpio Detergente Líquido de Baño, 1,5 L", rev:5, cat:"Limpieza", cajon:"amazon", nota:"CONFIRMADO por Carlos el 23-sep-2026: Amazon marca que lo compró en mayo de 2026. 3,70 € (2,47 €/l), 4,6 estrellas.", pendiente:false },
  { id:"lejia", n:"Bosque Verde Lejía (Mercadona)", rev:4, cat:"Limpieza", cajon:"super", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Bosque Verde es la marca de limpieza de Mercadona, donde ya compras el gel de baño.", nota:"Pesa y es barata: de las cosas que no compensa traer de Amazon", pendiente:false },
  { id:"friegasuelos", n:"Don Limpio Detergente Friegasuelos Superficies Delicadas, 1,5 L", rev:5, cat:"Limpieza", cajon:"amazon", nota:"Etiqueta de AmazonFresh, 23-sep-2026. 3,70 € (2,47 €/l), 4,5 estrellas. La botella pone MULTIUSOS: vale de friegasuelos y de limpiador general, así que cubre los dos usos. PASA DE SÚPER A AMAZON: la nota vieja decía que iba al súper por ser garrafa pesada y barata, y en AmazonFresh está a 3,70 €.", pendiente:false },
  { id:"bolsas_de_basura_grandes", n:"Albal Bolsas de basura grandes", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"bolsas_de_basura_pequenas", n:"Albal Bolsas de basura pequeñas", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"bayetas", n:"Vileda Bayetas multiuso", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"estropajos", n:"Scotch-Brite Estropajos con esponja", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"guantes_de_fregar", n:"Vileda Guantes de fregar", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"ambientador", n:"AMBAR Zen Fortaleza Ámbar & Cedro, ambientador mikado", rev:5, cat:"Limpieza", cajon:"super", nota:"SE COMPRA EN PRIMAPRIX, 23-sep-2026. Si no hay, está en Amazon pero NO en Fresh: sería otro pedido, así que va a la lista de Súper y no a la de Amazon. Aromas: cardamomo, iris, pino y pachulí. Incluye flor decorativa.", pendiente:false },
  { id:"gel_wc_desinfectante", n:"Sanicentro Gel WC Desinfectante Frescor", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Ficha creada el 23-sep-2026: este producto estaba metido en la casilla del AMBIENTADOR, donde no pintaba nada. Es el tercer producto de váter, junto al Bref de cesta y el WC Net de tuberías.", pendiente:false },
  /* ---------- MENAJE DE COCINA ---------- */
  { id:"papel_de_aluminio", n:"by Amazon Papel de aluminio, 30 m × 30 cm", rev:4, cat:"Menaje", cajon:"amazon", pendiente:false },
  { id:"cinta_adhesiva", n:"Scotch Cinta Adhesiva Transparente, 8 rollos", rev:3, cat:"Menaje", cajon:"amazon", pendiente:false },
  { id:"film_transparente", n:"Albal Film transparente", rev:4, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"papel_de_horno", n:"Albal Papel de horno", rev:4, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"papel_para_freidora_de_aire", n:"by Amazon Papel para freidora de aire", rev:4, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", nota:"Los redondos con agujeros, del tamaño de tu cesta", pendiente:false },
  { id:"papel_de_cocina", n:"Scottex Megarollo Papel de cocina, 3 rollos", rev:4, cat:"Menaje", cajon:"amazon", pendiente:false },
  { id:"bolsas_de_congelacion", n:"Albal Bolsas de congelación", rev:4, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"bolsas_de_cierre_zip", n:"Albal Bolsas con cierre zip", rev:4, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"servilletas_de_papel", n:"Colhogar Servilletas de papel", rev:4, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  /* ---------- ASEO ---------- */
  { id:"gel_de_ducha", n:"Deliplus Gel de Ba\u00f1o \u00c1mbar y Vetiver, botella 750 ml (Mercadona)", rev:4, cat:"Aseo", cajon:"super", pendiente:false },
  { id:"champu", n:"Dove Men +Care Champú Fortificante", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026 SIN base: si usas otra por un motivo concreto, cámbiala. Aquí equivocarse cuesta dinero.", pendiente:false },
  { id:"acondicionador", n:"Dove Men +Care Acondicionador Fortificante", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026 SIN base: si usas otra por un motivo concreto, cámbiala. Aquí equivocarse cuesta dinero.", pendiente:false },
  { id:"desodorante", n:"Dove Men +Care Clean Comfort aerosol 72 h", rev:4, cat:"Aseo", cajon:"amazon", nota:"También compras el Rexona Men Advanced Protection 72 h", pendiente:false },
  { id:"dentifrico", n:"Fluocaril Bi-Fluoré 250 mg pasta dentífrica menta", rev:4, cat:"Aseo", cajon:"amazon", pendiente:false },
  { id:"cepillo_de_dientes", n:"Oral-B Pro-Expert Cepillo Manual, dureza media", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", nota:"Si es eléctrico, aquí van los recambios", pendiente:false },
  { id:"cepillos_interdentales_o_seda_", n:"TePe Cepillos Interdentales, surtido de tallas", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026. El surtido evita acertar la talla a ciegas: pruebas y te quedas con la tuya.", pendiente:false },
  { id:"enjuague_bucal", n:"Fluocaril Colutorio Bi-Fluoré Menta, 2 × 500 ml", rev:4, cat:"Aseo", cajon:"amazon", pendiente:false },
  { id:"cuchillas_de_afeitar", n:"Gillette Mach3 Recambios", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"espuma_o_gel_de_afeitar", n:"Gillette Series Gel de Afeitar, piel sensible", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"crema_hidratante_corporal", n:"Bepanthol Pomada Protectora, 30 g", rev:4, cat:"Aseo", cajon:"amazon", nota:"Para rozaduras y grietas", pendiente:false },
  { id:"salvaslip", n:"Evax Salvaslip Maxi Protegeslip, 40 unidades", rev:3, cat:"Aseo", cajon:"amazon", pendiente:false },
  { id:"tampones", n:"Tampax Pearl Regular con aplicador, 24 unidades", rev:3, cat:"Aseo", cajon:"amazon", pendiente:false },
  { id:"cera_pelo", n:"Got2b Cera fijadora Beach Matt", rev:3, cat:"Aseo", cajon:"amazon", pendiente:false },
  { id:"limpieza_ortodoncia", n:"Corega Ortodoncias y Férulas, 36 tabletas limpiadoras", rev:3, cat:"Aseo", cajon:"amazon", pendiente:false },
  { id:"papel_higienico", n:"Scottex Megarollo Papel Higiénico Seco, 16 rollos", rev:5, cat:"Aseo", cajon:"amazon", nota:"El de 16 rollos equivale a 32 normales", pendiente:false },
  { id:"panuelos_de_papel", n:"Kleenex Original Pañuelos de papel", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"bastoncillos", n:"by Amazon Bastoncillos de algodón", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"jabon_de_manos", n:"Sanex Dermo Protector Jabón de Manos", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", pendiente:false },
  { id:"protector_solar", n:"ISDIN Fotoprotector Fusion Fluid SPF 50+", rev:4, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026 SIN base: si usas otra por un motivo concreto, cámbiala. Aquí equivocarse cuesta dinero.", nota:"De temporada: para las rutas", pendiente:false },
  /* ---------- MASCOTA ---------- */
  { id:"pienso_del_gato", n:"Pienso del gato", rev:5, cat:"Mascota", cajon:"amazon", oculta:true, nota:"Retirado: el gato solo come lata", pendiente:false },
  { id:"arena_del_gato", n:"Vitakraft Magic Clean Classic, arena no aglomerante, 4,2 kg", rev:4, cat:"Mascota", cajon:"suscripcion", nota:"Suscripción de Amazon: 4 bolsas cada 6 semanas", pendiente:false },
  { id:"comida_humeda_del_gato", n:"Purina Gourmet Gold Mousse, caja 96 × 85 g", rev:4, cat:"Mascota", cajon:"suscripcion", nota:"Suscripción de Amazon: 1 caja cada 6 semanas", pendiente:false },
  { id:"snacks_del_gato", n:"Snacks del gato", rev:4, cat:"Mascota", cajon:"amazon", oculta:true, nota:"Retirado: no los toma", pendiente:false },
  { id:"bolsas_para_recoger_la_arena", n:"Biokat's bolsas XXL de polietileno para la bandeja", rev:4, cat:"Mascota", cajon:"suscripcion", nota:"Suscripción de Amazon: 1 paquete cada 6 semanas", pendiente:false },
  { id:"antiparasitario", n:"Antiparasitario", rev:4, cat:"Mascota", cajon:"amazon", oculta:true, nota:"Retirado: no lo usa", pendiente:false }
];
