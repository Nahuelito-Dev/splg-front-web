import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../../common/components/ui';
import { useSalesChart } from '../../../services/queries/stats';
import brand from '../../../theme/brand.json';
import { useChartPalette } from '../../../theme/useChartPalette';
import { formatCurrency } from '../../../utils/format';

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

/** Ventas entregadas de los últimos 7 días (GET /orders/stats/chart); hoy va resaltado. */
export const WeeklySalesChart = () => {
  const gradientId = useId();
  const { data: chart = [], isLoading } = useSalesChart();
  const palette = useChartPalette();
  const lastIndex = chart.length - 1;

  return (
    <Card className="min-w-0">
      <div className="border-b border-outline-soft px-[18px] py-3.5">
        <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">Ventas de los últimos 7 días</h2>
        <p className="text-xs text-muted">Total cobrado en pedidos entregados, por día.</p>
      </div>
      <div className="h-60 px-3 pb-2 pt-4">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-lg bg-surface-hover" />
        ) : chart.every((point) => point.sales === 0) ? (
          <div className="grid h-full place-items-center text-sm text-muted">Sin ventas en la última semana.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
            <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={brand.llama['500']} />
                  <stop offset="1" stopColor={brand.llama['700']} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: palette.axisStrong }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={52}
                tick={{ fontSize: 10.5, fill: palette.axis, fontFamily: 'Geist Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => `$${compact.format(value)}`}
              />
              <Tooltip<number, string>
                cursor={{ fill: palette.cursor }}
                formatter={(value) => [formatCurrency(value), 'Ventas']}
                contentStyle={{
                  borderRadius: 10,
                  border: `1px solid ${palette.tooltipBorder}`,
                  backgroundColor: palette.tooltipBg,
                  color: palette.isDark ? brand.dark.ink : brand.tinta['900'],
                  fontSize: 12,
                  boxShadow: '0 8px 24px -8px rgba(16,24,40,.18)',
                }}
              />
              <Bar dataKey="sales" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {chart.map((point, index) => (
                  <Cell key={point.date} fill={`url(#${gradientId})`} fillOpacity={index === lastIndex ? 1 : 0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
