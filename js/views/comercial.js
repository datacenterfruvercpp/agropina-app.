/* AgroPiña Enterprise · Vistas: Compras (órdenes y proveedores) y Ventas y cobros (cuentas por cobrar y clientes) */
(function (AP) {
  'use strict';
  const { ref, computed } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog, B = AP.negocio;

  AP.views = AP.views || {};

  /* ------------------------------ Compras ------------------------------ */
  AP.views.compras = {
    props: { query: Object },
    setup(props) {
      const st = S.state;
      const tab = ref(props.query && props.query.tab === 'proveedores' ? 'proveedores' : 'ordenes');
      const estado = ref('abiertas');
      const ordenes = computed(() => st.ordenes.filter((o) => estado.value === 'todas' || (estado.value === 'abiertas' ? o.estado === 'borrador' || o.estado === 'aprobada' : o.estado === estado.value))
        .map((o) => Object.assign({}, o, { proveedor: S.proveedorNombre(o.proveedorId), atrasada: o.estado === 'aprobada' && o.fechaEntrega && o.fechaEntrega < st.hoy })));
      const conteo = computed(() => ({
        abiertas: st.ordenes.filter((o) => o.estado === 'borrador' || o.estado === 'aprobada').length,
        borrador: st.ordenes.filter((o) => o.estado === 'borrador').length, aprobada: st.ordenes.filter((o) => o.estado === 'aprobada').length,
        recibida: st.ordenes.filter((o) => o.estado === 'recibida').length, todas: st.ordenes.length
      }));
      const kpi = computed(() => {
        const mes = st.hoy.slice(0, 7);
        return {
          porRecibir: U.sum(st.ordenes.filter((o) => o.estado === 'aprobada'), (o) => o.total),
          borradores: U.sum(st.ordenes.filter((o) => o.estado === 'borrador'), (o) => o.total),
          recibidoMes: U.sum(st.ordenes.filter((o) => o.estado === 'recibida' && (o.fechaRecepcion || '').slice(0, 7) === mes), (o) => o.total),
          atrasadas: st.ordenes.filter((o) => o.estado === 'aprobada' && o.fechaEntrega && o.fechaEntrega < st.hoy).length
        };
      });
      const colsOC = [
        { key: 'numero', label: 'Orden', cls: 'font-semibold' },
        { key: 'proveedor', label: 'Proveedor' },
        { key: 'fecha', label: 'Fecha', format: (v) => U.fmtDate(v) },
        { key: 'fechaEntrega', label: 'Entrega', format: (v) => (v ? U.fmtDate(v) : '—') },
        { key: 'lineas', label: 'Líneas', align: 'right', value: (r) => r.lineas.length },
        { key: 'total', label: 'Total', align: 'right', sum: true, format: (v) => AP.money(v), exportValue: (r) => r.total },
        { key: 'estado', label: 'Estado', value: (r) => B.ESTADOS_OC[r.estado].label }
      ];
      const proveedores = computed(() => st.proveedores.map((p) => {
        const oc = st.ordenes.filter((o) => o.proveedorId === p.id && o.estado !== 'cancelada');
        return Object.assign({}, p, { ordenes: oc.length, comprado: U.sum(oc.filter((o) => o.estado === 'recibida'), (o) => o.total), abierto: U.sum(oc.filter((o) => o.estado !== 'recibida'), (o) => o.total) });
      }));
      const colsProv = [
        { key: 'nombre', label: 'Proveedor', cls: 'font-semibold' },
        { key: 'identificacion', label: 'Cédula' },
        { key: 'contacto', label: 'Contacto' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'email', label: 'Correo', hidden: true },
        { key: 'diasCredito', label: 'Crédito', align: 'right', format: (v) => v + ' días' },
        { key: 'ordenes', label: 'Órdenes', align: 'right' },
        { key: 'comprado', label: 'Comprado', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'abierto', label: 'En curso', align: 'right', sum: true, format: (v) => AP.money(v) }
      ];
      const recibir = async (o) => {
        const ok = await S.confirm({ title: 'Recibir ' + o.numero, message: 'Se registrará la entrada al inventario de ' + o.lineas.length + ' línea(s) por ' + AP.money(o.total) + ' y se recalculará el costo promedio de cada insumo.', confirmText: 'Recibir mercadería' });
        if (ok) S.recibirOrden(o.id);
      };
      return { st, tab, estado, ordenes, conteo, kpi, colsOC, proveedores, colsProv, recibir, B, S, U };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Cadena de suministro" title="Compras" subtitle="Órdenes de compra, aprobación, recepción al inventario y maestro de proveedores.">
        <button class="btn btn-outline" @click="S.openForm('proveedor')"><i class="fa-solid fa-truck"></i>Nuevo proveedor</button>
        <button class="btn btn-primary" @click="S.openForm('orden')"><i class="fa-solid fa-plus"></i>Nueva orden</button>
        <template #tabs>
          <ap-tab :active="tab === 'ordenes'" :count="conteo.abiertas" @click="tab = 'ordenes'">Órdenes de compra</ap-tab>
          <ap-tab :active="tab === 'proveedores'" :count="st.proveedores.length" @click="tab = 'proveedores'">Proveedores</ap-tab>
        </template>
      </ap-page-header>

      <div v-if="tab === 'ordenes'" class="space-y-4">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ap-tile title="Por recibir" subtitle="Órdenes aprobadas" :value="$money(kpi.porRecibir, true)" icon="fa-truck"></ap-tile>
          <ap-tile title="En borrador" subtitle="Pendientes de aprobación" :value="$money(kpi.borradores, true)" icon="fa-file-pen"></ap-tile>
          <ap-tile title="Recibido este mes" subtitle="Entradas al inventario" :value="$money(kpi.recibidoMes, true)" icon="fa-box-open"></ap-tile>
          <ap-tile title="Entregas atrasadas" subtitle="Aprobadas con fecha vencida" :value="kpi.atrasadas" :status="kpi.atrasadas ? 'err' : 'ok'"></ap-tile>
        </div>
        <div class="card overflow-hidden">
          <ap-data-table id="ordenes" title="Órdenes de compra" export-name="Ordenes_de_compra" :columns="colsOC" :rows="ordenes" sort-key="fecha" sort-dir="desc" clickable @open="(r) => S.openForm('orden', st.ordenes.find((o) => o.id === r.id))"
            :empty="{ icon: 'fa-file-invoice', title: 'Sin órdenes', text: 'Cree una orden de compra para reponer insumos.' }">
            <template #toolbar>
              <ap-seg v-model="estado" :options="[{ value: 'abiertas', label: 'Abiertas', count: conteo.abiertas }, { value: 'recibida', label: 'Recibidas', count: conteo.recibida }, { value: 'todas', label: 'Todas', count: conteo.todas }]"></ap-seg>
            </template>
            <template #cell-numero="{ row }"><span class="font-semibold font-mono text-[12.5px]">{{ row.numero }}</span></template>
            <template #cell-fechaEntrega="{ row }"><span :class="row.atrasada ? 'text-red-600 font-semibold' : ''">{{ row.fechaEntrega ? U.fmtDate(row.fechaEntrega) : '—' }}<i v-if="row.atrasada" class="fa-solid fa-clock ml-1 text-[10px]"></i></span></template>
            <template #cell-estado="{ row }"><ap-status :st="B.ESTADOS_OC[row.estado].st" :label="B.ESTADOS_OC[row.estado].label" dot></ap-status></template>
            <template #rowActions="{ row }">
              <button v-if="row.estado === 'borrador'" class="btn btn-outline btn-sm" @click="S.aprobarOrden(row.id)"><i class="fa-solid fa-check"></i>Aprobar</button>
              <button v-if="row.estado === 'aprobada'" class="btn btn-primary btn-sm" @click="recibir(row)"><i class="fa-solid fa-box-open"></i>Recibir</button>
              <ap-menu>
                <template #trigger="{ toggle }"><button class="btn-icon btn-icon-sm" @click="toggle" aria-label="Más acciones"><i class="fa-solid fa-ellipsis-vertical"></i></button></template>
                <button class="menu-item" @click="S.openForm('orden', st.ordenes.find((o) => o.id === row.id))"><i class="fa-solid fa-pen w-4 text-ink-400"></i>{{ row.estado === 'recibida' || row.estado === 'cancelada' ? 'Ver detalle' : 'Editar' }}</button>
                <button v-if="row.estado !== 'recibida' && row.estado !== 'cancelada'" class="menu-item" @click="S.cancelarOrden(row.id)"><i class="fa-solid fa-ban w-4 text-ink-400"></i>Cancelar orden</button>
                <button v-if="row.estado !== 'recibida'" class="menu-item text-red-600" @click="S.deleteOrden(row.id)"><i class="fa-solid fa-trash-can w-4"></i>Eliminar</button>
              </ap-menu>
            </template>
          </ap-data-table>
        </div>
      </div>

      <div v-else class="card overflow-hidden">
        <ap-data-table id="proveedores" title="Proveedores" export-name="Proveedores" :columns="colsProv" :rows="proveedores" sort-key="nombre" clickable @open="(r) => S.openForm('proveedor', st.proveedores.find((p) => p.id === r.id))"
          :empty="{ icon: 'fa-truck', title: 'Sin proveedores', text: 'Registre a sus proveedores de insumos y servicios.' }">
          <template #rowActions="{ row }">
            <button class="btn btn-outline btn-sm" @click="S.openForm('orden', { proveedorId: row.id })"><i class="fa-solid fa-plus"></i>Orden</button>
            <button class="btn-icon btn-icon-sm hover:!text-red-600" @click="S.deleteProveedor(row.id)" aria-label="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
          </template>
        </ap-data-table>
      </div>
    </div>`
  };

  /* ------------------------------ Ventas y cobros ------------------------------ */
  AP.views.ventas = {
    props: { query: Object },
    setup(props) {
      const st = S.state;
      const tab = ref(props.query && props.query.tab ? props.query.tab : 'cobros');
      const cxc = S.cxc;
      const antig = computed(() => B.antiguedad(cxc.value));
      const total = computed(() => U.sum(cxc.value, (x) => x.monto));
      const vencido = computed(() => U.sum(cxc.value.filter((x) => x.diasVencido > 0), (x) => x.monto));
      const cobrado12 = computed(() => U.sum(st.cosechas.filter((c) => c.estadoPago === 'pagado' && c.fecha >= U.addMonths(st.hoy, -11)), (c) => c.toneladas * c.precio));
      const dso = computed(() => {
        const ventas90 = U.sum(st.cosechas.filter((c) => U.diffDays(st.hoy, c.fecha) <= 90), (c) => c.toneladas * c.precio);
        return ventas90 ? Math.round((total.value / ventas90) * 90) : null;
      });
      const colsCxc = [
        { key: 'cliente', label: 'Cliente', cls: 'font-semibold' },
        { key: 'documento', label: 'Documento', format: (v) => v || '—' },
        { key: 'parcela', label: 'Parcela', value: (r) => S.parcelaNombre(r.parcelaId), hidden: true },
        { key: 'fecha', label: 'Fecha', format: (v) => U.fmtDate(v) },
        { key: 'vence', label: 'Vence', format: (v) => U.fmtDate(v) },
        { key: 'diasVencido', label: 'Atraso', align: 'right', format: (v) => (v > 0 ? v + ' d' : 'Al día') },
        { key: 'tramo', label: 'Antigüedad', value: (r) => B.TRAMOS[r.tramo] },
        { key: 'monto', label: 'Monto', align: 'right', sum: true, format: (v) => AP.money(v) }
      ];
      const clientes = computed(() => st.clientes.map((c) => {
        const cs = st.cosechas.filter((x) => x.clienteId === c.id);
        const pend = cxc.value.filter((x) => x.clienteId === c.id);
        return Object.assign({}, c, { toneladas: U.sum(cs, (x) => x.toneladas), ventas: U.sum(cs, (x) => x.toneladas * x.precio), saldo: U.sum(pend, (x) => x.monto), vencido: U.sum(pend.filter((x) => x.diasVencido > 0), (x) => x.monto) });
      }));
      const colsCli = [
        { key: 'nombre', label: 'Cliente', cls: 'font-semibold' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'identificacion', label: 'Identificación', hidden: true },
        { key: 'contacto', label: 'Contacto' },
        { key: 'diasCredito', label: 'Crédito', align: 'right', format: (v) => v + ' días' },
        { key: 'toneladas', label: 'Toneladas', align: 'right', sum: true, format: (v) => U.fmtNum(v, 1) },
        { key: 'ventas', label: 'Ventas', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'saldo', label: 'Saldo por cobrar', align: 'right', sum: true, format: (v) => AP.money(v) },
        { key: 'vencido', label: 'Vencido', align: 'right', sum: true, format: (v) => AP.money(v) }
      ];
      const chartAntig = (t) => ({
        type: 'bar',
        data: { labels: antig.value.map((a) => a.label), datasets: [{ data: antig.value.map((a) => U.round(a.monto)), backgroundColor: ['#039855', '#d97706', '#ea580c', '#dc2626', '#991b1b'], maxBarThickness: 46 }] },
        options: AP.charts.options(t, { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: (c) => ' ' + AP.money(c.raw) } } }, scales: { x: { ticks: { callback: (v) => AP.money(v, true) } }, y: { grid: { display: false } } } })
      });
      const chartClientes = (t) => {
        const top = clientes.value.slice().sort((a, b) => b.ventas - a.ventas).slice(0, 6);
        return {
          type: 'doughnut',
          data: { labels: top.map((c) => c.nombre), datasets: [{ data: top.map((c) => U.round(c.ventas)), backgroundColor: t.palette, borderWidth: 0 }] },
          options: AP.charts.options(t, { cutout: '66%', interaction: { mode: 'nearest' }, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: true, position: 'bottom' }, tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + AP.money(c.raw) } } } })
        };
      };
      const cobrar = (rows, clear) => { rows.forEach((r) => S.registrarCobro(r.cosechaId)); if (clear) clear(); };
      return { st, tab, cxc, antig, total, vencido, cobrado12, dso, colsCxc, clientes, colsCli, chartAntig, chartClientes, cobrar, B, S, U };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Comercial" title="Ventas y cobros" subtitle="Cuentas por cobrar por antigüedad, clientes y condiciones de crédito.">
        <button class="btn btn-outline" @click="S.openForm('cliente')"><i class="fa-solid fa-handshake"></i>Nuevo cliente</button>
        <button class="btn btn-primary" @click="S.openForm('cosecha')"><i class="fa-solid fa-plus"></i>Registrar venta</button>
        <template #facets>
          <ap-facet label="Saldo por cobrar" :value="$money(total)"></ap-facet>
          <ap-facet label="Vencido" :value="$money(vencido)" :st="vencido > 0 ? '!text-red-600' : ''"></ap-facet>
          <ap-facet label="Días de cobro (DSO)" :value="dso != null ? dso + ' días' : '—'"></ap-facet>
          <ap-facet label="Cobrado 12 meses" :value="$money(cobrado12)"></ap-facet>
          <ap-facet label="Clientes" :value="st.clientes.length"></ap-facet>
        </template>
        <template #tabs>
          <ap-tab :active="tab === 'cobros'" :count="cxc.length" @click="tab = 'cobros'">Cuentas por cobrar</ap-tab>
          <ap-tab :active="tab === 'clientes'" :count="st.clientes.length" @click="tab = 'clientes'">Clientes</ap-tab>
        </template>
      </ap-page-header>

      <div v-if="tab === 'cobros'" class="space-y-4">
        <div class="grid xl:grid-cols-5 gap-4">
          <div class="card xl:col-span-3 min-w-0">
            <div class="card-head"><h3 class="card-title">Antigüedad de saldos</h3><span class="text-[12px] muted">{{ cxc.length }} documento(s)</span></div>
            <div class="card-body"><ap-chart :config="chartAntig" height="210px"></ap-chart></div>
          </div>
          <div class="card xl:col-span-2 min-w-0 overflow-x-auto">
            <div class="card-head"><h3 class="card-title">Resumen por tramo</h3></div>
            <table class="table">
              <thead><tr><th>Tramo</th><th class="!text-right">Docs.</th><th class="!text-right">Monto</th><th class="!text-right">%</th></tr></thead>
              <tbody><tr v-for="a in antig" :key="a.label"><td>{{ a.label }}</td><td class="text-right num">{{ a.n }}</td><td class="text-right num font-semibold">{{ $money(a.monto) }}</td><td class="text-right num muted">{{ total ? U.fmtPct(a.monto / total * 100) : '—' }}</td></tr></tbody>
            </table>
          </div>
        </div>
        <div class="card overflow-hidden">
          <ap-data-table id="cxc" title="Documentos por cobrar" export-name="Cuentas_por_cobrar" :columns="colsCxc" :rows="cxc" row-key="cosechaId" selectable sort-key="diasVencido" sort-dir="desc"
            :empty="{ icon: 'fa-circle-check', title: 'Sin saldos pendientes', text: 'Todas las ventas registradas están cobradas.' }">
            <template #bulk="{ rows, clear }"><button class="btn btn-primary btn-sm" @click="cobrar(rows, clear)"><i class="fa-solid fa-check"></i>Registrar cobro ({{ rows.length }})</button></template>
            <template #cell-diasVencido="{ row }"><span :class="row.diasVencido > 30 ? 'text-red-600 font-semibold' : row.diasVencido > 0 ? 'text-amber-600 font-semibold' : 'muted'">{{ row.diasVencido > 0 ? row.diasVencido + ' d' : 'Al día' }}</span></template>
            <template #cell-tramo="{ row }"><ap-status :st="row.tramo === 0 ? 'st-ok' : row.tramo === 1 ? 'st-warn' : 'st-err'" :label="B.TRAMOS[row.tramo]"></ap-status></template>
            <template #rowActions="{ row }"><button class="btn btn-outline btn-sm" @click="S.registrarCobro(row.cosechaId)"><i class="fa-solid fa-hand-holding-dollar"></i>Cobrar</button></template>
          </ap-data-table>
        </div>
      </div>

      <div v-else class="grid xl:grid-cols-3 gap-4">
        <div class="card overflow-hidden xl:col-span-2">
          <ap-data-table id="clientes" title="Clientes" export-name="Clientes" :columns="colsCli" :rows="clientes" sort-key="ventas" sort-dir="desc" clickable @open="(r) => S.openForm('cliente', st.clientes.find((c) => c.id === r.id))"
            :empty="{ icon: 'fa-handshake', title: 'Sin clientes', text: 'Registre exportadoras, mercados e industrias que compran su fruta.' }">
            <template #rowActions="{ row }"><button class="btn-icon btn-icon-sm hover:!text-red-600" @click="S.deleteCliente(row.id)" aria-label="Eliminar"><i class="fa-solid fa-trash-can"></i></button></template>
          </ap-data-table>
        </div>
        <div class="card">
          <div class="card-head"><h3 class="card-title">Participación en ventas</h3></div>
          <div class="card-body"><ap-chart v-if="clientes.length" :config="chartClientes" height="280px"></ap-chart><ap-empty v-else compact icon="fa-chart-pie" title="Sin datos"></ap-empty></div>
        </div>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
