# Historias de Usuario — Gestor de Contratos CLM

---

## Autenticación

### HU-01 — Iniciar sesión
**Como** usuario del sistema, **quiero** iniciar sesión con mis credenciales **para** acceder a las funciones que me corresponden según mi rol.

**Criterios de aceptación:**
- El usuario ingresa correo electrónico y contraseña válidos.
- Al autenticarse correctamente, el sistema emite un token de acceso y un token de refresco, y redirige al panel principal.
- Si las credenciales son incorrectas, se muestra un mensaje de error genérico sin especificar cuál campo falla.
- El token de acceso expira a los 15 minutos; el sistema lo renueva automáticamente mediante el token de refresco sin cerrar la sesión del usuario.

---

### HU-02 — Cerrar sesión
**Como** usuario autenticado, **quiero** cerrar sesión **para** proteger mi cuenta en equipos compartidos.

**Criterios de aceptación:**
- Al cerrar sesión, el token de acceso y el token de refresco quedan invalidados en el sistema.
- El sistema redirige al formulario de inicio de sesión.
- No es posible acceder a ningún recurso protegido con el token invalidado.

---

## Solicitudes

### HU-03 — Crear solicitud de contrato
**Como** Solicitante, **quiero** registrar los datos generales de una nueva solicitud de contrato **para** iniciar el proceso de contratación.

**Criterios de aceptación:**
- Solo usuarios con el privilegio `CONTRACT_CREATE` pueden acceder a esta función.
- Los campos obligatorios son: sociedad, nombre del proveedor, correo del proveedor, tipo de proveedor (Persona Física o Persona Moral) y área requirente.
- El sistema genera automáticamente un folio único e irrepetible.
- El contrato se guarda en estado `DRAFT`.
- La lista de documentos requeridos se determina dinámicamente según el tipo de proveedor seleccionado.

---

### HU-04 — Editar solicitud antes de enviar
**Como** Solicitante, **quiero** modificar los datos de mi solicitud **para** corregir información antes de enviarla a revisión.

**Criterios de aceptación:**
- Solo es posible editar solicitudes en estado `DRAFT`.
- Se requiere el privilegio `CONTRACT_EDIT`.
- No se puede editar una solicitud que ya fue enviada o que se encuentra en cualquier etapa de revisión.
- Los cambios quedan registrados en la bitácora de auditoría.

---

### HU-05 — Enviar solicitud a revisión
**Como** Solicitante, **quiero** enviar mi solicitud completa **para** que el Administrador inicie su revisión.

**Criterios de aceptación:**
- Se requiere el privilegio `CONTRACT_SUBMIT`.
- La solicitud debe estar en estado `DRAFT`.
- Al enviar, el estado cambia a `SUBMITTED` y se genera una notificación al Administrador.
- La acción queda registrada en la bitácora con usuario, fecha y hora.

---

### HU-06 — Cancelar solicitud
**Como** Solicitante o Administrador, **quiero** cancelar una solicitud en curso **para** detener su procesamiento.

**Criterios de aceptación:**
- Se requiere el privilegio `CONTRACT_CANCEL`.
- La cancelación es posible desde cualquier estado activo excepto `SIGNED`, `CANCELLED` y `REJECTED`.
- Es obligatorio ingresar el motivo de cancelación.
- Al cancelar, el estado cambia a `CANCELLED` y se notifica a los usuarios involucrados.
- La acción queda registrada en la bitácora.

---

### HU-07 — Recuperar solicitud cancelada
**Como** Solicitante o Administrador, **quiero** reactivar una solicitud cancelada **para** reiniciar su proceso de contratación.

**Criterios de aceptación:**
- Se requiere el privilegio `CONTRACT_RECOVER`.
- Solo aplica sobre contratos en estado `CANCELLED`.
- Al recuperar, el estado vuelve a `DRAFT`.
- La acción queda registrada en la bitácora.

---

## Documentos

### HU-08 — Cargar documentos requeridos
**Como** Solicitante, **quiero** adjuntar los documentos exigidos según el tipo de proveedor **para** completar la información necesaria para la revisión.

**Criterios de aceptación:**
- Se requiere el privilegio `DOCUMENT_UPLOAD`.
- La lista de documentos varía según el tipo de proveedor: Persona Física o Persona Moral.
- Cada documento registra nombre, tipo y fecha de vigencia (cuando aplique).
- Los documentos quedan vinculados al contrato correspondiente.

---

### HU-09 — Gestionar versiones de un documento
**Como** Solicitante, Administrador o Abogado, **quiero** subir una nueva versión de un documento existente **para** reemplazar archivos incorrectos sin perder el historial.

