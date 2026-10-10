import { useState } from 'react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Button, Card, EmptyState, IconButton, LoadingState } from '../../../common/components/ui';
import type { TimeSlot } from '../../../services/api/types';
import { useDeleteTimeSlot, useTimeSlots } from '../../../services/queries/timeSlots';
import { confirm, notify } from '../../../utils/notifications';
import { TimeSlotDetailModal } from './TimeSlotDetailModal';
import { TimeSlotFormModal } from './TimeSlotFormModal';
import { usePermissions } from '../../../hooks';

export const TimeSlotsManager = () => {
  const { data: slots, isPending } = useTimeSlots();
  const { canWrite, writeHint } = usePermissions();
  const deleteTimeSlot = useDeleteTimeSlot();
  const [form, setForm] = useState<{ open: boolean; slot: TimeSlot | null }>({ open: false, slot: null });
  const [detailId, setDetailId] = useState<string | null>(null);

  const handleDelete = async (slot: TimeSlot) => {
    const confirmed = await confirm({
      title: '¿Dar de baja la franja?',
      text: `Baja lógica: ${slot.name} deja de ofrecerse para agendar, pero no se borra y los pedidos ya agendados se mantienen.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (!confirmed) return;
    deleteTimeSlot.mutate(slot.time_slot_id, {
      onSuccess: () => notify.success('Franja dada de baja'),
      onError: notify.error,
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <AccessTimeIcon aria-hidden="true" className="text-primary" fontSize="small" />
            Turnos de entrega
          </h3>
          <p className="text-sm text-muted">Horarios disponibles para agendar pedidos.</p>
        </div>
        <Button
          size="sm"
          icon={<AddCircleOutlineIcon />}
          disabled={!canWrite}
          title={writeHint}
          onClick={() => setForm({ open: true, slot: null })}
        >
          Nueva franja
        </Button>
      </div>

      {isPending ? (
        <LoadingState />
      ) : !slots || slots.length === 0 ? (
        <EmptyState
          title="No hay horarios activos"
          description="Agregá uno para que los clientes puedan agendar pedidos."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {slots.map((slot) => (
            <li
              key={slot.time_slot_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-outline p-4"
            >
              <div>
                <p className="font-medium text-ink">{slot.name}</p>
                <p className="mt-1 text-xs text-muted">
                  <span className="rounded border border-outline bg-surface-hover px-1.5 py-0.5 font-mono">
                    {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                  </span>{' '}
                  · cupo {slot.capacity}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <IconButton
                  label={`Ver detalle de la franja ${slot.name}`}
                  icon={<VisibilityOutlinedIcon />}
                  onClick={() => setDetailId(slot.time_slot_id)}
                />
                {canWrite && (
                  <IconButton
                    label={`Editar franja ${slot.name}`}
                    icon={<EditOutlinedIcon />}
                    onClick={() => setForm({ open: true, slot })}
                  />
                )}
                {canWrite && (
                  <IconButton
                    label={`Dar de baja la franja ${slot.name}`}
                    tone="danger"
                    icon={<DeleteOutlineIcon />}
                    onClick={() => void handleDelete(slot)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <TimeSlotFormModal
        open={form.open}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        slot={form.slot}
      />
      <TimeSlotDetailModal slotId={detailId} onClose={() => setDetailId(null)} />
    </Card>
  );
};
