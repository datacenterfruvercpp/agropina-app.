# Historial de cambios

Formato: más reciente primero. Fechas en formato AAAA-MM-DD.

## 2.0.1 · 2026-10-06

### Corregido
- **Inicio:** la tarjeta «Ventana de aplicación» se quedaba cargando para siempre cuando el pronóstico fallaba. Ahora muestra «Sin pronóstico» con botón «Reintentar».
- **Clima:** el error técnico `Failed to fetch` se reemplazó por «No se pudo conectar con el servicio de clima. Verifique su conexión a internet.». Se quitó el texto duplicado en la pantalla y en el aviso.
- **Excel:** el archivo se descargaba como `download` cuando el nombre de la finca tenía tildes (p. ej. «La Piñera»); ahora se normaliza a letras y números sin acentos (`AgroPina_Reporte_Finca_La_Pinera_AAAA-MM-DD.xlsx`).
- **Modo sin conexión:** el service worker no precargaba la librería de Excel (`vendor/xlsx.full.min.js`), por lo que exportar a Excel sin conexión fallaba la primera vez. Ahora se precarga.

### Añadido
- Soporte de **pronóstico simulado** (`state.weather.simulated`): se marca con la etiqueta «Simulado» en el inicio y con un aviso en Clima y riesgo. Lo usa la vista previa de claude.ai, donde el clima real está bloqueado.
- `scripts/build-preview.py` y `scripts/preview-weather.js`: generan la copia de la app para publicarla como Artifact de claude.ai.
- `tests/e2e/`: pruebas de navegador con Playwright (capturas, reglas de negocio y formulario multiparcela).
- Documentación: `AGENTS.md`, `CLAUDE.md`, `CONTINUIDAD.md`, `PUNTO_DE_REANUDACION.md` y este archivo.

### Cambiado
- Versión 2.0.1 en `package.json`, `js/app.js` y caché del service worker (`agropina-v2.0.1`).

Commits: `7cfc86c` (correcciones de clima) y `a4d6d4c` (documentación). Pull request #1 abierto contra `main`.

## 2.0.0 · 2026-10-05 · Rediseño total

Reescritura completa del repositorio (commit `16ce756`). El archivo único `index.html` (791 líneas, Vue + Tailwind desde CDN) pasó a una aplicación modular de unas 4 000 líneas de JavaScript.

### Arquitectura
- Módulos por responsabilidad (`utils`, `catalog`, `agronomy`, `weather`, `store`, `demo`, `ui`, `forms`, `views/*`, `app`) sobre el espacio de nombres `window.AP`.
- Librerías locales en `vendor/` (Vue 3.5, Chart.js 4, Leaflet 1.9, SheetJS 0.18, Font Awesome 6.7, Plus Jakarta Sans). **Sin CDN**.
- Tailwind compilado (83 KB) con sistema de diseño propio (`tailwind.config.js`, `src/tailwind.css`).
- PWA instalable: `manifest.webmanifest`, `sw.js` (caché de la aplicación y de teselas de mapa), icono propio.
- Persistencia en `localStorage` (`agropina_v2`) con normalizadores por colección, guardado diferido, aviso si el almacenamiento falla y **migración automática** de los datos y respaldos de la v1.
- Deshacer al eliminar parcelas, labores, cosechas, monitoreos e insumos.

### Diseño
- Barra lateral en escritorio y navegación inferior con botón «+» de registro rápido en móvil; menú «Más».
- Modo claro, oscuro y automático (sin parpadeo inicial).
- Componentes: tarjetas, indicadores, estados vacíos, modales/hojas, avisos, segmentos, chips de fase, esqueletos de carga.
- Impresión de reportes y respeto a `prefers-reduced-motion`.

