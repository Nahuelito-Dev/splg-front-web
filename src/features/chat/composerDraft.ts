/** Lo escrito y no enviado se guarda por conversación en la pestaña (sobrevive a un corte, a cambiar de pantalla o a recargar). */
const DRAFT_PREFIX = 'chatDraft:';

export const readDraft = (key: string | undefined): string => {
  if (!key) return '';
  try {
    return sessionStorage.getItem(DRAFT_PREFIX + key) ?? '';
  } catch {
    return '';
  }
};

export const writeDraft = (key: string | undefined, text: string) => {
  if (!key) return;
  try {
    if (text) sessionStorage.setItem(DRAFT_PREFIX + key, text);
    else sessionStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    // sin sessionStorage el borrador vive mientras el compositor está a la vista
  }
};

/**
 * Lo que queda en el compositor cuando una edición no se pudo guardar: el texto editado, después del borrador que
 * hubiera (separado por una línea en blanco). No se pierde ni uno ni otro.
 */
export const withRescuedText = (draft: string, rescued: string): string =>
  draft.trim() ? `${draft.trimEnd()}\n\n${rescued}` : rescued;

/**
 * Una mención elegida de la lista en una nota interna: la persona y dónde quedó en el texto (`start`, la posición de
 * su `@`). Se identifica por la ocurrencia, no por el nombre: «@Ana» dentro de «@Ana María» no cuenta, y dos personas
 * con el mismo nombre son dos menciones distintas.
 */
export interface MentionToken {
  userId: string;
  fullName: string;
  start: number;
}

/** Lo que quedó escrito en una nota sin enviar, con sus menciones. */
export interface NoteDraft {
  text: string;
  mentions: MentionToken[];
}

/** El borrador de las notas internas de una conversación: aparte del mensaje al cliente (nunca se mezclan). */
export const noteDraftKey = (key: string | undefined): string | undefined => (key ? `${key}:nota` : undefined);

const isToken = (value: unknown): value is MentionToken =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as MentionToken).userId === 'string' &&
  typeof (value as MentionToken).fullName === 'string' &&
  Number.isInteger((value as MentionToken).start);

/** La nota sin enviar de esa conversación (texto y menciones, en la misma clave). */
export const readNoteDraft = (key: string | undefined): NoteDraft => {
  const raw = readDraft(noteDraftKey(key));
  if (!raw) return { text: '', mentions: [] };
  try {
    const parsed = JSON.parse(raw) as { text?: unknown; mentions?: unknown };
    const text = typeof parsed.text === 'string' ? parsed.text : '';
    const mentions = Array.isArray(parsed.mentions) ? parsed.mentions.filter(isToken) : [];
    return { text, mentions: validMentions(text, mentions) };
  } catch {
    // Texto suelto (sin menciones): se conserva tal cual.
    return { text: raw, mentions: [] };
  }
};

export const writeNoteDraft = (key: string | undefined, draft: NoteDraft) => {
  const noteKey = noteDraftKey(key);
  if (!draft.text) writeDraft(noteKey, '');
  else writeDraft(noteKey, JSON.stringify({ text: draft.text, mentions: validMentions(draft.text, draft.mentions) }));
};

/** Las menciones que siguen tal cual en el texto (su `@Nombre` intacto en su lugar, sin una letra pegada después). */
export const validMentions = (text: string, mentions: readonly MentionToken[]): MentionToken[] =>
  mentions.filter((m) => {
    const label = `@${m.fullName}`;
    if (text.slice(m.start, m.start + label.length) !== label) return false;
    const next = text.charAt(m.start + label.length);
    return !next || !/[\p{L}\p{N}]/u.test(next);
  });

/**
 * Corre las menciones cuando cambia el texto: las de antes del cambio quedan, las de después se mueven con él y las
 * que el cambio tocó se pierden (se editó el nombre: ya no es la mención elegida).
 */
export const rebaseMentions = (before: string, after: string, mentions: readonly MentionToken[]): MentionToken[] => {
  if (before === after || mentions.length === 0) return [...mentions];
  let prefix = 0;
  const max = Math.min(before.length, after.length);
  while (prefix < max && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < max - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) {
    suffix += 1;
  }
  const changedEnd = before.length - suffix;
  const delta = after.length - before.length;
  const moved: MentionToken[] = [];
  for (const m of mentions) {
    const end = m.start + m.fullName.length + 1;
    if (end <= prefix) moved.push(m);
    else if (m.start >= changedEnd) moved.push({ ...m, start: m.start + delta });
  }
  return validMentions(after, moved);
};
