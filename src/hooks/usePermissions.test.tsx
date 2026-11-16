import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  role: 'super_admin' as string | null,
  active: null as { id: string; scope: string[] } | null,
  owned: null as { id: string; slug: string; name: string } | null,
}));
vi.mock('./useOwnedCompany', () => ({ useOwnedCompany: () => state.owned }));
vi.mock('./reduxHooks', () => ({
  useAppSelector: (pick: (s: { auth: { role: string | null } }) => unknown) => pick({ auth: { role: state.role } }),
}));
vi.mock('./useSupportSession', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useSupportSession: () => ({ active: state.active }),
}));

import {
  OPERATE_HINT,
  SUPPORT_EXPORTS_HINT,
  SUPPORT_FILES_HINT,
  SUPPORT_READ_ONLY_HINT,
  usePermissions,
} from './usePermissions';

beforeEach(() => {
  state.role = 'super_admin';
  state.active = null;
  state.owned = null;
});

describe('usePermissions', () => {
  it('administrador general sin sesión: plataforma, sin empresa y sin escritura de empresa', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toMatchObject({
      mode: 'platform',
      isSuperAdmin: true,
      needsDistributor: true,
      canWrite: false,
      writeHint: OPERATE_HINT,
      readOnly: false,
      // La plataforma fuera de una empresa ya no administra cuentas de clientes.
      canManageCustomerAccounts: false,
    });
  });

  it('administrador general en la empresa propia: como su admin, escribe y sin atajos de plataforma', () => {
    state.owned = { id: 'c-own', slug: 'prueba-orixtech', name: 'Prueba' };
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toMatchObject({
      mode: 'owned',
      isSuperAdmin: false,
      isSuperAdminRole: true,
      needsDistributor: false,
      readOnly: false,
      canWrite: true,
      writeHint: undefined,
      canOperate: true,
      canSeeFiles: true,
      canExport: true,
      canManageCustomerAccounts: false,
    });
  });

  it('con una sesión de soporte activa manda el soporte aunque haya empresa propia elegida', () => {
    state.owned = { id: 'c-own', slug: 'prueba-orixtech', name: 'Prueba' };
    state.active = { id: 's-1', scope: [] };
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toMatchObject({ mode: 'support', readOnly: true });
  });

  it('un admin de empresa nunca está en modo empresa propia', () => {
    state.role = 'admin';
    state.owned = { id: 'c-own', slug: 'prueba-orixtech', name: 'Prueba' };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.mode).toBe('company');
  });

  it('administrador general en modo soporte: como el admin de la empresa, en sólo lectura con aviso', () => {
    state.active = { id: 's-1', scope: [] };
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toMatchObject({
      mode: 'support',
      isSuperAdmin: false,
      isSuperAdminRole: true,
      needsDistributor: false,
      readOnly: true,
      canWrite: false,
      canOperate: false,
      writeHint: SUPPORT_READ_ONLY_HINT,
      operateHint: SUPPORT_READ_ONLY_HINT,
      canManageCustomerAccounts: false,
    });
  });

  it('en modo soporte, archivos y exportes sólo con el alcance aprobado (si no, la API da 403)', () => {
    state.active = { id: 's-1', scope: [] };
    const { result, rerender } = renderHook(() => usePermissions());
    expect(result.current).toMatchObject({
      canSeeFiles: false,
      fileHint: SUPPORT_FILES_HINT,
      canExport: false,
      exportHint: SUPPORT_EXPORTS_HINT,
    });
    state.active = { id: 's-1', scope: ['files'] };
    rerender();
    expect(result.current).toMatchObject({ canSeeFiles: true, fileHint: undefined, canExport: false });
    state.active = { id: 's-1', scope: ['exports'] };
    rerender();
    expect(result.current).toMatchObject({ canSeeFiles: false, canExport: true, exportHint: undefined });
  });

  it('el admin de empresa ve archivos y exporta sin restricción de alcance', () => {
    state.role = 'admin';
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toMatchObject({ canSeeFiles: true, canExport: true });
  });

  it('admin de empresa: escribe en la suya', () => {
    state.role = 'admin';
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toMatchObject({ mode: 'company', canWrite: true, writeHint: undefined, readOnly: false });
  });
});
