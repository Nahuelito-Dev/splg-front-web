import { Ban, Bot, Lock, PencilLine, Star, ThumbsUp } from 'lucide-react';
import { cx } from '../../../common/components/ui';
import type { InboxCsat } from '../../../services/api/types';
import { formatDateTime, formatTime } from '../../../utils/format';
import {
  CSAT_SERVED_BY_LABEL,
  CSAT_STATUS_LABEL,
  csatRatingIdOf,
  csatResultText,
  type HandoffNote,
} from '../inbox/messageExtras';
import { messageDomId, useCanEditNow } from '../messageActions';
import type { ChatMessage } from '../thread';
import type { MessageContext } from './MessageItem';
import { MessageText } from './MessageText';

/** «Sólo lo ve el equipo»: lo que distingue una nota de un mensaje al cliente o al chofer. */
export const TEAM_ONLY_LABEL = 'Sólo lo ve el equipo';

/** Las estrellas de una calificación (1 a 5), con el número como nombre accesible. */
export const CsatStars = ({ score, className }: { score: number; className?: string }) => (
  <span role="img" aria-label={`${score} de 5`} className={cx('inline-flex items-center gap-px', className)}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        aria-hidden="true"
        className={cx('h-3.5 w-3.5', n <= score ? 'fill-current text-warn' : 'text-faint')}
      />
    ))}
  </span>
);

/** El resultado de la encuesta, para el personal: estrellas y comentario, o cómo quedó si no respondió. */
export const CsatResult = ({ csat, showServedBy = true }: { csat: InboxCsat; showServedBy?: boolean }) => (
  <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
    {csat.status === 'answered' && csat.score !== null ? (
      <>
        <CsatStars score={csat.score} />
        <span className="font-medium text-ink">{csatResultText(csat)}</span>
      </>
    ) : (
      <span className="font-medium text-ink-2">
        {CSAT_STATUS_LABEL[csat.status]}
        {csat.status === 'pending' && ` · vence ${formatDateTime(csat.expiresAt)}`}
      </span>
    )}
    {showServedBy && csat.servedBy && <span className="text-muted">· {CSAT_SERVED_BY_LABEL[csat.servedBy]}</span>}
  </span>
);

/**
 * Una nota interna de la bandeja (4a): ni burbuja del cliente ni del equipo. Ancha, con borde punteado, el candado,
 * quién la escribió y «Sólo lo ve el equipo»; las menciones resaltadas. Se edita como un mensaje propio.
 */
export const InternalNoteItem = ({ message, ctx }: { message: ChatMessage; ctx: MessageContext }) => {
  const editableNow = useCanEditNow(message);
  const deleted = Boolean(message.deleted);
  const author = message.sender?.displayName ?? (message.isMine ? 'Vos' : 'Alguien del equipo');
  const editable = ctx.onEdit && message.isMine && editableNow && !deleted;
  const time = formatTime(message.createdAt);
  return (
    <li
      id={messageDomId(message.conversationId, message.seq)}
      tabIndex={-1}
      className="group my-2 flex justify-center px-2 focus:outline-none"
    >
      <section
        aria-label={`Nota interna de ${author}`}
        className="w-full max-w-[92%] rounded-xl border border-dashed border-warn/60 bg-warn-soft px-3 py-2 text-sm text-ink sm:max-w-[80%]"
      >
        <header className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Lock aria-hidden="true" className="h-3 w-3" />
            Nota interna · {author}
          </span>
          <span className="text-ink-2">{TEAM_ONLY_LABEL}</span>
        </header>
        {deleted ? (
          <em className="inline-flex items-center gap-1.5 text-muted">
            <Ban aria-hidden="true" className="h-3.5 w-3.5" />
            Nota eliminada
          </em>
        ) : message.body === null ? (
          <em className="opacity-75">Nota no disponible</em>
        ) : (
          <MessageText body={message.body} mentions={message.mentions?.map((m) => m.fullName)} />
        )}
        <footer className="mt-1 flex items-center justify-end gap-2 text-[10.5px] text-ink-2">
          {editable && (
            <button
              type="button"
              onClick={() => ctx.onEdit?.(message)}
              className="mr-auto inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium hover:bg-surface-hover hover:text-ink sm:opacity-0 sm:transition-opacity sm:focus:opacity-100 sm:group-hover:opacity-100"
              aria-label={`Editar tu nota de las ${time}`}
            >
              <PencilLine aria-hidden="true" className="h-3 w-3" />
              Editar
            </button>
          )}
          {message.editedAt && !deleted && <span title={`Editada ${formatDateTime(message.editedAt)}`}>editada ·</span>}
          <time dateTime={message.createdAt} title={formatDateTime(message.createdAt)}>
            {time}
          </time>
        </footer>
      </section>
    </li>
  );
};

