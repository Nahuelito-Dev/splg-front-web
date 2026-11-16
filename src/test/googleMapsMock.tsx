/**
 * `@vis.gl/react-google-maps` de mentira para jsdom (no hay Google Maps): el mapa es un `div` con sus hijos, y las
 * líneas y polígonos dejan sus datos en atributos para que los tests los lean. `setup.ts` lo monta para todos.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { apiProviderHandlers, mapHandlers, polygonHandlers } from './googleMapsHandlers';

type Point = { lat: number; lng: number };
type Handler = ((point: Point) => void) | undefined;

interface MapProps {
  children?: ReactNode;
  defaultCenter?: Point;
  defaultZoom?: number;
  gestureHandling?: string;
  styles?: unknown[];
  onClick?: (event: { detail: { latLng: Point | null } }) => void;
  onDblclick?: (event: { detail: { latLng: Point | null } }) => void;
}

export const APIProvider = ({ children, onError }: { children?: ReactNode; onError?: (error: unknown) => void }) => {
  apiProviderHandlers.fail = () => onError?.(new Error('no cargó'));
  return <>{children}</>;
};

export const Map = ({
  children,
  defaultCenter,
  defaultZoom,
  gestureHandling,
  styles,
  onClick,
  onDblclick,
}: MapProps) => {
  const handler = (fn: MapProps['onClick']): Handler => fn && ((point) => fn({ detail: { latLng: point } }));
  mapHandlers.click = handler(onClick) ?? (() => undefined);
  mapHandlers.dblclick = handler(onDblclick) ?? (() => undefined);
  return (
    <div
      data-testid="google-map"
      data-center={defaultCenter ? `${defaultCenter.lat},${defaultCenter.lng}` : ''}
      data-zoom={defaultZoom}
      data-gestures={gestureHandling}
      data-styled={styles && styles.length > 0 ? 'true' : 'false'}
    >
      {children}
    </div>
  );
};

interface LineProps {
  encodedPath?: string;
  path?: Point[];
  strokeColor?: string;
  strokeOpacity?: number;
  icons?: unknown[];
}

export const Polyline = ({ encodedPath, path, strokeOpacity, icons }: LineProps) => (
  <div
    data-testid="map-polyline"
    data-encoded={encodedPath ?? ''}
    data-points={path ? path.length : 0}
    data-dashed={strokeOpacity === 0 && icons ? 'true' : 'false'}
  />
);

interface PolygonProps {
  paths?: Point[] | Point[][];
  defaultPaths?: Point[] | Point[][];
  editable?: boolean;
  onClick?: () => void;
  onPathsChanged?: (paths: { lat: () => number; lng: () => number }[][]) => void;
}

/**
 * Como el de vis.gl: los vértices que arrastra la persona quedan en el polígono y sólo se pisan cuando llega otra
 * referencia de `paths` (o se monta de nuevo).
 */
export const Polygon = ({ paths, defaultPaths, editable, onClick, onPathsChanged }: PolygonProps) => {
  const [ring, setRing] = useState(() => (paths ?? defaultPaths ?? []) as Point[]);
  useEffect(() => {
    if (paths) setRing(paths as Point[]);
  }, [paths]);
  if (editable && onPathsChanged) {
    polygonHandlers.change = (next) => {
      setRing(next);
      onPathsChanged([next.map((p) => ({ lat: () => p.lat, lng: () => p.lng }))]);
    };
  }
  return (
    <div
      data-testid="map-polygon"
      data-editable={editable ? 'true' : 'false'}
      data-vertices={ring.length}
      onClick={onClick}
    />
  );
};
