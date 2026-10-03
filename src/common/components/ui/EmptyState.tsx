import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyIllustration, type EmptyVariant } from './EmptyIllustration';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Ícono en un círculo suave, para vacíos chicos (paneles, listas). Sin él se dibuja la ilustración. */
  icon?: LucideIcon;
  /** Qué ilustración: `box` (sin datos), `search` (sin resultados) o `done` (todo en orden). */
  illustration?: EmptyVariant;
}

export const EmptyState = ({ title, description, action, icon: Icon, illustration = 'box' }: Props) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    {Icon ? (
      <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-surface-muted text-faint">
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.6} />
      </span>
    ) : (
      <EmptyIllustration variant={illustration} />
    )}
    <div className="flex flex-col gap-1">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
    </div>
    {action && <div className="mt-1">{action}</div>}
  </div>
);
