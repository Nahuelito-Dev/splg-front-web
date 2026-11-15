import { HtmlMarker } from '../../../../common/components/map/HtmlMarker';
import { KeepInView } from '../../../../common/components/map/KeepInView';
import { toLatLng, type LatLngTuple } from '../../../../common/components/map/latLng';
import { MapCanvas } from '../../../../common/components/map/MapCanvas';
import { PlacePin } from '../../../../common/components/map/PlacePin';

/** Centro por defecto cuando todavía no hay un punto: Posadas/Garupá. */
const DEFAULT_CENTER: LatLngTuple = [-27.4, -55.89];
const DEFAULT_ZOOM = 13;

interface Props {
  /** `null` mientras no se eligió ningún punto (alta sin dirección previa). */
  value: LatLngTuple | null;
  onChange: (point: LatLngTuple) => void;
  /** Nombre accesible del mapa. */
  ariaLabel?: string;
  /** Ayuda mientras no hay punto. */
  emptyHint?: string;
}

/**
 * Elige un punto sobre el mapa (clic o arrastre del marcador): la API exige
 * `latitude`/`longitude` y no geocodifica direcciones, así que acá es donde
 * queda el dato en vez de en un buscador de direcciones.
 */
export const AddressLocationPicker = ({
  value,
  onChange,
  ariaLabel = 'Mapa para elegir la ubicación de la dirección',
  emptyHint = 'Hacé clic en el mapa para marcar dónde vive el cliente.',
}: Props) => {
  const point = value ? toLatLng(value) : null;
  return (
    <div>
      <MapCanvas
        label={ariaLabel}
        className="h-64 w-full rounded-xl border border-outline"
        defaultCenter={toLatLng(value ?? DEFAULT_CENTER)}
        defaultZoom={DEFAULT_ZOOM}
        gestures="greedy"
        cursor="crosshair"
        onClick={({ lat, lng }) => onChange([lat, lng])}
      >
        <KeepInView point={point} />
        {point && (
          <HtmlMarker
            position={point}
            title="Ubicación elegida (arrastrala para ajustarla)"
            anchor="bottom"
            draggable
            onDragEnd={({ lat, lng }) => onChange([lat, lng])}
            zIndex={10}
          >
            <PlacePin />
          </HtmlMarker>
        )}
      </MapCanvas>
      <p className="mt-1.5 text-xs text-muted">
        {value ? `${value[0].toFixed(6)}, ${value[1].toFixed(6)}` : emptyHint}
      </p>
    </div>
  );
};
