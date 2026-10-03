import type { Reserva } from '../../../services/api/types';
import { cx } from '../../../common/components/ui';
import { dayKey, longDayName, monthGrid } from '../reservationCalendar';
import { ReservationEvent } from './ReservationEvent';

interface Props {
  anchor: Date;
  byDay: Map<string, Reserva[]>;
  onOpen: (reservation: Reserva) => void;
  onPickDay: (day: Date) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_VISIBLE = 3;

/** Vista mes: una celda por día con sus reservas; en pantallas chicas, un contador que lleva al día. */
export const ReservationMonthView = ({ anchor, byDay, onOpen, onPickDay }: Props) => {
  const today = dayKey(new Date());
  return (
    <div role="group" aria-label="Reservas del mes" className="overflow-hidden">
      <div aria-hidden="true" className="grid grid-cols-7 border-b border-outline bg-surface-sunken">
        {WEEKDAYS.map((name) => (
          <div
            key={name}
            className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
          >
            {name}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(anchor).map((day) => {
          const key = dayKey(day);
          const reservations = byDay.get(key) ?? [];
          const outside = day.getMonth() !== anchor.getMonth();
          return (
            <div
              key={key}
              className={cx(
                'min-h-[56px] border-b border-r border-outline-soft p-1 sm:min-h-[112px] sm:p-1.5',
                outside && 'bg-surface-sunken/60',
              )}
            >
              <button
                type="button"
                onClick={() => onPickDay(day)}
                aria-label={`Ver el día ${longDayName(day)}`}
                className={cx(
                  'grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-medium',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  key === today
                    ? 'bg-primary text-on-primary'
                    : outside
                      ? 'text-muted'
                      : 'text-ink hover:bg-surface-muted',
                )}
              >
                {day.getDate()}
              </button>
              {reservations.length > 0 && (
                <>
                  <div className="mt-1 hidden space-y-1 sm:block">
                    {reservations.slice(0, MAX_VISIBLE).map((reservation) => (
                      <ReservationEvent key={reservation.id} reservation={reservation} onOpen={onOpen} variant="chip" />
                    ))}
                    {reservations.length > MAX_VISIBLE && (
                      <button
                        type="button"
                        onClick={() => onPickDay(day)}
                        className="px-1 text-[11px] font-medium text-muted hover:text-ink"
                      >
                        +{reservations.length - MAX_VISIBLE} más
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPickDay(day)}
                    aria-label={`${reservations.length} reservas el ${longDayName(day)}`}
                    className="mt-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary-soft px-1 text-[11px] font-semibold text-primary-strong sm:hidden"
                  >
                    {reservations.length}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
