import { useState } from 'react';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { Badge, Card, EmptyState, Input, LoadingState } from '../../../common/components/ui';
import { useTimeSlotAvailability } from '../../../services/queries/timeSlots';
import type { Label } from '../../../utils/statusLabels';

const today = () => new Date().toISOString().slice(0, 10);

const remainingLabel = (remaining: number, capacity: number): Label => {
  if (remaining <= 0) return { text: 'Sin cupo', tone: 'danger' };
  if (remaining < capacity * 0.3) return { text: `${remaining} libres`, tone: 'warn' };
  return { text: `${remaining} libres`, tone: 'success' };
};

/** Cupos por franja para un día puntual: cuánto queda antes de que el cliente agende. */
export const SlotAvailabilityPanel = () => {
  const [date, setDate] = useState(today);
  const { data: availability, isPending } = useTimeSlotAvailability(date);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <EventAvailableIcon aria-hidden="true" className="text-primary" fontSize="small" />
            Disponibilidad por día
          </h3>
          <p className="text-sm text-muted">Cupos reservados y libres por franja.</p>
        </div>
        <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-48" />
      </div>

      {isPending ? (
        <LoadingState />
      ) : !availability || availability.length === 0 ? (
        <EmptyState title="Sin franjas" description="No hay turnos activos para esta distribuidora." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {availability.map((slot) => (
            <li key={slot.timeSlotId} className="rounded-xl border border-outline p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-ink">{slot.name}</p>
                <Badge label={remainingLabel(slot.remaining, slot.capacity)} />
              </div>
              <p className="mt-1 text-xs text-muted">
                <span className="rounded border border-outline bg-tinta-50 px-1.5 py-0.5 font-mono">
                  {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                </span>{' '}
                · {slot.booked}/{slot.capacity} reservados
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
