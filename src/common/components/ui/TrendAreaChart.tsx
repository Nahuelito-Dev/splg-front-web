import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartPalette } from '../../../theme/useChartPalette';
import { formatAxis, useTooltipStyle } from './chartColors';

export interface TrendPoint {
  label: string;
  value: number;
  /** El mismo punto del período anterior; sin esto no se dibuja la comparación. */
  previous?: number;
}

interface Props {
  data: TrendPoint[];
  formatValue: (value: number) => string;
  seriesName: string;
  previousName?: string;
  height?: number;
}

/** Área de una serie en el tiempo con la del período anterior punteada para comparar. */
export const TrendAreaChart = ({
  data,
  formatValue,
  seriesName,
  previousName = 'Período anterior',
  height = 300,
}: Props) => {
  const palette = useChartPalette();
  const tooltipStyle = useTooltipStyle();
  const hasPrevious = data.some((p) => p.previous !== undefined);

  return (
    <div style={{ height }} role="img" aria-label={`Gráfico de ${seriesName.toLowerCase()} en el tiempo`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.primary} stopOpacity={0.28} />
              <stop offset="100%" stopColor={palette.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: palette.axisStrong, fontSize: 11.5 }}
            minTickGap={24}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={64}
            tick={{ fill: palette.axis, fontSize: 11.5 }}
            tickFormatter={(v: number) => formatAxis(v)}
          />
          <Tooltip<number, string>
            formatter={(value) => formatValue(Number(value))}
            contentStyle={tooltipStyle}
            cursor={{ stroke: palette.axis, strokeDasharray: '3 3' }}
          />
          {hasPrevious && (
            <Area
              type="monotone"
              dataKey="previous"
              name={previousName}
              stroke={palette.muted}
              strokeWidth={1.8}
              strokeDasharray="5 4"
              fill="none"
              dot={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            name={seriesName}
            stroke={palette.primary}
            strokeWidth={2.2}
            fill="url(#trend-fill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
