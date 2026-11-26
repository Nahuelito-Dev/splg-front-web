import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok } from '../../../test/pageTest';
import type { ProcessConfig } from '../../../services/api/types';

const update = vi.hoisted(() => ({ current: {} as ReturnType<typeof mutation> }));
vi.mock('../../../services/queries/recovery', () => ({ useUpdateRecoverySettings: () => update.current }));
vi.mock('../../../services/queries/users', () => ({ useUser: () => ok(undefined, { data: undefined }) }));
vi.mock('../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn() }, confirm: vi.fn() }));

import { RecoverySettingsModal } from './RecoverySettingsModal';

const field = (
  key: string,
  type: 'integer' | 'number',
  min: number,
  max: number,
  def: number,
  unit: string,
  d: string,
) => ({
  key,
  type,
  min,
  max,
  default: def,
  unit,
  description: d,
});

const CONFIG = {
  process: 'cylinder_recovery',
  title: 'Recuperación de envases',
  description: '',
  fields: [
    field('toleranceDays', 'integer', 1, 365, 30, 'días', 'Tolerancia de devolución'),
    field('escalationAmountThreshold', 'number', 0, 100000000, 50000, '$', 'Umbral para escalar'),
    field('toleranceHighRiskPercent', 'integer', 10, 300, 70, '%', 'Porcentaje de tolerancia (riesgo alto)'),
    field('opportunisticPickupRadiusMeters', 'integer', 50, 2000, 300, 'm', 'Radio del retiro aprovechando la hoja'),
    field('enabled', 'integer', 0, 1, 0, '', 'Encender el recupero'),
  ],
  params: {
    toleranceDays: 30,
    escalationAmountThreshold: 50000,
    toleranceHighRiskPercent: 70,
    opportunisticPickupRadiusMeters: 300,
    enabled: 0,
  },
  isDefault: true,
  updatedAt: null,
  updatedByUserId: null,
} as ProcessConfig;

afterEach(cleanup);

const open = (canWrite = true) => {
  update.current = mutation();
  render(<RecoverySettingsModal config={CONFIG} canWrite={canWrite} onClose={vi.fn()} />);
};

describe('RecoverySettingsModal', () => {
  it('muestra cada parámetro con su valor y su rango', () => {
    open();
    expect(screen.getByLabelText('Tolerancia de devolución')).toHaveValue(30);
    expect(screen.getByText('1 a 365 días')).toBeInTheDocument();
  });

  it('guarda con PATCH los parámetros como números, con decimales en el umbral', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Tolerancia de devolución'), { target: { value: '45' } });
    fireEvent.change(screen.getByLabelText('Umbral para escalar'), { target: { value: '1234.5' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.current.mutate).toHaveBeenCalled());
    expect(update.current.mutate.mock.calls[0][0]).toEqual({
      toleranceDays: 45,
      escalationAmountThreshold: 1234.5,
      toleranceHighRiskPercent: 70,
      opportunisticPickupRadiusMeters: 300,
      enabled: 0,
    });
  });

  it('muestra los parámetros por banda de riesgo y el radio, con su rango, y los manda como números', async () => {
    open();
    expect(screen.getByLabelText('Porcentaje de tolerancia (riesgo alto)')).toHaveValue(70);
    expect(screen.getByText('10 a 300 %')).toBeInTheDocument();
    expect(screen.getByText('50 a 2000 m')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Radio del retiro aprovechando la hoja'), { target: { value: '45' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled());
    fireEvent.change(screen.getByLabelText('Radio del retiro aprovechando la hoja'), { target: { value: '400' } });
    fireEvent.change(screen.getByLabelText('Porcentaje de tolerancia (riesgo alto)'), { target: { value: '50' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.current.mutate).toHaveBeenCalled());
    expect(update.current.mutate.mock.calls[0][0]).toEqual(
      expect.objectContaining({ opportunisticPickupRadiusMeters: 400, toleranceHighRiskPercent: 50 }),
    );
  });

  it('el interruptor arranca apagado y al encenderlo manda enabled en 1', async () => {
    open();
    const interruptor = screen.getByLabelText(/Recupero de envases encendido/);
    expect(interruptor).not.toBeChecked();
    fireEvent.click(interruptor);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(update.current.mutate).toHaveBeenCalled());
    expect(update.current.mutate.mock.calls[0][0]).toEqual({
      toleranceDays: 30,
      escalationAmountThreshold: 50000,
      toleranceHighRiskPercent: 70,
      opportunisticPickupRadiusMeters: 300,
      enabled: 1,
    });
  });

  it('no deja guardar un valor fuera de rango', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Tolerancia de devolución'), { target: { value: '0' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled());
  });

  it('sin permiso de escritura no se edita', () => {
    open(false);
    expect(screen.getByLabelText('Tolerancia de devolución')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });
});
