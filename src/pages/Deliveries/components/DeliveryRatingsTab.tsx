import { ErrorState, LoadingState } from '../../../common/components/ui';
import { resolveRatingStats } from '../../Ratings/ratingStats';
import { RatingHistoryList } from '../../Ratings/components/RatingHistoryList';
import { RatingSummaryCard } from '../../Ratings/components/RatingSummaryCard';
import { useRatingHistory, useRatingSummary } from '../../../services/queries/ratings';

/** Pestaña "Calificaciones": lo que recibió este chofer de sus clientes al finalizar cada pedido. */
export const DeliveryRatingsTab = ({ userId, name }: { userId: string; name?: string | null }) => {
  const summaryQuery = useRatingSummary(userId);
  const historyQuery = useRatingHistory(userId);
  const { data: summary, isPending: loadingSummary } = summaryQuery;
  const { data: history, isPending: loadingHistory } = historyQuery;
  const stats = resolveRatingStats(summary, history);

  const error = summaryQuery.error ?? historyQuery.error;
  if (error) {
    return (
      <ErrorState
        error={error}
        resource="Las calificaciones"
        onRetry={() => {
          void summaryQuery.refetch();
          void historyQuery.refetch();
        }}
      />
    );
  }
  if (loadingSummary || loadingHistory) return <LoadingState label="Cargando calificaciones…" />;

  return (
    <div className="space-y-6">
      <RatingSummaryCard title="Promedio recibido" subtitle={name} average={stats.average} count={stats.count} />
      <RatingHistoryList ratings={history ?? []} />
    </div>
  );
};
