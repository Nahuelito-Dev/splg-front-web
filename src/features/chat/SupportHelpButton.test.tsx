import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatProviders } from '../../test/ChatProviders';
import { fakeSocket, newQueryClient } from '../../test/chatFixtures';

const state = vi.hoisted(() => ({ side: 'company' as 'company' | 'platform' | null, unread: 3 }));
vi.mock('./useSupportSide', () => ({ useSupportSide: () => state.side, useSupportUnread: () => state.unread }));
vi.mock('../../services/queries/supportSessions', () => ({ usePlatform: () => ({ data: { name: 'OrixTech' } }) }));
vi.mock('../../pages/Support/CompanyChatPanel', () => ({ CompanyChatPanel: () => <p>el chat</p> }));

import { SupportHelpButton } from './SupportHelpButton';

afterEach(() => {
  cleanup();
  state.side = 'company';
  state.unread = 3;
});

const show = (url: string) =>
  render(
    <ChatProviders client={newQueryClient()} socket={fakeSocket().value} url={url}>
      <SupportHelpButton />
    </ChatProviders>,
  );

describe('SupportHelpButton: «Ayuda» en la barra de arriba', () => {
  it('es un ícono de la barra (no flotante), muestra lo sin leer y abre el chat en un panel que se cierra con Esc', async () => {
    show('/orders');
    const button = screen.getByRole('button', { name: 'Ayuda: 3 sin leer' });
    expect(button).not.toHaveClass('fixed');
    expect(button).toHaveClass('h-9', 'w-9');
    expect(button).toHaveTextContent('3');
    fireEvent.click(button);
    expect(await screen.findByRole('dialog', { name: 'Chat con OrixTech' })).toBeInTheDocument();
    expect(await screen.findByText('el chat')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(await screen.findByRole('button', { name: 'Ayuda: 3 sin leer' })).toBeInTheDocument();
  });

  it('sin nada sin leer, el nombre dice con quién es el chat', () => {
    state.unread = 0;
    show('/orders');
    expect(screen.getByRole('button', { name: 'Ayuda: chat con OrixTech' })).toBeInTheDocument();
  });

  it('en la pantalla «Ayuda» no se muestra: ya se está en el chat', () => {
    show('/support');
    expect(screen.queryByRole('button', { name: /Ayuda/ })).not.toBeInTheDocument();
  });

  it('el administrador general no lo ve: es del lado de la empresa', () => {
    state.side = 'platform';
    show('/orders');
    expect(screen.queryByRole('button', { name: /Ayuda/ })).not.toBeInTheDocument();
  });
});
