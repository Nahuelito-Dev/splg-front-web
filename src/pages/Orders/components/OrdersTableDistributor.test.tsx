import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../services/api/types';

const perms = vi.hoisted(() => ({ needsDistributor: false }));
const listOrderPaymentStates = vi.hoisted(() => vi.fn(() => Promise.resolve([])));
vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: perms.needsDistributor }),
}));
vi.mock('../../../services/api/orders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  listOrderPaymentStates,
}));
// La grilla de MUI no hace falta: lo que se prueba es la consulta de los pagos.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: () => null,
}));

import { OrdersTable } from './OrdersTable';

afterEach(() => {
  cleanup();
  listOrderPaymentStates.mockClear();
  perms.needsDistributor = false;
});

const ROWS = [
  { order_id: 'o-1', status: 'pending', paymentMethodDetail: 'mercadopago' },
  { order_id: 'o-2', status: 'pending', paymentMethodDetail: 'cash' },
] as unknown as Order[];

const renderTable = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <OrdersTable
        rows={ROWS}
        total={ROWS.length}
        loading={false}
        pagination={{ page: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        onView={vi.fn()}
      />
    </QueryClientProvider>,
  );

describe('OrdersTable: pagos de Mercado Pago sin distribuidora', () => {
  it('sin «Ver como» no pide el estado de los pagos (la API exige X-Distributor)', async () => {
    perms.needsDistributor = true;
    renderTable();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(listOrderPaymentStates).not.toHaveBeenCalled();
  });

  it('con distribuidora elegida pide el de los pedidos de Mercado Pago de la página', async () => {
    renderTable();
    await waitFor(() => expect(listOrderPaymentStates).toHaveBeenCalledWith(['o-1']));
  });
});
