import { useCallback, useEffect, useRef, useState } from 'react';

interface Versioned {
  updatedAt: string | null;
  isDefault: boolean;
}

const versionOf = (config: Versioned) => `${config.updatedAt ?? 'none'}|${config.isDefault}`;

interface Options<T extends Versioned> {
  /** La última configuración que llegó de la API. */
  config: T;
  /** El formulario tiene cambios sin guardar. */
  isDirty: boolean;
  /** Vuelca una configuración en el formulario (descarta lo tipeado). */
  load: (config: T) => void;
}

/**
 * Mantiene el formulario alineado con la API sin pisar lo que la persona está tipeando: si llega otra versión y no
 * hay cambios, se carga sola; si hay cambios sin guardar, se avisa (`stale`) y se carga recién con `acceptStale`.
 * Lo que guarda la propia persona se vuelca con `adopt`, que no cuenta como cambio ajeno.
 */
export const useConfigSync = <T extends Versioned>({ config, isDirty, load }: Options<T>) => {
  const seen = useRef(versionOf(config));
  const [stale, setStale] = useState(false);

  const adopt = useCallback(
    (next: T) => {
      seen.current = versionOf(next);
      setStale(false);
      load(next);
    },
    [load],
  );

  useEffect(() => {
    if (versionOf(config) === seen.current) return;
    if (isDirty) setStale(true);
    else adopt(config);
  }, [config, isDirty, adopt]);

  return { stale, adopt, acceptStale: () => adopt(config) };
};
