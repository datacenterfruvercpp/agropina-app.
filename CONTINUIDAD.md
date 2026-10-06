# CONTINUIDAD · AgroPiña Pro

Documento vivo con todo el contexto necesario para retomar el proyecto sin haber estado en las sesiones anteriores. Se actualiza al final de cada sesión. Lo que sigue por hacer está en `PUNTO_DE_REANUDACION.md`; las reglas de trabajo, en `AGENTS.md`; el detalle de cambios, en `CHANGELOG.md`.

**Última actualización:** 2026-10-06 (el usuario pasó a trabajar en `facto-cr`; este proyecto queda en pausa) · versión 2.0.1 · rama `claude/zen-goldberg-xdoq26`

## 1. Objetivo

El usuario (cuenta `datacenter.fruver.cpp@gmail.com`, organización `datacenterfruvercpp`) tiene un repositorio `agropina-app` con una app de gestión para fincas de piña. Pidió un **rediseño total «premium»**, revisar la funcionalidad a fondo, compararla con los líderes del mercado (Agrivi, Cropwise, FieldView, Farmbrite) e implementar todas las mejoras. Eso quedó hecho en la versión 2.0.

## 2. Estado actual

| Aspecto | Estado |
|---|---|
| Código | Completo y empujado a `claude/zen-goldberg-xdoq26` (`main` aún tiene la v1) |
| Pruebas unitarias | 9/9 en verde (`npm test`) |
| Pruebas de navegador | Verificadas con Chromium simulado: 12 vistas, 6 formularios, escritorio/móvil/oscuro, sin errores JS |
| Pull request | Creado el 2026-10-06: https://github.com/datacenterfruvercpp/agropina-app./pull/1 (`claude/zen-goldberg-xdoq26` → `main`), sin fusionar |
| Publicación propia (GitHub Pages) | **Pendiente**; el usuario aún no la activó |
| Vista previa en claude.ai | Publicada (privada): https://claude.ai/artifact/TA9Xs68tdJ9z1SVfVEHE8n |
| Clima real, mapa satelital, GPS, instalación PWA, modo sin conexión | **No verificados** en un dispositivo real (el entorno cloud bloquea esos servicios) |

El usuario revisó la vista previa desde su laptop y reportó dos fallos (clima y «Ventana de aplicación» sin cargar). Ambos se atendieron (ver 2.0.1). Está pendiente su siguiente comentario.

## 3. Historial de sesiones

**Sesión 2026-10-05 → 06**

1. *«Lee el repositorio»*: se leyó `index.html` (v1) y se resumieron sus funciones y 5 fallos.
2. *«Analízalo, reestructúralo, modernízalo, hazlo premium, compáralo con el mercado»*: se escribió la v2.0 completa (commit `16ce756`). Se probó en Chromium con el clima simulado; se corrigieron: CSS gigante por una `safelist` de Tailwind (6,3 MB → 83 KB usando una tabla literal de tonos), fila de ventanas de aplicación incompleta, etiquetas truncadas, aviso de stock insuficiente que no aparecía al completar una labor programada, nombre del Excel (la primera solución con acentos Unicode falló: SheetJS descarga como `download` si hay tildes; se resolvió en 2.0.1 quitando los acentos).
3. *«¿Puedo verla desde el móvil?»*: se explicó GitHub Pages (el agente no puede activarlo; requiere ajustes del repositorio).
4. *«Muéstrame la app»* (el usuario estaba en la laptop): se publicó como Artifact. La librería de Excel se tuvo que excluir (byte ESC).
5. *«El clima no carga y la ventana de aplicación tampoco»*: causa: el visor bloquea `fetch` externo (esperado) **y** la tarjeta se quedaba en esqueleto eterno (error mío). Se arregló el estado de error, se mejoró el mensaje y se añadió el pronóstico simulado marcado «Simulado» para la vista previa (commit `7cfc86c`).
6. *«Documenta todo… continuidad, punto de reanudación y agents»*: estos documentos (2.0.1).

