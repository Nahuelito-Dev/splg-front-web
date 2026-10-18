import type { GridPaginationModel } from '@mui/x-data-grid';
import { CirclePlus } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, ErrorState } from '../../../common/components/ui';
import type { Attendance, Employee } from '../../../services/api/types';
import { useAttendance } from '../../../services/queries/personnel';
import { AttendanceCorrectModal } from '../../Attendance/components/AttendanceCorrectModal';
import { AttendanceFormModal } from '../../Attendance/components/AttendanceFormModal';
import { AttendanceTable } from '../../Attendance/components/AttendanceTable';

interface Props {
  employee: Employee;
  canWrite: boolean;
  blockedReason?: string;
}

const PAGE_SIZE = 10;

/** La pestaña «Asistencia» del legajo (CU-189, CU-313, CU-314): sus jornadas, la carga manual y la corrección. */
export const EmployeeAttendanceTab = ({ employee, canWrite, blockedReason }: Props) => {
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: PAGE_SIZE });
  const [registering, setRegistering] = useState(false);
  const [correcting, setCorrecting] = useState<Attendance | null>(null);
  const server = useAttendance(pagination, { employeeId: employee.employeeId });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline p-4">
        <p className="text-sm text-muted">Las jornadas de este empleado, de la más reciente a la más antigua.</p>
        {employee.status === 'active' && (
          <Button
            size="sm"
            icon={<CirclePlus />}
            blockedReason={blockedReason}
            onClick={() => canWrite && setRegistering(true)}
          >
            Registrar asistencia
          </Button>
        )}
      </div>
      {server.error ? (
        <div className="p-4">
          <ErrorState error={server.error} resource="La asistencia" onRetry={() => void server.refetch()} />
        </div>
      ) : (
        <AttendanceTable
          hideEmployee
          rows={server.data?.rows ?? []}
          total={server.data?.total ?? 0}
          loading={server.isFetching}
          pagination={pagination}
          onPaginationChange={setPagination}
          onCorrect={canWrite ? setCorrecting : undefined}
        />
      )}
      <AttendanceFormModal open={registering} onClose={() => setRegistering(false)} employeeId={employee.employeeId} />
      <AttendanceCorrectModal open={Boolean(correcting)} onClose={() => setCorrecting(null)} attendance={correcting} />
    </Card>
  );
};
