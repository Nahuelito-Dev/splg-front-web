import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';

vi.mock('./useSupportSide', () => ({ useSupportSide: () => 'company', useSupportUnread: () => 3 }));
vi.mock('../../services/queries/supportSessions', () => ({ usePlatform: () => ({ data: { name: 'OrixTech' } }) }));
vi.mock('../../pages/Support/CompanyChatPanel', () => ({ CompanyChatPanel: () => <p>el chat</p> }));

import { SupportChatHost } from './SupportChatHost';

afterEach(cleanup);

const show = (url: string) =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url={url}>
      <SupportChatHost />
    </ChatProviders>,
  );

describe('SupportChatHost: la burbuja «Ayuda»', () => {
  it('muestra lo sin leer y abre el chat en un panel que se cierra con Esc', async () => {
    show('/orders');
    const bubble = screen.getByRole('button', { name: 'Ayuda: 3 sin leer' });
    fireEvent.click(bubble);
    expect(await screen.findByRole('dialog', { name: 'Chat con OrixTech' })).toBeInTheDocument();
    expect(await screen.findByText('el chat')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(await screen.findByRole('button', { name: 'Ayuda: 3 sin leer' })).toBeInTheDocument();
  });

  it('el título de la pestaña lleva lo sin leer', () => {
    document.title = 'SPLG';
    show('/orders');
    expect(document.title).toBe('(3) SPLG');
  });

  it('en la pantalla «Ayuda» no se muestra: ya se está en el chat', () => {
    show('/support');
    expect(screen.queryByRole('button', { name: /Ayuda/ })).not.toBeInTheDocument();
  });
});
