import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, errorMessage, toApiError, toApiErrorFromBlob } from './errors';

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

  it('la falta de distribuidora se muestra como pide el panel', () => {
    const message = 'Falta la distribuidora: enviá el header X-Distributor (slug o id)';
    expect(errorMessage(axiosError(400, { message }))).toBe('Elegí una distribuidora en «Ver como» para operar');
    expect(errorMessage(axiosError(403, { message }))).toBe(message);
  });

  it('el límite de consultas (429) se explica en castellano, venga o no con cuerpo', () => {
    const expected = 'Hiciste demasiados intentos seguidos: esperá un minuto y volvé a intentar';
    const withBody = axiosError(429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' });
    expect(errorMessage(withBody)).toBe(expected);
    expect(toApiError(withBody).rateLimited).toBe(true);
    expect(errorMessage(axiosError(429))).toBe(expected);
    expect(toApiError(axiosError(409, { message: 'x' })).rateLimited).toBe(false);
  });

  it('cerrar la incidencia de un impago (409) manda a «Resolver impago» en vez de mostrar el endpoint', () => {
    const message =
      'La incidencia de cobro impago se cierra resolviendo el cobro del pedido: PATCH /orders/:id/payment/resolve-unpaid';
    expect(errorMessage(axiosError(409, { message }))).toBe(
      'Una incidencia de cobro impago se cierra resolviendo el cobro del pedido: usá «Resolver impago» en el pedido',
    );
    expect(errorMessage(axiosError(409, { message: 'La transferencia ya se confirmó: no se cambia' }))).toBe(
      'La transferencia ya se confirmó: no se cambia',
    );
  });

  it('un id que no es UUID es un id inválido (por el código del back, no por el texto); otro 400 no', () => {
    expect(
      toApiError(axiosError(400, { message: 'El identificador no es válido', code: 'INVALID_ID' })).invalidId,
    ).toBe(true);
    expect(toApiError(axiosError(400, { message: 'El identificador no es válido' })).invalidId).toBe(false);
    expect(toApiError(axiosError(400, { message: 'otro', code: 'INVALID_ID' })).messages).toEqual(['otro']);
    expect(toApiError(axiosError(400, { message: 'Falta la distribuidora' })).invalidId).toBe(false);
    expect(toApiError(axiosError(404, { message: 'no' })).invalidId).toBe(false);
  });

  it('sin respuesta es un problema de conexión', () => {
    expect(errorMessage(axiosError(null))).toBe('No se pudo conectar con el servidor');
  });

  it('cualquier otra cosa no rompe', () => {
    expect(errorMessage('texto')).toBe('Error inesperado');
    expect(errorMessage(new Error('x'))).toBe('x');
  });
});

describe('toApiErrorFromBlob', () => {
  const blobError = (status: number, body: unknown) =>
    axiosError(status, new Blob([JSON.stringify(body)], { type: 'application/json' }));

  it('lee el blob del error y muestra el mensaje real del back', async () => {
    const error = await toApiErrorFromBlob(blobError(404, { message: 'Adjunto no encontrado', statusCode: 404 }));
    expect(error.status).toBe(404);
    expect(error.messages).toEqual(['Adjunto no encontrado']);
  });

  it('un blob que no es JSON no rompe: cae al mensaje genérico', async () => {
    const error = await toApiErrorFromBlob(axiosError(500, new Blob(['no es json'])));
    expect(error.status).toBe(500);
    expect(error.messages).toEqual(['Error 500']);
  });

  it('un error que no es de un pedido con blob se comporta como toApiError', async () => {
    const error = await toApiErrorFromBlob(axiosError(400, { message: 'email inválido' }));
    expect(error.messages).toEqual(['email inválido']);
  });
});
