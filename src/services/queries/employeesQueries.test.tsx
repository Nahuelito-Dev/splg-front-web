import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grantEmployeeAccount, updateJobPosition } from '../api/employees';
import { useGrantEmployeeAccount, useUpdateJobPosition } from './employees';
import { queryKeys } from './queryKeys';

vi.mock('../api/employees', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  grantEmployeeAccount: vi.fn(),
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
