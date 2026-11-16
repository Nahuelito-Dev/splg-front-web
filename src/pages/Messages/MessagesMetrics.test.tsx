import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { assistantMetrics, chatMetrics, emptyAssistantMetrics, emptyChatMetrics } from '../../test/chatMetricsFixtures';
import { failed, loading, ok, renderPage } from '../../test/pageTest';

/** Todos los permisos de mensajes; cada test saca los que no tiene quien mira. */
const ALL = ['mensajes.supervisar', 'mensajes.clientes', 'mensajes.choferes', 'mensajes.configurar'];

const state = vi.hoisted(() => ({
  metrics: undefined as unknown,
  params: vi.fn(),
  granted: new Set<string>(),
  permisosKnown: true,
  templates: undefined as unknown,
  templatesEnabled: vi.fn(),
}));

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../features/chat/metrics/DailyChart', () => ({
  DailyChart: () => <div role="img" aria-label="Gráfico diario" />,
}));
// Los permisos por código: `useInboxAccess` es el de verdad y lee de acá.
vi.mock('../../hooks/usePermiso', () => ({
  usePermiso: (code: string) => ({ allowed: state.granted.has(code), known: state.permisosKnown }),
}));
vi.mock('../../hooks/usePermissions', () => ({ usePermissions: () => ({ mode: 'company' }) }));
vi.mock('../../services/queries/modules', () => ({ useModuleGate: () => ({ ready: true, off: false }) }));
vi.mock('../../services/queries/inbox', () => ({
  useCompanyTemplates: (_params: unknown, enabled: boolean) => {
    state.templatesEnabled(enabled);
    return enabled ? state.templates : { data: undefined };
  },
}));
vi.mock('../../services/queries/chatMetrics', () => ({
  useChatMetrics: (params: unknown, enabled: boolean) => {
    state.params(params, enabled);
    return state.metrics;
  },
}));

import { MessagesMetrics } from './MessagesMetrics';

const URL = '/messages/metrics';
const render = (url = URL) => renderPage(<MessagesMetrics />, { url, path: URL });

