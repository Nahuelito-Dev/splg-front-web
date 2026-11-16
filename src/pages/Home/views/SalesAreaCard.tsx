import { useId, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TableroWidget } from '../../../common/components/ui';
import { cx } from '../../../common/components/ui/cx';
import { useSalesEvolution, useSalesSummary } from '../../../services/queries/reports';
import { useChartPalette } from '../../../theme/useChartPalette';
import { formatCurrency, formatNumber, percentChange } from '../../../utils/format';
import { dayKey, dayRange, fillMonths, monthStart, splitWindows, type SalesPoint } from '../lib/series';
import { useDailySales } from '../lib/useDailySales';

type Period = 'week' | 'month' | 'year';

const PERIODS: { id: Period; label: string; title: string }[] = [
  { id: 'week', label: 'Semana', title: 'los últimos 7 días' },
  { id: 'month', label: 'Mes', title: 'los últimos 30 días' },
  { id: 'year', label: 'Año', title: 'los últimos 12 meses' },
];

const DAYS: Record<'week' | 'month', number> = { week: 7, month: 30 };
const MONTHS = 12;

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

/** Ventas cobradas (entregadas y cobradas) en un gráfico de área, con selector de período (semana, mes o año). */
export const SalesAreaCard = () => {
  const gradientId = useId();
  const palette = useChartPalette();
  const [period, setPeriod] = useState<Period>('week');
  const daily = useDailySales();
  // Los 12 meses sólo se piden cuando se elige «Año»; semana y mes salen de la serie diaria.
  const yearly = useSalesEvolution(
    { granularity: 'month', from: monthStart(daily.today, MONTHS - 1), to: daily.today },
    { enabled: period === 'year' },
  );

  const points = useMemo((): SalesPoint[] => {
    if (period === 'year') return fillMonths(yearly.data ?? [], dayKey(new Date()), MONTHS);
    return splitWindows(daily.points, DAYS[period]).current;
  }, [period, daily.points, yearly.data]);
  // El total, los pedidos y el período anterior los calcula el back para el mismo rango que el gráfico.
  const summary = useSalesSummary(
    period === 'year'
      ? { from: monthStart(daily.today, MONTHS - 1), to: daily.today, compare: false }
      : dayRange(daily.today, DAYS[period]),
  );

  const active = period === 'year' ? yearly : daily;
  const total = summary.data?.current.totalSales ?? 0;
  const orders = summary.data?.current.totalOrders ?? 0;
  const previous = summary.data?.previous;
  const change = previous ? percentChange(total, previous.totalSales) : null;
  // Si el total no llegó, el gráfico se muestra igual; «sin ventas» se decide por los puntos del gráfico.
  const noSales = summary.data ? total === 0 : summary.isError ? points.every((p) => p.sales === 0) : false;
  const info = PERIODS.find((p) => p.id === period) ?? PERIODS[0];

  const selector = (
    <div role="group" aria-label="Período" className="flex gap-0.5 rounded-[9px] bg-bg p-[3px]">
      {PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={period === p.id}
          onClick={() => setPeriod(p.id)}
          className={cx(
            'rounded-[7px] px-2.5 py-1 text-xs font-medium transition-colors',
            period === p.id ? 'bg-surface text-ink shadow-control' : 'text-muted hover:text-ink',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  return (
    <TableroWidget
      title="Ventas"
      subtitle={`Pedidos entregados y cobrados en ${info.title}.`}
      action={selector}
      loading={active.isLoading}
      error={active.error}
      onRetry={() => void active.refetch()}
      empty={
        noSales
          ? { title: 'Sin ventas en este período', description: 'Cuando se entregue y cobre un pedido aparece acá.' }
          : null
      }
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <strong className="font-mono text-[22px] font-semibold tracking-[-0.03em] text-ink">
          {summary.data ? formatCurrency(total) : '—'}
        </strong>
        {summary.data && <span className="text-xs text-muted">{formatNumber(orders)} pedidos</span>}
        {summary.isError && (
          <span role="alert" className="text-xs text-danger">
            No se pudo calcular el total.{' '}
            <button type="button" className="font-semibold underline" onClick={() => void summary.refetch()}>
              Reintentar
            </button>
          </span>
        )}
        {change !== null && (
          <span
            className={cx(
              'rounded-full px-[7px] py-0.5 text-[11.5px] font-semibold',
              change >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
            )}
          >
            {change >= 0 ? '↑' : '↓'} {formatNumber(Math.abs(change))} % vs. período anterior
          </span>
        )}
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 240 }}>
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={palette.primary} stopOpacity={0.32} />
                <stop offset="1" stopColor={palette.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke={palette.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: palette.axisStrong }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              width={52}
              tick={{ fontSize: 10.5, fill: palette.axis, fontFamily: 'Geist Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => `$${compact.format(value)}`}
            />
            <Tooltip<number, string>
              cursor={{ stroke: palette.axis, strokeDasharray: '3 4' }}
              formatter={(value) => [formatCurrency(value), 'Ventas']}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: 10,
                border: `1px solid ${palette.tooltipBorder}`,
                backgroundColor: palette.tooltipBg,
                color: palette.ink,
                fontSize: 12,
                boxShadow: '0 8px 24px -8px rgba(16,24,40,.18)',
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke={palette.primary}
              strokeWidth={2.2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </TableroWidget>
  );
};
