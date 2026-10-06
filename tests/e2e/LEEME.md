# Pruebas de navegador (a mano)

Usan Playwright con el Chromium del entorno cloud (`/opt/pw-browsers`; no ejecutar `playwright install`). No forman parte de `npm test`.

## Preparación

```bash
# desde la raíz del repositorio
python3 -m http.server 8765 &                 # sirve la app en http://localhost:8765
export NODE_PATH=$(npm root -g)               # Playwright está instalado globalmente
mkdir -p /tmp/shots
```

## Scripts

| Script | Qué comprueba |
|---|---|
| `capturas.js <carpeta>` | Carga la finca de demostración y recorre las 12 vistas y los 6 formularios en escritorio, móvil (390 px) y modo oscuro; guarda capturas en `<carpeta>/shots/` y falla si hay errores de JavaScript. El clima se simula interceptando `**/api.open-meteo.com/**`. Las teselas del mapa se bloquean a propósito (los errores de red `ERR_FAILED` se ignoran). |
| `reglas-negocio.js` | Migración de datos de la v1, descuento y devolución de inventario, deshacer, completar labor programada, costo promedio ponderado, cierre de ciclo, persistencia tras recargar y descarga del Excel. Imprime los valores para revisarlos. |
| `formulario-multiparcela.js <carpeta>` | Registro de una labor en dos parcelas a la vez desde la interfaz móvil y comprobación del reparto de insumos y costos por área. |

Ejemplo:

```bash
node tests/e2e/capturas.js /tmp          # capturas en /tmp/shots
node tests/e2e/reglas-negocio.js
node tests/e2e/formulario-multiparcela.js /tmp
```

`capturas.js` y `formulario-multiparcela.js` escriben en `<carpeta>/shots/`, que debe existir.

## Notas

- Los scripts asumen el servidor en el puerto 8765 y fecha «de hoy» real: la finca de demostración se genera con fechas relativas.
- Resultados esperados de `reglas-negocio.js` con la finca de demostración (referencia al 2026-10-05): la inducción de «La Esperanza» registrada hoy deja la fase en `floracion`; stock de Ethrel 14 → 12 al completar la labor; el cierre de ciclo en «Bloque Norte A» la pasa a `ciclo = 2` con `fechaInduccion = null`.
- Para la copia de vista previa (Artifact) hay que anteponer `<meta charset="utf-8">` si se sirve con `http.server`, porque el publicador agrega esa etiqueta pero el servidor de pruebas no.
