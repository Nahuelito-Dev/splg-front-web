import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../services/api/types';

const permissions = vi.hoisted(() => ({ operate: true }));
const assign = vi.hoisted(() => vi.fn());
const refetch = vi.hoisted(() => vi.fn());
const notifySuccess = vi.hoisted(() => vi.fn());
const boardState = vi.hoisted(() => ({
  pending: { isPending: false, error: null as unknown, data: true },
  assignedLater: false,
  total: { pending: 2, accepted: 1, out_for_delivery: 1, delivered: 1 } as Record<string, number>,
}));

const today = new Date().toISOString();

const order = (id: string, status: Order['status'], name: string, extra: Partial<Order> = {}) =>
  ({
    order_id: id,
    distributor_id: 'dist-1',
    status,
    created_at: '2026-10-18T10:00:00Z',
    total_amount: 1500,
    customer: { full_name: name },
    delivery_address: { street: 'Calle 1', city: 'Posadas' },
    delivery_name: null,
    delivery_id: null,
    order_items: [],
    ...extra,
  }) as unknown as Order;

const DATA: Record<string, Order[]> = {
  pending: [
    order('p-000001', 'pending', 'Ana Pérez', { paymentStatus: 'pending', paymentMethodDetail: 'cash' }),
    order('p-000002', 'pending', 'Beto Gómez'),
  ],
  accepted: [order('a-000003', 'accepted', 'Carla Ruiz', { delivery_name: 'Chofer Uno', delivery_id: 'd-1' })],
  out_for_delivery: [order('o-000004', 'out_for_delivery', 'Diego Sosa', { delivery_name: 'Chofer Dos' })],
  delivered: [order('d-000005', 'delivered', 'Eva Luna', { actual_delivery_date: today })],
};

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    canOperate: permissions.operate,
    operateHint: permissions.operate ? undefined : 'Elegí una distribuidora en «Ver como» para operar',
  }),
}));
vi.mock('../../utils/notifications', () => ({
  notify: { success: notifySuccess, error: vi.fn(), info: vi.fn() },
  confirm: vi.fn(),
  subscribeConfirmOpen: () => () => undefined,
  isConfirmOpen: () => false,
}));
vi.mock('./useDispatchBoardSync', () => ({ useDispatchBoardSync: () => ({ isOnline: true, refetchInterval: false }) }));
vi.mock('../../services/queries/orders', () => ({
  useDispatchBoard: () =>
    Object.fromEntries(
      Object.keys(DATA).map((status) => [
        status,
        {
          data:
            status === 'pending' && !boardState.pending.data
              ? undefined
              : {
                  orders:
                    status === 'pending' && boardState.assignedLater
                      ? DATA[status].map((o) => ({
                          ...o,
                          status: 'accepted',
                          delivery_id: 'd-1',
                          delivery_name: 'Nuevo',
                        }))
                      : DATA[status],
                  total: boardState.total[status],
                },
          isPending: status === 'pending' ? boardState.pending.isPending : false,
          isFetching: false,
          error: status === 'pending' ? boardState.pending.error : null,
          refetch,
        },
      ]),
    ),
  useAssignOrderDelivery: () => ({ mutate: assign, isPending: false }),
  useOrder: () => ({ data: undefined, error: null, refetch: vi.fn() }),
}));
vi.mock('./components/AssignDriverModal', () => ({
  AssignDriverModal: ({ open, onConfirm }: { open: boolean; onConfirm: (id: string) => void }) =>
    open ? (
      <div role="dialog" aria-label="Asignación manual">
        <button type="button" onClick={() => onConfirm('d-9')}>
          Confirmar chofer
        </button>
      </div>
    ) : null,
}));

