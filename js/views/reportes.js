/* AgroPiña Enterprise · Vistas: Centro de reportes (incluye consolidado multi-finca) y Auditoría */
(function (AP) {
  'use strict';
  const { ref, computed, watch } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog, B = AP.negocio;

  const money = (v) => AP.money(v);
  const n1 = (v) => U.fmtNum(v, 1);
  const pct = (v) => (v == null || !isFinite(v) ? '—' : U.fmtPct(v, 1));

  /** Catálogo de reportes: columnas + función que produce las filas (siempre sobre la finca activa, salvo el consolidado). */
  function catalogo() {
    const st = S.state;
    return [
      {
        id: 'consolidado', area: 'Corporativo', icon: 'fa-sitemap', titulo: 'Consolidado de fincas',
        desc: 'Indicadores de todas las fincas lado a lado: área, producción, costos, ingresos e inventario.',
        cols: [
          { key: 'nombre', label: 'Finca', cls: 'font-semibold' }, { key: 'parcelas', label: 'Parcelas', align: 'right', sum: true, format: (v) => U.fmtNum(v) },
          { key: 'hectareas', label: 'Hectáreas', align: 'right', sum: true, format: (v) => U.fmtNum(v, 2) },
          { key: 'produccionEstimada', label: 'Producción est. (t)', align: 'right', sum: true, format: n1 },
          { key: 'produccion90', label: 'Cosecha 90 días (t)', align: 'right', sum: true, format: n1 },
          { key: 'costos', label: 'Costos', align: 'right', sum: true, format: money }, { key: 'ingresos', label: 'Ingresos', align: 'right', sum: true, format: money },
          { key: 'margen', label: 'Margen', align: 'right', sum: true, value: (r) => r.ingresos - r.costos, format: money },
          { key: 'laboresAbiertas', label: 'Órdenes abiertas', align: 'right', sum: true, format: (v) => U.fmtNum(v) },
          { key: 'inventario', label: 'Inventario', align: 'right', sum: true, format: money }
        ],
        rows: () => S.todasLasFincas().map((f) => Object.assign({ id: f.id, activa: f.activa }, B.resumenFinca(f.datos, st.hoy)))
      },
      {
        id: 'costos', area: 'Finanzas', icon: 'fa-coins', titulo: 'Costos por parcela',
        desc: 'Mano de obra, insumos y otros costos del ciclo actual y acumulados, con costo por hectárea y margen.',
        cols: [
          { key: 'parcela', label: 'Parcela', cls: 'font-semibold' }, { key: 'ha', label: 'Ha', align: 'right', format: (v) => U.fmtNum(v, 2) },
          { key: 'manoObra', label: 'Mano de obra', align: 'right', sum: true, format: money }, { key: 'insumos', label: 'Insumos', align: 'right', sum: true, format: money },
          { key: 'otros', label: 'Otros', align: 'right', sum: true, format: money }, { key: 'total', label: 'Total acumulado', align: 'right', sum: true, format: money },
          { key: 'ciclo', label: 'Costo del ciclo', align: 'right', sum: true, format: money }, { key: 'porHa', label: 'Costo/ha (ciclo)', align: 'right', format: money },
          { key: 'ingresos', label: 'Ingresos', align: 'right', sum: true, format: money }, { key: 'margen', label: 'Margen', align: 'right', sum: true, format: money }
        ],
        rows: () => st.parcelas.map((p) => {
          const c = S.costos.value[p.id] || { manoObra: 0, insumos: 0, otros: 0, total: 0, ciclo: 0 };
          const i = (S.ingresos.value[p.id] || {}).ingreso || 0;
          return { id: p.id, parcela: p.nombre, ha: p.hectareas, manoObra: c.manoObra, insumos: c.insumos, otros: c.otros, total: c.total, ciclo: c.ciclo, porHa: p.hectareas ? c.ciclo / p.hectareas : 0, ingresos: i, margen: i - c.total };
        })
      },
      {
        id: 'presupuesto', area: 'Finanzas', icon: 'fa-scale-balanced', titulo: 'Presupuesto vs real',
        desc: 'Ejecución del presupuesto del ciclo por parcela, comparada con lo esperado según el avance del cultivo.',
        cols: [
          { key: 'parcela', label: 'Parcela', cls: 'font-semibold', value: (r) => r.parcela.nombre }, { key: 'avance', label: 'Avance ciclo', align: 'right', format: (v) => U.fmtPct(v) },
          { key: 'totalPresu', label: 'Presupuesto', align: 'right', sum: true, format: money }, { key: 'esperado', label: 'Esperado a la fecha', align: 'right', sum: true, format: money },
          { key: 'totalReal', label: 'Real', align: 'right', sum: true, format: money }, { key: 'ejecucion', label: 'Ejecución', align: 'right', format: pct },
          { key: 'desvio', label: 'Desvío vs esperado', align: 'right', format: (v) => (v == null ? '—' : (v > 0 ? '+' : '') + U.fmtNum(v, 1) + '%') },
          { key: 'estado', label: 'Semáforo', value: (r) => ({ 'st-ok': 'En control', 'st-warn': 'Atención', 'st-err': 'Sobregiro', 'st-neutral': 'Sin presupuesto' })[r.estado] }
        ],
        rows: () => S.presupuesto.value.map((x) => Object.assign({ id: x.parcela.id }, x))
      },
      {
        id: 'trazabilidad', area: 'Producción', icon: 'fa-shield-halved', titulo: 'Cuaderno de campo (aplicaciones)',
        desc: 'Trazabilidad de cada producto aplicado: dosis, cantidad, carencia y fecha mínima de cosecha (BPA / GlobalG.A.P.).',
        cols: [
          { key: 'fecha', label: 'Fecha', format: (v) => U.fmtDate(v), exportValue: (r) => r.fecha }, { key: 'parcela', label: 'Parcela', cls: 'font-semibold' }, { key: 'labor', label: 'Labor' },
          { key: 'producto', label: 'Producto' }, { key: 'ia', label: 'Ingrediente activo' }, { key: 'dosisHa', label: 'Dosis/ha', align: 'right', format: (v) => (v == null ? '—' : U.fmtNum(v, 2)) },
          { key: 'cantidad', label: 'Cantidad', align: 'right', format: (v) => U.fmtNum(v, 2) }, { key: 'unidad', label: 'Unidad' },
          { key: 'carencia', label: 'Carencia (d)', align: 'right' }, { key: 'cosecharDesde', label: 'Cosechar desde', format: (v) => (v ? U.fmtDate(v) : '—'), exportValue: (r) => r.cosecharDesde || '' },
          { key: 'responsable', label: 'Responsable' }
        ],
        rows: () => {
          const out = [];
          st.labores.filter((l) => l.estado === 'completada').forEach((l) => l.insumos.forEach((x, k) => {
            const ins = S.insumo(x.insumoId);
            out.push({ id: l.id + ':' + k, fecha: l.fecha, parcela: S.parcelaNombre(l.parcelaId), labor: l.tipo, producto: x.nombre, ia: ins ? ins.ingredienteActivo : '', dosisHa: x.dosisHa, cantidad: x.cantidad, unidad: x.unidad, carencia: x.carencia || 0, cosecharDesde: x.carencia ? U.addDays(l.fecha, x.carencia) : '', responsable: l.responsable || l.trabajadores.map((t) => t.nombre).join(', ') });
          }));
          return out;
        }
      },
      {
        id: 'kardex', area: 'Inventario', icon: 'fa-boxes-stacked', titulo: 'Kardex de insumos',
        desc: 'Entradas, salidas y ajustes de cada insumo con saldo acumulado y costo unitario.',
        cols: [
          { key: 'insumo', label: 'Insumo', cls: 'font-semibold' }, { key: 'fecha', label: 'Fecha', format: (v) => U.fmtDate(v), exportValue: (r) => r.fecha },
          { key: 'tipo', label: 'Tipo', value: (r) => ({ entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' })[r.tipo] },
          { key: 'delta', label: 'Cantidad', align: 'right', format: (v) => (v > 0 ? '+' : '') + U.fmtNum(v, 2) }, { key: 'saldo', label: 'Saldo', align: 'right', format: (v) => U.fmtNum(v, 2) },
          { key: 'costoUnitario', label: 'Costo unit.', align: 'right', format: money }, { key: 'nota', label: 'Detalle' }
        ],
        rows: () => {
          const out = [];
          st.insumos.forEach((i) => B.kardex(st.movimientos, i.id).forEach((m) => out.push(Object.assign({}, m, { insumo: i.nombre + ' (' + i.unidad + ')' }))));
          return out;
        }
      },
      {
        id: 'planilla', area: 'Recursos humanos', icon: 'fa-people-group', titulo: 'Planilla del mes',
        desc: 'Jornales y monto a pagar por trabajador en el mes en curso.',
        cols: [
          { key: 'nombre', label: 'Trabajador', cls: 'font-semibold' }, { key: 'cuadrilla', label: 'Cuadrilla' }, { key: 'dias', label: 'Días', align: 'right' },
          { key: 'jornales', label: 'Jornales', align: 'right', sum: true, format: (v) => U.fmtNum(v, 2) }, { key: 'monto', label: 'Monto', align: 'right', sum: true, format: money }
        ],
        rows: () => { const p = B.periodo('mes', st.hoy); return B.planilla(st.labores, st.trabajadores, p.desde, p.hasta).filas.map((f) => Object.assign({ id: f.trabajadorId }, f)); }
      },
      {
        id: 'ventas', area: 'Comercial', icon: 'fa-file-invoice-dollar', titulo: 'Ventas por cliente',
        desc: 'Toneladas, ingresos, precio medio y calidad exportable por cliente.',
        cols: [
          { key: 'cliente', label: 'Cliente', cls: 'font-semibold' }, { key: 'tipo', label: 'Tipo' }, { key: 'entregas', label: 'Entregas', align: 'right' },
          { key: 'toneladas', label: 'Toneladas', align: 'right', sum: true, format: n1 }, { key: 'ingreso', label: 'Ingreso', align: 'right', sum: true, format: money },
          { key: 'precio', label: 'Precio medio/t', align: 'right', value: (r) => (r.toneladas ? r.ingreso / r.toneladas : 0), format: money },
          { key: 'exportable', label: '% exportable', align: 'right', format: pct }
        ],
        rows: () => {
          const g = U.groupBy(st.cosechas, (c) => c.clienteId || 'texto:' + (c.comprador || 'Sin cliente'));
          return Object.keys(g).map((k) => {
            const cs = g[k], cli = S.cliente(cs[0].clienteId);
            const conExp = cs.filter((c) => c.exportable != null);
            return { id: k, cliente: cli ? cli.nombre : (cs[0].comprador || 'Sin cliente'), tipo: cli ? cli.tipo : '—', entregas: cs.length, toneladas: U.sum(cs, (c) => c.toneladas), ingreso: U.sum(cs, (c) => c.toneladas * c.precio), exportable: conExp.length ? U.sum(conExp, (c) => c.exportable * c.toneladas) / U.sum(conExp, (c) => c.toneladas) : null };
          });
        }
      },
      {
        id: 'cxc', area: 'Comercial', icon: 'fa-hourglass-half', titulo: 'Antigüedad de cuentas por cobrar',
        desc: 'Documentos pendientes de cobro con vencimiento y tramo de antigüedad.',
        cols: [
          { key: 'cliente', label: 'Cliente', cls: 'font-semibold' }, { key: 'documento', label: 'Documento' }, { key: 'fecha', label: 'Fecha', format: (v) => U.fmtDate(v), exportValue: (r) => r.fecha },
          { key: 'vence', label: 'Vence', format: (v) => U.fmtDate(v), exportValue: (r) => r.vence }, { key: 'diasVencido', label: 'Días de atraso', align: 'right' },
          { key: 'tramo', label: 'Tramo', value: (r) => B.TRAMOS[r.tramo] }, { key: 'monto', label: 'Monto', align: 'right', sum: true, format: money }
        ],
        rows: () => S.cxc.value.map((x) => Object.assign({ id: x.cosechaId }, x))
      },
      {
        id: 'compras', area: 'Cadena de suministro', icon: 'fa-truck-ramp-box', titulo: 'Compras por proveedor',
        desc: 'Órdenes, montos recibidos y en curso por proveedor.',
        cols: [
          { key: 'proveedor', label: 'Proveedor', cls: 'font-semibold' }, { key: 'ordenes', label: 'Órdenes', align: 'right', sum: true },
          { key: 'recibido', label: 'Recibido', align: 'right', sum: true, format: money }, { key: 'curso', label: 'En curso', align: 'right', sum: true, format: money },
          { key: 'ultima', label: 'Última orden', format: (v) => (v ? U.fmtDate(v) : '—'), exportValue: (r) => r.ultima || '' }
        ],
        rows: () => st.proveedores.map((p) => {
          const os = st.ordenes.filter((o) => o.proveedorId === p.id && o.estado !== 'cancelada');
          return { id: p.id, proveedor: p.nombre, ordenes: os.length, recibido: U.sum(os.filter((o) => o.estado === 'recibida'), (o) => o.total), curso: U.sum(os.filter((o) => o.estado !== 'recibida'), (o) => o.total), ultima: os.reduce((m, o) => (o.fecha > m ? o.fecha : m), '') };
        })
      },
      {
        id: 'sanidad', area: 'Producción', icon: 'fa-bug', titulo: 'Historial fitosanitario',
        desc: 'Todos los monitoreos de plagas y enfermedades con severidad, incidencia y acción tomada.',
        cols: [
          { key: 'fecha', label: 'Fecha', format: (v) => U.fmtDate(v), exportValue: (r) => r.fecha }, { key: 'parcela', label: 'Parcela', cls: 'font-semibold', value: (r) => S.parcelaNombre(r.parcelaId) },
          { key: 'plaga', label: 'Problema', value: (r) => C.plaga(r.plaga).nombre }, { key: 'severidad', label: 'Severidad', align: 'right' },
          { key: 'incidencia', label: 'Incidencia %', align: 'right', format: (v) => (v == null ? '—' : U.fmtNum(v, 1)) }, { key: 'accion', label: 'Acción' }
        ],
        rows: () => st.monitoreos
      }
    ];
  }

  AP.views = AP.views || {};
  AP.views.reportes = {
    props: { query: Object },
    setup(props) {
      const st = S.state;
      const lista = catalogo();
      const sel = ref(props.query && props.query.r && lista.some((r) => r.id === props.query.r) ? props.query.r : null);
      const actual = computed(() => lista.find((r) => r.id === sel.value) || null);
      const filas = computed(() => (actual.value ? actual.value.rows() : []));
      const areas = computed(() => U.groupBy(lista, (r) => r.area));
      watch(sel, (v) => { history.replaceState(null, '', '#/reportes' + (v ? '?r=' + v : '')); });
      const consolidadoChart = (t) => {
        const fs = filas.value;
        return {
          type: 'bar',
          data: { labels: fs.map((f) => f.nombre), datasets: [
            { label: 'Costos', data: fs.map((f) => U.round(f.costos)), backgroundColor: t.gold, maxBarThickness: 34 },
            { label: 'Ingresos', data: fs.map((f) => U.round(f.ingresos)), backgroundColor: t.brand, maxBarThickness: 34 }
          ] },
          options: AP.charts.options(t, { plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + AP.money(c.raw) } } }, scales: { y: { ticks: { callback: (v) => AP.money(v, true) } } } })
        };
      };
      return { st, lista, sel, actual, filas, areas, consolidadoChart, S, U, R: AP.reportes };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Finanzas y análisis" :title="actual ? actual.titulo : 'Centro de reportes'" :crumbs="actual ? [{ label: 'Finanzas y análisis' }, { label: 'Centro de reportes', to: 'reportes' }] : null"
        :subtitle="actual ? actual.desc : 'Reportes operativos, financieros y de cumplimiento listos para exportar a Excel o CSV.'">
        <button v-if="actual" class="btn btn-outline" @click="sel = null"><i class="fa-solid fa-arrow-left"></i>Todos los reportes</button>
        <button class="btn btn-primary" @click="R.excel()"><i class="fa-solid fa-file-excel"></i>Libro completo (Excel)</button>
      </ap-page-header>

      <div v-if="!actual" class="space-y-6">
        <section v-for="(items, area) in areas" :key="area">
          <p class="section-title mb-2">{{ area }}</p>
          <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <button v-for="r in items" :key="r.id" class="card card-hover p-4 text-left flex gap-3" @click="sel = r.id">
              <span class="w-10 h-10 rounded-lg grid place-items-center bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 shrink-0"><i :class="['fa-solid', r.icon]"></i></span>
              <span class="min-w-0"><span class="block font-semibold text-[14px]">{{ r.titulo }}</span><span class="block text-[12.5px] muted mt-0.5 leading-snug">{{ r.desc }}</span></span>
            </button>
          </div>
        </section>
      </div>

      <div v-else class="space-y-4">
        <div v-if="actual.id === 'consolidado'" class="grid lg:grid-cols-3 gap-4">
          <div class="card lg:col-span-2"><div class="card-head"><h3 class="card-title">Costos e ingresos por finca</h3><span class="text-[12px] muted">{{ st.fincas.length }} finca(s)</span></div><div class="card-body"><ap-chart :config="consolidadoChart" height="240px"></ap-chart></div></div>
          <div class="card card-body flex flex-col justify-center gap-3">
            <p class="text-[13px] muted">Las cifras se muestran en la moneda de cada finca. Consolide solo fincas con la misma moneda.</p>
            <button class="btn btn-outline" @click="S.openForm('finca')"><i class="fa-solid fa-plus"></i>Agregar finca</button>
          </div>
        </div>
        <div class="card overflow-hidden">
          <ap-data-table :key="actual.id" :id="'rep-' + actual.id" :title="actual.titulo" :export-name="actual.titulo" :columns="actual.cols" :rows="filas" :page-size="50"
            :empty="{ icon: actual.icon, title: 'Sin datos para este reporte', text: 'Registre información en el módulo correspondiente.' }">
            <template v-if="actual.id === 'presupuesto'" #cell-estado="{ row }"><ap-status :st="row.estado" :label="({ 'st-ok': 'En control', 'st-warn': 'Atención', 'st-err': 'Sobregiro', 'st-neutral': 'Sin presupuesto' })[row.estado]" dot></ap-status></template>
            <template v-if="actual.id === 'consolidado'" #cell-nombre="{ row }"><span class="font-semibold">{{ row.nombre }}</span><span v-if="row.activa" class="st st-info ml-2">Activa</span></template>
          </ap-data-table>
        </div>
      </div>
    </div>`
  };

  /* ------------------------------ Auditoría ------------------------------ */
  AP.views.auditoria = {
    setup() {
      const st = S.state;
      const entidad = ref('');
      const entidades = computed(() => [...new Set(st.auditoria.map((a) => a.entidad))].sort());
      const filas = computed(() => st.auditoria.filter((a) => !entidad.value || a.entidad === entidad.value));
      const cols = [
        { key: 'fecha', label: 'Fecha y hora', format: (v) => new Date(v).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' }), sortValue: (r) => r.fecha },
        { key: 'usuario', label: 'Usuario' },
        { key: 'accion', label: 'Acción' },
        { key: 'entidad', label: 'Objeto' },
        { key: 'descripcion', label: 'Detalle', cls: 'max-w-[480px] truncate' }
      ];
      const hoy = computed(() => st.auditoria.filter((a) => U.toISO(new Date(a.fecha)) === st.hoy).length);
      const accionSt = (a) => (/Eliminar|Borrar|Cancelar/.test(a) ? 'st-err' : /Crear|Recibir|Aprobar|Cobro/.test(a) ? 'st-ok' : /Restaurar|Importar/.test(a) ? 'st-warn' : 'st-neutral');
      return { st, entidad, entidades, filas, cols, hoy, accionSt, S, U };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Administración" title="Registro de auditoría" subtitle="Historial de cambios de la finca activa: quién hizo qué y cuándo. Se conservan los últimos 1 500 eventos.">
        <template #facets>
          <ap-facet label="Eventos registrados" :value="st.auditoria.length"></ap-facet>
          <ap-facet label="Eventos de hoy" :value="hoy"></ap-facet>
          <ap-facet label="Usuario actual" :value="st.prefs.usuario.nombre"></ap-facet>
        </template>
      </ap-page-header>
      <div class="card overflow-hidden">
        <ap-data-table id="auditoria" title="Eventos" export-name="Auditoria" :columns="cols" :rows="filas" sort-key="fecha" sort-dir="desc" :page-size="50"
          :empty="{ icon: 'fa-clock-rotate-left', title: 'Sin eventos', text: 'Los cambios que realice quedarán registrados aquí.' }">
          <template #toolbar>
            <select v-model="entidad" class="input h-8 w-auto text-[13px]"><option value="">Todos los objetos</option><option v-for="e in entidades" :key="e" :value="e">{{ e }}</option></select>
          </template>
          <template #cell-accion="{ row }"><ap-status :st="accionSt(row.accion)" :label="row.accion"></ap-status></template>
        </ap-data-table>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
