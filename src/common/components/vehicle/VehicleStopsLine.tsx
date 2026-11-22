import type { LiveVehicleStop } from '../../../services/api/types';
import { cx } from '../ui';
import { LIVE_STOP_PROGRESS, clockTime } from './vehicleLabels';

interface Props {
  stops: LiveVehicleStop[];
  /** Cuántas se muestran antes de resumir el resto en «y N más» (tarjeta). Sin tope, todas (detalle). */
  max?: number;
  /** Con detalle: dirección y estado de cada parada. */
  detailed?: boolean;
  selectedId?: string | null;
  onSelect?: (orderId: string) => void;
  className?: string;
}

const DOT: Record<LiveVehicleStop['progress'], string> = {
  delivered: 'border-success bg-success',
  on_the_way: 'border-info bg-info',
  pending: 'border-primary bg-surface',
  failed: 'border-muted bg-muted',
};

const stopName = (stop: LiveVehicleStop) => stop.customerName ?? 'Cliente sin nombre';

/** Qué se muestra primero cuando no entran todas: desde la parada en camino (o la primera pendiente). */
const windowStart = (stops: LiveVehicleStop[], max: number): number => {
  const current = stops.findIndex((s) => s.progress === 'on_the_way' || s.progress === 'pending');
  const from = current === -1 ? 0 : current;
  return Math.max(0, Math.min(from, stops.length - max));
};

/**
 * Las paradas de un vehículo como una línea de puntos en su orden: entregadas, la que está en camino, las que faltan y
 * las que no se entregaron, con la hora estimada de llegada cuando la hay.
 */
export const VehicleStopsLine = ({ stops, max, detailed = false, selectedId, onSelect, className }: Props) => {
  if (stops.length === 0) {
    return <p className={cx('text-xs text-muted', className)}>Sin paradas asignadas</p>;
  }
  const start = max === undefined ? 0 : windowStart(stops, max);
  const visible = max === undefined ? stops : stops.slice(start, start + max);
  const before = start;
  const after = stops.length - start - visible.length;

  return (
    <div className={className}>
      {before > 0 && (
        <p className="mb-1 pl-5 text-[11px] text-muted">
          {before} {before === 1 ? 'parada anterior' : 'paradas anteriores'}
        </p>
      )}
      <ol aria-label="Paradas" className="relative">
        {visible.map((stop, index) => {
          const last = index === visible.length - 1;
          const label = LIVE_STOP_PROGRESS[stop.progress];
          const content = (
            <>
              <span className="flex min-w-0 items-baseline justify-between gap-2">
                <span
                  className={cx(
                    'min-w-0 truncate',
                    detailed ? 'text-[13px] font-semibold text-ink' : 'text-xs text-ink-2',
                    stop.progress === 'delivered' && !detailed && 'text-muted',
                  )}
                >
                  {stop.sequence !== null && <span className="tabular-nums text-muted">{stop.sequence}. </span>}
                  {stopName(stop)}
                </span>
                <span className="shrink-0 tabular-nums text-[11px] text-muted">
                  {stop.progress === 'delivered'
                    ? 'Entregada'
                    : stop.progress === 'failed'
                      ? 'No entregada'
                      : stop.etaAt
                        ? clockTime(stop.etaAt)
                        : label.text}
                </span>
              </span>
              {detailed && <span className="block truncate text-xs text-muted">{stop.address ?? 'Sin dirección'}</span>}
            </>
          );
          return (
            <li
              key={stop.orderId}
              data-progress={stop.progress}
              className={cx('relative pl-5', detailed ? 'pb-3' : 'pb-1.5', last && 'pb-0')}
            >
              {!last && <span aria-hidden="true" className="absolute bottom-0 left-[4.5px] top-3 w-px bg-outline" />}
              <span
                aria-hidden="true"
                className={cx('absolute left-0 top-[5px] h-2.5 w-2.5 rounded-full border-2', DOT[stop.progress])}
              />
              <span className="sr-only">{label.text}: </span>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(stop.orderId)}
                  aria-pressed={selectedId === stop.orderId}
                  className={cx(
                    'block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    selectedId === stop.orderId && 'bg-primary-soft',
                  )}
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
      {after > 0 && (
        <p className="mt-1 pl-5 text-[11px] text-muted">
          y {after} {after === 1 ? 'parada más' : 'paradas más'}
        </p>
      )}
    </div>
  );
};
