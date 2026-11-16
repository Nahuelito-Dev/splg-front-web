import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newQueryClient } from '../../../test/chatFixtures';
import { inboxConversation } from '../../../test/inboxFixtures';
import { ApiError } from '../../../services/api/errors';
import type { InboxAssigneeOption, InboxConversation } from '../../../services/api/types';

const api = vi.hoisted(() => ({
  listConversationAssignees: vi.fn(),
  assignConversation: vi.fn(),
}));
vi.mock('../../../services/api/inbox', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...api,
}));
vi.mock('../../../utils/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { AssignModal } from './AssignModal';

const person = (userId: string, fullName: string, photoUrl?: string): InboxAssigneeOption => ({
  userId,
  fullName,
  ...(photoUrl ? { photoUrl } : {}),
});

const TEAM = [
  person('u-2', 'Beto Despacho', 'https://fotos.test/beto.jpg'),
  person('u-me', 'Lucía Gómez'),
  person('u-3', 'Zoe Ruiz'),
];

const show = (conversation: InboxConversation = inboxConversation(), onClose = vi.fn()) => {
  render(
    <QueryClientProvider client={newQueryClient()}>
      <AssignModal conversation={conversation} myUserId="u-me" onClose={onClose} />
    </QueryClientProvider>,
  );
  return { dialog: screen.getByRole('dialog', { name: 'Asignar la conversación' }), onClose };
};

const radioValues = (dialog: HTMLElement) =>
  within(dialog)
    .getAllByRole('radio')
    .map((radio) => radio.getAttribute('value'));

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.listConversationAssignees.mockResolvedValue({ items: TEAM });
});
afterEach(cleanup);

