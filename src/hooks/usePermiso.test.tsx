import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api/errors';

const query = vi.hoisted(() => ({ result: {} as { data?: unknown; error?: unknown } }));
vi.mock('../services/queries/permissions', () => ({ useMyPermissions: () => query.result }));
vi.mock('./reduxHooks', () => ({ useAppSelector: () => 'admin@splg.com' }));

import { usePermiso } from './usePermiso';

const mine = (permissions: string[], allPermissions = false) => ({
  role: 'admin',
  allPermissions,
  staffRole: null,
  permissions,
});

beforeEach(() => {
  query.result = {};
});

describe('usePermiso', () => {
  it('lo tiene si está en sus permisos', () => {
    query.result = { data: mine(['pedidos.ver', 'despacho.gestionar']) };
    expect(renderHook(() => usePermiso('despacho.gestionar')).result.current).toEqual({ allowed: true, known: true });
  });

  it('no lo tiene si su rol no lo incluye', () => {
    query.result = { data: mine(['pedidos.ver']) };
    expect(renderHook(() => usePermiso('despacho.gestionar')).result.current).toEqual({ allowed: false, known: true });
  });

  it('el super admin y el rol de sistema tienen todos', () => {
    query.result = { data: mine([], true) };
    expect(renderHook(() => usePermiso('despacho.gestionar')).result.current.allowed).toBe(true);
  });

  it('mientras carga no se sabe; si falla la lectura no esconde nada (decide la API)', () => {
    expect(renderHook(() => usePermiso('despacho.gestionar')).result.current).toEqual({ allowed: false, known: false });
    query.result = { error: new ApiError(500, ['boom']) };
    expect(renderHook(() => usePermiso('despacho.gestionar')).result.current).toEqual({ allowed: true, known: true });
  });
});
