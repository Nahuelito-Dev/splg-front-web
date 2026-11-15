import { HtmlMarker } from '../../../../common/components/map/HtmlMarker';
import { KeepInView } from '../../../../common/components/map/KeepInView';
import { toLatLng } from '../../../../common/components/map/latLng';
import { MapCanvas } from '../../../../common/components/map/MapCanvas';
import { PlacePin } from '../../../../common/components/map/PlacePin';

/** Mini mapa del punto de entrega: la rueda no hace zoom sin Ctrl para no secuestrar el scroll de la página. */
export const OrderMiniMap = ({ position, label }: { position: [number, number]; label: string }) => (
  <MapCanvas
    label={label}
    className="h-44 rounded-lg border border-outline"
    defaultCenter={toLatLng(position)}
    defaultZoom={15}
  >
    <HtmlMarker position={toLatLng(position)} title="Punto de entrega" anchor="bottom">
      <PlacePin />
    </HtmlMarker>
    <KeepInView point={toLatLng(position)} />
  </MapCanvas>
);
