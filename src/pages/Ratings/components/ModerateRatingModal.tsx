import { ReasonModal } from '../../../common/components/ui';
import type { Rating } from '../../../services/api/types';
import { useModerateRating } from '../../../services/queries/ratings';
import { notify } from '../../../utils/notifications';

interface Props {
  rating: Rating | null;
  onClose: () => void;
}

/** Ocultar o volver a mostrar una calificación. Es la baja lógica de la reseña: no se borra y el motivo queda. */
export const ModerateRatingModal = ({ rating, onClose }: Props) => {
  const moderate = useModerateRating();
  const hide = rating ? !rating.hidden : true;
  return (
    <ReasonModal
      open={Boolean(rating)}
      onClose={onClose}
      title={hide ? 'Ocultar calificación' : 'Volver a mostrar la calificación'}
      description={
        hide
          ? 'Baja lógica: la calificación no se borra, pero deja de contar en el promedio y no se muestra a los clientes.'
          : 'La calificación vuelve a contar en el promedio.'
      }
      reasonLabel={hide ? 'Motivo para ocultarla' : 'Motivo para mostrarla'}
      placeholder={hide ? 'Por ejemplo: lenguaje ofensivo' : 'Por ejemplo: se revisó y es válida'}
      confirmLabel={hide ? 'Ocultar' : 'Volver a mostrar'}
      danger={hide}
      loading={moderate.isPending}
      onConfirm={(reason) => {
        if (!rating) return;
        moderate.mutate(
          { id: rating.rating_id, hide, body: { reason } },
          {
            onSuccess: () => {
              notify.success(hide ? 'Calificación oculta' : 'Calificación visible');
              onClose();
            },
            onError: notify.error,
          },
        );
      }}
    />
  );
};
