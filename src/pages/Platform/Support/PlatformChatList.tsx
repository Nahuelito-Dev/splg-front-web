import { Link } from 'react-router-dom';
import { cx, EmptyState, ErrorState, Skeleton, Tabs } from '../../../common/components/ui';
import { platformChatHref } from '../../../features/chat/routes';
import type { Conversation } from '../../../services/api/types';
import { usePlatformChats } from '../../../services/queries/supportChat';
import { formatElapsed } from '../../../utils/format';

export type ChatInboxTab = 'waiting' | 'mine' | 'all';

const ASSIGNED: Record<ChatInboxTab, string | undefined> = { waiting: 'none', mine: 'me', all: undefined };
const PAGE = 50;

interface Props {
  tab: ChatInboxTab;
  onTab: (tab: ChatInboxTab) => void;
  selectedId: string | undefined;
}

const isTab = (value: string): value is ChatInboxTab => value === 'waiting' || value === 'mine' || value === 'all';

const ChatRow = ({ chat, selected }: { chat: Conversation; selected: boolean }) => {
  const last = chat.lastMessage;
  return (
    <Link
      to={platformChatHref(chat.id)}
      aria-current={selected ? 'page' : undefined}
      className={cx(
        'grid gap-0.5 border-b border-outline-soft px-3 py-2.5 hover:bg-surface-hover',
        selected && 'bg-primary-soft',
      )}
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{chat.distributorName}</span>
        {chat.unreadCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-on-primary">
            {chat.unreadCount}
            <span className="sr-only"> sin leer</span>
          </span>
        )}
      </span>
      <span className="line-clamp-1 text-xs text-ink-2">
        {last ? `${last.party === 'platform' ? 'Vos: ' : ''}${last.preview ?? ''}` : 'Sin mensajes'}
      </span>
      <span className="text-[11px] text-muted">
        {chat.assignedTo ? `Atiende ${chat.assignedTo.fullName}` : 'Sin atender'}
        {last ? ` · ${formatElapsed(last.at, Date.now())}` : ''}
      </span>
    </Link>
  );
};

/** La bandeja de chats abiertos con las empresas: Esperando (nadie atiende) / Míos / Todos. */
export const PlatformChatList = ({ tab, onTab, selectedId }: Props) => {
  const { data, error, isPending, refetch } = usePlatformChats({ assigned: ASSIGNED[tab], limit: PAGE, offset: 0 });
  const items = data?.items ?? [];
  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-outline px-2 pt-2">
        <Tabs
          label="Chats"
          idPrefix="platform-chats"
          value={tab}
          onChange={(id) => isTab(id) && onTab(id)}
          items={[
            { id: 'waiting', label: 'Esperando', count: data ? data.counts.waiting : null, tone: 'warn' },
            { id: 'mine', label: 'Míos', count: data ? data.counts.mine : null },
            { id: 'all', label: 'Todos' },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <ErrorState error={error} resource="Los chats" onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="grid gap-3 p-3" role="status" aria-label="Cargando chats">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={
              tab === 'waiting' ? 'Nadie esperando' : tab === 'mine' ? 'No atendés ningún chat' : 'Sin chats abiertos'
            }
            description="Cuando una empresa escriba, el chat aparece acá."
          />
        ) : (
          <ul aria-label="Chats abiertos">
            {items.map((chat) => (
              <li key={chat.id}>
                <ChatRow chat={chat} selected={chat.id === selectedId} />
              </li>
            ))}
            {data && data.total > items.length && (
              <li className="px-3 py-2 text-center text-xs text-muted">
                Se muestran los {items.length} con movimiento más reciente de {data.total}.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};
