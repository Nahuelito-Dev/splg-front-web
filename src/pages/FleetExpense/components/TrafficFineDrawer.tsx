import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AttachmentsPanel } from '../../../common/components/AttachmentsPanel';
import { Badge, Button, DetailList, Drawer, ErrorState, LoadingState } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useAttachmentFile } from '../../../services/queries/attachments';
import { useTrafficFine } from '../../../services/queries/fleetExpense';
import { openFileSource } from '../../../utils/fileSource';
import { formatCurrency, formatDateTime, formatDay, formatShortId } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { TRAFFIC_FINE_STATUS, labelOf } from '../../../utils/statusLabels';
import { FinePayLink, FinePaymentCode } from './FinePayLink';
import { PayFineModal } from './PayFineModal';

interface Props {
  fineId: string | null;
  onClose: () => void;
}

/** El detalle de una multa: enlace y código de pago, comprobante y egreso de caja si está paga, y la copia del acta. */
export const TrafficFineDrawer = ({ fineId, onClose }: Props) => {
  const { canWrite, writeHint } = usePermissions();
  const { data: fine, isPending, error, refetch } = useTrafficFine(fineId ?? undefined);
  const [paying, setPaying] = useState(false);
  const fileSource = useAttachmentFile();
  const openReceipt = (attachmentId: string) =>
    fileSource.mutate({ attachmentId, disposition: 'inline' }, { onSuccess: openFileSource, onError: notify.error });
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
              { label: 'Importe', value: formatCurrency(fine.amount) },
              { label: 'Pago voluntario', value: formatCurrency(fine.voluntaryPaymentAmount) },
              { label: 'Infracción', value: fine.infraction, wide: true },
              ...(fine.status === 'paid'
                ? [
                    { label: 'Pagada el', value: formatDateTime(fine.paidAt) },
                    { label: 'Importe pagado', value: formatCurrency(fine.paidAmount) },
                    ...(fine.operationNumber
                      ? [{ label: 'Número de operación', value: fine.operationNumber, mono: true }]
                      : []),
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
          {(fine.status === 'pending' || fine.status === 'appealed') && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <FinePayLink fine={fine} />
              <Button
                size="sm"
                variant="secondary"
                disabled={!canWrite}
                title={writeHint}
                onClick={() => setPaying(true)}
              >
                Registrar pago
              </Button>
              <FinePaymentCode fine={fine} />
            </div>
          )}
          {fine.status === 'paid' && (fine.receiptAttachmentId || fine.cashMovementId) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {fine.receiptAttachmentId && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<FileText />}
                  loading={fileSource.isPending}
                  onClick={() => openReceipt(fine.receiptAttachmentId ?? '')}
                >
                  Ver comprobante
                </Button>
              )}
              {fine.cashMovementId && (
                <Link className="font-medium text-primary hover:underline" to="/finance/movements">
                  Movimiento de caja {formatShortId(fine.cashMovementId)}
                </Link>
              )}
            </div>
          )}
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
      <PayFineModal fine={paying ? (fine ?? null) : null} onClose={() => setPaying(false)} />
    </Drawer>
  );
};
