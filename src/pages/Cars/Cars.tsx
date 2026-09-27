import { useState } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Button, Card, PageHeader } from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { Car } from '../../services/api/types';
import { useDeliveryOptions } from '../../services/queries/deliveries';
import { useCars, useDeleteCar } from '../../services/queries/cars';
import { confirm, notify } from '../../utils/notifications';
import { CarFormModal } from './components/CarFormModal';
import { CarDetailModal } from './components/CarDetailModal';
import { CarsTable } from './components/CarsTable';

type FormState = { open: false } | { open: true; car: Car | null };

export const Cars = () => {
  const [form, setForm] = useState<FormState>({ open: false });
  const [detail, setDetail] = useState<Car | null>(null);
  const { data: cars = [], isFetching } = useCars();
  const { data: driverPage } = useDeliveryOptions();
  const drivers = driverPage?.rows ?? [];
  const deleteCar = useDeleteCar();
  const { canWrite, writeHint } = usePermissions();

  const driverOptions = drivers.map((delivery) => ({
    value: delivery.user_id,
    label: delivery.user?.full_name
      ? `${delivery.user.full_name} (${delivery.user.email ?? 'sin email'})`
      : delivery.user_id,
  }));
  // La API pagina /delivery: si hay más choferes de los que entran acá, el
  // combo no los muestra a todos (no hay buscador en este select).
  const driverOptionsTruncated = (driverPage?.total ?? 0) > drivers.length;

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
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Vehículos"
        description="La flota de la distribuidora."
        actions={
          <Button
            icon={<AddCircleOutlineIcon />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => setForm({ open: true, car: null })}
          >
            Nuevo vehículo
          </Button>
        }
      />

      <Card>
        <CarsTable
          onView={setDetail}
          rows={cars}
          loading={isFetching}
          onEdit={canWrite ? (car) => setForm({ open: true, car }) : undefined}
          onDelete={canWrite ? (car) => void handleDelete(car) : undefined}
        />
      </Card>

      <CarDetailModal car={detail} onClose={() => setDetail(null)} />
      <CarFormModal
        open={form.open}
        onClose={() => setForm({ open: false })}
        car={form.open ? form.car : null}
        driverOptions={driverOptions}
        driverOptionsHint={
          driverOptionsTruncated
            ? `Se muestran ${drivers.length} de ${driverPage?.total ?? 0} choferes. Si no aparece el que buscás, editá el vehículo desde la ficha de ese chofer.`
            : undefined
        }
      />
    </div>
  );
};
