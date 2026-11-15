import { MapPinOff, TriangleAlert } from 'lucide-react';
import type { RouteSheetPath } from '../../services/api/types';
import { pathErrorText } from './routeSheetErrors';
import { formatKm, formatMinutes, stopName } from './routeSheetLabels';

interface Props {
  path: { data?: RouteSheetPath; isPending: boolean; isError: boolean; error: unknown };
  stops: { orderId: string; customerName: string | null; lat: number | null; lng: number | null }[];
}

/** Debajo del mapa: cuánto da el recorrido por calles, o por qué va en línea recta, y qué paradas no están. */
export const RoutePathStatus = ({ path, stops }: Props) => {
  const skippedIds = path.data
    ? path.data.skippedOrderIds
    : stops.filter((s) => s.lat === null || s.lng === null).map((s) => s.orderId);
  const skipped = skippedIds.flatMap((id) => stops.filter((s) => s.orderId === id));

  let line: string | null = null;
  if (path.isPending) line = 'Trazando el recorrido por calles…';
  else if (path.isError) line = pathErrorText(path.error);
  else if (path.data?.provider) {
    line = `Recorrido por calles: ${formatKm(path.data.distanceMeters / 1000)} · ${formatMinutes(path.data.durationSeconds / 60)} de manejo`;
    if (path.data.provider === 'osrm') line += ' (calculado con OpenStreetMap)';
  }

  if (!line && skipped.length === 0) return null;
  return (
    <div role="status" className="space-y-1 border-t border-outline-soft px-4 py-2 text-xs">
      {line && (
        <p className={path.isError ? 'flex items-start gap-1.5 text-warn' : 'text-muted'} data-testid="route-path-line">
          {path.isError && <TriangleAlert aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />}
          {line}
        </p>
      )}
      {skipped.length > 0 && (
        <p className="flex items-start gap-1.5 text-warn" data-testid="route-path-skipped">
          <MapPinOff aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
          {skipped.length === 1
            ? `${stopName(skipped[0])} no tiene ubicación: no está en el mapa ni en el recorrido.`
            : `${skipped.length} paradas sin ubicación no están en el mapa ni en el recorrido: ${skipped.map(stopName).join(', ')}.`}
        </p>
      )}
    </div>
  );
};
