import { TRACKING_PERMISSIONS } from '../../common/components/sidemenu/navConfig';
import { usePermiso } from '../../hooks';

/**
 * Si la sesión puede ver el seguimiento en vivo: `pedidos.ver` o `despacho.gestionar`, lo mismo que exige
 * `GET /v2/tracking/vehicles` y que usa el menú. Mientras no se saben los permisos (o si no se pudieron leer) no se
 * niega nada: la API igual responde 403.
 */
export const useTrackingAccess = (): { forbidden: boolean } => {
  const [orders, dispatch] = TRACKING_PERMISSIONS;
  const canSeeOrders = usePermiso(orders);
  const canDispatch = usePermiso(dispatch);
  return {
    forbidden: canSeeOrders.known && canDispatch.known && !canSeeOrders.allowed && !canDispatch.allowed,
  };
};
