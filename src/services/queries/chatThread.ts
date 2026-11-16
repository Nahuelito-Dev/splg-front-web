import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  decideIncoming,
  dropConfirmed,
  emptyThread,
  firstSeqOf,
  keepScanned,
  lastSeqOf,
  mergeMessages,
  refreshKnown,
  replaceMessage,
  toChatMessage,
  type ChatMessage,
  type PendingMessage,
  type ThreadData,
  type ThreadPage,
} from '../../features/chat/thread';
import { errorMessage, toApiError } from '../api/errors';
import { MESSAGES_PAGE, MESSAGES_PAGE_MAX, type MessagesQuery } from '../api/supportChat';
import type { DownloadLink, InboxMessage, MessageDto } from '../api/types';
import type { ChatAttachmentInput, OnUploadProgress } from '../api/chatAttachments';
import type { ChatAttachmentChannel } from '../../features/chat/attachments';
import type { MentionToken } from '../../features/chat/composerDraft';
import { chatKeys } from './supportChat';
import { newUuid } from '../../utils/uuid';

/**
 * Lo que se manda al escribir: el texto, el id que genera el panel y, según el hilo, la visibilidad (ticket de la
 * plataforma), el mensaje al que responde y la respuesta guardada (bandeja).
 */
export interface OutgoingMessage {
  clientMessageId: string;
  body: string;
  visibility?: 'all' | 'internal';
  replyToSeq?: number;
  templateId?: string;
  /** Usuarios mencionados en una nota interna (bandeja). */
  mentions?: string[];
}

/** Lo que se puede agregar a un envío además del texto. */
export interface SendExtras {
  visibility?: 'all' | 'internal';
  replyToSeq?: number;
  templateId?: string;
  /** Usuarios mencionados en una nota interna (bandeja). */
  mentions?: string[];
  /** Dónde está cada mención en el texto (no viaja a la API: es para devolver la nota a su borrador). */
  mentionTokens?: MentionToken[];
}

/**
 * Adjuntos de un hilo (CH7): el canal (qué tipos y topes), la subida (sin esto, el hilo sólo los muestra: un chat
 * cerrado) y el enlace firmado de cada uno (se pide al verlo; vence a los 300 s).
 */
export interface ThreadAttachments {
  channel: ChatAttachmentChannel;
  upload?: (input: ChatAttachmentInput, onProgress?: OnUploadProgress) => Promise<ChatMessage>;
  link: (messageId: string) => Promise<DownloadLink>;
}

/** De dónde sale y a dónde va un hilo: cada pantalla arma el suyo con las llamadas de su lado. */
export interface ThreadSource {
  /** La conversación (su sala y su caché). `null`: la empresa todavía no tiene chat abierto; el primer mensaje lo crea. */
  conversationId: string | null;
  fetch: ((query: MessagesQuery) => Promise<ThreadPage>) | null;
  send: (message: OutgoingMessage) => Promise<ChatMessage>;
  /** Editar un mensaje propio (bandeja, D-C22). Sin esto, el hilo no ofrece editar. */
  edit?: (messageId: string, body: string) => Promise<ChatMessage>;
  /**
   * Un envío confirmado quedó en otra conversación (la empresa abrió un chat nuevo): quien muestra el hilo tiene que
   * pasar a ella en el acto (su caché ya tiene el mensaje).
   */
  onSent?: (message: ChatMessage) => void;
  /** Adjuntos: sin esto el hilo no ofrece adjuntar ni sabe pedir los archivos. */
  attachments?: ThreadAttachments;
}

/** Clave del hilo del chat de la empresa mientras no hay conversación. */
export const NEW_THREAD = 'new';

/** Tope de vueltas al ponerse al día (100 mensajes cada una): más que eso, se relee de cero. */
const CATCH_UP_ROUNDS = 20;

const keyOf = (conversationId: string | null) => chatKeys.thread(conversationId ?? NEW_THREAD);

const update = (queryClient: QueryClient, key: readonly unknown[], fn: (thread: ThreadData) => ThreadData): void => {
  queryClient.setQueryData<ThreadData>(key, (current: ThreadData | undefined) => fn(current ?? emptyThread()));
};

/**
 * Mensajes del socket que llegaron antes de la primera carga de su hilo (entre `chat:join` y la respuesta del GET).
 * Uno por cliente de React Query y por hilo; se vacía al sumarlos.
 */
const earlyMessages = new WeakMap<QueryClient, Map<string, ChatMessage[]>>();
const hashOf = (key: readonly unknown[]) => JSON.stringify(key);

