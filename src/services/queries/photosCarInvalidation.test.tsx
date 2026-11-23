import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/photos', () => ({ uploadPhoto: () => Promise.resolve({}), removePhoto: () => Promise.resolve({}) }));

import { useRemovePhoto, useUploadPhoto } from './photos';
import { queryKeys } from './queryKeys';

const setup = () => {
  const client = new QueryClient();
  const spy = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { spy, wrapper };
};

const invalidated = (spy: ReturnType<typeof setup>['spy']) => spy.mock.calls.map(([filters]) => filters?.queryKey);

describe('foto de un vehículo: qué se refresca', () => {
  it('al subirla se refrescan pedidos, flota, hojas de ruta y la ficha del vehículo', async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useUploadPhoto('car'), { wrapper });
    act(() => result.current.mutate({ id: 'car-1', file: new File(['x'], 'a.jpg') }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const keys = invalidated(spy);
    for (const key of [
      queryKeys.cars.all,
      queryKeys.orders.all,
      queryKeys.fleet.all,
      queryKeys.routePlans.all,
      queryKeys.routeSheets.all,
    ])
      expect(keys).toContainEqual(key);
  });

  it('al quitarla también', async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useRemovePhoto('car'), { wrapper });
    act(() => result.current.mutate('car-1'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(invalidated(spy)).toContainEqual(queryKeys.orders.all);
  });
});
