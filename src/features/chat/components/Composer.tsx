import { Lock, SendHorizontal } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '../../../common/components/ui';
import { MESSAGE_MAX } from '../../../services/api/supportChat';
import type { MessageTemplate } from '../../../services/api/types';

/** Un «escribiendo…» cada 3 segundos como mucho (el servidor descarta los que vengan antes). */
export const TYPING_EVERY_MS = 3000;
/** Alto máximo del compositor antes de pasar a scroll. */
const MAX_HEIGHT_PX = 160;

/** Lo escrito y no enviado se guarda por conversación en la pestaña (sobrevive a un corte, a cambiar de pantalla o a recargar). */
const DRAFT_PREFIX = 'chatDraft:';

const readDraft = (key: string | undefined): string => {
  if (!key) return '';
  try {
    return sessionStorage.getItem(DRAFT_PREFIX + key) ?? '';
  } catch {
    return '';
  }
};

const writeDraft = (key: string | undefined, text: string) => {
  if (!key) return;
  try {
    if (text) sessionStorage.setItem(DRAFT_PREFIX + key, text);
    else sessionStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    // sin sessionStorage el borrador vive mientras el compositor está a la vista
  }
};

interface Props {
  /** Dónde se guarda el borrador (la conversación). */
  draftKey?: string;
  onSend: (body: string, visibility?: 'all' | 'internal') => void;
  /** Avisa que se está escribiendo (ya con tope). */
  onTyping?: () => void;
  placeholder?: string;
  /** Respuestas rápidas de la plataforma: `/` las abre. */
  quickReplies?: MessageTemplate[];
  /** Selector «Responder / Nota interna» (sólo en un ticket, del lado de la plataforma). */
  allowInternal?: boolean;
  /** Texto a cargar en el compositor (p. ej. lo de un envío descartado). */
  draft?: { text: string; nonce: number } | null;
}

/**
 * El compositor: Enter envía, Shift+Enter hace un salto de línea, crece con el texto y cuenta hasta 2000. No se
 * envía vacío. El texto sale del compositor recién cuando está en el hilo como «enviando» (nunca se pierde).
 */
export const Composer = ({ draftKey, onSend, onTyping, placeholder, quickReplies, allowInternal, draft }: Props) => {
  const [text, setTextState] = useState(() => readDraft(draftKey));
  const setText = (value: string) => {
    setTextState(value);
    writeDraft(draftKey, value);
  };
  const [internal, setInternal] = useState(false);
  const [picker, setPicker] = useState(false);
  const [active, setActive] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const countId = useId();
  const listId = useId();
  const optionId = (index: number) => `${listId}-op-${index}`;
  const lastTyping = useRef(0);
  const trimmed = text.trim();
  const tooLong = text.length > MESSAGE_MAX;
  const canSend = trimmed.length > 0 && !tooLong;

  useEffect(() => {
    if (draft) {
      setTextState(draft.text);
      writeDraft(draftKey, draft.text);
    }
  }, [draft, draftKey]);

  useEffect(() => setTextState(readDraft(draftKey)), [draftKey]);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [text]);

  const submit = () => {
    if (!canSend) return;
    onSend(trimmed, allowInternal ? (internal ? 'internal' : 'all') : undefined);
    setText('');
    setPicker(false);
  };

  const choose = (template: MessageTemplate) => {
    setText(template.body);
    setPicker(false);
    area.current?.focus();
  };

  /**
   * Con las respuestas rápidas abiertas, las flechas mueven la opción activa, Enter o Tab la eligen y Esc cierra;
   * Enter nunca envía mientras la lista está abierta. Cerrada: Enter envía, Shift+Enter hace otra línea.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (picker) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (options.length > 0) {
          const step = event.key === 'ArrowDown' ? 1 : -1;
          setActive((current) => (current + step + options.length) % options.length);
        }
        return;
      }
      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        if (event.nativeEvent.isComposing) return;
        event.preventDefault();
        const template = options[active];
        if (template) choose(template);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setPicker(false);
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const onChange = (value: string) => {
    setText(value);
    setPicker(Boolean(quickReplies?.length) && value.startsWith('/'));
    setActive(0);
    const now = Date.now();
    if (onTyping && value.trim() && now - lastTyping.current >= TYPING_EVERY_MS) {
      lastTyping.current = now;
      onTyping();
    }
  };

  const filter = text.startsWith('/') ? text.slice(1).toLowerCase() : '';
  const options = (quickReplies ?? []).filter(
    (t) => t.active && (t.title.toLowerCase().includes(filter) || t.key.toLowerCase().includes(filter)),
  );

  return (
    <div className="relative border-t border-outline bg-surface p-2.5">
      {picker && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Respuestas rápidas"
          className="absolute bottom-full left-2 right-2 mb-1 max-h-56 overflow-y-auto rounded-xl border border-outline bg-surface p-1 shadow-control"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">Ninguna respuesta rápida coincide</li>
          ) : (
            options.map((template, index) => (
              <li
                key={template.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                // El foco queda en el compositor: el clic elige sin sacárselo.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(template);
                }}
                onMouseEnter={() => setActive(index)}
                className={cx(
                  'grid cursor-pointer gap-0.5 rounded-lg px-3 py-2',
                  index === active ? 'bg-primary-soft' : 'hover:bg-surface-hover',
                )}
              >
                <span className="text-sm font-medium text-ink">{template.title}</span>
                <span className="line-clamp-1 text-xs text-muted">{template.body}</span>
              </li>
            ))
          )}
        </ul>
      )}
      {allowInternal && (
        <div className="mb-2 inline-flex rounded-lg border border-outline p-0.5 text-xs" role="group" aria-label="Tipo">
          <button
            type="button"
            aria-pressed={!internal}
            onClick={() => setInternal(false)}
            className={cx('rounded-md px-2.5 py-1', !internal ? 'bg-primary text-on-primary' : 'text-ink-2')}
          >
            Responder
          </button>
          <button
            type="button"
            aria-pressed={internal}
            onClick={() => setInternal(true)}
            className={cx(
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1',
              internal ? 'bg-warn-soft text-ink' : 'text-ink-2',
            )}
          >
            <Lock aria-hidden="true" className="h-3 w-3" />
            Nota interna
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={area}
          value={text}
          rows={1}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Mensaje"
          aria-describedby={countId}
          aria-controls={picker ? listId : undefined}
          aria-activedescendant={picker && options.length > 0 ? optionId(active) : undefined}
          placeholder={placeholder ?? 'Escribí un mensaje'}
          className={cx(
            'min-h-[40px] flex-1 resize-none rounded-xl border bg-bg px-3 py-2 text-sm text-ink placeholder:text-faint',
            'focus:outline-none focus:ring-2 focus:ring-primary/40',
            internal ? 'border-warn/50' : 'border-outline',
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label={internal ? 'Guardar nota interna' : 'Enviar'}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary transition-opacity disabled:opacity-40"
        >
          <SendHorizontal aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <p
        id={countId}
        className={cx('mt-1 flex justify-between px-1 text-[11px]', tooLong ? 'text-danger' : 'text-faint')}
      >
        <span className="hidden sm:inline">
          Enter envía · Shift+Enter, otra línea{quickReplies ? ' · / respuestas' : ''}
        </span>
        <span>
          {text.length}/{MESSAGE_MAX}
        </span>
      </p>
    </div>
  );
};
