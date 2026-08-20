# Roles — ALETHEIA (CLM)

> Explica qué hace cada rol y por qué. Para el estado de implementación de cada función (qué está
> hecho, qué falta) ver [`roles-y-cobertura.md`](./roles-y-cobertura.md). Para probarlo paso a paso
> con cuentas demo, ver [`manual-roles-y-flujo-qa.md`](./manual-roles-y-flujo-qa.md).

## Los roles son paquetes de privilegios, no cargos

El sistema no autoriza "porque eres Abogado". Autoriza porque tu usuario tiene el privilegio
`CONTRACT_REVIEW_LAWYER` — y ese privilegio, hoy, se lo asigna el rol Abogado. Esta distinción
importa porque el mismo mecanismo que protege un botón en pantalla (que ni siquiera aparece si no
tienes el privilegio) es el que protege el endpoint correspondiente en el backend: nadie evita la
regla llamando a la API directamente.

Cada rol es, en la práctica, un catálogo de privilegios concretos. Abajo, cada uno explicado en
lenguaje de negocio; la tabla completa de privilegios está al final.

---

## Solicitante — origina el contrato

**Es quien necesita contratar algo.** Registra la solicitud, adjunta la documentación del
proveedor, y decide cuándo está lista para entrar a revisión.

- Crea la solicitud: sociedad, proveedor, tipo de proveedor (persona física o moral), área.
- Sube los documentos de soporte que el sistema le pide según el tipo de proveedor.
- Envía la solicitud a revisión cuando está completa.
- Es el único que puede **cancelar** su propia solicitud (con motivo) o **recuperarla** si se
  canceló por error.
- Puede editar la solicitud solo mientras sigue en borrador (`DRAFT`) — una vez enviada, deja de
  ser suya para editar.

**No puede:** aprobar, rechazar ni regresar un contrato en revisión; firmar; entrar a
administración del sistema.

## Administrador — primer filtro y administra el sistema

**Tiene dos sombreros.** Es la primera compuerta de revisión después de que el Solicitante envía, y
además es quien mantiene la configuración del sistema.

Como revisor:
- Recibe cada solicitud enviada y decide si avanza a revisión legal, o si la regresa al Solicitante
  con observaciones (el contrato vuelve a `DRAFT`).
- Ve el semáforo de SLA de todos los contratos activos, para detectar cuellos de botella.
- Tiene visibilidad total: puede ver cualquier contrato, no solo los de su área.

Como administrador del sistema:
- Da de alta usuarios y les asigna rol y área.
- Mantiene el catálogo de áreas, apoderados y plantillas de contrato.
- Configura las etapas del flujo de revisión (nombre, quién es responsable, horas de SLA) — puede
  ajustar el proceso sin que nadie toque código.
- Consulta reportes globales, exporta a CSV, revisa la bitácora de auditoría.

**No puede** (con un Administrador que solo tiene los privilegios propios del rol): crear, editar,
enviar o firmar contratos; actuar en las colas de revisión del Abogado o del Aprobador.

## Abogado — revisión legal y dueño del documento formal

**Hace la revisión de fondo.** No solo aprueba o rechaza: es quien convierte una plantilla en el
**documento formal** de ese contrato específico — el contenido que todos los roles siguientes van a
ver y firmar, no un ejercicio aparte.

- Recibe los contratos que el Administrador ya aprobó.
- Selecciona una plantilla y redacta el documento formal del contrato (tamaño de página, márgenes,
  encabezado/pie, vista previa en vivo).
- No puede aprobar un contrato sin haberle elaborado su documento formal primero — el sistema lo
  bloquea explícitamente.
- Aprueba (pasa a revisión del Aprobador) o devuelve al Solicitante con observaciones.
- Mantiene el catálogo de plantillas y gestiona nuevas versiones de documentos ya subidos —a
  diferencia del Solicitante, no puede subir un documento desde cero, solo versionar uno existente.

