import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select, type SelectOption } from '../../../common/components/ui';
import type { Car } from '../../../services/api/types';
import { useCreateCar, useUpdateCar } from '../../../services/queries/cars';
import { notify } from '../../../utils/notifications';
import { CAR_TYPE_OPTIONS, FUEL_TYPE_OPTIONS, carSchema, type CarFormValues } from '../carSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con auto es edición de ese vehículo; sin auto, alta. */
  car: Car | null;
  /** Se abre desde la ficha de un chofer: el vehículo queda fijo a ese chofer. */
  fixedUserId?: string;
  /** Se abre desde la flota global: hay que elegir a qué chofer se asigna. */
  driverOptions?: SelectOption[];
  /** Aviso si `driverOptions` no trae a todos los choferes de la distribuidora. */
  driverOptionsHint?: string;
}

export const CarFormModal = ({ open, onClose, car, fixedUserId, driverOptions, driverOptionsHint }: Props) => {
  const createCar = useCreateCar();
  const updateCar = useUpdateCar();
  const isEditing = Boolean(car);
  const saving = createCar.isPending || updateCar.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CarFormValues>({ resolver: zodResolver(carSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      user_id: car?.user_id ?? fixedUserId ?? '',
      type_car: car?.type_car ?? 'Moto',
      car_patent: car?.car_patent ?? '',
      car_brand: car?.car_brand ?? '',
      car_model: car?.car_model ?? '',
      car_color: car?.car_color ?? '',
      car_year: car?.car_year ?? undefined,
      car_capacity: car?.car_capacity ?? undefined,
      fuel_type: car?.fuel_type ?? '',
      tank_capacity_liters: car?.tank_capacity_liters ?? undefined,
    });
  }, [open, car, fixedUserId, reset]);

  const onSubmit = handleSubmit((values) => {
    const { fuel_type: fuelType, tank_capacity_liters: tank, ...rest } = values;
    const body = {
      ...rest,
      user_id: fixedUserId ?? values.user_id,
      // Vacío limpia el dato guardado (la API acepta `null`).
      fuel_type: fuelType || null,
      tank_capacity_liters: tank ?? null,
    };
    const options = {
      onSuccess: () => {
        notify.success(isEditing ? 'Vehículo actualizado' : 'Vehículo agregado');
        onClose();
      },
      onError: notify.error,
    };
    if (car) updateCar.mutate({ id: car.car_id, changes: body }, options);
    else createCar.mutate(body, options);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar vehículo' : 'Nuevo vehículo'}
      description={isEditing ? (car?.car_patent ?? undefined) : 'Se agrega a la flota de la distribuidora.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="car-form" loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Agregar vehículo'}
          </Button>
        </>
      }
    >
      <form id="car-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        {driverOptions && (
          <div className="sm:col-span-2">
            <Select
              label="Chofer asignado"
              required
              hint={driverOptionsHint}
              options={driverOptions}
              error={errors.user_id?.message}
              {...register('user_id')}
            />
          </div>
        )}
        <Input
          label="Marca"
          required
          placeholder="Honda"
          error={errors.car_brand?.message}
          {...register('car_brand')}
        />
        <Input
          label="Modelo"
          required
          placeholder="Titan 150"
          error={errors.car_model?.message}
          {...register('car_model')}
        />
        <Input
          label="Patente"
          required
          placeholder="AA123BB"
          error={errors.car_patent?.message}
          {...register('car_patent')}
        />
        <Select
          label="Tipo de vehículo"
          required
          options={CAR_TYPE_OPTIONS}
          error={errors.type_car?.message}
          {...register('type_car')}
        />
        <Input label="Año" type="number" error={errors.car_year?.message} {...register('car_year')} />
        <Input label="Color" placeholder="Rojo" error={errors.car_color?.message} {...register('car_color')} />
        <Input
          label="Capacidad de carga (kg)"
          type="number"
          error={errors.car_capacity?.message}
          {...register('car_capacity')}
        />
        <Select
          label="Combustible"
          options={FUEL_TYPE_OPTIONS}
          hint="El de las cargas que no indican otro."
          error={errors.fuel_type?.message}
          {...register('fuel_type')}
        />
        <Input
          label="Capacidad del tanque (L)"
          type="number"
          step="0.01"
          hint="Una carga no puede superarla en más de 5 %."
          error={errors.tank_capacity_liters?.message}
          {...register('tank_capacity_liters')}
        />
      </form>
    </Modal>
  );
};
