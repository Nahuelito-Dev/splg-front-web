import { useCallback, useState } from 'react';

/** Un booleano que sobrevive a la recarga (localStorage). Sin storage, vive sólo en memoria. */
export const useStoredFlag = (key: string, initial = false) => {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : stored === '1';
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // Sin localStorage el estado no se recuerda: no rompe nada.
      }
    },
    [key],
  );

  return [value, set] as const;
};
