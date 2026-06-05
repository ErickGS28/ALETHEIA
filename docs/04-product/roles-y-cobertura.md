# Roles del Sistema y Cobertura de Implementación — ALETHEIA (CLM)

> **Qué es este documento.** Explica, rol por rol, **qué debería hacer** cada actor del Gestor de Contratos (CLM) y **qué parte de ese comportamiento está realmente programada** hoy en el sistema. Es el cruce entre el diseño (Historias de Usuario + [`implementacion.md`](../01-architecture/implementacion.md)) y el código real auditado en `apps/backend` y `apps/frontend`.
>
> **Fecha de auditoría:** 2026-06-04 · **Rama:** `main` · **Método:** lectura directa del código fuente (services, gateway, microfrontends), no solo de la documentación.

---

## 0. Cómo leer este documento

Cada función se clasifica con uno de estos estados:

| Estado | Significado |
|:---:|---|
| ✅ **IMPLEMENTADO** | Lógica real de extremo a extremo (backend + frontend) ejercitable. |
| 🟡 **PARCIAL** | Existe la pieza pero está incompleta (falta UI, falta validación, o panel "ligero"). |
| ⛔ **PENDIENTE** | Modelado/scaffoldeado pero sin lógica funcional. |

**Modelo de seguridad (clave para entender los roles).** El sistema **no autoriza por rol directamente**, sino por **privilegios granulares** (principio *I* de SOLID). Un rol es simplemente un **paquete de privilegios** que se asigna al usuario en el login. El `PrivilegeGuard` del gateway exige un privilegio concreto por endpoint (`@RequirePrivilege('...')`) y el frontend oculta/muestra funciones con `<PrivilegeGuard privilege="...">`. Por eso, al describir cada rol, lo que realmente importa es **qué privilegios trae**.

Los 5 roles del sistema (enum `Role` en `auth-service`):
`SOLICITANTE` · `ADMINISTRADOR` · `ABOGADO` · `APROBADOR` · `FIRMANTE`.

---

## 1. Matriz canónica Rol → Privilegio

Esta matriz es la **fuente de verdad** y está **codificada de forma idéntica** en dos lugares: `auth-service/prisma/seed.ts` (líneas 30-64) y `auth-service/src/users/users.service.ts`. Cuando el Administrador crea un usuario y le asigna roles, el sistema deriva automáticamente la unión de privilegios de esta tabla.

| Privilegio | Solicitante | Administrador | Abogado | Aprobador | Firmante |
|---|:---:|:---:|:---:|:---:|:---:|
| `CONTRACT_CREATE` | ✓ | | | | |
| `CONTRACT_EDIT` | ✓ | | | | |
| `CONTRACT_SUBMIT` | ✓ | | | | |
| `CONTRACT_CANCEL` | ✓ | ✓ | | | |
| `CONTRACT_RECOVER` | ✓ | ✓ | | | |
| `CONTRACT_REVIEW_ADMIN` | | ✓ | | | |
| `CONTRACT_REVIEW_LAWYER` | | | ✓ | | |
| `CONTRACT_APPROVE` | | | | ✓ | |
| `CONTRACT_SIGN` | | | | | ✓ |
| `CONTRACT_VIEW_AREA` | ✓ | | ✓ | ✓ | ✓ |
| `CONTRACT_VIEW_ALL` | | ✓ | | | |
| `DOCUMENT_UPLOAD` | ✓ | | ✓ | | |
| `DOCUMENT_VERSION` | ✓ | ✓ | ✓ | | |
| `WORKFLOW_CONFIG` | | ✓ | | | |
| `USERS_MANAGE` | | ✓ | | | |
| `AREAS_MANAGE` | | ✓ | | | |
| `APODERADOS_MANAGE` | | ✓ | | | |
| `TEMPLATES_MANAGE` | | ✓ | ✓ | | |
| `REPORTS_VIEW` | | ✓ | ✓ | ✓ | |

> **⚠️ Discrepancia detectada en el seed.** El usuario demo `admin@aletheia.com` se siembra con **los 19 privilegios** (`ALL_PRIVILEGES`, seed.ts línea 96), no con el paquete `ADMINISTRADOR` de la matriz. Es decir, el admin demo puede *también* crear, editar, enviar y firmar contratos, cosa que la matriz canónica **no** otorga al rol Administrador. Esto es práctico para pruebas pero conviene tenerlo presente: **el rol Administrador "puro" no crea ni firma contratos**, solo los supervisa, revisa en su etapa y administra el sistema.

**Usuarios sembrados** (`seed.ts`, password `password123`):