const keepEarly = (queryClient: QueryClient, key: readonly unknown[], message: ChatMessage) => {
  const byThread = earlyMessages.get(queryClient) ?? new Map<string, ChatMessage[]>();
  earlyMessages.set(queryClient, byThread);
  byThread.set(hashOf(key), mergeMessages(byThread.get(hashOf(key)) ?? [], [message]));
};

const takeEarly = (queryClient: QueryClient, key: readonly unknown[]): ChatMessage[] => {
  const byThread = earlyMessages.get(queryClient);
  const early = byThread?.get(hashOf(key)) ?? [];
  byThread?.delete(hashOf(key));
  return early;
};

/** Los que siguen sin hueco al último de la foto, y si quedó alguno después de un hueco. */
const splitEarly = (early: ChatMessage[], last: number): { contiguous: ChatMessage[]; gap: boolean } => {
  const contiguous: ChatMessage[] = [];
  let next = last;
  for (const message of early) {
    if (message.seq > next + 1) return { contiguous, gap: true };
    contiguous.push(message);
    next = Math.max(next, message.seq);
  }
  return { contiguous, gap: false };
};

/**
 * Carga un hilo: la primera vez, los últimos mensajes; después, sólo lo posterior al último número que se tiene
 * (`afterSeq`), en vueltas de 100 hasta que no haya más. Lo que llegó mientras tanto por el socket o se escribió se
 * conserva: el resultado se junta con lo que hay en la caché al terminar.
 */
export const loadThread = async (
  queryClient: QueryClient,
  key: readonly unknown[],
  fetch: (query: MessagesQuery) => Promise<ThreadPage>,
): Promise<ThreadData> => {
  const current = queryClient.getQueryData<ThreadData>(key);
  if (!current || current.messages.length === 0) {
    let page: ThreadPage;
    try {
      page = await fetch({ limit: MESSAGES_PAGE });
    } catch (error) {
      // Una carga fallida no deja nada en el búfer: el próximo intento trae una foto nueva y la puesta al día.
      takeEarly(queryClient, key);
      throw error;
    }
    const latest = queryClient.getQueryData<ThreadData>(key) ?? current ?? emptyThread();
    // Lo que llegó por el socket mientras se pedía la primera página (sin caché todavía) se suma acá; ante el mismo
    // `seq`, gana la versión de la API.
    const fetched = mergeMessages(latest.messages, page.items);
    const { contiguous, gap } = splitEarly(takeEarly(queryClient, key), lastSeqOf({ messages: fetched }));
    const messages = mergeMessages(mergeMessages(latest.messages, contiguous), page.items);
    // Si entre la foto del GET y lo que llegó por el socket falta algo, no se agrega lo de después del hueco: se pide
    // lo posterior al último seguido (`afterSeq`), que trae el hueco y lo que había llegado.
    if (gap) window.setTimeout(() => void queryClient.invalidateQueries({ queryKey: key }), 0);
    return { ...latest, messages, hasMoreBefore: page.hasMore, pending: dropConfirmed(latest.pending, messages) };
  }
  const items: ChatMessage[] = [];
  let after = lastSeqOf(current);
  for (let round = 0; round < CATCH_UP_ROUNDS; round += 1) {
    const page = await fetch({ afterSeq: after, limit: MESSAGES_PAGE_MAX });
    items.push(...page.items);
    if (!page.hasMore || page.items.length === 0) break;
    after = page.items[page.items.length - 1].seq;
  }
  // Lo que ya se tenía también pudo cambiar sin que llegara el aviso (se editó o se borró con el hilo fuera de la sala
  // o sin conexión): se relee la última página (hasta el último que se tiene) y se reemplaza por `seq`. Editar y borrar sólo se puede en los primeros
  // 15 minutos, así que lo que cambia está siempre entre los últimos mensajes.
  const caughtUp = mergeMessages(current.messages, items);
  const recent = await fetch({ beforeSeq: lastSeqOf({ messages: caughtUp }) + 1, limit: MESSAGES_PAGE });
  const latest = queryClient.getQueryData<ThreadData>(key) ?? current;
  const messages = refreshKnown(mergeMessages(latest.messages, items), recent.items);
  return { ...latest, messages, pending: dropConfirmed(latest.pending, messages) };
};

/** `known`: el hilo ya tenía ese mensaje (una versión nueva, p. ej. el adjunto ya escaneado): no es para avisar. */
export type IncomingResult = 'new' | 'known';

