import { useMediaQuery } from '@mui/material';
import { Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Badge,
  Card,
  Drawer,
  EmptyState,
  PageContainer,
  PageHeader,
  Tabs,
  tabPanelProps,
} from '../../common/components/ui';
import { vehicleName } from '../../common/components/vehicle/vehicleLabels';
import { VehicleDetailPanel } from '../../features/vehicles/VehicleDetailPanel';
import { AvailableOrdersPool } from './components/AvailableOrdersPool';
import { TrackingMap } from './components/TrackingMap';
import { VehicleList } from './components/VehicleList';
import { useAvailablePool } from './useAvailablePool';
import { useLiveTracking } from './useLiveTracking';
import { useTrackingAccess } from './useTrackingAccess';

type PanelTab = 'vehicles' | 'pool';
const TABS_ID = 'tracking';
/** Desde acá entran las tres zonas lado a lado (el `lg` de Tailwind). */
const DESKTOP_QUERY = '(min-width: 1024px)';
/** Cada cuánto se recalcula el tiempo restante. */
const CLOCK_MS = 30_000;

/**
 * Seguimiento en vivo. Sin `pedidos.ver` ni `despacho.gestionar` (lo que exige la API) no se pide nada y se explica
 * qué permiso falta; el menú tampoco muestra la pantalla, pero se puede llegar por la URL.
 */
export const Tracking = () => {
  const { forbidden } = useTrackingAccess();
  if (!forbidden) return <TrackingBoard />;
  return (
    <PageContainer size="full">
      <PageHeader
        title="Seguimiento en vivo"
        description="Los vehículos en uso, dónde están y qué les falta entregar."
      />
      <Card className="p-6">
        <EmptyState
          icon={Truck}
          title="No tenés permiso para el seguimiento en vivo"
          description="Hace falta el permiso «Ver los pedidos» o «Gestionar el despacho». Pedíselo a quien administra los roles del personal."
        />
      </Card>
    </PageContainer>
  );
};

/**
 * Las tres zonas: las tarjetas de los vehículos en uso (y el pool de pedidos sin chofer), el mapa y el detalle del
 * vehículo elegido. En pantallas chicas el detalle se abre en un panel lateral.
 */
const TrackingBoard = () => {
  const tracking = useLiveTracking();
  const { isOnline, needsDistributor, vehicles } = tracking;
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [tab, setTab] = useState<PanelTab>('vehicles');
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(interval);
  }, []);

  const pool = useAvailablePool(isOnline);
  // El contador sale de la misma consulta que la lista; sin datos todavía, un guion y no un 0.
  const poolCount = pool.isLoading || pool.isError ? null : pool.total;
  const vehicleCount = tracking.isLoading || tracking.isError || needsDistributor ? null : vehicles.length;
  // El vehículo elegido puede dejar de estar en uso mientras se mira: el detalle se cierra solo.
  const selected = vehicles.find((vehicle) => vehicle.carId === selectedCarId) ?? null;

  const selectVehicle = (carId: string) => {
    setSelectedStopId(null);
    setSelectedCarId((current) => (current === carId && desktop ? null : carId));
  };
  const closeDetail = () => {
    setSelectedCarId(null);
    setSelectedStopId(null);
  };

  const detail = selected && (
    <VehicleDetailPanel
      // Otro vehículo arranca en «Envío».
      key={selected.carId}
      vehicle={selected}
      now={now}
      selectedStopId={selectedStopId}
      onSelectStop={setSelectedStopId}
      showTitle={desktop}
      className="h-full"
    />
  );

  return (
    <PageContainer size="full">
      <PageHeader
        title="Seguimiento en vivo"
        description="Los vehículos en uso, dónde están, qué llevan y qué les falta entregar."
        actions={
          <Badge
            label={
              isOnline
                ? { text: 'Conectado', tone: 'success' }
                : { text: 'Sin conexión en tiempo real', tone: 'danger' }
            }
          />
        }
      />

      <section className="grid gap-4 lg:h-[calc(100vh-13rem)] lg:min-h-[32rem] lg:grid-cols-[340px_minmax(0,1fr)_380px]">
        <Card className="flex max-h-[75vh] min-h-0 flex-col overflow-hidden lg:max-h-none">
          <Tabs
            items={[
              { id: 'vehicles', label: 'Vehículos', count: vehicleCount },
              { id: 'pool', label: 'Disponibles', count: poolCount },
            ]}
            value={tab}
            onChange={(id) => setTab(id as PanelTab)}
            label="Vehículos y pedidos del seguimiento"
            idPrefix={TABS_ID}
          />
          <div className="min-h-0 flex-1 overflow-y-auto" {...tabPanelProps(TABS_ID, tab)}>
            {tab === 'vehicles' ? (
              <VehicleList
                vehicles={vehicles}
                selectedCarId={selectedCarId}
                onSelect={selectVehicle}
                now={now}
                isLoading={tracking.isLoading}
                isError={tracking.isError}
                error={tracking.error}
                onRetry={tracking.refetch}
                needsDistributor={needsDistributor}
              />
            ) : (
              <AvailableOrdersPool pool={pool} />
            )}
          </div>
        </Card>

        <Card className="h-[60vh] min-h-[20rem] overflow-hidden lg:h-auto">
          <TrackingMap
            vehicles={vehicles}
            selectedCarId={selectedCarId}
            onSelectVehicle={selectVehicle}
            selectedStopId={selectedStopId}
            onSelectStop={setSelectedStopId}
            looseOrders={tracking.looseOrders}
          />
        </Card>

        {desktop && (
          <Card className="min-h-0 overflow-hidden" data-testid="vehicle-detail-zone">
            {detail || (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  icon={Truck}
                  title="Elegí un vehículo"
                  description="Tocá una tarjeta o un vehículo del mapa para ver su carga, su recorrido y sus documentos."
                />
              </div>
            )}
          </Card>
        )}
      </section>

      {!desktop && (
        <Drawer
          open={Boolean(selected)}
          onClose={closeDetail}
          title={selected ? vehicleName(selected.patent) : 'Vehículo'}
          description={selected?.driver.name ?? undefined}
        >
          {/* El panel trae su propio margen: se compensa el del `Drawer`. */}
          <div className="-mx-5 -my-5">{detail}</div>
        </Drawer>
      )}
    </PageContainer>
  );
};
