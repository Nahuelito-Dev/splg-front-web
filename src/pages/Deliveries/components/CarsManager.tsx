import { useState } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Button, Card, EmptyState, IconButton, LoadingState, CardHeader } from '../../../common/components/ui';
import { VehicleCard } from '../../../common/components/vehicle/VehicleCard';
import { CarFormModal } from '../../Cars/components/CarFormModal';
import type { Car } from '../../../services/api/types';
import { useCarsByUser, useDeleteCar } from '../../../services/queries/cars';
import { confirm, notify } from '../../../utils/notifications';
import { usePermissions } from '../../../hooks';

type FormState = { open: false } | { open: true; car: Car | null };

export const CarsManager = ({ userId }: { userId: string }) => {
  const { canWrite, writeHint } = usePermissions();
  const { data: cars = [], isPending } = useCarsByUser(userId);
  const deleteCar = useDeleteCar();
  const [form, setForm] = useState<FormState>({ open: false });

  const handleDelete = async (car: Car) => {
    const confirmed = await confirm({
      title: '¿Dar de baja el vehículo?',
      text: `Baja lógica: ${car.car_brand ?? ''} ${car.car_model ?? ''} (${car.car_patent ?? 'sin patente'}) deja de usarse. No se borra.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteCar.mutate(car.car_id, {
      onSuccess: () => notify.success('Vehículo dado de baja'),
      onError: notify.error,
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <CardHeader title="Vehículos asignados" className="" />
          <p className="text-sm text-muted">La flota operativa de este chofer.</p>
        </div>
        <Button
          size="sm"
          icon={<AddCircleOutlineIcon />}
          onClick={() => setForm({ open: true, car: null })}
          blockedReason={canWrite ? undefined : writeHint}
        >
          Nuevo vehículo
        </Button>
      </div>

      {isPending ? (
        <LoadingState label="Cargando vehículos…" />
      ) : cars.length === 0 ? (
        <EmptyState title="Sin vehículos" description="Agregá uno para que este chofer pueda empezar a operar." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cars.map((car) => (
            <li key={car.car_id} className="min-w-0">
              <VehicleCard
                variant="row"
                carId={car.car_id}
                patent={car.car_patent}
                description={[car.car_brand, car.car_model].filter(Boolean).join(' ') || null}
                typeCar={car.type_car}
                photoUrl={car.photoUrl}
                actions={
                  <>
                    <IconButton
                      label="Editar vehículo"
                      icon={<EditOutlinedIcon />}
                      disabled={!canWrite}
                      title={writeHint}
                      onClick={() => setForm({ open: true, car })}
                    />
                    <IconButton
                      label="Dar de baja el vehículo"
                      tone="danger"
                      icon={<DeleteOutlineIcon />}
                      disabled={!canWrite}
                      title={writeHint}
                      onClick={() => void handleDelete(car)}
                    />
                  </>
                }
              >
                <p className="truncate text-xs text-muted">Color: {car.car_color ?? 'sin cargar'}</p>
              </VehicleCard>
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
