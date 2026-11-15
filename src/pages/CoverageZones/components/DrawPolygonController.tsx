import { Polygon, Polyline } from '@vis.gl/react-google-maps';
import { HtmlMarker } from '../../../common/components/map/HtmlMarker';
import type { LatLng } from '../../../common/components/map/latLng';
import { PointPin } from '../../../common/components/map/PointPin';
import { useMapTheme } from '../../../theme/mapTheme';
import { MIN_POLYGON_VERTICES, verticesToGeoJsonRing } from '../coverageZoneUtils';

/** El trazo de una zona nueva: los vértices marcados y si ya se cerró. */
export interface PolygonDraft {
  points: LatLng[];
  closed: boolean;
}

interface Props {
  draft: PolygonDraft;
  /** Cerrar el trazo tocando el primer vértice. */
  onClose: () => void;
  /** Cada ajuste de un vértice del polígono ya cerrado. */
  onChange: (ring: number[][]) => void;
}

/**
 * La zona que se está dibujando. Abierta: los vértices unidos por una línea (el primero, con 3 o más, cierra la zona
 * al tocarlo). Cerrada: un polígono con los vértices arrastrables para ajustarla antes de guardar. Reemplaza la
 * librería Drawing de Google, que está discontinuada.
 */
export const DrawPolygonController = ({ draft, onClose, onChange }: Props) => {
  const theme = useMapTheme();
  const { points, closed } = draft;

  if (closed) {
    return (
      <Polygon
        defaultPaths={points}
        strokeColor={theme.primary}
        strokeWeight={3}
        fillColor={theme.primary}
        fillOpacity={0.18}
        editable
        draggable={false}
        zIndex={4}
        onPathsChanged={([ring]) =>
          onChange(verticesToGeoJsonRing(ring.map((point) => ({ lat: point.lat(), lng: point.lng() }))))
        }
      />
    );
  }

  const canClose = points.length >= MIN_POLYGON_VERTICES;
  return (
    <>
      {points.length > 1 && <Polyline path={points} strokeColor={theme.primary} strokeWeight={3} zIndex={4} />}
      {points.map((point, index) => (
        <HtmlMarker
          key={`${point.lat},${point.lng},${index}`}
          position={point}
          title={index === 0 && canClose ? 'Cerrar la zona' : `Vértice ${index + 1}`}
          onClick={index === 0 && canClose ? onClose : undefined}
          zIndex={index === 0 ? 6 : 5}
        >
          <PointPin size={index === 0 && canClose ? 'md' : 'sm'} />
        </HtmlMarker>
      ))}
    </>
  );
};
