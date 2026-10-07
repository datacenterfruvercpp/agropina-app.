/* AgroPiña Enterprise · Estado global, persistencia multi-finca, migraciones, auditoría y reglas de negocio */
(function (AP) {
  'use strict';
  const { reactive, computed, watch } = Vue;
  const U = AP.utils, C = AP.catalog, A = AP.agro, W = AP.weather, B = AP.negocio;

  const KEY = 'agropina_v3';
  const KEY_V2 = 'agropina_v2';
  const VERSION = 3;
  const COLLECTIONS = ['parcelas', 'labores', 'insumos', 'cosechas', 'monitoreos', 'movimientos', 'trabajadores', 'proveedores', 'ordenes', 'clientes', 'auditoria'];
  const MAX_AUDITORIA = 1500;
  const num = (v, def = 0) => { const n = Number(v); return isFinite(n) && v !== '' && v != null ? n : def; };
  const numOrNull = (v) => (v === '' || v == null || !isFinite(Number(v)) ? null : Number(v));
  const str = (v) => (v == null ? '' : String(v).trim());
  const oneOf = (v, list, def) => (list.includes(v) ? v : def);

  const defaultSettings = () => ({
    finca: 'Mi Finca', propietario: '', moneda: 'USD', umbralLluvia: 20,
    precioReferencia: 280, ubicacion: null, onboarded: false,
    presupuestoHa: { manoObra: 4200, insumos: 5600, otros: 2400 }
  });
  const defaultPrefs = () => ({
    tema: 'system', densidad: 'comoda', navColapsada: false, leidas: [],
    usuario: { nombre: 'Administrador', rol: 'Administrador de finca' }
  });

  /* ---------------------------- Normalizadores ---------------------------- */
  const normPresupuesto = (p) => (p && typeof p === 'object' ? { manoObra: num(p.manoObra), insumos: num(p.insumos), otros: num(p.otros) } : null);
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
      presupuestoHa: normPresupuesto(p.presupuestoHa),
      notas: str(p.notas),
      createdAt: p.createdAt || new Date().toISOString()
    }),
    labor: (l) => ({
      id: str(l.id) || U.uid(),
      parcelaId: str(l.parcelaId),
      tipo: C.LABOR_ALIAS[l.tipo] || (C.LABORES[l.tipo] ? l.tipo : 'Otro'),
      fecha: l.fecha || U.today(),
      estado: oneOf(l.estado, ['pendiente', 'en_proceso', 'completada', 'cancelada'], 'completada'),
      prioridad: oneOf(l.prioridad, ['alta', 'media', 'baja'], 'media'),
      descripcion: str(l.descripcion),
      responsable: str(l.responsable),
      jornales: num(l.jornales),
      costoManoObra: num(l.costoManoObra),
      otrosCostos: num(l.otrosCostos),
      insumos: (l.insumos || []).map((li) => ({
        insumoId: str(li.insumoId), cantidad: num(li.cantidad), dosisHa: numOrNull(li.dosisHa),
        costoUnitario: numOrNull(li.costoUnitario), nombre: str(li.nombre), unidad: str(li.unidad), carencia: numOrNull(li.carencia)
      })),
      trabajadores: (l.trabajadores || []).map((t) => ({ trabajadorId: str(t.trabajadorId), jornales: num(t.jornales), tarifa: numOrNull(t.tarifa), nombre: str(t.nombre) }))
        .filter((t) => t.trabajadorId),
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
      proveedor: str(i.proveedor), proveedorId: str(i.proveedorId), notas: str(i.notas), createdAt: i.createdAt || new Date().toISOString()
    }),
    cosecha: (c) => ({
      id: str(c.id) || U.uid(), parcelaId: str(c.parcelaId), fecha: c.fecha || U.today(),
      toneladas: num(c.toneladas), cajas: numOrNull(c.cajas), exportable: numOrNull(c.exportable), brix: numOrNull(c.brix),
      precio: num(c.precio), destino: C.DESTINOS[c.destino] ? c.destino : 'Exportación', comprador: str(c.comprador),
      clienteId: str(c.clienteId), factura: str(c.factura),
      estadoPago: c.estadoPago === 'pendiente' ? 'pendiente' : 'pagado', fechaPago: c.fechaPago || null,
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
      tipo: oneOf(m.tipo, ['entrada', 'salida', 'ajuste'], 'entrada'),
      cantidad: num(m.cantidad), costoUnitario: num(m.costoUnitario), referencia: str(m.referencia), nota: str(m.nota)
    }),
    trabajador: (t) => ({
      id: str(t.id) || U.uid(), nombre: str(t.nombre) || 'Trabajador', identificacion: str(t.identificacion),
      cuadrilla: str(t.cuadrilla), puesto: str(t.puesto) || 'Peón agrícola', tarifaJornal: num(t.tarifaJornal),
      telefono: str(t.telefono), activo: t.activo !== false, fechaIngreso: t.fechaIngreso || null, notas: str(t.notas),
      createdAt: t.createdAt || new Date().toISOString()
    }),
    proveedor: (p) => ({
      id: str(p.id) || U.uid(), nombre: str(p.nombre) || 'Proveedor', identificacion: str(p.identificacion),
      contacto: str(p.contacto), telefono: str(p.telefono), email: str(p.email), diasCredito: num(p.diasCredito),
      notas: str(p.notas), createdAt: p.createdAt || new Date().toISOString()
    }),
    orden: (o) => {
      const lineas = (o.lineas || []).map((l) => ({ insumoId: str(l.insumoId), cantidad: num(l.cantidad), costoUnitario: num(l.costoUnitario), nombre: str(l.nombre), unidad: str(l.unidad) }))
        .filter((l) => l.insumoId);
      return {
        id: str(o.id) || U.uid(), numero: str(o.numero), proveedorId: str(o.proveedorId), fecha: o.fecha || U.today(),
        fechaEntrega: o.fechaEntrega || null, estado: oneOf(o.estado, ['borrador', 'aprobada', 'recibida', 'cancelada'], 'borrador'),
        lineas, total: B.totalOrden({ lineas }), notas: str(o.notas), fechaRecepcion: o.fechaRecepcion || null,
        createdAt: o.createdAt || new Date().toISOString()
      };
    },
    cliente: (c) => ({
      id: str(c.id) || U.uid(), nombre: str(c.nombre) || 'Cliente', identificacion: str(c.identificacion),
      tipo: oneOf(c.tipo, C.TIPOS_CLIENTE, 'Exportadora'), contacto: str(c.contacto), telefono: str(c.telefono),
      email: str(c.email), diasCredito: num(c.diasCredito, 30), notas: str(c.notas), createdAt: c.createdAt || new Date().toISOString()
    }),
    auditoria: (a) => ({
      id: str(a.id) || U.uid(), fecha: a.fecha || new Date().toISOString(), usuario: str(a.usuario) || 'Sistema',
      accion: str(a.accion), entidad: str(a.entidad), descripcion: str(a.descripcion)
    })
  };
  const NORM = {
    parcelas: N.parcela, labores: N.labor, insumos: N.insumo, cosechas: N.cosecha, monitoreos: N.monitoreo, movimientos: N.movimiento,
    trabajadores: N.trabajador, proveedores: N.proveedor, ordenes: N.orden, clientes: N.cliente, auditoria: N.auditoria
  };

  /* ------------------------------- Estado -------------------------------- */
  const state = reactive({
    settings: defaultSettings(),
    parcelas: [], labores: [], insumos: [], cosechas: [], monitoreos: [], movimientos: [],
    trabajadores: [], proveedores: [], ordenes: [], clientes: [], auditoria: [],
    fincas: [], fincaActiva: '',
    prefs: defaultPrefs(),
    hoy: U.today(),
    isDark: false,
    weather: { status: 'idle', data: null, error: null, fetchedAt: null, stale: false, simulated: false },
    ui: { toasts: [], confirm: null, form: null, sheet: null, palette: false }
  });
  /** Datos guardados de las fincas no activas (la activa vive en `state`). */
  let almacen = {};

  /* ---------------------------- Persistencia ----------------------------- */
  function applyData(data) {
    state.settings = Object.assign(defaultSettings(), data.settings || {});
    delete state.settings.tema;
    COLLECTIONS.forEach((k) => { state[k] = (Array.isArray(data[k]) ? data[k] : []).map((x, i) => NORM[k](x, i)); });
  }
  function serializeFinca() {
    const o = { settings: U.clone(state.settings) };
    COLLECTIONS.forEach((k) => { o[k] = state[k]; });
    return o;
  }
  function serialize() {
    const datos = Object.assign({}, almacen, { [state.fincaActiva]: serializeFinca() });
    return { app: 'AgroPiña Enterprise', version: VERSION, exportedAt: new Date().toISOString(), fincaActiva: state.fincaActiva, fincas: state.fincas, prefs: state.prefs, datos };
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
  /** Una finca (datos v1/v2) → estructura v3 de una sola finca */
  function fromSingle(data, extraPrefs) {
    const id = 'f-' + U.uid();
    return {
      version: VERSION, fincaActiva: id,
      fincas: [{ id, nombre: (data.settings && data.settings.finca) || 'Mi Finca' }],
      prefs: Object.assign(defaultPrefs(), extraPrefs || {}, data.settings && data.settings.tema ? { tema: data.settings.tema } : {}),
      datos: { [id]: data }
    };
  }
  function applyAll(full) {
    state.prefs = Object.assign(defaultPrefs(), full.prefs || {});
    state.fincas = (full.fincas || []).map((f) => ({ id: str(f.id), nombre: str(f.nombre) || 'Finca' })).filter((f) => f.id && full.datos && full.datos[f.id]);
    if (!state.fincas.length) {
      const id = 'f-' + U.uid();
      state.fincas = [{ id, nombre: 'Mi Finca' }];
      full = { datos: { [id]: {} } };
    }
    almacen = Object.assign({}, full.datos);
    const activa = state.fincas.some((f) => f.id === full.fincaActiva) ? full.fincaActiva : state.fincas[0].id;
    state.fincaActiva = activa;
    applyData(almacen[activa] || {});
    delete almacen[activa];
  }
  function load() {
    let full = null, migrado = false;
    try { full = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { full = null; }
    if (!full) {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(KEY_V2) || 'null'); } catch (e) { data = null; }
      if (data) {
        full = fromSingle(data);
        migrado = true;
        setTimeout(() => toast('Datos actualizados a AgroPiña Enterprise 3.0 (multi-finca)', 'success'), 700);
      } else {
        try {
          const p = JSON.parse(localStorage.getItem('agropina_parcelas') || 'null');
          const a = JSON.parse(localStorage.getItem('agropina_actividades') || 'null');
          if (p || a) {
            full = fromSingle(fromLegacy({ parcelas: p || [], actividades: a || [], settings: { onboarded: true } }),
              { tema: localStorage.getItem('agropina_theme') === 'dark' ? 'dark' : 'system' });
            migrado = true;
            setTimeout(() => toast('Datos de la versión anterior migrados correctamente', 'success'), 700);
          }
        } catch (e) { full = null; }
      }
    }
    applyAll(full || {});
    // Guarda de inmediato en el formato v3 (los datos antiguos se conservan como respaldo)
    if (migrado) persist();
  }
  let saveError = false;
  const persist = U.debounce(() => {
    try { localStorage.setItem(KEY, JSON.stringify(serialize())); saveError = false; }
    catch (e) { if (!saveError) toast('No se pudo guardar: almacenamiento del navegador lleno o bloqueado', 'error'); saveError = true; }
  }, 250);

  /* ------------------------------ Tema y densidad ------------------------------ */
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    const t = state.prefs.tema;
    const dark = t === 'dark' || (t === 'system' && !!(mq && mq.matches));
    state.isDark = dark;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('compact', state.prefs.densidad === 'compacta');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0f1b2b');
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
  function openForm(type, data) { state.ui.sheet = null; state.ui.palette = false; state.ui.form = { type, data: data ? U.clone(data) : {}, key: U.uid() }; }
  function closeForm() { state.ui.form = null; }

  /* ------------------------------ Auditoría ------------------------------ */
  function audit(accion, entidad, descripcion) {
    state.auditoria.unshift(N.auditoria({ accion, entidad, descripcion, usuario: state.prefs.usuario.nombre }));
    if (state.auditoria.length > MAX_AUDITORIA) state.auditoria.length = MAX_AUDITORIA;
  }
  function withUndo(keys, fn, message, auditInfo) {
    const snap = {};
    keys.forEach((k) => { snap[k] = U.clone(state[k]); });
    fn();
    if (auditInfo) audit('Eliminar', auditInfo[0], auditInfo[1]);
    toast(message, 'info', { action: { label: 'Deshacer', fn: () => {
      keys.forEach((k) => { state[k] = snap[k]; });
      if (auditInfo) audit('Restaurar', auditInfo[0], auditInfo[1]);
      toast('Acción deshecha', 'info');
    } } });
  }

  /* ------------------------------ Consultas ------------------------------ */
  const byId = (k, id) => state[k].find((x) => x.id === id) || null;
  const parcela = (id) => byId('parcelas', id);
  const insumo = (id) => byId('insumos', id);
  const trabajador = (id) => byId('trabajadores', id);
  const proveedor = (id) => byId('proveedores', id);
  const cliente = (id) => byId('clientes', id);
  const parcelaNombre = (id) => { const p = parcela(id); return p ? p.nombre : 'Parcela eliminada'; };
  const proveedorNombre = (id) => { const p = proveedor(id); return p ? p.nombre : 'Sin proveedor'; };
  const clienteNombre = (id, def) => { const c = cliente(id); return c ? c.nombre : (def || 'Sin cliente'); };

  function upsert(k, item) {
    const i = state[k].findIndex((x) => x.id === item.id);
    if (i >= 0) state[k].splice(i, 1, item); else state[k].push(item);
    return item;
  }

  /* ------------------------------ Fincas ------------------------------ */
  function cambiarFinca(id, opts = {}) {
    if (!id || id === state.fincaActiva || !almacen[id]) return;
    almacen[state.fincaActiva] = serializeFinca();
    const datos = almacen[id];
    delete almacen[id];
    state.fincaActiva = id;
    applyData(datos);
    state.weather.data = null; state.weather.status = 'idle'; state.weather.fetchedAt = null;
    loadWeather();
    if (!opts.silent) toast('Finca activa: ' + state.settings.finca);
  }
  function crearFinca(data) {
    const id = 'f-' + U.uid();
    const settings = Object.assign(defaultSettings(), { finca: str(data.nombre) || 'Nueva finca', moneda: data.moneda || state.settings.moneda, onboarded: true });
    if (data.ubicacion) settings.ubicacion = data.ubicacion;
    const nueva = { settings };
    if (data.copiarCatalogos) ['insumos', 'trabajadores', 'proveedores', 'clientes'].forEach((k) => {
      nueva[k] = U.clone(state[k]).map((x) => Object.assign(x, k === 'insumos' ? { stock: 0 } : {}));
    });
    almacen[id] = nueva;
    state.fincas.push({ id, nombre: settings.finca });
    cambiarFinca(id, { silent: true });
    audit('Crear', 'Finca', settings.finca);
    toast('Finca «' + settings.finca + '» creada');
    return id;
  }
  async function eliminarFinca(id) {
    if (state.fincas.length <= 1) { toast('Debe existir al menos una finca', 'warning'); return false; }
    const f = state.fincas.find((x) => x.id === id); if (!f) return false;
    const ok = await confirm({ title: 'Eliminar «' + f.nombre + '»', message: 'Se eliminarán de forma permanente todas las parcelas, labores, inventario, personal y registros de esta finca. Descargue un respaldo antes si lo necesita.', confirmText: 'Eliminar finca', danger: true });
    if (!ok) return false;
    if (id === state.fincaActiva) cambiarFinca(state.fincas.find((x) => x.id !== id).id, { silent: true });
    delete almacen[id];
    state.fincas = state.fincas.filter((x) => x.id !== id);
    audit('Eliminar', 'Finca', f.nombre);
    toast('Finca eliminada', 'info');
    return true;
  }
  /** Datos de todas las fincas (para el consolidado corporativo) */
  function todasLasFincas() {
    return state.fincas.map((f) => ({ id: f.id, activa: f.id === state.fincaActiva, datos: f.id === state.fincaActiva ? serializeFinca() : almacen[f.id] || {} }));
  }

  /* ------------------------------ Parcelas ------------------------------ */
  function saveParcela(data) {
    const prev = data.id ? parcela(data.id) : null;
    const p = N.parcela(Object.assign({}, prev || {}, data), state.parcelas.length);
    if (!p.fechaInicioCiclo || p.ciclo === 1) p.fechaInicioCiclo = p.ciclo === 1 ? p.fechaSiembra : p.fechaInicioCiclo;
    upsert('parcelas', p);
    audit(prev ? 'Editar' : 'Crear', 'Parcela', p.nombre + ' · ' + U.fmtNum(p.hectareas, 2) + ' ha');
    if (!data.silent) toast(prev ? 'Parcela actualizada' : 'Parcela «' + p.nombre + '» creada');
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
    }, 'Parcela eliminada', ['Parcela', p.nombre]);
    return true;
  }
  function toggleArchivo(id) {
    const p = parcela(id); if (!p) return;
    p.estado = p.estado === 'archivada' ? 'activa' : 'archivada';
    audit(p.estado === 'archivada' ? 'Archivar' : 'Reactivar', 'Parcela', p.nombre);
    toast(p.estado === 'archivada' ? 'Parcela archivada' : 'Parcela reactivada');
  }

  /* ------------------------- Labores (órdenes de trabajo) + inventario ------------------------- */
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
    // Personal asignado: jornales y costo de mano de obra según la tarifa de cada trabajador
    l.trabajadores = l.trabajadores.filter((t) => t.jornales > 0).map((t) => {
      const tr = trabajador(t.trabajadorId);
      return Object.assign(t, { nombre: tr ? tr.nombre : t.nombre, tarifa: t.tarifa != null ? t.tarifa : (tr ? tr.tarifaJornal : 0) });
    });
    if (l.trabajadores.length) {
      l.jornales = U.round(U.sum(l.trabajadores, (t) => t.jornales), 2);
      l.costoManoObra = U.round(U.sum(l.trabajadores, (t) => t.jornales * t.tarifa), 2);
    }
    costear(l);
    l.stockAplicado = false;
    const faltantes = [];
    if (l.estado === 'completada') {
      l.insumos.forEach((li) => { const ins = insumo(li.insumoId); if (ins && ins.stock < li.cantidad) faltantes.push(ins.nombre); });
      moverStock(l, -1);
      l.stockAplicado = true;
    }
    upsert('labores', l);
    let extra = '';
    if (l.estado === 'completada' && l.tipo === 'Inducción floral') {
      const p = parcela(l.parcelaId);
      if (p && !p.fechaInduccion && l.fecha >= p.fechaInicioCiclo) { p.fechaInduccion = l.fecha; extra = ' · inducción registrada en la parcela'; }
    }
    if (!opts.noAudit) audit(prev ? (prev.estado !== l.estado ? 'Cambio de estado' : 'Editar') : 'Crear', 'Labor', l.tipo + ' · ' + parcelaNombre(l.parcelaId) + ' · ' + B.ESTADOS_LABOR[l.estado].label);
    if (!opts.silent) {
      toast((prev ? 'Labor actualizada' : l.estado === 'completada' ? 'Labor registrada' : 'Orden de trabajo creada') + extra);
    }
    if (faltantes.length) toast('Stock insuficiente: ' + faltantes.join(', ') + '. Revise el inventario.', 'warning', { duration: 5000 });
    return l;
  }
  function cambiarEstadoLabor(id, estado) {
    const l = byId('labores', id); if (!l || l.estado === estado) return;
    const fecha = estado === 'completada' && l.fecha > state.hoy ? state.hoy : l.fecha;
    saveLabor(Object.assign({}, l, { estado, fecha }), { silent: true });
    toast(estado === 'completada' ? 'Labor completada' + (l.insumos.length ? ' · inventario actualizado' : '') : 'Estado: ' + B.ESTADOS_LABOR[estado].label, estado === 'completada' ? 'success' : 'info');
  }
  function completarLabor(id) {
    const l = byId('labores', id); if (!l) return;
    cambiarEstadoLabor(id, l.estado === 'completada' ? 'pendiente' : 'completada');
  }
  function deleteLabor(id) {
    const l = byId('labores', id); if (!l) return;
    withUndo(['labores', 'insumos', 'movimientos'], () => {
      if (l.stockAplicado) moverStock(l, +1);
      state.labores = state.labores.filter((x) => x.id !== id);
    }, 'Labor eliminada' + (l.stockAplicado && l.insumos.length ? ' · stock devuelto' : ''), ['Labor', l.tipo + ' · ' + parcelaNombre(l.parcelaId)]);
  }

  /* ------------------------------ Insumos ------------------------------ */
  function saveInsumo(data) {
    const prev = data.id ? insumo(data.id) : null;
    const i = N.insumo(Object.assign({}, prev || {}, data));
    upsert('insumos', i);
    if (!prev && i.stock > 0) state.movimientos.push(N.movimiento({ insumoId: i.id, tipo: 'entrada', cantidad: i.stock, costoUnitario: i.costoUnitario, nota: 'Inventario inicial' }));
    audit(prev ? 'Editar' : 'Crear', 'Insumo', i.nombre);
    toast(prev ? 'Insumo actualizado' : 'Insumo agregado al inventario');
    return i;
  }
  function deleteInsumo(id) {
    const i = insumo(id); if (!i) return;
    withUndo(['insumos', 'movimientos'], () => {
      state.insumos = state.insumos.filter((x) => x.id !== id);
      state.movimientos = state.movimientos.filter((m) => m.insumoId !== id);
    }, 'Insumo eliminado', ['Insumo', i.nombre]);
  }
  /** Entrada (compra) con costo promedio ponderado, o ajuste a un stock contado */
  function movimientoInsumo(data, opts = {}) {
    const i = insumo(data.insumoId); if (!i) return;
    const cant = num(data.cantidad);
    if (data.tipo === 'ajuste') {
      const diff = U.round(cant - i.stock, 3);
      i.stock = U.round(cant, 3);
      state.movimientos.push(N.movimiento({ insumoId: i.id, fecha: data.fecha, tipo: 'ajuste', cantidad: diff, costoUnitario: i.costoUnitario, nota: data.nota || 'Ajuste por conteo físico' }));
      audit('Ajuste de inventario', 'Insumo', i.nombre + ' → ' + U.fmtNum(i.stock, 2) + ' ' + i.unidad);
      if (!opts.silent) toast('Stock ajustado a ' + U.fmtNum(i.stock, 2) + ' ' + i.unidad);
    } else {
      const cu = num(data.costoUnitario, i.costoUnitario);
      const base = Math.max(0, i.stock);
      i.costoUnitario = base + cant > 0 ? U.round((base * i.costoUnitario + cant * cu) / (base + cant), 4) : cu;
      i.stock = U.round(i.stock + cant, 3);
      state.movimientos.push(N.movimiento({ insumoId: i.id, fecha: data.fecha, tipo: 'entrada', cantidad: cant, costoUnitario: cu, referencia: data.referencia, nota: data.nota || 'Compra' }));
      if (!opts.silent) { audit('Entrada de inventario', 'Insumo', i.nombre + ' +' + U.fmtNum(cant, 2) + ' ' + i.unidad); toast('Entrada registrada: +' + U.fmtNum(cant, 2) + ' ' + i.unidad); }
    }
  }

  /* ------------------------------ Compras: proveedores y órdenes ------------------------------ */
  function saveProveedor(data) {
    const prev = data.id ? proveedor(data.id) : null;
    const p = N.proveedor(Object.assign({}, prev || {}, data));
    upsert('proveedores', p);
    audit(prev ? 'Editar' : 'Crear', 'Proveedor', p.nombre);
    toast(prev ? 'Proveedor actualizado' : 'Proveedor creado');
    return p;
  }
  function deleteProveedor(id) {
    const p = proveedor(id); if (!p) return;
    if (state.ordenes.some((o) => o.proveedorId === id && o.estado !== 'cancelada')) { toast('No se puede eliminar: tiene órdenes de compra asociadas', 'warning'); return; }
    withUndo(['proveedores'], () => { state.proveedores = state.proveedores.filter((x) => x.id !== id); }, 'Proveedor eliminado', ['Proveedor', p.nombre]);
  }
  function saveOrden(data) {
    const prev = data.id ? byId('ordenes', data.id) : null;
    if (prev && (prev.estado === 'recibida' || prev.estado === 'cancelada')) { toast('Una orden recibida o cancelada no se puede editar', 'warning'); return prev; }
    const o = N.orden(Object.assign({}, prev || {}, data));
    if (!o.numero) o.numero = B.siguienteNumero(state.ordenes);
    o.lineas = o.lineas.filter((l) => l.cantidad > 0).map((l) => { const ins = insumo(l.insumoId); return Object.assign(l, { nombre: ins ? ins.nombre : l.nombre, unidad: ins ? ins.unidad : l.unidad }); });
    o.total = B.totalOrden(o);
    upsert('ordenes', o);
    audit(prev ? 'Editar' : 'Crear', 'Orden de compra', o.numero + ' · ' + proveedorNombre(o.proveedorId) + ' · ' + U.fmtNum(o.total, 2));
    toast(prev ? 'Orden ' + o.numero + ' actualizada' : 'Orden ' + o.numero + ' creada');
    return o;
  }
  function aprobarOrden(id) {
    const o = byId('ordenes', id); if (!o || o.estado !== 'borrador') return;
    if (!o.lineas.length) { toast('La orden no tiene líneas', 'warning'); return; }
    o.estado = 'aprobada';
    audit('Aprobar', 'Orden de compra', o.numero);
    toast('Orden ' + o.numero + ' aprobada');
  }
  /** Recepción total: cada línea entra al inventario con su costo (promedio ponderado) */
  function recibirOrden(id, fecha) {
    const o = byId('ordenes', id); if (!o || o.estado !== 'aprobada') return;
    const f = fecha || state.hoy;
    o.lineas.forEach((l) => movimientoInsumo({ insumoId: l.insumoId, tipo: 'entrada', cantidad: l.cantidad, costoUnitario: l.costoUnitario, fecha: f, referencia: o.id, nota: 'Recepción ' + o.numero + ' · ' + proveedorNombre(o.proveedorId) }, { silent: true }));
    o.estado = 'recibida';
    o.fechaRecepcion = f;
    audit('Recibir', 'Orden de compra', o.numero + ' · ' + o.lineas.length + ' línea(s) al inventario');
    toast('Orden ' + o.numero + ' recibida · inventario actualizado');
  }
  function cancelarOrden(id) {
    const o = byId('ordenes', id); if (!o || o.estado === 'recibida') return;
    o.estado = 'cancelada';
    audit('Cancelar', 'Orden de compra', o.numero);
    toast('Orden ' + o.numero + ' cancelada', 'info');
  }
  function deleteOrden(id) {
    const o = byId('ordenes', id); if (!o) return;
    if (o.estado === 'recibida') { toast('Una orden recibida no se puede eliminar (afectó el inventario)', 'warning'); return; }
    withUndo(['ordenes'], () => { state.ordenes = state.ordenes.filter((x) => x.id !== id); }, 'Orden eliminada', ['Orden de compra', o.numero]);
  }

  /* ------------------------------ Personal ------------------------------ */
  function saveTrabajador(data) {
    const prev = data.id ? trabajador(data.id) : null;
    const t = N.trabajador(Object.assign({}, prev || {}, data));
    upsert('trabajadores', t);
    audit(prev ? 'Editar' : 'Crear', 'Trabajador', t.nombre);
    toast(prev ? 'Trabajador actualizado' : 'Trabajador agregado');
    return t;
  }
  function deleteTrabajador(id) {
    const t = trabajador(id); if (!t) return;
    if (state.labores.some((l) => l.trabajadores.some((x) => x.trabajadorId === id))) {
      t.activo = false;
      audit('Desactivar', 'Trabajador', t.nombre);
      toast('El trabajador tiene labores registradas: se marcó como inactivo para conservar la planilla', 'info', { duration: 5000 });
      return;
    }
    withUndo(['trabajadores'], () => { state.trabajadores = state.trabajadores.filter((x) => x.id !== id); }, 'Trabajador eliminado', ['Trabajador', t.nombre]);
  }

  /* ------------------------------ Ventas: clientes y cobros ------------------------------ */
  function saveCliente(data) {
    const prev = data.id ? cliente(data.id) : null;
    const c = N.cliente(Object.assign({}, prev || {}, data));
    upsert('clientes', c);
    audit(prev ? 'Editar' : 'Crear', 'Cliente', c.nombre);
    toast(prev ? 'Cliente actualizado' : 'Cliente creado');
    return c;
  }
  function deleteCliente(id) {
    const c = cliente(id); if (!c) return;
    if (state.cosechas.some((x) => x.clienteId === id)) { toast('No se puede eliminar: el cliente tiene cosechas registradas', 'warning'); return; }
    withUndo(['clientes'], () => { state.clientes = state.clientes.filter((x) => x.id !== id); }, 'Cliente eliminado', ['Cliente', c.nombre]);
  }
  function registrarCobro(cosechaId, fecha) {
    const c = byId('cosechas', cosechaId); if (!c || c.estadoPago === 'pagado') return;
    c.estadoPago = 'pagado';
    c.fechaPago = fecha || state.hoy;
    audit('Cobro', 'Cosecha', clienteNombre(c.clienteId, c.comprador) + ' · ' + U.fmtNum(c.toneladas * c.precio, 2));
    toast('Cobro registrado');
  }

  /* ------------------------------ Cosechas ------------------------------ */
  function saveCosecha(data) {
    const prev = data.id ? byId('cosechas', data.id) : null;
    const c = N.cosecha(Object.assign({}, prev || {}, data));
    const p = parcela(c.parcelaId);
    if (!c.ciclo && p) c.ciclo = p.ciclo;
    if (c.clienteId && !c.comprador) c.comprador = clienteNombre(c.clienteId);
    let extra = '';
    if (c.cierraCiclo && !c.cicloCerrado && p) {
      p.ciclo += 1;
      p.fechaInicioCiclo = c.fecha;
      p.fechaInduccion = null;
      c.cicloCerrado = true;
      extra = ' · ciclo cerrado, inicia Soca ' + (p.ciclo - 1);
    }
    upsert('cosechas', c);
    audit(prev ? 'Editar' : 'Crear', 'Cosecha', parcelaNombre(c.parcelaId) + ' · ' + U.fmtNum(c.toneladas, 1) + ' t');
    toast((prev ? 'Cosecha actualizada' : 'Cosecha registrada') + extra);
    return c;
  }
  function deleteCosecha(id) {
    const c = byId('cosechas', id); if (!c) return;
    withUndo(['cosechas'], () => { state.cosechas = state.cosechas.filter((x) => x.id !== id); }, 'Cosecha eliminada', ['Cosecha', parcelaNombre(c.parcelaId) + ' · ' + U.fmtNum(c.toneladas, 1) + ' t']);
  }

  /* ------------------------------ Monitoreo ------------------------------ */
  function saveMonitoreo(data) {
    const prev = data.id ? byId('monitoreos', data.id) : null;
    const m = N.monitoreo(Object.assign({}, prev || {}, data));
    upsert('monitoreos', m);
    audit(prev ? 'Editar' : 'Crear', 'Monitoreo', C.plaga(m.plaga).nombre + ' · ' + parcelaNombre(m.parcelaId));
    toast(prev ? 'Monitoreo actualizado' : 'Monitoreo registrado');
    return m;
  }
  function deleteMonitoreo(id) {
    const m = byId('monitoreos', id); if (!m) return;
    withUndo(['monitoreos'], () => { state.monitoreos = state.monitoreos.filter((x) => x.id !== id); }, 'Monitoreo eliminado', ['Monitoreo', C.plaga(m.plaga).nombre + ' · ' + parcelaNombre(m.parcelaId)]);
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
  const pendientes = computed(() => state.labores.filter(B.abierta).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : B.PRIORIDADES[a.prioridad].orden - B.PRIORIDADES[b.prioridad].orden)));
  const vencidas = computed(() => pendientes.value.filter((l) => l.fecha < state.hoy));
  const stockBajo = computed(() => state.insumos.filter((i) => i.stock <= 0 || (i.stockMinimo > 0 && i.stock <= i.stockMinimo)));
  const ultimoMonitoreo = computed(() => {
    const o = {};
    state.monitoreos.forEach((m) => { const cur = o[m.parcelaId]; if (!cur || m.fecha > cur.fecha || (m.fecha === cur.fecha && m.severidad > cur.severidad)) o[m.parcelaId] = m; });
    return o;
  });
  const cxc = computed(() => B.cuentasPorCobrar(state.cosechas, state.clientes, state.hoy));
  const ordenesAbiertas = computed(() => state.ordenes.filter((o) => o.estado === 'borrador' || o.estado === 'aprobada'));
  const presupuesto = computed(() => B.presupuestoVsReal(state.parcelas, state.labores, state.settings.presupuestoHa, state.hoy));
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
      valorInventario: U.sum(state.insumos, (i) => Math.max(0, i.stock) * i.costoUnitario),
      porCobrar: U.sum(cxc.value, (x) => x.monto),
      porCobrarVencido: U.sum(cxc.value.filter((x) => x.diasVencido > 0), (x) => x.monto),
      comprasAbiertas: U.sum(ordenesAbiertas.value, (o) => o.total),
      personalActivo: state.trabajadores.filter((t) => t.activo).length
    };
  });

  /* ------------------------------ Notificaciones ------------------------------ */
  const notificaciones = computed(() => {
    const out = [];
    recomendaciones.value.filter((r) => r.nivel === 'alto' || r.nivel === 'medio').forEach((r) => out.push({
      key: 'rec:' + r.parcelaId + ':' + r.titulo, nivel: r.nivel, icono: r.icono, titulo: r.titulo, texto: r.parcela + ' · ' + r.texto, to: 'parcelas/' + r.parcelaId
    }));
    vencidas.value.forEach((l) => out.push({ key: 'venc:' + l.id, nivel: 'medio', icono: 'fa-clock', titulo: 'Labor vencida: ' + l.tipo, texto: parcelaNombre(l.parcelaId) + ' · programada para el ' + U.fmtDate(l.fecha), to: 'labores' }));
    stockBajo.value.forEach((i) => out.push({ key: 'stock:' + i.id + ':' + (i.stock <= 0 ? 0 : 1), nivel: i.stock <= 0 ? 'alto' : 'medio', icono: 'fa-boxes-stacked', titulo: (i.stock <= 0 ? 'Sin stock: ' : 'Stock bajo: ') + i.nombre, texto: U.fmtNum(i.stock, 2) + ' ' + i.unidad + ' (mínimo ' + U.fmtNum(i.stockMinimo, 1) + ')', to: 'inventario' }));
    state.ordenes.filter((o) => o.estado === 'aprobada' && o.fechaEntrega && o.fechaEntrega < state.hoy).forEach((o) => out.push({ key: 'oc:' + o.id, nivel: 'medio', icono: 'fa-truck', titulo: 'Orden ' + o.numero + ' atrasada', texto: proveedorNombre(o.proveedorId) + ' · entrega prevista ' + U.fmtDate(o.fechaEntrega), to: 'compras' }));
    cxc.value.filter((x) => x.diasVencido > 0).forEach((x) => out.push({ key: 'cxc:' + x.cosechaId, nivel: x.diasVencido > 30 ? 'alto' : 'medio', icono: 'fa-file-invoice-dollar', titulo: 'Cobro vencido: ' + x.cliente, texto: U.fmtNum(x.diasVencido) + ' días de atraso', to: 'ventas' }));
    alertasClima.value.filter((a) => a.nivel === 'alto').forEach((a) => out.push({ key: 'clima:' + a.titulo, nivel: 'alto', icono: a.icono, titulo: a.titulo, texto: a.texto, to: 'clima' }));
    const leidas = new Set(state.prefs.leidas);
    return out.map((n) => Object.assign(n, { leida: leidas.has(n.key) })).sort((a, b) => (a.leida - b.leida) || (C.NIVELES[a.nivel].orden - C.NIVELES[b.nivel].orden));
  });
  function marcarLeidas(keys) {
    const set = new Set(state.prefs.leidas);
    (keys || notificaciones.value.map((n) => n.key)).forEach((k) => set.add(k));
    state.prefs.leidas = Array.from(set).slice(-400);
  }

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
    audit('Exportar', 'Respaldo', 'Respaldo completo (' + state.fincas.length + ' finca/s)');
    toast('Respaldo descargado (' + state.fincas.length + ' finca/s)');
  }
  async function importJSON(file) {
    try {
      const data = JSON.parse(await U.readFile(file));
      if (!data || typeof data !== 'object') throw new Error('El archivo no es un respaldo válido de AgroPiña.');
      if (data.version === 3 && data.datos && Array.isArray(data.fincas)) {
        const ok = await confirm({ title: 'Restaurar respaldo completo', message: 'Se reemplazarán TODAS las fincas de este dispositivo por las del archivo (' + data.fincas.length + ' finca/s). ¿Desea continuar?', confirmText: 'Restaurar', danger: true });
        if (!ok) return;
        applyAll(data);
        applyTheme();
        audit('Importar', 'Respaldo', 'Respaldo completo restaurado');
        toast('Respaldo restaurado (' + state.fincas.length + ' finca/s)');
      } else {
        if (!Array.isArray(data.parcelas)) throw new Error('El archivo no es un respaldo válido de AgroPiña.');
        const isLegacy = !data.version && Array.isArray(data.actividades);
        const ok = await confirm({ title: 'Restaurar en «' + state.settings.finca + '»', message: 'El archivo es de una sola finca (' + data.parcelas.length + ' parcelas). Reemplazará los datos de la finca activa. ¿Desea continuar?', confirmText: 'Restaurar', danger: true });
        if (!ok) return;
        applyData(isLegacy ? fromLegacy(data) : data);
        const f = state.fincas.find((x) => x.id === state.fincaActiva); if (f) f.nombre = state.settings.finca;
        audit('Importar', 'Respaldo', 'Datos de una finca restaurados' + (isLegacy ? ' (formato v1)' : ''));
        toast('Datos restaurados' + (isLegacy ? ' (formato v1 migrado)' : ''));
      }
      loadWeather();
    } catch (e) { toast('Error al leer el archivo: ' + e.message, 'error'); }
  }
  async function resetAll() {
    const ok = await confirm({ title: 'Borrar los datos de «' + state.settings.finca + '»', message: 'Se eliminarán permanentemente parcelas, labores, inventario, compras, personal, clientes y registros de esta finca. Las demás fincas no se modifican.', confirmText: 'Borrar datos', danger: true });
    if (!ok) return;
    const s = state.settings;
    applyData({ settings: { finca: s.finca, moneda: s.moneda, ubicacion: s.ubicacion, onboarded: true, presupuestoHa: s.presupuestoHa } });
    audit('Borrar', 'Finca', 'Todos los datos de ' + s.finca);
    toast('Datos de la finca eliminados', 'info');
  }
  /** Finca de demostración en la finca activa; si es la única, agrega una segunda finca de ejemplo. */
  function loadDemo() {
    applyData(AP.demo.generar(state.settings, 0));
    const f = state.fincas.find((x) => x.id === state.fincaActiva); if (f) f.nombre = state.settings.finca;
    if (state.fincas.length === 1) {
      const id = 'f-' + U.uid();
      const d2 = AP.demo.generar(Object.assign({}, state.settings, { finca: '' }), 1);
      almacen[id] = d2;
      state.fincas.push({ id, nombre: d2.settings.finca });
    }
    audit('Cargar', 'Demostración', 'Datos de ejemplo cargados');
    toast('Datos de demostración cargados');
    loadWeather();
  }
  const storageKB = () => { try { return Math.round(((localStorage.getItem(KEY) || '').length * 2) / 1024); } catch (e) { return 0; } };

  /* ------------------------------ Init ------------------------------ */
  function init() {
    load();
    applyTheme();
    watch(() => [state.prefs.tema, state.prefs.densidad], applyTheme);
    if (mq) (mq.addEventListener ? mq.addEventListener('change', applyTheme) : mq.addListener(applyTheme));
    watch(() => [state.settings, state.prefs, state.fincas, state.fincaActiva, ...COLLECTIONS.map((k) => state[k])], persist, { deep: true });
    watch(() => state.settings.finca, (v) => { const f = state.fincas.find((x) => x.id === state.fincaActiva); if (f && v) f.nombre = v; });
    watch(() => state.settings.ubicacion && state.settings.ubicacion.lat + ',' + state.settings.ubicacion.lon, (v, old) => { if (old !== undefined && v !== old && state.weather.status !== 'idle') loadWeather(true); });
    setInterval(() => { const t = U.today(); if (t !== state.hoy) { state.hoy = t; loadWeather(); } }, 60000);
    loadWeather();
  }

  AP.store = {
    state, N, init, serialize, audit,
    toast, dismiss, confirm, openForm, closeForm,
    parcela, insumo, trabajador, proveedor, cliente, parcelaNombre, proveedorNombre, clienteNombre,
    cambiarFinca, crearFinca, eliminarFinca, todasLasFincas,
    saveParcela, deleteParcela, toggleArchivo,
    saveLabor, completarLabor, cambiarEstadoLabor, deleteLabor,
    saveInsumo, deleteInsumo, movimientoInsumo,
    saveProveedor, deleteProveedor, saveOrden, aprobarOrden, recibirOrden, cancelarOrden, deleteOrden,
    saveTrabajador, deleteTrabajador, saveCliente, deleteCliente, registrarCobro,
    saveCosecha, deleteCosecha, saveMonitoreo, deleteMonitoreo,
    estados, produccion, activas, carencias, costos, ingresos, pendientes, vencidas, stockBajo, cxc, ordenesAbiertas, presupuesto,
    ultimoMonitoreo, alertasClima, ventanas, recomendaciones, resumen, ubicacionActual, notificaciones, marcarLeidas,
    loadWeather, exportJSON, importJSON, resetAll, loadDemo, storageKB
  };
})(window.AP = window.AP || {});
