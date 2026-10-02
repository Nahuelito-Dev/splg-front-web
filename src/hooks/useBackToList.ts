import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Estado de navegación que las listas le pasan a la ficha para que "Volver" regrese a la lista tal como estaba. */
export const FROM_LIST_STATE = { fromList: true } as const;

const cameFromList = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && 'fromList' in state && state.fromList === true;

/**
 * "Volver" de una ficha: si se llegó desde la lista, retrocede en el historial (la lista conserva su búsqueda,
 * filtros y página, que viven en la URL); si se entró por un enlace directo, va a la lista con sus valores por defecto.
 */
export const useBackToList = (listPath: string) => {
  const navigate = useNavigate();
  const state: unknown = useLocation().state;
  const fromList = cameFromList(state);
  return useCallback(() => (fromList ? navigate(-1) : navigate(listPath)), [fromList, navigate, listPath]);
};
