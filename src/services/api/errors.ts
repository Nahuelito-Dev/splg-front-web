import { isAxiosError } from 'axios';

/** Forma de los errores de la API (filtro global de Nest). */
interface ErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  /** Código estable del back (en inglés) para decidir sin depender del texto, p. ej. `INVALID_ID`. */
  code?: string;
}

const MISSING_DISTRIBUTOR_MESSAGE = 'Esta acción es de una empresa: la hace un administrador de esa empresa';

/** Un error de la API ya interpretado: estado HTTP y mensajes legibles. */
export class ApiError extends Error {
  constructor(
    readonly status: number | null,
    readonly messages: string[],
    readonly code: string | null = null,
  ) {
    super(messages[0] ?? 'Error inesperado');
    this.name = 'ApiError';
  }

  get notFound(): boolean {
    return this.status === 404;
  }

  /** 400 por un id que no es UUID (`/cosas/abc`): para una ficha es lo mismo que "no existe". */
  get invalidId(): boolean {
    return this.status === 400 && this.code === 'INVALID_ID';
  }

  /** 400 por falta de empresa: el administrador general pidió desde la plataforma algo que es de una empresa. */
  get missingDistributor(): boolean {
    return this.status === 400 && this.messages.includes(MISSING_DISTRIBUTOR_MESSAGE);
  }

  get forbidden(): boolean {
    return this.status === 403;
  }

  /** 429: el back limita las consultas por minuto (p. ej. `POST /users/check-exists`, 10 por IP). */
  get rateLimited(): boolean {
    return this.status === 429;
  }
}

const isErrorBody = (value: unknown): value is ErrorBody =>
  typeof value === 'object' && value !== null && ('message' in value || 'statusCode' in value);

/** El back responde «Falta la distribuidora…» (pensado para el header): en el panel se explica quién lo hace. */
const MISSING_DISTRIBUTOR = /^Falta la distribuidora/;

/** El límite de pedidos del back (`ThrottlerException: Too Many Requests`) no le dice nada a quien opera el panel. */
const RATE_LIMITED_MESSAGE = 'Hiciste demasiados intentos seguidos: esperá un minuto y volvé a intentar';

/** `PATCH /incidents/:id/resolve` responde 409 con el endpoint en el texto: en el panel el cierre es «Resolver impago». */
const UNPAID_INCIDENT = /^La incidencia de cobro impago se cierra/;
const UNPAID_INCIDENT_MESSAGE =
  'Una incidencia de cobro impago se cierra resolviendo el cobro del pedido: usá «Resolver impago» en el pedido';

/** 403 de la API en modo soporte cuando el acceso no incluye archivos o exportes. */
const SCOPE_REQUIRED_MESSAGE =
  'Este acceso de soporte no incluye archivos ni exportes: para verlos, pedí otro acceso con ese alcance';

const friendly = (status: number | null, messages: string[], code?: string | null): string[] => {
  if (code === 'SUPPORT_SCOPE_REQUIRED') return [SCOPE_REQUIRED_MESSAGE];
  if (status === 429) return [RATE_LIMITED_MESSAGE];
  if (status === 409) return messages.map((m) => (UNPAID_INCIDENT.test(m) ? UNPAID_INCIDENT_MESSAGE : m));
  return status === 400
    ? messages.map((m) => (MISSING_DISTRIBUTOR.test(m) ? MISSING_DISTRIBUTOR_MESSAGE : m))
    : messages;
};

/** Convierte cualquier error (de axios o no) en un ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const body: unknown = error.response?.data;
    if (isErrorBody(body) && body.message) {
      return new ApiError(
        status,
        friendly(status, Array.isArray(body.message) ? body.message : [body.message], body.code),
        body.code ?? null,
      );
    }
    if (status === null) return new ApiError(null, ['No se pudo conectar con el servidor']);
    return new ApiError(status, friendly(status, [`Error ${status}`]));
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
        return new ApiError(
          status,
          friendly(status, Array.isArray(body.message) ? body.message : [body.message], body.code),
          body.code ?? null,
        );
      }
    } catch {
      // El cuerpo no era JSON legible: sigue con el mensaje genérico de toApiError.
    }
  }
  return toApiError(error);
}
