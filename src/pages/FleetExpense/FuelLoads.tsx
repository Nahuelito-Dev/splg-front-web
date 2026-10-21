import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { GridColDef } from '@mui/x-data-grid';
import { Fuel, Plus } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  IdentityCell,
  KpiCard,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
  PageContainer,
  TableToolbar,
  DateRangeFilter,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { FuelLoad } from '../../services/api/types';
import { useFuelLoads, useVoidFuelLoad } from '../../services/queries/fleetExpense';
import { formatCurrency, formatDateTime, formatNumber } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { FUEL_TYPE, labelOf } from '../../utils/statusLabels';
import { FuelLoadDrawer } from './components/FuelLoadDrawer';
import { useCarOptions } from './components/useCarOptions';
import { csvDateTime } from '../../utils/csv';

/** Las cargas de combustible de la flota (CU-195, CU-320 a CU-322): registrar, corregir, anular y consultar. */
export const FuelLoads = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams(
    { car: '', from: '', to: '', anomaly: '' },
    10,
  );
  const { options: carOptions } = useCarOptions('Todos los vehículos');
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const openForm = (path: string) => navigate(path, { state: { from: `${pathname}${search}` } });
  const [viewing, setViewing] = useState<string | null>(null);
  const voidLoad = useVoidFuelLoad();
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const { data, isFetching, error, refetch } = useFuelLoads(
    pagination,
    {
      carId: filters.car || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      anomaly: filters.anomaly === '1' ? true : undefined,
    },
    { enabled: !rangeInvalid },
  );
  const filtered = Boolean(filters.car || filters.from || filters.to || filters.anomaly);
  useClampPage(pagination, data?.total, setPagination);

  const handleVoid = async (load: FuelLoad) => {
    const ok = await confirm({
      title: '¿Anular la carga?',
      text: `Deja de contar en el consumo y el costo de ${load.carPatent ?? 'el vehículo'}. Se conserva para el historial y, si era la última, el kilometraje vuelve al de la anterior.`,
      confirmText: 'Anular carga',
      danger: true,
    });
    if (!ok) return;
    voidLoad.mutate(load.fuelLoadId, {
      onSuccess: () => notify.success('Carga anulada'),
      onError: notify.error,
    });
  };

  const status = (row: FuelLoad) => (
    <div className="flex flex-wrap gap-1.5">
      {row.anomaly && <Badge label={{ text: 'Consumo anómalo', tone: 'warn' }} />}
      {!row.isFullTank && <Badge label={{ text: 'Parcial', tone: 'info' }} />}
      {row.isFullTank && !row.anomaly && <Badge label={{ text: 'Tanque lleno', tone: 'success' }} />}
    </div>
  );

  const columns: GridColDef<FuelLoad>[] = [
    {
      field: 'car',
      headerName: 'Vehículo',
      flex: 1.2,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={row.carPatent ?? 'Sin patente'}
          subtitle={formatDateTime(row.loadedAt)}
          icon={Fuel}
          monoSubtitle
        />
      ),
    },
    {
      field: 'liters',
      headerName: 'Combustible',
      width: 150,
      sortable: false,
      valueGetter: ({ row }) => `${formatNumber(row.liters)} L · ${labelOf(FUEL_TYPE, row.fuelType).text}`,
    },
    {
      field: 'totalAmount',
      headerName: 'Importe',
      width: 130,
      sortable: false,
      valueGetter: ({ row }) => formatCurrency(row.totalAmount),
    },
    {
      field: 'odometerKm',
      headerName: 'Km',
      width: 110,
      sortable: false,
      valueGetter: ({ row }) => formatNumber(row.odometerKm),
    },
    { field: 'status', headerName: 'Estado', width: 190, sortable: false, renderCell: ({ row }) => status(row) },
    {
      field: 'actions',
      headerName: '',
      width: 150,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`carga de ${row.carPatent ?? 'vehículo'}`}
          onView={() => setViewing(row.fuelLoadId)}
          onEdit={canWrite ? () => openForm(`/fleet/fuel-loads/${row.fuelLoadId}/edit`) : undefined}
          onDelete={canWrite ? () => void handleVoid(row) : undefined}
          deleteLabel="Anular carga"
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Combustible"
        description="Las cargas de la flota: litros, importe y kilometraje. De acá salen el consumo y el costo por vehículo."
        actions={
          <Button
            icon={<Plus />}
            disabled={!canWrite}
            title={writeHint}
            onClick={() => openForm('/fleet/fuel-loads/new')}
          >
            Nueva carga
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard title="Cargas" icon={Fuel} value={data ? formatNumber(data.total) : '—'} loading={!data && !error} />
        <KpiCard
          title="Litros"
          icon={Fuel}
          value={data ? formatNumber(data.totalLiters) : '—'}
          loading={!data && !error}
          hint={filtered ? 'Con los filtros' : undefined}
        />
        <KpiCard
          title="Importe"
          icon={Fuel}
          value={data ? formatCurrency(data.totalAmount) : '—'}
          loading={!data && !error}
          hint={filtered ? 'Con los filtros' : undefined}
        />
      </div>
      <Card>
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
              <Checkbox
                label="Sólo anómalas"
                checked={filters.anomaly === '1'}
                onChange={(e) => setFilters({ anomaly: e.target.checked ? '1' : '' })}
              />
            </>
          }
          csv={{
            filename: 'combustible',
            headers: [
              'Fecha',
              'Vehículo',
              'Chofer',
              'Combustible',
              'Litros',
              'Importe',
              'Km',
              'Tanque lleno',
              'Consumo anómalo',
            ],
            rows: (data?.data ?? []).map((row) => [
              csvDateTime(row.loadedAt),
              row.carPatent ?? '',
              row.employeeName ?? '',
              labelOf(FUEL_TYPE, row.fuelType).text,
              row.liters,
              row.totalAmount,
              row.odometerKm,
              row.isFullTank ? 'Sí' : 'No',
              row.anomaly ? 'Sí' : 'No',
            ]),
          }}
          noun={['carga', 'cargas']}
        >
          {rangeInvalid && (
            <p role="alert" className="text-xs text-danger">
              {'Es anterior al inicio'}
            </p>
          )}
        </TableToolbar>
        {error ? (
          <ErrorState error={error} resource="Las cargas de combustible" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="cargas de combustible"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.fuelLoadId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={(row) => setViewing(row.fuelLoadId)}
            empty={
              filtered ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otro filtro." />
              ) : (
                <EmptyState
                  icon={Fuel}
                  title="Todavía no hay cargas"
                  description="Registrá la primera para empezar a medir el consumo."
                />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell
                  title={row.carPatent ?? 'Sin patente'}
                  subtitle={formatDateTime(row.loadedAt)}
                  icon={Fuel}
                />
                <p className="text-sm text-ink-2">
                  {formatNumber(row.liters)} L · {formatCurrency(row.totalAmount)} · {formatNumber(row.odometerKm)} km
                </p>
                {status(row)}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setViewing(row.fuelLoadId)}>
                    Ver
                  </Button>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openForm(`/fleet/fuel-loads/${row.fuelLoadId}/edit`)}
                    >
                      Editar
                    </Button>
                  )}
                  {canWrite && (
                    <Button size="sm" variant="danger" onClick={() => void handleVoid(row)}>
                      Anular
                    </Button>
                  )}
                </div>
              </>
            )}
          />
        )}
      </Card>
      <FuelLoadDrawer loadId={viewing} onClose={() => setViewing(null)} />
    </PageContainer>
  );
};
