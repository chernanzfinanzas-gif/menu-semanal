/* almacen.js — estado de la aplicación, cálculos y persistencia local */
(function (global) {

  /* Qué venía del catálogo grande, apuntado antes de mezclar `datos/nuevos.js`.
     Sirve para saber qué es tuyo y qué es mío sin tener que marcarlo a mano. */
  var SEMILLA_BASE = null;

  /* COMPARAR DOS FICHAS SIN QUE EL ORDEN DE LOS CAMPOS MIENTA.
     El 22-sep-2026 la primera subida se llevó 34 ingredientes y 36 recetas que
     no habían cambiado en nada: se comparó el texto tal cual, y {n, sal} no es
     la misma cadena que {sal, n} aunque digan lo mismo. Aquí se ordenan las
     claves antes de comparar, y se ignora `tocado`, que es la hora y no el dato. */
  function canon(x) {
    if (x === null || typeof x !== "object") return JSON.stringify(x === undefined ? null : x);
    if (Array.isArray(x)) return "[" + x.map(canon).join(",") + "]";
    var ks = Object.keys(x).sort(), partes = [];
    for (var i = 0; i < ks.length; i++) {
      if (ks[i] === "tocado") continue;
      if (x[ks[i]] === undefined) continue;
      partes.push(JSON.stringify(ks[i]) + ":" + canon(x[ks[i]]));
    }
    return "{" + partes.join(",") + "}";
  }

  "use strict";

  var CLAVE = "asistente-alimentacion-v1";

  var Almacen = {
    estado: null,
    suscriptores: [],

    /* ---------- arranque ---------- */
    iniciar: function () {
      var guardado = null;
      try { guardado = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { guardado = null; }
      this.estado = guardado && guardado.v ? guardado : this.estadoInicial();
      this.reparar();
      /* Si el arranque ha congelado días, se escribe ya: si no, a la próxima
         recarga se volvería a congelar contra unas recetas que quizá hayan
         cambiado entretanto, que es justo lo que esto viene a evitar. */
      if (this._fotosNuevas) { try { localStorage.setItem(CLAVE, JSON.stringify(this.estado)); } catch (e) {} }
      this._reiniciarFotoDias();   /* punto de partida: nada ha cambiado todavía */
      return this.estado;
    },

    estadoInicial: function () {
      return {
        v: 1,
        config: {
          personas: 2,
          /* Topes de SAL (no de sodio: 1 g de sal = 0,4 g de sodio).
             Los fijó Carlos el 17-sep-2026: 4 g de sal al día como techo, que
             son 1.600 mg de sodio. El ámbar está mucho más abajo a propósito,
             porque su criterio es «reducir todo lo posible», no «llegar al tope». */
          limiteSal: 4.0,      // g de sal/día: por encima = rojo
          /* Subido de 2,0 a 3,5 el 21-sep-2026. Los dos son gramos de SAL, no de
             sodio: 3,5 g de sal son 1.400 mg de sodio, dentro de la horquilla
             de una pauta baja en sodio (1.500-2.000 mg) y bastante por debajo
             de los 5 g de sal que la OMS da para población general. El 2,0 de
             antes (800 mg de sodio) era más estricto que cualquier recomendación
             publicada y dejaba el menú en rojo casi todos los días por décimas,
             que es la forma más rápida de que un aviso deje de mirarse. */
          avisoSal: 3.5,       // g de sal/día: por encima = ámbar
          objetivoKcal: 2000,  // kcal/día
          objetivoProt: 90,    // g de proteína/día
          margenKcal: 10,      // % de holgura antes de marcar el día en rojo
          pctGrasa: 30,        // % de las calorías del día que van en grasa

          /* Cuánto de lo PREVISTO por el plan se adelanta antes de hacerlo.
             ENTERO, y no a medias, porque la previsión está para preparar la
             comida: si sólo contara la mitad no serviría para lo que es. Lo que
             evita que se regale un déficit no es descontarla, es que CADUCA —en
             un día ya pasado, una previsión que nunca llegó no cuenta— y que la
             SUSTITUYE la medida real en cuanto entra de intervals. */
          previsionEjercicio: 1,
          /* Cuánto de lo que quemas entrenando sube al objetivo del día.
             No es 100% a propósito, y conviene saber por qué:
             (a) las tablas de MET estiman por encima de lo que mide un reloj,
             (b) devolver el 100% borra el déficit justo los días que más entrenas.
             El 70% es el valor que se usa habitualmente. Se cambia en Ajustes. */
          devolucionEjercicio: 0.70,

          /* Entreno previsto de un día normal. Se pone solo al rellenar la semana
             y se edita día a día: es una previsión, no un compromiso. Los días de
             ruta no lo llevan (ya tienen su salida). */
          entrenoEstandar: [
            { a: "bici_moderada",  min: 90 },
            { a: "musculacion",    min: 30 },
            { a: "caminar_ligero", min: 60 }
          ],

          /* Tomas con regla propia. El almuerzo y la merienda son solo suyos —su pareja
             no los hace— y además solo se los toma los días que entrena; un día de
             descanso van a cero y no se planifican ni entran en la compra. */
          tomasEspeciales: {
            almuerzo: { comensales: 1, soloSiEntreno: true },
            merienda: { comensales: 1, soloSiEntreno: true }
          },

          /* Lo que va TODOS LOS DÍAS en comida y cena, sin tener que ponerlo. No son
             parte de la plantilla: son suyos y van igual el día que improvisa. La app
             los pone sola al rellenar o al completar el día. */
          fijos: [
            { r: "postre_yogur_avena", tomas: ["comida", "cena"] },
            { r: "pan_tostado_mesa",   tomas: ["comida", "cena"] }
          ],

          /* Cómo se reparte el objetivo del día entre las cinco tomas. Es el reparto
             español de toda la vida, y solo lo usa el botón de completar para saber
             qué tamaño de plato buscar en cada hueco. */
          repartoTomas: { desayuno: 0.22, almuerzo: 0.10, comida: 0.33, merienda: 0.10, cena: 0.25 },

          /* Lo que se ESTIMA cuando marcas una toma como «fuera de casa». Son números
             inventados a partir de lo que suele llevar un menú del día, no medidas: lo
             importante es que el día no se quede cojo y que la sal de fuera se vea, que
             es donde de verdad se dispara (un menú del día ronda los 3-4 g él solo, casi
             el tope diario entero). Editables en Ajustes. */
          fueraEstimado: {
            desayuno: { k: 320, sal: 1.2, p: 10, g: 12, h: 42 },
            almuerzo: { k: 200, sal: 0.7, p: 5,  g: 9,  h: 24 },
            comida:   { k: 900, sal: 3.5, p: 40, g: 38, h: 95 },
            merienda: { k: 260, sal: 0.8, p: 7,  g: 11, h: 32 },
            cena:     { k: 800, sal: 3.0, p: 38, g: 34, h: 82 }
          },

          github: { usuario: "", repo: "", rama: "main", token: "" }
        },
        ingredientes: JSON.parse(JSON.stringify(global.DATOS_INGREDIENTES || [])),
        recetas: JSON.parse(JSON.stringify(global.DATOS_RECETAS || [])),
        plantillas: JSON.parse(JSON.stringify(global.DATOS_PLANTILLAS || [])),
        hogarLista: JSON.parse(JSON.stringify(global.DATOS_HOGAR || [])),
                               /* LIMPIEZA, MENAJE, ASEO Y MASCOTA. Catálogo aparte del de
                                  comida a propósito: no tiene calorías ni entra en una
                                  receta, y meterlo con los ingredientes obligaría a que
                                  cada cuenta del menú tuviera que saltarse estas líneas. */
        hogar: {},             /* { hogarId: { falta: true, c: 2 } } — lo que marcas que
                                  te falta. Es del día a día, no del catálogo. */
        quiero: {},            /* { ingId: { p: piezas, f: "YYYY-MM-DD" } } — lo que quieres
                                  ESTA vez. Entra en la próxima lista y al confirmar la
                                  compra se borra. No es un mínimo: no promete nada. */
        pedidoSello: null,     /* cuándo se tocó por última vez lo pedido a mano (hogar +
                                  quiero). Hace que borrar viaje entre aparatos. */
        perfil: {
          sexo: "h",           // "h" | "m"
          edad: null, altura: null, peso: null, pesoObjetivo: null,
          actividadBase: 1.2,  // factor sobre el metabolismo basal, sin contar el ejercicio que registres
          ritmo: 0.5           // kg por semana que quieres perder (0 = mantener)
        },
        pesos: [],             // [{f:"YYYY-MM-DD", kg:95}]  histórico
        actividades: JSON.parse(JSON.stringify(global.DATOS_ACTIVIDADES || [])),
        actividad: {},         // { "YYYY-MM-DD": [{a:"bici_suave", min:30}] }
        plan: {},              // { "YYYY-MM-DD": { desayuno:[], almuerzo:[], comida:[], merienda:[], cena:[] } }
        comido: {},            // { "YYYY-MM-DD": { comida:["receta_id", …] } }  lo que se comió de verdad
        comprado: {},          // igual, pero lo que ya está COMPRADO (no se vuelve a pedir)
        fotos: {},             // { "YYYY-MM-DD": { recetaId: {n,r,k,p,g,h,s} } }  la foto de lo comido
        corregido: {},         // { "YYYY-MM-DD": "YYYY-MM-DD" }  día pasado retocado a mano, y cuándo
        despensa: {},          // { ingredienteId: true }  -> ya lo tengo en casa
        stock: {},             /* { ingredienteId: { c: cantidad, f: "AAAA-MM-DD" } }
                                  LO QUE HAY EN CASA, en la unidad del ingrediente, con la
                                  fecha en que se confirmó a mano. Sustituye al sí/no de
                                  `despensa`, que no servía para saber si llegaba. */
        stockSitios: {},       /* { sitio: "AAAA-MM-DD" } — cuándo se contó cada sitio
                                  de la casa por última vez. Cada uno va por su cuenta:
                                  la nevera se repasa cada semana y el armario, no. */
        gastado: {},           /* { fecha: { toma: { recetaId: { ingId: cantidad } } } }
                                  LO QUE SE DESCONTÓ DE LA DESPENSA al marcar ese plato
                                  como comido. Se guarda por una razón concreta: quitar
                                  el ✓ tiene que devolver EXACTAMENTE lo que se quitó, y
                                  recalcularlo no vale porque el descuento se queda en
                                  cero cuando la cuenta iba corta. Sin esto, desmarcar
                                  inventaría comida que nunca hubo. */
        real: {},              /* { fecha: { toma: { recetaId: {c, u} } } }
                                  LO QUE COMISTE DE VERDAD, cuando no fue lo previsto.
                                  Vive en el día, nunca en la receta ni en el plan: que
                                  hoy el plátano pesara 104 g no puede cambiar el
                                  plátano de mañana ni la ficha del plátano. */
        compraMarcada: {},     /* { ingredienteId: true } -> PEDIDO (tachado en la lista).
                                  Tachar es pedir, no recibir: lo que entra en casa entra
                                  al confirmar la llegada. */
        recados: {},           /* { id: { c, f, tipo } } — lo que falló y hay que buscar
                                  en otro sitio. Se queda aquí hasta que se resuelva. */
        favoritos: [],
        sync: { sha: null, ultima: null }
      };
    },

    reparar: function () {
      /* ---------- TUS NOVEDADES ----------
         `datos/nuevos.js` trae lo que has creado o corregido tú desde la app y
         que la app subió al repositorio. Se mezcla con la semilla ANTES de nada,
         así que entra por el mismo camino que todo lo demás: alta por id y
         sustitución por `rev`. Antes de mezclar se apunta qué venía del catálogo
         grande, y eso es lo que luego distingue lo tuyo de lo mío. */
      if (!SEMILLA_BASE) {
        SEMILLA_BASE = { ing: {}, rec: {} };
        SEMILLA_BASE.ingObj = {}; SEMILLA_BASE.recObj = {};
        /* Copia intacta del catalogo publicado. Tres lineas mas abajo, las copias
           guardadas del movil se escriben ENCIMA de DATOS_INGREDIENTES, asi que a
           partir de ahi el catalogo bueno ya no existe en memoria: esta solo aqui.
           Sin esto, comparar «tu copia» con «el catalogo» era comparar una cosa
           consigo misma, y por eso el trabajo de marcas no llegaba a la pantalla. */
        (global.DATOS_INGREDIENTES || []).forEach(function (x) {
          SEMILLA_BASE.ing[x.id] = canon(x);
          SEMILLA_BASE.ingObj[x.id] = JSON.parse(JSON.stringify(x));
        });
        (global.DATOS_RECETAS || []).forEach(function (x) {
          SEMILLA_BASE.rec[x.id] = canon(x);
          SEMILLA_BASE.recObj[x.id] = JSON.parse(JSON.stringify(x));
        });
        var nv = global.DATOS_NUEVOS || {};
        [["ingredientes", "DATOS_INGREDIENTES"], ["recetas", "DATOS_RECETAS"]].forEach(function (par) {
          var lista = global[par[1]] || (global[par[1]] = []);
          var pos = {};
          lista.forEach(function (x, i) { pos[x.id] = i; });
          (nv[par[0]] || []).forEach(function (x) {
            if (!x || !x.id) return;
            if (pos[x.id] == null) { lista.push(x); return; }
            /* SE COMPLETA, NO SE SUSTITUYE. (25-sep-2026.) Antes la ficha de
               `nuevos.js` pisaba entera a la del catálogo, así que una ficha
               añadida sobre la marcha se quedaba congelada en la forma que
               tenía ese día: cualquier campo posterior del catálogo —`sitio`,
               `formato`— desaparecía sin dejar rastro. Se notó porque el
               solomillo y los taquitos de chorizo no salían en el estante de
               Carne y parecía un fallo del estante.
               Manda el catálogo, que es lo curado; de `nuevos` sólo se cogen
               los campos que el catálogo no tiene. */
            var base = lista[pos[x.id]];
            Object.keys(x).forEach(function (k) {
              if (base[k] === undefined || base[k] === null || base[k] === "") base[k] = x[k];
            });
          });
        });
      }

      var e = this.estado;
      if (!e.config) e.config = this.estadoInicial().config;
      if (!e.config.github) e.config.github = { usuario: "", repo: "", rama: "main", token: "" };
      if (!e.ingredientes || !e.ingredientes.length) e.ingredientes = JSON.parse(JSON.stringify(global.DATOS_INGREDIENTES || []));
      if (!e.recetas || !e.recetas.length) e.recetas = JSON.parse(JSON.stringify(global.DATOS_RECETAS || []));
      if (!e.plantillas || !e.plantillas.length) e.plantillas = JSON.parse(JSON.stringify(global.DATOS_PLANTILLAS || []));
      if (!e.plan) e.plan = {};
      if (!e.comido) e.comido = {};
      if (!e.selloDia) e.selloDia = {};
      if (!e.perfil) e.perfil = this.estadoInicial().perfil;
      if (!e.pesos) e.pesos = [];
      if (!e.actividad) e.actividad = {};
      if (!e.actividades || !e.actividades.length)
        e.actividades = JSON.parse(JSON.stringify(global.DATOS_ACTIVIDADES || []));

      /* Los datos guardados mandan sobre los que trae la app, así que cuando se añaden
         campos nuevos (kcal y macros, 17-sep-2026) hay que completarlos en lo ya guardado.
         Solo se rellena lo que falte: nunca se pisa un valor que hayas corregido tú. */
      var semilla = {};
      (global.DATOS_INGREDIENTES || []).forEach(function (s) { semilla[s.id] = s; });
      var completados = 0;
      e.ingredientes.forEach(function (ing) {
        var ref = semilla[ing.id];
        ["k", "p", "g", "h"].forEach(function (campo) {
          if (typeof ing[campo] !== "number") {
            ing[campo] = ref && typeof ref[campo] === "number" ? ref[campo] : 0;
            completados++;
          }
        });
        /* CAMPOS DE TEXTO NUEVOS, con la misma regla y por el mismo motivo.
           Esta lista existía sólo para los cuatro números de arriba, y eso
           convertía cualquier campo nuevo en papel mojado: se publicaba en el
           catálogo y no llegaba nunca a la copia guardada, así que la app
           seguía comportándose igual y parecía que el cambio no se había hecho.
           (24-sep-2026, al añadir `sitio`.)
           `sitio` = dónde vive en casa. Hasta hoy se deducía de la sección del
           supermercado, y por eso los seis pescados congelados estaban fichados
           en la nevera: su sección es Pescadería. Abrías el congelador en la
           app y no estaba el bacalao que tenías dentro. */
        /* LA LISTA TIENE QUE CRECER CON CADA CAMPO NUEVO, y olvidarlo cuesta
           caro: el 25-sep-2026 el solomillo y los taquitos de chorizo no
           aparecían en el estante de Carne y parecía un fallo del estante. Lo
           que pasaba es que esas dos fichas viven en `nuevos.js` —se añadieron
           sobre la marcha— y ahí no llegaban ni `sitio` ni `formato`, así que
           la app las trataba como si no tuvieran sitio.
           `formato` = en qué viene y cómo se cuenta (bolsa, tarro, ración…). */
        ["sitio", "formato", "producto", "suplente"].forEach(function (campo) {
          if (!ing[campo] && ref && ref[campo]) { ing[campo] = ref[campo]; completados++; }
        });
        /* Y los números del envase, que deciden cuánto es «una ración» o «media
           bolsa». Sólo si faltan o están a cero: un valor tuyo no se pisa. */
        ["envase", "racion", "pesoUd"].forEach(function (campo) {
          if (!(ing[campo] > 0) && ref && ref[campo] > 0) { ing[campo] = ref[campo]; completados++; }
        });
      });
      if (completados) {
        try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
        if (global.console) console.log("Nutrición completada en " + completados + " campos.");
      }
      /* Plantillas: igual que ingredientes y recetas. Sin esto, añadir el pan de
         mesa a las dos semanas no habría llegado nunca a las plantillas guardadas. */
      var plaSemilla = {};
      (global.DATOS_PLANTILLAS || []).forEach(function (x) { if (x.rev) plaSemilla[x.id] = x; });
      var plaRefrescadas = [];
      e.plantillas.forEach(function (pl, i) {
        var nueva = plaSemilla[pl.id];
        if (!nueva || pl.editado) return;
        if ((pl.rev || 1) >= nueva.rev) return;
        e.plantillas[i] = JSON.parse(JSON.stringify(nueva));
        plaRefrescadas.push(nueva.nombre);
      });
      if (plaRefrescadas.length) {
        try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
        if (global.console) console.log("Plantillas actualizadas: " + plaRefrescadas.join(", "));
      }

      /* ALTAS NUEVAS. El `rev` de más abajo solo sirve para CAMBIAR algo que ya
         está guardado; una receta o un ingrediente que no existían en el móvil no
         llegaban nunca, porque los datos guardados mandan sobre la semilla. Sin
         esto, las ocho recetas de mochila no habrían aparecido jamás en su app.
         Solo da de alta lo que falta por id: nunca pisa ni borra nada suyo. */
      var altas = [];
      [["ingredientes", global.DATOS_INGREDIENTES], ["recetas", global.DATOS_RECETAS],
       ["plantillas", global.DATOS_PLANTILLAS], ["actividades", global.DATOS_ACTIVIDADES],
       ["hogarLista", global.DATOS_HOGAR]
      ].forEach(function (par) {
        var clave = par[0], datos = par[1] || [];
        if (!e[clave]) return;
        var hay = {};
        e[clave].forEach(function (x) { hay[x.id] = true; });
        datos.forEach(function (x) {
          if (!x || !x.id || hay[x.id]) return;
          e[clave].push(JSON.parse(JSON.stringify(x)));
          altas.push(x.n || x.nombre || x.id);
        });
      });
      if (altas.length) {
        try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
        if (global.console) console.log("Altas nuevas (" + altas.length + "): " + altas.join(", "));
      }

      /* Ingredientes: igual que las recetas. Rellenar lo que falta no basta cuando
         un valor de la app cambia (la lubina pasó de salvaje a la de acuicultura que
         compra Carlos): hay que SUSTITUIR, y para eso está `rev`. Lo que él haya
         corregido en Despensa lleva `editado` y no se toca nunca. */
      var ingSemilla = {};
      var _catIng = (SEMILLA_BASE && SEMILLA_BASE.ingObj) || {};
      Object.keys(_catIng).forEach(function (k) { if (_catIng[k].rev) ingSemilla[k] = _catIng[k]; });
      var ingRefrescados = [];
      e.ingredientes.forEach(function (ing, i) {
        var nuevo = ingSemilla[ing.id];
        if (!nuevo || ing.editado) return;
        if ((ing.rev || 1) >= nuevo.rev) return;
        /* LO SUYO SOBREVIVE AL REFRESCO (25-sep-2026). Subir el `rev` de una
           ficha sustituye la ficha entera por la mía, así que arreglarle una
           caloría le borraba la forma de pedir que había elegido en el gestor.
           Esos tres campos no son míos: los decide él y no viajan en el
           catálogo. Se rescatan antes de sustituir. */
        var suyo = { pedir: ing.pedir, minimo: ing.minimo, lote: ing.lote };
        e.ingredientes[i] = JSON.parse(JSON.stringify(nuevo));
        Object.keys(suyo).forEach(function (k) {
          if (suyo[k] !== undefined && suyo[k] !== null) e.ingredientes[i][k] = suyo[k];
        });
        ingRefrescados.push(nuevo.n);
      });
      if (ingRefrescados.length) {
        try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
        if (global.console) console.log("Ingredientes actualizados: " + ingRefrescados.join(", "));
      }

      /* Recetas: lo mismo que arriba pero al revés. Cuando mejoro una receta de la
         app le subo el campo `rev`, y aquí sustituyo la copia guardada por la nueva.
         Nunca toco una receta con `editado`: esa es tuya y manda sobre la mía. */
      var recSemilla = {};
      var _catRec = (SEMILLA_BASE && SEMILLA_BASE.recObj) || {};
      Object.keys(_catRec).forEach(function (k) { if (_catRec[k].rev) recSemilla[k] = _catRec[k]; });
      var refrescadas = [];
      e.recetas.forEach(function (r, i) {
        var nueva = recSemilla[r.id];
        if (!nueva || r.editado) return;
        if ((r.rev || 1) >= nueva.rev) return;
        e.recetas[i] = JSON.parse(JSON.stringify(nueva));
        refrescadas.push(nueva.n);
      });
      if (refrescadas.length) {
        try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
        if (global.console) console.log("Recetas actualizadas: " + refrescadas.join(", "));
      }

      /* HOGAR: lo mismo que arriba, y FALTABA (23-sep-2026). Sin este bloque, un
         cambio en un artículo YA GUARDADO no llegaba jamás al móvil: por `altas`
         solo entran los ids nuevos, así que corregir una marca, cambiar un cajón o
         retirar un producto no servía de nada. Se vio porque el Ariel enseñaba
         «Ponle tu marca y formato» llevando marca y formato desde hacía días: lo que
         mandaba era la copia guardada, con el `pendiente` de meses atrás.
         Lo que esté editado a mano lleva `editado` y no se toca, igual que siempre. */
      var hogSemilla = {};
      (global.DATOS_HOGAR || []).forEach(function (x) { if (x.rev) hogSemilla[x.id] = x; });
      var hogRefrescados = [];
      (e.hogarLista || []).forEach(function (x, i) {
        var nuevo = hogSemilla[x.id];
        if (!nuevo || x.editado) return;
        if ((x.rev || 1) >= nuevo.rev) return;
        e.hogarLista[i] = JSON.parse(JSON.stringify(nuevo));
        hogRefrescados.push(nuevo.n);
      });
      if (hogRefrescados.length) {
        try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
        if (global.console) console.log("Hogar actualizado (" + hogRefrescados.length + "): " + hogRefrescados.join(", "));
      }

      /* ---------- LO QUE HAS CORREGIDO DESDE OTRO APARATO ----------
         Un ingrediente que ya tenías y que cambiaste en el móvil no puede entrar
         por `rev`: el `rev` es mío, de cuando mejoro el catálogo, y no sabe nada
         de tus correcciones. Entra por `tocado`, que es la hora a la que lo
         guardaste: gana el último que lo tocó, igual que todo lo demás en esta
         app. En el aparato donde lo escribiste la hora es la misma, así que ahí
         no se toca nada. */
      var nvz = global.DATOS_NUEVOS || {};
      var corregidos = [];
      var _catIng2 = { ingredientes: (SEMILLA_BASE && SEMILLA_BASE.ingObj) || {},
                       recetas:      (SEMILLA_BASE && SEMILLA_BASE.recObj) || {} };
      [["ingredientes", "ingredientes"], ["recetas", "recetas"]].forEach(function (par) {
        var porId = {};
        (nvz[par[0]] || []).forEach(function (x) { if (x && x.id && x.tocado) porId[x.id] = x; });
        (e[par[1]] || []).forEach(function (x, i) {
          var n = porId[x.id];
          if (!n) return;
          if (String(x.tocado || "") >= String(n.tocado)) return;
          /* Si el catalogo va por delante de esa copia, manda el catalogo (23-sep-2026).
             Una copia se marcaba como «tuya» solo por no coincidir —aunque no la
             hubieras tocado— y desde entonces ganaba siempre, por vieja que fuese.
             Lo que editas a mano lleva `editado` y no lo toca nadie, como siempre. */
          var s = _catIng2[par[1]][x.id];
          if (s && !x.editado && (s.rev || 0) > (n.rev || 0)) return;
          var copia = JSON.parse(JSON.stringify(n));
          /* NO SE PIERDE LO QUE EL CATÁLOGO SABE Y TU COPIA NO. (25-sep-2026.)
             Esto sustituía la ficha entera, así que una corrección hecha en el
             móvil hace semanas borraba cualquier campo añadido al catálogo
             después —`sitio`, `formato`, el envase—. Se vio con el solomillo y
             los taquitos de chorizo, que no aparecían en el estante de Carne.
             Tu corrección sigue mandando en lo que tocaste; lo que no trae, lo
             pone el catálogo. */
          if (s) Object.keys(s).forEach(function (k) {
            if (copia[k] === undefined || copia[k] === null || copia[k] === "") copia[k] = s[k];
          });
          e[par[1]][i] = copia;
          corregidos.push(n.n);
        });
      });
      if (corregidos.length) {
        try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
        if (global.console) console.log("Tus correcciones traídas: " + corregidos.join(", "));
      }

      /* Los topes de sal viejos (2,0 y 1,5) venían de confundir miligramos de sodio
         con gramos de sal, y apretaban 2,5 veces más de lo que Carlos quería. Se
         suben a los que él fijó. Solo si siguen en los valores de fábrica: si los
         ha cambiado a mano, mandan los suyos. */
      /* Ajustes nuevos de v17. Solo se rellenan si NO existen: si él los ha tocado,
         mandan los suyos. */
      var añadidos = [];
      if (typeof e.config.devolucionEjercicio !== "number") {
        e.config.devolucionEjercicio = 0.70;
        añadidos.push("devolución del ejercicio al 70%");
      }
      if (!e.config.entrenoEstandar) {
        e.config.entrenoEstandar = [
          { a: "bici_moderada",  min: 90 },
          { a: "musculacion",    min: 30 },
          { a: "caminar_ligero", min: 60 }
        ];
        añadidos.push("entreno estándar");
      }
      if (!e.comprado) { e.comprado = {}; añadidos.push("registro de lo comprado"); }
      if (!e.config.tomasEspeciales) {
        e.config.tomasEspeciales = {
          almuerzo: { comensales: 1, soloSiEntreno: true },
          merienda: { comensales: 1, soloSiEntreno: true }
        };
        añadidos.push("almuerzo y merienda: solo para él y solo si entrena");
      }
      if (!e.config.fijos) {
        e.config.fijos = [
          { r: "postre_yogur_avena", tomas: ["comida", "cena"] },
          { r: "pan_tostado_mesa",   tomas: ["comida", "cena"] }
        ];
        añadidos.push("fijos de comida y cena");
      }
      if (!e.config.repartoTomas) {
        e.config.repartoTomas = { desayuno: 0.22, almuerzo: 0.10, comida: 0.33, merienda: 0.10, cena: 0.25 };
        añadidos.push("reparto de calorías por toma");
      }
      if (!e.config.fueraEstimado) {
        e.config.fueraEstimado = {
          desayuno: { k: 320, sal: 1.2, p: 10, g: 12, h: 42 },
          almuerzo: { k: 200, sal: 0.7, p: 5,  g: 9,  h: 24 },
          comida:   { k: 900, sal: 3.5, p: 40, g: 38, h: 95 },
          merienda: { k: 260, sal: 0.8, p: 7,  g: 11, h: 32 },
          cena:     { k: 800, sal: 3.0, p: 38, g: 34, h: 82 }
        };
        añadidos.push("estimación de lo que se come fuera");
      }
      if (!e.perfil) e.perfil = {};
      if (!e.perfil.ritmo) { e.perfil.ritmo = 0.5; añadidos.push("ritmo de 0,5 kg por semana"); }

      /* «Come fuera» era un TIPO de día y bloqueaba la comida entera. Ahora es una marca
         por toma, porque lo que pasa de verdad es comer fuera una comida, o una cena, o
         una merienda, no el día completo. Los días que ya estuvieran marcados así pasan
         a día normal con la comida marcada fuera, que es lo que querían decir. */
      Object.keys(e.plan || {}).forEach(function (f) {
        var d = e.plan[f];
        if (d && d.tipo === "fuera") {
          d.tipo = "casa";
          if (!d.fuera) d.fuera = ["comida"];
          añadidos.push("día " + f + " pasado a «comida fuera»");
        }
      });
      if (añadidos.length) {
        try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
        if (global.console) console.log("Ajustes nuevos: " + añadidos.join(", "));
      }

      if (e.config.limiteSal === 2.0 && e.config.avisoSal === 1.5) {
        e.config.limiteSal = 4.0;
        e.config.avisoSal = 2.0;
        try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (err) {}
        if (global.console) console.log("Topes de sal actualizados a 4,0 / 2,0 g.");
      }

      /* CORRECCIÓN DE UNA SOLA VEZ. Durante unos minutos del 21-sep-2026 se
         publicó la previsión del plan al 50%, y la app guarda en su estado los
         valores por omisión en cuanto arranca: quien abriera la app en ese rato
         se quedó con el 0,5 grabado, y cambiar el valor por omisión ya no le
         llega. Se sube a 1 una sola vez y se deja una marca para no volver a
         tocarlo nunca más — si algún día lo baja a mano, se respeta. */
      if (!e.config.v_prevision) {
        e.config.previsionEjercicio = 1;
        e.config.v_prevision = 1;
      }
      if (typeof e.config.previsionEjercicio !== "number") e.config.previsionEjercicio = 1;
      if (typeof e.config.objetivoKcal !== "number") e.config.objetivoKcal = 2000;
      if (typeof e.config.objetivoProt !== "number") e.config.objetivoProt = 90;
      /* DE 1,6 A 1,8 SIN TENER QUE VOLVER A AJUSTES (21-sep-2026). El objetivo
         guardado manda sobre la fórmula, así que cambiarla no movía el número de
         nadie. Se sube solo, y SÓLO si lo guardado es clavado a lo que salía con
         1,6: si Carlos lo había puesto a mano, no se toca. Una vez hecho queda
         la marca y no se vuelve a mirar. */
      /* LA MARCA CAMBIA DE NOMBRE, y hay que contar por qué. La primera versión
         de esta migración sólo subía el 128; al correr, dejó puesta la marca
         `v_prot18` y se dio por hecha. Cuando al día siguiente se amplió para
         cubrir también el 90 de fábrica —que era justo el caso de Carlos—, la
         marca vieja ya impedía que volviera a entrar, así que el número no se
         movía por mucho que se publicara. Una migración que se amplía necesita
         marca nueva: la vieja dice «ya pasé», no «ya hice esto». */
      if (!e.config.v_prot18b) {
        var _po = (e.perfil && (e.perfil.pesoObjetivo || e.perfil.peso)) || 0;
        /* Se sube en dos casos, y sólo en esos dos:
             · lo guardado es clavado a lo que salía con 1,6 (128 con 80 kg);
             · o sigue en el 90 de fábrica, que es el valor con el que nace la
               app antes de que haya perfil. El 21-sep-2026 se vio que el de
               Carlos seguía ahí —nunca llegó a pulsar «usar el sugerido»—, así
               que la ficha le contaba la proteína contra 90 g y salía 150 %
               cuando en realidad iba justo.
           Cualquier otro número es uno que él puso a mano, y no se toca. */
        if (_po && (e.config.objetivoProt === Math.round(_po * 1.6) ||
                    e.config.objetivoProt === 90)) {
          e.config.objetivoProt = Math.round(_po * 1.8);
        }
        e.config.v_prot18b = 1;
      }
      if (typeof e.config.margenKcal !== "number") e.config.margenKcal = 10;
      if (typeof e.config.pctGrasa !== "number") e.config.pctGrasa = 30;
      /* El aviso de sal guardado también manda sobre la semilla, así que sube
         solo si está en el 2,0 de antes y nadie lo ha tocado. */
      if (!e.config.v_sal35) {
        if (e.config.avisoSal === 2 || e.config.avisoSal === 2.0) e.config.avisoSal = 3.5;
        e.config.v_sal35 = 1;
      }
      if (!e.despensa) e.despensa = {};
      if (!e.stock) e.stock = {};
      if (!e.hogar) e.hogar = {};
      if (!e.quiero) e.quiero = {};
      if (!e.hogarLista) e.hogarLista = JSON.parse(JSON.stringify(global.DATOS_HOGAR || []));
      if (!e.stockSitios) e.stockSitios = {};
      /* LO QUE HABÍA MARCADO CON EL SÍ/NO VIEJO no se tira: pasa a stock como
         «esto lo tienes, pero no sé cuánto». Cuenta como cero —más vale que la
         lista lo pida de más a que te quedes sin ello— y sale el primero en la
         revisión, para que la primera cuenta empiece por ahí. */
      Object.keys(e.despensa || {}).forEach(function (id) {
        if (e.stock[id]) return;
        e.stock[id] = { c: 0, f: null, pte: true };
      });
      if (!e.real) e.real = {};
      if (!e.fotos) e.fotos = {};
      if (!e.corregido) e.corregido = {};
      if (!e.compraMarcada) e.compraMarcada = {};
      if (!e.recados) e.recados = {};
      if (!e.favoritos) e.favoritos = [];
      if (!e.sync) e.sync = { sha: null, ultima: null };
      /* EL CIERRE DEL DÍA: todo día ya pasado se congela aquí. Ver «la foto de
         lo comido» más abajo. Se hace al final, cuando el recetario ya está
         completo, y no guarda: de eso se encarga quien haya llamado. */
      this._fotosNuevas = this.congelarPasado();
    },

    /* ---------- persistencia ---------- */
    _sello: 0,
    _compCache: null,
    _compSello: -1,

    /* ─── SELLAR SOLOS LOS DÍAS QUE CAMBIAN (23-sep-2026) ───────────────────
       El sello por día lo ponían sólo `marcarComido` y `tocarDia`. Todo lo demás
       —poner un plato, quitarlo, el contador ×N, comer fuera, los caprichos, los
       comensales— cambiaba un día SIN dejar rastro, y al unir dos aparatos ese
       día lo decidía el reloj global de todo el estado: un aparato que no sabía
       nada podía pisarlo por guardar un segundo después.
       Instrumentar los dieciséis sitios que tocan un día era garantía de
       olvidarse de uno. Se hace en el único sitio por el que pasan todos:
       al guardar se compara con la foto anterior y se sella lo que haya
       cambiado. Es una comparación de textos sobre nueve días: no se nota. */
    _fotoDias: null,

    _retratarDias: function () {
      var f = {}, e = this.estado;
      Object.keys(e.plan || {}).forEach(function (d) { f["p" + d] = JSON.stringify(e.plan[d]); });
      Object.keys(e.comido || {}).forEach(function (d) { f["c" + d] = JSON.stringify(e.comido[d]); });
      return f;
    },

    _sellarLoCambiado: function () {
      var ahora = this._retratarDias();
      if (!this._fotoDias) { this._fotoDias = ahora; return; }
      var antes = this._fotoDias, tocados = {}, k;
      for (k in ahora) if (ahora[k] !== antes[k]) tocados[k.slice(1)] = 1;
      for (k in antes) if (!(k in ahora)) tocados[k.slice(1)] = 1;
      var dias = Object.keys(tocados);
      if (dias.length) {
        var iso = new Date().toISOString();
        if (!this.estado.selloDia) this.estado.selloDia = {};
        var s = this.estado.selloDia;
        dias.forEach(function (d) { s[d] = iso; });
      }
      this._fotoDias = ahora;
    },

    /* LO PEDIDO A MANO TAMBIÉN ES UNA FOTO (25-sep-2026).
       Mismo agujero que se tapó con `stockSello`: `fusionar` es aditiva, así que
       una marca borrada aquí volvía del repositorio. Con lo apuntado en la
       despensa pasó y se vio; con lo pedido a mano pasaba igual y no se había
       visto todavía —al confirmar la compra se borran las faltas de hogar y los
       caprichos, y el siguiente aparato las resucitaba—. Así que hogar y quiero
       mandan enteros desde el lado que los tocó el último. */
    _sellarPedido: function () { this.estado.pedidoSello = new Date().toISOString(); },

    guardar: function (motivo) {
      if (motivo === "hogar" || motivo === "quiero" || motivo === "compra") this._sellarPedido();
      this._sellarLoCambiado();
      this._sello++;              /* invalida la cuenta de lo comprometido */
      this._cacheEntreno = null;          // ver `hayEntreno`
      this.estado.actualizado = new Date().toISOString();
      try { localStorage.setItem(CLAVE, JSON.stringify(this.estado)); } catch (e) {}
      this.avisar(motivo || "cambio");
      if (global.Sync && global.Sync.programarGuardado) global.Sync.programarGuardado();
    },

    /* Se llama al acabar de cargar o de reemplazar: fija el punto de partida
       para que el primer `guardar` no crea que ha cambiado el mundo entero. */
    _reiniciarFotoDias: function () { this._fotoDias = this._retratarDias(); },

    reemplazar: function (nuevo) {
      /* LA CLAVE Y LA PAUSA SON DE ESTE APARATO, NO DE LA COPIA (23-sep-2026).
         Restaurar una copia sustituía el estado entero, config incluida, y se
         llevaba por delante el token. Y pasa siempre que la copia venga del
         repositorio, porque allí el token va en blanco A PROPÓSITO para que no
         viaje nunca. Resultado: restaurar dejaba el aparato desconectado y
         Carlos teniendo que ir a buscar la clave a otro sitio.
         Lo de este aparato se queda en este aparato. */
      var mio = (this.estado && this.estado.config && this.estado.config.github) || {};
      this.estado = nuevo;
      if (mio.token || mio.pausada != null) {
        if (!this.estado.config) this.estado.config = {};
        if (!this.estado.config.github) this.estado.config.github = {};
        var g = this.estado.config.github;
        if (mio.token && !g.token) g.token = mio.token;
        if (mio.pausada != null) g.pausada = mio.pausada;
      }
      this.reparar();
      this._reiniciarFotoDias();
      try { localStorage.setItem(CLAVE, JSON.stringify(this.estado)); } catch (e) {}
      this.avisar("recarga");
    },

    suscribir: function (fn) { this.suscriptores.push(fn); },
    avisar: function (motivo) { this.suscriptores.forEach(function (f) { try { f(motivo); } catch (e) {} }); },

    /* ---------- consultas ---------- */
    receta: function (id) {
      for (var i = 0; i < this.estado.recetas.length; i++) if (this.estado.recetas[i].id === id) return this.estado.recetas[i];
      return null;
    },
    ingrediente: function (id) {
      for (var i = 0; i < this.estado.ingredientes.length; i++) if (this.estado.ingredientes[i].id === id) return this.estado.ingredientes[i];
      return null;
    },

    /* gramos de sal de una línea de ingrediente */
    salDeLinea: function (linea) {
      var ing = this.ingrediente(linea.i);
      if (!ing) return 0;
      var gramos = ing.u === "ud" ? (linea.c * (ing.pesoUd || 100)) : linea.c;
      return gramos * (ing.sal || 0) / 100;
    },

    /* gramos de sal POR RACIÓN de una receta */
    salReceta: function (rec) {
      if (!rec) return 0;
      if (typeof rec.salManual === "number") return rec.salManual;
      var total = 0, self = this;
      (rec.ing || []).forEach(function (l) { total += self.salDeLinea(l); });
      return total / (rec.raciones || 1);
    },

    /* ---------- comensales y comidas fuera, TOMA A TOMA ----------
       Lo de «somos dos» es cierto casi siempre, pero no siempre: el miércoles por la
       tarde y alguna cena del viernes come solo. Y comer fuera pasa por tomas sueltas
       (una comida, una cena), no por días enteros. Las dos cosas van por toma. */

    /* Cuántos comen de esa toma. Solo se guardan las excepciones; el resto sale de
       `config.personas`. */
    /* Reglas fijas de una toma, las mismas todos los días. Vienen de cómo come él de
       verdad: el almuerzo y la merienda son SUYOS —su pareja no los hace— y además
       solo se los toma los días que entrena. Ver `config.tomasEspeciales`. */
    reglaToma: function (toma) {
      return (this.estado.config.tomasEspeciales || {})[toma] || null;
    },

    /* ¿Ese día hay entreno? Cuenta cualquier actividad registrada, sea la prevista o
       la que midió el reloj. Un día sin nada apuntado es un día de descanso. */
    /* ¿Entrena ese día? Esto decide si se planifican el almuerzo y la merienda.

       MIRABA UNA SOLA DE LAS TRES PROCEDENCIAS. Solo veía `estado.actividad`, o sea
       lo apuntado a mano y lo que trajo el reloj, y NO la previsión del plan. Con un
       día que el plan da como «Fuerza A» y «Caminar», la merienda seguía diciendo
       «Solo los días que entrenas» — justo al revés de para lo que sirve, porque la
       comida se prepara ANTES del día, cuando lo único que hay es la previsión.

       Cuenta cualquier entreno que siga en pie: real, apuntado o previsto. NO cuenta
       el previsto CADUCADO —día pasado que se quedó sin hacer—, porque ese día no
       entrenó y no había que meterle merienda. El `tapada` sí cuenta: significa que la
       previsión la sustituyó una sesión de verdad, así que entrenó igual. */
    hayEntreno: function (fecha) {
      if (((this.estado.actividad || {})[fecha] || []).length > 0) return true;
      /* `tomaActiva` se llama por cada día y cada toma —la lista de la compra de dos
         semanas son setenta llamadas—, así que la respuesta se guarda. Se tira entera
         en cada `guardar`. */
      if (!this._cacheEntreno) this._cacheEntreno = {};
      if (this._cacheEntreno[fecha] != null) return this._cacheEntreno[fecha];
      var hay = false, lista = [];
      try { lista = this.entrenoDelDia(fecha) || []; } catch (e) { lista = []; }
      for (var i = 0; i < lista.length; i++) {
        var e2 = lista[i];
        if (e2.caducada || e2.pisada) continue;
        if ((e2.kcal || 0) <= 0 && (e2.min || 0) <= 0) continue;
        hay = true; break;
      }
      this._cacheEntreno[fecha] = hay;
      return hay;
    },

    /* ¿Esa toma se planifica ese día? El almuerzo y la merienda, solo si entrena. */
    tomaActiva: function (fecha, toma) {
      var r = this.reglaToma(toma);
      if (r && r.soloSiEntreno && !this.hayEntreno(fecha)) return false;
      return true;
    },

    comensales: function (fecha, toma) {
      var d = this.estado.plan[fecha];
      var n = d && d.comensales && d.comensales[toma];
      if (n > 0) return n;                                  // lo que él haya puesto manda
      var r = this.reglaToma(toma);
      if (r && r.comensales > 0) return r.comensales;       // almuerzo y merienda: él solo
      return this.estado.config.personas || 1;
    },
    ponerComensales: function (fecha, toma, n) {
      var d = this.asegurarDia(fecha);
      if (!d.comensales) d.comensales = {};
      var r = this.reglaToma(toma);
      var porDefecto = (r && r.comensales > 0) ? r.comensales : (this.estado.config.personas || 1);
      if (n === porDefecto) delete d.comensales[toma];
      else d.comensales[toma] = n;
      if (!Object.keys(d.comensales).length) delete d.comensales;
      this.guardar("comensales");
    },

    /* ¿Esa toma se come fuera de casa? */
    esFuera: function (fecha, toma) {
      var d = this.estado.plan[fecha];
      return !!(d && d.fuera && d.fuera.indexOf(toma) >= 0);
    },
    /* MARCAR «FUERA» APARTA LO QUE HABÍA PLANIFICADO, no lo deja contando.
       Desde que lo apuntado manda sobre la estimación (22-sep-2026), dejar los
       platos ahí significaría que marcar «cenamos fuera» sigue contando la
       tortilla que no te comiste. Y marcar fuera quiere decir justo eso: que el
       plan de esa toma no pasó.

       Se aparta, no se borra: vuelve entero al desmarcar. Así el botón sigue
       siendo reversible y un toque por error no cuesta nada. Lo que apuntes
       DESPUÉS —el menú del McDonald's— se queda donde está y cuenta. */
    ponerFuera: function (fecha, toma, si) {
      var d = this.asegurarDia(fecha);
      if (!d.fuera) d.fuera = [];
      var i = d.fuera.indexOf(toma);
      if (si && i < 0) {
        d.fuera.push(toma);
        if ((d[toma] || []).length) {
          if (!d.guardadoFuera) d.guardadoFuera = {};
          d.guardadoFuera[toma] = d[toma].slice();
          d[toma] = [];
        }
      }
      if (!si && i >= 0) {
        d.fuera.splice(i, 1);
        if (d.guardadoFuera && d.guardadoFuera[toma]) {
          /* Sólo se devuelve el plan si no has apuntado nada mientras tanto:
             lo que escribiste tú vale más que lo que había planificado. */
          if (!(d[toma] || []).length) d[toma] = d.guardadoFuera[toma].slice();
          delete d.guardadoFuera[toma];
          if (!Object.keys(d.guardadoFuera).length) delete d.guardadoFuera;
        }
      }
      if (!d.fuera.length) delete d.fuera;
      this.guardar("fuera");
    },

    /* Lo que se estima que comes fuera. Es un número INVENTADO a propósito, sacado de
       lo que suele llevar un menú del día: no es lo que has comido, es un relleno para
       que el recuento del día no se quede cojo. Editable en Ajustes. */
    estimacionFuera: function (toma) {
      var e = (this.estado.config.fueraEstimado || {})[toma];
      return e ? { k: e.k || 0, sal: e.sal || 0, p: e.p || 0, g: e.g || 0, h: e.h || 0 } : null;
    },

    /* ---------- LA FOTO DE LO COMIDO: EL PASADO NO SE REESCRIBE ----------
       Una ficha de día guarda IDS de recetas, no platos. Mientras la receta no
       cambie da lo mismo, pero el 22-sep-2026 pasó lo que tenía que pasar: ocho
       recetas conservaron su id y cambiaron de contenido —«Zanahorias a la miel»
       pasó a ser berenjena— y las fichas de los días YA COMIDOS se reescribieron
       solas. Carlos había apuntado zanahoria y al día siguiente ponía berenjena.

       La solución es la de cualquier contabilidad: cuando un plato pasa de plan
       a HECHO se le hace una FOTO —el nombre y los cinco números por ración— y
       desde ese momento ese día lee la foto y no la receta. Cambiar una receta
       cambia el futuro; lo comido queda como fue.

       La foto se toma en tres momentos:
         · al marcar el ✓ de comido,
         · al arrancar, para todo día ya pasado que aún no la tenga (el cierre),
         · al tocar un día pasado con «Editar», para lo que se añada.
       Y NUNCA se pisa una foto ya hecha: en eso consiste todo. */
    fotoPlato: function (fecha, id) {
      var d = this.estado.fotos && this.estado.fotos[fecha];
      var f = d && d[id];
      return (f && typeof f.k === "number") ? f : null;
    },

    /* Los valores POR RACIÓN de un plato EN ESE DÍA: la foto si la hay, la
       receta de hoy si no. Todo lo que suma un día pasa por aquí. */
    nutrEn: function (fecha, id) {
      var f = this.fotoPlato(fecha, id);
      if (f) return { k: f.k || 0, p: f.p || 0, g: f.g || 0, h: f.h || 0 };
      return this.nutrReceta(this.receta(id));
    },
    salEn: function (fecha, id) {
      var f = this.fotoPlato(fecha, id);
      if (f) return f.s || 0;
      return this.salReceta(this.receta(id));
    },
    /* El nombre que tenía el plato ESE día. Sirve además para los platos
       borrados del recetario: la foto los sigue nombrando. */
    nombreEn: function (fecha, id) {
      var f = this.fotoPlato(fecha, id);
      if (f && f.n) return f.n;
      var r = this.receta(id);
      return r ? r.n : "";
    },
    /* ¿este día está congelado? (para decirlo en la ficha) */
    diaCongelado: function (fecha) {
      var d = this.estado.fotos && this.estado.fotos[fecha];
      return !!(d && Object.keys(d).length);
    },

    congelarPlato: function (fecha, id, rehacer) {
      var r = this.receta(id);
      if (!r) return false;                      // borrada: no hay nada que fotografiar
      if (!this.estado.fotos) this.estado.fotos = {};
      if (!this.estado.fotos[fecha]) this.estado.fotos[fecha] = {};
      if (this.estado.fotos[fecha][id] && !rehacer) return false;
      var n = this.nutrReceta(r), s = this.salReceta(r);
      var d1 = function (x) { return Math.round((x || 0) * 10) / 10; };
      this.estado.fotos[fecha][id] = {
        n: r.n, r: r.raciones || 1,
        k: d1(n.k), p: d1(n.p), g: d1(n.g), h: d1(n.h),
        s: Math.round((s || 0) * 1000) / 1000
      };
      return true;
    },

    TOMAS_Y_CAPRICHO: ["desayuno", "almuerzo", "comida", "merienda", "cena", "capricho"],

    congelarDia: function (fecha, rehacer) {
      var dia = this.estado.plan[fecha];
      if (!dia) return 0;
      var self = this, n = 0;
      this.TOMAS_Y_CAPRICHO.forEach(function (t) {
        (dia[t] || []).forEach(function (id) { if (self.congelarPlato(fecha, id, rehacer)) n++; });
      });
      return n;
    },

    /* EL CIERRE. Al arrancar, todo día ya pasado que no tenga foto la tiene. */
    congelarPasado: function () {
      var hoy = Util.hoyISO(), self = this, n = 0;
      Object.keys(this.estado.plan || {}).forEach(function (f) {
        if (f < hoy) n += self.congelarDia(f);
      });
      return n;
    },

    /* SE HA TOCADO UN DÍA. Lo que se acaba de poner se fotografía ya —si lo
       apuntas hoy, lo de hoy es lo que comiste—, lo que se ha quitado suelta su
       foto, y si el día ya había pasado queda la marca de «corregido a mano».
       Se llama DESPUÉS de cambiar el plan y ANTES de guardar. */
    tocarDia: function (fecha) {
      var dia = this.estado.plan[fecha];
      if (!dia) return;
      var self = this, dentro = {};
      this.TOMAS_Y_CAPRICHO.forEach(function (t) {
        (dia[t] || []).forEach(function (id) { dentro[id] = 1; self.congelarPlato(fecha, id); });
      });
      var d = this.estado.fotos && this.estado.fotos[fecha];
      if (d) {
        Object.keys(d).forEach(function (id) { if (!dentro[id]) delete d[id]; });
        if (!Object.keys(d).length) delete this.estado.fotos[fecha];
      }
      if (this.esPasado(fecha)) {
        if (!this.estado.corregido) this.estado.corregido = {};
        /* Con HORA, no solo el día (23-sep-2026). El desempate entre dos aparatos
           que corrigen el mismo día necesita más resolución que la fecha, y la
           cabecera sigue leyendo bien: coge los caracteres 8-9 y 5-6, que en
           "2026-09-23T12:31:07.000Z" siguen siendo el día y el mes. */
        this.estado.corregido[fecha] = new Date().toISOString();
      }
      this.sellarDia(fecha);
    },

    corregidoEl: function (fecha) { return (this.estado.corregido || {})[fecha] || null; },

    /* La hora en que este aparato tocó por última vez ese día: el ✓ de comido o
       una corrección. No es lo mismo que `corregido`, que además pinta el sello
       «Corregido a mano» en la cabecera y sólo vale para días pasados. */
    sellarDia: function (fecha) {
      if (!this.estado.selloDia) this.estado.selloDia = {};
      this.estado.selloDia[fecha] = new Date().toISOString();
    },
    selloDeDia: function (fecha) {
      var a = (this.estado.selloDia || {})[fecha] || "";
      var b = (this.estado.corregido || {})[fecha] || "";
      return a > b ? a : b;
    },

    /* sal total de un día del plan (por persona), con lo comido fuera estimado */
    salDia: function (fecha) {
      var dia = this.estado.plan[fecha];
      if (!dia) return 0;
      var total = 0, self = this;
      ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (toma) {
        if (self.esFuera(fecha, toma)) {
          /* Igual que en las calorías: lo apuntado manda sobre la estimación. */
          var puestos = dia[toma] || [];
          if (puestos.length) {
            var gf = self.agrupar(puestos);
            gf.orden.forEach(function (id) {
              total += self.salEn(fecha, id) * self.factorPlato(fecha, toma, id, gf.veces[id]);
            });
            return;
          }
          var e = self.estimacionFuera(toma);
          if (e) total += e.sal;
          return;                                   // fuera no se cocina: nada más que sumar
        }
        var g = self.agrupar(dia[toma]);
        g.orden.forEach(function (id) {
          total += self.salEn(fecha, id) * self.factorPlato(fecha, toma, id, g.veces[id]);
        });
      });
      (dia.capricho || []).forEach(function (id) { total += self.salEn(fecha, id); });
      return total;
    },

    semaforo: function (sal, fecha) {
      /* En un día de ruta el tope no se aplica: ese día se pierde más sodio
         sudando del que el tope permite comer. Ver TIPOS_DIA. */
      if (fecha && !this.fichaTipoDia(fecha).topeSal) return "libre";
      var c = this.estado.config;
      if (sal > c.limiteSal) return "rojo";
      if (sal > c.avisoSal) return "ambar";
      return "verde";
    },

    /* ---------- energía y macros ---------- */
    /* gramos que aporta una línea de ingrediente */
    gramosDeLinea: function (linea) {
      var ing = this.ingrediente(linea.i);
      if (!ing) return 0;
      return ing.u === "ud" ? (linea.c * (ing.pesoUd || 100)) : linea.c;
    },

    /* {k,p,g,h} POR RACIÓN de una receta */
    nutrReceta: function (rec) {
      var vacio = { k: 0, p: 0, g: 0, h: 0 };
      if (!rec) return vacio;
      /* UN CAPRICHO NO TIENE INGREDIENTES. Un helado de una heladería no se
         despieza: se sabe lo que pone más o menos y poco más. Así que puede
         traer sus valores puestos a mano, igual que `salManual` lleva haciendo
         desde siempre con la sal. Si están, mandan. */
      if (rec.nutrManual) {
        return { k: rec.nutrManual.k || 0, p: rec.nutrManual.p || 0,
                 g: rec.nutrManual.g || 0, h: rec.nutrManual.h || 0 };
      }
      var t = { k: 0, p: 0, g: 0, h: 0 }, self = this;
      (rec.ing || []).forEach(function (l) {
        var ing = self.ingrediente(l.i);
        if (!ing) return;
        var gr = self.gramosDeLinea(l) / 100;
        t.k += gr * (ing.k || 0);
        t.p += gr * (ing.p || 0);
        t.g += gr * (ing.g || 0);
        t.h += gr * (ing.h || 0);
      });
      var r = rec.raciones || 1;
      return { k: t.k / r, p: t.p / r, g: t.g / r, h: t.h / r };
    },

    /* {k,p,g,h} de un día. soloComido = suma únicamente lo marcado como comido */
    /* {k,p,g,h} DE UNA SOLA TOMA. Sale de aquí y no de una cuenta aparte para
       que la suma de las cinco tomas dé EXACTAMENTE el total del día: `nutrDia`
       llama a esta función, así que no pueden separarse nunca aunque cambien las
       reglas de lo que cuenta. (Pedido por Carlos el 23-sep-2026: quería ver las
       calorías al lado del nombre de cada toma.) */
    nutrToma: function (fecha, toma, soloComido) {
      var dia = this.estado.plan[fecha];
      var t = { k: 0, p: 0, g: 0, h: 0 };
      if (!dia) return t;
      var self = this;
      if (self.esFuera(fecha, toma)) {
        /* SI SABES QUÉ COMISTE, MANDA LO QUE COMISTE. La estimación de «fuera
           de casa» está para cuando no lo sabes —una comida de trabajo, una
           boda—, no para tapar lo que sí puedes apuntar. Carlos, 22-sep-2026:
           una cena en el McDonald's se marca fuera Y se apunta el menú, y lo
           que tiene que contar es el menú.
           Lo de fuera cuenta siempre, también en «sólo lo comido»: si has
           marcado que comes fuera es que has comido, no hay nada que tachar. */
        var puestos = dia[toma] || [];
        if (puestos.length) {
          var gf = self.agrupar(puestos);
          gf.orden.forEach(function (id) {
            var nn = self.nutrEn(fecha, id);
            var f = self.factorPlato(fecha, toma, id, gf.veces[id]);
            t.k += nn.k * f; t.p += nn.p * f; t.g += nn.g * f; t.h += nn.h * f;
          });
          return t;
        }
        var e = self.estimacionFuera(toma);
        if (e) { t.k += e.k; t.p += e.p; t.g += e.g; t.h += e.h; }
        return t;
      }
      var g = self.agrupar(dia[toma]);
      g.orden.forEach(function (id) {
        if (soloComido && !self.estaComido(fecha, toma, id)) return;
        var n = self.nutrEn(fecha, id);
        var f = self.factorPlato(fecha, toma, id, g.veces[id]);
        t.k += n.k * f; t.p += n.p * f; t.g += n.g * f; t.h += n.h * f;
      });
      return t;
    },

    nutrDia: function (fecha, soloComido) {
      var dia = this.estado.plan[fecha];
      var t = { k: 0, p: 0, g: 0, h: 0 };
      if (!dia) return t;
      var self = this;
      ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (toma) {
        var x = self.nutrToma(fecha, toma, soloComido);
        t.k += x.k; t.p += x.p; t.g += x.g; t.h += x.h;
      });
      /* LOS CAPRICHOS CUENTAN SIEMPRE, también en «sólo lo comido». Un capricho
         se apunta DESPUÉS de comerlo —nadie planifica un helado de bar—, así que
         pedirle además el visto sería pedir dos veces lo mismo.
         Van fuera de `nutrToma` a propósito: no pertenecen a ninguna toma. */
      (dia.capricho || []).forEach(function (id) {
        var n = self.nutrEn(fecha, id);
        t.k += n.k; t.p += n.p; t.g += n.g; t.h += n.h;
      });
      return t;
    },

    /* UN CAPRICHO NUEVO, creado sobre la marcha y GUARDADO EN EL RECETARIO.
       Carlos eligió que los caprichos salieran del recetario, pero un helado de
       una heladería no está ahí. Así que la primera vez se escribe el nombre y
       las calorías y queda dentro, en el grupo «capricho»: la segunda vez ya se
       elige de la lista como cualquier otro plato. Al cabo de un mes el
       recetario sabe lo que te gusta sin que hayas tenido que catalogarlo. */
    /* UN INGREDIENTE SOLO, PUESTO COMO PLATO.
       Una manzana en el almuerzo, 30 g de pistachos en la merienda. Hasta hoy
       lo único que se podía apuntar sin receta era un capricho, y eso está mal
       para esto: el capricho es lo que te comiste fuera del plan y por eso NO
       se compra. Una manzana del almuerzo sí está planificada, así que cuenta
       en calorías, en macros y —la diferencia que importa— EN LA LISTA DE LA
       COMPRA.
       Queda guardado en el recetario, así que la segunda manzana ya está hecha.
       Y si ya existe uno igual, se reutiliza en vez de duplicarlo. */
    crearSuelto: function (idIng, cant, tomas) {
      var g = this.ingrediente(idIng);
      cant = Number(cant);
      if (!g || !(cant > 0)) return null;
      cant = Math.round(cant * 100) / 100;

      var previo = null;
      this.estado.recetas.forEach(function (r) {
        if (previo || r.grupo !== "suelto" || (r.ing || []).length !== 1) return;
        if (r.ing[0].i === idIng && Math.abs(r.ing[0].c - cant) < 0.001) previo = r;
      });
      if (previo) {
        if (previo.borrada) { delete previo.borrada; this.guardar("suelto"); }
        return previo.id;
      }

      var nombre = g.n + " · " + Util.cantidadReceta(cant, g.u, g.pesoUd);
      var base = "solo_" + String(idIng).slice(0, 26) + "_" +
                 String(cant).replace(".", "_");
      var id = base, n = 2;
      while (this.receta(id)) { id = base + "_" + n; n++; }

      var t = (tomas && tomas.length) ? tomas.slice() : ["almuerzo", "merienda"];
      if (t.indexOf("almuerzo") < 0) t.push("almuerzo");
      if (t.indexOf("merienda") < 0) t.push("merienda");

      this.estado.recetas.push({
        id: id, n: nombre, tipo: t, grupo: "suelto",
        raciones: 1, min: 0, tools: ["sin-cocinar"],
        llevable: true,
        ing: [{ i: idIng, c: cant }],
        pasos: ["Tal cual, sin preparar nada."],
        trucos: [], nota: "Ingrediente solo. Cuenta para la lista de la compra.",
        editado: true
      });
      this.guardar("suelto");
      return id;
    },

    /* PASAR UN CAPRICHO A INGREDIENTE SOLO.
       Se convierte EN SU SITIO, conservando el id, y eso no es un detalle: los
       días en los que ya lo tenías apuntado siguen apuntando a él. Si se
       borrara y se creara otro, esos días se quedarían con un plato fantasma.

       Al dejar de ser capricho gana lo que un capricho no tiene: ingredientes
       de verdad, así que a partir de aquí cuenta macros y entra en la lista de
       la compra. Y pierde las calorías escritas a mano, que ya las calcula el
       ingrediente. */
    pasarASuelto: function (idReceta, idIng, cant) {
      var r = this.receta(idReceta), g = this.ingrediente(idIng);
      cant = Number(cant);
      if (!r || !g || !(cant > 0)) return false;
      r.grupo = "suelto";
      r.tipo = ["almuerzo", "merienda"];
      r.ing = [{ i: idIng, c: Math.round(cant * 100) / 100 }];
      r.raciones = r.raciones || 1;
      r.min = 0;
      r.tools = ["sin-cocinar"];
      r.llevable = true;
      r.pasos = ["Tal cual, sin preparar nada."];
      r.nota = "Ingrediente solo. Cuenta para la lista de la compra.";
      r.editado = true;
      delete r.nutrManual;
      delete r.salManual;
      this.guardar("suelto");
      return true;
    },

    /* A QUÉ INGREDIENTE SE PARECE ESTE NOMBRE.
       Sirve para rellenar solo la pantalla de ordenar caprichos: «Pistachos»
       encuentra «Pistachos crudos» sin que él tenga que buscarlo. No acierta
       siempre, y por eso lo que propone se ve y se puede cambiar antes de
       aplicar nada. */
    pareceIngrediente: function (nombre) {
      var n = String(nombre || "").toLowerCase()
        .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
        .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u");
      if (!n) return null;
      var mejor = null, mejorLargo = 0;
      this.estado.ingredientes.forEach(function (g) {
        var m = String(g.n).toLowerCase()
          .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
          .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u");
        /* Se comparan palabras de 4 letras o más: «de», «sin» o «con» casarían
           media despensa con cualquier cosa. */
        m.split(/[^a-z0-9]+/).forEach(function (p) {
          if (p.length < 4 || p.length <= mejorLargo) return;
          if (n.indexOf(p) >= 0) { mejor = g.id; mejorLargo = p.length; }
        });
        n.split(/[^a-z0-9]+/).forEach(function (p) {
          if (p.length < 4 || p.length <= mejorLargo) return;
          if (m.indexOf(p) >= 0) { mejor = g.id; mejorLargo = p.length; }
        });
      });
      return mejor;
    },

    crearCapricho: function (nombre, kcal) {
      nombre = String(nombre || "").trim();
      kcal = Math.round(Number(kcal) || 0);
      if (!nombre || kcal <= 0) return null;
      var base = "cap_" + nombre.toLowerCase()
        .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
        .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32);
      var id = base, n = 2;
      while (this.receta(id)) { id = base + "_" + n; n++; }
      this.estado.recetas.push({
        id: id, n: nombre, tipo: ["capricho"], grupo: "capricho",
        raciones: 1, min: 0, ing: [],
        /* Sin macros: de un capricho se sabe lo que engorda, no cómo se reparte.
           Inventarlos sería peor que dejarlos en blanco. */
        nutrManual: { k: kcal, p: 0, g: 0, h: 0 },
        salManual: 0,
        nota: "Capricho apuntado a mano. Las calorías son las que pusiste tú."
      });
      this.guardar("capricho");
      return id;
    },

    /* ══════════ LA NOTA DEL DÍA ══════════
       Cierra un día ya vivido: lo previsto contra lo conseguido, en un número
       del 0 al 100 y un signo. Carlos, 21-sep-2026: «ponderado, que la sal y la
       proteína no sean muy castigadores a no ser que sea un consumo excesivo
       excesivo». Así que:

       · MANDAN LAS CALORÍAS. Son el 100 de partida. Dentro del margen de holgura
         —el mismo 10 % que ya usa el resto de la app— la nota no baja nada: un
         día no se estropea por comer doce calorías de más. A partir de ahí se
         pierden 3 puntos por cada punto porcentual de desvío, así que un día un
         20 % desviado se queda en 70 y hace falta irse al 43 % para llegar a 0.
         Da igual el lado: quedarse corto adelgaza igual de mal que pasarse.

       · LA PROTEÍNA SÓLO RESTA SI EL DÍA SE QUEDA CORTO DE VERDAD, por debajo
         del 80 % del objetivo, y como mucho quita 15 puntos. Pasarse no resta
         nada: no es un problema.

       · LA SAL SÓLO RESTA POR ENCIMA DEL TECHO ROJO (4 g), no del aviso ámbar.
         El aviso está para mirarlo, no para castigar; el techo es el que
         significa «hoy te has pasado». Como mucho, otros 15 puntos.

       Los dos juntos no pueden bajar la nota más de 30 puntos: un día que cuadra
       en calorías nunca suspende por la sal.

       `motivos` devuelve en palabras qué la bajó, que es lo que hace que la nota
       sirva para algo. Un número sin explicación no se corrige. */
    notaDia: function (fecha) {
      var objetivo = this.objetivoDelDia(fecha);
      var comido = this.nutrDia(fecha, true);
      if (!objetivo || !comido.k) return null;

      var c = this.estado.config;
      var obj = this.objetivosMacros(fecha);
      var motivos = [];

      // ---- calorías ----
      var desvio = Math.abs(comido.k - objetivo) / objetivo * 100;
      var holgura = c.margenKcal || 10;
      var nota = 100;
      if (desvio > holgura) {
        nota -= (desvio - holgura) * 3;
        motivos.push((comido.k > objetivo ? "te pasaste " : "te quedaste ") +
                     Math.round(Math.abs(comido.k - objetivo)) + " kcal");
      }

      // ---- proteína: sólo si falta de verdad ----
      var pctProt = obj.p ? comido.p / obj.p * 100 : 100;
      if (pctProt < 80) {
        var castigoP = Math.min(15, (80 - pctProt) * 0.7);
        nota -= castigoP;
        motivos.push("poca proteína (" + Math.round(comido.p) + " de " + obj.p + " g)");
      }

      // ---- sal: sólo por encima del techo ----
      var sal = this.salDia(fecha);
      var techo = c.limiteSal || 4;
      if (this.fichaTipoDia(fecha).topeSal && sal > techo) {
        var castigoS = Math.min(15, (sal - techo) * 8);
        nota -= castigoS;
        motivos.push("sal por encima del techo (" + Util.sal(sal) + ")");
      }

      nota = Math.max(0, Math.min(100, Math.round(nota)));
      return {
        nota: nota,
        signo: nota >= 80 ? "+" : (nota >= 55 ? "~" : "\u2212"),
        clase: nota >= 80 ? "bien" : (nota >= 55 ? "regular" : "mal"),
        objetivo: Math.round(objetivo),
        comido: Math.round(comido.k),
        motivos: motivos
      };
    },

    /* UN INGREDIENTE PROPUESTO POR UNA IA, metido en la despensa.
       Llega de `+ Con una IA` cuando la receta usa algo que Carlos no tenía:
       nombre, unidad y los valores por 100 g. Se guarda igual que uno creado a
       mano —se puede corregir después en Despensa—, con la marca `de: "ia"` por
       si algún día quiere repasarlos todos de una vez: son los únicos valores
       del catálogo que no ha mirado él. */
    crearIngredienteIA: function (d) {
      if (!d || !d.n) return null;
      var nombre = String(d.n).trim().slice(0, 60);
      if (!nombre) return null;
      var base = nombre.toLowerCase()
        .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
        .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);
      if (!base) return null;
      var id = base, n = 2;
      while (this.ingrediente(id)) { id = base + "_" + n; n++; }
      function num(v, def) { var x = parseFloat(v); return isNaN(x) ? def : x; }
      var u = (d.u === "ml" || d.u === "ud") ? d.u : "g";
      var ing = {
        id: id, n: nombre, cat: String(d.cat || "Despensa").slice(0, 30), u: u,
        sal: num(d.sal, 0), k: num(d.k, 0), p: num(d.p, 0),
        g: num(d.g, 0), h: num(d.h, 0),
        de: "ia"
      };
      if (u === "ud") ing.pesoUd = num(d.pesoUd, 100);
      this.estado.ingredientes.push(ing);
      this.guardar("ingrediente");
      return id;
    },

    /* LO QUE HAS CREADO O CORREGIDO TÚ.
       Es exactamente lo que sube a `datos/nuevos.js` del repositorio público:
       los ingredientes y recetas que no venían en el catálogo grande, más los
       que venían pero has corregido (`editado`) y los que propuso una IA
       (`de:"ia"`). Nada más: el plan, la despensa, las medidas y el peso viajan
       aparte, al repositorio privado, por `github.js`. */
    canon: canon,

    novedades: function () {
      var base = SEMILLA_BASE || { ing: {}, rec: {} };
      /* Es tuyo si no venía en el catálogo grande, o si venía y lo has cambiado.
         Lo segundo se mira COMPARANDO, no por la marca `editado`: si no, un
         ingrediente que corregiste hace meses y que ya absorbí en el catálogo
         seguiría subiendo una copia idéntica para siempre. */
      function mio(x, dic) {
        if (!x || !x.id) return false;
        var base = dic[x.id];
        if (base === undefined) return true;
        return canon(x) !== base;
      }
      return {
        ingredientes: (this.estado.ingredientes || []).filter(function (x) { return mio(x, base.ing); }),
        recetas: (this.estado.recetas || []).filter(function (x) { return mio(x, base.rec) && !x.borrada; })
      };
    },

    /* ---------- LO QUE COMISTE DE VERDAD, EN CANTIDAD ----------
       Al planificar se pone la ración estándar, que es lo razonable. Pero el
       plátano pesó 104 g y las nueces fueron 20: son 79 kcal de diferencia en un
       solo picoteo, y en una semana de almuerzos eso es medio día de déficit.

       La corrección SUSTITUYE la aportación entera de ese plato en esa toma,
       también si estaba puesto dos veces: has dicho exactamente cuánto comiste.
       Y no toca la lista de la compra: compraste un plátano entero, no 104 g. */

    /* En qué se mide la corrección: un producto de un solo ingrediente se corrige
       en gramos o mililitros; una receta de varias cosas, en raciones, porque
       nadie pesa cada ingrediente de unas lentejas. */
    unidadReal: function (rec) {
      if (!rec || (rec.ing || []).length !== 1) return "rac";
      var g = this.ingrediente(rec.ing[0].i);
      if (!g) return "rac";
      return g.u === "ml" ? "ml" : "g";
    },

    /* Lo previsto, en esa misma unidad. */
    cantidadPrevista: function (rec) {
      if (this.unidadReal(rec) === "rac") return 1;
      return this.gramosDeLinea(rec.ing[0]);
    },

    cantidadReal: function (fecha, toma, recetaId) {
      var d = this.estado.real && this.estado.real[fecha];
      var t = d && d[toma];
      return (t && t[recetaId]) || null;
    },

    ponerCantidadReal: function (fecha, toma, recetaId, c) {
      if (!this.estado.real) this.estado.real = {};
      var r = this.estado.real;
      if (c === null || !(Number(c) >= 0)) {
        if (r[fecha] && r[fecha][toma]) {
          delete r[fecha][toma][recetaId];
          if (!Object.keys(r[fecha][toma]).length) delete r[fecha][toma];
          if (!Object.keys(r[fecha]).length) delete r[fecha];
        }
      } else {
        if (!r[fecha]) r[fecha] = {};
        if (!r[fecha][toma]) r[fecha][toma] = {};
        r[fecha][toma][recetaId] = { c: Number(c), u: this.unidadReal(this.receta(recetaId)) };
      }
      this.guardar("real");
    },

    /* POR CUÁNTO SE MULTIPLICA ese plato en ese día. Sin corrección, por las
       veces que esté puesto. Con corrección, por lo que diga la corrección, que
       ya es el total. */
    factorPlato: function (fecha, toma, recetaId, veces) {
      var real = this.cantidadReal(fecha, toma, recetaId);
      if (!real) return veces || 1;
      var rec = this.receta(recetaId);
      if (!rec) return veces || 1;
      if (this.unidadReal(rec) === "rac") return real.c;
      var prev = this.cantidadPrevista(rec);
      return prev > 0 ? (real.c / prev) : (veces || 1);
    },

    /* Los ids de una toma agrupados: { rid: veces }. Lo usan las sumas del día
       para poder aplicar un factor por PLATO y no por cada repetición. */
    agrupar: function (lista) {
      var m = {}, orden = [];
      (lista || []).forEach(function (id) {
        if (m[id] === undefined) { m[id] = 0; orden.push(id); }
        m[id]++;
      });
      return { veces: m, orden: orden };
    },

    /* ================= LA DESPENSA CON CANTIDADES =================
       Tres números, y solo el primero se guarda:

         STOCK        lo que hay en casa ahora mismo.
         COMPROMETIDO lo que piden los platos ya planificados de hoy en adelante
                      y todavía sin comer. NO SE GUARDA, SE CALCULA.
         LIBRE        stock − comprometido. Es lo único que se puede planificar.

       Que el compromiso no se guarde es la decisión que sostiene todo esto.
       Guardarlo obligaría a acordarse de devolverlo en cinco sitios —al borrar un
       plato, al cambiar de día, al marcar la toma como fuera, al vaciar la semana,
       al cambiar la cantidad— y el día que uno de los cinco fallara, el número
       empezaría a mentir sin avisar. Calculándolo no hay nada que devolver.

       El stock NO BLOQUEA NADA. Sugiere. Nunca impide planificar algo. */

    /* ============ DÓNDE ESTÁ EN LA CASA: ZONAS Y ESTANTES ============
       La sección del supermercado es la ruta de la tienda y sirve para la lista
       de la compra. Esto es otra cosa: el recorrido de SU cocina, y lo dictó él
       el 24-sep-2026 después de colocar las 209 fichas una a una.

       Tres zonas, y el orden es el orden en que se recorren. Dentro de cada una,
       los estantes en el orden en que se miran.

       POR QUÉ NO SE DEDUCE NADA. Hasta hoy el sitio salía de la sección del
       súper, y por eso los seis pescados congelados estaban fichados en la
       nevera. Se intentó afinar con subgrupos y Carlos lo tumbó con dos frases:
       «las salsas están en la nevera» y «lácteos hay en nevera y la leche en
       brick en el armario». O sea que los lácteos van a la nevera MENOS el
       brick, y las salsas a la despensa MENOS cuando están abiertas. Eso no es
       una categoría: es cómo está montada su cocina.

       Lo midió el reparto que hizo: de las 209 que yo había deducido, me
       corrigió 43 —el 21 %—, y los fallos no eran al azar. TODO lo que falla es
       lo que se abre: la mermelada cerrada es despensa y abierta es puerta de
       nevera; el brick de leche justo al revés.

       Así que una ficha sin `sitio` escrito NO SE COLOCA SOLA: va a Pendiente.
       Es lo que él pidió — «cualquier ingrediente nuevo debe aparecer en
       pendiente» — y es más honrado que inventarle un estante. */
    ZONAS: [
      { k: "nevera", n: "Nevera", estantes: [
        { k: "puerta",     n: "Puerta" },
        { k: "est_arriba", n: "Estante arriba" },
        { k: "est_abajo",  n: "Estante abajo" },
        { k: "cajones",    n: "Cajones" },
        /* Estante propio para la carne (Carlos, 25-sep-2026). No es un cajón
           físico: es que las catorce fichas de carnicería no tenían sitio y no
           salían en ningún pase, y repartirlas por la nevera las volvía a
           esconder. Va antes del frutero porque en el recorrido la carne se
           mira con lo frío y no con la fruta. */
        { k: "carne",      n: "Carne" },
        { k: "frutero",    n: "Frutero" },
        { k: "congelador", n: "Congelador" }
      ] },
      { k: "despensa", n: "Despensa", estantes: [
        { k: "esencial",  n: "Esencial" },
        { k: "conserva",  n: "Conserva" },
        { k: "panaderia", n: "Panadería" },
        { k: "aperitivo", n: "Aperitivo" },
        { k: "bases",     n: "Bases" },
        { k: "desayuno",  n: "Desayuno" },
        { k: "bebida",    n: "Bebida" },
        { k: "postres",   n: "Postres" }
      ] },
      { k: "alacena", n: "Alacena", estantes: [
        { k: "sports",   n: "Sports" },
        { k: "basicos",  n: "Básicos" },
        { k: "especias", n: "Especias" },
        { k: "otros",    n: "Otros" }
      ] }
    ],

    /* La lista plana de estantes, que es lo que usan el stock y la pasada.
       `SITIOS` conserva el nombre de antes para no tocar lo que ya lo pedía. */
    get SITIOS() {
      if (this._sitiosPlanos) return this._sitiosPlanos;
      var out = [];
      this.ZONAS.forEach(function (z) {
        z.estantes.forEach(function (e) {
          out.push({ k: e.k, n: e.n, zona: z.k, zonaN: z.n, cats: [] });
        });
      });
      this._sitiosPlanos = out;
      return out;
    },
    zonaDe: function (estante) {
      var z = null;
      this.ZONAS.forEach(function (Z) {
        Z.estantes.forEach(function (e) { if (e.k === estante) z = Z; });
      });
      return z;
    },

    sitioDe: function (id) {
      var g = typeof id === "string" ? this.ingrediente(id) : id;
      if (!g) return null;
      /* SÓLO LO ESCRITO. Sin `sitio` no hay estante: devuelve null y la ficha
         sale en Pendiente. Ver la nota larga de ZONAS. */
      if (!g.sitio) return null;            // sin colocar: va a Pendiente
      var vale = false;
      this.SITIOS.forEach(function (s) { if (s.k === g.sitio) vale = true; });
      return vale ? g.sitio : null;         // un estante que ya no existe, también pendiente
    },
    /* Mover algo de estante. Es lo único que coloca: no hay regla que lo haga
       por su cuenta (ver ZONAS). */
    /* ---------- «ESTO LO HE CAMBIADO YO» ----------
       La app ya tenía dos marcas para eso —`editado`, que impide que el
       catálogo pise una ficha, y `tocado`, la hora que decide quién gana entre
       aparatos— pero mover un ingrediente de estante y borrarlo no las ponían.
       Mientras nadie tocaba esas fichas no se notaba; en cuanto el catálogo
       sube de revisión, tu cambio se revierte solo al abrir el otro aparato.
       (25-sep-2026: ese mismo día subí la revisión de 46 fichas.) */
    marcarTuyo: function (g) {
      if (!g) return;
      g.editado = true;
      g.tocado = new Date().toISOString();
    },

    ponerSitio: function (id, sitio) {
      var g = this.ingrediente(id);
      if (!g) return false;
      var vale = false;
      this.SITIOS.forEach(function (s) { if (s.k === sitio) vale = true; });
      if (!vale) return false;
      g.sitio = sitio;
      this.marcarTuyo(g);
      /* el sitio de destino queda sin confirmar: acabas de meterle una línea
         que no estaba cuando lo contaste */
      if (!this.estado.stockSitios) this.estado.stockSitios = {};
      delete this.estado.stockSitios[sitio];
      this.guardar("ingrediente");
      return true;
    },

    /* ================= EL RECORRIDO: ¿LO TENGO? =================
       Carlos, 24-sep-2026: «voy mirando en el móvil para anotar lo que tengo,
       desde la nevera a la alacena».

       Es la pasada de la despensa, pero recorriendo la CASA en vez del menú.
       La otra —la de antes de comprar— pregunta «¿hay bastante para lo que pide
       la semana?» y sabe la cantidad que hace falta. Ésta no tiene menú
       delante: se hace ANTES de planificar, que es justo cuando todavía no hay
       nada planificado. Así que la pregunta es otra y la respuesta también:

         HAY        hay lo normal: un envase. Es lo que se ve de un vistazo
                    sin contar, y para el 90 % de las líneas basta.
         QUEDA ALGO se escribe la cifra. Es para la media pizza y los 200 g de
                    avena que quedan en la bolsa: lo único que una marca no
                    puede decir.
         NO QUEDA   cero.

       Devuelve las zonas con sus estantes y lo que vive en cada uno, tenga
       cifra o no: lo que se recorre es el mueble, no la lista de lo apuntado. */
    recorrido: function () {
      var self = this, hoy = Util.hoyISO(), comp = this.comprometidoTodo();
      var casa = (this.estado.ingredientes || []).filter(function (g) {
        return !g.oculta && g.cat !== "Restaurante y bar";
      });
      return this.ZONAS.map(function (z) {
        var estantes = z.estantes.map(function (e) {
          var l = casa.filter(function (g) { return self.sitioDe(g) === e.k; })
            .map(function (g) {
              var f = self.fichaStock(g.id);
              var c = (f && f.c > 0) ? f.c : 0;
              var ffm = self.fichaFormato(g);
              return {
                id: g.id, n: g.n, u: g.u, pesoUd: g.pesoUd || 0, envase: g.envase || 0,
                /* lo mismo que enseña el pase, para que la lista no hable otro
                   idioma: cuántos envases hay y cómo se llama el envase */
                pieza: self.tamanoPieza(g), piezas: self.piezasDe(g.id),
                piezaUno: ffm.n[0], piezaVarias: ffm.n[1],
                piezaUd: g.u === "ud",
                racion: g.racion || 0, nivel: (f && f.nivel) || null,
                c: c, anotado: !!f, f: (f && f.f) || null,
                pte: (f && f.pte) || false,
                dias: (f && f.f) ? Util.diasEntre(f.f, hoy) : null,
                comprometido: comp[g.id] || 0,
                libre: Math.max(0, c - (comp[g.id] || 0))
              };
            });
          l.sort(function (a, b) { return a.n.localeCompare(b.n); });
          var contado = (self.estado.stockSitios || {})[e.k] || null;
          return { k: e.k, n: e.n, ing: l,
                   anotados: l.filter(function (x) { return x.nivel; }).length,
                   contado: contado,
                   dias: contado ? Util.diasEntre(contado, hoy) : null };
        });
        return { k: z.k, n: z.n, estantes: estantes,
                 total: estantes.reduce(function (a, x) { return a + x.ing.length; }, 0),
                 anotados: estantes.reduce(function (a, x) { return a + x.anotados; }, 0) };
      });
    },

    /* ---------- LA RESPUESTA DEL RECORRIDO: EN PLATOS, NO EN ENVASES ----------
       Carlos, 24-sep-2026: «lo anoto con más o menos la cantidad: poco /
       suficiente / mucho». Ningún número que teclear, por una razón suya: un
       stock exacto que nadie mantiene acaba mintiendo, y lo ha sufrido
       llevándolo en logística.

       Y el 25-sep, la medida de esos niveles, también suya:
         «poco = un plato, suficiente = dos platos, mucho = más de dos».

       ES MEJOR QUE LO QUE HABÍA. Antes el nivel era una fracción del ENVASE, y
       el envase no dice nada de lo que se cocina. Medido el 24-sep sobre sus
       fichas: el limón y el ajo tenían envase 0, así que sus tres niveles eran
       1 / 1 / 2 —marcarlos no informaba de nada—; y «mucho» de leche eran
       12.000 ml. En platos, «un plato» sale de las propias recetas en 110 de
       los 210 ingredientes (la mediana de lo que piden por ración), de la
       ración en 97 y del envase en 3. Ninguno se queda sin fuente.

       «NADA» NO ES LO MISMO QUE NO MARCADO. (Carlos, 25-sep, con la idea del
       pase ficha a ficha.) Sin marcar significa «no lo he mirado»; «nada»
       significa «he mirado y no hay». Las dos valen cero para la compra, pero
       sólo la segunda dice que el estante está repasado, y esa diferencia es lo
       que permite avisar de «llevas seis semanas sin abrir el congelador» en
       vez de creer que está vacío. */
    /* ---------- DOS MANERAS DE MIRAR UNA COSA ----------
       Carlos, 25-sep-2026, repasando la puerta de la nevera conmigo:

         «En la puerta están los huevos — cantidad de huevos.
          Las salsas todas: botes (lleno - mitad - cuarto).
          El vino blanco son briks pequeños — cantidad de briks: 2, 3, 0,5.
          Mermelada: lleno - mitad - cuarto.»

       Eso es mejor que los cuatro regímenes que yo había calculado, y por una
       razón sencilla: «lleno / mitad / cuarto» es lo que VES al abrir un bote,
       mientras que «poco / suficiente / mucho» era una abstracción mía que
       además había que traducir. Así que quedan dos:

         CONTAR   lo que viene en piezas — huevos, briks, latas, botellas,
                  bandejas, lomos, piezas de fruta. Se cuentan, con medias.
         BOTE     lo que abres y miras por dentro — salsas, mermeladas, cremas,
                  bolsas, especias. Nada / Cuarto / Mitad / Lleno.

       Y la pieza se detecta sola en dos de cada tres fichas: por la unidad
       (`ud`), por el tamaño que el propio nombre declara —«(lata 330 ml)»,
       «(brik 1 L)», «(bandeja 300 g)»— o porque el envase entero es una sola
       ración, que es el caso de las ensaladas preparadas y la lubina. Lo que no
       tiene pieza es, justamente, lo que va en bote. */
    /* ---------- EL FORMATO MANDA ----------
       Carlos, 25-sep-2026, al ver que el mismo producto se comportaba de dos
       maneras según cómo estuviera escrito el nombre:

         «Cacahuetes contaría bolsas: 1,5 · 0,5, y ahí salen los gramos en los
          dos. Doritos, bolsas. Patatas fritas, bolsas. Las almendras como los
          cacahuetes, contar bolsas. Y los pistachos, los dátiles, orejones.»

       Antes, «Cacahuetes tostados con sal (bolsa 200 g)» se contaba en bolsas y
       «Cacahuetes tostados SIN sal» se medía en cuartos de bote, porque uno
       declaraba el tamaño entre paréntesis y el otro no. Eso no era un sistema,
       era un accidente de tecleo.

       Ahora cada ficha lleva `formato` y de ahí sale todo. Y las dos maneras
       que parecían distintas eran la misma: «medio bote» son 0,5 botes y «dos
       latas» son 2 latas. Se cuentan envases con decimales, siempre. Lo único
       que cambia con el formato son LOS ATAJOS que se ofrecen, porque en un
       tarro quieres cuartos y en las latas quieres docenas. */
    FORMATOS: {
      suelto:   { n: ["unidad", "unidades"],   atajos: [0, 1, 2, 3, 4, 6, 12], suelta: true },
      /* LA TERCERA UNIDAD. Carlos, 25-sep-2026: «el pescado va por raciones —
         tengo 4 raciones de bacalao, de salmón, de merluza. La carne debería
         ser igual». No son piezas (un lomo puede ser media ración o dos) ni
         envases (una bandeja trae varias), es lo que vas a poner en un plato.
         Y lo que se guarda son gramos, como siempre: la ración de la ficha es
         la que traduce. */
      racion:   { n: ["ración", "raciones"],   atajos: [0, 1, 2, 3, 4, 6], racion: true },
      lata:     { n: ["lata", "latas"],        atajos: [0, 1, 2, 3, 4, 6, 12] },
      brik:     { n: ["brik", "briks"],        atajos: [0, 0.5, 1, 2, 3, 6] },
      botella:  { n: ["botella", "botellas"],  atajos: [0, 0.25, 0.5, 0.75, 1, 2] },
      tarro:    { n: ["tarro", "tarros"],      atajos: [0, 0.25, 0.5, 0.75, 1, 2] },
      bote:     { n: ["bote", "botes"],        atajos: [0, 0.25, 0.5, 0.75, 1, 2] },
      bolsa:    { n: ["bolsa", "bolsas"],      atajos: [0, 0.25, 0.5, 1, 1.5, 2] },
      paquete:  { n: ["paquete", "paquetes"],  atajos: [0, 0.25, 0.5, 1, 1.5, 2] },
      bandeja:  { n: ["bandeja", "bandejas"],  atajos: [0, 0.5, 1, 2, 3] },
      tarrina:  { n: ["tarrina", "tarrinas"],  atajos: [0, 0.5, 1, 2, 3] },
      caja:     { n: ["caja", "cajas"],        atajos: [0, 1, 2, 3, 4] },
      tableta:  { n: ["tableta", "tabletas"],  atajos: [0, 0.5, 1, 2, 3] },
      malla:    { n: ["malla", "mallas"],      atajos: [0, 0.5, 1, 2] },
      rebanada: { n: ["rebanada", "rebanadas"], atajos: [0, 2, 4, 6, 8, 12] },
      filete:   { n: ["filete", "filetes"],    atajos: [0, 1, 2, 3, 4, 6] },
      barra:    { n: ["barra", "barras"],      atajos: [0, 0.5, 1, 2] },
      sobre:    { n: ["sobre", "sobres"],      atajos: [0, 1, 2, 3, 5, 10] },
      capsula:  { n: ["cápsula", "cápsulas"],  atajos: [0, 5, 10, 20, 30, 50], suelta: true }
    },

    formatoDe: function (g) {
      if (typeof g === "string") g = this.ingrediente(g);
      if (!g) return "suelto";
      if (g.formato && this.FORMATOS[g.formato]) return g.formato;
      return g.u === "ud" ? "suelto" : "bote";
    },

    fichaFormato: function (g) { return this.FORMATOS[this.formatoDe(g)]; },

    nombrePieza: function (g, n) {
      var f = this.fichaFormato(g);
      return (n === 1 || n === -1) ? f.n[0] : f.n[1];
    },

    /* Todo se cuenta en envases; lo que falta es saber cuánto pesa uno. Si la
       pieza no se puede deducir, el envase entero ES la pieza. */
    /* El tamaño que el nombre o el producto declaran: «(lata 330 ml)»,
       «(bandeja 300 g)», «Don Simón Vino Blanco Brik, 3 × 187 ml». */
    RE_PIEZA: /\((?:[^()]*?,\s*)?(?:lata|latas|brik|briks|botella|bandeja|tarrina|caja|unidad|rebanada|tableta|bolsa|frasco|sobre|filete|barra)\s*(?:de\s*)?([\d.,]+)\s*(g|kg|ml|l)\b/i,
    RE_PIEZA_COLA: /,\s*([\d.,]+)\s*(g|kg|ml|l)\s*\)\s*$/i,
    RE_PACK: /(\d+)\s*(?:x|×)\s*([\d.,]+)\s*(g|kg|ml|l)\b/i,

    piezaDe: function (g) {
      if (typeof g === "string") g = this.ingrediente(g);
      if (!g) return null;
      if (g.piezaML > 0) return { c: g.piezaML, de: "ficha" };
      if (g.u === "ud") return { c: 1, de: "unidad" };
      var mp = this.RE_PACK.exec(g.producto || "");
      if (mp) {
        var vp = parseFloat(String(mp[2]).replace(",", "."));
        var up = String(mp[3]).toLowerCase();
        if (up === "kg" || up === "l") vp *= 1000;
        if (vp > 0) return { c: vp, de: "pack del producto" };
      }
      var m = this.RE_PIEZA.exec(g.n) || this.RE_PIEZA_COLA.exec(g.n);
      if (m) {
        var v = parseFloat(String(m[1]).replace(",", "."));
        var u = String(m[2]).toLowerCase();
        if (u === "kg" || u === "l") v *= 1000;
        if (v > 0 && (!(g.envase > 0) ||
            Math.abs(g.envase / v - Math.round(g.envase / v)) < 0.03)) {
          return { c: v, de: "nombre" };
        }
      }
      if (g.envase > 0 && this.racionUso(g) > 0 && g.envase / this.racionUso(g) <= 1.6)
        return { c: g.envase, de: "el envase es la pieza" };
      return null;
    },

    /* LO QUE SE CUENTA ES EL ENVASE, salvo cuando las piezas quedan sueltas.
       Un paquete de pan de molde son dieciséis rebanadas, pero tú ves el
       paquete y dices «me queda medio»; en cambio una malla de cebollas se
       abre y quedan tres cebollas encima de la encimera, y ahí cuentas
       cebollas. Los formatos con `suelta` cuentan la pieza; el resto, el
       envase. (Carlos, 25-sep: «el formato manda».) */
    tamanoPieza: function (g) {
      if (typeof g === "string") g = this.ingrediente(g);
      if (!g) return 1;
      var ff = this.fichaFormato(g);
      if (ff && ff.racion) return g.racion > 0 ? g.racion : this.racionUso(g);
      if (ff && ff.suelta) return g.u === "ud" ? 1 : (g.racion > 0 ? g.racion : 1);
      var p = this.piezaDe(g);
      if (p && p.c > 0 && !(g.u === "ud" && p.de === "unidad")) return p.c;
      if (g.envase > 0) return g.envase;
      if (g.racion > 0) return g.racion;
      return 1;
    },

    /* Cuántas piezas hay ahora apuntadas. */
    /* Cuántos envases hay apuntados. Usa `tamanoPieza`, la MISMA que pinta la
       ficha y la misma con la que escribe `contarStock`: si las tres no usan
       el mismo tamaño, el + y el − dejan de cuadrar con lo que se ve. */
    piezasDe: function (id) {
      var g = this.ingrediente(id);
      if (!g) return 0;
      var tam = this.tamanoPieza(g);
      if (!(tam > 0)) return 0;
      return Math.round(this.stockDe(id) / tam * 100) / 100;
    },

    /* Cuánto de este ingrediente se lleva UN plato. La mediana y no la media:
       una receta que use medio kilo no debe arrastrar al resto. Se usa para
       decir «este bote te da para catorce platos», que era la idea de Carlos
       del 25-sep puesta donde sí significa algo. */
    racionUso: function (g) {
      if (typeof g === "string") g = this.ingrediente(g);
      if (!g) return 1;
      if (!this._racUso) this._racUso = {};
      if (this._racUsoSello !== this._sello) { this._racUso = {}; this._racUsoSello = this._sello; }
      if (this._racUso[g.id] != null) return this._racUso[g.id];
      var usos = [];
      this.visibles().forEach(function (r) {
        (r.ing || []).forEach(function (l) {
          if (l.i === g.id && l.c > 0) usos.push(l.c / (r.raciones || 1));
        });
      });
      var v;
      if (usos.length) {
        usos.sort(function (a, b) { return a - b; });
        var m2 = Math.floor(usos.length / 2);
        v = usos.length % 2 ? usos[m2] : (usos[m2 - 1] + usos[m2]) / 2;
      } else v = g.racion > 0 ? g.racion : (g.envase > 0 ? g.envase : 1);
      this._racUso[g.id] = v;
      return v;
    },

    platosQueDa: function (g, cantidad) {
      if (typeof g === "string") g = this.ingrediente(g);
      if (!g) return 0;
      var r = this.racionUso(g);
      return r > 0 ? Math.round(cantidad / r * 10) / 10 : 0;
    },

    /* El nivel del bote, traducido a cantidad. */
    /* Puente para la vista de lista, que todavía habla de niveles. Los traduce
       a envases: cuarto 0,25 · mitad 0,5 · lleno 1. */
    NIVELES_BOTE: { nada: 0, cuarto: 0.25, mitad: 0.5, lleno: 1,
                    poco: 0.25, suficiente: 1, mucho: 2 },
    nivelesDe: function (g) { return ["nada", "cuarto", "mitad", "lleno"]; },
    cantidadNivel: function (g, nivel) {
      if (typeof g === "string") g = this.ingrediente(g);
      if (!g) return 0;
      var factor = this.NIVELES_BOTE[nivel];
      if (!(factor > 0)) return 0;
      return Math.round(this.tamanoPieza(g) * factor * 100) / 100;
    },

    responderRecorrido: function (id, nivel) {
      var g = this.ingrediente(id);
      if (!g) return false;
      if (!this.estado.stock) this.estado.stock = {};
      if (!nivel) {
        delete this.estado.stock[id];               // volver a «sin mirar»
      } else if (this.NIVELES_BOTE[nivel] == null) {
        return false;
      } else {
        var fac = this.NIVELES_BOTE[nivel];
        this.estado.stock[id] = { c: this.cantidadNivel(g, nivel), piezas: fac,
                                  nivel: nivel, f: Util.hoyISO() };
      }
      this.sellarSitio(id);
      this.guardar("stock");
      return true;
    },

    /* ---------- LO QUE SE CUENTA, SE CUENTA ----------
       Carlos, 24-sep-2026: «hay productos que no vale con mucho / poco /
       suficiente… los huevos por ejemplo, hay que saber si hay 2, 4».
       Tiene razón y se puede medir: de sus 210 ingredientes de casa, 56 van por
       unidades, y ahí el nivel es una estimación cuando el dato exacto está a
       la vista —abres la huevera y los cuentas—. Así que los «ud» se cuentan y
       el resto se estima. La regla es la unidad de la ficha, no una lista de
       productos elegidos a mano. */
    /* n son PIEZAS, no gramos: «2 briks», «3 huevos», «media bandeja». */
    contarStock: function (id, n) {
      var g = this.ingrediente(id);
      if (!g) return false;
      if (!this.estado.stock) this.estado.stock = {};
      n = Number(n);
      /* LA MISMA PIEZA QUE ENSEÑA LA FICHA. Esto llamaba a `piezaDe`, que sólo
         sabe de piezas DECLARADAS, así que en un bote de mayonesa devolvía
         nulo y media unidad se guardaba como 0,5 g; y en la merluza cogía la
         caja de 400 en vez de la ración de 200. `tamanoPieza` es la que manda:
         respeta el formato —ración, envase o pieza suelta— y es la que se
         pinta. (25-sep-2026, probando el + y el − en el móvil.) */
      var tam = this.tamanoPieza(g);
      if (!(n >= 0)) { delete this.estado.stock[id]; }
      else {
        this.estado.stock[id] = {
          c: Math.round(n * tam * 100) / 100, piezas: n,
          f: Util.hoyISO(), contado: true,
          nivel: n <= 0 ? "nada" : "contado"
        };
      }
      this.sellarSitio(id);
      this.guardar("stock");
      return true;
    },

    sellarSitio: function (id) {
      this._sellarStock();
      var k = this.sitioDe(id);
      if (!k) return;
      if (!this.estado.stockSitios) this.estado.stockSitios = {};
      this.estado.stockSitios[k] = Util.hoyISO();
    },

    /* ---------- LOS PLATOS DE UN INGREDIENTE ----------
       Para la ficha del pase, y no de adorno: es la LISTA DE LO QUE BLOQUEA EL
       BORRADO. Carlos, 25-sep-2026: «por eso poner las recetas de cada
       ingrediente, para no eliminar un ingrediente hasta haber modificado la
       receta». Los planificados van primero: si el ingrediente sale en la cena
       del jueves, eso pesa más que salir en una receta que no piensas hacer. */
    platosDe: function (id) {
      /* «PLANIFICADO» ES LO QUE ESTÁ POR COMER, no lo que aparece en el plan.
         Esto marcaba como planificado cualquier plato que estuviera en el plan,
         incluidos los de días pasados y los que ya tienen el tic de comido; y
         entonces la ficha se contradecía sola: arriba «ninguno planificado» —que
         usa la cuenta buena— y abajo un plato marcado en negrita que él se había
         comido el lunes. (Carlos, 25-sep-2026.)
         Ahora se usa la misma regla que `comprometidoTodo`, y lo ya comido se
         dice, que es un dato útil: sabes por qué se gastó. */
      var self = this, hoy = Util.hoyISO(), planif = {}, comido = {};
      Object.keys(this.estado.plan || {}).forEach(function (f) {
        var dia = self.estado.plan[f];
        if (!dia) return;
        ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (t) {
          (dia[t] || []).forEach(function (rid) {
            if (self.estaComido(f, t, rid)) { comido[rid] = f; return; }
            if (f < hoy) return;                       // el pasado ya no espera
            if (self.esFuera(f, t)) return;            // eso no sale de tu despensa
            if (!self.tomaActiva(f, t)) return;
            planif[rid] = true;
          });
        });
      });
      var out = [];
      this.visibles().forEach(function (r) {
        (r.ing || []).forEach(function (l) {
          if (l.i !== id) return;
          if (out.some(function (x) { return x.id === r.id; })) return;
          out.push({ id: r.id, n: r.n, c: l.c,
                     planificado: !!planif[r.id],
                     comido: comido[r.id] || null });
        });
      });
      out.sort(function (a, b) {
        if (a.planificado !== b.planificado) return a.planificado ? -1 : 1;
        if (!!a.comido !== !!b.comido) return a.comido ? -1 : 1;
        return a.n.localeCompare(b.n);
      });
      return out;
    },

    /* ---------- BORRAR UN PRODUCTO DE TU CASA ----------
       Carlos, 25-sep-2026: «tengo dos gazpachos, sólo compro uno; el que no
       compro, si no aparece en ninguna receta, ya no quiero que aparezca como
       ingrediente». Y la guarda, que es suya también: si SÍ aparece en alguna
       receta no se borra — primero se cambia la receta.

       Medido: de los 132 del pase, 69 no salen en ninguna receta (se borran sin
       tocar nada) y 63 están bloqueados. Sus tres gazpachos están en el primer
       grupo. No se destruye la ficha: se oculta, y se recupera desde Catálogo. */
    puedeBorrar: function (id) {
      var platos = this.platosDe(id);
      return { si: !platos.length, platos: platos };
    },

    borrarIngrediente: function (id) {
      var g = this.ingrediente(id);
      if (!g) return { ok: false, motivo: "no existe" };
      var p = this.puedeBorrar(id);
      if (!p.si) return { ok: false, motivo: "lo usan platos", platos: p.platos };
      g.oculta = true;
      this.marcarTuyo(g);
      if (this.estado.stock) delete this.estado.stock[id];
      this._sello++; this._compCache = null;
      this.guardar("ingredientes");
      this.guardar("stock");
      return { ok: true };
    },

    /* ---------- EL PASE FICHA A FICHA ----------
       Carlos, 25-sep-2026: «¿Lo tengo? es un pase de fichas que pasa de una a
       otra al marcar el producto». Un estante cada vez, decisión suya: la
       nevera entera son 61 fichas y su puerta 11, y un túnel largo es como se
       le han muerto otros proyectos. Al acabar el estante se sella con la
       fecha; si lo deja a medias, NO se sella, que es lo que evita creer que
       has hecho la pasada cuando te quedaste en la ficha 60.

       Devuelve todo lo que la ficha necesita ya calculado: la pantalla no tiene
       que saber de recetas ni de raciones. */
    pase: function (estanteK) {
      var self = this, hoy = Util.hoyISO(), comp = this.comprometidoTodo();
      var zona = null, est = null;
      this.ZONAS.forEach(function (z) {
        z.estantes.forEach(function (e) { if (e.k === estanteK) { zona = z; est = e; } });
      });
      if (!est) return null;
      var casa = (this.estado.ingredientes || []).filter(function (g) {
        return !g.oculta && g.cat !== "Restaurante y bar" && self.sitioDe(g) === estanteK;
      });
      casa.sort(function (a, b) { return a.n.localeCompare(b.n); });
      var fichas = casa.map(function (g) {
        var f = self.fichaStock(g.id);
        var platos = self.platosDe(g.id);
        var fmt = self.formatoDe(g), ff = self.FORMATOS[fmt];
        var tam = self.tamanoPieza(g);
        return {
          id: g.id, n: g.n, u: g.u, pesoUd: g.pesoUd || 0,
          producto: g.producto || "", suplente: g.suplente || "",
          formato: fmt,
          pieza: tam,
          piezaUno: ff.n[0],
          piezaVarias: ff.n[1],
          atajos: ff.atajos,
          piezaUd: g.u === "ud",
          racionUso: self.racionUso(g),
          envase: g.envase || 0,
          porEnvase: self.platosQueDa(g, g.envase > 0 ? g.envase : self.racionUso(g)),
          piezas: self.piezasDe(g.id),
          nivel: (f && f.nivel) || null,
          c: (f && f.c > 0) ? f.c : 0,
          contado: !!(f && f.contado),
          marcada: !!f,
          platosLibres: self.platosQueDa(g, Math.max(0, ((f && f.c > 0) ? f.c : 0) - (comp[g.id] || 0))),
          dias: (f && f.f) ? Util.diasEntre(f.f, hoy) : null,
          comprometido: comp[g.id] || 0,
          platos: platos,
          borrable: !platos.length
        };
      });
      var contado = (this.estado.stockSitios || {})[estanteK] || null;
      return {
        zona: zona.n, zonaK: zona.k, estante: est.n, estanteK: estanteK,
        fichas: fichas, total: fichas.length,
        marcadas: fichas.filter(function (x) { return x.marcada; }).length,
        conAlgo: fichas.filter(function (x) { return x.c > 0; }).length,
        dias: contado ? Util.diasEntre(contado, hoy) : null
      };
    },

    /* ---------- EMPEZAR UNA RONDA ----------
       Carlos, 25-sep-2026: «hay un botón que reinicia el control de stock:
       empiezo, lo pulso y comienza por estantes; estante mirado se queda
       marcado, puedo marcar un estante sin mirarlo».

       NO BORRA LAS CANTIDADES. Sólo pone todos los estantes en «sin repasar».
       Lo apuntado la vez anterior sigue valiendo hasta que lo pises, y eso es
       lo que hace que saltarse las especias signifique «siguen como estaban» y
       no «no hay nada» —que metería el estante entero en la lista de la compra
       y es justo el error que la pasada existe para evitar—. Lo que se pierde
       al reiniciar no es el dato, es la CONFIANZA en el dato: la ficha dirá
       «apuntado hace 12 días» hasta que vuelvas a mirarla. */
    iniciarRonda: function () {
      this.estado.stockSitios = {};
      this.estado.rondaStock = Util.hoyISO();
      this._sellarStock();
      this.guardar("stock");
      return true;
    },

    /* ---------- BORRAR DE VERDAD ----------
       «Empezar una ronda» no borra: desprecinta los estantes y conserva las
       cantidades, que es lo que hace que saltarse las especias signifique
       «siguen como estaban». Pero hace falta la otra: empezar de cero sin nada
       apuntado, para probar sin ensuciar y para cuando la despensa ya no se
       parece a lo que dice la app. Va aparte y con confirmación, porque
       deshacerla cuesta una pasada entera. */
    /* ---------- EL SELLO DE LA FOTO DE LA DESPENSA ----------
       Lo apuntado en una pasada es una FOTO, no una suma de trozos: si un
       aparato dice dos botellas y otro dice ninguna, no se fusionan, gana la
       foto más reciente. Y sobre todo: sin esto, BORRAR NO SE PROPAGA. La
       fusión con GitHub coge de la copia remota cualquier clave que falte en
       la tuya, así que vaciar la despensa aquí y sincronizar la devolvía
       entera. (Carlos, 25-sep-2026: «he dado borrar todo lo apuntado, dice que
       lo ha borrado, pone guardado, y al entrar en Puerta siguen los productos
       del pase anterior».) */
    _sellarStock: function () {
      this.estado.stockSello = new Date().toISOString();
    },

    borrarStock: function () {
      var n = Object.keys(this.estado.stock || {}).length;
      this.estado.stock = {};
      this.estado.stockSitios = {};
      this.estado.sitiosSaltados = {};
      this.estado.rondaStock = null;
      this._sello++; this._compCache = null;
      this._sellarStock();
      this.guardar("stock");
      return n;
    },

    /* Dar un estante por visto sin pasar sus fichas. Para las especias, que
       duran meses, o para lo que hoy no piensas abrir. Queda sellado igual,
       pero se anota que no se miró, para poder distinguirlo luego. */
    darPorVisto: function (estanteK) {
      if (!this.estado.stockSitios) this.estado.stockSitios = {};
      this.estado.stockSitios[estanteK] = Util.hoyISO();
      if (!this.estado.sitiosSaltados) this.estado.sitiosSaltados = {};
      this.estado.sitiosSaltados[estanteK] = Util.hoyISO();
      this._sellarStock();
      this.guardar("stock");
      return true;
    },

    /* Al empezar a pasar un estante de verdad, deja de estar «saltado». */
    marcarMirado: function (estanteK) {
      if (this.estado.sitiosSaltados) delete this.estado.sitiosSaltados[estanteK];
      if (!this.estado.stockSitios) this.estado.stockSitios = {};
      this.estado.stockSitios[estanteK] = Util.hoyISO();
      this._sellarStock();
      this.guardar("stock");
      return true;
    },

    /* Cómo va la ronda: qué estantes quedan y cuáles se dieron por vistos. */
    estadoRonda: function () {
      var self = this, sellado = this.estado.stockSitios || {},
          saltado = this.estado.sitiosSaltados || {}, hoy = Util.hoyISO();
      var out = [], hechos = 0, saltados = 0;
      this.ZONAS.forEach(function (z) {
        z.estantes.forEach(function (e) {
          var n = (self.estado.ingredientes || []).filter(function (g) {
            return !g.oculta && g.cat !== "Restaurante y bar" && self.sitioDe(g) === e.k;
          }).length;
          if (!n) return;
          var f = sellado[e.k] || null;
          var hecho = f === hoy;
          if (hecho) { hechos++; if (saltado[e.k] === hoy) saltados++; }
          out.push({ k: e.k, n: e.n, zona: z.n, fichas: n, hecho: hecho,
                     saltado: saltado[e.k] === hoy,
                     dias: f ? Util.diasEntre(f, hoy) : null });
        });
      });
      return { estantes: out, total: out.length, hechos: hechos, saltados: saltados,
               ronda: this.estado.rondaStock || null };
    },

    /* El estante siguiente en el recorrido, para encadenar sin volver al índice. */
    estanteSiguiente: function (estanteK) {
      var planos = [], self = this;
      this.ZONAS.forEach(function (z) {
        z.estantes.forEach(function (e) {
          var n = (self.estado.ingredientes || []).filter(function (g) {
            return !g.oculta && g.cat !== "Restaurante y bar" && self.sitioDe(g) === e.k;
          }).length;
          if (n) planos.push(e.k);
        });
      });
      var i = planos.indexOf(estanteK);
      return (i >= 0 && i + 1 < planos.length) ? planos[i + 1] : null;
    },

    /* ---------- LO QUE NO TIENE SITIO ----------
       Carlos, 24-sep-2026: «cualquier ingrediente nuevo debe aparecer en
       pendiente, y si se usa una receta con él aparece un aviso de que el
       ingrediente no tiene localización».
       Las dos mitades de esa frase están aquí: la lista para la pestaña de
       Localización, y el aviso para cuando ya está metido en un plato. */
    sinColocar: function () {
      var self = this, out = [];
      (this.estado.ingredientes || []).forEach(function (g) {
        if (g.oculta) return;
        if (g.cat === "Restaurante y bar") return;   // no se guarda en casa
        if (self.sitioDe(g)) return;
        out.push(g);
      });
      out.sort(function (a, b) { return a.n.localeCompare(b.n); });
      return out;
    },

    /* Los ingredientes sin estante que usa un plato. Vacío = todo colocado. */
    sinSitioDeReceta: function (recetaId) {
      var self = this, rec = this.receta(recetaId), out = [];
      if (!rec) return out;
      (rec.ing || []).forEach(function (l) {
        var g = self.ingrediente(l.i);
        if (!g || g.oculta) return;
        if (g.cat === "Restaurante y bar") return;
        if (self.sitioDe(g)) return;
        if (out.indexOf(g) < 0) out.push(g);
      });
      return out;
    },

    /* Lo mismo para todo lo planificado de hoy en adelante: lo que alimenta el
       aviso de la pestaña. Devuelve { ingrediente: [nombres de plato] }. */
    avisoSinSitio: function () {
      var self = this, hoy = Util.hoyISO(), fuera = {};
      Object.keys(this.estado.plan || {}).forEach(function (fecha) {
        if (fecha < hoy) return;
        var dia = self.estado.plan[fecha];
        if (!dia) return;
        ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (toma) {
          if (self.esFuera(fecha, toma)) return;
          (dia[toma] || []).forEach(function (rid) {
            var rec = self.receta(rid);
            if (!rec) return;
            self.sinSitioDeReceta(rid).forEach(function (g) {
              if (!fuera[g.id]) fuera[g.id] = { n: g.n, platos: [] };
              if (fuera[g.id].platos.indexOf(rec.n) < 0) fuera[g.id].platos.push(rec.n);
            });
          });
        });
      });
      return fuera;
    },

    nombreSitio: function (k) {
      var n = k;
      this.SITIOS.forEach(function (s) { if (s.k === k) n = s.n; });
      return n;
    },

    /* ---------- stock ---------- */
    fichaStock: function (id) { return (this.estado.stock || {})[id] || null; },
    stockDe: function (id) {
      var f = this.fichaStock(id);
      return f && f.c > 0 ? f.c : 0;
    },
    /* Escribir la cifra es confirmarla: se sella con la fecha de hoy y deja de
       estar pendiente. Cero no se borra —«hoy no queda» es un dato—, pero sí se
       limpia si nunca se había contado. */
    ponerStock: function (id, c) {
      if (!this.estado.stock) this.estado.stock = {};
      c = Number(c);
      if (!(c >= 0)) { delete this.estado.stock[id]; }
      else this.estado.stock[id] = { c: Math.round(c * 100) / 100, f: Util.hoyISO() };
      var sitio = this.sitioDe(id);
      if (sitio) {
        if (!this.estado.stockSitios) this.estado.stockSitios = {};
        this.estado.stockSitios[sitio] = Util.hoyISO();
      }
      this.guardar("stock");
    },

    /* ---------- comprometido ----------
       Se calcula de una vez para todos los ingredientes y se guarda en caché
       hasta el siguiente guardado: preguntarlo ingrediente a ingrediente
       recorrería el plan entero ciento ochenta veces. */
    comprometidoTodo: function () {
      if (this._compCache && this._compSello === this._sello) return this._compCache;
      var self = this, hoy = Util.hoyISO(), fuera = {}, tandas = {};
      Object.keys(this.estado.plan || {}).forEach(function (fecha) {
        if (fecha < hoy) return;                       // el pasado no compromete nada
        var dia = self.estado.plan[fecha];
        if (!dia) return;
        ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (toma) {
          if (self.esFuera(fecha, toma)) return;       // lo de fuera no sale de tu despensa
          if (!self.tomaActiva(fecha, toma)) return;
          var personas = self.comensales(fecha, toma);
          var g = self.agrupar(dia[toma]);
          g.orden.forEach(function (rid) {
            if (self.estaComido(fecha, toma, rid)) return;   // ya comido: ya descontado
            var rec = self.receta(rid);
            if (!rec) return;
            var raciones = personas * g.veces[rid];
            if (rec.tanda) { tandas[rid] = (tandas[rid] || 0) + raciones; return; }
            var factor = raciones / (rec.raciones || 1);
            (rec.ing || []).forEach(function (l) {
              fuera[l.i] = (fuera[l.i] || 0) + l.c * factor;
            });
          });
        });
      });
      /* Una tanda se hace entera aunque solo se coma una porción: compromete
         tandas completas, igual que la compra las pide completas. */
      Object.keys(tandas).forEach(function (rid) {
        var rec = self.receta(rid);
        if (!rec) return;
        var n = Math.ceil(tandas[rid] / (rec.raciones || 1)) || 1;
        (rec.ing || []).forEach(function (l) { fuera[l.i] = (fuera[l.i] || 0) + l.c * n; });
      });
      this._compCache = fuera;
      this._compSello = this._sello;
      return fuera;
    },
    comprometido: function (id) { return this.comprometidoTodo()[id] || 0; },
    libre: function (id) {
      var l = this.stockDe(id) - this.comprometido(id);
      return l > 0 ? l : 0;
    },

    /* ================= COMER GASTA DE LA DESPENSA (24-sep-2026) =================
       El tercer movimiento del stock, y faltaba. Sin él la despensa sólo sabía
       subir: entraba al comprar y no salía nunca, así que se inflaba sola hasta
       el siguiente recuento. Medido antes de arreglarlo, con una pizza de 320 g
       y media por cena:

         planifico   stock   0 · comprometido 320 · libre   0
         compro      stock 320 · comprometido 320 · libre   0
         me la como  stock 320 · comprometido   0 · libre 320   <- mentira

       Te la habías comido y la despensa ofrecía una pizza entera. Y encima el
       error crecía al revés de como se espera: comer SUBÍA lo libre, porque lo
       comprometido caía y el stock no.

       CUÁNTAS RACIONES SALEN DE CASA. No son las que come Carlos: son las de
       todos los que se sientan. Pero la corrección de cantidad real («hoy el
       plátano pesó 104 g») es SUYA, de su ración, no de la de los demás. Así
       que las raciones del hogar son las de los otros comensales tal como se
       planificaron, más la suya con su corrección:

           raciones = (personas − 1) × veces  +  factorPlato

       Con un solo comensal queda `factorPlato`, que es la corrección pura. Sin
       corrección, `factorPlato` vale `veces` y queda `personas × veces`, que es
       exactamente lo que comprometió el plato. Los dos extremos salen bien, y
       marcar comido deshace justo lo que reservó planificar. */
    racionesDeCasa: function (fecha, toma, recetaId, veces) {
      var personas = this.comensales(fecha, toma) || 1;
      var f = this.factorPlato(fecha, toma, recetaId, veces || 1);
      return (personas - 1) * (veces || 1) + f;
    },

    /* Cuántas veces está puesto ese plato en esa toma. */
    vecesEnToma: function (fecha, toma, recetaId) {
      var dia = this.estado.plan[fecha];
      var lista = (dia && dia[toma]) || [];
      var n = 0;
      lista.forEach(function (x) { if (x === recetaId) n++; });
      return n || 1;
    },

    /* Lo que ese plato saca de la despensa, ingrediente a ingrediente. */
    gastoDePlato: function (fecha, toma, recetaId) {
      var rec = this.receta(recetaId);
      if (!rec) return null;
      var veces = this.vecesEnToma(fecha, toma, recetaId);
      var factor = this.racionesDeCasa(fecha, toma, recetaId, veces) / (rec.raciones || 1);
      if (!(factor > 0)) return null;
      var out = {};
      (rec.ing || []).forEach(function (l) { out[l.i] = (out[l.i] || 0) + l.c * factor; });
      return out;
    },

    gastoApuntado: function (fecha, toma, recetaId) {
      var d = this.estado.gastado && this.estado.gastado[fecha];
      var t = d && d[toma];
      return (t && t[recetaId]) || null;
    },

    /* ---------- al marcar comido ----------
       Lo de fuera de casa no sale de tu despensa, igual que no compromete.
       Si la cuenta se queda corta, el stock va a CERO y la línea queda marcada
       `pte`: en su sitio de la despensa se ve como «por confirmar» y el aviso
       de repasar ese sitio salta solo. No bloquea nada — decisión de Carlos,
       24-sep-2026: «a cero y marcado para repasar». */
    gastarDespensa: function (fecha, toma, recetaId) {
      if (this.esFuera(fecha, toma)) return;
      if (this.gastoApuntado(fecha, toma, recetaId)) return;   // ya estaba descontado
      var gasto = this.gastoDePlato(fecha, toma, recetaId);
      if (!gasto) return;
      var self = this, hecho = {};
      Object.keys(gasto).forEach(function (id) {
        var g = self.ingrediente(id);
        if (!g || !self.sitioDe(g)) return;        // restaurante y bar no tiene despensa
        var f = self.fichaStock(id);
        var habia = (f && f.c > 0) ? f.c : 0;
        var quita = gasto[id];
        var corto = quita > habia;
        var queda = corto ? 0 : habia - quita;
        hecho[id] = Math.round((corto ? habia : quita) * 100) / 100;
        /* `pte: "corto"` y no `true` a secas: el `pte` de siempre significa
           «lo tienes pero no sabemos cuánto», y el aviso de la despensa lo dice
           con esas palabras. Aquí lo que ha pasado es lo contrario —se gastó
           más de lo que había apuntado—, y con el mismo aviso quedaría al revés
           de lo que ocurrió. Los dos siguen siendo verdad al preguntar `!!pte`. */
        self.estado.stock[id] = { c: Math.round(queda * 100) / 100,
                                  f: (f && f.f) || null,
                                  pte: corto ? "corto" : ((f && f.pte) || false) };
      });
      if (!Object.keys(hecho).length) return;
      if (!this.estado.gastado) this.estado.gastado = {};
      if (!this.estado.gastado[fecha]) this.estado.gastado[fecha] = {};
      if (!this.estado.gastado[fecha][toma]) this.estado.gastado[fecha][toma] = {};
      this.estado.gastado[fecha][toma][recetaId] = hecho;
    },

    /* Quitar el ✓ devuelve EXACTAMENTE lo que se quitó, ni más. */
    devolverDespensa: function (fecha, toma, recetaId) {
      var hecho = this.gastoApuntado(fecha, toma, recetaId);
      if (!hecho) return;
      var self = this;
      Object.keys(hecho).forEach(function (id) {
        var f = self.fichaStock(id);
        var habia = (f && f.c > 0) ? f.c : 0;
        self.estado.stock[id] = { c: Math.round((habia + hecho[id]) * 100) / 100,
                                  f: (f && f.f) || null, pte: !!(f && f.pte) };
      });
      var g = this.estado.gastado;
      if (g && g[fecha] && g[fecha][toma]) {
        delete g[fecha][toma][recetaId];
        if (!Object.keys(g[fecha][toma]).length) delete g[fecha][toma];
        if (!Object.keys(g[fecha]).length) delete g[fecha];
      }
    },

    /* Lo que hay en un sitio de la casa, con su cuenta hecha. */
    loQueHayEn: function (sitio) {
      var self = this, comp = this.comprometidoTodo(), fuera = [];
      (this.estado.ingredientes || []).forEach(function (g) {
        if (g.oculta) return;
        if (self.sitioDe(g) !== sitio) return;
        var f = self.fichaStock(g.id);
        if (!f) return;
        var c = f.c > 0 ? f.c : 0;
        if (!c && !f.pte) return;             // sin nada y ya contado: no estorba
        fuera.push({ id: g.id, n: g.n, u: g.u, pesoUd: g.pesoUd, envase: g.envase,
                     c: c, f: f.f, pte: !!f.pte,
                     comprometido: comp[g.id] || 0,
                     libre: Math.max(0, c - (comp[g.id] || 0)) });
      });
      fuera.sort(function (a, b) { return a.n.localeCompare(b.n); });
      return fuera;
    },

    /* ================= LO QUE PUEDES GASTAR =================
       Lo primero que sale al añadir un plato: lo que YA está en casa y está
       libre. El orden lo manda lo perecedero —nevera y frutero primero—, porque
       sin fechas de caducidad el sitio donde se guarda algo ya dice lo que corre
       prisa. (Carlos, 22-sep-2026.)

       Dos cosas distintas:
         PRODUCTOS  lo que se come tal cual y está libre. Se reconoce porque el
                    ingrediente tiene `racion`: alguien ya dijo cuánto es una vez.
         RECETAS    las que gastan algo FRESCO que quede libre —solo nevera y
                    frutero—, la que más gasta primero. Con el arroz o el aceite
                    no se ofrece nada: no corren prisa y saldría medio recetario. */

    /* EL CONGELADOR ENTRA (24-sep-2026). Estaba fuera con este motivo escrito
       arriba: «con el arroz o el aceite no se ofrece nada: no corren prisa y
       saldría medio recetario». Para el armario sigue siendo verdad —el aceite
       está en media cocina—, pero en el congelador lo que hay es un lomo de
       bacalao concreto, una bandeja de calamar, unas setas. Carlos lo describió
       así: «si hay bacalao, setas, mango… lo anoto. Luego hago una receta de
       bacalao que necesita cebolla caramelizada. Pues planifica el bacalao y
       sólo pide la cebolla». Con el congelador fuera, esa receta no se ofrecía
       nunca y acababa comprando otro pescado teniendo ése dentro.
       El armario sigue fuera, y a propósito. */
    URGENTES: ["nevera", "frutero", "congelador"],

    loQuePuedesGastar: function (toma) {
      var self = this, comp = this.comprometidoTodo();
      var orden = {}, i;
      for (i = 0; i < this.SITIOS.length; i++) orden[this.SITIOS[i].k] = i;

      /* lo libre, por ingrediente */
      var libres = {};
      (this.estado.ingredientes || []).forEach(function (g) {
        if (g.oculta) return;
        var sitio = self.sitioDe(g);
        if (!sitio) return;
        var c = self.stockDe(g.id) - (comp[g.id] || 0);
        if (c > 0.0001) libres[g.id] = { c: c, sitio: sitio, g: g };
      });

      /* --- productos listos para comer tal cual --- */
      var productos = [];
      Object.keys(libres).forEach(function (id) {
        var x = libres[id];
        if (x.g.racion == null) return;              // no es algo que se coma solo
        var cant = Math.min(x.g.racion, x.c);
        if (!(cant > 0)) return;
        productos.push({ id: id, n: x.g.n, u: x.g.u, pesoUd: x.g.pesoUd,
                         sitio: x.sitio, libre: x.c, racion: cant });
      });
      productos.sort(function (a, b) {
        if (orden[a.sitio] !== orden[b.sitio]) return orden[a.sitio] - orden[b.sitio];
        return a.n.localeCompare(b.n);
      });

      /* ============ LO QUE PUEDES HACER HOY SIN COMPRAR NADA ============
         Carlos, 25-sep-2026, nada más terminar la primera ronda de stock:
         «debería ofrecer platos que se puedan hacer aunque sea de despensa… si
         puedo hacer un arroz entero y unos macarrones debería ser lo primero
         entre lo que elegir».

         Es una regla DISTINTA de la que había, y las dos valen:
           gastar lo perecedero  el bacalao que se estropea (lo de antes)
           poder cocinarlo hoy   el arroz entero, sin pisar el súper (esto)
         La segunda es la que convierte el stock en un menú, y por eso va
         primero: acabas de recorrer la casa apuntando lo que hay, y lo que
         quieres ver es qué cenas salen de ahí.

         Aquí el armario SÍ cuenta. Estaba fuera a propósito para la regla de lo
         perecedero —«con el arroz o el aceite saldría medio recetario»—, pero
         para esta pregunta el arroz es justo lo que la contesta.

         LOS BÁSICOS SE DAN POR SUPUESTOS. Son 22: el aceite, la sal, el arroz,
         la pasta. Si hubiera que tenerlos apuntados uno a uno, con no haber
         contado el aceite NINGUNA receta saldría completa nunca. Es el mismo
         criterio que ya usa la lista de la compra, que los saca aparte en
         «Revisa la despensa» en vez de pedirlos por cuenta. Si apuntas que no
         hay, entonces sí falta.

         Y dos escalones, porque medido sobre el recetario: 44 de las 99 recetas
         llevan de 7 a 10 ingredientes. Exigir las diez exactas dejaría la lista
         vacía casi siempre, y por eso existe «te falta poco»: están todos los
         ingredientes que definen el plato y falta algo de acompañamiento. */
      function loTengo(l) {
        var g = self.ingrediente(l.i);
        if (!g) return false;
        if (g.basico) return self.stockDe(l.i) > 0.0001 || !self.fichaStock(l.i) ||
                              !!(self.fichaStock(l.i) || {}).pte;
        var x = libres[l.i];
        return !!x && x.c >= l.c - 0.0001;
      }
      /* Un ingrediente MENOR no define el plato: los básicos, las especias, el
         pan y las bebidas. Es la misma familia que ya se salta la app para
         decidir cuál es el ingrediente principal de una receta.

         CON UNA EXCEPCIÓN, y se vio probándolo: el arroz es básico, así que en
         un arroz meloso quedaba de accesorio y la receta salía como «te falta
         poco» faltando el arroz. El ingrediente PRINCIPAL de una receta nunca
         es menor, sea lo que sea. Principal = el primero que no es pan, especia
         ni bebida, que es la regla ya medida en el catálogo (96 % de acierto
         contra lo que Carlos diría). */
      function principalDe(r) {
        var lin = r.ing || [];
        for (var k = 0; k < lin.length; k++) {
          var g = self.ingrediente(lin[k].i);
          if (!g) continue;
          if (["Especias y arom\u00e1ticos", "Panader\u00eda", "Bebidas"].indexOf(g.cat) < 0) return lin[k].i;
        }
        return lin.length ? lin[0].i : null;
      }
      function menor(l, princ) {
        var g = self.ingrediente(l.i);
        if (!g) return true;
        if (l.i === princ) return false;
        if (g.basico) return true;
        return ["Especias y arom\u00e1ticos", "Panader\u00eda", "Bebidas"].indexOf(g.cat) >= 0;
      }

      var enteras = [], casi = [], recetas = [];
      this.visibles().forEach(function (r) {
        if (r.grupo === "suelto") return;            // eso ya sale como producto
        var lineas = r.ing || [];
        if (!lineas.length) return;
        var propia = (r.tipo || []).indexOf(toma) >= 0;
        var princ = principalDe(r);

        /* ---- ¿la puedo hacer entera? ---- */
        var faltan = [], faltanMayores = [], frescoQueGasta = 0, mayoresEnCasa = 0;
        lineas.forEach(function (l) {
          var g = self.ingrediente(l.i);
          if (!loTengo(l)) {
            faltan.push(g ? g.n : l.i);
            if (!menor(l, princ)) faltanMayores.push(g ? g.n : l.i);
            return;
          }
          if (!menor(l, princ)) mayoresEnCasa++;
          var x = libres[l.i];
          if (x && self.URGENTES.indexOf(x.sitio) >= 0) frescoQueGasta += Math.min(l.c, x.c);
        });

        if (!faltan.length) {
          enteras.push({ id: r.id, n: r.n, propia: propia, fresco: frescoQueGasta,
                         ing: lineas.length });
          return;
        }
        /* «Te falta poco» exige que quede algo del plato en pie: sin ningún
           ingrediente mayor en casa no te falta poco, te falta el plato. Se vio
           con «Pan tostado Ortiz», cuyo único ingrediente es el propio pan: sin
           pan salía como «te falta poco» faltando todo. */
        if (!faltanMayores.length && mayoresEnCasa > 0 && faltan.length <= 3) {
          casi.push({ id: r.id, n: r.n, propia: propia, fresco: frescoQueGasta,
                      faltan: faltan });
          return;
        }
        /* ---- si no, ¿al menos gasta algo que corre prisa? ---- */
        var gasta = 0, cuales = [];
        lineas.forEach(function (l) {
          var x = libres[l.i];
          if (!x || self.URGENTES.indexOf(x.sitio) < 0) return;
          gasta += Math.min(l.c, x.c);
          cuales.push(x.g.n);
        });
        if (!gasta) return;
        recetas.push({ id: r.id, n: r.n, gasta: gasta, cuales: cuales, propia: propia });
      });

      /* Dentro de cada escalón: primero lo que encaja con la toma, y luego lo
         que más fresco gasta — así, entre dos platos que puedes hacer enteros,
         gana el que salva algo que se estropea. */
      function ordenar(a, b) {
        if (a.propia !== b.propia) return a.propia ? -1 : 1;
        if (b.fresco !== a.fresco) return b.fresco - a.fresco;
        return a.n.localeCompare(b.n);
      }
      enteras.sort(ordenar);
      casi.sort(ordenar);
      recetas.sort(function (a, b) {
        if (a.propia !== b.propia) return a.propia ? -1 : 1;
        return b.gasta - a.gasta;
      });

      return { productos: productos.slice(0, 14),
               enteras: enteras.slice(0, 10),
               casi: casi.slice(0, 8),
               recetas: recetas.slice(0, 8) };
    },

    /* ================= HOGAR =================
       Limpieza, menaje de cocina, aseo y mascota. La línea ES el producto, con
       su marca y su formato: lo que viaja a Amazon es ese nombre, así que una
       línea sin marca no es comprable. Las que vienen de fábrica traen un nombre
       genérico y `pendiente:true`; al ponerles marca dejan de estar pendientes y
       el genérico se guarda debajo para poder reconocerlas dentro de seis meses.

       Nada de stock aquí: estas listas son manuales, marcas lo que te falta y ya.
       Llevar el inventario de las bayetas es trabajo que no paga. */

    APARTADOS: [
      { k: "Limpieza", n: "Limpieza" },
      { k: "Menaje",   n: "Menaje de cocina" },
      { k: "Aseo",     n: "Aseo" },
      { k: "Mascota",  n: "Mascota" }
    ],
    CAJONES: [
      { k: "amazon",      n: "Amazon" },
      { k: "super",       n: "Súper" },
      { k: "suscripcion",  n: "Suscripción" },
      { k: "aparte",      n: "Compra aparte" }
    ],
    nombreCajon: function (k) {
      var n = k;
      this.CAJONES.forEach(function (c) { if (c.k === k) n = c.n; });
      return n;
    },

    hogarDe: function (id) {
      var fuera = null;
      (this.estado.hogarLista || []).forEach(function (x) { if (x.id === id) fuera = x; });
      return fuera;
    },
    faltaHogar: function (id) {
      var m = (this.estado.hogar || {})[id];
      return !!(m && m.falta);
    },
    cantidadHogar: function (id) {
      var m = (this.estado.hogar || {})[id];
      return (m && m.c > 0) ? m.c : 1;
    },
    /* Marcar que falta. Un producto de suscripción marcado «si lo necesitas
       ahora» sale esa vez por Amazon sin dejar de ser de suscripción. */
    marcarFaltaHogar: function (id, si, c) {
      if (!this.estado.hogar) this.estado.hogar = {};
      if (si) this.estado.hogar[id] = { falta: true, c: (c > 0 ? c : 1) };
      else delete this.estado.hogar[id];
      this.guardar("hogar");
    },
    /* Editar la línea: al ponerle marca deja de ser genérica. El nombre de
       fábrica se queda como `generico` para poder reconocerla. */
    guardarHogar: function (id, datos) {
      var x = this.hogarDe(id);
      if (!x) return false;
      if (datos.n && datos.n !== x.n) {
        if (x.pendiente && !x.generico) x.generico = x.n;
        x.n = String(datos.n).slice(0, 90);
        delete x.pendiente;
      }
      if (datos.suplente !== undefined) {
        if (datos.suplente) x.suplente = String(datos.suplente).slice(0, 90);
        else delete x.suplente;
      }
      if (datos.cajon) x.cajon = datos.cajon;
      if (datos.cat) x.cat = datos.cat;
      x.editado = true;
      this.guardar("hogar");
      return true;
    },
    crearHogar: function (n, cat, cajon) {
      n = String(n || "").trim().slice(0, 90);
      if (!n) return null;
      var id = "hg_" + Date.now().toString(36);
      if (!this.estado.hogarLista) this.estado.hogarLista = [];
      this.estado.hogarLista.push({ id: id, n: n, rev: 1,
        cat: cat || "Limpieza", cajon: cajon || "amazon", editado: true });
      this.guardar("hogar");
      return id;
    },
    borrarHogar: function (id) {
      var x = this.hogarDe(id);
      if (!x) return;
      x.oculta = true; x.editado = true;     /* se retira, no se borra */
      delete (this.estado.hogar || {})[id];
      this.guardar("hogar");
    },
    /* Lo de Hogar que hay que comprar, repartido por cajón. La suscripción no
       sale nunca: llega sola. */
    compraHogar: function () {
      var self = this, fuera = { amazon: [], super: [] };
      (this.estado.hogarLista || []).forEach(function (x) {
        if (x.oculta) return;
        if (!self.faltaHogar(x.id)) return;
        if (x.cajon === "aparte") return;                       /* se pide por su cuenta */
        var cajon = x.cajon === "super" ? "super" : "amazon";   /* suscripción marcada = Amazon esta vez */
        fuera[cajon].push({ id: x.id, n: x.n, cat: x.cat, suplente: x.suplente || "",
                            c: self.cantidadHogar(x.id), pendiente: !!x.pendiente,
                            tienda: x.tienda || "",
                            suscripcion: x.cajon === "suscripcion" });
      });
      ["amazon", "super"].forEach(function (k) {
        fuera[k].sort(function (a, b) {
          if (a.cat !== b.cat) return String(a.cat).localeCompare(String(b.cat));
          return a.n.localeCompare(b.n);
        });
      });
      return fuera;
    },

    /* ================= LOS CAJONES DE LA COMPRA =================
       Amazon · Súper · Suscripción. Es una propiedad del PRODUCTO, y vale igual
       para la comida y para lo de casa.

       POR DEFECTO, AMAZON. Carlos compra casi todo en Amazon Fresh, fresco
       incluido (22-sep-2026). Antes el reparto era al revés —solo el armario a
       Amazon— y estaba del revés: con Fresh, la carne y la verdura también
       necesitan marca y formato, porque ese nombre es el que viaja al pedido.

       Lo que NO se compra ahí lleva su `cajon` escrito y entonces manda el suyo:
       el pan sin sal es de Ahorramás y no va a estar en Amazon nunca. */
    /* La SEMILLA del catálogo, por id. Hace falta para dos campos que son míos y
       no tuyos: dónde se compra algo no es una corrección de etiqueta. */
    semillaIng: function (id) {
      if (!this._semIng) {
        this._semIng = {};
        var c = (SEMILLA_BASE && SEMILLA_BASE.ingObj) || null;
        if (c) { Object.keys(c).forEach(function (k) { this._semIng[k] = c[k]; }, this); }
        else (global.DATOS_INGREDIENTES || []).forEach(function (x) { if (x && x.id) this._semIng[x.id] = x; }, this);
      }
      return this._semIng[id] || null;
    },

    /* EN QUÉ TIENDA, cuando el cajón es «super». Nunca se edita a mano en la app,
       así que manda siempre la semilla: si tú corregiste una ficha en el móvil el
       22-sep, tu versión no puede saber nada de un campo que nació el 23. */
    tiendaDe: function (id) {
      var g = typeof id === "string" ? this.ingrediente(id) : id;
      var s = this.semillaIng(g ? g.id : id);
      return (g && g.tienda) || (s && s.tienda) || "";
    },

    cajonDe: function (id) {
      var g = typeof id === "string" ? this.ingrediente(id) : id;
      if (!g) return "amazon";
      /* EL CAJÓN «APARTE» MANDA DESDE LA SEMILLA, y solo ése (23-sep-2026). Nació
         hoy, así que ninguna ficha guardada puede llevarlo elegido a mano: si la
         semilla lo dice, es mío y es nuevo. Sin esto, un ingrediente que hubieras
         corregido antes —el Evowhey, sin ir más lejos— conservaría su cajón viejo
         y se colaría en la lista de Súper, que es justo lo que queremos evitar.
         Los demás cajones NO se tocan: ahí mandas tú, que puedes cambiarlos en la
         ficha del ingrediente. */
      var s = this.semillaIng(g.id);
      if (s && s.cajon === "aparte") return "aparte";
      return g.cajon || "amazon";
    },

    /* ---------- ESTADOS DE UNA LÍNEA DE LA COMPRA ----------
       por pedir → pedido → comprado, y «falta» como excepción.
       Tachar es PEDIR, no recibir: lo que entra en casa entra al confirmar. */
    estaPedido: function (id) { return !!this.estado.compraMarcada[id]; },
    ponerPedido: function (id, si) {
      if (si) this.estado.compraMarcada[id] = true;
      else delete this.estado.compraMarcada[id];
      this.guardar("compra");
    },

    /* CONFIRMAR LA COMPRA. Lo normal es que todo haya llegado: solo se pasan las
       excepciones. `faltas` es { ingredienteId: cuantosEnvasesLlegaron }.
       Lo que llega sube el stock; lo que no, se va a la lista de recados. */
    /* ============ CÓMO SE PIDE CADA COSA ============
       La tercera pata, después de DÓNDE está en casa (`sitio`) y EN QUÉ viene
       (`formato`). Contesta a una pregunta que hasta ahora no tenía respuesta
       escrita en ningún sitio: **cuando ningún plato lo pide, ¿qué pasa?**

       Y no era una pregunta menor. Medido el 25-sep-2026 sobre las 235 fichas
       visibles: 71 —el 30 %— no las pide ninguna receta Y no tienen mínimo. O
       sea que NUNCA entran solas en una lista de la compra. Son los yogures, el
       pan, la fruta que se come sin receta, la cerveza. Todo eso se compraba de
       memoria, fuera de la app.

       Cuatro formas, y la elige Carlos ficha a ficha desde el gestor:
         menu      solo cuando un plato lo pide. Es lo de siempre y el defecto.
         minimo    además se repone solo: si baja del mínimo, entra el lote.
                   Es una ORDEN PERMANENTE, y por eso tiene que ser para pocas
                   cosas — «la leche sí, las fantas zero no».
         capricho  hay que pedirlo a mano. No se repone nunca solo, pero la app
                   te lo pone a un toque en «lo quiero esta vez».
         nunca     no entra en ninguna lista, lo pida quien lo pida: lo de
                   restaurante, la suscripción de SodaStream, lo de HSN y
                   Decathlon que pide él aparte.

       Lo de `nunca` ESTABA YA, pero escondido en dos condiciones dentro de
       `generarCompra` —«si es Restaurante y bar, fuera» y «si el cajón es
       suscripción o aparte, fuera»—. Eso es una regla de negocio metida en el
       código donde nadie la ve ni la puede cambiar. Ahora está en la ficha. */
    MODOS_PEDIR: [
      { k: "menu",     n: "Lo pide el menú",   c: "Solo cuando un plato lo necesita" },
      { k: "minimo",   n: "No debe faltar",    c: "Se repone solo hasta el mínimo" },
      { k: "capricho", n: "Solo si lo pido",   c: "A mano, cuando lo quieras" },
      { k: "nunca",    n: "Nunca en la lista", c: "No se compra por aquí" }
    ],

    /* El modo de una ficha. Si no lo ha puesto él, se DEDUCE — y se deduce de
       forma que la lista salga exactamente igual que salía antes de existir
       este campo. Eso es lo que permite estrenarlo sin que cambie nada el
       primer día: lo que cambia es que ahora se ve y se puede tocar. */
    modoPedir: function (g) {
      if (typeof g === "string") g = this.ingrediente(g);
      if (!g) return "menu";
      if (g.pedir) return g.pedir;
      if (g.cat === "Restaurante y bar") return "nunca";
      /* Por `cajonDe`, no por `g.cajon`: «aparte» puede venir de la semilla
         aunque la copia guardada diga otra cosa, y así era como lo miraba la
         lista antes. Mismo resultado exacto. */
      var caj = this.cajonDe(g);
      if (caj === "suscripcion" || caj === "aparte") return "nunca";
      if (g.minimo > 0) return "minimo";
      return "menu";
    },
    nombreModo: function (k) {
      for (var i = 0; i < this.MODOS_PEDIR.length; i++)
        if (this.MODOS_PEDIR[i].k === k) return this.MODOS_PEDIR[i].n;
      return k;
    },

    ponerModoPedir: function (id, modo) {
      var g = this.ingrediente(id);
      if (!g) return false;
      g.pedir = modo;
      /* Poner «no debe faltar» sin decir cuánto no significa nada: se arranca
         con un mínimo de 1 y un lote de 1, y él lo ajusta.

         AL SALIR DE ESE MODO LOS NÚMEROS NO SE BORRAN (25-sep-2026). Los
         borraba, con el argumento de no dejar una orden permanente dormida.
         Pero la orden no la da el número: la da el MODO, y `generarCompra` ya
         no mira el mínimo de nada que no esté en «no debe faltar». Borrarlos
         solo servía para que un botón de lote —«todas las latas a lo pide el
         menú»— se llevara por delante el 7 y el 24 de la Mahou, que costaron
         una conversación entera. Se quedan guardados y en silencio. */
      if (modo === "minimo") { if (!(g.minimo > 0)) g.minimo = 1; if (!(g.lote > 0)) g.lote = 1; }
      this.marcarTuyo(g);
      this.guardar("catalogo");
      return true;
    },

    /* En LOTE, que es como trabaja él: «todas las latas de bebida, no debe
       faltar». Nunca una decisión por elemento. */
    modoPedirLote: function (ids, modo) {
      var self = this, n = 0;
      (ids || []).forEach(function (id) { if (self.ponerModoPedir(id, modo)) n++; });
      return n;
    },

    ponerMinimoLote: function (id, minimo, lote) {
      var g = this.ingrediente(id);
      if (!g) return false;
      g.minimo = minimo > 0 ? minimo : 1;
      g.lote = lote > 0 ? lote : 1;
      g.pedir = "minimo";
      this.marcarTuyo(g);
      this.guardar("catalogo");
      return true;
    },

    /* Poner el contenedor de golpe a un grupo: las 68 fichas sin formato no se
       arreglan una a una. */
    ponerFormatoLote: function (ids, formato) {
      var self = this, n = 0;
      (ids || []).forEach(function (id) {
        var g = self.ingrediente(id);
        if (!g) return;
        g.formato = formato;
        self.marcarTuyo(g);
        n++;
      });
      if (n) this.guardar("catalogo");
      return n;
    },

    /* LO QUE VE EL GESTOR: las fichas agrupadas por contenedor, que es el eje
       que eligió Carlos — «todas las bolsas juntas» — porque es el que permite
       decidir por lotes y el que deja a la vista las que no tienen contenedor. */
    gestorPedir: function (filtro) {
      var self = this, grupos = {}, cuenta = { menu: 0, minimo: 0, capricho: 0, nunca: 0 };
      var q = filtro ? String(filtro).trim().toLowerCase() : "";
      (this.estado.ingredientes || []).forEach(function (g) {
        if (g.oculta) return;
        var modo = self.modoPedir(g);
        cuenta[modo] = (cuenta[modo] || 0) + 1;
        if (q && g.n.toLowerCase().indexOf(q) < 0) return;
        var k = g.formato || "";
        if (!grupos[k]) grupos[k] = { k: k, fichas: [], modos: { menu: 0, minimo: 0, capricho: 0, nunca: 0 } };
        grupos[k].modos[modo]++;
        grupos[k].fichas.push({
          id: g.id, n: g.n, cat: g.cat, modo: modo,
          minimo: g.minimo || 0, lote: g.lote || 0,
          pieza: self.tamanoPieza(g), u: g.u, pesoUd: g.pesoUd || 0,
          puesto: !!g.pedir,
          platos: self.cuantasRecetas(g.id)
        });
      });
      var fuera = Object.keys(grupos).map(function (k) {
        var ff = self.FORMATOS[k];
        grupos[k].n = ff ? (ff.n[1].charAt(0).toUpperCase() + ff.n[1].slice(1)) : "Sin contenedor";
        grupos[k].fichas.sort(function (a, b) { return a.n.localeCompare(b.n); });
        return grupos[k];
      });
      /* Las que no tienen contenedor, primero: son las que hay que arreglar. */
      fuera.sort(function (a, b) {
        if (!a.k !== !b.k) return a.k ? 1 : -1;
        return b.fichas.length - a.fichas.length;
      });
      return { grupos: fuera, cuenta: cuenta };
    },

    /* En cuántas recetas sale. Se usa para avisar antes de poner «nunca» en
       algo que un plato necesita. */
    cuantasRecetas: function (id) {
      if (!this._cacheUsos) {
        var u = {};
        (this.estado.recetas || []).forEach(function (r) {
          (r.ing || []).forEach(function (l) { u[l.i] = (u[l.i] || 0) + 1; });
        });
        this._cacheUsos = u;
      }
      return this._cacheUsos[id] || 0;
    },
    _cacheUsos: null,

    /* ---------- «LO QUIERO ESTA VEZ» ----------
       Carlos, 25-sep-2026, al ver adónde llevaba ponerle mínimo a todo: «no voy
       a tener refrescos azucarados, no deberían tener un stock mínimo; debería
       añadirse una categoría para añadir a la lista de la compra algo por
       capricho».

       Y tenía razón en lo de fondo: un mínimo es una ORDEN PERMANENTE —la app
       se compromete a que en tu casa siempre haya siete cervezas—. Eso vale
       para la leche y es justo lo contrario de lo que quiere para un capricho.
       Así que hay tres cosas distintas y esta era la que faltaba:
         lo pide el menú   -> entra solo
         no puede faltar   -> mínimo, y que sean pocas cosas
         lo quiero HOY     -> esto: un toque, entra en la próxima compra, y al
                              confirmarla se borra. Sin permanencia.
       Por defecto, lo que no tiene mínimo NO está en casa: si quiere una bolsa
       de doritos la pide esa semana a propósito, y ese pequeño esfuerzo es la
       fricción que hoy no existía. */
    quiereEstaVez: function (id) {
      return !!(this.estado.quiero || {})[id];
    },
    quererEstaVez: function (id, si, piezas) {
      var g = this.ingrediente(id);
      if (!g) return false;
      if (!this.estado.quiero) this.estado.quiero = {};
      if (si === false) delete this.estado.quiero[id];
      else this.estado.quiero[id] = { p: piezas > 0 ? piezas : 1, f: Util.hoyISO() };
      this.guardar("quiero");
      return true;
    },
    loQueQuieres: function () {
      var self = this, out = [];
      Object.keys(this.estado.quiero || {}).forEach(function (id) {
        var g = self.ingrediente(id);
        if (!g || g.oculta) return;
        var ff = self.FORMATOS[self.formatoDe(g)];
        var p = self.estado.quiero[id].p || 1;
        out.push({ id: id, n: g.n, piezas: p, u: g.u, pesoUd: g.pesoUd || 0,
                   pieza: self.tamanoPieza(g),
                   comoSeLlama: p === 1 ? ff.n[0] : ff.n[1],
                   desde: self.estado.quiero[id].f || null });
      });
      out.sort(function (a, b) { return a.n.localeCompare(b.n); });
      return out;
    },

    confirmarCompra: function (lineas, faltas) {
      var self = this;
      faltas = faltas || {};
      if (!this.estado.recados) this.estado.recados = {};
      var entraron = 0, aRecados = 0;
      (lineas || []).forEach(function (l) {
        if (!self.estaPedido(l.id)) return;
        var pedidos = l.envases || 1;
        var llegaron = (faltas[l.id] === undefined) ? pedidos : Math.max(0, Number(faltas[l.id]) || 0);
        if (llegaron > 0) {
          var g = self.ingrediente(l.id);
          var cuanto = g && g.envase ? g.envase * llegaron : l.cantidad;
          var f = self.fichaStock(l.id);
          var ahora = (f && f.c > 0 ? f.c : 0) + cuanto;
          self.estado.stock[l.id] = { c: Math.round(ahora * 100) / 100, f: Util.hoyISO() };
          entraron++;
        }
        if (llegaron < pedidos) {
          self.estado.recados[l.id] = { c: pedidos - llegaron, f: Util.hoyISO(), tipo: "comida" };
          aRecados++;
        }
        delete self.estado.compraMarcada[l.id];
        /* el capricho es de una vez: comprado, se olvida */
        if (self.estado.quiero) delete self.estado.quiero[l.id];
      });
      this.guardar("compra");
      return { entraron: entraron, recados: aRecados };
    },

    /* Lo de Hogar, al confirmar: no hay stock que subir, solo se quita la marca
       o se manda a recados. */
    confirmarHogar: function (ids, faltas) {
      var self = this;
      faltas = faltas || {};
      if (!this.estado.recados) this.estado.recados = {};
      (ids || []).forEach(function (id) {
        if (faltas[id]) {
          var x = self.hogarDe(id);
          self.estado.recados[id] = { c: self.cantidadHogar(id), f: Util.hoyISO(),
                                      tipo: "hogar", n: x ? x.n : id };
        }
        delete (self.estado.hogar || {})[id];
      });
      this.guardar("hogar");
    },

    recadosPendientes: function () {
      var self = this, fuera = [];
      Object.keys(this.estado.recados || {}).forEach(function (id) {
        var r = self.estado.recados[id];
        var n = r.n;
        if (!n) { var g = self.ingrediente(id); n = g ? g.n : id; }
        fuera.push({ id: id, n: n, c: r.c, f: r.f, tipo: r.tipo || "comida" });
      });
      fuera.sort(function (a, b) { return a.n.localeCompare(b.n); });
      return fuera;
    },
    quitarRecado: function (id) {
      delete (this.estado.recados || {})[id];
      this.guardar("compra");
    },

    /* ---------- registro de lo que se come de verdad ---------- */
    estaComido: function (fecha, toma, recetaId) {
      var d = this.estado.comido[fecha];
      return !!(d && d[toma] && d[toma].indexOf(recetaId) >= 0);
    },

    /* ---------- COMPRADO, que no es lo mismo que COMIDO ----------
       Son dos cosas distintas y confundirlas rompía la lista de la compra:
         · COMPRADO = los ingredientes de ese plato ya están en casa. No se vuelven
           a comprar, aunque el plato no se haya cocinado todavía.
         · COMIDO   = el plato se consumió. Cuenta en las calorías del día.
       Lo normal es comprar el domingo para toda la semana: el martes no hay nada
       comido de miércoles a domingo, y sin embargo ya está todo en la nevera. Usar
       «comido» para filtrar la compra —como estaba hasta la v29— te habría hecho
       comprar dos veces la misma semana.
       Y lo COMPRADO PERO NO COMIDO es lo que se queda en la despensa: ver
       `pendientesDespensa()`, que es lo que permite replanificarlo en vez de tirarlo. */
    estaComprado: function (fecha, toma, recetaId) {
      var d = this.estado.comprado[fecha];
      return !!(d && d[toma] && d[toma].indexOf(recetaId) >= 0);
    },

    marcarComprado: function (fecha, toma, recetaId, si) {
      if (!this.estado.comprado[fecha]) this.estado.comprado[fecha] = {};
      var d = this.estado.comprado[fecha];
      if (!d[toma]) d[toma] = [];
      var i = d[toma].indexOf(recetaId);
      if (si && i < 0) d[toma].push(recetaId);
      if (!si && i >= 0) d[toma].splice(i, 1);
      if (!d[toma].length) delete d[toma];
      if (!Object.keys(d).length) delete this.estado.comprado[fecha];
      this.guardar("comprado");
    },

    /* Da por comprado TODO lo planificado en un rango. Es el gesto natural al volver
       del súper: se compró la lista entera, no plato a plato. */
    marcarRangoComprado: function (desdeISO, dias, si) {
      var n = 0, self = this;
      for (var i = 0; i < dias; i++) {
        var f = Util.sumarDias(desdeISO, i);
        var dia = this.estado.plan[f];
        if (!dia) continue;
        Util.TOMAS.forEach(function (t) {
          if (self.esFuera(f, t.k)) return;
          (dia[t.k] || []).forEach(function (rid) {
            if (self.estaComprado(f, t.k, rid) === !!si) return;
            if (!self.estado.comprado[f]) self.estado.comprado[f] = {};
            var d = self.estado.comprado[f];
            if (!d[t.k]) d[t.k] = [];
            var j = d[t.k].indexOf(rid);
            if (si && j < 0) d[t.k].push(rid);
            if (!si && j >= 0) d[t.k].splice(j, 1);
            n++;
          });
        });
      }
      if (n) this.guardar("comprado");
      return n;
    },

    /* Platos COMPRADOS que NO se comieron y cuyo día ya pasó: esa comida está en la
       nevera esperando. Ni se vuelve a comprar ni se tira: se replanifica. */
    pendientesDespensa: function () {
      var self = this, fuera = [];
      Object.keys(this.estado.comprado).forEach(function (f) {
        if (!self.esPasado(f)) return;
        var d = self.estado.comprado[f];
        Object.keys(d).forEach(function (toma) {
          (d[toma] || []).forEach(function (rid) {
            if (self.estaComido(f, toma, rid)) return;
            var rec = self.receta(rid);
            if (!rec) return;
            fuera.push({ f: f, toma: toma, id: rid, n: rec.n });
          });
        });
      });
      fuera.sort(function (a, b) { return a.f < b.f ? -1 : 1; });
      return fuera;
    },

    /* Lleva un pendiente de vuelta al menú. Se conserva la marca de comprado, porque
       los ingredientes siguen siendo los mismos.

       DOS PASADAS, y la segunda importa: con la semana planificada entera, «el primer
       día con esa toma libre» no existe, y el botón se quedaba sin hacer nada. Así que
       si no hay hueco vacío, se pone JUNTO a lo que ya había en el primer día que no
       vaya muy cargado. Eso sube las kcal de ese día, y está bien que las suba: si te
       lo vas a comer, se come.

       Devuelve null si no hay sitio, o { f: fecha, junto: true|false }. */
    reprogramarPendiente: function (fecha, toma, recetaId) {
      var hoy = Util.hoyISO(), self = this;

      function valeElDia(f) {
        var ficha = self.fichaTipoDia(f);
        if (self.esFuera(f, toma) || ficha.mochila.indexOf(toma) >= 0) return false;
        var d = self.estado.plan[f];
        if (d && (d[toma] || []).indexOf(recetaId) >= 0) return false;   // ya está puesto ahí
        return true;
      }
      function ponerlo(f, junto) {
        var dia = self.asegurarDia(f);
        dia[toma] = (dia[toma] || []).concat([recetaId]);
        self.marcarComprado(fecha, toma, recetaId, false);
        self.marcarComprado(f, toma, recetaId, true);
        self.guardar("reprogramar");
        return { f: f, junto: junto };
      }

      var i, f, d;
      /* 1ª pasada: un hueco de verdad, esa toma vacía */
      for (i = 0; i < 21; i++) {
        f = Util.sumarDias(hoy, i);
        if (!valeElDia(f)) continue;
        d = this.estado.plan[f];
        if (d && (d[toma] || []).length) continue;
        return ponerlo(f, false);
      }
      /* 2ª pasada: acompañando, en el primer día que tenga esa toma poco cargada */
      for (i = 0; i < 21; i++) {
        f = Util.sumarDias(hoy, i);
        if (!valeElDia(f)) continue;
        d = this.estado.plan[f];
        if (d && (d[toma] || []).length >= 3) continue;
        return ponerlo(f, true);
      }
      return null;
    },

    marcarComido: function (fecha, toma, recetaId, comido) {
      if (!this.estado.comido[fecha]) this.estado.comido[fecha] = {};
      var d = this.estado.comido[fecha];
      if (!d[toma]) d[toma] = [];
      var i = d[toma].indexOf(recetaId);
      if (comido && i < 0) d[toma].push(recetaId);
      if (!comido && i >= 0) d[toma].splice(i, 1);
      if (!d[toma].length) delete d[toma];
      if (!Object.keys(d).length) delete this.estado.comido[fecha];
      /* EL ✓ ES EL MOMENTO EN QUE EL PLATO DEJA DE SER PLAN Y PASA A SER UN
         HECHO: aquí se le hace la foto. Quitar el ✓ no la borra, porque lo que
         sigue puesto en el día sigue siendo lo que había ese día. */
      if (comido) this.congelarPlato(fecha, recetaId);
      /* Y SALE DE LA DESPENSA. El ✓ es el único momento en que se sabe que la
         comida se ha consumido de verdad; hasta el 24-sep-2026 no lo tocaba y
         el stock sólo sabía subir. Ver `gastarDespensa`. */
      if (comido) this.gastarDespensa(fecha, toma, recetaId);
      else this.devolverDespensa(fecha, toma, recetaId);
      /* SELLO DE DÍA (23-sep-2026). Marcar un ✓ era lo único deliberado que NO
         dejaba rastro por día, así que al unir dos aparatos lo decidía el reloj
         global de todo el estado y un aparato que no sabía nada borraba los ✓.
         Carlos: «marcas, la app dice guardando, guardado… sales y al volver
         aparecen desmarcados». Con este sello, `github.js` sabe qué lado tocó
         ESE día más tarde. */
      this.sellarDia(fecha);
      this.guardar("comido");
    },

    /* ¿queda algo del día sin marcar? */
    hayComidoAlgo: function (fecha) {
      var d = this.estado.comido[fecha];
      return !!(d && Object.keys(d).length);
    },

    /* LOS OBJETIVOS DE CADA MACRO PARA UN DÍA CONCRETO.
       Cada uno se fija de una manera distinta, y no por capricho:

       · La PROTEÍNA va en gramos y no en porcentaje, porque no depende de lo que
         comas ese día sino del músculo que quieres conservar: 1,8 g por kilo de
         peso objetivo. Un día que entrenas y comes 400 kcal más no necesitas más
         proteína, necesitas más comida.
       · La GRASA va en porcentaje de las calorías del día —30 % por defecto—,
         que es como se maneja y como se mueve sola cuando el objetivo sube.
       · Los HIDRATOS son LO QUE QUEDA. Si se fijaran los tres por separado, los
         días de entreno sumarían más del 100 % y ninguno cuadraría.
       · La SAL es el aviso ámbar (2 g), no el techo rojo (4): el criterio de
         Carlos es reducir todo lo posible, no llegar al tope.

       Devuelve gramos, no porcentajes: el porcentaje lo saca quien lo pinta. */
    objetivosMacros: function (fecha) {
      var c = this.estado.config;
      var kcal = (fecha ? this.objetivoDelDia(fecha) : 0) || c.objetivoKcal || 2000;
      var prot = c.objetivoProt || 90;
      var grasa = Math.round(kcal * (typeof c.pctGrasa === "number" ? c.pctGrasa : 30) / 100 / 9);
      var hid = Math.round(Math.max(0, kcal - prot * 4 - grasa * 9) / 4);
      return { k: kcal, p: prot, g: grasa, h: hid, sal: c.avisoSal || 2 };
    },

    semaforoKcal: function (kcal, objetivo) {
      var c = this.estado.config;
      if (objetivo == null) objetivo = c.objetivoKcal;
      if (!objetivo) return "verde";
      var margen = objetivo * (c.margenKcal || 10) / 100;
      if (kcal > objetivo + margen) return "rojo";
      if (kcal < objetivo - margen * 2) return "ambar";   // quedarse muy corto también avisa
      return "verde";
    },

    /* medias de la semana: {kcal, sal, prot} por día con algo planificado */
    resumenSemana: function (lunesISO) {
      var t = { k: 0, p: 0, g: 0, h: 0 }, sal = 0, dias = 0;
      for (var i = 0; i < 7; i++) {
        var f = Util.sumarDias(lunesISO, i);
        var dia = this.estado.plan[f];
        if (!dia) continue;
        var algo = false;
        ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (x) {
          if ((dia[x] || []).length) algo = true;
        });
        if (!algo) continue;
        var n = this.nutrDia(f);
        t.k += n.k; t.p += n.p; t.g += n.g; t.h += n.h;
        sal += this.salDia(f);
        dias++;
      }
      if (!dias) return null;
      return { dias: dias, k: t.k / dias, p: t.p / dias, g: t.g / dias, h: t.h / dias, sal: sal / dias };
    },

    /* ---------- perfil, gasto y actividad ---------- */
    actividad: function (id) {
      var l = this.estado.actividades || [];
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },

    /* Metabolismo basal — Mifflin-St Jeor */
    tmb: function () {
      var p = this.estado.perfil || {};
      if (!p.peso || !p.altura || !p.edad) return 0;
      var base = 10 * p.peso + 6.25 * p.altura - 5 * p.edad;
      return p.sexo === "m" ? base - 161 : base + 5;
    },

    /* Gasto diario sin contar el ejercicio que se registre a mano */
    gastoBase: function () {
      var p = this.estado.perfil || {};
      return this.tmb() * (p.actividadBase || 1.2);
    },

    /* kcal de UNA entrada de actividad: la medida por el reloj si la hay, si no la estimada.
       Se resta 1 MET a propósito, y no es un detalle: el objetivo del día ya incluye lo
       que gastas estando vivo esas horas. La fórmula bruta (met × 3,5 × kg / 200) cuenta
       ese metabolismo basal OTRA VEZ. En una sesión de 40 minutos sobran 30 kcal y da
       igual; en una ruta de seis horas sobran casi 600, y ahí ya no da igual.
       Lo que devuelve es el gasto NETO: las calorías de más que te ha costado moverte. */
    kcalDeEntrada: function (x) {
      if (typeof x.kcal === "number" && x.kcal > 0) return x.kcal;
      var peso = (this.estado.perfil || {}).peso || 0;
      var a = this.actividad(x.a);
      if (!a || !peso) return 0;
      var met = Math.max(0, a.met - 1);

      /* SEGUNDA CORRECCIÓN (17-sep-2026). La fórmula clásica da por hecho que 1 MET
         son 3,5 ml de O2 por kg y minuto, o sea 0,0175 kcal/kg/min, para todo el
         mundo. Eso es la media de una persona de unos 70 kg, y en alguien con
         sobrepeso sobrestima: la grasa pesa en el denominador pero gasta mucho menos
         que el músculo. Un trabajo del International Journal of Obesity lo midió y
         encontró sobrestimaciones del 16,6% al 38,8% según el IMC.
         Aquí no hace falta un factor de corrección inventado, porque ya tenemos SU
         metabolismo basal calculado por Mifflin-St Jeor: 1 MET es, por definición,
         su gasto en reposo. Se usa eso. Para él son 0,0133 kcal/kg/min en vez de
         0,0175: la constante le sobrestimaba un 32%.
         Sin perfil no hay TMB, y entonces se cae a la constante de siempre. */
      var tmbMin = this.tmb() / 1440;
      if (tmbMin > 0) return met * tmbMin * (x.min || 0);
      return met * 3.5 * peso / 200 * (x.min || 0);
    },

    /* ==================== EL ENTRENO DEL DÍA ====================

       Tres procedencias y UNA regla: lo real SUSTITUYE a lo que lo esperaba.

         del plan   lo que toca hoy. Está para poder preparar la comida.
         apuntado   lo que añades a mano porque vas a hacer algo no previsto.
         real       lo que midió el reloj, vía intervals.

       Si el plan preveía pesas por 200 kcal y la serie sale en 300, las 300
       SUSTITUYEN a las 200: se suman 100 más, no 300 más. Y si además haces
       algo que no estaba previsto, eso SÍ se suma entero, porque no había
       ninguna previsión ocupando su sitio.

       El emparejamiento es por FAMILIA —caminar, bici, fuerza, correr…— que es
       lo único que se puede saber sin adivinar: salud.json no dice el deporte,
       lo dice el nombre. Una salida real tapa una previsión de su familia, y
       sólo una: dos paseos el mismo día tapan la previsión de caminar y el
       segundo se suma.

       LO PREVISTO CADUCA. Cuenta hoy y en los días que vienen, que es para lo
       que sirve —saber con qué cuentas al preparar la comida—. En un día ya
       pasado, una previsión que nunca se cumplió no es una caloría: es un
       entreno que no hiciste, y contarla sería regalarte el déficit de ese día
       sin enterarte. */

    puenteEntreno: function () {
      return (typeof window !== "undefined" && window.KHBEntreno) ? window.KHBEntreno : null;
    },

    /* La familia de una entrada apuntada a mano, por su actividad del catálogo. */
    famDeActividad: function (id) {
      var t = String(id || "").toLowerCase();
      if (t.indexOf("sender") === 0) return "sender";
      if (t.indexOf("caminar") === 0) return "caminar";
      if (t.indexOf("bici") === 0) return "bici";
      if (t.indexOf("muscula") === 0) return "fuerza";
      if (t.indexOf("estira") === 0) return "movilidad";
      if (t.indexOf("nata") === 0) return "otra";
      return "otra";
    },

    /* El entreno del día, ya resuelto: qué cuenta, qué sustituye a qué y por qué.
       Devuelve una lista en orden de lectura con `clase` y, si toca, `tapada`. */
    entrenoDelDia: function (fecha) {
      var self = this, pu = this.puenteEntreno();
      var hoy = (new Date()).toISOString().slice(0, 10);
      var pasado = fecha < hoy;
      var out = [];

      /* 1 · LO REAL. Lo que midió el reloj cuenta siempre y entero. Si ese día
         importaste el fichero de Garmin a mano, manda lo tuyo: contar las dos
         cosas sería contar el entreno dos veces. */
      var guardadas = ((this.estado.actividad || {})[fecha] || []);
      var importado = guardadas.some(function (x) { return x.fuente === "garmin"; });
      var reales = [];
      if (pu && !importado) {
        (pu.real(fecha) || []).forEach(function (a) {
          if (a.kcal == null || a.kcal <= 0) return;
          reales.push({ n: a.nombre, min: a.min, kcal: a.kcal, fam: a.fam,
                        clase: "real", id: a.id });
        });
      }

      /* Cuántas salidas reales hay de cada familia: cada una tapa UNA previsión. */
      var tapas = {};
      reales.forEach(function (r) { tapas[r.fam] = (tapas[r.fam] || 0) + 1; });
      guardadas.forEach(function (x) {
        if (x.fuente !== "garmin") return;
        var f = self.famDeActividad(x.a);
        tapas[f] = (tapas[f] || 0) + 1;
      });

      /* 2 · LO APUNTADO A MANO. Lo tapa una salida real de su familia, igual
         que al plan: lo escribiste porque ibas a hacerlo, y ya se midió.

         EL ENTRENO ESTÁNDAR NO ES «APUNTADO», ES «PREVISTO»  ·  24-sep-2026
         Las entradas con `ref:"estandar"` las pone el botón del entreno
         estándar, no la mano. Se guardaban igual que lo apuntado, así que
         contaban al 70 % y —esto es lo gordo— NO CADUCABAN NUNCA: un día que
         pasó sin hacerlas seguía sumando sus calorías para siempre. Carlos lo
         vio en el día 23: dos líneas de «Bici indoor moderada» y «Musculación
         en casa» que él no había puesto, sumando 188 kcal al objetivo, con la
         ficha del día ya cerrada. Y encima la pantalla las rotulaba
         «previsto» mientras la cuenta las llamaba «lo que añadiste»: el
         rótulo decía una cosa y el número otra.
         Ahora son previsión de verdad: las tapa una salida real de su familia
         y caducan solas en cuanto el día pasa sin hacerlas. */
      guardadas.forEach(function (x, idx) {
        var f = (x.fuente === "garmin") ? self.famDeActividad(x.a) : self.famDeActividad(x.a);
        var esReloj = x.fuente === "garmin";
        var esEstandar = !esReloj && x.ref === "estandar";
        var tapada = false;
        if (!esReloj) {
          if (tapas[f] > 0) { tapas[f]--; tapada = true; }
        }
        out.push({ x: x, idx: idx, n: self.nombreDeEntrada(x), min: x.min || 0,
                   kcal: Math.round(self.kcalDeEntrada(x)), fam: f,
                   clase: esReloj ? "real" : (esEstandar ? "previsto" : "apuntado"),
                   tapada: tapada,
                   caducada: esEstandar && !tapada && pasado });
      });

      /* 3 · LO PREVISTO POR EL PLAN. Lo tapa una salida real de su familia, y
         caduca si el día ya pasó sin que llegara. */
      if (pu) {
        (pu.previsto(fecha) || []).forEach(function (sx) {
          if (!sx.kcal) return;
          var tapada = false;
          if (tapas[sx.fam] > 0) { tapas[sx.fam]--; tapada = true; }
          out.push({ n: sx.t, min: sx.min, kcal: sx.kcal, fam: sx.fam,
                     clase: "previsto", tapada: tapada,
                     caducada: !tapada && pasado });
        });
      }

      /* Las reales van al final de la lista pero primero en la cuenta. */
      reales.forEach(function (r) { out.push(r); });
      return out;
    },

    /* Lo que suma cada procedencia, ya descontado lo tapado y lo caducado. */
    kcalPorProcedencia: function (fecha) {
      var r = { real: 0, previsto: 0, apuntado: 0, tapado: 0, caducado: 0 };
      this.entrenoDelDia(fecha).forEach(function (e) {
        if (e.pisada) return;
        if (e.tapada) { r.tapado += e.kcal; return; }
        if (e.caducada) { r.caducado += e.kcal; return; }
        if (e.clase === "real") r.real += e.kcal;
        else if (e.clase === "previsto") r.previsto += e.kcal;
        else r.apuntado += e.kcal;
      });
      return r;
    },

    /* kcal que quema la actividad registrada un día.
       La salida PLANIFICADA de un día de ruta (`ref: "ruta"`) es una estimación hecha
       con tablas de MET, que es lo mejor que se puede hacer por adelantado. En cuanto
       llega la medida del reloj, esa estimación sobra: si no se descartara, el día
       contaría la ruta dos veces, la prevista y la real. Manda siempre el reloj. */
    kcalActividad: function (fecha) {
      var lista = this.estado.actividad[fecha] || [];
      var self = this, total = 0;
      var hayReloj = lista.some(function (x) { return x.fuente === "garmin"; });
      lista.forEach(function (x) {
        if (hayReloj && x.ref === "ruta") return;
        total += self.kcalDeEntrada(x);
      });
      return total;
    },

    nombreDeEntrada: function (x) {
      if (x.n) return x.n;
      var a = this.actividad(x.a);
      return a ? a.n : x.a;
    },

    /* Déficit diario que sale del ritmo de pérdida elegido (1 kg de grasa ≈ 7.700 kcal). */
    deficitDiario: function () {
      var p = this.estado.perfil || {};
      return (p.ritmo || 0) * 7700 / 7;
    },

    /* Lo que GASTAS ese día: el gasto de estar vivo más el ejercicio.
       Del ejercicio se cuenta solo una parte (`devolucionEjercicio`, 70% de serie)
       porque las tablas de MET estiman por encima de lo que mide un reloj. */
    gastoDelDia: function (fecha) {
      var c = this.estado.config;
      var dev = typeof c.devolucionEjercicio === "number" ? c.devolucionEjercicio : 0.70;
      /* Cuánto de lo PREVISTO por el plan se adelanta antes de hacerlo. A la
         mitad: comerse entero un entreno que aún no has hecho es la forma más
         silenciosa de quedarse sin déficit. Cuando llega la medida del reloj,
         la previsión se cae y cuenta lo real entero. */
      var pre = typeof c.previsionEjercicio === "number" ? c.previsionEjercicio : 1;
      var k = this.kcalPorProcedencia(fecha);
      /* EL 70% ES PARA LAS TABLAS DE MET, NO PARA EL RELOJ.
         Ese descuento existe porque «las tablas de MET estiman por encima de lo
         que mide un reloj». Aplicárselo a una medida del reloj es descontarle
         un 30% a un dato bueno: una ruta de 900 kcal medidas contaba 630.
         Lo medido cuenta entero; lo estimado, descontado. */
      return this.gastoBase() + k.real + k.apuntado * dev + k.previsto * pre;
    },

    /* Lo que deberías COMER ese día = lo que gastas menos el déficit programado.
       Esta es la cadena entera: actividad → gasto → calorías del día → menú.
       Si el perfil no tiene edad, altura y peso no hay TMB y no hay cadena; en ese
       caso se cae al objetivo fijo de Ajustes para no dejar la app sin números. */
    objetivoDelDia: function (fecha) {
      var c = this.estado.config;
      var dev = typeof c.devolucionEjercicio === "number" ? c.devolucionEjercicio : 0.70;
      var pre = typeof c.previsionEjercicio === "number" ? c.previsionEjercicio : 1;
      var gasto = this.gastoDelDia(fecha);
      if (!this.tmb()) {
        var kk = this.kcalPorProcedencia(fecha);
        return (c.objetivoKcal || 0) +
               Math.round(kk.real + kk.apuntado * dev + kk.previsto * pre);
      }
      var obj = Math.round(gasto - this.deficitDiario());
      /* Suelo de seguridad: por debajo de esto no se baja aunque lo pida el ritmo. */
      var minimo = (this.estado.perfil || {}).sexo === "m" ? 1200 : 1500;
      return Math.max(minimo, obj);
    },

    /* ¿El objetivo de hoy está tocando el suelo de seguridad? Sirve para avisar. */
    objetivoEnSuelo: function (fecha) {
      if (!this.tmb()) return false;
      var minimo = (this.estado.perfil || {}).sexo === "m" ? 1200 : 1500;
      return Math.round(this.gastoDelDia(fecha) - this.deficitDiario()) < minimo;
    },

    /* ---------- entreno previsto ---------- */
    /* El entreno estándar de la config, con su nombre y sus kcal ya calculadas. */
    fichaEntrenoEstandar: function () {
      var self = this;
      var lista = (this.estado.config.entrenoEstandar || []).map(function (x) {
        var a = self.actividad(x.a);
        return { a: x.a, n: a ? a.n : x.a, min: x.min,
                 kcal: Math.round(self.kcalDeEntrada({ a: x.a, min: x.min })) };
      }).filter(function (x) { return x.n; });
      var total = 0, min = 0;
      lista.forEach(function (x) { total += x.kcal; min += x.min; });
      return { lista: lista, kcal: total, min: min };
    },

    /* Pone el entreno estándar en un día. Solo si ese día no tiene NADA apuntado:
       una previsión no pisa nunca lo que ya hayas puesto tú ni lo que traiga el reloj.
       Los días de ruta se saltan: ya tienen su salida planificada. */
    aplicarEntrenoEstandar: function (fecha, forzar) {
      if (this.esPasado(fecha)) return 0;              // no se inventa un entreno pasado
      if (this.fichaTipoDia(fecha).ruta) return 0;
      var lista = this.estado.actividad[fecha] || [];
      if (lista.length && !forzar) return 0;
      if (forzar) {
        /* al forzar se quitan solo las previsiones anteriores, nunca lo medido */
        for (var i = lista.length - 1; i >= 0; i--) {
          if (lista[i].ref === "estandar") lista.splice(i, 1);
        }
        if (lista.some(function (x) { return x.fuente === "garmin"; })) return 0;
      }
      var puestos = 0, self = this;
      (this.estado.config.entrenoEstandar || []).forEach(function (x) {
        if (!self.actividad(x.a) || !(x.min > 0)) return;
        if (!self.estado.actividad[fecha]) self.estado.actividad[fecha] = [];
        self.estado.actividad[fecha].push({ a: x.a, min: x.min, ref: "estandar" });
        puestos++;
      });
      if (puestos) this.guardar("entreno");
      return puestos;
    },

    /* Cambia los minutos de una entrada de actividad ya puesta. */
    ajustarActividad: function (fecha, idx, min) {
      var l = this.estado.actividad[fecha];
      if (!l || !l[idx]) return;
      if (!(min > 0)) { this.quitarActividad(fecha, idx); return; }
      l[idx].min = Math.round(min);
      /* si la entrada traía kcal medidas por el reloj, cambiar los minutos a mano
         las invalida: se borran y se vuelve a estimar */
      if (l[idx].fuente !== "garmin") delete l[idx].kcal;
      this.guardar("actividad");
    },

    /* Objetivo que sale del perfil: gasto menos el déficit del ritmo elegido
       (1 kg de grasa ≈ 7.700 kcal) */
    objetivoSugerido: function () {
      var G_PROT_KG = 1.8;
      var g = this.gastoBase();
      if (!g) return null;
      var p = this.estado.perfil || {};
      var deficit = (p.ritmo || 0) * 7700 / 7;
      var kcal = Math.round((g - deficit) / 10) * 10;
      var minimo = p.sexo === "m" ? 1200 : 1500;          // suelo de seguridad
      var limitado = kcal < minimo;
      if (limitado) kcal = minimo;
      var refPeso = p.pesoObjetivo || p.peso || 0;
      return {
        tmb: Math.round(this.tmb()),
        gasto: Math.round(g),
        deficit: Math.round(deficit),
        kcal: kcal,
        /* 1,8 g por kilo de PESO OBJETIVO, no del de hoy: la proteína la necesita
           el músculo que quieres conservar, no la grasa que quieres perder. Con
           80 kg de objetivo son 144 g al día.
           Se subió de 1,6 a 1,8 el 21-sep-2026 a petición de Carlos. La horquilla
           que se maneja en déficit haciendo fuerza va de 1,6 a 2,2; 1,6 era el
           extremo bajo —el que se cumple comiendo normal— y 2,2 pedía batidos. */
        prot: Math.round(refPeso * G_PROT_KG),
        limitado: limitado,
        semanas: (p.peso && p.pesoObjetivo && p.ritmo)
          ? Math.ceil((p.peso - p.pesoObjetivo) / p.ritmo) : null
      };
    },

    anotarPeso: function (fecha, kg) {
      var lista = this.estado.pesos;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].f === fecha) { lista[i].kg = kg; this.estado.perfil.peso = kg; this.guardar("peso"); return; }
      }
      lista.push({ f: fecha, kg: kg });
      lista.sort(function (a, b) { return a.f < b.f ? -1 : 1; });
      this.estado.perfil.peso = lista[lista.length - 1].kg;
      this.guardar("peso");
    },

    anadirActividad: function (fecha, idAct, min, extra) {
      if (!this.estado.actividad[fecha]) this.estado.actividad[fecha] = [];
      var e = { a: idAct, min: min };
      if (extra) {
        if (extra.kcal) e.kcal = Math.round(extra.kcal);
        if (extra.n) e.n = extra.n;
        if (extra.fuente) e.fuente = extra.fuente;
        if (extra.ref) e.ref = extra.ref;        // identificador para no importar dos veces
      }
      this.estado.actividad[fecha].push(e);
      this.guardar("actividad");
      return e;
    },

    /* ¿ya está importada esta actividad? (misma referencia del fichero) */
    yaImportada: function (fecha, ref) {
      var l = this.estado.actividad[fecha] || [];
      for (var i = 0; i < l.length; i++) if (ref && l[i].ref === ref) return true;
      return false;
    },

    quitarActividad: function (fecha, idx) {
      var l = this.estado.actividad[fecha];
      if (!l) return;
      l.splice(idx, 1);
      if (!l.length) delete this.estado.actividad[fecha];
      this.guardar("actividad");
    },

    /* ---------- plan ---------- */
    /* ==================== TIPOS DE DÍA ====================
       Un día no siempre se come igual. Los tres tipos cambian qué recetas
       se ofrecen, si se aplica el tope de sal y qué entra en la compra.

       «ruta» es el importante: en una jornada larga de monte o bici se pierde
       MUCHO sodio sudando —unos 2,1 g de sal por litro de sudor, y en cuatro
       horas se sudan dos o tres litros—, más de lo que el tope diario deja
       comer. Restringir ese día no solo no ayuda: sudar mucho, beber agua sola
       y comer poco sodio es el cuadro de la hiponatremia por ejercicio, y para
       el oído es el mismo vaivén de osmolaridad que la dieta quiere evitar,
       solo que hacia el otro lado. Por eso el semáforo de sal se apaga. */
    /* `mochila` son las tomas que ese día se comen FUERA DE CASA y por tanto solo
       admiten recetas `llevable`. En un día de ruta el desayuno y la cena se hacen
       en casa: sales por la mañana y vuelves para cenar, así que restringirlos a
       comida de mochila no tenía ningún sentido. Solo van a la mochila el almuerzo,
       la comida y la merienda, que son las tres tomas que caen en el monte. */
    TIPOS_DIA: {
      casa: { n: "En casa",           icono: "🏠", topeSal: true,  mochila: [], ruta: false },
      ruta: { n: "Outdoor", icono: "🥾", topeSal: false, ruta: true,   /* era «Ruta o bici larga»:
                 no cabía en la fila del día junto a Completar y Vaciar. Carlos, 23-sep-2026.
                 «Fuera» estaba descartado: ya significa comer fuera de casa en esa misma ficha. */
              mochila: ["almuerzo", "comida", "merienda"] }
    },

    /* Salidas que se pueden planificar en un día de ruta. El id apunta al catálogo
       de actividades, y `h` son las horas que se proponen por defecto. */
    DEPORTES_RUTA: [
      { id: "senderismo",        h: 4 },
      { id: "senderismo_fuerte", h: 4 },
      { id: "bici_carretera",    h: 3 },
      { id: "bici_btt",          h: 3 },
      { id: "bici_paseo",        h: 2 }
    ],

    /* ---------- la guarda del pasado ----------
       Un día que ya ha pasado no se planifica: no tiene sentido que «Rellenar huecos»
       le ponga la cena del martes que viene, ni que el entreno estándar le invente
       una sesión de bici que no hiciste. Y sobre todo, no debe pisar el registro de
       lo que comiste y entrenaste de verdad, que es el único dato honesto que hay.
       HOY NO cuenta como pasado: el día en curso se planifica con normalidad. */
    esPasado: function (fecha) { return fecha < Util.hoyISO(); },

    tipoDia: function (fecha) {
      var d = this.estado.plan[fecha];
      var t = d && d.tipo;
      return this.TIPOS_DIA[t] ? t : "casa";
    },
    ponerTipoDia: function (fecha, tipo) {
      if (!this.TIPOS_DIA[tipo]) return;
      var d = this.asegurarDia(fecha);
      d.tipo = tipo;
      this.guardar("tipo-dia");
    },
    fichaTipoDia: function (fecha) { return this.TIPOS_DIA[this.tipoDia(fecha)]; },

    /* `capricho` es el sexto cajón del día, y no es una toma más: no se planifica,
       no tiene comensales, no se come fuera y no entra en la lista de la compra.
       Es lo que te comiste sin que estuviera previsto. */
    diaVacio: function () { return { tipo: "casa", desayuno: [], almuerzo: [], comida: [], merienda: [], cena: [], capricho: [] }; },

    asegurarDia: function (fecha) {
      if (!this.estado.plan[fecha]) this.estado.plan[fecha] = this.diaVacio();
      if (!this.estado.plan[fecha].tipo) this.estado.plan[fecha].tipo = "casa";
      /* Los días guardados antes del 21-sep-2026 no traen el cajón */
      if (!this.estado.plan[fecha].capricho) this.estado.plan[fecha].capricho = [];
      return this.estado.plan[fecha];
    },

    /* Recetas que se pueden meter en una mochila: se comen frías, no se
       derraman y aguantan horas sin nevera. */
    llevables: function () {
      return this.estado.recetas.filter(function (r) { return r.llevable && !r.oculta; });
    },

    /* `oculta: true` retira una receta sin borrarla. Hace falta porque la app no borra
       recetas: lo que está guardado en el móvil se queda. Cuando una deja de interesar
       (las de espinacas, 17-sep-2026), se marca oculta y se le sube el `rev`; entonces
       desaparece del buscador, del selector y de todo lo automático, pero si estaba en
       un menú pasado sigue viéndose, que es lo correcto: eso ya te lo comiste. */
    visibles: function () {
      return this.estado.recetas.filter(function (r) { return !r.oculta; });
    },

    /* La receta más calórica de una toma. En un día de ruta el desayuno se hace en
       casa y es la comida que prepara toda la jornada: ahí no interesa el desayuno
       de diario de 250 kcal, interesa el más fuerte que haya. */
    masCalorica: function (toma) {
      var self = this, mejor = null, maxK = -1;
      this.estado.recetas.forEach(function (r) {
        if ((r.tipo || []).indexOf(toma) < 0) return;
        var k = self.nutrReceta(r).k;
        if (k > maxK) { maxK = k; mejor = r; }
      });
      return mejor;
    },

    /* Rellena un día entero con lo que le toca según su tipo. Respeta lo que
       ya haya puesto: solo completa las tomas vacías.
       Decide TOMA A TOMA, no el día entero: en un día de ruta el desayuno y la
       cena salen de la plantilla (se hacen en casa) y solo el almuerzo, la comida
       y la merienda salen del cajón de la mochila. */
    rellenarDia: function (fecha, plantillaId) {
      if (this.esPasado(fecha)) return 0;              // el pasado no se planifica
      var d = this.asegurarDia(fecha);
      var ficha = this.fichaTipoDia(fecha);
      var self = this;
      var puesto = 0;
      var pool = ficha.mochila.length ? this.llevables() : [];

      var p = null, plId = plantillaId || "A";
      this.estado.plantillas.forEach(function (x) { if (x.id === plId) p = x; });
      var molde = null;
      if (p) {
        var idx = Util.diasEntre(Util.lunesDe(fecha), fecha);
        molde = p.dias[idx] || p.dias[0];
      }

      Util.TOMAS.forEach(function (t) {
        if ((d[t.k] || []).length) return;                 // ya hay algo puesto: no se toca
        if (self.esFuera(fecha, t.k)) return;              // esa toma se come fuera
        if (!self.tomaActiva(fecha, t.k)) return;          // p.ej. merienda en día de descanso

        if (ficha.mochila.indexOf(t.k) >= 0) {
          if (!pool.length) return;
          var aptas = pool.filter(function (r) { return !r.oculta && (r.tipo || []).indexOf(t.k) >= 0; });
          if (!aptas.length) aptas = pool;
          /* reparto estable: el mismo día siempre propone lo mismo */
          var semilla = 0, s = fecha + t.k;
          for (var i = 0; i < s.length; i++) semilla = (semilla * 31 + s.charCodeAt(i)) % 100000;
          d[t.k] = [aptas[semilla % aptas.length].id];
          puesto++;
          return;
        }

        /* Se come en casa. En día de ruta, el desayuno va a por el más fuerte. */
        if (ficha.ruta && t.k === "desayuno") {
          var fuerte = self.masCalorica("desayuno");
          if (fuerte) { d[t.k] = [fuerte.id]; puesto++; return; }
        }
        if (!molde) return;
        d[t.k] = (molde[t.k] || []).slice();
        if (d[t.k].length) puesto++;
      });

      /* el yogur y el pan tostado de comida y cena van siempre */
      /* La plantilla REHACE el día desde el molde, así que aquí sí se olvida
         todo lo que habías decidido para ese día: las tomas que vaciaste y los
         fijos que quitaste. Es lo que quieres al empezar de cero. */
      this.olvidarVaciadas(fecha);
      this.olvidarQuitados(fecha);
      puesto += this.ponerFijos(fecha);

      /* El bidón entra SIEMPRE en un día de ruta: es el único sitio del recetario
         donde reponer sodio es lo correcto, y si no se pone solo se olvida justo
         el día que hace falta. */
      if (ficha.ruta) {
        var bid = "mochila_bebida_reposicion";
        if (this.receta(bid)) {
          var yaEsta = Util.TOMAS.some(function (t) { return (d[t.k] || []).indexOf(bid) >= 0; });
          if (!yaEsta) { d.almuerzo.push(bid); puesto++; }
        }
      }
      return puesto;
    },

    /* ---------- fijos de todos los días ----------
       El yogur con avena y el pan tostado van en comida y cena SIEMPRE. No se ponen
       en las tomas que se comen fuera (no las cocina él) ni en las de mochila de un
       día de ruta (el pan tostado en una mochila acaba hecho migas). */
    /* UNA TOMA QUE VACÍAS TÚ NO SE VUELVE A LLENAR SOLA (23-sep-2026).
       Carlos: «borro todo hasta los yogures con copos que pone por defecto, añado
       el yogur griego y vuelven a aparecer el yogur con copos y el pan de mesa».
       La regla de «si la toma estaba vacía es que la montas desde cero, así que
       entran los fijos» sirve para una semana nueva, pero al vaciar a propósito
       hace justo lo contrario de lo que quieres. Queda anotado en el día, y lo
       borran los rellenos que pides tú a posta: «Completar» y la plantilla. */
    marcarVaciada: function (fecha, toma, si) {
      var d = this.asegurarDia(fecha);
      if (si) { if (!d.sinFijos) d.sinFijos = {}; d.sinFijos[toma] = 1; return; }
      if (d.sinFijos) { delete d.sinFijos[toma]; if (!Object.keys(d.sinFijos).length) delete d.sinFijos; }
    },
    estaVaciada: function (fecha, toma) {
      var d = this.estado.plan[fecha];
      return !!(d && d.sinFijos && d.sinFijos[toma]);
    },
    olvidarVaciadas: function (fecha) {
      var d = this.estado.plan[fecha];
      if (d) delete d.sinFijos;
    },

    /* ---------- QUITAR UN FIJO SIN VACIAR LA TOMA (25-sep-2026) ----------
       El guardián de arriba mira si la TOMA quedó vacía. Carlos borró sólo el
       yogur con copos de una comida que tenía otros cuatro platos, así que la
       toma nunca estuvo vacía, no quedó ninguna marca, y al pulsar «Completar»
       el yogur volvió. Su frase: «no sé si ese yogur con copos de avena lo
       borré, volvió a ponerse solo.. creo recordar que lo borré».

       Y lo había borrado. El fallo es que la app anotaba «has vaciado esta
       toma» cuando lo que él había dicho era «hoy este plato no». Son dos cosas
       distintas y ahora se anotan por separado: la decisión es POR PLATO.

       Cuánto dura: sobrevive a «Completar», que sólo rellena huecos y no tiene
       por qué resucitar lo que acabas de quitar. La PLANTILLA sí lo olvida,
       porque rehace el día entero desde el molde — ahí estás empezando de cero
       a propósito. Y volver a ponerlo a mano lo borra, como es lógico. */
    quitarFijo: function (fecha, toma, receta) {
      var esFijo = false;
      (this.estado.config.fijos || []).forEach(function (f) {
        if (f.r === receta && (f.tomas || []).indexOf(toma) >= 0) esFijo = true;
      });
      if (!esFijo) return false;
      var d = this.asegurarDia(fecha);
      if (!d.quitados) d.quitados = {};
      if (!d.quitados[toma]) d.quitados[toma] = [];
      if (d.quitados[toma].indexOf(receta) < 0) d.quitados[toma].push(receta);
      return true;
    },
    olvidarQuitado: function (fecha, toma, receta) {
      var d = this.estado.plan[fecha];
      if (!d || !d.quitados || !d.quitados[toma]) return;
      d.quitados[toma] = d.quitados[toma].filter(function (x) { return x !== receta; });
      if (!d.quitados[toma].length) delete d.quitados[toma];
      if (!Object.keys(d.quitados).length) delete d.quitados;
    },
    olvidarQuitados: function (fecha) {
      var d = this.estado.plan[fecha];
      if (d) delete d.quitados;
    },
    estaQuitado: function (fecha, toma, receta) {
      var d = this.estado.plan[fecha];
      return !!(d && d.quitados && d.quitados[toma] &&
                d.quitados[toma].indexOf(receta) >= 0);
    },

    ponerFijos: function (fecha) {
      if (this.esPasado(fecha)) return 0;
      var d = this.asegurarDia(fecha);
      var ficha = this.fichaTipoDia(fecha);
      var self = this, puestos = 0;
      (this.estado.config.fijos || []).forEach(function (f) {
        if (!self.receta(f.r)) return;
        (f.tomas || []).forEach(function (toma) {
          if (self.esFuera(fecha, toma)) return;
          if (self.estaVaciada(fecha, toma)) return;   /* la vaciaste tú */
          if (self.estaQuitado(fecha, toma, f.r)) return;  /* este plato lo quitaste tú */
          if (ficha.mochila.indexOf(toma) >= 0) return;
          if (!d[toma]) d[toma] = [];
          if (d[toma].indexOf(f.r) >= 0) return;
          d[toma].push(f.r);
          puestos++;
        });
      });
      return puestos;
    },

    /* ---------- completar el día hasta el objetivo ----------
       Elige platos para los huecos buscando que el día CUADRE con las calorías que
       toca comer. No es un optimizador: es una propuesta razonable y rápida que luego
       se retoca a mano, que es como se usa esto de verdad.

       Cómo elige, por orden de importancia:
       1. El tamaño del plato: cada toma tiene su parte del día (ver `repartoTomas`)
          y se busca la receta que más se le acerque con lo que queda de presupuesto.
       2. La sal: a igualdad de calorías gana la que menos lleve. Es el criterio de
          fondo del recetario y aquí no se abandona.
       3. La variedad: penaliza lo que ya esté esa misma semana, para no acabar con
          lentejas cuatro días seguidos.
       Nunca quita nada de lo que ya hay puesto, y nunca toca un día pasado. */
    /* Cuánto penaliza la sal de un plato al elegirlo. No es un número fijo: depende
       de cuánta sal lleve ya el día. Un día normal tiene margen y 250 puntos por
       gramo basta para desempatar; un día que ya viene cargado —porque come fuera,
       por ejemplo, que son 3,5 g de un golpe— tiene que apretar mucho más, o el
       resto del día lo remata. En un día de ruta no se penaliza: ahí no hay tope. */
    penalizaSal: function (fecha, salYa, salPlato) {
      if (!this.fichaTipoDia(fecha).topeSal) return 0;
      var tope = this.estado.config.limiteSal || 4;
      var aviso = this.estado.config.avisoSal || 2;
      var total = salYa + salPlato;
      var nota = salPlato * 250;
      if (total > aviso) nota += (total - aviso) * 400;     // ya en ámbar: aprieta
      if (total > tope)  nota += (total - tope) * 2500;     // pasarse del tope, casi vetado
      return nota;
    },

    completarDia: function (fecha, plantillaId) {
      if (this.esPasado(fecha)) return { motivo: "pasado" };
      var self = this;
      var d = this.asegurarDia(fecha);
      var ficha = this.fichaTipoDia(fecha);
      var objetivo = this.objetivoDelDia(fecha);
      if (!objetivo) return { motivo: "sin-objetivo" };

      /* «Completar» rellena huecos: puede devolver los fijos a una toma que
         vaciaste entera, pero NO resucita un plato que has quitado a propósito
         hoy. Ésa es la diferencia con la plantilla. */
      this.olvidarVaciadas(fecha);
      var puestos = this.ponerFijos(fecha);

      /* lo que ya hay esta semana, para no repetir */
      var yaEnLaSemana = {};
      var lunes = Util.lunesDe(fecha);
      for (var i = 0; i < 7; i++) {
        var f = Util.sumarDias(lunes, i);
        var dd = this.estado.plan[f];
        if (!dd) continue;
        Util.TOMAS.forEach(function (t) {
          (dd[t.k] || []).forEach(function (id) { yaEnLaSemana[id] = (yaEnLaSemana[id] || 0) + 1; });
        });
      }

      var reparto = this.estado.config.repartoTomas || {};
      var pool = ficha.mochila.length ? this.llevables() : null;

      /* Se recorren las tomas de mayor a menor peso: los platos grandes primero,
         porque son los que deciden si el día cuadra. */
      var orden = Util.TOMAS.slice().sort(function (a, b) {
        return (reparto[b.k] || 0) - (reparto[a.k] || 0);
      });

      /* Los fijos NO cuentan como «la toma ya está puesta»: una comida con el yogur y
         el pan sigue sin tener plato. Antes se daba por llena y el día se quedaba mil
         calorías corto. */
      var esFijo = {};
      (this.estado.config.fijos || []).forEach(function (f) { esFijo[f.r] = true; });

      orden.forEach(function (t) {
        if (self.esFuera(fecha, t.k)) return;
        if (!self.tomaActiva(fecha, t.k)) return;
        var puestosYa = (d[t.k] || []);
        var propios = puestosYa.filter(function (id) { return !esFijo[id]; });
        if (propios.length) return;                        // ya hay plato: no se toca

        /* lo que los fijos ya ocupan de la cuota de esta toma */
        var yaEnLaToma = 0;
        puestosYa.forEach(function (id) { yaEnLaToma += self.nutrEn(fecha, id).k; });

        var restante = objetivo - self.nutrDia(fecha).k;
        var cuota = Math.round(objetivo * (reparto[t.k] || 0.2)) - yaEnLaToma;
        /* si ya se ha pasado del objetivo, esta toma se queda pequeña a propósito */
        var busco = Math.max(80, Math.min(cuota, restante));

        var candidatas = (pool && ficha.mochila.indexOf(t.k) >= 0 ? pool : self.estado.recetas)
          .filter(function (r) { return !r.oculta && (r.tipo || []).indexOf(t.k) >= 0; });
        if (!candidatas.length && pool && ficha.mochila.indexOf(t.k) >= 0) candidatas = pool;
        if (!candidatas.length) return;

        var salYa = self.salDia(fecha);
        var mejor = null, mejorNota = Infinity;
        candidatas.forEach(function (r) {
          var k = self.nutrReceta(r).k;
          var sal = self.salReceta(r);
          var nota = Math.abs(k - busco) + (yaEnLaSemana[r.id] || 0) * 300 +
                     self.penalizaSal(fecha, salYa, sal);
          if (nota < mejorNota) { mejorNota = nota; mejor = r; }
        });
        if (!mejor) return;
        /* el plato va DELANTE de los fijos, que son el acompañamiento */
        d[t.k] = [mejor.id].concat(puestosYa);
        yaEnLaSemana[mejor.id] = (yaEnLaSemana[mejor.id] || 0) + 1;
        puestos++;
      });

      /* SEGUNDA VUELTA: la guarnición.
         Una guarnición no es un plato suelto, es lo que acompaña al principal. Por eso
         `tipo:["guarnicion"]` no coincide con ninguna de las cinco tomas y, hasta la
         v25, el completador NO PODÍA ELEGIR NINGUNA: había ocho guarniciones en el
         recetario que el botón no usaba jamás. Se añaden aquí, a la comida y a la cena,
         cuando el día se queda corto — que es justo lo que hace una guarnición. */
      var falta = objetivo - this.nutrDia(fecha).k;
      if (falta > 120) {
        ["comida", "cena"].forEach(function (toma) {
          if (self.esFuera(fecha, toma)) return;
          if (ficha.mochila.indexOf(toma) >= 0) return;     // en la mochila no hay guarnición
          if (!(d[toma] || []).length) return;              // sin plato no hay a qué acompañar
          falta = objetivo - self.nutrDia(fecha).k;
          if (falta < 100) return;
          var guar = self.estado.recetas.filter(function (r) {
            return !r.oculta && (r.tipo || []).indexOf("guarnicion") >= 0 &&
                   (d[toma] || []).indexOf(r.id) < 0;
          });
          if (!guar.length) return;
          var salHoy2 = self.salDia(fecha);
          var eleg = null, mejor = Infinity;
          guar.forEach(function (r) {
            var nota = Math.abs(self.nutrReceta(r).k - falta) + (yaEnLaSemana[r.id] || 0) * 300 +
                       self.penalizaSal(fecha, salHoy2, self.salReceta(r));
            if (nota < mejor) { mejor = nota; eleg = r; }
          });
          if (!eleg) return;
          d[toma].push(eleg.id);
          yaEnLaSemana[eleg.id] = (yaEnLaSemana[eleg.id] || 0) + 1;
          puestos++;
        });
      }

      /* Y si todavía falta, se refuerzan el almuerzo y la merienda con un segundo
         bocado, que es donde cabe sin desmontar el día. */
      falta = objetivo - this.nutrDia(fecha).k;
      if (falta > 250) {
        ["merienda", "almuerzo"].forEach(function (toma) {
          if (self.esFuera(fecha, toma)) return;
          if (!self.tomaActiva(fecha, toma)) return;
          falta = objetivo - self.nutrDia(fecha).k;
          if (falta < 180) return;
          var base = (pool && ficha.mochila.indexOf(toma) >= 0) ? pool : self.estado.recetas;
          var aptas = base.filter(function (r) {
            return !r.oculta && (r.tipo || []).indexOf(toma) >= 0 && (d[toma] || []).indexOf(r.id) < 0;
          });
          if (!aptas.length) return;
          var salHoy = self.salDia(fecha);
          var elegida = null, nota = Infinity;
          aptas.forEach(function (r) {
            var n = Math.abs(self.nutrReceta(r).k - falta) + (yaEnLaSemana[r.id] || 0) * 300 +
                    self.penalizaSal(fecha, salHoy, self.salReceta(r));
            if (n < nota) { nota = n; elegida = r; }
          });
          if (!elegida) return;
          d[toma].push(elegida.id);
          yaEnLaSemana[elegida.id] = (yaEnLaSemana[elegida.id] || 0) + 1;
          puestos++;
        });
      }

      var kcal = Math.round(this.nutrDia(fecha).k);
      if (puestos) this.guardar("completar");
      return { puestos: puestos, kcal: kcal, objetivo: objetivo, desvio: kcal - objetivo };
    },

    completarSemana: function (lunesISO, plantillaId) {
      var total = 0, dias = 0, self = this;
      for (var i = 0; i < 7; i++) {
        var f = Util.sumarDias(lunesISO, i);
        var r = this.completarDia(f, plantillaId);
        if (r && r.puestos) { total += r.puestos; dias++; }
      }
      return { puestos: total, dias: dias };
    },

    /* Planifica la salida de un día de ruta: deporte y horas. Marca el día como de
       ruta y registra la actividad, que es lo que sube el objetivo de calorías del
       día por la vía normal (`objetivoDelDia`). Sustituye la anterior si la había,
       para que cambiar las horas no acumule dos salidas. */
    planearRuta: function (fecha, idDeporte, horas) {
      var act = this.actividad(idDeporte);
      if (!act || !(horas > 0)) return null;
      var d = this.asegurarDia(fecha);
      d.tipo = "ruta";
      d.ruta = { a: idDeporte, h: horas };

      var lista = this.estado.actividad[fecha] || (this.estado.actividad[fecha] = []);
      for (var i = lista.length - 1; i >= 0; i--) {
        if (lista[i].ref === "ruta") lista.splice(i, 1);
      }
      var min = Math.round(horas * 60);
      lista.push({ a: idDeporte, min: min, ref: "ruta" });
      this.guardar("ruta");
      return { min: min, kcal: Math.round(this.kcalDeEntrada({ a: idDeporte, min: min })) };
    },

    /* Lo que hay planificado de salida ese día, o null. */
    fichaRuta: function (fecha) {
      var d = this.estado.plan[fecha];
      if (!d || !d.ruta) return null;
      var act = this.actividad(d.ruta.a);
      if (!act) return null;
      var min = Math.round(d.ruta.h * 60);
      return { a: d.ruta.a, n: act.n, h: d.ruta.h, min: min,
               kcal: Math.round(this.kcalDeEntrada({ a: d.ruta.a, min: min })) };
    },

    /* Rellena la semana entera respetando el tipo de cada día: comida Y entreno. */
    rellenarSemana: function (lunesISO, plantillaId) {
      /* EL DEPORTE NO SE PONE SOLO (23-sep-2026). Carlos: «los añadidos de deporte
         han de ser voluntarios por mí, salvo los del plan, que se ponen de forma
         automática». Rellenar la semana aplicaba además el «entreno estándar» de
         Ajustes a los SIETE días y lo guardaba como si lo hubiera apuntado él
         —bici indoor y musculación, con su ✕ y sus minutos editables—, y eso le
         subía las calorías del día sin haber hecho nada.
         Lo del plan no se toca: ésa sí es automática, y además ni se guarda, se
         calcula, y se retira sola cuando llega el dato del reloj o el día pasa.
         El botón «Estándar» de cada día sigue estando para cuando lo quiera. */
      var total = 0;
      for (var i = 0; i < 7; i++) {
        total += this.rellenarDia(Util.sumarDias(lunesISO, i), plantillaId);
      }
      if (total) this.guardar("rellenar");
      return { tomas: total, dias: 0 };
    },

    aplicarPlantilla: function (plantillaId, lunesISO) {
      var p = null;
      this.estado.plantillas.forEach(function (x) { if (x.id === plantillaId) p = x; });
      if (!p) return false;
      var self = this;
      p.dias.forEach(function (d, idx) {
        var fecha = Util.sumarDias(lunesISO, idx);
        if (self.esPasado(fecha)) return;              // el pasado no se replanifica
        /* El tipo de día lo puso él y manda sobre la plantilla: no se pisa, y
           las tomas que ese tipo no planifica se quedan vacías (así no acaban
           en la lista de la compra comidas que va a hacer fuera). */
        var tipo = self.tipoDia(fecha);
        var ficha = self.TIPOS_DIA[tipo];
        var viejo = self.estado.plan[fecha] || {};
        var nuevo = { tipo: tipo };
        /* Lo que decidió él sobre ese día no lo pisa una plantilla: la salida
           planificada, quién come y qué tomas son fuera de casa. */
        if (viejo.ruta) nuevo.ruta = viejo.ruta;
        if (viejo.fuera) nuevo.fuera = viejo.fuera.slice();
        if (viejo.comensales) nuevo.comensales = JSON.parse(JSON.stringify(viejo.comensales));
        Util.TOMAS.forEach(function (t) {
          /* Se dejan vacías las que rellenarDia trata aparte: las de mochila, las
             que se comen fuera y el desayuno de un día de ruta (que va a por el
             más fuerte del recetario en vez del de la plantilla). */
          var salta = self.esFuera(fecha, t.k) || ficha.mochila.indexOf(t.k) >= 0 ||
                      (ficha.ruta && t.k === "desayuno");
          nuevo[t.k] = salta ? [] : (d[t.k] || []).slice();
        });
        self.estado.plan[fecha] = nuevo;
        /* las tomas de mochila y el desayuno fuerte de ruta los pone rellenarDia */
        if (ficha.mochila.length || ficha.ruta) self.rellenarDia(fecha, plantillaId);
      });
      this.guardar("plantilla");
      return true;
    },

    /* Vaciar la semana borra TODO LO PLANIFICADO: el menú, el tipo de cada día, la
       salida de los días de ruta, quién come, lo que se comía fuera y el entreno
       previsto. Antes solo borraba el menú y el entreno se quedaba ahí contando
       calorías en una semana por lo demás vacía.
       Lo que NO se toca es lo MEDIDO: las actividades que vienen del reloj son el
       registro de lo que hiciste de verdad, no un plan, y borrar eso sería perder
       datos. Tampoco se toca el peso. */
    vaciarSemana: function (lunesISO) {
      var borrados = { dias: 0, entrenos: 0, medidas: 0, pasados: 0 };
      for (var i = 0; i < 7; i++) {
        var f = Util.sumarDias(lunesISO, i);
        /* Los días ya vividos no se vacían: ahí está lo que comiste y lo que hiciste,
           y eso es un registro, no un plan. Vaciar la semana en miércoles borra de
           miércoles en adelante. */
        if (this.esPasado(f)) { borrados.pasados++; continue; }
        if (this.estado.plan[f]) { delete this.estado.plan[f]; borrados.dias++; }
        delete this.estado.comido[f];              // sin plan no hay nada que marcar

        var lista = this.estado.actividad[f];
        if (lista) {
          var medidas = lista.filter(function (x) { return x.fuente === "garmin"; });
          borrados.entrenos += lista.length - medidas.length;
          borrados.medidas += medidas.length;
          if (medidas.length) this.estado.actividad[f] = medidas;
          else delete this.estado.actividad[f];
        }
      }
      this.guardar("vaciar");
      return borrados;
    },

    /* ---------- lista de la compra ---------- */
    /* Devuelve { secciones:[{nombre, lineas:[...]}], basicos:[...] } */
    /* Los rangos que puede cubrir la compra. La lista NO es «la semana que estás
       mirando»: eso era lo que había y no lo adivinaba nadie. Es un rango propio,
       elegido a mano, y que NUNCA incluye días pasados: no se compra la comida del
       lunes un jueves. */
    RANGOS_COMPRA: {
      resto:    { n: "Lo que queda de esta semana",     desde: "hoy",   hasta: "finSemana" },
      siguiente:{ n: "La semana que viene",             desde: "lunes+7", hasta: "domingo+7" },
      hasta14:  { n: "De hoy a fin de la semana que viene", desde: "hoy", hasta: "domingo+7" }
    },

    /* Devuelve {desde, hasta, dias, n} del rango elegido, ya recortado al futuro. */
    rangoCompra: function (clave) {
      var hoy = Util.hoyISO();
      var lunes = Util.lunesDe(hoy);
      var r = this.RANGOS_COMPRA[clave] || this.RANGOS_COMPRA.resto;
      var desde = r.desde === "hoy" ? hoy : Util.sumarDias(lunes, 7);
      var hasta = r.hasta === "finSemana" ? Util.sumarDias(lunes, 6) : Util.sumarDias(lunes, 13);
      if (desde > hasta) desde = hasta;                    // domingo por la tarde
      return { desde: desde, hasta: hasta, dias: Util.diasEntre(desde, hasta) + 1, n: r.n };
    },

    /* `opciones.saltarComido`: no compra lo que ya está marcado como comido. Sirve
       para el día en curso, donde media jornada ya está hecha. */
    /* ---------- los PLATOS del rango, con su estado ----------
       La pestaña Compra enseña INGREDIENTES, que es lo que se mete en el carro. Pero
       lo que uno decide al volver del súper no es «tengo 180 g de lomo», es «la comida
       del viernes ya la tengo». Esto devuelve esa lista para que se pueda marcar por
       plato desde la propia pestaña de la compra, sin ir plato a plato por el menú.
       Mismos filtros que `generarCompra`: ni días pasados, ni tomas fuera de casa. */
    platosCompra: function (desdeISO, dias) {
      var self = this, out = [];
      for (var i = 0; i < (dias || 7); i++) {
        var fecha = Util.sumarDias(desdeISO, i);
        var dia = this.estado.plan[fecha];
        if (!dia) continue;
        if (this.esPasado(fecha)) continue;
        Util.TOMAS.forEach(function (t) {
          if (self.esFuera(fecha, t.k)) return;
          /* Mismo criterio que la lista de ingredientes: si esa toma no toca ese día,
             tampoco aparece aquí. Si no, saldría un plato que no se puede marcar
             porque sus ingredientes no están en la lista de abajo. */
          if (!self.tomaActiva(fecha, t.k)) return;
          (dia[t.k] || []).forEach(function (rid) {
            var rec = self.receta(rid);
            if (!rec) return;
            out.push({
              fecha: fecha,
              toma: t.k,
              tomaNombre: t.n,
              id: rid,
              nombre: rec.n,
              comprado: self.estaComprado(fecha, t.k, rid),
              comido: self.estaComido(fecha, t.k, rid)
            });
          });
        });
      }
      return out;
    },

    generarCompra: function (lunesISO, dias, opciones) {
      dias = dias || 7;
      opciones = opciones || {};
      var self = this;
      var acumulado = {};   // ingId -> { cantidad, recetas:{} }
      var porciones = {};   // recetaId de tanda -> porciones que hacen falta en la semana

      for (var i = 0; i < dias; i++) {
        var fecha = Util.sumarDias(lunesISO, i);
        var dia = this.estado.plan[fecha];
        if (!dia) continue;
        /* Un día ya vivido no se compra: esa comida ya está hecha o ya no toca. Era el
           fallo de fondo — la lista salía para la semana que estuvieras mirando y, en
           la semana en curso, metía los platos del lunes un jueves. */
        if (this.esPasado(fecha)) continue;
        ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (toma) {
          /* Lo que se come fuera no se compra, ni lo de una toma que ese día no toca. */
          if (self.esFuera(fecha, toma)) return;
          if (!self.tomaActiva(fecha, toma)) return;
          /* Y se compra para los que comen ESA toma, no para los de la semana: un
             miércoles que cena solo son la mitad de raciones que un martes. */
          var personas = self.comensales(fecha, toma);
          (dia[toma] || []).forEach(function (rid) {
            var rec = self.receta(rid);
            if (!rec) return;
            /* Lo ya COMPRADO no se vuelve a pedir, aunque no se haya cocinado todavía.
               Y lo ya comido tampoco, obviamente. */
            if (opciones.saltarComprado !== false && self.estaComprado(fecha, toma, rid)) return;
            if (opciones.saltarComido && self.estaComido(fecha, toma, rid)) return;
            /* Las TANDAS se apuntan aparte y se resuelven al final: no se puede comprar
               un cuarto de bandeja de barritas. Ver `tandas` más abajo. */
            if (rec.tanda) {
              porciones[rid] = (porciones[rid] || 0) + personas;
              return;
            }
            var factor = personas / (rec.raciones || 1);
            (rec.ing || []).forEach(function (l) {
              if (!acumulado[l.i]) acumulado[l.i] = { cantidad: 0, recetas: {} };
              acumulado[l.i].cantidad += l.c * factor;
              acumulado[l.i].recetas[rec.n] = true;
            });
          });
        });
      }

      /* ---------- las TANDAS ----------
         Las barritas, las bolas y la tortilla en porciones no son platos de una comida:
         se hacen de una vez y se comen a lo largo de varios días. Repartir sus
         ingredientes como los de un plato normal daba disparates: para dos porciones de
         barritas pedía «40 g de avena y medio plátano», que no se puede ni amasar.
         Se cuentan las porciones que pide la semana y se compran TANDAS ENTERAS. */
      Object.keys(porciones).forEach(function (rid) {
        var rec = self.receta(rid);
        if (!rec) return;
        var tandas = Math.ceil(porciones[rid] / (rec.raciones || 1));
        if (tandas < 1) tandas = 1;
        (rec.ing || []).forEach(function (l) {
          if (!acumulado[l.i]) acumulado[l.i] = { cantidad: 0, recetas: {} };
          acumulado[l.i].cantidad += l.c * tandas;
          acumulado[l.i].recetas[rec.n + (tandas > 1 ? " (×" + tandas + " tandas)" : "")] = true;
        });
      });

      /* Lo comprometido se pide UNA vez: recorre el plan entero y aquí se
         consulta una vez por ingrediente. */
      var compTodo = this.comprometidoTodo();

      var secciones = {}, basicos = [];
      Object.keys(acumulado).forEach(function (id) {
        var ing = self.ingrediente(id);
        if (!ing) return;
        /* LO QUE HACE FALTA MENOS LO QUE HAY DISPONIBLE PARA ESTA SEMANA. Y
           luego, redondeado al envase: en la tienda no venden 340 g de arroz,
           venden bolsas de kilo.

           «DISPONIBLE PARA ESTA SEMANA» no es el stock entero, y aquí lo era
           hasta el 24-sep-2026. Lo que está en casa puede estar ya reservado
           por platos que NO entran en esta lista: los de otras semanas, y los
           de ésta que ya se compraron (esos no cuentan en `pide` pero sí se van
           a comer). Medido antes de arreglarlo:

             una pizza en el congelador, dos cenas planificadas —una esta semana
             y otra la que viene—, genero la compra de la semana que viene:
             NO PIDE NADA. Abres el congelador el martes y no hay pizza.

           La cuenta: de todo lo comprometido, lo que NO es esta lista está
           apartado y no se puede contar como disponible.

               hay = stock − (comprometido − lo que pide esta lista)

           Cuando la semana es lo único planificado y nada está comprado,
           `comprometido` y `pide` son el mismo número y queda `hay = stock`,
           que es lo de siempre. O sea que esto sólo cambia el resultado en los
           casos que hoy están mal. */
        var pide = acumulado[id].cantidad;
        var apartado = (compTodo[id] || 0) - pide;
        if (apartado < 0) apartado = 0;
        var hay = self.stockDe(id) - apartado;
        if (hay < 0) hay = 0;
        var falta = pide - hay;
        /* `todo: true` lo usa la PASADA PREVIA: necesita también lo que ya está
           cubierto, porque lo que repasas antes de comprar es todo lo que el
           menú va a gastar, no sólo lo que falta. */
        if (!opciones.todo && falta <= 0.0001 && !self.estado.compraMarcada[id]) return;
        if (falta < 0) falta = 0;
        var envases = ing.envase > 0 ? Math.ceil(falta / ing.envase) : 0;
        var comprar = envases > 0 ? envases * ing.envase : falta;
        var linea = {
          id: id,
          nombre: ing.n,
          producto: ing.producto || "",
          suplente: ing.suplente || "",
          cantidad: comprar,
          pide: pide,
          hay: hay,
          envase: ing.envase || 0,
          envases: envases,
          apartado: Math.round(apartado * 100) / 100,   // lo que el stock ya debe a otros platos
          cajon: self.cajonDe(ing),
          tienda: self.tiendaDe(ing),
          unidad: ing.u,
          texto: envases > 0
            ? (envases + " \u00d7 " + Util.cantidadReceta(ing.envase, ing.u, ing.pesoUd))
            : Util.formatearCantidad(comprar, ing.u),
          pesoUd: ing.pesoUd || 0,
          /* Lo que pide el menú se enseña SIN redondear: `formatearCantidad` redondea
             a decenas porque está pensado para lo que se compra, y con ella dos gramos
             de ajo en polvo salían como «0 g». */
          pidePlan: Util.cantidadReceta(pide, ing.u, ing.pesoUd),
          recetas: Object.keys(acumulado[id].recetas),
          enCasa: hay > 0,
          marcado: !!self.estado.compraMarcada[id],
          nota: ing.nota || ""
        };
        /* Lo de restaurante y bar no se compra en ningún sitio: cuenta en las
           calorías y en la sal del día, pero no tiene nada que hacer en una
           lista de la compra. */
        /* LA REGLA YA NO ESTÁ AQUÍ DENTRO. Antes eran dos condiciones sueltas
           —«si es Restaurante y bar, fuera» y «si el cajón es suscripción o
           aparte, fuera»— escritas en el código, donde ni se veían ni se podían
           cambiar. Ahora lo dice la ficha, con `pedir: "nunca"`, y `modoPedir`
           deduce exactamente esas mismas dos condiciones mientras él no diga
           otra cosa: el día que se estrenó, la lista salió idéntica. */
        if (self.modoPedir(ing) === "nunca") return;
        /* NI LA SUSCRIPCIÓN NI LO QUE SE PIDE APARTE (23-sep-2026). La suscripción
           llega sola cada seis semanas; lo de «aparte» —la proteína y los geles de
           HSN, las barritas de Decathlon— lo pide Carlos por su cuenta cuando ve
           que se le acaba. Los dos cuentan en las calorías y en la sal del día,
           pero no pintan nada en una lista de la compra. Hasta hoy la regla era
           «si no es Amazon, es Súper», así que el café en grano y los sabores de
           SodaStream salían en la lista de Súper cada vez que el menú los usaba. */
        if (ing.basico) { basicos.push(linea); return; }
        if (!secciones[ing.cat]) secciones[ing.cat] = [];
        secciones[ing.cat].push(linea);
      });

      /* Lo que has pedido a propósito para esta compra. Va antes que el mínimo
         porque si has dicho que lo quieres, lo quieres aunque tengas de sobra. */
      Object.keys(this.estado.quiero || {}).forEach(function (id) {
        var ing = self.ingrediente(id);
        if (!ing || ing.oculta) return;
        if (self.modoPedir(ing) === "nunca") return;
        if (acumulado[id]) return;                  // ya lo pide un plato
        var tamq = self.tamanoPieza(ing);
        var pediste = self.estado.quiero[id].p || 1;
        var ffq = self.FORMATOS[self.formatoDe(ing)];
        /* CUÁNTAS UNIDADES DE COMPRA SON. No es decorativo: `confirmarCompra`
           sube al stock `envase × envases`, así que con `envases: 0` sólo entraba
           UN envase por muchos que pidieras —seis briks de leche entraban como
           uno—. Y va redondeado HACIA ARRIBA porque la tienda vende lo que
           vende: si pides dos Coca-Colas y el envase es un pack de doce, te
           vienes con doce. Por eso lo que se enseña son las piezas que traes de
           verdad, con `pediste` aparte para que la pantalla pueda decir que tú
           habías pedido dos. */
        var envq = ing.envase > 0 ? Math.max(1, Math.ceil(pediste * tamq / ing.envase)) : 0;
        var pz = envq > 0 ? Math.round(envq * ing.envase / tamq * 100) / 100 : pediste;
        var lq = {
          id: id, nombre: ing.n, producto: ing.producto || "", suplente: ing.suplente || "",
          cantidad: envq > 0 ? Math.round(envq * ing.envase * 100) / 100
                             : Math.round(pediste * tamq * 100) / 100,
          pide: 0, hay: self.stockDe(id), envase: ing.envase || 0,
          envases: envq, apartado: 0,
          cajon: self.cajonDe(ing), tienda: self.tiendaDe(ing), unidad: ing.u,
          texto: pz + " " + (pz === 1 ? ffq.n[0] : ffq.n[1]),
          pesoUd: ing.pesoUd || 0, pidePlan: "", recetas: [], enCasa: self.stockDe(id) > 0,
          marcado: !!self.estado.compraMarcada[id],
          porCapricho: true, piezas: pz, pediste: pediste,
          nota: ing.nota || ""
        };
        if (ing.basico) { basicos.push(lq); return; }
        if (!secciones[ing.cat]) secciones[ing.cat] = [];
        secciones[ing.cat].push(lq);
      });


      /* ---------- LO QUE NO PLANIFICA NADIE: EL MÍNIMO EN CASA ----------
         Carlos, 25-sep-2026: «las bebidas no se planifican, así que nunca las
         pedirá. Pero sí podemos hacer un stock deseado. Cervezas Mahou, 7 ud:
         el pack es de 12 o 24, y solo compro ese lote cuando queden menos de 7.
         La leche desnatada, 4 briks: si tengo 4 no pido, si tengo 3 pido 6, que
         es la unidad de pedido».

         Es el punto de pedido de toda la vida, y resuelve el agujero de la
         cerveza, el refresco, el zumo y la leche: cosas que ningún plato pide y
         que por tanto la lista no miraba jamás. Dos números por ficha:
           minimo  cuántas piezas quieres tener siempre  (7 latas, 4 briks)
           lote    cuántas vienen en la unidad de compra (24 latas, 6 briks)
         Si lo apuntado baja del mínimo, se piden los lotes que hagan falta para
         cubrirlo, nunca menos de uno. Y no se toca nada de lo anterior: si un
         plato ya lo pedía, esa línea manda y ésta no se añade. */
      (this.estado.ingredientes || []).forEach(function (ing) {
        if (ing.oculta || !(ing.minimo > 0)) return;
        if (self.modoPedir(ing) !== "minimo") return;     // el modo manda sobre el número
        if ((self.estado.quiero || {})[ing.id]) return;   // ya entra por capricho
        if (acumulado[ing.id]) return;              // el menú ya lo pide: esa línea manda
        var tam = self.tamanoPieza(ing);
        if (!(tam > 0)) return;
        var hayP = Math.round(self.stockDe(ing.id) / tam * 100) / 100;
        if (hayP >= ing.minimo - 0.0001) return;    // el mínimo está cubierto
        var lote = ing.lote > 0 ? ing.lote : 1;
        var lotes = Math.ceil((ing.minimo - hayP) / lote);
        if (lotes < 1) lotes = 1;
        var piezas = lotes * lote;
        var ff = self.FORMATOS[self.formatoDe(ing)];
        var linea2 = {
          id: ing.id, nombre: ing.n, producto: ing.producto || "", suplente: ing.suplente || "",
          cantidad: Math.round(piezas * tam * 100) / 100,
          pide: 0, hay: Math.round(hayP * tam * 100) / 100,
          envase: ing.envase || 0,
          envases: ing.envase > 0 ? Math.max(1, Math.ceil(piezas * tam / ing.envase)) : 0,
          apartado: 0,
          cajon: self.cajonDe(ing), tienda: self.tiendaDe(ing), unidad: ing.u,
          texto: piezas + " " + (piezas === 1 ? ff.n[0] : ff.n[1]),
          pesoUd: ing.pesoUd || 0, pidePlan: "",
          recetas: [], enCasa: hayP > 0,
          marcado: !!self.estado.compraMarcada[ing.id],
          /* para que la pantalla pueda decir POR QUÉ está aquí */
          porMinimo: true, minimo: ing.minimo, lote: lote, piezas: piezas,
          tienesPiezas: hayP, piezaNombre: hayP === 1 ? ff.n[0] : ff.n[1],
          nota: ing.nota || ""
        };
        if (ing.basico) { basicos.push(linea2); return; }
        if (!secciones[ing.cat]) secciones[ing.cat] = [];
        secciones[ing.cat].push(linea2);
      });

      /* El orden en que se recorre el súper. Lo que no esté aquí sale al final,
         así que una sección nueva no se pierde: solo queda mal colocada. */
      var orden = ["Frutas y verduras", "Carnicería", "Pescadería", "Charcutería y quesos",
                   "Lácteos y huevos", "Panadería", "Congelados", "Despensa",
                   "Aperitivos y frutos secos", "Dulces", "Bebidas", "Especias y aromáticos"];
      var salida = [];
      orden.forEach(function (cat) {
        if (secciones[cat]) {
          secciones[cat].sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
          salida.push({ nombre: cat, lineas: secciones[cat] });
          delete secciones[cat];
        }
      });
      Object.keys(secciones).forEach(function (cat) { salida.push({ nombre: cat, lineas: secciones[cat] }); });
      basicos.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });

      return { secciones: salida, basicos: basicos };
    },

    /* ================= LA PASADA PREVIA (24-sep-2026) =================
       Carlos, que ha llevado stock en logística: «la gestión de stock siempre
       acaba con regularizaciones frecuentes y errores». Tiene razón, y aquí se
       desviará igual. Lo que cambia es el alcance.

       En logística el stock ES el producto: prometes disponibilidad, así que
       hay que regularizarlo entero. Aquí el número contesta UNA pregunta
       —«¿hay que comprarlo?»— y esa pregunta sólo se le hace a lo que el menú
       de esa semana va a gastar. Medido sobre sus ocho días reales de plan, con
       dos comensales: 48 ingredientes de los 235 del catálogo, repartidos en
       21 de armario, 14 de frutero, 12 de nevera y 1 de panera. Los otros 187
       pueden estar mal todo el año sin consecuencia, porque nadie les pregunta
       nada; y el día que una receta nueva tire de uno, aparece en la pasada de
       esa semana y se corrige ahí. La desviación nunca llega a hacer daño
       antes de que la cacen.

       Así que la pasada NO es una auditoría aparte: es el paso que ya hacía él
       —abrir la nevera antes de planificar— con la app poniendo delante lo que
       cree, para que sólo tenga que corregir lo que esté mal. Cinco o diez
       líneas de cuarenta y ocho.

       LA X MANDA SOBRE EL NÚMERO. El stock deja de ser una verdad que hay que
       mantener y pasa a ser una sugerencia que se confirma una vez por semana.

       Y TRES RESPUESTAS, NO DOS. «Hay» y «no hay» resuelven casi todo, pero no
       el caso que hizo falta medir: esa semana el menú pide 460 g de copos de
       avena y el envase trae 500. El lunes «hay avena» es verdad y el viernes
       no queda. Para eso está «queda esto», que es donde se escribe la cifra —
       y es lo único que una lista de marcar no puede hacer. */
    pasadaPrevia: function (lunesISO, dias) {
      var self = this, hoy = Util.hoyISO();
      /* Las mismas reglas que la lista, y no por comodidad: lo que se repasa
         tiene que ser exactamente lo que se va a comprar. Un plato ya comprado
         o ya comido no entra en la lista, así que tampoco hay nada que
         contestar sobre él. */
      var datos = this.generarCompra(lunesISO, dias, { saltarComido: true, todo: true });
      var todas = [];
      datos.secciones.forEach(function (s) {
        s.lineas.forEach(function (l) { todas.push(l); });
      });
      datos.basicos.forEach(function (l) { l.esBasico = true; todas.push(l); });

      var mapa = {}, sitios = [];
      this.SITIOS.forEach(function (s) {
        mapa[s.k] = { k: s.k, n: s.n, lineas: [], basicos: [],
                      contado: (self.estado.stockSitios || {})[s.k] || null };
        sitios.push(mapa[s.k]);
      });

      var total = 0;
      todas.forEach(function (l) {
        var g = self.ingrediente(l.id);
        if (!g) return;
        var k = self.sitioDe(g);
        if (!k || !mapa[k]) return;          // restaurante y bar no se guarda en casa
        var f = self.fichaStock(l.id);
        var necesita = l.pide + (l.apartado || 0);
        var linea = {
          id: l.id, n: l.nombre, u: l.unidad, pesoUd: l.pesoUd || 0, envase: l.envase || 0,
          pide: l.pide, hay: l.hay, apartado: l.apartado || 0, necesita: necesita,
          basico: !!l.esBasico, minimo: g.minimo || 0,
          confirmadoEl: (f && f.f) || null,
          pte: (f && f.pte) || false,
          recetas: l.recetas || [],
          /* lo que la app cree, y que sale ya marcado */
          estado: l.hay >= l.pide - 0.0001 ? "hay" : (l.hay <= 0.0001 ? "no" : "parte")
        };
        linea.dias = linea.confirmadoEl ? Util.diasEntre(linea.confirmadoEl, hoy) : null;
        /* Sin contar nunca, o contado hace más de una semana, no se da por
           bueno: se marca para que salte a la vista. */
        linea.dudoso = !!(linea.pte || linea.dias === null || linea.dias > 7);
        /* Un básico por debajo de su mínimo SALE del bloque plegado: es justo
           el que se acaba sin avisar, porque el menú gasta dos gramos y nadie
           lo mira. Los demás básicos casi siempre son que sí. */
        linea.avisa = !!(linea.minimo && self.stockDe(l.id) < linea.minimo);
        if (linea.basico && !linea.avisa && !linea.dudoso) mapa[k].basicos.push(linea);
        else mapa[k].lineas.push(linea);
        total++;
      });

      sitios.forEach(function (s) {
        var por = function (a, b) { return a.n.localeCompare(b.n); };
        s.lineas.sort(por); s.basicos.sort(por);
        s.total = s.lineas.length + s.basicos.length;
        s.dias = s.contado ? Util.diasEntre(s.contado, hoy) : null;
      });
      return { sitios: sitios.filter(function (s) { return s.total > 0; }), total: total };
    },

    /* La respuesta de una línea de la pasada. Escribe en el MISMO stock de
       siempre: la pasada no inventa un concepto nuevo, sólo es la manera
       cómoda de corregirlo. Y siempre deja la línea confirmada HOY, que es lo
       que apaga el aviso de «sin contar». */
    responderPasada: function (id, r, cant) {
      var c;
      if (r === "no") c = 0;
      else if (r === "parte") c = Math.max(0, Number(cant) || 0);
      else c = Math.max(this.stockDe(id), Number(cant) || 0);   // "hay": al menos lo que hace falta
      this.estado.stock[id] = { c: Math.round(c * 100) / 100, f: Util.hoyISO() };
      var k = this.sitioDe(id);
      if (k) {
        if (!this.estado.stockSitios) this.estado.stockSitios = {};
        this.estado.stockSitios[k] = Util.hoyISO();
      }
      this.guardar("stock");
    }
  };

  global.Almacen = Almacen;
})(window);
