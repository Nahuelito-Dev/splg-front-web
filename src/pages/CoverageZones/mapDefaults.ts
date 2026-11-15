import type { LatLng } from '../../common/components/map/latLng';

/**
 * Entre Posadas y Garupá (Misiones): zona de operación de la distribuidora,
 * para cuando todavía no hay ninguna zona cargada (con zonas, el mapa se
 * encuadra solo a ellas).
 */
export const DEFAULT_MAP_CENTER: LatLng = { lat: -27.4, lng: -55.89 };
export const DEFAULT_MAP_ZOOM = 12;
