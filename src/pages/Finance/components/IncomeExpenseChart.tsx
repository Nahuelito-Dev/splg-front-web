import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatAxis, useTooltipStyle } from '../../../common/components/ui/chartColors';
import { useChartPalette } from '../../../theme/useChartPalette';
import { formatCurrency } from '../../../utils/format';
import { periodLabel, type IncomeGroupBy } from '../incomeStatementPeriod';

interface Props {
  data: Array<{ period: string; income: number; expense: number }>;
  groupBy: IncomeGroupBy;
}

/** Barras de ingresos contra egresos por período, con los tonos semánticos de la marca (verde y rojo). */
export const IncomeExpenseChart = ({ data, groupBy }: Props) => {
  const palette = useChartPalette();
  const tooltipStyle = useTooltipStyle();
  const rows = data.map((p) => ({ ...p, label: periodLabel(p.period, groupBy) }));

  return (
    <div className="h-[260px] sm:h-[320px]" role="img" aria-label="Ingresos y egresos por período">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: palette.axisStrong, fontSize: 11.5 }}
            minTickGap={16}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={48}
            tick={{ fill: palette.axis, fontSize: 11.5 }}
            tickFormatter={(v: number) => formatAxis(v)}
          />
          <Tooltip<number, string>
            formatter={(value, name) => [formatCurrency(Number(value)), name]}
            contentStyle={tooltipStyle}
            cursor={{ fill: palette.cursor }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: palette.axisStrong, paddingTop: 8 }} />
          <Bar dataKey="income" name="Ingresos" fill={palette.success} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="Egresos" fill={palette.danger} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
