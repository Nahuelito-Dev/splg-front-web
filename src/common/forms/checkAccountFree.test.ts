import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkUserExists = vi.fn();
const notifyError = vi.hoisted(() => vi.fn<[unknown], void>());
vi.mock('../../utils/notifications', () => ({ notify: { error: notifyError, success: vi.fn(), info: vi.fn() } }));

const httpError = (status: number, message: string) => {
  const error = new AxiosError('fallo');
  error.response = {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
};
vi.mock('../../services/api/users', () => ({
  checkUserExists: (...args: unknown[]): unknown => checkUserExists(...args),
}));

import { errorMessage } from '../../services/api/errors';
import { checkAccountFree } from './checkAccountFree';

describe('checkAccountFree', () => {
  beforeEach(() => {
    checkUserExists.mockReset();
    notifyError.mockReset();
  });

  it('consulta con el correo en minúsculas y sin espacios', async () => {
    checkUserExists.mockResolvedValue({ exists: false, email: false, phoneNumber: false });
    const ok = await checkAccountFree({ email: '  Ana@SPLG.com ', phone_number: '+5493764000000' }, vi.fn());
    expect(ok).toBe(true);
    expect(checkUserExists).toHaveBeenCalledWith({ email: 'ana@splg.com', phoneNumber: '+5493764000000' });
  });

  it('marca el correo y el teléfono que ya existen y frena', async () => {
    checkUserExists.mockResolvedValue({ exists: true, email: true, phoneNumber: true });
    const setError = vi.fn();
    const ok = await checkAccountFree({ email: 'ana@splg.com', phone_number: '+5493764000000' }, setError);
    expect(ok).toBe(false);
    expect(setError).toHaveBeenCalledWith('email', { message: 'Ya existe una cuenta con ese email' });
    expect(setError).toHaveBeenCalledWith('phone_number', { message: 'Ya existe una cuenta con ese teléfono' });
  });

  it('si la consulta falla no bloquea el alta', async () => {
    checkUserExists.mockImplementation(() => Promise.reject(new Error('caído')));
    expect(await checkAccountFree({ email: 'a@b.co', phone_number: '+5493764000000' }, vi.fn())).toBe(true);
  });

  it('si el servidor falla (5xx) tampoco bloquea ni avisa: el alta real valida igual', async () => {
    checkUserExists.mockRejectedValue(httpError(503, 'caído'));
    expect(await checkAccountFree({ email: 'a@b.co', phone_number: '+5493764000000' }, vi.fn())).toBe(true);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('el límite de consultas (429) frena el alta y lo explica, en vez de seguir como si estuviera libre', async () => {
    checkUserExists.mockRejectedValue(httpError(429, 'ThrottlerException: Too Many Requests'));
    const setError = vi.fn();
    expect(await checkAccountFree({ email: 'a@b.co', phone_number: '+5493764000000' }, setError)).toBe(false);
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(errorMessage(notifyError.mock.calls[0][0])).toContain('demasiados intentos');
    expect(setError).not.toHaveBeenCalled();
  });
});
