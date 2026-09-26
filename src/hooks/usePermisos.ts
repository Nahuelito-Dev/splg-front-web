import { useAppSelector } from './reduxHooks';

/**
 * Lo que la sesión puede hacer según su rol, con las mismas reglas que el
 * backend. La cuenta de un cliente (datos, contraseña, bloqueo, baja) la
 * administra el administrador general: un cliente puede comprarle a varias
 * distribuidoras. El admin de empresa sí valida o invalida a sus clientes.
 */
export const usePermisos = () => {
  const { role } = useAppSelector((state) => state.auth);
  const esSuperAdmin = role === 'super_admin';
  return {
    esSuperAdmin,
    puedeAdministrarCuentasDeClientes: esSuperAdmin,
  };
};
