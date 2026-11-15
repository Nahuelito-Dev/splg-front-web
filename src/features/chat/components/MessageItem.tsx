import { Ban, Check, CheckCheck, CornerUpLeft, Lock, PencilLine, Ticket as TicketIcon } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../../common/components/ui';
import type { MessageDto } from '../../../services/api/types';
import { formatDateTime, formatTime } from '../../../utils/format';
import { claimOfSystem, isOutOfHoursReply, systemText, ticketOfSystem } from '../messageText';
import { messageDomId, useCanEditNow } from '../messageActions';
import type { ChatMessage } from '../thread';
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
  /** `inbox`: la bandeja de la empresa con clientes y choferes (otros textos de sistema y de autor). */
  variant?: 'support' | 'inbox';
  /** Nombre de la otra punta (el cliente o el chofer) cuando el mensaje no trae autor. */
  counterpartName?: string;
  /** Quién firma las respuestas automáticas. */
  autoName?: string;
  /** Cómo se nombra a cada punta en una cita. */
  partyName?: (party: MessageDto['party']) => string;
  /** A dónde lleva un reclamo nombrado en el hilo. */
  claimHref?: (claimId: string) => string;
  /** «Responder» (citar) un mensaje. Sin esto no se ofrece. */
  onReply?: (message: ChatMessage) => void;
  /** «Editar» un mensaje propio dentro de los 15 minutos. Sin esto no se ofrece. */
  onEdit?: (message: ChatMessage) => void;
}

