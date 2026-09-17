/* app.js — interfaz de la aplicación */
(function (global) {
  "use strict";

  var $ = Util.$, $$ = Util.$$, esc = Util.esc;

  var UI = {
    vista: "menu",
    lunes: Util.lunesDe(Util.hoyISO()),
    filtros: { texto: "", toma: "", grupo: "", tool: "" },
    busquedaDespensa: "",
    diaActivo: null,        // índice 0-6; en móvil se muestra un solo día
    ocultarComprados: false
  };

  function esMovil() { return window.matchMedia("(max-width:767px)").matches; }

  /* día que conviene mostrar al abrir: hoy si cae en la semana, si no el lunes */
  function diaPorDefecto() {
    var hoy = Util.hoyISO();
    for (var i = 0; i < 7; i++) if (Util.sumarDias(UI.lunes, i) === hoy) return i;
    return 0;
  }

  var NOMBRE_GRUPO = {
    "carne-roja": "Carne roja", "carne-blanca": "Carne blanca", "pescado-blanco": "Pescado blanco",
    "pescado-azul": "Pescado azul", "huevos": "Huevos", "legumbre": "Legumbre",
    "pasta-arroz": "Pasta y arroz", "verdura": "Verdura", "ensalada": "Ensalada",
    "desayuno": "Desayuno", "fruta": "Fruta", "postre": "Postre"
  };
  var ABREV = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
  var NOMBRE_TOOL = {
    "lekue": "Lékué", "airfryer": "Airfryer", "microondas": "Microondas", "sarten": "Sartén",
    "horno": "Horno", "cazuela": "Cazuela", "sin-cocinar": "Sin cocinar"
  };

  /* ==================== MODAL ==================== */
  function abrirModal(html) {
    $("#modal-caja").innerHTML = html;
    $("#modal").classList.add("abierta");
  }
  function cerrarModal() { $("#modal").classList.remove("abierta"); }

  /* ==================== VISTA: MENÚ ==================== */
  function pintarMenu() {
    var movil = esMovil();
    $("#rango-semana").textContent = movil ? Util.etiquetaRangoCorto(UI.lunes) : Util.etiquetaRango(UI.lunes);
    var cont = $("#rejilla-dias"), html = "", hoy = Util.hoyISO();
    if (UI.diaActivo === null || UI.diaActivo < 0 || UI.diaActivo > 6) UI.diaActivo = diaPorDefecto();

    /* barra de días (solo se ve en móvil) */
    var sel = "";
    for (var d = 0; d < 7; d++) {
      var f = Util.sumarDias(UI.lunes, d);
      var dia0 = Almacen.estado.plan[f];
      var hay = false;
      if (dia0) Util.TOMAS.forEach(function (t) { if ((dia0[t.k] || []).length) hay = true; });
      var punto = !hay ? "vacio" : Almacen.semaforo(Almacen.salDia(f));
      sel += '<button data-dia="' + d + '"' + (d === UI.diaActivo ? ' class="activo"' : '') + '>' +
             ABREV[d] +
             '<span class="num">' + Util.desdeISO(f).getDate() + '</span>' +
             '<span class="punto ' + punto + '"></span></button>';
    }
    $("#selector-dias").innerHTML = sel;

    /* media de la semana */
    var res = Almacen.resumenSemana(UI.lunes);
    var caja = $("#resumen-semana");
    if (res) {
      caja.style.display = "";
      caja.innerHTML = "<b>Media de la semana</b> (" + res.dias + " día" + (res.dias === 1 ? "" : "s") + "): " +
        Util.kcal(res.k) + " · " + Math.round(res.p) + " g de proteína · " +
        Math.round(res.g) + " g de grasa · " + Math.round(res.h) + " g de hidratos · " +
        Util.sal(res.sal) + " de sal al día.";
    } else {
      caja.style.display = "none";
    }

    for (var i = 0; i < 7; i++) {
      if (movil && i !== UI.diaActivo) continue;
      var fecha = Util.sumarDias(UI.lunes, i);
      var dia = Almacen.estado.plan[fecha];
      var sal = Almacen.salDia(fecha);
      var color = Almacen.semaforo(sal);
      var tieneAlgo = false;
      if (dia) Util.TOMAS.forEach(function (t) { if ((dia[t.k] || []).length) tieneAlgo = true; });

      var nutr = Almacen.nutrDia(fecha);
      var nutrCom = Almacen.nutrDia(fecha, true);
      var hayComido = Almacen.hayComidoAlgo(fecha);
      var colorK = Almacen.semaforoKcal(nutr.k);
      var objetivo = Almacen.estado.config.objetivoKcal || 0;

      html += '<div class="dia' + (fecha === hoy ? " hoy" : "") + '">';
      html += '<header><span class="nombre">' + Util.DIAS[i] + '</span>' +
              '<span class="fecha">' + Util.etiquetaFecha(fecha) + '</span>' +
              (tieneAlgo ? '<span class="chip-sal ' + colorK + '">' + Util.kcal(nutr.k) + '</span>' +
                           '<span class="chip-sal ' + color + '">' + Util.sal(sal) + ' sal</span>' : '') +
              '</header>';

      if (tieneAlgo) {
        var pct = objetivo ? Math.min(100, Math.round((hayComido ? nutrCom.k : nutr.k) / objetivo * 100)) : 0;
        html += '<div class="resumen-dia">' +
                  (objetivo ? '<div class="barra"><span class="relleno ' + colorK + '" style="width:' + pct + '%"></span></div>' : '') +
                  '<div class="macros">' +
                    '<span><b>P</b> ' + Math.round(nutr.p) + ' g</span>' +
                    '<span><b>G</b> ' + Math.round(nutr.g) + ' g</span>' +
                    '<span><b>H</b> ' + Math.round(nutr.h) + ' g</span>' +
                    (hayComido
                      ? '<span class="comido-hasta">Llevas ' + Util.kcal(nutrCom.k) + '</span>'
                      : (objetivo ? '<span class="comido-hasta">Objetivo ' + Util.kcal(objetivo) + '</span>' : '')) +
                  '</div>' +
                '</div>';
      }

      Util.TOMAS.forEach(function (t) {
        var platos = (dia && dia[t.k]) || [];
        html += '<div class="toma">';
        html += '<div class="titulo-toma"><span>' + t.n + '</span>' +
                '<button class="anadir" data-anadir="' + fecha + '|' + t.k + '">+</button></div>';
        if (!platos.length) {
          html += '<div class="nota-peque">—</div>';
        } else {
          platos.forEach(function (rid, idx) {
            var r = Almacen.receta(rid);
            var nombre = r ? r.n : "(receta borrada)";
            var n = r ? Almacen.nutrReceta(r) : { k: 0 };
            var s = r ? Util.sal(Almacen.salReceta(r)) : "";
            var com = Almacen.estaComido(fecha, t.k, rid);
            html += '<div class="plato' + (com ? " comido" : "") + '">' +
                      '<button class="marcar' + (com ? " si" : "") + '" title="Marcar como comido" ' +
                        'data-comido="' + fecha + '|' + t.k + '|' + esc(rid) + '">✓</button>' +
                      '<span class="nom" data-ficha="' + esc(rid) + '">' + esc(nombre) + '</span>' +
                      '<span class="sal">' + Util.kcal(n.k) + ' · ' + s + '</span>' +
                      '<button class="quitar" data-quitar="' + fecha + '|' + t.k + '|' + idx + '">×</button>' +
                    '</div>';
          });
        }
        html += '</div>';
      });
      html += '</div>';
    }
    cont.innerHTML = html;
  }

  /* selector de receta para una toma */
  function abrirSelector(fecha, toma) {
    var recetas = Almacen.estado.recetas.filter(function (r) {
      return (r.tipo || []).indexOf(toma) >= 0;
    });
    if (!recetas.length) recetas = Almacen.estado.recetas.slice();
    recetas.sort(function (a, b) { return a.n.localeCompare(b.n); });

    var html = '<header><h2>Añadir a ' + toma + '</h2><button class="cerrar" data-cerrar>×</button></header>';
    html += '<input type="text" id="filtro-selector" placeholder="Filtrar…">';
    html += '<div class="lista-selec" id="lista-selector">';
    recetas.forEach(function (r) {
      html += '<button data-elegir="' + esc(r.id) + '" data-nombre="' + esc(r.n.toLowerCase()) + '">' +
              esc(r.n) + '<small>' + (NOMBRE_GRUPO[r.grupo] || r.grupo || "") + ' · ' +
              Util.sal(Almacen.salReceta(r)) + ' de sal · ' + (r.min || "?") + ' min</small></button>';
    });
    html += '</div>';
    abrirModal(html);

    $("#filtro-selector").addEventListener("input", function (e) {
      var q = e.target.value.toLowerCase();
      $$("#lista-selector button").forEach(function (b) {
        b.style.display = b.getAttribute("data-nombre").indexOf(q) >= 0 ? "" : "none";
      });
    });
    $("#lista-selector").addEventListener("click", function (e) {
      var b = e.target.closest("[data-elegir]");
      if (!b) return;
      var dia = Almacen.asegurarDia(fecha);
      dia[toma].push(b.getAttribute("data-elegir"));
      Almacen.guardar("plato");
      cerrarModal();
      pintarMenu();
    });
  }

  /* ==================== FICHA DE RECETA ==================== */
  function abrirFicha(id) {
    var r = Almacen.receta(id);
    if (!r) return;
    var salRacion = Almacen.salReceta(r);
    var n = Almacen.nutrReceta(r);

    var html = '<header><h2>' + esc(r.n) + '</h2><button class="cerrar" data-cerrar>×</button></header>';
    html += '<div class="etiquetas">' +
            '<span class="etiqueta verde">' + Util.kcal(n.k) + ' / ración</span>' +
            '<span class="etiqueta verde">' + Util.sal(salRacion) + ' de sal / ración</span>' +
            '<span class="etiqueta">' + (r.raciones || 1) + ' ración(es)</span>' +
            '<span class="etiqueta">' + (r.min || "?") + ' min</span>' +
            (r.grupo ? '<span class="etiqueta">' + esc(NOMBRE_GRUPO[r.grupo] || r.grupo) + '</span>' : '') +
            (r.tools || []).map(function (t) { return '<span class="etiqueta">' + esc(NOMBRE_TOOL[t] || t) + '</span>'; }).join("") +
            '</div>';

    html += '<div class="nutri-ficha">' +
            '<div><b>' + Math.round(n.p) + ' g</b><span>proteína</span></div>' +
            '<div><b>' + Math.round(n.g) + ' g</b><span>grasa</span></div>' +
            '<div><b>' + Math.round(n.h) + ' g</b><span>hidratos</span></div>' +
            '<div><b>' + Util.kcal(n.k).replace(" kcal", "") + '</b><span>kcal</span></div>' +
            '</div>';

    html += '<h3 style="margin-top:16px">Ingredientes</h3><ul class="ingredientes">';
    (r.ing || []).forEach(function (l) {
      var ing = Almacen.ingrediente(l.i);
      var gr = Almacen.gramosDeLinea(l) / 100;
      var kc = ing ? Math.round(gr * (ing.k || 0)) : 0;
      html += '<li><span>' + esc(ing ? ing.n : l.i) + '</span><span>' +
              Util.formatearCantidad(l.c, ing ? ing.u : "g") +
              (kc ? ' <em class="nota-peque">· ' + kc + ' kcal</em>' : '') + '</span></li>';
    });
    html += '</ul>';

    html += '<h3>Elaboración</h3><ol class="pasos">';
    (r.pasos || []).forEach(function (p) { html += '<li>' + esc(p) + '</li>'; });
    html += '</ol>';

    if (r.nota) html += '<div class="aviso">' + esc(r.nota) + '</div>';

    html += '<div class="fila" style="margin-top:14px">' +
            '<button class="btn principal" data-editar="' + esc(r.id) + '">Editar</button>' +
            '<button class="btn" data-duplicar="' + esc(r.id) + '">Duplicar</button>' +
            '<button class="btn" data-borrar="' + esc(r.id) + '">Borrar</button>' +
            '</div>';
    abrirModal(html);
  }

  /* ==================== EDITOR DE RECETA ==================== */
  function abrirEditor(id) {
    var r = id ? JSON.parse(JSON.stringify(Almacen.receta(id))) : {
      id: "", n: "", tipo: ["comida"], grupo: "carne-blanca", raciones: 1, min: 15, tools: [], ing: [], pasos: [], nota: ""
    };
    var lineas = (r.ing || []).map(function (l) {
      var ing = Almacen.ingrediente(l.i);
      return (ing ? ing.id : l.i) + " | " + l.c;
    }).join("\n");

    var opcionesIng = Almacen.estado.ingredientes.map(function (i) {
      return '<option value="' + esc(i.id) + '">' + esc(i.n) + ' (' + i.u + ')</option>';
    }).join("");

    var html = '<header><h2>' + (id ? "Editar receta" : "Nueva receta") + '</h2><button class="cerrar" data-cerrar>×</button></header>';
    html += '<label class="campo"><span>Nombre</span><input type="text" id="ed-n" value="' + esc(r.n) + '"></label>';
    html += '<div class="fila">' +
            '<label class="campo" style="flex:1"><span>Raciones</span><input type="number" id="ed-rac" min="1" max="8" value="' + (r.raciones || 1) + '"></label>' +
            '<label class="campo" style="flex:1"><span>Minutos</span><input type="number" id="ed-min" min="1" max="240" value="' + (r.min || 15) + '"></label>' +
            '</div>';
    html += '<label class="campo"><span>Grupo</span><select id="ed-grupo">' +
            Object.keys(NOMBRE_GRUPO).map(function (g) {
              return '<option value="' + g + '"' + (r.grupo === g ? " selected" : "") + '>' + NOMBRE_GRUPO[g] + '</option>';
            }).join("") + '</select></label>';
    html += '<label class="campo"><span>Tomas (marca las que valgan)</span><div class="fila">' +
            ["desayuno", "almuerzo", "comida", "merienda", "cena", "guarnicion", "postre"].map(function (t) {
              return '<label style="font-size:.85rem"><input type="checkbox" class="ed-tipo" value="' + t + '"' +
                     ((r.tipo || []).indexOf(t) >= 0 ? " checked" : "") + '> ' + t + '</label>';
            }).join(" ") + '</div></label>';
    html += '<label class="campo"><span>Herramientas</span><div class="fila">' +
            Object.keys(NOMBRE_TOOL).map(function (t) {
              return '<label style="font-size:.85rem"><input type="checkbox" class="ed-tool" value="' + t + '"' +
                     ((r.tools || []).indexOf(t) >= 0 ? " checked" : "") + '> ' + NOMBRE_TOOL[t] + '</label>';
            }).join(" ") + '</div></label>';

    html += '<label class="campo"><span>Ingredientes — una línea por ingrediente: <em>identificador | cantidad</em></span>' +
            '<textarea id="ed-ing" class="salida" style="min-height:150px">' + esc(lineas) + '</textarea></label>';
    html += '<label class="campo"><span>Añadir ingrediente del catálogo</span><select id="ed-ayuda"><option value="">— elige para insertar la línea —</option>' + opcionesIng + '</select></label>';
    html += '<label class="campo"><span>Pasos (uno por línea)</span><textarea id="ed-pasos" style="min-height:140px">' + esc((r.pasos || []).join("\n")) + '</textarea></label>';
    html += '<label class="campo"><span>Nota</span><input type="text" id="ed-nota" value="' + esc(r.nota || "") + '"></label>';
    html += '<div class="fila"><button class="btn principal" id="ed-guardar">Guardar receta</button>' +
            '<button class="btn" data-cerrar>Cancelar</button></div>';

    abrirModal(html);

    $("#ed-ayuda").addEventListener("change", function (e) {
      if (!e.target.value) return;
      var ta = $("#ed-ing");
      ta.value = (ta.value ? ta.value.replace(/\s*$/, "") + "\n" : "") + e.target.value + " | 100";
      e.target.value = "";
      ta.focus();
    });

    $("#ed-guardar").addEventListener("click", function () {
      var nombre = $("#ed-n").value.trim();
      if (!nombre) { Util.toast("Ponle nombre a la receta"); return; }
      var ing = [];
      $("#ed-ing").value.split("\n").forEach(function (l) {
        l = l.trim(); if (!l) return;
        var p = l.split("|");
        var idIng = (p[0] || "").trim();
        var cant = parseFloat((p[1] || "").replace(",", "."));
        if (!idIng || isNaN(cant)) return;
        ing.push({ i: idIng, c: cant });
      });
      var nueva = {
        id: r.id || ("propia_" + Date.now().toString(36)),
        n: nombre,
        tipo: $$(".ed-tipo").filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
        grupo: $("#ed-grupo").value,
        raciones: parseInt($("#ed-rac").value, 10) || 1,
        min: parseInt($("#ed-min").value, 10) || 15,
        tools: $$(".ed-tool").filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
        ing: ing,
        pasos: $("#ed-pasos").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
        nota: $("#ed-nota").value.trim()
      };
      if (!nueva.tipo.length) nueva.tipo = ["comida"];

      var idx = -1;
      Almacen.estado.recetas.forEach(function (x, i) { if (x.id === nueva.id) idx = i; });
      if (idx >= 0) Almacen.estado.recetas[idx] = nueva; else Almacen.estado.recetas.push(nueva);
      Almacen.guardar("receta");
      cerrarModal();
      pintarRecetas(); pintarMenu();
      Util.toast("Receta guardada");
    });
  }

  /* ==================== EDITOR DE INGREDIENTE ==================== */
  function abrirIngrediente(id) {
    var nuevo = !id;
    var g = nuevo
      ? { id: "", n: "", cat: "Frutas y verduras", u: "g", sal: 0, k: 0, p: 0, g: 0, h: 0 }
      : JSON.parse(JSON.stringify(Almacen.ingrediente(id)));
    if (!g) return;

    var cats = ["Frutas y verduras", "Carnicería", "Pescadería", "Congelados",
                "Lácteos y huevos", "Panadería", "Despensa", "Especias y aromáticos"];

    var html = '<header><h2>' + (nuevo ? "Nuevo ingrediente" : esc(g.n)) + '</h2>' +
               '<button class="cerrar" data-cerrar>×</button></header>';
    html += '<p class="nota-peque">Los valores son por cada 100 g (o 100 ml). Si el producto que compras ' +
            'trae otros en la etiqueta, cámbialos aquí y se recalcula todo.</p>';
    html += '<label class="campo"><span>Nombre</span><input type="text" id="ig-n" value="' + esc(g.n) + '"></label>';
    html += '<div class="fila">' +
      '<label class="campo" style="flex:1 1 180px"><span>Sección del súper</span><select id="ig-cat">' +
        cats.map(function (c) { return '<option' + (g.cat === c ? " selected" : "") + '>' + c + '</option>'; }).join("") +
      '</select></label>' +
      '<label class="campo" style="flex:0 1 110px"><span>Se mide en</span><select id="ig-u">' +
        ['g', 'ml', 'ud'].map(function (u) { return '<option' + (g.u === u ? " selected" : "") + '>' + u + '</option>'; }).join("") +
      '</select></label>' +
      '<label class="campo" style="flex:0 1 130px"><span>Peso de 1 unidad (g)</span>' +
        '<input type="number" id="ig-peso" min="1" step="1" value="' + (g.pesoUd || "") + '"></label>' +
      '</div>';
    html += '<div class="fila">' +
      ['sal|Sal (g)|0.01', 'k|Calorías (kcal)|1', 'p|Proteína (g)|0.1', 'g|Grasa (g)|0.1', 'h|Hidratos (g)|0.1']
        .map(function (c) {
          var p = c.split("|");
          return '<label class="campo" style="flex:1 1 90px"><span>' + p[1] + '</span>' +
                 '<input type="number" id="ig-' + p[0] + '" min="0" step="' + p[2] + '" value="' +
                 (g[p[0]] != null ? g[p[0]] : 0) + '"></label>';
        }).join("") + '</div>';
    html += '<label style="font-size:.85rem; display:block; margin-bottom:12px">' +
            '<input type="checkbox" id="ig-basico"' + (g.basico ? " checked" : "") + '> ' +
            'Es un básico de despensa (va aparte en la lista de la compra)</label>';
    html += '<div class="fila"><button class="btn principal" id="ig-guardar">Guardar</button>' +
            '<button class="btn" data-cerrar>Cancelar</button></div>';
    abrirModal(html);

    $("#ig-guardar").addEventListener("click", function () {
      var nombre = $("#ig-n").value.trim();
      if (!nombre) { Util.toast("Ponle nombre al ingrediente"); return; }
      var num = function (sel) { var v = parseFloat($(sel).value.replace(",", ".")); return isNaN(v) ? 0 : v; };
      var res = {
        id: g.id || ("ing_" + Date.now().toString(36)),
        n: nombre, cat: $("#ig-cat").value, u: $("#ig-u").value,
        sal: num("#ig-sal"), k: num("#ig-k"), p: num("#ig-p"), g: num("#ig-g"), h: num("#ig-h")
      };
      var peso = parseFloat($("#ig-peso").value);
      if (res.u === "ud" && peso > 0) res.pesoUd = peso;
      if ($("#ig-basico").checked) res.basico = true;
      if (g.nota) res.nota = g.nota;
      if (g.compra) res.compra = g.compra;

      var idx = -1;
      Almacen.estado.ingredientes.forEach(function (x, i) { if (x.id === res.id) idx = i; });
      if (idx >= 0) Almacen.estado.ingredientes[idx] = res;
      else Almacen.estado.ingredientes.push(res);
      Almacen.guardar("ingrediente");
      cerrarModal();
      pintarDespensa(); pintarMenu();
      Util.toast("Ingrediente guardado");
    });
  }

  /* ==================== VISTA: RECETAS ==================== */
  function pintarRecetas() {
    var f = UI.filtros;
    var lista = Almacen.estado.recetas.filter(function (r) {
      if (f.toma && (r.tipo || []).indexOf(f.toma) < 0) return false;
      if (f.grupo && r.grupo !== f.grupo) return false;
      if (f.tool && (r.tools || []).indexOf(f.tool) < 0) return false;
      if (f.texto) {
        var q = f.texto.toLowerCase();
        var enNombre = r.n.toLowerCase().indexOf(q) >= 0;
        var enIng = (r.ing || []).some(function (l) {
          var ing = Almacen.ingrediente(l.i);
          return ing && ing.n.toLowerCase().indexOf(q) >= 0;
        });
        if (!enNombre && !enIng) return false;
      }
      return true;
    });
    lista.sort(function (a, b) { return a.n.localeCompare(b.n); });

    $("#contador-recetas").textContent = lista.length + " recetas";
    $("#rejilla-recetas").innerHTML = lista.map(function (r) {
      var sal = Almacen.salReceta(r);
      var n = Almacen.nutrReceta(r);
      return '<div class="receta" data-ficha="' + esc(r.id) + '">' +
             '<h3>' + esc(r.n) + '</h3>' +
             '<div class="nota-peque">' + Util.kcal(n.k) + ' · ' + Math.round(n.p) + ' g prot. · ' +
             Util.sal(sal) + ' sal · ' + (r.min || "?") + ' min</div>' +
             '<div class="etiquetas">' +
               (r.grupo ? '<span class="etiqueta verde">' + esc(NOMBRE_GRUPO[r.grupo] || r.grupo) + '</span>' : '') +
               (r.tools || []).map(function (t) { return '<span class="etiqueta">' + esc(NOMBRE_TOOL[t] || t) + '</span>'; }).join("") +
             '</div></div>';
    }).join("") || '<div class="vacio">No hay recetas con esos filtros.</div>';
  }

  /* ==================== VISTA: COMPRA ==================== */
  var compraActual = null;

  function pintarCompra() {
    var datos = Almacen.generarCompra(UI.lunes, 7);
    compraActual = datos;
    var pers = Almacen.estado.config.personas || 1;
    $("#compra-rango").textContent = esMovil()
      ? "Semana " + Util.etiquetaRangoCorto(UI.lunes)
      : "Semana del " + Util.etiquetaRango(UI.lunes);
    $("#compra-personas").textContent = pers === 1 ? "1 persona" : pers + " personas";

    var totalLineas = 0, pendientes = 0;
    datos.secciones.forEach(function (s) {
      s.lineas.forEach(function (l) { totalLineas++; if (!l.enCasa && !l.marcado) pendientes++; });
    });

    if (!totalLineas) {
      $("#compra-resumen").textContent = "Esta semana no tiene menú todavía. Aplica la Semana A o B en la pestaña Menú.";
      $("#lista-compra").innerHTML = "";
      return;
    }
    $("#compra-resumen").textContent = "Quedan " + pendientes + " productos por comprar de " + totalLineas + ".";

    var visible = function (l) { return UI.ocultarComprados ? (!l.marcado && !l.enCasa) : true; };
    var html = "";
    datos.secciones.forEach(function (s) {
      var lineas = s.lineas.filter(visible);
      if (!lineas.length) return;
      html += '<div class="seccion-compra"><h3>' + esc(s.nombre) + '</h3>';
      lineas.forEach(function (l) { html += lineaCompraHTML(l); });
      html += '</div>';
    });
    var basicos = datos.basicos.filter(visible);
    if (basicos.length) {
      html += '<div class="seccion-compra"><h3>Revisa la despensa (básicos)</h3>';
      basicos.forEach(function (l) { html += lineaCompraHTML(l, true); });
      html += '</div>';
    }
    if (!html) html = '<div class="vacio">Todo comprado. Buen trabajo.</div>';
    $("#lista-compra").innerHTML = html;
    $("#compra-ocultar").textContent = UI.ocultarComprados ? "Ver todo" : "Ocultar comprados";
  }

  function lineaCompraHTML(l, basico) {
    var clases = "linea" + (l.marcado ? " hecha" : "") + (l.enCasa ? " en-casa" : "");
    return '<div class="' + clases + '">' +
      '<input type="checkbox" data-marcar="' + esc(l.id) + '"' + (l.marcado ? " checked" : "") + ' title="Marcar como comprado">' +
      '<div class="datos"><div class="nombre">' + esc(l.nombre) + (l.enCasa ? ' <span class="etiqueta">ya en casa</span>' : '') + '</div>' +
      '<div class="detalle">' + esc(l.recetas.slice(0, 3).join(" · ")) + (l.recetas.length > 3 ? " …" : "") +
      (l.nota ? ' — ' + esc(l.nota) : '') + '</div></div>' +
      '<span class="cant">' + esc(l.texto) + '</span>' +
      '<button class="btn mini" data-encasa="' + esc(l.id) + '">' + (l.enCasa ? "Comprar" : "Lo tengo") + '</button>' +
      '</div>';
  }

  function textoCompra(soloPendientes) {
    if (!compraActual) return "";
    var out = "LISTA DE LA COMPRA — semana del " + Util.etiquetaRango(UI.lunes) +
              " (" + (Almacen.estado.config.personas || 1) + " personas)\n\n";
    compraActual.secciones.forEach(function (s) {
      var lineas = s.lineas.filter(function (l) { return soloPendientes ? (!l.enCasa && !l.marcado) : true; });
      if (!lineas.length) return;
      out += s.nombre.toUpperCase() + "\n";
      lineas.forEach(function (l) { out += "  - " + l.nombre + ": " + l.texto + "\n"; });
      out += "\n";
    });
    var bas = compraActual.basicos.filter(function (l) { return soloPendientes ? (!l.enCasa && !l.marcado) : true; });
    if (bas.length) {
      out += "REVISAR DESPENSA\n";
      bas.forEach(function (l) { out += "  - " + l.nombre + ": " + l.texto + "\n"; });
    }
    return out;
  }

  /* ==================== VISTA: DESPENSA ==================== */
  function pintarDespensa() {
    var q = UI.busquedaDespensa.toLowerCase();
    var lista = Almacen.estado.ingredientes.filter(function (i) {
      return !q || i.n.toLowerCase().indexOf(q) >= 0;
    });
    lista.sort(function (a, b) {
      if (a.cat !== b.cat) return a.cat.localeCompare(b.cat);
      return a.n.localeCompare(b.n);
    });
    var html = "", catActual = "";
    lista.forEach(function (i) {
      if (i.cat !== catActual) {
        if (catActual) html += '</div>';
        html += '<h3 style="grid-column:1/-1; margin:10px 0 2px; font-size:.8rem; color:var(--gris); text-transform:uppercase">' + esc(i.cat) + '</h3><div style="display:contents">';
        catActual = i.cat;
      }
      var tengo = !!Almacen.estado.despensa[i.id];
      html += '<div class="linea' + (tengo ? " en-casa" : "") + '">' +
              '<input type="checkbox" data-despensa="' + esc(i.id) + '"' + (tengo ? " checked" : "") + '>' +
              '<div class="datos"><div class="nombre">' + esc(i.n) + '</div>' +
              '<div class="detalle">' + Math.round(i.k || 0) + ' kcal · ' + (i.p || 0) + ' g prot. · ' +
              Util.sal(i.sal) + ' sal — por 100 ' + (i.u === "ml" ? "ml" : "g") + '</div></div>' +
              '<button class="btn mini" data-editaring="' + esc(i.id) + '">Valores</button></div>';
    });
    if (catActual) html += '</div>';
    $("#rejilla-despensa").innerHTML = html || '<div class="vacio">Sin resultados.</div>';
  }

  /* ==================== VISTA: AJUSTES ==================== */
  function pintarAjustes() {
    var c = Almacen.estado.config;
    $("#cfg-personas").value = c.personas;
    $("#cfg-aviso").value = c.avisoSal;
    $("#cfg-limite").value = c.limiteSal;
    $("#cfg-kcal").value = c.objetivoKcal;
    $("#cfg-prot").value = c.objetivoProt;
    $("#cfg-margen").value = c.margenKcal;
    $("#gh-usuario").value = c.github.usuario || "";
    $("#gh-repo").value = c.github.repo || "";
    $("#gh-rama").value = c.github.rama || "main";
    $("#gh-token").value = c.github.token || "";
  }

  /* ==================== NAVEGACIÓN ==================== */
  function mostrar(vista) {
    UI.vista = vista;
    $$(".vista").forEach(function (v) { v.classList.toggle("activa", v.id === "vista-" + vista); });
    $$("#pestanas button").forEach(function (b) { b.classList.toggle("activa", b.getAttribute("data-vista") === vista); });
    if (vista === "menu") pintarMenu();
    if (vista === "recetas") pintarRecetas();
    if (vista === "compra") pintarCompra();
    if (vista === "despensa") pintarDespensa();
    if (vista === "ajustes") pintarAjustes();
    window.scrollTo(0, 0);
  }

  /* ==================== EVENTOS ==================== */
  function conectarEventos() {

    $("#pestanas").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-vista]");
      if (b) mostrar(b.getAttribute("data-vista"));
    });

    /* --- menú --- */
    $("#semana-anterior").addEventListener("click", function () { UI.lunes = Util.sumarDias(UI.lunes, -7); UI.diaActivo = diaPorDefecto(); pintarMenu(); });
    $("#semana-siguiente").addEventListener("click", function () { UI.lunes = Util.sumarDias(UI.lunes, 7); UI.diaActivo = diaPorDefecto(); pintarMenu(); });
    $("#ir-hoy").addEventListener("click", function () { UI.lunes = Util.lunesDe(Util.hoyISO()); UI.diaActivo = diaPorDefecto(); pintarMenu(); });

    $("#selector-dias").addEventListener("click", function (e) {
      var b = e.target.closest("[data-dia]");
      if (!b) return;
      UI.diaActivo = parseInt(b.getAttribute("data-dia"), 10);
      pintarMenu();
    });

    var anchoAnterior = esMovil();
    window.addEventListener("resize", function () {
      var ahora = esMovil();
      if (ahora !== anchoAnterior) { anchoAnterior = ahora; if (UI.vista === "menu") pintarMenu(); }
    });
    $("#vaciar-semana").addEventListener("click", function () {
      if (confirm("¿Vaciar el menú de esta semana?")) { Almacen.vaciarSemana(UI.lunes); pintarMenu(); }
    });
    $$("[data-plantilla]").forEach(function (b) {
      b.addEventListener("click", function () {
        Almacen.aplicarPlantilla(b.getAttribute("data-plantilla"), UI.lunes);
        pintarMenu();
        Util.toast("Semana " + b.getAttribute("data-plantilla") + " aplicada");
      });
    });
    $("#guardar-como-plantilla").addEventListener("click", function () {
      var nombre = prompt("Nombre de la plantilla:", "Mi semana");
      if (!nombre) return;
      var dias = [];
      for (var i = 0; i < 7; i++) {
        var d = Almacen.estado.plan[Util.sumarDias(UI.lunes, i)] || Almacen.diaVacio();
        dias.push({
          d: Util.DIAS[i], desayuno: (d.desayuno || []).slice(), almuerzo: (d.almuerzo || []).slice(),
          comida: (d.comida || []).slice(), merienda: (d.merienda || []).slice(), cena: (d.cena || []).slice()
        });
      }
      Almacen.estado.plantillas.push({ id: "p" + Date.now().toString(36), nombre: nombre, dias: dias });
      Almacen.guardar("plantilla");
      Util.toast("Plantilla guardada");
    });

    $("#rejilla-dias").addEventListener("click", function (e) {
      var add = e.target.closest("[data-anadir]");
      if (add) { var p = add.getAttribute("data-anadir").split("|"); abrirSelector(p[0], p[1]); return; }
      var com = e.target.closest("[data-comido]");
      if (com) {
        var c = com.getAttribute("data-comido").split("|");
        Almacen.marcarComido(c[0], c[1], c[2], !Almacen.estaComido(c[0], c[1], c[2]));
        pintarMenu();
        return;
      }
      var quitar = e.target.closest("[data-quitar]");
      if (quitar) {
        var q = quitar.getAttribute("data-quitar").split("|");
        var dia = Almacen.estado.plan[q[0]];
        if (dia && dia[q[1]]) { dia[q[1]].splice(+q[2], 1); Almacen.guardar("plato"); pintarMenu(); }
        return;
      }
      var ficha = e.target.closest("[data-ficha]");
      if (ficha) abrirFicha(ficha.getAttribute("data-ficha"));
    });

    /* --- recetas --- */
    $("#buscar-receta").addEventListener("input", function (e) { UI.filtros.texto = e.target.value; pintarRecetas(); });
    $("#filtro-toma").addEventListener("change", function (e) { UI.filtros.toma = e.target.value; pintarRecetas(); });
    $("#filtro-grupo").addEventListener("change", function (e) { UI.filtros.grupo = e.target.value; pintarRecetas(); });
    $("#filtro-tool").addEventListener("change", function (e) { UI.filtros.tool = e.target.value; pintarRecetas(); });
    $("#nueva-receta").addEventListener("click", function () { abrirEditor(null); });
    $("#rejilla-recetas").addEventListener("click", function (e) {
      var c = e.target.closest("[data-ficha]");
      if (c) abrirFicha(c.getAttribute("data-ficha"));
    });

    /* --- modal --- */
    $("#modal").addEventListener("click", function (e) {
      if (e.target.id === "modal" || e.target.closest("[data-cerrar]")) { cerrarModal(); return; }
      var ed = e.target.closest("[data-editar]");
      if (ed) { abrirEditor(ed.getAttribute("data-editar")); return; }
      var du = e.target.closest("[data-duplicar]");
      if (du) {
        var orig = Almacen.receta(du.getAttribute("data-duplicar"));
        var copia = JSON.parse(JSON.stringify(orig));
        copia.id = "propia_" + Date.now().toString(36);
        copia.n = orig.n + " (copia)";
        Almacen.estado.recetas.push(copia);
        Almacen.guardar("receta");
        cerrarModal(); pintarRecetas();
        Util.toast("Receta duplicada");
        return;
      }
      var bo = e.target.closest("[data-borrar]");
      if (bo) {
        var id = bo.getAttribute("data-borrar");
        if (!confirm("¿Borrar esta receta del recetario?")) return;
        Almacen.estado.recetas = Almacen.estado.recetas.filter(function (r) { return r.id !== id; });
        Almacen.guardar("receta");
        cerrarModal(); pintarRecetas(); pintarMenu();
        Util.toast("Receta borrada");
      }
    });

    /* --- compra --- */
    $("#compra-recalcular").addEventListener("click", pintarCompra);
    $("#compra-ocultar").addEventListener("click", function () { UI.ocultarComprados = !UI.ocultarComprados; pintarCompra(); });
    $("#lista-compra").addEventListener("click", function (e) {
      var enc = e.target.closest("[data-encasa]");
      if (enc) {
        var id = enc.getAttribute("data-encasa");
        if (Almacen.estado.despensa[id]) delete Almacen.estado.despensa[id];
        else Almacen.estado.despensa[id] = true;
        Almacen.guardar("despensa"); pintarCompra();
      }
    });
    $("#lista-compra").addEventListener("change", function (e) {
      var m = e.target.closest("[data-marcar]");
      if (m) {
        var id = m.getAttribute("data-marcar");
        if (m.checked) Almacen.estado.compraMarcada[id] = true; else delete Almacen.estado.compraMarcada[id];
        Almacen.guardar("compra"); pintarCompra();
      }
    });
    $("#compra-copiar").addEventListener("click", function () {
      var texto = textoCompra(true);
      if (navigator.clipboard) navigator.clipboard.writeText(texto).then(function () { Util.toast("Lista copiada"); });
      else Util.toast("Copia manualmente desde «Preparar compra»");
    });
    $("#compra-para-claude").addEventListener("click", function () {
      var texto = "Claude, haz esta compra en Amazon por mí.\n\n" + textoCompra(true);
      abrirModal('<header><h2>Compra para pasarme</h2><button class="cerrar" data-cerrar>×</button></header>' +
        '<p class="nota-peque">Copia este texto y pégamelo en el chat: abro Amazon en tu navegador y voy añadiendo los productos al carrito.</p>' +
        '<textarea class="salida" id="texto-claude">' + esc(texto) + '</textarea>' +
        '<div class="fila" style="margin-top:10px"><button class="btn principal" id="copiar-claude">Copiar</button></div>');
      $("#copiar-claude").addEventListener("click", function () {
        var ta = $("#texto-claude"); ta.select();
        if (navigator.clipboard) navigator.clipboard.writeText(ta.value);
        else document.execCommand("copy");
        Util.toast("Copiado");
      });
    });

    /* --- despensa --- */
    $("#buscar-despensa").addEventListener("input", function (e) { UI.busquedaDespensa = e.target.value; pintarDespensa(); });
    $("#despensa-vaciar").addEventListener("click", function () {
      if (!confirm("¿Desmarcar todo lo que tienes en casa?")) return;
      Almacen.estado.despensa = {}; Almacen.guardar("despensa"); pintarDespensa();
    });
    $("#rejilla-despensa").addEventListener("click", function (e) {
      var ed = e.target.closest("[data-editaring]");
      if (ed) abrirIngrediente(ed.getAttribute("data-editaring"));
    });
    $("#nuevo-ingrediente").addEventListener("click", function () { abrirIngrediente(null); });
    $("#rejilla-despensa").addEventListener("change", function (e) {
      var d = e.target.closest("[data-despensa]");
      if (!d) return;
      var id = d.getAttribute("data-despensa");
      if (d.checked) Almacen.estado.despensa[id] = true; else delete Almacen.estado.despensa[id];
      Almacen.guardar("despensa"); pintarDespensa();
    });

    /* --- ajustes --- */
    $("#guardar-cocina").addEventListener("click", function () {
      var c = Almacen.estado.config;
      c.personas = parseInt($("#cfg-personas").value, 10) || 1;
      c.avisoSal = parseFloat($("#cfg-aviso").value) || 1.5;
      c.limiteSal = parseFloat($("#cfg-limite").value) || 2.0;
      c.objetivoKcal = parseInt($("#cfg-kcal").value, 10) || 2000;
      c.objetivoProt = parseInt($("#cfg-prot").value, 10) || 90;
      c.margenKcal = parseInt($("#cfg-margen").value, 10);
      if (isNaN(c.margenKcal)) c.margenKcal = 10;
      Almacen.guardar("config");
      Util.toast("Ajustes guardados");
    });
    $("#gh-guardar").addEventListener("click", function () {
      var g = Almacen.estado.config.github;
      g.usuario = $("#gh-usuario").value.trim();
      g.repo = $("#gh-repo").value.trim();
      g.rama = $("#gh-rama").value.trim() || "main";
      g.token = $("#gh-token").value.trim();
      Almacen.guardar("config");
      Sync.cargar().then(function () { Sync.guardar(); });
      Util.toast("Conectando con GitHub…");
    });
    $("#gh-probar").addEventListener("click", function () { Sync.probar(); });
    $("#gh-subir").addEventListener("click", function () { Sync.guardar(); });
    $("#gh-bajar").addEventListener("click", function () {
      Sync.cargar().then(function (cambio) {
        if (!cambio) Util.toast("No había nada más nuevo en el repositorio");
        mostrar(UI.vista);
      });
    });

    $("#exportar").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(Almacen.estado, null, 1)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "menu-copia-" + Util.hoyISO() + ".json";
      a.click();
    });
    $("#importar-btn").addEventListener("click", function () { $("#importar").click(); });
    $("#importar").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f) return;
      var lector = new FileReader();
      lector.onload = function () {
        try {
          var d = JSON.parse(lector.result);
          if (!d.v) throw new Error("formato");
          Almacen.reemplazar(d);
          mostrar(UI.vista);
          Util.toast("Copia restaurada");
        } catch (err) { Util.toast("Ese fichero no es una copia válida"); }
      };
      lector.readAsText(f);
    });
    $("#recargar-recetas").addEventListener("click", function () {
      if (!confirm("Se reponen las recetas e ingredientes originales. Tus menús y tu despensa no se tocan. ¿Seguimos?")) return;
      Almacen.estado.ingredientes = JSON.parse(JSON.stringify(global.DATOS_INGREDIENTES));
      var propias = Almacen.estado.recetas.filter(function (r) { return r.id.indexOf("propia_") === 0; });
      Almacen.estado.recetas = JSON.parse(JSON.stringify(global.DATOS_RECETAS)).concat(propias);
      Almacen.estado.plantillas = JSON.parse(JSON.stringify(global.DATOS_PLANTILLAS));
      Almacen.guardar("recarga");
      mostrar(UI.vista);
      Util.toast("Recetario original repuesto");
    });
  }

  /* ==================== ARRANQUE ==================== */
  function arrancar() {
    Almacen.iniciar();
    conectarEventos();

    // primera vez: deja la semana en curso preparada con la Semana A
    var hayPlan = Object.keys(Almacen.estado.plan).length > 0;
    if (!hayPlan) Almacen.aplicarPlantilla("A", UI.lunes);

    mostrar("menu");

    if (Sync.configurado()) {
      Sync.cargar().then(function () { mostrar(UI.vista); });
    } else {
      Sync.indicar("Solo en este dispositivo", "");
    }

    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  document.addEventListener("DOMContentLoaded", arrancar);
})(window);
