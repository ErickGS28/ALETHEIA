# ALETHEIA CLM — Alexa Skill

Ver `ANALISIS_INTENTS.md` para el detalle de intents, slots y contratos de datos con el backend.

## Estructura

- `skill-package/skill.json` — manifest de la skill (es-MX).
- `skill-package/interactionModels/custom/es-MX.json` — modelo de interacción (intents, slots, dialog).
- `lambda/` — código del Lambda de la skill (Node.js 18+, `ask-sdk-core`).

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

## Despliegue con ASK CLI

```bash
cd ALEXA
ask deploy
```

Crea la skill en la consola de desarrollador de Alexa y despliega el Lambda usando `lambda` como `sourceDir` (requiere `ask configure` ya configurado con credenciales de AWS/Amazon).

## Notas de diseño

- **Invocation name:** `"aletheia clm"` en vez de `"CLM"` — Alexa exige nombres de invocación con más sustancia que un acrónimo de 3 letras; la certificación real rechazaría `"clm"` solo.
- **`HelpIntent` es un intent custom**, no `AMAZON.HelpIntent` — así lo pide la especificación original (`ANALISIS_INTENTS.md`), a costa de cobertura de NLU más limitada que el intent nativo de ayuda.
- **Autenticación:** cuenta de sistema (ver `ANALISIS_INTENTS.md` sección 6), sin account linking. El token se cachea en memoria del proceso Lambda entre invocaciones "warm" y se renueva automáticamente.
