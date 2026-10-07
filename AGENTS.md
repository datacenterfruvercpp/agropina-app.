# AGENTS.md · AgroPiña Enterprise

Instrucciones para agentes (Claude Code u otros) que trabajen en este repositorio. Léelo completo antes de tocar código. El estado del proyecto está en `CONTINUIDAD.md` y el siguiente paso concreto en `PUNTO_DE_REANUDACION.md`.

## Qué es

ERP agrícola (PWA) para fincas de piña, multi-finca, con diseño tipo SAP Fiori / Oracle Redwood / Dynamics 365 (Costa Rica como contexto por defecto). Sin backend: todo corre en el navegador y los datos viven en `localStorage`. Idioma de la interfaz y de los comentarios: **español**. El usuario habla español; responde en español.

Pila: Vue 3 (build global, sin SFC ni bundler), Tailwind compilado, Chart.js, Leaflet, SheetJS, Font Awesome, fuente IBM Plex Sans/Mono. Todas las librerías están **dentro del repo** (`vendor/`), no se usa ningún CDN.

## Comandos

```bash
npm install            # solo para desarrollo; no es necesario para usar la app
npm run build          # vendor (copia librerías desde node_modules) + compila Tailwind
npm run build:css      # recompila css/tailwind.css (hacer SIEMPRE tras cambiar clases)
npm test               # pruebas unitarias: motor agronómico + lógica ERP (node --test tests/*.test.js)
npm run serve          # servidor local en http://localhost:8080
python3 scripts/build-preview.py <carpeta>   # copia lista para publicar como Artifact de claude.ai
```

Pruebas de navegador (opcionales, requieren Playwright y un servidor local): ver `tests/e2e/LEEME.md`.

## Mapa del código

```
index.html              Carcasa; orden de carga de scripts importa (ver abajo)
js/utils.js             AP.utils   fechas ISO, formato, geometría, archivos
js/catalog.js           AP.catalog variedades, fases, labores, plagas, tonos de color, códigos WMO
js/agronomy.js          AP.agro    fenología, producción, carencias, alertas y recomendaciones
js/negocio.js           AP.negocio lógica ERP pura: estados de OT, planilla, períodos, cuentas por cobrar,
                                   presupuesto vs real, órdenes de compra, kardex, consolidado de fincas
js/weather.js           AP.weather Open-Meteo (clima y geocodificación) + caché local
js/store.js             AP.store   estado reactivo multi-finca, persistencia, migraciones, auditoría, reglas de negocio
js/demo.js              AP.demo    finca de demostración (fechas relativas a hoy)
js/ui.js                AP.ui      componentes base: ap-data-table, ap-page-header/facet/tab, ap-tile, ap-menu,
                                   ap-modal (panel lateral), ap-status, ap-notifs, gráficos, exportación CSV/Excel…
js/forms.js             AP.forms   formularios (parcela, labor/OT, cosecha, monitoreo, insumo, movimiento,
                                   finca, trabajador, proveedor, cliente, orden de compra)
js/views/*.js           AP.views   una vista por archivo (ver tabla)
js/app.js               AP.router, NAV (módulos), barra de sistema, menú lateral, paleta de comandos, arranque
sw.js                   Service worker (offline)
src/tailwind.css + tailwind.config.js    sistema de diseño → css/tailwind.css (generado, SE COMMITEA)
vendor/                 Librerías (generado por scripts/vendor.mjs, SE COMMITEA)
```

Orden de carga en `index.html`: vendor → `utils` → `catalog` → `agronomy` → `negocio` → `weather` → `store` → `demo` → `ui` → `forms` → `views/*` → `app`. Todo cuelga del espacio de nombres global `window.AP`.

Vistas (`AP.views.<nombre>` ↔ ruta `#/<nombre>`): `dashboard`, `parcelas`, `parcela` (`#/parcelas/<id>`), `labores`, `calendario`, `mapa`, `clima`, `cosechas`, `sanidad`, `inventario`, `compras`, `ventas`, `personal`, `finanzas`, `reportes`, `auditoria`, `ajustes`. Archivos: `comercial.js` (compras y ventas), `personal.js`, `reportes.js` (reportes y auditoría), `produccion.js` (cosechas, sanidad, inventario), `finanzas.js` (finanzas, configuración y libro Excel).

Las vistas reciben `props.query` (parámetros tras `?` en el hash, p. ej. `#/finanzas?tab=presupuesto`, `#/inventario?tab=movimientos&i=<id>`, `#/reportes?r=consolidado`). La vista se vuelve a montar al cambiar la ruta, los parámetros o la finca activa.

## Reglas que NO se deben romper

