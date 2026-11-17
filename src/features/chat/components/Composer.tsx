import { Check, CornerUpLeft, Lock, PencilLine, SendHorizontal, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cx, PersonAvatar } from '../../../common/components/ui';
import { NOTE_MENTIONS_MAX } from '../../../services/api/inbox';
import { MESSAGE_MAX } from '../../../services/api/supportChat';
import type { MessageTemplate } from '../../../services/api/types';
import type { SendExtras } from '../../../services/queries/chatThread';
import {
  readDraft,
  readNoteDraft,
  rebaseMentions,
  validMentions,
  withRescuedText,
  writeDraft,
  writeNoteDraft,
  type MentionToken,
} from '../composerDraft';
import { foldText, mentionQueryAt } from '../inbox/messageExtras';
import { insertAt } from '../insertText';
import { fillVariables } from '../variables';
import { TEAM_ONLY_LABEL } from './InboxMessageExtras';

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
  /** Lo que se edita es una nota interna: lo que se escribe nunca avisa «escribiendo…» a la otra punta. */
  internal?: boolean;
}

/** Alguien del equipo que se puede mencionar en una nota interna. */
export interface MentionOption {
  userId: string;
  fullName: string;
}

/** Las personas que se pueden mencionar (`undefined` mientras cargan) y si no se pudieron leer. */
export interface MentionSource {
  options: MentionOption[] | undefined;
  error: boolean;
}

/** Cuántas personas se ofrecen a la vez al escribir `@`. */
const MENTION_OPTIONS_MAX = 8;

/** Quiénes coinciden con lo escrito después de `@`: por nombre o apellido, sin tildes ni mayúsculas. */
const matchMentions = (options: MentionOption[], query: string): MentionOption[] => {
  const wanted = foldText(query.trim());
  return options.filter((option) => foldText(option.fullName).includes(wanted)).slice(0, MENTION_OPTIONS_MAX);
};

