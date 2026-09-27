import { isAxiosError } from 'axios';

/** Forma de los errores de la API (filtro global de Nest). */
interface ErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/** Un error de la API ya interpretado: estado HTTP y mensajes legibles. */
export class ApiError extends Error {
  constructor(
    readonly status: number | null,
    readonly messages: string[],
  ) {
    super(messages[0] ?? 'Error inesperado');
    this.name = 'ApiError';
  }

  get notFound(): boolean {
    return this.status === 404;
  }

  get forbidden(): boolean {
    return this.status === 403;
  }
}

const isErrorBody = (value: unknown): value is ErrorBody =>
  typeof value === 'object' && value !== null && ('message' in value || 'statusCode' in value);

/** Convierte cualquier error (de axios o no) en un ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const body: unknown = error.response?.data;
    if (isErrorBody(body) && body.message) {
      return new ApiError(status, Array.isArray(body.message) ? body.message : [body.message]);
    }
    if (status === null) return new ApiError(null, ['No se pudo conectar con el servidor']);
    return new ApiError(status, [`Error ${status}`]);
  }
  if (error instanceof Error) return new ApiError(null, [error.message]);
  return new ApiError(null, ['Error inesperado']);
}

/** El mensaje para mostrarle al usuario. */
export const errorMessage = (error: unknown): string => toApiError(error).messages.join('. ');
