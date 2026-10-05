/* AgroPiña Pro · Vistas: Labores (bitácora y tareas) y Calendario */
(function (AP) {
  'use strict';
  const { ref, computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog;

  AP.views = AP.views || {};

  AP.views.labores = {
    setup() {
      const st = S.state;
      const tab = ref(S.pendientes.value.length ? 'pendiente' : 'completada');
      const q = ref('');
      const parcela = ref('');
      const tipo = ref('');
      const filtradas = computed(() => st.labores
        .filter((l) => tab.value === 'todas' || l.estado === tab.value)
        .filter((l) => !parcela.value || l.parcelaId === parcela.value)
        .filter((l) => !tipo.value || l.tipo === tipo.value)
        .filter((l) => U.match(q.value, l.tipo, l.descripcion, l.responsable, S.parcelaNombre(l.parcelaId), ...l.insumos.map((i) => i.nombre)))
        .sort((a, b) => (tab.value === 'pendiente' ? (a.fecha < b.fecha ? -1 : 1) : (a.fecha < b.fecha ? 1 : -1))));
      const grupos = computed(() => {
        const out = [];
        filtradas.value.forEach((l) => {
          let key, label;
          if (l.estado === 'pendiente' && tab.value !== 'completada') {
            key = l.fecha < st.hoy ? '0' : l.fecha === st.hoy ? '1' : U.diffDays(l.fecha, st.hoy) <= 7 ? '2' : '3';
            label = { 0: 'Vencidas', 1: 'Hoy', 2: 'Próximos 7 días', 3: 'Más adelante' }[key];
          } else { key = U.monthKey(l.fecha); label = U.monthLabel(key, true); }
          let g = out.find((x) => x.key === key);
          if (!g) { g = { key, label, items: [], total: 0 }; out.push(g); }
          g.items.push(l); g.total += l.costoTotal;
        });
        return out;
      });
      const resumen = computed(() => ({ n: filtradas.value.length, costo: U.sum(filtradas.value, (l) => l.costoTotal), jornales: U.sum(filtradas.value, (l) => l.jornales), insumos: U.sum(filtradas.value, (l) => l.costoInsumos) }));
      const counts = computed(() => ({ pendiente: S.pendientes.value.length, completada: st.labores.length - S.pendientes.value.length, todas: st.labores.length }));
      return { st, tab, q, parcela, tipo, grupos, resumen, counts, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Operación" title="Labores" subtitle="Bitácora de campo, programación de tareas y trazabilidad de aplicaciones.">
        <button class="btn btn-outline" @click="S.openForm('labor', { estado: 'pendiente', fecha: U.addDays(st.hoy, 1) })"><i class="fa-regular fa-calendar-plus"></i>Programar</button>
        <button class="btn btn-primary" @click="S.openForm('labor')"><i class="fa-solid fa-plus"></i>Registrar labor</button>
      </ap-page-header>

      <div class="flex flex-col xl:flex-row gap-3 xl:items-center mb-5">
        <ap-seg v-model="tab" :options="[{ value: 'pendiente', label: 'Programadas', count: counts.pendiente }, { value: 'completada', label: 'Realizadas', count: counts.completada }, { value: 'todas', label: 'Todas', count: counts.todas }]"></ap-seg>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1 xl:max-w-2xl xl:ml-auto">
          <div class="relative col-span-2 sm:col-span-1">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 text-sm"></i>
            <input v-model="q" class="input pl-10 h-10" placeholder="Buscar…">
          </div>
          <select v-model="parcela" class="input h-10"><option value="">Todas las parcelas</option><option v-for="p in st.parcelas" :key="p.id" :value="p.id">{{ p.nombre }}</option></select>
          <select v-model="tipo" class="input h-10"><option value="">Todos los tipos</option><option v-for="(t, k) in C.LABORES" :key="k" :value="k">{{ k }}</option></select>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <ap-stat label="Labores" :value="resumen.n" icon="fa-list-check" tone="sky"></ap-stat>
        <ap-stat label="Costo total" :value="$money(resumen.costo, true)" icon="fa-coins" tone="orange"></ap-stat>
        <ap-stat label="En insumos" :value="$money(resumen.insumos, true)" icon="fa-flask" tone="lime"></ap-stat>
        <ap-stat label="Jornales" :value="U.fmtNum(resumen.jornales, 1)" icon="fa-people-group" tone="violet"></ap-stat>
      </div>

      <div class="space-y-4">
        <div v-for="g in grupos" :key="g.key" class="card overflow-hidden">
          <div class="flex items-center justify-between px-4 sm:px-5 py-3 bg-ink-50/70 dark:bg-white/[0.02] border-b border-ink-100 dark:border-white/5">
            <h3 :class="['text-sm font-bold capitalize', g.key === '0' ? 'text-red-600' : '']"><i v-if="g.key === '0'" class="fa-solid fa-clock mr-1.5"></i>{{ g.label }} <span class="muted font-medium">· {{ g.items.length }}</span></h3>
            <span class="text-xs font-semibold muted num">{{ $money(g.total) }}</span>
          </div>
          <div class="divide">
            <div v-for="l in g.items" :key="l.id" class="row items-start group">
              <button v-if="l.estado === 'pendiente'" class="mt-2.5 w-5 h-5 rounded-md border-2 border-ink-300 dark:border-white/20 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 shrink-0 transition" @click="S.completarLabor(l.id)" title="Marcar como realizada"></button>
              <div :class="['icon-tile', C.labor(l.tipo).tone.soft]"><i :class="['fa-solid', C.labor(l.tipo).icon]"></i></div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p class="font-semibold text-sm text-ink-950 dark:text-white">{{ l.tipo }}</p>
                  <a :href="'#/parcelas/' + l.parcelaId" class="chip bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300 hover:bg-ink-200">{{ S.parcelaNombre(l.parcelaId) }}</a>
                  <span v-if="l.estado === 'pendiente'" :class="['chip', l.fecha < st.hoy ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300']">{{ U.fmtRel(l.fecha, st.hoy) }}</span>
                </div>
                <p v-if="l.descripcion" class="text-[13px] text-ink-600 dark:text-ink-300 mt-1">{{ l.descripcion }}</p>
                <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] muted">
                  <span><i class="fa-regular fa-calendar mr-1"></i>{{ U.fmtDate(l.fecha) }}</span>
                  <span v-if="l.responsable"><i class="fa-solid fa-user mr-1"></i>{{ l.responsable }}</span>
                  <span v-if="l.jornales"><i class="fa-solid fa-people-group mr-1"></i>{{ U.fmtNum(l.jornales, 1) }} jornales</span>
                </div>
                <div v-if="l.insumos.length" class="flex flex-wrap gap-1.5 mt-2">
                  <span v-for="(li, i) in l.insumos" :key="i" class="chip bg-lime-50 text-lime-800 dark:bg-lime-500/10 dark:text-lime-300 font-medium">
                    <i class="fa-solid fa-flask text-[9px]"></i>{{ li.nombre }} · {{ U.fmtNum(li.cantidad, 2) }} {{ li.unidad }}<i v-if="li.carencia" class="fa-solid fa-shield-halved text-[9px] text-amber-600" :title="'Carencia ' + li.carencia + ' días'"></i>
                  </span>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-bold num">{{ $money(l.costoTotal) }}</p>
                <div class="flex justify-end gap-0.5 mt-1 opacity-70 group-hover:opacity-100 transition">
                  <button class="btn-icon btn-icon-sm" @click="S.openForm('labor', l)" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn-icon btn-icon-sm hover:!text-red-600" @click="S.deleteLabor(l.id)" aria-label="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!grupos.length" class="card">
          <ap-empty icon="fa-clipboard-list" :title="tab === 'pendiente' ? 'No hay labores programadas' : 'No hay labores'" text="Registre fertilizaciones, aplicaciones, inducciones y más para llevar la trazabilidad completa.">
            <button class="btn btn-primary" @click="S.openForm('labor')"><i class="fa-solid fa-plus"></i>Registrar labor</button>
          </ap-empty>
        </div>
      </div>
    </div>`
  };

  /* ------------------------------ Calendario ------------------------------ */
  AP.views.calendario = {
    setup() {
      const st = S.state;
      const mes = ref(U.monthKey(st.hoy));
      const sel = ref(st.hoy);
      const mostrarProy = ref(true);
      const eventos = computed(() => {
        const ev = [];
        st.labores.forEach((l) => ev.push({ fecha: l.fecha, tipo: 'labor', titulo: l.tipo, sub: S.parcelaNombre(l.parcelaId), tone: C.labor(l.tipo).tone, icon: C.labor(l.tipo).icon, ref: l, pendiente: l.estado === 'pendiente' }));
        st.cosechas.forEach((c) => ev.push({ fecha: c.fecha, tipo: 'cosecha', titulo: 'Cosecha ' + U.fmtNum(c.toneladas, 1) + ' t', sub: S.parcelaNombre(c.parcelaId), tone: C.tone('orange'), icon: 'fa-basket-shopping', ref: c }));
        st.monitoreos.forEach((m) => ev.push({ fecha: m.fecha, tipo: 'monitoreo', titulo: C.plaga(m.plaga).nombre, sub: S.parcelaNombre(m.parcelaId), tone: C.tone('violet'), icon: 'fa-bug', ref: m }));
        if (mostrarProy.value) {
          S.activas.value.forEach((p) => {
            const e = S.estados.value[p.id];
            if (!e.induccion && e.induccionEst >= st.hoy) ev.push({ fecha: e.induccionEst, tipo: 'proyeccion', titulo: 'Inducción sugerida', sub: p.nombre, tone: C.tone('lime'), icon: 'fa-wand-magic-sparkles', proy: true, parcelaId: p.id });
            if (e.cosechaEst >= st.hoy) ev.push({ fecha: e.cosechaEst, tipo: 'proyeccion', titulo: 'Cosecha estimada', sub: p.nombre, tone: C.tone('rose'), icon: 'fa-calendar-check', proy: true, parcelaId: p.id });
          });
        }
        return U.groupBy(ev, (x) => x.fecha);
      });
      const dias = computed(() => {
        const first = U.parseDate(mes.value + '-01');
        const offset = (first.getDay() + 6) % 7;
        const start = U.addDays(mes.value + '-01', -offset);
        return Array.from({ length: 42 }, (_, i) => {
          const f = U.addDays(start, i);
          return { fecha: f, n: +f.slice(8), fuera: U.monthKey(f) !== mes.value, hoy: f === st.hoy, ev: eventos.value[f] || [] };
        });
      });
      const semanas = computed(() => (dias.value[35].fuera ? dias.value.slice(0, 35) : dias.value));
      const delDia = computed(() => eventos.value[sel.value] || []);
      const mover = (n) => { mes.value = U.monthKey(U.addMonths(mes.value + '-01', n)); };
      const hoyFn = () => { mes.value = U.monthKey(st.hoy); sel.value = st.hoy; };
      const abrir = (e) => {
        if (e.tipo === 'labor') S.openForm('labor', e.ref);
        else if (e.tipo === 'cosecha') S.openForm('cosecha', e.ref);
        else if (e.tipo === 'monitoreo') S.openForm('monitoreo', e.ref);
        else AP.router.go('parcelas/' + e.parcelaId);
      };
      return { st, mes, sel, mostrarProy, semanas, delDia, mover, hoyFn, abrir, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Operación" title="Calendario" subtitle="Labores, cosechas, monitoreos y proyecciones fenológicas en una sola vista.">
        <button :class="['filter-chip h-10', mostrarProy ? 'filter-chip-on' : '']" @click="mostrarProy = !mostrarProy"><i class="fa-solid fa-wand-magic-sparkles"></i>Proyecciones</button>
        <button class="btn btn-primary" @click="S.openForm('labor', { fecha: sel, estado: sel > st.hoy ? 'pendiente' : 'completada' })"><i class="fa-solid fa-plus"></i>Agregar</button>
      </ap-page-header>

      <div class="grid xl:grid-cols-3 gap-4">
        <div class="card xl:col-span-2 overflow-hidden">
          <div class="flex items-center justify-between px-4 sm:px-5 py-4">
            <h3 class="text-lg font-extrabold capitalize">{{ U.monthLabel(mes, true) }}</h3>
            <div class="flex items-center gap-1">
              <button class="btn btn-soft btn-sm" @click="hoyFn">Hoy</button>
              <button class="btn-icon" @click="mover(-1)" aria-label="Mes anterior"><i class="fa-solid fa-chevron-left"></i></button>
              <button class="btn-icon" @click="mover(1)" aria-label="Mes siguiente"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
          </div>
          <div class="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider muted border-y border-ink-100 dark:border-white/5 bg-ink-50/60 dark:bg-white/[0.02]">
            <div v-for="d in ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']" :key="d" class="py-2">{{ d }}</div>
          </div>
          <div class="grid grid-cols-7">
            <button v-for="d in semanas" :key="d.fecha" @click="sel = d.fecha"
              :class="['relative min-h-[64px] sm:min-h-[104px] p-1.5 sm:p-2 text-left border-b border-r border-ink-100 dark:border-white/[0.05] transition flex flex-col gap-1',
                d.fuera ? 'bg-ink-50/50 dark:bg-white/[0.01]' : 'hover:bg-ink-50 dark:hover:bg-white/[0.03]',
                sel === d.fecha ? '!bg-brand-50 dark:!bg-brand-500/10' : '']">
              <span :class="['text-xs font-bold w-6 h-6 grid place-items-center rounded-full', d.hoy ? 'bg-brand-600 text-white' : d.fuera ? 'text-ink-300 dark:text-ink-600' : 'text-ink-700 dark:text-ink-200']">{{ d.n }}</span>
              <div class="hidden sm:flex flex-col gap-0.5 min-w-0">
                <span v-for="(e, i) in d.ev.slice(0, 3)" :key="i" :class="['truncate rounded px-1.5 py-0.5 text-[10px] font-semibold', e.proy ? 'border border-dashed ' + e.tone.border + ' ' + e.tone.text : e.tone.chip, e.pendiente ? 'opacity-80' : '']">{{ e.titulo }}</span>
                <span v-if="d.ev.length > 3" class="text-[10px] muted font-semibold px-1">+{{ d.ev.length - 3 }} más</span>
              </div>
              <div class="flex sm:hidden flex-wrap gap-0.5">
                <span v-for="(e, i) in d.ev.slice(0, 4)" :key="i" :class="['w-1.5 h-1.5 rounded-full', e.tone.dot]"></span>
              </div>
            </button>
          </div>
        </div>

        <div class="card self-start">
          <div class="card-head">
            <div>
              <p class="eyebrow">{{ U.fmtRel(sel, st.hoy) }}</p>
              <h3 class="text-lg font-extrabold capitalize">{{ U.fmtDate(sel, 'long') }}</h3>
            </div>
          </div>
          <div class="divide">
            <button v-for="(e, i) in delDia" :key="i" class="row w-full text-left" @click="abrir(e)">
              <div :class="['icon-tile w-9 h-9 text-sm', e.proy ? 'border-2 border-dashed ' + e.tone.border + ' ' + e.tone.text : e.tone.soft]"><i :class="['fa-solid', e.icon]"></i></div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold truncate">{{ e.titulo }}</p>
                <p class="text-[11px] muted truncate">{{ e.sub }}<span v-if="e.pendiente"> · programada</span><span v-if="e.proy"> · proyección</span></p>
              </div>
              <i class="fa-solid fa-chevron-right text-xs text-ink-300"></i>
            </button>
            <ap-empty v-if="!delDia.length" compact icon="fa-calendar" title="Día libre" text="No hay eventos para esta fecha.">
              <button class="btn btn-soft btn-sm" @click="S.openForm('labor', { fecha: sel, estado: sel > st.hoy ? 'pendiente' : 'completada' })"><i class="fa-solid fa-plus"></i>Agregar labor</button>
            </ap-empty>
          </div>
          <div class="px-4 sm:px-5 py-4 border-t border-ink-100 dark:border-white/5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] muted">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-lime-500"></span>Labores</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-orange-500"></span>Cosechas</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-violet-500"></span>Monitoreo</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded border border-dashed border-rose-500"></span>Proyección</span>
          </div>
        </div>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
