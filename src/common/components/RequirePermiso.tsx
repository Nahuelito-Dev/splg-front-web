import { Outlet, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { usePermiso } from '../../hooks';
import { Button, EmptyState, LoadingState, PageContainer } from './ui';

interface Props {
  /** Código del catálogo de permisos (`auditoria.ver`). */
  permiso: string;
}

/**
 * Pantallas que pide un permiso del rol del personal: sin él se ve «Sin permiso» en vez de la pantalla (que recibiría
 * 403 en cada consulta), también entrando por URL. Mientras no se sabe se espera; si no se pudieron leer los permisos
 * se deja pasar: la API igual decide.
 */
export const RequirePermiso = ({ permiso }: Props) => {
  const navigate = useNavigate();
  const { allowed, known } = usePermiso(permiso);
  if (!known) return <LoadingState fullPage />;
  if (allowed) return <Outlet />;
  return (
    <PageContainer>
      <EmptyState
        icon={Lock}
        title="Sin permiso"
        description="Tu rol no tiene permiso para ver esta pantalla. Pedile acceso a quien administra los roles del personal."
        action={
          <Button variant="secondary" onClick={() => navigate('/home')}>
            Ir al tablero
          </Button>
        }
      />
    </PageContainer>
  );
};