**Criterios de aceptación:**
- Se requiere el privilegio `DOCUMENT_VERSION`.
- Cada subida incrementa el número de versión del documento.
- El historial de versiones es consultable e incluye: número de versión, tamaño, tipo MIME, usuario que lo subió y fecha.
- La versión más reciente es la que se considera activa.

---

### HU-10 — Controlar vigencia de documentos
**Como** Solicitante, **quiero** registrar la fecha de vigencia de un documento **para** que el sistema permita identificar documentos vencidos o próximos a vencer.

**Criterios de aceptación:**
- La fecha de vigencia es un campo opcional por documento.
- El sistema permite consultar documentos cuya vigencia ya venció o está próxima a vencer.
- Un documento vencido es visible pero queda marcado como tal en la interfaz.

---

## Flujo de Revisión

### HU-11 — Revisar solicitud como Administrador
**Como** Administrador, **quiero** revisar los datos y documentos de una solicitud enviada **para** aprobarla o devolverla al solicitante con observaciones.

**Criterios de aceptación:**
- Se requiere el privilegio `CONTRACT_REVIEW_ADMIN`.
- Solo son visibles las solicitudes en estado `SUBMITTED`.
- Al aprobar, el estado cambia a `LAWYER_REVIEW` y se notifica al Abogado.
- Al rechazar, se requiere ingresar un comentario; el estado vuelve a `DRAFT` y el Solicitante recibe una notificación con el comentario.
- La acción queda registrada en la bitácora con usuario, fecha y hora.

---

### HU-12 — Ver semáforo de tiempos SLA
**Como** Administrador o Abogado, **quiero** ver un indicador visual del tiempo transcurrido por contrato en la etapa actual **para** identificar cuáles requieren atención urgente y evitar incumplimientos de tiempo.

**Criterios de aceptación:**
- El indicador muestra tres estados: Verde (menos del 60% del tiempo SLA consumido), Amarillo (entre el 60% y el 100%) y Rojo (SLA superado, 100% o más).
- El cálculo se realiza en tiempo real a partir del momento en que el contrato entró a la etapa actual.
- El indicador es visible en el panel de revisión correspondiente a cada rol.

---

### HU-13 — Revisar contrato como Abogado
**Como** Abogado, **quiero** revisar el contrato validado por el Administrador **para** aprobarlo o solicitar correcciones adicionales.

**Criterios de aceptación:**
- Se requiere el privilegio `CONTRACT_REVIEW_LAWYER`.
- Solo son visibles los contratos en estado `LAWYER_REVIEW`.
- Al aprobar, el estado cambia a `APPROVAL_PENDING` y se notifica al Aprobador.
- Al rechazar, se requiere ingresar un comentario; el estado vuelve a `DRAFT` y el Solicitante recibe una notificación.
- La acción queda registrada en la bitácora.

---

### HU-14 — Aprobar contrato formalmente
**Como** Aprobador, **quiero** revisar y aprobar formalmente el contrato **para** autorizar el inicio del proceso de firma.

**Criterios de aceptación:**
- Se requiere el privilegio `CONTRACT_APPROVE`.
- Solo son visibles los contratos en estado `APPROVAL_PENDING`.
- Al aprobar, el estado cambia a `SIGNING` y se notifica al Firmante.
- Al rechazar, el estado cambia a `REJECTED`; se requiere ingresar el motivo.
- La acción queda registrada en la bitácora.

---

### HU-15 — Firmar contrato
**Como** Firmante, **quiero** registrar mi firma simulada en el contrato **para** darle validez final al proceso de contratación.

**Criterios de aceptación:**
- Se requiere el privilegio `CONTRACT_SIGN`.
- Solo es accesible en contratos con estado `SIGNING`.
- La firma se captura mediante un canvas interactivo y se almacena como imagen en formato base64.
- Es posible asociar la firma a un apoderado registrado en el sistema.
- Al firmar, el estado cambia a `SIGNED`, que es el estado final del contrato.
- Se notifica a todos los usuarios involucrados y la acción queda registrada en la bitácora.

---

## Consulta de Contratos

### HU-16 — Consultar contratos del área propia
**Como** Solicitante, Abogado, Aprobador o Firmante, **quiero** consultar los contratos asociados a mi área **para** dar seguimiento a su estado.

**Criterios de aceptación:**
- Se requiere el privilegio `CONTRACT_VIEW_AREA`.
- Solo se muestran contratos cuya área coincide con el área asignada al usuario autenticado.
- Cada contrato muestra su folio, estado actual e indicador SLA cuando aplique.

---

### HU-17 — Consultar todos los contratos
**Como** Administrador, **quiero** consultar todos los contratos del sistema sin restricción de área **para** gestionar y supervisar el proceso global de contratación.

**Criterios de aceptación:**
- Se requiere el privilegio `CONTRACT_VIEW_ALL`.
- Permite filtrar por estado, área y responsable asignado.
- El resultado incluye todos los contratos independientemente del área.

