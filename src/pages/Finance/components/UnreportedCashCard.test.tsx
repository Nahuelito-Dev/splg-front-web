import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EfectivoSinRendir } from '../../../services/api/types';

const unreported = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/finance', () => ({
  useUnreportedCash: () => unreported() as unknown,
}));

import { UnreportedCashCard } from './UnreportedCashCard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const DATA: EfectivoSinRendir = {
  minHours: 24,
  enabled: true,
  totalAmount: 62000,
  totalOrders: 4,
  items: [
    {
      deliveryId: 'a',
      driverName: 'Juan Pérez',
      orders: 3,
      amount: 54000,
      oldestDeliveredAt: '2026-11-20T15:00:00.000Z',
      ageHours: 51,
      overdue: true,
    },
    {
      deliveryId: 'b',
      driverName: 'Ana Gómez',
      orders: 1,
      amount: 8000,
      oldestDeliveredAt: '2026-11-22T15:00:00.000Z',
      ageHours: 5,
      overdue: false,
    },
  ],
};

describe('UnreportedCashCard', () => {
  it('lista el efectivo por chofer con monto, pedidos y antigüedad, y el total arriba', () => {
    unreported.mockReturnValue({ data: DATA, error: null, refetch: vi.fn() });
    render(<UnreportedCashCard />);
    expect(screen.getByText('Efectivo cobrado y sin rendir')).toBeInTheDocument();
    expect(screen.getByText(/\$ 62\.000 en 4 pedidos entregados/)).toBeInTheDocument();
    expect(screen.getByText(/Se avisa al cierre del día lo que lleva más de 24 h/)).toBeInTheDocument();
    const filas = within(screen.getByRole('list', { name: 'Efectivo sin rendir por chofer' })).getAllByRole('listitem');
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByText('Juan Pérez')).toBeInTheDocument();
    expect(within(filas[0]).getByText('$ 54.000')).toBeInTheDocument();
    expect(within(filas[0]).getByText('3 pedidos', { exact: false })).toBeInTheDocument();
    expect(within(filas[0]).getByText('Hace 2 d 3 h')).toBeInTheDocument();
    expect(within(filas[1]).getByText('1 pedido', { exact: false })).toBeInTheDocument();
    expect(within(filas[1]).getByText('Hace 5 h')).toBeInTheDocument();
  });

  it('con el aviso apagado no dice que se avisa, y con un solo pedido concuerda en singular', () => {
    unreported.mockReturnValue({
      data: { ...DATA, enabled: false, totalOrders: 1, totalAmount: 8000, items: [DATA.items[1]] },
      error: null,
      refetch: vi.fn(),
    });
    render(<UnreportedCashCard />);
    expect(screen.getByText(/\$ 8\.000 en 1 pedido entregado que ninguna rendición tomó/)).toBeInTheDocument();
    expect(screen.getByText(/El aviso del cierre del día está apagado/)).toBeInTheDocument();
    expect(screen.queryByText(/Se avisa al cierre/)).not.toBeInTheDocument();
  });

  it('sin efectivo pendiente no se dibuja', () => {
    unreported.mockReturnValue({
      data: { ...DATA, items: [], totalAmount: 0, totalOrders: 0 },
      error: null,
      refetch: vi.fn(),
    });
    const { container } = render(<UnreportedCashCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('si la consulta falla avisa con reintento en vez de callar', () => {
    unreported.mockReturnValue({ data: undefined, error: new Error('caído'), refetch: vi.fn() });
    render(<UnreportedCashCard />);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
