import { beforeEach, describe, expect, it, vi } from 'vitest';

const logOutFirebase = vi.hoisted(() => vi.fn());
const loginWithEmailAndPassword = vi.hoisted(() => vi.fn());
vi.mock('../../firebase/providers', () => ({ logOutFirebase, loginWithEmailAndPassword }));
const getAdmin = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/auth', () => ({ getAdmin }));
vi.mock('../../services/queries/queryClient', () => ({ queryClient: { clear: vi.fn() } }));
vi.mock('../../utils/notifications', () => ({ notify: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { ownedCompany } from '../../services/api/ownedCompany';
import { startLoginWithEmailAndPassword, startLogOut } from './thunks';

const OWN = { id: 'c-own', slug: 'prueba-orixtech', name: 'Prueba' };
const credentials = { email: 'b@splg.com', password: 'x' };

describe('startLogOut', () => {
  beforeEach(() => localStorage.clear());

  it('borra el token antes del signOut: un cierre voluntario no se confunde con una sesión vencida', async () => {
    localStorage.setItem('token', 'viejo');
    let tokenAlSalir: string | null = 'sin-medir';
    logOutFirebase.mockImplementation(() => {
      tokenAlSalir = localStorage.getItem('token');
      return Promise.resolve();
    });
    await startLogOut()(vi.fn());
    expect(tokenAlSalir).toBeNull();
  });
});

describe('empresa propia atada a la identidad (login y logout)', () => {
  beforeEach(() => {
    localStorage.clear();
    ownedCompany.reset();
    ownedCompany.enter(OWN, 'uid-a');
    getAdmin.mockReset();
  });

  it('el logout la borra', async () => {
    logOutFirebase.mockResolvedValue(undefined);
    await startLogOut()(vi.fn());
    expect(ownedCompany.getStored()).toBeNull();
  });

  it('el login de otra cuenta la borra antes de validar contra la API', async () => {
    loginWithEmailAndPassword.mockResolvedValue({ ok: true, uid: 'uid-b', token: 't', displayName: 'B' });
    let duringValidation: unknown = 'sin medir';
    getAdmin.mockImplementation(() => {
      duringValidation = ownedCompany.getStored();
      return Promise.resolve({ fullName: 'B', role: 'super_admin', blocked: false });
    });
    const dispatch = vi.fn();
    await startLoginWithEmailAndPassword(credentials)(dispatch);
    // Ya en la primera request de la cuenta nueva no queda nada de la anterior, y el login terminó bien.
    expect(duringValidation).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth/login' }));
    expect(localStorage.getItem('ownedCompany')).toBeNull();
  });

  it('un login fallido la borra', async () => {
    loginWithEmailAndPassword.mockResolvedValue({ ok: false, errorMessage: 'Clave incorrecta' });
    await startLoginWithEmailAndPassword(credentials)(vi.fn());
    expect(ownedCompany.getStored()).toBeNull();
  });

  it('el login de la misma cuenta la conserva', async () => {
    loginWithEmailAndPassword.mockResolvedValue({ ok: true, uid: 'uid-a', token: 't', displayName: 'A' });
    getAdmin.mockResolvedValue({ fullName: 'A', role: 'super_admin', blocked: false });
    await startLoginWithEmailAndPassword({ email: 'a@splg.com', password: 'x' })(vi.fn());
    expect(ownedCompany.getFor('uid-a')).toEqual(OWN);
  });
});
