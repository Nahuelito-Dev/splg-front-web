import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';
import { describeListStates, failed, mutation, ok, renderPage } from '../../../test/pageTest';

interface Notices {
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

const state = vi.hoisted(() => ({
  faqs: undefined as unknown,
  templates: undefined as unknown,
  faqMut: { create: undefined as unknown, update: undefined as unknown, remove: undefined as unknown },
  tplMut: { create: undefined as unknown, update: undefined as unknown, remove: undefined as unknown },
  notices: { faqs: undefined as Notices | undefined, templates: undefined as Notices | undefined },
  confirm: vi.fn(() => Promise.resolve(true)),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../../services/queries/assistant', () => ({
  usePlatformFaqs: () => state.faqs,
  useCreatePlatformFaq: () => state.faqMut.create,
  useUpdatePlatformFaq: () => state.faqMut.update,
  useDeletePlatformFaq: (notices: Notices) => {
    state.notices.faqs = notices;
    return state.faqMut.remove;
  },
  usePlatformTemplates: () => state.templates,
  useCreatePlatformTemplate: () => state.tplMut.create,
  useUpdatePlatformTemplate: () => state.tplMut.update,
  useDeletePlatformTemplate: (notices: Notices) => {
    state.notices.templates = notices;
    return state.tplMut.remove;
  },
}));
vi.mock('../../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: state.success, error: state.error },
}));

vi.mock('./SupportAssistantCard', () => ({ SupportAssistantCard: () => <p>Tarjeta del asistente del soporte</p> }));

import { PlatformAssistantFaqs } from './PlatformAssistantFaqs';

const faq = (over: Record<string, unknown> = {}) => ({
  id: 'p-1',
  key: 'medios_de_pago',
  question: '¿Qué medios de pago aceptan?',
  answer: 'Los que aparecen en la app.',
  position: 1,
  createdAt: '2026-11-15T10:00:00.000Z',
  updatedAt: '2026-11-15T10:00:00.000Z',
  ...over,
});

const faqs = (items = [faq()]) => ok({ items, version: 3, limit: 200 });
const templates = (items = [faq({ id: 't-1', key: 'horario', question: '¿Hasta qué hora toman pedidos?' })]) =>
  ok({ items, limit: 200 });

const fresh = () => {
  state.faqMut = { create: mutation(), update: mutation(), remove: mutation() };
  state.tplMut = { create: mutation(), update: mutation(), remove: mutation() };
};

const draw = (url = '/platform/assistant', over: { faqs?: unknown; templates?: unknown } = {}) => {
  state.faqs = over.faqs ?? faqs();
  state.templates = over.templates ?? templates();
  fresh();
  return renderPage(<PlatformAssistantFaqs />, { url, path: '/platform/assistant' });
};

type Mut = ReturnType<typeof mutation>;
const callbacks = (m: unknown) =>
  (m as Mut).mutate.mock.calls[0][1] as { onSuccess?: (v?: unknown) => void; onError?: (e: unknown) => void };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describeListStates({
  name: 'PlatformAssistantFaqs (preguntas de OrixTech)',
  url: '/platform/assistant',
  page: <PlatformAssistantFaqs />,
  setResult: (result) => {
    state.faqs = result;
    state.templates = templates();
    fresh();
  },
  withRow: () => faqs(),
  withoutRows: () => faqs([]),
  rowText: '¿Qué medios de pago aceptan?',
  emptyText: 'Todavía no hay preguntas de OrixTech',
  loadingLabel: 'Cargando preguntas frecuentes',
});

describeListStates({
  name: 'PlatformAssistantFaqs (preguntas de ejemplo)',
  url: '/platform/assistant?tab=examples',
  page: <PlatformAssistantFaqs />,
  setResult: (result) => {
    state.faqs = faqs();
    state.templates = result;
    fresh();
  },
  withRow: () => templates(),
  withoutRows: () => templates([]),
  rowText: '¿Hasta qué hora toman pedidos?',
  emptyText: 'Todavía no hay preguntas de ejemplo',
  loadingLabel: 'Cargando preguntas frecuentes',
});

