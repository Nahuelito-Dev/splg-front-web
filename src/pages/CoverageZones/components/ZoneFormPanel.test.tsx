import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
const zones = [
  { coverage_zone_id: 'z1', name: 'Centro', priority: 0, isActive: true },
  { coverage_zone_id: 'z2', name: 'Norte', priority: 1, isActive: true },
];
vi.mock('../../../services/queries/coverageZones', () => ({
  useCoverageZones: () => ({ refetch: () => Promise.resolve({ data: { rows: zones } }) }),
  useCreateCoverageZone: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateCoverageZone: () => ({ mutate: vi.fn(), isPending: false }),
}));

import type { CoverageZone } from '../../../services/api/types';
import { ZoneFormPanel } from './ZoneFormPanel';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const POLYGON = [
  [0, 0],
  [0, 1],
  [1, 1],
];
const renderPanel = () =>
  render(
    <ZoneFormPanel
      zone={null}
      polygon={POLYGON}
      zones={zones as CoverageZone[]}
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );

describe('ZoneFormPanel: nombre y prioridad entre zonas activas', () => {
  it('propone la prioridad siguiente y un nombre repetido no se envía', async () => {
    renderPanel();
    expect(screen.getByRole('spinbutton', { name: /Prioridad/ })).toHaveValue(2);
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: ' centro ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear zona' }));
    expect(await screen.findByText('Ya existe una zona activa con el nombre «Centro»')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('una prioridad repetida no se envía', async () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Sur' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Prioridad/ }), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear zona' }));
    expect(
      await screen.findByText('La zona «Norte» ya tiene la prioridad 1: cada zona activa tiene una prioridad distinta'),
    ).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('sin choque se envía', async () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Sur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear zona' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
  });
});
