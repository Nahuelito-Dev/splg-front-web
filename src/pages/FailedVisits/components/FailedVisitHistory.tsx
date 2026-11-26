import { ExternalLink, ShieldAlert } from 'lucide-react';
import { Badge } from '../../../common/components/ui';
import type { FailedVisit } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { FAILED_VISIT_OUTCOME, FAILED_VISIT_REASON, labelOf } from '../../../utils/statusLabels';
import { mapsUrl } from '../../Orders/components/details/deliveryConfirmation';
import { distanceText, proposalText, resolutionText } from '../revisit';

const REPORTER: Record<string, string> = {
  delivery: 'Chofer',
  admin: 'Distribuidora',
  super_admin: 'Distribuidora',
};

/** Las visitas fallidas de un pedido, de la más nueva a la más vieja: motivo, quién, dónde estaba y qué se resolvió. */
export const FailedVisitHistory = ({ visits }: { visits: FailedVisit[] }) => (
  <ol className="space-y-3">
    {visits.map((visit) => {
      const distance = distanceText(visit.distanceMeters);
      const proposal = proposalText(visit);
      const resolution = resolutionText(visit);
      const reporter = REPORTER[visit.reportedByRole] ?? 'Distribuidora';
      return (
        <li key={visit.failedVisitId} className="border-b border-outline pb-3 last:border-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{labelOf(FAILED_VISIT_REASON, visit.reason).text}</p>
              {visit.note && <p className="text-sm text-ink">{visit.note}</p>}
              <p className="text-xs text-muted">
                {formatDateTime(visit.failedAt)} · {reporter}
                {visit.reportedByName ? ` (${visit.reportedByName})` : ''}
              </p>
            </div>
            <Badge label={labelOf(FAILED_VISIT_OUTCOME, visit.outcome)} />
          </div>
          {visit.latitude !== null && visit.longitude !== null ? (
            <p className="mt-2 rounded-lg bg-surface-hover p-2 text-xs text-ink">
              Informó {distance ?? 'con su ubicación'}
              {visit.accuracyMeters !== null ? ` (precisión ±${Math.round(visit.accuracyMeters)} m)` : ''}
              {' · '}
              <a
                href={mapsUrl([visit.latitude, visit.longitude])}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline"
              >
                Ver en Google Maps
                <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">Se informó sin ubicación.</p>
          )}
          {visit.outOfRange && (
            <p
              role="alert"
              className="mt-2 flex items-start gap-2 rounded-lg border border-danger bg-danger-soft p-2 text-xs text-danger"
            >
              <ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              Se informó fuera del radio del domicilio
            </p>
          )}
          {proposal && (
            <p className="mt-2 text-xs text-ink">
              {visit.agreedWithCustomer ? 'Acordó con el cliente: ' : 'Nueva visita propuesta: '}
              <span className="font-semibold">{proposal}</span>
            </p>
          )}
          {resolution && <p className="mt-1 text-xs text-ink">{resolution}</p>}
        </li>
      );
    })}
  </ol>
);
