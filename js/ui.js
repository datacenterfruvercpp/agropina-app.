/* AgroPiña Enterprise · Biblioteca de componentes "Enterprise" y tema de gráficos */
(function (AP) {
  'use strict';
  const { ref, reactive, computed, watch, watchEffect, onMounted, onBeforeUnmount, nextTick } = Vue;
  const S = AP.store, C = AP.catalog, U = AP.utils;

  /* ------------------------------ Gráficos ------------------------------ */
  AP.charts = {
    theme() {
      const dark = S.state.isDark;
      return {
        dark,
        text: dark ? '#b3bdc9' : '#4d5866',
        muted: dark ? '#7d8896' : '#8f9aa8',
        grid: dark ? 'rgba(255,255,255,.07)' : 'rgba(15,23,42,.07)',
        surface: dark ? '#141b24' : '#ffffff',
        brand: '#039855', brandSoft: dark ? 'rgba(18,183,106,.25)' : 'rgba(3,152,85,.12)',
        gold: '#d97706', sky: '#0284c7', rose: '#e11d48', violet: '#7c3aed', slate: '#94a3b8', blue: '#2563eb',
        palette: ['#039855', '#2563eb', '#d97706', '#7c3aed', '#e11d48', '#0891b2', '#65a30d', '#db2777', '#475569', '#ea580c']
      };
    },
    options(t, extra) {
      const base = {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false, labels: { color: t.text, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 9, boxHeight: 9, padding: 14, font: { size: 11.5 } } },
          tooltip: {
            backgroundColor: '#0f1b2b', titleColor: '#fff', bodyColor: '#dfe4ea', borderColor: 'rgba(255,255,255,.08)', borderWidth: 1,
            padding: 10, cornerRadius: 8, titleFont: { weight: '600' }, bodyFont: { size: 12 }, boxPadding: 4, usePointStyle: true
          }
        },
        scales: {
          x: { grid: { display: false }, border: { color: t.grid }, ticks: { color: t.muted, font: { size: 11 } } },
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
    Chart.defaults.font.family = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
    Chart.defaults.elements.bar.borderRadius = 3;
    Chart.defaults.elements.line.tension = 0.3;
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

  /* ------------------------------ Exportación de tablas ------------------------------ */
  const cellText = (c, r) => {
    const v = c.value ? c.value(r) : r[c.key];
    return c.format ? c.format(v, r) : v;
  };
  const rawValue = (c, r) => (c.exportValue ? c.exportValue(r) : c.value ? c.value(r) : r[c.key]);
  AP.exportar = {
    filas(columns, rows) {
      return rows.map((r) => {
        const o = {};
        columns.forEach((c) => { const v = rawValue(c, r); o[c.label] = v == null ? '' : v; });
        return o;
      });
    },
    csv(nombre, columns, rows) {
      const esc = (v) => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const lines = [columns.map((c) => esc(c.label)).join(';')].concat(rows.map((r) => columns.map((c) => {
        const v = rawValue(c, r);
        return esc(typeof v === 'number' ? String(v).replace('.', ',') : v);
      }).join(';')));
      U.download(nombre + '_' + U.today() + '.csv', new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      S.toast('Archivo CSV descargado (' + rows.length + ' filas)');
    },
    async excel(nombre, columns, rows) {
      try {
        if (!window.XLSX) await U.loadScript('vendor/xlsx.full.min.js');
        const ws = XLSX.utils.json_to_sheet(AP.exportar.filas(columns, rows));
        ws['!cols'] = columns.map((c) => ({ wch: Math.max(10, Math.min(40, c.label.length + 6)) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));
        XLSX.writeFile(wb, AP.exportar.archivo(nombre) + '.xlsx');
        S.toast('Excel descargado (' + rows.length + ' filas)');
      } catch (e) { S.toast('No se pudo generar el Excel: ' + e.message, 'error'); }
    },
    archivo: (nombre) => String(nombre).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_' + U.today()
  };

  /* ------------------------------ Menú desplegable ------------------------------ */
  const ApMenu = {
    props: { align: { type: String, default: 'right' }, width: { type: String, default: '' }, panelClass: { type: String, default: '' } },
    setup() {
      const open = ref(false);
      const root = ref(null);
      const close = () => { open.value = false; };
      const toggle = () => { open.value = !open.value; };
      const onDoc = (e) => { if (open.value && root.value && !root.value.contains(e.target)) close(); };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      const onInside = (e) => { if (e.target.closest('.menu-item') && !e.target.closest('[data-keep]')) close(); };
      onMounted(() => { document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey); });
      onBeforeUnmount(() => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); });
      return { open, root, close, toggle, onInside };
    },
    template: `
      <div class="relative inline-flex" ref="root">
        <slot name="trigger" :toggle="toggle" :open="open"></slot>
        <transition name="pop">
          <div v-if="open" :class="['menu top-full', align === 'right' ? 'right-0' : 'left-0', panelClass]" :style="width ? { width } : null" @click="onInside" role="menu">
            <slot :close="close"></slot>
          </div>
        </transition>
      </div>`
  };

  /* ------------------------------ Modal / panel lateral ------------------------------ */
  let openModals = 0;
  const ApModal = {
    props: { title: String, subtitle: String, icon: String, size: { type: String, default: 'md' } },
    emits: ['close'],
    setup(props, { emit }) {
      const onKey = (e) => { if (e.key === 'Escape') emit('close'); };
      const shown = ref(false);
      const panel = computed(() => props.size !== 'sm');
      onMounted(() => { openModals++; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', onKey); nextTick(() => { shown.value = true; }); });
      onBeforeUnmount(() => { openModals--; if (!openModals) document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); });
      const width = computed(() => ({ sm: 'sm:max-w-md', md: 'lg:max-w-[560px]', lg: 'lg:max-w-[720px]', xl: 'lg:max-w-[960px]' })[props.size] || 'lg:max-w-[560px]');
      return { width, shown, panel };
    },
    template: `
      <teleport to="body">
        <div :class="['fixed inset-0 z-[70] flex justify-center', panel ? 'items-end sm:items-center lg:items-stretch lg:justify-end' : 'items-end sm:items-center sm:p-6']" role="dialog" aria-modal="true">
          <div class="absolute inset-0 bg-ink-950/45 transition-opacity duration-200" :class="shown ? 'opacity-100' : 'opacity-0'" @click="$emit('close')"></div>
          <div :class="['relative w-full bg-white dark:bg-ink-900 shadow-2xl flex flex-col border border-ink-200 dark:border-white/10 transition-all duration-200 ease-out',
              panel ? 'rounded-t-2xl sm:rounded-2xl sm:max-w-xl max-h-[94vh] sm:max-h-[90vh] sm:m-6 lg:m-0 lg:rounded-none lg:max-h-none lg:h-full lg:border-y-0 lg:border-r-0 lg:shadow-panel ' + width : 'rounded-t-2xl sm:rounded-xl max-h-[92vh] ' + width,
              shown ? 'translate-y-0 lg:translate-x-0 opacity-100' : (panel ? 'translate-y-6 lg:translate-y-0 lg:translate-x-10 opacity-0' : 'translate-y-6 opacity-0')]">
            <div class="flex items-center gap-3 px-5 h-14 border-b border-ink-200 dark:border-white/[0.07] shrink-0">
              <div v-if="icon" class="w-8 h-8 rounded-lg grid place-items-center bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 text-[13px]"><i :class="['fa-solid', icon]"></i></div>
              <div class="flex-1 min-w-0">
                <h3 class="text-[15px] font-semibold text-ink-950 dark:text-white leading-tight truncate">{{ title }}</h3>
                <p v-if="subtitle" class="text-[12px] muted truncate">{{ subtitle }}</p>
              </div>
              <button class="btn-icon -mr-2" @click="$emit('close')" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="px-5 py-5 overflow-y-auto overscroll-contain flex-1"><slot></slot></div>
            <div v-if="$slots.footer" class="px-5 py-3 border-t border-ink-200 dark:border-white/[0.07] bg-ink-50 dark:bg-ink-850 flex flex-wrap gap-2 justify-end items-center pb-safe shrink-0"><slot name="footer"></slot></div>
          </div>
        </div>
      </teleport>`
  };

  /* ------------------------------ Confirmación ------------------------------ */
  const ApConfirm = {
    setup() { return { ui: S.state.ui }; },
    template: `
      <ap-modal v-if="ui.confirm" :title="ui.confirm.title" size="sm" :icon="ui.confirm.danger ? 'fa-triangle-exclamation' : 'fa-circle-question'" @close="ui.confirm.resolve(false)">
        <p class="text-[13.5px] text-ink-700 dark:text-ink-300 leading-relaxed">{{ ui.confirm.message }}</p>
        <template #footer>
          <button class="btn btn-outline" @click="ui.confirm.resolve(false)">Cancelar</button>
          <button :class="['btn', ui.confirm.danger ? 'btn-danger' : 'btn-primary']" @click="ui.confirm.resolve(true)">{{ ui.confirm.confirmText }}</button>
        </template>
      </ap-modal>`
  };

  /* ------------------------------ Mensajes emergentes ------------------------------ */
  const ApToasts = {
    setup() {
      const icon = { success: 'fa-circle-check text-emerald-400', error: 'fa-circle-xmark text-red-400', warning: 'fa-triangle-exclamation text-amber-400', info: 'fa-circle-info text-sky-400' };
      const run = (t) => { t.action.fn(); S.dismiss(t.id); };
      return { ui: S.state.ui, icon, run, dismiss: S.dismiss };
    },
    template: `
      <div class="fixed z-[90] inset-x-0 bottom-24 lg:bottom-5 lg:left-auto lg:right-5 flex flex-col items-center lg:items-end gap-2 px-4 lg:px-0 pointer-events-none">
        <transition-group name="toast">
          <div v-for="t in ui.toasts" :key="t.id" class="pointer-events-auto flex items-center gap-3 max-w-md w-full sm:w-auto pl-4 pr-2 py-2 rounded-lg bg-shell text-white shadow-lift ring-1 ring-white/10">
            <i :class="['fa-solid', icon[t.type] || icon.info]"></i>
            <span class="text-[13px] flex-1">{{ t.message }}</span>
            <button v-if="t.action" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white" @click="run(t)">{{ t.action.label }}</button>
            <button class="btn-icon btn-icon-sm text-white/50 hover:text-white hover:bg-white/10" @click="dismiss(t.id)" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </transition-group>
      </div>`
  };

  /* ------------------------------ Indicadores ------------------------------ */
  const ApStat = {
    props: { label: String, value: [String, Number], unit: String, sub: String, icon: String, tone: { type: String, default: 'emerald' }, to: String },
    computed: { t() { return C.tone(this.tone); } },
    template: `
      <component :is="to ? 'a' : 'div'" :href="to ? '#/' + to : undefined" :class="['card px-4 py-3.5 flex flex-col min-w-0', to ? 'card-hover' : '']">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[12px] font-medium text-ink-600 dark:text-ink-300 truncate">{{ label }}</span>
          <span v-if="icon" :class="['w-7 h-7 rounded-md grid place-items-center text-[12px] shrink-0', t.soft]"><i :class="['fa-solid', icon]"></i></span>
        </div>
        <div class="mt-1.5 flex items-baseline gap-1 min-w-0">
          <span class="text-[22px] sm:text-[24px] font-semibold num text-ink-950 dark:text-white truncate tracking-tight">{{ value }}</span>
          <span v-if="unit" class="text-xs font-medium muted">{{ unit }}</span>
        </div>
        <div v-if="sub || $slots.default" class="mt-0.5 text-[12px] muted truncate"><slot>{{ sub }}</slot></div>
      </component>`
  };

  const ApSpark = {
    props: { data: { type: Array, default: () => [] }, type: { type: String, default: 'line' }, height: { type: Number, default: 34 } },
    setup(props) {
      const geo = computed(() => {
        const d = props.data.map((x) => Number(x) || 0);
        if (!d.length) return null;
        const max = Math.max(...d, 0), min = Math.min(...d, 0), span = max - min || 1;
        const w = 100, h = props.height, pad = 3;
        const x = (i) => (d.length === 1 ? w / 2 : (i / (d.length - 1)) * w);
        const y = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
        if (props.type === 'bar') {
          const bw = w / d.length;
          return { bars: d.map((v, i) => ({ x: i * bw + bw * 0.18, w: bw * 0.64, y: y(Math.max(v, 0)), h: Math.max(1, Math.abs(y(v) - y(0))) })) };
        }
        const pts = d.map((v, i) => [x(i), y(v)]);
        const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
        return { line, area: line + ' L' + w + ' ' + h + ' L0 ' + h + ' Z', last: pts[pts.length - 1] };
      });
      return { geo };
    },
    template: `
      <svg v-if="geo" :viewBox="'0 0 100 ' + height" preserveAspectRatio="none" class="w-full overflow-visible" :style="{ height: height + 'px' }" aria-hidden="true">
        <template v-if="geo.bars"><rect v-for="(b, i) in geo.bars" :key="i" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="1" fill="currentColor" :opacity="i === geo.bars.length - 1 ? 1 : .45"></rect></template>
        <template v-else>
          <path :d="geo.area" fill="currentColor" opacity=".12"></path>
          <path :d="geo.line" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"></path>
          <circle :cx="geo.last[0]" :cy="geo.last[1]" r="2.4" fill="currentColor"></circle>
        </template>
      </svg>`
  };

  const ApTile = {
    props: {
      title: String, subtitle: String, value: [String, Number], unit: String, icon: String, to: String, footer: String,
      trend: { type: Number, default: null }, trendGood: { type: String, default: 'up' }, spark: Array, sparkType: { type: String, default: 'line' },
      tone: { type: String, default: 'brand' }, status: { type: String, default: '' }
    },
    setup(props) {
      const trendCls = computed(() => {
        if (props.trend == null || !isFinite(props.trend) || Math.abs(props.trend) < 0.5) return 'text-ink-500';
        const good = props.trendGood === 'up' ? props.trend > 0 : props.trend < 0;
        return good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
      });
      const sparkCls = computed(() => ({ brand: 'text-brand-600', blue: 'text-blue-600', amber: 'text-amber-500', red: 'text-red-500', violet: 'text-violet-500', sky: 'text-sky-500' })[props.tone] || 'text-brand-600');
      const statusCls = computed(() => ({ ok: 'bg-emerald-500', warn: 'bg-amber-500', err: 'bg-red-500' })[props.status] || '');
      return { trendCls, sparkCls, statusCls };
    },
    template: `
      <component :is="to ? 'a' : 'div'" :href="to ? '#/' + to : undefined" :class="['tile', to ? 'card-hover' : '']">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <p class="tile-title">{{ title }}</p>
            <p v-if="subtitle" class="tile-sub mt-0.5">{{ subtitle }}</p>
          </div>
          <span v-if="statusCls" :class="['w-2 h-2 rounded-full mt-1.5 shrink-0', statusCls]"></span>
          <i v-else-if="icon" :class="['fa-solid text-[13px] text-ink-400 mt-0.5', icon]"></i>
        </div>
        <div class="mt-auto pt-3 min-w-0">
          <div class="flex items-baseline gap-1 min-w-0"><span class="tile-value truncate">{{ value }}</span><span v-if="unit" class="text-[12px] font-medium muted shrink-0">{{ unit }}</span></div>
          <p v-if="trend != null && isFinite(trend)" :class="['text-[11.5px] font-semibold mt-1 num truncate', trendCls]"><i :class="['fa-solid text-[9px] mr-0.5', trend > 0 ? 'fa-arrow-up' : trend < 0 ? 'fa-arrow-down' : 'fa-minus']"></i>{{ Math.abs(trend).toFixed(0) }}% <span class="font-normal muted">{{ footer }}</span></p>
          <p v-else-if="footer" class="text-[11.5px] muted mt-1 truncate">{{ footer }}</p>
          <div v-if="spark && spark.length" :class="['mt-2 -mx-0.5', sparkCls]"><ap-spark :data="spark" :type="sparkType" :height="26"></ap-spark></div>
        </div>
      </component>`
  };

  const ApEmpty = {
    props: { icon: { type: String, default: 'fa-seedling' }, title: String, text: String, compact: Boolean },
    template: `
      <div :class="['flex flex-col items-center text-center', compact ? 'py-8 px-4' : 'py-14 px-6']">
        <div class="w-12 h-12 rounded-full bg-ink-100 dark:bg-white/[0.06] text-ink-500 dark:text-ink-400 grid place-items-center text-lg mb-3"><i :class="['fa-solid', icon]"></i></div>
        <h4 class="font-semibold text-ink-900 dark:text-white text-[14px]">{{ title }}</h4>
        <p v-if="text" class="text-[13px] muted mt-1 max-w-sm">{{ text }}</p>
        <div v-if="$slots.default" class="mt-4 flex flex-wrap gap-2 justify-center"><slot></slot></div>
      </div>`
  };

  const ApFase = {
    props: { fase: String, short: Boolean },
    computed: { f() { return C.FASES[this.fase] || C.FASES.planificada; } },
    template: `<span :class="['chip', f.tone.chip]"><i :class="['fa-solid text-[9px]', f.icon]"></i>{{ short ? f.short : f.label }}</span>`
  };

  const ApStatus = {
    props: { st: { type: String, default: 'st-neutral' }, label: String, icon: String, dot: Boolean },
    template: `<span :class="['st', st]"><i v-if="icon" :class="['fa-solid text-[9px]', icon]"></i><span v-else-if="dot" class="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>{{ label }}<slot></slot></span>`
  };

  /* Cabecera de página dinámica: migas · título · estado · acciones · facetas */
  const ApPageHeader = {
    props: { title: String, subtitle: String, eyebrow: String, crumbs: Array },
    computed: {
      trail() { return this.crumbs || (this.eyebrow ? [{ label: this.eyebrow }] : []); }
    },
    template: `
      <div class="page-head">
        <nav class="crumbs" aria-label="Ruta">
          <a href="#/dashboard"><i class="fa-solid fa-house text-[10px]"></i></a>
          <template v-for="(c, i) in trail" :key="i">
            <i class="fa-solid fa-chevron-right text-[8px] opacity-60"></i>
            <a v-if="c.to" :href="'#/' + c.to">{{ c.label }}</a><span v-else class="truncate">{{ c.label }}</span>
          </template>
          <i class="fa-solid fa-chevron-right text-[8px] opacity-60"></i><span class="text-ink-700 dark:text-ink-200 truncate">{{ title }}</span>
        </nav>
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div class="min-w-0 flex items-start gap-3">
            <slot name="lead"></slot>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap"><h1 class="h-title truncate">{{ title }}</h1><slot name="status"></slot></div>
              <p v-if="subtitle" class="muted text-[13px] mt-0.5 max-w-3xl">{{ subtitle }}</p>
            </div>
          </div>
          <div v-if="$slots.default" class="flex gap-2 flex-wrap shrink-0 items-center"><slot></slot></div>
        </div>
        <div v-if="$slots.facets" class="mt-4 pt-3 border-t border-ink-100 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-x-10 gap-y-3"><slot name="facets"></slot></div>
        <div v-if="$slots.tabs" class="mt-3 -mb-4 flex gap-1 overflow-x-auto no-scrollbar"><slot name="tabs"></slot></div>
      </div>`
  };
  const ApFacet = {
    props: { label: String, value: [String, Number], st: String },
    template: `<div class="min-w-0"><p class="facet-label">{{ label }}</p><p :class="['facet-value', st || '']"><slot>{{ value }}</slot></p></div>`
  };
  const ApTab = {
    props: { active: Boolean, count: [Number, String] },
    template: `<button type="button" :class="['relative h-10 px-3 text-[13px] font-semibold whitespace-nowrap transition-colors', active ? 'text-brand-800 dark:text-brand-300' : 'text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white']">
      <slot></slot><span v-if="count != null" class="ml-1.5 text-[11px] font-medium px-1.5 py-0.5 rounded bg-ink-100 dark:bg-white/[0.07] text-ink-600 dark:text-ink-300">{{ count }}</span>
      <span v-if="active" class="absolute left-2 right-2 bottom-0 h-[3px] rounded-t bg-brand-600"></span></button>`
  };

  const ApSeg = {
    props: { modelValue: [String, Number], options: Array },
    emits: ['update:modelValue'],
    template: `
      <div class="seg">
        <button v-for="o in options" :key="o.value" type="button" :class="['seg-btn', modelValue === o.value ? 'seg-on' : '']" @click="$emit('update:modelValue', o.value)" :title="o.title || null">
          <i v-if="o.icon" :class="['fa-solid', o.icon, o.label ? 'mr-1.5' : '']"></i>{{ o.label }}<span v-if="o.count != null" class="ml-1.5 opacity-60">{{ o.count }}</span>
        </button>
      </div>`
  };

  const ApRec = {
    props: { r: Object, showParcela: Boolean },
    computed: { n() { return C.NIVELES[this.r.nivel]; } },
    template: `
      <div class="flex gap-3 py-3">
        <div :class="['icon-tile w-8 h-8 text-[13px]', n.tone.soft]"><i :class="['fa-solid', r.icono]"></i></div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-[13.5px] text-ink-900 dark:text-white">{{ r.titulo }}</span>
            <a v-if="showParcela && r.parcelaId" :href="'#/parcelas/' + r.parcelaId" class="chip bg-ink-100 text-ink-700 dark:bg-white/5 dark:text-ink-300 hover:bg-ink-200">{{ r.parcela }}</a>
          </div>
          <p class="text-[13px] text-ink-600 dark:text-ink-400 mt-0.5 leading-relaxed">{{ r.texto }}</p>
        </div>
        <span :class="['w-1 self-stretch rounded-full shrink-0', n.tone.dot]"></span>
      </div>`
  };

  const ApWx = {
    props: { code: Number, day: { type: [Number, Boolean], default: 1 }, cls: { type: String, default: '' } },
    computed: { w() { return C.wmo(this.code, this.day); } },
    template: `<i :class="['fa-solid', w.icon, w.color, cls]" :title="w.label"></i>`
  };

  /* ------------------------------ Tabla de datos ------------------------------ */
  const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const ApDataTable = {
    props: {
      id: { type: String, required: true }, columns: { type: Array, required: true }, rows: { type: Array, default: () => [] },
      rowKey: { type: String, default: 'id' }, selectable: Boolean, clickable: Boolean, searchable: { type: Boolean, default: true },
      pageSize: { type: Number, default: 25 }, exportName: String, title: String, sortKey: String, sortDir: { type: String, default: 'asc' },
      empty: { type: Object, default: () => ({ icon: 'fa-table', title: 'Sin registros', text: '' }) }, maxHeight: { type: String, default: '' }
    },
    emits: ['open', 'selection'],
    setup(props, { emit }) {
      const saved = LS('agropina_dt_' + props.id) || {};
      const hidden = ref(new Set(saved.hidden || props.columns.filter((c) => c.hidden).map((c) => c.key)));
      const q = ref('');
      const sort = reactive({ key: props.sortKey || '', dir: props.sortDir });
      const page = ref(1);
      const size = ref(saved.size || props.pageSize);
      const sel = ref(new Set());
      const visibles = computed(() => props.columns.filter((c) => !hidden.value.has(c.key)));
      const sortVal = (c, r) => (c.sortValue ? c.sortValue(r) : c.value ? c.value(r) : r[c.key]);
      const filtrados = computed(() => {
        let rows = props.rows;
        if (q.value.trim()) rows = rows.filter((r) => U.match(q.value, ...props.columns.map((c) => { const v = cellText(c, r); return v == null ? '' : String(v); })));
        const c = props.columns.find((x) => x.key === sort.key);
        if (c) {
          const dir = sort.dir === 'desc' ? -1 : 1;
          rows = rows.slice().sort((a, b) => {
            const va = sortVal(c, a), vb = sortVal(c, b);
            if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
            return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es', { numeric: true })) * dir;
          });
        }
        return rows;
      });
      const paginas = computed(() => Math.max(1, Math.ceil(filtrados.value.length / size.value)));
      const visiblesFilas = computed(() => filtrados.value.slice((page.value - 1) * size.value, page.value * size.value));
      watch([q, size, () => props.rows.length], () => { page.value = 1; });
      watch(paginas, (n) => { if (page.value > n) page.value = n; });
      const toggleSort = (c) => {
        if (c.sortable === false) return;
        if (sort.key === c.key) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'; else { sort.key = c.key; sort.dir = c.align === 'right' ? 'desc' : 'asc'; }
      };
      const persist = () => LS('agropina_dt_' + props.id, { hidden: Array.from(hidden.value), size: size.value });
      const toggleCol = (c) => { const s = new Set(hidden.value); if (s.has(c.key)) s.delete(c.key); else if (visibles.value.length > 1) s.add(c.key); hidden.value = s; persist(); };
      watch(size, persist);
      const key = (r) => r[props.rowKey];
      const isSel = (r) => sel.value.has(key(r));
      const toggleSel = (r) => { const s = new Set(sel.value); if (s.has(key(r))) s.delete(key(r)); else s.add(key(r)); sel.value = s; };
      const allSel = computed(() => visiblesFilas.value.length > 0 && visiblesFilas.value.every(isSel));
      const toggleAll = () => { const s = new Set(sel.value); if (allSel.value) visiblesFilas.value.forEach((r) => s.delete(key(r))); else visiblesFilas.value.forEach((r) => s.add(key(r))); sel.value = s; };
      const seleccion = computed(() => props.rows.filter((r) => sel.value.has(key(r))));
      watch(seleccion, (v) => emit('selection', v));
      watch(() => props.rows, () => { const ids = new Set(props.rows.map(key)); const s = new Set([...sel.value].filter((k) => ids.has(k))); if (s.size !== sel.value.size) sel.value = s; });
      const clear = () => { sel.value = new Set(); };
      const align = (c) => (c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left');
      const totales = computed(() => {
        const cols = props.columns.filter((c) => c.sum);
        if (!cols.length) return null;
        const o = {};
        cols.forEach((c) => { const v = U.sum(filtrados.value, (r) => (c.value ? c.value(r) : r[c.key])); o[c.key] = c.format ? c.format(v, null) : U.fmtNum(v, Number.isInteger(v) ? 0 : 2); });
        return o;
      });
      const nombre = computed(() => props.exportName || props.title || props.id);
      const exportar = (tipo) => AP.exportar[tipo](nombre.value, visibles.value.filter((c) => c.export !== false), filtrados.value);
      return { hidden, q, sort, page, size, sel, visibles, filtrados, paginas, visiblesFilas, toggleSort, toggleCol, isSel, toggleSel, allSel, toggleAll, seleccion, clear, align, totales, exportar, cellText, U };
    },
    template: `
      <div class="flex flex-col min-w-0">
        <div class="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-ink-100 dark:border-white/[0.06]">
          <div v-if="seleccion.length" class="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span class="text-[13px] font-semibold">{{ seleccion.length }} seleccionado(s)</span>
            <button class="btn btn-ghost btn-sm" @click="clear">Quitar selección</button>
            <slot name="bulk" :rows="seleccion" :clear="clear"></slot>
          </div>
          <template v-else>
            <p v-if="title" class="text-[13.5px] font-semibold mr-1">{{ title }} <span class="muted font-normal">({{ filtrados.length }})</span></p>
            <slot name="toolbar"></slot>
            <div class="flex-1"></div>
          </template>
          <div v-if="searchable" class="relative w-full sm:w-56 order-last sm:order-none">
            <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 text-[11px]"></i>
            <input v-model="q" class="input h-8 pl-7 text-[13px]" placeholder="Buscar en la tabla" :aria-label="'Buscar en ' + (title || 'tabla')">
          </div>
          <ap-menu>
            <template #trigger="{ toggle }"><button class="btn btn-outline btn-sm h-8" @click="toggle" title="Exportar"><i class="fa-solid fa-file-export"></i><span class="hidden md:inline">Exportar</span></button></template>
            <button class="menu-item" @click="exportar('excel')"><i class="fa-solid fa-file-excel w-4 text-emerald-600"></i>Excel (.xlsx)</button>
            <button class="menu-item" @click="exportar('csv')"><i class="fa-solid fa-file-csv w-4 text-ink-500"></i>CSV (separado por «;»)</button>
          </ap-menu>
          <ap-menu width="240px">
            <template #trigger="{ toggle }"><button class="btn btn-outline btn-sm h-8" @click="toggle" title="Columnas"><i class="fa-solid fa-table-columns"></i></button></template>
            <p class="menu-label">Columnas visibles</p>
            <label v-for="c in columns" :key="c.key" class="menu-item cursor-pointer" data-keep>
              <input type="checkbox" class="w-4 h-4 accent-emerald-700" :checked="!hidden.has(c.key)" @change="toggleCol(c)"><span class="truncate">{{ c.label }}</span>
            </label>
          </ap-menu>
          <slot name="actions"></slot>
        </div>
        <div class="dt-wrap" :style="maxHeight ? { maxHeight } : null">
          <table class="dt">
            <thead>
              <tr>
                <th v-if="selectable" class="w-10 !px-3"><input type="checkbox" class="w-4 h-4 accent-emerald-700 align-middle" :checked="allSel" @change="toggleAll" aria-label="Seleccionar página"></th>
                <th v-for="c in visibles" :key="c.key" :class="[align(c), c.thCls || '']" :style="c.width ? { width: c.width } : null" :aria-sort="sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : null">
                  <span v-if="c.sortable !== false" class="dt-sort" @click="toggleSort(c)">{{ c.label }}
                    <i :class="['fa-solid text-[9px]', sort.key === c.key ? (sort.dir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down') : 'fa-sort opacity-30']"></i></span>
                  <span v-else>{{ c.label }}</span>
                </th>
                <th v-if="$slots.rowActions" class="w-px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in visiblesFilas" :key="r[rowKey]" :class="[isSel(r) ? 'dt-sel' : '', clickable ? 'cursor-pointer' : '', 'group']" @click="clickable && $emit('open', r)">
                <td v-if="selectable" class="!px-3" @click.stop><input type="checkbox" class="w-4 h-4 accent-emerald-700 align-middle" :checked="isSel(r)" @change="toggleSel(r)" aria-label="Seleccionar fila"></td>
                <td v-for="c in visibles" :key="c.key" :class="[align(c), c.cls || '', c.align === 'right' ? 'num' : '']">
                  <slot :name="'cell-' + c.key" :row="r" :value="c.value ? c.value(r) : r[c.key]">{{ cellText(c, r) }}</slot>
                </td>
                <td v-if="$slots.rowActions" class="text-right !pr-2" @click.stop><div class="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity"><slot name="rowActions" :row="r"></slot></div></td>
              </tr>
            </tbody>
            <tfoot v-if="totales && filtrados.length">
              <tr class="font-semibold bg-ink-50 dark:bg-white/[0.03]">
                <td v-if="selectable"></td>
                <td v-for="(c, i) in visibles" :key="c.key" :class="[align(c), 'px-3 h-9 border-t border-ink-200 dark:border-white/[0.08] num']">{{ totales[c.key] != null ? totales[c.key] : (i === 0 ? 'Total' : '') }}</td>
                <td v-if="$slots.rowActions"></td>
              </tr>
            </tfoot>
          </table>
          <ap-empty v-if="!filtrados.length" compact :icon="q ? 'fa-filter-circle-xmark' : empty.icon" :title="q ? 'Sin coincidencias' : empty.title" :text="q ? 'Ninguna fila coincide con «' + q + '».' : empty.text"><slot name="empty"></slot></ap-empty>
        </div>
        <div v-if="filtrados.length > 10" class="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-ink-100 dark:border-white/[0.06] text-[12px] muted">
          <div class="flex items-center gap-2">Filas por página
            <select v-model.number="size" class="input h-7 w-auto text-[12px] py-0 pr-7"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option></select>
          </div>
          <div class="flex items-center gap-1">
            <span class="num mr-2">{{ (page - 1) * size + 1 }}–{{ Math.min(page * size, filtrados.length) }} de {{ filtrados.length }}</span>
            <button class="btn-icon btn-icon-sm" :disabled="page <= 1" @click="page--" aria-label="Página anterior"><i class="fa-solid fa-chevron-left"></i></button>
            <button class="btn-icon btn-icon-sm" :disabled="page >= paginas" @click="page++" aria-label="Página siguiente"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
      </div>`
  };

  /* ------------------------------ Centro de notificaciones ------------------------------ */
  const ApNotifs = {
    setup() {
      const lista = S.notificaciones;
      const sinLeer = computed(() => lista.value.filter((n) => !n.leida).length);
      const abrir = (n, close) => { S.marcarLeidas([n.key]); close(); AP.router.go(n.to); };
      return { lista, sinLeer, abrir, marcar: () => S.marcarLeidas(), C };
    },
    template: `
      <ap-menu width="min(400px, calc(100vw - 16px))" panel-class="!fixed sm:!absolute right-2 sm:right-0 top-12 sm:top-full">
        <template #trigger="{ toggle }">
          <button class="shell-btn relative" @click="toggle" :aria-label="'Notificaciones: ' + sinLeer + ' sin leer'">
            <i class="fa-regular fa-bell"></i>
            <span v-if="sinLeer" class="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-shell">{{ sinLeer > 99 ? '99+' : sinLeer }}</span>
          </button>
        </template>
        <template #default="{ close }">
          <div class="flex items-center justify-between px-3 pb-2 border-b border-ink-100 dark:border-white/[0.06]">
            <p class="font-semibold text-[13.5px]">Notificaciones <span class="muted font-normal">({{ lista.length }})</span></p>
            <button v-if="sinLeer" class="text-[12px] font-semibold text-brand-700 dark:text-brand-400 hover:underline" data-keep @click="marcar">Marcar todo como leído</button>
          </div>
          <div class="max-h-[60vh] overflow-y-auto divide">
            <button v-for="n in lista" :key="n.key" class="w-full flex gap-3 px-3 py-2.5 text-left hover:bg-ink-50 dark:hover:bg-white/[0.04]" @click="abrir(n, close)">
              <span :class="['w-7 h-7 rounded-md grid place-items-center text-[12px] shrink-0', C.NIVELES[n.nivel].tone.soft]"><i :class="['fa-solid', n.icono]"></i></span>
              <span class="min-w-0 flex-1">
                <span :class="['block text-[13px] truncate', n.leida ? 'text-ink-600 dark:text-ink-400' : 'font-semibold text-ink-900 dark:text-white']">{{ n.titulo }}</span>
                <span class="block text-[12px] muted line-clamp-2">{{ n.texto }}</span>
              </span>
              <span v-if="!n.leida" class="w-2 h-2 rounded-full bg-brand-600 mt-1.5 shrink-0"></span>
            </button>
            <ap-empty v-if="!lista.length" compact icon="fa-bell-slash" title="Sin notificaciones" text="Todo está al día."></ap-empty>
          </div>
        </template>
      </ap-menu>`
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
    template: `<div ref="el" class="w-full rounded-lg overflow-hidden bg-ink-100 dark:bg-ink-850 z-0" :style="{ height }"></div>`
  };

  AP.ui = { ApChart, ApMenu, ApModal, ApConfirm, ApToasts, ApStat, ApSpark, ApTile, ApEmpty, ApFase, ApStatus, ApPageHeader, ApFacet, ApTab, ApSeg, ApRec, ApWx, ApDataTable, ApNotifs, ApMiniMap };
})(window.AP = window.AP || {});
