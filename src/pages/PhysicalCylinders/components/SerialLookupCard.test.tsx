import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import type { CylinderVigencia } from '../../../services/api/types';

const permissions = vi.hoisted(() => vi.fn());
vi.mock('../../../hooks', () => ({
  usePermissions: permissions,
  OPERATE_HINT: 'Elegí una distribuidora en «Ver como» para operar',
}));
const lookup = vi.hoisted(() => vi.fn());
vi.mock('../../../services/api/physicalCylinders', () => ({
  getCylinderVigenciaBySerial: lookup,
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SerialLookupCard } from './SerialLookupCard';

afterEach(() => {
  cleanup();
  lookup.mockReset();
});

const VIGENCIA = {
  cylinderId: 'cyl-1',
  serial: 'SN-000123',
  state: 'filled',
  productType: 'Garrafa 10kg',
  lastInspectionAt: '2026-01-10T12:00:00.000Z',
  expiresAt: '2026-12-01T12:00:00.000Z',
  status: 'valid',
  daysRemaining: 44,
  manufacturedAt: null,
  withdrawalPending: false,
  inspections: [],
} as unknown as CylinderVigencia;

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SerialLookupCard />
      </MemoryRouter>
    </QueryClientProvider>,
  );

const search = (serial: string) => {
  fireEvent.change(screen.getByLabelText('Número de serie'), { target: { value: serial } });
  fireEvent.click(screen.getByRole('button', { name: 'Ver vigencia' }));
};

describe('SerialLookupCard', () => {
  it('busca por el serial sin espacios y muestra la vigencia del envase', async () => {
    permissions.mockReturnValue({ needsDistributor: false });
    lookup.mockResolvedValue(VIGENCIA);
    renderCard();
    search('  SN-000123 ');
    await waitFor(() => expect(screen.getByText('SN-000123')).toBeInTheDocument());
    expect(lookup).toHaveBeenCalledWith('SN-000123');
    expect(screen.getByText('Garrafa 10kg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver el envase' })).toBeInTheDocument();
  });

  it('un serial inexistente muestra el motivo de la API', async () => {
    permissions.mockReturnValue({ needsDistributor: false });
    lookup.mockRejectedValue(new ApiError(404, ['Envase no encontrado']));
    renderCard();
    search('NOPE');
    expect(await screen.findByRole('alert')).toHaveTextContent('Envase no encontrado');
  });

  it('sin distribuidora elegida el administrador general no consulta: la API contestaría 400', () => {
    permissions.mockReturnValue({ needsDistributor: true });
    renderCard();
    search('SN-1');
    expect(lookup).not.toHaveBeenCalled();
    const button = screen.getByRole('button', { name: 'Ver vigencia' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Elegí una distribuidora en «Ver como» para operar');
  });
});
