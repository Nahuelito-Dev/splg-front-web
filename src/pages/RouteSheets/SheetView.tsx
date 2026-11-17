import { Pencil, Route as RouteIcon, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState } from '../../common/components/ui';
import type { RouteOrderSummary, RoutePlanDay, RouteSheetStop } from '../../services/api/types';
import { useRouteSheet, useSetRouteSheetSequence, useRemoveRouteSheetStop } from '../../services/queries/routeSheets';
import { useWarehouses } from '../../services/queries/stock';
import { confirm, notify } from '../../utils/notifications';
import { LoadBar } from './LoadBar';
import { LoadSuggestionCard } from './LoadSuggestionCard';
import { OptimizeResult } from './OptimizeResult';
import { RouteSheetMap } from './RouteSheetMap';
import { notifySheetError } from './routeSheetErrors';
import {
  SHEET_STATUS,
  driverOf,
  hhmm,
  isEditable,
  isTracked,
  move,
  returnAtOf,
  sheetTitle,
  stopName,
  vehicleOf,
} from './routeSheetLabels';
import { SheetActions } from './SheetActions';
import { SheetFormModal } from './SheetFormModal';
import { SheetTracking } from './SheetTracking';
import { StopList } from './StopList';
import { StopOrderDrawer } from './StopOrderDrawer';
import { StopTargetModal } from './StopTargetModal';

interface Props {
  day: RoutePlanDay;
  sheetId: string;
  canWrite: boolean;
  onPick: (sheetId: string) => void;
}

const MOVED = 'Orden guardado: las horas se recalcularon';

/**
 * El detalle de una hoja: mapa, paradas con su hora estimada y todo lo que se le puede hacer. Desde que se inicia,
 * el seguimiento en la calle (`SheetTracking`).
 */
