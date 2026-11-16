import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok } from '../../../test/pageTest';
import type { ProcessConfig } from '../../../services/api/types';

const update = vi.hoisted(() => ({ current: {} as ReturnType<typeof mutation> }));
vi.mock('../../../services/queries/planner', () => ({ useUpdatePlannerSettings: () => update.current }));
vi.mock('../../../services/queries/users', () => ({ useUser: () => ok(undefined, { data: undefined }) }));
vi.mock('../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() }, confirm: vi.fn() }));

import { PlannerSettingsModal } from './PlannerSettingsModal';

const field = (key: string, min: number, max: number, def: number, description: string) => ({
  key,
  type: 'integer' as const,
  min,
  max,
  default: def,
  unit: 'h',
  description,
});

const CONFIG = {
  process: 'fleet_planner',
  title: 'Planificador de flota',
  description: '',
  fields: [
    field('topNWindows', 1, 10, 3, 'Ventanas alternativas'),
    field('workshopStartHour', 0, 23, 8, 'Inicio del taller'),
    field('workshopEndHour', 1, 24, 13, 'Fin del taller'),
    field('workshopDays', 1, 127, 126, 'Días de taller'),
    field('driverEmail', 0, 1, 0, 'Correo al chofer'),
  ],
  params: { topNWindows: 3, workshopStartHour: 8, workshopEndHour: 13, workshopDays: 126, driverEmail: 0 },
  isDefault: true,
  updatedAt: null,
  updatedByUserId: null,
} as ProcessConfig;

afterEach(cleanup);

const open = (canWrite = true) => {
  update.current = mutation();
  render(<PlannerSettingsModal config={CONFIG} canWrite={canWrite} onClose={vi.fn()} />);
};

describe('PlannerSettingsModal', () => {
  it('muestra cada parámetro con su valor vigente y su rango', () => {
    open();
    expect(screen.getByLabelText('Ventanas alternativas')).toHaveValue(3);
    expect(screen.getByText('1 a 10 h')).toBeInTheDocument();
  });

  it('guarda con PATCH todos los parámetros como números', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Ventanas alternativas'), { target: { value: '5' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.current.mutate).toHaveBeenCalled());
    expect(update.current.mutate.mock.calls[0][0]).toEqual({
      topNWindows: 5,
      workshopStartHour: 8,
      workshopEndHour: 13,
      workshopDays: 126,
      driverEmail: 0,
    });
  });

  it('los días de taller se eligen con casillas: lunes a sábado por omisión, sin domingo', () => {
    open();
    expect(screen.getByLabelText('Lunes')).toBeChecked();
    expect(screen.getByLabelText('Sábado')).toBeChecked();
    expect(screen.getByLabelText('Domingo')).not.toBeChecked();
  });

  it('marcar el domingo y el correo al chofer manda la máscara 127 y driverEmail 1', async () => {
    open();
    fireEvent.click(screen.getByLabelText('Domingo'));
    fireEvent.click(screen.getByLabelText(/Mandar también un correo al chofer/));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.current.mutate).toHaveBeenCalled());
    expect(update.current.mutate.mock.calls[0][0]).toMatchObject({ workshopDays: 127, driverEmail: 1 });
  });

  it('sin ningún día de taller no se guarda', async () => {
    open();
    for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']) {
      fireEvent.click(screen.getByLabelText(dia));
    }
    expect(await screen.findByText('Elegí al menos un día de taller')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('un taller que termina antes de empezar no se guarda', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Fin del taller'), { target: { value: '7' } });
    expect(await screen.findByText('Tiene que ser posterior a la hora de inicio del taller')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('un valor fuera de rango se marca', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Ventanas alternativas'), { target: { value: '11' } });
    expect(await screen.findByText('Un entero entre 1 y 10')).toBeInTheDocument();
  });

  it('sin permiso para escribir los campos quedan de sólo lectura', () => {
    open(false);
    expect(screen.getByLabelText('Ventanas alternativas')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('muestra el error que devuelve la API', async () => {
    open();
    update.current.mutate.mockImplementation((_v, options) => {
      (options as { onError: (e: unknown) => void }).onError(new Error('decay must not be greater than 1'));
    });
    fireEvent.change(screen.getByLabelText('Ventanas alternativas'), { target: { value: '4' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('decay must not be greater than 1');
  });
});
