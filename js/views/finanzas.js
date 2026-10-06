/* AgroPiña Pro · Vistas: Finanzas y Ajustes + exportación a Excel */
(function (AP) {
  'use strict';
  const { ref, computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog, W = AP.weather;

  /* ------------------------------ Excel ------------------------------ */
  AP.reportes = {
    async excel() {
      try {
        if (!window.XLSX) await U.loadScript('vendor/xlsx.full.min.js');
        const st = S.state;
        const mon = st.settings.moneda;
        const P = (id) => S.parcelaNombre(id);
        const wb = XLSX.utils.book_new();
        const add = (name, rows, widths) => {
          const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Sin registros' }]);
          if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
          XLSX.utils.book_append_sheet(wb, ws, name);
        };
        const r = S.resumen.value;
        add('Resumen', [
          { Indicador: 'Finca', Valor: st.settings.finca },
          { Indicador: 'Fecha del reporte', Valor: st.hoy },
          { Indicador: 'Parcelas activas', Valor: r.parcelas },
          { Indicador: 'Hectáreas activas', Valor: U.round(r.hectareas, 2) },
          { Indicador: 'Plantas en campo', Valor: Math.round(r.plantas) },
          { Indicador: 'Producción estimada próximos 90 días (t)', Valor: U.round(r.produccion90, 1) },
          { Indicador: 'Costo acumulado (' + mon + ')', Valor: U.round(r.costoTotal, 2) },
          { Indicador: 'Ingresos registrados (' + mon + ')', Valor: U.round(r.ingresoTotal, 2) },
          { Indicador: 'Valor de inventario (' + mon + ')', Valor: U.round(r.valorInventario, 2) }
        ], [44, 24]);
        add('Parcelas', st.parcelas.map((p) => {
          const e = S.estados.value[p.id], pr = S.produccion.value[p.id], c = S.costos.value[p.id] || {}, i = S.ingresos.value[p.id] || {};
          return {
            Código: p.codigo, Parcela: p.nombre, Variedad: p.variedad, Ciclo: e.etiquetaCiclo, 'Área (ha)': p.hectareas, Plantas: Math.round(pr.plantas),
            Siembra: p.fechaSiembra, 'Inicio ciclo': p.fechaInicioCiclo, Inducción: p.fechaInduccion || '', 'Inducción estimada': e.induccionEst,
            'Cosecha estimada': e.cosechaEst, 'Días de ciclo': e.dias, Fase: C.FASES[e.fase].label, 'Producción estimada (t)': U.round(pr.toneladas, 1),
            't/ha estimadas': U.round(pr.tHa, 1), ['Costo total (' + mon + ')']: U.round(c.total || 0, 2), 'Toneladas cosechadas': U.round(i.toneladas || 0, 1),
            ['Ingresos (' + mon + ')']: U.round(i.ingreso || 0, 2), Estado: p.estado
          };
        }));
        add('Labores', st.labores.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((l) => ({
          Fecha: l.fecha, Parcela: P(l.parcelaId), Tipo: l.tipo, Estado: l.estado === 'pendiente' ? 'Programada' : 'Realizada', Descripción: l.descripcion,
          Responsable: l.responsable, Jornales: l.jornales, Insumos: l.insumos.map((x) => x.nombre + ' ' + x.cantidad + ' ' + x.unidad).join('; '),
          ['Mano de obra (' + mon + ')']: l.costoManoObra, ['Insumos (' + mon + ')']: l.costoInsumos, ['Otros (' + mon + ')']: l.otrosCostos, ['Total (' + mon + ')']: l.costoTotal
        })));
        const apps = [];
        st.labores.filter((l) => l.estado === 'completada').forEach((l) => l.insumos.forEach((x) => apps.push({
          Fecha: l.fecha, Parcela: P(l.parcelaId), Labor: l.tipo, Producto: x.nombre, 'Dosis/ha': x.dosisHa, Cantidad: x.cantidad, Unidad: x.unidad,
          'Carencia (días)': x.carencia || 0, 'Cosechar desde': x.carencia ? U.addDays(l.fecha, x.carencia) : '', Responsable: l.responsable
        })));
        add('Trazabilidad aplicaciones', apps);
        add('Cosechas', st.cosechas.map((c) => ({ Fecha: c.fecha, Parcela: P(c.parcelaId), Ciclo: c.ciclo, Toneladas: c.toneladas, Cajas: c.cajas, 'Exportable %': c.exportable, '°Brix': c.brix, Destino: c.destino, Comprador: c.comprador, ['Precio/t (' + mon + ')']: c.precio, ['Ingreso (' + mon + ')']: U.round(c.toneladas * c.precio, 2) })));
        add('Monitoreo', st.monitoreos.map((m) => ({ Fecha: m.fecha, Parcela: P(m.parcelaId), Problema: C.plaga(m.plaga).nombre, Científico: C.plaga(m.plaga).cientifico, Severidad: m.severidad, 'Incidencia %': m.incidencia, Muestras: m.muestras, Acción: m.accion, Notas: m.notas })));
        add('Inventario', st.insumos.map((i) => ({ Producto: i.nombre, Categoría: i.categoria, 'Ingrediente activo': i.ingredienteActivo, Unidad: i.unidad, Stock: i.stock, 'Stock mínimo': i.stockMinimo, ['Costo unitario (' + mon + ')']: i.costoUnitario, ['Valor (' + mon + ')']: U.round(Math.max(0, i.stock) * i.costoUnitario, 2), 'Carencia (días)': i.carencia, Proveedor: i.proveedor })));
        add('Movimientos', st.movimientos.map((m) => ({ Fecha: m.fecha, Insumo: S.insumo(m.insumoId) ? S.insumo(m.insumoId).nombre : '', Tipo: m.tipo, Cantidad: m.cantidad, 'Costo unitario': m.costoUnitario, Nota: m.nota })));
        XLSX.writeFile(wb, 'AgroPina_Reporte_' + (st.settings.finca.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Finca') + '_' + st.hoy + '.xlsx');
        S.toast('Reporte Excel generado (8 hojas)');
      } catch (e) { S.toast('No se pudo generar el Excel: ' + e.message, 'error'); }
    },
    imprimir() { window.print(); }
  };

  AP.views = AP.views || {};

  /* ------------------------------ Finanzas ------------------------------ */
  AP.views.finanzas = {
    setup() {
      const st = S.state;
      const periodo = ref('12m');
      const desde = computed(() => (periodo.value === '12m' ? U.addMonths(st.hoy, -11) : periodo.value === 'anio' ? st.hoy.slice(0, 4) + '-01-01' : '0000'));
      const labores = computed(() => st.labores.filter((l) => l.estado === 'completada' && l.fecha >= desde.value));
      const cosechas = computed(() => st.cosechas.filter((c) => c.fecha >= desde.value));
      const kpi = computed(() => {
        const costo = U.sum(labores.value, (l) => l.costoTotal);
        const ingreso = U.sum(cosechas.value, (c) => c.toneladas * c.precio);
        const t = U.sum(cosechas.value, (c) => c.toneladas);
        const ha = S.resumen.value.hectareas || 0;
        return { costo, ingreso, margen: ingreso - costo, margenPct: ingreso ? ((ingreso - costo) / ingreso) * 100 : null, costoHa: ha ? costo / ha : 0, costoT: t ? costo / t : null, mo: U.sum(labores.value, (l) => l.costoManoObra), ins: U.sum(labores.value, (l) => l.costoInsumos), otros: U.sum(labores.value, (l) => l.otrosCostos) };
      });
      const porParcela = computed(() => st.parcelas.map((p) => {
        const costo = U.sum(labores.value.filter((l) => l.parcelaId === p.id), (l) => l.costoTotal);
        const cs = cosechas.value.filter((c) => c.parcelaId === p.id);
        const ingreso = U.sum(cs, (c) => c.toneladas * c.precio);
        const t = U.sum(cs, (c) => c.toneladas);
        return { p, costo, ingreso, t, margen: ingreso - costo, costoHa: p.hectareas ? costo / p.hectareas : 0, margenHa: p.hectareas ? (ingreso - costo) / p.hectareas : 0 };
      }).filter((x) => x.costo || x.ingreso).sort((a, b) => b.margen - a.margen));
      const proyeccion = computed(() => {
        const precio = Number(st.settings.precioReferencia) || 0;
        const items = S.activas.value.map((p) => ({ p, e: S.estados.value[p.id], t: S.produccion.value[p.id].toneladas }))
          .filter((x) => x.e.fase !== 'planificada' && x.e.diasParaCosecha <= 365).sort((a, b) => a.e.diasParaCosecha - b.e.diasParaCosecha);
        return { items, t: U.sum(items, (x) => x.t), ingreso: U.sum(items, (x) => x.t) * precio, precio };
      });
      const chartMeses = (t) => {
        const meses = [];
        for (let i = 11; i >= 0; i--) meses.push(U.monthKey(U.addMonths(st.hoy, -i)));
        const comp = st.labores.filter((l) => l.estado === 'completada');
        const by = (fn) => meses.map((m) => U.round(U.sum(comp.filter((l) => U.monthKey(l.fecha) === m), fn)));
        return {
          type: 'bar',
          data: {
            labels: meses.map((m) => U.monthLabel(m)),
            datasets: [
              { label: 'Mano de obra', data: by((l) => l.costoManoObra), backgroundColor: t.violet, stack: 'c', maxBarThickness: 28 },
              { label: 'Insumos', data: by((l) => l.costoInsumos), backgroundColor: '#84cc16', stack: 'c', maxBarThickness: 28 },
              { label: 'Otros', data: by((l) => l.otrosCostos), backgroundColor: t.slate, stack: 'c', maxBarThickness: 28 },
              { type: 'line', label: 'Ingresos', data: meses.map((m) => U.round(U.sum(st.cosechas.filter((c) => U.monthKey(c.fecha) === m), (c) => c.toneladas * c.precio))), borderColor: t.brand, backgroundColor: t.brand, borderWidth: 2.5, pointRadius: 3, tension: 0.3 }
            ]
          },
          options: AP.charts.options(t, { plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + AP.money(c.raw) } } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: (v) => AP.money(v, true) } } } })
        };
      };
      const chartTipos = (t) => {
        const g = U.groupBy(labores.value, (l) => l.tipo);
        const keys = Object.keys(g).sort((a, b) => U.sum(g[b], (l) => l.costoTotal) - U.sum(g[a], (l) => l.costoTotal));
        return {
          type: 'doughnut',
          data: { labels: keys, datasets: [{ data: keys.map((k) => U.round(U.sum(g[k], (l) => l.costoTotal))), backgroundColor: keys.map((k) => C.labor(k).tone.hex), borderWidth: 0, hoverOffset: 6 }] },
          options: AP.charts.options(t, { cutout: '68%', interaction: { mode: 'nearest' }, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + AP.money(c.raw) } } } })
        };
      };
      return { st, periodo, kpi, porParcela, proyeccion, chartMeses, chartTipos, S, U, C, R: AP.reportes };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Inteligencia" title="Finanzas" subtitle="Costos de producción, ingresos, márgenes y rentabilidad por parcela.">
        <ap-seg v-model="periodo" :options="[{ value: '12m', label: '12 meses' }, { value: 'anio', label: 'Este año' }, { value: 'todo', label: 'Todo' }]"></ap-seg>
        <button class="btn btn-outline" @click="R.imprimir()"><i class="fa-solid fa-print"></i><span class="hidden sm:inline">Imprimir</span></button>
        <button class="btn btn-primary" @click="R.excel()"><i class="fa-solid fa-file-excel"></i>Exportar Excel</button>
      </ap-page-header>

      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <ap-stat label="Costos" :value="$money(kpi.costo, true)" icon="fa-arrow-trend-down" tone="orange" :sub="'MO ' + $money(kpi.mo, true) + ' · Insumos ' + $money(kpi.ins, true)"></ap-stat>
        <ap-stat label="Ingresos" :value="$money(kpi.ingreso, true)" icon="fa-arrow-trend-up" tone="emerald"></ap-stat>
        <ap-stat label="Margen" :value="$money(kpi.margen, true)" icon="fa-scale-balanced" :tone="kpi.margen >= 0 ? 'emerald' : 'red'" :sub="kpi.margenPct != null ? U.fmtPct(kpi.margenPct, 1) + ' sobre ingresos' : 'sin ingresos en el período'"></ap-stat>
        <ap-stat label="Costo por ha" :value="$money(kpi.costoHa, true)" icon="fa-vector-square" tone="sky" sub="sobre área activa"></ap-stat>
        <ap-stat label="Costo por tonelada" :value="kpi.costoT != null ? $money(kpi.costoT) : '—'" icon="fa-weight-hanging" tone="violet" sub="sobre producción cosechada"></ap-stat>
      </div>

      <div class="grid lg:grid-cols-5 gap-4 mb-4">
        <div class="card lg:col-span-3">
          <div class="card-head"><h3 class="card-title">Costos e ingresos por mes</h3></div>
          <div class="px-4 sm:px-5 pb-5"><ap-chart :config="chartMeses" height="280px"></ap-chart></div>
        </div>
        <div class="card lg:col-span-2">
          <div class="card-head"><h3 class="card-title">Costo por tipo de labor</h3></div>
          <div class="px-4 sm:px-5 pb-5"><ap-chart :config="chartTipos" height="280px"></ap-chart></div>
        </div>
      </div>

      <div class="card overflow-hidden mb-4">
        <div class="card-head"><h3 class="card-title"><i class="fa-solid fa-ranking-star text-gold-500"></i>Rentabilidad por parcela</h3></div>
        <div v-if="porParcela.length" class="overflow-x-auto">
          <table class="table">
            <thead><tr><th>Parcela</th><th class="!text-right">Área</th><th class="!text-right">Costos</th><th class="!text-right">Costo/ha</th><th class="!text-right">Cosechado</th><th class="!text-right">Ingresos</th><th class="!text-right">Margen</th><th class="!text-right">Margen/ha</th></tr></thead>
            <tbody>
              <tr v-for="x in porParcela" :key="x.p.id" class="hover:bg-ink-50/70 dark:hover:bg-white/[0.02]">
                <td><a :href="'#/parcelas/' + x.p.id" class="font-semibold hover:underline"><span class="inline-block w-2 h-2 rounded-full mr-2" :style="{ background: x.p.color }"></span>{{ x.p.nombre }}</a></td>
                <td class="text-right num">{{ U.fmtNum(x.p.hectareas, 1) }} ha</td>
                <td class="text-right num">{{ $money(x.costo) }}</td>
                <td class="text-right num muted">{{ $money(x.costoHa) }}</td>
                <td class="text-right num">{{ x.t ? U.fmtNum(x.t) + ' t' : '—' }}</td>
                <td class="text-right num">{{ $money(x.ingreso) }}</td>
                <td :class="['text-right num font-bold', x.margen >= 0 ? 'text-brand-700 dark:text-brand-400' : 'text-red-600']">{{ $money(x.margen) }}</td>
                <td :class="['text-right num', x.margenHa >= 0 ? '' : 'text-red-600']">{{ $money(x.margenHa) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ap-empty v-else compact icon="fa-coins" title="Sin movimientos económicos" text="Registre labores con costos y cosechas con precio para ver la rentabilidad."></ap-empty>
      </div>

      <div class="card">
        <div class="card-head flex-wrap">
          <div>
            <h3 class="card-title"><i class="fa-solid fa-chart-line text-brand-600"></i>Proyección de ingresos · 12 meses</h3>
            <p class="text-xs muted mt-0.5">Producción estimada × precio de referencia ({{ $money(proyeccion.precio) }}/t, editable en Ajustes)</p>
          </div>
          <div class="text-right"><p class="text-2xl font-extrabold num text-brand-700 dark:text-brand-400">{{ $money(proyeccion.ingreso, true) }}</p><p class="text-xs muted">{{ U.fmtNum(proyeccion.t) }} t estimadas</p></div>
        </div>
        <div class="divide">
          <div v-for="x in proyeccion.items" :key="x.p.id" class="row">
            <span class="w-1.5 h-8 rounded-full" :style="{ background: x.p.color }"></span>
            <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">{{ x.p.nombre }}</p><p class="text-[11px] muted">{{ x.e.diasParaCosecha <= 0 ? 'En cosecha' : U.fmtDate(x.e.cosechaEst) }}</p></div>
            <span class="text-sm num muted">{{ U.fmtNum(x.t) }} t</span>
            <span class="text-sm num font-bold w-28 text-right">{{ $money(x.t * proyeccion.precio) }}</span>
          </div>
        </div>
      </div>
    </div>`
  };

  /* ------------------------------ Ajustes ------------------------------ */
  AP.views.ajustes = {
    setup() {
      const st = S.state;
      const q = ref('');
      const resultados = ref([]);
      const buscando = ref(false);
      const lat = ref(st.settings.ubicacion ? st.settings.ubicacion.lat : '');
      const lon = ref(st.settings.ubicacion ? st.settings.ubicacion.lon : '');
      const fileInput = ref(null);
      const buscar = async () => {
        if (q.value.trim().length < 2) return;
        buscando.value = true;
        try { resultados.value = await W.buscarLugar(q.value.trim()); if (!resultados.value.length) S.toast('No se encontraron lugares', 'info'); }
        catch (e) { S.toast('Sin conexión para buscar lugares', 'error'); }
        buscando.value = false;
      };
      const usar = (r) => { st.settings.ubicacion = { lat: r.lat, lon: r.lon, nombre: r.nombre, fuente: 'busqueda' }; lat.value = r.lat; lon.value = r.lon; resultados.value = []; q.value = ''; S.toast('Ubicación actualizada: ' + r.nombre); };
      const gps = () => {
        if (!navigator.geolocation) return S.toast('GPS no disponible', 'warning');
        navigator.geolocation.getCurrentPosition((pos) => usar({ lat: U.round(pos.coords.latitude, 4), lon: U.round(pos.coords.longitude, 4), nombre: 'Ubicación GPS' }), () => S.toast('No se pudo obtener la ubicación', 'error'), { enableHighAccuracy: true, timeout: 10000 });
      };
      const manual = () => {
        const la = Number(lat.value), lo = Number(lon.value);
        if (!(la >= -90 && la <= 90 && lo >= -180 && lo <= 180) || lat.value === '' || lon.value === '') return S.toast('Coordenadas inválidas', 'error');
        usar({ lat: la, lon: lo, nombre: 'Coordenadas ' + la.toFixed(3) + ', ' + lo.toFixed(3) });
      };
      const importar = (ev) => { const f = ev.target.files[0]; if (f) S.importJSON(f); ev.target.value = ''; };
      const conteo = computed(() => ({ parcelas: st.parcelas.length, labores: st.labores.length, insumos: st.insumos.length, cosechas: st.cosechas.length, monitoreos: st.monitoreos.length }));
      const kb = computed(() => { void conteo.value; void st.settings.finca; return S.storageKB(); });
      const demo = async () => {
        if (st.parcelas.length && !(await S.confirm({ title: 'Cargar demostración', message: 'Se reemplazarán los datos actuales por una finca de ejemplo. Descargue un respaldo si desea conservarlos.', confirmText: 'Cargar demo', danger: true }))) return;
        S.loadDemo();
        AP.router.go('dashboard');
      };
      return { st, q, resultados, buscando, lat, lon, fileInput, buscar, usar, gps, manual, importar, conteo, kb, demo, S, U, C, R: AP.reportes, version: AP.VERSION };
    },
    template: `
    <div class="max-w-4xl">
      <ap-page-header eyebrow="Sistema" title="Ajustes" subtitle="Datos de la finca, ubicación, apariencia y respaldo de información."></ap-page-header>
      <div class="space-y-4">
        <section class="card p-5 sm:p-6">
          <h3 class="card-title mb-5"><i class="fa-solid fa-house-flag text-brand-600"></i>Finca</h3>
          <div class="grid sm:grid-cols-2 gap-4">
            <div><label class="label">Nombre de la finca</label><input v-model="st.settings.finca" class="input"></div>
            <div><label class="label">Productor / empresa</label><input v-model="st.settings.propietario" class="input" placeholder="Opcional"></div>
            <div><label class="label">Moneda</label><select v-model="st.settings.moneda" class="input"><option v-for="m in C.MONEDAS" :key="m.code" :value="m.code">{{ m.label }}</option></select></div>
            <div><label class="label">Precio de referencia por tonelada</label><input v-model.number="st.settings.precioReferencia" type="number" min="0" step="any" class="input"><p class="hint">Se usa para proyectar ingresos y sugerir precio en cosechas</p></div>
            <div><label class="label">Umbral de lluvia crítica (mm/día)</label><input v-model.number="st.settings.umbralLluvia" type="number" min="1" step="1" class="input"><p class="hint">Activa alertas de encharcamiento y cosecha anticipada</p></div>
          </div>
        </section>

        <section class="card p-5 sm:p-6">
          <h3 class="card-title mb-1"><i class="fa-solid fa-location-dot text-rose-500"></i>Ubicación para el clima</h3>
          <p class="text-sm muted mb-5">Actual: <b class="text-ink-800 dark:text-ink-100">{{ S.ubicacionActual.value.nombre }}</b> ({{ U.fmtNum(S.ubicacionActual.value.lat, 4) }}, {{ U.fmtNum(S.ubicacionActual.value.lon, 4) }})</p>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 text-sm"></i>
              <input v-model="q" @keyup.enter="buscar" class="input pl-10" placeholder="Buscar ciudad o distrito (ej. Pital, San Carlos)">
            </div>
            <button class="btn btn-soft" @click="buscar" :disabled="buscando"><i :class="['fa-solid', buscando ? 'fa-spinner fa-spin' : 'fa-magnifying-glass']"></i></button>
            <button class="btn btn-outline" @click="gps"><i class="fa-solid fa-location-crosshairs"></i><span class="hidden sm:inline">GPS</span></button>
          </div>
          <div v-if="resultados.length" class="mt-2 card divide overflow-hidden">
            <button v-for="r in resultados" :key="r.lat + ',' + r.lon" class="row w-full text-left" @click="usar(r)"><i class="fa-solid fa-location-dot text-ink-400"></i><span class="text-sm flex-1">{{ r.nombre }}</span><span class="text-xs muted num">{{ r.lat }}, {{ r.lon }}</span></button>
          </div>
          <div class="grid grid-cols-[1fr_1fr_auto] gap-2 mt-4">
            <input v-model="lat" type="number" step="any" class="input" placeholder="Latitud">
            <input v-model="lon" type="number" step="any" class="input" placeholder="Longitud">
            <button class="btn btn-soft" @click="manual">Usar</button>
          </div>
        </section>

        <section class="card p-5 sm:p-6">
          <h3 class="card-title mb-5"><i class="fa-solid fa-palette text-violet-500"></i>Apariencia</h3>
          <ap-seg v-model="st.settings.tema" :options="[{ value: 'system', label: 'Automático', icon: 'fa-circle-half-stroke' }, { value: 'light', label: 'Claro', icon: 'fa-sun' }, { value: 'dark', label: 'Oscuro', icon: 'fa-moon' }]"></ap-seg>
        </section>

        <section class="card p-5 sm:p-6">
          <h3 class="card-title mb-1"><i class="fa-solid fa-database text-sky-500"></i>Datos y respaldo</h3>
          <p class="text-sm muted mb-5">Sus datos se guardan solo en este dispositivo ({{ kb }} KB). Descargue respaldos periódicos para no perderlos.</p>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5 text-center">
            <div v-for="(v, k) in conteo" :key="k" class="rounded-xl bg-ink-50 dark:bg-white/[0.03] py-2.5"><p class="text-lg font-extrabold num">{{ v }}</p><p class="text-[11px] muted capitalize">{{ k }}</p></div>
          </div>
          <div class="grid sm:grid-cols-2 gap-2">
            <button class="btn btn-outline justify-start" @click="S.exportJSON()"><i class="fa-solid fa-download text-brand-600"></i>Descargar respaldo (JSON)</button>
            <button class="btn btn-outline justify-start" @click="fileInput.click()"><i class="fa-solid fa-upload text-sky-600"></i>Restaurar respaldo</button>
            <button class="btn btn-outline justify-start" @click="R.excel()"><i class="fa-solid fa-file-excel text-emerald-600"></i>Reporte completo en Excel</button>
            <button class="btn btn-outline justify-start" @click="demo"><i class="fa-solid fa-flask-vial text-gold-500"></i>Cargar finca de demostración</button>
          </div>
          <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="importar">
          <div class="mt-5 pt-5 border-t border-ink-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div><p class="text-sm font-semibold text-red-600">Zona de peligro</p><p class="text-xs muted">Elimina todas las parcelas, labores, inventario y registros.</p></div>
            <button class="btn btn-danger" @click="S.resetAll()"><i class="fa-solid fa-trash-can"></i>Borrar todo</button>
          </div>
        </section>

        <section class="card p-5 sm:p-6 flex items-center gap-4">
          <img src="assets/icon.svg" alt="" class="w-12 h-12 rounded-xl">
          <div class="flex-1"><p class="font-bold">AgroPiña Pro <span class="muted font-medium">v{{ version }}</span></p><p class="text-xs muted">Funciona sin conexión · Datos de clima de Open-Meteo · Imágenes satelitales de Esri</p></div>
        </section>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
