import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card, DataTable, EmptyState, ErrorState, RowActions, CardHeader } from '../../../common/components/ui';
import type { FleetTask } from '../../../services/api/types';
import { useFleetTasks } from '../../../services/queries/fleet';
import { formatDay } from '../../../utils/format';
import { FLEET_TASK_STATUS, labelOf } from '../../../utils/statusLabels';
import { FleetTaskDueCell } from './FleetTaskDueCell';
import { FleetTaskOwnerCell } from './FleetTaskOwnerCell';
import { useFleetOwners } from './useFleetOwners';

/** Las tareas que generó un plan: `GET /fleet/tasks?planId=`, paginadas. */
export const FleetPlanTasks = ({ planId }: { planId: string }) => {
  const navigate = useNavigate();
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const { data, isPending, error, refetch } = useFleetTasks(pagination, { planId });
  const { carMap, driverMap } = useFleetOwners();

  const columns = useMemo<GridColDef<FleetTask>[]>(
    () => [
      {
        field: 'owner',
        headerName: 'Vehículo / chofer',
        flex: 1.2,
        minWidth: 200,
        renderCell: ({ row }) => <FleetTaskOwnerCell task={row} carMap={carMap} driverMap={driverMap} />,
      },
      {
        field: 'dueAt',
        headerName: 'Vencimiento',
        width: 170,
        renderCell: ({ row }) => <FleetTaskDueCell task={row} />,
      },
      {
        field: 'performedAt',
        headerName: 'Se hizo el',
        width: 130,
        valueGetter: ({ row }) => formatDay(row.performedAt),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 140,
        renderCell: ({ row }) => <Badge label={labelOf(FLEET_TASK_STATUS, row.status)} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 64,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions rowLabel="tarea del plan" onView={() => navigate(`/fleet/tasks/${row.taskId}`)} />
        ),
      },
    ],
    [carMap, driverMap, navigate],
  );

  return (
    <Card>
      <CardHeader title="Tareas del plan" className="p-6 pb-2" />
      {error ? (
        <div className="p-4">
          <ErrorState error={error} resource="Las tareas" onRetry={() => void refetch()} />
        </div>
      ) : (
        <DataTable
          rows={data?.rows ?? []}
          columns={columns}
          pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
          getRowId={(row) => row.taskId}
          loading={isPending}
          onRowClick={(row) => navigate(`/fleet/tasks/${row.taskId}`)}
          empty={<EmptyState title="Sin tareas" description="Este plan todavía no generó ni tiene tareas cargadas." />}
        />
      )}
    </Card>
  );
};
