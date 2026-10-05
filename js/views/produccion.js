/* AgroPiña Pro · Vistas: Cosechas, Sanidad vegetal e Inventario */
(function (AP) {
  'use strict';
  const { ref, computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog;

  AP.views = AP.views || {};

  /* ------------------------------ Cosechas ------------------------------ */
  AP.views.cosechas = {
    setup() {
      const st = S.state;
      const periodo = ref('12m');
      const desde = computed(() => (periodo.value === '12m' ? U.addMonths(st.hoy, -11) : periodo.value === 'anio' ? st.hoy.slice(0, 4) + '-01-01' : '0000'));
      const lista = computed(() => st.cosechas.filter((c) => c.fecha >= desde.value).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)));
      const kpi = computed(() => {
        const t = U.sum(lista.value, (c) => c.toneladas);
        const ing = U.sum(lista.value, (c) => c.toneladas * c.precio);
        const conExp = lista.value.filter((c) => c.exportable != null);
        const conBrix = lista.value.filter((c) => c.brix);
        const ha = U.sum([...new Set(lista.value.map((c) => c.parcelaId + '|' + c.ciclo))], (k) => { const p = S.parcela(k.split('|')[0]); return p ? p.hectareas : 0; });
        return {
          t, ing, precio: t ? ing / t : 0, tHa: ha ? t / ha : 0,
          exportable: conExp.length ? U.sum(conExp, (c) => c.exportable * c.toneladas) / U.sum(conExp, (c) => c.toneladas) : null,
          brix: conBrix.length ? U.sum(conBrix, (c) => c.brix) / conBrix.length : null
        };
      });
      const proximas = computed(() => S.activas.value.map((p) => ({ p, e: S.estados.value[p.id], prod: S.produccion.value[p.id] }))
        .filter((x) => x.e.diasParaCosecha <= 120 && x.e.fase !== 'planificada').sort((a, b) => a.e.diasParaCosecha - b.e.diasParaCosecha));
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
      return { st, periodo, lista, kpi, proximas, chart, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Producción" title="Cosechas" subtitle="Pronóstico de cosecha, rendimiento real, calidad y comercialización.">
        <ap-seg v-model="periodo" :options="[{ value: '12m', label: '12 meses' }, { value: 'anio', label: 'Este año' }, { value: 'todo', label: 'Todo' }]"></ap-seg>
        <button class="btn btn-primary" @click="S.openForm('cosecha')"><i class="fa-solid fa-plus"></i>Registrar cosecha</button>
      </ap-page-header>

      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <ap-stat label="Toneladas" :value="U.fmtNum(kpi.t, 1)" unit="t" icon="fa-weight-hanging" tone="amber" :sub="U.fmtCompact(kpi.t * 1000 / C.KG_POR_CAJA) + ' cajas eq.'"></ap-stat>
        <ap-stat label="Ingresos" :value="$money(kpi.ing, true)" icon="fa-sack-dollar" tone="emerald"></ap-stat>
        <ap-stat label="Precio medio" :value="$money(kpi.precio)" unit="/t" icon="fa-tag" tone="sky"></ap-stat>
        <ap-stat label="Rendimiento" :value="U.fmtNum(kpi.tHa, 1)" unit="t/ha" icon="fa-chart-simple" tone="violet"></ap-stat>
        <ap-stat label="Calidad" :value="kpi.exportable != null ? U.fmtPct(kpi.exportable) : '—'" icon="fa-award" tone="rose" :sub="kpi.brix ? 'exportable · ' + U.fmtNum(kpi.brix, 1) + ' °Brix' : 'exportable'"></ap-stat>
      </div>

      <div class="grid lg:grid-cols-5 gap-4 mb-4">
        <div class="card lg:col-span-3">
          <div class="card-head"><h3 class="card-title">Producción por mes y destino</h3><span class="text-xs muted">toneladas</span></div>
          <div class="px-4 sm:px-5 pb-5"><ap-chart :config="chart" height="260px"></ap-chart></div>
        </div>
        <div class="card lg:col-span-2">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-binoculars text-gold-500"></i>Pronóstico · 120 días</h3></div>
          <div class="divide">
            <div v-for="x in proximas" :key="x.p.id" class="row">
              <span class="w-1.5 h-9 rounded-full" :style="{ background: x.p.color }"></span>
              <div class="min-w-0 flex-1">
                <a :href="'#/parcelas/' + x.p.id" class="text-sm font-semibold hover:underline truncate block">{{ x.p.nombre }}</a>
                <p class="text-[11px] muted">{{ U.fmtDate(x.e.ventanaCosecha[0], 'short') }} – {{ U.fmtDate(x.e.ventanaCosecha[1], 'short') }} · {{ U.fmtNum(x.prod.toneladas) }} t</p>
              </div>
              <span :class="['chip', x.e.diasParaCosecha <= 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : x.e.diasParaCosecha <= 30 ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300']">{{ x.e.diasParaCosecha <= 0 ? 'Ahora' : x.e.diasParaCosecha + ' d' }}</span>
              <button class="btn-icon btn-icon-sm" @click="S.openForm('cosecha', { parcelaId: x.p.id })" title="Registrar cosecha"><i class="fa-solid fa-plus"></i></button>
            </div>
            <ap-empty v-if="!proximas.length" compact icon="fa-hourglass" title="Sin cosechas próximas"></ap-empty>
          </div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="card-head"><h3 class="card-title">Registro de cosechas</h3><span class="text-xs muted">{{ lista.length }} registros</span></div>
        <div v-if="lista.length" class="overflow-x-auto">
          <table class="table">
            <thead><tr><th>Fecha</th><th>Parcela</th><th class="!text-right">Toneladas</th><th class="!text-right">Cajas</th><th>Destino</th><th class="!text-right">Export.</th><th class="!text-right">°Brix</th><th class="!text-right">Ingreso</th><th></th></tr></thead>
            <tbody>
              <tr v-for="c in lista" :key="c.id" class="hover:bg-ink-50/70 dark:hover:bg-white/[0.02] group">
                <td class="font-medium">{{ U.fmtDate(c.fecha) }}</td>
                <td><a :href="'#/parcelas/' + c.parcelaId" class="font-semibold hover:underline">{{ S.parcelaNombre(c.parcelaId) }}</a><span v-if="c.cicloCerrado" class="chip bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300 ml-2">Cierre</span></td>
                <td class="text-right num font-semibold">{{ U.fmtNum(c.toneladas, 1) }}</td>
                <td class="text-right num muted">{{ c.cajas ? U.fmtNum(c.cajas) : '—' }}</td>
                <td><span :class="['chip', C.destino(c.destino).chip]">{{ c.destino }}</span></td>
                <td class="text-right num">{{ c.exportable != null ? c.exportable + '%' : '—' }}</td>
                <td class="text-right num">{{ c.brix || '—' }}</td>
                <td class="text-right num font-bold text-brand-700 dark:text-brand-400">{{ $money(c.toneladas * c.precio) }}</td>
                <td class="text-right">
                  <button class="btn-icon btn-icon-sm" @click="S.openForm('cosecha', c)" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn-icon btn-icon-sm hover:!text-red-600" @click="S.deleteCosecha(c.id)" aria-label="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ap-empty v-else icon="fa-basket-shopping" title="Sin cosechas en el período" text="Registre cada pase de cosecha para medir rendimiento real, calidad e ingresos.">
          <button class="btn btn-primary" @click="S.openForm('cosecha')"><i class="fa-solid fa-plus"></i>Registrar cosecha</button>
        </ap-empty>
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
      <ap-page-header eyebrow="Producción" title="Sanidad vegetal" subtitle="Monitoreo de plagas y enfermedades, mapa de presión y seguimiento de tratamientos.">
        <button class="btn btn-primary" @click="S.openForm('monitoreo')"><i class="fa-solid fa-plus"></i>Nuevo monitoreo</button>
      </ap-page-header>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <ap-stat label="Monitoreos 30 días" :value="ultimos30.length" icon="fa-magnifying-glass" tone="violet"></ap-stat>
        <ap-stat label="Incidencia media" :value="incidencia != null ? U.fmtPct(incidencia, 1) : '—'" icon="fa-percent" tone="amber" sub="últimos 30 días"></ap-stat>
        <ap-stat label="Focos críticos" :value="altas" icon="fa-bug" :tone="altas ? 'red' : 'emerald'" sub="severidad ≥ 4 (último registro)"></ap-stat>
        <ap-stat label="Sin monitoreo" :value="sinMonitoreo.length" icon="fa-eye-slash" tone="sky" :sub="sinMonitoreo.length ? sinMonitoreo.map(p => p.nombre).slice(0, 2).join(', ') : 'Todas al día'"></ap-stat>
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
    setup() {
      const st = S.state;
      const q = ref('');
      const cat = ref('');
      const lista = computed(() => st.insumos.filter((i) => (!cat.value || i.categoria === cat.value) && U.match(q.value, i.nombre, i.ingredienteActivo, i.proveedor))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)));
      const categorias = computed(() => [...new Set(st.insumos.map((i) => i.categoria))]);
      const movs = computed(() => st.movimientos.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 12));
      const consumo30 = computed(() => U.sum(st.movimientos.filter((m) => m.tipo === 'salida' && U.diffDays(st.hoy, m.fecha) <= 30), (m) => m.cantidad * m.costoUnitario));
      const nivel = (i) => {
        const ref_ = Math.max(i.stockMinimo * 2, i.stock, 1);
        return { pct: U.clamp((i.stock / ref_) * 100, 0, 100), bajo: i.stock <= 0 || (i.stockMinimo > 0 && i.stock <= i.stockMinimo) };
      };
      return { st, q, cat, lista, categorias, movs, consumo30, nivel, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Producción" title="Inventario de insumos" subtitle="Stock en tiempo real descontado por las labores, costo promedio y períodos de carencia.">
        <button class="btn btn-outline" @click="S.openForm('movimiento')" :disabled="!st.insumos.length"><i class="fa-solid fa-right-left"></i>Movimiento</button>
        <button class="btn btn-primary" @click="S.openForm('insumo')"><i class="fa-solid fa-plus"></i>Nuevo insumo</button>
      </ap-page-header>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <ap-stat label="Valor en bodega" :value="$money(S.resumen.value.valorInventario, true)" icon="fa-warehouse" tone="violet"></ap-stat>
        <ap-stat label="Productos" :value="st.insumos.length" icon="fa-boxes-stacked" tone="sky" :sub="categorias.length + ' categorías'"></ap-stat>
        <ap-stat label="Stock bajo" :value="S.stockBajo.value.length" icon="fa-triangle-exclamation" :tone="S.stockBajo.value.length ? 'amber' : 'emerald'" :sub="S.stockBajo.value.length ? S.stockBajo.value.map(i => i.nombre).slice(0, 2).join(', ') : 'Todo abastecido'"></ap-stat>
        <ap-stat label="Consumo 30 días" :value="$money(consumo30, true)" icon="fa-arrow-trend-down" tone="orange"></ap-stat>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <div class="relative sm:w-72">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 text-sm"></i>
          <input v-model="q" class="input pl-10" placeholder="Buscar producto, ingrediente…">
        </div>
        <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <button :class="['filter-chip', !cat ? 'filter-chip-on' : '']" @click="cat = ''">Todas</button>
          <button v-for="c in categorias" :key="c" :class="['filter-chip', cat === c ? 'filter-chip-on' : '']" @click="cat = c"><span :class="['w-2 h-2 rounded-full', C.categoria(c).dot]"></span>{{ c }}</button>
        </div>
      </div>

      <div class="grid xl:grid-cols-3 gap-4">
        <div class="xl:col-span-2 card overflow-hidden">
          <div v-if="lista.length" class="divide">
            <div v-for="i in lista" :key="i.id" class="row group">
              <div :class="['icon-tile', C.categoria(i.categoria).soft]"><i class="fa-solid fa-flask"></i></div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-sm">{{ i.nombre }}</p>
                  <span :class="['chip', C.categoria(i.categoria).chip]">{{ i.categoria }}</span>
                  <span v-if="i.carencia" class="chip bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"><i class="fa-solid fa-shield-halved"></i>{{ i.carencia }} d</span>
                </div>
                <p class="text-[11px] muted mt-0.5 truncate">{{ i.ingredienteActivo || '—' }}<span v-if="i.proveedor"> · {{ i.proveedor }}</span> · {{ $money(i.costoUnitario) }}/{{ i.unidad }}</p>
                <div class="flex items-center gap-2 mt-2 max-w-xs">
                  <div class="bar flex-1"><span :class="nivel(i).bajo ? 'bg-red-500' : 'bg-brand-500'" :style="{ width: nivel(i).pct + '%' }"></span></div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p :class="['font-extrabold num', nivel(i).bajo ? 'text-red-600' : '']">{{ U.fmtNum(i.stock, 2) }} <span class="text-xs font-semibold muted">{{ i.unidad }}</span></p>
                <p class="text-[11px] muted">mín. {{ U.fmtNum(i.stockMinimo, 1) }} · {{ $money(Math.max(0, i.stock) * i.costoUnitario) }}</p>
                <div class="flex justify-end gap-0.5 mt-1 opacity-70 group-hover:opacity-100">
                  <button class="btn-icon btn-icon-sm text-brand-600" @click="S.openForm('movimiento', { insumoId: i.id })" title="Entrada / ajuste"><i class="fa-solid fa-plus-minus"></i></button>
                  <button class="btn-icon btn-icon-sm" @click="S.openForm('insumo', i)" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn-icon btn-icon-sm hover:!text-red-600" @click="S.deleteInsumo(i.id)" aria-label="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </div>
              </div>
            </div>
          </div>
          <ap-empty v-else icon="fa-boxes-stacked" :title="st.insumos.length ? 'Sin resultados' : 'Inventario vacío'" text="Registre fertilizantes, agroquímicos e inductores para controlar stock, costos y carencias.">
            <button class="btn btn-primary" @click="S.openForm('insumo')"><i class="fa-solid fa-plus"></i>Nuevo insumo</button>
          </ap-empty>
        </div>
        <div class="card self-start">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-clock-rotate-left text-sky-500"></i>Movimientos recientes</h3></div>
          <div class="divide">
            <div v-for="m in movs" :key="m.id" class="row">
              <div :class="['w-8 h-8 rounded-lg grid place-items-center text-xs shrink-0', m.tipo === 'entrada' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10' : m.tipo === 'salida' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10' : 'bg-sky-50 text-sky-600 dark:bg-sky-500/10']">
                <i :class="['fa-solid', m.tipo === 'entrada' ? 'fa-arrow-down' : m.tipo === 'salida' ? 'fa-arrow-up' : 'fa-scale-balanced']"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold truncate">{{ S.insumo(m.insumoId) ? S.insumo(m.insumoId).nombre : 'Insumo' }}</p>
                <p class="text-[11px] muted truncate">{{ U.fmtDate(m.fecha, 'short') }} · {{ m.nota }}</p>
              </div>
              <span :class="['text-sm font-bold num shrink-0', m.tipo === 'salida' || m.cantidad < 0 ? 'text-orange-600' : 'text-brand-600']">{{ m.tipo === 'salida' ? '−' + U.fmtNum(m.cantidad, 2) : (m.cantidad >= 0 ? '+' : '') + U.fmtNum(m.cantidad, 2) }}</span>
            </div>
            <ap-empty v-if="!movs.length" compact icon="fa-right-left" title="Sin movimientos"></ap-empty>
          </div>
        </div>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
