import type { EvolucionDeVentas } from '../../../services/api/types';

/** El back agrupa los días en hora de Buenos Aires: los días del tablero se cuentan igual. */
const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const monthFormat = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', month: 'short' });

export interface SalesPoint {
  /** `YYYY-MM-DD` (día) o `YYYY-MM` (mes). */
  key: string;
  label: string;
  sales: number;
  orders: number;
}

export interface SalesWindows {
  current: SalesPoint[];
  previous: SalesPoint[];
}

/** `YYYY-MM-DD` de una fecha, en hora de Buenos Aires. */
export const dayKey = (value: Date | string | number): string => dayFormat.format(new Date(value));

const parseKey = (key: string): Date => {
  const [year, month, day = 1] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

/** Corre un día de calendario `days` hacia adelante o atrás, sin zonas horarias de por medio. */
export const shiftDay = (key: string, days: number): string => {
  const date = parseKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** El rango `from`/`to` de la API para los últimos `days` días que terminan en `endKey`. */
export const dayRange = (endKey: string, days: number) => ({ from: shiftDay(endKey, -(days - 1)), to: endKey });

/** El mes `YYYY-MM-01` que está `months` meses antes del de `endKey`. */
export const monthStart = (endKey: string, months: number): string => {
  const date = parseKey(endKey);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1)).toISOString().slice(0, 10);
};

const dayLabel = (key: string): string => {
  const [, month, day] = key.split('-').map(Number);
  return `${day}/${month}`;
};

const monthLabel = (key: string): string => monthFormat.format(parseKey(key)).replace('.', '');

/** La API devuelve sólo los días con ventas: se completan con ceros los que faltan. */
export const fillDays = (rows: EvolucionDeVentas[], endKey: string, count: number): SalesPoint[] => {
  const byDay = new Map(rows.map((row) => [dayKey(row.period), row]));
  return Array.from({ length: count }, (_, index) => {
    const key = shiftDay(endKey, index - (count - 1));
    const row = byDay.get(key);
    return { key, label: dayLabel(key), sales: row?.totalSales ?? 0, orders: row?.totalOrders ?? 0 };
  });
};

/** Igual que `fillDays` pero por mes: los últimos `count` meses que terminan en el de `endKey`. */
export const fillMonths = (rows: EvolucionDeVentas[], endKey: string, count: number): SalesPoint[] => {
  const byMonth = new Map(rows.map((row) => [dayKey(row.period).slice(0, 7), row]));
  return Array.from({ length: count }, (_, index) => {
    const key = monthStart(endKey, count - 1 - index).slice(0, 7);
    const row = byMonth.get(key);
    return { key, label: monthLabel(key), sales: row?.totalSales ?? 0, orders: row?.totalOrders ?? 0 };
  });
};

/** La última ventana de `size` puntos y la inmediatamente anterior, para comparar períodos. */
export const splitWindows = (points: SalesPoint[], size: number): SalesWindows => ({
  current: points.slice(-size),
  previous: points.slice(-size * 2, -size),
});
