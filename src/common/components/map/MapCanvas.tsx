import { APIProvider, Map, type MapMouseEvent } from '@vis.gl/react-google-maps';
import type { ReactNode } from 'react';
import { env } from '../../../config/env';
import { useMapTheme } from '../../../theme/mapTheme';
import { cx } from '../ui';
import { FitBounds } from './FitBounds';
import { DEFAULT_MAP_CENTER, type LatLng } from './latLng';
import { MapNotice } from './MapNotice';
import { reportMapsLoadError, useMapsStatus } from './mapsStatus';

interface Props {
  /** Nombre accesible del mapa. */
  label: string;
  /** Alto (y bordes) del mapa: `h-64`, `h-full`… */
  className?: string;
  defaultCenter?: LatLng;
  defaultZoom?: number;
  /** Puntos que tienen que verse: el mapa se encuadra a ellos cada vez que cambian. */
  fitPoints?: LatLng[];
  /** Cuándo volver a encuadrar, si no alcanza con que cambien las coordenadas. */
  fitKey?: string;
  /** Qué se está mirando: si la persona movió el mapa, se vuelve a encuadrar recién cuando cambia (ver `FitBounds`). */
  fitScope?: string;
  maxFitZoom?: number;
  /**
   * `cooperative` (por omisión): en una página con scroll la rueda no hace zoom sin Ctrl y en el celular se mueve con
   * dos dedos. `greedy`: para los mapas que son la pantalla (seguimiento, zonas, elegir un punto).
   */
  gestures?: 'cooperative' | 'greedy';
  onClick?: (point: LatLng) => void;
  onDoubleClick?: (point: LatLng) => void;
  /** Sin el zoom del doble clic (al dibujar, el doble clic termina el trazo). */
  disableDoubleClickZoom?: boolean;
  /** Cursor sobre el mapa (`crosshair` mientras se elige un punto). */
  cursor?: string;
  /** Lo que va sobre el mapa: marcadores, líneas, polígonos. */
  children?: ReactNode;
  /** Lo que flota encima (avisos, ayudas); se dibuja también cuando el mapa no está disponible. */
  overlay?: ReactNode;
}

const pointOf = (event: MapMouseEvent): LatLng | null => event.detail.latLng;

/**
 * El mapa del panel: Google Maps con el estilo Brasa del tema (claro u oscuro), sin los controles que no se usan.
 * Sin clave, o si Google la rechaza (`gm_authFailure`) o no carga, muestra un aviso en su lugar.
 */
export const MapCanvas = ({
  label,
  className,
  defaultCenter = DEFAULT_MAP_CENTER,
  defaultZoom = 13,
  fitPoints,
  fitKey,
  fitScope,
  maxFitZoom,
  gestures = 'cooperative',
  onClick,
  onDoubleClick,
  disableDoubleClickZoom,
  cursor,
  children,
  overlay,
}: Props) => {
  const theme = useMapTheme();
  const status = useMapsStatus();
  const apiKey = env.googleMapsApiKey;
  const reason = !apiKey ? 'missing-key' : status === 'ok' ? null : status;

  return (
    <div role="group" aria-label={label} className={cx('relative isolate overflow-hidden', className)}>
      {reason ? (
        <MapNotice reason={reason} />
      ) : (
        <APIProvider apiKey={apiKey} language="es" region="AR" onError={reportMapsLoadError}>
          <Map
            className="h-full w-full"
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
            gestureHandling={gestures}
            styles={theme.styles}
            backgroundColor={theme.background}
            disableDefaultUI
            zoomControl
            fullscreenControl
            clickableIcons={false}
            keyboardShortcuts
            disableDoubleClickZoom={disableDoubleClickZoom}
            draggableCursor={cursor}
            onClick={
              onClick
                ? (event) => {
                    const point = pointOf(event);
                    if (point) onClick(point);
                  }
                : undefined
            }
            onDblclick={
              onDoubleClick
                ? (event) => {
                    const point = pointOf(event);
                    if (point) onDoubleClick(point);
                  }
                : undefined
            }
          >
            {fitPoints && <FitBounds points={fitPoints} fitKey={fitKey} scopeKey={fitScope} maxZoom={maxFitZoom} />}
            {children}
          </Map>
        </APIProvider>
      )}
      {overlay}
    </div>
  );
};
