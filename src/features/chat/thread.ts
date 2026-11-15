import type { MessageDto } from '../../services/api/types';

/**
 * Lo que el panel tiene de un hilo (chat o ticket). La verdad está en la API: el orden es por `seq` (nunca por hora) y
 * un mensaje se identifica por su id y su `seq`, así que juntar lo que llega por HTTP y por el socket no duplica nada.
 */
export interface ThreadData {
  /** En orden de `seq`, sin repetidos. */
  messages: MessageDto[];
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
export const mergeMessages = (current: MessageDto[], incoming: MessageDto[]): MessageDto[] => {
  if (incoming.length === 0) return current;
  const bySeq = new Map<number, MessageDto>();
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
export const dropConfirmed = (pending: PendingMessage[], messages: MessageDto[]): PendingMessage[] => {
  if (pending.length === 0) return pending;
  const confirmed = new Set(messages.map((m) => m.clientMessageId).filter((id): id is string => Boolean(id)));
  return pending.filter((p) => !confirmed.has(p.clientMessageId));
};

/** El número más alto que escribió la otra punta (lo que hay que marcar leído). Sistema y propios no cuentan. */
export const lastIncomingSeq = (messages: MessageDto[]): number => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (!m.isMine) return m.seq;
  }
  return 0;
};
