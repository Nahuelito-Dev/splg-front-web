import { IdentityCell } from '../../../common/components/ui';
import type { FleetTask } from '../../../services/api/types';
import type { useFleetOwners } from './useFleetOwners';

type Owners = Pick<ReturnType<typeof useFleetOwners>, 'carMap' | 'driverMap'>;

/** El vehículo o el chofer al que corresponde una tarea de flota. */
export const FleetTaskOwnerCell = ({ task, carMap, driverMap }: { task: FleetTask } & Owners) => {
  const car = task.carId ? carMap.get(task.carId) : undefined;
  const driver = task.deliveryId ? driverMap.get(task.deliveryId) : undefined;
  if (car) {
    return (
      <IdentityCell
        title={[car.car_brand, car.car_model].filter(Boolean).join(' ') || 'Vehículo'}
        subtitle={car.car_patent ?? undefined}
        monoSubtitle
      />
    );
  }
  if (driver) return <IdentityCell title={driver.user?.full_name ?? 'Chofer'} />;
  return <span className="text-muted">—</span>;
};
