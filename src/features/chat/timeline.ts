import type { MessageDto, Ticket } from '../../services/api/types';
import { TICKET_STATUS } from '../../utils/statusLabels';

/** Un hito de la vida de un ticket, para la línea de tiempo de la ficha (auditoría). */
export interface TimelineEntry {
  key: string;
  at: string;
  text: string;
}

const isStatus = (value: unknown): value is keyof typeof TICKET_STATUS =>
  typeof value === 'string' && value in TICKET_STATUS;

const statusText = (value: unknown) => (isStatus(value) ? TICKET_STATUS[value].text : String(value ?? '—'));

/**
 * La línea de tiempo del ticket: creado, primera respuesta y cada cambio de estado (los mensajes de sistema
 * `ticket_status_changed` del hilo). Si el hilo no trae el cierre o la resolución, salen de las fechas del ticket.
 * Ordenada de lo más viejo a lo más nuevo.
 */
export const buildTimeline = (ticket: Ticket, messages: MessageDto[]): TimelineEntry[] => {
  const entries: TimelineEntry[] = [
    {
      key: 'created',
      at: ticket.createdAt,
      text: ticket.openedBy === 'platform' ? 'Lo abrió el soporte' : 'Lo abrió la empresa',
    },
  ];
  if (ticket.firstResponseAt) entries.push({ key: 'first', at: ticket.firstResponseAt, text: 'Primera respuesta' });
  const changes = messages.filter((m) => m.kind === 'system' && m.systemCode === 'ticket_status_changed');
  for (const m of changes) {
    entries.push({
      key: `status-${m.seq}`,
      at: m.createdAt,
      text: `${statusText(m.payload?.from)} → ${statusText(m.payload?.to)}`,
    });
  }
  const reached = (status: string) => changes.some((m) => m.payload?.to === status);
  if (ticket.resolvedAt && !reached('resolved'))
    entries.push({ key: 'resolved', at: ticket.resolvedAt, text: 'Resuelto' });
  if (ticket.closedAt && !reached('closed')) entries.push({ key: 'closed', at: ticket.closedAt, text: 'Cerrado' });
  return entries.sort((a, b) => a.at.localeCompare(b.at));
};
