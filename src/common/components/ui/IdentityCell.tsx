import type { LucideIcon } from 'lucide-react';
import type { PhotoKind } from '../../../services/api/photos';
import { Avatar } from './Avatar';
import { PersonAvatar } from './PersonAvatar';
import { PhotoThumb } from './PhotoThumb';

interface Props {
  title: string;
  subtitle?: string;
  /** Avatar con las iniciales de este nombre. */
  avatarName?: string;
  /** Ícono en un recuadro, para cosas que no son personas. */
  icon?: LucideIcon;
  /** El subtítulo es un id, una patente o un código: va en mono. */
  monoSubtitle?: boolean;
  /** Foto del back (`photoUrl`): reemplaza al avatar o al ícono; si no hay o no carga, queda lo de siempre. */
  photo?: { kind: PhotoKind; id: string; url: string | null | undefined };
  /** Persona cuya foto no viene en la fila: se pide por id (usuario o legajo) y, sin foto, quedan las iniciales. */
  person?: { userId?: string | null; employeeId?: string | null; deliveryId?: string | null };
}

/** Primera columna de una tabla: qué es la fila, con su dato de referencia abajo. */
export const IdentityCell = ({
  title,
  subtitle,
  avatarName,
  icon: Icon,
  monoSubtitle = false,
  photo,
  person,
}: Props) => {
  const lead = (
    <>
      {avatarName &&
        (person && (person.userId || person.employeeId || person.deliveryId) ? (
          <PersonAvatar
            name={avatarName}
            userId={person.userId}
            employeeId={person.employeeId}
            deliveryId={person.deliveryId}
          />
        ) : (
          <Avatar name={avatarName} />
        ))}
      {Icon && (
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-outline-soft bg-bg text-ink-2">
          <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
        </span>
      )}
    </>
  );
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {photo ? <PhotoThumb {...photo} fallback={lead} shape={avatarName ? 'circle' : 'square'} /> : lead}
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-semibold text-ink">{title}</span>
        {subtitle && (
          <span className={`block truncate text-[11.5px] text-muted ${monoSubtitle ? 'font-mono' : ''}`}>
            {subtitle}
          </span>
        )}
      </span>
    </div>
  );
};
