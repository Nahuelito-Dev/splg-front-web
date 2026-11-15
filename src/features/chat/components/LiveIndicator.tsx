import { cx } from '../../../common/components/ui';

/** «En vivo» / «Reconectando…»: queda a la vista mientras dura el corte (P3). */
export const LiveIndicator = ({ online }: { online: boolean }) => (
  <span
    role="status"
    className={cx(
      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
      online ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn',
    )}
  >
    <span
      aria-hidden="true"
      className={cx('h-1.5 w-1.5 rounded-full', online ? 'bg-success' : 'animate-pulse bg-warn')}
    />
    {online ? 'En vivo' : 'Reconectando…'}
  </span>
);
