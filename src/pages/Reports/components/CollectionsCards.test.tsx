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
        pendingTransfer: { totalOrders: 5, totalAmount: 70000 },
        notReceivedTransfer: { totalOrders: 7, totalAmount: 90000 },
        pendingRefund: { totalOrders: 0, totalAmount: 0 },
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

  it('muestra las transferencias viejas sin confirmar y las no recibidas con cantidad e importe', () => {
    state.value = {
      isLoading: false,
      data: {
        pendingCash: { totalOrders: 0, totalAmount: 0 },
        unpaid: { totalOrders: 0, totalAmount: 0 },
        writtenOff: { totalOrders: 0, totalAmount: 0 },
        pendingTransfer: { totalOrders: 4, totalAmount: 64000 },
        notReceivedTransfer: { totalOrders: 1, totalAmount: 9300 },
        pendingRefund: { totalOrders: 0, totalAmount: 0 },
      },
    };
    render(<CollectionsCards range={RANGE} />);
    expect(screen.getByText('Transferencias sin confirmar (pedidos viejos)')).toBeInTheDocument();
    expect(screen.getByText('4 pedidos')).toBeInTheDocument();
    expect(screen.getByText(/64\.000/)).toBeInTheDocument();
    expect(screen.queryByText('Requiere confirmación')).not.toBeInTheDocument();
    expect(screen.getByText('Transferencias no recibidas (pedidos viejos)')).toBeInTheDocument();
    expect(screen.getByText('1 pedido')).toBeInTheDocument();
    expect(screen.getByText(/9\.300/)).toBeInTheDocument();
  });

  it('sin transferencias viejas no muestra esas tarjetas', () => {
    state.value = {
      isLoading: false,
      data: {
        pendingCash: { totalOrders: 0, totalAmount: 0 },
        unpaid: { totalOrders: 0, totalAmount: 0 },
        writtenOff: { totalOrders: 0, totalAmount: 0 },
        pendingTransfer: { totalOrders: 0, totalAmount: 0 },
        notReceivedTransfer: { totalOrders: 0, totalAmount: 0 },
        pendingRefund: { totalOrders: 0, totalAmount: 0 },
      },
    };
    render(<CollectionsCards range={RANGE} />);
    expect(screen.queryByText(/Transferencias/)).not.toBeInTheDocument();
  });

  it('muestra el reintegro pendiente y avisa que la devolución es de la distribuidora', () => {
    state.value = {
      isLoading: false,
      data: {
        pendingCash: { totalOrders: 0, totalAmount: 0 },
        unpaid: { totalOrders: 0, totalAmount: 0 },
        writtenOff: { totalOrders: 0, totalAmount: 0 },
        pendingTransfer: { totalOrders: 0, totalAmount: 0 },
        notReceivedTransfer: { totalOrders: 0, totalAmount: 0 },
        pendingRefund: { totalOrders: 8, totalAmount: 1024700 },
      },
    };
    render(<CollectionsCards range={RANGE} />);
    expect(screen.getByText('Reintegro pendiente')).toBeInTheDocument();
    expect(screen.getByText('8 pedidos')).toBeInTheDocument();
    expect(screen.getByText(/1\.024\.700/)).toBeInTheDocument();
    expect(screen.getByText('Devolver al cliente')).toBeInTheDocument();
    expect(screen.getByText(/el sistema no gestiona la devolución/)).toBeInTheDocument();
    expect(screen.getByText(/según su última modificación dentro del rango/)).toBeInTheDocument();
  });

  it('sin impagos no pide resolución', () => {
    state.value = {
      isLoading: false,
      data: {
        pendingCash: { totalOrders: 0, totalAmount: 0 },
        unpaid: { totalOrders: 0, totalAmount: 0 },
        writtenOff: { totalOrders: 0, totalAmount: 0 },
        pendingTransfer: { totalOrders: 0, totalAmount: 0 },
        notReceivedTransfer: { totalOrders: 0, totalAmount: 0 },
        pendingRefund: { totalOrders: 0, totalAmount: 0 },
      },
    };
    render(<CollectionsCards range={RANGE} />);
    expect(screen.queryByText('Requiere resolución')).toBeNull();
    expect(screen.queryByText('Requiere confirmación')).toBeNull();
  });

  it('si falla muestra el error en vez de ceros', () => {
    state.value = { isLoading: false, error: new Error('boom'), refetch: vi.fn() };
    render(<CollectionsCards range={RANGE} />);
    expect(screen.queryByText('Efectivo por confirmar')).toBeNull();
  });
});
