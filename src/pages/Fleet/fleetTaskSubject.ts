import type { FleetTask } from '../../services/api/types';

/** A qué cuelga una tarea de flota: un vehículo, un chofer (su licencia) o un empleado (su documentación). */
export const taskSubject = (
  task: Pick<FleetTask, 'carId' | 'employeeId'> | null,
): 'vehicle' | 'driver' | 'employee' => {
  if (task?.carId) return 'vehicle';
  if (task?.employeeId) return 'employee';
  return 'driver';
};
