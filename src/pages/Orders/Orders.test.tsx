import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../services/api/types';

type BulkCall = [vars: unknown, options: { onSuccess: (result: unknown) => void }];
const bulkCancel = vi.hoisted(() => vi.fn<BulkCall, void>());
const bulkAssign = vi.hoisted(() => vi.fn<BulkCall, void>());
const notifyError = vi.hoisted(() => vi.fn<[Error], void>());
const notifySuccess = vi.hoisted(() => vi.fn<[string], void>());
const stop = vi.hoisted(() => vi.fn());
const useOrdersSpy = vi.hoisted(() => vi.fn());
const busy = vi.hoisted(() => ({ cancel: false }));
const HINT = 'Elegí una distribuidora en «Ver como» para operar';
const WRITE_HINT = 'Elegí una distribuidora con «Ver como» para crear';
const permissions = vi.hoisted(() => ({ operate: true }));

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
    order_items: [{ quantity: 2, subtotal: 1000, gas_cylinder: { type: 'Garrafa 10 kg' } }],
  }) as unknown as Order;

const ORDERS = [
  order('aaaaaaaa-1', 'pending', 'Ana Pérez'),
  { ...order('bbbbbbbb-2', 'accepted', 'Beto Gómez'), distributor_id: 'dist-2' } as Order,
  order('cccccccc-3', 'delivered', 'Carla Ruiz'),
  { ...order('dddddddd-4', 'reserved', 'Diego Sosa'), distributor_id: 'dist-3' } as Order,
];

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    needsDistributor: !permissions.operate,
    canWrite: permissions.operate,
    writeHint: permissions.operate ? undefined : WRITE_HINT,
    canOperate: permissions.operate,
    operateHint: permissions.operate ? undefined : HINT,
  }),
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
    useOrders: (...args: unknown[]) => {
      useOrdersSpy(...args);
      return { data: { orders: ORDERS, total: 4 }, isFetching: false };
    },
    useOrderStatusCounts: () => ({
      counts: { reserved: 0, pending: 1, accepted: 1, out_for_delivery: 0, delivered: 1, cancelled: 0 },
      total: 3,
    }),
    useOrder: () => ({ data: undefined, error: null, refetch: vi.fn() }),
    useAssignOrderDelivery: () => idle,
    useUpdateOrder: () => idle,
    useCancelOrder: () => idle,
    useBulkCancelOrders: () => ({ mutate: bulkCancel, isPending: busy.cancel, stop }),
    useBulkAssignOrders: () => ({ mutate: bulkAssign, isPending: false, stop }),
    useEnabledDeliveries: () => ({
      data: {
        rows: [
          {
            delivery_id: 'd-1',
            isEnabled: true,
            validated: true,
            isAvailable: true,
            user: { full_name: 'Chofer Uno', phone_number: '111' },
          },
        ],
        total: 1,
      },
      isPending: false,
    }),
  };
});

vi.mock('./components/EditOrderModal', () => ({ EditOrderModal: () => null }));

import { useServerExport } from '../../hooks/useServerExport';
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
  permissions.operate = true;
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
    fireEvent.change(within(dialog).getByLabelText(/^Motivo/), { target: { value: 'Sin stock' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar 2 pedidos' }));

    expect(bulkCancel).toHaveBeenCalledOnce();
    expect(bulkCancel.mock.calls[0][0]).toEqual({ ids: ['aaaaaaaa-1', 'bbbbbbbb-2'], body: { reason: 'Sin stock' } });
    // El modal se cierra al confirmar y sólo queda marcado el que falló, para reintentar.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('1 pedido seleccionado')).toBeInTheDocument();
  });

  it('cancelar sin motivo no manda nada y deja el error visible', () => {
    renderPage();
    fireEvent.click(checkboxes()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedidos' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar pedido' });
    const confirm = within(dialog).getByRole('button', { name: 'Cancelar pedido' });
    fireEvent.mouseDown(confirm);
    fireEvent.click(confirm);
    expect(bulkCancel).not.toHaveBeenCalled();
    expect(within(dialog).getByText('Escribí el motivo')).toBeInTheDocument();
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

describe('Orders: administrador general sin distribuidora elegida', () => {
  beforeEach(() => {
    permissions.operate = false;
  });

  it('las acciones en lote quedan bloqueadas con su explicación y no abren nada', () => {
    renderPage();
    fireEvent.click(checkboxes()[0]);
    for (const name of ['Asignar chofer', 'Cancelar pedidos']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('title', HINT);
      fireEvent.click(button);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('el pedido telefónico (POST /orders) también queda bloqueado', () => {
    renderPage();
    const button = screen.getByRole('button', { name: /Pedido telefónico/ });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', WRITE_HINT);
  });
});

describe('Orders: filtros en la URL y exportación', () => {
  const Search = () => <output data-testid="search">{useLocation().search}</output>;

  it('elegir un estado queda en la URL y volver a «Todos» la deja limpia', () => {
    render(
      <MemoryRouter>
        <Orders />
        <Search />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Pendiente/ }));
    expect(screen.getByTestId('search')).toHaveTextContent('?status=pending');
    fireEvent.click(screen.getByRole('tab', { name: /Todos/ }));
    expect(screen.getByTestId('search')).toHaveTextContent('');
  });

  it('un estado inválido en la URL se ignora', () => {
    render(
      <MemoryRouter initialEntries={['/orders?status=inventado']}>
        <Orders />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('group', { name: 'Filtros activos' })).not.toBeInTheDocument();
    expect(useOrdersSpy).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ status: undefined }));
    expect(screen.getByRole('tab', { name: /Todos/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('ofrece exportar todo lo filtrado (CSV y Excel) y, sólo con filas marcadas, la selección', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    expect(screen.getByRole('menuitem', { name: 'Exportar CSV' })).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'Exportar Excel' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Exportar selección' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    fireEvent.click(checkboxes()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    expect(screen.getByRole('menuitem', { name: 'Exportar selección' })).not.toHaveAttribute('aria-disabled', 'true');
  });
});

describe('Orders: panel lateral', () => {
  it('abrir un pedido muestra su detalle en un panel con el enlace a la ficha, sin salir del listado', () => {
    renderPage();
    fireEvent.click(screen.getByText('Ana Pérez'));
    const drawer = screen.getByRole('dialog', { name: /Pedido #/ });
    expect(within(drawer).getByText(/2 × Garrafa 10 kg/)).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: /Abrir ficha completa/ })).toHaveAttribute(
      'href',
      '/orders/aaaaaaaa-1',
    );
    expect(screen.getByRole('list', { name: 'Pedidos por estado', hidden: true })).toBeInTheDocument();
  });

  it('«Asignar chofer» del panel abre la asignación de ese pedido y cierra el panel', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Ana Pérez'));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: /Pedido #/ })).getByRole('button', { name: 'Asignar chofer' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Pedido #/ })).not.toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('un pedido entregado no ofrece asignar chofer en el panel', () => {
    renderPage();
    fireEvent.click(screen.getByText('Carla Ruiz'));
    expect(
      within(screen.getByRole('dialog', { name: /Pedido #/ })).queryByRole('button', { name: /chofer/ }),
    ).not.toBeInTheDocument();
  });

  it('el exporte manda los mismos filtros que el listado', () => {
    render(
      <MemoryRouter initialEntries={['/orders?status=cancelled']}>
        <Orders />
      </MemoryRouter>,
    );
    const exporte = vi.mocked(useServerExport).mock.lastCall?.[0];
    expect(exporte?.resource).toBe('pedidos');
    expect(exporte?.params?.status).toBe('cancelled');
  });
});
