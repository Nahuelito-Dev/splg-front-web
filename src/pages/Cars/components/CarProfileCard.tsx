import { Card, DetailList, IdentityCell } from '../../../common/components/ui';
import type { Car } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { carIcon } from './carIcon';

/** Todo lo que la API guarda de un vehículo (CarResponseDto). */
export const CarProfileCard = ({ car }: { car: Car }) => (
  <Card className="p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong [&_svg]:h-6 [&_svg]:w-6"
        >
          {(() => {
            const Icon = carIcon(car.type_car);
            return <Icon strokeWidth={1.8} />;
          })()}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-ink">
            {[car.car_brand, car.car_model].filter(Boolean).join(' ') || 'Vehículo'}
          </h2>
          <p className="font-mono text-sm uppercase tracking-wide text-muted">{car.car_patent ?? 'Sin patente'}</p>
        </div>
      </div>
    </div>

    <div className="mt-5 rounded-xl border border-outline p-3">
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
