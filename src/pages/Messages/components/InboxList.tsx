import { HardHat, MessageSquareText, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cx, EmptyState, ErrorState, PersonAvatar, SearchInput, Skeleton, Tabs } from '../../../common/components/ui';
import { useDebounce } from '../../../hooks/useDebounce';
import { counterpartName, subjectLabel } from '../../../features/chat/inbox/inboxLabels';
import { messageHref } from '../../../features/chat/routes';
import { INBOX_SEARCH_MAX, INBOX_SEARCH_MIN, type InboxChannel, type InboxQuery } from '../../../services/api/inbox';
import type { InboxConversation } from '../../../services/api/types';
import { tabQuery, type InboxFilter, type InboxTab, isInboxTab } from '../inboxTabs';
import { useInboxConversations } from '../../../services/queries/inbox';
import { formatElapsed } from '../../../utils/format';

const PAGE = 50;

const EMPTY: Record<InboxTab, { title: string; description: string }> = {
  unassigned: {
    title: 'No hay nadie esperando',
    description: 'Cuando un cliente o un chofer escriba, la conversación entra acá hasta que alguien la tome.',
  },
  mine: { title: 'No atendés ninguna conversación', description: 'Tomá una de «Sin asignar» para atenderla.' },
  all: { title: 'No hay conversaciones abiertas', description: 'Los mensajes de clientes y choferes aparecen acá.' },
  closed: { title: 'No hay conversaciones cerradas', description: 'Las que se cierran quedan acá, en lectura.' },
};

interface Props {
  tab: InboxTab;
  onTab: (tab: InboxTab) => void;
  filter: InboxFilter;
  onFilter: (filter: InboxFilter) => void;
  /** Atiende los dos canales: se ofrecen los filtros Clientes / Choferes. */
  bothChannels: boolean;
  selectedId: string | undefined;
}

const ChannelIcon = ({ channel }: { channel: InboxChannel }) =>
  channel === 'staff_driver' ? (
    <HardHat aria-hidden="true" className="h-3 w-3" />
  ) : (
    <UserRound aria-hidden="true" className="h-3 w-3" />
  );

const Row = ({ conversation, selected, now }: { conversation: InboxConversation; selected: boolean; now: number }) => {
  const name = counterpartName(conversation);
  const last = conversation.lastMessage;
  const unread = conversation.unreadCount;
  const closed = conversation.status === 'closed';
  const preview = last
    ? last.preview === null
      ? last.party === 'system'
        ? 'Aviso del sistema'
        : 'Mensaje eliminado'
      : `${last.party === 'company' ? 'Equipo: ' : ''}${last.preview}`
    : 'Sin mensajes';
  return (
    <Link
      to={messageHref(conversation.id)}
      aria-current={selected ? 'page' : undefined}
      className={cx(
        'flex gap-3 border-b border-outline-soft px-3 py-2.5 transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none',
        selected && 'bg-primary-soft hover:bg-primary-soft',
      )}
    >
      <PersonAvatar
        name={name}
        userId={(conversation.customer ?? conversation.driver)?.id ?? null}
        size="md"
        decorative
        className="h-9 w-9 shrink-0 text-xs"
      />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-center gap-2">
          <span
            className={cx('min-w-0 flex-1 truncate text-sm text-ink', unread > 0 ? 'font-semibold' : 'font-medium')}
          >
            {name}
          </span>
          {last && <span className="shrink-0 text-[11px] text-muted">{formatElapsed(last.at, now)}</span>}
        </span>
        <span className="flex items-center gap-2">
          <span className={cx('line-clamp-1 flex-1 text-xs', unread > 0 ? 'text-ink' : 'text-ink-2')}>{preview}</span>
          {unread > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-on-primary">
              {unread}
              <span className="sr-only"> sin leer</span>
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <ChannelIcon channel={conversation.channel} />
            {conversation.channel === 'staff_driver' ? 'Chofer' : 'Cliente'}
          </span>
          <span>· {subjectLabel(conversation)}</span>
          {closed ? (
            <span className="font-medium">· Cerrada</span>
          ) : conversation.assignedTo ? (
            <span className="truncate">· {conversation.assignedTo.fullName}</span>
          ) : (
            <span className="font-medium text-warn">· Sin asignar</span>
          )}
        </span>
      </span>
    </Link>
  );
};

/** Un «ahora» que avanza cada minuto, para «hace 5m» sin redibujar en cada render. */
const useMinuteClock = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
};

/** La lista de la bandeja: Sin asignar / Mías / Todas, Clientes / Choferes y búsqueda (nombre o último mensaje). */
export const InboxList = ({ tab, onTab, filter, onFilter, bothChannels, selectedId }: Props) => {
  const [term, setTerm] = useState('');
  const debounced = useDebounce(term.trim(), 350);
  const q = debounced.length >= INBOX_SEARCH_MIN ? debounced.slice(0, INBOX_SEARCH_MAX) : undefined;
  const params: InboxQuery = {
    ...tabQuery(tab),
    ...(filter !== 'all' ? { channel: filter } : {}),
    ...(q ? { q } : {}),
    limit: PAGE,
    offset: 0,
  };
  const { data, error, isPending, refetch, isFetching } = useInboxConversations(params);
  const now = useMinuteClock();
  const items = data?.items ?? [];
  const short = term.trim().length > 0 && term.trim().length < INBOX_SEARCH_MIN;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        label="Conversaciones"
        idPrefix="inbox"
        value={tab}
        onChange={(id) => isInboxTab(id) && onTab(id)}
        items={[
          { id: 'unassigned', label: 'Sin asignar', count: data ? data.counts.unassigned : null, tone: 'warn' },
          { id: 'mine', label: 'Mías', count: data ? data.counts.mine : null },
          { id: 'all', label: 'Todas', count: data ? data.counts.open : null },
          { id: 'closed', label: 'Cerradas' },
        ]}
      />
      <div className="grid gap-2 border-b border-outline p-3">
        <SearchInput
          label="Buscar conversaciones"
          placeholder="Nombre o texto del último mensaje"
          value={term}
          maxLength={INBOX_SEARCH_MAX}
          onChange={(event) => setTerm(event.target.value)}
        />
        {short && <p className="text-[11px] text-muted">Escribí al menos {INBOX_SEARCH_MIN} letras para buscar.</p>}
        {bothChannels && (
          <div className="flex gap-1" role="group" aria-label="Filtrar por canal">
            {(
              [
                ['all', 'Todos'],
                ['staff_customer', 'Clientes'],
                ['staff_driver', 'Choferes'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => onFilter(value)}
                className={cx(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filter === value
                    ? 'border-primary-edge bg-primary-soft text-primary'
                    : 'border-outline text-ink-2 hover:bg-surface-hover',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={isFetching}>
        {error && !data ? (
          <ErrorState error={error} resource="La bandeja" onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="grid gap-3 p-3" role="status" aria-label="Cargando conversaciones">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          q ? (
            <EmptyState icon={MessageSquareText} title="Sin resultados" description={`Nada coincide con «${q}».`} />
          ) : (
            <EmptyState icon={MessageSquareText} title={EMPTY[tab].title} description={EMPTY[tab].description} />
          )
        ) : (
          <ul aria-label="Conversaciones">
            {items.map((conversation) => (
              <li key={conversation.id}>
                <Row conversation={conversation} selected={conversation.id === selectedId} now={now} />
              </li>
            ))}
            {data && data.total > items.length && (
              <li className="px-3 py-2 text-center text-xs text-muted">
                Se muestran las {items.length} con movimiento más reciente de {data.total}.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};
