import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  EmptyState,
  ErrorState,
  TableSkeleton,
  PageHeader,
  SearchInput,
  Select,
} from '../../common/components/ui';
import { usePermissions } from '../../hooks';
import { useFleetExpirations } from '../../services/queries/fleet';
import { ExpirationsTable, type ExpirationRow } from './components/ExpirationsTable';

const WINDOW_OPTIONS = [
  { value: '7', label: '7 días' },
  { value: '15', label: '15 días' },
  { value: '30', label: '30 días' },
  { value: '60', label: '60 días' },
  { value: '90', label: '90 días' },
];

const normalize = (value: string) => value.trim().toLowerCase();

/** Lo vencido y lo que vence pronto, de toda la flota, en una sola pantalla. */
export const FleetExpirations = () => {
  const navigate = useNavigate();
  const { needsDistributor } = usePermissions();
  const [withinDays, setWithinDays] = useState(30);
  const [search, setSearch] = useState('');
  // Sin distribuidora elegida (super_admin sin "Ver como") no se dispara: la API la rechaza
  // con un 400 técnico ("Falta la distribuidora...") que no hay que mostrar.
  const { data, isPending, error, refetch } = useFleetExpirations(withinDays, !needsDistributor);

  const vehicleRows = useMemo<ExpirationRow[]>(
    () =>
      (data?.vehicles ?? []).flatMap((vehicle) =>
        vehicle.items.map((item) => ({
          key: `${vehicle.carId}-${item.taskId}`,
          ownerId: vehicle.carId,
          title: [vehicle.carBrand, vehicle.carModel].filter(Boolean).join(' ') || 'Vehículo',
          subtitle: vehicle.carPatent ?? undefined,
          isLocked: vehicle.isLocked,
          item,
        })),
      ),
    [data],
  );

  const driverRows = useMemo<ExpirationRow[]>(
    () =>
      (data?.drivers ?? []).flatMap((driver) =>
        driver.items.map((item) => ({
          key: `${driver.deliveryId}-${item.taskId}`,
          ownerId: driver.deliveryId,
          title: driver.fullName ?? 'Sin nombre',
          isLocked: driver.isLocked,
          item,
        })),
      ),
    [data],
  );

  const term = normalize(search);
  const matches = (row: ExpirationRow) =>
    !term || [row.title, row.subtitle, row.item.planName].some((value) => value && normalize(value).includes(term));

  const filteredVehicles = vehicleRows.filter(matches);
  const filteredDrivers = driverRows.filter(matches);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader title="Vencimientos" description="Lo vencido y lo que vence pronto, de vehículos y choferes." />

      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus vencimientos."
          />
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              label="Buscar vencimientos"
              placeholder="Patente, nombre o documento"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              label="Ventana de tiempo"
              options={WINDOW_OPTIONS}
              className="w-32"
              value={String(withinDays)}
              onChange={(e) => setWithinDays(Number(e.target.value))}
            />
          </Card>

          {error ? (
            <ErrorState error={error} resource="Los vencimientos" onRetry={() => void refetch()} />
          ) : isPending ? (
            <TableSkeleton columns={5} />
          ) : (
            <>
              <p className="text-sm text-muted" aria-live="polite">
                {filteredVehicles.length + filteredDrivers.length} en total
              </p>

              <Card>
                <div className="border-b border-outline p-4">
                  <h2 className="text-base font-semibold text-ink">Vehículos</h2>
                </div>
                <ExpirationsTable
                  rows={filteredVehicles}
                  identityHeader="Vehículo"
                  loading={false}
                  emptyTitle="Sin vencimientos de vehículos en esta ventana"
                  onView={(row) => navigate(`/cars/details/${row.ownerId}`)}
                />
              </Card>

              <Card>
                <div className="border-b border-outline p-4">
                  <h2 className="text-base font-semibold text-ink">Choferes</h2>
                </div>
                <ExpirationsTable
                  rows={filteredDrivers}
                  identityHeader="Chofer"
                  loading={false}
                  emptyTitle="Sin vencimientos de choferes en esta ventana"
                  onView={(row) => navigate(`/deliveries/details/${row.ownerId}`)}
                />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};
