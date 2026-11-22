import type { ReactNode } from 'react';
import { PhotoThumb } from './PhotoThumb';

interface Props {
  /** Id del producto (garrafa del catálogo): con él se renueva la foto si venció. */
  id: string;
  /** `photoUrl` del producto que mandó el back; sin ella se muestra sólo el nombre. */
  photoUrl: string | null | undefined;
  children: ReactNode;
  className?: string;
}

/** Nombre de un producto con su miniatura al lado (sin foto, sólo el nombre). */
export const ProductName = ({ id, photoUrl, children, className = '' }: Props) => (
  <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
    <PhotoThumb kind="gasCylinder" id={id} url={photoUrl} size="sm" shape="square" fallback={null} />
    <span className="min-w-0">{children}</span>
  </span>
);
