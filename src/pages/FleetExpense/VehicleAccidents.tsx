import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { CircleCheck, Plus, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  Input,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { VehicleAccident } from '../../services/api/types';
import { useVehicleAccidents } from '../../services/queries/fleetExpense';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ACCIDENT_STATUS, labelOf } from '../../utils/statusLabels';
import { CloseAccidentModal } from './components/CloseAccidentModal';
import { VehicleAccidentDrawer } from './components/VehicleAccidentDrawer';
import { VehicleAccidentFormModal } from './components/VehicleAccidentFormModal';
import { useCarOptions } from './components/useCarOptions';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'reported', label: 'Denunciados' },
  { value: 'under_review', label: 'En revisión' },
  { value: 'repairing', label: 'En reparación' },
  { value: 'closed', label: 'Cerrados' },
];

/** Los siniestros de la flota (CU-201, CU-202, CU-327, CU-328): registrar, avanzar el ciclo, cerrar y consultar. */
export const VehicleAccidents = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { car: '', status: '', from: '', to: '' },
    10,
  );
  const { options: carOptions } = useCarOptions('Todos los vehículos');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<VehicleAccident | null>(null);
  const [closing, setClosing] = useState<VehicleAccident | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const { data, isFetching, error, refetch } = useVehicleAccidents(
    pagination,
    {
      carId: filters.car || undefined,
      status: (filters.status || undefined) as VehicleAccident['status'] | undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
    { enabled: !rangeInvalid },
  );
  const filtered = Boolean(filters.car || filters.status || filters.from || filters.to);
  useClampPage(pagination, data?.total, setPagination);

  const state = (row: VehicleAccident) => (
    <div className="flex flex-wrap gap-1.5">
      <Badge label={labelOf(ACCIDENT_STATUS, row.status)} />
      {row.vehicleUnusable && <Badge label={{ text: 'Inutilizable', tone: 'danger' }} />}
      {row.hazmatRelease && <Badge label={{ text: 'Derrame', tone: 'danger' }} />}
    </div>
  );
  const closable = (row: VehicleAccident) => canWrite && row.status !== 'closed';

  const columns: GridColDef<VehicleAccident>[] = [
    {
      field: 'car',
      headerName: 'Siniestro',
      flex: 1.3,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={row.carPatent ?? 'Sin patente'}
          subtitle={formatDateTime(row.occurredAt)}
          icon={TriangleAlert}
          monoSubtitle
        />
      ),
    },
    {
      field: 'description',
      headerName: 'Qué pasó',
      flex: 1.5,
      minWidth: 200,
      sortable: false,
      valueGetter: ({ row }) => row.description,
    },
    {
      field: 'cost',
      headerName: 'Costo neto',
      width: 130,
      sortable: false,
      valueGetter: ({ row }) => (row.netCost === null ? '—' : formatCurrency(row.netCost)),
    },
    { field: 'status', headerName: 'Estado', width: 230, sortable: false, renderCell: ({ row }) => state(row) },
    {
      field: 'actions',
      headerName: '',
      width: 150,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`siniestro de ${row.carPatent ?? 'vehículo'}`}
          onView={() => setViewing(row.accidentId)}
          onEdit={closable(row) ? () => setEditing(row) : undefined}
          actions={
            closable(row) ? [{ label: 'Cerrar siniestro', icon: CircleCheck, onClick: () => setClosing(row) }] : []
          }
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Siniestros"
        description="Choques, derrames y todo lo que le pasa a un vehículo. Si queda inutilizable, sale de servicio hasta reactivarlo."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nuevo siniestro
          </Button>
        }
      />
      <Card>
        <div className="grid grid-cols-1 items-end gap-3 border-b border-outline p-4 sm:grid-cols-4">
          <Select
            label="Vehículo"
            options={carOptions}
            value={filters.car}
            onChange={(e) => setFilters({ car: e.target.value })}
          />
          <Select
            label="Estado"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
          />
          <Input
            label="Desde"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value })}
          />
          <Input
            label="Hasta"
            type="date"
            value={filters.to}
            error={rangeInvalid ? 'Es anterior al inicio' : undefined}
            onChange={(e) => setFilters({ to: e.target.value })}
          />
        </div>
        {error ? (
          <ErrorState error={error} resource="Los siniestros" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="siniestros"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.accidentId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={(row) => setViewing(row.accidentId)}
            empty={
              filtered ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otro filtro." />
              ) : (
                <EmptyState icon={TriangleAlert} title="Sin siniestros" description="Ojalá siga así." />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell
                  title={row.carPatent ?? 'Sin patente'}
                  subtitle={formatDateTime(row.occurredAt)}
                  icon={TriangleAlert}
                />
                <p className="text-sm text-ink-2">{row.description}</p>
                {state(row)}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setViewing(row.accidentId)}>
                    Ver
                  </Button>
                  {closable(row) && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setClosing(row)}>
                        Cerrar
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          />
        )}
      </Card>
      <VehicleAccidentFormModal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        accident={editing}
      />
      <CloseAccidentModal accident={closing} onClose={() => setClosing(null)} />
      <VehicleAccidentDrawer accidentId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
};
