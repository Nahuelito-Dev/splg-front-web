import { z } from 'zod';
import { toApiError } from '../../services/api/errors';

/** Largos de la base de conocimiento (DTO del back, `texto-plano.ts`). */
export const QUESTION_MIN = 5;
export const QUESTION_MAX = 200;
export const ANSWER_MIN = 1;
export const ANSWER_MAX = 1500;
export const KEY_MIN = 2;
export const KEY_MAX = 60;

/**
 * El largo como lo cuenta el back (y Postgres): puntos de código, sin los espacios de los bordes. «✔️» son dos (el
 * tilde y el selector de variación); un emoji fuera del plano básico es uno, aunque en JS ocupe dos `length`.
 */
export const textLength = (text: string): number => [...text.trim()].length;

/**
 * HTML (DISENO-CH-BOT §5), igual que el back: una etiqueta (`<b>`, `</p>`, `<!--`) o una entidad (`&amp;`, `&lt`,
 * `&#60;`). Un `<` o un `&` sueltos («< 5 kg», «3 & 4 kg») son texto.
 */
const HTML = /<[A-Za-z/!?]|&[A-Za-z#]/;
export const hasHtml = (text: string): boolean => HTML.test(text);

const NO_HTML_MESSAGE = 'No puede llevar HTML (ni etiquetas como <b> ni códigos como &amp;): escribí texto plano';

const plainText = (min: number, max: number, empty: string) =>
  z
    .string()
    .refine((value) => textLength(value) > 0, empty)
    .refine((value) => {
      const length = textLength(value);
      return length === 0 || (length >= min && length <= max);
    }, `Tiene que tener entre ${min} y ${max} caracteres`)
    .refine((value) => !hasHtml(value), NO_HTML_MESSAGE);

export const faqSchema = z.object({
  question: plainText(QUESTION_MIN, QUESTION_MAX, 'Escribí la pregunta'),
  answer: plainText(ANSWER_MIN, ANSWER_MAX, 'Escribí la respuesta'),
});
export type FaqFormValues = z.infer<typeof faqSchema>;

/** Lo que se manda: el texto sin los espacios de los bordes (el back los recorta igual). */
export const toFaqBody = ({ question, answer }: FaqFormValues) => ({
  question: question.trim(),
  answer: answer.trim(),
});

/** La clave de una pregunta de OrixTech o de ejemplo: minúsculas, números y guiones bajos (`medios_de_pago`). No cambia. */
const KEY_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;

/** Las preguntas con clave: las de OrixTech y las de ejemplo para distribuidoras. */
export const keyedFaqSchema = faqSchema.extend({
  key: z
    .string()
    .trim()
    .min(1, 'Escribí la clave')
    .min(KEY_MIN, `Tiene que tener entre ${KEY_MIN} y ${KEY_MAX} caracteres`)
    .max(KEY_MAX, `Tiene que tener entre ${KEY_MIN} y ${KEY_MAX} caracteres`)
    .regex(KEY_PATTERN, 'Sólo minúsculas, números y guiones bajos entre palabras (p. ej. medios_de_pago)'),
});
export type KeyedFaqFormValues = z.infer<typeof keyedFaqSchema>;

/** Sugiere una clave a partir de la pregunta: «¿Qué medios de pago aceptan?» → `que_medios_de_pago_aceptan`. */
export const suggestKey = (question: string): string =>
  question
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, KEY_MAX)
    .replace(/_+$/, '');

export type FaqField = 'question' | 'answer' | 'key';

export interface FaqServerError {
  /** El campo al que corresponde, o `null` si es de la base entera (el tope). */
  field: FaqField | null;
  message: string;
}

const FIELD_PREFIXES: Record<string, FaqField> = { Pregunta: 'question', Respuesta: 'answer', Clave: 'key' };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Los errores del back, cada uno junto a su campo: los 409 por su `code` y los 400 por el prefijo del mensaje
 * («Pregunta: …»). Lo que no es de un campo (el tope, un 403) queda para el pie del formulario.
 */
