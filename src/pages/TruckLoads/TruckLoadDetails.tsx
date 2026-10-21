import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Ban, ClipboardCheck, Pencil, PackagePlus, Rocket, Undo2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Badge,
  Button,
  Card,
  DetailList,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  ResponsiveTable,
  PageContainer,
  CardHeader,
  type MenuAction,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import type { StockMovement, TruckLoadItem, TruckLoadOrder } from '../../services/api/types';
import { useDepartTruckLoad, useTruckLoad } from '../../services/queries/truckLoads';
import { formatCurrency, formatDateTime, formatDay, formatShortId } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { MOVEMENT_REASON, PAYMENT_STATUS, TRUCK_LOAD_STATUS, labelOf } from '../../utils/statusLabels';
import { placeName } from '../Stock/stockMath';
import { CancelLoadModal } from './components/CancelLoadModal';
import { CloseLoadModal } from './components/CloseLoadModal';
import { EditLoadItemsModal } from './components/EditLoadItemsModal';
import { ReloadModal } from './components/ReloadModal';
import { ReturnModal } from './components/ReturnModal';
import { TruckStockCard } from './components/TruckStockCard';
import { hasDeclared, loadActions, signed } from './truckLoadRules';
import { Banknote, HandCoins, Wallet } from 'lucide-react';

const ITEM_COLUMNS: GridColDef<TruckLoadItem>[] = [
  { field: 'gasCylinderType', headerName: 'Garrafa', width: 100, sortable: false },
  {
    field: 'loaded',
    headerName: 'Cargadas (ll. · vac.)',
    width: 150,
    sortable: false,
    valueGetter: ({ row }) => `${row.loadedFull} · ${row.loadedEmpty}`,
  },
  { field: 'reloadedFull', headerName: 'Repuestas', width: 100, type: 'number', sortable: false },
  { field: 'deliveredFull', headerName: 'Entregadas', width: 110, type: 'number', sortable: false },
  { field: 'collectedEmpty', headerName: 'Recolectadas', width: 120, type: 'number', sortable: false },
  {
    field: 'expected',
    headerName: 'Esperado (ll. · vac.)',
    width: 150,
    sortable: false,
    valueGetter: ({ row }) => `${row.expectedFull} · ${row.expectedEmpty}`,
  },
  {
    field: 'declared',
    headerName: 'Declarado',
    width: 120,
    sortable: false,
    valueGetter: ({ row }) => `${row.declaredReturnFull ?? '—'} · ${row.declaredReturnEmpty ?? '—'}`,
  },
  {
    field: 'difference',
    headerName: 'Diferencia',
    width: 120,
    sortable: false,
    renderCell: ({ row }) => (
      <span
        className={
          (row.differenceFull ?? 0) !== 0 || (row.differenceEmpty ?? 0) !== 0 ? 'font-semibold text-danger' : ''
        }
      >
        {signed(row.differenceFull)} · {signed(row.differenceEmpty)}
      </span>
    ),
  },
];

const ORDER_COLUMNS: GridColDef<TruckLoadOrder>[] = [
  {
    field: 'orderId',
    headerName: 'Pedido',
    width: 120,
    sortable: false,
    valueGetter: ({ row }) => formatShortId(row.orderId),
  },
  {
    field: 'deliveredAt',
    headerName: 'Entregado',
    width: 200,
    sortable: false,
    valueGetter: ({ row }) => formatDateTime(row.deliveredAt),
  },
  {
    field: 'totalAmount',
    headerName: 'Importe',
    width: 130,
    sortable: false,
    valueGetter: ({ row }) => formatCurrency(row.totalAmount),
  },
  {
    field: 'paymentStatus',
    headerName: 'Cobro',
    flex: 1,
    minWidth: 140,
    sortable: false,
    renderCell: ({ row }) => <Badge label={labelOf(PAYMENT_STATUS, row.paymentStatus)} />,
  },
];

const MOVEMENT_COLUMNS: GridColDef<StockMovement>[] = [
  {
    field: 'occurredAt',
    headerName: 'Cuándo',
    width: 190,
    sortable: false,
    valueGetter: ({ row }) => formatDateTime(row.occurredAt),
  },
  {
    field: 'reason',
    headerName: 'Motivo',
    width: 190,
    sortable: false,
    renderCell: ({ row }) => <Badge label={labelOf(MOVEMENT_REASON, row.reason)} />,
  },
  {
    field: 'detail',
    headerName: 'Detalle',
    flex: 1,
    minWidth: 280,
    sortable: false,
    valueGetter: ({ row }) => `${row.quantity} ${row.gasCylinderType} · ${placeName(row.from)} → ${placeName(row.to)}`,
  },
];

