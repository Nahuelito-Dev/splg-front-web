import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Ilustración sobria (un ícono en un círculo suave). Por defecto, una bandeja vacía. */
  icon?: LucideIcon;
}

export const EmptyState = ({ title, description, action, icon: Icon = Inbox }: Props) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-surface-muted text-faint">
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.6} />
    </span>
    <div className="flex flex-col gap-1">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
    </div>
    {action && <div className="mt-1">{action}</div>}
  </div>
);
