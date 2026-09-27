import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../../common/components/ui';
import { useSalesEvolution } from '../../../services/queries/reports';
import brand from '../../../theme/brand.json';
import { formatCurrency } from '../../../utils/format';
import type { ReportsDateRange } from '../../../services/api/reports';

type Granularity = 'day' | 'week' | 'month';

const GRANULARITY_LABEL: Record<Granularity, string> = { day: 'Diario', week: 'Semanal', month: 'Mensual' };

const formatPeriod = (period: string, granularity: Granularity) =>
  new Date(period).toLocaleDateString(
    'es-AR',
    granularity === 'month' ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: '2-digit' },
  );

interface Props {
  range: ReportsDateRange;
}

export const SalesEvolutionChart = ({ range }: Props) => {
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { data: evolution = [] } = useSalesEvolution({ ...range, granularity });

  const points = evolution.map((p) => ({ period: formatPeriod(p.period, granularity), totalSales: p.totalSales }));

  return (
    <Card className="flex h-[380px] flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-ink">Evolución de ventas</h3>
        <div className="flex gap-1 rounded-lg bg-tinta-100 p-1">
          {(Object.keys(GRANULARITY_LABEL) as Granularity[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                granularity === g ? 'bg-surface text-primary-strong shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {GRANULARITY_LABEL[g]}
            </button>
          ))}
        </div>
      </div>
      {points.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">Sin ventas en el período.</div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke={brand.tinta['100']} />
              <XAxis dataKey="period" tick={{ fontSize: 12, fill: brand.tinta['500'] }} />
              <YAxis
                tick={{ fontSize: 12, fill: brand.tinta['500'] }}
                tickFormatter={(value: number) => formatCurrency(value)}
                width={90}
              />
              <RechartsTooltip<number, string> formatter={(value) => formatCurrency(value)} />
              <Line
                type="monotone"
                dataKey="totalSales"
                stroke={brand.llama['500']}
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Facturación"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
