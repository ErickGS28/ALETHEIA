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

const STATUS_SPOKEN_EN = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  ADMIN_REVIEW: 'admin review',
  LAWYER_REVIEW: 'lawyer review',
  APPROVAL_PENDING: 'pending approval',
  SIGNING: 'signing',
  SIGNED: 'signed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

function isEnglish(locale) {
  return typeof locale === 'string' && locale.indexOf('en') === 0;
}

function pluralizeContrato(cantidad) {
  return cantidad === 1 ? 'contrato' : 'contratos';
}

function conjugateRegistrar(cantidad) {
  return cantidad === 1 ? 'se registró' : 'se registraron';
}

function buildResumenEjecutivoSpeech({ pendientes, firmados, rechazados }, locale) {
  if (isEnglish(locale)) {
    return (
      `Today you have ${pendientes} contract${pendientes === 1 ? '' : 's'} pending review, ` +
      `${firmados} ${firmados === 1 ? 'has' : 'have'} been signed, and ${rechazados} ` +
      `${rechazados === 1 ? 'was' : 'were'} rejected.`
    );
  }
  return `Hoy tienes ${pendientes} ${pluralizeContrato(pendientes)} por revisar, se han firmado ${firmados} y ${rechazados} fueron rechazados.`;
}

function buildMetricasPorFechaSpeech({ status, count }, rangoFechaHablado, locale) {
  if (isEnglish(locale)) {
    const statusSpoken = STATUS_SPOKEN_EN[status] || status;
    return (
      `In ${rangoFechaHablado}, ${count} contract${count === 1 ? ' was' : 's were'} recorded in ` +
      `${statusSpoken} status.`
    );
  }
  const estadoHablado = ESTADO_HABLADO[status] || status;
  return `En ${rangoFechaHablado}, ${conjugateRegistrar(count)} ${count} ${pluralizeContrato(
    count,
  )} en estado ${estadoHablado}.`;
}

function buildContratosPorExpirarSpeech({ count, masUrgente }, rangoFechaHablado, locale) {
  if (isEnglish(locale)) {
    if (count === 0) {
      return `You have no contracts expiring in ${rangoFechaHablado}.`;
    }
    return (
      `You have ${count} contract${count === 1 ? '' : 's'} expiring in ${rangoFechaHablado}. ` +
      `The most urgent one is with ${masUrgente.vendorName}.`
    );
  }
  if (count === 0) {
    return `No tienes contratos que expiren en ${rangoFechaHablado}.`;
  }
  return `Tienes ${count} ${pluralizeContrato(
    count,
  )} que expiran en ${rangoFechaHablado}. El más urgente es con el cliente ${masUrgente.vendorName}.`;
}

function buildBottlenecksSpeech({ peor }, locale) {
  if (isEnglish(locale)) {
    if (!peor) {
      return 'There are no bottlenecks right now; all contracts are within their review time limit.';
    }
    return `Right now, the ${peor.stageName} stage has ${peor.cantidadVencidos} contract${
      peor.cantidadVencidos === 1 ? '' : 's'
    } that ${peor.cantidadVencidos === 1 ? 'has' : 'have'} exceeded its review time limit.`;
  }
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
