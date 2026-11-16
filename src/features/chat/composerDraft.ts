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
