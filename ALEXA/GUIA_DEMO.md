# Guía de demo — Alexa Skill ALETHEIA CLM con datos mock

Camino feliz para tener la skill funcionando en la consola de Alexa **sin backend, sin `.env`, sin AWS**. La skill detecta que no hay `CLM_API_BASE_URL` configurada y responde con datos de demostración de `lambda/mockData.js`.

---

## 1. Requisitos

- Cuenta en [developer.amazon.com](https://developer.amazon.com) (gratis, sirve tu cuenta normal de Amazon).
- Nada más. No necesitas AWS, ni ASK CLI, ni el backend corriendo.

## 2. Crear la skill (Alexa-hosted)

1. Entra a [developer.amazon.com/alexa/console/ask](https://developer.amazon.com/alexa/console/ask) → **Create Skill**.
2. **Skill name:** `ALETHEIA CLM`.
3. **Primary locale:** `Spanish (MX)`.
4. Tipo de experiencia: **Other** → modelo: **Custom**.
5. Hosting: **Alexa-hosted (Node.js)** ← importante, así Amazon aloja el Lambda gratis.
6. Template: **Start from Scratch** → **Create Skill** y espera a que termine de provisionar.

## 3. Pegar el modelo de interacción (1 archivo JSON)

1. Pestaña **Build** → menú izquierdo **Interaction Model → JSON Editor**.
2. Borra lo que haya y pega TODO el contenido de:
   `skill-package/interactionModels/custom/es-MX.json`
3. **Save Model** → **Build Model** (tarda ~1 min). Con esto Alexa ya entiende los 6 intents y el invocation name `aletheia clm`.

## 4. Pegar el código (6 archivos)

Pestaña **Code**. Ahí ya existen `index.js`, `package.json` y `util.js` de plantilla (deja `util.js`, no estorba).

| Acción en la consola | Archivo del repo (`ALEXA/lambda/`) |
|---|---|
| Reemplazar contenido de `index.js` | `index.js` |
| Reemplazar contenido de `package.json` | `package.json` |
| **New File** → `apiClient.js` | `apiClient.js` |
| **New File** → `dateRange.js` | `dateRange.js` |
| **New File** → `speechBuilders.js` | `speechBuilders.js` |
| **New File** → `mockData.js` | `mockData.js` |

> Los archivos nuevos se crean en la misma carpeta que `index.js` (ruta `/lambda/nombre.js`).
> NO subas los `*.test.js` ni `jest.config.js` — son solo para pruebas locales.

Al terminar: botón **Deploy** (arriba a la derecha). Amazon instala `ask-sdk-core` solo, desde el `package.json`.

## 5. Probarla (camino feliz)

Pestaña **Test** → cambia el dropdown de `Off` a **Development**. Escribe (o habla) en el simulador:

| Tú dices | Alexa responde (aprox.) |
|---|---|
| `abre aletheia clm` | "Bienvenido al resumen ejecutivo de ALETHEIA. Puedo darte el reporte de contratos firmados…" |
| `dame mi resumen del día` | "Hoy tienes 12 contratos por revisar, se han firmado 3 y 1 fueron rechazados." |
| `cuántos contratos fueron rechazados el mes pasado` | "En junio de 2026, se registraron 4 contratos en estado rechazado." |
| `qué contratos vencen este mes` | "Tienes 3 contratos que expiran en julio de 2026. El más urgente es con el cliente Acme Soluciones" |
| `dónde están atorados los contratos` | "Actualmente, la etapa de Revisión Legal concentra 5 contratos que han superado su tiempo límite de revisión." |
| `ayuda` | "Puedes pedirme un resumen ejecutivo del día…" |
| `detente` | "Hasta luego." (cierra la sesión) |

**Demo de slots obligatorios (dialog delegate):** di solo `dime los contratos` sin fecha/estado dentro del intent de métricas — Alexa te pedirá el dato faltante ("¿Para qué periodo deseas consultar esta información?") antes de responder. Ejemplo: `cuántos contratos hay` → te pregunta periodo y estado.

## 6. ¿Y si algún día hay backend real?

El mock se apaga solo: en un Lambda propio (no Alexa-hosted) se configuran las variables `CLM_API_BASE_URL`, `CLM_SYSTEM_EMAIL` y `CLM_SYSTEM_PASSWORD`, y `apiClient.js` vuelve a llamar los 4 endpoints reales. También puedes forzar mock con `CLM_USE_MOCK=true` aunque exista la URL.

---

## 7. Preguntas típicas del evaluador (y sus respuestas)

### ¿Cómo es el manejo de sesión?

Hay **dos sesiones distintas**:

1. **Sesión de voz (Alexa):** `LaunchRequest` abre la sesión y la deja activa (`shouldEndSession: false`); cada respuesta incluye un *reprompt* ("¿Deseas consultar algo más?") para mantener la conversación. La sesión termina con `AMAZON.StopIntent` / `AMAZON.CancelIntent` ("Hasta luego", `shouldEndSession: true`), o por *timeout* de Alexa si el usuario no responde (llega un `SessionEndedRequest`, que también está manejado).
2. **Sesión con el backend (modo real):** la skill no usa account linking; se autentica con una **cuenta de sistema** vía `POST /auth/login`. El *access token* (vida de 15 min) se cachea **en memoria del proceso Lambda** y sobrevive entre invocaciones "warm"; antes de expirar se renueva con `POST /auth/refresh`, y si el backend regresa 401 se reintenta con un login limpio (una sola vez). En modo mock esta capa no se ejecuta.

### ¿Existe más de un rol / manejo de permisos por rol?

**En el backend sí, en la skill no.** El backend CLM maneja roles (Administrador, Abogado, Aprobador) con privilegios; los 4 endpoints que consume la skill están protegidos por `JwtAuthGuard` + `PrivilegeGuard` y exigen el privilegio `REPORTS_VIEW`, que esos 3 roles tienen asignado. La skill entra con **una sola cuenta de sistema** (rol Administrador), porque no hay account linking: cualquier persona que hable con la skill ve la misma información ejecutiva. Si se quisiera respuesta por usuario/rol, el siguiente paso sería account linking con OAuth para que cada usuario de Alexa se loguee con su propia cuenta CLM.

### ¿Qué intents por defecto (built-in) se usan?

- `AMAZON.CancelIntent` y `AMAZON.StopIntent` — cierran la sesión con despedida.
- `AMAZON.FallbackIntent` — cuando Alexa no entiende, recupera la conversación repitiendo la ayuda.
- `SessionEndedRequest` (request de sistema, no intent) — limpieza silenciosa cuando la sesión muere por timeout o error.
- **Nota:** la ayuda es un intent **custom** (`HelpIntent`), no `AMAZON.HelpIntent`, porque así lo pedía la especificación original del proyecto; el costo es menos cobertura de frases que el built-in.
- Además se usan **slots built-in**: `AMAZON.DATE` para los periodos ("este mes", "la semana pasada").

### ¿Cuál es el flujo general?

```
Usuario habla ("¿cuántos contratos fueron rechazados el mes pasado?")
   → Alexa (NLU) resuelve intent + slots (rangoFecha=2026-06, estadoContrato=REJECTED)
   → Si falta un slot obligatorio: dialog delegate → Alexa lo pregunta sola
   → Lambda (index.js): el handler del intent recibe la petición
   → dateRange.js convierte el AMAZON.DATE en rango ISO (2026-06-01 a 2026-06-30)
   → apiClient.js consigue los datos:
        · modo demo → mockData.js (sin red)
        · modo real → login con cuenta de sistema + GET al endpoint con Bearer token
   → speechBuilders.js arma la frase en español (pluralización, casos vacíos)
   → Respuesta hablada + reprompt; la sesión sigue abierta hasta Stop/Cancel/timeout
```

Si el backend falla (modo real), el handler atrapa el error y responde "Lo siento, no pude consultar la información en este momento" sin tirar la skill.
