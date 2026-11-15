import { MessageSquareWarning, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardHeader, Skeleton } from '../../../common/components/ui';
import { orderStatusLabel } from '../../../features/chat/inbox/inboxLabels';
import { claimHref } from '../../../features/chat/routes';
import type { InboxConversation } from '../../../services/api/types';
import { useClaim } from '../../../services/queries/claims';
import { CLAIM_STATUS, labelOf } from '../../../utils/statusLabels';

const LinkedClaim = ({ claimId }: { claimId: string }) => {
  const { data, isPending, error } = useClaim(claimId);
  return (
    <Card>
      <CardHeader title="Reclamo vinculado" icon={<MessageSquareWarning className="h-4 w-4" />} as="h3" />
      {isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : error || !data ? (
        <p className="text-sm text-muted">No se pudo leer el reclamo.</p>
      ) : (
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium text-ink">{data.reason}</p>
            <Badge label={labelOf(CLAIM_STATUS, data.status)} />
          </div>
          <p className="line-clamp-3 text-xs text-ink-2">{data.description}</p>
        </div>
      )}
      <Link to={claimHref(claimId)} className="mt-2 inline-block text-sm text-primary underline">
        Ver el reclamo
      </Link>
    </Card>
  );
};

/**
 * Lo que acompaña a la conversación al costado (§15.2): el pedido con su estado y el reclamo vinculado. La persona
 * (foto, nombre, rol y tema) y quién atiende van en el encabezado del chat.
 */
export const ConversationContext = ({ conversation }: { conversation: InboxConversation }) => (
  <div className="grid content-start gap-4">
    {conversation.order && (
      <Card>
        <CardHeader title="Pedido" icon={<ReceiptText className="h-4 w-4" />} as="h3" />
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink">#{conversation.order.number}</p>
          <Badge label={orderStatusLabel(conversation.order.status)} />
        </div>
        <Link
          to={`/orders/${encodeURIComponent(conversation.order.id)}`}
          className="mt-2 inline-block text-sm text-primary underline"
        >
          Ver el pedido
        </Link>
      </Card>
    )}
    {conversation.linkedClaimId && <LinkedClaim claimId={conversation.linkedClaimId} />}
  </div>
);
