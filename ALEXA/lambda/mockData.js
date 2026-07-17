'use strict';

// Datos de demostración para correr la skill SIN backend real.
// Se activan cuando el Lambda no tiene configurada CLM_API_BASE_URL (ver apiClient.js),
// que es el caso de una skill Alexa-hosted recién creada.
// Las fechas se calculan relativas a hoy y al rango consultado, para que cualquier
// periodo ("hoy", "este mes", "la semana pasada") regrese resultados creíbles.

function pad(n) {
  return String(n).padStart(2, '0');
}

function toISODateOnly(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function getDailySummary() {
  return {
    pendientes: 12,
    firmados: 3,
    rechazados: 1,
    fecha: toISODateOnly(new Date()),
  };
}

const COUNT_BY_STATUS = {
  DRAFT: 5,
  SUBMITTED: 7,
  ADMIN_REVIEW: 4,
  LAWYER_REVIEW: 6,
  APPROVAL_PENDING: 3,
  SIGNING: 8,
  SIGNED: 15,
  REJECTED: 4,
  CANCELLED: 2,
};

function getContractsMetrics(status, isoStart, isoEnd) {
  return {
    status,
    startDate: isoStart,
    endDate: isoEnd,
    count: COUNT_BY_STATUS[status] || 0,
  };
}

const DEMO_CONTRACTS = [
  { id: 101, title: 'Renovación de licencias de software', vendorName: 'Acme Soluciones', status: 'SIGNED' },
  { id: 102, title: 'Mantenimiento de servidores', vendorName: 'TecnoRed del Bajío', status: 'SIGNED' },
  { id: 103, title: 'Arrendamiento de oficinas', vendorName: 'Inmobiliaria Cumbres', status: 'SIGNING' },
];

// Reparte los contratos de demo dentro del rango pedido, ordenados del más urgente al menos.
function getExpiringContracts(isoStart, isoEnd) {
  const start = Date.parse(`${isoStart}T00:00:00Z`);
  const end = Date.parse(`${isoEnd}T00:00:00Z`);
  const span = Math.max(end - start, 0);

  const contratos = DEMO_CONTRACTS.map((contract, index) => ({
    ...contract,
    expiresAt: toISODateOnly(
      new Date(start + Math.round((span * (index + 1)) / (DEMO_CONTRACTS.length + 1))),
    ),
  }));

  const { id, title, vendorName, expiresAt } = contratos[0];

  return {
    count: contratos.length,
    contratos,
    masUrgente: { id, title, vendorName, expiresAt },
  };
}

function getBottlenecks() {
  return {
    etapas: [
      { stageId: 2, stageName: 'Revisión Legal', cantidadVencidos: 5 },
      { stageId: 1, stageName: 'Revisión Administrativa', cantidadVencidos: 2 },
    ],
    peor: { stageName: 'Revisión Legal', cantidadVencidos: 5 },
  };
}

module.exports = {
  getDailySummary,
  getContractsMetrics,
  getExpiringContracts,
  getBottlenecks,
};