/** La ficha de una carga: renglones con esperado/declarado/diferencia, efectivo de la jornada, pedidos y movimientos. */
export const TruckLoadDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useBackToList('/truck-loads');
  const { canWrite } = usePermissions();
  const { data: load, isPending, error, refetch } = useTruckLoad(id);
  useCrumbLeaf(load ? `Carga N° ${load.number}` : null, goBack);
  const depart = useDepartTruckLoad();
  const [editing, setEditing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [returning, setReturning] = useState(false);
  const [closing, setClosing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleDepart = async () => {
    if (!load) return;
    const ok = await confirm({
      title: '¿Despachar el camión?',
      text: `Las garrafas salen de ${load.originName} y pasan al camión ${load.carPatent ?? ''}. Si el galpón no alcanza, no sale nada.`,
      confirmText: 'Despachar',
    });
    if (!ok) return;
    depart.mutate(
      { id: load.loadId, scope: `depart:${load.loadId}` },
      { onSuccess: () => notify.success('Camión despachado'), onError: notify.error },
    );
  };

  const can = load ? loadActions(load.status) : null;

  // La primaria es la acción que avanza la carga según su estado (salida, rendir, declarar la vuelta, reposición).
  const returnLabel = load?.status === 'returned' ? 'Volver a declarar' : 'Declarar la vuelta';
  const advance = !can
    ? null
    : can.canDepart
      ? 'depart'
      : can.canClose
        ? 'close'
        : can.canDeclareReturn
          ? 'return'
          : can.canReload
            ? 'reload'
            : null;
  const advanceAction = {
    depart: { label: 'Salida', icon: <Rocket />, loading: depart.isPending, run: () => void handleDepart() },
    close: { label: 'Rendir', icon: <ClipboardCheck />, loading: false, run: () => setClosing(true) },
    return: { label: returnLabel, icon: <Undo2 />, loading: false, run: () => setReturning(true) },
    reload: { label: 'Reposición', icon: <PackagePlus />, loading: false, run: () => setReloading(true) },
  };
  const primary = advance ? advanceAction[advance] : null;
  const headerPrimary =
    canWrite && primary ? (
      <Button size="sm" icon={primary.icon} loading={primary.loading} onClick={primary.run}>
        {primary.label}
      </Button>
    ) : undefined;
  const headerSecondary: MenuAction[] =
    canWrite && can
      ? [
          ...(['reload', 'return', 'close'] as const).flatMap((key) =>
            (key === 'reload' ? can.canReload : key === 'return' ? can.canDeclareReturn : can.canClose) &&
            advance !== key
              ? [{ label: advanceAction[key].label, icon: advanceAction[key].icon, onClick: advanceAction[key].run }]
              : [],
          ),
          ...(can.canEditItems
            ? [{ label: 'Editar renglones', icon: <Pencil />, onClick: () => setEditing(true) }]
            : []),
          ...(can.canCancel
            ? [{ label: 'Cancelar', icon: <Ban />, tone: 'danger' as const, onClick: () => setCancelling(true) }]
            : []),
        ]
      : [];

  return (
    <PageContainer>
      <PageHeader
        title={load ? `Carga N° ${load.number}` : 'Carga del camión'}
        badges={load && <Badge label={labelOf(TRUCK_LOAD_STATUS, load.status)} />}
        actions={headerPrimary}
        secondaryActions={headerSecondary}
      />
      {isPending ? (
        <DetailSkeleton />
      ) : error || !load ? (
        <ErrorState error={error} resource="La carga" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline px-4 py-3">
              <CardHeader title="Renglones" className="" />
              {load.status === 'returned' && !hasDeclared(load.items) && (
                <span className="text-xs text-muted">Todavía no se declaró la vuelta de todos los tipos.</span>
              )}
            </div>
            <ResponsiveTable
              label="renglones"
              rows={load.items}
              columns={ITEM_COLUMNS}
              getRowId={(row) => row.itemId}
              renderCard={(row) => (
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-ink">{row.gasCylinderType}</p>
                  <p className="text-muted">
                    Cargadas {row.loadedFull} llenas · {row.loadedEmpty} vacías · repuestas {row.reloadedFull}
                  </p>
                  <p className="text-muted">
                    Entregadas {row.deliveredFull} · recolectadas {row.collectedEmpty}
                  </p>
                  <p>
                    Esperado {row.expectedFull} · {row.expectedEmpty} — declarado {row.declaredReturnFull ?? '—'} ·{' '}
                    {row.declaredReturnEmpty ?? '—'}
                  </p>
                  <p
                    className={
                      (row.differenceFull ?? 0) !== 0 || (row.differenceEmpty ?? 0) !== 0
                        ? 'font-semibold text-danger'
                        : 'text-muted'
                    }
                  >
                    Diferencia {signed(row.differenceFull)} · {signed(row.differenceEmpty)}
                  </p>
                </div>
              )}
            />
          </Card>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="min-w-0 self-start p-6">
              <DetailList
                items={[
                  { label: 'Camión', value: load.carPatent ?? '—', mono: true },
                  { label: 'Chofer', value: load.driverName },
                  { label: 'Ayudante', value: load.helperName },
                  { label: 'Galpón', value: load.originName },
                  { label: 'Día de negocio', value: formatDay(load.businessDate) },
                  { label: 'Abierta', value: formatDateTime(load.openedAt) },
                  { label: 'Salió', value: formatDateTime(load.departedAt) },
                  { label: 'Volvió', value: formatDateTime(load.returnedAt) },
                  { label: 'Rendida', value: formatDateTime(load.closedAt) },
                  { label: 'Notas', value: load.notes, wide: true },
                  ...(load.differenceNote
                    ? [{ label: 'Nota de la diferencia', value: load.differenceNote, wide: true }]
                    : []),
                  ...(load.cancelReason
                    ? [{ label: 'Motivo de la cancelación', value: load.cancelReason, wide: true }]
                    : []),
                ]}
              />
            </Card>
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KpiCard
                  title="Efectivo cobrado"
                  icon={Banknote}
                  value={formatCurrency(load.cash.cashCollectedAmount)}
                  hint={`${load.cash.cashCollectedCount} pedidos`}
                />
                <KpiCard
                  title="Impago"
                  icon={HandCoins}
                  value={formatCurrency(load.cash.unpaidAmount)}
                  hint={`${load.cash.unpaidCount} pedidos`}
                />
                <KpiCard
                  title="Sin confirmar"
                  icon={Wallet}
                  value={formatCurrency(load.cash.pendingConfirmationAmount)}
                  hint={`${load.cash.pendingConfirmationCount} pedidos`}
                />
              </div>
              {can?.isOpen && (
                <Card>
                  <CardHeader title="Stock actual del camión" className="border-b border-outline px-4 py-3" />
                  <TruckStockCard carId={load.carId} />
                </Card>
              )}
              <Card>
                <CardHeader title="Pedidos entregados en la jornada" className="border-b border-outline px-4 py-3" />
                <ResponsiveTable
                  label="pedidos"
                  rows={load.orders}
                  columns={ORDER_COLUMNS}
                  getRowId={(row) => row.orderId}
                  onRowClick={(row) => navigate(`/orders/${row.orderId}`)}
                  empty={<EmptyState icon={HandCoins} title="Sin entregas todavía" />}
                  renderCard={(row) => (
                    <>
                      <Link className="font-semibold text-primary underline" to={`/orders/${row.orderId}`}>
                        Pedido {formatShortId(row.orderId)}
                      </Link>
                      <p className="text-sm text-muted">
                        {formatDateTime(row.deliveredAt)} · {formatCurrency(row.totalAmount)}
                      </p>
                      <Badge label={labelOf(PAYMENT_STATUS, row.paymentStatus)} />
                    </>
                  )}
                />
              </Card>
              <Card>
                <CardHeader title="Movimientos de la carga" className="border-b border-outline px-4 py-3" />
                <ResponsiveTable
                  label="movimientos"
                  rows={load.movements}
                  columns={MOVEMENT_COLUMNS}
                  getRowId={(row) => row.movementId}
                  empty={<EmptyState title="Sin movimientos" description="El stock se mueve cuando el camión sale." />}
                  renderCard={(row) => (
                    <>
                      <Badge label={labelOf(MOVEMENT_REASON, row.reason)} />
                      <p className="text-sm text-ink">
                        {row.quantity} {row.gasCylinderType} · {placeName(row.from)} → {placeName(row.to)}
                      </p>
                      <p className="text-xs text-muted">{formatDateTime(row.occurredAt)}</p>
                    </>
                  )}
                />
              </Card>
            </div>
          </div>
        </div>
      )}
      {load && (
        <>
          <EditLoadItemsModal open={editing} onClose={() => setEditing(false)} load={load} />
          <ReloadModal open={reloading} onClose={() => setReloading(false)} load={load} />
          <ReturnModal open={returning} onClose={() => setReturning(false)} load={load} />
          <CloseLoadModal open={closing} onClose={() => setClosing(false)} load={load} />
          <CancelLoadModal load={cancelling ? load : null} onClose={() => setCancelling(false)} />
        </>
      )}
    </PageContainer>
  );
};
