import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInsurancePolicy, payInsuranceInstallment } from '../api/insurance';
import { clearIntent } from '../api/idempotency';
import { queryKeys } from './queryKeys';
import { useCreateInsurancePolicy, usePayInsuranceInstallment } from './insurance';

vi.mock('../api/insurance', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  payInsuranceInstallment: vi.fn(),
  createInsurancePolicy: vi.fn(),
}));

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { spy, wrapper };
};
const invalidated = (spy: ReturnType<typeof setup>['spy']) => spy.mock.calls.map((c) => c[0]?.queryKey);

beforeEach(() => {
  vi.resetAllMocks();
  clearIntent('insurance-pay:q-1');
});

describe('usePayInsuranceInstallment', () => {
  const body = { attachmentId: 'a-1', paidAt: '2026-10-28T12:00:00.000Z', amount: 100, cashBoxId: 'b-1' };

  it('manda la clave de la intención y un reintento con los mismos datos usa la misma', async () => {
    vi.mocked(payInsuranceInstallment)
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce({} as never);
    const { wrapper } = setup();
    const { result } = renderHook(() => usePayInsuranceInstallment(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'q-1', body }).catch(() => undefined);
    });
    await act(async () => {
      await result.current.mutateAsync({ id: 'q-1', body });
    });
    const [first, second] = vi.mocked(payInsuranceInstallment).mock.calls;
    expect(first[1]).toEqual(body);
    expect(typeof first[2]).toBe('string');
    expect(second[2]).toBe(first[2]);
  });

  it('al pagar refresca el seguro, las cajas y los movimientos', async () => {
    vi.mocked(payInsuranceInstallment).mockResolvedValue({} as never);
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => usePayInsuranceInstallment(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'q-1', body });
    });
    await waitFor(() => expect(invalidated(spy)).toContainEqual(queryKeys.insurance.all));
    expect(invalidated(spy)).toContainEqual(queryKeys.cashBoxes.all);
    expect(invalidated(spy)).toContainEqual(queryKeys.cashMovements.all);
  });
});

describe('useCreateInsurancePolicy', () => {
  it('refresca el seguro y la flota (el vencimiento puede haber pasado a Flota)', async () => {
    vi.mocked(createInsurancePolicy).mockResolvedValue({} as never);
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateInsurancePolicy(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ body: {} as never, scope: 'insurance-policy:c-1' });
    });
    await waitFor(() => expect(invalidated(spy)).toContainEqual(queryKeys.fleet.all));
    expect(invalidated(spy)).toContainEqual(queryKeys.insurance.all);
  });
});
