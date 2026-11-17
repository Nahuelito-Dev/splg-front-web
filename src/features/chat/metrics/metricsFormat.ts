import { toIsoDay } from '../../../utils/dates';
import { addDays, isValidDay, rangeLength, type DayRange } from '../../../utils/dateRange';
import type { KeyCount } from '../../../services/api/types';
import { formatNumber } from '../../../utils/format';
import { formatMinutes } from '../inbox/inboxLabels';

/** Lo que muestra un dato que todavía no existe en el período (sin respuestas, sin encuestas…). */
export const NO_DATA = '—';

/** Minutos (hábiles o corridos) en palabras: «12 min», «1 h 35 min». Sin dato, un guion. */
export const formatMetricMinutes = (minutes: number | null): string => {
  if (minutes === null || !Number.isFinite(minutes)) return NO_DATA;
  if (minutes > 0 && minutes < 1) return 'menos de 1 min';
  return formatMinutes(Math.round(minutes));
};

const percent = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

/** Una proporción de la API (0 a 1) como porcentaje: «85,4 %». Sin dato, un guion. */
export const formatRate = (rate: number | null): string =>
  rate === null || !Number.isFinite(rate) ? NO_DATA : `${percent.format(rate * 100)} %`;

/** Proporción de la API (0 a 1) como porcentaje para una planilla: 0.25 → 25 (con un decimal). Sin dato, vacío. */
export const csvPercent = (rate: number | null | undefined): number | '' =>
  rate === null || rate === undefined || !Number.isFinite(rate) ? '' : Math.round(rate * 1000) / 10;

const score = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Promedio de la encuesta: «4,5 de 5». Sin respuestas, un guion. */
export const formatScore = (average: number | null): string =>
  average === null || !Number.isFinite(average) ? NO_DATA : `${score.format(average)} de 5`;

/** «35 de 41». */
export const formatPartOf = (part: number, total: number): string => `${formatNumber(part)} de ${formatNumber(total)}`;

/**
 * Las respuestas automáticas del sistema, por la clave con que las guarda la API. `recibido` (plantilla) y
 * `received_ack` (código del mensaje de sistema) son el mismo aviso: la API cuenta por `template_key` y, si falta, por
 * `system_code`.
 */
const AUTOMATIC_REPLY_LABELS: Record<string, string> = {
  recibido: 'Aviso de recibido',
  received_ack: 'Aviso de recibido',
  fuera_de_horario: 'Fuera de horario',
  asistente_ia: 'Respuesta del asistente',
  asistente_derivacion: 'Pase a una persona del equipo',
};

export const OTHER_AUTOMATIC_REPLY = 'Otra respuesta automática';

export const automaticReplyLabel = (key: string): string => AUTOMATIC_REPLY_LABELS[key] ?? OTHER_AUTOMATIC_REPLY;

/** Las respuestas automáticas sumadas por nombre (dos claves del mismo aviso van en una barra), de más a menos. */
export const automaticRepliesByLabel = (byKey: KeyCount[]): { label: string; count: number }[] => {
  const totals = new Map<string, number>();
  for (const { key, count } of byKey) {
    const label = automaticReplyLabel(key);
    totals.set(label, (totals.get(label) ?? 0) + count);
  }
  return [...totals].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
};

/** Nombre de una respuesta guardada sin su plantilla: dada de baja, o no se pudieron leer las plantillas. */
export const DELETED_TEMPLATE = 'Respuesta guardada que ya no existe';
export const UNKNOWN_TEMPLATE = 'Respuesta guardada';

/**
 * El título de una respuesta guardada por su clave. `templates` en `null` si no se pudieron leer (o no hay permiso):
 * no se sabe si existe, se nombra genérica. Nunca la clave interna.
 */
export const templateTitle = (key: string, templates: { key: string; title: string }[] | null): string => {
  if (!templates) return UNKNOWN_TEMPLATE;
  return templates.find((template) => template.key === key)?.title ?? DELETED_TEMPLATE;
};

/** Atajos del período: los últimos 7, 30 o 90 días contando hoy. */
export const METRICS_PRESETS = [
  { id: '7', label: '7 días', days: 7 },
  { id: '30', label: '30 días', days: 30 },
  { id: '90', label: '90 días', days: 90 },
] as const;

export type MetricsPresetId = (typeof METRICS_PRESETS)[number]['id'];

/** Lo que pide la API sin fechas: los 30 días que terminan hoy. */
export const DEFAULT_PRESET: MetricsPresetId = '30';

/** El período más largo que acepta la API. */
export const MAX_PERIOD_DAYS = 366;

export const presetPeriod = (id: MetricsPresetId, today: string = toIsoDay(new Date())): DayRange => {
  const days = METRICS_PRESETS.find((preset) => preset.id === id)?.days ?? 30;
  return { from: addDays(today, -(days - 1)), to: today };
};

/**
 * El período que se consulta según la URL. Sin fechas, el de la API por omisión: no se mandan y la respuesta dice
 * cuáles usó. Con alguna, se validan con las mismas reglas que la API (una fecha que no es un día también es un error:
 * no se cambia en silencio por el período por omisión).
 */
export const readPeriod = (
  from: string,
  to: string,
  today: string = toIsoDay(new Date()),
): { range: DayRange | null; preset: MetricsPresetId | null; error: string | null } => {
  if (!from && !to) return { range: null, preset: DEFAULT_PRESET, error: null };
  if (!isValidDay(from) || !isValidDay(to)) {
    return { range: null, preset: null, error: 'Las fechas del período no son válidas: elegí otro período.' };
  }
  const range = { from, to };
  if (from > to) return { range, preset: null, error: 'La fecha «desde» no puede ser posterior a la fecha «hasta».' };
  if (rangeLength(range) > MAX_PERIOD_DAYS) {
    return { range, preset: null, error: `El período puede abarcar hasta ${MAX_PERIOD_DAYS} días.` };
  }
  const preset = METRICS_PRESETS.find(({ id }) => {
    const expected = presetPeriod(id, today);
    return expected.from === from && expected.to === to;
  });
  return { range, preset: preset?.id ?? null, error: null };
};
