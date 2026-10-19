import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { HandCoins, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  Input,
  PageHeader,
  ResponsiveTable,
  RowActions,
  ExportCsvButton,
  StatusFilterTabs,
} from '../../common/components/ui';
import { FROM_LIST_STATE, useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { DriverSettlement } from '../../services/api/types';
import { useDriverSettlements, useSettlementCounts } from '../../services/queries/finance';
import { toIsoDay } from '../../utils/dates';
import { formatCurrency, formatDay } from '../../utils/format';
import { SETTLEMENT_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { FinanceSummary } from './components/FinanceSummary';
import { OpenSettlementModal } from './components/OpenSettlementModal';
import { csvDay } from '../../utils/csv';

const differenceText = (row: DriverSettlement) =>
  row.difference === null ? '—' : row.difference === 0 ? 'Sin diferencia' : formatCurrency(row.difference);

/** Rendiciones del día por chofer: esperado, declarado, diferencia y estado (CU-231, 233, 330). */
export const DriverSettlements = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { date: toIsoDay(new Date()), status: '', all: '' },
    10,
  );
  // Un estado inválido en la URL (enlace viejo o escrito a mano) se trata como «todos», en la consulta y en las pestañas.
  const status = statusParam(SETTLEMENT_STATUS, filters.status);
  const { data, isFetching, error, refetch } = useDriverSettlements(pagination, {
    date: filters.all === '1' ? undefined : filters.date || undefined,
    status: status || undefined,
  });
  const [creating, setCreating] = useState(false);

  const goTo = (row: DriverSettlement) =>
    navigate(`/finance/settlements/${row.settlementId}`, { state: FROM_LIST_STATE });

  // «Todos los días» no tiene un día de tablero: sin él se cuenta estado por estado y no se muestran las cifras del día.
  const day = filters.all === '1' ? undefined : filters.date || undefined;
  const statusCounts = useSettlementCounts(day);

  const columns: GridColDef<DriverSettlement>[] = [
    {
      field: 'driverName',
      headerName: 'Chofer',
      flex: 1.2,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={row.driverName || 'Chofer'}
          subtitle={`N° ${row.number} · ${formatDay(row.businessDate)}`}
          avatarName={row.driverName || 'Chofer'}
        />
      ),
    },
    {
      field: 'expected',
      headerName: 'Esperado',
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => formatCurrency(row.expectedCash),
    },
    {
      field: 'declared',
      headerName: 'Declarado',
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => (row.declaredCash === null ? '—' : formatCurrency(row.declaredCash)),
    },
    {
      field: 'difference',
      headerName: 'Diferencia',
      width: 140,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => (
        <span className={row.difference && row.difference < 0 ? 'text-danger' : undefined}>{differenceText(row)}</span>
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(SETTLEMENT_STATUS, row.status)} />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => <RowActions rowLabel={`rendición N° ${row.number}`} onView={() => goTo(row)} />,
    },
  ];

  useClampPage(pagination, data?.total, setPagination);
  const filtered = Boolean(status || filters.all);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Rendiciones"
        description="Lo que cada chofer cobró en efectivo y lo que entrega al volver."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Abrir rendición
          </Button>
        }
      />
      {day && <FinanceSummary kind="settlements" date={day} />}
      <Card>
        <StatusFilterTabs
          options={statusOptions(SETTLEMENT_STATUS)}
          value={status}
          onChange={(status) => setFilters({ status })}
          counts={statusCounts}
          label="Filtrar rendiciones por estado"
          idPrefix="driver-settlements"
        >
          <div className="grid grid-cols-1 items-end gap-3 border-b border-outline p-4 sm:grid-cols-2">
            <Input
              label="Día"
              type="date"
              value={filters.date}
              disabled={filters.all === '1'}
              onChange={(e) => setFilters({ date: e.target.value, all: '' })}
            />
            <Button
              variant="secondary"
              onClick={() => setFilters(filters.all === '1' ? { all: '' } : { all: '1', date: '' })}
            >
              {filters.all === '1' ? 'Ver sólo un día' : 'Ver todos los días'}
            </Button>
          </div>
          <div className="flex justify-end border-b border-outline px-4 py-2">
            <ExportCsvButton
              filename="rendiciones"
              headers={['Rendición', 'Chofer', 'Fecha', 'Esperado', 'Declarado', 'Diferencia', 'Estado']}
              rows={(data?.data ?? []).map((row) => [
                row.number,
                row.driverName,
                csvDay(row.businessDate),
                row.expectedCash,
                row.declaredCash ?? '',
                row.difference ?? '',
                labelOf(SETTLEMENT_STATUS, row.status).text,
              ])}
            />
          </div>
          {error ? (
            <ErrorState error={error} resource="Las rendiciones" onRetry={() => void refetch()} />
          ) : (
            <ResponsiveTable
              label="rendiciones"
              rows={data?.data ?? []}
              columns={columns}
              getRowId={(row) => row.settlementId}
              loading={isFetching}
              pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
              onRowClick={goTo}
              empty={
                filtered || filters.date ? (
                  <EmptyState
                    illustration="search"
                    title="Sin rendiciones"
                    description="No hay rendiciones para ese día o estado. De noche el sistema abre las de los choferes con efectivo sin rendir."
                  />
                ) : (
                  <EmptyState icon={HandCoins} title="Todavía no hay rendiciones" />
                )
              }
              renderCard={(row) => (
                <>
                  <IdentityCell
                    title={row.driverName || 'Chofer'}
                    subtitle={`N° ${row.number} · ${formatDay(row.businessDate)}`}
                    avatarName={row.driverName || 'Chofer'}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={labelOf(SETTLEMENT_STATUS, row.status)} />
                    <span className="font-mono text-sm">Esperado {formatCurrency(row.expectedCash)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                      Ver rendición
                    </Button>
                  </div>
                </>
              )}
            />
          )}
        </StatusFilterTabs>
      </Card>
      <OpenSettlementModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
};
