import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { RotateCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Tabs,
  PageContainer,
} from '../../common/components/ui';
import { usePermissions, useUrlParam } from '../../hooks';
import type { Refund } from '../../services/api/types';
import { useRefunds, useRetryOrderRefunds } from '../../services/queries/refunds';
import { formatCurrency, formatDateTime, formatShortId } from '../../utils/format';
import { notify } from '../../utils/notifications';
import { STALE_PENDING_MS } from '../Orders/components/details/refundsAvailability';
import { REFUND_KIND, REFUND_STATUS, labelOf } from '../../utils/statusLabels';

/** Falló, o quedó en curso hace rato (el back la retoma solo, pero el admin puede adelantarse). */
const retryable = (refund: Refund): boolean =>
  refund.status === 'failed' ||
  (refund.status === 'pending' && Date.now() - Date.parse(refund.updatedAt) > STALE_PENDING_MS);

const TABS = [
  { id: 'failed', label: 'Pendientes de reintento' },
  { id: 'all', label: 'Todas' },
];

/** Devoluciones de pagos a la pasarela (CU-168): las que fallaron esperan el reintento del administrador. */
export const Refunds = () => {
  const navigate = useNavigate();
  const { needsDistributor, canOperate, operateHint } = usePermissions();
  const [tab, setTab] = useUrlParam('tab', 'failed');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const status = tab === 'failed' ? 'failed' : undefined;
  // Los reintegros son de una distribuidora: sin «Ver como» la API contesta 400, así que ni se piden.
  const { data, isFetching, error, refetch } = useRefunds(pagination, { status }, { enabled: !needsDistributor });
  const retry = useRetryOrderRefunds();

  const retryOrder = (refund: Refund) =>
    retry.mutate(refund.orderId, {
      onSuccess: (rows) => {
        const stillFailing = rows.some((row) => row.status === 'failed');
        if (stillFailing) notify.error(new Error('La pasarela volvió a rechazar la devolución'));
        else notify.success('Devolución reintegrada');
      },
      onError: notify.error,
    });

  const open = (refund: Refund) => navigate(`/orders/${refund.orderId}`);

  const columns = useMemo<GridColDef<Refund>[]>(
    () => [
      {
        field: 'order',
        headerName: 'Pedido',
        flex: 1,
        minWidth: 150,
        sortable: false,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="font-mono font-semibold text-ink">{formatShortId(row.orderId)}</span>
            <span className="block text-[11.5px] text-muted">{formatDateTime(row.createdAt)}</span>
          </div>
        ),
      },
      {
        field: 'kind',
        headerName: 'Qué se devuelve',
        flex: 1,
        minWidth: 150,
        sortable: false,
        renderCell: ({ row }) => <Badge label={labelOf(REFUND_KIND, row.kind)} />,
      },
      {
        field: 'status',
        headerName: 'Estado',
        flex: 1.4,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <div className="min-w-0 leading-tight">
            <Badge label={labelOf(REFUND_STATUS, row.status)} />
            {row.errorMessage && row.status === 'failed' && (
              <span className="mt-0.5 block truncate text-[11.5px] text-danger" title={row.errorMessage}>
                {row.errorMessage}
              </span>
            )}
          </div>
        ),
      },
      {
        field: 'amount',
        headerName: 'Importe',
        width: 120,
        align: 'right',
        headerAlign: 'right',
        sortable: false,
        renderCell: ({ row }) => (
          <span className="tabular-nums font-semibold text-ink">{formatCurrency(row.amount)}</span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 220,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            {retryable(row) && (
              <Button
                size="sm"
                icon={<RotateCw />}
                loading={retry.isPending && retry.variables === row.orderId}
                blockedReason={canOperate ? undefined : operateHint}
                onClick={() => retryOrder(row)}
              >
                Reintentar
              </Button>
            )}
            <RowActions rowLabel={`pedido ${formatShortId(row.orderId)}`} onView={() => open(row)} />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canOperate, operateHint, retry.isPending, retry.variables],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Reintegros"
        description="Devoluciones de pagos por MercadoPago: al cancelar un pedido pagado en línea y al perder el recargo express. Si la pasarela falla, reintentala desde acá."
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus reintegros."
          />
        </Card>
      ) : (
        <Card>
          <div className="px-4 pt-3">
            <Tabs
              items={TABS.map((item) => ({
                ...item,
                count: item.id === 'failed' && status === 'failed' ? (data?.total ?? null) : undefined,
                tone: item.id === 'failed' ? 'danger' : undefined,
              }))}
              value={tab === 'failed' ? 'failed' : 'all'}
              onChange={(id) => {
                setTab(id);
                setPagination((current) => ({ ...current, page: 0 }));
              }}
              label="Filtro de reintegros"
              idPrefix="refunds"
            />
          </div>
          {error ? (
            <ErrorState error={error} resource="Los reintegros" onRetry={() => void refetch()} />
          ) : (
            <ResponsiveTable
              rows={data?.items ?? []}
              columns={columns}
              getRowId={(row) => row.refundId}
              label="reintegros"
              loading={isFetching}
              pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
              onRowClick={open}
              empty={
                <EmptyState
                  illustration={status === 'failed' ? 'done' : 'search'}
                  title={status === 'failed' ? 'No hay reintegros pendientes' : 'Todavía no hay reintegros'}
                  description="Se generan solos al cancelar un pedido pagado en línea o cuando un pedido express pasa al reparto común."
                />
              }
              renderCard={(row) => (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-ink">{formatShortId(row.orderId)}</span>
                    <span className="tabular-nums font-semibold text-ink">{formatCurrency(row.amount)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={labelOf(REFUND_KIND, row.kind)} />
                    <Badge label={labelOf(REFUND_STATUS, row.status)} />
                  </div>
                  {row.errorMessage && row.status === 'failed' && (
                    <p className="break-words text-xs text-danger">{row.errorMessage}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {retryable(row) && (
                      <Button
                        size="sm"
                        icon={<RotateCw />}
                        loading={retry.isPending && retry.variables === row.orderId}
                        blockedReason={canOperate ? undefined : operateHint}
                        onClick={() => retryOrder(row)}
                      >
                        Reintentar
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => open(row)}>
                      Ver pedido
                    </Button>
                  </div>
                </>
              )}
            />
          )}
        </Card>
      )}
    </PageContainer>
  );
};
