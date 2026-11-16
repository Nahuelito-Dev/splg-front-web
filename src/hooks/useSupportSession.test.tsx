import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportSession } from '../services/api/types';

vi.mock('../services/queries/queryClient', () => ({ queryClient: { clear: vi.fn() } }));
vi.mock('../utils/notifications', () => ({ notify: { warn: vi.fn(), info: vi.fn() } }));

import { supportMode } from '../services/api/supportMode';
import { SUPPORT_EXPORTS_HINT, SUPPORT_FILES_HINT, useSupportScopeHint, useSupportSession } from './useSupportSession';

const session = (status: SupportSession['status'], scope: SupportSession['scope'] = []) =>
  ({ id: 's-1', status, scope, distributorName: 'Gas Norte' }) as SupportSession;

beforeEach(() => {
  act(() => supportMode.reset());
});

describe('useSupportSession', () => {
  it('distingue la sesión activa del pedido pendiente y se entera de los cambios', () => {
    const { result } = renderHook(() => useSupportSession());
    expect(result.current).toMatchObject({ loaded: false, active: null, pending: null });
    act(() => supportMode.update(session('pending')));
    expect(result.current.pending?.id).toBe('s-1');
    expect(result.current.active).toBeNull();
    act(() => supportMode.update(session('active')));
    expect(result.current.active?.id).toBe('s-1');
  });
});

describe('useSupportScopeHint (PDF, exportes y adjuntos)', () => {
  it('sin sesión de soporte no bloquea nada (admin de empresa)', () => {
    const { result } = renderHook(() => [useSupportScopeHint('files'), useSupportScopeHint('exports')]);
    expect(result.current).toEqual([undefined, undefined]);
  });

  it('en soporte sin el alcance, bloquea con el motivo; con el alcance, no', () => {
    act(() => supportMode.update(session('active', ['files'])));
    const { result } = renderHook(() => [useSupportScopeHint('files'), useSupportScopeHint('exports')]);
    expect(result.current).toEqual([undefined, SUPPORT_EXPORTS_HINT]);
    act(() => supportMode.update(session('active', ['exports'])));
    expect(result.current).toEqual([SUPPORT_FILES_HINT, undefined]);
  });

  it('un pedido pendiente no cuenta como sesión: no bloquea', () => {
    act(() => supportMode.update(session('pending')));
    const { result } = renderHook(() => useSupportScopeHint('files'));
    expect(result.current).toBeUndefined();
  });
});
