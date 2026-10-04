import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const listUsers = vi.fn((_page: unknown, _search?: string, _role?: string) =>
  Promise.resolve({ rows: [{ user_id: 'u-1' }], total: 7 }),
);
vi.mock('../api/users', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listUsers: (page: unknown, search?: string, role?: string) => listUsers(page, search, role),
}));

import { useUsersByRole } from './users';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useUsersByRole', () => {
  it('pide la página y el rol a GET /users y devuelve el total de la API', async () => {
    const { result } = renderHook(() => useUsersByRole('super_admin', { page: 1, pageSize: 10 }, 'ana'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(listUsers).toHaveBeenCalledWith({ page: 1, pageSize: 10 }, 'ana', 'super_admin');
    expect(result.current.data?.total).toBe(7);
  });

  it('en "todos" no manda filtro de rol', async () => {
    const { result } = renderHook(() => useUsersByRole('all', { page: 0, pageSize: 10 }, ''), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(listUsers).toHaveBeenCalledWith({ page: 0, pageSize: 10 }, '', undefined);
  });
});
