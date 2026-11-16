import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCompanyTheme, getCompanyTheme, previewCompanyTheme, putCompanyTheme } from '../api/companyTheme';
import type { CompanyThemeBody } from '../api/types';
import { currentCompanyContext, useCompanyContext } from './companyContext';
import { queryKeys } from './queryKeys';

const keys = queryKeys.companyTheme;

/**
 * La clave del tema lleva la identidad de la empresa que se mira (`company:<uid>`, `support:<sesión>`,
 * `owned:<empresa>`): lo que responde para una empresa nunca se lee como el tema de otra.
 */
export const companyThemeKey = (context: string) => keys.detail(context);

/** La respuesta llegó cuando ya se mira otra empresa: no se escribe la caché ni se aplica nada. */
export class StaleCompanyContextError extends Error {
  constructor() {
    super('Cambió la empresa que se mira');
    this.name = 'StaleCompanyContextError';
  }
}

export const isStaleCompanyContext = (error: unknown): boolean => error instanceof StaleCompanyContextError;

/** Corre el pedido en el contexto de ahora y falla con `StaleCompanyContextError` si al responder ya es otro. */
const inSameContext = async <T>(run: () => Promise<T>): Promise<{ context: string | null; result: T }> => {
  const context = currentCompanyContext();
  const result = await run();
  if (currentCompanyContext() !== context) throw new StaleCompanyContextError();
  return { context, result };
};

/** El tema de la empresa del contexto. En la plataforma no hay empresa: no se pide. */
export const useCompanyTheme = (enabled: boolean) => {
  const context = useCompanyContext();
  return useQuery({
    queryKey: companyThemeKey(context ?? 'none'),
    queryFn: getCompanyTheme,
    enabled: enabled && context !== null,
    staleTime: 10 * 60_000,
    retry: false,
  });
};

/** Vista previa sin guardar: devuelve tokens y contraste, o el 400 de contraste. */
export const usePreviewCompanyTheme = () =>
  useMutation({
    mutationFn: async (body: CompanyThemeBody) => (await inSameContext(() => previewCompanyTheme(body))).result,
  });

export const useSaveCompanyTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyThemeBody) => inSameContext(() => putCompanyTheme(body)),
    onSuccess: ({ context, result }) => {
      if (context === null || currentCompanyContext() !== context) return;
      queryClient.setQueryData(companyThemeKey(context), result);
    },
  });
};

export const useResetCompanyTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => inSameContext(deleteCompanyTheme),
    onSuccess: ({ context }) => {
      if (context === null || currentCompanyContext() !== context) return;
      return queryClient.invalidateQueries({ queryKey: companyThemeKey(context) });
    },
  });
};
