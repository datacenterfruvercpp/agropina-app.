# PUNTO DE REANUDACIÓN · AgroPiña Pro

Dónde quedó el trabajo y qué hacer a continuación. Léelo primero al retomar; el contexto completo está en `CONTINUIDAD.md` y las reglas en `AGENTS.md`.

**Fecha del corte:** 2026-10-06 · **Versión:** 2.0.1 · **Rama:** `claude/zen-goldberg-xdoq26` (todo commiteado y empujado; ver `git log` para el último commit)

## Dónde quedó todo

- La v2.0 (rediseño total) está terminada, probada y en la rama de trabajo. `main` sigue con la v1.
- Se corrigió lo que el usuario reportó al ver la vista previa (clima y «Ventana de aplicación» sin cargar).
- Se escribió la documentación (`AGENTS.md`, `CLAUDE.md`, `CONTINUIDAD.md`, este archivo, `CHANGELOG.md`).
- **No hay trabajo a medias ni cambios sin commitear.**
- Vista previa privada en claude.ai: https://claude.ai/artifact/TA9Xs68tdJ9z1SVfVEHE8n (versión 2; no incluye el cambio 2.0.1 del número de versión, que es cosmético).

## Siguiente paso recomendado (en orden)

1. **Esperar y atender el feedback del usuario** sobre la vista previa. Fue lo último que quedó abierto: pidió ver la app en la laptop y reportó dos fallos, ya resueltos. Preguntarle qué pantallas quiere ajustar.
2. **Publicar la app real con GitHub Pages** (lo debe hacer el usuario: Settings → Pages → Deploy from a branch → `claude/zen-goldberg-xdoq26` → `/ (root)`; en repositorios privados requiere plan de pago; alternativa: Netlify Drop con la carpeta). Solo así funcionan el clima real, el mapa satelital, el GPS, la instalación como app y el modo sin conexión.
3. **Verificar en un móvil real** lo que el entorno cloud no puede probar (lista abajo).
4. **Decidir con el usuario si se crea un pull request** a `main` (no se ha creado ni se debe crear sin que lo pida) o si Pages se apunta a `main` tras fusionar.
5. **Validar los parámetros agronómicos** con el usuario (tabla en `CONTINUIDAD.md`, sección 6): días a inducción y a cosecha, densidad, peso de fruta, aprovechamiento (90 % planta / 80 % soca), precio de referencia (280 por tonelada), umbral de lluvia (20 mm). Son estimaciones del asistente.
6. Elegir ítems del backlog (`CONTINUIDAD.md`, sección 9), empezando por lo que pida el usuario. Candidatos de mayor valor: sincronización en la nube, fotos en monitoreo, informe PDF para auditorías.

## Lista de verificación pendiente en dispositivo real

- [ ] El clima carga (inicio y «Clima y riesgo») y la etiqueta «Simulado» **no** aparece.
- [ ] El mapa satelital carga imágenes, se dibuja un lindero y se calcula el área; funciona «Mi ubicación».
- [ ] Búsqueda de lugar en Ajustes (geocodificación de Open-Meteo).
- [ ] Instalar como app (Android: «Instalar aplicación»; iPhone: «Añadir a pantalla de inicio») y abrir sin conexión.
- [ ] Exportar a Excel (8 hojas) y descargar respaldo JSON; restaurarlo.
- [ ] Las labores con insumos descuentan stock y el «Deshacer» lo devuelve.
- [ ] Rendimiento con más datos (cientos de labores) en un móvil modesto.

## Cómo retomar técnicamente (5 minutos)

```bash
cd /home/user/agropina-app.             # nombre real con punto final
git fetch origin && git checkout claude/zen-goldberg-xdoq26 && git pull
git log --oneline | head -5            # confirmar que están 84ae35f, 16ce756, 7cfc86c y los de documentación
npm install && npm test                # debe dar 9 pruebas OK
python3 -m http.server 8765 &          # servidor local (cuidado: pkill -f puede matar tu shell, ver AGENTS.md)
# pruebas de navegador (opcional): ver tests/e2e/LEEME.md
```

Para republicar la vista previa: `python3 scripts/build-preview.py <carpeta>` y la herramienta Artifact (instrucciones en `CONTINUIDAD.md`, sección 7).

## Preguntas abiertas para el usuario

1. ¿Qué le pareció la vista previa? ¿Qué quiere cambiar (diseño, textos, módulos)?
2. ¿Dónde se va a publicar la app (GitHub Pages u otro)? ¿El repositorio es privado?
3. ¿Los parámetros agronómicos de la MD-2 (y otras variedades que use) coinciden con su finca?
4. ¿Qué moneda y qué precio de referencia por tonelada usa? ¿Una caja equivale a 12 kg en su exportadora?
5. ¿Cuántas personas usarán la app y en cuántos dispositivos? (define si hace falta sincronización en la nube).
6. ¿Crear el pull request a `main` y dejar la v2 como oficial?

## Riesgos y recordatorios

- Si se agregan archivos a la app, actualizar `SHELL` y `VERSION` en `sw.js` o los usuarios verán la versión vieja.
- Cualquier cambio de clases CSS requiere `npm run build:css` y commitear `css/tailwind.css`.
- Los datos viven solo en el navegador del usuario: antes de cambiar el modelo de datos, mantener la compatibilidad con respaldos previos (normalizadores con valores por defecto).
- No afirmar que algo funciona en producción si solo se probó en el entorno cloud con clima simulado.
