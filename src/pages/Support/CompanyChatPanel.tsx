import { History, MessageCircle, Ticket as TicketIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, ErrorState } from '../../common/components/ui';
import { ThreadSkeleton } from '../../features/chat/components/ThreadSkeleton';
import { useSupportAccessPermissions } from '../../common/support/useSupportAccessActions';
import { useSocketContext } from '../../context/useSocketContext';
import { AlertsToggle } from '../../features/chat/components/AlertsToggle';
import { ChatThread } from '../../features/chat/components/ChatThread';
import { LiveIndicator } from '../../features/chat/components/LiveIndicator';
import { TicketCards } from '../../features/chat/components/TicketCards';
import { useChatTicketing } from '../../features/chat/components/useChatTicketing';
import { useCompanyChatThread } from '../../services/queries/chatSources';
import { useCompanyChat } from '../../services/queries/supportChat';
import { usePlatform } from '../../services/queries/supportSessions';
import { ChatHistoryDrawer } from './ChatHistoryDrawer';
import { companyTicketHref } from '../../features/chat/routes';

/** Quien sólo tiene `soporte.ver` lee pero no escribe (D-C7). */
const ReadOnlyNotice = () => (
  <p className="border-t border-outline bg-surface-sunken px-4 py-3 text-sm text-muted">
    Podés leer el chat, pero para escribir hace falta el permiso «Gestionar soporte».
  </p>
);

interface Props {
  /** En la burbuja flotante: sin el historial ni el encabezado grande. */
  compact?: boolean;
}

/**
 * El chat en vivo de la empresa con la plataforma (§15.2, pestaña «Chat»). Uno abierto por empresa; si no hay, el
 * primer mensaje lo abre. Si se cierra mientras se mira (inactividad o a mano), queda a la vista hasta que se escribe
 * de nuevo, y ese mensaje abre otro.
 */
export const CompanyChatPanel = ({ compact = false }: Props) => {
  const platformName = usePlatform().data?.name ?? 'el soporte';
  const { canManage } = useSupportAccessPermissions();
  const { isOnline } = useSocketContext();
  const chat = useCompanyChat();
  const fetched = chat.data?.conversation ?? null;
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  // La conversación que abrió un envío: se muestra ya, sin esperar a que `GET …/platform-chat` la devuelva.
  const [switchedTo, setSwitchedTo] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (fetched) setLastSeen(fetched.id);
  }, [fetched]);

  // Cuando la API ya devuelve la conversación nueva, manda la API.
  const fetchedId = fetched?.id;
  useEffect(() => {
    if (fetchedId) setSwitchedTo((current) => (current === fetchedId ? null : current));
  }, [fetchedId]);

  // Los datos del chat abierto sólo valen si son de la conversación que se muestra.
  const open = fetched && (!switchedTo || fetched.id === switchedTo) ? fetched : null;
  const conversationId = switchedTo ?? fetched?.id ?? lastSeen;
  const closed = !switchedTo && !fetched && lastSeen !== null;
  const binding = useCompanyChatThread(conversationId, setSwitchedTo);
  const tickets = open?.ticketsFromHere ?? [];
  const ticketing = useChatTicketing({ side: 'company', conversationId, tickets, ticketHref: companyTicketHref });

  if (chat.isPending) return <ThreadSkeleton label="Cargando el chat…" />;
  // Un error al releer con datos ya cargados no tapa el chat: se sigue viendo lo que hay (y el hilo vive aparte).
  if (chat.error && !chat.data)
    return <ErrorState error={chat.error} resource="El chat" onRetry={() => void chat.refetch()} />;

  const attended = open?.attendedBy?.displayName;
  const status = closed
    ? 'El chat se cerró. Escribí para abrir uno nuevo.'
    : attended
      ? `Te está atendiendo ${attended}`
      : open || switchedTo
        ? `Esperando que alguien de ${platformName} te atienda`
        : `Escribinos y te respondemos`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-outline px-3 py-2">
        <MessageCircle aria-hidden="true" className="h-4 w-4 text-muted" />
        <p className="min-w-0 flex-1 truncate text-sm text-ink-2">{status}</p>
        <LiveIndicator online={isOnline} />
        <AlertsToggle />
        {!compact && (
          <Button size="sm" variant="ghost" icon={<History />} onClick={() => setHistoryOpen(true)}>
            Anteriores
          </Button>
        )}
        {canManage && conversationId && !ticketing.selecting && (
          <Button size="sm" variant="secondary" icon={<TicketIcon />} onClick={() => ticketing.start()}>
            Abrir ticket con esto
          </Button>
        )}
      </div>
      {ticketing.bar}
      <TicketCards tickets={tickets} ticketHref={companyTicketHref} />
      <ChatThread
        side="company"
        source={binding.source}
        read={binding.read}
        counterpartLastReadSeq={open?.counterpartLastReadSeq ?? 0}
        counterpartName={platformName}
        ctx={{
          platformName,
          ticketHref: companyTicketHref,
          onOfferTicket: canManage ? (message) => ticketing.start(message) : undefined,
          selection: ticketing.selection,
        }}
        canWrite={canManage}
        readOnlyNotice={<ReadOnlyNotice />}
        empty={
          <div className="grid place-items-center gap-1 px-6 py-10 text-center">
            <MessageCircle aria-hidden="true" className="h-8 w-8 text-faint" />
            <p className="text-sm font-medium text-ink">Escribinos y te respondemos</p>
            <p className="text-xs text-muted">
              Lo que se resuelve en el momento va por acá; lo que necesita seguimiento, en un ticket.
            </p>
          </div>
        }
        reloadKey={tickets.length}
      />
      {ticketing.modals}
      {!compact && <ChatHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />}
    </div>
  );
};
