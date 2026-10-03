import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const listAdmins = vi.fn();
vi.mock('../api/admins', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listAdmins: () => listAdmins() as unknown,
}));
vi.mock('../api/customers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listCustomers: () =>
    Promise.resolve({
      total: 40,
      rows: [
        { customer_id: 'c-1', user: { user_id: 'u-1', full_name: 'Ana', role: { type: 'customer' } } },
        { customer_id: 'c-2', user: null },
      ],
    }),
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
  it('en "clientes" devuelve la cuenta de cada cliente con su perfil adjunto y el total de la API', async () => {
    const { result } = renderHook(() => useUsersByRole('customer', { page: 0, pageSize: 10 }, ''), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    // Un perfil sin cuenta no es un usuario: ni se muestra ni se cuenta (40 - 1).
    expect(result.current.data?.total).toBe(39);
    expect(result.current.data?.rows).toHaveLength(1);
    expect(result.current.data?.rows[0]).toMatchObject({ user_id: 'u-1', customer: { customer_id: 'c-1' } });
  });

  it('en "administradores" busca y pagina en el panel, porque GET /admin no lo hace', async () => {
    listAdmins.mockResolvedValue(
      ['Ana', 'Beto', 'Carla'].map((name, i) => ({ admin_id: `a-${i}`, user: { user_id: `u-${i}`, full_name: name } })),
    );
    const { result } = renderHook(() => useUsersByRole('admin', { page: 1, pageSize: 1 }, 'a'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    // "Ana", "Carla" contienen "a" (Beto no): 2 en total, la segunda página de a 1 es Carla.
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.rows.map((row) => row.full_name)).toEqual(['Carla']);
  });
});
