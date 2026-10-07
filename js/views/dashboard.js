/* AgroPiña Enterprise · Vista: Panel de control (launchpad empresarial) */
(function (AP) {
  'use strict';
  const { computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog, B = AP.negocio;

  AP.views = AP.views || {};
  AP.views.dashboard = {
    setup() {
      const st = S.state;
      const r = S.resumen;
      const saludo = computed(() => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; });
      const w = computed(() => st.weather.data);
      const wx = computed(() => (w.value ? C.wmo(w.value.current.code, w.value.current.isDay) : null));
      const pronostico = computed(() => (w.value ? w.value.daily.filter((d) => !d.pasado).slice(0, 7) : []));

      // Series mensuales (últimos 6 meses) para los mosaicos
      const meses = computed(() => { const m = []; for (let i = 5; i >= 0; i--) m.push(U.monthKey(U.addMonths(st.hoy, -i))); return m; });
      const costoMes = computed(() => meses.value.map((m) => U.sum(st.labores.filter((l) => l.estado === 'completada' && U.monthKey(l.fecha) === m), (l) => l.costoTotal)));
      const ingresoMes = computed(() => meses.value.map((m) => U.sum(st.cosechas.filter((c) => U.monthKey(c.fecha) === m), (c) => c.toneladas * c.precio)));
      const prodProx = computed(() => {
        const ms = []; for (let i = 0; i < 6; i++) ms.push(U.monthKey(U.addMonths(st.hoy, i)));
        return ms.map((m) => U.sum(S.activas.value.filter((p) => U.monthKey(S.estados.value[p.id].cosechaEst < st.hoy ? st.hoy : S.estados.value[p.id].cosechaEst) === m), (p) => S.produccion.value[p.id].toneladas));
      });
      const tendencia = (serie) => { const a = serie[serie.length - 2], b = serie[serie.length - 1]; return a > 0 ? ((b - a) / a) * 100 : null; };
      const ingreso12 = computed(() => U.sum(st.cosechas.filter((c) => c.fecha >= U.addMonths(st.hoy, -11)), (c) => c.toneladas * c.precio));

      const tareas = computed(() => S.pendientes.value.slice(0, 8));
      const recs = computed(() => S.recomendaciones.value.filter((x) => x.nivel !== 'bajo').slice(0, 6));
      const ciclo = computed(() => S.activas.value.map((p) => ({ p, e: S.estados.value[p.id], prod: S.produccion.value[p.id] })).sort((a, b) => a.e.diasParaCosecha - b.e.diasParaCosecha));
      const ventana = computed(() => { const v = S.ventanas.value.ventanas; return v.find((x) => x.calidad === 'óptima') || v[0] || null; });
      const horasHoy = computed(() => S.ventanas.value.horas.slice(0, 24));
      const nivelColor = (n) => (n === 2 ? 'bg-emerald-500' : n === 1 ? 'bg-amber-400' : 'bg-ink-200 dark:bg-white/10');

      const chartFases = (t) => {
        const g = {};
        S.activas.value.forEach((p) => { const f = S.estados.value[p.id].fase; g[f] = (g[f] || 0) + p.hectareas; });
        const keys = Object.keys(g);
        return {
          type: 'doughnut',
          data: { labels: keys.map((k) => C.FASES[k].label), datasets: [{ data: keys.map((k) => U.round(g[k], 1)), backgroundColor: keys.map((k) => C.FASES[k].tone.hex), borderWidth: 0, hoverOffset: 4 }] },
          options: AP.charts.options(t, { cutout: '70%', interaction: { mode: 'nearest' }, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: true, position: 'right' }, tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + U.fmtNum(c.raw, 1) + ' ha' } } } })
        };
      };
      const chartFinanzas = (t) => ({
        type: 'bar',
        data: {
          labels: meses.value.map((m) => U.monthLabel(m)),
          datasets: [
            { label: 'Costos', data: costoMes.value.map((v) => U.round(v)), backgroundColor: t.gold, maxBarThickness: 22 },
            { label: 'Ingresos', data: ingresoMes.value.map((v) => U.round(v)), backgroundColor: t.brand, maxBarThickness: 22 }
          ]
        },
        options: AP.charts.options(t, { plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + AP.money(c.raw) } } }, scales: { y: { ticks: { callback: (v) => AP.money(v, true) } } } })
      });
      return { st, r, saludo, w, wx, pronostico, costoMes, ingresoMes, prodProx, tendencia, ingreso12, tareas, recs, ciclo, ventana, horasHoy, nivelColor, chartFases, chartFinanzas, S, U, C, B };
    },
    template: `
    <div>
      <ap-page-header :title="saludo + ', ' + st.prefs.usuario.nombre.split(' ')[0]" :subtitle="U.fmtDate(st.hoy, 'long') + ' · ' + st.settings.finca" :crumbs="[]">
        <button class="btn btn-outline" @click="S.openForm('cosecha')"><i class="fa-solid fa-basket-shopping"></i>Registrar cosecha</button>
        <button class="btn btn-primary" @click="S.openForm('labor', { estado: 'pendiente', fecha: U.addDays(st.hoy, 1) })"><i class="fa-solid fa-plus"></i>Nueva orden de trabajo</button>
        <template #facets>
          <ap-facet label="Área activa" :value="U.fmtNum(r.hectareas, 1) + ' ha'"></ap-facet>
          <ap-facet label="Parcelas" :value="r.parcelas"></ap-facet>
          <ap-facet label="Plantas en campo" :value="U.fmtCompact(r.plantas)"></ap-facet>
          <ap-facet label="Personal activo" :value="r.personalActivo"></ap-facet>
          <ap-facet label="Fincas" :value="st.fincas.length"></ap-facet>
        </template>
      </ap-page-header>

      <!-- Bienvenida -->
      <div v-if="!st.parcelas.length" class="relative overflow-hidden rounded-xl p-6 sm:p-8 text-white bg-shell mb-5">
        <div class="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-brand-500/25 blur-3xl"></div>
        <div class="relative max-w-2xl">
          <p class="text-[12px] font-semibold uppercase tracking-[0.1em] text-gold-400">AgroPiña Pro 3.0 · Enterprise</p>
          <h2 class="text-2xl font-semibold tracking-tight mt-2">Gestione su operación de piña de punta a punta</h2>
          <p class="text-white/70 mt-2 leading-relaxed text-[14px]">Producción, órdenes de trabajo, compras, inventario, personal, ventas, cobros y finanzas en un solo sistema, para una o varias fincas, sin conexión y en su dispositivo.</p>
          <div class="flex flex-wrap gap-2 mt-5">
            <button class="btn btn-gold" @click="S.openForm('parcela')"><i class="fa-solid fa-plus"></i>Crear mi primera parcela</button>
            <button class="btn bg-white/10 text-white hover:bg-white/15" @click="S.loadDemo()"><i class="fa-solid fa-flask-vial"></i>Explorar con datos de demostración</button>
          </div>
        </div>
      </div>

      <!-- Mosaicos KPI -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <ap-tile title="Cosecha próxima" subtitle="Toneladas en 90 días" :value="U.fmtNum(r.produccion90)" unit="t" :spark="prodProx" spark-type="bar" tone="amber" to="cosechas" :footer="U.fmtCompact(r.produccion90 * 1000 / C.KG_POR_CAJA) + ' cajas eq.'"></ap-tile>
        <ap-tile title="Costo del mes" subtitle="Labores realizadas" :value="$money(costoMes[5], true)" :spark="costoMes" tone="blue" :trend="tendencia(costoMes)" trend-good="down" footer="vs. mes anterior" to="finanzas"></ap-tile>
        <ap-tile title="Ingresos" subtitle="Últimos 12 meses" :value="$money(ingreso12, true)" :spark="ingresoMes" tone="brand" to="ventas" footer="ventas registradas"></ap-tile>
        <ap-tile title="Por cobrar" :subtitle="r.porCobrarVencido > 0 ? $money(r.porCobrarVencido, true) + ' vencido' : 'Sin saldos vencidos'" :value="$money(r.porCobrar, true)" :status="r.porCobrarVencido > 0 ? 'err' : 'ok'" to="ventas"></ap-tile>
        <ap-tile title="Órdenes de trabajo" :subtitle="S.vencidas.value.length ? S.vencidas.value.length + ' vencida(s)' : 'Al día'" :value="S.pendientes.value.length" unit="abiertas" :status="S.vencidas.value.length ? 'warn' : 'ok'" to="labores"></ap-tile>
        <ap-tile title="Inventario" :subtitle="S.stockBajo.value.length ? S.stockBajo.value.length + ' con stock bajo' : 'Abastecido'" :value="$money(r.valorInventario, true)" :status="S.stockBajo.value.length ? 'warn' : 'ok'" to="inventario" :footer="S.ordenesAbiertas.value.length + ' orden(es) de compra abiertas'"></ap-tile>
      </div>

      <div class="grid xl:grid-cols-3 gap-4 mb-4">
        <!-- Mis tareas -->
        <div class="card xl:col-span-2 overflow-hidden">
          <div class="card-head">
            <h3 class="card-title"><i class="fa-solid fa-list-check text-ink-400"></i>Mis tareas <span class="muted font-normal">({{ S.pendientes.value.length }})</span></h3>
            <a href="#/labores" class="text-[12.5px] font-semibold text-brand-700 dark:text-brand-400 hover:underline">Ver tablero</a>
          </div>
          <div class="overflow-x-auto">
            <table class="table">
              <thead><tr><th class="w-10"></th><th>Labor · parcela</th><th>Fecha</th><th>Estado</th><th>Prioridad</th><th class="!text-right">Costo</th></tr></thead>
              <tbody>
                <tr v-for="l in tareas" :key="l.id" class="hover:bg-ink-50 dark:hover:bg-white/[0.02] cursor-pointer" @click="S.openForm('labor', l)">
                  <td @click.stop><button class="w-[18px] h-[18px] rounded border-2 border-ink-300 dark:border-white/20 hover:border-brand-600 align-middle" title="Completar" @click="S.cambiarEstadoLabor(l.id, 'completada')"></button></td>
                  <td class="max-w-[260px]"><div class="flex items-center gap-2 min-w-0"><i :class="['fa-solid text-[12px] w-4 text-center shrink-0', C.labor(l.tipo).icon, C.labor(l.tipo).tone.text]"></i><div class="min-w-0"><p class="font-medium truncate leading-tight">{{ l.tipo }}</p><p class="text-[11.5px] muted truncate leading-tight">{{ S.parcelaNombre(l.parcelaId) }}</p></div></div></td>
                  <td :class="['whitespace-nowrap', l.fecha < st.hoy ? 'text-red-600 font-semibold' : '']">{{ U.fmtRel(l.fecha, st.hoy) }}</td>
                  <td><ap-status :st="B.ESTADOS_LABOR[l.estado].st" :label="B.ESTADOS_LABOR[l.estado].label"></ap-status></td>
                  <td><ap-status :st="B.PRIORIDADES[l.prioridad].st" :label="B.PRIORIDADES[l.prioridad].label"></ap-status></td>
                  <td class="text-right num">{{ $money(l.costoTotal) }}</td>
                </tr>
              </tbody>
            </table>
            <ap-empty v-if="!tareas.length" compact icon="fa-mug-hot" title="Sin tareas abiertas" text="Programe órdenes de trabajo para verlas aquí."></ap-empty>
          </div>
        </div>

        <!-- Clima -->
        <a href="#/clima" class="card overflow-hidden flex flex-col card-hover">
          <div class="card-head">
            <h3 class="card-title"><i class="fa-solid fa-cloud-sun text-ink-400"></i>Clima</h3>
            <span class="text-[11.5px] muted truncate max-w-[55%]"><i class="fa-solid fa-location-dot mr-1"></i>{{ S.ubicacionActual.value.nombre }}<span v-if="st.weather.simulated" class="st st-info ml-1.5">Simulado</span></span>
          </div>
          <div class="card-body flex-1">
            <template v-if="w">
              <div class="flex items-center gap-4">
                <i :class="['fa-solid text-4xl', wx.icon, wx.color]"></i>
                <div><p class="text-[38px] leading-none font-light num">{{ Math.round(w.current.temp) }}°</p><p class="text-[13px] muted mt-1">{{ wx.label }} · ST {{ Math.round(w.current.sensacion) }}°</p></div>
                <div class="ml-auto grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                  <span class="muted">Humedad</span><span class="num font-medium text-right">{{ w.current.rh }}%</span>
                  <span class="muted">Viento</span><span class="num font-medium text-right">{{ Math.round(w.current.viento) }} km/h</span>
                  <span class="muted">Lluvia hoy</span><span class="num font-medium text-right">{{ U.fmtNum(w.hoyDia.lluvia, 1) }} mm</span>
                </div>
              </div>
              <div class="grid grid-cols-7 gap-1 mt-5 pt-4 border-t border-ink-100 dark:border-white/[0.06] text-center">
                <div v-for="d in pronostico" :key="d.fecha" class="flex flex-col items-center gap-1">
                  <span class="text-[10.5px] font-semibold uppercase muted">{{ d.hoy ? 'Hoy' : U.fmtDate(d.fecha, 'weekday') }}</span>
                  <ap-wx :code="d.code" cls="text-[15px]"></ap-wx>
                  <span class="text-[12px] font-semibold num">{{ Math.round(d.tmax) }}°</span>
                  <span :class="['text-[10.5px] num', d.lluvia >= st.settings.umbralLluvia ? 'text-red-600 font-semibold' : 'muted']">{{ U.fmtNum(d.lluvia, 0) }} mm</span>
                </div>
              </div>
              <div class="mt-4 pt-3 border-t border-ink-100 dark:border-white/[0.06]">
                <div class="flex items-center justify-between text-[12px] mb-1.5"><span class="font-semibold">Ventana de aplicación</span><span v-if="ventana" class="muted capitalize">{{ U.fmtDate(ventana.dia, 'day') }} {{ U.fmtTime(ventana.inicio) }}–{{ String(ventana.finHora).padStart(2, '0') }}:00</span><span v-else class="text-red-600">Sin ventanas en 72 h</span></div>
                <div class="flex gap-[2px]"><div v-for="h in horasHoy" :key="h.t" :class="['flex-1 h-5 rounded-[2px]', nivelColor(h.nivel)]" :title="U.fmtTime(h.t) + ' · ' + h.motivo"></div></div>
              </div>
            </template>
            <div v-else-if="st.weather.status === 'error'" class="flex flex-col items-center text-center py-8 gap-2">
              <i class="fa-solid fa-cloud text-2xl text-ink-300"></i><p class="text-[13px] font-semibold">Pronóstico no disponible</p><p class="text-[12px] muted">{{ st.weather.error }}</p>
              <button class="btn btn-outline btn-sm mt-1" @click.prevent="S.loadWeather(true)"><i class="fa-solid fa-rotate"></i>Reintentar</button>
            </div>
            <div v-else class="space-y-3"><div class="skeleton h-12"></div><div class="skeleton h-16"></div><div class="skeleton h-6"></div></div>
          </div>
        </a>
      </div>

      <div class="grid xl:grid-cols-3 gap-4 mb-4">
        <!-- Requiere atención -->
        <div class="card">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-triangle-exclamation text-amber-500"></i>Requiere atención</h3><a href="#/clima" class="text-[12.5px] font-semibold text-brand-700 dark:text-brand-400 hover:underline">Análisis</a></div>
          <div class="px-4 sm:px-5 divide">
            <ap-rec v-for="(x, i) in recs" :key="i" :r="x" show-parcela></ap-rec>
            <ap-empty v-if="!recs.length" compact icon="fa-circle-check" title="Todo bajo control" text="No hay alertas activas."></ap-empty>
          </div>
        </div>
        <!-- Ciclo de cultivo -->
        <div class="card xl:col-span-2 overflow-hidden">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-timeline text-ink-400"></i>Ciclo de cultivo por parcela</h3><a href="#/parcelas" class="text-[12.5px] font-semibold text-brand-700 dark:text-brand-400 hover:underline">Parcelas</a></div>
          <div class="overflow-x-auto">
            <table class="table">
              <thead><tr><th>Parcela</th><th>Fase</th><th class="w-[30%]">Avance del ciclo</th><th class="!text-right">Estimado</th><th class="!text-right">Cosecha</th></tr></thead>
              <tbody>
                <tr v-for="x in ciclo" :key="x.p.id" class="hover:bg-ink-50 dark:hover:bg-white/[0.02] cursor-pointer" @click="$go('parcelas/' + x.p.id)">
                  <td><span class="inline-block w-2 h-2 rounded-full mr-2 align-middle" :style="{ background: x.p.color }"></span><span class="font-medium">{{ x.p.nombre }}</span> <span class="muted text-[12px]">· {{ U.fmtNum(x.p.hectareas, 1) }} ha · {{ x.e.etiquetaCiclo }}</span></td>
                  <td><ap-fase :fase="x.e.fase" short></ap-fase></td>
                  <td><div class="flex items-center gap-2"><div class="bar flex-1"><span :class="x.e.faseInfo.tone.dot" :style="{ width: x.e.progreso + '%' }"></span></div><span class="text-[11.5px] muted num w-9 text-right">{{ Math.round(x.e.progreso) }}%</span></div></td>
                  <td class="text-right num font-medium">{{ U.fmtNum(x.prod.toneladas) }} t</td>
                  <td class="text-right">{{ x.e.diasParaCosecha <= 0 ? 'En cosecha' : U.fmtDate(x.e.cosechaEst, 'short') }}</td>
                </tr>
              </tbody>
            </table>
            <ap-empty v-if="!ciclo.length" compact icon="fa-layer-group" title="Sin parcelas activas"></ap-empty>
          </div>
        </div>
      </div>

      <div v-if="st.parcelas.length" class="grid xl:grid-cols-5 gap-4">
        <div class="card xl:col-span-2">
          <div class="card-head"><h3 class="card-title">Área por fase fenológica</h3></div>
          <div class="card-body"><ap-chart :config="chartFases" height="220px"></ap-chart></div>
        </div>
        <div class="card xl:col-span-3">
          <div class="card-head"><h3 class="card-title">Costos e ingresos · 6 meses</h3><a href="#/finanzas" class="text-[12.5px] font-semibold text-brand-700 dark:text-brand-400 hover:underline">Finanzas</a></div>
          <div class="card-body"><ap-chart :config="chartFinanzas" height="220px"></ap-chart></div>
        </div>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
