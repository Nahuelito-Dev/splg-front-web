import type { GridColDef } from '@mui/x-data-grid';
import { ClipboardList, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
  PageContainer,
  TableToolbar,
  DateRangeFilter,
} from '../../common/components/ui';
import { FROM_LIST_STATE, useClampPage, useUrlPagedParams, usePermissions } from '../../hooks';
import type { StockAdjustment } from '../../services/api/types';
import { useAdjustments } from '../../services/queries/stock';
import { formatDateTime } from '../../utils/format';
import { ADJUSTMENT_REASON, labelOf } from '../../utils/statusLabels';
import { AdjustmentFormModal } from './components/AdjustmentFormModal';

const REASON_FILTER = [
  { value: '', label: 'Todos los motivos' },
  ...(Object.keys(ADJUSTMENT_REASON) as StockAdjustment['reason'][]).map((r) => ({
    value: r,
    label: ADJUSTMENT_REASON[r].text,
  })),
];

const summaryOf = (adjustment: StockAdjustment): string =>
  adjustment.items.map((i) => `${i.quantityDelta > 0 ? '+' : ''}${i.quantityDelta} ${i.gasCylinderType}`).join(' · ');

/** Ajustes de stock: el listado, el alta y el detalle con sus adjuntos. */
export const Adjustments = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { reason: '', from: '', to: '', new: '' },
    10,
  );
  const { data, isFetching, error, refetch } = useAdjustments(pagination, {
    reason: (filters.reason || undefined) as StockAdjustment['reason'] | undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });
  const goTo = (row: StockAdjustment) => navigate(`/stock/adjustments/${row.adjustmentId}`, { state: FROM_LIST_STATE });

  const chips = [
    ...(filters.reason
      ? [{ key: 'reason', label: labelOf(ADJUSTMENT_REASON, filters.reason as StockAdjustment['reason']).text }]
      : []),
    ...(filters.from ? [{ key: 'from', label: `Desde ${filters.from}` }] : []),
    ...(filters.to ? [{ key: 'to', label: `Hasta ${filters.to}` }] : []),
  ];
  const change = (patch: Partial<typeof filters>) => {
    setFilters(patch);
  };

  const columns: GridColDef<StockAdjustment>[] = [
    {
      field: 'number',
      headerName: 'Ajuste',
      flex: 1,
      minWidth: 190,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={`N° ${row.number}`} subtitle={formatDateTime(row.createdAt)} icon={ClipboardList} />
      ),
    },
    {
      field: 'reason',
      headerName: 'Motivo',
      width: 190,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(ADJUSTMENT_REASON, row.reason)} />,
    },
    {
      field: 'location',
      headerName: 'Ubicación',
      flex: 1,
      minWidth: 150,
      sortable: false,
      valueGetter: ({ row }) => row.location.name,
    },
    {
      field: 'items',
      headerName: 'Cambio',
      flex: 1.3,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => <span className="truncate tabular-nums text-xs">{summaryOf(row)}</span>,
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => <RowActions rowLabel={`ajuste ${row.number}`} onView={() => goTo(row)} />,
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Ajustes de stock"
        description="Mermas, fugas, roturas, pérdidas y correcciones. Cada ajuste lleva una nota y puede tener su foto o acta."
        actions={
          <Button
            icon={<Plus />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => setFilters({ new: '1' }, { keepPage: true })}
          >
            Nuevo ajuste
          </Button>
        }
      />
      <Card>
        <TableToolbar
          filters={
            <>
              <Select
                label="Motivo"
                options={REASON_FILTER}
                value={filters.reason}
                onChange={(e) => change({ reason: e.target.value })}
              />
              <DateRangeFilter from={filters.from} to={filters.to} onChange={(range) => change({ ...range })} />
            </>
          }
          chips={chips}
          onRemoveChip={(key) => change({ [key]: '' })}
          onClearChips={() => change({ reason: '', from: '', to: '' })}
          resultCount={data?.total}
          noun={['ajuste', 'ajustes']}
        />
        {error ? (
          <ErrorState error={error} resource="Los ajustes" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="ajustes"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.adjustmentId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={goTo}
            empty={
              chips.length > 0 ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otros filtros." />
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="Todavía no hay ajustes"
                  description="Cuando haya una merma, una fuga o una corrección, registrala acá."
                />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell
                  title={`N° ${row.number}`}
                  subtitle={formatDateTime(row.createdAt)}
                  icon={ClipboardList}
                />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge label={labelOf(ADJUSTMENT_REASON, row.reason)} />
                  <span className="text-muted">{row.location.name}</span>
                </div>
                <p className="tabular-nums text-xs text-ink">{summaryOf(row)}</p>
                <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                  Ver detalle
                </Button>
              </>
            )}
          />
        )}
      </Card>
      <AdjustmentFormModal
        open={filters.new === '1'}
        onClose={() => setFilters({ new: '' }, { keepPage: true })}
        onCreated={(adjustment) => navigate(`/stock/adjustments/${adjustment.adjustmentId}`)}
      />
    </PageContainer>
  );
};
