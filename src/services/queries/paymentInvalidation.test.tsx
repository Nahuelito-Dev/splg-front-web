import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  confirmTransfer: vi.fn(),
  registerCashPayment: vi.fn(),
  confirmReservationDeposit: vi.fn(),
}));
vi.mock('../api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirmTransfer: api.confirmTransfer,
  registerCashPayment: api.registerCashPayment,
}));
vi.mock('../api/reservations', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirmReservationDeposit: api.confirmReservationDeposit,
}));

import { useConfirmTransfer, useRegisterCashPayment } from './orders';
import { useConfirmReservationDeposit } from './reservations';

const setup = <T,>(hook: () => T) => {
  const client = new QueryClient();
  const spy = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { spy, ...renderHook(hook, { wrapper }) };
};

const keysOf = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.map(([filters]) => (filters as { queryKey: string[] }).queryKey[0]);

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset().mockResolvedValue({}));
});

describe('un cobro puede entrar a una caja: se vuelven a leer los cobros en caja', () => {
  it('confirmar una transferencia refresca `cashSettings`', async () => {
    const { result, spy } = setup(() => useConfirmTransfer());
    result.current.mutate({ id: 'o-1', body: { received: true, reason: 'Llegó al banco' }, scope: 'transfer:o-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(keysOf(spy)).toEqual(expect.arrayContaining(['cashSettings', 'cashMovements', 'cashBoxes']));
  });

  it('registrar el efectivo cobrado refresca `cashSettings`', async () => {
    const { result, spy } = setup(() => useRegisterCashPayment());
    result.current.mutate({ id: 'o-1', body: { reason: 'Cobré yo' } as never, scope: 'cash:o-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(keysOf(spy)).toContain('cashSettings');
  });

  it('confirmar la seña manda la caja y refresca cajas, movimientos y `cashSettings`', async () => {
    const { result, spy } = setup(() => useConfirmReservationDeposit());
    result.current.mutate({ orderId: 'o-1', cashBoxId: 'c-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.confirmReservationDeposit).toHaveBeenCalledWith('o-1', { cashBoxId: 'c-1' }, expect.any(String));
    expect(keysOf(spy)).toEqual(
      expect.arrayContaining(['reservations', 'orders', 'cashBoxes', 'cashMovements', 'cashSettings']),
    );
  });

  it('una seña por transferencia no manda caja', async () => {
    const { result } = setup(() => useConfirmReservationDeposit());
    result.current.mutate({ orderId: 'o-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.confirmReservationDeposit).toHaveBeenCalledWith('o-1', {}, expect.any(String));
  });
});
