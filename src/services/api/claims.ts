import { http } from './httpClient';
import type { Claim, CreateClaimBody, ReopenClaimBody, ResolveClaimBody } from './types';

/** GET /claims: todos los reclamos, acotados a la distribuidora del token. */
export const listClaims = async (): Promise<Claim[]> => {
  const { data } = await http.get<Claim[]>('/claims');
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

/** PATCH /claims/:id/resolve: nota de resolución y nuevo estado (sólo resolved/rejected desde acá: ver `ClaimDetailModal`). */
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
