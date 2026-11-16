import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { Check, Pencil, X, XCircle } from 'lucide-react';
import { useMemo, type ComponentProps } from 'react';
import { Badge, Button, EmptyState, IdentityCell, ResponsiveTable, RowActions } from '../../../common/components/ui';
import type { Leave } from '../../../services/api/types';
import { formatDay } from '../../../utils/format';
import { LEAVE_STATUS, LEAVE_TYPE, labelOf } from '../../../utils/statusLabels';
import { leaveActions } from '../leaveRules';
import { todayLocal } from '../../Attendance/attendanceRules';

export interface LeaveRowHandlers {
  onApprove: (leave: Leave) => void;
  onReject: (leave: Leave) => void;
  onEdit: (leave: Leave) => void;
  onCancel: (leave: Leave) => void;
}

interface Props {
  rows: Leave[];
  total: number;
  loading: boolean;
  filtered?: boolean;
  emptyTitle?: string;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Sin handlers la tabla es de sólo lectura (un administrador general sin «Ver como»). */
  handlers?: LeaveRowHandlers;
  /** En la ficha de un empleado la columna del empleado sobra. */
  hideEmployee?: boolean;
}

/** Las licencias (CU-319), con lo que se puede hacer con cada una según su estado (CU-192, CU-316, CU-317, CU-318). */
export const LeavesTable = ({
  rows,
  total,
  loading,
  filtered = false,
  emptyTitle = 'No hay licencias',
  pagination,
  onPaginationChange,
  handlers,
  hideEmployee = false,
}: Props) => {
  const columns = useMemo<GridColDef<Leave>[]>(() => {
    const employee: GridColDef<Leave> = {
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
    const rest: GridColDef<Leave>[] = [
      { field: 'type', headerName: 'Tipo', width: 190, valueGetter: ({ row }) => LEAVE_TYPE[row.type] },
      {
        field: 'startDate',
        headerName: 'Período',
        width: 230,
        renderCell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-ink">
              {formatDay(row.startDate)} → {formatDay(row.endDate)}
            </span>
            <span className="block text-[11.5px] text-muted">
              {row.days} {row.days === 1 ? 'día' : 'días'}
            </span>
          </div>
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 130,
        renderCell: ({ row }) => <Badge label={labelOf(LEAVE_STATUS, row.status)} />,
      },
      {
        field: 'reason',
        headerName: 'Motivo',
        flex: 1,
        minWidth: 160,
        valueGetter: ({ row }) => row.rejectionReason ?? row.reason ?? '—',
      },
      {
        field: 'actions',
        headerName: '',
        width: 72,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => {
          if (!handlers) return null;
          const can = leaveActions(row, todayLocal());
          const actions: NonNullable<ComponentProps<typeof RowActions>['actions']> = [];
          if (can.approve) actions.push({ label: 'Aprobar', icon: Check, onClick: () => handlers.onApprove(row) });
          if (can.reject) actions.push({ label: 'Rechazar', icon: X, onClick: () => handlers.onReject(row) });
          if (can.edit) actions.push({ label: 'Modificar', icon: Pencil, onClick: () => handlers.onEdit(row) });
          if (can.cancel) {
            actions.push({ label: 'Cancelar', icon: XCircle, tone: 'danger', onClick: () => handlers.onCancel(row) });
          }
          return actions.length > 0 ? (
            <RowActions rowLabel={`la licencia de ${row.employeeName}`} actions={actions} />
          ) : null;
        },
      },
    ];
    return hideEmployee ? rest : [employee, ...rest];
  }, [handlers, hideEmployee]);

  return (
    <ResponsiveTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.leaveId}
      label="licencias"
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      renderCard={(row) => {
        const can = handlers ? leaveActions(row, todayLocal()) : null;
        return (
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
              {LEAVE_TYPE[row.type]} · {formatDay(row.startDate)} → {formatDay(row.endDate)}
              <span className="ml-1 text-muted">
                ({row.days} {row.days === 1 ? 'día' : 'días'})
              </span>
            </p>
            {(row.rejectionReason ?? row.reason) && (
              <p className="text-xs text-muted">{row.rejectionReason ?? row.reason}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={labelOf(LEAVE_STATUS, row.status)} />
              {handlers && can?.approve && (
                <Button size="sm" icon={<Check />} onClick={() => handlers.onApprove(row)}>
                  Aprobar
                </Button>
              )}
              {handlers && can?.reject && (
                <Button size="sm" variant="secondary" icon={<X />} onClick={() => handlers.onReject(row)}>
                  Rechazar
                </Button>
              )}
              {handlers && can?.edit && (
                <Button size="sm" variant="secondary" icon={<Pencil />} onClick={() => handlers.onEdit(row)}>
                  Modificar
                </Button>
              )}
              {handlers && can?.cancel && (
                <Button size="sm" variant="danger" icon={<XCircle />} onClick={() => handlers.onCancel(row)}>
                  Cancelar
                </Button>
              )}
            </div>
          </>
        );
      }}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ninguna licencia coincide con los filtros."
          />
        ) : (
          <EmptyState title={emptyTitle} />
        )
      }
    />
  );
};
