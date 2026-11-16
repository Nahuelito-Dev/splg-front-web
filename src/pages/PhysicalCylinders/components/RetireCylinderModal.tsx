import { ReasonModal } from '../../../common/components/ui';
import type { Cylinder } from '../../../services/api/types';
import { useRetireCylinder } from '../../../services/queries/physicalCylinders';
import { notify } from '../../../utils/notifications';

interface Props {
  cylinder: Cylinder | null;
  onClose: () => void;
}

/** Baja lógica de un envase: pasa a «Retirado» con su motivo; no se borra y queda en el historial. */
export const RetireCylinderModal = ({ cylinder, onClose }: Props) => {
  const retire = useRetireCylinder();
  return (
    <ReasonModal
      open={Boolean(cylinder)}
      onClose={onClose}
      title="Dar de baja el envase"
      description={`Baja lógica: ${cylinder?.serial ?? 'el envase'} queda como «Retirado» y no se puede volver a usar. No se borra: el historial y el motivo se conservan.`}
      reasonLabel="Motivo de la baja"
      placeholder="Por ejemplo: válvula dañada, no pasó la inspección"
      confirmLabel="Dar de baja"
      loading={retire.isPending}
      onConfirm={(reason) => {
        if (!cylinder) return;
        retire.mutate(
          { id: cylinder.cylinder_id, body: { reason } },
          {
            onSuccess: () => {
              notify.success('Envase dado de baja');
              onClose();
            },
            onError: notify.error,
          },
        );
      }}
    />
  );
};
