import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../../test/chatFixtures';
import { ApiError } from '../../../services/api/errors';

const api = vi.hoisted(() => ({ getChatSettings: vi.fn(), updateChatSettings: vi.fn() }));
const confirmMock = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));
const notifyMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }));

vi.mock('../../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../../utils/notifications', () => ({ notify: notifyMock, confirm: confirmMock }));

import { AutoAssignCard } from './AutoAssignCard';

const SETTINGS = { openNow: true, autoAssignEnabled: false, autoAssignMaxOpen: 5 };

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(true);
  Object.values(notifyMock).forEach((fn) => fn.mockClear());
  api.getChatSettings.mockResolvedValue(SETTINGS);
  api.updateChatSettings.mockImplementation((body: object) => Promise.resolve({ ...SETTINGS, ...body }));
});
afterEach(cleanup);

const show = (canEdit = true) =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value}>
      <AutoAssignCard canEdit={canEdit} />
    </ChatProviders>,
  );

const toggle = () => screen.findByRole('switch', { name: 'Asignar solas las conversaciones' });
const maxOpen = () => screen.getByLabelText('Tope de conversaciones abiertas por persona');
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar la asignación automática' }));

describe('Configuración: asignación automática', () => {
  it('explica cómo reparte y prenderla manda sólo lo que cambió', async () => {
    show();
    fireEvent.click(await toggle());
    expect(screen.getByText(/tiene más lugar libre/)).toBeInTheDocument();
    expect(screen.getByText(/Si alguien del equipo ya le respondió, vuelve a esa persona/)).toBeInTheDocument();
    expect(screen.getByText(/queda en «Sin asignar»/)).toBeInTheDocument();
    save();
    await waitFor(() => expect(api.updateChatSettings).toHaveBeenCalledWith({ autoAssignEnabled: true }));
    expect(confirmMock).not.toHaveBeenCalled();
    expect(notifyMock.success).toHaveBeenCalledWith('Asignación automática guardada');
  });

  it('cambiar el tope manda el número', async () => {
    show();
    await toggle();
    fireEvent.change(maxOpen(), { target: { value: '8' } });
    save();
    await waitFor(() => expect(api.updateChatSettings).toHaveBeenCalledWith({ autoAssignMaxOpen: 8 }));
  });

  it('apagarla avisa que se limpian las esperas; si no confirma, no se manda', async () => {
    api.getChatSettings.mockResolvedValue({ ...SETTINGS, autoAssignEnabled: true });
    confirmMock.mockResolvedValueOnce(false);
    show();
    fireEvent.click(await toggle());
    save();
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '¿Apagar la asignación automática?',
        text: expect.stringContaining('sin la marca «Esperando a alguien del equipo»') as string,
      }),
    );
    expect(api.updateChatSettings).not.toHaveBeenCalled();
    save();
    await waitFor(() => expect(api.updateChatSettings).toHaveBeenCalledWith({ autoAssignEnabled: false }));
  });

  it('un tope fuera de 1 a 50 no se manda', async () => {
    show();
    await toggle();
    fireEvent.change(maxOpen(), { target: { value: '0' } });
    save();
    expect(await screen.findByText('El tope de conversaciones abiertas por persona va de 1 a 50')).toBeInTheDocument();
    expect(api.updateChatSettings).not.toHaveBeenCalled();
  });

  it('el 400 del tope va junto al campo; otro, al pie', async () => {
    api.updateChatSettings.mockRejectedValueOnce(
      new ApiError(400, ['Tope de conversaciones abiertas por persona: tiene que ser un número entero']),
    );
    show();
    await toggle();
    fireEvent.change(maxOpen(), { target: { value: '7' } });
    save();
    await waitFor(() => expect(maxOpen()).toHaveAttribute('aria-invalid', 'true'));
    expect(
      screen.getByText('Tope de conversaciones abiertas por persona: tiene que ser un número entero'),
    ).toBeInTheDocument();
    api.updateChatSettings.mockRejectedValueOnce(new ApiError(403, ['No tenés permiso']));
    save();
    expect(await screen.findByText('No tenés permiso')).toHaveAttribute('role', 'alert');
  });

  it('sin `mensajes.configurar` se lee pero no se edita', async () => {
    show(false);
    expect(await toggle()).toBeDisabled();
    expect(maxOpen()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar la asignación automática' })).not.toBeInTheDocument();
  });

  it('si no se pudo leer la configuración, el error con reintentar', async () => {
    api.getChatSettings.mockRejectedValue(new Error('boom'));
    show();
    expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});
