import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../../../services/api/types';
import { usePersonPhoto } from '../../../services/queries/peoplePhotos';

// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: Order[]; columns: GridColDef<Order>[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.order_id}>
          {columns.map((column) => (
            <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<Order>)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ needsDistributor: false }),
}));
const mpState = vi.hoisted(() => ({ ids: [] as string[][], data: undefined as Map<string, unknown> | undefined }));
vi.mock('../../../services/queries/orders', () => ({
  useOrderPaymentStates: (ids: string[]) => {
    mpState.ids.push(ids);
    return { data: mpState.data };
  },
}));

import { OrdersTable } from './OrdersTable';

afterEach(() => {
  cleanup();
  mpState.ids = [];
  mpState.data = undefined;
});

const order = (id: string, over: Partial<Order>) =>
  ({
    order_id: `${id}-000000`,
    status: 'pending',
    payment_method: 'cash',
    delivery_id: null,
    ...over,
  }) as unknown as Order;

const renderTable = (rows: Order[], onEdit = vi.fn(), onCancel = vi.fn()) =>
  render(
    <OrdersTable
      rows={rows}
      total={rows.length}
      loading={false}
      pagination={{ page: 0, pageSize: 10 }}
      onPaginationChange={vi.fn()}
      onView={vi.fn()}
      onAssign={vi.fn()}
      onEdit={onEdit}
      onCancel={onCancel}
    />,
  );

