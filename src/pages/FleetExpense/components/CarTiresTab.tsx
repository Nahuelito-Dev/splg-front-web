import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, ErrorState, LoadingState } from '../../../common/components/ui';
import { useCarTires } from '../../../services/queries/fleetExpense';
import { formatNumber } from '../../../utils/format';
import { TIRE_STATUS, labelOf } from '../../../utils/statusLabels';

/** Pestaña «Neumáticos» de la ficha: los que tiene montados. Los movimientos se registran desde la lista de neumáticos. */
export const CarTiresTab = ({ carId }: { carId: string }) => {
  const { data, isPending, error, refetch } = useCarTires(carId, { page: 0, pageSize: 20 });
  return (
    <Card className="space-y-4 p-6">
      <Link className="text-sm font-medium text-primary hover:underline" to={`/fleet/tires?car=${carId}`}>
        Gestionar los neumáticos
      </Link>
      {isPending ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState error={error} resource="Los neumáticos" onRetry={() => void refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title="Sin neumáticos" description="Este vehículo no tiene neumáticos montados." />
      ) : (
        <ul className="divide-y divide-outline">
          {data.data.map((t) => (
            <li key={t.tireId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="font-medium text-ink">
                {t.position ?? '—'} · {t.serialNumber}
              </span>
              <span className="tabular-nums text-ink-2">
                {t.brand} {t.size} · {formatNumber(t.kmTraveled)} km
              </span>
              <Badge label={labelOf(TIRE_STATUS, t.status)} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
