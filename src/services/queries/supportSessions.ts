import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { PageParams } from '../api/httpClient';
import { getPlatform } from '../api/platform';
import { SUPPORT_ENDED_MESSAGE, supportMode } from '../api/supportMode';
import {
  approveSupportAccess,
  endSupportSession,
  getCurrentSupportSession,
  getSupportAccess,
  getSupportPolicy,
  listSupportAccess,
  listSupportAccessEntries,
  rejectSupportAccess,
  requestSupportSession,
  revokeSupportAccess,
  updateSupportPolicy,
  type SupportStatus,
} from '../api/supportSessions';
import type {
  ApproveSupportAccessBody,
  CreateSupportSessionBody,
  RejectSupportAccessBody,
  UpdateSupportPolicyBody,
} from '../api/types';
import { queryKeys } from './queryKeys';

/** Cada cuánto el panel le pregunta a la API por la sesión de soporte (§4.12 del diseño). */
export const SUPPORT_POLL_MS = 30_000;

/**
 * Pregunta a la API por la sesión de soporte del administrador general y la aplica. Si se termina una activa sin que
 * el usuario la cerrara (revocada o vencida), avisa. Una falla de red no cambia nada (salvo en la primera consulta,
 * que tiene que destrabar el panel).
 */
export const syncSupportMode = async (): Promise<void> => {
  try {
    supportMode.update(await getCurrentSupportSession(), SUPPORT_ENDED_MESSAGE);
  } catch {
    if (!supportMode.getState().loaded) supportMode.update(null);
  }
};

/**
 * Mantiene al día el modo soporte mientras el administrador general está en el panel: al entrar y cada 30 s. No usa
 * React Query a propósito: la caché se vacía al entrar y salir del modo, y esta consulta no puede depender de ella.
 */
export const useSupportModeSync = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    void syncSupportMode();
    const timer = window.setInterval(() => void syncSupportMode(), SUPPORT_POLL_MS);
    return () => {
      window.clearInterval(timer);
      supportMode.reset();
    };
  }, [enabled]);
};

/** Pedir acceso a una empresa. Quien llama aplica la sesión (`supportMode.update`) con lo que devuelve. */
export const useRequestSupportSession = () =>
  useMutation({ mutationFn: (body: CreateSupportSessionBody) => requestSupportSession(body) });

/** Salir de la sesión activa o retirar el pedido pendiente. */
export const useEndSupportSession = () => useMutation({ mutationFn: (id: string) => endSupportSession(id) });

// ── Plataforma ────────────────────────────────────────────────────

/** El nombre de la plataforma (`GET /v2/platform`): cambia sólo con un redeploy del back. */
export const usePlatform = () =>
  useQuery({
    queryKey: queryKeys.platform.all,
    queryFn: getPlatform,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

// ── Empresa: «Accesos de soporte» ────────────────────────────────────────────

const keys = queryKeys.supportAccess;

export const useSupportAccessList = (pagination: PageParams, status?: SupportStatus, enabled = true) =>
  useQuery({
    queryKey: keys.list({ ...pagination, status }),
    queryFn: () => listSupportAccess(pagination, status),
    placeholderData: keepPreviousData,
    enabled,
  });

const ACTIVE_PAGE = { page: 0, pageSize: 5 };

/**
 * Las sesiones activas sobre la empresa, para la franja del panel y la sección «Activa». Se refrescan solas: una
 * emergencia se abre sin que nadie la apruebe.
 */
export const useActiveSupportAccess = (enabled: boolean) =>
  useQuery({
    queryKey: keys.list({ ...ACTIVE_PAGE, status: 'active' }),
    queryFn: () => listSupportAccess(ACTIVE_PAGE, 'active'),
    enabled,
    refetchInterval: 60_000,
  });

/** La ficha de un acceso (para el enlace del aviso o del correo cuando no está en las listas cargadas). */
export const useSupportAccess = (id: string | undefined) =>
  useQuery({ queryKey: keys.detail(id ?? ''), queryFn: () => getSupportAccess(id ?? ''), enabled: Boolean(id) });

export const useSupportAccessEntries = (id: string | undefined, pagination: PageParams) =>
  useQuery({
    queryKey: [...keys.detail(id ?? ''), 'accesses', pagination] as const,
    queryFn: () => listSupportAccessEntries(id ?? '', pagination),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

const useInvalidateSupportAccess = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.all }),
    ]);
};

export const useApproveSupportAccess = () => {
  const invalidate = useInvalidateSupportAccess();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ApproveSupportAccessBody }) => approveSupportAccess(id, body),
    onSettled: invalidate,
  });
};

export const useRejectSupportAccess = () => {
  const invalidate = useInvalidateSupportAccess();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RejectSupportAccessBody }) => rejectSupportAccess(id, body),
    onSettled: invalidate,
  });
};

export const useRevokeSupportAccess = () => {
  const invalidate = useInvalidateSupportAccess();
  return useMutation({ mutationFn: (id: string) => revokeSupportAccess(id), onSettled: invalidate });
};

export const useSupportPolicy = (enabled = true) =>
  useQuery({ queryKey: [...keys.all, 'policy'] as const, queryFn: getSupportPolicy, enabled });

export const useUpdateSupportPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSupportPolicyBody) => updateSupportPolicy(body),
    onSuccess: (policy) => {
      queryClient.setQueryData([...keys.all, 'policy'], policy);
    },
  });
};
