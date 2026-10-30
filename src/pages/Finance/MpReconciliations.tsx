import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Plus, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  TableToolbar,
} from '../../common/components/ui';
import { FROM_LIST_STATE, useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { MpReconciliation } from '../../services/api/types';
import { useMpReconciliationStatusCounts, useMpReconciliations } from '../../services/queries/mpReconciliation';
import { formatCurrencyExact, formatDateTime, formatDay } from '../../utils/format';
import { MP_RECONCILIATION_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { DistributorRequired } from '../Configuration/components/DistributorRequired';
import { MpReconciliationFormModal } from './components/MpReconciliationFormModal';

const period = (row: MpReconciliation) => `${formatDay(row.from)} al ${formatDay(row.to)}`;

/** Cuántas diferencias sin asentar tiene una corrida lista (las informativas no cuentan). */
const differenceCount = (row: MpReconciliation): number =>
  row.summary ? Object.values(row.summary.differences).reduce((a, n) => a + n, 0) : 0;

const differencesText = (row: MpReconciliation): string => {
  if (row.status === 'failed') return row.failureReason ?? 'Falló';
  if (row.status === 'requested') return 'Esperando el reporte';
  const n = differenceCount(row);
  return n === 0 ? 'Sin diferencias' : `${n} ${n === 1 ? 'diferencia' : 'diferencias'}`;
};

/** Conciliaciones de la caja de Mercado Pago contra el reporte de liberaciones. */
export const MpReconciliations = () => {
  const navigate = useNavigate();
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ status: '' }, 10);
  const status = statusParam(MP_RECONCILIATION_STATUS, filters.status);
  const { data, isFetching, error, refetch } = useMpReconciliations(
    pagination,
    { status: status || undefined },
    { enabled: !needsDistributor },
  );
  const statusCounts = useMpReconciliationStatusCounts(!needsDistributor);
  const [creating, setCreating] = useState(false);

  const goTo = (row: MpReconciliation) =>
    navigate(`/finance/mp-reconciliation/${row.reconciliationId}`, { state: FROM_LIST_STATE });

  const columns: GridColDef<MpReconciliation>[] = [
    {
      field: 'from',
      headerName: 'Conciliación',
      flex: 1.2,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={period(row)} subtitle={`Pedida el ${formatDateTime(row.createdAt)}`} icon={Scale} />
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 200,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(MP_RECONCILIATION_STATUS, row.status)} />,
    },
    {
      field: 'differences',
      headerName: 'Diferencias',
      flex: 1,
      minWidth: 180,
      sortable: false,
      valueGetter: ({ row }) => differencesText(row),
    },
    {
      field: 'net',
      headerName: 'Neto de Mercado Pago',
      width: 180,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => (row.summary ? formatCurrencyExact(row.summary.mp.net) : '—'),
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => <RowActions rowLabel={`conciliación ${period(row)}`} onView={() => goTo(row)} />,
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Conciliación con Mercado Pago"
        description="Compará la caja de Mercado Pago con el reporte de liberaciones de la cuenta: cobros, comisiones, impuestos, devoluciones y retiros."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nueva conciliación
          </Button>
        }
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : (
        <Card>
          <StatusFilterTabs
            options={statusOptions(MP_RECONCILIATION_STATUS)}
            value={status}
            onChange={(next) => setFilters({ status: next })}
            counts={statusCounts}
            label="Filtrar conciliaciones por estado"
            idPrefix="mp-reconciliations"
          >
            <TableToolbar noun={['conciliación', 'conciliaciones']} />
            {error ? (
              <ErrorState error={error} resource="Las conciliaciones" onRetry={() => void refetch()} />
            ) : (
              <ResponsiveTable
                label="conciliaciones"
                rows={data?.data ?? []}
                columns={columns}
                getRowId={(row) => row.reconciliationId}
                loading={isFetching}
                pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
                onRowClick={goTo}
                empty={
                  status ? (
                    <EmptyState illustration="search" title="Sin resultados" description="Probá con otro estado." />
                  ) : (
                    <EmptyState
                      icon={Scale}
                      title="Todavía no conciliaste con Mercado Pago"
                      description="Pedí una conciliación para ver qué le falta a la caja."
                    />
                  )
                }
                renderCard={(row) => (
                  <>
                    <IdentityCell
                      title={period(row)}
                      subtitle={`Pedida el ${formatDateTime(row.createdAt)}`}
                      icon={Scale}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={labelOf(MP_RECONCILIATION_STATUS, row.status)} />
                      <span className="text-sm text-muted">{differencesText(row)}</span>
                    </div>
                    <div>
                      <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                        Ver conciliación
                      </Button>
                    </div>
                  </>
                )}
              />
            )}
          </StatusFilterTabs>
        </Card>
      )}
      <MpReconciliationFormModal open={creating} onClose={() => setCreating(false)} />
    </PageContainer>
  );
};