/**
 * Un mensaje que llegó por el socket (`chat:message`). Sólo importa si el hilo está abierto en alguna pantalla (hay
 * caché): si es el siguiente, se agrega; si ya estaba, nada; si saltea números, se pone al día por HTTP. Sirve para
 * el chat con la plataforma y para la bandeja (el mensaje se lleva a la forma común).
 */
export const applyIncomingMessage = (queryClient: QueryClient, raw: MessageDto | InboxMessage): IncomingResult => {
  const message = toChatMessage(raw);
  const key = chatKeys.thread(message.conversationId);
  const thread = queryClient.getQueryData<ThreadData>(key);
  if (!thread) {
    // La pantalla está abierta (la consulta existe) pero la primera carga no terminó: se guarda para sumarlo al
    // terminar. Si nadie lo mira, no hace falta: cuando se abra, el GET lo trae.
    if (queryClient.getQueryCache().find({ queryKey: key, exact: true })) keepEarly(queryClient, key, message);
    return 'new';
  }
  const decision = decideIncoming(thread, message.seq);
  if (decision === 'ignore') {
    // Uno viejo: nunca se agrega (si es anterior a lo cargado, lo trae «cargar anteriores»). Si el hilo lo tiene y es
    // un adjunto, es la re-emisión al terminar el escaneo: se actualiza el adjunto en su lugar, sin volver atrás; lo
    // demás queda como lo tiene quien mira (`isMine`, `canEdit`).
    if (message.attachment && thread.messages.some((m) => m.seq === message.seq)) {
      update(queryClient, key, (current) => ({
        ...current,
        messages: current.messages.map((m) =>
          m.seq === message.seq ? { ...m, attachment: keepScanned(m, message).attachment } : m,
        ),
      }));
    }
    return 'known';
  }
  if (decision === 'catch-up') {
    void queryClient.invalidateQueries({ queryKey: key });
    return 'new';
  }
  update(queryClient, key, (current) => {
    const messages = mergeMessages(current.messages, [message]);
    return { ...current, messages, pending: dropConfirmed(current.pending, messages) };
  });
  return 'new';
};

/**
 * Un mensaje editado o borrado por su autor (`chat:message-edited` / `chat:message-deleted`): se reemplaza en su lugar
 * («editado» / «Mensaje eliminado» en vivo). Si el hilo no lo tiene, no hace nada: el GET ya trae la versión nueva.
 */
export const applyMessageUpdate = (queryClient: QueryClient, raw: MessageDto | InboxMessage) => {
  const message = toChatMessage(raw);
  const key = chatKeys.thread(message.conversationId);
  if (!queryClient.getQueryData<ThreadData>(key)) return;
  update(queryClient, key, (current) => ({ ...current, messages: replaceMessage(current.messages, message) }));
};

/** La otra punta leyó hasta `lastReadSeq` (`chat:read`): el ✓✓ nunca baja. */
export const applyCounterpartRead = (queryClient: QueryClient, conversationId: string, lastReadSeq: number) => {
  const key = chatKeys.thread(conversationId);
  if (!queryClient.getQueryData<ThreadData>(key)) return;
  update(queryClient, key, (current) => ({
    ...current,
    counterpartLastReadSeq: Math.max(current.counterpartLastReadSeq, lastReadSeq),
  }));
};

/** Al reconectar: cada hilo abierto pide lo posterior a su último número. */
export const catchUpThreads = (queryClient: QueryClient) =>
  Promise.all(
    queryClient
      .getQueryCache()
      .findAll({ queryKey: chatKeys.all, predicate: (query) => query.queryKey[1] === 'thread' })
      .map((query) => catchUpThread(queryClient, query.queryKey)),
  );

/** Espera a que el hilo no tenga ninguna carga en curso (la primera página o una puesta al día). */
const settled = (queryClient: QueryClient, key: readonly unknown[]): Promise<void> =>
  new Promise((resolve) => {
    const idle = () => queryClient.isFetching({ queryKey: key, exact: true }) === 0;
    if (idle()) {
      resolve();
      return;
    }
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (!idle()) return;
      unsubscribe();
      resolve();
    });
  });

/**
 * Pone al día un hilo DESPUÉS de cualquier carga en curso: al entrar a la sala (ack de `chat:join`) o al reconectar.
 * Lo publicado entre la foto del GET y la entrada a la sala no llegó por el socket: se pide siempre lo posterior al
 * último `seq` en caché (`afterSeq`). Sin datos todavía (la primera carga falló), vuelve a pedir la última página.
 */
