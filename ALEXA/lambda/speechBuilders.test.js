// ALEXA/lambda/speechBuilders.test.js
const {
  buildResumenEjecutivoSpeech,
  buildMetricasPorFechaSpeech,
  buildContratosPorExpirarSpeech,
  buildBottlenecksSpeech,
} = require('./speechBuilders');

describe('speechBuilders', () => {
  it('builds the resumen ejecutivo speech with plural contratos', () => {
    const speech = buildResumenEjecutivoSpeech({ pendientes: 6, firmados: 1, rechazados: 1 });
    expect(speech).toBe('Hoy tienes 6 contratos por revisar, se han firmado 1 y 1 fueron rechazados.');
  });

  it('uses singular contrato when pendientes es 1', () => {
    const speech = buildResumenEjecutivoSpeech({ pendientes: 1, firmados: 0, rechazados: 0 });
    expect(speech).toContain('1 contrato por revisar');
  });

  it('builds the metricas por fecha speech with the spoken estado', () => {
    const speech = buildMetricasPorFechaSpeech({ status: 'REJECTED', count: 4 }, 'junio de 2026');
    expect(speech).toBe('En junio de 2026, se registraron 4 contratos en estado rechazado.');
  });

  it('handles zero results gracefully in metricas por fecha', () => {
    const speech = buildMetricasPorFechaSpeech({ status: 'SIGNED', count: 0 }, 'esta semana');
    expect(speech).toBe('En esta semana, se registraron 0 contratos en estado firmado.');
  });

  it('builds the contratos por expirar speech when there are results', () => {
    const speech = buildContratosPorExpirarSpeech(
      { count: 2, masUrgente: { vendorName: 'Acme S.A' } },
      'los próximos 30 días',
    );
    expect(speech).toBe(
      'Tienes 2 contratos que expiran en los próximos 30 días. El más urgente es con el cliente Acme S.A.',
    );
  });

  it('handles zero results gracefully in contratos por expirar', () => {
    const speech = buildContratosPorExpirarSpeech({ count: 0, masUrgente: null }, 'este mes');
    expect(speech).toBe('No tienes contratos que expiren en este mes.');
  });

  it('builds the bottlenecks speech with the worst stage', () => {
    const speech = buildBottlenecksSpeech({ peor: { stageName: 'Revisión Legal', cantidadVencidos: 2 } });
    expect(speech).toBe(
      'Actualmente, la etapa de Revisión Legal concentra 2 contratos que han superado su tiempo límite de revisión.',
    );
  });

  it('handles the no-bottlenecks case', () => {
    const speech = buildBottlenecksSpeech({ peor: null });
    expect(speech).toBe(
      'No hay cuellos de botella en este momento; todos los contratos están dentro de su tiempo límite de revisión.',
    );
  });
});
