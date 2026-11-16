import { ArrowLeft, Building2, Hand, Lock, Ticket as TicketIcon, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, CardHeader, ErrorState } from '../../../common/components/ui';
import { ThreadSkeleton } from '../../../features/chat/components/ThreadSkeleton';
import { useSocketContext } from '../../../context/useSocketContext';
import { AlertsToggle } from '../../../features/chat/components/AlertsToggle';
import { AwaitingHumanMark } from '../../../features/chat/components/AwaitingHumanMark';
import { ChatThread } from '../../../features/chat/components/ChatThread';
import { LiveIndicator } from '../../../features/chat/components/LiveIndicator';
import { TicketCards } from '../../../features/chat/components/TicketCards';
import { useChatTicketing } from '../../../features/chat/components/useChatTicketing';
import { PLATFORM_CHATS_PATH, platformTicketHref } from '../../../features/chat/routes';
import { useMinuteClock } from '../../../hooks/useMinuteClock';
import { toApiError } from '../../../services/api/errors';
import type { PlatformChatAction } from '../../../services/api/supportChat';
import { usePlatformChatThread } from '../../../services/queries/chatSources';
import { usePlatformChat, usePlatformChatAction, useQuickReplies } from '../../../services/queries/supportChat';
import { usePlatform } from '../../../services/queries/supportSessions';
import { confirm, notify } from '../../../utils/notifications';

const ACTION_DONE: Record<PlatformChatAction, string> = {
  take: 'Tomaste el chat',
  release: 'Soltaste el chat: vuelve a la cola',
  close: 'Chat cerrado',
};

/** Un chat con una empresa (§15.1): hilo en vivo, tomar / soltar / cerrar, abrir ticket y el lateral con la empresa. */
export const PlatformChatPanel = ({ id, myUserId }: { id: string; myUserId: string | undefined }) => {
  const platformName = usePlatform().data?.name ?? 'Soporte';
  const { isOnline } = useSocketContext();
  const chat = usePlatformChat(id);
  const action = usePlatformChatAction();
  const quickReplies = useQuickReplies(true);
  const binding = usePlatformChatThread(id);
  const now = useMinuteClock();
  const conversation = chat.data;
  const tickets = conversation?.ticketsFromHere ?? [];
  const ticketing = useChatTicketing({
    side: 'platform',
    conversationId: id,
    tickets,
    ticketHref: platformTicketHref,
  });

  if (chat.error && !chat.data) {
    return (
      <ErrorState
        error={chat.error}
        resource="El chat"
        notFoundDescription="El chat no existe."
        onRetry={() => void chat.refetch()}
      />
    );
  }
  if (!conversation) return <ThreadSkeleton label="Cargando el chat…" />;

  const open = conversation.status === 'open';
  const mine = conversation.assignedTo?.userId === myUserId;
  const run = async (kind: PlatformChatAction) => {
    if (kind === 'close') {
      const ok = await confirm({
        title: '¿Cerrar el chat?',
        text: `${conversation.distributorName} deja de verlo abierto; si vuelve a escribir, se abre otro. Los tickets que salieron de él siguen igual.`,
        confirmText: 'Cerrar chat',
      });
      if (!ok) return;
    }
    action.mutate(
      { id, action: kind },
      {
        onSuccess: () => notify.success(ACTION_DONE[kind]),
        onError: (error) => {
          notify.error(error);
          if (toApiError(error).status === 409) void chat.refetch();
        },
      },
    );
  };

  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="flex min-h-[440px] flex-col overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-outline px-3 py-2">
          <Link
            to={PLATFORM_CHATS_PATH}
            className="rounded-lg p-1 text-ink-2 hover:bg-surface-hover lg:hidden"
            aria-label="Volver a los chats"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{conversation.distributorName}</p>
            <p className="truncate text-xs text-muted">
              {!open
                ? 'Chat cerrado'
                : conversation.assignedTo
                  ? `Atiende ${mine ? 'vos' : conversation.assignedTo.fullName}`
                  : 'Nadie lo está atendiendo'}
            </p>
            {open && conversation.awaitingHumanSince && (
              <AwaitingHumanMark since={conversation.awaitingHumanSince} now={now} className="mt-0.5" />
            )}
          </div>
          <LiveIndicator online={isOnline} />
          <AlertsToggle />
          {open && !mine && (
            <Button size="sm" icon={<Hand />} loading={action.isPending} onClick={() => void run('take')}>
              Tomar
            </Button>
          )}
          {open && mine && (
            <Button size="sm" variant="ghost" icon={<Undo2 />} onClick={() => void run('release')}>
              Soltar
            </Button>
          )}
          {open && (
            <Button size="sm" variant="ghost" icon={<Lock />} onClick={() => void run('close')}>
              Cerrar
            </Button>
          )}
          {!ticketing.selecting && (
            <Button size="sm" variant="secondary" icon={<TicketIcon />} onClick={() => ticketing.start()}>
              Abrir ticket
            </Button>
          )}
        </div>
        {ticketing.bar}
        <ChatThread
          side="platform"
          source={binding.source}
          read={binding.read}
          counterpartLastReadSeq={conversation.counterpartLastReadSeq}
          counterpartName={conversation.distributorName}
          ctx={{ platformName, ticketHref: platformTicketHref, selection: ticketing.selection }}
          canWrite={conversation.canWrite}
          readOnlyNotice={
            <p className="border-t border-outline bg-surface-sunken px-4 py-3 text-sm text-muted">
              El chat está cerrado. Si la empresa vuelve a escribir, se abre otro.
            </p>
          }
          quickReplies={quickReplies.data?.items}
          empty={<p className="px-4 py-10 text-center text-sm text-muted">Todavía no hay mensajes.</p>}
          reloadKey={tickets.length}
        />
      </Card>
      <div className="grid content-start gap-4">
        <Card>
          <CardHeader title="Empresa" icon={<Building2 className="h-4 w-4" />} as="h2" />
          <p className="text-sm font-medium text-ink">{conversation.distributorName}</p>
          <Link
            to={`/distributors/${encodeURIComponent(conversation.distributorId)}`}
            className="text-sm text-primary underline"
          >
            Ver la ficha
          </Link>
        </Card>
        <Card>
          <CardHeader title="Tickets de este chat" as="h2" />
          {tickets.length === 0 ? (
            <p className="text-sm text-muted">Ninguno todavía. Elegí mensajes y «Abrir ticket».</p>
          ) : (
            <TicketCards tickets={tickets} ticketHref={platformTicketHref} layout="list" />
          )}
        </Card>
      </div>
      {ticketing.modals}
    </div>
  );
};
