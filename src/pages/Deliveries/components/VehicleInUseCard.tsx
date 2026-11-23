import { useState } from 'react';
import { ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { Button, Card, EmptyState, LoadingState, CardHeader } from '../../../common/components/ui';
import { VehicleCard } from '../../../common/components/vehicle/VehicleCard';
import { usePermissions } from '../../../hooks';
import { useReleaseVehicle, useVehicleInUse } from '../../../services/queries/fleet';
import { formatDateTime } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { AssignVehicleModal } from './AssignVehicleModal';

interface Props {
  deliveryId: string;
  canWrite: boolean;
  writeHint?: string;
}

/** Qué vehículo de la flota usa este chofer ahora mismo (`GET /delivery/:id/vehicle`). */
export const VehicleInUseCard = ({ deliveryId, canWrite, writeHint }: Props) => {
  const { needsDistributor } = usePermissions();
  // Sin distribuidora elegida (super_admin sin "Ver como") no se dispara: la API la
  // rechaza con un 400 técnico ("Falta la distribuidora...") que no hay que mostrar.
  const { data: vehicle, isPending } = useVehicleInUse(deliveryId, !needsDistributor);
  const releaseVehicle = useReleaseVehicle();
  const [assigning, setAssigning] = useState(false);

  if (needsDistributor) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Elegí una distribuidora"
          description="Como administrador general, elegí una con «Ver como» para ver y gestionar su vehículo en uso."
        />
      </Card>
    );
  }

  const handleRelease = async () => {
    const confirmed = await confirm({
      title: '¿Liberar el vehículo?',
      text: 'El chofer queda sin vehículo en uso hasta que le asignes otro.',
      confirmText: 'Liberar',
      danger: true,
    });
    if (!confirmed) return;
    releaseVehicle.mutate(deliveryId, {
      onSuccess: () => notify.success('Vehículo liberado'),
      onError: notify.error,
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <CardHeader title="Vehículo en uso" className="" />
          <p className="text-sm text-muted">El vehículo de la flota que este chofer está usando ahora.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowRightLeft />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => setAssigning(true)}
          >
            {vehicle ? 'Cambiar' : 'Asignar'}
          </Button>
          {vehicle && (
            <Button
              variant="danger"
              size="sm"
              disabled={!canWrite}
              title={writeHint}
              loading={releaseVehicle.isPending}
              onClick={() => void handleRelease()}
            >
              Liberar
            </Button>
          )}
        </div>
      </div>

      {isPending ? (
        <LoadingState label="Cargando vehículo…" />
      ) : vehicle ? (
        <VehicleCard
          variant="row"
          carId={vehicle.carId}
          patent={vehicle.carPatent}
          description={[vehicle.carBrand, vehicle.carModel].filter(Boolean).join(' ') || null}
          typeCar={vehicle.carTypeCar}
          photoUrl={vehicle.photoUrl}
          status={vehicle.isLocked ? { text: 'Inhabilitado', tone: 'danger' } : undefined}
        >
          <p className="text-xs text-muted">Desde {formatDateTime(vehicle.assignedAt)}</p>
          {vehicle.note && <p className="mt-1 text-xs text-muted">Nota: {vehicle.note}</p>}
          {vehicle.isLocked && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
              <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              Inhabilitado por documentación vencida
            </div>
          )}
        </VehicleCard>
      ) : (
        <EmptyState
          title="Sin vehículo en uso"
          description="Asignale uno de la flota para que pueda empezar a operar."
        />
      )}

      <AssignVehicleModal
        open={assigning}
        onClose={() => setAssigning(false)}
        deliveryId={deliveryId}
        currentCarId={vehicle?.carId}
      />
    </Card>
  );
};
