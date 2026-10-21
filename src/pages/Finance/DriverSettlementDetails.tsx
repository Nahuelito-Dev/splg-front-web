import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Check, ClipboardCheck, Undo2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
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
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import type { SettlementCollection, SettlementExpense, SettlementOrder } from '../../services/api/types';
import { useDriverSettlement, useReopenDriverSettlement } from '../../services/queries/finance';
import { formatCurrency, formatDateTime, formatDay, formatShortId } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import {
  DIFFERENCE_RESOLUTION,
  PAYMENT_STATUS,
  SETTLEMENT_STATUS,
  TRUCK_LOAD_STATUS,
  labelOf,
} from '../../utils/statusLabels';
import { ApproveSettlementModal } from './components/ApproveSettlementModal';
import { SubmitSettlementModal } from './components/SubmitSettlementModal';
import { Banknote, HandCoins, Scale, Wallet } from 'lucide-react';

const ORDER_COLUMNS: GridColDef<SettlementOrder>[] = [
  {
    field: 'orderId',
    headerName: 'Pedido',
    width: 130,
    sortable: false,
    renderCell: ({ row }) => (
      <Link className="font-mono text-primary underline" to={`/orders/${row.orderId}`}>
        {formatShortId(row.orderId)}
      </Link>
    ),
  },
  {
    field: 'deliveredAt',
    headerName: 'Entregado',
    width: 190,
    sortable: false,
    valueGetter: ({ row }) => formatDateTime(row.deliveredAt),
  },
  {
    field: 'paymentStatus',
    headerName: 'Cobro',
    width: 140,
    sortable: false,
    renderCell: ({ row }) => <Badge label={labelOf(PAYMENT_STATUS, row.paymentStatus as 'paid')} />,
  },
  {
    field: 'total',
    headerName: 'Total',
    width: 130,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    valueGetter: ({ row }) => formatCurrency(row.totalAmount),
  },
  {
    field: 'amountToCollect',
    headerName: 'A cobrar',
    width: 130,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    valueGetter: ({ row }) => formatCurrency(row.amountToCollect),
  },
];

const COLLECTION_COLUMNS: GridColDef<SettlementCollection>[] = [
  { field: 'businessName', headerName: 'Cuenta', flex: 1, minWidth: 200, sortable: false },
  {
    field: 'collectedAt',
    headerName: 'Cobrado',
    width: 190,
    sortable: false,
    valueGetter: ({ row }) => formatDateTime(row.collectedAt),
  },
  {
    field: 'amount',
    headerName: 'Importe',
    width: 130,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    valueGetter: ({ row }) => formatCurrency(row.amount),
  },
];

const EXPENSE_COLUMNS: GridColDef<SettlementExpense>[] = [
  { field: 'categoryName', headerName: 'Categoría', width: 200, sortable: false },
  {
    field: 'description',
    headerName: 'Detalle',
    flex: 1,
    minWidth: 160,
    sortable: false,
    valueGetter: ({ row }) => row.description ?? '—',
  },
  {
    field: 'amount',
    headerName: 'Importe',
    width: 130,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    valueGetter: ({ row }) => formatCurrency(row.amount),
  },
];

