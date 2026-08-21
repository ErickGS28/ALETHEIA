# ALETHEIA CLM — Alexa Skill

Ver [`DEFINICION_SKILL.md`](./DEFINICION_SKILL.md) para la definición original de la skill
(entrega académica) y [`ANALISIS_INTENTS.md`](./ANALISIS_INTENTS.md) para el detalle técnico
vigente de intents, slots y contratos de datos con el backend real.

> **Modo demo (sin backend):** si el Lambda no tiene `CLM_API_BASE_URL` configurada (o tiene `CLM_USE_MOCK=true`), la skill responde datos de demostración desde `lambda/mockData.js` — no necesita backend ni variables de entorno. Ver `GUIA_DEMO.md` para el paso a paso de probarla en la consola de Alexa como skill Alexa-hosted.

## Estructura

- `skill-package/skill.json` — manifest de la skill (es-MX).
- `skill-package/interactionModels/custom/es-MX.json` — modelo de interacción (intents, slots, dialog).
- `lambda/` — código del Lambda de la skill (Node.js 18+, `ask-sdk-core`):
  - `index.js` — handlers de los 6 intents (Launch, ResumenEjecutivo, ConsultarMetricasPorFecha, ConsultarContratosPorExpirar, AlertaCuelloDeBotella, Help) + Cancel/Stop/Fallback.
  - `apiClient.js` — cliente HTTP hacia el backend (login de sistema, cache de token, reintento en 401).
  - `dateRange.js` — resuelve el valor de `AMAZON.DATE` a un rango de fechas y a texto hablado.
  - `speechBuilders.js` — arma las respuestas en español a partir de los datos del backend.

## Endpoints consumidos y su código en el backend

Todos viven en `clm-system/apps/backend/src/`, protegidos por `JwtAuthGuard` + `PrivilegeGuard` + `REPORTS_VIEW`:

| Endpoint | Llamado desde (Lambda) | Implementado en (backend) |
|---|---|---|
| `GET /reports/daily-summary` | `apiClient.getDailySummary()` | `reports/reports.controller.ts` → `reports.service.ts` → `reports.repository.ts` |
| `GET /reports/bottlenecks` | `apiClient.getBottlenecks()` | `reports/reports.controller.ts` → `reports.service.ts` → `reports.repository.ts` |
| `GET /contracts/expiring` | `apiClient.getExpiringContracts()` | `contracts/contracts.controller.ts` → `contracts.service.ts` → `contracts.repository.ts` |
| `GET /contracts/metrics` | `apiClient.getContractsMetrics()` | `contracts/contracts.controller.ts` → `contracts.service.ts` → `contracts.repository.ts` |

Ver `ANALISIS_INTENTS.md` para el detalle de forma de datos (request/response) de cada uno.

## Variables de entorno del Lambda

| Variable | Descripción |
|---|---|
| `CLM_API_BASE_URL` | URL base del backend CLM, ej. `https://api.aletheia-clm.com` |
| `CLM_SYSTEM_EMAIL` | Correo del usuario de sistema sembrado en `prisma/seed.ts` (`alexa-system@aletheia-clm.com`) |
| `CLM_SYSTEM_PASSWORD` | Contraseña del usuario de sistema (`AlexaSystem#2026` en el seed de demo — cambiar en un entorno real) |

No commitear estos valores reales a git; configurarlos directamente en la consola de Lambda o vía `ask-cli`.

## Pruebas locales

```bash
cd lambda
npm install
npm test
```

## Despliegue

```bash
./deploy-skill.sh
```

Sube `skill-package/interactionModels/custom/{es-MX,en-US}.json` a la skill y espera
a que compilen los modelos.

**No uses `ask deploy` desde un clon limpio.** El ASK CLI guarda el id de la skill en
`.ask/ask-states.json`, que está en `.gitignore`; sin ese archivo `ask deploy` no sabe a
qué skill apuntar y **crea una nueva** en vez de actualizar la de siempre. `deploy-skill.sh`
lleva el id fijo, así que funciona desde cualquier clon.

El id vive en el script (`SKILL_ID`) y se puede sobreescribir por entorno:

```bash
SKILL_ID=amzn1.ask.skill.otra STAGE=live ./deploy-skill.sh
```

### El modelo de interacción es la fuente de verdad

Los archivos de `skill-package/` son lo que se despliega. Si editas el modelo desde la
consola de Alexa, ese cambio **no** está en el repo y el siguiente despliegue lo revierte:
descarga primero con `ask smapi get-interaction-model` y guárdalo aquí.

> Los `id` de `EstadoContratoType` (`DRAFT`, `REJECTED`, `LAWYER_REVIEW`…) no son
> etiquetas: la skill los manda tal cual al backend como `?status=`. Si se pierden al
> editar, Alexa autogenera un hash y el gateway responde `400`.

## Notas de diseño

- **Invocation name:** `"aletheia clm"` en vez de `"CLM"` — Alexa exige nombres de invocación con más sustancia que un acrónimo de 3 letras; la certificación real rechazaría `"clm"` solo.
- **`HelpIntent` es un intent custom**, no `AMAZON.HelpIntent` — así lo pide la especificación original (`ANALISIS_INTENTS.md`), a costa de cobertura de NLU más limitada que el intent nativo de ayuda.
- **Autenticación:** cuenta de sistema (ver `ANALISIS_INTENTS.md` sección 6), sin account linking. El token se cachea en memoria del proceso Lambda entre invocaciones "warm" y se renueva automáticamente.
