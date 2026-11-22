import { Link } from 'react-router-dom';
import { DetailList, DetailSkeleton, ErrorState } from '../../common/components/ui';
import { useCar } from '../../services/queries/cars';
import { formatNumber } from '../../utils/format';
import { CAR_FLEET_STATUS, FUEL_TYPE, labelOf } from '../../utils/statusLabels';

/** Pestaña «Vehículo»: lo que la flota guarda del vehículo (`GET /car/:id`), con el enlace a su ficha. */
export const VehicleInfoTab = ({ carId }: { carId: string }) => {
  const { data: car, isPending, error, refetch } = useCar(carId);
  if (isPending) return <DetailSkeleton />;
  if (error || !car) return <ErrorState error={error} resource="El vehículo" onRetry={() => void refetch()} />;
  return (
    <div className="space-y-4">
      <DetailList
        items={[
          { label: 'Marca y modelo', value: [car.car_brand, car.car_model].filter(Boolean).join(' ') || '—' },
          { label: 'Tipo', value: car.type_car ?? '—' },
          { label: 'Año', value: car.car_year ?? '—' },
          { label: 'Color', value: car.car_color ?? '—' },
          { label: 'Capacidad', value: car.car_capacity === null ? '—' : `${formatNumber(car.car_capacity)} kg` },
          { label: 'Estado en la flota', value: labelOf(CAR_FLEET_STATUS, car.fleet_status).text },
          { label: 'Kilometraje', value: car.odometer_km === null ? '—' : `${formatNumber(car.odometer_km)} km` },
          { label: 'Combustible', value: car.fuel_type ? labelOf(FUEL_TYPE, car.fuel_type).text : '—' },
          { label: 'Chofer habitual', value: car.user?.full_name ?? '—' },
        ]}
      />
      <Link
        to={`/cars/details/${car.car_id}`}
        className="text-xs font-medium text-primary-strong underline-offset-2 hover:underline"
      >
        Abrir la ficha del vehículo
      </Link>
    </div>
  );
};
