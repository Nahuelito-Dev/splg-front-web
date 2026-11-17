import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdmin } from './admins';

const http = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('./httpClient', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), http }));

const ACCOUNT = { email: 'ana@splg.com', password: 'secreta1', full_name: 'Ana Pérez', phone_number: '+5493764000000' };
const ROLE_ID = 'b1b1b1b1-0000-4000-8000-000000000001';

describe('alta de administrador (POST /users)', () => {
  beforeEach(() => http.post.mockReset().mockResolvedValue({ data: {} }));

  it('manda el rol del personal elegido', async () => {
    await createAdmin('admin', { ...ACCOUNT, staffRoleId: ROLE_ID });
    expect(http.post).toHaveBeenCalledWith('/users', { rol: 'admin', ...ACCOUNT, staffRoleId: ROLE_ID });
  });

  it('sin rol del personal no manda el campo', async () => {
    await createAdmin('super_admin', ACCOUNT);
    expect(http.post).toHaveBeenCalledWith('/users', { rol: 'super_admin', ...ACCOUNT });
  });
});
