import type { PlatformProcess, PlatformRange } from '../../services/api/types';
import { argentinaDay, formatDay } from '../../utils/format';
import { PROCESS_HEALTH } from '../../utils/statusLabels';
import type { Label } from '../../utils/statusLabels';

/** El mes en curso de Argentina (`AAAA-MM`), el que el back toma por omisión. */
export const currentMonth = (now: Date = new Date()): string => argentinaDay(now).slice(0, 7);

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** `2026-11` → «noviembre de 2026». */
export const formatMonth = (month: string): string => {
  const [year, m] = month.split('-').map(Number);
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} de ${year}` : month;
};

/** `2026-11` → `2026-10` (y de enero a diciembre del año anterior). */
export const shiftMonth = (month: string, delta: number): string => {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** El período que usó el back: «1 nov 2026 al 14 nov 2026». */
export const formatRange = (range: PlatformRange): string =>
  range.from === range.to ? formatDay(range.from) : `${formatDay(range.from)} al ${formatDay(range.to)}`;

export interface HealthEntry {
  key: string;
  count: number;
  label: Label;
}

/** Cuántas empresas hay en cada estado de salud de un proceso, primero lo que pide atención. */
export const healthEntries = (health: PlatformProcess['health']): HealthEntry[] => {
  const order = ['stuck', 'failed', 'late', 'partial', 'running', 'ok', 'never'];
  return Object.entries(health)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
    .map(([key, count]) => ({
      key,
      count,
      label: PROCESS_HEALTH[key as keyof typeof PROCESS_HEALTH] ?? { text: key, tone: 'neutral' },
    }));
};
