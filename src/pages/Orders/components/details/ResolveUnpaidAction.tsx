import { HandCoins } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../../common/components/ui';
import { usePermissions } from '../../../../hooks';
import { ResolveUnpaidModal } from '../ResolveUnpaidModal';

interface Props {
  order: { order_id: string; total_amount: number };
  size?: 'sm' | 'md';
}

/** «Resolver impago»: botón y modal. Sólo para un pedido con `paymentStatus: unpaid` (lo decide quien lo dibuja). */
export const ResolveUnpaidAction = ({ order, size = 'sm' }: Props) => {
  const [open, setOpen] = useState(false);
  const { canOperate, operateHint } = usePermissions();

  return (
    <>
      <Button size={size} icon={<HandCoins />} disabled={!canOperate} title={operateHint} onClick={() => setOpen(true)}>
        Resolver impago
      </Button>
      <ResolveUnpaidModal open={open} onClose={() => setOpen(false)} order={order} />
    </>
  );
};
