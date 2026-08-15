// ALEXA/lambda/dateRange.test.js
const { resolveDateRange, describeAmazonDate, normalizeAmbiguousYear } = require('./dateRange');

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

describe('normalizeAmbiguousYear', () => {
  it('keeps the resolved year when it is not in the future', () => {
    const now = new Date('2026-08-06T12:00:00.000Z');
    expect(normalizeAmbiguousYear(2026, 7, now)).toBe(2026); // agosto
    expect(normalizeAmbiguousYear(2025, 7, now)).toBe(2025);
  });

  it('rolls back to the current year when that month has not finished yet (the reported bug)', () => {
    const now = new Date('2026-08-06T12:00:00.000Z');
    expect(normalizeAmbiguousYear(2027, 7, now)).toBe(2026); // "agosto" -> agosto 2026, no 2027
  });

  it('keeps the future year when the current year occurrence already passed', () => {
    const now = new Date('2026-08-06T12:00:00.000Z');
    expect(normalizeAmbiguousYear(2027, 0, now)).toBe(2027); // enero de este año ya pasó
  });
});

describe('resolveDateRange — mes ambiguo sin año (bug reportado)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-06T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resuelve "agosto" (sin año) al agosto de este año, no al siguiente', () => {
    expect(resolveDateRange('2027-08')).toEqual({ isoStart: '2026-08-01', isoEnd: '2026-08-31' });
  });

  it('describe "agosto" (sin año) con el año correcto', () => {
    expect(describeAmazonDate('2027-08')).toBe('agosto de 2026');
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
