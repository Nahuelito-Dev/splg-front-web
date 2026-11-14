import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  role: 'super_admin' as string | null,
  active: null as { id: string; scope: string[] } | null,
}));
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
    });
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
