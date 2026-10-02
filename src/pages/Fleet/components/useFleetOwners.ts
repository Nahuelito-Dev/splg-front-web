import { useMemo } from 'react';
import { useCars } from '../../../services/queries/cars';
import { useActiveDeliveries } from '../../../services/queries/orders';

/** Vehículos y choferes por id, para mostrar a quién corresponde una tarea de flota. */
export const useFleetOwners = () => {
  const { data: cars } = useCars();
  const { data: drivers } = useActiveDeliveries();
  const carMap = useMemo(() => new Map((cars ?? []).map((car) => [car.car_id, car])), [cars]);
  const driverMap = useMemo(
    () => new Map((drivers?.rows ?? []).map((driver) => [driver.delivery_id, driver])),
    [drivers],
  );
  return { cars, drivers, carMap, driverMap };
};
