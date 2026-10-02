import { Send } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { Order, ResultadoDeEnvio } from '../../../services/api/types';
import { useSendOrderConfirmation } from '../../../services/queries/notifications';
import type { Label } from '../../../utils/statusLabels';
import { OrderPicker } from './OrderPicker';

const resultLabel = (result: ResultadoDeEnvio): Label =>
  result.success ? { text: 'Push enviado', tone: 'success' } : { text: 'No se pudo enviar', tone: 'danger' };

/**
 * CU-101: reenvía el push de "pedido confirmado", para cuando el cliente no
 * lo recibió al crearse el pedido (dispositivo apagado, token vencido). Sólo
 * super_admin.
 */
export const OrderConfirmationCard = () => {
  const [order, setOrder] = useState<Order | null>(null);
  const [result, setResult] = useState<ResultadoDeEnvio | null>(null);
  const sendConfirmation = useSendOrderConfirmation();

  const handleSend = () => {
    if (!order?.customer) return;
    setResult(null);
    sendConfirmation.mutate(
      { customerId: order.customer.user_id, orderId: order.order_id },
      {
        onSuccess: setResult,
        onError: (error) => setResult({ success: false, error: errorMessage(error) }),
      },
    );
  };

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h3 className="text-sm font-semibold text-ink">Reenviar confirmación de pedido</h3>
        <p className="text-xs text-muted">
          Vuelve a mandar el push de "pedido confirmado" al dispositivo guardado del cliente.
        </p>
      </div>

      <OrderPicker selected={order} onSelect={setOrder} />

      <Button icon={<Send />} disabled={!order} loading={sendConfirmation.isPending} onClick={handleSend}>
        Reenviar confirmación
      </Button>

      {result && (
        <div className="space-y-1 rounded-xl border border-outline bg-surface-hover p-3.5">
          <Badge label={resultLabel(result)} />
          {result.messageId && <p className="text-xs text-muted">Id del mensaje en FCM: {result.messageId}</p>}
          {result.error && <p className="text-xs text-muted">{result.error}</p>}
        </div>
      )}
    </Card>
  );
};
