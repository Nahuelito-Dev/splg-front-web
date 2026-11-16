import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from './cx';
import { TONE_CLASSES } from './toneClasses';
import type { Tone } from '../../../utils/statusLabels';

export interface TableroTimelineItem {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail?: string;
  /** Hora relativa ya formateada ("hace 5 min"). */
  time: string;
  to?: string;
}

interface Props {
  items: TableroTimelineItem[];
}

const Entry = ({ item, last }: { item: TableroTimelineItem; last: boolean }) => {
  const Icon = item.icon;
  const body = (
    <>
      <span className="relative flex flex-col items-center">
        <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full', TONE_CLASSES[item.tone])}>
          <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        {!last && <span aria-hidden="true" className="mt-1 w-px flex-1 bg-outline" />}
      </span>
      <span className={cx('min-w-0', last ? 'pb-0' : 'pb-4')}>
        <b className="block truncate text-[13px] font-semibold text-ink">{item.title}</b>
        {item.detail && <span className="block truncate text-[12px] text-muted">{item.detail}</span>}
        <span className="text-[11.5px] text-muted">{item.time}</span>
      </span>
    </>
  );
  const row = 'grid grid-cols-[28px_1fr] gap-x-3 rounded-md';
  return item.to ? (
    <Link to={item.to} className={cx(row, 'transition-colors hover:bg-surface-sunken')}>
      {body}
    </Link>
  ) : (
    <div className={row}>{body}</div>
  );
};

/** Línea de tiempo vertical: un ícono por evento, con título, detalle y hora relativa. */
export const TableroTimeline = ({ items }: Props) => (
  <ol aria-label="Actividad reciente">
    {items.map((item, index) => (
      <li key={item.id}>
        <Entry item={item} last={index === items.length - 1} />
      </li>
    ))}
  </ol>
);
