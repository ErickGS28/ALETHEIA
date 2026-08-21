const Alexa = require('ask-sdk-core');
const apiClient = require('./apiClient');
const { resolveDateRange, describeAmazonDate } = require('./dateRange');
const { resolveLocale, strings, DEFAULT_LOCALE } = require('./languageStrings');
const {
  buildResumenEjecutivoSpeech,
  buildMetricasPorFechaSpeech,
  buildContratosPorExpirarSpeech,
  buildBottlenecksSpeech,
} = require('./speechBuilders');

// Si por lo que sea el interceptor de traducciones no llegó a correr (request
// malformado, error antes de la interceptor chain), el ErrorHandler necesita un
// speech de emergencia que no dependa de handlerInput.t.
const FALLBACK_ERROR_SPEECH = strings[DEFAULT_LOCALE].BACKEND_ERROR;

// A partir de este número de "no entendí" seguidos a mitad de un diálogo, se corta
// el ciclo y se regresa al menú principal en vez de seguir insistiendo con el mismo slot.
const MAX_FALLBACK_STREAK = 4;

// Reprompts escalonados (ver languageStrings.js): desde el 1er fallo dentro de un diálogo
// se le da al usuario un EJEMPLO concreto del slot que le falta (qué está diciendo mal y
// cómo decirlo bien), en vez de repetir la misma pregunta genérica. Se decide cuál según
// qué slot del intent pendiente sigue sin valor.
function exampleKeyForPendingIntent(pendingIntent) {
  const slots = pendingIntent.slots || {};
  const fechaValue = slots.rangoFecha && slots.rangoFecha.value;
  const estadoValue = slots.estadoContrato && slots.estadoContrato.value;

  if (!fechaValue) return 'DIALOG_FALLBACK_EXAMPLE_FECHA';
  if ('estadoContrato' in slots && !estadoValue) return 'DIALOG_FALLBACK_EXAMPLE_ESTADO';
  return 'DIALOG_FALLBACK';
}

// Palabra clave de sesión: exigida por el profesor como capa mínima de "seguridad" en la skill.
// No es autenticación real (cualquiera que escuche la demo la conoce) — es una validación de
// una sola palabra, una vez por sesión, antes de dar acceso a los reportes.
function isAuthenticated(handlerInput) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  return sessionAttributes.isAuthenticated === true;
}

function requireAuthResponse(handlerInput) {
  return handlerInput.responseBuilder
    .speak(handlerInput.t('AUTH_PROMPT'))
    .reprompt(handlerInput.t('AUTH_PROMPT'))
    .withShouldEndSession(false)
    .getResponse();
}

// --- Manejo de contexto conversacional -------------------------------------------
// `pendingIntent` guarda el intent completo (con sus slots y dialogState) cuando la
// skill está a mitad de pedir un slot obligatorio (estado o fecha). Así, si en ese
// momento el usuario dice algo que Alexa no reconoce, o pide ayuda, el Fallback/Help
// puede RE-DELEGAR ese mismo intent en vez de expulsar al usuario al menú principal:
// no "sale" del intent en el que estaba.
function setPendingIntent(handlerInput, intent) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.pendingIntent = intent;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

function clearConversationState(handlerInput) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  delete sessionAttributes.pendingIntent;
  sessionAttributes.fallbackStreak = 0;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

function getPendingIntent(handlerInput) {
  return handlerInput.attributesManager.getSessionAttributes().pendingIntent || null;
}

// Limpia el valor (y resolución) de un solo slot dentro de una copia del intent, para
// re-elicitarlo con addElicitSlotDirective sin arrastrar el valor inválido que dio el
// usuario. Sin spread (`...`) a propósito — no lo soporta el parser del build de Alexa-hosted.
function clearSlotValue(intent, slotName) {
  const slot = intent.slots[slotName];
  const clearedSlot = Object.assign({}, slot, {
    value: undefined,
    resolutions: undefined,
    confirmationStatus: 'NONE',
  });
  const clearedSlots = Object.assign({}, intent.slots, { [slotName]: clearedSlot });
  return Object.assign({}, intent, { slots: clearedSlots });
}

