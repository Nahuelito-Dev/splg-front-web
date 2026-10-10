import { ReasonModal } from '../../../common/components/ui';
import type { Incident } from '../../../services/api/types';
import { useResolveIncident } from '../../../services/queries/incidents';
import { notify } from '../../../utils/notifications';

interface Props {
  incident: Incident | null;
  onClose: () => void;
}

/** Baja lógica de una incidencia abierta: se descarta con su motivo y queda en la pestaña «Descartadas». */
export const DiscardIncidentModal = ({ incident, onClose }: Props) => {
  const resolve = useResolveIncident();
  return (
    <ReasonModal
      open={Boolean(incident)}
      onClose={onClose}
      title="Descartar incidencia"
      description="Baja lógica: la incidencia no corresponde. No se borra; queda en «Descartadas» con el motivo."
      reasonLabel="Motivo del descarte"
      placeholder="Por ejemplo: se cargó por error / duplicada"
      confirmLabel="Descartar"
      loading={resolve.isPending}
      onConfirm={(resolutionNote) => {
        if (!incident) return;
        resolve.mutate(
          { id: incident.incident_id, body: { resolutionNote, status: 'discarded' } },
          {
            onSuccess: () => {
              notify.success('Incidencia descartada');
              onClose();
            },
            onError: notify.error,
          },
        );
      }}
    />
  );
};
