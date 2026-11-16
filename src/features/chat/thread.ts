import type { InboxMessage, MessageDto } from '../../services/api/types';
import type { MentionToken } from './composerDraft';

/**
 * Un mensaje del hilo. El del chat con la plataforma (`MessageDto`) y el de la bandeja con clientes y choferes
 * (`InboxMessageDto`, que suma la cita, la edición y el borrado) se dibujan con los mismos componentes: lo que uno no
 * trae queda opcional.
 */
export type ChatMessage = MessageDto &
  Partial<
    Pick<
      InboxMessage,
      'replyTo' | 'editedAt' | 'canEdit' | 'deleted' | 'deletedAt' | 'automated' | 'senderLabel' | 'mentions'
    >
  >;

/** Una página de mensajes, sea de la API que sea. */
export interface ThreadPage {
  items: ChatMessage[];
  hasMore: boolean;
}

/**
 * Lleva un mensaje de la bandeja a la forma común: la nota interna (`internal`) pasa a `visibility: 'internal'`, como
 * las de los tickets; en la bandeja no hay citas en tickets.
 */
export const toChatMessage = (message: MessageDto | InboxMessage): ChatMessage => {
  if ('visibility' in message) return message;
  const { internal, ...rest } = message;
  return { ...rest, visibility: internal ? 'internal' : 'all', citedInTickets: [], bodyFiltered: false };
};

/**
 * Lo que el panel tiene de un hilo (chat o ticket). La verdad está en la API: el orden es por `seq` (nunca por hora) y
 * un mensaje se identifica por su id y su `seq`, así que juntar lo que llega por HTTP y por el socket no duplica nada.
 */
export interface ThreadData {
  /** En orden de `seq`, sin repetidos. */
  messages: ChatMessage[];
  /** Hay mensajes anteriores al primero cargado (historial hacia atrás con `beforeSeq`). */
  hasMoreBefore: boolean;
  /** Lo que se escribió y todavía no confirmó la API (envío optimista). */
  pending: PendingMessage[];
  /** Hasta dónde leyó la otra punta, según lo que avisó el socket (`chat:read`). Nunca baja. */
  counterpartLastReadSeq: number;
}

export type PendingStatus = 'sending' | 'failed';

/** Un mensaje escrito y no confirmado. Se reintenta con el MISMO `clientMessageId`: la API no lo duplica. */
export interface PendingMessage {
  clientMessageId: string;
  body: string;
  status: PendingStatus;
  /** Sólo en el hilo de un ticket, del lado de la plataforma. */
  visibility?: 'all' | 'internal';
  /** Responde a ese mensaje (bandeja, D-C25). */
  replyToSeq?: number;
  /** Respuesta guardada elegida: el back completa sus variables (bandeja). */
  templateId?: string;
  /** Personas del equipo mencionadas en una nota interna (bandeja). */
  mentions?: string[];
  /** Las mismas menciones con su lugar en el texto: si se descarta, la nota vuelve a su borrador con ellas. */
  mentionTokens?: MentionToken[];
  /** Por qué no se envió (el mensaje de la API). */
  error?: string;
  /** Si tiene sentido reintentar (red, 5xx, 429). Un 4xx de validación o un 409 no se arregla reintentando. */
  retryable?: boolean;
  createdAt: string;
}

export const emptyThread = (): ThreadData => ({
  messages: [],
  hasMoreBefore: false,
  pending: [],
  counterpartLastReadSeq: 0,
});

export const lastSeqOf = (thread: Pick<ThreadData, 'messages'>): number =>
  thread.messages.length ? thread.messages[thread.messages.length - 1].seq : 0;

export const firstSeqOf = (thread: Pick<ThreadData, 'messages'>): number =>
  thread.messages.length ? thread.messages[0].seq : 0;

/**
 * Junta mensajes sin repetir: el mismo `seq` es el mismo mensaje (es único en el hilo) y queda la versión que llega
 * (la de la API es la verdad: p. ej. `citedInTickets` actualizado). Siempre ordenado por `seq`.
 */
