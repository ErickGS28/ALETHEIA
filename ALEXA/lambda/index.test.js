jest.mock('./apiClient');

const apiClient = require('./apiClient');
const { handler } = require('./index');

function buildEnvelope(request, sessionAttributes = {}) {
  return {
    version: '1.0',
    session: {
      new: true,
      sessionId: 'test-session',
      application: { applicationId: 'test-app' },
      user: { userId: 'test-user' },
      attributes: sessionAttributes,
    },
    context: {
      System: {
        application: { applicationId: 'test-app' },
        user: { userId: 'test-user' },
      },
    },
    request,
  };
}

function buildIntentRequest(intentName, slots = {}, dialogState = 'COMPLETED', locale = 'es-MX') {
  return {
    type: 'IntentRequest',
    requestId: 'test-request',
    timestamp: new Date().toISOString(),
    locale,
    dialogState,
    intent: { name: intentName, confirmationStatus: 'NONE', slots },
  };
}

const AUTHENTICATED = { authenticated: true };

describe('ALETHEIA CLM Alexa skill handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks for the keyword on LaunchRequest', async () => {
    const event = buildEnvelope({
      type: 'LaunchRequest',
      requestId: 'test-request',
      timestamp: new Date().toISOString(),
    });

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('Bienvenido a ALETHEIA CLM');
    expect(result.response.outputSpeech.ssml).toContain('dime la palabra clave');
    expect(result.response.shouldEndSession).toBe(false);
  });

  it('authenticates the session on ValidarClaveIntent and welcomes the user', async () => {
    const event = buildEnvelope(buildIntentRequest('ValidarClaveIntent'));

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('Clave correcta');
    expect(result.sessionAttributes).toEqual({ authenticated: true });
  });

  it('blocks report intents until the session is authenticated', async () => {
    const event = buildEnvelope(buildIntentRequest('ResumenEjecutivoIntent'));

    const result = await handler(event, {});

    expect(apiClient.getDailySummary).not.toHaveBeenCalled();
    expect(result.response.outputSpeech.ssml).toContain('dime la palabra clave');
  });

  it('treats an unrecognized utterance before auth as a wrong keyword attempt', async () => {
    const event = buildEnvelope(buildIntentRequest('AMAZON.FallbackIntent'));

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('no es la palabra clave correcta');
  });

  it('falls back to the help speech on AMAZON.FallbackIntent once authenticated', async () => {
    const event = buildEnvelope(buildIntentRequest('AMAZON.FallbackIntent'), AUTHENTICATED);

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('No entendí eso');
  });

  it('responds with the resumen ejecutivo speech, calling apiClient.getDailySummary', async () => {
    apiClient.getDailySummary.mockResolvedValue({ pendientes: 6, firmados: 1, rechazados: 1 });
    const event = buildEnvelope(buildIntentRequest('ResumenEjecutivoIntent'), AUTHENTICATED);

    const result = await handler(event, {});

    expect(apiClient.getDailySummary).toHaveBeenCalledTimes(1);
    expect(result.response.outputSpeech.ssml).toContain('Hoy tienes 6 contratos por revisar');
  });

  it('delegates the dialog when ConsultarMetricasPorFechaIntent is not yet completed', async () => {
    const event = buildEnvelope(
      buildIntentRequest('ConsultarMetricasPorFechaIntent', {}, 'IN_PROGRESS'),
      AUTHENTICATED,
    );

    const result = await handler(event, {});

    expect(result.response.directives[0].type).toBe('Dialog.Delegate');
    expect(apiClient.getContractsMetrics).not.toHaveBeenCalled();
  });

  it('calls apiClient.getContractsMetrics with the resolved status id and date range once completed', async () => {
    apiClient.getContractsMetrics.mockResolvedValue({ status: 'REJECTED', count: 4 });
    const slots = {
      estadoContrato: {
        name: 'estadoContrato',
        value: 'rechazados',
        resolutions: {
          resolutionsPerAuthority: [
            {
              status: { code: 'ER_SUCCESS_MATCH' },
              values: [{ value: { id: 'REJECTED', name: 'rechazado' } }],
            },
          ],
        },
      },
      rangoFecha: { name: 'rangoFecha', value: '2026-06' },
    };
    const event = buildEnvelope(
      buildIntentRequest('ConsultarMetricasPorFechaIntent', slots),
      AUTHENTICATED,
    );

    const result = await handler(event, {});

    expect(apiClient.getContractsMetrics).toHaveBeenCalledWith(
      'REJECTED',
      '2026-06-01',
      '2026-06-30',
    );
    expect(result.response.outputSpeech.ssml).toContain('4 contratos en estado rechazado');
  });

  it('loops back into slot elicitation when estado entity resolution has no match', async () => {
    const slots = {
      estadoContrato: {
        name: 'estadoContrato',
        value: 'algo raro',
        resolutions: {
          resolutionsPerAuthority: [{ status: { code: 'ER_SUCCESS_NO_MATCH' } }],
        },
      },
      rangoFecha: { name: 'rangoFecha', value: '2026-06' },
    };
    const event = buildEnvelope(
      buildIntentRequest('ConsultarMetricasPorFechaIntent', slots),
      AUTHENTICATED,
    );

    const result = await handler(event, {});

    expect(apiClient.getContractsMetrics).not.toHaveBeenCalled();
    expect(result.response.outputSpeech.ssml).toContain('No reconocí ese estado');
    expect(result.response.outputSpeech.ssml).toContain('en revisión legal');
    expect(result.response.directives[0].type).toBe('Dialog.ElicitSlot');
    expect(result.response.directives[0].slotToElicit).toBe('estadoContrato');
    expect(result.response.directives[0].updatedIntent.slots.estadoContrato.value).toBeUndefined();
  });

  it('loops back into slot elicitation when rangoFecha does not resolve to a supported range', async () => {
    const slots = {
      estadoContrato: {
        name: 'estadoContrato',
        value: 'rechazados',
        resolutions: {
          resolutionsPerAuthority: [
            {
              status: { code: 'ER_SUCCESS_MATCH' },
              values: [{ value: { id: 'REJECTED', name: 'rechazado' } }],
            },
          ],
        },
      },
      rangoFecha: { name: 'rangoFecha', value: 'PRESENT_REF' },
    };
    const event = buildEnvelope(
      buildIntentRequest('ConsultarMetricasPorFechaIntent', slots),
      AUTHENTICATED,
    );

    const result = await handler(event, {});

    expect(apiClient.getContractsMetrics).not.toHaveBeenCalled();
    expect(result.response.outputSpeech.ssml).toContain('No entendí ese periodo');
    expect(result.response.outputSpeech.ssml).toContain('la semana pasada');
    expect(result.response.directives[0].type).toBe('Dialog.ElicitSlot');
    expect(result.response.directives[0].slotToElicit).toBe('rangoFecha');
    expect(result.response.directives[0].updatedIntent.slots.rangoFecha.value).toBeUndefined();
  });

  it('loops back into slot elicitation when rangoFecha does not resolve for ConsultarContratosPorExpirarIntent', async () => {
    const slots = { rangoFecha: { name: 'rangoFecha', value: 'PRESENT_REF' } };
    const event = buildEnvelope(
      buildIntentRequest('ConsultarContratosPorExpirarIntent', slots),
      AUTHENTICATED,
    );

    const result = await handler(event, {});

    expect(apiClient.getExpiringContracts).not.toHaveBeenCalled();
    expect(result.response.outputSpeech.ssml).toContain('No entendí ese periodo');
    expect(result.response.directives[0].type).toBe('Dialog.ElicitSlot');
    expect(result.response.directives[0].slotToElicit).toBe('rangoFecha');
  });

  it('responds with the contratos por expirar speech, calling apiClient.getExpiringContracts with the resolved range', async () => {
    apiClient.getExpiringContracts.mockResolvedValue({
      count: 1,
      contratos: [
        {
          id: 1,
          title: 'Renovación licencias',
          vendorName: 'Acme S.A.',
          status: 'SIGNED',
          expiresAt: '2026-07-20',
        },
      ],
      masUrgente: {
        id: 1,
        title: 'Renovación licencias',
        vendorName: 'Acme S.A.',
        status: 'SIGNED',
        expiresAt: '2026-07-20',
      },
    });
    const slots = { rangoFecha: { name: 'rangoFecha', value: '2026-07' } };
    const event = buildEnvelope(
      buildIntentRequest('ConsultarContratosPorExpirarIntent', slots),
      AUTHENTICATED,
    );

    const result = await handler(event, {});

    expect(apiClient.getExpiringContracts).toHaveBeenCalledWith('2026-07-01', '2026-07-31');
    expect(result.response.outputSpeech.ssml).toContain(
      'El más urgente es con el cliente Acme S.A.',
    );
  });

  it('responds gracefully when there are no contratos por expirar', async () => {
    apiClient.getExpiringContracts.mockResolvedValue({ count: 0, contratos: [], masUrgente: null });
    const slots = { rangoFecha: { name: 'rangoFecha', value: '2026-07' } };
    const event = buildEnvelope(
      buildIntentRequest('ConsultarContratosPorExpirarIntent', slots),
      AUTHENTICATED,
    );

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('No tienes contratos que expiren en');
  });

  it('responds with the bottlenecks speech', async () => {
    apiClient.getBottlenecks.mockResolvedValue({
      etapas: [{ stageId: 2, stageName: 'Revisión Legal', cantidadVencidos: 2 }],
      peor: { stageId: 2, stageName: 'Revisión Legal', cantidadVencidos: 2 },
    });
    const event = buildEnvelope(buildIntentRequest('AlertaCuelloDeBotellaIntent'), AUTHENTICATED);

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('Revisión Legal concentra 2 contratos');
  });

  it('responds with the fallback speech when the backend call fails', async () => {
    apiClient.getBottlenecks.mockRejectedValue(new Error('backend down'));
    const event = buildEnvelope(buildIntentRequest('AlertaCuelloDeBotellaIntent'), AUTHENTICATED);

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('no pude consultar la información');
  });

  it('ends the session on AMAZON.StopIntent', async () => {
    const event = buildEnvelope(buildIntentRequest('AMAZON.StopIntent'));

    const result = await handler(event, {});

    expect(result.response.shouldEndSession).toBe(true);
  });

  it('routes to the global ErrorHandler and still speaks when no handler matches the request', async () => {
    const event = buildEnvelope(buildIntentRequest('SomeCompletelyUnknownIntent'), AUTHENTICATED);

    const result = await handler(event, {});

    expect(result.response.outputSpeech).toBeDefined();
    expect(result.response.outputSpeech.ssml).toContain('no pude consultar la información');
    expect(result.response.shouldEndSession).toBe(false);
  });

  it('falls back to the default locale (es-MX) for an unsupported locale', async () => {
    const request = buildIntentRequest('ValidarClaveIntent', {}, 'COMPLETED', 'fr-FR');
    const event = buildEnvelope(request);

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('Clave correcta');
  });

  it('logs the request status (type, intent, dialogState, auth) and the response outcome', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const event = buildEnvelope(buildIntentRequest('ValidarClaveIntent'));

    await handler(event, {});

    const requestLog = logSpy.mock.calls.find((call) => call[0] === '[REQUEST]');
    const responseLog = logSpy.mock.calls.find((call) => call[0] === '[RESPONSE]');
    expect(requestLog).toBeDefined();
    expect(requestLog[1]).toContain('"intent":"ValidarClaveIntent"');
    expect(responseLog).toBeDefined();
    expect(responseLog[1]).toContain('"hasSpeech":true');

    logSpy.mockRestore();
  });
});
