import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Ban, Check, HandCoins, Scale, Undo2, Wallet } from 'lucide-react';
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
  ReasonModal,
  ResponsiveTable,
  PageContainer,
  CardHeader,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { toApiError } from '../../services/api/errors';
import type { CommissionEntry } from '../../services/api/types';
import {
  useApproveDriverLiquidation,
  useDriverLiquidation,
  useUnpayDriverLiquidation,
  useVoidDriverLiquidation,
} from '../../services/queries/finance';
import { formatCurrency, formatDateTime, formatDay, formatShortId } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { COMMISSION_ENTRY_TYPE, LIQUIDATION_STATUS, labelOf } from '../../utils/statusLabels';
import { PayLiquidationModal } from './components/PayLiquidationModal';

const COLUMNS: GridColDef<CommissionEntry>[] = [
  {
    field: 'occurredAt',
    headerName: 'Fecha',
    width: 170,
    sortable: false,
    valueGetter: ({ row }) => formatDateTime(row.occurredAt),
  },
  {
    field: 'type',
    headerName: 'Asiento',
    flex: 1,
    minWidth: 260,
    sortable: false,
    renderCell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-0.5 py-1">
        <span className="flex items-center gap-2">
          <Badge label={labelOf(COMMISSION_ENTRY_TYPE, row.type)} />
          {row.orderId && (
            <Link className="font-mono text-xs text-primary underline" to={`/orders/${row.orderId}`}>
              {formatShortId(row.orderId)}
            </Link>
          )}
        </span>
        <span className="truncate text-xs text-muted">{row.description}</span>
      </span>
    ),
  },
  {
    field: 'amount',
    headerName: 'Importe',
    width: 140,
    sortable: false,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <span className={`font-mono ${row.amount < 0 ? 'text-danger' : ''}`}>{formatCurrency(row.amount)}</span>
    ),
  },
];

