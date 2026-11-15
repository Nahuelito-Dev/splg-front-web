import { Ticket as TicketIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../common/components/ui';
import type { TicketSummary } from '../../../services/api/types';
import { labelOf, TICKET_PRIORITY, TICKET_STATUS } from '../../../utils/statusLabels';

export const TicketBadges = ({ ticket }: { ticket: Pick<TicketSummary, 'status' | 'priority'> }) => (
  <span className="inline-flex flex-wrap items-center gap-1.5">
    <Badge label={labelOf(TICKET_STATUS, ticket.status)} />
    {(ticket.priority === 'high' || ticket.priority === 'urgent') && (
      <Badge label={labelOf(TICKET_PRIORITY, ticket.priority)} variant="critical" />
    )}
  </span>
);

interface Props {
  tickets: TicketSummary[];
  ticketHref: (ticketId: string) => string;
  /** Una tira horizontal (arriba del hilo) o una lista (en el lateral). */
  layout?: 'strip' | 'list';
}

/**
 * Las tarjetas de los tickets que salieron del chat, con su estado en vivo (`ticket:updated` las actualiza en la
 * caché). Un ticket con algo sin leer lo dice.
 */
export const TicketCards = ({ tickets, ticketHref, layout = 'strip' }: Props) => {
  if (tickets.length === 0) return null;
  return (
    <ul
      aria-label="Tickets abiertos desde este chat"
      className={layout === 'strip' ? 'flex gap-2 overflow-x-auto px-3 py-2' : 'grid gap-2'}
    >
      {tickets.map((ticket) => (
        <li key={ticket.id} className={layout === 'strip' ? 'shrink-0' : ''}>
          <Link
            to={ticketHref(ticket.id)}
            className="grid min-w-[220px] max-w-[280px] gap-1 rounded-xl border border-outline bg-surface px-3 py-2 text-left hover:bg-surface-hover"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <TicketIcon aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
              {ticket.number}
              {ticket.unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold text-on-primary">
                  {ticket.unreadCount}
                  <span className="sr-only"> sin leer</span>
                </span>
              )}
            </span>
            <span className="truncate text-sm text-ink-2">{ticket.subject}</span>
            <TicketBadges ticket={ticket} />
          </Link>
        </li>
      ))}
    </ul>
  );
};
