import type { GridColDef } from '@mui/x-data-grid';
import { Play, Route as RouteIcon, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageContainer,
  PageHeader,
  ResponsiveTable,
  RowActions,
  StatusFilterTabs,
  type StatusOption,
} from '../../common/components/ui';
import { usePermissions, useUrlParams } from '../../hooks';
import type { RouteBatch } from '../../services/api/types';
import { useRouteBatchSettings, useRouteBatches, useRunRouteBatches } from '../../services/queries/routeBatches';
import { formatDateTime, formatShortId } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { RouteBatchDrawer } from './RouteBatchDrawer';
import { RouteBatchSettingsModal } from './RouteBatchSettingsModal';
import { ROUTE_BATCH_STATUS, formatKg, stopCountOf } from './routeBatchLabels';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'offered', label: 'Ofrecidos', tone: 'info' },
  { value: 'assigned', label: 'Asignados', tone: 'success' },
  { value: 'completed', label: 'Completados', tone: 'success' },
  { value: 'dissolved', label: 'Deshechos', tone: 'warn' },
];

/** Quién tiene el lote o a quién se le ofreció: lo que le importa al administrador de un vistazo. */
const holderOf = (b: RouteBatch): { title: string; subtitle: string } => {
  if (b.driver) return { title: b.driver.name ?? 'Chofer', subtitle: 'Lo tomó' };
  if (b.currentOffer) {
    return {
      title: b.currentOffer.driverName ?? 'Chofer',
      subtitle: `Responde hasta ${formatDateTime(b.currentOffer.expiresAt)}`,
    };
  }
  if (b.status === 'dissolved') return { title: 'Sin chofer', subtitle: `${b.offers.length} contactado(s)` };
  return { title: 'Sin ofrecer', subtitle: '—' };
};

/**
 * Recorridos (CU-107, módulo inteligente M4): los pedidos programados que el sistema agrupa en un lote ordenado, a
 * quién se le ofreció y en qué quedó. El administrador puede armar lotes ahora, deshacer uno sin chofer y ajustar los
 * parámetros; el chofer acepta o rechaza el recorrido completo desde su app.
 */
