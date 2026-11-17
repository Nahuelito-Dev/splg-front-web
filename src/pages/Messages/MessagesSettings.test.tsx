import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';
import type { InboxAccess } from '../../features/chat/useInboxAccess';

const access = vi.hoisted(() => ({
  value: { customers: true, drivers: true, configure: true, claims: true, any: true } as InboxAccess,
}));
const api = vi.hoisted(() => ({
  getBusinessHours: vi.fn(),
  updateBusinessHours: vi.fn(),
  getChatSettings: vi.fn(),
  updateChatSettings: vi.fn(),
  listCompanyTemplates: vi.fn(),
  createCompanyTemplate: vi.fn(),
  updateCompanyTemplate: vi.fn(),
  deleteCompanyTemplate: vi.fn(),
  getCsatSummary: vi.fn(),
}));
const confirmMock = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));

vi.mock('../../features/chat/useInboxAccess', () => ({ useInboxAccess: () => access.value }));
vi.mock('../../common/components/useCompanyDisplayName', () => ({ useCompanyDisplayName: () => 'Gas Norte' }));
vi.mock('../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  confirm: confirmMock,
}));

import { MessagesSettings } from './MessagesSettings';

const HOURS = {
  timezone: 'America/Argentina/Buenos_Aires',
  days: [{ weekday: 1, opensAt: '09:00', closesAt: '18:00' }],
  holidays: [],
  openNow: false,
  nextOpenAt: '2026-11-16T12:00:00.000Z',
};
const SETTINGS = {
  customerChatEnabled: true,
  assistantAiEnabled: false,
  assistantAiAvailable: false,
  assistantName: null,
  effectiveAssistantName: 'Asistente de Gas Norte',
  handoffMessage: null,
  effectiveHandoffMessage: 'Te paso con alguien del equipo de {{empresa.nombre}}. Te va a responder a la brevedad.',
  outOfHoursEnabled: true,
  outOfHoursMessage: null,
  effectiveOutOfHoursMessage: 'Ahora estamos fuera de horario. Te respondemos {{horario.proximo}}.',
  ackEnabled: false,
  ackMessage: null,
  effectiveAckMessage: 'Recibimos tu mensaje.',
  csatEnabled: true,
  csatMessage: null,
  effectiveCsatMessage: '¿Cómo te atendimos en {{empresa.nombre}}? Tocá de 1 a 5 para calificar la conversación.',
  customerActions: ['where_is_my_order', 'repeat_last_order', 'payment_methods', 'talk_to_person'],
  firstResponseTargetMinutes: 30,
  openNow: false,
  nextOpenAt: '2026-11-16T12:00:00.000Z',
};
const CSAT = {
  from: '2026-10-16T00:00:00.000Z',
  to: '2026-11-15T00:00:00.000Z',
  requested: 10,
  answered: 8,
  expired: 2,
  cancelled: 1,
  average: 4.25,
  csat: 0.75,
  byScore: { '1': 0, '2': 1, '3': 1, '4': 3, '5': 3 },
  assistant: { answered: 3, average: 4.666, csat: 1 },
  team: { answered: 5, average: 4, csat: 0.6 },
};
const TEMPLATE = {
  id: 'tpl-1',
  channel: null,
  key: 'en_camino',
  title: 'Pedido en camino',
  body: 'Tu pedido {{pedido.numero}} salió',
  active: true,
  updatedAt: '2026-11-15T10:00:00.000Z',
};

beforeEach(() => {
  access.value = { customers: true, drivers: true, configure: true, claims: true, any: true };
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getBusinessHours.mockResolvedValue(HOURS);
  api.getChatSettings.mockResolvedValue(SETTINGS);
  api.listCompanyTemplates.mockResolvedValue({ items: [TEMPLATE] });
  api.getCsatSummary.mockResolvedValue(CSAT);
});
afterEach(cleanup);

const show = () =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value}>
      <MessagesSettings />
    </ChatProviders>,
  );

