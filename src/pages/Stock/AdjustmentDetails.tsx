import type { GridColDef } from '@mui/x-data-grid';
import { useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import { AttachmentsPanel } from '../../common/components/AttachmentsPanel';
import {
  Badge,
  Card,
  DetailList,
  DetailSkeleton,
  ErrorState,
  PageHeader,
  ResponsiveTable,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import type { StockAdjustmentItem } from '../../services/api/types';
import { useAdjustment } from '../../services/queries/stock';
import { formatDateTime } from '../../utils/format';
import { ADJUSTMENT_REASON, STOCK_CONDITION, labelOf } from '../../utils/statusLabels';

const COLUMNS: GridColDef<StockAdjustmentItem>[] = [
  { field: 'gasCylinderType', headerName: 'Garrafa', flex: 1, minWidth: 140, sortable: false },
  {
    field: 'condition',
    headerName: 'Condición',
    width: 150,
    sortable: false,
    valueGetter: ({ row }) => labelOf(STOCK_CONDITION, row.condition).text,
  },
  {
    field: 'quantityDelta',
    headerName: 'Cambio',
    width: 120,
    type: 'number',
    sortable: false,
    valueGetter: ({ row }) => (row.quantityDelta > 0 ? `+${row.quantityDelta}` : String(row.quantityDelta)),
  },
];

/** El detalle de un ajuste: motivo, nota, renglones y la foto o el acta que lo respalda. */
export const AdjustmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/stock/adjustments');
  const { canWrite, writeHint } = usePermissions();
  const { data: adjustment, isPending, error, refetch } = useAdjustment(id);
  useCrumbLeaf(adjustment ? `Ajuste N° ${adjustment.number}` : null, goBack);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title={adjustment ? `Ajuste N° ${adjustment.number}` : 'Ajuste de stock'}
        badges={adjustment && <Badge label={labelOf(ADJUSTMENT_REASON, adjustment.reason)} />}
      />
      {isPending ? (
        <DetailSkeleton />
      ) : error || !adjustment ? (
        <ErrorState error={error} resource="El ajuste" onRetry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="min-w-0 self-start p-6">
            <DetailList
              items={[
                { label: 'Ubicación', value: adjustment.location.name },
                { label: 'Fecha', value: formatDateTime(adjustment.createdAt) },
                { label: 'Registrado por', value: adjustment.createdByName },
                { label: 'Nota', value: adjustment.notes, wide: true },
              ]}
            />
          </Card>
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <h2 className="border-b border-outline px-4 py-3 text-sm font-semibold text-ink">Qué cambió</h2>
              <ResponsiveTable
                label="renglones"
                rows={adjustment.items}
                columns={COLUMNS}
                getRowId={(row) => `${row.gasCylinderId}:${row.condition}`}
                renderCard={(row) => (
                  <p className="text-sm">
                    <b>{row.gasCylinderType}</b> · {labelOf(STOCK_CONDITION, row.condition).text}:{' '}
                    <span className="font-mono">
                      {row.quantityDelta > 0 ? `+${row.quantityDelta}` : row.quantityDelta}
                    </span>
                  </p>
                )}
              />
            </Card>
            <Card className="p-6">
              <AttachmentsPanel
                ownerType="stock_adjustment"
                ownerId={adjustment.adjustmentId}
                canWrite={canWrite}
                blockedReason={writeHint}
                title="Foto o acta"
                hint="La foto de la garrafa dañada, el acta de la merma…"
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
