import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Customer, Order } from '../../../../services/api/types';

const permissions = vi.fn();
const search = vi.fn();
vi.mock('../../../../hooks', () => ({
  usePermissions: () => permissions() as unknown,
  useDebounce: <T,>(value: T) => value,
}));
vi.mock('../../../../services/queries/globalSearch', () => ({
  MIN_SEARCH_LENGTH: 2,
  useGlobalSearch: (term: string, enabled: boolean) => search(term, enabled) as unknown,
}));

import { SearchDialog } from './SearchDialog';

const EMPTY = { orders: [], customers: [], deliveries: [], cars: [], isLoading: false };
const ORDER = {
  order_id: 'abcdef123456',
  status: 'pending',
  total_amount: 1500,
  customer: { full_name: 'Emilia Villalba' },
} as unknown as Order;
const CUSTOMER = { customer_id: 'c1', user: { full_name: 'Emilia Villalba' } } as unknown as Customer;

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const renderDialog = (onClose = vi.fn()) =>
  render(
    <MemoryRouter>
      <SearchDialog open onClose={onClose} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SearchDialog', () => {
  it('muestra los resultados agrupados por tipo y navega con flechas y Enter', () => {
    permissions.mockReturnValue({ isSuperAdmin: false, needsDistributor: false });
    search.mockReturnValue({ ...EMPTY, orders: [ORDER], customers: [CUSTOMER] });
    const onClose = vi.fn();
    renderDialog(onClose);

    expect(screen.getByRole('group', { name: 'Pedidos' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Clientes' })).toBeInTheDocument();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'emilia' } });
    expect(search).toHaveBeenLastCalledWith('emilia', true);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('where')).toHaveTextContent('/customers/details/c1');
    expect(onClose).toHaveBeenCalled();
  });

  it('con una sola pantalla posible, un clic la abre', () => {
    permissions.mockReturnValue({ isSuperAdmin: false, needsDistributor: false });
    search.mockReturnValue(EMPTY);
    renderDialog();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zonas' } });
    fireEvent.click(screen.getByRole('option', { name: /Zonas de cobertura/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/coverage-zones');
  });

  it('sin resultados lo dice', () => {
    permissions.mockReturnValue({ isSuperAdmin: false, needsDistributor: false });
    search.mockReturnValue(EMPTY);
    renderDialog();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzz' } });
    expect(screen.getByText('Sin resultados para «zzzz»')).toBeInTheDocument();
  });

  it('el administrador general sin distribuidora también busca datos', () => {
    permissions.mockReturnValue({ isSuperAdmin: true, needsDistributor: true });
    search.mockReturnValue({ ...EMPTY, orders: [ORDER] });
    renderDialog();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'emilia' } });
    expect(search).toHaveBeenLastCalledWith('emilia', true);
    expect(screen.queryByText(/elegí una distribuidora/)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pedidos' })).toBeInTheDocument();
  });

  it('el diálogo tiene nombre accesible y el campo toma el foco', () => {
    permissions.mockReturnValue({ isSuperAdmin: false, needsDistributor: false });
    search.mockReturnValue(EMPTY);
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Buscador global' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('combobox'));
  });
});
