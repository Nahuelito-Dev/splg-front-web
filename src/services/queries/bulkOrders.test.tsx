import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getOrder = vi.hoisted(() => vi.fn<[string], Promise<unknown>>());
const cancelOrder = vi.hoisted(() => vi.fn<[string, unknown], Promise<unknown>>());
const assignOrderDelivery = vi.hoisted(() => vi.fn<[string, string], Promise<unknown>>());
const notifySuccess = vi.hoisted(() => vi.fn<[string], void>());
const notifyError = vi.hoisted(() => vi.fn<[Error], void>());

vi.mock('../api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getOrder: (id: string) => getOrder(id),
  cancelOrder: (id: string, body: unknown) => cancelOrder(id, body),
  assignOrderDelivery: (id: string, deliveryId: string) => assignOrderDelivery(id, deliveryId),
}));
vi.mock('../../utils/notifications', () => ({
  notify: { success: notifySuccess, error: notifyError, info: vi.fn() },
}));

import { useBulkAssignOrders, useBulkCancelOrders } from './orders';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('acciones en lote sobre pedidos', () => {
  it('antes de cada fila vuelve a pedir el pedido: los que ya no aplican se omiten, no son fallas', async () => {
    const status: Record<string, string> = { a: 'pending', b: 'delivered', c: 'pending' };
    getOrder.mockImplementation((id: string) => Promise.resolve({ order_id: id, status: status[id] }));
    cancelOrder.mockResolvedValue({});
    const { result } = renderHook(() => useBulkCancelOrders(), { wrapper });
    await act(() => result.current.mutateAsync({ ids: ['a', 'b', 'c'], body: {} }));

    expect(cancelOrder.mock.calls.map(([id]) => id)).toEqual(['a', 'c']);
    // El resumen sale desde el hook (no desde quien dispara), con lo omitido aparte de las fallas.
    expect(notifySuccess).toHaveBeenCalledWith('2 de 3 pedidos cancelados. 1 omitido (ya no aplicaba).');
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('asignar omite los que ya no están pendientes ni aceptados', async () => {
    getOrder.mockImplementation((id: string) =>
      Promise.resolve({ order_id: id, status: id === 'a' ? 'out_for_delivery' : 'pending' }),
    );
    assignOrderDelivery.mockResolvedValue({});
    const { result } = renderHook(() => useBulkAssignOrders(), { wrapper });
    await act(() => result.current.mutateAsync({ ids: ['a', 'b'], deliveryId: 'd-1' }));
    expect(assignOrderDelivery).toHaveBeenCalledOnce();
    expect(assignOrderDelivery).toHaveBeenCalledWith('b', 'd-1');
  });

  it('una falla se avisa como error con su motivo, y el lote sigue con las demás', async () => {
    getOrder.mockResolvedValue({ status: 'pending' });
    cancelOrder.mockImplementation((id: string) =>
      id === 'a' ? Promise.reject(new Error('Boom')) : Promise.resolve({}),
    );
    const { result } = renderHook(() => useBulkCancelOrders(), { wrapper });
    await act(() => result.current.mutateAsync({ ids: ['a', 'b'], body: {} }));
    expect(cancelOrder).toHaveBeenCalledTimes(2);
    expect(notifyError.mock.calls[0][0].message).toContain('1 de 2 pedidos cancelados. Fallaron 1.');
    expect(notifyError.mock.calls[0][0].message).toContain('Boom');
  });

  it('"Detener" evita lanzar las filas que faltan y lo avisa', async () => {
    getOrder.mockResolvedValue({ status: 'pending' });
    let release: () => void = () => undefined;
    cancelOrder.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve({}))));
    cancelOrder.mockResolvedValue({});
    const { result } = renderHook(() => useBulkCancelOrders(), { wrapper });
    let done: Promise<unknown> = Promise.resolve();
    act(() => {
      done = result.current.mutateAsync({ ids: ['a', 'b', 'c'], body: {} });
    });
    await waitFor(() => expect(cancelOrder).toHaveBeenCalledTimes(1));
    result.current.stop();
    release();
    await act(() => done);
    expect(cancelOrder).toHaveBeenCalledTimes(1);
    expect(notifyError.mock.calls[0][0].message).toContain('Detenido: 2 sin procesar');
  });
});
