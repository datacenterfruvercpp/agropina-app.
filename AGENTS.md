# AGENTS.md · AgroPiña Pro

Instrucciones para agentes (Claude Code u otros) que trabajen en este repositorio. Léelo completo antes de tocar código. El estado del proyecto está en `CONTINUIDAD.md` y el siguiente paso concreto en `PUNTO_DE_REANUDACION.md`.

## Qué es

PWA de gestión para fincas de piña (Costa Rica como contexto por defecto). Sin backend: todo corre en el navegador y los datos viven en `localStorage`. Idioma de la interfaz y de los comentarios: **español**. El usuario habla español; responde en español.

Pila: Vue 3 (build global, sin SFC ni bundler), Tailwind compilado, Chart.js, Leaflet, SheetJS, Font Awesome. Todas las librerías están **dentro del repo** (`vendor/`), no se usa ningún CDN.

## Comandos

```bash
npm install            # solo para desarrollo; no es necesario para usar la app
npm run build          # vendor (copia librerías desde node_modules) + compila Tailwind
npm run build:css      # recompila css/tailwind.css (hacer SIEMPRE tras cambiar clases)
npm test               # pruebas unitarias del motor agronómico (node --test tests/*.test.js)
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
js/weather.js           AP.weather Open-Meteo (clima y geocodificación) + caché local
js/store.js             AP.store   estado reactivo, persistencia, migraciones, reglas de negocio
js/demo.js              AP.demo    finca de demostración (fechas relativas a hoy)
js/ui.js                AP.ui      componentes base (modal, gráfico, toasts, stat, mapa mini…)
js/forms.js             AP.forms   formularios (parcela, labor, cosecha, monitoreo, insumo, movimiento)
js/views/*.js           AP.views   una vista por archivo (ver tabla)
js/app.js               AP.router, layout, registro de componentes y arranque
sw.js                   Service worker (offline)
src/tailwind.css + tailwind.config.js    sistema de diseño → css/tailwind.css (generado, SE COMMITEA)
vendor/                 Librerías (generado por scripts/vendor.mjs, SE COMMITEA)
```

Orden de carga en `index.html`: vendor → `utils` → `catalog` → `agronomy` → `weather` → `store` → `demo` → `ui` → `forms` → `views/*` → `app`. Todo cuelga del espacio de nombres global `window.AP`.

Vistas (`AP.views.<nombre>` ↔ ruta `#/<nombre>`): `dashboard`, `parcelas`, `parcela` (`#/parcelas/<id>`), `labores`, `calendario`, `mapa`, `clima`, `cosechas`, `sanidad`, `inventario`, `finanzas`, `ajustes`.

## Reglas que NO se deben romper

1. **Tailwind y clases dinámicas.** `css/tailwind.css` se genera escaneando `index.html` y `js/**/*.js` en busca de nombres de clase **literales**. Nunca construyas clases por concatenación (`'bg-' + color`). Los tonos de color están en la tabla literal `TONES` de `js/catalog.js`; para un color nuevo, añade su entrada completa ahí. Después de tocar clases: `npm run build:css` y commitea el CSS.
2. **Fechas.** Todas las fechas son cadenas ISO `YYYY-MM-DD` en hora local. Usa siempre `AP.utils` (`parseDate`, `diffDays`, `addDays`, `toISO`, `today`). Nunca `new Date('YYYY-MM-DD')` (se interpreta en UTC y desfasa un día; además falla en Safari con otros formatos).
3. **IDs son cadenas.** Se generan con `AP.utils.uid()`. Los datos de la v1 traían IDs numéricos; los normalizadores los convierten a texto. Compara con `===` sobre cadenas.
4. **Datos y migraciones.** Clave de almacenamiento: `agropina_v2` (más la caché `agropina_weather`). Cada colección pasa por su normalizador en `store.js` (`N.parcela`, `N.labor`, …) al cargar, importar y guardar. Si añades un campo: agrégalo al normalizador **con valor por defecto**, para que respaldos viejos sigan cargando. La v1 (`agropina_parcelas`, `agropina_actividades`) se migra automáticamente: no borres esa ruta.
5. **Cambios de datos solo vía `AP.store`** (`saveParcela`, `saveLabor`, `completarLabor`, `deleteLabor`, `movimientoInsumo`, `saveCosecha`, …). Ahí viven las reglas de inventario, ciclo y deshacer. No mutes colecciones desde las vistas.
6. **Reglas de negocio que conectan módulos** (detalle en `CONTINUIDAD.md`): una labor realizada descuenta stock y registra movimientos; editar la revierte y reaplica; eliminar la deshace; una inducción floral realizada fija `fechaInduccion` de la parcela; una cosecha con «cierra ciclo» pasa la parcela a Soca; las carencias (PHI) avisan si se cosecha dentro del período (no bloquean el guardado).
7. **Sin CDN en la app real.** Si agregas una librería: instálala con npm, cópiala en `scripts/vendor.mjs`, carga el script desde `index.html` y agrégala a `SHELL` en `sw.js`.
8. **Service worker.** Si añades, renombras o quitas archivos precargados, actualiza `SHELL` en `sw.js` y **sube el número de `VERSION`** (si no, los usuarios siguen viendo la versión anterior en caché). Mantén iguales `VERSION` de `sw.js`, `AP.VERSION` (`js/app.js`) y `version` de `package.json`.
9. **Interfaz.** Modo claro y oscuro (clase `dark` en `<html>`), móvil primero (menú inferior) y escritorio (barra lateral). Cualquier pantalla nueva debe verse bien a 390 px y a 1440 px, en ambos temas. Mensajes en español claro; nunca mostrar errores técnicos crudos (`Failed to fetch`).
10. **Estados sin datos.** Toda lista o gráfico necesita estado vacío (`<ap-empty>`) y toda dependencia de red necesita estado de error con «Reintentar». Un indicador de carga nunca debe quedar eterno.

