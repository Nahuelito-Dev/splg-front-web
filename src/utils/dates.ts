/** Fecha local en formato YYYY-MM-DD (lo que esperan los filtros de la API). */
export const toIsoDay = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** El día de hace `days` días, en YYYY-MM-DD. */
export const daysAgo = (days: number, from: Date = new Date()): string => {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return toIsoDay(date);
};
