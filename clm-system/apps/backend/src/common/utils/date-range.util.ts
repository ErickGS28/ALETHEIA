export function startOfDayUTC(isoDate: string): Date {
  const date = new Date(isoDate);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function endOfDayUTC(isoDate: string): Date {
  const date = new Date(isoDate);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}
