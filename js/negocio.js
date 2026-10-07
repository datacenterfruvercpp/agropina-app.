/* AgroPiña Enterprise · Lógica de negocio ERP (funciones puras, probadas en tests/negocio.test.js)
   Planilla de jornales, cuentas por cobrar, presupuesto vs real, órdenes de compra, kardex y consolidado de fincas. */
(function (AP) {
  'use strict';
  const U = AP.utils, A = AP.agro;
  const B = {};

  /* ------------------------------ Órdenes de trabajo ------------------------------ */
  B.ESTADOS_LABOR = {
    pendiente: { label: 'Programada', st: 'st-info', icon: 'fa-clock' },
    en_proceso: { label: 'En proceso', st: 'st-warn', icon: 'fa-person-digging' },
    completada: { label: 'Realizada', st: 'st-ok', icon: 'fa-check' },
    cancelada: { label: 'Cancelada', st: 'st-neutral', icon: 'fa-ban' }
  };
  B.PRIORIDADES = {
    alta: { label: 'Alta', st: 'st-err', orden: 0 },
    media: { label: 'Media', st: 'st-warn', orden: 1 },
    baja: { label: 'Baja', st: 'st-neutral', orden: 2 }
  };
  B.abierta = (l) => l.estado === 'pendiente' || l.estado === 'en_proceso';

  /* ------------------------------ Planilla de jornales ------------------------------ */
  /** Resumen por trabajador de las labores realizadas en [desde, hasta] (fechas ISO inclusivas). */
  B.planilla = function (labores, trabajadores, desde, hasta) {
    const byId = {};
    (trabajadores || []).forEach((t) => { byId[t.id] = t; });
    const filas = {};
    let sinAsignar = 0, sinAsignarJornales = 0;
    (labores || []).forEach((l) => {
      if (l.estado !== 'completada' || l.fecha < desde || l.fecha > hasta) return;
      const asig = (l.trabajadores || []).filter((x) => x.trabajadorId && x.jornales > 0);
      if (!asig.length) { sinAsignar += l.costoManoObra || 0; sinAsignarJornales += l.jornales || 0; return; }
      asig.forEach((x) => {
        const t = byId[x.trabajadorId];
        const f = filas[x.trabajadorId] || (filas[x.trabajadorId] = {
          trabajadorId: x.trabajadorId, nombre: t ? t.nombre : (x.nombre || 'Trabajador eliminado'),
          cuadrilla: t ? t.cuadrilla : '', jornales: 0, monto: 0, labores: 0, dias: {}
        });
        const tarifa = x.tarifa != null ? x.tarifa : (t ? t.tarifaJornal : 0);
        f.jornales += x.jornales;
        f.monto += x.jornales * tarifa;
        f.labores += 1;
        f.dias[l.fecha] = true;
      });
    });
    const lista = Object.values(filas).map((f) => Object.assign(f, { dias: Object.keys(f.dias).length, jornales: U.round(f.jornales, 2), monto: U.round(f.monto, 2) }))
      .sort((a, b) => b.monto - a.monto);
    return {
      filas: lista,
      totalJornales: U.round(U.sum(lista, (f) => f.jornales), 2),
      totalMonto: U.round(U.sum(lista, (f) => f.monto), 2),
      sinAsignar: U.round(sinAsignar, 2),
      sinAsignarJornales: U.round(sinAsignarJornales, 2)
    };
  };

  /** Periodo de planilla que contiene la fecha: semana (lun–dom), quincena (1–15 / 16–fin) o mes. */
  B.periodo = function (tipo, fecha) {
    const d = U.parseDate(fecha);
    if (tipo === 'semana') {
      const offset = (d.getDay() + 6) % 7;
      const desde = U.addDays(fecha, -offset);
      return { desde, hasta: U.addDays(desde, 6) };
    }
    const y = d.getFullYear(), m = d.getMonth();
    const fin = U.toISO(new Date(y, m + 1, 0));
    const ini = U.toISO(new Date(y, m, 1));
    if (tipo === 'quincena') return d.getDate() <= 15 ? { desde: ini, hasta: U.toISO(new Date(y, m, 15)) } : { desde: U.toISO(new Date(y, m, 16)), hasta: fin };
    return { desde: ini, hasta: fin };
  };

  /* ------------------------------ Cuentas por cobrar ------------------------------ */
  B.TRAMOS = ['Al día', '1–30 días', '31–60 días', '61–90 días', 'Más de 90 días'];
  B.tramo = (diasVencido) => (diasVencido <= 0 ? 0 : diasVencido <= 30 ? 1 : diasVencido <= 60 ? 2 : diasVencido <= 90 ? 3 : 4);

  /** Cosechas pendientes de cobro con vencimiento y antigüedad. */
  B.cuentasPorCobrar = function (cosechas, clientes, hoy) {
    const byId = {};
    (clientes || []).forEach((c) => { byId[c.id] = c; });
    return (cosechas || []).filter((c) => c.estadoPago === 'pendiente' && c.toneladas * c.precio > 0).map((c) => {
      const cli = byId[c.clienteId];
      const dias = cli ? cli.diasCredito : 30;
      const vence = U.addDays(c.fecha, dias);
      const diasVencido = U.diffDays(hoy, vence);
      return {
        cosechaId: c.id, clienteId: c.clienteId || '', cliente: cli ? cli.nombre : (c.comprador || 'Sin cliente'),
        fecha: c.fecha, vence, diasVencido, tramo: B.tramo(diasVencido), monto: U.round(c.toneladas * c.precio, 2),
        parcelaId: c.parcelaId, documento: c.factura || ''
      };
    }).sort((a, b) => b.diasVencido - a.diasVencido);
  };

  /** Totales por tramo de antigüedad. */
  B.antiguedad = function (cxc) {
    const t = B.TRAMOS.map((label) => ({ label, monto: 0, n: 0 }));
    (cxc || []).forEach((x) => { t[x.tramo].monto += x.monto; t[x.tramo].n++; });
    return t;
  };

  /* ------------------------------ Presupuesto vs real ------------------------------ */
  B.CATEGORIAS = [
    { key: 'manoObra', label: 'Mano de obra' },
    { key: 'insumos', label: 'Insumos' },
    { key: 'otros', label: 'Otros' }
  ];

  /**
   * Compara el presupuesto del ciclo actual de cada parcela con el costo real.
   * «Esperado a la fecha» = presupuesto × avance del ciclo, para no alarmar al inicio del ciclo.
   */
  B.presupuestoVsReal = function (parcelas, labores, presupuestoDefecto, hoy) {
    return (parcelas || []).filter((p) => p.estado !== 'archivada').map((p) => {
      const e = A.estado(p, hoy);
      const base = p.presupuestoHa || presupuestoDefecto || {};
      const ha = Number(p.hectareas) || 0;
      const presu = {}, real = { manoObra: 0, insumos: 0, otros: 0 };
      B.CATEGORIAS.forEach((c) => { presu[c.key] = U.round((Number(base[c.key]) || 0) * ha, 2); });
      (labores || []).forEach((l) => {
        if (l.parcelaId !== p.id || l.estado !== 'completada' || l.fecha < p.fechaInicioCiclo) return;
        real.manoObra += l.costoManoObra || 0; real.insumos += l.costoInsumos || 0; real.otros += l.otrosCostos || 0;
      });
      const totalPresu = U.sum(Object.values(presu));
      const totalReal = U.round(U.sum(Object.values(real)), 2);
      const avance = e.progreso / 100;
      const esperado = totalPresu * avance;
      const ejecucion = totalPresu ? (totalReal / totalPresu) * 100 : null;
      const desvio = esperado ? ((totalReal - esperado) / esperado) * 100 : null;
      const estado = desvio == null ? 'st-neutral' : desvio > 20 ? 'st-err' : desvio > 5 ? 'st-warn' : 'st-ok';
      return { parcela: p, avance: e.progreso, presu, real, totalPresu, totalReal, esperado: U.round(esperado, 2), ejecucion, desvio, estado };
    });
  };

  /* ------------------------------ Compras ------------------------------ */
  B.ESTADOS_OC = {
    borrador: { label: 'Borrador', st: 'st-neutral' },
    aprobada: { label: 'Aprobada', st: 'st-info' },
    recibida: { label: 'Recibida', st: 'st-ok' },
    cancelada: { label: 'Cancelada', st: 'st-err' }
  };
  B.totalOrden = (o) => U.round(U.sum(o.lineas || [], (l) => (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0)), 2);
  B.siguienteNumero = function (ordenes, prefijo) {
    const max = Math.max(0, ...(ordenes || []).map((o) => parseInt(String(o.numero || '').replace(/\D/g, ''), 10) || 0));
    return (prefijo || 'OC-') + String(max + 1).padStart(4, '0');
  };

  /* ------------------------------ Kardex ------------------------------ */
  /** Movimientos de un insumo en orden cronológico con saldo acumulado. */
  B.kardex = function (movimientos, insumoId) {
    let saldo = 0;
    return (movimientos || []).filter((m) => m.insumoId === insumoId)
      .map((m, i) => ({ m, i }))
      .sort((a, b) => (a.m.fecha < b.m.fecha ? -1 : a.m.fecha > b.m.fecha ? 1 : a.i - b.i))
      .map(({ m }) => {
        const delta = m.tipo === 'salida' ? -m.cantidad : m.cantidad;
        saldo = U.round(saldo + delta, 3);
        return Object.assign({}, m, { delta, saldo });
      });
  };

  /* ------------------------------ Consolidado de fincas ------------------------------ */
  /** Indicadores de una finca a partir de sus datos guardados (activa o no). */
  B.resumenFinca = function (datos, hoy) {
    const parcelas = (datos.parcelas || []).filter((p) => p.estado !== 'archivada');
    const labores = datos.labores || [];
    const cosechas = datos.cosechas || [];
    const prod = parcelas.map((p) => A.produccion(p));
    const ests = parcelas.map((p) => A.estado(p, hoy));
    return {
      nombre: (datos.settings && datos.settings.finca) || 'Finca',
      moneda: (datos.settings && datos.settings.moneda) || 'USD',
      parcelas: parcelas.length,
      hectareas: U.round(U.sum(parcelas, (p) => p.hectareas), 2),
      produccionEstimada: U.round(U.sum(prod, (x) => x.toneladas), 1),
      produccion90: U.round(U.sum(prod.filter((x, i) => ests[i].diasParaCosecha <= 90 && ests[i].fase !== 'planificada'), (x) => x.toneladas), 1),
      costos: U.round(U.sum(labores.filter((l) => l.estado === 'completada'), (l) => l.costoTotal), 2),
      ingresos: U.round(U.sum(cosechas, (c) => c.toneladas * c.precio), 2),
      toneladas: U.round(U.sum(cosechas, (c) => c.toneladas), 1),
      laboresAbiertas: labores.filter(B.abierta).length,
      inventario: U.round(U.sum(datos.insumos || [], (i) => Math.max(0, i.stock) * i.costoUnitario), 2)
    };
  };

  AP.negocio = B;
})(typeof window !== 'undefined' ? (window.AP = window.AP || {}) : (globalThis.AP = globalThis.AP || {}));
