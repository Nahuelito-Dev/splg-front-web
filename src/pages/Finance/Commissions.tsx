import type { GridColDef } from '@mui/x-data-grid';
import { HandCoins } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Card,
  EmptyState,
  ExportCsvButton,
  ErrorState,
  FilterChips,
  Input,
  PageHeader,
  ResponsiveTable,
  Select,
} from '../../common/components/ui';
import { useClampPage, useUrlPagedParams } from '../../hooks';
import type { CommissionEntry } from '../../services/api/types';
import { useCommissionEntries } from '../../services/queries/finance';
import { useEmployees } from '../../services/queries/employees';
import { formatCurrency, formatDateTime, formatShortId } from '../../utils/format';
import { FinanceSummary } from './components/FinanceSummary';
import { COMMISSION_ENTRY_TYPE, labelOf } from '../../utils/statusLabels';
import { csvDateTime } from '../../utils/csv';

const LIQUIDATED = [
  { value: '', label: 'Liquidadas y pendientes' },
  { value: 'false', label: 'Pendientes de liquidar' },
  { value: 'true', label: 'Ya liquidadas' },
];

/** El libro de comisiones: lo devengado por entrega y las deducciones, con su total (CU-241). */
export const Commissions = () => {
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { employeeId: '', liquidated: '', from: '', to: '' },
    25,
  );
  const employees = useEmployees({ page: 0, pageSize: 100 }, { category: 'driver' });
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const { data, isFetching, error, refetch } = useCommissionEntries(pagination, {
    employeeId: filters.employeeId || undefined,
    liquidated: filters.liquidated === '' ? undefined : filters.liquidated === 'true',
    from: rangeInvalid ? undefined : filters.from || undefined,
    to: rangeInvalid ? undefined : filters.to || undefined,
  });
  const filtered = Boolean(filters.employeeId || filters.liquidated || filters.from || filters.to);

  const columns: GridColDef<CommissionEntry>[] = [
    {
      field: 'occurredAt',
      headerName: 'Fecha',
      width: 170,
      sortable: false,
      valueGetter: ({ row }) => formatDateTime(row.occurredAt),
    },
    { field: 'employeeName', headerName: 'Chofer', width: 190, sortable: false },
    {
      field: 'type',
      headerName: 'Asiento',
      flex: 1.2,
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
      field: 'liquidated',
      headerName: 'Liquidación',
      width: 140,
      sortable: false,
      renderCell: ({ row }) =>
        row.liquidationId ? (
          <Link className="text-primary underline" to={`/finance/liquidations/${row.liquidationId}`}>
            Ver liquidación
          </Link>
        ) : (
          <Badge label={{ text: 'Pendiente', tone: 'warn' }} />
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

  useClampPage(pagination, data?.total, setPagination);

  const chips = [
    filters.employeeId && { key: 'employeeId', label: 'Un chofer' },
    filters.liquidated && { key: 'liquidated', label: filters.liquidated === 'true' ? 'Liquidadas' : 'Pendientes' },
    filters.from && { key: 'from', label: `Desde ${filters.from}` },
    filters.to && { key: 'to', label: `Hasta ${filters.to}` },
  ].filter((c): c is { key: string; label: string } => Boolean(c));

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Comisiones"
        description="Lo que devengó cada chofer por sus entregas, menos las deducciones."
      />
      <FinanceSummary kind="commissions" />
      <Card>
        <div className="grid grid-cols-1 items-end gap-3 border-b border-outline p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Chofer"
            options={[
              { value: '', label: 'Todos los choferes' },
              ...(employees.data?.rows ?? []).map((e) => ({
                value: e.employeeId,
                label: `${e.firstName} ${e.lastName}`,
              })),
            ]}
            value={filters.employeeId}
            onChange={(e) => setFilters({ employeeId: e.target.value })}
          />
          <Select
            label="Liquidación"
            options={LIQUIDATED}
            value={filters.liquidated}
            onChange={(e) => setFilters({ liquidated: e.target.value })}
          />
          <Input
            label="Desde"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value })}
          />
          <Input
            label="Hasta"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ to: e.target.value })}
            error={rangeInvalid ? 'Anterior a la fecha inicial' : undefined}
          />
        </div>
        {chips.length > 0 && (
          <div className="border-b border-outline px-4 py-2">
            <FilterChips
              items={chips}
              resultCount={data?.total}
              onRemove={(key) => setFilters({ [key]: '' })}
              onClearAll={() => setFilters({ employeeId: '', liquidated: '', from: '', to: '' })}
            />
          </div>
        )}
        {data && (
          <p className="border-b border-outline px-5 py-2 text-sm text-muted">
            Total de los asientos que cumplen el filtro:{' '}
            <b className="font-mono text-ink">{formatCurrency(data.totalAmount)}</b>
          </p>
        )}
        <div className="flex justify-end border-b border-outline px-4 py-2">
          <ExportCsvButton
            filename="comisiones"
            headers={['Fecha', 'Chofer', 'Asiento', 'Pedido', 'Descripción', 'Liquidada', 'Importe']}
            rows={(data?.data ?? []).map((row) => [
              csvDateTime(row.occurredAt),
              row.employeeName,
              labelOf(COMMISSION_ENTRY_TYPE, row.type).text,
              row.orderId ? formatShortId(row.orderId) : '',
              row.description,
              row.liquidationId ? 'Sí' : 'No',
              row.amount,
            ])}
          />
        </div>
        {error ? (
          <ErrorState error={error} resource="Las comisiones" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="comisiones"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.entryId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            empty={
              filtered ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otros filtros." />
              ) : (
                <EmptyState
                  icon={HandCoins}
                  title="Todavía no hay comisiones"
                  description="Se devengan al entregar un pedido, si hay una regla vigente."
                />
              )
            }
            renderCard={(row) => (
              <>
                <div className="flex items-center justify-between gap-3">
                  <Badge label={labelOf(COMMISSION_ENTRY_TYPE, row.type)} />
                  <span className="font-mono">{formatCurrency(row.amount)}</span>
                </div>
                <div className="text-xs text-muted">
                  {row.employeeName} · {formatDateTime(row.occurredAt)}
                </div>
              </>
            )}
          />
        )}
      </Card>
    </div>
  );
};
