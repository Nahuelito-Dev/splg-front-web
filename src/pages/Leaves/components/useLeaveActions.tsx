import { useMemo, useState } from 'react';
import { ReasonModal } from '../../../common/components/ui';
import type { Leave } from '../../../services/api/types';
import { useApproveLeave, useCancelLeave, useRejectLeave } from '../../../services/queries/personnel';
import { formatDay } from '../../../utils/format';
import { confirm, notify } from '../../../utils/notifications';
import { LeaveFormModal } from './LeaveFormModal';
import type { LeaveRowHandlers } from './LeavesTable';

/**
 * Las decisiones sobre una licencia (aprobar, rechazar con motivo, cancelar, modificar) con sus confirmaciones y
 * modales, para la bandeja y para la ficha del empleado. Devuelve los handlers de la tabla y los modales a dibujar.
 */
export const useLeaveActions = () => {
  const approve = useApproveLeave();
  const reject = useRejectLeave();
  const cancel = useCancelLeave();
  const [rejecting, setRejecting] = useState<Leave | null>(null);
  const [editing, setEditing] = useState<Leave | null>(null);

  // `mutate` es estable entre renders: los handlers (y con ellos las columnas de la tabla) no se recrean.
  const { mutate: approveLeave } = approve;
  const { mutate: cancelLeave } = cancel;
  const handlers = useMemo<LeaveRowHandlers>(() => {
    const cancelWithConfirmation = async (leave: Leave) => {
      const confirmed = await confirm({
        title: '¿Cancelar la licencia?',
        text: `${leave.employeeName}: del ${formatDay(leave.startDate)} al ${formatDay(leave.endDate)}. El período queda libre y el chofer deja de estar de licencia para el despacho.`,
        confirmText: 'Cancelar licencia',
        danger: true,
      });
      if (!confirmed) return;
      cancelLeave(leave.leaveId, {
        onSuccess: () => notify.success('Licencia cancelada'),
        onError: notify.error,
      });
    };
    return {
      onApprove: (leave) =>
        approveLeave(leave.leaveId, {
          onSuccess: () => notify.success('Licencia aprobada'),
          onError: notify.error,
        }),
      onReject: setRejecting,
      onEdit: setEditing,
      onCancel: (leave) => void cancelWithConfirmation(leave),
    };
  }, [approveLeave, cancelLeave]);

  const modals = (
    <>
      <ReasonModal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Rechazar licencia"
        description={
          rejecting
            ? `${rejecting.employeeName}: del ${formatDay(rejecting.startDate)} al ${formatDay(rejecting.endDate)}. Queda asentado quién la rechazó y cuándo.`
            : ''
        }
        reasonLabel="Motivo del rechazo"
        placeholder="Sin cobertura esa semana"
        confirmLabel="Rechazar licencia"
        loading={reject.isPending}
        onConfirm={(reason) => {
          if (!rejecting) return;
          reject.mutate(
            { id: rejecting.leaveId, body: { reason } },
            {
              onSuccess: () => {
                notify.success('Licencia rechazada');
                setRejecting(null);
              },
              onError: notify.error,
            },
          );
        }}
      />
      <LeaveFormModal open={Boolean(editing)} onClose={() => setEditing(null)} leave={editing} />
    </>
  );

  return { handlers, modals };
};
