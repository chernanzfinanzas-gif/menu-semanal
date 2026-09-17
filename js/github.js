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
          Almacen.estado.sync.sha = j.sha;
          var localTs = Almacen.estado.actualizado || "";
          var remotoTs = remoto.actualizado || "";
          if (remotoTs > localTs) {
            var tokenLocal = (Almacen.estado.config.github || {}).token || "";
            var shaAct = j.sha;
            remoto.sync = { sha: shaAct, ultima: new Date().toISOString() };
            if (!remoto.config) remoto.config = {};
            if (!remoto.config.github) remoto.config.github = {};
            remoto.config.github.token = tokenLocal;
            Almacen.reemplazar(remoto);
            self.indicar("Al día (traído del repo)", "ok");
            Util.toast("Datos actualizados desde GitHub");
            return true;
          }
          self.indicar("Al día", "ok");
          return false;
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
          // el repositorio cambió desde otro dispositivo: releemos el sha y reintentamos una vez
          return self.api("GET").then(function (r2) {
            if (!r2.ok) throw new Error("conflicto irresoluble");
            return r2.json();
          }).then(function (j) {
            Almacen.estado.sync.sha = j.sha;
            self.ocupado = false;
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

  global.Sync = Sync;
})(window);
