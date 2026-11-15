import { HtmlMarker } from '../../../common/components/map/HtmlMarker';
import { KeepInView } from '../../../common/components/map/KeepInView';
import { MapCanvas } from '../../../common/components/map/MapCanvas';
import { PlacePin } from '../../../common/components/map/PlacePin';
import { Card, CardHeader } from '../../../common/components/ui';
import type { Delivery } from '../../../services/api/types';
import { parseLatLng } from '../deliveryLocation';

/**
 * Última posición conocida del chofer: el punto de `latLng` en un mini mapa y, debajo, la dirección
 * aproximada que informó su app (`actual_location`). La API no devuelve la hora de esa posición.
 */
export const DeliveryLocationCard = ({ delivery }: { delivery: Delivery }) => {
  const point = parseLatLng(delivery.latLng);
  const address = delivery.actual_location;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 pb-3">
        <CardHeader title="Última ubicación" className="" />
        <p className="mt-0.5 text-sm text-muted">{address || 'La app del chofer no informó una dirección.'}</p>
      </div>
      {point ? (
        <MapCanvas
          label="Mapa de la última ubicación del chofer"
          className="h-56 border-t border-outline"
          defaultCenter={point}
          defaultZoom={15}
        >
          <HtmlMarker position={point} title="Última ubicación del chofer" anchor="bottom">
            <PlacePin />
          </HtmlMarker>
          <KeepInView point={point} />
        </MapCanvas>
      ) : (
        <p className="border-t border-outline p-4 text-sm text-muted">Todavía no se registró una posición.</p>
      )}
      <p className="border-t border-outline px-4 py-2.5 text-xs text-muted">
        {point
          ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} · la API no informa a qué hora se tomó.`
          : 'La posición se actualiza cuando el chofer abre su app.'}
      </p>
    </Card>
  );
};
