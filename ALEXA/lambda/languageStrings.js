// Recurso de traducciones de la skill. Hoy solo existe es-MX, pero centralizar los
// strings aquí (en vez de tenerlos como constantes sueltas en index.js) deja lista
// la arquitectura para agregar más locales sin tocar la lógica de los handlers.
const DEFAULT_LOCALE = 'es-MX';

const strings = {
  'es-MX': {
    AUTH_PROMPT: 'Antes de continuar, dime la palabra clave.',
    WELCOME: 'Bienvenido a ALETHEIA CLM. Antes de continuar, dime la palabra clave.',
    AUTHENTICATED_WELCOME:
      'Clave correcta. Puedo darte tu resumen del día, alertas de cuellos de botella, o consultarte contratos ' +
      'por estado y fecha. ¿Cuál quieres?',
    WRONG_KEYWORD: 'Esa no es la palabra clave correcta. Intenta de nuevo.',
    // Ayuda completa: solo se usa antes de autenticarse (todavía no conoce el menú).
    HELP_FULL:
      'Así funciona ALETHEIA CLM: primero debes decir la palabra clave para autenticarte. ' +
      'Una vez validada, puedes preguntarme, por ejemplo: mi resumen del día, para saber cuántos ' +
      'contratos están pendientes, firmados o rechazados hoy. También puedes pedirme: alertas de cuellos ' +
      'de botella, para saber en qué etapa se están atorando los contratos, o preguntarme cuántos ' +
      'contratos fueron rechazados el mes pasado, por ejemplo. ¿Qué te gustaría consultar?',
    // Ayuda corta: ya autenticado, solo recuerda las 3 opciones — sin repetir el tutorial completo.
    MENU_OPTIONS:
      'Puedo darte tu resumen del día, alertas de cuellos de botella, o contratos por estado y fecha. ' +
      '¿Cuál quieres?',
    SHORT_FALLBACK:
      'No entendí eso. Puedo darte tu resumen del día, alertas de cuellos de botella, o contratos por ' +
      'estado y fecha. ¿Cuál quieres?',
    // Ayuda contextual cuando el usuario está a mitad de un diálogo (dando estado o fecha) y dice
    // "ayuda" — no lo saca del intent, solo le recuerda qué se le está pidiendo y sigue ahí mismo.
    HELP_IN_DIALOG:
      'Puedo ayudarte con eso. Dime el estado que buscas, por ejemplo firmado, rechazado o en revisión, ' +
      'y para qué fecha o periodo.',
    // Igual que arriba pero cuando no se entendió lo que dijo (fallback) estando a mitad del diálogo.
    // Es el reprompt "rápido": solo se usa en el 1er "no entendí" del diálogo.
    DIALOG_FALLBACK:
      'No te entendí bien. Sigamos con tu consulta: dime el estado o la fecha que te falta dar.',
    // Reprompts escalonados: si el 1er "no entendí" no bastó, en el 2do y 3ro se sube el nivel
    // de detalle dando un EJEMPLO concreto de cómo usar el slot que falta, en vez de repetir
    // la misma pregunta genérica — así el usuario aprende la forma correcta en el momento.
    DIALOG_FALLBACK_EXAMPLE_ESTADO:
      'No te entendí. Para el estado, puedes decir por ejemplo: firmados, rechazados, o en revisión.',
    DIALOG_FALLBACK_EXAMPLE_FECHA:
      'No te entendí. Para la fecha, puedes decir por ejemplo: este mes, la semana pasada, o julio de dos mil ' +
      'veintiséis.',
    // Último recurso: tras varios "no entendí" seguidos incluso con ejemplo, corta el ciclo y
    // regresa al menú principal en vez de seguir insistiendo con el mismo diálogo para siempre.
    LOST_IN_DIALOG:
      'Parece que no nos estamos entendiendo bien. Vamos a empezar de nuevo: puedo darte tu resumen ' +
      'del día, alertas de cuellos de botella, o contratos por estado y fecha. ¿Cuál quieres?',
    BACKEND_ERROR:
      'Lo siento, no pude consultar la información en este momento. Intenta de nuevo en unos minutos.',
    FEATURE_UNAVAILABLE:
      'Por ahora no tengo esa información: el sistema todavía no registra fecha de vencimiento por contrato. ' +
      'Puedo darte tu resumen del día o alertas de cuellos de botella.',
    GOODBYE: 'Hasta luego.',
    NO_ESTADO_MATCH: 'No reconocí ese estado. Intenta con firmado, rechazado, o en revisión.',
    ELICIT_ESTADO: '¿Qué estado deseas consultar? Por ejemplo: firmados, rechazados o en revisión.',
    NO_DATE_MATCH:
      'No entendí ese periodo. ¿Para qué fecha o rango deseas consultar esta información?',
    ELICIT_DATE: '¿Para qué periodo deseas consultar esta información?',
    VALIDAR_CLAVE_REPROMPT: '¿Qué métrica deseas consultar?',
    // Reprompts contextuales: cada intent sugiere las OTRAS dos opciones del menú,
    // en vez del genérico "¿deseas consultar algo más?".
    REPROMPT_RESUMEN: '¿Quieres alertas de cuellos de botella, o contratos por estado y fecha?',
    REPROMPT_BOTTLENECK: '¿Quieres tu resumen del día, o contratos por estado y fecha?',
    REPROMPT_EXPIRING: '¿Quieres tu resumen del día, o alertas de cuellos de botella?',
    REPROMPT_METRICS: 'Puedo darte tu resumen del día, o alertas de cuellos de botella. ¿Algo más?',
  },
  'en-US': {
    AUTH_PROMPT: 'Before we continue, tell me the passphrase.',
    WELCOME: 'Welcome to ALETHEIA CLM. Before we continue, tell me the passphrase.',
    AUTHENTICATED_WELCOME:
      'Correct. I can give you your daily summary, bottleneck alerts, or contracts by status and date. ' +
      'Which one would you like?',
    WRONG_KEYWORD: "That's not the right passphrase. Try again.",
    HELP_FULL:
      "Here's how ALETHEIA CLM works: first you need to say the passphrase to authenticate. " +
      'Once validated, you can ask me things like: my daily summary, to know how many contracts are ' +
      'pending, signed, or rejected today. You can also ask for bottleneck alerts, to know which stage ' +
      'contracts are getting stuck in, or ask me how many contracts were rejected last month, for ' +
      'example. What would you like to check?',
    MENU_OPTIONS:
      'I can give you your daily summary, bottleneck alerts, or contracts by status and date. Which one ' +
      'would you like?',
    SHORT_FALLBACK:
      "I didn't understand that. I can give you your daily summary, bottleneck alerts, or contracts by " +
      'status and date. Which one would you like?',
    HELP_IN_DIALOG:
      'I can help with that. Tell me the status you want, for example signed, rejected, or in review, and ' +
      'for what date or period.',
    DIALOG_FALLBACK:
      "I didn't quite get that. Let's continue: tell me the status or date that's still missing.",
    DIALOG_FALLBACK_EXAMPLE_ESTADO:
      "I didn't get that. For the status, you can say for example: signed, rejected, or in review.",
    DIALOG_FALLBACK_EXAMPLE_FECHA:
      "I didn't get that. For the date, you can say for example: this month, last week, or July 2026.",
    LOST_IN_DIALOG:
      "It seems we're not understanding each other. Let's start over: I can give you your daily summary, " +
      'bottleneck alerts, or contracts by status and date. Which one would you like?',
    BACKEND_ERROR:
      "Sorry, I couldn't fetch that information right now. Please try again in a few minutes.",
    FEATURE_UNAVAILABLE:
      "I don't have that information yet: the system doesn't track a due date per contract yet. " +
      'I can give you your daily summary or bottleneck alerts instead.',
    GOODBYE: 'Goodbye.',
    NO_ESTADO_MATCH: "I didn't recognize that status. Try signed, rejected, or in review.",
    ELICIT_ESTADO:
      'What status would you like to check? For example: signed, rejected, or in review.',
    NO_DATE_MATCH: "I didn't understand that period. What date or range would you like to check?",
    ELICIT_DATE: 'What time period would you like to check?',
    VALIDAR_CLAVE_REPROMPT: 'What metric would you like to check?',
    REPROMPT_RESUMEN: 'Would you like bottleneck alerts, or contracts by status and date?',
    REPROMPT_BOTTLENECK: 'Would you like your daily summary, or contracts by status and date?',
    REPROMPT_EXPIRING: 'Would you like your daily summary, or bottleneck alerts?',
    REPROMPT_METRICS: 'I can give you your daily summary, or bottleneck alerts. Anything else?',
  },
};

function resolveLocale(locale) {
  return strings[locale] ? locale : DEFAULT_LOCALE;
}

module.exports = { strings, DEFAULT_LOCALE, resolveLocale };
