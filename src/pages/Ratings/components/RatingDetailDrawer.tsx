import { Link } from 'react-router-dom';
import { AuditHistoryLink, Badge, DetailList, Drawer, PersonAvatar } from '../../../common/components/ui';
import { useRating } from '../../../services/queries/ratings';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { Stars } from './Stars';

interface Props {
  ratingId: string | null;
  onClose: () => void;
}

/** Una calificación completa (`GET /ratings/:id`), con la moderación si está oculta. */
export const RatingDetailDrawer = ({ ratingId, onClose }: Props) => {
  const { data: rating, isPending, error } = useRating(ratingId ?? undefined);
  return (
    <Drawer open={Boolean(ratingId)} onClose={onClose} title="Detalle de la calificación">
      {isPending ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : error || !rating ? (
        <p role="alert" className="text-sm text-danger">
          No se pudo cargar la calificación.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Stars value={rating.stars} />
            {rating.hidden && <Badge label={{ text: 'Oculta', tone: 'neutral' }} />}
          </div>
          {rating.comment && <p className="text-sm italic text-muted">“{rating.comment}”</p>}
          <DetailList
            items={[
              {
                label: 'Calificó',
                value: (
                  <span className="inline-flex items-center gap-2">
                    <PersonAvatar
                      name={rating.fromUser?.full_name ?? 'Usuario'}
                      userId={rating.from_user_id}
                      size="xs"
                      decorative
                    />
                    {rating.fromUser?.full_name ?? '—'}
                  </span>
                ),
              },
              { label: 'Rol de quien calificó', value: rating.from_role === 'customer' ? 'Cliente' : 'Chofer' },
              { label: 'Fecha', value: formatDateTime(rating.createdAt) },
              {
                label: 'Pedido',
                value: (
                  <Link className="font-mono text-primary underline" to={`/orders/${rating.order_id}`}>
                    {formatShortId(rating.order_id)}
                  </Link>
                ),
              },
              ...(rating.hidden
                ? [
                    { label: 'Motivo de la moderación', value: rating.hiddenReason ?? '—', wide: true },
                    { label: 'Oculta desde', value: formatDateTime(rating.hiddenAt) },
                  ]
                : []),
              { label: 'Id de la calificación', value: rating.rating_id, mono: true, wide: true },
            ]}
          />
          <AuditHistoryLink entity="Rating" recordId={rating.rating_id} />
        </div>
      )}
    </Drawer>
  );
};
