import { useId } from 'react';
import { sparkPath } from '../lib/dashboard';

const WIDTH = 84;
const HEIGHT = 34;

interface Props {
  values: number[];
  /** Color del trazo (un valor de brand.json: es un dato del gráfico, no una clase). */
  color: string;
  label: string;
}

/** Tendencia chica al lado de un indicador. Sin al menos dos puntos no se dibuja. */
export const Sparkline = ({ values, color, label }: Props) => {
  const gradientId = useId();
  const path = sparkPath(values, WIDTH, HEIGHT);
  if (!path) return null;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[34px] w-[84px] shrink-0" role="img" aria-label={label}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.28} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${gradientId})`} />
      <path d={path.line} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={path.last.x - 1.5} cy={path.last.y} r={3} className="fill-surface" stroke={color} strokeWidth={1.8} />
    </svg>
  );
};
