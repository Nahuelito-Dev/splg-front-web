import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';
import { updateCompanyFaq, updatePlatformFaq } from '../api/assistant';
import {
  createCompanyFaqFromUnanswered,
  createPlatformFaqFromUnanswered,
  createRegressionCase,
  deleteRegressionCase,
  dismissCompanyUnanswered,
  dismissPlatformUnanswered,
  getLastRegressionRun,
  listCompanyUnanswered,
  listPlatformUnanswered,
  listRegressionCases,
  previewCompanyAssistant,
  previewPlatformAssistant,
  runRegression,
  updateRegressionCase,
  type UnansweredPeriod,
} from '../api/assistantLab';
import { toApiError } from '../api/errors';
import type {
  AssistantPreviewBody,
  CreateRegressionCaseBody,
  PlatformAssistantPreviewBody,
  RegressionRun,
  UpdateRegressionCaseBody,
} from '../api/types';
import { useCompanyContext } from './companyContext';
import { useModuleGate } from './modules';
import { queryKeys } from './queryKeys';

const companyLab = queryKeys.assistantLab;
const platformLab = queryKeys.platformAssistantLab;

/** Mientras una corrida del lote está en curso, se vuelve a pedir cada tanto para ver cómo avanza. */
export const RUN_POLL_MS = 4000;

/** Lo que hay que mirar de cada empresa va bajo su contexto: la de una sesión de soporte no se mezcla con otra. */
export const unansweredKey = (context: string, period: UnansweredPeriod) =>
  [...companyLab.all, 'unanswered', context, period] as const;
export const regressionCasesKey = (context: string) => [...companyLab.all, 'cases', context] as const;
export const lastRunKey = (context: string) => [...companyLab.all, 'lastRun', context] as const;

/** La empresa del contexto con el asistente (M8) ya confirmado: sin eso no se pide nada. */
const useCompanyReady = () => {
  const context = useCompanyContext();
  const { ready } = useModuleGate('assistant');
  return { context: context ?? 'none', enabled: context !== null && ready };
};

export const usePreviewCompanyAssistant = () =>
  useMutation({ mutationFn: (body: AssistantPreviewBody) => previewCompanyAssistant(body) });

export const usePreviewPlatformAssistant = () =>
  useMutation({ mutationFn: (body: PlatformAssistantPreviewBody) => previewPlatformAssistant(body) });

export const useCompanyUnanswered = (period: UnansweredPeriod, enabled = true) => {
  const company = useCompanyReady();
  return useQuery({
    queryKey: unansweredKey(company.context, period),
    queryFn: () => listCompanyUnanswered(period),
    enabled: enabled && company.enabled,
  });
};

export const usePlatformUnanswered = (period: UnansweredPeriod, enabled = true) =>
  useQuery({
    queryKey: [...platformLab.all, 'unanswered', period] as const,
    queryFn: () => listPlatformUnanswered(period),
    enabled,
  });

/** Lo que se pide al crear la pregunta frecuente de un grupo: la pregunta revisada y, si ya se escribió, la respuesta. */
export interface FaqFromUnansweredInput {
  id: string;
  question: string;
  answer: string;
  /** El borrador que ya creó un intento anterior (falló su respuesta): se completa ése en vez de crear otro. */
  draftId?: string;
}

/**
 * Cómo quedó: publicada (con respuesta) o borrador; si la respuesta no se pudo guardar, el motivo. `existing`: el grupo
 * ya tenía su pregunta publicada (la API devuelve ésa) y no se tocó.
 */
export interface FaqFromUnansweredResult {
  faqId: string;
  published: boolean;
  existing: boolean;
  answerError: unknown;
}

/**
 * Crea el borrador desde el grupo y, si se escribió la respuesta, la guarda con el `PATCH` de siempre (eso la
 * publica). Si el grupo ya tenía su pregunta publicada, la API devuelve ésa: no se le pisa la respuesta. Si devuelve
 * un borrador anterior, se le guarda la pregunta revisada (y la respuesta, si hay). Si el `PATCH` falla, el borrador
 * ya quedó creado: se devuelve el motivo sin perderlo.
 */
