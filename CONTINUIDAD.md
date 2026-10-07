# CONTINUIDAD · AgroPiña Enterprise

Documento vivo con todo el contexto necesario para retomar el proyecto sin haber estado en las sesiones anteriores. Se actualiza al final de cada sesión. Lo que sigue por hacer está en `PUNTO_DE_REANUDACION.md`; las reglas de trabajo, en `AGENTS.md`; el detalle de cambios, en `CHANGELOG.md`.

**Última actualización:** 2026-10-07 (fin de sesión) · versión **3.0.0 «Enterprise»** en `main` · rama de trabajo `claude/zen-goldberg-xdoq26` · **siguiente gran hito: convertirla en SaaS multiempresa** (ver `PLAN_SAAS.md`)

## 1. Objetivo

El usuario (cuenta `datacenter.fruver.cpp@gmail.com`, organización `datacenterfruvercpp`) tiene un repositorio `agropina-app` con una app de gestión para fincas de piña. Pidió un **rediseño total «premium»**, revisar la funcionalidad a fondo, compararla con los líderes del mercado (Agrivi, Cropwise, FieldView, Farmbrite) e implementar todas las mejoras. Eso quedó hecho en la versión 2.0.

Después pidió **«mejorar totalmente el diseño y la funcionalidad, upgrade full premium con diseños tipo SAP, Oracle y Dynamics»** (aclaró que era para AgroPiña, no para facto-cr). Eso es la **versión 3.0 «Enterprise»**: un ERP agrícola multi-finca con órdenes de trabajo, personal y planilla, compras, inventario con kardex, ventas y cuentas por cobrar, presupuesto vs real, reportes, auditoría y paleta de comandos.

Finalmente informó que **la app se va a comercializar como servicio de alquiler mensual**: cada empresa cliente (3, 5 o 10 usuarios) llena un formulario, recibe su espacio de datos **independiente y separado** de los demás y usa la app bajo un subdominio del dominio del usuario (`datacenterpc.com`), con cobro mensual con tarjeta. Todo ese análisis y plan está en **`PLAN_SAAS.md`** (aún sin código).

## 2. Estado actual

| Aspecto | Estado |
|---|---|
| Código | v3.0.0 completa y **fusionada en `main`** el 2026-10-07 (commit `1c2edae`) |
| Pruebas unitarias | 18/18 en verde (`npm test`: 9 agronómicas + 9 de lógica ERP) |
| Pruebas de navegador | `reglas-v3.js` 36/36; `reglas-negocio.js` y `formulario-multiparcela.js` OK; `capturas.js`: 27 vistas y 11 formularios en escritorio, móvil y oscuro sin errores JS; sin desbordes a 390/768/1 024 px |
| Pull request | https://github.com/datacenterfruvercpp/agropina-app./pull/1 (`claude/zen-goldberg-xdoq26` → `main`), **fusionado** el 2026-10-07 |
| Publicación | **Vercel** (proyecto `agropina-app`, conectado al repositorio): publica `main` en producción y cada rama como vista previa. Se sirve la raíz tal cual, sin script `build` |
| Vista previa en claude.ai | Publicada (privada) con la v3: https://claude.ai/artifact/TA9Xs68tdJ9z1SVfVEHE8n |
| Clima real, mapa satelital, GPS, instalación PWA, modo sin conexión | **No verificados** en un dispositivo real (el entorno cloud bloquea esos servicios) |

El usuario todavía no ha dado su opinión sobre el diseño de la v3 (se centró en la comercialización). Lo siguiente es cerrar las decisiones pendientes de `PLAN_SAAS.md` (sección 11) y empezar la etapa 1.

**Infraestructura del usuario (confirmada en conversación, no verificada desde el entorno):** dominio `datacenterpc.com` con DNS en **OrangeHost** (donde también tiene un VPS); un **VPS dedicado para apps** (Linux, SSH); un **VPS de datos de otro proveedor** (Linux, SSH, 2 TB libres) donde guarda respaldos importantes; **Vercel** conectado al repositorio. El agente **no puede conectarse** a esos servidores desde su entorno.

