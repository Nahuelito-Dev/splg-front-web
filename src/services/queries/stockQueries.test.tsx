import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listAdjustments, listStockMovements, reapplyDeliveries } from '../api/stock';
import { queryKeys } from './queryKeys';
import { findInitialCount, invalidateStockViews, useBatchReversed, useReapplyDeliveries } from './stock';

vi.mock('../api/stock', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listAdjustments: vi.fn(),
  listStockMovements: vi.fn(),
  reapplyDeliveries: vi.fn(),
}));

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useBatchReversed', () => {
  it('pregunta por el contraasiento del lote con su referenceId y responde si existe', async () => {
    vi.mocked(listStockMovements).mockResolvedValue({ data: [], total: 1 } as never);
    const { wrapper } = setup();
    const { result } = renderHook(() => useBatchReversed('batch-1'), { wrapper });
    await waitFor(() => expect(result.current.data).toBe(true));
    expect(listStockMovements).toHaveBeenCalledWith(
      { page: 0, pageSize: 1 },
      { reason: 'reversal', referenceId: 'batch-1' },
    );
  });

  it('sin contraasiento responde false, y sin lote no consulta', async () => {
    vi.mocked(listStockMovements).mockResolvedValue({ data: [], total: 0 } as never);
    const { wrapper } = setup();
    const { result } = renderHook(() => useBatchReversed('batch-2'), { wrapper });
    await waitFor(() => expect(result.current.data).toBe(false));
    vi.mocked(listStockMovements).mockClear();
    renderHook(() => useBatchReversed(undefined), { wrapper });
    expect(listStockMovements).not.toHaveBeenCalled();
  });
});

describe('invalidateStockViews', () => {
  it.each([
    ['cargas del camión', queryKeys.truckLoads],
    ['proveedores', queryKeys.suppliers],
    ['recepciones', queryKeys.purchaseReceipts],
    ['órdenes', queryKeys.purchaseOrders],
    ['stock', queryKeys.stock],
  ])('refresca %s', async (_name, resource) => {
    const { queryClient } = setup();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await invalidateStockViews(queryClient);
    expect(spy).toHaveBeenCalledWith({ queryKey: resource.all });
  });
});

describe('useReapplyDeliveries', () => {
  it('cada pedido del usuario manda una clave nueva, aunque el anterior haya fallado sin respuesta', async () => {
    vi.mocked(reapplyDeliveries).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useReapplyDeliveries(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    result.current.mutate();
    await waitFor(() => expect(reapplyDeliveries).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(reapplyDeliveries).mock.calls.map(([key]) => key);
    expect(first).not.toBe(second);
  });
});

describe('findInitialCount', () => {
  const adjustment = (locationId: string, n: number) => ({
    adjustmentId: `a-${n}`,
    number: n,
    location: { locationId },
  });

  it('sigue buscando en las páginas siguientes hasta dar con el conteo de la ubicación', async () => {
    vi.mocked(listAdjustments)
      .mockResolvedValueOnce({ data: [adjustment('otra', 1)], total: 150 } as never)
      .mockResolvedValueOnce({ data: [adjustment('l-1', 2)], total: 150 } as never);
    const found = await findInitialCount('l-1');
    expect(found).toMatchObject({ adjustmentId: 'a-2' });
    expect(listAdjustments).toHaveBeenNthCalledWith(1, { page: 0, pageSize: 100 }, { reason: 'initial_count' });
    expect(listAdjustments).toHaveBeenNthCalledWith(2, { page: 1, pageSize: 100 }, { reason: 'initial_count' });
  });

  it('si ninguna página lo tiene devuelve null', async () => {
    vi.mocked(listAdjustments).mockResolvedValue({ data: [adjustment('otra', 1)], total: 1 } as never);
    expect(await findInitialCount('l-1')).toBeNull();
    expect(listAdjustments).toHaveBeenCalledTimes(1);
  });
});