export const SheetView = ({ day, sheetId, canWrite, onPick }: Props) => {
  const detail = useRouteSheet(sheetId || undefined);
  const warehouses = useWarehouses();
  const sequence = useSetRouteSheetSequence();
  const remove = useRemoveRouteSheetStop();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [moving, setMoving] = useState<RouteSheetStop | null>(null);
  const [editing, setEditing] = useState(false);
  const [optimized, setOptimized] = useState<{ before: RouteOrderSummary; after: RouteOrderSummary } | null>(null);
  const sheet = detail.data ?? day.sheets.find((s) => s.id === sheetId);

  if (!sheet) {
    return (
      <EmptyState
        icon={RouteIcon}
        title="No hay hojas para este día"
        description="Pedile una propuesta al sistema o creá una hoja a mano."
      />
    );
  }

  const editable = canWrite && isEditable(sheet);
  /** Tocar una parada (en el mapa o en la lista) la elige y abre su pedido al costado. */
  const openStop = (orderId: string) => {
    setSelectedId(orderId);
    setOpenOrderId(orderId);
  };
  const depot = warehouses.data?.find((w) => w.warehouseId === sheet.originWarehouseId);
  const busy = sequence.isPending || remove.isPending;
  const lockedIds = sheet.stops.filter((s) => s.locked).map((s) => s.orderId);

  const saveSequence = (orderIds: string[], locked: string[], message: string) =>
    sequence.mutate({ sheet, orderIds, locked }, { onSuccess: () => notify.info(message), onError: notifySheetError });

  const reorder = (from: number, to: number) => {
    const ids = sheet.stops.map((s) => s.orderId);
    const next = move(ids, from, to);
    if (next === ids) return;
    setSelectedId(ids[from]);
    setOptimized(null);
    saveSequence(next, lockedIds, MOVED);
  };

  const toggleLock = (stop: RouteSheetStop) =>
    saveSequence(
      sheet.stops.map((s) => s.orderId),
      stop.locked ? lockedIds.filter((id) => id !== stop.orderId) : [...lockedIds, stop.orderId],
      stop.locked ? `${stopName(stop)} quedó suelta` : `${stopName(stop)} quedó fijada en su lugar`,
    );

  const removeStop = async (stop: RouteSheetStop) => {
    const ok = await confirm({
      title: `¿Sacar a ${stopName(stop)} de la hoja?`,
      text: 'El pedido vuelve a «Sin asignar» y las horas de las demás paradas se recalculan.',
      confirmText: 'Sacar de la hoja',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(
      { sheet, orderId: stop.orderId },
      { onSuccess: () => notify.success(`${stopName(stop)} volvió a «Sin asignar»`), onError: notifySheetError },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Hoja">
        {day.sheets.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={s.id === sheet.id ? 'primary' : 'secondary'}
            aria-pressed={s.id === sheet.id}
            onClick={() => {
              setSelectedId(null);
              setOptimized(null);
              onPick(s.id);
            }}
          >
            {sheetTitle(s)}
          </Button>
        ))}
      </div>
      {sheet.warnings.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-warn/40 bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
          {sheet.warnings.map((w) => (
            <li key={w.code} className="flex items-start gap-2">
              <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {w.message}
                {w.code === 'no_warehouse' && (
                  <>
                    {' · '}
                    <Link className="font-semibold underline" to="/stock/warehouses">
                      Ubicar el depósito
                    </Link>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {optimized && <OptimizeResult {...optimized} onClose={() => setOptimized(null)} />}
      {isTracked(sheet.status) ? (
        <>
          <SheetTracking day={day} sheet={sheet} canWrite={canWrite} />
          <div className="flex justify-end">
            <SheetActions sheet={sheet} canWrite={canWrite} onOptimized={setOptimized} />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/* Fijo debajo de la barra superior (60 px, también pegada arriba) mientras se baja la lista. */}
            <Card className="h-fit overflow-hidden lg:sticky lg:top-[76px]">
              <div className="flex items-center justify-between gap-2 border-b border-outline-soft px-4 py-3 text-sm">
                <b className="font-semibold text-ink">{sheetTitle(sheet)}</b>
                <span className="tabular-nums text-xs text-muted" data-testid="sheet-workday">
                  Jornada {hhmm(sheet.plannedStartAt)}–{hhmm(returnAtOf(sheet))}
                </span>
              </div>
              <RouteSheetMap sheetId={sheet.id} stops={sheet.stops} selectedId={selectedId} onSelect={openStop} />
              <div className="flex flex-wrap gap-4 px-4 py-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-sm bg-ink" />
                  Galpón
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-full bg-primary" />
                  Parada
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-full bg-ink" />
                  Fijada
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-full bg-danger" />
                  Fuera de franja
                </span>
                {sheet.matrixSource === 'haversine' && <span>Distancias en línea recta</span>}
              </div>
            </Card>
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-soft px-4 py-3">
                <div className="min-w-0">
                  <b className="block text-sm font-semibold text-ink">
                    {vehicleOf(sheet)} · {driverOf(sheet)}
                  </b>
                  <span className="text-[12.5px] text-muted">
                    Salida {hhmm(sheet.plannedStartAt)}
                    {depot ? ` desde ${depot.name}` : ' desde el depósito predeterminado'} · regreso{' '}
                    {hhmm(returnAtOf(sheet))}
                  </span>
                  {sheet.status === 'confirmed' && (
                    <span className="block text-[12.5px] text-ink-2" data-testid="assigned-at">
                      {sheet.assignedAt
                        ? `Pedidos asignados al chofer a las ${hhmm(sheet.assignedAt)}: espera la carga para iniciar el viaje`
                        : 'Los pedidos se le asignan al chofer al empezar el día del reparto'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={SHEET_STATUS[sheet.status]} />
                  {editable && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => setEditing(true)}
                    >
                      Editar hoja
                    </Button>
                  )}
                </div>
              </div>
              <StopList
                sheet={sheet}
                editable={editable}
                busy={busy}
                selectedId={selectedId}
                onSelect={openStop}
                onReorder={reorder}
                onToggleLock={toggleLock}
                onMove={setMoving}
                onRemove={(stop) => void removeStop(stop)}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-sunken px-4 py-3">
                <LoadBar sheet={sheet} className="min-w-[10rem] flex-1" />
                <SheetActions sheet={sheet} canWrite={canWrite} onOptimized={setOptimized} />
              </div>
            </Card>
          </div>
          <LoadSuggestionCard sheetId={sheet.id} />
        </>
      )}
      {moving && (
        <StopTargetModal day={day} target={{ kind: 'move', sheet, stop: moving }} onClose={() => setMoving(null)} />
      )}
      {editing && <SheetFormModal day={day} sheet={sheet} onClose={() => setEditing(false)} />}
      <StopOrderDrawer orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </div>
  );
};
