/** Saludo según la hora local: el tablero es lo primero que se ve al entrar. */
export const greetingFor = (date: Date): string => {
  const hour = date.getHours();
  if (hour < 13) return 'Buen día';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

export interface SparkPath {
  line: string;
  area: string;
  last: { x: number; y: number };
}

/**
 * Trazado de un sparkline en un viewBox de `width`×`height`. Los valores se
 * escalan entre su mínimo y su máximo; una serie plana queda en el medio.
 */
export const sparkPath = (values: number[], width: number, height: number, pad = 3): SparkPath | null => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(...values) - min;
  const points = values.map((value, i) => ({
    x: (i * width) / (values.length - 1),
    y: range === 0 ? height / 2 : height - pad - ((value - min) / range) * (height - pad * 2),
  }));
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { line, area: `${line} L${width} ${height} L0 ${height} Z`, last: points[points.length - 1] };
};
