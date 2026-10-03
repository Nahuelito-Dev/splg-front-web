import type { Claim } from '../../services/api/types';

export type ClaimStatusFilter = Claim['status'] | 'all';

export const CLAIM_STATUS_ORDER: Claim['status'][] = ['pending', 'in_process', 'resolved', 'rejected'];

const normalize = (text: string | null | undefined) => (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Reclamos de un estado (o todos) que contienen el término en el cliente, el motivo, la descripción o el pedido. */
export const filterClaims = (
  claims: Claim[],
  { status, term }: { status: ClaimStatusFilter; term: string },
): Claim[] => {
  const needle = normalize(term.trim());
  return claims.filter((claim) => {
    if (status !== 'all' && claim.status !== status) return false;
    if (!needle) return true;
    return [
      claim.customer?.full_name,
      claim.customer?.phone_number,
      claim.reason,
      claim.description,
      claim.order_id,
    ].some((field) => normalize(field).includes(needle));
  });
};

/** Cuántos reclamos hay en cada estado y en total, sobre la lista completa (no la filtrada). */
export const countClaimsByStatus = (claims: Claim[]): Record<Claim['status'], number> & { all: number } => {
  const counts = { pending: 0, in_process: 0, resolved: 0, rejected: 0, all: claims.length };
  for (const claim of claims) counts[claim.status] += 1;
  return counts;
};