## 3. Historial de sesiones

**Sesión 2026-10-05 → 06**

1. *«Lee el repositorio»*: se leyó `index.html` (v1) y se resumieron sus funciones y 5 fallos.
2. *«Analízalo, reestructúralo, modernízalo, hazlo premium, compáralo con el mercado»*: se escribió la v2.0 completa (commit `16ce756`). Se probó en Chromium con el clima simulado; se corrigieron: CSS gigante por una `safelist` de Tailwind (6,3 MB → 83 KB usando una tabla literal de tonos), fila de ventanas de aplicación incompleta, etiquetas truncadas, aviso de stock insuficiente que no aparecía al completar una labor programada, nombre del Excel (la primera solución con acentos Unicode falló: SheetJS descarga como `download` si hay tildes; se resolvió en 2.0.1 quitando los acentos).
3. *«¿Puedo verla desde el móvil?»*: se explicó GitHub Pages (el agente no puede activarlo; requiere ajustes del repositorio).
4. *«Muéstrame la app»* (el usuario estaba en la laptop): se publicó como Artifact. La librería de Excel se tuvo que excluir (byte ESC).
5. *«El clima no carga y la ventana de aplicación tampoco»*: causa: el visor bloquea `fetch` externo (esperado) **y** la tarjeta se quedaba en esqueleto eterno (error mío). Se arregló el estado de error, se mejoró el mensaje y se añadió el pronóstico simulado marcado «Simulado» para la vista previa (commit `7cfc86c`).
6. *«Documenta todo… continuidad, punto de reanudación y agents»*: estos documentos (2.0.1).
7. *«¿Qué repositorios tenemos?», «lee agro app», «analiza facturele.com», «busca facto-cr»*: consultas; facturele.com no se pudo abrir (proxy). El usuario pidió pasar a `facto-cr`: se creó una sesión aparte para ese repositorio y el PR #1 de AgroPiña.

**Sesión 2026-10-07 (v3.0 «Enterprise»)**

1. *«Mejora totalmente el diseño y la funcionalidad… tipo SAP, Oracle, Dynamics»*. Al principio lo interpreté como un pedido para `facto-cr` y creé por error la rama `claude/zen-goldberg-xdoq26` en ese repositorio (idéntica a su `main`; el proxy no dejó borrarla en remoto; el usuario la borró desde GitHub el mismo día). El usuario aclaró: «la mejora es para agropiña».
2. Se rehízo el sistema de diseño (IBM Plex, barra de sistema navy, menú agrupado, cabeceras tipo «object page», tablas empresariales, mosaicos, paleta de comandos) y se añadieron los módulos ERP (ver `CHANGELOG.md` 3.0.0).
3. Verificación con Chromium: se corrigieron desbordes en móvil y a 1 024 px, cifras recortadas en mosaicos, el menú que tapaba «Configuración» a 900 px de alto, totales enteros con decimales, la migración que no se guardaba hasta el primer cambio y la vista previa que abría sin la demostración.
4. Se escribió y probó `tests/negocio.test.js` (9 pruebas) y `tests/e2e/reglas-v3.js` (36 comprobaciones); se amplió `capturas.js`. Commit `9fec65b`, empujado; Artifact republicado (versión 3).
5. *«Esa rama de facto-cr, bórrala tú, es tu error»*: desde el entorno **no se pueden borrar ramas remotas** (el proxy devuelve 403 y las herramientas MCP de GitHub no incluyen borrar ramas). Se guió al usuario, que la borró en GitHub; se verificó con `git ls-remote`. En facto-cr quedan `main` y `claude/rediseno-frontend-correcciones` (5 commits, **trabajo de otra sesión: no tocar**). La pantalla «Overview» de GitHub lista la misma rama en «Your branches» y «Active branches»: es una sola.
6. *«Consolida o fusiona todo, o no sé qué se debe hacer»*: el PR #1 tenía el despliegue de **Vercel en rojo** desde la v2. Causa: `package.json` tenía un script `build` que Vercel ejecuta y luego busca la carpeta `public`. Se renombró a `build:todo` (commit `e5abb49`); Vercel pasó a verde. Se actualizó el título y la descripción del PR, se **fusionó con «merge»** (`1c2edae`) y Vercel publicó `main` en producción sin errores. Se actualizó la documentación (`2337319`).
7. *«¿Cuántas personas usarán la app? 3, 5 o 10… es para comercializarla, alquiler mensual, formulario y base de datos independiente»*: se investigó cómo los SaaS separan datos de varias empresas, seguridad y cobros → `PLAN_SAAS.md`, secciones 3, 6 y 7.
8. *«Para el pago con tarjeta analiza pagadito.com»*: el sitio está bloqueado por el proxy (EGRESS_BLOCKED); el análisis se hizo con fuentes públicas secundarias y **queda por confirmar con Pagadito** si ofrece cobro recurrente automático (las fuentes se contradicen). Preguntas listas en `PLAN_SAAS.md`, sección 7.
9. *«Tengo un VPS dedicado, el dominio datacenterpc.com y miles de subdominios»* y *«tengo otro VPS de datos con 2 TB»* y *«proveedores diferentes, Linux, SSH, DNS en OrangeHost»*: se diseñó el esquema de subdominios `{empresa}.agropina.datacenterpc.com`, DNS comodín, HTTPS con Caddy bajo demanda, y la estrategia de respaldos cifrados «solo agregar» en el VPS de datos (secciones 4, 5 y 9 del plan).
10. El usuario cambió el modelo de la sesión a Sonnet 5.5 (`/model`) y pidió documentar todo a fondo: este conjunto de documentos.

