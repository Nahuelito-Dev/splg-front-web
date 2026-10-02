import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  SearchInput,
  Select,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import type { FleetTask } from '../../services/api/types';
import { useFleetPlans, useFleetTasks } from '../../services/queries/fleet';
import { FLEET_TASK_STATUS, labelOf } from '../../utils/statusLabels';
import { FleetTaskDueCell } from './components/FleetTaskDueCell';
import { FleetTaskOwnerCell } from './components/FleetTaskOwnerCell';
import { useFleetOwners } from './components/useFleetOwners';

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
  const { needsDistributor } = usePermissions();
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

  const { data, isPending, error, refetch } = useFleetTasks(
    pagination,
    {
      status: status || undefined,
      carId: carId || undefined,
      deliveryId: deliveryId || undefined,
      planId: planFilter || undefined,
      term: search || undefined,
    },
    { enabled: !needsDistributor },
  );
  const { data: plans } = useFleetPlans({}, { enabled: !needsDistributor });

  const planOptions = useMemo(
    () => [
      { value: '', label: 'Todos los planes' },
      ...(plans ?? []).map((plan) => ({ value: plan.planId, label: plan.name })),
    ],
    [plans],
  );

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
            <Select
              label="Estado"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => filter(setStatus)(e.target.value as FleetTask['status'] | '')}
            />
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
    </div>
  );
};
