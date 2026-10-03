import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../../Tracking/leafletIconFix';

/** Mini mapa del punto de entrega: sin zoom con la rueda para no secuestrar el scroll de la página. */
export const OrderMiniMap = ({ position, label }: { position: [number, number]; label: string }) => (
  <div role="img" aria-label={label} className="h-44 overflow-hidden rounded-lg border border-outline">
    <MapContainer center={position} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} />
    </MapContainer>
  </div>
);
