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
