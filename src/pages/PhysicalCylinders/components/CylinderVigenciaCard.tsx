import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useCylinderVigencia } from '../../../services/queries/physicalCylinders';
import { formatArgentinaDay } from '../../../utils/format';
import { CYLINDER_VIGENCIA, INSPECTION_RESULT, labelOf } from '../../../utils/statusLabels';
import { daysLabel } from '../inspection';
import { InspectionFormModal } from './InspectionFormModal';

/** Hasta cuándo puede circular el envase (`GET /cylinders/:id/vigencia`) y el historial de sus revisiones. */
export const CylinderVigenciaCard = ({ cylinderId, retired }: { cylinderId: string; retired: boolean }) => {
  const { canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useCylinderVigencia(cylinderId);
  const [registering, setRegistering] = useState(false);

  return (
    <Card className="min-w-0 p-6 lg:col-span-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Vigencia y revisiones</h2>
        <Button
          variant="secondary"
          size="sm"
          icon={<ClipboardCheck />}
          disabled={!canWrite}
          title={writeHint}
          blockedReason={canWrite && retired ? 'Un envase dado de baja no admite revisiones' : undefined}
          onClick={() => setRegistering(true)}
        >
          Registrar revisión
        </Button>
      </div>

      {isPending ? (
        <LoadingState label="Cargando vigencia…" />
      ) : error ? (
        <ErrorState error={error} resource="La vigencia" onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge label={labelOf(CYLINDER_VIGENCIA, data.status)} />
            <span className="text-sm text-ink">
              {daysLabel(data.status, data.daysRemaining)}
              {data.expiresAt ? ` · ${formatArgentinaDay(data.expiresAt)}` : ''}
            </span>
          </div>
          {data.status === 'unverified' && (
            <p className="mt-2 text-sm text-muted">
              Sin revisión registrada no es lo mismo que vencido: el envase puede despacharse mientras no se cargue la
              fecha.
            </p>
          )}
          {data.withdrawalPending && (
            <p className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">
              Este envase está vencido y todavía no volvió al depósito: hay que retirarlo cuando vuelva.
            </p>
          )}
          <h3 className="mt-6 mb-2 text-sm font-semibold text-ink">Historial de revisiones</h3>
          {data.inspections.length === 0 ? (
            <EmptyState title="Sin revisiones" description="Todavía no se registró ninguna revisión de este envase." />
          ) : (
            <ul className="divide-y divide-outline">
              {data.inspections.map((inspection) => (
                <li key={inspection.inspectionId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <Badge label={labelOf(INSPECTION_RESULT, inspection.result)} />
                  <span className="text-sm text-ink">{formatArgentinaDay(inspection.inspectedAt)}</span>
                  <span className="text-sm text-muted">
                    {inspection.nextDueAt
                      ? `Vence ${formatArgentinaDay(inspection.nextDueAt)}`
                      : 'Sin próximo vencimiento'}
                  </span>
                  {inspection.notes && <span className="w-full text-sm text-muted">{inspection.notes}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <InspectionFormModal open={registering} onClose={() => setRegistering(false)} cylinderId={cylinderId} />
    </Card>
  );
};
