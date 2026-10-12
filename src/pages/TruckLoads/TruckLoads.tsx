import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Plus, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChips,
  IdentityCell,
  Input,
  PageHeader,
  ResponsiveTable,
  RowActions,
  Select,
} from '../../common/components/ui';
import { FROM_LIST_STATE, usePermissions, useUrlParams } from '../../hooks';
import type { TruckLoadSummary } from '../../services/api/types';
import { useTruckLoads } from '../../services/queries/truckLoads';
import { formatDateTime, formatDay } from '../../utils/format';
import { TRUCK_LOAD_STATUS, labelOf } from '../../utils/statusLabels';
import { useCarOptions, useDriverOptions } from '../Stock/components/useStockOptions';
import { OpenTruckLoadModal } from './components/OpenTruckLoadModal';
import { TruckStockCard } from './components/TruckStockCard';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  ...(Object.keys(TRUCK_LOAD_STATUS) as TruckLoadSummary['status'][]).map((s) => ({
    value: s,
    label: TRUCK_LOAD_STATUS[s].text,
  })),
];

/** Cargas del camión: la jornada de cada camión, desde que se abre hasta que se rinde. */
export const TruckLoads = () => {
  const navigate = useNavigate();
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters] = useUrlParams({ date: '', car: '', driver: '', status: '' });
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [opening, setOpening] = useState(false);
  const [stockCar, setStockCar] = useState('');
  const cars = useCarOptions();
  const drivers = useDriverOptions();
  const { data, isFetching, error, refetch } = useTruckLoads(pagination, {
    date: filters.date || undefined,
    carId: filters.car || undefined,
    deliveryId: filters.driver || undefined,
    status: (filters.status || undefined) as TruckLoadSummary['status'] | undefined,
  });
  const goTo = (row: TruckLoadSummary) => navigate(`/truck-loads/${row.loadId}`, { state: FROM_LIST_STATE });
  const change = (patch: Partial<typeof filters>) => {
    setPagination((p) => ({ ...p, page: 0 }));
    setFilters(patch);
  };
  const chips = [
    ...(filters.date ? [{ key: 'date', label: formatDay(filters.date) }] : []),
    ...(filters.car
      ? [{ key: 'car', label: cars.options.find((c) => c.value === filters.car)?.label ?? 'Camión' }]
      : []),
    ...(filters.driver
      ? [{ key: 'driver', label: drivers.options.find((d) => d.value === filters.driver)?.label ?? 'Chofer' }]
      : []),
    ...(filters.status
      ? [{ key: 'status', label: labelOf(TRUCK_LOAD_STATUS, filters.status as TruckLoadSummary['status']).text }]
      : []),
  ];

  const columns: GridColDef<TruckLoadSummary>[] = [
    {
      field: 'number',
      headerName: 'Carga',
      flex: 1.2,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell
          title={`N° ${row.number} · ${row.carPatent ?? 'Camión'}`}
          subtitle={`${row.driverName} · ${formatDay(row.businessDate)}`}
          icon={Truck}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 220,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(TRUCK_LOAD_STATUS, row.status)} />,
    },
    { field: 'originName', headerName: 'Galpón', flex: 1, minWidth: 140, sortable: false },
    {
      field: 'openedAt',
      headerName: 'Abierta',
      width: 190,
      sortable: false,
      valueGetter: ({ row }) => formatDateTime(row.openedAt),
    },
    {
      field: 'actions',
      headerName: '',
      width: 70,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => <RowActions rowLabel={`carga ${row.number}`} onView={() => goTo(row)} />,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Cargas del camión"
        description="Cada jornada: se abre la carga, sale el camión, se entrega, vuelve y se rinde."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setOpening(true)}>
            Abrir carga
          </Button>
        }
      />
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 border-b border-outline p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Día" type="date" value={filters.date} onChange={(e) => change({ date: e.target.value })} />
          <Select
            label="Camión"
            options={[{ value: '', label: 'Todos los camiones' }, ...cars.options]}
            hint={cars.failed ? 'No se pudieron cargar los camiones' : undefined}
            value={filters.car}
            onChange={(e) => change({ car: e.target.value })}
          />
          <Select
            label="Chofer"
            options={[{ value: '', label: 'Todos los choferes' }, ...drivers.options]}
            hint={drivers.failed ? 'No se pudieron cargar los choferes' : undefined}
            value={filters.driver}
            onChange={(e) => change({ driver: e.target.value })}
          />
          <Select
            label="Estado"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(e) => change({ status: e.target.value })}
          />
        </div>
        {chips.length > 0 && (
          <div className="border-b border-outline px-4 py-3">
            <FilterChips
              items={chips}
              resultCount={data?.total}
              onRemove={(key) => change({ [key]: '' })}
              onClearAll={() => change({ date: '', car: '', driver: '', status: '' })}
            />
          </div>
        )}
        {error ? (
          <ErrorState error={error} resource="Las cargas" onRetry={() => void refetch()} />
        ) : (
          <ResponsiveTable
            label="cargas"
            rows={data?.data ?? []}
            columns={columns}
            getRowId={(row) => row.loadId}
            loading={isFetching}
            pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
            onRowClick={goTo}
            empty={
              chips.length > 0 ? (
                <EmptyState illustration="search" title="Sin resultados" description="Probá con otros filtros." />
              ) : (
                <EmptyState
                  icon={Truck}
                  title="Todavía no hay cargas"
                  description="Abrí la primera para despachar un camión."
                />
              )
            }
            renderCard={(row) => (
              <>
                <IdentityCell
                  title={`N° ${row.number} · ${row.carPatent ?? 'Camión'}`}
                  subtitle={`${row.driverName} · ${formatDay(row.businessDate)}`}
                  icon={Truck}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <Badge label={labelOf(TRUCK_LOAD_STATUS, row.status)} />
                  <span className="text-muted">{row.originName}</span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => goTo(row)}>
                  Ver carga
                </Button>
              </>
            )}
          />
        )}
      </Card>
      <Card>
        <div className="grid grid-cols-1 items-end gap-3 border-b border-outline p-4 sm:grid-cols-[1fr_2fr]">
          <h2 className="text-sm font-semibold text-ink sm:self-center">Stock actual del camión</h2>
          <Select
            label="Camión"
            options={[{ value: '', label: 'Elegí un camión' }, ...cars.options]}
            value={stockCar}
            onChange={(e) => setStockCar(e.target.value)}
          />
        </div>
        <TruckStockCard carId={stockCar || undefined} />
      </Card>
      <OpenTruckLoadModal
        open={opening}
        onClose={() => setOpening(false)}
        onCreated={(load) => navigate(`/truck-loads/${load.loadId}`)}
      />
    </div>
  );
};
