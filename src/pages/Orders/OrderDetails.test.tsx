import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const permissions = vi.hoisted(() => vi.fn());
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
  useBackToList: () => () => undefined,
}));
vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../context/useSocketContext', () => ({
  useSocketContext: () => ({ isOnline: true, subscribe: () => () => undefined }),
}));
const useOrder = vi.hoisted(() => vi.fn());
vi.mock('../../services/queries/orders', () => ({ useOrder }));
vi.mock('./components/details/OrderDetailsToolbar', () => ({ OrderDetailsToolbar: () => <div>Barra</div> }));
vi.mock('./components/details/OrderItemsSummary', () => ({ OrderItemsSummary: () => <div>Ítems</div> }));
vi.mock('./components/details/OrderHistoryCard', () => ({ OrderHistoryCard: () => <div>Historial</div> }));
vi.mock('./components/details/OrderSideCards', () => ({ OrderSideCards: () => <div>Laterales</div> }));
vi.mock('./components/details/OrderIncidents', () => ({ OrderIncidents: () => <div>Incidencias</div> }));
vi.mock('../PhysicalCylinders/components/CylinderLinksCard', () => ({ CylinderLinksCard: () => <div>Envases</div> }));
vi.mock('./components/details/OrderCashSettlementCard', () => ({
  OrderCashSettlementCard: ({ orderId }: { orderId: string }) => <div>Cobro en caja de {orderId}</div>,
}));

import { OrderDetails } from './OrderDetails';

afterEach(() => {
  cleanup();
  useOrder.mockReset();
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/orders/o-1']}>
        <Routes>
          <Route path="orders/:id" element={<OrderDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('OrderDetails', () => {
  it('el administrador general sin «Ver como» ve el aviso y no se pide el pedido (la API exige distribuidora)', () => {
    permissions.mockReturnValue({ needsDistributor: true });
    useOrder.mockReturnValue({ data: undefined, isPending: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Elegí una distribuidora')).toBeInTheDocument();
    expect(useOrder).toHaveBeenCalledWith('o-1', expect.objectContaining({ enabled: false }));
  });

  it.each([
    ['mercadopago', true],
    ['transfer', true],
    ['cash', false],
    ['account', false],
  ])('con pago %s, la tarjeta del cobro en caja se muestra: %s', (metodo, visible) => {
    permissions.mockReturnValue({ needsDistributor: false, canWrite: true, canOperate: true });
    useOrder.mockReturnValue({
      data: { order_id: 'o-1', status: 'pending', paymentMethodDetail: metodo },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.queryByText('Cobro en caja de o-1') !== null).toBe(visible);
  });
});