| Email | Rol | Área |
|---|---|:---:|
| `admin@aletheia.com` | ADMINISTRADOR (con todos los privilegios) | — (ve todo) |
| `solicitante@aletheia.com` | SOLICITANTE | 1 |
| `abogado@aletheia.com` | ABOGADO | 1 |
| `aprobador@aletheia.com` | APROBADOR | 1 |
| `firmante@aletheia.com` | FIRMANTE | 1 |

---

## 2. El flujo de estados (contexto para todos los roles)

Los roles se entienden mejor sobre el "tablero" del contrato. La máquina de estados real vive en `workflow-service/src/workflow/state-machine/contract-state-machine.ts` y está **completamente implementada** (tabla `TRANSITIONS`):

```
[DRAFT] --submit(SOLICITANTE)--> [SUBMITTED]
   ▲                                  │
   │ reject                  approve(ADMINISTRADOR)
   │                                  ▼
   └──────────────────────────[ADMIN_REVIEW]
                                      │
                            approve(ABOGADO)
                                      ▼
                              [LAWYER_REVIEW] --reject--> [DRAFT]
                                      │
                            approve(APROBADOR)
                                      ▼
                            [APPROVAL_PENDING] --reject--> [REJECTED]
                                      │
                            approve(APROBADOR/paso a firma)
                                      ▼
                                 [SIGNING]
                                      │
                              sign(FIRMANTE)
                                      ▼
                                 [SIGNED] ← final

Desde cualquier estado activo: --cancel(SOLICITANTE/ADMIN)--> [CANCELLED]
Desde [CANCELLED]:            --recover--> [DRAFT]
```

Cada transición, además de cambiar el estado: **(1)** valida el privilegio del usuario, **(2)** escribe en la bitácora (`AuditLog` + `WorkflowTransition`), **(3)** encola una **notificación** (patrón Observer) al rol o usuario que sigue, y **(4)** sincroniza el estado espejo en `contracts-service`. Todo esto está implementado (`workflow.service.ts`, método `transition()`).

---

## 3. Rol por rol — qué debe hacer y qué está programado

### 3.1 🧑‍💼 SOLICITANTE

**Propósito.** Es quien **origina** el contrato: captura los datos, adjunta documentos del proveedor y lo envía a revisión. Es el "dueño" del contrato durante la fase de borrador y el destinatario de las devoluciones (ping-pong).

**Qué debería hacer (Historias HU-03 a HU-10, HU-16):**

| Responsabilidad | Privilegio | HU | Estado | Dónde vive en el código |
|---|---|:---:|:---:|---|
| Crear solicitud (folio auto, estado `DRAFT`) | `CONTRACT_CREATE` | HU-03 | ✅ | `solicitudes-mf/.../create-contract` → `POST /contracts` → `contracts.service.createWithFolio()` |
| Editar solicitud antes de enviar (solo en `DRAFT`) | `CONTRACT_EDIT` | HU-04 | ✅ | `PATCH /contracts/:id` valida estado `DRAFT` |
| Enviar a revisión (`DRAFT`→`SUBMITTED`) | `CONTRACT_SUBMIT` | HU-05 | ✅ | `POST /contracts/:id/submit` → `workflow.transition(SUBMIT)` |
| Cancelar solicitud (con motivo) | `CONTRACT_CANCEL` | HU-06 | ✅ | `POST /contracts/:id/cancel` |
| Recuperar solicitud cancelada (`CANCELLED`→`DRAFT`) | `CONTRACT_RECOVER` | HU-07 | ✅ | `POST /contracts/:id/recover` |
| Cargar documentos requeridos (dinámicos por tipo de proveedor) | `DOCUMENT_UPLOAD` | HU-08 | ✅ | `documentos-mf/document-upload` → `POST /documents/:contractId` + `DocumentRequirementFactory` |
| Subir nuevas versiones de un documento | `DOCUMENT_VERSION` | HU-09 | ✅ | `POST /documents/:id/versions` (incrementa `currentVersion` en transacción) |
| Registrar/consultar vigencia de documentos | — | HU-10 | 🟡 | Campo `expiresAt` y vista `expiry-alerts` existen; **falta la lógica backend de "vencido/por vencer"** (solo se almacena la fecha) |
| Consultar contratos de su área | `CONTRACT_VIEW_AREA` | HU-16 | ✅ | `GET /contracts` con scoping por `areaId` en `contracts.service.findAll()` |

**Lo que NO puede hacer:** revisar, aprobar ni firmar. Tampoco ve contratos de otras áreas.

