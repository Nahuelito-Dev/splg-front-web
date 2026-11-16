import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Plus, ReceiptText } from 'lucide-react';
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
} from '../../common/components/ui';
import { FROM_LIST_STATE, useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import { liquidationQuery } from '../../services/api/finance';
import type { DriverLiquidation } from '../../services/api/types';
import { useDriverLiquidations, useLiquidationStatusCounts } from '../../services/queries/finance';
import { formatCurrency, formatDay } from '../../utils/format';
import { LIQUIDATION_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { LiquidationFormModal } from './components/LiquidationFormModal';

/** Liquidaciones de comisiones de los choferes (CU-242, 243, 334, 335). */
export const DriverLiquidations = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ status: '' }, 10);
  // Un estado inválido en la URL (enlace viejo o escrito a mano) se trata como «todos», en la consulta y en las pestañas.
  const status = statusParam(LIQUIDATION_STATUS, filters.status);
  const listFilters = {
    status: status || undefined,
  };
  const { data, isFetching, error, refetch } = useDriverLiquidations(pagination, listFilters);
  const [creating, setCreating] = useState(false);

  const goTo = (row: DriverLiquidation) =>
    navigate(`/finance/liquidations/${row.liquidationId}`, { state: FROM_LIST_STATE });
  const period = (row: DriverLiquidation) => `${formatDay(row.periodFrom)} al ${formatDay(row.periodTo)}`;

  const statusCounts = useLiquidationStatusCounts();

  const columns: GridColDef<DriverLiquidation>[] = [
    {
      field: 'employeeName',
      headerName: 'Liquidación',
      flex: 1.3,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={`N° ${row.number} · ${row.employeeName}`}
          subtitle={period(row)}
          avatarName={row.employeeName}
          person={{ employeeId: row.employeeId }}
        />
      ),
    },
    {
      field: 'gross',
      headerName: 'Bruto',
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => formatCurrency(row.gross),
    },
    {
      field: 'deductions',
      headerName: 'Deducciones',
      width: 140,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => formatCurrency(row.deductions),
    },
    {
      field: 'net',
      headerName: 'Neto',
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => formatCurrency(row.net),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 120,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(LIQUIDATION_STATUS, row.status)} />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => <RowActions rowLabel={`liquidación N° ${row.number}`} onView={() => goTo(row)} />,
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Liquidaciones"
        description="El pago de las comisiones de cada chofer: se arma en borrador, se aprueba y se paga desde una caja."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Liquidar comisiones
          </Button>
        }
      />
      <Card>
        <StatusFilterTabs
          options={statusOptions(LIQUIDATION_STATUS)}
          value={status}
          onChange={(status) => setFilters({ status })}
          counts={statusCounts}
          label="Filtrar liquidaciones por estado"
          idPrefix="driver-liquidations"
        >
          <TableToolbar
            serverExport={{
              resource: 'liquidaciones',
              params: liquidationQuery(listFilters),
            }}
            noun={['liquidación', 'liquidaciones']}
          />
          {error ? (
            <ErrorState error={error} resource="Las liquidaciones" onRetry={() => void refetch()} />
          ) : (
            <ResponsiveTable
              label="liquidaciones"
              rows={data?.data ?? []}
              columns={columns}
              getRowId={(row) => row.liquidationId}
              loading={isFetching}
              pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
              onRowClick={goTo}
              empty={
                status ? (
                  <EmptyState illustration="search" title="Sin resultados" description="Probá con otro estado." />
                ) : (
                  <EmptyState icon={ReceiptText} title="Todavía no hay liquidaciones" />
                )
              }
              renderCard={(row) => (
                <>
                  <IdentityCell
                    title={`N° ${row.number} · ${row.employeeName}`}
                    subtitle={period(row)}
                    icon={ReceiptText}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={labelOf(LIQUIDATION_STATUS, row.status)} />
                    <span className="font-mono text-sm">Neto {formatCurrency(row.net)}</span>
                  </div>
                  <div>
                    <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                      Ver liquidación
                    </Button>
                  </div>
                </>
              )}
            />
          )}
        </StatusFilterTabs>
      </Card>
      <LiquidationFormModal open={creating} onClose={() => setCreating(false)} />
    </PageContainer>
  );
};