function bumpFallbackStreak(handlerInput) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.fallbackStreak = (sessionAttributes.fallbackStreak || 0) + 1;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
  return sessionAttributes.fallbackStreak;
}

// Traduce (request, intent, dialogState, auth) a una sola línea de log — así, al
// probar la skill, se puede ver en los logs exactamente qué intent llegó, si su
// diálogo ya se completó o sigue en curso, y si la sesión estaba autenticada.
const LoggingRequestInterceptor = {
  process(handlerInput) {
    const { request } = handlerInput.requestEnvelope;
    const intentName = request.type === 'IntentRequest' ? request.intent.name : null;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log(
      '[REQUEST]',
      JSON.stringify({
        type: request.type,
        intent: intentName,
        dialogState: request.dialogState || null,
        isAuthenticated: sessionAttributes.isAuthenticated === true,
        pendingIntent: sessionAttributes.pendingIntent
          ? sessionAttributes.pendingIntent.name
          : null,
        fallbackStreak: sessionAttributes.fallbackStreak || 0,
      }),
    );
  },
};

const LoggingResponseInterceptor = {
  process(handlerInput, response) {
    const hasSpeech = Boolean(response && response.outputSpeech);
    console.log(
      '[RESPONSE]',
      JSON.stringify({ hasSpeech, shouldEndSession: response ? response.shouldEndSession : null }),
    );
    if (!hasSpeech) {
      console.error(
        '[RESPONSE] Se generó una respuesta sin outputSpeech — el usuario se queda sin voz.',
      );
      return;
    }

    // Se guarda lo último que dijo Alexa para poder repetirlo. Las cifras
    // habladas se van en cuanto suenan; sin esto, "repite" no tiene de dónde.
    const ssml = response.outputSpeech.ssml;
    if (ssml) {
      const attrs = handlerInput.attributesManager.getSessionAttributes();
      attrs.lastSpeech = ssml.replace(/<\/?speak>/g, '').trim();
      handlerInput.attributesManager.setSessionAttributes(attrs);
    }
  },
};

const LocalizationInterceptor = {
  process(handlerInput) {
    const request = handlerInput.requestEnvelope && handlerInput.requestEnvelope.request;
    const locale = resolveLocale(request && request.locale);
    const localeStrings = strings[locale];
    handlerInput.t = (key) => localeStrings[key];
    // Expuesto aparte de handlerInput.t porque dateRange.js y speechBuilders.js no usan
    // el diccionario de strings — arman las frases con datos dinámicos y necesitan saber
    // en qué idioma hablar (nombres de mes, plurales, "signed" vs "firmado", etc).
    handlerInput.locale = locale;
  },
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(handlerInput.t('WELCOME'))
      .reprompt(handlerInput.t('AUTH_PROMPT'))
      .withShouldEndSession(false)
      .getResponse();
  },
};

const ValidarClaveIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ValidarClaveIntent'
    );
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.isAuthenticated = true;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    clearConversationState(handlerInput);

    return handlerInput.responseBuilder
      .speak(handlerInput.t('AUTHENTICATED_WELCOME'))
      .reprompt(handlerInput.t('VALIDAR_CLAVE_REPROMPT'))
      .withShouldEndSession(false)
      .getResponse();
  },
};

const ResumenEjecutivoIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ResumenEjecutivoIntent'
    );
  },
  async handle(handlerInput) {
    if (!isAuthenticated(handlerInput)) {
      return requireAuthResponse(handlerInput);
    }
    clearConversationState(handlerInput);

    try {
      const data = await apiClient.getDailySummary();
      const speech = buildResumenEjecutivoSpeech(data, handlerInput.locale);
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(handlerInput.t('REPROMPT_RESUMEN'))
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ResumenEjecutivoIntent error:', error);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('BACKEND_ERROR'))
        .reprompt(handlerInput.t('MENU_OPTIONS'))
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

const ConsultarMetricasPorFechaIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarMetricasPorFechaIntent'
    );
  },
  async handle(handlerInput) {
    if (!isAuthenticated(handlerInput)) {
      return requireAuthResponse(handlerInput);
    }

    const currentIntent = handlerInput.requestEnvelope.request.intent;

    if (handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED') {
      // Todavía falta un slot: se recuerda este intent como "pendiente" para que,
      // si el usuario dice algo raro en la siguiente vuelta, no se le saque de aquí.
      setPendingIntent(handlerInput, currentIntent);
      return handlerInput.responseBuilder.addDelegateDirective(currentIntent).getResponse();
    }

    clearConversationState(handlerInput);

    const estadoSlot = currentIntent.slots.estadoContrato;
    const resolutions = estadoSlot.resolutions && estadoSlot.resolutions.resolutionsPerAuthority;
    const resolvedStatus =
      resolutions && resolutions[0] && resolutions[0].status.code === 'ER_SUCCESS_MATCH'
        ? resolutions[0].values[0].value.id
        : null;

    if (!resolvedStatus) {
      // El valor que dijo no resolvió a ningún estado del catálogo (ej. dijo algo que no
      // matcheó ningún sinónimo). En vez de solo repetir la pregunta, se limpia el valor
      // malo del slot y se usa la directiva nativa de Alexa para re-elicitarlo — así el
      // diálogo queda en un estado limpio, sin arrastrar el valor inválido a la siguiente vuelta.
      const clearedIntent = clearSlotValue(currentIntent, 'estadoContrato');
      setPendingIntent(handlerInput, clearedIntent);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('NO_ESTADO_MATCH'))
        .addElicitSlotDirective('estadoContrato', clearedIntent)
        .getResponse();
    }

    const rawDate = currentIntent.slots.rangoFecha.value;
    const range = resolveDateRange(rawDate);

    if (!range) {
      // Mismo mecanismo para la fecha: AMAZON.DATE no tiene catálogo de valores que validar,
      // así que esta es la única red de seguridad si el usuario dice una fecha que no se
      // puede convertir a rango (resolveDateRange regresó null).
      const clearedIntent = clearSlotValue(currentIntent, 'rangoFecha');
      setPendingIntent(handlerInput, clearedIntent);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('NO_DATE_MATCH'))
        .addElicitSlotDirective('rangoFecha', clearedIntent)
        .getResponse();
    }

    try {
      const data = await apiClient.getContractsMetrics(
        resolvedStatus,
        range.isoStart,
        range.isoEnd,
      );
      const speech = buildMetricasPorFechaSpeech(
        data,
        describeAmazonDate(rawDate, handlerInput.locale),
        handlerInput.locale,
      );
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(handlerInput.t('REPROMPT_METRICS'))
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ConsultarMetricasPorFechaIntent error:', error);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('BACKEND_ERROR'))
        .reprompt(handlerInput.t('MENU_OPTIONS'))
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

const ConsultarContratosPorExpirarIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConsultarContratosPorExpirarIntent'
    );
  },
  async handle(handlerInput) {
    if (!isAuthenticated(handlerInput)) {
      return requireAuthResponse(handlerInput);
    }

    const currentIntent = handlerInput.requestEnvelope.request.intent;

    if (handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED') {
      setPendingIntent(handlerInput, currentIntent);
      return handlerInput.responseBuilder.addDelegateDirective(currentIntent).getResponse();
    }

    clearConversationState(handlerInput);

    const rawDate = currentIntent.slots.rangoFecha.value;
    const range = resolveDateRange(rawDate);

    if (!range) {
      const clearedIntent = clearSlotValue(currentIntent, 'rangoFecha');
      setPendingIntent(handlerInput, clearedIntent);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('NO_DATE_MATCH'))
        .addElicitSlotDirective('rangoFecha', clearedIntent)
        .getResponse();
    }

    try {
      const data = await apiClient.getExpiringContracts(range.isoStart, range.isoEnd);
      const speech = buildContratosPorExpirarSpeech(
        data,
        describeAmazonDate(rawDate, handlerInput.locale),
        handlerInput.locale,
      );
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(handlerInput.t('REPROMPT_EXPIRING'))
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ConsultarContratosPorExpirarIntent error:', error);
      const notSupported = error && String(error.message).indexOf('NOT_SUPPORTED') === 0;
      return handlerInput.responseBuilder
        .speak(handlerInput.t(notSupported ? 'FEATURE_UNAVAILABLE' : 'BACKEND_ERROR'))
        .reprompt(handlerInput.t('MENU_OPTIONS'))
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

const AlertaCuelloDeBotellaIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AlertaCuelloDeBotellaIntent'
    );
  },
  async handle(handlerInput) {
    if (!isAuthenticated(handlerInput)) {
      return requireAuthResponse(handlerInput);
    }
    clearConversationState(handlerInput);

    try {
      const data = await apiClient.getBottlenecks();
      const speech = buildBottlenecksSpeech(data, handlerInput.locale);
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(handlerInput.t('REPROMPT_BOTTLENECK'))
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('AlertaCuelloDeBotellaIntent error:', error);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('BACKEND_ERROR'))
        .reprompt(handlerInput.t('MENU_OPTIONS'))
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

// AMAZON.HelpIntent (built-in): si hay un diálogo a medias (esperando estado o fecha),
// da ayuda contextual y VUELVE A DELEGAR el mismo intent — no lo saca de ahí. Si no,
// antes de autenticarse explica la palabra clave; ya en el menú, solo recuerda las 3 opciones.
const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    if (!isAuthenticated(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(handlerInput.t('HELP_FULL'))
        .reprompt(handlerInput.t('AUTH_PROMPT'))
        .withShouldEndSession(false)
        .getResponse();
    }

    const pendingIntent = getPendingIntent(handlerInput);
    if (pendingIntent) {
      return handlerInput.responseBuilder
        .speak(handlerInput.t('HELP_IN_DIALOG'))
        .addDelegateDirective(pendingIntent)
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak(handlerInput.t('MENU_OPTIONS'))
      .reprompt(handlerInput.t('MENU_OPTIONS'))
      .withShouldEndSession(false)
      .getResponse();
  },
};

// Unhandled/Fallback dinámico — el corazón del manejo de "se trabó":
//  1. No autenticado           → pide la clave de nuevo (mensaje corto).
//  2. Diálogo a medias         → re-delega el MISMO intent (no lo saca de ahí) y,
//                                 DESDE EL PRIMER FALLO, le da el ejemplo concreto de
//                                 cómo decirlo bien (no un empujón genérico) — le dice
//                                 qué está haciendo mal y cómo arreglarlo, no solo "repite".
//  3. Muchos "no entendí" seguidos a mitad de un diálogo → corta el ciclo y
//     regresa al menú principal en vez de insistir para siempre.
//  4. En el menú, sin diálogo pendiente → recuerda las 3 opciones cortas,
//     sin repetir el tutorial completo.
const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
    );
  },
  handle(handlerInput) {
    if (!isAuthenticated(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(handlerInput.t('WRONG_KEYWORD'))
        .reprompt(handlerInput.t('AUTH_PROMPT'))
        .withShouldEndSession(false)
        .getResponse();
    }

    const pendingIntent = getPendingIntent(handlerInput);
    const streak = bumpFallbackStreak(handlerInput);

    if (pendingIntent && streak < MAX_FALLBACK_STREAK) {
      // Desde el 1er fallo se le da el EJEMPLO concreto del slot que le falta (no un
      // empujón genérico) — sin sacarlo del intent en ningún caso.
      const speechKey = exampleKeyForPendingIntent(pendingIntent);
      return handlerInput.responseBuilder
        .speak(handlerInput.t(speechKey))
        .addDelegateDirective(pendingIntent)
        .getResponse();
    }

    if (pendingIntent) {
      // Se agotaron los reintentos (incluido el ejemplo) en el mismo diálogo: se corta
      // el ciclo con un mensaje de alto nivel y se regresa al menú principal desde cero.
      clearConversationState(handlerInput);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('LOST_IN_DIALOG'))
        .reprompt(handlerInput.t('MENU_OPTIONS'))
        .withShouldEndSession(false)
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak(handlerInput.t('SHORT_FALLBACK'))
      .reprompt(handlerInput.t('MENU_OPTIONS'))
      .withShouldEndSession(false)
      .getResponse();
  },
};

