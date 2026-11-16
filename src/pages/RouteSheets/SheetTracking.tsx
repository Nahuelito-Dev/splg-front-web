import { CircleSlash, Flag, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, ErrorState, LoadingState, ReasonModal, cx } from '../../common/components/ui';
import { useSocketContext } from '../../context/useSocketContext';
import { usePermissions } from '../../hooks';
import { errorMessage } from '../../services/api/errors';
import type { RoutePlanDay, RouteSheet, RouteSheetExecution, RouteSheetExecutionStop } from '../../services/api/types';
import {
  isSheetBusy,
  useCloseRouteSheet,
  useRemoveRouteSheetStop,
  useRouteSheetExecution,
} from '../../services/queries/routeSheets';
import { confirm, notify } from '../../utils/notifications';
import { AwaitingOrderActions } from './AwaitingAdmin';
import { FailedStopModal } from './FailedStopModal';
import { LiveStopModal } from './LiveStopModal';
import { RouteSheetMap } from './RouteSheetMap';
import { notifySheetError } from './routeSheetErrors';
import {
  REMOVED_REASON,
  SHEET_STATUS,
  STOP_PROGRESS,
  closedText,
  dayLabel,
  delayMinutes,
  emptiesText,
  driverOf,
  hhmm,
  isActiveStop,
  isOpenStop,
  progressText,
  sheetTitle,
  slotOf,
  stopName,
  vehicleOf,
} from './routeSheetLabels';
import { closeSheetReasonError } from './routeSheetSchemas';
import { LIVE_POLL_MS, LIVE_REFRESH_MS, useRouteSheetLive } from './useRouteSheetLive';
import { StopOrderDrawer } from './StopOrderDrawer';
import { useScrollToSelected } from './useScrollToSelected';

interface Props {
  day: RoutePlanDay;
  sheet: RouteSheet;
  canWrite: boolean;
}

const SMALL_BUTTON =
  'inline-flex items-center gap-1 rounded-md border border-outline px-2 py-1 text-[11.5px] font-medium text-ink-2 hover:bg-surface-hover disabled:opacity-40';

const Delay = ({ stop }: { stop: RouteSheetExecutionStop }) => {
  const delay = delayMinutes(stop);
  if (delay === null || Math.abs(delay) < 1) return null;
  return (
    <span className={cx('block text-[11px]', delay > 0 ? 'text-warn' : 'text-success')}>
      {delay > 0 ? `+${delay} min` : `${delay} min`} · prometida {hhmm(stop.plannedEtaAt)}
    </span>
  );
};

/** La espera en la puerta desde «Llegué»: vencida, el sistema le sugiere al chofer marcar «No pude entregar». */
const WaitChip = ({ until }: { until: string }) =>
  new Date(until).getTime() <= Date.now() ? (
    <span className="rounded-md bg-danger-soft px-1.5 text-[11px] text-danger">Venció la espera ({hhmm(until)})</span>
  ) : (
    <span className="rounded-md border border-outline-soft px-1.5 text-[11px] text-muted">
      Espera hasta {hhmm(until)}
    </span>
  );

/** Lo que pasó con la parada en la calle: llegada y espera, reintento, franja avisada al cliente, atraso. */
const StopFacts = ({ stop }: { stop: RouteSheetExecutionStop }) => (
  <div className="mt-1 flex flex-wrap gap-1">
    <Badge label={STOP_PROGRESS[stop.progress]} />
    {stop.emptiesExpected > 0 && (
      <span className="rounded-md bg-accent-soft px-1.5 text-[11px] text-on-accent" data-testid="empties-tag">
        {emptiesText(stop.emptiesExpected)}
      </span>
    )}
    <span className="rounded-md border border-outline-soft bg-surface-sunken px-1.5 text-[11px] text-muted">
      {stop.units} garrafa(s) · {slotOf(stop)}
    </span>
    {stop.arrivedAt && (
      <span className="rounded-md border border-outline-soft px-1.5 text-[11px] text-muted">
        Llegó {hhmm(stop.arrivedAt)}
      </span>
    )}
    {stop.progress === 'on_the_way' && stop.waitExpiresAt && <WaitChip until={stop.waitExpiresAt} />}
    {stop.failedAttempts > 0 && (
      <span className="rounded-md bg-warn-soft px-1.5 text-[11px] text-warn" title={stop.lastFailureNote ?? undefined}>
        Reintento: no se entregó a las {hhmm(stop.lastFailedAt)}
      </span>
    )}
    {stop.notifiedWindowStart && stop.notifiedWindowEnd && (
      <span className="rounded-md border border-outline-soft px-1.5 text-[11px] text-muted">
        Avisado al cliente {hhmm(stop.notifiedWindowStart)}–{hhmm(stop.notifiedWindowEnd)}
      </span>
    )}
    {stop.late && <span className="rounded-md bg-warn-soft px-1.5 text-[11px] text-warn">Fuera de franja</span>}
    {stop.unpaidOnline && (
      <span className="rounded-md bg-info-soft px-1.5 text-[11px] text-info">Mercado Pago sin pagar</span>
    )}
  </div>
);