describe('AssignModal: a quién se le puede asignar', () => {
  it('pide el personal del canal de esa conversación; «Yo» primero y el resto como lo ordena la API', async () => {
    const { dialog } = show();
    await within(dialog).findByRole('radio', { name: /Beto Despacho/ });
    expect(api.listConversationAssignees).toHaveBeenCalledWith('conv-1');
    expect(radioValues(dialog)).toEqual(['', 'u-me', 'u-2', 'u-3']);
    expect(within(dialog).getByRole('radio', { name: 'Yo Lucía Gómez' })).toBeInTheDocument();
    // La foto que trae la API; sin foto, las iniciales.
    expect(dialog.querySelector('img[src="https://fotos.test/beto.jpg"]')).not.toBeNull();
    expect(within(dialog).getByText('ZR')).toBeInTheDocument();
    expect(within(dialog).getByText('LG')).toBeInTheDocument();
    // Sin asignar: arranca en la cola.
    expect(within(dialog).getByRole('radio', { name: /Nadie/ })).toBeChecked();
  });

  it('con hasta 8 personas no hay buscador; con más, filtra por nombre sin tildes', async () => {
    const many = Array.from({ length: 9 }, (_, n) => person(`u-${n + 10}`, `Persona ${n + 1}`));
    api.listConversationAssignees.mockResolvedValue({ items: [...many, person('u-x', 'Íñigo Pérez')] });
    const { dialog } = show();
    const search = await within(dialog).findByRole('searchbox', { name: 'Buscar a alguien del personal' });
    fireEvent.change(search, { target: { value: 'inigo' } });
    expect(within(dialog).getByRole('radio', { name: /Íñigo Pérez/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio', { name: /Persona 1/ })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'nadie así' } });
    expect(within(dialog).getByText('Sin resultados')).toBeInTheDocument();
    // La cola siempre se puede elegir.
    expect(within(dialog).getByRole('radio', { name: /Nadie/ })).toBeInTheDocument();
  });

  it('sin buscador con 8 o menos', async () => {
    const { dialog } = show();
    await within(dialog).findByRole('radio', { name: /Beto Despacho/ });
    expect(within(dialog).queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('mientras carga, un esqueleto; sin nadie que atienda el canal, el vacío', async () => {
    let resolve: (value: { items: InboxAssigneeOption[] }) => void = () => undefined;
    api.listConversationAssignees.mockReturnValue(new Promise((done) => (resolve = done)));
    const { dialog } = show();
    expect(within(dialog).getByRole('status', { name: 'Cargando el personal' })).toBeInTheDocument();
    resolve({ items: [] });
    expect(await within(dialog).findByText('Nadie del personal atiende este canal')).toBeInTheDocument();
  });

  it('si no se pudo leer, el error con «Reintentar»; un 404 dice que la conversación no existe', async () => {
    api.listConversationAssignees.mockRejectedValueOnce(new ApiError(500, ['Se cayó la base']));
    const { dialog } = show();
    expect(await within(dialog).findByText('No se pudo cargar')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' }));
    expect(await within(dialog).findByRole('radio', { name: /Beto Despacho/ })).toBeInTheDocument();
    expect(api.listConversationAssignees).toHaveBeenCalledTimes(2);
    cleanup();

    api.listConversationAssignees.mockRejectedValueOnce(new ApiError(404, ['No existe']));
    const again = show();
    expect(await within(again.dialog).findByText('La conversación no existe')).toBeInTheDocument();
  });
});

describe('AssignModal: guardar', () => {
  it('asigna a la persona elegida y cierra', async () => {
    api.assignConversation.mockResolvedValue(
      inboxConversation({ assignedTo: { userId: 'u-2', fullName: 'Beto Despacho' } }),
    );
    const { dialog, onClose } = show();
    fireEvent.click(await within(dialog).findByRole('radio', { name: /Beto Despacho/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.assignConversation).toHaveBeenCalledWith('conv-1', 'u-2'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('400 ASSIGNEE_WITHOUT_PERMISSION: muestra el motivo, relee la lista y vuelve a lo que estaba', async () => {
    api.assignConversation.mockRejectedValue(
      new ApiError(400, ['Esa persona no atiende este canal'], 'ASSIGNEE_WITHOUT_PERMISSION'),
    );
    const { dialog, onClose } = show(inboxConversation({ assignedTo: { userId: 'u-me', fullName: 'Lucía Gómez' } }));
    fireEvent.click(await within(dialog).findByRole('radio', { name: /Zoe Ruiz/ }));
    api.listConversationAssignees.mockResolvedValue({ items: TEAM.filter((p) => p.userId !== 'u-3') });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Esa persona no atiende este canal. Actualizamos la lista: elegí de nuevo.',
    );
    await waitFor(() => expect(within(dialog).queryByRole('radio', { name: /Zoe Ruiz/ })).not.toBeInTheDocument());
    expect(api.listConversationAssignees).toHaveBeenCalledTimes(2);
    expect(within(dialog).getByRole('radio', { name: /Yo/ })).toBeChecked();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('si quien la atiende ya no está en la lista, se ve deshabilitada y «Guardar» espera otra elección', async () => {
    const { dialog } = show(inboxConversation({ assignedTo: { userId: 'u-9', fullName: 'Carla Vieja' } }));
    const orphan = await within(dialog).findByRole('radio', { name: /Asignada a Carla Vieja/ });
    expect(orphan).toBeDisabled();
    expect(orphan).toBeChecked();
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Beto Despacho/ }));
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('tras un 400, no vuelve a una persona que ya no está en la lista: nadie elegido', async () => {
    api.assignConversation.mockRejectedValue(
      new ApiError(400, ['Esa persona no atiende este canal'], 'ASSIGNEE_WITHOUT_PERMISSION'),
    );
    const { dialog } = show(inboxConversation({ assignedTo: { userId: 'u-3', fullName: 'Zoe Ruiz' } }));
    fireEvent.click(await within(dialog).findByRole('radio', { name: /Beto Despacho/ }));
    api.listConversationAssignees.mockResolvedValue({ items: TEAM.filter((p) => p.userId !== 'u-3') });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByRole('radio', { name: /Asignada a Zoe Ruiz/ })).not.toBeChecked();
    await waitFor(() =>
      expect(
        within(dialog)
          .getAllByRole('radio')
          .filter((radio) => (radio as HTMLInputElement).checked),
      ).toHaveLength(0),
    );
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('404 al guardar (la persona o la conversación ya no está): el motivo de la API y relee la lista', async () => {
    api.assignConversation.mockRejectedValue(new ApiError(404, ['No existe esa persona del personal.']));
    const { dialog } = show();
    fireEvent.click(await within(dialog).findByRole('radio', { name: /Beto Despacho/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /^No existe esa persona del personal\. Actualizamos la lista: elegí de nuevo\.$/,
    );
    await waitFor(() => expect(api.listConversationAssignees).toHaveBeenCalledTimes(2));
    expect(within(dialog).getByRole('radio', { name: /Nadie/ })).toBeChecked();
  });
});
