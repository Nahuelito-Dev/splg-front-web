import type { ReactNode } from 'react';
import { Avatar } from './ui/Avatar';
import { PhotoThumb } from './ui/PhotoThumb';

interface Props {
  name: string;
  /** La `photoUrl` firmada de la propia cuenta (`useMyAccount`). */
  photoUrl: string | null | undefined;
  size?: 'md' | 'lg';
  fallback?: ReactNode;
}

/**
 * La foto de la cuenta de quien está en el panel. Usa la URL que ya trae «mi cuenta» y la renueva con
 * `/users/me/photo`, que sirve en todos los modos. No pasa por `POST /v2/people/photos`: esa ruta es de una empresa y
 * al administrador general en la plataforma le responde 403 `SUPPORT_SESSION_REQUIRED`.
 */
export const MyAvatar = ({ name, photoUrl, size = 'md', fallback }: Props) => (
  <PhotoThumb
    kind="user"
    id="me"
    url={photoUrl}
    size={size}
    fallback={fallback ?? <Avatar name={name} size={size} />}
  />
);
