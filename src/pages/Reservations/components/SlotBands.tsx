import type { SlotAvailability } from '../../../services/api/types';
import { cx } from '../../../common/components/ui';

interface Props {
  slots: SlotAvailability[] | undefined;
  /** Para las columnas angostas de la semana: horario corto y cupo en una línea. */
  compact?: boolean;
}

const hhmm = (time: string) => time.slice(0, 5);
/** 08:00:00 → 8, 22:30:00 → 22:30 */
const shortHour = (time: string) => hhmm(time).replace(/^0/, '').replace(':00', '');

/** Las franjas horarias del día como bandas, con su cupo ocupado y libre (`GET /time-slot/availability`). */
export const SlotBands = ({ slots, compact = false }: Props) => {
  if (!slots) return null;
  if (slots.length === 0) return <p className="text-[11.5px] text-muted">Sin franjas.</p>;
  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    <ul className={cx('grid gap-1.5', !compact && 'sm:grid-cols-2 lg:grid-cols-4')} aria-label="Franjas horarias">
      {sorted.map((slot) => {
        const ratio = slot.capacity > 0 ? Math.min(100, Math.round((slot.booked / slot.capacity) * 100)) : 0;
        const full = slot.remaining <= 0;
        const range = compact
          ? `${shortHour(slot.startTime)}–${shortHour(slot.endTime)} h`
          : `${hhmm(slot.startTime)}–${hhmm(slot.endTime)}`;
        return (
          <li
            key={slot.timeSlotId}
            title={`${slot.name} ${hhmm(slot.startTime)}–${hhmm(slot.endTime)}`}
            className="rounded-lg border border-outline bg-surface-sunken px-2.5 py-1.5 text-[11.5px]"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold text-ink">{slot.name}</span>
              <span className="shrink-0 tabular-nums text-muted">{range}</span>
            </div>
            <div
              role="progressbar"
              aria-label={`Cupo de ${slot.name}`}
              aria-valuemin={0}
              aria-valuemax={slot.capacity}
              aria-valuenow={slot.booked}
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className={cx('h-full rounded-full', full ? 'bg-danger' : 'bg-primary')}
                style={{ width: `${ratio}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between gap-1 text-muted">
              <span className="whitespace-nowrap">
                {compact ? `${slot.booked}/${slot.capacity}` : `${slot.booked} de ${slot.capacity} ocupados`}
              </span>
              <span className={cx('whitespace-nowrap font-medium', full ? 'text-danger' : 'text-success')}>
                {full ? 'Completa' : `${slot.remaining} libres`}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
