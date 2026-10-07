# AgroPiña Enterprise

ERP agrícola para fincas de piña, con diseño de software empresarial (estilo SAP Fiori, Oracle Redwood y Dynamics 365). Maneja varias fincas y cubre la producción (fenología, labores, cosechas, sanidad, clima), la cadena de suministro (inventario con kardex y compras), el área comercial (ventas y cuentas por cobrar), el personal y la planilla, y las finanzas (presupuesto vs real y rentabilidad). Es una PWA que funciona sin conexión y guarda los datos en el dispositivo.

## Módulos

| Grupo | Módulo | Qué hace |
|---|---|---|
| Inicio | **Panel de control** | Saludo con indicadores, 6 mosaicos (cosecha próxima, costo del mes, ingresos, por cobrar, órdenes de trabajo, inventario), mis tareas, clima y ventana de aplicación, «Requiere atención», ciclo por parcela y gráficos. |
| Producción agrícola | **Parcelas** | Tarjetas o tabla; ficha con línea de tiempo fenológica, producción estimada, ciclos Planta/Soca, economía del ciclo, **presupuesto vs real** y recomendaciones. |
| | **Mapa** | Imagen satelital, linderos con área geodésica y puntos GPS. |
| | **Órdenes de trabajo** | Programada → En proceso → Realizada / Cancelada, prioridad, personal con jornales y tarifa, insumos por hectárea, varias parcelas a la vez; tablero kanban, lista o tabla. Descuenta inventario al realizarse. |
| | **Calendario**, **Clima y riesgo**, **Sanidad vegetal** | Agenda con proyecciones; alertas agroclimáticas, ventanas de aplicación por hora y balance hídrico; monitoreo de plagas con mapa de presión. |
| | **Cosechas** | Pronóstico a 120 días, rendimiento, calidad, destino, cliente, factura y estado de cobro; cierre de ciclo hacia Soca. |
| Cadena de suministro | **Inventario** | Existencias, costo promedio ponderado, mínimo, cantidades en camino, kardex por insumo, entradas y ajustes, carencias (PHI). |
| | **Compras** | Proveedores y órdenes de compra con aprobación y recepción al inventario. |
| Comercial | **Ventas y cobros** | Clientes con crédito, cuentas por cobrar por antigüedad, DSO y cobro individual o masivo. |
| Recursos humanos | **Personal y planilla** | Trabajadores, cuadrillas y tarifas; planilla de jornales por semana, quincena o mes. |
| Finanzas y análisis | **Finanzas** | Resultados (costos, ingresos, márgenes, rentabilidad por parcela), presupuesto vs real con semáforo y proyección de ingresos. |
| | **Centro de reportes** | 10 reportes (consolidado de fincas, cuaderno de campo, kardex, planilla, cartera…) exportables a CSV y Excel, y libro Excel de 16 hojas. |
| Administración | **Auditoría** | Bitácora de cambios con usuario y fecha. |
| | **Configuración** | Finca activa, fincas, presupuesto estándar por hectárea, usuario, tema y densidad, respaldo y restauración. |

En todas las pantallas: **paleta de comandos** (Ctrl+K o «/»), notificaciones, selector de finca, tablas con orden, búsqueda, columnas, selección, totales y exportación, y modo claro/oscuro.

**Cumplimiento (BPA / GlobalG.A.P.):** cada aplicación guarda producto, dosis y carencia. La app avisa si se intenta cosechar dentro del período de carencia.

**Migración:** los datos de la versión 2 (`agropina_v2`) y de la versión 1 (`agropina_parcelas` y `agropina_actividades`), y sus respaldos JSON, se convierten automáticamente.

## Estructura

```
index.html              Carcasa de la app (sin CDN)
css/tailwind.css        Tailwind compilado (generado: npm run build:css)
css/app.css             Estilos complementarios, Leaflet e impresión
js/utils.js             Fechas, formato, geometría, archivos
js/catalog.js           Variedades, fases, labores, plagas, tonos de color
js/agronomy.js          Motor agronómico (fenología, producción, carencias, clima)
js/negocio.js           Lógica ERP (planilla, cuentas por cobrar, presupuesto, compras, kardex)
js/weather.js           Open-Meteo con caché sin conexión
js/store.js             Estado multi-finca, persistencia, migraciones, auditoría y reglas de negocio
js/demo.js              Finca de demostración
js/ui.js, js/forms.js   Componentes y formularios
js/views/*.js           Pantallas
js/app.js               Enrutador, diseño y arranque
vendor/                 Vue 3, Chart.js, Leaflet, SheetJS, Font Awesome, IBM Plex (generado: npm run vendor)
sw.js, manifest.webmanifest  PWA
scripts/                vendor.mjs (copia librerías), build-preview.py (copia para Artifact de claude.ai)
src/tailwind.css, tailwind.config.js  Sistema de diseño
tests/                  Pruebas del motor agronómico y de la lógica ERP (+ tests/e2e: pruebas de navegador)
```

No hace falta compilar para usarla: basta con publicar la carpeta (por ejemplo, en GitHub Pages) o servirla con `npm run serve`. Si se abre `index.html` directamente desde el disco funciona todo, salvo el modo sin conexión (service worker).

## Desarrollo

```bash
npm install
npm run build:todo      # copia las librerías a vendor/ y compila Tailwind
npm run watch:css  # recompila los estilos mientras se edita
npm test           # pruebas unitarias (motor agronómico y lógica ERP)
npm run serve      # http://localhost:8080
```

## Documentación del proyecto

| Archivo | Para qué sirve |
|---|---|
| [`PUNTO_DE_REANUDACION.md`](PUNTO_DE_REANUDACION.md) | Dónde quedó el trabajo y qué hacer a continuación |
| [`CONTINUIDAD.md`](CONTINUIDAD.md) | Contexto completo: decisiones, modelo de datos, reglas de negocio, entorno, backlog |
| [`CHANGELOG.md`](CHANGELOG.md) | Historial detallado de cambios |
| [`AGENTS.md`](AGENTS.md) | Reglas y comandos para agentes y colaboradores (`CLAUDE.md` apunta a él) |
| [`tests/e2e/LEEME.md`](tests/e2e/LEEME.md) | Pruebas de navegador con Playwright |

Datos externos: clima y geocodificación de [Open-Meteo](https://open-meteo.com), e imágenes satelitales de Esri World Imagery.
