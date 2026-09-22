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
  { id:"detergente_de_lavadora", n:"Detergente de lavadora", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true, nota:"Líquido o en cápsulas, como lo compres" },
  { id:"suavizante", n:"Suavizante", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"quitamanchas", n:"Quitamanchas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"pastillas_de_lavavajillas", n:"Pastillas de lavavajillas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true, nota:"Las de todo en uno ahorran el abrillantador y la sal" },
  { id:"abrillantador_de_lavavajillas", n:"Abrillantador de lavavajillas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true, nota:"Solo si no usas pastillas todo en uno" },
  { id:"sal_de_lavavajillas", n:"Sal de lavavajillas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true, nota:"Solo si no usas pastillas todo en uno" },
  { id:"lavavajillas_a_mano", n:"Lavavajillas a mano", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"limpiador_multiusos", n:"Limpiador multiusos", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"limpiacristales", n:"Limpiacristales", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"limpiador_de_bano_y_antical", n:"Limpiador de baño y antical", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"lejia", n:"Lejía", rev:1, cat:"Limpieza", cajon:"super", pendiente:true, nota:"Pesa y es barata: de las cosas que no compensa traer de Amazon" },
  { id:"friegasuelos", n:"Friegasuelos", rev:1, cat:"Limpieza", cajon:"super", pendiente:true, nota:"Lo mismo: garrafa pesada y barata" },
  { id:"bolsas_de_basura_grandes", n:"Bolsas de basura grandes", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"bolsas_de_basura_pequenas", n:"Bolsas de basura pequeñas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"bayetas", n:"Bayetas", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"estropajos", n:"Estropajos", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"guantes_de_fregar", n:"Guantes de fregar", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  { id:"ambientador", n:"Ambientador", rev:1, cat:"Limpieza", cajon:"amazon", pendiente:true },
  /* ---------- MENAJE DE COCINA ---------- */
  { id:"papel_de_aluminio", n:"Papel de aluminio", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"film_transparente", n:"Film transparente", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"papel_de_horno", n:"Papel de horno", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"papel_para_freidora_de_aire", n:"Papel para freidora de aire", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true, nota:"Los redondos con agujeros, del tamaño de tu cesta" },
  { id:"papel_de_cocina", n:"Papel de cocina", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"bolsas_de_congelacion", n:"Bolsas de congelación", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"bolsas_de_cierre_zip", n:"Bolsas de cierre zip", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  { id:"servilletas_de_papel", n:"Servilletas de papel", rev:1, cat:"Menaje", cajon:"amazon", pendiente:true },
  /* ---------- ASEO ---------- */
  { id:"gel_de_ducha", n:"Gel de ducha", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"champu", n:"Champú", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"acondicionador", n:"Acondicionador", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"desodorante", n:"Desodorante", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"dentifrico", n:"Dentífrico", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"cepillo_de_dientes", n:"Cepillo de dientes", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true, nota:"Si es eléctrico, aquí van los recambios" },
  { id:"cepillos_interdentales_o_seda_", n:"Cepillos interdentales o seda dental", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"enjuague_bucal", n:"Enjuague bucal", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"cuchillas_de_afeitar", n:"Cuchillas de afeitar", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"espuma_o_gel_de_afeitar", n:"Espuma o gel de afeitar", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"crema_hidratante_corporal", n:"Crema hidratante corporal", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"papel_higienico", n:"Papel higiénico", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true, nota:"De los que compensa comprar en paquete grande" },
  { id:"panuelos_de_papel", n:"Pañuelos de papel", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"bastoncillos", n:"Bastoncillos", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"jabon_de_manos", n:"Jabón de manos", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true },
  { id:"protector_solar", n:"Protector solar", rev:1, cat:"Aseo", cajon:"amazon", pendiente:true, nota:"De temporada: para las rutas" },
  /* ---------- MASCOTA ---------- */
  { id:"pienso_del_gato", n:"Pienso del gato", rev:1, cat:"Mascota", cajon:"suscripcion", pendiente:true, nota:"En suscripción, cada 6 meses" },
  { id:"arena_del_gato", n:"Arena del gato", rev:1, cat:"Mascota", cajon:"suscripcion", pendiente:true, nota:"En suscripción, cada 6 meses" },
  { id:"comida_humeda_del_gato", n:"Comida húmeda del gato", rev:1, cat:"Mascota", cajon:"amazon", pendiente:true },
  { id:"snacks_del_gato", n:"Snacks del gato", rev:1, cat:"Mascota", cajon:"amazon", pendiente:true },
  { id:"bolsas_para_recoger_la_arena", n:"Bolsas para recoger la arena", rev:1, cat:"Mascota", cajon:"amazon", pendiente:true },
  { id:"antiparasitario", n:"Antiparasitario", rev:1, cat:"Mascota", cajon:"amazon", pendiente:true }
];
