import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import { emptyPlatformChatMetrics, platformChatMetrics } from '../../../test/chatMetricsFixtures';
import { failed, loading, ok, renderPage } from '../../../test/pageTest';

const state = vi.hoisted(() => ({ metrics: undefined as unknown, params: vi.fn() }));

const downloadCsv = vi.hoisted(() => vi.fn<[string, string], void>());
vi.mock('../../../utils/csv', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  downloadCsv,
}));
vi.mock('../../../common/components/ui/ResponsiveTable', () => import('../../../test/responsiveTableStub'));
vi.mock('../../../services/queries/platformConsole', () => ({
  useAllPlatformCompanies: () => ({
    companies: [{ id: 'd-1', name: 'Florchi', ownedByPlatform: false }],
    total: 1,
    loading: false,
    error: null,
  }),
}));
vi.mock('../../../services/queries/chatMetrics', () => ({
  usePlatformChatMetrics: (params: unknown, enabled: boolean) => {
    state.params(params, enabled);
    return state.metrics;
  },
}));

import { SupportMetrics } from './SupportMetrics';

const URL = '/platform/support-metrics';
const render = (url = URL) => renderPage(<SupportMetrics />, { url, path: URL });
const kpi = (title: string) => {
  const card = screen.getByText(title).closest('div.flex.min-h-\\[80px\\]');
  if (!(card instanceof HTMLElement)) throw new Error(`Sin la tarjeta «${title}»`);
  return card;
};

/** La consulta falló con este error de la API. */
const failedWith = (status: number, message: string) => ({ ...failed(), error: new ApiError(status, [message]) });

