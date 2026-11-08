import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/errors';

const putContainerCharge = vi.hoisted(() => vi.fn());
vi.mock('../api/containerCharge', () => ({ getContainerCharge: vi.fn(), putContainerCharge }));

import { useUpdateContainerCharge } from './containerCharge';
import { queryKeys } from './queryKeys';

const setup = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUpdateContainerCharge(), { wrapper });
  return { client, result };
};
const keyOf = (call: number) => (putContainerCharge.mock.calls[call] as unknown[])[1] as string;

beforeEach(() => putContainerCharge.mockReset());

describe('useUpdateContainerCharge', () => {
  it('guarda lo que devuelve el back en la caché del interruptor', async () => {
    putContainerCharge.mockResolvedValue({ enabled: true });
    const { client, result } = setup();
    await result.current.mutateAsync({ enabled: true });
    expect(client.getQueryData(queryKeys.containerCharge.all)).toEqual({ enabled: true });
  });

  it('sin respuesta (red) el reintento reusa la clave; con respuesta del back la próxima es otra', async () => {
    putContainerCharge
      .mockRejectedValueOnce(new ApiError(null, ['Sin conexión']))
      .mockRejectedValueOnce(new ApiError(400, ['Pedido inválido']))
      .mockResolvedValueOnce({ enabled: true });
    const { result } = setup();
    await expect(result.current.mutateAsync({ enabled: true })).rejects.toBeTruthy();
    await expect(result.current.mutateAsync({ enabled: true })).rejects.toBeTruthy();
    await result.current.mutateAsync({ enabled: true });
    await waitFor(() => expect(putContainerCharge).toHaveBeenCalledTimes(3));
    expect(keyOf(1)).toBe(keyOf(0));
    expect(keyOf(2)).not.toBe(keyOf(1));
  });

  it('ante un 5xx el reintento reusa la clave (el back pudo haberlo guardado)', async () => {
    putContainerCharge
      .mockRejectedValueOnce(new ApiError(503, ['Servicio no disponible']))
      .mockResolvedValueOnce({ enabled: true })
      .mockResolvedValueOnce({ enabled: true });
    const { result } = setup();
    await expect(result.current.mutateAsync({ enabled: true })).rejects.toBeTruthy();
    await result.current.mutateAsync({ enabled: true });
    await result.current.mutateAsync({ enabled: true });
    expect(keyOf(1)).toBe(keyOf(0));
    expect(keyOf(2)).not.toBe(keyOf(1));
  });
});
