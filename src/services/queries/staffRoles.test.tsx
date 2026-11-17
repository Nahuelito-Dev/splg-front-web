import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { assignStaffRole, createStaffRole, deleteStaffRole, updateStaffRole } from '../api/staffRoles';
import { queryKeys } from './queryKeys';
import { useAssignStaffRole, useCreateStaffRole, useDeleteStaffRole, useUpdateStaffRole } from './staffRoles';

vi.mock('../api/staffRoles', () => ({
  assignStaffRole: vi.fn(),
  createStaffRole: vi.fn(),
  deleteStaffRole: vi.fn(),
  listStaffRoles: vi.fn(),
  updateStaffRole: vi.fn(),
}));

const setup = <T,>(hook: () => T) => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { invalidate, ...renderHook(hook, { wrapper }) };
};

describe('mutaciones de roles del personal', () => {
  it('crea un rol e invalida su lista', async () => {
    vi.mocked(createStaffRole).mockResolvedValue({} as never);
    const { result, invalidate } = setup(useCreateStaffRole);
    await act(() => result.current.mutateAsync({ name: 'Depósito', permissions: [] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.staffRoles.all });
  });

  it('edita un rol e invalida su lista y la de administradores (muestran el nombre del rol)', async () => {
    vi.mocked(updateStaffRole).mockResolvedValue({} as never);
    const { result, invalidate } = setup(useUpdateStaffRole);
    await act(() => result.current.mutateAsync({ id: 'r1', body: { permissions: ['stock.ver'] } }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.staffRoles.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.admins.all });
  });

  it('da de baja un rol e invalida su lista', async () => {
    vi.mocked(deleteStaffRole).mockResolvedValue({} as never);
    const { result, invalidate } = setup(useDeleteStaffRole);
    await act(() => result.current.mutateAsync('r1'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.staffRoles.all });
  });

  it('al asignar un rol refresca administradores, roles y los permisos de la sesión', async () => {
    vi.mocked(assignStaffRole).mockResolvedValue({} as never);
    const { result, invalidate } = setup(useAssignStaffRole);
    await act(() => result.current.mutateAsync({ adminId: 'a1', body: { staffRoleId: 'r1' } }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.admins.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.staffRoles.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.myPermissions.all });
  });
});
