import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('../api/httpClient', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  http,
}));

import { updateGasCylinderStock } from '../api/gasCylinders';
import { useUpdateGasCylinderStock } from './gasCylinders';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  http.patch.mockReset().mockResolvedValue({ data: {} });
});

describe('ajuste de stock por producto', () => {
  it('la API manda el encabezado Idempotency-Key (el back nuevo responde 400 sin él)', async () => {
    await updateGasCylinderStock('g-1', { quantity: 5 }, 'clave-1');
    expect(http.patch).toHaveBeenCalledWith(
      '/gascylinder/g-1/stock',
      { quantity: 5 },
      {
        headers: { 'Idempotency-Key': 'clave-1' },
      },
    );
  });

  it('el hook manda una clave; el reintento tras un error de red usa la misma y un ajuste distinto, otra', async () => {
    http.patch.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
    const { result } = renderHook(() => useUpdateGasCylinderStock(), { wrapper });
    result.current.mutate({ id: 'g-9', body: { quantity: 5 } });
    await waitFor(() => expect(result.current.isError).toBe(true));
    result.current.mutate({ id: 'g-9', body: { quantity: 5 } });
    await waitFor(() => expect(http.patch).toHaveBeenCalledTimes(2));
    result.current.mutate({ id: 'g-9', body: { quantity: 7 } });
    await waitFor(() => expect(http.patch).toHaveBeenCalledTimes(3));
    const keys = http.patch.mock.calls.map(
      (c: unknown[]) => (c[2] as { headers: Record<string, string> }).headers['Idempotency-Key'],
    );
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });
});
