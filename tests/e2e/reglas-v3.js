// Reglas de negocio de la v3 (ERP): migración v2 → v3, multi-finca, orden de compra → inventario,
// orden de trabajo con personal → costo y planilla, cobros, auditoría, respaldo completo y libro Excel.
// Uso: node tests/e2e/reglas-v3.js   (servidor en http://localhost:8765, ver LEEME.md)
const path = require('path');
const { chromium } = require('playwright');
const XLSX = require(path.join(__dirname, '..', '..', 'node_modules', 'xlsx'));

const fallos = [];
const ok = (cond, msg, extra) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); if (!cond) fallos.push(msg); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route(/open-meteo|arcgisonline|openstreetmap/, (r) => r.abort());

  console.log('1) Migración desde v2');
  await page.goto('http://localhost:8765/index.html');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('agropina_v2', JSON.stringify({
      app: 'AgroPiña Pro', version: 2,
      settings: { finca: 'Finca Vieja', moneda: 'CRC', tema: 'dark' },
      parcelas: [{ id: 'a1', nombre: 'Lote 1', variedad: 'MD-2', hectareas: 4, fechaSiembra: '2026-01-10' }],
      labores: [{ id: 'x1', parcelaId: 'a1', tipo: 'Fertilización', fecha: '2026-05-01', estado: 'pendiente', costoManoObra: 50 }],
      cosechas: [{ id: 'k1', parcelaId: 'a1', fecha: '2026-06-01', toneladas: 3, precio: 200 }]
    }));
  });
  await page.reload(); await page.waitForTimeout(900);
  const mig = await page.evaluate(() => {
    const s = AP.store.state;
    return { fincas: s.fincas.length, nombre: s.settings.finca, moneda: s.settings.moneda, tema: s.prefs.tema, dark: document.documentElement.classList.contains('dark'),
      parcelas: s.parcelas.length, labor: s.labores[0].estado, prioridad: s.labores[0].prioridad, pago: s.cosechas[0].estadoPago, temaEnSettings: 'tema' in s.settings,
      v3: !!localStorage.getItem('agropina_v3') };
  });
  ok(mig.fincas === 1 && mig.nombre === 'Finca Vieja' && mig.moneda === 'CRC', 'datos y ajustes de la v2 conservados', mig);
  ok(mig.tema === 'dark' && mig.dark && !mig.temaEnSettings, 'el tema pasa a preferencias globales');
  ok(mig.labor === 'pendiente' && mig.prioridad === 'media' && mig.pago === 'pagado', 'labores y cosechas reciben los campos nuevos');
  ok(mig.v3, 'se guarda en agropina_v3');
  await page.reload(); await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'el script temprano aplica el tema oscuro antes de montar la app');

  console.log('2) Multi-finca');
  const mf = await page.evaluate(async () => {
    const S = AP.store, st = S.state;
    st.prefs.tema = 'light';
    S.loadDemo(); await new Promise((r) => setTimeout(r, 50));
    const fincas = st.fincas.map((f) => f.nombre);
    const a = { id: st.fincaActiva, parcelas: st.parcelas.length, primera: st.parcelas[0].nombre };
    const otra = st.fincas.find((f) => f.id !== st.fincaActiva).id;
    S.cambiarFinca(otra);
    const bb = { id: st.fincaActiva, parcelas: st.parcelas.length, primera: st.parcelas[0].nombre, finca: st.settings.finca };
    S.cambiarFinca(a.id);
    const vuelta = { parcelas: st.parcelas.length, primera: st.parcelas[0].nombre };
    const nueva = S.crearFinca({ nombre: 'Finca Prueba', copiarCatalogos: true });
    const n = { activa: st.fincaActiva === nueva, parcelas: st.parcelas.length, insumos: st.insumos.length, stock: st.insumos.reduce((x, i) => x + i.stock, 0), personal: st.trabajadores.length };
    const cons = S.todasLasFincas().map((f) => AP.negocio.resumenFinca(f.datos, st.hoy).parcelas);
    return { fincas, a, bb, vuelta, n, cons, total: st.fincas.length };
  });
  ok(mf.fincas.length === 2, 'la demostración agrega una segunda finca', mf.fincas);
  ok(mf.bb.finca === 'Finca El Roble' && mf.bb.primera !== mf.a.primera, 'cambiar de finca carga sus propios datos', mf.bb);
  ok(mf.vuelta.parcelas === mf.a.parcelas && mf.vuelta.primera === mf.a.primera, 'al volver se recuperan los datos intactos');
  ok(mf.n.activa && mf.n.parcelas === 0 && mf.n.insumos > 0 && mf.n.stock === 0 && mf.n.personal > 0, 'finca nueva con catálogos copiados y stock en cero', mf.n);
  ok(mf.cons.join(',') === [mf.a.parcelas, 4, 0].join(','), 'consolidado de las tres fincas', mf.cons);
  await page.waitForTimeout(400); await page.reload(); await page.waitForTimeout(600);
  const per = await page.evaluate(() => ({ n: AP.store.state.fincas.length, activa: AP.store.state.settings.finca }));
  ok(per.n === 3 && per.activa === 'Finca Prueba', 'fincas y finca activa persisten tras recargar', per);
  const elim = await page.evaluate(async () => {
    const S = AP.store, st = S.state;
    const id = st.fincaActiva;
    const p = S.eliminarFinca(id);
    await new Promise((r) => setTimeout(r, 50));
    const btn = [...document.querySelectorAll('button')].find((x) => /Eliminar finca/.test(x.textContent));
    if (btn) btn.click();
    await p;
    return { n: st.fincas.length, activa: st.settings.finca };
  });
  ok(elim.n === 2 && elim.activa !== 'Finca Prueba', 'eliminar la finca activa cambia a otra', elim);

  console.log('3) Compras → inventario');
  const oc = await page.evaluate(() => {
    const S = AP.store, st = S.state;
    if (st.fincaActiva !== st.fincas[0].id) S.cambiarFinca(st.fincas[0].id, { silent: true });
    const i = S.insumo('i4'); const s0 = i.stock, c0 = i.costoUnitario;
    const o = S.saveOrden({ proveedorId: 'pv2', fecha: st.hoy, lineas: [{ insumoId: 'i4', cantidad: 10, costoUnitario: 25 }] });
    const numero = o.numero, estado0 = o.estado, total = o.total;
    S.aprobarOrden(o.id); const estado1 = S.state.ordenes.find((x) => x.id === o.id).estado;
    S.recibirOrden(o.id);
    const o2 = st.ordenes.find((x) => x.id === o.id);
    const mov = st.movimientos.filter((m) => m.referencia === o.id);
    return { numero, estado0, estado1, estado2: o2.estado, total, s0, s1: i.stock, c0, c1: i.costoUnitario, mov: mov.length, esperado: Math.round(((s0 * c0 + 10 * 25) / (s0 + 10)) * 10000) / 10000 };
  });
  ok(/^OC-\d{4}$/.test(oc.numero) && oc.estado0 === 'borrador' && oc.estado1 === 'aprobada' && oc.estado2 === 'recibida', 'flujo borrador → aprobada → recibida', oc.numero);
  ok(oc.total === 250, 'total de la orden', oc.total);
  ok(Math.abs(oc.s1 - (oc.s0 + 10)) < 1e-9 && oc.mov === 1, 'la recepción suma el stock y deja el movimiento con referencia', [oc.s0, oc.s1]);
  ok(Math.abs(oc.c1 - oc.esperado) < 1e-4, 'costo promedio ponderado', [oc.c0, oc.c1]);

  console.log('4) Orden de trabajo con personal → costo y planilla');
  const ot = await page.evaluate(() => {
    const S = AP.store, st = S.state, B = AP.negocio;
    const t1 = st.trabajadores.find((t) => t.activo), t2 = st.trabajadores.filter((t) => t.activo)[1];
    const p0 = B.planilla(st.labores, st.trabajadores, st.hoy, st.hoy).totalMonto;
    const l = S.saveLabor({ parcelaId: 'p2', tipo: 'Control de malezas', fecha: st.hoy, estado: 'pendiente', prioridad: 'alta', trabajadores: [{ trabajadorId: t1.id, jornales: 2 }, { trabajadorId: t2.id, jornales: 1.5, tarifa: 30 }] });
    const costo = l.costoManoObra, esperado = 2 * t1.tarifaJornal + 1.5 * 30;
    const enPlanillaAntes = B.planilla(st.labores, st.trabajadores, st.hoy, st.hoy).totalMonto - p0;
    S.cambiarEstadoLabor(l.id, 'en_proceso');
    const proc = st.labores.find((x) => x.id === l.id).estado;
    S.completarLabor(l.id);
    const fin = st.labores.find((x) => x.id === l.id).estado;
    const enPlanilla = B.planilla(st.labores, st.trabajadores, st.hoy, st.hoy).totalMonto - p0;
    return { costo, esperado, enPlanillaAntes, proc, fin, enPlanilla: Math.round(enPlanilla * 100) / 100, jornales: l.jornales };
  });
  ok(ot.costo === ot.esperado && ot.jornales === 3.5, 'la mano de obra se calcula con las tarifas del personal', ot);
  ok(ot.enPlanillaAntes === 0, 'una orden programada no entra en la planilla');
  ok(ot.proc === 'en_proceso' && ot.fin === 'completada', 'cambio de estado en proceso → realizada');
  ok(Math.abs(ot.enPlanilla - ot.esperado) < 0.01, 'al completarla entra en la planilla', ot.enPlanilla);

  console.log('5) Ventas y cobros');
  const cx = await page.evaluate(() => {
    const S = AP.store, st = S.state;
    const n0 = S.cxc.value.length, m0 = S.cxc.value.reduce((x, c) => x + c.monto, 0);
    const c = S.saveCosecha({ parcelaId: 'p2', fecha: st.hoy, toneladas: 10, precio: 300, destino: 'Exportación', clienteId: 'c1', factura: 'FE-9999', estadoPago: 'pendiente' });
    const n1 = S.cxc.value.length, doc = S.cxc.value.find((x) => x.cosechaId === c.id);
    S.registrarCobro(c.id);
    const n2 = S.cxc.value.length, m2 = S.cxc.value.reduce((x, k) => x + k.monto, 0);
    const c2 = st.cosechas.find((x) => x.id === c.id);
    return { n0, n1, n2, m0, m2, monto: doc && doc.monto, comprador: c2.comprador, pago: c2.estadoPago, fechaPago: c2.fechaPago === st.hoy };
  });
  ok(cx.n1 === cx.n0 + 1 && cx.monto === 3000, 'la venta a crédito entra en cuentas por cobrar', cx);
  ok(cx.n2 === cx.n0 && Math.abs(cx.m2 - cx.m0) < 0.01 && cx.pago === 'pagado' && cx.fechaPago, 'el cobro la saca de la cartera');
  ok(!!cx.comprador, 'el comprador se toma del cliente', cx.comprador);

  console.log('6) Auditoría');
  const au = await page.evaluate(() => {
    const st = AP.store.state;
    st.prefs.usuario.nombre = 'María Auditora';
    AP.store.saveCliente({ nombre: 'Cliente Auditado', diasCredito: 15 });
    const a = st.auditoria[0];
    return { n: st.auditoria.length, ultimo: [a.usuario, a.accion, a.entidad, a.descripcion], acciones: [...new Set(st.auditoria.map((x) => x.accion))] };
  });
  ok(au.ultimo[0] === 'María Auditora' && au.ultimo[2] === 'Cliente', 'cada acción queda registrada con el usuario', au.ultimo);
  ok(['Recibir', 'Aprobar', 'Cobro'].every((x) => au.acciones.includes(x)), 'la bitácora incluye aprobación y recepción de OC y cobros', au.acciones);

  console.log('7) Respaldo completo e importación');
  const [dlj] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.evaluate(() => AP.store.exportJSON())]);
  const fjson = path.join(require('os').tmpdir(), 'agropina-respaldo-' + Date.now() + '.json');
  await dlj.saveAs(fjson);
  const resp = JSON.parse(require('fs').readFileSync(fjson, 'utf8'));
  ok(resp.version === 3 && Object.keys(resp.datos).length === 2 && resp.fincas.length === 2, 'el respaldo contiene todas las fincas', { version: resp.version, fincas: resp.fincas.length });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload(); await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = '#/ajustes?tab=datos'; });
  await page.waitForTimeout(500);
  await page.setInputFiles('input[type=file]', fjson);
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await page.waitForTimeout(800);
  const imp = await page.evaluate(() => ({ fincas: AP.store.state.fincas.length, parcelas: AP.store.state.parcelas.length, ordenes: AP.store.state.ordenes.length }));
  ok(imp.fincas === 2 && imp.parcelas > 0 && imp.ordenes > 0, 'la restauración recupera fincas y datos', imp);

  console.log('8) Libro Excel');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.evaluate(() => AP.reportes.excel())]);
  const fx = path.join(require('os').tmpdir(), dl.suggestedFilename());
  await dl.saveAs(fx);
  const wb = XLSX.readFile(fx);
  ok(wb.SheetNames.length === 16, 'hojas del libro', wb.SheetNames.length);
  ['Presupuesto vs real', 'Cuentas por cobrar', 'Kardex', 'Órdenes de compra', 'Planilla del mes', 'Auditoría'].forEach((h) => ok(wb.SheetNames.includes(h), 'hoja «' + h + '»'));
  const lab = XLSX.utils.sheet_to_json(wb.Sheets.Labores);
  ok(lab.some((r) => r.Estado === 'En proceso') && lab.some((r) => r.Estado === 'Programada') && lab.every((r) => r.Estado !== 'pendiente'), 'estados de labor con su etiqueta');

  ok(errs.length === 0, 'sin errores de JavaScript', errs);
  await b.close();
  console.log(fallos.length ? '\nFALLARON ' + fallos.length + ' comprobaciones' : '\nTODO CORRECTO');
  process.exit(fallos.length ? 1 : 0);
})();
