import { Truck } from 'lucide-react';
import { EmptyState, ErrorState, PersonAvatar, Skeleton } from '../../../common/components/ui';
import { VehicleCard } from '../../../common/components/vehicle/VehicleCard';
import { VehicleLoadBar } from '../../../common/components/vehicle/VehicleLoadBar';
import { VehicleStopsLine } from '../../../common/components/vehicle/VehicleStopsLine';
import { LIVE_VEHICLE_STATUS, remainingText } from '../../../common/components/vehicle/vehicleLabels';
import type { LiveVehicle } from '../../../services/api/types';

interface Props {
  vehicles: LiveVehicle[];
  selectedCarId: string | null;
  onSelect: (carId: string) => void;
  now: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  /** Administrador general sin «Ver como»: la API no tiene de qué distribuidora mostrar. */
  needsDistributor: boolean;
}

/** Cuántas paradas entran en la tarjeta antes de resumir el resto. */
const CARD_STOPS = 3;

const CardSkeleton = () => (
  <div className="space-y-3 rounded-card border border-outline p-4">
    <Skeleton className="h-5 w-1/2" />
    <Skeleton className="aspect-[16/9] w-full" />
    <Skeleton className="h-3 w-3/4" />
  </div>
);

/** Las tarjetas de los vehículos en uso: patente, estado, foto, chofer, tiempo restante, carga y mini línea de paradas. */
export const VehicleList = ({
  vehicles,
  selectedCarId,
  onSelect,
  now,
  isLoading,
  isError,
  error,
  onRetry,
  needsDistributor,
}: Props) => {
  if (needsDistributor) {
    return (
      <EmptyState
        title="Elegí una distribuidora"
        description="Como administrador general, elegí una con «Ver como» para seguir sus vehículos."
      />
    );
  }
  if (isLoading) {
    return (
      <div role="status" aria-label="Cargando vehículos" className="space-y-3 p-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (isError) return <ErrorState error={error} resource="El seguimiento" onRetry={onRetry} />;
  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No hay vehículos en uso"
        description="Cuando un chofer ponga en uso un vehículo de la flota, va a aparecer acá y en el mapa."
      />
    );
  }
  return (
    <ul aria-label="Vehículos en uso" className="space-y-3 p-3">
      {vehicles.map((vehicle) => {
        const remaining = remainingText(vehicle.sheet?.estimatedEndAt, now);
        const driverName = vehicle.driver.name ?? 'Chofer';
        return (
          <li key={vehicle.carId}>
            <VehicleCard
              carId={vehicle.carId}
              patent={vehicle.patent}
              description={vehicle.description}
              typeCar={vehicle.typeCar}
              photoUrl={vehicle.photoUrl}
              status={LIVE_VEHICLE_STATUS[vehicle.status]}
              selected={vehicle.carId === selectedCarId}
              onSelect={() => onSelect(vehicle.carId)}
              selectLabel="Ver el detalle de"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                    <PersonAvatar name={driverName} userId={vehicle.driver.userId} size="xs" decorative />
                    <span className="truncate">{driverName}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink">
                    {remaining ?? (vehicle.location ? 'Con posición' : 'Sin posición')}
                  </span>
                </div>
                <VehicleLoadBar load={vehicle.load} />
                <VehicleStopsLine stops={vehicle.stops} max={CARD_STOPS} />
              </div>
            </VehicleCard>
          </li>
        );
      })}
    </ul>
  );
};