### Módulos nuevos o rehechos
- **Inicio:** clima y pronóstico de 7 días, 6 indicadores, alertas priorizadas, ventana de aplicación de 24 h, ciclo de cada parcela, agenda, área por fase y producción proyectada a 12 meses.
- **Parcelas:** listado con filtros por fase, búsqueda, orden y archivo; ficha con línea de tiempo fenológica, producción estimada, economía del ciclo, ficha técnica, historial, mapa y recomendaciones.
- **Mapa:** satélite (Esri) u OpenStreetMap, dibujo de linderos, área geodésica en hectáreas y puntos GPS.
- **Labores:** programadas y realizadas; varias parcelas a la vez con reparto de costos por área; insumos con dosis por hectárea; descuento automático de inventario; marcar como realizada con un toque.
- **Calendario:** labores, cosechas, monitoreos y proyecciones de inducción/cosecha.
- **Cosechas:** registro con toneladas, cajas, % exportable, °Brix, destino, comprador y precio; cierre de ciclo hacia Soca; pronóstico a 120 días.
- **Sanidad:** monitoreo de 13 problemas típicos de la piña (más «Otro»), severidad 1–5, mapa de presión parcela × plaga y evolución en 12 semanas.
- **Inventario:** stock, mínimo, costo promedio ponderado, carencia (PHI), entradas, ajustes por conteo e historial de movimientos.
- **Clima y riesgo:** alertas agroclimáticas, 7 días, ventanas de aplicación por hora (72 h), gráfico de 48 h, balance hídrico (lluvia − ET₀), proyección por parcela.
- **Finanzas:** costos por mes y tipo de labor, ingresos, margen, costo por ha y por tonelada, rentabilidad por parcela, proyección de ingresos, exportación a Excel (8 hojas) e impresión.
- **Ajustes:** datos de la finca, moneda (9), precio de referencia, umbral de lluvia, ubicación (búsqueda, GPS o coordenadas), tema, respaldo/restauración JSON, finca de demostración, borrar todo.

### Motor agronómico (`js/agronomy.js`)
- Fenología de 7 fases con ciclo Planta y Soca, inducción real o estimada y cosecha estimada con ventana (−7/+14 días).
- Producción = plantas/ha × hectáreas × aprovechamiento × peso de fruta (con ajuste para soca).
- Períodos de carencia vigentes por parcela.
- Ventanas de aplicación hora a hora (viento, lluvia, probabilidad, temperatura, humedad) y mejor ventana nocturna para inducción.
- Alertas: lluvia intensa, riesgo de Phytophthora (≥ 60 mm en 3 días), viento ≥ 35 km/h, golpe de sol (≥ 33 °C), déficit hídrico.
- Recomendaciones por parcela según fase, clima, carencias, labores vencidas y monitoreo.

### Corregido respecto a la v1
- El clima **nunca cargaba**: la URL de Open-Meteo estaba envuelta en `<…>` y el navegador la trataba como ruta relativa.
- El gráfico de proyección mostraba fechas inválidas al volver a la pestaña (pasaba etiquetas ya formateadas a `parseSafeDate`).
- Una fecha de siembra futura se contaba como días ya transcurridos (`Math.abs`); ahora la parcela queda «Planificada».
- «Próxima cosecha» tomaba la primera parcela de la lista, no la más cercana.
- Rendimientos fijos por variedad reemplazados por un cálculo con densidad, aprovechamiento y peso.
- SheetJS se cargaba como `xlsx-latest` sin versión fija; ahora está fijado y local.
- Se eliminaron `alert()`/`confirm()` nativos a favor de diálogos propios con deshacer.

### Pruebas
- 9 pruebas unitarias del motor agronómico (`tests/agronomy.test.js`).
- Pruebas de navegador (Chromium/Playwright) de las 12 vistas y 6 formularios en escritorio, móvil y modo oscuro, sin errores de JavaScript; reglas de inventario, deshacer, cierre de ciclo, migración v1, persistencia y exportación a Excel verificadas.

## 1.0 · commit `84ae35f` · «Add files via upload»

`index.html` único con Vue 3, Tailwind, Chart.js y SheetJS desde CDN: parcelas, bitácora, proyecciones de clima, reportes y configuración básica.
