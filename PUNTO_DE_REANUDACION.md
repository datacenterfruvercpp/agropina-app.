# PUNTO DE REANUDACIÓN · AgroPiña Enterprise

Dónde quedó el trabajo y qué hacer a continuación. Léelo primero al retomar; el contexto completo está en `CONTINUIDAD.md` y las reglas en `AGENTS.md`.

**Fecha del corte:** 2026-10-07 · **Versión:** 3.0.0 «Enterprise» · **Rama:** `claude/zen-goldberg-xdoq26` (todo commiteado y empujado; ver `git log` para el último commit)

## Dónde quedó todo

- La **v3.0 «Enterprise»** está terminada, probada y en la rama de trabajo: rediseño tipo SAP/Oracle/Dynamics y módulos ERP (multi-finca, órdenes de trabajo con personal, planilla, compras, kardex, ventas y cuentas por cobrar, presupuesto vs real, reportes, auditoría, paleta de comandos). Detalle en `CHANGELOG.md`.
- El pull request https://github.com/datacenterfruvercpp/agropina-app./pull/1 se **fusionó en `main`** el 2026-10-07: `main` ya tiene la v3. Vercel publica `main` en producción (el despliegue fallaba por el script `build`; corregido).
- Para trabajo nuevo: partir de `main` actualizado; un PR fusionado no se reutiliza.
- Vista previa privada en claude.ai, ya con la v3: https://claude.ai/artifact/TA9Xs68tdJ9z1SVfVEHE8n (sin Excel, clima simulado, sin teselas del mapa).
- **No hay trabajo a medias ni cambios sin commitear.**
- La rama `claude/zen-goldberg-xdoq26` creada por error en `datacenterfruvercpp/facto-cr` ya fue borrada (2026-10-07).

## Siguiente paso recomendado (en orden)

1. **Recoger la opinión del usuario sobre la v3** (vista previa). Preguntar qué módulos usará de verdad y qué falta para su operación.
2. **Validar las reglas ERP con el usuario:** tarifas por jornal y si la planilla debe incluir cargas sociales (CCSS, aguinaldo); días de crédito de sus clientes; si necesita abonos parciales; presupuesto estándar por hectárea (por defecto 4 200 MO + 5 600 insumos + 2 400 otros por ciclo).
3. **Probar la app publicada en Vercel** (dominio de producción del proyecto `agropina-app` en el panel de Vercel). Ahí sí funcionan el clima real, el mapa satelital, el GPS, la instalación como app y el modo sin conexión.
4. **Verificar en un móvil real** (lista abajo).
5. ~~Fusionar el PR~~ (hecho el 2026-10-07).
6. Backlog (`CONTINUIDAD.md`, sección 9). Candidatos de mayor valor ahora que es un ERP: inicio de sesión y roles con sincronización en la nube, cargas sociales en la planilla, abonos parciales y facturación electrónica (enlazar con `facto-cr`).

## Lista de verificación pendiente en dispositivo real

- [ ] El clima carga (inicio y «Clima y riesgo») y la etiqueta «Simulado» **no** aparece.
- [ ] El mapa satelital carga imágenes, se dibuja un lindero y se calcula el área; funciona «Mi ubicación».
- [ ] Búsqueda de lugar en Configuración → Finca activa.
- [ ] Instalar como app y abrir sin conexión (el service worker v3 precarga los archivos y fuentes nuevos).
- [ ] Exportar el libro Excel (16 hojas), CSV/Excel desde cualquier tabla, respaldo JSON completo y restaurarlo.
- [ ] Cambiar de finca desde la barra superior en el móvil; crear y eliminar fincas.
- [ ] Rendimiento con varias fincas y cientos de registros en un móvil modesto (y espacio de `localStorage`).
- [ ] Tablas en el móvil: desplazamiento horizontal cómodo y acciones de fila accesibles.

## Cómo retomar técnicamente (5 minutos)

```bash
cd /home/user/agropina-app.             # nombre real con punto final
git fetch origin && git checkout claude/zen-goldberg-xdoq26 && git pull
git log --oneline | head -5
npm install && npm test                # 18 pruebas OK (9 agronómicas + 9 ERP)
python3 -m http.server 8765 &          # servidor local (cuidado: pkill -f puede matar tu shell, ver AGENTS.md)
export NODE_PATH=$(npm root -g)
node tests/e2e/reglas-v3.js            # 36 comprobaciones ERP → «TODO CORRECTO»
# resto de pruebas de navegador: tests/e2e/LEEME.md
```

Para republicar la vista previa: `python3 scripts/build-preview.py <carpeta>` y la herramienta Artifact (instrucciones en `CONTINUIDAD.md`, sección 7).

## Preguntas abiertas para el usuario

1. ¿Qué le pareció la v3? ¿Qué módulos sobran o faltan?
2. ¿Cuántas fincas maneja y cuántas personas usarán la app? (define si hace falta inicio de sesión, roles y sincronización en la nube).
3. ¿La planilla debe calcular cargas sociales y aguinaldo, o basta con jornales brutos?
4. ¿Cobra por abonos o siempre el total de la factura? ¿Quiere enlazar las ventas con la facturación electrónica de `facto-cr`?
5. ¿Los parámetros agronómicos de la MD-2 y el presupuesto por hectárea coinciden con su finca?
6. ¿Cuál es la dirección de Vercel que usa la finca? ¿Quiere un dominio propio?

## Riesgos y recordatorios

- Si se agregan archivos a la app, actualizar `SHELL` y `VERSION` en `sw.js` o los usuarios verán la versión vieja.
- Cualquier cambio de clases CSS requiere `npm run build:css` y commitear `css/tailwind.css`.
- Los datos viven solo en el navegador del usuario: antes de cambiar el modelo de datos, mantener la compatibilidad con `agropina_v3`, `agropina_v2` y la v1 (normalizadores con valores por defecto y migraciones en `store.js`).
- El «usuario» de la app no es un inicio de sesión: no prometer seguridad ni permisos.
- No afirmar que algo funciona en producción si solo se probó en el entorno cloud con clima simulado.