describe('Mensajes y horario: el horario', () => {
  it('muestra las franjas por día y guarda con un día sin atención', async () => {
    api.updateBusinessHours.mockImplementation((body: typeof HOURS) => Promise.resolve({ ...HOURS, ...body }));
    show();
    expect(await screen.findByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByText(/Vuelve a atender el/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar día sin atención' }));
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-12-25' } });
    fireEvent.change(screen.getAllByLabelText('Motivo').at(-1) as HTMLElement, { target: { value: 'Navidad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));
    await waitFor(() =>
      expect(api.updateBusinessHours).toHaveBeenCalledWith({
        timezone: 'America/Argentina/Buenos_Aires',
        days: [{ weekday: 1, opensAt: '09:00', closesAt: '18:00' }],
        holidays: [{ date: '2026-12-25', reason: 'Navidad' }],
      }),
    );
  });

  it('una franja que se solapa no se manda', async () => {
    show();
    await screen.findByDisplayValue('09:00');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar una franja el lunes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));
    expect(await screen.findByText('Se solapa con otra franja del lunes')).toBeInTheDocument();
    expect(api.updateBusinessHours).not.toHaveBeenCalled();
  });

  it('sin `mensajes.configurar` se lee pero no se edita', async () => {
    access.value = { customers: true, drivers: false, configure: false, claims: false, any: true };
    show();
    expect(await screen.findByDisplayValue('09:00')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar horario' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva' })).not.toBeInTheDocument();
  });
});

describe('Mensajes y horario: el asistente', () => {
  it('la tarjeta se llama «Asistente» y guarda el nombre y el mensaje al pasar a una persona', async () => {
    api.updateChatSettings.mockResolvedValue(SETTINGS);
    show();
    const name = await screen.findByLabelText('Nombre del asistente');
    expect(screen.getByRole('heading', { name: 'Asistente' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Respuestas automáticas' })).not.toBeInTheDocument();
    expect(name).toHaveAttribute('placeholder', 'Asistente de {{empresa.nombre}}');
    const handoff = screen.getByLabelText('Mensaje al pasar a una persona');
    expect(handoff).toHaveAttribute('placeholder', SETTINGS.effectiveHandoffMessage);
    fireEvent.change(name, { target: { value: '  Gasito de {{empresa.nombre}} ' } });
    expect(screen.getByText('28/60')).toBeInTheDocument();
    fireEvent.change(handoff, { target: { value: 'Ya te atiende alguien, {{cliente.nombre}}.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(api.updateChatSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          assistantName: 'Gasito de {{empresa.nombre}}',
          handoffMessage: 'Ya te atiende alguien, {{cliente.nombre}}.',
        }),
      ),
    );
  });

  it('«Volver al texto de siempre» vacía el campo y manda `null`', async () => {
    const custom = {
      ...SETTINGS,
      assistantName: 'Gasito',
      effectiveAssistantName: 'Gasito',
      handoffMessage: 'Te paso',
      effectiveHandoffMessage: 'Te paso',
    };
    api.getChatSettings.mockResolvedValue(custom);
    api.updateChatSettings.mockResolvedValue(custom);
    show();
    expect(await screen.findByDisplayValue('Gasito')).toBeInTheDocument();
    // Con uno propio guardado, la ayuda del campo muestra el de omisión (no el propio).
    expect(screen.getByLabelText('Mensaje al pasar a una persona')).toHaveAttribute(
      'placeholder',
      'Te paso con alguien del equipo de {{empresa.nombre}}. Te va a responder a la brevedad.',
    );
    const resets = screen.getAllByRole('button', { name: 'Volver al texto de siempre' });
    expect(resets).toHaveLength(2);
    resets.forEach((button) => fireEvent.click(button));
    expect(screen.getByLabelText('Nombre del asistente')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(api.updateChatSettings).toHaveBeenCalledWith(
        expect.objectContaining({ assistantName: null, handoffMessage: null }),
      ),
    );
  });

  it('«Volver al texto de siempre» deja el foco en el campo y lo anuncia', async () => {
    api.getChatSettings.mockResolvedValue({ ...SETTINGS, assistantName: 'Gasito', effectiveAssistantName: 'Gasito' });
    show();
    const name = await screen.findByDisplayValue('Gasito');
    fireEvent.click(screen.getByRole('button', { name: 'Volver al texto de siempre' }));
    await waitFor(() => expect(name).toHaveFocus());
    expect(screen.getByText('Se usará el texto de siempre')).toHaveAttribute('aria-live', 'polite');
  });

  it('el contador y el tope cuentan emojis como uno; sin `maxLength` nativo (UTF-16)', async () => {
    show();
    const handoff = await screen.findByLabelText('Mensaje al pasar a una persona');
    expect(handoff).not.toHaveAttribute('maxlength');
    expect(screen.getByLabelText('Nombre del asistente')).not.toHaveAttribute('maxlength');
    fireEvent.change(handoff, { target: { value: '🔥'.repeat(500) } });
    expect(screen.getByText('500/500')).toBeInTheDocument();
    fireEvent.change(handoff, { target: { value: '🔥'.repeat(501) } });
    expect(screen.getByText('501/500')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Hasta 500 caracteres')).toBeInTheDocument();
    expect(api.updateChatSettings).not.toHaveBeenCalled();
  });

  it('un texto inválido con su interruptor apagado no traba «Guardar» y no se manda', async () => {
    api.updateChatSettings.mockResolvedValue(SETTINGS);
    show();
    fireEvent.change(await screen.findByLabelText('Texto fuera de horario'), {
      target: { value: 'Volvemos {{horario.vuelta}}' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Responder fuera de horario' }));
    expect(screen.queryByLabelText('Texto fuera de horario')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.updateChatSettings).toHaveBeenCalledTimes(1));
    const call: unknown = api.updateChatSettings.mock.lastCall;
    expect(call).toHaveProperty([0, 'outOfHoursEnabled'], false);
    expect(call).not.toHaveProperty([0, 'outOfHoursMessage']);
    expect(call).not.toHaveProperty([0, 'ackMessage']);
  });

  it('un nombre con otra variable que {{empresa.nombre}} no se manda', async () => {
    show();
    fireEvent.change(await screen.findByLabelText('Nombre del asistente'), {
      target: { value: 'Hola {{cliente.nombre}}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(
      await screen.findByText('En el nombre sólo va {{empresa.nombre}} (no {{cliente.nombre}})'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del asistente')).toHaveAttribute('aria-invalid', 'true');
    expect(api.updateChatSettings).not.toHaveBeenCalled();
  });

  it('la vista previa muestra cada mensaje firmado, marcado y con las variables de ejemplo, mientras se escribe', async () => {
    show();
    const preview = await screen.findByRole('region', { name: 'Vista previa: así lo ve el cliente' });
    // Sin cambios, firma con el nombre que da la API.
    expect(within(preview).getAllByText('Asistente de Gas Norte')).toHaveLength(3);
    expect(within(preview).getAllByText('Respuesta automática')).toHaveLength(3);
    expect(
      within(preview).getByText('Te paso con alguien del equipo de Gas Norte. Te va a responder a la brevedad.'),
    ).toBeInTheDocument();
    // El aviso de recibido está apagado: se ve, marcado como apagado.
    expect(within(preview).getByText(/Al escribir en horario/)).toHaveTextContent('apagado');
    fireEvent.change(screen.getByLabelText('Nombre del asistente'), {
      target: { value: 'Gasito de {{empresa.nombre}}' },
    });
    fireEvent.change(screen.getByLabelText('Mensaje al pasar a una persona'), {
      target: { value: '{{cliente.nombre}}, te paso con el pedido {{pedido.numero}}' },
    });
    expect(within(preview).getAllByText('Gasito de Gas Norte')).toHaveLength(3);
    expect(within(preview).getByText('Ana, te paso con el pedido 1024')).toBeInTheDocument();
    expect(within(preview).queryByText(/\{\{/)).not.toBeInTheDocument();
  });

  it('sin `mensajes.configurar` se ve la vista previa pero no se edita el asistente', async () => {
    access.value = { customers: true, drivers: false, configure: false, claims: false, any: true };
    show();
    expect(await screen.findByLabelText('Nombre del asistente')).toBeDisabled();
    expect(screen.getByLabelText('Mensaje al pasar a una persona')).toBeDisabled();
    expect(screen.getByRole('region', { name: 'Vista previa: así lo ve el cliente' })).toBeInTheDocument();
  });

  it('un 400 de la API al guardar se avisa', async () => {
    const { notify } = await import('../../utils/notifications');
    vi.mocked(notify.success).mockClear();
    vi.mocked(notify.error).mockClear();
    api.updateChatSettings.mockRejectedValue(new Error('Variable desconocida'));
    show();
    fireEvent.change(await screen.findByLabelText('Nombre del asistente'), { target: { value: 'Gasito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(notify.success).not.toHaveBeenCalled();
  });
});

describe('Mensajes y horario: respuestas automáticas', () => {
  it('vacío vuelve al texto de siempre (`null`); una variable desconocida no se manda', async () => {
    api.updateChatSettings.mockResolvedValue(SETTINGS);
    show();
    const text = await screen.findByLabelText('Texto fuera de horario');
    expect(text).toHaveAttribute('placeholder', SETTINGS.effectiveOutOfHoursMessage);
    fireEvent.change(text, { target: { value: 'Volvemos {{horario.vuelta}}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText(/Variable desconocida: \{\{horario.vuelta\}\}/)).toBeInTheDocument();
    expect(api.updateChatSettings).not.toHaveBeenCalled();
    fireEvent.change(text, { target: { value: '' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Los clientes pueden escribir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(api.updateChatSettings).toHaveBeenCalledWith({
        customerChatEnabled: false,
        assistantName: null,
        handoffMessage: null,
        outOfHoursEnabled: true,
        outOfHoursMessage: null,
        ackEnabled: false,
        firstResponseTargetMinutes: 30,
      }),
    );
  });
});

describe('Mensajes y horario: el asistente que contesta solo', () => {
  const AVAILABLE = { ...SETTINGS, assistantAiAvailable: true };

  it('sin la función, el interruptor no aparece y no se explica por qué; tampoco se manda', async () => {
    api.updateChatSettings.mockResolvedValue(SETTINGS);
    show();
    const name = await screen.findByLabelText('Nombre del asistente');
    expect(screen.queryByRole('switch', { name: 'El asistente contesta solo' })).not.toBeInTheDocument();
    expect(screen.queryByText(/módulo|plan\b|no incluid|habilit/i)).not.toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'Gasito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.updateChatSettings).toHaveBeenCalledTimes(1));
    expect(api.updateChatSettings.mock.lastCall).not.toHaveProperty([0, 'assistantAiEnabled']);
  });

  it('con la función, explica qué hace, enlaza las preguntas frecuentes y guarda el interruptor', async () => {
    api.getChatSettings.mockResolvedValue(AVAILABLE);
    api.updateChatSettings.mockResolvedValue({ ...AVAILABLE, assistantAiEnabled: true });
    show();
    const toggle = await screen.findByRole('switch', { name: 'El asistente contesta solo' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    const help = screen.getByText(/contesta las preguntas frecuentes y el estado del pedido/);
    expect(toggle).toHaveAttribute('aria-describedby', help.parentElement?.id);
    expect(screen.getByText(/le pasa la conversación a una persona/)).toBeInTheDocument();
    expect(screen.getByText(/marcadas como respuesta automática/)).toBeInTheDocument();
    expect(screen.getByText(/reemplaza el aviso de recibido y la respuesta fuera de horario/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Asistente del chat' })).toHaveAttribute('href', '/settings/assistant');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(api.updateChatSettings).toHaveBeenCalledWith(expect.objectContaining({ assistantAiEnabled: true })),
    );
  });

  it('sin `mensajes.configurar` se ve pero no se cambia', async () => {
    access.value = { customers: true, drivers: false, configure: false, claims: false, any: true };
    api.getChatSettings.mockResolvedValue({ ...AVAILABLE, assistantAiEnabled: true });
    show();
    const toggle = await screen.findByRole('switch', { name: 'El asistente contesta solo' });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('si deja de estar disponible mientras se mira (403 al prenderlo), lo avisa, esconde el interruptor y no pierde lo escrito', async () => {
    const { notify } = await import('../../utils/notifications');
    vi.mocked(notify.warn).mockClear();
    vi.mocked(notify.error).mockClear();
    const { ApiError } = await import('../../services/api/errors');
    api.getChatSettings.mockResolvedValueOnce(AVAILABLE).mockResolvedValue(SETTINGS);
    api.updateChatSettings.mockRejectedValue(
      new ApiError(403, ['Esta función no está disponible para tu empresa'], 'MODULE_DISABLED'),
    );
    show();
    fireEvent.click(await screen.findByRole('switch', { name: 'El asistente contesta solo' }));
    fireEvent.change(screen.getByLabelText('Nombre del asistente'), { target: { value: 'Gasito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(notify.warn).toHaveBeenCalledWith(expect.stringMatching(/ya no se puede prender/)));
    expect(api.updateChatSettings.mock.lastCall).toHaveProperty([0, 'assistantAiEnabled'], true);
    expect(notify.error).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('switch', { name: 'El asistente contesta solo' })).not.toBeInTheDocument(),
    );
    expect(api.getChatSettings).toHaveBeenCalledTimes(2);
    // Lo escrito en otro campo sigue y se puede volver a guardar (ya sin el interruptor).
    expect(screen.getByLabelText('Nombre del asistente')).toHaveValue('Gasito');
    const save = screen.getByRole('button', { name: 'Guardar' });
    expect(save).toBeEnabled();
    api.updateChatSettings.mockResolvedValue(SETTINGS);
    fireEvent.click(save);
    await waitFor(() => expect(api.updateChatSettings).toHaveBeenCalledTimes(2));
    expect(api.updateChatSettings.mock.lastCall).toHaveProperty([0, 'assistantName'], 'Gasito');
    expect(api.updateChatSettings.mock.lastCall).not.toHaveProperty([0, 'assistantAiEnabled']);
  });

  it('un 403 `MODULE_DISABLED` sin haber tocado el interruptor (el chat apagado) es el error de siempre', async () => {
    const { notify } = await import('../../utils/notifications');
    vi.mocked(notify.warn).mockClear();
    vi.mocked(notify.error).mockClear();
    const { ApiError } = await import('../../services/api/errors');
    api.getChatSettings.mockResolvedValue(AVAILABLE);
    const denied = new ApiError(403, ['Esta función no está disponible para tu empresa'], 'MODULE_DISABLED');
    api.updateChatSettings.mockRejectedValue(denied);
    show();
    await screen.findByRole('switch', { name: 'El asistente contesta solo' });
    fireEvent.change(screen.getByLabelText('Nombre del asistente'), { target: { value: 'Gasito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith(denied));
    expect(notify.warn).not.toHaveBeenCalled();
    expect(api.getChatSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('switch', { name: 'El asistente contesta solo' })).toBeInTheDocument();
  });

  it('el interruptor sólo viaja si se tocó: guardado prendido y sin tocarlo, no se manda', async () => {
    api.getChatSettings.mockResolvedValue({ ...AVAILABLE, assistantAiEnabled: true });
    api.updateChatSettings.mockResolvedValue({ ...AVAILABLE, assistantAiEnabled: true });
    show();
    await screen.findByRole('switch', { name: 'El asistente contesta solo' });
    fireEvent.change(screen.getByLabelText('Nombre del asistente'), { target: { value: 'Gasito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.updateChatSettings).toHaveBeenCalledTimes(1));
    expect(api.updateChatSettings.mock.lastCall).not.toHaveProperty([0, 'assistantAiEnabled']);
  });

  it('con el asistente prendido, el aviso de recibido y el fuera de horario dicen «En pausa…» y siguen editables', async () => {
    api.getChatSettings.mockResolvedValue({ ...AVAILABLE, assistantAiEnabled: true, ackEnabled: true });
    show();
    const toggle = await screen.findByRole('switch', { name: 'El asistente contesta solo' });
    expect(screen.getAllByText('En pausa mientras el asistente contesta solo')).toHaveLength(2);
    expect(screen.getByLabelText('Texto del aviso')).toBeEnabled();
    expect(screen.getByLabelText('Texto fuera de horario')).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Responder fuera de horario' })).toBeEnabled();
    fireEvent.click(toggle);
    expect(screen.queryByText('En pausa mientras el asistente contesta solo')).not.toBeInTheDocument();
  });

  it('sin la función no hay «En pausa…» aunque lo guardado diga prendido', async () => {
    api.getChatSettings.mockResolvedValue({ ...SETTINGS, assistantAiEnabled: true });
    show();
    await screen.findByLabelText('Nombre del asistente');
    expect(screen.queryByText('En pausa mientras el asistente contesta solo')).not.toBeInTheDocument();
  });
});

describe('Mensajes y horario: respuestas guardadas', () => {
  it('alta: la clave sale del título y se manda «en los dos canales» como `null`', async () => {
    api.createCompanyTemplate.mockResolvedValue({ ...TEMPLATE, id: 'tpl-2' });
    show();
    expect(await screen.findByText('Pedido en camino')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nueva respuesta guardada' });
    fireEvent.change(within(dialog).getByLabelText(/Título/), { target: { value: 'Sin stock hoy' } });
    expect(within(dialog).getByLabelText(/Clave/)).toHaveValue('sin_stock_hoy');
    fireEvent.change(within(dialog).getByLabelText(/Texto/), { target: { value: 'Hoy no tenemos 45 kg' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(api.createCompanyTemplate).toHaveBeenCalledWith({
        title: 'Sin stock hoy',
        key: 'sin_stock_hoy',
        body: 'Hoy no tenemos 45 kg',
        channel: null,
        active: true,
      }),
    );
  });

  it('un 409 (clave repetida) se muestra y el formulario queda abierto', async () => {
    const { notify } = await import('../../utils/notifications');
    api.createCompanyTemplate.mockRejectedValue(new Error('Ya hay una respuesta guardada con esa clave'));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Título/), { target: { value: 'Pedido en camino' } });
    fireEvent.change(within(dialog).getByLabelText(/Texto/), { target: { value: 'ya salió' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('dar de baja pide confirmación', async () => {
    api.deleteCompanyTemplate.mockResolvedValue(undefined);
    show();
    await screen.findByText('Pedido en camino');
    fireEvent.click(screen.getByRole('button', { name: /^Más acciones de respuesta/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await waitFor(() => expect(api.deleteCompanyTemplate).toHaveBeenCalledWith('tpl-1'));
    expect(confirmMock).toHaveBeenCalled();
  });
});

describe('Mensajes y horario: la encuesta al cerrar (4b)', () => {
  it('la vista previa muestra el texto de siempre con la empresa y los cinco números', async () => {
    show();
    const preview = await screen.findByRole('region', { name: /Vista previa de la encuesta/ });
    expect(
      within(preview).getByText('¿Cómo te atendimos en Gas Norte? Tocá de 1 a 5 para calificar la conversación.'),
    ).toBeInTheDocument();
    expect(within(preview).getByText('5')).toBeInTheDocument();
  });

  it('guarda el texto propio; una variable desconocida no se manda', async () => {
    api.updateChatSettings.mockResolvedValue(SETTINGS);
    show();
    const field = await screen.findByLabelText('Texto del pedido');
    fireEvent.change(field, { target: { value: '¿Qué tal {{cliente.apodo}}?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar la encuesta' }));
    expect(await screen.findByText(/Variable desconocida: \{\{cliente.apodo\}\}/)).toBeInTheDocument();
    expect(api.updateChatSettings).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: '¿Cómo te atendimos, {{cliente.nombre}}?' } });
    expect(screen.getByRole('region', { name: /Vista previa de la encuesta/ })).toHaveTextContent(
      '¿Cómo te atendimos, Ana?',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar la encuesta' }));
    await waitFor(() =>
      expect(api.updateChatSettings).toHaveBeenCalledWith({
        csatEnabled: true,
        csatMessage: '¿Cómo te atendimos, {{cliente.nombre}}?',
      }),
    );
  });

  it('apagarla manda sólo el interruptor (el texto escondido no viaja)', async () => {
    api.updateChatSettings.mockResolvedValue({ ...SETTINGS, csatEnabled: false });
    show();
    fireEvent.click(await screen.findByRole('switch', { name: 'Pedir que califiquen al cerrar' }));
    expect(screen.queryByLabelText('Texto del pedido')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar la encuesta' }));
    await waitFor(() => expect(api.updateChatSettings).toHaveBeenCalledWith({ csatEnabled: false }));
  });

  it('los resultados del último mes: respondidas, promedio, satisfechos y asistente contra equipo', async () => {
    show();
    const results = await screen.findByRole('region', { name: 'Cómo calificaron el último mes' });
    expect(await within(results).findByText('8 de 10')).toBeInTheDocument();
    expect(within(results).getByText('4,3 / 5')).toBeInTheDocument();
    expect(within(results).getByText('75 %')).toBeInTheDocument();
    const assistant = within(results).getByRole('row', { name: /Sólo el asistente/ });
    expect(assistant).toHaveTextContent('34,7100 %');
    expect(within(results).getByRole('row', { name: /El equipo/ })).toHaveTextContent('54,060 %');
    // 8 respondidas = 3 del asistente + 5 del equipo: no hay sin atender.
    expect(within(results).queryByText(/nadie llegó a atender/)).not.toBeInTheDocument();
  });

  it('las respondidas que nadie atendió se aclaran (no entran en ninguna fila)', async () => {
    api.getCsatSummary.mockResolvedValue({
      ...CSAT,
      answered: 2,
      assistant: { answered: 0, average: null, csat: null },
      team: { answered: 0, average: null, csat: null },
    });
    show();
    const results = await screen.findByRole('region', { name: 'Cómo calificaron el último mes' });
    expect(
      await within(results).findByText('2 respondidas son de conversaciones que nadie llegó a atender.'),
    ).toBeInTheDocument();
  });

  it('sin atender a los clientes no se piden los resultados', async () => {
    access.value = { customers: false, drivers: true, configure: true, claims: false, any: true };
    show();
    expect(
      await screen.findByText(/Los resultados los ve quien atiende los mensajes de los clientes/),
    ).toBeInTheDocument();
    expect(api.getCsatSummary).not.toHaveBeenCalled();
  });

  it('un error al leer los resultados se muestra con reintento', async () => {
    api.getCsatSummary.mockRejectedValue(Object.assign(new Error('Falla'), { isAxiosError: true }));
    show();
    const results = await screen.findByRole('region', { name: 'Cómo calificaron el último mes' });
    expect(await within(results).findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('Mensajes y horario: los botones del cliente (4e)', () => {
  it('elige qué botones ve el cliente, con vista previa, y guarda en el orden del catálogo', async () => {
    api.updateChatSettings.mockResolvedValue(SETTINGS);
    show();
    const preview = await screen.findByRole('region', { name: /Vista previa de los botones/ });
    expect(
      within(preview)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['¿Dónde está mi pedido?', 'Repetir mi último pedido', 'Medios de pago', 'Hablar con una persona']);
    fireEvent.click(screen.getByRole('checkbox', { name: /Repetir mi último pedido/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /¿Dónde está mi pedido\?/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /¿Dónde está mi pedido\?/ }));
    expect(within(preview).queryByText('Repetir mi último pedido')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar los botones' }));
    await waitFor(() =>
      expect(api.updateChatSettings).toHaveBeenCalledWith({
        customerActions: ['where_is_my_order', 'payment_methods', 'talk_to_person'],
      }),
    );
  });

  it('sin ninguno, la vista previa lo dice y se manda la lista vacía', async () => {
    api.updateChatSettings.mockResolvedValue({ ...SETTINGS, customerActions: [] });
    show();
    await screen.findByRole('region', { name: /Vista previa de los botones/ });
    for (const name of [
      /¿Dónde está mi pedido\?/,
      /Repetir mi último pedido/,
      /Medios de pago/,
      /Hablar con una persona/,
    ]) {
      fireEvent.click(screen.getByRole('checkbox', { name }));
    }
    expect(screen.getByText('Sin botones: el cliente sólo escribe.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar los botones' }));
    await waitFor(() => expect(api.updateChatSettings).toHaveBeenCalledWith({ customerActions: [] }));
  });
});
