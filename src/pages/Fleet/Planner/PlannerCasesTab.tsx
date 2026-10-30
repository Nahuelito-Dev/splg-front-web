import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import {
  Badge,
  EmptyState,
  ErrorState,
  IdentityCell,
  ResponsiveTable,
  RowActions,
  StatusFilterTabs,
  type StatusOption,
} from '../../../common/components/ui';
import { useUrlParams } from '../../../hooks';
import type { PlanningCase } from '../../../services/api/types';
import { usePlanningCases } from '../../../services/queries/planner';
import { formatDateTime, formatDay } from '../../../utils/format';
import { PLANNING_CASE_STATUS, formatWindow } from './plannerLabels';
import { PlanningCaseDrawer } from './PlanningCaseDrawer';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Esperan al administrador', tone: 'danger' },
  { value: 'negotiating', label: 'Con el chofer', tone: 'info' },
  { value: 'confirmed', label: 'Programados', tone: 'success' },
  { value: 'cancelled', label: 'Cancelados', tone: 'neutral' },
];

/** La ventana que importa de un caso: la acordada, la que espera respuesta o nada. */
const windowOf = (c: PlanningCase): string => {
  if (c.chosenStart) return formatWindow(c.chosenStart, c.chosenEnd);
  if (c.currentProposal) return formatWindow(c.currentProposal.windowStart, c.currentProposal.windowEnd);
  return '—';
};

const detailOf = (c: PlanningCase): string => {
  if (c.status === 'escalated') return c.escalationText ?? 'Escalado';
  if (c.currentProposal) return `Vence ${formatDateTime(c.currentProposal.expiresAt)}`;
  if (c.lastProposal?.rejectionReason) return `Rechazó: ${c.lastProposal.rejectionReason}`;
  return c.driverName ?? 'Sin chofer asignado';
};

/** Los casos del planificador: lo que espera al administrador primero, y el resto por estado. */
export const PlannerCasesTab = () => {
  const [{ status, case: caseParam }, setFilters] = useUrlParams({ status: '', case: '' });
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const filters = status === 'pending' ? { pending: true } : status ? { status: status as PlanningCase['status'] } : {};
  const { data, isFetching, error, refetch } = usePlanningCases(pagination, filters);
  const counts = data?.counts;
  const tabCounts: Record<string, number | null> = {
    all: counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null,
    pending: counts ? (counts.escalated ?? 0) + (counts.awaiting_confirmation ?? 0) : null,
    negotiating: counts ? (counts.negotiating ?? 0) : null,
    confirmed: counts ? (counts.confirmed ?? 0) : null,
    cancelled: counts ? (counts.cancelled ?? 0) : null,
  };

  const columns = useMemo<GridColDef<PlanningCase>[]>(
    () => [
      {
        field: 'patent',
        headerName: 'Vehículo',
        flex: 1,
        minWidth: 180,
        renderCell: ({ row }) => (
          <IdentityCell title={row.patent ?? 'Sin patente'} subtitle={row.driverName ?? 'Sin chofer'} />
        ),
      },
      {
        field: 'taskName',
        headerName: 'Tarea',
        flex: 1.2,
        minWidth: 200,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">{row.taskName}</span>
            <span className="block text-[11.5px] text-muted">Vence {formatDay(row.projectedDueAt)}</span>
          </div>
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 150,
        renderCell: ({ row }) => <Badge label={PLANNING_CASE_STATUS[row.status]} variant="critical" />,
      },
      {
        field: 'window',
        headerName: 'Ventana',
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">{windowOf(row)}</span>
            <span className="block text-[11.5px] text-muted">{detailOf(row)}</span>
          </div>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 72,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions rowLabel={row.patent ?? row.taskName} onView={() => setFilters({ case: row.caseId })} />
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
        idPrefix="planner-cases"
        allLabel="Todos"
      >
        {error && !data ? (
          <ErrorState error={error} resource="Los casos del planificador" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.caseId}
            label="casos del planificador"
            loading={isFetching && !data}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={(row) => setFilters({ case: row.caseId })}
            empty={
              <EmptyState
                title="No hay casos"
                description="El planificador abre un caso cuando una tarea de taller entra en su anticipación."
              />
            }
            renderCard={(row) => (
              <button
                type="button"
                onClick={() => setFilters({ case: row.caseId })}
                className="w-full rounded-xl border border-outline p-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-sm uppercase text-ink">{row.patent ?? 'Sin patente'}</span>
                  <Badge label={PLANNING_CASE_STATUS[row.status]} variant="critical" />
                </div>
                <p className="mt-1 text-sm text-ink">{row.taskName}</p>
                <p className="text-xs text-muted">{windowOf(row)}</p>
                <p className="text-xs text-muted">{detailOf(row)}</p>
              </button>
            )}
          />
        )}
      </StatusFilterTabs>
      <PlanningCaseDrawer caseId={caseParam || null} onClose={() => setFilters({ case: '' })} />
    </>
  );
};
