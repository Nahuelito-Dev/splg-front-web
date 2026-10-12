import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import type { ApiError } from '../api/errors';
import { intentKey } from '../api/idempotency';
import { runIntent, UNCERTAIN_MESSAGE } from './intent';

const http = (status: number, message: string) =>
  new AxiosError('x', 'ERR', undefined, undefined, { status, data: { message } } as never);
const noResponse = () => new AxiosError('Network Error', 'ERR_NETWORK');
const client = () => {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, 'invalidateQueries');
  return { qc, spy };
};

describe('runIntent', () => {
  it('sale bien: manda la clave y descarta la intención', async () => {
    const { qc } = client();
    const seen: string[] = [];
    await runIntent(qc, 'i:ok', { a: 1 }, (key) => Promise.resolve(void seen.push(key)));
    await runIntent(qc, 'i:ok', { a: 1 }, (key) => Promise.resolve(void seen.push(key)));
    expect(seen[0]).not.toBe(seen[1]);
  });

  it('error sin respuesta: refresca, avisa que no sabe y conserva la clave para el reintento', async () => {
    const { qc, spy } = client();
    const seen: string[] = [];
    const call = (key: string) => {
      seen.push(key);
      return Promise.reject(noResponse());
    };
    const error = (await runIntent(qc, 'i:red', { a: 1 }, call).catch((e: unknown) => e)) as ApiError;
    expect(error.messages).toEqual([UNCERTAIN_MESSAGE]);
    expect(spy).toHaveBeenCalled();
    await runIntent(qc, 'i:red', { a: 1 }, call).catch(() => undefined);
    expect(seen[0]).toBe(seen[1]);
  });

  it('422: refresca, muestra el mensaje del back y la intención se descarta (sin éxito falso)', async () => {
    const { qc, spy } = client();
    const first = intentKey('i:422', { a: 1 });
    const error = (await runIntent(qc, 'i:422', { a: 1 }, () =>
      Promise.reject(http(422, 'Esa clave de idempotencia ya se usó con otros datos')),
    ).catch((e: unknown) => e)) as AxiosError;
    expect(error).toBeInstanceOf(AxiosError);
    expect(spy).toHaveBeenCalled();
    expect(intentKey('i:422', { a: 1 })).not.toBe(first);
  });

  it('un 400 de validación conserva la clave (no se registró nada, el reintento es el mismo)', async () => {
    const { qc } = client();
    const first = intentKey('i:400', { a: 1 });
    await runIntent(qc, 'i:400', { a: 1 }, () => Promise.reject(http(400, 'mal'))).catch(() => undefined);
    expect(intentKey('i:400', { a: 1 })).toBe(first);
  });
});
