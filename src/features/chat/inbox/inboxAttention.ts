import type { InboxSummary } from '../../../services/api/types';

/**
 * Cuántas conversaciones piden atención, para la insignia de «Mensajes»: el mayor de los tres números del resumen
 * (sin asignar, esperando a una persona, con algo sin leer). Los tres cuentan conversaciones y se pisan entre sí (una
 * sin asignar puede esperar a una persona y tener algo sin leer), y la API no da cuántas son en total sin repetir: el
 * mayor es el piso de ese total y nunca cuenta dos veces la misma conversación. El detalle va en el nombre accesible.
 */
export const inboxAttention = (summary: InboxSummary): number =>
  Math.max(summary.unassigned, summary.awaitingHuman, summary.unread, 0);

/** «3 sin asignar, 1 esperando a alguien del equipo, 2 con mensajes sin leer» (lo que es cero no se nombra). */
export const inboxAttentionLabel = (summary: InboxSummary): string => {
  const parts = [
    summary.unassigned > 0 ? `${summary.unassigned} sin asignar` : null,
    summary.awaitingHuman > 0 ? `${summary.awaitingHuman} esperando a alguien del equipo` : null,
    summary.unread > 0 ? `${summary.unread} con mensajes sin leer` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? `Mensajes: ${parts.join(', ')}` : 'Mensajes: nada pendiente';
};
