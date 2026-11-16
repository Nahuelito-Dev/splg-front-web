import type { InboxSummary } from '../../../services/api/types';

/**
 * Cuántas conversaciones piden atención, para la insignia de «Mensajes»: `attention` del resumen, que la API cuenta una
 * vez cada una (sin asignar, esperando a una persona o con algo sin leer). Las menciones sin leer no son conversaciones:
 * si no hay otra cosa, la insignia muestra las menciones (alguien del equipo espera a quien mira).
 */
export const inboxAttention = (summary: InboxSummary): number => Math.max(summary.attention, 0) || summary.mentions;

/**
 * «3 sin asignar, 1 esperando a alguien del equipo, 2 con mensajes sin leer, 1 mención sin leer» (lo que es cero no se
 * nombra).
 */
export const inboxAttentionLabel = (summary: InboxSummary): string => {
  const parts = [
    summary.unassigned > 0 ? `${summary.unassigned} sin asignar` : null,
    summary.awaitingHuman > 0 ? `${summary.awaitingHuman} esperando a alguien del equipo` : null,
    summary.unread > 0 ? `${summary.unread} con mensajes sin leer` : null,
    summary.mentions > 0
      ? `${summary.mentions} ${summary.mentions === 1 ? 'mención sin leer' : 'menciones sin leer'}`
      : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? `Mensajes: ${parts.join(', ')}` : 'Mensajes: nada pendiente';
};
