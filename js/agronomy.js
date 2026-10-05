/* AgroPiña Pro · Motor agronómico: fenología, rendimiento, carencias y riesgo climático */
(function (AP) {
  'use strict';
  const U = AP.utils, C = AP.catalog;
  const A = {};

  A.variedad = (key) => C.VARIEDADES[key] || C.VARIEDADES.Otra;

  /**
   * Estado fenológico de una parcela en una fecha dada.
   * Modelo: siembra/inicio de ciclo → inducción floral (real o estimada) → cosecha (inducción + días a cosecha).
   */
  A.estado = function (p, hoy) {
    hoy = hoy || U.today();
    const v = A.variedad(p.variedad);
    const ciclo = Number(p.ciclo) || 1;
    const esSoca = ciclo > 1;
    const inicio = p.fechaInicioCiclo || p.fechaSiembra || hoy;
    const diasInd = Number(p.diasInduccion) || (esSoca ? v.diasInduccionSoca : v.diasInduccion);
    const diasCos = v.diasCosecha;
    const dias = U.diffDays(hoy, inicio);
    const induccion = p.fechaInduccion && p.fechaInduccion >= inicio ? p.fechaInduccion : null;
    const induccionEst = induccion || U.addDays(inicio, diasInd);
    const cosechaEst = U.addDays(induccionEst, diasCos);
    const total = Math.max(1, U.diffDays(cosechaEst, inicio));
    const dpi = induccion ? U.diffDays(hoy, induccion) : null;

    let fase;
    if (p.estado === 'archivada') fase = 'archivada';
    else if (dias < 0) fase = 'planificada';
    else if (dpi === null || dpi < 0) {
      if (!esSoca && dias < 90) fase = 'establecimiento';
      else if (dias < diasInd - 30) fase = 'vegetativo';
      else fase = 'preinduccion';
    } else if (dpi < 60) fase = 'floracion';
    else if (dpi < diasCos - 25) fase = 'fruto';
    else if (dpi < diasCos - 5) fase = 'maduracion';
    else fase = 'cosecha';

    return {
      fase,
      faseInfo: C.FASES[fase],
      faseIndex: C.FASES_CICLO.indexOf(fase),
      dias: Math.max(0, dias),
      meses: Math.max(0, dias) / 30.4,
      ciclo, esSoca,
      etiquetaCiclo: esSoca ? 'Soca ' + (ciclo - 1) : 'Planta',
      inicio, induccion, induccionEst,
      induccionProgramada: !!induccion && dpi < 0,
      diasPostInduccion: dpi,
      diasParaInduccion: U.diffDays(induccionEst, hoy),
      induccionAtrasada: !induccion && dias > diasInd + 15 && fase === 'preinduccion',
      cosechaEst,
      diasParaCosecha: U.diffDays(cosechaEst, hoy),
      ventanaCosecha: [U.addDays(cosechaEst, -7), U.addDays(cosechaEst, 14)],
      progreso: U.clamp((Math.max(0, dias) / total) * 100, 0, 100),
      duracionCiclo: total
    };
  };

  /** Estimación de producción: plantas × aprovechamiento × peso de fruto */
  A.produccion = function (p) {
    const v = A.variedad(p.variedad);
    const ha = Number(p.hectareas) || 0;
    const esSoca = (Number(p.ciclo) || 1) > 1;
    const densidad = Number(p.densidad) || v.densidad;
    const plantas = densidad * ha;
    const aprov = (Number(p.aprovechamiento) || (esSoca ? 80 : 90)) / 100;
    const peso = Number(p.pesoFruto) || v.pesoFruto * (esSoca ? 0.85 : 1);
    const frutas = plantas * aprov;
    const toneladas = (frutas * peso) / 1000;
    return { densidad, plantas, frutas, peso, aprovechamiento: aprov * 100, toneladas, tHa: ha ? toneladas / ha : 0, cajas: (toneladas * 1000) / C.KG_POR_CAJA };
  };

  /** Períodos de carencia (PHI) vigentes por parcela según aplicaciones realizadas */
  A.carencias = function (labores, insumos, hoy) {
    hoy = hoy || U.today();
    const byId = {};
    (insumos || []).forEach((i) => { byId[i.id] = i; });
    const out = {};
    (labores || []).forEach((l) => {
      if (l.estado !== 'completada' || !l.insumos) return;
      l.insumos.forEach((li) => {
        const ins = byId[li.insumoId];
        const dias = Number(li.carencia != null ? li.carencia : ins && ins.carencia) || 0;
        if (!dias) return;
        const hasta = U.addDays(l.fecha, dias);
        if (hasta <= hoy) return;
        const cur = out[l.parcelaId];
        if (!cur || hasta > cur.hasta) out[l.parcelaId] = { hasta, producto: (ins && ins.nombre) || li.nombre || 'Producto', dias: U.diffDays(hasta, hoy) };
      });
    });
    return out;
  };

  /* ------------------------------ Clima ------------------------------ */
  const futuros = (w) => (w ? w.daily.filter((d) => !d.pasado) : []);
  const dia = (fecha) => U.fmtDate(fecha, 'day');

  /** Evalúa cada hora para aplicaciones fitosanitarias (viento, lluvia, temperatura, humedad) */
  A.ventanasAplicacion = function (hourly) {
    const horas = (hourly || []).map((h, i) => {
      const next = hourly.slice(i + 1, i + 4);
      const lluviaProx = U.sum(next, (x) => x.lluvia);
      const probProx = Math.max(h.prob || 0, ...next.map((x) => x.prob || 0));
      let nivel = 2, motivo = 'Óptima';
      const bad = (m) => { nivel = 0; motivo = m; };
      const meh = (m) => { if (nivel === 2) { nivel = 1; motivo = m; } };
      if (h.hora < 6 || h.hora > 18) bad('Noche');
      else if ((h.lluvia || 0) > 0.1 || lluviaProx > 0.3) bad('Lluvia');
      else if (h.viento > 15) bad('Viento fuerte');
      else if (h.temp > 32) bad('Calor');
      else if (probProx >= 50) bad('Prob. de lluvia');
      if (nivel > 0) {
        if (probProx >= 25) meh('Prob. de lluvia');
        else if (h.viento > 10) meh('Viento moderado');
        else if (h.viento < 3) meh('Calma (inversión)');
        else if (h.temp > 29) meh('Temperatura alta');
        else if (h.rh < 50) meh('Humedad baja');
      }
      return Object.assign({}, h, { nivel, motivo });
    });
    const ventanas = [];
    let cur = null;
    horas.forEach((e) => {
      if (e.nivel > 0) {
        if (cur && cur.dia === e.dia && cur.ultimaHora === e.hora - 1) { cur.fin = e.t; cur.ultimaHora = e.hora; cur.horas++; cur.optimas += e.nivel === 2 ? 1 : 0; }
        else { cur = { dia: e.dia, inicio: e.t, fin: e.t, ultimaHora: e.hora, horas: 1, optimas: e.nivel === 2 ? 1 : 0 }; ventanas.push(cur); }
      } else cur = null;
    });
    ventanas.forEach((w) => { w.calidad = w.optimas >= Math.ceil(w.horas / 2) ? 'óptima' : 'aceptable'; w.finHora = w.ultimaHora + 1; });
    return { horas, ventanas: ventanas.filter((w) => w.horas >= 2) };
  };

  /** Mejor ventana nocturna para inducción floral (fresco y sin lluvia en las 6 h siguientes) */
  A.ventanaInduccion = function (hourly) {
    const hs = hourly || [];
    for (let i = 0; i < hs.length; i++) {
      const h = hs[i];
      if (!(h.hora >= 19 || h.hora <= 4)) continue;
      const next = hs.slice(i, i + 6);
      if (next.length < 3) break;
      if (U.sum(next, (x) => x.lluvia) < 0.3 && Math.max(...next.map((x) => x.prob || 0)) < 35) {
        return U.fmtDate(h.dia, 'day') + ', ' + String(h.hora).padStart(2, '0') + ':00';
      }
    }
    return null;
  };

  A.balanceHidrico = (w) => (w ? w.daily.map((d) => ({ fecha: d.fecha, lluvia: d.lluvia || 0, et0: d.et0 || 0, balance: (d.lluvia || 0) - (d.et0 || 0), pasado: d.pasado })) : []);

  /** Alertas agroclimáticas a nivel finca */
  A.alertasClima = function (w, umbral) {
    if (!w) return [];
    umbral = Number(umbral) || 20;
    const out = [];
    const fut = futuros(w);
    const fuerte = fut.find((d) => d.lluvia >= umbral);
    if (fuerte) out.push({ nivel: 'alto', icono: 'fa-cloud-showers-heavy', titulo: 'Lluvia intensa ' + U.fmtRel(fuerte.fecha, w.hoy), texto: U.fmtNum(fuerte.lluvia, 1) + ' mm previstos el ' + dia(fuerte.fecha) + '. Revise drenajes y posponga fertilizaciones y aplicaciones foliares.' });
    let max3 = 0, max3i = 0;
    for (let i = 0; i < fut.length - 2; i++) { const s = U.sum(fut.slice(i, i + 3), (d) => d.lluvia); if (s > max3) { max3 = s; max3i = i; } }
    if (max3 >= 60) out.push({ nivel: 'alto', icono: 'fa-virus', titulo: 'Riesgo de Phytophthora', texto: U.fmtNum(max3) + ' mm acumulados en 3 días desde el ' + dia(fut[max3i].fecha) + '. Suelos saturados favorecen la pudrición del cogollo: refuerce drenaje y monitoreo.' });
    const ventoso = fut.reduce((m, d) => (d.vientoMax > (m ? m.vientoMax : 0) ? d : m), null);
    if (ventoso && ventoso.vientoMax >= 35) out.push({ nivel: 'medio', icono: 'fa-wind', titulo: 'Vientos fuertes', texto: 'Ráfagas de hasta ' + U.fmtNum(ventoso.vientoMax) + ' km/h el ' + dia(ventoso.fecha) + '. Alto riesgo de deriva: no aplique agroquímicos.' });
    const calor = fut.find((d) => d.tmax >= 33);
    if (calor) out.push({ nivel: 'medio', icono: 'fa-temperature-high', titulo: 'Riesgo de golpe de sol', texto: 'Máxima de ' + U.fmtNum(calor.tmax) + ' °C el ' + dia(calor.fecha) + '. Proteja la fruta en desarrollo (caolín, encalado o cobertura).' });
    const balFut = U.sum(fut, (d) => (d.lluvia || 0) - (d.et0 || 0));
    if (balFut < -20) out.push({ nivel: 'medio', icono: 'fa-droplet-slash', titulo: 'Déficit hídrico', texto: 'Balance de ' + U.fmtNum(balFut) + ' mm en los próximos días. Evalúe riego en lotes en establecimiento y en inducción.' });
    if (!out.length) out.push({ nivel: 'bajo', icono: 'fa-circle-check', titulo: 'Condiciones favorables', texto: 'Pronóstico estable para los próximos días. Buen momento para las labores planificadas.' });
    return out;
  };

  /** Recomendaciones accionables por parcela según fase, clima, carencias, labores y sanidad */
  A.recomendaciones = function (p, est, ctx) {
    ctx = ctx || {};
    const out = [];
    const w = ctx.clima;
    const fut = futuros(w);
    const umbral = Number(ctx.umbral) || 20;
    const fuertes = fut.filter((d) => d.lluvia >= umbral);
    const secos = fut.filter((d) => d.lluvia < 5);
    const calor = fut.find((d) => d.tmax >= 33);
    const add = (nivel, icono, titulo, texto) => out.push({ nivel, icono, titulo, texto, parcelaId: p.id, parcela: p.nombre });

    switch (est.fase) {
      case 'preinduccion':
        if (est.induccionAtrasada) add('alto', 'fa-wand-magic-sparkles', 'Inducción atrasada', 'La planta tiene ' + U.fmtNum(est.meses, 1) + ' meses. Programe el forzamiento floral para evitar floración natural desuniforme.');
        else add('medio', 'fa-wand-magic-sparkles', 'Lista para inducción', 'Fecha sugerida: ' + U.fmtDate(est.induccionEst) + '. ' + (ctx.ventanaInduccion ? 'Mejor ventana nocturna: ' + ctx.ventanaInduccion + '.' : 'Aplique de noche o de madrugada, sin lluvia en las 6 h siguientes.'));
        break;
      case 'maduracion':
      case 'cosecha':
        if (ctx.carencia) add('alto', 'fa-shield-halved', 'Período de carencia activo', 'No cosechar antes del ' + U.fmtDate(ctx.carencia.hasta) + ' (' + ctx.carencia.producto + ').');
        if (fuertes.length) add('alto', 'fa-cloud-showers-heavy', 'Adelantar cosecha', 'Lluvia fuerte el ' + dia(fuertes[0].fecha) + ': puede bajar los °Brix y la calidad. Coseche antes si la madurez lo permite.');
        else if (secos.length >= 3) add('bajo', 'fa-basket-shopping', est.fase === 'cosecha' ? 'Ventana de cosecha óptima' : 'Prepare la cosecha', 'Días secos: ' + secos.slice(0, 3).map((d) => dia(d.fecha)).join(', ') + '. ' + (est.fase === 'maduracion' ? 'Cosecha estimada ' + U.fmtRel(est.cosechaEst) + '.' : 'Clima ideal para el corte y la poscosecha.'));
        else if (w) add('medio', 'fa-cloud-sun-rain', 'Clima variable', 'Evalúe la madurez (color de cáscara y °Brix) y la humedad del suelo antes del corte.');
        break;
      case 'floracion':
      case 'fruto':
        if (calor && est.fase === 'fruto') add('medio', 'fa-temperature-high', 'Proteger la fruta del sol', 'Máxima de ' + U.fmtNum(calor.tmax) + ' °C el ' + dia(calor.fecha) + '. Aplique protector solar (caolín) o cobertura.');
        if (fuertes.length) add('medio', 'fa-droplet', 'Vigilar pudriciones', 'Lluvia intensa el ' + dia(fuertes[0].fecha) + '. Monitoree Phytophthora y Erwinia en corona y fruto.');
        break;
      case 'establecimiento':
      case 'vegetativo':
        if (fuertes.length) add(est.fase === 'establecimiento' ? 'alto' : 'medio', 'fa-water', 'Riesgo de encharcamiento', 'Lluvia fuerte el ' + dia(fuertes[0].fecha) + '. ' + (est.fase === 'establecimiento' ? 'No siembre ni fertilice; asegure los drenajes.' : 'Posponga la fertilización foliar y revise los drenajes.'));
        else if (ctx.deficit && est.fase === 'establecimiento') add('medio', 'fa-droplet', 'Riego recomendado', 'Balance hídrico negativo: las plantas recién establecidas son sensibles al estrés.');
        break;
      default:
    }
    if (ctx.vencidas) add('medio', 'fa-clock', 'Labores atrasadas', ctx.vencidas + ' labor(es) programada(s) con fecha vencida.');
    if (est.fase !== 'planificada' && est.fase !== 'archivada') {
      if (ctx.ultimoMonitoreo && ctx.ultimoMonitoreo.severidad >= 4) add('alto', 'fa-bug', 'Presión sanitaria alta', C.plaga(ctx.ultimoMonitoreo.plaga).nombre + ': severidad ' + C.SEVERIDAD[ctx.ultimoMonitoreo.severidad].label.toLowerCase() + ' (' + U.fmtRel(ctx.ultimoMonitoreo.fecha) + '). Defina una acción de control.');
      if (!ctx.ultimoMonitoreo) add('info', 'fa-magnifying-glass', 'Sin monitoreo fitosanitario', 'Registre el primer muestreo de plagas y enfermedades de esta parcela.');
      else if (ctx.diasSinMonitoreo > 21) add('info', 'fa-magnifying-glass', 'Monitoreo pendiente', 'Último muestreo hace ' + ctx.diasSinMonitoreo + ' días. Se recomienda cada 2–3 semanas.');
    }
    return out;
  };

  A.ordenarNivel = (a, b) => C.NIVELES[a.nivel].orden - C.NIVELES[b.nivel].orden;

  AP.agro = A;
})(typeof window !== 'undefined' ? (window.AP = window.AP || {}) : (globalThis.AP = globalThis.AP || {}));
