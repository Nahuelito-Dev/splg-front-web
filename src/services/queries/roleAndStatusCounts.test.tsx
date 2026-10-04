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
const listCustomers = vi.fn((_page: unknown, _search?: string, status?: string) =>
  Promise.resolve({ rows: [], total: status === 'active' ? 20 : status === 'blocked' ? 5 : 25 }),
);
vi.mock('../api/customers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listCustomers: (page: unknown, search?: string, status?: string) => listCustomers(page, search, status),
}));
const TOTALS: Record<string, number> = { admin: 2, super_admin: 1, delivery: 5, customer: 25 };
const listUsers = vi.fn((_page: unknown, _search?: string, role?: string) =>
  Promise.resolve({ rows: [], total: role ? (TOTALS[role] ?? 0) : 33 }),
);
vi.mock('../api/users', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listUsers: (page: unknown, search?: string, role?: string) => listUsers(page, search, role),
}));

import { useDeliveryStatusCounts } from './deliveries';
import { useCustomerStatusCounts } from './customers';
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
  it('pide una página mínima por rol a GET /users y lee el total real', async () => {
    const { result } = renderHook(() => useUserRoleCounts(), { wrapper });
    await waitFor(() => expect(result.current.customer).toBe(25));
    expect(result.current).toEqual({ all: 33, admin: 2, super_admin: 1, delivery: 5, customer: 25 });
    for (const [page] of listUsers.mock.calls) expect(page).toEqual({ page: 0, pageSize: 1 });
  });
});

describe('useCustomerStatusCounts', () => {
  it('pide todos, activos y bloqueados con la búsqueda aplicada', async () => {
    const { result } = renderHook(() => useCustomerStatusCounts('ana'), { wrapper });
    await waitFor(() => expect(result.current.blocked).toBe(5));
    expect(result.current).toEqual({ all: 25, active: 20, blocked: 5 });
    expect(listCustomers).toHaveBeenCalledWith({ page: 0, pageSize: 1 }, 'ana', 'blocked');
  });
});