## 4. Decisiones de diseño y por qué

- **Sin bundler ni CDN.** Vue como build global + scripts ordenados bajo `window.AP`. Razón: que el repositorio se publique tal cual en GitHub Pages sin paso de compilación, y que funcione sin conexión en el campo. Coste: sin tipos ni módulos ES; se compensa con una estructura estricta.
- **Librerías y CSS commiteados** (`vendor/`, `css/tailwind.css`): mismo motivo. Se regeneran con `npm run build:todo`.
- **Tailwind con clases literales.** Una `safelist` por patrón generaba 6,3 MB; se reemplazó por la tabla `TONES` en `js/catalog.js`.
- **`localStorage` como única persistencia.** Cero costo y cero cuentas. Límites: ~5 MB, un solo dispositivo, sin colaboración. Mitigación: respaldo JSON y Excel. La sincronización en la nube queda en el backlog.
- **Estado reactivo propio** (`reactive` de Vue) en `store.js`, sin Pinia/Vuex, para no sumar dependencias.
- **Fechas como texto ISO local** y utilidades propias, para evitar desfases de zona horaria y fallos de Safari.
- **IDs de texto** (`uid()`), con conversión de los IDs numéricos de la v1.
- **Enrutador por hash** (`#/parcelas/p1`) porque funciona en hosting estático y dentro del visor del Artifact.
- **Parámetros agronómicos como estimaciones de referencia.** Los eligió el asistente; **el usuario debe validarlos** (ver 6).
- **Clima: Open-Meteo** (gratuito, sin clave, con ET₀, probabilidad de lluvia y horario). Caché de 30 minutos y copia local para ver el último pronóstico sin conexión.
- **Mapa: Leaflet** con imágenes Esri World Imagery (sin clave) y OpenStreetMap; teselas cacheadas por el service worker.
- **Multi-finca sin tocar las vistas (v3).** `AP.store.state` siempre contiene las colecciones de la **finca activa**; las demás fincas esperan serializadas en la variable `almacen` de `store.js`. Cambiar de finca serializa la activa y aplica la otra. Así ninguna vista necesita saber de fincas; el consolidado usa `S.todasLasFincas()`.
- **Lógica ERP pura en `js/negocio.js`** (planilla, períodos, cuentas por cobrar, presupuesto, OC, kardex, consolidado): sin estado ni DOM, probada con `node --test`.
- **Preferencias globales (`prefs`)** separadas de los ajustes por finca: tema, densidad, menú plegado, notificaciones leídas y usuario.
- **Presupuesto comparado con «lo esperado»** (presupuesto × avance del ciclo) y no con el total, para no marcar todo en verde al inicio del ciclo ni todo en rojo al final. Limitación: los costos que se concentran al inicio (preparación de suelo) salen como sobregiro en parcelas recién sembradas.
- **Vercel publica la raíz tal cual (v3).** No debe existir un script `build` en `package.json` (ver `AGENTS.md`). Vercel sirve `main` en producción y cada rama como vista previa.
- **Decisión comercial (2026-10-07): SaaS multiempresa con base compartida y RLS** (modelo A de `PLAN_SAAS.md`), una instalación de la app, subdominio por empresa bajo `*.agropina.datacenterpc.com`, cobro mensual por pasarela detrás de un **adaptador** (independiente de Pagadito u otra), respaldos cifrados y de solo agregar en el VPS de datos. **El subdominio no es la seguridad:** el aislamiento lo dan el inicio de sesión, RLS y sesiones por subdominio.
- **Diseño tipo SAP Fiori / Oracle Redwood / Dynamics:** cabecera de objeto con facetas y pestañas, tablas densas con totales y exportación, formularios en panel lateral, estados con chips de semáforo, paleta de comandos. Fuente IBM Plex por legibilidad de cifras (tabular).

