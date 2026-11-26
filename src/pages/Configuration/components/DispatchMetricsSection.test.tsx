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
  ofertasConEstimacion: 25,
  porcentajeOrdenadasPorOsrm: 84,
  minutosEstimadosPromedio: 7.4,
  pedidosAsignados: 40,
  asignadosSinMetodo: 8,
  asignacionPorMetodo: [
    { method: 'automatic', cantidad: 24, porcentaje: 75 },
    { method: 'manual_override', cantidad: 4, porcentaje: 12.5 },
    { method: 'route_sheet', cantidad: 3, porcentaje: 9.4 },
    { method: 'batch', cantidad: 1, porcentaje: 3.1 },
  ],
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
    expect(screen.getByText('84 %')).toBeInTheDocument();
    expect(screen.getByText('7,4 min')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(table).getByText('9 (90 %)')).toBeInTheDocument();
    expect(within(table).getByText('—')).toBeInTheDocument();
  });

  it('muestra el porcentaje por método de asignación y avisa de los pedidos viejos sin método', () => {
    state.query = ok(metrics());
    render(<DispatchMetricsSection />);
    const lista = screen.getByRole('list', { name: 'Pedidos asignados por método' });
    expect(within(lista).getByText('Automático')).toBeInTheDocument();
    expect(within(lista).getByText('75 %')).toBeInTheDocument();
    expect(within(lista).getByText('24 pedidos')).toBeInTheDocument();
    expect(within(lista).getByText('Hoja de ruta')).toBeInTheDocument();
    expect(screen.getByText(/8 pedidos anteriores no tienen el método registrado/)).toBeInTheDocument();
  });

  it('si ningún pedido asignado tiene método, lo dice en vez de mostrar ceros', () => {
    state.query = ok(
      metrics({
        pedidosAsignados: 5,
        asignadosSinMetodo: 5,
        asignacionPorMetodo: metrics().asignacionPorMetodo.map((m) => ({ ...m, cantidad: 0, porcentaje: null })),
      }),
    );
    render(<DispatchMetricsSection />);
    expect(screen.queryByRole('list', { name: 'Pedidos asignados por método' })).not.toBeInTheDocument();
    expect(screen.getByText(/Todavía no hay pedidos asignados con el método registrado/)).toBeInTheDocument();
  });

  it('sin ofertas medidas las dos cifras nuevas muestran un guion y lo explican', () => {
    state.query = ok(
      metrics({ ofertasConEstimacion: 0, porcentajeOrdenadasPorOsrm: null, minutosEstimadosPromedio: null }),
    );
    render(<DispatchMetricsSection />);
    expect(screen.getByText('Todavía sin ofertas medidas')).toBeInTheDocument();
    expect(screen.queryByText(/min$/, { selector: 'p' })).toBeNull();
  });

  it('sin pedidos explica que todavía no hay datos', () => {
    state.query = ok(
      metrics({
        pedidosDespachados: 0,
        pedidosSinChofer: 0,
        pedidosAsignados: 0,
        asignadosSinMetodo: 0,
        topChoferes: [],
      }),
    );
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
