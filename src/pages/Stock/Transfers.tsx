import { useMemo, useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { ArrowLeftRight, Plus, Undo2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  ResponsiveTable,
} from '../../common/components/ui';
import { usePermissions, useClampPage, useUrlPagedParams } from '../../hooks';
import { useBatchReversed, useStockMovements } from '../../services/queries/stock';
import { formatDateTime } from '../../utils/format';
import { STOCK_CONDITION, labelOf } from '../../utils/statusLabels';
import { groupByBatch, placeName, type MovementBatch } from './stockMath';
import { ReverseBatchModal } from './components/ReverseBatchModal';
import { TransferFormModal } from './components/TransferFormModal';

const route = (batch: MovementBatch) => `${placeName(batch.lines[0].from)} → ${placeName(batch.lines[0].to)}`;
const summary = (batch: MovementBatch) =>
  batch.lines
    .map((m) => `${m.quantity} ${m.gasCylinderType} · ${labelOf(STOCK_CONDITION, m.fromCondition).text}`)
    .join(' · ');

/** «Contraasentada» o el botón para contraasentar el lote; mientras no se sabe (o si falló) no se ofrece nada. */
const BatchAction = ({
  batchId,
  canWrite,
  onReverse,
}: {
  batchId: string;
  canWrite: boolean;
  onReverse: () => void;
}) => {
  const reversed = useBatchReversed(batchId);
  if (reversed.data) return <Badge label={{ text: 'Contraasentada', tone: 'danger' }} />;
  if (!canWrite || !reversed.isSuccess) return null;
  return (
    <Button size="sm" variant="secondary" icon={<Undo2 />} onClick={onReverse}>
      Contraasentar lote
    </Button>
  );
};

/** Transferencias entre ubicaciones, tal como quedaron en el libro: una fila por lote, con su contraasiento. */
export const Transfers = () => {
  const { canWrite, writeHint } = usePermissions();
  const [, , pagination, setPagination] = useUrlPagedParams({}, 10);
  const [creating, setCreating] = useState(false);
  const [reversing, setReversing] = useState<string | null>(null);
  const transfers = useStockMovements(pagination, { reason: 'transfer' });
  const batches = useMemo(() => groupByBatch(transfers.data?.data ?? []), [transfers.data]);

  const columns: GridColDef<MovementBatch>[] = [
    {
      field: 'occurredAt',
      headerName: 'Transferencia',
      flex: 1.2,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={route(row)} subtitle={formatDateTime(row.occurredAt)} icon={ArrowLeftRight} />
      ),
    },
    {
      field: 'lines',
      headerName: 'Garrafas',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => <span className="truncate">{summary(row)}</span>,
    },
    {
      field: 'actorName',
      headerName: 'Registró',
      width: 140,
      sortable: false,
      valueGetter: ({ row }) => row.actorName ?? '—',
    },
    {
      field: 'notes',
      headerName: 'Nota',
      flex: 1,
      minWidth: 150,
      sortable: false,
      valueGetter: ({ row }) => row.notes ?? '—',
    },
    {
      field: 'status',
      headerName: '',
      width: 190,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <BatchAction batchId={row.batchId} canWrite={canWrite} onReverse={() => setReversing(row.batchId)} />
      ),
    },
  ];

  useClampPage(pagination, transfers.data?.total, setPagination);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Transferencias"
        description="Movimientos de garrafas entre galpones. Cargar un camión se hace desde la carga del día."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nueva transferencia
          </Button>
        }
      />
      <Card>
        {transfers.error ? (
          <ErrorState error={transfers.error} resource="Las transferencias" onRetry={() => void transfers.refetch()} />
        ) : (
          <ResponsiveTable
            label="transferencias"
            rows={batches}
            columns={columns}
            getRowId={(row) => row.batchId}
            loading={transfers.isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: transfers.data?.total ?? 0 }}
            empty={
              <EmptyState
                icon={ArrowLeftRight}
                title="Todavía no hay transferencias"
                description="Cuando muevas garrafas entre galpones, quedan registradas acá."
              />
            }
            renderCard={(row) => (
              <>
                <IdentityCell title={route(row)} subtitle={formatDateTime(row.occurredAt)} icon={ArrowLeftRight} />
                <p className="text-sm text-ink">{summary(row)}</p>
                {row.notes && <p className="text-sm text-muted">{row.notes}</p>}
                <BatchAction batchId={row.batchId} canWrite={canWrite} onReverse={() => setReversing(row.batchId)} />
              </>
            )}
          />
        )}
      </Card>
      <TransferFormModal open={creating} onClose={() => setCreating(false)} />
      <ReverseBatchModal batchId={reversing} onClose={() => setReversing(null)} />
    </div>
  );
};
