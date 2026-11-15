import { errorMessage, toApiError } from '../../services/api/errors';
import { ROUTE_SHEET_CODES } from '../../services/api/routeSheets';
import { isSheetBusy, isVersionConflict } from '../../services/queries/routeSheets';
import { notify } from '../../utils/notifications';

export const VERSION_CONFLICT_MESSAGE = 'Otro administrador cambió esta hoja';
export const BUSY_MESSAGE = 'Otra sesión está editando esta hoja en este momento: probá de nuevo en unos segundos';

/**
 * El aviso de un error al editar una hoja. Ante un 409 de versión la hoja ya se recargó (lo hace el hook): se avisa
 * por qué cambió. Si la hoja seguía tomada después de los reintentos, se pide probar de nuevo.
 */
export const notifySheetError = (error: unknown) => {
  if (isVersionConflict(error)) notify.warn(VERSION_CONFLICT_MESSAGE);
  else if (isSheetBusy(error)) notify.warn(BUSY_MESSAGE);
  else notify.error(error);
};

const STRAIGHT = 'las paradas van unidas en línea recta';

/** Por qué no hay recorrido por calles, dicho para quien arma la hoja. */
export const pathErrorText = (error: unknown): string => {
  const { code, status } = toApiError(error);
  if (code === ROUTE_SHEET_CODES.pathDailyLimit || status === 429)
    return `Se llegó al máximo de recorridos por calles del día: ${STRAIGHT}.`;
  if (code === ROUTE_SHEET_CODES.providerFailed || status === 502)
    return `El servicio de mapas no respondió: ${STRAIGHT}.`;
  if (code === ROUTE_SHEET_CODES.providerUnavailable || status === 503)
    return `No hay un servicio de mapas configurado: ${STRAIGHT}.`;
  return `No se pudo trazar el recorrido por calles (${errorMessage(error)}): ${STRAIGHT}.`;
};
