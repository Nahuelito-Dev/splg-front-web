import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignVehicle,
  cancelFleetTask,
  closeFleetTask,
  closeFleetTaskAndPay,
  createFleetPlan,
  createFleetTask,
  deleteFleetTaskAttachment,
  getFleetTaskAttachmentFile,
  getCarDocuments,
  getDriverDocuments,
  getFleetExpirations,
  getFleetPlan,
  getFleetTask,
  getVehicleInUse,
  listCarAssignments,
  listFleetPlans,
  listFleetTaskAttachments,
  listFleetTasks,
  listVehicleAssignmentHistory,
  payFleetTask,
  releaseVehicle,
  updateFleetPlan,
  updateFleetTask,
  uploadFleetTaskAttachment,
  type FleetExpirationFilters,
  type FleetPlanFilters,
  type FleetTaskFilters,
  type FleetTaskUpdateBody,
} from '../api/fleet';
import type { PageParams } from '../api/httpClient';
import { refreshFinance, runMoney } from './finance';
import type {
  AssignVehicleBody,
  CancelFleetTaskBody,
  CloseFleetTaskBody,
  CloseFleetTaskV2Body,
  CreateFleetPlanBody,
  CreateFleetTaskBody,
  PayFleetTaskBody,
  UpdateFleetPlanBody,
} from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.fleet;

/**
 * La documentación de un vehículo: sus tareas (seguro, VTV, service) y si está inhabilitado.
 * `enabled` en `false` la apaga (un super_admin sin "Ver como": la API la rechaza con 400).
 */
export const useCarDocuments = (carId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: keys.detail(`car:${carId}`),
    queryFn: () => getCarDocuments(carId ?? ''),
    enabled: Boolean(carId) && enabled,
  });

/** La documentación de un chofer: su licencia y si está inhabilitado. Mismo apagado que arriba. */
export const useDriverDocuments = (deliveryId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: keys.detail(`driver:${deliveryId}`),
    queryFn: () => getDriverDocuments(deliveryId ?? ''),
    enabled: Boolean(deliveryId) && enabled,
  });

/** Los planes de un sujeto (vehicle/driver), para el combo de alta de una tarea. */
/** `enabled` en `false` la apaga (un super_admin sin «Ver como»: la API responde 400). */
export const useFleetPlans = (filters: FleetPlanFilters, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.list(filters),
    queryFn: () => listFleetPlans(filters),
    enabled: options.enabled ?? true,
  });

/** La ficha de un plan (`GET /fleet/plans/:id`). `enabled` en `false` la apaga (un super_admin sin «Ver como»: la API la rechaza). */
export const useFleetPlan = (id: string | undefined, enabled = true) =>
  useQuery({
    queryKey: keys.detail(`plan:${id}`),
    queryFn: () => getFleetPlan(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

/**
 * Lo vencido y lo que vence dentro de `withinDays` (CU-139), agrupado por vehículo y por
 * chofer. `enabled` en `false` la apaga (un super_admin sin "Ver como": la API la rechaza).
 */
export const useFleetExpirations = (withinDays: number, enabled = true, filters: FleetExpirationFilters = {}) =>
  useQuery({
    queryKey: keys.detail(`expirations:${withinDays}:${filters.subject ?? ''}:${filters.category ?? ''}`),
    queryFn: () => getFleetExpirations(withinDays, filters),
    enabled,
  });

/**
 * Los adjuntos de una tarea. La documentación del vehículo/chofer no los trae: se piden
 * aparte, recién al abrir el detalle de la tarea.
 */
export const useFleetTaskAttachments = (taskId: string | undefined) =>
  useQuery({
    queryKey: keys.detail(`attachments:${taskId}`),
    queryFn: () => listFleetTaskAttachments(taskId ?? ''),
    enabled: Boolean(taskId),
  });

export const useCreateFleetTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFleetTaskBody) => createFleetTask(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUpdateFleetTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: FleetTaskUpdateBody }) => updateFleetTask(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** CU-141: registrar que la tarea se hizo (o se renovó). */
export const useCloseFleetTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CloseFleetTaskBody }) => closeFleetTask(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Cerrar la tarea y pagarla en el mismo acto («Lo pagué ahora»): mueve una caja. */
export const useCloseFleetTaskAndPay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CloseFleetTaskV2Body }) =>
      runMoney(queryClient, `task-close-pay:${id}`, body, (key) => closeFleetTaskAndPay(id, body, key)),
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: keys.all }), refreshFinance(queryClient)]),
  });
};

