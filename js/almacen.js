/* almacen.js — estado de la aplicación, cálculos y persistencia local */
(function (global) {
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
          avisoSal: 2.0,       // g de sal/día: por encima = ámbar
          objetivoKcal: 2000,  // kcal/día
          objetivoProt: 90,    // g de proteína/día
          margenKcal: 10,      // % de holgura antes de marcar el día en rojo

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
        despensa: {},          // { ingredienteId: true }  -> ya lo tengo en casa
        compraMarcada: {},     // { ingredienteId: true }  -> ya comprado / tachado
        favoritos: [],
        sync: { sha: null, ultima: null }
      };
    },

    reparar: function () {
      var e = this.estado;
      if (!e.config) e.config = this.estadoInicial().config;
      if (!e.config.github) e.config.github = { usuario: "", repo: "", rama: "main", token: "" };
      if (!e.ingredientes || !e.ingredientes.length) e.ingredientes = JSON.parse(JSON.stringify(global.DATOS_INGREDIENTES || []));
      if (!e.recetas || !e.recetas.length) e.recetas = JSON.parse(JSON.stringify(global.DATOS_RECETAS || []));
      if (!e.plantillas || !e.plantillas.length) e.plantillas = JSON.parse(JSON.stringify(global.DATOS_PLANTILLAS || []));
      if (!e.plan) e.plan = {};
      if (!e.comido) e.comido = {};
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
       ["plantillas", global.DATOS_PLANTILLAS], ["actividades", global.DATOS_ACTIVIDADES]
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
      (global.DATOS_INGREDIENTES || []).forEach(function (x) { if (x.rev) ingSemilla[x.id] = x; });
      var ingRefrescados = [];
      e.ingredientes.forEach(function (ing, i) {
        var nuevo = ingSemilla[ing.id];
        if (!nuevo || ing.editado) return;
        if ((ing.rev || 1) >= nuevo.rev) return;
        e.ingredientes[i] = JSON.parse(JSON.stringify(nuevo));
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
      (global.DATOS_RECETAS || []).forEach(function (r) { if (r.rev) recSemilla[r.id] = r; });
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

      if (typeof e.config.objetivoKcal !== "number") e.config.objetivoKcal = 2000;
      if (typeof e.config.objetivoProt !== "number") e.config.objetivoProt = 90;
      if (typeof e.config.margenKcal !== "number") e.config.margenKcal = 10;
      if (!e.despensa) e.despensa = {};
      if (!e.compraMarcada) e.compraMarcada = {};
      if (!e.favoritos) e.favoritos = [];
      if (!e.sync) e.sync = { sha: null, ultima: null };
    },

    /* ---------- persistencia ---------- */
    guardar: function (motivo) {
      this.estado.actualizado = new Date().toISOString();
      try { localStorage.setItem(CLAVE, JSON.stringify(this.estado)); } catch (e) {}
      this.avisar(motivo || "cambio");
      if (global.Sync && global.Sync.programarGuardado) global.Sync.programarGuardado();
    },

    reemplazar: function (nuevo) {
      this.estado = nuevo;
      this.reparar();
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
    comensales: function (fecha, toma) {
      var d = this.estado.plan[fecha];
      var n = d && d.comensales && d.comensales[toma];
      return n > 0 ? n : (this.estado.config.personas || 1);
    },
    ponerComensales: function (fecha, toma, n) {
      var d = this.asegurarDia(fecha);
      if (!d.comensales) d.comensales = {};
      if (n === (this.estado.config.personas || 1)) delete d.comensales[toma];
      else d.comensales[toma] = n;
      if (!Object.keys(d.comensales).length) delete d.comensales;
      this.guardar("comensales");
    },

    /* ¿Esa toma se come fuera de casa? */
    esFuera: function (fecha, toma) {
      var d = this.estado.plan[fecha];
      return !!(d && d.fuera && d.fuera.indexOf(toma) >= 0);
    },
    ponerFuera: function (fecha, toma, si) {
      var d = this.asegurarDia(fecha);
      if (!d.fuera) d.fuera = [];
      var i = d.fuera.indexOf(toma);
      if (si && i < 0) d.fuera.push(toma);
      if (!si && i >= 0) d.fuera.splice(i, 1);
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

    /* sal total de un día del plan (por persona), con lo comido fuera estimado */
    salDia: function (fecha) {
      var dia = this.estado.plan[fecha];
      if (!dia) return 0;
      var total = 0, self = this;
      ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (toma) {
        if (self.esFuera(fecha, toma)) {
          var e = self.estimacionFuera(toma);
          if (e) total += e.sal;
          return;                                   // fuera no se cocina: nada más que sumar
        }
        (dia[toma] || []).forEach(function (id) { total += self.salReceta(self.receta(id)); });
      });
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
    nutrDia: function (fecha, soloComido) {
      var dia = this.estado.plan[fecha];
      var t = { k: 0, p: 0, g: 0, h: 0 };
      if (!dia) return t;
      var self = this;
      ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (toma) {
        if (self.esFuera(fecha, toma)) {
          /* Lo de fuera cuenta siempre, también en «solo lo comido»: si has marcado
             que comes fuera es que has comido, no hay nada que tachar. */
          var e = self.estimacionFuera(toma);
          if (e) { t.k += e.k; t.p += e.p; t.g += e.g; t.h += e.h; }
          return;
        }
        (dia[toma] || []).forEach(function (id) {
          if (soloComido && !self.estaComido(fecha, toma, id)) return;
          var n = self.nutrReceta(self.receta(id));
          t.k += n.k; t.p += n.p; t.g += n.g; t.h += n.h;
        });
      });
      return t;
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

    /* Lleva un pendiente al primer día futuro que tenga esa toma libre. Se conserva la
       marca de comprado, porque los ingredientes siguen siendo los mismos. */
    reprogramarPendiente: function (fecha, toma, recetaId) {
      var hoy = Util.hoyISO();
      for (var i = 0; i < 21; i++) {
        var f = Util.sumarDias(hoy, i);
        var ficha = this.fichaTipoDia(f);
        if (this.esFuera(f, toma) || ficha.mochila.indexOf(toma) >= 0) continue;
        var d = this.estado.plan[f];
        var yaHay = d && (d[toma] || []).length;
        var propio = d && (d[toma] || []).indexOf(recetaId) >= 0;
        if (yaHay && !propio) continue;
        if (propio) continue;                       // ya está puesto ahí
        var dia = this.asegurarDia(f);
        dia[toma] = (dia[toma] || []).concat([recetaId]);
        this.marcarComprado(fecha, toma, recetaId, false);
        this.marcarComprado(f, toma, recetaId, true);
        this.guardar("reprogramar");
        return f;
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
      this.guardar("comido");
    },

    /* ¿queda algo del día sin marcar? */
    hayComidoAlgo: function (fecha) {
      var d = this.estado.comido[fecha];
      return !!(d && Object.keys(d).length);
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
      return this.gastoBase() + this.kcalActividad(fecha) * dev;
    },

    /* Lo que deberías COMER ese día = lo que gastas menos el déficit programado.
       Esta es la cadena entera: actividad → gasto → calorías del día → menú.
       Si el perfil no tiene edad, altura y peso no hay TMB y no hay cadena; en ese
       caso se cae al objetivo fijo de Ajustes para no dejar la app sin números. */
    objetivoDelDia: function (fecha) {
      var c = this.estado.config;
      var dev = typeof c.devolucionEjercicio === "number" ? c.devolucionEjercicio : 0.70;
      var gasto = this.gastoDelDia(fecha);
      if (!this.tmb()) return (c.objetivoKcal || 0) + Math.round(this.kcalActividad(fecha) * dev);
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
        prot: Math.round(refPeso * 1.6),
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
      ruta: { n: "Ruta o bici larga", icono: "🥾", topeSal: false, ruta: true,
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

    diaVacio: function () { return { tipo: "casa", desayuno: [], almuerzo: [], comida: [], merienda: [], cena: [] }; },

    asegurarDia: function (fecha) {
      if (!this.estado.plan[fecha]) this.estado.plan[fecha] = this.diaVacio();
      if (!this.estado.plan[fecha].tipo) this.estado.plan[fecha].tipo = "casa";
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
    ponerFijos: function (fecha) {
      if (this.esPasado(fecha)) return 0;
      var d = this.asegurarDia(fecha);
      var ficha = this.fichaTipoDia(fecha);
      var self = this, puestos = 0;
      (this.estado.config.fijos || []).forEach(function (f) {
        if (!self.receta(f.r)) return;
        (f.tomas || []).forEach(function (toma) {
          if (self.esFuera(fecha, toma)) return;
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
        var puestosYa = (d[t.k] || []);
        var propios = puestosYa.filter(function (id) { return !esFijo[id]; });
        if (propios.length) return;                        // ya hay plato: no se toca

        /* lo que los fijos ya ocupan de la cuota de esta toma */
        var yaEnLaToma = 0;
        puestosYa.forEach(function (id) { yaEnLaToma += self.nutrReceta(self.receta(id)).k; });

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
      var total = 0, entrenos = 0;
      for (var i = 0; i < 7; i++) {
        var f = Util.sumarDias(lunesISO, i);
        total += this.rellenarDia(f, plantillaId);
        entrenos += this.aplicarEntrenoEstandar(f) ? 1 : 0;
      }
      if (total) this.guardar("rellenar");
      return { tomas: total, dias: entrenos };
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
          /* Lo que se come fuera no se compra. */
          if (self.esFuera(fecha, toma)) return;
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

      var secciones = {}, basicos = [];
      Object.keys(acumulado).forEach(function (id) {
        var ing = self.ingrediente(id);
        if (!ing) return;
        var linea = {
          id: id,
          nombre: ing.n,
          cantidad: acumulado[id].cantidad,
          unidad: ing.u,
          texto: Util.formatearCantidad(acumulado[id].cantidad, ing.u),
          recetas: Object.keys(acumulado[id].recetas),
          enCasa: !!self.estado.despensa[id],
          marcado: !!self.estado.compraMarcada[id],
          nota: ing.nota || ""
        };
        if (ing.basico) { basicos.push(linea); return; }
        if (!secciones[ing.cat]) secciones[ing.cat] = [];
        secciones[ing.cat].push(linea);
      });

      var orden = ["Frutas y verduras", "Carnicería", "Pescadería", "Congelados", "Lácteos y huevos", "Panadería", "Despensa", "Especias y aromáticos"];
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
    }
  };

  global.Almacen = Almacen;
})(window);