/**
 * La nota que deja el asistente al pasar la conversación a una persona (4c): el resumen (si el modelo corrió) y el
 * motivo, en castellano. Sólo la ve el equipo.
 */
export const HandoffNoteItem = ({ message, note }: { message: ChatMessage; note: HandoffNote }) => {
  // Sin datos estructurados (una versión vieja del mensaje), el texto que armó el back.
  const fallback = !note.summary && !note.reason ? message.body : null;
  return (
    <li id={messageDomId(message.conversationId, message.seq)} tabIndex={-1} className="my-2 flex justify-center px-2">
      <section
        aria-label="Nota del asistente al pasar la conversación a una persona"
        className="w-full max-w-[92%] rounded-xl border border-dashed border-warn/60 bg-warn-soft px-3 py-2 text-sm text-ink sm:max-w-[80%]"
      >
        <header className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Bot aria-hidden="true" className="h-3 w-3" />
            El asistente pasó la conversación a una persona
          </span>
          <span className="text-ink-2">{TEAM_ONLY_LABEL}</span>
        </header>
        <dl className="grid gap-1">
          {note.summary && (
            <div>
              <dt className="text-[11px] font-semibold text-ink-2">Resumen</dt>
              <dd className="whitespace-pre-wrap break-words">{note.summary}</dd>
            </div>
          )}
          {note.reason && (
            <div>
              <dt className="text-[11px] font-semibold text-ink-2">Motivo</dt>
              <dd className="break-words">{note.reason}</dd>
            </div>
          )}
        </dl>
        {fallback && <p className="whitespace-pre-wrap break-words">{fallback}</p>}
        <p className="mt-1 text-right text-[10.5px] text-ink-2">
          <time dateTime={message.createdAt} title={formatDateTime(message.createdAt)}>
            {formatTime(message.createdAt)}
          </time>
        </p>
      </section>
    </li>
  );
};

/**
 * El pedido de calificación que salió al cerrar (4b): lo que vio el cliente y, si es la encuesta del último cierre,
 * cómo quedó (estrellas y comentario, esperando, vencida o anulada).
 */
export const CsatRequestItem = ({ message, csat }: { message: ChatMessage; csat: InboxCsat | null }) => {
  const ratingId = csatRatingIdOf(message);
  const current = csat && ratingId && csat.ratingId === ratingId ? csat : null;
  return (
    <li id={messageDomId(message.conversationId, message.seq)} tabIndex={-1} className="my-2 flex justify-center px-2">
      <section
        aria-label="Encuesta de satisfacción"
        className="w-full max-w-[92%] rounded-xl border border-outline bg-surface-muted px-3 py-2 text-xs text-muted sm:max-w-[80%]"
      >
        <p className="flex items-center gap-1 font-semibold text-ink">
          <ThumbsUp aria-hidden="true" className="h-3.5 w-3.5" />
          Se le pidió que califique la atención
        </p>
        {message.body && <p className="mt-0.5 whitespace-pre-wrap break-words">«{message.body}»</p>}
        {current ? (
          <div className="mt-1">
            <CsatResult csat={current} />
          </div>
        ) : (
          // La conversación trae sólo la encuesta del último cierre: la de uno anterior queda sin resultado acá.
          csat && <p className="mt-1">Encuesta de un cierre anterior</p>
        )}
        {current?.status === 'answered' && current.comment && (
          <p className="mt-1 whitespace-pre-wrap break-words text-ink">«{current.comment}»</p>
        )}
      </section>
    </li>
  );
};
