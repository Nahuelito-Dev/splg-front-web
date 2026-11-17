import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { GridRenderCellParams } from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import type { UnansweredQuestion } from '../../../services/api/types';
import { failed, loading, mutation, ok, renderPage } from '../../../test/pageTest';

const state = vi.hoisted(() => ({
  list: undefined as unknown,
  periods: [] as unknown[],
  create: undefined as unknown,
  dismiss: undefined as unknown,
  confirm: vi.fn(() => Promise.resolve(true)),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('../../../services/queries/assistantLab', () => ({
  useCompanyUnanswered: (period: unknown) => {
    state.periods.push(period);
    return state.list;
  },
  usePlatformUnanswered: (period: unknown) => {
    state.periods.push(period);
    return state.list;
  },
  useCreateCompanyFaqFromUnanswered: () => state.create,
  useCreatePlatformFaqFromUnanswered: () => state.create,
  useDismissCompanyUnanswered: () => state.dismiss,
  useDismissPlatformUnanswered: () => state.dismiss,
}));
vi.mock('../../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: state.success, error: state.error, info: state.info },
}));
// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({
    rows,
    columns,
    empty,
  }: {
    rows: UnansweredQuestion[];
    columns: Array<{ field: string; renderCell?: (p: GridRenderCellParams<UnansweredQuestion>) => ReactNode }>;
    empty: ReactNode;
  }) =>
    rows.length === 0 ? (
      empty
    ) : (
      <ul aria-label="Filas">
        {rows.map((row) => (
          <li key={row.id}>
            {columns.map((column) => (
              <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<UnansweredQuestion>)}</div>
            ))}
          </li>
        ))}
      </ul>
    ),
}));

import { PlatformUnansweredTab } from '../../Platform/Assistant/PlatformUnansweredTab';
import { CompanyUnansweredTab } from './CompanyUnansweredTab';

type Mut = ReturnType<typeof mutation>;
const callbacks = (m: unknown) =>
  (m as Mut).mutate.mock.calls[0][1] as { onSuccess?: (v?: unknown) => void; onError?: (e: unknown) => void };

const GROUP = '3f2a9c0d1b7e4a5f8c6d2e1f0a9b8c7d';
const item = (over: Partial<UnansweredQuestion> = {}): UnansweredQuestion => ({
  id: GROUP,
  question: 'Soy Juan Pérez, ¿hacen envíos a Garupá?',
  count: 4,
  firstSeenAt: '2026-11-02T13:00:00.000Z',
  lastSeenAt: '2026-11-15T18:30:00.000Z',
  ...over,
});
const list = (items = [item()], over: Record<string, unknown> = {}) =>
  ok({ from: '2026-10-18', to: '2026-11-16', items, truncated: false, ...over });

const draw = (result: unknown = list(), url = '/settings/assistant?tab=unanswered') => {
  state.list = result;
  state.create = mutation();
  state.dismiss = mutation();
  return renderPage(<CompanyUnansweredTab />, { url, path: '/settings/assistant' });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.periods = [];
});

