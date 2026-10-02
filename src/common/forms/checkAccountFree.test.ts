import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkUserExists = vi.fn();
vi.mock('../../services/api/users', () => ({
  checkUserExists: (...args: unknown[]): unknown => checkUserExists(...args),
}));

import { checkAccountFree } from './checkAccountFree';

describe('checkAccountFree', () => {
  beforeEach(() => {
    checkUserExists.mockReset();
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
});
