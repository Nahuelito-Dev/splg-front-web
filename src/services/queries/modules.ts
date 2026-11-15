import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompanyModules, getPlatformCompanyModules, setPlatformCompanyModule, type ModuleKey } from '../api/modules';
import type { CompanyModule, SetCompanyModuleBody } from '../api/types';
import { useCompanyContext } from './companyContext';
import { queryKeys } from './queryKeys';

const companyKeys = queryKeys.companyModules;
const platformKeys = queryKeys.platformModules;

/**
 * Cada cuánto se vuelven a pedir los módulos de la empresa. La plataforma los cambia sin avisar por socket: con esto
 * un módulo apagado desaparece del menú en menos de un minuto sin recargar (y al volver a la pestaña, enseguida).
 */
export const COMPANY_MODULES_REFRESH_MS = 30_000;

/**
 * La clave lleva la identidad de la empresa que se mira (`company:<uid>`, `support:<sesión>`, `owned:<empresa>`):
 * los módulos de una empresa nunca se leen como los de otra.
 */
export const companyModulesKey = (context: string) => companyKeys.detail(context);

/** `GET /v2/company/modules` de la empresa del contexto. En la plataforma no hay empresa: no se pide. */
export const useCompanyModules = () => {
  const context = useCompanyContext();
  return useQuery({
    queryKey: companyModulesKey(context ?? 'none'),
    queryFn: getCompanyModules,
    enabled: context !== null,
    staleTime: COMPANY_MODULES_REFRESH_MS,
    refetchInterval: COMPANY_MODULES_REFRESH_MS,
    // Sin `retry` propio: rige el `shouldRetry` del queryClient (un 4xx no se reintenta).
    refetchOnWindowFocus: true,
  });
};

export interface ModuleAvailability {
  /** Habilitado por la plataforma, por clave. `null`: no se sabe (plataforma, error o todavía cargando). */
  enabledByKey: Readonly<Record<string, boolean>> | null;
  /** Todavía no respondió la primera vez. */
  loading: boolean;
}

/**
 * Qué módulos le habilitó la plataforma a la empresa que se mira. Lo que no está en el catálogo es núcleo; mientras no
 * se sabe (o si no se pudo leer) no se esconde nada: el back igual responde 403 `MODULE_DISABLED`.
 */
export const useModuleAvailability = (): ModuleAvailability => {
  const context = useCompanyContext();
  const { data, isPending } = useCompanyModules();
  if (context === null) return { enabledByKey: null, loading: false };
  if (!data) return { enabledByKey: null, loading: isPending };
  return { enabledByKey: Object.fromEntries(data.map((m) => [m.key, m.enabled])), loading: false };
};

/** Un módulo apagado para la empresa (sabido): `false` si está habilitado, no es del catálogo o todavía no se sabe. */
export const isModuleOff = (enabledByKey: ModuleAvailability['enabledByKey'], key: string | undefined): boolean =>
  Boolean(key && enabledByKey && enabledByKey[key] === false);

/**
 * Para lo de un módulo que vive dentro de una pantalla del núcleo (la tarjeta de recupero en la ficha del cliente, la
 * ventana de taller en la del vehículo): `ready` es «se puede pedir» (se sabe que está habilitado, o no se pudo saber y
 * decide el back); `off`, que se sabe apagado. Mientras carga no se pide, así no aparece un 403 que enseguida se va.
 */
export const useModuleGate = (key: ModuleKey): { ready: boolean; off: boolean } => {
  const { enabledByKey, loading } = useModuleAvailability();
  const off = isModuleOff(enabledByKey, key);
  return { ready: !loading && !off, off };
};

/** `GET /v2/platform/companies/:id/modules`: los módulos de una empresa para el administrador general. */
export const usePlatformCompanyModules = (companyId: string | undefined) =>
  useQuery({
    queryKey: platformKeys.detail(companyId ?? ''),
    queryFn: () => getPlatformCompanyModules(companyId ?? ''),
    enabled: Boolean(companyId),
  });

/** Los módulos de varias empresas a la vez (la matriz empresa × módulo), una consulta por empresa. */
export const usePlatformCompaniesModules = (companyIds: string[]) =>
  useQueries({
    queries: companyIds.map((id) => ({
      queryKey: platformKeys.detail(id),
      queryFn: () => getPlatformCompanyModules(id),
    })),
  });

export interface SetModuleVariables {
  companyId: string;
  key: string;
  body: SetCompanyModuleBody;
}

/**
 * Cambia la excepción de un módulo para una empresa. Lo que responde reemplaza ese módulo en la lista de la empresa
 * (sin esperar otra consulta) y se refresca el resto: el impacto de los otros módulos y, si el administrador general
 * opera la empresa propia, el menú de esa empresa.
 */
export const useSetPlatformCompanyModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, key, body }: SetModuleVariables) => setPlatformCompanyModule(companyId, key, body),
    onSuccess: (saved, { companyId }) => {
      queryClient.setQueryData(platformKeys.detail(companyId), (current: CompanyModule[] | undefined) =>
        current?.map((m) => (m.key === saved.key ? saved : m)),
      );
      void queryClient.invalidateQueries({ queryKey: platformKeys.detail(companyId) });
      void queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
};
