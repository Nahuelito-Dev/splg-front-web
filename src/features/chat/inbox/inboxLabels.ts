import type { InboxChannel, InboxParty } from '../../../services/api/inbox';
import type { InboxConversation } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { ORDER_STATUS, type Label } from '../../../utils/statusLabels';

/** Cómo se nombra cada canal de la bandeja. */
export const CHANNEL_LABEL: Record<InboxChannel, Label> = {
  staff_customer: { text: 'Cliente', tone: 'info' },
  staff_driver: { text: 'Chofer', tone: 'neutral' },
};

/** Quién es la otra punta de una conversación (el cliente o el chofer). */
export const counterpartName = (conversation: InboxConversation): string =>
  conversation.counterpart.displayName || (conversation.channel === 'staff_customer' ? 'Cliente' : 'Chofer');

/** «Pedido #A1B2C3» o «Consulta general». */
export const subjectLabel = (conversation: Pick<InboxConversation, 'subjectType' | 'order'>): string =>
  conversation.subjectType === 'order' && conversation.order
    ? `Pedido #${conversation.order.number}`
    : 'Consulta general';

const CLOSED_REASON: Record<NonNullable<InboxConversation['closedReason']>, string> = {
  manual: 'Cerrada por la empresa',
  inactivity: 'Cerrada por inactividad',
  ticket_closed: 'Cerrada',
  driver_changed: 'El pedido pasó a otro chofer',
};

/** El estado de una conversación en una línea: abierta y quién atiende, o por qué se cerró. */
export const statusLine = (conversation: InboxConversation, myUserId: string | undefined): string => {
  if (conversation.status === 'closed') {
    return conversation.closedReason ? CLOSED_REASON[conversation.closedReason] : 'Cerrada';
  }
  if (!conversation.assignedTo) return 'Sin asignar: en la cola';
  return conversation.assignedTo.userId === myUserId ? 'La atendés vos' : `Atiende ${conversation.assignedTo.fullName}`;
};

/** Cómo se nombra a cada punta en el hilo de una conversación (para las citas). */
export const partyNamer =
  (conversation: InboxConversation) =>
  (party: InboxParty): string =>
    party === 'company' ? 'Equipo' : party === 'system' ? 'Sistema' : counterpartName(conversation);

/** «Vuelve a atender el lunes 16/11 a las 9:00». */
export const reopensAt = (nextOpenAt: string | null | undefined): string =>
  nextOpenAt ? `Vuelve a atender el ${formatDateTime(nextOpenAt)}` : 'Fuera del horario de atención';

/** Un minuto hábil en palabras: «12 min» o «1 h 5 min». */
export const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

const isOrderStatus = (value: string): value is keyof typeof ORDER_STATUS => value in ORDER_STATUS;

/** El estado del pedido de una conversación (llega como texto). */
export const orderStatusLabel = (status: string): Label =>
  isOrderStatus(status) ? ORDER_STATUS[status] : { text: status, tone: 'neutral' };

const ZONE = 'America/Argentina/Buenos_Aires';
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const localParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    month: get('month'),
    date: get('day'),
    time: `${get('hour')}:${get('minute')}`,
    weekday,
  };
};

/**
 * `{{horario.proximo}}` como lo escribe el back (`textoDeLaProximaAtencion`): «ahora» si atiende, «hoy a las 09:00»,
 * «mañana a las 09:00» o «el lunes 16/11 a las 09:00», en hora argentina.
 */
export const nextOpeningText = (openNow: boolean, nextOpenAt: string | null, now = new Date()): string | null => {
  if (openNow) return 'ahora';
  if (!nextOpenAt) return null;
  const opens = localParts(new Date(nextOpenAt));
  if (opens.day === localParts(now).day) return `hoy a las ${opens.time}`;
  if (opens.day === localParts(new Date(now.getTime() + 864e5)).day) return `mañana a las ${opens.time}`;
  return `el ${DAYS[opens.weekday]} ${opens.date}/${opens.month} a las ${opens.time}`;
};
