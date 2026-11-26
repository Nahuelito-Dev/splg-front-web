import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProcessConfig } from '../../services/api/types';
import { mutation } from '../../test/pageTest';

const update = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const serviceTime = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../../services/queries/routeSheets', () => ({
  useUpdateRoutePlanningSettings: () => update.current,
  useRouteServiceTime: () => serviceTime.current,
}));
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

const modeField = {
  key: 'serviceMinutesMode',
  type: 'integer',
  min: 0,
  max: 1,
  default: 0,
  unit: null,
  description: 'Cómo se calculan los minutos de cada parada',
};
const withMode = {
  ...config,
  fields: [config.fields[1], modeField],
  params: { maxStopsPerSheet: 20, serviceMinutesMode: 0 },
} as ProcessConfig;
const timeFor = (over: Record<string, unknown> = {}) => ({
  data: {
    mode: 'fixed',
    fixedMinutes: 10,
    suggestedMinutes: 8,
    p90Minutes: 12,
    effectiveMinutes: 10,
    samples: 42,
    minSamples: 20,
    windowDays: 30,
    computedAt: '2026-11-25T06:15:00.000Z',
  },
  isPending: false,
  isError: false,
  ...over,
});

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

  it('el modo de los minutos de servicio no es una casilla más: muestra «sugerido X, vigente Y» y se manda como fixed o learned', async () => {
    update.current = mutation();
    serviceTime.current = timeFor();
    render(<RouteSheetSettingsModal config={withMode} canWrite onClose={vi.fn()} />);
    expect(screen.getByText('Sugerido: 8 min (42 entregas, 30 días) · Vigente: 10 min')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Cómo se calculan los minutos de cada parada/)).not.toBeInTheDocument();
    expect(screen.getByText(/Todas las paradas se planifican con los minutos fijos/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cómo se calculan los minutos'), { target: { value: '1' } });
    expect(await screen.findByText(/Cambia las horas que se les prometen a los clientes/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(update.current.mutate).toHaveBeenCalledWith(
        { maxStopsPerSheet: 20, serviceMinutesMode: 'learned' },
        expect.anything(),
      ),
    );
  });

  it('sin entregas suficientes dice cuántas hay de las que hacen falta; con el selector deshabilitado sin permiso', () => {
    update.current = mutation();
    serviceTime.current = timeFor({
      data: { ...timeFor().data, suggestedMinutes: null, samples: 12, effectiveMinutes: 10 },
    });
    render(<RouteSheetSettingsModal config={withMode} canWrite={false} onClose={vi.fn()} />);
    expect(
      screen.getByText('Sugerido: todavía sin entregas suficientes (12 de 20, 30 días) · Vigente: 10 min'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Cómo se calculan los minutos')).toBeDisabled();
  });

  it('mientras calcula o si falla la lectura, no bloquea el cambio del modo', () => {
    update.current = mutation();
    serviceTime.current = timeFor({ data: undefined, isPending: true });
    const { unmount } = render(<RouteSheetSettingsModal config={withMode} canWrite onClose={vi.fn()} />);
    expect(screen.getByText('Calculando el tiempo sugerido…')).toBeInTheDocument();
    unmount();
    serviceTime.current = timeFor({ data: undefined, isPending: false, isError: true });
    render(<RouteSheetSettingsModal config={withMode} canWrite onClose={vi.fn()} />);
    expect(screen.getByText(/No se pudo leer el tiempo sugerido/)).toBeInTheDocument();
    expect(screen.getByLabelText('Cómo se calculan los minutos')).toBeEnabled();
  });
});
