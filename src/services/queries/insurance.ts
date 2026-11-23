import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  approveInsuranceInstallment,
  cancelInsurancePolicy,
  createInsurancePolicy,
  createInsurer,
  deleteInsurer,
  getCarInsurance,
  getInsuranceInstallment,
  listInsuranceInstallments,
  listInsurers,
  payInsuranceInstallment,
  updateInsuranceInstallment,
  updateInsurancePolicy,
  updateInsurer,
  uploadInstallmentReceipt,
  type InstallmentFilters,
} from '../api/insurance';
import { newIdempotencyKey } from '../api/idempotency';
import type { ListParams } from '../api/stock';
import type {
  CancelInsurancePolicyBody,
  CreateInsurancePolicyBody,
  CreateInsurerBody,
  PayInsuranceInstallmentBody,
  UpdateInsuranceInstallmentBody,
  UpdateInsurancePolicyBody,
  UpdateInsurerBody,
} from '../api/types';
import { refreshFinance, runMoney } from './finance';
import { queryKeys } from './queryKeys';

interface Options {
  enabled?: boolean;
}

export const useInsurers = (params: ListParams, term?: string, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.insurers.list({ ...params, term: term ?? '' }),
    queryFn: () => listInsurers(params, term),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Todas las aseguradoras vigentes, para el combo de la póliza (una página grande). */
export const useInsurerOptions = ({ enabled = true }: Options = {}) =>
  useInsurers({ page: 0, pageSize: 100 }, undefined, { enabled });

/** El seguro de un vehículo: la póliza vigente (o `null`) y el historial. */
export const useCarInsurance = (carId: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.insurance.detail(carId ?? ''),
    queryFn: () => getCarInsurance(carId ?? ''),
    enabled: Boolean(carId) && enabled,
  });

export const useInsuranceInstallments = (
  params: ListParams,
  filters: InstallmentFilters = {},
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.insurance.list({ ...params, ...filters }),
    queryFn: () => listInsuranceInstallments(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Lo que cambia con una póliza o una cuota: el seguro del vehículo, las cuotas y los avisos. */
const refreshInsurance = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.insurance.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.all }),
  ]);

/** Alta de póliza y baja: además del seguro, el vencimiento de la flota puede haber cambiado. */
const refreshPolicy = (queryClient: QueryClient) =>
  Promise.all([
    refreshInsurance(queryClient),
    queryClient.invalidateQueries({ queryKey: queryKeys.fleet.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cars.all }),
  ]);

export const useCreateInsurer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: { body: CreateInsurerBody; scope: string }) =>
      runMoney(queryClient, scope, body, (key) => createInsurer(body, key)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.insurers.all }),
  });
};

export const useUpdateInsurer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInsurerBody }) => updateInsurer(id, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.insurers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insurance.all }),
      ]),
  });
};

export const useDeleteInsurer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInsurer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.insurers.all }),
  });
};

export const useCreateInsurancePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, scope }: { body: CreateInsurancePolicyBody; scope: string }) =>
      runMoney(queryClient, scope, body, (key) => createInsurancePolicy(body, key)),
    onSettled: () => refreshPolicy(queryClient),
  });
};

export const useUpdateInsurancePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInsurancePolicyBody }) => updateInsurancePolicy(id, body),
    onSuccess: () => refreshPolicy(queryClient),
  });
};

export const useCancelInsurancePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CancelInsurancePolicyBody }) => cancelInsurancePolicy(id, body),
    onSuccess: () => refreshPolicy(queryClient),
  });
};

export const useUpdateInsuranceInstallment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInsuranceInstallmentBody }) =>
      updateInsuranceInstallment(id, body),
    onSuccess: () => refreshInsurance(queryClient),
  });
};

/**
 * Sube el comprobante de una cuota y devuelve lo que leyó el escaneo. No toca la cuota (queda pendiente hasta
 * «Guardar»), por eso no invalida nada.
 */
export const useUploadInstallmentReceipt = () =>
  useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadInstallmentReceipt(id, file, newIdempotencyKey()),
  });

/** Registrar el pago: la cuota queda paga y la caja se mueve, así que se refresca el seguro y todo lo de finanzas. */
export const usePayInsuranceInstallment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayInsuranceInstallmentBody }) =>
      runMoney(queryClient, `insurance-pay:${id}`, body, (key) => payInsuranceInstallment(id, body, key)),
    onSettled: () => Promise.all([refreshInsurance(queryClient), refreshFinance(queryClient)]),
  });
};

/** Una cuota por id (el aviso «¿Aprobar pago?» sólo trae su id). */
export const useInsuranceInstallment = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.insurance.detail(`installment:${id ?? ''}`),
    queryFn: () => getInsuranceInstallment(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

/** Aprobar el pago de una cuota: cambia la cuota y el aviso que la pedía (la bandeja se refresca). No toca la caja. */
export const useApproveInsuranceInstallment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveInsuranceInstallment(id),
    onSuccess: () => refreshInsurance(queryClient),
  });
};

/**
 * A qué pantalla lleva el aviso de una cuota: la pestaña «Seguro» del vehículo. El aviso sólo trae el id de la cuota,
 * así que el vehículo se pide a la API.
 */
export const useInstallmentTarget = () => {
  const queryClient = useQueryClient();
  return async (installmentId: string): Promise<string> => {
    const installment = await queryClient.fetchQuery({
      queryKey: queryKeys.insurance.detail(`installment:${installmentId}`),
      queryFn: () => getInsuranceInstallment(installmentId),
      staleTime: 60_000,
    });
    return `/cars/details/${encodeURIComponent(installment.carId)}?tab=insurance`;
  };
};
