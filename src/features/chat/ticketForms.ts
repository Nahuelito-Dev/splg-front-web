import { z } from 'zod';
import {
  EXCERPT_MAX,
  MESSAGE_MAX,
  SUBJECT_MAX,
  SUBJECT_MIN,
  type TicketCategory,
  type TicketPriority,
} from '../../services/api/supportChat';
import { statusKeys, TICKET_CATEGORY, TICKET_PRIORITY } from '../../utils/statusLabels';

const CATEGORIES = statusKeys(TICKET_CATEGORY) as [TicketCategory, ...TicketCategory[]];
const PRIORITIES = statusKeys(TICKET_PRIORITY) as [TicketPriority, ...TicketPriority[]];

export const categoryOptions = CATEGORIES.map((value) => ({ value, label: TICKET_CATEGORY[value].text }));
export const priorityOptions = PRIORITIES.map((value) => ({ value, label: TICKET_PRIORITY[value].text }));

const subject = z
  .string()
  .trim()
  .min(SUBJECT_MIN, `El asunto tiene que tener al menos ${SUBJECT_MIN} caracteres`)
  .max(SUBJECT_MAX, `El asunto puede tener hasta ${SUBJECT_MAX} caracteres`);

/** Las mismas reglas que `OpenTicketFromChatDto` (la cita la arma la selección). */
export const openFromChatSchema = z.object({
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Elegí la categoría' }) }),
  priority: z.enum(PRIORITIES, { errorMap: () => ({ message: 'Elegí la prioridad' }) }),
  subject,
  note: z.string().trim().max(MESSAGE_MAX, `La nota puede tener hasta ${MESSAGE_MAX} caracteres`),
  assignToMe: z.boolean(),
});
export type OpenFromChatValues = z.infer<typeof openFromChatSchema>;

/** Las mismas reglas que `CreateCompanyTicketDto` / `CreatePlatformTicketDto` (con la empresa del lado plataforma). */
export const newTicketSchema = (needsCompany: boolean) =>
  z.object({
    distributorId: needsCompany ? z.string().uuid('Elegí la empresa') : z.string(),
    category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Elegí la categoría' }) }),
    priority: z.enum(PRIORITIES, { errorMap: () => ({ message: 'Elegí la prioridad' }) }),
    subject,
    body: z
      .string()
      .trim()
      .min(1, 'Contá qué pasa')
      .max(MESSAGE_MAX, `El mensaje puede tener hasta ${MESSAGE_MAX} caracteres`),
  });
export type NewTicketValues = z.infer<ReturnType<typeof newTicketSchema>>;

/** El rango que se cita: del primer al último mensaje elegido (la API copia el rango entero, hasta 200). */
export const rangeOf = (selected: ReadonlySet<number>): { fromSeq: number; toSeq: number; size: number } | null => {
  if (selected.size === 0) return null;
  const seqs = [...selected];
  const fromSeq = Math.min(...seqs);
  const toSeq = Math.max(...seqs);
  return { fromSeq, toSeq, size: toSeq - fromSeq + 1 };
};

export const rangeError = (range: ReturnType<typeof rangeOf>): string | null =>
  !range
    ? 'Elegí al menos un mensaje del chat'
    : range.size > EXCERPT_MAX
      ? `Elegí hasta ${EXCERPT_MAX} mensajes seguidos (del primero al último elegido hay ${range.size})`
      : null;

/** Por defecto se eligen los mensajes de las últimas 2 horas (§4.2.2). */
export const DEFAULT_SELECTION_MS = 2 * 60 * 60 * 1000;
