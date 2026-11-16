import { useState } from 'react';
import { DriverPin } from '../../../common/components/map/DriverPin';
import { HtmlMarker } from '../../../common/components/map/HtmlMarker';
import { MapCanvas } from '../../../common/components/map/MapCanvas';
import { formatShortId } from '../../../utils/format';
import type { TrackedOrder } from '../types';
import { MapAutoCenter } from './MapAutoCenter';

interface Props {
  trackedOrders: TrackedOrder[];
  focusPoint: { lat: number; lng: number } | null;
}

// Hora argentina en 24 h, sin depender de la zona ni del formato del navegador.
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

/** Los choferes con entregas en curso, cada uno en su última posición; tocar uno muestra su pedido y la hora. */
export const TrackingMap = ({ trackedOrders, focusPoint }: Props) => {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <MapCanvas label="Mapa del seguimiento en vivo" className="h-full" defaultZoom={12} gestures="greedy">
      <MapAutoCenter focusPoint={focusPoint} />
      {trackedOrders.map((order) => {
        const open = openId === order.orderId;
        return (
          <HtmlMarker
            key={order.orderId}
            position={order}
            title={`Pedido ${formatShortId(order.orderId)} · chofer ${formatShortId(order.driverId)}`}
            onClick={() => setOpenId(open ? null : order.orderId)}
            zIndex={open ? 20 : 10}
          >
            <DriverPin />
            {open && (
              <span
                data-testid="tracking-marker-info"
                className="absolute bottom-full left-1/2 mb-2 block w-max -translate-x-1/2 rounded-lg border border-outline bg-surface px-2.5 py-1.5 text-left text-xs text-ink shadow-control"
              >
                <b className="block font-semibold">Pedido {formatShortId(order.orderId)}</b>
                <span className="block text-muted">Chofer {formatShortId(order.driverId)}</span>
                <span className="block text-muted">Última actualización: {time(order.at)}</span>
              </span>
            )}
          </HtmlMarker>
        );
      })}
    </MapCanvas>
  );
};
