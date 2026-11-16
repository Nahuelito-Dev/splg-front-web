import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';

vi.mock('./useInboxAccess', () => ({
  useInboxAccess: () => ({ customers: false, drivers: false, configure: false, claims: false, any: false }),
}));
vi.mock('./useSupportSide', () => ({ useSupportSide: () => 'company', useSupportUnread: () => 3 }));
vi.mock('../../services/queries/supportSessions', () => ({ usePlatform: () => ({ data: { name: 'OrixTech' } }) }));

import { SupportChatHost } from './SupportChatHost';

afterEach(cleanup);

const show = (url: string) =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url={url}>
      <SupportChatHost />
    </ChatProviders>,
  );

describe('SupportChatHost', () => {
  it('no dibuja nada flotante: «Ayuda» vive en la barra de arriba', () => {
    show('/orders');
    expect(screen.queryByRole('button', { name: /Ayuda/ })).not.toBeInTheDocument();
  });

  it('el título de la pestaña lleva lo sin leer', () => {
    document.title = 'SPLG';
    show('/orders');
    expect(document.title).toBe('(3) SPLG');
  });
});
