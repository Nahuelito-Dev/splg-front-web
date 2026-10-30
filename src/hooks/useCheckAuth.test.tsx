import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { onAuthStateChanged, clear } = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn<[unknown, (user: null) => void], void>(),
  clear: vi.fn(),
}));
vi.mock('firebase/auth', () => ({ onAuthStateChanged }));
vi.mock('../firebase/config', () => ({ FirebaseAuth: {} }));
vi.mock('../services/queries/queryClient', () => ({ queryClient: { clear } }));
vi.mock('../services/api/auth', () => ({ getAdmin: vi.fn() }));

import { store } from '../store/store';
import { useCheckAuth } from './useCheckAuth';

const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;

beforeEach(() => {
  onAuthStateChanged.mockReset();
  clear.mockReset();
});

describe('useCheckAuth', () => {
  it('cuando Firebase dice que no hay sesión, limpia la caché de React Query', () => {
    renderHook(() => useCheckAuth(), { wrapper });
    onAuthStateChanged.mock.calls[0][1](null);
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
