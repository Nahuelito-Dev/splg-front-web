import { useCallback, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

/**
 * Un filtro de lista que vive en la URL (`?clave=valor`): al volver de una ficha la lista conserva el filtro,
 * y el enlace se puede compartir. El valor por defecto no ensucia la URL. No agrega entradas al historial.
 */
export const useUrlParam = (key: string, fallback: string): [string, (value: string) => void] => {
  const [params, setParams] = useSearchParams();
  const state: unknown = useLocation().state;
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
        { replace: true, state },
      ),
    [key, fallback, setParams, state],
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
  const state: unknown = useLocation().state;
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
      // El `state` se conserva: lleva la marca de «vine de la lista» que usa «Volver».
      { replace: true, state },
    );
  return [values, setValues];
};

/** Tamaños de página que ofrece la tabla. */
export const PAGE_SIZES = [10, 25, 50] as const;

/**
 * Filtros de una lista más su página y su tamaño, todo en la URL (`?page=3&size=25`, página base 1): al volver de una
 * ficha la lista queda donde estaba. Cambiar un filtro o el tamaño vuelve a la primera página en el mismo `setParams`,
 * así no se pisan entre sí. Un valor inválido cae al por defecto.
 */
export const useUrlPagedParams = <K extends string>(defaults: Record<K, string>, pageSize: number) => {
  const [values, setValues] = useUrlParams<K | 'page' | 'size'>({ ...defaults, page: '1', size: String(pageSize) });
  const { page, size, ...filters } = values;
  const parsedSize = Number.parseInt(size, 10);
  const effectiveSize = (PAGE_SIZES as readonly number[]).includes(parsedSize) ? parsedSize : pageSize;
  const pagination = { page: Math.max(0, (Number.parseInt(page, 10) || 1) - 1), pageSize: effectiveSize };
  type Patch = Partial<Record<K | 'page' | 'size', string>>;
  const setFilters = (patch: Partial<Record<K, string>>, options: { keepPage?: boolean } = {}) =>
    setValues((options.keepPage ? patch : { ...patch, page: '1' }) as Patch);
  const setPagination = (model: { page: number; pageSize?: number }) => {
    const sizeChanged = model.pageSize !== undefined && model.pageSize !== effectiveSize;
    setValues({
      page: sizeChanged ? '1' : String(model.page + 1),
      ...(model.pageSize === undefined ? {} : { size: String(model.pageSize) }),
    } as Patch);
  };
  return [filters as unknown as Record<K, string>, setFilters, pagination, setPagination] as const;
};

/** Si la página de la URL quedó fuera de rango (`?page=999`, o se borró la última fila), vuelve a la última que existe. */
export const useClampPage = (
  pagination: { page: number; pageSize: number },
  total: number | undefined,
  setPagination: (model: { page: number }) => void,
) => {
  const lastPage = total === undefined || total === 0 ? 0 : Math.ceil(total / pagination.pageSize) - 1;
  useEffect(() => {
    if (total !== undefined && pagination.page > lastPage) setPagination({ page: lastPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, pagination.page, lastPage]);
};
