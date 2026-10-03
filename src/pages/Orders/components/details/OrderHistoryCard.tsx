import { Card, FichaTimeline } from '../../../../common/components/ui';
import type { Order } from '../../../../services/api/types';
import { buildOrderHistory } from './orderHistory';

/** Historial vertical del pedido: sus hitos con fecha y hora, y el estado actual resaltado. */
export const OrderHistoryCard = ({ order }: { order: Order }) => (
  <Card className="p-5">
    <h2 className="mb-4 text-base font-semibold text-ink">Historial</h2>
    <FichaTimeline items={buildOrderHistory(order)} />
  </Card>
);
