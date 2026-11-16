import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ perms: { isSuperAdminRole: true } }));
vi.mock('./usePermissions', () => ({ usePermissions: () => state.perms }));

import { useDistributorEventFilter } from './useDistributorEventFilter';

beforeEach(() => {
  state.perms = { isSuperAdminRole: true };
});

describe('useDistributorEventFilter', () => {
  it('el administrador general descarta los eventos de cualquier empresa (en la plataforma y en modo soporte)', () => {
    const { result } = renderHook(() => useDistributorEventFilter());
    expect(result.current({ distributorId: 'dist-A' })).toBe(false);
    expect(result.current({ distributorId: 'dist-B' })).toBe(false);
  });

  it('un evento de plataforma (sin distributorId) se acepta', () => {
    const { result } = renderHook(() => useDistributorEventFilter());
    expect(result.current({})).toBe(true);
    expect(result.current({ distributorId: null })).toBe(true);
  });

  it('un admin de empresa no filtra: el back ya lo acota por sala', () => {
    state.perms = { isSuperAdminRole: false };
    const { result } = renderHook(() => useDistributorEventFilter());
    expect(result.current({ distributorId: 'dist-B' })).toBe(true);
  });
});
