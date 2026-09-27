import { DetailList, IdentityCell, Modal } from '../../../common/components/ui';
import type { Car } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';

interface Props {
  car: Car | null;
  onClose: () => void;
}

/** Todo lo que la API guarda de un vehículo (CarResponseDto). */
export const CarDetailModal = ({ car, onClose }: Props) => (
  <Modal
    open={Boolean(car)}
    onClose={onClose}
    size="md"
    title={car ? [car.car_brand, car.car_model].filter(Boolean).join(' ') || 'Vehículo' : 'Vehículo'}
    description={car?.car_patent ?? undefined}
  >
    {car && (
      <div className="space-y-5">
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
          items={[
            { label: 'Tipo', value: car.type_car ?? '—' },
            { label: 'Patente', value: car.car_patent ?? '—', mono: true },
            { label: 'Marca', value: car.car_brand ?? '—' },
            { label: 'Modelo', value: car.car_model ?? '—' },
            { label: 'Año', value: car.car_year ?? '—', mono: true },
            { label: 'Color', value: car.car_color ?? '—' },
            { label: 'Capacidad', value: car.car_capacity === null ? '—' : `${car.car_capacity} kg`, mono: true },
            { label: 'Alta', value: formatDateTime(car.createdAt) },
            { label: 'Última modificación', value: formatDateTime(car.updatedAt) },
          ]}
        />
      </div>
    )}
  </Modal>
);
