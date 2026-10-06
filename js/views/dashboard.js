/* AgroPiña Pro · Vista: Panel de control */
(function (AP) {
  'use strict';
  const { computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog;

  AP.views = AP.views || {};
  AP.views.dashboard = {
    setup() {
      const st = S.state;
      const saludo = computed(() => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; });
      const w = computed(() => st.weather.data);
      const wx = computed(() => (w.value ? C.wmo(w.value.current.code, w.value.current.isDay) : null));
      const pronostico = computed(() => (w.value ? w.value.daily.filter((d) => !d.pasado).slice(0, 7) : []));
      const r = S.resumen;
      const recs = computed(() => S.recomendaciones.value.filter((x) => x.nivel !== 'bajo').slice(0, 6));
      const agenda = computed(() => S.pendientes.value.slice(0, 6));
      const ciclo = computed(() => S.activas.value.map((p) => ({ p, e: S.estados.value[p.id], prod: S.produccion.value[p.id] }))
        .sort((a, b) => a.e.diasParaCosecha - b.e.diasParaCosecha));
      const ventana = computed(() => {
        const v = S.ventanas.value.ventanas;
        return v.find((x) => x.calidad === 'óptima') || v[0] || null;
      });
      const horasHoy = computed(() => S.ventanas.value.horas.slice(0, 24));
      const nivelColor = (n) => (n === 2 ? 'bg-brand-500' : n === 1 ? 'bg-amber-400' : 'bg-ink-200 dark:bg-white/10');

      const chartFases = (t) => {
        const g = {};
        S.activas.value.forEach((p) => { const f = S.estados.value[p.id].fase; g[f] = (g[f] || 0) + p.hectareas; });
        const keys = Object.keys(g);
        return {
          type: 'doughnut',
          data: { labels: keys.map((k) => C.FASES[k].label), datasets: [{ data: keys.map((k) => U.round(g[k], 1)), backgroundColor: keys.map((k) => C.FASES[k].tone.hex), borderWidth: 0, hoverOffset: 6 }] },
          options: AP.charts.options(t, { cutout: '72%', interaction: { mode: 'nearest' }, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: true, position: 'right' }, tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + U.fmtNum(c.raw, 1) + ' ha' } } } })
        };
      };
      const chartProyeccion = (t) => {
        const meses = [];
        for (let i = 0; i < 12; i++) meses.push(U.monthKey(U.addMonths(st.hoy, i)));
        const vals = meses.map(() => 0);
        S.activas.value.forEach((p) => {
          const e = S.estados.value[p.id];
          const k = U.monthKey(e.cosechaEst < st.hoy ? st.hoy : e.cosechaEst);
          const i = meses.indexOf(k);
          if (i >= 0) vals[i] += S.produccion.value[p.id].toneladas;
        });
        return {
          type: 'bar',
          data: { labels: meses.map((m) => U.monthLabel(m)), datasets: [{ label: 'Toneladas', data: vals.map((v) => U.round(v)), backgroundColor: (ctx) => { const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#f59e0b'); g.addColorStop(1, 'rgba(245,158,11,.35)'); return g; }, maxBarThickness: 34 }] },
          options: AP.charts.options(t, { plugins: { tooltip: { callbacks: { label: (c) => ' ' + U.fmtNum(c.raw) + ' t estimadas' } } } })
        };
      };
      return { st, saludo, w, wx, pronostico, r, recs, agenda, ciclo, ventana, horasHoy, nivelColor, chartFases, chartProyeccion, S, U, C };
    },
    template: `
    <div class="space-y-5 sm:space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up">
        <div>
          <p class="eyebrow">{{ U.fmtDate(st.hoy, 'long') }}</p>
          <h1 class="h-title mt-1.5">{{ saludo }}<span class="text-brand-500">.</span></h1>
          <p class="muted text-sm mt-1.5">{{ st.settings.finca }} · {{ U.fmtNum(r.hectareas, 1) }} ha activas en {{ r.parcelas }} parcelas</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-outline" @click="S.openForm('monitoreo')"><i class="fa-solid fa-bug"></i><span class="hidden sm:inline">Monitoreo</span></button>
          <button class="btn btn-outline" @click="S.openForm('cosecha')"><i class="fa-solid fa-basket-shopping"></i><span class="hidden sm:inline">Cosecha</span></button>
          <button class="btn btn-primary" @click="S.openForm('labor')"><i class="fa-solid fa-plus"></i>Registrar labor</button>
        </div>
      </div>

      <!-- Bienvenida -->
      <div v-if="!st.parcelas.length" class="relative overflow-hidden rounded-3xl p-6 sm:p-10 text-white bg-ink-950 animate-fade-up">
        <div class="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-brand-500/30 blur-3xl"></div>
        <div class="absolute right-20 -bottom-28 w-72 h-72 rounded-full bg-gold-400/20 blur-3xl"></div>
        <div class="relative max-w-xl">
          <span class="chip bg-white/10 text-gold-300 ring-1 ring-white/10"><i class="fa-solid fa-wand-magic-sparkles"></i>Bienvenido a AgroPiña Pro</span>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-4">Gestione su finca de piña con inteligencia agronómica</h2>
          <p class="text-ink-300 mt-3 leading-relaxed">Fenología automática, proyección de cosechas, ventanas de aplicación, control de carencias, inventario y rentabilidad por lote, todo sin conexión y en su dispositivo.</p>
          <div class="flex flex-wrap gap-3 mt-6">
            <button class="btn btn-gold" @click="S.openForm('parcela')"><i class="fa-solid fa-plus"></i>Crear mi primera parcela</button>
            <button class="btn bg-white/10 text-white hover:bg-white/15" @click="S.loadDemo()"><i class="fa-solid fa-flask-vial"></i>Explorar con datos de demostración</button>
          </div>
        </div>
      </div>

      <!-- Clima + KPIs -->
      <div class="grid lg:grid-cols-5 gap-4">
        <a href="#/clima" class="lg:col-span-2 relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950 shadow-lift group animate-fade-up">
          <div class="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-brand-400/25 blur-3xl"></div>
          <div class="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-gold-400/10 blur-3xl"></div>
          <div class="relative">
            <div class="flex items-center justify-between text-xs text-white/70">
              <span class="truncate"><i class="fa-solid fa-location-dot mr-1"></i>{{ S.ubicacionActual.value.nombre }}</span>
              <span v-if="st.weather.simulated" class="chip bg-white/15 text-white shrink-0"><i class="fa-solid fa-flask"></i>Simulado</span>
              <span v-else-if="st.weather.fetchedAt" class="shrink-0"><i v-if="st.weather.stale" class="fa-solid fa-triangle-exclamation mr-1 text-amber-300"></i>{{ U.fmtAgo(st.weather.fetchedAt) }}</span>
            </div>
            <template v-if="w">
              <div class="flex items-center gap-4 mt-4">
                <i :class="['fa-solid text-5xl drop-shadow', wx.icon, wx.color]"></i>
                <div>
                  <div class="text-5xl font-extrabold tracking-tighter num">{{ Math.round(w.current.temp) }}°</div>
                  <div class="text-sm text-white/80 font-medium">{{ wx.label }} · ST {{ Math.round(w.current.sensacion) }}°</div>
                </div>
              </div>
              <div class="grid grid-cols-4 gap-2 mt-5">
                <div class="rounded-xl bg-white/[0.07] ring-1 ring-white/10 px-2.5 py-2"><p class="text-[10px] uppercase tracking-wider text-white/60 font-bold">Humedad</p><p class="font-bold num text-sm mt-0.5">{{ w.current.rh }}%</p></div>
                <div class="rounded-xl bg-white/[0.07] ring-1 ring-white/10 px-2.5 py-2"><p class="text-[10px] uppercase tracking-wider text-white/60 font-bold">Viento</p><p class="font-bold num text-sm mt-0.5">{{ Math.round(w.current.viento) }} <span class="text-[10px] font-medium">km/h</span></p></div>
                <div class="rounded-xl bg-white/[0.07] ring-1 ring-white/10 px-2.5 py-2"><p class="text-[10px] uppercase tracking-wider text-white/60 font-bold">Lluvia</p><p class="font-bold num text-sm mt-0.5">{{ U.fmtNum(w.hoyDia.lluvia, 1) }} <span class="text-[10px] font-medium">mm</span></p></div>
                <div class="rounded-xl bg-white/[0.07] ring-1 ring-white/10 px-2.5 py-2"><p class="text-[10px] uppercase tracking-wider text-white/60 font-bold">ET₀</p><p class="font-bold num text-sm mt-0.5">{{ U.fmtNum(w.hoyDia.et0, 1) }} <span class="text-[10px] font-medium">mm</span></p></div>
              </div>
              <div class="flex justify-between mt-5 pt-4 border-t border-white/10">
                <div v-for="d in pronostico" :key="d.fecha" class="flex flex-col items-center gap-1.5 text-center min-w-0">
                  <span class="text-[10px] font-bold uppercase text-white/60">{{ d.hoy ? 'Hoy' : U.fmtDate(d.fecha, 'weekday') }}</span>
                  <ap-wx :code="d.code" cls="text-base"></ap-wx>
                  <span class="text-xs font-bold num">{{ Math.round(d.tmax) }}°</span>
                  <span :class="['text-[10px] num font-semibold', d.lluvia >= st.settings.umbralLluvia ? 'text-red-300' : 'text-sky-200/80']">{{ U.fmtNum(d.lluvia, 0) }}mm</span>
                </div>
              </div>
            </template>
            <div v-else-if="st.weather.status === 'error'" class="py-8">
              <p class="font-semibold"><i class="fa-solid fa-cloud mr-2"></i>Clima no disponible</p>
              <p class="text-sm text-white/70 mt-1">{{ st.weather.error }}</p>
              <button class="btn btn-sm bg-white/15 text-white mt-4" @click.prevent="S.loadWeather(true)"><i class="fa-solid fa-rotate"></i>Reintentar</button>
            </div>
            <div v-else class="space-y-3 mt-4">
              <div class="h-12 w-40 rounded-xl bg-white/10 animate-pulse"></div>
              <div class="h-14 rounded-xl bg-white/10 animate-pulse"></div>
              <div class="h-16 rounded-xl bg-white/10 animate-pulse"></div>
            </div>
          </div>
        </a>

        <div class="lg:col-span-3 grid grid-cols-2 gap-3 sm:gap-4">
          <ap-stat label="Producción 90 días" :value="U.fmtNum(r.produccion90)" unit="t" icon="fa-weight-hanging" tone="amber" to="cosechas" :sub="'≈ ' + U.fmtNum(r.produccion90 * 1000 / C.KG_POR_CAJA) + ' cajas de 12 kg'"></ap-stat>
          <ap-stat label="Próxima cosecha" :value="r.proximaCosecha ? (r.proximaCosecha.e.diasParaCosecha <= 0 ? 'En curso' : r.proximaCosecha.e.diasParaCosecha + ' días') : '—'" icon="fa-calendar-check" tone="rose" :to="r.proximaCosecha ? 'parcelas/' + r.proximaCosecha.p.id : null" :sub="r.proximaCosecha ? r.proximaCosecha.p.nombre + ' · ' + U.fmtDate(r.proximaCosecha.e.cosechaEst, 'short') : 'Sin parcelas activas'"></ap-stat>
          <ap-stat label="Labores pendientes" :value="S.pendientes.value.length" icon="fa-list-check" tone="sky" to="labores">
            <span v-if="S.vencidas.value.length" class="text-red-500 font-semibold"><i class="fa-solid fa-clock"></i> {{ S.vencidas.value.length }} vencida(s)</span>
            <span v-else>Al día</span>
          </ap-stat>
          <ap-stat label="Inventario" :value="$money(r.valorInventario, true)" icon="fa-boxes-stacked" tone="violet" to="inventario">
            <span v-if="S.stockBajo.value.length" class="text-amber-600 font-semibold"><i class="fa-solid fa-triangle-exclamation"></i> {{ S.stockBajo.value.length }} con stock bajo</span>
            <span v-else>{{ st.insumos.length }} productos</span>
          </ap-stat>
          <ap-stat label="Plantas en campo" :value="U.fmtCompact(r.plantas)" icon="fa-seedling" tone="emerald" to="parcelas" :sub="U.fmtNum(r.hectareas, 1) + ' ha · ' + r.parcelas + ' parcelas'"></ap-stat>
          <ap-stat label="Costo acumulado" :value="$money(r.costoTotal, true)" icon="fa-coins" tone="orange" to="finanzas" :sub="r.hectareas ? $money(r.costoTotal / r.hectareas) + ' por ha' : ''"></ap-stat>
        </div>
      </div>

      <!-- Atención + ventana -->
      <div class="grid lg:grid-cols-3 gap-4">
        <div class="card lg:col-span-2">
          <div class="card-head">
            <h3 class="card-title"><i class="fa-solid fa-bolt text-gold-500"></i>Requiere atención</h3>
            <a href="#/clima" class="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline">Ver análisis</a>
          </div>
          <div class="px-4 sm:px-5 pb-2 divide">
            <ap-rec v-for="(x, i) in recs" :key="i" :r="x" show-parcela></ap-rec>
            <ap-empty v-if="!recs.length" compact icon="fa-circle-check" title="Todo bajo control" text="No hay alertas activas para sus parcelas."></ap-empty>
          </div>
        </div>
        <div class="card flex flex-col">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-spray-can-sparkles text-rose-500"></i>Ventana de aplicación</h3></div>
          <div class="px-4 sm:px-5 pb-5 flex-1 flex flex-col">
            <template v-if="w">
              <div v-if="ventana" class="rounded-xl p-4 bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-500/15">
                <p class="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">Próxima ventana {{ ventana.calidad }}</p>
                <p class="text-xl font-extrabold mt-1 capitalize">{{ U.fmtDate(ventana.dia, 'day') }}</p>
                <p class="text-sm muted">{{ U.fmtTime(ventana.inicio) }} – {{ String(ventana.finHora).padStart(2, '0') }}:00 · {{ ventana.horas }} h aptas</p>
              </div>
              <div v-else class="rounded-xl p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm font-medium">Sin ventanas aptas en las próximas 72 h.</div>
              <p class="eyebrow mt-5 mb-2">Próximas 24 horas</p>
              <div class="flex gap-[3px]">
                <div v-for="h in horasHoy" :key="h.t" :class="['flex-1 h-8 rounded-[4px]', nivelColor(h.nivel)]" :title="U.fmtTime(h.t) + ' · ' + h.motivo"></div>
              </div>
              <div class="flex justify-between text-[10px] muted mt-1 num"><span>{{ horasHoy[0] ? U.fmtTime(horasHoy[0].t) : '' }}</span><span>+12 h</span><span>+24 h</span></div>
              <div class="flex gap-3 mt-auto pt-4 text-[11px] muted">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-brand-500"></span>Óptima</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>Aceptable</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-ink-200 dark:bg-white/10"></span>No apta</span>
              </div>
            </template>
            <div v-else-if="st.weather.status === 'error'" class="flex-1 flex flex-col items-center justify-center text-center py-6 gap-3">
              <span class="icon-tile bg-ink-100 text-ink-400 dark:bg-white/5"><i class="fa-solid fa-cloud"></i></span>
              <p class="text-sm font-semibold">Sin pronóstico</p>
              <p class="text-xs muted max-w-[220px]">Las ventanas de aplicación necesitan el pronóstico por hora.</p>
              <button class="btn btn-soft btn-sm" @click="S.loadWeather(true)"><i class="fa-solid fa-rotate"></i>Reintentar</button>
            </div>
            <div v-else class="space-y-3"><div class="skeleton h-20"></div><div class="skeleton h-8"></div></div>
          </div>
        </div>
      </div>

      <!-- Ciclo + agenda -->
      <div class="grid lg:grid-cols-3 gap-4">
        <div class="card lg:col-span-2">
          <div class="card-head">
            <h3 class="card-title"><i class="fa-solid fa-timeline text-brand-600"></i>Ciclo de cultivo</h3>
            <a href="#/parcelas" class="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline">Todas las parcelas</a>
          </div>
          <div class="divide">
            <a v-for="x in ciclo" :key="x.p.id" :href="'#/parcelas/' + x.p.id" class="row">
              <span class="w-1.5 h-10 rounded-full shrink-0" :style="{ background: x.p.color }"></span>
              <div class="min-w-0 w-28 sm:w-40">
                <p class="font-semibold text-sm truncate">{{ x.p.nombre }}</p>
                <p class="text-[11px] muted">{{ U.fmtNum(x.p.hectareas, 1) }} ha · {{ x.e.etiquetaCiclo }}</p>
              </div>
              <div class="flex-1 min-w-0 hidden sm:block">
                <div class="bar"><span :class="x.e.faseInfo.tone.dot" :style="{ width: x.e.progreso + '%' }"></span></div>
                <p class="text-[11px] muted mt-1">Día {{ x.e.dias }} · {{ Math.round(x.e.progreso) }}% del ciclo</p>
              </div>
              <ap-fase :fase="x.e.fase" short class="hidden md:inline-flex"></ap-fase>
              <div class="text-right shrink-0 ml-auto">
                <p class="text-sm font-bold num">{{ U.fmtNum(x.prod.toneladas) }} t</p>
                <p class="text-[11px] muted">{{ x.e.diasParaCosecha <= 0 ? 'en cosecha' : U.fmtDate(x.e.cosechaEst, 'short') }}</p>
              </div>
            </a>
            <ap-empty v-if="!ciclo.length" compact icon="fa-layer-group" title="Sin parcelas activas"></ap-empty>
          </div>
        </div>
        <div class="card">
          <div class="card-head">
            <h3 class="card-title"><i class="fa-solid fa-calendar-day text-sky-500"></i>Agenda</h3>
            <a href="#/calendario" class="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline">Calendario</a>
          </div>
          <div class="divide">
            <div v-for="l in agenda" :key="l.id" class="row">
              <button class="w-5 h-5 rounded-md border-2 border-ink-300 dark:border-white/20 hover:border-brand-500 grid place-items-center shrink-0 transition" @click="S.completarLabor(l.id)" title="Marcar como realizada"></button>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold truncate">{{ l.tipo }}</p>
                <p class="text-[11px] muted truncate">{{ S.parcelaNombre(l.parcelaId) }}</p>
              </div>
              <span :class="['chip', l.fecha < st.hoy ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : l.fecha === st.hoy ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300']">{{ U.fmtRel(l.fecha, st.hoy) }}</span>
            </div>
            <ap-empty v-if="!agenda.length" compact icon="fa-mug-hot" title="Sin labores programadas" text="Programe labores futuras para verlas aquí.">
              <button class="btn btn-soft btn-sm" @click="S.openForm('labor', { estado: 'pendiente', fecha: U.addDays(st.hoy, 1) })"><i class="fa-solid fa-plus"></i>Programar</button>
            </ap-empty>
          </div>
        </div>
      </div>

      <div v-if="st.parcelas.length" class="grid lg:grid-cols-5 gap-4">
        <div class="card lg:col-span-2">
          <div class="card-head"><h3 class="card-title">Área por fase fenológica</h3></div>
          <div class="px-4 sm:px-5 pb-5"><ap-chart :config="chartFases" height="220px"></ap-chart></div>
        </div>
        <div class="card lg:col-span-3">
          <div class="card-head"><h3 class="card-title">Producción proyectada · 12 meses</h3><span class="text-xs muted">toneladas</span></div>
          <div class="px-4 sm:px-5 pb-5"><ap-chart :config="chartProyeccion" height="220px"></ap-chart></div>
        </div>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
