import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Badge, Button, ReasonModal } from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import { notify } from '../../../../utils/notifications';
import { paymentReasonCounter, paymentReasonError } from '../orderPayment';
import type { Order, OrigenDelEstadoDelPago } from '../../../../services/api/types';
import { useOrderPaymentState, useReleaseFraudHold } from '../../../../services/queries/orders';
import { formatDateTime } from '../../../../utils/format';
import { MERCADOPAGO_PAYMENT_TONE, mercadoPagoPaymentLabel } from '../../../../utils/statusLabels';

/** De dónde salió cada lectura del estado del pago, tal como la registra el back. */
const ORIGIN_TEXT: Record<OrigenDelEstadoDelPago, string> = {
  webhook: 'Aviso de Mercado Pago',
  conciliacion: 'Conciliación',
  consulta: 'Consulta a Mercado Pago',
  reintegro: 'Devolución pedida desde el sistema',
};

/**
 * El pago de Mercado Pago del pedido: uno de los nueve estados de la pasarela con su motivo (el texto lo arma el
 * back), si el cliente puede reintentar y el historial de cambios. Sólo para pedidos pagados por Mercado Pago.
 */
export const OrderMercadoPagoPayment = ({ order }: { order: Order }) => {
  const enabled = order.paymentMethodDetail === 'mercadopago';
  const { data, error } = useOrderPaymentState(order.order_id, enabled);
  const { canOperate, operateHint } = usePermissions();
  const release = useReleaseFraudHold();
  const [releasing, setReleasing] = useState(false);
  if (!enabled) return null;
  if (error) {
    return (
      <p role="alert" className="mt-3 text-xs text-danger">
        No se pudo cargar el estado del pago de Mercado Pago.
      </p>
    );
  }
  const label = mercadoPagoPaymentLabel(data);
  if (!data || !label) return null;
  const history = data.history ?? [];

  return (
    <div className="mt-3 rounded-lg border border-outline p-3" aria-label="Pago de Mercado Pago">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pago de Mercado Pago</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge label={label} />
        {data.paymentStatusDetail && (
          <span className="text-xs text-muted">
            Motivo informado: <code className="font-mono">{data.paymentStatusDetail}</code>
          </span>
        )}
      </div>
      {data.paymentFraudHold && (
        <div role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger-soft p-2.5 text-xs text-danger">
          <p className="flex items-center gap-1.5 font-semibold">
            <ShieldAlert aria-hidden className="h-4 w-4" strokeWidth={1.8} /> Retenido por alerta de fraude
          </p>
          <p className="mt-1">
            Mercado Pago avisó una alerta de fraude sobre este pago: el pedido no se despacha ni se activa. Cancelalo
            para devolver el pago o, si verificaste que es legítimo, liberalo con un motivo.
          </p>
          <Button
            className="mt-2"
            variant="secondary"
            size="sm"
            disabled={!canOperate}
            title={operateHint}
            onClick={() => setReleasing(true)}
          >
            Liberar retención
          </Button>
        </div>
      )}
      <ReasonModal
        open={releasing}
        onClose={() => setReleasing(false)}
        title="Liberar la retención por fraude"
        description="El pedido vuelve a poder despacharse (una reserva, activarse). Queda registrado quién lo liberó y por qué."
        placeholder="Por ejemplo: hablé con el cliente y verifiqué el pago en Mercado Pago"
        confirmLabel="Liberar retención"
        loading={release.isPending}
        closeBlocked={release.isPending}
        validateReason={paymentReasonError}
        reasonHint={paymentReasonCounter}
        onConfirm={(reason) =>
          release.mutate(
            { id: order.order_id, reason, scope: `fraud-hold:${order.order_id}` },
            {
              onSuccess: () => {
                setReleasing(false);
                notify.success('Retención liberada');
              },
              onError: notify.error,
            },
          )
        }
      />
      {data.canRetry && (
        <p className="mt-2 text-xs text-muted">El cliente todavía puede reintentar el pago con el mismo enlace.</p>
      )}
      {history.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer font-medium text-ink-2">Historial del pago ({history.length})</summary>
          <ol className="mt-2 space-y-1.5">
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="leading-snug">
                <span className="text-muted">{formatDateTime(entry.at)} · </span>
                <Badge label={{ text: entry.label, tone: MERCADOPAGO_PAYMENT_TONE[entry.status] }} />
                <span className="text-muted">
                  {' '}
                  {ORIGIN_TEXT[entry.origin]}
                  {entry.gatewayPaymentId ? ` · pago ${entry.gatewayPaymentId}` : ''}
                </span>
                {!entry.applied && <span className="text-warn"> · llegó fuera de orden y no cambió el estado</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
};
