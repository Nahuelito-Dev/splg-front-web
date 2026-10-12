import { Outlet } from 'react-router-dom';
import { usePermissions } from '../../hooks';
import { EmptyState } from './ui';

/**
 * Ruta que sólo tiene sentido dentro de una distribuidora (stock, compras, cargas): el administrador general sin
 * «Ver como» recibiría un 400 de cada consulta, así que se le pide elegir una antes de mostrar nada.
 */
export const RequireDistributor = () => {
  const { needsDistributor } = usePermissions();
  if (needsDistributor) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <EmptyState
          title="Elegí una distribuidora"
          description="Como administrador general, elegí una con «Ver como» para ver su stock, sus compras y sus cargas."
        />
      </div>
    );
  }
  return <Outlet />;
};
