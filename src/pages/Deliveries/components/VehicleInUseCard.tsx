import { useState } from 'react';
import { ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { Button, Card, EmptyState, LoadingState } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { carIcon } from '../../Cars/components/carIcon';
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

  const Icon = carIcon(vehicle?.carTypeCar ?? null);

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Vehículo en uso</h2>
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
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-outline p-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong [&_svg]:h-5 [&_svg]:w-5"
            >
              <Icon strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {[vehicle.carBrand, vehicle.carModel].filter(Boolean).join(' ') || 'Vehículo'}
              </p>
              <p className="font-mono text-xs uppercase tracking-wide text-muted">
                {vehicle.carPatent ?? 'Sin patente'} · {vehicle.carTypeCar ?? 'Sin tipo'}
              </p>
              <p className="mt-0.5 text-xs text-muted">Desde {formatDateTime(vehicle.assignedAt)}</p>
              {vehicle.note && <p className="mt-1 text-xs text-muted">Nota: {vehicle.note}</p>}
            </div>
          </div>
          {vehicle.isLocked && (
            <div className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
              <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              Inhabilitado por documentación vencida
            </div>
          )}
        </div>
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