beforeEach(() => {
  state.metrics = ok(platformChatMetrics());
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Tablero de soporte', () => {
  it('chat con las empresas: esperando, espera, primera respuesta y % que termina en ticket', () => {
    render();
    expect(within(kpi('Esperando ahora')).getByText('1')).toBeInTheDocument();
    expect(within(kpi('Esperando ahora')).getByText('La más larga: 35 min hábiles')).toBeInTheDocument();
    expect(within(kpi('Espera')).getByText('Mediana hábil de 1 esperando')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Primera respuesta: mediana de 10 chats respondidos; 9 de cada 10, en 20 min hábiles o menos. 0 cerrados sin respuesta de una persona: no se miden.',
      ),
    ).toBeInTheDocument();
    expect(within(kpi('Terminan en ticket')).getByText('16,7 %')).toBeInTheDocument();
    expect(within(kpi('Terminan en ticket')).getByText('2 de 12 chats del período')).toBeInTheDocument();
  });

  it('tickets: abiertos y vencidos, primera respuesta contra el vencimiento, resolución y calificación', () => {
    render();
    expect(within(kpi('Abiertos ahora')).getByText('1 vencidos')).toBeInTheDocument();
    expect(within(kpi('Antes del vencimiento')).getByText('75 %')).toBeInTheDocument();
    expect(within(kpi('Antes del vencimiento')).getByText('3 de 4 medidos')).toBeInTheDocument();
    expect(within(kpi('Resolución')).getByText('4 h')).toBeInTheDocument();
    expect(
      within(kpi('Resolución')).getByText('Mediana de 3 resueltos, en tiempo corrido (no hábil)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Primera respuesta: mediana de 4 tickets respondidos; 9 de cada 10, en 2 h hábiles o menos. 0 cerrados sin respuesta de una persona: no se miden.',
      ),
    ).toBeInTheDocument();
    expect(within(kpi('Calificación')).getByText('5,0 de 5')).toBeInTheDocument();
    expect(within(kpi('Calificación')).getByText('2 calificados · 66,7 % de los cerrados')).toBeInTheDocument();
  });

  it('el asistente del soporte y el uso por empresa (sólo conteos)', () => {
    render();
    expect(screen.getByRole('list', { name: 'Motivos de derivación' })).toBeInTheDocument();
    expect(screen.getByText('82 conversaciones · 667 mensajes')).toBeInTheDocument();
    expect(screen.getByText('Asistente: 4 respuestas · 25 % sin persona')).toBeInTheDocument();
    expect(screen.getByText('Asistente: —')).toBeInTheDocument();
  });

  it('busca empresas en la tabla sin volver a consultar', () => {
    render();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar empresas' }), { target: { value: 'sur' } });
    expect(screen.queryByText('Florchi Gas')).not.toBeInTheDocument();
    expect(screen.getByText('Gas del Sur')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar empresas' }), { target: { value: 'zzz' } });
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(state.params).toHaveBeenLastCalledWith({ distributorId: undefined }, true);
  });

  it('el CSV por empresa lleva el porcentaje ×100, con «(%)» en el encabezado', async () => {
    render();
    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Exportar CSV' }));
    const csv = downloadCsv.mock.calls[0]?.[1] ?? '';
    expect(csv.split('\n')).toEqual([
      'Empresa;Conversaciones;Mensajes;Respuestas del asistente;Resueltas sin persona (%)',
      'Florchi Gas;82;667;4;25',
      'Gas del Sur;3;12;;',
    ]);
  });

  it('el filtro de empresa va en su versión de barra, con la etiqueta adentro («Empresa: Todas»)', () => {
    render();
    expect(screen.getByTestId('toolbar-select-text')).toHaveTextContent('Empresa: Todas');
  });

  it('la empresa elegida viaja a la API', () => {
    render();
    expect(state.params).toHaveBeenLastCalledWith({ distributorId: undefined }, true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Empresa' }), { target: { value: 'd-1' } });
    expect(state.params).toHaveBeenLastCalledWith({ distributorId: 'd-1' }, true);
  });

  it('un período sin actividad: ceros y guiones, nunca NaN', () => {
    state.metrics = ok(emptyPlatformChatMetrics());
    render();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|null/);
    expect(within(kpi('Esperando ahora')).getByText('Nadie espera respuesta')).toBeInTheDocument();
    expect(within(kpi('Terminan en ticket')).getByText('—')).toBeInTheDocument();
    expect(within(kpi('Abiertos ahora')).getByText('Sin vencidos')).toBeInTheDocument();
    expect(screen.getByText('Sin tickets calificados en el período')).toBeInTheDocument();
    expect(screen.getByText('Sin uso del chat en el período')).toBeInTheDocument();
  });

  it('sin el permiso de la plataforma: un aviso de permiso con el mensaje de la API, sin «Reintentar»', () => {
    state.metrics = failedWith(403, 'No tenés permiso para ver los tickets');
    render();
    expect(screen.getByText('No tenés permiso para ver el tablero de soporte')).toBeInTheDocument();
    expect(screen.getByText('No tenés permiso para ver los tickets')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(screen.queryByText('Chat con las empresas')).not.toBeInTheDocument();
  });

  it('una empresa que no existe: el 404 lo dice', () => {
    state.metrics = failedWith(404, 'No existe la empresa');
    render(`${URL}?empresa=d-9`);
    expect(screen.getByText('La empresa no existe')).toBeInTheDocument();
  });

  it('mientras llega otro período, lo anterior queda atenuado y marcado como ocupado', () => {
    state.metrics = ok(platformChatMetrics(), { isPlaceholderData: true });
    render();
    const busy = screen.getByText('Chat con las empresas', { selector: 'h2' }).closest('[aria-busy]');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toHaveClass('opacity-60');
  });

  it('un período inválido no consulta ni muestra las fechas anteriores', () => {
    render(`${URL}?from=2026-11-10&to=2026-11-01`);
    expect(screen.getByText('La fecha «desde» no puede ser posterior a la fecha «hasta».')).toBeInTheDocument();
    expect(screen.queryByText(/^Del /)).not.toBeInTheDocument();
    expect(state.params).toHaveBeenLastCalledWith(expect.anything(), false);
  });

  it('mientras carga, el estado de carga; un error se puede reintentar', () => {
    state.metrics = loading();
    render();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el tablero de soporte…');
    cleanup();
    const refetch = vi.fn();
    state.metrics = failed(refetch);
    render();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});
