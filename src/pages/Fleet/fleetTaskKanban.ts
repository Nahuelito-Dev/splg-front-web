import type { FleetTask } from '../../services/api/types';
import { formatDay, formatNumber } from '../../utils/format';
import type { Tone } from '../../utils/statusLabels';

export type FleetTaskStatus = FleetTask['status'];

/** Las columnas del tablero, en el orden de la vida de una tarea; son los estados reales de la API. */
export const KANBAN_COLUMNS: FleetTaskStatus[] = [
  'forecast',
  'scheduled',
  'in_progress',
  'overdue',
  'done',
  'cancelled',
];

/** Hecha o cancelada: no admite más cambios. */
export const isOpenTask = (status: FleetTaskStatus) => status !== 'done' && status !== 'cancelled';

export type DropAction = 'close' | 'cancel';

/**
 * Las únicas transiciones que existen en la API: una tarea abierta se cierra (`PATCH /fleet/tasks/:id/close`)
 * o se cancela (`/cancel`). El resto de los estados los fija el back, no se arrastra hacia ellos.
 */
export const dropAction = (task: FleetTask, target: FleetTaskStatus): DropAction | null => {
  if (!isOpenTask(task.status) || task.status === target) return null;
  if (target === 'done') return 'close';
  if (target === 'cancelled') return 'cancel';
  return null;
};

export const groupByStatus = (tasks: FleetTask[]): Record<FleetTaskStatus, FleetTask[]> => {
  const groups: Record<FleetTaskStatus, FleetTask[]> = {
    forecast: [],
    scheduled: [],
    in_progress: [],
    overdue: [],
    done: [],
    cancelled: [],
  };
  for (const task of tasks) groups[task.status].push(task);
  return groups;
};

/** Color del vencimiento: rojo si venció, ámbar si vence pronto, verde si está vigente, neutro si ya está cerrada. */
export const dueTone = (task: FleetTask): Tone => {
  if (!isOpenTask(task.status)) return 'neutral';
  if (task.expirationStatus === 'expired') return 'danger';
  if (task.expirationStatus === 'due_soon') return 'warn';
  if (task.expirationStatus === 'current') return 'success';
  return 'neutral';
};

const plural = (n: number) => (n === 1 ? 'día' : 'días');

/** "Vence el 5 oct 2026 · en 3 días", "Venció hace 2 días", "Vence a los 80.000 km" o "Sin vencimiento". */
export const dueText = (task: FleetTask): string => {
  if (!task.dueAt) return task.dueKm !== null ? `Vence a los ${formatNumber(task.dueKm)} km` : 'Sin vencimiento';
  const day = formatDay(task.dueAt);
  if (!isOpenTask(task.status) || task.daysUntilDue === null) return `Vencía el ${day}`;
  const days = task.daysUntilDue;
  if (days < 0) return `Venció hace ${-days} ${plural(-days)}`;
  if (days === 0) return `Vence hoy · ${day}`;
  return `Vence en ${days} ${plural(days)} · ${day}`;
};
