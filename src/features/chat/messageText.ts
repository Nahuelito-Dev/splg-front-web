import type { MessageDto } from '../../services/api/types';
import { argentinaDay, formatDay } from '../../utils/format';
import { TICKET_STATUS } from '../../utils/statusLabels';

const isTicketStatus = (value: string): value is keyof typeof TICKET_STATUS => value in TICKET_STATUS;

/** Un trozo del texto de un mensaje: texto plano o un enlace. Nunca HTML del usuario. */
export type TextPart = { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string };

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;
/** Puntuación que cierra una oración y no es parte del enlace. */
const TRAILING = /[.,;:!?)\]]+$/;

/**
 * Parte el texto en trozos y detecta los enlaces `http(s)://`. El componente dibuja cada trozo como texto de React
 * (escapado): un `<script>` en el cuerpo se ve tal cual.
 */
export const splitLinks = (body: string): TextPart[] => {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of body.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const href = raw.replace(TRAILING, '');
    if (start > last) parts.push({ kind: 'text', text: body.slice(last, start) });
    parts.push({ kind: 'link', text: href, href });
    last = start + href.length;
  }
  if (last < body.length) parts.push({ kind: 'text', text: body.slice(last) });
  return parts;
};

/** El día (argentino) de un mensaje, para el separador «Hoy / Ayer / 12/11/2026». */
export const dayOf = (iso: string): string => argentinaDay(iso);

export const dayLabel = (day: string, today: string, yesterday: string): string =>
  day === today ? 'Hoy' : day === yesterday ? 'Ayer' : formatDay(day);

/** Dos mensajes seguidos de la misma punta (y persona) en el mismo minuto van en el mismo grupo. */
export const sameGroup = (a: MessageDto, b: MessageDto): boolean =>
  a.kind === 'text' &&
  b.kind === 'text' &&
  a.party === b.party &&
  a.visibility === b.visibility &&
  (a.sender?.displayName ?? '') === (b.sender?.displayName ?? '') &&
  a.createdAt.slice(0, 16) === b.createdAt.slice(0, 16);

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Clave de la respuesta automática fuera de horario (`PLANTILLA_FUERA_DE_HORARIO` del back). */
export const OUT_OF_HOURS_KEY = 'fuera_de_horario';

export const isOutOfHoursReply = (message: MessageDto): boolean =>
  message.kind === 'auto_reply' && message.templateKey === OUT_OF_HOURS_KEY;

/** El ticket que nombra un mensaje de sistema (`ticket_opened`, `ticket_created`, `ticket_status_changed`). */
export const ticketOfSystem = (message: MessageDto): { ticketId: string; number: string } | null => {
  const payload = message.payload ?? {};
  const ticketId = text(payload.ticketId);
  return ticketId ? { ticketId, number: text(payload.number) } : null;
};

/** El texto de un mensaje de sistema: el back manda la clave y los datos; el texto lo arma el panel. */
export const systemText = (message: MessageDto, platformName: string): string => {
  const payload = message.payload ?? {};
  const number = text(payload.number);
  switch (message.systemCode) {
    case 'conversation_opened':
      return 'Se abrió el chat';
    case 'ticket_opened':
      return `Se abrió el ticket ${number}${payload.subject ? `: ${text(payload.subject)}` : ''}`;
    case 'ticket_created':
      return `Ticket ${number} creado${payload.subject ? `: ${text(payload.subject)}` : ''}`;
    case 'ticket_status_changed': {
      const to = text(payload.to);
      return `El ticket ${number} pasó a «${isTicketStatus(to) ? TICKET_STATUS[to].text : to}»`;
    }
    case 'closed_inactivity':
      return 'El chat se cerró por inactividad. Escribí para abrir uno nuevo.';
    case 'closed_manual':
      return `${platformName} cerró el chat. Escribí para abrir uno nuevo.`;
    case 'assigned':
      return message.body ?? `Alguien de ${platformName} tomó el chat`;
    case 'received_ack':
      return message.body ?? 'Recibimos tu mensaje: alguien del equipo te va a atender a la brevedad.';
    default:
      return message.body ?? '';
  }
};

/** Los mensajes citados en un `quoted_excerpt` (copia de los del chat). */
export interface QuotedItem {
  seq: number;
  party: MessageDto['party'];
  body: string | null;
  at: string;
}

const isQuotedItem = (value: unknown): value is QuotedItem =>
  typeof value === 'object' && value !== null && 'seq' in value && 'party' in value && 'at' in value;

export const quotedOf = (
  message: MessageDto,
): { sourceConversationId: string; fromSeq: number; toSeq: number; items: QuotedItem[] } => {
  const payload = message.payload ?? {};
  const items = Array.isArray(payload.items) ? payload.items.filter(isQuotedItem) : [];
  return {
    sourceConversationId: text(payload.sourceConversationId),
    fromSeq: Number(payload.fromSeq) || 0,
    toSeq: Number(payload.toSeq) || 0,
    items,
  };
};
