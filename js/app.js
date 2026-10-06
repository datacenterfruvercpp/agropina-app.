/* AgroPiña Pro · Aplicación raíz: enrutador, diseño y registro de componentes */
(function (AP) {
  'use strict';
  const { createApp, reactive, computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog;

  AP.VERSION = '2.0.1';
  AP.money = (n, compact) => U.fmtMoney(n, S.state.settings.moneda, compact);

  /* ------------------------------ Enrutador (hash) ------------------------------ */
  const route = reactive({ name: 'dashboard', id: null, query: {}, key: 0 });
  const VIEWS = ['dashboard', 'parcelas', 'labores', 'calendario', 'mapa', 'clima', 'cosechas', 'sanidad', 'inventario', 'finanzas', 'ajustes'];
  function parse() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const [name, id] = path.split('/');
    const query = {};
    new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    route.name = name === 'parcelas' && id ? 'parcela' : VIEWS.includes(name) ? name : 'dashboard';
    route.id = id ? decodeURIComponent(id) : null;
    route.query = query;
    route.key++;
    S.state.ui.sheet = null;
    window.scrollTo({ top: 0 });
  }
  AP.router = { route, go: (path) => { location.hash = '#/' + path; } };
  window.addEventListener('hashchange', parse);

  const NAV = [
    { group: 'Operación', items: [
      { to: 'dashboard', label: 'Inicio', icon: 'fa-house' },
      { to: 'parcelas', label: 'Parcelas', icon: 'fa-layer-group' },
      { to: 'mapa', label: 'Mapa', icon: 'fa-map-location-dot' },
      { to: 'labores', label: 'Labores', icon: 'fa-list-check' },
      { to: 'calendario', label: 'Calendario', icon: 'fa-calendar-days' }
    ] },
    { group: 'Producción', items: [
      { to: 'cosechas', label: 'Cosechas', icon: 'fa-basket-shopping' },
      { to: 'sanidad', label: 'Sanidad', icon: 'fa-bug' },
      { to: 'inventario', label: 'Inventario', icon: 'fa-boxes-stacked' }
    ] },
    { group: 'Inteligencia', items: [
      { to: 'clima', label: 'Clima y riesgo', icon: 'fa-cloud-sun-rain' },
      { to: 'finanzas', label: 'Finanzas', icon: 'fa-chart-line' }
    ] }
  ];
  const ALL = NAV.flatMap((g) => g.items).concat([{ to: 'ajustes', label: 'Ajustes', icon: 'fa-gear' }]);
  const QUICK = [
    { type: 'labor', label: 'Labor', icon: 'fa-list-check', tone: C.tone('emerald') },
    { type: 'cosecha', label: 'Cosecha', icon: 'fa-basket-shopping', tone: C.tone('orange') },
    { type: 'monitoreo', label: 'Monitoreo', icon: 'fa-bug', tone: C.tone('violet') },
    { type: 'parcela', label: 'Parcela', icon: 'fa-layer-group', tone: C.tone('sky') },
    { type: 'insumo', label: 'Insumo', icon: 'fa-box', tone: C.tone('amber') },
    { type: 'movimiento', label: 'Entrada stock', icon: 'fa-right-left', tone: C.tone('teal') }
  ];

  const Root = {
    setup() {
      const st = S.state;
      const active = (to) => route.name === to || (to === 'parcelas' && route.name === 'parcela');
      const titulo = computed(() => (ALL.find((x) => active(x.to)) || ALL[0]).label);
      const badges = computed(() => ({ labores: S.vencidas.value.length, inventario: S.stockBajo.value.length, clima: S.alertasClima.value.filter((a) => a.nivel === 'alto').length }));
      const wxMini = computed(() => (st.weather.data ? Object.assign({ temp: Math.round(st.weather.data.current.temp) }, C.wmo(st.weather.data.current.code, st.weather.data.current.isDay)) : null));
      const toggleTema = () => { st.settings.tema = st.isDark ? 'light' : 'dark'; };
      const quick = (t) => { st.ui.sheet = null; S.openForm(t); };
      return { st, route, NAV, ALL, QUICK, active, titulo, badges, wxMini, toggleTema, quick, S, U };
    },
    template: `
    <div class="min-h-screen">
      <!-- Barra lateral (escritorio) -->
      <aside class="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[264px] flex-col bg-ink-950 text-ink-300 border-r border-white/5">
        <div class="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none"></div>
        <a href="#/dashboard" class="relative flex items-center gap-3 px-5 h-[72px]">
          <img src="assets/icon.svg" alt="" class="w-9 h-9 rounded-xl shadow-glow">
          <div class="min-w-0">
            <p class="text-white font-extrabold tracking-tight leading-none">AgroPiña <span class="text-gold-400">Pro</span></p>
            <p class="text-[11px] text-ink-500 truncate mt-1">{{ st.settings.finca }}</p>
          </div>
        </a>
        <nav class="relative flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
          <div v-for="g in NAV" :key="g.group" class="mt-4">
            <p class="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600">{{ g.group }}</p>
            <a v-for="it in g.items" :key="it.to" :href="'#/' + it.to" :class="['nav-item', active(it.to) ? 'nav-item-on' : '']">
              <i :class="['fa-solid w-5 text-center text-[14px]', it.icon, active(it.to) ? 'text-brand-400' : '']"></i>
              <span class="flex-1">{{ it.label }}</span>
              <span v-if="badges[it.to]" class="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500/90 text-white text-[10px] font-bold grid place-items-center">{{ badges[it.to] }}</span>
            </a>
          </div>
        </nav>
        <div class="relative p-3 border-t border-white/5 space-y-1">
          <a v-if="wxMini" href="#/clima" class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition mb-2">
            <i :class="['fa-solid text-lg', wxMini.icon, wxMini.color]"></i>
            <div class="min-w-0 flex-1"><p class="text-sm text-white font-bold leading-none">{{ wxMini.temp }}° <span class="font-medium text-ink-400 text-xs">{{ wxMini.label }}</span></p><p class="text-[11px] text-ink-500 truncate mt-1">{{ S.ubicacionActual.value.nombre }}</p></div>
          </a>
          <a href="#/ajustes" :class="['nav-item', active('ajustes') ? 'nav-item-on' : '']"><i class="fa-solid fa-gear w-5 text-center"></i><span class="flex-1">Ajustes</span></a>
          <button class="nav-item w-full" @click="toggleTema"><i :class="['fa-solid w-5 text-center', st.isDark ? 'fa-sun' : 'fa-moon']"></i><span class="flex-1 text-left">{{ st.isDark ? 'Modo claro' : 'Modo oscuro' }}</span></button>
        </div>
      </aside>

      <div class="lg:pl-[264px]">
        <!-- Barra superior -->
        <header class="sticky top-0 z-30 glass border-b border-ink-200/60 dark:border-white/5 print:hidden">
          <div class="flex items-center gap-3 h-16 px-4 sm:px-6 lg:px-10 max-w-[1440px] mx-auto">
            <a href="#/dashboard" class="lg:hidden flex items-center gap-2.5 min-w-0">
              <img src="assets/icon.svg" alt="" class="w-8 h-8 rounded-lg">
              <div class="min-w-0"><p class="font-extrabold tracking-tight leading-none text-ink-950 dark:text-white">AgroPiña <span class="text-gold-500">Pro</span></p><p class="text-[11px] muted truncate mt-0.5">{{ st.settings.finca }}</p></div>
            </a>
            <div class="hidden lg:flex items-center gap-2 text-sm">
              <span class="muted">{{ st.settings.finca }}</span><i class="fa-solid fa-chevron-right text-[10px] text-ink-300"></i><span class="font-semibold text-ink-900 dark:text-white">{{ titulo }}</span>
            </div>
            <div class="ml-auto flex items-center gap-1">
              <span v-if="st.weather.stale" class="chip bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 mr-1"><i class="fa-solid fa-cloud"></i>Sin conexión</span>
              <a v-if="wxMini" href="#/clima" class="lg:hidden btn btn-ghost btn-sm px-2"><i :class="['fa-solid', wxMini.icon, wxMini.color]"></i><span class="num">{{ wxMini.temp }}°</span></a>
              <button class="btn-icon" @click="toggleTema" :aria-label="st.isDark ? 'Modo claro' : 'Modo oscuro'"><i :class="['fa-solid', st.isDark ? 'fa-sun' : 'fa-moon']"></i></button>
              <a href="#/ajustes" class="btn-icon lg:hidden" aria-label="Ajustes"><i class="fa-solid fa-gear"></i></a>
              <button class="hidden lg:inline-flex btn btn-primary ml-2" @click="st.ui.sheet = 'quick'"><i class="fa-solid fa-plus"></i>Registrar</button>
            </div>
          </div>
        </header>

        <main class="px-4 sm:px-6 lg:px-10 pt-5 sm:pt-7 pb-32 lg:pb-14 max-w-[1440px] mx-auto">
          <component :is="'view-' + route.name" :key="route.name + '-' + (route.id || '')" :id="route.id" :query="route.query"></component>
        </main>
      </div>

      <!-- Navegación inferior (móvil) -->
      <nav class="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-ink-200/60 dark:border-white/5 pb-safe print:hidden">
        <div class="grid grid-cols-5 items-end h-16 max-w-md mx-auto px-2">
          <a href="#/dashboard" :class="['flex flex-col items-center gap-1 py-2 text-[10px] font-semibold', active('dashboard') ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400']"><i class="fa-solid fa-house text-lg"></i>Inicio</a>
          <a href="#/parcelas" :class="['flex flex-col items-center gap-1 py-2 text-[10px] font-semibold', active('parcelas') ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400']"><i class="fa-solid fa-layer-group text-lg"></i>Parcelas</a>
          <div class="flex justify-center">
            <button class="-mt-7 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xl shadow-glow ring-4 ring-[#f4f5f1] dark:ring-ink-950 active:scale-95 transition" @click="st.ui.sheet = 'quick'" aria-label="Registrar"><i class="fa-solid fa-plus"></i></button>
          </div>
          <a href="#/labores" :class="['relative flex flex-col items-center gap-1 py-2 text-[10px] font-semibold', active('labores') ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400']">
            <i class="fa-solid fa-list-check text-lg"></i>Labores
            <span v-if="badges.labores" class="absolute top-1 right-[22%] w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-ink-950"></span>
          </a>
          <button @click="st.ui.sheet = 'more'" :class="['flex flex-col items-center gap-1 py-2 text-[10px] font-semibold', ['dashboard','parcelas','labores','parcela'].includes(route.name) ? 'text-ink-400' : 'text-brand-600 dark:text-brand-400']"><i class="fa-solid fa-grip text-lg"></i>Más</button>
        </div>
      </nav>

      <!-- Registro rápido -->
      <ap-modal v-if="st.ui.sheet === 'quick'" title="Registrar" subtitle="¿Qué desea registrar?" size="sm" @close="st.ui.sheet = null">
        <div class="grid grid-cols-3 gap-2.5">
          <button v-for="q in QUICK" :key="q.type" class="flex flex-col items-center gap-2 p-4 rounded-2xl border border-ink-200/70 dark:border-white/[0.06] hover:border-brand-500/50 hover:bg-ink-50 dark:hover:bg-white/[0.03] transition active:scale-95" @click="quick(q.type)">
            <span :class="['icon-tile w-11 h-11 text-base', q.tone.soft]"><i :class="['fa-solid', q.icon]"></i></span>
            <span class="text-xs font-semibold text-center leading-tight">{{ q.label }}</span>
          </button>
        </div>
      </ap-modal>

      <!-- Menú "Más" (móvil) -->
      <ap-modal v-if="st.ui.sheet === 'more'" title="Menú" :subtitle="st.settings.finca" size="sm" @close="st.ui.sheet = null">
        <div class="grid grid-cols-3 gap-2.5">
          <a v-for="it in ALL" :key="it.to" :href="'#/' + it.to" :class="['relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition active:scale-95', active(it.to) ? 'border-brand-500/50 bg-brand-50 dark:bg-brand-500/10' : 'border-ink-200/70 dark:border-white/[0.06]']">
            <i :class="['fa-solid text-lg', it.icon, active(it.to) ? 'text-brand-600' : 'text-ink-500 dark:text-ink-300']"></i>
            <span class="text-xs font-semibold text-center">{{ it.label }}</span>
            <span v-if="badges[it.to]" class="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">{{ badges[it.to] }}</span>
          </a>
        </div>
      </ap-modal>

      <form-host></form-host>
      <ap-confirm></ap-confirm>
      <ap-toasts></ap-toasts>
    </div>`
  };

  /* ------------------------------ Arranque ------------------------------ */
  function kebab(name) { return name.replace(/^Ap/, 'ap-').replace(/^Form/, 'form-').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(); }
  function boot() {
    S.init();
    parse();
    const app = createApp(Root);
    app.config.globalProperties.$money = AP.money;
    app.config.errorHandler = (err, vm, info) => { console.error('[AgroPiña]', info, err); S.toast('Ocurrió un error inesperado: ' + (err && err.message), 'error'); };
    Object.entries(AP.ui).forEach(([k, c]) => app.component(kebab(k), c));
    Object.entries(AP.forms).forEach(([k, c]) => app.component(kebab(k), c));
    Object.entries(AP.views).forEach(([k, c]) => { c.inheritAttrs = false; app.component('view-' + k, c); });
    app.mount('#app');
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  AP.boot = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.AP = window.AP || {});
