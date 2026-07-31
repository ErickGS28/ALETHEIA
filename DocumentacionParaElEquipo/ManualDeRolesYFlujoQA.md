# Manual de roles y flujo de revisión — ALETHEIA CLM

Guía de referencia por rol para probar el flujo de revisión de contratos. Sirve para QA interno (recorrer módulo por módulo sin que se escape nada del flujo) y para que un equipo nuevo entienda cómo trabaja la aplicación antes de tocarla.

> **Estado:** documento vivo. Si algo descrito aquí cambió de lugar o de nombre en el código, confía primero en lo que ves en pantalla y actualiza este archivo.

## 0. Antes de empezar — estás en la rama correcta

La rama por defecto del repositorio (`main`) **todavía no tiene este flujo**: solo funcionan el login y dos endpoints de solo lectura para el asistente de Alexa (`contracts/expiring`, `contracts/metrics`, `reports/daily-summary`, `reports/bottlenecks`).

El flujo completo — Solicitante → Administrador → Abogado → Aprobador → Firmante — vive en la rama sin fusionar **`feat/clm-integration`** (microservicios + microfrontends, estructura de carpetas distinta a `clm-system/`). Antes de reportar un módulo como "roto", confirma con:

```bash
git branch --show-current
```

que estás sobre `feat/clm-integration` (o una rama derivada de ella). Sobre `main`, prácticamente nada de este manual aplica todavía.

### Cómo levantarlo

```bash
# 1. dependencias y variables de entorno
pnpm install
pnpm setup:env

# 2. infraestructura (Postgres 16 + Redis 7)
pnpm infra:up
pnpm db:migrate
pnpm db:seed        # crea los 5 usuarios demo + catálogos

# 3. levantar todo (gateway + 4 servicios + shell + 7 microfrontends)
pnpm dev
```

**Nota de una corrida real (2026-07-30):** el paquete compartido `@aletheia/backend-commons` no viene compilado (`main` apunta a `dist/index.js`, que no existe hasta construirlo). Si usas `pnpm dev` (o `turbo dev`) tal cual, turbo lo resuelve solo porque la tarea `dev` depende de `^build` en `turbo.json`. Pero si arrancas los servicios uno por uno a mano (por ejemplo con `scripts/dev-staged.mjs`, pensado para no saturar memoria en Windows con ~13 procesos), ese script llama `pnpm run dev` directo en cada carpeta y **se salta el build de `backend-commons`** — los 5 servicios backend truenan con `Cannot find module '@aletheia/backend-commons'`. Arréglalo compilándolo una vez antes de arrancar:

```bash
pnpm --filter @aletheia/backend-commons build
```

URLs una vez arriba:
- App / login: `localhost:4000`
- Gateway / Swagger: `localhost:3001/api/docs`
- Explicación pública: `/como-funciona`

Los puertos 4001–4007 son los microfrontends individuales — no se visitan directo, el shell los sirve por debajo de rutas como `/solicitudes` o `/flujo`.

## 1. El recorrido de un contrato

Siete estados, cinco relevos. Cada flecha es un cambio de estado real en el backend (máquina de estados en `workflow-service`); el rol es quien puede dispararlo.

```
DRAFT --(Solicitante envía)--> SUBMITTED --(Administrador aprueba)--> ADMIN_REVIEW
  --(Abogado aprueba)--> LAWYER_REVIEW --(Aprobador aprueba)--> APPROVAL_PENDING
  --(pasa a firma)--> SIGNING --(Firmante firma)--> SIGNED
```

Ramas:
- **CANCELLED** ← Solicitante, desde cualquier estado activo (motivo obligatorio). Puede **recuperar** de vuelta a DRAFT.
- **REJECTED** ← Administrador/Abogado regresan a DRAFT con comentario. El Aprobador rechaza en definitiva (estado final, sin regreso).

## 2. Accesos de prueba

Todos con contraseña `password123`. El login también trae un botón de acceso rápido por rol.

| Rol | Correo | Área | Nota |
|---|---|---|---|
| Solicitante | `solicitante@aletheia.com` | 1 | — |
| Administrador | `admin@aletheia.com` | — | ⚠️ tiene los 19 privilegios del sistema, no solo los del rol |
| Abogado | `abogado@aletheia.com` | 1 | — |
| Aprobador | `aprobador@aletheia.com` | 1 | — |
| Firmante | `firmante@aletheia.com` | 1 | — |

**El admin sembrado no representa el rol "puro".** La cuenta demo de Administrador tiene los 19 privilegios del sistema, así que en la práctica también puede crear, editar, enviar y firmar contratos — algo que el rol Administrador no debería poder hacer. Para probar el límite real de permisos, crea un usuario Administrador nuevo desde `/admin → Usuarios` y entra con ese en vez de con la cuenta sembrada.

## 3. Solicitante

Origina el contrato: arma la solicitud, adjunta documentación de soporte y decide cuándo está listo para entrar a revisión. Único que puede cancelar o recuperar su propia solicitud.

