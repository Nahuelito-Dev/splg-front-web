import type { GridPaginationModel } from '@mui/x-data-grid';
import { CirclePlus, TriangleAlert, UserCheck } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  KpiGrid,
  PageHeader,
  Select,
  type FilterChip,
  PageContainer,
  TableToolbar,
  DayFilter,
} from '../../common/components/ui';
import { useUrlParams, usePermissions } from '../../hooks';
import type { Attendance as AttendanceRow } from '../../services/api/types';
import { useEmployees } from '../../services/queries/employees';
import { useAttendance } from '../../services/queries/personnel';
import { formatDay, formatNumber } from '../../utils/format';
import { employeeFullName } from '../Employees/employeeLabels';
import { todayLocal } from './attendanceRules';
import { AttendanceCorrectModal } from './components/AttendanceCorrectModal';
import { AttendanceFormModal } from './components/AttendanceFormModal';
import { AttendanceTable } from './components/AttendanceTable';

const PAGE_SIZE = 10;
const EMPLOYEES = { page: 0, pageSize: 100 };

/**
 * La grilla de asistencia (CU-314, CU-189, CU-313): las jornadas del día, de un período o de un empleado, con los
 * presentes hoy y las jornadas que quedaron sin cerrar. Sin ningún filtro muestra hoy.
 */
export const Attendance = () => {
  const { canWrite, writeHint, needsDistributor } = usePermissions();
  const [{ date, employee, open, page }, setFilters] = useUrlParams({ date: '', employee: '', open: '', page: '1' });
  const [registering, setRegistering] = useState(false);
  const [correcting, setCorrecting] = useState<AttendanceRow | null>(null);
  const employees = useEmployees(EMPLOYEES, {}, !needsDistributor);

  const onlyOpen = open === 'true';
  // Con «sin cerrar» y sin día se ven todas las abiertas; en cualquier otro caso, el día elegido o hoy.
  const day = date || (onlyOpen ? undefined : todayLocal());
  const pagination: GridPaginationModel = { page: Math.max(0, Number(page) - 1 || 0), pageSize: PAGE_SIZE };
  const filters = { date: day, employeeId: employee || undefined, open: onlyOpen ? true : undefined };
  const server = useAttendance(pagination, filters, !needsDistributor);
  const filtered = Boolean(date || employee || onlyOpen);

  const chips: FilterChip[] = [];
  if (date) chips.push({ key: 'date', label: formatDay(date) });
  const selected = employees.data?.rows.find((e) => e.employeeId === employee);
  if (employee) chips.push({ key: 'employee', label: selected ? employeeFullName(selected) : 'Empleado' });
  if (onlyOpen) chips.push({ key: 'open', label: 'Sin cerrar' });

  return (
    <PageContainer stack>
      <PageHeader
        title="Asistencia"
        description="Las jornadas del personal: quién está presente y qué marcas quedaron sin cerrar."
        actions={
          <Button icon={<CirclePlus />} blockedReason={writeHint} onClick={() => canWrite && setRegistering(true)}>
            Registrar asistencia
          </Button>
        }
      />
      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver su asistencia."
          />
        </Card>
      ) : server.error ? (
        <Card className="p-6">
          <ErrorState error={server.error} resource="La asistencia" onRetry={() => void server.refetch()} />
        </Card>
      ) : (
        <>
          <KpiGrid className="sm:grid-cols-2">
            <KpiCard
              title="Presentes hoy"
              icon={UserCheck}
              value={server.data ? formatNumber(server.data.presentToday) : '—'}
              loading={server.isPending}
              hint="Con una jornada abierta hoy"
            />
            <KpiCard
              title="Jornadas sin cerrar"
              icon={TriangleAlert}
              value={server.data ? formatNumber(server.data.staleOpen) : '—'}
              loading={server.isPending}
              pill={
                server.data && server.data.staleOpen > 0
                  ? { text: 'Corregilas desde la grilla', trend: 'warn' }
                  : undefined
              }
              hint="De días anteriores"
            />
          </KpiGrid>

          <Card>
            <TableToolbar
              filters={
                <>
                  <DayFilter
                    value={date}
                    emptyLabel="Hoy"
                    maxDay={todayLocal()}
                    onChange={(day) => setFilters({ date: day, page: '1' })}
                  />
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
                    label="Jornadas"
                    value={open}
                    onChange={(e) => setFilters({ open: e.target.value, page: '1' })}
                    options={[
                      { value: '', label: 'Todas' },
                      { value: 'true', label: 'Sólo sin cerrar' },
                    ]}
                  />
                </>
              }
              chips={chips}
              onRemoveChip={(key) => setFilters({ [key]: '', page: '1' })}
              onClearChips={() => setFilters({ date: '', employee: '', open: '', page: '1' })}
              resultCount={server.data?.total}
              noun={['jornada', 'jornadas']}
            />
            <AttendanceTable
              rows={server.data?.rows ?? []}
              total={server.data?.total ?? 0}
              loading={server.isFetching}
              filtered={filtered}
              pagination={pagination}
              onPaginationChange={(model) => setFilters({ page: String(model.page + 1) })}
              onCorrect={canWrite ? setCorrecting : undefined}
            />
          </Card>
        </>
      )}
      <AttendanceFormModal open={registering} onClose={() => setRegistering(false)} />
      <AttendanceCorrectModal open={Boolean(correcting)} onClose={() => setCorrecting(null)} attendance={correcting} />
    </PageContainer>
  );
};