describe('OrdersTable: editar y cancelar', () => {
  it('un pedido pendiente sin chofer ni pago online se edita y se cancela', () => {
    const onEdit = vi.fn();
    const onCancel = vi.fn();
    renderTable([order('aaaaaa', {})], onEdit, onCancel);
    fireEvent.click(screen.getByRole('button', { name: /^Editar pedido/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Más acciones de pedido/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Cancelar/ }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('con chofer o checkout de MercadoPago la edición se ve apagada y explica el motivo, sin llamar a la API', () => {
    const onEdit = vi.fn();
    renderTable([order('bbbbbb', { delivery_id: 'd-1' }), order('cccccc', { payment_url: 'https://mp/x' })], onEdit);
    const blocked = screen.getAllByRole('button', { name: /no disponible/ });
    expect(blocked.map((b) => b.getAttribute('aria-label'))).toEqual([
      expect.stringContaining('ya tiene chofer asignado'),
      expect.stringContaining('MercadoPago'),
    ]);
    blocked.forEach((b) => fireEvent.click(b));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('un pedido con pago «online» sin checkout se puede intentar editar (puede ser transferencia)', () => {
    renderTable([order('eeeeee', { payment_method: 'online' })]);
    expect(screen.getByRole('button', { name: /^Editar pedido/ })).not.toHaveAttribute('aria-disabled');
  });

  it('un pedido cancelado no se vuelve a cancelar', () => {
    renderTable([order('dddddd', { status: 'cancelled' })]);
    const more = screen.queryByRole('button', { name: /^Más acciones de pedido/ });
    if (more) fireEvent.click(more);
    expect(screen.queryByRole('menuitem', { name: /^Cancelar/ })).toBeNull();
  });
});

describe('OrdersTable: sin distribuidora elegida', () => {
  it('sin asignar ni cancelar no se ofrecen esas acciones; ver sí', () => {
    render(
      <OrdersTable
        rows={[order('aaaaaa', {})]}
        total={1}
        loading={false}
        pagination={{ page: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        onView={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /^Ver pedido/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Más acciones de pedido/ })).toBeNull();
  });

  it('con los dos manejadores se ofrecen cancelar y más acciones (asignar)', () => {
    renderTable([order('aaaaaa', {})]);
    fireEvent.click(screen.getByRole('button', { name: /Más acciones de pedido/ }));
    expect(screen.getByRole('menuitem', { name: /^Cancelar/ })).toBeInTheDocument();
  });
});

describe('OrdersTable: estado de cobro', () => {
  it('cada pedido muestra su cobro con la etiqueta en castellano', () => {
    renderTable([
      order('a1', { paymentStatus: 'pending' }),
      order('a2', { paymentStatus: 'paid' }),
      order('a3', { paymentStatus: 'unpaid' }),
      order('a4', { paymentStatus: 'written_off' }),
    ]);
    for (const text of ['Pendiente', 'Cobrado', 'Impago', 'Pérdida']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
  });

  it('una transferencia que no llegó se muestra «No recibida»; otro medio rechazado, «Rechazado»', () => {
    renderTable([
      order('b1', { paymentStatus: 'failed', paymentMethodDetail: 'transfer' }),
      order('b2', { paymentStatus: 'failed', paymentMethodDetail: 'mercadopago' }),
    ]);
    expect(screen.getAllByText('No recibida')).toHaveLength(1);
    expect(screen.getAllByText('Rechazado')).toHaveLength(1);
  });
});

describe('OrdersTable: columnas', () => {
  it('son cinco: el chofer va bajo la entrega y el cobro bajo el estado', () => {
    const { container } = renderTable([
      order('f1', { delivery_name: 'Juan Pérez', paymentStatus: 'paid', status: 'pending' }),
      order('f2', {}),
    ]);
    const rowCells = container.firstElementChild?.firstElementChild?.children;
    expect(rowCells).toHaveLength(5);
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Cobrado')).toBeInTheDocument();
    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
  });
});

describe('OrdersTable: chofer sin asignar', () => {
  it('«Sin asignar» sólo aparece mientras el pedido sigue abierto', () => {
    renderTable([order('g1', { status: 'pending' })]);
    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
    cleanup();
    renderTable([order('g2', { status: 'cancelled' }), order('g3', { status: 'delivered' })]);
    expect(screen.queryByText('Sin asignar')).toBeNull();
  });
});

describe('OrdersTable: fotos de las personas', () => {
  it('el cliente se pide por user_id y el chofer por delivery_id', () => {
    vi.mocked(usePersonPhoto).mockClear();
    renderTable([
      order('aaaaaa', {
        customer: { user_id: 'user-1', full_name: 'Ana Pérez' },
        delivery_id: 'deliv-1',
        delivery_name: 'Beto Gómez',
      } as unknown as Partial<Order>),
    ]);
    expect(usePersonPhoto).toHaveBeenCalledWith({ kind: 'user', id: 'user-1' });
    expect(usePersonPhoto).toHaveBeenCalledWith({ kind: 'delivery', id: 'deliv-1' });
    expect(usePersonPhoto).not.toHaveBeenCalledWith({ kind: 'user', id: 'deliv-1' });
  });
});

describe('OrdersTable: pago de Mercado Pago', () => {
  const mp = (id: string, over: Partial<Order> = {}) =>
    order(id, { paymentMethodDetail: 'mercadopago', paymentStatus: 'failed', ...over } as Partial<Order>);

  it('pide el estado del pago sólo de los pedidos de Mercado Pago de la página', () => {
    renderTable([mp('a'), order('b', { paymentMethodDetail: 'cash' } as Partial<Order>)]);
    expect(mpState.ids.at(-1)).toEqual(['a-000000']);
  });

  it('muestra el texto del back con el motivo, junto al estado del cobro', () => {
    mpState.data = new Map([
      [
        'a-000000',
        {
          orderId: 'a-000000',
          paymentStatus: 'rejected',
          paymentStatusLabel: 'Fondos insuficientes en el medio de pago',
        },
      ],
    ]);
    renderTable([mp('a')]);
    expect(screen.getByText('Fondos insuficientes en el medio de pago')).toBeInTheDocument();
  });

  it('un reclamo o un contracargo se marcan con el texto del back', () => {
    mpState.data = new Map([
      [
        'a-000000',
        { orderId: 'a-000000', paymentStatus: 'in_mediation', paymentStatusLabel: 'Reclamo en curso sobre el pago' },
      ],
      [
        'b-000000',
        { orderId: 'b-000000', paymentStatus: 'charged_back', paymentStatusLabel: 'Contracargo sobre el pago' },
      ],
    ]);
    renderTable([mp('a'), mp('b')]);
    expect(screen.getByText('Reclamo en curso sobre el pago')).toBeInTheDocument();
    expect(screen.getByText('Contracargo sobre el pago')).toBeInTheDocument();
  });

  it('sin respuesta todavía (o sin pagos de Mercado Pago) no dibuja nada de más', () => {
    mpState.data = new Map([['a-000000', { orderId: 'a-000000', paymentStatus: null, paymentStatusLabel: null }]]);
    renderTable([mp('a')]);
    expect(screen.queryByText('Pago en revisión')).not.toBeInTheDocument();
  });
});
