import type { LatLngExpression } from 'leaflet';

/**
 * Entre Posadas y Garupá (Misiones): zona de operación de la distribuidora,
 * para cuando todavía no hay ninguna zona cargada (con zonas, el mapa se
 * encuadra solo a ellas: ver `FitZonesBounds`).
 */
export const DEFAULT_MAP_CENTER: LatLngExpression = [-27.4, -55.89];
export const DEFAULT_MAP_ZOOM = 12;
