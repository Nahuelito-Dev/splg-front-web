import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, loading, ok } from '../../../test/pageTest';
import { DispatchMetricsSection } from './DispatchMetricsSection';

const state = vi.hoisted(() => ({ allowed: true, query: undefined as unknown }));
vi.mock('../../../hooks/usePermiso', () => ({ usePermiso: () => ({ known: true, allowed: state.allowed }) }));
vi.mock('../../../services/queries/dispatchMetrics', () => ({ useDispatchMetrics: () => state.query }));

const metrics = (over: Record<string, unknown> = {}) => ({
  from: '2026-10-18T00:00:00.000Z',
  to: '2026-11-17T00:00:00.000Z',
  pedidosDespachados: 40,
  ofertasPorPedido: 1.7,
  porcentajeAceptadas: 58.8,
  porcentajeRechazadas: 20,
  porcentajeVencidas: 21.2,
  respuestaDelChofer: { mediana: 12, p90: 28 },
  hastaAsignar: { mediana: 95, p90: 240 },
  pedidosSinChofer: 3,
  topChoferes: [
    { driverId: 'd1', nombre: 'Ana Pérez', ofertas: 10, aceptadas: 9, tasaAceptacion: 90, medianaRespuestaSegundos: 8 },
    {
      driverId: 'd2',
      nombre: 'Beto Gómez',
      ofertas: 5,
      aceptadas: 2,
      tasaAceptacion: 40,
      medianaRespuestaSegundos: null,
    },
  ],
  ...over,
});

afterEach(() => {
  cleanup();
  state.allowed = true;
});

describe('DispatchMetricsSection', () => {
  it('muestra las cifras en tarjetas y el top de choferes', () => {
    state.query = ok(metrics());
    render(<DispatchMetricsSection />);
    expect(screen.getByRole('heading', { name: 'Cómo viene el despacho' })).toBeInTheDocument();
    expect(screen.getByText('58,8 %')).toBeInTheDocument();
    expect(screen.getByText('1,7')).toBeInTheDocument();
    expect(screen.getByText('1 min 35 s')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(table).getByText('9 (90 %)')).toBeInTheDocument();
    expect(within(table).getByText('—')).toBeInTheDocument();
  });

  it('sin pedidos explica que todavía no hay datos', () => {
    state.query = ok(metrics({ pedidosDespachados: 0, pedidosSinChofer: 0, topChoferes: [] }));
    render(<DispatchMetricsSection />);
    expect(screen.getByText('Todavía no hay pedidos despachados')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('con pedidos pero sin choferes que hayan respondido, lo dice', () => {
    state.query = ok(metrics({ topChoferes: [] }));
    render(<DispatchMetricsSection />);
    expect(screen.getByText(/Todavía ningún chofer respondió/)).toBeInTheDocument();
  });

  it('muestra la carga y el error con reintento', () => {
    state.query = loading();
    const { unmount } = render(<DispatchMetricsSection />);
    expect(screen.getByRole('status', { name: /Cargando las cifras/ })).toBeInTheDocument();
    unmount();
    state.query = failed();
    render(<DispatchMetricsSection />);
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });

  it('sin el permiso de pedidos no aparece', () => {
    state.allowed = false;
    state.query = ok(metrics());
    const { container } = render(<DispatchMetricsSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
