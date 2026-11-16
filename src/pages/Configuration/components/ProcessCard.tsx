import { Badge, Card, cx } from '../../../common/components/ui';
import type { ProcessSummaryItem } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { PROCESS_HEALTH, labelOf } from '../../../utils/statusLabels';
import { counterEntries, formatDuration, formatPeriod, needsAttention } from '../processMonitorRules';

interface Props {
  item: ProcessSummaryItem;
  /** Nombre de la distribuidora de la corrida, cuando se ven varias a la vez. */
  distributorName?: string;
}

const ACCENT: Partial<Record<ProcessSummaryItem['health'], string>> = {
  failed: 'border-danger',
  stuck: 'border-danger',
  late: 'border-warn',
};

/** Un proceso automático: su salud, su última corrida, cuándo se espera la próxima y lo que generó. */
export const ProcessCard = ({ item, distributorName }: Props) => {
  const run = item.lastRun;
  const counters = counterEntries(run?.counters);
  return (
    <Card className={cx('flex h-full flex-col gap-3 p-4', needsAttention(item) && ACCENT[item.health])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-ink">{item.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {item.module ? `${item.module} · ` : ''}
            {formatPeriod(item.expectedEverySeconds)}
            {distributorName ? ` · ${distributorName}` : ''}
          </p>
        </div>
        <Badge label={labelOf(PROCESS_HEALTH, item.health)} variant="critical" />
      </div>

      {run ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted">Última corrida</dt>
          <dd className="text-right text-ink">{formatDateTime(run.startedAt)}</dd>
          <dt className="text-muted">Duración</dt>
          <dd className="text-right text-ink">{formatDuration(run.durationMs)}</dd>
          <dt className="text-muted">Próxima esperada</dt>
          <dd className="text-right text-ink">{item.nextExpectedAt ? formatDateTime(item.nextExpectedAt) : '—'}</dd>
          {item.lastOkAt && run.status === 'failed' && (
            <>
              <dt className="text-muted">Última correcta</dt>
              <dd className="text-right text-ink">{formatDateTime(item.lastOkAt)}</dd>
            </>
          )}
        </dl>
      ) : (
        <p className="text-xs text-muted">Todavía no corrió desde que se activó el monitoreo.</p>
      )}

      {counters.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Lo que generó la última corrida">
          {counters.map((c) => (
            <li key={c.key} className="rounded-full bg-surface-muted px-2 py-0.5 text-[11.5px] text-ink-2">
              {c.label}: <b className="font-semibold text-ink">{c.value}</b>
            </li>
          ))}
        </ul>
      )}

      {run?.error && (
        <p role="note" className="break-words rounded-md bg-danger-soft px-2.5 py-1.5 text-xs text-danger">
          {run.error}
        </p>
      )}
    </Card>
  );
};
