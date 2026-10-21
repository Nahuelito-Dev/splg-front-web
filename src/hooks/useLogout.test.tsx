import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const confirmMock = vi.hoisted(() => vi.fn());
const dispatch = vi.hoisted(() => vi.fn());
vi.mock('../utils/notifications', () => ({ confirm: confirmMock }));
vi.mock('./reduxHooks', () => ({ useAppDispatch: () => dispatch }));
vi.mock('../store/auth/thunks', () => ({ startLogOut: () => ({ type: 'logout' }) }));

import { setFormDirty } from '../utils/unsavedChanges';
import { useLogout } from './useLogout';

const formId = Symbol('form');
afterEach(() => {
  setFormDirty(formId, false);
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useLogout', () => {
  it('sin cambios sin guardar cierra la sesión y limpia el almacenamiento', async () => {
    localStorage.setItem('token', 'x');
    await renderHook(() => useLogout()).result.current();
    expect(dispatch).toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('con cambios y sin confirmar no limpia la sesión ni cierra', async () => {
    setFormDirty(formId, true);
    confirmMock.mockResolvedValue(false);
    localStorage.setItem('token', 'x');
    await renderHook(() => useLogout()).result.current();
    expect(dispatch).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('x');
  });

  it('con cambios y confirmado cierra la sesión', async () => {
    setFormDirty(formId, true);
    confirmMock.mockResolvedValue(true);
    await renderHook(() => useLogout()).result.current();
    expect(dispatch).toHaveBeenCalled();
  });
});