1. **Tailwind y clases dinámicas.** `css/tailwind.css` se genera escaneando `index.html` y `js/**/*.js` en busca de nombres de clase **literales**. Nunca construyas clases por concatenación (`'bg-' + color`). Los tonos de color están en la tabla literal `TONES` de `js/catalog.js`; para un color nuevo, añade su entrada completa ahí. Después de tocar clases: `npm run build:css` y commitea el CSS.
2. **Fechas.** Todas las fechas son cadenas ISO `YYYY-MM-DD` en hora local. Usa siempre `AP.utils` (`parseDate`, `diffDays`, `addDays`, `toISO`, `today`). Nunca `new Date('YYYY-MM-DD')` (se interpreta en UTC y desfasa un día; además falla en Safari con otros formatos).
3. **IDs son cadenas.** Se generan con `AP.utils.uid()`. Los datos de la v1 traían IDs numéricos; los normalizadores los convierten a texto. Compara con `===` sobre cadenas.
4. **Datos y migraciones.** Clave de almacenamiento: `agropina_v3` (más la caché `agropina_weather`), con todas las fincas: `{ fincaActiva, fincas, prefs, datos: { [fincaId]: {...} } }`. Cada colección pasa por su normalizador en `store.js` (`N.parcela`, `N.labor`, `N.orden`, …) al cargar, importar y guardar. Si añades un campo: agrégalo al normalizador **con valor por defecto**, para que respaldos viejos sigan cargando. Si añades una colección: agrégala a `COLLECTIONS` y `NORM`. `agropina_v2` y la v1 (`agropina_parcelas`, `agropina_actividades`) se migran automáticamente: no borres esas rutas.
   - `AP.store.state` contiene **solo la finca activa**; las otras viven serializadas en `almacen`. Para datos de todas las fincas usa `S.todasLasFincas()`.
   - Preferencias del usuario (tema, densidad, menú, notificaciones leídas, usuario) van en `state.prefs`, **no** en `settings` (que es por finca).
5. **Cambios de datos solo vía `AP.store`** (`saveParcela`, `saveLabor`, `cambiarEstadoLabor`, `deleteLabor`, `movimientoInsumo`, `saveOrden`/`aprobarOrden`/`recibirOrden`, `saveCosecha`, `registrarCobro`, `saveTrabajador`, `crearFinca`/`cambiarFinca`, …). Ahí viven las reglas de inventario, ciclo, deshacer y **auditoría** (`audit(accion, entidad, descripcion)`). No mutes colecciones desde las vistas. Toda acción nueva que cambie datos debe registrar un evento de auditoría.
   - Cálculos sin estado (totales, períodos, saldos, semáforos) van en `js/negocio.js` como funciones puras, con prueba en `tests/negocio.test.js`.
6. **Reglas de negocio que conectan módulos** (detalle en `CONTINUIDAD.md`): solo una labor **realizada** descuenta stock, registra movimientos y suma costo/planilla; editar la revierte y reaplica; eliminar la deshace; la mano de obra se calcula con el personal asignado; una inducción floral realizada fija `fechaInduccion`; una cosecha con «cierra ciclo» pasa la parcela a Soca; recibir una OC da entrada al inventario con costo promedio; una cosecha `pendiente` entra en cuentas por cobrar hasta `registrarCobro`; las carencias (PHI) avisan pero no bloquean.
7. **Sin CDN en la app real.** Si agregas una librería: instálala con npm, cópiala en `scripts/vendor.mjs`, carga el script desde `index.html` y agrégala a `SHELL` en `sw.js`.
8. **Service worker.** Si añades, renombras o quitas archivos precargados, actualiza `SHELL` en `sw.js` y **sube el número de `VERSION`** (si no, los usuarios siguen viendo la versión anterior en caché). Mantén iguales `VERSION` de `sw.js`, `AP.VERSION` (`js/app.js`) y `version` de `package.json`.
9. **Interfaz (estilo empresarial).** Modo claro y oscuro (clase `dark` en `<html>`) y densidad compacta (clase `compact`). Móvil (menú inferior) y escritorio (barra de sistema + menú lateral). Toda pantalla usa `<ap-page-header>` (migas según el grupo de `NAV`, acciones, `#facets` con indicadores y `#tabs`), `<ap-tile>` para KPI y `<ap-data-table>` para listados (con `id` único, `export-name` y totales). Debe verse bien a 390, 768, 1 024 y 1 440 px, sin desplazamiento horizontal de la página (en grids usa `min-w-0` en los hijos). Mensajes en español claro; nunca errores técnicos crudos (`Failed to fetch`).
10. **Estados sin datos.** Toda lista o gráfico necesita estado vacío (`<ap-empty>`) y toda dependencia de red necesita estado de error con «Reintentar». Un indicador de carga nunca debe quedar eterno.

## Cómo añadir cosas

