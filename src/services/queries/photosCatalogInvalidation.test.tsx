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

const CASES = [
  { kind: 'supplier', keys: [queryKeys.suppliers.all] },
  { kind: 'cylinder', keys: [queryKeys.cylinders.all] },
  { kind: 'truckLoad', keys: [queryKeys.truckLoads.all] },
  {
    kind: 'gasCylinder',
    keys: [
      queryKeys.gasCylinders.all,
      queryKeys.orders.all,
      queryKeys.stock.all,
      queryKeys.warehouses.all,
      queryKeys.purchaseOrders.all,
      queryKeys.purchaseReceipts.all,
      queryKeys.cylinders.all,
    ],
  },
  // Las pantallas de plataforma: quién pidió un acceso de soporte y el actor de la auditoría.
  {
    kind: 'user',
    keys: [queryKeys.supportSessions.all, queryKeys.supportAccess.all, queryKeys.platformConsole.all],
  },
  // El logo en el uso de servicios (consola), los tickets del soporte y el uso del chat por empresa.
  {
    kind: 'distributor',
    keys: [queryKeys.platformConsole.all, queryKeys.supportChat.all, queryKeys.chatMetrics.all],
  },
] as const;

describe.each(CASES)('foto de $kind: qué se refresca', ({ kind, keys }) => {
  it('al subirla se refrescan las listas que la muestran', async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useUploadPhoto(kind), { wrapper });
    act(() => result.current.mutate({ id: 'x-1', file: new File(['x'], 'a.jpg') }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    for (const key of keys) expect(invalidated(spy)).toContainEqual(key);
  });

  it('al quitarla también', async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useRemovePhoto(kind), { wrapper });
    act(() => result.current.mutate('x-1'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    for (const key of keys) expect(invalidated(spy)).toContainEqual(key);
  });
});