export const RouteBatches = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const [{ status, batch: batchParam }, setFilters] = useUrlParams({ status: '', batch: '' });
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [configuring, setConfiguring] = useState(false);
  const filters = status ? { status: status as RouteBatch['status'] } : {};
  const { data, isFetching, error, refetch } = useRouteBatches(pagination, filters, { enabled: !needsDistributor });
  const settings = useRouteBatchSettings({ enabled: configuring && !needsDistributor });
  const run = useRunRouteBatches();
  const counts = data?.counts;
  const tabCounts: Record<string, number | null> = {
    all: counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null,
    offered: counts ? (counts.offered ?? 0) : null,
    assigned: counts ? (counts.assigned ?? 0) : null,
    completed: counts ? (counts.completed ?? 0) : null,
    dissolved: counts ? (counts.dissolved ?? 0) : null,
  };

  const handleRun = async () => {
    const ok = await confirm({
      title: '¿Armar los lotes ahora?',
      text: 'Agrupa los pedidos programados que cumplen los parámetros y le ofrece cada lote completo al chofer más cercano, sin esperar la frecuencia del proceso. Sólo corre si los recorridos están encendidos en los parámetros.',
      confirmText: 'Armar ahora',
    });
    if (!ok) return;
    run.mutate(undefined, {
      onSuccess: (r) =>
        notify.success(
          r.batches > 0
            ? `${r.batches} lote(s) armado(s) con ${r.orders} pedido(s) de ${r.candidates} candidato(s)`
            : `No se armó ningún lote (${r.candidates} pedido(s) candidato(s))`,
        ),
      onError: notify.error,
    });
  };

  const columns = useMemo<GridColDef<RouteBatch>[]>(
    () => [
      {
        field: 'batch',
        headerName: 'Recorrido',
        flex: 1,
        minWidth: 190,
        renderCell: ({ row }) => (
          <IdentityCell
            title={formatShortId(row.batchId)}
            subtitle={`${stopCountOf(row)} paradas · ${formatKg(row.totalWeightKg)}`}
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 140,
        renderCell: ({ row }) => <Badge label={ROUTE_BATCH_STATUS[row.status]} variant="critical" />,
      },
      {
        field: 'holder',
        headerName: 'Chofer',
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => {
          const holder = holderOf(row);
          return (
            <div className="leading-tight">
              <span className="block text-ink">{holder.title}</span>
              <span className="block text-[11.5px] text-muted">{holder.subtitle}</span>
            </div>
          );
        },
      },
      {
        field: 'createdAt',
        headerName: 'Armado',
        width: 170,
        renderCell: ({ row }) => formatDateTime(row.createdAt),
      },
      {
        field: 'actions',
        headerName: '',
        width: 72,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={`Recorrido ${formatShortId(row.batchId)}`}
            onView={() => setFilters({ batch: row.batchId })}
          />
        ),
      },
    ],
    [setFilters],
  );

  return (
    <PageContainer size="lg" stack>
      <PageHeader
        title="Recorridos"
        description="Los pedidos programados que el sistema agrupa en un lote ordenado y le ofrece completo a un chofer."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<SlidersHorizontal />}
              disabled={needsDistributor}
              loading={configuring && !settings.data && !settings.error}
              onClick={() => setConfiguring(true)}
            >
              Parámetros
            </Button>
            <Button
              icon={<Play />}
              loading={run.isPending}
              disabled={!canWrite || needsDistributor}
              title={writeHint}
              onClick={() => void handleRun()}
            >
              Armar ahora
            </Button>
          </>
        }
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            icon={RouteIcon}
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus recorridos."
          />
        </Card>
      ) : (
        <Card className="p-4">
          <StatusFilterTabs
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) => {
              setPagination((p) => ({ ...p, page: 0 }));
              setFilters({ status: value });
            }}
            counts={tabCounts}
            label="Estado de los recorridos"
            idPrefix="route-batches"
            allLabel="Todos"
          >
            {error && !data ? (
              <ErrorState error={error} resource="Los recorridos" onRetry={() => void refetch()} />
            ) : (
              <ResponsiveTable
                rows={data?.data ?? []}
                columns={columns}
                getRowId={(row) => row.batchId}
                label="recorridos"
                loading={isFetching && !data}
                pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
                onRowClick={(row) => setFilters({ batch: row.batchId })}
                empty={
                  <EmptyState
                    icon={RouteIcon}
                    title="No hay recorridos"
                    description="El sistema arma un recorrido cuando hay pedidos programados cercanos, de franjas parecidas y sin chofer."
                  />
                }
                renderCard={(row) => {
                  const holder = holderOf(row);
                  return (
                    <button
                      type="button"
                      onClick={() => setFilters({ batch: row.batchId })}
                      className="w-full rounded-xl border border-outline p-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-sm text-ink">{formatShortId(row.batchId)}</span>
                        <Badge label={ROUTE_BATCH_STATUS[row.status]} variant="critical" />
                      </div>
                      <p className="mt-1 text-sm text-ink">
                        {stopCountOf(row)} paradas · {formatKg(row.totalWeightKg)}
                      </p>
                      <p className="text-xs text-muted">{holder.title}</p>
                      <p className="text-xs text-muted">{holder.subtitle}</p>
                    </button>
                  );
                }}
              />
            )}
          </StatusFilterTabs>
        </Card>
      )}
      <RouteBatchDrawer batchId={batchParam || null} onClose={() => setFilters({ batch: '' })} />
      {configuring && settings.data && (
        <RouteBatchSettingsModal
          config={settings.data}
          canWrite={canWrite}
          writeHint={writeHint}
          onClose={() => setConfiguring(false)}
        />
      )}
    </PageContainer>
  );
};
