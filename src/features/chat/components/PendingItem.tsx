import { AlertCircle, Clock, Lock } from 'lucide-react';
import { cx } from '../../../common/components/ui';
import type { PendingMessage } from '../thread';
import { MessageText } from './MessageText';

interface Props {
  pending: PendingMessage;
  onRetry: (clientMessageId: string) => void;
  onDiscard: (pending: PendingMessage) => void;
}

/** Lo escrito que la API todavía no confirmó: «Enviando…» o «No se envió · Reintentar» (con el mismo id). */
export const PendingItem = ({ pending, onRetry, onDiscard }: Props) => {
  const failed = pending.status === 'failed';
  const internal = pending.visibility === 'internal';
  return (
    <li className="mt-0.5 flex flex-row-reverse items-end gap-2 px-2">
      <div className="flex max-w-[85%] flex-col items-end sm:max-w-[70%]">
        <div
          className={cx(
            'rounded-2xl px-3 py-2 text-sm',
            internal ? 'border border-warn/40 bg-warn-soft text-ink' : 'bg-primary text-on-primary',
            failed ? 'opacity-70' : 'opacity-80',
          )}
        >
          {internal && <Lock aria-label="Nota interna" className="mb-1 h-3 w-3" />}
          <MessageText body={pending.body} onPrimary={!internal} />
          {!failed && (
            <span className="mt-1 flex items-center justify-end gap-1 text-[10.5px]" role="status">
              <Clock aria-hidden="true" className="h-3 w-3" />
              Enviando…
            </span>
          )}
        </div>
        {failed && (
          <div role="alert" className="mt-1 flex flex-wrap items-center justify-end gap-x-2 text-xs text-danger">
            <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
            <span>No se envió{pending.error ? `: ${pending.error}` : ''}</span>
            {pending.retryable !== false && (
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => onRetry(pending.clientMessageId)}
              >
                Reintentar
              </button>
            )}
            <button type="button" className="underline" onClick={() => onDiscard(pending)}>
              Descartar
            </button>
          </div>
        )}
      </div>
    </li>
  );
};
