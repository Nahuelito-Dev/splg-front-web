import { ExternalLink, ShieldAlert } from 'lucide-react';
import type { Order } from '../../../../services/api/types';
import { useOrderStatusHistory } from '../../../../services/queries/orders';
import { deliveryConfirmation, mapsUrl } from './deliveryConfirmation';

const confirmationTime = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Argentina/Buenos_Aires',
});

/** El motivo que dejó el admin: sale del historial del pedido (la entrada que pasó a entregado). */
const DistributorReason = ({ orderId }: { orderId: string }) => {
  const { data } = useOrderStatusHistory(orderId);
  const reason = data?.find((entry) => !entry.isNote && entry.toStatus === 'delivered' && entry.reason)?.reason;
  return <>Confirmada por la distribuidora{reason ? `: ${reason}` : ''}</>;
};

/**
 * Cómo se cerró la entrega (contrato C1): la confirmó el chofer con el código y su ubicación, o la distribuidora con
 * un motivo. Los pedidos entregados antes del contrato no traen los datos y no muestran nada.
 */
export const OrderDeliveryConfirmation = ({ order }: { order: Order }) => {
  const confirmation = deliveryConfirmation(order);
  if (!confirmation) return null;

  if (confirmation.by === 'distributor') {
    return (
      <p className="mt-3 rounded-lg bg-surface-hover p-2 text-xs text-ink">
        <DistributorReason orderId={order.order_id} />
      </p>
    );
  }

  const { point, distanceMeters, outOfRange } = confirmation;
  const at = ` a las ${confirmationTime.format(new Date(confirmation.confirmedAt))}`;
  const away = distanceMeters !== null ? `, a ${Math.round(distanceMeters)} m del domicilio` : '';
  return (
    <div className="mt-3 space-y-2">
      <p className="rounded-lg bg-surface-hover p-2 text-xs text-ink">
        Confirmada por el chofer{at}
        {away}
        {point && (
          <>
            {' · '}
            <a
              href={mapsUrl(point)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline"
            >
              Ver en Google Maps
              <ExternalLink aria-hidden className="h-3 w-3" />
            </a>
          </>
        )}
      </p>
      {outOfRange && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger bg-danger-soft p-2 text-xs text-danger"
        >
          <ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          Se confirmó fuera del radio del domicilio
        </p>
      )}
    </div>
  );
};
