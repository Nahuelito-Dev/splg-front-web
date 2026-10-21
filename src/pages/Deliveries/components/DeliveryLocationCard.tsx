import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardHeader } from '../../../common/components/ui';
import type { Delivery } from '../../../services/api/types';
import '../../Tracking/leafletIconFix';
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
        <div className="h-56 border-t border-outline" data-testid="delivery-location-map">
          <MapContainer
            center={[point.lat, point.lng]}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[point.lat, point.lng]} />
          </MapContainer>
        </div>
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
