import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../services/api/errors';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../../../../services/queries/orders', () => ({ useOrderStatusHistory: () => state.value }));

import { OrderHistoryCard } from './OrderHistoryCard';

afterEach(cleanup);

describe('OrderHistoryCard', () => {
  it('dibuja las transiciones y las anotaciones reales del back', () => {
    state.value = {
      isPending: false,
      isError: false,
      data: [
        {
          id: 'a',
          fromStatus: null,
          toStatus: 'pending',
          isNote: false,
          reason: null,
          changedAt: '2026-10-01T13:00:00.000Z',
          changedBy: null,
        },
        {
          id: 'b',
          fromStatus: 'pending',
          toStatus: 'cancelled',
          isNote: false,
          reason: 'Pidió otra fecha',
          changedAt: '2026-10-01T14:00:00.000Z',
          changedBy: { userId: 'u', role: 'admin', fullName: 'Marta Ruiz' },
        },
        {
          id: 'c',
          fromStatus: 'cancelled',
          toStatus: 'cancelled',
          isNote: true,
          reason: 'Devolución pendiente',
          changedAt: '2026-10-01T15:00:00.000Z',
          changedBy: null,
        },
      ],
    };
    render(<OrderHistoryCard orderId="o-1" />);
    expect(screen.getByText('Pedido creado')).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getByText('Administrador: Marta Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Motivo: Pidió otra fecha')).toBeInTheDocument();
    expect(screen.getByText('Anotación')).toBeInTheDocument();
    expect(screen.getByText('Devolución pendiente')).toBeInTheDocument();
  });

  it('sin empresa (400 por falta de distribuidora) lo explica, sin historial inventado', () => {
    state.value = {
      isPending: false,
      isError: true,
      error: new ApiError(400, ['Esta acción es de una empresa: la hace un administrador de esa empresa']),
      refetch: vi.fn(),
    };
    render(<OrderHistoryCard orderId="o-1" />);
    expect(screen.getByText('El historial es de una empresa: lo ve su administrador')).toBeInTheDocument();
    expect(screen.queryByText(/No se pudo cargar/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(screen.queryByText('Pedido creado')).not.toBeInTheDocument();
  });

  it('si falla la carga lo dice y deja reintentar', () => {
    state.value = { isPending: false, isError: true, error: new Error('boom'), refetch: vi.fn() };
    render(<OrderHistoryCard orderId="o-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el historial del pedido');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
