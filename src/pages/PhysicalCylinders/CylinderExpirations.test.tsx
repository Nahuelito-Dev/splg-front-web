import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExpiringCylinders } from '../../services/api/types';
import { ApiError } from '../../services/api/errors';

const expiring = vi.hoisted(() => vi.fn());
vi.mock('../../services/queries/physicalCylinders', () => ({
  useExpiringCylinders: (days: number) => expiring(days) as unknown,
}));

import { CylinderExpirations } from './CylinderExpirations';

const item = (serial: string, status: 'valid' | 'expired' | 'unverified', daysRemaining: number | null) => ({
  cylinderId: `id-${serial}`,
  serial,
  state: 'filled',
  productType: 'Garrafa 10kg',
  lastInspectionAt: null,
  expiresAt: daysRemaining === null ? null : '2026-11-01T00:00:00.000Z',
  status,
  daysRemaining,
});
const DATA = {
  windowDays: 30,
  totals: { expired: 1, expiring: 2, unverified: 1 },
  expired: [item('VENCIDO-1', 'expired', -4)],
  expiring: [item('PRONTO-1', 'valid', 6), item('PRONTO-2', 'valid', 20)],
  unverified: [item('SIN-1', 'unverified', null)],
} as unknown as ExpiringCylinders;

const renderPage = (url = '/physical-cylinders/expirations') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <CylinderExpirations />
    </MemoryRouter>,
  );

describe('CylinderExpirations', () => {
  afterEach(() => {
    cleanup();
    expiring.mockReset();
  });

  it('separa vencidos, por vencer y sin revisión, con los días de cada uno', () => {
    expiring.mockReturnValue({ data: DATA, isPending: false, isFetching: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('heading', { name: /Vencidos/ })).toHaveTextContent('(1)');
    expect(screen.getByRole('heading', { name: /Vencen en los próximos 30 días/ })).toHaveTextContent('(2)');
    expect(screen.getByRole('heading', { name: /Sin revisión registrada/ })).toHaveTextContent('(1)');
    expect(screen.getByText('VENCIDO-1')).toBeInTheDocument();
    expect(screen.getByText('Venció hace 4 días')).toBeInTheDocument();
    expect(screen.getByText('Vence en 6 días')).toBeInTheDocument();
    expect(screen.getByText('SIN-1')).toBeInTheDocument();
  });

  it('avisa cuando un grupo no entró entero en la página', () => {
    expiring.mockReturnValue({
      data: { ...DATA, totals: { expired: 1, expiring: 2, unverified: 900 } },
      isPending: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Se muestran los primeros 1 de 900');
  });

  it('la ventana viene de la URL y cambiarla vuelve a consultar', () => {
    expiring.mockReturnValue({ data: DATA, isPending: false, isFetching: false, error: null, refetch: vi.fn() });
    renderPage('/physical-cylinders/expirations?days=60');
    expect(expiring).toHaveBeenLastCalledWith(60);
    fireEvent.change(screen.getByLabelText('Ventana'), { target: { value: '7' } });
    expect(expiring).toHaveBeenLastCalledWith(7);
  });

  it('una ventana que no se ofrece cae en 30 días', () => {
    expiring.mockReturnValue({ data: DATA, isPending: false, isFetching: false, error: null, refetch: vi.fn() });
    renderPage('/physical-cylinders/expirations?days=9999');
    expect(expiring).toHaveBeenLastCalledWith(30);
  });

  it('con los grupos vacíos lo dice en cada uno', () => {
    expiring.mockReturnValue({
      data: {
        windowDays: 30,
        totals: { expired: 0, expiring: 0, unverified: 0 },
        expired: [],
        expiring: [],
        unverified: [],
      },
      isPending: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('No hay envases vencidos')).toBeInTheDocument();
    expect(screen.getByText('Ningún envase vence en esta ventana')).toBeInTheDocument();
    expect(screen.getByText('Todos los envases tienen su revisión cargada')).toBeInTheDocument();
  });

  it('un error de servidor ofrece reintentar', () => {
    expiring.mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: false,
      error: new ApiError(500, ['boom']),
      refetch: vi.fn(),
    });
    renderPage();
    expect(within(document.body).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
