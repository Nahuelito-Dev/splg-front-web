import { Star } from 'lucide-react';
import { Avatar, TableroWidget } from '../../../common/components/ui';
import { useRatingSummaries } from '../../../services/queries/ratings';
import { useSalesByDriver } from '../../../services/queries/reports';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { rankDrivers, ratingText } from '../lib/ranking';
import { dayKey, dayRange } from '../lib/series';

const WINDOW_DAYS = 30;

/** Ranking de choferes por ventas de los últimos 30 días (GET /reports/sales-by-driver). */
export const TopDriversCard = () => {
  const range = dayRange(dayKey(new Date()), WINDOW_DAYS);
  const sales = useSalesByDriver(range);
  const ranking = rankDrivers(sales.data ?? []);
  const ratings = useRatingSummaries(ranking.map((driver) => driver.id));

  return (
    <TableroWidget
      title="Mejores choferes"
      subtitle="Entregas y ventas de los últimos 30 días."
      loading={sales.isLoading}
      error={sales.error}
      onRetry={() => void sales.refetch()}
      empty={
        ranking.length === 0
          ? { title: 'Sin entregas en el período', description: 'El ranking aparece con la primera entrega.' }
          : null
      }
      footer={{ label: 'Ver todos los choferes', to: '/deliveries' }}
    >
      <ol className="grid gap-3.5">
        {ranking.map((driver, index) => {
          const rating = ratingText(ratings[index]?.data);
          return (
            <li key={driver.id} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3">
              <span className="w-4 text-center font-mono text-xs font-semibold text-muted">{index + 1}</span>
              <Avatar name={driver.name} />
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-semibold text-ink">{driver.name}</b>
                <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  {formatNumber(driver.orders)} entregas
                  {rating !== null ? (
                    <span className="inline-flex items-center gap-0.5 font-medium text-warn">
                      <Star aria-hidden="true" className="h-3 w-3 fill-current" />
                      <span className="sr-only">Calificación </span>
                      {rating}
                    </span>
                  ) : (
                    ratings[index]?.isSuccess && <span>· Sin calificaciones</span>
                  )}
                </span>
              </span>
              <b className="font-mono text-[13px] text-ink">{formatCurrency(driver.sales)}</b>
            </li>
          );
        })}
      </ol>
    </TableroWidget>
  );
};
