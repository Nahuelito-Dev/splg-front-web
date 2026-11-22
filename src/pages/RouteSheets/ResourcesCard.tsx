import { Truck, UserRound } from 'lucide-react';
import { Badge, Card, CardHeader } from '../../common/components/ui';
import { VehicleCard } from '../../common/components/vehicle/VehicleCard';
import type { RoutePlanResources, RouteSheet } from '../../services/api/types';
import type { Label } from '../../utils/statusLabels';
import { sheetTitle } from './routeSheetLabels';

const FREE: Label = { text: 'Libre', tone: 'success' };
const UNAVAILABLE: Label = { text: 'No disponible', tone: 'neutral' };

/** Libre, no habilitado o con una hoja confirmada ese día (la nombra). */
const stateOf = (available: boolean, busySheetId: string | null, sheets: RouteSheet[]): Label => {
  if (busySheetId) {
    const busy = sheets.find((s) => s.id === busySheetId);
    return { text: busy ? `En ${sheetTitle(busy)}` : 'Con otra hoja', tone: 'info' };
  }
  return available ? FREE : UNAVAILABLE;
};

/** Con qué se cuenta ese día: choferes habilitados y vehículos con su capacidad. */
export const ResourcesCard = ({ resources, sheets }: { resources: RoutePlanResources; sheets: RouteSheet[] }) => (
  <Card className="p-4">
    <CardHeader
      as="h3"
      title="Recursos del día"
      subtitle="Choferes y vehículos que el sistema puede usar. La disponibilidad es la de hoy (licencias, vencimientos y taller)."
    />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section aria-label="Choferes" className="min-w-0">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
          Choferes ({resources.drivers.filter((d) => d.available && !d.busySheetId).length} libres)
        </h4>
        <ul className="divide-y divide-outline-soft rounded-xl border border-outline-soft">
          {resources.drivers.map((driver) => (
            <li key={driver.deliveryId} className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
              <span className="min-w-0 truncate text-ink">{driver.name ?? 'Chofer'}</span>
              <Badge label={stateOf(driver.available, driver.busySheetId, sheets)} />
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Vehículos" className="min-w-0">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <Truck aria-hidden="true" className="h-3.5 w-3.5" />
          Vehículos ({resources.cars.filter((c) => c.available && !c.busySheetId).length} libres)
        </h4>
        <ul className="space-y-2">
          {resources.cars.map((car) => (
            <li key={car.carId} className="min-w-0">
              <VehicleCard
                variant="row"
                carId={car.carId}
                patent={car.patent}
                description={car.description}
                photoUrl={car.photoUrl}
                status={stateOf(car.available, car.busySheetId, sheets)}
              >
                <p className="truncate text-xs text-muted">
                  {[
                    car.capacityUnits ? `${car.capacityUnits} garrafas` : null,
                    car.capacityKg ? `${car.capacityKg} kg` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Sin capacidad cargada'}
                </p>
              </VehicleCard>
            </li>
          ))}
        </ul>
      </section>
    </div>
  </Card>
);
