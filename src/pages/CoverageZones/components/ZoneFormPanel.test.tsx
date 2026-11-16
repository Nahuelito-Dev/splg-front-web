import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn<[{ id: string; changes: Record<string, unknown> }], void>(),
}));
const zones = [
  { coverage_zone_id: 'z1', name: 'Centro', priority: 0, isActive: true },
  { coverage_zone_id: 'z2', name: 'Norte', priority: 1, isActive: true },
];
const notifications = vi.hoisted(() => ({
  notify: { success: vi.fn(), error: vi.fn<[unknown], void>(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('../../../utils/notifications', () => notifications);
vi.mock('../../../services/queries/coverageZones', () => ({
  useCoverageZones: () => ({ refetch: () => Promise.resolve({ data: { rows: zones } }) }),
  useCreateCoverageZone: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateCoverageZone: () => ({ mutate: mocks.update, isPending: false }),
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

describe('ZoneFormPanel: borde de la zona', () => {
  const BOWTIE = [
    [0, 0],
    [1, 1],
    [1, 0],
    [0, 1],
  ];
  const drawWith = (polygon: number[][]) =>
    render(
      <ZoneFormPanel
        zone={null}
        polygon={polygon}
        zones={zones as CoverageZone[]}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

  it('si los lados se cruzan lo avisa y no lo envía', async () => {
    drawWith(BOWTIE);
    expect(screen.getByRole('alert')).toHaveTextContent('Los lados de la zona se cruzan entre sí');
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Sur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear zona' }));
    await waitFor(() => expect(notifications.notify.error).toHaveBeenCalled());
    expect((notifications.notify.error.mock.calls[0][0] as Error).message).toMatch(/se cruzan entre sí/);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('el 400 de PostGIS por autointersección se dice en castellano', async () => {
    mocks.create.mockImplementation((_: unknown, options: { onError: (e: unknown) => void }) =>
      options.onError(new ApiError(400, ['El polígono no es válido: Self-intersection at or near point -55.9 -27.3'])),
    );
    drawWith(POLYGON);
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Sur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear zona' }));
    await waitFor(() => expect(notifications.notify.error).toHaveBeenCalled());
    const shown = notifications.notify.error.mock.calls[0][0] as Error;
    expect(shown.message).toBe(
      'Los lados de la zona se cruzan entre sí: mové los vértices para que el borde no se corte.',
    );
  });
});

describe('ZoneFormPanel: vigencia al editar', () => {
  const editing = {
    coverage_zone_id: 'z9',
    name: 'Sur',
    label: null,
    surchargeType: 'percentage',
    surchargeValue: 10,
    color: '#FF7A00',
    priority: 5,
    isActive: true,
    validFrom: '2026-11-02T03:00:00.000Z',
    validUntil: '2026-11-11T02:59:59.999Z',
  } as unknown as CoverageZone;
  const renderEditing = () =>
    render(
      <ZoneFormPanel
        zone={editing}
        polygon={POLYGON}
        zones={zones as CoverageZone[]}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
  const save = () => fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
  const sent = () => mocks.update.mock.calls[0][0].changes;

  it('muestra los días argentinos guardados y, si no los toca, no manda la vigencia', async () => {
    renderEditing();
    expect(screen.getByLabelText<HTMLInputElement>(/Vigente desde/).value).toBe('2026-11-02');
    expect(screen.getByLabelText<HTMLInputElement>(/Vigente hasta/).value).toBe('2026-11-10');
    save();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(sent().validFrom).toBeUndefined();
    expect(sent().validUntil).toBeUndefined();
  });

  it('vaciar «Vigente hasta» manda null para quitar el vencimiento', async () => {
    renderEditing();
    fireEvent.change(screen.getByLabelText(/Vigente hasta/), { target: { value: '' } });
    save();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(sent().validUntil).toBeNull();
    expect(sent().validFrom).toBeUndefined();
  });
});
