import { AuditHistoryLink, Badge, DetailList, DetailSkeleton, ErrorState, Modal } from '../../../common/components/ui';
import { useTimeSlot } from '../../../services/queries/timeSlots';
import { formatDateTime } from '../../../utils/format';

interface Props {
  /** Id de la franja a mostrar; `null` cierra el modal. */
  slotId: string | null;
  onClose: () => void;
}

const SlotBody = ({ slotId }: { slotId: string }) => {
  const { data: slot, isPending, error, refetch } = useTimeSlot(slotId);
  if (isPending) return <DetailSkeleton />;
  if (error || !slot) return <ErrorState error={error} resource="La franja" onRetry={() => void refetch()} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge label={slot.isActive ? { text: 'Activa', tone: 'success' } : { text: 'Inactiva', tone: 'neutral' }} />
        <AuditHistoryLink entity="TimeSlot" recordId={slot.time_slot_id} />
      </div>
      <DetailList
        items={[
          { label: 'Nombre', value: slot.name },
          { label: 'Cupo', value: `${slot.capacity} pedidos por día` },
          { label: 'Desde', value: slot.startTime.slice(0, 5), mono: true },
          { label: 'Hasta', value: slot.endTime.slice(0, 5), mono: true },
          { label: 'Alta', value: formatDateTime(slot.createdAt) },
          { label: 'Última modificación', value: formatDateTime(slot.updatedAt) },
          { label: 'Id', value: slot.time_slot_id, mono: true, wide: true },
        ]}
      />
    </div>
  );
};

/** El detalle de una franja horaria (`GET /time-slot/:id`). */
export const TimeSlotDetailModal = ({ slotId, onClose }: Props) => (
  <Modal open={Boolean(slotId)} onClose={onClose} size="sm" title="Franja horaria">
    {slotId && <SlotBody slotId={slotId} />}
  </Modal>
);
