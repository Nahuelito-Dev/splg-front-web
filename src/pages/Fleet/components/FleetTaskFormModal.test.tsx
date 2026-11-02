import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';

type Call = [{ changes: Record<string, unknown> }, { onError: (e: unknown) => void }];
const update = vi.hoisted(() => ({ mutate: vi.fn<Call, void>(), isPending: false }));
const create = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
const PLANS = vi.hoisted(() => [{ planId: 'p-1', name: 'Service', carType: null, trigger: 'by_time' }]);
const notifyError = vi.hoisted(() => vi.fn());

vi.mock('../../../services/queries/fleet', () => ({
  useCreateFleetTask: () => create,
  useUpdateFleetTask: () => update,
  useFleetPlans: () => ({ data: PLANS, error: null, refetch: vi.fn() }),
}));
vi.mock('../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: notifyError } }));

import { FleetTaskFormModal } from './FleetTaskFormModal';
import type { FleetTask } from '../../../services/api/types';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// 22:00 en Buenos Aires = 01:00Z del día siguiente.
const task = (over: Partial<FleetTask> = {}) =>
  ({
    taskId: 't-1',
    planId: 'p-1',
    dueAt: '2026-12-01T00:00:00.000Z',
    validFrom: null,
    dueKm: null,
    cost: null,
    scheduledAt: '2026-11-11T01:00:00.000Z',
    plan: { name: 'Service', trigger: 'by_time' },
    ...over,
  }) as unknown as FleetTask;

const renderForm = (t: FleetTask) =>
  render(<FleetTaskFormModal open onClose={vi.fn()} subject="vehicle" ownerId="c-1" task={t} />);
const turno = () => screen.getByLabelText<HTMLInputElement>(/Turno agendado/);
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

describe('FleetTaskFormModal: turno agendado', () => {
  it('precarga el día argentino, no el de UTC', async () => {
    renderForm(task());
    await waitFor(() => expect(turno().value).toBe('2026-11-10'));
  });

  it('no manda scheduledAt si no cambió', async () => {
    renderForm(task());
    await waitFor(() => expect(turno().value).toBe('2026-11-10'));
    save();
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    const [{ changes }] = update.mutate.mock.calls[0];
    expect(changes).not.toHaveProperty('scheduledAt');
  });

  it('manda el nuevo día si lo cambian', async () => {
    renderForm(task());
    await waitFor(() => expect(turno().value).toBe('2026-11-10'));
    fireEvent.change(turno(), { target: { value: '2026-11-12' } });
    save();
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0].changes.scheduledAt).toBe('2026-11-12');
  });

  it('manda null al vaciarlo', async () => {
    renderForm(task());
    await waitFor(() => expect(turno().value).toBe('2026-11-10'));
    fireEvent.change(turno(), { target: { value: '' } });
    save();
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0].changes.scheduledAt).toBeNull();
  });

  it('muestra el 400 de la ventana en el campo, no como error genérico', async () => {
    update.mutate.mockImplementation((_vars, opts) => {
      opts.onError(new ApiError(400, ['scheduledAt: la ventana tiene que ser a futuro']));
    });
    renderForm(task());
    await waitFor(() => expect(turno().value).toBe('2026-11-10'));
    fireEvent.change(turno(), { target: { value: '2020-01-01' } });
    save();
    expect(await screen.findByText('La ventana tiene que ser a futuro')).toBeTruthy();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('un error que no es del turno va al aviso con todos los mensajes', async () => {
    update.mutate.mockImplementation((_vars, opts) => {
      opts.onError(new ApiError(400, ['scheduledAt: la ventana tiene que ser a futuro', 'notes: muy largo']));
    });
    renderForm(task());
    await waitFor(() => expect(turno().value).toBe('2026-11-10'));
    fireEvent.change(turno(), { target: { value: '2020-01-01' } });
    save();
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
  });

  it('una fila a medianoche UTC muestra su día de calendario y corregirlo manda el nuevo', async () => {
    renderForm(task({ scheduledAt: '2026-11-11T00:00:00.000Z' }));
    await waitFor(() => expect(turno().value).toBe('2026-11-11'));
    save();
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0].changes).not.toHaveProperty('scheduledAt');
    update.mutate.mockClear();
    fireEvent.change(turno(), { target: { value: '2026-11-10' } });
    save();
    await waitFor(() => expect(update.mutate).toHaveBeenCalled());
    expect(update.mutate.mock.calls[0][0].changes.scheduledAt).toBe('2026-11-10');
  });

  it('el alta sigue mandando scheduledAt', async () => {
    render(<FleetTaskFormModal open onClose={vi.fn()} subject="vehicle" ownerId="c-1" task={null} />);
    fireEvent.change(turno(), { target: { value: '2026-11-12' } });
    fireEvent.change(screen.getByLabelText(/Vence el/), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tarea' }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalled());
    expect((create.mutate.mock.calls[0] as unknown[][])[0]).toMatchObject({ scheduledAt: '2026-11-12' });
  });
});
