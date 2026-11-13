import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '../../hooks';

/**
 * Ruta de la plataforma (distribuidoras, sistema, direcciones de todos los clientes): el menú ya la oculta para un
 * admin de empresa y la API le responde 403; si entra igual por URL, vuelve al inicio en vez de ver los errores.
 */
export const RequireSuperAdmin = () => {
  const { isSuperAdmin } = usePermissions();
  return isSuperAdmin ? <Outlet /> : <Navigate to="/home" replace />;
};
