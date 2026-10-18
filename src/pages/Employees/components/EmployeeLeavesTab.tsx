import type { GridPaginationModel } from '@mui/x-data-grid';
import { CirclePlus } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, ErrorState, Select } from '../../../common/components/ui';
import type { Employee } from '../../../services/api/types';
import { useLeaves, useVacationBalance } from '../../../services/queries/personnel';
import { formatNumber } from '../../../utils/format';
import { LeaveFormModal } from '../../Leaves/components/LeaveFormModal';
import { LeavesTable } from '../../Leaves/components/LeavesTable';
import { useLeaveActions } from '../../Leaves/components/useLeaveActions';

interface Props {
  employee: Employee;
  canWrite: boolean;
  blockedReason?: string;
}

const PAGE_SIZE = 10;

/** El saldo de vacaciones (CU-193): lo que corresponde por antigüedad al 31/12, lo tomado y la diferencia. */
const VacationBalanceCard = ({ employeeId }: { employeeId: string }) => {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data, isPending, error, refetch } = useVacationBalance(employeeId, year);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Saldo de vacaciones</h3>
          <p className="text-xs text-muted">
            Días corridos (LCT art. 150). Es una referencia: no descuenta licencias sin goce ni el proporcional de quien
            ingresó en el año.
          </p>
        </div>
        <Select
          label="Año"
          className="w-28"
          value={String(year)}
          onChange={(e) => setYear(Number(e.target.value))}
          options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: String(y), label: String(y) }))}
        />
      </div>
      {error ? (
        <ErrorState error={error} resource="El saldo de vacaciones" onRetry={() => void refetch()} />
      ) : (
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Corresponden', value: data?.entitledDays },
            { label: 'Tomados', value: data?.takenDays },
            { label: 'Saldo', value: data?.balanceDays },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-outline-soft bg-bg p-3">
              <dt className="text-xs text-muted">{item.label}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold text-ink">
                {isPending ? '…' : formatNumber(item.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
};

/**
 * La pestaña «Licencias» del legajo: el saldo de vacaciones (CU-193), sus licencias con las decisiones de cada una
 * (CU-192, CU-316 a CU-318) y el alta con aviso de superposición (CU-191).
 */
export const EmployeeLeavesTab = ({ employee, canWrite, blockedReason }: Props) => {
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: PAGE_SIZE });
  const [creating, setCreating] = useState(false);
  const { handlers, modals } = useLeaveActions();
  const server = useLeaves(pagination, { employeeId: employee.employeeId });

  return (
    <div className="space-y-6">
      <VacationBalanceCard employeeId={employee.employeeId} />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline p-4">
          <p className="text-sm text-muted">Las licencias y ausencias de este empleado.</p>
          {employee.status === 'active' && (
            <Button
              size="sm"
              icon={<CirclePlus />}
              blockedReason={blockedReason}
              onClick={() => canWrite && setCreating(true)}
            >
              Registrar licencia
            </Button>
          )}
        </div>
        {server.error ? (
          <div className="p-4">
            <ErrorState error={server.error} resource="Las licencias" onRetry={() => void server.refetch()} />
          </div>
        ) : (
          <LeavesTable
            hideEmployee
            rows={server.data?.rows ?? []}
            total={server.data?.total ?? 0}
            loading={server.isFetching}
            emptyTitle="Sin licencias registradas"
            pagination={pagination}
            onPaginationChange={setPagination}
            handlers={canWrite ? handlers : undefined}
          />
        )}
      </Card>
      <LeaveFormModal
        open={creating}
        onClose={() => setCreating(false)}
        employeeId={employee.employeeId}
        leave={null}
      />
      {modals}
    </div>
  );
};
