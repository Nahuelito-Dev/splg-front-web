import { Check, CheckCheck, Lock, Ticket as TicketIcon } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../common/components/ui';
import type { MessageDto } from '../../../services/api/types';
import { formatDateTime, formatTime } from '../../../utils/format';
import { isOutOfHoursReply, systemText, ticketOfSystem } from '../messageText';
import { MessageText } from './MessageText';
import { QuotedExcerpt } from './QuotedExcerpt';

export interface MessageContext {
  platformName: string;
  /** Hasta dónde leyó la otra punta: los propios hasta ahí llevan ✓✓. */
  counterpartLastReadSeq: number;
  /** A dónde lleva un ticket nombrado en el hilo. */
  ticketHref: (ticketId: string) => string;
  /** Fuera de horario: «Abrir ticket con esto». Sin esto (sin permiso) no se ofrece. */
  onOfferTicket?: (message: MessageDto) => void;
  /** Modo selección (abrir un ticket con mensajes del chat). */
  selection?: { selected: ReadonlySet<number>; toggle: (seq: number) => void };
}

interface Props {
  message: MessageDto;
  /** Primero de su grupo (misma punta y minuto): lleva el nombre. */
  first: boolean;
  ctx: MessageContext;
}

const SYSTEM_KINDS = new Set<MessageDto['kind']>(['system']);

const ReadMark = ({ read }: { read: boolean }) =>
  read ? (
    <CheckCheck aria-label="Leído" className="h-3.5 w-3.5" />
  ) : (
    <Check aria-label="Enviado" className="h-3.5 w-3.5" />
  );

/** Un mensaje del hilo: de sistema (centrado), cita del chat (plegable) o texto (burbuja propia o ajena). */
const MessageItemView = ({ message, first, ctx }: Props) => {
  if (SYSTEM_KINDS.has(message.kind)) {
    const ticket = ticketOfSystem(message);
    return (
      <li className="my-2 flex justify-center px-2">
        <p className="max-w-[90%] rounded-full bg-surface-muted px-3 py-1 text-center text-xs text-muted">
          {systemText(message, ctx.platformName)}
          {ticket && (
            <>
              {' · '}
              <Link to={ctx.ticketHref(ticket.ticketId)} className="font-medium text-primary underline">
                Ver ticket
              </Link>
            </>
          )}
        </p>
      </li>
    );
  }
  if (message.kind === 'quoted_excerpt') {
    return (
      <li className="my-2 px-2">
        <QuotedExcerpt message={message} />
      </li>
    );
  }

  const mine = message.isMine;
  const internal = message.visibility === 'internal';
  const auto = message.kind === 'auto_reply';
  const selectable = ctx.selection && !auto;
  const checked = ctx.selection?.selected.has(message.seq) ?? false;
  const author = auto ? ctx.platformName : (message.sender?.displayName ?? (mine ? 'Vos' : ctx.platformName));

  return (
    <li className={cx('flex items-end gap-2 px-2', first ? 'mt-3' : 'mt-0.5', mine ? 'flex-row-reverse' : '')}>
      {selectable && (
        <input
          type="checkbox"
          className="mb-2 h-4 w-4 shrink-0 accent-primary"
          checked={checked}
          onChange={() => ctx.selection?.toggle(message.seq)}
          aria-label={`Elegir el mensaje de las ${formatTime(message.createdAt)}`}
        />
      )}
      <div className={cx('flex max-w-[85%] flex-col sm:max-w-[70%]', mine ? 'items-end' : 'items-start')}>
        {first && (
          <span className="mb-0.5 flex items-center gap-1 px-1 text-[11px] font-medium text-muted">
            {internal && <Lock aria-hidden="true" className="h-3 w-3" />}
            {internal ? `Nota interna · ${author}` : author}
          </span>
        )}
        <div
          className={cx(
            'rounded-2xl px-3 py-2 text-sm',
            internal
              ? 'border border-warn/40 bg-warn-soft text-ink'
              : mine
                ? 'bg-primary text-on-primary'
                : 'border border-outline bg-surface text-ink',
            checked && 'ring-2 ring-primary/50',
          )}
        >
          {message.redacted || message.body === null ? (
            <em className="opacity-75">Mensaje no disponible</em>
          ) : (
            <MessageText body={message.body} onPrimary={mine && !internal} />
          )}
          <span
            className={cx(
              'mt-1 flex items-center justify-end gap-1 text-[10.5px]',
              mine && !internal ? 'text-on-primary/80' : 'text-muted',
            )}
          >
            <time dateTime={message.createdAt} title={formatDateTime(message.createdAt)}>
              {formatTime(message.createdAt)}
            </time>
            {mine && !internal && <ReadMark read={message.seq <= ctx.counterpartLastReadSeq} />}
          </span>
        </div>
        {message.citedInTickets.length > 0 && (
          <span className="mt-0.5 flex flex-wrap gap-1 px-1">
            {message.citedInTickets.map((cited) => (
              <Link
                key={cited.ticketId}
                to={ctx.ticketHref(cited.ticketId)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <TicketIcon aria-hidden="true" className="h-3 w-3" />→ {cited.number}
              </Link>
            ))}
          </span>
        )}
        {auto && isOutOfHoursReply(message) && ctx.onOfferTicket && (
          <button
            type="button"
            onClick={() => ctx.onOfferTicket?.(message)}
            className="mt-1 rounded-lg border border-primary-edge px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
          >
            Abrir ticket con esto
          </button>
        )}
      </div>
    </li>
  );
};

/**
 * Se vuelve a dibujar sólo si cambia lo que muestra: el mensaje (la API manda otra versión), el grupo, su ✓/✓✓ o
 * su casilla. Un mensaje nuevo al final no redibuja los cientos de arriba.
 */
export const MessageItem = memo(MessageItemView, (prev, next) => {
  const seq = next.message.seq;
  const read = (p: Props) => p.message.isMine && seq <= p.ctx.counterpartLastReadSeq;
  return (
    prev.message === next.message &&
    prev.first === next.first &&
    read(prev) === read(next) &&
    prev.ctx.platformName === next.ctx.platformName &&
    Boolean(prev.ctx.onOfferTicket) === Boolean(next.ctx.onOfferTicket) &&
    Boolean(prev.ctx.selection) === Boolean(next.ctx.selection) &&
    (prev.ctx.selection?.selected.has(seq) ?? false) === (next.ctx.selection?.selected.has(seq) ?? false)
  );
});
