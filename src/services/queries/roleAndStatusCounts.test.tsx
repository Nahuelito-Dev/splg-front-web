import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const listDeliveries = vi.fn((_page: unknown, _search?: string, status?: string) =>
  Promise.resolve({ rows: [], total: status === 'unvalidated' ? 2 : status === 'enabled' ? 4 : 5 }),
);
const listActiveDeliveries = vi.fn(() => Promise.resolve({ rows: [], total: 1 }));
vi.mock('../api/deliveries', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listDeliveries: (page: unknown, search?: string, status?: string) => listDeliveries(page, search, status),
  listActiveDeliveries: () => listActiveDeliveries(),
}));
vi.mock('../api/customers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listCustomers: () => Promise.resolve({ rows: [], total: 25 }),
}));
vi.mock('../api/users', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listUsers: () => Promise.resolve({ rows: [], total: 31 }),
}));
const listAdmins = vi.fn();
vi.mock('../api/admins', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listAdmins: (distributorId?: string) => listAdmins(distributorId) as unknown,
}));

import { useDeliveryStatusCounts } from './deliveries';
import { useUserRoleCounts } from './users';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useDeliveryStatusCounts', () => {
  it('pide una página mínima por grupo y lee el total; "en línea" sale de su endpoint', async () => {
    const { result } = renderHook(() => useDeliveryStatusCounts(), { wrapper });
    await waitFor(() => expect(result.current.online).toBe(1));
    expect(result.current).toMatchObject({ all: 5, unvalidated: 2, enabled: 4, disabled: 5, online: 1 });
    for (const [page] of listDeliveries.mock.calls) expect(page).toEqual({ page: 0, pageSize: 1 });
    expect(listActiveDeliveries).toHaveBeenCalledOnce();
  });

  it('mientras no hay dato un grupo queda en null, nunca en 0', () => {
    const { result } = renderHook(() => useDeliveryStatusCounts(), { wrapper });
    expect(Object.values(result.current).every((count) => count === null)).toBe(true);
  });
});

describe('useUserRoleCounts', () => {
  it('cuenta todos, clientes, choferes y administradores desde su endpoint', async () => {
    listAdmins.mockResolvedValue([{ admin_id: 'a-1' }, { admin_id: 'a-2' }]);
    const { result } = renderHook(() => useUserRoleCounts(), { wrapper });
    await waitFor(() => expect(result.current.admin).toBe(2));
    expect(result.current).toEqual({ all: 31, customer: 25, delivery: 5, admin: 2 });
  });
});
