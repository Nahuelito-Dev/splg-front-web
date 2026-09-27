import type { HTMLAttributes } from 'react';
import { cx } from './cx';

export const Card = ({ className, ...resto }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cx('rounded-card border border-outline bg-surface shadow-card', className)} {...resto} />
);
