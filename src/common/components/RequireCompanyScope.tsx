import { Navigate, Outlet } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { usePermissions } from '../../hooks';
import { RequestSupportButton } from '../support/RequestSupportButton';
import { EmptyState, PageContainer } from './ui';

/**
 * Pantallas de una empresa (pedidos, clientes, caja…). El admin de la empresa entra siempre; el administrador general,
 * sólo con una sesión de soporte activa (y en sólo lectura). Sin sesión no se monta la pantalla, ni entrando por URL:
 * la API le respondería 403 `SUPPORT_SESSION_REQUIRED` a cada consulta.
 */
export const RequireCompanyScope = () => {
  const { mode } = usePermissions();
  if (mode !== 'platform') return <Outlet />;
  return (
    <PageContainer>
      <EmptyState
        icon={LifeBuoy}
        title="Es una pantalla de una empresa"
        description="Para ver datos de una empresa entrá en modo soporte: la empresa lo aprueba, es sólo lectura y queda registrado."
        action={<RequestSupportButton />}
      />
    </PageContainer>
  );
};

/** Pantallas sólo del admin de la empresa: la API se las niega al administrador general, esté o no en modo soporte. */
export const RequireCompanyAdmin = () => {
  const { mode } = usePermissions();
  return mode === 'company' ? <Outlet /> : <Navigate to="/home" replace />;
};
