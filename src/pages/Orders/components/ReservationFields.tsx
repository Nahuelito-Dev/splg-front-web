import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Card, Checkbox, Input, Select } from '../../../common/components/ui';
import { useTimeSlotAvailability } from '../../../services/queries/timeSlots';
import { argentinaDay } from '../../../utils/format';
import type { NewOrderValues } from './newOrderSchema';

interface Props {
  register: UseFormRegister<NewOrderValues>;
  errors: FieldErrors<NewOrderValues>;
  isReservation: boolean;
  scheduledDate: string;
  paymentMethod: NewOrderValues['paymentMethod'];
  /** El tope de la seña contra el total cotizado (lo calcula la página). */
  depositCapError?: string | null;
}

const DEPOSIT_HINT: Record<NewOrderValues['paymentMethod'], string> = {
  cash: 'Efectivo: queda pendiente hasta que la confirmes en Reservas.',
  transfer: 'Transferencia: la confirmás en Reservas cuando llegue.',
  mercadopago:
    'MercadoPago: al crear la reserva se genera el enlace de pago de la seña; se muestra y queda en la reserva. La seña se confirma sola.',
  account: 'Una reserva no se puede pagar con cuenta corriente.',
};

/** Reserva programada con seña (CU-072): fecha, franja con cupo y monto de la seña. */
export const ReservationFields = ({
  register,
  errors,
  isReservation,
  scheduledDate,
  paymentMethod,
  depositCapError,
}: Props) => {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate);
  const { data: availability } = useTimeSlotAvailability(isReservation && validDate ? scheduledDate : '');
  // Una franja sin cupo (completa, o ya terminada hoy) la rechazaría el alta: no se ofrece.
  const open = (availability ?? []).filter((slot) => slot.remaining > 0);
  const hidden = (availability ?? []).length - open.length;
  const slotOptions = [
    { value: '', label: validDate ? 'Sin franja (sólo el día)' : 'Elegí primero la fecha' },
    ...open.map((slot) => ({
      value: slot.timeSlotId,
      label: `${slot.name} (${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}) · ${slot.remaining} de ${slot.capacity} libres`,
    })),
  ];

  return (
    <Card className="space-y-3 p-4">
      <h3 className="text-sm font-semibold text-ink">Reserva programada</h3>
      <Checkbox
        label="Es una reserva con seña"
        hint="Aparta el stock para otro día: no se despacha hasta que la seña esté paga y llegue la fecha."
        {...register('isReservation')}
      />
      {isReservation && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Fecha de entrega"
            type="date"
            min={argentinaDay(new Date())}
            required
            error={errors.scheduledDate?.message}
            {...register('scheduledDate')}
          />
          <Select
            label="Franja horaria"
            options={slotOptions}
            disabled={!validDate}
            hint={hidden > 0 ? `${hidden} franja(s) sin cupo no se ofrecen.` : undefined}
            error={errors.timeSlotId?.message}
            {...register('timeSlotId')}
          />
          <Input
            label="Monto de la seña"
            type="text"
            inputMode="decimal"
            placeholder="0"
            required
            error={errors.depositAmount?.message ?? depositCapError ?? undefined}
            hint={DEPOSIT_HINT[paymentMethod]}
            {...register('depositAmount')}
          />
        </div>
      )}
    </Card>
  );
};
