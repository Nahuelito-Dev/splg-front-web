import { useState } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import { Button, Card, EmptyState, IconButton, LoadingState } from '../../../common/components/ui';
import { CarFormModal } from '../../Cars/components/CarFormModal';
import type { Car } from '../../../services/api/types';
import { useCarsByUser, useDeleteCar } from '../../../services/queries/cars';
import { confirm, notify } from '../../../utils/notifications';

const carIcon = (type: string | null) => {
  const t = type?.toLowerCase() ?? '';
  if (t.includes('moto')) return <TwoWheelerIcon />;
  if (t.includes('cami')) return <LocalShippingIcon />;
  return <DirectionsCarIcon />;
};

type FormState = { open: false } | { open: true; car: Car | null };

export const CarsManager = ({ userId }: { userId: string }) => {
  const { data: cars = [], isPending } = useCarsByUser(userId);
  const deleteCar = useDeleteCar();
  const [form, setForm] = useState<FormState>({ open: false });

  const handleDelete = async (car: Car) => {
    const confirmed = await confirm({
      title: '¿Eliminar el vehículo?',
      text: `Se elimina ${car.car_brand ?? ''} ${car.car_model ?? ''} (${car.car_patent ?? 'sin patente'}).`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;
    deleteCar.mutate(car.car_id, {
      onSuccess: () => notify.success('Vehículo eliminado'),
      onError: notify.error,
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Vehículos asignados</h2>
          <p className="text-sm text-muted">La flota operativa de este chofer.</p>
        </div>
        <Button size="sm" icon={<AddCircleOutlineIcon />} onClick={() => setForm({ open: true, car: null })}>
          Nuevo vehículo
        </Button>
      </div>

      {isPending ? (
        <LoadingState label="Cargando vehículos…" />
      ) : cars.length === 0 ? (
        <EmptyState title="Sin vehículos" description="Agregá uno para que este chofer pueda empezar a operar." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cars.map((car) => (
            <li
              key={car.car_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-outline p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong [&_svg]:h-5 [&_svg]:w-5"
                >
                  {carIcon(car.type_car)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {car.car_brand} {car.car_model}
                  </p>
                  <p className="truncate text-xs text-muted">
                    <span className="font-semibold uppercase tracking-wide">{car.car_patent}</span> ·{' '}
                    {car.type_car ?? 'Sin tipo'} · {car.car_color ?? 'sin color'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton
                  label="Editar vehículo"
                  icon={<EditOutlinedIcon />}
                  onClick={() => setForm({ open: true, car })}
                />
                <IconButton
                  label="Eliminar vehículo"
                  tone="danger"
                  icon={<DeleteOutlineIcon />}
                  onClick={() => void handleDelete(car)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <CarFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        car={form.open ? form.car : null}
        fixedUserId={userId}
      />
    </Card>
  );
};
