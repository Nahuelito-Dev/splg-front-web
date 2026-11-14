import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProcessConfig } from '../../services/api/types';
import { mutation } from '../../test/pageTest';

const update = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../../services/queries/routeSheets', () => ({ useUpdateRoutePlanningSettings: () => update.current }));
vi.mock('../Configuration/components/SettingsMeta', () => ({ SettingsMeta: () => null }));
vi.mock('../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

import { RouteSheetSettingsModal } from './RouteSheetSettingsModal';

/** El esquema que publica el back (`GET /route-planning/settings`), recortado a tres campos. */
const config: ProcessConfig = {
  process: 'route_planning',
  title: 'Hojas de ruta',
  description: '',
  fields: [
    { key: 'enabled', type: 'integer', min: 0, max: 1, default: 0, unit: null, description: 'Encendido' },
    {
      key: 'maxStopsPerSheet',
      type: 'integer',
      min: 2,
      max: 40,
      default: 20,
      unit: null,
      description: 'Paradas máximas por hoja',
    },
    {
      key: 'trafficFactor',
      type: 'number',
      min: 1,
      max: 3,
      default: 1.2,
      unit: null,
      description: 'Factor de tránsito',
    },
  ],
  params: { enabled: 0, maxStopsPerSheet: 20, trafficFactor: 1.2 },
  isDefault: true,
  updatedAt: null,
  updatedByUserId: null,
} as ProcessConfig;

afterEach(cleanup);

describe('RouteSheetSettingsModal', () => {
  it('valida con los límites del back y manda los parámetros como números', async () => {
    update.current = mutation();
    render(<RouteSheetSettingsModal config={config} canWrite onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Paradas máximas por hoja'), { target: { value: '41' } });
    expect(await screen.findByText('Un entero entre 2 y 40')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Paradas máximas por hoja'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Factor de tránsito'), { target: { value: '3.5' } });
    expect(await screen.findByText('Un número entre 1 y 3')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Factor de tránsito'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByLabelText(/^Hojas de ruta encendidas/));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(update.current.mutate).toHaveBeenCalledWith(
        { enabled: 1, maxStopsPerSheet: 12, trafficFactor: 1.5 },
        expect.anything(),
      ),
    );
  });

  it('los días de reparto son casillas sobre la máscara de bits; sin ninguno no se guarda', async () => {
    update.current = mutation();
    const withDays = {
      ...config,
      fields: [
        { key: 'autoConfirm', type: 'integer', min: 0, max: 1, default: 1, unit: null, description: 'Confirmar' },
        {
          key: 'workingDays',
          type: 'integer',
          min: 1,
          max: 127,
          default: 63,
          unit: null,
          description: 'Días de reparto',
        },
      ],
      params: { autoConfirm: 1, workingDays: 63 },
    } as ProcessConfig;
    render(<RouteSheetSettingsModal config={withDays} canWrite onClose={vi.fn()} />);
    expect(screen.getByLabelText(/^Confirmar solo al vencer la revisión/)).toBeChecked();
    expect(screen.getByLabelText('Sábado')).toBeChecked();
    expect(screen.getByLabelText('Domingo')).not.toBeChecked();
    for (const day of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']) {
      fireEvent.click(screen.getByLabelText(day));
    }
    expect(await screen.findByText('Elegí al menos un día')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Lunes'));
    fireEvent.click(screen.getByLabelText('Domingo'));
    fireEvent.click(screen.getByLabelText(/^Confirmar solo al vencer la revisión/));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(update.current.mutate).toHaveBeenCalledWith({ autoConfirm: 0, workingDays: 65 }, expect.anything()),
    );
  });
});
