import type { GridColDef } from '@mui/x-data-grid';
import { BookOpen } from 'lucide-react';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  ResponsiveTable,
  Select,
  PageContainer,
  TableToolbar,
  DateRangeFilter,
} from '../../common/components/ui';
import { useClampPage, useUrlPagedParams } from '../../hooks';
import type { StockMovement } from '../../services/api/types';
import { useStockLocations, useStockMovements } from '../../services/queries/stock';
import { formatDateTime } from '../../utils/format';
import { MOVEMENT_REASON, STOCK_CONDITION, labelOf } from '../../utils/statusLabels';
import { placeName } from './stockMath';

const REASON_OPTIONS = [
  { value: '', label: 'Todos los motivos' },
  ...(Object.keys(MOVEMENT_REASON) as StockMovement['reason'][]).map((r) => ({
    value: r,
    label: MOVEMENT_REASON[r].text,
  })),
];

const detail = (m: StockMovement) =>
  `${m.quantity} ${m.gasCylinderType} · ${placeName(m.from)} (${labelOf(STOCK_CONDITION, m.fromCondition).text}) → ${placeName(m.to)} (${labelOf(STOCK_CONDITION, m.toCondition).text})`;

/** El libro de movimientos de stock: sólo se agrega, nunca se edita. Filtros por fecha, motivo y ubicación. */
export const Movements = () => {
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { from: '', to: '', reason: '', location: '' },
    25,
  );
  const locations = useStockLocations();
  const { data, isFetching, error, refetch } = useStockMovements(pagination, {
    from: filters.from || undefined,
    to: filters.to || undefined,
    reason: (filters.reason || undefined) as StockMovement['reason'] | undefined,
    locationId: filters.location || undefined,
  });
  const change = (patch: Partial<typeof filters>) => {
    setFilters(patch);
  };
  const locationName = (locations.data ?? []).find((l) => l.locationId === filters.location)?.name ?? 'Ubicación';
  const chips = [
    ...(filters.reason
      ? [{ key: 'reason', label: labelOf(MOVEMENT_REASON, filters.reason as StockMovement['reason']).text }]
      : []),
    ...(filters.location ? [{ key: 'location', label: locationName }] : []),
    ...(filters.from ? [{ key: 'from', label: `Desde ${filters.from}` }] : []),
    ...(filters.to ? [{ key: 'to', label: `Hasta ${filters.to}` }] : []),
  ];

  const columns: GridColDef<StockMovement>[] = [
    {
      field: 'occurredAt',
      headerName: 'Movimiento',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={formatDateTime(row.occurredAt)} subtitle={row.actorName ?? 'Sistema'} icon={BookOpen} />
      ),
    },
    {
      field: 'reason',
      headerName: 'Motivo',
      width: 200,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(MOVEMENT_REASON, row.reason)} />,
    },
    {
      field: 'detail',
      headerName: 'Garrafas',
      flex: 2,
      minWidth: 320,
      sortable: false,
      renderCell: ({ row }) => <span className="truncate text-ink">{detail(row)}</span>,
    },
    {
      field: 'notes',
      headerName: 'Nota',
      flex: 1,
      minWidth: 140,
      sortable: false,
      valueGetter: ({ row }) => row.notes ?? '—',
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Libro de movimientos"
        description="Cada entrada, salida y traslado de garrafas. Un error se corrige con un contraasiento: nada se borra."
      />
      <Card>
        <TableToolbar
          filters={
            <>
              <DateRangeFilter from={filters.from} to={filters.to} onChange={(range) => change({ ...range })} />
              <Select
                label="Motivo"
                options={REASON_OPTIONS}
                value={filters.reason}
                onChange={(e) => change({ reason: e.target.value })}
              />
              <Select
                label="Ubicación"
                options={[
                  { value: '', label: 'Todas las ubicaciones' },
                  ...(locations.data ?? []).map((l) => ({
                    value: l.locationId,
                    label: `${l.kind === 'warehouse' ? 'Galpón' : 'Camión'} · ${l.name}`,
                  })),
                ]}
                hint={locations.isError ? 'No se pudieron cargar las ubicaciones' : undefined}
                value={filters.location}
                onChange={(e) => change({ location: e.target.value })}
              />
            </>
          }
          chips={chips}
          onRemoveChip={(key) => change({ [key]: '' })}
          onClearChips={() => change({ from: '', to: '', reason: '', location: '' })}
          resultCount={data?.total}
          noun={['movimiento', 'movimientos']}
        />
        {error ? (
          <ErrorState error={error} resource="Los movimientos" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="movimientos"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.movementId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            empty={
              chips.length > 0 ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otros filtros." />
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title="El libro está vacío"
                  description="Todavía no hay movimientos de stock."
                />
              )
            }
            renderCard={(row) => (
              <>
                <div className="flex items-center justify-between gap-2">
                  <Badge label={labelOf(MOVEMENT_REASON, row.reason)} />
                  <span className="text-xs text-muted">{formatDateTime(row.occurredAt)}</span>
                </div>
                <p className="break-words text-sm text-ink">{detail(row)}</p>
                {row.notes && <p className="text-sm text-muted">{row.notes}</p>}
                <p className="text-xs text-muted">{row.actorName ?? 'Sistema'}</p>
              </>
            )}
          />
        )}
      </Card>
    </PageContainer>
  );
};
