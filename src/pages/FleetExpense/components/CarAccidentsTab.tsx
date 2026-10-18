import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '../../../common/components/ui';
import { useVehicleAccidents } from '../../../services/queries/fleetExpense';
import { formatDateTime } from '../../../utils/format';
import { ACCIDENT_STATUS, labelOf } from '../../../utils/statusLabels';
import { VehicleAccidentFormModal } from './VehicleAccidentFormModal';

interface Props {
  carId: string;
  canWrite: boolean;
  writeHint?: string;
}

/** Pestaña «Siniestros» de la ficha: los últimos; cerrarlos se hace desde la lista de siniestros. */
export const CarAccidentsTab = ({ carId, canWrite, writeHint }: Props) => {
  const [creating, setCreating] = useState(false);
  const { data, isPending, error, refetch } = useVehicleAccidents({ page: 0, pageSize: 10 }, { carId });
  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link className="text-sm font-medium text-primary hover:underline" to={`/fleet/accidents?car=${carId}`}>
          Gestionar los siniestros de este vehículo
        </Link>
        <Button icon={<Plus />} size="sm" disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
          Registrar siniestro
        </Button>
      </div>
      {isPending ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState error={error} resource="Los siniestros" onRetry={() => void refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title="Sin siniestros" description="Este vehículo no tiene siniestros registrados." />
      ) : (
        <ul className="divide-y divide-outline">
          {data.data.map((a) => (
            <li key={a.accidentId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="font-medium text-ink">{a.description}</span>
              <span className="text-muted">{formatDateTime(a.occurredAt)}</span>
              <Badge label={labelOf(ACCIDENT_STATUS, a.status)} />
            </li>
          ))}
        </ul>
      )}
      <VehicleAccidentFormModal open={creating} onClose={() => setCreating(false)} accident={null} fixedCarId={carId} />
    </Card>
  );
};
