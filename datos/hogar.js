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
  { id:"detergente_de_lavadora", n:"Ariel Todo En 1 PODS Original, formato ahorro 140 cápsulas", rev:3, cat:"Limpieza", cajon:"amazon" },
  { id:"suavizante", n:"Flor Suavizante Concentrado aroma Nenuco, hipoalergénico, 78 dosis, 1,4 L", rev:4, cat:"Limpieza", cajon:"amazon", nota:"CONFIRMADO por Carlos el 23-sep-2026: Amazon marca que lo compró en marzo de 2025. 4,88 € (3,48 €/l), 4,3 estrellas. Antes estaba apuntado como «Flor Azul», que es otra variedad." },
  { id:"quitamanchas", n:"Vanish Oxi Action Quitamanchas", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"pastillas_de_lavavajillas", n:"Finish Powerball Power All in 1, 80 pastillas", rev:3, cat:"Limpieza", cajon:"amazon" },
  { id:"abrillantador_de_lavavajillas", n:"Somat Abrillantador Secado Extra", rev:3, cat:"Limpieza", cajon:"amazon" },
  { id:"sal_de_lavavajillas", n:"Somat Sal Especial Lavavajillas", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", nota:"Solo si no usas pastillas todo en uno" },
  { id:"lavavajillas_a_mano", n:"Mical Lavavajillas Concentrado Aloe Vera, 500 ml", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Etiqueta de AmazonFresh, 23-sep-2026. 0,92 € (1,84 €/l), 4,0 estrellas. Marca blanca. ARREGLADO: esta ficha tenía puesto el Finish All in 1 Max Power Gel, que es de MÁQUINA, así que no había lavavajillas a mano en el catálogo." },
  { id:"limpia_tuberias", n:"WC Net Limpia Tuberías con carbón activo", rev:2, cat:"Limpieza", cajon:"amazon", nota:"Para los malos olores del desagüe" },
  { id:"cesta_wc", n:"Bref Power Activ Cesta WC (duo pack)", rev:2, cat:"Limpieza", cajon:"amazon", nota:"Los compras en Natura Pine y en Limón" },
  { id:"limpiador_multiusos", n:"Skip Ultimate Limpieza Profunda, detergente líquido", rev:4, cat:"Limpieza", cajon:"amazon", oculta:true, nota:"RETIRADA el 23-sep-2026. Carlos confirma que el detergente de ropa es el Ariel en cápsulas: el Skip líquido no lo compra. Y el hueco de multiusos lo cubre el Don Limpio Friegasuelos, cuya botella pone MULTIUSOS." },
  { id:"limpiacristales", n:"Cristasol Limpiacristales", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"limpiador_de_bano_y_antical", n:"Don Limpio Detergente Líquido de Baño, 1,5 L", rev:4, cat:"Limpieza", cajon:"amazon", nota:"CONFIRMADO por Carlos el 23-sep-2026: Amazon marca que lo compró en mayo de 2026. 3,70 € (2,47 €/l), 4,6 estrellas." },
  { id:"lejia", n:"Bosque Verde Lejía (Mercadona)", rev:3, cat:"Limpieza", cajon:"super", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Bosque Verde es la marca de limpieza de Mercadona, donde ya compras el gel de baño.", nota:"Pesa y es barata: de las cosas que no compensa traer de Amazon" },
  { id:"friegasuelos", n:"Don Limpio Detergente Friegasuelos Superficies Delicadas, 1,5 L", rev:4, cat:"Limpieza", cajon:"amazon", nota:"Etiqueta de AmazonFresh, 23-sep-2026. 3,70 € (2,47 €/l), 4,5 estrellas. La botella pone MULTIUSOS: vale de friegasuelos y de limpiador general, así que cubre los dos usos. PASA DE SÚPER A AMAZON: la nota vieja decía que iba al súper por ser garrafa pesada y barata, y en AmazonFresh está a 3,70 €." },
  { id:"bolsas_de_basura_grandes", n:"Albal Bolsas de basura grandes", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"bolsas_de_basura_pequenas", n:"Albal Bolsas de basura pequeñas", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"bayetas", n:"Vileda Bayetas multiuso", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"estropajos", n:"Scotch-Brite Estropajos con esponja", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"guantes_de_fregar", n:"Vileda Guantes de fregar", rev:3, cat:"Limpieza", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"ambientador", n:"AMBAR Zen Fortaleza Ámbar & Cedro, ambientador mikado", rev:4, cat:"Limpieza", cajon:"super", nota:"SE COMPRA EN PRIMAPRIX, 23-sep-2026. Si no hay, está en Amazon pero NO en Fresh: sería otro pedido, así que va a la lista de Súper y no a la de Amazon. Aromas: cardamomo, iris, pino y pachulí. Incluye flor decorativa." },
  { id:"gel_wc_desinfectante", n:"Sanicentro Gel WC Desinfectante Frescor", rev:2, cat:"Limpieza", cajon:"amazon", nota:"Ficha creada el 23-sep-2026: este producto estaba metido en la casilla del AMBIENTADOR, donde no pintaba nada. Es el tercer producto de váter, junto al Bref de cesta y el WC Net de tuberías." },
  /* ---------- MENAJE DE COCINA ---------- */
  { id:"papel_de_aluminio", n:"by Amazon Papel de aluminio, 30 m × 30 cm", rev:3, cat:"Menaje", cajon:"amazon" },
  { id:"cinta_adhesiva", n:"Scotch Cinta Adhesiva Transparente, 8 rollos", rev:2, cat:"Menaje", cajon:"amazon" },
  { id:"film_transparente", n:"Albal Film transparente", rev:3, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"papel_de_horno", n:"Albal Papel de horno", rev:3, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"papel_para_freidora_de_aire", n:"by Amazon Papel para freidora de aire", rev:3, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", nota:"Los redondos con agujeros, del tamaño de tu cesta" },
  { id:"papel_de_cocina", n:"Scottex Megarollo Papel de cocina, 3 rollos", rev:3, cat:"Menaje", cajon:"amazon" },
  { id:"bolsas_de_congelacion", n:"Albal Bolsas de congelación", rev:3, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"bolsas_de_cierre_zip", n:"Albal Bolsas con cierre zip", rev:3, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"servilletas_de_papel", n:"Colhogar Servilletas de papel", rev:3, cat:"Menaje", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  /* ---------- ASEO ---------- */
  { id:"gel_de_ducha", n:"Deliplus Gel de Ba\u00f1o \u00c1mbar y Vetiver, botella 750 ml (Mercadona)", rev:3, cat:"Aseo", cajon:"super" },
  { id:"champu", n:"Dove Men +Care Champú Fortificante", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026 SIN base: si usas otra por un motivo concreto, cámbiala. Aquí equivocarse cuesta dinero." },
  { id:"acondicionador", n:"Dove Men +Care Acondicionador Fortificante", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026 SIN base: si usas otra por un motivo concreto, cámbiala. Aquí equivocarse cuesta dinero." },
  { id:"desodorante", n:"Dove Men +Care Clean Comfort aerosol 72 h", rev:3, cat:"Aseo", cajon:"amazon", nota:"También compras el Rexona Men Advanced Protection 72 h" },
  { id:"dentifrico", n:"Fluocaril Bi-Fluoré 250 mg pasta dentífrica menta", rev:3, cat:"Aseo", cajon:"amazon" },
  { id:"cepillo_de_dientes", n:"Oral-B Pro-Expert Cepillo Manual, dureza media", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir.", nota:"Si es eléctrico, aquí van los recambios" },
  { id:"cepillos_interdentales_o_seda_", n:"TePe Cepillos Interdentales, surtido de tallas", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026. El surtido evita acertar la talla a ciegas: pruebas y te quedas con la tuya." },
  { id:"enjuague_bucal", n:"Fluocaril Colutorio Bi-Fluoré Menta, 2 × 500 ml", rev:3, cat:"Aseo", cajon:"amazon" },
  { id:"cuchillas_de_afeitar", n:"Gillette Mach3 Recambios", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"espuma_o_gel_de_afeitar", n:"Gillette Series Gel de Afeitar, piel sensible", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"crema_hidratante_corporal", n:"Bepanthol Pomada Protectora, 30 g", rev:3, cat:"Aseo", cajon:"amazon", nota:"Para rozaduras y grietas" },
  { id:"salvaslip", n:"Evax Salvaslip Maxi Protegeslip, 40 unidades", rev:2, cat:"Aseo", cajon:"amazon" },
  { id:"tampones", n:"Tampax Pearl Regular con aplicador, 24 unidades", rev:2, cat:"Aseo", cajon:"amazon" },
  { id:"cera_pelo", n:"Got2b Cera fijadora Beach Matt", rev:2, cat:"Aseo", cajon:"amazon" },
  { id:"limpieza_ortodoncia", n:"Corega Ortodoncias y Férulas, 36 tabletas limpiadoras", rev:2, cat:"Aseo", cajon:"amazon" },
  { id:"papel_higienico", n:"Scottex Megarollo Papel Higiénico Seco, 16 rollos", rev:4, cat:"Aseo", cajon:"amazon", nota:"El de 16 rollos equivale a 32 normales" },
  { id:"panuelos_de_papel", n:"Kleenex Original Pañuelos de papel", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"bastoncillos", n:"by Amazon Bastoncillos de algodón", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"jabon_de_manos", n:"Sanex Dermo Protector Jabón de Manos", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026, pendiente de confirmar. Sin formato concreto: el tamaño se elige al pedir." },
  { id:"protector_solar", n:"ISDIN Fotoprotector Fusion Fluid SPF 50+", rev:3, cat:"Aseo", cajon:"amazon", nota:"Marca propuesta el 23-sep-2026 SIN base: si usas otra por un motivo concreto, cámbiala. Aquí equivocarse cuesta dinero.", nota:"De temporada: para las rutas" },
  /* ---------- MASCOTA ---------- */
  { id:"pienso_del_gato", n:"Pienso del gato", rev:4, cat:"Mascota", cajon:"amazon", oculta:true, nota:"Retirado: el gato solo come lata" },
  { id:"arena_del_gato", n:"Vitakraft Magic Clean Classic, arena no aglomerante, 4,2 kg", rev:3, cat:"Mascota", cajon:"suscripcion", nota:"Suscripción de Amazon: 4 bolsas cada 6 semanas" },
  { id:"comida_humeda_del_gato", n:"Purina Gourmet Gold Mousse, caja 96 × 85 g", rev:3, cat:"Mascota", cajon:"suscripcion", nota:"Suscripción de Amazon: 1 caja cada 6 semanas" },
  { id:"snacks_del_gato", n:"Snacks del gato", rev:3, cat:"Mascota", cajon:"amazon", oculta:true, nota:"Retirado: no los toma" },
  { id:"bolsas_para_recoger_la_arena", n:"Biokat's bolsas XXL de polietileno para la bandeja", rev:3, cat:"Mascota", cajon:"suscripcion", nota:"Suscripción de Amazon: 1 paquete cada 6 semanas" },
  { id:"antiparasitario", n:"Antiparasitario", rev:3, cat:"Mascota", cajon:"amazon", oculta:true, nota:"Retirado: no lo usa" }
];
