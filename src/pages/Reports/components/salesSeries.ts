import type { TrendPoint } from '../../../common/components/ui';
import type { EvolucionDeVentas } from '../../../services/api/types';
import { toIsoDay } from '../../../utils/dates';
import { addDays, parseDay, previousRange as previousDays, type DayRange } from '../../../utils/dateRange';

export type Granularity = 'day' | 'week' | 'month';

const dayLabel = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' });
const monthLabel = new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit' });

/** Lunes de la semana de `day` (la API agrupa las semanas desde el lunes). */
const weekStart = (day: string): string => addDays(day, -((parseDay(day).getDay() + 6) % 7));

/** Inicio de cada tramo (día, semana o mes) que toca el rango, en orden. */
export const bucketStarts = ({ from, to }: DayRange, granularity: Granularity): string[] => {
  const starts: string[] = [];
  if (granularity === 'month') {
    const end = parseDay(to);
    for (let d = parseDay(from.slice(0, 8) + '01'); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      starts.push(toIsoDay(d));
    }
    return starts;
  }
  const step = granularity === 'week' ? 7 : 1;
  for (let day = granularity === 'week' ? weekStart(from) : from; day <= to; day = addDays(day, step)) {
    starts.push(day);
  }
  return starts;
};

/**
 * El período contra el que se compara la serie. Por día es el rango anterior de igual largo;
 * por semana o mes son la misma cantidad de tramos completos justo antes del primero
 * (así el 1º se alinea con el 1º y no se mezclan meses a medias).
 */
export const trendPreviousRange = (range: DayRange, granularity: Granularity): DayRange => {
  if (granularity === 'day') return previousDays(range);
  const starts = bucketStarts(range, granularity);
  const first = parseDay(starts[0]);
  const before = addDays(starts[0], -1);
  if (granularity === 'week') return { from: addDays(starts[0], -7 * starts.length), to: before };
  return { from: toIsoDay(new Date(first.getFullYear(), first.getMonth() - starts.length, 1)), to: before };
};

/** Ventas por tramo, con ceros donde la API no devuelve nada (no hubo ventas ese día). */
export const salesByBucket = (rows: EvolucionDeVentas[], range: DayRange, granularity: Granularity): number[] => {
  const byStart = new Map<string, number>();
  rows.forEach((row) => {
    const key = toIsoDay(new Date(row.period));
    byStart.set(key, (byStart.get(key) ?? 0) + Number(row.totalSales));
  });
  return bucketStarts(range, granularity).map((start) => byStart.get(start) ?? 0);
};

/** El primer tramo de una semana o mes puede arrancar antes del rango: se rotula con la fecha real desde la que cuenta. */
const labelFor = (start: string, granularity: Granularity, rangeFrom: string): string => {
  if (granularity !== 'day' && start < rangeFrom) return `Desde ${dayLabel.format(parseDay(rangeFrom))}`;
  const date = parseDay(start);
  return granularity === 'month' ? monthLabel.format(date) : dayLabel.format(date);
};

/** Une la serie actual con la del período anterior, punto a punto (el 1º con el 1º, etc.). */
export const buildTrend = (
  current: EvolucionDeVentas[],
  previous: EvolucionDeVentas[] | undefined,
  range: DayRange,
  previousRange: DayRange,
  granularity: Granularity,
): TrendPoint[] => {
  const starts = bucketStarts(range, granularity);
  const values = salesByBucket(current, range, granularity);
  const prevValues = previous ? salesByBucket(previous, previousRange, granularity) : undefined;
  return starts.map((start, i) => ({
    label: labelFor(start, granularity, range.from),
    value: values[i],
    previous: prevValues ? (prevValues[i] ?? 0) : undefined,
  }));
};
