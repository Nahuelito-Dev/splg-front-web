/**
 * Mete `insertion` en `current` donde está el cursor (o reemplaza lo seleccionado), con un espacio de cada lado si
 * hace falta para no pegarlo a una palabra. Con el compositor vacío queda sólo lo insertado. Devuelve el texto y dónde
 * queda el cursor (al final de lo insertado).
 */
export const insertAt = (
  current: string,
  insertion: string,
  start: number = current.length,
  end: number = start,
): { text: string; caret: number } => {
  if (!current.trim()) return { text: insertion, caret: insertion.length };
  const from = Math.max(0, Math.min(start, current.length));
  const to = Math.max(from, Math.min(end, current.length));
  const before = current.slice(0, from);
  const after = current.slice(to);
  const left = before && !/\s$/.test(before) ? ' ' : '';
  const right = after && !/^\s/.test(after) ? ' ' : '';
  const text = `${before}${left}${insertion}${right}${after}`;
  return { text, caret: before.length + left.length + insertion.length };
};
