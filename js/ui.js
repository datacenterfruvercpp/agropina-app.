/* AgroPiña Pro · Componentes base de interfaz y tema de gráficos */
(function (AP) {
  'use strict';
  const { ref, computed, watch, watchEffect, onMounted, onBeforeUnmount, nextTick } = Vue;
  const S = AP.store, C = AP.catalog, U = AP.utils;

  /* ------------------------------ Gráficos ------------------------------ */
  AP.charts = {
    theme() {
      const dark = S.state.isDark;
      return {
        dark,
        text: dark ? '#b4bcb7' : '#4f5955',
        muted: dark ? '#66716b' : '#87928c',
        grid: dark ? 'rgba(255,255,255,.06)' : 'rgba(16,24,20,.06)',
        surface: dark ? '#141917' : '#ffffff',
        brand: '#12b76a', brandSoft: dark ? 'rgba(18,183,106,.25)' : 'rgba(18,183,106,.15)',
        gold: '#f59e0b', sky: '#0ea5e9', rose: '#f43f5e', violet: '#8b5cf6', slate: '#94a3b8',
        palette: ['#12b76a', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6', '#f97316', '#84cc16', '#6366f1', '#ec4899']
      };
    },
    options(t, extra) {
      const base = {
        responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false, labels: { color: t.text, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 14, font: { size: 11, weight: '600' } } },
          tooltip: {
            backgroundColor: t.dark ? '#262d2a' : '#0b0f0d', titleColor: '#fff', bodyColor: '#d9ddda', padding: 10, cornerRadius: 10,
            titleFont: { weight: '700' }, bodyFont: { size: 12 }, boxPadding: 4, usePointStyle: true
          }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: t.muted, font: { size: 11 } } },
          y: { grid: { color: t.grid }, border: { display: false }, ticks: { color: t.muted, font: { size: 11 }, padding: 6 }, beginAtZero: true }
        }
      };
      return merge(base, extra || {});
    }
  };
  function merge(a, b) {
    Object.keys(b).forEach((k) => {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]);
      else a[k] = b[k];
    });
    return a;
  }
  if (window.Chart) {
    Chart.defaults.font.family = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
    Chart.defaults.elements.bar.borderRadius = 6;
    Chart.defaults.elements.line.tension = 0.35;
  }

  const ApChart = {
    props: { config: { type: Function, required: true }, height: { type: String, default: '260px' } },
    setup(props) {
      const canvas = ref(null);
      let chart = null, stop = null;
      onMounted(() => {
        stop = watchEffect(() => {
          const cfg = props.config(AP.charts.theme());
          if (!canvas.value || !window.Chart) return;
          if (chart) chart.destroy();
          chart = new Chart(canvas.value, cfg);
        }, { flush: 'post' });
      });
      onBeforeUnmount(() => { if (stop) stop(); if (chart) chart.destroy(); chart = null; });
      return { canvas };
    },
    template: `<div class="relative w-full" :style="{ height }"><canvas ref="canvas"></canvas></div>`
  };

  /* ------------------------------ Modal / hoja ------------------------------ */
  let openModals = 0;
  const ApModal = {
    props: { title: String, subtitle: String, icon: String, size: { type: String, default: 'md' } },
    emits: ['close'],
    setup(props, { emit }) {
      const onKey = (e) => { if (e.key === 'Escape') emit('close'); };
      const shown = ref(false);
      onMounted(() => { openModals++; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', onKey); nextTick(() => { shown.value = true; }); });
      onBeforeUnmount(() => { openModals--; if (!openModals) document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); });
      const width = computed(() => ({ sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' })[props.size] || 'sm:max-w-xl');
      return { width, shown };
    },
    template: `
      <teleport to="body">
        <div class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
          <div class="absolute inset-0 bg-ink-950/55 backdrop-blur-[3px] transition-opacity duration-300" :class="shown ? 'opacity-100' : 'opacity-0'" @click="$emit('close')"></div>
          <div :class="['relative w-full bg-white dark:bg-ink-900 rounded-t-[28px] sm:rounded-3xl shadow-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col border border-white/10 transition-all duration-300 ease-out', width, shown ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-8 opacity-0 sm:scale-95']">
            <div class="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-ink-200 dark:bg-white/10"></div>
            <div class="flex items-start gap-3 px-5 sm:px-6 pt-4 sm:pt-6 pb-4">
              <div v-if="icon" class="icon-tile bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><i :class="['fa-solid', icon]"></i></div>
              <div class="flex-1 min-w-0 pt-0.5">
                <h3 class="text-lg font-bold text-ink-950 dark:text-white leading-tight">{{ title }}</h3>
                <p v-if="subtitle" class="text-[13px] muted mt-0.5">{{ subtitle }}</p>
              </div>
              <button class="btn-icon -mr-2 -mt-1" @click="$emit('close')" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="px-5 sm:px-6 pb-5 overflow-y-auto overscroll-contain flex-1"><slot></slot></div>
            <div v-if="$slots.footer" class="px-5 sm:px-6 py-4 border-t border-ink-100 dark:border-white/5 flex flex-wrap gap-2 justify-end items-center pb-safe"><slot name="footer"></slot></div>
          </div>
        </div>
      </teleport>`
  };

  /* ------------------------------ Confirmación ------------------------------ */
  const ApConfirm = {
    setup() { return { ui: S.state.ui }; },
    template: `
      <ap-modal v-if="ui.confirm" :title="ui.confirm.title" size="sm" :icon="ui.confirm.danger ? 'fa-triangle-exclamation' : 'fa-circle-question'" @close="ui.confirm.resolve(false)">
        <p class="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{{ ui.confirm.message }}</p>
        <template #footer>
          <button class="btn btn-ghost" @click="ui.confirm.resolve(false)">Cancelar</button>
          <button :class="['btn', ui.confirm.danger ? 'btn-danger' : 'btn-primary']" @click="ui.confirm.resolve(true)">{{ ui.confirm.confirmText }}</button>
        </template>
      </ap-modal>`
  };

  /* ------------------------------ Toasts ------------------------------ */
  const ApToasts = {
    setup() {
      const icon = { success: 'fa-circle-check text-brand-400', error: 'fa-circle-xmark text-red-400', warning: 'fa-triangle-exclamation text-amber-400', info: 'fa-circle-info text-sky-400' };
      const run = (t) => { t.action.fn(); S.dismiss(t.id); };
      return { ui: S.state.ui, icon, run, dismiss: S.dismiss };
    },
    template: `
      <div class="fixed z-[90] inset-x-0 bottom-24 lg:bottom-6 flex flex-col items-center gap-2 px-4 pointer-events-none">
        <transition-group name="toast">
          <div v-for="t in ui.toasts" :key="t.id" class="pointer-events-auto flex items-center gap-3 max-w-md w-full sm:w-auto pl-4 pr-2 py-2.5 rounded-2xl bg-ink-950/95 dark:bg-ink-800/95 backdrop-blur text-white shadow-lift ring-1 ring-white/10">
            <i :class="['fa-solid', icon[t.type] || icon.info]"></i>
            <span class="text-[13px] font-medium flex-1">{{ t.message }}</span>
            <button v-if="t.action" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white" @click="run(t)">{{ t.action.label }}</button>
            <button class="btn-icon btn-icon-sm text-white/50 hover:text-white hover:bg-white/10" @click="dismiss(t.id)" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </transition-group>
      </div>`
  };

  /* ------------------------------ Piezas pequeñas ------------------------------ */
  const ApStat = {
    props: { label: String, value: [String, Number], unit: String, sub: String, icon: String, tone: { type: String, default: 'emerald' }, to: String },
    computed: { t() { return C.tone(this.tone); } },
    template: `
      <component :is="to ? 'a' : 'div'" :href="to ? '#/' + to : undefined" :class="['card p-4 sm:p-5 flex flex-col min-w-0', to ? 'card-hover' : '']">
        <div class="flex items-center justify-between gap-2">
          <span class="eyebrow truncate">{{ label }}</span>
          <span v-if="icon" :class="['w-8 h-8 rounded-lg grid place-items-center text-[13px] shrink-0', t.soft]"><i :class="['fa-solid', icon]"></i></span>
        </div>
        <div class="mt-2.5 flex items-baseline gap-1 min-w-0">
          <span class="text-[22px] sm:text-[26px] font-extrabold num text-ink-950 dark:text-white truncate">{{ value }}</span>
          <span v-if="unit" class="text-xs font-semibold muted">{{ unit }}</span>
        </div>
        <div v-if="sub || $slots.default" class="mt-1 text-xs muted truncate"><slot>{{ sub }}</slot></div>
      </component>`
  };

  const ApEmpty = {
    props: { icon: { type: String, default: 'fa-seedling' }, title: String, text: String, compact: Boolean },
    template: `
      <div :class="['flex flex-col items-center text-center', compact ? 'py-8 px-4' : 'py-14 px-6']">
        <div class="relative mb-4">
          <div class="absolute inset-0 rounded-2xl bg-brand-500/20 blur-xl"></div>
          <div class="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-500/15 dark:to-brand-500/5 text-brand-600 dark:text-brand-400 grid place-items-center text-xl ring-1 ring-brand-500/10"><i :class="['fa-solid', icon]"></i></div>
        </div>
        <h4 class="font-bold text-ink-900 dark:text-white">{{ title }}</h4>
        <p v-if="text" class="text-sm muted mt-1 max-w-sm">{{ text }}</p>
        <div v-if="$slots.default" class="mt-5 flex flex-wrap gap-2 justify-center"><slot></slot></div>
      </div>`
  };

  const ApFase = {
    props: { fase: String, short: Boolean },
    computed: { f() { return C.FASES[this.fase] || C.FASES.planificada; } },
    template: `<span :class="['chip', f.tone.chip]"><i :class="['fa-solid text-[9px]', f.icon]"></i>{{ short ? f.short : f.label }}</span>`
  };

  const ApPageHeader = {
    props: { title: String, subtitle: String, eyebrow: String },
    template: `
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-fade-up">
        <div class="min-w-0">
          <p v-if="eyebrow" class="eyebrow mb-1.5">{{ eyebrow }}</p>
          <h1 class="h-title">{{ title }}</h1>
          <p v-if="subtitle" class="muted text-sm mt-1.5 max-w-2xl">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.default" class="flex gap-2 flex-wrap shrink-0"><slot></slot></div>
      </div>`
  };

  const ApSeg = {
    props: { modelValue: [String, Number], options: Array },
    emits: ['update:modelValue'],
    template: `
      <div class="seg">
        <button v-for="o in options" :key="o.value" type="button" :class="['seg-btn', modelValue === o.value ? 'seg-on' : '']" @click="$emit('update:modelValue', o.value)">
          <i v-if="o.icon" :class="['fa-solid mr-1.5', o.icon]"></i>{{ o.label }}<span v-if="o.count != null" class="ml-1.5 opacity-60">{{ o.count }}</span>
        </button>
      </div>`
  };

  const ApRec = {
    props: { r: Object, showParcela: Boolean },
    computed: { n() { return C.NIVELES[this.r.nivel]; } },
    template: `
      <div class="flex gap-3 py-3">
        <div :class="['icon-tile w-9 h-9 text-sm', n.tone.soft]"><i :class="['fa-solid', r.icono]"></i></div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-[13.5px] text-ink-900 dark:text-white">{{ r.titulo }}</span>
            <a v-if="showParcela && r.parcelaId" :href="'#/parcelas/' + r.parcelaId" class="chip bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300 hover:bg-ink-200">{{ r.parcela }}</a>
          </div>
          <p class="text-[13px] text-ink-500 dark:text-ink-400 mt-0.5 leading-relaxed">{{ r.texto }}</p>
        </div>
        <span :class="['w-1.5 self-stretch rounded-full shrink-0', n.tone.dot]"></span>
      </div>`
  };

  const ApWx = {
    props: { code: Number, day: { type: [Number, Boolean], default: 1 }, cls: { type: String, default: '' } },
    computed: { w() { return C.wmo(this.code, this.day); } },
    template: `<i :class="['fa-solid', w.icon, w.color, cls]" :title="w.label"></i>`
  };

  /* Mini-mapa de una parcela (Leaflet) */
  const ApMiniMap = {
    props: { parcela: Object, height: { type: String, default: '200px' } },
    setup(props) {
      const el = ref(null);
      let map = null;
      const draw = () => {
        if (!el.value || !window.L) return;
        if (map) { map.remove(); map = null; }
        const p = props.parcela;
        map = L.map(el.value, { zoomControl: false, attributionControl: false, dragging: !L.Browser.mobile, scrollWheelZoom: false });
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
        if (p.poligono && p.poligono.length >= 3) {
          const poly = L.polygon(p.poligono, { color: p.color, weight: 2.5, fillOpacity: 0.25 }).addTo(map);
          map.fitBounds(poly.getBounds(), { padding: [16, 16] });
        } else if (p.lat != null) {
          L.circleMarker([p.lat, p.lon], { radius: 9, color: '#fff', weight: 3, fillColor: p.color, fillOpacity: 1 }).addTo(map);
          map.setView([p.lat, p.lon], 16);
        }
      };
      onMounted(() => nextTick(draw));
      watch(() => [props.parcela.poligono, props.parcela.color], () => nextTick(draw), { deep: true });
      onBeforeUnmount(() => { if (map) map.remove(); });
      return { el };
    },
    template: `<div ref="el" class="w-full rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-850 z-0" :style="{ height }"></div>`
  };

  AP.ui = { ApChart, ApModal, ApConfirm, ApToasts, ApStat, ApEmpty, ApFase, ApPageHeader, ApSeg, ApRec, ApWx, ApMiniMap };
})(window.AP = window.AP || {});
