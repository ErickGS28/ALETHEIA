// ALEXA/lambda/dateRange.test.js
const { resolveDateRange, describeAmazonDate } = require('./dateRange');

describe('resolveDateRange', () => {
  it('returns the same day for a plain date', () => {
    expect(resolveDateRange('2026-07-14')).toEqual({ isoStart: '2026-07-14', isoEnd: '2026-07-14' });
  });

  it('returns the full month range for a YYYY-MM value', () => {
    expect(resolveDateRange('2026-06')).toEqual({ isoStart: '2026-06-01', isoEnd: '2026-06-30' });
  });

  it('handles a leap-affected month correctly (February 2028)', () => {
    expect(resolveDateRange('2028-02')).toEqual({ isoStart: '2028-02-01', isoEnd: '2028-02-29' });
  });

  it('returns the full year range for a YYYY value', () => {
    expect(resolveDateRange('2026')).toEqual({ isoStart: '2026-01-01', isoEnd: '2026-12-31' });
  });

  it('returns Monday-Sunday for an ISO week value', () => {
    // La semana ISO 28 de 2026 empieza el lunes 6 de julio de 2026.
    expect(resolveDateRange('2026-W28')).toEqual({ isoStart: '2026-07-06', isoEnd: '2026-07-12' });
  });

  it('returns null for an unrecognized format', () => {
    expect(resolveDateRange('2026-SU')).toBeNull();
  });

  it('returns null when the value is missing', () => {
    expect(resolveDateRange(undefined)).toBeNull();
  });
});

describe('describeAmazonDate', () => {
  it('describes a month value in spoken Spanish', () => {
    expect(describeAmazonDate('2026-06')).toBe('junio de 2026');
  });

  it('describes a day value in spoken Spanish', () => {
    expect(describeAmazonDate('2026-07-14')).toBe('el 14 de julio de 2026');
  });

  it('describes a week value in spoken Spanish', () => {
    expect(describeAmazonDate('2026-W28')).toBe('la semana 28 de 2026');
  });

  it('falls back to the raw value for unrecognized formats', () => {
    expect(describeAmazonDate('2026-SU')).toBe('2026-SU');
  });
});
