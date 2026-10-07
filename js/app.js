/* AgroPiña Enterprise · Aplicación raíz: shell empresarial, enrutador, paleta de comandos y registro de componentes */
(function (AP) {
  'use strict';
  const { createApp, reactive, computed, ref, watch, nextTick, onMounted, onBeforeUnmount } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog;

  AP.VERSION = '3.0.0';
  AP.money = (n, compact) => U.fmtMoney(n, S.state.settings.moneda, compact);

  /* ------------------------------ Enrutador (hash) ------------------------------ */
  const route = reactive({ name: 'dashboard', id: null, query: {}, qs: '', key: 0 });
  const VIEWS = ['dashboard', 'parcelas', 'labores', 'calendario', 'mapa', 'clima', 'cosechas', 'sanidad', 'inventario', 'compras', 'ventas', 'personal', 'finanzas', 'reportes', 'auditoria', 'ajustes'];
  function parse() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const [name, id] = path.split('/');
    const query = {};
    new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    route.name = name === 'parcelas' && id ? 'parcela' : VIEWS.includes(name) ? name : 'dashboard';
    route.id = id ? decodeURIComponent(id) : null;
    route.query = query;
    route.qs = qs || '';
    route.key++;
    S.state.ui.sheet = null;
    S.state.ui.palette = false;
    window.scrollTo({ top: 0 });
  }
  AP.router = { route, go: (path) => { location.hash = '#/' + path; } };
  window.addEventListener('hashchange', parse);

  /* ------------------------------ Módulos (navegación) ------------------------------ */
  const NAV = [
    { group: 'Inicio', items: [{ to: 'dashboard', label: 'Panel de control', icon: 'fa-gauge-high' }] },
    { group: 'Producción agrícola', items: [
      { to: 'parcelas', label: 'Parcelas', icon: 'fa-layer-group' },
      { to: 'mapa', label: 'Mapa de la finca', icon: 'fa-map-location-dot' },
      { to: 'labores', label: 'Órdenes de trabajo', icon: 'fa-list-check' },
      { to: 'calendario', label: 'Calendario', icon: 'fa-calendar-days' },
      { to: 'clima', label: 'Clima y riesgo', icon: 'fa-cloud-sun-rain' },
      { to: 'sanidad', label: 'Sanidad vegetal', icon: 'fa-bug' },
      { to: 'cosechas', label: 'Cosechas', icon: 'fa-basket-shopping' }
    ] },
    { group: 'Cadena de suministro', items: [
      { to: 'inventario', label: 'Inventario', icon: 'fa-boxes-stacked' },
      { to: 'compras', label: 'Compras', icon: 'fa-truck-ramp-box' }
    ] },
    { group: 'Comercial', items: [{ to: 'ventas', label: 'Ventas y cobros', icon: 'fa-file-invoice-dollar' }] },
    { group: 'Recursos humanos', items: [{ to: 'personal', label: 'Personal y planilla', icon: 'fa-people-group' }] },
    { group: 'Finanzas y análisis', items: [
      { to: 'finanzas', label: 'Finanzas', icon: 'fa-chart-line' },
      { to: 'reportes', label: 'Centro de reportes', icon: 'fa-file-lines' }
    ] },
    { group: 'Administración', items: [
      { to: 'auditoria', label: 'Auditoría', icon: 'fa-clock-rotate-left' },
      { to: 'ajustes', label: 'Configuración', icon: 'fa-gear' }
    ] }
  ];
  const ALL = NAV.flatMap((g) => g.items.map((i) => Object.assign({ group: g.group }, i)));
  const QUICK = [
    { type: 'labor', crear: 'Nueva orden de trabajo', label: 'Orden de trabajo', icon: 'fa-list-check', tone: C.tone('emerald') },
    { type: 'cosecha', crear: 'Registrar cosecha', label: 'Cosecha', icon: 'fa-basket-shopping', tone: C.tone('orange') },
    { type: 'monitoreo', crear: 'Nuevo monitoreo fitosanitario', label: 'Monitoreo', icon: 'fa-bug', tone: C.tone('violet') },
    { type: 'parcela', crear: 'Nueva parcela', label: 'Parcela', icon: 'fa-layer-group', tone: C.tone('sky') },
    { type: 'orden', crear: 'Nueva orden de compra', label: 'Orden de compra', icon: 'fa-truck-ramp-box', tone: C.tone('blue') },
    { type: 'insumo', crear: 'Nuevo insumo', label: 'Insumo', icon: 'fa-box', tone: C.tone('amber') },
    { type: 'movimiento', crear: 'Registrar entrada de stock', label: 'Entrada de stock', icon: 'fa-right-left', tone: C.tone('teal') },
    { type: 'trabajador', crear: 'Nuevo trabajador', label: 'Trabajador', icon: 'fa-user-plus', tone: C.tone('indigo') },
    { type: 'cliente', crear: 'Nuevo cliente', label: 'Cliente', icon: 'fa-handshake', tone: C.tone('rose') }
  ];

  /* ------------------------------ Paleta de comandos (Ctrl+K) ------------------------------ */
  const ApPalette = {
    setup() {
      const st = S.state;
      const q = ref('');
      const idx = ref(0);
      const input = ref(null);
      const close = () => { st.ui.palette = false; };
      const items = computed(() => {
        const out = [];
        ALL.forEach((n) => out.push({ grupo: 'Ir a', label: n.label, sub: n.group, icon: n.icon, run: () => AP.router.go(n.to), k: n.label + ' ' + n.group }));
        QUICK.forEach((x) => out.push({ grupo: 'Crear', label: x.crear, sub: 'Formulario', icon: x.icon, run: () => S.openForm(x.type), k: 'nuevo crear registrar ' + x.label }));
        st.fincas.forEach((f) => { if (f.id !== st.fincaActiva) out.push({ grupo: 'Fincas', label: 'Cambiar a ' + f.nombre, sub: 'Finca', icon: 'fa-warehouse', run: () => S.cambiarFinca(f.id), k: 'finca ' + f.nombre }); });
        st.parcelas.forEach((p) => out.push({ grupo: 'Parcelas', label: p.nombre, sub: [p.codigo, p.variedad, U.fmtNum(p.hectareas, 1) + ' ha'].filter(Boolean).join(' · '), icon: 'fa-layer-group', run: () => AP.router.go('parcelas/' + p.id), k: p.nombre + ' ' + p.codigo }));
        st.insumos.forEach((i) => out.push({ grupo: 'Insumos', label: i.nombre, sub: U.fmtNum(i.stock, 2) + ' ' + i.unidad + ' en stock', icon: 'fa-flask', run: () => AP.router.go('inventario?tab=movimientos&i=' + i.id), k: i.nombre + ' ' + i.ingredienteActivo + ' ' + i.categoria }));
        st.trabajadores.forEach((t) => out.push({ grupo: 'Personal', label: t.nombre, sub: t.puesto + ' · ' + t.cuadrilla, icon: 'fa-user', run: () => S.openForm('trabajador', t), k: t.nombre + ' ' + t.identificacion + ' ' + t.cuadrilla }));
        st.proveedores.forEach((p) => out.push({ grupo: 'Proveedores', label: p.nombre, sub: p.contacto, icon: 'fa-truck', run: () => S.openForm('proveedor', p), k: p.nombre + ' ' + p.identificacion }));
        st.clientes.forEach((c) => out.push({ grupo: 'Clientes', label: c.nombre, sub: c.tipo, icon: 'fa-handshake', run: () => S.openForm('cliente', c), k: c.nombre + ' ' + c.identificacion }));
        st.ordenes.forEach((o) => out.push({ grupo: 'Órdenes de compra', label: o.numero + ' · ' + S.proveedorNombre(o.proveedorId), sub: AP.negocio.ESTADOS_OC[o.estado].label + ' · ' + AP.money(o.total), icon: 'fa-file-invoice', run: () => S.openForm('orden', o), k: o.numero + ' ' + S.proveedorNombre(o.proveedorId) }));
        out.push({ grupo: 'Acciones', label: st.isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro', sub: 'Apariencia', icon: st.isDark ? 'fa-sun' : 'fa-moon', run: () => { st.prefs.tema = st.isDark ? 'light' : 'dark'; }, k: 'tema oscuro claro apariencia' });
        out.push({ grupo: 'Acciones', label: st.prefs.densidad === 'compacta' ? 'Densidad cómoda' : 'Densidad compacta', sub: 'Apariencia', icon: 'fa-table-cells', run: () => { st.prefs.densidad = st.prefs.densidad === 'compacta' ? 'comoda' : 'compacta'; }, k: 'densidad compacta cómoda tablas' });
        out.push({ grupo: 'Acciones', label: 'Exportar reporte completo a Excel', sub: 'Datos', icon: 'fa-file-excel', run: () => AP.reportes.excel(), k: 'excel exportar reporte' });
        out.push({ grupo: 'Acciones', label: 'Descargar respaldo (JSON)', sub: 'Datos', icon: 'fa-download', run: () => S.exportJSON(), k: 'respaldo backup descargar' });
        out.push({ grupo: 'Acciones', label: 'Actualizar pronóstico del clima', sub: 'Clima', icon: 'fa-rotate', run: () => S.loadWeather(true), k: 'clima actualizar pronostico' });
        return out;
      });
      const resultados = computed(() => {
        const t = q.value.trim();
        const base = t ? items.value.filter((x) => U.match(t, x.label, x.k, x.sub)) : items.value.filter((x) => x.grupo === 'Ir a' || x.grupo === 'Crear');
        const porGrupo = {};
        base.forEach((x) => { (porGrupo[x.grupo] = porGrupo[x.grupo] || []).push(x); });
        const lista = [];
        Object.keys(porGrupo).forEach((g) => porGrupo[g].slice(0, t ? 6 : 20).forEach((x) => lista.push(x)));
        return lista;
      });
      watch(q, () => { idx.value = 0; });
      watch(() => st.ui.palette, (v) => { if (v) { q.value = ''; idx.value = 0; nextTick(() => input.value && input.value.focus()); } });
      const ejecutar = (x) => { close(); if (x) setTimeout(x.run, 0); };
      const onKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); idx.value = Math.min(idx.value + 1, resultados.value.length - 1); scroll(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); idx.value = Math.max(idx.value - 1, 0); scroll(); }
        else if (e.key === 'Enter') { e.preventDefault(); ejecutar(resultados.value[idx.value]); }
        else if (e.key === 'Escape') close();
      };
      const lista = ref(null);
      const scroll = () => nextTick(() => { const el = lista.value && lista.value.querySelector('[data-active="true"]'); if (el) el.scrollIntoView({ block: 'nearest' }); });
      return { st, q, idx, input, lista, resultados, ejecutar, onKey, close };
    },
    template: `
      <teleport to="body">
        <div v-if="st.ui.palette" class="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Buscar y ejecutar">
          <div class="absolute inset-0 bg-ink-950/50" @click="close"></div>
          <div class="relative w-full max-w-[640px] bg-white dark:bg-ink-900 rounded-xl shadow-2xl border border-ink-200 dark:border-white/10 overflow-hidden">
            <div class="flex items-center gap-3 px-4 h-14 border-b border-ink-200 dark:border-white/[0.08]">
              <i class="fa-solid fa-magnifying-glass text-ink-400"></i>
              <input ref="input" v-model="q" @keydown="onKey" class="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink-400" placeholder="Buscar parcelas, insumos, personal… o escribir una acción" aria-label="Buscar">
              <span class="kbd">Esc</span>
            </div>
            <div ref="lista" class="max-h-[55vh] overflow-y-auto py-1">
              <template v-for="(x, i) in resultados" :key="x.grupo + x.label + i">
                <p v-if="i === 0 || resultados[i - 1].grupo !== x.grupo" class="menu-label pt-2.5">{{ x.grupo }}</p>
                <button :data-active="i === idx" @mouseenter="idx = i" @click="ejecutar(x)" :class="['w-full flex items-center gap-3 px-4 h-11 text-left', i === idx ? 'bg-brand-50 dark:bg-brand-500/10' : '']">
                  <span class="w-7 h-7 rounded-md grid place-items-center bg-ink-100 dark:bg-white/[0.06] text-ink-600 dark:text-ink-300 text-[12px] shrink-0"><i :class="['fa-solid', x.icon]"></i></span>
                  <span class="min-w-0 flex-1"><span class="block text-[13.5px] font-medium truncate">{{ x.label }}</span><span v-if="x.sub" class="block text-[11.5px] muted truncate">{{ x.sub }}</span></span>
                  <i v-if="i === idx" class="fa-solid fa-arrow-turn-down rotate-90 text-[11px] text-ink-400"></i>
                </button>
              </template>
              <p v-if="!resultados.length" class="px-4 py-10 text-center text-[13px] muted">Sin resultados para «{{ q }}».</p>
            </div>
            <div class="flex items-center gap-4 px-4 h-10 border-t border-ink-200 dark:border-white/[0.08] text-[11.5px] muted bg-ink-50 dark:bg-ink-850">
              <span><span class="kbd">↑</span> <span class="kbd">↓</span> navegar</span><span><span class="kbd">Enter</span> abrir</span><span class="ml-auto"><span class="kbd">Ctrl</span> <span class="kbd">K</span> en cualquier pantalla</span>
            </div>
          </div>
        </div>
      </teleport>`
  };

  /* ------------------------------ Shell ------------------------------ */
  const Root = {
    setup() {
      const st = S.state;
      const active = (to) => route.name === to || (to === 'parcelas' && route.name === 'parcela');
      const actual = computed(() => ALL.find((x) => active(x.to)) || ALL[0]);
      const badges = computed(() => ({ labores: S.vencidas.value.length, inventario: S.stockBajo.value.length, compras: S.ordenesAbiertas.value.filter((o) => o.estado === 'aprobada').length, ventas: S.cxc.value.filter((x) => x.diasVencido > 0).length, clima: S.alertasClima.value.filter((a) => a.nivel === 'alto').length }));
      const wxMini = computed(() => (st.weather.data ? Object.assign({ temp: Math.round(st.weather.data.current.temp) }, C.wmo(st.weather.data.current.code, st.weather.data.current.isDay)) : null));
      const iniciales = computed(() => st.prefs.usuario.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || 'U');
      const colapsada = computed(() => st.prefs.navColapsada);
      const quick = (t) => { st.ui.sheet = null; S.openForm(t); };
      const onKey = (e) => {
        const tag = (e.target && e.target.tagName) || '';
        const escribiendo = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); st.ui.palette = !st.ui.palette; }
        else if (!escribiendo && e.key === '/' && !st.ui.form) { e.preventDefault(); st.ui.palette = true; }
      };
      onMounted(() => document.addEventListener('keydown', onKey));
      onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
      return { st, route, NAV, ALL, QUICK, active, actual, badges, wxMini, iniciales, colapsada, quick, S, U, AP };
    },
    template: `
    <div class="min-h-screen">
      <!-- Barra de sistema -->
      <header class="fixed top-0 inset-x-0 z-50 h-12 bg-shell text-white flex items-center gap-1 sm:gap-2 px-2 sm:px-3 print:hidden shadow-[0_1px_0_rgba(255,255,255,.06)]">
        <button class="shell-btn hidden lg:inline-flex" @click="st.prefs.navColapsada = !st.prefs.navColapsada" :aria-label="colapsada ? 'Expandir menú' : 'Contraer menú'"><i class="fa-solid fa-bars"></i></button>
        <a href="#/dashboard" class="flex items-center gap-2 px-1.5 shrink-0">
          <img src="assets/icon.svg" alt="" class="w-7 h-7 rounded-md">
          <span class="hidden sm:inline-flex items-center gap-1.5 font-semibold tracking-tight text-[15px]">AgroPiña<span class="text-[9.5px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded bg-white/10 text-gold-400">Enterprise</span></span>
        </a>
        <span class="hidden md:block w-px h-6 bg-white/15 mx-1"></span>
        <ap-menu align="left" width="300px">
          <template #trigger="{ toggle }">
            <button class="shell-btn max-w-[46vw] sm:max-w-[280px]" @click="toggle" aria-label="Cambiar de finca">
              <i class="fa-solid fa-warehouse text-[12px] text-gold-400"></i><span class="truncate font-medium">{{ st.settings.finca }}</span><i class="fa-solid fa-chevron-down text-[9px] opacity-70"></i>
            </button>
          </template>
          <p class="menu-label">Fincas ({{ st.fincas.length }})</p>
          <button v-for="f in st.fincas" :key="f.id" class="menu-item" @click="S.cambiarFinca(f.id)">
            <i :class="['fa-solid w-4', f.id === st.fincaActiva ? 'fa-circle-check text-brand-600' : 'fa-warehouse text-ink-400']"></i>
            <span class="truncate flex-1">{{ f.nombre }}</span><span v-if="f.id === st.fincaActiva" class="text-[11px] muted">Activa</span>
          </button>
          <div class="menu-sep"></div>
          <button class="menu-item" @click="S.openForm('finca')"><i class="fa-solid fa-plus w-4 text-ink-500"></i>Nueva finca</button>
          <a href="#/reportes?r=consolidado" class="menu-item"><i class="fa-solid fa-sitemap w-4 text-ink-500"></i>Consolidado de fincas</a>
          <a href="#/ajustes" class="menu-item"><i class="fa-solid fa-gear w-4 text-ink-500"></i>Administrar fincas</a>
        </ap-menu>
        <div class="flex-1 flex justify-center min-w-0">
          <button class="hidden md:flex items-center gap-2 w-full max-w-[460px] h-8 px-3 rounded-md bg-white/[0.08] hover:bg-white/[0.12] text-white/60 text-[13px] transition" @click="st.ui.palette = true">
            <i class="fa-solid fa-magnifying-glass text-[12px]"></i><span class="flex-1 text-left truncate">Buscar o ejecutar un comando</span><span class="text-[11px] font-mono border border-white/20 rounded px-1.5 py-px">Ctrl K</span>
          </button>
        </div>
        <button class="shell-btn md:hidden" @click="st.ui.palette = true" aria-label="Buscar"><i class="fa-solid fa-magnifying-glass"></i></button>
        <a v-if="wxMini" href="#/clima" class="shell-btn hidden lg:inline-flex" :title="wxMini.label"><i :class="['fa-solid', wxMini.icon, wxMini.color]"></i><span class="num">{{ wxMini.temp }}°</span><span v-if="st.weather.simulated" class="text-[10px] uppercase tracking-wider text-sky-300">Sim.</span></a>
        <span v-if="st.weather.stale" class="hidden sm:inline-flex items-center gap-1 h-6 px-2 rounded bg-amber-400/20 text-amber-200 text-[11px] font-semibold"><i class="fa-solid fa-cloud"></i>Sin conexión</span>
        <ap-menu width="260px">
          <template #trigger="{ toggle }"><button class="shell-btn hidden lg:inline-flex bg-brand-600 hover:!bg-brand-500 !text-white px-3 font-semibold" @click="toggle"><i class="fa-solid fa-plus"></i>Crear</button></template>
          <p class="menu-label">Crear nuevo</p>
          <button v-for="q in QUICK" :key="q.type" class="menu-item" @click="quick(q.type)"><i :class="['fa-solid w-4', q.icon, q.tone.text]"></i>{{ q.label }}</button>
        </ap-menu>
        <ap-notifs></ap-notifs>
        <ap-menu width="250px">
          <template #trigger="{ toggle }"><button class="shell-btn" @click="toggle" aria-label="Menú de usuario"><span class="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-[11px] font-bold">{{ iniciales }}</span></button></template>
          <div class="px-3 pt-1 pb-2.5 border-b border-ink-100 dark:border-white/[0.06]">
            <p class="font-semibold truncate">{{ st.prefs.usuario.nombre }}</p><p class="text-[12px] muted truncate">{{ st.prefs.usuario.rol }}</p>
          </div>
          <p class="menu-label pt-2">Apariencia</p>
          <div class="px-3 pb-2" data-keep><div class="seg w-full"><button v-for="t in [['system','Auto'],['light','Claro'],['dark','Oscuro']]" :key="t[0]" :class="['seg-btn flex-1', st.prefs.tema === t[0] ? 'seg-on' : '']" @click="st.prefs.tema = t[0]">{{ t[1] }}</button></div></div>
          <div class="px-3 pb-2" data-keep><div class="seg w-full"><button v-for="t in [['comoda','Cómoda'],['compacta','Compacta']]" :key="t[0]" :class="['seg-btn flex-1', st.prefs.densidad === t[0] ? 'seg-on' : '']" @click="st.prefs.densidad = t[0]">{{ t[1] }}</button></div></div>
          <div class="menu-sep"></div>
          <a href="#/ajustes" class="menu-item"><i class="fa-solid fa-gear w-4 text-ink-500"></i>Configuración</a>
          <a href="#/auditoria" class="menu-item"><i class="fa-solid fa-clock-rotate-left w-4 text-ink-500"></i>Registro de auditoría</a>
          <button class="menu-item" @click="st.ui.palette = true"><i class="fa-solid fa-keyboard w-4 text-ink-500"></i>Buscar y atajos <span class="ml-auto kbd">Ctrl K</span></button>
          <div class="menu-sep"></div>
          <p class="px-3 py-1 text-[11px] muted">AgroPiña Enterprise v{{ AP.VERSION }}</p>
        </ap-menu>
      </header>

      <!-- Navegación lateral (escritorio) -->
      <aside :class="['sidenav hidden lg:flex fixed left-0 top-12 bottom-0 z-40 flex-col bg-white dark:bg-ink-900 border-r border-ink-200 dark:border-white/[0.07] print:hidden', colapsada ? 'w-[60px]' : 'w-[248px]']">
        <nav class="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 pb-3" aria-label="Módulos">
          <template v-for="g in NAV" :key="g.group">
            <p v-if="!colapsada" class="nav-group">{{ g.group }}</p>
            <div v-else class="my-2 mx-2 border-t border-ink-100 dark:border-white/[0.06]"></div>
            <a v-for="it in g.items" :key="it.to" :href="'#/' + it.to" :title="colapsada ? it.label : null" :class="['nav-item', active(it.to) ? 'nav-item-on' : '', colapsada ? 'justify-center px-0' : '']">
              <i :class="['fa-solid w-4 text-center text-[13.5px]', it.icon, active(it.to) ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 dark:text-ink-400']"></i>
              <span v-if="!colapsada" class="flex-1 truncate">{{ it.label }}</span>
              <span v-if="badges[it.to] && !colapsada" class="min-w-[20px] h-5 px-1.5 rounded bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300 text-[11px] font-semibold grid place-items-center">{{ badges[it.to] }}</span>
              <span v-else-if="badges[it.to]" class="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500"></span>
            </a>
          </template>
        </nav>
        <div class="border-t border-ink-100 dark:border-white/[0.06] p-2">
          <button :class="['nav-item w-full', colapsada ? 'justify-center px-0' : '']" @click="st.prefs.navColapsada = !colapsada" :title="colapsada ? 'Expandir menú' : 'Contraer menú'">
            <i :class="['fa-solid w-4 text-center text-ink-500', colapsada ? 'fa-angles-right' : 'fa-angles-left']"></i><span v-if="!colapsada" class="flex-1 text-left">Contraer menú</span>
          </button>
        </div>
      </aside>

      <div :class="['content-shift pt-12', colapsada ? 'lg:pl-[60px]' : 'lg:pl-[248px]']">
        <main class="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-28 lg:pb-12 max-w-[1680px] mx-auto">
          <component :is="'view-' + route.name" :key="route.name + '-' + (route.id || '') + '-' + st.fincaActiva + '-' + route.qs" :id="route.id" :query="route.query"></component>
        </main>
      </div>

      <!-- Navegación inferior (móvil) -->
      <nav class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-ink-900/95 backdrop-blur border-t border-ink-200 dark:border-white/[0.07] pb-safe print:hidden">
        <div class="grid grid-cols-5 items-end h-16 max-w-md mx-auto px-2">
          <a href="#/dashboard" :class="['flex flex-col items-center gap-1 py-2 text-[10.5px] font-medium', active('dashboard') ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500']"><i class="fa-solid fa-gauge-high text-[17px]"></i>Panel</a>
          <a href="#/parcelas" :class="['flex flex-col items-center gap-1 py-2 text-[10.5px] font-medium', active('parcelas') ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500']"><i class="fa-solid fa-layer-group text-[17px]"></i>Parcelas</a>
          <div class="flex justify-center">
            <button class="-mt-6 w-[52px] h-[52px] rounded-full bg-brand-700 text-white text-lg shadow-lift ring-4 ring-[#f3f5f8] dark:ring-ink-950 active:scale-95 transition" @click="st.ui.sheet = 'quick'" aria-label="Crear"><i class="fa-solid fa-plus"></i></button>
          </div>
          <a href="#/labores" :class="['relative flex flex-col items-center gap-1 py-2 text-[10.5px] font-medium', active('labores') ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500']">
            <i class="fa-solid fa-list-check text-[17px]"></i>Trabajo
            <span v-if="badges.labores" class="absolute top-1 right-[22%] w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-ink-900"></span>
          </a>
          <button @click="st.ui.sheet = 'more'" :class="['flex flex-col items-center gap-1 py-2 text-[10.5px] font-medium', ['dashboard','parcelas','labores','parcela'].includes(route.name) ? 'text-ink-500' : 'text-brand-700 dark:text-brand-400']"><i class="fa-solid fa-grip text-[17px]"></i>Módulos</button>
        </div>
      </nav>

      <!-- Crear (móvil) -->
      <ap-modal v-if="st.ui.sheet === 'quick'" title="Crear" subtitle="Seleccione el tipo de registro" size="sm" @close="st.ui.sheet = null">
        <div class="grid grid-cols-3 gap-2">
          <button v-for="q in QUICK" :key="q.type" class="flex flex-col items-center gap-2 p-3 rounded-lg border border-ink-200 dark:border-white/[0.08] hover:border-brand-500/50 hover:bg-ink-50 dark:hover:bg-white/[0.03] transition active:scale-95" @click="quick(q.type)">
            <span :class="['w-10 h-10 rounded-lg grid place-items-center', q.tone.soft]"><i :class="['fa-solid', q.icon]"></i></span>
            <span class="text-[11.5px] font-semibold text-center leading-tight">{{ q.label }}</span>
          </button>
        </div>
      </ap-modal>

      <!-- Módulos (móvil) -->
      <ap-modal v-if="st.ui.sheet === 'more'" title="Módulos" :subtitle="st.settings.finca" size="sm" @close="st.ui.sheet = null">
        <div v-for="g in NAV" :key="g.group" class="mb-3">
          <p class="eyebrow mb-1.5">{{ g.group }}</p>
          <div class="grid grid-cols-3 gap-2">
            <a v-for="it in g.items" :key="it.to" :href="'#/' + it.to" :class="['relative flex flex-col items-center gap-1.5 p-3 rounded-lg border transition active:scale-95 text-center', active(it.to) ? 'border-brand-500/50 bg-brand-50 dark:bg-brand-500/10' : 'border-ink-200 dark:border-white/[0.08]']">
              <i :class="['fa-solid text-[16px]', it.icon, active(it.to) ? 'text-brand-700' : 'text-ink-500 dark:text-ink-300']"></i>
              <span class="text-[11.5px] font-medium leading-tight">{{ it.label }}</span>
              <span v-if="badges[it.to]" class="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">{{ badges[it.to] }}</span>
            </a>
          </div>
        </div>
      </ap-modal>

      <ap-palette></ap-palette>
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
    app.config.globalProperties.$go = (p) => AP.router.go(p);
    app.config.errorHandler = (err, vm, info) => { console.error('[AgroPiña]', info, err); S.toast('Ocurrió un error inesperado: ' + (err && err.message), 'error'); };
    Object.entries(AP.ui).forEach(([k, c]) => app.component(kebab(k), c));
    app.component('ap-palette', ApPalette);
    Object.entries(AP.forms).forEach(([k, c]) => app.component(kebab(k), c));
    Object.entries(AP.views).forEach(([k, c]) => { c.inheritAttrs = false; app.component('view-' + k, c); });
    app.mount('#app');
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  AP.boot = boot;
  AP.NAV = NAV;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.AP = window.AP || {});
