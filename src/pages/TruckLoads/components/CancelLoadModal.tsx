import { useEffect, useState } from 'react';
import { ReasonModal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { TruckLoad } from '../../../services/api/types';
import { useCancelTruckLoad } from '../../../services/queries/truckLoads';
import { notify } from '../../../utils/notifications';

interface Props {
  load: TruckLoad | null;
  onClose: () => void;
}

/** Cancela una carga que todavía se está cargando: no se movió stock, solo se libera el camión y el chofer. */
export const CancelLoadModal = ({ load, onClose }: Props) => {
  const cancel = useCancelTruckLoad();
  const [serverError, setServerError] = useState<string | null>(null);
  useEffect(() => setServerError(null), [load]);
  return (
    <ReasonModal
      open={load !== null}
      onClose={onClose}
      title={load ? `Cancelar la carga N° ${load.number}` : 'Cancelar carga'}
      description="Libera el camión y el chofer. No se movió stock, así que no hay nada que devolver."
      confirmLabel="Cancelar carga"
      loading={cancel.isPending}
      onConfirm={(reason) => {
        if (!load) return;
        setServerError(null);
        cancel.mutate(
          { id: load.loadId, body: { reason } },
          {
            onSuccess: () => {
              notify.success('Carga cancelada');
              onClose();
            },
            onError: (error) => setServerError(errorMessage(error)),
          },
        );
      }}
    >
      {serverError && (
        <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {serverError}
        </p>
      )}
    </ReasonModal>
  );
};
