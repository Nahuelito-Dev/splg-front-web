import type { Reserva } from '../../services/api/types';
import { toIsoDay } from '../../utils/dates';

export type CalendarMode = 'month' | 'week' | 'day';
export type DepositFilter = '' | 'paid' | 'pending';

export interface ReservationFilters {
  deposit: DepositFilter;
  term: string;
}

/** YYYY-MM-DD → Date local (sin pasar por UTC, que corre el día). */
export const parseDay = (iso: string): Date => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Lunes de la semana de `date` (la semana argentina arranca el lunes). */
export const startOfWeek = (date: Date): Date => addDays(date, -((date.getDay() + 6) % 7));

/** Los 7 días de la semana de `anchor`, de lunes a domingo. */
export const weekDays = (anchor: Date): Date[] => {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

/** Las semanas completas que cubren el mes de `anchor` (4 a 6 filas de 7 días). */
export const monthGrid = (anchor: Date): Date[] => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const weeks = Math.ceil(((last.getTime() - start.getTime()) / 86_400_000 + 1) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
};

/** Mueve el ancla un mes, una semana o un día. */
export const shiftAnchor = (anchor: Date, mode: CalendarMode, direction: 1 | -1): Date => {
  if (mode === 'month') return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
  return addDays(anchor, direction * (mode === 'week' ? 7 : 1));
};

/** Los días que muestra la vista, para pedir los cupos (el mes no los muestra). */
export const visibleDays = (anchor: Date, mode: CalendarMode): Date[] =>
  mode === 'week' ? weekDays(anchor) : mode === 'day' ? [anchor] : monthGrid(anchor);

const MONTH_TITLE = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
const DAY_TITLE = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const LONG_DAY = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' });
const SHORT = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });

/** «5 de octubre», para los nombres accesibles de los días. */
export const longDayName = (date: Date): string => LONG_DAY.format(date);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const calendarTitle = (anchor: Date, mode: CalendarMode): string => {
  if (mode === 'month') return capitalize(MONTH_TITLE.format(anchor));
  if (mode === 'day') return capitalize(DAY_TITLE.format(anchor));
  const days = weekDays(anchor);
  return `${SHORT.format(days[0])} – ${SHORT.format(days[6])} de ${days[6].getFullYear()}`;
};

/** Sin filtrar por seña y con texto: busca en el nombre, el teléfono y el código corto del pedido. */
export const filterReservations = (rows: Reserva[], { deposit, term }: ReservationFilters): Reserva[] => {
  const needle = term.trim().toLowerCase();
  return rows.filter((row) => {
    if (deposit === 'paid' && !row.depositPaid) return false;
    if (deposit === 'pending' && row.depositPaid) return false;
    if (!needle) return true;
    return [row.customerName, row.customerPhone, row.id.slice(-6)].some((text) => text?.toLowerCase().includes(needle));
  });
};

/** Las reservas por día agendado; las que no tienen fecha no entran al calendario. */
export const groupByDay = (rows: Reserva[]): Map<string, Reserva[]> => {
  const byDay = new Map<string, Reserva[]>();
  for (const row of rows) {
    if (!row.scheduledDate) continue;
    const key = row.scheduledDate.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), row]);
  }
  return byDay;
};

export const dayKey = toIsoDay;
