import { ArrowDown } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../common/components/ui';
import { argentinaDay } from '../../../utils/format';
import { dayLabel, dayOf, sameGroup } from '../messageText';
import { firstSeqOf, lastSeqOf, type PendingMessage, type ThreadData } from '../thread';
import { MessageItem, type MessageContext } from './MessageItem';
import { PendingItem } from './PendingItem';

interface Props {
  thread: ThreadData;
  ctx: MessageContext;
  loadOlder: () => void;
  loadingOlder: boolean;
  olderError: string | null;
  onRetry: (clientMessageId: string) => void;
  onDiscard: (pending: PendingMessage) => void;
  /** «Gas Norte está escribiendo…». */
  typingLabel: string | null;
  onAtBottomChange: (atBottom: boolean) => void;
  empty: ReactNode;
}

/** A cuántos píxeles del borde se considera «al fondo» o «arriba de todo». */
const EDGE_PX = 80;

const dayKeys = () => {
  const now = new Date();
  return { today: argentinaDay(now), yesterday: argentinaDay(new Date(now.getTime() - 86_400_000)) };
};

/**
 * El hilo con scroll propio: separador por día, grupos por autor y minuto, historial hacia atrás conservando la
 * posición y, si quien lee está más arriba, «N nuevos» para bajar en vez de arrastrarlo al final.
 */
export const MessageList = ({
  thread,
  ctx,
  loadOlder,
  loadingOlder,
  olderError,
  onRetry,
  onDiscard,
  typingLabel,
  onAtBottomChange,
  empty,
}: Props) => {
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const fromBottom = useRef<number | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const firstSeq = firstSeqOf(thread);
  const lastSeq = lastSeqOf(thread);
  const previous = useRef({ firstSeq, lastSeq, pending: thread.pending.length });

  const scrollToBottom = () => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
    setUnseen(0);
    setShowJump(false);
  };

  // Después de dibujar: si se cargó historial arriba, queda donde estaba; si llegó algo abajo, baja sólo si ya estaba
  // al fondo (o si lo escribió quien mira).
  useLayoutEffect(() => {
    const el = scroller.current;
    const before = previous.current;
    previous.current = { firstSeq, lastSeq, pending: thread.pending.length };
    if (!el) return;
    if (firstSeq < before.firstSeq && fromBottom.current !== null) {
      el.scrollTop = el.scrollHeight - fromBottom.current;
      fromBottom.current = null;
      return;
    }
    const wroteNow = thread.pending.length > before.pending;
    if (before.lastSeq === 0 || atBottom.current || wroteNow) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (lastSeq > before.lastSeq) {
      const added = thread.messages.filter((m) => m.seq > before.lastSeq && !m.isMine).length;
      if (added > 0) setUnseen((n) => n + added);
    }
  }, [firstSeq, lastSeq, thread.messages, thread.pending.length]);

  useEffect(() => onAtBottomChange(atBottom.current), [onAtBottomChange]);

  const requestOlder = () => {
    const el = scroller.current;
    if (el) fromBottom.current = el.scrollHeight - el.scrollTop;
    loadOlder();
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < EDGE_PX;
    if (bottom !== atBottom.current) {
      atBottom.current = bottom;
      onAtBottomChange(bottom);
    }
    setShowJump(!bottom);
    if (bottom) setUnseen(0);
    if (el.scrollTop < EDGE_PX && thread.hasMoreBefore && !loadingOlder && !olderError) requestOlder();
  };

  const { today, yesterday } = dayKeys();
  const nothing = thread.messages.length === 0 && thread.pending.length === 0;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="h-full overflow-y-auto overscroll-contain py-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Mensajes"
      >
        {thread.hasMoreBefore && (
          <div className="flex justify-center py-2">
            {olderError ? (
              <p role="alert" className="text-xs text-danger">
                No se pudieron cargar los anteriores: {olderError}{' '}
                <button type="button" className="font-semibold underline" onClick={requestOlder}>
                  Reintentar
                </button>
              </p>
            ) : (
              <Button size="sm" variant="ghost" loading={loadingOlder} onClick={requestOlder}>
                Ver mensajes anteriores
              </Button>
            )}
          </div>
        )}
        {nothing ? (
          empty
        ) : (
          <ol className="grid">
            {thread.messages.map((message, index) => {
              const prev = thread.messages[index - 1];
              const day = dayOf(message.createdAt);
              const newDay = !prev || dayOf(prev.createdAt) !== day;
              return (
                <Fragment key={message.id}>
                  {newDay && (
                    <li className="my-3 flex items-center gap-3 px-4" aria-label={dayLabel(day, today, yesterday)}>
                      <span className="h-px flex-1 bg-outline" />
                      <span className="text-[11px] font-medium text-muted">{dayLabel(day, today, yesterday)}</span>
                      <span className="h-px flex-1 bg-outline" />
                    </li>
                  )}
                  <MessageItem message={message} first={newDay || !prev || !sameGroup(prev, message)} ctx={ctx} />
                </Fragment>
              );
            })}
            {thread.pending.map((pending) => (
              <PendingItem key={pending.clientMessageId} pending={pending} onRetry={onRetry} onDiscard={onDiscard} />
            ))}
          </ol>
        )}
        {typingLabel && (
          <p className="px-4 pt-2 text-xs italic text-muted" role="status">
            {typingLabel}
          </p>
        )}
      </div>
      {showJump && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-3 right-4 inline-flex items-center gap-1.5 rounded-full border border-outline bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-control"
        >
          <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
          {unseen > 0 ? `${unseen} ${unseen === 1 ? 'nuevo' : 'nuevos'}` : 'Ir al final'}
        </button>
      )}
    </div>
  );
};
