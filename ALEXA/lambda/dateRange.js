'use strict';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function toISODateOnly(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function isoWeekToRange(year, week) {
  // ISO 8601: la semana 1 es la que contiene el primer jueves del año.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // lunes=1 ... domingo=7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return { start, end };
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// El slot AMAZON.DATE a veces resuelve un mes dicho sin año ("agosto") al año
// SIGUIENTE aunque el mes de este año todavía no haya terminado (ej. hoy es
// 6 de agosto de 2026 y "agosto" resuelve a 2027-08). Si el mes de este año
// sigue vigente o no ha llegado, se prefiere sobre el futuro que resolvió Alexa.
function normalizeAmbiguousYear(year, monthIndex, now = new Date()) {
  const currentYear = now.getUTCFullYear();
  if (year <= currentYear) return year;

  const currentYearMonthEnd = new Date(Date.UTC(currentYear, monthIndex + 1, 0, 23, 59, 59, 999));
  return now <= currentYearMonthEnd ? currentYear : year;
}

/**
 * Convierte el valor resuelto de un slot AMAZON.DATE a un rango { isoStart, isoEnd }.
 * Soporta: día (YYYY-MM-DD), semana ISO (YYYY-Wnn), mes (YYYY-MM) y año (YYYY).
 */
function resolveDateRange(amazonDateValue) {
  if (!amazonDateValue) return null;

  const weekMatch = /^(\d{4})-W(\d{2})$/.exec(amazonDateValue);
  if (weekMatch) {
    const year = Number(weekMatch[1]);
    const week = Number(weekMatch[2]);
    const { start, end } = isoWeekToRange(year, week);
    return { isoStart: toISODateOnly(start), isoEnd: toISODateOnly(end) };
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(amazonDateValue);
  if (monthMatch) {
    const monthIndex = Number(monthMatch[2]) - 1;
    const year = normalizeAmbiguousYear(Number(monthMatch[1]), monthIndex);
    const lastDay = lastDayOfMonth(year, monthIndex);
    return {
      isoStart: `${year}-${pad(monthIndex + 1)}-01`,
      isoEnd: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
    };
  }

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(amazonDateValue);
  if (dayMatch) {
    return { isoStart: amazonDateValue, isoEnd: amazonDateValue };
  }

  const yearMatch = /^(\d{4})$/.exec(amazonDateValue);
  if (yearMatch) {
    return { isoStart: `${amazonDateValue}-01-01`, isoEnd: `${amazonDateValue}-12-31` };
  }

  return null;
}

function describeAmazonDate(amazonDateValue) {
  const weekMatch = /^(\d{4})-W(\d{2})$/.exec(amazonDateValue);
  if (weekMatch) return `la semana ${weekMatch[2]} de ${weekMatch[1]}`;

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(amazonDateValue);
  if (monthMatch) {
    const monthIndex = Number(monthMatch[2]) - 1;
    const year = normalizeAmbiguousYear(Number(monthMatch[1]), monthIndex);
    return `${MESES[monthIndex]} de ${year}`;
  }

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(amazonDateValue);
  if (dayMatch) return `el ${dayMatch[3]} de ${MESES[Number(dayMatch[2]) - 1]} de ${dayMatch[1]}`;

  const yearMatch = /^(\d{4})$/.exec(amazonDateValue);
  if (yearMatch) return `el año ${amazonDateValue}`;

  return amazonDateValue;
}

module.exports = { resolveDateRange, describeAmazonDate, normalizeAmbiguousYear };
