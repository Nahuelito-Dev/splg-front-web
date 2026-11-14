import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ uid: 'uid-a' as string | null }));
vi.mock('./reduxHooks', () => ({
  useAppSelector: (pick: (s: { auth: { uid: string | null } }) => unknown) => pick({ auth: { uid: auth.uid } }),
}));
const clear = vi.hoisted(() => vi.fn());
vi.mock('../services/queries/queryClient', () => ({ queryClient: { clear } }));
vi.mock('../utils/notifications', () => ({ notify: { info: vi.fn(), warn: vi.fn() } }));

import { ownedCompany } from '../services/api/ownedCompany';
import { useOwnedCompany } from './useOwnedCompany';

const OWN = { id: 'c-own', slug: 'prueba-orixtech', name: 'Prueba' };

const otherTab = (value: string | null) =>
  act(() => {
    if (value === null) localStorage.removeItem('ownedCompany');
    else localStorage.setItem('ownedCompany', value);
    window.dispatchEvent(new StorageEvent('storage', { key: 'ownedCompany', newValue: value }));
  });

beforeEach(() => {
  localStorage.clear();
  ownedCompany.reset();
  auth.uid = 'uid-a';
  clear.mockReset();
});

describe('useOwnedCompany', () => {
  it('devuelve la elegida por la cuenta logueada; la de otra cuenta, no', () => {
    ownedCompany.enter(OWN, 'uid-a');
    expect(renderHook(() => useOwnedCompany()).result.current).toEqual(OWN);
    auth.uid = 'uid-b';
    expect(renderHook(() => useOwnedCompany()).result.current).toBeNull();
  });

  it('se entera sola cuando otra pestaña sale o entra (la key del layout cambia con esto)', () => {
    ownedCompany.enter(OWN, 'uid-a');
    const { result } = renderHook(() => useOwnedCompany());
    expect(result.current?.slug).toBe('prueba-orixtech');
    clear.mockReset();
    otherTab(null);
    expect(result.current).toBeNull();
    expect(clear).toHaveBeenCalledTimes(1);
    otherTab(JSON.stringify({ ...OWN, ownerUid: 'uid-a' }));
    expect(result.current?.slug).toBe('prueba-orixtech');
    expect(clear).toHaveBeenCalledTimes(2);
  });

  it('si otra pestaña cierra sesión (localStorage.clear), esta también deja la empresa propia', () => {
    ownedCompany.enter(OWN, 'uid-a');
    const { result } = renderHook(() => useOwnedCompany());
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(result.current).toBeNull();
  });
});
