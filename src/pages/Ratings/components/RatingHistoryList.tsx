import { Badge, Card, EmptyState, UserRefLink } from '../../../common/components/ui';
import type { Rating } from '../../../services/api/types';
import { useUserNames } from '../../../services/queries/userNames';
import { formatDateTime } from '../../../utils/format';
import { Stars } from './Stars';

const ROLE_LABEL: Record<Rating['from_role'], string> = {
  customer: 'Cliente',
  delivery: 'Chofer',
};

/** Las reseñas con quién calificó (`from_user_id`) a quién (`to_user_id`), cada uno con enlace a su ficha. */
export const RatingHistoryList = ({ ratings }: { ratings: Rating[] }) => {
  // `fromUser` viene en la respuesta; el calificado no, y es casi siempre el mismo: se pide una vez por id distinto.
  const { nameOf, loading } = useUserNames(ratings.map((rating) => rating.to_user_id));

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
                </div>
                <span className="text-xs text-muted">{formatDateTime(rating.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted">
                <UserRefLink userId={rating.from_user_id} name={rating.fromUser?.full_name} />
                <span aria-hidden="true"> → </span>
                <span className="sr-only"> califica a </span>
                <UserRefLink userId={rating.to_user_id} name={nameOf(rating.to_user_id)} loading={loading} />
              </p>
              {rating.comment && <p className="mt-2 text-sm italic text-muted">“{rating.comment}”</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