export const catchUpThread = async (queryClient: QueryClient, key: readonly unknown[]): Promise<void> => {
  await settled(queryClient, key);
  await queryClient.invalidateQueries({ queryKey: key, exact: true });
};

/** Al salir de la sala: lo que haya quedado en el búfer de ese hilo ya no sirve (la próxima vez se carga de nuevo). */
export const forgetEarly = (queryClient: QueryClient, conversationId: string) => {
  takeEarly(queryClient, chatKeys.thread(conversationId));
};

/** Un error de envío que se arregla reintentando (red, el servidor, el límite por minuto); un 4xx de reglas, no. */
const isRetryable = (error: unknown) => {
  const status = toApiError(error).status;
  return status === null || status >= 500 || status === 429;
};

/**
 * Un hilo de chat o de ticket: carga, historial hacia atrás, envío optimista con reintento por el mismo
 * `clientMessageId` y reconciliación por `seq` (los mensajes del socket los agrega `useSupportChatBridge`).
 */
export const useThread = (source: ThreadSource) => {
  const queryClient = useQueryClient();
  const key = keyOf(source.conversationId);
  const { fetch, send, onSent, edit } = source;
  const query = useQuery({
    queryKey: key,
    queryFn: () =>
      fetch ? loadThread(queryClient, key, fetch) : (queryClient.getQueryData<ThreadData>(key) ?? emptyThread()),
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const [olderError, setOlderError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const loadOlder = useCallback(async () => {
    const thread = queryClient.getQueryData<ThreadData>(key);
    if (!fetch || !thread?.hasMoreBefore || loadingOlder) return;
    const before = firstSeqOf(thread);
    if (before <= 1) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const page = await fetch({ beforeSeq: before, limit: MESSAGES_PAGE });
      update(queryClient, key, (current) => ({
        ...current,
        messages: mergeMessages(current.messages, page.items),
        hasMoreBefore: page.hasMore,
      }));
    } catch (error) {
      setOlderError(errorMessage(error));
    } finally {
      setLoadingOlder(false);
    }
  }, [fetch, key, loadingOlder, queryClient]);

  /**
   * Relee lo que ya se ve (desde el primer número cargado) para traer las versiones nuevas de esos mensajes: p. ej.
   * la etiqueta «→ T-000123» de los que se citaron en un ticket.
   */
  const reload = useCallback(async () => {
    const thread = queryClient.getQueryData<ThreadData>(key);
    if (!fetch || !thread || thread.messages.length === 0) return;
    const page = await fetch({ afterSeq: Math.max(0, firstSeqOf(thread) - 1), limit: MESSAGES_PAGE_MAX });
    update(queryClient, key, (current) => ({ ...current, messages: mergeMessages(current.messages, page.items) }));
  }, [fetch, key, queryClient]);

  const deliver = useCallback(
    async (pending: PendingMessage) => {
      try {
        const message = await send({
          clientMessageId: pending.clientMessageId,
          body: pending.body,
          ...(pending.visibility ? { visibility: pending.visibility } : {}),
          ...(pending.replyToSeq ? { replyToSeq: pending.replyToSeq } : {}),
          ...(pending.templateId ? { templateId: pending.templateId } : {}),
          ...(pending.mentions?.length ? { mentions: pending.mentions } : {}),
        });
        const target = chatKeys.thread(message.conversationId);
        const sameThread = message.conversationId === source.conversationId;
        const thread = queryClient.getQueryData<ThreadData>(target);
        if (sameThread && thread && decideIncoming(thread, message.seq) === 'catch-up') {
          // Faltan mensajes entre el último que se tiene y éste: se pone al día y ahí sale de pendientes.
          await queryClient.refetchQueries({ queryKey: target });
        } else {
          update(queryClient, target, (current) => {
            const messages = mergeMessages(current.messages, [message]);
            return {
              ...current,
              messages,
              hasMoreBefore: current.messages.length === 0 ? message.seq > 1 : current.hasMoreBefore,
              pending: dropConfirmed(current.pending, messages),
            };
          });
        }
        // Si el envío abrió otra conversación (primer mensaje o chat cerrado), la pantalla pasa a ella ya, con el
        // mensaje en su caché, antes de sacar el pendiente de la que se ve: no depende de releer nada.
        if (!sameThread) onSent?.(message);
        update(queryClient, key, (current) => ({
          ...current,
          pending: current.pending.filter((p) => p.clientMessageId !== pending.clientMessageId),
        }));
      } catch (error) {
        update(queryClient, key, (current) => ({
          ...current,
          pending: current.pending.map((p) =>
            p.clientMessageId === pending.clientMessageId
              ? { ...p, status: 'failed', error: errorMessage(error), retryable: isRetryable(error) }
              : p,
          ),
        }));
      }
    },
    [key, onSent, queryClient, send, source.conversationId],
  );

  /** Escribe: la burbuja aparece al instante como «enviando» y el compositor se puede limpiar sin perder el texto. */
  const sendMessage = useCallback(
    (body: string, extras: SendExtras = {}) => {
      const pending: PendingMessage = {
        clientMessageId: newUuid(),
        body,
        status: 'sending',
        visibility: extras.visibility,
        replyToSeq: extras.replyToSeq,
        templateId: extras.templateId,
        mentions: extras.mentions,
        mentionTokens: extras.mentionTokens,
        createdAt: new Date().toISOString(),
      };
      update(queryClient, key, (current) => ({ ...current, pending: [...current.pending, pending] }));
      void deliver(pending);
    },
    [deliver, key, queryClient],
  );

  /** Reintenta un envío fallido con el MISMO `clientMessageId`: si la API ya lo tenía, lo devuelve sin duplicar. */
  const retry = useCallback(
    (clientMessageId: string) => {
      const thread = queryClient.getQueryData<ThreadData>(key);
      const pending = thread?.pending.find((p) => p.clientMessageId === clientMessageId);
      if (!pending) return;
      const again: PendingMessage = { ...pending, status: 'sending', error: undefined };
      update(queryClient, key, (current) => ({
        ...current,
        pending: current.pending.map((p) => (p.clientMessageId === clientMessageId ? again : p)),
      }));
      void deliver(again);
    },
    [deliver, key, queryClient],
  );

  /** Descarta un envío fallido (el texto vuelve al compositor si quien llama lo pide). */
  const discard = useCallback(
    (clientMessageId: string) =>
      update(queryClient, key, (current) => ({
        ...current,
        pending: current.pending.filter((p) => p.clientMessageId !== clientMessageId),
      })),
    [key, queryClient],
  );

  /**
   * Edita un mensaje propio y deja la versión de la API en su lugar (con su `canEdit`). Si la API lo rechaza (pasaron
   * los 15 minutos, se cerró la conversación), el error sube a quien llama y el hilo queda como estaba.
   */
  const editMessage = useMemo(
    () =>
      edit
        ? async (messageId: string, body: string) => {
            const message = await edit(messageId, body);
            update(queryClient, chatKeys.thread(message.conversationId), (current) => ({
              ...current,
              messages: replaceMessage(current.messages, message, 'api'),
            }));
            return message;
          }
        : undefined,
    [edit, queryClient],
  );

  /**
   * Sube un adjunto como mensaje. No es optimista: quien llama muestra el avance y el error (413/415/429 con el texto
   * de la API) y reintenta con el MISMO `clientMessageId` (la API devuelve el ya guardado sin volver a subir). Lo
   * confirmado entra al hilo por `seq`, igual que un texto.
   */
  const upload = source.attachments?.upload;
  const attach = useMemo(
    () =>
      upload
        ? async (input: ChatAttachmentInput, onProgress?: OnUploadProgress) => {
            const message = await upload(input, onProgress);
            const target = chatKeys.thread(message.conversationId);
            const thread = queryClient.getQueryData<ThreadData>(target);
            if (thread && decideIncoming(thread, message.seq) === 'catch-up') {
              await queryClient.refetchQueries({ queryKey: target });
            } else {
              update(queryClient, target, (current) => ({
                ...current,
                // La respuesta trae el adjunto como se guardó: si el socket ya trajo el resultado del escaneo, queda ése.
                messages: mergeMessages(current.messages, [
                  keepScanned(
                    current.messages.find((m) => m.seq === message.seq),
                    message,
                  ),
                ]),
                hasMoreBefore: current.messages.length === 0 ? message.seq > 1 : current.hasMoreBefore,
              }));
            }
            return message;
          }
        : undefined,
    [queryClient, upload],
  );

  return {
    attach,
    thread: query.data,
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch,
    loadOlder,
    loadingOlder,
    olderError,
    reload,
    send: sendMessage,
    edit: editMessage,
    retry,
    discard,
  };
};