## Cómo añadir cosas

- **Vista nueva:** crear `js/views/<nombre>.js` que defina `AP.views.<nombre> = { setup(){…}, template: \`…\` }`, añadir su `<script>` en `index.html` (antes de `app.js`), su entrada en `VIEWS` y `NAV` de `js/app.js`, y su archivo en `SHELL` de `sw.js`.
- **Formulario nuevo:** añadir `Form<Nombre>` en `js/forms.js`, exportarlo en `AP.forms`, abrirlo con `AP.store.openForm('<nombre>', datos)`.
- **Nuevo campo de parcela/labor/etc.:** normalizador (regla 4) → formulario → vista → hoja de Excel en `js/views/finanzas.js` (`AP.reportes.excel`) → respaldo ya lo incluye automáticamente.
- **Nueva regla agronómica:** va en `js/agronomy.js` como función pura, con prueba en `tests/agronomy.test.js`.

## Pruebas y verificación

- `npm test` debe quedar en verde (9 pruebas del motor agronómico) antes de cada commit.
- Cambios de interfaz: verifica en un navegador real (Chromium + Playwright están en el entorno cloud: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; no ejecutes `playwright install`). Usa los scripts de `tests/e2e/`. El clima real no es accesible desde el entorno cloud: simúlalo interceptando `**/api.open-meteo.com/**` (ver `tests/e2e/capturas.js`).
- Revisa visualmente capturas de escritorio, móvil y modo oscuro cuando cambies diseño.

## Trampas conocidas del entorno

- **SheetJS y nombres con tildes:** `XLSX.writeFile` descarga el archivo como `download` si el nombre contiene caracteres no ASCII. Normaliza siempre los nombres de archivo (ver `AP.reportes.excel`).
- El proxy del entorno cloud **bloquea** unpkg, jsdelivr, cdn.tailwindcss.com, cdn.sheetjs.com y open-meteo (403). `registry.npmjs.org` sí funciona: por eso las librerías se instalan con npm y se versionan en `vendor/`.
- `python3 -m http.server` no envía `charset` en los `.js`: una página sin `<meta charset="utf-8">` mostrará caracteres rotos y errores de regex. `index.html` lo declara; la copia de vista previa no (el publicador lo añade), así que para probarla localmente agrega la meta.
- `pkill -f "<patrón>"` puede matar tu propio shell si el patrón aparece en el comando que lo ejecuta (código de salida 144).
- `vendor/xlsx.full.min.js` contiene un byte ESC: la herramienta Artifact lo rechaza al publicar. Por eso la vista previa va sin Excel.
- Vista previa en claude.ai (Artifact): el visor bloquea `fetch` externo, imágenes/teselas externas, service workers, descargas y `alert/confirm`. Sirve para mostrar el diseño, no para validar clima real ni mapa satelital. Se publica con `scripts/build-preview.py`.
- Para actualizar el Artifact existente desde otra conversación hay que leerlo primero y publicar pasando su `url` (ver `CONTINUIDAD.md`).

## Flujo de trabajo y git

- Rama de trabajo asignada: **`claude/zen-goldberg-xdoq26`**. No empujes a otras ramas sin permiso.
- **No crees pull requests** salvo que el usuario lo pida explícitamente.
- Commits en español, asunto corto + cuerpo con el porqué. Termina cada commit con las líneas de atribución que indique la sesión (`Co-Authored-By: …` y `Claude-Session: …`).
- `git push -u origin <rama>`; si falla por red, reintenta hasta 4 veces con espera de 2, 4, 8 y 16 s.
- No commitees `node_modules/` (está en `.gitignore`). Sí se commitean `vendor/` y `css/tailwind.css` porque la app se publica tal cual, sin paso de compilación.
- Antes de dar por cerrada una tarea: tests en verde, `npm run build:css` si tocaste clases, actualizar `CHANGELOG.md`, `CONTINUIDAD.md` y `PUNTO_DE_REANUDACION.md`.

## Cómo informar al usuario

Dile qué cambió y qué verificaste de verdad. Si algo no se pudo probar (clima real, mapa satelital, instalación PWA en un móvil real, etc.), dilo expresamente en vez de darlo por hecho.
