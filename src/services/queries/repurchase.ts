import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerRepurchase,
  getRepurchaseStats,
  listRepurchaseForecast,
  listRepurchaseInvitations,
  runRepurchase,
  type RepurchaseInvitationFilters,
} from '../api/repurchase';
import { queryKeys } from './queryKeys';

const keys = queryKeys.repurchase;

interface Options {
  enabled?: boolean;
}

/** Los clientes a los que se les acaba el gas dentro de la ventana de días, paginados. */
export const useRepurchaseForecast = (
  pagination: { page: number; pageSize: number },
  days: number,
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: keys.list({ kind: 'forecast', days, ...pagination }),
    queryFn: () => listRepurchaseForecast(pagination, days),
    placeholderData: keepPreviousData,
    enabled,
  });

/** La fecha estimada de recompra de un cliente (su ficha). */
export const useCustomerRepurchase = (userId: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: keys.detail(`customer:${userId}`),
    queryFn: () => getCustomerRepurchase(userId ?? ''),
    enabled: Boolean(userId) && enabled,
  });

/** Las invitaciones emitidas, paginadas. */
export const useRepurchaseInvitations = (
  pagination: { page: number; pageSize: number },
  filters: RepurchaseInvitationFilters,
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: keys.list({ kind: 'invitations', ...pagination, ...filters }),
    queryFn: () => listRepurchaseInvitations(pagination, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Cómo le va al módulo: invitaciones por resultado, conversión e ingresos de los últimos 90 días. */
export const useRepurchaseStats = ({ enabled = true }: Options = {}) =>
  useQuery({ queryKey: keys.detail('stats'), queryFn: getRepurchaseStats, enabled });

/** Simula la corrida: sólo calcula a quién se invitaría, no escribe ni avisa, así que no refresca nada. */
export const useSimulateRepurchase = () => useMutation({ mutationFn: () => runRepurchase({ dryRun: true }) });

/** Corre la anticipación de verdad: cambia invitaciones y estadísticas, así que se refresca todo lo suyo. */
export const useRunRepurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runRepurchase({ dryRun: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
