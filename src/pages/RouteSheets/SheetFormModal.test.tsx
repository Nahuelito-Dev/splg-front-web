import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mutation, ok } from '../../test/pageTest';
import { planDay, sheet, uuid } from '../../test/routeSheetFixtures';

const state = vi.hoisted(() => ({ update: {} as Record<string, unknown>, create: {} as Record<string, unknown> }));
vi.mock('../../services/queries/routeSheets', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUpdateRouteSheet: () => state.update,
  useCreateRouteSheet: () => state.create,
}));
vi.mock('../../services/queries/stock', () => ({
  useWarehouses: () =>
    ok([
      { warehouseId: uuid(900), name: 'Depósito central', isDefault: true, address: 'Av. Quaranta 2150' },
      { warehouseId: uuid(901), name: 'Galpón Norte', isDefault: false, address: null },
    ]),
}));
vi.mock('../../utils/notifications', () => ({ notify: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { SheetFormModal } from './SheetFormModal';

beforeEach(() => {
  state.update = mutation();
  state.create = mutation();
});
afterEach(cleanup);

describe('SheetFormModal', () => {
  it('cambia el depósito de salida: manda sólo eso, con la versión de la hoja', async () => {
    const current = sheet({ version: 6 });
    render(<SheetFormModal day={planDay()} sheet={current} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Depósito de salida'), { target: { value: uuid(901) } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(state.update.mutate).toHaveBeenCalledWith(
        { sheet: current, changes: { originWarehouseId: uuid(901) } },
        expect.anything(),
      ),
    );
  });

  it('la hora de salida va en hora argentina; vaciarla no promete volver al cálculo', async () => {
    render(<SheetFormModal day={planDay()} sheet={sheet()} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText(/la que calcula el sistema/)).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Hora de salida'), { target: { value: '06:15' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(state.update.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ changes: { plannedStartAt: '2026-11-14T09:15:00.000Z' } }),
        expect.anything(),
      ),
    );
  });

  it('el alta no pide depósito ni salida', () => {
    render(<SheetFormModal day={planDay()} onClose={vi.fn()} />);
    expect(screen.queryByLabelText('Depósito de salida')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hora de salida')).not.toBeInTheDocument();
  });
});
