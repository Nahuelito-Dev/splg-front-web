import { AxiosError, AxiosHeaders, CanceledError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

const captureException = vi.hoisted(() => vi.fn<[unknown, unknown?], void>());
vi.mock('@sentry/react', () => ({ captureException }));

const { API_ERROR_THROTTLE_MS, createApiErrorReporter, shouldReportApiError } = await import('./apiErrors');

const config = (url: string, method = 'get', timeout = 0) =>
  ({ url, method, timeout, headers: new AxiosHeaders() }) as InternalAxiosRequestConfig;

const withStatus = (status: number, headers: Record<string, string> = {}, url = '/orders') =>
  new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    config(url),
    {},
    {
      status,
      statusText: '',
      data: {},
      headers,
      config: config(url),
    },
  );

const networkError = (url = '/orders', method = 'get') =>
  new AxiosError('Network Error', 'ERR_NETWORK', config(url, method));

afterEach(() => {
  captureException.mockReset();
});

describe('qué falla de la API va a Sentry', () => {
  it.each([400, 401, 403, 404, 409, 422, 429])('un %i no se manda', (status) => {
    createApiErrorReporter()(withStatus(status));
    expect(shouldReportApiError(withStatus(status))).toBe(false);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('un 5xx se manda con el X-Request-Id como request_id', () => {
    const error = withStatus(503, { 'x-request-id': 'req-123' }, '/customers/3f2a9c1e-1234-4abc-9def-0123456789ab');
    createApiErrorReporter()(error);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { 'api.status': '503', 'api.method': 'GET', 'api.path': '/customers/:id', request_id: 'req-123' },
      fingerprint: ['api-error', 'GET', '/customers/:id', '503'],
    });
  });

  it('una falla de red (sin respuesta) se manda', () => {
    createApiErrorReporter()(networkError('/orders', 'post'));
    expect(captureException).toHaveBeenCalledWith(expect.any(AxiosError), {
      tags: { 'api.status': 'network', 'api.method': 'POST', 'api.path': '/orders' },
      fingerprint: ['api-error', 'POST', '/orders', 'network'],
    });
  });

  it('un pedido abortado (ECONNABORTED sin timeout configurado) no se manda ni se llama timeout', () => {
    createApiErrorReporter()(new AxiosError('Request aborted', 'ECONNABORTED', config('/orders')));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('un timeout de verdad (el pedido tenía timeout) se manda como timeout', () => {
    const report = createApiErrorReporter();
    report(new AxiosError('timeout of 5000ms exceeded', 'ECONNABORTED', config('/orders', 'get', 5000)));
    report(new AxiosError('timeout of 5000ms exceeded', 'ETIMEDOUT', config('/stock', 'get', 5000)));
    expect(captureException).toHaveBeenCalledTimes(2);
    expect(captureException.mock.calls[0]?.[1]).toMatchObject({ tags: { 'api.status': 'timeout' } });
  });

  it('una cancelación (cambio de página) no es un error', () => {
    const report = createApiErrorReporter();
    report(new CanceledError(undefined, undefined, config('/orders')));
    report(new AxiosError('canceled', 'ERR_CANCELED', config('/orders')));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('lo que no es de axios no se manda acá (lo toma el handler global si nadie lo atrapa)', () => {
    createApiErrorReporter()(new Error('No hay sesión iniciada'));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('la query no viaja en el tag del path', () => {
    createApiErrorReporter()(withStatus(500, {}, '/users/email/a@b.com?x=1'));
    expect(captureException.mock.calls[0]?.[1]).toMatchObject({ tags: { 'api.path': '/users/email/[email]' } });
  });
});

describe('freno de volumen: mismo endpoint y estado, una vez cada 5 minutos', () => {
  it('la red caída en el mismo endpoint se manda una vez hasta que pasan 5 minutos', () => {
    let clock = 1_000_000;
    const report = createApiErrorReporter(() => clock);
    report(networkError());
    report(networkError());
    clock += API_ERROR_THROTTLE_MS - 1;
    report(networkError());
    expect(captureException).toHaveBeenCalledTimes(1);
    clock += 1;
    report(networkError());
    expect(captureException).toHaveBeenCalledTimes(2);
  });

  it('otro endpoint u otro estado sí se manda', () => {
    const report = createApiErrorReporter(() => 0);
    report(networkError('/orders'));
    report(networkError('/stock'));
    report(withStatus(500, {}, '/orders'));
    report(withStatus(503, {}, '/orders'));
    report(withStatus(503, {}, '/orders'));
    expect(captureException).toHaveBeenCalledTimes(4);
  });

  it('el mismo endpoint con otro id cuenta como el mismo', () => {
    const report = createApiErrorReporter(() => 0);
    report(withStatus(500, {}, '/orders/1'));
    report(withStatus(500, {}, '/orders/2'));
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
