import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Hourglass, Landmark, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Checkbox,
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
import { FROM_LIST_STATE, useClampPage, useDebounce, usePermissions, useUrlPagedParams } from '../../hooks';
import { customerAccountQuery } from '../../services/api/finance';
import type { CustomerAccount } from '../../services/api/types';
import { useCustomerAccounts, useCustomerAccountStatusCounts } from '../../services/queries/finance';
import { formatCurrency } from '../../utils/format';
import { ACCOUNT_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { FinanceSummary } from './components/FinanceSummary';
import { CustomerAccountFormModal } from './components/CustomerAccountFormModal';

/** Cuentas corrientes de los clientes: saldo, crédito disponible y deuda vencida (CU-235, 238). */
export const CustomerAccounts = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ q: '', status: '', overdue: '' }, 10);
  // Un estado inválido en la URL (enlace viejo o escrito a mano) se trata como «todos», en la consulta y en las pestañas.
  const status = statusParam(ACCOUNT_STATUS, filters.status);
  const q = useDebounce(filters.q, 300);
  const listFilters = {
    q: q || undefined,
    status: status || undefined,
    overdue: filters.overdue === '1' ? true : undefined,
  };
  const { data, isFetching, error, refetch } = useCustomerAccounts(pagination, listFilters);
  const [creating, setCreating] = useState(false);
  const filtered = Boolean(filters.q || status || filters.overdue);

  const goTo = (row: CustomerAccount) => navigate(`/finance/accounts/${row.accountId}`, { state: FROM_LIST_STATE });

  const statusCounts = useCustomerAccountStatusCounts({
    q: q || undefined,
    overdue: filters.overdue === '1' ? true : undefined,
  });

  const columns: GridColDef<CustomerAccount>[] = [
    {
      field: 'businessName',
      headerName: 'Cuenta',
      flex: 1.4,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={row.businessName}
          subtitle={row.customerName || row.customerEmail || undefined}
          icon={Landmark}
        />
      ),
    },
    {
      field: 'balance',
      headerName: 'Saldo',
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => formatCurrency(row.balance),
    },
    {
      field: 'availableCredit',
      headerName: 'Disponible',
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => (
        <span className={row.availableCredit < 0 ? 'text-danger' : undefined}>
          {formatCurrency(row.availableCredit)}
        </span>
      ),
    },
    {
      field: 'overdueAmount',
      headerName: 'Vencido',
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => (
        <span className={row.overdueAmount > 0 ? 'font-semibold text-danger' : undefined}>
          {formatCurrency(row.overdueAmount)}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 120,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(ACCOUNT_STATUS, row.status)} />,
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => <RowActions rowLabel={`cuenta ${row.businessName}`} onView={() => goTo(row)} />,
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Cuentas corrientes"
        description="Los clientes que compran a crédito: lo que deben, lo que pueden comprar y lo que ya venció."
        actions={
          <>
            <Link
              to="/finance/accounts/aging"
              className="inline-flex h-[38px] items-center gap-2 rounded-[10px] border border-outline bg-surface px-[15px] text-[13px] text-ink shadow-control hover:bg-surface-hover"
            >
              <Hourglass aria-hidden="true" className="h-4 w-4" />
              Antigüedad de la deuda
            </Link>
            <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
              Habilitar cuenta
            </Button>
          </>
        }
      />
      <FinanceSummary kind="accounts" />
      <Card>
        <StatusFilterTabs
          options={statusOptions(ACCOUNT_STATUS)}
          value={status}
          onChange={(status) => setFilters({ status })}
          counts={statusCounts}
          label="Filtrar cuentas por estado"
          idPrefix="customer-accounts"
        >
          <TableToolbar
            resultCount={data?.total}
            filters={
              <>
                <Checkbox
                  label="Con deuda vencida"
                  checked={filters.overdue === '1'}
                  onChange={(e) => setFilters({ overdue: e.target.checked ? '1' : '' })}
                />
              </>
            }
            search={{
              label: 'Buscar cuentas',
              placeholder: 'Razón social, CUIT, nombre o correo',
              value: filters.q,
              onChange: (value) => setFilters({ q: value }),
            }}
            serverExport={{
              resource: 'cuentas-corrientes',
              params: customerAccountQuery(listFilters),
            }}
            noun={['cuenta', 'cuentas']}
          />
          {error ? (
            <ErrorState error={error} resource="Las cuentas corrientes" onRetry={() => void refetch()} />
          ) : (
            <ResponsiveTable
              label="cuentas corrientes"
              rows={data?.data ?? []}
              columns={columns}
              getRowId={(row) => row.accountId}
              loading={isFetching}
              pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
              onRowClick={goTo}
              empty={
                filtered ? (
                  <EmptyState
                    illustration="search"
                    title="Sin resultados"
                    description="Probá con otra búsqueda o filtro."
                  />
                ) : (
                  <EmptyState
                    icon={Landmark}
                    title="Todavía no hay cuentas corrientes"
                    description="Habilitá la primera para poder venderle a crédito a un cliente."
                  />
                )
              }
              renderCard={(row) => (
                <>
                  <IdentityCell title={row.businessName} subtitle={row.customerName || undefined} icon={Landmark} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={labelOf(ACCOUNT_STATUS, row.status)} />
                    <span className="tabular-nums text-sm">Saldo {formatCurrency(row.balance)}</span>
                    {row.overdueAmount > 0 && (
                      <span className="tabular-nums text-sm text-danger">
                        Vencido {formatCurrency(row.overdueAmount)}
                      </span>
                    )}
                  </div>
                  <div>
                    <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                      Ver cuenta
                    </Button>
                  </div>
                </>
              )}
            />
          )}
        </StatusFilterTabs>
      </Card>
      <CustomerAccountFormModal open={creating} onClose={() => setCreating(false)} account={null} />
    </PageContainer>
  );
};
