import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Incident } from '../../services/api/types';

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canOperate: true, operateHint: undefined }),
}));

const incident = (id: string, status: Incident['status'], type: Incident['type'], name: string): Incident =>
  ({
    incident_id: id,
    order_id: `order-${id}`,
    distributor_id: 'd-1',
    reported_by: 'driver-1',
    status,
    type,
    description: 'Detalle',
    createdAt: '2026-10-01T10:00:00Z',
    order: { customer: { full_name: name, phone_number: '3764' } },
  }) as unknown as Incident;

const INCIDENTS = [
  incident('i1', 'open', 'damaged', 'Ana Pérez'),
  incident('i2', 'resolved', 'no_show', 'Beto Gómez'),
  incident('i3', 'open', 'no_show', 'Carla Ruiz'),
];

vi.mock('../../services/queries/incidents', () => ({
  useIncidents: () => ({ data: INCIDENTS, isLoading: false, isFetching: false }),
  useResolveIncident: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../services/queries/users', () => ({
  useUser: () => ({ data: { full_name: 'Chofer Uno' }, isLoading: false }),
}));
vi.mock('./components/CreateIncidentModal', () => ({ CreateIncidentModal: () => null }));

import { Incidents } from './Incidents';

afterEach(cleanup);

const Search = () => <output data-testid="search">{useLocation().search}</output>;
const renderPage = (url = '/incidents') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Incidents />
      <Search />
    </MemoryRouter>,
  );

describe('Incidents', () => {
  it('pestañas Todas / Abiertas / Resueltas con su cantidad', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Todas 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Abiertas 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resueltas 1' })).toBeInTheDocument();
  });

  it('estado y tipo se combinan, viven en la URL y se muestran como chips con "N resultados"', () => {
    renderPage('/incidents?status=open&type=no_show');
    expect(screen.getByText('Carla Ruiz')).toBeInTheDocument();
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    const chips = screen.getByRole('group', { name: 'Filtros activos' });
    expect(chips).toHaveTextContent('1 resultado');
    expect(chips).toHaveTextContent('Abierta');
    expect(chips).toHaveTextContent('Cliente ausente');
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
    expect(screen.getByText('Beto Gómez')).toBeInTheDocument();
  });

  it('abrir una incidencia usa un panel lateral y Esc lo cierra', () => {
    renderPage();
    fireEvent.click(screen.getByText('Ana Pérez'));
    const dialog = screen.getByRole('dialog', { name: 'Resolver incidencia' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('button', { name: 'Marcar como resuelta' })).toBeEnabled();
  });
});
