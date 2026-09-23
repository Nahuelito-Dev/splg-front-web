import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../leafletIconFix';
import { MapAutoCenter } from './MapAutoCenter';
import { TrackedOrder } from '../types';

// Centro por defecto: Tucumán (zona de operación de la distribuidora) hasta que
// llegue la primera posición real de un chofer.
const DEFAULT_CENTER: LatLngExpression = [-26.82, -65.22];
const DEFAULT_ZOOM = 12;

interface Props {
  trackedOrders: TrackedOrder[];
  focusPoint: { lat: number; lng: number } | null;
}

export const TrackingMap = ({ trackedOrders, focusPoint }: Props) => {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapAutoCenter focusPoint={focusPoint} />

      {trackedOrders.map((order) => (
        <Marker key={order.orderId} position={[order.lat, order.lng]}>
          <Popup>
            <strong>Pedido #{order.orderId.slice(0, 8)}</strong>
            <br />
            Chofer #{order.driverId.slice(0, 8)}
            <br />
            Última actualización: {new Date(order.at).toLocaleTimeString(
              'es-AR',
              { hour: '2-digit', minute: '2-digit', second: '2-digit' },
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
