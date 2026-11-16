import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';
import { describeListStates, failed, loading, mutation, ok, renderPage } from '../../test/pageTest';

const state = vi.hoisted(() => ({
  perms: { canWrite: true, writeHint: undefined as string | undefined },
  permiso: { allowed: true, known: true },
  list: undefined as unknown,
  copy: undefined as unknown,
  remove: undefined as unknown,
  create: undefined as unknown,
  update: undefined as unknown,
  templates: undefined as unknown,
  deleteNotices: undefined as undefined | { onSuccess: () => void; onError: (error: unknown) => void },
  confirm: vi.fn(() => Promise.resolve(true)),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => state.perms,
  usePermiso: () => state.permiso,
}));
vi.mock('../../services/queries/assistant', () => ({
  useCompanyFaqs: () => state.list,
  useCopyCompanyFaqTemplates: () => state.copy,
  useDeleteCompanyFaq: (notices: typeof state.deleteNotices) => {
    state.deleteNotices = notices;
    return state.remove;
  },
  useCompanyTemplates: (open: boolean) => (open ? state.templates : { ...ok(undefined), isPending: false }),
  useCreateCompanyFaq: () => state.create,
  useUpdateCompanyFaq: () => state.update,
}));
vi.mock('../../utils/notifications', () => ({
  confirm: state.confirm,
  notify: { success: state.success, error: state.error },
}));

import { AssistantFaqs } from './AssistantFaqs';

const faq = (over: Record<string, unknown> = {}) => ({
  id: 'f-1',
  key: 'medios_de_pago',
  question: '¿Qué medios de pago aceptan?',
  answer: 'Efectivo y Mercado Pago.',
  position: 1,
  createdAt: '2026-11-15T10:00:00.000Z',
  updatedAt: '2026-11-15T10:00:00.000Z',
  ...over,
});

const base = (items = [faq()], over: Record<string, unknown> = {}) => ok({ items, version: 7, limit: 200, ...over });

const example = (over: Record<string, unknown> = {}) => ({
  key: 'medios_de_pago',
  question: '¿Qué medios de pago aceptan?',
  answer: 'Efectivo.',
  position: 1,
  alreadyInBase: false,
  ...over,
});

const draw = (list: unknown = base(), url = '/settings/assistant') => {
  state.list = list;
  state.templates = ok({
    items: [
      example(),
      example({ key: 'zona', question: '¿Llegan a mi zona?', position: 2, alreadyInBase: true }),
      example({ key: 'horario', question: '¿Hasta qué hora?', position: 3 }),
    ],
  });
  state.copy = mutation();
  state.remove = mutation();
  state.create = mutation();
  state.update = mutation();
  return renderPage(<AssistantFaqs />, { url, path: '/settings/assistant' });
};

type Mut = ReturnType<typeof mutation>;
const callbacks = (m: unknown) =>
  (m as Mut).mutate.mock.calls[0][1] as { onSuccess?: (v?: unknown) => void; onError?: (e: unknown) => void };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.perms = { canWrite: true, writeHint: undefined };
  state.permiso = { allowed: true, known: true };
});

describeListStates({
  name: 'AssistantFaqs',
  url: '/settings/assistant',
  page: <AssistantFaqs />,
  setResult: (result) => {
    state.list = result;
    state.copy = mutation();
    state.remove = mutation();
    state.create = mutation();
    state.update = mutation();
  },
  withRow: () => base(),
  withoutRows: () => base([]),
  rowText: '¿Qué medios de pago aceptan?',
  emptyText: 'Todavía no hay preguntas frecuentes',
  loadingLabel: 'Cargando preguntas frecuentes',
});

