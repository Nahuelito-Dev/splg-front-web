/** Formatos de presentación del panel (es-AR). Un solo lugar para moneda y fechas. */

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const currencyExact = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const number = new Intl.NumberFormat('es-AR');
const dateOnly = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' });
const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
const timeOnly = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

type DateInput = string | number | Date | null | undefined;

const toDate = (value: Exclude<DateInput, null | undefined>): Date | null => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** $ 22.600 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  const n = Number(value);
  return value === null || value === undefined || value === '' || !Number.isFinite(n) ? '—' : currency.format(n);
};

/** $ 22.600,50: con centavos, para saldos y promedios donde los decimales cuentan. */
export const formatCurrencyExact = (value: number | string | null | undefined): string => {
  const n = Number(value);
  return value === null || value === undefined || value === '' || !Number.isFinite(n) ? '—' : currencyExact.format(n);
};

/** 1.234 */
export const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : number.format(value);

/** 26 sept 2026 */
export const formatDate = (value: DateInput): string => {
  const date = value === null || value === undefined ? null : toDate(value);
  return date ? dateOnly.format(date) : '—';
};

/** 26 sept 2026, 18:45 */
export const formatDateTime = (value: DateInput): string => {
  const date = value === null || value === undefined ? null : toDate(value);
  return date ? dateTime.format(date) : '—';
};

/** 18:45 */
export const formatTime = (value: DateInput): string => {
  const date = value === null || value === undefined ? null : toDate(value);
  return date ? timeOnly.format(date) : '—';
};

/**
 * Una fecha de calendario (sin zona horaria) tal cual, sin correrse un día.
 * Acepta `YYYY-MM-DD` o un date-time ISO completo (`2026-12-01T00:00:00.000Z`,
 * como lo devuelve la API para los vencimientos de la flota): sólo mira los
 * primeros 10 caracteres, nunca los pasa por `Date` con zona horaria.
 */
export const formatDay = (value: string | null | undefined): string => {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return y && m && d ? dateOnly.format(new Date(y, m - 1, d)) : value;
};

/** #CBC4E7: los últimos 6 caracteres de un id (pedido, reclamo, chofer…), como lo muestra todo el panel. */
export const formatShortId = (id: string): string => `#${id.slice(-6).toUpperCase()}`;

/** "hace instantes", "hace 12s", "hace 3m", "hace 2h" respecto de `now`. */
export const formatElapsed = (isoDate: string, now: number): string => {
  const diffMs = now - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 5000) return 'hace instantes';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  return `hace ${Math.floor(minutes / 60)}h`;
};

/** Iniciales para un avatar: "Jeny Gas" → "JG". */
export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

const longDay = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Sábado 26 de septiembre */
export const formatLongDay = (value: Date): string => {
  const text = longDay.format(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Variación porcentual con un decimal: 12,4 %. `null` si no hay base para comparar. */
export const percentChange = (current: number, previous: number): number | null =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;

const ARGENTINA = 'America/Argentina/Buenos_Aires';
const dayKeyAr = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** El día calendario (YYYY-MM-DD) de un instante en Buenos Aires: la zona en que se cuentan los vencimientos. */
export const argentinaDay = (value: string | Date): string =>
  dayKeyAr.format(typeof value === 'string' ? new Date(value) : value);

/** 26 sept 2026: el día de Buenos Aires de un instante ISO (no el del navegador ni el de UTC). */
export const formatArgentinaDay = (value: string | null | undefined): string =>
  value ? formatDay(argentinaDay(value)) : '—';
