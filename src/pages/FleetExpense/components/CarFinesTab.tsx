import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '../../../common/components/ui';
import { useTrafficFines } from '../../../services/queries/fleetExpense';
import { formatCurrency, formatDay } from '../../../utils/format';
import { TRAFFIC_FINE_STATUS, labelOf } from '../../../utils/statusLabels';
import { TrafficFineFormModal } from './TrafficFineFormModal';

interface Props {
  carId: string;
  canWrite: boolean;
  writeHint?: string;
}

/** Pestaña «Multas» de la ficha: las últimas; pagar, imputar y anular se hace desde la lista de multas. */
export const CarFinesTab = ({ carId, canWrite, writeHint }: Props) => {
  const [creating, setCreating] = useState(false);
  const { data, isPending, error, refetch } = useTrafficFines({ page: 0, pageSize: 10 }, { carId });
  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link className="text-sm font-medium text-primary hover:underline" to={`/fleet/fines?car=${carId}`}>
          Gestionar las multas de este vehículo
        </Link>
        <Button icon={<Plus />} size="sm" disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
          Cargar multa
        </Button>
      </div>
      {isPending ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState error={error} resource="Las multas" onRetry={() => void refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title="Sin multas" description="Este vehículo no tiene multas registradas." />
      ) : (
        <ul className="divide-y divide-outline">
          {data.data.map((fine) => (
            <li key={fine.fineId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="font-medium text-ink">
                Acta {fine.actNumber} · {fine.jurisdiction}
              </span>
              <span className="font-mono text-ink-2">
                {formatCurrency(fine.amount)} · vence {formatDay(fine.dueDate)}
              </span>
              <Badge label={labelOf(TRAFFIC_FINE_STATUS, fine.status)} />
            </li>
          ))}
        </ul>
      )}
      <TrafficFineFormModal open={creating} onClose={() => setCreating(false)} fine={null} fixedCarId={carId} />
    </Card>
  );
};
