import { useState } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { ArrowLeftRight, Circle, Plus } from 'lucide-react';
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
  ExportCsvButton,
  StatusFilterTabs,
} from '../../common/components/ui';
import { useClampPage, usePermissions, useUrlPagedParams } from '../../hooks';
import type { Tire } from '../../services/api/types';
import { useTires, useTireStatusCounts } from '../../services/queries/fleetExpense';
import { formatCurrency, formatNumber } from '../../utils/format';
import { TIRE_STATUS, labelOf, statusOptions, statusParam } from '../../utils/statusLabels';
import { TireDrawer } from './components/TireDrawer';
import { TireEventModal } from './components/TireEventModal';
import { TireFormModal } from './components/TireFormModal';
import { useCarOptions } from './components/useCarOptions';
import { tireEventsFor } from './fleetExpenseSchemas';
import { asText } from '../../utils/csv';

/** Los neumáticos de la flota (CU-205, CU-206): alta, movimientos e historial. Opcional dentro de la flota ampliada. */
export const Tires = () => {
  const { canWrite, writeHint } = usePermissions();
  const [filters, setFilters, pagination, setPagination] = useUrlPagedParams({ car: '', status: '' }, 10);
  // Un estado inválido en la URL (enlace viejo o escrito a mano) se trata como «todos», en la consulta y en las pestañas.
  const status = statusParam(TIRE_STATUS, filters.status);
  const { options: carOptions } = useCarOptions('Todos los vehículos');
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState<Tire | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const { data, isFetching, error, refetch } = useTires(pagination, {
    carId: filters.car || undefined,
    status: status || undefined,
  });
  const filtered = Boolean(filters.car || status);
  useClampPage(pagination, data?.total, setPagination);
  const canMove = (row: Tire) => canWrite && tireEventsFor(row.status).length > 0;

  const statusCounts = useTireStatusCounts({ carId: filters.car || undefined });

  const columns: GridColDef<Tire>[] = [
    {
      field: 'tire',
      headerName: 'Neumático',
      flex: 1.2,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <IdentityCell title={row.serialNumber} subtitle={`${row.brand} · ${row.size}`} icon={Circle} monoSubtitle />
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 140,
      sortable: false,
      renderCell: ({ row }) => <Badge label={labelOf(TIRE_STATUS, row.status)} />,
    },
    {
      field: 'car',
      headerName: 'Vehículo',
      width: 160,
      sortable: false,
      valueGetter: ({ row }) => (row.carPatent ? `${row.carPatent} · ${row.position ?? ''}` : '—'),
    },
    {
      field: 'km',
      headerName: 'Km recorridos',
      width: 140,
      sortable: false,
      valueGetter: ({ row }) => `${formatNumber(row.kmTraveled)} km`,
    },
    {
      field: 'cost',
      headerName: 'Costo',
      width: 120,
      sortable: false,
      valueGetter: ({ row }) => formatCurrency(row.cost),
    },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <RowActions
          rowLabel={`neumático ${row.serialNumber}`}
          onView={() => setViewing(row.tireId)}
          actions={
            canMove(row) ? [{ label: 'Registrar movimiento', icon: ArrowLeftRight, onClick: () => setMoving(row) }] : []
          }
        />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Neumáticos"
        description="El inventario de neumáticos y sus movimientos. Nunca se editan: cada cambio es un asiento del historial."
        actions={
          <Button icon={<Plus />} disabled={!canWrite} title={writeHint} onClick={() => setCreating(true)}>
            Nuevo neumático
          </Button>
        }
      />
      <Card>
        <StatusFilterTabs
          options={statusOptions(TIRE_STATUS)}
          value={status}
          onChange={(status) => setFilters({ status })}
          counts={statusCounts}
          label="Filtrar neumáticos por estado"
          idPrefix="tires"
        >
          <div className="grid grid-cols-1 items-end gap-3 border-b border-outline p-4 sm:grid-cols-1">
            <Select
              label="Vehículo"
              options={carOptions}
              value={filters.car}
              onChange={(e) => setFilters({ car: e.target.value })}
            />
          </div>
          <div className="flex justify-end border-b border-outline px-4 py-2">
            <ExportCsvButton
              filename="neumaticos"
              headers={['Serie', 'Marca', 'Medida', 'Estado', 'Vehículo', 'Posición', 'Km recorridos', 'Costo']}
              rows={(data?.data ?? []).map((row) => [
                asText(row.serialNumber),
                row.brand,
                row.size,
                labelOf(TIRE_STATUS, row.status).text,
                row.carPatent ?? '',
                row.position ?? '',
                row.kmTraveled ?? '',
                row.cost,
              ])}
            />
          </div>
          {error ? (
            <ErrorState error={error} resource="Los neumáticos" onRetry={() => void refetch()} />
          ) : (
            <ResponsiveTable
              label="neumáticos"
              rows={data?.data ?? []}
              columns={columns}
              getRowId={(row) => row.tireId}
              loading={isFetching}
              pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
              onRowClick={(row) => setViewing(row.tireId)}
              empty={
                filtered ? (
                  <EmptyState illustration="search" title="Sin resultados" description="Probá con otro filtro." />
                ) : (
                  <EmptyState icon={Circle} title="Todavía no hay neumáticos" description="Registrá el primero." />
                )
              }
              renderCard={(row) => (
                <>
                  <IdentityCell title={row.serialNumber} subtitle={`${row.brand} · ${row.size}`} icon={Circle} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={labelOf(TIRE_STATUS, row.status)} />
                    <span className="text-sm text-ink-2">
                      {row.carPatent ? `${row.carPatent} · ${row.position ?? ''}` : 'Sin vehículo'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setViewing(row.tireId)}>
                      Ver
                    </Button>
                    {canMove(row) && (
                      <Button size="sm" variant="secondary" onClick={() => setMoving(row)}>
                        Movimiento
                      </Button>
                    )}
                  </div>
                </>
              )}
            />
          )}
        </StatusFilterTabs>
      </Card>
      <TireFormModal open={creating} onClose={() => setCreating(false)} />
      <TireEventModal tire={moving} onClose={() => setMoving(null)} />
      <TireDrawer tireId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
};
