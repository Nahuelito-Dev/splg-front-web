import { useEffect, useState } from 'react';
import { CircleCheck, CircleAlert, Clock, MessageSquareWarning, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardHeader, PersonAvatar, Skeleton, UserRefLink } from '../../../common/components/ui';
import { CHANNEL_LABEL, formatMinutes, orderStatusLabel, subjectLabel } from '../../../features/chat/inbox/inboxLabels';
import { claimHref } from '../../../features/chat/routes';
import type { InboxConversation } from '../../../services/api/types';
import { useClaim } from '../../../services/queries/claims';
import { useChatSettings } from '../../../services/queries/inbox';
import { formatDateTime, formatElapsed } from '../../../utils/format';
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

/** «hace 12m» que se mantiene al día solo (un tic por minuto), con la fecha completa al pasar el mouse. */
const Elapsed = ({ iso }: { iso: string }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <time dateTime={iso} title={formatDateTime(iso)}>
      {formatElapsed(iso, now)}
    </time>
  );
};

/** La primera respuesta contra el objetivo de la empresa, en minutos hábiles. */
const FirstResponse = ({ conversation, target }: { conversation: InboxConversation; target?: number | null }) => {
  const minutes = conversation.firstResponseBusinessMinutes;
  if (!conversation.firstResponseAt) {
    return (
      <div className="flex items-start gap-2">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Sin responder todavía</p>
          {target ? <p className="text-xs text-muted">Objetivo: {formatMinutes(target)} hábiles</p> : null}
        </div>
      </div>
    );
  }
  const known = minutes !== null && minutes !== undefined;
  const onTime = known && target ? minutes <= target : null;
  const Icon = onTime === false ? CircleAlert : CircleCheck;
  return (
    <div className="flex items-start gap-2">
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${onTime === false ? 'text-danger' : 'text-success'}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">Respondida {known ? `en ${formatMinutes(minutes)} hábiles` : ''}</p>
        <p className="text-xs text-muted">
          {onTime === null
            ? formatDateTime(conversation.firstResponseAt)
            : onTime
              ? `Dentro del objetivo de ${formatMinutes(target ?? 0)}`
              : `Fuera del objetivo de ${formatMinutes(target ?? 0)}`}
        </p>
      </div>
    </div>
  );
};

/**
 * El panel de contexto de una conversación (§15.2): quién es la otra punta (con su rol una sola vez), el pedido con
 * su estado, el reclamo vinculado y la atención (quién atiende, desde cuándo y la primera respuesta contra el
 * objetivo de la empresa).
 */
export const ConversationContext = ({ conversation }: { conversation: InboxConversation }) => {
  const settings = useChatSettings();
  const person = conversation.customer ?? conversation.driver;
  const name = person?.displayName ?? conversation.counterpart.displayName;
  const target = settings.data?.firstResponseTargetMinutes;
  const assigned = conversation.assignedTo?.fullName ?? null;
  return (
    <div className="grid content-start gap-4">
      <Card>
        <div className="flex items-center gap-3">
          <PersonAvatar name={name} userId={person?.id ?? null} size="md" decorative />
          <div className="min-w-0">
            {person ? (
              <UserRefLink userId={person.id} name={name} className="block truncate text-base font-semibold" />
            ) : (
              <p className="truncate text-base font-semibold text-ink">{name}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge label={CHANNEL_LABEL[conversation.channel]} />
              <span className="text-xs text-muted">{subjectLabel(conversation)}</span>
            </div>
          </div>
        </div>
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
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            {assigned ? (
              <div className="flex min-w-0 items-center gap-2">
                <PersonAvatar name={assigned} size="xs" decorative />
                <p className="min-w-0 truncate text-sm text-ink">
                  <span className="text-muted">Atiende </span>
                  {assigned}
                </p>
              </div>
            ) : (
              <Badge label={{ text: 'Sin asignar · en la cola', tone: 'warn' }} />
            )}
            <span className="shrink-0 text-xs text-muted">
              Abierta <Elapsed iso={conversation.createdAt} />
            </span>
          </div>
          <div className="border-t border-outline-soft pt-3">
            <FirstResponse conversation={conversation} target={target} />
          </div>
        </div>
      </Card>
    </div>
  );
};
