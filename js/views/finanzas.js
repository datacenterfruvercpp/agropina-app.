/* AgroPiña Enterprise · Vistas: Finanzas y Ajustes + exportación a Excel */
(function (AP) {
  'use strict';
  const { ref, computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog, W = AP.weather, B = AP.negocio;

  /* ------------------------------ Excel ------------------------------ */
  AP.reportes = {
    async excel() {
      try {
        if (!window.XLSX) await U.loadScript('vendor/xlsx.full.min.js');
        const st = S.state;
        const mon = st.settings.moneda;
        const M = (t) => t + ' (' + mon + ')';
        const P = (id) => S.parcelaNombre(id);
        const wb = XLSX.utils.book_new();
        let hojas = 0;
        const add = (name, rows, widths) => {
          const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Sin registros' }]);
          if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
          XLSX.utils.book_append_sheet(wb, ws, name);
          hojas++;
        };
        const r = S.resumen.value;
        add('Resumen', [
          { Indicador: 'Finca', Valor: st.settings.finca },
          { Indicador: 'Fecha del reporte', Valor: st.hoy },
          { Indicador: 'Generado por', Valor: st.prefs.usuario.nombre },
          { Indicador: 'Parcelas activas', Valor: r.parcelas },
          { Indicador: 'Hectáreas activas', Valor: U.round(r.hectareas, 2) },
          { Indicador: 'Plantas en campo', Valor: Math.round(r.plantas) },
          { Indicador: 'Producción estimada próximos 90 días (t)', Valor: U.round(r.produccion90, 1) },
          { Indicador: M('Costo acumulado'), Valor: U.round(r.costoTotal, 2) },
          { Indicador: M('Ingresos registrados'), Valor: U.round(r.ingresoTotal, 2) },
          { Indicador: M('Cuentas por cobrar'), Valor: U.round(r.porCobrar || 0, 2) },
          { Indicador: M('Compras en curso'), Valor: U.round(r.comprasAbiertas || 0, 2) },
          { Indicador: M('Valor de inventario'), Valor: U.round(r.valorInventario, 2) },
          { Indicador: 'Personal activo', Valor: r.personalActivo || 0 }
        ], [44, 24]);
        add('Parcelas', st.parcelas.map((p) => {
          const e = S.estados.value[p.id], pr = S.produccion.value[p.id], c = S.costos.value[p.id] || {}, i = S.ingresos.value[p.id] || {};
          return {
            Código: p.codigo, Parcela: p.nombre, Variedad: p.variedad, Ciclo: e.etiquetaCiclo, 'Área (ha)': p.hectareas, Plantas: Math.round(pr.plantas),
            Siembra: p.fechaSiembra, 'Inicio ciclo': p.fechaInicioCiclo, Inducción: p.fechaInduccion || '', 'Inducción estimada': e.induccionEst,
            'Cosecha estimada': e.cosechaEst, 'Días de ciclo': e.dias, Fase: C.FASES[e.fase].label, 'Producción estimada (t)': U.round(pr.toneladas, 1),
            't/ha estimadas': U.round(pr.tHa, 1), [M('Costo total')]: U.round(c.total || 0, 2), 'Toneladas cosechadas': U.round(i.toneladas || 0, 1),
            [M('Ingresos')]: U.round(i.ingreso || 0, 2), Estado: p.estado
          };
        }));
        add('Labores', st.labores.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((l) => ({
          Fecha: l.fecha, Parcela: P(l.parcelaId), Tipo: l.tipo, Estado: (B.ESTADOS_LABOR[l.estado] || {}).label || l.estado, Prioridad: (B.PRIORIDADES[l.prioridad] || {}).label || '',
          Descripción: l.descripcion, Responsable: l.responsable, Personal: (l.trabajadores || []).map((t) => (S.trabajador(t.trabajadorId) || t).nombre + ' (' + t.jornales + ')').join('; '),
          Jornales: l.jornales, Insumos: l.insumos.map((x) => x.nombre + ' ' + x.cantidad + ' ' + x.unidad).join('; '),
          [M('Mano de obra')]: l.costoManoObra, [M('Insumos')]: l.costoInsumos, [M('Otros')]: l.otrosCostos, [M('Total')]: l.costoTotal
        })));
        const apps = [];
        st.labores.filter((l) => l.estado === 'completada').forEach((l) => l.insumos.forEach((x) => apps.push({
          Fecha: l.fecha, Parcela: P(l.parcelaId), Labor: l.tipo, Producto: x.nombre, 'Dosis/ha': x.dosisHa, Cantidad: x.cantidad, Unidad: x.unidad,
          'Carencia (días)': x.carencia || 0, 'Cosechar desde': x.carencia ? U.addDays(l.fecha, x.carencia) : '', Responsable: l.responsable
        })));
        add('Trazabilidad aplicaciones', apps);
        add('Presupuesto vs real', S.presupuesto.value.map((x) => ({
          Parcela: x.parcela.nombre, 'Área (ha)': x.parcela.hectareas, 'Avance del ciclo %': U.round(x.avance, 1),
          [M('Presupuesto MO')]: x.presu.manoObra, [M('Real MO')]: U.round(x.real.manoObra, 2), [M('Presupuesto insumos')]: x.presu.insumos, [M('Real insumos')]: U.round(x.real.insumos, 2),
          [M('Presupuesto otros')]: x.presu.otros, [M('Real otros')]: U.round(x.real.otros, 2), [M('Presupuesto total')]: x.totalPresu, [M('Real total')]: x.totalReal,
          [M('Esperado a la fecha')]: x.esperado, 'Ejecución %': x.ejecucion == null ? '' : U.round(x.ejecucion, 1), 'Desvío vs esperado %': x.desvio == null ? '' : U.round(x.desvio, 1)
        })));
        add('Cosechas', st.cosechas.map((c) => ({
          Fecha: c.fecha, Parcela: P(c.parcelaId), Ciclo: c.ciclo, Toneladas: c.toneladas, Cajas: c.cajas, 'Exportable %': c.exportable, '°Brix': c.brix, Destino: c.destino,
          Cliente: S.clienteNombre(c.clienteId, c.comprador), Factura: c.factura, [M('Precio/t')]: c.precio, [M('Ingreso')]: U.round(c.toneladas * c.precio, 2),
          'Estado de pago': c.estadoPago === 'pendiente' ? 'Por cobrar' : 'Cobrado', 'Fecha de pago': c.fechaPago || ''
        })));
        add('Cuentas por cobrar', S.cxc.value.map((x) => ({ Cliente: x.cliente, Documento: x.documento, Parcela: P(x.parcelaId), Fecha: x.fecha, Vence: x.vence, 'Días de atraso': Math.max(0, x.diasVencido), Antigüedad: B.TRAMOS[x.tramo], [M('Monto')]: U.round(x.monto, 2) })));
        add('Clientes', st.clientes.map((c) => ({ Cliente: c.nombre, Tipo: c.tipo, Identificación: c.identificacion, Contacto: c.contacto, Teléfono: c.telefono, Correo: c.email, 'Días de crédito': c.diasCredito })));
        add('Monitoreo', st.monitoreos.map((m) => ({ Fecha: m.fecha, Parcela: P(m.parcelaId), Problema: C.plaga(m.plaga).nombre, Científico: C.plaga(m.plaga).cientifico, Severidad: m.severidad, 'Incidencia %': m.incidencia, Muestras: m.muestras, Acción: m.accion, Notas: m.notas })));
        add('Inventario', st.insumos.map((i) => ({ Producto: i.nombre, Categoría: i.categoria, 'Ingrediente activo': i.ingredienteActivo, Unidad: i.unidad, Stock: i.stock, 'Stock mínimo': i.stockMinimo, [M('Costo unitario')]: i.costoUnitario, [M('Valor')]: U.round(Math.max(0, i.stock) * i.costoUnitario, 2), 'Carencia (días)': i.carencia, Proveedor: i.proveedorId ? S.proveedorNombre(i.proveedorId) : i.proveedor })));
        add('Kardex', st.insumos.flatMap((i) => B.kardex(st.movimientos, i.id).map((m) => ({ Insumo: i.nombre, Unidad: i.unidad, Fecha: m.fecha, Tipo: m.tipo, Cantidad: m.delta, Saldo: m.saldo, [M('Costo unitario')]: m.costoUnitario, Detalle: m.nota }))));
        add('Proveedores', st.proveedores.map((p) => ({ Proveedor: p.nombre, Identificación: p.identificacion, Contacto: p.contacto, Teléfono: p.telefono, Correo: p.email, 'Días de crédito': p.diasCredito })));
        add('Órdenes de compra', st.ordenes.map((o) => ({ Orden: o.numero, Proveedor: S.proveedorNombre(o.proveedorId), Fecha: o.fecha, Entrega: o.fechaEntrega, Estado: (B.ESTADOS_OC[o.estado] || {}).label, Recepción: o.fechaRecepcion || '', Líneas: o.lineas.map((l) => (S.insumo(l.insumoId) || { nombre: '?' }).nombre + ' × ' + l.cantidad).join('; '), [M('Total')]: o.total })));
        add('Personal', st.trabajadores.map((t) => ({ Nombre: t.nombre, Identificación: t.identificacion, Puesto: t.puesto, Cuadrilla: t.cuadrilla, [M('Tarifa por jornal')]: t.tarifaJornal, Teléfono: t.telefono, Ingreso: t.fechaIngreso, Estado: t.activo ? 'Activo' : 'Inactivo' })));
        const pm = B.periodo('mes', st.hoy);
        add('Planilla del mes', B.planilla(st.labores, st.trabajadores, pm.desde, pm.hasta).filas.map((f) => ({ Trabajador: f.nombre, Cuadrilla: f.cuadrilla, 'Días trabajados': f.dias, Labores: f.labores, Jornales: U.round(f.jornales, 2), [M('Monto')]: U.round(f.monto, 2) })));
        add('Auditoría', st.auditoria.slice(0, 1000).map((a) => ({ 'Fecha y hora': a.fecha.replace('T', ' ').slice(0, 19), Usuario: a.usuario, Acción: a.accion, Entidad: a.entidad, Descripción: a.descripcion })));
        XLSX.writeFile(wb, 'AgroPina_Reporte_' + (st.settings.finca.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Finca') + '_' + st.hoy + '.xlsx');
        S.audit('Exportar', 'Reporte', 'Libro Excel completo (' + hojas + ' hojas)');
        S.toast('Reporte Excel generado (' + hojas + ' hojas)');
      } catch (e) { S.toast('No se pudo generar el Excel: ' + e.message, 'error'); }
    },
    imprimir() { window.print(); }
  };

  AP.views = AP.views || {};

  /* ------------------------------ Finanzas ------------------------------ */
  AP.views.finanzas = {
    props: { query: Object },
    setup(props) {
      const st = S.state;
      const tab = ref(props.query && ['presupuesto', 'proyeccion'].includes(props.query.tab) ? props.query.tab : 'resultados');
      const periodo = ref('12m');
      const desde = computed(() => (periodo.value === '12m' ? U.addMonths(st.hoy, -11) : periodo.value === 'anio' ? st.hoy.slice(0, 4) + '-01-01' : '0000'));
      const labores = computed(() => st.labores.filter((l) => l.estado === 'completada' && l.fecha >= desde.value));
      const cosechas = computed(() => st.cosechas.filter((c) => c.fecha >= desde.value));
      const kpi = computed(() => {
        const costo = U.sum(labores.value, (l) => l.costoTotal);
        const ingreso = U.sum(cosechas.value, (c) => c.toneladas * c.precio);
        const t = U.sum(cosechas.value, (c) => c.toneladas);
        const ha = S.resumen.value.hectareas || 0;
        return { costo, ingreso, t, margen: ingreso - costo, margenPct: ingreso ? ((ingreso - costo) / ingreso) * 100 : null, costoHa: ha ? costo / ha : 0, costoT: t ? costo / t : null, mo: U.sum(labores.value, (l) => l.costoManoObra), ins: U.sum(labores.value, (l) => l.costoInsumos), otros: U.sum(labores.value, (l) => l.otrosCostos) };
      });
      const porParcela = computed(() => st.parcelas.map((p) => {
        const costo = U.sum(labores.value.filter((l) => l.parcelaId === p.id), (l) => l.costoTotal);
        const cs = cosechas.value.filter((c) => c.parcelaId === p.id);
        const ingreso = U.sum(cs, (c) => c.toneladas * c.precio);
        const t = U.sum(cs, (c) => c.toneladas);
        return { id: p.id, nombre: p.nombre, color: p.color, hectareas: p.hectareas, costo, ingreso, t, margen: ingreso - costo, costoHa: p.hectareas ? costo / p.hectareas : 0, margenHa: p.hectareas ? (ingreso - costo) / p.hectareas : 0, margenPct: ingreso ? ((ingreso - costo) / ingreso) * 100 : null };
      }).filter((x) => x.costo || x.ingreso));
      const colsRent = [
        { key: 'nombre', label: 'Parcela', cls: 'font-semibold' },
        { key: 'hectareas', label: 'Área (ha)', align: 'right', sum: true, format: (v) => U.fmtNum(v, 2) },
        { key: 'costo', label: 'Costos', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'costoHa', label: 'Costo/ha', align: 'right', format: (v) => AP.money(v) },
        { key: 't', label: 'Cosechado (t)', align: 'right', sum: true, format: (v) => (v ? U.fmtNum(v, 1) : '—') },
        { key: 'ingreso', label: 'Ingresos', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'margen', label: 'Margen', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'margenPct', label: 'Margen %', align: 'right', format: (v) => (v == null ? '—' : U.fmtPct(v, 1)) },
        { key: 'margenHa', label: 'Margen/ha', align: 'right', format: (v) => AP.money(v) }
      ];
      // Presupuesto vs real
      const presu = computed(() => S.presupuesto.value.map((x) => ({
        id: x.parcela.id, nombre: x.parcela.nombre, color: x.parcela.color, hectareas: x.parcela.hectareas, avance: x.avance,
        presupuesto: x.totalPresu, esperado: x.esperado, real: x.totalReal, ejecucion: x.ejecucion, desvio: x.desvio, estado: x.estado, propio: !!x.parcela.presupuestoHa,
        mo: x.real.manoObra, ins: x.real.insumos, otros: x.real.otros
      })));
      const presuTot = computed(() => {
        const t = { presupuesto: U.sum(presu.value, (x) => x.presupuesto), esperado: U.sum(presu.value, (x) => x.esperado), real: U.sum(presu.value, (x) => x.real) };
        t.ejecucion = t.presupuesto ? (t.real / t.presupuesto) * 100 : null;
        t.desvio = t.esperado ? ((t.real - t.esperado) / t.esperado) * 100 : null;
        t.sobre = presu.value.filter((x) => x.estado === 'st-err').length;
        return t;
      });
      const ESTADO_PRESU = { 'st-ok': 'En control', 'st-warn': 'Atención', 'st-err': 'Sobregiro', 'st-neutral': 'Sin presupuesto' };
      const colsPresu = [
        { key: 'nombre', label: 'Parcela', cls: 'font-semibold' },
        { key: 'hectareas', label: 'Área (ha)', align: 'right', format: (v) => U.fmtNum(v, 2), hidden: true },
        { key: 'avance', label: 'Avance ciclo', align: 'right', format: (v) => U.fmtPct(v) },
        { key: 'presupuesto', label: 'Presupuesto ciclo', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'esperado', label: 'Esperado a la fecha', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'mo', label: 'Real MO', align: 'right', sum: true, format: (v) => AP.money(v), hidden: true },
        { key: 'ins', label: 'Real insumos', align: 'right', sum: true, format: (v) => AP.money(v), hidden: true },
        { key: 'otros', label: 'Real otros', align: 'right', sum: true, format: (v) => AP.money(v), hidden: true },
        { key: 'real', label: 'Real', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'ejecucion', label: 'Ejecución', align: 'right', format: (v) => (v == null ? '—' : U.fmtPct(v, 1)) },
        { key: 'desvio', label: 'Desvío', align: 'right', format: (v) => (v == null ? '—' : (v > 0 ? '+' : '') + U.fmtNum(v, 1) + '%') },
        { key: 'estado', label: 'Estado', value: (r) => ESTADO_PRESU[r.estado], sortValue: (r) => ['st-err', 'st-warn', 'st-ok', 'st-neutral'].indexOf(r.estado) }
      ];
      const proyeccion = computed(() => {
        const precio = Number(st.settings.precioReferencia) || 0;
        const items = S.activas.value.map((p) => ({ p, e: S.estados.value[p.id], t: S.produccion.value[p.id].toneladas }))
          .filter((x) => x.e.fase !== 'planificada' && x.e.diasParaCosecha <= 365).sort((a, b) => a.e.diasParaCosecha - b.e.diasParaCosecha);
        return { items, t: U.sum(items, (x) => x.t), ingreso: U.sum(items, (x) => x.t) * precio, precio };
      });
      const chartMeses = (t) => {
        const meses = [];
        for (let i = 11; i >= 0; i--) meses.push(U.monthKey(U.addMonths(st.hoy, -i)));
        const comp = st.labores.filter((l) => l.estado === 'completada');
        const by = (fn) => meses.map((m) => U.round(U.sum(comp.filter((l) => U.monthKey(l.fecha) === m), fn)));
        return {
          type: 'bar',
          data: {
            labels: meses.map((m) => U.monthLabel(m)),
            datasets: [
              { label: 'Mano de obra', data: by((l) => l.costoManoObra), backgroundColor: t.blue, stack: 'c', maxBarThickness: 26 },
              { label: 'Insumos', data: by((l) => l.costoInsumos), backgroundColor: t.palette[2], stack: 'c', maxBarThickness: 26 },
              { label: 'Otros', data: by((l) => l.otrosCostos), backgroundColor: t.slate, stack: 'c', maxBarThickness: 26 },
              { type: 'line', label: 'Ingresos', data: meses.map((m) => U.round(U.sum(st.cosechas.filter((c) => U.monthKey(c.fecha) === m), (c) => c.toneladas * c.precio))), borderColor: t.brand, backgroundColor: t.brand, borderWidth: 2.5, pointRadius: 3, tension: 0.3 }
            ]
          },
          options: AP.charts.options(t, { plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + AP.money(c.raw) } } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: (v) => AP.money(v, true) } } } })
        };
      };
      const chartTipos = (t) => {
        const g = U.groupBy(labores.value, (l) => l.tipo);
        const keys = Object.keys(g).sort((a, b) => U.sum(g[b], (l) => l.costoTotal) - U.sum(g[a], (l) => l.costoTotal));
        return {
          type: 'doughnut',
          data: { labels: keys, datasets: [{ data: keys.map((k) => U.round(U.sum(g[k], (l) => l.costoTotal))), backgroundColor: keys.map((k) => C.labor(k).tone.hex), borderWidth: 0, hoverOffset: 6 }] },
          options: AP.charts.options(t, { cutout: '68%', interaction: { mode: 'nearest' }, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + AP.money(c.raw) } } } })
        };
      };
      const chartPresu = (t) => ({
        type: 'bar',
        data: {
          labels: presu.value.map((x) => x.nombre),
          datasets: [
            { label: 'Presupuesto del ciclo', data: presu.value.map((x) => U.round(x.presupuesto)), backgroundColor: t.dark ? '#3a4452' : '#c5cdd7', maxBarThickness: 22 },
            { label: 'Esperado a la fecha', data: presu.value.map((x) => U.round(x.esperado)), backgroundColor: t.blue, maxBarThickness: 22 },
            { label: 'Real', data: presu.value.map((x) => U.round(x.real)), backgroundColor: presu.value.map((x) => (x.estado === 'st-err' ? '#dc2626' : x.estado === 'st-warn' ? '#d97706' : t.brand)), maxBarThickness: 22 }
          ]
        },
        options: AP.charts.options(t, { plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + AP.money(c.raw) } } }, scales: { y: { ticks: { callback: (v) => AP.money(v, true) } } } })
      });
      const chartProy = (t) => {
        const meses = [];
        for (let i = 0; i < 12; i++) meses.push(U.monthKey(U.addMonths(st.hoy, i)));
        const p = proyeccion.value;
        return {
          type: 'bar',
          data: { labels: meses.map((m) => U.monthLabel(m)), datasets: [{ label: 'Ingreso proyectado', data: meses.map((m) => U.round(U.sum(p.items.filter((x) => U.monthKey(x.e.diasParaCosecha <= 0 ? st.hoy : x.e.cosechaEst) === m), (x) => x.t) * p.precio)), backgroundColor: t.brand, maxBarThickness: 28 }] },
          options: AP.charts.options(t, { plugins: { tooltip: { callbacks: { label: (c) => ' ' + AP.money(c.raw) } } }, scales: { y: { ticks: { callback: (v) => AP.money(v, true) } } } })
        };
      };
      return { st, tab, periodo, kpi, porParcela, colsRent, presu, presuTot, colsPresu, ESTADO_PRESU, proyeccion, chartMeses, chartTipos, chartPresu, chartProy, S, U, C, R: AP.reportes };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Finanzas y análisis" title="Finanzas" subtitle="Estado de resultados de la finca, control presupuestario por parcela y proyección de ingresos.">
        <ap-seg v-if="tab === 'resultados'" v-model="periodo" :options="[{ value: '12m', label: '12 meses' }, { value: 'anio', label: 'Este año' }, { value: 'todo', label: 'Todo' }]"></ap-seg>
        <button class="btn btn-outline" @click="R.imprimir()"><i class="fa-solid fa-print"></i><span class="hidden sm:inline">Imprimir</span></button>
        <button class="btn btn-primary" @click="R.excel()"><i class="fa-solid fa-file-excel"></i>Exportar Excel</button>
        <template #facets>
          <ap-facet label="Ingresos" :value="$money(kpi.ingreso)"></ap-facet>
          <ap-facet label="Costos" :value="$money(kpi.costo)"></ap-facet>
          <ap-facet label="Margen bruto" :value="$money(kpi.margen)" :st="kpi.margen < 0 ? '!text-red-600' : ''"></ap-facet>
          <ap-facet label="Margen %" :value="kpi.margenPct != null ? U.fmtPct(kpi.margenPct, 1) : '—'"></ap-facet>
          <ap-facet label="Ejecución presupuestaria" :value="presuTot.ejecucion != null ? U.fmtPct(presuTot.ejecucion, 1) : '—'" :st="presuTot.sobre ? '!text-red-600' : ''"></ap-facet>
        </template>
        <template #tabs>
          <ap-tab :active="tab === 'resultados'" @click="tab = 'resultados'">Resultados</ap-tab>
          <ap-tab :active="tab === 'presupuesto'" :count="presuTot.sobre || null" @click="tab = 'presupuesto'">Presupuesto vs real</ap-tab>
          <ap-tab :active="tab === 'proyeccion'" @click="tab = 'proyeccion'">Proyección</ap-tab>
        </template>
      </ap-page-header>

      <div v-if="tab === 'resultados'" class="space-y-4">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ap-tile title="Mano de obra" subtitle="Costo del período" :value="$money(kpi.mo, true)" icon="fa-people-group" :footer="kpi.costo ? U.fmtPct(kpi.mo / kpi.costo * 100) + ' del costo total' : ''"></ap-tile>
          <ap-tile title="Insumos" subtitle="Costo del período" :value="$money(kpi.ins, true)" icon="fa-flask" :footer="kpi.costo ? U.fmtPct(kpi.ins / kpi.costo * 100) + ' del costo total' : ''"></ap-tile>
          <ap-tile title="Costo por hectárea" subtitle="Sobre área activa" :value="$money(kpi.costoHa, true)" icon="fa-vector-square"></ap-tile>
          <ap-tile title="Costo por tonelada" subtitle="Sobre producción cosechada" :value="kpi.costoT != null ? $money(kpi.costoT) : '—'" icon="fa-weight-hanging"></ap-tile>
        </div>
        <div class="grid lg:grid-cols-5 gap-4">
          <div class="card lg:col-span-3">
            <div class="card-head"><h3 class="card-title">Costos e ingresos por mes</h3><span class="text-xs muted">12 meses</span></div>
            <div class="card-body"><ap-chart :config="chartMeses" height="280px"></ap-chart></div>
          </div>
          <div class="card lg:col-span-2">
            <div class="card-head"><h3 class="card-title">Costo por tipo de labor</h3></div>
            <div class="card-body"><ap-chart :config="chartTipos" height="280px"></ap-chart></div>
          </div>
        </div>
        <div class="card overflow-hidden">
          <ap-data-table id="rentabilidad" title="Rentabilidad por parcela" export-name="Rentabilidad_por_parcela" :columns="colsRent" :rows="porParcela" sort-key="margen" sort-dir="desc" clickable @open="(r) => $go('parcelas/' + r.id)"
            :empty="{ icon: 'fa-coins', title: 'Sin movimientos económicos', text: 'Registre labores con costos y cosechas con precio para ver la rentabilidad.' }">
            <template #cell-nombre="{ row }"><span class="inline-block w-2 h-2 rounded-full mr-2 align-middle" :style="{ background: row.color }"></span><span class="font-semibold">{{ row.nombre }}</span></template>
            <template #cell-margen="{ row }"><b :class="row.margen >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'">{{ $money(row.margen) }}</b></template>
          </ap-data-table>
        </div>
      </div>

      <div v-else-if="tab === 'presupuesto'" class="space-y-4">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ap-tile title="Presupuesto de ciclos" subtitle="Parcelas activas" :value="$money(presuTot.presupuesto, true)" icon="fa-file-invoice-dollar"></ap-tile>
          <ap-tile title="Esperado a la fecha" subtitle="Según avance de cada ciclo" :value="$money(presuTot.esperado, true)" icon="fa-hourglass-half"></ap-tile>
          <ap-tile title="Ejecutado real" subtitle="Labores realizadas en el ciclo" :value="$money(presuTot.real, true)" icon="fa-receipt" :footer="presuTot.ejecucion != null ? U.fmtPct(presuTot.ejecucion, 1) + ' del presupuesto' : ''"></ap-tile>
          <ap-tile title="Desvío vs esperado" subtitle="Positivo = gasto mayor al previsto" :value="presuTot.desvio == null ? '—' : (presuTot.desvio > 0 ? '+' : '') + U.fmtNum(presuTot.desvio, 1) + '%'" :status="presuTot.desvio > 20 ? 'err' : presuTot.desvio > 5 ? 'warn' : 'ok'" :footer="presuTot.sobre ? presuTot.sobre + ' parcela(s) en sobregiro' : 'Sin sobregiros'"></ap-tile>
        </div>
        <div class="card">
          <div class="card-head"><h3 class="card-title">Presupuesto, esperado y real por parcela</h3><a href="#/ajustes?tab=presupuesto" class="text-[12px] font-semibold text-brand-700 dark:text-brand-400 hover:underline">Presupuesto estándar por ha</a></div>
          <div class="card-body"><ap-chart :config="chartPresu" height="280px"></ap-chart></div>
        </div>
        <div class="card overflow-hidden">
          <ap-data-table id="presupuesto" title="Control presupuestario" export-name="Presupuesto_vs_real" :columns="colsPresu" :rows="presu" sort-key="estado" clickable @open="(r) => $go('parcelas/' + r.id)"
            :empty="{ icon: 'fa-scale-balanced', title: 'Sin parcelas activas', text: 'Registre parcelas para controlar su presupuesto.' }">
            <template #cell-nombre="{ row }"><span class="inline-block w-2 h-2 rounded-full mr-2 align-middle" :style="{ background: row.color }"></span><span class="font-semibold">{{ row.nombre }}</span><span v-if="row.propio" class="st st-info ml-2" title="Presupuesto propio de la parcela">Propio</span></template>
            <template #cell-ejecucion="{ row }">
              <div class="flex items-center justify-end gap-2"><div class="bar w-16 hidden sm:block"><span :class="row.estado === 'st-err' ? 'bg-red-500' : row.estado === 'st-warn' ? 'bg-amber-500' : 'bg-brand-600'" :style="{ width: Math.min(100, row.ejecucion || 0) + '%' }"></span></div><span class="num">{{ row.ejecucion == null ? '—' : U.fmtPct(row.ejecucion, 1) }}</span></div>
            </template>
            <template #cell-desvio="{ row }"><b :class="['num', row.desvio > 20 ? 'text-red-600' : row.desvio > 5 ? 'text-amber-600' : 'text-emerald-700 dark:text-emerald-400']">{{ row.desvio == null ? '—' : (row.desvio > 0 ? '+' : '') + U.fmtNum(row.desvio, 1) + '%' }}</b></template>
            <template #cell-estado="{ row }"><ap-status :st="row.estado" :label="ESTADO_PRESU[row.estado]" dot></ap-status></template>
          </ap-data-table>
        </div>
        <p class="text-[12px] muted">El <b>esperado a la fecha</b> es el presupuesto del ciclo multiplicado por su avance, para no alarmar al inicio del ciclo. Semáforo: desvío &gt; 5 % atención, &gt; 20 % sobregiro.</p>
      </div>

      <div v-else class="space-y-4">
        <div class="grid lg:grid-cols-5 gap-4">
          <div class="card lg:col-span-3">
            <div class="card-head flex-wrap">
              <div>
                <h3 class="card-title">Ingresos proyectados · próximos 12 meses</h3>
                <p class="text-xs muted mt-0.5">Producción estimada × precio de referencia ({{ $money(proyeccion.precio) }}/t, editable en Ajustes)</p>
              </div>
              <div class="text-right"><p class="text-xl font-semibold num">{{ $money(proyeccion.ingreso, true) }}</p><p class="text-xs muted">{{ U.fmtNum(proyeccion.t) }} t estimadas</p></div>
            </div>
            <div class="card-body"><ap-chart :config="chartProy" height="260px"></ap-chart></div>
          </div>
          <div class="card lg:col-span-2">
            <div class="card-head"><h3 class="card-title">Detalle por parcela</h3></div>
            <div class="divide max-h-[330px] overflow-y-auto">
              <div v-for="x in proyeccion.items" :key="x.p.id" class="row">
                <span class="w-1.5 h-8 rounded-full" :style="{ background: x.p.color }"></span>
                <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">{{ x.p.nombre }}</p><p class="text-[11px] muted">{{ x.e.diasParaCosecha <= 0 ? 'En cosecha' : U.fmtDate(x.e.cosechaEst) }}</p></div>
                <span class="text-sm num muted">{{ U.fmtNum(x.t) }} t</span>
                <span class="text-sm num font-semibold w-28 text-right">{{ $money(x.t * proyeccion.precio) }}</span>
              </div>
              <ap-empty v-if="!proyeccion.items.length" compact icon="fa-chart-line" title="Sin cosechas proyectadas"></ap-empty>
            </div>
          </div>
        </div>
      </div>
    </div>`
  };

  /* ------------------------------ Ajustes ------------------------------ */
  AP.views.ajustes = {
    props: { query: Object },
    setup(props) {
      const st = S.state;
      const TABS = ['general', 'fincas', 'presupuesto', 'usuario', 'datos'];
      const tab = ref(props.query && TABS.includes(props.query.tab) ? props.query.tab : 'general');
      const q = ref('');
      const resultados = ref([]);
      const buscando = ref(false);
      const lat = ref(st.settings.ubicacion ? st.settings.ubicacion.lat : '');
      const lon = ref(st.settings.ubicacion ? st.settings.ubicacion.lon : '');
      const fileInput = ref(null);
      const buscar = async () => {
        if (q.value.trim().length < 2) return;
        buscando.value = true;
        try { resultados.value = await W.buscarLugar(q.value.trim()); if (!resultados.value.length) S.toast('No se encontraron lugares', 'info'); }
        catch (e) { S.toast('Sin conexión para buscar lugares', 'error'); }
        buscando.value = false;
      };
      const usar = (r) => { st.settings.ubicacion = { lat: r.lat, lon: r.lon, nombre: r.nombre, fuente: 'busqueda' }; lat.value = r.lat; lon.value = r.lon; resultados.value = []; q.value = ''; S.toast('Ubicación actualizada: ' + r.nombre); };
      const gps = () => {
        if (!navigator.geolocation) return S.toast('GPS no disponible', 'warning');
        navigator.geolocation.getCurrentPosition((pos) => usar({ lat: U.round(pos.coords.latitude, 4), lon: U.round(pos.coords.longitude, 4), nombre: 'Ubicación GPS' }), () => S.toast('No se pudo obtener la ubicación', 'error'), { enableHighAccuracy: true, timeout: 10000 });
      };
      const manual = () => {
        const la = Number(lat.value), lo = Number(lon.value);
        if (!(la >= -90 && la <= 90 && lo >= -180 && lo <= 180) || lat.value === '' || lon.value === '') return S.toast('Coordenadas inválidas', 'error');
        usar({ lat: la, lon: lo, nombre: 'Coordenadas ' + la.toFixed(3) + ', ' + lo.toFixed(3) });
      };
      const importar = (ev) => { const f = ev.target.files[0]; if (f) S.importJSON(f); ev.target.value = ''; };
      const conteo = computed(() => [
        ['Parcelas', st.parcelas.length], ['Labores', st.labores.length], ['Cosechas', st.cosechas.length], ['Insumos', st.insumos.length],
        ['Movimientos', st.movimientos.length], ['Personal', st.trabajadores.length], ['Proveedores', st.proveedores.length], ['Órdenes', st.ordenes.length],
        ['Clientes', st.clientes.length], ['Monitoreos', st.monitoreos.length], ['Auditoría', st.auditoria.length], ['Fincas', st.fincas.length]
      ]);
      const kb = computed(() => { void conteo.value; void st.settings.finca; return S.storageKB(); });
      const demo = async () => {
        if (st.parcelas.length && !(await S.confirm({ title: 'Cargar demostración', message: 'Se reemplazarán los datos de «' + st.settings.finca + '» por una finca de ejemplo. Las demás fincas no se modifican. Descargue un respaldo si desea conservarlos.', confirmText: 'Cargar demo', danger: true }))) return;
        S.loadDemo();
        AP.router.go('dashboard');
      };
      const fincas = computed(() => S.todasLasFincas().map((f) => Object.assign({ id: f.id, activa: f.activa }, B.resumenFinca(f.datos, st.hoy))));
      const colsFincas = [
        { key: 'nombre', label: 'Finca', cls: 'font-semibold' },
        { key: 'moneda', label: 'Moneda' },
        { key: 'parcelas', label: 'Parcelas', align: 'right', sum: true, format: (v) => U.fmtNum(v) },
        { key: 'hectareas', label: 'Área (ha)', align: 'right', sum: true, format: (v) => U.fmtNum(v, 2) },
        { key: 'laboresAbiertas', label: 'OT abiertas', align: 'right', sum: true, format: (v) => U.fmtNum(v) },
        { key: 'inventario', label: 'Inventario', align: 'right', format: (v) => AP.money(v) },
        { key: 'activa', label: 'Estado', value: (r) => (r.activa ? 'Activa' : '') }
      ];
      const pres = st.settings.presupuestoHa || (st.settings.presupuestoHa = { manoObra: 0, insumos: 0, otros: 0 });
      const totalHa = computed(() => (Number(pres.manoObra) || 0) + (Number(pres.insumos) || 0) + (Number(pres.otros) || 0));
      const ROLES = ['Administrador de finca', 'Gerente general', 'Ingeniero agrónomo', 'Mandador', 'Contador', 'Bodeguero', 'Supervisor de campo'];
      return { st, tab, q, resultados, buscando, lat, lon, fileInput, buscar, usar, gps, manual, importar, conteo, kb, demo, fincas, colsFincas, pres, totalHa, ROLES, B, S, U, C, R: AP.reportes, version: AP.VERSION };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Administración" title="Configuración" subtitle="Organización, fincas, presupuesto estándar, usuario, apariencia y respaldo de información.">
        <template #tabs>
          <ap-tab :active="tab === 'general'" @click="tab = 'general'">Finca activa</ap-tab>
          <ap-tab :active="tab === 'fincas'" :count="st.fincas.length" @click="tab = 'fincas'">Fincas</ap-tab>
          <ap-tab :active="tab === 'presupuesto'" @click="tab = 'presupuesto'">Presupuesto</ap-tab>
          <ap-tab :active="tab === 'usuario'" @click="tab = 'usuario'">Usuario y apariencia</ap-tab>
          <ap-tab :active="tab === 'datos'" @click="tab = 'datos'">Datos y respaldo</ap-tab>
        </template>
      </ap-page-header>

      <div v-if="tab === 'general'" class="grid xl:grid-cols-2 gap-4 max-w-6xl">
        <section class="card">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-house-flag text-ink-400"></i>Datos de la finca</h3></div>
          <div class="card-body grid sm:grid-cols-2 gap-4">
            <div><label class="label">Nombre de la finca</label><input v-model="st.settings.finca" class="input"></div>
            <div><label class="label">Productor / empresa</label><input v-model="st.settings.propietario" class="input" placeholder="Opcional"></div>
            <div><label class="label">Moneda</label><select v-model="st.settings.moneda" class="input"><option v-for="m in C.MONEDAS" :key="m.code" :value="m.code">{{ m.label }}</option></select></div>
            <div><label class="label">Precio de referencia por tonelada</label><input v-model.number="st.settings.precioReferencia" type="number" min="0" step="any" class="input"><p class="hint">Proyección de ingresos y precio sugerido en cosechas</p></div>
            <div><label class="label">Umbral de lluvia crítica (mm/día)</label><input v-model.number="st.settings.umbralLluvia" type="number" min="1" step="1" class="input"><p class="hint">Alertas de encharcamiento y cosecha anticipada</p></div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-location-dot text-ink-400"></i>Ubicación para el clima</h3></div>
          <div class="card-body">
            <p class="text-[13px] muted mb-4">Actual: <b class="text-ink-800 dark:text-ink-100">{{ S.ubicacionActual.value.nombre }}</b> ({{ U.fmtNum(S.ubicacionActual.value.lat, 4) }}, {{ U.fmtNum(S.ubicacionActual.value.lon, 4) }})</p>
            <div class="flex gap-2">
              <div class="relative flex-1">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm"></i>
                <input v-model="q" @keyup.enter="buscar" class="input pl-9" placeholder="Buscar ciudad o distrito (ej. Pital, San Carlos)">
              </div>
              <button class="btn btn-outline" @click="buscar" :disabled="buscando" aria-label="Buscar"><i :class="['fa-solid', buscando ? 'fa-spinner fa-spin' : 'fa-magnifying-glass']"></i></button>
              <button class="btn btn-outline" @click="gps"><i class="fa-solid fa-location-crosshairs"></i><span class="hidden sm:inline">GPS</span></button>
            </div>
            <div v-if="resultados.length" class="mt-2 border border-ink-200 dark:border-white/10 rounded-md divide overflow-hidden">
              <button v-for="r in resultados" :key="r.lat + ',' + r.lon" class="row w-full text-left" @click="usar(r)"><i class="fa-solid fa-location-dot text-ink-400"></i><span class="text-sm flex-1">{{ r.nombre }}</span><span class="text-xs muted num">{{ r.lat }}, {{ r.lon }}</span></button>
            </div>
            <div class="grid grid-cols-[1fr_1fr_auto] gap-2 mt-4">
              <input v-model="lat" type="number" step="any" class="input" placeholder="Latitud">
              <input v-model="lon" type="number" step="any" class="input" placeholder="Longitud">
              <button class="btn btn-outline" @click="manual">Usar</button>
            </div>
          </div>
        </section>
      </div>

      <div v-else-if="tab === 'fincas'" class="space-y-4">
        <div class="strip st-info"><i class="fa-solid fa-circle-info mt-0.5"></i><span>Cada finca es una unidad productiva con parcelas, inventario, personal, compras y ventas independientes. Cambie de finca desde la barra superior o desde esta tabla. El consolidado de todas las fincas está en Reportes.</span></div>
        <div class="card overflow-hidden">
          <ap-data-table id="fincas" title="Fincas de la organización" export-name="Fincas" :columns="colsFincas" :rows="fincas" :searchable="false"
            :empty="{ icon: 'fa-warehouse', title: 'Sin fincas' }">
            <template #toolbar><button class="btn btn-primary btn-sm" @click="S.openForm('finca')"><i class="fa-solid fa-plus"></i>Nueva finca</button></template>
            <template #cell-activa="{ row }"><ap-status v-if="row.activa" st="st-ok" label="Activa" dot></ap-status><span v-else class="muted">—</span></template>
            <template #rowActions="{ row }">
              <button v-if="!row.activa" class="btn btn-outline btn-sm" @click="S.cambiarFinca(row.id)"><i class="fa-solid fa-arrow-right-arrow-left"></i>Activar</button>
              <button class="btn-icon btn-icon-sm hover:!text-red-600" :disabled="st.fincas.length <= 1" @click="S.eliminarFinca(row.id)" aria-label="Eliminar finca"><i class="fa-solid fa-trash-can"></i></button>
            </template>
          </ap-data-table>
        </div>
        <a href="#/reportes?r=consolidado" class="btn btn-outline"><i class="fa-solid fa-layer-group"></i>Ver consolidado de fincas</a>
      </div>

      <div v-else-if="tab === 'presupuesto'" class="max-w-3xl">
        <section class="card">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-scale-balanced text-ink-400"></i>Presupuesto estándar por hectárea y ciclo</h3></div>
          <div class="card-body">
            <p class="text-[13px] muted mb-4">Se aplica a todas las parcelas de <b>{{ st.settings.finca }}</b> que no tengan un presupuesto propio (se define en Avanzado dentro de cada parcela). Monto en {{ st.settings.moneda }} por hectárea para un ciclo completo.</p>
            <div class="grid sm:grid-cols-3 gap-4">
              <div v-for="c in B.CATEGORIAS" :key="c.key"><label class="label">{{ c.label }}</label><input v-model.number="pres[c.key]" type="number" min="0" step="any" class="input num"></div>
            </div>
            <div class="mt-5 pt-4 border-t border-ink-100 dark:border-white/[0.06] flex items-center justify-between">
              <span class="text-[13px] muted">Total por hectárea y ciclo</span><b class="text-lg num">{{ $money(totalHa) }}</b>
            </div>
          </div>
        </section>
        <a href="#/finanzas?tab=presupuesto" class="btn btn-outline mt-4"><i class="fa-solid fa-chart-column"></i>Ver presupuesto vs real</a>
      </div>

      <div v-else-if="tab === 'usuario'" class="grid xl:grid-cols-2 gap-4 max-w-6xl">
        <section class="card">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-user text-ink-400"></i>Perfil de usuario</h3></div>
          <div class="card-body grid sm:grid-cols-2 gap-4">
            <div><label class="label">Nombre</label><input v-model="st.prefs.usuario.nombre" class="input"><p class="hint">Aparece en la bitácora de auditoría</p></div>
            <div><label class="label">Rol</label><input v-model="st.prefs.usuario.rol" class="input" list="ap-roles"><datalist id="ap-roles"><option v-for="r in ROLES" :key="r" :value="r"></option></datalist></div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-palette text-ink-400"></i>Apariencia</h3></div>
          <div class="card-body space-y-5">
            <div><p class="label">Tema</p><ap-seg v-model="st.prefs.tema" :options="[{ value: 'system', label: 'Automático', icon: 'fa-circle-half-stroke' }, { value: 'light', label: 'Claro', icon: 'fa-sun' }, { value: 'dark', label: 'Oscuro', icon: 'fa-moon' }]"></ap-seg></div>
            <div><p class="label">Densidad de las tablas</p><ap-seg v-model="st.prefs.densidad" :options="[{ value: 'comoda', label: 'Cómoda', icon: 'fa-bars' }, { value: 'compacta', label: 'Compacta', icon: 'fa-grip-lines' }]"></ap-seg><p class="hint">La vista compacta muestra más filas por pantalla</p></div>
          </div>
        </section>
      </div>

      <div v-else class="max-w-5xl space-y-4">
        <section class="card">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-database text-ink-400"></i>Datos y respaldo</h3><span class="text-xs muted">{{ kb }} KB en este dispositivo</span></div>
          <div class="card-body">
            <p class="text-[13px] muted mb-4">Los datos se guardan solo en este dispositivo. Descargue respaldos periódicos; el respaldo incluye todas las fincas.</p>
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5 text-center">
              <div v-for="c in conteo" :key="c[0]" class="rounded-md border border-ink-200 dark:border-white/[0.08] py-2"><p class="text-base font-semibold num">{{ c[1] }}</p><p class="text-[11px] muted">{{ c[0] }}</p></div>
            </div>
            <div class="grid sm:grid-cols-2 gap-2">
              <button class="btn btn-outline justify-start" @click="S.exportJSON()"><i class="fa-solid fa-download text-ink-400"></i>Descargar respaldo completo (JSON)</button>
              <button class="btn btn-outline justify-start" @click="fileInput.click()"><i class="fa-solid fa-upload text-ink-400"></i>Restaurar respaldo</button>
              <button class="btn btn-outline justify-start" @click="R.excel()"><i class="fa-solid fa-file-excel text-ink-400"></i>Libro Excel de la finca activa</button>
              <button class="btn btn-outline justify-start" @click="demo"><i class="fa-solid fa-flask-vial text-ink-400"></i>Cargar datos de demostración</button>
            </div>
            <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="importar">
          </div>
          <div class="px-5 py-4 border-t border-ink-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div><p class="text-[13px] font-semibold text-red-600">Zona de peligro</p><p class="text-xs muted">Elimina parcelas, labores, inventario, compras, personal y registros de «{{ st.settings.finca }}». Las demás fincas no se modifican.</p></div>
            <button class="btn btn-danger" @click="S.resetAll()"><i class="fa-solid fa-trash-can"></i>Borrar datos de la finca</button>
          </div>
        </section>
        <section class="card p-5 flex items-center gap-4">
          <img src="assets/icon.svg" alt="" class="w-11 h-11 rounded-lg">
          <div class="flex-1"><p class="font-semibold">AgroPiña Enterprise <span class="muted font-medium">v{{ version }}</span></p><p class="text-xs muted">Funciona sin conexión · Clima de Open-Meteo · Imágenes satelitales de Esri</p></div>
        </section>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
