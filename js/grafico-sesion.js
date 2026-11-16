/* js/grafico-sesion.js — EL PERFIL DE UNA SESIÓN DE RODILLO, DIBUJADO.
   16-nov-2026, a petición de Carlos: «¿podemos hacer algo así en las fichas de
   nuestra app, que aparezcan en la ficha del entreno antes y después de
   hacerlo? y después comparar el gráfico con lo hecho de verdad y pintar las
   pulsaciones encima?».

   Dos usos, el mismo dibujo:
   · ANTES — sólo el perfil previsto, coloreado por zona. Viene de
     datos/semana-zwift.js (campo `perfil`: [segundos, % de FTP al empezar,
     % al acabar] por tramo).
   · DESPUÉS — el previsto en gris de fondo, encima las barras de lo que se
     hizo de verdad y una línea con el pulso. Lo hecho viene del análisis de
     rodillo.json (`bloques`, con sus segundos, vatios y pulso).

   No depende de nada: devuelve un SVG en texto. */
(function (global) {
  "use strict";

  /* Las zonas, en % de FTP. Los colores siguen el criterio de Zwift para que
     la lectura sea la misma que él ya tiene en la cabeza. */
  var ZONAS = [
    { h: 56, c: "#9aa3ab" },   /* Z1  recuperación   gris   */
    { h: 76, c: "#3b86c8" },   /* Z2  base           azul   */
    { h: 91, c: "#43a35b" },   /* Z3  tempo          verde  */
    { h: 106, c: "#d8b23a" },  /* Z4  umbral         amarillo */
    { h: 121, c: "#e2732f" },  /* Z5  techo          naranja */
    { h: 1e9, c: "#cc3b33" }   /* Z6  anaeróbico     rojo   */
  ];
  function color(pct) {
    for (var i = 0; i < ZONAS.length; i++) if (pct < ZONAS[i].h) return ZONAS[i].c;
    return ZONAS[ZONAS.length - 1].c;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* o = { perfil, bloques, ftp, alto, pulsoTecho } */
  function svg(o) {
    o = o || {};
    var perfil = o.perfil || [], bloques = o.bloques || [], ftp = o.ftp || 182;
    var W = 640, H = o.alto || 132, PB = 16, PT = 10;   /* márgenes abajo y arriba */
    var alto = H - PB - PT;

    /* --- los segundos totales: manda el más largo de los dos --- */
    var segPlan = 0, i;
    for (i = 0; i < perfil.length; i++) segPlan += perfil[i][0];
    var segReal = 0;
    for (i = 0; i < bloques.length; i++) segReal += (bloques[i].s || 0);
    var total = Math.max(segPlan, segReal);
    if (!total) return "";

    /* --- el techo del eje: el pico más alto, con un poco de aire --- */
    var tope = 100;
    for (i = 0; i < perfil.length; i++) tope = Math.max(tope, perfil[i][1], perfil[i][2]);
    for (i = 0; i < bloques.length; i++) {
      if (bloques[i].w != null) tope = Math.max(tope, bloques[i].w / ftp * 100);
    }
    tope = Math.ceil((tope + 8) / 10) * 10;

    var x = function (s) { return s / total * W; };
    var y = function (pct) { return PT + alto - (pct / tope * alto); };

    var out = [];

    /* --- la línea del 100 % de FTP, que es la referencia que importa --- */
    out.push('<line x1="0" y1="' + y(100).toFixed(1) + '" x2="' + W + '" y2="' + y(100).toFixed(1) +
      '" stroke="#b9303a" stroke-width="1" stroke-dasharray="4 3" opacity=".55"/>');
    out.push('<text x="4" y="' + (y(100) - 3).toFixed(1) + '" font-size="9" fill="#b9303a" opacity=".8">FTP ' + ftp + ' W</text>');

    /* --- EL PREVISTO --- */
    var hayReal = bloques.length > 0;
    var t = 0;
    for (i = 0; i < perfil.length; i++) {
      var tr = perfil[i], x0 = x(t), x1 = x(t + tr[0]);
      var y0 = y(tr[1]), y1 = y(tr[2]), base = y(0);
      var pico = (tr[1] + tr[2]) / 2;
      out.push('<polygon points="' + x0.toFixed(1) + "," + base.toFixed(1) + " " +
        x0.toFixed(1) + "," + y0.toFixed(1) + " " + x1.toFixed(1) + "," + y1.toFixed(1) + " " +
        x1.toFixed(1) + "," + base.toFixed(1) + '" fill="' +
        (hayReal ? "#c9ced3" : color(pico)) + '" opacity="' + (hayReal ? ".55" : "1") + '"/>');
      t += tr[0];
    }

    /* --- LO HECHO, encima --- */
    if (hayReal) {
      t = 0;
      for (i = 0; i < bloques.length; i++) {
        var b = bloques[i], s = b.s || 0;
        if (b.w != null) {
          var pct = b.w / ftp * 100, bx0 = x(t), bx1 = x(t + s);
          out.push('<rect x="' + bx0.toFixed(1) + '" y="' + y(pct).toFixed(1) +
            '" width="' + Math.max(0.6, bx1 - bx0).toFixed(1) + '" height="' +
            (y(0) - y(pct)).toFixed(1) + '" fill="' + color(pct) + '" opacity=".92"/>');
        }
        t += s;
      }

      /* --- el pulso, su propia escala, por encima de todo --- */
      var pp = [], loP = 1e9, hiP = -1e9;
      t = 0;
      for (i = 0; i < bloques.length; i++) {
        var bb = bloques[i], ss = bb.s || 0;
        if (bb.ppm != null) {
          pp.push([t + ss / 2, bb.ppm]);
          if (bb.ppm < loP) loP = bb.ppm;
          if (bb.ppm > hiP) hiP = bb.ppm;
        }
        t += ss;
      }
      if (pp.length > 1) {
        var margen = Math.max(6, (hiP - loP) * 0.25);
        var lo = loP - margen, hi = hiP + margen;
        var yp = function (v) { return PT + alto - ((v - lo) / (hi - lo) * alto); };
        var d = "";
        for (i = 0; i < pp.length; i++) d += (i ? " L" : "M") + x(pp[i][0]).toFixed(1) + "," + yp(pp[i][1]).toFixed(1);
        if (o.pulsoTecho) {
          out.push('<line x1="0" y1="' + yp(o.pulsoTecho).toFixed(1) + '" x2="' + W +
            '" y2="' + yp(o.pulsoTecho).toFixed(1) + '" stroke="#6b4ea8" stroke-width="1" stroke-dasharray="2 4" opacity=".5"/>');
        }
        out.push('<path d="' + d + '" fill="none" stroke="#6b4ea8" stroke-width="1.8" stroke-linejoin="round" opacity=".9"/>');
        out.push('<text x="' + (W - 4) + '" y="' + (yp(pp[pp.length - 1][1]) - 4).toFixed(1) +
          '" font-size="9" fill="#6b4ea8" text-anchor="end">' + hiP + ' máx</text>');
      }
    }

    /* --- los minutos, abajo --- */
    var minTot = Math.round(total / 60), paso = minTot > 80 ? 20 : minTot > 40 ? 10 : 5;
    for (var m = paso; m < minTot; m += paso) {
      out.push('<line x1="' + x(m * 60).toFixed(1) + '" y1="' + (H - PB).toFixed(1) +
        '" x2="' + x(m * 60).toFixed(1) + '" y2="' + (H - PB + 3).toFixed(1) + '" stroke="#b7bdc3"/>');
      out.push('<text x="' + x(m * 60).toFixed(1) + '" y="' + (H - 4) +
        '" font-size="9" fill="#8b9299" text-anchor="middle">' + m + "′</text>");
    }
    out.push('<line x1="0" y1="' + (H - PB).toFixed(1) + '" x2="' + W + '" y2="' + (H - PB).toFixed(1) + '" stroke="#b7bdc3"/>');

    return '<svg class="gses" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" ' +
      'role="img" aria-label="' + esc(o.titulo || "Perfil de la sesión") + '">' + out.join("") + "</svg>";
  }

  /* El perfil previsto de una sesión de ESTA semana, buscándola por su título
     en datos/semana-zwift.js. Las sesiones de semanas cerradas no lo tienen:
     entonces se dibuja sólo lo hecho, que ya es mejor que nada. */
  function perfilDe(nombreSesion) {
    var SZ = global.SEMANA_ZWIFT;
    if (!SZ || !SZ.sesiones || !nombreSesion) return null;
    for (var i = 0; i < SZ.sesiones.length; i++) {
      var s = SZ.sesiones[i];
      if (s.perfil && s.perfil.length && nombreSesion.indexOf(s.t) >= 0) return s;
    }
    return null;
  }

  global.GraficoSesion = { svg: svg, perfilDe: perfilDe, color: color };
})(window);
