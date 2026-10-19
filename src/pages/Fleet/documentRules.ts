import type { FleetTask } from '../../services/api/types';

const STATE_ORDER: Record<NonNullable<FleetTask['expirationStatus']> | 'none', number> = {
  expired: 0,
  due_soon: 1,
  current: 2,
  none: 3,
};

const isOpen = (task: FleetTask) => task.status !== 'done' && task.status !== 'cancelled';

/**
 * Los documentos de un vehículo o legajo en el orden en que hay que atenderlos: primero lo vencido, después lo que
 * vence pronto, lo vigente y lo que no tiene vencimiento; dentro de cada grupo, el que vence antes. Las tareas
 * canceladas no son documentación y no se listan.
 */
export const documentsToReview = (tasks: FleetTask[]): FleetTask[] =>
  tasks
    .filter((task) => task.status !== 'cancelled')
    .sort((a, b) => {
      const byState =
        STATE_ORDER[isOpen(a) ? (a.expirationStatus ?? 'none') : 'none'] -
        STATE_ORDER[isOpen(b) ? (b.expirationStatus ?? 'none') : 'none'];
      if (byState !== 0) return byState;
      const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
      return dueA - dueB;
    });

/** «Venció hace 3 días» / «Vence hoy» / «Vence en 12 días», según el estado que calculó la API. */
export const documentDueText = (task: Pick<FleetTask, 'daysUntilDue' | 'expirationStatus'>): string | null => {
  if (task.daysUntilDue === null) return null;
  const days = Math.abs(task.daysUntilDue);
  const plural = days === 1 ? 'día' : 'días';
  if (task.expirationStatus === 'expired') return days === 0 ? 'Venció hoy' : `Venció hace ${days} ${plural}`;
  return days === 0 ? 'Vence hoy' : `Vence en ${days} ${plural}`;
};
