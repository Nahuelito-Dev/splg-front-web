import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
  getFleetTaskBoard,
  moveFleetTask,
  type FleetTaskBoardFilters,
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
  FleetTaskBoard,
  FleetTaskBoardCard,
  MoveFleetTaskBody,
  PayFleetTaskBody,
  UpdateFleetPlanBody,
} from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.fleet;

/** Cargar, corregir, cerrar o cancelar un documento cambia el estado de documentación del legajo (listado y contadores). */
const refreshFleetAndEmployees = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
  ]);

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
    onSuccess: () => refreshFleetAndEmployees(queryClient),
  });
};

export const useUpdateFleetTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: FleetTaskUpdateBody }) => updateFleetTask(id, changes),
    onSuccess: () => refreshFleetAndEmployees(queryClient),
  });
};

/** CU-141: registrar que la tarea se hizo (o se renovó). */
export const useCloseFleetTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CloseFleetTaskBody }) => closeFleetTask(id, body),
    onSuccess: () => refreshFleetAndEmployees(queryClient),
  });
};

/** Cerrar la tarea y pagarla en el mismo acto («Lo pagué ahora»): mueve una caja. */
export const useCloseFleetTaskAndPay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CloseFleetTaskV2Body }) =>
      runMoney(queryClient, `task-close-pay:${id}`, body, (key) => closeFleetTaskAndPay(id, body, key)),
    onSettled: () => Promise.all([refreshFleetAndEmployees(queryClient), refreshFinance(queryClient)]),
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
    onSuccess: () => refreshFleetAndEmployees(queryClient),
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

/** Clave del tablero: cuelga de `fleet`, así cualquier cambio de tareas (alta, cierre, cancelación) lo refresca. */
export const boardKey = (filters: FleetTaskBoardFilters = {}) => [...keys.all, 'board', filters] as const;

/** El tablero de tareas (`GET /v2/fleet/tasks/board`). */
export const useFleetTaskBoard = (filters: FleetTaskBoardFilters, enabled = true) =>
  useQuery({
    queryKey: boardKey(filters),
    queryFn: () => getFleetTaskBoard(filters),
    enabled,
    placeholderData: keepPreviousData,
  });

interface MoveVars {
  id: string;
  body: MoveFleetTaskBody;
  /** Cómo queda el tablero mientras el back contesta. */
  optimistic: (board: FleetTaskBoard) => FleetTaskBoard;
  /** Cómo entra la tarjeta que devuelve el back (reemplaza la optimista). */
  settle: (board: FleetTaskBoard, card: FleetTaskBoardCard) => FleetTaskBoard;
}

/**
 * Mueve una tarjeta: se acomoda al instante y, si el back la rechaza, vuelve a donde estaba (y se pide el tablero de
 * nuevo si la tarea cambió por otro lado).
 */
export const useMoveFleetTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: MoveVars) => moveFleetTask(id, body),
    onMutate: async ({ optimistic }) => {
      const prefix = [...keys.all, 'board'];
      await queryClient.cancelQueries({ queryKey: prefix });
      const snapshots = queryClient.getQueriesData<FleetTaskBoard>({ queryKey: prefix });
      for (const [key, board] of snapshots) if (board) queryClient.setQueryData(key, optimistic(board));
      return { snapshots };
    },
    onError: (_error, _vars, context) => {
      for (const [key, board] of context?.snapshots ?? []) queryClient.setQueryData(key, board);
      void queryClient.invalidateQueries({ queryKey: [...keys.all, 'board'] });
    },
    onSuccess: (card, { settle }) => {
      for (const [key, board] of queryClient.getQueriesData<FleetTaskBoard>({ queryKey: [...keys.all, 'board'] }))
        if (board) queryClient.setQueryData(key, settle(board, card));
    },
  });
};
