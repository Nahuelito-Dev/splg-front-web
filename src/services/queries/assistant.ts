import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  copyCompanyFaqTemplates,
  createCompanyFaq,
  createPlatformFaq,
  createPlatformTemplate,
  deleteCompanyFaq,
  deletePlatformFaq,
  deletePlatformTemplate,
  listCompanyFaqs,
  listCompanyTemplates,
  listPlatformFaqs,
  listPlatformTemplates,
  updateCompanyFaq,
  updatePlatformFaq,
  updatePlatformTemplate,
} from '../api/assistant';
import type {
  CreateAssistantFaqBody,
  CreateAssistantFaqTemplateBody,
  CreatePlatformAssistantFaqBody,
  UpdateAssistantFaqBody,
  UpdateAssistantFaqTemplateBody,
  UpdatePlatformAssistantFaqBody,
} from '../api/types';
import { useCompanyContext } from './companyContext';
import { useModuleGate } from './modules';
import { queryKeys } from './queryKeys';

const companyKeys = queryKeys.assistantFaqs;
const platformKeys = queryKeys.platformAssistantFaqs;
const templateKeys = queryKeys.platformAssistantTemplates;

/**
 * La clave lleva la empresa que se mira (`company:<uid>`, `support:<sesión>`, `owned:<empresa>`): la base de una
 * distribuidora nunca se muestra como la de otra al cambiar de sesión de soporte.
 */
export const companyFaqsKey = (context: string) => companyKeys.list({ context });

/**
 * El catálogo de preguntas de ejemplo visto por la empresa. Va bajo la clave de su base: cuando la base cambia, se
 * vuelve a pedir (`alreadyInBase` depende de lo que tiene).
 */
export const companyTemplatesKey = (context: string) => [...companyKeys.all, 'templates', context] as const;

/**
 * Las preguntas frecuentes de la empresa del contexto. En la plataforma no hay empresa, y con el asistente (M8) apagado
 * o todavía sin saberlo, no se piden (no aparece un 403 `MODULE_DISABLED` que enseguida se va).
 */
export const useCompanyFaqs = () => {
  const context = useCompanyContext();
  const { ready } = useModuleGate('assistant');
  return useQuery({
    queryKey: companyFaqsKey(context ?? 'none'),
    queryFn: listCompanyFaqs,
    enabled: context !== null && ready,
  });
};

/** Las preguntas de ejemplo para la vista previa de la copia: se piden sólo con el diálogo abierto. */
export const useCompanyTemplates = (open: boolean) => {
  const context = useCompanyContext();
  const { ready } = useModuleGate('assistant');
  return useQuery({
    queryKey: companyTemplatesKey(context ?? 'none'),
    queryFn: listCompanyTemplates,
    enabled: open && context !== null && ready,
    // Al abrir el diálogo se mira el catálogo de ese momento.
    staleTime: 0,
  });
};

/** Toda mutación sube la versión de la base: se vuelve a pedir la lista entera. */
const useInvalidate = (all: readonly string[]) => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: all });
};

/** Los avisos de una mutación que se puede disparar varias veces seguidas (una baja por fila). */
export interface MutationNotices<T = void> {
  onSuccess: (result: T) => void;
  onError: (error: unknown) => void;
}

/**
 * Baja de una pregunta. Los avisos van en la mutación y no en cada `mutate`: con dos bajas seguidas se avisa el
 * resultado de las dos (React Query sólo llama a los del último `mutate`). Se refresca la base también si falla.
 */
const useDelete = (remove: (id: string) => Promise<void>, all: readonly string[], notices: MutationNotices) => {
  const invalidate = useInvalidate(all);
  return useMutation({
    mutationFn: remove,
    onSuccess: () => notices.onSuccess(),
    onError: (error) => notices.onError(error),
    onSettled: invalidate,
  });
};

export const useCreateCompanyFaq = () => {
  const invalidate = useInvalidate(companyKeys.all);
  return useMutation({
    mutationFn: (body: CreateAssistantFaqBody) => createCompanyFaq(body),
    onSuccess: invalidate,
  });
};

export const useUpdateCompanyFaq = () => {
  const invalidate = useInvalidate(companyKeys.all);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAssistantFaqBody }) => updateCompanyFaq(id, body),
    onSuccess: invalidate,
  });
};

export const useDeleteCompanyFaq = (notices: MutationNotices) => useDelete(deleteCompanyFaq, companyKeys.all, notices);

export const useCopyCompanyFaqTemplates = () => {
  const invalidate = useInvalidate(companyKeys.all);
  return useMutation({ mutationFn: copyCompanyFaqTemplates, onSuccess: invalidate });
};

/** La base de OrixTech (sólo el administrador general): contesta a las distribuidoras en el chat de soporte. */
export const usePlatformFaqs = () => useQuery({ queryKey: platformKeys.lists(), queryFn: listPlatformFaqs });

export const useCreatePlatformFaq = () => {
  const invalidate = useInvalidate(platformKeys.all);
  return useMutation({
    mutationFn: (body: CreatePlatformAssistantFaqBody) => createPlatformFaq(body),
    onSuccess: invalidate,
  });
};

export const useUpdatePlatformFaq = () => {
  const invalidate = useInvalidate(platformKeys.all);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePlatformAssistantFaqBody }) => updatePlatformFaq(id, body),
    onSuccess: invalidate,
  });
};

export const useDeletePlatformFaq = (notices: MutationNotices) =>
  useDelete(deletePlatformFaq, platformKeys.all, notices);

/** El catálogo de preguntas de ejemplo para distribuidoras (sólo el administrador general). */
export const usePlatformTemplates = () => useQuery({ queryKey: templateKeys.lists(), queryFn: listPlatformTemplates });

export const useCreatePlatformTemplate = () => {
  const invalidate = useInvalidate(templateKeys.all);
  return useMutation({
    mutationFn: (body: CreateAssistantFaqTemplateBody) => createPlatformTemplate(body),
    onSuccess: invalidate,
  });
};

export const useUpdatePlatformTemplate = () => {
  const invalidate = useInvalidate(templateKeys.all);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAssistantFaqTemplateBody }) =>
      updatePlatformTemplate(id, body),
    onSuccess: invalidate,
  });
};

export const useDeletePlatformTemplate = (notices: MutationNotices) =>
  useDelete(deletePlatformTemplate, templateKeys.all, notices);