interface Props {
  message: ChatMessage;
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

const jumpTo = (conversationId: string, seq: number) => {
  const target = document.getElementById(messageDomId(conversationId, seq));
  if (!target) return;
  target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  target.focus({ preventScroll: true });
};

/** La cita del mensaje al que responde (D-C25): quién y una línea; nunca el texto de uno borrado. */
const ReplyQuote = ({ message, ctx, onPrimary }: { message: ChatMessage; ctx: MessageContext; onPrimary: boolean }) => {
  const quoted = message.replyTo;
  if (!quoted) return null;
  const who = ctx.partyName?.(quoted.party) ?? 'Mensaje';
  return (
    <button
      type="button"
      onClick={() => jumpTo(message.conversationId, quoted.seq)}
      className={cx(
        'mb-1.5 block w-full rounded-lg border-l-[3px] px-2 py-1 text-left text-xs',
        onPrimary ? 'border-on-primary/70 bg-on-primary/15' : 'border-primary bg-surface-muted',
      )}
      aria-label={`Responde a ${who}: ${quoted.preview ?? 'mensaje no disponible'}. Ir al mensaje`}
    >
      <span className={cx('block font-semibold', onPrimary ? 'text-on-primary' : 'text-ink')}>{who}</span>
      <span className={cx('line-clamp-2 break-words', onPrimary ? 'text-on-primary/85' : 'text-muted')}>
        {quoted.preview ?? <em>Mensaje no disponible</em>}
      </span>
    </button>
  );
};

/** Un mensaje del hilo: de sistema (centrado), cita del chat (plegable) o texto (burbuja propia o ajena). */
const MessageItemView = ({ message, first, ctx }: Props) => {
  const variant = ctx.variant ?? 'support';
  const editableNow = useCanEditNow(message);
  if (SYSTEM_KINDS.has(message.kind)) {
    const ticket = ticketOfSystem(message);
    const claimId = claimOfSystem(message);
    return (
      <li className="my-2 flex justify-center px-2">
        <p className="max-w-[90%] rounded-full bg-surface-muted px-3 py-1 text-center text-xs text-muted">
          {systemText(message, ctx.platformName, variant)}
          {ticket && (
            <>
              {' · '}
              <Link to={ctx.ticketHref(ticket.ticketId)} className="font-medium text-primary underline">
                Ver ticket
              </Link>
            </>
          )}
          {claimId && ctx.claimHref && (
            <>
              {' · '}
              <Link to={ctx.claimHref(claimId)} className="font-medium text-primary underline">
                Ver reclamo
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
  const deleted = Boolean(message.deleted);
  const selectable = ctx.selection && !auto;
  const checked = ctx.selection?.selected.has(message.seq) ?? false;
  const other = ctx.counterpartName ?? ctx.platformName;
  const author = auto ? (ctx.autoName ?? ctx.platformName) : (message.sender?.displayName ?? (mine ? 'Vos' : other));
  const onPrimary = mine && !internal && !deleted;
  const replyable = ctx.onReply && !deleted && !auto && message.body !== null;
  const editable = ctx.onEdit && mine && editableNow;
  const time = formatTime(message.createdAt);

  return (
    <li
      id={messageDomId(message.conversationId, message.seq)}
      tabIndex={-1}
      className={cx(
        'group flex items-end gap-2 px-2 focus:outline-none',
        first ? 'mt-3' : 'mt-0.5',
        mine ? 'flex-row-reverse' : '',
      )}
    >
      {selectable && (
        <input
          type="checkbox"
          className="mb-2 h-4 w-4 shrink-0 accent-primary"
          checked={checked}
          onChange={() => ctx.selection?.toggle(message.seq)}
          aria-label={`Elegir el mensaje de las ${time}`}
        />
      )}
      <div className={cx('flex max-w-[85%] flex-col sm:max-w-[70%]', mine ? 'items-end' : 'items-start')}>
        {first && (
          <span className="mb-0.5 flex items-center gap-1 px-1 text-[11px] font-medium text-muted">
            {internal && <Lock aria-hidden="true" className="h-3 w-3" />}
            {internal ? `Nota interna · ${author}` : auto && variant === 'inbox' ? `${author} · automática` : author}
          </span>
        )}
        <div
          className={cx(
            'rounded-2xl px-3 py-2 text-sm',
            deleted
              ? 'border border-dashed border-outline bg-surface-muted text-muted'
              : internal
                ? 'border border-warn/40 bg-warn-soft text-ink'
                : mine
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline bg-surface text-ink',
            checked && 'ring-2 ring-primary/50',
          )}
        >
          {!deleted && <ReplyQuote message={message} ctx={ctx} onPrimary={onPrimary} />}
          {deleted ? (
            <em className="inline-flex items-center gap-1.5">
              <Ban aria-hidden="true" className="h-3.5 w-3.5" />
              Mensaje eliminado
            </em>
          ) : message.redacted || message.body === null ? (
            <em className="opacity-75">Mensaje no disponible</em>
          ) : (
            <MessageText body={message.body} onPrimary={onPrimary} />
          )}
          <span
            className={cx(
              'mt-1 flex items-center justify-end gap-1 text-[10.5px]',
              onPrimary ? 'text-on-primary/80' : 'text-muted',
            )}
          >
            {message.editedAt && !deleted && (
              <span title={`Editado ${formatDateTime(message.editedAt)}`}>editado ·</span>
            )}
            <time dateTime={message.createdAt} title={formatDateTime(message.createdAt)}>
              {time}
            </time>
            {mine && !internal && !deleted && <ReadMark read={message.seq <= ctx.counterpartLastReadSeq} />}
          </span>
        </div>
        {(replyable || editable) && (
          // A la vista al pasar el mouse o al llegar con el teclado; en el celular, siempre.
          <span className="mt-0.5 flex gap-1 px-1 sm:opacity-0 sm:transition-opacity sm:focus-within:opacity-100 sm:group-hover:opacity-100">
            {replyable && (
              <button
                type="button"
                onClick={() => ctx.onReply?.(message)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted hover:bg-surface-hover hover:text-ink"
                aria-label={`Responder al mensaje de las ${time}`}
              >
                <CornerUpLeft aria-hidden="true" className="h-3 w-3" />
                Responder
              </button>
            )}
            {editable && (
              <button
                type="button"
                onClick={() => ctx.onEdit?.(message)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted hover:bg-surface-hover hover:text-ink"
                aria-label={`Editar tu mensaje de las ${time}`}
              >
                <PencilLine aria-hidden="true" className="h-3 w-3" />
                Editar
              </button>
            )}
          </span>
        )}
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
 * Se vuelve a dibujar sólo si cambia lo que muestra: el mensaje (la API manda otra versión), el grupo, su ✓/✓✓, su
 * casilla o las acciones que ofrece. Un mensaje nuevo al final no redibuja los cientos de arriba.
 */
export const MessageItem = memo(MessageItemView, (prev, next) => {
  const seq = next.message.seq;
  const read = (p: Props) => p.message.isMine && seq <= p.ctx.counterpartLastReadSeq;
  return (
    prev.message === next.message &&
    prev.first === next.first &&
    read(prev) === read(next) &&
    prev.ctx.platformName === next.ctx.platformName &&
    prev.ctx.counterpartName === next.ctx.counterpartName &&
    prev.ctx.variant === next.ctx.variant &&
    Boolean(prev.ctx.onOfferTicket) === Boolean(next.ctx.onOfferTicket) &&
    Boolean(prev.ctx.onReply) === Boolean(next.ctx.onReply) &&
    Boolean(prev.ctx.onEdit) === Boolean(next.ctx.onEdit) &&
    Boolean(prev.ctx.selection) === Boolean(next.ctx.selection) &&
    (prev.ctx.selection?.selected.has(seq) ?? false) === (next.ctx.selection?.selected.has(seq) ?? false)
  );
});
