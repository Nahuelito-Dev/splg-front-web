import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { TableroWidget } from '../../../common/components/ui';
import { useOrderStatusCounts } from '../../../services/queries/orders';
import { ORDER_FLOW, ORDER_STATUS } from '../../../utils/statusLabels';
import { formatNumber } from '../../../utils/format';
import { useChartPalette } from '../../../theme/useChartPalette';
import { useStatusColors } from '../lib/useStatusColors';

/** Pedidos por estado en una dona: el total va al centro y la leyenda abajo. */
export const StatusDonutCard = () => {
  const { counts, total, isError } = useOrderStatusCounts();
  const colors = useStatusColors();
  const palette = useChartPalette();
  const rows = ORDER_FLOW.map((status) => ({
    status,
    name: ORDER_STATUS[status].text,
    value: counts[status] ?? 0,
    color: colors[status],
  }));

  return (
    <TableroWidget
      title="Pedidos por estado"
      subtitle="Todos los pedidos de la distribuidora."
      loading={total === null && !isError}
      error={isError ? new Error('No se pudieron contar los pedidos por estado.') : undefined}
      empty={total === 0 ? { title: 'Todavía no hay pedidos' } : null}
    >
      <div className="relative mx-auto h-44 w-44">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 176, height: 176 }}>
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              cornerRadius={4}
            >
              {rows.map((row) => (
                <Cell key={row.status} fill={row.color} />
              ))}
            </Pie>
            <Tooltip<number, string>
              formatter={(value, name) => [formatNumber(value), name]}
              contentStyle={{
                borderRadius: 10,
                border: `1px solid ${palette.tooltipBorder}`,
                backgroundColor: palette.tooltipBg,
                color: palette.ink,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <strong className="tabular-nums text-2xl font-semibold leading-none text-ink">
            {formatNumber(total ?? 0)}
          </strong>
          <span className="mt-1 text-[11.5px] text-muted">pedidos</span>
        </div>
      </div>
      <ul aria-label="Pedidos por estado" className="mt-4 grid gap-2 text-[12.5px]">
        {rows.map((row) => (
          <li key={row.status} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-ink-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <span className="truncate">{row.name}</span>
            </span>
            <span className="tabular-nums font-semibold text-ink">
              {formatNumber(row.value)}
              {total ? (
                <span className="ml-1.5 font-normal text-muted">{Math.round((row.value / total) * 100)} %</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </TableroWidget>
  );
};
