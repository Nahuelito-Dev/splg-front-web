import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';
import type { InboxAccess } from '../../features/chat/useInboxAccess';
import { ApiError } from '../../services/api/errors';

const access = vi.hoisted(() => ({
  value: { customers: true, drivers: true, configure: true, claims: true, any: true } as InboxAccess,
}));
const api = vi.hoisted(() => ({
  getBusinessHours: vi.fn(),
  getChatSettings: vi.fn(),
  updateChatSettings: vi.fn(),
  listCompanyTemplates: vi.fn(),
  getCsatSummary: vi.fn(),
  listConversations: vi.fn(),
}));
const labelsApi = vi.hoisted(() => ({
  listChatLabels: vi.fn(),
  createChatLabel: vi.fn(),
  updateChatLabel: vi.fn(),
  deleteChatLabel: vi.fn(),
  setConversationLabels: vi.fn(),
}));
const confirmMock = vi.hoisted(() => vi.fn((_options: { title: string; text: string }) => Promise.resolve(true)));

vi.mock('../../features/chat/useInboxAccess', () => ({ useInboxAccess: () => access.value }));
vi.mock('../../common/components/useCompanyDisplayName', () => ({ useCompanyDisplayName: () => 'Gas Norte' }));
vi.mock('../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../services/api/chatLabels', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...labelsApi,
}));
vi.mock('../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  confirm: confirmMock,
}));

import { MessagesSettings } from './MessagesSettings';

const SETTINGS = {
  customerChatEnabled: true,
  assistantAiEnabled: false,
  assistantAiAvailable: false,
  assistantName: null,
  effectiveAssistantName: 'Asistente de Gas Norte',
  handoffMessage: null,
  effectiveHandoffMessage: 'Te paso',
  outOfHoursEnabled: true,
  outOfHoursMessage: null,
  effectiveOutOfHoursMessage: 'Fuera',
  ackEnabled: false,
  ackMessage: null,
  effectiveAckMessage: 'Recibimos',
  csatEnabled: false,
  csatMessage: null,
  effectiveCsatMessage: '¿Cómo te atendimos?',
  customerActions: [],
  firstResponseTargetMinutes: 30,
  expectedReplyEnabled: true,
  inactivityCloseMinutes: null as number | null,
  inactivityWarningMinutes: null as number | null,
  inactivityEnabledAt: null as string | null,
  openNow: true,
  nextOpenAt: null,
};
const HOURS = { timezone: 'America/Argentina/Buenos_Aires', days: [], holidays: [], openNow: true, nextOpenAt: null };
const label = (id: string, name: string, color = 'orange') => ({
  id,
  name,
  color,
  createdAt: '2026-11-16T10:00:00.000Z',
  updatedAt: '2026-11-16T10:00:00.000Z',
});
const ENVIO = label('l-1', 'Reclamo de envío', 'red');
const FACTURA = label('l-2', 'Factura', 'blue');

beforeEach(() => {
  access.value = { customers: true, drivers: true, configure: true, claims: true, any: true };
  [...Object.values(api), ...Object.values(labelsApi)].forEach((fn) => fn.mockReset());
  confirmMock.mockClear();
  api.getBusinessHours.mockResolvedValue(HOURS);
  api.getChatSettings.mockResolvedValue(SETTINGS);
  api.listCompanyTemplates.mockResolvedValue({ items: [] });
  api.getCsatSummary.mockResolvedValue(null);
  labelsApi.listChatLabels.mockResolvedValue({ items: [FACTURA, ENVIO] });
});
afterEach(cleanup);

const show = () =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value}>
      <MessagesSettings />
    </ChatProviders>,
  );

const labelsCard = () => {
  const card = screen.getByRole('heading', { name: 'Etiquetas' }).closest('.rounded-card, section, div[class*="p-5"]');
  if (!(card instanceof HTMLElement)) throw new Error('Sin la tarjeta de etiquetas');
  return card;
};
const timesCard = () => {
  const card = screen.getByRole('heading', { name: 'Tiempos de la conversación' }).closest('div[class*="p-5"]');
  if (!(card instanceof HTMLElement)) throw new Error('Sin la tarjeta de tiempos');
  return card;
};

