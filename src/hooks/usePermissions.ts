import { activeDistributor } from '../services/api/activeDistributor';
import { useAppSelector } from './reduxHooks';

/**
 * Lo que la sesión puede hacer según su rol, con las mismas reglas que la API.
 * La cuenta de un cliente (datos, contraseña, bloqueo, baja) la administra el
 * administrador general: un cliente puede comprarle a varias distribuidoras.
 * Los clientes no se validan (26/09).
 */
export const usePermissions = () => {
  const role = useAppSelector((state) => state.auth.role);
  const isSuperAdmin = role === 'super_admin';
  // Toda alta del administrador general necesita una distribuidora elegida.
  const needsDistributor = isSuperAdmin && !activeDistributor.get();
  return {
    isSuperAdmin,
    needsDistributor,
    /** Crear o editar datos de una empresa: la API lo rechaza sin distribuidora. */
    canWrite: !needsDistributor,
    /** Por qué un botón de alta está deshabilitado (para su `title`). */
    writeHint: needsDistributor ? 'Elegí una distribuidora con «Ver como» para crear' : undefined,
    canManageCustomerAccounts: isSuperAdmin,
    /** GET /audit exige rol admin o super_admin: los dos únicos que entran al panel. */
    canViewAudit: role === 'admin' || role === 'super_admin',
  };
};
