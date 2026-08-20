# Visión General — ALETHEIA (CLM)

> Empieza aquí. Este documento da el panorama completo del proyecto en una lectura corta. Desde
> acá, cada sección enlaza al documento que profundiza en ese tema.

## El problema que resuelve

Gestionar contratos empresariales a mano —correos sueltos, versiones de Word por WhatsApp,
aprobaciones verbales— hace que nadie sepa con certeza en qué estado está un contrato, quién lo
tiene detenido, ni por qué. **ALETHEIA es un CLM (Contract Lifecycle Management):** un sistema que
convierte ese proceso informal en una cadena de responsabilidades explícitas, con un dueño claro en
cada paso y un registro de quién hizo qué y cuándo.

El nombre viene del griego *ἀλήθεια* ("verdad", "lo que no se oculta") — la idea central del
producto: en cualquier momento, cualquier persona autorizada puede ver el estado real de un
contrato, no una versión aproximada.

## La idea central: un contrato es un recorrido, no un documento suelto

Un contrato en ALETHEIA no es un archivo que alguien sube y ya. Es un **objeto con estado**, que
nace como una solicitud (`DRAFT`) y atraviesa una cadena de revisiones —cada una a cargo de un rol
distinto— hasta llegar a `SIGNED` o cerrarse como `REJECTED`/`CANCELLED`. Cada cambio de estado:

- Solo lo puede disparar quien tiene el **privilegio** exacto para hacerlo.
- Queda **registrado** (quién, qué acción, cuándo).
- **Notifica automáticamente** a quien sigue en la cadena.

Este recorrido —los 7 estados, quién controla cada transición, y qué pasa cuando algo se rechaza o
se cancela— está explicado a fondo en
[`docs/04-product/flujo-y-estados.md`](../04-product/flujo-y-estados.md).

## Quién lo usa: cinco roles, cinco responsabilidades

El sistema tiene 5 roles. No son "cargos" en el sentido tradicional: son **paquetes de
privilegios**. Un usuario ve y puede hacer exactamente lo que su rol le concede, ni más ni menos —
tanto en la interfaz (los botones que no aplican ni se muestran) como en el backend (el endpoint
rechaza la acción aunque alguien intente llamarlo directo).

| Rol | En una frase |
|---|---|
| **Solicitante** | Origina el contrato: registra la solicitud y adjunta la documentación del proveedor. |
| **Administrador** | Primer filtro de revisión, y además administra el sistema (usuarios, áreas, catálogos). |
| **Abogado** | Revisión legal de fondo; convierte una plantilla en el documento formal del contrato. |
| **Aprobador** | Da la autorización de negocio que habilita la firma — la última puerta antes de firmar. |
| **Firmante** | Cierra el ciclo capturando la firma electrónica. |

El detalle de qué hace cada uno día a día, qué no puede hacer, y la matriz completa de privilegios
está en [`docs/04-product/roles.md`](../04-product/roles.md).

## Cómo está construido

Por debajo, ALETHEIA es un monorepo con dos mitades independientes:

- **Backend:** un API Gateway más 4 microservicios (autenticación, contratos, flujo de trabajo,
  documentos), cada uno dueño de su propio dominio y su propio schema de base de datos.
- **Frontend:** una app anfitriona (`web-shell`) que compone 7 microfrontends independientes —uno
  por módulo de negocio (solicitudes, contratos, documentos, flujo, firmas, reportes,
  administración).

El porqué de esas decisiones —por qué microservicios, por qué microfrontends, cómo viaja una
petición desde el navegador hasta la base de datos— está explicado en lenguaje llano en
[`docs/01-architecture/arquitectura-explicada.md`](../01-architecture/arquitectura-explicada.md).
La referencia técnica exhaustiva (endpoints, schemas, guards, patrones de diseño) vive en
[`docs/01-architecture/implementacion.md`](../01-architecture/implementacion.md).

## Mapa de la documentación

| Quiero... | Voy a... |
|---|---|
| Entender el proyecto de punta a punta (este documento) | `docs/00-overview/vision-general.md` |
| Entender qué hace cada rol | `docs/04-product/roles.md` |
| Entender el ciclo de vida del contrato y sus estados | `docs/04-product/flujo-y-estados.md` |
| Entender por qué la arquitectura es así | `docs/01-architecture/arquitectura-explicada.md` |
| Consultar la referencia técnica exhaustiva | `docs/01-architecture/implementacion.md` |
| Ver las decisiones de arquitectura formales (ADRs) | `docs/01-architecture/decisions/` |
| Levantar el proyecto en mi máquina | `docs/03-runbooks/ejecutar-proyecto.md` |
| Probar el flujo completo, rol por rol | `docs/04-product/manual-roles-y-flujo-qa.md` |
| Ver qué historia de usuario cubre cada pantalla | `docs/04-product/roles-y-cobertura.md` |
