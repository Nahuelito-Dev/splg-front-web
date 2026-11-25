import { Link } from 'react-router-dom';
import { Badge, DetailList, Drawer } from '../../../common/components/ui';
import type { NotificationLogItem } from '../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { NOTIFICATION_CHANNEL, NOTIFICATION_STATUS, labelOf, notificationTypeLabel } from '../../../utils/statusLabels';

interface Props {
  item: NotificationLogItem | null;
  onClose: () => void;
}

/** El detalle de un aviso: cuándo salió, por qué canal, a quién (enmascarado), cómo terminó y a qué pedido se refiere. */
export const SentNotificationDrawer = ({ item, onClose }: Props) => {
  if (!item) return null;
  const failed = item.status !== 'sent';

  return (
    <Drawer
      open
      onClose={onClose}
      title={notificationTypeLabel(item.type)}
      description={formatDateTime(item.createdAt)}
      size="md"
    >
      <div className="space-y-5">
        {failed && item.error && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft p-3 text-sm text-danger">
            {item.status === 'failed' ? 'El aviso no se pudo enviar' : 'El aviso no salió'}: {item.error}
          </p>
        )}
        <DetailList
          items={[
            { label: 'Estado', value: <Badge label={labelOf(NOTIFICATION_STATUS, item.status)} /> },
            { label: 'Canal', value: <Badge label={labelOf(NOTIFICATION_CHANNEL, item.channel)} /> },
            { label: 'Destinatario', value: item.recipientMasked },
            { label: item.channel === 'email' ? 'Asunto' : 'Título', value: item.subject ?? '—' },
            { label: 'Código del aviso', value: item.type },
            {
              label: 'Pedido',
              value: item.orderId ? (
                <Link className="font-semibold text-primary underline" to={`/orders/${item.orderId}`}>
                  {formatShortId(item.orderId)}
                </Link>
              ) : (
                '—'
              ),
            },
          ]}
        />
      </div>
    </Drawer>
  );
};