## 5. Modelo de datos (`localStorage['agropina_v3']`)

```
{ app, version: 3, exportedAt, fincaActiva, fincas: [{ id, nombre }], prefs,
  datos: { [fincaId]: { settings, parcelas, labores, insumos, cosechas, monitoreos, movimientos,
                        trabajadores, proveedores, ordenes, clientes, auditoria } } }
```

Todo pasa por los normalizadores `N.*` de `js/store.js`. (Las preferencias de cada tabla y la vista de parcelas/labores se guardan aparte: `agropina_dt_<id>`, `agropina_parcelas_vista`, `agropina_labores_*`.)

- **prefs (globales):** `tema` (`system|light|dark`), `densidad` (`comoda|compacta`), `navColapsada`, `leidas` (claves de notificaciones), `usuario` `{nombre, rol}`.
- **settings (por finca):** `finca`, `propietario`, `moneda` (USD), `umbralLluvia` (20 mm), `precioReferencia` (280/t), `ubicacion` `{lat, lon, nombre, fuente}`, `onboarded`, `presupuestoHa` `{manoObra: 4200, insumos: 5600, otros: 2400}` por ha y ciclo.
- **parcelas:** `id`, `nombre`, `codigo`, `variedad`, `hectareas`, `densidad?`, `pesoFruto?`, `aprovechamiento?`, `fechaSiembra`, `fechaInicioCiclo`, `fechaInduccion|null`, `ciclo` (1 = planta, 2 = Soca 1…), `estado` (`activa|archivada`), `color`, `lat`, `lon`, `poligono` `[[lat,lon]…]`, `presupuestoHa|null` (propio), `notas`.
- **labores (órdenes de trabajo):** `id`, `parcelaId`, `tipo`, `fecha`, `estado` (`pendiente|en_proceso|completada|cancelada`), `prioridad` (`alta|media|baja`), `descripcion`, `responsable`, `trabajadores[{trabajadorId, nombre, jornales, tarifa}]`, `jornales`, `costoManoObra`, `otrosCostos`, `insumos[{insumoId, cantidad, dosisHa, costoUnitario, nombre, unidad, carencia}]`, `costoInsumos`, `costoTotal`, `stockAplicado`.
- **insumos:** `id`, `nombre`, `categoria`, `unidad`, `stock`, `stockMinimo`, `costoUnitario`, `carencia` (días), `ingredienteActivo`, `proveedorId`, `proveedor` (texto libre heredado).
- **cosechas:** `id`, `parcelaId`, `fecha`, `toneladas`, `cajas?`, `exportable?`, `brix?`, `precio`, `destino`, `clienteId`, `comprador`, `factura`, `estadoPago` (`pagado|pendiente`; por defecto `pagado`), `fechaPago`, `ciclo`, `cierraCiclo`, `cicloCerrado`.
- **monitoreos:** `id`, `parcelaId`, `fecha`, `plaga`, `severidad` 1–5, `incidencia?`, `muestras?`, `accion`, `notas`.
- **movimientos:** `id`, `insumoId`, `fecha`, `tipo` (`entrada|salida|ajuste`), `cantidad`, `costoUnitario`, `referencia` (id de labor u orden de compra), `nota`.
- **trabajadores:** `id`, `nombre`, `identificacion`, `puesto`, `cuadrilla`, `tarifaJornal`, `telefono`, `fechaIngreso`, `activo`, `notas`.
- **proveedores / clientes:** `id`, `nombre`, `identificacion`, `contacto`, `telefono`, `email`, `diasCredito`, `notas` (+ `tipo` en clientes: Exportadora, Mercado nacional, Industria, Otro).
- **ordenes (de compra):** `id`, `numero` (`OC-0001`), `proveedorId`, `fecha`, `fechaEntrega`, `estado` (`borrador|aprobada|recibida|cancelada`), `lineas[{insumoId, cantidad, costoUnitario}]`, `total`, `fechaRecepcion`, `notas`.
- **auditoria:** `id`, `fecha` (ISO con hora), `usuario`, `accion`, `entidad`, `descripcion` (las más recientes primero; máximo 1 500).

