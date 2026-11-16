import { MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, cx } from '../../../common/components/ui';
import type { Ticket } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import {
  labelOf,
  SUPPORT_SESSION_STATUS,
  TICKET_CATEGORY,
  TICKET_PRIORITY,
  TICKET_STATUS,
} from '../../../utils/statusLabels';

/** Estado, prioridad y categoría del ticket, para el encabezado de la ficha. */
export const TicketHeaderBadges = ({ ticket }: { ticket: Ticket }) => (
  <>
    <Badge label={labelOf(TICKET_STATUS, ticket.status)} />
    <Badge label={labelOf(TICKET_PRIORITY, ticket.priority)} variant="critical" />
    <Badge label={labelOf(TICKET_CATEGORY, ticket.category)} />
  </>
);

/** «Abierto desde el chat del 14/11 15:20 · Ver en el chat». */
export const OriginBand = ({ ticket, chatHref }: { ticket: Ticket; chatHref: (conversationId: string) => string }) =>
  ticket.origin ? (
    <p className="flex flex-wrap items-center gap-2 rounded-xl border border-outline bg-surface-sunken px-3 py-2 text-sm text-ink-2">
      <MessageCircle aria-hidden="true" className="h-4 w-4 text-muted" />
      Abierto desde el chat del {formatDateTime(ticket.createdAt)}
      <Link to={chatHref(ticket.origin.conversationId)} className="font-medium text-primary underline">
        Ver en el chat
      </Link>
    </p>
  ) : null;

/** El objetivo de primera respuesta: vencido en rojo mientras nadie respondió. */
export const FirstResponseDue = ({ ticket }: { ticket: Ticket }) => {
  if (ticket.firstResponseAt) return <span>Respondido el {formatDateTime(ticket.firstResponseAt)}</span>;
  if (!ticket.firstResponseDueAt) return <span>—</span>;
  const overdue = new Date(ticket.firstResponseDueAt).getTime() < Date.now();
  return (
    <span className={cx(overdue && 'font-medium text-danger')}>
      {overdue ? 'Vencido: ' : 'Vence: '}
      {formatDateTime(ticket.firstResponseDueAt)}
    </span>
  );
};

/** Una fila «etiqueta: valor» del lateral de la ficha. */
export const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-0.5">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="text-sm text-ink">{children}</dd>
  </div>
);

type SessionStatus = keyof typeof SUPPORT_SESSION_STATUS;
const isSessionStatus = (value: string): value is SessionStatus => value in SUPPORT_SESSION_STATUS;

export const SessionStatusBadge = ({ status }: { status: string }) => (
  <Badge label={isSessionStatus(status) ? SUPPORT_SESSION_STATUS[status] : { text: status, tone: 'neutral' }} />
);
