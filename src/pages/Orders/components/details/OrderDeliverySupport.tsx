import { useState } from 'react';
import { BellRing, KeyRound, PackageCheck } from 'lucide-react';
import { Button, Card } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import {
  useConfirmOrderDelivery,
  useNotifyOrderArrival,
  useOrderDeliveryCode,
} from '../../../../services/queries/orders';
import { confirm, notify } from '../../../../utils/notifications';
import { ConfirmDeliveryModal } from '../ConfirmDeliveryModal';
import { canConfirmDelivery, canNotifyArrival, canViewDeliveryCode } from '../orderStatus';

/**
 * Soporte telefónico de una entrega: ver el código secreto del QR (sensible),
 * confirmar la entrega en nombre del cliente y avisarle que el chofer llegó.
 * Sólo tiene sentido con el pedido aceptado o en camino (ver `orderStatus.ts`).
 */
export const OrderDeliverySupport = ({ order }: { order: Order }) => {
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const deliveryCode = useOrderDeliveryCode();
  const confirmDelivery = useConfirmOrderDelivery();
  const notifyArrival = useNotifyOrderArrival();

  if (!canViewDeliveryCode(order.status) && !canConfirmDelivery(order.status) && !canNotifyArrival(order.status)) {
    return null;
  }

  const handleViewCode = async () => {
    const confirmed = await confirm({
      title: '¿Ver el código de entrega?',
      text: 'Es el código secreto del QR del chofer: compartilo sólo con el cliente o con el chofer de este pedido.',
    });
    if (!confirmed) return;
    deliveryCode.mutate(order.order_id, {
      onSuccess: (data) => setRevealedCode(data.deliveryCode),
      onError: notify.error,
    });
  };

  const handleConfirmDelivery = (code: string) => {
    confirmDelivery.mutate(
      { id: order.order_id, body: { code } },
      {
        onSuccess: () => {
          notify.success('Entrega confirmada');
          setConfirmModalOpen(false);
        },
        onError: notify.error,
      },
    );
  };

  const handleNotifyArrival = async () => {
    const confirmed = await confirm({
      title: '¿Avisar al cliente que el chofer llegó?',
      text: 'Le llega un aviso por push y, si tiene la app abierta, también por notificación en vivo.',
    });
    if (!confirmed) return;
    notifyArrival.mutate(order.order_id, {
      onSuccess: (data) => notify.success(data.message),
      onError: notify.error,
    });
  };

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Soporte de entrega</h3>
      <div className="flex flex-wrap gap-2">
        {canViewDeliveryCode(order.status) && (
          <Button
            variant="secondary"
            size="sm"
            icon={<KeyRound />}
            disabled={deliveryCode.isPending}
            onClick={() => void handleViewCode()}
          >
            Ver código de entrega
          </Button>
        )}
        {canConfirmDelivery(order.status) && (
          <Button variant="secondary" size="sm" icon={<PackageCheck />} onClick={() => setConfirmModalOpen(true)}>
            Confirmar entrega
          </Button>
        )}
        {canNotifyArrival(order.status) && (
          <Button
            variant="secondary"
            size="sm"
            icon={<BellRing />}
            disabled={notifyArrival.isPending}
            onClick={() => void handleNotifyArrival()}
          >
            Avisar llegada
          </Button>
        )}
      </div>

      {revealedCode && (
        <div className="mt-3 rounded-lg border border-warn/30 bg-warn-soft p-3">
          <p className="text-xs text-warn">Código sensible: es la prueba de entrega, no lo publiques ni lo guardes.</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-widest text-ink">{revealedCode}</p>
        </div>
      )}

      <ConfirmDeliveryModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmDelivery}
        confirming={confirmDelivery.isPending}
        defaultCode={revealedCode ?? ''}
      />
    </Card>
  );
};
