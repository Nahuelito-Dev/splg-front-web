import { Card, ErrorState, TableSkeleton } from '../../../common/components/ui';
import { resolveRatingStats } from '../ratingStats';
import { RatingHistoryList } from './RatingHistoryList';
import { RatingSummaryCard } from './RatingSummaryCard';
import { useRatingHistory, useRatingSummary } from '../../../services/queries/ratings';

/** Pestaña "Calificaciones" de una ficha: lo que recibió esta persona (chofer o cliente) al finalizar cada pedido. */
export const UserRatingsTab = ({ userId, name }: { userId: string; name?: string | null }) => {
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
  if (loadingSummary || loadingHistory) {
    return (
      <Card>
        <TableSkeleton rows={3} columns={3} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <RatingSummaryCard title="Promedio recibido" subtitle={name} average={stats.average} count={stats.count} />
      <RatingHistoryList ratings={history ?? []} />
    </div>
  );
};
