import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ErrorState } from '../../../common/components/ui';
import { useSocketContext } from '../../../context/useSocketContext';
import type { ChatSide } from '../../../services/queries/supportChat';
import { chatKeys } from '../../../services/queries/supportChat';
import { useThread, type ThreadSource } from '../../../services/queries/chatThread';
import type { SendExtras } from '../../../services/queries/chatThread';
import { errorMessage, toApiError } from '../../../services/api/errors';
import { notify } from '../../../utils/notifications';
import {
  readDraft,
  readNoteDraft,
  withRescuedText,
  writeDraft,
  writeNoteDraft,
  type MentionToken,
} from '../composerDraft';
import { lastCounterpartSeq, lastSeqOf, type ChatMessage, type PendingMessage } from '../thread';
import { useTyping } from '../typing';
import { useConversationRoom } from '../useConversationRoom';
import { AttachButton } from './AttachButton';
import { Composer, type ComposerBanner, type MentionSource, type QuickReply } from './Composer';
import { MessageList } from './MessageList';
import { ThreadSkeleton } from './ThreadSkeleton';
import type { MessageContext } from './MessageItem';

/** Se marca leído después de esto con el hilo al fondo y la pestaña a la vista (P5). */
export const READ_DELAY_MS = 2000;

export interface ChatThreadProps {
  side: ChatSide;
  source: ThreadSource;
  /** Marca leído hasta un número (`POST …/read`). */
  read?: (seq: number) => Promise<void>;
  /** El «leído» de la otra punta que trajo la API (el socket lo sube después). */
  counterpartLastReadSeq?: number;
  /** Quién es la otra punta, para «… está escribiendo». */
  counterpartName: string;
  ctx: Omit<MessageContext, 'counterpartLastReadSeq'>;
  /** Puede escribir (ya evaluado: permiso y estado). Si no, en lugar del compositor va `readOnlyNotice`. */
  canWrite: boolean;
  readOnlyNotice?: ReactNode;
  allowInternal?: boolean;
  /** A quiénes se puede mencionar en una nota interna (bandeja). */
  mentionSource?: MentionSource;
  /** Avisa al pasar entre mensaje y nota interna. */
  onNoteModeChange?: (internal: boolean) => void;
  quickReplies?: QuickReply[];
  /** «Responder» (citar) un mensaje (bandeja, D-C25). */
  allowReply?: boolean;
  /** Valores de las variables de las respuestas guardadas (ver `Composer`). */
  variables?: Readonly<Record<string, string | null>>;
  empty: ReactNode;
  /** Cambia cuando hay que releer lo que se ve (p. ej. se abrió un ticket que cita mensajes). */
  reloadKey?: string | number;
  /**
   * Sugerencias de respuesta arriba del compositor (bandeja). Recibe el número del último mensaje del cliente o del
   * chofer (cambia cuando escribe otro) y `pick`, que pega un texto en el compositor para editarlo: nunca lo envía.
   */
  renderSuggestions?: (args: { lastCounterpartSeq: number; pick: (text: string) => void }) => ReactNode;
}

const useVisible = () => {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
};

