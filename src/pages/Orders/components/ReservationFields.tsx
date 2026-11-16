import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Card, CardHeader, FormCheckbox, FormInput, FormSelect } from '../../../common/components/ui';
import { useTimeSlotAvailability } from '../../../services/queries/timeSlots';
import { argentinaDay } from '../../../utils/format';
import type { NewOrderValues } from './newOrderSchema';

interface Props {
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
export const ReservationFields = ({ isReservation, scheduledDate, paymentMethod, depositCapError }: Props) => {
  const { setValue } = useFormContext<NewOrderValues>();
  const timeSlotId = useWatch<NewOrderValues, 'timeSlotId'>({ name: 'timeSlotId' });
  const [lostSlot, setLostSlot] = useState(false);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate);
  const { data: availability, isError: availabilityFailed } = useTimeSlotAvailability(
    isReservation && validDate ? scheduledDate : '',
  );
  // Una franja sin cupo (completa, o ya terminada hoy) la rechazaría el alta: no se ofrece.
  const open = (availability ?? []).filter((slot) => slot.remaining > 0);
  const hidden = (availability ?? []).length - open.length;
  // Al cambiar de fecha la franja elegida puede quedar sin cupo: se saca del formulario para no mandar una que no se ve.
  useEffect(() => {
    if (!timeSlotId) return;
    if (!validDate) {
      setValue('timeSlotId', '');
      return;
    }
    // Sin disponibilidad (cargando la fecha nueva o consulta caída) la franja no está validada: no se manda.
    if (!availability) {
      setValue('timeSlotId', '');
      setLostSlot(true);
      return;
    }
    const stillOpen = open.some((slot) => slot.timeSlotId === timeSlotId);
    if (!stillOpen) setValue('timeSlotId', '');
    setLostSlot(!stillOpen);
  }, [timeSlotId, validDate, availability, open, setValue]);
  const slotOptions = [
    { value: '', label: validDate ? 'Sin franja (sólo el día)' : 'Elegí primero la fecha' },
    ...open.map((slot) => ({
      value: slot.timeSlotId,
      label: `${slot.name} (${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}) · ${slot.remaining} de ${slot.capacity} libres`,
    })),
  ];

  return (
    <Card className="space-y-3 p-4">
      <CardHeader title="Reserva programada" as="h3" className="" />
      <FormCheckbox
        name="isReservation"
        label="Es una reserva con seña"
        hint="Aparta el stock para otro día: no se despacha hasta que la seña esté paga y llegue la fecha."
      />
      {isReservation && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            name="scheduledDate"
            label="Fecha de entrega"
            type="date"
            min={argentinaDay(new Date())}
            required
          />
          <FormSelect
            name="timeSlotId"
            label="Franja horaria"
            options={slotOptions}
            disabled={!validDate}
            hint={
              availabilityFailed
                ? 'No pudimos consultar las franjas de esa fecha: la reserva queda sólo para el día.'
                : lostSlot
                  ? 'La franja elegida ya no tiene cupo en esa fecha: elegí otra.'
                  : hidden > 0
                    ? `${hidden} franja(s) sin cupo no se ofrecen.`
                    : undefined
            }
          />
          <FormInput
            name="depositAmount"
            label="Monto de la seña"
            type="text"
            inputMode="decimal"
            placeholder="0"
            required
            fallbackError={depositCapError}
            hint={DEPOSIT_HINT[paymentMethod]}
          />
        </div>
      )}
    </Card>
  );
};
