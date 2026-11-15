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
        outOfHoursEnabled: true,
        outOfHoursMessage: null,
        ackEnabled: false,
        ackMessage: null,
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
