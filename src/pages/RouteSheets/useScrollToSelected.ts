import { useCallback, useEffect, useRef } from 'react';

/**
 * Lleva la lista hasta la parada elegida (por ejemplo, tocándola en el mapa): `rowRef(id)` va en cada fila. Con
 * `block: 'nearest'` no se mueve nada si ya se ve; `scroll-mt-*` en la fila deja lugar a la barra superior.
 */
export const useScrollToSelected = (selectedId: string | null) => {
  const rows = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!selectedId) return;
    rows.current.get(selectedId)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  return useCallback(
    (orderId: string) => (element: HTMLElement | null) => {
      if (element) rows.current.set(orderId, element);
      else rows.current.delete(orderId);
    },
    [],
  );
};