export const faqServerErrors = (error: unknown): FaqServerError[] => {
  const apiError = toApiError(error);
  switch (apiError.code) {
    case 'ASSISTANT_FAQ_DUPLICATE':
      return [{ field: 'question', message: 'Ya hay una pregunta igual en la base (sin contar mayúsculas)' }];
    case 'ASSISTANT_TEMPLATE_DUPLICATE':
      return [{ field: 'question', message: 'Ya hay una pregunta de ejemplo igual (sin contar mayúsculas)' }];
    case 'ASSISTANT_FAQ_KEY_TAKEN':
    case 'ASSISTANT_TEMPLATE_KEY_TAKEN':
      return [{ field: 'key', message: 'Ya hay una pregunta con esa clave: elegí otra' }];
    case 'ASSISTANT_FAQ_LIMIT_REACHED':
    case 'ASSISTANT_TEMPLATE_LIMIT_REACHED':
      return [{ field: null, message: apiError.messages.join('. ') }];
    default:
      break;
  }
  return apiError.messages.map((message) => {
    const match = /^(\p{L}+): (.+)$/u.exec(message);
    const field = match ? FIELD_PREFIXES[match[1]] : undefined;
    return field && match ? { field, message: capitalize(match[2]) } : { field: null, message };
  });
};

/** Para buscar sin importar mayúsculas ni tildes. */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

interface Searchable {
  question: string;
  answer: string;
  key?: string | null;
  position: number;
}

/** Las preguntas que coinciden con la búsqueda (pregunta, respuesta o clave), en el orden de la base (`position`). */
export const filterFaqs = <T extends Searchable>(items: readonly T[], search: string): T[] => {
  const needle = fold(search.trim());
  const sorted = [...items].sort((a, b) => a.position - b.position);
  if (!needle) return sorted;
  return sorted.filter((faq) => [faq.question, faq.answer, faq.key ?? ''].some((text) => fold(text).includes(needle)));
};

/** El aviso de cuántas preguntas de ejemplo se sumaron (copiar es idempotente: la segunda vez no suma nada). */
export const copiedMessage = (copied: number): string =>
  copied === 0
    ? 'Ya tenías todas las preguntas de ejemplo: no se sumó ninguna'
    : copied === 1
      ? 'Se sumó 1 pregunta de ejemplo'
      : `Se sumaron ${copied} preguntas de ejemplo`;

/** Cuántas preguntas de ejemplo se sumarían: las que la base todavía no tiene (`alreadyInBase`). */
export const templatesToAdd = (items: ReadonlyArray<{ alreadyInBase: boolean }>): number =>
  items.filter((item) => !item.alreadyInBase).length;

/** El tope de una base o del catálogo, con el motivo para apagar «Nueva pregunta». */
export const fullHint = (count: number, limit: number): string | undefined =>
  count >= limit ? `Llegaste al máximo de ${limit} preguntas: da de baja alguna para agregar otra` : undefined;

/** En qué tramo está un contador: normal, desde el 90 % del tope o pasado. */
export const counterLevel = (length: number, max: number): 'ok' | 'near' | 'over' =>
  length > max ? 'over' : length >= Math.ceil(max * 0.9) ? 'near' : 'ok';

interface CopyState {
  /** Hay catálogo cargado (puede ser de una consulta anterior). */
  items: ReadonlyArray<{ alreadyInBase: boolean }> | undefined;
  error: unknown;
  /** Se está pidiendo el catálogo (la primera vez o al reabrir el diálogo). */
  isFetching: boolean;
  /** Preguntas que tiene hoy la base y su tope. */
  count: number;
  limit: number;
}

/**
 * Por qué no se puede sumar todavía (o `undefined` si se puede). Con datos viejos (refrescando o con la última recarga
 * fallida) no se decide nada: el back copia todo o nada, y si no entran todas bajo el tope responde 409.
 */
export const copyBlockedReason = ({ items, error, isFetching, count, limit }: CopyState): string | undefined => {
  if (isFetching) return items ? 'Actualizando las preguntas de ejemplo…' : 'Cargando las preguntas de ejemplo…';
  if (!items) return error ? 'No se pudieron cargar las preguntas de ejemplo' : 'Cargando las preguntas de ejemplo…';
  if (error) return 'No se pudieron actualizar las preguntas de ejemplo';
  if (items.length === 0) return 'Todavía no hay preguntas de ejemplo para sumar';
  const toAdd = templatesToAdd(items);
  if (toAdd === 0) return 'Ya tenés todas las preguntas de ejemplo en tu base';
  const over = count + toAdd - limit;
  if (over > 0) {
    const these = toAdd === 1 ? 'esta' : `estas ${toAdd}`;
    return `Tu base tiene ${count} de ${limit}: da de baja al menos ${over} para sumar ${these}`;
  }
  return undefined;
};

/** El rótulo del botón: con el número sólo cuando el catálogo está al día y hay algo para sumar (nunca «Sumar 0»). */
export const copyButtonLabel = (toAdd: number, upToDate: boolean): string =>
  !upToDate || toAdd === 0 ? 'Sumar preguntas' : toAdd === 1 ? 'Sumar 1 pregunta' : `Sumar ${toAdd} preguntas`;
