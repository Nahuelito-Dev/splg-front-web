import { ApiError, toApiError } from '../../services/api/errors';

/** El diálogo de «Dar de baja»: la baja es de esta distribuidora, la cuenta del cliente sigue existiendo. */
export const removalConfirmation = (name: string | null | undefined) => ({
  title: '¿Dar de baja al cliente?',
  text: `${name ?? 'El cliente'} deja de ser cliente de esta distribuidora. Su cuenta sigue existiendo y su historial de pedidos se conserva. Podés reactivarlo desde «Dados de baja».`,
  confirmText: 'Dar de baja',
  danger: true,
});

export const restoreConfirmation = (name: string | null | undefined) => ({
  title: '¿Reactivar al cliente?',
  text: `${name ?? 'El cliente'} vuelve a ser cliente de esta distribuidora.`,
  confirmText: 'Reactivar',
});

/**
 * Un 404 en la baja o la reactivación es que el cliente ya cambió (otra pestaña u otro admin): el back
 * responde con un texto interno, acá va uno que se entiende.
 */
export const removalError = (error: unknown): ApiError => {
  const apiError = toApiError(error);
  return apiError.status === 404
    ? new ApiError(404, ['El cliente ya no está como lo veías: se actualizó la lista, volvé a intentarlo'])
    : apiError;
};
