import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { onAuthStateChanged, clear } = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn<[unknown, (user: unknown) => void], void>(),
  clear: vi.fn(),
}));
vi.mock('firebase/auth', () => ({ onAuthStateChanged }));
vi.mock('../firebase/config', () => ({ FirebaseAuth: {} }));
vi.mock('../services/queries/queryClient', () => ({ queryClient: { clear } }));
const getAdmin = vi.hoisted(() => vi.fn());
vi.mock('../services/api/auth', () => ({ getAdmin }));

import { store } from '../store/store';
import { NO_CONNECTION_MESSAGE, SESSION_EXPIRED_MESSAGE } from '../firebase/sessionErrors';
import { checkingCredentials, logOut } from '../store/auth';
import { ownedCompany } from '../services/api/ownedCompany';
import { useCheckAuth } from './useCheckAuth';

const OWN = { id: 'c-own', slug: 'prueba-orixtech', name: 'Prueba' };
const firebaseUser = (uid: string) => ({
  uid,
  email: `${uid}@splg.com`,
  displayName: uid,
  getIdToken: vi.fn().mockResolvedValue('tok'),
});

const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;

beforeEach(() => {
  onAuthStateChanged.mockReset();
  clear.mockReset();
  getAdmin.mockReset();
  localStorage.clear();
  store.dispatch(checkingCredentials());
});

describe('useCheckAuth', () => {
  it('cuando Firebase dice que no hay sesión, limpia la caché de React Query', () => {
    renderHook(() => useCheckAuth(), { wrapper });
    onAuthStateChanged.mock.calls[0][1](null);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('sin usuario pero con sesión guardada, vuelve al login avisando que venció', () => {
    localStorage.setItem('token', 'viejo');
    renderHook(() => useCheckAuth(), { wrapper });
    onAuthStateChanged.mock.calls[0][1](null);
    expect(store.getState().auth.status).toBe('not-authenticated');
    expect(store.getState().auth.errorMessage).toBe(SESSION_EXPIRED_MESSAGE);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('sin usuario ni sesión guardada (primer ingreso), el login va sin aviso', () => {
    renderHook(() => useCheckAuth(), { wrapper });
    onAuthStateChanged.mock.calls[0][1](null);
    expect(store.getState().auth.errorMessage).toBeNull();
  });

  it('con usuario de Firebase y el token viejo, renueva y sigue sin ir al login', async () => {
    localStorage.setItem('token', 'viejo');
    getAdmin.mockResolvedValue({ fullName: 'Ana', role: 'admin', blocked: false });
    renderHook(() => useCheckAuth(), { wrapper });
    const user = { uid: 'u', email: 'a@b.c', displayName: 'Ana', getIdToken: vi.fn().mockResolvedValue('nuevo') };
    onAuthStateChanged.mock.calls[0][1](user);
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'));
    expect(localStorage.getItem('token')).toBe('nuevo');
  });

  it('con usuario pero sin poder renovar, vuelve al login con el aviso', async () => {
    renderHook(() => useCheckAuth(), { wrapper });
    const user = {
      uid: 'u',
      email: 'a@b.c',
      displayName: 'Ana',
      getIdToken: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/user-token-expired' })),
    };
    onAuthStateChanged.mock.calls[0][1](user);
    await waitFor(() => expect(store.getState().auth.errorMessage).toBe(SESSION_EXPIRED_MESSAGE));
    expect(store.getState().auth.status).toBe('not-authenticated');
  });

  it('una falla de red al pedir el token no borra el token ni da la sesión por vencida', async () => {
    localStorage.setItem('token', 'viejo');
    renderHook(() => useCheckAuth(), { wrapper });
    const error = Object.assign(new Error('net'), { code: 'auth/network-request-failed' });
    const user = { uid: 'u', email: 'a@b.c', displayName: 'Ana', getIdToken: vi.fn().mockRejectedValue(error) };
    onAuthStateChanged.mock.calls[0][1](user);
    await waitFor(() => expect(store.getState().auth.status).toBe('not-authenticated'));
    expect(localStorage.getItem('token')).toBe('viejo');
    expect(store.getState().auth.errorMessage).toBe(NO_CONNECTION_MESSAGE);
  });

  it('un cierre ya despachado con su aviso no lo pisa el cambio de estado de Firebase', () => {
    store.dispatch(logOut({ errorMessage: 'La cuenta está bloqueada.' }));
    renderHook(() => useCheckAuth(), { wrapper });
    onAuthStateChanged.mock.calls[0][1](null);
    expect(store.getState().auth.errorMessage).toBe('La cuenta está bloqueada.');
  });

  it('con expireTimestamp vencido y usuario de Firebase, no hay logout: manda Firebase', async () => {
    localStorage.setItem('expireTimestamp', String(Date.now() - 3600_000));
    getAdmin.mockResolvedValue({ fullName: 'Ana', role: 'admin', blocked: false });
    renderHook(() => useCheckAuth(), { wrapper });
    const user = { uid: 'u', email: 'a@b.c', displayName: 'Ana', getIdToken: vi.fn().mockResolvedValue('nuevo') };
    onAuthStateChanged.mock.calls[0][1](user);
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'));
  });

  describe('empresa propia atada a la identidad', () => {
    it('si entra otra cuenta, se borra lo elegido por la anterior antes de la primera request', async () => {
      ownedCompany.enter(OWN, 'uid-a');
      getAdmin.mockImplementation(() => {
        // Ya en la primera request (getAdmin) no queda nada de la otra cuenta.
        expect(ownedCompany.getStored()).toBeNull();
        return Promise.resolve({ fullName: 'B', role: 'super_admin', blocked: false });
      });
      renderHook(() => useCheckAuth(), { wrapper });
      onAuthStateChanged.mock.calls[0][1](firebaseUser('uid-b'));
      await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'));
      expect(localStorage.getItem('ownedCompany')).toBeNull();
    });

    it('la misma cuenta la conserva al recargar', async () => {
      ownedCompany.enter(OWN, 'uid-a');
      getAdmin.mockResolvedValue({ fullName: 'A', role: 'super_admin', blocked: false });
      renderHook(() => useCheckAuth(), { wrapper });
      onAuthStateChanged.mock.calls[0][1](firebaseUser('uid-a'));
      await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'));
      expect(ownedCompany.getFor('uid-a')).toEqual(OWN);
    });

    it('sin usuario (deslogueo) se borra', () => {
      ownedCompany.enter(OWN, 'uid-a');
      renderHook(() => useCheckAuth(), { wrapper });
      onAuthStateChanged.mock.calls[0][1](null);
      expect(ownedCompany.getStored()).toBeNull();
    });

    it('si falla la validación del login, se borra', async () => {
      ownedCompany.enter(OWN, 'uid-a');
      getAdmin.mockRejectedValue(new Error('rol inválido'));
      renderHook(() => useCheckAuth(), { wrapper });
      onAuthStateChanged.mock.calls[0][1](firebaseUser('uid-a'));
      await waitFor(() => expect(store.getState().auth.status).toBe('not-authenticated'));
      expect(ownedCompany.getStored()).toBeNull();
    });
  });
});
