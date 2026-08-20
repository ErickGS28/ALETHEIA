# Arquitectura Explicada — ALETHEIA (CLM)

> Explica **por qué** la arquitectura es como es, en lenguaje llano, antes de entrar al detalle
> técnico. Para la referencia exhaustiva (endpoints, schemas exactos, guards, patrones de diseño)
> ver [`implementacion.md`](./implementacion.md). Para el razonamiento formal de cada decisión, con
> alternativas consideradas, ver los [ADRs](./decisions/).

## El problema de fondo: dos productos, no uno

ALETHEIA tiene, en realidad, **dos aplicaciones separadas que aprenden a hablarse**: un backend que
solo entiende de datos y reglas de negocio, y un frontend que solo entiende de pantallas. Ninguno
sabe cómo está construido el otro por dentro — se comunican exclusivamente por HTTP/JSON. Esto se
llama **SOFEA** (Service-Oriented Front-End Architecture) y es la decisión que hace posible todo lo
demás: cada mitad puede crecer, romperse o desplegarse sin arrastrar a la otra.

## El backend: un gateway y cuatro dueños de dominio

En vez de un solo backend monolítico que sabe de todo (usuarios, contratos, flujo, documentos), el
sistema se divide en **cuatro microservicios**, cada uno responsable de un dominio y de nada más:

| Servicio | De qué es dueño |
|---|---|
| `auth-service` | Usuarios, login, roles y privilegios |
| `contracts-service` | Contratos, catálogos (áreas, sociedades, apoderados, plantillas) |
| `workflow-service` | Estados del contrato, SLA, notificaciones |
| `documents-service` | Documentos, versiones, firmas |

**¿Por qué no un monolito?** Porque cuando todo vive en un solo proceso con una sola base de datos,
cualquier cambio en "documentos" puede romper "contratos" sin que nadie lo note hasta producción, y
no hay forma de escalar o desplegar una parte sin desplegar todo. Separar por dominio fuerza
fronteras claras: `workflow-service` no puede leer directo la tabla de contratos porque ni siquiera
comparte su schema de base de datos con `contracts-service` — si necesita ese dato, lo pide.

**El costo de esa decisión** es más piezas moviéndose a la vez (más procesos que levantar en
desarrollo, más superficie de red entre servicios). El proyecto lo mitiga con `pnpm dev:core`, que
levanta solo el subconjunto necesario para el flujo de referencia en vez de las 15 apps completas.

Ningún cliente le habla directo a un microservicio. Todos pasan por el **API Gateway**: es el único
punto que expone HTTP hacia afuera, el único que valida el token de sesión y el único que sabe a
quién reenviar cada petición. Los microservicios ni siquiera exponen puerto público — se hablan
entre sí (gateway ↔ servicio) por **Redis pub/sub**, no por HTTP.

```
[ Navegador ]
      │  HTTP + JSON (Authorization: Bearer <token>)
      ▼
┌──────────────────────────────────────────────────────────┐
│  API Gateway                                               │
│  valida el token · verifica privilegios · reenvía          │
└──────────────────────────────────────────────────────────┘
      │  Redis pub/sub (no HTTP)
      ├──────────────┬──────────────────┬───────────────┐
      ▼              ▼                  ▼               ▼
 auth-service   contracts-service  workflow-service  documents-service
 schema auth      schema contracts   schema workflow    schema documents
```

**¿Por qué Redis y no HTTP entre servicios?** Es más simple de operar que meter un message broker
pesado, y alcanza sobradamente para el volumen de este sistema. La contraparte es que Redis pub/sub
es *fire-and-forget* — no garantiza que un mensaje llegue si el receptor está caído en ese instante
exacto. Es una decisión consciente, aceptable para el alcance actual (un mecanismo de reintento con
garantías más fuertes, como Kafka con outbox, queda anotado como mejora futura, no como pendiente
urgente).

