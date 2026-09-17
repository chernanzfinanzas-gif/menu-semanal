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
      return this.estado.recetas.filter(function (r) { return r.llevable; });
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
          var aptas = pool.filter(function (r) { return (r.tipo || []).indexOf(t.k) >= 0; });
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
    generarCompra: function (lunesISO, dias) {
      dias = dias || 7;
      var self = this;
      var acumulado = {};   // ingId -> { cantidad, recetas:{} }

      for (var i = 0; i < dias; i++) {
        var fecha = Util.sumarDias(lunesISO, i);
        var dia = this.estado.plan[fecha];
        if (!dia) continue;
        ["desayuno", "almuerzo", "comida", "merienda", "cena"].forEach(function (toma) {
          /* Lo que se come fuera no se compra. */
          if (self.esFuera(fecha, toma)) return;
          /* Y se compra para los que comen ESA toma, no para los de la semana: un
             miércoles que cena solo son la mitad de raciones que un martes. */
          var personas = self.comensales(fecha, toma);
          (dia[toma] || []).forEach(function (rid) {
            var rec = self.receta(rid);
            if (!rec) return;
            var factor = personas / (rec.raciones || 1);
            (rec.ing || []).forEach(function (l) {
              if (!acumulado[l.i]) acumulado[l.i] = { cantidad: 0, recetas: {} };
              acumulado[l.i].cantidad += l.c * factor;
              acumulado[l.i].recetas[rec.n] = true;
            });
          });
        });
      }

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
