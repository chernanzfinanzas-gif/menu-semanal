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

  /* ===== DECIR POR QUÉ, NO SÓLO QUE NO  ·  1-oct-2026 =====
     Ese día la app estuvo una tarde entera diciendo «No se pudo guardar» sin una
     palabra más. El motivo real —GitHub rechazaba el fichero por tamaño— sólo
     estaba en la consola del navegador, donde Carlos no tiene por qué entrar, y
     se acabó diagnosticando a ciegas deduciendo por el peso del fichero. Esto es
     para que no vuelva a pasar: el motivo, en castellano y en pantalla. */
  /* ===== LEER EL FICHERO SEA DEL TAMAÑO QUE SEA  ·  1-oct-2026 =====
     EL CALLEJÓN SIN SALIDA QUE PARÓ LA APP UNA TARDE, y el error que lo delató
     fue «No se pudo guardar · Unexpected end of JSON input».

     La API de contenidos de GitHub sólo devuelve `content` —el fichero en
     base64— cuando pesa MENOS DE 1 MB. Por encima lo manda VACÍO y sólo trae la
     ficha: el `sha` y un `download_url`. Aquí se hacía `JSON.parse(deB64(j.content))`
     a pelo, así que el día que `estado.json` pasó de 1 MB —el 1-oct, al cargar la
     compra de Mercadona con sus 200 productos— la app dejó de poder LEER el
     remoto. Y sin leerlo no puede fusionar, y sin fusionar no puede escribir, y
     sin escribir el fichero no adelgaza nunca. Un callejón perfecto: cuanto más
     crecía, menos se podía arreglar solo.

     Y encima mentía: «Probar conexión» seguía diciendo que todo iba bien, porque
     esa comprobación sólo mira si el repositorio existe.

     Ahora, si no viene `content`, se baja por `download_url`, que la API manda
     también para los ficheros grandes y que en un repositorio privado ya trae su
     propio permiso. */
  function contenidoDe(j) {
    if (j && j.content) {
      try { return Promise.resolve(JSON.parse(deB64(j.content))); }
      catch (e) { /* venía cortado: se intenta por la otra vía */ }
    }
    if (j && j.download_url) {
      return fetch(j.download_url, { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("no se pudo leer el fichero del repositorio (" + r.status + ")");
        return r.text();
      }).then(function (t) {
        try { return JSON.parse(t); }
        catch (e) { throw new Error("el fichero del repositorio no es un JSON v\u00e1lido"); }
      });
    }
    return Promise.reject(new Error("el repositorio no devolvi\u00f3 el contenido del fichero"));
  }

  /* EL NÚMERO DE VERSIÓN DEL CÓDIGO (4-oct-2026, v395). Sale del `?v=N` con
     el que index.html carga este fichero, que es el que se sube en cada
     publicación: así no hay un segundo número que olvidarse de cambiar. */
  function codigoApp() {
    try {
      var sc = document.querySelector('script[src*="js/github.js"]');
      var m = sc && /[?&]v=(\d+)/.exec(sc.getAttribute("src") || "");
      return m ? Number(m[1]) : 0;
    } catch (e) { return 0; }
  }
  /* Lo de GitHub lo guardó un código más nuevo que el de este aparato. */
  function remotoMasNuevo(remoto) {
    var c = codigoApp();
    return !!(remoto && remoto.codigo && c && Number(remoto.codigo) > c);
  }

  function motivoHttp(st, msg) {
    msg = String(msg || "");
    if (st === 401) return "la clave de GitHub no vale o ha caducado";
    if (st === 403) {
      if (/rate limit/i.test(msg)) return "GitHub ha cortado por exceso de peticiones; espera un rato";
      return "la clave no tiene permiso para ESCRIBIR en el repositorio";
    }
    if (st === 404) return "no encuentro el repositorio (nombre, rama o permisos de la clave)";
    if (st === 413 || /too large|size is/i.test(msg)) {
      return "el fichero es DEMASIADO GRANDE para GitHub (el tope al escribir es 1 MB)";
    }
    if (st === 422) return "GitHub rechaza el contenido" + (msg ? ": " + msg : "");
    if (st === 409) return "choque con otro aparato que no se ha podido resolver";
    return "GitHub respondi\u00f3 " + st + (msg ? " \u00b7 " + msg : "");
  }

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

    /* ── LAS PESADAS, UNA A UNA POR FECHA (8-oct-2026) ──────────────────
       La lista de pesos no lleva id, y una lista sin id la decidía entera el
       reloj GLOBAL: si apuntabas el peso en el móvil y el ordenador guardaba
       cualquier otra cosa antes de que el móvil subiera, ganaba la lista del
       ordenador y la pesada desaparecía. Mismo agujero que costó los días 21
       y 22 de septiembre. Ahora se juntan por fecha; si las dos tienen la
       misma fecha con distinto peso, gana la apuntada más tarde (`t`); una
       pesada con hora gana a una sin hora. Lo borrado deja su hora en
       `pesosBorrados` y sólo vuelve si alguien la apunta DESPUÉS de borrarla. */
    (function () {
      var L = Array.isArray(local.pesos) ? local.pesos : [];
      var R = Array.isArray(remoto.pesos) ? remoto.pesos : [];
      var borr = {};
      [local.pesosBorrados || {}, remoto.pesosBorrados || {}].forEach(function (b) {
        Object.keys(b).forEach(function (f) {
          if (!borr[f] || String(b[f]) > String(borr[f])) borr[f] = b[f];
        });
      });
      var porF = {};
      function pon(p, manda) {
        if (!p || !p.f) return;
        var y = porF[p.f];
        if (!y) { porF[p.f] = p; return; }
        var tp = String(p.t || ""), ty = String(y.t || "");
        if (tp !== ty) { if (tp > ty) porF[p.f] = p; }
        else if (manda) porF[p.f] = p;
      }
      L.forEach(function (p) { pon(p, false); });
      R.forEach(function (p) { pon(p, remotoManda); });
      var lista = Object.keys(porF).sort().map(function (f) { return porF[f]; })
        .filter(function (p) { return !borr[p.f] || String(p.t || "") > String(borr[p.f]); });
      junto.pesos = JSON.parse(JSON.stringify(lista));
      junto.pesosBorrados = borr;
      if (lista.length && junto.perfil) junto.perfil.peso = lista[lista.length - 1].kg;
    })();

    /* ── CADA FICHA, LA DEL ÚLTIMO QUE LA TOCÓ (4-oct-2026) ──────────────
       Carlos: «Ajos morados lo sigo viendo en Despensa - Conserva… cebolla
       dulce Tara la sigo viendo en Nevera - Frutero». Se habían movido a
       Básicos en este aparato, con su hora, y el repositorio —con un guardado
       posterior de OTRA cosa— se los devolvió al estante viejo: los campos de
       cada ficha los ponía el sello GLOBAL, no la hora de esa ficha. Es el
       mismo agujero que ya se tapó con los días, la despensa y el orden.
       Ahora, si los dos lados tienen la ficha y la tocaron a horas distintas,
       manda entera la del último que la tocó. Una ficha con hora gana a una
       sin hora: la hora sólo la ponen un cambio tuyo o un arreglo pedido. */
    ["ingredientes", "recetas"].forEach(function (k) {
      if (!Array.isArray(junto[k]) || !Array.isArray(local[k]) || !Array.isArray(remoto[k])) return;
      var catIng = {};
      ((k === "ingredientes" ? global.DATOS_INGREDIENTES : global.DATOS_RECETAS) || [])
        .forEach(function (c) { if (c && c.id) catIng[c.id] = c; });
      var mL = {}, mR = {};
      local[k].forEach(function (x) { if (x && x.id) mL[x.id] = x; });
      remoto[k].forEach(function (x) { if (x && x.id) mR[x.id] = x; });
      junto[k] = junto[k].map(function (x) {
        if (!x || !x.id) return x;
        var L = mL[x.id], R = mR[x.id];
        if (!L || !R) return x;
        var tl = String(L.tocado || ""), tr = String(R.tocado || "");
        if (tl !== tr) return JSON.parse(JSON.stringify(tl > tr ? L : R));
        /* MISMA HORA, DISTINTO CONTENIDO (4-oct-2026, v394). Carlos movió la
           alubia blanca a Estante abajo y volvió a Conserva. Un aparato con el
           código anterior a la v386 mezcla campo a campo: subió la ficha con la
           HORA de su cambio pero con SU estante viejo. Las dos copias llevan la
           misma hora y aquí ganaba la mezclada. Reproducido con los dos
           códigos. Ahora, en cada campo en que las dos copias no coinciden,
           gana el valor que se aparta del catálogo: ése es el que cambiaste tú;
           el de fábrica es el que traía el aparato que no se había enterado. */
        var cat = catIng[x.id];
        if (!cat) return x;
        var y = JSON.parse(JSON.stringify(x));
        var claves = {};
        Object.keys(L).forEach(function (q) { claves[q] = 1; });
        Object.keys(R).forEach(function (q) { claves[q] = 1; });
        Object.keys(claves).forEach(function (q) {
          if (q === "tocado") return;
          var vl = JSON.stringify(L[q]), vr = JSON.stringify(R[q]), vc = JSON.stringify(cat[q]);
          if (vl === vr) return;
          if (vl === vc && vr !== vc) { if (R[q] === undefined) delete y[q]; else y[q] = JSON.parse(vr); }
          else if (vr === vc && vl !== vc) { if (L[q] === undefined) delete y[q]; else y[q] = JSON.parse(vl); }
        });
        return y;
      });
    });

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
    /* Los sellos de día se unen por el MÁS NUEVO de cada día, nunca por el reloj
       global: si no, el propio sello que decide quién manda podía perderse. */
    /* ── LA DESPENSA ES UNA FOTO, Y BORRAR TIENE QUE PROPAGARSE ──────────
       `fusionar` es aditiva: una clave que no está en la copia local se coge
       de la remota. Para el plan o las recetas eso es lo que queremos, pero
       para lo apuntado en la despensa es al revés — vaciarla aquí y
       sincronizar la devolvía entera, porque en GitHub seguían todas las
       líneas. (Carlos, 25-sep-2026, probando «Borrar todo lo apuntado».)
       Lo apuntado en una pasada no son trozos que sumar: es una foto de un
       momento. Así que manda entera la del lado que la tomó más tarde, según
       su propio sello, no según el reloj global del estado. */
    var selloL = String(local.stockSello || ""), selloR = String(remoto.stockSello || "");
    if (selloL || selloR) {
      var ganaR = selloR > selloL;
      var foto = ganaR ? remoto : local;
      junto.stock          = foto.stock          || {};
      junto.stockSitios    = foto.stockSitios    || {};
      junto.sitiosSaltados = foto.sitiosSaltados || {};
      junto.rondaStock     = foto.rondaStock     || null;
      junto.stockSello     = ganaR ? selloR : selloL;
    }

    /* Lo pedido a mano —faltas de hogar y caprichos— es una foto igual que la
       despensa: manda entera la del lado que la tocó más tarde, para que borrar
       propague. Ver `_sellarPedido` en almacen.js. */
    var pedL = String(local.pedidoSello || ""), pedR = String(remoto.pedidoSello || "");
    if (pedL || pedR) {
      var ganaPed = pedR > pedL;
      var fp = ganaPed ? remoto : local;
      junto.hogar  = fp.hogar  || {};
      junto.quiero = fp.quiero || {};
      junto.pedidoSello = ganaPed ? pedR : pedL;
    }

    /* ── EL ORDEN DE LOS ESTANTES, CADA UNO CON SU HORA (1-oct-2026) ──────
       Carlos: «en el móvil solo leeré el stock… y la ordenaré en el ordenador».
       Y el móvil le estaba borrando el orden que acababa de colocar en el
       ordenador, sin haberlo tocado: el orden viajaba con el sello GLOBAL del
       estado, así que ganaba el aparato que hubiera guardado algo —cualquier
       cosa— más tarde. Hacer el stock en el móvil bastaba.

       Ahora cada estante lleva su propia hora (`ordenSello`, ver `sellarOrden`
       en almacen.js) y se resuelve ESTANTE A ESTANTE: gana quien ordenó ESE
       estante más tarde. Un aparato que solo lee no tiene hora para ese
       estante, así que no pisa nada. Es el mismo remedio que ya llevaban el
       stock, lo pedido a mano y los días corregidos.

       Y vale para los dos órdenes: el de casa (la nevera) y el de compra. */
    function fusionarOrden(grupo, campo) {
      var sL = (local.ordenSello || {})[grupo] || {};
      var sR = (remoto.ordenSello || {})[grupo] || {};
      var oL = local[campo] || {}, oR = remoto[campo] || {};
      var res = {}, sello = {}, k;
      var claves = {};
      for (k in oL) if (Object.prototype.hasOwnProperty.call(oL, k)) claves[k] = 1;
      for (k in oR) if (Object.prototype.hasOwnProperty.call(oR, k)) claves[k] = 1;
      for (k in claves) {
        if (!Object.prototype.hasOwnProperty.call(claves, k)) continue;
        var hL = String(sL[k] || ""), hR = String(sR[k] || "");
        var ganaR;
        if (hL || hR) ganaR = hR > hL;          /* alguien lo ordenó: manda la hora */
        else ganaR = remotoManda;               /* ninguno: como antes, el sello global */
        var elegido = ganaR ? oR[k] : oL[k];
        /* Si el que gana no tiene lista para ese estante, se queda la del otro:
           no tiene sentido quedarse sin orden pudiendo conservar uno. */
        if (!elegido || !elegido.length) elegido = ganaR ? oL[k] : oR[k];
        if (elegido && elegido.length) res[k] = elegido.slice();
        var hMax = hL > hR ? hL : hR;
        if (hMax) sello[k] = hMax;
      }
      if (Object.keys(res).length) junto[campo] = res;
      if (Object.keys(sello).length) {
        if (!junto.ordenSello) junto.ordenSello = {};
        junto.ordenSello[grupo] = sello;
      }
    }
    fusionarOrden("casa", "ordenCasa");
    fusionarOrden("compra", "ordenCompra");

    /* ── EL REPARTO DE LA SEMANA, EL DEL ÚLTIMO QUE LO TOCÓ (6-oct-2026) ──
       Carlos: «he movido todo lo pendiente a sin colocar… y me lo acaba de
       colocar solo otra vez. No hace falta ni salir de la página».

       `fusionar` trata el `null` como VACÍO —`vacio()` lo dice— y el día de un
       bloque que está en la bandeja se guarda justamente como `null`. Mezclando
       campo a campo, el día que tenía el otro lado SIEMPRE le ganaba a la
       bandeja: en cuanto entraba una sincronización, los bloques volvían a su
       día solos, sin recargar siquiera. Dejar algo sin colocar era imposible.

       El reparto de una semana no es una bolsa de campos sueltos: es una
       colocación entera, y mezclar media de aquí y media de allá no significa
       nada. Así que viaja COMPLETO, y manda el lado que lo tocó más tarde,
       igual que ya se hace con las fichas, los días y el orden de la compra.
       Sin sello en ninguno de los dos lados —estados de antes de este arreglo—
       se sigue usando el sello global, que es lo que había. */
    (function () {
      var eL = local.entreno || {}, eR = remoto.entreno || {};
      var rL = eL.reparto || {}, rR = eR.reparto || {};
      var sL = eL.repartoSello || {}, sR = eR.repartoSello || {};
      var claves = {}, k;
      for (k in rL) if (Object.prototype.hasOwnProperty.call(rL, k)) claves[k] = 1;
      for (k in rR) if (Object.prototype.hasOwnProperty.call(rR, k)) claves[k] = 1;
      if (!Object.keys(claves).length) return;
      var res = {}, sello = {};
      for (k in claves) {
        if (!Object.prototype.hasOwnProperty.call(claves, k)) continue;
        var hL = String(sL[k] || ""), hR = String(sR[k] || "");
        var ganaR = (hL || hR) ? (hR > hL) : remotoManda;
        var elegido = ganaR ? rR[k] : rL[k];
        if (!elegido) elegido = ganaR ? rL[k] : rR[k];
        if (elegido) res[k] = JSON.parse(JSON.stringify(elegido));
        var hMax = hL > hR ? hL : hR;
        if (hMax) sello[k] = hMax;
      }
      if (!junto.entreno) junto.entreno = {};
      junto.entreno.reparto = res;
      if (Object.keys(sello).length) junto.entreno.repartoSello = sello;
    })();

    /* ── LOS DÍAS NO DISPONIBLES, IGUAL (6-oct-2026) ──────────────────────
       Carlos: «quitado el día no disponible… y una vez guardado vuelve el día
       no disponible».

       Mismo agujero, otro campo. Quitar la marca BORRA la clave del día, y
       esta fusión suma las claves de los dos lados: lo borrado aquí volvía del
       repositorio. Una fusión que sólo sabe sumar no puede representar un
       QUITAR, y quitar es la mitad de lo que hace una persona.

       Ahora cada día lleva su hora —puesta igual al marcar que al desmarcar— y
       manda el último que lo tocó, con la ausencia como valor válido. Un lado
       SIN hora no puede afirmar un borrado: es un estado anterior a este
       arreglo y no registró nada, así que se respeta lo que tenga el otro. */
    (function () {
      var eL = local.entreno || {}, eR = remoto.entreno || {};
      var nL = eL.noHabil || {}, nR = eR.noHabil || {};
      var sL = eL.noHabilSello || {}, sR = eR.noHabilSello || {};
      var claves = {}, k;
      [nL, nR, sL, sR].forEach(function (o) {
        for (var q in o) if (Object.prototype.hasOwnProperty.call(o, q)) claves[q] = 1;
      });
      if (!Object.keys(claves).length) return;
      var res = {}, sello = {};
      for (k in claves) {
        if (!Object.prototype.hasOwnProperty.call(claves, k)) continue;
        var hL = String(sL[k] || ""), hR = String(sR[k] || "");
        var ganaR = (hL || hR) ? (hR > hL) : remotoManda;
        var v = ganaR ? nR[k] : nL[k];
        /* sin hora no se puede afirmar un borrado */
        if (v === undefined && !(ganaR ? hR : hL)) v = ganaR ? nL[k] : nR[k];
        if (v !== undefined) res[k] = JSON.parse(JSON.stringify(v));
        var hMax = hL > hR ? hL : hR;
        if (hMax) sello[k] = hMax;
      }
      if (!junto.entreno) junto.entreno = {};
      junto.entreno.noHabil = res;
      if (Object.keys(sello).length) junto.entreno.noHabilSello = sello;
    })();

    /* ── EL PLANIFICADOR DEL DÍA, IGUAL  ·  7-oct-2026 ────────────────────
       Las horas que Carlos pone a los bloques del día, y la ida y vuelta de
       sus citas. Cada fecha viaja ENTERA —una colocación del día no es una
       bolsa de campos sueltos— y manda el lado que la tocó más tarde. Vaciar
       un día BORRA su clave y deja la hora en el sello, así que el borrado
       también viaja. Mismo patrón que los días no disponibles, de arriba. */
    (function () {
      var eL = local.entreno || {}, eR = remoto.entreno || {};
      var nL = eL.planificador || {}, nR = eR.planificador || {};
      var sL = eL.planificadorSello || {}, sR = eR.planificadorSello || {};
      var claves = {}, k;
      [nL, nR, sL, sR].forEach(function (o) {
        for (var q in o) if (Object.prototype.hasOwnProperty.call(o, q)) claves[q] = 1;
      });
      if (!Object.keys(claves).length) return;
      var res = {}, sello = {};
      for (k in claves) {
        if (!Object.prototype.hasOwnProperty.call(claves, k)) continue;
        var hL = String(sL[k] || ""), hR = String(sR[k] || "");
        var ganaR = (hL || hR) ? (hR > hL) : remotoManda;
        var v = ganaR ? nR[k] : nL[k];
        if (v === undefined && !(ganaR ? hR : hL)) v = ganaR ? nL[k] : nR[k];
        if (v !== undefined && v !== null) res[k] = JSON.parse(JSON.stringify(v));
        var hMax = hL > hR ? hL : hR;
        if (hMax) sello[k] = hMax;
      }
      if (!junto.entreno) junto.entreno = {};
      junto.entreno.planificador = res;
      if (Object.keys(sello).length) junto.entreno.planificadorSello = sello;
    })();

    var selL = local.selloDia || {}, selR = remoto.selloDia || {}, kk;
    junto.selloDia = {};
    for (kk in selL) if (Object.prototype.hasOwnProperty.call(selL, kk)) junto.selloDia[kk] = selL[kk];
    for (kk in selR) if (Object.prototype.hasOwnProperty.call(selR, kk)) {
      if (!junto.selloDia[kk] || String(selR[kk]) > String(junto.selloDia[kk])) junto.selloDia[kk] = selR[kk];
    }

    /* De un día, la clave entera del lado que lo tocó más tarde. Una LISTA del
       día viaja entera —no se casan elemento a elemento—; un OBJETO conserva
       del otro lado las sub-claves que el ganador no tenga, igual que las tomas
       en `comido`. Si el ganador no tiene ese día, no se toca nada: su sello
       puede venir de haber cambiado otra cosa. */
    function diaDelQueMandaManda(junto, manda, otro, dia, clave, mandaSello) {
      var m = (manda[clave] || {})[dia], q = (otro[clave] || {})[dia];
      /* Vaciar un día deja el objeto a cero en vez de quitar la clave, según
         por dónde se haya vaciado. Las dos cosas quieren decir lo mismo: ahí
         no queda nada. */
      if (m && typeof m === "object" && !Array.isArray(m) && !Object.keys(m).length) m = undefined;
      if (m === undefined && q === undefined) return;
      /* QUE NO LO TENGA ES UN BORRADO, y es la mitad que faltaba. Fusionar
         sobre lo del otro arregla que vuelvan datos viejos, pero si el que
         manda BORRÓ ese día entero, él no tiene clave y el otro sí: fusionar
         le devolvía lo borrado otra vez. Es el fallo que nos ocupó la tarde,
         visto desde el otro lado. Sólo vale si ese día lleva SU sello: sin
         sello no tocó nada y no se le puede leer una intención. */
      if (m === undefined) {
        if (!mandaSello) return;
        if (junto[clave]) delete junto[clave][dia];
        return;
      }
      var unido;
      if (Array.isArray(m) || (m === undefined && Array.isArray(q))) {
        unido = JSON.parse(JSON.stringify(m !== undefined ? m : q));
        if (!unido.length) { if (junto[clave]) delete junto[clave][dia]; return; }
      } else {
        unido = JSON.parse(JSON.stringify(q || {}));
        Object.keys(m || {}).forEach(function (k) {
          unido[k] = JSON.parse(JSON.stringify(m[k]));
        });
        Object.keys(unido).forEach(function (k) {
          var v = unido[k];
          if (v === null || v === undefined) { delete unido[k]; return; }
          if (typeof v === "object" && !Object.keys(v).length) delete unido[k];
        });
        if (!Object.keys(unido).length) { if (junto[clave]) delete junto[clave][dia]; return; }
      }
      if (!junto[clave]) junto[clave] = {};
      junto[clave][dia] = unido;
    }

    function selloDe(est, dia) {
      var a = ((est.selloDia || {})[dia]) || "";
      var b = ((est.corregido || {})[dia]) || "";
      return a > b ? a : b;
    }
    var dias = {}, f, fuentes = [local.corregido || {}, remoto.corregido || {},
                                local.selloDia || {}, remoto.selloDia || {},
                                local.gastado || {}, remoto.gastado || {}];
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

      /* ── Y LO GASTADO DE LA DESPENSA VA CON ELLOS (7-oct-2026) ──────────
         `gastado` es la nota de lo que cada plato sacó de la despensa, y hasta
         hoy esta función NO LA NOMBRABA: la fusionaba la genérica, que es
         aditiva, así que BORRARLA NUNCA SE PROPAGABA. Con los guardados
         fallando —GitHub respondió 500—, el bucle que salía es éste:
         marcas el ✓ y descuenta; desmarcas y devuelve y borra la nota;
         recargas y GitHub te devuelve la nota, que allí seguía; vuelves a
         marcar y la app cree que ya estaba descontado y NO DESCUENTA; vuelves
         a desmarcar y devuelve otra vez. Cada vuelta, una ración de regalo.
         Medido por Carlos el 7-oct-2026: el solomillo pasó de 2 a 4 a 6
         raciones y los yogures de 9 a 11 a 13, sin comprar nada.
         Es el mismo error que ya costó los días 21 y 22 con el plan y los ✓
         con lo comido: una lista que sólo sabe sumar. La cura es la misma —de
         un día manda entero el lado que lo tocó el último— y se escribe aquí
         al lado para que no se vuelva a olvidar una tercera vez. */
      /* ── Y LA FAMILIA ENTERA, NO DE UNA EN UNA (7-oct-2026) ─────────────
         Tres veces se ha perdido lo mismo y tres veces se arregló UNA clave:
         el plan y los ✓ en septiembre, `gastado` hoy. Así que esta vez se hizo
         el repaso completo de las 26 claves del estado contra lo que esta
         función nombra, y quedaban tres que viven POR DÍA, cuentan calorías y
         sólo pasaban por la fusión genérica —la que sólo sabe sumar—:

           · `fotos`  la foto de cada plato comido. Y desde que la foto puede
                      llevar el peso real de la carne, fusionarla campo a campo
                      podía dejar un plato con las calorías viejas Y el peso
                      nuevo: un número que no ha existido nunca.
           · `real`   lo que comiste de verdad cuando no fue lo previsto. Es
                      hermana de `gastado`: borrar una corrección no viajaba, y
                      la corrección fantasma vuelve a multiplicar el plato.
           · `comprado` lo ya comprado de cada día: desmarcar no viajaba.
           · `actividad` el ejercicio del día, que decide el objetivo de
                      calorías. Su lista no lleva id, así que la genérica
                      entregaba la lista ENTERA del lado que ganara por el
                      reloj global — exactamente el error que costó los días 21
                      y 22 de septiembre.

         Todas se resuelven igual que `comido`, y por eso van por una sola
         función: del día manda entero el lado que lo tocó más tarde, y lo que
         el ganador no tenga se conserva del otro lado. Si mañana aparece otra
         clave por día, se añade a la lista de abajo y ya está. */
      var selloDelQueManda = !!selloDe(manda, dia);
      diaDelQueMandaManda(junto, manda, otro, dia, "fotos", selloDelQueManda);
      diaDelQueMandaManda(junto, manda, otro, dia, "real", selloDelQueManda);
      diaDelQueMandaManda(junto, manda, otro, dia, "comprado", selloDelQueManda);
      diaDelQueMandaManda(junto, manda, otro, dia, "actividad", selloDelQueManda);
      diaDelQueMandaManda(junto, manda, otro, dia, "gastado", selloDelQueManda);

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

    /* Asidero de pruebas. La fusión es donde se han perdido datos tres veces
       —los días 21 y 22, los ✓ de lo comido, y el 25-sep lo apuntado en la
       despensa—, y no se puede comprobar desde fuera porque es privada. Esto
       la deja mirar sin tocar nada: no la usa la app. */
    _fusionarPrueba: function (remoto, sha) { return fusionarConRemoto(remoto, sha); },
    _codigoApp: function () { return codigoApp(); },

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
    /* ===== EL CATÁLOGO NO SUBE AQUÍ  ·  1-oct-2026 =====
       Lo que paró la app una tarde entera, y por un kilobyte.

       La API de GitHub sólo deja ESCRIBIR ficheros de hasta 1 MiB (1.048.576
       bytes). Medido el 1-oct: `estado.json` pesaba 1.049.769. Se pasaba por
       1.193 bytes. Leer no tiene tope, así que «Probar conexión» decía que todo
       iba bien y cada guardado fallaba con «No se pudo guardar». Cruzó la línea
       justo al cargar la compra de Mercadona, que metió 200 productos al stock.

       Y lo que lo engordaba no era nada suyo: el 79 % del fichero eran los
       `ingredientes` y las `recetas` del catálogo entero, QUE YA VIAJAN en los
       `datos/*.js` que se publican con el .bat. Se subía el catálogo dos veces.

       Así que aquí sube sólo lo SUYO: `novedades()` es exactamente lo que no
       venía en el catálogo o lo que él ha corregido — la misma cuenta que usa
       `datos/nuevos.js`. El estado pasa de 1.025 KB a unos 220: la quinta parte
       del tope, con sitio para años.

       POR QUÉ ES SEGURO PODARLO: al bajar, `fusionarListas` une por `id` y es
       aditiva, así que una lista corta nunca borra la larga del otro lado. Y en
       un aparato nuevo, el bloque de ALTAS de `almacen.js` completa el catálogo
       desde los ficheros publicados. Lo suyo viaja; lo que es igual en todas
       partes, no. */
    paquete: function () {
      var copia = JSON.parse(JSON.stringify(Almacen.estado));
      if (copia.config && copia.config.github) copia.config.github.token = "";
      delete copia.sync;
      copia.codigo = codigoApp();      /* qué versión de la app lo guardó (v395) */
      try {
        var mio = Almacen.novedades ? Almacen.novedades() : null;
        if (mio && mio.ingredientes && mio.recetas) {
          /* LO QUE VOLVIÓ A SER IGUAL QUE EL CATÁLOGO TAMBIÉN VIAJA, SI LLEVA HORA
             (8-oct-2026). Carlos seguía viendo en el móvil la cabeza de lomo de
             1,14 kg cuando el ordenador ya la había corregido. El arreglo dejaba
             la ficha IGUAL que el catálogo, y lo igual al catálogo no se subía:
             el repositorio se quedaba con la copia vieja, la marca de «arreglo
             hecho» sí viajaba, y el móvil, al recibir la marca, ya no lo hacía
             él. La ficha buena nunca le llegaba. Ahora sube toda ficha con
             `tocado`, sea o no igual al catálogo: la hora es la que decide al
             juntar, y sin subirla no puede decidir nada. */
          var ya = {};
          mio.ingredientes.forEach(function (x) { ya["i" + x.id] = 1; });
          mio.recetas.forEach(function (x) { ya["r" + x.id] = 1; });
          (copia.ingredientes || []).forEach(function (x) {
            if (x && x.id && x.tocado && !ya["i" + x.id]) mio.ingredientes.push(x);
          });
          (copia.recetas || []).forEach(function (x) {
            if (x && x.id && x.tocado && !x.conj && !x.borrada && !ya["r" + x.id]) mio.recetas.push(x);
          });
          copia.ingredientes = mio.ingredientes;
          copia.recetas = mio.recetas;
          copia.catalogoFuera = 1;        /* marca: este paquete viene podado */
        }
      } catch (e) {
        /* si algo falla al podar, se sube entero: mejor grande que incompleto */
        if (global.console) global.console.warn("podar catalogo:", e);
      }
      return copia;
    },

    cargar: function () {
      var self = this;
      if (!this.configurado()) return Promise.resolve(false);
      this.indicar("Consultando…", "trabajando");
      return this.api("GET").then(function (r) {
        if (r.status === 404) { self.indicar("Repositorio vacío", ""); self.marcarAlDia(); return false; }
        if (!r.ok) throw new Error("GitHub respondió " + r.status);
        return r.json().then(function (j) {
          return contenidoDe(j).then(function (remoto) { return { j: j, remoto: remoto }; });
        }).then(function (par) {
          var j = par.j, remoto = par.remoto;
          if (remotoMasNuevo(remoto)) self.bloquearPorVersion(remoto.codigo);
          var antes = huella(Almacen.estado);
          var junto = fusionarConRemoto(remoto, j.sha);
          var despues = huella(junto);
          /* ya se ha juntado lo de GitHub con lo de aquí: desde ahora este
             aparato decide con el estado completo (lo mira el pase semanal) */
          self.alDiaEnSesion = true;

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
          if (huella(remoto) !== despues && !self.bloqueado) self.programarGuardado();

          self.marcarAlDia();
          return antes !== despues;
        });
      }).catch(function (e) {
        self.indicar("Sin conexión", "error");
        console.warn("Sync cargar:", e);
        return false;
      });
    },

    /* EL PASE ESPERA A LA SINCRONIZACIÓN (1-oct-2026). El historial del repo
       enseñó que un aparato que aún no había traído lo último dictó «Repetir,
       7 de 12» con las casillas a medias. Mientras esto no sea true en la
       sesión, el pase de Entrenamiento no decide; al ponerse, se le avisa. */
    alDiaEnSesion: false,
    marcarAlDia: function () {
      this.alDiaEnSesion = true;
      try { global.dispatchEvent(new Event("khb-sync-al-dia")); } catch (e) {}
    },

    /* ── UN APARATO CON LA APP VIEJA NO PUEDE PISAR GITHUB (4-oct-2026, v395) ──
       Carlos: «cuando pone guardado no debería poder cambiarse por una versión
       más antigua de un dispositivo, y sí cambiar esa versión vieja por la que
       tiene GitHub». La alubia volvió a Conserva porque un aparato con código
       anterior mezcló fichas al subir. Ahora cada subida dice qué versión la
       hizo; si GitHub la guardó una más nueva que la de este aparato, aquí se
       trae lo de GitHub y NO se sube nada hasta recargar la app. */
    bloqueado: false,
    bloquearPorVersion: function (codigoRemoto) {
      this.bloqueado = true;
      this.codigoRemoto = codigoRemoto;
      clearTimeout(this.temporizador);
      this.avisoVersion();
      /* se le pide al navegador la versión nueva y se recarga UNA vez */
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
          navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update(); });
        }
        var k = "khb-recarga-version-" + codigoRemoto;
        if (!sessionStorage.getItem(k)) {
          sessionStorage.setItem(k, "1");
          setTimeout(function () { location.reload(); }, 4000);
        }
      } catch (e) {}
    },
    avisoVersion: function () {
      var t = "App antigua en este aparato: recarga para guardar (GitHub tiene la v" + this.codigoRemoto + ")";
      this.indicar(t, "error");
      if (Util && Util.toast) Util.toast("Este aparato tiene una versi\u00f3n antigua: se ha tra\u00eddo lo de GitHub y no se sube nada hasta recargar.");
    },

    /* Guardar YA, esperando a que acabe lo que esté en marcha. Lo usa el botón
       «Confirmar cambios»: devuelve si quedó guardado en GitHub. */
    guardarYa: function () {
      var self = this;
      if (!this.configurado()) return Promise.resolve("local");
      if (this.bloqueado) { this.avisoVersion(); return Promise.resolve(false); }
      clearTimeout(this.temporizador);
      var esperas = 0;
      function intentar() {
        if (self.ocupado && esperas++ < 40) return new Promise(function (ok) { setTimeout(ok, 500); }).then(intentar);
        return self.guardar();
      }
      return intentar();
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
      if (this.bloqueado) { this.avisoVersion(); return Promise.resolve(false); }
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
            return contenidoDe(j).then(function (remoto) { return { j: j, remoto: remoto }; });
          }).then(function (par) {
            if (remotoMasNuevo(par.remoto)) {
              /* lo de GitHub lo guardó una app más nueva: se trae, no se pisa */
              Almacen.reemplazar(fusionarConRemoto(par.remoto, par.j.sha));
              self.ocupado = false;
              self.bloquearPorVersion(par.remoto.codigo);
              return false;
            }
            var junto = fusionarConRemoto(par.remoto, par.j.sha);
            Almacen.reemplazar(junto);
            self.ocupado = false;
            self.indicar("Juntando con el otro aparato\u2026", "trabajando");
            return self.guardar();
          });
        }
        if (!r.ok) {
          return r.text().then(function (t) {
            var m = "";
            try { m = (JSON.parse(t) || {}).message || ""; } catch (e2) {}
            throw new Error(motivoHttp(r.status, m));
          });
        }
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
        var porque = (e && e.message) ? String(e.message) : "no s\u00e9 por qu\u00e9";
        /* el motivo se queda a la vista: el aviso se va solo, el indicador no */
        self.indicar("No se pudo guardar \u00b7 " + porque, "error");
        if (Util && Util.toast) Util.toast("No se pudo guardar: " + porque);
        try {
          Almacen.estado.sync = Almacen.estado.sync || {};
          Almacen.estado.sync.ultimoFallo = { f: new Date().toISOString(), porque: porque };
        } catch (e3) {}
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
