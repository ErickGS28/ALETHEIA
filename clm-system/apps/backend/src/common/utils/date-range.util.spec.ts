import { endOfDayUTC, startOfDayUTC, todayISODate } from './date-range.util';

describe('date-range.util', () => {
  describe('startOfDayUTC', () => {
    it('returns midnight UTC for a plain date string', () => {
      const result = startOfDayUTC('2026-06-15');
      expect(result.toISOString()).toBe('2026-06-15T00:00:00.000Z');
    });
  });

  describe('endOfDayUTC', () => {
    it('returns the last millisecond of the day in UTC', () => {
      const result = endOfDayUTC('2026-06-15');
      expect(result.toISOString()).toBe('2026-06-15T23:59:59.999Z');
    });
  });

  describe('todayISODate', () => {
    it('returns a string matching YYYY-MM-DD', () => {
      expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
