import { Link } from 'react-router-dom';
import { formatShortId } from '../../../utils/format';
import { cx } from './cx';

interface Props {
  userId: string;
  /** El nombre ya resuelto; sin él se muestra el id corto (o "Cargando…" mientras se resuelve). */
  name?: string | null;
  loading?: boolean;
  className?: string;
}

/** Referencia a un usuario por su id: el nombre como enlace a su ficha. No dispara el clic de la fila que la contiene. */
export const UserRefLink = ({ userId, name, loading = false, className }: Props) => (
  <Link
    to={`/users/details/${userId}`}
    onClick={(event) => event.stopPropagation()}
    className={cx('font-medium text-primary-strong hover:underline', className)}
  >
    {name || (loading ? 'Cargando…' : formatShortId(userId))}
  </Link>
);
