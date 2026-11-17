import { X } from 'lucide-react';
import { IconButton } from '../../common/components/ui';
import type { RouteOrderSummary } from '../../services/api/types';
import { formatKm, formatMinutes } from './routeSheetLabels';

interface Props {
  before: RouteOrderSummary;
  after: RouteOrderSummary;
  onClose: () => void;
}

const Row = ({ label, before, after }: { label: string; before: string; after: string }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 text-[13px]">
    <dt className="text-muted">{label}</dt>
    <dd className="tabular-nums text-ink-2 line-through decoration-outline">{before}</dd>
    <dd className="tabular-nums font-semibold text-ink">{after}</dd>
  </div>
);

/** El antes y el después de «Ordenar óptimo», con lo que lo calculó el back. */
export const OptimizeResult = ({ before, after, onClose }: Props) => (
  <section
    aria-label="Resultado de ordenar"
    className="flex items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3"
  >
    <div className="min-w-0 flex-1">
      <h3 className="mb-2 text-sm font-semibold text-ink">Orden óptimo: antes y después</h3>
      <dl className="grid max-w-sm gap-1">
        <Row label="Recorrido" before={formatKm(before.distanceKm)} after={formatKm(after.distanceKm)} />
        <Row label="Duración" before={formatMinutes(before.durationMin)} after={formatMinutes(after.durationMin)} />
        <Row label="Paradas fuera de franja" before={String(before.lateStops)} after={String(after.lateStops)} />
      </dl>
    </div>
    <IconButton label="Cerrar el resultado" icon={<X className="h-4 w-4" />} onClick={onClose} />
  </section>
);
