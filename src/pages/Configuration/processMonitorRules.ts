import type { ProcessSummaryItem } from '../../services/api/types';

/** Duración de una corrida: 850 ms, 1,8 s, 2 min 5 s. `null` es que todavía corre. */
export const formatDuration = (ms: number | null): string => {
  if (ms === null) return 'en curso';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1).replace('.', ',')} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds - minutes * 60);
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
};

/** Cada cuánto se espera una corrida: «cada 15 s», «cada 5 min», «cada hora», «cada día». */
export const formatPeriod = (seconds: number): string => {
  if (seconds < 60) return `cada ${seconds} s`;
  if (seconds < 3600) return `cada ${Math.round(seconds / 60)} min`;
  if (seconds === 3600) return 'cada hora';
  if (seconds < 86400) return `cada ${Math.round(seconds / 3600)} h`;
  return seconds === 86400 ? 'cada día' : `cada ${Math.round(seconds / 86400)} días`;
};

const COUNTER_LABELS: Record<string, string> = {
  processed: 'Procesados',
  errors: 'Errores',
  errores: 'Errores',
  failed: 'Fallidos',
  alerts: 'Avisos',
  closed: 'Cerradas',
  purged: 'Purgadas',
  offers: 'Ofertas',
  cases: 'Casos',
  sent: 'Enviados',
  deleted: 'Borrados',
};

/** «anticipationDays» → «Anticipation days»: un contador que el panel no conoce se muestra legible igual. */
const humanize = (key: string): string => {
  const words = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export interface CounterEntry {
  key: string;
  label: string;
  value: number;
}

export const counterEntries = (counters: Record<string, number> | undefined): CounterEntry[] =>
  Object.entries(counters ?? {}).map(([key, value]) => ({ key, label: COUNTER_LABELS[key] ?? humanize(key), value }));

/** Los estados que piden atención: se muestran primero en el tablero. */
const ATTENTION: ReadonlySet<ProcessSummaryItem['health']> = new Set(['stuck', 'failed', 'late']);

export const needsAttention = (item: Pick<ProcessSummaryItem, 'health'>): boolean => ATTENTION.has(item.health);

/** Primero los que piden atención, después el resto en el orden de la API. */
export const sortByAttention = <T extends Pick<ProcessSummaryItem, 'health'>>(items: T[]): T[] => [
  ...items.filter(needsAttention),
  ...items.filter((i) => !needsAttention(i)),
];