**No puede:** actuar sobre solicitudes recién enviadas (eso es del Administrador) ni sobre
contratos ya en aprobación final o firma; dar la aprobación de negocio ni firmar.

## Aprobador — autorización de negocio

**Es la última puerta humana antes de firmar.** Ya con el documento formal del Abogado sobre la
mesa, decide si el contrato está listo para comprometer a la empresa.

- Revisa los contratos que ya pasaron la validación legal.
- Puede abrir la vista previa del documento formal antes de decidir.
- Aprueba (habilita la firma) o rechaza en definitiva — a diferencia de las devoluciones anteriores,
  un rechazo del Aprobador **no regresa** el contrato a edición: lo cierra como `REJECTED`.
- Consulta los mismos reportes y KPIs que el Administrador.

**No puede:** actuar sobre contratos que aún no pasaron por Administrador o Abogado; editar el
documento; firmar.

## Firmante — cierra el ciclo de vida

**Registra la firma que da validez final al contrato.** Puede firmar a nombre propio o en
representación de un apoderado registrado.

- Ve la lista de contratos ya aprobados y listos para firma.
- Abre la vista previa del documento formal (mismo componente que usa el Aprobador) antes de firmar.
- Dibuja la firma en un lienzo digital; opcionalmente selecciona un apoderado.
- Al guardar, el contrato pasa a `SIGNED` — estado final.

**No puede:** iniciar, editar, revisar ni aprobar contratos; entrar a administración ni a los
paneles de revisión de otros roles.

---

## Matriz de privilegios

19 privilegios granulares repartidos entre los 5 roles. Esta tabla es la fuente de verdad que
gobierna tanto los botones en pantalla como los endpoints del backend.

| Privilegio | Solicitante | Administrador | Abogado | Aprobador | Firmante |
|---|:---:|:---:|:---:|:---:|:---:|
| `CONTRACT_CREATE` — crear solicitud | ✓ | | | | |
| `CONTRACT_EDIT` — editar antes de enviar | ✓ | | | | |
| `CONTRACT_SUBMIT` — enviar a revisión | ✓ | | | | |
| `CONTRACT_CANCEL` — cancelar en curso | ✓ | ✓ | | | |
| `CONTRACT_RECOVER` — reactivar cancelado | ✓ | ✓ | | | |
| `CONTRACT_REVIEW_ADMIN` — revisar como Administrador | | ✓ | | | |
| `CONTRACT_REVIEW_LAWYER` — revisar como Abogado | | | ✓ | | |
| `CONTRACT_APPROVE` — aprobación formal | | | | ✓ | |
| `CONTRACT_SIGN` — registrar firma | | | | | ✓ |
| `CONTRACT_VIEW_AREA` — ver contratos del área propia | ✓ | | ✓ | ✓ | ✓ |
| `CONTRACT_VIEW_ALL` — ver todos los contratos | | ✓ | | | |
| `DOCUMENT_UPLOAD` — subir documentos | ✓ | | ✓ | | |
| `DOCUMENT_VERSION` — gestionar versiones | ✓ | ✓ | ✓ | | |
| `WORKFLOW_CONFIG` — configurar etapas del flujo | | ✓ | | | |
| `USERS_MANAGE` — CRUD de usuarios | | ✓ | | | |
| `AREAS_MANAGE` — CRUD de áreas | | ✓ | | | |
| `APODERADOS_MANAGE` — CRUD de apoderados | | ✓ | | | |
| `TEMPLATES_MANAGE` — CRUD de plantillas | | ✓ | ✓ | | |
| `REPORTS_VIEW` — ver reportes e historial | | ✓ | ✓ | ✓ | |

> El detalle técnico de cómo se aplican estos privilegios en el gateway (`@RequirePrivilege`,
> `PrivilegeGuard`) y en el frontend está en
> [`implementacion.md` §7 y §10](../01-architecture/implementacion.md).
