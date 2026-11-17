import type { FleetTaskBoard, FleetTaskBoardCard, MoveFleetTaskBody } from '../../../services/api/types';

export type BoardColumnId = keyof FleetTaskBoard['columns'];
export type MoveTarget = MoveFleetTaskBody['to'];

export const BOARD_COLUMNS: { id: BoardColumnId; label: string }[] = [
  { id: 'forecast', label: 'Pronosticadas' },
  { id: 'scheduled', label: 'Programadas' },
  { id: 'in_progress', label: 'En curso' },
  { id: 'done', label: 'Hechas (30 días)' },
];

export const columnLabel = (id: BoardColumnId) => BOARD_COLUMNS.find((c) => c.id === id)?.label ?? id;

export const emptyBoard = (): FleetTaskBoard => ({
  columns: { forecast: [], scheduled: [], in_progress: [], done: [] },
  cancelledCount: 0,
});

/** La columna donde está una tarjeta, o `null` si no está en el tablero. */
export const findCard = (board: FleetTaskBoard, id: string) => {
  for (const { id: column } of BOARD_COLUMNS) {
    const index = board.columns[column].findIndex((card) => card.id === id);
    if (index >= 0) return { column, index, card: board.columns[column][index] };
  }
  return null;
};

/** Sin la tarjeta en ninguna columna. */
const without = (board: FleetTaskBoard, id: string): FleetTaskBoard => ({
  ...board,
  columns: {
    forecast: board.columns.forecast.filter((c) => c.id !== id),
    scheduled: board.columns.scheduled.filter((c) => c.id !== id),
    in_progress: board.columns.in_progress.filter((c) => c.id !== id),
    done: board.columns.done.filter((c) => c.id !== id),
  },
});

const byPosition = (a: FleetTaskBoardCard, b: FleetTaskBoardCard) => a.position - b.position;

/**
 * Pone la tarjeta (con sus datos nuevos) en su columna. Las tres columnas de trabajo van por `position`; las hechas,
 * lo más reciente primero (el back las manda así: se respeta el lugar que ya tenía o va al principio).
 */
export const upsertCard = (board: FleetTaskBoard, card: FleetTaskBoardCard): FleetTaskBoard => {
  const previous = findCard(board, card.id);
  const cleared = without(board, card.id);
  if (!card.column) return { ...cleared, cancelledCount: board.cancelledCount + (previous ? 1 : 0) };
  const target = cleared.columns[card.column];
  const next =
    card.column === 'done'
      ? previous?.column === 'done'
        ? [...target.slice(0, previous.index), card, ...target.slice(previous.index)]
        : [card, ...target]
      : [...target, card].sort(byPosition);
  return { ...cleared, columns: { ...cleared.columns, [card.column]: next } };
};

/** Dónde queda una tarjeta soltada en `index` de la columna `to` (sin contarse a sí misma). */
export const dropNeighbours = (board: FleetTaskBoard, id: string, to: BoardColumnId, index: number) => {
  const others = board.columns[to].filter((card) => card.id !== id);
  const at = Math.max(0, Math.min(index, others.length));
  return { others, at, afterId: at > 0 ? others[at - 1].id : undefined, beforeId: others[at]?.id };
};

/** El cuerpo de `move`: la tarjeta queda después de la anterior; si va primera, antes de la que era primera. */
export const moveBody = (
  board: FleetTaskBoard,
  card: FleetTaskBoardCard,
  to: MoveTarget,
  index: number,
  scheduledAt?: string,
): MoveFleetTaskBody => {
  const { afterId, beforeId } = dropNeighbours(board, card.id, to, index);
  return {
    to,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(afterId ? { afterId } : beforeId ? { beforeId } : {}),
    expectedUpdatedAt: card.updatedAt,
  };
};

/** El tablero tal como queda al mover la tarjeta, sin esperar al back. */
export const applyMove = (
  board: FleetTaskBoard,
  id: string,
  to: MoveTarget,
  index: number,
  scheduledAt?: string,
): FleetTaskBoard => {
  const found = findCard(board, id);
  if (!found) return board;
  const { others, at } = dropNeighbours(board, id, to, index);
  const prev = at > 0 ? others[at - 1].position : undefined;
  const next = others[at]?.position;
  const position =
    prev !== undefined && next !== undefined
      ? (prev + next) / 2
      : prev !== undefined
        ? prev + 1024
        : (next ?? 1024) - 1024;
  const moved: FleetTaskBoardCard = {
    ...found.card,
    column: to,
    status: found.card.status === 'overdue' ? 'overdue' : to,
    scheduledAt: to === 'forecast' ? null : (scheduledAt ?? found.card.scheduledAt),
    position,
  };
  return upsertCard(board, moved);
};

/** Una tarjeta nueva en el tablero sólo entra si pasa los filtros que el back no puede aplicarle al evento. */
export const matchesBoardFilters = (card: FleetTaskBoardCard, filters: { carId?: string; employeeId?: string }) =>
  (!filters.carId || card.car?.id === filters.carId) &&
  (!filters.employeeId || card.assignee?.employeeId === filters.employeeId);
