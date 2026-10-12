import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../../../services/queries/reports', () => ({ useCollections: () => state.value }));

import { CollectionsCards } from './CollectionsCards';

afterEach(cleanup);
const RANGE = { from: '2026-10-01', to: '2026-10-11' };

describe('CollectionsCards', () => {
  it('muestra efectivo por confirmar, impagos y pérdidas con cantidad e importe', () => {
    state.value = {
      isLoading: false,
      data: {
        pendingCash: { totalOrders: 3, totalAmount: 30000 },
        unpaid: { totalOrders: 1, totalAmount: 12500 },
        writtenOff: { totalOrders: 2, totalAmount: 8000 },
      },
    };
    render(<CollectionsCards range={RANGE} />);
    expect(screen.getByText('Efectivo por confirmar')).toBeInTheDocument();
    expect(screen.getByText('3 pedidos')).toBeInTheDocument();
    expect(screen.getByText('1 pedido')).toBeInTheDocument();
    expect(screen.getByText('2 pedidos')).toBeInTheDocument();
    expect(screen.getByText('Requiere resolución')).toBeInTheDocument();
    expect(screen.getByText(/12\.500/)).toBeInTheDocument();
  });

  it('sin impagos no pide resolución', () => {
    state.value = {
      isLoading: false,
      data: {
        pendingCash: { totalOrders: 0, totalAmount: 0 },
        unpaid: { totalOrders: 0, totalAmount: 0 },
        writtenOff: { totalOrders: 0, totalAmount: 0 },
      },
    };
    render(<CollectionsCards range={RANGE} />);
    expect(screen.queryByText('Requiere resolución')).toBeNull();
  });

  it('si falla muestra el error en vez de ceros', () => {
    state.value = { isLoading: false, error: new Error('boom'), refetch: vi.fn() };
    render(<CollectionsCards range={RANGE} />);
    expect(screen.queryByText('Efectivo por confirmar')).toBeNull();
  });
});