Compatibilidad: `agropina_v2` (una finca, con `settings.tema`) se convierte en la primera finca y el tema pasa a `prefs`; la v1 (`agropina_parcelas` + `agropina_actividades`, y respaldos JSON con `actividades`) se convierte en parcelas y labores realizadas. Tras migrar se guarda de inmediato en `agropina_v3`; las claves viejas no se borran. Mapeo v1: «Deshierbe» → «Control de malezas», «Control de Plagas» → «Aplicación fitosanitaria», «Inducción Floral» → «Inducción floral».

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

**Órdenes de trabajo (v3).** Estados: Programada (`pendiente`) → En proceso → Realizada (`completada`), o Cancelada. Solo las realizadas descuentan inventario y cuentan como costo; pasar a realizada una orden con fecha futura la fecha hoy. Si tiene personal asignado, `jornales` y `costoManoObra` se calculan como Σ jornales y Σ jornales × tarifa (la tarifa pactada en la orden o, si falta, la del trabajador). Un trabajador con labores no se elimina: se desactiva.

**Planilla.** Por período (semana lunes–domingo, quincena 1–15 / 16–fin de mes, o mes) suma las labores **realizadas** con personal asignado; la mano de obra de labores sin personal se informa como «sin asignar».

**Compras.** Borrador → Aprobada → Recibida (o Cancelada). Recibir genera una entrada por línea con costo promedio ponderado y `referencia` = id de la orden. Una OC recibida no se edita ni se elimina. Un proveedor con órdenes no se elimina. «En camino» = cantidades en OC aprobadas.

**Cuentas por cobrar.** Cosechas con `estadoPago = pendiente` y monto > 0. Vence = fecha + días de crédito del cliente (30 si no hay cliente). Tramos: al día, 1–30, 31–60, 61–90, > 90 días de atraso. DSO = saldo ÷ ventas de 90 días × 90.

**Presupuesto vs real.** Presupuesto del ciclo = presupuesto por ha (propio de la parcela o estándar de la finca) × ha. Real = labores realizadas desde el inicio del ciclo. Esperado = presupuesto × avance del ciclo. Desvío = (real − esperado) ÷ esperado: > 5 % atención, > 20 % sobregiro.

