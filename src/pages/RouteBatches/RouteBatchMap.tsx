import { Polyline } from '@vis.gl/react-google-maps';
import { useMemo } from 'react';
import { HtmlMarker } from '../../common/components/map/HtmlMarker';
import { dashedLine, toLatLng } from '../../common/components/map/latLng';
import { MapCanvas } from '../../common/components/map/MapCanvas';
import { StopPin } from '../../common/components/map/StopPin';
import { useMapTheme } from '../../theme/mapTheme';

type Point = { position: [number, number]; sequence: number };

/** El recorrido sobre el mapa: cada parada numerada en su orden de entrega, unidas en línea recta. */
export const RouteBatchMap = ({ points, label }: { points: Point[]; label: string }) => {
  const theme = useMapTheme();
  const path = useMemo(() => points.map((p) => toLatLng(p.position)), [points]);
  return (
    <MapCanvas label={label} className="h-64 rounded-lg border border-outline" fitPoints={path} maxFitZoom={15}>
      {path.length > 1 && <Polyline path={path} zIndex={1} {...dashedLine(theme.primary)} />}
      {points.map((p) => (
        <HtmlMarker key={p.sequence} position={toLatLng(p.position)} title={`Parada ${p.sequence}`} zIndex={10}>
          <StopPin sequence={p.sequence} />
        </HtmlMarker>
      ))}
    </MapCanvas>
  );
};