export const createAndPublish =
  (
    create: (id: string, body: { question: string }) => Promise<{ id: string; question: string; isDraft: boolean }>,
    publish: (id: string, body: { question?: string; answer?: string }) => Promise<{ isDraft: boolean }>,
  ) =>
  async ({ id, question, answer, draftId }: FaqFromUnansweredInput): Promise<FaqFromUnansweredResult> => {
    // Reintento: el grupo ya quedó resuelto en el primer intento y volver a crear daría 404.
    const faq = draftId ? { id: draftId, question: null, isDraft: true } : await create(id, { question });
    if (!faq.isDraft) return { faqId: faq.id, published: true, existing: true, answerError: null };
    const body = {
      ...(faq.question !== question ? { question } : {}),
      ...(answer ? { answer } : {}),
    };
    if (Object.keys(body).length === 0) return { faqId: faq.id, published: false, existing: false, answerError: null };
    try {
      const updated = await publish(faq.id, body);
      return { faqId: faq.id, published: !updated.isDraft, existing: false, answerError: null };
    } catch (error) {
      return { faqId: faq.id, published: false, existing: false, answerError: error };
    }
  };

const useInvalidateAll = (...keys: ReadonlyArray<readonly string[]>) => {
  const queryClient = useQueryClient();
  return () => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
};

export const useCreateCompanyFaqFromUnanswered = () => {
  const invalidate = useInvalidateAll(companyLab.all, queryKeys.assistantFaqs.all);
  return useMutation({
    mutationFn: createAndPublish(createCompanyFaqFromUnanswered, updateCompanyFaq),
    onSettled: invalidate,
  });
};

export const useCreatePlatformFaqFromUnanswered = () => {
  const invalidate = useInvalidateAll(platformLab.all, queryKeys.platformAssistantFaqs.all);
  return useMutation({
    mutationFn: createAndPublish(createPlatformFaqFromUnanswered, updatePlatformFaq),
    onSettled: invalidate,
  });
};

export const useDismissCompanyUnanswered = () => {
  const invalidate = useInvalidateAll(companyLab.all);
  return useMutation({ mutationFn: dismissCompanyUnanswered, onSettled: invalidate });
};

export const useDismissPlatformUnanswered = () => {
  const invalidate = useInvalidateAll(platformLab.all);
  return useMutation({ mutationFn: dismissPlatformUnanswered, onSettled: invalidate });
};

export const useRegressionCases = () => {
  const company = useCompanyReady();
  return useQuery({
    queryKey: regressionCasesKey(company.context),
    queryFn: listRegressionCases,
    enabled: company.enabled,
  });
};

export const useCreateRegressionCase = () => {
  const invalidate = useInvalidateAll(companyLab.all);
  return useMutation({
    mutationFn: (body: CreateRegressionCaseBody) => createRegressionCase(body),
    onSuccess: invalidate,
  });
};

export const useUpdateRegressionCase = () => {
  const invalidate = useInvalidateAll(companyLab.all);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRegressionCaseBody }) => updateRegressionCase(id, body),
    onSuccess: invalidate,
  });
};

export const useDeleteRegressionCase = () => {
  const invalidate = useInvalidateAll(companyLab.all);
  return useMutation({ mutationFn: deleteRegressionCase, onSettled: invalidate });
};

/** Cada cuánto volver a pedir la última corrida: sólo mientras sigue en curso. */
export const runPollInterval = (run: RegressionRun | undefined): number | false =>
  run?.status === 'running' ? RUN_POLL_MS : false;

/** La última corrida del lote; un 404 es «todavía no se corrió» y no se reintenta. */
export const useLastRegressionRun = () => {
  const company = useCompanyReady();
  return useQuery({
    queryKey: lastRunKey(company.context),
    queryFn: getLastRegressionRun,
    enabled: company.enabled,
    refetchInterval: (query: Query<RegressionRun>) => runPollInterval(query.state.data),
    retry: (count, error) => toApiError(error).status === null && count < 1,
  });
};

/** Arranca una corrida: la respuesta (202, `running`) pasa a ser la última y empieza el refresco. */
export const useRunRegression = () => {
  const queryClient = useQueryClient();
  const company = useCompanyReady();
  return useMutation({
    mutationFn: runRegression,
    onSuccess: (run) => {
      queryClient.setQueryData<RegressionRun>(lastRunKey(company.context), run);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: lastRunKey(company.context) }),
  });
};
