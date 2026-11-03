import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import { FROM_LIST_STATE } from '../../../hooks';
import type { EmployeeListRow } from '../../../services/api/types';
import { formatDay } from '../../../utils/format';
import { DOCUMENT_STATUS_LABELS, EMPLOYEE_STATUS_LABELS, employeeFullName } from '../employeeLabels';

interface Props {
  rows: EmployeeListRow[];
  total: number;
  loading: boolean;
  filtered?: boolean;
  /** Por qué no hay resultados con los filtros puestos, si hay algo más que decir que «no coincide». */
  emptyDescription?: string;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
}

export const EmployeesTable = ({
  rows,
  total,
  loading,
  filtered = false,
  emptyDescription,
  pagination,
  onPaginationChange,
}: Props) => {
  const navigate = useNavigate();
  const columns = useMemo<GridColDef<EmployeeListRow>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Empleado',
        flex: 1.4,
        minWidth: 240,
        renderCell: ({ row }) => (
          <IdentityCell
            title={employeeFullName(row)}
            subtitle={`Legajo ${row.fileNumber}`}
            avatarName={employeeFullName(row)}
            photo={{ kind: 'employee', id: row.employeeId, url: row.photoUrl }}
          />
        ),
      },
      { field: 'position', headerName: 'Puesto', flex: 1, minWidth: 150, valueGetter: ({ row }) => row.position.name },
      {
        field: 'status',
        headerName: 'Estado',
        width: 130,
        renderCell: ({ row }) => (
          <Badge
            label={{ text: EMPLOYEE_STATUS_LABELS[row.status], tone: row.status === 'active' ? 'success' : 'neutral' }}
          />
        ),
      },
      {
        field: 'documentStatus',
        headerName: 'Documentación',
        width: 170,
        sortable: false,
        valueGetter: ({ row }) => row.documentStatus,
        renderCell: ({ row }) =>
          row.documentStatus ? (
            <div className="flex flex-col items-start gap-0.5">
              <Badge label={DOCUMENT_STATUS_LABELS[row.documentStatus]} variant="critical" />
              {row.nextDocumentDueDate && (row.documentStatus === 'due_soon' || row.documentStatus === 'expired') && (
                <span className="text-xs text-muted">
                  {row.documentStatus === 'expired' ? 'Venció' : 'Vence'} {formatDay(row.nextDocumentDueDate)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      { field: 'hireDate', headerName: 'Ingreso', width: 130, valueGetter: ({ row }) => formatDay(row.hireDate) },
      {
        field: 'actions',
        headerName: '',
        width: 100,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={employeeFullName(row)}
            onView={() => navigate(`/employees/details/${row.employeeId}`, { state: FROM_LIST_STATE })}
          />
        ),
      },
    ],
    [navigate],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.employeeId}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={(row) => navigate(`/employees/details/${row.employeeId}`, { state: FROM_LIST_STATE })}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description={emptyDescription ?? 'Ningún legajo coincide con los filtros elegidos.'}
          />
        ) : (
          <EmptyState title="No hay legajos" description="Cargá el primer legajo con «Nuevo legajo»." />
        )
      }
    />
  );
};