import { DispatchBoard } from './DispatchBoard';

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/orders/dispatch']}>
      <Routes>
        <Route path="/orders/dispatch" element={<DispatchBoard />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const column = (name: string) => screen.getByRole('region', { name: `Columna ${name}` });

beforeEach(() => {
  permissions.operate = true;
  boardState.pending = { isPending: false, error: null, data: true };
  boardState.assignedLater = false;
  boardState.total = { pending: 2, accepted: 1, out_for_delivery: 1, delivered: 1 };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DispatchBoard', () => {
  it('arma una columna por etapa con sus pedidos y muestra en «Entregados hoy» lo que trae la API', () => {
    renderPage();
    expect(within(column('Pendientes')).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(column('Pendientes')).getByText('Beto Gómez')).toBeInTheDocument();
    expect(within(column('Aceptados')).getByText('Carla Ruiz')).toBeInTheDocument();
    expect(within(column('En camino')).getByText('Diego Sosa')).toBeInTheDocument();
    expect(within(column('Entregados hoy')).getByText('Eva Luna')).toBeInTheDocument();
    expect(within(column('Pendientes')).getByLabelText('2 pedidos')).toBeInTheDocument();
    expect(within(column('Entregados hoy')).getByLabelText('1 pedidos')).toBeInTheDocument();
  });

  it('el cobro se rotula «Cobro …» para no confundirlo con la etapa del pedido', () => {
    renderPage();
    expect(within(column('Pendientes')).getByText('Cobro pendiente')).toBeInTheDocument();
  });

  it('un pedido sin chofer lo dice; uno asignado muestra el nombre', () => {
    renderPage();
    expect(within(column('Pendientes')).getAllByText('Sin chofer')).toHaveLength(2);
    expect(within(column('Aceptados')).getByText('Chofer Uno')).toBeInTheDocument();
  });

  it('asignar abre la asignación de ese pedido y manda la asignación con su id; reasignar sólo donde corresponde', () => {
    renderPage();
    fireEvent.click(within(column('Pendientes')).getAllByRole('button', { name: 'Asignar' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar chofer' }));
    expect(assign).toHaveBeenCalledWith({ id: 'p-000001', deliveryId: 'd-9' }, expect.any(Object));
    expect(within(column('Aceptados')).getByRole('button', { name: 'Reasignar' })).toBeInTheDocument();
    expect(within(column('En camino')).queryByRole('button', { name: /signar/ })).not.toBeInTheDocument();
    expect(within(column('Entregados hoy')).queryByRole('button', { name: /signar/ })).not.toBeInTheDocument();
  });

  it('sin permiso para operar no ofrece asignar y explica por qué', () => {
    permissions.operate = false;
    renderPage();
    expect(screen.queryByRole('button', { name: /signar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Elegí una distribuidora/)).toBeInTheDocument();
  });

  it('«Ver ficha» navega a la ficha del pedido', () => {
    renderPage();
    fireEvent.click(within(column('Aceptados')).getByRole('button', { name: 'Ver ficha' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/orders/a-000003');
  });

  it('el nombre de la tarjeta abre el pedido en un panel lateral con el enlace a la ficha', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido #000001 de Ana Pérez/ }));
    const drawer = screen.getByRole('dialog', { name: /Pedido #/ });
    expect(within(drawer).getByRole('link', { name: /Abrir ficha completa/ })).toHaveAttribute(
      'href',
      '/orders/p-000001',
    );
  });

  it('el buscador filtra las tarjetas en todas las columnas y avisa los vacíos', () => {
    renderPage();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar en el tablero' }), { target: { value: 'carla' } });
    expect(within(column('Aceptados')).getByText('Carla Ruiz')).toBeInTheDocument();
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    expect(within(column('Pendientes')).getByText('Sin resultados')).toBeInTheDocument();
  });

  it('si una columna de espera tiene más pedidos que los que trae la API avisa que faltan los más nuevos', () => {
    boardState.total = { ...boardState.total, pending: 240 };
    renderPage();
    expect(within(column('Pendientes')).getByText(/quedan afuera los 238 más nuevos/)).toBeInTheDocument();
    expect(within(column('Aceptados')).queryByText(/quedan afuera/)).not.toBeInTheDocument();
  });

  it('«Entregados hoy» avisa cuántas entregas del día quedan afuera sólo si hay más que las traídas', () => {
    boardState.total = { ...boardState.total, delivered: 500 };
    renderPage();
    expect(within(column('Entregados hoy')).getByText(/Hoy se entregaron 500/)).toBeInTheDocument();
    cleanup();
    boardState.total = { ...boardState.total, delivered: 1 };
    renderPage();
    expect(within(column('Entregados hoy')).queryByText(/Hoy se entregaron/)).not.toBeInTheDocument();
  });

  it('el panel lateral toma el pedido actual del tablero: si ya tiene chofer no ofrece asignarlo', () => {
    const { rerender } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Ver pedido #000001 de Ana Pérez/ }));
    expect(
      within(screen.getByRole('dialog', { name: /Pedido #/ })).getByRole('button', { name: 'Asignar chofer' }),
    ).toBeInTheDocument();
    boardState.assignedLater = true;
    rerender(
      <MemoryRouter initialEntries={['/orders/dispatch']}>
        <Routes>
          <Route path="/orders/dispatch" element={<DispatchBoard />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      within(screen.getByRole('dialog', { name: /Pedido #/ })).getByRole('button', { name: 'Reasignar chofer' }),
    ).toBeInTheDocument();
  });

  it('si falla el refresco de una columna que ya tenía datos, los sigue mostrando con un aviso', () => {
    boardState.pending = { isPending: false, error: new Error('boom'), data: true };
    renderPage();
    expect(within(column('Pendientes')).getByRole('alert')).toHaveTextContent('No se pudo actualizar');
    expect(within(column('Pendientes')).getByText('Ana Pérez')).toBeInTheDocument();
  });

  it('una columna que falla muestra su error con reintento sin tapar a las demás', async () => {
    boardState.pending = { isPending: false, error: new Error('boom'), data: false };
    renderPage();
    fireEvent.click(within(column('Pendientes')).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(within(column('Aceptados')).getByText('Carla Ruiz')).toBeInTheDocument();
  });

  it('mientras carga una columna muestra un esqueleto en lugar de un 0', () => {
    boardState.pending = { isPending: true, error: null, data: false };
    renderPage();
    expect(within(column('Pendientes')).getByRole('status', { name: /Cargando pendientes/ })).toBeInTheDocument();
  });

  it('«Actualizar» vuelve a pedir las cuatro columnas', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Actualizar/ }));
    expect(refetch).toHaveBeenCalledTimes(4);
  });
});
