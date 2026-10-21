import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
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
  const methods = useForm<TireEventFormValues>({ resolver: zodResolver(tireEventSchema) });
  const { reset, watch } = methods;

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
  const onSubmit = (values: TireEventFormValues) =>
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
      <Form methods={methods} id="tire-event-form" onSubmit={onSubmit} className="grid gap-4">
        <FormSelect name="type" label="Movimiento" required options={typeOptions} />
        {type === 'retire' && (
          <p className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
            La baja es definitiva: el neumático no se puede volver a montar.
          </p>
        )}
        {type === 'mount' && <FormSelect name="carId" label="Vehículo" required options={carOptions} />}
        {(type === 'mount' || type === 'rotate') && (
          <FormInput
            name="position"
            label="Posición"
            required
            maxLength={6}
            placeholder="DI"
            hint="Código corto: DI = delantero izquierdo, TD = trasero derecho…"
          />
        )}
        <FormInput name="odometerKm" label="Kilometraje del vehículo" type="number" step={1} min={0} required />
      </Form>
    </Modal>
  );
};
