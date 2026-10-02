/** La patente como la guarda y la busca el back: mayúsculas, sin espacios ni guiones ("ab 104-ej" → "AB104EJ"). */
export const normalizePatent = (value: string): string => value.replace(/[\s-]+/g, '').toUpperCase();
