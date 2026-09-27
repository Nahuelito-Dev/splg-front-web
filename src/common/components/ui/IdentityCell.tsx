import type { LucideIcon } from 'lucide-react';
import { Avatar } from './Avatar';

interface Props {
  title: string;
  subtitle?: string;
  /** Avatar con las iniciales de este nombre. */
  avatarName?: string;
  /** Ícono en un recuadro, para cosas que no son personas. */
  icon?: LucideIcon;
  /** El subtítulo es un id, una patente o un código: va en mono. */
  monoSubtitle?: boolean;
}

/** Primera columna de una tabla: qué es la fila, con su dato de referencia abajo. */
export const IdentityCell = ({ title, subtitle, avatarName, icon: Icon, monoSubtitle = false }: Props) => (
  <div className="flex min-w-0 items-center gap-2.5">
    {avatarName && <Avatar name={avatarName} />}
    {Icon && (
      <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2">
        <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
      </span>
    )}
    <span className="min-w-0 leading-tight">
      <span className="block truncate font-semibold text-ink">{title}</span>
      {subtitle && (
        <span className={`block truncate text-[11.5px] text-muted ${monoSubtitle ? 'font-mono' : ''}`}>{subtitle}</span>
      )}
    </span>
  </div>
);
