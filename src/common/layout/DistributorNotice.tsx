import { Link } from 'react-router-dom';
import { usePermissions } from '../../hooks';

/**
 * El administrador general sin distribuidora elegida ve los datos de todas,
 * pero no puede dar de alta nada: la API pide saber de qué empresa es.
 */
export const DistributorNotice = () => {
  const { needsDistributor } = usePermissions();
  if (!needsDistributor) return null;

  return (
    <div role="status" className="border-b border-info/20 bg-info-soft px-4 py-2.5 text-sm text-info sm:px-6 lg:px-8">
      Estás viendo todas las distribuidoras. Para crear o editar, elegí una desde{' '}
      <Link to="/distributors" className="font-semibold underline underline-offset-2">
        Distribuidoras → Ver como
      </Link>
      .
    </div>
  );
};
