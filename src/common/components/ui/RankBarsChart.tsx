import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartPalette } from '../../../theme/useChartPalette';
import { formatAxis, useSeriesColors, useTooltipStyle } from './chartColors';

export interface RankBar {
  name: string;
  value: number;
}

interface Props {
  data: RankBar[];
  formatValue: (value: number) => string;
  seriesName: string;
}

const ROW_HEIGHT = 44;

/** Barras horizontales ordenadas de mayor a menor: un ranking (productos, choferes). */
export const RankBarsChart = ({ data, formatValue, seriesName }: Props) => {
  const palette = useChartPalette();
  const tooltipStyle = useTooltipStyle();
  const colors = useSeriesColors();
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div
      style={{ height: Math.max(sorted.length * ROW_HEIGHT + 24, 120) }}
      role="img"
      aria-label={`Ranking de ${seriesName.toLowerCase()}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: palette.axis, fontSize: 11.5 }}
            tickFormatter={(v: number) => formatAxis(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={120}
            tick={{ fill: palette.axisStrong, fontSize: 12 }}
          />
          <Tooltip<number, string>
            formatter={(value) => [formatValue(Number(value)), seriesName]}
            contentStyle={tooltipStyle}
            cursor={{ fill: palette.cursor }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
            {sorted.map((row, i) => (
              <Cell key={row.name} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
