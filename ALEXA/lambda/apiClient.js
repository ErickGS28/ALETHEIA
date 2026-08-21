const http = require('http');
const https = require('https');
const { URL } = require('url');
const mockData = require('./mockData');

// Modo demo: sin CLM_API_BASE_URL configurada (o con CLM_USE_MOCK=true) se responden
// datos de mockData.js en lugar de llamar al backend. Es el modo por defecto en una
// skill Alexa-hosted, donde no hay variables de entorno.
function isMockMode() {
  return process.env.CLM_USE_MOCK === 'true' || !process.env.CLM_API_BASE_URL;
}

// Cache en memoria del proceso Lambda — sobrevive entre invocaciones "warm".
let session = { accessToken: null, refreshToken: null, expiresAt: 0 };

// Si el backend no contesta en este tiempo, se corta la espera y se responde con el
// mensaje de error amigable — sin esto, un backend caído o lento deja a la skill
// "colgada" hasta que Alexa la corta sola con un error genérico feo.
const REQUEST_TIMEOUT_MS = 5000;

// Node de la skill Alexa-hosted no trae `fetch` global (llega en Node 18+), así que
// se usa el módulo nativo http/https, disponible en cualquier versión.
function requestJson(path, options = {}) {
  return new Promise((resolve, reject) => {
    const baseUrl = process.env.CLM_API_BASE_URL;
    const url = new URL(`${baseUrl}${path}`);
    const client = url.protocol === 'http:' ? http : https;

    const req = client.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (response) => {
        let raw = '';
        response.on('data', (chunk) => {
          raw += chunk;
        });
        response.on('end', () => {
          let body = null;
          try {
            body = raw ? JSON.parse(raw) : null;
          } catch (err) {
            body = null;
          }
          resolve({ status: response.statusCode, body });
        });
      },
    );

    req.on('error', reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(
        new Error(`Tiempo de espera agotado consultando ${path} (${REQUEST_TIMEOUT_MS}ms)`),
      );
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
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
  if (!body || !body.data || !body.data.accessToken || !body.data.refreshToken) {
    throw new Error(
      'Login: el backend respondió 200 pero sin accessToken/refreshToken (¿cambió el contrato?)',
    );
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
  if (!body || !body.data || !body.data.accessToken) {
    throw new Error(
      'Refresh: el backend respondió 200 pero sin accessToken (¿cambió el contrato?)',
    );
  }

  session = Object.assign({}, session, {
    accessToken: body.data.accessToken,
    expiresAt: Date.now() + 14 * 60 * 1000,
  });
}

async function ensureSession() {
  if (session.accessToken && Date.now() < session.expiresAt) return;

  if (session.refreshToken) {
    try {
      await refresh();
      return;
    } catch (err) {
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
  if (!body || body.data === undefined) {
    throw new Error(`Respuesta sin "data" en ${path} (¿cambió el contrato del backend?)`);
  }

  return body.data;
}

// Valida que /reports/contracts haya regresado lo que se espera (un arreglo) antes de
// que el resto del código lo recorra — si el backend cambia la forma de la respuesta,
// mejor un error claro en el log que un TypeError críptico a medio cálculo.
function assertContractsArray(contracts, from) {
  if (!Array.isArray(contracts)) {
    throw new Error(`${from}: se esperaba un arreglo de contratos y llegó ${typeof contracts}`);
  }
  return contracts;
}

// Estados que cuentan como "en revisión" para el resumen y para cuellos de botella.
// DRAFT no entra: todavía no se ha sometido a revisión.
const ACTIVE_REVIEW_STATUSES = [
  'SUBMITTED',
  'ADMIN_REVIEW',
  'LAWYER_REVIEW',
  'APPROVAL_PENDING',
  'SIGNING',
];

// El gateway nuevo (microservicios) ya no tiene /reports/daily-summary ni /reports/bottlenecks;
// solo expone /reports/contracts (lista completa) y /workflow/:contractId (etapa + SLA de uno).
// Estas 3 funciones reconstruyen esos reportes del lado de la skill a partir de esos dos endpoints.

async function getDailySummary() {
  if (isMockMode()) return mockData.getDailySummary();

  const contracts = assertContractsArray(
    await getWithAuth('/reports/contracts'),
    'getDailySummary',
  );
  let pendientes = 0;
  let firmados = 0;
  let rechazados = 0;
  contracts.forEach((c) => {
    if (ACTIVE_REVIEW_STATUSES.indexOf(c.status) !== -1) pendientes += 1;
    else if (c.status === 'SIGNED') firmados += 1;
    else if (c.status === 'REJECTED') rechazados += 1;
  });

  return { pendientes, firmados, rechazados, fecha: new Date().toISOString().slice(0, 10) };
}

async function getBottlenecks() {
  if (isMockMode()) return mockData.getBottlenecks();

  const contracts = assertContractsArray(await getWithAuth('/reports/contracts'), 'getBottlenecks');
  const enRevision = contracts.filter((c) => ACTIVE_REVIEW_STATUSES.indexOf(c.status) !== -1);

  // No hay endpoint que agregue esto de un jaleo — se pide el workflow (etapa + color SLA)
  // de cada contrato en revisión y se cuenta cuántos están en rojo (SLA vencido) por etapa.
  const workflows = await Promise.all(
    enRevision.map((c) => getWithAuth(`/workflow/${c.id}`).catch(() => null)),
  );

  const overdueByStage = {};
  workflows.forEach((wf) => {
    if (wf && wf.sla && wf.sla.color === 'RED' && wf.stage) {
      overdueByStage[wf.stage.name] = (overdueByStage[wf.stage.name] || 0) + 1;
    }
  });

  const etapas = Object.keys(overdueByStage)
    .map((stageName) => ({ stageName, cantidadVencidos: overdueByStage[stageName] }))
    .sort((a, b) => b.cantidadVencidos - a.cantidadVencidos);

  return { etapas, peor: etapas[0] || null };
}

async function getExpiringContracts(isoStart, isoEnd) {
  if (isMockMode()) return mockData.getExpiringContracts(isoStart, isoEnd);

  // Contract.expiresAt es opcional: un contrato sin vigencia registrada
  // simplemente no vence, y se queda fuera del reporte.
  const contratos = assertContractsArray(
    await getWithAuth('/reports/contracts'),
    'getExpiringContracts',
  );

  const start = Date.parse(`${isoStart}T00:00:00Z`);
  const end = Date.parse(`${isoEnd}T23:59:59Z`);

  const enRango = contratos
    .filter((c) => {
      if (!c.expiresAt) return false;
      const vence = Date.parse(c.expiresAt);
      return Number.isFinite(vence) && vence >= start && vence <= end;
    })
    // El más próximo primero: es el que se anuncia como "el más urgente".
    .sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt));

  const primero = enRango[0];

  return {
    count: enRango.length,
    contratos: enRango,
    masUrgente: primero
      ? {
          id: primero.id,
          title: primero.title,
          vendorName: primero.vendorName,
          expiresAt: primero.expiresAt,
        }
      : null,
  };
}

async function getContractsMetrics(status, isoStart, isoEnd) {
  if (isMockMode()) return mockData.getContractsMetrics(status, isoStart, isoEnd);

  // /reports/contracts sí filtra por status en el servidor; el rango de fechas se aplica
  // aquí sobre createdAt (aproximación: es la fecha de creación, no la de entrada al estado).
  const contracts = assertContractsArray(
    await getWithAuth(`/reports/contracts?status=${status}`),
    'getContractsMetrics',
  );
  const start = Date.parse(`${isoStart}T00:00:00Z`);
  const end = Date.parse(`${isoEnd}T23:59:59Z`);
  const count = contracts.filter((c) => {
    const createdAt = Date.parse(c.createdAt);
    return createdAt >= start && createdAt <= end;
  }).length;

  return { status, startDate: isoStart, endDate: isoEnd, count };
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
