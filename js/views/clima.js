/* AgroPiña Pro · Vista: Clima, ventanas de aplicación y riesgo agroclimático */
(function (AP) {
  'use strict';
  const { computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog, A = AP.agro;

  AP.views = AP.views || {};
  AP.views.clima = {
    setup() {
      const st = S.state;
      const w = computed(() => st.weather.data);
      const wx = computed(() => (w.value ? C.wmo(w.value.current.code, w.value.current.isDay) : null));
      const fut = computed(() => (w.value ? w.value.daily.filter((d) => !d.pasado).slice(0, 7) : []));
      const dias3 = computed(() => {
        const g = U.groupBy(S.ventanas.value.horas, (h) => h.dia);
        return Object.keys(g).slice(0, 3).map((k) => ({ dia: k, horas: g[k], slots: Array.from({ length: 24 }, (_, h) => g[k].find((x) => x.hora === h) || null) }));
      });
      const balance = computed(() => {
        if (!w.value) return null;
        const pas = w.value.daily.filter((d) => d.pasado);
        const f = w.value.daily.filter((d) => !d.pasado);
        return { lluviaPas: U.sum(pas, (d) => d.lluvia), et0Pas: U.sum(pas, (d) => d.et0), lluviaFut: U.sum(f, (d) => d.lluvia), et0Fut: U.sum(f, (d) => d.et0) };
      });
      const proyecciones = computed(() => S.activas.value.map((p) => ({ p, e: S.estados.value[p.id], recs: S.recomendaciones.value.filter((r) => r.parcelaId === p.id) })));
      const nivelClase = (n) => (n === 2 ? 'bg-brand-500' : n === 1 ? 'bg-amber-400' : 'bg-ink-100 dark:bg-white/[0.06]');

      const chartHoras = (t) => {
        const hs = w.value ? w.value.hourly.slice(0, 48) : [];
        return {
          type: 'bar',
          data: {
            labels: hs.map((h) => (h.hora === 0 ? U.fmtDate(h.dia, 'weekday') : String(h.hora).padStart(2, '0') + 'h')),
            datasets: [
              { type: 'line', label: 'Temperatura (°C)', data: hs.map((h) => h.temp), borderColor: t.gold, backgroundColor: t.gold, yAxisID: 'y', pointRadius: 0, borderWidth: 2.5, order: 0 },
              { type: 'bar', label: 'Prob. lluvia (%)', data: hs.map((h) => h.prob), backgroundColor: t.dark ? 'rgba(14,165,233,.35)' : 'rgba(14,165,233,.25)', yAxisID: 'y1', order: 1, borderRadius: 3 }
            ]
          },
          options: AP.charts.options(t, {
            plugins: { legend: { display: true, position: 'bottom' } },
            scales: {
              x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
              y: { beginAtZero: false, position: 'left', ticks: { callback: (v) => v + '°' } },
              y1: { position: 'right', min: 0, max: 100, grid: { display: false }, border: { display: false }, ticks: { color: t.muted, font: { size: 11 }, callback: (v) => v + '%' } }
            }
          })
        };
      };
      const chartBalance = (t) => {
        const b = A.balanceHidrico(w.value);
        const umbral = Number(st.settings.umbralLluvia) || 20;
        return {
          type: 'bar',
          data: {
            labels: b.map((d) => (d.fecha === st.hoy || (w.value && d.fecha === w.value.hoy) ? 'Hoy' : U.fmtDate(d.fecha, 'day'))),
            datasets: [
              { type: 'bar', label: 'Lluvia (mm)', data: b.map((d) => U.round(d.lluvia, 1)), backgroundColor: b.map((d) => (d.lluvia >= umbral ? t.rose : d.pasado ? (t.dark ? 'rgba(14,165,233,.45)' : 'rgba(14,165,233,.4)') : t.sky)), order: 1, maxBarThickness: 22 },
              { type: 'line', label: 'ET₀ (mm)', data: b.map((d) => U.round(d.et0, 1)), borderColor: t.gold, backgroundColor: t.gold, pointRadius: 2.5, borderWidth: 2, order: 0 },
              { type: 'line', label: 'Umbral crítico', data: b.map(() => umbral), borderColor: t.rose, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, order: 0 }
            ]
          },
          options: AP.charts.options(t, { plugins: { legend: { display: true, position: 'bottom' } }, scales: { x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 15 } } } })
        };
      };
      return { st, w, wx, fut, dias3, balance, proyecciones, nivelClase, chartHoras, chartBalance, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Inteligencia" title="Clima y riesgo" :subtitle="S.ubicacionActual.value.nombre + (w ? ' · ' + Math.round(w.elevation || 0) + ' m s. n. m.' : '')">
        <a href="#/ajustes" class="btn btn-outline"><i class="fa-solid fa-location-dot"></i>Cambiar ubicación</a>
        <button class="btn btn-primary" @click="S.loadWeather(true)" :disabled="st.weather.status === 'loading' || st.weather.status === 'refreshing'">
          <i :class="['fa-solid fa-rotate', st.weather.status === 'refreshing' || st.weather.status === 'loading' ? 'fa-spin' : '']"></i>Actualizar
        </button>
      </ap-page-header>

      <div v-if="!w" class="card">
        <ap-empty v-if="st.weather.status === 'error'" icon="fa-cloud" title="Pronóstico no disponible" :text="st.weather.error + '. Verifique su conexión a internet.'">
          <button class="btn btn-primary" @click="S.loadWeather(true)"><i class="fa-solid fa-rotate"></i>Reintentar</button>
        </ap-empty>
        <div v-else class="p-6 space-y-4"><div class="skeleton h-32"></div><div class="skeleton h-24"></div><div class="skeleton h-48"></div></div>
      </div>

      <div v-else class="space-y-4">
        <div v-if="st.weather.stale" class="flex items-center gap-3 rounded-xl p-3 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 text-sm">
          <i class="fa-solid fa-triangle-exclamation"></i>Sin conexión. Se muestra el último pronóstico guardado ({{ U.fmtAgo(st.weather.fetchedAt) }}).
        </div>

        <div class="grid lg:grid-cols-3 gap-4">
          <div class="relative overflow-hidden rounded-2xl p-6 text-white bg-gradient-to-br from-sky-600 via-brand-800 to-ink-950 shadow-lift">
            <div class="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-sky-300/25 blur-3xl"></div>
            <div class="relative">
              <p class="text-xs text-white/70">Ahora · {{ U.fmtTime(w.current.time) }}</p>
              <div class="flex items-center gap-4 mt-3">
                <i :class="['fa-solid text-6xl drop-shadow', wx.icon, wx.color]"></i>
                <div><p class="text-6xl font-extrabold tracking-tighter num">{{ Math.round(w.current.temp) }}°</p><p class="text-sm text-white/80">{{ wx.label }}</p></div>
              </div>
              <div class="grid grid-cols-2 gap-3 mt-6 text-sm">
                <div><p class="text-white/60 text-xs">Sensación</p><p class="font-bold">{{ Math.round(w.current.sensacion) }} °C</p></div>
                <div><p class="text-white/60 text-xs">Humedad</p><p class="font-bold">{{ w.current.rh }}%</p></div>
                <div><p class="text-white/60 text-xs">Viento / ráfagas</p><p class="font-bold">{{ Math.round(w.current.viento) }} / {{ Math.round(w.current.rafagas || 0) }} km/h</p></div>
                <div><p class="text-white/60 text-xs">UV máx.</p><p class="font-bold">{{ w.hoyDia.uv != null ? U.fmtNum(w.hoyDia.uv, 1) : '—' }}</p></div>
                <div><p class="text-white/60 text-xs">Amanecer</p><p class="font-bold">{{ U.fmtTime(w.hoyDia.sunrise) }}</p></div>
                <div><p class="text-white/60 text-xs">Atardecer</p><p class="font-bold">{{ U.fmtTime(w.hoyDia.sunset) }}</p></div>
              </div>
            </div>
          </div>
          <div class="card lg:col-span-2">
            <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-triangle-exclamation text-amber-500"></i>Alertas agroclimáticas</h3></div>
            <div class="px-4 sm:px-5 pb-2 divide">
              <div v-for="(a, i) in S.alertasClima.value" :key="i" class="flex gap-3 py-3">
                <div :class="['icon-tile', C.NIVELES[a.nivel].tone.soft]"><i :class="['fa-solid', a.icono]"></i></div>
                <div><p class="font-semibold text-sm">{{ a.titulo }}</p><p class="text-[13px] muted mt-0.5 leading-relaxed">{{ a.texto }}</p></div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div v-for="d in fut" :key="d.fecha" :class="['card p-4 text-center', d.lluvia >= st.settings.umbralLluvia ? 'ring-2 ring-red-500/40' : '']">
            <p class="text-xs font-bold uppercase tracking-wider muted capitalize">{{ d.hoy ? 'Hoy' : U.fmtDate(d.fecha, 'day') }}</p>
            <ap-wx :code="d.code" cls="text-3xl my-3"></ap-wx>
            <p class="text-[11px] muted truncate">{{ C.wmo(d.code).label }}</p>
            <p class="mt-1 font-extrabold num">{{ Math.round(d.tmax) }}° <span class="muted font-semibold">{{ Math.round(d.tmin) }}°</span></p>
            <div class="mt-3 pt-3 border-t border-ink-100 dark:border-white/5 grid grid-cols-2 gap-1 text-[11px] text-left">
              <span class="muted"><i class="fa-solid fa-droplet text-sky-500"></i></span><span class="font-semibold num text-right">{{ U.fmtNum(d.lluvia, 1) }} mm</span>
              <span class="muted"><i class="fa-solid fa-umbrella text-sky-400"></i></span><span class="font-semibold num text-right">{{ d.prob != null ? d.prob + '%' : '—' }}</span>
              <span class="muted"><i class="fa-solid fa-wind text-ink-400"></i></span><span class="font-semibold num text-right">{{ Math.round(d.vientoMax) }} km/h</span>
              <span class="muted">ET₀</span><span class="font-semibold num text-right">{{ U.fmtNum(d.et0, 1) }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head flex-wrap">
            <div>
              <h3 class="card-title"><i class="fa-solid fa-spray-can-sparkles text-rose-500"></i>Ventanas de aplicación · 72 h</h3>
              <p class="text-xs muted mt-0.5">Viento 3–10 km/h, sin lluvia en 3 h, prob. &lt; 25 %, temperatura &lt; 29 °C y humedad &gt; 50 %.</p>
            </div>
            <div class="flex gap-3 text-[11px] muted">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-brand-500"></span>Óptima</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>Aceptable</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-ink-100 dark:bg-white/10"></span>No apta</span>
            </div>
          </div>
          <div class="px-4 sm:px-5 pb-5 space-y-4">
            <div v-for="d in dias3" :key="d.dia">
              <p class="text-xs font-bold capitalize mb-1.5">{{ U.fmtDate(d.dia, 'day') }}</p>
              <div class="flex gap-[3px]">
                <div v-for="(h, hi) in d.slots" :key="hi" :class="['flex-1 h-9 rounded-[5px] relative group', h ? nivelClase(h.nivel) : 'border border-dashed border-ink-200 dark:border-white/5']">
                  <div v-if="h" class="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 whitespace-nowrap rounded-lg bg-ink-950 text-white text-[11px] px-2.5 py-1.5 shadow-lift">
                    <b>{{ U.fmtTime(h.t) }}</b> · {{ h.motivo }}<br>{{ Math.round(h.temp) }}° · {{ Math.round(h.viento) }} km/h · {{ h.prob }}% lluvia
                  </div>
                </div>
              </div>
              <div class="flex justify-between text-[10px] muted mt-1 num"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
            </div>
            <div class="flex flex-wrap gap-2 pt-2">
              <span v-for="(v, i) in S.ventanas.value.ventanas.slice(0, 6)" :key="i" :class="['chip text-xs py-1', v.calidad === 'óptima' ? 'bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300']">
                <i class="fa-regular fa-clock"></i><span class="capitalize">{{ U.fmtDate(v.dia, 'day') }}</span> {{ U.fmtTime(v.inicio) }}–{{ String(v.finHora).padStart(2, '0') }}:00 · {{ v.calidad }}
              </span>
              <span v-if="!S.ventanas.value.ventanas.length" class="text-sm text-red-600 font-medium">No hay ventanas aptas en las próximas 72 horas.</span>
            </div>
          </div>
        </div>

        <div class="grid lg:grid-cols-2 gap-4">
          <div class="card">
            <div class="card-head"><h3 class="card-title">Próximas 48 horas</h3></div>
            <div class="px-4 sm:px-5 pb-5"><ap-chart :config="chartHoras" height="260px"></ap-chart></div>
          </div>
          <div class="card">
            <div class="card-head">
              <h3 class="card-title">Balance hídrico · 15 días</h3>
              <span class="text-xs muted">7 días pasados + pronóstico</span>
            </div>
            <div class="px-4 sm:px-5 pb-3"><ap-chart :config="chartBalance" height="230px"></ap-chart></div>
            <div v-if="balance" class="grid grid-cols-3 gap-2 px-4 sm:px-5 pb-5 text-center">
              <div class="rounded-xl bg-ink-50 dark:bg-white/[0.03] py-2"><p class="text-[10px] muted font-bold uppercase">Lluvia 7 d</p><p class="font-bold num">{{ U.fmtNum(balance.lluviaPas) }} mm</p></div>
              <div class="rounded-xl bg-ink-50 dark:bg-white/[0.03] py-2"><p class="text-[10px] muted font-bold uppercase">ET₀ 7 d</p><p class="font-bold num">{{ U.fmtNum(balance.et0Pas) }} mm</p></div>
              <div class="rounded-xl bg-ink-50 dark:bg-white/[0.03] py-2"><p class="text-[10px] muted font-bold uppercase">Balance futuro</p><p :class="['font-bold num', balance.lluviaFut - balance.et0Fut < 0 ? 'text-amber-600' : 'text-sky-600']">{{ U.fmtNum(balance.lluviaFut - balance.et0Fut) }} mm</p></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-brain text-brand-600"></i>Proyección por parcela</h3></div>
          <div class="divide">
            <div v-for="x in proyecciones" :key="x.p.id" class="px-4 sm:px-5 py-4">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ background: x.p.color }"></span>
                <a :href="'#/parcelas/' + x.p.id" class="font-bold hover:underline">{{ x.p.nombre }}</a>
                <ap-fase :fase="x.e.fase" short></ap-fase>
                <span class="text-xs muted ml-auto">Cosecha {{ U.fmtRel(x.e.cosechaEst, st.hoy) }}</span>
              </div>
              <div v-if="x.recs.length" class="mt-1 pl-5 divide">
                <ap-rec v-for="(r, i) in x.recs" :key="i" :r="r"></ap-rec>
              </div>
              <p v-else class="text-sm muted mt-1 pl-5">Monitoreo normal. Condiciones estables.</p>
            </div>
            <ap-empty v-if="!proyecciones.length" compact icon="fa-layer-group" title="Sin parcelas activas"></ap-empty>
          </div>
        </div>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
