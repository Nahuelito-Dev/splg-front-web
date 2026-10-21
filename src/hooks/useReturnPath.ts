import { useLocation } from 'react-router-dom';

/** A dónde vuelve un formulario de página: la ruta que le pasó quien lo abrió (`state.from`) o la lista. */
export const useReturnPath = (fallback: string): string => {
  const state: unknown = useLocation().state;
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = state.from;
    if (typeof from === 'string' && from.startsWith('/')) return from;
  }
  return fallback;
};
