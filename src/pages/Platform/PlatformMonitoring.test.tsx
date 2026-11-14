import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok, renderPage } from '../../test/pageTest';
import { companyItem, platformProcesses } from '../../test/platformFixtures';

const state = vi.hoisted(() => ({
  processes: undefined as unknown,
  summary: undefined as unknown,
  summaryFor: vi.fn(),
  runs: vi.fn(),
}));
vi.mock('../../services/queries/platformConsole', () => ({
  usePlatformProcesses: () => state.processes,
  useAllPlatformCompanies: () => ({
    companies: [companyItem({ id: 'c1', name: 'Nahuel Gas' }), companyItem({ id: 'c2' })],
    total: 2,
    loading: false,
    error: null,
  }),
}));
vi.mock('../../services/queries/processRuns', () => ({
  useProcessSummary: (id: unknown) => {
    state.summaryFor(id);
    return state.summary;
  },
  useProcessRuns: (params: unknown) => state.runs(params) as unknown,
}));

import { PlatformMonitoring } from './PlatformMonitoring';

const summaryItem = (over: Record<string, unknown> = {}) => ({
  process: 'fleet_alerts',
  title: 'Aviso de vencimientos de flota',
  module: null,
  distributorId: 'c1',
  health: 'ok',
  lastRun: null,
  lastOkAt: null,
  expectedEverySeconds: 3600,
  nextExpectedAt: null,
  ...over,
});

const render = (url = '/platform/monitoring') => renderPage(<PlatformMonitoring />, { url });

beforeEach(() => {
  state.processes = ok(platformProcesses());
  state.summary = ok({ items: [summaryItem()], alerts: 0, generatedAt: '2026-11-14T17:00:00.000Z' });
  state.runs.mockReturnValue(ok({ items: [], total: 0 }));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Monitoreo (plataforma)', () => {
  it('por proceso: alerta general, lo que tiene alertas primero y la salud por empresa', () => {
    render();
    expect(screen.getByRole('alert')).toHaveTextContent('1 proceso necesita atención');
    const list = screen.getByText('Por proceso').closest('div.rounded-card') ?? document.body;
    const titles = within(list as HTMLElement)
      .getAllByText(/Aviso de stock bajo|Despacho: tic de asignación/)
      .map((n) => n.textContent);
    expect(titles).toEqual(['Aviso de stock bajo', 'Despacho: tic de asignación']);
    expect(screen.getByText('Atrasado: 1')).toBeInTheDocument();
    expect(screen.getByText('Al día: 3')).toBeInTheDocument();
    expect(screen.getByText('2 fallas en 24 h')).toBeInTheDocument();
    expect(screen.getByText(/cada 15 s · 3 empresas/)).toBeInTheDocument();
  });

  it('sin empresa elegida pide el resumen de todas y rotula cada tarjeta con la suya', () => {
    render();
    expect(state.summaryFor).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByText('Nahuel Gas')).toBeInTheDocument();
  });

  it('una empresa que no está en la lista de vigentes no se rotula como «otra»', () => {
    state.summary = ok({
      items: [summaryItem({ distributorId: 'c-baja' })],
      alerts: 0,
      generatedAt: '2026-11-14T17:00:00.000Z',
    });
    render();
    expect(screen.getByText(/· Empresa no vigente/)).toBeInTheDocument();
    expect(screen.queryByText(/Otra distribuidora/)).not.toBeInTheDocument();
  });

  it('con una empresa elegida pide su resumen y su historial', () => {
    render('/platform/monitoring?company=c1');
    expect(state.summaryFor).toHaveBeenLastCalledWith('c1');
    expect(state.runs).toHaveBeenLastCalledWith(expect.objectContaining({ distributorId: 'c1' }));
  });

  it('elegir una empresa en el selector filtra', () => {
    render();
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'c1' } });
    expect(state.summaryFor).toHaveBeenLastCalledWith('c1');
  });

  it('una empresa sin procesos muestra el vacío', () => {
    state.summary = ok({ items: [], alerts: 0, generatedAt: '' });
    render('/platform/monitoring?company=c2');
    expect(screen.getByText('Sin procesos para mostrar')).toBeInTheDocument();
  });

  it('carga de pantalla entera y error con reintento', () => {
    state.processes = loading();
    render();
    expect(screen.getByText('Cargando los procesos…')).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    state.processes = failed(refetch);
    render();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);
    expect(refetch).toHaveBeenCalled();
  });
});
