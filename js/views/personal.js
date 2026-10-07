/* AgroPiña Enterprise · Vista: Personal y planilla de jornales */
(function (AP) {
  'use strict';
  const { ref, computed } = Vue;
  const S = AP.store, U = AP.utils, B = AP.negocio;

  AP.views = AP.views || {};
  AP.views.personal = {
    props: { query: Object },
    setup(props) {
      const st = S.state;
      const tab = ref(props.query && props.query.tab === 'trabajadores' ? 'trabajadores' : 'planilla');
      const tipo = ref('quincena');
      const ref0 = ref(st.hoy);
      const periodo = computed(() => B.periodo(tipo.value, ref0.value));
      const mover = (n) => {
        const p = periodo.value;
        ref0.value = n < 0 ? U.addDays(p.desde, -1) : U.addDays(p.hasta, 1);
      };
      const planilla = computed(() => B.planilla(st.labores, st.trabajadores, periodo.value.desde, periodo.value.hasta));
      const colsPlan = [
        { key: 'nombre', label: 'Trabajador', cls: 'font-semibold' },
        { key: 'cuadrilla', label: 'Cuadrilla' },
        { key: 'dias', label: 'Días trabajados', align: 'right' },
        { key: 'labores', label: 'Labores', align: 'right' },
        { key: 'jornales', label: 'Jornales', align: 'right', sum: true, format: (v) => U.fmtNum(v, 2) },
        { key: 'tarifa', label: 'Tarifa media', align: 'right', value: (r) => (r.jornales ? r.monto / r.jornales : 0), format: (v) => AP.money(v) },
        { key: 'monto', label: 'Monto a pagar', align: 'right', sum: true, format: (v) => AP.money(v) }
      ];
      const trabajadores = computed(() => st.trabajadores.map((t) => {
        const ls = st.labores.filter((l) => l.estado === 'completada' && l.trabajadores.some((x) => x.trabajadorId === t.id));
        const j = U.sum(ls, (l) => U.sum(l.trabajadores.filter((x) => x.trabajadorId === t.id), (x) => x.jornales));
        const ult = ls.reduce((m, l) => (l.fecha > m ? l.fecha : m), '');
        return Object.assign({}, t, { jornalesTotal: j, ultima: ult });
      }));
      const colsTrab = [
        { key: 'nombre', label: 'Nombre', cls: 'font-semibold' },
        { key: 'identificacion', label: 'Identificación' },
        { key: 'puesto', label: 'Puesto' },
        { key: 'cuadrilla', label: 'Cuadrilla' },
        { key: 'tarifaJornal', label: 'Tarifa/jornal', align: 'right', format: (v) => AP.money(v) },
        { key: 'telefono', label: 'Teléfono', hidden: true },
        { key: 'fechaIngreso', label: 'Ingreso', format: (v) => (v ? U.fmtDate(v) : '—'), hidden: true },
        { key: 'jornalesTotal', label: 'Jornales acumulados', align: 'right', format: (v) => U.fmtNum(v, 1) },
        { key: 'ultima', label: 'Última labor', format: (v) => (v ? U.fmtRel(v, st.hoy) : '—') },
        { key: 'activo', label: 'Estado', value: (r) => (r.activo ? 'Activo' : 'Inactivo') }
      ];
      const porCuadrilla = computed(() => {
        const g = U.groupBy(planilla.value.filas, (f) => f.cuadrilla || 'Sin cuadrilla');
        return Object.keys(g).sort().map((k) => ({ cuadrilla: k, personas: g[k].length, jornales: U.sum(g[k], (f) => f.jornales), monto: U.sum(g[k], (f) => f.monto) }));
      });
      const chart = (t) => {
        const semanas = [];
        for (let i = 11; i >= 0; i--) semanas.push(B.periodo('semana', U.addDays(st.hoy, -i * 7)));
        return {
          type: 'bar',
          data: {
            labels: semanas.map((s) => U.fmtDate(s.desde, 'short')),
            datasets: [{ label: 'Costo de mano de obra', data: semanas.map((s) => U.round(B.planilla(st.labores, st.trabajadores, s.desde, s.hasta).totalMonto)), backgroundColor: t.blue, maxBarThickness: 26 }]
          },
          options: AP.charts.options(t, { plugins: { tooltip: { callbacks: { label: (c) => ' ' + AP.money(c.raw) } } }, scales: { y: { ticks: { callback: (v) => AP.money(v, true) } } } })
        };
      };
      const activos = computed(() => st.trabajadores.filter((t) => t.activo).length);
      return { st, tab, tipo, periodo, mover, planilla, colsPlan, trabajadores, colsTrab, porCuadrilla, chart, activos, S, U };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Recursos humanos" title="Personal y planilla" subtitle="Trabajadores, cuadrillas, tarifas y planilla de jornales calculada desde las labores realizadas.">
        <button class="btn btn-primary" @click="S.openForm('trabajador')"><i class="fa-solid fa-user-plus"></i>Nuevo trabajador</button>
        <template #facets>
          <ap-facet label="Personal activo" :value="activos + ' de ' + st.trabajadores.length"></ap-facet>
          <ap-facet label="Planilla del período" :value="$money(planilla.totalMonto)"></ap-facet>
          <ap-facet label="Jornales del período" :value="U.fmtNum(planilla.totalJornales, 1)"></ap-facet>
          <ap-facet label="Mano de obra sin asignar" :value="$money(planilla.sinAsignar)" :st="planilla.sinAsignar > 0 ? '!text-amber-600' : ''"></ap-facet>
        </template>
        <template #tabs>
          <ap-tab :active="tab === 'planilla'" @click="tab = 'planilla'">Planilla de jornales</ap-tab>
          <ap-tab :active="tab === 'trabajadores'" :count="st.trabajadores.length" @click="tab = 'trabajadores'">Trabajadores</ap-tab>
        </template>
      </ap-page-header>

      <div v-if="tab === 'planilla'" class="space-y-4">
        <div class="card px-4 py-3 flex flex-wrap items-center gap-3">
          <ap-seg v-model="tipo" :options="[{ value: 'semana', label: 'Semana' }, { value: 'quincena', label: 'Quincena' }, { value: 'mes', label: 'Mes' }]"></ap-seg>
          <div class="flex items-center gap-1">
            <button class="btn-icon btn-icon-sm" @click="mover(-1)" aria-label="Período anterior"><i class="fa-solid fa-chevron-left"></i></button>
            <span class="text-[13.5px] font-semibold px-2 num">{{ U.fmtDate(periodo.desde) }} – {{ U.fmtDate(periodo.hasta) }}</span>
            <button class="btn-icon btn-icon-sm" @click="mover(1)" aria-label="Período siguiente"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
          <span class="text-[12px] muted ml-auto">Se calcula con las labores <b>realizadas</b> que tienen personal asignado.</span>
        </div>
        <div v-if="planilla.sinAsignar > 0" class="strip st-warn"><i class="fa-solid fa-triangle-exclamation mt-0.5"></i>
          <span>{{ $money(planilla.sinAsignar) }} ({{ U.fmtNum(planilla.sinAsignarJornales, 1) }} jornales) de mano de obra en este período no tienen trabajadores asignados y no aparecen en la planilla. Asigne personal en cada orden de trabajo.</span>
        </div>
        <div class="grid xl:grid-cols-3 gap-4">
          <div class="card overflow-hidden xl:col-span-2">
            <ap-data-table id="planilla" title="Planilla" :export-name="'Planilla_' + periodo.desde + '_' + periodo.hasta" :columns="colsPlan" :rows="planilla.filas" row-key="trabajadorId" sort-key="monto" sort-dir="desc"
              :empty="{ icon: 'fa-people-group', title: 'Sin jornales en el período', text: 'No hay labores realizadas con personal asignado en estas fechas.' }"></ap-data-table>
          </div>
          <div class="space-y-4">
            <div class="card">
              <div class="card-head"><h3 class="card-title">Por cuadrilla</h3></div>
              <table class="table">
                <thead><tr><th>Cuadrilla</th><th class="!text-right">Personas</th><th class="!text-right">Jornales</th><th class="!text-right">Monto</th></tr></thead>
                <tbody>
                  <tr v-for="c in porCuadrilla" :key="c.cuadrilla"><td class="font-medium">{{ c.cuadrilla }}</td><td class="text-right num">{{ c.personas }}</td><td class="text-right num">{{ U.fmtNum(c.jornales, 1) }}</td><td class="text-right num font-semibold">{{ $money(c.monto) }}</td></tr>
                  <tr v-if="!porCuadrilla.length"><td colspan="4" class="text-center muted py-6">Sin datos en el período</td></tr>
                </tbody>
              </table>
            </div>
            <div class="card">
              <div class="card-head"><h3 class="card-title">Costo semanal · 12 semanas</h3></div>
              <div class="card-body"><ap-chart :config="chart" height="200px"></ap-chart></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="card overflow-hidden">
        <ap-data-table id="trabajadores" title="Trabajadores" export-name="Trabajadores" :columns="colsTrab" :rows="trabajadores" sort-key="nombre" clickable @open="(r) => S.openForm('trabajador', st.trabajadores.find((t) => t.id === r.id))"
          :empty="{ icon: 'fa-user', title: 'Sin personal registrado', text: 'Registre a sus trabajadores para asignarlos a labores y calcular la planilla.' }">
          <template #cell-activo="{ row }"><ap-status :st="row.activo ? 'st-ok' : 'st-neutral'" :label="row.activo ? 'Activo' : 'Inactivo'" dot></ap-status></template>
          <template #rowActions="{ row }"><button class="btn-icon btn-icon-sm hover:!text-red-600" @click="S.deleteTrabajador(row.id)" aria-label="Eliminar"><i class="fa-solid fa-trash-can"></i></button></template>
        </ap-data-table>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