**Pantallas:** `/solicitudes` (lista y detalle) · `/solicitudes/crear` (alta y edición, solo en DRAFT) · `/documentos` (carga de soporte)

**Pasos para probar:**
1. Inicia sesión como Solicitante y entra a **Solicitudes**.
2. Crea una solicitud nueva; verifica folio automático y que queda en **DRAFT**.
3. Ábrela y usa **Editar** — confirma que ya no se puede editar una vez fuera de DRAFT.
4. Sube un documento requerido desde `/documentos` (ver gap conocido abajo).
5. Da clic en **Enviar a revisión** — pasa a **SUBMITTED** y desaparece de tu bandeja de edición.
6. En otro contrato activo, prueba **Cancelar** con motivo obligatorio → **CANCELLED**.
7. Desde ese contrato, prueba **Recuperar** → vuelve a **DRAFT**, editable de nuevo.

**No debería poder:** aprobar/rechazar/regresar un contrato en revisión · firmar un contrato ajeno · entrar a `/admin` ni a configuración de etapas.

**Gap conocido:** la carga de documentos funciona en pantalla, pero hoy se envía un `fileUrl` simulado en JSON, no el binario — el archivo nunca llega al almacenamiento real (HU-08).

## 4. Administrador

Primer filtro después de que una solicitud se envía. Configura el sistema (usuarios, áreas, apoderados, etapas del flujo) y consulta reportes globales.

**Pantallas:** `/flujo` (panel de revisión, SLA, línea de tiempo) · `/admin` (usuarios, áreas, apoderados, etapas) · `/reportes` (KPIs, filtros, CSV, auditoría)

**Pasos para probar:**
1. Inicia sesión como Administrador y entra a **Flujo de trabajo** — cola en **SUBMITTED**.
2. Abre uno y prueba **Aprobar** → pasa a **ADMIN_REVIEW**.
3. Con otro, prueba **Regresar / Rechazar** con comentario obligatorio → vuelve a **DRAFT** y notifica al Solicitante.
4. Revisa el dashboard de SLA (semáforo verde/amarillo/rojo por etapa) y la línea de tiempo.
5. En **Administración → Usuarios**, da de alta un usuario con rol y área.
6. Repite en **Áreas** y **Apoderados** — alta simple en cada uno.
7. En **Etapas del flujo**, edita nombre, rol responsable u horas de SLA de una etapa, y reordénala.
8. En **Reportes**: filtra por estado/área, exporta CSV, abre la bitácora de auditoría de un contrato.

**No debería poder** *(con un Administrador "puro", no con la cuenta demo)*: crear/editar/enviar/firmar contratos · aprobar en las colas de Abogado o Aprobador.

**Gaps conocidos:**
- Los tiles del dashboard de rol ("Contratos activos", "Pendientes de acción") están fijos como skeleton, no conectados a datos reales.
- El panel de auditoría es más delgado que el resto de `/reportes`.

## 5. Abogado

Hace la revisión legal de fondo. Redacta y mantiene plantillas, y elabora el documento formal del contrato a partir de una de ellas.

**Pantallas:** `/flujo` (cola LAWYER_REVIEW) · `/contratos` (editor de plantillas y del documento formal) · `/documentos` (carga y versiones)

**Pasos para probar:**
1. Inicia sesión como Abogado y entra a **Flujo de trabajo** — cola solo con contratos en **LAWYER_REVIEW**.
2. Aprueba uno → pasa a **APPROVAL_PENDING**. Rechaza otro con comentario → regresa a **DRAFT**.
3. En **Contratos → Plantillas**, crea o edita una plantilla en el editor de texto enriquecido.
4. Elabora el documento formal de un contrato desde una plantilla: tamaño de página, márgenes, encabezado/pie, vista previa en vivo.
5. En **Documentos**, sube una nueva versión de un documento existente y revisa el historial de versiones.

**No debería poder:** ver/actuar sobre SUBMITTED (Administrador) ni APPROVAL_PENDING (Aprobador) · dar la aprobación final ni firmar.

**Gap conocido:** mismo problema de carga de documentos que Solicitante (HU-08).

## 6. Aprobador

Da la aprobación final de negocio antes de firma. Su decisión es la última puerta: si rechaza, el contrato no vuelve a DRAFT, se cierra como rechazado.

**Pantallas:** `/flujo` (cola APPROVAL_PENDING, con panel de notificaciones) · `/reportes`

**Pasos para probar:**
1. Inicia sesión como Aprobador y entra a **Flujo de trabajo** — cola en **APPROVAL_PENDING**.
2. En un contrato, usa **Aprobar y enviar a firma** → pasa a **SIGNING**.
3. En otro, usa **Rechazar** con motivo obligatorio → pasa a **REJECTED** (estado final).
4. Revisa el panel de notificaciones dentro de Flujo — marca alertas como leídas.
5. Entra a **Reportes** y confirma los mismos KPIs y exportación que Administrador.

**No debería poder:** actuar sobre ADMIN_REVIEW o LAWYER_REVIEW · firmar el contrato ni editar el documento.

