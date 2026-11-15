import type { Ticket } from '../../services/api/types';

/**
 * Hasta dónde leyó la otra punta el hilo del ticket, si la API lo manda (`TicketDto.counterpartLastReadSeq`, que el
 * back suma después de CH2). Sin el dato, 0: el ✓✓ llega con el `chat:read` en vivo.
 */
export const ticketReadSeq = (ticket: Ticket): number => {
  const value: unknown = (ticket as Ticket & { counterpartLastReadSeq?: unknown }).counterpartLastReadSeq;
  return typeof value === 'number' ? value : 0;
};
