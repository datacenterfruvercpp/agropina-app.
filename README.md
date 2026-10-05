# AgroPiña Pro

Plataforma de gestión para fincas de piña: fenología, proyección de cosechas, clima, inventario, sanidad y rentabilidad. Es una PWA que funciona sin conexión y guarda los datos en el dispositivo.

## Módulos

| Módulo | Qué hace |
|---|---|
| **Inicio** | Clima actual y pronóstico de 7 días, indicadores clave, alertas priorizadas, ventana de aplicación de las próximas 24 h, ciclo de cada parcela, agenda y producción proyectada a 12 meses. |
| **Parcelas** | Ficha por lote con línea de tiempo fenológica (establecimiento → vegetativo → inducción → floración → fruto → maduración → cosecha), estimación de producción (plantas × aprovechamiento × peso), ciclos Planta/Soca, costos del ciclo, margen proyectado y recomendaciones. |
| **Mapa** | Imagen satelital, dibujo de linderos con cálculo de área geodésica y puntos GPS. |
| **Labores** | Bitácora y tareas programadas. Una labor se puede registrar en varias parcelas a la vez, con dosis por hectárea y costos repartidos según el área. Descuenta el inventario automáticamente. |
| **Calendario** | Labores, cosechas y monitoreos, más las inducciones y cosechas estimadas. |
| **Cosechas** | Pronóstico a 120 días, rendimiento real (t/ha), calidad (% exportable, °Brix), destino, ingresos y cierre de ciclo hacia Soca. |
| **Sanidad** | Monitoreo de plagas y enfermedades propias de la piña, mapa de presión parcela × plaga y evolución de la severidad. |
| **Inventario** | Stock en tiempo real, costo promedio ponderado, stock mínimo, entradas y ajustes, historial de movimientos y carencias (PHI). |
| **Clima y riesgo** | Alertas (lluvia intensa, Phytophthora, viento, golpe de sol, déficit hídrico), ventanas de aplicación hora por hora (72 h), gráfico de 48 h, balance hídrico (lluvia − ET₀) y proyección por parcela. |
| **Finanzas** | Costos por mes y por tipo de labor, ingresos, margen, costo por ha y por tonelada, rentabilidad por parcela, proyección de ingresos, exportación a Excel (8 hojas, incluye trazabilidad de aplicaciones) e impresión. |
| **Ajustes** | Finca, moneda, precio de referencia, umbral de lluvia, ubicación (búsqueda, GPS o coordenadas), tema claro/oscuro, respaldo y restauración en JSON y finca de demostración. |

**Cumplimiento (BPA / GlobalG.A.P.):** cada aplicación guarda producto, dosis y carencia. La app avisa si se intenta cosechar dentro del período de carencia.

**Migración:** los datos de la versión 1 (`agropina_parcelas` y `agropina_actividades`), y sus respaldos JSON, se convierten automáticamente.

## Estructura

```
index.html              Carcasa de la app (sin CDN)
css/tailwind.css        Tailwind compilado (generado: npm run build:css)
css/app.css             Estilos complementarios, Leaflet e impresión
js/utils.js             Fechas, formato, geometría, archivos
js/catalog.js           Variedades, fases, labores, plagas, tonos de color
js/agronomy.js          Motor agronómico (fenología, producción, carencias, clima)
js/weather.js           Open-Meteo con caché sin conexión
js/store.js             Estado, persistencia, migraciones y reglas de negocio
js/demo.js              Finca de demostración
js/ui.js, js/forms.js   Componentes y formularios
js/views/*.js           Pantallas
js/app.js               Enrutador, diseño y arranque
vendor/                 Vue 3, Chart.js, Leaflet, SheetJS, Font Awesome, fuente (generado: npm run vendor)
sw.js, manifest.webmanifest  PWA
src/tailwind.css, tailwind.config.js  Sistema de diseño
tests/                  Pruebas del motor agronómico
```

No hace falta compilar para usarla: basta con publicar la carpeta (por ejemplo, en GitHub Pages) o servirla con `npm run serve`. Si se abre `index.html` directamente desde el disco funciona todo, salvo el modo sin conexión (service worker).

## Desarrollo

```bash
npm install
npm run build      # copia las librerías a vendor/ y compila Tailwind
npm run watch:css  # recompila los estilos mientras se edita
npm test           # pruebas del motor agronómico
npm run serve      # http://localhost:8080
```

Datos externos: clima y geocodificación de [Open-Meteo](https://open-meteo.com), e imágenes satelitales de Esri World Imagery.
