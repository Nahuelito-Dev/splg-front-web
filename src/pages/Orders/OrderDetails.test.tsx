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
});
