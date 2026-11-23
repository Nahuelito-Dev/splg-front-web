import { MessageSquareText, Phone } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, PersonAvatar, Tabs, cx, tabPanelProps } from '../../common/components/ui';
import { LIVE_VEHICLE_STATUS, vehicleName } from '../../common/components/vehicle/vehicleLabels';
import { usePermiso } from '../../hooks';
import type { LiveVehicle } from '../../services/api/types';
import { NewConversationModal } from '../chat/inbox/MessageButton';
import { useInboxAccess } from '../chat/useInboxAccess';
import { VehicleDocumentsTab } from './VehicleDocumentsTab';
import { VehicleInfoTab } from './VehicleInfoTab';
import { VehicleShippingTab } from './VehicleShippingTab';

type DetailTab = 'shipping' | 'vehicle' | 'documents';
const SHIPPING_TAB = { id: 'shipping', label: 'Envío' } as const;
/** La ficha y la documentación del vehículo las sirve la API de flota: piden `flota.ver`. */
const FLEET_TABS = [
  { id: 'vehicle', label: 'Vehículo' },
  { id: 'documents', label: 'Documentos' },
] as const;
const FLEET_PERMISSION = 'flota.ver';
const TABS_ID = 'vehicle-detail';

interface Props {
  vehicle: LiveVehicle;
  /** Reloj de la pantalla, para el tiempo restante. */
  now: number;
  selectedStopId?: string | null;
  onSelectStop?: (orderId: string) => void;
  /** `false` dentro de un panel que ya pone el título (el `Drawer` del celular). */
  showTitle?: boolean;
  className?: string;
}

const CALL_LINK =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline bg-surface px-3 text-xs font-medium text-ink shadow-control hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

/**
 * El detalle del vehículo elegido en el seguimiento: patente y estado, llamar o escribirle al chofer, y las pestañas
 * Envío (carga, recorrido y paradas) y, con el permiso de flota, Vehículo (su ficha) y Documentos (vencimientos).
 */
export const VehicleDetailPanel = ({
  vehicle,
  now,
  selectedStopId,
  onSelectStop,
  showTitle = true,
  className,
}: Props) => {
  const [chosenTab, setTab] = useState<DetailTab>('shipping');
  // Al seguimiento se entra con permisos de pedidos o despacho; sin el de flota esas dos pestañas no se ofrecen
  // (la API respondería 403). Mientras no se sabe, no se esconde nada.
  const fleet = usePermiso(FLEET_PERMISSION);
  const canSeeFleet = !fleet.known || fleet.allowed;
  const tabs = canSeeFleet ? [SHIPPING_TAB, ...FLEET_TABS] : [SHIPPING_TAB];
  const tab: DetailTab = canSeeFleet ? chosenTab : 'shipping';
  const [chatting, setChatting] = useState(false);
  const inbox = useInboxAccess();
  const { driver } = vehicle;
  const driverName = driver.name ?? 'Chofer';

  return (
    <section
      aria-label={`Detalle de ${vehicleName(vehicle.patent)}`}
      className={cx('flex min-h-0 flex-col', className)}
    >
      <header className="space-y-3 border-b border-outline px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {showTitle ? (
            <h2 className="min-w-0 truncate font-mono text-xl font-bold uppercase tracking-wide text-ink">
              {vehicleName(vehicle.patent)}
            </h2>
          ) : (
            <span className="text-sm text-muted">
              {[vehicle.description, vehicle.typeCar].filter(Boolean).join(' · ') || 'Vehículo'}
            </span>
          )}
          <Badge label={LIVE_VEHICLE_STATUS[vehicle.status]} />
        </div>
        <div className="flex min-w-0 items-center gap-2 text-sm text-ink-2">
          <PersonAvatar name={driverName} userId={driver.userId} size="sm" decorative />
          <span className="min-w-0 truncate">{driverName}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {driver.phone ? (
            <a href={`tel:${driver.phone}`} className={CALL_LINK} aria-label={`Llamar al chofer ${driverName}`}>
              <Phone aria-hidden="true" className="h-3.5 w-3.5" />
              Llamar al chofer
            </a>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<Phone />}
              blockedReason="El chofer no tiene un teléfono cargado"
            >
              Llamar al chofer
            </Button>
          )}
          {inbox.drivers && (
            <Button size="sm" icon={<MessageSquareText />} onClick={() => setChatting(true)}>
              Chat con el chofer
            </Button>
          )}
        </div>
      </header>

      <Tabs
        items={tabs}
        value={tab}
        onChange={(id) => setTab(id as DetailTab)}
        label="Secciones del vehículo"
        idPrefix={TABS_ID}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4" {...tabPanelProps(TABS_ID, tab)}>
        {tab === 'shipping' && (
          <VehicleShippingTab vehicle={vehicle} now={now} selectedStopId={selectedStopId} onSelectStop={onSelectStop} />
        )}
        {tab === 'vehicle' && <VehicleInfoTab carId={vehicle.carId} />}
        {tab === 'documents' && <VehicleDocumentsTab carId={vehicle.carId} />}
      </div>

      {chatting && (
        <NewConversationModal
          target={{ kind: 'driver', userId: driver.userId, name: driverName }}
          open={chatting}
          onClose={() => setChatting(false)}
          channels={['staff_driver']}
        />
      )}
    </section>
  );
};
