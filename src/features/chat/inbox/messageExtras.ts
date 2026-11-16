import type { InboxAction, InboxCsat } from '../../../services/api/types';
import type { ChatMessage } from '../thread';

/**
 * Lo que traen en el `payload` los mensajes de la bandeja que el panel muestra con algo más que el texto (4b–4e): la
 * encuesta al cerrar, la nota del asistente al derivar, las fuentes de sus respuestas y el botón que tocó el cliente.
 * El back manda claves y datos; los textos los arma el panel.
 */

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

// ── 4d: fuentes de cada respuesta del asistente ───────────────────────────────

/** Las herramientas del asistente con IA (`assistant-ai/herramientas.ts`), con nombre humano. */
export const ASSISTANT_TOOL_LABELS: Readonly<Record<string, string>> = {
  estado_de_mi_pedido: 'Estado del pedido',
  horarios_y_zonas: 'Horarios y zonas de entrega',
  precios_vigentes: 'Precios vigentes',
  medios_de_pago: 'Medios de pago',
};

/**
 * Las fuentes de una respuesta del asistente con IA (`payload.ai.sources`, sólo le llegan al personal), en castellano y
 * sin repetir: «Pregunta frecuente «¿Hacen envíos?»», «Precios vigentes», «Estado del pedido #A1B2C3». Una herramienta
 * que el panel no conoce no se nombra (nunca sale una clave interna); sin fuentes, lista vacía.
 */
