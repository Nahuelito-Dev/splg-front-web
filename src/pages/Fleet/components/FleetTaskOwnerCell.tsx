import { IdentityCell } from '../../../common/components/ui';
import type { FleetTask } from '../../../services/api/types';
import { useEmployee } from '../../../services/queries/employees';
import type { useFleetOwners } from './useFleetOwners';

type Owners = Pick<ReturnType<typeof useFleetOwners>, 'carMap' | 'driverMap'>;

/** El legajo al que corresponde una tarea de documentación del personal (CU-183 a CU-185). */
const EmployeeOwner = ({ employeeId }: { employeeId: string }) => {
  const { data: employee } = useEmployee(employeeId);
  return (
    <IdentityCell
      title={employee ? `${employee.firstName} ${employee.lastName}` : 'Empleado'}
      subtitle={employee ? `Legajo ${employee.fileNumber}` : undefined}
    />
  );
};

/** El vehículo, el chofer o el empleado al que corresponde una tarea de flota. */
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
  if (task.employeeId) return <EmployeeOwner employeeId={task.employeeId} />;
  return <span className="text-muted">—</span>;
};
