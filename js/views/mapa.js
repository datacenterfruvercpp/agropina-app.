/* AgroPiña Enterprise · Vista: Mapa satelital de la finca con dibujo de linderos */
(function (AP) {
  'use strict';
  const { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } = Vue;
  const S = AP.store, U = AP.utils, C = AP.catalog;

  AP.views = AP.views || {};
  AP.views.mapa = {
    props: { query: Object },
    setup(props) {
      const st = S.state;
      const el = ref(null);
      const capa = ref('satelite');
      const editando = ref(null);
      const puntos = ref([]);
      const seleccion = ref(props.query && props.query.p ? props.query.p : null);
      let map = null, base = null, grupo = null, dibujo = null;

      const TILES = {
        satelite: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 'Imágenes © Esri'],
        mapa: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap']
      };
      const area = computed(() => U.polygonHa(puntos.value));
      const parcelas = computed(() => S.activas.value.map((p) => ({ p, e: S.estados.value[p.id], tiene: p.poligono.length >= 3 || p.lat != null })));

      const setCapa = () => {
        if (!map) return;
        if (base) map.removeLayer(base);
        base = L.tileLayer(TILES[capa.value][0], { maxZoom: 19, attribution: TILES[capa.value][1] }).addTo(map);
      };
      const renderParcelas = () => {
        if (!map) return;
        grupo.clearLayers();
        S.activas.value.forEach((p) => {
          if (editando.value === p.id) return;
          const e = S.estados.value[p.id];
          const popup = '<div style="font-family:inherit;min-width:160px"><b style="font-size:14px">' + p.nombre + '</b><br><span style="color:#66716b">' + C.FASES[e.fase].label + ' · ' + U.fmtNum(p.hectareas, 1) + ' ha</span><br><a href="#/parcelas/' + p.id + '" style="color:#039855;font-weight:700">Ver detalle →</a></div>';
          let layer = null;
          if (p.poligono.length >= 3) {
            layer = L.polygon(p.poligono, { color: p.color, weight: seleccion.value === p.id ? 4 : 2.5, fillColor: p.color, fillOpacity: seleccion.value === p.id ? 0.45 : 0.28 });
            layer.bindTooltip(p.nombre, { permanent: true, direction: 'center', className: 'ap-map-label' });
          } else if (p.lat != null) {
            layer = L.circleMarker([p.lat, p.lon], { radius: 10, color: '#fff', weight: 3, fillColor: p.color, fillOpacity: 1 });
            layer.bindTooltip(p.nombre, { direction: 'top', offset: [0, -8] });
          }
          if (layer) { layer.bindPopup(popup); layer.on('click', () => { seleccion.value = p.id; }); grupo.addLayer(layer); }
        });
      };
      const encuadrar = () => {
        if (!map) return;
        const b = grupo.getLayers().length ? grupo.getBounds() : null;
        if (b && b.isValid()) map.fitBounds(b, { padding: [40, 40], maxZoom: 17 });
        else { const u = S.ubicacionActual.value; map.setView([u.lat, u.lon], 14); }
      };
      const enfocar = (p) => {
        seleccion.value = p.id;
        if (p.poligono.length >= 3) map.fitBounds(L.polygon(p.poligono).getBounds(), { padding: [60, 60], maxZoom: 18 });
        else if (p.lat != null) map.setView([p.lat, p.lon], 17);
        renderParcelas();
      };
      const redibujar = () => {
        if (dibujo) map.removeLayer(dibujo);
        dibujo = L.layerGroup().addTo(map);
        const p = S.parcela(editando.value);
        const color = p ? p.color : '#12b76a';
        if (puntos.value.length >= 2) L.polygon(puntos.value, { color, weight: 3, dashArray: '6 6', fillColor: color, fillOpacity: 0.25 }).addTo(dibujo);
        puntos.value.forEach((pt, i) => {
          const m = L.circleMarker(pt, { radius: i === 0 ? 8 : 6, color: '#fff', weight: 2.5, fillColor: color, fillOpacity: 1 }).addTo(dibujo);
          if (i === 0 && puntos.value.length >= 3) m.bindTooltip('Toque para cerrar', { direction: 'top' }).on('click', (ev) => { L.DomEvent.stop(ev); guardar(); });
        });
      };
      const iniciar = (p) => {
        editando.value = p.id;
        seleccion.value = p.id;
        puntos.value = p.poligono.map((x) => x.slice());
        if (p.poligono.length >= 3) map.fitBounds(L.polygon(p.poligono).getBounds(), { padding: [60, 60] });
        renderParcelas(); redibujar();
      };
      const cancelar = () => { editando.value = null; puntos.value = []; if (dibujo) map.removeLayer(dibujo); dibujo = null; renderParcelas(); };
      const deshacer = () => { puntos.value.pop(); redibujar(); };
      const guardar = async () => {
        const p = S.parcela(editando.value);
        if (!p) return cancelar();
        if (puntos.value.length && puntos.value.length < 3) { S.toast('Marque al menos 3 vértices', 'warning'); return; }
        const pol = puntos.value.map((x) => [U.round(x[0], 6), U.round(x[1], 6)]);
        const ha = U.round(U.polygonHa(pol), 2);
        const cen = U.centroid(pol);
        const id = p.id;
        cancelar();
        S.saveParcela({ id, poligono: pol, lat: cen ? U.round(cen[0], 6) : p.lat, lon: cen ? U.round(cen[1], 6) : p.lon });
        if (pol.length >= 3 && Math.abs(ha - p.hectareas) > 0.05) {
          const ok = await S.confirm({ title: 'Actualizar área', message: 'El polígono dibujado mide ' + U.fmtNum(ha, 2) + ' ha y la parcela tiene registradas ' + U.fmtNum(p.hectareas, 2) + ' ha. ¿Desea usar el área medida?', confirmText: 'Usar ' + U.fmtNum(ha, 2) + ' ha' });
          if (ok) S.saveParcela({ id, hectareas: ha });
        }
      };
      const miUbicacion = () => {
        if (!navigator.geolocation) return S.toast('GPS no disponible en este dispositivo', 'warning');
        navigator.geolocation.getCurrentPosition((pos) => {
          const ll = [pos.coords.latitude, pos.coords.longitude];
          map.setView(ll, 17);
          L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#0ea5e9', fillOpacity: 1 }).addTo(map).bindTooltip('Usted está aquí').openTooltip();
          if (editando.value) { puntos.value.push(ll); redibujar(); }
        }, () => S.toast('No se pudo obtener la ubicación GPS', 'error'), { enableHighAccuracy: true, timeout: 10000 });
      };

      onMounted(() => nextTick(() => {
        if (!window.L || !el.value) return;
        map = L.map(el.value, { zoomControl: false });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
        grupo = L.featureGroup().addTo(map);
        setCapa();
        renderParcelas();
        const p = seleccion.value && S.parcela(seleccion.value);
        if (p && p.poligono.length < 3 && p.lat == null) { encuadrar(); iniciar(p); }
        else if (p) { encuadrar(); enfocar(p); }
        else encuadrar();
        map.on('click', (ev) => { if (!editando.value) return; puntos.value.push([ev.latlng.lat, ev.latlng.lng]); redibujar(); });
        setTimeout(() => map && map.invalidateSize(), 250);
      }));
      onBeforeUnmount(() => { if (map) map.remove(); map = null; });
      watch(capa, setCapa);
      watch(() => [st.parcelas.map((p) => p.poligono.length + p.color + p.estado + p.nombre).join(), st.hoy], renderParcelas);

      return { st, el, capa, editando, puntos, area, parcelas, seleccion, enfocar, iniciar, cancelar, deshacer, guardar, miUbicacion, encuadrar, S, U, C };
    },
    template: `
    <div>
      <ap-page-header eyebrow="Producción agrícola" title="Mapa de la finca" subtitle="Imagen satelital, linderos de parcelas y cálculo de área georreferenciada.">
        <ap-seg v-model="capa" :options="[{ value: 'satelite', label: 'Satélite', icon: 'fa-satellite' }, { value: 'mapa', label: 'Mapa', icon: 'fa-map' }]"></ap-seg>
      </ap-page-header>
      <div class="grid lg:grid-cols-4 gap-4">
        <div class="lg:col-span-3 card p-2 relative">
          <div ref="el" class="w-full h-[58vh] lg:h-[calc(100vh-230px)] min-h-[380px] rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-850 z-0"></div>
          <div class="absolute top-4 left-4 right-4 z-[500] flex flex-wrap gap-2 pointer-events-none">
            <div v-if="editando" class="pointer-events-auto card shadow-lift px-4 py-3 flex flex-wrap items-center gap-3">
              <div class="text-sm"><p class="font-bold"><i class="fa-solid fa-draw-polygon text-brand-600 mr-1"></i>Dibujando: {{ S.parcelaNombre(editando) }}</p>
                <p class="text-xs muted">Toque el mapa para marcar vértices · {{ puntos.length }} puntos · <b class="text-ink-900 dark:text-white">{{ U.fmtNum(area, 2) }} ha</b></p></div>
              <div class="flex gap-1.5">
                <button class="btn btn-soft btn-sm" @click="deshacer" :disabled="!puntos.length"><i class="fa-solid fa-rotate-left"></i>Deshacer</button>
                <button class="btn btn-soft btn-sm" @click="puntos = []; deshacer()" :disabled="!puntos.length"><i class="fa-solid fa-eraser"></i>Limpiar</button>
                <button class="btn btn-ghost btn-sm" @click="cancelar">Cancelar</button>
                <button class="btn btn-primary btn-sm" @click="guardar"><i class="fa-solid fa-check"></i>Guardar</button>
              </div>
            </div>
          </div>
          <div class="absolute top-4 right-4 z-[500] flex flex-col gap-2" v-if="!editando">
            <button class="btn-icon bg-white dark:bg-ink-900 shadow-lift" @click="encuadrar" title="Ver toda la finca"><i class="fa-solid fa-expand"></i></button>
            <button class="btn-icon bg-white dark:bg-ink-900 shadow-lift" @click="miUbicacion" title="Mi ubicación"><i class="fa-solid fa-location-crosshairs"></i></button>
          </div>
          <button v-else class="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] btn bg-white dark:bg-ink-900 shadow-lift" @click="miUbicacion"><i class="fa-solid fa-location-crosshairs text-sky-500"></i>Agregar punto GPS</button>
        </div>
        <div class="card self-start">
          <div class="card-head"><h3 class="card-title">Parcelas</h3><span class="text-xs muted">{{ parcelas.filter(x => x.tiene).length }}/{{ parcelas.length }} mapeadas</span></div>
          <div class="divide max-h-[60vh] overflow-y-auto">
            <div v-for="x in parcelas" :key="x.p.id" :class="['row cursor-pointer', seleccion === x.p.id ? 'bg-brand-50/70 dark:bg-brand-500/10' : '']" @click="x.tiene ? enfocar(x.p) : null">
              <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: x.p.color }"></span>
              <div class="min-w-0 flex-1"><p class="text-sm font-semibold truncate">{{ x.p.nombre }}</p><p class="text-[11px] muted">{{ U.fmtNum(x.p.hectareas, 2) }} ha · {{ C.FASES[x.e.fase].short }}</p></div>
              <button class="btn btn-soft btn-sm" @click.stop="iniciar(x.p)" :disabled="!!editando"><i class="fa-solid fa-draw-polygon"></i>{{ x.tiene ? 'Editar' : 'Dibujar' }}</button>
            </div>
            <ap-empty v-if="!parcelas.length" compact icon="fa-layer-group" title="Sin parcelas"></ap-empty>
          </div>
        </div>
      </div>
    </div>`
  };
})(window.AP = window.AP || {});
