import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);
import type { Order } from '../../../services/api/types';
import type { AvailablePool } from '../useAvailablePool';
import { AvailableOrdersPool } from './AvailableOrdersPool';

const order = (id: string): Order =>
  ({
    order_id: id,
    created_at: '2026-10-01T12:00:00Z',
    total_amount: 1000,
    customer: { full_name: `Cliente ${id}` },
    delivery_address: { street: `Calle ${id}` },
  }) as unknown as Order;

const basePool = (overrides: Partial<AvailablePool> = {}): AvailablePool => ({
  search: '',
  setSearch: vi.fn(),
  page: 0,
  setPage: vi.fn(),
  orders: [],
  total: 0,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

const renderPool = (pool: AvailablePool) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AvailableOrdersPool pool={pool} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('AvailableOrdersPool', () => {
  it('cargando: esqueleto, sin afirmar que no hay pedidos', () => {
    renderPool(basePool({ isLoading: true }));
    expect(screen.getByRole('status', { name: 'Cargando datos' })).toBeInTheDocument();
    expect(screen.queryByText('No hay pedidos disponibles')).not.toBeInTheDocument();
  });

  it('error: mensaje con reintentar, sin afirmar que no hay pedidos', () => {
    const refetch = vi.fn();
    renderPool(basePool({ isError: true, error: new Error('boom'), refetch }));
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    expect(screen.queryByText('No hay pedidos disponibles')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('vacío real y vacío por búsqueda se distinguen', () => {
    const { unmount } = renderPool(basePool());
    expect(screen.getByText('No hay pedidos disponibles')).toBeInTheDocument();
    unmount();
    renderPool(basePool({ search: 'zzz' }));
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('con más de una página ofrece paginar y no deja pedidos inaccesibles', () => {
    const setPage = vi.fn();
    renderPool(basePool({ orders: [order('o1')], total: 45, setPage }));
    expect(screen.getByText(/Página 1 de 3 · 45 pedidos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it('una sola página no muestra paginación', () => {
    renderPool(basePool({ orders: [order('o1')], total: 1 }));
    expect(screen.getByText('Cliente o1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
  });
});