beforeEach(() => {
  state.metrics = ok(chatMetrics());
  state.granted = new Set(ALL);
  state.permisosKnown = true;
  state.templates = ok({ items: [{ key: 'saludo', title: 'Saludo de bienvenida' }] });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const kpi = (title: string) => {
  const card = screen.getByText(title).closest('div.flex.min-h-\\[80px\\]');
  if (!(card instanceof HTMLElement)) throw new Error(`Sin la tarjeta «${title}»`);
  return card;
};
/** Las filas de la tabla de respuestas guardadas (la vista de tarjetas del stub). */
const savedReplies = () => {
  const card = screen.getByRole('heading', { name: 'Respuestas guardadas' }).closest('.flex-col');
  if (!(card instanceof HTMLElement)) throw new Error('Sin la tarjeta de respuestas guardadas');
  return within(card)
    .getAllByRole('listitem')
    .map((li) => li.textContent);
};

describe('Métricas de mensajes', () => {
  it('muestra lo que da la API: primera respuesta en minutos hábiles, objetivo, resolución y su base', () => {
    render();
    expect(within(kpi('Primera respuesta')).getByText('12 min')).toBeInTheDocument();
    expect(within(kpi('Dentro del objetivo')).getByText('85,4 %')).toBeInTheDocument();
    expect(within(kpi('Dentro del objetivo')).getByText('35 de 41 medidas')).toBeInTheDocument();
    expect(within(kpi('Sin respuesta del período')).getByText('3')).toBeInTheDocument();
    expect(within(kpi('Resolución')).getByText('1 h 35 min')).toBeInTheDocument();
    expect(
      within(kpi('Resolución')).getByText('Mediana de 60 cerradas, en tiempo corrido (no hábil)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Primera respuesta: mediana de 40 conversaciones respondidas; 9 de cada 10, en 45 min hábiles o menos. 5 cerradas sin respuesta de una persona: no se miden.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Objetivo de primera respuesta: 30 min hábiles/)).toBeInTheDocument();
    expect(screen.getByText('Del 18 oct 2026 al 16 nov 2026')).toBeInTheDocument();
  });

  it('lo abierto en vivo va dentro de la pestaña y nombra el canal', () => {
    render(`${URL}?canal=staff_driver`);
    const panel = screen.getByRole('tabpanel');
    const live = within(panel).getByRole('list', { name: 'Conversaciones con choferes ahora, en vivo' });
    expect(within(live).getByText('Sin asignar').parentElement).toHaveTextContent('2');
    cleanup();
    render();
    expect(
      screen.getByRole('list', { name: 'Conversaciones con clientes y choferes ahora, en vivo' }),
    ).toBeInTheDocument();
  });

  it('el asistente: resueltas sin persona y los motivos de derivación en barras', () => {
    render();
    expect(within(kpi('Resueltas sin una persona')).getByText('25 %')).toBeInTheDocument();
    expect(within(kpi('Resueltas sin una persona')).getByText('1 de 4 cerradas con el asistente')).toBeInTheDocument();
    const reasons = screen.getByRole('list', { name: 'Motivos de derivación' });
    expect(within(reasons).getByRole('meter', { name: 'El cliente pidió hablar con una persona' })).toHaveAttribute(
      'aria-valuenow',
      '3',
    );
    expect(screen.queryByText('El asistente está apagado')).not.toBeInTheDocument();
  });

  it('la encuesta: promedio, tasa de respuesta y los cinco puntajes', () => {
    render();
    expect(within(kpi('Promedio')).getByText('4,5 de 5')).toBeInTheDocument();
    expect(within(kpi('Respondieron la encuesta')).getByText('33,3 %')).toBeInTheDocument();
    expect(within(kpi('Respondieron la encuesta')).getByText('2 de 6 pedidas')).toBeInTheDocument();
    const bars = screen.getByRole('list', { name: 'Respuestas por puntaje' });
    expect(
      within(bars)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['5 de 51', '4 de 51', '3 de 50', '2 de 50', '1 de 50']);
  });

  it('respuestas automáticas por nombre: el mismo aviso con dos claves suma en una barra; una clave desconocida no se muestra', () => {
    state.metrics = ok(
      chatMetrics({
        automaticReplies: {
          total: 26,
          byKey: [
            { key: 'fuera_de_horario', count: 10 },
            { key: 'recibido', count: 8 },
            { key: 'received_ack', count: 5 },
            { key: 'clave_nueva', count: 3 },
          ],
        },
      }),
    );
    render();
    const list = screen.getByRole('list', { name: 'Respuestas automáticas por tipo' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Aviso de recibido13', 'Fuera de horario10', 'Otra respuesta automática3']);
    expect(document.body.textContent).not.toMatch(/clave_nueva|received_ack/);
  });

  it('respuestas guardadas por título, la más usada primero; la que ya no existe, sin la clave interna', () => {
    render();
    expect(savedReplies()).toEqual(['Respuesta guardada que ya no existe6', 'Saludo de bienvenida4']);
    expect(screen.queryByText('demora')).not.toBeInTheDocument();
    expect(screen.queryByText('Clave')).not.toBeInTheDocument();
  });

  it('si no se pudieron leer las plantillas, las nombra genéricas', () => {
    state.templates = failed();
    render();
    expect(savedReplies()).toEqual(['Respuesta guardada6', 'Respuesta guardada4']);
  });

  it('quien sólo supervisa también lee las plantillas: las respuestas guardadas salen con su nombre', () => {
    state.granted = new Set(['mensajes.supervisar']);
    render();
    expect(state.templatesEnabled).toHaveBeenLastCalledWith(true);
  });

  it('un período sin datos: ceros y guiones, nunca NaN, y los vacíos de cada bloque', () => {
    state.metrics = ok(emptyChatMetrics());
    render();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|null/);
    expect(within(kpi('Primera respuesta')).getByText('—')).toBeInTheDocument();
    expect(within(kpi('Dentro del objetivo')).getByText('—')).toBeInTheDocument();
    expect(within(kpi('Conversaciones')).getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Sin conversaciones en el período')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Gráfico diario' })).not.toBeInTheDocument();
    expect(screen.getByText('Sin derivaciones en el período')).toBeInTheDocument();
    expect(screen.getByText('Sin respuestas a la encuesta en el período')).toBeInTheDocument();
    expect(screen.getByText('Sin respuestas guardadas usadas')).toBeInTheDocument();
  });

  it('con el asistente apagado y sin actividad lo dice y lleva justo a Mensajes y horario', () => {
    state.metrics = ok(emptyChatMetrics({ assistant: { ...emptyAssistantMetrics(), enabled: false } }));
    rtlRender(
      <MemoryRouter initialEntries={[URL]}>
        <Routes>
          <Route path={URL} element={<MessagesMetrics />} />
          <Route path="/messages/settings" element={<p>Pantalla de Mensajes y horario</p>} />
          <Route path="*" element={<p>otra ruta</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('El asistente está apagado')).toBeInTheDocument();
    expect(screen.queryByText('Resueltas sin una persona')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ir a Mensajes y horario' }));
    expect(screen.getByText('Pantalla de Mensajes y horario')).toBeInTheDocument();
  });

  it('apagado pero con actividad en el período: el aviso y lo que hizo', () => {
    state.metrics = ok(chatMetrics({ assistant: { ...assistantMetrics(), enabled: false } }));
    render();
    expect(screen.getByText('El asistente está apagado')).toBeInTheDocument();
    expect(within(kpi('Resueltas sin una persona')).getByText('25 %')).toBeInTheDocument();
  });

  it('quien supervisa sin configurar no ve los atajos a la configuración: se le dice a quién pedirlo', () => {
    state.granted = new Set(['mensajes.supervisar']);
    state.metrics = ok(chatMetrics({ assistant: { ...emptyAssistantMetrics(), enabled: false } }));
    render();
    expect(screen.queryByRole('link', { name: 'Cambiar el objetivo' })).not.toBeInTheDocument();
    expect(screen.getByText(/para cambiarlo, pedile a quien configura los mensajes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ir a Mensajes y horario' })).not.toBeInTheDocument();
    expect(screen.getByText(/Para prenderlo, pedile a quien configura los mensajes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ir a la bandeja' })).not.toBeInTheDocument();
  });

  it('con configurar, el link al objetivo lleva a Mensajes y horario', () => {
    render();
    expect(screen.getByRole('link', { name: 'Cambiar el objetivo' })).toHaveAttribute('href', '/messages/settings');
  });

  it('sin la función del asistente (o sólo choferes) no aparece el bloque ni la encuesta', () => {
    state.metrics = ok(chatMetrics({ channel: 'staff_driver', assistant: null, satisfaction: null }));
    render(`${URL}?canal=staff_driver`);
    expect(screen.queryByText('Asistente con los clientes')).not.toBeInTheDocument();
    expect(screen.queryByText('Satisfacción de los clientes')).not.toBeInTheDocument();
    expect(screen.getByText(/La encuesta y el asistente son de los clientes/)).toBeInTheDocument();
  });

  it('el canal y el período viajan a la API; sin fechas no se mandan (30 días de la API)', () => {
    render();
    expect(state.params).toHaveBeenLastCalledWith({ channel: undefined }, true);
    expect(screen.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Choferes' }));
    expect(state.params).toHaveBeenLastCalledWith({ channel: 'staff_driver' }, true);

    fireEvent.click(screen.getByRole('button', { name: '7 días' }));
    const [last] = state.params.mock.lastCall as [Record<string, string>];
    expect(last.channel).toBe('staff_driver');
    expect(last.from < last.to).toBe(true);
    expect(screen.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('mientras llega otro período, lo anterior queda atenuado y marcado como ocupado', () => {
    state.metrics = ok(chatMetrics(), { isPlaceholderData: true });
    render();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('tabpanel')).toHaveClass('opacity-60');
    cleanup();
    state.metrics = ok(chatMetrics(), { isPlaceholderData: false });
    render();
    expect(screen.getByRole('tabpanel')).not.toHaveAttribute('aria-busy');
  });

  it('un rango que la API rechazaría no se consulta: lo dice y no muestra fechas viejas', () => {
    render(`${URL}?from=2025-01-01&to=2026-11-16`);
    expect(screen.getByText('El período puede abarcar hasta 366 días.')).toBeInTheDocument();
    expect(screen.queryByText(/^Del /)).not.toBeInTheDocument();
    expect(state.params).toHaveBeenLastCalledWith(expect.anything(), false);
  });

  it('fechas que no son días en la URL: el aviso, no el período por omisión en silencio', () => {
    render(`${URL}?from=2026-02-30&to=2026-03-05`);
    expect(screen.getByText('Revisá el período')).toBeInTheDocument();
    expect(screen.getByText('Las fechas del período no son válidas: elegí otro período.')).toBeInTheDocument();
    expect(state.params).toHaveBeenLastCalledWith(expect.anything(), false);
  });

  it('sin el permiso de supervisar no consulta y lo explica', () => {
    state.granted = new Set(['mensajes.clientes']);
    render();
    expect(screen.getByText('No tenés permiso para ver las métricas de los mensajes')).toBeInTheDocument();
    expect(state.params).toHaveBeenLastCalledWith(expect.anything(), false);
    expect(screen.queryByText('Atención')).not.toBeInTheDocument();
  });

  it('un 403 de la API es un aviso de permiso, sin «Reintentar»', () => {
    state.metrics = { ...failed(), error: new ApiError(403, ['No tenés permiso para supervisar los mensajes']) };
    render();
    expect(screen.getByText('No tenés permiso para supervisar los mensajes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('mientras carga, el estado de carga; un error se dice y permite reintentar', () => {
    state.metrics = loading();
    render();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando las métricas…');
    cleanup();

    const refetch = vi.fn();
    state.metrics = failed(refetch);
    render();
    expect(screen.queryByText('Atención')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('«Ir a la bandeja» sólo para quien atiende mensajes', () => {
    render();
    expect(screen.getByRole('button', { name: 'Ir a la bandeja' })).toBeInTheDocument();
  });
});
