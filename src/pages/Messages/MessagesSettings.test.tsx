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
  firstResponseTargetMinutes: 30,
  openNow: false,
  nextOpenAt: '2026-11-16T12:00:00.000Z',
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
    fireEvent.click(screen.getByRole('button', { name: /Dar de baja/ }));
    await waitFor(() => expect(api.deleteCompanyTemplate).toHaveBeenCalledWith('tpl-1'));
    expect(confirmMock).toHaveBeenCalled();
  });
});
