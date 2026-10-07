/* AgroPiña Enterprise · Vistas: Cosechas, Sanidad vegetal e Inventario */
(function (AP) {
  'use strict';
  const { ref, computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog, B = AP.negocio;

  AP.views = AP.views || {};

  /* ------------------------------ Cosechas ------------------------------ */
  AP.views.cosechas = {
    setup() {
      const st = S.state;
      const periodo = ref('12m');
      const desde = computed(() => (periodo.value === '12m' ? U.addMonths(st.hoy, -11) : periodo.value === 'anio' ? st.hoy.slice(0, 4) + '-01-01' : '0000'));
      const lista = computed(() => st.cosechas.filter((c) => c.fecha >= desde.value));
      const kpi = computed(() => {
        const t = U.sum(lista.value, (c) => c.toneladas);
        const ing = U.sum(lista.value, (c) => c.toneladas * c.precio);
        const conExp = lista.value.filter((c) => c.exportable != null);
        const conBrix = lista.value.filter((c) => c.brix);
        const ha = U.sum([...new Set(lista.value.map((c) => c.parcelaId + '|' + c.ciclo))], (k) => { const p = S.parcela(k.split('|')[0]); return p ? p.hectareas : 0; });
        return {
          t, ing, precio: t ? ing / t : 0, tHa: ha ? t / ha : 0,
          exportable: conExp.length ? U.sum(conExp, (c) => c.exportable * c.toneladas) / U.sum(conExp, (c) => c.toneladas) : null,
          brix: conBrix.length ? U.sum(conBrix, (c) => c.brix) / conBrix.length : null,
          porCobrar: U.sum(lista.value.filter((c) => c.estadoPago === 'pendiente'), (c) => c.toneladas * c.precio)
        };
      });
      const proximas = computed(() => S.activas.value.map((p) => ({ p, e: S.estados.value[p.id], prod: S.produccion.value[p.id] }))
        .filter((x) => x.e.diasParaCosecha <= 120 && x.e.fase !== 'planificada').sort((a, b) => a.e.diasParaCosecha - b.e.diasParaCosecha));
      const pronosticoT = computed(() => U.sum(proximas.value, (x) => x.prod.toneladas));
      const filas = computed(() => lista.value.map((c) => Object.assign({}, c, {
        parcela: S.parcelaNombre(c.parcelaId), cliente: S.clienteNombre(c.clienteId, c.comprador), ingreso: U.round(c.toneladas * c.precio, 2)
      })));
      const cols = [
        { key: 'fecha', label: 'Fecha', format: (v) => U.fmtDate(v) },
        { key: 'parcela', label: 'Parcela', cls: 'font-semibold' },
        { key: 'ciclo', label: 'Ciclo', align: 'right', hidden: true },
        { key: 'toneladas', label: 'Toneladas', align: 'right', sum: true, format: (v) => U.fmtNum(v, 1) },
        { key: 'cajas', label: 'Cajas', align: 'right', sum: true, format: (v) => (v ? U.fmtNum(v) : '—') },
        { key: 'destino', label: 'Destino' },
        { key: 'cliente', label: 'Cliente', format: (v) => v || '—' },
        { key: 'factura', label: 'Factura', format: (v) => v || '—', hidden: true },
        { key: 'exportable', label: 'Export.', align: 'right', format: (v) => (v != null ? v + '%' : '—') },
        { key: 'brix', label: '°Brix', align: 'right', format: (v) => v || '—', hidden: true },
        { key: 'precio', label: 'Precio/t', align: 'right', format: (v) => AP.money(v), hidden: true },
        { key: 'ingreso', label: 'Ingreso', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'estadoPago', label: 'Cobro', value: (r) => (r.estadoPago === 'pendiente' ? 'Por cobrar' : 'Cobrado') }
      ];
      const chart = (t) => {
        const meses = [];
        for (let i = 11; i >= 0; i--) meses.push(U.monthKey(U.addMonths(st.hoy, -i)));
        const destinos = Object.keys(C.DESTINOS);
        return {
          type: 'bar',
          data: {
            labels: meses.map((m) => U.monthLabel(m)),
            datasets: destinos.map((d) => ({ label: d, data: meses.map((m) => U.round(U.sum(st.cosechas.filter((c) => c.destino === d && U.monthKey(c.fecha) === m), (c) => c.toneladas), 1)), backgroundColor: C.DESTINOS[d].hex, maxBarThickness: 30 }))
          },
          options: AP.charts.options(t, { plugins: { legend: { display: true, position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true } } })
        };
      };
      return { st, periodo, lista, kpi, proximas, pronosticoT, filas, cols, chart, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Producción agrícola" title="Cosechas" subtitle="Pronóstico de cosecha, rendimiento real, calidad, destino y estado de cobro de cada pase.">
        <ap-seg v-model="periodo" :options="[{ value: '12m', label: '12 meses' }, { value: 'anio', label: 'Este año' }, { value: 'todo', label: 'Todo' }]"></ap-seg>
        <button class="btn btn-primary" @click="S.openForm('cosecha')"><i class="fa-solid fa-plus"></i>Registrar cosecha</button>
        <template #facets>
          <ap-facet label="Toneladas" :value="U.fmtNum(kpi.t, 1) + ' t'"></ap-facet>
          <ap-facet label="Cajas equivalentes" :value="U.fmtCompact(kpi.t * 1000 / C.KG_POR_CAJA)"></ap-facet>
          <ap-facet label="Ingresos" :value="$money(kpi.ing)"></ap-facet>
          <ap-facet label="Por cobrar" :value="$money(kpi.porCobrar)" :st="kpi.porCobrar > 0 ? '!text-amber-600' : ''"></ap-facet>
          <ap-facet label="Pronóstico 120 días" :value="U.fmtNum(pronosticoT) + ' t'"></ap-facet>
        </template>
      </ap-page-header>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <ap-tile title="Precio medio" subtitle="Ingreso por tonelada" :value="$money(kpi.precio)" unit="/t" icon="fa-tag"></ap-tile>
        <ap-tile title="Rendimiento" subtitle="Ciclos cosechados" :value="U.fmtNum(kpi.tHa, 1)" unit="t/ha" icon="fa-chart-simple"></ap-tile>
        <ap-tile title="Calidad exportable" subtitle="Ponderada por toneladas" :value="kpi.exportable != null ? U.fmtPct(kpi.exportable) : '—'" icon="fa-award" :footer="kpi.brix ? 'Brix medio ' + U.fmtNum(kpi.brix, 1) + '°' : ''"></ap-tile>
        <ap-tile title="Cuentas por cobrar" subtitle="De cosechas del período" :value="$money(kpi.porCobrar, true)" to="ventas" :status="kpi.porCobrar > 0 ? 'warn' : 'ok'" footer="Ver ventas y cobros"></ap-tile>
      </div>

      <div class="grid lg:grid-cols-5 gap-4 mb-4">
        <div class="card lg:col-span-3">
          <div class="card-head"><h3 class="card-title">Producción por mes y destino</h3><span class="text-xs muted">toneladas</span></div>
          <div class="card-body"><ap-chart :config="chart" height="260px"></ap-chart></div>
        </div>
        <div class="card lg:col-span-2">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-binoculars text-ink-400"></i>Pronóstico · 120 días</h3><span class="text-xs muted num">{{ U.fmtNum(pronosticoT) }} t</span></div>
          <div class="divide max-h-[300px] overflow-y-auto">
            <div v-for="x in proximas" :key="x.p.id" class="row">
              <span class="w-1.5 h-9 rounded-full" :style="{ background: x.p.color }"></span>
              <div class="min-w-0 flex-1">
                <a :href="'#/parcelas/' + x.p.id" class="text-sm font-semibold hover:underline truncate block">{{ x.p.nombre }}</a>
                <p class="text-[11px] muted">{{ U.fmtDate(x.e.ventanaCosecha[0], 'short') }} – {{ U.fmtDate(x.e.ventanaCosecha[1], 'short') }} · {{ U.fmtNum(x.prod.toneladas) }} t</p>
              </div>
              <ap-status :st="x.e.diasParaCosecha <= 0 ? 'st-err' : x.e.diasParaCosecha <= 30 ? 'st-warn' : 'st-neutral'" :label="x.e.diasParaCosecha <= 0 ? 'Ahora' : x.e.diasParaCosecha + ' d'"></ap-status>
              <button class="btn-icon btn-icon-sm" @click="S.openForm('cosecha', { parcelaId: x.p.id })" title="Registrar cosecha"><i class="fa-solid fa-plus"></i></button>
            </div>
            <ap-empty v-if="!proximas.length" compact icon="fa-hourglass" title="Sin cosechas próximas"></ap-empty>
          </div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <ap-data-table id="cosechas" title="Registro de cosechas" export-name="Cosechas" :columns="cols" :rows="filas" sort-key="fecha" sort-dir="desc" clickable @open="(r) => S.openForm('cosecha', st.cosechas.find((c) => c.id === r.id))"
          :empty="{ icon: 'fa-basket-shopping', title: 'Sin cosechas en el período', text: 'Registre cada pase de cosecha para medir rendimiento real, calidad e ingresos.' }">
          <template #cell-parcela="{ row }"><a :href="'#/parcelas/' + row.parcelaId" class="font-semibold hover:underline" @click.stop>{{ row.parcela }}</a><span v-if="row.cicloCerrado" class="st st-neutral ml-2">Cierre</span></template>
          <template #cell-destino="{ row }"><span :class="['chip', C.destino(row.destino).chip]">{{ row.destino }}</span></template>
          <template #cell-ingreso="{ row }"><span class="font-semibold">{{ $money(row.ingreso) }}</span></template>
          <template #cell-estadoPago="{ row }"><ap-status :st="row.estadoPago === 'pendiente' ? 'st-warn' : 'st-ok'" :label="row.estadoPago === 'pendiente' ? 'Por cobrar' : 'Cobrado'" dot></ap-status></template>
          <template #rowActions="{ row }">
            <button v-if="row.estadoPago === 'pendiente'" class="btn-icon btn-icon-sm text-brand-700 dark:text-brand-400" @click="S.registrarCobro(row.id)" title="Registrar cobro" aria-label="Registrar cobro"><i class="fa-solid fa-hand-holding-dollar"></i></button>
            <button class="btn-icon btn-icon-sm hover:!text-red-600" @click="S.deleteCosecha(row.id)" aria-label="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
          </template>
        </ap-data-table>
      </div>
    </div>`
  };

  /* ------------------------------ Sanidad ------------------------------ */
  AP.views.sanidad = {
    setup() {
      const st = S.state;
      const parcela = ref('');
      const lista = computed(() => st.monitoreos.filter((m) => !parcela.value || m.parcelaId === parcela.value).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)));
      const ultimos30 = computed(() => st.monitoreos.filter((m) => U.diffDays(st.hoy, m.fecha) <= 30));
      const sinMonitoreo = computed(() => S.activas.value.filter((p) => { const u = S.ultimoMonitoreo.value[p.id]; return !u || U.diffDays(st.hoy, u.fecha) > 21; }));
      const plagasVistas = computed(() => C.PLAGAS.filter((pl) => st.monitoreos.some((m) => m.plaga === pl.key)));
      const matriz = computed(() => S.activas.value.map((p) => ({
        p,
        celdas: plagasVistas.value.map((pl) => {
          const ms = st.monitoreos.filter((m) => m.parcelaId === p.id && m.plaga === pl.key).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
          return ms[0] || null;
        })
      })));
      const altas = computed(() => Object.values(S.ultimoMonitoreo.value).filter((m) => m.severidad >= 4).length);
      const incidencia = computed(() => { const x = ultimos30.value.filter((m) => m.incidencia != null); return x.length ? U.sum(x, (m) => m.incidencia) / x.length : null; });
      const chart = (t) => {
        const semanas = [];
        for (let i = 11; i >= 0; i--) semanas.push(U.addDays(st.hoy, -i * 7));
        const top = plagasVistas.value.slice(0, 5);
        return {
          type: 'line',
          data: {
            labels: semanas.map((s) => U.fmtDate(s, 'short')),
            datasets: top.map((pl, i) => ({
              label: pl.nombre, borderColor: t.palette[i], backgroundColor: t.palette[i], pointRadius: 3, borderWidth: 2, spanGaps: true,
              data: semanas.map((s) => { const ms = st.monitoreos.filter((m) => m.plaga === pl.key && m.fecha <= s && m.fecha > U.addDays(s, -7)); return ms.length ? U.round(Math.max(...ms.map((m) => m.severidad)), 1) : null; })
            }))
          },
          options: AP.charts.options(t, { plugins: { legend: { display: true, position: 'bottom' } }, scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } } })
        };
      };
      return { st, parcela, lista, ultimos30, sinMonitoreo, plagasVistas, matriz, altas, incidencia, chart, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Producción agrícola" title="Sanidad vegetal" subtitle="Monitoreo de plagas y enfermedades, mapa de presión y seguimiento de tratamientos.">
        <button class="btn btn-primary" @click="S.openForm('monitoreo')"><i class="fa-solid fa-plus"></i>Nuevo monitoreo</button>
      </ap-page-header>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <ap-tile title="Monitoreos" subtitle="Últimos 30 días" :value="ultimos30.length" icon="fa-magnifying-glass"></ap-tile>
        <ap-tile title="Incidencia media" subtitle="Últimos 30 días" :value="incidencia != null ? U.fmtPct(incidencia, 1) : '—'" icon="fa-percent"></ap-tile>
        <ap-tile title="Focos críticos" subtitle="Severidad ≥ 4 en el último registro" :value="altas" :status="altas ? 'err' : 'ok'"></ap-tile>
        <ap-tile title="Sin monitoreo" subtitle="Más de 21 días" :value="sinMonitoreo.length" :status="sinMonitoreo.length ? 'warn' : 'ok'" :footer="sinMonitoreo.length ? sinMonitoreo.map(p => p.nombre).slice(0, 2).join(', ') : 'Todas al día'"></ap-tile>
      </div>

      <div v-if="plagasVistas.length" class="grid lg:grid-cols-5 gap-4 mb-4">
        <div class="card lg:col-span-3 overflow-hidden">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-table-cells text-rose-500"></i>Mapa de presión sanitaria</h3><span class="text-xs muted">último registro</span></div>
          <div class="overflow-x-auto pb-4">
            <table class="text-xs w-full">
              <thead><tr>
                <th class="text-left font-bold muted px-4 py-2 sticky left-0 bg-white dark:bg-ink-900">Parcela</th>
                <th v-for="pl in plagasVistas" :key="pl.key" class="font-semibold muted px-2 py-2 text-center min-w-[84px] leading-tight">{{ pl.nombre }}</th>
              </tr></thead>
              <tbody>
                <tr v-for="r in matriz" :key="r.p.id">
                  <td class="px-4 py-1.5 font-semibold whitespace-nowrap sticky left-0 bg-white dark:bg-ink-900"><span class="inline-block w-2 h-2 rounded-full mr-2" :style="{ background: r.p.color }"></span>{{ r.p.nombre }}</td>
                  <td v-for="(m, i) in r.celdas" :key="i" class="px-1 py-1">
                    <div v-if="m" :class="['h-10 rounded-lg flex flex-col items-center justify-center leading-none gap-0.5 font-bold', C.SEVERIDAD[m.severidad].tone.chip]" :title="C.SEVERIDAD[m.severidad].label + ' · ' + U.fmtDate(m.fecha)">{{ m.severidad }}<span class="text-[9px] font-medium opacity-70">{{ U.fmtRel(m.fecha, st.hoy) }}</span></div>
                    <div v-else class="h-10 rounded-lg bg-ink-50 dark:bg-white/[0.02]"></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card lg:col-span-2">
          <div class="card-head"><h3 class="card-title">Evolución de severidad · 12 semanas</h3></div>
          <div class="px-4 sm:px-5 pb-5"><ap-chart :config="chart" height="250px"></ap-chart></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head flex-wrap">
          <h3 class="card-title">Registros de monitoreo</h3>
          <select v-model="parcela" class="input h-9 text-xs w-auto"><option value="">Todas las parcelas</option><option v-for="p in st.parcelas" :key="p.id" :value="p.id">{{ p.nombre }}</option></select>
        </div>
        <div class="divide">
          <div v-for="m in lista" :key="m.id" class="row group items-start">
            <div :class="['icon-tile font-extrabold', C.SEVERIDAD[m.severidad].tone.soft]">{{ m.severidad }}</div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold text-sm">{{ C.plaga(m.plaga).nombre }}</p>
                <span class="text-[11px] italic muted">{{ C.plaga(m.plaga).cientifico }}</span>
                <a :href="'#/parcelas/' + m.parcelaId" class="chip bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300">{{ S.parcelaNombre(m.parcelaId) }}</a>
              </div>
              <p class="text-xs muted mt-1">{{ U.fmtDate(m.fecha) }} · Severidad {{ C.SEVERIDAD[m.severidad].label.toLowerCase() }}<span v-if="m.incidencia != null"> · {{ m.incidencia }}% incidencia</span><span v-if="m.muestras"> · {{ m.muestras }} plantas</span></p>
              <p v-if="m.accion || m.notas" class="text-[13px] mt-1 text-ink-600 dark:text-ink-300"><span v-if="m.accion" class="font-semibold"><i class="fa-solid fa-arrow-right text-[10px] mr-1"></i>{{ m.accion }}</span><span v-if="m.accion && m.notas"> · </span>{{ m.notas }}</p>
            </div>
            <div class="flex gap-0.5 opacity-70 group-hover:opacity-100">
              <button class="btn-icon btn-icon-sm" @click="S.openForm('monitoreo', m)" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon btn-icon-sm hover:!text-red-600" @click="S.deleteMonitoreo(m.id)" aria-label="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
          <ap-empty v-if="!lista.length" icon="fa-bug" title="Sin monitoreos" text="Registre muestreos periódicos para detectar a tiempo cochinilla, Phytophthora y otras amenazas.">
            <button class="btn btn-primary" @click="S.openForm('monitoreo')"><i class="fa-solid fa-plus"></i>Nuevo monitoreo</button>
          </ap-empty>
        </div>
      </div>
    </div>`
  };

  /* ------------------------------ Inventario ------------------------------ */
  AP.views.inventario = {
    props: { query: Object },
    setup(props) {
      const st = S.state;
      const tab = ref(props.query && props.query.tab === 'movimientos' ? 'movimientos' : 'existencias');
      const cat = ref('');
      const sel = ref(props.query && props.query.i ? props.query.i : '');
      const categorias = computed(() => [...new Set(st.insumos.map((i) => i.categoria))]);
      const consumo30 = computed(() => U.sum(st.movimientos.filter((m) => m.tipo === 'salida' && U.diffDays(st.hoy, m.fecha) <= 30), (m) => m.cantidad * m.costoUnitario));
      const nivel = (i) => {
        const ref_ = Math.max(i.stockMinimo * 2, i.stock, 1);
        return { pct: U.clamp((i.stock / ref_) * 100, 0, 100), bajo: i.stock <= 0 || (i.stockMinimo > 0 && i.stock <= i.stockMinimo) };
      };
      const enCamino = computed(() => {
        const o = {};
        st.ordenes.filter((x) => x.estado === 'aprobada').forEach((x) => x.lineas.forEach((l) => { o[l.insumoId] = (o[l.insumoId] || 0) + (Number(l.cantidad) || 0); }));
        return o;
      });
      const filas = computed(() => st.insumos.filter((i) => !cat.value || i.categoria === cat.value).map((i) => Object.assign({}, i, {
        proveedorN: i.proveedorId ? S.proveedorNombre(i.proveedorId) : (i.proveedor || ''), valor: U.round(Math.max(0, i.stock) * i.costoUnitario, 2),
        bajo: nivel(i).bajo, pct: nivel(i).pct, enCamino: enCamino.value[i.id] || 0
      })));
      const cols = [
        { key: 'nombre', label: 'Insumo', cls: 'font-semibold' },
        { key: 'categoria', label: 'Categoría' },
        { key: 'ingredienteActivo', label: 'Ingrediente activo', format: (v) => v || '—', hidden: true },
        { key: 'proveedorN', label: 'Proveedor', format: (v) => v || '—' },
        { key: 'stock', label: 'Existencia', align: 'right', format: (v) => U.fmtNum(v, 2) },
        { key: 'unidad', label: 'Unidad' },
        { key: 'stockMinimo', label: 'Mínimo', align: 'right', format: (v) => U.fmtNum(v, 1) },
        { key: 'enCamino', label: 'En camino', align: 'right', format: (v) => (v ? U.fmtNum(v, 2) : '—') },
        { key: 'costoUnitario', label: 'Costo prom.', align: 'right', format: (v) => AP.money(v) },
        { key: 'valor', label: 'Valor', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'carencia', label: 'Carencia', align: 'right', format: (v) => (v ? v + ' d' : '—'), hidden: true },
        { key: 'bajo', label: 'Estado', value: (r) => (r.bajo ? 'Reponer' : 'Abastecido'), sortValue: (r) => (r.bajo ? 0 : 1) }
      ];
      const movs = computed(() => {
        const ins = sel.value ? st.insumos.filter((i) => i.id === sel.value) : st.insumos;
        const out = [];
        const refLabel = (r) => {
          if (!r) return '';
          const o = st.ordenes.find((x) => x.id === r); if (o) return o.numero;
          return st.labores.some((x) => x.id === r) ? 'Orden de trabajo' : r;
        };
        ins.forEach((i) => B.kardex(st.movimientos, i.id).forEach((m) => out.push(Object.assign({}, m, { insumo: i.nombre, unidad: i.unidad, ref: refLabel(m.referencia), valor: U.round(m.delta * m.costoUnitario, 2) }))));
        return out;
      });
      const colsMov = [
        { key: 'fecha', label: 'Fecha', format: (v) => U.fmtDate(v) },
        { key: 'insumo', label: 'Insumo', cls: 'font-semibold' },
        { key: 'tipo', label: 'Tipo', value: (r) => ({ entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' })[r.tipo] },
        { key: 'ref', label: 'Referencia', format: (v) => v || '—' },
        { key: 'nota', label: 'Detalle', format: (v) => v || '—' },
        { key: 'delta', label: 'Cantidad', align: 'right', format: (v) => (v > 0 ? '+' : '') + U.fmtNum(v, 2) },
        { key: 'saldo', label: 'Saldo', align: 'right', format: (v) => U.fmtNum(v, 2) },
        { key: 'costoUnitario', label: 'Costo unit.', align: 'right', format: (v) => AP.money(v) },
        { key: 'valor', label: 'Valor', align: 'right', sum: true, format: (v) => AP.money(v) }
      ];
      const pedir = (rows, clear) => {
        const lista = rows.filter((r) => r.id);
        if (!lista.length) return;
        const prov = lista[0].proveedorId && lista.every((r) => r.proveedorId === lista[0].proveedorId) ? lista[0].proveedorId : '';
        S.openForm('orden', { proveedorId: prov, lineas: lista.map((i) => ({ insumoId: i.id, cantidad: U.round(Math.max(i.stockMinimo * 2 - i.stock, i.stockMinimo || 1), 2), costoUnitario: i.costoUnitario })) });
        if (clear) clear();
      };
      const verKardex = (id) => { sel.value = id; tab.value = 'movimientos'; };
      return { st, tab, cat, sel, categorias, consumo30, filas, cols, movs, colsMov, pedir, verKardex, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Cadena de suministro" title="Inventario de insumos" subtitle="Existencias en tiempo real descontadas por las labores, costo promedio ponderado, kardex y reposición.">
        <button class="btn btn-outline" @click="S.openForm('movimiento')" :disabled="!st.insumos.length"><i class="fa-solid fa-right-left"></i>Movimiento</button>
        <button class="btn btn-primary" @click="S.openForm('insumo')"><i class="fa-solid fa-plus"></i>Nuevo insumo</button>
        <template #facets>
          <ap-facet label="Valor en bodega" :value="$money(S.resumen.value.valorInventario)"></ap-facet>
          <ap-facet label="Productos" :value="st.insumos.length + ' en ' + categorias.length + ' categorías'"></ap-facet>
          <ap-facet label="Bajo mínimo" :value="S.stockBajo.value.length" :st="S.stockBajo.value.length ? '!text-amber-600' : ''"></ap-facet>
          <ap-facet label="Consumo 30 días" :value="$money(consumo30)"></ap-facet>
          <ap-facet label="Compras en curso" :value="$money(S.resumen.value.comprasAbiertas || 0)"></ap-facet>
        </template>
        <template #tabs>
          <ap-tab :active="tab === 'existencias'" :count="st.insumos.length" @click="tab = 'existencias'">Existencias</ap-tab>
          <ap-tab :active="tab === 'movimientos'" @click="tab = 'movimientos'">Kardex y movimientos</ap-tab>
        </template>
      </ap-page-header>

      <div v-if="tab === 'existencias'" class="space-y-4">
        <div v-if="S.stockBajo.value.length" class="strip st-warn"><i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
          <span class="flex-1">{{ S.stockBajo.value.length }} insumo(s) en o bajo el stock mínimo: {{ S.stockBajo.value.map((i) => i.nombre).slice(0, 4).join(', ') }}<span v-if="S.stockBajo.value.length > 4">…</span></span>
          <button class="btn btn-outline btn-sm shrink-0" @click="S.openForm('orden', { lineas: S.stockBajo.value.map((i) => ({ insumoId: i.id, cantidad: U.round(Math.max(i.stockMinimo * 2 - i.stock, i.stockMinimo || 1), 2), costoUnitario: i.costoUnitario })) })"><i class="fa-solid fa-cart-plus"></i>Generar orden de compra</button>
        </div>
        <div class="card overflow-hidden">
          <ap-data-table id="insumos" title="Existencias" export-name="Inventario" :columns="cols" :rows="filas" sort-key="nombre" selectable clickable @open="(r) => S.openForm('insumo', st.insumos.find((i) => i.id === r.id))"
            :empty="{ icon: 'fa-boxes-stacked', title: st.insumos.length ? 'Sin resultados' : 'Inventario vacío', text: 'Registre fertilizantes, agroquímicos e inductores para controlar stock, costos y carencias.' }">
            <template #toolbar>
              <select v-model="cat" class="input h-8 text-[12.5px] w-auto"><option value="">Todas las categorías</option><option v-for="c in categorias" :key="c" :value="c">{{ c }}</option></select>
            </template>
            <template #bulk="{ rows, clear }"><button class="btn btn-outline btn-sm" @click="pedir(rows, clear)"><i class="fa-solid fa-cart-plus"></i>Crear orden de compra</button></template>
            <template #cell-nombre="{ row }"><span class="font-semibold">{{ row.nombre }}</span><span v-if="row.carencia" class="st st-warn ml-2" title="Período de carencia"><i class="fa-solid fa-shield-halved text-[9px]"></i>{{ row.carencia }} d</span></template>
            <template #cell-categoria="{ row }"><span class="inline-flex items-center gap-1.5"><span :class="['w-2 h-2 rounded-full', C.categoria(row.categoria).dot]"></span>{{ row.categoria }}</span></template>
            <template #cell-stock="{ row }">
              <div class="flex items-center justify-end gap-2"><div class="bar w-14 hidden sm:block"><span :class="row.bajo ? 'bg-red-500' : 'bg-brand-600'" :style="{ width: row.pct + '%' }"></span></div><span :class="['num font-semibold', row.bajo ? 'text-red-600' : '']">{{ U.fmtNum(row.stock, 2) }}</span></div>
            </template>
            <template #cell-bajo="{ row }"><ap-status :st="row.bajo ? (row.enCamino ? 'st-info' : 'st-err') : 'st-ok'" :label="row.bajo ? (row.enCamino ? 'En camino' : 'Reponer') : 'Abastecido'" dot></ap-status></template>
            <template #rowActions="{ row }">
              <button class="btn-icon btn-icon-sm text-brand-600" @click="S.openForm('movimiento', { insumoId: row.id })" title="Entrada / ajuste"><i class="fa-solid fa-plus-minus"></i></button>
              <ap-menu>
                <template #trigger="{ toggle }"><button class="btn-icon btn-icon-sm" @click="toggle" aria-label="Más acciones"><i class="fa-solid fa-ellipsis-vertical"></i></button></template>
                <button class="menu-item" @click="verKardex(row.id)"><i class="fa-solid fa-list-ol w-4 text-ink-400"></i>Ver kardex</button>
                <button class="menu-item" @click="pedir([row])"><i class="fa-solid fa-cart-plus w-4 text-ink-400"></i>Crear orden de compra</button>
                <button class="menu-item" @click="S.openForm('insumo', st.insumos.find((i) => i.id === row.id))"><i class="fa-solid fa-pen w-4 text-ink-400"></i>Editar</button>
                <div class="menu-sep"></div>
                <button class="menu-item text-red-600" @click="S.deleteInsumo(row.id)"><i class="fa-solid fa-trash-can w-4"></i>Eliminar</button>
              </ap-menu>
            </template>
          </ap-data-table>
        </div>
      </div>

      <div v-else class="card overflow-hidden">
        <ap-data-table :key="'kx' + sel" id="kardex" :title="sel ? 'Kardex' : 'Movimientos'" :export-name="'Kardex' + (sel && S.insumo(sel) ? '_' + S.insumo(sel).nombre : '')" :columns="colsMov" :rows="movs" sort-key="fecha" sort-dir="desc"
          :empty="{ icon: 'fa-right-left', title: 'Sin movimientos', text: 'Las entradas, consumos de labores y ajustes aparecerán aquí.' }">
          <template #toolbar>
            <select v-model="sel" class="input h-8 text-[12.5px] w-auto max-w-[220px]"><option value="">Todos los insumos</option><option v-for="i in st.insumos" :key="i.id" :value="i.id">{{ i.nombre }}</option></select>
          </template>
          <template #cell-tipo="{ row }"><ap-status :st="row.tipo === 'entrada' ? 'st-ok' : row.tipo === 'salida' ? 'st-warn' : 'st-info'" :label="({ entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' })[row.tipo]" :icon="row.tipo === 'entrada' ? 'fa-arrow-down' : row.tipo === 'salida' ? 'fa-arrow-up' : 'fa-scale-balanced'"></ap-status></template>
          <template #cell-delta="{ row }"><span :class="['num font-semibold', row.delta < 0 ? 'text-orange-600' : 'text-emerald-700 dark:text-emerald-400']">{{ (row.delta > 0 ? '+' : '') + U.fmtNum(row.delta, 2) }}</span> <span class="text-[11px] muted">{{ row.unidad }}</span></template>
        </ap-data-table>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
