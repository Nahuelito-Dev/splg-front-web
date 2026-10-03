import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import TableRows from '@mui/icons-material/TableRows';
import ViewKanban from '@mui/icons-material/ViewKanban';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  CalendarKanbanViewToggle,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  IdentityCell,
  TableSkeleton,
  PageHeader,
  SearchInput,
  Select,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { FleetTask } from '../../services/api/types';
import { useCancelFleetTask, useFleetPlans, useFleetTasks } from '../../services/queries/fleet';
import { confirm, notify } from '../../utils/notifications';
import { FLEET_TASK_STATUS, labelOf } from '../../utils/statusLabels';
import { FleetTaskCloseModal } from './components/FleetTaskCloseModal';
import { FleetTaskDueCell } from './components/FleetTaskDueCell';
import { FleetTaskOwnerCell } from './components/FleetTaskOwnerCell';
import { FleetTaskKanban } from './components/FleetTaskKanban';
import { useFleetOwners } from './components/useFleetOwners';

type View = 'board' | 'table';

const VIEWS = [
  { id: 'board', label: 'Tablero', icon: <ViewKanban aria-hidden="true" fontSize="inherit" /> },
  { id: 'table', label: 'Tabla', icon: <TableRows aria-hidden="true" fontSize="inherit" /> },
];

/** El back pagina de a 100 como máximo: el tablero muestra hasta esa cantidad y avisa si hay más. */
const BOARD_PAGE = { page: 0, pageSize: 100 };

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'forecast', label: 'Prevista' },
  { value: 'scheduled', label: 'Programada' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'done', label: 'Hecha' },
  { value: 'overdue', label: 'Vencida' },
  { value: 'cancelled', label: 'Cancelada' },
];

