// Recurso de traducciones de la skill. Hoy solo existe es-MX, pero centralizar los
// strings aquí (en vez de tenerlos como constantes sueltas en index.js) deja lista
// la arquitectura para agregar más locales sin tocar la lógica de los handlers.
const DEFAULT_LOCALE = 'es-MX';

const strings = {
  'es-MX': {
    AUTH_PROMPT: 'Antes de continuar, dime la palabra clave.',
    WELCOME: 'Bienvenido a ALETHEIA CLM. Antes de continuar, dime la palabra clave.',
    AUTHENTICATED_WELCOME:
      'Clave correcta. Puedo darte el reporte de contratos firmados, alertarte sobre cuellos de botella ' +
      'o listar contratos por expirar. ¿Qué métrica deseas consultar hoy?',
    WRONG_KEYWORD: 'Esa no es la palabra clave correcta. Intenta de nuevo.',
    HELP:
      'Así funciona ALETHEIA CLM: primero debes decir la palabra clave para autenticarte. ' +
      'Una vez validada, puedes preguntarme, por ejemplo: mi resumen del día, para saber cuántos ' +
      'contratos están pendientes, firmados o rechazados hoy. También puedes decir: qué contratos ' +
      'vencen este mes, para saber cuáles están por expirar, o pedirme: alertas de cuellos de botella, ' +
      'para saber en qué etapa se están atorando los contratos. ¿Qué te gustaría consultar?',
    BACKEND_ERROR:
      'Lo siento, no pude consultar la información en este momento. Intenta de nuevo en unos minutos.',
    GOODBYE: 'Hasta luego.',
    ASK_MORE: '¿Deseas consultar algo más?',
    NOT_UNDERSTOOD_PREFIX: 'No entendí eso. ',
    NO_ESTADO_MATCH: 'No reconocí ese estado. Intenta con firmado, rechazado, o en revisión.',
    ELICIT_ESTADO: '¿Qué estado deseas consultar? Por ejemplo: firmados, rechazados o en revisión.',
    NO_DATE_MATCH:
      'No entendí ese periodo. ¿Para qué fecha o rango deseas consultar esta información?',
    ELICIT_DATE: '¿Para qué periodo deseas consultar esta información?',
    VALIDAR_CLAVE_REPROMPT: '¿Qué métrica deseas consultar?',
  },
};

function resolveLocale(locale) {
  return strings[locale] ? locale : DEFAULT_LOCALE;
}

module.exports = { strings, DEFAULT_LOCALE, resolveLocale };
