import { useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, LatLngTuple, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../../Tracking/leafletIconFix';

/** Centro por defecto cuando todavía no hay un punto: Posadas/Garupá. */
const DEFAULT_CENTER: LatLngTuple = [-27.4, -55.89];
const DEFAULT_ZOOM = 13;

interface Props {
  /** `null` mientras no se eligió ningún punto (alta sin dirección previa). */
  value: LatLngTuple | null;
  onChange: (point: LatLngTuple) => void;
}

/** Escucha clics en el mapa para mover el marcador. */
const ClickToPlace = ({ onChange }: { onChange: (point: LatLngTuple) => void }) => {
  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
};

/**
 * Elige un punto sobre el mapa (clic o arrastre del marcador): la API exige
 * `latitude`/`longitude` y no geocodifica direcciones, así que acá es donde
 * queda el dato en vez de en un buscador de direcciones.
 */
export const AddressLocationPicker = ({ value, onChange }: Props) => {
  const center: LatLngExpression = useMemo(() => value ?? DEFAULT_CENTER, [value]);

  return (
    <div>
      <div
        className="h-64 w-full overflow-hidden rounded-xl border border-outline"
        role="group"
        aria-label="Mapa para elegir la ubicación de la dirección"
      >
        <MapContainer center={center} zoom={DEFAULT_ZOOM} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlace onChange={onChange} />
          {value && (
            <Marker
              position={value}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const { lat, lng } = (event.target as LeafletMarker).getLatLng();
                  onChange([lat, lng]);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {value
          ? `${value[0].toFixed(6)}, ${value[1].toFixed(6)}`
          : 'Hacé clic en el mapa para marcar dónde vive el cliente.'}
      </p>
    </div>
  );
};
