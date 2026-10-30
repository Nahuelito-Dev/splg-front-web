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
  PageHeader,
  ResponsiveTable,
  RowActions,
  StatusFilterTabs,
  PageContainer,
  TableToolbar,
  DayFilter,
} from '../../common/components/ui';
import { FROM_LIST_STATE, useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import { settlementQuery } from '../../services/api/finance';
import type { DriverSettlement } from '../../services/api/types';
import { useDriverSettlements, useSettlementCounts } from '../../services/queries/finance';
import { toIsoDay } from '../../utils/dates';
import { formatCurrency, formatDay } from '../../utils/format';
import { SETTLEMENT_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { FinanceSummary } from './components/FinanceSummary';
import { OpenSettlementModal } from './components/OpenSettlementModal';

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
  const listFilters = {
    date: filters.all === '1' ? undefined : filters.date || undefined,
    status: status || undefined,
  };
  const { data, isFetching, error, refetch } = useDriverSettlements(pagination, listFilters);
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
          person={{ deliveryId: row.deliveryId }}
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
    <PageContainer>
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
          <TableToolbar
            filters={
              <>
                <DayFilter
                  value={filters.date}
                  emptyLabel={filters.all === '1' ? 'Todos los días' : 'Hoy'}
                  disabled={filters.all === '1'}
                  onChange={(day) => setFilters({ date: day, all: '' })}
                />
                <Button
                  variant="secondary"
                  onClick={() => setFilters(filters.all === '1' ? { all: '' } : { all: '1', date: '' })}
                >
                  {filters.all === '1' ? 'Ver sólo un día' : 'Ver todos los días'}
                </Button>
              </>
            }
            serverExport={{
              resource: 'rendiciones',
              params: settlementQuery(listFilters),
            }}
            noun={['rendición', 'rendiciones']}
          />
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
                    person={{ deliveryId: row.deliveryId }}
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
    </PageContainer>
  );
};
