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
  Tabs,
  tabPanelProps,
  type TabItem,
} from '../../common/components/ui';
import { usePermissions, useUrlParams } from '../../hooks';
import { useFleetExpirations } from '../../services/queries/fleet';
import { POSITION_CATEGORY_LABELS } from '../Employees/employeeLabels';
import { ExpirationsTable, type ExpirationRow } from './components/ExpirationsTable';

const TABS_ID = 'expirations';
const SEGMENTS = ['fleet', 'staff'] as const;
type Segment = (typeof SEGMENTS)[number];
const SEGMENT_TABS: TabItem[] = [
  { id: 'fleet', label: 'Vehículos y choferes' },
  { id: 'staff', label: 'Personal' },
];

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
  // `?subject=employee` abre directo el personal (lo usa el tablero «Personal hoy»).
  const [{ subject, category }, setFilters] = useUrlParams({ subject: 'vehicle', category: '' });
  const segment: Segment = subject === 'employee' ? 'staff' : 'fleet';
  const categoryFilter = (Object.keys(POSITION_CATEGORY_LABELS) as (keyof typeof POSITION_CATEGORY_LABELS)[]).find(
    (c) => c === category,
  );
  // Sin distribuidora elegida (super_admin sin "Ver como") no se dispara: la API la rechaza
  // con un 400 técnico ("Falta la distribuidora...") que no hay que mostrar.
  const { data, isPending, error, refetch } = useFleetExpirations(withinDays, !needsDistributor, {
    subject: segment === 'staff' ? 'employee' : 'vehicle',
    category: segment === 'staff' ? categoryFilter : undefined,
  });

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

  const staffRows = useMemo<ExpirationRow[]>(
    () =>
      (data?.employees ?? []).flatMap((employee) =>
        employee.items.map((item) => ({
          key: `${employee.employeeId}-${item.taskId}`,
          ownerId: employee.employeeId,
          title: employee.fullName,
          subtitle: `${employee.positionName} · legajo ${employee.fileNumber}`,
          isLocked: employee.isLocked,
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
  const filteredStaff = staffRows.filter(matches);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Vencimientos"
        description="Lo vencido y lo que vence pronto, de vehículos, choferes y personal."
      />

      {needsDistributor ? (
        <Card className="p-6">
          <EmptyState
            title="Elegí una distribuidora"
            description="Como administrador general, elegí una con «Ver como» para ver sus vencimientos."
          />
        </Card>
      ) : (
        <>
          <Card>
            <Tabs
              items={SEGMENT_TABS}
              value={segment}
              onChange={(id) => setFilters({ subject: id === 'staff' ? 'employee' : 'vehicle', category: '' })}
              label="Qué vencimientos ver"
              idPrefix={TABS_ID}
            />
            <div
              {...tabPanelProps(TABS_ID, segment)}
              className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
            >
              <SearchInput
                label="Buscar vencimientos"
                placeholder={segment === 'staff' ? 'Nombre, legajo o documento' : 'Patente, nombre o documento'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {segment === 'staff' && (
                <Select
                  label="Categoría de puesto"
                  className="w-48"
                  value={categoryFilter ?? ''}
                  onChange={(e) => setFilters({ category: e.target.value })}
                  options={[
                    { value: '', label: 'Todas' },
                    ...Object.entries(POSITION_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
                  ]}
                />
              )}
              <Select
                label="Ventana de tiempo"
                options={WINDOW_OPTIONS}
                className="w-32"
                value={String(withinDays)}
                onChange={(e) => setWithinDays(Number(e.target.value))}
              />
            </div>
          </Card>

          {error ? (
            <ErrorState error={error} resource="Los vencimientos" onRetry={() => void refetch()} />
          ) : isPending ? (
            <TableSkeleton columns={5} />
          ) : segment === 'staff' ? (
            <>
              <p className="text-sm text-muted" aria-live="polite">
                {filteredStaff.length} en total
              </p>
              <Card>
                <div className="border-b border-outline p-4">
                  <h2 className="text-base font-semibold text-ink">Personal</h2>
                  <p className="text-xs text-muted">
                    Incluye la licencia de conducir de los choferes. Los empleados con documentación bloqueante vencida
                    no reciben pedidos.
                  </p>
                </div>
                <ExpirationsTable
                  rows={filteredStaff}
                  identityHeader="Empleado"
                  loading={false}
                  emptyTitle="Sin vencimientos del personal en esta ventana"
                  onView={(row) => navigate(`/employees/details/${row.ownerId}?tab=documents`)}
                />
              </Card>
            </>
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
