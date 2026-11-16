import { Badge, Modal } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { labelOf, ORDER_STATUS } from '../../../utils/statusLabels';
import { OrderDetailBody } from './details/OrderDetailBody';

interface Props {
  open: boolean;
  onClose: () => void;
  order: Order | null;
}

/**
 * Historial del cliente: un vistazo rápido a un pedido pasado sin salir de su
 * ficha. La gestión operativa de un pedido en curso (asignar, cambiar estado,
 * soporte de entrega) vive en la página `/orders/:id` (`OrderDetails`).
 */
export const OrderDetailsModal = ({ open, onClose, order }: Props) => (
  <Modal
    open={open}
    onClose={onClose}
    size="lg"
    title={order ? `Pedido ${formatShortId(order.order_id)}` : 'Pedido'}
    description={order ? formatDateTime(order.created_at) : undefined}
    footer={order && <Badge label={labelOf(ORDER_STATUS, order.status)} />}
  >
    {order && <OrderDetailBody order={order} />}
  </Modal>
);
