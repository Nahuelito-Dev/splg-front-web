import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Incident, Order } from '../../services/api/types';

const permissions = vi.hoisted(() => ({ canOperate: true }));
const modalProps = vi.hoisted(() => ({ last: null as unknown }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => navigate,
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => permissions,
}));
vi.mock('../../common/components/ui', async (importOriginal) => ({
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
vi.mock('../Orders/components/ResolveUnpaidModal', () => ({
  ResolveUnpaidModal: (props: { open: boolean; order: Order | null }) => {
    modalProps.last = props;
    return props.open ? <div role="dialog">Modal de {props.order?.order_id}</div> : null;
  },
}));

const ORDERS = [
  {
    order_id: 'aaaaaaaa-1',
    created_at: '2026-10-10T10:00:00Z',
    total_amount: 12500,
    customer: { full_name: 'Ana Pérez' },
    delivery_name: 'Chofer Uno',
  },
] as unknown as Order[];
const INCIDENTS = [
  {
    incident_id: 'inc-old',
    order_id: 'aaaaaaaa-1',
    type: 'unpaid_collection',
    status: 'resolved',
    createdAt: '2026-10-09T10:00:00Z',
  },
  {
    incident_id: 'inc-open',
    order_id: 'aaaaaaaa-1',
    type: 'unpaid_collection',
    status: 'open',
    createdAt: '2026-10-10T11:00:00Z',
  },
  {
    incident_id: 'inc-other',
    order_id: 'bbbbbbbb-2',
    type: 'other',
    status: 'open',
    createdAt: '2026-10-10T11:00:00Z',
  },
] as unknown as Incident[];

const useOrders = vi.hoisted(() => vi.fn<[unknown, { paymentStatus?: string }], unknown>());
vi.mock('../../services/queries/orders', () => ({ useOrders }));
const incidentsState = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const unpaidTotal = vi.hoisted(() => ({
  value: { data: { totalOrders: 1, totalAmount: 12500 } } as Record<string, unknown>,
}));
vi.mock('../../services/queries/reports', () => ({ useUnpaidTotal: () => unpaidTotal.value }));
vi.mock('../../services/queries/incidents', () => ({ useIncidents: () => incidentsState.value }));

import { UnpaidCollections } from './UnpaidCollections';

const renderPage = () =>
  render(
    <MemoryRouter>
      <UnpaidCollections />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  incidentsState.value = { data: INCIDENTS };
  permissions.canOperate = true;
  navigate.mockReset();
  unpaidTotal.value = { data: { totalOrders: 1, totalAmount: 12500 } };
});

incidentsState.value = { data: INCIDENTS };

describe('UnpaidCollections', () => {
  it('pide sólo los pedidos impagos y muestra cliente, chofer, incidencia y total', () => {
    useOrders.mockReturnValue({ data: { orders: ORDERS, total: 1 }, isFetching: false });
    renderPage();
    expect(useOrders.mock.calls[0][1]).toEqual({ paymentStatus: 'unpaid' });
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Chofer Uno')).toBeInTheDocument();
    expect(screen.getByText('Abierta')).toBeInTheDocument();
    expect(screen.getByText(/pedido impago/)).toBeInTheDocument();
  });

  it('muestra lo adeudado en total tal como lo calcula el back, no la suma de la página', () => {
    unpaidTotal.value = { data: { totalOrders: 4, totalAmount: 344000 } };
    useOrders.mockReturnValue({ data: { orders: ORDERS, total: 4 }, isFetching: false });
    renderPage();
    expect(screen.getByText(/344\.000 adeudados/)).toBeInTheDocument();
    expect(screen.queryByText(/en esta página/)).toBeNull();
  });

  it('«Resolver impago» abre el modal con el pedido', () => {
    useOrders.mockReturnValue({ data: { orders: ORDERS, total: 1 }, isFetching: false });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Resolver impago' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('aaaaaaaa-1');
    expect(modalProps.last).toMatchObject({ open: true });
  });

  it('sin distribuidora elegida no ofrece resolver', () => {
    permissions.canOperate = false;
    useOrders.mockReturnValue({ data: { orders: ORDERS, total: 1 }, isFetching: false });
    renderPage();
    expect(screen.queryByRole('button', { name: 'Resolver impago' })).toBeNull();
  });

  it('ver el pedido navega a su ficha', () => {
    useOrders.mockReturnValue({ data: { orders: ORDERS, total: 1 }, isFetching: false });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Ver pedido/ }));
    expect(navigate).toHaveBeenCalledWith('/orders/aaaaaaaa-1');
  });

  it('sin impagos lo dice', () => {
    useOrders.mockReturnValue({ data: { orders: [], total: 0 }, isFetching: false });
    renderPage();
    expect(screen.getByText(/pedidos impagos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolver impago' })).toBeNull();
  });
});

describe('UnpaidCollections en pantalla angosta', () => {
  it('muestra tarjetas con las acciones a la vista, sin grilla desplazable', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    try {
      useOrders.mockReturnValue({ data: { orders: ORDERS, total: 1 }, isFetching: false });
      renderPage();
      expect(screen.getByRole('list')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Resolver impago' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('aaaaaaaa-1');
      fireEvent.click(screen.getByRole('button', { name: 'Ver pedido' }));
      expect(navigate).toHaveBeenCalledWith('/orders/aaaaaaaa-1');
    } finally {
      window.matchMedia = original;
    }
  });
});

const withNarrowScreen = (run: () => void) => {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  try {
    run();
  } finally {
    window.matchMedia = original;
  }
};

describe('UnpaidCollections: paginación, carga y errores', () => {
  it('si la última página queda vacía después de resolver, vuelve a la anterior', () => {
    withNarrowScreen(() => {
      useOrders.mockImplementation((params) =>
        (params as { page: number }).page === 0
          ? { data: { orders: ORDERS, total: 11 }, isFetching: false }
          : { data: { orders: [], total: 11 }, isFetching: false },
      );
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
      expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
      expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument();
    });
  });

  it('la paginación no desaparece mientras haya impagos', () => {
    withNarrowScreen(() => {
      useOrders.mockReturnValue({ data: { orders: ORDERS, total: 1 }, isFetching: false });
      renderPage();
      expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument();
    });
  });

  it('mientras carga muestra un esqueleto y no «No hay cobros impagos»', () => {
    withNarrowScreen(() => {
      useOrders.mockReturnValue({ data: undefined, isFetching: true });
      renderPage();
      expect(screen.getByRole('status', { name: 'Cargando cobros impagos' })).toBeInTheDocument();
      expect(screen.queryByText('No hay cobros impagos')).toBeNull();
    });
  });

  it('si falla la carga de incidencias lo dice y no muestra «Sin incidencia»', () => {
    incidentsState.value = { data: undefined, isError: true, error: new Error('boom'), refetch: vi.fn() };
    useOrders.mockReturnValue({ data: { orders: ORDERS, total: 1 }, isFetching: false });
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las incidencias');
    expect(screen.getByText('No se pudo cargar la incidencia')).toBeInTheDocument();
    expect(screen.queryByText('Sin incidencia')).toBeNull();
  });
});
