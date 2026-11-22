import { Pencil, Trash2 } from 'lucide-react';
import { EmptyState, IconButton, PersonAvatar, Skeleton } from '../../../common/components/ui';
import { VehicleCard } from '../../../common/components/vehicle/VehicleCard';
import type { Car } from '../../../services/api/types';
import { CAR_FLEET_STATUS, labelOf } from '../../../utils/statusLabels';

interface Props {
  rows: Car[];
  loading: boolean;
  onView: (car: Car) => void;
  /** Sin él no se muestra el botón (p. ej. superadmin sin distribuidora elegida). */
  onEdit?: (car: Car) => void;
  onDelete?: (car: Car) => void;
  /** Hay una patente buscada: el vacío es «sin coincidencias», no «no hay vehículos». */
  searching?: boolean;
  /** La búsqueda por patente falló: no se sabe si existe, no es «sin resultados». */
  searchFailed?: boolean;
}

const GRID = 'grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3';

/** La flota en tarjetas: foto grande, patente, estado en la flota y chofer habitual. Tocar una abre su ficha. */
export const CarsGrid = ({
  rows,
  loading,
  onView,
  onEdit,
  onDelete,
  searching = false,
  searchFailed = false,
}: Props) => {
  if (loading && rows.length === 0) {
    return (
      <div role="status" aria-label="Cargando vehículos" className={GRID}>
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-64 w-full" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return searchFailed ? (
      <EmptyState title="No se pudo buscar" description="Probá de nuevo en unos segundos." />
    ) : searching ? (
      <EmptyState illustration="search" title="Sin resultados" description="No hay un vehículo con esa patente." />
    ) : (
      <EmptyState title="No hay vehículos" description="Agregá uno para que un chofer pueda empezar a operar." />
    );
  }
  return (
    <ul aria-label="Vehículos" className={GRID}>
      {rows.map((car) => {
        const patent = car.car_patent ?? 'sin patente';
        return (
          <li key={car.car_id} className="min-w-0">
            <VehicleCard
              carId={car.car_id}
              patent={car.car_patent}
              description={[car.car_brand, car.car_model].filter(Boolean).join(' ') || null}
              typeCar={car.type_car}
              photoUrl={car.photoUrl}
              status={labelOf(CAR_FLEET_STATUS, car.fleet_status)}
              onSelect={() => onView(car)}
              selectLabel="Abrir la ficha de"
              actions={
                (onEdit || onDelete) && (
                  <>
                    {onEdit && <IconButton label={`Editar ${patent}`} icon={<Pencil />} onClick={() => onEdit(car)} />}
                    {onDelete && (
                      <IconButton
                        label={`Dar de baja ${patent}`}
                        tone="danger"
                        icon={<Trash2 />}
                        onClick={() => onDelete(car)}
                      />
                    )}
                  </>
                )
              }
            >
              {car.user ? (
                <span className="flex min-w-0 items-center gap-2 text-xs text-ink-2">
                  <PersonAvatar name={car.user.full_name ?? 'Chofer'} userId={car.user.user_id} size="xs" decorative />
                  <span className="truncate">{car.user.full_name ?? 'Sin nombre'}</span>
                </span>
              ) : (
                <span className="text-xs text-muted">Sin chofer asignado</span>
              )}
            </VehicleCard>
          </li>
        );
      })}
    </ul>
  );
};
