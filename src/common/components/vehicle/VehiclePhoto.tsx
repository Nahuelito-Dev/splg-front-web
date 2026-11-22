import { useRenewablePhoto } from '../../../services/queries/photos';
import { carIcon } from '../../../pages/Cars/components/carIcon';
import { cx } from '../ui';

interface Props {
  carId: string;
  /** La `photoUrl` firmada que mandó el back. */
  url: string | null | undefined;
  typeCar?: string | null;
  className?: string;
  /** `false` si quien mira no puede pedirle esa foto al back (no se renueva al vencer). */
  renewable?: boolean;
}

/**
 * La foto del vehículo llenando su contenedor (que fija el tamaño). Sin foto, o si no carga, el ícono del tipo de
 * vehículo sobre un fondo neutro. Decorativa: la patente siempre está escrita al lado.
 */
export const VehiclePhoto = ({ carId, url, typeCar = null, className, renewable = true }: Props) => {
  const photo = useRenewablePhoto('car', carId, url, renewable);
  const Icon = carIcon(typeCar);
  if (!photo.src || photo.failed) {
    return (
      <span
        data-testid="vehicle-photo-fallback"
        aria-hidden="true"
        className={cx('flex h-full w-full items-center justify-center bg-surface-muted text-faint', className)}
      >
        <Icon className="h-2/5 max-h-16 w-2/5 max-w-16" strokeWidth={1.4} />
      </span>
    );
  }
  return (
    <img
      src={photo.src}
      alt=""
      loading="lazy"
      onError={photo.handleError}
      className={cx('h-full w-full bg-surface-muted object-cover', className)}
    />
  );
};
