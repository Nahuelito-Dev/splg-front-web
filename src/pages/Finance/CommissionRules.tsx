import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Percent, Plus } from 'lucide-react';
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
  PageContainer,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { CommissionRule } from '../../services/api/types';
import { useCommissionRules } from '../../services/queries/finance';
import { formatCurrency, formatDay } from '../../utils/format';
import { COMMISSION_BASIS, labelOf } from '../../utils/statusLabels';
import { CommissionRuleFormModal } from './components/CommissionRuleFormModal';

const valueText = (rule: CommissionRule) =>
  rule.basis === 'percent_of_total' ? `${rule.value} %` : formatCurrency(rule.value);

const periodText = (rule: CommissionRule) =>
  `Desde ${formatDay(rule.validFrom)}${rule.validTo ? ` hasta ${formatDay(rule.validTo)}` : ', sin fin'}`;

/** Reglas de comisión por entrega (CU-240, CU-333). */
export const CommissionRules = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ active: '' }, 10);
  const { data, isFetching, error, refetch } = useCommissionRules(pagination, { activeOnly: filters.active === '1' });
  const [editing, setEditing] = useState<CommissionRule | null>(null);
  const [creating, setCreating] = useState(false);

  const scope = (rule: CommissionRule) =>
    `${rule.employeeName ?? 'Todos los choferes'} · ${rule.gasCylinderType ?? 'todos los productos'}`;

  const columns: GridColDef<CommissionRule>[] = [
    {
      field: 'scope',
      headerName: 'Alcance',
      flex: 1.4,
      minWidth: 260,
      sortable: false,
      renderCell: ({ row }) => <IdentityCell title={scope(row)} subtitle={periodText(row)} icon={Percent} />,
    },
    {
      field: 'basis',
      headerName: 'Base',
      width: 170,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(COMMISSION_BASIS, row.basis)} />,
    },
    {
      field: 'value',
      headerName: 'Valor',
      width: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({ row }) => valueText(row),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <Badge label={row.isActive ? { text: 'Activa', tone: 'success' } : { text: 'Inactiva', tone: 'neutral' }} />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions rowLabel={`regla ${scope(row)}`} onEdit={canWrite ? () => setEditing(row) : undefined} />
      ),
    },
  ];

  useClampPage(pagination, data?.total, setPagination);

  return (
    <PageContainer>
      <PageHeader
        title="Reglas de comisión"
        description="Cuánto cobra un chofer por cada entrega. Cada asiento guarda la regla con que se calculó."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nueva regla
          </Button>
        }
      />
      <Card>
        <div className="border-b border-outline p-4">
          <Checkbox
            label="Sólo las activas"
            checked={filters.active === '1'}
            onChange={(e) => setFilters({ active: e.target.checked ? '1' : '' })}
          />
        </div>
        {error ? (
          <ErrorState error={error} resource="Las reglas" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="reglas de comisión"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.ruleId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            empty={
              <EmptyState
                icon={Percent}
                title="Todavía no hay reglas"
                description="Sin una regla vigente, las entregas no generan comisión."
              />
            }
            renderCard={(row) => (
              <>
                <IdentityCell title={scope(row)} subtitle={periodText(row)} icon={Percent} />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={labelOf(COMMISSION_BASIS, row.basis)} />
                  <span className="tabular-nums text-sm">{valueText(row)}</span>
                  {!row.isActive && <Badge label={{ text: 'Inactiva', tone: 'neutral' }} />}
                </div>
                {canWrite && (
                  <div>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                      Editar
                    </Button>
                  </div>
                )}
              </>
            )}
          />
        )}
      </Card>
      <CommissionRuleFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        rule={editing}
      />
    </PageContainer>
  );
};