describe('AssistantFaqs', () => {
  it('muestra el aviso de respuestas automáticas, la versión y cuántas hay del tope', () => {
    draw();
    const notice = screen.getByRole('region', { name: 'Sobre esta base de conocimiento' });
    expect(
      within(notice).getByText('Respuestas automáticas: el asistente va a responder con estas preguntas frecuentes'),
    ).toBeInTheDocument();
    // No promete lo que todavía no hace (derivar a una persona: capa B3).
    expect(notice).not.toHaveTextContent(/deriva/);
    expect(within(notice).getByText('7')).toBeInTheDocument();
    expect(within(notice).getByText('1 de 200')).toBeInTheDocument();
  });

  it('lista en el orden de la base (position) y marca lo que salió de una pregunta de ejemplo', () => {
    draw(
      base([
        faq({ id: 'b', position: 2, question: '¿Segunda pregunta?', key: null }),
        faq({ id: 'a', position: 1, question: '¿Primera pregunta?' }),
      ]),
    );
    const items = within(screen.getByRole('list', { name: 'Preguntas frecuentes' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('¿Primera pregunta?');
    expect(items[0]).toHaveTextContent('De una pregunta de ejemplo');
    expect(items[1]).toHaveTextContent('¿Segunda pregunta?');
    expect(items[1]).not.toHaveTextContent('De una pregunta de ejemplo');
    expect(document.body).not.toHaveTextContent(/OrixTech|plantilla|módulo|\bplan\b/);
  });

  it('busca en preguntas y respuestas; sin coincidencias, «Sin resultados»', () => {
    draw(base([faq(), faq({ id: 'f-2', position: 2, question: '¿Llegan a mi zona?', answer: 'Sí, a Posadas.' })]));
    const search = screen.getByRole('searchbox', { name: 'Buscar en las preguntas frecuentes' });
    fireEvent.change(search, { target: { value: 'posadas' } });
    expect(screen.getByText('¿Llegan a mi zona?')).toBeInTheDocument();
    expect(screen.queryByText('¿Qué medios de pago aceptan?')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'xyz' } });
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('el vacío invita a cargar las preguntas de ejemplo: antes de copiar, una vista previa con las que ya están', () => {
    draw(base([], { version: 0 }));
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    const dialog = screen.getByRole('dialog', { name: 'Cargar preguntas de ejemplo' });
    expect((state.copy as Mut).mutate).not.toHaveBeenCalled();
    expect(within(dialog).getByText('Se van a sumar 2 de 3. Las que ya tenés no se repiten.')).toBeInTheDocument();
    const rows = within(within(dialog).getByRole('list', { name: 'Preguntas de ejemplo' })).getAllByRole('listitem');
    expect(rows[1]).toHaveTextContent('¿Llegan a mi zona?');
    expect(rows[1]).toHaveTextContent('Ya está en tu base');
    expect(rows[0]).toHaveTextContent('Se suma');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sumar 2 preguntas' }));
    expect((state.copy as Mut).mutate).toHaveBeenCalledTimes(1);
    callbacks(state.copy).onSuccess?.({ copied: 2, skipped: 1, version: 1 });
    expect(state.success).toHaveBeenCalledWith('Se sumaron 2 preguntas de ejemplo');
  });

  it('si ya están todas, «Sumar» queda apagado y dice por qué', () => {
    draw();
    state.templates = ok({ items: [example({ alreadyInBase: true })] });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    const dialog = screen.getByRole('dialog', { name: 'Cargar preguntas de ejemplo' });
    const add = within(dialog).getByRole('button', { name: 'Sumar preguntas' });
    expect(add).toHaveAttribute('title', 'Ya tenés todas las preguntas de ejemplo en tu base');
    fireEvent.click(add);
    expect((state.copy as Mut).mutate).not.toHaveBeenCalled();
    expect(within(dialog).getByText('Ya tenés todas en tu base: no hay nada para sumar.')).toBeInTheDocument();
  });

  it('la vista previa tiene sus estados: carga, error con reintento y catálogo vacío (sin «Sumar 0»)', () => {
    draw();
    state.templates = loading();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    expect(screen.getByRole('status', { name: 'Cargando las preguntas de ejemplo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sumar preguntas' })).toHaveAttribute(
      'title',
      'Cargando las preguntas de ejemplo…',
    );
    cleanup();

    const refetch = vi.fn();
    draw();
    state.templates = { ...failed(refetch), error: new ApiError(500, ['Se cayó el catálogo']) };
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    expect(screen.getByText('Se cayó el catálogo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sumar preguntas' })).toHaveAttribute(
      'title',
      'No se pudieron cargar las preguntas de ejemplo',
    );
    cleanup();

    draw();
    state.templates = ok({ items: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    const dialog = screen.getByRole('dialog', { name: 'Cargar preguntas de ejemplo' });
    expect(within(dialog).getByText(/Todavía no hay preguntas de ejemplo para sumar/)).toBeInTheDocument();
    // La empresa no ve el nombre de la plataforma, tampoco con el diálogo abierto.
    expect(document.body).not.toHaveTextContent(/OrixTech|plantilla|módulo|\bplan\b/);
  });

  it('con la vista previa abierta (con datos) tampoco aparece el nombre de la plataforma', () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    expect(screen.getByRole('dialog', { name: 'Cargar preguntas de ejemplo' })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/OrixTech|plantilla|módulo|\bplan\b/);
  });

  it('al reabrir, mientras se actualiza el catálogo, lo dice y no decide el botón con datos viejos', () => {
    draw();
    state.templates = { ...ok({ items: [example()] }), isFetching: true };
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    const dialog = screen.getByRole('dialog', { name: 'Cargar preguntas de ejemplo' });
    expect(within(dialog).getByRole('status')).toHaveTextContent('Actualizando las preguntas de ejemplo…');
    const add = within(dialog).getByRole('button', { name: 'Sumar preguntas' });
    expect(add).toHaveAttribute('title', 'Actualizando las preguntas de ejemplo…');
    fireEvent.click(add);
    expect((state.copy as Mut).mutate).not.toHaveBeenCalled();
  });

  it('si la actualización del catálogo falla con datos viejos: aviso con «Reintentar» y botón apagado', () => {
    const refetch = vi.fn();
    draw();
    state.templates = { ...ok({ items: [example()] }), error: new ApiError(500, ['x']), isError: true, refetch };
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    const dialog = screen.getByRole('dialog', { name: 'Cargar preguntas de ejemplo' });
    const alert = within(dialog).getByRole('alert');
    expect(alert).toHaveTextContent('No se pudieron actualizar las preguntas de ejemplo');
    expect(within(dialog).getByText('¿Qué medios de pago aceptan?')).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
    expect(within(dialog).getByRole('button', { name: 'Sumar preguntas' })).toHaveAttribute(
      'title',
      'No se pudieron actualizar las preguntas de ejemplo',
    );
  });

  it('si no entran todas bajo el tope, «Sumar» queda apagado con cuántas dar de baja (el back copia todo o nada)', () => {
    draw(base([faq()], { limit: 2 }));
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    const dialog = screen.getByRole('dialog', { name: 'Cargar preguntas de ejemplo' });
    const add = within(dialog).getByRole('button', { name: 'Sumar 2 preguntas' });
    expect(add).toHaveAttribute('title', 'Tu base tiene 1 de 2: da de baja al menos 1 para sumar estas 2');
    fireEvent.click(add);
    expect((state.copy as Mut).mutate).not.toHaveBeenCalled();
  });

  it('con la base llena, «Cargar preguntas de ejemplo» de la página queda apagada con el motivo del tope', () => {
    draw(base([faq()], { limit: 1 }));
    const copy = screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' });
    expect(copy).toHaveAttribute('title', 'Llegaste al máximo de 1 preguntas: da de baja alguna para agregar otra');
    fireEvent.click(copy);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('si igual llega un 409 del tope al copiar (otra sesión llenó la base), se muestra', () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 2 preguntas' }));
    expect((state.copy as Mut).mutate).toHaveBeenCalledTimes(1);
    const limit = new ApiError(409, ['Copiar superaría el máximo'], 'ASSISTANT_FAQ_LIMIT_REACHED');
    callbacks(state.copy).onError?.(limit);
    expect(state.error).toHaveBeenCalledWith(limit);
    expect(screen.getByRole('dialog', { name: 'Cargar preguntas de ejemplo' })).toBeInTheDocument();
  });

  it('con la lista ya cargada, un error de recarga no la reemplaza: aviso arriba y la lista que había', () => {
    const refetch = vi.fn();
    draw({ ...base(), error: new ApiError(500, ['Se cortó']), isError: true, refetch });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('No se pudo actualizar la lista: se muestra la última que se cargó.');
    expect(screen.getByText('¿Qué medios de pago aceptan?')).toBeInTheDocument();
    expect(screen.queryByText('No se pudo cargar')).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('dar de baja pide confirmación y sólo con el sí llama a la API', async () => {
    draw();
    state.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: /^Más acciones de la pregunta/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect((state.remove as Mut).mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^Más acciones de la pregunta/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await waitFor(() => expect((state.remove as Mut).mutate).toHaveBeenCalledWith('f-1'));
    expect(state.confirm.mock.calls[1]).toEqual([expect.objectContaining({ danger: true })]);
    // Los avisos los da la mutación (sirven para bajas seguidas), no cada `mutate`.
    state.deleteNotices?.onSuccess();
    expect(state.success).toHaveBeenCalledWith('Pregunta dada de baja');
    const error = new ApiError(404, ['No existe esa pregunta frecuente'], 'ASSISTANT_FAQ_NOT_FOUND');
    state.deleteNotices?.onError(error);
    expect(state.error).toHaveBeenCalledWith(error);
  });

  it('sin «asistente.gestionar» la base se ve pero no hay altas, bajas ni ediciones', () => {
    state.permiso = { allowed: false, known: true };
    draw();
    expect(screen.getByText('¿Qué medios de pago aceptan?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva pregunta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Más acciones de la pregunta/ })).not.toBeInTheDocument();
  });

  it('en modo soporte (sólo lectura) el alta y la copia se ven apagadas con el motivo y no hacen nada', () => {
    state.perms = { canWrite: false, writeHint: 'Modo soporte: sólo lectura' };
    draw();
    const create = screen.getByRole('button', { name: 'Nueva pregunta' });
    const copy = screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' });
    expect(create).toHaveAttribute('title', 'Modo soporte: sólo lectura');
    expect(copy).toHaveAttribute('title', 'Modo soporte: sólo lectura');
    fireEvent.click(create);
    fireEvent.click(copy);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect((state.copy as Mut).mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Más acciones de la pregunta/ })).not.toBeInTheDocument();
  });

  it('en modo soporte con la base vacía, la copia del vacío tampoco llama a la API', () => {
    state.perms = { canWrite: false, writeHint: 'Modo soporte: sólo lectura' };
    draw(base([]));
    fireEvent.click(screen.getByRole('button', { name: 'Cargar preguntas de ejemplo' }));
    expect((state.copy as Mut).mutate).not.toHaveBeenCalled();
  });

  it('mientras no se saben los permisos no muestra acciones de gestión (no parpadean)', () => {
    state.permiso = { allowed: false, known: false };
    draw();
    expect(screen.queryByRole('button', { name: 'Nueva pregunta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cargar preguntas de ejemplo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument();
  });

  it('con la base en el tope, «Nueva pregunta» queda apagada con el motivo', () => {
    draw(base([faq()], { limit: 1 }));
    expect(screen.getByRole('button', { name: 'Nueva pregunta' })).toHaveAttribute(
      'title',
      'Llegaste al máximo de 1 preguntas: da de baja alguna para agregar otra',
    );
  });

  it('un error del back se dice con su texto y «Nueva pregunta» queda apagada con el motivo', () => {
    const backError = new ApiError(500, ['La base de datos no responde']);
    draw({ ...failed(), error: backError });
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    expect(screen.getByText('La base de datos no responde')).toBeInTheDocument();
    const create = screen.getByRole('button', { name: 'Nueva pregunta' });
    expect(create).toHaveAttribute('title', 'No se pudo cargar la lista');
    fireEvent.click(create);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mientras carga no muestra el aviso ni la lista', () => {
    draw(loading());
    expect(screen.queryByRole('region', { name: 'Sobre esta base de conocimiento' })).not.toBeInTheDocument();
  });
});

describe('AssistantFaqs: el formulario', () => {
  const openNew = () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva pregunta' }));
    return screen.getByRole('dialog', { name: 'Nueva pregunta frecuente' });
  };

  it('cuenta los caracteres como el back (un emoji es uno)', async () => {
    const dialog = openNew();
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: '😀😀' } });
    expect(await within(dialog).findByText('2/1500')).toBeInTheDocument();
  });

  it('el contador pasa a tono de error al superar el tope y lo anuncia sólo al cruzar el 90 % y el 100 %', async () => {
    const dialog = openNew();
    const question = within(dialog).getByLabelText(/^Pregunta/);
    const counter = () => within(dialog).getByText(/\/200$/);
    const live = () => counter().parentElement?.parentElement?.querySelector('[aria-live="polite"]');
    fireEvent.change(question, { target: { value: 'a'.repeat(100) } });
    expect(live()).toHaveTextContent('');
    expect(counter()).not.toHaveClass('text-danger');
    fireEvent.change(question, { target: { value: 'a'.repeat(185) } });
    await waitFor(() => expect(live()).toHaveTextContent('Cerca del máximo de 200 caracteres'));
    fireEvent.change(question, { target: { value: 'a'.repeat(190) } });
    expect(live()).toHaveTextContent('Cerca del máximo de 200 caracteres');
    fireEvent.change(question, { target: { value: 'a'.repeat(201) } });
    await waitFor(() => expect(live()).toHaveTextContent('Pasaste el máximo de 200 caracteres'));
    expect(counter()).toHaveClass('text-danger');
    expect(question).toHaveAttribute('aria-describedby', expect.stringContaining('counter'));
  });

  it('valida como el back antes de mandar: largo y HTML', async () => {
    const dialog = openNew();
    fireEvent.change(within(dialog).getByLabelText(/^Pregunta/), { target: { value: 'Hola' } });
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: '<b>Sí</b>' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar pregunta' }));
    expect(await within(dialog).findByText('Tiene que tener entre 5 y 200 caracteres')).toBeInTheDocument();
    expect(within(dialog).getByText(/No puede llevar HTML/)).toBeInTheDocument();
    expect((state.create as Mut).mutate).not.toHaveBeenCalled();
  });

  it('manda el texto recortado y, con un 409 de duplicada, lo dice junto a la pregunta', async () => {
    const dialog = openNew();
    fireEvent.change(within(dialog).getByLabelText(/^Pregunta/), { target: { value: '  ¿Hasta qué hora?  ' } });
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: 'Hasta las 20.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar pregunta' }));
    await waitFor(() => expect((state.create as Mut).mutate).toHaveBeenCalledTimes(1));
    expect((state.create as Mut).mutate.mock.calls[0][0]).toEqual({
      question: '¿Hasta qué hora?',
      answer: 'Hasta las 20.',
    });
    callbacks(state.create).onError?.(new ApiError(409, ['Ya hay…'], 'ASSISTANT_FAQ_DUPLICATE'));
    const question = within(dialog).getByLabelText(/^Pregunta/);
    await waitFor(() => expect(question).toHaveAttribute('aria-invalid', 'true'));
    expect(
      within(dialog).getByText('Ya hay una pregunta igual en la base (sin contar mayúsculas)'),
    ).toBeInTheDocument();
  });

  it('el 409 del tope se muestra en el pie del formulario', async () => {
    const dialog = openNew();
    fireEvent.change(within(dialog).getByLabelText(/^Pregunta/), { target: { value: '¿Hasta qué hora?' } });
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: 'Hasta las 20.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar pregunta' }));
    await waitFor(() => expect((state.create as Mut).mutate).toHaveBeenCalledTimes(1));
    callbacks(state.create).onError?.(
      new ApiError(409, ['La base ya tiene 200 preguntas frecuentes, el máximo'], 'ASSISTANT_FAQ_LIMIT_REACHED'),
    );
    expect(await within(dialog).findByText('La base ya tiene 200 preguntas frecuentes, el máximo')).toHaveAttribute(
      'role',
      'alert',
    );
  });

  it('editar carga la pregunta y manda el PATCH con su id', async () => {
    draw();
    fireEvent.click(screen.getByRole('button', { name: /^Editar la pregunta/ }));
    const dialog = screen.getByRole('dialog', { name: 'Editar pregunta frecuente' });
    expect(within(dialog).getByLabelText(/^Pregunta/)).toHaveValue('¿Qué medios de pago aceptan?');
    fireEvent.change(within(dialog).getByLabelText(/^Respuesta/), { target: { value: 'Sólo efectivo.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect((state.update as Mut).mutate).toHaveBeenCalledWith(
        { id: 'f-1', body: { question: '¿Qué medios de pago aceptan?', answer: 'Sólo efectivo.' } },
        expect.anything(),
      ),
    );
  });
});
