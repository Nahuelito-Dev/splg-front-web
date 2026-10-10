import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../services/api/types';

type BulkCall = [vars: unknown, options: { onSuccess: (result: unknown) => void }];
const bulkCancel = vi.hoisted(() => vi.fn<BulkCall, void>());
const bulkAssign = vi.hoisted(() => vi.fn<BulkCall, void>());
const notifyError = vi.hoisted(() => vi.fn<[Error], void>());
const notifySuccess = vi.hoisted(() => vi.fn<[string], void>());
const stop = vi.hoisted(() => vi.fn());
const busy = vi.hoisted(() => ({ cancel: false }));

const order = (id: string, status: Order['status'], name: string) =>
  ({
    order_id: id,
    distributor_id: 'dist-1',
    status,
    created_at: '2026-10-01T10:00:00Z',
    total_amount: 1000,
    customer: { full_name: name },
    delivery_address: { street: 'Calle 1', city: 'Posadas' },
    delivery_name: null,
    zone_surcharge: null,
  }) as unknown as Order;

const ORDERS = [
  order('aaaaaaaa-1', 'pending', 'Ana Pérez'),
  { ...order('bbbbbbbb-2', 'accepted', 'Beto Gómez'), distributor_id: 'dist-2' } as Order,
  order('cccccccc-3', 'delivered', 'Carla Ruiz'),
  { ...order('dddddddd-4', 'reserved', 'Diego Sosa'), distributor_id: 'dist-3' } as Order,
];

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: false }),
}));
vi.mock('../../utils/notifications', () => ({
  notify: { success: notifySuccess, error: notifyError, info: vi.fn() },
  confirm: vi.fn(),
  subscribeConfirmOpen: () => () => undefined,
  isConfirmOpen: () => false,
}));
vi.mock('../../services/queries/orders', () => {
  const idle = { mutate: vi.fn(), isPending: false };
  return {
    useOrders: () => ({ data: { orders: ORDERS, total: 4 }, isFetching: false }),
    useOrderStatusCounts: () => ({
      counts: { reserved: 0, pending: 1, accepted: 1, out_for_delivery: 0, delivered: 1, cancelled: 0 },
      total: 3,
    }),
    useAssignOrderDelivery: () => idle,
    useUpdateOrder: () => idle,
    useCancelOrder: () => idle,
    useBulkCancelOrders: () => ({ mutate: bulkCancel, isPending: busy.cancel, stop }),
    useBulkAssignOrders: () => ({ mutate: bulkAssign, isPending: false, stop }),
    useActiveDeliveries: () => ({
      data: {
        rows: [{ delivery_id: 'd-1', user: { full_name: 'Chofer Uno', phone_number: '111' } }],
        total: 1,
      },
      isPending: false,
    }),
  };
});

vi.mock('./components/EditOrderModal', () => ({ EditOrderModal: () => null }));

import { Orders } from './Orders';

const renderPage = () =>
  render(
    <MemoryRouter>
      <Orders />
    </MemoryRouter>,
  );

const checkboxes = () => screen.getAllByRole('checkbox', { name: /(select row|seleccionar fila)/i });

beforeEach(() => {
  bulkCancel.mockReset();
  bulkAssign.mockReset();
  stop.mockReset();
  busy.cancel = false;
  notifyError.mockReset();
  notifySuccess.mockReset();
});
afterEach(cleanup);

describe('Orders: resumen analítico y selección múltiple', () => {
  it('muestra el resumen por estado con la cantidad de cada uno', () => {
    renderPage();
    const summary = screen.getByRole('list', { name: 'Pedidos por estado' });
    expect(within(summary).getByText('Pendiente').parentElement).toHaveTextContent('1');
    expect(within(summary).getByText('Entregado').parentElement).toHaveTextContent('1');
  });

  it('un pedido entregado no se puede marcar; los demás sí, y aparece la barra con la cantidad', () => {
    renderPage();
    const boxes = checkboxes();
    expect(boxes[2]).toBeDisabled();
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    expect(screen.getByText('2 pedidos seleccionados')).toBeInTheDocument();
  });

  it('cancelar en lote lista lo que afecta, pide el motivo y manda un solo lote; quedan marcados los que fallaron o no se procesaron', async () => {
    bulkCancel.mockImplementation((_vars, options) =>
      options.onSuccess({
        done: ['aaaaaaaa-1'],
        skipped: [],
        failed: [{ id: 'bbbbbbbb-2', message: 'Transición inválida' }],
        notRun: [],
      }),
    );
    renderPage();
    fireEvent.click(checkboxes()[0]);
    fireEvent.click(checkboxes()[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedidos' }));

    const dialog = screen.getByRole('dialog', { name: 'Cancelar 2 pedidos' });
    expect(within(dialog).getByText(/Se van a afectar \(2\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Ana Pérez/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Beto Gómez/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Motivo (opcional)'), { target: { value: 'Sin stock' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar 2 pedidos' }));

    expect(bulkCancel).toHaveBeenCalledOnce();
    expect(bulkCancel.mock.calls[0][0]).toEqual({ ids: ['aaaaaaaa-1', 'bbbbbbbb-2'], body: { reason: 'Sin stock' } });
    // El modal se cierra al confirmar y sólo queda marcado el que falló, para reintentar.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('1 pedido seleccionado')).toBeInTheDocument();
  });

  it('asignar en lote lista y manda sólo los pedidos que admiten chofer (no los reservados)', () => {
    renderPage();
    fireEvent.click(checkboxes()[0]);
    fireEvent.click(checkboxes()[3]);
    fireEvent.click(screen.getByRole('button', { name: 'Asignar chofer' }));
    const dialog = screen.getByRole('dialog', { name: 'Asignación manual' });
    expect(within(dialog).getByText(/Se van a afectar \(1\)/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Diego Sosa/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('radio'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    expect(bulkAssign.mock.calls[0][0]).toEqual({ ids: ['aaaaaaaa-1'], deliveryId: 'd-1' });
  });

  it('asignar con pedidos asignables de más de una distribuidora avisa y no abre el modal', () => {
    renderPage();
    fireEvent.click(checkboxes()[0]);
    fireEvent.click(checkboxes()[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Asignar chofer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(notifyError.mock.calls[0][0].message).toContain('más de una distribuidora');
    expect(bulkAssign).not.toHaveBeenCalled();
  });

  it('la distribuidora sale sólo de los asignables: un reservado de otra empresa no estorba', () => {
    renderPage();
    fireEvent.click(checkboxes()[0]);
    fireEvent.click(checkboxes()[3]);
    fireEvent.click(screen.getByRole('button', { name: 'Asignar chofer' }));
    expect(notifyError).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Asignación manual' })).toBeInTheDocument();
  });

  it('cambiar de pestaña, buscar o paginar suelta la selección: no se actúa sobre filas que no se ven', () => {
    renderPage();
    fireEvent.click(checkboxes()[0]);
    expect(screen.getByText('1 pedido seleccionado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Pendiente/ }));
    expect(screen.queryByText(/seleccionados?$/)).not.toBeInTheDocument();

    fireEvent.click(checkboxes()[0]);
    fireEvent.change(screen.getByPlaceholderText(/Cliente, teléfono/), { target: { value: 'ana' } });
    expect(screen.queryByText(/seleccionados?$/)).not.toBeInTheDocument();
  });

  it('mientras corre el lote la barra muestra "Detener", que corta las filas que faltan', () => {
    busy.cancel = true;
    renderPage();
    fireEvent.click(checkboxes()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Detener' }));
    expect(stop).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Cancelar pedidos' })).toBeDisabled();
  });
});
