import { ArrowLeft, Hand, Lock, LockOpen, MessageSquareWarning, PanelRightOpen, UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  cx,
  Drawer,
  ErrorState,
  MoreActionsMenu,
  PersonAvatar,
  UserRefLink,
} from '../../../common/components/ui';
import { useSocketContext } from '../../../context/useSocketContext';
import { AlertsToggle } from '../../../features/chat/components/AlertsToggle';
import { ChatThread } from '../../../features/chat/components/ChatThread';
import { LiveIndicator } from '../../../features/chat/components/LiveIndicator';
import { ThreadSkeleton } from '../../../features/chat/components/ThreadSkeleton';
import {
  CHANNEL_LABEL,
  counterpartName,
  nextOpeningText,
  partyNamer,
  statusLine,
  subjectLabel,
} from '../../../features/chat/inbox/inboxLabels';
import { claimHref, MESSAGES_PATH } from '../../../features/chat/routes';
import type { InboxAccess } from '../../../features/chat/useInboxAccess';
import { toApiError } from '../../../services/api/errors';
import type { InboxConversation } from '../../../services/api/types';
import {
  useAssignConversation,
  useChatSettings,
  useCloseConversation,
  useCompanyTemplates,
  useInboxConversation,
  useInboxThread,
  useReopenConversation,
} from '../../../services/queries/inbox';
import { confirm, notify } from '../../../utils/notifications';
import { AssignModal } from './AssignModal';
import { ClaimFromChatModal } from './ClaimFromChatModal';
import { ConversationContext } from './ConversationContext';
import { hasConversationContext } from './hasConversationContext';
import { ReplySuggestions } from './ReplySuggestions';

interface Props {
  id: string;
  myUserId: string | undefined;
  companyName: string;
  access: InboxAccess;
}

/** Lo que se muestra en lugar del compositor cuando no se puede escribir. */
const readOnlyNotice = (conversation: InboxConversation) => {
  const text =
    conversation.status === 'closed'
      ? conversation.closedReason === 'driver_changed'
        ? 'El pedido pasó a otro chofer: esta conversación queda en lectura.'
        : 'La conversación está cerrada. Reabrila para escribir; si te vuelven a escribir, se abre otra.'
      : 'No se puede escribir en esta conversación (la persona ya no es de la empresa o el chat con clientes está apagado).';
  return <p className="border-t border-outline bg-surface-sunken px-4 py-3 text-sm text-muted">{text}</p>;
};

/**
 * Una conversación de la bandeja (§15.2): el hilo en vivo (núcleo del chat: leído, escribiendo, reintentos) con citar,
 * editar y respuestas guardadas; tomar, asignar, cerrar, reabrir y crear un reclamo; y el panel de contexto (a la
 * derecha en pantallas anchas, en un cajón en las demás).
 */
