import { Polyline } from '@vis.gl/react-google-maps';
import { useMemo } from 'react';
import { DriverPin } from '../../common/components/map/DriverPin';
import { HtmlMarker } from '../../common/components/map/HtmlMarker';
import { KeepInView } from '../../common/components/map/KeepInView';
import { dashedLine, pointsKey, type LatLng } from '../../common/components/map/latLng';
import { MapCanvas } from '../../common/components/map/MapCanvas';
import { StopPin, type StopTone } from '../../common/components/map/StopPin';
import { WarehousePin } from '../../common/components/map/WarehousePin';
import type { RouteSheetExecutionStop } from '../../services/api/types';
import { useRouteSheetPath } from '../../services/queries/routeSheets';
import { useMapTheme } from '../../theme/mapTheme';
import { RoutePathStatus } from './RoutePathStatus';
import { hhmm, stopName } from './routeSheetLabels';

/** Lo que el mapa necesita de una parada: sirve la del plan y la del seguimiento. */
export interface MapStop {
  orderId: string;
  sequence: number | null;
  customerName: string | null;
  lat: number | null;
  lng: number | null;
  late: boolean;
  locked?: boolean;
  progress?: RouteSheetExecutionStop['progress'];
}

type Located = MapStop & { lat: number; lng: number; sequence: number };
const located = (stop: MapStop): stop is Located => stop.lat !== null && stop.lng !== null && stop.sequence !== null;

const toneOf = (stop: MapStop): StopTone => {
  if (stop.progress === 'delivered') return 'done';
  if (stop.progress === 'failed') return 'failed';
  if (stop.progress === 'on_the_way') return 'current';
  if (stop.late) return 'late';
  return stop.locked ? 'locked' : 'normal';
};

interface Props {
  sheetId: string;
  stops: MapStop[];
  selectedId: string | null;
  onSelect: (orderId: string) => void;
  /** Última posición del chofer (hoja en curso). */
  driver?: { lat: number; lng: number; at: string | null } | null;
}

/**
 * El recorrido de la hoja sobre Google Maps: del galpón a cada parada numerada en su orden y de vuelta, por calles
 * (`GET /route-sheets/:id/path`). Mientras se traza, o si el servicio de mapas no responde, las paradas van unidas en
 * línea punteada. En la calle, las entregadas en verde, la que está en camino resaltada y el chofer en vivo.
 */
export const RouteSheetMap = ({ sheetId, stops, selectedId, onSelect, driver }: Props) => {
  const theme = useMapTheme();
  const query = useRouteSheetPath(sheetId);
  // Si la recarga falla, lo que quedó de antes es de otro orden de paradas: no se dibuja (el aviso dice «línea recta»).
  const fresh = query.isError ? undefined : query.data;
  const points = useMemo(() => stops.filter(located), [stops]);
  const warehouse = fresh?.warehouse ?? null;
  const streets = fresh?.encodedPolyline || null;

  const fitPoints = useMemo(
    (): LatLng[] => [...(warehouse ? [warehouse] : []), ...points.map(({ lat, lng }) => ({ lat, lng }))],
    [warehouse, points],
  );
  const straight = useMemo(
    (): LatLng[] => (warehouse ? [warehouse, ...fitPoints.slice(1), warehouse] : fitPoints),
    [warehouse, fitPoints],
  );
  const selected = points.find((stop) => stop.orderId === selectedId) ?? null;
  // Se encuadra al cargar y cuando cambia qué paradas hay, no cuando sólo cambia su orden.
  const fitKey = useMemo(() => pointsKey(fitPoints).split('|').sort().join('|'), [fitPoints]);

  return (
    <div>
      <MapCanvas
        label="Mapa del recorrido"
        className="h-72 sm:h-96 lg:h-[min(36rem,calc(100vh-13rem))]"
        fitPoints={fitPoints}
        fitKey={fitKey}
        fitScope={sheetId}
        maxFitZoom={15}
      >
        {streets ? (
          <>
            <Polyline encodedPath={streets} strokeColor={theme.halo} strokeWeight={8} strokeOpacity={0.9} zIndex={1} />
            <Polyline encodedPath={streets} strokeColor={theme.primary} strokeWeight={4} strokeOpacity={1} zIndex={2} />
          </>
        ) : (
          straight.length > 1 && <Polyline path={straight} zIndex={1} {...dashedLine(theme.primary)} />
        )}
        {warehouse && (
          <HtmlMarker position={warehouse} title="Galpón: salida y vuelta" zIndex={5}>
            <WarehousePin />
          </HtmlMarker>
        )}
        {points.map((stop) => (
          <HtmlMarker
            key={stop.orderId}
            position={stop}
            title={`${stop.sequence}. ${stopName(stop)}`}
            onClick={() => onSelect(stop.orderId)}
            zIndex={stop.orderId === selectedId ? 20 : 10}
          >
            <StopPin sequence={stop.sequence} tone={toneOf(stop)} selected={stop.orderId === selectedId} />
          </HtmlMarker>
        ))}
        {driver && (
          <HtmlMarker
            position={driver}
            title={driver.at ? `Chofer · posición de las ${hhmm(driver.at)}` : 'Chofer'}
            zIndex={30}
          >
            <DriverPin />
          </HtmlMarker>
        )}
        <KeepInView point={selected} />
      </MapCanvas>
      <RoutePathStatus
        path={{ data: fresh, isPending: query.isPending, isError: query.isError, error: query.error }}
        stops={stops}
      />
    </div>
  );
};