**Cobertura general del rol: ✅ Alta.** Es el rol más completo de extremo a extremo (es el "módulo funcional de referencia" del proyecto). Único hueco: la **alerta de vigencia** de documentos es de visualización, no hay regla de negocio que marque automáticamente un documento como vencido.

---

### 3.2 👔 ADMINISTRADOR

**Propósito.** Doble función: **(a)** es el **primer revisor** del flujo (puerta de entrada después del envío) y **(b)** es el **administrador del sistema** (usuarios, áreas, apoderados, plantillas, configuración del flujo). Tiene visión global de todos los contratos.

**Qué debería hacer (HU-06, HU-11, HU-12, HU-17 a HU-25):**

| Responsabilidad | Privilegio | HU | Estado | Dónde vive en el código |
|---|---|:---:|:---:|---|
| Revisar solicitud enviada y aprobar/devolver (`SUBMITTED`→`ADMIN_REVIEW` o →`DRAFT`) | `CONTRACT_REVIEW_ADMIN` | HU-11 | ✅ | `flujo-mf/review-panel` → `POST /workflow/:id/approve` \| `/reject` |
| Ver semáforo SLA (verde/amarillo/rojo) | — | HU-12 | ✅ | `flujo-mf/sla-dashboard` + `workflow.service.computeSla()` (60% / 100% de `slaHours`) |
| Cancelar / recuperar contratos | `CONTRACT_CANCEL`, `CONTRACT_RECOVER` | HU-06 | ✅ | igual que Solicitante |
| Ver **todos** los contratos (sin filtro de área) | `CONTRACT_VIEW_ALL` | HU-17 | ✅ | `contracts.service.findAll()` rama `CONTRACT_VIEW_ALL` |
| Crear/editar plantillas (WYSIWYG) | `TEMPLATES_MANAGE` | HU-18 | ✅ | `contratos-mf/template-editor` → `POST/PATCH /templates` |
| Configurar etapas del flujo (nombre, rol, SLA) | `WORKFLOW_CONFIG` | HU-20 | ✅ | `admin-mf/workflow-config` → `POST/PATCH /workflow/stages` |
| Gestionar usuarios (CRUD, roles, activar/desactivar) | `USERS_MANAGE` | HU-21 | ✅ | `admin-mf/users` → `auth-service` users CRUD |
| Gestionar áreas (soft-delete con `isActive`) | `AREAS_MANAGE` | HU-22 | ✅ | `admin-mf/areas` → catálogo `areas` |
| Gestionar apoderados | `APODERADOS_MANAGE` | HU-23 | ✅ | `admin-mf/apoderados` → catálogo `apoderados` |
| Consultar bitácora de auditoría | `REPORTS_VIEW` | HU-24 | 🟡 | `GET /reports/audit/:contractId` (backend ✅); panel `reportes-mf/audit-log` 🟡 ligero |
| Generar reporte de contratos + export CSV | `REPORTS_VIEW` | HU-25 | 🟡 | `GET /reports/contracts` y `/reports/export?format=csv` (backend ✅); UI 🟡 |

**Lo que NO puede hacer (rol "puro", según matriz):** crear, editar, enviar ni firmar contratos. *(El usuario demo admin sí puede, por el override del seed — ver §1.)*

**Cobertura general del rol: ✅ Alta en backend y administración; 🟡 media en reportes.** Toda la configuración del sistema (usuarios, áreas, apoderados, plantillas, etapas del flujo) está funcional. La revisión administrativa con semáforo SLA funciona. El punto flojo son los **paneles de reportes/bitácora**: los endpoints existen y devuelven datos, pero las vistas de `reportes-mf` están en estado parcial.

---

### 3.3 ⚖️ ABOGADO

**Propósito.** **Segundo revisor** del flujo: valida jurídicamente el contrato ya aprobado por el Administrador. También colabora en la elaboración del documento usando plantillas.

**Qué debería hacer (HU-09, HU-12, HU-13, HU-16, HU-18, HU-19, HU-24, HU-25):**

| Responsabilidad | Privilegio | HU | Estado | Dónde vive en el código |
|---|---|:---:|:---:|---|
| Revisar contrato y aprobar/rechazar (`ADMIN_REVIEW`→`LAWYER_REVIEW` o →`DRAFT`) | `CONTRACT_REVIEW_LAWYER` | HU-13 | ✅ | `flujo-mf/review-panel` → `POST /workflow/:id/approve` \| `/reject` |
| Ver semáforo SLA | — | HU-12 | ✅ | igual que Administrador |
| Subir documentos / nuevas versiones | `DOCUMENT_UPLOAD`, `DOCUMENT_VERSION` | HU-09 | ✅ | `documentos-mf` |
| Crear/usar plantillas para elaborar el contrato (WYSIWYG) | `TEMPLATES_MANAGE` | HU-18/19 | ✅ | `contratos-mf/contract-editor` + `template-editor` |
| Consultar contratos de su área | `CONTRACT_VIEW_AREA` | HU-16 | ✅ | scoping por `areaId` |
| Consultar bitácora / reportes | `REPORTS_VIEW` | HU-24/25 | 🟡 | endpoints ✅ / UI 🟡 |

