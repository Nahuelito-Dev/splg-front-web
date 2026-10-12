import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  perms: { isSuperAdmin: true, needsDistributor: false },
  current: { distributor_id: 'dist-A' } as { distributor_id: string } | undefined,
}));
vi.mock('./usePermissions', () => ({ usePermissions: () => state.perms }));
vi.mock('../services/queries/distributors', () => ({ useCurrentDistributor: () => ({ data: state.current }) }));

import { useDistributorEventFilter } from './useDistributorEventFilter';

beforeEach(() => {
  state.perms = { isSuperAdmin: true, needsDistributor: false };
  state.current = { distributor_id: 'dist-A' };
});

describe('useDistributorEventFilter', () => {
  it('el administrador general en «Ver como A» descarta los eventos de B', () => {
    const { result } = renderHook(() => useDistributorEventFilter());
    expect(result.current({ distributorId: 'dist-A' })).toBe(true);
    expect(result.current({ distributorId: 'dist-B' })).toBe(false);
  });

  it('un evento sin distributorId se acepta', () => {
    const { result } = renderHook(() => useDistributorEventFilter());
    expect(result.current({})).toBe(true);
  });

  it('sin empresa elegida ve todos', () => {
    state.perms = { isSuperAdmin: true, needsDistributor: true };
    const { result } = renderHook(() => useDistributorEventFilter());
    expect(result.current({ distributorId: 'dist-B' })).toBe(true);
  });

  it('un admin de empresa no filtra: el back ya lo acota por sala', () => {
    state.perms = { isSuperAdmin: false, needsDistributor: false };
    const { result } = renderHook(() => useDistributorEventFilter());
    expect(result.current({ distributorId: 'dist-B' })).toBe(true);
  });
});