export const aiSourcesOf = (message: Pick<ChatMessage, 'payload'>): string[] => {
  const raw = record(record(message.payload)?.ai)?.sources;
  const sources: unknown[] = Array.isArray(raw) ? raw : [];
  const labels: string[] = [];
  for (const item of sources) {
    const source = record(item);
    if (!source) continue;
    let label: string | null = null;
    if (source.type === 'faq') {
      const question = text(source.question);
      label = question ? `Pregunta frecuente «${question}»` : 'Pregunta frecuente';
    } else if (source.type === 'tool') {
      const tool = text(source.tool);
      const base = tool ? ASSISTANT_TOOL_LABELS[tool] : undefined;
      const order = text(source.orderNumber);
      label = base ? (tool === 'estado_de_mi_pedido' && order ? `${base} #${order}` : base) : null;
    }
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
};

// ── 4c: la nota del asistente al derivar ──────────────────────────────────────

export interface HandoffNote {
  /** El resumen del modelo (2–3 líneas); `null` si el modelo no corrió (tope, falla, rescate). */
  summary: string | null;
  /** El motivo en castellano (`reasonLabel`). */
  reason: string | null;
}

/** La nota interna que deja el asistente al pasar la conversación a una persona (`systemCode: handoff_note`). */
export const handoffNoteOf = (message: Pick<ChatMessage, 'systemCode' | 'payload'>): HandoffNote | null => {
  if (message.systemCode !== 'handoff_note') return null;
  const handoff = record(record(message.payload)?.handoff);
  return { summary: text(handoff?.summary), reason: text(handoff?.reasonLabel) };
};

// ── 4b: la encuesta al cerrar ─────────────────────────────────────────────────

/** La encuesta que nombra un mensaje `csat_request` (cada cierre tiene la suya). */
export const csatRatingIdOf = (message: Pick<ChatMessage, 'systemCode' | 'payload'>): string | null =>
  message.systemCode === 'csat_request' ? text(record(message.payload)?.ratingId) : null;

/** Cómo quedó la encuesta, para el personal. */
export const CSAT_STATUS_LABEL: Readonly<Record<InboxCsat['status'], string>> = {
  pending: 'Esperando la calificación',
  answered: 'Calificó',
  expired: 'Venció sin respuesta',
  cancelled: 'Anulada: se reabrió la conversación',
};

/** Quién atendió el tramo calificado (sólo el personal lo ve). */
export const CSAT_SERVED_BY_LABEL: Readonly<Record<NonNullable<InboxCsat['servedBy']>, string>> = {
  assistant: 'atendió sólo el asistente',
  team: 'atendió el equipo',
  none: 'no la atendió nadie',
};

/** «4 de 5», o la situación si no respondió («Venció sin respuesta»). */
export const csatResultText = (csat: InboxCsat): string =>
  csat.status === 'answered' && csat.score !== null ? `${csat.score} de 5` : CSAT_STATUS_LABEL[csat.status];

// ── 4e: botones del cliente ───────────────────────────────────────────────────

export type CustomerActionKey = InboxAction['key'];

/**
 * El catálogo de botones del chat del cliente, en el orden en que los muestra la app (`acciones-del-cliente.ts`):
 * texto del botón, qué hace y el mensaje que manda (las de la app no mandan nada: abren su pantalla).
 */
export const CUSTOMER_ACTIONS: ReadonlyArray<{
  key: CustomerActionKey;
  label: string;
  kind: InboxAction['kind'];
  text: string | null;
  /** Qué pasa al tocarlo, para quien configura. */
  help: string;
}> = [
  {
    key: 'where_is_my_order',
    label: '¿Dónde está mi pedido?',
    kind: 'message',
    text: '¿Dónde está mi pedido?',
    help: 'Manda la pregunta; la contesta el asistente o el equipo.',
  },
  {
    key: 'repeat_last_order',
    label: 'Repetir mi último pedido',
    kind: 'app',
    text: null,
    help: 'Abre en la app el último pedido armado para confirmarlo. No manda mensaje.',
  },
  {
    key: 'payment_methods',
    label: 'Medios de pago',
    kind: 'message',
    text: '¿Qué medios de pago aceptan?',
    help: 'Manda la pregunta por los medios de pago.',
  },
  {
    key: 'talk_to_person',
    label: 'Hablar con una persona',
    kind: 'handoff',
    text: 'Quiero hablar con una persona.',
    help: 'Manda el pedido y la conversación pasa a alguien del equipo (el asistente no contesta).',
  },
];

/** En el orden del catálogo (el mismo en que los muestra la app), sin repetir. */
export const inCatalogOrder = (keys: readonly CustomerActionKey[]): CustomerActionKey[] =>
  CUSTOMER_ACTIONS.map((action) => action.key).filter((key) => keys.includes(key));

const ACTION_LABEL = new Map(CUSTOMER_ACTIONS.map((action) => [action.key as string, action.label]));

/**
 * El botón que generó un mensaje del cliente, si el `payload` lo indica (`action` con la clave, o `{ key }`): su texto,
 * para marcar el mensaje «Botón: …». Sin esa marca (o con una clave desconocida), `null`.
 */
export const customerActionOf = (message: Pick<ChatMessage, 'payload'>): string | null => {
  const raw = record(message.payload)?.action;
  const key = typeof raw === 'string' ? raw : text(record(raw)?.key);
  return key ? (ACTION_LABEL.get(key) ?? null) : null;
};

// ── 4a: menciones en las notas ────────────────────────────────────────────────

export type NotePart = { kind: 'text'; text: string } | { kind: 'mention'; text: string };

/**
 * Parte el texto de una nota y resalta las menciones (`@Nombre Apellido` de cada persona mencionada). Los nombres más
 * largos se buscan primero (para que «@Ana María» no quede como «@Ana»). Sin menciones, un solo trozo.
 */
export const splitMentions = (body: string, names: readonly string[]): NotePart[] => {
  const wanted = [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (wanted.length === 0) return [{ kind: 'text', text: body }];
  const parts: NotePart[] = [];
  let buffer = '';
  let index = 0;
  while (index < body.length) {
    const hit = body[index] === '@' ? wanted.find((name) => body.startsWith(`@${name}`, index)) : undefined;
    if (hit) {
      if (buffer) parts.push({ kind: 'text', text: buffer });
      buffer = '';
      parts.push({ kind: 'mention', text: `@${hit}` });
      index += hit.length + 1;
    } else {
      buffer += body[index];
      index += 1;
    }
  }
  if (buffer) parts.push({ kind: 'text', text: buffer });
  return parts;
};

/**
 * Lo que se está escribiendo después de una `@` (hasta el cursor, en la misma línea y hasta 40 caracteres), o `null`
 * si el cursor no está después de una `@` que empieza palabra.
 */
export const mentionQueryAt = (value: string, caret: number): { start: number; query: string } | null => {
  const before = value.slice(0, caret);
  // Con espacios (nombre y apellido): quien muestra la lista decide si sigue abierta (si alguien coincide).
  const match = /(^|\s)@([^@\n]{0,40})$/.exec(before);
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
};

/** Sin tildes ni mayúsculas, para filtrar por nombre. */
export const foldText = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
