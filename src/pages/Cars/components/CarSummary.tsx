import { Card, DetailList, IdentityCell } from '../../../common/components/ui';
import type { Car } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';

/** Pestaña "Resumen": todo lo que la API guarda de un vehículo (CarResponseDto). */
export const CarSummary = ({ car }: { car: Car }) => (
  <Card className="p-6">
    <div className="rounded-xl border border-outline p-3">
      <p className="mb-2 text-xs font-medium text-muted">Asignado a</p>
      {car.user ? (
        <IdentityCell
          title={car.user.full_name ?? 'Sin nombre'}
          subtitle={car.user.email ?? undefined}
          avatarName={car.user.full_name ?? '?'}
        />
      ) : (
        <p className="text-sm text-muted">Sin chofer asignado</p>
      )}
    </div>

    <DetailList
      className="mt-5 border-t border-outline pt-5"
      items={[
        { label: 'Tipo', value: car.type_car ?? '—' },
        { label: 'Año', value: car.car_year ?? '—', mono: true },
        { label: 'Color', value: car.car_color ?? '—' },
        { label: 'Capacidad', value: car.car_capacity === null ? '—' : `${car.car_capacity} kg`, mono: true },
        { label: 'Alta', value: formatDateTime(car.createdAt) },
        { label: 'Última modificación', value: formatDateTime(car.updatedAt) },
      ]}
    />
  </Card>
);
