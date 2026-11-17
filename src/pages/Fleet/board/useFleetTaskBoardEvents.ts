import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSocketContext } from '../../../context/useSocketContext';
import type { FleetTaskBoard, FleetTaskBoardEvent } from '../../../services/api/types';
import type { FleetTaskBoardFilters } from '../../../services/api/fleet';
import { queryKeys } from '../../../services/queries/queryKeys';
import { findCard, matchesBoardFilters, upsertCard } from './boardModel';

/** Lo que el back emite a la sala del panel de la empresa cuando una tarea cambia. */
export const FLEET_TASK_EVENT = 'fleet:task';

/** Aplica el evento a un tablero de la caché; `null` si no hay nada que cambiar. */
export const applyBoardEvent = (
  board: FleetTaskBoard,
  event: FleetTaskBoardEvent,
  filters: FleetTaskBoardFilters,
): FleetTaskBoard | null => {
  const { card } = event;
  const current = findCard(board, card.id);
  // Un evento viejo (llegó después de uno más nuevo) no pisa; `reordered` no cambia `updatedAt`.
  if (current && current.card.updatedAt > card.updatedAt) return null;
  if (!current) {
    // Sin la tarjeta, sólo entra si el tablero la mostraría: lo que el evento no permite evaluar (texto, fecha) no se adivina.
    if (!card.column || filters.q || filters.dueBefore || filters.category) return null;
    if (!matchesBoardFilters(card, filters)) return null;
  }
  return upsertCard(board, card);
};

/** Mantiene el tablero al día con `fleet:task`, sin recargarlo entero. */
export const useFleetTaskBoardEvents = (enabled: boolean) => {
  const { subscribe } = useSocketContext();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribe<FleetTaskBoardEvent>(FLEET_TASK_EVENT, (event) => {
      if (!event?.card) return;
      const prefix = [...queryKeys.fleet.all, 'board'];
      for (const [key, board] of queryClient.getQueriesData<FleetTaskBoard>({ queryKey: prefix })) {
        if (!board) continue;
        const next = applyBoardEvent(board, event, (key[2] ?? {}) as FleetTaskBoardFilters);
        if (next) queryClient.setQueryData(key, next);
      }
    });
  }, [enabled, subscribe, queryClient]);
};
