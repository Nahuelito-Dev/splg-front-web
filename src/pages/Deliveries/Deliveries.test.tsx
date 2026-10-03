import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delivery } from '../../services/api/types';

const deliveriesQuery = vi.hoisted(() => vi.fn());

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true }),
}));
vi.mock('../../services/queries/deliveries', () => ({
  useDeliveries: (_page: unknown, _search: string, tab: string) => deliveriesQuery(tab) as unknown,
  useDeliveryStatusCounts: () => ({ all: 5, unvalidated: 2, enabled: 4, disabled: null, online: 1 }),
  useDeleteDelivery: () => ({ mutate: vi.fn() }),
  useValidateDelivery: () => ({ mutate: vi.fn() }),
  useInvalidateDelivery: () => ({ mutate: vi.fn() }),
}));
vi.mock('./components/DeliveryFormModal', () => ({ DeliveryFormModal: () => null }));
vi.mock('./components/FindDeliveryByUserModal', () => ({ FindDeliveryByUserModal: () => null }));

import { Deliveries } from './Deliveries';

afterEach(cleanup);

const Search = () => <output data-testid="search">{useLocation().search}</output>;

describe('Deliveries: pestañas con contador', () => {
  it('cada grupo muestra su cantidad; uno sin dato muestra un guion, nunca 0', () => {
    deliveriesQuery.mockReturnValue({ data: { rows: [] as Delivery[], total: 0 }, isFetching: false });
    render(
      <MemoryRouter>
        <Deliveries />
      </MemoryRouter>,
    );
    expect(screen.getByRole('tab', { name: 'Todos 5' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Por validar 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Deshabilitados –' })).toBeInTheDocument();
  });

  it('elegir "En línea" pide ese grupo, queda en la URL y se muestra como chip', () => {
    deliveriesQuery.mockReturnValue({ data: { rows: [] as Delivery[], total: 1 }, isFetching: false });
    render(
      <MemoryRouter>
        <Deliveries />
        <Search />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'En línea 1' }));
    expect(deliveriesQuery).toHaveBeenLastCalledWith('online');
    expect(screen.getByTestId('search')).toHaveTextContent('?status=online');
    expect(screen.getByRole('group', { name: 'Filtros activos' })).toHaveTextContent('En línea');
  });
});
