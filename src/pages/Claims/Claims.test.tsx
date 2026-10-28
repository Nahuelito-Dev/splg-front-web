import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Claim } from '../../services/api/types';

const claimsQuery = vi.hoisted(() => vi.fn());
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canOperate: true, operateHint: undefined }),
}));
vi.mock('../../services/queries/claims', () => {
  const mutation = { mutate: vi.fn(), isPending: false };
  return {
    useClaims: () => claimsQuery() as unknown,
    useClaim: () => ({ data: undefined }),
    useUpdateClaim: () => mutation,
    useTakeClaim: () => mutation,
    useResolveClaim: () => mutation,
    useReopenClaim: () => mutation,
  };
});
vi.mock('./components/ClaimHistory', () => ({ ClaimHistory: () => null }));
vi.mock('./components/ClaimPhoto', () => ({ ClaimPhoto: () => null }));
vi.mock('./components/CreateClaimModal', () => ({ CreateClaimModal: () => null }));

import { Claims } from './Claims';

afterEach(cleanup);

const claim = (id: string, status: Claim['status'], name: string): Claim =>
  ({
    claim_id: id,
    order_id: `order-${id}`,
    status,
    reason: `Motivo de ${name}`,
    description: 'x',
    createdAt: '2026-10-01T10:00:00Z',
    customer: { full_name: name, phone_number: '3764000000' },
  }) as unknown as Claim;

const CLAIMS = [
  claim('c1', 'pending', 'Ana Pérez'),
  claim('c2', 'pending', 'Beto Gómez'),
  claim('c3', 'resolved', 'Carla Ruiz'),
];

const Search = () => <output data-testid="search">{useLocation().search}</output>;

const renderPage = (url = '/claims') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Claims />
      <Search />
    </MemoryRouter>,
  );

describe('Claims', () => {
  it('muestra las pestañas con la cantidad de cada estado y el resumen analítico', () => {
    claimsQuery.mockReturnValue({ data: CLAIMS, isLoading: false, isFetching: false });
    renderPage();
    expect(screen.getByRole('tab', { name: 'Todos 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pendiente 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resuelto 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rechazado 0' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Reclamos por estado' })).toHaveTextContent('Pendiente');
  });

  it('elegir una pestaña filtra la lista, lo deja en la URL y muestra el chip con "N resultados"', () => {
    claimsQuery.mockReturnValue({ data: CLAIMS, isLoading: false, isFetching: false });
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Resuelto 1' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?status=resolved');
    expect(screen.getByText('Carla Ruiz')).toBeInTheDocument();
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    const chips = screen.getByRole('group', { name: 'Filtros activos' });
    expect(chips).toHaveTextContent('1 resultado');
    expect(within(chips).getByText('Estado: Resuelto')).toBeInTheDocument();
  });

  it('arranca con los filtros de la URL y "Limpiar todo" los saca de una vez', () => {
    claimsQuery.mockReturnValue({ data: CLAIMS, isLoading: false, isFetching: false });
    renderPage('/claims?status=pending&q=beto');
    expect(screen.getByText('Beto Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Carla Ruiz')).toBeInTheDocument();
  });

  it('sin resultados dice que ningún reclamo coincide, no que todo está en orden', () => {
    claimsQuery.mockReturnValue({ data: CLAIMS, isLoading: false, isFetching: false });
    renderPage('/claims?q=inexistente');
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('abrir un reclamo lo muestra en un panel lateral modal, no en un diálogo centrado', () => {
    claimsQuery.mockReturnValue({ data: CLAIMS, isLoading: false, isFetching: false });
    renderPage();
    fireEvent.click(screen.getByText('Ana Pérez'));
    const dialog = screen.getByRole('dialog', { name: 'Gestionar reclamo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('button', { name: 'Tomar' })).toBeEnabled();
  });

  it('mientras carga muestra el esqueleto del listado', () => {
    claimsQuery.mockReturnValue({ data: undefined, isLoading: true, isFetching: true });
    renderPage();
    expect(screen.getByRole('status', { name: 'Cargando listado' })).toBeInTheDocument();
  });

  it('el exporte trae todos los reclamos: con un filtro activo queda bloqueado', () => {
    claimsQuery.mockReturnValue({ data: CLAIMS, isLoading: false, isFetching: false });
    renderPage('/claims?status=pending');
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    expect(screen.getByRole('menuitem', { name: 'Exportar CSV' })).toHaveAttribute('aria-disabled', 'true');
    cleanup();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    expect(screen.getByRole('menuitem', { name: 'Exportar CSV' })).not.toHaveAttribute('aria-disabled', 'true');
  });
});
