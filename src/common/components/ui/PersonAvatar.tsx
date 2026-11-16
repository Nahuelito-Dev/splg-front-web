import { useState, type ReactNode } from 'react';
import { usePersonPhoto, type PersonRef } from '../../../services/queries/peoplePhotos';
import { Avatar } from './Avatar';
import { AVATAR_SIZES, type AvatarSize } from './avatarSizes';
import { cx } from './cx';

interface Props {
  /** Nombre de la persona: el `alt` de la foto y las iniciales cuando no hay foto. */
  name: string;
  /** Id de usuario (cliente, chofer, admin). */
  userId?: string | null;
  /** Id de legajo, para quien se conoce sólo por el legajo. */
  employeeId?: string | null;
  /** Id de chofer (`delivery_id`), para quien se conoce sólo por su registro de reparto. */
  deliveryId?: string | null;
  size?: AvatarSize;
  /** La persona ya se nombra al lado: la foto no repite el nombre para los lectores de pantalla. */
  decorative?: boolean;
  /** Qué se dibuja sin foto, en vez de las iniciales de siempre. */
  fallback?: ReactNode;
  className?: string;
}

/**
 * Foto de perfil de una persona, o sus iniciales si no tiene (o no carga). Las fotos de todos los avatares de una
 * pantalla se piden juntas (`usePersonPhoto`). Mismo tamaño y recorte circular que `Avatar`.
 */
export const PersonAvatar = ({
  name,
  userId,
  employeeId,
  deliveryId,
  size = 'md',
  decorative = false,
  fallback,
  className,
}: Props) => {
  const ref: PersonRef | null = userId
    ? { kind: 'user', id: userId }
    : employeeId
      ? { kind: 'employee', id: employeeId }
      : deliveryId
        ? { kind: 'delivery', id: deliveryId }
        : null;
  const { data, refetch } = usePersonPhoto(ref);
  // La URL que falló al cargar: se pide una nueva una vez; si la nueva también falla, quedan las iniciales.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // Quién ya pidió su URL nueva: otra persona en el mismo componente empieza de cero.
  const [retriedFor, setRetriedFor] = useState<string | null>(null);
  const refId = ref ? `${ref.kind}:${ref.id}` : null;

  if (!data || data.url === failedUrl) return fallback ?? <Avatar name={name} size={size} className={className} />;
  return (
    <img
      src={data.url}
      alt={decorative ? '' : name}
      loading="lazy"
      onError={() => {
        setFailedUrl(data.url);
        if (retriedFor !== refId) {
          setRetriedFor(refId);
          void refetch();
        }
      }}
      className={cx(
        'shrink-0 rounded-full border border-outline-soft bg-bg object-cover',
        AVATAR_SIZES[size],
        className,
      )}
    />
  );
};