**Lo que NO puede hacer:** crear/enviar solicitudes, aprobar formalmente (eso es del Aprobador), firmar, ni administrar el sistema. No ve contratos fuera de su área.

**Cobertura general del rol: ✅ Alta.** Revisión de abogado, edición con plantillas y manejo de documentos completos. Mismo hueco de reportes que el Administrador.

---

### 3.4 ✅ APROBADOR

**Propósito.** Autoridad que **aprueba formalmente** el contrato, autorizando el inicio del proceso de firma. Es la última compuerta humana antes de la firma.

**Qué debería hacer (HU-12, HU-14, HU-16, HU-24, HU-25):**

| Responsabilidad | Privilegio | HU | Estado | Dónde vive en el código |
|---|---|:---:|:---:|---|
| Aprobar formalmente (`LAWYER_REVIEW`→`APPROVAL_PENDING`→`SIGNING`) o rechazar (→`REJECTED`) | `CONTRACT_APPROVE` | HU-14 | ✅ | `flujo-mf/review-panel` → `POST /workflow/:id/approve` \| `/reject` |
| Ver semáforo SLA | — | HU-12 | ✅ | `sla-dashboard` |
| Consultar contratos de su área | `CONTRACT_VIEW_AREA` | HU-16 | ✅ | scoping por `areaId` |
| Consultar bitácora / reportes | `REPORTS_VIEW` | HU-24/25 | 🟡 | endpoints ✅ / UI 🟡 |

**Lo que NO puede hacer:** crear, editar, revisar como admin/abogado, firmar ni administrar.

**Cobertura general del rol: ✅ Alta** (sobre el flujo). El aprobador opera enteramente sobre `review-panel` y el motor de workflow, ambos funcionales. Reportes 🟡.

> **Nota sobre el rechazo (HU-14).** Un `reject` en `APPROVAL_PENDING` lleva a `REJECTED` (estado terminal), a diferencia de los rechazos previos que devuelven a `DRAFT`. La máquina de estados implementa ambos comportamientos.

---

### 3.5 ✍️ FIRMANTE

**Propósito.** Cierra el ciclo: registra la **firma simulada** que da validez final al contrato. Puede actuar como apoderado registrado.

**Qué debería hacer (HU-15, HU-16):**

| Responsabilidad | Privilegio | HU | Estado | Dónde vive en el código |
|---|---|:---:|:---:|---|
| Firmar contrato en `SIGNING` (canvas → base64), pasar a `SIGNED` | `CONTRACT_SIGN` | HU-15 | ✅ | `firmas-mf/signature-canvas` → `POST /signatures/:contractId` → `documents-service` (Strategy) |
| Asociar firma a un apoderado registrado | `CONTRACT_SIGN` | HU-15 | 🟡 | Campo `apoderadoId` se persiste, pero **no se valida** que el apoderado exista/esté activo |
| Consultar contratos de su área | `CONTRACT_VIEW_AREA` | HU-16 | ✅ | scoping por `areaId` |

**Mecánica de la firma (implementada):** la firma se captura en canvas, se valida como base64/dataURL mediante el patrón **Strategy** (`canvas-signature.strategy.ts` / `electronic-signature.strategy.ts`), se persiste en `Signature`, y se **dispara un evento** `CONTRACT_SIGNED` (cola BullMQ `WORKFLOW_INBOUND`). El `workflow-inbound.processor` consume ese evento y ejecuta automáticamente la transición `SIGN` → `SIGNED` sin intervención manual. El estado `SIGNED` es terminal y notifica al creador.

**Lo que NO puede hacer:** cualquier cosa fuera de firmar y consultar su área.

**Cobertura general del rol: ✅ Alta.** El único matiz es que la **validación del apoderado** asociado no está implementada en backend (se asume confiable).

---

## 4. Funcionalidades transversales (todos los roles)

