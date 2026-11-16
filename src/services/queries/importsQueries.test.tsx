import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ confirmImport: vi.fn() }));
vi.mock('../api/imports', () => api);

import { useConfirmImport } from './imports';
import { queryKeys } from './queryKeys';

const confirmAs = async (recurso: string) => {
  api.confirmImport.mockResolvedValue({ recurso });
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useConfirmImport(), { wrapper });
  result.current.mutate('i-1');
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return invalidate.mock.calls.map(([filters]) => filters?.queryKey);
};

describe('useConfirmImport', () => {
  it('proveedores refresca los proveedores', async () => {
    expect(await confirmAs('proveedores')).toEqual([queryKeys.suppliers.all]);
  });
  it('precios refresca el catálogo', async () => {
    expect(await confirmAs('precios')).toEqual([queryKeys.gasCylinders.all]);
  });
  it('garrafas y stock refrescan catálogo y stock', async () => {
    expect(await confirmAs('garrafas')).toEqual(
      expect.arrayContaining([queryKeys.gasCylinders.all, queryKeys.stock.all]),
    );
    expect(await confirmAs('stock')).toEqual(expect.arrayContaining([queryKeys.gasCylinders.all, queryKeys.stock.all]));
  });
});