/** Registrar el pago de una tarea hecha: el costo sale de la caja elegida. */
export const usePayFleetTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayFleetTaskBody }) =>
      runMoney(queryClient, `task-pay:${id}`, body, (key) => payFleetTask(id, body, key)),
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: keys.all }), refreshFinance(queryClient)]),
  });
};

export const useCancelFleetTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CancelFleetTaskBody }) => cancelFleetTask(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useUploadFleetTaskAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) => uploadFleetTaskAttachment(taskId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useDeleteFleetTaskAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
      deleteFleetTaskAttachment(taskId, attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** No cachea nada (la URL firmada vence): pide el archivo cuando se lo necesita, en URL firmada o en blob. */
export const useDownloadFleetTaskAttachment = () =>
  useMutation({
    mutationFn: ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
      getFleetTaskAttachmentFile(taskId, attachmentId),
  });

/** El vehículo en uso de un chofer (`null` si no tiene ninguno). Lo usa su ficha. */
export const useVehicleInUse = (deliveryId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: keys.detail(`vehicle-in-use:${deliveryId}`),
    queryFn: () => getVehicleInUse(deliveryId ?? ''),
    enabled: Boolean(deliveryId) && enabled,
  });

/** El historial de vehículos de un chofer, paginado (más reciente primero). */
export const useVehicleAssignmentHistory = (deliveryId: string | undefined, params: PageParams, enabled = true) =>
  useQuery({
    queryKey: keys.list({ vehicleHistory: deliveryId, ...params }),
    queryFn: () => listVehicleAssignmentHistory(deliveryId ?? '', params),
    enabled: Boolean(deliveryId) && enabled,
    placeholderData: keepPreviousData,
  });

/** El historial de choferes de un vehículo, paginado (más reciente primero). */
export const useCarAssignments = (carId: string | undefined, params: PageParams, enabled = true) =>
  useQuery({
    queryKey: keys.list({ carAssignments: carId, ...params }),
    queryFn: () => listCarAssignments(carId ?? '', params),
    enabled: Boolean(carId) && enabled,
    placeholderData: keepPreviousData,
  });

/** Pone en uso (o cambia) el vehículo de un chofer. 400 si está inhabilitado. */
export const useAssignVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, body }: { deliveryId: string; body: AssignVehicleBody }) =>
      assignVehicle(deliveryId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Libera el vehículo en uso de un chofer. */
export const useReleaseVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => releaseVehicle(deliveryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** CU-105/140: alta de un plan de mantenimiento/habilitación. */
export const useCreateFleetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFleetPlanBody) => createFleetPlan(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Edición de un plan, o su baja lógica (`isActive: false`). */
export const useUpdateFleetPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFleetPlanBody }) => updateFleetPlan(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

/** Las tareas de la flota, paginadas, con filtros por estado, vehículo, chofer, plan o texto. */
export const useFleetTasks = (
  params: PageParams,
  filters: FleetTaskFilters = {},
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: keys.list({ tasks: filters, ...params }),
    queryFn: () => listFleetTasks(params, filters),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });

/** La ficha de una tarea puntual (`GET /fleet/tasks/:id`), con sus adjuntos. */
export const useFleetTask = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(`task:${id}`),
    queryFn: () => getFleetTask(id ?? ''),
    enabled: Boolean(id),
  });
