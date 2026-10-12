import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { CheckCircle2, RefreshCw, Scale } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  ResponsiveTable,
  Skeleton,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { DiferenciaDeVendible, PedidoEntregadoSinMovimiento } from '../../services/api/types';
import { useReapplyDeliveries, useReconciliation } from '../../services/queries/stock';
import { formatDateTime, formatShortId } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { ReconciliationAdjustModal } from './components/ReconciliationAdjustModal';

/** Conciliación: el vendible contra lo físico y los pedidos entregados que no descontaron stock. */
export const Reconciliation = () => {
  const { canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch, isFetching } = useReconciliation();
  const reapply = useReapplyDeliveries();
  const [adjusting, setAdjusting] = useState<DiferenciaDeVendible | null>(null);

  const handleReapply = async () => {
    const ok = await confirm({
      title: '¿Reaplicar las entregas?',
      text: 'Descuenta del stock físico los pedidos entregados que quedaron sin movimiento. No duplica lo ya descontado.',
    });
    if (!ok) return;
    reapply.mutate('reapply', {
      onSuccess: (result) => {
        notify.success(
          `Revisados ${result.revisados}, reaplicados ${result.reaplicados}, pendientes ${result.pendientes}`,
        );
      },
      onError: notify.error,
    });
  };

  const cylinderColumns: GridColDef<DiferenciaDeVendible>[] = [
    { field: 'gasCylinderType', headerName: 'Garrafa', width: 120, sortable: false },
    { field: 'sellable', headerName: 'Vendible', width: 110, type: 'number', sortable: false },
    { field: 'physicalFull', headerName: 'Llenas físicas', width: 130, type: 'number', sortable: false },
    { field: 'reserved', headerName: 'Reservado', width: 110, type: 'number', sortable: false },
    { field: 'expected', headerName: 'Esperado', width: 110, type: 'number', sortable: false },
    {
      field: 'difference',
      headerName: 'Diferencia',
      width: 120,
      sortable: false,
      renderCell: ({ row }) =>
        row.difference === 0 ? (
          <Badge label={{ text: 'En orden', tone: 'success' }} />
        ) : (
          <Badge label={{ text: row.difference > 0 ? `+${row.difference}` : String(row.difference), tone: 'danger' }} />
        ),
    },
    {
      field: 'actions',
      headerName: '',
      flex: 1,
      minWidth: 200,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) =>
        row.difference !== 0 && canWrite ? (
          <Button size="sm" variant="secondary" onClick={() => setAdjusting(row)}>
            Ajuste de conciliación
          </Button>
        ) : null,
    },
  ];

  const deliveryColumns: GridColDef<PedidoEntregadoSinMovimiento>[] = [
    {
      field: 'orderId',
      headerName: 'Pedido',
      width: 130,
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
    { field: 'gasCylinderType', headerName: 'Garrafa', width: 130, sortable: false },
    { field: 'quantity', headerName: 'Cantidad', width: 110, type: 'number', sortable: false },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Conciliación"
        description="Verifica que el vendible coincida con las llenas físicas menos lo reservado. Corre sola todas las noches y avisa si hay diferencias."
        badges={
          data && (
            <Badge
              label={
                data.consistent ? { text: 'Consistente', tone: 'success' } : { text: 'Con diferencias', tone: 'danger' }
              }
            />
          )
        }
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw />}
            loading={isFetching && !isPending}
            onClick={() => void refetch()}
          >
            Volver a verificar
          </Button>
        }
      />
      {isPending ? (
        <Card className="p-4">
          <Skeleton className="h-32 w-full" />
        </Card>
      ) : error || !data ? (
        <Card>
          <ErrorState error={error} resource="La conciliación" onRetry={() => void refetch()} />
        </Card>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted" aria-live="polite">
            Verificado el {formatDateTime(data.checkedAt)}
          </p>
          <Card>
            <h2 className="border-b border-outline px-4 py-3 text-sm font-semibold text-ink">Vendible por garrafa</h2>
            <ResponsiveTable
              label="la conciliación"
              rows={data.cylinders}
              columns={cylinderColumns}
              getRowId={(row) => row.gasCylinderId}
              empty={<EmptyState icon={Scale} title="Sin garrafas para conciliar" />}
              renderCard={(row) => (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-ink">{row.gasCylinderType}</p>
                    <Badge
                      label={
                        row.difference === 0
                          ? { text: 'En orden', tone: 'success' }
                          : { text: row.difference > 0 ? `+${row.difference}` : String(row.difference), tone: 'danger' }
                      }
                    />
                  </div>
                  <p className="text-sm text-muted">
                    Vendible {row.sellable} · esperado {row.expected} (físicas {row.physicalFull} − reservado{' '}
                    {row.reserved})
                  </p>
                  {row.difference !== 0 && canWrite && (
                    <Button size="sm" variant="secondary" onClick={() => setAdjusting(row)}>
                      Ajuste de conciliación
                    </Button>
                  )}
                </>
              )}
            />
          </Card>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Entregas sin movimiento de stock</h2>
              <Button
                size="sm"
                variant="secondary"
                icon={<RefreshCw />}
                disabled={!canWrite || data.deliveriesWithoutMovement.length === 0}
                title={writeHint}
                loading={reapply.isPending}
                onClick={() => void handleReapply()}
              >
                Reaplicar entregas
              </Button>
            </div>
            <ResponsiveTable
              label="las entregas"
              rows={data.deliveriesWithoutMovement}
              columns={deliveryColumns}
              getRowId={(row) => `${row.orderId}:${row.gasCylinderId}`}
              empty={
                <EmptyState
                  icon={CheckCircle2}
                  title="Todas las entregas descontaron stock"
                  description="No hay pedidos entregados sin su movimiento en el libro."
                />
              }
              renderCard={(row) => (
                <p className="text-sm">
                  <b>{formatShortId(row.orderId)}</b> · {row.quantity} {row.gasCylinderType} ·{' '}
                  {formatDateTime(row.deliveredAt)}
                </p>
              )}
            />
          </Card>
        </div>
      )}
      <ReconciliationAdjustModal difference={adjusting} onClose={() => setAdjusting(null)} />
    </div>
  );
};
