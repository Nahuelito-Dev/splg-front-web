import { addDays, isValidDay, rangeLength, type DayRange } from '../../utils/dateRange';

export type IncomePeriodId = 'thisMonth' | 'lastMonth' | 'last30' | 'last90' | 'thisYear' | 'custom';
export type IncomeGroupBy = 'day' | 'week' | 'month';

export const INCOME_PERIODS: { id: IncomePeriodId; label: string }[] = [
  { id: 'thisMonth', label: 'Este mes' },
  { id: 'lastMonth', label: 'Mes pasado' },
  { id: 'last30', label: 'Últimos 30 días' },
  { id: 'last90', label: 'Últimos 90 días' },
  { id: 'thisYear', label: 'Este año' },
  { id: 'custom', label: 'Rango' },
];

/** Lo máximo que acepta el back en una consulta. */
export const MAX_DAYS = 366;

export const isGroupBy = (value: string): value is IncomeGroupBy =>
  value === 'day' || value === 'week' || value === 'month';

export const isPeriodId = (value: string): value is IncomePeriodId => INCOME_PERIODS.some((p) => p.id === value);

const ART_OFFSET_MS = 3 * 60 * 60 * 1000;

/** El día de hoy en hora argentina (el que usa el back), no el del navegador. */
export const argentinaToday = (now: Date = new Date()): string =>
  new Date(now.getTime() - ART_OFFSET_MS).toISOString().slice(0, 10);

const isoDay = (year: number, month: number, day: number): string =>
  new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);

/** El rango de un atajo en hora argentina; `custom` usa los extremos elegidos (puede venir incompleto). */
export const periodRange = (id: IncomePeriodId, custom: DayRange, now: Date = new Date()): DayRange => {
  const today = argentinaToday(now);
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1;
  switch (id) {
    case 'thisMonth':
      return { from: isoDay(y, m, 1), to: today };
    case 'lastMonth':
      return { from: isoDay(y, m - 1, 1), to: isoDay(y, m, 0) };
    case 'last30':
      return { from: addDays(today, -29), to: today };
    case 'last90':
      return { from: addDays(today, -89), to: today };
    case 'thisYear':
      return { from: isoDay(y, 0, 1), to: today };
    case 'custom':
      return custom;
  }
};

/** Por qué el rango no se puede consultar, o `null` si está bien. */
export const rangeProblem = ({ from, to }: DayRange): string | null => {
  if (!isValidDay(from) || !isValidDay(to)) return 'Elegí el día inicial y el final.';
  if (from > to) return 'El día inicial no puede ser posterior al final.';
  if (rangeLength({ from, to }) > MAX_DAYS) return `El período no puede pasar de ${MAX_DAYS} días.`;
  return null;
};

/** Cómo conviene agrupar un rango para que el gráfico se lea: días hasta 31, semanas hasta 120, meses el resto. */
export const defaultGroupBy = ({ from, to }: DayRange): IncomeGroupBy => {
  const days = rangeLength({ from, to });
  return days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Etiqueta corta del eje: `05/10`, `Sem 05/10` o `oct 26`. */
export const periodLabel = (period: string, groupBy: IncomeGroupBy): string => {
  const [y, m, d] = period.split('-');
  if (groupBy === 'month') return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
  const day = `${d}/${m}`;
  return groupBy === 'week' ? `Sem ${day}` : day;
};

/** Porcentaje de `part` sobre `total`, con un decimal: `12,5 %`. */
export const sharePercent = (part: number, total: number): string =>
  total > 0 ? `${((part / total) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %` : '—';
