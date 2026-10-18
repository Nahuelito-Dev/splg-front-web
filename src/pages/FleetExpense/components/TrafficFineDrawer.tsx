import { AttachmentsPanel } from '../../../common/components/AttachmentsPanel';
import { Badge, DetailList, Drawer, ErrorState, LoadingState } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useTrafficFine } from '../../../services/queries/fleetExpense';
import { formatCurrency, formatDateTime, formatDay } from '../../../utils/format';
import { TRAFFIC_FINE_STATUS, labelOf } from '../../../utils/statusLabels';

interface Props {
  fineId: string | null;
  onClose: () => void;
}

/** El detalle de una multa, con la copia del acta (adjuntos). */
export const TrafficFineDrawer = ({ fineId, onClose }: Props) => {
  const { canWrite, writeHint } = usePermissions();
  const { data: fine, isPending, error, refetch } = useTrafficFine(fineId ?? undefined);
  return (
    <Drawer
      open={fineId !== null}
      onClose={onClose}
      title="Multa de tránsito"
      description={fine?.actNumber ?? ''}
      size="lg"
    >
      {isPending ? (
        <LoadingState />
      ) : error || !fine ? (
        <ErrorState error={error} resource="La multa" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge label={labelOf(TRAFFIC_FINE_STATUS, fine.status)} />
            {fine.chargedToEmployee && <Badge label={{ text: 'Imputada al chofer', tone: 'accent' }} />}
          </div>
          <DetailList
            items={[
              { label: 'Vehículo', value: fine.carPatent ?? '—', mono: true },
              { label: 'Responsable', value: fine.employeeName ?? 'Sin identificar' },
              { label: 'Ocurrió', value: formatDateTime(fine.occurredAt) },
              { label: 'Vence', value: formatDay(fine.dueDate) },
              { label: 'Jurisdicción', value: fine.jurisdiction },
              { label: 'Acta', value: fine.actNumber, mono: true },
              { label: 'Importe', value: formatCurrency(fine.amount), mono: true },
              { label: 'Pago voluntario', value: formatCurrency(fine.voluntaryPaymentAmount), mono: true },
              { label: 'Infracción', value: fine.infraction, wide: true },
              ...(fine.status === 'paid'
                ? [
                    { label: 'Pagada el', value: formatDateTime(fine.paidAt) },
                    { label: 'Importe pagado', value: formatCurrency(fine.paidAmount), mono: true },
                  ]
                : []),
              ...(fine.status === 'voided'
                ? [
                    { label: 'Anulada el', value: formatDateTime(fine.voidedAt) },
                    { label: 'Motivo', value: fine.voidReason, wide: true },
                  ]
                : []),
            ]}
          />
          <AttachmentsPanel
            ownerType="traffic_fine"
            ownerId={fine.fineId}
            canWrite={canWrite}
            blockedReason={writeHint}
            title="Copia del acta"
            hint="Foto o PDF del acta"
          />
        </div>
      )}
    </Drawer>
  );
};
