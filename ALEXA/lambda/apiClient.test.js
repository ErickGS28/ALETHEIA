// ALEXA/lambda/apiClient.test.js
const {
  getDailySummary,
  getExpiringContracts,
  resetSessionForTests,
} = require('./apiClient');

describe('apiClient', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      CLM_API_BASE_URL: 'https://api.test',
      CLM_SYSTEM_EMAIL: 'system@test.com',
      CLM_SYSTEM_PASSWORD: 'secret',
    };
    resetSessionForTests();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetAllMocks();
  });

  it('logs in once and reuses the cached token for subsequent calls', async () => {
    global.fetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: { accessToken: 'token-1', refreshToken: 'refresh-1' } }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          data: { pendientes: 1, firmados: 0, rechazados: 0, fecha: '2026-07-14' },
        }),
      });

    const result = await getDailySummary();

    expect(result.pendientes).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][0]).toBe('https://api.test/auth/login');
    expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer token-1');
  });

  it('re-logs in when the backend responds 401 with a stale token', async () => {
    global.fetch
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: { accessToken: 'token-1', refreshToken: 'refresh-1' } }),
      })
      .mockResolvedValueOnce({ status: 401, json: async () => ({ message: 'expirado' }) })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: { accessToken: 'token-2', refreshToken: 'refresh-2' } }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: { count: 0, contratos: [], masUrgente: null } }),
      });

    const result = await getExpiringContracts('2026-07-01', '2026-07-31');

    expect(result.count).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(global.fetch.mock.calls[3][1].headers.Authorization).toBe('Bearer token-2');
  });

  it('throws a descriptive error when the backend keeps failing', async () => {
    global.fetch.mockResolvedValue({ status: 500, json: async () => ({ message: 'boom' }) });

    await expect(getDailySummary()).rejects.toThrow(/status 500/);
  });
});