---

## Plantillas y Editor

### HU-18 — Crear y editar plantillas de contrato
**Como** Administrador o Abogado, **quiero** crear y administrar plantillas mediante un editor de texto enriquecido **para** estandarizar el contenido de los contratos y agilizar su elaboración.

**Criterios de aceptación:**
- Se requiere el privilegio `TEMPLATES_MANAGE`.
- El editor permite formato de texto enriquecido (WYSIWYG).
- Una plantilla puede asociarse a una sociedad específica o estar disponible de forma general.
- Las plantillas pueden activarse o desactivarse sin eliminarse del sistema.

---

### HU-19 — Usar plantilla al elaborar un contrato
**Como** Abogado, **quiero** seleccionar una plantilla predefinida al elaborar el documento final del contrato **para** partir de un formato estandarizado y reducir el tiempo de redacción.

**Criterios de aceptación:**
- Las plantillas disponibles se filtran según la sociedad del contrato.
- Al seleccionar una plantilla, su contenido se carga en el editor del contrato.
- El contenido cargado puede ser modificado libremente antes de guardarlo.

---

## Configuración del Sistema

### HU-20 — Configurar etapas del flujo de trabajo
**Como** Administrador, **quiero** configurar las etapas del proceso de revisión **para** adaptarlas a las necesidades de la organización sin modificar el código del sistema.

**Criterios de aceptación:**
- Se requiere el privilegio `WORKFLOW_CONFIG`.
- Permite agregar, editar y reordenar etapas del flujo.
- Cada etapa requiere: nombre, rol asignado y tiempo SLA en horas.
- Los cambios en la configuración aplican únicamente a contratos que inicien el flujo después del cambio; los contratos en proceso no se ven afectados.

---

### HU-21 — Gestionar usuarios
**Como** Administrador, **quiero** crear, editar y desactivar usuarios del sistema **para** controlar quién tiene acceso y con qué permisos.

**Criterios de aceptación:**
- Se requiere el privilegio `USERS_MANAGE`.
- Permite crear usuarios con nombre, correo, contraseña, área y uno o más roles asignados.
- Permite editar los datos y roles de un usuario existente.
- Un usuario desactivado no puede iniciar sesión.

---

### HU-22 — Gestionar áreas
**Como** Administrador, **quiero** crear y administrar las áreas de la organización **para** clasificar correctamente a usuarios y contratos.

**Criterios de aceptación:**
- Se requiere el privilegio `AREAS_MANAGE`.
- Permite crear, editar y desactivar áreas.
- Un área desactivada no puede asignarse a nuevos contratos ni usuarios.
- Las áreas previamente asignadas a contratos históricos se conservan para mantener la integridad del registro.

---

### HU-23 — Gestionar apoderados
**Como** Administrador, **quiero** registrar y administrar los apoderados legales autorizados **para** que puedan asociarse a las firmas de contratos.

**Criterios de aceptación:**
- Se requiere el privilegio `APODERADOS_MANAGE`.
- Cada apoderado requiere nombre y descripción del poder legal.
- Un apoderado inactivo no puede asociarse a nuevas firmas.

---

## Reportes e Historial

### HU-24 — Consultar bitácora de auditoría de un contrato
**Como** Administrador, Abogado o Aprobador, **quiero** consultar el historial completo de acciones sobre un contrato **para** tener trazabilidad de todo lo ocurrido.

**Criterios de aceptación:**
- Se requiere el privilegio `REPORTS_VIEW`.
- Muestra cada acción con: tipo de acción, usuario que la realizó, fecha y hora, y valores anterior y nuevo cuando aplique.
- El historial se presenta en orden cronológico de más reciente a más antiguo.

---

### HU-25 — Generar reporte de contratos
**Como** Administrador, Abogado o Aprobador, **quiero** generar un reporte filtrado de contratos **para** analizar el estado general del proceso de contratación.

**Criterios de aceptación:**
- Se requiere el privilegio `REPORTS_VIEW`.
- Permite filtrar por: estado del contrato, área y responsable asignado.
- El resultado puede exportarse en formato CSV.

---

## Notificaciones

### HU-26 — Recibir notificaciones internas
**Como** cualquier usuario del sistema, **quiero** recibir notificaciones dentro de la plataforma cuando ocurra un cambio de estado en contratos que me involucran **para** estar informado sin necesidad de consultar manualmente el sistema.

**Criterios de aceptación:**
- Las notificaciones se generan automáticamente en los siguientes eventos: envío a revisión, aprobación, rechazo, cancelación y firma.
- Cada notificación incluye título, mensaje descriptivo y referencia al contrato relacionado.
- Las notificaciones pueden marcarse como leídas.
- Un usuario solo recibe notificaciones de contratos en los que participa según su rol y área.
