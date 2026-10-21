import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { GridColDef } from '@mui/x-data-grid';
import { CircleCheck, Plus, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IdentityCell,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
  StatusFilterTabs,
  PageContainer,
  TableToolbar,
  DateRangeFilter,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { VehicleAccident } from '../../services/api/types';
import { useVehicleAccidents, useAccidentStatusCounts } from '../../services/queries/fleetExpense';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ACCIDENT_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { CloseAccidentModal } from './components/CloseAccidentModal';
import { VehicleAccidentDrawer } from './components/VehicleAccidentDrawer';
import { useCarOptions } from './components/useCarOptions';
import { csvDateTime } from '../../utils/csv';

/** Los siniestros de la flota (CU-201, CU-202, CU-327, CU-328): registrar, avanzar el ciclo, cerrar y consultar. */
export const VehicleAccidents = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { car: '', status: '', from: '', to: '' },
    10,
  );
  // Un estado inválido en la URL (enlace viejo o escrito a mano) se trata como «todos», en la consulta y en las pestañas.
  const status = statusParam(ACCIDENT_STATUS, filters.status);
  const { options: carOptions } = useCarOptions('Todos los vehículos');
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const openForm = (path: string) => navigate(path, { state: { from: `${pathname}${search}` } });
  const [closing, setClosing] = useState<VehicleAccident | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const { data, isFetching, error, refetch } = useVehicleAccidents(
    pagination,
    {
      carId: filters.car || undefined,
      status: status || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
    { enabled: !rangeInvalid },
  );
  const filtered = Boolean(filters.car || status || filters.from || filters.to);
  useClampPage(pagination, data?.total, setPagination);

  const state = (row: VehicleAccident) => (
    <div className="flex flex-wrap gap-1.5">
      <Badge label={labelOf(ACCIDENT_STATUS, row.status)} />
      {row.vehicleUnusable && <Badge label={{ text: 'Inutilizable', tone: 'danger' }} />}
      {row.hazmatRelease && <Badge label={{ text: 'Derrame', tone: 'danger' }} />}
    </div>
  );
  const closable = (row: VehicleAccident) => canWrite && row.status !== 'closed';

  const statusCounts = useAccidentStatusCounts(
    {
      carId: filters.car || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
    !rangeInvalid,
  );

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
          onEdit={closable(row) ? () => openForm(`/fleet/accidents/${row.accidentId}/edit`) : undefined}
          actions={
            closable(row) ? [{ label: 'Cerrar siniestro', icon: CircleCheck, onClick: () => setClosing(row) }] : []
          }
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Siniestros"
        description="Choques, derrames y todo lo que le pasa a un vehículo. Si queda inutilizable, sale de servicio hasta reactivarlo."
        actions={
          <Button
            icon={<Plus />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => openForm('/fleet/accidents/new')}
          >
            Nuevo siniestro
          </Button>
        }
      />
      <Card>
        <StatusFilterTabs
          options={statusOptions(ACCIDENT_STATUS)}
          value={status}
          onChange={(status) => setFilters({ status })}
          counts={statusCounts}
          label="Filtrar siniestros por estado"
          idPrefix="vehicle-accidents"
        >
          <TableToolbar
            filters={
              <>
                <Select
                  label="Vehículo"
                  options={carOptions}
                  value={filters.car}
                  onChange={(e) => setFilters({ car: e.target.value })}
                />
                <DateRangeFilter from={filters.from} to={filters.to} onChange={(range) => setFilters({ ...range })} />
              </>
            }
            csv={{
              filename: 'siniestros',
              headers: [
                'Vehículo',
                'Chofer',
                'Fecha',
                'Lugar',
                'Estado',
                'Inutilizable',
                'Costo de reparación',
                'Costo neto',
              ],
              rows: (data?.data ?? []).map((row) => [
                row.carPatent ?? '',
                row.employeeName ?? '',
                csvDateTime(row.occurredAt),
                row.location ?? '',
                labelOf(ACCIDENT_STATUS, row.status).text,
                row.vehicleUnusable ? 'Sí' : 'No',
                row.repairCost ?? '',
                row.netCost ?? '',
              ]),
            }}
            noun={['siniestro', 'siniestros']}
          >
            {rangeInvalid && (
              <p role="alert" className="text-xs text-danger">
                {'Es anterior al inicio'}
              </p>
            )}
          </TableToolbar>
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
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openForm(`/fleet/accidents/${row.accidentId}/edit`)}
                        >
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
        </StatusFilterTabs>
      </Card>
      <CloseAccidentModal accident={closing} onClose={() => setClosing(null)} />
      <VehicleAccidentDrawer accidentId={viewing} onClose={() => setViewing(null)} />
    </PageContainer>
  );
};
