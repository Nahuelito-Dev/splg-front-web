import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import { failed, loading, mutation, ok, renderPage } from '../../../test/pageTest';

const state = vi.hoisted(() => ({
  cases: undefined as unknown,
  last: undefined as unknown,
  run: undefined as unknown,
  create: undefined as unknown,
  update: undefined as unknown,
  remove: undefined as unknown,
  confirm: vi.fn(() => Promise.resolve(true)),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../../services/queries/assistantLab', () => ({
  useRegressionCases: () => state.cases,
  useLastRegressionRun: () => state.last,
  useRunRegression: () => state.run,
  useCreateRegressionCase: () => state.create,
  useUpdateRegressionCase: () => state.update,
  useDeleteRegressionCase: () => state.remove,
}));
vi.mock('../../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: state.success, error: state.error },
}));

import { RegressionTab } from './RegressionTab';

type Mut = ReturnType<typeof mutation>;
const callbacks = (m: unknown) =>
  (m as Mut).mutate.mock.calls[0][1] as { onSuccess?: (v?: unknown) => void; onError?: (e: unknown) => void };

const regressionCase = (over: Record<string, unknown> = {}) => ({
  id: 'c-1',
  question: '¿Hasta qué hora toman pedidos?',
  expected: 'answer',
  mustMention: ['20'],
  createdAt: '2026-11-15T10:00:00.000Z',
  updatedAt: '2026-11-15T10:00:00.000Z',
  ...over,
});

const result = (over: Record<string, unknown> = {}) => ({
  caseId: 'c-1',
  question: '¿Hasta qué hora toman pedidos?',
  expected: 'answer',
  mustMention: ['20'],
  outcome: 'passed',
  reason: null,
  detail: 'Pasó',
  missing: [],
  answer: 'Hasta las 20.',
  wouldHandOff: false,
  handOffReason: null,
  handOffReasonLabel: null,
  handOffCause: null,
  handOffCauseLabel: null,
  sources: [],
  layer: 'ai',
  ...over,
});

const run = (over: Record<string, unknown> = {}) => ({
  id: 'r-1',
  status: 'finished',
  total: 2,
  passed: 1,
  failed: 1,
  errored: 0,
  startedAt: '2026-11-16T12:00:00.000Z',
  finishedAt: '2026-11-16T12:01:00.000Z',
  results: [
    result(),
    result({
      caseId: 'c-2',
      question: '¿Aceptan cheques?',
      outcome: 'failed',
      reason: 'missing_mentions',
      detail: 'La respuesta no menciona: cheque',
      missing: ['cheque'],
      mustMention: ['cheque'],
    }),
  ],
  ...over,
});

const notFound = () => ({
  ...failed(),
  error: new ApiError(404, ['No hay corridas'], 'ASSISTANT_REGRESSION_RUN_NOT_FOUND'),
});

