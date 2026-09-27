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
import { formatCurrency } from '../../../utils/format';
import { PAYMENT_LABELS } from './paymentLabels';

const CHART_COLORS = [
  brand.llama['500'],
  brand.gas['500'],
  brand.tinta['400'],
  brand.status.info,
  brand.status.success,
  brand.status.warn,
];

interface Props {
  byDriver: VentasPorChofer[];
  byPayment: VentasPorMedioDePago[];
}

export const DriverPaymentCharts = ({ byDriver, byPayment }: Props) => {
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={brand.tinta['100']} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: brand.tinta['400'], fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: brand.tinta['400'], fontSize: 12 }}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <RechartsTooltip<number, string> formatter={(value) => formatCurrency(value)} />
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
                <RechartsTooltip<number, string> formatter={(value) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36} />
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
