import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  perms: { isSuperAdmin: false, needsDistributor: false },
  summary: undefined as unknown,
  runs: vi.fn(),
}));
vi.mock('../../hooks', () => ({ usePermissions: () => state.perms }));
vi.mock('../../services/queries/distributors', () => ({
  useDistributors: () => ({ data: [{ distributor_id: 'd1', name: 'Jeny Gas' }] }),
}));
vi.mock('../../services/queries/processRuns', () => ({
  useProcessSummary: () => state.summary,
  useProcessRuns: (params: unknown) => state.runs(params) as unknown,
}));

import { ProcessMonitor } from './ProcessMonitor';

const run = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  process: 'fleet_alerts',
  title: 'Aviso de vencimientos de flota',
  distributorId: null,
  startedAt: '2026-11-03T12:00:00.000Z',
  finishedAt: '2026-11-03T12:00:02.000Z',
  durationMs: 1800,
  status: 'ok',
  counters: { processed: 4 },
  error: null,
  trigger: 'cron',
  ...over,
});

const item = (process: string, health: string, over: Record<string, unknown> = {}) => ({
  process,
  title: `Proceso ${process}`,
  module: null,
  distributorId: null,
  health,
  lastRun: run({ process }),
  lastOkAt: null,
  expectedEverySeconds: 3600,
  nextExpectedAt: '2026-11-03T13:00:00.000Z',
  ...over,
});

const setup = () =>
  render(
    <MemoryRouter>
      <ProcessMonitor />
    </MemoryRouter>,
  );

beforeEach(() => {
  state.perms = { isSuperAdmin: false, needsDistributor: false };
  state.runs.mockReturnValue(ok({ items: [run()], total: 1 }));
  state.summary = ok({
    items: [
      item('ok_one', 'ok'),
      item('boom', 'failed', { lastRun: run({ status: 'failed', error: 'connect ECONNREFUSED', counters: {} }) }),
      item('slow', 'late'),
      item('never_one', 'never', { lastRun: null, nextExpectedAt: null }),
    ],
    alerts: 2,
    generatedAt: '2026-11-03T12:30:00.000Z',
  });
});
afterEach(cleanup);

describe('ProcessMonitor', () => {
  it('muestra una tarjeta por proceso con su salud, contadores y error', () => {
    setup();
    expect(screen.getByRole('heading', { level: 3, name: 'Proceso ok_one' })).toBeInTheDocument();
    expect(screen.getByText('Al día')).toBeInTheDocument();
    const cardOf = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li') as HTMLElement;
    expect(within(cardOf('Proceso boom')).getByText('Falló')).toBeInTheDocument();
    expect(within(cardOf('Proceso slow')).getByText('Atrasado')).toBeInTheDocument();
    expect(within(cardOf('Proceso never_one')).getByText('Sin corridas')).toBeInTheDocument();
    expect(screen.getByText('connect ECONNREFUSED')).toBeInTheDocument();
    expect(screen.getByText('Todavía no corrió desde que se activó el monitoreo.')).toBeInTheDocument();
    expect(screen.getAllByText('Procesados:').length).toBeGreaterThan(0);
  });

  it('avisa cuántos procesos necesitan atención y los muestra primero', () => {
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent('2 procesos necesitan atención');
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles.slice(0, 2)).toEqual(['Proceso boom', 'Proceso slow']);
  });

  it('sin alertas no muestra el aviso', () => {
    state.summary = ok({ items: [item('ok_one', 'ok')], alerts: 0, generatedAt: '2026-11-03T12:30:00.000Z' });
    setup();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el historial pide la primera página y filtra por resultado', () => {
    setup();
    expect(state.runs).toHaveBeenLastCalledWith({
      process: undefined,
      status: undefined,
      from: undefined,
      to: undefined,
      limit: 25,
      offset: 0,
    });
    fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'failed' } });
    expect(state.runs).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'failed', offset: 0 }));
    expect(screen.getByText(/Resultado: Falló/)).toBeInTheDocument();
  });

  it('el historial muestra el vacío cuando no hay corridas', () => {
    state.runs.mockReturnValue(ok({ items: [], total: 0 }));
    setup();
    expect(screen.getByText('No hay corridas registradas con esos filtros.')).toBeInTheDocument();
  });

  it('el administrador general sin «Ver como» ve el rótulo de cada empresa y el aviso', () => {
    state.perms = { isSuperAdmin: true, needsDistributor: true };
    state.summary = ok({
      items: [item('ok_one', 'ok', { distributorId: 'd1' })],
      alerts: 0,
      generatedAt: '2026-11-03T12:30:00.000Z',
    });
    setup();
    expect(screen.getByText(/Estás viendo todas las distribuidoras/)).toBeInTheDocument();
    const card = screen.getByRole('heading', { level: 3, name: 'Proceso ok_one' }).closest('li') as HTMLElement;
    expect(within(card).getByText(/Jeny Gas/)).toBeInTheDocument();
  });

  it('muestra el esqueleto mientras carga y el error con reintento', () => {
    state.summary = loading();
    setup();
    expect(screen.getByRole('status', { name: 'Cargando procesos' })).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    state.summary = failed(refetch);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('sin procesos muestra el vacío', () => {
    state.summary = ok({ items: [], alerts: 0, generatedAt: '2026-11-03T12:30:00.000Z' });
    setup();
    expect(screen.getByText('No hay procesos para mostrar')).toBeInTheDocument();
  });

  it('si falla la consulta del historial muestra el error con reintento y no «Sin corridas»', () => {
    const refetch = vi.fn();
    state.runs.mockReturnValue(failed(refetch));
    setup();
    expect(screen.queryByText('No hay corridas registradas con esos filtros.')).not.toBeInTheDocument();
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});
