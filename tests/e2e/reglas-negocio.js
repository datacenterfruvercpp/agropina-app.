const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage();
  const errs=[]; page.on('pageerror', e => errs.push(e.message));
  await page.route('**/api.open-meteo.com/**', r => r.abort());
  // 1) Migración desde v1
  await page.goto('http://localhost:8765/index.html');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('agropina_parcelas', JSON.stringify([{id:1700000000000,nombre:'Lote Viejo',variedad:'Golden',hectareas:'3.5',fechaSiembra:'2026-01-10',dias:10,fase:'x'}])); localStorage.setItem('agropina_actividades', JSON.stringify([{id:1,parcelaNombre:'Lote Viejo',parcelaId:1700000000000,tipo:'Deshierbe',fecha:'2026-03-01',descripcion:'ok'}])); });
  await page.reload(); await page.waitForTimeout(600);
  const r = await page.evaluate(() => { const s=AP.store.state; return { p: s.parcelas.map(p=>[p.id,p.nombre,p.hectareas,p.variedad]), l: s.labores.map(l=>[l.parcelaId,l.tipo,l.estado]) }; });
  console.log('MIGRACIÓN', JSON.stringify(r));
  // 2) Inventario + labor + deshacer + cierre de ciclo
  const out = await page.evaluate(async () => {
    const S = AP.store; const st = S.state;
    S.loadDemo(); await new Promise(r=>setTimeout(r,50));
    const i = st.insumos.find(x=>x.id==='i3'); const s0 = i.stock;
    const l = S.saveLabor({ parcelaId:'p3', tipo:'Inducción floral', fecha: st.hoy, estado:'completada', insumos:[{insumoId:'i3', cantidad: 2}], costoManoObra: 100 });
    const s1 = i.stock, ind = S.parcela('p3').fechaInduccion, fase = S.estados.value.p3.fase, costo = l.costoTotal;
    S.saveLabor(Object.assign({}, l, { insumos:[{insumoId:'i3', cantidad: 5, costoUnitario: l.insumos[0].costoUnitario}] }), {silent:true});
    const s2 = st.insumos.find(x=>x.id==='i3').stock;
    S.deleteLabor(l.id); const s3 = st.insumos.find(x=>x.id==='i3').stock;
    const undo = st.ui.toasts.find(t=>t.action); undo.action.fn(); const s4 = st.insumos.find(x=>x.id==='i3').stock;
    // pendiente → completar
    const pend = st.labores.find(x=>x.id==='l13'); const s5 = st.insumos.find(x=>x.id==='i3').stock; S.completarLabor('l13'); const s6 = st.insumos.find(x=>x.id==='i3').stock;
    // entrada promedio ponderado
    const u = st.insumos.find(x=>x.id==='i1'); const st0=u.stock, c0=u.costoUnitario; S.movimientoInsumo({insumoId:'i1', tipo:'entrada', cantidad: 1000, costoUnitario: 1.0});
    // cierre de ciclo
    S.saveCosecha({ parcelaId:'p1', fecha: st.hoy, toneladas: 400, precio: 300, cierraCiclo: true });
    const p1 = S.parcela('p1');
    // carencia p1
    return { s0,s1,s2,s3,s4, ind, fase, costo, s5,s6, st0, c0, u: [u.stock, u.costoUnitario], p1: [p1.ciclo, p1.fechaInicioCiclo===st.hoy, p1.fechaInduccion, S.estados.value.p1.fase], recs: S.recomendaciones.value.length };
  });
  console.log('LOGICA', JSON.stringify(out));
  // 3) Persistencia tras recarga
  await page.waitForTimeout(400); await page.reload(); await page.waitForTimeout(500);
  console.log('PERSISTE', await page.evaluate(() => [AP.store.state.parcelas.length, AP.store.state.labores.length, AP.store.parcela('p1').ciclo, AP.store.state.weather.status]));
  // 4) Excel
  const [dl] = await Promise.all([page.waitForEvent('download', {timeout: 10000}), page.evaluate(() => AP.reportes.excel())]);
  console.log('EXCEL', dl.suggestedFilename());
  console.log('ERRORES', errs.length ? errs : 'ninguno');
  await b.close();
})();
