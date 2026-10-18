import { AttachmentsPanel } from '../../../common/components/AttachmentsPanel';
import { Badge, Drawer, DetailList, ErrorState, LoadingState } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { useFuelLoad } from '../../../services/queries/fleetExpense';
import { formatCurrency, formatDateTime, formatNumber } from '../../../utils/format';
import { FUEL_PAYMENT_METHOD, FUEL_TYPE, labelOf } from '../../../utils/statusLabels';

interface Props {
  loadId: string | null;
  onClose: () => void;
}

/** El detalle de una carga de combustible, con su comprobante (adjuntos). */
export const FuelLoadDrawer = ({ loadId, onClose }: Props) => {
  const { canWrite, writeHint } = usePermissions();
  const { data: load, isPending, error, refetch } = useFuelLoad(loadId ?? undefined);

  return (
    <Drawer
      open={loadId !== null}
      onClose={onClose}
      title="Carga de combustible"
      description={load?.carPatent ?? ''}
      size="lg"
    >
      {isPending ? (
        <LoadingState />
      ) : error || !load ? (
        <ErrorState error={error} resource="La carga" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {load.voidedAt && <Badge label={{ text: 'Anulada', tone: 'neutral' }} />}
            {load.anomaly && <Badge label={{ text: 'Consumo anómalo', tone: 'warn' }} />}
            <Badge label={labelOf(FUEL_TYPE, load.fuelType)} />
            <Badge
              label={
                load.isFullTank ? { text: 'Tanque lleno', tone: 'success' } : { text: 'Carga parcial', tone: 'info' }
              }
            />
          </div>
          <DetailList
            items={[
              { label: 'Vehículo', value: load.carPatent ?? '—', mono: true },
              { label: 'Cargó', value: load.employeeName ?? '—' },
              { label: 'Fecha', value: formatDateTime(load.loadedAt) },
              { label: 'Kilometraje', value: `${formatNumber(load.odometerKm)} km`, mono: true },
              { label: 'Litros', value: formatNumber(load.liters), mono: true },
              { label: 'Precio por litro', value: formatCurrency(load.unitPrice), mono: true },
              { label: 'Importe', value: formatCurrency(load.totalAmount), mono: true },
              { label: 'Medio de pago', value: labelOf(FUEL_PAYMENT_METHOD, load.paymentMethod).text },
              { label: 'Estación', value: load.station },
              { label: 'Comprobante', value: load.receiptNumber, mono: true },
              ...(load.odometerCorrectionNote
                ? [{ label: 'Corrección del kilometraje', value: load.odometerCorrectionNote, wide: true }]
                : []),
              ...(load.voidedAt ? [{ label: 'Anulada el', value: formatDateTime(load.voidedAt) }] : []),
              ...(load.notes ? [{ label: 'Notas', value: load.notes, wide: true }] : []),
            ]}
          />
          <AttachmentsPanel
            ownerType="fuel_load"
            ownerId={load.fuelLoadId}
            canWrite={canWrite && !load.voidedAt}
            blockedReason={writeHint}
            title="Comprobante"
            hint="Ticket o factura de la carga"
          />
        </div>
      )}
    </Drawer>
  );
};
