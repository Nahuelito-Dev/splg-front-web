import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok } from '../../test/pageTest';
import { ExpressSettings } from './ExpressSettings';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  query: undefined as unknown,
  update: undefined as unknown,
}));
vi.mock('../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../services/queries/moduleConfig', () => ({
  useExpressConfig: () => state.query,
  useUpdateExpressConfig: () => state.update,
}));
vi.mock('../../services/queries/users', () => ({
  useUser: () => ({ data: { full_name: 'Ana Admin' }, isPending: false }),
}));
vi.mock('../../utils/notifications', () => ({
  confirm: () => Promise.resolve(true),
  notify: { success: vi.fn(), error: vi.fn() },
}));

const config = (over: Record<string, unknown> = {}) => ({
  enabled: true,
  surchargeAmount: 1500,
  maxRadiusKm: 5,
  offerTtlSeconds: 20,
  serviceFrom: '08:00',
  serviceTo: '20:00',
  estimatedMinutes: 45,
  standardEstimatedMinutes: 180,
  isDefault: false,
  updatedAt: '2026-10-17T12:00:00.000Z',
  updatedByUserId: 'user-1',
  ...over,
});

const setup = (data = config()) => {
  state.query = ok(data);
  state.update = mutation();
  render(
    <MemoryRouter>
      <ExpressSettings />
    </MemoryRouter>,
  );
  return state.update as ReturnType<typeof mutation>;
};

afterEach(() => {
  cleanup();
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
});

describe('ExpressSettings', () => {
  it('muestra la configuración vigente', () => {
    setup();
    expect(screen.getByLabelText('Recargo express ($)')).toHaveValue(1500);
    expect(screen.getByLabelText('Radio máximo (km)')).toHaveValue(5);
    expect(screen.getByRole('switch', { name: 'Compra express habilitada' })).toHaveAttribute('aria-checked', 'true');
  });

  it('guarda sólo con cambios válidos y manda el cuerpo completo', async () => {
    const update = setup();
    const save = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Recargo express ($)'), { target: { value: '2000' } });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(update.mutate).toHaveBeenCalledTimes(1));
    expect(update.mutate.mock.calls[0][0]).toMatchObject({ enabled: true, surchargeAmount: 2000, maxRadiusKm: 5 });
  });

  it('un horario invertido no deja guardar y lo explica', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '07:00' } });
    expect(await screen.findByText(/posterior al inicio/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('con isDefault no deja restablecer y lo indica', () => {
    setup(config({ isDefault: true, enabled: false, updatedAt: null, updatedByUserId: null }));
    expect(screen.getByText('Valores por defecto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Restablecer/ })).toBeDisabled();
  });

  it('el administrador general sin distribuidora ve el aviso y no la configuración', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: 'Elegí' };
    setup();
    expect(screen.getByText(/Elegí una distribuidora/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Recargo express ($)')).not.toBeInTheDocument();
  });

  it('sin permiso de escritura los campos quedan bloqueados', () => {
    state.perms = { needsDistributor: false, canWrite: false, writeHint: 'Elegí' };
    setup();
    expect(screen.getByLabelText('Recargo express ($)')).toBeDisabled();
  });
});
