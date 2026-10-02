import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * La pestaña activa vive en la URL (`?tab=`): se puede compartir el enlace y recargar sin perder el lugar.
 * La pestaña por defecto no ensucia la URL; una clave desconocida cae en ella.
 */
export const useProfileTab = (keys: string[], fallback: string): [string, (key: string) => void] => {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const value = raw && keys.includes(raw) ? raw : fallback;
  const setValue = useCallback(
    (key: string) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (key === fallback) next.delete('tab');
          else next.set('tab', key);
          return next;
        },
        { replace: true },
      ),
    [fallback, setParams],
  );
  return [value, setValue];
};