export const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
  if (incoming.length === 0) return current;
  const bySeq = new Map<number, ChatMessage>();
  for (const message of current) bySeq.set(message.seq, message);
  for (const message of incoming) bySeq.set(message.seq, message);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
};

/** Lo que hay que hacer con un mensaje que llegó por el socket. */
export type IncomingDecision = 'append' | 'ignore' | 'catch-up';

/**
 * Un mensaje del socket: si es el siguiente (o uno que ya estaba), se agrega; si saltea números, se perdió algo en el
 * medio y se pide lo posterior al último que se tiene (`afterSeq`). Con el hilo vacío, sólo el primero se agrega.
 */
export const decideIncoming = (thread: Pick<ThreadData, 'messages'>, seq: number): IncomingDecision => {
  const last = lastSeqOf(thread);
  if (seq <= last) return thread.messages.some((m) => m.seq === seq) ? 'ignore' : 'append';
  return seq === last + 1 ? 'append' : 'catch-up';
};

/** Saca de la cola de pendientes los que la API ya confirmó (por `clientMessageId`). */
export const dropConfirmed = (pending: PendingMessage[], messages: ChatMessage[]): PendingMessage[] => {
  if (pending.length === 0) return pending;
  const confirmed = new Set(messages.map((m) => m.clientMessageId).filter((id): id is string => Boolean(id)));
  return pending.filter((p) => !confirmed.has(p.clientMessageId));
};

/** El número más alto que escribió la otra punta (lo que hay que marcar leído). Sistema y propios no cuentan. */
export const lastIncomingSeq = (messages: ChatMessage[]): number => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (!m.isMine) return m.seq;
  }
  return 0;
};

/**
 * Una versión nueva de un mensaje que ya estaba. Si no está en el hilo, no se agrega (lo trae la próxima puesta al
 * día). `socket`: llegó por la sala, que no es una persona (`canEdit: false` siempre): se conserva el `canEdit` que la
 * API le dio a quien mira, salvo que se haya borrado. `api`: la respuesta HTTP de quien mira manda tal cual.
 */
export const replaceMessage = (
  messages: ChatMessage[],
  incoming: ChatMessage,
  from: 'socket' | 'api' = 'socket',
): ChatMessage[] => {
  const index = messages.findIndex((m) => m.seq === incoming.seq);
  if (index < 0) return messages;
  const current = messages[index];
  const canEdit = incoming.deleted ? false : from === 'api' ? Boolean(incoming.canEdit) : Boolean(current.canEdit);
  return [...messages.slice(0, index), { ...incoming, canEdit }, ...messages.slice(index + 1)];
};

/**
 * Las versiones de la API de mensajes que el hilo ya tiene (releer la última página al volver a la sala o al
 * reconectar): lo que se editó o se borró mientras no se miraba queda como está ahora. Los que el hilo no tiene no se
 * agregan acá (los trae `afterSeq`).
 */
export const refreshKnown = (messages: ChatMessage[], fresh: ChatMessage[]): ChatMessage[] =>
  fresh.reduce((acc, message) => replaceMessage(acc, message, 'api'), messages);

/**
 * El número del último mensaje del cliente o del chofer (bandeja): con ese mensaje busca la API las sugerencias de
 * respuesta (`basedOnSeq`). Los de la empresa, los del sistema, los del asistente y los borrados o retirados no
 * cuentan. Sin ninguno, 0.
 */
export const lastCounterpartSeq = (messages: ChatMessage[]): number => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    // Como el back (`ULTIMO_MENSAJE_DE_LA_PERSONA`): un texto con cuerpo, ni borrado ni retirado; si no, el anterior.
    const person = m.party === 'customer' || m.party === 'driver';
    if (person && m.kind === 'text' && m.body !== null && !m.deleted && !m.redacted) return m.seq;
  }
  return 0;
};
