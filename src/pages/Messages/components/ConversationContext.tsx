import { Clock, HardHat, MessageSquareWarning, ReceiptText, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardHeader, Skeleton, UserRefLink } from '../../../common/components/ui';
import { CHANNEL_LABEL, formatMinutes, orderStatusLabel, subjectLabel } from '../../../features/chat/inbox/inboxLabels';
import { claimHref } from '../../../features/chat/routes';
import type { InboxConversation } from '../../../services/api/types';
import { useClaim } from '../../../services/queries/claims';
import { useChatSettings } from '../../../services/queries/inbox';
import { formatDateTime } from '../../../utils/format';
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
 * El panel de contexto de una conversación (§15.2): la persona, el pedido con su estado, el reclamo vinculado y la
 * atención (quién atiende y la primera respuesta en minutos hábiles contra el objetivo de la empresa).
 */
export const ConversationContext = ({ conversation }: { conversation: InboxConversation }) => {
  const settings = useChatSettings();
  const person = conversation.customer ?? conversation.driver;
  const isDriver = conversation.channel === 'staff_driver';
  const target = settings.data?.firstResponseTargetMinutes;
  const minutes = conversation.firstResponseBusinessMinutes;
  return (
    <div className="grid content-start gap-4">
      <Card>
        <CardHeader
          title={isDriver ? 'Chofer' : 'Cliente'}
          icon={isDriver ? <HardHat className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
          badge={<Badge label={CHANNEL_LABEL[conversation.channel]} />}
          as="h3"
        />
        {person ? (
          <UserRefLink userId={person.id} name={person.displayName} />
        ) : (
          <p className="text-sm text-ink">{conversation.counterpart.displayName}</p>
        )}
        <p className="mt-2 text-xs text-muted">{subjectLabel(conversation)}</p>
      </Card>

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

      <Card>
        <CardHeader title="Atención" icon={<Clock className="h-4 w-4" />} as="h3" />
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Atiende</dt>
            <dd className="text-right text-ink">{conversation.assignedTo?.fullName ?? 'Nadie (en la cola)'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Abierta</dt>
            <dd className="text-right text-ink">{formatDateTime(conversation.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Primera respuesta</dt>
            <dd className="text-right text-ink">
              {conversation.firstResponseAt ? (
                <>
                  {formatDateTime(conversation.firstResponseAt)}
                  {minutes !== null && minutes !== undefined && (
                    <span className="block text-xs text-muted">
                      {formatMinutes(minutes)} hábiles
                      {target ? (minutes <= target ? ' · dentro del objetivo' : ' · fuera del objetivo') : ''}
                    </span>
                  )}
                </>
              ) : (
                'Todavía no'
              )}
            </dd>
          </div>
          {target && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Objetivo</dt>
              <dd className="text-right text-ink">{formatMinutes(target)} hábiles</dd>
            </div>
          )}
        </dl>
      </Card>
    </div>
  );
};