describe('PlatformAssistantFaqs: pestañas', () => {
  it('dos pestañas; las de OrixTech dicen que las distribuidoras nunca las ven y no hay nada de «plantilla»', () => {
    draw();
    const tabs = screen.getByRole('tablist', { name: 'Preguntas del asistente' });
    expect(within(tabs).getByRole('tab', { name: 'Preguntas de OrixTech' })).toHaveAttribute('aria-selected', 'true');
    expect(within(tabs).getByRole('tab', { name: 'Preguntas de ejemplo para distribuidoras' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sobre esta base de conocimiento' })).toHaveTextContent(
      'las distribuidoras nunca las ven',
    );
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/plantilla/i);
  });

  it('arriba de las pestañas, la tarjeta del asistente del soporte (interruptor y topes)', () => {
    draw();
    expect(screen.getByText('Tarjeta del asistente del soporte')).toBeInTheDocument();
  });

  it('cambiar de pestaña muestra el catálogo de ejemplo y limpia la búsqueda', () => {
    draw('/platform/assistant?q=medios');
    expect(screen.getByRole('searchbox', { name: 'Buscar en las preguntas frecuentes' })).toHaveValue('medios');
    fireEvent.click(screen.getByRole('tab', { name: 'Preguntas de ejemplo para distribuidoras' }));
    expect(screen.getByText('¿Hasta qué hora toman pedidos?')).toBeInTheDocument();
    expect(screen.queryByText('¿Qué medios de pago aceptan?')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar en las preguntas frecuentes' })).toHaveValue('');
    expect(screen.getByRole('region', { name: 'Sobre las preguntas de ejemplo' })).toHaveTextContent(
      'no cambia lo que ya copiaron',
    );
  });
});

describe.each([
  {
    tab: 'OrixTech',
    url: '/platform/assistant',
    mut: () => state.faqMut,
    other: () => state.tplMut,
    notices: () => state.notices.faqs,
    create: 'Nueva pregunta',
    dialogNew: 'Nueva pregunta de OrixTech',
    dialogEdit: 'Editar pregunta de OrixTech',
    rowQuestion: '¿Qué medios de pago aceptan?',
    rowId: 'p-1',
  },
  {
    tab: 'ejemplo',
    url: '/platform/assistant?tab=examples',
    mut: () => state.tplMut,
    other: () => state.faqMut,
    notices: () => state.notices.templates,
    create: 'Nueva pregunta de ejemplo',
    dialogNew: 'Nueva pregunta de ejemplo',
    dialogEdit: 'Editar pregunta de ejemplo',
    rowQuestion: '¿Hasta qué hora toman pedidos?',
    rowId: 't-1',
  },
])('PlatformAssistantFaqs: ABM de las preguntas de $tab', (c) => {
  const muts = () => c.mut() as { create: Mut; update: Mut; remove: Mut };

  it('alta con clave sugerida; un 409 de clave ocupada va junto a la clave; usa su propio catálogo', async () => {
    draw(c.url);
    fireEvent.click(screen.getByRole('button', { name: c.create }));
    const dialog = screen.getByRole('dialog', { name: c.dialogNew });
    fireEvent.change(within(dialog).getByLabelText(/^Pregunta/), { target: { value: '¿Llegan a Oberá?' } });
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: 'Sí.' } });
    await waitFor(() => expect(within(dialog).getByLabelText(/^Clave/)).toHaveValue('llegan_a_obera'));
    fireEvent.click(within(dialog).getByRole('button', { name: /^Agregar/ }));
    await waitFor(() => expect(muts().create.mutate).toHaveBeenCalledTimes(1));
    expect(muts().create.mutate.mock.calls[0][0]).toEqual({
      question: '¿Llegan a Oberá?',
      answer: 'Sí.',
      key: 'llegan_a_obera',
    });
    expect((c.other() as { create: Mut }).create.mutate).not.toHaveBeenCalled();
    const code = c.tab === 'OrixTech' ? 'ASSISTANT_FAQ_KEY_TAKEN' : 'ASSISTANT_TEMPLATE_KEY_TAKEN';
    callbacks(muts().create).onError?.(new ApiError(409, ['Ya hay…'], code));
    await waitFor(() => expect(within(dialog).getByLabelText(/^Clave/)).toHaveAttribute('aria-invalid', 'true'));
    expect(within(dialog).getByText('Ya hay una pregunta con esa clave: elegí otra')).toBeInTheDocument();
  });

  it('al editar, la clave no se cambia y sólo van pregunta y respuesta', async () => {
    draw(c.url);
    fireEvent.click(screen.getByRole('button', { name: `Editar la pregunta «${c.rowQuestion}»` }));
    const dialog = screen.getByRole('dialog', { name: c.dialogEdit });
    expect(within(dialog).getByLabelText(/^Clave/)).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(muts().update.mutate).toHaveBeenCalledTimes(1));
    expect(muts().update.mutate.mock.calls[0][0]).toEqual({
      id: c.rowId,
      body: { question: c.rowQuestion, answer: expect.any(String) as string },
    });
    expect(Object.keys((muts().update.mutate.mock.calls[0][0] as { body: object }).body)).toEqual([
      'question',
      'answer',
    ]);
  });

  it('dar de baja pide confirmación; los avisos los da la mutación', async () => {
    draw(c.url);
    fireEvent.click(screen.getByRole('button', { name: `Más acciones de la pregunta «${c.rowQuestion}»` }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await waitFor(() => expect(muts().remove.mutate).toHaveBeenCalledWith(c.rowId));
    expect(state.confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    c.notices()?.onSuccess();
    expect(state.success).toHaveBeenCalledWith('Pregunta dada de baja');
  });
});

describe('PlatformAssistantFaqs: estados', () => {
  it('si la lista no cargó, el alta queda apagada con el motivo', () => {
    draw('/platform/assistant?tab=examples', { templates: failed() });
    const button = screen.getByRole('button', { name: 'Nueva pregunta de ejemplo' });
    expect(button).toHaveAttribute('title', 'No se pudo cargar la lista');
    fireEvent.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('en el tope del catálogo, el alta queda apagada con el motivo (sin tilde en «da»)', () => {
    draw('/platform/assistant?tab=examples', { templates: ok({ items: [faq()], limit: 1 }) });
    expect(screen.getByRole('button', { name: 'Nueva pregunta de ejemplo' })).toHaveAttribute(
      'title',
      'Llegaste al máximo de 1 preguntas: da de baja alguna para agregar otra',
    );
  });

  it('con la lista cargada, un error de recarga deja la lista y avisa arriba', () => {
    const refetch = vi.fn();
    draw('/platform/assistant', { faqs: { ...faqs(), error: new ApiError(500, ['x']), isError: true, refetch } });
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo actualizar la lista');
    expect(screen.getByText('¿Qué medios de pago aceptan?')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('el 409 del tope del catálogo va al pie del formulario', async () => {
    draw('/platform/assistant?tab=examples');
    fireEvent.click(screen.getByRole('button', { name: 'Nueva pregunta de ejemplo' }));
    const dialog = screen.getByRole('dialog', { name: 'Nueva pregunta de ejemplo' });
    fireEvent.change(within(dialog).getByLabelText(/^Pregunta/), { target: { value: '¿Hasta cuándo?' } });
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: 'Siempre.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Agregar/ }));
    await waitFor(() => expect((state.tplMut.create as Mut).mutate).toHaveBeenCalledTimes(1));
    callbacks(state.tplMut.create).onError?.(
      new ApiError(409, ['El catálogo ya tiene 200 preguntas de ejemplo'], 'ASSISTANT_TEMPLATE_LIMIT_REACHED'),
    );
    expect(await within(dialog).findByText('El catálogo ya tiene 200 preguntas de ejemplo')).toHaveAttribute(
      'role',
      'alert',
    );
  });
});

describe('PlatformAssistantFaqs: la clave', () => {
  const openNew = () => {
    draw('/platform/assistant?tab=examples');
    fireEvent.click(screen.getByRole('button', { name: 'Nueva pregunta de ejemplo' }));
    return screen.getByRole('dialog', { name: 'Nueva pregunta de ejemplo' });
  };

  it('si se escribió la clave a mano y después se la borró, la sugerencia no la vuelve a pisar', async () => {
    const dialog = openNew();
    const key = within(dialog).getByLabelText(/^Clave/);
    const question = within(dialog).getByLabelText(/^Pregunta/);
    fireEvent.change(question, { target: { value: '¿Llegan a Oberá?' } });
    await waitFor(() => expect(key).toHaveValue('llegan_a_obera'));
    fireEvent.change(key, { target: { value: 'mia' } });
    fireEvent.change(key, { target: { value: '' } });
    fireEvent.change(question, { target: { value: '¿Llegan a Posadas?' } });
    await waitFor(() => expect(question).toHaveValue('¿Llegan a Posadas?'));
    expect(key).toHaveValue('');
  });

  it('al cambiar la clave sugerida, se va el error de clave ocupada del back', async () => {
    const dialog = openNew();
    const key = within(dialog).getByLabelText(/^Clave/);
    fireEvent.change(within(dialog).getByLabelText(/^Pregunta/), { target: { value: '¿Hasta qué hora?' } });
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: 'Hasta las 20.' } });
    await waitFor(() => expect(key).toHaveValue('hasta_que_hora'));
    fireEvent.click(within(dialog).getByRole('button', { name: /^Agregar/ }));
    await waitFor(() => expect((state.tplMut.create as Mut).mutate).toHaveBeenCalledTimes(1));
    callbacks(state.tplMut.create).onError?.(new ApiError(409, ['Ya hay…'], 'ASSISTANT_TEMPLATE_KEY_TAKEN'));
    await waitFor(() => expect(key).toHaveAttribute('aria-invalid', 'true'));
    fireEvent.change(within(dialog).getByLabelText(/^Pregunta/), { target: { value: '¿Hasta qué hora abren?' } });
    await waitFor(() => expect(key).toHaveValue('hasta_que_hora_abren'));
    expect(key).not.toHaveAttribute('aria-invalid');
    expect(within(dialog).queryByText('Ya hay una pregunta con esa clave: elegí otra')).not.toBeInTheDocument();
  });

  it('al editar, con la clave deshabilitada, el PATCH sale (zod no lo frena) con la respuesta nueva', async () => {
    draw('/platform/assistant');
    fireEvent.click(screen.getByRole('button', { name: 'Editar la pregunta «¿Qué medios de pago aceptan?»' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar pregunta de OrixTech' });
    const key = within(dialog).getByLabelText(/^Clave/);
    expect(key).toBeDisabled();
    expect(key).toHaveValue('medios_de_pago');
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: 'Efectivo y transferencia.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect((state.faqMut.update as Mut).mutate).toHaveBeenCalledTimes(1));
    expect((state.faqMut.update as Mut).mutate.mock.calls[0][0]).toEqual({
      id: 'p-1',
      body: { question: '¿Qué medios de pago aceptan?', answer: 'Efectivo y transferencia.' },
    });
    expect(key).not.toHaveAttribute('aria-invalid');
  });
});