**Auditoría.** Cada alta, edición, eliminación, restauración (deshacer), cambio de estado, aprobación, recepción, cancelación, cobro, ajuste o entrada de inventario, importación, exportación, carga de demostración y creación o eliminación de fincas deja un evento con el usuario de `prefs.usuario`.

**Ventanas de aplicación** (por hora): no apta de noche (< 6 h o > 18 h), con lluvia (> 0,1 mm, o > 0,3 mm en las 3 h siguientes), viento > 15 km/h, temperatura > 32 °C o probabilidad ≥ 50 %; aceptable con probabilidad ≥ 25 %, viento > 10 o < 3 km/h, temperatura > 29 °C o humedad < 50 %; el resto, óptima. Se muestran tramos de al menos 2 horas.

**Alertas de clima:** lluvia ≥ umbral (20 mm por defecto); ≥ 60 mm en 3 días → Phytophthora; ráfagas ≥ 35 km/h; máxima ≥ 33 °C → golpe de sol; balance (lluvia − ET₀) < −20 mm → déficit hídrico.

## 7. Entorno de trabajo (sesiones cloud)

- Repositorio local: `/home/user/agropina-app.` (el nombre termina en punto; es el nombre real del repo en GitHub).
- Node 22 con Playwright global (`NODE_PATH=$(npm root -g)`) y Chromium en `/opt/pw-browsers`.
- Proxy: solo funcionan `registry.npmjs.org`, GitHub y los dominios de Anthropic; el resto da 403. Detalles y trampas en `AGENTS.md`.
- No hay CLI `gh`; GitHub se maneja con las herramientas MCP `mcp__github__*` (las herramientas diferidas se cargan con `ToolSearch`). Con ellas se pueden leer PR, comentarios y estados, actualizar y fusionar PR; **no se pueden borrar ramas** (ni `git push --delete` funciona por el proxy: 403).
- Sitios bloqueados por el proxy al probarlos: `pagadito.com`, `help.take.app`, `facturele.com`. `WebSearch` sí funciona (solo EE. UU.); `WebFetch` falla con `EGRESS_BLOCKED` en esos dominios.
- Estado de despliegue de Vercel: aparece como estado de commit en el PR (`get_status`) o en `https://api.github.com/repos/datacenterfruvercpp/agropina-app./commits/<sha>/status`.
- Desde el entorno **no hay acceso SSH ni red a los VPS del usuario**: la infraestructura se entrega como archivos e instructivo en el repositorio.
- Repositorio de `facto-cr` adjunto a la sesión en `/home/user/facto-cr` (solo lectura/consulta; no trabajar ahí sin que el usuario lo pida).
- Carpeta temporal de la sesión (se pierde): capturas y la copia de vista previa. Todo lo importante está ya en el repositorio.

### Vista previa en claude.ai (Artifact)

URL: https://claude.ai/artifact/TA9Xs68tdJ9z1SVfVEHE8n (privada; solo el propietario). Última versión publicada: la **3.0.0** (2026-10-07).
Para actualizarla desde una conversación nueva: `python3 scripts/build-preview.py <carpeta>` (imprime la lista de archivos), luego con la herramienta Artifact: `action: "read"` de la URL (obligatorio la primera vez) y publicar `file_path=<carpeta>/index.html`, `root=<carpeta>`, `files=<lista>` y `url=<URL>`. La vista previa **no** tiene Excel, clima real ni teselas del mapa (límites del visor). Los archivos que ya no existen se quitan pasando `null` en `files` (p. ej. las fuentes Plus Jakarta de la v2).

## 8. Limitaciones y problemas conocidos

