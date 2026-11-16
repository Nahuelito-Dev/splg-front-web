import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { resolveRecoveryCase } from '../api/recovery';
import { queryKeys } from './queryKeys';
import { useResolveRecoveryCase } from './recovery';

vi.mock('../api/recovery', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  resolveRecoveryCase: vi.fn(),
}));

const setup = () => {
  const client = new QueryClient();
  const spy = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { spy, ...renderHook(() => useResolveRecoveryCase(), { wrapper }) };
};

const BODY = { id: 'c-1', body: { decision: 'write_off' as const, note: 'Extraviado por el cliente' } };

describe('useResolveRecoveryCase', () => {
  it('una decisión que se registra refresca los casos y los envases', async () => {
    vi.mocked(resolveRecoveryCase).mockResolvedValue({} as never);
    const { result, spy } = setup();
    result.current.mutate(BODY);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.cylinderRecovery.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.cylinders.all });
  });

  it('una decisión que la API rechaza (el envase ya volvió) refresca el legajo, que quedó viejo', async () => {
    vi.mocked(resolveRecoveryCase).mockRejectedValue(new Error('El envase ya volvió o cambió de manos'));
    const { result, spy } = setup();
    result.current.mutate(BODY);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.cylinderRecovery.all });
  });
});
