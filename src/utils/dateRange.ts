import { toIsoDay } from './dates';
import { formatDay } from './format';

/** Rango de fechas de calendario, ambos extremos inclusivos, en YYYY-MM-DD. */
export interface DayRange {
  from: string;
  to: string;
}

export type RangePresetId = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear';

export const RANGE_PRESETS: { id: RangePresetId; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'last7', label: 'Últimos 7 días' },
  { id: 'last30', label: 'Últimos 30 días' },
  { id: 'thisMonth', label: 'Este mes' },
  { id: 'lastMonth', label: 'Mes anterior' },
  { id: 'thisYear', label: 'Este año' },
];

const MS_DAY = 86_400_000;

/** YYYY-MM-DD → Date a las 00:00 locales (nunca pasa por UTC, así no se corre un día). */
export const parseDay = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isValidDay = (value: string | null | undefined): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toIsoDay(parseDay(value)) === value;
};

/** Un día que tiene sentido consultar en reportes: de 2000 a hoy (una URL armada a mano no tiene que tirar la API). */
export const isReportableDay = (
  value: string | null | undefined,
  today: string = toIsoDay(new Date()),
): value is string => isValidDay(value) && value >= '2000-01-01' && value <= today;

export const addDays = (value: string, days: number): string => {
  const date = parseDay(value);
  date.setDate(date.getDate() + days);
  return toIsoDay(date);
};

/** Cantidad de días del rango, contando los dos extremos. */
export const rangeLength = ({ from, to }: DayRange): number =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / MS_DAY) + 1;

/** El rango de largo igual que termina el día anterior al inicio: contra el que se compara. */
export const previousRange = (range: DayRange): DayRange => {
  const length = rangeLength(range);
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
};

export const presetRange = (id: RangePresetId, now: Date = new Date()): DayRange => {
  const today = toIsoDay(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (id) {
    case 'today':
      return { from: today, to: today };
    case 'last7':
      return { from: addDays(today, -6), to: today };
    case 'last30':
      return { from: addDays(today, -29), to: today };
    case 'thisMonth':
      return { from: toIsoDay(new Date(y, m, 1)), to: today };
    case 'lastMonth':
      return { from: toIsoDay(new Date(y, m - 1, 1)), to: toIsoDay(new Date(y, m, 0)) };
    case 'thisYear':
      return { from: toIsoDay(new Date(y, 0, 1)), to: today };
  }
};

/** El atajo que coincide con el rango, o `null` si es uno personalizado. */
export const matchPreset = (range: DayRange, now: Date = new Date()): RangePresetId | null =>
  RANGE_PRESETS.find(({ id }) => {
    const preset = presetRange(id, now);
    return preset.from === range.from && preset.to === range.to;
  })?.id ?? null;

/** El atajo guardado (p. ej. en la URL) sólo vale si el rango sigue siendo el que ese atajo arma hoy. */
export const resolvePreset = (
  id: string | null | undefined,
  range: DayRange,
  now: Date = new Date(),
): RangePresetId | null => {
  const preset = RANGE_PRESETS.find((p) => p.id === id);
  if (!preset) return null;
  const expected = presetRange(preset.id, now);
  return expected.from === range.from && expected.to === range.to ? preset.id : null;
};

/** Texto del botón: el atajo ("Este mes") con las fechas, o sólo las fechas. `preset` fuerza el atajo elegido. */
export const dateRangeSummary = (range: DayRange, preset: RangePresetId | null = matchPreset(range)): string => {
  const dates = range.from === range.to ? formatDay(range.from) : `${formatDay(range.from)} – ${formatDay(range.to)}`;
  return preset ? `${RANGE_PRESETS.find((p) => p.id === preset)?.label}: ${dates}` : dates;
};

/** Lo corto para el botón: el nombre del atajo ("Este mes") o, si es personalizado, las dos fechas. */
export const dateRangeLabel = (range: DayRange, preset: RangePresetId | null = matchPreset(range)): string => {
  return preset ? (RANGE_PRESETS.find((p) => p.id === preset)?.label ?? '') : dateRangeSummary(range, null);
};
