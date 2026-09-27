import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: Props) => (
  <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
    <p className="font-display text-base font-semibold text-ink">{title}</p>
    {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
