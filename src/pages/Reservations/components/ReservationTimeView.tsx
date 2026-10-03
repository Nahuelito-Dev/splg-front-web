import type { Reserva, SlotAvailability } from '../../../services/api/types';
import { cx } from '../../../common/components/ui';
import { dayKey, weekDays } from '../reservationCalendar';
import { ReservationEvent } from './ReservationEvent';
import { SlotBands } from './SlotBands';

interface Props {
  mode: 'week' | 'day';
  anchor: Date;
  byDay: Map<string, Reserva[]>;
  slotsByDay: Map<string, SlotAvailability[]>;
  onOpen: (reservation: Reserva) => void;
  onPickDay: (day: Date) => void;
}

const WEEKDAY = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });

/** Vista semana (una columna por día) o día (franjas arriba y reservas debajo). */
export const ReservationTimeView = ({ mode, anchor, byDay, slotsByDay, onOpen, onPickDay }: Props) => {
  const days = mode === 'week' ? weekDays(anchor) : [anchor];
  const today = dayKey(new Date());
  return (
    <div className={cx('grid divide-outline-soft', mode === 'week' ? 'md:grid-cols-7 md:divide-x' : 'grid-cols-1')}>
      {days.map((day) => {
        const key = dayKey(day);
        const reservations = byDay.get(key) ?? [];
        return (
          <section
            key={key}
            aria-label={`Reservas del ${day.getDate()}`}
            className={cx('min-w-0 space-y-3 p-3', mode === 'week' && 'border-b border-outline-soft md:border-b-0')}
          >
            {mode === 'week' && (
              <button
                type="button"
                onClick={() => onPickDay(day)}
                className="flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {WEEKDAY.format(day).replace('.', '')}
                </span>
                <span
                  className={cx(
                    'grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-medium',
                    key === today ? 'bg-primary text-on-primary' : 'text-ink',
                  )}
                >
                  {day.getDate()}
                </span>
              </button>
            )}
            <SlotBands slots={slotsByDay.get(key)} compact={mode === 'week'} />
            <div className="space-y-1.5">
              {reservations.length === 0 ? (
                <p className="text-[12px] text-muted">Sin reservas.</p>
              ) : (
                reservations.map((reservation) => (
                  <ReservationEvent
                    key={reservation.id}
                    reservation={reservation}
                    onOpen={onOpen}
                    variant={mode === 'day' ? 'row' : 'card'}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};
