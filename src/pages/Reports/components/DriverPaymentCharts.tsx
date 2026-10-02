import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../../common/components/ui';
import type { VentasPorChofer, VentasPorMedioDePago } from '../../../services/api/types';
import brand from '../../../theme/brand.json';
import { useChartPalette } from '../../../theme/useChartPalette';
import { formatCurrency } from '../../../utils/format';
import { PAYMENT_LABELS } from './paymentLabels';

/** Colores de la torta de pagos: con buen contraste contra la tarjeta, en los dos temas. */
const chartColorsFor = (isDark: boolean) => [
  brand.llama['500'],
  brand.gas['500'],
  isDark ? brand.dark.muted : brand.tinta['400'],
  isDark ? brand.dark.status.info : brand.status.info,
  isDark ? brand.dark.status.success : brand.status.success,
  isDark ? brand.dark.status.warn : brand.status.warn,
];

interface Props {
  byDriver: VentasPorChofer[];
  byPayment: VentasPorMedioDePago[];
}

export const DriverPaymentCharts = ({ byDriver, byPayment }: Props) => {
  const palette = useChartPalette();
  const CHART_COLORS = chartColorsFor(palette.isDark);
  const tooltipStyle = {
    borderRadius: 10,
    border: `1px solid ${palette.tooltipBorder}`,
    backgroundColor: palette.tooltipBg,
    color: palette.isDark ? brand.dark.ink : brand.tinta['900'],
    fontSize: 12,
  };
  const driverData = [...byDriver]
    .map((d) => ({ name: d.driverName ?? 'Sin nombre', sales: Number(d.totalSales) }))
    .sort((a, b) => b.sales - a.sales);
  const paymentData = byPayment.map((p) => ({
    name: PAYMENT_LABELS[p.method] ?? p.method,
    value: Number(p.totalSales),
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="flex h-[400px] flex-col p-6">
        <h3 className="mb-6 font-display text-base font-semibold text-ink">Ventas por repartidor</h3>
        <div className="min-h-0 flex-1">
          {driverData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No hay ventas entregadas en el período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={driverData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: palette.axis, fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: palette.axis, fontSize: 12 }}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <RechartsTooltip<number, string>
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="sales" fill={brand.llama['500']} radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="flex h-[400px] flex-col p-6">
        <h3 className="mb-6 font-display text-base font-semibold text-ink">Distribución de pagos</h3>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {paymentData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip<number, string>
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={tooltipStyle}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: palette.axisStrong }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">No hay transacciones registradas.</p>
          )}
        </div>
      </Card>
    </div>
  );
};
