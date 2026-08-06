'use strict';

const Alexa = require('ask-sdk-core');
const apiClient = require('./apiClient');
const { resolveDateRange, describeAmazonDate } = require('./dateRange');
const {
  buildResumenEjecutivoSpeech,
  buildMetricasPorFechaSpeech,
  buildContratosPorExpirarSpeech,
  buildBottlenecksSpeech,
} = require('./speechBuilders');

const AUTH_PROMPT_SPEECH = 'Antes de continuar, dime la palabra clave.';

const WELCOME_SPEECH = `Bienvenido a ALETHEIA CLM. ${AUTH_PROMPT_SPEECH}`;

const AUTHENTICATED_WELCOME_SPEECH =
  'Clave correcta. Puedo darte el reporte de contratos firmados, alertarte sobre cuellos de botella ' +
  'o listar contratos por expirar. ¿Qué métrica deseas consultar hoy?';

const WRONG_KEYWORD_SPEECH = 'Esa no es la palabra clave correcta. Intenta de nuevo.';

const HELP_SPEECH =
  'Así funciona ALETHEIA CLM: primero debes decir la palabra clave para autenticarte. ' +
  'Una vez validada, puedes preguntarme, por ejemplo: mi resumen del día, para saber cuántos ' +
  'contratos están pendientes, firmados o rechazados hoy. También puedes decir: qué contratos ' +
  'vencen este mes, para saber cuáles están por expirar, o pedirme: alertas de cuellos de botella, ' +
  'para saber en qué etapa se están atorando los contratos. ¿Qué te gustaría consultar?';

const BACKEND_ERROR_SPEECH =
  'Lo siento, no pude consultar la información en este momento. Intenta de nuevo en unos minutos.';

// Palabra clave de sesión: exigida por el profesor como capa mínima de "seguridad" en la skill.
// No es autenticación real (cualquiera que escuche la demo la conoce) — es una validación de
// una sola palabra, una vez por sesión, antes de dar acceso a los reportes.
function isAuthenticated(handlerInput) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  return sessionAttributes.authenticated === true;
}

function requireAuthResponse(handlerInput) {
  return handlerInput.responseBuilder
    .speak(AUTH_PROMPT_SPEECH)
    .reprompt(AUTH_PROMPT_SPEECH)
    .withShouldEndSession(false)
    .getResponse();
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(WELCOME_SPEECH)
      .reprompt(AUTH_PROMPT_SPEECH)
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
      .speak(AUTHENTICATED_WELCOME_SPEECH)
      .reprompt('¿Qué métrica deseas consultar?')
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
        .reprompt('¿Deseas consultar algo más?')
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ResumenEjecutivoIntent error:', error);
      return handlerInput.responseBuilder
        .speak(BACKEND_ERROR_SPEECH)
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
    const resolutions = estadoSlot.resolutions && estadoSlot.resolutions.resolutionsPerAuthority;
    const resolvedStatus =
      resolutions && resolutions[0] && resolutions[0].status.code === 'ER_SUCCESS_MATCH'
        ? resolutions[0].values[0].value.id
        : null;

    if (!resolvedStatus) {
      return handlerInput.responseBuilder
        .speak('No reconocí ese estado. Intenta con firmado, rechazado, o en revisión.')
        .reprompt('¿Qué estado deseas consultar? Por ejemplo: firmados, rechazados o en revisión.')
        .withShouldEndSession(false)
        .getResponse();
    }

    const rawDate = currentIntent.slots.rangoFecha.value;
    const range = resolveDateRange(rawDate);

    if (!range) {
      return handlerInput.responseBuilder
        .speak('No entendí ese periodo. ¿Para qué fecha o rango deseas consultar esta información?')
        .reprompt('¿Para qué periodo deseas consultar esta información?')
        .withShouldEndSession(false)
        .getResponse();
    }

    try {
      const data = await apiClient.getContractsMetrics(resolvedStatus, range.isoStart, range.isoEnd);
      const speech = buildMetricasPorFechaSpeech(data, describeAmazonDate(rawDate));
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt('¿Deseas consultar algo más?')
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ConsultarMetricasPorFechaIntent error:', error);
      return handlerInput.responseBuilder
        .speak(BACKEND_ERROR_SPEECH)
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
        .speak('No entendí ese periodo. ¿Para qué fecha o rango deseas consultar esta información?')
        .reprompt('¿Para qué periodo deseas consultar esta información?')
        .withShouldEndSession(false)
        .getResponse();
    }

    try {
      const data = await apiClient.getExpiringContracts(range.isoStart, range.isoEnd);
      const speech = buildContratosPorExpirarSpeech(data, describeAmazonDate(rawDate));
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt('¿Deseas consultar algo más?')
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('ConsultarContratosPorExpirarIntent error:', error);
      return handlerInput.responseBuilder
        .speak(BACKEND_ERROR_SPEECH)
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
        .reprompt('¿Deseas consultar algo más?')
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      console.error('AlertaCuelloDeBotellaIntent error:', error);
      return handlerInput.responseBuilder
        .speak(BACKEND_ERROR_SPEECH)
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
      .speak(HELP_SPEECH)
      .reprompt(HELP_SPEECH)
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
        .speak(WRONG_KEYWORD_SPEECH)
        .reprompt(AUTH_PROMPT_SPEECH)
        .withShouldEndSession(false)
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak(`No entendí eso. ${HELP_SPEECH}`)
      .reprompt(HELP_SPEECH)
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
    return handlerInput.responseBuilder.speak('Hasta luego.').withShouldEndSession(true).getResponse();
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

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Error no manejado:', error);
    return handlerInput.responseBuilder
      .speak(BACKEND_ERROR_SPEECH)
      .reprompt(BACKEND_ERROR_SPEECH)
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
  .addErrorHandlers(ErrorHandler)
  .create();

exports.handler = (event, context) => skill.invoke(event, context);
exports.skillInstance = skill;