| Función | HU | Estado | Detalle de implementación |
|---|:---:|:---:|---|
| Iniciar sesión (JWT access 15 min + refresh 7 días, privilegios en payload) | HU-01 | ✅ | `auth-service.login()` + `web-shell/RoleLogin`; re-auth automático en 401 (`commons/api/base-api.ts`) |
| Cerrar sesión (revoca refresh tokens) | HU-02 | ✅ | `auth-service.logout()` marca `revokedAt` |
| Notificaciones internas (Observer) por cambio de estado | HU-26 | ✅ | `workflow.service` encola → `notifications.processor` persiste; `GET /notifications`, `PATCH /notifications/:id/read` |
| Notificación periódica de SLA vencido (cada 60 s) | — | ✅ | `sla-scan.processor` (extra sobre lo pedido en HU) |
| Semáforo SLA en tiempo real | HU-12 | ✅ | `computeSla()` con umbrales 60% / 100% |
| Guard de privilegios por endpoint (gateway) y por UI (frontend) | — | ✅ | `PrivilegeGuard` + `@RequirePrivilege` / `<PrivilegeGuard>` |

---

## 5. Cobertura por capa (resumen ejecutivo)

### Backend — todo implementado con lógica real (sin stubs)

| Servicio | Estado | Patrones aplicados |
|---|:---:|---|
| `gateway` | ✅ | Decorator (`@RequirePrivilege`/`@CurrentUser`), GlobalExceptionFilter, routing Redis |
| `auth-service` | ✅ | JWT con privilegios, CRUD usuarios, seed con matriz de roles |
| `contracts-service` | ✅ | **Repository**, folio auto-generado, scoping por privilegio, catálogos CRUD |
| `workflow-service` | ✅ | **State Machine**, **Observer** (notificaciones), SLA, bitácora, jobs BullMQ |
| `documents-service` | ✅ | **Factory** (docs por tipo de proveedor), **Strategy** (firma), versionado transaccional |

### Frontend — 6 de 7 microfrontends funcionales

| Microfrontend | Estado | Para qué roles |
|---|:---:|---|
| `web-shell` (host + login + Redux + Multi-Zones) | ✅ | Todos |
| `solicitudes-mf` | ✅ | Solicitante |
| `contratos-mf` (plantillas + editor WYSIWYG) | ✅ | Administrador, Abogado |
| `documentos-mf` (carga, versiones, vigencia) | ✅ | Solicitante, Abogado |
| `flujo-mf` (review-panel, SLA, timeline) | ✅ | Administrador, Abogado, Aprobador |
| `firmas-mf` (canvas) | ✅ | Firmante |
| `admin-mf` (usuarios, áreas, apoderados, etapas) | ✅ | Administrador |
| `reportes-mf` (reportes, bitácora, export) | 🟡 | Administrador, Abogado, Aprobador |

---

## 6. Huecos conocidos / pendientes por rol

| # | Hueco | Rol afectado | Impacto |
|:---:|---|---|---|
| 1 | Paneles de `reportes-mf` (contract-reports, audit-log) están "ligeros"; los endpoints backend ya funcionan | Administrador, Abogado, Aprobador | 🟡 Reportes/bitácora visualmente incompletos |
| 2 | Vigencia de documentos: se almacena `expiresAt` pero no hay regla que marque "vencido / por vencer" | Solicitante | 🟡 HU-10 solo a nivel visual |
| 3 | Firma con apoderado: `apoderadoId` se guarda sin validar existencia/estado activo | Firmante | 🟡 Integridad débil |
| 4 | El usuario demo `admin` tiene los 19 privilegios (override del seed), no el paquete `ADMINISTRADOR` puro | Administrador | ⚠️ Solo afecta a datos demo, no a la matriz canónica |
| 5 | Reintentos de jobs BullMQ no configurados explícitamente | Transversal | 🟡 Resiliencia (mejora futura, ver consideraciones-generales) |

---

## 7. Conclusión

El **ciclo de vida completo del contrato está implementado de punta a punta** para los cinco roles: un Solicitante crea y envía → el Administrador revisa → el Abogado valida → el Aprobador autoriza → el Firmante firma, con bitácora, notificaciones y semáforo SLA reales en cada paso. La administración del sistema (usuarios, áreas, apoderados, plantillas, configuración del flujo) está completa.

Los pendientes son **acabados, no fundamentos**: pulir los paneles de reportes/bitácora (los datos ya están disponibles vía API), añadir reglas de negocio para la vigencia de documentos y la validación de apoderados. Ningún servicio del backend es un *scaffold*: todos contienen lógica de producción con los patrones de diseño documentados en [`implementacion.md`](../01-architecture/implementacion.md).

---

*Documento generado a partir de la auditoría del código fuente real (`apps/backend`, `apps/frontend`) cruzada con [`historias-de-usuario.md`](./historias-de-usuario.md) e [`implementacion.md`](../01-architecture/implementacion.md).*
