import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok } from '../../test/pageTest';
import type { ProcessConfig } from '../../services/api/types';

const update = vi.hoisted(() => ({ current: {} as ReturnType<typeof mutation> }));
vi.mock('../../services/queries/routeBatches', () => ({ useUpdateRouteBatchSettings: () => update.current }));
vi.mock('../../services/queries/users', () => ({ useUser: () => ok(undefined, { data: undefined }) }));
vi.mock('../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() }, confirm: vi.fn() }));

import { RouteBatchSettingsModal } from './RouteBatchSettingsModal';

const field = (
  key: string,
  type: 'integer' | 'number',
  min: number,
  max: number,
  def: number,
  unit: string | null,
  description: string,
) => ({ key, type, min, max, default: def, unit, description });

const CONFIG = {
  process: 'route_batching',
  title: 'Agrupación por recorrido',
  description: '',
  fields: [
    field('enabled', 'integer', 0, 1, 0, null, 'Interruptor'),
    field('maxBatchSize', 'integer', 2, 20, 4, null, 'Pedidos máximos por lote'),
    field('groupingRadiusKm', 'number', 0.5, 50, 3, 'km', 'Radio de agrupación'),
    field('offerTtlSeconds', 'integer', 10, 600, 60, 's', 'Vigencia de la oferta'),
    field('batchingHoldMinutes', 'integer', 0, 720, 60, 'min', 'Espera del despacho individual'),
  ],
  params: { enabled: 0, maxBatchSize: 4, groupingRadiusKm: 3, offerTtlSeconds: 60, batchingHoldMinutes: 60 },
  isDefault: true,
  updatedAt: null,
  updatedByUserId: null,
} as ProcessConfig;

afterEach(cleanup);

const open = (canWrite = true) => {
  update.current = mutation();
  render(<RouteBatchSettingsModal config={CONFIG} canWrite={canWrite} onClose={vi.fn()} />);
};

describe('RouteBatchSettingsModal', () => {
  it('muestra cada parámetro con su valor vigente y su rango', () => {
    open();
    expect(screen.getByLabelText('Radio de agrupación')).toHaveValue(3);
    expect(screen.getByText('0.5 a 50 km')).toBeInTheDocument();
    expect(screen.getByLabelText('Pedidos máximos por lote')).toHaveValue(4);
  });

  it('guarda con PATCH todos los parámetros como números', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Radio de agrupación'), { target: { value: '5.5' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.current.mutate).toHaveBeenCalled());
    expect(update.current.mutate.mock.calls[0][0]).toEqual({
      enabled: 0,
      maxBatchSize: 4,
      groupingRadiusKm: 5.5,
      offerTtlSeconds: 60,
      batchingHoldMinutes: 60,
    });
  });

  it('viene apagado y se enciende con la casilla: manda enabled 1', async () => {
    open();
    const casilla = screen.getByRole('checkbox', { name: /Recorridos encendido/ });
    expect(casilla).not.toBeChecked();
    fireEvent.click(casilla);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.current.mutate).toHaveBeenCalled());
    expect(update.current.mutate.mock.calls[0][0]).toMatchObject({ enabled: 1 });
  });

  it('el margen de espera acepta de 0 a 720 minutos', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Espera del despacho individual'), { target: { value: '721' } });
    await waitFor(() => expect(screen.getByText('Un entero entre 0 y 720')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('un valor fuera de rango o decimal en un entero no se puede guardar', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Pedidos máximos por lote'), { target: { value: '1' } });
    await waitFor(() => expect(screen.getByText('Un entero entre 2 y 20')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Pedidos máximos por lote'), { target: { value: '3.5' } });
    await waitFor(() => expect(screen.getByText('Un entero entre 2 y 20')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Vigencia de la oferta'), { target: { value: '601' } });
    await waitFor(() => expect(screen.getByText('Un entero entre 10 y 600')).toBeInTheDocument());
    expect(update.current.mutate).not.toHaveBeenCalled();
  });

  it('sin permiso de escritura los campos quedan deshabilitados', () => {
    open(false);
    expect(screen.getByLabelText('Radio de agrupación')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('muestra el error del servidor si guardar falla', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Vigencia de la oferta'), { target: { value: '90' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.current.mutate).toHaveBeenCalled());
    const options = update.current.mutate.mock.calls[0][1] as { onError: (e: unknown) => void };
    options.onError(new Error('El rango no es válido'));
    expect(await screen.findByRole('alert')).toHaveTextContent('El rango no es válido');
  });
});
