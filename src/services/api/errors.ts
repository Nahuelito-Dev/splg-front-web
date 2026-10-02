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

  /** 400 por un id que no es UUID (`/cosas/abc`): para una ficha es lo mismo que "no existe". */
  get invalidId(): boolean {
    return this.status === 400 && this.messages.some((message) => message.includes('uuid is expected'));
  }

  get forbidden(): boolean {
    return this.status === 403;
  }
}

const isErrorBody = (value: unknown): value is ErrorBody =>
  typeof value === 'object' && value !== null && ('message' in value || 'statusCode' in value);

/** El back pide `X-Distributor` con «Falta la distribuidora…»: en el panel se resuelve eligiendo una empresa. */
const MISSING_DISTRIBUTOR = /^Falta la distribuidora/;
const MISSING_DISTRIBUTOR_MESSAGE = 'Elegí una distribuidora para operar';

const friendly = (status: number | null, messages: string[]): string[] =>
  status === 400 ? messages.map((m) => (MISSING_DISTRIBUTOR.test(m) ? MISSING_DISTRIBUTOR_MESSAGE : m)) : messages;

/** Convierte cualquier error (de axios o no) en un ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const body: unknown = error.response?.data;
    if (isErrorBody(body) && body.message) {
      return new ApiError(status, friendly(status, Array.isArray(body.message) ? body.message : [body.message]));
    }
    if (status === null) return new ApiError(null, ['No se pudo conectar con el servidor']);
    return new ApiError(status, [`Error ${status}`]);
  }
  if (error instanceof Error) return new ApiError(null, [error.message]);
  return new ApiError(null, ['Error inesperado']);
}

/** El mensaje para mostrarle al usuario. */
export const errorMessage = (error: unknown): string => toApiError(error).messages.join('. ');

/** `FileReader` en vez de `Blob.text()`: más viejo, pero lo soportan todos los navegadores (y el jsdom de los tests). */
const readBlobAsText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la respuesta'));
    reader.readAsText(blob);
  });

/**
 * Para pedidos con `responseType: 'blob'` (descargar un adjunto): si fallan, el cuerpo del
 * error también viaja como `Blob` (axios no distingue responseType entre éxito y error), así
 * que `toApiError` no lo puede leer directo y muestra "Error 404" en vez del mensaje real.
 * Esto lee ese blob como texto e intenta interpretarlo como el JSON de siempre.
 */
export async function toApiErrorFromBlob(error: unknown): Promise<ApiError> {
  if (isAxiosError(error) && error.response?.data instanceof Blob) {
    const status = error.response.status;
    try {
      const body: unknown = JSON.parse(await readBlobAsText(error.response.data));
      if (isErrorBody(body) && body.message) {
        return new ApiError(status, Array.isArray(body.message) ? body.message : [body.message]);
      }
    } catch {
      // El cuerpo no era JSON legible: sigue con el mensaje genérico de toApiError.
    }
  }
  return toApiError(error);
}