const openCreate = () => {
  fireEvent.click(screen.getByRole('button', { name: /Más acciones/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Crear pregunta frecuente' }));
  return screen.getByRole('dialog', { name: 'Crear pregunta frecuente' });
};

describe('preguntas sin respuesta: estados', () => {
  it('con datos: la pregunta, cuántas veces y el período que mandó el back', () => {
    draw();
    const row = within(screen.getByRole('list', { name: 'Filas' })).getByRole('listitem');
    expect(row).toHaveTextContent('Soy Juan Pérez, ¿hacen envíos a Garupá?');
    expect(row).toHaveTextContent('4');
    expect(screen.getByText(/los últimos 30 días/)).toBeInTheDocument();
    expect(state.periods.at(-1)).toEqual({});
  });

  it('el período de la URL se manda al back', () => {
    draw(list(), '/settings/assistant?tab=unanswered&from=2026-11-01&to=2026-11-10');
    expect(state.periods.at(-1)).toEqual({ from: '2026-11-01', to: '2026-11-10' });
    expect(screen.queryByText(/los últimos 30 días/)).not.toBeInTheDocument();
  });

  it('sin preguntas: el vacío', () => {
    draw(list([]));
    expect(screen.getByText('No hay preguntas sin respuesta')).toBeInTheDocument();
  });

  it('si se cortó por volumen, avisa que se acorte el período', () => {
    draw(list([item()], { truncated: true }));
    expect(screen.getByText(/acortá el período/)).toBeInTheDocument();
  });

  it('un error (p. ej. 400 del período) se dice con el texto de la API y se puede reintentar', () => {
    const refetch = vi.fn();
    draw({ ...failed(refetch), error: new ApiError(400, ['El período abarca hasta 366 días']) });
    expect(screen.getByText('El período abarca hasta 366 días')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('mientras carga no se confunde con el vacío ni con un error', () => {
    draw(loading());
    expect(screen.queryByText('No se pudo cargar')).not.toBeInTheDocument();
  });
});

describe('preguntas sin respuesta: crear la pregunta frecuente', () => {
  it('obliga a confirmar la revisión; sin respuesta queda como borrador', async () => {
    draw();
    const dialog = openCreate();
    expect(within(dialog).getByLabelText(/^Pregunta/)).toHaveValue('Soy Juan Pérez, ¿hacen envíos a Garupá?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('Confirmá que revisaste la pregunta')).toBeInTheDocument();
    expect((state.create as Mut).mutate).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/^Pregunta/), { target: { value: '¿Hacen envíos a Garupá?' } });
    fireEvent.click(within(dialog).getByLabelText('Revisé la pregunta y no tiene datos personales'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect((state.create as Mut).mutate).toHaveBeenCalledTimes(1));
    expect((state.create as Mut).mutate.mock.calls[0][0]).toEqual({
      id: GROUP,
      question: '¿Hacen envíos a Garupá?',
      answer: '',
    });
    callbacks(state.create).onSuccess?.({ faqId: 'f-9', published: false, existing: false, answerError: null });
    expect(state.success).toHaveBeenCalledWith(expect.stringContaining('Quedó como borrador'));
  });

  it('con respuesta se publica y cierra; si la pregunta ya estaba publicada, lo avisa sin tocarla', async () => {
    draw();
    const dialog = openCreate();
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: 'Sí, los martes.' } });
    fireEvent.click(within(dialog).getByLabelText('Revisé la pregunta y no tiene datos personales'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect((state.create as Mut).mutate).toHaveBeenCalledTimes(1));
    expect((state.create as Mut).mutate.mock.calls[0][0]).toMatchObject({ answer: 'Sí, los martes.' });
    callbacks(state.create).onSuccess?.({ faqId: 'f-9', published: true, existing: false, answerError: null });
    expect(state.success).toHaveBeenCalledWith('Pregunta frecuente publicada: el asistente ya la usa');
    callbacks(state.create).onSuccess?.({ faqId: 'f-1', published: true, existing: true, answerError: null });
    expect(state.info).toHaveBeenCalledWith(expect.stringContaining('ya estaba publicada'));
  });

  it('si la respuesta no se pudo guardar, el diálogo sigue abierto con el error junto a la respuesta', async () => {
    draw();
    const dialog = openCreate();
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: 'Sí, los martes.' } });
    fireEvent.click(within(dialog).getByLabelText('Revisé la pregunta y no tiene datos personales'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect((state.create as Mut).mutate).toHaveBeenCalledTimes(1));
    act(() =>
      callbacks(state.create).onSuccess?.({
        faqId: 'f-9',
        published: false,
        existing: false,
        answerError: new ApiError(400, ['Respuesta: no puede llevar HTML']),
      }),
    );
    await waitFor(() => expect(within(dialog).getByLabelText(/^Respuesta/)).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Respuesta/)).toHaveValue('Sí, los martes.');
    expect(state.success).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect((state.create as Mut).mutate).toHaveBeenCalledTimes(2));
    expect((state.create as Mut).mutate.mock.calls[1][0]).toMatchObject({ draftId: 'f-9' });
  });

  it('un 409 de pregunta repetida va junto a la pregunta', async () => {
    draw();
    const dialog = openCreate();
    fireEvent.click(within(dialog).getByLabelText('Revisé la pregunta y no tiene datos personales'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect((state.create as Mut).mutate).toHaveBeenCalledTimes(1));
    callbacks(state.create).onError?.(new ApiError(409, ['Ya hay…'], 'ASSISTANT_FAQ_DUPLICATE'));
    await waitFor(() => expect(within(dialog).getByLabelText(/^Pregunta/)).toHaveAttribute('aria-invalid', 'true'));
  });
});

describe('preguntas sin respuesta: descartar y permisos', () => {
  it('descartar pide confirmación y avisa', async () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Descartar' }));
    await waitFor(() => expect((state.dismiss as Mut).mutate).toHaveBeenCalledTimes(1));
    expect(state.confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true, confirmText: 'Descartar' }));
    expect((state.dismiss as Mut).mutate.mock.calls[0][0]).toBe(GROUP);
    callbacks(state.dismiss).onSuccess?.();
    expect(state.success).toHaveBeenCalledWith('Pregunta descartada');
  });

  it('si no se confirma, no se descarta', async () => {
    state.confirm.mockResolvedValueOnce(false);
    draw();
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Descartar' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalled());
    expect((state.dismiss as Mut).mutate).not.toHaveBeenCalled();
  });

  it('en la plataforma, sin permiso de configurar, se ve la lista sin acciones', () => {
    state.list = list();
    state.create = mutation();
    state.dismiss = mutation();
    renderPage(<PlatformUnansweredTab canManage={false} />, { url: '/platform/assistant?tab=unanswered' });
    expect(screen.getByText('Soy Juan Pérez, ¿hacen envíos a Garupá?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Más acciones/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Lo que las distribuidoras preguntaron/)).toBeInTheDocument();
  });
});
