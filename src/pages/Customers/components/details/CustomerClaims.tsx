import { Card, EmptyState } from '../../../../common/components/ui';
import type { Claim } from '../../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../../utils/format';
import { Badge } from '../../../../common/components/ui';
import { CLAIM_STATUS, labelOf } from '../../../../utils/statusLabels';

interface Props {
  claims: Claim[];
  /** Abre el reclamo en el panel de Reclamos. */
  onOpen: (claim: Claim) => void;
}

/** Pestaña "Reclamos" de la ficha de un cliente: los que cargó (o le cargaron) sobre sus pedidos. */
export const CustomerClaims = ({ claims, onOpen }: Props) => (
  <Card>
    <div className="flex items-center justify-between border-b border-outline p-4">
      <h2 className="text-base font-semibold text-ink">Reclamos</h2>
      <span className="text-sm text-muted">{claims.length} en total</span>
    </div>
    {claims.length === 0 ? (
      <EmptyState illustration="done" title="Sin reclamos" description="Este cliente no tiene reclamos cargados." />
    ) : (
      <ul className="divide-y divide-outline-soft">
        {claims.map((claim) => (
          <li key={claim.claim_id}>
            <button
              type="button"
              onClick={() => onOpen(claim)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{claim.reason}</span>
                <span className="block truncate text-xs text-muted">
                  Pedido {formatShortId(claim.order_id)} · {formatDateTime(claim.createdAt)}
                </span>
              </span>
              <Badge label={labelOf(CLAIM_STATUS, claim.status)} variant="critical" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </Card>
);
