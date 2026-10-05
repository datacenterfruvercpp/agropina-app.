/* AgroPiña Pro · Formularios (se abren con AP.store.openForm(tipo, datos)) */
(function (AP) {
  'use strict';
  const { reactive, computed, ref, watch } = Vue;
  const S = AP.store, C = AP.catalog, U = AP.utils, A = AP.agro;

  const req = (v) => v !== '' && v != null && !(typeof v === 'number' && isNaN(v));
  const parcelasOpts = () => S.state.parcelas.filter((p) => p.estado !== 'archivada').concat(S.state.parcelas.filter((p) => p.estado === 'archivada'));

  /* ------------------------------ Parcela ------------------------------ */
  const FormParcela = {
    props: { data: Object },
    setup(props) {
      const hoy = S.state.hoy;
      const editing = !!props.data.id;
      const f = reactive(Object.assign({
        nombre: '', codigo: '', variedad: 'MD-2', hectareas: '', fechaSiembra: hoy, ciclo: 1, fechaInicioCiclo: '', fechaInduccion: '',
        densidad: '', pesoFruto: '', aprovechamiento: '', color: C.COLORES_PARCELA[S.state.parcelas.length % C.COLORES_PARCELA.length], notas: ''
      }, props.data));
      if (f.fechaInduccion == null) f.fechaInduccion = '';
      ['densidad', 'pesoFruto', 'aprovechamiento'].forEach((k) => { if (f[k] == null) f[k] = ''; });
      const errors = reactive({});
      const advanced = ref(false);
      const v = computed(() => A.variedad(f.variedad));
      const draft = () => Object.assign({}, f, {
        hectareas: Number(f.hectareas) || 0,
        fechaInicioCiclo: Number(f.ciclo) > 1 ? (f.fechaInicioCiclo || f.fechaSiembra) : f.fechaSiembra,
        fechaInduccion: f.fechaInduccion || null
      });
      const preview = computed(() => (f.fechaSiembra ? { e: A.estado(draft(), S.state.hoy), prod: A.produccion(draft()) } : null));
      const save = () => {
        Object.keys(errors).forEach((k) => delete errors[k]);
        if (!String(f.nombre).trim()) errors.nombre = 'Ingrese un nombre';
        if (!(Number(f.hectareas) > 0)) errors.hectareas = 'Área mayor a 0';
        if (!f.fechaSiembra) errors.fechaSiembra = 'Requerido';
        if (Object.keys(errors).length) return;
        const p = S.saveParcela(draft());
        S.closeForm();
        if (!editing) AP.router.go('parcelas/' + p.id);
      };
      return { f, errors, advanced, v, preview, save, editing, C, U, close: S.closeForm };
    },
    template: `
      <ap-modal :title="editing ? 'Editar parcela' : 'Nueva parcela'" subtitle="Lote de producción y parámetros del ciclo" icon="fa-layer-group" size="lg" @close="close">
        <form class="grid grid-cols-2 gap-x-3 gap-y-4" @submit.prevent="save">
          <div class="col-span-2 sm:col-span-1">
            <label class="label">Nombre de la parcela *</label>
            <input v-model="f.nombre" class="input" placeholder="Ej. Bloque Norte A" autofocus>
            <p v-if="errors.nombre" class="hint !text-red-500">{{ errors.nombre }}</p>
          </div>
          <div class="col-span-2 sm:col-span-1">
            <label class="label">Código / bloque</label>
            <input v-model="f.codigo" class="input" placeholder="Ej. BN-A">
          </div>
          <div>
            <label class="label">Variedad</label>
            <select v-model="f.variedad" class="input"><option v-for="(vv, k) in C.VARIEDADES" :key="k" :value="k">{{ vv.nombre }}</option></select>
          </div>
          <div>
            <label class="label">Área (ha) *</label>
            <input v-model="f.hectareas" type="number" step="any" min="0" inputmode="decimal" class="input" placeholder="0.0">
            <p v-if="errors.hectareas" class="hint !text-red-500">{{ errors.hectareas }}</p>
          </div>
          <div>
            <label class="label">Fecha de siembra *</label>
            <input v-model="f.fechaSiembra" type="date" class="input">
          </div>
          <div>
            <label class="label">Ciclo</label>
            <select v-model.number="f.ciclo" class="input">
              <option :value="1">Planta (1.ª cosecha)</option><option :value="2">Soca 1 (2.ª cosecha)</option><option :value="3">Soca 2 (3.ª cosecha)</option>
            </select>
          </div>
          <div v-if="f.ciclo > 1">
            <label class="label">Inicio del ciclo actual</label>
            <input v-model="f.fechaInicioCiclo" type="date" class="input">
            <p class="hint">Fecha de la última cosecha</p>
          </div>
          <div :class="f.ciclo > 1 ? '' : 'col-span-2 sm:col-span-1'">
            <label class="label">Fecha de inducción floral</label>
            <input v-model="f.fechaInduccion" type="date" class="input">
            <p class="hint">Déjela vacía si aún no se ha forzado</p>
          </div>
          <div class="col-span-2">
            <label class="label">Color de identificación</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="c in C.COLORES_PARCELA" :key="c" type="button" @click="f.color = c" :style="{ background: c }" :class="['w-8 h-8 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-ink-900 transition', f.color === c ? 'ring-2 ring-ink-900 dark:ring-white scale-110' : 'hover:scale-105']" :aria-label="'Color ' + c"></button>
            </div>
          </div>

          <button type="button" class="col-span-2 flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-400" @click="advanced = !advanced">
            <i :class="['fa-solid fa-chevron-right text-xs transition', advanced ? 'rotate-90' : '']"></i> Parámetros agronómicos avanzados
          </button>
          <template v-if="advanced">
            <div>
              <label class="label">Densidad (plantas/ha)</label>
              <input v-model="f.densidad" type="number" step="100" min="0" class="input" :placeholder="U.fmtNum(v.densidad)">
            </div>
            <div>
              <label class="label">Peso medio de fruta (kg)</label>
              <input v-model="f.pesoFruto" type="number" step="0.05" min="0" class="input" :placeholder="v.pesoFruto">
            </div>
            <div>
              <label class="label">Aprovechamiento (%)</label>
              <input v-model="f.aprovechamiento" type="number" step="1" min="0" max="100" class="input" :placeholder="f.ciclo > 1 ? 80 : 90">
            </div>
            <div class="col-span-2">
              <label class="label">Notas</label>
              <textarea v-model="f.notas" rows="2" class="input" placeholder="Tipo de suelo, drenaje, observaciones…"></textarea>
            </div>
          </template>

          <div v-if="preview && preview.e" class="col-span-2 rounded-2xl p-4 bg-gradient-to-br from-brand-50 to-gold-50/60 dark:from-brand-500/10 dark:to-gold-500/5 ring-1 ring-brand-500/10">
            <p class="eyebrow mb-3 !text-brand-700 dark:!text-brand-400"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Proyección automática</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p class="muted text-xs">Fase actual</p><ap-fase :fase="preview.e.fase" short class="mt-1"></ap-fase></div>
              <div><p class="muted text-xs">Inducción</p><p class="font-bold">{{ U.fmtDate(preview.e.induccionEst, 'short') }}</p></div>
              <div><p class="muted text-xs">Cosecha estimada</p><p class="font-bold">{{ U.fmtDate(preview.e.cosechaEst, 'short') }}</p></div>
              <div><p class="muted text-xs">Producción</p><p class="font-bold num">{{ U.fmtNum(preview.prod.toneladas) }} t <span class="muted font-medium text-xs">({{ U.fmtNum(preview.prod.tHa) }} t/ha)</span></p></div>
            </div>
          </div>
          <button type="submit" class="hidden"></button>
        </form>
        <template #footer>
          <button class="btn btn-ghost" @click="close">Cancelar</button>
          <button class="btn btn-primary" @click="save"><i class="fa-solid fa-check"></i>{{ editing ? 'Guardar cambios' : 'Crear parcela' }}</button>
        </template>
      </ap-modal>`
  };

  /* ------------------------------ Labor ------------------------------ */
  const FormLabor = {
    props: { data: Object },
    setup(props) {
      const editing = !!props.data.id;
      const f = reactive(Object.assign({
        parcelaId: '', tipo: 'Fertilización', estado: 'completada', fecha: S.state.hoy, descripcion: '', responsable: '',
        jornales: '', costoManoObra: '', otrosCostos: '', insumos: []
      }, props.data));
      ['jornales', 'costoManoObra', 'otrosCostos'].forEach((k) => { if (f[k] === 0 && !editing) f[k] = ''; });
      f.insumos = (f.insumos || []).map((li) => Object.assign({ insumoId: '', dosisHa: '', cantidad: '' }, li, { dosisHa: li.dosisHa == null ? '' : li.dosisHa }));
      const seleccion = ref(f.parcelaId ? [f.parcelaId] : []);
      const errors = reactive({});
      const parcelas = computed(parcelasOpts);
      const haTotal = computed(() => U.sum(seleccion.value, (id) => { const p = S.parcela(id); return p ? p.hectareas : 0; }));
      const tipoInfo = computed(() => C.labor(f.tipo));
      const insumos = computed(() => S.state.insumos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)));
      const toggle = (id) => {
        if (editing) { seleccion.value = [id]; return; }
        const i = seleccion.value.indexOf(id);
        if (i >= 0) seleccion.value.splice(i, 1); else seleccion.value.push(id);
      };
      const recalc = (li) => { if (li.dosisHa !== '' && li.dosisHa != null) li.cantidad = U.round(Number(li.dosisHa) * haTotal.value, 2); };
      watch(haTotal, () => f.insumos.forEach(recalc));
      const addLine = () => f.insumos.push({ insumoId: '', dosisHa: '', cantidad: '' });
      const ins = (id) => S.insumo(id);
      const costoLinea = (li) => (Number(li.cantidad) || 0) * (li.costoUnitario != null && li.costoUnitario !== '' ? Number(li.costoUnitario) : (ins(li.insumoId) ? ins(li.insumoId).costoUnitario : 0));
      const costoInsumos = computed(() => U.sum(f.insumos, costoLinea));
      const total = computed(() => costoInsumos.value + (Number(f.costoManoObra) || 0) + (Number(f.otrosCostos) || 0));
      const carenciaMax = computed(() => Math.max(0, ...f.insumos.map((li) => (ins(li.insumoId) ? ins(li.insumoId).carencia : 0))));
      const futuro = computed(() => f.fecha > S.state.hoy);
      watch(() => f.fecha, (v, old) => { if (!editing && v > S.state.hoy && old <= S.state.hoy) f.estado = 'pendiente'; });
      const save = () => {
        Object.keys(errors).forEach((k) => delete errors[k]);
        if (!seleccion.value.length) errors.parcela = 'Seleccione al menos una parcela';
        if (!f.fecha) errors.fecha = 'Requerido';
        if (Object.keys(errors).length) return;
        const n = seleccion.value.length;
        const tot = haTotal.value;
        seleccion.value.forEach((id) => {
          const p = S.parcela(id);
          const share = n === 1 ? 1 : tot > 0 ? p.hectareas / tot : 1 / n;
          S.saveLabor(Object.assign({}, f, {
            id: editing ? f.id : undefined, parcelaId: id,
            jornales: U.round((Number(f.jornales) || 0) * share, 2),
            costoManoObra: U.round((Number(f.costoManoObra) || 0) * share, 2),
            otrosCostos: U.round((Number(f.otrosCostos) || 0) * share, 2),
            insumos: f.insumos.map((li) => Object.assign({}, li, { cantidad: U.round((Number(li.cantidad) || 0) * share, 3) }))
          }), { silent: n > 1 });
        });
        if (n > 1) S.toast(n + ' labores registradas (costos e insumos repartidos por área)');
        S.closeForm();
      };
      return { f, errors, editing, parcelas, seleccion, toggle, haTotal, tipoInfo, insumos, addLine, recalc, ins, costoLinea, costoInsumos, total, carenciaMax, futuro, save, C, U, S, money: AP.money, close: S.closeForm };
    },
    template: `
      <ap-modal :title="editing ? 'Editar labor' : 'Registrar labor'" subtitle="Bitácora de campo, costos y consumo de insumos" :icon="tipoInfo.icon" size="lg" @close="close">
        <div class="space-y-5">
          <div>
            <label class="label">{{ editing ? 'Parcela' : 'Parcelas (puede elegir varias)' }}</label>
            <div v-if="parcelas.length" class="flex flex-wrap gap-2">
              <button v-for="p in parcelas" :key="p.id" type="button" @click="toggle(p.id)" :class="['filter-chip', seleccion.includes(p.id) ? 'filter-chip-on' : '']">
                <span class="w-2 h-2 rounded-full" :style="{ background: p.color }"></span>{{ p.nombre }}<span class="opacity-60">{{ U.fmtNum(p.hectareas, 1) }} ha</span>
              </button>
            </div>
            <p v-else class="text-sm muted">Primero cree una parcela.</p>
            <p v-if="errors.parcela" class="hint !text-red-500">{{ errors.parcela }}</p>
            <p v-if="seleccion.length > 1" class="hint">{{ seleccion.length }} parcelas · {{ U.fmtNum(haTotal, 1) }} ha. Se creará una labor por parcela y los costos se repartirán según el área.</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2 sm:col-span-1">
              <label class="label">Tipo de labor</label>
              <select v-model="f.tipo" class="input"><option v-for="(t, k) in C.LABORES" :key="k" :value="k">{{ k }}</option></select>
            </div>
            <div>
              <label class="label">Fecha</label>
              <input v-model="f.fecha" type="date" class="input">
            </div>
            <div class="col-span-2 sm:col-span-1">
              <label class="label">Estado</label>
              <ap-seg v-model="f.estado" class="w-full" :options="[{ value: 'completada', label: 'Realizada', icon: 'fa-check' }, { value: 'pendiente', label: 'Programada', icon: 'fa-clock' }]"></ap-seg>
            </div>
            <div class="col-span-2 sm:col-span-1">
              <label class="label">Responsable / cuadrilla</label>
              <input v-model="f.responsable" class="input" placeholder="Ej. Cuadrilla 1">
            </div>
            <div class="col-span-2">
              <label class="label">Descripción</label>
              <textarea v-model="f.descripcion" rows="2" class="input" placeholder="Detalle de la labor, dosis, observaciones…"></textarea>
            </div>
          </div>

          <div class="rounded-2xl border border-ink-200/80 dark:border-white/[0.07] overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 bg-ink-50 dark:bg-white/[0.03]">
              <p class="text-sm font-bold"><i class="fa-solid fa-flask text-brand-600 mr-1.5"></i>Insumos aplicados</p>
              <button type="button" class="btn btn-soft btn-sm" @click="addLine" :disabled="!insumos.length"><i class="fa-solid fa-plus"></i>Agregar</button>
            </div>
            <div v-if="!insumos.length" class="px-4 py-4 text-sm muted">No hay insumos en el inventario. <a href="#/inventario" @click="close" class="font-semibold text-brand-600">Agréguelos aquí</a> para descontar stock y calcular costos.</div>
            <div v-else-if="!f.insumos.length" class="px-4 py-4 text-sm muted">Sin insumos. Agréguelos para descontar el inventario automáticamente y controlar los períodos de carencia.</div>
            <div v-for="(li, i) in f.insumos" :key="i" class="px-4 py-3 border-t border-ink-100 dark:border-white/5 grid grid-cols-12 gap-2 items-end">
              <div class="col-span-12 sm:col-span-5">
                <label class="label">Producto</label>
                <select v-model="li.insumoId" class="input" @change="li.costoUnitario = null">
                  <option value="">Seleccionar…</option>
                  <option v-for="x in insumos" :key="x.id" :value="x.id">{{ x.nombre }} · {{ U.fmtNum(x.stock, 1) }} {{ x.unidad }}</option>
                </select>
              </div>
              <div class="col-span-5 sm:col-span-3">
                <label class="label">Dosis / ha</label>
                <input v-model="li.dosisHa" @input="recalc(li)" type="number" step="any" min="0" class="input" placeholder="0">
              </div>
              <div class="col-span-5 sm:col-span-3">
                <label class="label">Total {{ ins(li.insumoId) ? '(' + ins(li.insumoId).unidad + ')' : '' }}</label>
                <input v-model="li.cantidad" type="number" step="any" min="0" class="input" placeholder="0">
              </div>
              <div class="col-span-2 sm:col-span-1 flex justify-end">
                <button type="button" class="btn-icon text-red-500" @click="f.insumos.splice(i, 1)" aria-label="Quitar"><i class="fa-solid fa-trash-can"></i></button>
              </div>
              <div v-if="ins(li.insumoId)" class="col-span-12 flex flex-wrap gap-x-4 gap-y-1 text-[11px] muted">
                <span>Subtotal: <b class="text-ink-700 dark:text-ink-200">{{ money(costoLinea(li)) }}</b></span>
                <span :class="ins(li.insumoId).stock < Number(li.cantidad) ? 'text-red-500 font-semibold' : ''">Stock: {{ U.fmtNum(ins(li.insumoId).stock, 2) }} {{ ins(li.insumoId).unidad }}</span>
                <span v-if="ins(li.insumoId).carencia" class="text-amber-600 font-semibold"><i class="fa-solid fa-shield-halved"></i> Carencia {{ ins(li.insumoId).carencia }} días</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div><label class="label">Jornales</label><input v-model="f.jornales" type="number" step="any" min="0" class="input" placeholder="0"></div>
            <div><label class="label">Mano de obra ({{ S.state.settings.moneda }})</label><input v-model="f.costoManoObra" type="number" step="any" min="0" class="input" placeholder="0"></div>
            <div><label class="label">Otros costos</label><input v-model="f.otrosCostos" type="number" step="any" min="0" class="input" placeholder="0"></div>
          </div>

          <div v-if="carenciaMax && f.estado === 'completada'" class="flex gap-3 items-start rounded-xl p-3 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 text-sm">
            <i class="fa-solid fa-shield-halved mt-0.5"></i>
            <span>Esta aplicación activa un período de carencia de <b>{{ carenciaMax }} días</b>: no se podrá cosechar antes del <b>{{ U.fmtDate(U.addDays(f.fecha, carenciaMax)) }}</b>.</span>
          </div>
          <div v-if="futuro && f.estado === 'completada'" class="flex gap-3 items-start rounded-xl p-3 bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300 text-sm">
            <i class="fa-solid fa-circle-info mt-0.5"></i><span>La fecha es futura. ¿Desea marcarla como <button class="underline font-semibold" @click="f.estado = 'pendiente'">programada</button>?</span>
          </div>
        </div>
        <template #footer>
          <div class="mr-auto text-sm"><span class="muted">Costo total</span> <b class="num text-base text-ink-950 dark:text-white">{{ money(total) }}</b></div>
          <button class="btn btn-ghost" @click="close">Cancelar</button>
          <button class="btn btn-primary" @click="save"><i class="fa-solid fa-check"></i>{{ editing ? 'Guardar' : f.estado === 'pendiente' ? 'Programar' : 'Registrar' }}</button>
        </template>
      </ap-modal>`
  };

  /* ------------------------------ Cosecha ------------------------------ */
  const FormCosecha = {
    props: { data: Object },
    setup(props) {
      const editing = !!props.data.id;
      const f = reactive(Object.assign({
        parcelaId: '', fecha: S.state.hoy, toneladas: '', cajas: '', exportable: '', brix: '', precio: S.state.settings.precioReferencia || '',
        destino: 'Exportación', comprador: '', notas: '', cierraCiclo: false
      }, props.data));
      ['cajas', 'exportable', 'brix'].forEach((k) => { if (f[k] == null) f[k] = ''; });
      const errors = reactive({});
      const parcelas = computed(parcelasOpts);
      const p = computed(() => S.parcela(f.parcelaId));
      const carencia = computed(() => { const c = S.carencias.value[f.parcelaId]; return c && f.fecha < c.hasta ? c : null; });
      const estimado = computed(() => {
        if (!p.value) return null;
        const prod = S.produccion.value[p.value.id];
        const cosechado = U.sum(S.state.cosechas.filter((c) => c.parcelaId === p.value.id && (c.ciclo != null ? c.ciclo === p.value.ciclo : c.fecha >= p.value.fechaInicioCiclo) && c.id !== f.id), (c) => c.toneladas);
        return { total: prod.toneladas, cosechado, restante: Math.max(0, prod.toneladas - cosechado) };
      });
      const ingreso = computed(() => (Number(f.toneladas) || 0) * (Number(f.precio) || 0));
      const desdeCajas = () => { if (Number(f.cajas) > 0) f.toneladas = U.round((Number(f.cajas) * C.KG_POR_CAJA) / 1000, 2); };
      const save = () => {
        Object.keys(errors).forEach((k) => delete errors[k]);
        if (!f.parcelaId) errors.parcelaId = 'Seleccione la parcela';
        if (!(Number(f.toneladas) > 0)) errors.toneladas = 'Ingrese las toneladas';
        if (Object.keys(errors).length) return;
        S.saveCosecha(Object.assign({}, f));
        S.closeForm();
      };
      return { f, errors, editing, parcelas, p, carencia, estimado, ingreso, desdeCajas, save, C, U, money: AP.money, close: S.closeForm };
    },
    template: `
      <ap-modal :title="editing ? 'Editar cosecha' : 'Registrar cosecha'" subtitle="Producción, calidad y comercialización" icon="fa-basket-shopping" size="lg" @close="close">
        <div class="grid grid-cols-2 gap-x-3 gap-y-4">
          <div class="col-span-2 sm:col-span-1">
            <label class="label">Parcela *</label>
            <select v-model="f.parcelaId" class="input"><option value="">Seleccionar…</option><option v-for="x in parcelas" :key="x.id" :value="x.id">{{ x.nombre }}</option></select>
            <p v-if="errors.parcelaId" class="hint !text-red-500">{{ errors.parcelaId }}</p>
          </div>
          <div class="col-span-2 sm:col-span-1"><label class="label">Fecha</label><input v-model="f.fecha" type="date" class="input"></div>
          <div v-if="carencia" class="col-span-2 flex gap-3 items-start rounded-xl p-3 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300 text-sm">
            <i class="fa-solid fa-shield-halved mt-0.5"></i>
            <span><b>Período de carencia activo</b> hasta el {{ U.fmtDate(carencia.hasta) }} por {{ carencia.producto }}. Cosechar antes incumple las buenas prácticas agrícolas.</span>
          </div>
          <div v-if="estimado" class="col-span-2 grid grid-cols-3 gap-2 text-center rounded-xl p-3 bg-ink-50 dark:bg-white/[0.03] text-xs">
            <div><p class="muted">Estimado ciclo</p><p class="font-bold text-sm num">{{ U.fmtNum(estimado.total) }} t</p></div>
            <div><p class="muted">Ya cosechado</p><p class="font-bold text-sm num">{{ U.fmtNum(estimado.cosechado) }} t</p></div>
            <div><p class="muted">Restante</p><p class="font-bold text-sm num text-brand-600">{{ U.fmtNum(estimado.restante) }} t</p></div>
          </div>
          <div>
            <label class="label">Toneladas *</label>
            <input v-model="f.toneladas" type="number" step="any" min="0" class="input" placeholder="0.0">
            <p v-if="errors.toneladas" class="hint !text-red-500">{{ errors.toneladas }}</p>
          </div>
          <div>
            <label class="label">Cajas</label>
            <div class="flex gap-2"><input v-model="f.cajas" type="number" step="1" min="0" class="input" placeholder="0">
            <button type="button" class="btn btn-soft px-3" title="Calcular toneladas desde cajas (12 kg)" @click="desdeCajas"><i class="fa-solid fa-calculator"></i></button></div>
          </div>
          <div><label class="label">Exportable (%)</label><input v-model="f.exportable" type="number" min="0" max="100" class="input" placeholder="0"></div>
          <div><label class="label">°Brix promedio</label><input v-model="f.brix" type="number" step="0.1" min="0" class="input" placeholder="0.0"></div>
          <div><label class="label">Destino</label><select v-model="f.destino" class="input"><option v-for="(t, k) in C.DESTINOS" :key="k" :value="k">{{ k }}</option></select></div>
          <div><label class="label">Precio por tonelada</label><input v-model="f.precio" type="number" step="any" min="0" class="input" placeholder="0"></div>
          <div class="col-span-2"><label class="label">Comprador / lote de despacho</label><input v-model="f.comprador" class="input" placeholder="Ej. Exportadora del Caribe · Lote 2291"></div>
          <div class="col-span-2"><label class="label">Notas</label><textarea v-model="f.notas" rows="2" class="input" placeholder="Calibres, defectos, observaciones…"></textarea></div>
          <label v-if="!f.cicloCerrado" class="col-span-2 flex items-start gap-3 p-3 rounded-xl border border-ink-200 dark:border-white/10 cursor-pointer hover:bg-ink-50 dark:hover:bg-white/[0.03]">
            <input v-model="f.cierraCiclo" type="checkbox" class="mt-1 w-4 h-4 accent-emerald-600">
            <span class="text-sm"><b>Último pase: cerrar el ciclo</b><br><span class="muted">La parcela pasa a <b>{{ p ? 'Soca ' + p.ciclo : 'soca' }}</b> y el ciclo se reinicia desde esta fecha.</span></span>
          </label>
        </div>
        <template #footer>
          <div class="mr-auto text-sm"><span class="muted">Ingreso</span> <b class="num text-base text-ink-950 dark:text-white">{{ money(ingreso) }}</b></div>
          <button class="btn btn-ghost" @click="close">Cancelar</button>
          <button class="btn btn-primary" @click="save"><i class="fa-solid fa-check"></i>Guardar cosecha</button>
        </template>
      </ap-modal>`
  };

  /* ------------------------------ Monitoreo ------------------------------ */
  const FormMonitoreo = {
    props: { data: Object },
    setup(props) {
      const editing = !!props.data.id;
      const f = reactive(Object.assign({ parcelaId: '', fecha: S.state.hoy, plaga: 'cochinilla', severidad: 2, incidencia: '', muestras: '', accion: '', notas: '' }, props.data));
      ['incidencia', 'muestras'].forEach((k) => { if (f[k] == null) f[k] = ''; });
      const errors = reactive({});
      const parcelas = computed(parcelasOpts);
      const grupos = computed(() => U.groupBy(C.PLAGAS, (p) => p.tipo));
      const plaga = computed(() => C.plaga(f.plaga));
      const save = () => {
        if (!f.parcelaId) { errors.parcelaId = 'Seleccione la parcela'; return; }
        S.saveMonitoreo(Object.assign({}, f));
        S.closeForm();
      };
      return { f, errors, editing, parcelas, grupos, plaga, save, C, close: S.closeForm };
    },
    template: `
      <ap-modal :title="editing ? 'Editar monitoreo' : 'Monitoreo fitosanitario'" subtitle="Plagas, enfermedades y severidad en campo" icon="fa-bug" @close="close">
        <div class="grid grid-cols-2 gap-x-3 gap-y-4">
          <div class="col-span-2 sm:col-span-1">
            <label class="label">Parcela *</label>
            <select v-model="f.parcelaId" class="input"><option value="">Seleccionar…</option><option v-for="x in parcelas" :key="x.id" :value="x.id">{{ x.nombre }}</option></select>
            <p v-if="errors.parcelaId" class="hint !text-red-500">{{ errors.parcelaId }}</p>
          </div>
          <div class="col-span-2 sm:col-span-1"><label class="label">Fecha</label><input v-model="f.fecha" type="date" class="input"></div>
          <div class="col-span-2">
            <label class="label">Plaga / enfermedad</label>
            <select v-model="f.plaga" class="input">
              <optgroup v-for="(items, g) in grupos" :key="g" :label="g"><option v-for="x in items" :key="x.key" :value="x.key">{{ x.nombre }}</option></optgroup>
            </select>
            <p v-if="plaga.cientifico" class="hint italic">{{ plaga.cientifico }}</p>
          </div>
          <div class="col-span-2">
            <label class="label">Severidad</label>
            <div class="grid grid-cols-5 gap-2">
              <button v-for="n in 5" :key="n" type="button" @click="f.severidad = n" :class="['rounded-xl py-2 text-xs font-bold border transition', f.severidad === n ? C.SEVERIDAD[n].tone.chip + ' border-transparent ring-2 ring-offset-1 ring-offset-white dark:ring-offset-ink-900 ' + C.SEVERIDAD[n].tone.ring : 'border-ink-200 dark:border-white/10 text-ink-500']">
                <span class="block text-base">{{ n }}</span>{{ C.SEVERIDAD[n].label }}
              </button>
            </div>
          </div>
          <div><label class="label">Incidencia (%)</label><input v-model="f.incidencia" type="number" min="0" max="100" step="any" class="input" placeholder="0"></div>
          <div><label class="label">Plantas muestreadas</label><input v-model="f.muestras" type="number" min="0" class="input" placeholder="100"></div>
          <div class="col-span-2"><label class="label">Acción recomendada</label><input v-model="f.accion" class="input" placeholder="Ej. Aplicación focalizada, monitoreo semanal…"></div>
          <div class="col-span-2"><label class="label">Observaciones</label><textarea v-model="f.notas" rows="2" class="input" placeholder="Ubicación de focos, síntomas…"></textarea></div>
        </div>
        <template #footer>
          <button class="btn btn-ghost" @click="close">Cancelar</button>
          <button class="btn btn-primary" @click="save"><i class="fa-solid fa-check"></i>Guardar</button>
        </template>
      </ap-modal>`
  };

  /* ------------------------------ Insumo ------------------------------ */
  const FormInsumo = {
    props: { data: Object },
    setup(props) {
      const editing = !!props.data.id;
      const f = reactive(Object.assign({ nombre: '', categoria: 'Fertilizante', unidad: 'kg', stock: '', stockMinimo: '', costoUnitario: '', carencia: '', ingredienteActivo: '', proveedor: '', notas: '' }, props.data));
      const errors = reactive({});
      const save = () => {
        if (!String(f.nombre).trim()) { errors.nombre = 'Ingrese el nombre'; return; }
        S.saveInsumo(Object.assign({}, f));
        S.closeForm();
      };
      return { f, errors, editing, save, C, S, close: S.closeForm };
    },
    template: `
      <ap-modal :title="editing ? 'Editar insumo' : 'Nuevo insumo'" subtitle="Producto del inventario de la finca" icon="fa-box" @close="close">
        <div class="grid grid-cols-2 gap-x-3 gap-y-4">
          <div class="col-span-2"><label class="label">Nombre comercial *</label><input v-model="f.nombre" class="input" placeholder="Ej. Urea 46%">
            <p v-if="errors.nombre" class="hint !text-red-500">{{ errors.nombre }}</p></div>
          <div><label class="label">Categoría</label><select v-model="f.categoria" class="input"><option v-for="(t, k) in C.CATEGORIAS_INSUMO" :key="k" :value="k">{{ k }}</option></select></div>
          <div><label class="label">Unidad</label><select v-model="f.unidad" class="input"><option v-for="u in C.UNIDADES" :key="u">{{ u }}</option></select></div>
          <div><label class="label">{{ editing ? 'Stock actual' : 'Stock inicial' }}</label><input v-model="f.stock" :disabled="editing" type="number" step="any" class="input disabled:opacity-60" placeholder="0">
            <p v-if="editing" class="hint">Use «Movimiento» para entradas o ajustes</p></div>
          <div><label class="label">Stock mínimo</label><input v-model="f.stockMinimo" type="number" step="any" min="0" class="input" placeholder="0"></div>
          <div><label class="label">Costo unitario ({{ S.state.settings.moneda }})</label><input v-model="f.costoUnitario" type="number" step="any" min="0" class="input" placeholder="0.00"></div>
          <div><label class="label">Carencia (días)</label><input v-model="f.carencia" type="number" step="1" min="0" class="input" placeholder="0">
            <p class="hint">Intervalo antes de cosecha (PHI)</p></div>
          <div class="col-span-2 sm:col-span-1"><label class="label">Ingrediente activo</label><input v-model="f.ingredienteActivo" class="input" placeholder="Ej. Etefón"></div>
          <div class="col-span-2 sm:col-span-1"><label class="label">Proveedor</label><input v-model="f.proveedor" class="input"></div>
        </div>
        <template #footer>
          <button class="btn btn-ghost" @click="close">Cancelar</button>
          <button class="btn btn-primary" @click="save"><i class="fa-solid fa-check"></i>Guardar</button>
        </template>
      </ap-modal>`
  };

  /* ------------------------------ Movimiento de inventario ------------------------------ */
  const FormMovimiento = {
    props: { data: Object },
    setup(props) {
      const f = reactive(Object.assign({ insumoId: '', tipo: 'entrada', cantidad: '', costoUnitario: '', fecha: S.state.hoy, nota: '' }, props.data));
      const i = computed(() => S.insumo(f.insumoId));
      if (i.value && f.costoUnitario === '') f.costoUnitario = i.value.costoUnitario;
      watch(() => f.tipo, (t) => { if (t === 'ajuste' && i.value) f.cantidad = i.value.stock; else if (t === 'entrada') f.cantidad = ''; });
      const err = ref('');
      const save = () => {
        if (!i.value) { err.value = 'Seleccione el insumo'; return; }
        if (f.cantidad === '' || (f.tipo === 'entrada' && !(Number(f.cantidad) > 0))) { err.value = 'Ingrese una cantidad válida'; return; }
        S.movimientoInsumo(Object.assign({}, f));
        S.closeForm();
      };
      return { f, i, err, save, S, U, close: S.closeForm };
    },
    template: `
      <ap-modal title="Movimiento de inventario" :subtitle="i ? i.nombre : 'Entrada por compra o ajuste por conteo'" icon="fa-right-left" size="sm" @close="close">
        <div class="space-y-4">
          <div v-if="!data.insumoId"><label class="label">Insumo</label>
            <select v-model="f.insumoId" class="input"><option value="">Seleccionar…</option><option v-for="x in S.state.insumos" :key="x.id" :value="x.id">{{ x.nombre }}</option></select></div>
          <ap-seg v-model="f.tipo" :options="[{ value: 'entrada', label: 'Entrada / compra', icon: 'fa-arrow-down' }, { value: 'ajuste', label: 'Ajuste por conteo', icon: 'fa-scale-balanced' }]"></ap-seg>
          <div class="grid grid-cols-2 gap-3">
            <div :class="f.tipo === 'ajuste' ? 'col-span-2' : ''"><label class="label">{{ f.tipo === 'ajuste' ? 'Stock contado' : 'Cantidad' }} {{ i ? '(' + i.unidad + ')' : '' }}</label><input v-model="f.cantidad" type="number" step="any" class="input" placeholder="0"></div>
            <div v-if="f.tipo === 'entrada'"><label class="label">Costo unitario</label><input v-model="f.costoUnitario" type="number" step="any" min="0" class="input"></div>
            <div><label class="label">Fecha</label><input v-model="f.fecha" type="date" class="input"></div>
            <div><label class="label">Nota</label><input v-model="f.nota" class="input" placeholder="Factura, proveedor…"></div>
          </div>
          <p v-if="i" class="text-xs muted">Stock actual: <b>{{ U.fmtNum(i.stock, 2) }} {{ i.unidad }}</b>. Las entradas recalculan el costo promedio ponderado.</p>
          <p v-if="err" class="text-xs text-red-500">{{ err }}</p>
        </div>
        <template #footer>
          <button class="btn btn-ghost" @click="close">Cancelar</button>
          <button class="btn btn-primary" @click="save"><i class="fa-solid fa-check"></i>Registrar</button>
        </template>
      </ap-modal>`
  };

  const FormHost = {
    setup() { return { ui: S.state.ui }; },
    template: `<component v-if="ui.form" :is="'form-' + ui.form.type" :key="ui.form.key" :data="ui.form.data"></component>`
  };

  AP.forms = { FormParcela, FormLabor, FormCosecha, FormMonitoreo, FormInsumo, FormMovimiento, FormHost };
})(window.AP = window.AP || {});