/** Todas las tareas de la flota, con filtros (CU-136 a CU-141): hoy el panel las crea y cierra, pero no las lista. */
export const FleetTasks = () => {
  const navigate = useNavigate();
  const { needsDistributor, canWrite } = usePermissions();
  const [view, setView] = useState<View>('board');
  const [closing, setClosing] = useState<FleetTask | null>(null);
  const cancelTask = useCancelFleetTask();
  const [status, setStatus] = useState<FleetTask['status'] | ''>('');
  const [carId, setCarId] = useState('');
  const [deliveryId, setDeliveryId] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  // Un filtro nuevo vuelve a la primera página.
  const filter =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPagination((current) => ({ ...current, page: 0 }));
    };

  const { cars, drivers, carMap, driverMap } = useFleetOwners();

  const filters = {
    carId: carId || undefined,
    deliveryId: deliveryId || undefined,
    planId: planFilter || undefined,
    term: search || undefined,
  };
  const table = useFleetTasks(
    pagination,
    { ...filters, status: status || undefined },
    { enabled: !needsDistributor && view === 'table' },
  );
  const board = useFleetTasks(BOARD_PAGE, filters, { enabled: !needsDistributor && view === 'board' });
  const { data, isPending, error, refetch } = view === 'board' ? board : table;
  const { data: plans } = useFleetPlans({}, { enabled: !needsDistributor });

  const planOptions = useMemo(
    () => [
      { value: '', label: 'Todos los planes' },
      ...(plans ?? []).map((plan) => ({ value: plan.planId, label: plan.name })),
    ],
    [plans],
  );

  const handleCancel = async (task: FleetTask) => {
    const confirmed = await confirm({
      title: '¿Cancelar la tarea?',
      text: `Se cancela «${task.plan?.name ?? 'la tarea'}». No se puede deshacer.`,
      confirmText: 'Cancelar tarea',
      danger: true,
    });
    if (!confirmed || cancelTask.isPending) return;
    cancelTask.mutate(
      { id: task.taskId, body: {} },
      { onSuccess: () => notify.success('Tarea cancelada'), onError: notify.error },
    );
  };

  const columns = useMemo<GridColDef<FleetTask>[]>(
    () => [
      {
        field: 'plan',
        headerName: 'Plan',
        flex: 1.1,
        minWidth: 200,
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.plan?.name ?? 'Plan eliminado'}
            subtitle={row.referenceNumber || row.category || undefined}
            monoSubtitle={Boolean(row.referenceNumber)}
          />
        ),
      },
      {
        field: 'owner',
        headerName: 'Vehículo / chofer',
        flex: 1.1,
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
        field: 'status',
        headerName: 'Estado',
        width: 140,
        renderCell: ({ row }) => <Badge label={labelOf(FLEET_TASK_STATUS, row.status)} />,
      },
    ],
    [carMap, driverMap],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Tareas de flota"
        description="Vencimientos y mantenimientos de toda la flota, en un solo lugar."
        actions={
          !needsDistributor && (
            <CalendarKanbanViewToggle
              label="Vista de las tareas"
              options={VIEWS}
              value={view}
              onChange={(id) => setView(id as View)}
            />
          )
        }
      />

      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus tareas."
          />
        </Card>
      ) : (
        <Card>
          <div className="grid gap-3 border-b border-outline p-4 sm:grid-cols-2 lg:grid-cols-5">
            <SearchInput
              label="Buscar"
              className="self-end sm:!w-full"
              placeholder="Plan, proveedor o ref."
              value={search}
              onChange={(e) => filter(setSearch)(e.target.value)}
            />
            {view === 'table' && (
              <Select
                label="Estado"
                options={STATUS_OPTIONS}
                value={status}
                onChange={(e) => filter(setStatus)(e.target.value as FleetTask['status'] | '')}
              />
            )}
            <Select
              label="Vehículo"
              options={[
                { value: '', label: 'Todos los vehículos' },
                ...(cars ?? []).map((car) => ({
                  value: car.car_id,
                  label: car.car_patent ? `${car.car_patent}` : (car.car_brand ?? 'Vehículo'),
                })),
              ]}
              value={carId}
              onChange={(e) => filter(setCarId)(e.target.value)}
            />
            <Select
              label="Chofer"
              options={[
                { value: '', label: 'Todos los choferes' },
                ...(drivers?.rows ?? []).map((driver) => ({
                  value: driver.delivery_id,
                  label: driver.user?.full_name ?? 'Sin nombre',
                })),
              ]}
              value={deliveryId}
              onChange={(e) => filter(setDeliveryId)(e.target.value)}
            />
            <Select
              label="Plan"
              options={planOptions}
              value={planFilter}
              onChange={(e) => filter(setPlanFilter)(e.target.value)}
            />
          </div>

          {error ? (
            <div className="p-4">
              <ErrorState error={error} resource="Las tareas" onRetry={() => void refetch()} />
            </div>
          ) : view === 'board' ? (
            isPending ? (
              <TableSkeleton columns={4} />
            ) : (data?.rows.length ?? 0) === 0 ? (
              <EmptyState title="Sin tareas" description="Ningún resultado con estos filtros." />
            ) : (
              <>
                <FleetTaskKanban
                  tasks={data?.rows ?? []}
                  carMap={carMap}
                  driverMap={driverMap}
                  canWrite={canWrite}
                  cancelling={cancelTask.isPending}
                  onOpen={(task) => navigate(`/fleet/tasks/${task.taskId}`)}
                  onClose={setClosing}
                  onCancel={(task) => void handleCancel(task)}
                />
                {(data?.total ?? 0) > BOARD_PAGE.pageSize && (
                  <p className="border-t border-outline px-4 py-3 text-xs text-muted">
                    Mostrando {BOARD_PAGE.pageSize} de {data?.total} tareas: afiná con los filtros o pasá a la tabla.
                  </p>
                )}
              </>
            )
          ) : (
            <DataTable
              rows={data?.rows ?? []}
              columns={columns}
              pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
              getRowId={(row) => row.taskId}
              loading={isPending}
              onRowClick={(row) => navigate(`/fleet/tasks/${row.taskId}`)}
              empty={<EmptyState title="Sin tareas" description="Ningún resultado con estos filtros." />}
            />
          )}
        </Card>
      )}

      <FleetTaskCloseModal open={Boolean(closing)} onClose={() => setClosing(null)} task={closing} />
    </div>
  );
};