/** Un hilo completo (chat o ticket): sala propia, mensajes, «escribiendo…», leído y compositor. */
export const ChatThread = ({
  side,
  source,
  read,
  counterpartLastReadSeq = 0,
  counterpartName,
  ctx,
  canWrite,
  readOnlyNotice,
  allowInternal,
  mentionSource,
  onNoteModeChange,
  quickReplies,
  empty,
  reloadKey,
  allowReply = false,
  variables,
  renderSuggestions,
}: ChatThreadProps) => {
  const { conversationId } = source;
  const draftKey = conversationId ?? `${side}:new`;
  const {
    thread,
    isPending,
    error,
    refetch,
    loadOlder,
    loadingOlder,
    olderError,
    send,
    edit,
    retry,
    discard,
    reload,
    attach,
  } = useThread(source);
  // A qué mensaje se responde y cuál se edita, por `seq`: se muestran como están ahora en el hilo (si se borra
  // mientras tanto, «Mensaje eliminado»).
  const [replySeq, setReplySeq] = useState<number | null>(null);
  const [editingSeq, setEditingSeq] = useState<number | null>(null);
  const [editText, setEditText] = useState<{ text: string; nonce: number } | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const replyTo = replySeq === null ? null : (thread?.messages.find((m) => m.seq === replySeq) ?? null);
  const editing = editingSeq === null ? null : (thread?.messages.find((m) => m.seq === editingSeq) ?? null);
  useConversationRoom(conversationId);
  const { emit } = useSocketContext();
  const queryClient = useQueryClient();
  const typing = useTyping(conversationId);
  const visible = useVisible();
  const [atBottom, setAtBottom] = useState(true);
  // Lo que vuelve al compositor lleva su modo: una nota vuelve al borrador de las notas, nunca al del cliente.
  const [draft, setDraft] = useState<{
    text: string;
    nonce: number;
    internal?: boolean;
    mentions?: MentionToken[];
  } | null>(null);
  // El texto de una edición que la API rechazó: lo suma el compositor al borrador de su modo (`Composer.rescue`).
  const [rescue, setRescue] = useState<{ text: string; nonce: number; internal?: boolean } | null>(null);
  // La respuesta de una edición llega tarde: puede que ya se esté editando otro mensaje o que el hilo ya no esté.
  const editingSeqRef = useRef(editingSeq);
  editingSeqRef.current = editingSeq;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const readSent = useRef(0);
  const lastSeq = thread ? lastSeqOf(thread) : 0;
  // Las pantallas arman `read` y `reload` en cada render: los efectos usan la última sin volver a correr por eso.
  const readRef = useRef(read);
  readRef.current = read;
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  // Leído: con el hilo al fondo y la pestaña visible, 2 s después del último mensaje. Nunca baja ni se repite.
  useEffect(() => {
    if (!readRef.current || !atBottom || !visible || lastSeq <= readSent.current) return;
    const timer = window.setTimeout(() => {
      const markRead = readRef.current;
      if (!markRead) return;
      readSent.current = lastSeq;
      markRead(lastSeq)
        .then(() => queryClient.invalidateQueries({ queryKey: chatKeys.summary(side) }))
        .catch(() => {
          readSent.current = 0;
        });
    }, READ_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [atBottom, lastSeq, queryClient, side, visible, conversationId]);

  useEffect(() => {
    readSent.current = 0;
    setReplySeq(null);
    setEditingSeq(null);
  }, [conversationId]);

  // El mensaje que se estaba editando se borró (o desapareció): se sale de la edición con aviso.
  const editingGone = editingSeq !== null && thread !== undefined && (!editing || Boolean(editing.deleted));
  useEffect(() => {
    if (!editingGone) return;
    setEditingSeq(null);
    notify.warn('El mensaje que editabas ya no se puede editar');
  }, [editingGone]);

  const onReply = useCallback((message: ChatMessage) => {
    setEditingSeq(null);
    setReplySeq(message.seq);
    setFocusKey(Date.now());
  }, []);

  const onEdit = useCallback((message: ChatMessage) => {
    setReplySeq(null);
    setEditingSeq(message.seq);
    setEditText({ text: message.body ?? '', nonce: Date.now() });
    setFocusKey(Date.now());
  }, []);

  const cancelBanner = useCallback(() => {
    setEditingSeq(null);
    setReplySeq(null);
  }, []);

  const onSend = useCallback(
    (body: string, extras?: SendExtras) => {
      if (editing && edit) {
        const target = editing;
        if (body === (target.body ?? '').trim()) {
          setEditingSeq(null);
          return;
        }
        edit(target.id, body)
          .then(() => setEditingSeq((seq) => (seq === target.seq ? null : seq)))
          .catch((cause: unknown) => {
            const { status } = toApiError(cause);
            if (status !== null && status < 500 && status !== 429) {
              // La API no lo acepta (pasaron los 15 minutos, ya lo citaron, quedó en un reclamo o un ticket, la
              // conversación es por un pedido o se cerró): reintentar no sirve. Se sale de esa edición, el mensaje queda
              // como estaba y lo escrito pasa al borrador de la conversación para mandarlo como mensaje nuevo: al
              // compositor si está a la vista, guardado si se está editando otro mensaje o ya se salió del hilo. Se
              // relee el hilo para que «Editar» deje de ofrecerse (la API ya no da `canEdit`).
              const reason = errorMessage(cause).replace(/\.$/, '');
              // Una nota rechazada vuelve al borrador de las notas: nunca al mensaje al cliente.
              const note = target.visibility === 'internal';
              const mounted = mountedRef.current;
              const editingOther = mounted && editingSeqRef.current !== null && editingSeqRef.current !== target.seq;
              if (mounted) {
                setEditingSeq((seq) => (seq === target.seq ? null : seq));
                setRescue({ text: body, nonce: Date.now(), internal: note });
                void reloadRef.current();
              } else {
                if (note) {
                  const saved = readNoteDraft(draftKey);
                  writeNoteDraft(draftKey, { text: withRescuedText(saved.text, body), mentions: saved.mentions });
                } else {
                  writeDraft(draftKey, withRescuedText(readDraft(draftKey), body));
                }
              }
              const where = note
                ? !mounted
                  ? 'tu texto quedó como borrador de nota de esa conversación.'
                  : editingOther
                    ? 'tu texto quedó como borrador de nota: vuelve cuando termines de editar.'
                    : 'tu texto quedó en el cuadro de la nota interna para enviarlo.'
                : !mounted
                  ? 'tu texto quedó como borrador de esa conversación.'
                  : editingOther
                    ? 'tu texto quedó como borrador: vuelve al cuadro cuando termines de editar.'
                    : 'tu texto quedó en el cuadro para enviarlo.';
              notify.warn(`${reason}. No se guardó la edición: ${where}`);
              return;
            }
            notify.error(cause);
            // Un corte: lo escrito no se pierde, vuelve al compositor para reintentar.
            setEditText({ text: body, nonce: Date.now() });
          });
        return;
      }
      // Una nota interna no cita mensajes (el back no lo admite): la respuesta en curso sigue para el próximo mensaje.
      if (extras?.visibility === 'internal') {
        send(body, extras);
        return;
      }
      send(body, { ...extras, ...(replyTo ? { replyToSeq: replyTo.seq } : {}) });
      setReplySeq(null);
    },
    [draftKey, edit, editing, replyTo, send],
  );

  const firstReload = useRef(true);
  useEffect(() => {
    if (firstReload.current) {
      firstReload.current = false;
      return;
    }
    void reloadRef.current();
  }, [reloadKey]);

  // Escribiendo una nota va siempre con la marca `internal`: el back no se lo avisa al cliente ni al chofer.
  const onTyping = useCallback(
    (internal: boolean) => {
      if (conversationId) emit('chat:typing', internal ? { conversationId, internal: true } : { conversationId });
    },
    [conversationId, emit],
  );

  const onDiscard = useCallback(
    (pending: PendingMessage) => {
      discard(pending.clientMessageId);
      const internal = pending.visibility === 'internal';
      setDraft({
        text: pending.body,
        nonce: Date.now(),
        ...(internal ? { internal, mentions: pending.mentionTokens ?? [] } : {}),
      });
    },
    [discard],
  );

  // Una sugerencia elegida se suma donde está el cursor: no pisa lo que ya se escribió.
  const [insert, setInsert] = useState<{ text: string; nonce: number } | null>(null);
  const pickSuggestion = useCallback((text: string) => setInsert({ text, nonce: Date.now() }), []);

  const partyName = ctx.partyName;
  const banner: ComposerBanner | null = editing
    ? editing.visibility === 'internal'
      ? { kind: 'edit', title: 'Editando tu nota interna', preview: editing.body ?? '', internal: true }
      : { kind: 'edit', title: 'Editando tu mensaje', preview: editing.body ?? '' }
    : replyTo
      ? {
          kind: 'reply',
          title: `Respondés a ${partyName?.(replyTo.party) ?? 'este mensaje'}`,
          preview: replyTo.deleted ? 'Mensaje eliminado' : (replyTo.body ?? 'Mensaje no disponible'),
        }
      : null;

  if (isPending && !thread) return <ThreadSkeleton />;
  if (error && !thread) {
    return <ErrorState error={error} resource="Los mensajes" onRetry={() => void refetch()} />;
  }
  if (!thread) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList
        thread={thread}
        ctx={{
          ...ctx,
          counterpartLastReadSeq: Math.max(counterpartLastReadSeq, thread.counterpartLastReadSeq),
          onReply: canWrite && allowReply ? onReply : undefined,
          onEdit: canWrite && edit ? onEdit : undefined,
          attachmentLink: source.attachments?.link,
        }}
        loadOlder={() => void loadOlder()}
        loadingOlder={loadingOlder}
        olderError={olderError}
        onRetry={retry}
        onDiscard={onDiscard}
        typingLabel={typing ? `${counterpartName} está escribiendo…` : null}
        onAtBottomChange={setAtBottom}
        empty={empty}
      />
      {canWrite ? (
        <Composer
          draftKey={draftKey}
          onSend={onSend}
          onTyping={conversationId ? onTyping : undefined}
          quickReplies={quickReplies}
          allowInternal={allowInternal}
          mentionSource={mentionSource}
          onNoteModeChange={onNoteModeChange}
          draft={draft}
          insert={insert}
          banner={banner}
          onCancelBanner={cancelBanner}
          focusKey={focusKey}
          editText={editText}
          rescue={rescue}
          variables={variables}
          attach={
            attach && source.attachments ? (
              <AttachButton channel={source.attachments.channel} onUpload={attach} />
            ) : undefined
          }
          suggestions={renderSuggestions?.({
            lastCounterpartSeq: lastCounterpartSeq(thread.messages),
            pick: pickSuggestion,
          })}
        />
      ) : (
        readOnlyNotice
      )}
    </div>
  );
};
