/* ============================================================================
   AvancesKHB — «Mis Avances»: cómo evoluciono DENTRO DE ESTE PLAN.
   1 de octubre de 2026 · Carlos HB & Claude.

   Lo pidió Carlos: «una pestaña Mis Avances con gráficos de cómo mejora
   potencia media, deriva y más cosas», y enseguida lo precisó: «es la
   evolución de este plan, no tener en cuenta el pasado. El pasado sirve para
   ver cómo fue y cómo estoy respecto a entonces, pero lo que me interesa es
   cómo evoluciono en este plan».

   Así que:
   · El eje de tiempo empieza el primer día del plan (DATOS_PLAN.rampa[0]).
   · Cada punto es una sesión de rodillo ANALIZADA (analisis_rodillo.py, que
     viaja en rodillo.json): deriva, vatios por pulsación, potencia, pulso,
     cadencia y objetivos cumplidos, todo medido con la misma regla.
   · El pasado entra como UNA línea discontinua de referencia: el mejor mes de
     rodillo antes del plan (mediana de vatios por pulsación, mín. 4 sesiones).
   · Carga de cada semana: la hecha (todas las actividades) contra la de la rampa.
   · FTP: la declarada, la de cada test cuando lo haya, y el objetivo.

   NO DEPENDE DE NADA: recibe los datos y devuelve HTML. Sin librerías: SVG a
   mano, con su tooltip (<title>) y su tabla de datos debajo de cada gráfico.

     AvancesKHB.html({ sesiones: <rodillo.json>.sesiones,
                       actividades: <salud.json>.actividades,
                       plan: DATOS_PLAN, hoy: "AAAA-MM-DD" })
   ========================================================================== */

