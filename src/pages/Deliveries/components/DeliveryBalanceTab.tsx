import { useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { Button, Card } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { Delivery } from '../../../services/api/types';
import { formatCurrency } from '../../../utils/format';
import { BalanceAdjustModal } from './BalanceAdjustModal';

/** Pestaña "Saldo": lo que se le debe (o debe) al chofer, con el ajuste manual a mano. */
export const DeliveryBalanceTab = ({ delivery }: { delivery: Delivery }) => {
  const [adjusting, setAdjusting] = useState(false);
  // Ajustar el saldo pide la distribuidora (X-Distributor): sin «Ver como» la API contesta 400.
  const { canOperate, operateHint } = usePermissions();
  const negative = delivery.balance < 0;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Balance actual</p>
          <p className={`text-3xl font-bold ${negative ? 'text-danger' : 'text-ink'}`}>
            {formatCurrency(delivery.balance)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {negative
              ? 'El chofer le debe este importe a la distribuidora.'
              : 'Lo que la distribuidora le debe al chofer.'}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<PiggyBank />}
          blockedReason={canOperate ? undefined : operateHint}
          onClick={() => setAdjusting(true)}
        >
          Ajustar saldo
        </Button>
        <BalanceAdjustModal open={adjusting} onClose={() => setAdjusting(false)} delivery={delivery} />
      </Card>
    </div>
  );
};
