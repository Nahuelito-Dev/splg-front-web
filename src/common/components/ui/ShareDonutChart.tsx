import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useSeriesColors, useTooltipStyle } from './chartColors';

export interface DonutSlice {
  name: string;
  value: number;
}

interface Props {
  data: DonutSlice[];
  formatValue: (value: number) => string;
  /** Texto bajo el total del centro. */
  totalLabel: string;
}

/** Dona con el total en el centro y la leyenda con el porcentaje de cada porción. */
export const ShareDonutChart = ({ data, formatValue, totalLabel }: Props) => {
  const colors = useSeriesColors();
  const tooltipStyle = useTooltipStyle();
  const total = data.reduce((acc, s) => acc + s.value, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[200px] w-[200px]" role="img" aria-label={`Participación: ${totalLabel}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={66} outerRadius={94} paddingAngle={3} stroke="none">
              {data.map((slice, i) => (
                <Cell key={slice.name} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip<number, string> formatter={(value) => formatValue(Number(value))} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="font-mono text-[15px] font-semibold text-ink">{formatValue(total)}</span>
          <span className="text-[11.5px] text-muted">{totalLabel}</span>
        </div>
      </div>
      <ul className="grid w-full gap-1.5 text-[12.5px]">
        {data.map((slice, i) => (
          <li key={slice.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-ink-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-ink">
              {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
