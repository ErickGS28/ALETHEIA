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

// Palabra clave de sesión: exigida por el profesor como capa mínima de "seguridad" en la skill.
// No es autenticación real (cualquiera que escuche la demo la conoce) — es una validación de
// una sola palabra, una vez por sesión, antes de dar acceso a los reportes.
function isAuthenticated(handlerInput) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  return sessionAttributes.authenticated === true;
}

function requireAuthResponse(handlerInput) {
  return handlerInput.responseBuilder
    .speak(handlerInput.t('AUTH_PROMPT'))
    .reprompt(handlerInput.t('AUTH_PROMPT'))
    .withShouldEndSession(false)
    .getResponse();
}

// Traduce (request, intent, dialogState, auth) a una sola línea de log — así, al
// probar la skill, se puede ver en los logs exactamente qué intent llegó, si su
// diálogo ya se completó o sigue en curso, y si la sesión estaba autenticada.
// Responde a lo pedido por el equipo: "status del intent para que no se confundan".
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
        authenticated: sessionAttributes.authenticated === true,
      }),
    );
  },
};

const LoggingResponseInterceptor = {
  process(handlerInput, response) {
    const hasSpeech = Boolean(response?.outputSpeech);
    console.log(
      '[RESPONSE]',
      JSON.stringify({ hasSpeech, shouldEndSession: response ? response.shouldEndSession : null }),
    );
    if (!hasSpeech) {
      console.error(
        '[RESPONSE] Se generó una respuesta sin outputSpeech — el usuario se queda sin voz.',
      );
    }
  },
};

const LocalizationInterceptor = {
  process(handlerInput) {
    const request = handlerInput.requestEnvelope?.request;
    const locale = resolveLocale(request?.locale);
    const localeStrings = strings[locale];
    handlerInput.t = (key) => localeStrings[key];
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
    sessionAttributes.authenticated = true;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

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

    try {
      const data = await apiClient.getDailySummary();
      const speech = buildResumenEjecutivoSpeech(data);
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(handlerInput.t('ASK_MORE'))
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ResumenEjecutivoIntent error:', error);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('BACKEND_ERROR'))
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
      return handlerInput.responseBuilder.addDelegateDirective(currentIntent).getResponse();
    }

    const estadoSlot = currentIntent.slots.estadoContrato;
    const resolutions = estadoSlot.resolutions?.resolutionsPerAuthority;
    const resolvedStatus =
      resolutions?.[0] && resolutions[0].status.code === 'ER_SUCCESS_MATCH'
        ? resolutions[0].values[0].value.id
        : null;

    if (!resolvedStatus) {
      return handlerInput.responseBuilder
        .speak(handlerInput.t('NO_ESTADO_MATCH'))
        .reprompt(handlerInput.t('ELICIT_ESTADO'))
        .withShouldEndSession(false)
        .getResponse();
    }

    const rawDate = currentIntent.slots.rangoFecha.value;
    const range = resolveDateRange(rawDate);

    if (!range) {
      return handlerInput.responseBuilder
        .speak(handlerInput.t('NO_DATE_MATCH'))
        .reprompt(handlerInput.t('ELICIT_DATE'))
        .withShouldEndSession(false)
        .getResponse();
    }

    try {
      const data = await apiClient.getContractsMetrics(
        resolvedStatus,
        range.isoStart,
        range.isoEnd,
      );
      const speech = buildMetricasPorFechaSpeech(data, describeAmazonDate(rawDate));
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(handlerInput.t('ASK_MORE'))
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ConsultarMetricasPorFechaIntent error:', error);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('BACKEND_ERROR'))
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
      return handlerInput.responseBuilder.addDelegateDirective(currentIntent).getResponse();
    }

    const rawDate = currentIntent.slots.rangoFecha.value;
    const range = resolveDateRange(rawDate);

    if (!range) {
      return handlerInput.responseBuilder
        .speak(handlerInput.t('NO_DATE_MATCH'))
        .reprompt(handlerInput.t('ELICIT_DATE'))
        .withShouldEndSession(false)
        .getResponse();
    }

    try {
      const data = await apiClient.getExpiringContracts(range.isoStart, range.isoEnd);
      const speech = buildContratosPorExpirarSpeech(data, describeAmazonDate(rawDate));
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(handlerInput.t('ASK_MORE'))
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ConsultarContratosPorExpirarIntent error:', error);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('BACKEND_ERROR'))
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

    try {
      const data = await apiClient.getBottlenecks();
      const speech = buildBottlenecksSpeech(data);
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(handlerInput.t('ASK_MORE'))
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('AlertaCuelloDeBotellaIntent error:', error);
      return handlerInput.responseBuilder
        .speak(handlerInput.t('BACKEND_ERROR'))
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelpIntent'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(handlerInput.t('HELP'))
      .reprompt(handlerInput.t('HELP'))
      .withShouldEndSession(false)
      .getResponse();
  },
};

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

    return handlerInput.responseBuilder
      .speak(`${handlerInput.t('NOT_UNDERSTOOD_PREFIX')}${handlerInput.t('HELP')}`)
      .reprompt(handlerInput.t('HELP'))
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
    return handlerInput.responseBuilder.getResponse();
  },
};

// Catch-all: cualquier excepción no atrapada por un handler (incluyendo errores
// que ocurran antes de que corra el LocalizationInterceptor) debe terminar aquí
// y SIEMPRE responder con voz — nunca dejar al usuario en silencio.
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    const request = handlerInput.requestEnvelope?.request;
    console.error(
      '[ERROR]',
      JSON.stringify({
        type: request?.type,
        intent: request && request.type === 'IntentRequest' ? request.intent.name : null,
      }),
      error,
    );

    const speech = handlerInput.t?.('BACKEND_ERROR') || FALLBACK_ERROR_SPEECH;
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
