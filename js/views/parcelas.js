/* AgroPiña Pro · Vistas: Parcelas (listado) y Detalle de parcela */
(function (AP) {
  'use strict';
  const { ref, computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog;

  AP.views = AP.views || {};

  AP.views.parcelas = {
    setup() {
      const st = S.state;
      const q = ref('');
      const fase = ref('todas');
      const orden = ref('cosecha');
      const archivadas = ref(false);
      const base = computed(() => st.parcelas.filter((p) => (archivadas.value ? p.estado === 'archivada' : p.estado !== 'archivada')));
      const conteo = computed(() => { const o = {}; base.value.forEach((p) => { const f = S.estados.value[p.id].fase; o[f] = (o[f] || 0) + 1; }); return o; });
      const fasesFiltro = computed(() => [{ value: 'todas', label: 'Todas', count: base.value.length }].concat(
        Object.keys(C.FASES).filter((k) => conteo.value[k]).map((k) => ({ value: k, label: C.FASES[k].short, count: conteo.value[k] }))));
      const lista = computed(() => {
        const out = base.value
          .filter((p) => fase.value === 'todas' || S.estados.value[p.id].fase === fase.value)
          .filter((p) => U.match(q.value, p.nombre, p.codigo, p.variedad))
          .map((p) => ({ p, e: S.estados.value[p.id], prod: S.produccion.value[p.id], car: S.carencias.value[p.id], recs: S.recomendaciones.value.filter((r) => r.parcelaId === p.id && (r.nivel === 'alto' || r.nivel === 'medio')).length }));
        const sorters = {
          cosecha: (a, b) => a.e.diasParaCosecha - b.e.diasParaCosecha,
          nombre: (a, b) => a.p.nombre.localeCompare(b.p.nombre),
          area: (a, b) => b.p.hectareas - a.p.hectareas,
          edad: (a, b) => b.e.dias - a.e.dias
        };
        return out.sort(sorters[orden.value]);
      });
      const totales = computed(() => ({ ha: U.sum(lista.value, (x) => x.p.hectareas), t: U.sum(lista.value, (x) => x.prod.toneladas), plantas: U.sum(lista.value, (x) => x.prod.plantas) }));
      return { st, q, fase, orden, archivadas, fasesFiltro, lista, totales, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Operación" title="Parcelas" :subtitle="U.fmtNum(totales.ha, 1) + ' ha · ' + U.fmtCompact(totales.plantas) + ' plantas · ' + U.fmtNum(totales.t) + ' t estimadas'">
        <a href="#/mapa" class="btn btn-outline"><i class="fa-solid fa-map-location-dot"></i>Mapa</a>
        <button class="btn btn-primary" @click="S.openForm('parcela')"><i class="fa-solid fa-plus"></i>Nueva parcela</button>
      </ap-page-header>

      <div class="flex flex-col lg:flex-row gap-3 lg:items-center mb-5">
        <div class="relative lg:w-72">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 text-sm"></i>
          <input v-model="q" class="input pl-10" placeholder="Buscar parcela, código…">
        </div>
        <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 flex-1">
          <button v-for="o in fasesFiltro" :key="o.value" :class="['filter-chip', fase === o.value ? 'filter-chip-on' : '']" @click="fase = o.value">{{ o.label }} <span class="opacity-60">{{ o.count }}</span></button>
        </div>
        <div class="flex gap-2">
          <select v-model="orden" class="input h-9 text-xs w-auto">
            <option value="cosecha">Próxima cosecha</option><option value="nombre">Nombre</option><option value="area">Área</option><option value="edad">Edad</option>
          </select>
          <button :class="['filter-chip', archivadas ? 'filter-chip-on' : '']" @click="archivadas = !archivadas; fase = 'todas'"><i class="fa-solid fa-box-archive"></i>Archivadas</button>
        </div>
      </div>

      <div v-if="lista.length" class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <a v-for="(x, i) in lista" :key="x.p.id" :href="'#/parcelas/' + x.p.id" class="card card-hover overflow-hidden flex flex-col animate-fade-up" :style="{ animationDelay: Math.min(i, 8) * 40 + 'ms' }">
          <div class="h-1.5" :style="{ background: 'linear-gradient(90deg,' + x.p.color + ',' + x.p.color + '66)' }"></div>
          <div class="p-4 sm:p-5 flex-1 flex flex-col">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="eyebrow truncate">{{ x.p.codigo ? x.p.codigo + ' · ' : '' }}{{ x.p.variedad }} · {{ x.e.etiquetaCiclo }}</p>
                <h3 class="font-bold text-lg truncate mt-0.5 text-ink-950 dark:text-white">{{ x.p.nombre }}</h3>
              </div>
              <ap-fase :fase="x.e.fase" short></ap-fase>
            </div>
            <div class="mt-4">
              <div class="flex justify-between text-[11px] muted mb-1.5"><span>Día {{ x.e.dias }} del ciclo</span><span class="font-semibold">{{ Math.round(x.e.progreso) }}%</span></div>
              <div class="bar"><span :class="x.e.faseInfo.tone.dot" :style="{ width: x.e.progreso + '%' }"></span></div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-4">
              <div class="rounded-xl bg-ink-50 dark:bg-white/[0.03] px-3 py-2"><p class="text-[10px] font-bold uppercase tracking-wider muted">Área</p><p class="font-bold num text-sm">{{ U.fmtNum(x.p.hectareas, 1) }} ha</p></div>
              <div class="rounded-xl bg-ink-50 dark:bg-white/[0.03] px-3 py-2"><p class="text-[10px] font-bold uppercase tracking-wider muted">Estimado</p><p class="font-bold num text-sm">{{ U.fmtNum(x.prod.toneladas) }} t</p></div>
              <div class="rounded-xl bg-ink-50 dark:bg-white/[0.03] px-3 py-2"><p class="text-[10px] font-bold uppercase tracking-wider muted">Cosecha</p><p class="font-bold text-sm truncate">{{ x.e.diasParaCosecha <= 0 ? 'Ahora' : U.fmtDate(x.e.cosechaEst, 'short') }}</p></div>
            </div>
            <div class="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-ink-100 dark:border-white/5 mt-auto">
              <span v-if="x.car" class="chip bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"><i class="fa-solid fa-shield-halved"></i>Carencia {{ x.car.dias }} d</span>
              <span v-if="x.recs" class="chip bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"><i class="fa-solid fa-bolt"></i>{{ x.recs }} alerta(s)</span>
              <span v-if="x.e.induccionAtrasada" class="chip bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300"><i class="fa-solid fa-wand-magic-sparkles"></i>Inducir</span>
              <span class="chip bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300 ml-auto">{{ x.e.diasParaCosecha > 0 ? 'Cosecha ' + U.fmtRel(x.e.cosechaEst, st.hoy) : 'Ventana de cosecha' }}</span>
            </div>
          </div>
        </a>
      </div>
      <div v-else class="card">
        <ap-empty :icon="st.parcelas.length ? 'fa-filter-circle-xmark' : 'fa-layer-group'" :title="st.parcelas.length ? 'Sin resultados' : 'Aún no tiene parcelas'" :text="st.parcelas.length ? 'Pruebe con otro filtro o búsqueda.' : 'Registre sus lotes para proyectar fases, cosechas y producción.'">
          <button v-if="!st.parcelas.length" class="btn btn-primary" @click="S.openForm('parcela')"><i class="fa-solid fa-plus"></i>Crear parcela</button>
          <button v-if="!st.parcelas.length" class="btn btn-soft" @click="S.loadDemo()"><i class="fa-solid fa-flask-vial"></i>Cargar demostración</button>
        </ap-empty>
      </div>
    </div>`
  };

  /* ------------------------------ Detalle ------------------------------ */
  AP.views.parcela = {
    props: { id: String },
    setup(props) {
      const st = S.state;
      const p = computed(() => S.parcela(props.id));
      const e = computed(() => (p.value ? S.estados.value[p.value.id] : null));
      const prod = computed(() => (p.value ? S.produccion.value[p.value.id] : null));
      const tab = ref('labores');
      const menu = ref(false);
      const recs = computed(() => S.recomendaciones.value.filter((r) => r.parcelaId === props.id));
      const labores = computed(() => st.labores.filter((l) => l.parcelaId === props.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)));
      const cosechas = computed(() => st.cosechas.filter((c) => c.parcelaId === props.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)));
      const monitoreos = computed(() => st.monitoreos.filter((m) => m.parcelaId === props.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)));
      const carencia = computed(() => S.carencias.value[props.id]);
      const fin = computed(() => {
        if (!p.value) return null;
        const ini = p.value.fechaInicioCiclo;
        const lab = labores.value.filter((l) => l.estado === 'completada' && l.fecha >= ini);
        const cicloCos = cosechas.value.filter((c) => (c.ciclo != null ? c.ciclo === p.value.ciclo : c.fecha >= ini));
        const costo = U.sum(lab, (l) => l.costoTotal);
        const ingreso = U.sum(cicloCos, (c) => c.toneladas * c.precio);
        const t = U.sum(cicloCos, (c) => c.toneladas);
        const ha = p.value.hectareas || 1;
        const proyectado = prod.value.toneladas * (st.settings.precioReferencia || 0);
        return {
          costo, ingreso, t, costoHa: costo / ha, mo: U.sum(lab, (l) => l.costoManoObra), ins: U.sum(lab, (l) => l.costoInsumos), otros: U.sum(lab, (l) => l.otrosCostos),
          proyectado, margenProyectado: (ingreso || proyectado) - costo, costoT: t ? costo / t : prod.value.toneladas ? costo / prod.value.toneladas : 0
        };
      });
      const pasos = computed(() => C.FASES_CICLO.map((k, i) => ({ k, f: C.FASES[k], estado: !e.value || e.value.faseIndex < 0 ? 'futuro' : i < e.value.faseIndex ? 'hecho' : i === e.value.faseIndex ? 'actual' : 'futuro' })));
      const editar = () => S.openForm('parcela', p.value);
      const eliminar = async () => { menu.value = false; if (await S.deleteParcela(props.id)) AP.router.go('parcelas'); };
      const archivar = () => { menu.value = false; S.toggleArchivo(props.id); };
      return { st, p, e, prod, tab, menu, recs, labores, cosechas, monitoreos, carencia, fin, pasos, editar, eliminar, archivar, S, U, C };
    },
    template: `
    <div v-if="p && e">
      <a href="#/parcelas" class="inline-flex items-center gap-2 text-sm font-semibold muted hover:text-ink-900 dark:hover:text-white mb-4"><i class="fa-solid fa-arrow-left"></i>Parcelas</a>

      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 animate-fade-up">
        <div class="flex items-start gap-4 min-w-0">
          <div class="w-14 h-14 rounded-2xl grid place-items-center text-white text-xl shrink-0 shadow-lift" :style="{ background: 'linear-gradient(135deg,' + p.color + ',' + p.color + 'aa)' }"><i class="fa-solid fa-layer-group"></i></div>
          <div class="min-w-0">
            <p class="eyebrow">{{ p.codigo ? p.codigo + ' · ' : '' }}{{ C.VARIEDADES[p.variedad].nombre }}</p>
            <h1 class="h-title truncate">{{ p.nombre }}</h1>
            <div class="flex flex-wrap gap-1.5 mt-2">
              <ap-fase :fase="e.fase"></ap-fase>
              <span class="chip bg-ink-100 text-ink-700 dark:bg-white/5 dark:text-ink-300">{{ e.etiquetaCiclo }}</span>
              <span v-if="carencia" class="chip bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"><i class="fa-solid fa-shield-halved"></i>Carencia hasta {{ U.fmtDate(carencia.hasta, 'short') }}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap relative">
          <button class="btn btn-outline" @click="editar"><i class="fa-solid fa-pen"></i>Editar</button>
          <button class="btn btn-outline" @click="S.openForm('monitoreo', { parcelaId: p.id })"><i class="fa-solid fa-bug"></i><span class="hidden sm:inline">Monitoreo</span></button>
          <button class="btn btn-outline" @click="S.openForm('cosecha', { parcelaId: p.id })"><i class="fa-solid fa-basket-shopping"></i><span class="hidden sm:inline">Cosecha</span></button>
          <button class="btn btn-primary" @click="S.openForm('labor', { parcelaId: p.id })"><i class="fa-solid fa-plus"></i>Labor</button>
          <div class="relative">
            <button class="btn-icon border border-ink-200 dark:border-white/10" @click="menu = !menu" aria-label="Más opciones"><i class="fa-solid fa-ellipsis"></i></button>
            <div v-if="menu" class="fixed inset-0 z-10" @click="menu = false"></div>
            <div v-if="menu" class="absolute right-0 mt-2 w-52 card p-1.5 z-20 shadow-lift">
              <a :href="'#/mapa?p=' + p.id" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-ink-100 dark:hover:bg-white/5"><i class="fa-solid fa-draw-polygon w-4 text-ink-400"></i>Dibujar en el mapa</a>
              <button class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-ink-100 dark:hover:bg-white/5" @click="archivar"><i class="fa-solid fa-box-archive w-4 text-ink-400"></i>{{ p.estado === 'archivada' ? 'Reactivar' : 'Archivar' }}</button>
              <button class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" @click="eliminar"><i class="fa-solid fa-trash-can w-4"></i>Eliminar parcela</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Línea de tiempo fenológica -->
      <div class="card p-4 sm:p-6 mb-4 overflow-x-auto no-scrollbar">
        <div class="flex items-start min-w-[640px]">
          <template v-for="(s, i) in pasos" :key="s.k">
            <div class="flex flex-col items-center text-center w-24 shrink-0">
              <div :class="['w-10 h-10 rounded-full grid place-items-center text-sm transition', s.estado === 'actual' ? s.f.tone.dot + ' text-white ring-4 ring-black/5 dark:ring-white/10 shadow-lift' : s.estado === 'hecho' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400 dark:bg-white/5']">
                <i :class="['fa-solid', s.estado === 'hecho' ? 'fa-check' : s.f.icon]"></i>
              </div>
              <p :class="['text-[11px] font-semibold mt-2 leading-tight', s.estado === 'actual' ? 'text-ink-950 dark:text-white' : 'muted']">{{ s.f.short }}</p>
              <p v-if="s.k === 'preinduccion'" class="text-[10px] muted mt-0.5">{{ U.fmtDate(e.induccionEst, 'short') }}{{ e.induccion ? '' : '*' }}</p>
              <p v-if="s.k === 'cosecha'" class="text-[10px] muted mt-0.5">{{ U.fmtDate(e.cosechaEst, 'short') }}</p>
            </div>
            <div v-if="i < pasos.length - 1" :class="['flex-1 h-0.5 mt-5 rounded-full min-w-[12px]', pasos[i + 1].estado !== 'futuro' ? 'bg-brand-500' : 'bg-ink-200 dark:bg-white/10']"></div>
          </template>
        </div>
        <p class="text-[11px] muted mt-4">* Fechas estimadas según la variedad. Registre la inducción floral para afinar la proyección de cosecha.</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <ap-stat label="Área" :value="U.fmtNum(p.hectareas, 2)" unit="ha" icon="fa-vector-square" tone="sky"></ap-stat>
        <ap-stat label="Plantas" :value="U.fmtCompact(prod.plantas)" icon="fa-seedling" tone="emerald" :sub="U.fmtNum(prod.densidad) + ' por ha'"></ap-stat>
        <ap-stat label="Edad" :value="e.dias" unit="días" icon="fa-hourglass-half" tone="lime" :sub="U.fmtNum(e.meses, 1) + ' meses'"></ap-stat>
        <ap-stat label="Cosecha" :value="e.diasParaCosecha <= 0 ? 'Ahora' : e.diasParaCosecha" :unit="e.diasParaCosecha > 0 ? 'días' : ''" icon="fa-calendar-check" tone="rose" :sub="U.fmtDate(e.cosechaEst)"></ap-stat>
        <ap-stat label="Producción" :value="U.fmtNum(prod.toneladas)" unit="t" icon="fa-weight-hanging" tone="amber" :sub="U.fmtNum(prod.tHa) + ' t/ha · ' + U.fmtCompact(prod.cajas) + ' cajas'"></ap-stat>
        <ap-stat label="Costo ciclo" :value="$money(fin.costo, true)" icon="fa-coins" tone="orange" :sub="$money(fin.costoHa) + ' / ha'"></ap-stat>
      </div>

      <div class="grid lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 space-y-4">
          <div class="card">
            <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-brain text-brand-600"></i>Recomendaciones agronómicas</h3></div>
            <div class="px-4 sm:px-5 pb-2 divide">
              <ap-rec v-for="(r, i) in recs" :key="i" :r="r"></ap-rec>
              <ap-empty v-if="!recs.length" compact icon="fa-circle-check" title="Sin alertas" text="La parcela no requiere acciones inmediatas."></ap-empty>
            </div>
          </div>

          <div class="card">
            <div class="card-head flex-wrap">
              <h3 class="card-title">Historial</h3>
              <ap-seg v-model="tab" :options="[{ value: 'labores', label: 'Labores', count: labores.length }, { value: 'cosechas', label: 'Cosechas', count: cosechas.length }, { value: 'sanidad', label: 'Sanidad', count: monitoreos.length }]"></ap-seg>
            </div>
            <div v-if="tab === 'labores'" class="divide">
              <div v-for="l in labores" :key="l.id" class="row group">
                <div :class="['icon-tile w-9 h-9 text-sm', C.labor(l.tipo).tone.soft]"><i :class="['fa-solid', C.labor(l.tipo).icon]"></i></div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold">{{ l.tipo }} <span v-if="l.estado === 'pendiente'" class="chip bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 ml-1">Programada</span></p>
                  <p class="text-xs muted truncate">{{ U.fmtDate(l.fecha) }}<span v-if="l.descripcion"> · {{ l.descripcion }}</span></p>
                </div>
                <span class="text-sm font-semibold num shrink-0">{{ $money(l.costoTotal) }}</span>
                <button class="btn-icon btn-icon-sm opacity-60 group-hover:opacity-100" @click="S.openForm('labor', l)" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
              </div>
              <ap-empty v-if="!labores.length" compact icon="fa-list-check" title="Sin labores registradas"></ap-empty>
            </div>
            <div v-if="tab === 'cosechas'" class="divide">
              <div v-for="c in cosechas" :key="c.id" class="row group">
                <div :class="['icon-tile w-9 h-9 text-sm', C.destino(c.destino).soft]"><i class="fa-solid fa-basket-shopping"></i></div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold">{{ U.fmtNum(c.toneladas, 1) }} t · {{ c.destino }} <span v-if="c.cicloCerrado" class="chip bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300 ml-1">Cierre de ciclo</span></p>
                  <p class="text-xs muted">{{ U.fmtDate(c.fecha) }}<span v-if="c.brix"> · {{ c.brix }} °Brix</span><span v-if="c.exportable != null"> · {{ c.exportable }}% exportable</span></p>
                </div>
                <span class="text-sm font-semibold num shrink-0 text-brand-700 dark:text-brand-400">{{ $money(c.toneladas * c.precio) }}</span>
                <button class="btn-icon btn-icon-sm opacity-60 group-hover:opacity-100" @click="S.openForm('cosecha', c)" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
              </div>
              <ap-empty v-if="!cosechas.length" compact icon="fa-basket-shopping" title="Sin cosechas registradas"></ap-empty>
            </div>
            <div v-if="tab === 'sanidad'" class="divide">
              <div v-for="m in monitoreos" :key="m.id" class="row group">
                <div :class="['icon-tile w-9 h-9 text-sm font-bold', C.SEVERIDAD[m.severidad].tone.soft]">{{ m.severidad }}</div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold">{{ C.plaga(m.plaga).nombre }}</p>
                  <p class="text-xs muted truncate">{{ U.fmtDate(m.fecha) }}<span v-if="m.incidencia != null"> · {{ m.incidencia }}% incidencia</span><span v-if="m.accion"> · {{ m.accion }}</span></p>
                </div>
                <button class="btn-icon btn-icon-sm opacity-60 group-hover:opacity-100" @click="S.openForm('monitoreo', m)" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
              </div>
              <ap-empty v-if="!monitoreos.length" compact icon="fa-bug" title="Sin monitoreos"></ap-empty>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="card p-3">
            <ap-mini-map v-if="p.poligono.length >= 3 || p.lat != null" :parcela="p" height="210px"></ap-mini-map>
            <a v-else :href="'#/mapa?p=' + p.id" class="flex flex-col items-center justify-center h-[210px] rounded-xl border-2 border-dashed border-ink-200 dark:border-white/10 text-center hover:border-brand-500 transition">
              <i class="fa-solid fa-draw-polygon text-2xl text-ink-300"></i>
              <p class="text-sm font-semibold mt-2">Dibujar límites</p>
              <p class="text-xs muted">Calcule el área desde el mapa satelital</p>
            </a>
          </div>

          <div class="card p-4 sm:p-5">
            <h3 class="card-title mb-4"><i class="fa-solid fa-sack-dollar text-brand-600"></i>Economía del ciclo</h3>
            <div class="space-y-2.5 text-sm">
              <div class="flex justify-between"><span class="muted">Mano de obra</span><span class="num font-medium">{{ $money(fin.mo) }}</span></div>
              <div class="flex justify-between"><span class="muted">Insumos</span><span class="num font-medium">{{ $money(fin.ins) }}</span></div>
              <div class="flex justify-between"><span class="muted">Otros</span><span class="num font-medium">{{ $money(fin.otros) }}</span></div>
              <div class="flex justify-between pt-2.5 border-t border-ink-100 dark:border-white/5 font-bold"><span>Costo total</span><span class="num">{{ $money(fin.costo) }}</span></div>
              <div class="flex justify-between"><span class="muted">{{ fin.ingreso ? 'Ingresos (' + U.fmtNum(fin.t) + ' t)' : 'Ingreso proyectado' }}</span><span class="num font-medium text-brand-700 dark:text-brand-400">{{ $money(fin.ingreso || fin.proyectado) }}</span></div>
              <div :class="['flex justify-between rounded-xl px-3 py-2.5 font-bold', fin.margenProyectado >= 0 ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300']">
                <span>Margen {{ fin.ingreso ? '' : 'proyectado' }}</span><span class="num">{{ $money(fin.margenProyectado) }}</span>
              </div>
              <p class="text-[11px] muted">Costo por tonelada: {{ $money(fin.costoT) }}. Proyección con precio de referencia {{ $money(st.settings.precioReferencia) }}/t.</p>
            </div>
          </div>

          <div class="card p-4 sm:p-5">
            <h3 class="card-title mb-4"><i class="fa-solid fa-clipboard-list text-sky-500"></i>Ficha técnica</h3>
            <dl class="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div><dt class="text-[11px] muted">Siembra</dt><dd class="font-semibold">{{ U.fmtDate(p.fechaSiembra) }}</dd></div>
              <div><dt class="text-[11px] muted">Inicio de ciclo</dt><dd class="font-semibold">{{ U.fmtDate(p.fechaInicioCiclo) }}</dd></div>
              <div><dt class="text-[11px] muted">Inducción</dt><dd class="font-semibold">{{ e.induccion ? U.fmtDate(e.induccion) : 'Pendiente' }}</dd></div>
              <div><dt class="text-[11px] muted">Ventana de cosecha</dt><dd class="font-semibold">{{ U.fmtDate(e.ventanaCosecha[0], 'short') }} – {{ U.fmtDate(e.ventanaCosecha[1], 'short') }}</dd></div>
              <div><dt class="text-[11px] muted">Peso medio fruta</dt><dd class="font-semibold">{{ U.fmtNum(prod.peso, 2) }} kg</dd></div>
              <div><dt class="text-[11px] muted">Aprovechamiento</dt><dd class="font-semibold">{{ U.fmtNum(prod.aprovechamiento) }}%</dd></div>
            </dl>
            <p v-if="p.notas" class="text-sm mt-4 p-3 rounded-xl bg-ink-50 dark:bg-white/[0.03] text-ink-600 dark:text-ink-300">{{ p.notas }}</p>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="card"><ap-empty icon="fa-circle-question" title="Parcela no encontrada" text="Es posible que haya sido eliminada."><a href="#/parcelas" class="btn btn-primary">Volver a parcelas</a></ap-empty></div>`
  };
})(window.AP = window.AP || {});
