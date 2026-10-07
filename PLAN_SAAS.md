# PLAN SAAS · AgroPiña como servicio de alquiler mensual

Plan de comercialización y de arquitectura para vender AgroPiña como **servicio con pago mensual**, cada empresa en su propio espacio. Es el resultado de la conversación del 2026-10-07; **todavía no hay código de esto**. Las decisiones tomadas por el usuario están en la sección 1; lo que falta decidir, en la sección 11. El estado general del proyecto está en `CONTINUIDAD.md` y el siguiente paso, en `PUNTO_DE_REANUDACION.md`.

## 1. Lo que el usuario decidió o informó

| Tema | Dato |
|---|---|
| Modelo de negocio | **Alquiler mensual** de la app a empresas (SaaS). Ya no es una app personal. |
| Tamaño de cada cliente | **3, 5 o 10 usuarios** por empresa (depende de la empresa). |
| Alta de un cliente | Una persona o empresa que la adquiere **llena un formulario general** y, con él, se le crea su base de datos. Cada una debe usar la app **de forma independiente y separada** de las demás. |
| Dominio | **`datacenterpc.com`** (del usuario). Quiere usarlo para hacer publicidad a sus otros productos; puede crear miles de subdominios; cada empresa usaría la app bajo un subdominio. |
| DNS | Se administra en **OrangeHost** (el usuario también tiene un VPS ahí). |
| VPS de la app | Un **VPS dedicado para apps** (Linux, acceso SSH). *Pendiente confirmar distribución, RAM/CPU, Docker y si ya usa los puertos 80/443.* |
| VPS de datos | Otro VPS de **otro proveedor**, Linux, SSH, **2 TB libres**; ahí guarda información de respaldo importante. |
| Pagos con tarjeta | Pidió analizar **Pagadito** (pagadito.com). Ver sección 7. |

## 2. Por qué hay que cambiar la arquitectura

Hoy (v3.0) AgroPiña **no tiene servidor**: todo vive en `localStorage` del navegador de cada dispositivo. Eso no sirve para una empresa de 3 a 10 personas que comparten datos, ni permite inicio de sesión, permisos, cobros ni respaldos centralizados. Para venderla como servicio hace falta:

1. Un **servidor con base de datos central** (Postgres).
2. **Inicio de sesión real**, roles y límite de usuarios por plan.
3. **Aislamiento entre empresas** garantizado por la base de datos, no solo por la interfaz.
4. **Cobro recurrente** y control del estado de cada suscripción.
5. **Respaldos** fuera del servidor principal.
6. Una **copia local** para seguir trabajando sin conexión en el campo (la app ya es PWA).

El «usuario» actual de la app (`prefs.usuario`) es solo una etiqueta para la auditoría; **no es seguridad**.

## 3. Cómo aíslan los datos las apps que se alquilan (investigación)

| Modelo | Cómo funciona | Quién lo usa | Ventajas / límites |
|---|---|---|---|
| **A. Base compartida con aislamiento por fila** | Una sola base; cada fila lleva `empresa_id`; la base **bloquea** consultas a filas ajenas (RLS, Row Level Security de Postgres). | La mayoría de los SaaS (Slack, Notion, Shopify, Agrivi…) | Barato, fácil de actualizar, escala a miles de clientes. Exige disciplina y pruebas de aislamiento. |
| B. Un esquema por empresa | Misma base, un «compartimento» de tablas por cliente. | Algunos ERP medianos | Aislamiento más fuerte; cada actualización debe aplicarse a todos los esquemas. |
| C. Una base por empresa | Cada cliente tiene su base. | SAP, Oracle, Dynamics en planes empresariales | Máximo aislamiento y personalización; el más caro y lento de operar. Solo si un cliente grande lo exige por contrato. |

**Recomendación: modelo A con RLS.** La regla vive en la base de datos: aunque la app tenga un error, la base no entrega filas de otra empresa. Dentro de cada empresa se conserva la **multi-finca** de la v3. Estructura:

```
Empresa (cliente que paga; subdominio propio)
 ├─ Usuarios con rol: dueño, administrador, agrónomo, bodeguero, contador, solo lectura
 ├─ Suscripción: plan (3 / 5 / 10 usuarios), estado, vencimiento
 └─ Fincas → parcelas, labores, inventario, compras, ventas, planilla, auditoría…
```

Si más adelante un cliente grande exige aislamiento físico, se le puede dedicar una base propia (modelo C) sin cambiar la aplicación, porque el código ya trabaja «por empresa».

## 4. Dominio y subdominios

| Dirección | Uso |
|---|---|
| `datacenterpc.com` | Sitio principal con todos los productos del usuario |
| `agropina.datacenterpc.com` | Página del producto: planes, registro, inicio de sesión |
| `{empresa}.agropina.datacenterpc.com` | La app de cada cliente (p. ej. `pinasdelnorte.agropina.datacenterpc.com`) |
| `admin.agropina.datacenterpc.com` | Panel del administrador (clientes, pagos, suspensiones) |