/** La ficha de una rendición: pedidos, cobros de la calle, gastos y las acciones según su estado. */
export const DriverSettlementDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/finance/settlements');
  const { canWrite, writeHint } = usePermissions();
  const { data: settlement, isPending, error, refetch } = useDriverSettlement(id);
  useCrumbLeaf(settlement ? `N° ${settlement.number}` : undefined, goBack);
  const reopen = useReopenDriverSettlement();
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  const askReopen = async () => {
    if (!settlement) return;
    const ok = await confirm({
      title: '¿Reabrir la rendición?',
      text: 'Vuelve a quedar abierta para declarar de nuevo: se liberan los pedidos y se borran los gastos que se habían declarado.',
      confirmText: 'Reabrir',
      danger: true,
    });
    if (!ok) return;
    reopen.mutate(settlement.settlementId, {
      onSuccess: () => notify.success('Rendición reabierta'),
      onError: notify.error,
    });
  };

  const actions = settlement && (
    <>
      {settlement.status === 'open' && (
        <Button icon={<ClipboardCheck />} disabled={!canWrite} title={writeHint} onClick={() => setSubmitting(true)}>
          Declarar efectivo
        </Button>
      )}
      {settlement.status === 'submitted' && (
        <>
          <Button
            variant="secondary"
            icon={<Undo2 />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => void askReopen()}
          >
            Reabrir
          </Button>
          <Button icon={<Check />} disabled={!canWrite} title={writeHint} onClick={() => setApproving(true)}>
            Aprobar
          </Button>
        </>
      )}
    </>
  );

  return (
    <PageContainer>
      <PageHeader
        title={settlement ? `Rendición N° ${settlement.number}` : 'Rendición'}
        eyebrow={
          settlement ? `${settlement.driverName || 'Chofer'} · ${formatDay(settlement.businessDate)}` : undefined
        }
        badges={settlement && <Badge label={labelOf(SETTLEMENT_STATUS, settlement.status)} />}
        actions={actions}
      />
      {isPending ? (
        <DetailSkeleton />
      ) : error || !settlement ? (
        <ErrorState error={error} resource="La rendición" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Esperado" icon={Scale} value={formatCurrency(settlement.expectedCash)} />
            <KpiCard
              title="Declarado"
              icon={Banknote}
              value={settlement.declaredCash === null ? '—' : formatCurrency(settlement.declaredCash)}
            />
            <KpiCard title="Gastos del chofer" icon={Wallet} value={formatCurrency(settlement.driverExpenses)} />
            <KpiCard
              title="Diferencia"
              icon={HandCoins}
              value={settlement.difference === null ? '—' : formatCurrency(settlement.difference)}
              pill={
                settlement.difference === null
                  ? undefined
                  : settlement.difference === 0
                    ? { text: 'Sin diferencia', trend: 'up' }
                    : { text: settlement.difference < 0 ? 'Faltante' : 'Sobrante', trend: 'warn' }
              }
            />
          </div>
          <Card className="p-5">
            <DetailList
              items={[
                { label: 'Efectivo de pedidos', value: formatCurrency(settlement.cashFromOrders), mono: true },
                {
                  label: 'Cobros de cuenta corriente',
                  value: formatCurrency(settlement.cashFromCollections),
                  mono: true,
                },
                {
                  label: 'Resolución de la diferencia',
                  value: settlement.differenceResolution
                    ? labelOf(DIFFERENCE_RESOLUTION, settlement.differenceResolution).text
                    : '—',
                },
                {
                  label: 'Carga del camión',
                  value: settlement.truckLoadId ? (
                    <Link className="text-primary underline" to={`/truck-loads/${settlement.truckLoadId}`}>
                      {labelOf(TRUCK_LOAD_STATUS, settlement.truckLoadStatus as 'closed').text}
                    </Link>
                  ) : (
                    'Sin carga ese día'
                  ),
                },
                { label: 'Presentada', value: settlement.submittedAt ? formatDateTime(settlement.submittedAt) : '—' },
                { label: 'Aprobada', value: settlement.approvedAt ? formatDateTime(settlement.approvedAt) : '—' },
                { label: 'Notas', value: settlement.notes ?? '—', wide: true },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="Pedidos en efectivo" className="border-b border-outline px-5 py-3" />
            <ResponsiveTable
              label="pedidos de la rendición"
              rows={settlement.orders}
              columns={ORDER_COLUMNS}
              getRowId={(row) => row.orderId}
              empty={
                <EmptyState title="Sin pedidos en efectivo" description="Todavía no entregó pedidos para rendir." />
              }
              renderCard={(row) => (
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono">{formatShortId(row.orderId)}</span>
                  <span className="font-mono">{formatCurrency(row.amountToCollect)}</span>
                </div>
              )}
            />
          </Card>
          <Card>
            <CardHeader title="Cobros de cuenta corriente en la calle" className="border-b border-outline px-5 py-3" />
            <ResponsiveTable
              label="cobros en la calle"
              rows={settlement.collections}
              columns={COLLECTION_COLUMNS}
              getRowId={(row) => row.entryId}
              empty={<EmptyState title="Sin cobros en la calle" />}
              renderCard={(row) => (
                <div className="flex items-center justify-between gap-3">
                  <span>{row.businessName}</span>
                  <span className="font-mono">{formatCurrency(row.amount)}</span>
                </div>
              )}
            />
          </Card>
          <Card>
            <CardHeader title="Gastos declarados" className="border-b border-outline px-5 py-3" />
            <ResponsiveTable
              label="gastos de la rendición"
              rows={settlement.expenses}
              columns={EXPENSE_COLUMNS}
              getRowId={(row) => row.expenseId}
              empty={<EmptyState title="Sin gastos declarados" />}
              renderCard={(row) => (
                <div className="flex items-center justify-between gap-3">
                  <span>{row.categoryName}</span>
                  <span className="font-mono">{formatCurrency(row.amount)}</span>
                </div>
              )}
            />
          </Card>
          <SubmitSettlementModal open={submitting} onClose={() => setSubmitting(false)} settlement={settlement} />
          <ApproveSettlementModal open={approving} onClose={() => setApproving(false)} settlement={settlement} />
        </div>
      )}
    </PageContainer>
  );
};