## 4. Decisiones de diseño y por qué

- **Sin bundler ni CDN.** Vue como build global + scripts ordenados bajo `window.AP`. Razón: que el repositorio se publique tal cual en GitHub Pages sin paso de compilación, y que funcione sin conexión en el campo. Coste: sin tipos ni módulos ES; se compensa con una estructura estricta.
- **Librerías y CSS commiteados** (`vendor/`, `css/tailwind.css`): mismo motivo. Se regeneran con `npm run build`.
- **Tailwind con clases literales.** Una `safelist` por patrón generaba 6,3 MB; se reemplazó por la tabla `TONES` en `js/catalog.js`.
- **`localStorage` como única persistencia.** Cero costo y cero cuentas. Límites: ~5 MB, un solo dispositivo, sin colaboración. Mitigación: respaldo JSON y Excel. La sincronización en la nube queda en el backlog.
- **Estado reactivo propio** (`reactive` de Vue) en `store.js`, sin Pinia/Vuex, para no sumar dependencias.
- **Fechas como texto ISO local** y utilidades propias, para evitar desfases de zona horaria y fallos de Safari.
- **IDs de texto** (`uid()`), con conversión de los IDs numéricos de la v1.
- **Enrutador por hash** (`#/parcelas/p1`) porque funciona en hosting estático y dentro del visor del Artifact.
- **Parámetros agronómicos como estimaciones de referencia.** Los eligió el asistente; **el usuario debe validarlos** (ver 6).
- **Clima: Open-Meteo** (gratuito, sin clave, con ET₀, probabilidad de lluvia y horario). Caché de 30 minutos y copia local para ver el último pronóstico sin conexión.
- **Mapa: Leaflet** con imágenes Esri World Imagery (sin clave) y OpenStreetMap; teselas cacheadas por el service worker.

## 5. Modelo de datos (`localStorage['agropina_v2']`)

Objeto `{ app, version, exportedAt, settings, parcelas, labores, insumos, cosechas, monitoreos, movimientos }`. Todo pasa por los normalizadores `N.*` de `js/store.js`.

- **settings:** `finca`, `propietario`, `moneda` (USD por defecto), `tema` (`system|light|dark`), `umbralLluvia` (20 mm), `precioReferencia` (280 por tonelada), `ubicacion` `{lat, lon, nombre, fuente}`, `onboarded`.
- **parcelas:** `id`, `nombre`, `codigo`, `variedad`, `hectareas`, `densidad?`, `pesoFruto?`, `aprovechamiento?`, `fechaSiembra`, `fechaInicioCiclo`, `fechaInduccion|null`, `ciclo` (1 = planta, 2 = Soca 1…), `estado` (`activa|archivada`), `color`, `lat`, `lon`, `poligono` `[[lat,lon]…]`, `notas`.
- **labores:** `id`, `parcelaId`, `tipo`, `fecha`, `estado` (`completada|pendiente`), `descripcion`, `responsable`, `jornales`, `costoManoObra`, `otrosCostos`, `insumos[{insumoId, cantidad, dosisHa, costoUnitario, nombre, unidad, carencia}]`, `costoInsumos`, `costoTotal`, `stockAplicado`.
- **insumos:** `id`, `nombre`, `categoria`, `unidad`, `stock`, `stockMinimo`, `costoUnitario`, `carencia` (días), `ingredienteActivo`, `proveedor`.
- **cosechas:** `id`, `parcelaId`, `fecha`, `toneladas`, `cajas?`, `exportable?`, `brix?`, `precio`, `destino`, `comprador`, `ciclo`, `cierraCiclo`, `cicloCerrado`.
- **monitoreos:** `id`, `parcelaId`, `fecha`, `plaga` (clave del catálogo), `severidad` 1–5, `incidencia?`, `muestras?`, `accion`, `notas`.
- **movimientos:** `id`, `insumoId`, `fecha`, `tipo` (`entrada|salida|ajuste`), `cantidad`, `costoUnitario`, `referencia` (id de labor), `nota`.