/** La ficha de una liquidación: sus asientos y las acciones según su estado (CU-334, 243, 335). */
export const DriverLiquidationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/finance/liquidations');
  const { canWrite, writeHint } = usePermissions();
  const { data: liquidation, isPending, error, refetch } = useDriverLiquidation(id);
  useCrumbLeaf(liquidation ? `N° ${liquidation.number}` : undefined, goBack);
  const approve = useApproveDriverLiquidation();
  const voidIt = useVoidDriverLiquidation();
  const unpay = useUnpayDriverLiquidation();
  const [paying, setPaying] = useState(false);
  const [unpaying, setUnpaying] = useState(false);
  const [unpayError, setUnpayError] = useState<string | null>(null);

  const askApprove = async () => {
    if (!liquidation) return;
    const ok = await confirm({
      title: '¿Aprobar la liquidación?',
      text: 'Queda congelada: ya no se agregan ni se sacan asientos. Después se paga desde una caja.',
      confirmText: 'Aprobar',
    });
    if (!ok) return;
    approve.mutate(liquidation.liquidationId, {
      onSuccess: () => notify.success('Liquidación aprobada'),
      onError: notify.error,
    });
  };

  const askVoid = async () => {
    if (!liquidation) return;
    const ok = await confirm({
      title: '¿Anular la liquidación?',
      text: 'Los asientos vuelven a quedar sin liquidar y se pueden incluir en otra.',
      confirmText: 'Anular',
      danger: true,
    });
    if (!ok) return;
    voidIt.mutate(liquidation.liquidationId, {
      onSuccess: () => notify.success('Liquidación anulada'),
      onError: notify.error,
    });
  };

  const confirmUnpay = (reason: string) => {
    if (!liquidation) return;
    unpay.mutate(
      { id: liquidation.liquidationId, body: { reason } },
      {
        onSuccess: () => {
          notify.success('Pago anulado: la liquidación vuelve a estar aprobada');
          setUnpaying(false);
        },
        onError: (e) => setUnpayError(toApiError(e).messages.join('. ')),
      },
    );
  };

  const actions = liquidation && (
    <>
      {liquidation.status === 'paid' && (
        <Button
          variant="secondary"
          icon={<Undo2 />}
          disabled={!canWrite}
          title={writeHint}
          onClick={() => setUnpaying(true)}
        >
          Anular pago
        </Button>
      )}
      {(liquidation.status === 'draft' || liquidation.status === 'approved') && (
        <Button
          variant="secondary"
          icon={<Ban />}
          disabled={!canWrite}
          title={writeHint}
          loading={voidIt.isPending}
          onClick={() => void askVoid()}
        >
          Anular
        </Button>
      )}
      {liquidation.status === 'draft' && (
        <Button
          icon={<Check />}
          disabled={!canWrite}
          title={writeHint}
          loading={approve.isPending}
          onClick={() => void askApprove()}
        >
          Aprobar
        </Button>
      )}
      {liquidation.status === 'approved' && (
        <Button icon={<Wallet />} disabled={!canWrite} title={writeHint} onClick={() => setPaying(true)}>
          Pagar
        </Button>
      )}
    </>
  );

  return (
    <PageContainer size="md">
      <PageHeader
        title={liquidation ? `Liquidación N° ${liquidation.number}` : 'Liquidación'}
        eyebrow={
          liquidation
            ? `${liquidation.employeeName} · ${formatDay(liquidation.periodFrom)} al ${formatDay(liquidation.periodTo)}`
            : undefined
        }
        badges={liquidation && <Badge label={labelOf(LIQUIDATION_STATUS, liquidation.status)} />}
        actions={actions}
      />
      {isPending ? (
        <DetailSkeleton />
      ) : error || !liquidation ? (
        <ErrorState error={error} resource="La liquidación" onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard title="Bruto" icon={HandCoins} value={formatCurrency(liquidation.gross)} />
            <KpiCard title="Deducciones" icon={Scale} value={formatCurrency(liquidation.deductions)} />
            <KpiCard title="Neto a pagar" icon={Wallet} value={formatCurrency(liquidation.net)} />
          </div>
          <Card className="p-5">
            <DetailList
              items={[
                { label: 'Creada', value: formatDateTime(liquidation.createdAt) },
                { label: 'Aprobada', value: liquidation.approvedAt ? formatDateTime(liquidation.approvedAt) : '—' },
                { label: 'Pagada', value: liquidation.paidAt ? formatDateTime(liquidation.paidAt) : '—' },
                { label: 'Anulada', value: liquidation.voidedAt ? formatDateTime(liquidation.voidedAt) : '—' },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="Asientos incluidos" className="border-b border-outline px-5 py-3" />
            <ResponsiveTable
              label="asientos de la liquidación"
              rows={liquidation.entries}
              columns={COLUMNS}
              getRowId={(row) => row.entryId}
              empty={<EmptyState title="Sin asientos" description="Una liquidación anulada libera sus asientos." />}
              renderCard={(row) => (
                <div className="flex items-center justify-between gap-3">
                  <Badge label={labelOf(COMMISSION_ENTRY_TYPE, row.type)} />
                  <span className="font-mono">{formatCurrency(row.amount)}</span>
                </div>
              )}
            />
          </Card>
          <PayLiquidationModal open={paying} onClose={() => setPaying(false)} liquidation={liquidation} />
          <ReasonModal
            open={unpaying}
            onClose={() => {
              setUnpaying(false);
              setUnpayError(null);
            }}
            onConfirm={confirmUnpay}
            title="Anular el pago"
            description={`Se devuelve ${formatCurrency(liquidation.net)} a la caja de la que salió y la liquidación vuelve a quedar aprobada: se puede pagar de nuevo o anular.`}
            reasonLabel="Motivo"
            confirmLabel="Anular pago"
            serverError={unpayError}
            onReasonChange={() => setUnpayError(null)}
            loading={unpay.isPending}
          />
        </div>
      )}
    </PageContainer>
  );
};
