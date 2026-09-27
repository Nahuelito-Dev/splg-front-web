/** Separa por comas, espacios o saltos de línea; descarta vacíos. */
export const parseSerials = (raw: string): string[] =>
  raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
