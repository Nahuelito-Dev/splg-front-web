import { http } from './httpClient';
import type { Claim, CreateClaimBody, ResolveClaimBody } from './types';

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

/** PATCH /claims/:id/resolve: nota de resolución y nuevo estado. */
export const resolveClaim = async (id: string, body: ResolveClaimBody): Promise<Claim> => {
  const { data } = await http.patch<Claim>(`/claims/${id}/resolve`, body);
  return data;
};
