/* util.js — utilidades de fecha, formato y DOM */
(function (global) {
  "use strict";

  var DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  var Util = {
    DIAS: DIAS,
    TOMAS: [
      { k: "desayuno", n: "Desayuno" },
      { k: "almuerzo", n: "Almuerzo" },
      { k: "comida", n: "Comida" },
      { k: "merienda", n: "Merienda" },
      { k: "cena", n: "Cena" }
    ],

    hoyISO: function () { return this.aISO(new Date()); },

    aISO: function (d) {
      var m = ("0" + (d.getMonth() + 1)).slice(-2), dd = ("0" + d.getDate()).slice(-2);
      return d.getFullYear() + "-" + m + "-" + dd;
    },

    desdeISO: function (iso) {
      var p = iso.split("-");
      return new Date(+p[0], +p[1] - 1, +p[2]);
    },

    sumarDias: function (iso, n) {
      var d = this.desdeISO(iso);
      d.setDate(d.getDate() + n);
      return this.aISO(d);
    },

    lunesDe: function (iso) {
      var d = this.desdeISO(iso);
      var dia = d.getDay();               // 0 domingo
      var resta = dia === 0 ? 6 : dia - 1;
      d.setDate(d.getDate() - resta);
      return this.aISO(d);
    },

    etiquetaFecha: function (iso) {
      var d = this.desdeISO(iso);
      return d.getDate() + " " + MESES[d.getMonth()];
    },

    etiquetaRangoCorto: function (lunesISO) {
      var ini = this.desdeISO(lunesISO), fin = this.desdeISO(this.sumarDias(lunesISO, 6));
      var mesIni = MESES[ini.getMonth()].slice(0, 3), mesFin = MESES[fin.getMonth()].slice(0, 3);
      if (mesIni === mesFin) return ini.getDate() + "–" + fin.getDate() + " " + mesFin;
      return ini.getDate() + " " + mesIni + " – " + fin.getDate() + " " + mesFin;
    },

    etiquetaRango: function (lunesISO) {
      var fin = this.sumarDias(lunesISO, 6);
      return this.etiquetaFecha(lunesISO) + " – " + this.etiquetaFecha(fin) + " de " + this.desdeISO(fin).getFullYear();
    },

    formatearCantidad: function (c, u) {
      if (u === "ud") {
        var n = Math.ceil(c - 0.001);
        if (n < 1) n = 1;
        return n + (n === 1 ? " ud" : " ud");
      }
      if (u === "ml") {
        if (c >= 1000) return (c / 1000).toFixed(1).replace(".0", "") + " l";
        return Math.round(c / 10) * 10 + " ml";
      }
      if (c >= 1000) return (c / 1000).toFixed(2).replace(/\.?0+$/, "") + " kg";
      return Math.round(c / 10) * 10 + " g";
    },

    sal: function (g) {
      if (g < 0.01) return "0 g";
      return g.toFixed(2).replace(".", ",") + " g";
    },

    kcal: function (k) {
      k = Math.round(k || 0);
      return (k >= 1000 ? String(k).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : String(k)) + " kcal";
    },

    esc: function (s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    $: function (sel, raiz) { return (raiz || document).querySelector(sel); },
    $$: function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); },

    toast: function (msg, tipo) {
      var t = document.getElementById("toast");
      if (!t) return;
      t.textContent = msg;
      t.className = "toast visible " + (tipo || "");
      clearTimeout(t._temp);
      t._temp = setTimeout(function () { t.className = "toast"; }, 3200);
    }
  };

  global.Util = Util;
})(window);
