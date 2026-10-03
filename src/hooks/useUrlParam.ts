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

/**
 * Varios filtros de una lista en la URL, con un solo `setParams` para que cambiarlos de golpe (limpiar todo,
 * elegir un tipo que anula otros) no se pisen entre sí. Los valores por defecto no ensucian la URL.
 */
export const useUrlParams = <K extends string>(
  defaults: Record<K, string>,
): [Record<K, string>, (patch: Partial<Record<K, string>>) => void] => {
  const [params, setParams] = useSearchParams();
  const keys = Object.keys(defaults) as K[];
  const values = Object.fromEntries(keys.map((key) => [key, params.get(key) ?? defaults[key]])) as Record<K, string>;
  const setValues = (patch: Partial<Record<K, string>>) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        for (const [key, next] of Object.entries<string | undefined>(patch)) {
          if (next === undefined || next === defaults[key as K]) updated.delete(key);
          else updated.set(key, next);
        }
        return updated;
      },
      { replace: true },
    );
  return [values, setValues];
};
