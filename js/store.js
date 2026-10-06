/* AgroPiña Pro · Estado global, persistencia, migraciones y reglas de negocio */
(function (AP) {
  'use strict';
  const { reactive, computed, watch } = Vue;
  const U = AP.utils, C = AP.catalog, A = AP.agro, W = AP.weather;

  const KEY = 'agropina_v2';
  const VERSION = 2;
  const COLLECTIONS = ['parcelas', 'labores', 'insumos', 'cosechas', 'monitoreos', 'movimientos'];
  const num = (v, def = 0) => { const n = Number(v); return isFinite(n) && v !== '' && v != null ? n : def; };
  const numOrNull = (v) => (v === '' || v == null || !isFinite(Number(v)) ? null : Number(v));
  const str = (v) => (v == null ? '' : String(v).trim());

  const defaultSettings = () => ({
    finca: 'Mi Finca', propietario: '', moneda: 'USD', tema: 'system', umbralLluvia: 20,
    precioReferencia: 280, ubicacion: null, onboarded: false
  });

  /* ---------------------------- Normalizadores ---------------------------- */
  const N = {
    parcela: (p, i) => ({
      id: str(p.id) || U.uid(),
      nombre: str(p.nombre) || 'Parcela',
      codigo: str(p.codigo),
      variedad: C.VARIEDADES[p.variedad] ? p.variedad : 'Otra',
      hectareas: U.round(num(p.hectareas), 2),
      densidad: numOrNull(p.densidad),
      pesoFruto: numOrNull(p.pesoFruto),
      aprovechamiento: numOrNull(p.aprovechamiento),
      fechaSiembra: p.fechaSiembra || U.today(),
      fechaInicioCiclo: p.fechaInicioCiclo || p.fechaSiembra || U.today(),
      fechaInduccion: p.fechaInduccion || null,
      ciclo: Math.max(1, num(p.ciclo, 1)),
      estado: p.estado === 'archivada' ? 'archivada' : 'activa',
      color: p.color || C.COLORES_PARCELA[(i || 0) % C.COLORES_PARCELA.length],
      lat: numOrNull(p.lat), lon: numOrNull(p.lon),
      poligono: Array.isArray(p.poligono) ? p.poligono.filter((x) => Array.isArray(x) && x.length === 2) : [],
      notas: str(p.notas),
      createdAt: p.createdAt || new Date().toISOString()
    }),
    labor: (l) => ({
      id: str(l.id) || U.uid(),
      parcelaId: str(l.parcelaId),
      tipo: C.LABOR_ALIAS[l.tipo] || (C.LABORES[l.tipo] ? l.tipo : 'Otro'),
      fecha: l.fecha || U.today(),
      estado: l.estado === 'pendiente' ? 'pendiente' : 'completada',
      descripcion: str(l.descripcion),
      responsable: str(l.responsable),
      jornales: num(l.jornales),
      costoManoObra: num(l.costoManoObra),
      otrosCostos: num(l.otrosCostos),
      insumos: (l.insumos || []).map((li) => ({
        insumoId: str(li.insumoId), cantidad: num(li.cantidad), dosisHa: numOrNull(li.dosisHa),
        costoUnitario: numOrNull(li.costoUnitario), nombre: str(li.nombre), unidad: str(li.unidad), carencia: numOrNull(li.carencia)
      })),
      costoInsumos: num(l.costoInsumos),
      costoTotal: num(l.costoTotal),
      stockAplicado: !!l.stockAplicado,
      createdAt: l.createdAt || new Date().toISOString()
    }),
    insumo: (i) => ({
      id: str(i.id) || U.uid(), nombre: str(i.nombre) || 'Insumo',
      categoria: C.CATEGORIAS_INSUMO[i.categoria] ? i.categoria : 'Otro',
      unidad: str(i.unidad) || 'kg', stock: U.round(num(i.stock), 3), stockMinimo: num(i.stockMinimo),
      costoUnitario: num(i.costoUnitario), carencia: num(i.carencia), ingredienteActivo: str(i.ingredienteActivo),
      proveedor: str(i.proveedor), notas: str(i.notas), createdAt: i.createdAt || new Date().toISOString()
    }),
    cosecha: (c) => ({
      id: str(c.id) || U.uid(), parcelaId: str(c.parcelaId), fecha: c.fecha || U.today(),
      toneladas: num(c.toneladas), cajas: numOrNull(c.cajas), exportable: numOrNull(c.exportable), brix: numOrNull(c.brix),
      precio: num(c.precio), destino: C.DESTINOS[c.destino] ? c.destino : 'Exportación', comprador: str(c.comprador),
      notas: str(c.notas), cierraCiclo: !!c.cierraCiclo, cicloCerrado: !!c.cicloCerrado, ciclo: numOrNull(c.ciclo),
      createdAt: c.createdAt || new Date().toISOString()
    }),
    monitoreo: (m) => ({
      id: str(m.id) || U.uid(), parcelaId: str(m.parcelaId), fecha: m.fecha || U.today(),
      plaga: C.PLAGAS.some((p) => p.key === m.plaga) ? m.plaga : 'otro', severidad: U.clamp(num(m.severidad, 1), 1, 5),
      incidencia: numOrNull(m.incidencia), muestras: numOrNull(m.muestras), accion: str(m.accion), notas: str(m.notas),
      createdAt: m.createdAt || new Date().toISOString()
    }),
    movimiento: (m) => ({
      id: str(m.id) || U.uid(), insumoId: str(m.insumoId), fecha: m.fecha || U.today(),
      tipo: ['entrada', 'salida', 'ajuste'].includes(m.tipo) ? m.tipo : 'entrada',
      cantidad: num(m.cantidad), costoUnitario: num(m.costoUnitario), referencia: str(m.referencia), nota: str(m.nota)
    })
  };
  const NORM = { parcelas: N.parcela, labores: N.labor, insumos: N.insumo, cosechas: N.cosecha, monitoreos: N.monitoreo, movimientos: N.movimiento };

  /* ------------------------------- Estado -------------------------------- */
  const state = reactive({
    settings: defaultSettings(),
    parcelas: [], labores: [], insumos: [], cosechas: [], monitoreos: [], movimientos: [],
    hoy: U.today(),
    isDark: false,
    weather: { status: 'idle', data: null, error: null, fetchedAt: null, stale: false, simulated: false },
    ui: { toasts: [], confirm: null, form: null, sheet: null }
  });

  /* ---------------------------- Persistencia ----------------------------- */
  function applyData(data) {
    state.settings = Object.assign(defaultSettings(), data.settings || {});
    COLLECTIONS.forEach((k) => { state[k] = (Array.isArray(data[k]) ? data[k] : []).map((x, i) => NORM[k](x, i)); });
  }
  function serialize() {
    const o = { app: 'AgroPiña Pro', version: VERSION, exportedAt: new Date().toISOString(), settings: state.settings };
    COLLECTIONS.forEach((k) => { o[k] = state[k]; });
    return o;
  }
  /** Convierte respaldos/datos de la versión 1 (parcelas + actividades) */
  function fromLegacy(d) {
    return {
      settings: d.settings || {},
      parcelas: d.parcelas || [],
      labores: (d.labores || d.actividades || []).map((a) => Object.assign({}, a, { estado: a.estado || 'completada', parcelaId: a.parcelaId != null ? String(a.parcelaId) : '' })),
      insumos: d.insumos, cosechas: d.cosechas, monitoreos: d.monitoreos, movimientos: d.movimientos
    };
  }
  function load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }
    if (!data) {
      try {
        const p = JSON.parse(localStorage.getItem('agropina_parcelas') || 'null');
        const a = JSON.parse(localStorage.getItem('agropina_actividades') || 'null');
        if (p || a) {
          data = fromLegacy({ parcelas: p || [], actividades: a || [], settings: { onboarded: true, tema: localStorage.getItem('agropina_theme') === 'dark' ? 'dark' : 'system' } });
          setTimeout(() => toast('Datos de la versión anterior migrados correctamente', 'success'), 600);
        }
      } catch (e) { data = null; }
    }
    if (data) applyData(data);
  }
  let saveError = false;
  const persist = U.debounce(() => {
    try { localStorage.setItem(KEY, JSON.stringify(serialize())); saveError = false; }
    catch (e) { if (!saveError) toast('No se pudo guardar: almacenamiento del navegador lleno o bloqueado', 'error'); saveError = true; }
  }, 200);

  /* ------------------------------ Tema ------------------------------ */
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    const t = state.settings.tema;
    const dark = t === 'dark' || (t === 'system' && !!(mq && mq.matches));
    state.isDark = dark;
    document.documentElement.classList.toggle('dark', dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b0f0d' : '#05603a');
  }

  /* ------------------------------ UI ------------------------------ */
  function toast(message, type = 'success', opts = {}) {
    const id = U.uid();
    state.ui.toasts.push({ id, message, type, action: opts.action || null });
    if (state.ui.toasts.length > 4) state.ui.toasts.shift();
    setTimeout(() => dismiss(id), opts.duration || (opts.action ? 6500 : 3200));
    return id;
  }
  function dismiss(id) { const i = state.ui.toasts.findIndex((t) => t.id === id); if (i >= 0) state.ui.toasts.splice(i, 1); }
  function confirm(opts) {
    return new Promise((resolve) => {
      state.ui.confirm = Object.assign({ title: '¿Confirmar?', message: '', confirmText: 'Confirmar', danger: false }, opts, {
        resolve: (v) => { state.ui.confirm = null; resolve(v); }
      });
    });
  }
  function openForm(type, data) { state.ui.sheet = null; state.ui.form = { type, data: data ? U.clone(data) : {}, key: U.uid() }; }
  function closeForm() { state.ui.form = null; }
  function withUndo(keys, fn, message) {
    const snap = {};
    keys.forEach((k) => { snap[k] = U.clone(state[k]); });
    fn();
    toast(message, 'info', { action: { label: 'Deshacer', fn: () => { keys.forEach((k) => { state[k] = snap[k]; }); toast('Acción deshecha', 'info'); } } });
  }

  /* ------------------------------ Consultas ------------------------------ */
  const byId = (k, id) => state[k].find((x) => x.id === id) || null;
  const parcela = (id) => byId('parcelas', id);
  const insumo = (id) => byId('insumos', id);
  const parcelaNombre = (id) => { const p = parcela(id); return p ? p.nombre : 'Parcela eliminada'; };

  function upsert(k, item) {
    const i = state[k].findIndex((x) => x.id === item.id);
    if (i >= 0) state[k].splice(i, 1, item); else state[k].push(item);
    return item;
  }

  /* ------------------------------ Parcelas ------------------------------ */
  function saveParcela(data) {
    const prev = data.id ? parcela(data.id) : null;
    const p = N.parcela(Object.assign({}, prev || {}, data), state.parcelas.length);
    if (!p.fechaInicioCiclo || p.ciclo === 1) p.fechaInicioCiclo = p.ciclo === 1 ? p.fechaSiembra : p.fechaInicioCiclo;
    upsert('parcelas', p);
    toast(prev ? 'Parcela actualizada' : 'Parcela «' + p.nombre + '» creada');
    return p;
  }
  async function deleteParcela(id) {
    const p = parcela(id); if (!p) return false;
    const n = state.labores.filter((l) => l.parcelaId === id).length + state.cosechas.filter((c) => c.parcelaId === id).length + state.monitoreos.filter((m) => m.parcelaId === id).length;
    const ok = await confirm({ title: 'Eliminar «' + p.nombre + '»', message: 'Se eliminará la parcela' + (n ? ' y sus ' + n + ' registros asociados (labores, cosechas y monitoreos)' : '') + '. Podrá deshacer la acción durante unos segundos.', confirmText: 'Eliminar', danger: true });
    if (!ok) return false;
    withUndo(['parcelas', 'labores', 'cosechas', 'monitoreos'], () => {
      state.parcelas = state.parcelas.filter((x) => x.id !== id);
      state.labores = state.labores.filter((x) => x.parcelaId !== id);
      state.cosechas = state.cosechas.filter((x) => x.parcelaId !== id);
      state.monitoreos = state.monitoreos.filter((x) => x.parcelaId !== id);
    }, 'Parcela eliminada');
    return true;
  }
  function toggleArchivo(id) {
    const p = parcela(id); if (!p) return;
    p.estado = p.estado === 'archivada' ? 'activa' : 'archivada';
    toast(p.estado === 'archivada' ? 'Parcela archivada' : 'Parcela reactivada');
  }

  /* ------------------------- Labores + inventario ------------------------- */
  function costear(l) {
    l.costoInsumos = U.round(U.sum(l.insumos, (li) => li.cantidad * (li.costoUnitario || 0)), 2);
    l.costoTotal = U.round(l.costoManoObra + l.costoInsumos + l.otrosCostos, 2);
    return l;
  }
  function moverStock(l, signo) {
    l.insumos.forEach((li) => {
      const ins = insumo(li.insumoId);
      if (ins) ins.stock = U.round(ins.stock + signo * li.cantidad, 3);
    });
    if (signo < 0) {
      l.insumos.forEach((li) => {
        if (!li.insumoId || !li.cantidad) return;
        state.movimientos.push(N.movimiento({ insumoId: li.insumoId, fecha: l.fecha, tipo: 'salida', cantidad: li.cantidad, costoUnitario: li.costoUnitario, referencia: l.id, nota: l.tipo + ' · ' + parcelaNombre(l.parcelaId) }));
      });
    } else {
      state.movimientos = state.movimientos.filter((m) => m.referencia !== l.id);
    }
  }
  function saveLabor(data, opts = {}) {
    const prev = data.id ? byId('labores', data.id) : null;
    if (prev && prev.stockAplicado) moverStock(prev, +1);
    const l = N.labor(data);
    l.insumos = l.insumos.filter((li) => li.insumoId && li.cantidad > 0).map((li) => {
      const ins = insumo(li.insumoId);
      return Object.assign(li, {
        nombre: ins ? ins.nombre : li.nombre,
        unidad: ins ? ins.unidad : li.unidad,
        carencia: ins ? ins.carencia : li.carencia,
        costoUnitario: li.costoUnitario != null ? li.costoUnitario : (ins ? ins.costoUnitario : 0)
      });
    });
    costear(l);
    l.stockAplicado = false;
    const faltantes = [];
    if (l.estado === 'completada') {
      l.insumos.forEach((li) => { const ins = insumo(li.insumoId); if (ins && ins.stock < li.cantidad) faltantes.push(ins.nombre); });
      moverStock(l, -1);
      l.stockAplicado = true;
    }
    upsert('labores', l);
    // La inducción floral completada fija la fecha de inducción del ciclo actual
    let extra = '';
    if (l.estado === 'completada' && l.tipo === 'Inducción floral') {
      const p = parcela(l.parcelaId);
      if (p && !p.fechaInduccion && l.fecha >= p.fechaInicioCiclo) { p.fechaInduccion = l.fecha; extra = ' · inducción registrada en la parcela'; }
    }
    if (!opts.silent) {
      toast((prev ? 'Labor actualizada' : l.estado === 'pendiente' ? 'Labor programada' : 'Labor registrada') + extra);
    }
    if (faltantes.length) toast('Stock insuficiente: ' + faltantes.join(', ') + '. Revise el inventario.', 'warning', { duration: 5000 });
    return l;
  }
  function completarLabor(id) {
    const l = byId('labores', id); if (!l) return;
    if (l.estado === 'completada') { saveLabor(Object.assign({}, l, { estado: 'pendiente' }), { silent: true }); toast('Labor marcada como pendiente', 'info'); return; }
    saveLabor(Object.assign({}, l, { estado: 'completada', fecha: l.fecha > state.hoy ? state.hoy : l.fecha }), { silent: true });
    toast('Labor completada' + (l.insumos.length ? ' · inventario actualizado' : ''));
  }
  function deleteLabor(id) {
    const l = byId('labores', id); if (!l) return;
    withUndo(['labores', 'insumos', 'movimientos'], () => {
      if (l.stockAplicado) moverStock(l, +1);
      state.labores = state.labores.filter((x) => x.id !== id);
    }, 'Labor eliminada' + (l.stockAplicado && l.insumos.length ? ' · stock devuelto' : ''));
  }

  /* ------------------------------ Insumos ------------------------------ */
  function saveInsumo(data) {
    const prev = data.id ? insumo(data.id) : null;
    const i = N.insumo(Object.assign({}, prev || {}, data));
    upsert('insumos', i);
    if (!prev && i.stock > 0) state.movimientos.push(N.movimiento({ insumoId: i.id, tipo: 'entrada', cantidad: i.stock, costoUnitario: i.costoUnitario, nota: 'Inventario inicial' }));
    toast(prev ? 'Insumo actualizado' : 'Insumo agregado al inventario');
    return i;
  }
  function deleteInsumo(id) {
    const i = insumo(id); if (!i) return;
    withUndo(['insumos', 'movimientos'], () => {
      state.insumos = state.insumos.filter((x) => x.id !== id);
      state.movimientos = state.movimientos.filter((m) => m.insumoId !== id);
    }, 'Insumo eliminado');
  }
  /** Entrada (compra) con costo promedio ponderado, o ajuste a un stock contado */
  function movimientoInsumo(data) {
    const i = insumo(data.insumoId); if (!i) return;
    const cant = num(data.cantidad);
    if (data.tipo === 'ajuste') {
      const diff = U.round(cant - i.stock, 3);
      i.stock = U.round(cant, 3);
      state.movimientos.push(N.movimiento({ insumoId: i.id, fecha: data.fecha, tipo: 'ajuste', cantidad: diff, costoUnitario: i.costoUnitario, nota: data.nota || 'Ajuste por conteo físico' }));
      toast('Stock ajustado a ' + U.fmtNum(i.stock, 2) + ' ' + i.unidad);
    } else {
      const cu = num(data.costoUnitario, i.costoUnitario);
      const base = Math.max(0, i.stock);
      i.costoUnitario = base + cant > 0 ? U.round((base * i.costoUnitario + cant * cu) / (base + cant), 4) : cu;
      i.stock = U.round(i.stock + cant, 3);
      state.movimientos.push(N.movimiento({ insumoId: i.id, fecha: data.fecha, tipo: 'entrada', cantidad: cant, costoUnitario: cu, nota: data.nota || 'Compra' }));
      toast('Entrada registrada: +' + U.fmtNum(cant, 2) + ' ' + i.unidad);
    }
  }

  /* ------------------------------ Cosechas ------------------------------ */
  function saveCosecha(data) {
    const prev = data.id ? byId('cosechas', data.id) : null;
    const c = N.cosecha(Object.assign({}, prev || {}, data));
    const p = parcela(c.parcelaId);
    if (!c.ciclo && p) c.ciclo = p.ciclo;
    let extra = '';
    if (c.cierraCiclo && !c.cicloCerrado && p) {
      p.ciclo += 1;
      p.fechaInicioCiclo = c.fecha;
      p.fechaInduccion = null;
      c.cicloCerrado = true;
      extra = ' · ciclo cerrado, inicia Soca ' + (p.ciclo - 1);
    }
    upsert('cosechas', c);
    toast((prev ? 'Cosecha actualizada' : 'Cosecha registrada') + extra);
    return c;
  }
  function deleteCosecha(id) {
    withUndo(['cosechas'], () => { state.cosechas = state.cosechas.filter((x) => x.id !== id); }, 'Cosecha eliminada');
  }

  /* ------------------------------ Monitoreo ------------------------------ */
  function saveMonitoreo(data) {
    const prev = data.id ? byId('monitoreos', data.id) : null;
    const m = N.monitoreo(Object.assign({}, prev || {}, data));
    upsert('monitoreos', m);
    toast(prev ? 'Monitoreo actualizado' : 'Monitoreo registrado');
    return m;
  }
  function deleteMonitoreo(id) {
    withUndo(['monitoreos'], () => { state.monitoreos = state.monitoreos.filter((x) => x.id !== id); }, 'Monitoreo eliminado');
  }

  /* ------------------------------ Derivados ------------------------------ */
  const estados = computed(() => { const o = {}; state.parcelas.forEach((p) => { o[p.id] = A.estado(p, state.hoy); }); return o; });
  const produccion = computed(() => { const o = {}; state.parcelas.forEach((p) => { o[p.id] = A.produccion(p); }); return o; });
  const activas = computed(() => state.parcelas.filter((p) => p.estado !== 'archivada'));
  const carencias = computed(() => A.carencias(state.labores, state.insumos, state.hoy));
  const costos = computed(() => {
    const o = {};
    state.labores.forEach((l) => {
      if (l.estado !== 'completada') return;
      const c = o[l.parcelaId] || (o[l.parcelaId] = { manoObra: 0, insumos: 0, otros: 0, total: 0, ciclo: 0 });
      c.manoObra += l.costoManoObra; c.insumos += l.costoInsumos; c.otros += l.otrosCostos; c.total += l.costoTotal;
      const p = parcela(l.parcelaId);
      if (p && l.fecha >= p.fechaInicioCiclo) c.ciclo += l.costoTotal;
    });
    return o;
  });
  const ingresos = computed(() => {
    const o = {};
    state.cosechas.forEach((c) => {
      const x = o[c.parcelaId] || (o[c.parcelaId] = { toneladas: 0, ingreso: 0, registros: 0 });
      x.toneladas += c.toneladas; x.ingreso += c.toneladas * c.precio; x.registros++;
    });
    return o;
  });
  const pendientes = computed(() => state.labores.filter((l) => l.estado === 'pendiente').sort((a, b) => (a.fecha < b.fecha ? -1 : 1)));
  const vencidas = computed(() => pendientes.value.filter((l) => l.fecha < state.hoy));
  const stockBajo = computed(() => state.insumos.filter((i) => i.stock <= 0 || (i.stockMinimo > 0 && i.stock <= i.stockMinimo)));
  const ultimoMonitoreo = computed(() => {
    const o = {};
    state.monitoreos.forEach((m) => { const cur = o[m.parcelaId]; if (!cur || m.fecha > cur.fecha || (m.fecha === cur.fecha && m.severidad > cur.severidad)) o[m.parcelaId] = m; });
    return o;
  });
  const alertasClima = computed(() => A.alertasClima(state.weather.data, state.settings.umbralLluvia));
  const ventanas = computed(() => (state.weather.data ? A.ventanasAplicacion(state.weather.data.hourly) : { horas: [], ventanas: [] }));
  const recomendaciones = computed(() => {
    const w = state.weather.data;
    const deficit = w ? U.sum(w.daily.filter((d) => !d.pasado), (d) => d.lluvia - d.et0) < -20 : false;
    const ventanaInduccion = w ? A.ventanaInduccion(w.hourly) : null;
    const vencPorParcela = U.groupBy(vencidas.value, (l) => l.parcelaId);
    const all = [];
    activas.value.forEach((p) => {
      const um = ultimoMonitoreo.value[p.id];
      all.push(...A.recomendaciones(p, estados.value[p.id], {
        clima: w, umbral: state.settings.umbralLluvia, carencia: carencias.value[p.id],
        vencidas: (vencPorParcela[p.id] || []).length, ultimoMonitoreo: um,
        diasSinMonitoreo: um ? U.diffDays(state.hoy, um.fecha) : null, deficit, ventanaInduccion
      }));
    });
    return all.sort(A.ordenarNivel);
  });
  const resumen = computed(() => {
    const act = activas.value;
    const proximas = act.map((p) => ({ p, e: estados.value[p.id], prod: produccion.value[p.id] })).filter((x) => x.e.diasParaCosecha <= 90 && x.e.fase !== 'planificada');
    return {
      parcelas: act.length,
      hectareas: U.sum(act, (p) => p.hectareas),
      plantas: U.sum(act, (p) => produccion.value[p.id].plantas),
      produccion90: U.sum(proximas, (x) => x.prod.toneladas),
      produccionTotal: U.sum(act, (p) => produccion.value[p.id].toneladas),
      proximaCosecha: act.map((p) => ({ p, e: estados.value[p.id] })).filter((x) => x.e.fase !== 'planificada').sort((a, b) => a.e.diasParaCosecha - b.e.diasParaCosecha)[0] || null,
      costoTotal: U.sum(Object.values(costos.value), (c) => c.total),
      ingresoTotal: U.sum(Object.values(ingresos.value), (c) => c.ingreso),
      valorInventario: U.sum(state.insumos, (i) => Math.max(0, i.stock) * i.costoUnitario)
    };
  });

  /* ------------------------------ Clima ------------------------------ */
  let geoTried = false;
  async function loadWeather(force) {
    if (state.weather.status === 'loading') return;
    state.weather.status = state.weather.data ? 'refreshing' : 'loading';
    let loc = state.settings.ubicacion;
    if (!loc && !geoTried && navigator.geolocation) {
      geoTried = true;
      const pos = await new Promise((res) => navigator.geolocation.getCurrentPosition(res, () => res(null), { timeout: 8000, maximumAge: 3600000 }));
      if (pos) { loc = { lat: U.round(pos.coords.latitude, 4), lon: U.round(pos.coords.longitude, 4), nombre: 'Ubicación GPS', fuente: 'gps' }; state.settings.ubicacion = loc; }
    }
    if (!loc) loc = C.UBICACION_DEFECTO;
    try {
      const r = await W.get(loc.lat, loc.lon, force);
      state.weather.data = W.parse(r.raw);
      state.weather.fetchedAt = r.fetchedAt;
      state.weather.stale = !!r.stale;
      state.weather.simulated = !!r.simulated;
      state.weather.error = r.error || null;
      state.weather.status = 'ready';
      if (force) toast(r.stale ? 'Sin conexión: mostrando el último pronóstico guardado' : 'Pronóstico actualizado', r.stale ? 'warning' : 'success');
    } catch (e) {
      state.weather.status = 'error';
      state.weather.error = e.message || 'No se pudo obtener el clima';
      if (force) toast(state.weather.error, 'error');
    }
  }
  const ubicacionActual = computed(() => state.settings.ubicacion || C.UBICACION_DEFECTO);

  /* --------------------------- Datos: import/export --------------------------- */
  function exportJSON() {
    U.download('agropina_respaldo_' + U.today() + '.json', JSON.stringify(serialize(), null, 2));
    toast('Respaldo descargado');
  }
  async function importJSON(file) {
    try {
      const data = JSON.parse(await U.readFile(file));
      if (!data || typeof data !== 'object' || !Array.isArray(data.parcelas)) throw new Error('El archivo no es un respaldo válido de AgroPiña.');
      const isLegacy = !data.version && Array.isArray(data.actividades);
      const ok = await confirm({ title: 'Restaurar respaldo', message: 'Se reemplazarán los datos actuales por los del archivo (' + data.parcelas.length + ' parcelas). ¿Desea continuar?', confirmText: 'Restaurar', danger: true });
      if (!ok) return;
      applyData(isLegacy ? fromLegacy(data) : data);
      applyTheme();
      toast('Datos restaurados correctamente' + (isLegacy ? ' (formato v1 migrado)' : ''));
      loadWeather();
    } catch (e) { toast('Error al leer el archivo: ' + e.message, 'error'); }
  }
  async function resetAll() {
    const ok = await confirm({ title: 'Borrar todos los datos', message: 'Se eliminarán permanentemente parcelas, labores, inventario, cosechas y monitoreos de este dispositivo. Descargue un respaldo antes si lo necesita.', confirmText: 'Borrar todo', danger: true });
    if (!ok) return;
    const s = state.settings;
    applyData({ settings: { finca: s.finca, moneda: s.moneda, tema: s.tema, ubicacion: s.ubicacion, onboarded: true } });
    toast('Todos los datos fueron eliminados', 'info');
  }
  function loadDemo() {
    applyData(AP.demo.generar(state.settings));
    toast('Finca de demostración cargada');
    loadWeather();
  }
  const storageKB = () => { try { return Math.round(((localStorage.getItem(KEY) || '').length * 2) / 1024); } catch (e) { return 0; } };

  /* ------------------------------ Init ------------------------------ */
  function init() {
    load();
    applyTheme();
    watch(() => state.settings.tema, applyTheme);
    if (mq) (mq.addEventListener ? mq.addEventListener('change', applyTheme) : mq.addListener(applyTheme));
    watch(() => [state.settings, ...COLLECTIONS.map((k) => state[k])], persist, { deep: true });
    watch(() => state.settings.ubicacion && state.settings.ubicacion.lat + ',' + state.settings.ubicacion.lon, (v, old) => { if (old !== undefined && v !== old) loadWeather(true); });
    setInterval(() => { const t = U.today(); if (t !== state.hoy) { state.hoy = t; loadWeather(); } }, 60000);
    loadWeather();
  }

  AP.store = {
    state, N, init, serialize,
    toast, dismiss, confirm, openForm, closeForm,
    parcela, insumo, parcelaNombre,
    saveParcela, deleteParcela, toggleArchivo,
    saveLabor, completarLabor, deleteLabor,
    saveInsumo, deleteInsumo, movimientoInsumo,
    saveCosecha, deleteCosecha, saveMonitoreo, deleteMonitoreo,
    estados, produccion, activas, carencias, costos, ingresos, pendientes, vencidas, stockBajo,
    ultimoMonitoreo, alertasClima, ventanas, recomendaciones, resumen, ubicacionActual,
    loadWeather, exportJSON, importJSON, resetAll, loadDemo, storageKB
  };
})(window.AP = window.AP || {});
