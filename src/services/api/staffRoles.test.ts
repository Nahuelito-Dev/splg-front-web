import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignStaffRole, createStaffRole, deleteStaffRole, listStaffRoles, updateStaffRole } from './staffRoles';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('./httpClient', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), http }));

const V2 = expect.objectContaining({ baseURL: expect.stringContaining('/v2') as string }) as unknown;
const ROLE_ID = 'b1b1b1b1-0000-4000-8000-000000000001';
const ADMIN_ID = 'a1a1a1a1-0000-4000-8000-000000000002';

describe('API de roles del personal', () => {
  beforeEach(() => Object.values(http).forEach((fn) => fn.mockReset().mockResolvedValue({ data: {} })));

  it('usa los endpoints v2 para listar y administrar roles', async () => {
    await listStaffRoles();
    await createStaffRole({ name: 'Depósito', description: null, permissions: ['stock.gestionar'] });
    await updateStaffRole(ROLE_ID, { name: 'Depósito', permissions: [] });
    await deleteStaffRole(ROLE_ID);
    expect(http.get).toHaveBeenCalledWith('/staff-roles', V2);
    expect(http.post).toHaveBeenCalledWith(
      '/staff-roles',
      { name: 'Depósito', description: null, permissions: ['stock.gestionar'] },
      V2,
    );
    expect(http.patch).toHaveBeenCalledWith(`/staff-roles/${ROLE_ID}`, { name: 'Depósito', permissions: [] }, V2);
    expect(http.delete).toHaveBeenCalledWith(`/staff-roles/${ROLE_ID}`, V2);
  });

  it('asigna el rol mediante el endpoint del administrador', async () => {
    await assignStaffRole(ADMIN_ID, { staffRoleId: ROLE_ID });
    expect(http.put).toHaveBeenCalledWith(`/admins/${ADMIN_ID}/staff-role`, { staffRoleId: ROLE_ID }, V2);
  });
});
