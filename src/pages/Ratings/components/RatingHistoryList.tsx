import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Badge, Card, EmptyState, RowActions, UserRefLink } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { Rating } from '../../../services/api/types';
import { useUserNames } from '../../../services/queries/userNames';
import { formatDateTime } from '../../../utils/format';
import { ModerateRatingModal } from './ModerateRatingModal';
import { RatingDetailDrawer } from './RatingDetailDrawer';
import { Stars } from './Stars';

const ROLE_LABEL: Record<Rating['from_role'], string> = {
  customer: 'Cliente',
  delivery: 'Chofer',
};

/** Las reseñas con quién calificó (`from_user_id`) a quién (`to_user_id`), cada uno con enlace a su ficha. */
export const RatingHistoryList = ({ ratings }: { ratings: Rating[] }) => {
  // `fromUser` viene en la respuesta; el calificado no, y es casi siempre el mismo: se pide una vez por id distinto.
  const { nameOf, loading } = useUserNames(ratings.map((rating) => rating.to_user_id));
  const { canWrite } = usePermissions();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [moderating, setModerating] = useState<Rating | null>(null);

  return (
    <Card>
      <div className="border-b border-outline p-4">
        <h2 className="text-base font-semibold text-ink">Reseñas</h2>
      </div>
      {ratings.length === 0 ? (
        <EmptyState title="Todavía no recibió calificaciones" />
      ) : (
        <ul className="divide-y divide-outline">
          {ratings.map((rating) => (
            <li key={rating.rating_id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={rating.stars} />
                  <Badge
                    label={{
                      text: ROLE_LABEL[rating.from_role],
                      tone: rating.from_role === 'customer' ? 'info' : 'accent',
                    }}
                  />
                  {rating.hidden && <Badge label={{ text: 'Oculta', tone: 'neutral' }} />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{formatDateTime(rating.createdAt)}</span>
                  <RowActions
                    rowLabel="calificación"
                    onView={() => setViewingId(rating.rating_id)}
                    onDelete={canWrite && !rating.hidden ? () => setModerating(rating) : undefined}
                    deleteLabel="Ocultar"
                    actions={
                      canWrite && rating.hidden
                        ? [{ label: 'Volver a mostrar', icon: Eye, onClick: () => setModerating(rating) }]
                        : []
                    }
                  />
                </div>
              </div>
              <p className="mt-1.5 text-sm text-muted">
                <UserRefLink userId={rating.from_user_id} name={rating.fromUser?.full_name} />
                <span aria-hidden="true"> → </span>
                <span className="sr-only"> califica a </span>
                <UserRefLink userId={rating.to_user_id} name={nameOf(rating.to_user_id)} loading={loading} />
              </p>
              {rating.comment && <p className="mt-2 text-sm italic text-muted">“{rating.comment}”</p>}
              {rating.hidden && rating.hiddenReason && (
                <p className="mt-1 text-xs text-muted">Oculta: {rating.hiddenReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <RatingDetailDrawer ratingId={viewingId} onClose={() => setViewingId(null)} />
      <ModerateRatingModal rating={moderating} onClose={() => setModerating(null)} />
    </Card>
  );
};
