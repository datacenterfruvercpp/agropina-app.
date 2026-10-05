/* AgroPiña Pro · Generador de finca de demostración (datos relativos a la fecha actual) */
(function (AP) {
  'use strict';
  const U = AP.utils, C = AP.catalog;

  function rect(lat, lon, ha, ratio) {
    const area = ha * 10000;
    const w = Math.sqrt(area * ratio), h = area / w;
    const dLat = h / 111320, dLon = w / (111320 * Math.cos((lat * Math.PI) / 180));
    return [[lat, lon], [lat, lon + dLon], [lat - dLat, lon + dLon * 0.97], [lat - dLat * 1.02, lon - dLon * 0.02]].map((p) => [U.round(p[0], 6), U.round(p[1], 6)]);
  }

  function generar(settings) {
    const hoy = U.today();
    const d = (n) => U.addDays(hoy, n);
    const base = (settings && settings.ubicacion) || C.UBICACION_DEFECTO;
    const lat0 = base.lat + 0.004, lon0 = base.lon - 0.006;

    const P = [
      { id: 'p1', nombre: 'Bloque Norte A', codigo: 'BN-A', ha: 8.5, siembra: -440, ind: -152, color: '#f43f5e', off: [0, 0] },
      { id: 'p2', nombre: 'Bloque Norte B', codigo: 'BN-B', ha: 6.2, siembra: -340, ind: -75, color: '#f59e0b', off: [0, 0.0032] },
      { id: 'p3', nombre: 'La Esperanza', codigo: 'LE-01', ha: 10.0, siembra: -262, ind: null, color: '#84cc16', off: [-0.0034, 0] },
      { id: 'p4', nombre: 'El Guayabo', codigo: 'EG-02', ha: 4.8, siembra: -150, ind: null, color: '#10b981', off: [-0.0034, 0.0038] },
      { id: 'p5', nombre: 'Quebrada Honda', codigo: 'QH-01', ha: 7.3, siembra: -38, ind: null, color: '#0ea5e9', off: [-0.0068, 0.0006] },
      { id: 'p6', nombre: 'San Rafael', codigo: 'SR-03', ha: 7.0, siembra: -620, inicio: -215, ciclo: 2, ind: -24, color: '#8b5cf6', off: [-0.0066, 0.0042] }
    ];
    const parcelas = P.map((x, i) => {
      const lat = lat0 + x.off[0], lon = lon0 + x.off[1];
      return {
        id: x.id, nombre: x.nombre, codigo: x.codigo, variedad: 'MD-2', hectareas: x.ha, fechaSiembra: d(x.siembra),
        fechaInicioCiclo: d(x.inicio != null ? x.inicio : x.siembra), fechaInduccion: x.ind != null ? d(x.ind) : null,
        ciclo: x.ciclo || 1, color: x.color, poligono: rect(lat, lon, x.ha, 1.25 + (i % 3) * 0.15),
        notas: i === 0 ? 'Lote con mejor drenaje de la finca. Prioridad de exportación.' : ''
      };
    });

    const insumos = [
      { id: 'i1', nombre: 'Urea 46%', categoria: 'Fertilizante', unidad: 'kg', stock: 1450, stockMinimo: 500, costoUnitario: 0.68, carencia: 0, ingredienteActivo: 'Nitrógeno', proveedor: 'Agroservicios del Norte' },
      { id: 'i2', nombre: 'Fórmula 18-5-15-6-2', categoria: 'Fertilizante', unidad: 'kg', stock: 980, stockMinimo: 400, costoUnitario: 0.92, carencia: 0, ingredienteActivo: 'NPK + Mg + B', proveedor: 'Agroservicios del Norte' },
      { id: 'i3', nombre: 'Ethrel 48 SL', categoria: 'Inductor / Regulador', unidad: 'L', stock: 14, stockMinimo: 6, costoUnitario: 27.5, carencia: 0, ingredienteActivo: 'Etefón', proveedor: 'Bayer' },
      { id: 'i4', nombre: 'Diazinón 60 EC', categoria: 'Insecticida', unidad: 'L', stock: 4.5, stockMinimo: 8, costoUnitario: 21.8, carencia: 7, ingredienteActivo: 'Diazinón', proveedor: 'Agrocentro' },
      { id: 'i5', nombre: 'Fosetil-Al 80 WG', categoria: 'Fungicida', unidad: 'kg', stock: 32, stockMinimo: 10, costoUnitario: 23.9, carencia: 14, ingredienteActivo: 'Fosetil aluminio', proveedor: 'Agrocentro' },
      { id: 'i6', nombre: 'Diurón 80 WG', categoria: 'Herbicida', unidad: 'kg', stock: 22, stockMinimo: 10, costoUnitario: 13.6, carencia: 0, ingredienteActivo: 'Diurón', proveedor: 'Agroservicios del Norte' },
      { id: 'i7', nombre: 'Caolín protector solar', categoria: 'Protector solar', unidad: 'kg', stock: 380, stockMinimo: 150, costoUnitario: 0.85, carencia: 0, ingredienteActivo: 'Caolín', proveedor: 'Minerales CR' },
      { id: 'i8', nombre: 'Adherente agrícola', categoria: 'Coadyuvante', unidad: 'L', stock: 18, stockMinimo: 5, costoUnitario: 8.9, carencia: 0, ingredienteActivo: 'Alquil aril poliglicol éter', proveedor: 'Agrocentro' }
    ];
    const ins = (id) => insumos.find((x) => x.id === id);
    const line = (id, dosisHa, ha) => ({ insumoId: id, dosisHa, cantidad: U.round(dosisHa * ha, 2), costoUnitario: ins(id).costoUnitario, nombre: ins(id).nombre, unidad: ins(id).unidad, carencia: ins(id).carencia });
    const ha = (pid) => P.find((x) => x.id === pid).ha;
    const resp = ['Cuadrilla 1 · J. Rojas', 'Cuadrilla 2 · M. Solano', 'Cuadrilla 3 · L. Araya'];

    const labores = [];
    const L = (pid, tipo, dias, extra) => {
      const h = ha(pid);
      const l = Object.assign({ id: 'l' + (labores.length + 1), parcelaId: pid, tipo, fecha: d(dias), estado: dias > 0 ? 'pendiente' : 'completada', responsable: resp[labores.length % 3], jornales: Math.round(h * 1.5), costoManoObra: Math.round(h * 1.5 * 22), otrosCostos: 0, insumos: [] }, extra || {});
      l.insumos = (l.insumos || []).map((x) => line(x[0], x[1], h));
      labores.push(l);
    };
    // Bloque Norte A (en cosecha)
    L('p1', 'Fertilización', -210, { descripcion: 'Fertilización granulada pre-inducción', insumos: [['i2', 180]] });
    L('p1', 'Inducción floral', -152, { descripcion: 'Forzamiento nocturno con etefón + urea', insumos: [['i3', 1.2], ['i1', 15]], otrosCostos: 120 });
    L('p1', 'Protección solar', -60, { descripcion: 'Aplicación de caolín a fruta', insumos: [['i7', 25]] });
    L('p1', 'Aplicación fitosanitaria', -4, { descripcion: 'Control de cochinilla en focos', insumos: [['i4', 0.8], ['i8', 0.3]] });
    L('p1', 'Cosecha', 2, { descripcion: 'Primer pase de cosecha · exportación', jornales: 24, costoManoObra: 640 });
    // Bloque Norte B (fruto)
    L('p2', 'Fertilización', -120, { descripcion: 'Fertilización foliar', insumos: [['i1', 20], ['i2', 60]] });
    L('p2', 'Inducción floral', -75, { descripcion: 'Forzamiento floral', insumos: [['i3', 1.2], ['i1', 15]], otrosCostos: 90 });
    L('p2', 'Control de malezas', -30, { descripcion: 'Herbicida pre-emergente en calles', insumos: [['i6', 2.5]] });
    L('p2', 'Protección solar', 5, { descripcion: 'Primera aplicación de caolín', insumos: [['i7', 25]] });
    // La Esperanza (pre-inducción)
    L('p3', 'Fertilización', -95, { descripcion: 'Fertilización vegetativa', insumos: [['i2', 150]] });
    L('p3', 'Aplicación fitosanitaria', -40, { descripcion: 'Prevención de Phytophthora', insumos: [['i5', 3]] });
    L('p3', 'Fertilización', -12, { descripcion: 'Fertilización pre-inducción', insumos: [['i1', 25], ['i2', 80]] });
    L('p3', 'Inducción floral', 6, { descripcion: 'Forzamiento programado', insumos: [['i3', 1.2], ['i1', 15]] });
    // El Guayabo (vegetativo)
    L('p4', 'Fertilización', -70, { descripcion: 'Fertilización de crecimiento', insumos: [['i2', 120]] });
    L('p4', 'Control de malezas', -18, { descripcion: 'Deshierba manual + herbicida dirigido', insumos: [['i6', 2]] });
    L('p4', 'Muestreo', -4, { descripcion: 'Muestreo foliar para análisis nutricional', jornales: 2, costoManoObra: 44 });
    // Quebrada Honda (establecimiento)
    L('p5', 'Preparación de suelo', -55, { descripcion: 'Subsolado, rastra y encamado', jornales: 4, costoManoObra: 120, otrosCostos: 2900 });
    L('p5', 'Siembra', -38, { descripcion: 'Siembra de hijos MD-2 · 65 000 plantas/ha', jornales: 60, costoManoObra: 1450, otrosCostos: 4200 });
    L('p5', 'Drenajes y mantenimiento', -20, { descripcion: 'Limpieza de canales de drenaje', jornales: 6, costoManoObra: 150 });
    L('p5', 'Fertilización', -3, { descripcion: 'Primera fertilización de arranque', insumos: [['i1', 15], ['i2', 60]], estado: 'pendiente' });
    L('p5', 'Aplicación fitosanitaria', 10, { descripcion: 'Preventivo sinfílidos y cochinilla', insumos: [['i4', 1], ['i8', 0.3]] });
    // San Rafael (soca, floración)
    L('p6', 'Fertilización', -110, { descripcion: 'Fertilización de soca', insumos: [['i2', 160]] });
    L('p6', 'Inducción floral', -24, { descripcion: 'Forzamiento de soca', insumos: [['i3', 1.2], ['i1', 15]], otrosCostos: 80 });
    L('p6', 'Aplicación fitosanitaria', -16, { descripcion: 'Control de Phytophthora post lluvias', insumos: [['i5', 3], ['i8', 0.3]] });
    L('p6', 'Drenajes y mantenimiento', 1, { descripcion: 'Reparación de canal principal', jornales: 4, costoManoObra: 100 });
    labores.forEach((l) => {
      l.costoInsumos = U.round(U.sum(l.insumos, (x) => x.cantidad * x.costoUnitario), 2);
      l.costoTotal = U.round(l.costoManoObra + l.costoInsumos + l.otrosCostos, 2);
      l.stockAplicado = l.estado === 'completada';
    });

    const movimientos = [];
    insumos.forEach((i) => movimientos.push({ insumoId: i.id, fecha: d(-230), tipo: 'entrada', cantidad: i.stock, costoUnitario: i.costoUnitario, nota: 'Inventario inicial' }));
    labores.filter((l) => l.stockAplicado).forEach((l) => l.insumos.forEach((li) => movimientos.push({ insumoId: li.insumoId, fecha: l.fecha, tipo: 'salida', cantidad: li.cantidad, costoUnitario: li.costoUnitario, referencia: l.id, nota: l.tipo + ' · ' + P.find((x) => x.id === l.parcelaId).nombre })));
    // Compras para que el stock final quede coherente con lo consumido
    const consumo = U.groupBy(movimientos.filter((m) => m.tipo === 'salida'), (m) => m.insumoId);
    insumos.forEach((i) => { const c = U.sum(consumo[i.id] || [], (m) => m.cantidad); if (c) movimientos.push({ insumoId: i.id, fecha: d(-180), tipo: 'entrada', cantidad: U.round(c, 2), costoUnitario: i.costoUnitario, nota: 'Compra' }); });

    const cosechas = [
      { parcelaId: 'p6', fecha: d(-232), toneladas: 268, cajas: 21400, exportable: 86, brix: 14.2, precio: 300, destino: 'Exportación', comprador: 'Exportadora del Caribe', ciclo: 1 },
      { parcelaId: 'p6', fecha: d(-224), toneladas: 214, cajas: 16900, exportable: 82, brix: 13.8, precio: 295, destino: 'Exportación', comprador: 'Exportadora del Caribe', ciclo: 1 },
      { parcelaId: 'p6', fecha: d(-215), toneladas: 128, exportable: 0, brix: 13.1, precio: 120, destino: 'Mercado nacional', comprador: 'Feria del Agricultor', ciclo: 1, cierraCiclo: true, cicloCerrado: true },
      { parcelaId: 'p6', fecha: d(-214), toneladas: 46, precio: 60, destino: 'Industria', comprador: 'Procesadora de Jugos', ciclo: 1 }
    ];

    const monitoreos = [
      { parcelaId: 'p1', fecha: d(-11), plaga: 'cochinilla', severidad: 3, incidencia: 8, muestras: 100, accion: 'Aplicación focalizada de insecticida', notas: 'Focos en borde oeste' },
      { parcelaId: 'p1', fecha: d(-2), plaga: 'tecla', severidad: 2, incidencia: 3, muestras: 100, accion: 'Monitoreo semanal', notas: '' },
      { parcelaId: 'p2', fecha: d(-6), plaga: 'mosca', severidad: 2, incidencia: 5, muestras: 80, accion: 'Manejo de rastrojo', notas: 'Asociada a rastrojo de lote vecino' },
      { parcelaId: 'p3', fecha: d(-26), plaga: 'phytophthora', severidad: 2, incidencia: 4, muestras: 120, accion: 'Fungicida preventivo', notas: '' },
      { parcelaId: 'p4', fecha: d(-9), plaga: 'sinfilidos', severidad: 3, incidencia: 12, muestras: 60, accion: 'Evaluar nematicida/insecticida al suelo', notas: 'Raíces con daño moderado' },
      { parcelaId: 'p6', fecha: d(-17), plaga: 'phytophthora', severidad: 4, incidencia: 15, muestras: 100, accion: 'Fosetil-Al + mejora de drenaje', notas: 'Zona baja con encharcamiento' },
      { parcelaId: 'p6', fecha: d(-5), plaga: 'phytophthora', severidad: 2, incidencia: 6, muestras: 100, accion: 'Seguimiento', notas: 'Buena respuesta al tratamiento' }
    ];

    return {
      settings: Object.assign({}, settings, { finca: settings && settings.finca && settings.finca !== 'Mi Finca' ? settings.finca : 'Finca La Piñera', onboarded: true }),
      parcelas, insumos, labores, movimientos, cosechas, monitoreos
    };
  }

  AP.demo = { generar };
})(window.AP = window.AP || {});
