import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Un filtro de lista que vive en la URL (`?clave=valor`): al volver de una ficha la lista conserva el filtro,
 * y el enlace se puede compartir. El valor por defecto no ensucia la URL. No agrega entradas al historial.
 */
export const useUrlParam = (key: string, fallback: string): [string, (value: string) => void] => {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? fallback;
  const setValue = useCallback(
    (next: string) =>
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          if (next === fallback) updated.delete(key);
          else updated.set(key, next);
          return updated;
        },
        { replace: true },
      ),
    [key, fallback, setParams],
  );
  return [value, setValue];
};
