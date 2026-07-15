'use strict';

const ESTADO_HABLADO = {
  DRAFT: 'borrador',
  SUBMITTED: 'enviado',
  ADMIN_REVIEW: 'revisión del administrador',
  LAWYER_REVIEW: 'revisión del abogado',
  APPROVAL_PENDING: 'pendiente de aprobación',
  SIGNING: 'firma',
  SIGNED: 'firmado',
  REJECTED: 'rechazado',
  CANCELLED: 'cancelado',
};

function pluralizeContrato(cantidad) {
  return cantidad === 1 ? 'contrato' : 'contratos';
}

function conjugateRegistrar(cantidad) {
  return cantidad === 1 ? 'se registró' : 'se registraron';
}

function buildResumenEjecutivoSpeech({ pendientes, firmados, rechazados }) {
  return `Hoy tienes ${pendientes} ${pluralizeContrato(pendientes)} por revisar, se han firmado ${firmados} y ${rechazados} fueron rechazados.`;
}

function buildMetricasPorFechaSpeech({ status, count }, rangoFechaHablado) {
  const estadoHablado = ESTADO_HABLADO[status] || status;
  return `En ${rangoFechaHablado}, ${conjugateRegistrar(count)} ${count} ${pluralizeContrato(
    count,
  )} en estado ${estadoHablado}.`;
}

function buildContratosPorExpirarSpeech({ count, masUrgente }, rangoFechaHablado) {
  if (count === 0) {
    return `No tienes contratos que expiren en ${rangoFechaHablado}.`;
  }
  return `Tienes ${count} ${pluralizeContrato(
    count,
  )} que expiran en ${rangoFechaHablado}. El más urgente es con el cliente ${masUrgente.vendorName}.`;
}

function buildBottlenecksSpeech({ peor }) {
  if (!peor) {
    return 'No hay cuellos de botella en este momento; todos los contratos están dentro de su tiempo límite de revisión.';
  }
  const verbo = peor.cantidadVencidos === 1 ? 'ha' : 'han';
  return `Actualmente, la etapa de ${peor.stageName} concentra ${peor.cantidadVencidos} ${pluralizeContrato(
    peor.cantidadVencidos,
  )} que ${verbo} superado su tiempo límite de revisión.`;
}

module.exports = {
  buildResumenEjecutivoSpeech,
  buildMetricasPorFechaSpeech,
  buildContratosPorExpirarSpeech,
  buildBottlenecksSpeech,
};