Compatibilidad con la v1: `agropina_parcelas` + `agropina_actividades` (y respaldos JSON con `actividades`) se convierten en parcelas y labores realizadas. «Deshierbe» → «Control de malezas», «Control de Plagas» → «Aplicación fitosanitaria», «Inducción Floral» → «Inducción floral».

## 6. Reglas de negocio y valores de referencia

**Fenología** (`A.estado`). Días = hoy − inicio del ciclo. Inducción estimada = inicio + `diasInduccion` (MD-2: 270 días planta, 210 soca). Cosecha estimada = inducción + `diasCosecha` (155). Fases sin inducción registrada: planta con < 90 días → Establecimiento; hasta `diasInduccion − 30` → Vegetativo; después → Lista para inducción (atrasada si superó `diasInduccion + 15`). Con inducción (días post-inducción *d*): < 60 Floración; < 155 − 25 Fruto; < 155 − 5 Maduración; después En cosecha. Siembra futura → Planificada.

**Producción:** `densidad × ha × aprovechamiento × peso de fruta / 1000` toneladas. Aprovechamiento 90 % en planta y 80 % en soca; peso × 0,85 en soca. Una caja = 12 kg.

**Parámetros por variedad** (`js/catalog.js`, en kg y plantas/ha; días de inducción planta / soca / de inducción a cosecha):
MD-2 1,8 · 65 000 · 270/210/155 · Golden 1,7 · 65 000 · 270/210/155 · Cayena Lisa 2,0 · 50 000 · 300/230/165 · Pernambuco 1,3 · 40 000 · 330/250/170 · Española Roja 1,2 · 45 000 · 300/230/165 · Queen Victoria 0,9 · 60 000 · 270/200/150 · Otra 1,5 · 50 000 · 300/220/160.
> **Son estimaciones del asistente, no datos del usuario ni de una fuente agronómica verificada.** Validarlas con el agrónomo de la finca y ajustarlas por parcela (ficha → Parámetros avanzados) o en `catalog.js`.

**Labores e inventario.** Completar una labor descuenta stock y crea movimientos de salida; editarla revierte y reaplica; eliminarla devuelve el stock (con «Deshacer»). Una labor programada no toca el stock hasta completarse. Si faltara stock, avisa y deja el saldo negativo (visible como alerta). Registrar en varias parcelas crea una labor por parcela y reparte mano de obra, otros costos e insumos proporcionalmente al área.

**Inducción floral completada** fija `fechaInduccion` de la parcela si estaba vacía y la fecha es del ciclo actual.

**Cosecha con «último pase»** → `ciclo + 1`, `fechaInicioCiclo` = fecha de la cosecha, `fechaInduccion = null`; la cosecha queda como `cicloCerrado`.

**Carencias (PHI):** una aplicación completada con producto de carencia *c* deja la parcela con carencia hasta `fecha + c`. Se avisa en Inicio, ficha, listado de parcelas, formulario de cosecha y recomendaciones; **no bloquea** el guardado de la cosecha, solo advierte.

**Costo promedio ponderado** al registrar entradas de inventario. **Ajuste por conteo** fija el stock contado y deja el movimiento con la diferencia.

**Ventanas de aplicación** (por hora): no apta de noche (< 6 h o > 18 h), con lluvia (> 0,1 mm, o > 0,3 mm en las 3 h siguientes), viento > 15 km/h, temperatura > 32 °C o probabilidad ≥ 50 %; aceptable con probabilidad ≥ 25 %, viento > 10 o < 3 km/h, temperatura > 29 °C o humedad < 50 %; el resto, óptima. Se muestran tramos de al menos 2 horas.

**Alertas de clima:** lluvia ≥ umbral (20 mm por defecto); ≥ 60 mm en 3 días → Phytophthora; ráfagas ≥ 35 km/h; máxima ≥ 33 °C → golpe de sol; balance (lluvia − ET₀) < −20 mm → déficit hídrico.

