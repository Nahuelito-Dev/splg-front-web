import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Drawer, EmptyState, ErrorState, LoadingState } from '../../common/components/ui';
import { companyChatHref } from '../../features/chat/routes';
import { useCompanyChatHistory } from '../../services/queries/supportChat';
import { formatDateTime } from '../../utils/format';

const PAGE = 20;

const CLOSED_REASON: Record<string, string> = {
  inactivity: 'Cerrado por inactividad',
  manual: 'Cerrado por el soporte',
  ticket_closed: 'Cerrado',
};

/** Los chats anteriores con la plataforma (cerrados), los más recientes primero. */
export const ChatHistoryDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [limit, setLimit] = useState(PAGE);
  const history = useCompanyChatHistory({ limit, offset: 0 }, open);
  const items = history.data?.items ?? [];
  const total = history.data?.total ?? 0;
  return (
    <Drawer open={open} onClose={onClose} title="Chats anteriores" description="Los chats ya cerrados, para releerlos.">
      {history.isPending ? (
        <LoadingState label="Cargando chats anteriores…" />
      ) : history.error ? (
        <ErrorState error={history.error} resource="Los chats anteriores" onRetry={() => void history.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Sin chats anteriores" description="Cuando un chat se cierre, va a aparecer acá." />
      ) : (
        <ul className="grid gap-2">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                to={companyChatHref(c.id)}
                onClick={onClose}
                className="grid gap-0.5 rounded-xl border border-outline px-3 py-2 hover:bg-surface-hover"
              >
                <span className="text-sm font-medium text-ink">{formatDateTime(c.createdAt)}</span>
                <span className="line-clamp-1 text-xs text-ink-2">{c.lastMessage?.preview ?? 'Sin mensajes'}</span>
                <span className="text-[11px] text-muted">
                  {(c.closedReason && CLOSED_REASON[c.closedReason]) ?? 'Cerrado'} · {formatDateTime(c.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
          {items.length < total && (
            <li className="flex justify-center pt-2">
              <Button size="sm" variant="ghost" loading={history.isFetching} onClick={() => setLimit((l) => l + PAGE)}>
                Ver más
              </Button>
            </li>
          )}
        </ul>
      )}
    </Drawer>
  );
};
