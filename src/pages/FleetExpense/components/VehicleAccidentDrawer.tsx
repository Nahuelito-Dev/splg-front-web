import { AttachmentsPanel } from '../../../common/components/AttachmentsPanel';
import { Badge, DetailList, Drawer, ErrorState, LoadingState } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useVehicleAccident } from '../../../services/queries/fleetExpense';
import { AccidentPayment } from './AccidentPayment';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import { ACCIDENT_STATUS, labelOf } from '../../../utils/statusLabels';

interface Props {
  accidentId: string | null;
  onClose: () => void;
}

/** El detalle de un siniestro, con sus fotos y la denuncia (adjuntos). */
export const VehicleAccidentDrawer = ({ accidentId, onClose }: Props) => {
  const { canWrite, writeHint } = usePermissions();
  const { data: accident, isPending, error, refetch } = useVehicleAccident(accidentId ?? undefined);
  return (
    <Drawer
      open={accidentId !== null}
      onClose={onClose}
      title="Siniestro"
      description={accident?.carPatent ?? ''}
      size="lg"
    >
      {isPending ? (
        <LoadingState />
      ) : error || !accident ? (
        <ErrorState error={error} resource="El siniestro" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge label={labelOf(ACCIDENT_STATUS, accident.status)} />
            {accident.vehicleUnusable && <Badge label={{ text: 'Vehículo inutilizable', tone: 'danger' }} />}
            {accident.hazmatRelease && <Badge label={{ text: 'Derrame de gas', tone: 'danger' }} />}
            {accident.injuries && <Badge label={{ text: 'Con heridos', tone: 'warn' }} />}
            {accident.thirdPartiesInvolved && <Badge label={{ text: 'Con terceros', tone: 'info' }} />}
          </div>
          <DetailList
            items={[
              { label: 'Vehículo', value: accident.carPatent ?? '—', mono: true },
              { label: 'Conducía', value: accident.employeeName ?? 'Sin identificar' },
              { label: 'Ocurrió', value: formatDateTime(accident.occurredAt) },
              { label: 'Punto en el mapa', value: accident.location, mono: true },
              { label: 'Dirección', value: accident.address, wide: true },
              { label: 'Qué pasó', value: accident.description, wide: true },
              { label: 'Denuncia policial', value: accident.policeReportNumber, mono: true },
              { label: 'Reclamo al seguro', value: accident.insurerClaimNumber, mono: true },
              ...(accident.status === 'closed'
                ? [
                    { label: 'Cerrado el', value: formatDateTime(accident.closedAt) },
                    { label: 'Reparación', value: formatCurrency(accident.repairCost), mono: true },
                    { label: 'Reintegro del seguro', value: formatCurrency(accident.insurerReimbursement), mono: true },
                    { label: 'Franquicia', value: formatCurrency(accident.deductibleAmount), mono: true },
                    { label: 'Costo neto', value: formatCurrency(accident.netCost), mono: true },
                  ]
                : []),
            ]}
          />
          <AccidentPayment accident={accident} />
          <AttachmentsPanel
            ownerType="vehicle_accident"
            ownerId={accident.accidentId}
            canWrite={canWrite}
            blockedReason={writeHint}
            title="Fotos y documentación"
            hint="Fotos del siniestro, denuncia, parte del seguro"
          />
        </div>
      )}
    </Drawer>
  );
};