## 7. Entorno de trabajo (sesiones cloud)

- Repositorio local: `/home/user/agropina-app.` (el nombre termina en punto; es el nombre real del repo en GitHub).
- Node 22 con Playwright global (`NODE_PATH=$(npm root -g)`) y Chromium en `/opt/pw-browsers`.
- Proxy: solo funcionan `registry.npmjs.org`, GitHub y los dominios de Anthropic; el resto da 403. Detalles y trampas en `AGENTS.md`.
- No hay CLI `gh`; GitHub se maneja con las herramientas MCP `mcp__github__*` (las herramientas diferidas se cargan con `ToolSearch`).
- Carpeta temporal de la sesión (se pierde): capturas y la copia de vista previa. Todo lo importante está ya en el repositorio.

### Vista previa en claude.ai (Artifact)

URL: https://claude.ai/artifact/TA9Xs68tdJ9z1SVfVEHE8n (privada; solo el propietario). Última versión publicada: 2 (equivale a 2.0.0 + correcciones de clima).
Para actualizarla desde una conversación nueva: `python3 scripts/build-preview.py <carpeta>` (imprime la lista de archivos), luego con la herramienta Artifact: `action: "read"` de la URL (obligatorio la primera vez) y publicar `file_path=<carpeta>/index.html`, `root=<carpeta>`, `files=<lista>` y `url=<URL>`. La vista previa **no** tiene Excel, clima real ni teselas del mapa (límites del visor).

## 8. Limitaciones y problemas conocidos

- Datos solo en el dispositivo y en el navegador usado; borrar datos del sitio los elimina. Mitigación: respaldo JSON periódico.
- Sin multiusuario ni sincronización.
- El pronóstico de Open-Meteo es un modelo global, no una estación local; la precisión por finca puede variar.
- Las teselas satelitales gratuitas de Esri tienen resolución variable según la zona.
- En iPhone, la geolocalización y el modo sin conexión dependen de Safari y de abrir la app por `https`.
- `vendor/xlsx.full.min.js` (SheetJS 0.18.5 de npm) contiene un byte ESC; no impide su uso, solo la publicación como Artifact.
- No hay adjuntos ni fotos: el respaldo JSON y el Excel solo contienen datos.
- No hay pruebas automáticas de las vistas en CI; las de `tests/e2e/` se ejecutan a mano.

## 9. Ideas pendientes (backlog, sin comprometer)

1. Publicar en GitHub Pages y configurar la rama de despliegue.
2. Sincronización/copia en la nube (p. ej. Supabase o Firebase) y multiusuario con roles.
3. Fotos de monitoreo y de cosecha (adjuntos), con geoetiqueta.
4. Notificaciones locales (labores del día, carencias por vencer, alertas de lluvia).
5. Informe PDF por parcela y por ciclo para auditorías (GlobalG.A.P., exportadoras).
6. Planilla de personal y pago de jornales; costos fijos e indirectos.
7. Programa de fertilización por fase con recomendación de dosis.
8. Escenarios de precio y punto de equilibrio por parcela.
9. Importar parcelas desde KML/GeoJSON y exportar el mapa.
10. Idiomas (inglés/portugués) y soporte de otras zonas climáticas.
11. CI con GitHub Actions: `npm test` y pruebas de navegador.

## 10. Glosario

**Inducción floral:** aplicación (etefón/ácido) que fuerza la floración uniforme. **Soca:** ciclo de rebrote posterior a la primera cosecha. **PHI / carencia:** días mínimos entre una aplicación y la cosecha. **ET₀:** evapotranspiración de referencia (mm/día). **°Brix:** contenido de azúcares de la fruta. **Phytophthora:** hongo que causa pudrición del cogollo. **Exportable:** porcentaje de fruta que cumple calibre y calidad de exportación. **Caja:** 12 kg de fruta (convención usada por la app).
