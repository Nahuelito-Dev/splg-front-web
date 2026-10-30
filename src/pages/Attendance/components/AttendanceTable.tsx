import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { Pencil } from 'lucide-react';
import { useMemo } from 'react';
import { Badge, Button, EmptyState, IdentityCell, ResponsiveTable, RowActions } from '../../../common/components/ui';
import type { Attendance } from '../../../services/api/types';
import { formatDay, formatTime } from '../../../utils/format';
import { ATTENDANCE_SOURCE, labelOf } from '../../../utils/statusLabels';
import { durationText } from '../attendanceRules';

interface Props {
  rows: Attendance[];
  total: number;
  loading: boolean;
  filtered?: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Sin esto la fila no tiene acciones (un administrador general sin «Ver como»). */
  onCorrect?: (row: Attendance) => void;
  /** En la ficha de un empleado la columna del empleado sobra. */
  hideEmployee?: boolean;
}

/** La grilla de jornadas (CU-314): día, ingreso, egreso, duración y origen; las abiertas quedan marcadas. */
export const AttendanceTable = ({
  rows,
  total,
  loading,
  filtered = false,
  pagination,
  onPaginationChange,
  onCorrect,
  hideEmployee = false,
}: Props) => {
  const columns = useMemo<GridColDef<Attendance>[]>(() => {
    const employee: GridColDef<Attendance> = {
      field: 'employeeName',
      headerName: 'Empleado',
      flex: 1.2,
      minWidth: 200,
      renderCell: ({ row }) => (
        <IdentityCell
          title={row.employeeName}
          subtitle={`Legajo ${row.employeeFileNumber}`}
          avatarName={row.employeeName}
          person={{ employeeId: row.employeeId }}
        />
      ),
    };
    const rest: GridColDef<Attendance>[] = [
      { field: 'workDate', headerName: 'Día', width: 140, valueGetter: ({ row }) => formatDay(row.workDate) },
      { field: 'checkInAt', headerName: 'Ingreso', width: 100, valueGetter: ({ row }) => formatTime(row.checkInAt) },
      {
        field: 'checkOutAt',
        headerName: 'Egreso',
        width: 130,
        renderCell: ({ row }) =>
          row.isOpen ? (
            <Badge label={{ text: 'Sin cerrar', tone: 'warn' }} />
          ) : (
            <span className="text-ink">{formatTime(row.checkOutAt)}</span>
          ),
      },
      {
        field: 'durationMinutes',
        headerName: 'Duración',
        width: 120,
        valueGetter: ({ row }) => durationText(row.durationMinutes) ?? '—',
      },
      {
        field: 'source',
        headerName: 'Origen',
        width: 150,
        renderCell: ({ row }) => <Badge label={labelOf(ATTENDANCE_SOURCE, row.source)} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 72,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) =>
          onCorrect ? (
            <RowActions
              rowLabel={`la jornada de ${row.employeeName}`}
              actions={[{ label: 'Corregir', icon: Pencil, onClick: () => onCorrect(row) }]}
            />
          ) : null,
      },
    ];
    return hideEmployee ? rest : [employee, ...rest];
  }, [hideEmployee, onCorrect]);

  return (
    <ResponsiveTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.attendanceId}
      label="jornadas"
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      renderCard={(row) => (
        <>
          {!hideEmployee && (
            <IdentityCell
              title={row.employeeName}
              subtitle={`Legajo ${row.employeeFileNumber}`}
              avatarName={row.employeeName}
              person={{ employeeId: row.employeeId }}
            />
          )}
          <p className="text-sm text-ink">
            {formatDay(row.workDate)} · {formatTime(row.checkInAt)} →{' '}
            {row.isOpen ? 'sin cerrar' : formatTime(row.checkOutAt)}
            {durationText(row.durationMinutes) && (
              <span className="ml-1 text-muted">({durationText(row.durationMinutes)})</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {row.isOpen && <Badge label={{ text: 'Sin cerrar', tone: 'warn' }} />}
            <Badge label={labelOf(ATTENDANCE_SOURCE, row.source)} />
            {onCorrect && (
              <Button size="sm" variant="secondary" icon={<Pencil />} onClick={() => onCorrect(row)}>
                Corregir
              </Button>
            )}
          </div>
        </>
      )}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin jornadas"
            description="Ninguna jornada coincide con los filtros."
          />
        ) : (
          <EmptyState title="Sin jornadas" description="Todavía no hay asistencia registrada." />
        )
      }
    />
  );
};
