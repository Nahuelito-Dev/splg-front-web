import { Check, CornerUpLeft, Lock, PencilLine, SendHorizontal, X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../../../common/components/ui';
import { MESSAGE_MAX } from '../../../services/api/supportChat';
import type { MessageTemplate } from '../../../services/api/types';
import type { SendExtras } from '../../../services/queries/chatThread';
import { readDraft, withRescuedText, writeDraft } from '../composerDraft';
import { insertAt } from '../insertText';
import { fillVariables } from '../variables';

/** Un «escribiendo…» cada 3 segundos como mucho (el servidor descarta los que vengan antes). */
export const TYPING_EVERY_MS = 3000;
/** Alto máximo del compositor antes de pasar a scroll. */
const MAX_HEIGHT_PX = 160;

/** Una respuesta rápida: de la plataforma o guardada por la empresa (`/` las abre). */
export type QuickReply = Pick<MessageTemplate, 'id' | 'key' | 'title' | 'body' | 'active'>;

/** Arriba del compositor: a qué mensaje se responde, o qué mensaje se está editando. */
export interface ComposerBanner {
  kind: 'reply' | 'edit';
  /** «Respondés a Lucía» / «Editando tu mensaje». */
  title: string;
  /** El texto del mensaje (una línea). */
  preview: string;
}

interface Props {
  /** Dónde se guarda el borrador (la conversación). */
  draftKey?: string;
  /**
   * Envía. `extras` (sólo si hay algo): la visibilidad en un ticket, o la respuesta guardada elegida si el texto quedó
   * tal cual (el back completa sus variables).
   */
  onSend: (body: string, extras?: SendExtras) => void;
  /** Avisa que se está escribiendo (ya con tope). */
  onTyping?: () => void;
  placeholder?: string;
  /** Respuestas rápidas: `/` las abre. */
  quickReplies?: QuickReply[];
  /** Selector «Responder / Nota interna» (sólo en un ticket, del lado de la plataforma). */
  allowInternal?: boolean;
  /** Texto a cargar en el compositor (p. ej. lo de un envío descartado). */
  draft?: { text: string; nonce: number } | null;
  /**
   * Texto a sumar donde está el cursor (una sugerencia elegida): no pisa lo escrito y queda en el borrador. El foco
   * vuelve al campo con el cursor al final de lo insertado.
   */
  insert?: { text: string; nonce: number } | null;
  /** Respuesta a un mensaje o edición en curso: se muestra arriba y se cancela con Esc o con la cruz. */
  banner?: ComposerBanner | null;
  onCancelBanner?: () => void;
  /** Avisa a quien muestra el hilo que hay que enfocar el compositor (p. ej. al elegir «Responder»). */
  focusKey?: number;
  /**
   * El texto a editar (con `banner.kind === 'edit'`). La edición nunca se guarda como borrador: lo que se estaba
   * escribiendo queda guardado y vuelve al terminar o cancelar la edición.
   */
  editText?: { text: string; nonce: number } | null;
  /**
   * El texto de una edición que la API rechazó: se suma al borrador sin perder nada (ni el borrador guardado ni lo que
   * se escribió mientras se esperaba la respuesta). Si se está editando otro mensaje, sólo se guarda: aparece al salir.
   */
  rescue?: { text: string; nonce: number } | null;
  /**
   * Los valores de las variables `{{…}}` de las respuestas guardadas (bandeja). Si se envía un texto propio con
   * variables, se completan acá; si alguna no tiene valor (o no existe), no se envía y se pide completarla: nunca sale
   * una `{{…}}` literal.
   */
  variables?: Readonly<Record<string, string | null>>;
  /** Arriba del campo, debajo de la cita: las sugerencias de respuesta (bandeja). Sin nada, no ocupa lugar. */
  suggestions?: ReactNode;
}

/**
 * El compositor: Enter envía, Shift+Enter hace un salto de línea, crece con el texto y cuenta hasta 2000. No se
 * envía vacío. El texto sale del compositor recién cuando está en el hilo como «enviando» (nunca se pierde).
 */
export const Composer = ({
  draftKey,
  onSend,
  onTyping,
  placeholder,
  quickReplies,
  allowInternal,
  draft,
  insert,
  banner,
  onCancelBanner,
  focusKey,
  editText,
  rescue,
  variables,
  suggestions,
}: Props) => {
  const [text, setTextState] = useState(() => readDraft(draftKey));
  const editing = banner?.kind === 'edit';
  // Mientras se edita, lo que se escribe no es el borrador de la conversación: no se guarda.
  const setText = (value: string) => {
    setTextState(value);
    if (!editing) writeDraft(draftKey, value);
  };
  const [missing, setMissing] = useState<string[]>([]);
  const [internal, setInternal] = useState(false);
  const [picker, setPicker] = useState(false);
  // La respuesta guardada elegida: si se envía sin tocarla, va su id y el back completa las variables.
  const [chosen, setChosen] = useState<QuickReply | null>(null);
  const [active, setActive] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const countId = useId();
  const listId = useId();
  const optionId = (index: number) => `${listId}-op-${index}`;
  const lastTyping = useRef(0);
  const trimmed = text.trim();
  const tooLong = text.length > MESSAGE_MAX;
  const canSend = trimmed.length > 0 && !tooLong;

  // Mientras se edita, el compositor es de la edición: un borrador que vuelve se guarda y aparece al salir.
  const editingRef = useRef(editing);
  editingRef.current = editing;
  useEffect(() => {
    if (!draft) return;
    writeDraft(draftKey, draft.text);
    if (!editingRef.current) setTextState(draft.text);
  }, [draft, draftKey]);

  useEffect(() => setTextState(readDraft(draftKey)), [draftKey]);

  // Lo último escrito, para insertar sin que el efecto dependa de cada tecla.
  const textRef = useRef(text);
  textRef.current = text;
  // Dónde dejó el cursor la persona (al hacer clic en un chip el campo pierde el foco). Sin tocarlo, va al final.
  const selection = useRef<{ start: number; end: number } | null>(null);
  useEffect(() => {
    selection.current = null;
  }, [draftKey]);
  useEffect(() => {
    if (!insert) return;
    const el = area.current;
    const current = textRef.current;
    const { text: next, caret } = insertAt(
      current,
      insert.text,
      selection.current?.start ?? current.length,
      selection.current?.end ?? current.length,
    );
    selection.current = { start: caret, end: caret };
    setTextState(next);
    writeDraft(draftKey, next);
    if (el) {
      el.focus();
      // El valor nuevo llega con el próximo render: el cursor se ubica después.
      window.requestAnimationFrame(() => el.setSelectionRange(caret, caret));
    }
  }, [insert, draftKey]);

  // Entra a editar: el texto del mensaje (sin tocar el borrador guardado). Sale: vuelve el borrador que había.
  useEffect(() => {
    if (editText) setTextState(editText.text);
  }, [editText]);
  // Va antes que la salida de la edición: deja el borrador armado para que esa salida lo muestre.
  useEffect(() => {
    if (!rescue) return;
    const saved = readDraft(draftKey);
    if (editingRef.current) {
      writeDraft(draftKey, withRescuedText(saved, rescue.text));
      return;
    }
    // Lo escrito mientras volvía la respuesta (en modo edición no se guarda): se conserva entre el borrador y el rescate.
    const typed = textRef.current;
    const base = typed.trim() && typed !== saved ? withRescuedText(saved, typed) : saved;
    const next = withRescuedText(base, rescue.text);
    writeDraft(draftKey, next);
    setTextState(next);
  }, [rescue, draftKey]);
  const wasEditing = useRef(editing);
  useEffect(() => {
    if (wasEditing.current && !editing) setTextState(readDraft(draftKey));
    wasEditing.current = editing;
  }, [editing, draftKey]);

  useEffect(() => {
    if (focusKey) area.current?.focus();
  }, [focusKey]);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [text]);

  const submit = () => {
    if (!canSend) return;
    const extras: SendExtras = {};
    if (allowInternal) extras.visibility = internal ? 'internal' : 'all';
    const untouched = !editing && chosen !== null && trimmed === chosen.body.trim();
    if (untouched) extras.templateId = chosen.id;
    let body = trimmed;
    if (variables && !untouched) {
      const filled = fillVariables(trimmed, variables);
      if (filled.missing.length) {
        setMissing(filled.missing);
        return;
      }
      body = filled.text;
    }
    setMissing([]);
    onSend(body, Object.keys(extras).length ? extras : undefined);
    setText('');
    setChosen(null);
    setPicker(false);
  };

  const choose = (template: QuickReply) => {
    setText(template.body);
    setChosen(template);
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
    if (event.key === 'Escape' && banner && onCancelBanner) {
      event.preventDefault();
      event.stopPropagation();
      onCancelBanner();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const onChange = (value: string) => {
    setText(value);
    if (missing.length) setMissing([]);
    setPicker(!editing && Boolean(quickReplies?.length) && value.startsWith('/'));
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
      {banner && (
        <div
          className={cx(
            'mb-2 flex items-start gap-2 rounded-lg border-l-[3px] bg-surface-muted px-3 py-1.5',
            banner.kind === 'edit' ? 'border-warn' : 'border-primary',
          )}
        >
          {banner.kind === 'edit' ? (
            <PencilLine aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
          ) : (
            <CornerUpLeft aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink">{banner.title}</p>
            <p className="truncate text-xs text-muted">{banner.preview}</p>
          </div>
          {onCancelBanner && (
            <button
              type="button"
              onClick={onCancelBanner}
              aria-label={banner.kind === 'edit' ? 'Cancelar la edición' : 'Cancelar la respuesta'}
              className="rounded p-0.5 text-muted hover:bg-surface-hover hover:text-ink"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
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
      {!editing && suggestions}
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
          onSelect={(event) =>
            (selection.current = {
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd,
            })
          }
          aria-label="Mensaje"
          aria-describedby={missing.length ? `${countId} ${countId}-vars` : countId}
          aria-invalid={missing.length > 0 || undefined}
          aria-controls={picker ? listId : undefined}
          aria-activedescendant={picker && options.length > 0 ? optionId(active) : undefined}
          placeholder={placeholder ?? 'Escribí un mensaje'}
          className={cx(
            'min-h-[40px] flex-1 resize-none rounded-xl border bg-bg px-3 py-2 text-sm text-ink placeholder:text-faint',
            'focus:outline-none focus:ring-2 focus:ring-primary/40',
            missing.length ? 'border-danger' : internal ? 'border-warn/50' : 'border-outline',
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label={editing ? 'Guardar la edición' : internal ? 'Guardar nota interna' : 'Enviar'}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary transition-opacity disabled:opacity-40"
        >
          {editing ? (
            <Check aria-hidden="true" className="h-4 w-4" />
          ) : (
            <SendHorizontal aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>
      {missing.length > 0 && (
        <p id={`${countId}-vars`} role="alert" className="mt-1.5 px-1 text-xs text-danger">
          Completá las variables antes de enviar:{' '}
          {missing.map((name) => (
            <mark key={name} className="mr-1 rounded bg-danger-soft px-1 font-mono text-danger">
              {`{{${name}}}`}
            </mark>
          ))}
        </p>
      )}
      <p
        id={countId}
        className={cx('mt-1 flex justify-between px-1 text-[11px]', tooLong ? 'text-danger' : 'text-faint')}
      >
        <span className="hidden sm:inline">
          {editing ? 'Enter guarda · Esc cancela' : 'Enter envía · Shift+Enter, otra línea'}
          {!editing && quickReplies ? ' · / respuestas' : ''}
          {banner?.kind === 'reply' ? ' · Esc cancela la respuesta' : ''}
        </span>
        <span>
          {text.length}/{MESSAGE_MAX}
        </span>
      </p>
    </div>
  );
};