export const ConversationPanel = ({ id, myUserId, companyName, access }: Props) => {
  const { isOnline } = useSocketContext();
  const query = useInboxConversation(id);
  const binding = useInboxThread(id);
  const conversation = query.data;
  const templates = useCompanyTemplates(
    { channel: conversation?.channel, active: true },
    Boolean(conversation?.channel),
  );
  const settings = useChatSettings();
  const assign = useAssignConversation();
  const close = useCloseConversation();
  const reopen = useReopenConversation();
  const [assigning, setAssigning] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  if (query.error && !conversation) {
    return (
      <Card className="grid flex-1 place-items-center">
        <ErrorState
          error={query.error}
          resource="La conversación"
          notFoundDescription="Puede ser de otra empresa o de un canal que no atendés."
          onRetry={() => void query.refetch()}
        />
      </Card>
    );
  }
  if (!conversation) {
    return (
      <Card className="flex flex-1 flex-col p-0">
        <ThreadSkeleton label="Cargando la conversación…" />
      </Card>
    );
  }
  const person = conversation.customer ?? conversation.driver;
  const withContext = hasConversationContext(conversation);

  const open = conversation.status === 'open';
  // Lo que completa las variables de una respuesta guardada retocada (sin valor: no se envía, se pide completarla).
  const variables: Record<string, string | null> = {
    // Como las completa el back: el nombre de pila de la persona (cliente o chofer) y el número corto del pedido.
    'cliente.nombre': (conversation.customer ?? conversation.driver)?.displayName.trim().split(/\s+/)[0] || null,
    'pedido.numero': conversation.order?.number ?? null,
    'empresa.nombre': companyName,
    'horario.proximo': settings.data ? nextOpeningText(settings.data.openNow, settings.data.nextOpenAt) : null,
  };
  const mine = Boolean(myUserId) && conversation.assignedTo?.userId === myUserId;
  const name = counterpartName(conversation);
  const isCustomer = conversation.channel === 'staff_customer';
  const canClaim = isCustomer && access.claims && !conversation.linkedClaimId && open;
  const onConflict = (error: unknown) => {
    notify.error(error);
    if (toApiError(error).status === 409) void query.refetch();
  };

  const owner = conversation.assignedTo && !mine ? conversation.assignedTo.fullName : null;
  // Sin asignar se toma directo; si la atiende otra persona, se le quita sólo después de confirmar.
  const take = async () => {
    if (owner) {
      const ok = await confirm({
        title: `¿Quitársela a ${owner}?`,
        text: `${owner} la está atendiendo. Si la tomás, pasa a «Mías» y deja de estar en las suyas.`,
        confirmText: 'Quitársela',
      });
      if (!ok) return;
    }
    assign.mutate(
      { id, userId: myUserId ?? null },
      { onSuccess: () => notify.success('Tomaste la conversación'), onError: onConflict },
    );
  };

  const doClose = async () => {
    const ok = await confirm({
      title: '¿Cerrar la conversación?',
      text: `Queda en lectura. Si ${name} vuelve a escribir, se abre otra; también la podés reabrir.`,
      confirmText: 'Cerrar',
    });
    if (!ok) return;
    close.mutate(id, { onSuccess: () => notify.success('Conversación cerrada'), onError: onConflict });
  };

  const doReopen = () =>
    reopen.mutate(id, { onSuccess: () => notify.success('Conversación reabierta'), onError: onConflict });

  const more = [
    {
      label: 'Asignar a…',
      icon: <UserRoundCog />,
      disabled: !open,
      blockedReason: open ? undefined : 'La conversación está cerrada',
      onClick: () => setAssigning(true),
    },
    ...(isCustomer
      ? [
          {
            label: conversation.linkedClaimId ? 'Ya tiene un reclamo' : 'Crear reclamo',
            icon: <MessageSquareWarning />,
            disabled: !canClaim,
            blockedReason: conversation.linkedClaimId
              ? 'Esta conversación ya tiene un reclamo vinculado'
              : !open
                ? 'La conversación está cerrada'
                : !access.claims
                  ? 'Hace falta el permiso «Gestionar reclamos»'
                  : undefined,
            onClick: () => setClaiming(true),
          },
        ]
      : []),
  ];

  return (
    <div className={cx('grid min-h-0 flex-1 gap-4', withContext && 'xl:grid-cols-[minmax(0,1fr)_280px]')}>
      <Card className="flex min-h-0 flex-col overflow-hidden p-0">
        <header className="flex flex-wrap items-center gap-2 border-b border-outline px-3 py-2">
          <Link
            to={MESSAGES_PATH}
            className="rounded-lg p-1 text-ink-2 hover:bg-surface-hover lg:hidden"
            aria-label="Volver a las conversaciones"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <PersonAvatar
            name={name}
            userId={person?.id ?? null}
            size="md"
            decorative
            className="h-9 w-9 shrink-0 text-xs"
          />
          <div className="min-w-0 flex-1">
            <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
              {person ? (
                <UserRefLink userId={person.id} name={name} className="truncate" />
              ) : (
                <span className="truncate">{name}</span>
              )}
              <Badge label={CHANNEL_LABEL[conversation.channel]} />
              {!open && <Badge label={{ text: 'Cerrada', tone: 'neutral' }} />}
            </h2>
            <p className="truncate text-xs text-muted">
              {subjectLabel(conversation)} · {statusLine(conversation, myUserId)}
            </p>
          </div>
          <LiveIndicator online={isOnline} />
          <AlertsToggle />
          {open && !mine && (
            <Button
              size="sm"
              variant={owner ? 'secondary' : 'primary'}
              icon={<Hand />}
              loading={assign.isPending}
              onClick={() => void take()}
              disabled={!myUserId}
            >
              {owner ? `Quitársela a ${owner.split(' ')[0]}` : 'Tomar'}
            </Button>
          )}
          {open ? (
            <Button size="sm" variant="ghost" icon={<Lock />} onClick={() => void doClose()} loading={close.isPending}>
              Cerrar
            </Button>
          ) : (
            conversation.closedReason !== 'driver_changed' && (
              <Button size="sm" variant="ghost" icon={<LockOpen />} onClick={doReopen} loading={reopen.isPending}>
                Reabrir
              </Button>
            )
          )}
          {canClaim && (
            <Button
              size="sm"
              variant="ghost"
              icon={<MessageSquareWarning />}
              onClick={() => setClaiming(true)}
              className="hidden md:inline-flex"
            >
              Crear reclamo
            </Button>
          )}
          {withContext && (
            <Button
              size="sm"
              variant="ghost"
              icon={<PanelRightOpen />}
              onClick={() => setContextOpen(true)}
              className="xl:hidden"
              aria-label="Ver el pedido y el reclamo"
            >
              <span className="hidden sm:inline">Pedido y reclamo</span>
            </Button>
          )}
          <MoreActionsMenu actions={more} label="Más acciones" />
        </header>
        <ChatThread
          side="company"
          source={binding.source}
          read={binding.read}
          counterpartLastReadSeq={conversation.counterpartLastReadSeq}
          counterpartName={name}
          ctx={{
            platformName: companyName,
            variant: 'inbox',
            counterpartName: name,
            counterpartUserId: (conversation.customer ?? conversation.driver)?.id ?? null,
            showAvatars: true,
            autoName: companyName,
            partyName: partyNamer(conversation),
            claimHref,
            ticketHref: () => '/support',
          }}
          canWrite={conversation.canWrite}
          readOnlyNotice={readOnlyNotice(conversation)}
          quickReplies={templates.data?.items}
          allowReply
          variables={variables}
          empty={<p className="px-4 py-10 text-center text-sm text-muted">Todavía no hay mensajes.</p>}
          reloadKey={conversation.linkedClaimId ?? undefined}
          renderSuggestions={({ lastCounterpartSeq, pick }) => (
            <ReplySuggestions conversationId={id} lastCounterpartSeq={lastCounterpartSeq} onPick={pick} />
          )}
        />
      </Card>
      {withContext && (
        <>
          <aside className="hidden min-h-0 overflow-y-auto xl:block" aria-label="Pedido y reclamo de la conversación">
            <ConversationContext conversation={conversation} />
          </aside>
          <Drawer open={contextOpen} onClose={() => setContextOpen(false)} title="Pedido y reclamo">
            <ConversationContext conversation={conversation} />
          </Drawer>
        </>
      )}
      <AssignModal
        conversation={assigning ? conversation : null}
        myUserId={myUserId}
        onClose={() => setAssigning(false)}
      />
      <ClaimFromChatModal
        conversation={claiming ? conversation : null}
        onClose={() => setClaiming(false)}
        onCreated={() => setClaiming(false)}
      />
    </div>
  );
};