interface Props {
  /** Dónde se guarda el borrador (la conversación). */
  draftKey?: string;
  /**
   * Envía. `extras` (sólo si hay algo): la visibilidad en un ticket, o la respuesta guardada elegida si el texto quedó
   * tal cual (el back completa sus variables).
   */
  onSend: (body: string, extras?: SendExtras) => void;
  /** Avisa que se está escribiendo (ya con tope). `internal`: es una nota (el back no se lo avisa a la otra punta). */
  onTyping?: (internal: boolean) => void;
  placeholder?: string;
  /** Respuestas rápidas: `/` las abre. */
  quickReplies?: QuickReply[];
  /** Selector «Responder / Nota interna» (un ticket del lado de la plataforma, la bandeja de la empresa). */
  allowInternal?: boolean;
  /** Con esto, en una nota interna `@` abre la lista de personas a mencionar (bandeja). */
  mentionSource?: MentionSource;
  /** Avisa al pasar entre mensaje y nota (p. ej. para pedir a quiénes se puede mencionar recién ahí). */
  onNoteModeChange?: (internal: boolean) => void;
  /**
   * Texto a cargar en el compositor (p. ej. lo de un envío descartado). `internal`: era una nota, vuelve al borrador
   * de las notas (con sus menciones) y el compositor pasa a «Nota interna»; nunca al mensaje al cliente.
   */
  draft?: { text: string; nonce: number; internal?: boolean; mentions?: MentionToken[] } | null;
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
  rescue?: { text: string; nonce: number; internal?: boolean } | null;
  /**
   * Los valores de las variables `{{…}}` de las respuestas guardadas (bandeja). Si se envía un texto propio con
   * variables, se completan acá; si alguna no tiene valor (o no existe), no se envía y se pide completarla: nunca sale
   * una `{{…}}` literal.
   */
  variables?: Readonly<Record<string, string | null>>;
  /** Arriba del campo, debajo de la cita: las sugerencias de respuesta (bandeja). Sin nada, no ocupa lugar. */
  suggestions?: ReactNode;
  /**
   * El clip para adjuntar (al lado del campo). Nunca en una nota interna ni editando: el back no admite adjuntos en
   * una nota y un mensaje editado sigue siendo texto.
   */
  attach?: ReactNode;
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
  mentionSource,
  onNoteModeChange,
  draft,
  insert,
  banner,
  onCancelBanner,
  focusKey,
  editText,
  rescue,
  variables,
  suggestions,
  attach,
}: Props) => {
  const [text, setTextState] = useState(() => readDraft(draftKey));
  const editing = banner?.kind === 'edit';
  const [internal, setInternal] = useState(false);
  // Las menciones de la nota que se escribe, por ocurrencia (se guardan con el borrador de la nota).
  const [mentions, setMentions] = useState<MentionToken[]>([]);
  // Lo último (para los efectos, sin depender de cada tecla). `internalRef` cambia en el acto al pasar de modo.
  const textRef = useRef(text);
  textRef.current = text;
  const mentionsRef = useRef(mentions);
  mentionsRef.current = mentions;
  const internalRef = useRef(internal);
  const onNoteModeChangeRef = useRef(onNoteModeChange);
  onNoteModeChangeRef.current = onNoteModeChange;
  /**
   * La nota tiene su propio borrador (`<conversación>:nota`, con sus menciones): lo escrito para el equipo nunca queda
   * en el cuadro ni en el borrador del mensaje al cliente. Mientras se edita, lo que se escribe no se guarda.
   */
  const setText = (value: string, nextMentions?: MentionToken[]) => {
    const note = internalRef.current;
    const tokens = note ? (nextMentions ?? rebaseMentions(textRef.current, value, mentionsRef.current)) : [];
    textRef.current = value;
    mentionsRef.current = tokens;
    setTextState(value);
    setMentions(tokens);
    if (editing) return;
    if (note) writeNoteDraft(draftKey, { text: value, mentions: tokens });
    else writeDraft(draftKey, value);
  };
  /** Pasa a un modo (mensaje o nota) con lo guardado de ese modo. Avisa sólo si cambió. */
  const loadMode = useCallback(
    (next: boolean) => {
      const changed = internalRef.current !== next;
      internalRef.current = next;
      setInternal(next);
      if (next) {
        const saved = readNoteDraft(draftKey);
        setTextState(saved.text);
        setMentions(saved.mentions);
      } else {
        setTextState(readDraft(draftKey));
        setMentions([]);
      }
      if (changed) onNoteModeChangeRef.current?.(next);
    },
    [draftKey],
  );
  const [missing, setMissing] = useState<string[]>([]);
  // Escribiendo una nota (nueva o editando una): lo que se escribe es sólo del equipo.
  const noteMode = editing ? Boolean(banner?.internal) : internal;
  const [picker, setPicker] = useState(false);
  // La `@` que se está escribiendo (desde dónde y lo tipeado) y a quiénes se eligió de la lista.
  const [mentionQuery, setMentionQuery] = useState<{ start: number; query: string } | null>(null);
  const [activeMention, setActiveMention] = useState(0);
  const [mentionError, setMentionError] = useState<string | null>(null);
  const mentionListId = useId();
  const mentionOptionId = (index: number) => `${mentionListId}-op-${index}`;
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
    // Cada cosa vuelve a su borrador: una nota descartada, al de las notas (con sus menciones).
    if (draft.internal) writeNoteDraft(draftKey, { text: draft.text, mentions: draft.mentions ?? [] });
    else writeDraft(draftKey, draft.text);
    if (!editingRef.current) loadMode(Boolean(draft.internal));
  }, [draft, draftKey, loadMode]);

  useEffect(() => loadMode(internalRef.current), [loadMode]);

  // Dónde dejó el cursor la persona (al hacer clic en un chip el campo pierde el foco). Sin tocarlo, va al final.
  const selection = useRef<{ start: number; end: number } | null>(null);
  useEffect(() => {
    selection.current = null;
  }, [draftKey]);
  useEffect(() => {
    // Las sugerencias son para la persona: en una nota no se ofrecen ni se pegan.
    if (!insert || internalRef.current) return;
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
  // La edición rechazada vuelve al borrador de SU modo: la de una nota, al de las notas (nunca al del cliente).
  useEffect(() => {
    if (!rescue) return;
    const note = Boolean(rescue.internal);
    // Lo escrito en ese mismo modo mientras volvía la respuesta (en edición no se guarda) se conserva.
    const sameMode = !editingRef.current && internalRef.current === note;
    if (note) {
      const saved = readNoteDraft(draftKey);
      const typed = sameMode ? textRef.current : saved.text;
      const base = typed.trim() && typed !== saved.text ? withRescuedText(saved.text, typed) : saved.text;
      const tokens = sameMode ? mentionsRef.current : saved.mentions;
      writeNoteDraft(draftKey, { text: withRescuedText(base, rescue.text), mentions: tokens });
    } else {
      const saved = readDraft(draftKey);
      const typed = sameMode ? textRef.current : saved;
      const base = typed.trim() && typed !== saved ? withRescuedText(saved, typed) : saved;
      writeDraft(draftKey, withRescuedText(base, rescue.text));
    }
    // Editando otro mensaje, sólo se guarda: aparece al salir.
    if (!editingRef.current) loadMode(note);
  }, [rescue, draftKey, loadMode]);
  const wasEditing = useRef(editing);
  useEffect(() => {
    if (wasEditing.current && !editing) loadMode(internalRef.current);
    wasEditing.current = editing;
  }, [editing, loadMode]);

  useEffect(() => {
    if (focusKey) area.current?.focus();
  }, [focusKey]);

  const changeMode = (next: boolean) => {
    if (next === internal) return;
    loadMode(next);
    setPicker(false);
    setMentionQuery(null);
    setMentionError(null);
    // Una nota no cita mensajes: elegir «Nota interna» deja la respuesta que se estaba armando.
    if (next && banner?.kind === 'reply') onCancelBanner?.();
  };
  // Elegir «Responder» en un mensaje vuelve a escribirle a la persona (la cita no va en una nota).
  const replying = banner?.kind === 'reply';
  useEffect(() => {
    if (replying && internalRef.current) loadMode(false);
  }, [replying, loadMode]);

  // En una nota con equipo para mencionar, el campo es un combobox: `@` abre la lista.
  const mentionsEnabled = noteMode && !editing && Boolean(mentionSource);
  const mentionOpen = mentionsEnabled && mentionQuery !== null;
  const mentionMatches = mentionOpen ? matchMentions(mentionSource?.options ?? [], mentionQuery?.query ?? '') : [];
  const mentionListOpen = mentionOpen && mentionMatches.length > 0;
  // Dos personas con el mismo nombre: la lista lo avisa (la foto las distingue; la API no da otro dato).
  const repeatedNames = new Set(
    (mentionSource?.options ?? [])
      .map((o) => foldText(o.fullName))
      .filter((name, index, all) => all.indexOf(name) !== index),
  );

  const chooseMention = (option: MentionOption) => {
    if (!mentionQuery) return;
    const end = mentionQuery.start + mentionQuery.query.length + 1;
    const inserted = `@${option.fullName} `;
    const next = text.slice(0, mentionQuery.start) + inserted + text.slice(end);
    const caret = mentionQuery.start + inserted.length;
    const kept = rebaseMentions(text, next, mentions);
    setText(next, [...kept, { userId: option.userId, fullName: option.fullName, start: mentionQuery.start }]);
    setMentionQuery(null);
    setMentionError(null);
    const el = area.current;
    if (el) {
      el.focus();
      window.requestAnimationFrame(() => el.setSelectionRange(caret, caret));
    }
  };

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
    if (internal && !editing) {
      // Sólo las menciones elegidas de la lista que siguen intactas en su lugar (tocar el nombre la saca).
      const valid = validMentions(text, mentions);
      const ids = [...new Set(valid.map((m) => m.userId))];
      if (ids.length > NOTE_MENTIONS_MAX) {
        setMentionError(`Podés mencionar hasta ${NOTE_MENTIONS_MAX} personas por nota.`);
        return;
      }
      if (ids.length) {
        // Relativas al texto enviado (sin los espacios del principio): para devolver la nota a su borrador.
        const lead = text.length - text.trimStart().length;
        extras.mentions = ids;
        extras.mentionTokens = valid.map((m) => ({ ...m, start: m.start - lead }));
      }
      setMentionError(null);
      onSend(trimmed, extras);
      setText('', []);
      setMentionQuery(null);
      return;
    }
    const untouched = !editing && chosen !== null && trimmed === chosen.body.trim();
    if (untouched) extras.templateId = chosen.id;
    let body = trimmed;
    if (variables && !untouched && !noteMode) {
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
    if (mentionOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (mentionMatches.length > 0) {
          const step = event.key === 'ArrowDown' ? 1 : -1;
          setActiveMention((current) => (current + step + mentionMatches.length) % mentionMatches.length);
        }
        return;
      }
      if (((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') && mentionMatches.length > 0) {
        if (event.nativeEvent.isComposing) return;
        event.preventDefault();
        const option = mentionMatches[Math.min(activeMention, mentionMatches.length - 1)];
        if (option) chooseMention(option);
        return;
      }
      // Con una `@` a medio escribir (cargando, sin coincidencias o con error) Enter no envía: Esc la deja como texto.
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setMentionQuery(null);
        return;
      }
    }
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

  const onChange = (value: string, caret: number) => {
    const tokens = internal ? rebaseMentions(text, value, mentions) : [];
    setText(value, tokens);
    if (missing.length) setMissing([]);
    // Las respuestas guardadas son para la persona: en una nota no se ofrecen.
    setPicker(!editing && !noteMode && Boolean(quickReplies?.length) && value.startsWith('/'));
    setActive(0);
    if (mentionsEnabled) {
      const query = mentionQueryAt(value, caret);
      // Una mención ya elegida no se vuelve a abrir; con espacios (nombre y apellido) sigue sólo si alguien coincide.
      const open =
        query &&
        !tokens.some((m) => m.start === query.start) &&
        (!/\s/.test(query.query) || matchMentions(mentionSource?.options ?? [], query.query).length > 0);
      setMentionQuery(open ? query : null);
      setActiveMention(0);
    }
    const now = Date.now();
    if (onTyping && value.trim() && now - lastTyping.current >= TYPING_EVERY_MS) {
      lastTyping.current = now;
      onTyping(noteMode);
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
      {mentionListOpen && (
        <ul
          id={mentionListId}
          role="listbox"
          aria-label="Personas del equipo"
          className="absolute bottom-full left-2 right-2 mb-1 max-h-56 overflow-y-auto rounded-xl border border-outline bg-surface p-1 shadow-control"
        >
          {mentionMatches.map((option, index) => (
            <li
              key={option.userId}
              id={mentionOptionId(index)}
              role="option"
              aria-selected={index === activeMention}
              onMouseDown={(event) => {
                event.preventDefault();
                chooseMention(option);
              }}
              onMouseEnter={() => setActiveMention(index)}
              className={cx(
                'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-ink',
                index === activeMention ? 'bg-primary-soft' : 'hover:bg-surface-hover',
              )}
            >
              <PersonAvatar
                name={option.fullName}
                userId={option.userId}
                size="sm"
                decorative
                className="h-6 w-6 shrink-0 text-[10px]"
              />
              <span className="min-w-0 flex-1 truncate">{option.fullName}</span>
              {repeatedNames.has(foldText(option.fullName)) && (
                <span className="shrink-0 text-[11px] text-muted">mismo nombre: mirá la foto</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {mentionOpen && !mentionListOpen && (
        // Fuera de la lista: un aviso que se lee solo (no son opciones).
        <p
          role="status"
          className={cx(
            'absolute bottom-full left-2 right-2 mb-1 rounded-xl border border-outline bg-surface px-3 py-2 text-xs shadow-control',
            mentionSource?.error ? 'text-danger' : 'text-muted',
          )}
        >
          {mentionSource?.error
            ? 'No se pudo cargar el equipo. Probá de nuevo en un rato.'
            : mentionSource?.options === undefined
              ? 'Cargando el equipo…'
              : 'Nadie del equipo que atiende este canal se llama así. Esc para dejarlo como texto.'}
        </p>
      )}
      {!editing && !noteMode && suggestions}
      {allowInternal && !editing && (
        <div className="mb-2 inline-flex rounded-lg border border-outline p-0.5 text-xs" role="group" aria-label="Tipo">
          <button
            type="button"
            aria-pressed={!internal}
            onClick={() => changeMode(false)}
            className={cx('rounded-md px-2.5 py-1', !internal ? 'bg-primary text-on-primary' : 'text-ink-2')}
          >
            Responder
          </button>
          <button
            type="button"
            aria-pressed={internal}
            onClick={() => changeMode(true)}
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
      {noteMode && (
        <p id={`${countId}-note`} className="mb-1.5 flex items-center gap-1 px-1 text-xs font-medium text-ink-2">
          <Lock aria-hidden="true" className="h-3 w-3" />
          {TEAM_ONLY_LABEL}
          {mentionSource && !editing ? ' · escribí @ para mencionar a alguien' : ''}
        </p>
      )}
      <div className="flex items-end gap-2">
        {!editing && !noteMode && attach}
        <textarea
          ref={area}
          value={text}
          rows={1}
          onChange={(event) => onChange(event.target.value, event.target.selectionStart ?? event.target.value.length)}
          onKeyDown={onKeyDown}
          onSelect={(event) =>
            (selection.current = {
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd,
            })
          }
          aria-label={noteMode ? 'Nota interna' : 'Mensaje'}
          aria-describedby={[
            noteMode ? `${countId}-note` : null,
            missing.length ? `${countId}-vars` : null,
            mentionError ? `${countId}-mentions` : null,
            countId,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={missing.length > 0 || Boolean(mentionError) || undefined}
          // En una nota con equipo para mencionar, el campo es un combobox (`@` despliega la lista).
          role={mentionsEnabled ? 'combobox' : undefined}
          aria-expanded={mentionsEnabled ? mentionListOpen : undefined}
          aria-autocomplete={mentionsEnabled ? 'list' : undefined}
          aria-haspopup={mentionsEnabled ? 'listbox' : undefined}
          aria-controls={mentionListOpen ? mentionListId : picker ? listId : undefined}
          aria-activedescendant={
            mentionListOpen
              ? mentionOptionId(Math.min(activeMention, mentionMatches.length - 1))
              : picker && options.length > 0
                ? optionId(active)
                : undefined
          }
          placeholder={noteMode ? 'Nota para el equipo' : (placeholder ?? 'Escribí un mensaje')}
          className={cx(
            'min-h-[40px] flex-1 resize-none rounded-xl border px-3 py-2 text-sm text-ink placeholder:text-faint',
            'focus:outline-none focus:ring-2 focus:ring-primary/40',
            noteMode ? 'bg-warn-soft' : 'bg-bg',
            missing.length || mentionError ? 'border-danger' : noteMode ? 'border-warn/50' : 'border-outline',
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
      {mentionError && (
        <p id={`${countId}-mentions`} role="alert" className="mt-1.5 px-1 text-xs text-danger">
          {mentionError}
        </p>
      )}
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
          {!editing && !noteMode && quickReplies ? ' · / respuestas' : ''}
          {banner?.kind === 'reply' ? ' · Esc cancela la respuesta' : ''}
        </span>
        <span>
          {text.length}/{MESSAGE_MAX}
        </span>
      </p>
    </div>
  );
};
