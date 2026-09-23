/* github.js — sincronización del estado con un repositorio de GitHub
   El token NUNCA se sube al repositorio: se queda en este dispositivo. */
(function (global) {
  "use strict";

  var RUTA = "datos/estado.json";
  var RUTA_CATALOGO = "datos/nuevos.js";

  function b64(texto) {
    var bytes = new TextEncoder().encode(texto), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function deB64(base) {
    var bin = atob(String(base).replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  /* ---------- FUSIÓN DE ESTADOS ----------
     El 21-sep-2026 Carlos anotó tensión y medidas por la mañana y desaparecieron:
     tenía la app abierta en dos sitios, la pestaña vieja guardó después, y el
     código de entonces resolvía el choque releyendo el `sha` y REESCRIBIENDO lo
     suyo encima. Ni miraba lo que había puesto el otro.

     Ahora, cuando dos aparatos chocan, se fusionan los dos estados:

       · Lo que solo está en uno, SE CONSERVA. Ésa es la regla que importa: las
         medidas van por fecha y por campo, así que la unión es exactamente lo
         que uno espera.
       · Lo que está en los dos con valores distintos, lo decide el `actualizado`
         más reciente.
       · Un valor vacío nunca gana a uno lleno.

     El precio, que conviene saber: BORRAR no se propaga. Si quitas algo en un
     aparato y otro todavía lo tiene, la fusión lo devuelve. Es deliberado —
     entre resucitar algo borrado y perder algo anotado, preferimos lo primero. */

  function esObjeto(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function vacio(x) { return x === undefined || x === null || x === ""; }

  function fusionar(a, b, bManda) {
    if (esObjeto(a) && esObjeto(b)) {
      var fuera = {}, k;
      for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) fuera[k] = a[k];
      for (k in b) {
        if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
        fuera[k] = Object.prototype.hasOwnProperty.call(a, k) ? fusionar(a[k], b[k], bManda) : b[k];
      }
      return fuera;
    }
    if (Array.isArray(a) && Array.isArray(b)) return fusionarListas(a, b, bManda);
    if (vacio(b)) return a;
    if (vacio(a)) return b;
    return bManda ? b : a;
  }

  /* Las listas con identificador se unen por él —recetas, platos—; las que no lo
     tienen no se pueden casar elemento a elemento, así que manda la más nueva. */
  function fusionarListas(a, b, bManda) {
    var todos = a.concat(b), i;
    for (i = 0; i < todos.length; i++) {
      if (!esObjeto(todos[i]) || vacio(todos[i].id)) return bManda ? b : a;
    }
    var porId = {}, orden = [];
    for (i = 0; i < a.length; i++) { porId[a[i].id] = a[i]; orden.push(a[i].id); }
    for (i = 0; i < b.length; i++) {
      if (Object.prototype.hasOwnProperty.call(porId, b[i].id)) {
        porId[b[i].id] = fusionar(porId[b[i].id], b[i], bManda);
      } else { porId[b[i].id] = b[i]; orden.push(b[i].id); }
    }
    return orden.map(function (id) { return porId[id]; });
  }

  /* Para comparar dos estados sin que el reloj ni el sha metan ruido. */
  function huella(e) {
    var c = JSON.parse(JSON.stringify(e || {}));
    delete c.sync; delete c.actualizado;
    if (c.config && c.config.github) c.config.github.token = "";
    return JSON.stringify(c);
  }

  /* Junta el estado de aquí con el del repositorio y devuelve el resultado,
     listo para reemplazar el local. Conserva el token, que no viaja. */
  function fusionarConRemoto(remoto, sha) {
    var local = JSON.parse(JSON.stringify(Almacen.estado));
    var token = (local.config && local.config.github && local.config.github.token) || "";
    var remotoManda = String(remoto.actualizado || "") > String(local.actualizado || "");
    delete local.sync;
    var junto = fusionar(local, remoto, remotoManda);
    junto.actualizado = (local.actualizado || "") > (remoto.actualizado || "")
      ? local.actualizado : remoto.actualizado;

    /* ── LOS DÍAS CORREGIDOS A MANO NO SE PISAN (23-sep-2026) ──────────────
       Aquí se perdieron los días 21 y 22 de septiembre. Dos cosas se juntan:
       un SOLO sello de tiempo (`actualizado`) decide quién manda en TODO el
       estado, y la lista de platos de una toma es un array de textos, así que
       `fusionarListas` devuelve una lista entera o la otra, sin unir plato a
       plato. Resultado: un aparato con la hora un segundo más nueva, aunque no
       supiera nada de la corrección, borraba el día completo. Sobrevivían
       `fotos`, `comido` y `corregido` —son objetos, fusión profunda— y por eso
       quedaba el sello «Corregido a mano el 23/09» anunciando una corrección
       que ya no estaba.
       La regla: si un día lleva marca de corrección manual, su plan lo pone el
       lado que lo corrigió MÁS TARDE, pase lo que pase con el sello global.
       Una corrección a mano es lo más deliberado que hay en la app: nunca la
       puede tirar un reloj. */
    /* AMPLIADO EL 23-sep-2026: el guardián protegía el PLAN del día, pero no lo
       COMIDO, y los ✓ se perdían exactamente igual. Carlos: «marcas, la app dice
       guardando, guardado… sales y al volver aparecen desmarcados». Medido: con
       el remoto 5 s por delante, {"comida":["pasta_bolonesa","yogur_griego"]} se
       quedaba en {"comida":[]}.
       Ahora cuenta el sello de DÍA —el ✓ o la corrección, lo que sea más
       reciente— y de ese día manda entero quien lo tocó el último, tanto para el
       plan como para lo comido. Las tomas que el ganador no tenga se conservan
       del otro lado, para no tirar un ✓ de otra toma que nadie ha tocado. */
    function selloDe(est, dia) {
      var a = ((est.selloDia || {})[dia]) || "";
      var b = ((est.corregido || {})[dia]) || "";
      return a > b ? a : b;
    }
    var dias = {}, f, fuentes = [local.corregido || {}, remoto.corregido || {},
                                local.selloDia || {}, remoto.selloDia || {}];
    fuentes.forEach(function (o) {
      for (f in o) if (Object.prototype.hasOwnProperty.call(o, f)) dias[f] = 1;
    });
    Object.keys(dias).forEach(function (dia) {
      var mandaLocal = selloDe(local, dia) >= selloDe(remoto, dia);
      var manda = mandaLocal ? local : remoto, otro = mandaLocal ? remoto : local;

      if (manda.plan && manda.plan[dia]) {
        if (!junto.plan) junto.plan = {};
        junto.plan[dia] = JSON.parse(JSON.stringify(manda.plan[dia]));
      }

      var cm = (manda.comido || {})[dia], co = (otro.comido || {})[dia];
      if (cm || co) {
        var unido = JSON.parse(JSON.stringify(co || {}));
        Object.keys(cm || {}).forEach(function (toma) {
          unido[toma] = (cm[toma] || []).slice();      /* la toma que él tocó, suya */
        });
        Object.keys(unido).forEach(function (toma) {
          if (!unido[toma] || !unido[toma].length) delete unido[toma];
        });
        if (!junto.comido) junto.comido = {};
        if (Object.keys(unido).length) junto.comido[dia] = unido;
        else delete junto.comido[dia];
      }
    });
    if (!junto.config) junto.config = {};
    if (!junto.config.github) junto.config.github = {};
    junto.config.github.token = token;
    junto.sync = { sha: sha, ultima: new Date().toISOString() };
    return junto;
  }

  var Sync = {
    ocupado: false,
    temporizador: null,

    cfg: function () { return Almacen.estado.config.github || {}; },

    /* PAUSA (23-sep-2026, idea de Carlos: «¿no es mejor pausarla por botón
       guardando los datos en la app?»). Antes, para dejar de sincronizar había
       que BORRAR el token y volver a pegarlo después, con el riesgo de perderlo.
       Con la pausa la clave se queda donde está y la app simplemente no habla
       con GitHub: no sube, no baja, no puede pisar nada. */
    enPausa: function () { return !!this.cfg().pausada; },

    configurado: function () {
      var c = this.cfg();
      if (c.pausada) return false;
      return !!(c.usuario && c.repo && c.token);
    },

    indicar: function (texto, clase) {
      var el = document.getElementById("estado-sync");
      if (!el) return;
      el.textContent = texto;
      el.className = "sync " + (clase || "");
    },

    api: function (metodo, cuerpo) {
      var c = this.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
                encodeURIComponent(c.repo) + "/contents/" + RUTA + "?ref=" + encodeURIComponent(c.rama || "main");
      if (metodo !== "GET") url = url.split("?")[0];
      return fetch(url, {
        method: metodo,
        headers: {
          "Authorization": "Bearer " + c.token,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
      });
    },

    /* Lo que viaja al repositorio: todo menos el token */
    paquete: function () {
      var copia = JSON.parse(JSON.stringify(Almacen.estado));
      if (copia.config && copia.config.github) copia.config.github.token = "";
      delete copia.sync;
      return copia;
    },

    cargar: function () {
      var self = this;
      if (!this.configurado()) return Promise.resolve(false);
      this.indicar("Consultando…", "trabajando");
      return this.api("GET").then(function (r) {
        if (r.status === 404) { self.indicar("Repositorio vacío", ""); return false; }
        if (!r.ok) throw new Error("GitHub respondió " + r.status);
        return r.json().then(function (j) {
          var remoto = JSON.parse(deB64(j.content));
          var antes = huella(Almacen.estado);
          var junto = fusionarConRemoto(remoto, j.sha);
          var despues = huella(junto);

          if (antes !== despues) {
            /* La fusión ha traído algo que aquí no había */
            Almacen.reemplazar(junto);
            self.indicar("Al día (traído del repo)", "ok");
            Util.toast("Datos actualizados desde GitHub");
          } else {
            Almacen.estado.sync.sha = j.sha;
            self.indicar("Al día", "ok");
          }

          /* Y al revés: si aquí había algo que el repositorio no tenía, la
             fusión lo conserva y hay que SUBIRLO, o se quedaría solo en este
             aparato hasta que alguien tocara algo. */
          if (huella(remoto) !== despues) self.programarGuardado();

          return antes !== despues;
        });
      }).catch(function (e) {
        self.indicar("Sin conexión", "error");
        console.warn("Sync cargar:", e);
        return false;
      });
    },

    programarGuardado: function () {
      var self = this;
      if (!this.configurado()) return;
      Almacen.estado.actualizado = new Date().toISOString();
      clearTimeout(this.temporizador);
      this.indicar("Cambios sin guardar", "pendiente");
      this.temporizador = setTimeout(function () { self.guardar(); }, 3500);
    },

    guardar: function () {
      var self = this;
      if (this.enPausa()) { this.indicar("Sincronización en pausa", ""); return Promise.resolve(false); }
      if (!this.configurado()) { this.indicar("Solo en este dispositivo", ""); return Promise.resolve(false); }
      if (this.ocupado) { clearTimeout(this.temporizador); this.temporizador = setTimeout(function(){ self.guardar(); }, 2000); return Promise.resolve(false); }
      this.ocupado = true;
      this.indicar("Guardando…", "trabajando");
      if (!Almacen.estado.actualizado) Almacen.estado.actualizado = new Date().toISOString();

      var cuerpo = {
        message: "Menú: actualización " + new Date().toLocaleString("es-ES"),
        content: b64(JSON.stringify(this.paquete(), null, 1)),
        branch: this.cfg().rama || "main"
      };
      if (Almacen.estado.sync.sha) cuerpo.sha = Almacen.estado.sync.sha;

      return this.api("PUT", cuerpo).then(function (r) {
        if (r.status === 409 || r.status === 422) {
          /* Otro aparato escribió mientras tanto. ANTES se releía el sha y se
             reescribía lo de aquí encima, y así se perdieron las medidas del
             21-sep. Ahora se trae lo suyo, se fusiona, y se sube la unión. */
          return self.api("GET").then(function (r2) {
            if (!r2.ok) throw new Error("conflicto irresoluble");
            return r2.json();
          }).then(function (j) {
            var remoto = JSON.parse(deB64(j.content));
            var junto = fusionarConRemoto(remoto, j.sha);
            Almacen.reemplazar(junto);
            self.ocupado = false;
            self.indicar("Juntando con el otro aparato\u2026", "trabajando");
            return self.guardar();
          });
        }
        if (!r.ok) throw new Error("GitHub respondió " + r.status);
        return r.json().then(function (j) {
          Almacen.estado.sync.sha = j.content.sha;
          Almacen.estado.sync.ultima = new Date().toISOString();
          try { localStorage.setItem("asistente-alimentacion-v1", JSON.stringify(Almacen.estado)); } catch (e) {}
          self.indicar("Guardado en GitHub", "ok");
          self.ocupado = false;
          return true;
        });
      }).catch(function (e) {
        self.ocupado = false;
        self.indicar("No se pudo guardar", "error");
        console.warn("Sync guardar:", e);
        return false;
      });
    },

    probar: function () {
      var self = this;
      if (!this.configurado()) { Util.toast("Faltan datos de GitHub"); return; }
      var c = this.cfg();
      fetch("https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" + encodeURIComponent(c.repo), {
        headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" }
      }).then(function (r) {
        if (r.ok) { Util.toast("Conexión correcta con el repositorio"); self.indicar("Conectado", "ok"); }
        else if (r.status === 401) Util.toast("La clave no es válida o ha caducado");
        else if (r.status === 404) Util.toast("No encuentro ese repositorio (¿nombre o permisos?)");
        else Util.toast("GitHub respondió " + r.status);
      }).catch(function () { Util.toast("Sin conexión con GitHub"); });
    }
  };

  /* ---------- VOLVER A UNA PESTAÑA VIEJA ----------
     `cargar()` solo corría al arrancar. Si la pestaña del ordenador lleva
     abierta desde ayer y por la mañana anotaste en el móvil, al volver a ella
     no se enteraba de nada: seguía con el estado de ayer y, en cuanto tocabas
     algo, lo subía encima de lo del móvil.

     Ahora, al volver a la pestaña se consulta el repositorio y se fusiona. No
     hay que acordarse de cerrar nada. */
  function vigilarVuelta() {
    var ultima = 0;
    function mirar() {
      if (document.hidden) return;
      var ahora = Date.now();
      if (ahora - ultima < 20000) return;      // sin agobiar a la API
      ultima = ahora;
      if (Sync.configurado() && !Sync.ocupado) Sync.cargar();
      /* Y si se quedó algo tuyo sin subir —el móvil sin cobertura al guardar—,
         se reintenta aquí. Solo cuando hay algo pendiente: si no, sería una
         consulta a GitHub cada vez que vuelves a la pestaña, para nada. */
      if (Catalogo.pendiente && Catalogo.configurado() && !Catalogo.ocupado) Catalogo.subir(false);
    }
    document.addEventListener("visibilitychange", mirar);
    window.addEventListener("focus", mirar);
  }
  /* AL ABRIR LA APP se mira una vez si lo tuyo está en el repositorio. Cubre el
     caso de cerrar la app antes de que le diera tiempo a subir: en cuanto la
     vuelves a abrir con cobertura, sube. Si no hay nada que subir no escribe
     nada, solo lee. */
  function alAbrir() {
    vigilarVuelta();
    setTimeout(function () {
      if (Catalogo.configurado() && !Catalogo.ocupado) Catalogo.subir(false);
    }, 6000);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", alAbrir);
  } else { alAbrir(); }


  /* ==================================================================
     EL CATÁLOGO PÚBLICO
     ==================================================================
     Hasta hoy, una receta que escribías en el móvil subía dentro del estado,
     al repositorio PRIVADO, y a la base de datos de verdad —`datos/recetas.js`
     del repositorio público— no llegaba nunca. Por eso la app decía 164 recetas
     y el repositorio decía otra cosa.

     Ahora, cada vez que guardas una receta o un ingrediente, lo tuyo sube solo
     a `datos/nuevos.js`. Ese fichero es TUYO y de nadie más: la app no escribe
     jamás en `recetas.js` ni en `ingredientes.js`, y el .bat no escribe jamás
     en `nuevos.js`. Un escritor por fichero. Así no hay forma de pisarse.

     Antes de escribir se lee lo que hay en el repositorio y se funde: si has
     creado algo en el móvil y otra cosa en el ordenador, suben las dos. */

  function ficheroCatalogo(d) {
    return "/* TUS NOVEDADES \u2014 lo escribe la app sola. No editar a mano: se reescribe.\n" +
           "   " + (d.ingredientes || []).length + " ingredientes y " + (d.recetas || []).length +
           " recetas creados o corregidos por ti.\n" +
           "   \u00daltima vez: " + new Date().toLocaleString("es-ES") + " */\n" +
           "window.DATOS_NUEVOS = " + JSON.stringify(d) + ";\n";
  }

  function leerFicheroCatalogo(txt) {
    var p = String(txt || "").indexOf("DATOS_NUEVOS");
    if (p < 0) return { ingredientes: [], recetas: [] };
    var i = txt.indexOf("{", p), f = txt.lastIndexOf("}");
    if (i < 0 || f <= i) return { ingredientes: [], recetas: [] };
    var d;
    try { d = JSON.parse(txt.slice(i, f + 1)); } catch (e) { d = {}; }
    return { ingredientes: d.ingredientes || [], recetas: d.recetas || [] };
  }

  var Catalogo = {
    ocupado: false,
    temporizador: null,
    /* Hay algo tuyo que todavía no ha llegado al repositorio. Se pone al guardar
       y solo se quita cuando la subida ha ido bien. Es lo que permite reintentar
       sin preguntarle a GitHub cada dos por tres. */
    pendiente: false,

    cfg: function () { return (Almacen.estado.config && Almacen.estado.config.catalogo) || {}; },
    configurado: function () {
      var c = this.cfg();
      return !!(c.usuario && c.repo && c.token);
    },
    indicar: function (texto, clase) {
      var el = document.getElementById("estado-catalogo");
      if (!el) return;
      el.textContent = texto;
      el.className = "sync " + (clase || "");
    },

    api: function (metodo, cuerpo) {
      var c = this.cfg();
      var url = "https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" +
                encodeURIComponent(c.repo) + "/contents/" + RUTA_CATALOGO;
      if (metodo === "GET") url += "?ref=" + encodeURIComponent(c.rama || "main");
      return fetch(url, {
        method: metodo,
        headers: {
          "Authorization": "Bearer " + c.token,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
      });
    },

    /* Lo que hay ahora mismo en el repositorio, con su sha. Si el fichero no
       existe todavía, se devuelve vacío y se creará en la primera subida. */
    leerRemoto: function () {
      return this.api("GET").then(function (r) {
        if (r.status === 404) return { datos: { ingredientes: [], recetas: [] }, sha: null };
        if (!r.ok) throw new Error("GitHub respondió " + r.status);
        return r.json().then(function (j) {
          return { datos: leerFicheroCatalogo(deB64(j.content)), sha: j.sha };
        });
      });
    },

    /* Sube si hay algo que subir. Devuelve una promesa con true si escribió. */
    subir: function (avisar) {
      var self = this;
      if (!this.configurado()) { this.indicar("Sin configurar", ""); return Promise.resolve(false); }
      if (this.ocupado) {
        clearTimeout(this.temporizador);
        this.temporizador = setTimeout(function () { self.subir(avisar); }, 2500);
        return Promise.resolve(false);
      }
      this.ocupado = true;
      this.indicar("Subiendo tus novedades\u2026", "trabajando");
      return this.leerRemoto().then(function (r) {
        var mio = Almacen.novedades();
        /* EL SELLO DE LA HORA. Lo que ha cambiado respecto a lo que hay en el
           repositorio se sella con la hora de ahora; lo que no ha cambiado
           conserva la suya. Así el otro aparato sabe cuál de las dos versiones
           es la nueva sin tener que adivinarlo, y un fichero que no ha cambiado
           sigue siendo idéntico y no se sube por nada. */
        var deAlli = {}, ahora = new Date().toISOString();
        r.datos.ingredientes.forEach(function (x) { if (x && x.id) deAlli[x.id] = x; });
        r.datos.recetas.forEach(function (x) { if (x && x.id) deAlli[x.id] = x; });
        /* La misma comparación honrada que usa el almacén: por contenido, no por
           el orden en que estén escritos los campos. */
        function sinSello(x) { return Almacen.canon(x); }
        function sellar(lista) {
          return lista.map(function (x) {
            var c = JSON.parse(JSON.stringify(x));
            var ant = deAlli[c.id];
            c.tocado = (ant && sinSello(ant) === sinSello(c) && ant.tocado) ? ant.tocado : ahora;
            return c;
          });
        }
        mio = { ingredientes: sellar(mio.ingredientes), recetas: sellar(mio.recetas) };
        /* El de aquí manda en lo que esté en los dos; lo que solo esté allí se
           conserva, que puede venir de otro aparato. */
        /* QUÉ SE CONSERVA DE LO QUE YA HABÍA ALLÍ.
           Lo que este aparato no tiene todavía: vendrá de otro y no se toca.
           Lo que este aparato SÍ tiene y ya no cuenta como novedad —porque el
           catálogo grande lo absorbió— se suelta: su sitio es `recetas.js`, no
           aquí. Así el fichero se limpia solo en vez de crecer para siempre. */
        var tengo = {}, esMio = {};
        (Almacen.estado.ingredientes || []).forEach(function (x) { tengo[x.id] = true; });
        (Almacen.estado.recetas || []).forEach(function (x) { tengo[x.id] = true; });
        mio.ingredientes.forEach(function (x) { esMio[x.id] = true; });
        mio.recetas.forEach(function (x) { esMio[x.id] = true; });
        function conservar(lista) {
          return lista.filter(function (x) { return x && x.id && !esMio[x.id] && !tengo[x.id]; });
        }
        var junto = {
          ingredientes: fusionarListas(conservar(r.datos.ingredientes), mio.ingredientes, true),
          recetas: fusionarListas(conservar(r.datos.recetas), mio.recetas, true)
        };
        if (JSON.stringify(r.datos) === JSON.stringify(junto)) {
          self.ocupado = false;
          self.indicar("Al d\u00eda (" + junto.recetas.length + " recetas, " +
                       junto.ingredientes.length + " ingredientes)", "ok");
          self.pendiente = false;
          if (avisar) Util.toast("El cat\u00e1logo ya estaba al d\u00eda");
          return false;
        }
        var cuerpo = {
          message: "Cat\u00e1logo: " + junto.ingredientes.length + " ingredientes y " +
                   junto.recetas.length + " recetas tuyas",
          content: b64(ficheroCatalogo(junto)),
          branch: self.cfg().rama || "main"
        };
        if (r.sha) cuerpo.sha = r.sha;
        return self.api("PUT", cuerpo).then(function (r2) {
          self.ocupado = false;
          if (r2.status === 409 || r2.status === 422) {
            /* Alguien escribió entre la lectura y la escritura: se reintenta,
               y al reintentar se vuelve a leer y a fundir. Nunca se pisa. */
            self.indicar("Juntando con el otro aparato\u2026", "trabajando");
            return self.subir(avisar);
          }
          if (!r2.ok) throw new Error("GitHub respondi\u00f3 " + r2.status);
          self.pendiente = false;
          self.indicar("Subido (" + junto.recetas.length + " recetas, " +
                       junto.ingredientes.length + " ingredientes)", "ok");
          if (avisar) Util.toast("Cat\u00e1logo actualizado en el repositorio");
          return true;
        });
      }).catch(function (e) {
        self.ocupado = false;
        self.indicar("No se pudo subir", "error");
        console.warn("Cat\u00e1logo:", e);
        if (avisar) Util.toast("No se pudo subir el cat\u00e1logo");
        return false;
      });
    },

    programar: function () {
      var self = this;
      if (!this.configurado()) return;
      clearTimeout(this.temporizador);
      this.pendiente = true;
      this.indicar("Novedades sin subir", "pendiente");
      /* 30 segundos, no 4 (Carlos, 22-sep-2026: cuatro guardados seguidos hacían
         cuatro commits y cuatro despliegues de Pages, y Pages iba cancelando los
         anteriores). Con media horita de margen se juntan en uno solo. Lo
         guardado no corre peligro por esperar: está en el aparato desde el
         primer momento, y si cierras antes de que suba, sube al volver a abrir. */
      this.temporizador = setTimeout(function () { self.subir(false); }, 30000);
    },

    probar: function () {
      var c = this.cfg();
      if (!this.configurado()) { Util.toast("Faltan datos del cat\u00e1logo"); return; }
      fetch("https://api.github.com/repos/" + encodeURIComponent(c.usuario) + "/" + encodeURIComponent(c.repo), {
        headers: { "Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json" }
      }).then(function (r) {
        if (r.ok) { Util.toast("Conexi\u00f3n correcta con el cat\u00e1logo"); }
        else if (r.status === 401) Util.toast("La clave del cat\u00e1logo no vale");
        else if (r.status === 404) Util.toast("No encuentro ese repositorio");
        else Util.toast("GitHub respondi\u00f3 " + r.status);
      }).catch(function () { Util.toast("Sin conexi\u00f3n con GitHub"); });
    }
  };

  /* EL ENGANCHE: cada vez que el almacén guarda una receta o un ingrediente,
     se programa la subida. Se espera unos segundos para no subir cuatro veces
     mientras escribes. */
  if (global.Almacen && Almacen.suscribir) {
    Almacen.suscribir(function (motivo) {
      var m = String(motivo || "");
      if (m === "receta" || m === "ingrediente" || m === "suelto" || m === "capricho") {
        Catalogo.programar();
      }
    });
  }

  global.Catalogo = Catalogo;

  global.Sync = Sync;
})(window);
