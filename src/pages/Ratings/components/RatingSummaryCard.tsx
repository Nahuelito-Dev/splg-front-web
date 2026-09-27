import { Card } from '../../../common/components/ui';
import { Stars } from './Stars';

interface Props {
  title: string;
  subtitle?: string | null;
  average: number;
  count: number;
}

export const RatingSummaryCard = ({ title, subtitle, average, count }: Props) => (
  <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <h2 className="truncate text-lg font-semibold text-ink">{subtitle ?? 'Sin nombre'}</h2>
    </div>
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-ink">{average.toFixed(1)}</span>
        <Stars value={average} size="md" />
      </div>
      <span className="text-xs text-muted">
        {count} {count === 1 ? 'calificación' : 'calificaciones'}
      </span>
    </div>
  </Card>
);
