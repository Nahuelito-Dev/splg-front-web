import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import type { Tire } from '../../../services/api/types';
import { useRegisterTireEvent } from '../../../services/queries/fleetExpense';
import { notify } from '../../../utils/notifications';
import { TIRE_EVENT_OPTIONS, tireEventSchema, tireEventsFor, type TireEventFormValues } from '../fleetExpenseSchemas';
import { useCarOptions } from './useCarOptions';

interface Props {
  tire: Tire | null;
  onClose: () => void;
}

/** Registrar un movimiento de un neumático (CU-206): montaje, desmontaje, rotación, recapado o baja. */
export const TireEventModal = ({ tire, onClose }: Props) => {
  const register_ = useRegisterTireEvent();
  const { options: carOptions } = useCarOptions('Elegí un vehículo');
  const allowed = useMemo(() => (tire ? tireEventsFor(tire.status) : []), [tire]);
  const typeOptions = TIRE_EVENT_OPTIONS.filter((o) => (allowed as readonly string[]).includes(o.value));
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TireEventFormValues>({ resolver: zodResolver(tireEventSchema) });

  useEffect(() => {
    if (!tire) return;
    reset({
      type: (tireEventsFor(tire.status)[0] ?? 'mount') as TireEventFormValues['type'],
      odometerKm: 0,
      carId: '',
      position: '',
    });
  }, [tire, reset]);

  const type = watch('type');
  const onSubmit = handleSubmit((values) =>
    register_.mutate(
      {
        id: tire?.tireId ?? '',
        body: {
          type: values.type,
          odometerKm: values.odometerKm,
          ...(values.type === 'mount' ? { carId: values.carId } : {}),
          ...(values.type === 'mount' || values.type === 'rotate' ? { position: values.position.toUpperCase() } : {}),
        },
      },
      {
        onSuccess: () => {
          notify.success('Movimiento registrado');
          onClose();
        },
        onError: notify.error,
      },
    ),
  );

  return (
    <Modal
      open={tire !== null}
      onClose={onClose}
      closeBlocked={register_.isPending}
      title="Registrar un movimiento"
      description={tire ? `${tire.serialNumber} · ${tire.brand} ${tire.size}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={register_.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="tire-event-form" loading={register_.isPending}>
            Registrar
          </Button>
        </>
      }
    >
      <form id="tire-event-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4" noValidate>
        <Select label="Movimiento" required options={typeOptions} error={errors.type?.message} {...register('type')} />
        {type === 'retire' && (
          <p className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
            La baja es definitiva: el neumático no se puede volver a montar.
          </p>
        )}
        {type === 'mount' && (
          <Select label="Vehículo" required options={carOptions} error={errors.carId?.message} {...register('carId')} />
        )}
        {(type === 'mount' || type === 'rotate') && (
          <Input
            label="Posición"
            required
            maxLength={6}
            placeholder="DI"
            hint="Código corto: DI = delantero izquierdo, TD = trasero derecho…"
            error={errors.position?.message}
            {...register('position')}
          />
        )}
        <Input
          label="Kilometraje del vehículo"
          type="number"
          step={1}
          min={0}
          required
          error={errors.odometerKm?.message}
          {...register('odometerKm')}
        />
      </form>
    </Modal>
  );
};
