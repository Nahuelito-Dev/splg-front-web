import { useState } from 'react';
import { Button, EmptyState, LoadingState, Modal, Select } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import { useRevisitOptions, useScheduleRevisit } from '../../../services/queries/failedVisits';
import { formatShortId } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { slotOptions, weekdayDay } from '../revisit';

interface Props {
  /** El pedido al que se le fija la nueva visita; `null` cierra el modal. */
  orderId: string | null;
  onClose: () => void;
  onDone?: () => void;
}

const FORM_ID = 'schedule-revisit';

/** El formulario, montado sólo con el modal abierto: arranca vacío cada vez. */
const ScheduleRevisitForm = ({ orderId, onClose, onDone }: Props & { orderId: string }) => {
  const options = useRevisitOptions(orderId);
  const schedule = useScheduleRevisit();
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const days = options.data ?? [];
  // Por omisión, el primer día con lugar y su primera franja libre.
  const chosenDay = day || days[0]?.date || '';
  const slots = slotOptions(days, chosenDay);
  const chosenSlot = slots.some((s) => s.value === slot) ? slot : (slots[0]?.value ?? '');

  const submit = () => {
    if (!chosenDay || !chosenSlot) return;
    schedule.mutate(
      { orderId, body: { scheduledDate: chosenDay, timeSlotId: chosenSlot } },
      {
        onSuccess: () => {
          notify.success('Nueva visita fijada: le avisamos al cliente');
          onDone?.();
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={schedule.isPending}
      title="Fijar la nueva visita"
      description={`Pedido ${formatShortId(orderId)}. Elegí el día y la franja: el pedido vuelve al despacho al empezar esa franja y el cliente recibe el aviso.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={schedule.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={schedule.isPending} disabled={!chosenDay || !chosenSlot}>
            Fijar visita
          </Button>
        </>
      }
    >
      {options.isLoading ? (
        <LoadingState label="Buscando días con lugar" />
      ) : options.isError ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los días disponibles: {errorMessage(options.error)}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void options.refetch()}>
            Reintentar
          </button>
        </p>
      ) : days.length === 0 ? (
        <EmptyState
          title="Sin lugar en las próximas dos semanas"
          description="Ninguna franja tiene cupo en los días en que se reparte. Ampliá el cupo de una franja o reasigná el pedido a un chofer."
        />
      ) : (
        <form
          id={FORM_ID}
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Select
            label="Día"
            value={chosenDay}
            options={days.map((d) => ({ value: d.date, label: weekdayDay(d.date) }))}
            onChange={(event) => {
              setDay(event.target.value);
              setSlot('');
            }}
          />
          <Select
            label="Franja horaria"
            value={chosenSlot}
            options={slots}
            onChange={(event) => setSlot(event.target.value)}
          />
        </form>
      )}
    </Modal>
  );
};

/**
 * El admin fija el día y la franja de la nueva visita (POST /v3/orders/:id/revisit/schedule). Los días y las franjas
 * salen del back (calendario de reparto y cupo): acá no se calcula nada.
 */
export const ScheduleRevisitModal = ({ orderId, onClose, onDone }: Props) =>
  orderId ? <ScheduleRevisitForm orderId={orderId} onClose={onClose} onDone={onDone} /> : null;
