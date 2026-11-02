import { beforeEach, describe, expect, it, vi } from 'vitest';

const logOutFirebase = vi.hoisted(() => vi.fn());
vi.mock('../../firebase/providers', () => ({ logOutFirebase, loginWithEmailAndPassword: vi.fn() }));

import { startLogOut } from './thunks';

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