**Gaps conocidos:** ninguno propio más allá de los generales — de los roles con la ruta más completa.

## 7. Firmante

Cierra el ciclo de vida: captura la firma electrónica del contrato ya aprobado. Puede firmar a nombre propio o seleccionar un apoderado.

**Pantallas:** `/firmas` (lista de pendientes) · `/firmas/detalle/[id]` · `/firmas/firmar/[id]` (lienzo de firma)

**Pasos para probar:**
1. Inicia sesión como Firmante y entra a **Firmas** — solo contratos en **SIGNING**.
2. Abre uno y entra a **Firmar**: dibuja la firma en el lienzo (mouse o táctil).
3. Opcional: selecciona un apoderado antes de guardar.
4. Da clic en **Guardar firma**. El contrato pasa a **SIGNED** vía una cola en segundo plano — puede tardar unos segundos; buen momento para probar si la pantalla refresca sola o hace falta recargar.
5. Confirma en el detalle que el estado quedó en **SIGNED** y que la firma se muestra.

**No debería poder:** iniciar/editar/revisar/aprobar contratos · entrar a `/admin`, `/contratos` o al panel de revisión de `/flujo`.

**Gaps conocidos:**
- Sin bandeja de notificaciones visible (el backend sí genera la notificación de "listo para firmar") (HU-26).
- El apoderado seleccionado no se valida en servidor — se puede firmar con uno inválido sin error (HU-15).

## 8. Recorrido completo (E2E)

La forma más rápida de validar que el flujo entero funciona: seguir un solo contrato de punta a punta, cambiando de usuario en cada paso.

| # | Rol | Acción | Cambio de estado |
|---|---|---|---|
| 1 | Solicitante | Crea la solicitud, adjunta documentos y la envía a revisión | — → DRAFT → SUBMITTED |
| 2 | Administrador | La revisa en su cola y la aprueba | SUBMITTED → ADMIN_REVIEW |
| 3 | Abogado | Revisión legal, aprueba y deja lista la versión formal del documento | ADMIN_REVIEW → LAWYER_REVIEW → APPROVAL_PENDING |
| 4 | Aprobador | Aprobación final, lo envía a firma | APPROVAL_PENDING → SIGNING |
| 5 | Firmante | Captura la firma y cierra el contrato | SIGNING → SIGNED |

**Variantes para no probar solo el camino feliz:** repite el recorrido rechazando en cada etapa (regresa a DRAFT desde Administrador/Abogado, rechazo definitivo desde Aprobador), y prueba cancelar + recuperar desde el Solicitante en cualquier punto antes de SIGNING.

## 9. Cobertura conocida (antes de reportar un bug)

Estos huecos ya están identificados en el código — repórtalos si quieres, pero no como hallazgo nuevo. Todo lo que **no** esté en esta lista sí es candidato a bug real.

| Área | Qué pasa | Estado | HU |
|---|---|---|---|
| Carga de documentos | El selector de archivo funciona, pero se envía solo un `fileUrl` simulado; el binario nunca llega al almacenamiento del backend. | No conectado | HU-08 |
| Vigencia de documentos | `expiresAt` se guarda, pero "vencido / por vencer" solo se calcula en el navegador, sin regla de negocio en el servidor. | Parcial | HU-10 |
| Apoderado en firma | Se guarda el `apoderadoId` elegido, pero el servidor no valida que exista o esté activo. | Parcial | HU-15 |
| Auditoría / línea de tiempo | El backend de `/reportes` está completo; el panel de auditoría en pantalla es más sencillo que el resto del módulo. | Parcial | HU-24 / HU-25 |
| Notificaciones | El backend notifica a cualquier usuario o rol, pero solo hay bandeja visible dentro del panel de revisión de Flujo (Administrador, Abogado, Aprobador). Solicitante y Firmante no tienen dónde verlas aún. | Parcial | HU-26 |
| Métricas del dashboard de rol | Los tiles de resumen ("Contratos activos", etc.) son placeholders fijos, no conectados a datos reales. | No conectado | — |
| Cuenta demo de Administrador | Tiene los 19 privilegios del sistema en vez de solo los del rol — puede hacer cosas que un Administrador real no debería. | Dato de seed | — |
| `scripts/dev-staged.mjs` | No compila `@aletheia/backend-commons` antes de arrancar los servicios backend — arréglalo con `pnpm --filter @aletheia/backend-commons build` antes de correrlo (ver §0). | Bug del script de arranque, no de la app | — |

## 10. Fuentes de este manual

- Código de `feat/clm-integration` (gateway, servicios, microfrontends) — commit `1654b6d`.
- `docs/04-product/historias-de-usuario.md` (esa rama, 26 HUs)
- `docs/04-product/roles-y-cobertura.md` (esa rama)
- `docs/03-runbooks/ejecutar-proyecto.md` (esa rama)

También existe una versión visual (HTML) de este mismo manual, publicada como Artifact de Claude — privada por defecto, útil para lectura rápida con navegación lateral, pero no es la fuente de verdad: **este archivo es la fuente de verdad**, porque vive versionado en el repo.
