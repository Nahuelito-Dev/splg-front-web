import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, errorMessage, toApiError } from './errors';

const axiosError = (status: number | null, data?: unknown) => {
  const error = new AxiosError('fallo');
  if (status !== null) {
    error.response = { status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
  }
  return error;
};

describe('toApiError', () => {
  it('toma los mensajes de validación de la API', () => {
    const error = toApiError(axiosError(400, { message: ['email inválido', 'password corto'], statusCode: 400 }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.messages).toEqual(['email inválido', 'password corto']);
  });

  it('distingue 404 y 403', () => {
    expect(toApiError(axiosError(404, { message: 'no' })).notFound).toBe(true);
    expect(toApiError(axiosError(403, { message: 'no' })).forbidden).toBe(true);
  });

  it('sin respuesta es un problema de conexión', () => {
    expect(errorMessage(axiosError(null))).toBe('No se pudo conectar con el servidor');
  });

  it('cualquier otra cosa no rompe', () => {
    expect(errorMessage('texto')).toBe('Error inesperado');
    expect(errorMessage(new Error('x'))).toBe('x');
  });
});
