import { Card } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { formatCurrency, formatDay } from '../../../../utils/format';

/** Sólo tiene sentido para un pedido en estado `reserved` (con seña). */
export const OrderDepositCard = ({ order }: { order: Order }) => (
  <Card className="bg-accent-soft p-4">
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Reserva</h3>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div>
        <dt className="text-xs text-muted">Agendada</dt>
        <dd className="text-sm font-medium text-ink">{formatDay(order.scheduledDate)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">Seña</dt>
        <dd className="text-sm font-medium text-ink">{formatCurrency(order.depositAmount)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">Saldo</dt>
        <dd className="text-sm font-medium text-ink">{formatCurrency(order.remainingBalance)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">Seña cobrada</dt>
        <dd className="text-sm font-medium text-ink">{order.depositPaid ? 'Sí' : 'No'}</dd>
      </div>
    </dl>
  </Card>
);