// AMAZON.RepeatIntent: repite la última respuesta tal cual. Si todavía no hay
// nada que repetir (primer turno), ofrece el menú en vez de quedarse mudo.
const RepeatIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.RepeatIntent'
    );
  },
  handle(handlerInput) {
    const { lastSpeech } = handlerInput.attributesManager.getSessionAttributes();
    const speech = lastSpeech || handlerInput.t('MENU_OPTIONS');
    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt(handlerInput.t('MENU_OPTIONS'))
      .withShouldEndSession(false)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(handlerInput.t('GOODBYE'))
      .withShouldEndSession(true)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    // Diagnóstico de VUX: saber SI y POR QUÉ se cortó la sesión sin que el usuario
    // dijera "detente" (error, timeout, o el usuario simplemente colgó) ayuda a
    // detectar en qué parte del flujo se está trabando la gente.
    const request = handlerInput.requestEnvelope.request;
    console.log(
      '[SESSION_ENDED]',
      JSON.stringify({ reason: request.reason || null, error: request.error || null }),
    );
    return handlerInput.responseBuilder.getResponse();
  },
};

// Catch-all: cualquier excepción no atrapada por un handler (incluyendo errores
// que ocurran antes de que corra el LocalizationInterceptor) debe terminar aquí
// y SIEMPRE responder con voz — nunca dejar al usuario en silencio. También limpia
// el estado de diálogo pendiente: si algo truena, mejor regresar limpio al menú que
// dejar al usuario atrapado reintentando el mismo intent roto.
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const request = handlerInput.requestEnvelope && handlerInput.requestEnvelope.request;
    console.error(
      '[ERROR]',
      JSON.stringify({
        type: request && request.type,
        intent: request && request.type === 'IntentRequest' ? request.intent.name : null,
      }),
      error,
    );

    try {
      clearConversationState(handlerInput);
    } catch (cleanupError) {
      console.error('[ERROR] No se pudo limpiar el estado de sesión:', cleanupError);
    }

    const speech = (handlerInput.t && handlerInput.t('BACKEND_ERROR')) || FALLBACK_ERROR_SPEECH;
    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt(speech)
      .withShouldEndSession(false)
      .getResponse();
  },
};

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ValidarClaveIntentHandler,
    ResumenEjecutivoIntentHandler,
    ConsultarMetricasPorFechaIntentHandler,
    ConsultarContratosPorExpirarIntentHandler,
    AlertaCuelloDeBotellaIntentHandler,
    HelpIntentHandler,
    RepeatIntentHandler,
    FallbackIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
  )
  .addRequestInterceptors(LocalizationInterceptor, LoggingRequestInterceptor)
  .addResponseInterceptors(LoggingResponseInterceptor)
  .addErrorHandlers(ErrorHandler)
  .create();

exports.handler = (event, context) => skill.invoke(event, context);
exports.skillInstance = skill;
