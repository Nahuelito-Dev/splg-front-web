import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockControlCard } from './StockControlCard';

const state = vi.hoisted(() => ({
  perms: { needsDistributor: false, canWrite: true, writeHint: undefined as string | undefined },
  settings: {
    data: { requireOpenTruckLoad: false } as { requireOpenTruckLoad: boolean } | undefined,
    isPending: false,
    error: null as unknown,
  },
  confirmed: true,
}));
const mutate = vi.hoisted(() => vi.fn());
const settingsOptions = vi.hoisted(() => vi.fn());
vi.mock('../../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../../services/queries/truckLoads', () => ({
  useStockControlSettings: (options: { enabled?: boolean }) => {
    settingsOptions(options);
    return { ...state.settings, refetch: vi.fn() };
  },
  useUpdateStockControlSettings: () => ({ mutate, isPending: false }),
}));
vi.mock('../../../utils/notifications', () => ({
  confirm: () => Promise.resolve(state.confirmed),
  notify: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  cleanup();
  mutate.mockReset();
  settingsOptions.mockReset();
  state.confirmed = true;
  state.perms = { needsDistributor: false, canWrite: true, writeHint: undefined };
  state.settings = { data: { requireOpenTruckLoad: false }, isPending: false, error: null };
});

describe('StockControlCard', () => {
  it('con distribuidora consulta con enabled: true', () => {
    render(<StockControlCard />);
    expect(settingsOptions).toHaveBeenCalledWith({ enabled: true });
  });

  it('explica la regla y enciende el interruptor tras confirmar', async () => {
    render(<StockControlCard />);
    expect(screen.getByText(/Encendido: un chofer solo recibe/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect((mutate.mock.calls[0] as unknown[])[0]).toEqual({ requireOpenTruckLoad: true });
  });

  it('si no se confirma, no cambia nada', async () => {
    state.confirmed = false;
    render(<StockControlCard />);
    fireEvent.click(screen.getByRole('switch'));
    await new Promise((r) => setTimeout(r, 20));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('sin distribuidora elegida no consulta ni muestra el interruptor', () => {
    state.perms = { needsDistributor: true, canWrite: false, writeHint: 'Elegí' };
    render(<StockControlCard />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText(/Elegí una distribuidora/)).toBeInTheDocument();
    expect(settingsOptions).toHaveBeenCalledWith({ enabled: false });
  });

  it('si la consulta falla muestra el error, no un interruptor apagado', () => {
    state.settings = { data: undefined, isPending: false, error: new Error('boom') };
    render(<StockControlCard />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
  });
});
