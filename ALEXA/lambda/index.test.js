jest.mock('./apiClient');

const apiClient = require('./apiClient');
const { handler } = require('./index');

function buildEnvelope(request) {
  return {
    version: '1.0',
    session: {
      new: true,
      sessionId: 'test-session',
      application: { applicationId: 'test-app' },
      user: { userId: 'test-user' },
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

function buildIntentRequest(intentName, slots = {}, dialogState = 'COMPLETED') {
  return {
    type: 'IntentRequest',
    requestId: 'test-request',
    timestamp: new Date().toISOString(),
    dialogState,
    intent: { name: intentName, confirmationStatus: 'NONE', slots },
  };
}

describe('ALETHEIA CLM Alexa skill handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('responds with the welcome speech on LaunchRequest', async () => {
    const event = buildEnvelope({
      type: 'LaunchRequest',
      requestId: 'test-request',
      timestamp: new Date().toISOString(),
    });

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('Bienvenido al resumen ejecutivo de ALETHEIA');
    expect(result.response.shouldEndSession).toBe(false);
  });

  it('responds with the resumen ejecutivo speech, calling apiClient.getDailySummary', async () => {
    apiClient.getDailySummary.mockResolvedValue({ pendientes: 6, firmados: 1, rechazados: 1 });
    const event = buildEnvelope(buildIntentRequest('ResumenEjecutivoIntent'));

    const result = await handler(event, {});

    expect(apiClient.getDailySummary).toHaveBeenCalledTimes(1);
    expect(result.response.outputSpeech.ssml).toContain('Hoy tienes 6 contratos por revisar');
  });

  it('delegates the dialog when ConsultarMetricasPorFechaIntent is not yet completed', async () => {
    const event = buildEnvelope(
      buildIntentRequest('ConsultarMetricasPorFechaIntent', {}, 'IN_PROGRESS'),
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
    const event = buildEnvelope(buildIntentRequest('ConsultarMetricasPorFechaIntent', slots));

    const result = await handler(event, {});

    expect(apiClient.getContractsMetrics).toHaveBeenCalledWith('REJECTED', '2026-06-01', '2026-06-30');
    expect(result.response.outputSpeech.ssml).toContain('4 contratos en estado rechazado');
  });

  it('asks the user to repeat the estado when entity resolution has no match', async () => {
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
    const event = buildEnvelope(buildIntentRequest('ConsultarMetricasPorFechaIntent', slots));

    const result = await handler(event, {});

    expect(apiClient.getContractsMetrics).not.toHaveBeenCalled();
    expect(result.response.outputSpeech.ssml).toContain('No reconocí ese estado');
  });

  it('responds with the contratos por expirar speech, calling apiClient.getExpiringContracts with the resolved range', async () => {
    apiClient.getExpiringContracts.mockResolvedValue({
      count: 1,
      contratos: [
        { id: 1, title: 'Renovación licencias', vendorName: 'Acme S.A.', status: 'SIGNED', expiresAt: '2026-07-20' },
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
    const event = buildEnvelope(buildIntentRequest('ConsultarContratosPorExpirarIntent', slots));

    const result = await handler(event, {});

    expect(apiClient.getExpiringContracts).toHaveBeenCalledWith('2026-07-01', '2026-07-31');
    expect(result.response.outputSpeech.ssml).toContain('El más urgente es con el cliente Acme S.A.');
  });

  it('responds gracefully when there are no contratos por expirar', async () => {
    apiClient.getExpiringContracts.mockResolvedValue({ count: 0, contratos: [], masUrgente: null });
    const slots = { rangoFecha: { name: 'rangoFecha', value: '2026-07' } };
    const event = buildEnvelope(buildIntentRequest('ConsultarContratosPorExpirarIntent', slots));

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('No tienes contratos que expiren en');
  });

  it('responds with the bottlenecks speech', async () => {
    apiClient.getBottlenecks.mockResolvedValue({
      etapas: [{ stageId: 2, stageName: 'Revisión Legal', cantidadVencidos: 2 }],
      peor: { stageId: 2, stageName: 'Revisión Legal', cantidadVencidos: 2 },
    });
    const event = buildEnvelope(buildIntentRequest('AlertaCuelloDeBotellaIntent'));

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('Revisión Legal concentra 2 contratos');
  });

  it('responds with the fallback speech when the backend call fails', async () => {
    apiClient.getBottlenecks.mockRejectedValue(new Error('backend down'));
    const event = buildEnvelope(buildIntentRequest('AlertaCuelloDeBotellaIntent'));

    const result = await handler(event, {});

    expect(result.response.outputSpeech.ssml).toContain('no pude consultar la información');
  });

  it('ends the session on AMAZON.StopIntent', async () => {
    const event = buildEnvelope(buildIntentRequest('AMAZON.StopIntent'));

    const result = await handler(event, {});

    expect(result.response.shouldEndSession).toBe(true);
  });
});
