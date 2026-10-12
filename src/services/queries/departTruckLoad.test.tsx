import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { departTruckLoad } from '../api/truckLoads';
import { DEPART_ALREADY_DONE, useDepartTruckLoad } from './truckLoads';

vi.mock('../api/truckLoads', () => ({ departTruckLoad: vi.fn() }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useDepartTruckLoad', () => {
  it('un 409 de transición se muestra como «La salida ya estaba registrada»', async () => {
    vi.mocked(departTruckLoad).mockRejectedValue(
      new AxiosError('x', 'E', undefined, undefined, {
        status: 409,
        data: { message: 'No se puede pasar a on_route' },
      } as never),
    );
    const { result } = renderHook(() => useDepartTruckLoad(), { wrapper });
    result.current.mutate({ id: 'L1', scope: 'depart:L1' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe(DEPART_ALREADY_DONE);
  });

  it('el reintento de la salida usa la misma clave', async () => {
    vi.mocked(departTruckLoad).mockReset();
    vi.mocked(departTruckLoad).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
    const { result } = renderHook(() => useDepartTruckLoad(), { wrapper });
    result.current.mutate({ id: 'L2', scope: 'depart:L2' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    result.current.mutate({ id: 'L2', scope: 'depart:L2' });
    await waitFor(() => expect(vi.mocked(departTruckLoad)).toHaveBeenCalledTimes(2));
    const calls = vi.mocked(departTruckLoad).mock.calls;
    expect(calls[0][1]).toBe(calls[1][1]);
  });
});
