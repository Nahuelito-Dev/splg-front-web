import { toApiErrorFromBlob } from './errors';
import { http, toPage, toQuery, type Page, type PageParams } from './httpClient';
import type {
  AssignVehicleBody,
  CancelFleetTaskBody,
  CloseFleetTaskBody,
  CreateFleetPlanBody,
  CreateFleetTaskBody,
  FleetDriverDocuments,
  FleetExpirations,
  FleetPlan,
  FleetTask,
  FleetTaskAttachment,
  FleetVehicleDocuments,
  Message,
  UpdateFleetPlanBody,
  UpdateFleetTaskBody,
  VehicleAssignmentHistory,
  VehicleInUse,
} from './types';

/**
 * `UpdateFleetTaskDto` acepta `null` en sus campos opcionales para limpiarlos (confirmado
 * contra la API); el OpenAPI generado no lo declara porque el DTO no marca `nullable: true`.
 */
export type FleetTaskUpdateBody = { [K in keyof UpdateFleetTaskBody]: UpdateFleetTaskBody[K] | null };

/** GET /cars/:carId/documents: la documentación de un vehículo (seguro, VTV, service) y si está inhabilitado. */
export const getCarDocuments = async (carId: string): Promise<FleetVehicleDocuments> => {
  const { data } = await http.get<FleetVehicleDocuments>(`/cars/${carId}/documents`);
  return data;
};

/** GET /delivery/:id/documents: la documentación de un chofer (licencia) y si está inhabilitado. */
export const getDriverDocuments = async (deliveryId: string): Promise<FleetDriverDocuments> => {
  const { data } = await http.get<FleetDriverDocuments>(`/delivery/${deliveryId}/documents`);
  return data;
};

export interface FleetPlanFilters {
  subject?: FleetPlan['subject'];
  isActive?: boolean;
}

/** GET /fleet/plans: los planes de mantenimiento/habilitación de la distribuidora activa. */
export const listFleetPlans = async (filters: FleetPlanFilters = {}): Promise<FleetPlan[]> => {
  const { data } = await http.get<FleetPlan[]>('/fleet/plans', { params: filters });
  return data;
};

/** GET /fleet/plans/:id: un plan puntual (404 si no existe o es de otra distribuidora). */
export const getFleetPlan = async (id: string): Promise<FleetPlan> => {
  const { data } = await http.get<FleetPlan>(`/fleet/plans/${id}`);
  return data;
};

/** POST /fleet/plans (CU-105/140): alta de un plan de mantenimiento/habilitación. */
export const createFleetPlan = async (body: CreateFleetPlanBody): Promise<FleetPlan> => {
  const { data } = await http.post<FleetPlan>('/fleet/plans', body);
  return data;
};

/** PATCH /fleet/plans/:id: editarlo, o desactivarlo con `isActive: false` (no se borra). */
export const updateFleetPlan = async (id: string, body: UpdateFleetPlanBody): Promise<FleetPlan> => {
  const { data } = await http.patch<FleetPlan>(`/fleet/plans/${id}`, body);
  return data;
};

export interface FleetTaskFilters {
  status?: FleetTask['status'];
  carId?: string;
  deliveryId?: string;
  /** Busca en el nombre del plan, la categoría, el proveedor o el Nº de referencia. */
  term?: string;
  /** Sólo las tareas que generó este plan. */
  planId?: string;
}

/** GET /fleet/tasks: las tareas de la distribuidora, con filtros, paginadas (total en X-Total-Count). */
export const listFleetTasks = async (params: PageParams, filters: FleetTaskFilters = {}): Promise<Page<FleetTask>> =>
  toPage(await http.get<FleetTask[]>('/fleet/tasks', { params: { ...filters, ...toQuery(params) } }));

/** GET /fleet/tasks/:id: la ficha de una tarea puntual, con sus adjuntos. */
export const getFleetTask = async (id: string): Promise<FleetTask> => {
  const { data } = await http.get<FleetTask>(`/fleet/tasks/${id}`);
  return data;
};

/** POST /fleet/tasks: alta de una tarea de documentación contra un plan. */
export const createFleetTask = async (body: CreateFleetTaskBody): Promise<FleetTask> => {
  const { data } = await http.post<FleetTask>('/fleet/tasks', body);
  return data;
};

/** PATCH /fleet/tasks/:id: editar una tarea abierta (`null` limpia un campo opcional). */
export const updateFleetTask = async (id: string, body: FleetTaskUpdateBody): Promise<FleetTask> => {
  const { data } = await http.patch<FleetTask>(`/fleet/tasks/${id}`, body);
  return data;
};

/** PATCH /fleet/tasks/:id/close (CU-141): registrar que se hizo (o se renovó). */
export const closeFleetTask = async (id: string, body: CloseFleetTaskBody): Promise<FleetTask> => {
  const { data } = await http.patch<FleetTask>(`/fleet/tasks/${id}/close`, body);
  return data;
};