const draw = (
  {
    cases = ok({ items: [regressionCase()], limit: 100 }),
    last = ok(run()),
    runMut = mutation({ error: null }),
  } = {} as {
    cases?: unknown;
    last?: unknown;
    runMut?: unknown;
  },
  props: { mayManage?: boolean; writeHint?: string } = {},
) => {
  state.cases = cases;
  state.last = last;
  state.run = runMut;
  state.create = mutation();
  state.update = mutation();
  state.remove = mutation();
  return renderPage(<RegressionTab mayManage={props.mayManage ?? true} writeHint={props.writeHint} />, {
    url: '/settings/assistant?tab=regression',
    path: '/settings/assistant',
  });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('lote: casos', () => {
  it('lista los casos con lo que se espera y lo que tiene que mencionar', () => {
    draw();
    const cases = screen.getByRole('list', { name: 'Casos del lote' });
    expect(cases).toHaveTextContent('¿Hasta qué hora toman pedidos?');
    expect(cases).toHaveTextContent('Que responda');
    expect(cases).toHaveTextContent('Tiene que mencionar: 20');
    expect(screen.getByText(/1 de 100/)).toBeInTheDocument();
  });

  it('sin casos: el vacío y «Correr» apagado', () => {
    draw({ cases: ok({ items: [], limit: 100 }), last: notFound() });
    expect(screen.getByText('Todavía no hay casos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Correr' })).toHaveAttribute('title', 'Cargá al menos un caso');
  });

  it('mientras cargan y si fallan', () => {
    draw({ cases: loading(), last: loading() });
    expect(screen.getByRole('status', { name: 'Cargando los casos' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Cargando la última corrida' })).toBeInTheDocument();
    cleanup();
    const refetch = vi.fn();
    draw({ cases: failed(refetch) });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);
    expect(refetch).toHaveBeenCalled();
  });

  it('alta de un caso: menciones de a una por renglón; con «que pase a una persona» no van', async () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo caso' }));
    const dialog = screen.getByRole('dialog', { name: 'Nuevo caso' });
    fireEvent.change(within(dialog).getByLabelText(/^Pregunta/), { target: { value: '¿Aceptan cheques?' } });
    fireEvent.change(within(dialog).getByLabelText(/^Tiene que mencionar/), {
      target: { value: 'cheque\n\nefectivo' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar caso' }));
    await waitFor(() => expect((state.create as Mut).mutate).toHaveBeenCalledTimes(1));
    expect((state.create as Mut).mutate.mock.calls[0][0]).toEqual({
      question: '¿Aceptan cheques?',
      expected: 'answer',
      mustMention: ['cheque', 'efectivo'],
    });

    fireEvent.change(within(dialog).getByLabelText(/^Qué se espera/), { target: { value: 'handoff' } });
    expect(within(dialog).queryByLabelText(/^Tiene que mencionar/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar caso' }));
    await waitFor(() => expect((state.create as Mut).mutate).toHaveBeenCalledTimes(2));
    expect((state.create as Mut).mutate.mock.calls[1][0]).toEqual({
      question: '¿Aceptan cheques?',
      expected: 'handoff',
      mustMention: [],
    });
  });

  it('un 409 de caso repetido va junto a la pregunta; el del tope, al pie', async () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Editar el caso «¿Hasta qué hora toman pedidos?»' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar caso' });
    expect(within(dialog).getByLabelText(/^Tiene que mencionar/)).toHaveValue('20');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect((state.update as Mut).mutate).toHaveBeenCalledTimes(1));
    expect((state.update as Mut).mutate.mock.calls[0][0]).toMatchObject({ id: 'c-1' });
    callbacks(state.update).onError?.(
      new ApiError(409, ['Ya hay un caso con esa pregunta'], 'ASSISTANT_REGRESSION_CASE_DUPLICATE'),
    );
    await waitFor(() => expect(within(dialog).getByLabelText(/^Pregunta/)).toHaveAttribute('aria-invalid', 'true'));
    callbacks(state.update).onError?.(
      new ApiError(409, ['Llegaste al tope de 100 casos'], 'ASSISTANT_REGRESSION_CASE_LIMIT_REACHED'),
    );
    await waitFor(() => expect(dialog).toHaveTextContent('Llegaste al tope de 100 casos'));
  });

  it('dar de baja pide confirmación', async () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await waitFor(() => expect((state.remove as Mut).mutate).toHaveBeenCalledTimes(1));
    expect((state.remove as Mut).mutate.mock.calls[0][0]).toBe('c-1');
  });
});

describe('lote: corridas', () => {
  it('nunca se corrió: lo dice en vez de mostrar un error', () => {
    draw({ last: notFound() });
    expect(screen.getByText('Todavía no se corrió el lote')).toBeInTheDocument();
    expect(screen.queryByText('No se pudo cargar')).not.toBeInTheDocument();
  });

  it('terminada: resumen y resultado por caso, primero los que no pasaron y por qué', () => {
    draw();
    expect(screen.getByText('Terminada')).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Resumen de la corrida' });
    expect(within(summary).getByText('Pasaron').closest('div')?.parentElement).toHaveTextContent('1');
    const results = within(screen.getByRole('list', { name: 'Resultado por caso' })).getAllByRole('listitem');
    expect(results[0]).toHaveTextContent('¿Aceptan cheques?');
    expect(results[0]).toHaveTextContent('No pasó');
    expect(results[0]).toHaveTextContent('La respuesta no menciona: cheque');
    expect(results[1]).toHaveTextContent('Pasó');
    expect(results[1]).not.toHaveTextContent('La respuesta no menciona');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('un caso que no se pudo correr no muestra «Ver lo que contestó»', () => {
    draw({
      last: ok(
        run({
          results: [
            result({
              caseId: 'c-3',
              outcome: 'error',
              reason: 'case_error',
              detail: 'No se pudo probar',
              answer: null,
              layer: 'fixed',
            }),
          ],
        }),
      ),
    });
    const [item] = within(screen.getByRole('list', { name: 'Resultado por caso' })).getAllByRole('listitem');
    expect(item).toHaveTextContent('No se pudo probar');
    expect(within(item).queryByText('Ver lo que contestó')).not.toBeInTheDocument();
  });

  it('el error de «Correr» se limpia cuando cambia la última corrida', () => {
    const runMut = mutation({
      error: new ApiError(409, ['Hay una corrida en curso'], 'ASSISTANT_REGRESSION_RUN_IN_PROGRESS'),
    });
    const { rerender } = draw({ runMut, last: ok(run({ status: 'running', finishedAt: null })) });
    const calls = (runMut.reset as ReturnType<typeof vi.fn>).mock.calls.length;
    state.last = ok(run({ status: 'finished' }));
    rerender(<RegressionTab mayManage writeHint={undefined} />);
    expect((runMut.reset as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(calls);
  });

  it('en curso: avance y «Correr» apagado', () => {
    draw({ last: ok(run({ status: 'running', total: 4, finishedAt: null, results: [result()] })) });
    expect(screen.getByText('En curso')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Avance de la corrida' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText('1 de 4 casos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Correr' })).toHaveAttribute('title', 'Hay una corrida en curso');
  });

  it('cortada: lo avisa', () => {
    draw({ last: ok(run({ status: 'failed' })) });
    expect(screen.getByText('Se cortó')).toBeInTheDocument();
    expect(screen.getByText(/se cortó antes de terminar/)).toBeInTheDocument();
  });

  it('«Correr» arranca la corrida; el 429 del enfriamiento se muestra con los minutos de la API', () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Correr' }));
    expect((state.run as Mut).mutate).toHaveBeenCalledTimes(1);
    cleanup();
    draw({
      runMut: mutation({
        error: new ApiError(
          429,
          ['El lote se puede correr una vez cada 10 minutos: faltan 7 minutos'],
          'ASSISTANT_REGRESSION_RUN_COOLDOWN',
        ),
      }),
    });
    expect(screen.getByText('El lote se puede correr una vez cada 10 minutos: faltan 7 minutos')).toBeInTheDocument();
  });
});

describe('lote: permisos', () => {
  it('sólo con `asistente.ver`: se ven los casos y la corrida, sin alta, edición, baja ni «Correr»', () => {
    draw({}, { mayManage: false });
    expect(screen.getByRole('list', { name: 'Casos del lote' })).toHaveTextContent('¿Hasta qué hora toman pedidos?');
    expect(screen.getByRole('list', { name: 'Resultado por caso' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo caso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Correr' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar el caso/ })).not.toBeInTheDocument();
  });

  it('en modo soporte los botones se ven apagados con el motivo y las filas no tienen acciones', () => {
    draw({}, { writeHint: 'Modo soporte: sólo lectura' });
    expect(screen.getByRole('button', { name: 'Nuevo caso' })).toHaveAttribute('title', 'Modo soporte: sólo lectura');
    expect(screen.getByRole('button', { name: 'Correr' })).toHaveAttribute('title', 'Modo soporte: sólo lectura');
    expect(screen.queryByRole('button', { name: /Editar el caso/ })).not.toBeInTheDocument();
  });
});
