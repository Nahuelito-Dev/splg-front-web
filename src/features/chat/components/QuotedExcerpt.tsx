import { ChevronDown, Quote } from 'lucide-react';
import { useState } from 'react';
import { cx } from '../../../common/components/ui';
import type { MessageDto } from '../../../services/api/types';
import { formatDateTime, formatTime } from '../../../utils/format';
import { quotedOf } from '../messageText';
import { MessageText } from './MessageText';

const PARTY_LABEL: Record<MessageDto['party'], string> = {
  company: 'Empresa',
  platform: 'Soporte',
  customer: 'Cliente',
  driver: 'Chofer',
  system: 'Sistema',
};

/** La cita de mensajes del chat con que arranca (o que se sumó a) un ticket: una copia, plegable. */
export const QuotedExcerpt = ({ message }: { message: MessageDto }) => {
  const [open, setOpen] = useState(false);
  const quoted = quotedOf(message);
  const first = quoted.items[0];
  return (
    <div className="rounded-xl border border-outline bg-surface-sunken text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink-2"
      >
        <Quote aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
        <span className="flex-1">
          Del chat: {quoted.items.length} {quoted.items.length === 1 ? 'mensaje' : 'mensajes'}
          {first && ` desde el ${formatDateTime(first.at)}`}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cx('h-4 w-4 shrink-0 transition-transform', open ? 'rotate-180' : '')}
        />
      </button>
      {open && (
        <ol className="grid gap-2 border-t border-outline px-3 py-2">
          {quoted.items.map((item) => (
            <li key={item.seq} className="border-l-2 border-outline pl-2">
              <span className="text-[11px] text-muted">
                {PARTY_LABEL[item.party]} · {formatTime(item.at)}
              </span>
              <p className="text-ink">
                {item.body === null ? <em>Mensaje no disponible</em> : <MessageText body={item.body} />}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
