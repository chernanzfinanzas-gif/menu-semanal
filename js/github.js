/* github.js — sincronización del estado con un repositorio de GitHub
   El token NUNCA se sube al repositorio: se queda en este dispositivo. */
(function (global) {
  "use strict";

  var RUTA = "datos/estado.json";

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

    configurado: function () {
      var c = this.cfg();
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
    }
    document.addEventListener("visibilitychange", mirar);
    window.addEventListener("focus", mirar);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", vigilarVuelta);
  } else { vigilarVuelta(); }

  global.Sync = Sync;
})(window);
