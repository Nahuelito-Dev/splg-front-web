import type { ReactNode } from 'react';
import type { PhotoKind } from '../../../services/api/photos';
import { useRenewablePhoto } from '../../../services/queries/photos';
import { cx } from './cx';

const SIZES = {
  sm: 'h-6 w-6',
  md: 'h-[30px] w-[30px]',
  lg: 'h-14 w-14',
  /** Llena el contenedor, que fija el tamaño. */
  fill: 'h-full w-full',
} as const;

interface Props {
  kind: PhotoKind;
  /** Id con el que el back resuelve `.../photo` (para renovar la URL si venció). */
  id: string;
  /** La `photoUrl` firmada que mandó el back; sin ella (o si no carga) se muestra el `fallback`. */
  url: string | null | undefined;
  /** Iniciales o ícono cuando no hay foto. */
  fallback: ReactNode;
  size?: keyof typeof SIZES;
  /** Personas en círculo, cosas (vehículos, productos, empresas) en recuadro. */
  shape?: 'circle' | 'square';
  className?: string;
  /** `false` si quien mira no puede pedir esa foto al back: al vencer la URL queda el `fallback`, sin pedido. */
  renewable?: boolean;
}

/** Miniatura de una foto del back. Decorativa: el nombre siempre está escrito al lado. */
export const PhotoThumb = ({
  kind,
  id,
  url,
  fallback,
  size = 'md',
  shape = 'circle',
  className,
  renewable = true,
}: Props) => {
  const photo = useRenewablePhoto(kind, id, url, renewable);
  if (!photo.src || photo.failed) return <>{fallback}</>;
  return (
    <img
      src={photo.src}
      alt=""
      loading="lazy"
      onError={photo.handleError}
      className={cx(
        'shrink-0 border border-outline-soft bg-bg object-cover',
        SIZES[size],
        shape === 'circle' ? 'rounded-full' : 'rounded-lg',
        className,
      )}
    />
  );
};