- Datos solo en el dispositivo y en el navegador usado; borrar datos del sitio los elimina. Mitigación: respaldo JSON periódico.
- Sin multiusuario ni sincronización. El «usuario» y su rol son solo una etiqueta para la auditoría: **no hay inicio de sesión ni permisos**. **Esto impide venderla como servicio hasta completar las etapas 1 a 3 de `PLAN_SAAS.md`.**
- Hoy `main` en Vercel funciona como app **de un solo dispositivo y sin cuentas**: no debe ofrecerse a clientes como servicio multiempresa todavía.
- Todas las fincas comparten el mismo `localStorage` (~5 MB). Con varias fincas y años de datos puede llenarse; la app avisa si no puede guardar.
- La planilla calcula jornales y montos brutos: no incluye cargas sociales (CCSS), aguinaldo, vacaciones ni deducciones.
- Cuentas por cobrar sin abonos parciales ni notas de crédito: una venta está pendiente o pagada.
- El presupuesto supone gasto lineal durante el ciclo (ver decisiones).
- Los datos de demostración tienen costos bajos (~400 por ha y ciclo) y un presupuesto estándar de 700 por ha a esa escala; los valores por defecto para fincas reales son 12 200 por ha.
- El pronóstico de Open-Meteo es un modelo global, no una estación local; la precisión por finca puede variar.
- Las teselas satelitales gratuitas de Esri tienen resolución variable según la zona.
- En iPhone, la geolocalización y el modo sin conexión dependen de Safari y de abrir la app por `https`.
- `vendor/xlsx.full.min.js` (SheetJS 0.18.5 de npm) contiene un byte ESC; no impide su uso, solo la publicación como Artifact.
- No hay adjuntos ni fotos: el respaldo JSON y el Excel solo contienen datos.
- No hay pruebas automáticas de las vistas en CI; las de `tests/e2e/` se ejecutan a mano.

## 9. Ideas pendientes (backlog, sin comprometer)

1. **SaaS multiempresa** (`PLAN_SAAS.md`): servidor Postgres con RLS, inicio de sesión y roles, alta automática de empresas con subdominio, cobros con suscripción, panel del administrador, respaldos al VPS de datos. *Prioridad máxima.*
2. Sincronización con copia local sin conexión y reglas de conflicto (parte de la etapa 1).
3. Cargas sociales y pago de planilla (CCSS, aguinaldo, vacaciones, comprobantes); costos fijos e indirectos.
4. Abonos parciales, notas de crédito y facturación electrónica (integración con `facto-cr`).
5. Fotos de monitoreo y de cosecha (adjuntos), con geoetiqueta.
6. Notificaciones del sistema (push) para labores del día, carencias y lluvia.
7. Informe PDF por parcela y ciclo para auditorías (GlobalG.A.P., exportadoras).
8. Curva de gasto del presupuesto por fase (en vez de lineal) y escenarios de precio y punto de equilibrio.
9. Programa de fertilización por fase con recomendación de dosis.
10. Importar parcelas desde KML/GeoJSON y exportar el mapa.
11. Idiomas (inglés/portugués) y otras zonas climáticas.
12. CI con GitHub Actions: `npm test` y pruebas de navegador.

## 10. Glosario

**Inducción floral:** aplicación (etefón/ácido) que fuerza la floración uniforme. **Soca:** ciclo de rebrote posterior a la primera cosecha. **PHI / carencia:** días mínimos entre una aplicación y la cosecha. **ET₀:** evapotranspiración de referencia (mm/día). **°Brix:** contenido de azúcares de la fruta. **Phytophthora:** hongo que causa pudrición del cogollo. **Exportable:** porcentaje de fruta que cumple calibre y calidad de exportación. **Caja:** 12 kg de fruta (convención usada por la app). **Orden de trabajo (OT):** labor planificada con estado, prioridad, personal e insumos. **Jornal:** día de trabajo de una persona; la planilla multiplica jornales × tarifa. **Cuadrilla:** grupo de trabajadores que se asigna junto. **Orden de compra (OC):** solicitud a un proveedor que, al recibirse, da entrada al inventario. **Kardex:** registro cronológico de entradas y salidas de un insumo con su saldo. **Cuentas por cobrar (CxC) / cartera:** ventas pendientes de cobro. **DSO:** días promedio que tarda en cobrarse una venta.
