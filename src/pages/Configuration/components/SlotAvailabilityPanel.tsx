import { useState } from 'react';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { Badge, Card, EmptyState, LoadingState, DayFilter, CardHeader } from '../../../common/components/ui';
import { useTimeSlotAvailability } from '../../../services/queries/timeSlots';
import { argentinaDay } from '../../../utils/format';
import type { Label } from '../../../utils/statusLabels';

const today = () => argentinaDay(new Date());

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
      <CardHeader
        title="Disponibilidad por día"
        subtitle="Cupos reservados y libres por franja."
        icon={<EventAvailableIcon />}
        as="h3"
        action={<DayFilter label="Fecha" value={date} onChange={(day) => setDate(day || date)} />}
      />

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
                <span className="rounded border border-outline bg-surface-hover px-1.5 py-0.5 tabular-nums">
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
