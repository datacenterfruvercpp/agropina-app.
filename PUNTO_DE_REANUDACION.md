# PUNTO DE REANUDACIÓN · AgroPiña Enterprise

Dónde quedó el trabajo y qué hacer a continuación. Léelo primero al retomar; el contexto completo está en `CONTINUIDAD.md`, las reglas en `AGENTS.md` y el plan comercial en `PLAN_SAAS.md`.

**Fecha del corte:** 2026-10-07 · **Versión en `main`:** 3.0.0 «Enterprise» · **Rama de trabajo:** `claude/zen-goldberg-xdoq26` (todo commiteado y empujado; ver `git log`)

## Dónde quedó todo

- **La v3.0 está en `main` y publicada en producción por Vercel** (PR #1 fusionado el 2026-10-07, commit `1c2edae`; despliegue en verde). Es un ERP agrícola multi-finca completo (ver `CHANGELOG.md`), pero **de un solo dispositivo y sin cuentas**: guarda en `localStorage`, sin servidor, sin inicio de sesión real.
- **Nuevo objetivo comercial:** alquilarla como servicio mensual a empresas de 3, 5 o 10 usuarios, cada una con su base de datos separada y un subdominio de `datacenterpc.com`, con pago por tarjeta. **Todo está analizado y planificado en `PLAN_SAAS.md`; no hay código de esto todavía.**
- La rama de trabajo tiene commits de **documentación** posteriores a la fusión (planificación SaaS) que **no están en `main`**: no se ha pedido PR. Si el usuario quiere que `main` los tenga, preguntar antes de crear un PR.
- Vista previa privada en claude.ai con la v3: https://claude.ai/artifact/TA9Xs68tdJ9z1SVfVEHE8n (sin Excel, clima simulado, sin teselas).
- La rama creada por error en `datacenterfruvercpp/facto-cr` ya se borró. En ese repositorio hay trabajo ajeno (`claude/rediseno-frontend-correcciones`): no tocar.
- **No hay trabajo a medias.**

## Infraestructura del usuario (informada por él, no verificada)

| Pieza | Dato |
|---|---|
| Dominio | `datacenterpc.com`, DNS en **OrangeHost** (allí también tiene un VPS) |
| VPS de la app | Dedicado para apps, Linux, SSH. *Falta:* distribución, RAM/CPU, Docker, puertos 80/443 ocupados |
| VPS de datos | **Otro proveedor**, Linux, SSH, 2 TB libres; guarda respaldos importantes |
| Vercel | Conectado al repositorio; publica `main` y vista previa por rama |
| Pasarela de pago | Pidió analizar **Pagadito**: sitio no accesible desde el entorno; **cobro recurrente sin confirmar** (ver `PLAN_SAAS.md`, sección 7) |

El agente **no puede conectarse** a los VPS: entrega archivos e instructivo para que el usuario los ejecute.

## Siguiente paso recomendado (en orden)

1. **Cerrar las decisiones pendientes** (`PLAN_SAAS.md`, sección 11) preguntando al usuario:
   1. ¿Qué VPS aloja la app (sugerido: el dedicado para apps; el de OrangeHost como tercera copia)? Distribución de Linux, RAM/CPU, ¿Docker?, ¿otras apps en 80/443?
   2. ¿Base de datos en su VPS (sugerido: Supabase autoalojado) o Supabase en la nube?
   3. ¿Formato `{empresa}.agropina.datacenterpc.com`?
   4. Respuestas de **Pagadito** a las 8 preguntas, o elegir Onvo Pay / Tilopay u otra.
   5. **Planes y precios** (3 / 5 / 10 usuarios, fincas por plan, prueba de 14 días).
   6. Soporte, términos y privacidad (¿abogado?), y facturación electrónica con `facto-cr`.
2. **Etapa 1 — servidor y aislamiento** (`PLAN_SAAS.md`, sección 10): Docker Compose con Postgres + autenticación + RLS; tablas por empresa; roles; límite de usuarios; la app pasa de `localStorage` al servidor con copia local sin conexión; migración de datos locales existentes; **pruebas automáticas de aislamiento entre empresas**.
3. Etapa 2 (alta automática y subdominios con Caddy), etapa 3 (cobros con adaptador de pasarela), etapa 4 (panel del administrador y factura electrónica), etapa 5 (respaldos probados, monitoreo, instructivo, términos).
4. En paralelo, lo que no depende del SaaS: **opinión del usuario sobre el diseño v3**, validar reglas ERP (tarifas por jornal, cargas sociales/CCSS y aguinaldo, días de crédito, abonos parciales, presupuesto por hectárea), validar parámetros agronómicos y verificar en un móvil real (lista abajo).

> **Aviso:** hasta completar las etapas 1 a 3, `main` en Vercel **no debe ofrecerse a clientes de pago**: no tiene cuentas, aislamiento ni cobros, y los datos viven solo en cada navegador.

## Lista de verificación pendiente en dispositivo real

Ahora que `main` está en Vercel (dirección en el panel de Vercel, proyecto `agropina-app`):

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
git fetch origin main && git checkout claude/zen-goldberg-xdoq26 && git pull
git log --oneline | head -5
npm install && npm test                # 18 pruebas OK (9 agronómicas + 9 ERP)
python3 -m http.server 8765 &          # servidor local (cuidado: pkill -f puede matar tu shell, ver AGENTS.md)
export NODE_PATH=$(npm root -g)
node tests/e2e/reglas-v3.js            # 36 comprobaciones ERP → «TODO CORRECTO»
# resto de pruebas de navegador: tests/e2e/LEEME.md
```

Para trabajo nuevo después de una fusión: `git fetch origin main && git checkout -B claude/zen-goldberg-xdoq26 origin/main` (conservando los commits sin fusionar si los hay).

Para republicar la vista previa: `python3 scripts/build-preview.py <carpeta>` y la herramienta Artifact (instrucciones en `CONTINUIDAD.md`, sección 7). Para ver el estado de Vercel de un commit: `get_status` del PR o `https://api.github.com/repos/datacenterfruvercpp/agropina-app./commits/<sha>/status`.

## Preguntas abiertas para el usuario

1. Las de la sección «Siguiente paso» (VPS, base de datos, subdominios, pasarela, planes y precios, soporte y aspectos legales).
2. ¿Qué le pareció el diseño de la v3? ¿Qué módulos sobran o faltan?
3. ¿La planilla debe calcular cargas sociales y aguinaldo, o basta con jornales brutos? ¿Los cobros requieren abonos parciales?
4. ¿Los parámetros agronómicos de la MD-2 y el presupuesto por hectárea coinciden con sus fincas clientes?
5. ¿Quiere que la documentación de planificación (rama de trabajo) pase a `main` mediante un PR?

## Riesgos y recordatorios

- Si se agregan archivos a la app, actualizar `SHELL` y `VERSION` en `sw.js` o los usuarios verán la versión vieja.
- Cualquier cambio de clases CSS requiere `npm run build:css` y commitear `css/tailwind.css`.
- **No agregar un script `build` a `package.json`** (rompe el despliegue en Vercel; el completo es `build:todo`).
- Antes de cambiar el modelo de datos, mantener la compatibilidad con `agropina_v3`, `agropina_v2` y la v1 (normalizadores con valores por defecto y migraciones en `store.js`).
- El «usuario» de la app no es un inicio de sesión: no prometer seguridad ni permisos hasta construir la etapa 1.
- Operar un SaaS en sus propios VPS hace al usuario responsable de la disponibilidad, los parches, los respaldos y los datos de terceros (Ley 8968): decirlo claramente al presentar el plan.
- Confirmar siempre en qué repositorio se trabaja antes de actuar (ver «Lecciones de conducta» en `AGENTS.md`).
- No afirmar que algo funciona en producción o en los VPS si solo se probó en el entorno cloud con clima simulado.
