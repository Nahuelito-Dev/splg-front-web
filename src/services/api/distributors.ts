import { http } from './httpClient';
import type { CreateDistributorBody, Distributor, UpdateDistributorBody } from './types';

/** GET /distributor: todas las empresas. Sólo el administrador general. */
export const listDistributors = async (): Promise<Distributor[]> => {
  const { data } = await http.get<Distributor[]>('/distributor');
  return data;
};

/** GET /distributor/:id: una empresa puntual. Sólo el administrador general (404 si no existe o está dada de baja). */
export const getDistributor = async (id: string): Promise<Distributor> => {
  const { data } = await http.get<Distributor>(`/distributor/${id}`);
  return data;
};

/** POST /distributor: alta de una empresa (tenant). */
export const createDistributor = async (body: CreateDistributorBody): Promise<Distributor> => {
  const { data } = await http.post<Distributor>('/distributor', body);
  return data;
};

/** PATCH /distributor/:id: datos de la empresa o su estado (active/suspended). */
export const updateDistributor = async (id: string, body: UpdateDistributorBody): Promise<Distributor> => {
  const { data } = await http.patch<Distributor>(`/distributor/${id}`, body);
  return data;
};

/**
 * GET /distributor/current: la empresa de la sesión (la del admin, o la que
 * eligió el administrador general con "Ver como"). 404 si no hay una.
 */
export const getCurrentDistributor = async (): Promise<Distributor> => {
  const { data } = await http.get<Distributor>('/distributor/current');
  return data;
};

/**
 * DELETE /distributor/:id: baja lógica (soft delete). La fila queda en la
 * base con `deletedAt`, pero el back la excluye de `findAll`/`findOne` y de
 * la resolución por header `X-Distributor`: sus choferes, admins y pedidos
 * NO se tocan (siguen con su `distributor_id`), pero la empresa deja de
 * poder resolverse. Sin cuerpo de respuesta.
 */
export const deleteDistributor = async (id: string): Promise<void> => {
  await http.delete(`/distributor/${id}`);
};
