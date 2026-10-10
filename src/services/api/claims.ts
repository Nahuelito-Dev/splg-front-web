import { http } from './httpClient';
import type { Claim, CreateClaimBody, ReopenClaimBody, ResolveClaimBody, UpdateClaimBody } from './types';

/** GET /claims: todos los reclamos, acotados a la distribuidora del token. */
export const listClaims = async (): Promise<Claim[]> => {
  const { data } = await http.get<Claim[]>('/claims');
  return data;
};

/** GET /claims/:id: un reclamo con su pedido y su cliente (404 si no existe o es de otra distribuidora). */
export const getClaim = async (id: string): Promise<Claim> => {
  const { data } = await http.get<Claim>(`/claims/${id}`);
  return data;
};

/** PATCH /claims/:id: corrige el motivo o la descripción. 409 si el reclamo ya no está pendiente. */
export const updateClaim = async (id: string, body: UpdateClaimBody): Promise<Claim> => {
  const { data } = await http.patch<Claim>(`/claims/${id}`, body);
  return data;
};

/**
 * POST /claims: un admin lo carga a nombre de un cliente (soporte). El
 * `customerId` tiene que ser el dueño de `orderId` o la API contesta 400.
 */
export const createClaim = async (body: CreateClaimBody): Promise<Claim> => {
  const { data } = await http.post<Claim>('/claims', body);
  return data;
};

/** PATCH /claims/:id/resolve: nota de resolución y nuevo estado. `rejected` es la baja del reclamo: queda registrado, no se borra. */
export const resolveClaim = async (id: string, body: ResolveClaimBody): Promise<Claim> => {
  const { data } = await http.patch<Claim>(`/claims/${id}/resolve`, body);
  return data;
};

/** PATCH /claims/:id/take: PENDING → IN_PROCESS, sin nota (sólo marca que un admin ya lo está mirando). */
export const takeClaim = async (id: string): Promise<Claim> => {
  const { data } = await http.patch<Claim>(`/claims/${id}/take`, {});
  return data;
};

/** PATCH /claims/:id/reopen: RESOLVED/REJECTED → IN_PROCESS, con motivo obligatorio. */
export const reopenClaim = async (id: string, body: ReopenClaimBody): Promise<Claim> => {
  const { data } = await http.patch<Claim>(`/claims/${id}/reopen`, body);
  return data;
};
