import type { GridPaginationModel } from '@mui/x-data-grid';
import { CirclePlus } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChips,
  Input,
  PageHeader,
  Select,
  Tabs,
  tabPanelProps,
  type FilterChip,
  type TabItem,
} from '../../common/components/ui';
import { usePermissions, useUrlParams } from '../../hooks';
import type { Leave } from '../../services/api/types';
import { useEmployees } from '../../services/queries/employees';
import { useLeaves } from '../../services/queries/personnel';
import { formatDay } from '../../utils/format';
import { LEAVE_STATUS, LEAVE_TYPE } from '../../utils/statusLabels';
import { employeeFullName } from '../Employees/employeeLabels';
import { LeaveFormModal } from './components/LeaveFormModal';
import { LeavesTable } from './components/LeavesTable';
import { useLeaveActions } from './components/useLeaveActions';

const TABS_ID = 'leaves';
const PAGE_SIZE = 10;
const EMPLOYEES = { page: 0, pageSize: 100 };
const SEGMENTS = ['requested', 'approved', 'rejected', 'cancelled', 'all'] as const;
type Segment = (typeof SEGMENTS)[number];
const SEGMENT_LABELS: Record<Segment, string> = {
  requested: 'Pendientes',
  approved: LEAVE_STATUS.approved.text + 's',
  rejected: LEAVE_STATUS.rejected.text + 's',
  cancelled: LEAVE_STATUS.cancelled.text + 's',
  all: 'Todas',
};

/**
 * La bandeja de licencias (CU-319): por defecto las pendientes de resolver, desde donde se aprueba (CU-192), se rechaza
 * con motivo (CU-318), se modifica (CU-316) o se cancela (CU-317); y se registra una nueva (CU-191).
 */
export const Leaves = () => {
  const { canWrite, writeHint, needsDistributor } = usePermissions();
  const [{ status, type, employee, from, to, page }, setFilters] = useUrlParams({
    status: 'requested',
    type: '',
    employee: '',
    from: '',
    to: '',
    page: '1',
  });
  const [creating, setCreating] = useState(false);
  const { handlers, modals } = useLeaveActions();
  const employees = useEmployees(EMPLOYEES, {}, !needsDistributor);

  const segment: Segment = SEGMENTS.find((s) => s === status) ?? 'requested';
  const typeFilter = (Object.keys(LEAVE_TYPE) as Leave['type'][]).find((t) => t === type);
  const pagination: GridPaginationModel = { page: Math.max(0, Number(page) - 1 || 0), pageSize: PAGE_SIZE };
  const invalidPeriod = Boolean(from && to && to < from);
  const server = useLeaves(
    pagination,
    {
      status: segment === 'all' ? undefined : segment,
      type: typeFilter,
      employeeId: employee || undefined,
      from: from || undefined,
      to: to || undefined,
    },
    !needsDistributor && !invalidPeriod,
  );

  const tabs: TabItem[] = SEGMENTS.map((s) => ({ id: s, label: SEGMENT_LABELS[s] }));
  const selected = employees.data?.rows.find((e) => e.employeeId === employee);
  const chips: FilterChip[] = [];
  if (typeFilter) chips.push({ key: 'type', label: LEAVE_TYPE[typeFilter] });
  if (employee) chips.push({ key: 'employee', label: selected ? employeeFullName(selected) : 'Empleado' });
  if (from) chips.push({ key: 'from', label: `Desde ${formatDay(from)}` });
  if (to) chips.push({ key: 'to', label: `Hasta ${formatDay(to)}` });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Licencias"
        description="Las solicitudes de licencia y ausencia del personal: se aprueban, se rechazan o se cancelan desde acá."
        actions={
          <Button icon={<CirclePlus />} blockedReason={writeHint} onClick={() => canWrite && setCreating(true)}>
            Registrar licencia
          </Button>
        }
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus licencias."
          />
        </Card>
      ) : (
        <Card>
          <Tabs
            items={tabs}
            value={segment}
            onChange={(id) => setFilters({ status: id, page: '1' })}
            label="Filtrar licencias por estado"
            idPrefix={TABS_ID}
          />
          <div {...tabPanelProps(TABS_ID, segment)}>
            <div className="flex flex-col gap-3 border-b border-outline p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="Empleado"
                  value={employee}
                  onChange={(e) => setFilters({ employee: e.target.value, page: '1' })}
                  options={[
                    { value: '', label: 'Todos' },
                    ...(employees.data?.rows ?? []).map((e) => ({ value: e.employeeId, label: employeeFullName(e) })),
                  ]}
                />
                <Select
                  label="Tipo"
                  value={type}
                  onChange={(e) => setFilters({ type: e.target.value, page: '1' })}
                  options={[
                    { value: '', label: 'Todos' },
                    ...Object.entries(LEAVE_TYPE).map(([value, label]) => ({ value, label })),
                  ]}
                />
                <Input
                  label="Desde"
                  type="date"
                  value={from}
                  onChange={(e) => setFilters({ from: e.target.value, page: '1' })}
                />
                <Input
                  label="Hasta"
                  type="date"
                  value={to}
                  error={invalidPeriod ? 'No puede ser anterior al inicio' : undefined}
                  onChange={(e) => setFilters({ to: e.target.value, page: '1' })}
                />
              </div>
              {chips.length > 0 ? (
                <FilterChips
                  items={chips}
                  onRemove={(key) => setFilters({ [key]: '', page: '1' })}
                  onClearAll={() => setFilters({ type: '', employee: '', from: '', to: '', page: '1' })}
                  resultCount={server.data?.total}
                />
              ) : (
                <p className="text-sm text-muted" aria-live="polite">
                  {server.data ? `${server.data.total} ${server.data.total === 1 ? 'licencia' : 'licencias'}` : ''}
                </p>
              )}
            </div>
            {server.error ? (
              <div className="p-4">
                <ErrorState error={server.error} resource="Las licencias" onRetry={() => void server.refetch()} />
              </div>
            ) : (
              <LeavesTable
                rows={server.data?.rows ?? []}
                total={server.data?.total ?? 0}
                loading={server.isFetching}
                filtered={chips.length > 0}
                emptyTitle={segment === 'requested' ? 'No hay solicitudes pendientes' : 'No hay licencias'}
                pagination={pagination}
                onPaginationChange={(model) => setFilters({ page: String(model.page + 1) })}
                handlers={canWrite ? handlers : undefined}
              />
            )}
          </div>
        </Card>
      )}
      <LeaveFormModal open={creating} onClose={() => setCreating(false)} leave={null} />
      {modals}
    </div>
  );
};
