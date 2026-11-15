import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ErrorState } from '../../../common/components/ui';
import { useSocketContext } from '../../../context/useSocketContext';
import type { ChatSide } from '../../../services/queries/supportChat';
import { chatKeys } from '../../../services/queries/supportChat';
import { useThread, type ThreadSource } from '../../../services/queries/chatThread';
import type { MessageTemplate } from '../../../services/api/types';
import { lastSeqOf, type PendingMessage } from '../thread';
import { useTyping } from '../typing';
import { useConversationRoom } from '../useConversationRoom';
import { Composer } from './Composer';
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
  quickReplies?: MessageTemplate[];
  empty: ReactNode;
  /** Cambia cuando hay que releer lo que se ve (p. ej. se abrió un ticket que cita mensajes). */
  reloadKey?: string | number;
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
  quickReplies,
  empty,
  reloadKey,
}: ChatThreadProps) => {
  const { conversationId } = source;
  const { thread, isPending, error, refetch, loadOlder, loadingOlder, olderError, send, retry, discard, reload } =
    useThread(source);
  useConversationRoom(conversationId);
  const { emit } = useSocketContext();
  const queryClient = useQueryClient();
  const typing = useTyping(conversationId);
  const visible = useVisible();
  const [atBottom, setAtBottom] = useState(true);
  const [draft, setDraft] = useState<{ text: string; nonce: number } | null>(null);
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
  }, [conversationId]);

  const firstReload = useRef(true);
  useEffect(() => {
    if (firstReload.current) {
      firstReload.current = false;
      return;
    }
    void reloadRef.current();
  }, [reloadKey]);

  const onTyping = useCallback(() => {
    if (conversationId) emit('chat:typing', { conversationId });
  }, [conversationId, emit]);

  const onDiscard = useCallback(
    (pending: PendingMessage) => {
      discard(pending.clientMessageId);
      setDraft({ text: pending.body, nonce: Date.now() });
    },
    [discard],
  );

  if (isPending && !thread) return <ThreadSkeleton />;
  if (error && !thread) {
    return <ErrorState error={error} resource="Los mensajes" onRetry={() => void refetch()} />;
  }
  if (!thread) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList
        thread={thread}
        ctx={{ ...ctx, counterpartLastReadSeq: Math.max(counterpartLastReadSeq, thread.counterpartLastReadSeq) }}
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
          draftKey={conversationId ?? `${side}:new`}
          onSend={send}
          onTyping={conversationId ? onTyping : undefined}
          quickReplies={quickReplies}
          allowInternal={allowInternal}
          draft={draft}
        />
      ) : (
        readOnlyNotice
      )}
    </div>
  );
};