const ProgressBar = ({ execution }: { execution: RouteSheetExecution }) => {
  const { total, delivered, failed, pending, removed } = execution.progress;
  // Cada tramo crece en proporción a su cantidad: entregadas, no entregadas y lo que falta o salió.
  return (
    <div
      role="progressbar"
      aria-label="Avance de la hoja"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={delivered}
      aria-valuetext={progressText(execution)}
      className="flex h-2 overflow-hidden rounded-full bg-surface-muted"
    >
      <span className="bg-success" style={{ flexGrow: delivered }} />
      <span className="bg-danger" style={{ flexGrow: failed }} />
      <span style={{ flexGrow: pending + removed }} />
    </div>
  );
};

/**
 * El seguimiento de una hoja en la calle: estado, avance parada por parada con la hora estimada vigente (en vivo por
 * socket), la posición del chofer en el mapa y, mientras está en curso, agregar o sacar paradas, marcar una como no
 * entregada y cerrarla a mano. En modo soporte (o sin permiso) se ve igual, sin acciones.
 */
export const SheetTracking = ({ day, sheet, canWrite }: Props) => {
  const { readOnly } = usePermissions();
  const { isOnline } = useSocketContext();
  // En modo soporte no llega el tiempo real: se relee más seguido. Una hoja cerrada no cambia.
  const realtime = isOnline && !readOnly;
  const refetchInterval = sheet.status === 'assigned' ? (realtime ? LIVE_REFRESH_MS : LIVE_POLL_MS) : false;
  const query = useRouteSheetExecution(sheet.id, { refetchInterval });
  const execution = query.data;
  useRouteSheetLive(sheet.id, execution);

  const remove = useRemoveRouteSheetStop();
  const close = useCloseRouteSheet();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const rowRef = useScrollToSelected(selectedId);
  /** Tocar una parada (en el mapa o en la lista) la elige y abre su pedido al costado. */
  const openStop = (orderId: string) => {
    setSelectedId(orderId);
    setOpenOrderId(orderId);
  };
  const [failing, setFailing] = useState<RouteSheetExecutionStop | null>(null);
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  if (!execution) {
    return query.isPending ? (
      <Card>
        <LoadingState label="Cargando el seguimiento…" />
      </Card>
    ) : (
      <Card className="p-6">
        <ErrorState error={query.error} resource="El seguimiento" onRetry={() => void query.refetch()} />
      </Card>
    );
  }

  const live = execution.status === 'assigned';
  const actions = canWrite && live;
  const active = execution.stops.filter(isActiveStop);
  const gone = execution.stops.filter((s) => !isActiveStop(s));
  const status = SHEET_STATUS[execution.status as RouteSheet['status']] ?? SHEET_STATUS.assigned;

  const removeStop = async (stop: RouteSheetExecutionStop) => {
    const ok = await confirm({
      title: `¿Sacar a ${stopName(stop)} de la hoja en curso?`,
      text: 'El pedido se le libera al chofer y queda esperando que decidas (cambiarle la fecha o cancelarlo): no vuelve al despacho común. El recorrido se reordena y al chofer le llega el aviso.',
      confirmText: 'Sacar de la hoja',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(
      { sheet: { ...sheet, version: execution.version }, orderId: stop.orderId },
      {
        onSuccess: () => notify.success(`${stopName(stop)} salió de la hoja: quedó esperando tu decisión`),
        onError: notifySheetError,
      },
    );
  };

  const closeSheet = (reason: string) => {
    setCloseError(null);
    close.mutate(
      { sheetId: sheet.id, reason },
      {
        onSuccess: (result) => {
          setClosing(false);
          if (result.alreadyClosed) notify.info('La hoja ya estaba cerrada');
          else notify.success(closedText(result));
        },
        onError: (error) => {
          if (isSheetBusy(error)) notifySheetError(error);
          else setCloseError(errorMessage(error));
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-sm font-semibold text-ink">{sheetTitle(sheet)}</b>
              <Badge label={status} />
              {live && (
                <span className="text-[11.5px] text-muted">{realtime ? 'En vivo' : 'Se actualiza cada 20 s'}</span>
              )}
            </div>
            <span className="block text-[12.5px] text-muted">
              {vehicleOf(sheet)} · {driverOf(sheet)} · iniciada {hhmm(execution.startedAt)}
              {execution.closedAt && ` · cerrada ${hhmm(execution.closedAt)}`}
            </span>
            {execution.closeNote && (
              <span className="block text-[12.5px] text-ink-2">Motivo del cierre: {execution.closeNote}</span>
            )}
            {readOnly && <span className="block text-[12px] text-muted">Modo soporte: sólo lectura</span>}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setAdding(true)}
              >
                Agregar pedido
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Flag className="h-3.5 w-3.5" />}
                onClick={() => {
                  setCloseError(null);
                  setClosing(true);
                }}
              >
                Cerrar hoja
              </Button>
            </div>
          )}
        </div>
        <ProgressBar execution={execution} />
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
          <div>
            <dt className="inline">Entregadas </dt>
            <dd className="inline font-semibold text-ink">{execution.progress.delivered}</dd>
          </div>
          <div>
            <dt className="inline">No entregadas </dt>
            <dd className="inline font-semibold text-ink">{execution.progress.failed}</dd>
          </div>
          <div>
            <dt className="inline">Faltan </dt>
            <dd className="inline font-semibold text-ink">{execution.progress.pending}</dd>
          </div>
          <div>
            <dt className="inline">Salieron </dt>
            <dd className="inline font-semibold text-ink">{execution.progress.removed}</dd>
          </div>
        </dl>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Fijo debajo de la barra superior (60 px, también pegada arriba) mientras se baja la lista. */}
        <Card className="h-fit overflow-hidden lg:sticky lg:top-[76px]">
          <RouteSheetMap
            sheetId={sheet.id}
            stops={active}
            selectedId={selectedId}
            onSelect={openStop}
            driver={live ? execution.driverLocation : null}
          />
          <div className="flex flex-wrap gap-4 px-4 py-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-success" />
              Entregada
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-info" />
              En camino
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-primary" />
              Pendiente
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-danger" />
              Fuera de franja
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-muted" />
              No entregada
            </span>
            {live && (
              <span data-testid="driver-location">
                {execution.driverLocation
                  ? `Chofer: posición de las ${hhmm(execution.driverLocation.at)}`
                  : 'Sin posición reciente del chofer'}
              </span>
            )}
          </div>
        </Card>
        <Card className="overflow-hidden">
          {active.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted">No quedan paradas en la hoja.</p>
          ) : (
            <ol aria-label="Avance de las paradas">
              {active.map((stop) => {
                const name = stopName(stop);
                const open = isOpenStop(stop);
                return (
                  <li
                    key={stop.orderId}
                    ref={rowRef(stop.orderId)}
                    onClick={() => openStop(stop.orderId)}
                    className={cx(
                      'grid scroll-mt-20 scroll-mb-4 grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-1.5 border-b border-outline-soft px-3 py-2.5 sm:px-4',
                      selectedId === stop.orderId ? 'bg-primary-soft' : 'bg-surface',
                    )}
                  >
                    <span
                      className={cx(
                        'grid h-7 w-7 place-items-center rounded-full tabular-nums text-xs font-semibold',
                        stop.progress === 'delivered'
                          ? 'bg-success text-white'
                          : stop.progress === 'on_the_way'
                            ? 'bg-info text-white'
                            : stop.late
                              ? 'bg-danger text-white'
                              : 'bg-primary text-on-primary',
                      )}
                    >
                      {stop.sequence}
                    </span>
                    <div className="min-w-0">
                      <button
                        type="button"
                        title="Ver el pedido"
                        className="block max-w-full rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        onClick={(event) => {
                          event.stopPropagation();
                          openStop(stop.orderId);
                        }}
                      >
                        <b className="block truncate text-[13px] font-semibold text-ink">{name}</b>
                      </button>
                      <span className="block truncate text-xs text-muted">{stop.address ?? 'Sin dirección'}</span>
                      <StopFacts stop={stop} />
                    </div>
                    <div className="text-right" title="Hora estimada de llegada">
                      <b className="tabular-nums text-sm font-semibold text-ink" data-testid="eta">
                        {stop.progress === 'delivered' ? 'Entregada' : hhmm(stop.etaAt)}
                      </b>
                      {open && <Delay stop={stop} />}
                    </div>
                    {actions && open && (
                      <div className="col-span-full flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          className={SMALL_BUTTON}
                          aria-label={`${name}: no pude entregar`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setFailing(stop);
                          }}
                        >
                          <CircleSlash aria-hidden="true" className="h-3.5 w-3.5" />
                          No pude entregar
                        </button>
                        {stop.progress === 'pending' && (
                          <button
                            type="button"
                            className={SMALL_BUTTON}
                            aria-label={`Sacar ${name} de la hoja`}
                            disabled={remove.isPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              void removeStop(stop);
                            }}
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                            Sacar
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {gone.length > 0 && (
            <section aria-label="Salieron de la hoja" className="bg-surface-sunken px-4 py-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Salieron de la hoja</h3>
              <ul className="space-y-2">
                {gone.map((stop) => (
                  <li key={stop.orderId} className="text-[12.5px] text-ink">
                    <b className="font-semibold">{stopName(stop)}</b> · {STOP_PROGRESS[stop.progress].text}
                    <span className="block text-muted">
                      {stop.removedReason ? REMOVED_REASON[stop.removedReason] : 'Salió de la hoja'}
                      {stop.removedNote && `: ${stop.removedNote}`}
                      {stop.removedAt && ` · ${hhmm(stop.removedAt)}`}
                    </span>
                    {stop.rescheduledTo && (
                      <span className="block text-ink-2">
                        Se reprogramó para el {dayLabel(stop.rescheduledTo)}, sin franja fija
                      </span>
                    )}
                    {stop.awaitingAdmin && (
                      <>
                        <span className="mt-1 inline-block rounded-md bg-warn-soft px-1.5 text-[11px] text-warn">
                          Esperando al admin
                        </span>
                        <AwaitingOrderActions stop={stop} canWrite={canWrite} />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </Card>
      </div>
      <StopOrderDrawer orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
      {failing && <FailedStopModal sheetId={sheet.id} stop={failing} onClose={() => setFailing(null)} />}
      {adding && <LiveStopModal day={day} sheet={sheet} execution={execution} onClose={() => setAdding(false)} />}
      <ReasonModal
        open={closing}
        onClose={() => setClosing(false)}
        onConfirm={closeSheet}
        title={`¿Cerrar ${sheetTitle(sheet)}?`}
        description={`Las ${execution.progress.pending} parada(s) que faltan salen de la hoja y el sistema las reprograma solas para el próximo día hábil, sin franja fija. Lo entregado queda como está. No se puede deshacer.`}
        reasonLabel="Motivo del cierre"
        placeholder="Por ejemplo: se rompió el camión"
        confirmLabel="Cerrar hoja"
        validateReason={closeSheetReasonError}
        serverError={closeError}
        onReasonChange={() => setCloseError(null)}
        loading={close.isPending}
      />
    </div>
  );
};
