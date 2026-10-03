import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { OrderDetailsToolbar } from './OrderDetailsToolbar';

const permissions = vi.hoisted(() => vi.fn());
vi.mock('../../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
}));

afterEach(cleanup);

const HINT = 'Elegí una distribuidora para operar';
const order = {
  order_id: 'abcdef123456',
  status: 'accepted',
  created_at: '2026-10-01T13:00:00.000Z',
  delivery_id: null,
} as unknown as Order;

const renderToolbar = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OrderDetailsToolbar order={order} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('OrderDetailsToolbar: permisos', () => {
  it('el administrador general sin distribuidora elegida opera pedidos igual: la API lo permite', () => {
    permissions.mockReturnValue({ canOperate: false, operateHint: HINT });
    renderToolbar();
    expect(screen.getByRole('button', { name: /Asignar chofer/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Cancelar pedido/ })).toBeEnabled();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Imprimir remito/ })).toBeInTheDocument();
  });
});
