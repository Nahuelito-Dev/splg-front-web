import { BellRing } from 'lucide-react';
import { Badge, Card, CardHeader } from '../../../../common/components/ui';
import { usePermiso } from '../../../../hooks';
import { errorMessage } from '../../../../services/api/errors';
import { useOrderNotifications } from '../../../../services/queries/notificationLog';
import { formatDateTime } from '../../../../utils/format';
import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  labelOf,
  notificationTypeLabel,
} from '../../../../utils/statusLabels';

/**
 * Los avisos (notificaciones y correos) que salieron por el pedido, con el destinatario enmascarado y cómo terminó
 * cada uno. Un pedido que no generó avisos no muestra nada.
 */
export const OrderNotifications = ({ orderId }: { orderId: string }) => {
  const puedeVer = usePermiso('auditoria.ver');
  // Sin el permiso de auditoría el servidor responde 403: ni se pregunta ni se muestra la sección.
  const { data: items, isError, error, refetch } = useOrderNotifications(puedeVer.allowed ? orderId : null);

  if (!puedeVer.allowed) return null;
  if (isError) {
    return (
      <Card className="p-4">
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los avisos del pedido: {errorMessage(error)}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Reintentar
          </button>
        </p>
      </Card>
    );
  }
  if (!items || items.length === 0) return null;

  return (
    <Card className="p-4">
      <CardHeader
        title="Avisos"
        subtitle={`${items.length} ${items.length === 1 ? 'aviso enviado' : 'avisos enviados'} por este pedido`}
        icon={<BellRing />}
        as="h3"
        className="mb-3"
      />
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.notificationLogId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{notificationTypeLabel(item.type)}</p>
              <p className="truncate text-xs text-muted">
                {formatDateTime(item.createdAt)} · {item.recipientMasked}
                {item.error ? ` · ${item.error}` : ''}
              </p>
            </div>
            <Badge label={labelOf(NOTIFICATION_CHANNEL, item.channel)} />
            <Badge label={labelOf(NOTIFICATION_STATUS, item.status)} />
          </li>
        ))}
      </ul>
    </Card>
  );
};
