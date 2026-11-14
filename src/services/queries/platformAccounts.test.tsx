import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const listUsers = vi.hoisted(() => vi.fn());
vi.mock('../api/users', () => ({ listUsers }));

import { usePlatformAccounts } from './users';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('usePlatformAccounts', () => {
  it('pide sólo administradores generales y admins (nunca clientes ni choferes) y junta los dos', async () => {
    listUsers.mockImplementation((_p: unknown, _t: string, role: string) =>
      Promise.resolve({ rows: [{ user_id: role }], total: 1 }),
    );
    const { result } = renderHook(() => usePlatformAccounts('ana'), { wrapper });
    await waitFor(() => expect(result.current.accounts).toHaveLength(2));
    expect(listUsers.mock.calls.map((call: unknown[]) => call[2] as string).sort()).toEqual(['admin', 'super_admin']);
    expect(listUsers).toHaveBeenCalledWith({ page: 0, pageSize: 5 }, 'ana', 'super_admin');
  });
});
