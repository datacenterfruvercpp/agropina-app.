/* AgroPiña Enterprise · Generador de fincas de demostración (datos relativos a la fecha actual)
   variante 0: finca principal completa · variante 1: segunda finca más pequeña (para el consolidado multi-finca) */
(function (AP) {
  'use strict';
  const U = AP.utils, C = AP.catalog;

  function rect(lat, lon, ha, ratio) {
    const area = ha * 10000;
    const w = Math.sqrt(area * ratio), h = area / w;
    const dLat = h / 111320, dLon = w / (111320 * Math.cos((lat * Math.PI) / 180));
    return [[lat, lon], [lat, lon + dLon], [lat - dLat, lon + dLon * 0.97], [lat - dLat * 1.02, lon - dLon * 0.02]].map((p) => [U.round(p[0], 6), U.round(p[1], 6)]);
  }

  function generar(settings, variante) {
    variante = variante || 0;
    const hoy = U.today();
    const d = (n) => U.addDays(hoy, n);
    const base = (settings && settings.ubicacion) || C.UBICACION_DEFECTO;
    const lat0 = base.lat + (variante ? -0.032 : 0.004), lon0 = base.lon + (variante ? 0.041 : -0.006);

    const P = variante === 0 ? [
      { id: 'p1', nombre: 'Bloque Norte A', codigo: 'BN-A', ha: 8.5, siembra: -440, ind: -152, color: '#f43f5e', off: [0, 0] },
      { id: 'p2', nombre: 'Bloque Norte B', codigo: 'BN-B', ha: 6.2, siembra: -340, ind: -75, color: '#f59e0b', off: [0, 0.0032] },
      { id: 'p3', nombre: 'La Esperanza', codigo: 'LE-01', ha: 10.0, siembra: -262, ind: null, color: '#84cc16', off: [-0.0034, 0] },
      { id: 'p4', nombre: 'El Guayabo', codigo: 'EG-02', ha: 4.8, siembra: -150, ind: null, color: '#10b981', off: [-0.0034, 0.0038] },
      { id: 'p5', nombre: 'Quebrada Honda', codigo: 'QH-01', ha: 7.3, siembra: -38, ind: null, color: '#0ea5e9', off: [-0.0068, 0.0006] },
      { id: 'p6', nombre: 'San Rafael', codigo: 'SR-03', ha: 7.0, siembra: -620, inicio: -215, ciclo: 2, ind: -24, color: '#8b5cf6', off: [-0.0066, 0.0042] }
    ] : [
      { id: 'p1', nombre: 'Lote Los Robles', codigo: 'LR-01', ha: 12.4, siembra: -455, ind: -158, color: '#f43f5e', off: [0, 0] },
      { id: 'p2', nombre: 'Lote El Cerro', codigo: 'EC-02', ha: 9.1, siembra: -300, ind: -40, color: '#f59e0b', off: [0, 0.0045] },
      { id: 'p3', nombre: 'Lote La Quebrada', codigo: 'LQ-03', ha: 11.6, siembra: -180, ind: null, color: '#10b981', off: [-0.004, 0.001] },
      { id: 'p4', nombre: 'Lote Vivero', codigo: 'VV-04', ha: 3.2, siembra: -70, ind: null, color: '#0ea5e9', off: [-0.004, 0.0052] }
    ];
    const ids = new Set(P.map((x) => x.id));
    const parcelas = P.map((x, i) => {
      const lat = lat0 + x.off[0], lon = lon0 + x.off[1];
      return {
        id: x.id, nombre: x.nombre, codigo: x.codigo, variedad: 'MD-2', hectareas: x.ha, fechaSiembra: d(x.siembra),
        fechaInicioCiclo: d(x.inicio != null ? x.inicio : x.siembra), fechaInduccion: x.ind != null ? d(x.ind) : null,
        ciclo: x.ciclo || 1, color: x.color, poligono: rect(lat, lon, x.ha, 1.25 + (i % 3) * 0.15),
        notas: i === 0 && !variante ? 'Lote con mejor drenaje de la finca. Prioridad de exportación.' : '',
        // Presupuesto propio (el resto usa el estándar de la finca)
        presupuestoHa: x.id === 'p6' && !variante ? { manoObra: 200, insumos: 400, otros: 20 } : null
      };
    });

    const proveedores = [
      { id: 'pv1', nombre: 'Agroservicios del Norte S.A.', identificacion: '3-101-245781', contacto: 'Marta Quesada', telefono: '2460-1180', email: 'ventas@agronorte.cr', diasCredito: 30 },
      { id: 'pv2', nombre: 'Agrocentro Huetar', identificacion: '3-101-388120', contacto: 'Luis Barquero', telefono: '2461-7722', email: 'pedidos@agrocentro.cr', diasCredito: 45 },
      { id: 'pv3', nombre: 'Distribuidora AgroQuímica CR', identificacion: '3-101-102233', contacto: 'Ana Vargas', telefono: '2209-5000', email: 'agro@agroquimicacr.com', diasCredito: 60 },
      { id: 'pv4', nombre: 'Minerales y Calizas CR', identificacion: '3-102-551200', contacto: 'Jorge Mora', telefono: '2552-3344', email: 'info@mineralescr.com', diasCredito: 15 }
    ];
    const insumos = [
      { id: 'i1', nombre: 'Urea 46%', categoria: 'Fertilizante', unidad: 'kg', stock: 1450, stockMinimo: 500, costoUnitario: 0.68, carencia: 0, ingredienteActivo: 'Nitrógeno', proveedor: 'Agroservicios del Norte S.A.', proveedorId: 'pv1' },
      { id: 'i2', nombre: 'Fórmula 18-5-15-6-2', categoria: 'Fertilizante', unidad: 'kg', stock: 980, stockMinimo: 400, costoUnitario: 0.92, carencia: 0, ingredienteActivo: 'NPK + Mg + B', proveedor: 'Agroservicios del Norte S.A.', proveedorId: 'pv1' },
      { id: 'i3', nombre: 'Ethrel 48 SL', categoria: 'Inductor / Regulador', unidad: 'L', stock: 14, stockMinimo: 6, costoUnitario: 27.5, carencia: 0, ingredienteActivo: 'Etefón', proveedor: 'Distribuidora AgroQuímica CR', proveedorId: 'pv3' },
      { id: 'i4', nombre: 'Diazinón 60 EC', categoria: 'Insecticida', unidad: 'L', stock: 4.5, stockMinimo: 8, costoUnitario: 21.8, carencia: 7, ingredienteActivo: 'Diazinón', proveedor: 'Agrocentro Huetar', proveedorId: 'pv2' },
      { id: 'i5', nombre: 'Fosetil-Al 80 WG', categoria: 'Fungicida', unidad: 'kg', stock: 32, stockMinimo: 10, costoUnitario: 23.9, carencia: 14, ingredienteActivo: 'Fosetil aluminio', proveedor: 'Agrocentro Huetar', proveedorId: 'pv2' },
      { id: 'i6', nombre: 'Diurón 80 WG', categoria: 'Herbicida', unidad: 'kg', stock: 22, stockMinimo: 10, costoUnitario: 13.6, carencia: 0, ingredienteActivo: 'Diurón', proveedor: 'Agroservicios del Norte S.A.', proveedorId: 'pv1' },
      { id: 'i7', nombre: 'Caolín protector solar', categoria: 'Protector solar', unidad: 'kg', stock: 380, stockMinimo: 150, costoUnitario: 0.85, carencia: 0, ingredienteActivo: 'Caolín', proveedor: 'Minerales y Calizas CR', proveedorId: 'pv4' },
      { id: 'i8', nombre: 'Adherente agrícola', categoria: 'Coadyuvante', unidad: 'L', stock: 18, stockMinimo: 5, costoUnitario: 8.9, carencia: 0, ingredienteActivo: 'Alquil aril poliglicol éter', proveedor: 'Agrocentro Huetar', proveedorId: 'pv2' }
    ];
    const ins = (id) => insumos.find((x) => x.id === id);
    const line = (id, dosisHa, ha) => ({ insumoId: id, dosisHa, cantidad: U.round(dosisHa * ha, 2), costoUnitario: ins(id).costoUnitario, nombre: ins(id).nombre, unidad: ins(id).unidad, carencia: ins(id).carencia });
    const ha = (pid) => P.find((x) => x.id === pid).ha;

    const nombres = variante === 0
      ? ['José Rojas Alfaro', 'María Solano Brenes', 'Luis Araya Mora', 'Carlos Jiménez Vega', 'Ana Quesada Rodríguez', 'Pedro Castro Salas', 'Rosa Vargas Chaves', 'Jorge Méndez Ulate', 'Diego Herrera Soto', 'Karla Navarro Díaz']
      : ['Esteban Calderón Rojas', 'Marcela Arias León', 'Andrés Porras Vindas', 'Silvia Mata Céspedes', 'Óscar Brenes Leiva', 'Hugo Ramírez Solís'];
    const puestos = ['Mandador', 'Aplicador', 'Peón agrícola', 'Peón agrícola', 'Cosechero', 'Peón agrícola', 'Aplicador', 'Operador de maquinaria', 'Peón agrícola', 'Bodeguero'];
    const trabajadores = nombres.map((n, i) => ({
      id: 't' + (i + 1), nombre: n, identificacion: (i % 2 ? '2-' : '1-') + String(1000 + i * 137).padStart(4, '0') + '-' + String(300 + i * 71).padStart(4, '0'),
      cuadrilla: 'Cuadrilla ' + ((i % 3) + 1), puesto: puestos[i % puestos.length], tarifaJornal: puestos[i % puestos.length] === 'Mandador' ? 34 : puestos[i % puestos.length] === 'Aplicador' || puestos[i % puestos.length] === 'Operador de maquinaria' ? 28 : 24,
      telefono: '8' + String(3100000 + i * 54321).slice(0, 3) + '-' + String(1000 + i * 913).slice(0, 4), activo: !(variante === 0 && i === 9), fechaIngreso: d(-900 + i * 60)
    }));
    const activos = trabajadores.filter((t) => t.activo);

    const labores = [];
    const L = (pid, tipo, dias, extra) => {
      if (!ids.has(pid)) return;
      const h = ha(pid);
      const n = labores.length;
      const estado = dias > 0 ? 'pendiente' : 'completada';
      const l = Object.assign({ id: 'l' + (n + 1), parcelaId: pid, tipo, fecha: d(dias), estado, prioridad: 'media', responsable: 'Cuadrilla ' + ((n % 3) + 1), jornales: Math.round(h * 1.5), costoManoObra: 0, otrosCostos: 0, insumos: [] }, extra || {});
      l.insumos = (l.insumos || []).map((x) => line(x[0], x[1], h));
      // Reparto de jornales entre 2–3 trabajadores de la cuadrilla con su tarifa
      const equipo = [activos[n % activos.length], activos[(n + 3) % activos.length], activos[(n + 5) % activos.length]].slice(0, l.jornales > 6 ? 3 : 2);
      // Medios jornales: el último trabajador recibe el resto para que la suma cuadre con el total
      let resto = l.jornales;
      const partes = equipo.map((t, k) => {
        const j = k === equipo.length - 1 ? resto : Math.round((l.jornales / equipo.length) * 2) / 2;
        resto -= j;
        return { trabajadorId: t.id, nombre: t.nombre, tarifa: t.tarifaJornal, jornales: j };
      });
      l.trabajadores = partes;
      l.jornales = U.round(U.sum(partes, (x) => x.jornales), 2);
      l.costoManoObra = U.round(U.sum(partes, (x) => x.jornales * x.tarifa), 2);
      labores.push(l);
    };
    // Lote 1 (en cosecha)
    L('p1', 'Fertilización', -210, { descripcion: 'Fertilización granulada pre-inducción', insumos: [['i2', 180]] });
    L('p1', 'Inducción floral', -152, { descripcion: 'Forzamiento nocturno con etefón + urea', insumos: [['i3', 1.2], ['i1', 15]], otrosCostos: 120 });
    L('p1', 'Protección solar', -60, { descripcion: 'Aplicación de caolín a fruta', insumos: [['i7', 25]] });
    L('p1', 'Aplicación fitosanitaria', -4, { descripcion: 'Control de cochinilla en focos', insumos: [['i4', 0.8], ['i8', 0.3]], prioridad: 'alta' });
    L('p1', 'Cosecha', 2, { descripcion: 'Primer pase de cosecha · exportación', jornales: 24, prioridad: 'alta' });
    // Lote 2 (fruto)
    L('p2', 'Fertilización', -120, { descripcion: 'Fertilización foliar', insumos: [['i1', 20], ['i2', 60]] });
    L('p2', 'Inducción floral', -75, { descripcion: 'Forzamiento floral', insumos: [['i3', 1.2], ['i1', 15]], otrosCostos: 90 });
    L('p2', 'Control de malezas', -30, { descripcion: 'Herbicida pre-emergente en calles', insumos: [['i6', 2.5]] });
    L('p2', 'Protección solar', 5, { descripcion: 'Primera aplicación de caolín', insumos: [['i7', 25]] });
    // Lote 3 (pre-inducción)
    L('p3', 'Fertilización', -95, { descripcion: 'Fertilización vegetativa', insumos: [['i2', 150]] });
    L('p3', 'Aplicación fitosanitaria', -40, { descripcion: 'Prevención de Phytophthora', insumos: [['i5', 3]] });
    L('p3', 'Fertilización', -12, { descripcion: 'Fertilización pre-inducción', insumos: [['i1', 25], ['i2', 80]] });
    L('p3', 'Inducción floral', 6, { descripcion: 'Forzamiento programado', insumos: [['i3', 1.2], ['i1', 15]], prioridad: 'alta' });
    // Lote 4 (vegetativo)
    L('p4', 'Fertilización', -70, { descripcion: 'Fertilización de crecimiento', insumos: [['i2', 120]] });
    L('p4', 'Control de malezas', -18, { descripcion: 'Deshierba manual + herbicida dirigido', insumos: [['i6', 2]] });
    L('p4', 'Muestreo', -4, { descripcion: 'Muestreo foliar para análisis nutricional', jornales: 2, prioridad: 'baja' });
    L('p4', 'Drenajes y mantenimiento', 0, { descripcion: 'Reconformación de canales secundarios', jornales: 6, estado: 'en_proceso' });
    // Lote 5 (establecimiento)
    L('p5', 'Preparación de suelo', -55, { descripcion: 'Subsolado, rastra y encamado', jornales: 4, otrosCostos: 2900 });
    L('p5', 'Siembra', -38, { descripcion: 'Siembra de hijos MD-2 · 65 000 plantas/ha', jornales: 60, otrosCostos: 4200 });
    L('p5', 'Drenajes y mantenimiento', -20, { descripcion: 'Limpieza de canales de drenaje', jornales: 6 });
    L('p5', 'Fertilización', -3, { descripcion: 'Primera fertilización de arranque', insumos: [['i1', 15], ['i2', 60]], estado: 'pendiente', prioridad: 'alta' });
    L('p5', 'Aplicación fitosanitaria', 10, { descripcion: 'Preventivo sinfílidos y cochinilla', insumos: [['i4', 1], ['i8', 0.3]] });
    // Lote 6 (soca, floración)
    L('p6', 'Fertilización', -110, { descripcion: 'Fertilización de soca', insumos: [['i2', 160]] });
    L('p6', 'Inducción floral', -24, { descripcion: 'Forzamiento de soca', insumos: [['i3', 1.2], ['i1', 15]], otrosCostos: 80 });
    L('p6', 'Aplicación fitosanitaria', -16, { descripcion: 'Control de Phytophthora post lluvias', insumos: [['i5', 3], ['i8', 0.3]] });
    L('p6', 'Drenajes y mantenimiento', 1, { descripcion: 'Reparación de canal principal', jornales: 4, prioridad: 'baja' });
    labores.forEach((l) => {
      l.costoInsumos = U.round(U.sum(l.insumos, (x) => x.cantidad * x.costoUnitario), 2);
      l.costoTotal = U.round(l.costoManoObra + l.costoInsumos + l.otrosCostos, 2);
      l.stockAplicado = l.estado === 'completada';
    });

    const movimientos = [];
    insumos.forEach((i) => movimientos.push({ insumoId: i.id, fecha: d(-230), tipo: 'entrada', cantidad: i.stock, costoUnitario: i.costoUnitario, nota: 'Inventario inicial' }));
    labores.filter((l) => l.stockAplicado).forEach((l) => l.insumos.forEach((li) => movimientos.push({ insumoId: li.insumoId, fecha: l.fecha, tipo: 'salida', cantidad: li.cantidad, costoUnitario: li.costoUnitario, referencia: l.id, nota: l.tipo + ' · ' + P.find((x) => x.id === l.parcelaId).nombre })));
    // Compras que dejan el stock final coherente con lo consumido (OC-0001, ya recibida)
    const consumo = U.groupBy(movimientos.filter((m) => m.tipo === 'salida'), (m) => m.insumoId);
    const lineasOC1 = [];
    insumos.forEach((i) => {
      const c = U.round(U.sum(consumo[i.id] || [], (m) => m.cantidad), 2);
      if (!c) return;
      movimientos.push({ insumoId: i.id, fecha: d(-180), tipo: 'entrada', cantidad: c, costoUnitario: i.costoUnitario, referencia: 'o1', nota: 'Recepción OC-0001' });
      lineasOC1.push({ insumoId: i.id, cantidad: c, costoUnitario: i.costoUnitario, nombre: i.nombre, unidad: i.unidad });
    });
    const ordenes = [
      { id: 'o1', numero: 'OC-0001', proveedorId: 'pv1', fecha: d(-186), fechaEntrega: d(-180), estado: 'recibida', fechaRecepcion: d(-180), lineas: lineasOC1, notas: 'Reposición general de insumos' },
      { id: 'o2', numero: 'OC-0002', proveedorId: 'pv2', fecha: d(-9), fechaEntrega: d(-2), estado: 'aprobada', lineas: [{ insumoId: 'i4', cantidad: 20, costoUnitario: 21.4 }, { insumoId: 'i8', cantidad: 10, costoUnitario: 8.9 }], notas: 'Urgente: Diazinón bajo mínimo' },
      { id: 'o3', numero: 'OC-0003', proveedorId: 'pv3', fecha: d(-1), fechaEntrega: d(6), estado: 'borrador', lineas: [{ insumoId: 'i3', cantidad: 24, costoUnitario: 27.1 }], notas: 'Etefón para inducciones de noviembre' }
    ].map((o) => Object.assign(o, { lineas: o.lineas.map((l) => Object.assign({ nombre: ins(l.insumoId).nombre, unidad: ins(l.insumoId).unidad }, l)) }));

    const clientes = [
      { id: 'c1', nombre: 'Exportadora del Caribe S.A.', identificacion: '3-101-600123', tipo: 'Exportadora', contacto: 'Ricardo Soto', telefono: '2758-0099', email: 'compras@expocaribe.cr', diasCredito: 30 },
      { id: 'c2', nombre: 'Feria del Agricultor San Carlos', identificacion: '3-002-145001', tipo: 'Mercado nacional', contacto: 'Comité de feria', telefono: '2460-3030', email: 'feria@sancarlos.cr', diasCredito: 8 },
      { id: 'c3', nombre: 'Procesadora de Jugos del Norte', identificacion: '3-101-712400', tipo: 'Industria', contacto: 'Patricia Lobo', telefono: '2475-8800', email: 'materia.prima@jugosnorte.cr', diasCredito: 45 }
    ];
    const cosechas = !ids.has('p6') ? [
      { parcelaId: 'p1', fecha: d(-12), toneladas: 210, cajas: 16800, exportable: 84, brix: 13.9, precio: 290, destino: 'Exportación', clienteId: 'c1', factura: 'FE-0108', estadoPago: 'pendiente', ciclo: 1 }
    ] : [
      { parcelaId: 'p6', fecha: d(-232), toneladas: 268, cajas: 21400, exportable: 86, brix: 14.2, precio: 300, destino: 'Exportación', clienteId: 'c1', factura: 'FE-0091', estadoPago: 'pagado', fechaPago: d(-200), ciclo: 1 },
      { parcelaId: 'p6', fecha: d(-224), toneladas: 214, cajas: 16900, exportable: 82, brix: 13.8, precio: 295, destino: 'Exportación', clienteId: 'c1', factura: 'FE-0094', estadoPago: 'pagado', fechaPago: d(-190), ciclo: 1 },
      { parcelaId: 'p6', fecha: d(-215), toneladas: 128, exportable: 0, brix: 13.1, precio: 120, destino: 'Mercado nacional', clienteId: 'c2', factura: 'FE-0097', estadoPago: 'pagado', fechaPago: d(-206), ciclo: 1, cierraCiclo: true, cicloCerrado: true },
      { parcelaId: 'p6', fecha: d(-214), toneladas: 46, precio: 60, destino: 'Industria', clienteId: 'c3', factura: 'FE-0098', estadoPago: 'pendiente', ciclo: 1 },
      { parcelaId: 'p1', fecha: d(-1), toneladas: 32, cajas: 2560, exportable: 88, brix: 14.4, precio: 305, destino: 'Exportación', clienteId: 'c1', factura: 'FE-0112', estadoPago: 'pendiente', ciclo: 1 }
    ];
    cosechas.forEach((c) => { c.comprador = clientes.find((x) => x.id === c.clienteId).nombre; });

    const monitoreos = [
      { parcelaId: 'p1', fecha: d(-11), plaga: 'cochinilla', severidad: 3, incidencia: 8, muestras: 100, accion: 'Aplicación focalizada de insecticida', notas: 'Focos en borde oeste' },
      { parcelaId: 'p1', fecha: d(-2), plaga: 'tecla', severidad: 2, incidencia: 3, muestras: 100, accion: 'Monitoreo semanal', notas: '' },
      { parcelaId: 'p2', fecha: d(-6), plaga: 'mosca', severidad: 2, incidencia: 5, muestras: 80, accion: 'Manejo de rastrojo', notas: 'Asociada a rastrojo de lote vecino' },
      { parcelaId: 'p3', fecha: d(-26), plaga: 'phytophthora', severidad: 2, incidencia: 4, muestras: 120, accion: 'Fungicida preventivo', notas: '' },
      { parcelaId: 'p4', fecha: d(-9), plaga: 'sinfilidos', severidad: 3, incidencia: 12, muestras: 60, accion: 'Evaluar nematicida/insecticida al suelo', notas: 'Raíces con daño moderado' },
      { parcelaId: 'p6', fecha: d(-17), plaga: 'phytophthora', severidad: 4, incidencia: 15, muestras: 100, accion: 'Fosetil-Al + mejora de drenaje', notas: 'Zona baja con encharcamiento' },
      { parcelaId: 'p6', fecha: d(-5), plaga: 'phytophthora', severidad: 2, incidencia: 6, muestras: 100, accion: 'Seguimiento', notas: 'Buena respuesta al tratamiento' }
    ].filter((m) => ids.has(m.parcelaId));

    const nombreFinca = variante === 1 ? 'Finca El Roble' : (settings && settings.finca && settings.finca !== 'Mi Finca' ? settings.finca : 'Finca La Piñera');
    return {
      settings: Object.assign({}, settings, {
        finca: nombreFinca, onboarded: true, ubicacion: variante === 1 ? null : settings && settings.ubicacion,
        // Presupuesto estándar a la escala de los costos de la demostración
        presupuestoHa: { manoObra: 240, insumos: 400, otros: 60 }
      }),
      parcelas, insumos, labores, movimientos, cosechas, monitoreos, trabajadores, proveedores, ordenes, clientes,
      auditoria: [{ fecha: new Date().toISOString(), usuario: 'Sistema', accion: 'Cargar', entidad: 'Demostración', descripcion: 'Datos de ejemplo de ' + nombreFinca }]
    };
  }

  AP.demo = { generar };
})(window.AP = window.AP || {});
