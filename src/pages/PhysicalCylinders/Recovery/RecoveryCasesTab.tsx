import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import {
  Badge,
  EmptyState,
  ErrorState,
  IdentityCell,
  ResponsiveTable,
  RowActions,
  Select,
  StatusFilterTabs,
  type StatusOption,
} from '../../../common/components/ui';
import { useUrlParams } from '../../../hooks';
import type { RecoveryCaseFilters } from '../../../services/api/recovery';
import type { RecoveryCase } from '../../../services/api/types';
import { useRecoveryCases } from '../../../services/queries/recovery';
import { formatCurrencyExact } from '../../../utils/format';
import { RECOVERY_CASE_STATUS, RECOVERY_STEP, nextStepText, recoveryStepText } from './recoveryLabels';
import { parseStep } from './recoveryRules';
import { RecoveryCaseDrawer } from './RecoveryCaseDrawer';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Esperan tu decisión', tone: 'danger' },
  { value: 'open', label: 'En aviso', tone: 'info' },
  { value: 'returned', label: 'Devueltos', tone: 'success' },
  { value: 'deposit_charged', label: 'Depósito a cobrar', tone: 'accent' },
  { value: 'written_off', label: 'Dados de baja', tone: 'neutral' },
  { value: 'closed_no_charge', label: 'Sin cargo', tone: 'neutral' },
];

const STEP_OPTIONS = [
  { value: '', label: 'Todos los escalones' },
  ...Object.entries(RECOVERY_STEP).map(([value, label]) => ({ value, label: `${value}. ${label}` })),
];

/** Los casos de recupero: lo que espera la decisión del administrador primero, y el resto por estado y escalón. */
export const RecoveryCasesTab = () => {
  const [{ status, step, customer, case: caseParam }, setFilters] = useUrlParams({
    status: '',
    step: '',
    customer: '',
    case: '',
  });
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const filters: RecoveryCaseFilters = {
    ...(status === 'pending' ? { pending: true } : status ? { status: status as RecoveryCase['status'] } : {}),
    ...(parseStep(step) ? { step: parseStep(step) } : {}),
    ...(customer ? { customerId: customer } : {}),
  };
  const { data, isFetching, error, refetch } = useRecoveryCases(pagination, filters);
  const counts = data?.counts;
  const tabCounts: Record<string, number | null> = {
    all: counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null,
    pending: counts ? (counts.escalated ?? 0) + (counts.lost ?? 0) : null,
    open: counts ? (counts.open ?? 0) : null,
    returned: counts ? (counts.returned ?? 0) : null,
    deposit_charged: counts ? (counts.deposit_charged ?? 0) : null,
    written_off: counts ? (counts.written_off ?? 0) : null,
    closed_no_charge: counts ? (counts.closed_no_charge ?? 0) : null,
  };

  const columns = useMemo<GridColDef<RecoveryCase>[]>(
    () => [
      {
        field: 'cylinder',
        headerName: 'Envase',
        flex: 1,
        minWidth: 180,
        renderCell: ({ row }) => (
          <IdentityCell title={row.cylinder.serial} subtitle={row.cylinder.product ?? 'Sin producto'} />
        ),
      },
      {
        field: 'customer',
        headerName: 'Cliente',
        flex: 1.2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">{row.customer.fullName ?? 'Sin nombre'}</span>
            <span className="block text-[11.5px] text-muted">{row.daysOut} días en su poder</span>
          </div>
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 190,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <Badge label={RECOVERY_CASE_STATUS[row.status]} variant="critical" />
            <span className="mt-0.5 block text-[11.5px] text-muted">{recoveryStepText(row.step)}</span>
          </div>
        ),
      },
      {
        field: 'depositAmount',
        headerName: 'Depósito',
        width: 130,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => <span className="font-mono text-ink">{formatCurrencyExact(row.depositAmount)}</span>,
      },
      {
        field: 'next',
        headerName: 'Qué sigue',
        flex: 1.4,
        minWidth: 280,
        sortable: false,
        renderCell: ({ row }) => <span className="text-sm text-ink-2">{nextStepText(row)}</span>,
      },
      {
        field: 'actions',
        headerName: '',
        width: 72,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions rowLabel={row.cylinder.serial} onView={() => setFilters({ case: row.caseId })} />
        ),
      },
    ],
    [setFilters],
  );

  return (
    <>
      <StatusFilterTabs
        options={STATUS_OPTIONS}
        value={status}
        onChange={(value) => {
          setPagination((p) => ({ ...p, page: 0 }));
          setFilters({ status: value });
        }}
        counts={tabCounts}
        label="Estado de los casos"
        idPrefix="recovery-cases"
        allLabel="Todos"
      >
        <div className="flex flex-wrap items-end gap-3 pb-3">
          <Select
            label="Escalón"
            value={step}
            onChange={(e) => {
              setPagination((p) => ({ ...p, page: 0 }));
              setFilters({ step: e.target.value });
            }}
            options={STEP_OPTIONS}
            className="w-56"
          />
          {customer && (
            <button
              type="button"
              className="text-sm text-primary-strong hover:underline"
              onClick={() => setFilters({ customer: '' })}
            >
              Quitar el filtro por cliente
            </button>
          )}
        </div>
        {error && !data ? (
          <ErrorState error={error} resource="Los casos de recupero" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.caseId}
            label="casos de recupero de envases"
            loading={isFetching && !data}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={(row) => setFilters({ case: row.caseId })}
            empty={
              <EmptyState
                title="No hay casos"
                description="El sistema abre un caso cuando un cliente tiene un envase más tiempo que la tolerancia."
              />
            }
            renderCard={(row) => (
              <button
                type="button"
                onClick={() => setFilters({ case: row.caseId })}
                className="w-full rounded-xl border border-outline p-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-sm text-ink">{row.cylinder.serial}</span>
                  <Badge label={RECOVERY_CASE_STATUS[row.status]} variant="critical" />
                </div>
                <p className="mt-1 text-sm text-ink">{row.customer.fullName ?? 'Sin nombre'}</p>
                <p className="text-xs text-muted">
                  {recoveryStepText(row.step)} · {formatCurrencyExact(row.depositAmount)}
                </p>
                <p className="text-xs text-muted">{nextStepText(row)}</p>
              </button>
            )}
          />
        )}
      </StatusFilterTabs>
      <RecoveryCaseDrawer caseId={caseParam || null} onClose={() => setFilters({ case: '' })} />
    </>
  );
};
