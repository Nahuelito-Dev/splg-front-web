import { RotateCw } from 'lucide-react';
import { Badge, Button } from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import type { Order } from '../../../../services/api/types';
import { useOrderRefunds, useRetryOrderRefunds } from '../../../../services/queries/refunds';
import { formatCurrency, formatDateTime } from '../../../../utils/format';
import { notify } from '../../../../utils/notifications';
import { mayHaveRefunds } from './refundsAvailability';
import { REFUND_KIND, REFUND_STATUS, labelOf } from '../../../../utils/statusLabels';

/** Las devoluciones del pedido (CU-168) y, si alguna falló, el botón para reintentarla. */
export const OrderRefunds = ({ order }: { order: Order }) => {
  const { canOperate, operateHint } = usePermissions();
  const enabled = mayHaveRefunds(order);
  const { data, error } = useOrderRefunds(order.order_id, enabled);
  const retry = useRetryOrderRefunds();
  if (!enabled) return null;
  if (error) {
    return (
      <p role="alert" className="mt-3 text-xs text-danger">
        No se pudieron cargar los reintegros del pedido.
      </p>
    );
  }
  if (!data || data.length === 0) return null;
  const failed = data.some((refund) => refund.status === 'failed');

  return (
    <div className="mt-3 rounded-lg border border-outline p-3" aria-label="Reintegros del pedido">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Reintegros</p>
      <ul className="mt-2 space-y-2">
        {data.map((refund) => (
          <li key={refund.refundId} className="text-[13px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-ink">
                {labelOf(REFUND_KIND, refund.kind).text} · {formatCurrency(refund.amount)}
              </span>
              <Badge label={labelOf(REFUND_STATUS, refund.status)} />
            </div>
            {refund.status === 'succeeded' && refund.refundedAt && (
              <p className="text-xs text-muted">Devuelto el {formatDateTime(refund.refundedAt)}</p>
            )}
            {refund.status === 'failed' && refund.errorMessage && (
              <p className="break-words text-xs text-danger">{refund.errorMessage}</p>
            )}
          </li>
        ))}
      </ul>
      {failed && (
        <Button
          size="sm"
          className="mt-3"
          icon={<RotateCw />}
          loading={retry.isPending}
          blockedReason={canOperate ? undefined : operateHint}
          onClick={() =>
            retry.mutate(order.order_id, {
              onSuccess: (rows) =>
                rows.some((row) => row.status === 'failed')
                  ? notify.error(new Error('La pasarela volvió a rechazar la devolución'))
                  : notify.success('Devolución reintegrada'),
              onError: notify.error,
            })
          }
        >
          Reintentar devolución
        </Button>
      )}
    </div>
  );
};
