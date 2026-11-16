import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grantEmployeeAccount, listEmployees, updateJobPosition } from '../api/employees';
import { useEmployeeStatusCounts, useGrantEmployeeAccount, useUpdateJobPosition } from './employees';
import { queryKeys } from './queryKeys';

vi.mock('../api/employees', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  grantEmployeeAccount: vi.fn(),
  listEmployees: vi.fn(),
  updateJobPosition: vi.fn(),
}));

const setup = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('invalidaciones de legajos', () => {
  it('crear la cuenta de un chofer refresca legajos, choferes y usuarios', async () => {
    vi.mocked(grantEmployeeAccount).mockResolvedValue({} as never);
    const { queryClient, wrapper } = setup();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useGrantEmployeeAccount(), { wrapper });
    result.current.mutate({ id: 'e-1', body: { email: 'a@b.com', password: '123456' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (const resource of [queryKeys.employees, queryKeys.deliveries, queryKeys.users]) {
      expect(spy).toHaveBeenCalledWith({ queryKey: resource.all });
    }
  });

  it('renombrar un puesto refresca también los legajos', async () => {
    vi.mocked(updateJobPosition).mockResolvedValue({} as never);
    const { queryClient, wrapper } = setup();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateJobPosition(), { wrapper });
    result.current.mutate({ id: 'p-1', body: { name: 'Nuevo', isActive: true } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.jobPositions.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.employees.all });
  });
});

describe('contadores de legajos por estado', () => {
  it('pide el total de todos, activos y egresados con los demás filtros aplicados', async () => {
    vi.mocked(listEmployees).mockImplementation((_params, filters) =>
      Promise.resolve({ rows: [], total: filters.status === 'active' ? 2 : filters.status === 'terminated' ? 1 : 3 }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useEmployeeStatusCounts({ q: 'ana', category: 'driver' }), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ all: 3, active: 2, terminated: 1 }));
    expect(
      vi
        .mocked(listEmployees)
        .mock.calls.map(([, filters]) => filters.status)
        .sort(),
    ).toEqual(['active', 'terminated', undefined]);
    for (const [params, filters] of vi.mocked(listEmployees).mock.calls) {
      expect(params).toEqual({ page: 0, pageSize: 1 });
      expect(filters).toMatchObject({ q: 'ana', category: 'driver' });
    }
  });
});
