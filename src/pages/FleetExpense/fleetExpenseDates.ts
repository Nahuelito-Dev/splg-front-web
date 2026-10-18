/** `YYYY-MM-DDTHH:mm` en hora local, lo que maneja un `<input type="datetime-local">`. */
export const toLocalInput = (iso: string | Date | null | undefined): string => {
  if (!iso) return '';
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** El instante ISO de lo que se eligió en un `datetime-local` (vacío: `undefined`). */
export const fromLocalInput = (value: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