/** PATCH /fleet/tasks/:id/cancel: cancelar una tarea abierta. */
export const cancelFleetTask = async (id: string, body: CancelFleetTaskBody): Promise<FleetTask> => {
  const { data } = await http.patch<FleetTask>(`/fleet/tasks/${id}/cancel`, body);
  return data;
};

/**
 * GET /fleet/tasks/:id/attachments: los adjuntos de una tarea. La documentación del vehículo/chofer
 * (`getCarDocuments`/`getDriverDocuments`) no los trae: hay que pedirlos aparte.
 */
export const listFleetTaskAttachments = async (taskId: string): Promise<FleetTaskAttachment[]> => {
  const { data } = await http.get<FleetTaskAttachment[]>(`/fleet/tasks/${taskId}/attachments`);
  return data;
};

/**
 * POST /fleet/tasks/:id/attachments: sube un adjunto (póliza, VTV, licencia, comprobante).
 * Se fuerza el content-type de este pedido para que axios no intente mandar el FormData
 * como JSON (el cliente arranca con "application/json" por defecto); el boundary lo termina
 * poniendo el navegador.
 */
export const uploadFleetTaskAttachment = async (taskId: string, file: File): Promise<FleetTaskAttachment> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post<FleetTaskAttachment>(`/fleet/tasks/${taskId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

/**
 * GET /fleet/tasks/:id/attachments/:attachmentId/download: el archivo, con su content-type
 * original. Si falla, el error también llega como blob (mismo `responseType` del pedido):
 * `toApiErrorFromBlob` lo lee para mostrar el mensaje real del back en vez de "Error 404".
 */
export const downloadFleetTaskAttachment = async (taskId: string, attachmentId: string): Promise<Blob> => {
  try {
    const { data } = await http.get<Blob>(`/fleet/tasks/${taskId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    return data;
  } catch (error) {
    throw await toApiErrorFromBlob(error);
  }
};

/** DELETE /fleet/tasks/:id/attachments/:attachmentId */
export const deleteFleetTaskAttachment = async (taskId: string, attachmentId: string): Promise<void> => {
  await http.delete(`/fleet/tasks/${taskId}/attachments/${attachmentId}`);
};

/** GET /fleet/expirations (CU-139): lo vencido y lo que vence, agrupado por vehículo y por chofer. */
export const getFleetExpirations = async (withinDays?: number): Promise<FleetExpirations> => {
  const { data } = await http.get<FleetExpirations>('/fleet/expirations', { params: { withinDays } });
  return data;
};

/**
 * Qué vehículo usa cada chofer (decisión de nahue del 30/09, sección "Fleet · Vehicle in
 * use" del Swagger). La flota es de la distribuidora: cualquier chofer puede usar cualquiera
 * de sus vehículos; `PUT` cierra la asignación abierta anterior del chofer y la del vehículo.
 */

/**
 * GET /delivery/:id/vehicle: el vehículo en uso del chofer, o `null` si no tiene ninguno.
 * Sin vehículo, el back manda 200 con el cuerpo vacío (`Content-Length: 0`, confirmado
 * contra la API): axios lo parsea como `''`, no como `null` (no hay JSON para parsear).
 */
export const getVehicleInUse = async (deliveryId: string): Promise<VehicleInUse | null> => {
  const { data } = await http.get<VehicleInUse | ''>(`/delivery/${deliveryId}/vehicle`);
  return data || null;
};

/**
 * PUT /delivery/:id/vehicle: pone un vehículo en uso. 400 si está inhabilitado por
 * documentación vencida (CU-136/137); el mensaje real lo manda el back.
 */
export const assignVehicle = async (deliveryId: string, body: AssignVehicleBody): Promise<VehicleInUse> => {
  const { data } = await http.put<VehicleInUse>(`/delivery/${deliveryId}/vehicle`, body);
  return data;
};

/** DELETE /delivery/:id/vehicle: libera el vehículo en uso del chofer. */
export const releaseVehicle = async (deliveryId: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/delivery/${deliveryId}/vehicle`);
  return data;
};

/** GET /delivery/:id/vehicle-history: historial de vehículos de un chofer, más reciente primero. */
export const listVehicleAssignmentHistory = async (
  deliveryId: string,
  params: PageParams,
): Promise<Page<VehicleAssignmentHistory>> =>
  toPage(
    await http.get<VehicleAssignmentHistory[]>(`/delivery/${deliveryId}/vehicle-history`, {
      params: toQuery(params),
    }),
  );

/** GET /car/:id/assignments: historial de choferes que usaron un vehículo, más reciente primero. */
export const listCarAssignments = async (carId: string, params: PageParams): Promise<Page<VehicleAssignmentHistory>> =>
  toPage(
    await http.get<VehicleAssignmentHistory[]>(`/car/${carId}/assignments`, {
      params: toQuery(params),
    }),
  );