(function (global) {
  "use strict";

  /* El objetivo lo fijó Carlos (plan-zwift, 28-sep-2026): 280 W con 75-80 kg.
     La fecha no se pone hasta tener dos tests. */
  var FTP_OBJETIVO = 280;
  var MES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  var DIA = 86400000;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function num(v, dec) {
    if (v == null || isNaN(v)) return "—";
    return Number(v).toLocaleString("es-ES", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
  }
  function dosD(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + dosD(d.getMonth() + 1) + "-" + dosD(d.getDate()); }
  function fechaDe(s) { var d = new Date(s); return isNaN(d.getTime()) ? null : d; }
  function diaCorto(f) { var p = f.split("-"); return (+p[2]) + " " + MES[(+p[1]) - 1]; }
  function msDe(f) { var p = f.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }
  function mediana(v) {
    v = v.filter(function (x) { return x != null && !isNaN(x); }).sort(function (a, b) { return a - b; });
    if (!v.length) return null;
    var m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }
  function esRodillo(a) { return a && (a.rodillo === true || a.tipo === "VirtualRide"); }

  /* ---------- los datos ---------- */
  function sesionesDelPlan(sesiones, inicio) {
    var out = [];
    (sesiones || []).forEach(function (s) {
      var a = s.analisis, d = fechaDe(s.inicio);
      if (!a || a.nada || !d) return;
      var f = iso(d);
      if (f < inicio) return;
      var ok = 0, tot = 0;
      (a.objetivos || []).forEach(function (o) { tot++; if (o.ok) ok++; });
      out.push({ f: f, t: d.getTime(), a: a, ok: ok, tot: tot, min: s.min,
                 nombre: a.libre ? "Sesión libre" : (a.sesion || "Rodillo") });
    });
    return out.sort(function (p, q) { return p.t - q.t; });
  }

  /* El mejor mes de rodillo ANTES del plan: la referencia de «cómo estaba». */
  function referencia(actividades, inicio) {
    var porMes = {};
    (actividades || []).forEach(function (a) {
      var f = String(a.fecha || "").slice(0, 10);
      if (!f || f >= inicio || !esRodillo(a)) return;
      if ((a.min_mov || 0) < 30 || !a.pot_media || !a.pulso_med) return;
      (porMes[f.slice(0, 7)] = porMes[f.slice(0, 7)] || []).push(a);
    });
    var mejor = null;
    Object.keys(porMes).forEach(function (m) {
      var l = porMes[m];
      if (l.length < 4) return;
      var wp = mediana(l.map(function (a) { return a.pot_media / a.pulso_med; }));
      if (!mejor || wp > mejor.wppm) {
        mejor = { mes: m, n: l.length, wppm: wp,
                  w: mediana(l.map(function (a) { return a.pot_media; })),
                  ppm: mediana(l.map(function (a) { return a.pulso_med; })),
                  rpm: mediana(l.map(function (a) { return a.cadencia; })) };
      }
    });
    if (mejor) {
      var p = mejor.mes.split("-");
      mejor.et = MES[(+p[1]) - 1] + " " + p[0];
    }
    return mejor;
  }

  function semanasDelPlan(plan, actividades, hoy) {
    var r = (plan && plan.rampa) || [];
    return r.map(function (w) {
      var hecha = 0, n = 0;
      (actividades || []).forEach(function (a) {
        var f = String(a.fecha || "").slice(0, 10);
        if (f >= w.desde && f <= w.hasta && a.esfuerzo != null) { hecha += a.esfuerzo; n++; }
      });
      return { n: w.n, desde: w.desde, hasta: w.hasta, prevista: w.carga, hecha: hecha, act: n,
               descarga: /DESCARGA/i.test(w.nota || ""), test: /test/i.test(w.nota || ""),
               curso: hoy >= w.desde && hoy <= w.hasta, futura: hoy < w.desde };
    });
  }

  /* La FTP declarada sale de la tarea del plan («Poner la FTP en 155 W…»). */
  function ftpDeclarada(plan, inicio) {
    var t = ((plan && plan.tareas) || []).filter(function (x) { return x.id && /^ftp\d+/.test(x.id); })[0];
    var w = t ? +String(t.id).replace(/\D/g, "") : null;
    return w ? { w: w, f: inicio } : null;
  }

  /* ---------- un gráfico de línea, un solo eje ----------
     o = { id, puntos:[{x:ms, y, f, et}], dom:[ms0, ms1], umbral:{y, et, malo:"arriba"|"abajo"},
           ref:{y, et}, banda:[y0,y1,et], semanas, fmt(y), suf, dec, minY, maxY } */
  /* El ancho del dibujo se decide al pintar: a 640 en un móvil las letras
     quedaban de 5 px. En pantalla estrecha se dibuja a 360 y se lee igual. */
  var W = 640, H = 190, M = { l: 44, r: 58, t: 14, b: 30 };
  function medidas() {
    var estrecha = global.innerWidth && global.innerWidth < 620;
    W = estrecha ? 360 : 640; H = estrecha ? 200 : 190;
    M = estrecha ? { l: 36, r: 50, t: 14, b: 30 } : { l: 44, r: 58, t: 14, b: 30 };
  }

  function grafico(o) {
    var pts = o.puntos;
    var ys = pts.map(function (p) { return p.y; });
    if (o.umbral) ys.push(o.umbral.y);
    if (o.ref) ys.push(o.ref.y);
    if (o.banda) ys.push(o.banda[0], o.banda[1]);
    if (o.extra) ys = ys.concat(o.extra);
    if (o.meta) o.meta.forEach(function (e) { ys.push(e.y); });
    var y0 = o.minY != null ? o.minY : Math.min.apply(null, ys);
    var y1 = o.maxY != null ? o.maxY : Math.max.apply(null, ys);
    if (y1 - y0 < (o.rangoMin || 1)) { var c = (y0 + y1) / 2; y0 = c - (o.rangoMin || 1) / 2; y1 = c + (o.rangoMin || 1) / 2; }
    var pad = (y1 - y0) * 0.12; y0 -= pad; y1 += pad;
    var x0 = o.dom[0], x1 = o.dom[1];
    function X(v) { return M.l + (v - x0) / (x1 - x0) * (W - M.l - M.r); }
    function Y(v) { return H - M.b - (v - y0) / (y1 - y0) * (H - M.t - M.b); }
    var s = [];
    /* las semanas de descarga y de test, como fondo: dicen por qué un punto cae */
    (o.semanas || []).forEach(function (w) {
      var a = msDe(w.desde), b = msDe(w.hasta) + DIA;
      if (b < x0 || a > x1) return;
      if (w.descarga || w.test) {
        s.push('<rect class="av-desc" x="' + X(Math.max(a, x0)).toFixed(1) + '" y="' + M.t + '" width="' +
          (X(Math.min(b, x1)) - X(Math.max(a, x0))).toFixed(1) + '" height="' + (H - M.t - M.b) + '"/>' +
          '<text class="av-desc-t" x="' + (X(Math.max(a, x0)) + 4).toFixed(1) + '" y="' + (M.t + 10) + '">' +
          (w.test && w.descarga ? "descarga · test" : w.test ? "test" : "descarga") + "</text>");
      }
    });
    /* la revisión de cada semana: raya discontinua en el lunes siguiente, que
       es cuando empieza a mandar lo decidido. Tocarla enseña la decisión. */
    (o.semanas || []).forEach(function (w) {
      if (!w.rev || !w.hasta) return;
      var xr = msDe(w.hasta) + DIA;
      if (xr < x0 || xr > x1) return;
      var xx = X(xr).toFixed(1);
      s.push('<g class="av-rev' + (w.rev.pendiente ? " pte" : "") + '"><title>' +
        esc("Revisión de la semana " + w.n + ": " + w.rev.resumen) + "</title>" +
        '<line x1="' + xx + '" x2="' + xx + '" y1="' + M.t + '" y2="' + (H - M.b) + '"/>' +
        '<rect x="' + (X(xr) - 1).toFixed(1) + '" y="' + (M.t - 2) + '" width="44" height="14" rx="3"/>' +
        '<text x="' + (X(xr) + 3).toFixed(1) + '" y="' + (M.t + 8) + '">Rev. S' + w.n + "</text></g>");
    });
    /* rejilla: tres valores en el eje y */
    for (var k = 0; k <= 2; k++) {
      var yv = y0 + pad + (y1 - y0 - 2 * pad) * k / 2;
      s.push('<line class="av-grid" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + Y(yv).toFixed(1) + '" y2="' + Y(yv).toFixed(1) + '"/>' +
        '<text class="av-eje" x="' + (M.l - 6) + '" y="' + (Y(yv) + 3.5).toFixed(1) + '" text-anchor="end">' + o.fmt(yv) + "</text>");
    }
    /* eje x: el lunes de cada semana del plan, con su número */
    (o.semanas || []).forEach(function (w) {
      var a = msDe(w.desde);
      if (a < x0 || a > x1) return;
      s.push('<line class="av-tick" x1="' + X(a).toFixed(1) + '" x2="' + X(a).toFixed(1) + '" y1="' + (H - M.b) + '" y2="' + (H - M.b + 4) + '"/>' +
        '<text class="av-eje" x="' + X(a).toFixed(1) + '" y="' + (H - M.b + 15) + '" text-anchor="middle">S' + w.n + "</text>" +
        '<text class="av-eje av-eje2" x="' + X(a).toFixed(1) + '" y="' + (H - M.b + 26) + '" text-anchor="middle">' + diaCorto(w.desde) + "</text>");
    });
    if (o.banda) {
      s.push('<rect class="av-banda" x="' + M.l + '" width="' + (W - M.l - M.r) + '" y="' + Y(o.banda[1]).toFixed(1) +
        '" height="' + (Y(o.banda[0]) - Y(o.banda[1])).toFixed(1) + '"/>' +
        '<text class="av-et-der" x="' + (W - M.r + 4) + '" y="' + (Y((o.banda[0] + o.banda[1]) / 2) + 3).toFixed(1) + '">' + o.banda[2] + "</text>");
    }
    if (o.meta && o.meta.length) {   /* un objetivo que cambia por semanas: escalones discontinuos */
      var dm = "";
      o.meta.forEach(function (e, i) {
        var xa = X(Math.max(e.x, x0)), xb = X(i + 1 < o.meta.length ? o.meta[i + 1].x : x1);
        dm += (i ? "L" : "M") + xa.toFixed(1) + " " + Y(e.y).toFixed(1) + "L" + xb.toFixed(1) + " " + Y(e.y).toFixed(1);
      });
      var ultm = o.meta[o.meta.length - 1];
      s.push('<path class="av-umbral" fill="none" d="' + dm + '"/>' +
        '<text class="av-et-der av-umbral-t" x="' + (W - M.r + 4) + '" y="' + (Y(ultm.y) + 3).toFixed(1) + '">' + (o.metaEt || "objetivo") + "</text>");
    }
    if (o.umbral) {
      s.push('<line class="av-umbral" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + Y(o.umbral.y).toFixed(1) + '" y2="' + Y(o.umbral.y).toFixed(1) + '"/>' +
        '<text class="av-et-der av-umbral-t" x="' + (W - M.r + 4) + '" y="' + (Y(o.umbral.y) + 3).toFixed(1) + '">' + o.umbral.et + "</text>");
    }
    if (o.ref) {
      s.push('<line class="av-ref" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + Y(o.ref.y).toFixed(1) + '" y2="' + Y(o.ref.y).toFixed(1) + '"/>' +
        '<text class="av-et-der av-ref-t" x="' + (W - M.r + 4) + '" y="' + (Y(o.ref.y) + 3).toFixed(1) + '">' + o.ref.et + "</text>");
    }
    if (o.escalones) {               /* la FTP: un valor que dura hasta el siguiente */
      var d = "";
      o.escalones.forEach(function (e, i) {
        var xa = X(Math.max(e.x, x0)), xb = X(i + 1 < o.escalones.length ? o.escalones[i + 1].x : x1);
        d += (i ? "L" : "M") + xa.toFixed(1) + " " + Y(e.y).toFixed(1) + "L" + xb.toFixed(1) + " " + Y(e.y).toFixed(1);
      });
      s.push('<path class="av-linea" d="' + d + '"/>');
    } else if (pts.length > 1) {
      s.push('<path class="av-linea" d="' + pts.map(function (p, i) {
        return (i ? "L" : "M") + X(p.x).toFixed(1) + " " + Y(p.y).toFixed(1);
      }).join("") + '"/>');
    }
    pts.forEach(function (p, i) {
      var ult = i === pts.length - 1;
      s.push('<g class="av-pt' + (p.mal ? " av-mal" : "") + '"><circle class="av-hit" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="12"/>' +
        '<circle class="av-dot" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="4.5"/>' +
        "<title>" + esc(diaCorto(p.f) + " · " + p.et + ": " + o.fmt(p.y) + (o.suf || "")) + "</title></g>" +
        (ult ? '<text class="av-et-pt" x="' + (X(p.x) + 8).toFixed(1) + '" y="' + (Y(p.y) - 8).toFixed(1) + '">' + o.fmt(p.y) + (o.suf || "") + "</text>" : ""));
    });
    if (!pts.length && !o.escalones) {
      s.push('<text class="av-vacio" x="' + (W / 2) + '" y="' + (H / 2) + '" text-anchor="middle">Sin sesiones analizadas todavía</text>');
    }
    return '<svg class="av-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.titulo) + '">' + s.join("") + "</svg>";
  }

  function tabla(cab, filas) {
    return '<details class="av-datos"><summary>Ver los datos</summary><table><thead><tr>' +
      cab.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
      filas.map(function (f) { return "<tr>" + f.map(function (c, i) { return (i ? "<td>" : "<th>") + c + (i ? "</td>" : "</th>"); }).join("") + "</tr>"; }).join("") +
      "</tbody></table></details>";
  }

  function tarjeta(titulo, sub, cuerpo, pie) {
    return '<section class="av-tarjeta"><h3>' + titulo + "</h3>" +
      (sub ? '<p class="av-sub">' + sub + "</p>" : "") + cuerpo +
      (pie ? '<p class="av-pie">' + pie + "</p>" : "") + "</section>";
  }

  function cambio(a, b, dec, suf, mejorSiBaja) {
    if (a == null || b == null) return "";
    var d = b - a;
    if (Math.abs(d) < Math.pow(10, -(dec || 0)) / 2) return '<span class="av-igual">igual</span>';
    var bien = mejorSiBaja ? d < 0 : d > 0;
    return '<span class="' + (bien ? "av-mejor" : "av-peor") + '">' + (d > 0 ? "+" : "−") + num(Math.abs(d), dec) + (suf || "") + "</span>";
  }

  /* ---------- EL FANTASMA: tú en tu subida anterior ----------
     Carlos, 1-oct-2026: «x meses antes de tu tope estabas en este punto…
     ahora estás aquí». Comprobado ese día que hoy está más bajo que en
     cualquier momento desde 2021, así que no se busca «cuándo estuve así»:
     se ALINEA POR SEMANAS desde el inicio de cada subida. La de 2022 empieza
     con su primer rodillo, el 18-nov-2021 (antes no hay rodillo: comprobado
     en el archivo 2013-2021). Las semanas 1-10 de entonces no tienen vatios:
     el reloj grababa sin el potenciómetro; el primero es del 31-ene-2022.
     LOS VATIOS DE ENTONCES SE CORRIGEN: se midieron con pedales Assioma y
     Carlos estima que marcaban un 10 % más que la Kickr Bike. Es SU
     estimación, sin medir: se mide con una sesión con los pedales montados
     en la Kickr, y entonces se cambia FACTOR y nada más. */
  var FANTASMA = { inicio: "2021-11-18", et: "2022", factor: 0.90,
    aviso: "Vatios de 2022 (pedales Assioma) corregidos −10 %: estimación tuya, sin medir todavía." };

  function esBici(a) { return a && (a.rodillo === true || a.tipo === "VirtualRide" || a.tipo === "Ride"); }

  function porSemanas(acts, curvas, inicio, factor, nSem) {
    var i0 = msDe(inicio), out = [];
    for (var k = 1; k <= nSem; k++) out.push({ k: k, min: 0, n: 0, wp: [], m20: null });
    (acts || []).forEach(function (a) {
      if (!esBici(a)) return;
      var f = String(a.fecha || "").slice(0, 10);
      if (!f) return;
      var k = Math.floor((msDe(f) - i0) / (7 * DIA)) + 1;
      if (k < 1 || k > nSem) return;
      var s = out[k - 1];
      s.n++; s.min += a.min_mov || 0;
      if (a.pot_media && a.pulso_med && (a.min_mov || 0) >= 30) s.wp.push(a.pot_media * factor / a.pulso_med);
      var c = curvas && a.id && curvas[a.id];
      if (c && c["1200"]) s.m20 = Math.max(s.m20 || 0, c["1200"] * factor);
    });
    out.forEach(function (s) { s.wppm = mediana(s.wp); s.h = s.min / 60; });
    return out;
  }

  /* gráfico por semanas de la subida, dos series en el mismo eje */
  function graficoSem(o) {
    var ser = o.series, K = o.K, ys = [];
    ser.forEach(function (S) { S.puntos.forEach(function (p) { if (p.y != null) ys.push(p.y); }); });
    if (!ys.length) return '<p class="av-sub">Sin datos todavía.</p>';
    var y0 = o.minY != null ? o.minY : Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (y1 - y0 < (o.rangoMin || 1)) { var c = (y0 + y1) / 2; y0 = c - o.rangoMin / 2; y1 = c + o.rangoMin / 2; if (o.minY != null) { y0 = o.minY; } }
    var pad = (y1 - y0) * 0.12; y1 += pad; if (o.minY == null) y0 -= pad;
    function X(k) { return M.l + (k - 1) / (K - 1) * (W - M.l - M.r); }
    function Y(v) { return H - M.b - (v - y0) / (y1 - y0) * (H - M.t - M.b); }
    var s = [];
    for (var g = 0; g <= 2; g++) {
      var yv = y0 + (y1 - y0) * (g / 2) * 0.9 + (g ? 0 : 0);
      s.push('<line class="av-grid" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + Y(yv).toFixed(1) + '" y2="' + Y(yv).toFixed(1) + '"/>' +
        '<text class="av-eje" x="' + (M.l - 6) + '" y="' + (Y(yv) + 3.5).toFixed(1) + '" text-anchor="end">' + o.fmt(yv) + "</text>");
    }
    var paso = K > 16 ? 4 : K > 8 ? 2 : 1;
    for (var k = 1; k <= K; k += paso) {
      s.push('<text class="av-eje" x="' + X(k).toFixed(1) + '" y="' + (H - M.b + 15) + '" text-anchor="middle">' + k + "</text>");
    }
    s.push('<text class="av-eje av-eje2" x="' + ((M.l + W - M.r) / 2) + '" y="' + (H - M.b + 27) + '" text-anchor="middle">semana de la subida</text>');
    if (o.hoyK) {
      s.push('<line class="av-hoy" x1="' + X(o.hoyK).toFixed(1) + '" x2="' + X(o.hoyK).toFixed(1) + '" y1="' + M.t + '" y2="' + (H - M.b) + '"/>' +
        '<text class="av-desc-t" x="' + (X(o.hoyK) + 3).toFixed(1) + '" y="' + (M.t + 9) + '">hoy</text>');
    }
    ser.forEach(function (S) {
      var tramos = [], cur = [];
      S.puntos.forEach(function (p) { if (p.y == null) { if (cur.length) tramos.push(cur); cur = []; } else cur.push(p); });
      if (cur.length) tramos.push(cur);
      tramos.forEach(function (t) {
        if (t.length > 1) s.push('<path class="' + S.clase + '" d="' + t.map(function (p, i) {
          return (i ? "L" : "M") + X(p.k).toFixed(1) + " " + Y(p.y).toFixed(1); }).join("") + '"/>');
      });
      var ult = null;
      S.puntos.forEach(function (p) {
        if (p.y == null) return; ult = p;
        s.push('<g><circle class="av-hit" cx="' + X(p.k).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="10"/>' +
          '<circle class="' + S.clase + '-dot" cx="' + X(p.k).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (S.clase === "av-fant" ? 3 : 4.5) + '"/>' +
          "<title>" + esc(S.nombre + " · semana " + p.k + ": " + o.fmt(p.y) + (o.suf || "")) + "</title></g>");
      });
      if (ult) s.push('<text class="av-et-pt ' + S.clase + '-t" x="' + (X(ult.k) + 7).toFixed(1) + '" y="' + (Y(ult.y) + 4).toFixed(1) + '">' + S.nombre + "</text>");
    });
    return '<svg class="av-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(o.titulo) + '">' + s.join("") + "</svg>";
  }

  function htmlFantasma(o, inicioPlan, hoy) {
    if (!o.todas || !o.todas.length) return "";
    var F = FANTASMA;
    var hoyK = Math.floor((msDe(hoy) - msDe(inicioPlan)) / (7 * DIA)) + 1;
    var K = Math.max(hoyK + 6, 12);
    var ent = porSemanas(o.todas, o.curvas, F.inicio, F.factor, 120);
    var aho = porSemanas(o.todas, o.curvas, inicioPlan, 1, K);
    if (!ent.some(function (s) { return s.n; })) return "";
    var entK = ent.slice(0, K);
    function serie(lista, campo, hasta) {
      return lista.map(function (s) { return { k: s.k, y: (hasta && s.k > hasta) ? null : (s[campo] != null && (campo !== "h" || s.n || s.k <= hasta) ? s[campo] : null) }; });
    }
    var leyenda = '<div class="av-leyenda"><span><i class="av-l-hecha"></i>Ahora (desde el ' + diaCorto(inicioPlan) + ")</span>" +
      '<span><i class="av-l-fant"></i>' + F.et + " (desde el " + diaCorto(F.inicio) + " de 2021)</span></div>";
    var g1 = graficoSem({ titulo: "Vatios por pulsación", K: K, hoyK: hoyK, fmt: function (v) { return num(v, 2); }, rangoMin: 0.3,
      series: [{ nombre: F.et, clase: "av-fant", puntos: serie(entK, "wppm") },
               { nombre: "ahora", clase: "av-ahora", puntos: serie(aho, "wppm", hoyK) }] });
    var g2 = graficoSem({ titulo: "Horas de bici por semana", K: K, hoyK: hoyK, fmt: function (v) { return num(v, 0); }, suf: " h", rangoMin: 4, minY: 0,
      series: [{ nombre: F.et, clase: "av-fant", puntos: entK.map(function (s) { return { k: s.k, y: s.h }; }) },
               { nombre: "ahora", clase: "av-ahora", puntos: aho.map(function (s) { return { k: s.k, y: s.k <= hoyK ? s.h : null }; }) }] });
    var g3 = graficoSem({ titulo: "Mejores 20 minutos", K: K, hoyK: hoyK, fmt: function (v) { return num(v, 0); }, suf: " W", rangoMin: 40,
      series: [{ nombre: F.et, clase: "av-fant", puntos: serie(entK, "m20") },
               { nombre: "ahora", clase: "av-ahora", puntos: serie(aho, "m20", hoyK) }] });

    /* la comparación en palabras, en la última semana con dato de las dos */
    var txt = [], primeroEnt = null;
    for (var i = 0; i < ent.length; i++) if (ent[i].wppm != null) { primeroEnt = ent[i]; break; }
    var ultAho = null;
    aho.forEach(function (s) { if (s.k <= hoyK && s.wppm != null) ultAho = s; });
    if (ultAho) {
      var mismo = ent[ultAho.k - 1];
      if (mismo && mismo.wppm != null) {
        txt.push("En la semana " + ultAho.k + " de " + F.et + " ibas a " + num(mismo.wppm, 2) + " vatios por pulsación; ahora, a " + num(ultAho.wppm, 2) + ".");
      } else if (primeroEnt) {
        txt.push("En la semana " + ultAho.k + " de " + F.et + " todavía no medías vatios. El primer dato de entonces es de la semana " +
          primeroEnt.k + ": " + num(primeroEnt.wppm, 2) + " vatios por pulsación. Ahora, en la semana " + ultAho.k + ": " + num(ultAho.wppm, 2) + ".");
      }
    }
    var hAho = aho.slice(0, hoyK).reduce(function (t, s) { return t + s.h; }, 0);
    var hEnt = ent.slice(0, hoyK).reduce(function (t, s) { return t + s.h; }, 0);
    txt.push("Horas de bici acumuladas hasta esta semana: " + num(hAho, 1) + " h ahora, " + num(hEnt, 1) + " h en " + F.et + ".");
    for (var j = 0; j < ent.length; j++) {
      if (ent[j].m20 != null && ent[j].m20 * 0.95 >= FTP_OBJETIVO) {
        var d = new Date(msDe(F.inicio) + (ent[j].k - 1) * 7 * DIA);
        txt.push("Aquella subida llegó a una FTP de " + FTP_OBJETIVO + " (ya corregida) en la semana " + ent[j].k +
          " (" + MES[d.getMonth()] + " " + d.getFullYear() + "): algo más de un año.");
        break;
      }
    }
    return tarjeta("Tú ahora y tú en " + F.et,
      "Las dos subidas alineadas por semanas desde su primer día. No es para competir con aquel: es para ver si el ritmo de mejora se parece. " +
      F.aviso,
      leyenda +
      '<h4 class="av-h4">Vatios por pulsación</h4>' + g1 +
      '<h4 class="av-h4">Horas de bici por semana</h4>' + g2 +
      '<h4 class="av-h4">Mejores 20 minutos</h4>' + g3 +
      '<p class="av-sub av-nota20">Ahora, hasta el test, tus mejores 20 minutos salen de sesiones suaves: no son tu tope. Se comparan de verdad desde el test.</p>' +
      '<p class="av-lect">' + txt.join(" ") + "</p>" +
      tabla(["Semana", F.et + " W/ppm", "ahora W/ppm", F.et + " h", "ahora h", F.et + " 20′", "ahora 20′"],
        entK.map(function (s, i) { var a = aho[i];
          return [String(s.k), num(s.wppm, 2), a && a.k <= hoyK ? num(a.wppm, 2) : "", num(s.h, 1), a && a.k <= hoyK ? num(a.h, 1) : "",
                  num(s.m20, 0), a && a.k <= hoyK ? num(a.m20, 0) : ""]; })), "");
  }

  /* ---------- la pantalla ---------- */
  function html(o) {
    var plan = o.plan || {}, r = plan.rampa || [];
    if (!r.length) return '<p class="nota-peque">No encuentro la rampa del plan (datos/plan.js).</p>';
    var hoy = o.hoy || iso(new Date());
    medidas();
    var inicio = r[0].desde, fin = r[r.length - 1].hasta;
    var ses = sesionesDelPlan(o.sesiones, inicio);
    /* SIN REFERENCIA DEL PASADO RECIENTE (Carlos, 1-oct-2026): «no compares la
       subida de 2026… fue de sobreesfuerzo y no sé si todo lo que tengo ahora
       tiene que ver con esa fatiga… olvida 2026». La comparación con el pasado
       queda sólo en el fantasma de 2022. `referencia()` se conserva por si se
       pide otra vez, pero no se usa. */
    var ref = null;
    var sem = semanasDelPlan(plan, o.actividades, hoy);
    var actual = sem.filter(function (w) { return w.curso; })[0];
    /* la ventana: desde el principio del plan hasta una semana después de hoy,
       con un mínimo de cuatro semanas para que dos puntos no ocupen todo */
    var x0 = msDe(inicio), x1 = Math.max(msDe(hoy) + 7 * DIA, x0 + 28 * DIA);
    if (x1 > msDe(fin) + DIA) x1 = msDe(fin) + DIA;
    var dom = [x0, x1];
    var semVis = sem.filter(function (w) { return msDe(w.desde) <= x1; });

    var prim = ses[0], ult = ses[ses.length - 1];
    var horas = ses.reduce(function (t, s) { return t + (s.min || 0); }, 0) / 60;
    var ftpD = ftpDeclarada(plan, inicio);
    var tests = ses.filter(function (s) { return s.a.ftp_test; });
    var ftpAhora = tests.length ? tests[tests.length - 1].a.ftp_test : (ftpD ? ftpD.w : null);

    /* --- cifras de cabecera --- */
    function cifra(et, v, sub) {
      return '<div class="av-cifra"><span class="av-et">' + et + '</span><span class="av-v">' + v + "</span>" +
        (sub ? '<span class="av-csub">' + sub + "</span>" : "") + "</div>";
    }
    var cab = '<div class="av-cifras">' +
      cifra("Semana del plan", actual ? actual.n + " de " + r.length : "—",
            actual ? [actual.descarga ? "descarga" : "", actual.test ? "con test" : "", "empezó el " + diaCorto(inicio)]
              .filter(Boolean).join(" · ") : "") +
      cifra("Rodillo analizado", ses.length + (ses.length === 1 ? " sesión" : " sesiones"), num(horas, 1) + " h") +
      cifra("Deriva", ult && ult.a.deriva != null ? num(ult.a.deriva, 1) + " %" : "—",
            prim && ult && prim !== ult ? "al empezar " + num(prim.a.deriva, 1) + " % · " + cambio(prim.a.deriva, ult.a.deriva, 1, " pt", true) : "objetivo &lt; 5 %") +
      cifra("Vatios por pulsación", ult ? num(ult.a.w_ppm, 2) : "—",
            (prim && ult && prim !== ult ? "al empezar " + num(prim.a.w_ppm, 2) + " · " + cambio(prim.a.w_ppm, ult.a.w_ppm, 2, "", false) : "") +
            (ref ? (prim && ult && prim !== ult ? "<br>" : "") + "en " + ref.et + ": " + num(ref.wppm, 2) : "")) +
      cifra("FTP", ftpAhora ? ftpAhora + " W" : "—",
            (tests.length ? "medida en test" : "declarada, sin test") + " · objetivo " + FTP_OBJETIVO + " W") +
      "</div>";

    var P = function (campo, fmtMal) {
      return ses.filter(function (s) { return s.a[campo] != null; }).map(function (s) {
        return { x: s.t, y: s.a[campo], f: s.f, et: s.nombre, mal: fmtMal ? fmtMal(s) : false };
      });
    };
    /* 4-oct-2026: cada semana lleva su revisión, si la hay, para marcar en los
       gráficos el lunes en que empieza a mandar lo que se decidió. */
    var revPorN = {};
    (o.revisiones || []).forEach(function (r) { revPorN[r.n] = r; });
    var semFondo = semVis.map(function (w) {
      var r = revPorN[w.n];
      if (!r) return w;
      var c = {}; for (var k in w) if (w.hasOwnProperty(k)) c[k] = w[k];
      c.rev = { pendiente: r.pendiente, resumen: resumenRev(r) };
      return c;
    });

    var gDeriva = tarjeta("Deriva cardiaca",
      "Cuánto sube el pulso de la primera a la segunda mitad del bloque principal con los mismos vatios. Bajar es mejorar.",
      grafico({ titulo: "Deriva", puntos: P("deriva", function (s) { return s.a.deriva >= 5; }), dom: dom,
                umbral: { y: 5, et: "5 %" }, semanas: semFondo, fmt: function (v) { return num(v, 1); }, suf: " %", rangoMin: 4, minY: 0 }) +
      tabla(["Sesión", "Deriva", "Pulso 1.ª mitad", "2.ª mitad"],
            ses.map(function (s) { return [diaCorto(s.f) + " · " + esc(s.nombre), num(s.a.deriva, 1) + " %", num(s.a.ppm_1, 0), num(s.a.ppm_2, 0)]; })),
      "Por debajo del 5 % es base aeróbica sólida para esa potencia. Las sesiones libres se miden igual, sin calentamiento ni vuelta a la calma.");

    var gEf = tarjeta("Vatios por pulsación",
      "Potencia media dividida por el pulso medio del bloque principal: cuánto trabajo saca el corazón de cada latido. Subir es mejorar.",
      grafico({ titulo: "Vatios por pulsación", puntos: P("w_ppm"), dom: dom, semanas: semFondo,
                ref: ref ? { y: ref.wppm, et: ref.et } : null, fmt: function (v) { return num(v, 2); }, rangoMin: 0.2 }) +
      tabla(["Sesión", "W/ppm", "W", "ppm"],
            ses.map(function (s) { return [diaCorto(s.f) + " · " + esc(s.nombre), num(s.a.w_ppm, 2), num(s.a.w, 0), num(s.a.ppm, 0)]; })),
      ref ? "La línea gris es tu mejor mes de rodillo antes del plan (" + ref.et + ", " + ref.n +
        " sesiones, " + num(ref.w, 0) + " W a " + num(ref.ppm, 0) + " ppm). Está medida sobre la sesión entera, así que es una referencia aproximada." : "");

    var gPot = tarjeta("Potencia del bloque principal",
      "Los vatios que se sostuvieron, sin calentamiento ni vuelta a la calma. Sube a medida que la rampa pide más.",
      grafico({ titulo: "Potencia", puntos: P("w"), dom: dom, semanas: semFondo,
                ref: ref ? { y: ref.w, et: ref.et } : null, fmt: function (v) { return num(v, 0); }, suf: " W", rangoMin: 20 }), "");

    var gPulso = tarjeta("Pulso medio del bloque principal",
      "El otro lado de la misma cuenta. Leer junto a la potencia: el mismo pulso con más vatios es mejora.",
      grafico({ titulo: "Pulso", puntos: P("ppm"), dom: dom, semanas: semFondo,
                fmt: function (v) { return num(v, 0); }, suf: " ppm", rangoMin: 15 }), "");

    /* 5-oct-2026: Carlos quiere recuperar la cadencia y hacerla costumbre (86
       en feb-mar 2022 y en nov-2023; 66 en 2026). Objetivo de cada semana,
       el MISMO que pone zwift/generar_zwift.py (CADENCIA_SEMANA): 80 en la S3
       y +2 por semana hasta 86. Si se cambia allí, se cambia aquí. */
    var cadObj = function (n) { return n < 3 ? null : ({ 3: 80, 4: 82, 5: 84 })[n] || 86; };
    var metaCad = semVis.filter(function (w) { return cadObj(w.n); })
      .map(function (w) { return { x: msDe(w.desde), y: cadObj(w.n) }; });
    var gCad = tarjeta("Cadencia habitual",
      "Las vueltas por minuto en el bloque principal, sin contar los minutos de técnica. La línea discontinua es el objetivo de cada semana: subir 2 rpm por semana hasta 86, tu cadencia de 2022.",
      grafico({ titulo: "Cadencia", puntos: P("rpm", function (s) {
                  var obj = s.a.previsto && s.a.previsto.cad;
                  return obj ? s.a.rpm < obj - 0.5 : s.a.rpm < 80; }), dom: dom, semanas: semFondo,
                meta: metaCad, metaEt: "objetivo", fmt: function (v) { return num(v, 0); }, suf: " rpm", rangoMin: 20 }), "");

    /* objetivos cumplidos: una barra por sesión con ficha prevista */
    var conObj = ses.filter(function (s) { return s.tot; });
    var barras = conObj.length ? (function () {
      var bw = 26, gap = 14, w = Math.max(320, conObj.length * (bw + gap) + 40), h = 120, base = 92;
      var svg = conObj.map(function (s, i) {
        var x = 20 + i * (bw + gap), hOk = s.ok / s.tot * 70, hNo = 70 - hOk;
        return '<g><rect class="av-bno" x="' + x + '" y="' + (base - 70) + '" width="' + bw + '" height="' + Math.max(0, hNo - 1) + '" rx="3"/>' +
          '<rect class="av-bok" x="' + x + '" y="' + (base - hOk) + '" width="' + bw + '" height="' + hOk + '" rx="3"/>' +
          '<text class="av-et-pt" x="' + (x + bw / 2) + '" y="' + (base - 74) + '" text-anchor="middle">' + s.ok + "/" + s.tot + "</text>" +
          '<text class="av-eje" x="' + (x + bw / 2) + '" y="' + (base + 14) + '" text-anchor="middle">' + diaCorto(s.f) + "</text>" +
          "<title>" + esc(diaCorto(s.f) + " · " + s.nombre + ": " + s.ok + " de " + s.tot + " objetivos") + "</title></g>";
      }).join("");
      return '<svg class="av-svg-bar" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Objetivos cumplidos">' + svg + "</svg>";
    })() : '<p class="av-sub">Todavía no hay sesiones con ficha prevista.</p>';
    var gObj = tarjeta("Objetivos cumplidos por sesión",
      "Potencia, techo de pulso, deriva, cadencia de la semana, minutos a 100 rpm y carga: cuántos se cumplieron de los que ponía la sesión.",
      barras + (conObj.length ? tabla(["Sesión"].concat(["Objetivos"]),
        conObj.map(function (s) {
          return [diaCorto(s.f) + " · " + esc(s.nombre), (s.a.objetivos || []).map(function (x) {
            return (x.ok ? "✔ " : "✘ ") + esc(x.que); }).join(" · ")];
        })) : ""), "");

    /* CARGA SEMANAL · dos métricas (4-oct-2026). Carlos: «una carga de
       entrenamiento, que es la que mide, y otra métrica de dato para mí, que es
       la carga total (sumando fuerza y paseos de relax)».
       · entrenamiento (barra llena): lo que cuenta El Plan contra la rampa; el %
         es éste, igual que en El Plan.
       · total (barra gris de fondo): todo lo que marcó el reloj.
       · prevista (contorno discontinuo): lo que pedía la rampa.
       Si la app no pasa `cargasDe`, se cae a la suma de todo (lo de antes). */
    sem.forEach(function (w) {
      var c = (!w.futura && o.cargasDe) ? o.cargasDe(w.desde, w.hasta) : null;
      w.entreno = c ? c.entreno : (w.futura ? 0 : w.hecha);
      w.total = c ? c.total : w.hecha;
      w.paseos = c && c.paseos != null ? c.paseos : null;
      w.fuerza = c && c.fuerza != null ? c.fuerza : null;
    });
    var semHasta = sem.filter(function (w) { return !w.futura; });
    var cargaSvg = (function () {
      var lista = sem.slice(0, Math.max(semHasta.length + 2, 4));
      var max = Math.max.apply(null, lista.map(function (w) { return Math.max(w.prevista || 0, w.entreno || 0, w.total || 0); })) || 1;
      var bw = 34, gap = 18, w = lista.length * (bw + gap) + 30, h = 164, base = 118, alto = 92;
      return '<svg class="av-svg-bar" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Carga semanal">' +
        lista.map(function (s) {
          var i = lista.indexOf(s), x = 15 + i * (bw + gap);
          var hp = s.prevista / max * alto, he = s.entreno / max * alto, ht = s.total / max * alto;
          var pct = s.prevista ? Math.round(s.entreno / s.prevista * 100) : null;
          var top = Math.max(hp, he, s.futura ? 0 : ht);
          return "<g>" +
            (s.futura ? "" : '<rect class="av-total" x="' + x + '" y="' + (base - ht) + '" width="' + bw + '" height="' + ht + '" rx="3"/>') +
            '<rect class="av-prev" x="' + x + '" y="' + (base - hp) + '" width="' + bw + '" height="' + hp + '" rx="3"/>' +
            (s.futura ? "" : '<rect class="av-hecha' + (s.curso ? " av-curso" : "") + '" x="' + (x + 7) + '" y="' + (base - he) + '" width="' + (bw - 14) + '" height="' + he + '" rx="3"/>') +
            (s.futura ? "" : '<text class="av-et-pt" x="' + (x + bw / 2) + '" y="' + (base - top - 5) + '" text-anchor="middle">' + pct + " %</text>") +
            '<text class="av-eje" x="' + (x + bw / 2) + '" y="' + (base + 14) + '" text-anchor="middle">S' + s.n + "</text>" +
            '<text class="av-eje av-eje2" x="' + (x + bw / 2) + '" y="' + (base + 25) + '" text-anchor="middle">' +
              (s.descarga ? "desc." : s.test ? "test" : s.curso ? "en curso" : "") + "</text>" +
            (revPorN[s.n] ? '<g class="av-rev-bar' + (revPorN[s.n].pendiente ? " pte" : "") + '"><title>' +
              esc("Revisión de la semana " + s.n + ": " + resumenRev(revPorN[s.n])) + "</title>" +
              '<rect x="' + (x + 3) + '" y="' + (base + 29) + '" width="' + (bw - 6) + '" height="13" rx="3"/>' +
              '<text x="' + (x + bw / 2) + '" y="' + (base + 39) + '" text-anchor="middle">rev.</text></g>' : "") +
            "<title>" + esc("Semana " + s.n + " (" + diaCorto(s.desde) + "): " + (s.futura ? "prevista " + s.prevista :
              "entrenamiento " + num(s.entreno) + " de " + s.prevista + " · total " + num(s.total) + (s.curso ? " (en curso)" : ""))) + "</title></g>";
        }).join("") + "</svg>";
    })();
    var gCarga = tarjeta("Carga de cada semana",
      "Dos medidas. La de <b>entrenamiento</b> es la que cuenta contra la rampa, igual que El Plan: bici, correr y las caminatas de entreno. " +
      "La <b>total</b> es todo lo que marcó el reloj, con la fuerza y los paseos de relax.",
      '<div class="av-leyenda"><span><i class="av-l-hecha"></i>Entrenamiento</span><span><i class="av-l-total"></i>Total</span><span><i class="av-l-prev"></i>Prevista</span></div>' +
      cargaSvg + tabla(["Semana", "Prevista", "Entrenamiento", "%", "Total", "Paseos", "Fuerza"],
        semHasta.map(function (s) {
          return ["S" + s.n + " · " + diaCorto(s.desde) + (s.curso ? " (en curso)" : ""), s.prevista, num(s.entreno),
                  s.prevista ? Math.round(s.entreno / s.prevista * 100) + " %" : "—", num(s.total),
                  s.paseos != null ? num(s.paseos) : "—", s.fuerza != null ? num(s.fuerza) : "—"];
        })),
      "El % es el de entrenamiento, el mismo que da El Plan. Entrenamiento + paseos + fuerza = total. La semana en curso se va llenando; las de descarga piden menos a propósito.");

    /* FTP: escalones (declarada, luego cada test) y el objetivo */
    var esc0 = ftpD ? [{ x: x0, y: ftpD.w }] : [];
    tests.forEach(function (t) { esc0.push({ x: t.t, y: t.a.ftp_test }); });
    var gFtp = tarjeta("FTP",
      "La potencia que podrías sostener una hora. Hasta el primer test es la declarada (" + (ftpD ? ftpD.w : "—") +
      " W); cada test la mide de verdad (el 95 % de los mejores 20 minutos).",
      grafico({ titulo: "FTP", puntos: tests.map(function (t) { return { x: t.t, y: t.a.ftp_test, f: t.f, et: "test" }; }),
                escalones: esc0, dom: dom, semanas: semFondo, umbral: { y: FTP_OBJETIVO, et: "objetivo" },
                extra: ftpD ? [ftpD.w] : [], fmt: function (v) { return num(v, 0); }, suf: " W", minY: 100 }) +
      (ftpAhora ? '<p class="av-sub">Con ' + ftpAhora + " W, para llegar a " + FTP_OBJETIVO + " faltan " +
        (FTP_OBJETIVO - ftpAhora) + " W (" + Math.round((FTP_OBJETIVO / ftpAhora - 1) * 100) + " %). " +
        "La fecha del objetivo se pone con dos tests: el primero da el punto de partida y el segundo, la velocidad de mejora.</p>" : ""),
      "");

    var aviso = ses.length < 3 ? '<p class="av-aviso">Con ' + ses.length + (ses.length === 1 ? " sesión" : " sesiones") +
      " todavía no hay tendencia: los gráficos se van llenando con cada rodillo. Una sesión suelta dice cómo fue ese día, no hacia dónde vas.</p>" : "";

    var gFant = htmlFantasma(o, inicio, hoy);
    var gRev = htmlRevisiones(o.revisiones, o.revisionesEstado);
    return '<div class="av">' + cab + aviso + gRev + gFant + gDeriva + gEf + gPot + gPulso + gCad + gObj + gCarga + gFtp + "</div>";
  }

  /* ==================== MIS REVISIONES  ·  4-oct-2026 ====================
     Carlos: «una biblioteca en Mis Avances, un bloque Mis revisiones con un
     histórico de estas revisiones». Opción B (texto, no PDF): cada semana su
     veredicto, sus números y su decisión; la última abierta, las demás
     plegadas; el texto entero desplegable y un botón para imprimir o guardar
     en PDF. Los datos los sube `revisiones_semana.py` a datos/revisiones.json
     del privado. */
  function enLinea(t) {
    return esc(t)
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>")
      .replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>");   // \x60 = comilla invertida: literal, el comprobador de publicar.py se confunde
  }

  /* Markdown justo para lo que escribo en las revisiones: títulos, párrafos,
     listas (dos niveles), tablas y la raya. */
  function md2html(md, sinTitulo) {
    var ls = String(md || "").replace(/\r/g, "").split("\n"), out = [], i = 0, par = [];
    function cierraPar() { if (par.length) { out.push("<p>" + enLinea(par.join(" ")) + "</p>"); par = []; } }
    while (i < ls.length) {
      var l = ls[i];
      if (/^\s*$/.test(l)) { cierraPar(); i++; continue; }
      var h = /^(#{1,4})\s+(.*)$/.exec(l);
      if (h) {
        cierraPar();
        if (!(sinTitulo && h[1].length === 1)) out.push("<h" + (h[1].length + 2) + ">" + enLinea(h[2]) + "</h" + (h[1].length + 2) + ">");
        i++; continue;
      }
      if (/^---+\s*$/.test(l)) { cierraPar(); out.push("<hr>"); i++; continue; }
      if (/^\s*\|/.test(l)) {
        cierraPar();
        var filas = [];
        while (i < ls.length && /^\s*\|/.test(ls[i])) { filas.push(ls[i]); i++; }
        var celdas = filas.map(function (f) { return f.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }); });
        var cab = celdas[0], cuerpo = celdas.slice(1).filter(function (c) { return !/^:?-{2,}:?$/.test(c[0] || ""); });
        out.push('<div class="rev-tabla"><table><thead><tr>' + cab.map(function (c) { return "<th>" + enLinea(c) + "</th>"; }).join("") +
          "</tr></thead><tbody>" + cuerpo.map(function (f) {
            return "<tr>" + f.map(function (c) { return "<td>" + enLinea(c) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table></div>");
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
        cierraPar();
        var html = "", nivel = -1, tipos = [];
        while (i < ls.length && /^\s*([-*]|\d+\.)\s+/.test(ls[i])) {
          var m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(ls[i]);
          var n = Math.min(2, Math.floor(m[1].length / 2)), tipo = /\d/.test(m[2]) ? "ol" : "ul";
          if (n > nivel) {
            while (nivel < n) { nivel++; tipos.push(tipo); html += "<" + tipo + ">"; }
          } else {
            html += "</li>";
            while (nivel > n) { html += "</" + tipos.pop() + "></li>"; nivel--; }
          }
          html += "<li>" + enLinea(m[3]);
          i++;
        }
        html += "</li>";
        while (nivel > 0) { html += "</" + tipos.pop() + "></li>"; nivel--; }
        html += "</" + tipos.pop() + ">";
        out.push(html);
        continue;
      }
      par.push(l.trim()); i++;
    }
    cierraPar();
    return out.join("");
  }

  /* la decisión en una línea: su primera viñeta, sin marcas */
  function resumenRev(r) {
    if (r.pendiente || !r.decision) return "decisión pendiente.";
    var l = String(r.decision).split("\n").filter(function (x) { return /\S/.test(x); })[0] || "";
    l = l.replace(/^\s*([-*]|\d+\.)\s+/, "").replace(/\*\*|\x60/g, "");
    return l.length > 160 ? l.slice(0, 157) + "…" : l;
  }

  function rango(s) {
    return diaCorto(s.desde) + (s.hasta ? " – " + diaCorto(s.hasta) : "");
  }

  function chipsRev(s) {
    var x = s.numeros || {}, b = x.base || {}, ch = [];
    function c(et, v, sub) { if (v != null && v !== "") ch.push('<span class="rev-chip"><i>' + et + "</i><b>" + v + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span>"); }
    c("VFC", x.vfc != null ? num(x.vfc, 1) : null, b.vfc ? "base " + num(b.vfc, 1) : "");
    c("Reposo", x.fcr != null ? num(x.fcr, 1) : null, b.fcr ? "base " + num(b.fcr, 1) : "");
    c("Sueño", x.sueno_h != null ? num(x.sueno_h, 1) + " h" : null, "");
    c("Peso", x.peso != null ? num(x.peso, 1) : null, x.peso_antes != null ? cambio(x.peso_antes, x.peso, 1, " kg", true) : "");
    c("Tensión", x.tension ? x.tension[0] + "/" + x.tension[1] : null, "base 105/64");
    if (x.carga && x.carga[0] != null) c("Carga", x.carga[0] + " de " + x.carga[1], Math.round(x.carga[0] / x.carga[1] * 100) + " %");
    var bici = x.bici || [];
    if (bici.length) c("Deriva", bici.map(function (z) { return z.deriva != null ? num(z.deriva, 1) : "—"; }).join(" · ") + " %",
                       bici.length + (bici.length === 1 ? " rodillo" : " rodillos") + " de 40' o más");
    return ch.length ? '<div class="rev-chips">' + ch.join("") + "</div>" : "";
  }

  function tarjetaRev(s, abierta) {
    var estado = s.pendiente ? '<span class="rev-estado pte">Decisión pendiente</span>' : '<span class="rev-estado ok">Decidida</span>';
    var cuerpo =
      (s.veredicto ? '<p class="rev-ver"><b>Veredicto:</b> ' + enLinea(s.veredicto) + "</p>" : "") +
      chipsRev(s) +
      (s.decision && !s.pendiente ? '<div class="rev-dec"><h4>' + enLinea(s.decision_titulo || "Decisión") + "</h4>" + md2html(s.decision) + "</div>" : "") +
      '<details class="rev-todo"><summary>Leer la revisión entera</summary><div class="rev-md">' + md2html(s.md, true) + "</div></details>" +
      '<button type="button" class="rev-imp" data-rev-imprimir="' + s.n + '">Imprimir o guardar en PDF</button>';
    var cab = '<span class="rev-tit">Semana ' + s.n + " · " + rango(s) + "</span>" + estado;
    return abierta
      ? '<article class="rev rev-abierta" data-rev="' + s.n + '"><div class="rev-cab">' + cab + "</div>" + cuerpo + "</article>"
      : '<details class="rev" data-rev="' + s.n + '"><summary class="rev-cab">' + cab + "</summary>" + cuerpo + "</details>";
  }

  /* PLEGABLE (4-oct-2026, Carlos: «debe ser colapsable, que solo se vea título y
     explicación»). Cerrada por defecto; si la abre, se queda abierta aunque la
     pantalla se repinte al llegar datos (se recuerda en esta sesión). */
  var SUB_REV = "Lo que pasó cada semana y lo que decidimos para la siguiente.";
  function plegable(cuerpo, pie) {
    var abierta = false;
    try { abierta = global.sessionStorage && global.sessionStorage.getItem("khb-rev-abierta") === "1"; } catch (e) {}
    return '<section class="av-tarjeta rev-bloque"><details class="rev-plegable"' + (abierta ? " open" : "") + ">" +
      '<summary><h3>Mis revisiones</h3><p class="av-sub">' + SUB_REV + "</p></summary>" +
      cuerpo + (pie ? '<p class="av-pie">' + pie + "</p>" : "") + "</details></section>";
  }

  function htmlRevisiones(revs, estado) {
    if (!revs || !revs.length) {
      var porque = estado === "cargando" || estado === "nada" ? "Trayendo las revisiones…"
        : "Todavía no hay revisiones en el repositorio privado. Suben solas desde el portátil unos minutos después de escribirse.";
      return plegable('<p class="av-sub">' + porque + "</p>", "");
    }
    var orden = revs.slice().sort(function (a, b) { return b.n - a.n; });
    var filas = orden.map(function (s) {
      var x = s.numeros || {}, bici = x.bici || [];
      var der = bici.filter(function (z) { return z.deriva != null; }).map(function (z) { return z.deriva; });
      return ["S" + s.n + " · " + diaCorto(s.desde),
              x.vfc != null ? num(x.vfc, 1) : "—", x.fcr != null ? num(x.fcr, 1) : "—",
              x.sueno_h != null ? num(x.sueno_h, 1) : "—", x.peso != null ? num(x.peso, 1) : "—",
              x.tension ? x.tension[0] + "/" + x.tension[1] : "—",
              der.length ? num(Math.max.apply(null, der), 1) + " %" : "—",
              s.pendiente ? "pendiente" : "decidida"];
    });
    var tablaSem = '<div class="rev-tabla rev-hist"><table><thead><tr><th>Semana</th><th>VFC</th><th>Reposo</th><th>Sueño h</th>' +
      "<th>Peso</th><th>Tensión</th><th>Peor deriva</th><th>Decisión</th></tr></thead><tbody>" +
      filas.map(function (f) { return "<tr>" + f.map(function (c, i) { return (i ? "<td>" : "<th>") + c + (i ? "</td>" : "</th>"); }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div>";
    return plegable(
      tablaSem + '<div class="rev-lista">' + orden.map(function (s, i) { return tarjetaRev(s, i === 0); }).join("") + "</div>",
      "Base de comparación: marzo a junio de 2026 (VFC 62,9 · reposo 46,7 · tensión 105/64). Con fármaco, la VFC y el pulso no se concluyen.");
  }

  /* IMPRIMIR UNA SOLA REVISIÓN: se marca su tarjeta, se abre entera y se
     imprime solo ella (la hoja de estilos de impresión oculta todo lo demás).
     «Guardar como PDF» sale en el mismo diálogo de impresión. */
  if (global.document && !global.__revImprimir) {
    global.__revImprimir = true;
    global.document.addEventListener("toggle", function (ev) {
      var d = ev.target;
      if (!d || !d.classList || !d.classList.contains("rev-plegable")) return;
      try { global.sessionStorage.setItem("khb-rev-abierta", d.open ? "1" : "0"); } catch (e) {}
    }, true);
    global.document.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("[data-rev-imprimir]") : null;
      if (!b) return;
      var caja = b.closest(".rev");
      if (!caja) return;
      if (caja.tagName === "DETAILS") caja.open = true;
      var todo = caja.querySelector(".rev-todo"); if (todo) todo.open = true;
      caja.classList.add("rev-print");
      global.document.body.classList.add("av-print");
      var fin = function () {
        caja.classList.remove("rev-print");
        global.document.body.classList.remove("av-print");
        global.removeEventListener("afterprint", fin);
      };
      global.addEventListener("afterprint", fin);
      setTimeout(function () { global.print(); setTimeout(fin, 1500); }, 50);
    });
  }

  global.AvancesKHB = { html: html, _md: md2html, _revisiones: htmlRevisiones, _referencia: referencia, _sesiones: sesionesDelPlan, FANTASMA: FANTASMA };
})(this);
