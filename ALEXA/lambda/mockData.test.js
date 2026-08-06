// ALEXA/lambda/mockData.test.js
const mockData = require('./mockData');
const apiClient = require('./apiClient');

describe('mockData', () => {
  it('daily summary reports today with the demo numbers', () => {
    const result = mockData.getDailySummary();

    expect(result.fecha).toBe(new Date().toISOString().slice(0, 10));
    expect(result.pendientes).toBeGreaterThan(0);
    expect(result.firmados).toBeGreaterThanOrEqual(0);
    expect(result.rechazados).toBeGreaterThanOrEqual(0);
  });

  it('metrics echoes the requested status and range with a per-status count', () => {
    const result = mockData.getContractsMetrics('REJECTED', '2026-06-01', '2026-06-30');

    expect(result).toEqual({
      status: 'REJECTED',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      count: expect.any(Number),
    });
    expect(result.count).toBeGreaterThan(0);
  });

  it('metrics returns 0 for an unknown status', () => {
    expect(mockData.getContractsMetrics('NOPE', '2026-06-01', '2026-06-30').count).toBe(0);
  });

  it('expiring contracts fall inside the requested range, most urgent first', () => {
    const result = mockData.getExpiringContracts('2026-07-01', '2026-07-31');

    expect(result.count).toBe(result.contratos.length);
    for (const contrato of result.contratos) {
      expect(contrato.expiresAt >= '2026-07-01').toBe(true);
      expect(contrato.expiresAt <= '2026-07-31').toBe(true);
    }
    expect(result.masUrgente.expiresAt).toBe(result.contratos[0].expiresAt);
    expect(result.masUrgente.vendorName).toBeTruthy();
  });

  it('bottlenecks exposes peor matching the top etapa', () => {
    const result = mockData.getBottlenecks();

    expect(result.etapas.length).toBeGreaterThan(0);
    expect(result.peor.stageName).toBe(result.etapas[0].stageName);
    expect(result.peor.cantidadVencidos).toBe(result.etapas[0].cantidadVencidos);
  });
});

describe('apiClient en modo mock', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.CLM_API_BASE_URL;
    delete process.env.CLM_USE_MOCK;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetAllMocks();
  });

  it('sin CLM_API_BASE_URL responde datos mock sin tocar la red', async () => {
    const summary = await apiClient.getDailySummary();
    const metrics = await apiClient.getContractsMetrics('SIGNED', '2026-07-01', '2026-07-31');
    const expiring = await apiClient.getExpiringContracts('2026-07-01', '2026-07-31');
    const bottlenecks = await apiClient.getBottlenecks();

    expect(summary.pendientes).toBeGreaterThan(0);
    expect(metrics.status).toBe('SIGNED');
    expect(expiring.masUrgente).toBeTruthy();
    expect(bottlenecks.peor).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('con CLM_USE_MOCK=true responde mock aunque exista CLM_API_BASE_URL', async () => {
    process.env.CLM_API_BASE_URL = 'https://api.test';
    process.env.CLM_USE_MOCK = 'true';

    const summary = await apiClient.getDailySummary();

    expect(summary.pendientes).toBeGreaterThan(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