- Las empresas van **debajo de `agropina.`** para que un nombre elegido por un cliente nunca choque con otros productos (`www`, `facto`…). Cada producto futuro tendría su propio nivel.
- **DNS comodín en OrangeHost**: dos registros A, `agropina.datacenterpc.com` y `*.agropina.datacenterpc.com`, hacia la IP del VPS de la app. No se crea nada por cliente.
- **HTTPS**: OrangeHost probablemente no permite automatizar el DNS para un certificado comodín. Solución prevista: **Caddy con certificados bajo demanda** (Let's Encrypt por subdominio, renovación automática). Antes de emitir, Caddy consulta a la app (`on_demand_tls ask`) si la empresa existe, para que nadie genere certificados con nombres inventados.
- **Nombres reservados** que ninguna empresa puede elegir: `www`, `admin`, `api`, `app`, `mail`, `ftp`, `smtp`, `status`, `docs`, `soporte`, `facturas`, `pagos`, `webhook` y similares. Solo letras minúsculas, números y guiones; 3 a 30 caracteres.
- **El subdominio es la dirección, no la seguridad.** El aislamiento lo dan el inicio de sesión, el RLS y las sesiones/cookies limitadas a cada subdominio.

## 5. Infraestructura propuesta

```
Clientes ──► *.agropina.datacenterpc.com  (DNS en OrangeHost)
                     │
            VPS de la app (dedicado para apps)
            ├─ Caddy: HTTPS por subdominio
            ├─ App AgroPiña (una instalación para todas las empresas)
            ├─ Postgres (+ inicio de sesión y RLS; Supabase autoalojado o Postgres + GoTrue)
            └─ Servicio de avisos de pago (webhooks de la pasarela)
                     │  respaldos cifrados, solo agregar
                     ▼
            VPS de datos (2 TB, otro proveedor)
```

Todo en **Docker Compose**. Opciones para la base de datos (decisión pendiente, sección 11):

- **En el VPS del usuario** (Supabase autoalojado o Postgres + autenticación): sin costo mensual extra, datos en su infraestructura; **él es responsable** de parches, respaldos y seguridad.
- **Supabase en la nube** (~USD 25/mes en producción): respaldos y parches a cargo del proveedor; los datos salen de su infraestructura.

La interfaz estática puede seguir también en **Vercel** (ya conectado al repositorio) para demos o la página comercial; la app de los clientes se serviría desde el VPS bajo el dominio del usuario.

## 6. Seguridad exigible

- Inicio de sesión con correo y contraseña (o enlace mágico), verificación en dos pasos opcional, bloqueo por intentos fallidos.
- **Roles y permisos** por módulo (el bodeguero no ve finanzas; el solo lectura no edita).
- Cifrado en tránsito (HTTPS) y en reposo (disco o base cifrados).
- **RLS en todas las tablas** con datos de clientes y **pruebas automáticas de aislamiento**: un usuario de la empresa A nunca debe ver ni modificar datos de la B (lectura, escritura, exportación, auditoría, archivos).
- Secretos (claves de la base, de la pasarela, de cifrado) **fuera del repositorio**: variables de entorno o gestor de secretos. Nunca en commits.
- Auditoría con el usuario real en el servidor; registro inmutable para el cliente.
- Cortafuegos (solo 22, 80, 443; SSH por llave), actualizaciones automáticas de seguridad, `fail2ban`, monitoreo de caídas.
- Exportación completa de los datos del cliente y **borrado al cancelar** (con plazo de gracia avisado).
- Documentos legales: términos de servicio, política de privacidad y contrato de tratamiento de datos. En Costa Rica aplica la **Ley 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales** (validar con un abogado).

## 7. Cobro mensual y análisis de Pagadito

**Cómo cobran los SaaS:** una pasarela con suscripciones guarda la tarjeta (token, nunca en la app) y cobra cada mes; avisa a la app por **webhook** («pagó», «falló», «canceló»); la app activa o limita la cuenta. Si falla: reintentos, recordatorios, luego solo lectura y luego suspensión. **Nunca se borran datos sin aviso.**

### Pagadito (pagadito.com)

**No se pudo abrir el sitio** desde el entorno (el proxy lo bloquea); el análisis usa fuentes públicas secundarias y debe confirmarse con la empresa.

- Pasarela **no bancaria** fundada en 2010 en San Salvador, El Salvador. Atiende comercios de Centroamérica, **incluida Costa Rica**. Acepta tarjetas de crédito/débito y billeteras móviles; botón o página de pago, enlaces de cobro, cobro móvil e integración por API; plugins (Shopify, WooCommerce…). La tarjeta se captura en la página de Pagadito, así que la app no toca datos de tarjetas.
- **Punto crítico: cobro recurrente automático.** Las fuentes se contradicen: CB Insights menciona «facturación recurrente»; CartDNA (integración con Shopify) dice que **no** admite pagos recurrentes ni de un clic. Hay que confirmarlo.
- No publica comisiones, plazos de liquidación ni documentación abierta de la API en lo que se pudo ver.
- No emite la **factura electrónica de Hacienda**: eso lo cubriría `facto-cr`.

**Si Pagadito cobra de forma automática (A):** primer pago del cliente, cobros mensuales solos, webhooks, activación/suspensión automática. **Si solo hace pagos únicos (B):** AgroPiña envía cada mes un **enlace de pago** (correo y aviso en la app); al confirmarse, extiende el acceso un mes. Funciona, pero hay más atrasos; conviene ofrecer descuento por pago trimestral o anual.

**Preguntas para el asesor de Pagadito:**
1. ¿Cobros recurrentes o tarjeta guardada con cobro automático mensual? ¿Por API?
2. ¿Webhooks de pago aprobado, fallido y reembolsado?
3. ¿Reintentos de cobros fallidos y aviso de tarjetas por vencer?
4. Comisión por transacción, cuota de afiliación y mensualidad.
5. Moneda y plazo de liquidación a una cuenta de Costa Rica.
6. Requisitos de afiliación (persona física o jurídica, documentos).
7. ¿Sandbox y documentación de la API?
8. Devoluciones y contracargos.

### Alternativas (verificar condiciones vigentes)

| Opción | Nota |
|---|---|
| Onvo Pay, Tilopay (costarricenses) | Cobros en colones y dólares, pagos recurrentes; revisar comisiones y API |
| Paddle, Lemon Squeezy | «Merchant of record»: cobran y gestionan impuestos internacionales; comisión más alta |
| Stripe | Estándar del mercado; **no hay cuentas directas de comercios de Costa Rica** (habría que abrir una empresa en EE. UU., p. ej. Stripe Atlas) |
| Mercado Pago, PayU | Suscripciones en varios países de la región; revisar cobertura en Costa Rica |

**Decisión de diseño:** el sistema de cobros será **independiente de la pasarela**. La app guarda el estado de cada suscripción y un registro de eventos de pago; la pasarela solo informa pagos mediante una interfaz común (adaptador). Así se puede empezar con una y cambiar después sin rehacer nada.

Estados de la suscripción: `prueba` (14 días) → `activa` → `vencida` (aviso, gracia de unos días) → `solo_lectura` → `suspendida` → `cancelada` (datos conservados un plazo y luego borrados con aviso).

## 8. Alta de un cliente (flujo)

1. Página pública con planes y «Probar 14 días gratis».
2. **Formulario general:** nombre de la empresa, cédula jurídica o física, país y moneda, **subdominio deseado**, nombre y correo del dueño, contraseña, teléfono, cantidad de fincas y de usuarios, aceptación de términos y privacidad.
3. El sistema valida el subdominio, **crea la empresa, la primera finca, el usuario dueño y la suscripción de prueba**, y envía el correo de verificación.
4. Asistente inicial: ubicación, parcelas, catálogos, invitación de los 3, 5 o 10 usuarios con su rol.
5. Fin de la prueba: pide el pago. Sin pago: pasa por los estados de la sección 7.

**Panel del administrador (del usuario):** lista de empresas, plan, estado de pago, uso (usuarios, fincas, almacenamiento), última actividad; suspender, reactivar, extender prueba, cambiar plan, ver auditoría de altas; **sin acceso a datos de producción de los clientes** salvo por soporte autorizado y registrado.

## 9. Respaldos

El VPS de datos (otro proveedor, 2 TB) recibe:

- **Copia completa diaria** de Postgres y **registro continuo de cambios** (WAL con pgBackRest o WAL-G): restaurar a cualquier minuto.
- **Cifrado antes de salir** del VPS de la app (restic o similar); la clave se guarda aparte (gestor de contraseñas del usuario). Sin la clave no se restaura.
- **Solo agregar:** el VPS de la app no puede borrar ni modificar respaldos (usuario restringido en el VPS de datos o modo append-only); protege contra ransomware y atacantes.
- Retención: 7 diarios, 4 semanales, 12 mensuales y WAL de 7 a 14 días. Ocupa pocos GB con decenas de empresas.
- Carpeta y usuario exclusivos de AgroPiña con cuota; no mezclar con otros respaldos del usuario.
- **Prueba de restauración automática semanal** en una base temporal y **avisos por correo** si un respaldo falla.
- **Regla 3-2-1:** 3 copias, 2 lugares, 1 fuera del proveedor. Los dos VPS son de proveedores distintos (bien). Tercera copia semanal cifrada en el **VPS de OrangeHost** (si tiene espacio) o en Backblaze B2 / Wasabi.

## 10. Plan por etapas

| Etapa | Contenido | Criterio de terminado |
|---|---|---|
| **1. Servidor y aislamiento** | Postgres + autenticación + RLS en Docker; tablas por empresa (sección 12); roles; límite de usuarios por plan; la app pasa de `localStorage` a servidor, con copia local sin conexión y sincronización; migración de los datos locales existentes. | Pruebas automáticas: un usuario de A nunca ve ni toca datos de B en ninguna tabla. |
| **2. Alta automática** | Formulario público, subdominios (reservados, validación), Caddy con TLS bajo demanda, invitación de usuarios, asistente inicial. | Registrarse crea empresa + finca + dueño + prueba sin intervención. |
| **3. Cobros** | Adaptador de pasarela, suscripciones, webhooks, prueba de 14 días, gracia, solo lectura, suspensión, portal de facturas del cliente. | Simulación de pago, fallo y cancelación cambia el estado y los permisos. |
| **4. Panel del administrador y facturación** | Panel, métricas, soporte; facturación electrónica de cada mensualidad con `facto-cr`. | Emitir y enviar la factura de una mensualidad de prueba. |
| **5. Operación** | Respaldos con restauración probada, monitoreo, instructivo de servidores, términos y privacidad, pruebas de carga y de seguridad. | Restaurar un respaldo en un servidor limpio siguiendo solo el instructivo. |

Como el agente **no puede conectarse a los VPS** desde su entorno, entrega en el repositorio: Docker Compose, Caddy, scripts de respaldo y restauración, migraciones SQL e **instructivo paso a paso con comandos** que el usuario ejecuta en sus servidores.

## 11. Decisiones pendientes del usuario

1. ¿Cuál VPS aloja la app? (sugerido: el «dedicado para apps»; el de OrangeHost como tercera copia de respaldo).
2. Distribución de Linux, RAM/CPU del VPS de la app, ¿ya tiene Docker?, ¿hay otras apps en los puertos 80/443?
3. ¿Base de datos **en su VPS** (sugerido, con Supabase autoalojado) o **Supabase en la nube**?
4. ¿Formato `{empresa}.agropina.datacenterpc.com`?
5. **Pasarela de pago:** respuestas de Pagadito (sección 7) o alternativa local.
6. **Planes y precios:** ¿3 / 5 / 10 usuarios? ¿precio mensual y anual? ¿cuántas fincas por plan? ¿prueba de 14 días?
7. ¿Quién da soporte y en qué horario? ¿Términos y privacidad: tiene abogado?
8. ¿Facturación electrónica con `facto-cr`? (hoy ese repositorio es un proyecto aparte).

## 12. Modelo de datos del servidor (borrador)

Tablas nuevas: `empresas` (id, nombre, identificación, subdominio único, país, moneda, estado), `miembros` (usuario ↔ empresa, rol, activo), `suscripciones` (empresa, plan, estado, fin de prueba, próximo cobro, pasarela, id externo), `eventos_pago` (empresa, tipo, monto, moneda, pasarela, id externo único para idempotencia, fecha), `planes` (nombre, máximo de usuarios y fincas, precio).

Tablas existentes (las colecciones actuales: `fincas`, `parcelas`, `labores`, `insumos`, `movimientos`, `cosechas`, `monitoreos`, `trabajadores`, `proveedores`, `ordenes`, `clientes`, `auditoria`) ganan `empresa_id` (no nulo) y, salvo `fincas`, `finca_id`. **Todas con RLS:** `empresa_id` debe coincidir con la empresa del usuario autenticado. Los normalizadores de `js/store.js` se conservan para validar datos en el cliente; el servidor valida de nuevo.

Reglas de negocio actuales (stock, planilla, cuentas por cobrar, presupuesto, OC) viven en `js/negocio.js` y `js/store.js` y deben seguir funcionando igual; al pasar al servidor hay que decidir cuáles se ejecutan en base de datos (transacciones: recepción de OC, completar labor) y cuáles quedan en el cliente.

## 13. Riesgos

- **Responsabilidad operativa:** al alojar en sus VPS, el usuario es responsable de disponibilidad, parches, respaldos y seguridad de datos de terceros. Un incumplimiento tiene consecuencias legales y comerciales.
- **Fuga entre empresas** es el riesgo de mayor impacto: se mitiga con RLS, pruebas automáticas y revisión de seguridad antes de vender.
- **Sincronización sin conexión:** conflictos si dos usuarios editan lo mismo; definir reglas (última escritura, o por campos) y probarlas en el campo.
- **Dependencia de la pasarela:** por eso el adaptador.
- **Costos de soporte:** formularios de ayuda, documentación para clientes, un canal de atención.
