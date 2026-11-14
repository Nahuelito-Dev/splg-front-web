import { ArrowDown, ArrowRightLeft, ArrowUp, GripVertical, Lock, LockOpen, Trash2 } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { cx } from '../../common/components/ui';
import type { RouteSheet, RouteSheetStop } from '../../services/api/types';
import { formatKm, hhmm, slotOf, stopName } from './routeSheetLabels';

interface Props {
  sheet: RouteSheet;
  editable: boolean;
  busy: boolean;
  selectedId: string | null;
  onSelect: (orderId: string) => void;
  /** Mover la parada de la posición `from` a `to` (índices desde 0). */
  onReorder: (from: number, to: number) => void;
  onToggleLock: (stop: RouteSheetStop) => void;
  onMove: (stop: RouteSheetStop) => void;
  onRemove: (stop: RouteSheetStop) => void;
}

const SMALL =
  'grid h-6 w-6 place-items-center rounded-md border border-outline text-muted hover:bg-surface-hover disabled:opacity-40';

/** Las paradas en orden con su hora estimada. En un borrador se arrastran, se suben y bajan, se fijan, se mueven y se sacan. */
export const StopList = ({
  sheet,
  editable,
  busy,
  selectedId,
  onSelect,
  onReorder,
  onToggleLock,
  onMove,
  onRemove,
}: Props) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const { stops } = sheet;
  const canEdit = editable && !busy;

  const handleDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const from = stops.findIndex((s) => s.orderId === dragId);
    const to = stops.findIndex((s) => s.orderId === targetId);
    setDragId(null);
    setOverId(null);
    if (from >= 0 && to >= 0 && from !== to) onReorder(from, to);
  };

  if (stops.length === 0) {
    return <p className="px-4 py-6 text-center text-[13px] text-muted">La hoja no tiene paradas.</p>;
  }

  return (
    <ol aria-label="Paradas de la hoja" aria-busy={busy || undefined}>
      {stops.map((stop, i) => {
        const name = stopName(stop);
        const eta = stop.plannedEtaAt ?? stop.etaAt;
        return (
          <li
            key={stop.orderId}
            draggable={canEdit}
            onDragStart={(event) => {
              setDragId(stop.orderId);
              event.dataTransfer?.setData('text/plain', stop.orderId);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(event) => {
              if (!dragId) return;
              event.preventDefault();
              setOverId(stop.orderId);
            }}
            onDrop={(event) => handleDrop(event, stop.orderId)}
            onClick={() => onSelect(stop.orderId)}
            className={cx(
              'grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 border-b border-outline-soft px-3 py-2.5 sm:grid-cols-[18px_28px_minmax(0,1fr)_auto] sm:px-4',
              selectedId === stop.orderId ? 'bg-primary-soft' : 'bg-surface',
              dragId === stop.orderId && 'opacity-40',
              overId === stop.orderId && dragId !== stop.orderId && 'shadow-[inset_0_2px_0] shadow-primary',
            )}
          >
            <GripVertical
              aria-hidden="true"
              className={cx('hidden h-4 w-4 text-faint sm:row-span-2 sm:block', canEdit && 'cursor-grab')}
            />
            <span
              className={cx(
                'grid h-7 w-7 place-items-center rounded-full font-mono text-xs font-semibold sm:row-span-2',
                stop.late ? 'bg-danger text-white' : stop.locked ? 'bg-ink text-surface' : 'bg-primary text-on-primary',
              )}
            >
              {stop.sequence}
            </span>
            <div className="min-w-0 sm:row-span-2">
              <b className="block truncate text-[13px] font-semibold text-ink">{name}</b>
              <span className="block truncate text-xs text-muted">{stop.address ?? 'Sin dirección'}</span>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="rounded-md border border-outline-soft bg-surface-sunken px-1.5 text-[11px] text-muted">
                  {stop.units} garrafa(s) · {slotOf(stop)}
                </span>
                {i > 0 && (
                  <span className="rounded-md border border-outline-soft px-1.5 text-[11px] text-muted">
                    +{formatKm(stop.legDistanceKm)}
                  </span>
                )}
                {stop.locked && (
                  <span className="rounded-md bg-surface-muted px-1.5 text-[11px] text-ink-2">Fijada</span>
                )}
                {stop.late && (
                  <span className="rounded-md bg-warn-soft px-1.5 text-[11px] text-warn">Fuera de franja</span>
                )}
                {stop.unpaidOnline && (
                  <span className="rounded-md bg-info-soft px-1.5 text-[11px] text-info">Mercado Pago sin pagar</span>
                )}
              </div>
            </div>
            <b
              className="self-start justify-self-end font-mono text-sm font-semibold text-ink"
              data-testid="eta"
              title="Hora estimada de llegada"
            >
              {hhmm(eta)}
            </b>
            {editable && (
              <div className="col-span-full flex flex-wrap justify-end gap-1 sm:col-span-1 sm:col-start-4 sm:gap-0.5">
                <button
                  type="button"
                  aria-label={`Subir ${name}`}
                  disabled={!canEdit || i === 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReorder(i, i - 1);
                  }}
                  className={SMALL}
                >
                  <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${name}`}
                  disabled={!canEdit || i === stops.length - 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReorder(i, i + 1);
                  }}
                  className={SMALL}
                >
                  <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={stop.locked ? `Soltar ${name}` : `Fijar ${name}`}
                  aria-pressed={stop.locked}
                  title={stop.locked ? 'Soltar: el optimizador la puede mover' : 'Fijar: el optimizador no la mueve'}
                  disabled={!canEdit}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleLock(stop);
                  }}
                  className={SMALL}
                >
                  {stop.locked ? (
                    <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <LockOpen aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Mover ${name} a otra hoja`}
                  disabled={!canEdit}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(stop);
                  }}
                  className={SMALL}
                >
                  <ArrowRightLeft aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Sacar ${name} de la hoja`}
                  disabled={!canEdit}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(stop);
                  }}
                  className={SMALL}
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
};