- **Vista nueva:** crear `js/views/<nombre>.js` que defina `AP.views.<nombre> = { props: { query: Object }, setup(props){…}, template: \`…\` }`, añadir su `<script>` en `index.html` (antes de `app.js`), su entrada en `VIEWS` y en el grupo correcto de `NAV` de `js/app.js` (aparece sola en la paleta de comandos), y su archivo en `SHELL` de `sw.js`. Añádela a la lista de `tests/e2e/capturas.js`.
- **Reporte nuevo:** agrégalo al `catalogo()` de `js/views/reportes.js` (`id`, `area`, `icon`, `titulo`, `desc`, `cols`, `rows`).
- **Formulario nuevo:** añadir `Form<Nombre>` en `js/forms.js`, exportarlo en `AP.forms`, abrirlo con `AP.store.openForm('<nombre>', datos)`.
- **Nuevo campo de parcela/labor/etc.:** normalizador (regla 4) → formulario → vista (columna de la tabla) → hoja de Excel en `js/views/finanzas.js` (`AP.reportes.excel`) → respaldo ya lo incluye automáticamente.
- **Nueva regla agronómica:** va en `js/agronomy.js` como función pura, con prueba en `tests/agronomy.test.js`.

## Pruebas y verificación

- `npm test` debe quedar en verde (18 pruebas: motor agronómico y lógica ERP) antes de cada commit.
- Si tocas reglas de negocio, ejecuta `node tests/e2e/reglas-v3.js` (debe terminar en «TODO CORRECTO»).
- Cambios de interfaz: verifica en un navegador real (Chromium + Playwright están en el entorno cloud: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; no ejecutes `playwright install`). Usa los scripts de `tests/e2e/`. El clima real no es accesible desde el entorno cloud: simúlalo interceptando `**/api.open-meteo.com/**` (ver `tests/e2e/capturas.js`).
- Revisa visualmente capturas de escritorio, móvil y modo oscuro cuando cambies diseño.

## Trampas conocidas del entorno

- **SheetJS y nombres con tildes:** `XLSX.writeFile` descarga el archivo como `download` si el nombre contiene caracteres no ASCII. Normaliza siempre los nombres de archivo (ver `AP.reportes.excel`).
- El proxy del entorno cloud **bloquea** unpkg, jsdelivr, cdn.tailwindcss.com, cdn.sheetjs.com y open-meteo (403). `registry.npmjs.org` sí funciona: por eso las librerías se instalan con npm y se versionan en `vendor/`.
- `python3 -m http.server` no envía `charset` en los `.js`: una página sin `<meta charset="utf-8">` mostrará caracteres rotos y errores de regex. `index.html` lo declara; la copia de vista previa no (el publicador lo añade), así que para probarla localmente agrega la meta.
- `pkill -f "<patrón>"` puede matar tu propio shell si el patrón aparece en el comando que lo ejecuta (código de salida 144).
- `vendor/xlsx.full.min.js` contiene un byte ESC: la herramienta Artifact lo rechaza al publicar. Por eso la vista previa va sin Excel.
- La app arranca en `DOMContentLoaded`: cualquier script que use `AP.store.state` desde `index.html` debe esperar a ese evento (ver la carga de la demo en `scripts/build-preview.py`).
- El build de producción de Vue **no** avisa de componentes o props inexistentes: revisa las capturas, no solo la consola.
- Vista previa en claude.ai (Artifact): el visor bloquea `fetch` externo, imágenes/teselas externas, service workers, descargas y `alert/confirm`. Sirve para mostrar el diseño, no para validar clima real ni mapa satelital. Se publica con `scripts/build-preview.py`.
- Para actualizar el Artifact existente desde otra conversación hay que leerlo primero y publicar pasando su `url` (ver `CONTINUIDAD.md`).

## Flujo de trabajo y git

- Rama de trabajo asignada: **`claude/zen-goldberg-xdoq26`**. No empujes a otras ramas sin permiso.
- **No crees pull requests** salvo que el usuario lo pida explícitamente. (El PR #1, de la rama de trabajo hacia `main`, ya existe: añade commits a esa rama en vez de abrir otro.)
- Commits en español, asunto corto + cuerpo con el porqué. Termina cada commit con las líneas de atribución que indique la sesión (`Co-Authored-By: …` y `Claude-Session: …`).
- `git push -u origin <rama>`; si falla por red, reintenta hasta 4 veces con espera de 2, 4, 8 y 16 s.
- No commitees `node_modules/` (está en `.gitignore`). Sí se commitean `vendor/` y `css/tailwind.css` porque la app se publica tal cual, sin paso de compilación.
- Antes de dar por cerrada una tarea: tests en verde, `npm run build:css` si tocaste clases, actualizar `CHANGELOG.md`, `CONTINUIDAD.md` y `PUNTO_DE_REANUDACION.md`.

## Cómo informar al usuario

Dile qué cambió y qué verificaste de verdad. Si algo no se pudo probar (clima real, mapa satelital, instalación PWA en un móvil real, etc.), dilo expresamente en vez de darlo por hecho.
