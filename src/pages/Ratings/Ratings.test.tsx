import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok, renderPage } from '../../test/pageTest';

const profile = (id: string, name: string) => ({ user_id: id, user: { full_name: name } });

vi.mock('../../services/queries/deliveries', () => ({
  useDeliveries: () => ok({ rows: [profile('d-1', 'Diego Ferreyra')], total: 1 }),
}));
vi.mock('../../services/queries/customers', () => ({
  useCustomers: () => ok({ rows: [profile('c-1', 'Ana Gómez')], total: 1 }),
}));
vi.mock('../../services/queries/ratings', () => ({
  useRatingSummary: () => ok(undefined),
  useRatingHistory: () => ok([]),
}));

import { Ratings } from './Ratings';

afterEach(cleanup);

describe('Ratings: choferes y clientes son pestañas del kit', () => {
  it('pestañas (no botones) dentro de la tarjeta, con el buscador y la lista como panel', () => {
    renderPage(<Ratings />, { url: '/ratings' });
    const drivers = screen.getByRole('tab', { name: 'Choferes' });
    expect(drivers).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', drivers.id);
    expect(screen.getByRole('searchbox', { name: 'Buscar chofer' })).toHaveAttribute('placeholder', 'Buscar chofer');
    expect(screen.getByText('Diego Ferreyra')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Clientes' }));
    expect(screen.getByRole('tab', { name: 'Clientes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('searchbox', { name: 'Buscar cliente' })).toBeInTheDocument();
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
  });
});
