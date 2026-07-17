'use strict';

// Cache en memoria del proceso Lambda — sobrevive entre invocaciones "warm".
let session = { accessToken: null, refreshToken: null, expiresAt: 0 };

async function requestJson(path, options = {}) {
  const baseUrl = process.env.CLM_API_BASE_URL;
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

async function login() {
  const systemEmail = process.env.CLM_SYSTEM_EMAIL;
  const systemPassword = process.env.CLM_SYSTEM_PASSWORD;
  const { status, body } = await requestJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: systemEmail, password: systemPassword }),
  });

  if (status !== 200) {
    throw new Error(`No se pudo autenticar la cuenta de sistema (status ${status})`);
  }

  session = {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    // Margen de seguridad: el access token dura 15 min, lo damos por vencido a los 14.
    expiresAt: Date.now() + 14 * 60 * 1000,
  };
}

async function refresh() {
  const { status, body } = await requestJson('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  if (status !== 200) {
    throw new Error(`refresh falló (status ${status})`);
  }

  session = {
    ...session,
    accessToken: body.data.accessToken,
    expiresAt: Date.now() + 14 * 60 * 1000,
  };
}

async function ensureSession() {
  if (session.accessToken && Date.now() < session.expiresAt) return;

  if (session.refreshToken) {
    try {
      await refresh();
      return;
    } catch {
      // el refresh token también pudo expirar (7 días) — se cae a login limpio.
    }
  }

  await login();
}

async function getWithAuth(path) {
  await ensureSession();

  let { status, body } = await requestJson(path, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (status === 401) {
    // El access token cacheado podría haber sido invalidado del lado del servidor; reintenta una vez.
    await login();
    ({ status, body } = await requestJson(path, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }));
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Error del backend (status ${status}): ${JSON.stringify(body)}`);
  }

  return body.data;
}

function getDailySummary() {
  return getWithAuth('/reports/daily-summary');
}

function getBottlenecks() {
  return getWithAuth('/reports/bottlenecks');
}

function getExpiringContracts(isoStart, isoEnd) {
  return getWithAuth(`/contracts/expiring?startDate=${isoStart}&endDate=${isoEnd}`);
}

function getContractsMetrics(status, isoStart, isoEnd) {
  return getWithAuth(`/contracts/metrics?status=${status}&startDate=${isoStart}&endDate=${isoEnd}`);
}

function resetSessionForTests() {
  session = { accessToken: null, refreshToken: null, expiresAt: 0 };
}

module.exports = {
  getDailySummary,
  getBottlenecks,
  getExpiringContracts,
  getContractsMetrics,
  resetSessionForTests,
};