describe('Configuración: etiquetas (7c)', () => {
  it('lista las vigentes con su color y cuántas hay del tope', async () => {
    show();
    const list = await screen.findByRole('list', { name: 'Etiquetas' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('FacturaAzul'),
      expect.stringContaining('Reclamo de envíoRojo'),
    ]);
    expect(within(labelsCard()).getByText('2 de 50 etiquetas.')).toBeInTheDocument();
  });

  it('sin etiquetas, el vacío propone crear la primera; un error se dice con reintento', async () => {
    labelsApi.listChatLabels.mockResolvedValueOnce({ items: [] });
    show();
    expect(await screen.findByText('Sin etiquetas')).toBeInTheDocument();
    expect(within(labelsCard()).getByRole('button', { name: 'Crear la primera' })).toBeInTheDocument();
    cleanup();
    labelsApi.listChatLabels.mockRejectedValue(new ApiError(500, ['Falla']));
    show();
    expect(await within(await waitFor(labelsCard)).findByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });

  it('alta: nombre recortado y color elegido; un nombre vacío no se manda', async () => {
    labelsApi.createChatLabel.mockResolvedValue(label('l-3', 'VIP', 'teal'));
    show();
    await screen.findByRole('list', { name: 'Etiquetas' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva etiqueta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nueva etiqueta' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText(/entre 1 y 30 caracteres/)).toBeInTheDocument();
    expect(labelsApi.createChatLabel).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Nombre/), { target: { value: '  VIP   mayorista ' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Verde intenso' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(labelsApi.createChatLabel).toHaveBeenCalledWith({ name: 'VIP mayorista', color: 'teal' }),
    );
  });

  it('409 por nombre repetido va junto al nombre; el tope de 50 va al pie, y el formulario queda abierto', async () => {
    labelsApi.createChatLabel.mockRejectedValueOnce(
      new ApiError(409, ['Ya hay una etiqueta con ese nombre'], 'CHAT_LABEL_NAME_TAKEN'),
    );
    show();
    await screen.findByRole('list', { name: 'Etiquetas' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva etiqueta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nueva etiqueta' });
    const name = within(dialog).getByLabelText(/Nombre/);
    fireEvent.change(name, { target: { value: 'factura' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('Ya hay una etiqueta con ese nombre')).toHaveAttribute(
      'id',
      `${name.id}-error`,
    );
    expect(name).toHaveAttribute('aria-invalid', 'true');

    labelsApi.createChatLabel.mockRejectedValueOnce(
      new ApiError(409, ['Ya hay 50 etiquetas: dá de baja alguna'], 'CHAT_LABEL_LIMIT_REACHED'),
    );
    fireEvent.change(name, { target: { value: 'Otra' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    const footer = await within(dialog).findByText('Ya hay 50 etiquetas: dá de baja alguna');
    expect(footer).toHaveAttribute('role', 'alert');
    expect(footer.id).toBe('');
    expect(screen.getByRole('dialog', { name: 'Nueva etiqueta' })).toBeInTheDocument();
  });

  it('con 50, «Nueva» queda deshabilitada y se explica', async () => {
    labelsApi.listChatLabels.mockResolvedValue({
      items: Array.from({ length: 50 }, (_, i) => label(`l-${i}`, `Etiqueta ${i}`)),
    });
    show();
    await screen.findByText(/50 de 50 etiquetas/);
    expect(screen.getByRole('button', { name: 'Nueva etiqueta' })).toBeDisabled();
    expect(screen.getByText(/Llegaste al tope/)).toBeInTheDocument();
  });

  it('editar manda sólo lo que cambió', async () => {
    labelsApi.updateChatLabel.mockResolvedValue({ ...FACTURA, color: 'green' });
    show();
    await screen.findByRole('list', { name: 'Etiquetas' });
    fireEvent.click(screen.getByRole('button', { name: 'Editar etiqueta «Factura»' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar etiqueta' });
    expect(within(dialog).getByLabelText(/Nombre/)).toHaveValue('Factura');
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Verde' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(labelsApi.updateChatLabel).toHaveBeenCalledWith('l-2', { color: 'green' }));
  });

  it('la baja confirma diciendo en cuántas conversaciones está (sale de todas)', async () => {
    api.listConversations.mockResolvedValue({ items: [], total: 3, counts: { unassigned: 0, mine: 0, open: 0 } });
    labelsApi.deleteChatLabel.mockResolvedValue(undefined);
    show();
    await screen.findByRole('list', { name: 'Etiquetas' });
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de etiqueta «Reclamo de envío»' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(api.listConversations).toHaveBeenCalledWith({ labelId: 'l-1', limit: 1, offset: 0 });
    expect(confirmMock.mock.calls[0][0].title).toBe('¿Dar de baja «Reclamo de envío»?');
    expect(confirmMock.mock.calls[0][0].text).toContain('Está en 3 conversaciones y sale de todas.');
    await waitFor(() => expect(labelsApi.deleteChatLabel).toHaveBeenCalledWith('l-1'));
  });

  it('si atiende un solo canal, el número es un piso («al menos»), no exacto', async () => {
    access.value = { customers: true, drivers: false, configure: true, claims: false, any: true };
    api.listConversations.mockResolvedValue({ items: [], total: 3, counts: { unassigned: 0, mine: 0, open: 0 } });
    confirmMock.mockResolvedValueOnce(false);
    show();
    await screen.findByRole('list', { name: 'Etiquetas' });
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de etiqueta «Factura»' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(confirmMock.mock.calls[0][0].text).toContain(
      'Está en al menos 3 conversaciones (contando sólo los canales que atendés) y sale de todas.',
    );
  });

  it('si no atiende ningún canal, no cuenta: avisa que sale de todas', async () => {
    access.value = { customers: false, drivers: false, configure: true, claims: false, any: false };
    confirmMock.mockResolvedValueOnce(false);
    show();
    await screen.findByRole('list', { name: 'Etiquetas' });
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de etiqueta «Factura»' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(api.listConversations).not.toHaveBeenCalled();
    expect(confirmMock.mock.calls[0][0].text).toContain('Sale de todas las conversaciones que la tengan.');
  });

  it('si no se puede contar, la baja igual avisa que sale de todas; cancelar no da de baja', async () => {
    api.listConversations.mockRejectedValue(new ApiError(403, ['Sin permiso']));
    confirmMock.mockResolvedValueOnce(false);
    show();
    await screen.findByRole('list', { name: 'Etiquetas' });
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de etiqueta «Factura»' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(confirmMock.mock.calls[0][0].text).toContain('Sale de todas las conversaciones que la tengan.');
    expect(labelsApi.deleteChatLabel).not.toHaveBeenCalled();
  });

  it('sin `mensajes.configurar` se ven pero no se tocan', async () => {
    access.value = { customers: true, drivers: false, configure: false, claims: false, any: true };
    show();
    await screen.findByRole('list', { name: 'Etiquetas' });
    expect(screen.queryByRole('button', { name: 'Nueva etiqueta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /etiqueta «Factura»/ })).not.toBeInTheDocument();
  });

  it('sin ningún permiso de mensajes (o en modo soporte) no hay configuración', () => {
    access.value = { customers: false, drivers: false, configure: false, claims: false, any: false };
    show();
    expect(screen.getByText('No tenés permiso para configurar los mensajes')).toBeInTheDocument();
    expect(labelsApi.listChatLabels).not.toHaveBeenCalled();
  });
});

describe('Configuración: tiempo esperado y cierre por inactividad (7c)', () => {
  it('muestra la vista previa con el objetivo; apagarlo lo dice', async () => {
    show();
    const card = await waitFor(timesCard);
    expect(await within(card).findByText('«Solemos responder en ~30 min»')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('switch', { name: 'Mostrar el tiempo de respuesta esperado' }));
    expect(within(card).getByText('No ven ningún tiempo de respuesta.')).toBeInTheDocument();
  });

  it('el aviso tiene que ser menor que el cierre (como el back) y no se manda', async () => {
    show();
    const card = await waitFor(timesCard);
    fireEvent.click(await within(card).findByRole('switch', { name: 'Cerrar las conversaciones sin respuesta' }));
    fireEvent.change(within(card).getByLabelText('Se cierra a los (minutos)'), { target: { value: '60' } });
    fireEvent.click(within(card).getByRole('switch', { name: 'Avisar antes de cerrar' }));
    fireEvent.change(within(card).getByLabelText('Avisa estos minutos antes'), { target: { value: '60' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Guardar los tiempos' }));
    expect(await within(card).findByText(/El aviso tiene que salir antes del cierre/)).toBeInTheDocument();
    fireEvent.change(within(card).getByLabelText('Se cierra a los (minutos)'), { target: { value: '20' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Guardar los tiempos' }));
    expect(await within(card).findByText(/El cierre por inactividad va de 30 minutos a 7 días/)).toBeInTheDocument();
    expect(api.updateChatSettings).not.toHaveBeenCalled();
  });

  it('guarda el cierre y el aviso; apagar el aviso manda `null`', async () => {
    api.updateChatSettings.mockImplementation((body: object) => Promise.resolve({ ...SETTINGS, ...body }));
    show();
    const card = await waitFor(timesCard);
    fireEvent.click(await within(card).findByRole('switch', { name: 'Cerrar las conversaciones sin respuesta' }));
    fireEvent.change(within(card).getByLabelText('Se cierra a los (minutos)'), { target: { value: '120' } });
    expect(within(card).getByText('De 30 a 10080 minutos · ahora: 2 h')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('switch', { name: 'Avisar antes de cerrar' }));
    fireEvent.change(within(card).getByLabelText('Avisa estos minutos antes'), { target: { value: '15' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Guardar los tiempos' }));
    await waitFor(() =>
      expect(api.updateChatSettings).toHaveBeenCalledWith({
        expectedReplyEnabled: true,
        inactivityCloseMinutes: 120,
        inactivityWarningMinutes: 15,
      }),
    );
  });

  it('con el cierre prendido muestra desde cuándo rige; apagarlo manda los dos en `null`', async () => {
    api.getChatSettings.mockResolvedValue({
      ...SETTINGS,
      inactivityCloseMinutes: 1440,
      inactivityWarningMinutes: 60,
      inactivityEnabledAt: '2026-11-16T12:30:00.000Z',
    });
    api.updateChatSettings.mockResolvedValue(SETTINGS);
    show();
    const card = await waitFor(timesCard);
    expect(await within(card).findByText(/Rige desde el 16 nov 2026, 9:30/)).toBeInTheDocument();
    expect(within(card).getByLabelText('Se cierra a los (minutos)')).toHaveValue(1440);
    expect(within(card).getByLabelText('Avisa estos minutos antes')).toHaveValue(60);
    fireEvent.click(within(card).getByRole('switch', { name: 'Cerrar las conversaciones sin respuesta' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Guardar los tiempos' }));
    await waitFor(() =>
      expect(api.updateChatSettings).toHaveBeenCalledWith({
        expectedReplyEnabled: true,
        inactivityCloseMinutes: null,
        inactivityWarningMinutes: null,
      }),
    );
  });

  it('apagar sólo el aviso deja el cierre y manda el aviso en `null`', async () => {
    api.getChatSettings.mockResolvedValue({
      ...SETTINGS,
      inactivityCloseMinutes: 1440,
      inactivityWarningMinutes: 60,
      inactivityEnabledAt: '2026-11-16T12:30:00.000Z',
    });
    api.updateChatSettings.mockResolvedValue(SETTINGS);
    show();
    const card = await waitFor(timesCard);
    fireEvent.click(await within(card).findByRole('switch', { name: 'Avisar antes de cerrar' }));
    expect(within(card).queryByLabelText('Avisa estos minutos antes')).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Guardar los tiempos' }));
    await waitFor(() =>
      expect(api.updateChatSettings).toHaveBeenCalledWith({
        expectedReplyEnabled: true,
        inactivityCloseMinutes: 1440,
        inactivityWarningMinutes: null,
      }),
    );
  });

  it('un 400 de la API va junto a su campo; otro error, al pie', async () => {
    api.updateChatSettings.mockRejectedValueOnce(
      new ApiError(400, ['El aviso va de 5 minutos a 24 horas antes del cierre']),
    );
    show();
    const card = await waitFor(timesCard);
    fireEvent.click(await within(card).findByRole('switch', { name: 'Cerrar las conversaciones sin respuesta' }));
    fireEvent.click(within(card).getByRole('switch', { name: 'Avisar antes de cerrar' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Guardar los tiempos' }));
    const warning = within(card).getByLabelText('Avisa estos minutos antes');
    expect(await within(card).findByText('El aviso va de 5 minutos a 24 horas antes del cierre')).toHaveAttribute(
      'id',
      `${warning.id}-error`,
    );
    api.updateChatSettings.mockRejectedValueOnce(new ApiError(403, ['No tenés permiso']));
    fireEvent.click(within(card).getByRole('button', { name: 'Guardar los tiempos' }));
    expect(await within(card).findByText('No tenés permiso')).toHaveAttribute('role', 'alert');
  });

  it('sin `mensajes.configurar` se lee, sin guardar', async () => {
    access.value = { customers: true, drivers: false, configure: false, claims: false, any: true };
    show();
    const card = await waitFor(timesCard);
    expect(await within(card).findByRole('switch', { name: 'Mostrar el tiempo de respuesta esperado' })).toBeDisabled();
    expect(within(card).queryByRole('button', { name: 'Guardar los tiempos' })).not.toBeInTheDocument();
  });
});