**¿Y la base de datos?** Un solo servidor PostgreSQL, pero con **un schema por servicio** (no tablas
mezcladas). Cada microservicio es dueño exclusivo de su schema; nadie hace `JOIN` cruzando
dominios. Cuando un contrato necesita referenciar a un usuario, guarda su `id` como un dato suelto
(`String`), no como una llave foránea de base de datos — la integridad de esa referencia la
garantiza el servicio dueño, no el motor de base de datos. Es el punto intermedio entre "una sola
base de datos para todo" (simple pero acopla todo) y "una base de datos física por servicio"
(aislamiento total, pero mucho más costo operativo para un sistema de este tamaño).

## El frontend: un anfitrión y siete módulos independientes

Del lado del navegador pasa lo mismo pero con pantallas: en vez de una sola aplicación Next.js
gigante, hay una app anfitriona (**`web-shell`**) que compone **7 microfrontends**, uno por módulo
de negocio — solicitudes, contratos, documentos, flujo, firmas, reportes y administración. Cada uno
es su propio proyecto Next.js, con su propio `package.json`, su propio ciclo de build y su propio
despliegue.

```
localhost:4000/solicitudes  →  atendido por solicitudes-mf
localhost:4000/contratos    →  atendido por contratos-mf
localhost:4000/documentos   →  atendido por documentos-mf
...
```

El mecanismo que hace esto posible es **Next.js Multi-Zones**: el `web-shell` reescribe cada ruta
hacia la app que le corresponde, así que para quien navega es una sola aplicación continua, aunque
por debajo sean procesos y despliegues completamente separados. Se descartó **Module Federation**
(la alternativa más conocida para "frontends que se ensamblan en tiempo de ejecución") porque su
soporte para el App Router de Next.js —el que usa este proyecto— está roto, y el paquete que lo
habilitaba se descontinúa. Multi-Zones es el mecanismo nativo y sostenido de Next.js para este
mismo problema. La contrapartida: moverse entre zonas es una navegación de página completa, no
comparte el runtime de React entre módulos — un costo aceptado a cambio de estabilidad.

## Cómo viaja una petición real, de principio a fin

Ejemplo: el Solicitante da clic en "Enviar a revisión".

1. El navegador manda `POST /contracts/:id/submit` al gateway, con el token de sesión en el header.
2. El gateway valida el token (`JwtAuthGuard`) y verifica que ese usuario tenga el privilegio
   `CONTRACT_SUBMIT` (`PrivilegeGuard`) — si no lo tiene, la petición nunca llega más lejos.
3. El gateway reenvía la orden a `contracts-service` por Redis, junto con el contexto del usuario
   (quién es, qué privilegios tiene).
4. `contracts-service` cambia el estado del contrato a `SUBMITTED` y responde.
5. El cambio de estado dispara un evento hacia `workflow-service`, que genera la notificación para
   el Administrador (patrón Observer — la lógica de negocio no sabe ni le importa cómo se notifica).
6. El gateway devuelve la respuesta al navegador; la UI se actualiza.

Ninguna de estas piezas necesita saber cómo están hechas las demás por dentro — solo el contrato de
datos que se pasan entre sí.

## Seguridad: un token, verificado en un solo lugar

El login lo resuelve `auth-service`, pero **el token se valida siempre en el gateway** — los
microservicios nunca reciben ni verifican credenciales directamente, confían en el contexto que el
gateway ya validó y les propaga. El token lleva los privilegios del usuario embebidos (no solo su
identidad), así que verificar un permiso no implica una consulta extra a base de datos en cada
petición — el costo es que el token es de vida corta (15 minutos) para limitar el daño si alguna
vez se filtra uno.

## Para seguir leyendo

- **Referencia técnica completa** (endpoints exactos, schemas, guards, patrones de diseño aplicados
  en cada capa): [`implementacion.md`](./implementacion.md)
- **Por qué cada decisión, con alternativas consideradas y trade-offs formales:**
  [ADRs individuales](./decisions/)
- **Cómo se traduce esta arquitectura en el ciclo de vida de un contrato:**
  [`docs/04-product/flujo-y-estados.md`](../04-product/flujo-y-estados.md)
